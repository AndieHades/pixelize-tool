// Чистые операции над пиксельной сеткой — размеры берём из самой сетки,
// без DOM и без глобального состояния.
export const parseKey = (k) => { const ci = k.indexOf(','); return [+k.slice(0, ci), +k.slice(ci + 1)]; };

// альфа-смешивание source-over: s поверх d, sa — доп. множитель альфы источника (0..1)
export function blendOver(s, d, sa) {
  const ta = sa * (s.length > 3 ? s[3] / 255 : 1);
  if (!d) return [s[0], s[1], s[2], Math.round(ta * 255)];
  const ba = d.length > 3 ? d[3] / 255 : 1, oa = ta + ba * (1 - ta);
  const f = (sc, dc) => Math.round((sc * ta + dc * ba * (1 - ta)) / oa);
  return [f(s[0], d[0]), f(s[1], d[1]), f(s[2], d[2]), Math.round(oa * 255)];
}

// смешать пиксель t (с непрозрачностью op) поверх b — для слияния слоёв
export const mergeCells = (b, t, op) => (t ? blendOver(t, b, op) : (b ? b.slice() : null));

// охватывающий прямоугольник непустых клеток (или null)
export function gridBounds(g) {
  const H = g.length, W = g[0].length; let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) {
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  return maxx < 0 ? null : { minx, miny, maxx, maxy };
}

// Брезенхем — обход линии без дырок; cb(x,y) на каждой клетке
export function bres(x0, y0, x1, y1, cb) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
  for (;;) { cb(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}

// контур прямоугольника по углам; cb(x,y) на каждой клетке рамки
export function rectEdges(x0, y0, x1, y1, cb) {
  const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
  for (let x = ax; x <= bx; x++) { cb(x, ay); if (by !== ay) cb(x, by); }
  for (let y = ay + 1; y < by; y++) { cb(ax, y); if (bx !== ax) cb(bx, y); }
}

// сделать сетку симметричной: зеркалим опорную половину на вторую по осям
export function symmetrizeGrid(g, v, h) {
  const H = g.length, W = g[0].length;
  if (v) for (let y = 0; y < H; y++) for (let x = 0; x < (W >> 1); x++) { const mx = W - 1 - x; g[y][mx] = g[y][x] ? g[y][x].slice() : null; }
  if (h) for (let y = 0; y < (H >> 1); y++) for (let x = 0; x < W; x++) { const my = H - 1 - y; g[my][x] = g[y][x] ? g[y][x].slice() : null; }
}
