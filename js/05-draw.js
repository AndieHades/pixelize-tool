    const inSel = (x, y) => !sel || (x >= sel.x0 && x <= sel.x1 && y >= sel.y0 && y <= sel.y1 && (!selMask || selMask.has(x + ',' + y)));
    const symA = () => sym && !layers[cur].symLock;   // симметрия лево-право активна на текущем слое?
    const symHA = () => symH && !layers[cur].symLock; // верх-низ
    function setCell(x, y, c) {
      if (x < 0 || y < 0 || x >= W || y >= H || !inSel(x, y)) return; // выделение работает как маска
      const g = G(); g[y][x] = c ? c.slice() : null;
      const mx = W - 1 - x, my = H - 1 - y, sa = symA(), sha = symHA();
      if (sa && mx !== x && inSel(mx, y)) g[y][mx] = c ? c.slice() : null;
      if (sha && my !== y && inSel(x, my)) g[my][x] = c ? c.slice() : null;
      if (sa && sha && mx !== x && my !== y && inSel(mx, my)) g[my][mx] = c ? c.slice() : null;
      markDirty(cur);
    }
    function pickAt(gx, gy) { if (gx < 0 || gy < 0 || gx >= W || gy >= H) return;
      const c = compositeAt(gx, gy); if (!c) return;
      active = c.slice(); $('picker').value = '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
      refreshActive(); buildPalette(); toast('Цвет подобран'); }
    function ppVisit(x, y) { // пиксель-перфект: при Г-образном уголке убираем средний пиксель
      if (!ppOn || !stroke) return;
      if (x < 0 || y < 0 || x >= W || y >= H || !inSel(x, y)) return;
      const last = ppPath[ppPath.length - 1];
      if (last && last[0] === x && last[1] === y) return;
      const g = G(), k = y * W + x;
      if (!ppOrig.has(k)) ppOrig.set(k, g[y][x] ? g[y][x].slice() : null);
      const keep = (xx, yy) => { const kk = yy * W + xx; if (!ppOrig.has(kk)) ppOrig.set(kk, g[yy][xx] ? g[yy][xx].slice() : null); };
      if (symA()) keep(W - 1 - x, y);
      if (symHA()) keep(x, H - 1 - y);
      if (symA() && symHA()) keep(W - 1 - x, H - 1 - y);
      ppPath.push([x, y]);
      const n = ppPath.length;
      if (n < 3) return;
      const A = ppPath[n - 3], B = ppPath[n - 2], C = ppPath[n - 1];
      const o1 = Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) === 1, o2 = Math.abs(B[0] - C[0]) + Math.abs(B[1] - C[1]) === 1;
      if (o1 && o2 && A[0] !== C[0] && A[1] !== C[1]) {
        const undoAt = (xx, yy) => { const mv = ppOrig.get(yy * W + xx); g[yy][xx] = mv ? mv.slice() : null; };
        undoAt(B[0], B[1]);
        if (symA()) undoAt(W - 1 - B[0], B[1]);
        if (symHA()) undoAt(B[0], H - 1 - B[1]);
        if (symA() && symHA()) undoAt(W - 1 - B[0], H - 1 - B[1]);
        markDirty(cur); ppPath.splice(n - 2, 1);
      }
    }
    function paintCell(x, y, erase) { // кисть с прозрачностью и альфа-смешиванием
      if (x < 0 || y < 0 || x >= W || y >= H || !inSel(x, y)) return;
      const br = brushes[erase ? 'eraser' : 'pencil'], o = br.op, g = G(), key = y * W + x;
      if (o < 1) { if (strokeSeen.has(key)) return; strokeSeen.add(key); }
      const dst = g[y][x];
      if (erase) {
        if (o >= 1) g[y][x] = null;
        else if (dst) { const a1 = ((dst.length > 3 ? dst[3] : 255) / 255) * (1 - o);
          g[y][x] = a1 < .04 ? null : [dst[0], dst[1], dst[2], Math.round(a1 * 255)]; }
      } else {
        const s = active;
        if (o >= 1) g[y][x] = [s[0], s[1], s[2], 255];
        else if (!dst) g[y][x] = [s[0], s[1], s[2], Math.round(o * 255)];
        else { const a0 = (dst.length > 3 ? dst[3] : 255) / 255, oa = o + a0 * (1 - o);
          const f = (sc, dc) => Math.round((sc * o + dc * a0 * (1 - o)) / oa);
          g[y][x] = [f(s[0], dst[0]), f(s[1], dst[1]), f(s[2], dst[2]), Math.round(oa * 255)]; }
      }
      markDirty(cur);
    }
    function brushStamp(x, y, erase) {
      const s = brushes[erase ? 'eraser' : 'pencil'].size, off = s >> 1;
      if (s === 1) ppVisit(x, y);
      const sa = symA(), sha = symHA();
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) { const xx = x - off + dx, yy = y - off + dy;
        paintCell(xx, yy, erase);
        const mx = W - 1 - xx, my = H - 1 - yy;
        if (sa && mx !== xx) paintCell(mx, yy, erase);
        if (sha && my !== yy) paintCell(xx, my, erase);
        if (sa && sha && mx !== xx && my !== yy) paintCell(mx, my, erase); }
    }
    function stamp(x, y) {
      if (tool === 'select' || tool === 'move') return;
      if (tool === 'pencil' || tool === 'line') brushStamp(x, y, false);
      else if (tool === 'eraser') brushStamp(x, y, true);
      else if (tool === 'pick') { pickAt(x, y); setTool('pencil'); }
      else if (tool === 'fill') flood(x, y);
    }
    function commitLine() { const lp = linePrev; linePrev = null; lineStart = null;
      if (!lp) { render(); return; }
      snapshot();
      if (tool === 'rect') rectEdges(lp[0], lp[1], lp[2], lp[3], stamp); // углы целы: pp молчит при stroke=false
      else line(lp[0], lp[1], lp[2], lp[3]);
      render(); afterStroke(); }
    function rectEdges(x0, y0, x1, y1, cb) { const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1);
      for (let x = ax; x <= bx; x++) { cb(x, ay); if (by !== ay) cb(x, by); }
      for (let y = ay + 1; y < by; y++) { cb(ax, y); if (bx !== ax) cb(bx, y); } }
    function smoothPt(e) { // стабилизация: сглаживаем точку ввода
      if (!stabOn) return [e.clientX, e.clientY];
      if (!stabPt) { stabPt = { x: e.clientX, y: e.clientY }; return [e.clientX, e.clientY]; }
      stabPt.x += (e.clientX - stabPt.x) * .35; stabPt.y += (e.clientY - stabPt.y) * .35;
      return [stabPt.x, stabPt.y]; }
    function bres(x0, y0, x1, y1, cb) { // Брезенхем — без дырок на быстром штрихе
      let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
      for (;;) { cb(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    }
    const line = (x0, y0, x1, y1) => bres(x0, y0, x1, y1, stamp);
    function flood(x, y) {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const g = G(), target = g[y][x], to = active;
      if (eqc(target, to)) return;
      const st = [[x, y]];
      while (st.length) { const [cx, cy] = st.pop(); if (cx < 0 || cy < 0 || cx >= W || cy >= H || !inSel(cx, cy)) continue;
        const c = g[cy][cx]; if (!(eqc(c, target) || (!c && !target))) continue;
        setCell(cx, cy, to); st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); }
    }
    function expandCanvas(pl, pt, pr, pb) { // добавить пустые ряды/колонки по краям (во все слои)
      if (!(pl || pt || pr || pb)) return;
      W += pl + pr; H += pt + pb;
      for (const L of layers) { const g = L.grid, out = [];
        for (let y = 0; y < H; y++) { const row = new Array(W).fill(null);
          const sy = y - pt; if (sy >= 0 && sy < g.length) for (let x = 0; x < g[sy].length; x++) row[x + pl] = g[sy][x];
          out.push(row); }
        const ne = new Map(); // запасные пиксели за краем: сдвигаем и впитываем попавшие в холст
        for (const [k, c] of L.ext) { const ci = k.indexOf(','), ax = +k.slice(0, ci) + pl, ay = +k.slice(ci + 1) + pt;
          if (ax >= 0 && ay >= 0 && ax < W && ay < H) out[ay][ax] = c; else ne.set(ax + ',' + ay, c); }
        L.grid = out; L.ext = ne; }
      view.ox -= pl * view.zoom; view.oy -= pt * view.zoom; // рисунок визуально остаётся на месте
      sel = null; syncSelbar(); dirtyAll(); }
    function openOutlinePop() { $('brushpop').classList.remove('on'); $('dspop').classList.remove('on'); dsPreview = null;
      const v = '#' + active.map((q) => q.toString(16).padStart(2, '0')).join('');
      $('out-col').value = v; $('out-colsw').style.background = v;
      $('out-size').value = outSet.size; $('out-sizev').textContent = outSet.size;
      $('out-op').value = Math.round(outSet.op * 100); $('out-opv').textContent = Math.round(outSet.op * 100) + '%';
      const on = $('outpop').classList.toggle('on');
      if (on) computeOutlinePreview(); else outPreview = null;
      render(); }
    function computeOutlinePreview() { // те же кольца, что и при применении, но без мутации слоя
      const size = +$('out-size').value, g = G();
      const filled = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => !!g[y][x]));
      const n8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], pre = [];
      for (let pass = 0; pass < size; pass++) { const ring = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (filled[y][x]) continue;
          let near = false;
          for (const [dx, dy] of n8) { const x2 = x + dx, y2 = y + dy; if (x2 < 0 || y2 < 0 || x2 >= W || y2 >= H) continue; if (filled[y2][x2]) { near = true; break; } }
          if (near) ring.push([x, y]); }
        for (const [x, y] of ring) { filled[y][x] = true; pre.push([x, y]); } }
      outPreview = pre; }
    function outlineLayer() { // обводка: толщина, свой цвет, прозрачность
      outSet.size = +$('out-size').value; outSet.op = +$('out-op').value / 100;
      const col = hexToRgb($('out-col').value), a = Math.round(outSet.op * 255);
      snapshot(); let added = 0;
      const n8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (let pass = 0; pass < outSet.size; pass++) {
        let g = G(), pl = 0, pt = 0, pr = 0, pb = 0; // рисунок у края — раздвигаем холст под обводку
        for (let x = 0; x < W; x++) { if (g[0][x]) pt = 1; if (g[H - 1][x]) pb = 1; }
        for (let y = 0; y < H; y++) { if (g[y][0]) pl = 1; if (g[y][W - 1]) pr = 1; }
        expandCanvas(pl, pt, pr, pb); g = G();
        const out = cloneGrid(g);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (g[y][x]) continue;
          let near = false;
          for (const [dx, dy] of n8) { const x2 = x + dx, y2 = y + dy; if (x2 < 0 || y2 < 0 || x2 >= W || y2 >= H) continue; if (g[y2][x2]) { near = true; break; } }
          if (near) { out[y][x] = [col[0], col[1], col[2], a]; added++; } }
        layers[cur].grid = out; markDirty(cur);
      }
      if (!added) { const s = undoStack.pop(); if (s) restore(s); toast('На слое нечего обводить'); return; }
      outPreview = null; $('outpop').classList.remove('on'); render(); layList(); toast('Обводка нанесена');
    }
    let cropMode = null, cropDrag = null; // интерактивный кроп: рамка с маркерами
    function applyCropRect(x0, y0, x1, y1) { // рект может выходить за холст — тогда холст расширяется
      snapshot();
      const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
      for (const L of layers) { const ne = new Map();
        const out = Array.from({ length: nh }, () => new Array(nw).fill(null));
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = L.grid[y][x]; if (!c) continue;
          const nx2 = x - x0, ny2 = y - y0;
          if (nx2 >= 0 && ny2 >= 0 && nx2 < nw && ny2 < nh) out[ny2][nx2] = c;
          else ne.set(nx2 + ',' + ny2, c); } // отрезанное не теряем
        for (const [k, c] of L.ext) { const ci = k.indexOf(','), ax = +k.slice(0, ci) - x0, ay = +k.slice(ci + 1) - y0;
          if (ax >= 0 && ay >= 0 && ax < nw && ay < nh) { if (!out[ay][ax]) out[ay][ax] = c; }
          else ne.set(ax + ',' + ay, c); }
        L.grid = out; L.ext = ne; }
      W = nw; H = nh; sel = null; syncSelbar(); dirtyAll(); layList(); fitView(); toast(`Холст: ${W}×${H}`);
    }
    function dropShadow(L, dx, dy, col, op) { // силуэт слоя отдельным слоем под ним, со смещением
      let any = false, minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.grid[y][x]) { any = true;
        const sx = x + dx, sy = y + dy; if (sx < minx) minx = sx; if (sy < miny) miny = sy; if (sx > maxx) maxx = sx; if (sy > maxy) maxy = sy; }
      if (!any) { toast('Слой пуст'); return; }
      if (layers.length >= 8) { toast('Максимум 8 слоёв — удали лишние'); return; }
      snapshot();
      const pl = Math.max(0, -minx), pt = Math.max(0, -miny), pr = Math.max(0, maxx - (W - 1)), pb = Math.max(0, maxy - (H - 1));
      if (pl || pt || pr || pb) expandCanvas(pl, pt, pr, pb); // не лезет — раздвигаем холст, как обводка
      const a = Math.round(op * 255), sh = newLayer('Тень'); sh.fid = L.fid;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.grid[y][x]) { // силуэт берём из уже расширенного слоя
        const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) sh.grid[ny][nx] = [col[0], col[1], col[2], a]; }
      const li = layers.indexOf(L); layers.splice(li, 0, sh); cur = li + 1; // тень под исходным слоем
      marked.clear(); dirtyAll(); layList(); render(); toast('Тень создана');
    }
    function trimCanvas() { // обрезать пустые поля впритык к рисунку (по всем слоям)
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (const L of layers) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.grid[y][x]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { toast('Холст пуст'); return; }
      if (x0 === 0 && y0 === 0 && x1 === W - 1 && y1 === H - 1) { toast('Обрезать нечего'); return; }
      applyCropRect(x0, y0, x1, y1); }
    let cropSym = false;
    function toggleCrop() { if (cropMode) { cancelCrop(); return; }
      const b = sel ? { x0: sel.x0, y0: sel.y0, x1: sel.x1, y1: sel.y1 } : { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
      cropMode = { ...b, idx: 0, idy: 0, b }; // b — стартовая рамка для подсчёта дельт по граням
      deselect(); $('crop').classList.add('on'); $('cropbar').classList.add('on'); render();
      toast('Грани наружу — расширить · внутри — сдвиг рисунка · ✓/Enter'); }
    function cancelCrop() { cropMode = null; cropDrag = null; cv.style.cursor = '';
      $('crop').classList.remove('on'); $('cropbar').classList.remove('on'); render(); }
    function applyCrop() { if (!cropMode) return; const c = cropMode; cancelCrop();
      if (c.x0 === 0 && c.y0 === 0 && c.x1 === W - 1 && c.y1 === H - 1 && !c.idx && !c.idy) { toast('Размер не менялся'); return; }
      applyCropRect(c.x0 - c.idx, c.y0 - c.idy, c.x1 - c.idx, c.y1 - c.idy); } // сдвиг рисунка = рамка наоборот
    function cropZone(e) { const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const z = view.zoom, lx = view.ox + cropMode.x0 * z, rx = view.ox + (cropMode.x1 + 1) * z,
        ty = view.oy + cropMode.y0 * z, by = view.oy + (cropMode.y1 + 1) * z, tol = 24;
      const nl = Math.abs(px - lx) < tol, nr = Math.abs(px - rx) < tol, nt = Math.abs(py - ty) < tol, nb = Math.abs(py - by) < tol;
      const inX = px > lx - tol && px < rx + tol, inY = py > ty - tol && py < by + tol;
      return { l: nl && inY, r: nr && inY, t: nt && inX, b: nb && inX, inside: px > lx && px < rx && py > ty && py < by }; }
    function cropCursor(zn) { const h = zn.l || zn.r, v = zn.t || zn.b;
      if (h && v) return ((zn.l && zn.t) || (zn.r && zn.b)) ? 'nwse-resize' : 'nesw-resize';
      if (h) return 'ew-resize'; if (v) return 'ns-resize'; return zn.inside ? 'move' : ''; }
    function cropDown(e) { const zn = cropZone(e);
      if (zn.l || zn.r || zn.t || zn.b) cropDrag = { l: zn.l, r: zn.r, t: zn.t, b: zn.b,
        cx: (cropMode.x0 + cropMode.x1) / 2, cy: (cropMode.y0 + cropMode.y1) / 2 };
      else if (zn.inside) { const r = cv.getBoundingClientRect(); // внутри рамки — двигаем сам рисунок
        cropDrag = { img: true, gx: (e.clientX - r.left - view.ox) / view.zoom, gy: (e.clientY - r.top - view.oy) / view.zoom }; }
      else cropDrag = null; }
    function cropMovePt(e) { if (!cropDrag || !cropMode) return; const r = cv.getBoundingClientRect(), z = view.zoom;
      const MAXC = 640, c = cropMode;
      const fx = (e.clientX - r.left - view.ox) / z, fy = (e.clientY - r.top - view.oy) / z;
      if (cropDrag.img) { const dx = Math.round(fx - cropDrag.gx), dy = Math.round(fy - cropDrag.gy);
        if (dx || dy) { c.idx += dx; c.idy += dy; cropDrag.gx += dx; cropDrag.gy += dy; } }
      else { const symm = cropSym || e.shiftKey; // от центра — симметрично
        if (cropDrag.l) { c.x0 = Math.min(c.x1, Math.round(fx)); if (symm) c.x1 = Math.round(2 * cropDrag.cx - c.x0); }
        if (cropDrag.r) { c.x1 = Math.max(c.x0, Math.round(fx) - 1); if (symm) c.x0 = Math.round(2 * cropDrag.cx - c.x1); }
        if (cropDrag.t) { c.y0 = Math.min(c.y1, Math.round(fy)); if (symm) c.y1 = Math.round(2 * cropDrag.cy - c.y0); }
        if (cropDrag.b) { c.y1 = Math.max(c.y0, Math.round(fy) - 1); if (symm) c.y0 = Math.round(2 * cropDrag.cy - c.y1); }
        if (c.x1 - c.x0 + 1 > MAXC) { if (cropDrag.l) c.x0 = c.x1 - MAXC + 1; else c.x1 = c.x0 + MAXC - 1; }
        if (c.y1 - c.y0 + 1 > MAXC) { if (cropDrag.t) c.y0 = c.y1 - MAXC + 1; else c.y1 = c.y0 + MAXC - 1; } }
      render(); }
    function rotateCanvas() { // поворот всего холста на 90° по часовой
      snapshot();
      for (const L of layers) { const g = L.grid, out = [];
        for (let x = 0; x < W; x++) { const row = []; for (let y = H - 1; y >= 0; y--) row.push(g[y][x]); out.push(row); } L.grid = out;
        const ne = new Map();
        for (const [k, c] of L.ext) { const ci = k.indexOf(','), ax = +k.slice(0, ci), ay = +k.slice(ci + 1); ne.set((H - 1 - ay) + ',' + ax, c); }
        L.ext = ne; }
      const t = W; W = H; H = t; sel = null; syncSelbar(); dirtyAll(); layList(); fitView(); toast('Поворот 90°');
    }
    function toMono(L) { // оттенки серого по яркости (Rec. 601), альфа сохраняется
      const lum = (c) => Math.round(c[0] * .299 + c[1] * .587 + c[2] * .114);
      const g = L.grid;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = g[y][x]; if (!c) continue;
        const v = lum(c); g[y][x] = c.length > 3 ? [v, v, v, c[3]] : [v, v, v]; }
      for (const [k, c] of L.ext) { const v = lum(c); L.ext.set(k, c.length > 3 ? [v, v, v, c[3]] : [v, v, v]); } }
    function monoLayer(L) { snapshot(); toMono(L); dirtyAll(); layList(); render(); toast('Слой в монохроме'); }
    function symmetrizeLayer(L) { // сделать слой симметричным: зеркалим первую половину на вторую
      const v = sym || (!sym && !symH), h = symH; snapshot(); const g = L.grid;
      if (v) for (let y = 0; y < H; y++) for (let x = 0; x < (W >> 1); x++) { const mx = W - 1 - x; g[y][mx] = g[y][x] ? g[y][x].slice() : null; }
      if (h) for (let y = 0; y < (H >> 1); y++) for (let x = 0; x < W; x++) { const my = H - 1 - y; g[my][x] = g[y][x] ? g[y][x].slice() : null; }
      const i = layers.indexOf(L); if (i >= 0) markDirty(i); render(); layList();
      toast('Слой симметрирован' + (v && h ? ' (обе оси)' : v ? ' (лево→право)' : ' (верх→низ)')); }
    function monoAll() { snapshot(); for (const L of layers) toMono(L); dirtyAll(); layList(); render(); toast('Изображение в монохроме'); }
    // ---- яркость/контраст с живым предпросмотром ----
    let bcBackup = null; // [{L, grid, ext}] — оригиналы на время подгонки
    function bcAdjust(c, bri, f) { const ap = (v) => Math.max(0, Math.min(255, Math.round(f * (v - 128) + 128 + bri)));
      return c.length > 3 ? [ap(c[0]), ap(c[1]), ap(c[2]), c[3]] : [ap(c[0]), ap(c[1]), ap(c[2])]; }
    function bcPreview() { if (!bcBackup) return;
      const bri = +$('bc-bri').value * 1.27, cc = +$('bc-con').value * 1.27;
      const f = (259 * (cc + 255)) / (255 * (259 - cc));
      for (const b of bcBackup) { const L = b.L;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = b.grid[y][x];
          L.grid[y][x] = c ? bcAdjust(c, bri, f) : null; }
        L.ext = new Map(); for (const [k, c] of b.ext) L.ext.set(k, bcAdjust(c, bri, f)); }
      dirtyAll(); render(); }
    function bcRestore() { if (!bcBackup) return;
      for (const b of bcBackup) { b.L.grid = cloneGrid(b.grid); b.L.ext = new Map(b.ext); }
      dirtyAll(); render(); }
    function openBcPop(targets, title) { bcCancel(); $('brushpop').classList.remove('on'); $('outpop').classList.remove('on');
      bcBackup = targets.map((L) => ({ L, grid: cloneGrid(L.grid), ext: new Map(L.ext) }));
      $('bc-title').textContent = title;
      $('bc-bri').value = 0; $('bc-briv').textContent = '0';
      $('bc-con').value = 0; $('bc-conv').textContent = '0';
      $('bcpop').classList.add('on'); }
    function bcApply() { if (!bcBackup) return;
      bcRestore(); snapshot(); // в историю уходит оригинал
      const bk = bcBackup; bcBackup = bk; bcPreview(); // финальный прогон по тем же ползункам
      bcBackup = null; $('bcpop').classList.remove('on'); layList(); render(); toast('Применено'); }
    function bcCancel() { if (bcBackup) { bcRestore(); bcBackup = null; } $('bcpop').classList.remove('on'); }
    function flipLayer(horiz) { // отражение активного слоя
      snapshot(); const L = layers[cur], g = L.grid;
      if (horiz) for (const r of g) r.reverse(); else g.reverse();
      const ne = new Map();
      for (const [k, c] of L.ext) { const ci = k.indexOf(','), ax = +k.slice(0, ci), ay = +k.slice(ci + 1);
        ne.set(horiz ? (W - 1 - ax) + ',' + ay : ax + ',' + (H - 1 - ay), c); }
      L.ext = ne;
      markDirty(cur); render(); afterStroke(); toast(horiz ? 'Отражено по горизонтали' : 'Отражено по вертикали');
    }
    function clearLayer() { const L = layers[cur]; if (!L.grid.some((r) => r.some((c) => c)) && !L.ext.size) return false;
      snapshot(); L.grid = blank(W, H); L.ext = new Map(); markDirty(cur); render(); afterStroke(); return true; }

    // ---- выделение прямоугольником: рамка, перенос изнутри, маска для рисования ----
