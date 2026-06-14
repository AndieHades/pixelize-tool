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

const { S, blank, BP_SMAX } = await import('../src/core/state.js');
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
const { flood, dropColorAt } = await import('../src/systems/draw/fill.js');
const { commitLine } = await import('../src/systems/draw/shapes.js');
const { SHAPE_SNAP_MS } = await import('../src/config/timings.js');
const { rotateCanvas } = await import('../src/systems/rotate-canvas.js');
const { flipLayer } = await import('../src/systems/flip.js');
const { trimCanvas } = await import('../src/systems/trim.js');
await import('../src/systems/layer-center.js');
const { monoAll } = await import('../src/systems/mono.js');
const { recolorAll } = await import('../src/systems/recolor.js');
const { freeRotateLayer } = await import('../src/systems/free-rotate.js');
const bc = await import('../src/systems/brightness-contrast.js');
const { drawBrushCursor } = await import('../src/systems/render/cursor.js');
const sel = await import('../src/systems/selection/model.js');
const clip = await import('../src/systems/selection/clipboard.js');
const xtree = await import('../src/systems/export/tree.js');
const xrender = await import('../src/systems/export/render.js');
const xpipe = await import('../src/systems/export/pipeline.js');
const { writePsd } = await import('../src/systems/export/psd-write.js');
const { FORMATS } = await import('../src/systems/export/formats.js');
const imp = await import('../src/systems/import/convert.js');
const { insertPsd } = await import('../src/systems/import/psd-insert.js');
const pal = await import('../src/systems/palette.js');
const swipe = await import('../src/core/swipe-actions.js');
const bb = await import('../src/systems/brush-bar.js');
const brushResize = await import('../src/systems/brush-resize.js');
const eyedropper = await import('../src/systems/eyedropper/index.js');
const cp = await import('../src/systems/color-picker.js');
const prev = await import('../src/systems/preview-window.js');
const ref = await import('../src/systems/reference-window.js');
const palMgr = await import('../src/systems/palette-manager.js');
const tsg = await import('../src/systems/tint-shade/index.js');
const tb = await import('../src/systems/toolbars.js');
const effects = await import('../src/systems/effects/index.js');
const fxr = await import('../src/core/effects-render.js');
const fxlogic = await import('../src/logic/layer-effects.js');
const { EFFECT_TYPES } = await import('../src/config/defaults.js');
const adjust = await import('../src/systems/draw/adjust.js');
const crop = await import('../src/systems/crop.js');
const status = await import('../src/systems/status.js');
await import('../src/systems/draw/tools.js');
await import('../src/systems/move-tool.js');
const { toolHandler, globalHandlers } = await import('../src/core/canvas-handlers.js');
const input = await import('../src/systems/input/index.js');
await import('../src/systems/selection/input.js');
await import('../src/systems/selection/handles.js');
const sfloat = await import('../src/systems/selection/float.js');
await import('../src/systems/freehand/input.js');
const fhpath = await import('../src/systems/freehand/path.js');
const tf = await import('../src/systems/transform/index.js');
const layers = await import('../src/systems/layers/index.js');
const { layList } = await import('../src/systems/layers/list.js');
const lops = await import('../src/systems/layers/ops.js');
const fxdrag = await import('../src/systems/layers/fx-drag.js');
const i18n = await import('../src/i18n/index.js');
const resetWH = (w, h) => { S.W = w; S.H = h; S.cur = 0; S.folders = []; S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null;
  S.layers = [{ name: 'a', grid: blank(w, h), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] }];
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.moveDrag = null; S.tool = 'pencil'; S.sym = S.symH = false; cache.dirtyAll(); };

const reset4 = () => { S.W = 4; S.H = 4; S.cur = 0; S.folders = []; S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null;
  S.layers = [{ name: 'a', grid: blank(4, 4), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] }];
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.moveDrag = null; S.tool = 'pencil';
  cache.dirtyAll(); };

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };
const ta = async (name, fn) => { await fn(); n++; console.log('  ok   ' + name); };

// общий проект для экспорта: папка G со слоями b,c + одиночный слой a (низ→верх)
function exportProject() { resetWH(6, 6);
  S.layers = [
    { name: 'a', grid: blank(6, 6), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] },
    { name: 'b', grid: blank(6, 6), opacity: 1, visible: true, fid: 1, clip: false, ext: new Map(), effects: [] },
    { name: 'c', grid: blank(6, 6), opacity: 1, visible: false, fid: 1, clip: false, ext: new Map(), effects: [] },
  ];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }]; S.folderSeq = 1;
  S.cur = 0; S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null; cache.dirtyAll();
}

// маленький документ с одним непустым пикселем
S.W = 4; S.H = 4; S.cur = 0; S.folders = [];
S.layers = [{ name: 'a', grid: blank(4, 4), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] }];
S.layers[0].grid[1][2] = [10, 20, 30, 255];
cache.dirtyAll();

t('layerCanvas: кеш слоя в canvas W×H', () => { const c = cache.layerCanvas(0); assert.equal(c.width, 4); assert.equal(c.height, 4); });
t('compositeAt: цвет точки по слоям', () => { assert.deepEqual(cache.compositeAt(2, 1), [10, 20, 30]); assert.equal(cache.compositeAt(0, 0), null); });
t('compositeLayers: рисует видимые слои', () => { let drew = 0; cache.compositeLayers({ globalAlpha: 1, drawImage() { drew++; } }); assert.ok(drew >= 1); });
t('compositeLayers: скрытый слой пропускается', () => { S.layers[0].visible = false; cache.dirtyAll(); let drew = 0; cache.compositeLayers({ globalAlpha: 1, drawImage() { drew++; } }); S.layers[0].visible = true; assert.equal(drew, 0); });
t('layerExtCanvas: запас за краем пакуется в canvas со смещением', () => { reset4();
  S.layers[0].ext = new Map([['-2,1', [9, 8, 7, 255]]]); cache.dirtyAll();
  const ex = cache.layerExtCanvas(0); assert.ok(ex); assert.equal(ex.ox, -2); assert.equal(ex.oy, 1);
  assert.equal(ex.canvas.width, 1); assert.equal(ex.canvas.height, 1);
  S.layers[0].ext = new Map(); cache.dirtyAll(); assert.equal(cache.layerExtCanvas(0), null); });
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
t('history: undo сначала снимает активное выделение', () => { reset4(); S.undoStack.length = 0; S.redoStack.length = 0;
  S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; S.layers[0].grid[0][0] = [3, 3, 3, 255]; history.snapshot();
  S.layers[0].grid[0][0] = [9, 9, 9, 255]; history.doUndo();
  assert.equal(S.sel, null); assert.deepEqual(S.layers[0].grid[0][0], [9, 9, 9, 255]); assert.equal(S.undoStack.length, 1); });

t('document: expandCanvas растит холст и сдвигает пиксель', () => { reset4();
  S.layers[0].grid[1][1] = [5, 5, 5, 255];
  doc.expandCanvas(1, 1, 0, 0); // +1 слева, +1 сверху
  assert.equal(S.W, 5); assert.equal(S.H, 5);
  assert.deepEqual(S.layers[0].grid[2][2], [5, 5, 5, 255]);
});
t('document: expandForEffects раздвигает холст под обводку у края', () => { reset4();
  S.layers[0].grid[0][0] = [9, 9, 9, 255]; // пиксель в углу — обводке size 2 не хватает места
  S.layers[0].effects = [{ id: 1, type: 'stroke', visible: true, params: { size: 2, color: '#ff0000' } }];
  const grew = doc.expandForEffects(S.layers[0]);
  assert.equal(grew, true); assert.equal(S.W, 6); assert.equal(S.H, 6); // +2 слева и сверху (справа/снизу место уже есть)
  assert.deepEqual(S.layers[0].grid[2][2], [9, 9, 9, 255]); S.layers[0].effects = []; });
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
t('cursor: предпросмотр отпечатка рисуется в real/circle без падений', () => { reset4();
  S.tool = 'pencil'; S.hoverPx = [2, 2]; S.cursorMode = 'real'; render.render();
  S.cursorMode = 'circle'; render.render(); // круг размера
  S.tool = 'eraser'; S.cursorMode = 'real'; render.render(); // ластик — белый отпечаток
  S.stampBrush.pencil = { tok: 7, cov: null, params: {} }; S.tool = 'pencil'; render.render(); // штамп-кисть
  S.hoverPx = null; S.stampBrush.pencil = null; assert.ok(true); });
t('cursor: при пипетке real brush скрыт, остаётся только прицел', () => { reset4();
  const ops = { drawImage: 0, lineTo: 0 }, ctx = { save() {}, restore() {}, beginPath() {}, moveTo() {}, stroke() {},
    lineTo() { ops.lineTo++; }, drawImage() { ops.drawImage++; }, arc() {} };
  S.tool = 'pencil'; S.hoverPx = [2, 2]; S.cursorMode = 'real'; S.brushes.pencil.size = 5;
  S.eyedrop.active = true; drawBrushCursor(ctx, 0, 0, 10);
  assert.equal(ops.drawImage, 0); assert.ok(ops.lineTo > 0);
  S.eyedrop.active = false; S.hoverPx = null; S.brushes.pencil.size = 1; });
t('cursor: cursor.cycleMode гоняет режимы по кругу', () => { reset4();
  S.cursorMode = 'real'; actions.run('cursor.cycleMode'); assert.equal(S.cursorMode, 'circle');
  actions.run('cursor.cycleMode'); assert.equal(S.cursorMode, 'real'); });

const ev = (code, mods = {}) => ({ code, target: document.body, preventDefault() {}, ...mods });
t('keyboard: комбо из события', () => {
  assert.equal(kbd.comboOf({ code: 'KeyB' }), 'b');
  assert.equal(kbd.comboOf({ code: 'KeyZ', ctrlKey: true }), 'mod+z');
  assert.equal(kbd.comboOf({ code: 'KeyS', shiftKey: true }), 'shift+s');
  assert.equal(kbd.comboOf({ code: 'Equal' }), '='); assert.equal(kbd.comboOf({ code: 'Digit0' }), '0');
});
t('keyboard: хоткей запускает действие', () => { let ran = 0; actions.register('tool.pencil', () => ran++);
  assert.ok(kbd.handle(ev('KeyB'))); assert.equal(ran, 1); });
t('keyboard: несвязанная клавиша игнорится', () => { assert.equal(kbd.handle(ev('KeyJ')), false); });
t('keyboard: rebind переназначает и сбрасывается', () => { let ran = 0; actions.register('edit.undo', () => ran++);
  kbd.rebind('b', 'edit.undo'); kbd.handle(ev('KeyB')); assert.equal(ran, 1); kbd.resetKeymap(); });
t('keyboard: ввод в поле не триггерит', () => { assert.equal(kbd.handle(ev('KeyB', { target: document.createElement('input') })), false); });

t('draw: кисть рисует активным цветом', () => { reset4(); S.active = [10, 20, 30]; setTool('pencil');
  stroke.beginStroke(); stamp(1, 1); assert.deepEqual(S.layers[0].grid[1][1], [10, 20, 30, 255]); });
