    //      долгий тап — пипетка; перо/мышь рисуют сразу (палм-реджект для Apple Pencil) ----
    const ptrs = new Map();
    let last = null, pinch = null, stroke = false, gMaxN = 0, gMoved = false, gT0 = 0, gDownX = 0, gDownY = 0, gHoldTimer = null, gHeld = false;
    const toGrid = (e) => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left - view.ox) / view.zoom), Math.floor((e.clientY - r.top - view.oy) / view.zoom)]; };
    function beginStroke() { snapshot(); stroke = true; ppPath = []; ppOrig = new Map(); }
    function cancelStroke() { if (!stroke) return; if (undoStack.length) restore(undoStack.pop()); stroke = false; last = null; }
    function afterStroke() { if ($('lay-pop').classList.contains('on')) layList(); }

    let penActive = false, directDrawing = false, directLast = null, rdrag = null;
    function directDown(e) {
      if (e.pointerType === 'mouse' && e.button === 2 && tool === 'move') { // Move работает и правой кнопкой
        cv.setPointerCapture(e.pointerId); const [mgx, mgy] = toGrid(e);
        moveDrag = { sx: mgx, sy: mgy, dx: 0, dy: 0, idxs: moveTargets() }; return; }
      if (e.pointerType === 'mouse' && (e.button === 2 || e.button === 1)) { // ПКМ/СКМ: драг — пан, тап ПКМ — меню слоёв
        cv.setPointerCapture(e.pointerId);
        rdrag = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy, moved: false, btn: e.button }; return; }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cv.setPointerCapture(e.pointerId); if (e.pointerType === 'pen') penActive = true;
      const [gx, gy] = toGrid(e);
      if (cropMode) { cropDown(e); return; }
      if (e.altKey) { pickAt(gx, gy); return; } // Alt+клик — пипетка, инструмент не меняется
      if (tool === 'move') { moveDrag = { sx: gx, sy: gy, dx: 0, dy: 0, idxs: moveTargets() }; return; } // двигаем слой(и) целиком
      if (tool === 'select') { selDown(gx, gy, e); selDirect = true; return; }
      if (tool === 'pick') { pickAt(gx, gy); setTool('pencil'); return; }
      if (tool === 'fill') { snapshot(); stamp(gx, gy); render(); afterStroke(); return; }
      if (tool === 'line' || tool === 'rect') { lineStart = [gx, gy]; linePrev = [gx, gy, gx, gy]; directDrawing = true; render(); return; }
      beginStroke(); stabPt = { x: e.clientX, y: e.clientY }; stamp(gx, gy); directLast = [gx, gy]; directDrawing = true; render();
    }
    function directMove(e) {
      if (e.pointerType !== 'touch') { const [hgx, hgy] = toGrid(e); hoverPx = [hgx, hgy]; }
      if (rdrag) { const dx = e.clientX - rdrag.x, dy = e.clientY - rdrag.y;
        if (Math.hypot(dx, dy) > 6) rdrag.moved = true;
        if (rdrag.moved) { view.ox = rdrag.ox + dx; view.oy = rdrag.oy + dy; render(); } return; }
      if (cropDrag) { cropMovePt(e); return; }
      if (moveDrag) { const [gx, gy] = toGrid(e); moveDrag.dx = gx - moveDrag.sx; moveDrag.dy = gy - moveDrag.sy; render(); return; }
      if (cropMode) { if (e.pointerType === 'mouse') cv.style.cursor = cropCursor(cropZone(e)); return; } // курсор-подсказка на гранях
      if (!selDirect && tool === 'select' && sel && !selFloat && e.pointerType === 'mouse' && !directDrawing) {
        const zn = selZone(e); cv.style.cursor = zn ? cropCursor(zn) : ''; }
      if (selDirect) { const [gx, gy] = toGrid(e); selMove(gx, gy); return; }
      if (directDrawing && (tool === 'line' || tool === 'rect')) { const [gx, gy] = toGrid(e); linePrev = [lineStart[0], lineStart[1], gx, gy]; render(); return; }
      if (!directDrawing) { render(); return; } // перерисовка ради контура кисти под курсором
      const [sx2, sy2] = smoothPt(e), pt = { clientX: sx2, clientY: sy2 };
      const [gx, gy] = toGrid(pt); if (directLast) line(directLast[0], directLast[1], gx, gy); else stamp(gx, gy); directLast = [gx, gy]; render(); }
    function directUp(e) { if (e.pointerType === 'pen') penActive = false; stabPt = null;
      if (rdrag) { if (!rdrag.moved && rdrag.btn === 2) openLayerMenu(e.clientX, e.clientY); rdrag = null; return; }
      cropDrag = null;
      if (moveDrag) { commitMove(); return; }
      if (selDirect) { selUp(); selDirect = false; }
      if (directDrawing && (tool === 'line' || tool === 'rect') && linePrev) commitLine();
      directDrawing = false; directLast = null; stroke = false; afterStroke(); }

    cv.addEventListener('pointerdown', (e) => {
      if (replaceMode) { replaceMode = null; render(); toast('Перекраска отменена'); return; }
      $('brushpop').classList.remove('on'); $('outpop').classList.remove('on'); bcCancel(); // панель слоёв НЕ закрываем — можно рисовать с открытой
      if (e.pointerType !== 'touch') { directDown(e); return; }
      if (penActive) return;
      cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      gMaxN = Math.max(gMaxN, ptrs.size);
      if (ptrs.size === 1) {
        gT0 = performance.now(); gMoved = false; gHeld = false; gDownX = e.clientX; gDownY = e.clientY; last = null;
        clearTimeout(gHoldTimer);
        if (cropMode) cropDown(e);
        else gHoldTimer = setTimeout(() => { if (ptrs.size === 1 && !gMoved && !stroke) { gHeld = true; const [gx, gy] = toGrid({ clientX: gDownX, clientY: gDownY }); pickAt(gx, gy); } }, 450);
      } else if (ptrs.size === 2) { clearTimeout(gHoldTimer); if (stroke) cancelStroke(); cropDrag = null;
        if (selDrag) { if (selDrag.lifted) commitFloat(); selDrag = null; syncSelbar(); } startPinch(); }
    });
    cv.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch') { directMove(e); return; }
      if (penActive || !ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size >= 2) { doPinch(); return; }
      if (cropMode) { if (cropDrag) cropMovePt(e); return; }
      if (Math.hypot(e.clientX - gDownX, e.clientY - gDownY) > 6) { gMoved = true; clearTimeout(gHoldTimer); }
      if (gMoved && !gHeld && tool === 'move') {
        if (!moveDrag) { const [sx0, sy0] = toGrid({ clientX: gDownX, clientY: gDownY }); moveDrag = { sx: sx0, sy: sy0, dx: 0, dy: 0, idxs: moveTargets() }; }
        const [gx, gy] = toGrid(e); moveDrag.dx = gx - moveDrag.sx; moveDrag.dy = gy - moveDrag.sy; render(); return;
      }
      if (gMoved && !gHeld && tool === 'select') {
        if (!selDrag) { const [sx0, sy0] = toGrid({ clientX: gDownX, clientY: gDownY }); selDown(sx0, sy0, { clientX: gDownX, clientY: gDownY }); }
        const [gx, gy] = toGrid(e); selMove(gx, gy); return;
      }
      if (gMoved && !gHeld && (tool === 'line' || tool === 'rect')) {
        if (!lineStart) lineStart = toGrid({ clientX: gDownX, clientY: gDownY });
        const [gx, gy] = toGrid(e); linePrev = [lineStart[0], lineStart[1], gx, gy]; render(); return;
      }
      if (gMoved && !gHeld && (tool === 'pencil' || tool === 'eraser')) {
        if (!stroke) { beginStroke(); stabPt = { x: gDownX, y: gDownY }; const [sx, sy] = toGrid({ clientX: gDownX, clientY: gDownY }); stamp(sx, sy); last = [sx, sy]; }
        const [px2, py2] = smoothPt(e);
        const [gx, gy] = toGrid({ clientX: px2, clientY: py2 }); if (last) line(last[0], last[1], gx, gy); else stamp(gx, gy); last = [gx, gy]; render();
      }
    });
    function endPtr(e) {
      if (e.pointerType !== 'touch') { directUp(e); return; }
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      clearTimeout(gHoldTimer);
      if (ptrs.size > 0) { if (ptrs.size < 2) pinch = null; return; }
      const dur = performance.now() - gT0;
      stabPt = null;
      if (cropMode) { cropDrag = null; }
      else if (moveDrag) commitMove();
      else if (selDrag) selUp();
      else if (linePrev) commitLine();
      else if (stroke) { stroke = false; afterStroke(); }
      else if (gHeld) { /* цвет уже выбран удержанием */ }
      else if (!gMoved && dur < 350) {
        if (gMaxN === 1) { const [gx, gy] = toGrid({ clientX: gDownX, clientY: gDownY });
          if (tool === 'select') { if (!(sel && gx >= sel.x0 && gx <= sel.x1 && gy >= sel.y0 && gy <= sel.y1)) deselect(); }
          else if (tool === 'move') { /* тап — ничего */ }
          else if (tool === 'pick') { stamp(gx, gy); } else { snapshot(); stamp(gx, gy); render(); afterStroke(); } }
        else if (gMaxN === 2) doUndo();
        else if (gMaxN >= 3) doRedo();
      }
      gMaxN = 0; gMoved = false; gHeld = false; pinch = null; last = null;
    }
    cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
    cv.addEventListener('pointerleave', () => { if (hoverPx) { hoverPx = null; render(); } });
    function pts() { return [...ptrs.values()]; }
    function startPinch() { const p = pts(); const mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }; const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      const r = cv.getBoundingClientRect(); const wx = (mid.x - r.left - view.ox) / view.zoom, wy = (mid.y - r.top - view.oy) / view.zoom;
      pinch = { d, zoom: view.zoom, wx, wy, mx: mid.x, my: mid.y }; }
    function doPinch() { if (!pinch) { startPinch(); return; } const p = pts(); const mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); const r = cv.getBoundingClientRect();
      if (Math.abs(d - pinch.d) > 12 || Math.hypot(mid.x - pinch.mx, mid.y - pinch.my) > 12) gMoved = true; // настоящий щипок — не «тап-отмена»
      view.zoom = Math.max(1, Math.min(48, pinch.zoom * (d / pinch.d)));
      view.ox = (mid.x - r.left) - pinch.wx * view.zoom; view.oy = (mid.y - r.top) - pinch.wy * view.zoom; render(); }
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const wx = (mx - view.ox) / view.zoom, wy = (my - view.oy) / view.zoom; view.zoom = Math.max(1, Math.min(48, view.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      view.ox = mx - wx * view.zoom; view.oy = my - wy * view.zoom; render(); }, { passive: false });
    function zoomBy(f) { const cw = cv.clientWidth / 2, chh = cv.clientHeight / 2, wx = (cw - view.ox) / view.zoom, wy = (chh - view.oy) / view.zoom;
      view.zoom = Math.max(1, Math.min(48, view.zoom * f)); view.ox = cw - wx * view.zoom; view.oy = chh - wy * view.zoom; render(); }

    // ---- палитра / инструменты ----
