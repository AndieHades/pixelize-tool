    let lcs = []; const dirtySet = new Set();
    const markDirty = (i) => dirtySet.add(i);
    function dirtyAll() { lcs = []; dirtySet.clear(); }
    function layerCanvas(i) { let c = lcs[i];
      if (!c) { c = document.createElement('canvas'); lcs[i] = c; dirtySet.add(i); }
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; dirtySet.add(i); }
      if (dirtySet.has(i)) { const x = c.getContext('2d'), id = x.createImageData(W, H), g = layers[i].grid;
        for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const cc = g[y][xx]; if (!cc) continue;
          const o = (y * W + xx) * 4; id.data[o] = cc[0]; id.data[o + 1] = cc[1]; id.data[o + 2] = cc[2]; id.data[o + 3] = cc.length > 3 ? cc[3] : 255; }
        x.putImageData(id, 0, 0); dirtySet.delete(i); }
      return c; }
    function compositeAt(x, y) { let r = 0, g = 0, b = 0, a = 0;
      for (let i = 0; i < layers.length; i++) { const L = layers[i]; if (!effVis(i) || L.opacity <= 0) continue; const c = L.grid[y] && L.grid[y][x]; if (!c) continue;
        let la = L.opacity * (c.length > 3 ? c[3] / 255 : 1);
        const cb = clipBase(i); if (L.clip) { const bc = cb >= 0 && effVis(cb) ? layers[cb].grid[y][x] : null;
          if (!bc) continue; la *= (bc.length > 3 ? bc[3] / 255 : 1); }
        r = c[0] * la + r * (1 - la); g = c[1] * la + g * (1 - la); b = c[2] * la + b * (1 - la); a = la + a * (1 - la); }
      return a > 0.02 ? [Math.round(r), Math.round(g), Math.round(b)] : null; }

    let chkTile = null;
    function checkerPattern() { // 2×2 тайл по 1px, масштабируется паттерном до z — клетки точно ложатся на сетку при любом зуме
      if (!chkTile) { chkTile = document.createElement('canvas'); chkTile.width = chkTile.height = 2;
        const x = chkTile.getContext('2d');
        x.fillStyle = '#1a1a20'; x.fillRect(0, 0, 2, 2);
        x.fillStyle = '#222228'; x.fillRect(1, 0, 1, 1); x.fillRect(0, 1, 1, 1); }
      const p = ctx.createPattern(chkTile, 'repeat');
      if (p && p.setTransform) p.setTransform(new DOMMatrix([view.zoom, 0, 0, view.zoom, 0, 0]));
      return p; }
    function render() {
      const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth, chh = cv.clientHeight;
      if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(chh * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0d0d10'; ctx.fillRect(0, 0, cw, chh);
      const z = view.zoom, ox = view.ox, oy = view.oy;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20;
      ctx.fillStyle = '#141419'; ctx.fillRect(ox, oy, W * z, H * z); ctx.restore();
      ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = checkerPattern();
      ctx.fillRect(0, 0, W * z, H * z); ctx.restore();
      const iox = cropMode ? cropMode.idx * z : 0, ioy = cropMode ? cropMode.idy * z : 0; // сдвиг рисунка в кроп-режиме
      for (let i = 0; i < layers.length; i++) { const L = layers[i]; if (!effVis(i) || L.opacity <= 0) continue;
        const cb = clipBase(i); if (L.clip && (cb < 0 || !effVis(cb))) continue; // обтравка без базы не видна
        ctx.globalAlpha = L.opacity;
        ctx.drawImage(cb >= 0 ? clippedCanvas(i, cb) : layerCanvas(i), ox + iox, oy + ioy, W * z, H * z); }
      ctx.globalAlpha = 1;
      if (z >= 7) {
        ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let x = 0; x <= W; x++) { ctx.moveTo(ox + x * z, oy); ctx.lineTo(ox + x * z, oy + H * z); }
        for (let y = 0; y <= H; y++) { ctx.moveTo(ox, oy + y * z); ctx.lineTo(ox + W * z, oy + y * z); }
        ctx.stroke();
      }
      if (sym) { const ax = ox + (W / 2) * z; ctx.strokeStyle = 'rgba(61,139,253,.85)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(ax, oy - 8); ctx.lineTo(ax, oy + H * z + 8); ctx.stroke(); ctx.setLineDash([]); }
      if (symH) { const ay = oy + (H / 2) * z; ctx.strokeStyle = 'rgba(61,139,253,.85)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(ox - 8, ay); ctx.lineTo(ox + W * z + 8, ay); ctx.stroke(); ctx.setLineDash([]); }
      if (linePrev) { ctx.globalAlpha = .6; ctx.fillStyle = rgb(active); // превью линии/прямоугольника
        const s = brushes.pencil.size, off = s >> 1;
        const sa = symA(), sha = symHA();
        const paint = (px2, py2) => { for (let dy2 = 0; dy2 < s; dy2++) for (let dx2 = 0; dx2 < s; dx2++) {
          const xx = px2 - off + dx2, yy = py2 - off + dy2;
          ctx.fillRect(ox + xx * z, oy + yy * z, z, z);
          if (sa) ctx.fillRect(ox + (W - 1 - xx) * z, oy + yy * z, z, z);
          if (sha) ctx.fillRect(ox + xx * z, oy + (H - 1 - yy) * z, z, z);
          if (sa && sha) ctx.fillRect(ox + (W - 1 - xx) * z, oy + (H - 1 - yy) * z, z, z); } };
        if (tool === 'rect') rectEdges(linePrev[0], linePrev[1], linePrev[2], linePrev[3], paint);
        else bres(linePrev[0], linePrev[1], linePrev[2], linePrev[3], paint);
        ctx.globalAlpha = 1; }
      if (outPreview && $('outpop').classList.contains('on')) { // призрак будущей обводки
        const oc = hexToRgb($('out-col').value); ctx.fillStyle = rgb(oc); ctx.globalAlpha = (+$('out-op').value / 100) * .8;
        for (const p of outPreview) ctx.fillRect(ox + p[0] * z, oy + p[1] * z, z, z);
        ctx.globalAlpha = 1; }
      if (selFloat) { for (const [k, c] of selFloat.cells) { const ci = k.indexOf(','), dx = +k.slice(0, ci), dy = +k.slice(ci + 1);
        ctx.fillStyle = rgb(c); ctx.fillRect(ox + (selFloat.x + dx) * z, oy + (selFloat.y + dy) * z, z, z); } }
      if (sel && !selMask) { const sx = ox + sel.x0 * z, sy = oy + sel.y0 * z, sw = (sel.x1 - sel.x0 + 1) * z, sh = (sel.y1 - sel.y0 + 1) * z;
        if (!selFloat) { ctx.fillStyle = 'rgba(0,0,0,.28)'; // затемнение вне выделения
          ctx.fillRect(ox, oy, W * z, Math.max(0, sy - oy)); ctx.fillRect(ox, sy + sh, W * z, Math.max(0, oy + H * z - sy - sh));
          ctx.fillRect(ox, Math.max(sy, oy), Math.max(0, sx - ox), sh); ctx.fillRect(sx + sw, Math.max(sy, oy), Math.max(0, ox + W * z - sx - sw), sh); }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
        ctx.strokeRect(sx + .75, sy + .75, sw - 1.5, sh - 1.5); ctx.setLineDash([]); }
      if (sel && selMask && !selFloat) { // контур маски: пунктир по границе выделенных пикселей
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]); ctx.beginPath();
        for (const k of selMask) { const ci = k.indexOf(','), x = +k.slice(0, ci), y = +k.slice(ci + 1);
          const sx = ox + x * z, sy = oy + y * z;
          if (!selMask.has(x + ',' + (y - 1))) { ctx.moveTo(sx, sy); ctx.lineTo(sx + z, sy); }
          if (!selMask.has(x + ',' + (y + 1))) { ctx.moveTo(sx, sy + z); ctx.lineTo(sx + z, sy + z); }
          if (!selMask.has((x - 1) + ',' + y)) { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + z); }
          if (!selMask.has((x + 1) + ',' + y)) { ctx.moveTo(sx + z, sy); ctx.lineTo(sx + z, sy + z); } }
        ctx.stroke(); ctx.setLineDash([]); }
      if (sel && !selFloat && tool === 'select') { // ручки растяжения
        const hx = ox + sel.x0 * z, hy = oy + sel.y0 * z, hw = (sel.x1 - sel.x0 + 1) * z, hh = (sel.y1 - sel.y0 + 1) * z, hs = 7;
        ctx.fillStyle = '#fff';
        for (const p of [[hx, hy], [hx + hw, hy], [hx, hy + hh], [hx + hw, hy + hh],
          [hx + hw / 2, hy], [hx + hw / 2, hy + hh], [hx, hy + hh / 2], [hx + hw, hy + hh / 2]])
          ctx.fillRect(p[0] - hs / 2, p[1] - hs / 2, hs, hs); }
      if (replaceMode) { ctx.fillStyle = 'rgba(61,139,253,.5)'; // подсветка пикселей выбранного цвета
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          let hit = false; for (let i = 0; i < layers.length; i++) { if (!effVis(i)) continue; const c = layers[i].grid[y][x]; if (c && eqc(c, replaceMode.from)) { hit = true; break; } }
          if (hit) ctx.fillRect(ox + x * z, oy + y * z, z, z); } }
      if (cropMode) { const x = ox + cropMode.x0 * z, y = oy + cropMode.y0 * z,
          w = (cropMode.x1 - cropMode.x0 + 1) * z, h = (cropMode.y1 - cropMode.y0 + 1) * z;
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.fillRect(ox, oy, W * z, y - oy); ctx.fillRect(ox, y + h, W * z, oy + H * z - y - h);
        ctx.fillRect(ox, y, x - ox, h); ctx.fillRect(x + w, y, ox + W * z - x - w, h);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.fillStyle = '#fff';
        const hs = Math.min(18, h - 4), ws = Math.min(18, w - 4), hw = 5, cs = 10; // боковые маркеры и углы
        ctx.fillRect(x - hw / 2, y + h / 2 - hs / 2, hw, hs); ctx.fillRect(x + w - hw / 2, y + h / 2 - hs / 2, hw, hs);
        ctx.fillRect(x + w / 2 - ws / 2, y - hw / 2, ws, hw); ctx.fillRect(x + w / 2 - ws / 2, y + h - hw / 2, ws, hw);
        for (const p of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) ctx.fillRect(p[0] - cs / 2, p[1] - cs / 2, cs, cs);
      }
      if (hoverPx && !cropMode && !selFloat && (tool === 'pencil' || tool === 'eraser' || tool === 'line')) {
        const s = brushes[tool === 'eraser' ? 'eraser' : 'pencil'].size, off2 = s >> 1; // контур кисти
        const bx = ox + (hoverPx[0] - off2) * z, by2 = oy + (hoverPx[1] - off2) * z;
        ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 3; ctx.strokeRect(bx - .5, by2 - .5, s * z + 1, s * z + 1);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.strokeRect(bx - .5, by2 - .5, s * z + 1, s * z + 1);
      }
      syncStatus(); syncPrev();
    }
    function syncStatus() { let s = W + '×' + H + ' px';
      if (cropMode) { const c = cropMode, b = c.b || c;
        s += ' · кроп ' + (c.x1 - c.x0 + 1) + '×' + (c.y1 - c.y0 + 1);
        const fmt = (d) => (d > 0 ? '+' + d : d), parts = []; // + наружу (расширил), − внутрь (обрезал)
        const dl = b.x0 - c.x0, dr = c.x1 - b.x1, dt = b.y0 - c.y0, db = c.y1 - b.y1;
        if (dl) parts.push('←' + fmt(dl)); if (dr) parts.push('→' + fmt(dr));
        if (dt) parts.push('↑' + fmt(dt)); if (db) parts.push('↓' + fmt(db));
        if (parts.length) s += '  ' + parts.join(' ');
        if (c.idx || c.idy) s += ' · сдвиг ' + c.idx + ',' + c.idy; }
      else if (sel) s += ' · выдел. ' + (sel.x1 - sel.x0 + 1) + '×' + (sel.y1 - sel.y0 + 1);
      const el = $('status'); if (el.textContent !== s) el.textContent = s; }

    function fitView() {
      const cw = cv.clientWidth, chh = cv.clientHeight;
      const tb = $('topbar').getBoundingClientRect(), pb = $('palbar').getBoundingClientRect(), sb = $('sidebar').getBoundingClientRect();
      const mt = tb.bottom + 16, ml = Math.max(sb.right + 14, 20), mr = 20;
      const mb = (pb.top > chh * 0.55 && pb.bottom > chh - 40) ? (chh - pb.top) + 16 : 24; // палитру учитываем, только если она у низа
      view.zoom = Math.max(1, Math.floor(Math.min((cw - ml - mr) / W, (chh - mt - mb) / H)));
      view.ox = Math.round(ml + (cw - ml - mr - W * view.zoom) / 2);
      view.oy = Math.round(mt + (chh - mt - mb - H * view.zoom) / 2);
      render();
    }

    // ---- undo/redo: снимок всего документа (слои + размеры) ----
