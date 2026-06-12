// Интеграционные тесты сервисов core/, которым нужен DOM (canvas). Поднимаем
// jsdom-глобали и импортируем модули напрямую — проверяем по мере портирования,
// не дожидаясь сборки всего приложения.
import assert from 'node:assert/strict';
import { makeDom } from './harness.mjs';

const { window } = makeDom();
// аккуратно прокидываем jsdom-глобали в node (часть из них — read-only геттеры)
for (const k of ['document', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'HTMLCanvasElement', 'Blob', 'File', 'Image', 'localStorage', 'window']) {
  try { Object.defineProperty(globalThis, k, { value: k === 'window' ? window : window[k], configurable: true, writable: true }); } catch (e) {}
}
globalThis.URL.createObjectURL = () => 'blob:stub'; // нодовский URL не принимает jsdom-Blob
globalThis.URL.revokeObjectURL = () => {};

const { S, blank } = await import('../src/core/state.js');
const cache = await import('../src/core/layer-cache.js');
const io = await import('../src/core/io.js');
const history = await import('../src/core/history.js');
const bus = await import('../src/core/bus.js');
const doc = await import('../src/core/document.js');
const render = await import('../src/systems/render/index.js');
const actions = await import('../src/core/actions.js');
const kbd = await import('../src/systems/keyboard/index.js');
const { setTool } = await import('../src/core/tools.js');
const { stamp } = await import('../src/systems/draw/stamp.js');
const stroke = await import('../src/systems/draw/stroke.js');
const { flood } = await import('../src/systems/draw/fill.js');
const { commitLine } = await import('../src/systems/draw/shapes.js');
const { rotateCanvas } = await import('../src/systems/rotate-canvas.js');
const { flipLayer } = await import('../src/systems/flip.js');
const { trimCanvas } = await import('../src/systems/trim.js');
const { monoAll } = await import('../src/systems/mono.js');
const { glowLayer } = await import('../src/systems/glow.js');
const { outlineLayer } = await import('../src/systems/outline.js');
const { dropShadow } = await import('../src/systems/shadow.js');
const { recolorAll } = await import('../src/systems/recolor.js');
const { freeRotateLayer } = await import('../src/systems/free-rotate.js');
const bc = await import('../src/systems/brightness-contrast.js');
const sel = await import('../src/systems/selection/model.js');
const clip = await import('../src/systems/selection/clipboard.js');
const xport = await import('../src/systems/export.js');
const imp = await import('../src/systems/import/convert.js');
const pal = await import('../src/systems/palette.js');
const bb = await import('../src/systems/brush-bar.js');
const cp = await import('../src/systems/color-picker.js');
const prev = await import('../src/systems/preview-window.js');
const ref = await import('../src/systems/reference-window.js');
const palMgr = await import('../src/systems/palette-manager.js');
const tb = await import('../src/systems/toolbars.js');
const outline = await import('../src/systems/outline.js');
const shadow = await import('../src/systems/shadow.js');
const glow = await import('../src/systems/glow.js');
const adjust = await import('../src/systems/draw/adjust.js');
const crop = await import('../src/systems/crop.js');
await import('../src/systems/draw/tools.js');
await import('../src/systems/move-tool.js');
const { toolHandler } = await import('../src/core/canvas-handlers.js');
const input = await import('../src/systems/input/index.js');
await import('../src/systems/selection/input.js');
const sfloat = await import('../src/systems/selection/float.js');
const tf = await import('../src/systems/transform/index.js');
const layers = await import('../src/systems/layers/index.js');
const { layList } = await import('../src/systems/layers/list.js');
const lops = await import('../src/systems/layers/ops.js');
const resetWH = (w, h) => { S.W = w; S.H = h; S.cur = 0; S.folders = []; S.marked = new Set();
  S.layers = [{ name: 'a', grid: blank(w, h), opacity: 1, visible: true, fid: null, clip: false, ext: new Map() }];
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.moveDrag = null; S.tool = 'pencil'; S.sym = S.symH = false; cache.dirtyAll(); };