t('draw: ластик стирает', () => { reset4(); S.layers[0].grid[2][2] = [9, 9, 9, 255]; S.tool = 'eraser';
  stroke.beginStroke(); stamp(2, 2); assert.equal(S.layers[0].grid[2][2], null); });
t('draw: заливка заполняет холст', () => { reset4(); S.active = [1, 2, 3]; S.tool = 'fill'; flood(0, 0);
  assert.deepEqual(S.layers[0].grid[3][3], [1, 2, 3]); assert.deepEqual(S.layers[0].grid[0][0], [1, 2, 3]); });
t('draw: reference-слой задаёт контур заливки для нижнего слоя', () => { resetWH(5, 5); const r = blank(5, 5), line = [0, 0, 0, 255];
  for (let i = 1; i <= 3; i++) { r[1][i] = line; r[3][i] = line; r[i][1] = line; r[i][3] = line; }
  S.layers.push({ name: 'ref', grid: r, opacity: 1, visible: true, fid: null, clip: false, reference: true, ext: new Map(), effects: [] });
  S.cur = 0; S.active = [8, 9, 10]; flood(2, 2);
  assert.deepEqual(S.layers[0].grid[2][2], [8, 9, 10]); assert.equal(S.layers[0].grid[0][0], null);
  assert.equal(S.layers[0].grid[1][2], null); assert.deepEqual(S.layers[1].grid[1][2], line); });
const overCv = (zoom = 1) => { const cv = document.getElementById('cv'); S.view = { zoom, ox: 0, oy: 0 };
  cv.getBoundingClientRect = () => ({ left: 0, top: 0, right: S.W * zoom, bottom: S.H * zoom, width: S.W * zoom, height: S.H * zoom });
  const prev = document.elementFromPoint; document.elementFromPoint = () => cv; return () => { document.elementFromPoint = prev; }; };
t('drop-color: бросок над выделением заливает всё выделение', () => { resetWH(6, 6);
  S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null; const undo = overCv();
  dropColorAt([5, 6, 7], 2, 2); undo();
  assert.deepEqual(S.active, [5, 6, 7]); assert.deepEqual(S.layers[0].grid[2][2], [5, 6, 7, 255]); });
t('drop-color: бросок без выделения заливает связную область под точкой', () => { resetWH(6, 6);
  S.sel = null; S.selMask = null; const undo = overCv();
  dropColorAt([1, 2, 3], 0, 0); undo();
  assert.deepEqual(S.active, [1, 2, 3]); assert.deepEqual(S.layers[0].grid[5][5], [1, 2, 3]); });
t('drop-color: бросок мимо холста ничего не заливает', () => { resetWH(6, 6); S.sel = null; S.selMask = null;
  const prev = document.elementFromPoint; document.elementFromPoint = () => null;
  dropColorAt([9, 9, 9], 0, 0); document.elementFromPoint = prev;
  assert.equal(S.layers[0].grid[0][0], null); });
t('draw: линия фиксируется в слой', () => { reset4(); S.active = [7, 7, 7]; setTool('line'); S.tool = 'line';
  S.linePrev = [0, 0, 3, 0]; commitLine(); assert.ok(S.layers[0].grid[0][0] && S.layers[0].grid[0][3]); });
t('draw: прямоугольник фиксируется в слой', () => { reset4(); S.active = [7, 7, 7]; setTool('rect'); S.tool = 'rect';
  S.linePrev = [0, 0, 3, 3]; commitLine();
  assert.ok(S.layers[0].grid[0][0] && S.layers[0].grid[3][3] && S.layers[0].grid[0][3] && S.layers[0].grid[3][0]);
  assert.equal(S.layers[0].grid[1][1], null); }); // середина пустая — только контур
t('draw: залитый прямоугольник (ПКМ-режим)', () => { reset4(); S.active = [7, 7, 7]; S.tool = 'rect'; S.fillShape.rect = true;
  S.linePrev = [0, 0, 3, 3]; commitLine(); S.fillShape.rect = false;
  assert.ok(S.layers[0].grid[1][1] && S.layers[0].grid[2][2]); }); // середина залита
t('draw: эллипс фиксируется в слой, shift — круг', () => { reset4(); S.active = [7, 7, 7]; S.tool = 'ellipse';
  const h = toolHandler('ellipse');
  h.down({ gx: 0, gy: 0, e: {} }); h.move({ gx: 3, gy: 1, e: { shiftKey: true } }); // shift: бокс станет квадратом 0..3
  assert.deepEqual(S.linePrev, [0, 0, 3, 3]); h.up({});
  assert.ok(S.layers[0].grid[0][1] && S.layers[0].grid[3][1]); // контур слева и справа
  assert.equal(S.layers[0].grid[1][1], null); }); // середина пустая
await ta('draw: удержание фигуры на месте → ровный квадрат/круг', async () => { reset4(); S.active = [7, 7, 7]; S.tool = 'rect';
  const h = toolHandler('rect'); h.down({ gx: 1, gy: 1, e: {} }); h.move({ gx: 1, gy: 3, e: {} }); // тянем узкий бокс 1×3
  assert.deepEqual(S.linePrev, [1, 1, 1, 3]);
  await new Promise((r) => setTimeout(r, SHAPE_SNAP_MS + 60)); // держим на месте — должно снапнуться в квадрат
  assert.deepEqual(S.linePrev, [1, 1, 3, 3]); h.up({}); });
t('eyedropper: color.setActive ставит активный цвет, не меняя инструмент', () => { reset4(); S.tool = 'pencil'; S.active = [1, 2, 3];
  actions.run('color.setActive', [40, 50, 60]); assert.deepEqual(S.active, [40, 50, 60]); assert.equal(S.tool, 'pencil'); });

t('rotate-canvas: меняет W/H местами', () => { resetWH(4, 6); rotateCanvas(); assert.equal(S.W, 6); assert.equal(S.H, 4); });
t('flip: отражает слой по горизонтали', () => { resetWH(4, 4); S.layers[0].grid[1][0] = [5, 5, 5, 255]; flipLayer(true); assert.deepEqual(S.layers[0].grid[1][3], [5, 5, 5, 255]); });
t('trim: обрезает до контура', () => { resetWH(6, 6); S.layers[0].grid[2][3] = [9, 9, 9, 255]; trimCanvas(); assert.equal(S.W, 1); assert.equal(S.H, 1); assert.deepEqual(S.layers[0].grid[0][0], [9, 9, 9, 255]); });
t('center: объект встаёт в центр холста', () => { resetWH(8, 8); S.sel = null; S.selMask = null; S.layers[0].grid[1][1] = [1, 1, 1, 255]; cache.dirtyAll();
  actions.run('layer.center'); assert.deepEqual(S.layers[0].grid[4][4], [1, 1, 1, 255]); assert.equal(S.layers[0].grid[1][1], null); });
t('center: с выделением — в центр выделения', () => { resetWH(10, 10); S.layers[0].grid[0][0] = [2, 2, 2, 255]; S.sel = { x0: 4, y0: 4, x1: 5, y1: 5 }; S.selMask = null; cache.dirtyAll();
  actions.run('layer.center'); assert.deepEqual(S.layers[0].grid[5][5], [2, 2, 2, 255]); S.sel = null; });
t('trim: расширяет холст до пикселей за краем (включая скрытые)', () => { resetWH(4, 4); S.layers[0].grid[0][0] = [9, 9, 9, 255];
  S.layers[0].visible = false; S.layers[0].ext.set('6,6', [1, 1, 1, 255]); trimCanvas();
  assert.equal(S.W, 7); assert.equal(S.H, 7); assert.deepEqual(S.layers[0].grid[6][6], [1, 1, 1, 255]); S.layers[0].visible = true; });
t('trim: расширяет холст под охват эффекта (обводка не обрезается)', () => { resetWH(4, 4); S.layers[0].grid[0][0] = [9, 9, 9, 255];
  S.layers[0].effects = [{ id: 1, type: 'stroke', visible: true, params: { size: 2, color: '#ffffff' } }]; trimCanvas();
  assert.equal(S.W, 5); assert.equal(S.H, 5); // пиксель (0,0) + обводка 2px по краям → bbox (-2..2)
  assert.deepEqual(S.layers[0].grid[2][2], [9, 9, 9, 255]); S.layers[0].effects = []; });
t('document: addImageLayerTop кладёт картинку верхним слоем', () => { resetWH(6, 6); const n = S.layers.length;
  const d = new Uint8ClampedArray(2 * 2 * 4); for (let i = 0; i < 4; i++) { d[i * 4] = 200; d[i * 4 + 3] = 255; }
  doc.addImageLayerTop(2, 2, d, 'pic'); assert.equal(S.layers.length, n + 1); assert.equal(S.cur, S.layers.length - 1);
  assert.ok(S.layers[S.cur].grid[2][2] && S.layers[S.cur].fid === null); });
t('psd-insert: PSD → верхняя папка со слоями/группами/видимостью/эффектами', () => { resetWH(8, 8);
  const empty = () => Array.from({ length: 2 }, () => new Array(2).fill(null));
  const g = empty(); g[0][0] = [255, 0, 0, 255];
  const psd = { W: 2, H: 2, layers: [
    { name: 'div', section: 3, visible: true, grid: empty() },
    { name: 'inside', section: 0, visible: false, grid: g, effects: [{ type: 'stroke', params: { size: 1, color: '#ff0000' } }] },
    { name: 'Group', section: 1, visible: true, grid: empty() },
    { name: 'flat', section: 0, visible: true, grid: empty() } ] };
  const nf = S.folders.length, nl = S.layers.length; insertPsd(psd, 'doc');
  assert.equal(S.folders.length, nf + 2); assert.equal(S.layers.length, nl + 2);
  const top = S.folders.find((f) => f.name === 'doc' && f.parent == null); assert.ok(top);
  const grp = S.folders.find((f) => f.name === 'Group'); assert.equal(grp.parent, top.id);
  const inside = S.layers.find((L) => L.name === 'inside'); assert.equal(inside.visible, false); assert.equal(inside.fid, grp.id);
  assert.equal(inside.effects.length, 1); assert.equal(inside.effects[0].type, 'stroke'); });
t('mono: переводит в серый', () => { resetWH(4, 4); S.layers[0].grid[1][1] = [200, 50, 10, 255]; monoAll(); const c = S.layers[0].grid[1][1]; assert.ok(c[0] === c[1] && c[1] === c[2]); });

t('layer-effects: обводка даёт кольцо вокруг силуэта', () => { const mask = fxlogic.maskFromGrid([[null, null, null], [null, [1, 1, 1, 1], null], [null, null, null]], 3, 3);
  const px = fxlogic.strokePixels(mask, 3, 3, { size: 1 }); assert.ok(px.some(([x, y]) => x === 0 && y === 1)); });
