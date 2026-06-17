// Создание tilemap-слоя. Размер тайла берётся из существующей сетки (S.grid) —
// та же сетка, что и для рисования. Создание включает сетку и совмещает её с
// тайлами, чтобы tileset-режим работал «когда сетка видна».
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { $, toast, t } from '../core/dom.js';
import { dirtyAll } from '../core/layer-cache.js';
import { makeTilemapLayer, rasterLayer, isTilemap, gridTileSize, tilesetForSize } from '../core/tilemap.js';

// показать сетку и совместить её с размером тайла активного tilemap-слоя
export function syncGridToTilemap() {
  const L = S.layers[S.cur]; if (!isTilemap(L)) return;
  const ts = S.tilesets.find((x) => x.id === L.tilemap.tilesetId); if (!ts) return;
  S.grid.w = ts.tileW; S.grid.h = ts.tileH; S.grid.visible = true; bus.emit('render');
}

export function open() {
  snapshot();
  const { w: tw, h: th } = gridTileSize();
  const ts = tilesetForSize(tw, th);
  const mapW = Math.max(1, Math.ceil(S.W / tw)), mapH = Math.max(1, Math.ceil(S.H / th));
  const L = makeTilemapLayer(t('tile.tilemapLayer'), ts.id, mapW, mapH);
  const at = S.layers.length; S.layers.splice(at, 0, L); S.cur = at;
  S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxCur = null;
  S.activeTile = { tilesetId: ts.id, tileId: ts.tiles[0] ? ts.tiles[0].id : null };
  S.grid.w = tw; S.grid.h = th; S.grid.visible = true; // сетка = размер тайла, видима
  rasterLayer(at); dirtyAll(); bus.emit('render'); bus.emitDoc(); bus.emit('tileset-changed'); toast(t('toast.tilemapCreated'));
}

export function mount() {
  actions.register('tilemap.newLayer', open);
  actions.register('tilemap.syncGrid', syncGridToTilemap);
  const btn = $('lay-tmap'); if (btn) btn.onclick = open;
  bus.on('layers', syncGridToTilemap); // выбор tilemap-слоя совмещает сетку с его тайлами
}
