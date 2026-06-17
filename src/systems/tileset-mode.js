// Tileset Mode: тумблер (рядом с grid) — палитра тайлов + сетка + кисть тайлов.
// Ключевая механика: выбор конкретной клетки на холсте и работа с её содержимым
// по ВСЕМ выбранным Tile-слоям (clear/flip/Add to tileset), независимо от числа слоёв.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, showMenuAt, toast, t } from '../core/dom.js';
import { setTool } from '../core/tools.js';
import { snapshot } from '../core/history.js';
import { gridAt } from '../core/viewport.js';
import { getTileset, addTileUnique } from '../core/tileset.js';
import { isTilemap, inMap, getCell, rasterLayer, tileLayerIdxs, selectedLayerIdxs, composeCell, cellIndex, gridTileSize, tilesetForSize } from '../core/tilemap.js';

const syncBtn = () => { const b = $('tilemap-btn'); if (b) b.classList.toggle('on', !!(S.tileset && S.tileset.on)); };

export function setMode(on) {
  S.tileset.on = on; syncBtn();
  if (on) { S.grid.visible = true;
    actions.run('tile.palette.open'); if (isTilemap(S.layers[S.cur])) actions.run('tilemap.syncGrid'); setTool('tilebrush'); }
  else { actions.run('tile.palette.close'); if (S.tool === 'tilebrush' || S.tool === 'tileselect') setTool('pencil'); }
  bus.emit('render');
}
export const toggle = () => setMode(!(S.tileset && S.tileset.on));

// размер клетки в контексте: тайл активного Tile-слоя или ячейка сетки (обычный слой)
function ctxTileSize() { const L = S.layers[S.cur];
  if (isTilemap(L)) { const ts = getTileset(L.tilemap.tilesetId); if (ts) return { w: ts.tileW, h: ts.tileH }; }
  return gridTileSize(); }

// клетка под экранной точкой (или null) — на Tile-слое и на обычном слое
function cellAt(clientX, clientY) {
  const L = S.layers[S.cur]; if (!L) return null;
  const { w, h } = ctxTileSize(); const [gx, gy] = gridAt(clientX, clientY);
  const cx = Math.floor(gx / w), cy = Math.floor(gy / h);
  if (isTilemap(L)) return inMap(L.tilemap, cx, cy) ? { cx, cy } : null;
  return (gx >= 0 && gy >= 0 && gx < S.W && gy < S.H) ? { cx, cy } : null;
}

// операция над выбранной клеткой по ВСЕМ выбранным Tile-слоям
function cellOpAll(fn) { const idxs = tileLayerIdxs(), s = S.tileSel; if (!idxs.length || !s) return;
  snapshot(); for (const i of idxs) { const cell = getCell(S.layers[i].tilemap, s.x0, s.y0); if (cell && cell.tileId != null) { fn(cell); rasterLayer(i); } }
  bus.emit('render'); }
export const cellFlipH = () => cellOpAll((c) => { c.flipX = !c.flipX; });
export const cellFlipV = () => cellOpAll((c) => { c.flipY = !c.flipY; });
export function cellClear() { const idxs = tileLayerIdxs(), s = S.tileSel; if (!idxs.length || !s) return;
  snapshot(); for (const i of idxs) { const tm = S.layers[i].tilemap; tm.cells[cellIndex(tm, s.x0, s.y0)] = null; rasterLayer(i); } bus.emit('render'); }

// Add to tileset: содержимое выбранной клетки по всем Tile-слоям → новый тайл
// (дедуп: совпадает с существующим — не добавляет)
export function addToSet() {
  const idxs = selectedLayerIdxs(); if (!idxs.length) return;
  const s = S.tileSel; if (!s) { toast(t('toast.pickCell')); return; }
  const { w, h } = ctxTileSize();
  const grid = composeCell(idxs, s.x0, s.y0, w, h);
  if (!grid || grid.every((r) => r.every((c) => !c))) { toast(t('toast.cellEmpty')); return; }
  const L = S.layers[S.cur], ts = isTilemap(L) ? getTileset(L.tilemap.tilesetId) : tilesetForSize(w, h);
  if (!ts) return; snapshot(); const r = addTileUnique(ts, grid);
  S.activeTile = { tilesetId: ts.id, tileId: r.tile.id };
  bus.emit('tileset-changed'); bus.emit('render'); toast(t(r.added ? 'toast.tileAdded' : 'toast.tileExists'));
}

let menu = null;
function item(label, fn) { const b = document.createElement('button'); b.textContent = label;
  b.onclick = () => { menu.classList.remove('on'); fn(); }; return b; }

function openCellMenu(px, py) {
  if (!menu) { menu = document.createElement('div'); menu.id = 'tile-cctx'; menu.className = 'menu'; document.body.appendChild(menu); }
  menu.innerHTML = '';
  if (isTilemap(S.layers[S.cur])) menu.append(item(t('tile.clearCell'), cellClear), item(t('tile.flipH'), cellFlipH), item(t('tile.flipV'), cellFlipV), item(t('tile.addToSet'), addToSet));
  else menu.append(item(t('tile.addToSet'), addToSet)); // обычный слой — только забрать клетку в тайлсет
  showMenuAt(menu, px, py);
}

// ПКМ по холсту всегда (на Tile-слое) выбирает клетку и открывает её меню
function onCanvasMenu(e) {
  const c = cellAt(e.clientX, e.clientY); if (!c) return false;
  S.tileSel = { li: S.cur, x0: c.cx, y0: c.cy, x1: c.cx, y1: c.cy }; bus.emit('render');
  openCellMenu(e.clientX, e.clientY); return true;
}

export function mount() {
  syncBtn();
  const b = $('tilemap-btn'); if (b) b.onclick = toggle;
  actions.register('tileset.mode', toggle);
  actions.register('tile.cell.flipH', cellFlipH); actions.register('tile.cell.flipV', cellFlipV); actions.register('tile.cell.clear', cellClear);
  actions.register('tile.addToSet', addToSet);
  bus.on('canvas-menu', onCanvasMenu);
}