t('layer-effects: внутренняя тень только по силуэту', () => { const g = [[[1, 1, 1, 1], [1, 1, 1, 1]], [[1, 1, 1, 1], [1, 1, 1, 1]]];
  const mask = fxlogic.maskFromGrid(g, 2, 2); const px = fxlogic.innerShadowPixels(mask, 2, 2, { size: 1, dx: 1, dy: 0, intensity: 1 });
  assert.ok(px.length && px.every(([x, y]) => x >= 0 && x < 2 && y >= 0 && y < 2)); });
t('layer-effects: effectReach — обводка во все стороны, тень добавляет смещение, внутр. не вылезает', () => {
  assert.deepEqual(fxlogic.effectReach([{ type: 'stroke', params: { size: 3 } }]), { l: 3, r: 3, t: 3, b: 3 });
  assert.deepEqual(fxlogic.effectReach([{ type: 'dropShadow', params: { size: 2, dx: 5, dy: -3 } }]), { l: 2, r: 7, t: 5, b: 2 });
  assert.deepEqual(fxlogic.effectReach([{ type: 'innerShadow', params: { size: 4 } }]), { l: 0, r: 0, t: 0, b: 0 }); });
t('layer-effects: effectLayerPixels(stroke) — кольцо и координаты за краем (для ext)', () => {
  const W = 4, H = 4, mask = Array.from({ length: H }, () => new Array(W).fill(false)); mask[0][0] = true; // пиксель в углу
  const px = fxlogic.effectLayerPixels(mask, W, H, { type: 'stroke', visible: true, params: { size: 1, color: '#fff' } });
  assert.ok(px.length > 0 && px.some(([x, y]) => x < 0 || y < 0)); }); // обводка вышла за холст — не обрезана
t('effects-render: слой с эффектом рисуется через fx-канвас', () => { resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  S.layers[0].effects = [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#ff0000' } }];
  const c = fxr.layerFxCanvas(0); assert.ok(c && c.width === 8); assert.notEqual(c, cache.layerFloatCanvas(0)); S.layers[0].effects = []; });
t('effects-render: fx-канвас едет с поднятым фрагментом выделения (обводка не пропадает/не застывает)', () => {
  resetWH(8, 8); S.layers[0].grid[4][4] = [9, 9, 9, 255]; cache.dirtyAll();
  S.layers[0].effects = [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#ff0000' } }];
  S.selFloat = { cells: new Map([['0,0', [9, 9, 9, 255]]]), w: 1, h: 1, x: 4, y: 4, ox: 4, oy: 4, li: 0 };
  const a = fxr.layerFxCanvas(0); assert.equal(fxr.layerFxCanvas(0), a); // тот же фрагмент → кеш
  S.selFloat.x = 5; assert.notEqual(fxr.layerFxCanvas(0), a); // фрагмент сдвинут → обводка пересчитана
  S.selFloat = null; S.layers[0].effects = []; });
t('effects-render: fxOnCanvas накладывает эффект (новый канвас), без эффектов — исходный', () => {
  const src = document.createElement('canvas'); src.width = 8; src.height = 8;
  assert.equal(fxr.fxOnCanvas(src, [], 8, 8), src); // нет эффектов → тот же канвас (без работы)
  const out = fxr.fxOnCanvas(src, [{ type: 'stroke', visible: true, params: { size: 1, color: '#f00' } }], 8, 8);
  assert.notEqual(out, src); assert.equal(out.width, 8); }); // эффект → новый полнохолстовый канвас

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

t('symmetry: applySelectionOp создаёт зеркальную копию (X)', () => { resetWH(8, 8); S.sym = true; S.symH = false; S.sel = S.selMask = null;
  sel.applySelectionOp(new Set(['1,1']), 'replace'); assert.ok(S.selMask.has('1,1') && S.selMask.has('6,1')); S.sym = false; });
t('symmetry: Subtract вычитает оригинал и зеркало', () => { resetWH(8, 8); S.sym = true; S.symH = false;
  S.sel = { x0: 0, y0: 0, x1: 7, y1: 7 }; S.selMask = new Set(['1,1', '6,1', '2,2', '5,2']);
  sel.applySelectionOp(new Set(['1,1']), 'subtract'); assert.ok(!S.selMask.has('1,1') && !S.selMask.has('6,1') && S.selMask.has('2,2')); S.sym = false; });
t('symmetry: заливка зеркалит обе стороны', () => { resetWH(8, 8); S.sym = true; S.symH = false; S.active = [9, 9, 9]; S.sel = S.selMask = null;
  for (let y = 0; y < 8; y++) { S.layers[0].grid[y][3] = [1, 1, 1, 255]; S.layers[0].grid[y][4] = [1, 1, 1, 255]; } cache.dirtyAll(); // стенка делит лево/право
  flood(1, 1); assert.deepEqual(S.layers[0].grid[1][1], [9, 9, 9]); assert.deepEqual(S.layers[0].grid[1][6], [9, 9, 9]); // правая сторона залита зеркально
  assert.deepEqual(S.layers[0].grid[1][3], [1, 1, 1, 255]); S.sym = false; }); // стенка цела
t('symmetry: вырезание зеркального выделения вставляет стороны отдельными слоями', () => { resetWH(8, 8); S.sym = true; S.symH = false;
  S.layers[0].grid[1][1] = [5, 5, 5, 255]; S.layers[0].grid[1][6] = [5, 5, 5, 255]; S.sel = { x0: 0, y0: 0, x1: 7, y1: 7 }; S.selMask = new Set(['1,1', '6,1']); cache.dirtyAll();
  const n0 = S.layers.length; clip.doCut(); assert.equal(S.layers[0].grid[1][1], null); assert.equal(S.layers[0].grid[1][6], null); // обе стороны вырезаны
  clip.doPaste(); assert.equal(S.layers.length, n0 + 2); S.sym = false; }); // две стороны → два слоя
t('symmetry: transform двигает стороны зеркально', () => { resetWH(8, 8); S.sym = true; S.symH = false; S.selFloat = null;
  S.layers[0].grid[3][1] = [5, 5, 5, 255]; S.layers[0].grid[3][6] = [5, 5, 5, 255]; cache.dirtyAll();
  S.sel = { x0: 0, y0: 0, x1: 7, y1: 7 }; S.selMask = new Set(['1,3', '6,3']);
  actions.run('transform.enter'); assert.ok(S.rotMode && S.rotMode.sym); // трансформация выделения симметрична
  S.rotMode.tx = -1; S.rotMode.changed = true; tf.exitRotMode(true);
  assert.ok(S.layers[0].grid[3][0] && S.layers[0].grid[3][7]); // лево ушло влево, право — зеркально вправо
  assert.equal(S.layers[0].grid[3][1], null); assert.equal(S.layers[0].grid[3][6], null); S.sym = false; });
t('selection: applySelectionOp add объединяет рамку и новую область', () => { resetWH(6, 6); S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; S.selMask = null;
  sel.applySelectionOp(new Set(['5,5']), 'add'); assert.ok(S.selMask.has('1,1') && S.selMask.has('5,5')); });
t('selection: applySelectionOp subtract вычитает область', () => { resetWH(6, 6); S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; S.selMask = null;
  sel.applySelectionOp(new Set(['1,1']), 'subtract'); assert.ok(!S.selMask.has('1,1') && S.selMask.has('2,2')); });
t('selection: applySelectionOp intersect оставляет пересечение', () => { resetWH(6, 6); S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null;
  sel.applySelectionOp(new Set(['2,2', '9,9']), 'intersect'); assert.deepEqual([...S.selMask], ['2,2']); });
t('selection: applySelectionOp пустой результат снимает выделение', () => { resetWH(6, 6); S.sel = { x0: 1, y0: 1, x1: 1, y1: 1 }; S.selMask = null;
  const r = sel.applySelectionOp(new Set(['1,1']), 'subtract'); assert.equal(r, false); assert.equal(S.sel, null); });

t('lasso: Continuous строит маску одним движением и авто-замыкается', () => { resetWH(8, 8); S.tool = 'lasso'; S.lassoMode = 'continuous'; S.lassoOp = 'replace'; S.sel = S.selMask = null;
  const h = toolHandler('lasso'); h.down({ gx: 1, gy: 1 }); h.move({ gx: 5, gy: 1 }); h.move({ gx: 5, gy: 5 }); h.move({ gx: 1, gy: 5 }); h.up({});
  assert.ok(!fhpath.pathActive() && S.selMask && S.selMask.has('3,3')); });
t('lasso: Segment продолжает контур и замыкается у старта', () => { resetWH(8, 8); S.tool = 'lasso'; S.lassoMode = 'segment'; S.lassoOp = 'replace'; S.sel = S.selMask = null; S.view.zoom = 12;
  const h = toolHandler('lasso'); h.down({ gx: 1, gy: 1 }); h.up({}); assert.ok(fhpath.pathActive() && !S.selMask); // сегмент начат, не замкнут
  h.down({ gx: 5, gy: 1 }); h.up({}); h.down({ gx: 5, gy: 5 }); h.up({}); h.down({ gx: 1, gy: 5 }); h.up({}); assert.ok(fhpath.pathActive());
  h.down({ gx: 1, gy: 1 }); h.up({}); assert.ok(!fhpath.pathActive() && S.selMask && S.selMask.has('3,3')); }); // возврат к старту — замыкание
t('lasso: New Selection сбрасывает старое выделение сразу на старте контура', () => { resetWH(8, 8); S.tool = 'lasso'; S.lassoMode = 'continuous'; S.lassoOp = 'replace'; S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null;
  toolHandler('lasso').down({ gx: 5, gy: 5 }); assert.equal(S.sel, null); }); // старое исчезло немедленно
t('lasso: режим Add сохраняет старое выделение во время нового контура', () => { resetWH(8, 8); S.tool = 'lasso'; S.lassoMode = 'continuous'; S.lassoOp = 'add'; S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null;
  toolHandler('lasso').down({ gx: 5, gy: 5 }); assert.deepEqual(S.sel, { x0: 1, y0: 1, x1: 3, y1: 3 }); actions.run('lasso.cancel'); });
t('lasso: cancel убирает контур, не трогая существующее выделение', () => { resetWH(8, 8); S.tool = 'lasso'; S.lassoMode = 'continuous'; S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null;
  const h = toolHandler('lasso'); h.down({ gx: 5, gy: 5 }); h.move({ gx: 6, gy: 6 }); assert.ok(fhpath.pathActive());
  actions.run('lasso.cancel'); assert.ok(!fhpath.pathActive()); assert.deepEqual(S.sel, { x0: 1, y0: 1, x1: 3, y1: 3 }); });

brushResize.mount(); // вешает слушатели один раз
const brKey = (type, k) => window.dispatchEvent(new window.KeyboardEvent(type, { code: 'Key' + k.toUpperCase(), key: k }));
const brPtr = (x, y, buttons) => document.getElementById('cv').dispatchEvent(new window.MouseEvent('pointermove', { clientX: x, clientY: y, buttons }));
t('brush-resize: движение при зажатом Hot Key меняет размер кисти', () => { resetWH(8, 8); S.tool = 'pencil'; S.brushes.pencil.size = 1;
  S.brushResize.direction = 'horizontal'; S.brushResize.sensitivity = 0.1; S.brushResize.key = 'd'; S.brushResize.capturing = false;
  brKey('keydown', 'd'); brPtr(100, 100, 0); brPtr(200, 100, 0); // вправо → больше
  assert.equal(S.brushes.pencil.size, 11); brKey('keyup', 'd'); });
t('brush-resize: рисование не меняет размер, после штриха снова можно', () => { resetWH(8, 8); S.tool = 'pencil'; S.brushes.pencil.size = 8;
  S.brushResize.direction = 'horizontal'; S.brushResize.sensitivity = 0.1; S.brushResize.key = 'd';
  brKey('keydown', 'd'); brPtr(200, 100, 0); brPtr(150, 100, 1); assert.equal(S.brushes.pencil.size, 8); // ЛКМ нажата — штрих, размер цел
  brPtr(150, 100, 0); brPtr(100, 100, 0); assert.equal(S.brushes.pencil.size, 3); brKey('keyup', 'd'); }); // влево после штриха — уменьшает
t('brush-resize: без зажатого Hot Key размер не меняется', () => { resetWH(8, 8); S.brushes.pencil.size = 4; S.brushResize.sensitivity = 0.1;
  brKey('keydown', 'd'); brKey('keyup', 'd'); brPtr(100, 100, 0); brPtr(300, 100, 0); assert.equal(S.brushes.pencil.size, 4); });
t('brush-resize: направление и чувствительность переключаются циклически', () => { S.brushResize.direction = 'both'; S.brushResize.sensitivity = 0.05;
  actions.run('brushResize.cycleDir'); assert.equal(S.brushResize.direction, 'horizontal');
  actions.run('brushResize.cycleSens'); assert.notEqual(S.brushResize.sensitivity, 0.05); });
const wheel = (dy) => window.dispatchEvent(new window.WheelEvent('wheel', { deltaY: dy, cancelable: true }));
t('brush-resize: колесо при зажатом D меняет размер', () => { resetWH(8, 8); S.tool = 'pencil'; S.brushes.pencil.size = 4; S.brushResize.key = 'd'; S.brushResize.capturing = false;
  brKey('keydown', 'd'); wheel(-1); assert.equal(S.brushes.pencil.size, 5); wheel(1); assert.equal(S.brushes.pencil.size, 4); brKey('keyup', 'd'); });
t('brush-resize: без зажатого D колесо размер не трогает', () => { resetWH(8, 8); S.brushes.pencil.size = 4;
  wheel(-1); assert.equal(S.brushes.pencil.size, 4); });

await import('../src/systems/draw/quickshape.js'); const { QUICKSHAPE } = await import('../src/config/quickshape.js');
await ta('quickshape: удержание выравнивает прямоугольник и коммитит на слой', async () => { resetWH(20, 20); S.tool = 'pencil'; S.active = [9, 9, 9]; S.qsShape = null; QUICKSHAPE.holdMs = 12;
  const h = toolHandler('pencil'), add = (x, y) => h.move({ gx: x, gy: y }); h.down({ gx: 1, gy: 1 });
  for (let x = 1; x <= 12; x++) add(x, 1); for (let y = 2; y <= 9; y++) add(12, y);
  for (let x = 11; x >= 1; x--) add(x, 9); for (let y = 8; y >= 1; y--) add(1, y);
  await new Promise((r) => setTimeout(r, 30)); assert.equal(S.qsShape && S.qsShape.type, 'rect'); // распозналось, превью активно
  h.up({}); assert.equal(S.qsShape, null); assert.ok(S.layers[0].grid[1][1] && S.layers[0].grid[1][12] && S.layers[0].grid[9][1] && S.layers[0].grid[9][12]); }); // ровный прямоугольник на слое
await ta('quickshape: без удержания остаётся raw-штрих', async () => { resetWH(20, 20); S.tool = 'pencil'; S.active = [9, 9, 9]; S.qsShape = null; QUICKSHAPE.holdMs = 200;
  const h = toolHandler('pencil'); h.down({ gx: 2, gy: 2 }); h.move({ gx: 5, gy: 8 }); h.up({}); // отпустили сразу
  assert.equal(S.qsShape, null); assert.ok(S.layers[0].grid[2][2] && S.layers[0].grid[8][5]); }); // кривой штрих как есть, без формы

const penButton = await import('../src/systems/pen-button.js'); penButton.mount();
const penBtn = (button = 2) => { const ev = new window.MouseEvent('pointerdown', { button, bubbles: true }); Object.defineProperty(ev, 'pointerType', { value: 'pen' }); window.dispatchEvent(ev); };
t('pen-button: кнопка стилуса переключает кисть↔ластик', () => { resetWH(8, 8); S.tool = 'pencil';
  penBtn(); assert.equal(S.tool, 'eraser'); penBtn(); assert.equal(S.tool, 'pencil'); });
t('pen-button: контакт пера (button 0) инструмент не переключает', () => { resetWH(8, 8); S.tool = 'pencil';
  penBtn(0); assert.equal(S.tool, 'pencil'); });
eyedropper.mount(); // вешает слушатели Eyedropper System один раз
const bbTap = () => { const pk = document.getElementById('bb-pick'); pk.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true })); pk.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true })); };
t('eyedropper: короткий клик по bb-pick включает залипающий режим (ПК)', () => { resetWH(8, 8); document.body.classList.remove('picking');
  bbTap(); assert.ok(document.body.classList.contains('picking')); // пипетка активна без Hot Key
  bus.emit('tool', 'pencil'); assert.ok(!document.body.classList.contains('picking')); }); // выбор инструмента выключает
