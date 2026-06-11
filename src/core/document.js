// Структурные операции над холстом-документом (примитив для многих систем).
// Меняет размеры/слои, сдвигает запасные пиксели, сбрасывает выделение.
import { S } from './state.js';
import * as bus from './bus.js';
import { parseKey } from '../logic/raster.js';
import { dirtyAll } from './layer-cache.js';

// добавить пустые ряды/колонки по краям (во все слои); рисунок визуально на месте
export function expandCanvas(pl, pt, pr, pb) {
  if (!(pl || pt || pr || pb)) return;
  S.W += pl + pr; S.H += pt + pb;
  for (const L of S.layers) { const g = L.grid, out = [];
    for (let y = 0; y < S.H; y++) { const row = new Array(S.W).fill(null);
      const sy = y - pt; if (sy >= 0 && sy < g.length) for (let x = 0; x < g[sy].length; x++) row[x + pl] = g[sy][x];
      out.push(row); }
    const ne = new Map(); // запасные пиксели за краем: сдвигаем и впитываем попавшие в холст
    for (const [k, c] of L.ext) { const [kx, ky] = parseKey(k), ax = kx + pl, ay = ky + pt;
      if (ax >= 0 && ay >= 0 && ax < S.W && ay < S.H) out[ay][ax] = c; else ne.set(ax + ',' + ay, c); }
    L.grid = out; L.ext = ne; }
  S.view.ox -= pl * S.view.zoom; S.view.oy -= pt * S.view.zoom;
  S.sel = null; bus.emit('selection'); dirtyAll();
}
