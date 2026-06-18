// Tileset Mode: тумблер (рядом с grid) — палитра тайлов + сетка. Работает на
// любом слое (Tile Layer не нужен): ПКМ по клетке с пикселями открывает
// контекст-меню (Add tile/Flip X/Flip Y/Select/Fill/Clear), где Add tile берёт
// слитое содержимое клетки со всех видимых слоёв; по пустой — тост «клетка пустая».
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, toast, t } from '../../core/dom.js';
import { setTool } from '../../core/tools.js';
import { gridAt } from '../../core/viewport.js';
import { registerGlobal } from '../../core/canvas-handlers.js';
import { isTilemap, getCell } from '../../core/tilemap.js';
import { cellFlags } from '../../logic/tile-transform.js';
import { ctxTileSize, cellEmptyAt, addToSet, cellFlipH, cellFlipV, cellClear, cellFill, cellSelect } from './cell-ops.js';

const syncBtn = () => { const b = $('tilemap-btn'); if (b) b.classList.toggle('on', !!(S.tileset && S.tileset.on)); };

// в Tileset Mode обычная кисть и стабилизация выключаются (работаем с клетками),
// при выходе — восстанавливаются как были
function suspendBrush() { if (S.tilesetPrev) return; S.tilesetPrev = { stab: S.stabOn }; S.stabOn = false; bus.emit('brush-flags'); }
function restoreBrush() { if (!S.tilesetPrev) return; S.stabOn = S.tilesetPrev.stab; S.tilesetPrev = null; bus.emit('brush-flags'); }

export function setMode(on) {
  if (!on && isTilemap(S.layers[S.cur])) return; // на Tile-слое режим обязателен — выключить нельзя
  S.tileset.on = on; syncBtn(); // Tileset Grid — собственный оверлей (виден когда режим включён), обычную сетку Grid не трогаем
  if (on) { suspendBrush(); actions.run('tile.palette.open'); if (isTilemap(S.layers[S.cur])) actions.run('tilemap.syncGrid'); }
  else { restoreBrush(); actions.run('tile.palette.close'); S.tileSel = null; if (S.tool === 'tilebrush' || S.tool === 'tileselect') setTool('pencil'); }
  bus.emit('render');
}
export const toggle = () => setMode(!(S.tileset && S.tileset.on));

// клетка под точкой — только по Tileset Grid и границам холста, без привязки к
// типу слоя (Tile Layer не нужен; ПКМ-меню работает на любом слое)
function cellFromGrid(gx, gy) { if (!S.layers[S.cur]) return null; const { w, h } = ctxTileSize();
  if (gx < 0 || gy < 0 || gx >= S.W || gy >= S.H) return null;
  return { cx: Math.floor(gx / w), cy: Math.floor(gy / h) }; }

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
  // на Tile-слое Add tile не нужен (тайл уже в палитре или попадёт туда автоматически)
  if (!isTilemap(S.layers[S.cur])) menu.append(item(t('tile.addToSet'), addToSet));
  menu.append(item(t('tile.flipH'), cellFlipH), item(t('tile.flipV'), cellFlipV),
    item(t('tile.select'), cellSelect), item(t('tile.fill'), cellFill), item(t('tile.clearCell'), cellClear));
  showMenuAt(menu, px, py);
}

// ПКМ по клетке (любой слой): есть пиксели → выбрать + меню; пусто → тост «клетка пустая»
function interactCell(cx, cy, px, py) { if (cellEmptyAt(cx, cy)) { toast(t('toast.cellEmpty')); return; }
  selectCell(cx, cy); openCellMenu(px, py); }

// режим клеток активен, кроме штампа тайлов (draw on) — там ЛКМ ставит тайл
const cellActive = () => !!(S.tileset && S.tileset.on) && !(S.tool === 'tilebrush' && S.tileMode === 'paint');

// смена активного слоя на Tile-слой (клик/конверт) сама включает Tileset Mode
let lastCur = -1, lastKind = '';
function autoTileMode() {
  const kind = isTilemap(S.layers[S.cur]) ? 'tm' : 'px';
  if ((S.cur !== lastCur || kind !== lastKind) && kind === 'tm' && !(S.tileset && S.tileset.on)) setMode(true);
  lastCur = S.cur; lastKind = kind;
}

let pend = null;
const cellHandler = {
  down({ gx, gy, e }) { if (!cellActive()) return false;
    // Tile-слой: ЛКМ рисует (штамп/M/A), меню — только на ПКМ; обработчик не вмешивается
    if (isTilemap(S.layers[S.cur])) return false;
    const c = cellFromGrid(gx, gy); if (!c) return false;
    if (cellEmptyAt(c.cx, c.cy)) return true; // обычный слой, пусто: кисть выключена, клик «съедается»
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
  bus.on('layer-active', autoTileMode); // переход на Tile-слой (в т.ч. выбор строки) → Tileset Mode включается сам
}
export { addToSet, cellFlipH, cellFlipV };
