// Create Tile From Layer: режет активный пиксельный слой на тайлы размера сетки
// и добавляет непустые в тайлсет (панель тайлов). Кнопка в панели слоёв.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { $, toast, t } from '../core/dom.js';
import { addTile } from '../core/tileset.js';
import { isTilemap, gridTileSize, tilesetForSize } from '../core/tilemap.js';
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
    lastId = addTile(ts, g).id; added++;
  }
  if (!added) { toast(t('toast.layerEmpty')); return; }
  S.activeTile = { tilesetId: ts.id, tileId: lastId };
  actions.run('tile.palette.open'); bus.emit('tileset-changed'); bus.emit('render');
  toast(t('toast.tilesFromLayer', { n: added }));
}

export function mount() {
  actions.register('tile.fromLayer', fromLayer);
  const btn = $('lay-create-tile'); if (btn) btn.onclick = fromLayer;
}
