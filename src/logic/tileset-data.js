// Глубокая копия тайлсета (для истории/галереи/сериализации). Чистые данные:
// тайлы с пиксельными сетками, группы вариантов, счётчик стабильных id.
import { cloneGrid } from './raster.js';

export const cloneTile = (t) => ({ id: t.id, name: t.name || '', groupId: t.groupId ?? null, weight: t.weight, grid: cloneGrid(t.grid) });
export const cloneGroup = (g) => ({ id: g.id, name: g.name || '', baseTileId: g.baseTileId ?? null });

export const cloneTileset = (ts) => ({
  id: ts.id, name: ts.name, tileW: ts.tileW, tileH: ts.tileH, tileSeq: ts.tileSeq,
  tiles: ts.tiles.map(cloneTile), groups: (ts.groups || []).map(cloneGroup),
});