const reset4 = () => { S.W = 4; S.H = 4; S.cur = 0; S.folders = []; S.marked = new Set();
  S.layers = [{ name: 'a', grid: blank(4, 4), opacity: 1, visible: true, fid: null, clip: false, ext: new Map() }];
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.moveDrag = null; S.tool = 'pencil';
  cache.dirtyAll(); };

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };

// маленький документ с одним непустым пикселем
S.W = 4; S.H = 4; S.cur = 0; S.folders = [];
S.layers = [{ name: 'a', grid: blank(4, 4), opacity: 1, visible: true, fid: null, clip: false, ext: new Map() }];
S.layers[0].grid[1][2] = [10, 20, 30, 255];
cache.dirtyAll();

t('layerCanvas: кеш слоя в canvas W×H', () => { const c = cache.layerCanvas(0); assert.equal(c.width, 4); assert.equal(c.height, 4); });
t('compositeAt: цвет точки по слоям', () => { assert.deepEqual(cache.compositeAt(2, 1), [10, 20, 30]); assert.equal(cache.compositeAt(0, 0), null); });
t('compositeLayers: рисует видимые слои', () => { let drew = 0; cache.compositeLayers({ globalAlpha: 1, drawImage() { drew++; } }); assert.ok(drew >= 1); });
t('compositeLayers: скрытый слой пропускается', () => { S.layers[0].visible = false; cache.dirtyAll(); let drew = 0; cache.compositeLayers({ globalAlpha: 1, drawImage() { drew++; } }); S.layers[0].visible = true; assert.equal(drew, 0); });
t('io.gridToCanvas: фрагмент → canvas', () => { const c = io.gridToCanvas(S.layers[0].grid, 0, 0, 4, 4); assert.equal(c.width, 4); assert.equal(c.height, 4); });

t('history: snapshot/undo откатывает', () => {
  history.snapshot(); S.layers[0].grid[0][0] = [9, 9, 9, 255];
  history.doUndo(); assert.equal(S.layers[0].grid[0][0], null);
});
t('history: redo возвращает', () => { history.doRedo(); assert.deepEqual(S.layers[0].grid[0][0], [9, 9, 9, 255]); history.doUndo(); });
t('history: snapshot шлёт событие', () => { let hit = 0; const off = bus.on('snapshot', () => hit++); history.snapshot(); off(); assert.equal(hit, 1); });
t('history: undoGuard перехватывает отмену', () => {
  let guarded = 0; history.setUndoGuard(() => { guarded++; return true; });
  history.snapshot(); S.layers[0].grid[1][1] = [1, 1, 1, 255]; history.doUndo();
  history.setUndoGuard(null);
  assert.equal(guarded, 1); assert.deepEqual(S.layers[0].grid[1][1], [1, 1, 1, 255]); // не откатилось — перехвачено
});

t('document: expandCanvas растит холст и сдвигает пиксель', () => { reset4();
  S.layers[0].grid[1][1] = [5, 5, 5, 255];
  doc.expandCanvas(1, 1, 0, 0); // +1 слева, +1 сверху
  assert.equal(S.W, 5); assert.equal(S.H, 5);
  assert.deepEqual(S.layers[0].grid[2][2], [5, 5, 5, 255]);
});
t('render: рисует и шлёт событие overlay', () => { reset4();
  S.layers[0].grid[1][2] = [10, 20, 30, 255]; cache.dirtyAll();
  let ov = 0; const off = bus.on('overlay', () => ov++); render.render(); off();
  assert.equal(ov, 1);
});
t('render: с выделением и кропом не падает', () => { reset4();
  S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; S.tool = 'select'; render.render();
  S.sel = null; S.cropMode = { x0: 0, y0: 0, x1: 2, y1: 2, idx: 0, idy: 0 }; render.render();
  S.cropMode = null; assert.ok(true);
});
t('render: fitView ставит zoom ≥ 1', () => { reset4(); render.fitView(); assert.ok(S.view.zoom >= 1); });

