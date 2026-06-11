    // ---- левая полоса кисти (как в Procreate): размер сверху, пипетка по центру, прозрачность снизу ----
    const BP_SMAX = 8;
    const curBrush = () => (tool === 'eraser' ? 'eraser' : 'pencil'); // полоса правит активную кисть/ластик
    function vslPos(fillId, knobId, frac) { const p = Math.max(0, Math.min(1, frac)) * 100;
      $(fillId).style.height = p + '%'; $(knobId).style.bottom = p + '%'; }
    function syncBars() { const b = brushes[curBrush()];
      vslPos('bp-size-fill', 'bp-size-knob', (b.size - 1) / (BP_SMAX - 1));
      vslPos('bp-op-fill', 'bp-op-knob', b.op); }
    let bbValT = null;
    function showBbVal(slId, txt) { const v = $('bb-val'), r = $(slId).getBoundingClientRect();
      v.textContent = txt; v.style.left = (r.right + 8) + 'px'; v.style.top = r.top + r.height / 2 + 'px'; v.classList.add('on');
      clearTimeout(bbValT); bbValT = setTimeout(() => v.classList.remove('on'), 700); }
    function vslDrag(slId, onFrac) { const sl = $(slId); let on = false;
      const set = (e) => { const r = sl.getBoundingClientRect(); onFrac(Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height))); };
      sl.addEventListener('pointerdown', (e) => { on = true; sl.setPointerCapture(e.pointerId); set(e); });
      sl.addEventListener('pointermove', (e) => { if (on) set(e); });
      const end = () => { on = false; }; sl.addEventListener('pointerup', end); sl.addEventListener('pointercancel', end); }
    vslDrag('bp-size-sl', (f) => { brushes[curBrush()].size = Math.max(1, Math.min(BP_SMAX, Math.round(1 + f * (BP_SMAX - 1))));
      syncBars(); showBbVal('bp-size-sl', brushes[curBrush()].size + ' px'); render(); });
    vslDrag('bp-op-sl', (f) => { brushes[curBrush()].op = Math.max(0, Math.min(1, f));
      syncBars(); showBbVal('bp-op-sl', Math.round(brushes[curBrush()].op * 100) + '%'); });
    $('bb-pick').onclick = () => setTool('pick');
    function makeDraggable(el) { let d = null; // окошко настроек можно отодвинуть и поставить рядом
      el.addEventListener('pointerdown', (e) => { if (e.target.closest('input, button, .vsl')) return;
        el.setPointerCapture(e.pointerId); const r = el.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top }; });
      el.addEventListener('pointermove', (e) => { if (!d) return;
        el.style.left = Math.max(4, Math.min(e.clientX - d.dx, innerWidth - 90)) + 'px';
        el.style.top = Math.max(4, Math.min(e.clientY - d.dy, innerHeight - 60)) + 'px';
        el.style.transform = 'none'; el.style.right = 'auto'; el.style.bottom = 'auto'; });
      const dEnd2 = () => { d = null; };
      el.addEventListener('pointerup', dEnd2); el.addEventListener('pointercancel', dEnd2); }
    makeDraggable($('outpop')); makeDraggable($('dspop')); makeDraggable($('glowpop'));
    // ---- трансформация слоя: рамка, угловое вращение, боковое растяжение ----
    let rotRAF = 0;
    const ROT_MIN_SCALE = .15;
    function rotCenter(m) { return { x: m.b.x0 + m.b.w / 2 + m.tx, y: m.b.y0 + m.b.h / 2 + m.ty }; }
    function rotLocalToWorld(m, lx, ly) {
      const c = rotCenter(m), ca = Math.cos(m.ang), sa = Math.sin(m.ang);
      const x = (lx - m.b.w / 2) * m.sx, y = (ly - m.b.h / 2) * m.sy;
      return { x: c.x + x * ca - y * sa, y: c.y + x * sa + y * ca };
    }
    function rotWorldToLocal(m, x, y) {
      const c = rotCenter(m), ca = Math.cos(m.ang), sa = Math.sin(m.ang);
      const dx = x - c.x, dy = y - c.y;
      return { x: (dx * ca + dy * sa) / m.sx + m.b.w / 2, y: (-dx * sa + dy * ca) / m.sy + m.b.h / 2 };
    }
    function rotFrame(m = rotMode) {
      if (!m) return null;
      const p = [rotLocalToWorld(m, 0, 0), rotLocalToWorld(m, m.b.w, 0), rotLocalToWorld(m, m.b.w, m.b.h), rotLocalToWorld(m, 0, m.b.h)];
      return { p, sides: [
        { kind: 'scale-y', sign: -1, p: { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 } },
        { kind: 'scale-x', sign: 1, p: { x: (p[1].x + p[2].x) / 2, y: (p[1].y + p[2].y) / 2 } },
        { kind: 'scale-y', sign: 1, p: { x: (p[2].x + p[3].x) / 2, y: (p[2].y + p[3].y) / 2 } },
        { kind: 'scale-x', sign: -1, p: { x: (p[3].x + p[0].x) / 2, y: (p[3].y + p[0].y) / 2 } }
      ] }; }
    function rotScreen(p) { return { x: view.ox + p.x * view.zoom, y: view.oy + p.y * view.zoom }; }
    function rotPointer(e) { const r = cv.getBoundingClientRect();
      return { sx: e.clientX - r.left, sy: e.clientY - r.top, x: (e.clientX - r.left - view.ox) / view.zoom, y: (e.clientY - r.top - view.oy) / view.zoom }; }
    function rotBuildCells(m) {
      const f = rotFrame(m), xs = f.p.map((p) => p.x), ys = f.p.map((p) => p.y);
      const x0 = Math.floor(Math.min(...xs)) - 1, x1 = Math.ceil(Math.max(...xs)) + 1;
      const y0 = Math.floor(Math.min(...ys)) - 1, y1 = Math.ceil(Math.max(...ys)) + 1;
      const cells = []; let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const q = rotWorldToLocal(m, x + .5, y + .5), sx = Math.floor(q.x), sy = Math.floor(q.y);
        if (sx < 0 || sy < 0 || sx >= m.b.w || sy >= m.b.h) continue;
        const c = m.src[sy][sx]; if (!c) continue;
        cells.push([x, y, c]); if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
      }
      return cells.length ? { cells, minx, miny, maxx, maxy } : null;
    }
    function rotRebuild() { if (!rotMode) return;
      const res = rotBuildCells(rotMode);
      if (!res) { rotPrev = { idx: rotMode.idx, canvas: null }; render(); return; }
      const c = document.createElement('canvas'), w2 = res.maxx - res.minx + 1, h2 = res.maxy - res.miny + 1;
      c.width = w2; c.height = h2; const x2 = c.getContext('2d'), id = x2.createImageData(w2, h2);
      for (const [x, y, cc] of res.cells) { const o = ((y - res.miny) * w2 + (x - res.minx)) * 4;
        id.data[o] = cc[0]; id.data[o + 1] = cc[1]; id.data[o + 2] = cc[2]; id.data[o + 3] = cc.length > 3 ? cc[3] : 255; }
      x2.putImageData(id, 0, 0); rotPrev = { idx: rotMode.idx, canvas: c, px: res.minx, py: res.miny, ow: w2, oh: h2 }; render(); }
    function rotRebuildSoon() { cancelAnimationFrame(rotRAF); rotRAF = requestAnimationFrame(rotRebuild); }
    function enterRotMode(L) { const i = layers.indexOf(L); if (i < 0) return; const b0 = layerBounds(L);
      if (!b0) { toast('Слой пуст'); return; }
      cur = i; $('outpop').classList.remove('on'); $('dspop').classList.remove('on'); $('glowpop').classList.remove('on');
      const src = []; for (let y = b0.miny; y <= b0.maxy; y++) {
        const row = []; for (let x = b0.minx; x <= b0.maxx; x++) row.push(L.grid[y][x] ? L.grid[y][x].slice() : null); src.push(row); }
      rotMode = { idx: i, src, b: { x0: b0.minx, y0: b0.miny, w: b0.maxx - b0.minx + 1, h: b0.maxy - b0.miny + 1 },
        ang: 0, sx: 1, sy: 1, tx: 0, ty: 0, grab: null, changed: false };
      layList(); $('rotbar').classList.add('on'); rotRebuild();
      toast('Углы — поворот · стороны — растяжение · Enter/ПКМ — применить'); }
    function applyRotMode(m) {
      const res = rotBuildCells(m);
      if (!res) { toast('Трансформация пустая'); return false; }
      snapshot();
      const pl = Math.max(0, -res.minx), pt = Math.max(0, -res.miny);
      const pr = Math.max(0, res.maxx - (W - 1)), pb = Math.max(0, res.maxy - (H - 1));
      if (pl || pt || pr || pb) expandCanvas(pl, pt, pr, pb);
      const L = layers[m.idx]; if (!L) return false;
      const g = blank(W, H); for (const [x, y, c] of res.cells) {
        const nx = x + pl, ny = y + pt; if (nx >= 0 && ny >= 0 && nx < W && ny < H) g[ny][nx] = c.slice(); }
      L.grid = g; L.ext = new Map(); markDirty(m.idx); dirtyAll(); layList(); render(); return true;
    }
    function exitRotMode(apply) { if (!rotMode) return; const m = rotMode, changed = m.changed;
      rotMode = null; rotPrev = null; $('rotbar').classList.remove('on'); cv.style.cursor = '';
      if (apply && changed) { if (applyRotMode(m)) toast('Трансформация применена'); }
      else { render(); if (!apply && changed) toast('Трансформация отменена'); } }
    $('rot-ok').onclick = () => exitRotMode(true);
    $('rot-x').onclick = () => exitRotMode(false);
    function rotHit(e) {
      const m = rotMode, p = rotPointer(e), f = rotFrame(m), hit = 14;
      for (let i = 0; i < f.p.length; i++) { const s = rotScreen(f.p[i]); if (Math.hypot(p.sx - s.x, p.sy - s.y) <= hit) return { kind: 'rotate', corner: i }; }
      for (const side of f.sides) { const s = rotScreen(side.p); if (Math.hypot(p.sx - s.x, p.sy - s.y) <= hit) return side; }
      const q = rotWorldToLocal(m, p.x, p.y); if (q.x >= 0 && q.y >= 0 && q.x <= m.b.w && q.y <= m.b.h) return { kind: 'move' };
      return null;
    }
    function rotGrab(e) { const hit = rotHit(e); if (!hit) { rotMode.grab = null; return; }
      const p = rotPointer(e), c = rotCenter(rotMode);
      rotMode.grab = { ...hit, start: p, sx: rotMode.sx, sy: rotMode.sy, tx: rotMode.tx, ty: rotMode.ty,
        ang: rotMode.ang, cx: c.x, cy: c.y, a0: Math.atan2(p.y - c.y, p.x - c.x),
        w0: rotMode.b.w * rotMode.sx, h0: rotMode.b.h * rotMode.sy }; }
    function rotDrag(e) { const g = rotMode && rotMode.grab; if (!g) return; const p = rotPointer(e);
      if (g.kind === 'rotate') { let a = g.ang + Math.atan2(p.y - g.cy, p.x - g.cx) - g.a0;
        if (e.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12); rotMode.ang = a; }
      else if (g.kind === 'scale-x') { const ax = { x: Math.cos(g.ang), y: Math.sin(g.ang) };
        const d = ((p.x - g.start.x) * ax.x + (p.y - g.start.y) * ax.y) * g.sign;
        rotMode.sx = Math.max(ROT_MIN_SCALE, (g.w0 + d * 2) / rotMode.b.w); }
      else if (g.kind === 'scale-y') { const ay = { x: -Math.sin(g.ang), y: Math.cos(g.ang) };
        const d = ((p.x - g.start.x) * ay.x + (p.y - g.start.y) * ay.y) * g.sign;
        rotMode.sy = Math.max(ROT_MIN_SCALE, (g.h0 + d * 2) / rotMode.b.h); }
      else if (g.kind === 'move') { rotMode.tx = g.tx + p.x - g.start.x; rotMode.ty = g.ty + p.y - g.start.y; }
      rotMode.changed = true; rotRebuildSoon(); }
    function rotHover(e) { const h = rotHit(e); cv.style.cursor = !h ? '' : h.kind === 'move' ? 'move' : h.kind === 'rotate' ? 'grab' : h.kind === 'scale-x' ? 'ew-resize' : 'ns-resize'; }
    function drawTransformFrame() {
      if (!rotMode) return; const f = rotFrame(rotMode), pts = f.p.map(rotScreen);
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      const drawSquare = (p, s) => { ctx.fillStyle = '#0d0d10'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s); };
      for (const p of pts) { ctx.beginPath(); ctx.fillStyle = '#0d0d10'; ctx.strokeStyle = '#6fdb8b'; ctx.lineWidth = 2; ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      for (const s of f.sides) drawSquare(rotScreen(s.p), 9);
      ctx.restore();
    }
    let dsRef = null;
    function computeDsPreview() { if (!dsRef || !$('dspop').classList.contains('on')) { dsPreview = null; render(); return; }
      const dx = +$('ds-x').value, dy = +$('ds-y').value, pre = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dsRef.grid[y][x]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) pre.push([nx, ny]); }
      dsPreview = pre; render(); }
    function openDsPop(L) { dsRef = L; $('outpop').classList.remove('on'); $('glowpop').classList.remove('on'); outPreview = null; glowPreview = null;
      const on = $('dspop').classList.toggle('on'); if (on) computeDsPreview(); else { dsPreview = null; render(); } }
    $('ds-x').addEventListener('input', () => { $('ds-xv').textContent = $('ds-x').value; computeDsPreview(); });
    $('ds-y').addEventListener('input', () => { $('ds-yv').textContent = $('ds-y').value; computeDsPreview(); });
    $('ds-op').addEventListener('input', () => { $('ds-opv').textContent = $('ds-op').value + '%'; render(); });
    $('ds-col').addEventListener('input', () => { $('ds-colsw').style.background = $('ds-col').value; render(); });
    $('ds-apply').onclick = () => { $('dspop').classList.remove('on'); dsPreview = null;
      if (dsRef && layers.includes(dsRef)) dropShadow(dsRef, +$('ds-x').value, +$('ds-y').value, hexToRgb($('ds-col').value), +$('ds-op').value / 100); };
    // ---- свечение ----
    let glowRef = null, glowRAF = 0;
    function computeGlowPreview() { if (!glowRef || !$('glowpop').classList.contains('on')) { glowPreview = null; render(); return; }
      glowPreview = computeGlow(glowRef, +$('glow-range').value, +$('glow-int').value / 100); render(); }
    function glowSoon() { cancelAnimationFrame(glowRAF); glowRAF = requestAnimationFrame(computeGlowPreview); }
    function openGlowPop(L) { glowRef = L; const i = layers.indexOf(L); if (i >= 0) cur = i; layList();
      $('outpop').classList.remove('on'); $('dspop').classList.remove('on'); outPreview = null; dsPreview = null;
      const on = $('glowpop').classList.toggle('on'); if (on) computeGlowPreview(); else { glowPreview = null; render(); } }
    $('glow-range').addEventListener('input', () => { $('glow-rangev').textContent = $('glow-range').value; glowSoon(); });
    $('glow-int').addEventListener('input', () => { $('glow-intv').textContent = $('glow-int').value + '%'; glowSoon(); });
    $('glow-col').addEventListener('input', () => { $('glow-colsw').style.background = $('glow-col').value; render(); });
    $('glow-apply').onclick = () => { $('glowpop').classList.remove('on'); glowPreview = null;
      if (glowRef && layers.includes(glowRef)) glowLayer(glowRef, +$('glow-range').value, hexToRgb($('glow-col').value), +$('glow-int').value / 100); };
    $('t-pencil').onclick = () => setTool('pencil');
    $('t-eraser').onclick = () => setTool('eraser');
    $('t-line').onclick = () => setTool('line');
    $('t-rect').onclick = () => setTool('rect');
    $('t-pick').onclick = () => setTool('pick');
    $('t-fill').onclick = () => { if (sel) fillSelection(); else setTool('fill'); }; // с выделением — мгновенная заливка
    $('t-select').onclick = () => setTool('select');
    $('t-move').onclick = () => setTool('move');
    $('t-adjust').onclick = () => { if (tool === 'adjust') openAdjPop(); else setTool('adjust'); };
    function openAdjPop() { $('outpop').classList.remove('on'); $('dspop').classList.remove('on'); $('adjpop').classList.toggle('on'); }
    makeDraggable($('adjpop'));
    document.querySelectorAll('#adj-modes button').forEach((b) => { b.onclick = () => { adjMode = b.dataset.m;
      document.querySelectorAll('#adj-modes button').forEach((x) => x.classList.toggle('on', x === b)); }; });
    $('adj-amt').addEventListener('input', () => { adjAmt = +$('adj-amt').value; $('adj-amtv').textContent = adjAmt; });
    $('out-apply').onclick = outlineLayer;
    $('out-size').addEventListener('input', () => { $('out-sizev').textContent = $('out-size').value; computeOutlinePreview(); render(); });
    $('out-op').addEventListener('input', () => { $('out-opv').textContent = $('out-op').value + '%'; render(); });
    $('out-col').addEventListener('input', () => { $('out-colsw').style.background = $('out-col').value; render(); });
    $('crop-sym').onclick = () => { cropSym = !cropSym; $('crop-sym').classList.toggle('on', cropSym); toast(cropSym ? 'Кроп от центра' : 'Кроп от грани'); };
    $('stab').onclick = () => { stabOn = !stabOn; $('stab').classList.toggle('on', stabOn); toast(stabOn ? 'Стабилизация включена' : 'Стабилизация выключена'); };
    $('sel-copy').onclick = doCopy; $('sel-cut').onclick = doCut; $('sel-paste').onclick = doPaste;
    $('sel-del').onclick = doDelete; $('sel-off').onclick = deselect;
    $('sym').onclick = () => { sym = !sym; $('sym').classList.toggle('on', sym); render(); toast(sym ? 'Симметрия лево-право включена' : 'Симметрия лево-право выключена'); };
    $('sym-h').onclick = () => { symH = !symH; $('sym-h').classList.toggle('on', symH); render(); toast(symH ? 'Симметрия верх-низ включена' : 'Симметрия верх-низ выключена'); };
    $('pp').onclick = () => { ppOn = !ppOn; $('pp').classList.toggle('on', ppOn); toast(ppOn ? 'Пиксель-перфект включён' : 'Пиксель-перфект выключен'); };
    $('outline').onclick = openOutlinePop;
    $('flip-h').onclick = () => flipLayer(true);
    $('flip-v').onclick = () => flipLayer(false);
    $('rot').onclick = () => enterRotMode(layers[cur]);
    $('mono').onclick = monoAll;
    // ---- кастомный HSV-пикер в углу ----
    let colH = 0, colS = 0, colV = 100;
    function syncColUI() { const c = hsvToRgb(colH, colS, colV), hex = rgbToHex(c).toUpperCase();
      $('col-h').value = Math.round(colH); $('col-hv').textContent = Math.round(colH);
      $('col-s').value = Math.round(colS); $('col-sv').textContent = Math.round(colS);
      $('col-v').value = Math.round(colV); $('col-vv').textContent = Math.round(colV);
      $('col-sw').style.background = hex; if (document.activeElement !== $('col-hex')) $('col-hex').value = hex;
      $('col-s').style.background = 'linear-gradient(90deg,' + rgbToHex(hsvToRgb(colH, 0, colV)) + ',' + rgbToHex(hsvToRgb(colH, 100, colV)) + ')';
      $('col-v').style.background = 'linear-gradient(90deg,#000,' + rgbToHex(hsvToRgb(colH, colS, 100)) + ')'; }
    function colApply() { active = hsvToRgb(colH, colS, colV); refreshActive(); $('picker').value = rgbToHex(active); buildPalette(); render(); }
    function syncColFromActive() {
      const [h, s, v] = rgbToHsv(active[0], active[1], active[2]); colH = h; colS = s; colV = v; syncColUI();
    }
    function openColPop() { if ($('colpop').classList.contains('on')) { $('colpop').classList.remove('on'); return; }
      $('outpop').classList.remove('on'); syncColFromActive(); $('colpop').classList.add('on'); }
    // угловой кружок: тап — открыть пикер; перетащить на холст — залить активным цветом (как в Procreate)
    let colDrop = null;
    $('activewrap').addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return;
      colDrop = { x: e.clientX, y: e.clientY, moved: false }; try { $('activewrap').setPointerCapture(e.pointerId); } catch (err) {} });
    $('activewrap').addEventListener('pointermove', (e) => { if (!colDrop) return;
      if (!colDrop.moved && Math.hypot(e.clientX - colDrop.x, e.clientY - colDrop.y) > 8) {
        colDrop.moved = true; $('swdrop').style.background = rgb(active); $('swdrop').classList.add('on'); }
      if (colDrop.moved) { $('swdrop').style.left = e.clientX + 'px'; $('swdrop').style.top = e.clientY + 'px'; } });
    $('activewrap').addEventListener('pointerup', (e) => { if (!colDrop) return; const moved = colDrop.moved; colDrop = null; $('swdrop').classList.remove('on');
      if (!moved) { openColPop(); return; }
      if (document.elementFromPoint(e.clientX, e.clientY) === cv) { const r = cv.getBoundingClientRect();
        const gx = Math.floor((e.clientX - r.left - view.ox) / view.zoom), gy = Math.floor((e.clientY - r.top - view.oy) / view.zoom);
        if (gx >= 0 && gy >= 0 && gx < W && gy < H) { snapshot(); flood(gx, gy); render(); afterStroke(); toast('Залито'); }
        else toast('Мимо холста'); } });
    $('activewrap').addEventListener('pointercancel', () => { if (colDrop) { colDrop = null; $('swdrop').classList.remove('on'); } });
    $('col-h').addEventListener('input', () => { colH = +$('col-h').value; syncColUI(); colApply(); });
    $('col-s').addEventListener('input', () => { colS = +$('col-s').value; syncColUI(); colApply(); });
    $('col-v').addEventListener('input', () => { colV = +$('col-v').value; syncColUI(); colApply(); });
    $('col-hex').addEventListener('input', () => { const v = $('col-hex').value.trim().replace(/^#/, '');
      if (/^[0-9a-fA-F]{6}$/.test(v)) { const [h, s, vv] = rgbToHsv(...hexToRgb(v)); colH = h; colS = s; colV = vv; syncColUI(); colApply(); } });
    $('col-add').onclick = () => { const c = hsvToRgb(colH, colS, colV);
      if (palette.some((p) => eqc(p, c))) { toast('Цвет уже в палитре'); return; }
      palette.push(c.slice()); active = c.slice(); refreshActive(); buildPalette(); render(); toast('Цвет добавлен'); };
    makeDraggable($('colpop'));
    // ---- подсказка hex над свотчем (наведение мышью) + копирование ----
    let swTipHide = null;
    window.showSwTip = (el, hex) => { const t = $('swtip'); t.textContent = hex.toUpperCase(); t.dataset.hex = hex.toUpperCase();
      clearTimeout(swTipHide); const r = el.getBoundingClientRect();
      t.style.left = (r.left + r.width / 2) + 'px'; t.style.top = (r.top - 6) + 'px'; t.classList.add('on'); };
    window.hideSwTipSoon = () => { swTipHide = setTimeout(() => $('swtip').classList.remove('on'), 180); };
    $('swtip').addEventListener('pointerenter', () => clearTimeout(swTipHide));
    $('swtip').addEventListener('pointerleave', () => $('swtip').classList.remove('on'));
    $('swtip').addEventListener('click', async () => { const h = $('swtip').dataset.hex;
      await copyText(h); $('swtip').classList.remove('on'); toast('Скопировано: ' + h); });
    $('bc').onclick = () => openBcPop(layers, 'Яркость/контраст — всё изображение');
    $('bc-bri').addEventListener('input', () => { $('bc-briv').textContent = $('bc-bri').value; bcPreview(); });
    $('bc-con').addEventListener('input', () => { $('bc-conv').textContent = $('bc-con').value; bcPreview(); });
    $('bc-apply').onclick = bcApply;
    $('bc-cancel').onclick = bcCancel;
    makeDraggable($('bcpop'));
    $('crop').onclick = toggleCrop;
    $('trim').onclick = trimCanvas;
    $('crop-ok').onclick = applyCrop; $('crop-cancel').onclick = cancelCrop;
    $('bb-undo').onclick = doUndo; $('bb-redo').onclick = doRedo;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    function openLayerMenu(px, py) { // тап ПКМ по холсту — выбор слоя
      const m = $('cctx'); m.innerHTML = '';
      const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = 'Слой:'; m.appendChild(head);
      for (let i = layers.length - 1; i >= 0; i--) { const b = document.createElement('button');
        b.textContent = layers[i].name; if (i === cur) b.classList.add('cur'); if (!effVis(i)) b.classList.add('dim');
        b.addEventListener('click', ((idx) => () => { cur = idx; layList(); m.classList.remove('on'); toast('Слой: ' + layers[idx].name); })(i));
        m.appendChild(b); }
      m.style.visibility = 'hidden'; m.classList.add('on');
      requestAnimationFrame(() => { const r = m.getBoundingClientRect();
        m.style.left = Math.max(8, Math.min(px, innerWidth - r.width - 8)) + 'px';
        m.style.top = Math.max(8, Math.min(py, innerHeight - r.height - 8)) + 'px';
        m.style.visibility = ''; }); }

    // ---- клавиатура: B/E/F/I/M — инструменты, L — слои, S — симметрия, P — перфект, O — обводка,
    //      H/V — флипы, R или Ctrl+T — трансформация, C — кроп, N — новый, +/−/0 — зум,
    //      Ctrl+Z/Y/C/X/V/D/E/G/O/S, Del — удалить, Enter/Esc — кроп, пробел — пипетка ----
    let altPick = null;
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'AltLeft' || e.code === 'AltRight') && altPick === null && tool !== 'pick' && !document.querySelector('.ovl.on')) {
        e.preventDefault(); altPick = tool; setTool('pick'); return; } // Alt — пипетка пока держишь, отпустил → прежний инструмент
      const mod = e.ctrlKey || e.metaKey, c = e.code;
      if (rotMode) {
        if (mod && c === 'KeyZ') { e.preventDefault(); exitRotMode(false); return; }
        if (e.key === 'Enter') { e.preventDefault(); exitRotMode(true); return; }
        if (e.key === 'Escape') { e.preventDefault(); exitRotMode(false); return; }
      }
      if (e.target.matches && e.target.matches('input, textarea')) return;
      if (e.target.isContentEditable) return;
      if (document.querySelector('.ovl.on')) return;
      if (mod) {
        if (c === 'KeyZ') { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); }
        else if (c === 'KeyY') { e.preventDefault(); doRedo(); }
        else if (c === 'KeyC') { e.preventDefault(); doCopy(); }
        else if (c === 'KeyX') { e.preventDefault(); doCut(); }
        else if (c === 'KeyV') { e.preventDefault(); doPaste(); }
        else if (c === 'KeyD') { e.preventDefault(); deselect(); }
        else if (c === 'KeyE') { e.preventDefault(); doMerge(); }
        else if (c === 'KeyG') { e.preventDefault(); doGroup(); }
        else if (c === 'KeyA') { e.preventDefault(); doAddLayer(); }
        else if (c === 'KeyT') { e.preventDefault(); enterRotMode(layers[cur]); }
        else if (c === 'KeyO') { e.preventDefault(); $('file').click(); }
        else if (c === 'KeyS') { e.preventDefault(); if (e.shiftKey) exportPsd(); else exportPng(); }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); doDelete(); }
      else if (e.key === 'Enter') { if (cropMode) { e.preventDefault(); applyCrop(); } else if (rotMode) { e.preventDefault(); exitRotMode(true); } }
      else if (e.key === 'Escape') { if (cropMode) cancelCrop(); else if (rotMode) exitRotMode(false);
        else { if (replaceMode) { replaceMode = null; render(); }
          bcCancel(); glowPreview = null; for (const id of ['ctx', 'lctx', 'cctx', 'outpop', 'colpop', 'dspop', 'adjpop', 'glowpop']) $(id).classList.remove('on'); deselect(); } }
      else if (c === 'KeyB') setTool('pencil');
      else if (c === 'KeyE') setTool('eraser');
      else if (c === 'KeyF') { if (sel) fillSelection(); else setTool('fill'); }
      else if (c === 'KeyI') setTool('pick');
      else if (c === 'KeyM') setTool('select');
      else if (c === 'KeyL') $('layers').click();
      else if (c === 'KeyS') { if (e.shiftKey) $('sym-h').click(); else $('sym').click(); }
      else if (c === 'BracketLeft' || c === 'BracketRight') { // размер кисти/ластика
        const t = tool === 'eraser' ? 'eraser' : (tool === 'pencil' || tool === 'line') ? 'pencil' : null;
        if (t) { const br = brushes[t]; br.size = Math.max(1, Math.min(BP_SMAX, br.size + (c === 'BracketRight' ? 1 : -1)));
          syncBars(); toast((t === 'eraser' ? 'Ластик: ' : 'Кисть: ') + br.size + ' px'); render(); } }
      else if (c === 'KeyP') $('pp').click();
      else if (c === 'KeyU') setTool('line');
      else if (c === 'KeyK') setTool('rect');
      else if (c === 'KeyT') $('stab').click();
      else if (c === 'KeyO') { if ($('outpop').classList.contains('on')) outlineLayer(); else openOutlinePop(); } // 1-е O — превью, 2-е — применить
      else if (c === 'KeyH') flipLayer(true);
      else if (c === 'KeyV') flipLayer(false);
      else if (c === 'KeyR') enterRotMode(layers[cur]);
      else if (c === 'KeyC') toggleCrop();
      else if (c === 'KeyN') $('new-ovl').classList.add('on');
      else if (c === 'Equal' || c === 'NumpadAdd') zoomBy(1.25);
      else if (c === 'Minus' || c === 'NumpadSubtract') zoomBy(0.8);
      else if (c === 'Digit0') fitView();
    });
    window.addEventListener('keyup', (e) => {
      if ((e.code === 'AltLeft' || e.code === 'AltRight') && altPick !== null) { setTool(altPick === 'pick' ? 'pencil' : altPick); altPick = null; }
    });
    window.addEventListener('blur', () => { if (altPick !== null) { setTool(altPick === 'pick' ? 'pencil' : altPick); altPick = null; } }); // потеря фокуса с зажатым Alt
    $('zin').onclick = () => zoomBy(1.25); $('zout').onclick = () => zoomBy(0.8); $('fit').onclick = fitView;
    $('imp').onclick = () => $('file').click();
    $('exp').onclick = () => $('exp-ovl').classList.add('on');
    $('exp-png').onclick = () => { $('exp-ovl').classList.remove('on'); exportPng(); };
    $('exp-psd').onclick = () => { $('exp-ovl').classList.remove('on'); exportPsd(); };
    $('picker').onchange = (e) => { if (replaceMode) { const from = replaceMode.from; replaceMode = null; recolorAll(from, hexToRgb(e.target.value)); } else addColor(e.target.value); };
    $('ovlclose').onclick = () => $('ovl').classList.remove('on');

    const fileInp = document.createElement('input'); fileInp.type = 'file'; fileInp.accept = 'image/*'; fileInp.id = 'file';
    document.body.appendChild(fileInp);
    fileInp.onchange = (e) => { openImport(e.target.files[0]); e.target.value = ''; };

    ['imp-colors', 'imp-bgtol'].forEach((id) => { const el = $(id), out = $(id + 'v');
      el.addEventListener('input', () => { if (out) out.textContent = el.value; impSoon(); }); });
    $('imp-cell').addEventListener('input', () => { const v = +$('imp-cell').value; $('imp-cellv').textContent = v ? v : 'Авто'; impSoon(); });
    ['imp-clean', 'imp-sym'].forEach((id) => $(id).addEventListener('change', impConvert));
    $('imp-apply').onclick = applyImport;
    $('imp-rot').onclick = rotateImp;
    $('imp-cancel').onclick = () => $('imp-ovl').classList.remove('on');
    $('imp-asis').onclick = () => { if (impSrcImg) { $('imp-ovl').classList.remove('on'); insertPixelImage(impSrcImg); } };

    $('new').onclick = () => $('new-ovl').classList.add('on');
    document.querySelectorAll('#new-chips button').forEach((b) => b.addEventListener('click', () => {
      $('new-w').value = b.dataset.w; $('new-h').value = b.dataset.h;
      document.querySelectorAll('#new-chips button').forEach((x) => x.classList.toggle('on', x === b));
    }));
    $('new-create').onclick = () => {
      const w = parseInt($('new-w').value, 10), h = parseInt($('new-h').value, 10);
      if (!w || !h || w < 2 || h < 2 || w > 640 || h > 640) { toast('Размеры от 2 до 640'); return; }
      $('new-ovl').classList.remove('on'); newDocument(w, h);
    };

    // ---- документы: несколько работ в памяти, перенос слоёв между ними ----
    let docs = [{ name: 'Документ 1' }], docCur = 0, docSeq = 1, docDblTimer = null, docDblIdx = -1;
    function saveDocState() { const old = docs[docCur] || {};
      docs[docCur] = { name: old.name || 'Документ ' + (docCur + 1), W, H, layers, folders, folderSeq, layerSeq,
        palette, active, cur, undo: undoStack.slice(), redo: redoStack.slice(), view: { ...view } }; }
    function applyDoc(d) { W = d.W; H = d.H; layers = d.layers; folders = d.folders;
      folderSeq = d.folderSeq; layerSeq = d.layerSeq; palette = dedupePal(d.palette); active = d.active;
      cur = Math.min(d.cur || 0, layers.length - 1);
      undoStack.length = 0; undoStack.push(...d.undo); redoStack.length = 0; redoStack.push(...d.redo);
      Object.assign(view, d.view); marked.clear();
      sel = null; selMask = null; selFloat = null; if (cropMode) cancelCrop();
      dirtyAll(); refreshActive(); buildPalette(); layList(); syncSelbar(); render(); }
    function loadDoc(i) { if (i === docCur) return; saveDocState(); docCur = i; applyDoc(docs[i]); toast('→ ' + docs[i].name); }
    function newDocument(w2, h2) { saveDocState();
      docCur = docs.length; docs.push({ name: 'Документ ' + (++docSeq) });
      W = w2; H = h2; layerSeq = 1; layers = [newLayer('Слой 1')]; cur = 0;
      folders = []; folderSeq = 0; marked.clear();
      palette = defaultPalette(); active = palette[4];
      undoStack.length = 0; redoStack.length = 0;
      sel = null; selMask = null; selFloat = null; if (cropMode) cancelCrop();
      dirtyAll(); refreshActive(); buildPalette(); layList(); fitView(); toast(`${docs[docCur].name}: ${W}×${H}`); }
    function closeDoc(i) { if (docs.length < 2) { toast('Это единственный документ'); return; }
      if (i === docCur) { saveDocState(); const t = docs[i === 0 ? 1 : i - 1];
        docs.splice(i, 1); docCur = docs.indexOf(t); applyDoc(t); }
      else { const cd = docs[docCur]; docs.splice(i, 1); docCur = docs.indexOf(cd); }
      toast('Документ закрыт'); }
    function sendLayerToDoc(L, i) { const d = docs[i];
      if (d.layers.length >= 8) { toast('В целевом документе уже 8 слоёв'); return; }
      const copy = { name: L.name, opacity: L.opacity, visible: true, fid: null, clip: false, ext: new Map(),
        grid: Array.from({ length: d.H }, () => new Array(d.W).fill(null)) };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = L.grid[y][x]; if (!c) continue;
        if (x < d.W && y < d.H) copy.grid[y][x] = c.slice(); else copy.ext.set(x + ',' + y, c.slice()); }
      for (const [k, c] of L.ext) copy.ext.set(k, c.slice());
      d.layers.push(copy); toast('Слой скопирован в ' + d.name); }
    $('docsbtn').onclick = () => { const m = $('dctx'); m.innerHTML = '';
      const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = 'Документы'; m.appendChild(head);
      docs.forEach((d, i) => { const row = document.createElement('div'); row.style.display = 'flex'; row.style.gap = '2px';
        const b = document.createElement('button'); b.style.flex = '1';
        b.textContent = (d.name || 'Документ') + ' · ' + (i === docCur ? `${W}×${H}` : `${d.W}×${d.H}`);
        if (i === docCur) b.classList.add('cur');
        b.onclick = () => { // двойной клик — переименование, одиночный (через паузу) — переключение
          if (docDblTimer && docDblIdx === i) { clearTimeout(docDblTimer); docDblTimer = null; m.classList.remove('on'); openRename(docs[i]); return; }
          if (docDblTimer) clearTimeout(docDblTimer);
          docDblIdx = i; docDblTimer = setTimeout(() => { docDblTimer = null; m.classList.remove('on'); loadDoc(i); }, 280); };
        row.appendChild(b);
        if (docs.length > 1) { const x = document.createElement('button'); x.textContent = '✕'; x.style.width = '40px';
          x.onclick = (ev) => { ev.stopPropagation(); m.classList.remove('on'); closeDoc(i); }; row.appendChild(x); }
        m.appendChild(row); });
      const add = document.createElement('button'); add.textContent = '＋ Новый документ…';
      add.onclick = () => { m.classList.remove('on'); $('new-ovl').classList.add('on'); };
      m.appendChild(add);
      const conf = document.createElement('button'); conf.textContent = '⚙ Настроить панели…';
      conf.onclick = () => { m.classList.remove('on'); openToolsConf(); };
      m.appendChild(conf);
      m.style.visibility = 'hidden'; m.classList.add('on');
      requestAnimationFrame(() => { const r2 = m.getBoundingClientRect(), br = $('docsbtn').getBoundingClientRect();
        m.style.left = Math.max(8, Math.min(br.left, innerWidth - r2.width - 8)) + 'px';
        m.style.top = (br.bottom + 6) + 'px'; m.style.visibility = ''; }); };
    $('lctx-send').onclick = () => { $('lctx').classList.remove('on');
      if (!lctxRef || lctxRef.kind !== 'layer') return;
      if (docs.length < 2) { toast('Создай второй документ — кнопка слева сверху'); return; }
      saveDocState(); const L = lctxRef.ref, m = $('cctx'); m.innerHTML = '';
      const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = 'Куда копировать:'; m.appendChild(head);
      docs.forEach((d, i) => { if (i === docCur) return; const b = document.createElement('button');
        b.textContent = (d.name || 'Документ') + ` · ${d.W}×${d.H}`;
        b.onclick = () => { m.classList.remove('on'); sendLayerToDoc(L, i); };
        m.appendChild(b); });
      m.style.visibility = 'hidden'; m.classList.add('on');
      requestAnimationFrame(() => { const r2 = m.getBoundingClientRect();
        m.style.left = Math.round((innerWidth - r2.width) / 2) + 'px';
        m.style.top = Math.round(innerHeight * 0.35) + 'px'; m.style.visibility = ''; }); };
    $('new-cancel').onclick = () => $('new-ovl').classList.remove('on');

    for (const id of ['ovl', 'imp-ovl', 'new-ovl', 'ren-ovl', 'pal-ovl', 'exp-ovl', 'tools-ovl']) $(id).addEventListener('click', (e) => { if (e.target.id === id) $(id).classList.remove('on'); });
    window.addEventListener('resize', fitView);

    // ---- плавающее окно палитры: перетаскивание за шапку, размер за уголок ----
    (function palWin() {
      const p = $('palbar'), grip = $('palgrip'), rs = $('palrsz');
      function place(l, t) { p.style.left = Math.max(4, Math.min(l, innerWidth - 90)) + 'px';
        p.style.top = Math.max(4, Math.min(t, innerHeight - 50)) + 'px';
        p.style.bottom = 'auto'; p.style.transform = 'none'; }
      function save() { const r = p.getBoundingClientRect();
        try { localStorage.setItem('palwin', JSON.stringify({ l: r.left, t: r.top, w: r.width, h: $('pal').offsetHeight })); } catch (err) {} }
      try { const s = JSON.parse(localStorage.getItem('palwin'));
        if (s && s.l != null) { place(s.l, s.t); if (s.w) p.style.width = s.w + 'px'; if (s.h) $('pal').style.height = s.h + 'px'; } } catch (err) {}
      let d = null;
      grip.addEventListener('pointerdown', (e) => { grip.setPointerCapture(e.pointerId);
        const r = p.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top }; });
      grip.addEventListener('pointermove', (e) => { if (d) place(e.clientX - d.dx, e.clientY - d.dy); });
      const dEnd = () => { if (d) { d = null; save(); } }; // холст не трогаем — палитра живёт сама по себе
      grip.addEventListener('pointerup', dEnd); grip.addEventListener('pointercancel', dEnd);
      let rz = null;
      rs.addEventListener('pointerdown', (e) => { e.preventDefault(); rs.setPointerCapture(e.pointerId);
        const r = p.getBoundingClientRect(); if (!p.style.top) place(r.left, r.top);
        rz = { w: r.width, h: $('pal').offsetHeight, x: e.clientX, y: e.clientY }; });
      rs.addEventListener('pointermove', (e) => { if (!rz) return;
        p.style.width = Math.max(130, Math.min(innerWidth - 12, rz.w + e.clientX - rz.x)) + 'px';
        $('pal').style.height = Math.max(38, Math.min(innerHeight * .6, rz.h + e.clientY - rz.y)) + 'px'; });
      const rEnd = () => { if (rz) { rz = null; save(); } };
      rs.addEventListener('pointerup', rEnd); rs.addEventListener('pointercancel', rEnd);
    })();

    // ---- панель инструментов: перенос за грип и ресайз за уголок (как палитра) ----
    (function sideWin() { const p = $('sidebar'), grip = $('sb-grip'), rs = $('sb-rsz');
      function place(l, t) { p.style.left = Math.max(2, Math.min(l, innerWidth - 46)) + 'px';
        p.style.top = Math.max(2, Math.min(t, innerHeight - 60)) + 'px'; p.style.transform = 'none'; }
      function save() { const r = p.getBoundingClientRect();
        try { localStorage.setItem('sbwin', JSON.stringify({ l: r.left, t: r.top, w: p.style.width, h: p.style.maxHeight })); } catch (err) {} }
      try { const s = JSON.parse(localStorage.getItem('sbwin'));
        if (s && s.l != null) { place(s.l, s.t); if (s.w) p.style.width = s.w; if (s.h) p.style.maxHeight = s.h; } } catch (err) {}
      let d = null;
      grip.addEventListener('pointerdown', (e) => { grip.setPointerCapture(e.pointerId);
        const r = p.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top }; });
      grip.addEventListener('pointermove', (e) => { if (d) place(e.clientX - d.dx, e.clientY - d.dy); });
      const dEnd = () => { if (d) { d = null; save(); } }; // холст не трогаем — панель плавает поверх
      grip.addEventListener('pointerup', dEnd); grip.addEventListener('pointercancel', dEnd);
      let rz = null;
      rs.addEventListener('pointerdown', (e) => { e.preventDefault(); rs.setPointerCapture(e.pointerId);
        const r = p.getBoundingClientRect(); if (!p.style.top) place(r.left, r.top);
        rz = { w: r.width, h: r.height, x: e.clientX, y: e.clientY }; });
      rs.addEventListener('pointermove', (e) => { if (!rz) return;
        p.style.width = Math.max(48, Math.min(innerWidth - 12, rz.w + e.clientX - rz.x)) + 'px';
        p.style.maxHeight = Math.max(80, Math.min(innerHeight - 12, rz.h + e.clientY - rz.y)) + 'px'; });
      const rEnd = () => { if (rz) { rz = null; save(); } };
      rs.addEventListener('pointerup', rEnd); rs.addEventListener('pointercancel', rEnd);
    })();

    // ---- окно 1:1: живой предпросмотр в реальном размере ----
    let prevOn = false; const pcv2 = $('prevcv'), pctx2 = pcv2.getContext('2d');
    const prevView = { z: 0, x: 0, y: 0 }; let prevComp = null;
    function prevComposite() { if (!prevComp) prevComp = document.createElement('canvas');
      if (prevComp.width !== W) prevComp.width = W; if (prevComp.height !== H) prevComp.height = H;
      const px = prevComp.getContext('2d'); px.clearRect(0, 0, W, H); px.imageSmoothingEnabled = false;
      for (let i = 0; i < layers.length; i++) { const L = layers[i]; if (!effVis(i) || L.opacity <= 0) continue;
        const cb = clipBase(i); if (L.clip && (cb < 0 || !effVis(cb))) continue;
        px.globalAlpha = L.opacity; px.drawImage(cb >= 0 ? clippedCanvas(i, cb) : layerCanvas(i), 0, 0); }
      px.globalAlpha = 1; return prevComp; }
    function prevReset() { const cw = pcv2.clientWidth || 200, ch = pcv2.clientHeight || 200;
      prevView.z = 1; prevView.x = Math.round((cw - W) / 2); prevView.y = Math.round((ch - H) / 2); }
    function syncPrev() { if (!prevOn) return;
      const dpr = window.devicePixelRatio || 1, cw = pcv2.clientWidth, ch = pcv2.clientHeight;
      if (pcv2.width !== Math.round(cw * dpr) || pcv2.height !== Math.round(ch * dpr)) { pcv2.width = Math.round(cw * dpr); pcv2.height = Math.round(ch * dpr); }
      if (prevView.z <= 0) prevReset();
      pctx2.setTransform(dpr, 0, 0, dpr, 0, 0); pctx2.clearRect(0, 0, cw, ch); pctx2.imageSmoothingEnabled = false;
      pctx2.drawImage(prevComposite(), prevView.x, prevView.y, W * prevView.z, H * prevView.z); }
    function togglePrev(on) { prevOn = on === undefined ? !prevOn : on;
      $('prevwin').classList.toggle('on', prevOn); $('prev').classList.toggle('on', prevOn);
      if (prevOn) requestAnimationFrame(() => { prevReset(); syncPrev(); }); }
    $('prev').onclick = () => togglePrev();
    $('prev-x').onclick = () => togglePrev(false);
    $('prev-1to1').onclick = () => { prevReset(); syncPrev(); };
    (function prevCtl() { const w = $('prevwin'), g = $('prevgrip'), rz = $('prevrsz');
      let d = null, rsz = null, p = null; const pp = new Map(); let pinch0 = null;
      g.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return;
        g.setPointerCapture(e.pointerId); const r = w.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top }; });
      g.addEventListener('pointermove', (e) => { if (!d) return;
        w.style.left = Math.max(4, Math.min(e.clientX - d.dx, innerWidth - 70)) + 'px';
        w.style.top = Math.max(4, Math.min(e.clientY - d.dy, innerHeight - 50)) + 'px'; w.style.right = 'auto'; });
      const gEnd = () => { d = null; }; g.addEventListener('pointerup', gEnd); g.addEventListener('pointercancel', gEnd);
      rz.addEventListener('pointerdown', (e) => { e.preventDefault(); rz.setPointerCapture(e.pointerId);
        const r = w.getBoundingClientRect(); rsz = { w: r.width, h: r.height, x: e.clientX, y: e.clientY }; });
      rz.addEventListener('pointermove', (e) => { if (!rsz) return;
        w.style.width = Math.max(120, Math.min(innerWidth - 12, rsz.w + e.clientX - rsz.x)) + 'px';
        w.style.height = Math.max(110, Math.min(innerHeight - 12, rsz.h + e.clientY - rsz.y)) + 'px'; syncPrev(); });
      const rzEnd = () => { rsz = null; }; rz.addEventListener('pointerup', rzEnd); rz.addEventListener('pointercancel', rzEnd);
      pcv2.addEventListener('pointerdown', (e) => { pcv2.setPointerCapture(e.pointerId); pp.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pp.size === 2) { const a = [...pp.values()]; pinch0 = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: prevView.z }; p = null; return; }
        p = { x: e.clientX, y: e.clientY, vx: prevView.x, vy: prevView.y }; });
      pcv2.addEventListener('pointermove', (e) => { if (!pp.has(e.pointerId)) return; pp.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pp.size >= 2 && pinch0) { const a = [...pp.values()], dd = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
          const mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }, r = pcv2.getBoundingClientRect();
          const wx = (mid.x - r.left - prevView.x) / prevView.z, wy = (mid.y - r.top - prevView.y) / prevView.z;
          prevView.z = Math.max(.1, Math.min(40, pinch0.z * (dd / pinch0.d)));
          prevView.x = (mid.x - r.left) - wx * prevView.z; prevView.y = (mid.y - r.top) - wy * prevView.z; syncPrev(); return; }
        if (!p) return; prevView.x = p.vx + (e.clientX - p.x); prevView.y = p.vy + (e.clientY - p.y); syncPrev(); });
      const cvEnd = (e) => { pp.delete(e.pointerId); if (pp.size < 2) pinch0 = null; p = null; };
      pcv2.addEventListener('pointerup', cvEnd); pcv2.addEventListener('pointercancel', cvEnd);
      pcv2.addEventListener('wheel', (e) => { e.preventDefault(); const r = pcv2.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        const wx = (mx - prevView.x) / prevView.z, wy = (my - prevView.y) / prevView.z;
        prevView.z = Math.max(.1, Math.min(40, prevView.z * (e.deltaY < 0 ? 1.12 : 0.89)));
        prevView.x = mx - wx * prevView.z; prevView.y = my - wy * prevView.z; syncPrev(); }, { passive: false }); })();

    // ---- окно референса: открыть картинку, зум/пан, поворот, флип, пипетка по клику ----
    let refOn = false, refSrc = null; const refView = { z: 1, x: 0, y: 0 };
    const rcv2 = $('refcv'), rctx2 = rcv2.getContext('2d', { willReadFrequently: true });
    function refRender() { if (!refOn) return; const dpr = window.devicePixelRatio || 1,
        cw = rcv2.clientWidth, ch = rcv2.clientHeight;
      if (rcv2.width !== Math.round(cw * dpr)) { rcv2.width = Math.round(cw * dpr); rcv2.height = Math.round(ch * dpr); }
      rctx2.setTransform(dpr, 0, 0, dpr, 0, 0); rctx2.clearRect(0, 0, cw, ch);
      rctx2.fillStyle = '#101014'; rctx2.fillRect(0, 0, cw, ch);
      if (!refSrc) { rctx2.fillStyle = '#9a9aa3'; rctx2.font = '12px system-ui'; rctx2.textAlign = 'center';
        rctx2.fillText('Открой картинку кнопкой 📁 сверху', cw / 2, ch / 2); return; }
      rctx2.imageSmoothingEnabled = refView.z < 2;
      rctx2.drawImage(refSrc, refView.x, refView.y, refSrc.width * refView.z, refSrc.height * refView.z); }
    function refFit() { if (!refSrc) { refRender(); return; } const cw = rcv2.clientWidth, ch = rcv2.clientHeight;
      refView.z = Math.min(cw / refSrc.width, ch / refSrc.height);
      refView.x = (cw - refSrc.width * refView.z) / 2; refView.y = (ch - refSrc.height * refView.z) / 2; refRender(); }
    function toggleRef(on) { refOn = on === undefined ? !refOn : on;
      $('refwin').classList.toggle('on', refOn); $('refbtn').classList.toggle('on', refOn);
      if (refOn) requestAnimationFrame(refFit); }
    $('refbtn').onclick = () => toggleRef();
    $('ref-x').onclick = () => toggleRef(false);
    const refFile = document.createElement('input'); refFile.type = 'file'; refFile.accept = 'image/*';
    $('ref-open').onclick = () => refFile.click();
    refFile.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      const im = new Image(); im.onerror = () => toast('Не удалось открыть картинку');
      im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        c.getContext('2d').drawImage(im, 0, 0); refSrc = c; refFit(); };
      im.src = URL.createObjectURL(f); };
    $('ref-rot').onclick = () => { if (!refSrc) return; const c = document.createElement('canvas');
      c.width = refSrc.height; c.height = refSrc.width;
      const x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(refSrc, 0, 0);
      refSrc = c; refFit(); };
    $('ref-flip').onclick = () => { if (!refSrc) return; const c = document.createElement('canvas');
      c.width = refSrc.width; c.height = refSrc.height;
      const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(refSrc, 0, 0);
      refSrc = c; refRender(); };
    (function refCtl() { // пан перетаскиванием, клик — пипетка, колесо/щипок — зум, окно: грип и уголок
      const w = $('refwin'), g = $('refgrip'), rz = $('refrsz');
      let d = null, p = null, rsz = null; const rp = new Map(); let pinch0 = null;
      g.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return;
        g.setPointerCapture(e.pointerId); const r = w.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top }; });
      g.addEventListener('pointermove', (e) => { if (!d) return;
        w.style.left = Math.max(4, Math.min(e.clientX - d.dx, innerWidth - 70)) + 'px';
        w.style.top = Math.max(4, Math.min(e.clientY - d.dy, innerHeight - 50)) + 'px'; });
      const gEnd = () => { d = null; };
      g.addEventListener('pointerup', gEnd); g.addEventListener('pointercancel', gEnd);
      rz.addEventListener('pointerdown', (e) => { e.preventDefault(); rz.setPointerCapture(e.pointerId);
        const r = w.getBoundingClientRect(); rsz = { w: r.width, h: r.height, x: e.clientX, y: e.clientY }; });
      rz.addEventListener('pointermove', (e) => { if (!rsz) return;
        w.style.width = Math.max(140, Math.min(innerWidth - 12, rsz.w + e.clientX - rsz.x)) + 'px';
        w.style.height = Math.max(120, Math.min(innerHeight - 12, rsz.h + e.clientY - rsz.y)) + 'px'; refRender(); });
      const rzEnd = () => { rsz = null; };
      rz.addEventListener('pointerup', rzEnd); rz.addEventListener('pointercancel', rzEnd);
      rcv2.addEventListener('pointerdown', (e) => { rcv2.setPointerCapture(e.pointerId);
        rp.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (rp.size === 2) { const a = [...rp.values()]; pinch0 = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), z: refView.z }; p = null; return; }
        p = { x: e.clientX, y: e.clientY, vx: refView.x, vy: refView.y, moved: false }; });
      rcv2.addEventListener('pointermove', (e) => {
        if (!rp.has(e.pointerId)) { if (e.buttons === 0) return; }
        rp.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (rp.size >= 2 && pinch0) { const a = [...rp.values()], dd = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
          const mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 }, r = rcv2.getBoundingClientRect();
          const wx = (mid.x - r.left - refView.x) / refView.z, wy = (mid.y - r.top - refView.y) / refView.z;
          refView.z = Math.max(.05, Math.min(40, pinch0.z * (dd / pinch0.d)));
          refView.x = (mid.x - r.left) - wx * refView.z; refView.y = (mid.y - r.top) - wy * refView.z; refRender(); return; }
        if (!p) return;
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) p.moved = true;
        if (p.moved) { refView.x = p.vx + (e.clientX - p.x); refView.y = p.vy + (e.clientY - p.y); refRender(); } });
      const cvEnd = (e) => { rp.delete(e.pointerId); if (rp.size < 2) pinch0 = null;
        if (p && !p.moved && refSrc) { const dpr = window.devicePixelRatio || 1, r = rcv2.getBoundingClientRect();
          try { const px = rctx2.getImageData(Math.round((e.clientX - r.left) * dpr), Math.round((e.clientY - r.top) * dpr), 1, 1).data;
            if (px[3] > 10) { const hex = '#' + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
              addColor(hex); $('picker').value = hex; // добавляем цвет в палитру и делаем активным
              toast('Цвет из референса добавлен в палитру'); } } catch (err) {} }
        p = null; };
      rcv2.addEventListener('pointerup', cvEnd); rcv2.addEventListener('pointercancel', cvEnd);
      rcv2.addEventListener('wheel', (e) => { e.preventDefault(); const r = rcv2.getBoundingClientRect(),
          mx = e.clientX - r.left, my = e.clientY - r.top;
        const wx = (mx - refView.x) / refView.z, wy = (my - refView.y) / refView.z;
        refView.z = Math.max(.05, Math.min(40, refView.z * (e.deltaY < 0 ? 1.12 : 0.89)));
        refView.x = mx - wx * refView.z; refView.y = my - wy * refView.z; refRender(); }, { passive: false });
    })();

    // ---- менеджер палитр: сохранить, загрузить, из изображения ----
    function palStore() { try { return JSON.parse(localStorage.getItem('palettes')) || {}; } catch (e) { return {}; } }
    function palListUI() { const box = $('pal-list'); box.innerHTML = '';
      const st = palStore(), names = Object.keys(st);
      if (!names.length) { box.innerHTML = '<p class="hint" style="margin:10px 2px">Сохранённых палитр пока нет</p>'; return; }
      for (const nm of names) { const row = document.createElement('div'); row.className = 'prow';
        const dots = document.createElement('span'); dots.className = 'pdots';
        st[nm].slice(0, 6).forEach((c) => { const i = document.createElement('i'); i.style.background = rgb(c); dots.appendChild(i); });
        const t = document.createElement('span'); t.className = 'pname'; t.textContent = nm;
        const load = document.createElement('button'); load.textContent = 'Загрузить';
        load.onclick = () => { palette = dedupePal(st[nm]); if (palette.length) active = palette[0].slice();
          refreshActive(); buildPalette(); $('pal-ovl').classList.remove('on'); toast('Палитра «' + nm + '» загружена'); };
        const del = document.createElement('button'); del.textContent = '✕'; del.style.minWidth = '36px'; del.style.padding = '0';
        del.onclick = () => { const s2 = palStore(); delete s2[nm];
          try { localStorage.setItem('palettes', JSON.stringify(s2)); } catch (e) {} palListUI(); };
        row.append(dots, t, load, del); box.appendChild(row); } }
    $('pal-menu').addEventListener('pointerdown', (e) => e.stopPropagation());
    $('pal-menu').addEventListener('click', () => { $('pal-name').value = ''; palListUI(); $('pal-ovl').classList.add('on'); });
    $('pal-close').onclick = () => $('pal-ovl').classList.remove('on');
    $('pal-save').onclick = () => { const nm = ($('pal-name').value.trim() || 'Палитра').slice(0, 20);
      const s2 = palStore(); s2[nm] = palette.map((c) => [c[0], c[1], c[2]]);
      try { localStorage.setItem('palettes', JSON.stringify(s2)); } catch (e) {}
      palListUI(); toast('Палитра сохранена: ' + nm); };
    const palImg = document.createElement('input'); palImg.type = 'file'; palImg.accept = 'image/*';
    $('pal-from-img').onclick = () => palImg.click();
    palImg.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      const im = new Image(); im.onerror = () => toast('Не удалось открыть картинку');
      im.onload = () => { const MAX = 160, k = Math.min(1, MAX / Math.max(im.naturalWidth, im.naturalHeight));
        const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
        const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
        const x2 = c2.getContext('2d'); x2.drawImage(im, 0, 0, w, h);
        const d2 = x2.getImageData(0, 0, w, h).data, samples = [];
        for (let i = 0; i < d2.length; i += 4) if (d2[i + 3] > 127) samples.push([d2[i], d2[i + 1], d2[i + 2]]);
        if (!samples.length) { toast('Картинка пустая'); return; }
        palette = medianCut(samples, 16); active = palette[0].slice();
        refreshActive(); buildPalette(); $('pal-ovl').classList.remove('on'); toast('Палитра из изображения: 16 цветов'); };
      im.src = URL.createObjectURL(f); };

    // ---- кнопки панелей: перетаскивание между панелями (ПКМ/долгий тап), скрытие, настройка ----
    const TOOLBOXES = ['tb-left', 'tb-right', 'sidebar'];
    const TOOL_PROTECTED = new Set(['docsbtn']); // вход в настройки должен остаться доступным
    let toolHidden = new Set();
    function saveOrder() { const o = {};
      for (const id of TOOLBOXES) o[id] = [...$(id).children].filter((c) => c.tagName === 'BUTTON' && c.id).map((c) => c.id);
      try { localStorage.setItem('toolorder2', JSON.stringify(o)); } catch (err) {} }
    function restoreOrder() { try { const o = JSON.parse(localStorage.getItem('toolorder2')); if (!o) return;
      for (const id of TOOLBOXES) { const box = $(id); if (!o[id]) continue;
        for (const cid of o[id]) { const el = document.getElementById(cid); if (el) box.appendChild(el); } } } catch (err) {} } // без проверки родителя — кнопки кочуют между панелями
    function saveHidden() { try { localStorage.setItem('toolhidden', JSON.stringify([...toolHidden])); } catch (err) {} }
    function applyHidden() { for (const id of TOOLBOXES) for (const el of $(id).children)
      el.classList.toggle('tool-hidden', toolHidden.has(el.id)); }
    try { toolHidden = new Set(JSON.parse(localStorage.getItem('toolhidden')) || []); } catch (err) {}
    let tDrag = null, tSup = null, tctxBtn = null;
    function startToolDrag(b, x, y, rmb, byTouch) { tDrag = { b, x, y, moved: false, menu: rmb || byTouch }; b.classList.add('dragging'); } // без setPointerCapture — иначе при переносе в другую панель захват слетает
    for (const boxId of TOOLBOXES) { const box = $(boxId);
      box.addEventListener('contextmenu', (e) => { if (e.target.closest('button')) e.preventDefault(); });
      box.addEventListener('pointerdown', (e) => { const b = e.target.closest('button'); if (!b || b.parentElement !== box) return;
        if (e.button === 2) { e.preventDefault(); startToolDrag(b, e.clientX, e.clientY, true, false); }
        else if (e.pointerType === 'touch') { const x0 = e.clientX, y0 = e.clientY;
          const t = setTimeout(() => startToolDrag(b, x0, y0, false, true), 520); // долгий тап — меню «Скрыть/Настроить»
          const mv = (ev) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 9) stop2(); };
          const stop2 = () => { clearTimeout(t); b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', stop2); b.removeEventListener('pointercancel', stop2); };
          b.addEventListener('pointermove', mv); b.addEventListener('pointerup', stop2); b.addEventListener('pointercancel', stop2); } }); }
    document.addEventListener('pointermove', (e) => { if (!tDrag) return;
      if (!tDrag.moved) { if (Math.hypot(e.clientX - tDrag.x, e.clientY - tDrag.y) <= 7) return; tDrag.moved = true; }
      const el = document.elementFromPoint(e.clientX, e.clientY); if (!el) return;
      const box = el.closest('#tb-left, #tb-right, #sidebar'); if (!box) return;
      const row = el.closest('#tb-left > button, #tb-right > button, #sidebar > button');
      if (row && row !== tDrag.b) { const r = row.getBoundingClientRect();
        const before = box.id === 'sidebar' ? e.clientY < r.top + r.height / 2 : e.clientX < r.left + r.width / 2;
        box.insertBefore(tDrag.b, before ? row : row.nextSibling); }
      else if (!row && tDrag.b.parentElement !== box) box.appendChild(tDrag.b); }); // пустое место панели — в конец
    document.addEventListener('pointerup', (e) => { if (!tDrag) return;
      const d = tDrag; tDrag = null; d.b.classList.remove('dragging');
      if (d.moved) { tSup = d.b; saveOrder(); setTimeout(() => { tSup = null; }, 0); }
      else if (d.menu) { tSup = d.b; setTimeout(() => { tSup = null; }, 0); openTctx(e.clientX, e.clientY, d.b); } }); // ПКМ-тап/долгий тап — меню кнопки (клик подавляем)
    document.addEventListener('click', (e) => { if (tSup && e.target.closest('button') === tSup) { e.stopPropagation(); e.preventDefault(); } }, true);
    function openTctx(x, y, b) { tctxBtn = b;
      const m = $('tctx'); m.style.visibility = 'hidden'; m.classList.add('on');
      requestAnimationFrame(() => { const r = m.getBoundingClientRect();
        m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
        m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
        m.style.visibility = ''; }); }
    $('tctx-hide').onclick = () => { $('tctx').classList.remove('on'); if (!tctxBtn) return;
      if (TOOL_PROTECTED.has(tctxBtn.id)) { toast('Эту кнопку скрыть нельзя'); return; }
      toolHidden.add(tctxBtn.id); applyHidden(); saveHidden();
      toast('Скрыто. Вернуть: ПКМ по кнопке → Настроить панели'); };
    $('tctx-conf').onclick = () => { $('tctx').classList.remove('on'); openToolsConf(); };
    function openToolsConf() { const box = $('tools-list'); box.innerHTML = '';
      const names = { 'tb-left': 'Верхняя панель — слева', 'tb-right': 'Верхняя панель — справа', sidebar: 'Боковая панель' };
      for (const id of TOOLBOXES) { const h = document.createElement('p'); h.className = 'hint'; h.style.margin = '12px 2px 2px';
        h.textContent = names[id]; box.appendChild(h);
        for (const el of $(id).children) { if (!el.id || el.tagName !== 'BUTTON') continue;
          const row = document.createElement('div'); row.className = 'irow'; row.style.minHeight = '40px';
          const lb = document.createElement('label'); lb.style.flex = '1'; lb.style.minWidth = '0';
          lb.textContent = (el.title || el.id).split(' (')[0];
          const sw = document.createElement('label'); sw.className = 'switch';
          const inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !toolHidden.has(el.id);
          inp.disabled = TOOL_PROTECTED.has(el.id);
          inp.addEventListener('change', ((bid) => () => { if (inp.checked) toolHidden.delete(bid); else toolHidden.add(bid);
            applyHidden(); saveHidden(); })(el.id));
          const knob = document.createElement('span');
          sw.append(inp, knob); row.append(lb, sw); box.appendChild(row); } }
      $('tools-ovl').classList.add('on'); }
    $('tools-close').onclick = () => $('tools-ovl').classList.remove('on');
    $('tools-reset').onclick = () => { try { localStorage.removeItem('toolorder2'); localStorage.removeItem('toolhidden'); } catch (err) {}
      location.reload(); };
    restoreOrder(); applyHidden();

    refreshActive(); buildPalette(); layList(); syncBars();
    requestAnimationFrame(() => { fitView(); toast('Долгий тап — пипетка · тап 2 пальцами — отмена'); });
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
