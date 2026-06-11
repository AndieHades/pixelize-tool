// Проба исполняется в том же лексическом scope, что и приложение, и дёргает
// внутренние функции систем напрямую. Результат — в globalThis.__result.
// Каждый сценарий изолирован: падение одного не маскирует остальные.
;(function () {
  const tests = [];
  const T = (name, fn) => { try { const v = fn(); tests.push({ name, ok: v !== false, got: v === false ? 'false' : undefined }); }
    catch (e) { tests.push({ name, ok: false, got: (e && e.stack) || String(e) }); } };
  const cell = (x, y) => { const c = layers[cur].grid[y][x]; return c ? c.join(',') : null; };
  const fresh = () => newDocument(32, 32); // чистый изолированный документ 32×32

  T('init: палитра и слой', () => palette.length > 0 && layers.length === 1 && W === 32 && H === 32);
  T('parseKey', () => parseKey('3,7').join(',') === '3,7');
  T('blendOver непрозрачный', () => blendOver([255, 0, 0], null, 1).join(',') === '255,0,0,255');
  T('blendOver 50%', () => blendOver([255, 255, 255], [0, 0, 0, 255], 0.5).join(',') === '128,128,128,255');
  T('mergeCells пусто', () => mergeCells(null, null, 1) === null);
  T('gridBounds null на пустом', () => gridBounds(blank(W, H)) === null);
  T('symmetrizeGrid', () => { const g = blank(W, H); g[0][0] = [1, 2, 3, 255]; symmetrizeGrid(g, true, false);
    return !!g[0][W - 1] && g[0][W - 1].join(',') === '1,2,3,255'; });

  T('рисование пикселя', () => { setActiveColor([10, 20, 30], false); snapshot(); stamp(5, 5); return cell(5, 5) === '10,20,30,255'; });
  T('gridBounds после рисования', () => JSON.stringify(gridBounds(layers[cur].grid)) === '{"minx":5,"miny":5,"maxx":5,"maxy":5}');
  T('undo', () => { doUndo(); return cell(5, 5) === null; });
  T('redo', () => { doRedo(); return cell(5, 5) === '10,20,30,255'; });

  T('заливка', () => { fresh(); setActiveColor([1, 2, 3], false); snapshot(); flood(0, 0); return cell(0, 0) === '1,2,3' && cell(31, 31) === '1,2,3'; });
  T('очистка слоя', () => { clearLayer(); return gridBounds(layers[cur].grid) === null; });

  T('линия инструментом', () => { setTool('line'); setActiveColor([9, 9, 9], false); linePrev = [0, 0, 3, 0]; lineStart = [0, 0]; tool = 'line'; commitLine();
    const ok = cell(0, 0) && cell(3, 0); setTool('pencil'); return !!ok; });

  T('placeImageLayer', () => { const n = layers.length; snapshot();
    placeImageLayer(2, 2, new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255]));
    const added = layers.length - n; doUndo(); return added === 1; });

  T('compositeLayers', () => { snapshot(); stamp(4, 4); let drew = 0; compositeLayers({ globalAlpha: 1, drawImage() { drew++; } }); doUndo(); return drew >= 1; });

  T('слой: add / merge / group', () => { const base = layers.length;
    doAddLayer(); const afterAdd = layers.length; marked.clear(); marked.add(0); marked.add(1); doMerge();
    const afterMerge = layers.length; doAddLayer(); marked.clear(); marked.add(0); marked.add(1); doGroup();
    const grouped = folders.length; return afterAdd === base + 1 && afterMerge === base && grouped >= 1; });

  T('перекраска recolorAll', () => { fresh(); snapshot(); stamp(7, 7); const from = layers[cur].grid[7][7].slice();
    recolorAll(from, [200, 100, 50]); const ok = cell(7, 7) === '200,100,50'; doUndo(); return ok; });

  T('обводка outlineLayer', () => { snapshot(); stamp(10, 10); const wasNull = !layers[cur].grid[9][10];
    $('out-size').value = 1; $('out-op').value = 100; $('out-col').value = '#ff7a18'; outlineLayer();
    const drewRing = !!layers[cur].grid[9][10]; doUndo(); doUndo(); return wasNull && drewRing; });

  T('тень dropShadow', () => { snapshot(); stamp(12, 12); const n = layers.length;
    dropShadow(layers[cur], 2, 2, [0, 0, 0], 0.6); const added = layers.length - n; doUndo(); doUndo(); return added >= 1; });

  T('свечение glowLayer', () => { snapshot(); stamp(15, 15); glowLayer(layers[cur], 4, [120, 215, 255], 0.8);
    const ok = !!layers[cur].grid[15][16] || !!layers[cur].grid[14][15]; doUndo(); doUndo(); return ok; });

  T('трансформация enter/apply', () => { snapshot(); stamp(8, 8); stamp(9, 9); enterRotMode(layers[cur]);
    const on = !!rotMode; rotMode.tx = 1; rotMode.changed = true; exitRotMode(true); const off = !rotMode; doUndo(); return on && off; });

  T('поворот холста 90°', () => { const w0 = W, h0 = H; rotateCanvas(); const ok = W === h0 && H === w0; doUndo(); return ok; });
  T('флип слоя', () => { snapshot(); stamp(0, 5); flipLayer(true); const ok = !!layers[cur].grid[5][W - 1]; doUndo(); doUndo(); return ok; });
  T('монохром', () => { snapshot(); setActiveColor([200, 50, 10], false); stamp(3, 3); monoAll();
    const c = layers[cur].grid[3][3]; const ok = c && c[0] === c[1] && c[1] === c[2]; doUndo(); return ok; });

  T('кроп applyCrop', () => { snapshot(); sel = { x0: 2, y0: 2, x1: 9, y1: 9 }; toggleCrop(); applyCrop();
    const ok = W === 8 && H === 8; doUndo(); sel = null; return ok; });
  T('trim', () => { fresh(); stamp(4, 4); trimCanvas(); const ok = W === 1 && H === 1; fresh(); return ok; });

  T('выделение: fill / delete / invert', () => { sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; selMask = null; snapshot();
    setActiveColor([5, 6, 7], false); fillSelection(); const filled = cell(2, 2) === '5,6,7,255';
    deleteSelContent(); const cleared = cell(2, 2) === null; invertSelection(); const inv = !!selMask; deselect(); doUndo(); return filled && cleared && inv; });

  T('документы: new / switch', () => { const n = docs.length; newDocument(16, 16); const created = docs.length === n + 1 && W === 16;
    loadDoc(0); const back = W === 32; return created && back; });

  T('экспорт PNG без ошибок', () => { exportPng(); return true; });
  T('экспорт PSD без ошибок', () => { exportPsd(); return true; });

  T('клавиатура: B → карандаш', () => { setTool('eraser'); window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyB' })); return tool === 'pencil'; });
  T('клавиатура: Ctrl+Z', () => { snapshot(); stamp(20, 20); window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true })); return cell(20, 20) === null; });

  T('меню: showMenuAt', () => { showMenuAt($('ctx'), 10, 10); return $('ctx').classList.contains('on'); });
  T('меню: openLctx', () => { openLctx(10, 10, 'layer', layers[cur]); return $('lctx').classList.contains('on'); });

  globalThis.__result = { ok: tests.every((t) => t.ok), tests };
})();
