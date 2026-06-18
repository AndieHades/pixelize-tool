// Manual/Auto пиксельное рисование по tilemap-слою (как в Aseprite tiles).
// Глобальный обработчик перехватывает pencil/eraser в Tileset Mode на tilemap:
//  Manual — пишем в source тайла клетки (обновляются все экземпляры);
//  Auto   — пустая клетка получает новый tileId, занятая правит свой tileId.
// Пустая клетка → создаётся новый тайл; если штрих оставил её пустой — тайл
// удаляется (пустая клетка тайла не порождает).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { setTool } from '../../core/tools.js';
import { registerGlobal } from '../../core/canvas-handlers.js';
import { snapshot } from '../../core/history.js';
import { getTileset, getTile, addTile, deleteTile, findTileByGrid } from '../../core/tileset.js';
import { isTilemap, inMap, getCell, refreshTile, rasterLayer, layersUsingTile } from '../../core/tilemap.js';
import { invTransformCoord, cellFlags } from '../../logic/tile-transform.js';
import { floodRegion } from '../../logic/flood.js';
import { afterStroke } from '../draw/stroke.js';

const active = () => S.layers[S.cur];
// пиксельные инструменты на tilemap-слое всегда идут сюда (иначе писали бы в кеш
// grid и затирались при пересборке). Режим правки — S.tileAutoMode (M/A).
const applicable = () => isTilemap(active()) && (S.tool === 'pencil' || S.tool === 'eraser' || S.tool === 'fill');

let st = null; // { ts, li, created:Set, touched:Set, last:[gx,gy] }

// тайл, в source которого пишем для клетки (cx,cy) согласно режиму
function targetTile(cx, cy) {
  const tm = active().tilemap, ts = st.ts, cell = getCell(tm, cx, cy);
  if (!cell || cell.tileId == null) { const tl = addTile(ts); setTileId(tm, cx, cy, tl.id); st.created.add(tl.id); return tl; }
  return getTile(ts, cell.tileId);
}
function setTileId(tm, cx, cy, id) { const c = tm.cells[cy * tm.mapW + cx]; if (c) c.tileId = id; else tm.cells[cy * tm.mapW + cx] = { tileId: id, flipX: false, flipY: false, diagonalFlip: false, rotation: 0 }; }

function paintPx(gx, gy, erase) {
  const ts = st.ts; const cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH);
  if (!inMap(active().tilemap, cx, cy)) return;
  const tile = targetTile(cx, cy); if (!tile) return;
  const flags = cellFlags(getCell(active().tilemap, cx, cy));
  const [sx, sy] = ts.tileW === ts.tileH ? invTransformCoord(gx - cx * ts.tileW, gy - cy * ts.tileH, ts.tileW, flags) : [gx - cx * ts.tileW, gy - cy * ts.tileH];
  if (sx < 0 || sy < 0 || sx >= ts.tileW || sy >= ts.tileH) return;
  tile.grid[sy][sx] = erase ? null : [S.active[0], S.active[1], S.active[2], 255];
  st.touched.add(tile.id);
}

// интерполяция между точками штриха, чтобы не было разрывов на быстром движении
function line(x0, y0, x1, y1, erase) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { paintPx(x, y, erase); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}

// заливка ОДНОЙ клетки (тайла) — связная область внутри одного тайла, не по всему
// слою (на обычном слое заливка остаётся обычной — этот обработчик не сработает)
function fillCell(gx, gy) { const ts = st.ts, cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH);
  if (!inMap(active().tilemap, cx, cy)) return;
  const tile = targetTile(cx, cy); if (!tile) return;
  const flags = cellFlags(getCell(active().tilemap, cx, cy));
  const [sx, sy] = ts.tileW === ts.tileH ? invTransformCoord(gx - cx * ts.tileW, gy - cy * ts.tileH, ts.tileW, flags) : [gx - cx * ts.tileW, gy - cy * ts.tileH];
  if (sx < 0 || sy < 0 || sx >= ts.tileW || sy >= ts.tileH) return;
  const col = [S.active[0], S.active[1], S.active[2], 255];
  for (const [px, py] of floodRegion(tile.grid, sx, sy)) tile.grid[py][px] = col;
  st.touched.add(tile.id); }

function finishStroke() {
  for (const id of st.created) { const tl = getTile(st.ts, id); if (tl && tl.grid.every((r) => r.every((c) => !c))) clearTile(id); } // пустой созданный тайл → удалить
  for (const id of st.created) dedupe(id); // одинаковые тайлы не плодим
  flush(); bus.emit('tileset-changed'); afterStroke(); st = null;
}

// Manual не работает на пустой клетке: сразу включаем Auto (новый тайл создастся
// сам, попадёт в палитру и продолжит обновляться по мере рисования)
function autoOnEmpty(ts, gx, gy, erase) {
  if (S.tileAutoMode !== 'manual' || erase) return;
  const cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH), tm = active().tilemap;
  if (!inMap(tm, cx, cy)) return; const cell = getCell(tm, cx, cy);
  if (!cell || cell.tileId == null) { S.tileAutoMode = 'auto'; bus.emit('tileset-changed'); }
}

const handler = {
  down({ gx, gy, e }) { if (!applicable()) return false;
    const ts = getTileset(active().tilemap.tilesetId); if (!ts) return false;
    const erase = S.tool === 'eraser' || (e && e.button === 2);
    autoOnEmpty(ts, gx, gy, erase);
    snapshot(); st = { ts, li: S.cur, created: new Set(), touched: new Set(), last: [gx, gy] };
    if (S.tool === 'fill') { fillCell(gx, gy); finishStroke(); return true; } // заливка — на одну клетку, разово
    paintPx(gx, gy, erase); flush(); return true; },
  move({ gx, gy, e }) { if (!st) return; const erase = S.tool === 'eraser' || (e && e.buttons === 2);
    line(st.last[0], st.last[1], gx, gy, erase); st.last = [gx, gy]; flush(); },
  up() { if (st) finishStroke(); },
};

function clearTile(id) { deleteTile(st.ts, id); const tm = active().tilemap;
  tm.cells = tm.cells.map((c) => (c && c.tileId === id ? null : c)); st.touched.add(id); }

// если созданный тайл совпал с уже существующим — перенаправить клетки на него
function dedupe(id) { const tl = getTile(st.ts, id); if (!tl) return;
  const match = findTileByGrid(st.ts, tl.grid); if (!match || match.id === id) return;
  for (const li of layersUsingTile(st.ts.id, id)) { const tm = S.layers[li].tilemap;
    tm.cells.forEach((c) => { if (c && c.tileId === id) c.tileId = match.id; }); rasterLayer(li); }
  deleteTile(st.ts, id); st.touched.add(match.id); }
function flush() { for (const id of st.touched) refreshTile(st.ts.id, id); rasterLayer(st.li); bus.emit('render'); }

registerGlobal(handler);
// M/A: режим пиксельной правки тайлов; переключение выбирает карандаш для правки
actions.register('tile.manual', () => { S.tileAutoMode = 'manual'; setTool('pencil'); bus.emit('tileset-changed'); });
actions.register('tile.auto', () => { S.tileAutoMode = 'auto'; setTool('pencil'); bus.emit('tileset-changed'); });