const ev = (code, mods = {}) => ({ code, target: document.body, preventDefault() {}, ...mods });
t('keyboard: комбо из события', () => {
  assert.equal(kbd.comboOf({ code: 'KeyB' }), 'b');
  assert.equal(kbd.comboOf({ code: 'KeyZ', ctrlKey: true }), 'mod+z');
  assert.equal(kbd.comboOf({ code: 'KeyS', shiftKey: true }), 'shift+s');
  assert.equal(kbd.comboOf({ code: 'Equal' }), '='); assert.equal(kbd.comboOf({ code: 'Digit0' }), '0');
});
t('keyboard: хоткей запускает действие', () => { let ran = 0; actions.register('tool.pencil', () => ran++);
  assert.ok(kbd.handle(ev('KeyB'))); assert.equal(ran, 1); });
t('keyboard: несвязанная клавиша игнорится', () => { assert.equal(kbd.handle(ev('KeyQ')), false); });
t('keyboard: rebind переназначает и сбрасывается', () => { let ran = 0; actions.register('edit.undo', () => ran++);
  kbd.rebind('b', 'edit.undo'); kbd.handle(ev('KeyB')); assert.equal(ran, 1); kbd.resetKeymap(); });
t('keyboard: ввод в поле не триггерит', () => { assert.equal(kbd.handle(ev('KeyB', { target: document.createElement('input') })), false); });

t('draw: кисть рисует активным цветом', () => { reset4(); S.active = [10, 20, 30]; setTool('pencil');
  stroke.beginStroke(); stamp(1, 1); assert.deepEqual(S.layers[0].grid[1][1], [10, 20, 30, 255]); });
t('draw: ластик стирает', () => { reset4(); S.layers[0].grid[2][2] = [9, 9, 9, 255]; S.tool = 'eraser';
  stroke.beginStroke(); stamp(2, 2); assert.equal(S.layers[0].grid[2][2], null); });
t('draw: заливка заполняет холст', () => { reset4(); S.active = [1, 2, 3]; S.tool = 'fill'; flood(0, 0);
  assert.deepEqual(S.layers[0].grid[3][3], [1, 2, 3]); assert.deepEqual(S.layers[0].grid[0][0], [1, 2, 3]); });
t('draw: линия фиксируется в слой', () => { reset4(); S.active = [7, 7, 7]; setTool('line'); S.tool = 'line';
  S.linePrev = [0, 0, 3, 0]; commitLine(); assert.ok(S.layers[0].grid[0][0] && S.layers[0].grid[0][3]); });
t('draw: пипетка берёт цвет в активный', () => { reset4(); S.layers[0].grid[1][1] = [40, 50, 60, 255]; cache.dirtyAll();
  S.tool = 'pick'; stamp(1, 1); assert.deepEqual(S.active, [40, 50, 60]); assert.equal(S.tool, 'pencil'); });

t('rotate-canvas: меняет W/H местами', () => { resetWH(4, 6); rotateCanvas(); assert.equal(S.W, 6); assert.equal(S.H, 4); });
t('flip: отражает слой по горизонтали', () => { resetWH(4, 4); S.layers[0].grid[1][0] = [5, 5, 5, 255]; flipLayer(true); assert.deepEqual(S.layers[0].grid[1][3], [5, 5, 5, 255]); });
t('trim: обрезает до контура', () => { resetWH(6, 6); S.layers[0].grid[2][3] = [9, 9, 9, 255]; trimCanvas(); assert.equal(S.W, 1); assert.equal(S.H, 1); assert.deepEqual(S.layers[0].grid[0][0], [9, 9, 9, 255]); });
t('mono: переводит в серый', () => { resetWH(4, 4); S.layers[0].grid[1][1] = [200, 50, 10, 255]; monoAll(); const c = S.layers[0].grid[1][1]; assert.ok(c[0] === c[1] && c[1] === c[2]); });

t('glow: добавляет ореол в слой', () => { resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  glowLayer(S.layers[0], 3, [120, 215, 255], 0.8); assert.ok(S.layers[0].grid[4][3]); });
t('outline: обводит контур слоя', () => { resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  document.getElementById('out-size').value = '1'; document.getElementById('out-op').value = '100'; document.getElementById('out-col').value = '#ff7a18';
  outlineLayer(); assert.ok(S.layers[0].grid[3][4]); });
t('shadow: создаёт слой тени', () => { resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255];
  const m = S.layers.length; dropShadow(S.layers[0], 1, 1, [0, 0, 0], 0.6); assert.equal(S.layers.length, m + 1); });

