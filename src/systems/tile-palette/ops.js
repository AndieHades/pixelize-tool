// Команды Tile Palette над тайлами активного тайлсета: создать/дублировать/
// удалить/переименовать. Снимок в историю + чистка экземпляров удалённого тайла.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { toast, t } from '../../core/dom.js';
import { addTile, duplicateTile, deleteTile, renameTile, tileIndex } from '../../core/tileset.js';
import { isTilemap, rasterLayer } from '../../core/tilemap.js';

// активный тайлсет: тайлсет активного tilemap-слоя, иначе первый в библиотеке
export function activeTileset() {
  const L = S.layers[S.cur];
  if (isTilemap(L)) { const id = L.tilemap.tilesetId; const ts = S.tilesets.find((x) => x.id === id); if (ts) return ts; }
  return S.tilesets[0] || null;
}

const changed = () => { bus.emit('tileset-changed'); bus.emit('render'); };

export function newTile() { const ts = activeTileset(); if (!ts) { toast(t('toast.noTilemap')); return; }
  snapshot(); const tl = addTile(ts); S.activeTile = { tilesetId: ts.id, tileId: tl.id }; changed(); }

export function dupTile(tileId) { const ts = activeTileset(); if (!ts) return;
  snapshot(); const tl = duplicateTile(ts, tileId); if (tl) S.activeTile = { tilesetId: ts.id, tileId: tl.id }; changed(); }

// удалить тайл и очистить его экземпляры со всех tilemap-слоёв этого тайлсета
export function delTile(tileId) { const ts = activeTileset(); if (!ts) return; snapshot();
  deleteTile(ts, tileId);
  S.layers.forEach((L, i) => { if (!isTilemap(L) || L.tilemap.tilesetId !== ts.id) return;
    let touched = false;
    L.tilemap.cells = L.tilemap.cells.map((c) => { if (c && c.tileId === tileId) { touched = true; return null; } return c; });
    if (touched) rasterLayer(i); });
  if (S.activeTile && S.activeTile.tileId === tileId) S.activeTile = ts.tiles[0] ? { tilesetId: ts.id, tileId: ts.tiles[0].id } : null;
  changed(); }

export function renTile(tileId, name) { const ts = activeTileset(); if (!ts) return; snapshot(); renameTile(ts, tileId, name); changed(); }

// видимый индекс тайла в палитре (для подписи)
export const visibleIndex = (ts, tileId) => tileIndex(ts, tileId);
