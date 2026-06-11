    // ---- общие утилиты: дедупликация повторяющейся логики разных систем ----
    const MAX_LAYERS = 8; // потолок числа слоёв в документе

    // ключ запасного пикселя "x,y" -> [x, y]
    const parseKey = (k) => { const ci = k.indexOf(','); return [+k.slice(0, ci), +k.slice(ci + 1)]; };

    // альфа-смешивание source-over: s поверх d, sa — доп. множитель альфы источника (0..1)
    function blendOver(s, d, sa) {
      const ta = sa * (s.length > 3 ? s[3] / 255 : 1);
      if (!d) return [s[0], s[1], s[2], Math.round(ta * 255)];
      const ba = d.length > 3 ? d[3] / 255 : 1, oa = ta + ba * (1 - ta);
      const f = (sc, dc) => Math.round((sc * ta + dc * ba * (1 - ta)) / oa);
      return [f(s[0], d[0]), f(s[1], d[1]), f(s[2], d[2]), Math.round(oa * 255)];
    }

    // охватывающий прямоугольник непустых клеток грид-сетки (или null)
    function gridBounds(g) { let minx = W, miny = H, maxx = -1, maxy = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) {
        if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
      return maxx < 0 ? null : { minx, miny, maxx, maxy }; }

    // композит всех видимых слоёв (с учётом обтравки) в произвольный 2D-контекст
    function compositeLayers(x) {
      for (let i = 0; i < layers.length; i++) { const L = layers[i]; if (!effVis(i) || L.opacity <= 0) continue;
        const cb = clipBase(i); if (L.clip && (cb < 0 || !effVis(cb))) continue;
        x.globalAlpha = L.opacity; x.drawImage(cb >= 0 ? clippedCanvas(i, cb) : layerCanvas(i), 0, 0); }
      x.globalAlpha = 1; }

    // вставить RGBA-картинку w×h новым слоем по центру холста (без snapshot/обновления UI)
    function placeImageLayer(w, h, d) {
      const nl = newLayer('Картинка'); nl.fid = layers[cur].fid;
      const ox = (W - w) >> 1, oy = (H - h) >> 1;
      for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const o = (y * w + xx) * 4;
        if (d[o + 3] < 8) continue; nl.grid[oy + y][ox + xx] = [d[o], d[o + 1], d[o + 2], d[o + 3]]; }
      layers.splice(cur + 1, 0, nl); cur++; marked.clear(); dirtyAll(); return nl; }

    // сохранение файла: системный диалог → share → (опц. оверлей на тач) → скачивание
    async function saveFile(b, name, mime, desc, overlayUrl = null) {
      if (window.showSaveFilePicker && !matchMedia('(pointer: coarse)').matches) {
        try { const ext = '.' + name.split('.').pop();
          const h = await showSaveFilePicker({ suggestedName: name, types: [{ description: desc, accept: { [mime]: [ext] } }] });
          const w = await h.createWritable(); await w.write(b); await w.close(); toast('Сохранено: ' + h.name); return; }
        catch (e) { if (e && e.name === 'AbortError') return; } }
      const file = new File([b], name, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      if (overlayUrl) { showSaveOverlay(overlayUrl); return; }
      const url = URL.createObjectURL(b), a = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); }

    // сделать сетку симметричной: зеркалим опорную половину на вторую по выбранным осям
    function symmetrizeGrid(g, v, h) {
      if (v) for (let y = 0; y < H; y++) for (let x = 0; x < (W >> 1); x++) { const mx = W - 1 - x; g[y][mx] = g[y][x] ? g[y][x].slice() : null; }
      if (h) for (let y = 0; y < (H >> 1); y++) for (let x = 0; x < W; x++) { const my = H - 1 - y; g[my][x] = g[y][x] ? g[y][x].slice() : null; }
    }

    // показать всплывающее меню m у точки (x, y), удерживая его в пределах экрана
    function showMenuAt(m, x, y, above = false) {
      m.style.visibility = 'hidden'; m.classList.add('on');
      requestAnimationFrame(() => { const r = m.getBoundingClientRect();
        m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
        m.style.top = Math.max(8, Math.min(above ? y - r.height - 10 : y, innerHeight - r.height - 8)) + 'px';
        m.style.visibility = ''; }); }