t('eyedropper: повторный клик по bb-pick выключает залипающий режим', () => { document.body.classList.remove('picking');
  bbTap(); assert.ok(document.body.classList.contains('picking'));
  bbTap(); assert.ok(!document.body.classList.contains('picking')); });
t('eyedropper: brush-resize живёт на клавише D отдельно от пипетки', () => { resetWH(8, 8); S.tool = 'pencil'; S.brushes.pencil.size = 1;
  S.brushResize.direction = 'horizontal'; S.brushResize.sensitivity = 0.1; S.brushResize.key = 'd';
  brKey('keydown', 'd'); brPtr(100, 100, 0); brPtr(200, 100, 0); assert.ok(S.brushes.pencil.size > 1); brKey('keyup', 'd'); });
t('clipboard: copy/paste на новый слой', () => { resetWH(6, 6); S.layers[0].grid[1][1] = [7, 7, 7, 255]; S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; S.selMask = null;
  clip.doCopy(); const m = S.layers.length; S.sel = { x0: 3, y0: 3, x1: 4, y1: 4 }; clip.doPaste();
  assert.equal(S.layers.length, m + 1); assert.ok(S.layers[S.cur].grid[3][3]); assert.equal(S.sel, null); });

// --- единый Export: дерево, форматы, пайплайн (Scope→Doc→Mode→Format→Save) ---
t('export-tree: scope=project — все верхние узлы (папка + слой)', () => { exportProject();
  const d = xtree.buildExportDoc('project', false);
  assert.equal(d.root.length, 2); assert.ok(d.root.some((n2) => n2.kind === 'folder' && n2.name === 'G')); });
t('export-tree: includeHidden скрывает/раскрывает скрытый слой c', () => { exportProject();
  const off = xtree.buildExportDoc('project', false), fol = off.root.find((x) => x.kind === 'folder');
  assert.equal(fol.children.length, 1); // c скрыт
  const on = xtree.buildExportDoc('project', true).root.find((x) => x.kind === 'folder');
  assert.equal(on.children.length, 2); });
t('export-tree: scope=folder экспортирует выбранную папку', () => { exportProject(); S.selFolder = 1;
  const d = xtree.buildExportDoc('folder', false); assert.equal(d.root.length, 1); assert.equal(d.root[0].kind, 'folder'); });
t('export-tree: scope=selected — отмеченные слои', () => { exportProject(); S.marked = new Set([0]); S.cur = 0;
  const d = xtree.buildExportDoc('selected', false); assert.ok(d.root.some((nd) => nd.name === 'a')); });
t('export-render: flattenNodes даёт canvas W×H', () => { exportProject();
  const d = xtree.buildExportDoc('project', false), c = xrender.flattenNodes(d.root, false);
  assert.equal(c.width, 6); assert.equal(c.height, 6); });
t('export-format: возможности форматов (PNG без слоёв, PSD со слоями)', () => {
  assert.equal(FORMATS.png.supportsLayered, false); assert.equal(FORMATS.png.supportsFlattened, true);
  assert.equal(FORMATS.psd.supportsLayered, true); assert.equal(FORMATS.psd.supportsFolders, true); });
t('export-psd: writePsd возвращает непустой Blob', () => { const W = 2, H = 2, z = new Uint8Array(W * H);
  const b = writePsd({ W, H, layers: [{ name: 'L', opacity: 255, hidden: false, clip: false, lsct: 0, data: { 0: z, 1: z, 2: z, 3: z } }], comp: { 0: z, 1: z, 2: z, 3: z } });
  assert.ok(b.size > 0); });
await ta('export: слой/папка/проект → PNG (flattened)', async () => { exportProject();
  for (const scope of ['selected', 'folder', 'project']) { S.selFolder = scope === 'folder' ? 1 : null; S.marked = new Set([0]);
    const out = await xpipe.runExport({ scope, mode: 'flattened', format: 'png', canvasBounds: 'current', includeHidden: false });
    assert.equal(out.length, 1); assert.ok(/\.png$/.test(out[0].name)); } });
await ta('export: слой/папка/проект → PSD (layered)', async () => { exportProject();
  for (const scope of ['selected', 'folder', 'project']) { S.selFolder = scope === 'folder' ? 1 : null; S.marked = new Set([0]);
    const out = await xpipe.runExport({ scope, mode: 'layered', format: 'psd', canvasBounds: 'current', includeHidden: false });
    assert.equal(out.length, 1); assert.ok(/\.psd$/.test(out[0].name)); } });
await ta('export: separate — все слои (leaf) = по файлу на слой', async () => { exportProject();
  const out = await xpipe.runExport({ scope: 'project', mode: 'separate', separateMode: 'leaf', boundsMode: 'each', format: 'png', canvasBounds: 'current', includeHidden: true });
  assert.equal(out.length, 3); }); // a, b, c
await ta('export: separate top-level = папка одним файлом + слой', async () => { exportProject();
  const out = await xpipe.runExport({ scope: 'project', mode: 'separate', separateMode: 'top', boundsMode: 'same', format: 'png', canvasBounds: 'current', includeHidden: false });
  assert.equal(out.length, 2); });
await ta('export: новый формат без переписывания пайплайна', async () => { exportProject();
  let got = null;
  FORMATS.fake = { id: 'fake', supportsFlattened: true, supportsLayered: false, supportsSeparateFiles: true,
    encode: (c, name) => Promise.resolve({ name: name + '.fake', blob: new Blob([new Uint8Array([1])]), mime: 'x/fake', desc: 'fake' }) };
  const out = await xpipe.runExport({ scope: 'project', mode: 'flattened', format: 'fake', canvasBounds: 'current', includeHidden: false });
  got = out[0].name; delete FORMATS.fake; assert.ok(/\.fake$/.test(got)); });

