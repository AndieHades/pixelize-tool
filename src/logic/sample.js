// Дискретизация картинки в сетку клеток-«пикселей». Чисто: на входе {w,h,ch,data}.
const at = (im, x, y) => { const i = (y * im.w + x) * im.ch; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
const alphaAt = (im, x, y) => (im.ch > 3 ? im.data[(y * im.w + x) * im.ch + 3] : 255);

function edgeEnergy(im, axis) { const n = axis === 0 ? im.w : im.h, m = axis === 0 ? im.h : im.w, e = new Float64Array(n);
  for (let i = 1; i < n; i++) { let s = 0; for (let j = 0; j < m; j += 2) { const a = axis === 0 ? at(im, i, j) : at(im, j, i), b = axis === 0 ? at(im, i - 1, j) : at(im, j, i - 1); s += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); } e[i] = s; } return e; }

// период решётки апскейленного пиксель-арта: автокорреляция энергии граней (коэф. 2..40)
function detectPeriod(e) { let best = 8, bv = -1; for (let lag = 4; lag <= 40; lag++) { let s = 0; for (let i = 0; i + lag < e.length; i++) s += e[i] * e[i + lag]; s /= e.length - lag; if (s > bv) { bv = s; best = lag; } } return best; }

// доминирующий цвет клетки; прозрачные пиксели не учитываем, клетка прозрачна
// при большинстве прозрачных — точный вырез по альфе исходника
function cellColor(im, x0, y0, x1, y1) { const freq = new Map(), xs = Math.floor(x0), xe = Math.max(xs + 1, Math.floor(x1)), ys = Math.floor(y0), ye = Math.max(ys + 1, Math.floor(y1));
  let opaque = 0, total = 0;
  for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) { total++;
    if (alphaAt(im, x, y) < 128) continue; opaque++;
    const c = at(im, x, y), k = ((c[0] >> 3) << 10) | ((c[1] >> 3) << 5) | (c[2] >> 3); let e = freq.get(k); if (!e) { e = [0, 0, 0, 0]; freq.set(k, e); } e[0] += c[0]; e[1] += c[1]; e[2] += c[2]; e[3]++; }
  if (opaque * 2 < total) return null;
  let best = [0, 0, 0, 1], bn = -1; for (const e of freq.values()) if (e[3] > bn) { bn = e[3]; best = e; } return [Math.round(best[0] / best[3]), Math.round(best[1] / best[3]), Math.round(best[2] / best[3])]; }

// заливка фона от краёв; прозрачные клетки (null) — всегда фон
function floodBackground(g, nx, ny, bgTol) { const bg = g[0][0], tol2 = bgTol * bgTol;
  const near = (c) => !c || (bg ? (c[0] - bg[0]) ** 2 + (c[1] - bg[1]) ** 2 + (c[2] - bg[2]) ** 2 < tol2 : false);
  const isBg = Array.from({ length: ny }, () => new Array(nx).fill(false)), st = [];
  for (let x = 0; x < nx; x++) st.push([x, 0], [x, ny - 1]); for (let y = 0; y < ny; y++) st.push([0, y], [nx - 1, y]);
  while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x >= nx || y >= ny || isBg[y][x] || !near(g[y][x])) continue; isBg[y][x] = true; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); } return isBg; }

// снять антиалиас-ореол вдоль выреза: блёклые «смешанные с фоном» пиксели у
// границы прозрачного. Толерантность шире, чем у заливки фона (×2), но трогаем
// только клетки на границе — съедаем кайму послойно, не залезая внутрь рисунка
function defringe(g, isBg, nx, ny, bgTol) { const bg = g[0][0]; if (!bg) return; const tol2 = (bgTol * 2) ** 2;
  const near = (c) => c && (c[0] - bg[0]) ** 2 + (c[1] - bg[1]) ** 2 + (c[2] - bg[2]) ** 2 < tol2;
  for (let pass = 0; pass < 4; pass++) { let changed = false;
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { if (isBg[y][x] || !near(g[y][x])) continue;
      let edge = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x2 = x + dx, y2 = y + dy;
        if (x2 < 0 || y2 < 0 || x2 >= nx || y2 >= ny || isBg[y2][x2] || !g[y2][x2]) { edge = true; break; } }
      if (edge) { isBg[y][x] = true; changed = true; } }
    if (!changed) break; } }

export function sampleGrid(im, cell, bgTol) {
  let cw, ch;
  if (cell) { cw = cell; ch = cell; }
  else if (Math.max(im.w, im.h) <= 256) { cw = 1; ch = 1; } // файл в родном разрешении — берём 1:1, холст = размер картинки
  else { cw = detectPeriod(edgeEnergy(im, 0)); ch = detectPeriod(edgeEnergy(im, 1));
    // поиск периода имеет смысл только для апскейлов пиксель-арта; если сетка вышла
    // слишком грубой — это обычное фото, целимся в ~64 клетки по большой стороне
    if (Math.max(im.w / cw, im.h / ch) < 32) { cw = ch = Math.max(im.w, im.h) / 64; } }
  const nx = Math.max(1, Math.round(im.w / cw)), ny = Math.max(1, Math.round(im.h / ch)), full = [];
  for (let j = 0; j < ny; j++) { const row = []; for (let i = 0; i < nx; i++) row.push(cellColor(im, i * im.w / nx, j * im.h / ny, (i + 1) * im.w / nx, (j + 1) * im.h / ny)); full.push(row); }
  const isBg = floodBackground(full, nx, ny, bgTol);
  if (bgTol > 0) defringe(full, isBg, nx, ny, bgTol); // добить антиалиас-ореол у выреза
  const grid = [], samples = [];
  for (let j = 0; j < ny; j++) { const row = []; for (let i = 0; i < nx; i++) { if (isBg[j][i] || !full[j][i]) row.push(null); else { row.push(full[j][i]); samples.push(full[j][i]); } } grid.push(row); } return { grid, samples, nx, ny }; }
