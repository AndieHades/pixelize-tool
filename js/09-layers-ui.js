    const EYE = '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/><path class="slash" d="M4 4l16 16"/></svg>';
    const SYMLOCK = '<svg viewBox="0 0 24 24"><path d="M12 5v14" stroke-dasharray="2.5 2.5"/><path d="M8.5 8.5L5 12l3.5 3.5"/><path d="M15.5 8.5L19 12l-3.5 3.5"/><path class="slash" d="M4 4l16 16"/></svg>';
    let lastLayClick = { idx: -1, t: 0 }; // распознавание двойного клика по слою
    function longPress(el, fn) { // ПКМ или долгий тап
      let t = null, x0 = 0, y0 = 0;
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); fn(e.clientX, e.clientY); });
      el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return;
        x0 = e.clientX; y0 = e.clientY; clearTimeout(t); t = setTimeout(() => fn(x0, y0), 480); });
      el.addEventListener('pointermove', (e) => { if (t && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) { clearTimeout(t); t = null; } });
      const c = () => { clearTimeout(t); t = null; };
      el.addEventListener('pointerup', c); el.addEventListener('pointercancel', c); }
    function thumbFor(i) { const th = document.createElement('canvas'); th.className = 'lth'; th.width = 40; th.height = 40;
      const tx = th.getContext('2d'); tx.imageSmoothingEnabled = false;
      tx.fillStyle = '#26262c'; tx.fillRect(0, 0, 40, 40); tx.fillStyle = '#1d1d23';
      for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) if ((xx + yy) & 1) tx.fillRect(xx * 8, yy * 8, 8, 8);
      const k = Math.min(40 / W, 40 / H), w2 = Math.max(1, Math.round(W * k)), h2 = Math.max(1, Math.round(H * k));
      tx.drawImage(layerCanvas(i), (40 - w2) / 2, (40 - h2) / 2, w2, h2); return th; }
    function layList() {
      folders = folders.filter((f) => layers.some((L) => L.fid === f.id)); // пустые папки исчезают
      const box = $('lay-list'); box.innerHTML = '';
      const doneF = new Set();
      for (let i = layers.length - 1; i >= 0; i--) { const L = layers[i];
        const f = L.fid != null ? folders.find((x) => x.id === L.fid) : null;
        if (f && !doneF.has(f.id)) { doneF.add(f.id);
          const fr = document.createElement('div'); fr.className = 'lrow frow'; fr.dataset.fid = f.id;
          const car = document.createElement('button'); car.className = 'caret' + (f.open ? ' open' : '');
          car.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
          const nm = document.createElement('span'); nm.className = 'lname'; nm.textContent = f.name;
          nm.addEventListener('pointerdown', (e) => { if (nm.isContentEditable) e.stopPropagation(); });
          nm.addEventListener('click', (e) => { if (nm.isContentEditable) e.stopPropagation(); });
          const eye = document.createElement('button'); eye.className = 'eye' + (f.visible ? '' : ' off'); eye.innerHTML = EYE;
          eye.addEventListener('click', (ev) => { ev.stopPropagation(); snapshot(); f.visible = !f.visible; layList(); render(); });
          fr.append(car, nm, eye);
          fr.addEventListener('click', ((fld, sp) => () => { if (layDragSquelch) return;
            const now = performance.now(), key = 'f' + fld.id;
            if (lastLayClick.idx === key && now - lastLayClick.t < 350) { lastLayClick.idx = -1; startInlineRename(sp, fld); return; } // двойной клик — правка имени в строке
            lastLayClick = { idx: key, t: now }; fld.open = !fld.open; layList(); })(f, nm));
          longPress(fr, (x, y) => openLctx(x, y, 'folder', f));
          dragRow(fr, { kind: 'folder', fid: f.id });
          box.appendChild(fr); }
        if (f && !f.open) continue;
        const row = document.createElement('div'); row.className = 'lrow' + (i === cur ? ' on' : '') + (f ? ' inf' : '');
        row.dataset.li = i;
        const chk = document.createElement('button'); chk.className = 'lchk' + (marked.has(i) ? ' on' : ''); chk.title = 'Отметить для слияния/папки';
        chk.addEventListener('click', ((idx) => (ev) => { ev.stopPropagation();
          if (marked.has(idx)) marked.delete(idx); else marked.add(idx); layList(); })(i));
        const nm = document.createElement('span'); nm.className = 'lname'; nm.textContent = (L.clip ? '⤵ ' : '') + L.name;
        nm.addEventListener('pointerdown', (e) => { if (nm.isContentEditable) e.stopPropagation(); });
        nm.addEventListener('click', (e) => { if (nm.isContentEditable) e.stopPropagation(); });
        const eye = document.createElement('button'); eye.className = 'eye' + (L.visible ? '' : ' off'); eye.innerHTML = EYE;
        eye.addEventListener('click', (ev) => { ev.stopPropagation(); snapshot(); L.visible = !L.visible; layList(); render(); });
        row.append(chk, thumbFor(i), nm);
        if (sym || symH) { // замок симметрии виден только когда симметрия включена
          const sl = document.createElement('button'); sl.className = 'symlock' + (L.symLock ? ' off' : '');
          sl.title = L.symLock ? 'Симметрия отключена на слое — включить' : 'Симметрия активна на слое — отключить';
          sl.innerHTML = SYMLOCK;
          sl.addEventListener('click', (ev) => { ev.stopPropagation(); L.symLock = !L.symLock; layList(); render();
            toast(L.symLock ? 'Симметрия на слое отключена' : 'Симметрия на слое включена'); });
          row.append(sl); }
        row.append(eye);
        row.addEventListener('click', ((idx, lay, sp) => (ev) => { if (layDragSquelch) return;
          if (ev.ctrlKey || ev.metaKey) { if (marked.has(idx)) marked.delete(idx); else marked.add(idx); layList(); return; } // Ctrl+клик — мультивыбор
          const now = performance.now();
          if (lastLayClick.idx === idx && now - lastLayClick.t < 350) { lastLayClick.idx = -1; startInlineRename(sp, lay); return; } // двойной клик — правка имени в строке
          lastLayClick = { idx, t: now }; cur = idx; layList(); })(i, L, nm));
        longPress(row, (x, y) => openLctx(x, y, 'layer', L));
        dragRow(row, { kind: 'layer', idx: i });
        box.appendChild(row);
      }
      syncOp();
    }
    // ---- перетаскивание слоёв/папок: между собой, внутрь папки и наружу ----
    let layDragSquelch = false;
    function topOfFolder(fid) { let t = -1; for (let i = 0; i < layers.length; i++) if (layers[i].fid === fid) t = i; return t; }
    function dragRow(el, info) {
      el.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const sx = e.clientX, sy = e.clientY, box = $('lay-list'); let started = false;
        const move = (ev) => {
          if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 7) { started = true;
            el.classList.add('dragging'); try { el.setPointerCapture(e.pointerId); } catch (err) {}
            if (info.kind === 'layer' && marked.size > 1 && marked.has(info.idx)) // тащим всю отмеченную группу
              box.querySelectorAll('#lay-list .lrow[data-li]').forEach((r) => { if (marked.has(+r.dataset.li)) r.classList.add('dragging'); }); }
          if (!started) return;
          box.querySelectorAll('.drop-above,.drop-into').forEach((r) => r.classList.remove('drop-above', 'drop-into'));
          const t = document.elementFromPoint(ev.clientX, ev.clientY), row = t && t.closest ? t.closest('#lay-list .lrow') : null;
          if (!row || row === el) return;
          const r = row.getBoundingClientRect();
          if (row.classList.contains('frow') && info.kind === 'layer' && ev.clientY > r.top + r.height / 2) row.classList.add('drop-into');
          else row.classList.add('drop-above'); };
        const up = () => {
          el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
          box.querySelectorAll('.dragging').forEach((r) => r.classList.remove('dragging'));
          const into = $('lay-list').querySelector('.drop-into'), above = $('lay-list').querySelector('.drop-above');
          const target = into || above;
          $('lay-list').querySelectorAll('.drop-above,.drop-into').forEach((r) => r.classList.remove('drop-above', 'drop-into'));
          if (!started) return;
          layDragSquelch = true; setTimeout(() => { layDragSquelch = false; }, 0);
          if (target) layDrop(info, target, !!into); };
        el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
    }
    function layDrop(src, row, into) {
      const tIsFolder = row.classList.contains('frow');
      if (src.kind === 'layer') {
        const tL = tIsFolder ? null : layers[+row.dataset.li];
        const tFid = tIsFolder ? +row.dataset.fid : null;
        // если тащим отмеченный слой — переносим всю группу отмеченных, иначе один
        const block = (marked.size > 1 && marked.has(src.idx)) ? [...marked].sort((a, b) => a - b).map((i) => layers[i]) : [layers[src.idx]];
        if (tL && block.includes(tL)) return; // не бросаем на самих себя
        snapshot();
        for (const L of block) { const i = layers.indexOf(L); if (i >= 0) layers.splice(i, 1); }
        const dstFid = tIsFolder ? (into ? tFid : null) : (tL ? tL.fid : null);
        for (const L of block) L.fid = dstFid;
        let dstIdx = tIsFolder ? topOfFolder(tFid) + 1 : layers.indexOf(tL) + 1;
        if (dstIdx < 0) dstIdx = layers.length;
        layers.splice(dstIdx, 0, ...block); cur = dstIdx + block.length - 1;
      } else {
        if (tIsFolder && +row.dataset.fid === src.fid) return;
        const tL = tIsFolder ? null : layers[+row.dataset.li];
        if (tL && tL.fid === src.fid) return; // нельзя бросить папку внутрь самой себя
        const tFid = tIsFolder ? +row.dataset.fid : null;
        snapshot(); const block = [];
        for (let i = layers.length - 1; i >= 0; i--) if (layers[i].fid === src.fid) block.unshift(layers.splice(i, 1)[0]);
        let dstIdx;
        if (tIsFolder) dstIdx = topOfFolder(tFid) + 1;
        else if (tL.fid != null) dstIdx = topOfFolder(tL.fid) + 1; // папку в папку нельзя — ставим над ней
        else dstIdx = layers.indexOf(tL) + 1;
        layers.splice(Math.min(dstIdx, layers.length), 0, ...block);
        cur = Math.min(cur, layers.length - 1);
      }
      marked.clear(); dirtyAll(); layList(); render();
    }
    function syncOp() { const v = Math.round(layers[cur].opacity * 100); $('lay-op').value = v; $('lay-opv').textContent = v + '%'; }
    const mergeCells = (b, t, op) => { if (!t) return b ? b.slice() : null;
      const ta = op * (t.length > 3 ? t[3] / 255 : 1);
      if (!b) return [t[0], t[1], t[2], Math.round(ta * 255)];
      const ba = b.length > 3 ? b[3] / 255 : 1, oa = ta + ba * (1 - ta);
      const f = (sc, dc) => Math.round((sc * ta + dc * ba * (1 - ta)) / oa);
      return [f(t[0], b[0]), f(t[1], b[1]), f(t[2], b[2]), Math.round(oa * 255)]; };
    function doMerge() { // слить отмеченные (или активный с нижним)
      let idx = [...marked].sort((a, b) => a - b);
      if (idx.length < 2) { if (cur > 0) idx = [cur - 1, cur]; else { toast('Отметь 2+ слоя галочками'); return; } }
      snapshot();
      const base = idx[0], out = cloneGrid(layers[base].grid), ext = new Map(layers[base].ext);
      for (let j = 1; j < idx.length; j++) { const L = layers[idx[j]];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = L.grid[y][x]; if (t) out[y][x] = mergeCells(out[y][x], t, L.opacity); }
        for (const [k, c] of L.ext) ext.set(k, c); }
      const merged = { name: layers[base].name, grid: out, opacity: 1, visible: true, fid: layers[base].fid, ext };
      for (let j = idx.length - 1; j >= 0; j--) layers.splice(idx[j], 1);
      layers.splice(base, 0, merged); cur = base; marked.clear(); dirtyAll(); layList(); render(); toast('Слои слиты');
    }
    function doGroup() { // папка из отмеченных (или активного)
      let idx = [...marked].sort((a, b) => a - b); if (!idx.length) idx = [cur];
      snapshot();
      const f = { id: ++folderSeq, name: 'Папка ' + folderSeq, open: true, visible: true };
      folders.push(f);
      const moved = [];
      for (let j = idx.length - 1; j >= 0; j--) moved.unshift(layers.splice(idx[j], 1)[0]);
      moved.forEach((L) => { L.fid = f.id; });
      layers.splice(idx[0], 0, ...moved);
      cur = idx[0] + moved.length - 1; marked.clear(); dirtyAll(); layList(); render(); toast('Папка создана');
    }
    let renRef = null, lctxRef = null;
    function startInlineRename(span, ref) { if (!span) return; // правка имени прямо в строке
      span.contentEditable = 'true'; span.classList.add('editing'); span.textContent = ref.name; span.focus();
      const r = document.createRange(); r.selectNodeContents(span); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      let done = false;
      const finish = (save) => { if (done) return; done = true;
        span.contentEditable = 'false'; span.classList.remove('editing');
        span.removeEventListener('blur', onBlur); span.removeEventListener('keydown', onKey);
        const v = span.textContent.trim().slice(0, 24); if (save && v && v !== ref.name) { snapshot(); ref.name = v; }
        layList(); };
      const onBlur = () => finish(true);
      const onKey = (e) => { e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); } };
      span.addEventListener('blur', onBlur); span.addEventListener('keydown', onKey); }
    function openRename(ref) { renRef = ref; $('ren-name').value = ref.name; $('ren-ovl').classList.add('on');
      setTimeout(() => { $('ren-name').focus(); $('ren-name').select(); }, 80); }
    $('ren-ok').onclick = () => { if (renRef) { const v = $('ren-name').value.trim();
      if (v) { snapshot(); renRef.name = v.slice(0, 24); layList(); } }
      renRef = null; $('ren-ovl').classList.remove('on'); };
    $('ren-cancel').onclick = () => { renRef = null; $('ren-ovl').classList.remove('on'); };
    $('ren-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('ren-ok').click(); });
    function openLctx(x, y, kind, ref) { lctxRef = { kind, ref };
      $('lctx-ung').style.display = kind === 'folder' ? '' : 'none';
      $('lctx-clip').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-dup').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-select').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-invert').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-fill').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-clear').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-symm').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-shadow').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-mono').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-bc').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-send').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-png-full').style.display = kind === 'layer' ? '' : 'none';
      $('lctx-png-tight').style.display = kind === 'layer' ? '' : 'none';
      if (kind === 'layer') $('lctx-clip').textContent = (ref.clip ? '✓ ' : '') + 'Обтравочная маска';
      const m = $('lctx'); m.style.visibility = 'hidden'; m.classList.add('on');
      requestAnimationFrame(() => { const r = m.getBoundingClientRect();
        m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
        m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
        m.style.visibility = ''; }); }
    $('lctx-ren').onclick = () => { $('lctx').classList.remove('on'); if (lctxRef) openRename(lctxRef.ref); };
    $('lctx-dup').onclick = () => { $('lctx').classList.remove('on'); if (lctxRef && lctxRef.kind === 'layer') duplicateLayer(lctxRef.ref); };
    $('lctx-select').onclick = () => { $('lctx').classList.remove('on');
      if (!lctxRef || lctxRef.kind !== 'layer') return; const i = layers.indexOf(lctxRef.ref); if (i >= 0) cur = i; layList(); selectLayerContent(); };
    $('lctx-invert').onclick = () => { $('lctx').classList.remove('on');
      if (!lctxRef || lctxRef.kind !== 'layer') return; const i = layers.indexOf(lctxRef.ref); if (i >= 0) cur = i; layList(); invertSelection(); };
    $('lctx-fill').onclick = () => { $('lctx').classList.remove('on');
      if (!lctxRef || lctxRef.kind !== 'layer') return; const L = lctxRef.ref; snapshot();
      const a = [active[0], active[1], active[2], 255];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) L.grid[y][x] = a.slice();
      L.ext = new Map(); const i = layers.indexOf(L); if (i >= 0) markDirty(i); layList(); render(); toast('Слой залит'); };
    $('lctx-symm').onclick = () => { $('lctx').classList.remove('on');
      if (lctxRef && lctxRef.kind === 'layer') symmetrizeLayer(lctxRef.ref); };
    $('lctx-shadow').onclick = () => { $('lctx').classList.remove('on');
      if (lctxRef && lctxRef.kind === 'layer') { const i = layers.indexOf(lctxRef.ref); if (i >= 0) cur = i; layList(); openDsPop(lctxRef.ref); } };
    $('lctx-mono').onclick = () => { $('lctx').classList.remove('on');
      if (lctxRef && lctxRef.kind === 'layer') monoLayer(lctxRef.ref); };
    $('lctx-bc').onclick = () => { $('lctx').classList.remove('on');
      if (lctxRef && lctxRef.kind === 'layer') openBcPop([lctxRef.ref], 'Яркость/контраст — ' + lctxRef.ref.name); };
    $('lctx-clear').onclick = () => { $('lctx').classList.remove('on');
      if (!lctxRef || lctxRef.kind !== 'layer') return; const idx = layers.indexOf(lctxRef.ref); if (idx < 0) return;
      cur = idx; if (clearLayer()) { layList(); toast('Слой очищен'); } else toast('Слой и так пуст'); };
    $('lctx-png-full').onclick = () => { $('lctx').classList.remove('on'); if (lctxRef && lctxRef.kind === 'layer') exportLayerPng(lctxRef.ref, false); };
    $('lctx-png-tight').onclick = () => { $('lctx').classList.remove('on'); if (lctxRef && lctxRef.kind === 'layer') exportLayerPng(lctxRef.ref, true); };
    $('lctx-clip').onclick = () => { $('lctx').classList.remove('on');
      if (!lctxRef || lctxRef.kind !== 'layer') return;
      snapshot(); const L = lctxRef.ref; L.clip = !L.clip; layList(); render();
      toast(L.clip ? 'Обтравка: слой виден только поверх нижнего' : 'Обтравка снята'); };
    $('lctx-ung').onclick = () => { $('lctx').classList.remove('on');
      if (lctxRef && lctxRef.kind === 'folder') { snapshot(); const f = lctxRef.ref;
        layers.forEach((L) => { if (L.fid === f.id) L.fid = null; });
        folders = folders.filter((x) => x !== f); layList(); render(); toast('Папка расформирована'); } };
    $('layers').addEventListener('click', () => { const p = $('lay-pop'); const on = p.classList.toggle('on');
      $('layers').classList.toggle('on', on); if (on) layList(); });
    function doAddLayer() { if (layers.length >= 8) { toast('Максимум 8 слоёв'); return; }
      snapshot(); const nl = newLayer('Слой ' + (++layerSeq)); nl.fid = layers[cur].fid;
      layers.splice(cur + 1, 0, nl); cur++; marked.clear(); dirtyAll(); layList(); render(); }
    $('lay-add').addEventListener('click', doAddLayer);
    (function layWin() { // панель слоёв можно перетащить за шапку и оставить открытой
      const p = $('lay-pop'), head = $('lay-head'); let d = null;
      head.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return;
        head.setPointerCapture(e.pointerId); const r = p.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top }; });
      head.addEventListener('pointermove', (e) => { if (!d) return;
        p.style.left = Math.max(4, Math.min(e.clientX - d.dx, innerWidth - 90)) + 'px';
        p.style.top = Math.max(4, Math.min(e.clientY - d.dy, innerHeight - 60)) + 'px'; p.style.right = 'auto'; });
      const end = () => { if (!d) return; d = null;
        const r = p.getBoundingClientRect(); try { localStorage.setItem('laywin', JSON.stringify({ l: r.left, t: r.top })); } catch (err) {} };
      head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
      try { const s = JSON.parse(localStorage.getItem('laywin'));
        if (s && s.l != null) { p.style.left = Math.max(4, Math.min(s.l, innerWidth - 90)) + 'px'; p.style.top = Math.max(4, Math.min(s.t, innerHeight - 60)) + 'px'; p.style.right = 'auto'; } } catch (err) {}
    })();
    const layImgInp = document.createElement('input'); layImgInp.type = 'file'; layImgInp.accept = 'image/*';
    $('lay-img').addEventListener('click', () => { if (layers.length >= 8) { toast('Максимум 8 слоёв'); return; } layImgInp.click(); });
    layImgInp.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      const im = new Image(); im.onerror = () => toast('Не удалось открыть картинку');
      im.onload = () => { if (layers.length >= 8) { toast('Максимум 8 слоёв'); return; }
        const k = Math.min(W / im.naturalWidth, H / im.naturalHeight); // вписываем в холст
        const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
        const d = x.getImageData(0, 0, w, h).data;
        snapshot(); const nl = newLayer('Картинка'); nl.fid = layers[cur].fid;
        const ox2 = (W - w) >> 1, oy2 = (H - h) >> 1;
        for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const o = (y * w + xx) * 4;
          if (d[o + 3] < 8) continue; nl.grid[oy2 + y][ox2 + xx] = [d[o], d[o + 1], d[o + 2], d[o + 3]]; }
        layers.splice(cur + 1, 0, nl); cur++; marked.clear(); dirtyAll(); layList(); render();
        toast('Картинка на новом слое'); };
      im.src = URL.createObjectURL(f); };
    function duplicateLayer(L) { if (layers.length >= 8) { toast('Максимум 8 слоёв'); return; }
      const idx = layers.indexOf(L); if (idx < 0) return; snapshot();
      layers.splice(idx + 1, 0, { name: L.name + ' копия', opacity: L.opacity, visible: L.visible, fid: L.fid, clip: !!L.clip, symLock: !!L.symLock, ext: new Map(L.ext), grid: cloneGrid(L.grid) });
      cur = idx + 1; marked.clear(); dirtyAll(); layList(); render(); toast('Слой продублирован'); }
    $('lay-del').addEventListener('click', () => { if (layers.length < 2) { toast('Это единственный слой'); return; }
      snapshot(); layers.splice(cur, 1); cur = Math.max(0, cur - 1); marked.clear(); dirtyAll(); layList(); render(); });
    $('lay-merge').addEventListener('click', doMerge);
    $('lay-group').addEventListener('click', doGroup);
    $('lay-op').addEventListener('pointerdown', () => snapshot());
    $('lay-op').addEventListener('input', () => { layers[cur].opacity = +$('lay-op').value / 100; syncOp(); render(); });

    // ---- импорт ----
