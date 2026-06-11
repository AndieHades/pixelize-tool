    function setTool(t) { tool = t; lineStart = null; linePrev = null;
      for (const id of ['pencil', 'eraser', 'pick', 'fill', 'select', 'line', 'rect']) $('t-' + id).classList.toggle('on', id === t); render(); }
    function refreshActive() { $('active').style.background = rgb(active); }
    function buildPalette() { const box = $('pal'); box.innerHTML = '';
      $('palgrip').textContent = 'Палитра · ' + palette.length;
      let activeShown = false;
      palette.forEach((c, idx) => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = rgb(c); b.dataset.i = idx;
        const hex = rgbToHex(c); b.title = hex.toUpperCase();
        if (!activeShown && eqc(c, active)) { b.classList.add('on'); activeShown = true; } // только первый совпавший — не дублируем подсветку
        b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') showSwTip(b, hex); });
        b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideSwTipSoon(); });
        b.addEventListener('click', () => { clearTimeout(swHold);
          if (palSquelch) { palSquelch = false; return; } // клик после перетаскивания не выбирает цвет
          if ($('outpop').classList.contains('on')) { // окно обводки открыто — палитра задаёт его цвет
            const v = '#' + c.map((q) => q.toString(16).padStart(2, '0')).join('');
            $('out-col').value = v; $('out-colsw').style.background = v; return; }
          if (replaceMode) { const from = replaceMode.from; replaceMode = null; recolorAll(from, c.slice()); return; }
          active = c.slice(); refreshActive(); buildPalette(); setTool('pencil'); });
        b.addEventListener('contextmenu', (e) => e.preventDefault()); // меню открываем сами на ПКМ-тап
        b.addEventListener('pointerdown', (e) => { // перетаскивание ведём на документ-уровне (надёжно и для ПКМ)
          if (e.pointerType === 'touch') { swX = e.clientX; swY = e.clientY;
            clearTimeout(swHold); swHold = setTimeout(() => openCtx(swX, swY, idx), 480);
            palDrag = { b, idx, touch: true, x: e.clientX, y: e.clientY, moved: false }; }
          else if (e.button === 0) palDrag = { b, idx, x: e.clientX, y: e.clientY, moved: false };
          else if (e.button === 2) { e.preventDefault(); palDrag = { b, idx, rmb: true, x: e.clientX, y: e.clientY, moved: false }; } });
        box.appendChild(b); });
      const add = document.createElement('button'); add.className = 'sw plus'; add.title = 'Добавить активный цвет · долгий тап/ПКМ — выбрать новый';
      add.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
      add.addEventListener('click', () => { // плюсик кладёт текущий активный цвет в палитру
        if (palette.some((p) => eqc(p, active))) { toast('Этот цвет уже в палитре'); return; }
        palette.push(active.slice()); buildPalette(); toast('Цвет добавлен в палитру'); });
      add.addEventListener('contextmenu', (e) => { e.preventDefault(); $('picker').click(); }); // выбрать произвольный новый
      box.appendChild(add); }
    function palDragMove(e) { if (!palDrag) return; const pal = $('pal'), chip = $('paldrag');
      if (!palDrag.moved) { if (Math.hypot(e.clientX - palDrag.x, e.clientY - palDrag.y) <= 6) return;
        palDrag.moved = true; palDrag.b.classList.add('dragging'); clearTimeout(swHold);
        chip.style.background = palDrag.b.style.background; chip.classList.add('on'); }
      chip.style.left = e.clientX + 'px'; chip.style.top = e.clientY + 'px';
      const el = document.elementFromPoint(e.clientX, e.clientY), t = el && el.closest ? el.closest('#pal .sw:not(.plus)') : null;
      if (t && t !== palDrag.b) { const r = t.getBoundingClientRect();
        pal.insertBefore(palDrag.b, (e.clientX < r.left + r.width / 2) ? t : t.nextSibling); } }
    function palDragEnd(e) { if (!palDrag) return; clearTimeout(swHold);
      const d = palDrag; palDrag = null; d.b.classList.remove('dragging'); $('paldrag').classList.remove('on');
      if (d.moved) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0); // порядок берём из DOM
        palette = [...$('pal').querySelectorAll('.sw:not(.plus)')].map((el) => palette[+el.dataset.i]); buildPalette(); }
      else if (d.rmb) openCtx(e.clientX, e.clientY, d.idx); } // ПКМ без движения — меню
    document.addEventListener('pointermove', palDragMove);
    document.addEventListener('pointerup', palDragEnd);
    document.addEventListener('pointercancel', palDragEnd);
    function addColor(hex) { const c = hexToRgb(hex); if (!palette.some((p) => eqc(p, c))) palette.push(c); active = c; refreshActive(); buildPalette(); setTool('pencil'); }
    function recolorAll(from, to) { // заменить цвет на всех слоях и в палитре
      snapshot(); let n = 0;
      for (const L of layers) { const g = L.grid;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] && eqc(g[y][x], from)) { g[y][x] = to.slice(); n++; }
        for (const [k, c] of L.ext) if (eqc(c, from)) L.ext.set(k, to.slice()); }
      const pi = palette.findIndex((p) => eqc(p, from));
      if (pi >= 0) { if (palette.some((p, i) => i !== pi && eqc(p, to))) palette.splice(pi, 1); else palette[pi] = to.slice(); }
      if (eqc(active, from)) active = to.slice();
      refreshActive(); dirtyAll(); buildPalette(); render(); afterStroke(); toast(n ? `Перекрашено: ${n} пикс.` : 'Цвет заменён в палитре'); }
    function startReplace(from) { replaceMode = { from: from.slice() }; render(); toast('Пиксели подсвечены — тапни новый цвет в палитре'); }
    function openCtx(x, y, idx) { ctxIdx = idx; const m = $('ctx'); m.style.visibility = 'hidden'; m.classList.add('on');
      requestAnimationFrame(() => { const r = m.getBoundingClientRect();
        m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
        m.style.top = Math.max(8, Math.min(y - r.height - 10, innerHeight - r.height - 8)) + 'px';
        m.style.visibility = ''; }); }
    document.addEventListener('pointerdown', (e) => { // клик мимо меню закрывает его
      for (const id of ['ctx', 'lctx', 'cctx', 'dctx', 'tctx']) { const m = $(id);
        if (m.classList.contains('on') && !(e.target.closest && e.target.closest('#' + id))) m.classList.remove('on'); } }, true);
    $('ctx').addEventListener('click', (e) => { const btn = e.target.closest('button'); if (!btn) return;
      const col = palette[ctxIdx]; $('ctx').classList.remove('on'); if (!col) return;
      if (btn.dataset.act === 'copy') { const h = rgbToHex(col).toUpperCase(); copyText(h).then(() => toast('Скопировано: ' + h)); }
      else if (btn.dataset.act === 'delete') { palette.splice(ctxIdx, 1); buildPalette(); toast('Цвет удалён из палитры'); }
      else if (btn.dataset.act === 'select') selectColorPixels(col);
      else if (btn.dataset.act === 'replace') { const r = $('repl'); replFrom = col.slice();
        r.value = '#' + col.map((v) => v.toString(16).padStart(2, '0')).join(''); r.click(); } });
    $('repl').addEventListener('change', (e) => { if (!replFrom) return; const from = replFrom; replFrom = null; recolorAll(from, hexToRgb(e.target.value)); });

    // ---- слои: список с папками, мультивыбор, операции ----