t('recolor: меняет цвет на слоях и в палитре', () => { resetWH(4, 4); S.layers[0].grid[1][1] = [9, 9, 9, 255]; S.palette = [[9, 9, 9]]; cache.dirtyAll();
  recolorAll([9, 9, 9, 255], [200, 100, 50]); assert.deepEqual(S.layers[0].grid[1][1], [200, 100, 50]); assert.deepEqual(S.palette[0], [200, 100, 50]); });
t('free-rotate: поворачивает слой без ошибок', () => { resetWH(8, 8); S.layers[0].grid[3][3] = [1, 1, 1, 255]; S.layers[0].grid[3][4] = [1, 1, 1, 255];
  freeRotateLayer(S.layers[0], Math.PI / 4, 4); assert.ok(true); });
t('bc: применение поднимает яркость', () => { resetWH(4, 4); S.layers[0].grid[1][1] = [100, 100, 100, 255]; cache.dirtyAll();
  bc.openBcPop([S.layers[0]], 't'); document.getElementById('bc-bri').value = '100'; document.getElementById('bc-con').value = '0';
  bc.bcApply(); assert.ok(S.layers[0].grid[1][1][0] > 150); });

t('selection: fillSelection заливает рамку', () => { resetWH(6, 6); S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null; S.active = [5, 6, 7];
  sel.fillSelection(); assert.deepEqual(S.layers[0].grid[2][2], [5, 6, 7, 255]); });
t('selection: deleteSelContent чистит', () => { resetWH(6, 6); S.layers[0].grid[2][2] = [1, 1, 1, 255]; S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null;
  assert.equal(sel.deleteSelContent(), true); assert.equal(S.layers[0].grid[2][2], null); });
t('selection: selectColorPixels строит маску', () => { resetWH(6, 6); S.layers[0].grid[2][2] = [9, 9, 9, 255]; S.layers[0].grid[4][4] = [9, 9, 9, 255]; S.sel = null; S.selMask = null;
  sel.selectColorPixels([9, 9, 9]); assert.ok(S.selMask && S.selMask.has('2,2') && S.selMask.has('4,4')); });
t('selection: invertSelection', () => { resetWH(4, 4); S.sel = { x0: 0, y0: 0, x1: 1, y1: 1 }; S.selMask = null; sel.invertSelection();
  assert.ok(S.selMask && !S.selMask.has('0,0') && S.selMask.has('3,3')); });
t('clipboard: copy/paste на новый слой', () => { resetWH(6, 6); S.layers[0].grid[1][1] = [7, 7, 7, 255]; S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; S.selMask = null;
  clip.doCopy(); const m = S.layers.length; S.sel = { x0: 3, y0: 3, x1: 4, y1: 4 }; clip.doPaste();
  assert.equal(S.layers.length, m + 1); assert.ok(S.layers[S.cur].grid[3][3]); });

t('export: PNG без ошибок', () => { resetWH(4, 4); S.layers[0].grid[1][1] = [1, 2, 3, 255]; cache.dirtyAll(); xport.exportPng(); assert.ok(true); });
t('export: PSD без ошибок', () => { resetWH(4, 4); S.layers[0].grid[1][1] = [1, 2, 3, 255]; cache.dirtyAll(); xport.exportPsd(); assert.ok(true); });

t('import: ImageData → пиксель-документ', () => {
  const data = new Uint8ClampedArray(4 * 4 * 4); // 2×2 красный блок в центре 4×4
  for (const [px, py] of [[1, 1], [2, 1], [1, 2], [2, 2]]) { const o = (py * 4 + px) * 4; data[o] = 200; data[o + 1] = 30; data[o + 2] = 30; data[o + 3] = 255; }
  imp.setImpData({ width: 4, height: 4, data });
  imp.impConvert(); imp.applyImport();
  assert.equal(S.layers.length, 1); assert.ok(S.W >= 1 && S.W <= 4 && S.H >= 1 && S.H <= 4); assert.ok(S.palette.length > 0);
});

t('palette: buildPalette рисует свотчи', () => { resetWH(4, 4); S.palette = [[1, 1, 1], [2, 2, 2]]; S.active = [1, 1, 1];
  pal.buildPalette(); assert.equal(document.querySelectorAll('#pal .sw:not(.plus)').length, 2); });