t('import: ImageData → пиксель-документ', () => {
  const data = new Uint8ClampedArray(4 * 4 * 4); // 2×2 красный блок в центре 4×4
  for (const [px, py] of [[1, 1], [2, 1], [1, 2], [2, 2]]) { const o = (py * 4 + px) * 4; data[o] = 200; data[o + 1] = 30; data[o + 2] = 30; data[o + 3] = 255; }
  imp.setImpData({ width: 4, height: 4, data }); imp.setImportMode('replace');
  imp.impConvert(); imp.applyImport();
  assert.equal(S.layers.length, 1); assert.equal(S.cur, 0);
  assert.ok(S.W >= 1 && S.W <= 4 && S.H >= 1 && S.H <= 4); assert.ok(S.palette.length > 0);
});

t('import: drag в редактор — Pixelize верхним слоем, документ не стирается', () => {
  resetWH(6, 6); S.layers[0].grid[1][1] = [9, 9, 9, 255]; cache.dirtyAll();
  const baseLayers = S.layers.length, baseW = S.W, baseH = S.H;
  const data = new Uint8ClampedArray(2 * 2 * 4); for (let i = 0; i < 4; i++) { data[i * 4] = 200; data[i * 4 + 3] = 255; }
  imp.setImpData({ width: 2, height: 2, data }); imp.setImportMode('layer'); imp.impConvert(); imp.applyImport();
  assert.equal(S.W, baseW); assert.equal(S.H, baseH); // холст НЕ заменён
  assert.equal(S.layers.length, baseLayers + 1); // добавлен верхний слой
  assert.equal(S.cur, S.layers.length - 1); // активен новый верхний
  assert.deepEqual(S.layers[0].grid[1][1], [9, 9, 9, 255]); // прежний контент цел
  imp.setImportMode('replace');
});

t('palette: buildPalette рисует свотчи', () => { resetWH(4, 4); S.palette = [[1, 1, 1], [2, 2, 2]]; S.active = [1, 1, 1];
  pal.buildPalette(); assert.equal(document.querySelectorAll('#pal .sw:not(.plus)').length, 2); });
t('palette: setActiveColor меняет активный', () => { pal.setActiveColor([9, 8, 7], false); assert.deepEqual(S.active, [9, 8, 7]); });

t('brush-bar: syncBars без ошибок', () => { S.brushes.pencil.size = 4; bb.syncBars(); assert.ok(true); });
t('brush-bar: шкала доходит до нового потолка и бережёт малые размеры', () => {
  const linearMid = Math.round(1 + 0.5 * (BP_SMAX - 1));
  assert.equal(bb.sizeFromFrac(0), 1); assert.equal(bb.sizeFromFrac(1), BP_SMAX);
  assert.ok(bb.sizeFromFrac(0.5) < linearMid); assert.equal(bb.sizeFromFrac(bb.fracFromSize(BP_SMAX)), BP_SMAX);
});
t('brush-bar: хоткеи размера кисти упираются в потолок', () => {
  resetWH(8, 8); S.brushes.pencil.size = BP_SMAX - 1;
  actions.run('brush.bigger'); assert.equal(S.brushes.pencil.size, BP_SMAX);
  actions.run('brush.bigger'); assert.equal(S.brushes.pencil.size, BP_SMAX);
  actions.run('brush.smaller'); assert.equal(S.brushes.pencil.size, BP_SMAX - 1);
});
t('color-picker: sync из активного', () => { S.active = [255, 0, 0]; cp.syncColFromActive(); assert.equal(document.getElementById('col-hv').textContent, '0'); });

t('windows: preview/reference монтируются без ошибок', () => { prev.mount(); ref.mount(); assert.ok(true); });

t('palette-manager: монтируется и сохраняет палитру', () => { S.palette = [[1, 2, 3], [4, 5, 6]]; palMgr.mount();
  document.getElementById('pal-name').value = 'тест'; document.getElementById('pal-save').click();
  const saved = JSON.parse(localStorage.getItem('palettes')); assert.deepEqual(saved['тест'], [[1, 2, 3], [4, 5, 6]]); });

t('tint-shade: окно открывается от активного цвета палитры, шкалы по 5', () => {
  tsg.mount(); S.palette = [[10, 20, 30], [200, 100, 50]]; S.active = [200, 100, 50];
  document.getElementById('tsg-btn').click();
  assert.ok(document.getElementById('tsg-win').classList.contains('on'));
  assert.equal(document.querySelectorAll('#tsg-scales .tsg-scale').length, 2); // тинты + шейды
  assert.equal(document.querySelectorAll('#tsg-scales .tsg-scale')[0].querySelectorAll('.tsg-sw').length, 5);
});
t('tint-shade: гармония рисует доп. шкалы по 5', () => {
  document.querySelector('#tsg-win [data-harm="triadic"]').click();
  const blocks = document.querySelectorAll('#tsg-harm .tsg-block');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].querySelectorAll('.tsg-sw').length, 10); // 5 тинтов + 5 шейдов
});
t('swipe-actions: action c icon рисует svg-кнопку, label идёт в title', () => {
  const row = document.createElement('div');
  swipe.attachSwipe(row, { actions: [
    { icon: '<svg viewBox="0 0 24 24"><path d="M4 4"/></svg>', label: 'Замок', onClick: () => {} },
    { label: 'Правка', onClick: () => {} }] });
  const btns = row.querySelectorAll('.swipe-act');
  assert.ok(btns[0].classList.contains('icon')); assert.ok(btns[0].querySelector('svg')); assert.equal(btns[0].title, 'Замок');
  assert.ok(!btns[1].classList.contains('icon')); assert.equal(btns[1].textContent, 'Правка');
});
t('tint-shade: галочка у базы выбирает/снимает всю шкалу целиком', () => {
  S.palette = [[40, 90, 200]]; S.active = [40, 90, 200];
  document.getElementById('tsg-btn').click(); // переоткрыть — выбор чистый
  const check = () => document.querySelector('#tsg-basecheck .tsg-check');
  check().click(); // тинты(5)+шейды(5), база общая → 9 уникальных
  assert.equal(document.querySelectorAll('#tsg-selprev .tsg-chip').length, 9);
  assert.ok(check().classList.contains('on'));
  check().click(); // снять всю шкалу
  assert.equal(document.querySelectorAll('#tsg-selprev .tsg-chip').length, 0);
});
t('tint-shade: кнопки Close в окне нет (закрытие крестиком)', () => {
  assert.equal(document.getElementById('tsg-close'), null);
});
t('tint-shade: addSelected/createNew меняют палитру', () => {
  S.palette = [[1, 2, 3]];
  assert.equal(tsg.addSelectedToCurrentPalette([[9, 9, 9], [1, 2, 3]]), 1); // дубль не добавляется
  assert.deepEqual(S.palette, [[1, 2, 3], [9, 9, 9]]);
  tsg.createNewPaletteFromSelected([[7, 7, 7], [8, 8, 8]]);
  assert.deepEqual(S.palette, [[7, 7, 7], [8, 8, 8]]); assert.deepEqual(S.active, [7, 7, 7]);
});
t('tint-shade: кнопка New не закрывает окно (закрывается только крестиком)', () => {
  tsg.mount(); S.palette = [[10, 20, 30], [200, 100, 50]]; S.active = [200, 100, 50];
  document.getElementById('tsg-btn').click(); // открыть окно
  document.querySelector('#tsg-scales .tsg-sw').click(); // выбрать цвет, иначе New ничего не делает
  document.getElementById('tsg-create').click();
  assert.ok(document.getElementById('tsg-win').classList.contains('on')); // окно осталось
  document.getElementById('tsg-x').click();
  assert.ok(!document.getElementById('tsg-win').classList.contains('on')); // крестик закрывает
});
t('tint-shade: без активного цвета в палитре — окно не открывается', () => {
  document.getElementById('tsg-win').classList.remove('on');
  S.palette = [[1, 2, 3]]; S.active = [200, 200, 200]; // нет в палитре
  document.getElementById('tsg-btn').click();
  assert.ok(!document.getElementById('tsg-win').classList.contains('on'));
});

t('toolbars: mount + смена инструмента подсвечивает кнопку', () => { tb.mount(); setTool('eraser'); assert.ok(document.getElementById('t-eraser').classList.contains('on')); assert.ok(!document.getElementById('t-pencil').classList.contains('on')); });
t('toolbars: повторный ЛКМ по активной кисти открывает библиотеку', () => {
  let opened = null; actions.register('ui.brushLibrary', (mode) => { opened = mode; });
  resetWH(8, 8); S.tool = 'eraser'; document.getElementById('t-pencil').click();
  assert.equal(S.tool, 'pencil'); assert.equal(opened, null);
  document.getElementById('t-pencil').click(); assert.equal(opened, 'pencil');
});
t('toolbars: повторное нажатие Move выключает трансформацию', () => { tb.mount(); resetWH(8, 8); S.tool = 'move'; S.layers[0].grid[2][2] = [1, 1, 1, 255]; cache.dirtyAll();
  actions.run('transform.enter'); assert.ok(S.rotMode); document.getElementById('t-move').click(); assert.equal(S.rotMode, null); }); // активная кнопка трансформации выключает
t('toolbars: повторное нажатие выделения снимает выделение', () => { tb.mount(); resetWH(8, 8); S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null; S.tool = 'select';
  document.getElementById('t-select').click(); assert.equal(S.sel, null); assert.equal(S.tool, 'pencil'); }); // активная кнопка выделения снимает
t('toolbars: выделение и Free Transform подсвечивают свои кнопки', () => { resetWH(8, 8); S.tool = 'pencil';
  S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; bus.emit('selection');
  assert.ok(document.getElementById('t-select').classList.contains('on'));
  S.sel = null; S.layers[0].grid[2][2] = [1, 1, 1, 255]; actions.run('transform.enter');
  assert.ok(document.getElementById('t-move').classList.contains('on'));
  tf.exitRotMode(false); assert.ok(!document.getElementById('t-move').classList.contains('on')); });
t('toolbars: переключатель симметрии', () => { S.sym = false; document.getElementById('sym').click(); assert.equal(S.sym, true); });
t('effects: новый эффект до Apply остаётся черновиком без строки в списке', () => { effects.mount(); adjust.mount();
  resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  actions.run('fx.panel'); assert.ok(document.getElementById('fx-panel').classList.contains('on'));
  document.querySelector('#fx-types button[data-fx="glow"]').click(); layList();
  assert.equal(S.layers[0].effects.length, 0); assert.ok(S.fxDraft && S.fxDraft.eff.type === 'glow');
  assert.equal(document.querySelectorAll('#lay-list .fxrow').length, 0); assert.ok(document.getElementById('fx-edit').classList.contains('on'));
  document.getElementById('fx-cancel').click(); assert.equal(S.fxDraft, null); assert.equal(S.layers[0].effects.length, 0); });

