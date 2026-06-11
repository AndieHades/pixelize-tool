    function setTool(t) { tool = t; lineStart = null; linePrev = null;
      for (const id of ['pencil', 'eraser', 'pick', 'fill', 'select', 'line', 'rect']) $('t-' + id).classList.toggle('on', id === t); render(); }
    function refreshActive() { $('active').style.background = rgb(active); }
    function buildPalette() { const box = $('pal'); box.innerHTML = '';
      $('palgrip').textContent = 'Палитра · ' + palette.length;
      palette.forEach((c, idx) => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = rgb(c); b.dataset.i = idx;
        if (eqc(c, active)) b.classList.add('on');
        b.addEventListener('click', () => { clearTimeout(swHold);
          if (palSquelch) { palSquelch = false; return; } // клик после перетаскивания не выбирает цвет
          if ($('outpop').classList.contains('on')) { // окно обводки открыто — палитра задаёт его цвет
            const v = '#' + c.map((q) => q.toString(16).padStart(2, '0')).join('');
            $('out-col').value = v; $('out-colsw').style.background = v; return; }
          if (replaceMode) { const from = replaceMode.from; replaceMode = null; recolorAll(from, c.slice()); return; }
          active = c.slice(); refreshActive(); buildPalette(); setTool('pencil'); });
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); openCtx(e.clientX, e.clientY, idx); }); // ПКМ — меню
        b.addEventListener('pointerdown', (e) => {
          if (e.pointerType === 'touch') { swX = e.clientX; swY = e.clientY;
            clearTimeout(swHold); swHold = setTimeout(() => openCtx(swX, swY, idx), 480); }
          else if (e.button === 0) { b.setPointerCapture(e.pointerId); // ЛКМ-драг — свободная перестановка
            palDrag = { x: e.clientX, y: e.clientY, moved: false }; } });
        b.addEventListener('pointermove', (e) => {
          if (palDrag) { if (!palDrag.moved && Math.hypot(e.clientX - palDrag.x, e.clientY - palDrag.y) > 6) { palDrag.moved = true; b.classList.add('dragging'); }
            if (!palDrag.moved) return;
            const el = document.elementFromPoint(e.clientX, e.clientY), t = el && el.closest ? el.closest('#pal .sw:not(.plus)') : null;
            if (t && t !== b) { const r = t.getBoundingClientRect();
              box.insertBefore(b, (e.clientX < r.left + r.width / 2) ? t : t.nextSibling); } }
          else if (swHold !== null && Math.hypot(e.clientX - swX, e.clientY - swY) > 8) clearTimeout(swHold); });
        const endSw = () => { clearTimeout(swHold); if (!palDrag) return;
          const moved = palDrag.moved; palDrag = null; b.classList.remove('dragging');
          if (moved) { palSquelch = true; // новый порядок берём прямо из DOM
            palette = [...box.querySelectorAll('.sw:not(.plus)')].map((el) => palette[+el.dataset.i]);
            buildPalette(); } };
        b.addEventListener('pointerup', endSw); b.addEventListener('pointercancel', endSw);
        box.appendChild(b); });
      const add = document.createElement('button'); add.className = 'sw plus'; add.title = 'Добавить цвет';
      add.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
      add.addEventListener('click', () => $('picker').click());
      box.appendChild(add); }
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
      for (const id of ['ctx', 'lctx', 'cctx', 'dctx']) { const m = $(id);
        if (m.classList.contains('on') && !(e.target.closest && e.target.closest('#' + id))) m.classList.remove('on'); } }, true);
    $('ctx').addEventListener('click', (e) => { const btn = e.target.closest('button'); if (!btn) return;
      const col = palette[ctxIdx]; $('ctx').classList.remove('on'); if (!col) return;
      if (btn.dataset.act === 'delete') { palette.splice(ctxIdx, 1); buildPalette(); toast('Цвет удалён из палитры'); }
      else if (btn.dataset.act === 'select') selectColorPixels(col);
      else if (btn.dataset.act === 'replace') { const r = $('repl'); replFrom = col.slice();
        r.value = '#' + col.map((v) => v.toString(16).padStart(2, '0')).join(''); r.click(); } });
    $('repl').addEventListener('change', (e) => { if (!replFrom) return; const from = replFrom; replFrom = null; recolorAll(from, hexToRgb(e.target.value)); });

    // ---- слои: список с папками, мультивыбор, операции ----