t('palette: setActiveColor меняет активный', () => { pal.setActiveColor([9, 8, 7], false); assert.deepEqual(S.active, [9, 8, 7]); });

t('brush-bar: syncBars без ошибок', () => { S.brushes.pencil.size = 4; bb.syncBars(); assert.ok(true); });
t('color-picker: sync из активного', () => { S.active = [255, 0, 0]; cp.syncColFromActive(); assert.equal(document.getElementById('col-hv').textContent, '0'); });

t('windows: preview/reference монтируются без ошибок', () => { prev.mount(); ref.mount(); assert.ok(true); });

t('palette-manager: монтируется и сохраняет палитру', () => { S.palette = [[1, 2, 3], [4, 5, 6]]; palMgr.mount();
  document.getElementById('pal-name').value = 'тест'; document.getElementById('pal-save').click();
  const saved = JSON.parse(localStorage.getItem('palettes')); assert.deepEqual(saved['тест'], [[1, 2, 3], [4, 5, 6]]); });

t('toolbars: mount + смена инструмента подсвечивает кнопку', () => { tb.mount(); setTool('eraser'); assert.ok(document.getElementById('t-eraser').classList.contains('on')); assert.ok(!document.getElementById('t-pencil').classList.contains('on')); });
t('toolbars: переключатель симметрии', () => { S.sym = false; document.getElementById('sym').click(); assert.equal(S.sym, true); });
t('outline: openOutlinePop через action', () => { outline.mount(); resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll(); actions.run('effect.outline'); assert.ok(document.getElementById('outpop').classList.contains('on')); });

t('shadow/glow: popup открывается и копит превью', () => { resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  shadow.mount(); glow.mount(); adjust.mount();
  actions.run('effect.shadow', S.layers[0]); assert.ok(document.getElementById('dspop').classList.contains('on'));
  actions.run('effect.glow', S.layers[0]); assert.ok(document.getElementById('glowpop').classList.contains('on')); assert.ok(S.glowPreview && S.glowPreview.length > 0); });

t('crop: toggle из выделения + apply кадрирует', () => { resetWH(8, 8); S.sel = { x0: 1, y0: 1, x1: 4, y1: 4 }; S.selMask = null;
  crop.toggleCrop(); assert.ok(S.cropMode); crop.applyCrop(); assert.equal(S.W, 4); assert.equal(S.H, 4); });

t('canvas-handlers: pencil рисует через обработчик', () => { resetWH(8, 8); S.active = [1, 2, 3]; S.tool = 'pencil';
  const h = toolHandler('pencil'); h.down({ gx: 2, gy: 2, e: {} }); h.move({ gx: 4, gy: 2, e: {} }); h.up({});
  assert.deepEqual(S.layers[0].grid[2][2], [1, 2, 3, 255]); assert.ok(S.layers[0].grid[2][4]); });
t('canvas-handlers: move сдвигает слой', () => { resetWH(8, 8); S.layers[0].grid[2][2] = [5, 5, 5, 255]; S.tool = 'move'; S.marked = new Set();
  const h = toolHandler('move'); h.down({ gx: 0, gy: 0, e: {} }); h.move({ gx: 1, gy: 1, e: {} }); h.up({});
  assert.deepEqual(S.layers[0].grid[3][3], [5, 5, 5, 255]); });

t('canvas-handlers: move двигает все выделенные слои', () => { resetWH(8, 8); S.tool = 'move';
  S.layers.push({ ...S.layers[0], name: 'b', grid: S.layers[0].grid.map((r) => r.slice()) });
  S.layers[0].grid[1][1] = [1, 1, 1, 255]; S.layers[1].grid[2][2] = [2, 2, 2, 255]; S.cur = 0; S.marked = new Set([1]);
  const h = toolHandler('move'); h.down({ gx: 0, gy: 0, e: {} }); h.move({ gx: 1, gy: 1, e: {} }); h.up({});
  assert.deepEqual(S.layers[0].grid[2][2], [1, 1, 1, 255]); assert.deepEqual(S.layers[1].grid[3][3], [2, 2, 2, 255]);
  S.layers.pop(); S.marked = new Set(); });

