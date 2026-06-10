    function exportPng() {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      for (let i = 0; i < layers.length; i++) { const L = layers[i]; if (!effVis(i) || L.opacity <= 0) continue;
        const cb = clipBase(i); if (L.clip && (cb < 0 || !effVis(cb))) continue;
        x.globalAlpha = L.opacity; x.drawImage(cb >= 0 ? clippedCanvas(i, cb) : layerCanvas(i), 0, 0); }
      saveCanvas(c, `pixel_${W}x${H}.png`);
    }
    async function saveBlob(b, name, desc, mime) { // классический диалог → share → скачивание
      if (window.showSaveFilePicker && !matchMedia('(pointer: coarse)').matches) {
        try { const ext = '.' + name.split('.').pop();
          const h = await showSaveFilePicker({ suggestedName: name, types: [{ description: desc, accept: { [mime]: [ext] } }] });
          const w2 = await h.createWritable(); await w2.write(b); await w2.close(); toast('Сохранено: ' + h.name); return; }
        catch (e) { if (e && e.name === 'AbortError') return; } }
      const file = new File([b], name, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      const url = URL.createObjectURL(b), a = document.createElement('a'); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
    function exportPsd() { // минимальный PSD: RGBA-слои без сжатия + композит
      const N = layers.length, chunks = [];
      const bytes = (a) => chunks.push(a);
      const u8 = (...v) => bytes(Uint8Array.from(v));
      const u16 = (v) => u8((v >> 8) & 255, v & 255);
      const u32 = (v) => u8((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
      const ascii = (s) => bytes(Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 255)));
      const planes = layers.map((L, i) => layerCanvas(i).getContext('2d').getImageData(0, 0, W, H).data);
      ascii('8BPS'); u16(1); bytes(new Uint8Array(6)); u16(4); u32(H); u32(W); u16(8); u16(3);
      u32(0); u32(0); // цветовые данные и ресурсы пустые
      const names = layers.map((L) => (L.name || 'Layer').slice(0, 60));
      const pas = names.map((s) => { let a = ''; for (const ch of s) a += ch.charCodeAt(0) < 128 ? ch : '_'; return (a.slice(0, 31) || 'Layer'); });
      const pasPad = (s) => { const l = 1 + s.length; return l + ((4 - (l % 4)) % 4); };
      const extraLen = (i) => 8 + pasPad(pas[i]) + (12 + 4 + names[i].length * 2);
      const recLen = (i) => 16 + 2 + 24 + 4 + 4 + 4 + 4 + extraLen(i);
      let liLen = 2; for (let i = 0; i < N; i++) liLen += recLen(i);
      liLen += N * 4 * (2 + W * H);
      const liPad = liLen % 2; liLen += liPad;
      u32(4 + liLen + 4); u32(liLen); u16(N);
      for (let i = 0; i < N; i++) {
        u32(0); u32(0); u32(H); u32(W); u16(4);
        for (const cid of [0, 1, 2, -1]) { u16(cid & 0xffff); u32(2 + W * H); }
        ascii('8BIM'); ascii('norm');
        u8(Math.round(layers[i].opacity * 255)); u8(layers[i].clip ? 1 : 0); u8(layers[i].visible ? 0 : 2); u8(0);
        u32(extraLen(i)); u32(0); u32(0);
        u8(pas[i].length); ascii(pas[i]); for (let k = 1 + pas[i].length; k % 4; k++) u8(0);
        ascii('8BIM'); ascii('luni'); u32(4 + names[i].length * 2); u32(names[i].length);
        for (const ch of names[i]) u16(ch.charCodeAt(0));
      }
      for (let i = 0; i < N; i++) { const d = planes[i];
        for (const off of [0, 1, 2, 3]) { u16(0); const pl = new Uint8Array(W * H);
          for (let p = 0; p < W * H; p++) pl[p] = d[p * 4 + off]; bytes(pl); } }
      if (liPad) u8(0);
      u32(0); // глобальная маска отсутствует
      const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
      const cx2 = comp.getContext('2d'); cx2.imageSmoothingEnabled = false;
      for (let i = 0; i < N; i++) { const L = layers[i]; if (!effVis(i) || L.opacity <= 0) continue;
        const cb2 = clipBase(i); if (L.clip && (cb2 < 0 || !effVis(cb2))) continue;
        cx2.globalAlpha = L.opacity; cx2.drawImage(cb2 >= 0 ? clippedCanvas(i, cb2) : layerCanvas(i), 0, 0); }
      const cd = cx2.getImageData(0, 0, W, H).data;
      u16(0);
      for (const off of [0, 1, 2, 3]) { const pl = new Uint8Array(W * H);
        for (let p = 0; p < W * H; p++) pl[p] = cd[p * 4 + off]; bytes(pl); }
      saveBlob(new Blob(chunks, { type: 'image/vnd.adobe.photoshop' }), `pixel_${W}x${H}.psd`, 'Photoshop PSD', 'image/vnd.adobe.photoshop');
    }
    function showSaveOverlay(u) { $('ovlimg').src = u; $('ovl').classList.add('on'); }
    function saveCanvas(c, name) { c.toBlob(async (b) => {
      if (window.showSaveFilePicker && !matchMedia('(pointer: coarse)').matches) { // классический диалог «Сохранить как» с выбором папки
        try { const h = await showSaveFilePicker({ suggestedName: name, types: [{ description: 'PNG-изображение', accept: { 'image/png': ['.png'] } }] });
          const w = await h.createWritable(); await w.write(b); await w.close(); toast('Сохранено: ' + h.name); return; }
        catch (e) { if (e && e.name === 'AbortError') return; } } // диалог недоступен — обычное скачивание
      const file = new File([b], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      if (matchMedia('(pointer: coarse)').matches) { showSaveOverlay(c.toDataURL('image/png')); return; }
      const url = URL.createObjectURL(b), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); }, 'image/png'); }

    // ---- проводка UI ----
