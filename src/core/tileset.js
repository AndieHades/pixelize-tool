// TilesetManager: библиотека тайлов поверх S.tilesets. Выдаёт стабильные tileId
// (не зависят от позиции/сортировки/удаления соседей — §7 задачи), отвечает на
// запросы «сетка тайла по id» и делает CRUD тайлов. Группы вариантов — отдельно.
import { S } from './state.js';
import { blank, cloneGrid } from '../logic/raster.js';
import { TILE_WEIGHT_DEFAULT } from '../config/tileset.js';

export const getTileset = (id) => S.tilesets.find((ts) => ts.id === id) || null;

// создать новый тайлсет фиксированного размера тайла; вернуть его
export function createTileset(name, tileW, tileH) {
  const ts = { id: ++S.tilesetSeq, name, tileW, tileH, tiles: [], groups: [], tileSeq: 0 };
  S.tilesets.push(ts); return ts;
}

// найти определение тайла и его сетку
export const getTile = (ts, tileId) => (ts ? ts.tiles.find((t) => t.id === tileId) || null : null);
export function tileGrid(tilesetId, tileId) {
  const t = getTile(getTileset(tilesetId), tileId); return t ? t.grid : null;
}

// добавить тайл (пустой или из готовой сетки) со стабильным id; вернуть TileDef
export function addTile(ts, grid, opts = {}) {
  const g = grid ? cloneGrid(grid) : blank(ts.tileW, ts.tileH);
  const tile = { id: ++ts.tileSeq, name: opts.name || '', groupId: opts.groupId ?? null, weight: opts.weight ?? TILE_WEIGHT_DEFAULT, grid: g };
  if (opts.index != null) ts.tiles.splice(opts.index, 0, tile); else ts.tiles.push(tile);
  return tile;
}

// дублировать тайл (новый стабильный id, рядом в палитре)
export function duplicateTile(ts, tileId) {
  const t = getTile(ts, tileId); if (!t) return null;
  const i = ts.tiles.indexOf(t);
  return addTile(ts, t.grid, { name: t.name, groupId: t.groupId, weight: t.weight, index: i + 1 });
}

// удалить тайл из тайлсета (экземпляры на картах чистятся вызывающей стороной)
export function deleteTile(ts, tileId) {
  const i = ts.tiles.findIndex((t) => t.id === tileId);
  if (i >= 0) ts.tiles.splice(i, 1);
}

export function renameTile(ts, tileId, name) { const t = getTile(ts, tileId); if (t) t.name = name; }

// видимый порядок тайлов (индекс в палитре = позиция; tileId стабилен отдельно)
export const tilesInOrder = (ts) => (ts ? ts.tiles : []);
export const tileIndex = (ts, tileId) => (ts ? ts.tiles.findIndex((t) => t.id === tileId) : -1);
