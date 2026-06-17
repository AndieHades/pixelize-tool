// Движок tilemap-слоя: пересобирает пиксельный кеш L.grid из cells + тайлсета
// (через logic/tilemap-raster) и помечает слой грязным. Здесь же — авто-
// обновление всех экземпляров tileId при правке source tile (§6 задачи).
import { S, blank } from './state.js';
import { markDirty } from './layer-cache.js';
import { getTileset, tileGrid } from './tileset.js';
import { rasterTilemap } from '../logic/tilemap-raster.js';
import { cloneCell } from '../logic/tilemap-data.js';

export const isTilemap = (L) => !!(L && L.kind === 'tilemap' && L.tilemap);

// создать tilemap-слой документа размера S.W×S.H; tilemap привязан к тайлсету
export function makeTilemapLayer(name, tilesetId, mapW, mapH) {
  const cells = new Array(mapW * mapH).fill(null);
  return { name, grid: blank(S.W, S.H), opacity: 1, visible: true, fid: null, clip: false,
    lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [],
    kind: 'tilemap', tilemap: { tilesetId, mapW, mapH, cells } };
}

// индекс клетки в плоском массиве
export const cellIndex = (tm, cx, cy) => cy * tm.mapW + cx;
export const inMap = (tm, cx, cy) => cx >= 0 && cy >= 0 && cx < tm.mapW && cy < tm.mapH;
export const getCell = (tm, cx, cy) => (inMap(tm, cx, cy) ? tm.cells[cellIndex(tm, cx, cy)] : null);

// пересобрать пиксельный кеш слоя из его cells и тайлсета; пометить грязным
export function rasterLayer(li) {
  const L = S.layers[li]; if (!isTilemap(L)) return;
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return;
  const map = rasterTilemap(L.tilemap, ts.tileW, ts.tileH, (id) => tileGrid(ts.id, id));
  const grid = blank(S.W, S.H); // tilemap кладётся в левый-верхний угол холста, обрезается по краю
  for (let y = 0; y < map.length && y < S.H; y++) for (let x = 0; x < map[0].length && x < S.W; x++) grid[y][x] = map[y][x];
  L.grid = grid; markDirty(li);
}

// все индексы tilemap-слоёв, где встречается tileId данного тайлсета
export function layersUsingTile(tilesetId, tileId) {
  const out = [];
  S.layers.forEach((L, i) => { if (!isTilemap(L) || L.tilemap.tilesetId !== tilesetId) return;
    if (L.tilemap.cells.some((c) => c && c.tileId === tileId)) out.push(i); });
  return out;
}

// правка source tile → пересобрать все слои с этим tileId (все экземпляры разом)
export function refreshTile(tilesetId, tileId) {
  for (const i of layersUsingTile(tilesetId, tileId)) rasterLayer(i);
}

// поставить/стереть клетку и пересобрать слой (стирание — cell=null)
export function setCell(li, cx, cy, cell) {
  const L = S.layers[li]; if (!isTilemap(L) || !inMap(L.tilemap, cx, cy)) return;
  L.tilemap.cells[cellIndex(L.tilemap, cx, cy)] = cell ? cloneCell(cell) : null;
  rasterLayer(li);
}
