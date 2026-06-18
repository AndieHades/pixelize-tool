// Create Tile From Layer: режет активный пиксельный слой на тайлы размера сетки
// и добавляет непустые в тайлсет (панель тайлов). Кнопка в панели слоёв.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { toast, t } from '../core/dom.js';
import { addTileUnique } from '../core/tileset.js';
import { isTilemap, gridTileSize, tilesetForSize, rasterLayer } from '../core/tilemap.js';
import { dirtyAll } from '../core/layer-cache.js';
import { blank } from '../logic/raster.js';

// вырезать блок tw×th из сетки слоя по клетке (cx,cy); null — если блок пуст
function block(grid, cx, cy, tw, th) {
  const g = blank(tw, th); let any = false;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const sy = cy * th + y, sx = cx * tw + x;
    if (sy < S.H && sx < S.W) { const c = grid[sy][sx]; if (c) { g[y][x] = c.slice(); any = true; } }
  }
  return any ? g : null;
}

export function fromLayer() {
  const L = S.layers[S.cur];
  if (!L || isTilemap(L)) { toast(t('toast.needPixelLayer')); return; }
  const { w: tw, h: th } = gridTileSize();
  const ts = tilesetForSize(tw, th);
  snapshot(); let added = 0, lastId = null;
  for (let cy = 0; cy * th < S.H; cy++) for (let cx = 0; cx * tw < S.W; cx++) {
    const g = block(L.grid, cx, cy, tw, th); if (!g) continue;
    const r = addTileUnique(ts, g); lastId = r.tile.id; if (r.added) added++; // одинаковые тайлы не дублируются
  }
  if (lastId == null) { toast(t('toast.layerEmpty')); return; }
  S.activeTile = { tilesetId: ts.id, tileId: lastId };
  actions.run('tile.palette.open'); bus.emit('tileset-changed'); bus.emit('render');
  toast(t('toast.tilesFromLayer', { n: added }));
}

// Convert to Tilemap: превратить активный пиксельный слой в Tilemap-слой. Режем по
// сетке с дедупликацией (одинаковые блоки → один tileId), клетки ссылаются на
// тайлы. Слой меняет тип на 'tilemap' и получает иконку в списке.
export function convertToTile() {
  const L = S.layers[S.cur];
  if (!L || isTilemap(L)) { toast(t('toast.needPixelLayer')); return; }
  const { w: tw, h: th } = gridTileSize();
  const ts = tilesetForSize(tw, th);
  snapshot();
  const mapW = Math.ceil(S.W / tw), mapH = Math.ceil(S.H / th), cells = new Array(mapW * mapH).fill(null);
  for (let cy = 0; cy < mapH; cy++) for (let cx = 0; cx < mapW; cx++) {
    const g = block(L.grid, cx, cy, tw, th); if (!g) continue;
    const id = addTileUnique(ts, g).tile.id; // дедуп: одинаковые блоки → один tileId
    cells[cy * mapW + cx] = { tileId: id, flipX: false, flipY: false, diagonalFlip: false, rotation: 0 };
  }
  L.kind = 'tilemap'; L.tilemap = { tilesetId: ts.id, mapW, mapH, cells };
  S.activeTile = { tilesetId: ts.id, tileId: ts.tiles[0] ? ts.tiles[0].id : null };
  rasterLayer(S.cur); dirtyAll();
  actions.run('tile.palette.open'); bus.emit('tileset-changed'); bus.emitDoc();
  toast(t('toast.tilesFromLayer', { n: ts.tiles.length }));
}

export function mount() {
  actions.register('tile.fromLayer', fromLayer); // действие осталось (вызов из кода), кнопка убрана — есть «Convert to Tilemap» в меню слоя
  actions.register('tile.convertLayer', convertToTile);
}