t('canvas-handlers: move двигает рамку выделения вместе со слоем', () => { resetWH(8, 8); S.tool = 'move'; S.marked = new Set();
  S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = new Set(['2,2']);
  const h = toolHandler('move'); h.down({ gx: 0, gy: 0, e: {} }); h.move({ gx: 2, gy: 1, e: {} }); h.up({});
  assert.deepEqual(S.sel, { x0: 3, y0: 2, x1: 5, y1: 4 }); assert.ok(S.selMask.has('4,3')); S.sel = S.selMask = null; });

t('input: mount + диспетч pencil рисует', () => { resetWH(8, 8); S.active = [3, 4, 5]; S.tool = 'pencil'; input.mount();
  input.down({ pointerType: 'mouse', button: 0, clientX: 2, clientY: 2 }); input.up({ pointerType: 'mouse', button: 0 });
  // координаты зависят от view; проверяем, что хоть одна клетка закрашена
  assert.ok(S.layers[0].grid.some((r) => r.some((c) => c))); });

t('selection-input: select-инструмент тянет рамку', () => { resetWH(8, 8); S.tool = 'select'; S.sel = null; S.selMask = null;
  const h = toolHandler('select'); h.down({ gx: 1, gy: 1, e: null }); h.move({ gx: 4, gy: 4, e: null }); h.up({});
  assert.deepEqual(S.sel, { x0: 1, y0: 1, x1: 4, y1: 4 }); });
t('selection-float: lift + commit переносит фрагмент', () => { resetWH(8, 8); S.layers[0].grid[2][2] = [7, 7, 7, 255]; S.sel = { x0: 2, y0: 2, x1: 2, y1: 2 }; S.selMask = null;
  sfloat.liftSelection(); assert.equal(S.layers[0].grid[2][2], null); S.selFloat.x = 5; S.selFloat.y = 5; sfloat.commitFloat();
  assert.deepEqual(S.layers[0].grid[5][5], [7, 7, 7, 255]); });

t('transform: enter строит превью, exit применяет', () => { resetWH(8, 8); S.layers[0].grid[3][3] = [1, 1, 1, 255]; S.layers[0].grid[3][4] = [1, 1, 1, 255]; cache.dirtyAll();
  tf.enterRotMode(S.layers[0]); assert.ok(S.rotMode); assert.ok(S.rotPrev);
  S.rotMode.tx = 1; S.rotMode.changed = true; tf.exitRotMode(true); assert.equal(S.rotMode, null); });

t('layers-ui: layList рисует строки', () => { resetWH(8, 8); layers.mount(); document.getElementById('lay-pop').classList.add('on'); layList();
  assert.ok(document.querySelectorAll('#lay-list .lrow').length >= 1); });
t('layers-ui: add/merge меняют число слоёв', () => { resetWH(8, 8); const b = S.layers.length; lops.doAddLayer(); assert.equal(S.layers.length, b + 1);
  S.marked = new Set([0, 1]); lops.doMerge(); assert.equal(S.layers.length, b); });
t('layers: вложенные группы (группа в группе)', async () => { resetWH(4, 4); const { folderChain } = await import('../src/core/layers.js');
  S.folders = []; S.folderSeq = 0; S.layers = [S.layers[0], { ...S.layers[0], name: 'b', grid: S.layers[0].grid.map((r) => r.slice()) }, { ...S.layers[0], name: 'c', grid: S.layers[0].grid.map((r) => r.slice()) }]; S.cur = 0; S.marked = new Set([1, 2]);
  lops.doGroup(); const A = S.folders[0]; assert.equal(A.parent ?? null, null);
  const inner = S.layers.map((L, i) => [L, i]).filter(([L]) => L.fid === A.id).map(([, i]) => i); S.marked = new Set(inner); lops.doGroup();
  const B = S.folders.find((f) => f !== A); assert.equal(B.parent, A.id); // B вложена в A
  assert.deepEqual(folderChain(S.layers.find((L) => L.fid === B.id).fid).map((f) => f.id), [B.id, A.id]); });

console.log(`\nВсе ${n} интеграционных тестов прошли ✓`);
