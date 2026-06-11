    let impData = null, impGrid = null, impTimer = null, impSrcImg = null;
    function openImport(file) {
      if (!file) return;
      const im = new Image();
      im.onerror = () => toast('Не удалось открыть картинку');
      im.onload = () => {
        impSrcImg = im; // оригинал в натуральном размере — для «вставить как есть»
        const MAX = 600, k = Math.min(1, MAX / Math.max(im.naturalWidth, im.naturalHeight));
        const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
        impData = x.getImageData(0, 0, w, h);
        $('imp-ovl').classList.add('on'); impConvert();
      };
      im.src = URL.createObjectURL(file);
    }
    function looksPixelArt(im) { // эвристика: мало цветов и/или маленький размер → это уже пиксель-арт
      const w = im.naturalWidth, h = im.naturalHeight;
      if (Math.max(w, h) <= 96) return true;
      const SAMP = 220, k = Math.min(1, SAMP / Math.max(w, h));
      const sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k));
      const c = document.createElement('canvas'); c.width = sw; c.height = sh;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, sw, sh);
      const d = x.getImageData(0, 0, sw, sh).data, colors = new Set();
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 8) continue;
        colors.add((d[i] >> 2) + ',' + (d[i + 1] >> 2) + ',' + (d[i + 2] >> 2));
        if (colors.size > 180) return false; } // много цветов (фото/градиенты) — не пиксель-арт
      return true;
    }
    function insertPixelImage(im) { // вставить как есть в натуральном размере, не уменьшая
      const iw = im.naturalWidth, ih = im.naturalHeight;
      const c = document.createElement('canvas'); c.width = iw; c.height = ih;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, iw, ih).data;
      snapshot();
      const nW = Math.max(W, iw), nH = Math.max(H, ih); // холст меньше картинки — расширяем (картинку не трогаем)
      if (nW !== W || nH !== H) { const pl = (nW - W) >> 1, pt = (nH - H) >> 1; expandCanvas(pl, pt, nW - W - pl, nH - H - pt); }
      if (layers.length >= 8) { restore(undoStack.pop()); toast('Максимум 8 слоёв — удали лишние'); return; }
      const nl = newLayer('Картинка'); nl.fid = layers[cur].fid;
      const ox2 = (W - iw) >> 1, oy2 = (H - ih) >> 1; // по центру холста
      for (let y = 0; y < ih; y++) for (let xx = 0; xx < iw; xx++) { const o = (y * iw + xx) * 4;
        if (d[o + 3] < 8) continue; nl.grid[oy2 + y][ox2 + xx] = [d[o], d[o + 1], d[o + 2], d[o + 3]]; }
      layers.splice(cur + 1, 0, nl); cur++; marked.clear(); dirtyAll(); layList(); fitView(); toast(`Вставлено ${iw}×${ih}`);
    }
    function dropImage(file) { if (!file) return;
      const im = new Image(); im.onerror = () => toast('Не удалось открыть картинку');
      im.onload = () => { if (looksPixelArt(im)) insertPixelImage(im); else openImport(file); }; // пиксель — вставить, иначе пикселизатор
      im.src = URL.createObjectURL(file); }
    (function dropWire() { let depth = 0;
      const show = (on) => $('dropmask').classList.toggle('on', on);
      window.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
      window.addEventListener('dragenter', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); depth++; show(true); } });
      window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) show(false); });
      window.addEventListener('drop', (e) => { e.preventDefault(); depth = 0; show(false);
        const f = e.dataTransfer && [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
        if (f) dropImage(f); else if (e.dataTransfer && e.dataTransfer.files.length) toast('Это не картинка'); });
    })();
    function impConvert() {
      if (!impData) return;
      const colors = +$('imp-colors').value, detail = +$('imp-cell').value, bgtol = +$('imp-bgtol').value;
      const cell = detail > 0 ? impData.width / detail : 0; // «Детализация» = ширина результата в клетках
      const r = sampleGrid({ w: impData.width, h: impData.height, ch: 4, data: impData.data }, cell, bgtol);
      let g = r.grid;
      if (colors > 0 && r.samples.length) { const pal = medianCut(r.samples, colors); g = g.map((row) => row.map((c) => (c ? nearest(c, pal) : null))); }
      if ($('imp-sym').checked) g = symmetrizeV(g, r.nx, r.ny);
      if ($('imp-clean').checked) g = despeckle(g, r.nx, r.ny);
      impGrid = g; drawTo($('imp-prev'), g, r.nx, r.ny);
    }
    const impSoon = () => { clearTimeout(impTimer); impTimer = setTimeout(impConvert, 60); };
    function rotateImp() { // поворот исходника на 90° до конвертации (симметрия применится после)
      if (!impData) return;
      const w = impData.width, h = impData.height;
      const a = document.createElement('canvas'); a.width = w; a.height = h; a.getContext('2d').putImageData(impData, 0, 0);
      const b2 = document.createElement('canvas'); b2.width = h; b2.height = w;
      const x = b2.getContext('2d'); x.translate(h, 0); x.rotate(Math.PI / 2); x.drawImage(a, 0, 0);
      impData = x.getImageData(0, 0, h, w); impConvert(); }
    function drawTo(cvp, g, nx, ny) {
      const dpr = window.devicePixelRatio || 1, cw = cvp.clientWidth, chh = cvp.clientHeight;
      if (cvp.width !== Math.round(cw * dpr)) { cvp.width = Math.round(cw * dpr); cvp.height = Math.round(chh * dpr); }
      const c = cvp.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;
      c.fillStyle = '#101014'; c.fillRect(0, 0, cw, chh);
      const z = Math.max(1, Math.floor(Math.min((cw - 8) / nx, (chh - 8) / ny))), ox = Math.floor((cw - nx * z) / 2), oy = Math.floor((chh - ny * z) / 2);
      for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { const col = g[y][x]; c.fillStyle = col ? rgb(col) : (((x + y) & 1) ? '#222228' : '#1a1a20'); c.fillRect(ox + x * z, oy + y * z, z, z); }
    }
    function applyImport() {
      if (!impGrid) return;
      const g = cropEmpty(impGrid.map((r) => r.map((c) => (c ? c.slice() : null))));
      W = g[0].length; H = g.length;
      layerSeq = 1; layers = [{ name: 'Слой 1', grid: g, opacity: 1, visible: true, fid: null, ext: new Map() }]; cur = 0;
      folders = []; folderSeq = 0; marked.clear();
      palette = paletteFromGrid(g); if (palette.length) active = palette[0];
      sym = $('imp-sym').checked; $('sym').classList.toggle('on', sym);
      undoStack.length = redoStack.length = 0; dirtyAll();
      refreshActive(); buildPalette(); setTool('pencil'); layList();
      $('imp-ovl').classList.remove('on'); fitView();
      toast(`Готово: ${W}×${H} — рисуй!`);
    }

    // ---- экспорт PNG (прозрачный фон, все видимые слои) ----
