// Tileset Mode: тумблер (рядом с grid) — палитра тайлов + сетка. Ключевая
// механика: ЛКМ по клетке выбирает её; непустая → контекст-меню (Add tile/Flip
// X/Flip Y/Select/Fill/Clear), пустая → сообщение. Рисование обычной кистью по
// пустой клетке выключает режим и рисует на обычном слое. Операции — cell-ops.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, toast, t } from '../../core/dom.js';
import { setTool } from '../../core/tools.js';
import { gridAt } from '../../core/viewport.js';
import { registerGlobal } from '../../core/canvas-handlers.js';
import { isTilemap, inMap, getCell } from '../../core/tilemap.js';
import { cellFlags } from '../../logic/tile-transform.js';
import { ctxTileSize, cellEmptyAt, addToSet, cellFlipH, cellFlipV, cellClear, cellFill, cellSelect } from './cell-ops.js';

const syncBtn = () => { const b = $('tilemap-btn'); if (b) b.classList.toggle('on', !!(S.tileset && S.tileset.on)); };

// в Tileset Mode обычная кисть и стабилизация выключаются (работаем с клетками),
// при выходе — восстанавливаются как были
function suspendBrush() { if (S.tilesetPrev) return; S.tilesetPrev = { stab: S.stabOn }; S.stabOn = false; bus.emit('brush-flags'); }
function restoreBrush() { if (!S.tilesetPrev) return; S.stabOn = S.tilesetPrev.stab; S.tilesetPrev = null; bus.emit('brush-flags'); }

export function setMode(on) {
  S.tileset.on = on; syncBtn(); // Tileset Grid — собственный оверлей (виден когда режим включён), обычную сетку Grid не трогаем
  if (on) { suspendBrush(); actions.run('tile.palette.open'); if (isTilemap(S.layers[S.cur])) actions.run('tilemap.syncGrid'); }
  else { restoreBrush(); actions.run('tile.palette.close'); S.tileSel = null; if (S.tool === 'tilebrush' || S.tool === 'tileselect') setTool('pencil'); }
  bus.emit('render');
}
export const toggle = () => setMode(!(S.tileset && S.tileset.on));

function cellFromGrid(gx, gy) { const L = S.layers[S.cur]; if (!L) return null; const { w, h } = ctxTileSize();
  const cx = Math.floor(gx / w), cy = Math.floor(gy / h);
  if (isTilemap(L)) return inMap(L.tilemap, cx, cy) ? { cx, cy } : null;
  return (gx >= 0 && gy >= 0 && gx < S.W && gy < S.H) ? { cx, cy } : null; }

// выбрать клетку (+ снять тайл активным, если Tile-слой)
function selectCell(cx, cy) { S.tileSel = { li: S.cur, x0: cx, y0: cy, x1: cx, y1: cy };
  const L = S.layers[S.cur]; if (isTilemap(L)) { const cell = getCell(L.tilemap, cx, cy);
    if (cell && cell.tileId != null) { S.activeTile = { tilesetId: L.tilemap.tilesetId, tileId: cell.tileId }; S.tileFlags = cellFlags(cell); bus.emit('tileset-changed'); } }
  bus.emit('render'); }

let menu = null;
const item = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { menu.classList.remove('on'); fn(); }; return b; };
function openCellMenu(px, py) {
  if (!menu) { menu = document.createElement('div'); menu.id = 'tile-cctx'; menu.className = 'menu'; document.body.appendChild(menu); }
  menu.innerHTML = '';
  menu.append(item(t('tile.addToSet'), addToSet), item(t('tile.flipH'), cellFlipH), item(t('tile.flipV'), cellFlipV),
    item(t('tile.select'), cellSelect), item(t('tile.fill'), cellFill), item(t('tile.clearCell'), cellClear));
  showMenuAt(menu, px, py);
}

// клик по клетке: непустая → выбрать + меню; пустая → сообщение
function interactCell(cx, cy, px, py) { if (cellEmptyAt(cx, cy)) { toast(t('toast.cellEmpty')); return; }
  selectCell(cx, cy); openCellMenu(px, py); }

// режим клеток активен, кроме штампа тайлов (draw on) — там ЛКМ ставит тайл
const cellActive = () => !!(S.tileset && S.tileset.on) && !(S.tool === 'tilebrush' && S.tileMode === 'paint');

let pend = null;
const cellHandler = {
  down({ gx, gy, e }) { if (!cellActive()) return false; const c = cellFromGrid(gx, gy); if (!c) return false;
    // пустая клетка: на обычном слое кисть выключена — клик «съедается» (меню/сообщение на ПКМ);
    // на Tile-слое отдаём пиксельную правку (Manual/Auto) обработчику tilemap-paint
    if (cellEmptyAt(c.cx, c.cy)) return !isTilemap(S.layers[S.cur]);
    pend = { cx: c.cx, cy: c.cy, x: e.clientX, y: e.clientY }; return true; },
  up() { if (!pend) return; const p = pend; pend = null; selectCell(p.cx, p.cy); openCellMenu(p.x, p.y); },
};
registerGlobal(cellHandler);

function onCanvasMenu(e) { if (!S.tileset || !S.tileset.on) return false;
  const [gx, gy] = gridAt(e.clientX, e.clientY); const c = cellFromGrid(gx, gy); if (!c) return false;
  interactCell(c.cx, c.cy, e.clientX, e.clientY); return true; }

export function mount() {
  syncBtn();
  const b = $('tilemap-btn'); if (b) b.onclick = toggle;
  actions.register('tileset.mode', toggle);
  actions.register('tile.cell.flipH', cellFlipH); actions.register('tile.cell.flipV', cellFlipV); actions.register('tile.cell.clear', cellClear);
  actions.register('tile.addToSet', addToSet);
  bus.on('canvas-menu', onCanvasMenu);
}
export { addToSet, cellFlipH, cellFlipV };