t('effects: новые эффекты берут активный цвет', () => { resetWH(8, 8); S.active = [12, 34, 56];
  for (const type of EFFECT_TYPES) {
    document.querySelector(`#fx-types button[data-fx="${type}"]`).click();
    assert.equal(S.fxDraft.eff.params.color, '#0c2238'); document.getElementById('fx-cancel').click();
  } });

t('effects: Apply фиксирует эффект, undo убирает', () => { resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  document.querySelector('#fx-types button[data-fx="stroke"]').click(); document.getElementById('fx-apply').click();
  assert.equal(S.layers[0].effects.length, 1); history.doUndo(); assert.equal(S.layers[0].effects.length, 0); });

t('effects: copy/paste переносит эффект на выбранные слои', () => { resetWH(8, 8); lops.doAddLayer();
  S.layers[0].effects = [{ id: 9, type: 'stroke', visible: true, params: { size: 1, color: '#ff0000' } }];
  S.fxCur = S.layers[0].effects[0]; S.fxSel = new Set([S.fxCur]); actions.run('fx.copy');
  S.cur = 1; S.marked = new Set([0, 1]); actions.run('fx.paste');
  assert.ok(S.layers[1].effects.length >= 1 && S.layers[1].effects[0].type === 'stroke'); S.marked = new Set(); S.fxSel.clear(); S.fxCur = null; });

