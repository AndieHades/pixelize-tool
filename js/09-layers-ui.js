    const EYE = '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/><path class="slash" d="M4 4l16 16"/></svg>';
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
          const eye = document.createElement('button'); eye.className = 'eye' + (f.visible ? '' : ' off'); eye.innerHTML = EYE;
          eye.addEventListener('click', (ev) => { ev.stopPropagation(); snapshot(); f.visible = !f.visible; layList(); render(); });
          fr.append(car, nm, eye);
          fr.addEventListener('click', () => { if (layDragSquelch) return; f.open = !f.open; layList(); });
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
        const eye = document.createElement('button'); eye.className = 'eye' + (L.visible ? '' : ' off'); eye.innerHTML = EYE;
        eye.addEventListener('click', (ev) => { ev.stopPropagation(); snapshot(); L.visible = !L.visible; layList(); render(); });
        row.append(chk, thumbFor(i), nm, eye);
        row.addEventListener('click', ((idx) => () => { if (layDragSquelch) return; cur = idx; layList(); })(i));
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
            el.classList.add('dragging'); try { el.setPointerCapture(e.pointerId); } catch (err) {} }
          if (!started) return;
          box.querySelectorAll('.drop-above,.drop-into').forEach((r) => r.classList.remove('drop-above', 'drop-into'));
          const t = document.elementFromPoint(ev.clientX, ev.clientY), row = t && t.closest ? t.closest('#lay-list .lrow') : null;
          if (!row || row === el) return;
          const r = row.getBoundingClientRect();
          if (row.classList.contains('frow') && info.kind === 'layer' && ev.clientY > r.top + r.height / 2) row.classList.add('drop-into');
          else row.classList.add('drop-above'); };
        const up = () => {
          el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
          el.classList.remove('dragging');
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
        snapshot(); const [L] = layers.splice(src.idx, 1);
        let dstIdx, dstFid;
        if (tIsFolder) { dstFid = into ? tFid : null; dstIdx = topOfFolder(tFid) + 1; }
        else { dstFid = tL ? tL.fid : null; dstIdx = layers.indexOf(tL) + 1; }
        L.fid = dstFid; layers.splice(dstIdx, 0, L); cur = dstIdx;
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
      $('lctx-send').style.display = kind === 'layer' ? '' : 'none';
      if (kind === 'layer') $('lctx-clip').textContent = (ref.clip ? '✓ ' : '') + 'Обтравочная маска';
      const m = $('lctx'); m.style.visibility = 'hidden'; m.classList.add('on');
      requestAnimationFrame(() => { const r = m.getBoundingClientRect();
        m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
        m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
        m.style.visibility = ''; }); }
    $('lctx-ren').onclick = () => { $('lctx').classList.remove('on'); if (lctxRef) openRename(lctxRef.ref); };
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
    $('lay-dup').addEventListener('click', () => { if (layers.length >= 8) { toast('Максимум 8 слоёв'); return; }
      snapshot(); const L = layers[cur];
      layers.splice(cur + 1, 0, { name: L.name + ' копия', opacity: L.opacity, visible: L.visible, fid: L.fid, clip: !!L.clip, ext: new Map(L.ext), grid: cloneGrid(L.grid) });
      cur++; marked.clear(); dirtyAll(); layList(); render(); });
    $('lay-del').addEventListener('click', () => { if (layers.length < 2) { toast('Это единственный слой'); return; }
      snapshot(); layers.splice(cur, 1); cur = Math.max(0, cur - 1); marked.clear(); dirtyAll(); layList(); render(); });
    $('lay-up').addEventListener('click', () => { if (cur >= layers.length - 1) return;
      snapshot(); const a = layers[cur], b = layers[cur + 1]; const tf = a.fid; a.fid = b.fid; b.fid = tf; // папка прикреплена к месту
      [layers[cur], layers[cur + 1]] = [b, a]; cur++; marked.clear(); dirtyAll(); layList(); render(); });
    $('lay-down').addEventListener('click', () => { if (cur <= 0) return;
      snapshot(); const a = layers[cur], b = layers[cur - 1]; const tf = a.fid; a.fid = b.fid; b.fid = tf;
      [layers[cur], layers[cur - 1]] = [b, a]; cur--; marked.clear(); dirtyAll(); layList(); render(); });
    $('lay-merge').addEventListener('click', doMerge);
    $('lay-group').addEventListener('click', doGroup);
    $('lay-clear').addEventListener('click', () => { if (clearLayer()) { layList(); toast('Слой очищен'); } else toast('Слой и так пуст'); });
    $('lay-op').addEventListener('pointerdown', () => snapshot());
    $('lay-op').addEventListener('input', () => { layers[cur].opacity = +$('lay-op').value / 100; syncOp(); render(); });

    // ---- импорт ----
