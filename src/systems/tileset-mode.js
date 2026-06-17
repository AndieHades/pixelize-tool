// Tileset Mode: тумблер в сайдбаре (рядом с grid). Включён → открыта панель
// тайлов, выбрана кисть тайлов, сетка совмещена с тайлами. ПКМ по клетке холста
// в этом режиме даёт контекст-меню клетки (выбрать/перенести/правка/уникальность).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, showMenuAt, t } from '../core/dom.js';
import { setTool } from '../core/tools.js';
import { snapshot } from '../core/history.js';
import { gridAt } from '../core/viewport.js';
import { getTileset } from '../core/tileset.js';
import { isTilemap, inMap, getCell, rasterLayer } from '../core/tilemap.js';

const syncBtn = () => { const b = $('tilemap-btn'); if (b) b.classList.toggle('on', !!(S.tileset && S.tileset.on)); };

export function setMode(on) {
  S.tileset.on = on; syncBtn();
  if (on) { S.grid.visible = true; // Tileset mode включает видимую сетку (правится кнопкой Grid) и палитру тайлов
    actions.run('tile.palette.open'); if (isTilemap(S.layers[S.cur])) actions.run('tilemap.syncGrid'); setTool('tilebrush'); }
  else { actions.run('tile.palette.close'); if (S.tool === 'tilebrush' || S.tool === 'tileselect') setTool('pencil'); }
  bus.emit('render');
}
export const toggle = () => setMode(!(S.tileset && S.tileset.on));

// клетка карты под экранной точкой (или null)
function cellAt(clientX, clientY) {
  const L = S.layers[S.cur]; if (!isTilemap(L)) return null;
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return null;
  const [gx, gy] = gridAt(clientX, clientY);
  const cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH);
  return inMap(L.tilemap, cx, cy) ? { cx, cy } : null;
}

// операция над клеткой выделения (одна клетка под ПКМ): меняем флаги экземпляра,
// исходный тайл и другие клетки не трогаем
function selCell() { const s = S.tileSel; if (!s || s.li !== S.cur) return null;
  const L = S.layers[S.cur]; if (!isTilemap(L)) return null;
  const cell = getCell(L.tilemap, s.x0, s.y0); return cell && cell.tileId != null ? cell : null; }
function cellOp(fn) { const cell = selCell(); if (!cell) return; snapshot(); fn(cell); rasterLayer(S.cur); bus.emit('render'); }
export const cellFlipH = () => cellOp((c) => { c.flipX = !c.flipX; });
export const cellFlipV = () => cellOp((c) => { c.flipY = !c.flipY; });
export const cellRot = (d) => cellOp((c) => { c.rotation = (((c.rotation || 0) + d) % 360 + 360) % 360; });
export const cellDiagonal = () => cellOp((c) => { c.diagonalFlip = !c.diagonalFlip; });
export function cellClear() { const s = S.tileSel; if (!s || !isTilemap(S.layers[S.cur])) return;
  snapshot(); const tm = S.layers[S.cur].tilemap; tm.cells[s.y0 * tm.mapW + s.x0] = null; rasterLayer(S.cur); bus.emit('render'); }

let menu = null;
function item(label, fn) { const b = document.createElement('button'); b.textContent = label;
  b.onclick = () => { menu.classList.remove('on'); fn(); }; return b; }

// ПКМ-меню клетки: трансформы ЭКЗЕМПЛЯРА (не source) + Clear Cell
function openCellMenu(px, py) {
  if (!menu) { menu = document.createElement('div'); menu.id = 'tile-cctx'; menu.className = 'menu'; document.body.appendChild(menu); }
  menu.innerHTML = '';
  menu.append(
    item(t('tile.flipH'), cellFlipH), item(t('tile.flipV'), cellFlipV),
    item(t('tile.rot90'), () => cellRot(90)), item(t('tile.rot180'), () => cellRot(180)), item(t('tile.rot270'), () => cellRot(270)),
    item(t('tile.diagonal'), cellDiagonal), item(t('tile.clearCell'), cellClear),
  );
  showMenuAt(menu, px, py);
}

// ПКМ по холсту в Tileset Mode: выделяем клетку и открываем её меню
function onCanvasMenu(e) {
  if (!S.tileset || !S.tileset.on) return false;
  const c = cellAt(e.clientX, e.clientY); if (!c) return false;
  S.tileSel = { li: S.cur, x0: c.cx, y0: c.cy, x1: c.cx, y1: c.cy }; bus.emit('render');
  openCellMenu(e.clientX, e.clientY); return true;
}

export const tilesetCellMenu = onCanvasMenu; // экспорт для guard в панели слоёв

export function mount() {
  syncBtn();
  const b = $('tilemap-btn'); if (b) b.onclick = toggle;
  actions.register('tileset.mode', toggle);
  actions.register('tile.cell.flipH', cellFlipH); actions.register('tile.cell.flipV', cellFlipV);
  actions.register('tile.cell.rot90', () => cellRot(90)); actions.register('tile.cell.diagonal', cellDiagonal);
  actions.register('tile.cell.clear', cellClear);
  bus.on('canvas-menu', onCanvasMenu);
}