t('fx: Convert To Layer — новый слой только с эффектом, источник цел', () => { resetWH(8, 8); const L = S.layers[0]; L.grid[4][4] = [1, 1, 1, 255];
  L.effects = [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#ff0000' } }]; cache.dirtyAll();
  const eff = L.effects[0], n0 = S.layers.length; actions.run('fx.convert', L, eff);
  assert.equal(S.layers.length, n0 + 1); assert.equal(L.effects.length, 0); // эффект снят с источника
  const nl = S.layers[S.layers.indexOf(L) - 1]; // слой под источником
  assert.ok(nl && nl.grid.some((r) => r.some((c) => c && c[0] === 255))); // в новом слое только пиксели обводки
  assert.deepEqual(L.grid[4][4], [1, 1, 1, 255]); }); // исходный пиксель не тронут
t('fx: Copy Effects + Paste копирует все эффекты, копии независимы', () => { resetWH(8, 8); const src = S.layers[0];
  src.effects = [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#ff0000' } }, { id: 2, type: 'glow', visible: false, params: { size: 3, intensity: 0.5, color: '#00ff00' } }];
  lops.doAddLayer(); const tgt = S.layers[S.cur]; actions.run('fx.copyAll', src); actions.run('fx.paste');
  assert.equal(tgt.effects.length, 2); assert.equal(tgt.effects[1].visible, false); // порядок и visibility сохранены
  tgt.effects[0].params.size = 9; assert.equal(src.effects[0].params.size, 1); }); // вставленные эффекты независимы
t('fx: Delete удаляет только выбранный эффект', () => { resetWH(8, 8); const L = S.layers[0];
  L.effects = [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#f00' } }, { id: 2, type: 'glow', visible: true, params: { size: 3, intensity: 0.5, color: '#0f0' } }];
  S.fxCur = L.effects[0]; S.fxSel = new Set([L.effects[0]]); actions.run('fx.delete');
  assert.equal(L.effects.length, 1); assert.equal(L.effects[0].type, 'glow'); S.fxSel.clear(); S.fxCur = null; });

t('effects: дублирование/удаление выделенных эффектов', () => { resetWH(8, 8);
  S.layers[0].effects = [{ id: 11, type: 'stroke', visible: true, params: { size: 1, color: '#ff0000' } }];
  S.fxCur = S.layers[0].effects[0]; S.fxSel = new Set([S.fxCur]); actions.run('fx.duplicate'); assert.equal(S.layers[0].effects.length, 2);
  S.fxSel = new Set(S.layers[0].effects); actions.run('fx.delete'); assert.equal(S.layers[0].effects.length, 0); });

t('effects: drag — перенос на слой и переупорядочивание', () => { resetWH(8, 8); lops.doAddLayer();
  const A = { id: 21, type: 'stroke', visible: true, params: { size: 1, color: '#f00' } };
  const B = { id: 22, type: 'glow', visible: true, params: { size: 4, intensity: 0.8, color: '#0f0' } };
  S.layers[0].effects = [A, B]; S.layers[1].effects = []; S.fxSel = new Set();
  const lrow = document.createElement('div'); lrow.dataset.li = '1'; // строка второго слоя
  fxdrag.fxDrop([A], lrow, false); // тащим A на строку слоя → эффект применяется к нему
  assert.deepEqual(S.layers[0].effects, [B]); assert.equal(S.layers[1].effects[0], A);
  const bRow = document.createElement('div'); bRow.className = 'fxrow'; bRow.__eff = B; // строка эффекта B (в слое 0)
  fxdrag.fxDrop([A], bRow, false); // тащим A над B (верх стека) — назад в слой 0
  assert.deepEqual(S.layers[0].effects, [B, A]); assert.equal(S.layers[1].effects.length, 0);
  S.layers[0].effects = []; S.fxSel.clear(); S.fxCur = null; });

t('effects: удаление при выбранном эффекте бьёт по эффекту, а не по слою', () => { resetWH(8, 8);
  S.layers[0].effects = [{ id: 31, type: 'stroke', visible: true, params: { size: 1, color: '#f00' } }];
  S.fxCur = S.layers[0].effects[0]; S.fxSel = new Set([S.fxCur]);
  lops.deleteLayer(); // корзина в панели слоёв при выбранном эффекте
  assert.equal(S.layers.length, 1); assert.equal(S.layers[0].effects.length, 0); // слой цел, эффект удалён
  S.layers[0].effects = [{ id: 32, type: 'glow', visible: true, params: { size: 4, intensity: 0.8, color: '#0f0' } }];
  S.fxCur = S.layers[0].effects[0]; S.fxSel = new Set([S.fxCur]);
  actions.run('edit.delete'); // клавиатурный Delete при выбранном эффекте
  assert.equal(S.layers.length, 1); assert.equal(S.layers[0].effects.length, 0);
  S.fxSel.clear(); S.fxCur = null; });

t('effects: list рисует строку эффекта под слоем', () => { resetWH(8, 8); S.layers[0].effects = [{ id: 7, type: 'glow', visible: true, params: { ...({ size: 6, intensity: 0.8, color: '#78d7ff' }) } }];
  document.getElementById('lay-pop').classList.add('on'); layList(); assert.ok(document.querySelectorAll('#lay-list .fxrow').length >= 1); S.layers[0].effects = []; });

t('effects: цвет эффекта — наш #colpop, не системный input[type=color]', () => { cp.mount();
  assert.equal(document.querySelectorAll('#fx-edit input[type=color]').length, 0); // системного пикера в окне эффекта нет
  resetWH(8, 8); document.querySelector('#fx-types button[data-fx="stroke"]').click(); // черновик stroke
  const eff = S.fxDraft.eff, before = eff.params.color;
  document.getElementById('fx-colsw').onclick(); assert.ok(document.getElementById('colpop').classList.contains('on')); // открылся НАШ пикер
  const active0 = S.active.slice();
  const h = document.getElementById('col-h'); h.value = '200'; h.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.notEqual(eff.params.color, before); // цвет эффекта обновился через наш пикер
  assert.deepEqual(S.active, active0); // активный цвет не тронут
  document.getElementById('fx-cancel').click(); });

t('crop: toggle из выделения + apply кадрирует', () => { resetWH(8, 8); S.sel = { x0: 1, y0: 1, x1: 4, y1: 4 }; S.selMask = null;
  crop.toggleCrop(); assert.ok(S.cropMode); crop.applyCrop(); assert.equal(S.W, 4); assert.equal(S.H, 4); });

t('status: при кропе показывает размер рамки рядом с холстом', () => { resetWH(8, 8); status.mount();
  bus.emit('layers'); assert.equal(document.getElementById('status').textContent, '8×8 px');
  S.cropMode = { x0: 2, y0: 1, x1: 5, y1: 5, idx: 0, idy: 0 }; bus.emit('render');
  assert.equal(document.getElementById('status').textContent, '8×8 → 4×5 px');
  S.cropMode = null; bus.emit('render'); assert.equal(document.getElementById('status').textContent, '8×8 px'); });

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

t('selection-handles: ручки активны и для лассо (перехватывают клик по области)', () => { resetWH(8, 8); S.tool = 'lasso'; S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = new Set(['2,2']); S.selFloat = null;
  const gh = globalHandlers().find((h) => h.down); assert.equal(gh.down({ gx: 2, gy: 2, e: null }), true); // клик по выделению лассо → ручки (трансформ области), не новый контур
  gh.up({}); S.sel = S.selMask = null; });
t('canvas-handlers: move двигает рамку выделения вместе со слоем', () => { resetWH(8, 8); S.tool = 'move'; S.marked = new Set();
  S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = new Set(['2,2']);
  const h = toolHandler('move'); h.down({ gx: 0, gy: 0, e: {} }); h.move({ gx: 2, gy: 1, e: {} }); h.up({});
  assert.deepEqual(S.sel, { x0: 3, y0: 2, x1: 5, y1: 4 }); assert.ok(S.selMask.has('4,3')); S.sel = S.selMask = null; });

t('input: mount + диспетч pencil рисует', () => { resetWH(8, 8); S.active = [3, 4, 5]; S.tool = 'pencil'; input.mount();
  input.down({ pointerType: 'mouse', button: 0, clientX: 2, clientY: 2 }); input.up({ pointerType: 'mouse', button: 0 });
  // координаты зависят от view; проверяем, что хоть одна клетка закрашена
  assert.ok(S.layers[0].grid.some((r) => r.some((c) => c))); });
t('input: ПКМ пан холста работает и с инструментом move', () => { resetWH(8, 8); S.tool = 'move'; S.view.ox = 0; S.view.oy = 0;
  input.down({ pointerType: 'mouse', button: 2, clientX: 100, clientY: 100, pointerId: 1 });
  input.move({ pointerType: 'mouse', button: 2, clientX: 140, clientY: 100 });
  assert.equal(S.view.ox, 40); // правая кнопка сдвинула холст, а не «съелась» move-инструментом
  input.up({ pointerType: 'mouse', button: 2, pointerId: 1 }); });
t('input: ЛКМ вне выделения снимает его у любого инструмента', () => { resetWH(8, 8); S.tool = 'pencil'; S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; S.selMask = null;
  const undo = overCv(); input.down({ pointerType: 'mouse', button: 0, clientX: 6, clientY: 6, pointerId: 1 }); input.up({ pointerType: 'mouse', button: 0, pointerId: 1 }); undo();
  assert.equal(S.sel, null); assert.equal(S.layers[0].grid[6][6], null); });
t('input: ПКМ при выделении открывает selection-меню', () => { resetWH(8, 8); S.tool = 'pencil'; S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; S.selMask = null;
  let sm = 0, cm = 0; const offS = bus.on('selection-menu', () => sm++), offC = bus.on('canvas-menu', () => cm++), undo = overCv();
  input.down({ pointerType: 'mouse', button: 2, clientX: 5, clientY: 5, pointerId: 1 });
  input.up({ pointerType: 'mouse', button: 2, clientX: 5, clientY: 5, pointerId: 1 }); undo(); offS(); offC();
  assert.equal(sm, 1); assert.equal(cm, 0); });
t('input: ЛКМ по выделению двигает только рамку', () => { resetWH(8, 8); S.tool = 'pencil'; S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null;
  S.layers[0].grid[2][2] = [7, 7, 7, 255]; const undo = overCv(10);
  input.down({ pointerType: 'mouse', button: 0, clientX: 25, clientY: 25, pointerId: 1 });
  input.move({ pointerType: 'mouse', button: 0, clientX: 45, clientY: 35, pointerId: 1 });
  input.up({ pointerType: 'mouse', button: 0, pointerId: 1 }); undo();
  assert.deepEqual(S.sel, { x0: 3, y0: 2, x1: 5, y1: 4 }); assert.deepEqual(S.layers[0].grid[2][2], [7, 7, 7, 255]); });

t('selection-input: select-инструмент тянет рамку', () => { resetWH(8, 8); S.tool = 'select'; S.sel = null; S.selMask = null;
  S.layers[0].grid[2][2] = [1, 1, 1, 255]; // в рамке есть пиксель — выделение валидно
  const h = toolHandler('select'); h.down({ gx: 1, gy: 1, e: null }); h.move({ gx: 4, gy: 4, e: null }); h.up({});
  assert.deepEqual(S.sel, { x0: 1, y0: 1, x1: 4, y1: 4 }); });

t('selection-input: пустая рамка не создаётся', () => { resetWH(8, 8); S.tool = 'select'; S.sel = null; S.selMask = null;
  const h = toolHandler('select'); h.down({ gx: 1, gy: 1, e: null }); h.move({ gx: 4, gy: 4, e: null }); h.up({});
  assert.equal(S.sel, null); });
t('selection-input: клик в свободное место снимает активное выделение', () => { resetWH(8, 8); S.tool = 'select'; S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null;
  const h = toolHandler('select'); h.down({ gx: 6, gy: 6, e: null }); h.move({ gx: 7, gy: 7, e: null }); h.up({});
  assert.equal(S.sel, null); });
t('selection-input: клик в пустую клетку маски снимает выделение', () => { resetWH(8, 8); S.tool = 'select'; S.sel = { x0: 1, y0: 1, x1: 4, y1: 4 }; S.selMask = new Set(['2,2']);
  const h = toolHandler('select'); h.down({ gx: 3, gy: 3, e: null }); h.up({});
  assert.equal(S.sel, null); assert.equal(S.selMask, null); });
t('selection-input: hover внутри рамки — курсор move', () => { resetWH(8, 8); S.tool = 'select';
  S.sel = { x0: 2, y0: 2, x1: 5, y1: 5 }; S.selMask = null;
  const h = toolHandler('select');
  assert.equal(h.hover({ gx: 3, gy: 3, e: null }), 'move');
  assert.equal(h.hover({ gx: 7, gy: 7, e: null }), null); S.sel = null; });
t('selection-float: lift + commit переносит фрагмент', () => { resetWH(8, 8); S.layers[0].grid[2][2] = [7, 7, 7, 255]; S.sel = { x0: 2, y0: 2, x1: 2, y1: 2 }; S.selMask = null;
  sfloat.liftSelection(); assert.equal(S.layers[0].grid[2][2], null); S.selFloat.x = 5; S.selFloat.y = 5; sfloat.commitFloat();
  assert.deepEqual(S.layers[0].grid[5][5], [7, 7, 7, 255]); });

t('layer-cache: висящий фрагмент подмешивается в канвас слоя', () => { resetWH(8, 8);
  S.layers[0].grid[2][2] = [7, 7, 7, 255]; S.cur = 0; S.sel = { x0: 2, y0: 2, x1: 2, y1: 2 }; S.selMask = null;
  assert.equal(cache.layerFloatCanvas(0), cache.layerCanvas(0)); // фрагмента нет — кешированный канвас как есть
  sfloat.liftSelection();
  assert.notEqual(cache.layerFloatCanvas(0), cache.layerCanvas(0)); // фрагмент в воздухе — слой рисуется с ним
  sfloat.commitFloat(); S.sel = S.selMask = null;
  assert.equal(cache.layerFloatCanvas(0), cache.layerCanvas(0)); });

t('selection-float: повторный перенос не стирает подложку', () => { resetWH(8, 8); S.tool = 'select';
  S.layers[0].grid[0][0] = [1, 1, 1, 255]; S.layers[0].grid[4][4] = [9, 9, 9, 255]; S.cur = 0;
  S.sel = { x0: 0, y0: 0, x1: 0, y1: 0 }; S.selMask = null;
  const h = toolHandler('select');
  h.down({ gx: 0, gy: 0, e: null }); h.move({ gx: 4, gy: 4 }); h.up({});   // несём пиксель на (4,4): он висит, не оседает
  assert.deepEqual(S.layers[0].grid[4][4], [9, 9, 9, 255]);                 // подложка под фрагментом цела
  h.down({ gx: 4, gy: 4, e: null }); h.move({ gx: 6, gy: 6 }); h.up({});   // поднимаем тот же фрагмент дальше
  actions.run('select.none');                                               // деселект — фрагмент оседает
  assert.deepEqual(S.layers[0].grid[4][4], [9, 9, 9, 255]);
  assert.deepEqual(S.layers[0].grid[6][6], [1, 1, 1, 255]); S.sel = S.selMask = null; });

t('transform: enter строит превью, exit применяет', () => { resetWH(8, 8); S.layers[0].grid[3][3] = [1, 1, 1, 255]; S.layers[0].grid[3][4] = [1, 1, 1, 255]; cache.dirtyAll();
  tf.enterRotMode(S.layers[0]); assert.ok(S.rotMode); assert.ok(S.rotPrev);
  S.rotMode.tx = 1; S.rotMode.changed = true; tf.exitRotMode(true); assert.equal(S.rotMode, null); });
t('transform: ЛКМ вне рамки завершает трансформацию', () => { tf.mount(); resetWH(8, 8); S.tool = 'move'; S.view = { zoom: 10, ox: 0, oy: 0 }; S.layers[0].grid[2][2] = [1, 2, 3, 255]; cache.dirtyAll();
  actions.run('transform.enter'); assert.ok(S.rotMode); // вошли в свободную трансформацию
  input.down({ pointerType: 'mouse', button: 0, clientX: -100, clientY: -100, pointerId: 1 }); input.up({ pointerType: 'mouse', button: 0, pointerId: 1 });
  assert.equal(S.rotMode, null); }); // клик вне рамки применил и закрыл
t('transform: Ctrl+T с Selection трансформирует фрагмент и гасит выделение', () => { resetWH(8, 8);
  S.layers[0].grid[2][2] = [9, 9, 9, 255]; S.layers[0].grid[5][5] = [1, 1, 1, 255];
  S.sel = { x0: 2, y0: 2, x1: 2, y1: 2 }; S.selMask = null; actions.run('transform.enter');
  assert.ok(S.rotMode && S.rotMode.selection); assert.equal(S.sel, null); assert.equal(S.layers[0].grid[2][2], null);
  assert.deepEqual(S.layers[0].grid[5][5], [1, 1, 1, 255]);
  S.rotMode.tx = 2; S.rotMode.changed = true; tf.exitRotMode(true);
  assert.equal(S.rotMode, null); assert.equal(S.sel, null); assert.deepEqual(S.layers[0].grid[2][2], null);
  assert.deepEqual(S.layers[0].grid[2][4], [9, 9, 9, 255]); assert.deepEqual(S.layers[0].grid[5][5], [1, 1, 1, 255]); });
t('transform: undo закрывает активную трансформацию без отката истории', () => { resetWH(8, 8); S.undoStack.length = 0; S.redoStack.length = 0;
  S.layers[0].grid[2][2] = [4, 4, 4, 255]; history.snapshot(); actions.run('transform.enter');
  S.rotMode.tx = 2; S.rotMode.changed = true; history.doUndo();
  assert.equal(S.rotMode, null); assert.deepEqual(S.layers[0].grid[2][2], [4, 4, 4, 255]); assert.equal(S.undoStack.length, 1); });
t('transform: preview clipping mask режется base-слоем', () => { resetWH(8, 8);
  S.layers.push({ name: 'clip', grid: blank(8, 8), opacity: 1, visible: true, fid: null, clip: true, ext: new Map(), effects: [] });
  S.layers[0].grid[4][4] = [255, 255, 255, 255]; S.layers[1].grid[1][1] = [9, 9, 9, 255]; S.layers[1].grid[4][4] = [9, 9, 9, 255];
  let clips = 0; const proto = HTMLCanvasElement.prototype, orig = proto.getContext;
  proto.getContext = function (...args) { const ctx = orig.apply(this, args);
    return new Proxy(ctx, { set(tg, p, v) { if (p === 'globalCompositeOperation' && v === 'destination-in') clips++; tg[p] = v; return true; } }); };
  try { tf.enterRotMode(S.layers[1]); } finally { if (S.rotMode) tf.exitRotMode(false); proto.getContext = orig; }
  assert.ok(clips > 0); });
t('transform: выбранная папка строит рамку по скрытым слоям', () => { resetWH(8, 8);
  S.layers = [
    { name: 'v', grid: blank(8, 8), opacity: 1, visible: true, fid: 1, clip: false, ext: new Map(), effects: [] },
    { name: 'h', grid: blank(8, 8), opacity: 1, visible: false, fid: 1, clip: false, ext: new Map(), effects: [] },
  ]; S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }];
  S.layers[0].grid[1][1] = [1, 1, 1, 255]; S.layers[1].grid[6][6] = [2, 2, 2, 255]; S.selFolder = 1; S.markedFolders = new Set([1]);
  actions.run('transform.enter'); assert.deepEqual(S.rotMode.b, { x0: 1, y0: 1, w: 6, h: 6 }); tf.exitRotMode(false); });

t('transform: превью строится с эффектами слоя и папки (обводка не пропадает)', () => { resetWH(8, 8);
  S.layers[0].grid[3][3] = [1, 1, 1, 255]; S.layers[0].grid[4][3] = [1, 1, 1, 255];
  S.layers[0].effects = [{ id: 'e1', type: 'stroke', visible: true, params: { size: 1, color: '#ff7a18' } }];
  S.folders = [{ id: 1, name: 'g', visible: true, parent: null, effects: [{ id: 'e2', type: 'stroke', visible: true, params: { size: 2, color: '#5aa6f2' } }] }];
  S.layers[0].fid = 1; cache.dirtyAll();
  tf.enterRotMode(S.layers[0]); assert.ok(S.rotPrev && S.rotPrev.canvas); // полнохолстовое превью с эффектами слоя+папки
  assert.equal(S.rotPrev.canvas.width, S.W); assert.equal(S.rotPrev.ow, S.W);
  tf.exitRotMode(false); S.layers[0].effects = []; S.layers[0].fid = null; S.folders = []; });

t('layers-ui: layList рисует строки', () => { resetWH(8, 8); layers.mount(); document.getElementById('lay-pop').classList.add('on'); layList();
  assert.ok(document.querySelectorAll('#lay-list .lrow').length >= 1); });
t('layers-ui: два бара действий по 6 кнопок и команды слоя', () => { resetWH(8, 8); document.getElementById('lay-pop').classList.add('on'); layList();
  const top = [...document.querySelectorAll('#lay-act-top > button')], bot = [...document.querySelectorAll('#lay-act-bottom > button')];
  assert.deepEqual(top.map((b) => b.id), ['lay-add', 'lay-group', 'lay-alpha', 'lay-clip', 'lay-ref', 'lay-clean']);
  assert.deepEqual(bot.map((b) => b.id), ['lay-dup', 'lay-symm', 'lay-merge', 'lay-select', 'lay-lock', 'lay-del']);
  assert.equal(document.querySelector('#lay-head #lay-add'), null);
  assert.equal(document.querySelectorAll('.lay-action-btn').length, 12);
  S.layers[0].grid[0][0] = [9, 9, 9, 255]; document.getElementById('lay-symm').click(); assert.deepEqual(S.layers[0].grid[0][7], [9, 9, 9, 255]);
  document.getElementById('lay-alpha').click(); document.getElementById('lay-clip').click(); document.getElementById('lay-ref').click(); layList();
  assert.ok(document.getElementById('lay-alpha').classList.contains('on')); assert.ok(document.getElementById('lay-clip').classList.contains('on')); assert.ok(document.getElementById('lay-ref').classList.contains('on'));
  document.getElementById('lay-clean').click(); assert.equal(S.layers[0].grid[0][0], null);
  document.getElementById('lay-lock').click(); assert.equal(S.layers[0].lock, true); assert.ok(document.getElementById('lay-lock').classList.contains('on'));
  document.getElementById('lay-dup').click(); assert.equal(S.layers.length, 2); assert.equal(S.cur, 1);
  document.getElementById('lay-del').click(); assert.equal(S.layers.length, 1); });
t('layers-ui: единственный слой не удаляется', () => { resetWH(8, 8);
  lops.deleteLayerRef(S.layers[0]); assert.equal(S.layers.length, 1); assert.equal(S.cur, 0);
  lops.doAddLayer(); assert.equal(S.layers.length, 2); assert.equal(S.cur, 1);
  lops.deleteLayerRef(S.layers[1]); assert.equal(S.layers.length, 1); assert.equal(S.cur, 0); });
t('layers-ui: reference-кнопка синяя на выбранном reference-слое', () => { resetWH(8, 8); document.getElementById('lay-pop').classList.add('on');
  S.layers[0].reference = true; layList();
  assert.ok(document.getElementById('lay-ref').classList.contains('on')); assert.equal(document.querySelectorAll('#lay-list .lref').length, 1);
  document.querySelector('#lay-list .lref').click(); layList();
  assert.equal(S.layers[0].reference, false); assert.ok(!document.getElementById('lay-ref').classList.contains('on')); });
t('layers-ui: Ctrl-клик выделяет диапазон до активного слоя', () => { resetWH(8, 8); lops.doAddLayer(); lops.doAddLayer();
  S.cur = 0; S.marked = new Set(); document.getElementById('lay-pop').classList.add('on'); layList();
  const target = [...document.querySelectorAll('#lay-list .lrow[data-li]')].find((r) => +r.dataset.li === 2);
  target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  assert.equal(S.cur, 0); assert.deepEqual([...S.marked].sort((a, b) => a - b), [1, 2]); });
t('layers-ui: add/merge меняют число слоёв', () => { resetWH(8, 8); const b = S.layers.length; lops.doAddLayer(); assert.equal(S.layers.length, b + 1);
  S.marked = new Set([0, 1]); lops.doMerge(); assert.equal(S.layers.length, b); });
t('layers-ui: pinch-merge сливает диапазон и оставляет результат наверху', () => { resetWH(4, 4);
  const mk = (name) => ({ name, grid: blank(4, 4), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] });
  S.layers = ['below', 'low', 'middle', 'top', 'above'].map(mk); S.cur = 1;
  S.layers[1].grid[0][0] = [10, 0, 0, 255]; S.layers[2].grid[2][2] = [1, 1, 1, 255]; S.layers[3].grid[1][1] = [0, 0, 10, 255];
  lops.mergeRange(1, 3);
  assert.equal(S.layers.length, 3); assert.equal(S.cur, 1); assert.deepEqual(S.layers.map((L) => L.name), ['below', 'top', 'above']);
  assert.deepEqual(S.layers[1].grid[0][0], [10, 0, 0, 255]); assert.deepEqual(S.layers[1].grid[2][2], [1, 1, 1, 255]); assert.deepEqual(S.layers[1].grid[1][1], [0, 0, 10, 255]); });
