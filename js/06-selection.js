    function normSel(ax, ay, bx, by) { let x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W - 1, x1); y1 = Math.min(H - 1, y1);
      return (x1 < x0 || y1 < y0) ? null : { x0, y0, x1, y1 }; }
    function syncSelbar() { $('selbar').classList.toggle('on', !!sel); }
    function deselect() { sel = null; selMask = null; syncSelbar(); render(); }
    // ---- перемещение слоя(ёв) инструментом Move: один или все отмеченные ----
    function moveTargets() { return (marked.size > 1) ? [...marked].filter((i) => i < layers.length).sort((a, b) => a - b) : [cur]; }
    function shiftLayerGrid(L, dx, dy) { const ng = blank(W, H), ne = new Map();
      const put = (x, y, c) => { const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H) ng[ny][nx] = c; else ne.set(nx + ',' + ny, c); }; // за краем — в запас
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = L.grid[y][x]; if (c) put(x, y, c.slice()); }
      for (const [k, c] of L.ext) { const ci = k.indexOf(','); put(+k.slice(0, ci), +k.slice(ci + 1), c.slice()); }
      L.grid = ng; L.ext = ne; }
    function commitMove() { if (!moveDrag) return; const { dx, dy, idxs } = moveDrag; moveDrag = null;
      if (!dx && !dy) { render(); return; }
      snapshot(); for (const i of idxs) if (layers[i]) { shiftLayerGrid(layers[i], dx, dy); markDirty(i); }
      render(); afterStroke(); }
    function liftSelection() { const L = layers[cur], g = L.grid, w = sel.x1 - sel.x0 + 1, h = sel.y1 - sel.y0 + 1;
      const cells = new Map();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (selMask && !selMask.has((sel.x0 + x) + ',' + (sel.y0 + y))) continue; // маска: берём только выделенные пиксели
        const c = g[sel.y0 + y][sel.x0 + x];
        if (c) { cells.set(x + ',' + y, c); g[sel.y0 + y][sel.x0 + x] = null; } }
      if (!selMask) for (const [k, c] of [...L.ext]) { // рамка у края — прихватываем пиксели, спрятанные за границей
        const ci = k.indexOf(','), ax = +k.slice(0, ci), ay = +k.slice(ci + 1);
        const grab = (sel.x1 === W - 1 && ax >= W && ay >= sel.y0 && ay <= sel.y1)
          || (sel.x0 === 0 && ax < 0 && ay >= sel.y0 && ay <= sel.y1)
          || (sel.y1 === H - 1 && ay >= H && ax >= sel.x0 && ax <= sel.x1)
          || (sel.y0 === 0 && ay < 0 && ax >= sel.x0 && ax <= sel.x1);
        if (grab) { cells.set((ax - sel.x0) + ',' + (ay - sel.y0), c); L.ext.delete(k); } }
      selMask = null; // форму дальше несёт «плавающий» фрагмент
      selFloat = { cells, w, h, x: sel.x0, y: sel.y0, ox: sel.x0, oy: sel.y0 }; markDirty(cur); }
    function commitFloat() { if (!selFloat) return; const L = layers[cur], g = L.grid;
      const landed = new Set();
      for (const [k, c] of selFloat.cells) { const ci = k.indexOf(','), dx = +k.slice(0, ci), dy = +k.slice(ci + 1);
        const xx = selFloat.x + dx, yy = selFloat.y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) { g[yy][xx] = c; landed.add(xx + ',' + yy); }
        else L.ext.set(xx + ',' + yy, c); } // за границей — не теряем, можно перетащить обратно
      selMask = landed.size ? landed : null; // выделение сохраняет форму перенесённого
      selFloat = null; markDirty(cur); afterStroke(); }
    function selZone(e) { if (!sel || selFloat) return null; // ручки растяжения по рамке выделения
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const z = view.zoom, lx = view.ox + sel.x0 * z, rx = view.ox + (sel.x1 + 1) * z,
        ty = view.oy + sel.y0 * z, by = view.oy + (sel.y1 + 1) * z, tol = 14;
      const nl = Math.abs(px - lx) < tol, nr = Math.abs(px - rx) < tol, nt = Math.abs(py - ty) < tol, nb = Math.abs(py - by) < tol;
      const inX = px > lx - tol && px < rx + tol, inY = py > ty - tol && py < by + tol;
      const zn = { l: nl && inY, r: nr && inY, t: nt && inX, b: nb && inX, inside: false };
      return (zn.l || zn.r || zn.t || zn.b) ? zn : null; }
    function selDown(gx, gy, ev) {
      if (sel && ev) { const zn = selZone(ev); // растяжение за ручку: NN-масштаб без размазывания
        if (zn) { snapshot(); liftSelection();
          selDrag = { mode: 'scale', zn, src: new Map(selFloat.cells), sw: selFloat.w, sh: selFloat.h,
            x0: sel.x0, y0: sel.y0, x1: sel.x1, y1: sel.y1, lifted: true, moved: true };
          return; } }
      if (sel && gx >= sel.x0 && gx <= sel.x1 && gy >= sel.y0 && gy <= sel.y1 && (!selMask || selMask.has(gx + ',' + gy)))
        selDrag = { mode: 'move', sx: gx, sy: gy, lifted: false, moved: false };
      else { selMask = null; selDrag = { mode: 'new', sx: gx, sy: gy, moved: false }; } }
    function selMove(gx, gy) { if (!selDrag) return;
      if (selDrag.mode === 'scale') { const d = selDrag;
        let nw = d.sw, nh = d.sh, nx0 = d.x0, ny0 = d.y0;
        if (d.zn.l) { nw = Math.max(1, d.x1 + 1 - gx); nx0 = d.x1 + 1 - nw; }
        if (d.zn.r) { nw = Math.max(1, gx - d.x0 + 1); }
        if (d.zn.t) { nh = Math.max(1, d.y1 + 1 - gy); ny0 = d.y1 + 1 - nh; }
        if (d.zn.b) { nh = Math.max(1, gy - d.y0 + 1); }
        if ((d.zn.l || d.zn.r) && (d.zn.t || d.zn.b)) { // угол — пропорционально
          const k = Math.max(nw / d.sw, nh / d.sh);
          nw = Math.max(1, Math.round(d.sw * k)); nh = Math.max(1, Math.round(d.sh * k));
          if (d.zn.l) nx0 = d.x1 + 1 - nw; if (d.zn.t) ny0 = d.y1 + 1 - nh; }
        if (nw > 640 || nh > 640) return;
        const cells = new Map(); // ближайший сосед: пиксели не размазываются, край повторяется
        for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
          const sx2 = Math.min(d.sw - 1, Math.floor(x * d.sw / nw)), sy2 = Math.min(d.sh - 1, Math.floor(y * d.sh / nh));
          const c = d.src.get(sx2 + ',' + sy2); if (c) cells.set(x + ',' + y, c); }
        selFloat = { cells, w: nw, h: nh, x: nx0, y: ny0, ox: nx0, oy: ny0 };
        sel = { x0: nx0, y0: ny0, x1: nx0 + nw - 1, y1: ny0 + nh - 1 };
        syncSelbar(); render(); return; }
      if (selDrag.mode === 'new') { if (gx !== selDrag.sx || gy !== selDrag.sy) selDrag.moved = true; sel = normSel(selDrag.sx, selDrag.sy, gx, gy); }
      else { if (!selDrag.lifted) { if (gx === selDrag.sx && gy === selDrag.sy) return; snapshot(); liftSelection(); selDrag.lifted = true; }
        selFloat.x = selFloat.ox + (gx - selDrag.sx); selFloat.y = selFloat.oy + (gy - selDrag.sy);
        sel = { x0: selFloat.x, y0: selFloat.y, x1: selFloat.x + selFloat.w - 1, y1: selFloat.y + selFloat.h - 1 }; selDrag.moved = true; }
      syncSelbar(); render(); }
    function symmetrizeSelection() { // при включённой симметрии добавляем в выделение зеркальные клетки
      if (!sel || (!sym && !symH)) return;
      const base = new Set();
      if (selMask) for (const k of selMask) base.add(k);
      else for (let y = sel.y0; y <= sel.y1; y++) for (let x = sel.x0; x <= sel.x1; x++) base.add(x + ',' + y);
      const out = new Set(base);
      for (const k of base) { const ci = k.indexOf(','), x = +k.slice(0, ci), y = +k.slice(ci + 1);
        if (sym) out.add((W - 1 - x) + ',' + y);
        if (symH) out.add(x + ',' + (H - 1 - y));
        if (sym && symH) out.add((W - 1 - x) + ',' + (H - 1 - y)); }
      maskFromCells(out); }
    function selUp() { if (!selDrag) return;
      if (selDrag.mode === 'move' || selDrag.mode === 'scale') { if (selDrag.lifted) { commitFloat(); sel = sel ? normSel(sel.x0, sel.y0, sel.x1, sel.y1) : null; if (!sel) selMask = null; } }
      else if (!selDrag.moved) sel = null;
      else { symmetrizeSelection(); if (sel && !selHinted) { selHinted = true; toast('Рисование теперь только внутри рамки'); } }
      selDrag = null; syncSelbar(); render(); }
    const inMask = (x, y) => !selMask || selMask.has(x + ',' + y);
    function fragFromSel() { const g = G(), f = [];
      for (let y = sel.y0; y <= sel.y1; y++) { const row = []; for (let x = sel.x0; x <= sel.x1; x++) { const c = inMask(x, y) ? g[y][x] : null; row.push(c ? c.slice() : null); } f.push(row); } return f; }
    function deleteSelContent() { const g = G(); let any = false;
      for (let y = sel.y0; y <= sel.y1 && !any; y++) for (let x = sel.x0; x <= sel.x1; x++) if (g[y][x] && inMask(x, y)) { any = true; break; }
      if (!any) return false; snapshot();
      for (let y = sel.y0; y <= sel.y1; y++) for (let x = sel.x0; x <= sel.x1; x++) if (inMask(x, y)) g[y][x] = null;
      markDirty(cur); render(); afterStroke(); return true; }
    function fillSelection() { if (!sel) return; snapshot(); const g = G(); let n = 0;
      for (let y = sel.y0; y <= sel.y1; y++) for (let x = sel.x0; x <= sel.x1; x++) {
        if (!inMask(x, y)) continue; g[y][x] = [active[0], active[1], active[2], 255]; n++; }
      markDirty(cur); render(); afterStroke(); toast('Залито: ' + n + ' пикс.'); }
    function selectColorPixels(col) { const g = G(); const mask = new Set(); let n = 0;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = g[y][x];
        if (c && eqc(c, col)) { mask.add(x + ',' + y); n++;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      if (!n) { toast('На активном слое нет этого цвета'); return; }
      sel = { x0, y0, x1, y1 }; selMask = mask; symmetrizeSelection(); syncSelbar(); render();
      toast(`Выделено: ${n} пикс. — крась, тащи или жми заливку`); }
    function maskFromCells(set) { let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (const k of set) { const ci = k.indexOf(','), x = +k.slice(0, ci), y = +k.slice(ci + 1);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { deselect(); return; } sel = { x0, y0, x1, y1 }; selMask = set; syncSelbar(); render(); }
    function selectLayerContent() { const g = G(), mask = new Set(); // всё непустое на активном слое
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) mask.add(x + ',' + y);
      if (!mask.size) { deselect(); toast('Слой пуст'); return; }
      maskFromCells(mask); symmetrizeSelection(); toast('Выделено всё на слое: ' + mask.size + ' пикс.'); }
    function invertSelection() { const inSelNow = (x, y) => selMask ? selMask.has(x + ',' + y) : (sel && x >= sel.x0 && x <= sel.x1 && y >= sel.y0 && y <= sel.y1);
      const mask = new Set();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!inSelNow(x, y)) mask.add(x + ',' + y);
      if (!mask.size) { deselect(); toast('Инверсия: выделено всё → ничего'); return; }
      maskFromCells(mask); toast('Выделение инвертировано'); }
    let clip = null;
    function doCopy() { clip = sel ? fragFromSel() : cloneGrid(G()); toast(sel ? 'Выделение скопировано' : 'Слой скопирован'); }
    function doCut() { clip = sel ? fragFromSel() : cloneGrid(G()); toast((sel ? deleteSelContent() : clearLayer()) ? 'Вырезано' : 'Тут пусто'); }
    function doPaste() { if (!clip) { toast('Буфер пуст'); return; } snapshot();
      const px = sel ? sel.x0 : 0, py = sel ? sel.y0 : 0, asNew = layers.length < 8;
      let g;
      if (asNew) { const nl = newLayer('Вставка'); nl.fid = layers[cur].fid; // вставка — на новый слой
        layers.splice(cur + 1, 0, nl); cur++; marked.clear(); dirtyAll(); g = nl.grid; }
      else g = G(); // достигнут лимит слоёв — кладём в активный
      for (let y = 0; y < clip.length; y++) for (let x = 0; x < clip[y].length; x++) { const c = clip[y][x]; if (!c) continue;
        const yy = py + y, xx = px + x; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; g[yy][xx] = c.slice(); }
      sel = normSel(px, py, px + clip[0].length - 1, py + clip.length - 1);
      markDirty(cur); syncSelbar(); layList(); render(); afterStroke(); toast(asNew ? 'Вставлено на новый слой' : 'Вставлено'); }
    function doDelete() { if (sel ? deleteSelContent() : clearLayer()) toast(sel ? 'Выделение удалено' : 'Слой очищен'); }

    // ---- ввод: 1 палец — рисование/тап; 2 пальца — зум/панорама или тап-отмена; 3 пальца — повтор;
