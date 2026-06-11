    const at = (im, x, y) => { const i = (y * im.w + x) * im.ch; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
    function edgeEnergy(im, axis) { const n = axis === 0 ? im.w : im.h, m = axis === 0 ? im.h : im.w, e = new Float64Array(n);
      for (let i = 1; i < n; i++) { let s = 0; for (let j = 0; j < m; j += 2) { const a = axis === 0 ? at(im, i, j) : at(im, j, i), b = axis === 0 ? at(im, i - 1, j) : at(im, j, i - 1); s += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]); } e[i] = s; } return e; }
    function detectPeriod(e) { let best = 8, bv = -1; for (let lag = 5; lag <= 22; lag++) { let s = 0; for (let i = 0; i + lag < e.length; i++) s += e[i] * e[i + lag]; s /= e.length - lag; if (s > bv) { bv = s; best = lag; } } return best; }
    function cellColor(im, x0, y0, x1, y1) { const freq = new Map(), xs = Math.floor(x0), xe = Math.max(xs + 1, Math.floor(x1)), ys = Math.floor(y0), ye = Math.max(ys + 1, Math.floor(y1));
      for (let y = ys; y < ye; y++) for (let x = xs; x < xe; x++) { const c = at(im, x, y), k = ((c[0] >> 3) << 10) | ((c[1] >> 3) << 5) | (c[2] >> 3); let e = freq.get(k); if (!e) { e = [0, 0, 0, 0]; freq.set(k, e); } e[0] += c[0]; e[1] += c[1]; e[2] += c[2]; e[3]++; }
      let best = [0, 0, 0, 1], bn = -1; for (const e of freq.values()) if (e[3] > bn) { bn = e[3]; best = e; } return [Math.round(best[0] / best[3]), Math.round(best[1] / best[3]), Math.round(best[2] / best[3])]; }
    function floodBackground(g, nx, ny, bgTol) { const bg = g[0][0], tol2 = bgTol * bgTol, near = (c) => (c[0] - bg[0]) ** 2 + (c[1] - bg[1]) ** 2 + (c[2] - bg[2]) ** 2 < tol2;
      const isBg = Array.from({ length: ny }, () => new Array(nx).fill(false)), st = [];
      for (let x = 0; x < nx; x++) st.push([x, 0], [x, ny - 1]); for (let y = 0; y < ny; y++) st.push([0, y], [nx - 1, y]);
      while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x >= nx || y >= ny || isBg[y][x] || !near(g[y][x])) continue; isBg[y][x] = true; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); } return isBg; }
    function sampleGrid(im, cell, bgTol) {
      let cw, ch;
      if (cell) { cw = cell; ch = cell; }
      else if (Math.max(im.w, im.h) <= 256) { cw = 1; ch = 1; } // файл в родном разрешении — берём 1:1, холст = размер картинки
      else { cw = detectPeriod(edgeEnergy(im, 0)); ch = detectPeriod(edgeEnergy(im, 1));
        // поиск периода имеет смысл только для скриншотов пиксель-арта; если сетка вышла
        // слишком грубой — это обычное фото, целимся в ~64 клетки по большой стороне
        if (Math.max(im.w / cw, im.h / ch) < 32) { cw = ch = Math.max(im.w, im.h) / 64; } }
      const nx = Math.max(1, Math.round(im.w / cw)), ny = Math.max(1, Math.round(im.h / ch)), full = [];
      for (let j = 0; j < ny; j++) { const row = []; for (let i = 0; i < nx; i++) row.push(cellColor(im, i * im.w / nx, j * im.h / ny, (i + 1) * im.w / nx, (j + 1) * im.h / ny)); full.push(row); }
      const isBg = floodBackground(full, nx, ny, bgTol), grid = [], samples = [];
      for (let j = 0; j < ny; j++) { const row = []; for (let i = 0; i < nx; i++) { if (isBg[j][i]) row.push(null); else { row.push(full[j][i]); samples.push(full[j][i]); } } grid.push(row); } return { grid, samples, nx, ny }; }
    function medianCut(cols, n) { let bx = [cols.slice()]; const bnd = (b) => { const mn = [255, 255, 255], mx = [0, 0, 0]; for (const c of b) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], c[k]); mx[k] = Math.max(mx[k], c[k]); } return [mn, mx]; };
      while (bx.length < n) { let bi = -1, bv = -1; bx.forEach((b, i) => { if (b.length < 2) return; const [mn, mx] = bnd(b), v = (mx[0] - mn[0]) + (mx[1] - mn[1]) + (mx[2] - mn[2]); if (v > bv) { bv = v; bi = i; } }); if (bi < 0) break;
        const b = bx[bi], [mn, mx] = bnd(b); let ch = 0; if (mx[1] - mn[1] > mx[ch] - mn[ch]) ch = 1; if (mx[2] - mn[2] > mx[ch] - mn[ch]) ch = 2; b.sort((p, q) => p[ch] - q[ch]); const mid = b.length >> 1; bx.splice(bi, 1, b.slice(0, mid), b.slice(mid)); }
      const avg = bx.map((b) => { const s = [0, 0, 0]; for (const c of b) for (let k = 0; k < 3; k++) s[k] += c[k]; return s.map((v) => Math.round(v / b.length)); });
      const seen = new Set(), out = []; // убираем одинаковые цвета (две коробки могли дать тот же средний)
      for (const c of avg) { const k = c.join(','); if (!seen.has(k)) { seen.add(k); out.push(c); } }
      return out; }
    const nearest = (c, pal) => { let best = pal[0], bd = Infinity; for (const p of pal) { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (d < bd) { bd = d; best = p; } } return best; };
    function despeckle(g, nx, ny) { const out = g.map((r) => r.slice()), n8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { let solid = 0; const freq = new Map();
        for (const [dx, dy] of n8) { const x2 = x + dx, y2 = y + dy; if (x2 < 0 || y2 < 0 || x2 >= nx || y2 >= ny) continue; const v = g[y2][x2]; if (v) { solid++; const k = v.join(); freq.set(k, (freq.get(k) || 0) + 1); } }
        if (g[y][x] && solid <= 1) { out[y][x] = null; continue; }
        if (!g[y][x] && solid >= 7) { let bk = null, bn = 0; for (const [k, v] of freq) if (v > bn) { bn = v; bk = k; } if (bk) out[y][x] = bk.split(',').map(Number); } }
      return out; }
    function symmetrizeV(g, nx, ny) { const eq = (a, b) => (!a && !b) || (a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]);
      let sx = 0, n = 0; for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) if (g[y][x]) { sx += x; n++; }
      const c0 = n ? sx / n : nx / 2; let twoC = Math.round(c0 * 2), best = -1;
      for (let t = Math.round((c0 - 8) * 2); t <= Math.round((c0 + 8) * 2); t++) { let m = 0, tot = 0; for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { const xm = t - x; if (xm <= x || xm < 0 || xm >= nx) continue; tot++; if (eq(g[y][x], g[y][xm])) m++; } if (tot && m / tot > best) { best = m / tot; twoC = t; } }
      let left = 0, right = 0; for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) if (g[y][x]) { if (2 * x < twoC) left++; else if (2 * x > twoC) right++; }
      const keepLeft = left >= right, out = g.map((r) => r.slice());
      for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { if (keepLeft ? 2 * x > twoC : 2 * x < twoC) continue; const xm = twoC - x; if (xm >= 0 && xm < nx) out[y][xm] = g[y][x] ? g[y][x].slice() : null; }
      return out; }
    function cropEmpty(g) { if (!g.some((r) => r.some((c) => c))) return g;
      let y0 = 0, y1 = g.length - 1, x0 = 0, x1 = g[0].length - 1;
      const rowEmpty = (y) => g[y].every((c) => !c), colEmpty = (x) => g.every((r) => !r[x]);
      while (y0 < y1 && rowEmpty(y0)) y0++; while (y1 > y0 && rowEmpty(y1)) y1--;
      while (x0 < x1 && colEmpty(x0)) x0++; while (x1 > x0 && colEmpty(x1)) x1--;
      return g.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1)); }
    function paletteFromGrid(g) { const m = new Map();
      for (const row of g) for (const c of row) { if (!c) continue;
        const k = c[0] + ',' + c[1] + ',' + c[2]; // только RGB: полупрозрачные варианты того же цвета не плодят дубликаты
        const e = m.get(k); if (e) e.n++; else m.set(k, { c: [c[0], c[1], c[2]], n: 1 }); }
      return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 32).map((e) => e.c); }
    function dedupePal(arr) { const seen = new Set(), out = [];
      for (const c of arr || []) { if (!c) continue; const k = c[0] + ',' + c[1] + ',' + c[2];
        if (!seen.has(k)) { seen.add(k); out.push([c[0], c[1], c[2]]); } }
      return out.length ? out : [[12, 12, 16]]; }

    // ---- послойный рендер: каждый слой кешируется в canvas W×H ----