t('layers-ui: после удаления активного слоя выбирается слой ниже', () => { resetWH(8, 8); lops.doAddLayer(); lops.doAddLayer();
  S.cur = 1; lops.deleteLayerRef(S.layers[1]); assert.equal(S.cur, 0); });
t('layers-ui: удаление неактивного слоя сохраняет активный слой', () => { resetWH(8, 8); lops.doAddLayer(); lops.doAddLayer();
  const active = S.layers[2]; S.cur = 2; lops.deleteLayerRef(S.layers[0]); assert.equal(S.layers[S.cur], active); });
t('layers-ui: добавление слоёв не останавливается на восьми', () => { resetWH(8, 8);
  for (let i = 0; i < 9; i++) lops.doAddLayer();
  assert.equal(S.layers.length, 10); });
t('layers-ui: имя нового слоя сбрасывается к 1 без номерных слоёв', () => { resetWH(8, 8);
  S.layerSeq = 34; S.layers[0].name = 'Sketch';
  lops.doAddLayer(); assert.equal(S.layers[S.cur].name, 'Слой 1'); assert.equal(S.layerSeq, 1); });
t('layers-ui: имя нового слоя учитывает номерные слои любой локали', () => { resetWH(8, 8);
  i18n.setLocale('en'); S.layerSeq = 34; S.layers[0].name = 'Слой 3';
  lops.doAddLayer(); assert.equal(S.layers[S.cur].name, 'Layer 4'); assert.equal(S.layerSeq, 4);
  i18n.setLocale('ru'); });
t('layers-ui: закрытая папка с активным слоем становится активной строкой', () => { resetWH(8, 8);
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }]; S.layers[0].fid = 1; S.cur = 0;
  document.getElementById('lay-pop').classList.add('on'); layList(); document.querySelector('#lay-list .frow .caret').click();
  assert.equal(S.folders[0].open, false); assert.equal(S.selFolder, 1); assert.ok(document.querySelector('#lay-list .frow').classList.contains('on')); });
t('layers-ui: плюс на активной папке создаёт активный верхний слой вне папки', () => { resetWH(8, 8);
  S.folders = [{ id: 1, name: 'G', open: false, visible: true, parent: null, effects: [] }]; S.layers[0].fid = 1; S.selFolder = 1; S.markedFolders = new Set([1]);
  lops.doAddLayer(); assert.equal(S.cur, S.layers.length - 1); assert.equal(S.layers[S.cur].fid, null); assert.equal(S.selFolder, null); });
t('layers-ui: плюс на видимом слое папки создаёт слой в этой папке', () => { resetWH(8, 8);
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }]; S.layers[0].fid = 1; S.cur = 0; S.selFolder = null;
  lops.doAddLayer(); assert.equal(S.cur, 1); assert.equal(S.layers[S.cur].fid, 1); });
t('i18n: новые слой/папка получают имя из текущей локали', () => { resetWH(8, 8);
  i18n.setLocale('en'); lops.doAddLayer(); assert.ok(S.layers[S.cur].name.startsWith('Layer')); // англ. локаль → «Layer N»
  S.marked = new Set([0, 1]); lops.doGroup(); assert.ok(S.folders[0].name.startsWith('Folder'));
  i18n.setLocale('ru'); lops.doAddLayer(); assert.ok(S.layers[S.cur].name.startsWith('Слой')); // рус. локаль → «Слой N»
  i18n.setLocale('ru'); });
t('i18n: английская локаль убирает русский из title и placeholder', () => {
  i18n.setLocale('en');
  pal.buildPalette();
  const bad = [...document.querySelectorAll('[title]')].filter((el) => /[А-Яа-яЁё]/.test(el.title)).map((el) => el.id || el.className || el.tagName);
  assert.deepEqual(bad, []);
  assert.equal(document.getElementById('pal-name').placeholder, 'Palette name');
  assert.equal(document.getElementById('ovlimg').alt, 'result');
  assert.equal(document.querySelector('#pickflag span').textContent, 'Eyedropper');
  i18n.setLocale('ru');
});
t('i18n: html-шаблон не хранит локализованные fallback-строки', () => {
  const doc = makeDom().window.document;
  const textLeaks = [...doc.querySelectorAll('[data-i18n]')].flatMap((el) => [...el.childNodes]
    .filter((n) => n.nodeType === 3 && n.textContent.trim())
    .map(() => el.id || el.dataset.i18n));
  const attrLeaks = [
    ...doc.querySelectorAll('[data-i18n-title][title]'),
    ...doc.querySelectorAll('[data-i18n-ph][placeholder]'),
    ...doc.querySelectorAll('[data-i18n-alt][alt]'),
  ].map((el) => el.id || el.dataset.i18nTitle || el.dataset.i18nPh || el.dataset.i18nAlt);
  assert.deepEqual(textLeaks, []);
  assert.deepEqual(attrLeaks, []);
});
t('layers: вложенные группы (группа в группе)', async () => { resetWH(4, 4); const { folderChain } = await import('../src/core/layers.js');
  S.folders = []; S.folderSeq = 0; S.layers = [S.layers[0], { ...S.layers[0], name: 'b', grid: S.layers[0].grid.map((r) => r.slice()) }, { ...S.layers[0], name: 'c', grid: S.layers[0].grid.map((r) => r.slice()) }]; S.cur = 0; S.marked = new Set([1, 2]);
  lops.doGroup(); const A = S.folders[0]; assert.equal(A.parent ?? null, null);
  const inner = S.layers.map((L, i) => [L, i]).filter(([L]) => L.fid === A.id).map(([, i]) => i); S.marked = new Set(inner); lops.doGroup();
  const B = S.folders.find((f) => f !== A); assert.equal(B.parent, A.id); // B вложена в A
  assert.deepEqual(folderChain(S.layers.find((L) => L.fid === B.id).fid).map((f) => f.id), [B.id, A.id]); });

console.log(`\nВсе ${n} интеграционных тестов прошли ✓`);
