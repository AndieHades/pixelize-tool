// Структурные операции над холстом-документом (примитив для многих систем).
// Меняет размеры/слои, сдвигает запасные пиксели, сбрасывает выделение.
import { S, blank, newLayer } from './state.js';
import * as bus from './bus.js';
import { parseKey } from '../logic/raster.js';
import { dirtyAll, markDirty } from './layer-cache.js';
import { snapshot } from './history.js';
import { toast } from './dom.js';

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

// кадрировать холст прямоугольником (может выходить за край — тогда обрезает/
// расширяет); отрезанное уходит в запас ext, чтобы не теряться
export function applyCropRect(x0, y0, x1, y1) {
  snapshot();
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
  for (const L of S.layers) { const ne = new Map();
    const out = Array.from({ length: nh }, () => new Array(nw).fill(null));
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = L.grid[y][x]; if (!c) continue;
      const nx2 = x - x0, ny2 = y - y0;
      if (nx2 >= 0 && ny2 >= 0 && nx2 < nw && ny2 < nh) out[ny2][nx2] = c; else ne.set(nx2 + ',' + ny2, c); }
    for (const [k, c] of L.ext) { const [kx, ky] = parseKey(k), ax = kx - x0, ay = ky - y0;
      if (ax >= 0 && ay >= 0 && ax < nw && ay < nh) { if (!out[ay][ax]) out[ay][ax] = c; } else ne.set(ax + ',' + ay, c); }
    L.grid = out; L.ext = ne; }
  S.W = nw; S.H = nh; S.sel = null;
  bus.emit('selection'); dirtyAll(); bus.emit('layers'); bus.emit('fit');
  toast(`Холст: ${S.W}×${S.H}`);
}

// вставить RGBA-картинку w×h новым слоем по центру холста (без snapshot/UI)
export function placeImageLayer(w, h, d) {
  const nl = newLayer('Картинка', S.W, S.H); nl.fid = S.layers[S.cur].fid;
  const ox = (S.W - w) >> 1, oy = (S.H - h) >> 1;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const o = (y * w + xx) * 4;
    if (d[o + 3] < 8) continue; nl.grid[oy + y][ox + xx] = [d[o], d[o + 1], d[o + 2], d[o + 3]]; }
  S.layers.splice(S.cur + 1, 0, nl); S.cur++; S.marked.clear(); dirtyAll(); return nl;
}

// сдвинуть содержимое слоя на (dx,dy); ушедшее за край — в запас ext
export function shiftLayerGrid(L, dx, dy) { const ng = blank(S.W, S.H), ne = new Map();
  const put = (x, y, c) => { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < S.W && ny < S.H) ng[ny][nx] = c; else ne.set(nx + ',' + ny, c); };
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = L.grid[y][x]; if (c) put(x, y, c.slice()); }
  for (const [k, c] of L.ext) { const [px, py] = parseKey(k); put(px, py, c.slice()); }
  L.grid = ng; L.ext = ne; }

// очистить текущий слой; false — если уже пуст
export function clearLayer() {
  const L = S.layers[S.cur]; if (!L.grid.some((r) => r.some((c) => c)) && !L.ext.size) return false;
  snapshot(); L.grid = blank(S.W, S.H); L.ext = new Map(); markDirty(S.cur);
  bus.emit('render'); bus.emit('layers'); return true;
}
