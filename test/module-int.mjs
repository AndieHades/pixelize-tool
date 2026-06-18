// Интеграционные тесты сервисов core/, которым нужен DOM (canvas). Поднимаем
// jsdom-глобали и импортируем модули напрямую — проверяем по мере портирования,
// не дожидаясь сборки всего приложения.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { makeDom } from './harness.mjs';

const { window } = makeDom();
// аккуратно прокидываем jsdom-глобали в node (часть из них — read-only геттеры)
for (const k of ['document', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'HTMLCanvasElement', 'Blob', 'File', 'Image', 'localStorage', 'window']) {
  try { Object.defineProperty(globalThis, k, { value: k === 'window' ? window : window[k], configurable: true, writable: true }); } catch (e) {}
}
globalThis.URL.createObjectURL = () => 'blob:stub'; // нодовский URL не принимает jsdom-Blob
globalThis.URL.revokeObjectURL = () => {};

const { S, blank, BP_SMAX, newEffect, cloneFx } = await import('../src/core/state.js');
const { BRUSH_PREFS_STORE, loadBrushPrefs, saveBrushPrefs } = await import('../src/core/brush-prefs.js');
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
const { commitLine, commitContour } = await import('../src/systems/draw/shapes.js');
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
const brushData = await import('../src/systems/brush-library/data.js');
const brushList = await import('../src/systems/brush-library/list.js');
const brushFromSel = await import('../src/systems/brush-library/from-selection.js');
const eyedropper = await import('../src/systems/eyedropper/index.js');
const cp = await import('../src/systems/color-picker.js');
const prev = await import('../src/systems/preview-window.js');
const ref = await import('../src/systems/reference-window.js');
const gallery = await import('../src/systems/gallery/index.js');
const newCanvas = await import('../src/systems/new-canvas.js');
const { attachDrag: attachGalleryDrag } = await import('../src/systems/gallery/drag.js');
const { makeDropGap } = await import('../src/core/drop-gap.js');
const { dragGhost } = await import('../src/core/drag-ghost.js');
const shading = await import('../src/systems/shading.js');
const palMgr = await import('../src/systems/palette-manager.js');
const tsg = await import('../src/systems/tint-shade/index.js');
const tb = await import('../src/systems/toolbars.js');
const gridSys = await import('../src/systems/grid.js');
const symLines = await import('../src/systems/symmetry-lines.js');
const effects = await import('../src/systems/effects/index.js');
const fxShared = await import('../src/systems/effects/shared.js');
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
const { showMenuAt, showMenuForAnchor } = await import('../src/core/dom.js');
const tsmgr = await import('../src/core/tileset.js');
const tsetMgr = await import('../src/systems/tileset-manager.js');
const tmap = await import('../src/core/tilemap.js');
const tmcreate = await import('../src/systems/tilemap-create.js');
const tmDialog = await import('../src/systems/tilemap-dialog.js');
await import('../src/systems/tile-brush/index.js');
await import('../src/systems/tile-selection/index.js');
const tsel = await import('../src/systems/tile-selection/ops.js');
const tfl = await import('../src/systems/tile-from-layer.js');
const tmode = await import('../src/systems/tileset-mode/index.js');
await import('../src/systems/tilemap-paint/index.js');
const tops = await import('../src/systems/tile-palette/ops.js');
const tilePalette = await import('../src/systems/tile-palette/index.js');
const tileToolbar = await import('../src/systems/tile-palette/toolbar.js');
const tileSelect = await import('../src/systems/tile-palette/select.js');
const { floatingWindow, nextFloatingZ } = await import('../src/core/floating-window.js');
const resetWH = (w, h) => { S.W = w; S.H = h; S.cur = 0; S.folders = []; S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null;
  S.layers = [{ name: 'a', grid: blank(w, h), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] }];
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.moveDrag = null; S.tool = 'pencil'; S.sym = S.symH = S.symD1 = S.symD2 = false;
  S.symLines = { x: null, y: null, d1: null, d2: null, mode: null, hover: null }; S.grid = { w: 16, h: 16, color: '#4aa3ff', opacity: 70, visible: false, preview: false, link: true };
  S.shading = { colors: [], on: false, open: false, picking: false };
  S.lineStart = S.linePrev = S.linePath = null; S.lineMode = 'line'; S.shapeTool = 'rect'; S.fillShape = { rect: false, ellipse: false }; S.stroke = false;
  S.bg = { color: null, visible: true }; S.bgSel = false; S.xMirror = false; S.tile = { on: false };
  S.brushes.pencil.size = 1; S.brushes.pencil.op = 1; cache.dirtyAll(); };

const reset4 = () => { S.W = 4; S.H = 4; S.cur = 0; S.folders = []; S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null;
  S.layers = [{ name: 'a', grid: blank(4, 4), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] }];
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.moveDrag = null; S.tool = 'pencil'; S.sym = S.symH = S.symD1 = S.symD2 = false;
  S.symLines = { x: null, y: null, d1: null, d2: null, mode: null, hover: null }; S.grid = { w: 16, h: 16, color: '#4aa3ff', opacity: 70, visible: false, preview: false, link: true };
  S.shading = { colors: [], on: false, open: false, picking: false };
  S.lineStart = S.linePrev = S.linePath = null; S.lineMode = 'line'; S.shapeTool = 'rect'; S.fillShape = { rect: false, ellipse: false }; S.stroke = false;
  S.bg = { color: null, visible: true }; S.bgSel = false; S.xMirror = false; S.tile = { on: false };
  S.brushes.pencil.size = 1; S.brushes.pencil.op = 1;
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
t('document: crop-расширение обновляет клетки Tilemap', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  const ts = tsmgr.createTileset('t', 4, 4), tile = tsmgr.addTile(ts); tile.grid[0][0] = [1, 2, 3, 255];
  const L = tmap.makeTilemapLayer('Tilemap', ts.id, 2, 2); S.layers = [L]; S.cur = 0;
  tmap.setCell(0, 0, 0, { tileId: tile.id }); doc.applyCropRect(-4, -4, 11, 11);
  assert.equal(S.W, 16); assert.equal(S.H, 16); assert.equal(L.tilemap.mapW, 4); assert.equal(L.tilemap.mapH, 4);
  assert.equal(L.tilemap.cells[1 * 4 + 1].tileId, tile.id);
  S.activeTile = { tilesetId: ts.id, tileId: tile.id }; S.tileMode = 'paint'; S.tilePattern = null; S.tileRandom = false;
  const h = toolHandler('tilebrush'); h.down({ gx: 12, gy: 12 }); h.up({});
  assert.equal(L.tilemap.cells[3 * 4 + 3].tileId, tile.id);
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
t('render: ants остаются только у выделения, ручки лежат поверх пунктира', () => { reset4();
  S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; S.selMask = null; render.render();
  const ants = document.getElementById('sel-ants');
  assert.equal(ants.style.display, '');
  assert.equal(ants.querySelectorAll('.handles circle').length, 8);
  assert.equal(ants.lastElementChild.classList.contains('handles'), true);
  S.sel = null; S.rotMode = { b: { x0: 0, y0: 0, w: 2, h: 2 }, ang: 0, sx: 1, sy: 1, tx: 0, ty: 0 };
  S.rotQuad = [[0, 0], [2, 0], [2, 2], [0, 2]]; render.render();
  assert.equal(ants.style.display, 'none');
  assert.equal(ants.querySelectorAll('.handles circle').length, 0);
  S.rotMode = null; S.rotQuad = null;
});
t('render: fitView ставит zoom ≥ 1', () => { reset4(); render.fitView(); assert.ok(S.view.zoom >= 1); });
t('render: zoom in/out идут чётким шагом 50%', () => { reset4();
  const cv = document.getElementById('cv');
  Object.defineProperty(cv, 'clientWidth', { configurable: true, value: 800 });
  Object.defineProperty(cv, 'clientHeight', { configurable: true, value: 600 });
  S.view = { zoom: 4.59, ox: 120, oy: 80 };
  const wx = (400 - S.view.ox) / S.view.zoom, wy = (300 - S.view.oy) / S.view.zoom;
  actions.run('zoom.in');
  assert.equal(S.view.zoom, 5);
  assert.ok(Math.abs((400 - S.view.ox) / S.view.zoom - wx) < 1e-9);
  assert.ok(Math.abs((300 - S.view.oy) / S.view.zoom - wy) < 1e-9);
  actions.run('zoom.out'); assert.equal(S.view.zoom, 4.5);
  S.view = { zoom: 4.59, ox: 120, oy: 80 }; actions.run('zoom.out'); assert.equal(S.view.zoom, 4.5);
});
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
t('cursor: при Shading real brush нейтрально-серый, не активный цвет', () => { reset4();
  const fills = [], proto = HTMLCanvasElement.prototype, orig = proto.getContext;
  proto.getContext = function (...args) { const ctx = orig.apply(this, args);
    return new Proxy(ctx, { set(tg, p, v) { if (p === 'fillStyle') fills.push(v); tg[p] = v; return true; } }); };
  try {
    const ctx = { save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, drawImage() {} };
    S.tool = 'pencil'; S.hoverPx = [2, 2]; S.cursorMode = 'real'; S.active = [255, 0, 0]; S.brushes.pencil.size = 3; S.brushes.pencil.op = 1;
    S.shading = { colors: [[0, 0, 0], [255, 255, 255]], on: true, open: true, picking: false };
    drawBrushCursor(ctx, 0, 0, 10);
    assert.ok(fills.includes('rgba(190,190,190,.72)')); assert.ok(!fills.includes('rgb(255,0,0)'));
  } finally { proto.getContext = orig; S.shading = { colors: [], on: false, open: false, picking: false }; S.hoverPx = null; S.brushes.pencil.size = 1; S.brushes.pencil.op = 1; }
});
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
  kbd.rebind('b', 'edit.undo'); kbd.handle(ev('KeyB')); assert.equal(ran, 1); kbd.resetKeymap();
  actions.register('edit.undo', history.doUndo); actions.register('edit.redo', history.doRedo); });
t('keyboard: ввод в поле не триггерит', () => { assert.equal(kbd.handle(ev('KeyB', { target: document.createElement('input') })), false); });
t('keyboard: Ctrl+A выделяет содержимое активного слоя', () => { resetWH(4, 4); kbd.resetKeymap();
  S.layers[0].grid[0][1] = [1, 2, 3, 255]; S.layers[0].grid[2][3] = [4, 5, 6, 255]; cache.dirtyAll();
  assert.ok(kbd.handle(ev('KeyA', { ctrlKey: true })));
  assert.deepEqual(S.sel, { x0: 1, y0: 0, x1: 3, y1: 2 }); assert.deepEqual([...S.selMask].sort(), ['1,0', '3,2']);
});
t('keyboard: Ctrl+N создаёт новый слой', () => { resetWH(4, 4); kbd.resetKeymap();
  assert.ok(kbd.handle(ev('KeyN', { ctrlKey: true }))); assert.equal(S.layers.length, 2); assert.equal(S.cur, 1);
});

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
t('draw: линия с Shift снапится к 45 градусам', () => { resetWH(8, 8); S.active = [7, 7, 7]; setTool('line');
  const h = toolHandler('line'); h.down({ gx: 1, gy: 1, e: {} }); h.move({ gx: 5, gy: 3, e: { shiftKey: true } });
  assert.deepEqual(S.linePrev, [1, 1, 5, 5]); h.up({});
  assert.deepEqual(S.layers[0].grid[5][5], [7, 7, 7, 255]); });
t('draw: контур рисует круглой кистью, замыкает и заливает без превью-состояния', () => { resetWH(8, 8); S.active = [7, 8, 9]; S.brushes.pencil.size = 3; S.lineMode = 'contour'; setTool('line');
  const h = toolHandler('line'); h.down({ gx: 1, gy: 1, e: {} }); h.move({ gx: 5, gy: 1, e: {} }); h.move({ gx: 5, gy: 5, e: {} }); h.move({ gx: 1, gy: 5, e: {} }); h.up({});
  assert.equal(S.linePath, null); assert.equal(S.stroke, false);
  assert.deepEqual(S.layers[0].grid[3][3], [7, 8, 9, 255]); // заливка внутри
  assert.deepEqual(S.layers[0].grid[0][1], [7, 8, 9, 255]); // толщина от круглой кисти size=3
  S.lineMode = 'line'; });
t('draw: контур с внутренней петлёй не оставляет дырки', () => { resetWH(10, 10); S.active = [2, 3, 4]; S.brushes.pencil.size = 1; S.tool = 'line'; S.lineMode = 'contour';
  const pts = [[1, 1], [8, 1], [8, 8], [1, 8], [1, 1], [3, 3], [6, 3], [6, 6], [3, 6], [3, 3]];
  commitContour(pts);
  assert.deepEqual(S.layers[0].grid[4][4], [2, 3, 4, 255]);
  assert.deepEqual(S.layers[0].grid[2][2], [2, 3, 4, 255]);
  S.lineMode = 'line';
});
t('draw: смена инструмента финализирует уже начатый контур', () => { resetWH(8, 8); S.active = [4, 5, 6]; S.brushes.pencil.size = 1; S.lineMode = 'contour'; setTool('line');
  const h = toolHandler('line'); h.down({ gx: 1, gy: 1, e: {} }); h.move({ gx: 5, gy: 1, e: {} }); h.move({ gx: 5, gy: 5, e: {} });
  setTool('pencil');
  assert.equal(S.linePath, null); assert.equal(S.stroke, false); assert.equal(S.tool, 'pencil');
  assert.deepEqual(S.layers[0].grid[3][3], [4, 5, 6, 255]); // закрывающий сегмент + заливка остались
});
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

t('rotate-canvas: поворачивает содержимое без изменения размера холста', () => { resetWH(4, 6); S.layers[0].grid[0][0] = [7, 7, 7, 255];
  rotateCanvas(); assert.equal(S.W, 4); assert.equal(S.H, 6); assert.deepEqual(S.layers[0].ext.get('4,1'), [7, 7, 7, 255]); });
t('flip: отражает слой по горизонтали', () => { resetWH(4, 4); S.layers[0].grid[1][0] = [5, 5, 5, 255]; flipLayer(true); assert.deepEqual(S.layers[0].grid[1][3], [5, 5, 5, 255]); });
t('flip: слой → только он, фон → весь документ', () => { resetWH(4, 4); lops.doAddLayer();
  S.layers[0].grid[0][0] = [1, 1, 1, 255]; S.layers[1].grid[0][0] = [2, 2, 2, 255]; cache.dirtyAll();
  S.cur = 1; S.marked = new Set(); S.selFolder = null; S.bgSel = false;
  flipLayer(true); // выбран слой 1 → флипается только он
  assert.deepEqual(S.layers[1].grid[0][3], [2, 2, 2, 255]); assert.equal(S.layers[1].grid[0][0], null);
  assert.deepEqual(S.layers[0].grid[0][0], [1, 1, 1, 255]); // слой 0 не тронут
  S.bgSel = true; flipLayer(true); // выбран фон → флипается весь документ
  assert.deepEqual(S.layers[0].grid[0][3], [1, 1, 1, 255]); assert.deepEqual(S.layers[1].grid[0][0], [2, 2, 2, 255]);
  S.bgSel = false;
});
t('symmetrize (lay-symm): фон → весь документ', () => { resetWH(4, 4); layers.mount(); lops.doAddLayer(); document.getElementById('lay-pop').classList.add('on');
  S.sym = false; S.symH = false; S.layers[0].grid[1][0] = [1, 1, 1, 255]; S.layers[1].grid[1][0] = [2, 2, 2, 255]; cache.dirtyAll();
  S.cur = 1; S.marked = new Set(); S.selFolder = null; S.bgSel = true; layList();
  document.getElementById('lay-symm').click();
  assert.deepEqual(S.layers[0].grid[1][3], [1, 1, 1, 255]); assert.deepEqual(S.layers[1].grid[1][3], [2, 2, 2, 255]); // оба слоя отзеркалены
  S.bgSel = false;
});
t('settings: фон → canvas scope, слой → layer scope', () => { resetWH(4, 4); tb.mount(); bc.mount();
  S.bgSel = true; document.getElementById('img-settings').click();
  assert.ok(document.querySelector('#bc-scope [data-scope="canvas"]').classList.contains('on')); // фон → весь документ
  document.getElementById('bc-cancel').click();
  S.bgSel = false; document.getElementById('img-settings').click();
  assert.ok(document.querySelector('#bc-scope [data-scope="layer"]').classList.contains('on')); // слой → к выбранному
  document.getElementById('bc-cancel').click();
});
t('trim: обрезает до контура и сохраняет экранный размер холста', () => { resetWH(6, 6); S.view = { zoom: 8, ox: 30, oy: 40 };
  const sw = S.W * S.view.zoom, sh = S.H * S.view.zoom, cx = S.view.ox + sw / 2, cy = S.view.oy + sh / 2;
  S.layers[0].grid[2][3] = [9, 9, 9, 255]; trimCanvas(); assert.equal(S.W, 1); assert.equal(S.H, 1); assert.deepEqual(S.layers[0].grid[0][0], [9, 9, 9, 255]);
  assert.equal(S.W * S.view.zoom, sw); assert.equal(S.H * S.view.zoom, sh);
  assert.equal(S.view.ox + S.W * S.view.zoom / 2, cx); assert.equal(S.view.oy + S.H * S.view.zoom / 2, cy); });
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
t('effects-render: эффект папки перерисовывается при добавлении эффекта слою внутри', () => { resetWH(8, 8);
  const mk = (name, fid) => ({ name, grid: blank(8, 8), opacity: 1, visible: true, fid, clip: false, lock: false, alphaLock: false, ext: new Map(), effects: [] });
  S.layers = [mk('a', 1), mk('b', 1)]; S.layers[0].grid[3][3] = [9, 9, 9, 255]; S.layers[1].grid[4][4] = [8, 8, 8, 255];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [newEffect('stroke', { size: 1, color: '#ffffff' })] }];
  S.cur = 0; S.marked = new Set(); cache.dirtyAll();
  const c1 = fxr.folderFx(S.folders[0], 'below'); assert.ok(c1);
  S.layers[1].effects = [newEffect('stroke', { size: 2, color: '#000000' })]; // добавили эффект слою внутри папки
  const c2 = fxr.folderFx(S.folders[0], 'below');
  assert.notEqual(c1, c2); // эффект папки пересчитался по новому силуэту (а не отдал устаревший из кеша)
  S.folders = []; S.layers = [mk('a', null)]; S.cur = 0; });
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
t('effects-render: adjustment входит в рендер слоя и наследуется от папки', () => { resetWH(4, 4);
  const layerAdj = newEffect('adjustment', { saturation: -100 }); S.layers[0].effects = [layerAdj]; cache.dirtyAll();
  assert.deepEqual(fxr.layerRenderEffects(0), [layerAdj]); assert.notEqual(cache.layerSrcCanvas(0), cache.layerCanvas(0));
  const folderAdj = newEffect('adjustment', { brightness: 50 });
  S.layers[0].effects = []; S.layers[0].fid = 1; S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [folderAdj] }];
  cache.dirtyAll(); assert.deepEqual(fxr.layerRenderEffects(0), [folderAdj]); assert.notEqual(cache.layerSrcCanvas(0), cache.layerCanvas(0)); });

t('recolor: меняет пиксели и добавляет новый цвет, не переписывая палитру', () => { resetWH(4, 4);
  S.layers[0].grid[1][1] = [9, 9, 9, 255]; S.layers[0].grid[2][2] = [8, 8, 8, 255]; S.palette = [[9, 9, 9], [8, 8, 8]]; cache.dirtyAll();
  recolorAll([[9, 9, 9], [8, 8, 8]], [200, 100, 50]);
  assert.deepEqual(S.layers[0].grid[1][1], [200, 100, 50]); assert.deepEqual(S.layers[0].grid[2][2], [200, 100, 50]);
  assert.deepEqual(S.palette, [[9, 9, 9], [8, 8, 8], [200, 100, 50]]);
});
t('free-rotate: поворачивает слой без ошибок', () => { resetWH(8, 8); S.layers[0].grid[3][3] = [1, 1, 1, 255]; S.layers[0].grid[3][4] = [1, 1, 1, 255];
  freeRotateLayer(S.layers[0], Math.PI / 4, 4); assert.ok(true); });
t('bc: preview холста можно отменить через undo, не трогая историю документа', () => { bc.mount(); resetWH(4, 4); S.undoStack.length = 0; S.redoStack.length = 0;
  S.layers[0].grid[1][1] = [100, 100, 100, 255]; cache.dirtyAll();
  bc.openBcPop(null, null, { scope: 'canvas' }); document.getElementById('bc-bri').value = '100';
  document.getElementById('bc-bri').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.ok(S.layers[0].grid[1][1][0] > 150);
  history.doUndo();
  assert.deepEqual(S.layers[0].grid[1][1], [100, 100, 100, 255]);
  assert.equal(document.getElementById('bcpop').classList.contains('on'), false);
  assert.equal(S.undoStack.length, 0);
});
t('bc: применение к холсту поднимает яркость и откатывается undo', () => { resetWH(4, 4); S.undoStack.length = 0; S.redoStack.length = 0;
  S.layers[0].grid[1][1] = [100, 100, 100, 255]; cache.dirtyAll();
  bc.openBcPop(null, null, { scope: 'canvas' }); document.getElementById('bc-bri').value = '100'; document.getElementById('bc-con').value = '0';
  bc.bcApply(); assert.ok(S.layers[0].grid[1][1][0] > 150);
  history.doUndo(); assert.deepEqual(S.layers[0].grid[1][1], [100, 100, 100, 255]); });
t('bc: слой получает редактируемую настройку без изменения пикселей', () => { resetWH(4, 4); S.undoStack.length = 0; S.redoStack.length = 0;
  S.layers[0].grid[1][1] = [100, 50, 50, 255]; cache.dirtyAll();
  bc.openBcPop([S.layers[0]], null, { scope: 'layer' });
  document.getElementById('bc-sat').value = '-100'; document.getElementById('bc-hue').value = '90';
  document.getElementById('bc-sat').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(S.layers[0].effects.length, 0); assert.ok(S.fxDraft && S.fxDraft.eff.type === 'adjustment');
  assert.deepEqual(S.layers[0].grid[1][1], [100, 50, 50, 255]);
  bc.bcApply();
  assert.equal(S.fxDraft, null); assert.equal(S.layers[0].effects.length, 1); assert.equal(S.layers[0].effects[0].type, 'adjustment');
  assert.equal(S.layers[0].effects[0].params.saturation, -100); assert.equal(S.layers[0].effects[0].params.hue, 90);
  history.doUndo(); assert.equal(S.layers[0].effects.length, 0); });
t('bc: настройка эффекта открывается повторно и откатывается', () => { resetWH(4, 4); S.undoStack.length = 0; S.redoStack.length = 0;
  const eff = newEffect('adjustment', { brightness: 10, contrast: 20, saturation: 30, hue: 40 }); S.layers[0].effects = [eff];
  actions.run('effect.bc.edit', S.layers[0], eff);
  assert.equal(document.getElementById('bc-bri').value, '10'); assert.equal(document.getElementById('bc-hue').value, '40');
  document.getElementById('bc-hue').value = '-30'; document.getElementById('bc-hue').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(eff.params.hue, -30);
  assert.equal(kbd.handle(ev('KeyZ', { ctrlKey: true, target: document.getElementById('bc-hue') })), true);
  assert.equal(eff.params.hue, 40); assert.equal(document.getElementById('bcpop').classList.contains('on'), false);
  actions.run('effect.bc.edit', S.layers[0], eff); document.getElementById('bc-bri').value = '50';
  document.getElementById('bc-bri').dispatchEvent(new window.Event('input', { bubbles: true }));
  document.getElementById('bc-apply').click(); assert.equal(eff.params.brightness, 50);
  history.doUndo(); assert.equal(S.layers[0].effects[0].params.brightness, 10); });
t('adjust: Dodge/Burn/Colorize постепенно ведут к своим целям', () => { resetWH(3, 3); S.adjAmt = 50; S.active = [210, 20, 30];
  S.layers[0].grid[0][0] = [200, 0, 0, 255]; S.adjMode = 'dodge'; history.snapshot(); adjust.adjustCell(0, 0);
  assert.ok(S.layers[0].grid[0][0][0] > 200 && S.layers[0].grid[0][0][1] > 0 && S.layers[0].grid[0][0][2] > 0);
  S.layers[0].grid[0][1] = [200, 100, 50, 255]; S.adjMode = 'burn'; history.snapshot(); adjust.adjustCell(1, 0);
  assert.ok(S.layers[0].grid[0][1][0] < 200 && S.layers[0].grid[0][1][1] < 100 && S.layers[0].grid[0][1][2] < 50);
  S.layers[0].grid[1][0] = [10, 20, 30, 255]; S.adjMode = 'colorize'; history.snapshot(); adjust.adjustCell(0, 1);
  assert.deepEqual(S.layers[0].grid[1][0], [110, 20, 30, 255]);
  S.undoStack.length = 0; S.redoStack.length = 0;
});
t('adjust: выбор режима включает кисть-коррекцию', () => { adjust.mount(); S.tool = 'pencil';
  document.querySelector('#adj-modes [data-m="burn"]').click();
  assert.equal(S.tool, 'adjust'); assert.equal(S.adjMode, 'burn');
});

t('selection: fillSelection заливает рамку', () => { resetWH(6, 6); S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null; S.active = [5, 6, 7];
  sel.fillSelection(); assert.deepEqual(S.layers[0].grid[2][2], [5, 6, 7, 255]); });
t('selection: deleteSelContent чистит', () => { resetWH(6, 6); S.layers[0].grid[2][2] = [1, 1, 1, 255]; S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null;
  assert.equal(sel.deleteSelContent(), true); assert.equal(S.layers[0].grid[2][2], null); });
t('selection: selectColorPixels строит маску', () => { resetWH(6, 6); S.layers[0].grid[2][2] = [9, 9, 9, 255]; S.layers[0].grid[4][4] = [9, 9, 9, 255]; S.sel = null; S.selMask = null;
  sel.selectColorPixels([9, 9, 9]); assert.ok(S.selMask && S.selMask.has('2,2') && S.selMask.has('4,4')); });
t('selection: selectColorPixels принимает несколько цветов', () => { resetWH(6, 6); S.layers[0].grid[1][1] = [1, 1, 1, 255]; S.layers[0].grid[2][2] = [2, 2, 2, 255]; S.layers[0].grid[3][3] = [3, 3, 3, 255];
  sel.selectColorPixels([[1, 1, 1], [3, 3, 3]]);
  assert.ok(S.selMask && S.selMask.has('1,1') && S.selMask.has('3,3') && !S.selMask.has('2,2'));
});
t('selection: содержимое выбранной папки выделяется по всем её слоям', () => { resetWH(5, 5);
  S.layers = [
    { name: 'outside', grid: blank(5, 5), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] },
    { name: 'a', grid: blank(5, 5), opacity: 1, visible: true, fid: 1, clip: false, ext: new Map(), effects: [] },
    { name: 'b', grid: blank(5, 5), opacity: 1, visible: true, fid: 1, clip: false, ext: new Map(), effects: [] },
  ];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }];
  S.layers[0].grid[0][0] = [9, 9, 9, 255]; S.layers[1].grid[1][1] = [1, 1, 1, 255]; S.layers[2].grid[3][3] = [2, 2, 2, 255];
  S.cur = 0; S.selFolder = 1; S.markedFolders = new Set([1]); S.marked = new Set();
  sel.selectLayerContent();
  assert.ok(S.selMask && S.selMask.has('1,1') && S.selMask.has('3,3') && !S.selMask.has('0,0'));
});
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
t('symmetry: диагональная симметрия рисует и выделяет по 45 градусам', () => { resetWH(6, 6); S.symD1 = true; S.active = [8, 7, 6]; stamp(1, 3);
  assert.deepEqual(S.layers[0].grid[3][1], [8, 7, 6, 255]);
  assert.deepEqual(S.layers[0].grid[1][3], [8, 7, 6, 255]);
  sel.applySelectionOp(new Set(['0,4']), 'replace');
  assert.ok(S.selMask.has('0,4') && S.selMask.has('4,0'));
  S.symD1 = false;
});
t('symmetry: линию можно перенести и reset вернуть в центр', () => { resetWH(8, 8); symLines.mount(); S.sym = true; S.symLines = { x: 3.5, y: null, d1: null, d2: null, mode: 'move', hover: null };
  S.view = { zoom: 10, ox: 0, oy: 0 }; const cv = document.getElementById('cv');
  cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 80, height: 80, right: 80, bottom: 80 });
  const gh = globalHandlers()[globalHandlers().length - 1];
  gh.down({ e: { clientX: 40, clientY: 40 } }); gh.move({ e: { clientX: 25, clientY: 40 } }); gh.up({});
  assert.equal(S.symLines.x, 2);
  S.symLines.mode = 'reset'; gh.down({ e: { clientX: 25, clientY: 40 } });
  assert.equal(S.symLines.x, 3.5);
  S.sym = false; S.symLines.mode = null;
});
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
t('eyedropper: Alt+ПКМ по холсту добавляет цвет в палитру', () => { resetWH(8, 8); S.eyedrop.key = 'alt'; S.palette = [[1, 1, 1]]; S.active = [1, 1, 1];
  S.layers[0].grid[2][2] = [9, 8, 7, 255]; const undo = overCv();
  window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'AltLeft', bubbles: true }));
  const cv = document.getElementById('cv');
  cv.dispatchEvent(new window.MouseEvent('pointerdown', { clientX: 2, clientY: 2, button: 2, bubbles: true }));
  cv.dispatchEvent(new window.MouseEvent('pointerup', { clientX: 2, clientY: 2, button: 2, bubbles: true }));
  window.dispatchEvent(new window.KeyboardEvent('keyup', { code: 'AltLeft', bubbles: true })); undo();
  assert.ok(S.palette.some((c) => c[0] === 9 && c[1] === 8 && c[2] === 7)); assert.deepEqual(S.active, [9, 8, 7]);
});
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
  pal.mount(); pal.buildPalette(); assert.equal(document.querySelectorAll('#pal .sw:not(.plus)').length, 2); });
t('palette: кнопка used отмечает использованные цвета', () => { resetWH(4, 4); S.palette = [[1, 2, 3], [8, 8, 8]]; S.active = [1, 2, 3];
  S.layers[0].grid[1][1] = [1, 2, 3, 255]; cache.dirtyAll(); pal.buildPalette();
  document.getElementById('pal-used').click();
  assert.equal(document.querySelectorAll('#pal .sw.used').length, 1);
  document.getElementById('pal-used').click();
  assert.equal(document.querySelectorAll('#pal .sw.used').length, 0);
});
t('palette: used обновляется в реальном времени по render', () => { resetWH(4, 4); S.palette = [[1, 2, 3], [8, 8, 8]]; S.active = [8, 8, 8];
  S.layers[0].grid = blank(4, 4); cache.dirtyAll(); pal.buildPalette();
  document.getElementById('pal-used').click(); // включить showUsed
  assert.equal(document.querySelectorAll('#pal .sw.used').length, 0);
  S.layers[0].grid[0][0] = [8, 8, 8, 255]; bus.emit('render'); // «нарисовали» цвет — без пересборки палитры
  assert.equal(document.querySelectorAll('#pal .sw.used').length, 1); // отметился сразу по render
  document.getElementById('pal-used').click();
});
t('palette: setActiveColor меняет активный', () => { pal.setActiveColor([9, 8, 7], false); assert.deepEqual(S.active, [9, 8, 7]); });
await ta('palette: ЛКМ-протяжка переставляет цвет без выделения (без gap)', async () => {
  shading.mount(); shading.clear(); S.palette = [[1, 1, 1], [2, 2, 2], [3, 3, 3]]; S.active = [1, 1, 1]; pal.buildPalette();
  const sw = [...document.querySelectorAll('#pal .sw:not(.plus)')], oldHit = document.elementFromPoint;
  try {
    document.elementFromPoint = () => sw[2];
    sw[0].dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0 }));
    document.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 20, clientY: 0 }));
    document.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 20, clientY: 0 }));
    assert.deepEqual(S.palette, [[2, 2, 2], [3, 3, 3], [1, 1, 1]]); // цвет 0 переставлен в конец
    assert.deepEqual(S.shading.colors, []); // ЛКМ-драг больше не выделяет диапазон
    assert.equal(document.querySelectorAll('#pal .pal-sel').length, 0); // одиночный перенос не оставляет выделения
    assert.equal(document.querySelectorAll('.palette-drop-gap').length, 0); // gap отключён
  } finally { document.elementFromPoint = oldHit; }
  await new Promise((r) => setTimeout(r)); // сбросить отложенный palSquelch до следующего теста
});
t('palette: Ctrl+клик — поштучный выбор и снятие', () => {
  shading.clear(); S.palette = Array.from({ length: 8 }, (_, i) => [i, i, i]); S.active = [0, 0, 0]; pal.buildPalette();
  let sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[7].dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  assert.equal(document.querySelectorAll('#pal .pal-sel').length, 1);
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  assert.equal(document.querySelectorAll('#pal .pal-sel').length, 2); // поштучно, не диапазон
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  assert.equal(document.querySelectorAll('#pal .pal-sel').length, 1); // повторный ctrl снимает
  assert.deepEqual(S.shading.colors, []);
});
t('palette: Shift+клик — диапазон от активного/якоря', () => {
  shading.clear(); S.palette = Array.from({ length: 8 }, (_, i) => [i, i, i]); S.active = [0, 0, 0]; pal.buildPalette();
  let sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // обычный клик задаёт активный = якорь
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[5].dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true }));
  assert.equal(document.querySelectorAll('#pal .pal-sel').length, 6); // 0..5
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true }));
  assert.equal(document.querySelectorAll('#pal .pal-sel').length, 3); // якорь 0 → 0..2
});
t('palette: ПКМ меню удаляет выделенный shift-диапазон цветов', () => {
  shading.clear(); S.palette = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4]]; S.active = [1, 1, 1]; pal.buildPalette();
  let sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // активный = якорь [1,1,1]
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[3].dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true })); // диапазон 1..3
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')]; const oldHit = document.elementFromPoint;
  try {
    document.elementFromPoint = () => sw[2];
    sw[2].dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 2, clientX: 10, clientY: 0 }));
    document.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, button: 2, clientX: 10, clientY: 0 }));
    document.querySelector('#ctx [data-act="delete"]').click();
    assert.deepEqual(S.palette, [[0, 0, 0], [4, 4, 4]]);
    assert.equal(document.querySelectorAll('#pal .pal-sel').length, 0);
  } finally { document.elementFromPoint = oldHit; }
});
t('palette: выделенный диапазон можно перетащить как блок', () => {
  S.palette = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4]]; pal.buildPalette();
  let sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')]; const oldHit = document.elementFromPoint;
  try {
    document.elementFromPoint = () => sw[4];
    sw[1].dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0 }));
    document.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 20, clientY: 0 }));
    document.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 20, clientY: 0 }));
    assert.deepEqual(S.palette, [[0, 0, 0], [3, 3, 3], [4, 4, 4], [1, 1, 1], [2, 2, 2]]);
    assert.equal(document.querySelectorAll('#pal .pal-sel').length, 2);
  } finally { document.elementFromPoint = oldHit; }
});
t('palette: ПКМ-протяжка выделяет свотчи наведением, не переставляет', () => {
  S.palette = [[1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4]]; S.shading = { colors: [], on: false, open: false, picking: false }; pal.buildPalette();
  const sw = [...document.querySelectorAll('#pal .sw:not(.plus)')], oldHit = document.elementFromPoint;
  try {
    document.elementFromPoint = () => sw[2];
    sw[0].dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 2, clientX: 0, clientY: 0 }));
    document.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 20, clientY: 0 }));
    document.elementFromPoint = () => sw[3];
    document.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 40, clientY: 0 }));
    document.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, button: 2, clientX: 40, clientY: 0 }));
    assert.deepEqual(S.palette, [[1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4]]); // ПКМ-драг не переставляет
    assert.equal(document.querySelectorAll('#pal .pal-sel').length, 3); // наведено на 0,2,3
  } finally { document.elementFromPoint = oldHit; }
});
await ta('palette: долгий тап поднимает свотч и переставляет с зазором', async () => {
  S.palette = [[1, 1, 1], [2, 2, 2], [3, 3, 3]]; S.shading = { colors: [], on: false, open: false, picking: false }; pal.buildPalette();
  const sw = [...document.querySelectorAll('#pal .sw:not(.plus)')], oldHit = document.elementFromPoint;
  const pe = (type, x) => { const ev = new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 0 });
    Object.defineProperty(ev, 'pointerType', { value: 'touch' }); Object.defineProperty(ev, 'pointerId', { value: 5 }); return ev; };
  try {
    document.elementFromPoint = () => sw[2];
    sw[0].dispatchEvent(pe('pointerdown', 0));
    await new Promise((r) => setTimeout(r, 520)); // долгий тап → свотч поднимается
    assert.ok(sw[0].classList.contains('lifting'));
    document.dispatchEvent(pe('pointermove', 20));
    document.dispatchEvent(pe('pointerup', 20));
    assert.deepEqual(S.palette, [[2, 2, 2], [3, 3, 3], [1, 1, 1]]); // цвет 0 переставлен в конец, не выделил соседей
  } finally { document.elementFromPoint = oldHit; }
});
await ta('palette: кнопка Shading выбирает ramp без залипшего выделения палитры', async () => {
  shading.clear(); S.palette = [[10, 10, 10], [20, 20, 20], [30, 30, 30], [40, 40, 40]]; pal.buildPalette();
  document.getElementById('shade-pick').click();
  let sw = [...document.querySelectorAll('#pal .sw:not(.plus)')]; const oldHit = document.elementFromPoint;
  try {
    document.elementFromPoint = () => sw[3];
    sw[1].dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 0 }));
    document.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 30, clientY: 0 }));
    document.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 30, clientY: 0 }));
  } finally { document.elementFromPoint = oldHit; }
  assert.deepEqual(S.shading.colors, [[20, 20, 20], [30, 30, 30], [40, 40, 40]]);
  assert.equal(S.shading.on, true); assert.equal(S.shading.picking, false);
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  assert.equal(document.querySelectorAll('#pal .pal-sel').length, 0);
  assert.equal(document.querySelectorAll('#pal .shade-sel').length, 0);
  await new Promise((r) => setTimeout(r)); // сбросить отложенный palSquelch до следующего теста
});
t('shading: максимум 6 цветов и клик по линейке разворачивает направление', () => {
  shading.setRamp([[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4], [5, 5, 5], [6, 6, 6]]);
  assert.equal(S.shading.colors.length, 6);
  document.querySelector('#shade-list .shade-sw').click();
  assert.deepEqual(S.shading.colors[0], [5, 5, 5]);
  shading.clear();
});
t('shading: закрытие и смена инструмента сбрасывают режим без потери ramp', () => {
  shading.setRamp([[0, 0, 0], [80, 80, 80], [160, 160, 160]]);
  S.palette = [[0, 0, 0], [80, 80, 80], [160, 160, 160]]; pal.buildPalette();
  let sw = [...document.querySelectorAll('#pal .sw:not(.plus)')]; // выделение через ctrl+клик
  sw[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  assert.equal(document.querySelectorAll('#pal .pal-sel').length, 3);
  shading.close();
  assert.deepEqual(S.shading.colors, [[0, 0, 0], [80, 80, 80], [160, 160, 160]]);
  assert.equal(S.shading.on, false); assert.equal(S.shading.open, false); assert.equal(document.querySelectorAll('#pal .pal-sel').length, 0);
  shading.open(); assert.equal(S.shading.on, true); assert.ok(document.getElementById('shade-pop').classList.contains('on'));
  setTool('eraser');
  assert.equal(S.shading.on, false); assert.equal(S.shading.open, false);
  assert.deepEqual(S.shading.colors, [[0, 0, 0], [80, 80, 80], [160, 160, 160]]);
  shading.clear(); setTool('pencil');
});
t('shading: кисть двигает цвет на шаг к первому цвету линейки', () => { resetWH(3, 3);
  S.tool = 'pencil'; S.brushes.pencil.size = 1; S.layers[0].grid[1][1] = [200, 200, 200, 180];
  S.shading = { colors: [[0, 0, 0], [100, 100, 100], [200, 200, 200]], on: true, open: true, picking: false };
  stroke.beginStroke(); stamp(1, 1); stamp(1, 1); S.stroke = false;
  assert.deepEqual(S.layers[0].grid[1][1], [100, 100, 100, 180]);
  stroke.beginStroke(); stamp(1, 1); S.stroke = false;
  assert.deepEqual(S.layers[0].grid[1][1], [0, 0, 0, 180]);
  S.shading = { colors: [[200, 200, 200], [100, 100, 100], [0, 0, 0]], on: true, open: true, picking: false };
  stroke.beginStroke(); stamp(1, 1); S.stroke = false;
  assert.deepEqual(S.layers[0].grid[1][1], [100, 100, 100, 180]);
  S.shading = { colors: [], on: false, open: false, picking: false };
});

t('brush-bar: syncBars без ошибок', () => { S.brushes.pencil.size = 4; bb.syncBars(); assert.ok(true); });
t('brush-prefs: сохраняет и читает последние настройки кисти', () => {
  localStorage.removeItem(BRUSH_PREFS_STORE);
  S.brushes.pencil = { size: 7, op: 0.42 }; S.brushes.eraser = { size: 9, op: 0.75 };
  S.ppOn = true; S.stabOn = false; saveBrushPrefs(S);
  const loaded = loadBrushPrefs({ pencil: { size: 1, op: 1 }, eraser: { size: 1, op: 1 } }, { pixelPerfect: false, stabilize: true });
  assert.deepEqual(loaded.brushes.pencil, { size: 7, op: 0.42 }); assert.deepEqual(loaded.brushes.eraser, { size: 9, op: 0.75 });
  assert.deepEqual(loaded.flags, { pixelPerfect: true, stabilize: false });
});
t('brush-bar: шкала доходит до нового потолка и бережёт малые размеры', () => {
  const linearMid = Math.round(1 + 0.5 * (BP_SMAX - 1));
  assert.equal(bb.sizeFromFrac(0), 1); assert.equal(bb.sizeFromFrac(1), BP_SMAX);
  assert.ok(bb.sizeFromFrac(0.5) < linearMid); assert.equal(bb.sizeFromFrac(bb.fracFromSize(BP_SMAX)), BP_SMAX);
});
t('brush-bar: хоткеи размера кисти упираются в потолок', () => {
  localStorage.removeItem(BRUSH_PREFS_STORE);
  resetWH(8, 8); S.brushes.pencil.size = BP_SMAX - 1; S.brushes.pencil.op = 0.5;
  actions.run('brush.bigger'); assert.equal(S.brushes.pencil.size, BP_SMAX);
  assert.equal(JSON.parse(localStorage.getItem(BRUSH_PREFS_STORE)).pencil.size, BP_SMAX);
  actions.run('brush.bigger'); assert.equal(S.brushes.pencil.size, BP_SMAX);
  actions.run('brush.smaller'); assert.equal(S.brushes.pencil.size, BP_SMAX - 1);
  S.brushes.pencil = { size: 1, op: 1 }; S.brushes.eraser = { size: 1, op: 1 }; saveBrushPrefs(S);
});
await ta('brush-library: кисть из выделения сразу активна и выделение снято', async () => { resetWH(6, 6);
  S.layers[0].grid[2][2] = [20, 30, 40, 255]; S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null; S.tool = 'select';
  const proto = HTMLCanvasElement.prototype, orig = proto.getContext;
  proto.getContext = function (...args) { const ctx = orig.apply(this, args);
    return new Proxy(ctx, { get(tg, p) { if (p === 'getImageData') return () => { const data = new Uint8ClampedArray(S.W * S.H * 4);
      for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = S.layers[0].grid[y][x]; if (!c) continue;
        const o = (y * S.W + x) * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = c[3] ?? 255; }
      return { data }; };
    return tg[p]; }, set(tg, p, v) { tg[p] = v; return true; } }); };
  try {
    await brushFromSel.createFromSelection();
    assert.equal(S.tool, 'pencil'); assert.equal(S.sel, null); assert.ok(S.stampBrush.pencil);
    assert.equal(S.stampBrush.pencil.baseSize, 1); assert.equal(S.brushes.pencil.size, BP_SMAX);
    assert.ok(brushData.lib.brushes.some((b) => b.id === S.stampBrush.pencil.id));
  } finally { proto.getContext = orig; S.stampBrush.pencil = null; S.brushes.pencil = { size: 1, op: 1 }; }
});
t('brush-library: иконки остаются читаемыми при маленьком размере кисти', () => {
  const proto = HTMLCanvasElement.prototype, orig = proto.getContext, old = brushData.lib.brushes;
  proto.getContext = function (...args) { const ctx = orig.apply(this, args), canvas = this;
    return new Proxy(ctx, { get(tg, p) { if (p === 'putImageData') return (img) => { canvas.__pixels = img.data; };
      if (p === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      return tg[p]; } }); };
  try {
    S.brushes.pencil.size = 1; brushList.bindList({ mode: () => 'pencil' });
    brushData.lib.brushes = [{ id: 'sq', name: 'Square', order: 0, source: 'base', shape: 'shape',
      cov: { w: 1, h: 1, data: new Uint8Array([255]) }, grain: null, params: {} }];
    brushList.renderBrushes(); const cv = document.querySelector('#brush-list canvas');
    let on = 0; for (let i = 3; i < cv.__pixels.length; i += 4) if (cv.__pixels[i]) on++;
    assert.ok(on > 900);
  } finally { proto.getContext = orig; brushData.lib.brushes = old; document.getElementById('brush-list').innerHTML = ''; }
});
t('brush-library: ПКМ по кисти открывает настройки', () => {
  const old = brushData.lib.brushes; let opened = null;
  try {
    brushData.lib.brushes = [{ id: 'ctxb', name: 'Ctx Brush', order: 0, source: 'base', shape: 'shape',
      cov: { w: 1, h: 1, data: new Uint8Array([255]) }, grain: null, params: {} }];
    brushList.bindList({ mode: () => 'pencil', pick() {}, settings: (b) => { opened = b; }, rename() {}, rerender() {} });
    brushList.renderBrushes();
    const tile = document.querySelector('#brush-list .btile');
    tile.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 2, clientX: 10, clientY: 10 }));
    tile.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, button: 2, clientX: 10, clientY: 10 }));
    assert.equal(opened && opened.id, 'ctxb');
  } finally { brushData.lib.brushes = old; document.getElementById('brush-list').innerHTML = ''; }
});
t('menus: контекстное меню выше активной панели и закрывает другие меню', () => {
  const panel = document.getElementById('brush-pop'), menu = document.getElementById('brush-plus'), other = document.getElementById('lctx');
  do { panel.style.zIndex = nextFloatingZ(); } while (+panel.style.zIndex <= 75);
  other.classList.add('on'); showMenuAt(menu, 120, 120);
  assert.ok(+menu.style.zIndex > +panel.style.zIndex); assert.ok(menu.classList.contains('on'));
  assert.ok(!other.classList.contains('on')); menu.classList.remove('on');
});
t('menus: tool-choice открывается снаружи панели тулбара', () => {
  const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });
  const mockRect = (el, r) => { const old = el.getBoundingClientRect; el.getBoundingClientRect = () => r; return () => { el.getBoundingClientRect = old; }; };
  const sidebar = document.getElementById('sidebar'), sym = document.getElementById('sym'), symMenu = document.getElementById('sym-choice');
  const shape = document.getElementById('t-shape'), shapeMenu = document.getElementById('shape-choice');
  const undo = [
    mockRect(sidebar, rect(96, 120, 54, 320)), mockRect(sym, rect(104, 260, 38, 38)), mockRect(symMenu, rect(0, 0, 220, 46)),
    mockRect(shape, rect(104, 170, 38, 38)), mockRect(shapeMenu, rect(0, 0, 160, 46)),
  ];
  try {
    showMenuForAnchor(symMenu, sym);
    assert.equal(symMenu.style.left, '152px');
    assert.ok(symMenu.querySelector('.menu-arrow').classList.contains('left'));
    symMenu.classList.remove('on');
    showMenuForAnchor(shapeMenu, shape);
    assert.equal(shapeMenu.style.left, '152px');
    assert.ok(shapeMenu.querySelector('.menu-arrow').classList.contains('left'));
    shapeMenu.classList.remove('on');
    sidebar.getBoundingClientRect = () => rect(540, 120, 54, 320);
    sym.getBoundingClientRect = () => rect(548, 260, 38, 38);
    showMenuForAnchor(symMenu, sym);
    assert.equal(symMenu.style.left, '318px');
    assert.ok(symMenu.querySelector('.menu-arrow').classList.contains('right'));
    symMenu.classList.remove('on');
  } finally { undo.forEach((fn) => fn()); }
});
t('tile-toolbar: Add tile не появляется даже из старого сохранённого порядка', () => {
  const old = localStorage.getItem('tileToolbarOrder4');
  try {
    localStorage.setItem('tileToolbarOrder4', JSON.stringify(['draw', 'new', 'auto', 'manual', 'save']));
    const bar = tileToolbar.buildToolbar();
    assert.equal(bar.querySelector('[data-tb="new"]'), null);
    assert.deepEqual([...bar.querySelectorAll('button')].map((b) => b.dataset.tb), ['place', 'drawtile', 'edittile', 'save', 'rnd', 'del']);
  } finally {
    if (old == null) localStorage.removeItem('tileToolbarOrder4'); else localStorage.setItem('tileToolbarOrder4', old);
  }
});
t('tile-toolbar: Place tile и Draw/Edit подсвечиваются взаимоисключающе', () => {
  const bar = tileToolbar.buildToolbar(); document.body.appendChild(bar);
  const on = (id) => bar.querySelector('[data-tb="' + id + '"]').classList.contains('on');
  try {
    S.tool = 'tilebrush'; S.tileMode = 'paint'; S.tileAutoMode = 'auto'; tileToolbar.syncToolbar();
    assert.equal(on('place'), true); assert.equal(on('drawtile'), false); assert.equal(on('edittile'), false);
    S.tool = 'pencil'; S.tileAutoMode = 'auto'; tileToolbar.syncToolbar();
    assert.equal(on('place'), false); assert.equal(on('drawtile'), true); assert.equal(on('edittile'), false);
    S.tool = 'eraser'; S.tileAutoMode = 'manual'; tileToolbar.syncToolbar();
    assert.equal(on('place'), false); assert.equal(on('drawtile'), false); assert.equal(on('edittile'), true);
    S.tool = 'fill'; S.tileAutoMode = 'auto'; tileToolbar.syncToolbar();
    assert.equal(on('place'), false); assert.equal(on('drawtile'), true); assert.equal(on('edittile'), false);
  } finally { bar.remove(); }
});
await ta('floating-window: новое окно и активное окно поднимаются, toolbar выше всех', async () => {
  const root = document.createElement('div'), rootGrip = document.createElement('div');
  const ovl = document.createElement('div'), sheet = document.createElement('div'), sheetGrip = document.createElement('div');
  const toolbar = document.createElement('div'), toolbarGrip = document.createElement('div');
  root.style.display = 'none'; ovl.className = 'ovl'; ovl.style.display = 'none'; sheet.appendChild(sheetGrip); ovl.appendChild(sheet);
  root.appendChild(rootGrip); toolbar.appendChild(toolbarGrip); document.body.append(root, ovl, toolbar);
  try {
    floatingWindow(root, { grip: rootGrip, avoidOverlap: false });
    floatingWindow(sheet, { grip: sheetGrip, avoidOverlap: false });
    floatingWindow(toolbar, { grip: toolbarGrip, avoidOverlap: false, alwaysOnTop: true });
    root.style.display = 'block'; await Promise.resolve();
    const rootZ1 = +root.style.zIndex; assert.ok(rootZ1 > 0);
    ovl.style.display = 'flex'; await Promise.resolve();
    assert.ok(+ovl.style.zIndex > rootZ1);
    root.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
    assert.ok(+root.style.zIndex > +ovl.style.zIndex);
    toolbar.style.display = 'block'; toolbar.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
    assert.ok(+toolbar.style.zIndex > +root.style.zIndex);
  } finally { root.remove(); ovl.remove(); toolbar.remove(); }
});
await ta('floating-window: drag из прокручиваемого тела не таскает окно, грип — таскает', async () => {
  const win = document.createElement('div'), head = document.createElement('div'), body = document.createElement('div'), row = document.createElement('div');
  body.style.overflowY = 'auto'; body.appendChild(row); win.append(head, body); document.body.appendChild(win);
  try {
    floatingWindow(win, { grip: head, avoidOverlap: false });
    win.style.left = '200px';
    row.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    win.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 150, clientY: 130 }));
    win.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 150, clientY: 130 }));
    assert.equal(win.style.left, '200px'); // окно не уехало — drag достался строке списка, а не окну
    head.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    win.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 150, clientY: 130 }));
    win.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 150, clientY: 130 }));
    assert.equal(win.style.left, '50px'); // за грип (шапку) окно по-прежнему переносится
  } finally { win.remove(); }
});
t('gallery: режим галереи сохраняет открытые окна редактора', () => {
  const ids = ['lay-pop', 'brush-pop', 'adjpop', 'prevwin'];
  ids.forEach((id) => document.getElementById(id).classList.add('on'));
  gallery.show();
  assert.ok(document.getElementById('gallery').classList.contains('on'));
  assert.ok(document.body.classList.contains('gallery-open'));
  ids.forEach((id) => assert.ok(document.getElementById(id).classList.contains('on')));
  gallery.hide();
  assert.ok(!document.body.classList.contains('gallery-open'));
  ids.forEach((id) => document.getElementById(id).classList.remove('on'));
});
t('gallery: плюс открывает диалог нового холста', () => {
  newCanvas.mount(); gallery.show();
  const ovl = document.getElementById('new-ovl'); ovl.classList.remove('on');
  document.getElementById('gal-new').click();
  assert.ok(ovl.classList.contains('on'));
  document.getElementById('gal-new').click();
  assert.ok(!ovl.classList.contains('on'));
  ovl.classList.remove('on'); gallery.hide();
});
await ta('gallery: drag без gap — исходник затемнён, призрак без подписей, точка вставки', async () => {
  const grid = document.getElementById('gal-grid'), back = document.getElementById('gal-back');
  grid.innerHTML = ''; back.style.display = 'none';
  Object.defineProperty(grid, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 0, top: 0, right: 500, bottom: 220 }) });
  const tile = (id, left) => { const el = document.createElement('div'); el.className = 'gal-tile'; el.dataset.id = id; el.dataset.kind = 'doc';
    el.innerHTML = '<div class="gal-thumb"></div><div class="gal-cap"><b>' + id + '</b></div>';
    Object.defineProperty(el, 'getBoundingClientRect', { configurable: true, value: () => ({ left, top: 0, right: left + 100, bottom: 160, width: 100, height: 160 }) });
    grid.appendChild(el); return el; };
  const a = tile('a', 0), b = tile('b', 120), c = tile('c', 240);
  let drop = null; const prevPoint = document.elementFromPoint;
  document.elementFromPoint = (x) => (x < 220 ? b : c);
  try {
    attachGalleryDrag(a, 'a', { gridEl: () => grid, selecting: () => false, dragIds: () => ['a'], onBack() {}, onStack() {}, onReorder: (ids, before) => { drop = { ids, before }; } });
    a.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20, button: 0 }));
    a.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 215, clientY: 20, button: 0 }));
    a.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 215, clientY: 20, button: 0 }));
    assert.ok(a.classList.contains('dragging')); // исходник остаётся в сетке (затемнён), не схлопывается
    const gh = document.querySelector('.gal-drag-ghost');
    assert.ok(gh && !gh.querySelector('.gal-cap')); // призрак — только превью, без подписей
    a.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 215, clientY: 20, button: 0 }));
    assert.deepEqual(drop, { ids: ['a'], before: 'c' });
    assert.equal(grid.querySelector('.drop-gap'), null); // gap не создаётся вовсе
    assert.equal(document.querySelector('.gal-drag-ghost'), null); // призрак убран на отпускании
  } finally {
    document.elementFromPoint = prevPoint; grid.innerHTML = '';
    await new Promise((resolve) => setTimeout(resolve, 460));
  }
});
await ta('gallery: touch drag стартует только после поднятия плитки', async () => {
  const grid = document.getElementById('gal-grid'), back = document.getElementById('gal-back');
  grid.innerHTML = ''; back.style.display = 'none';
  Object.defineProperty(grid, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 0, top: 0, right: 500, bottom: 220 }) });
  const mk = (id, left) => { const el = document.createElement('div'); el.className = 'gal-tile'; el.dataset.id = id; el.dataset.kind = 'doc';
    el.innerHTML = '<div class="gal-thumb"></div><div class="gal-cap"><b>' + id + '</b></div>';
    Object.defineProperty(el, 'getBoundingClientRect', { configurable: true, value: () => ({ left, top: 0, right: left + 100, bottom: 160, width: 100, height: 160 }) });
    grid.appendChild(el); return el; };
  const a = mk('ta', 0), b = mk('tb', 120);
  const prevPoint = document.elementFromPoint;
  document.elementFromPoint = () => b;
  let drop = null;
  const pe = (type, x, y) => { const ev = new window.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperty(ev, 'pointerType', { value: 'touch' }); Object.defineProperty(ev, 'pointerId', { value: 7 }); return ev; };
  try {
    attachGalleryDrag(a, 'ta', { gridEl: () => grid, selecting: () => false, dragIds: () => ['ta'], onBack() {}, onStack() {}, onReorder: (ids, before) => { drop = { ids, before }; } });
    a.dispatchEvent(pe('pointerdown', 10, 10));
    a.dispatchEvent(pe('pointermove', 30, 10));
    assert.ok(!a.classList.contains('dragging'));
    await new Promise((resolve) => setTimeout(resolve, 1500)); // подъём (рост картинки) после «клевка» (~1450мс)
    assert.ok(a.classList.contains('lifting'));
    a.dispatchEvent(pe('pointermove', 42, 10));
    assert.ok(a.classList.contains('dragging'));
    a.dispatchEvent(pe('pointermove', 190, 10));
    a.dispatchEvent(pe('pointerup', 190, 10));
    assert.deepEqual(drop, { ids: ['ta'], before: null });
    assert.ok(!a.classList.contains('dragging'));
  } finally {
    document.elementFromPoint = prevPoint; grid.innerHTML = '';
    await new Promise((resolve) => setTimeout(resolve, 460));
  }
});
await ta('gallery: сквозной drag через рендер+стор переставляет плитку', async () => {
  const galScreen = await import('../src/systems/gallery/screen.js');
  const store = await import('../src/systems/gallery/store.js');
  const { saveDoc, removeDoc } = await import('../src/core/storage.js');
  const { sortGalleryItems } = await import('../src/logic/gallery-grid.js');
  for (const d of await store.listAll()) await removeDoc(d.id); // изолируем корень
  await saveDoc({ id: 'e1', kind: 'doc', name: 'E1', folder: null, W: 8, H: 8, order: 300, updated: 999, preview: '' });
  await saveDoc({ id: 'e2', kind: 'doc', name: 'E2', folder: null, W: 8, H: 8, order: 200, updated: 200, preview: '' });
  await saveDoc({ id: 'e3', kind: 'doc', name: 'E3', folder: null, W: 8, H: 8, order: 100, updated: 100, preview: '' });
  galScreen.configure({ onOpen: () => {} }); galScreen.goBack(); await galScreen.render();
  const grid = document.getElementById('gal-grid');
  const tiles = [...grid.querySelectorAll('.gal-tile')];
  assert.deepEqual(tiles.map((t) => t.dataset.id), ['e1', 'e2', 'e3']);
  Object.defineProperty(grid, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 0, top: 0, right: 500, bottom: 200 }) });
  tiles.forEach((t, i) => Object.defineProperty(t, 'getBoundingClientRect', { configurable: true, value: () => ({ left: i * 120, top: 0, right: i * 120 + 100, bottom: 160, width: 100, height: 160 }) }));
  const prevPoint = document.elementFromPoint;
  document.elementFromPoint = (x) => tiles.find((t) => { const r = t.getBoundingClientRect(); return x >= r.left && x <= r.right; }) || grid;
  try {
    const a = tiles[0];
    a.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 20, button: 0 }));
    a.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 330, clientY: 20, button: 0 }));
    a.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 330, clientY: 20, button: 0 }));
    a.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 330, clientY: 20, button: 0 }));
    await new Promise((r) => setTimeout(r, 60)); // дождаться async onReorder + render
    const order = sortGalleryItems(await store.childrenOf(null)).map((x) => x.id);
    assert.deepEqual(order, ['e2', 'e3', 'e1']); // e1 переставлен в конец и держится в сторе
  } finally {
    document.elementFromPoint = prevPoint;
    for (const id of ['e1', 'e2', 'e3']) await removeDoc(id);
    await new Promise((r) => setTimeout(r, 460));
  }
});
await ta('gallery: бросок за крайнюю плитку ставит в край (не отскок)', async () => {
  const grid = document.getElementById('gal-grid'), back = document.getElementById('gal-back');
  grid.innerHTML = ''; back.style.display = 'none';
  Object.defineProperty(grid, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 0, top: 0, right: 500, bottom: 220 }) });
  const mk = (id, left) => { const el = document.createElement('div'); el.className = 'gal-tile'; el.dataset.id = id; el.dataset.kind = 'doc';
    el.innerHTML = '<div class="gal-thumb"></div><div class="gal-cap"><b>' + id + '</b></div>';
    Object.defineProperty(el, 'getBoundingClientRect', { configurable: true, value: () => ({ left, top: 0, right: left + 100, bottom: 160, width: 100, height: 160 }) });
    grid.appendChild(el); return el; };
  const a = mk('a', 0), b = mk('b', 120); mk('c', 240);
  let drop = null; const prevPoint = document.elementFromPoint;
  document.elementFromPoint = () => grid; // курсор в отступе/за краем — не над плиткой
  const ctx = { gridEl: () => grid, selecting: () => false, dragIds: (id) => [id], onBack() {}, onStack() {}, onReorder: (ids, before) => { drop = { ids, before }; } };
  try {
    attachGalleryDrag(a, 'a', ctx); attachGalleryDrag(b, 'b', ctx);
    b.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 130, clientY: 20, button: 0 }));
    b.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 480, clientY: 20, button: 0 })); // далеко вправо, за последнюю (c)
    b.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 480, clientY: 20, button: 0 }));
    b.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 480, clientY: 20, button: 0 }));
    assert.deepEqual(drop, { ids: ['b'], before: null }); // встал после последней, не отскочил
    drop = null;
    a.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 20, button: 0 }));
    a.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 320, clientY: 20, button: 0 })); // даём начаться драгу
    a.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 5, clientY: 20, button: 0 })); // далеко влево, перед первой (b)
    a.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 5, clientY: 20, button: 0 }));
    assert.deepEqual(drop, { ids: ['a'], before: 'b' }); // встал перед первой оставшейся (b)
  } finally { document.elementFromPoint = prevPoint; grid.innerHTML = ''; await new Promise((r) => setTimeout(r, 50)); }
});
await ta('layers-ui: быстрый бросок слоя переставляет до раскрытия зазора', async () => {
  resetWH(4, 4); lops.doAddLayer(); layList(); // два слоя: index1 сверху, index0 ('a') снизу
  const rows = [...document.querySelectorAll('#lay-list .lrow')];
  const src = rows.find((r) => r.dataset.li === '0'), tgt = rows.find((r) => r.dataset.li === '1');
  const pop = document.getElementById('lay-pop');
  Object.defineProperty(pop, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 0, top: 0, right: 200, bottom: 400 }) });
  Object.defineProperty(tgt, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 0, top: 0, right: 200, bottom: 40, width: 200, height: 40 }) });
  const prevPoint = document.elementFromPoint;
  document.elementFromPoint = () => tgt;
  try {
    src.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 50, clientY: 80 }));
    src.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, button: 0, clientX: 50, clientY: 10 })); // вертикальный — старт драга + наведение на верхнюю строку
    assert.ok(src.classList.contains('dragging'));
    src.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 50, clientY: 10 })); // отпускаем сразу, зазор ещё не раскрылся
    assert.equal(S.layers[1].name, 'a'); // слой 'a' переставлен наверх
  } finally {
    document.elementFromPoint = prevPoint;
    delete pop.getBoundingClientRect; // вернуть прототипную реализацию для следующих тестов
    await new Promise((resolve) => setTimeout(resolve, 320));
  }
});
await ta('drop-gap: открывается после задержки и отдаёт точку вставки', async () => {
  const box = document.createElement('div'); document.body.appendChild(box);
  const a = document.createElement('i'), b = document.createElement('i'); a.className = b.className = 'item';
  Object.defineProperty(b, 'getBoundingClientRect', { configurable: true, value: () => ({ width: 100, height: 80 }) });
  box.append(a, b);
  const gap = makeDropGap({ className: 'test-gap' });
  try {
    gap.request(box, b, false, b, 'b:before', 20);
    assert.equal(box.querySelector('.drop-gap'), null);
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(b.previousElementSibling, gap.el);
    assert.equal(gap.next('.item'), b);
    gap.close();
    assert.ok(gap.el.classList.contains('closing'));
    await new Promise((resolve) => setTimeout(resolve, 220));
    assert.equal(box.querySelector('.drop-gap'), null);
  } finally { gap.remove(); box.remove(); }
});
t('drag-ghost: клон плитки галереи сохраняет размер превью', () => {
  const tile = document.createElement('div'), thumb = document.createElement('div');
  tile.className = 'gal-tile dragging source-gap'; thumb.className = 'gal-thumb'; tile.appendChild(thumb);
  Object.defineProperty(tile, 'getBoundingClientRect', { configurable: true, value: () => ({ width: 118, height: 176 }) });
  Object.defineProperty(thumb, 'getBoundingClientRect', { configurable: true, value: () => ({ width: 118, height: 118 }) });
  const ghost = dragGhost(tile, 118, 1);
  const el = document.body.querySelector('.drag-ghost.gal-tile');
  assert.ok(el);
  assert.equal(el.style.width, '118px');
  assert.equal(el.style.getPropertyValue('--gal-tile'), '118px');
  assert.ok(!el.classList.contains('dragging'));
  assert.ok(!el.classList.contains('source-gap'));
  ghost.remove();
});
t('new-canvas: поля размера считают относительные выражения', () => {
  newCanvas.mount(); gallery.show();
  const ovl = document.getElementById('new-ovl'); ovl.classList.add('on');
  const w = document.getElementById('new-w'), h = document.getElementById('new-h');
  w.value = '+8'; w.dispatchEvent(new window.Event('blur'));
  h.value = '/2'; h.dispatchEvent(new window.Event('blur'));
  document.getElementById('new-create').click();
  assert.equal(S.W, 72); assert.equal(S.H, 32); assert.equal(S.docName, '72 x 32');
  ovl.classList.remove('on'); gallery.hide();
});
t('color-picker: sync из активного', () => { S.active = [255, 0, 0]; cp.syncColFromActive(); assert.equal(document.getElementById('col-hv').textContent, '0'); });
t('color-picker: первый sync скрытого окна держит маркер внутри внутреннего круга', () => {
  const pop = document.getElementById('colpop'), disc = document.getElementById('col-disc'), sv = document.getElementById('col-svdisc');
  pop.classList.remove('on');
  disc.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 });
  sv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 });
  Object.defineProperty(disc, 'clientWidth', { value: 0, configurable: true });
  Object.defineProperty(sv, 'clientWidth', { value: 0, configurable: true });
  S.active = [144, 170, 188]; cp.syncColFromActive();
  const x = parseFloat(document.getElementById('col-svmark').style.left), y = parseFloat(document.getElementById('col-svmark').style.top);
  assert.ok(x >= 47 && x <= 239);
  assert.ok(y >= 47 && y <= 239);
});
t('color-picker: диск, плюс и история использованных цветов работают без большой Add-кнопки', () => { localStorage.removeItem('pixel-heart:color-used-history'); cp.mount(); document.getElementById('col-hist-clear').click(); S.palette = [];
  assert.ok(document.getElementById('col-disc')); assert.ok(document.getElementById('col-prev-sw')); assert.ok(document.getElementById('col-copy')); assert.equal(document.querySelector('#colpop .iact'), null);
  S.active = [10, 20, 30]; cp.syncColFromActive();
  const hex = document.getElementById('col-hex'); hex.value = '#123456'; hex.dispatchEvent(new window.Event('input', { bubbles: true }));
  document.getElementById('col-add').click(); assert.deepEqual(S.palette[0], [18, 52, 86]);
  assert.equal(document.querySelectorAll('#col-hist button').length, 0);
  document.getElementById('col-prev-sw').click(); assert.equal(hex.value, '#0A141E'); assert.deepEqual(S.active, [10, 20, 30]);
  const disc = document.getElementById('col-disc'), sv = document.getElementById('col-svdisc');
  disc.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 });
  sv.getBoundingClientRect = () => ({ left: 33, top: 33, width: 134, height: 134, right: 167, bottom: 167 });
  Object.defineProperty(disc, 'clientWidth', { value: 200, configurable: true });
  Object.defineProperty(sv, 'clientWidth', { value: 134, configurable: true });
  const pev = (button, x, y) => { const e = new window.MouseEvent('pointerdown', { bubbles: true, button, clientX: x, clientY: y });
    Object.defineProperty(e, 'pointerType', { value: 'mouse' }); return e; };
  disc.dispatchEvent(pev(0, 190, 100)); assert.equal(S.palette.length, 1);
  disc.dispatchEvent(pev(2, 10, 100)); assert.equal(S.palette.length, 2);
  actions.run('color.used', [18, 52, 86]);
  assert.equal(document.querySelectorAll('#col-hist button').length, 1);
  document.getElementById('col-hist-clear').click(); assert.equal(document.querySelectorAll('#col-hist button').length, 0);
});
t('color-picker: двойной клик во внутреннем круге снапает к ближайшей крайней точке', () => {
  const disc = document.getElementById('col-disc'), sv = document.getElementById('col-svdisc');
  disc.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 });
  sv.getBoundingClientRect = () => ({ left: 54, top: 54, width: 92, height: 92, right: 146, bottom: 146 });
  Object.defineProperty(disc, 'clientWidth', { value: 200, configurable: true });
  Object.defineProperty(sv, 'clientWidth', { value: 92, configurable: true });
  S.active = [120, 20, 20]; cp.syncColFromActive();
  disc.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 68, clientY: 68 }));
  disc.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 68, clientY: 68 }));
  assert.deepEqual(S.active, [255, 255, 255]);
  disc.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 142 }));
  disc.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 142 }));
  assert.deepEqual(S.active, [0, 0, 0]);
});
t('color-picker: hue-кольцо совпадает с HSV и зазор не выбирает цвет', () => {
  const disc = document.getElementById('col-disc'), sv = document.getElementById('col-svdisc');
  disc.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 });
  sv.getBoundingClientRect = () => ({ left: 33, top: 33, width: 134, height: 134, right: 167, bottom: 167 });
  Object.defineProperty(disc, 'clientWidth', { value: 200, configurable: true });
  Object.defineProperty(sv, 'clientWidth', { value: 134, configurable: true });
  S.active = [255, 0, 0]; cp.syncColFromActive();
  disc.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 10 }));
  assert.equal(document.getElementById('col-hv').textContent, '0');
  disc.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 190, clientY: 100 }));
  assert.equal(document.getElementById('col-hv').textContent, '90');
  disc.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 31 }));
  assert.equal(document.getElementById('col-hv').textContent, '90');
});

t('windows: preview/reference монтируются без ошибок', () => { prev.mount(); ref.mount(); assert.ok(true); });

t('palette-manager: монтируется и сохраняет палитру', () => { S.palette = [[1, 2, 3], [4, 5, 6]]; palMgr.mount();
  document.getElementById('pal-name').value = 'тест'; document.getElementById('pal-save').click();
  const saved = JSON.parse(localStorage.getItem('palettes')); assert.deepEqual(saved['тест'], [[1, 2, 3], [4, 5, 6]]);
  assert.equal(document.getElementById('pal-from-img'), null);
  assert.equal(document.querySelectorAll('#pal-act > button').length, 7);
  document.getElementById('pal-presets').click(); assert.equal(document.getElementById('pal-save-row').style.display, 'none');
  document.getElementById('pal-save-open').click(); assert.notEqual(document.getElementById('pal-save-row').style.display, 'none');
  document.getElementById('pal-new').click(); assert.deepEqual(S.palette, []);
});
t('palette-manager: пустая палитра не сохраняется', () => { localStorage.setItem('palettes', JSON.stringify({ keep: [[9, 9, 9]] }));
  S.palette = []; palMgr.mount(); document.getElementById('pal-name').value = 'empty'; document.getElementById('pal-save').click();
  assert.deepEqual(JSON.parse(localStorage.getItem('palettes')), { keep: [[9, 9, 9]] });
  assert.equal(document.getElementById('toast').textContent, i18n.t('toast.paletteEmpty'));
});
t('palette-manager: палитра из картинки сохраняет 46 точных цветов', () => {
  const d = new Uint8ClampedArray(46 * 2 * 4);
  for (let i = 0; i < 46; i++) for (let y = 0; y < 2; y++) { const o = (y * 46 + i) * 4;
    d[o] = i; d[o + 1] = 120 - i; d[o + 2] = 40 + i; d[o + 3] = 255; }
  const pal = palMgr.paletteFromImageData(d);
  assert.equal(pal.length, 46); assert.deepEqual(pal[0], [0, 120, 40]); assert.deepEqual(pal[45], [45, 75, 85]);
});
t('palette-manager: палитра из файла ограничивается 128 цветами', () => {
  const d = new Uint8ClampedArray(150 * 4);
  for (let i = 0; i < 150; i++) { d[i * 4] = i; d[i * 4 + 1] = 150 - i; d[i * 4 + 2] = (i * 3) % 255; d[i * 4 + 3] = 255; }
  assert.ok(palMgr.paletteFromImageData(d, 128).length <= 128);
});
t('palette-manager: палитра с холста берёт видимые цвета', () => { resetWH(3, 3);
  S.layers[0].grid[0][0] = [1, 2, 3, 255]; S.layers[0].grid[1][1] = [7, 8, 9, 255];
  S.layers.push({ name: 'hidden', grid: blank(3, 3), opacity: 1, visible: false, fid: null, clip: false, ext: new Map(), effects: [] });
  S.layers[1].grid[2][2] = [80, 90, 100, 255]; cache.dirtyAll();
  assert.deepEqual(palMgr.paletteFromCanvas(), [[1, 2, 3], [7, 8, 9]]);
});

t('tint-shade: окно открывается от активного цвета палитры, шкалы по 5', () => {
  tsg.mount(); S.palette = [[10, 20, 30], [200, 100, 50]]; S.active = [200, 100, 50];
  document.getElementById('tsg-btn').click();
  assert.ok(document.getElementById('tsg-win').classList.contains('on'));
  assert.equal(document.querySelectorAll('#tsg-scales .tsg-scale').length, 2); // тинты + шейды
  assert.equal(document.querySelectorAll('#tsg-scales .tsg-scale')[0].querySelectorAll('.tsg-sw').length, 5);
});
t('tint-shade: HEX поля можно вставлять и редактировать', () => {
  document.querySelector('#tsg-scales .tsg-sw').click();
  assert.equal(document.querySelectorAll('#tsg-selprev .tsg-chip').length, 1);
  const input = document.getElementById('tsg-basehex');
  input.value = 'CF573C';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(input.value, '#CF573C');
  assert.equal(document.getElementById('tsg-baseprev').style.background, 'rgb(207, 87, 60)');
  assert.equal(document.querySelectorAll('#tsg-selprev .tsg-chip').length, 0);
  input.value = '#C57';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(input.value, '#CC5577');
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
t('toolbars: рабочие кнопки в вертикальном тулбаре, верхняя панель держит только глобальные окна', () => {
  const sideIds = ['t-pencil', 't-eraser', 't-fill', 't-shape', 't-move', 't-adjust', 't-select', 't-lasso',
    'sym', 'tile-btn', 'pp', 'stab', 'flip-h', 'crop', 'center', 'zoom'];
  for (const id of sideIds) assert.equal(document.getElementById(id).parentElement.id, 'sidebar');
  for (const id of ['docsbtn', 'imp-btn', 'export-btn', 'prev', 'refbtn']) assert.equal(document.getElementById(id).parentElement.id, 'tb-left');
  assert.equal(document.getElementById('layers').parentElement.id, 'tb-right');
  assert.equal(document.getElementById('activewrap').parentElement.id, 'tb-right');
  assert.equal(document.getElementById('fit'), null);
  assert.equal(document.getElementById('zin'), null);
  assert.equal(document.getElementById('zout'), null);
});
t('toolbars: линия и фигуры выбираются одной кнопкой с режимами', () => { tb.mount(); resetWH(8, 8);
  assert.equal(document.getElementById('t-line'), null); assert.equal(document.getElementById('line-choice'), null);
  document.getElementById('t-shape').click();
  assert.equal(S.tool, 'rect');
  assert.ok(!document.getElementById('shape-choice').classList.contains('on'));
  document.getElementById('t-shape').dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.ok(document.getElementById('shape-choice').classList.contains('on'));
  const modes = [...document.querySelectorAll('#shape-choice button')].map((b) => b.dataset.lineMode || b.dataset.shapeTool);
  assert.deepEqual(modes.slice(0, 4), ['line', 'contour', 'rect', 'rect']);
  document.querySelector('#shape-choice [data-line-mode="contour"]').click();
  assert.equal(S.tool, 'line'); assert.equal(S.lineMode, 'contour'); assert.ok(document.getElementById('t-shape').classList.contains('on'));
  setTool('pencil');
  document.getElementById('t-shape').click();
  assert.equal(S.tool, 'line'); assert.equal(S.lineMode, 'contour');
  document.getElementById('t-shape').dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  document.querySelector('#shape-choice [data-shape-tool="ellipse"][data-fill="1"]').click();
  assert.equal(S.tool, 'ellipse'); assert.equal(S.shapeTool, 'ellipse'); assert.equal(S.fillShape.ellipse, true);
  assert.ok(document.getElementById('t-shape').classList.contains('on'));
});
t('toolbars: ЛКМ кисти выбирает инструмент, ПКМ открывает библиотеку', () => {
  let opened = null; actions.register('ui.brushLibrary', (mode) => { opened = mode; });
  document.getElementById('brush-choice').classList.remove('on');
  resetWH(8, 8); S.tool = 'eraser'; document.getElementById('t-pencil').click();
  assert.equal(S.tool, 'pencil'); assert.equal(opened, null);
  assert.ok(!document.getElementById('brush-choice').classList.contains('on'));
  assert.equal(document.querySelectorAll('#brush-choice [data-brush-mode]').length, 2);
  document.getElementById('t-pencil').dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.equal(opened, 'pencil');
  document.getElementById('t-eraser').click();
  assert.equal(S.tool, 'eraser'); assert.equal(opened, 'pencil');
  document.getElementById('t-eraser').dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.equal(opened, 'eraser');
});
t('toolbars: повторное нажатие Move выключает трансформацию', () => { tb.mount(); resetWH(8, 8); S.tool = 'move'; S.layers[0].grid[2][2] = [1, 1, 1, 255]; cache.dirtyAll();
  actions.run('transform.enter'); assert.ok(S.rotMode); document.getElementById('t-move').click(); assert.equal(S.rotMode, null); }); // активная кнопка трансформации выключает
t('toolbars: повторное нажатие выделения снимает выделение', () => { tb.mount(); resetWH(8, 8); S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null; S.tool = 'select';
  document.getElementById('t-select').click(); assert.equal(S.sel, null); assert.equal(S.tool, 'pencil'); }); // активная кнопка выделения снимает
t('toolbars: выделение и Free Transform подсвечивают только текущий режим', () => { resetWH(8, 8); S.tool = 'pencil';
  S.layers[0].grid[1][1] = [1, 1, 1, 255]; S.sel = { x0: 1, y0: 1, x1: 2, y1: 2 }; bus.emit('selection');
  assert.ok(document.getElementById('t-select').classList.contains('on'));
  actions.run('transform.enter');
  assert.ok(document.getElementById('t-move').classList.contains('on'));
  assert.ok(!document.getElementById('t-select').classList.contains('on'));
  tf.exitRotMode(false); assert.ok(!document.getElementById('t-move').classList.contains('on')); });
t('toolbars: симметрия и Transform Canvas: ЛКМ запускает последний режим, ПКМ открывает меню', () => { tb.mount(); resetWH(4, 4);
  S.sym = false; S.symH = false; document.getElementById('sym').click();
  assert.equal(S.sym, true);
  assert.ok(!document.getElementById('sym-choice').classList.contains('on'));
  document.getElementById('sym').dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.ok(document.getElementById('sym-choice').classList.contains('on'));
  assert.equal(document.querySelectorAll('#sym-choice [data-sym-flag]').length, 4);
  assert.equal(document.querySelectorAll('#sym-choice [data-sym-tool]').length, 2);
  document.querySelector('#sym-choice [data-sym-flag="symH"]').click();
  assert.equal(S.symH, true);
  document.getElementById('sym').click();
  assert.equal(S.symH, false);
  document.querySelector('#sym-choice [data-sym-flag="symD1"]').click(); assert.equal(S.symD1, true);
  document.querySelector('#sym-choice [data-sym-tool="move"]').click(); assert.equal(S.symLines.mode, 'move');
  document.getElementById('sym').click(); assert.equal(S.symLines.mode, null);
  S.layers[0].grid[1][0] = [5, 5, 5, 255]; document.getElementById('flip-h').click();
  assert.ok(!document.getElementById('flip-choice').classList.contains('on'));
  assert.deepEqual(S.layers[0].grid[1][3], [5, 5, 5, 255]);
  document.getElementById('flip-h').dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.ok(document.getElementById('flip-choice').classList.contains('on'));
  assert.equal(document.getElementById('flip-h').title, i18n.t('side.flipH'));
  assert.equal(document.getElementById('rot'), null);
  assert.equal(document.querySelectorAll('#flip-choice [data-flip-mode]').length, 3);
  document.querySelector('#flip-choice [data-flip-mode="r"]').click();
  assert.ok(document.getElementById('flip-choice').classList.contains('on'));
  assert.equal(document.getElementById('flip-h').title, i18n.t('side.rotate'));
  assert.deepEqual(S.layers[0].grid[3][2], [5, 5, 5, 255]);
  assert.equal(document.getElementById('sym-h'), null); assert.equal(document.getElementById('flip-v'), null);
  S.sym = false; S.symH = false; S.symD1 = false; S.symLines.mode = null;
});
t('toolbars: Zoom свернут в одну кнопку с последним выбранным действием', () => { tb.mount(); resetWH(8, 8);
  document.getElementById('zoom').click();
  assert.equal(document.getElementById('zoom').title, i18n.t('tool.fit'));
  document.getElementById('zoom').dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert.ok(document.getElementById('zoom-choice').classList.contains('on'));
  assert.equal(document.querySelectorAll('#zoom-choice [data-zoom-mode]').length, 3);
  document.querySelector('#zoom-choice [data-zoom-mode="in"]').click();
  assert.ok(document.getElementById('zoom-choice').classList.contains('on'));
  assert.equal(document.getElementById('zoom').title, i18n.t('tool.zoomIn'));
});
t('grid: отдельного попапа нет, action переключает видимость сетки', () => { gridSys.mount(); resetWH(8, 8);
  assert.equal(document.getElementById('grid-btn'), null); assert.equal(document.getElementById('grid-pop'), null);
  assert.equal(S.grid.visible, false); gridSys.openGridPop();
  assert.equal(S.grid.visible, true); assert.equal(S.grid.preview, false);
  gridSys.openGridPop(); assert.equal(S.grid.visible, false);
});
t('grid: Canvas size управляет видимостью сетки', () => { crop.mount(); resetWH(8, 8); crop.toggleCrop();
  const btn = document.getElementById('crop-grid'), visible = document.getElementById('crop-grid-visible');
  assert.equal(S.grid.visible, false); assert.equal(btn.classList.contains('on'), false);
  btn.click(); assert.equal(S.grid.visible, false); assert.equal(btn.classList.contains('on'), false);
  visible.checked = true; visible.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(S.grid.visible, true); assert.equal(btn.classList.contains('on'), false);
  visible.checked = false; visible.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(S.grid.visible, false); assert.equal(btn.classList.contains('on'), false);
  crop.cancelCrop();
});
t('toolbars: Pixel Perfect и стабилизация сохраняются', () => {
  localStorage.removeItem(BRUSH_PREFS_STORE); S.ppOn = false; S.stabOn = true; tb.mount();
  document.getElementById('pp').click(); document.getElementById('stab').click();
  const saved = JSON.parse(localStorage.getItem(BRUSH_PREFS_STORE));
  assert.equal(saved.pixelPerfect, true); assert.equal(saved.stabilize, false);
  S.ppOn = false; S.stabOn = true; saveBrushPrefs(S);
});
t('effects: новый эффект до Apply остаётся черновиком без строки в списке', () => { effects.mount(); adjust.mount();
  resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  actions.run('fx.panel'); assert.ok(document.getElementById('fx-panel').classList.contains('on'));
  document.querySelector('#fx-types button[data-fx="glow"]').click(); layList();
  assert.equal(S.layers[0].effects.length, 0); assert.ok(S.fxDraft && S.fxDraft.eff.type === 'glow');
  assert.equal(document.querySelectorAll('#lay-list .fxrow').length, 0); assert.ok(document.getElementById('fx-edit').classList.contains('on'));
  document.getElementById('fx-cancel').click(); assert.equal(S.fxDraft, null); assert.equal(S.layers[0].effects.length, 0); });

t('effects: preview нового эффекта можно отменить через undo', () => { effects.mount(); resetWH(8, 8); S.undoStack.length = 0; S.redoStack.length = 0;
  actions.run('fx.panel'); document.querySelector('#fx-types button[data-fx="stroke"]').click();
  assert.ok(S.fxDraft); assert.ok(document.getElementById('fx-edit').classList.contains('on'));
  history.doUndo();
  assert.equal(S.fxDraft, null); assert.equal(document.getElementById('fx-edit').classList.contains('on'), false);
  assert.equal(S.layers[0].effects.length, 0); assert.equal(S.undoStack.length, 0);
});

t('effects: новые эффекты берут активный цвет', () => { resetWH(8, 8); S.active = [12, 34, 56];
  for (const type of EFFECT_TYPES) {
    document.querySelector(`#fx-types button[data-fx="${type}"]`).click();
    assert.equal(S.fxDraft.eff.params.color, '#0c2238'); document.getElementById('fx-cancel').click();
  } });

t('effects: Apply фиксирует эффект, undo убирает', () => { resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  document.querySelector('#fx-types button[data-fx="stroke"]').click(); document.getElementById('fx-apply').click();
  assert.equal(S.layers[0].effects.length, 1); history.doUndo(); assert.equal(S.layers[0].effects.length, 0); });

t('effects: preview изменения эффекта отменяется undo, Apply откатывается историей', () => { resetWH(8, 8); effects.mount(); S.undoStack.length = 0; S.redoStack.length = 0;
  const eff = newEffect('stroke', { size: 1, color: '#112233' }); S.layers[0].effects = [eff];
  actions.run('fx.edit', S.layers[0], eff); document.getElementById('fx-size').value = '5';
  document.getElementById('fx-size').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(eff.params.size, 5);
  assert.equal(kbd.handle(ev('KeyZ', { ctrlKey: true, target: document.getElementById('fx-size') })), true);
  assert.equal(eff.params.size, 1); assert.equal(document.getElementById('fx-edit').classList.contains('on'), false);
  assert.equal(S.undoStack.length, 0);
  actions.run('fx.edit', S.layers[0], eff); document.getElementById('fx-size').value = '4';
  document.getElementById('fx-size').dispatchEvent(new window.Event('input', { bubbles: true }));
  document.getElementById('fx-apply').click(); assert.equal(S.layers[0].effects[0].params.size, 4);
  history.doUndo(); assert.equal(S.layers[0].effects[0].params.size, 1);
});

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
t('fx: Convert To Layer у эффекта папки оставляет слой внутри этой папки', () => { resetWH(8, 8); const L = S.layers[0]; L.fid = 1; L.grid[4][4] = [1, 1, 1, 255];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#ff0000' } }] }];
  cache.dirtyAll(); const eff = S.folders[0].effects[0]; actions.run('fx.convert', S.folders[0], eff);
  assert.equal(S.folders[0].effects.length, 0); assert.equal(S.layers.length, 2); assert.equal(S.layers[0].fid, 1);
  assert.equal(S.layers[1], L); assert.deepEqual(S.layers[1].grid[4][4], [1, 1, 1, 255]); });
t('fx: adjustment нельзя превратить в слой', () => { resetWH(8, 8); const L = S.layers[0], eff = newEffect('adjustment', { brightness: 20 });
  L.effects = [eff]; actions.run('fx.convert', L, eff);
  assert.equal(S.layers.length, 1); assert.equal(L.effects[0], eff); });
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
t('layers-ui: взятие неактивного слоя сразу делает его активным (синим)', () => {
  resetWH(4, 4); layers.mount(); document.getElementById('lay-pop').classList.add('on'); lops.doAddLayer(); layList(); // S.cur = 1
  const row0 = [...document.querySelectorAll('#lay-list .lrow')].find((r) => r.dataset.li === '0');
  assert.equal(S.cur, 1);
  row0.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
  assert.equal(S.cur, 0); assert.ok(row0.classList.contains('on')); // взятый ЛКМ слой стал активным
  row0.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 10, clientY: 10 }));
});
t('layers-ui: ПКМ-протяжка выбирает несколько слоёв', () => {
  resetWH(4, 4); layers.mount(); document.getElementById('lay-pop').classList.add('on'); lops.doAddLayer(); lops.doAddLayer(); layList(); // слои 0,1,2
  const rows = [...document.querySelectorAll('#lay-list .lrow')];
  const r0 = rows.find((r) => r.dataset.li === '0'), r1 = rows.find((r) => r.dataset.li === '1');
  const prevPoint = document.elementFromPoint; document.elementFromPoint = () => r1;
  try {
    r0.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 2, clientX: 10, clientY: 50 }));
    r0.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, button: 2, clientX: 10, clientY: 20 }));
    r0.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, button: 2, clientX: 10, clientY: 20 }));
    const sel = new Set([S.cur, ...S.marked]);
    assert.ok(sel.has(0) && sel.has(1)); // оба слоя попали в выборку протяжкой ПКМ
  } finally { document.elementFromPoint = prevPoint; S.marked = new Set(); }
});
t('layers-ui: ПКМ-протяжка цепляет и строки эффектов', () => {
  resetWH(4, 4); layers.mount(); document.getElementById('lay-pop').classList.add('on');
  S.layers[0].effects = [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#ffffff' } }];
  S.fxSel = new Set(); S.fxCur = null; S.marked = new Set(); layList();
  const lrow = document.querySelector('#lay-list .lrow[data-li="0"]'), fxrow = document.querySelector('#lay-list .fxrow');
  const prevPoint = document.elementFromPoint; document.elementFromPoint = () => fxrow;
  try {
    lrow.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 2, clientX: 10, clientY: 50 }));
    lrow.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, button: 2, clientX: 10, clientY: 20 }));
    lrow.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, button: 2, clientX: 10, clientY: 20 }));
    assert.ok(S.fxSel.has(S.layers[0].effects[0])); // эффект попал в выборку протяжкой
    assert.equal(S.cur, 0); // слой под началом протяжки тоже выбран
  } finally { document.elementFromPoint = prevPoint; S.marked = new Set(); S.fxSel = new Set(); S.fxCur = null; S.layers[0].effects = []; }
});
t('layers-ui: тап по имени активного слоя — переименование, по неактивному — выбор', () => {
  resetWH(4, 4); layers.mount(); document.getElementById('lay-pop').classList.add('on'); lops.doAddLayer(); layList(); // S.cur = 1
  const tap = (el) => { for (const type of ['pointerdown', 'pointerup', 'click']) el.dispatchEvent(new window.MouseEvent(type, { bubbles: true, button: 0, clientX: 5, clientY: 5 })); };
  const nm0 = () => [...document.querySelectorAll('#lay-list .lrow')].find((r) => r.dataset.li === '0').querySelector('.lname');
  tap(nm0()); // слой 0 был неактивен → тап выбирает его, не переименовывает
  assert.equal(S.cur, 0); assert.ok(!nm0().classList.contains('editing'));
  tap(nm0()); // теперь активен → тап по имени переименовывает
  assert.ok(nm0().classList.contains('editing'));
  nm0().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
});
t('effects: быстрый двойной тап открывает окно правки эффекта', () => {
  resetWH(8, 8); layers.mount(); document.getElementById('lay-pop').classList.add('on'); effects.mount();
  const eff = newEffect('stroke', { size: 1, color: '#112233' }); S.layers[0].effects = [eff]; S.fxSel = new Set(); S.fxCur = null; layList();
  document.getElementById('fx-edit').classList.remove('on');
  const row = document.querySelector('#lay-list .fxrow');
  row.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 5, clientY: 5 }));
  row.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 5, clientY: 5 })); // быстрый двойной тап
  assert.ok(document.getElementById('fx-edit').classList.contains('on'));
  document.getElementById('fx-cancel').click(); S.layers[0].effects = []; S.fxSel.clear(); S.fxCur = null; // закрыть правку чисто, не оставляя сессию
});
await ta('effects: единый dragRow переставляет эффект через зазор', async () => {
  resetWH(8, 8); layers.mount(); document.getElementById('lay-pop').classList.add('on');
  const A = { id: 31, type: 'stroke', visible: true, params: { size: 1, color: '#f00' } };
  const B = { id: 32, type: 'glow', visible: true, params: { size: 4, intensity: 0.8, color: '#0f0' } };
  S.layers[0].effects = [A, B]; S.fxSel = new Set(); S.fxCur = null; layList();
  const fxrows = [...document.querySelectorAll('#lay-list .fxrow')];
  const rowB = fxrows.find((r) => r.__eff === B), rowA = fxrows.find((r) => r.__eff === A);
  const pop = document.getElementById('lay-pop'), prevPoint = document.elementFromPoint;
  Object.defineProperty(pop, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 0, top: 0, right: 200, bottom: 400 }) });
  Object.defineProperty(rowB, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 0, top: 0, right: 200, bottom: 30, width: 200, height: 30 }) });
  document.elementFromPoint = () => rowB;
  try {
    rowA.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 50, clientY: 60 }));
    rowA.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, button: 0, clientX: 50, clientY: 8 })); // вертикальный драг A над B
    rowA.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 50, clientY: 8 }));
    assert.deepEqual(S.layers[0].effects, [B, A]); // A переставлен наверх стека тем же механизмом, что и слои
  } finally {
    document.elementFromPoint = prevPoint; delete pop.getBoundingClientRect;
    S.layers[0].effects = []; S.fxSel.clear(); S.fxCur = null;
    await new Promise((r) => setTimeout(r, 320));
  }
});

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
t('delete: после удаления эффекта активным становится эффект над ним', () => { resetWH(8, 8); effects.mount();
  const a = newEffect('stroke', {}), b = newEffect('glow', {}), c = newEffect('stroke', {});
  S.layers[0].effects = [a, b, c]; S.cur = 0; S.fxSel = new Set([b]); S.fxCur = b; // выбран средний (верх стека = c)
  actions.run('fx.delete'); assert.equal(S.fxCur, c); // активным стал эффект над удалённым
  S.layers[0].effects = []; S.fxSel = new Set(); S.fxCur = null; });
t('delete: Delete удаляет активный слой из списка (не чистит), фон не удаляет', () => { resetWH(8, 8); lops.doAddLayer();
  S.cur = 1; S.marked = new Set(); S.selFolder = null; S.fxCur = null; S.fxSel = new Set(); S.sel = S.selMask = null; S.bgSel = false;
  const before = S.layers.length; actions.run('edit.delete'); // Delete без выделения → удалить активный слой
  assert.equal(S.layers.length, before - 1); // слой удалён из списка, а не очищен
  S.bgSel = true; const keep = S.layers.length; actions.run('edit.delete'); // фон активен → ничего не удаляется
  assert.equal(S.layers.length, keep); S.bgSel = false; });
t('delete: Delete с выделением пикселей стирает выделение, слой остаётся', () => { resetWH(8, 8); lops.doAddLayer();
  S.cur = 1; S.layers[1].grid[2][2] = [5, 5, 5, 255]; S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = null; S.bgSel = false; cache.dirtyAll();
  const before = S.layers.length; actions.run('edit.delete');
  assert.equal(S.layers.length, before); assert.equal(S.layers[1].grid[2][2], null); // слой цел, пиксель в выделении стёрт
  S.sel = null; });

t('effects: list рисует строку эффекта под слоем', () => { resetWH(8, 8); S.layers[0].effects = [{ id: 7, type: 'glow', visible: true, params: { ...({ size: 6, intensity: 0.8, color: '#78d7ff' }) } }];
  document.getElementById('lay-pop').classList.add('on'); layList(); assert.ok(document.querySelectorAll('#lay-list .fxrow').length >= 1); S.layers[0].effects = []; });
t('effects: adjustment-строка использует иконку полукруга', () => { resetWH(8, 8);
  S.layers[0].effects = [newEffect('adjustment')]; document.getElementById('lay-pop').classList.add('on'); layList();
  const row = document.querySelector('#lay-list .fxrow'); assert.ok(row.querySelector('.fxstar circle')); assert.equal(row.querySelector('.lname').textContent, 'Настройки');
  S.layers[0].effects = []; });

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
t('эффект+палитра: клик по цвету палитры при открытом пикере эффекта красит и эффект, и активный, и круг', () => { cp.mount(); effects.mount(); pal.mount();
  resetWH(8, 8); S.palette = [[10, 20, 30], [200, 100, 50]]; S.active = [10, 20, 30]; pal.buildPalette();
  document.querySelector('#fx-types button[data-fx="stroke"]').click(); const eff = S.fxDraft.eff;
  document.getElementById('fx-colsw').onclick(); assert.ok(document.getElementById('colpop').classList.contains('on')); // пикер эффекта открыт
  const sw = [...document.querySelectorAll('#pal .sw:not(.plus)')];
  sw[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // клик по [200,100,50] в палитре
  assert.deepEqual(S.active, [200, 100, 50]); // стал активным
  assert.equal(eff.params.color.toLowerCase(), '#c86432'); // покрасил эффект
  assert.equal(+document.getElementById('col-h').value, 20); // круг сместился на тон активного цвета
  document.getElementById('fx-cancel').click(); });

t('crop: toggle из выделения + apply кадрирует без fit-to-screen', () => { resetWH(8, 8); S.view = { zoom: 5, ox: 11, oy: 13 };
  const sw = S.W * S.view.zoom, sh = S.H * S.view.zoom, cx = S.view.ox + sw / 2, cy = S.view.oy + sh / 2;
  S.sel = { x0: 1, y0: 1, x1: 4, y1: 4 }; S.selMask = null;
  crop.toggleCrop(); assert.ok(S.cropMode); crop.applyCrop(); assert.equal(S.W, 4); assert.equal(S.H, 4);
  assert.equal(S.W * S.view.zoom, sw); assert.equal(S.H * S.view.zoom, sh);
  assert.equal(S.view.ox + S.W * S.view.zoom / 2, cx); assert.equal(S.view.oy + S.H * S.view.zoom / 2, cy); });

t('crop: поля размера и скрепка меняют рамку', () => { crop.mount(); resetWH(8, 8); crop.toggleCrop();
  const cw = document.getElementById('crop-w'), ch = document.getElementById('crop-h'), link = document.getElementById('crop-link');
  cw.value = '4'; cw.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(S.cropMode.x1 - S.cropMode.x0 + 1, 4); assert.equal(S.cropMode.y1 - S.cropMode.y0 + 1, 8);
  link.click(); ch.value = '6'; ch.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(S.cropMode.x1 - S.cropMode.x0 + 1, 3); assert.equal(S.cropMode.y1 - S.cropMode.y0 + 1, 6);
  crop.cancelCrop(); });

t('crop: режим клеток задаёт размер ровно по Grid даже в tile-контексте', () => { crop.mount(); resetWH(40, 40); S.grid.w = 5; S.grid.h = 7; S.tileset = { on: true }; S.tileGrid ||= {}; S.tileGrid.size = 16; crop.toggleCrop();
  const units = document.getElementById('crop-units'), link = document.getElementById('crop-link');
  if (link.classList.contains('on')) link.click();
  if (!units.classList.contains('on')) units.click(); // переключить в клетки
  const cw = document.getElementById('crop-w'), ch = document.getElementById('crop-h');
  cw.value = '5'; cw.dispatchEvent(new window.Event('input', { bubbles: true }));
  ch.value = '7'; ch.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(S.cropMode.x1 - S.cropMode.x0 + 1, 25); // 5 клеток × 5 px
  assert.equal(S.cropMode.y1 - S.cropMode.y0 + 1, 49); // 7 клеток × 7 px
  units.click();
  assert.equal(S.cropMode.x1 - S.cropMode.x0 + 1, 40); // отключение Cells убирает cell-preview
  assert.equal(S.cropMode.y1 - S.cropMode.y0 + 1, 40);
  S.tileset.on = false; crop.cancelCrop(); });

t('crop: скрепка держит пропорцию в Cells', () => { crop.mount(); resetWH(40, 40); S.grid.w = 5; S.grid.h = 5; crop.toggleCrop();
  const units = document.getElementById('crop-units'), link = document.getElementById('crop-link');
  if (!units.classList.contains('on')) units.click();
  if (!link.classList.contains('on')) link.click();
  const cw = document.getElementById('crop-w'), ch = document.getElementById('crop-h');
  cw.value = '4'; cw.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(S.cropMode.x1 - S.cropMode.x0 + 1, 20);
  assert.equal(S.cropMode.y1 - S.cropMode.y0 + 1, 20);
  assert.equal(ch.value, '4');
  ch.value = '6'; ch.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(S.cropMode.x1 - S.cropMode.x0 + 1, 30);
  assert.equal(S.cropMode.y1 - S.cropMode.y0 + 1, 30);
  assert.equal(cw.value, '6');
  crop.cancelCrop(); });

t('crop: Trim в Canvas size только выставляет рамку до Apply', () => { crop.mount(); resetWH(6, 6); S.layers[0].grid[2][3] = [9, 9, 9, 255]; crop.toggleCrop();
  const units = document.getElementById('crop-units'); if (units.classList.contains('on')) units.click();
  document.getElementById('crop-trim').click();
  assert.equal(document.getElementById('crop-trim').classList.contains('on'), true);
  assert.equal(S.W, 6); assert.equal(S.H, 6); assert.deepEqual({ x0: S.cropMode.x0, y0: S.cropMode.y0, x1: S.cropMode.x1, y1: S.cropMode.y1 }, { x0: 3, y0: 2, x1: 3, y1: 2 });
  crop.applyCrop(); assert.equal(S.W, 1); assert.equal(S.H, 1); assert.deepEqual(S.layers[0].grid[0][0], [9, 9, 9, 255]);
});

t('crop: Grid переключает видимость, а Cells берёт размер из общей сетки', () => { crop.mount(); resetWH(20, 20); S.grid.w = 4; S.grid.h = 4; S.grid.visible = false; crop.toggleCrop();
  document.getElementById('crop-grid').click();
  assert.equal(S.grid.visible, false);
  assert.equal(document.getElementById('crop-grid').classList.contains('on'), false);
  document.getElementById('crop-grid-visible').checked = true;
  document.getElementById('crop-grid-visible').dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(S.grid.visible, true);
  assert.equal(document.getElementById('crop-grid').classList.contains('on'), false);
  document.getElementById('crop-units').click(); document.getElementById('crop-w').value = '3'; document.getElementById('crop-w').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(S.cropMode.x1 - S.cropMode.x0 + 1, 12);
  S.layers[0].grid[7][11] = [1, 2, 3, 255];
  document.getElementById('crop-trim').click();
  assert.equal(document.getElementById('crop-units').classList.contains('on'), false);
  assert.deepEqual({ x0: S.cropMode.x0, y0: S.cropMode.y0, x1: S.cropMode.x1, y1: S.cropMode.y1 }, { x0: 11, y0: 7, x1: 11, y1: 7 });
  crop.cancelCrop(); });

t('crop: поля размера считают выражения от текущего значения', () => { crop.mount(); resetWH(8, 8); crop.toggleCrop();
  const cw = document.getElementById('crop-w'), ch = document.getElementById('crop-h'), link = document.getElementById('crop-link');
  if (link.classList.contains('on')) link.click();
  cw.value = '+2'; cw.dispatchEvent(new window.Event('blur'));
  assert.equal(S.cropMode.x1 - S.cropMode.x0 + 1, 10);
  ch.value = '/2'; ch.dispatchEvent(new window.Event('blur'));
  assert.equal(S.cropMode.y1 - S.cropMode.y0 + 1, 4);
  crop.cancelCrop(); });

t('crop: ЛКМ внутри двигает изображение, ПКМ внутри двигает рамку', () => { resetWH(8, 8); S.view = { zoom: 10, ox: 0, oy: 0 }; crop.toggleCrop();
  input.down({ pointerType: 'mouse', button: 0, clientX: 25, clientY: 25, pointerId: 1 });
  input.move({ pointerType: 'mouse', button: 0, clientX: 35, clientY: 25, pointerId: 1 }); input.up({ pointerType: 'mouse', button: 0, pointerId: 1 });
  assert.equal(S.cropMode.idx, 1); assert.equal(S.cropMode.x0, 0);
  input.down({ pointerType: 'mouse', button: 2, clientX: 25, clientY: 25, pointerId: 2 });
  input.move({ pointerType: 'mouse', button: 2, clientX: 35, clientY: 25, pointerId: 2 }); input.up({ pointerType: 'mouse', button: 2, pointerId: 2 });
  assert.equal(S.cropMode.idx, 1); assert.equal(S.cropMode.x0, 1); crop.cancelCrop(); });

t('crop: скрепка держит пропорцию при растягивании ручкой', () => { resetWH(8, 8); S.view = { zoom: 10, ox: 0, oy: 0 }; crop.toggleCrop();
  const link = document.getElementById('crop-link'); if (!link.classList.contains('on')) link.click();
  input.down({ pointerType: 'mouse', button: 0, clientX: 80, clientY: 40, pointerId: 1 });
  input.move({ pointerType: 'mouse', button: 0, clientX: 100, clientY: 40, pointerId: 1 }); input.up({ pointerType: 'mouse', button: 0, pointerId: 1 });
  assert.equal(S.cropMode.x1 - S.cropMode.x0 + 1, 10); assert.equal(S.cropMode.y1 - S.cropMode.y0 + 1, 10); crop.cancelCrop(); });

t('status: при кропе/выделении/трансформе показывает размер рамки рядом с холстом', () => { resetWH(8, 8); S.view.zoom = 12; status.mount();
  bus.emit('layers'); assert.equal(document.getElementById('status').textContent, '8×8 px');
  assert.equal(document.getElementById('zoom-status').textContent, '1200%');
  S.view.zoom = 1.25; bus.emit('overlay', {});
  assert.equal(document.getElementById('zoom-status').textContent, '125%');
  S.cropMode = { x0: 2, y0: 1, x1: 5, y1: 5, idx: 0, idy: 0 }; bus.emit('render');
  assert.equal(document.getElementById('status').textContent, '8×8 → 4×5 px');
  S.cropMode = null; S.sel = { x0: 1, y0: 2, x1: 6, y1: 4 }; bus.emit('selection');
  assert.equal(document.getElementById('status').textContent, '8×8 → 6×3 px');
  S.sel = null; S.rotMode = { b: { w: 3, h: 4 }, sx: 2, sy: 0.5 }; bus.emit('render');
  assert.equal(document.getElementById('status').textContent, '8×8 → 6×2 px');
  S.rotMode = null; bus.emit('render'); assert.equal(document.getElementById('status').textContent, '8×8 px'); });

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
t('transform: слой за краем не меняет размер холста', () => { resetWH(4, 4); S.layers[0].grid[0][0] = [7, 7, 7, 255]; cache.dirtyAll();
  tf.enterRotMode(S.layers[0]); S.rotMode.tx = -2; S.rotMode.changed = true; tf.exitRotMode(true);
  assert.equal(S.W, 4); assert.equal(S.H, 4); assert.deepEqual(S.layers[0].ext.get('-2,0'), [7, 7, 7, 255]); });
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
t('transform: выделение на выбранной папке двигает содержимое всех её слоёв', () => { resetWH(6, 6);
  S.layers = [
    { name: 'outside', grid: blank(6, 6), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] },
    { name: 'a', grid: blank(6, 6), opacity: 1, visible: true, fid: 1, clip: false, ext: new Map(), effects: [] },
    { name: 'b', grid: blank(6, 6), opacity: 1, visible: true, fid: 1, clip: false, ext: new Map(), effects: [] },
  ];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }];
  S.layers[1].grid[1][1] = [1, 1, 1, 255]; S.layers[2].grid[1][3] = [2, 2, 2, 255];
  S.cur = 0; S.selFolder = 1; S.markedFolders = new Set([1]); S.marked = new Set(); S.sel = { x0: 0, y0: 0, x1: 4, y1: 2 }; S.selMask = null;
  actions.run('transform.enter');
  assert.ok(S.rotMode && S.rotMode.selection); assert.equal(S.rotMode.sources.length, 2);
  assert.equal(S.sel, null); assert.equal(S.layers[1].grid[1][1], null); assert.equal(S.layers[2].grid[1][3], null);
  S.rotMode.tx = 1; S.rotMode.changed = true; tf.exitRotMode(true);
  assert.deepEqual(S.layers[1].grid[1][2], [1, 1, 1, 255]); assert.deepEqual(S.layers[2].grid[1][4], [2, 2, 2, 255]);
});
t('transform: пустое выделение папки не запускает transform всей папки', () => { resetWH(6, 6);
  S.layers = [
    { name: 'outside', grid: blank(6, 6), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] },
    { name: 'a', grid: blank(6, 6), opacity: 1, visible: true, fid: 1, clip: false, ext: new Map(), effects: [] },
  ];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }];
  S.layers[1].grid[5][5] = [1, 1, 1, 255]; S.cur = 0; S.selFolder = 1; S.markedFolders = new Set([1]); S.sel = { x0: 0, y0: 0, x1: 1, y1: 1 }; S.selMask = null;
  actions.run('transform.enter'); assert.equal(S.rotMode, null); assert.deepEqual(S.sel, { x0: 0, y0: 0, x1: 1, y1: 1 });
});
t('transform: выделение за краем не меняет размер холста', () => { resetWH(4, 4); S.layers[0].grid[0][0] = [9, 9, 9, 255];
  S.sel = { x0: 0, y0: 0, x1: 0, y1: 0 }; S.selMask = null; actions.run('transform.enter');
  S.rotMode.tx = -1; S.rotMode.changed = true; tf.exitRotMode(true);
  assert.equal(S.W, 4); assert.equal(S.H, 4); assert.deepEqual(S.layers[0].ext.get('-1,0'), [9, 9, 9, 255]); });
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

t('transform: превью обновляется при скрытии слоя внутри папки', () => { resetWH(8, 8);
  S.layers = [
    { name: 'red', grid: blank(8, 8), opacity: 1, visible: true, fid: 1, clip: false, ext: new Map(), effects: [] },
    { name: 'blue', grid: blank(8, 8), opacity: 1, visible: true, fid: 1, clip: false, ext: new Map(), effects: [] },
  ]; S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }];
  S.layers[0].grid[1][1] = [200, 0, 0, 255]; S.layers[1].grid[2][2] = [0, 80, 220, 255];
  S.selFolder = 1; S.markedFolders = new Set([1]); cache.dirtyAll();
  actions.run('transform.enter'); assert.equal(S.rotPrev.idx, 1); assert.ok(S.rotPrev.canvas);
  S.layers[0].visible = false; bus.emit('visibility');
  assert.equal(S.rotPrev.idx, 1); assert.ok(S.rotPrev.canvas);
  S.layers[0].visible = true; S.layers[1].visible = false; bus.emit('visibility');
  assert.equal(S.rotPrev.idx, 0); assert.ok(S.rotPrev.canvas);
  S.layers[0].visible = false; bus.emit('visibility');
  assert.equal(S.rotPrev.canvas, null);
  tf.exitRotMode(false); });

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
t('layers-ui: меню слоя не дублирует кнопки панели', () => { resetWH(8, 8); layers.mount(); effects.mount(); fxShared.setFxClip([]);
  document.getElementById('lay-pop').classList.add('on'); layList();
  const row = document.querySelector('#lay-list .lrow[data-li="0"]');
  row.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientY: 120 }));
  const hidden = ['lctx-ren', 'lctx-dup', 'lctx-select', 'lctx-fill', 'lctx-clear', 'lctx-symm', 'lctx-rotate', 'lctx-clip', 'lctx-lock', 'lctx-alpha', 'lctx-ref', 'lctx-del', 'lctx-mono', 'lctx-bc'];
  for (const id of hidden) assert.equal(document.getElementById(id).style.display, 'none', id);
  assert.notEqual(document.getElementById('lctx-tile').style.display, 'none');
  assert.equal(document.getElementById('lctx-invert').disabled, true);
  assert.equal(document.getElementById('lctx-copy-fx').disabled, true);
  assert.equal(document.getElementById('lctx-paste-fx').disabled, true);
  S.sel = { x0: 0, y0: 0, x1: 1, y1: 1 }; S.layers[0].effects = [newEffect('adjustment', { brightness: 10 })]; fxShared.setFxClip([newEffect('stroke')]);
  row.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientY: 120 }));
  assert.equal(document.getElementById('lctx-invert').disabled, false);
  assert.equal(document.getElementById('lctx-copy-fx').disabled, false);
  assert.equal(document.getElementById('lctx-paste-fx').disabled, false);
  assert.equal(i18n.t('menu.convertTile'), 'Convert to Tilemap');
  fxShared.setFxClip([]);
});
t('layers-ui: окно слоёв растягивается за левый край независимо от строк', () => {
  const pop = document.getElementById('lay-pop'), edge = pop.querySelector('.fw-rsz-w');
  assert.ok(edge);
  pop.style.left = '100px'; pop.style.top = '100px'; pop.style.width = '272px'; pop.style.height = '220px';
  pop.getBoundingClientRect = () => {
    const left = parseFloat(pop.style.left) || 0, top = parseFloat(pop.style.top) || 0;
    const width = parseFloat(pop.style.width) || 0, height = parseFloat(pop.style.height) || 0;
    return { left, top, width, height, right: left + width, bottom: top + height };
  };
  edge.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 120 }));
  edge.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 60, clientY: 120 }));
  edge.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 60, clientY: 120 }));
  assert.equal(pop.style.left, '60px'); assert.equal(pop.style.width, '312px'); assert.equal(document.getElementById('lay-list').style.maxHeight, 'none');
});
t('layers-ui: папка показывает количество слоёв, пустая без счётчика', () => { resetWH(4, 4); const mk = (name, fid) => ({ name, fid, grid: blank(4, 4), opacity: 1, visible: true, clip: false, ext: new Map(), effects: [] });
  S.layers = [mk('a', 1), mk('b', 1), mk('top', null)];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }, { id: 2, name: 'Empty', open: true, visible: true, parent: null, effects: [] }];
  layList();
  const full = document.querySelector('#lay-list .frow[data-fid="1"]'), empty = document.querySelector('#lay-list .frow[data-fid="2"]');
  assert.equal(full.querySelector('.fcount').textContent, '2'); assert.equal(empty.querySelector('.fcount'), null); // '· ' — в CSS (.fcount::before)
  assert.ok(S.folders.some((f) => f.id === 2));
});
t('layers-ui: бары действий слоя и команды слоя', () => { resetWH(8, 8); document.getElementById('lay-pop').classList.add('on'); layList();
  const top = [...document.querySelectorAll('#lay-act-top > button')], bot = [...document.querySelectorAll('#lay-act-bottom > button')];
  assert.deepEqual(top.map((b) => b.id), ['lay-add', 'lay-tmap', 'fx-btn', 'img-settings', 'lay-group', 'lay-alpha', 'lay-clip', 'lay-ref', 'lay-clean']); // эффекты и настройки переехали сюда из тулбара
  assert.deepEqual(bot.map((b) => b.id), ['lay-dup', 'lay-symm', 'lay-merge', 'lay-select', 'lay-lock', 'lay-del']);
  assert.equal(document.querySelector('#lay-head #lay-add'), null);
  assert.equal(document.querySelectorAll('.lay-action-btn').length, 15);
  S.layers[0].grid[0][0] = [9, 9, 9, 255]; document.getElementById('lay-symm').click(); assert.deepEqual(S.layers[0].grid[0][7], [9, 9, 9, 255]);
  document.getElementById('lay-alpha').click(); document.getElementById('lay-clip').click(); document.getElementById('lay-ref').click(); layList();
  assert.ok(document.getElementById('lay-alpha').classList.contains('on')); assert.ok(document.getElementById('lay-clip').classList.contains('on')); assert.ok(document.getElementById('lay-ref').classList.contains('on'));
  document.getElementById('lay-clean').click(); assert.equal(S.layers[0].grid[0][0], null);
  document.getElementById('lay-lock').click(); assert.equal(S.layers[0].lock, true); assert.ok(document.getElementById('lay-lock').classList.contains('on'));
  document.getElementById('lay-dup').click(); assert.equal(S.layers.length, 2); assert.equal(S.cur, 1);
  document.getElementById('lay-del').click(); assert.equal(S.layers.length, 1); });
await ta('panels: старый порядок тулбара не утаскивает эффекты/настройки из панели слоёв', async () => {
  const panels = await import('../src/systems/panels.js');
  localStorage.setItem('panelOrder', JSON.stringify({ 'tb-left': ['fx-btn', 't-pencil'], 'tb-right': [], sidebar: ['img-settings', 'bc', 'layers', 'activewrap'] }));
  panels.mount();
  assert.ok(document.getElementById('fx-btn').closest('#lay-act-top')); // эффекты остались в баре слоёв
  assert.ok(document.getElementById('img-settings').closest('#lay-act-top')); // настройки остались в баре слоёв
  assert.equal(document.querySelector('#tb-left #fx-btn'), null); // не вернулись на тулбар
  assert.equal(document.getElementById('t-pencil').parentElement.id, 'sidebar');
  assert.equal(document.getElementById('layers').parentElement.id, 'tb-right');
  assert.equal(document.getElementById('activewrap').parentElement.id, 'tb-right');
  localStorage.removeItem('panelOrder');
});
t('layers-ui: можно удалить все слои — остаётся фон и становится активным', () => { resetWH(8, 8);
  lops.deleteLayerRef(S.layers[0]); assert.equal(S.layers.length, 0); assert.equal(S.bgSel, true); // удалили последний → активен фон
  lops.doAddLayer(); assert.equal(S.layers.length, 1); assert.equal(S.cur, 0); assert.equal(S.bgSel, false); // новый слой снимает выбор фона
  S.bgSel = true; doc.ensureLayer(); assert.equal(S.bgSel, false); }); // рисование (ensureLayer) делает активным слой, а не фон
t('layers-ui: reference-кнопка синяя на выбранном reference-слое', () => { resetWH(8, 8); document.getElementById('lay-pop').classList.add('on');
  S.layers[0].reference = true; layList();
  assert.ok(document.getElementById('lay-ref').classList.contains('on')); assert.equal(document.querySelectorAll('#lay-list .lref').length, 1);
  document.querySelector('#lay-list .lref').click(); layList();
  assert.equal(S.layers[0].reference, false); assert.ok(!document.getElementById('lay-ref').classList.contains('on')); });
t('layers-ui: Ctrl-клик выбирает слои поштучно (тумблер)', () => { resetWH(8, 8); lops.doAddLayer(); lops.doAddLayer();
  S.cur = 0; S.marked = new Set(); document.getElementById('lay-pop').classList.add('on'); layList();
  const rowFor = (li) => [...document.querySelectorAll('#lay-list .lrow[data-li]')].find((r) => +r.dataset.li === li);
  rowFor(2).dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  assert.equal(S.cur, 2); assert.deepEqual([...S.marked].sort((a, b) => a - b), [0]); // 2 — активный, 0 в наборе; слой 1 НЕ выбран (не диапазон)
  rowFor(2).dispatchEvent(new window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
  assert.equal(S.cur, 0); assert.deepEqual([...S.marked].sort((a, b) => a - b), []); }); // повторный ctrl снимает активный, повышая оставшийся
t('layers-ui: Shift-клик выделяет диапазон до активного слоя', () => { resetWH(8, 8); lops.doAddLayer(); lops.doAddLayer();
  S.cur = 0; S.marked = new Set(); document.getElementById('lay-pop').classList.add('on'); layList();
  const target = [...document.querySelectorAll('#lay-list .lrow[data-li]')].find((r) => +r.dataset.li === 2);
  target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true }));
  assert.equal(S.cur, 0); assert.deepEqual([...S.marked].sort((a, b) => a - b), [1, 2]); });
t('layers-ui: Shift-клик берёт диапазон по видимому порядку строк (с папкой)', () => { resetWH(8, 8); lops.doAddLayer(); lops.doAddLayer();
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }]; S.layers[0].fid = 1; S.layers[2].fid = 1; // папка тасует видимый порядок относительно индексов массива
  S.marked = new Set(); document.getElementById('lay-pop').classList.add('on'); layList();
  const ord = [...document.querySelectorAll('#lay-list .lrow[data-li]')].map((r) => +r.dataset.li); // видимый порядок строк-слоёв
  S.cur = ord[0]; layList(); // активный — верхняя видимая строка
  [...document.querySelectorAll('#lay-list .lrow[data-li]')].find((r) => +r.dataset.li === ord[ord.length - 1])
    .dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true })); // shift по нижней строке
  assert.deepEqual([...S.marked].sort((a, b) => a - b), ord.filter((li) => li !== ord[0]).sort((a, b) => a - b)); // выделены все строки между верхом и низом
  S.layers[0].fid = null; S.layers[2].fid = null; S.folders = []; });
t('layers-ui: Shift-клик берёт диапазон всех типов строк (слой/папка/эффект), кроме фона', () => { resetWH(8, 8); lops.doAddLayer();
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [{ id: 'fe', type: 'stroke', visible: true, params: { size: 1, color: '#fff' } }] }];
  S.layers[0].fid = 1; S.layers[0].effects = [{ id: 'le', type: 'glow', visible: true, params: {} }];
  S.cur = 0; S.marked = new Set(); S.markedFolders = new Set(); S.fxSel = new Set(); S.fxCur = null; S.selFolder = null; S.bgSel = false;
  document.getElementById('lay-pop').classList.add('on'); layList();
  const first = [...document.querySelectorAll('#lay-list .lrow, #lay-list .fxrow')][0]; // верхняя строка — сделать её активной (любого типа)
  if (first.dataset.li != null) { S.cur = +first.dataset.li; }
  else if (first.dataset.fid != null) { S.selFolder = +first.dataset.fid; S.fxCur = null; }
  else { S.fxCur = first.__eff; S.fxSel = new Set([first.__eff]); }
  layList();
  const r2 = [...document.querySelectorAll('#lay-list .lrow, #lay-list .fxrow')];
  r2[r2.length - 1].dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true })); // shift по нижней строке
  [...document.querySelectorAll('#lay-list .lrow, #lay-list .fxrow')].forEach((r) => assert.ok(r.classList.contains('on') || r.classList.contains('marked'))); // все строки между верхом и низом выбраны
  const bg = document.querySelector('#lay-list .bgrow'); assert.ok(!bg.classList.contains('on') && !bg.classList.contains('marked')); // фон не попал в выбор
  S.layers[0].fid = null; S.layers[0].effects = []; S.folders = []; S.markedFolders = new Set(); S.fxSel = new Set(); S.fxCur = null; S.selFolder = null; });
t('layers-ui: активный фон не объединяется с другими (shift = одиночный выбор)', () => { resetWH(8, 8); lops.doAddLayer(); lops.doAddLayer();
  document.getElementById('lay-pop').classList.add('on'); S.bgSel = true; S.cur = 0; S.marked = new Set(); layList(); // активен фон
  [...document.querySelectorAll('#lay-list .lrow[data-li]')].find((r) => +r.dataset.li === 2)
    .dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true })); // shift по слою при активном фоне
  assert.equal(S.bgSel, false); assert.equal(S.cur, 2); assert.equal(S.marked.size, 0); }); // фон сброшен, выбран только кликнутый слой
t('layers-ui: цвет можно бросить прямо на слой', () => { resetWH(4, 4); lops.doAddLayer(); document.getElementById('lay-pop').classList.add('on'); layList();
  const row = [...document.querySelectorAll('#lay-list .lrow[data-li]')].find((r) => +r.dataset.li === 1);
  const prev = document.elementFromPoint; document.elementFromPoint = () => row;
  try {
    assert.equal(actions.run('layer.dropColorAt', [9, 8, 7], 12, 12), true);
  } finally { document.elementFromPoint = prev; }
  assert.deepEqual(S.layers[1].grid[0][0], [9, 8, 7, 255]); assert.equal(S.layers[0].grid[0][0], null);
  assert.ok([...document.querySelectorAll('#col-hist button')].some((b) => b.title === '#090807'));
});
t('layers-ui: цвет на заполненный слой перекрашивает только содержимое', () => { resetWH(4, 4); document.getElementById('lay-pop').classList.add('on');
  S.layers[0].grid[1][1] = [1, 2, 3, 128]; S.layers[0].ext = new Map([['-1,0', [4, 5, 6, 200]]]); layList();
  const row = [...document.querySelectorAll('#lay-list .lrow[data-li]')].find((r) => +r.dataset.li === 0);
  const prev = document.elementFromPoint; document.elementFromPoint = () => row;
  try {
    assert.equal(actions.run('layer.dropColorAt', [9, 8, 7], 12, 12), true);
  } finally { document.elementFromPoint = prev; }
  assert.deepEqual(S.layers[0].grid[1][1], [9, 8, 7, 128]); assert.equal(S.layers[0].grid[0][0], null);
  assert.deepEqual(S.layers[0].ext.get('-1,0'), [9, 8, 7, 200]);
});
t('layers-ui: цвет можно бросить на строку эффекта', () => { resetWH(4, 4); document.getElementById('lay-pop').classList.add('on');
  S.layers[0].effects = [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#ffffff' } }]; layList();
  const row = document.querySelector('#lay-list .fxrow');
  const prev = document.elementFromPoint; document.elementFromPoint = () => row;
  try {
    assert.equal(actions.run('layer.dropColorAt', [12, 34, 56], 10, 10), true);
  } finally { document.elementFromPoint = prev; }
  assert.equal(S.layers[0].effects[0].params.color, '#0c2238'); assert.equal(S.fxCur, S.layers[0].effects[0]);
  assert.ok(S.fxSel.has(S.layers[0].effects[0]));
});
t('layers-ui: add/merge меняют число слоёв', () => { resetWH(8, 8); const b = S.layers.length; lops.doAddLayer(); assert.equal(S.layers.length, b + 1);
  S.marked = new Set([0, 1]); lops.doMerge(); assert.equal(S.layers.length, b); });
t('layers-ui: merge запекает clipping mask и эффекты слоя', () => { resetWH(5, 5);
  const base = { name: 'base', grid: blank(5, 5), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#ffffff' } }] };
  const top = { name: 'clip', grid: blank(5, 5), opacity: 1, visible: true, fid: null, clip: true, ext: new Map(), effects: [] };
  base.grid[2][2] = [10, 20, 30, 255]; top.grid[2][2] = [120, 90, 200, 255]; top.grid[0][0] = [120, 90, 200, 255];
  S.layers = [base, top]; S.cur = 1; S.marked = new Set(); cache.dirtyAll(); lops.doMerge();
  assert.equal(S.layers.length, 1); assert.equal(S.layers[0].clip, false); assert.equal(S.layers[0].effects.length, 0);
  assert.deepEqual(S.layers[0].grid[2][2], [120, 90, 200, 255]); assert.equal(S.layers[0].grid[0][0], null);
  assert.deepEqual(S.layers[0].grid[1][2], [255, 255, 255, 255]); });
t('layers-ui: merge берёт папку и имя с верхнего слоя', () => { resetWH(4, 4);
  const mk = (name, fid = null) => ({ name, grid: blank(4, 4), opacity: 1, visible: true, fid, clip: false, ext: new Map(), effects: [] });
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }];
  S.layers = [mk('outside'), mk('inside', 1)]; S.layers[0].grid[0][0] = [1, 1, 1, 255]; S.layers[1].grid[1][1] = [2, 2, 2, 255];
  S.cur = 1; S.marked = new Set(); cache.dirtyAll(); lops.doMerge();
  assert.equal(S.layers.length, 1); assert.equal(S.layers[0].name, 'inside'); assert.equal(S.layers[0].fid, 1);
  assert.deepEqual(S.layers[0].grid[0][0], [1, 1, 1, 255]); assert.deepEqual(S.layers[0].grid[1][1], [2, 2, 2, 255]); });
t('layers-ui: merge папки запекает её слои и эффекты в слой с именем папки', () => { resetWH(5, 5);
  const mk = (name, fid = null) => ({ name, grid: blank(5, 5), opacity: 1, visible: true, fid, clip: false, ext: new Map(), effects: [] });
  S.folders = [{ id: 1, name: 'Group', open: true, visible: true, parent: null, effects: [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#ffffff' } }] }];
  S.layers = [mk('below'), mk('a', 1), mk('b', 1), mk('above')]; S.layers[1].grid[2][2] = [10, 20, 30, 255]; S.layers[2].grid[2][3] = [120, 90, 200, 255];
  S.selFolder = 1; S.markedFolders = new Set([1]); cache.dirtyAll(); lops.doMerge();
  assert.deepEqual(S.layers.map((L) => L.name), ['below', 'Group', 'above']); assert.equal(S.folders.length, 0);
  assert.equal(S.layers[1].fid, null); assert.equal(S.layers[1].effects.length, 0);
  assert.deepEqual(S.layers[1].grid[2][2], [10, 20, 30, 255]); assert.deepEqual(S.layers[1].grid[2][3], [120, 90, 200, 255]);
  assert.deepEqual(S.layers[1].grid[1][2], [255, 255, 255, 255]); });
t('layers-ui: pinch-merge сливает диапазон и оставляет результат наверху', () => { resetWH(4, 4);
  const mk = (name) => ({ name, grid: blank(4, 4), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] });
  S.layers = ['below', 'low', 'middle', 'top', 'above'].map(mk); S.cur = 1;
  S.layers[1].grid[0][0] = [10, 0, 0, 255]; S.layers[2].grid[2][2] = [1, 1, 1, 255]; S.layers[3].grid[1][1] = [0, 0, 10, 255];
  lops.mergeRange(1, 3);
  assert.equal(S.layers.length, 3); assert.equal(S.cur, 1); assert.deepEqual(S.layers.map((L) => L.name), ['below', 'top', 'above']);
  assert.deepEqual(S.layers[1].grid[0][0], [10, 0, 0, 255]); assert.deepEqual(S.layers[1].grid[2][2], [1, 1, 1, 255]); assert.deepEqual(S.layers[1].grid[1][1], [0, 0, 10, 255]); });
t('layers-ui: после удаления активным становится слой над ним (иначе под ним)', () => { resetWH(8, 8); lops.doAddLayer(); lops.doAddLayer();
  S.cur = 1; const above = S.layers[2]; lops.deleteLayerRef(S.layers[1]); assert.equal(S.layers[S.cur], above); // выбрался слой над удалённым
  const below = S.layers[0]; S.cur = S.layers.length - 1; lops.deleteLayerRef(S.layers[S.cur]); assert.equal(S.layers[S.cur], below); }); // верхний удалён — выбрался тот, что под ним
t('layers-ui: удаление неактивного слоя сохраняет активный слой', () => { resetWH(8, 8); lops.doAddLayer(); lops.doAddLayer();
  const active = S.layers[2]; S.cur = 2; lops.deleteLayerRef(S.layers[0]); assert.equal(S.layers[S.cur], active); });
t('layers-ui: пустая папка остаётся на месте после удаления последнего слоя', () => { resetWH(4, 4);
  const mk = (name, fid = null) => ({ name, grid: blank(4, 4), opacity: 1, visible: true, fid, clip: false, ext: new Map(), effects: [] });
  S.layers = [mk('bottom'), mk('inside', 1), mk('top')];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }]; S.cur = 1;
  lops.deleteLayerRef(S.layers[1]); layList();
  const rows = [...document.querySelectorAll('#lay-list .lrow')].map((r) => (r.dataset.fid ? 'folder:' + r.dataset.fid : S.layers[+r.dataset.li].name));
  assert.deepEqual(rows, ['top', 'folder:1', 'bottom']); assert.equal(S.folders[0].emptyPos, 1);
});
t('layers-ui: корзина сохраняет позицию папки после удаления последнего слоя', () => { resetWH(4, 4);
  const mk = (name, fid = null) => ({ name, grid: blank(4, 4), opacity: 1, visible: true, fid, clip: false, ext: new Map(), effects: [] });
  S.layers = [mk('bottom'), mk('inside', 1), mk('top')];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }]; S.cur = 1; S.marked = new Set();
  lops.deleteLayer(); layList();
  const rows = [...document.querySelectorAll('#lay-list .lrow')].map((r) => (r.dataset.fid ? 'folder:' + r.dataset.fid : S.layers[+r.dataset.li].name));
  assert.deepEqual(rows, ['top', 'folder:1', 'bottom']);
});
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
t('layers-ui: имя новой папки берёт минимальный свободный номер', () => { resetWH(8, 8);
  i18n.setLocale('ru'); S.folderSeq = 8;
  const mk = (name) => ({ name, grid: blank(8, 8), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] });
  S.layers = [mk('a'), mk('b')]; S.cur = 0; S.marked = new Set([1]);
  S.folders = [
    { id: 2, name: 'Папка 2', open: true, visible: true, parent: null, effects: [] },
    { id: 4, name: 'Папка 4', open: true, visible: true, parent: null, effects: [] },
  ];
  lops.doGroup(); assert.equal(S.folders[S.folders.length - 1].name, 'Папка 1');
});
t('layers-ui: закрытая папка с активным слоем — мягкая подсветка, активным остаётся слой', () => { resetWH(8, 8);
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }]; S.layers[0].fid = 1; S.cur = 0; S.selFolder = null; S.bgSel = false;
  document.getElementById('lay-pop').classList.add('on'); layList(); document.querySelector('#lay-list .frow .caret').click();
  assert.equal(S.folders[0].open, false); assert.equal(S.selFolder, null); assert.equal(S.cur, 0); // активным остаётся слой, не папка
  const fr = document.querySelector('#lay-list .frow');
  assert.ok(fr.classList.contains('has-active')); assert.ok(!fr.classList.contains('on')); // мягкая голубая подсветка, не яркая
  document.querySelector('#lay-list .frow .caret').click(); // раскрыли — слой виден, подсветка ушла
  assert.ok(!document.querySelector('#lay-list .frow').classList.contains('has-active')); });
t('layers-ui: вложенные закрытые папки — подсвечивается внешняя, при раскрытии следующая', () => { resetWH(8, 8);
  S.folders = [{ id: 1, name: 'A', open: false, visible: true, parent: null, effects: [] }, { id: 2, name: 'B', open: false, visible: true, parent: 1, effects: [] }];
  S.layers[0].fid = 2; S.cur = 0; S.selFolder = null; S.bgSel = false; document.getElementById('lay-pop').classList.add('on'); layList();
  const frA = () => document.querySelector('#lay-list .frow[data-fid="1"]'), frB = () => document.querySelector('#lay-list .frow[data-fid="2"]');
  assert.ok(frA().classList.contains('has-active')); assert.equal(frB(), null); // B спрятана в закрытой A → подсвечена A
  frA().querySelector('.caret').click(); // раскрыли A → видна B (закрытая), слой в ней
  assert.ok(!frA().classList.contains('has-active')); assert.ok(frB().classList.contains('has-active')); });
t('layers-ui: плюс на активной папке создаёт активный верхний слой вне папки', () => { resetWH(8, 8);
  S.folders = [{ id: 1, name: 'G', open: false, visible: true, parent: null, effects: [] }]; S.layers[0].fid = 1; S.selFolder = 1; S.markedFolders = new Set([1]);
  lops.doAddLayer(); assert.equal(S.cur, S.layers.length - 1); assert.equal(S.layers[S.cur].fid, null); assert.equal(S.selFolder, null); });
t('layers-ui: плюс на видимом слое папки создаёт слой в этой папке', () => { resetWH(8, 8);
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }]; S.layers[0].fid = 1; S.cur = 0; S.selFolder = null;
  lops.doAddLayer(); assert.equal(S.cur, 1); assert.equal(S.layers[S.cur].fid, 1); });
t('layers-ui: группа уносит в папку и слои, и папки, и эффекты', () => { resetWH(8, 8);
  const mk = (name, fid = null, effects = []) => ({ name, grid: blank(8, 8), opacity: 1, visible: true, fid, clip: false, ext: new Map(), effects });
  const eff = { id: 9, type: 'stroke', visible: true, params: { size: 1, color: '#fff' } };
  // top-слой с эффектом, отдельный слой 'x', и папка G(1) со слоем 'in'
  S.layers = [mk('in', 1), mk('x'), mk('top', null, [eff])];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [] }]; S.folderSeq = 1;
  // смешанное выделение: слой 'x' (marked) + папка G + эффект слоя top
  S.cur = 1; S.marked = new Set([1]); S.markedFolders = new Set([1]); S.selFolder = 1; S.fxSel = new Set([eff]); S.fxCur = eff;
  lops.doGroup();
  const nf = S.folders.find((f) => f.id !== 1); // новая папка
  assert.ok(nf); assert.equal(nf.parent ?? null, null);
  assert.equal(S.layers.find((L) => L.name === 'x').fid, nf.id); // слой 'x' внутри новой папки
  assert.equal(S.layers.find((L) => L.name === 'top').fid, nf.id); // владелец выделенного эффекта тоже внутри
  assert.equal(S.folders.find((f) => f.id === 1).parent, nf.id); // папка G вложена в новую
  assert.equal(S.layers.find((L) => L.name === 'in').fid, 1); // слой папки G остался в G (которая теперь в новой)
  S.folders = []; S.layers.forEach((L) => { L.fid = null; L.effects = []; }); S.marked = new Set(); S.markedFolders = new Set(); S.selFolder = null; S.fxSel = new Set(); S.fxCur = null;
});
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
t('opacity: прозрачность папки умножается на прозрачность слоя в композите', () => { resetWH(4, 4);
  S.layers = [{ name: 'in', grid: blank(4, 4), opacity: 0.5, visible: true, fid: 1, clip: false, ext: new Map(), effects: [] }];
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [], opacity: 0.5 }];
  S.layers[0].grid[0][0] = [1, 2, 3, 255]; cache.dirtyAll();
  let alpha = null; const mock = { globalAlpha: 1, fillStyle: '', fillRect() {}, drawImage() { alpha = mock.globalAlpha; } };
  cache.compositeLayers(mock);
  assert.ok(Math.abs(alpha - 0.25) < 1e-9); // 0.5 (слой) × 0.5 (папка)
  S.folders = []; S.layers[0].fid = null; S.layers[0].opacity = 1;
});
t('opacity: cloneFx сохраняет прозрачность эффекта', () => {
  const out = cloneFx([{ type: 'glow', visible: true, opacity: 0.3, params: {} }]); assert.ok(Math.abs(out[0].opacity - 0.3) < 1e-9);
});
t('opacity: ползунок правит активную строку (папка/эффект), не слой', () => { resetWH(4, 4); layers.mount(); document.getElementById('lay-pop').classList.add('on');
  S.folders = [{ id: 1, name: 'G', open: true, visible: true, parent: null, effects: [], opacity: 1 }]; S.layers[0].fid = 1;
  S.selFolder = 1; S.markedFolders = new Set([1]); S.fxCur = null; S.fxSel = new Set(); layList();
  const op = document.getElementById('lay-op'); assert.equal(op.value, '100');
  op.value = '40'; op.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.ok(Math.abs(S.folders[0].opacity - 0.4) < 1e-9); assert.equal(S.layers[0].opacity, 1); // изменилась папка, не слой
  const eff = { id: 9, type: 'stroke', visible: true, opacity: 1, params: { size: 1, color: '#fff' } };
  S.layers[0].effects = [eff]; S.selFolder = null; S.markedFolders = new Set(); S.fxCur = eff; S.fxSel = new Set([eff]); layList();
  op.value = '25'; op.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.ok(Math.abs(eff.opacity - 0.25) < 1e-9); // изменился эффект
  S.layers[0].effects = []; S.fxCur = null; S.fxSel = new Set(); S.folders = []; S.layers[0].fid = null;
});
t('tile: рисование заворачивается по модулю холста (рисуй по любому тайлу)', () => { resetWH(4, 4); S.tool = 'pencil'; S.brushes.pencil.size = 1; S.brushes.pencil.op = 1; S.active = [5, 5, 5]; S.stampBrush.pencil = null;
  S.tile.on = true;
  stamp(5, 1); assert.deepEqual(S.layers[0].grid[1][1], [5, 5, 5, 255]); // x=5 → wrap → 1
  stamp(-1, 2); assert.deepEqual(S.layers[0].grid[2][3], [5, 5, 5, 255]); // x=-1 → wrap → 3
  S.tile.on = false; S.layers[0].grid = blank(4, 4); stamp(5, 1);
  assert.equal(S.layers[0].grid[1][1], null); // без tile — за пределами, ничего не пишется
});
t('tile: заливка заворачивается через шов', () => { resetWH(4, 4); S.active = [5, 5, 5];
  for (let y = 0; y < 4; y++) { S.layers[0].grid[y][1] = [9, 9, 9, 255]; S.layers[0].grid[y][2] = [9, 9, 9, 255]; } // барьер по центру, свободны столбцы 0 и 3
  S.tile.on = true; flood(0, 0);
  assert.deepEqual(S.layers[0].grid[0][0], [5, 5, 5]); assert.deepEqual(S.layers[0].grid[0][3], [5, 5, 5]); // оба края связаны через шов
  assert.deepEqual(S.layers[0].grid[0][1], [9, 9, 9, 255]); // барьер цел
  resetWH(4, 4); S.active = [5, 5, 5]; for (let y = 0; y < 4; y++) { S.layers[0].grid[y][1] = [9, 9, 9, 255]; S.layers[0].grid[y][2] = [9, 9, 9, 255]; }
  S.tile.on = false; flood(0, 0);
  assert.deepEqual(S.layers[0].grid[0][0], [5, 5, 5]); assert.equal(S.layers[0].grid[0][3], null); // без tile столбец 3 не залит
});
t('tile: перемещение сдвигает тайл по кругу (тороидально)', () => { resetWH(4, 4);
  S.layers[0].grid[0][3] = [7, 7, 7, 255]; cache.dirtyAll();
  doc.shiftLayerGrid(S.layers[0], 1, 0, true); // вправо на 1 с заворотом: 3 → 0
  assert.deepEqual(S.layers[0].grid[0][0], [7, 7, 7, 255]); assert.equal(S.layers[0].grid[0][3], null);
  assert.equal(S.layers[0].ext.size, 0); // ничего не утекло в ext
  resetWH(4, 4); S.layers[0].grid[0][3] = [7, 7, 7, 255];
  doc.shiftLayerGrid(S.layers[0], 1, 0, false); // без wrap — уезжает в ext
  assert.equal(S.layers[0].grid[0][0], null); assert.ok(S.layers[0].ext.size >= 1);
});
t('tile: выделение рамкой заворачивается через шов', () => { resetWH(4, 4); S.tile.on = true; S.sel = null; S.selMask = null;
  S.layers[0].grid[0][0] = [1, 1, 1, 255]; S.layers[0].grid[0][3] = [2, 2, 2, 255]; cache.dirtyAll();
  const h = toolHandler('select');
  h.down({ gx: 3, gy: 0 }); h.move({ gx: 4, gy: 0 }); h.up({}); // тянем со столбца 3 на соседний тайл (=столбец 0)
  assert.ok(S.selMask && S.selMask.has('3,0') && S.selMask.has('0,0')); // оба края попали в выделение через шов
  S.sel = null; S.selMask = null; S.tile.on = false;
});
t('x-mirror: зажатый X флипает маску кисти, а не дублирует мазок', () => { resetWH(4, 4); S.tool = 'pencil'; S.brushes.pencil.size = 1; S.brushes.pencil.op = 1; S.active = [5, 5, 5]; S.stampBrush.pencil = null;
  S.xMirror = true; stamp(0, 0); // флип симметричной кисти 1×1 не виден и НЕ создаёт зеркальную копию
  assert.deepEqual(S.layers[0].grid[0][0], [5, 5, 5, 255]); assert.equal(S.layers[0].grid[0][3], null);
  S.xMirror = false; S.layers[0].grid = blank(4, 4); stamp(3, 0); // обычный мазок справа — тоже без зеркала слева
  assert.deepEqual(S.layers[0].grid[0][3], [5, 5, 5, 255]); assert.equal(S.layers[0].grid[0][0], null);
});
t('background: paintStack заливает фон под слоями, скрытый — нет', () => { resetWH(4, 4);
  S.bg = { color: [10, 20, 30], visible: true };
  let filled = null; const mock = { globalAlpha: 1, fillStyle: '', fillRect: (x, y, w, h) => { filled = [x, y, w, h, mock.fillStyle]; }, drawImage() {} };
  cache.compositeLayers(mock);
  assert.deepEqual(filled.slice(0, 4), [0, 0, 4, 4]); assert.equal(filled[4], 'rgb(10,20,30)');
  S.bg = { color: [1, 2, 3], visible: false }; let n2 = 0; cache.compositeLayers({ globalAlpha: 1, fillStyle: '', fillRect: () => { n2++; }, drawImage() {} });
  assert.equal(n2, 0); S.bg = { color: null, visible: true };
});
t('background: undo восстанавливает цвет фона', () => { resetWH(4, 4);
  S.bg = { color: [1, 1, 1], visible: true }; history.snapshot(); S.bg.color = [9, 9, 9];
  history.doUndo(); assert.deepEqual(S.bg.color, [1, 1, 1]); S.bg = { color: null, visible: true };
});
t('background: строка фона внизу, выбор/глаз/заливка цветом', () => { resetWH(4, 4); layers.mount(); document.getElementById('lay-pop').classList.add('on');
  S.bg = { color: null, visible: true }; S.bgSel = false; S.xMirror = false; S.tile = { on: false }; layList();
  let bgr = document.querySelector('#lay-list [data-bg]');
  assert.ok(bgr && bgr.classList.contains('bgrow')); assert.equal(document.getElementById('lay-list').lastElementChild, bgr); // в самом низу
  assert.equal(document.querySelectorAll('#lay-list .lrow[data-bg]').length, 0); // фон — не .lrow (не попадает в выборку/drag)
  S.cur = 0; bgr.click(); assert.equal(S.bgSel, true); // выбор фона
  document.querySelector('#lay-list .lrow[data-li]').click(); assert.equal(S.bgSel, false); // клик по слою снимает выбор фона
  bgr = document.querySelector('#lay-list [data-bg]'); const prev = document.elementFromPoint; document.elementFromPoint = () => bgr;
  try { assert.equal(actions.run('layer.dropColorAt', [7, 8, 9], 5, 5), true); } finally { document.elementFromPoint = prev; }
  assert.deepEqual(S.bg.color, [7, 8, 9]); // фон залит брошенным цветом
  document.querySelector('#lay-list [data-bg] .eye').click(); assert.equal(S.bg.visible, false); // глаз скрывает фон
  S.bg = { color: null, visible: true }; S.bgSel = false; S.xMirror = false; S.tile = { on: false };
});
t('настройки: при нескольких слоях/выбранном эффекте идут к активному слою с превью', () => { resetWH(4, 4); bc.mount(); tb.mount(); layers.mount(); document.getElementById('lay-pop').classList.add('on'); lops.doAddLayer();
  S.layers[1].grid[2][2] = [120, 120, 120, 255]; S.layers[1].effects = [{ id: 99, type: 'stroke', visible: true, opacity: 1, params: { size: 1, color: '#fff' } }]; cache.dirtyAll();
  // несколько слоёв выбрано, активна строка эффекта слоя 1 (fxCur)
  S.cur = 1; S.marked = new Set([0]); S.selFolder = null; S.fxSel = new Set([S.layers[1].effects[0]]); S.fxCur = S.layers[1].effects[0]; S.bgSel = false; layList();
  document.getElementById('img-settings').click();
  assert.ok(S.fxDraft, 'создан черновик настройки (превью)'); // есть превью
  assert.equal(S.fxDraft.target, S.layers[1]); // к активному слою (владельцу эффекта), не к эффекту
  assert.equal(S.fxDraft.eff.type, 'adjustment');
  document.getElementById('bc-bri').value = 40; document.getElementById('bc-bri').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(S.fxDraft.eff.params.brightness, 40); // слайдер обновляет черновик → живое превью
  document.getElementById('bc-cancel').click(); assert.equal(S.fxDraft, null); // отмена убирает черновик
  S.fxSel = new Set(); S.fxCur = null; S.layers[1].effects = [];
});
t('background: заливка/очистка/контекст-меню на выбранном фоне', () => { resetWH(4, 4); layers.mount(); tb.mount(); document.getElementById('lay-pop').classList.add('on');
  S.bg = { color: null, visible: true }; S.bgSel = true; S.active = [3, 4, 5]; layList();
  document.getElementById('t-fill').click(); assert.deepEqual(S.bg.color, [3, 4, 5]); assert.equal(S.tool, 'pencil'); // Fill-кнопка сразу красит фон
  document.getElementById('lay-clean').click(); assert.equal(S.bg.color, null); // кнопка очистить → прозрачный
  const cv = document.getElementById('cv'); const prev = document.elementFromPoint; document.elementFromPoint = () => cv;
  try { actions.run('edit.dropColorAt', [2, 2, 2], 5, 5); } finally { document.elementFromPoint = prev; }
  assert.deepEqual(S.bg.color, [2, 2, 2]); // бросок цвета на холст красит фон
  S.active = [9, 9, 9];
  let bgr = document.querySelector('#lay-list [data-bg]'); bgr.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true })); // меню фона = общее #lctx
  assert.ok(document.getElementById('lctx').classList.contains('on')); // то же меню, что у слоёв
  assert.equal(document.getElementById('lctx-del').style.display, 'none'); // фон нельзя удалить — пункт скрыт
  assert.equal(document.getElementById('lctx-fill').textContent, i18n.t('menu.fill'));
  assert.equal(document.getElementById('lctx-clear').textContent, i18n.t('menu.clearSimple'));
  document.getElementById('lctx-fill').click(); assert.deepEqual(S.bg.color, [9, 9, 9]); // меню: Залить
  bgr = document.querySelector('#lay-list [data-bg]'); bgr.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  document.getElementById('lctx-clear').click(); assert.equal(S.bg.color, null); // меню: Очистить
  S.bgSel = false; S.bg = { color: null, visible: true };
});
t('background: группа не уносит фон, выбор фона исключает прочее', () => { resetWH(4, 4); lops.doAddLayer();
  S.bgSel = true; S.cur = 0; S.marked = new Set(); lops.doGroup(); // doGroup не должен трогать фон, primary не слой
  assert.equal(S.bgSel, true); // фон остаётся фоном (не в S.layers, не группируется)
  S.bgSel = false;
});
t('layers: вложенные группы (группа в группе)', async () => { resetWH(4, 4); const { folderChain } = await import('../src/core/layers.js');
  S.folders = []; S.folderSeq = 0; S.layers = [S.layers[0], { ...S.layers[0], name: 'b', grid: S.layers[0].grid.map((r) => r.slice()) }, { ...S.layers[0], name: 'c', grid: S.layers[0].grid.map((r) => r.slice()) }]; S.cur = 0; S.marked = new Set([1, 2]);
  lops.doGroup(); const A = S.folders[0]; assert.equal(A.parent ?? null, null);
  const inner = S.layers.map((L, i) => [L, i]).filter(([L]) => L.fid === A.id).map(([, i]) => i); S.marked = new Set(inner); lops.doGroup();
  const B = S.folders.find((f) => f !== A); assert.equal(B.parent, A.id); // B вложена в A
  assert.deepEqual(folderChain(S.layers.find((L) => L.fid === B.id).fid).map((f) => f.id), [B.id, A.id]); });

t('tilemap: рисование тайлом, правка source обновляет все экземпляры', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0;
  const ts = tsmgr.createTileset('t', 4, 4); const tile = tsmgr.addTile(ts); tile.grid[0][0] = [1, 2, 3, 255];
  const L = tmap.makeTilemapLayer('tm', ts.id, 2, 2); S.layers.push(L); S.cur = S.layers.length - 1;
  S.activeTile = { tilesetId: ts.id, tileId: tile.id }; S.tileMode = 'paint'; tmap.rasterLayer(S.cur);
  const h = toolHandler('tilebrush'); h.down({ gx: 0, gy: 0 }); h.up({});
  assert.deepEqual(S.layers[S.cur].grid[0][0], [1, 2, 3, 255]); // тайл лёг в клетку (0,0)
  tile.grid[1][1] = [9, 9, 9, 255]; tmap.refreshTile(ts.id, tile.id);
  assert.deepEqual(S.layers[S.cur].grid[1][1], [9, 9, 9, 255]); // правка source отразилась на экземпляре
});
t('tile-palette: выбор тайла включает Place tile и сохраняет последний Draw/Edit', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileAutoMode = 'manual'; S.tileMode = 'pick'; S.tool = 'pencil';
  const ts = tsmgr.createTileset('t', 4, 4), tile = tsmgr.addTile(ts); tile.grid[0][0] = [1, 2, 3, 255];
  tileSelect.selectTile(ts, tile.id);
  assert.deepEqual(S.activeTile, { tilesetId: ts.id, tileId: tile.id });
  assert.equal(S.tool, 'tilebrush'); assert.equal(S.tileMode, 'paint'); assert.equal(S.tileAutoMode, 'manual');
});
t('tilemap: цвет, кисть и ластик возвращают последний Draw/Edit режим', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tool = 'tilebrush'; S.tileMode = 'paint'; S.tileAutoMode = 'manual';
  pal.setActiveColor([9, 8, 7]); assert.equal(S.tool, 'pencil'); assert.equal(S.tileAutoMode, 'manual');
  S.tool = 'tilebrush'; S.tileAutoMode = 'auto'; setTool('eraser');
  assert.equal(S.tool, 'eraser'); assert.equal(S.tileAutoMode, 'auto');
  S.tool = 'tilebrush'; S.tileAutoMode = 'manual'; setTool('pencil');
  assert.equal(S.tool, 'pencil'); assert.equal(S.tileAutoMode, 'manual');
});
t('tilemap: erase и pick через Tile Brush', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0;
  const ts = tsmgr.createTileset('t', 4, 4); const tile = tsmgr.addTile(ts); tile.grid[0][0] = [5, 6, 7, 255];
  const L = tmap.makeTilemapLayer('tm', ts.id, 2, 2); S.layers.push(L); S.cur = S.layers.length - 1;
  S.activeTile = { tilesetId: ts.id, tileId: tile.id }; S.tileMode = 'paint'; tmap.rasterLayer(S.cur);
  const h = toolHandler('tilebrush'); h.down({ gx: 0, gy: 0 }); h.up({});
  S.activeTile = { tilesetId: ts.id, tileId: null }; S.tileFlags = { flipX: false, flipY: false, diagonalFlip: false, rotation: 0 };
  S.tileMode = 'pick'; h.down({ gx: 0, gy: 0 }); assert.equal(S.activeTile.tileId, tile.id); // pick вернул tileId
  S.tileMode = 'erase'; h.down({ gx: 0, gy: 0 }); h.up({});
  assert.equal(S.layers[S.cur].tilemap.cells[0], null); assert.equal(S.layers[S.cur].grid[0][0], null);
});
t('tilemap: пустой tileId не остаётся в cells', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0;
  const ts = tsmgr.createTileset('t', 4, 4), empty = tsmgr.addTile(ts);
  const L = tmap.makeTilemapLayer('tm', ts.id, 2, 2); S.layers.push(L); S.cur = S.layers.length - 1;
  S.activeTile = { tilesetId: ts.id, tileId: empty.id }; S.tileMode = 'paint'; S.tilePattern = null; S.tileRandom = false;
  const h = toolHandler('tilebrush'); h.down({ gx: 0, gy: 0 }); h.up({});
  assert.equal(L.tilemap.cells[0], null);
  const tile = tsmgr.addTile(ts); tile.grid[0][0] = [1, 1, 1, 255];
  tmap.setCell(S.cur, 0, 0, { tileId: tile.id }); tile.grid[0][0] = null; tmap.refreshTile(ts.id, tile.id);
  assert.equal(L.tilemap.cells[0], null);
});
t('tilemap: Make Unique отделяет клетку, старые экземпляры целы', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0;
  const ts = tsmgr.createTileset('t', 4, 4); const tile = tsmgr.addTile(ts); tile.grid[0][0] = [1, 1, 1, 255];
  const L = tmap.makeTilemapLayer('tm', ts.id, 2, 1); S.layers.push(L); S.cur = S.layers.length - 1;
  tmap.setCell(S.cur, 0, 0, { tileId: tile.id }); tmap.setCell(S.cur, 1, 0, { tileId: tile.id });
  S.tileSel = { li: S.cur, x0: 0, y0: 0, x1: 0, y1: 0 };
  const before = ts.tiles.length; tsel.makeUnique();
  assert.equal(ts.tiles.length, before + 1); // создан новый tileId
  const c0 = L.tilemap.cells[0], c1 = L.tilemap.cells[1];
  assert.notEqual(c0.tileId, tile.id); assert.equal(c1.tileId, tile.id); // соседний экземпляр не тронут
});

t('tilemap: create tile from layer режет слой по сетке', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4; S.cur = 0;
  S.layers[0].grid[0][0] = [7, 7, 7, 255]; S.layers[0].grid[5][5] = [8, 8, 8, 255]; // блоки (0,0) и (1,1)
  tfl.fromLayer();
  const ts = S.tilesets[0]; assert.equal(ts.tileW, 4); assert.equal(ts.tiles.length, 2); // два непустых тайла
});
t('tilemap: новые и конвертированные default-слои называются Tilemap', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4; tmcreate.createTilemap();
  assert.equal(S.layers[S.cur].name, 'Tilemap'); assert.equal(i18n.t('tile.newLayer'), 'New Tilemap');
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  S.layers[0].name = i18n.t('layer.name') + ' 1'; S.layers[0].grid[0][0] = [1, 1, 1, 255];
  tfl.convertToTile(); assert.equal(S.layers[S.cur].name, 'Tilemap');
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  S.layers[0].name = 'Custom'; S.layers[0].grid[0][0] = [1, 1, 1, 255];
  tfl.convertToTile(); assert.equal(S.layers[S.cur].name, 'Custom');
});
t('tilemap-dialog: New Tilemap создаёт tileset с пресетом', () => {
  const old = localStorage.getItem('tilemapPresets');
  try {
    localStorage.removeItem('tilemapPresets'); tmDialog.mount();
    resetWH(64, 64); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 16;
    tmcreate.open(); assert.ok(document.getElementById('tilemap-ovl').classList.contains('on'));
    assert.equal(document.getElementById('tm-name').value, '16 x 16');
    assert.deepEqual([...document.querySelectorAll('#tm-saved .saved b')].map((n) => n.textContent), ['32 x 32', '48 x 48', '96 x 96']);
    if (document.getElementById('tm-link').classList.contains('on')) document.getElementById('tm-link').click();
    document.getElementById('tm-grid-w').value = '24';
    document.getElementById('tm-grid-w').dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(document.getElementById('tm-name').value, '24 x 16');
    document.getElementById('tm-name').value = 'Cave';
    document.getElementById('tm-name').dispatchEvent(new window.Event('input', { bubbles: true }));
    document.getElementById('tm-grid-w').value = '24';
    document.getElementById('tm-grid-h').value = '12';
    document.getElementById('tm-save').checked = true;
    assert.ok(document.getElementById('tm-cancel').classList.contains('txtbtn'));
    assert.ok(document.getElementById('tm-apply').classList.contains('primary'));
    document.getElementById('tm-link').click();
    document.getElementById('tm-grid-w').value = '36';
    document.getElementById('tm-grid-w').dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(document.getElementById('tm-grid-h').value, '18');
    document.getElementById('tm-grid-w').value = '24';
    document.getElementById('tm-grid-h').value = '12';
    document.getElementById('tm-apply').click();
    const ts = S.tilesets[0], L = S.layers[S.cur];
    assert.equal(ts.name, 'Cave'); assert.equal(ts.tileW, 24); assert.equal(ts.tileH, 12);
    assert.equal(L.kind, 'tilemap'); assert.equal(L.tilemap.mapW, 3); assert.equal(L.tilemap.mapH, 6);
    assert.deepEqual(JSON.parse(localStorage.getItem('tilemapPresets'))[0], { name: 'Cave', tileW: 24, tileH: 12 });
    resetWH(16, 16); tmcreate.open();
    document.querySelector('#tm-saved .saved').click();
    assert.equal(document.getElementById('tm-name').value, 'Cave');
    assert.equal(document.getElementById('tm-grid-w').value, '24');
    assert.equal(document.getElementById('tm-grid-h').value, '12');
    document.getElementById('tm-cancel').click();
  } finally {
    if (old == null) localStorage.removeItem('tilemapPresets'); else localStorage.setItem('tilemapPresets', old);
  }
});
t('tilemap-dialog: Convert to Tilemap использует размер из диалога', () => {
  resetWH(32, 16); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 16; tmDialog.mount();
  S.layers[0].grid[0][0] = [1, 2, 3, 255];
  tfl.openConvertDialog(); assert.ok(document.getElementById('tilemap-ovl').classList.contains('on'));
  assert.equal(document.getElementById('tm-name').value, '16 x 16');
  if (document.getElementById('tm-link').classList.contains('on')) document.getElementById('tm-link').click();
  document.getElementById('tm-name').value = 'Dungeon';
  document.getElementById('tm-name').dispatchEvent(new window.Event('input', { bubbles: true }));
  document.getElementById('tm-grid-w').value = '8';
  document.getElementById('tm-grid-h').value = '16';
  document.getElementById('tm-apply').click();
  const ts = S.tilesets[0], L = S.layers[S.cur];
  assert.equal(ts.name, 'Dungeon'); assert.equal(ts.tileW, 8); assert.equal(ts.tileH, 16);
  assert.equal(L.kind, 'tilemap'); assert.equal(L.tilemap.mapW, 4); assert.equal(L.tilemap.mapH, 1);
  assert.ok(L.tilemap.cells[0]); assert.equal(L.tilemap.cells[1], null);
});
t('tilemap: merge Tilemap-слоёв сохраняет Tilemap', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  const ts = tsmgr.createTileset('t', 4, 4);
  const red = tsmgr.addTile(ts); red.grid[0][0] = [200, 0, 0, 255];
  const blue = tsmgr.addTile(ts); blue.grid[0][0] = [0, 0, 200, 255];
  const low = tmap.makeTilemapLayer('low', ts.id, 2, 1), top = tmap.makeTilemapLayer('top', ts.id, 2, 1);
  S.layers = [low, top]; S.cur = 1; S.marked = new Set();
  tmap.setCell(0, 0, 0, { tileId: red.id }); tmap.setCell(1, 1, 0, { tileId: blue.id });
  lops.doMerge();
  assert.equal(S.layers.length, 1); assert.equal(S.layers[0].kind, 'tilemap'); assert.equal(S.layers[0].name, 'top');
  assert.equal(S.layers[0].tilemap.cells[0].tileId, red.id); assert.equal(S.layers[0].tilemap.cells[1].tileId, blue.id);
  assert.deepEqual(S.layers[0].grid[0][0], [200, 0, 0, 255]); assert.deepEqual(S.layers[0].grid[0][4], [0, 0, 200, 255]);
});
t('tilemap: Tileset-панель следует за активным Tilemap-слоем', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4; S.tilesetPrev = null; S.tileset = { on: false, open: false };
  tilePalette.mount(); tmode.mount();
  const ts = tsmgr.createTileset('t', 4, 4); const L = tmap.makeTilemapLayer('tm', ts.id, 2, 1); S.layers.push(L);
  const panel = document.getElementById('tilebar');
  S.cur = 0; bus.emit('layer-active');
  assert.equal(S.tileset.on, false); assert.equal(S.tileset.open, false); assert.ok(panel.classList.contains('closed'));
  S.cur = S.layers.length - 1; bus.emit('layer-active');
  assert.equal(S.tileset.on, true); assert.equal(S.tileset.open, true); assert.ok(!panel.classList.contains('closed'));
  S.cur = 0; bus.emit('layer-active');
  assert.equal(S.tileset.on, false); assert.equal(S.tileset.open, false); assert.ok(panel.classList.contains('closed'));
});
t('tilemap: уход с Tilemap возвращает стабилизацию и обычный инструмент', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4; S.stabOn = true; S.tilesetPrev = null; S.tileset = { on: false, open: false };
  tilePalette.mount(); tmode.mount();
  const ts = tsmgr.createTileset('t', 4, 4); const L = tmap.makeTilemapLayer('tm', ts.id, 2, 1); S.layers.push(L); S.cur = S.layers.length - 1;
  S.tool = 'tilebrush'; S.tileMode = 'paint'; bus.emit('layer-active');
  assert.equal(S.stabOn, false);
  S.cur = 0; bus.emit('layer-active');
  assert.equal(S.stabOn, true); assert.equal(S.tool, 'pencil');
});
t('tilemap: фон или эффект не держат Tileset-панель открытой', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4; S.tilesetPrev = null; S.tileset = { on: false, open: false };
  tilePalette.mount(); tmode.mount();
  const ts = tsmgr.createTileset('t', 4, 4); const L = tmap.makeTilemapLayer('tm', ts.id, 2, 1); S.layers.push(L); S.cur = S.layers.length - 1;
  bus.emit('layer-active'); assert.equal(S.tileset.on, true);
  S.bgSel = true; bus.emit('layer-active'); assert.equal(S.tileset.on, false);
  S.bgSel = false; S.layers[S.cur].effects = [newEffect('stroke')]; S.fxCur = S.layers[S.cur].effects[0];
  bus.emit('layer-active'); assert.equal(S.tileset.on, false);
  S.layers[S.cur].effects = []; S.fxCur = null;
});
t('tilemap: Edit tile на пустой клетке автоматически переключается на Draw Tile', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  const ts = tsmgr.createTileset('t', 4, 4); const L = tmap.makeTilemapLayer('tm', ts.id, 2, 1); S.layers.push(L); S.cur = S.layers.length - 1;
  S.tileset = { on: true }; S.tool = 'pencil'; S.tileAutoMode = 'manual'; S.active = [5, 5, 5];
  tilePaint(0, 0); // красим по пустой клетке
  assert.equal(S.tileAutoMode, 'auto'); // Edit tile не работает на пустой → включился Draw Tile
  assert.equal(ts.tiles.length, 1); // тайл создан и в палитре
  S.tileset = { on: false };
});
t('tilemap: контекст-меню на Tile-слое без Add tile', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  const ts = tsmgr.createTileset('t', 4, 4); const tile = tsmgr.addTile(ts); tile.grid[0][0] = [1, 2, 3, 255];
  const L = tmap.makeTilemapLayer('tm', ts.id, 2, 1); S.layers.push(L); S.cur = S.layers.length - 1; tmap.setCell(S.cur, 0, 0, { tileId: tile.id });
  S.tileset = { on: true, open: false }; S.tilesetPrev = null; S.sel = null; S.selMask = null;
  tmode.mount(); const undo = overCv(10);
  let m = document.getElementById('tile-cctx'); if (m) m.classList.remove('on');
  input.down({ pointerType: 'mouse', button: 2, clientX: 5, clientY: 5, pointerId: 1 });
  input.up({ pointerType: 'mouse', button: 2, clientX: 5, clientY: 5, pointerId: 1 });
  undo(); m = document.getElementById('tile-cctx');
  assert.ok(m && m.classList.contains('on')); // меню есть
  const labels = [...m.querySelectorAll('button')].map((b) => b.textContent);
  assert.ok(!labels.includes(i18n.t('tile.addToSet'))); // но без Add tile
  S.tileset = { on: false, open: false };
});

function tilePaint(gx, gy) { for (const gh of globalHandlers()) if (gh.down && gh.down({ gx, gy, e: {} })) { gh.up({ e: {} }); return true; } return false; }
function tmSetup(tw) { resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.grid.w = tw; S.grid.h = tw;
  const ts = tsmgr.createTileset('t', tw, tw), tile = tsmgr.addTile(ts);
  tile.grid[0][0] = [1, 1, 1, 255];
  const L = tmap.makeTilemapLayer('tm', ts.id, Math.floor(8 / tw), 1); S.layers.push(L); S.cur = S.layers.length - 1;
  tmap.setCell(S.cur, 0, 0, { tileId: tile.id }); tmap.setCell(S.cur, 1, 0, { tileId: tile.id });
  S.tileset = { on: true }; S.tilePattern = null; S.tileRandom = false; return { ts, tile, L }; }

t('tilemap: Edit tile пишет в source — обновляются все экземпляры', () => {
  const { tile, L } = tmSetup(4); S.tool = 'pencil'; S.tileAutoMode = 'manual'; S.active = [10, 20, 30];
  assert.ok(tilePaint(0, 0));
  assert.deepEqual(tile.grid[0][0], [10, 20, 30, 255]); // правка ушла в source
  assert.deepEqual(L.grid[0][0], [10, 20, 30, 255]); assert.deepEqual(L.grid[0][4], [10, 20, 30, 255]); // оба экземпляра
});
t('tilemap: Edit tile использует реальный размер кисти', () => {
  const { tile } = tmSetup(4); S.tool = 'pencil'; S.tileAutoMode = 'manual'; S.brushes.pencil.size = 3; S.active = [2, 3, 4];
  assert.ok(tilePaint(1, 1));
  assert.deepEqual(tile.grid[0][0], [2, 3, 4, 255]);
  assert.deepEqual(tile.grid[1][1], [2, 3, 4, 255]);
  assert.deepEqual(tile.grid[2][2], [2, 3, 4, 255]);
  assert.equal(tile.grid[3][3], null);
});
t('tilemap: Draw Tile редактирует tileId занятой клетки без нового тайла', () => {
  const { ts, tile, L } = tmSetup(4); S.tool = 'pencil'; S.tileAutoMode = 'auto'; S.active = [9, 9, 9];
  const before = ts.tiles.length; assert.ok(tilePaint(0, 0));
  assert.equal(ts.tiles.length, before); assert.equal(L.tilemap.cells[0].tileId, tile.id);
  assert.equal(L.tilemap.cells[1].tileId, tile.id); assert.deepEqual(tile.grid[0][0], [9, 9, 9, 255]);
});
t('tilemap: Draw Tile на пустой клетке создаёт непустой тайл и оставляет его в tileset', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  const ts = tsmgr.createTileset('t', 4, 4), L = tmap.makeTilemapLayer('tm', ts.id, 2, 1);
  S.layers.push(L); S.cur = S.layers.length - 1; S.tileset = { on: true };
  S.tool = 'pencil'; S.tileAutoMode = 'auto'; S.active = [8, 7, 6];
  assert.ok(tilePaint(0, 0)); assert.equal(ts.tiles.length, 1);
  assert.equal(L.tilemap.cells[0].tileId, ts.tiles[0].id); assert.deepEqual(ts.tiles[0].grid[0][0], [8, 7, 6, 255]);
});
t('tilemap: Draw Tile на пустой клетке использует реальный размер кисти', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  const ts = tsmgr.createTileset('t', 4, 4), L = tmap.makeTilemapLayer('tm', ts.id, 2, 1);
  S.layers.push(L); S.cur = S.layers.length - 1; S.tileset = { on: true };
  S.tool = 'pencil'; S.tileAutoMode = 'auto'; S.brushes.pencil.size = 3; S.active = [7, 6, 5];
  assert.ok(tilePaint(1, 1)); assert.equal(ts.tiles.length, 1);
  assert.deepEqual(ts.tiles[0].grid[0][0], [7, 6, 5, 255]);
  assert.deepEqual(ts.tiles[0].grid[1][1], [7, 6, 5, 255]);
  assert.deepEqual(ts.tiles[0].grid[2][2], [7, 6, 5, 255]);
  assert.equal(ts.tiles[0].grid[3][3], null);
});
t('tilemap: пустая клетка → тайл; стёртая в ноль → не создаётся', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  const ts = tsmgr.createTileset('t', 4, 4); const L = tmap.makeTilemapLayer('tm', ts.id, 2, 1); S.layers.push(L); S.cur = S.layers.length - 1;
  S.tileset = { on: true }; S.tool = 'pencil'; S.tileAutoMode = 'manual'; S.active = [5, 5, 5];
  tilePaint(0, 0); assert.equal(ts.tiles.length, 1); // в пустой клетке создан тайл
  const id = L.tilemap.cells[0].tileId; S.active = [6, 6, 6]; tilePaint(1, 0);
  assert.equal(ts.tiles.length, 1); assert.equal(L.tilemap.cells[0].tileId, id); assert.deepEqual(tsmgr.getTile(ts, id).grid[0][1], [6, 6, 6, 255]);
  S.tool = 'eraser'; tilePaint(4, 0); assert.equal(ts.tiles.length, 1); // стёртая пустая клетка нового тайла не дала
});
t('tilemap: трансформ клетки меняет экземпляр, не source', () => {
  const { tile, L } = tmSetup(4); S.tileSel = { li: S.cur, x0: 0, y0: 0, x1: 0, y1: 0 };
  tmode.cellFlipH();
  assert.equal(L.tilemap.cells[0].flipX, true); assert.ok(!L.tilemap.cells[1].flipX); // только эта клетка
  assert.deepEqual(tile.grid[0][0], [1, 1, 1, 255]); // source не тронут
});
t('tilemap: Delete Tile очищает все экземпляры', () => {
  const { ts, tile, L } = tmSetup(4); tops.removeTile(ts, tile.id);
  assert.equal(ts.tiles.length, 0); assert.equal(L.tilemap.cells[0], null); assert.equal(L.tilemap.cells[1], null);
});
t('tileset: addTileUnique не дублирует одинаковые тайлы', () => {
  const ts = tsmgr.createTileset('t', 1, 1); const g = [[[1, 2, 3, 255]]];
  const a = tsmgr.addTileUnique(ts, g.map((r) => r.map((c) => c.slice())));
  const b = tsmgr.addTileUnique(ts, g.map((r) => r.map((c) => c.slice())));
  assert.equal(a.added, true); assert.equal(b.added, false); assert.equal(b.tile, a.tile);
});
t('tileset-manager: пустой тайлсет не сохраняется', () => { resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.activeTile = null;
  const ts = tsmgr.createTileset('empty', 4, 4);
  const keep = { id: 1, name: 'keep', tileW: 1, tileH: 1, tiles: [], groups: [], tileSeq: 0 };
  localStorage.setItem('tilesetsLib', JSON.stringify({ keep }));
  tsetMgr.mount(); tsetMgr.open(); document.getElementById('tsetm-name').value = ts.name; document.getElementById('tsetm-save').click();
  assert.deepEqual(JSON.parse(localStorage.getItem('tilesetsLib')), { keep });
  assert.equal(document.getElementById('toast').textContent, i18n.t('toast.tilesetEmpty'));
});
t('tile-brush: паттерн штампует выровненно по сетке', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0;
  const ts = tsmgr.createTileset('t', 1, 1); const t1 = tsmgr.addTile(ts), t2 = tsmgr.addTile(ts);
  t1.grid[0][0] = [1, 1, 1, 255]; t2.grid[0][0] = [2, 2, 2, 255];
  const L = tmap.makeTilemapLayer('tm', ts.id, 4, 1); S.layers.push(L); S.cur = S.layers.length - 1;
  S.tilePattern = { w: 2, h: 1, ids: [t1.id, t2.id] }; S.activeTile = { tilesetId: ts.id, tileId: t1.id }; S.tileMode = 'paint'; S.tileRandom = false;
  const h = toolHandler('tilebrush'); h.down({ gx: 0, gy: 0 }); h.move({ gx: 1, gy: 0 }); h.up({});
  assert.equal(L.tilemap.cells[0].tileId, t1.id); assert.equal(L.tilemap.cells[1].tileId, t2.id); S.tilePattern = null;
});

t('tilemap: заливка работает на одну клетку, не на весь слой', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  const ts = tsmgr.createTileset('t', 4, 4); const L = tmap.makeTilemapLayer('tm', ts.id, 2, 1); S.layers.push(L); S.cur = S.layers.length - 1;
  S.tileset = { on: true }; S.tool = 'fill'; S.tileAutoMode = 'manual'; S.active = [3, 4, 5];
  for (const gh of globalHandlers()) if (gh.down && gh.down({ gx: 0, gy: 0, e: {} })) { gh.up({ e: {} }); break; }
  assert.ok(L.tilemap.cells[0]); assert.equal(L.tilemap.cells[1], null); // залита только клетка 0
  assert.deepEqual(tsmgr.getTile(ts, L.tilemap.cells[0].tileId).grid[0][0], [3, 4, 5, 255]);
  S.tool = 'pencil'; S.tileset = { on: false }; });

t('tilemap: Add to tileset собирает клетку по слоям и не дублирует', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  const ts = tsmgr.createTileset('t', 4, 4);
  const ta = tsmgr.addTile(ts); ta.grid[0][0] = [1, 1, 1, 255];
  const tb = tsmgr.addTile(ts); tb.grid[3][3] = [2, 2, 2, 255];
  const L1 = tmap.makeTilemapLayer('a', ts.id, 1, 1), L2 = tmap.makeTilemapLayer('b', ts.id, 1, 1);
  S.layers.push(L1, L2); const i1 = S.layers.indexOf(L1), i2 = S.layers.indexOf(L2);
  tmap.setCell(i1, 0, 0, { tileId: ta.id }); tmap.setCell(i2, 0, 0, { tileId: tb.id });
  S.cur = i2; S.marked = new Set([i1]); S.tileSel = { li: i2, x0: 0, y0: 0, x1: 0, y1: 0 };
  const before = ts.tiles.length; tmode.addToSet();
  assert.equal(ts.tiles.length, before + 1); // композит обоих слоёв добавлен
  const added = ts.tiles[ts.tiles.length - 1];
  assert.deepEqual(added.grid[0][0], [1, 1, 1, 255]); assert.deepEqual(added.grid[3][3], [2, 2, 2, 255]);
  tmode.addToSet(); assert.equal(ts.tiles.length, before + 1); // дубль не добавляется
  S.marked = new Set(); });

t('tilemap: Add to tileset из обычного слоя берёт пиксели клетки', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4; // активен обычный пиксельный слой
  S.layers[0].grid[1][1] = [7, 8, 9, 255]; // пиксель в клетке (0,0)
  S.cur = 0; S.marked = new Set(); S.tileSel = { li: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
  tmode.addToSet();
  const ts = S.tilesets[0]; assert.ok(ts); assert.equal(ts.tileW, 4); assert.equal(ts.tiles.length, 1);
  assert.deepEqual(ts.tiles[0].grid[1][1], [7, 8, 9, 255]); // клетка обычного слоя стала тайлом
});

t('tilemap: stampTileId — одиночный/паттерн/зафиксированный random', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0;
  const ts = tsmgr.createTileset('t', 1, 1); const a = tsmgr.addTile(ts), b = tsmgr.addTile(ts);
  S.tilePattern = null; S.tileRandom = false; S.activeTile = { tilesetId: ts.id, tileId: a.id };
  assert.equal(tmap.stampTileId(0, 0), a.id); // одиночный
  S.tilePattern = { w: 2, h: 1, ids: [a.id, b.id] };
  assert.equal(tmap.stampTileId(0, 0), a.id); assert.equal(tmap.stampTileId(1, 0), b.id); // паттерн по сетке
  S.tilePattern = null; S.tileRandom = true; S.tileMarks = new Set([a.id, b.id]); S.tileRandomNext = null;
  const r1 = tmap.stampTileId(0, 0); assert.ok(r1 === a.id || r1 === b.id);
  assert.equal(tmap.stampTileId(0, 0), r1); // random зафиксирован → превью == штамп
  S.tileRandom = false; S.tileMarks = new Set();
});
t('tilemap: tile.flipH/flipV флипают флаги кисти (для превью)', () => {
  S.tileFlags = { flipX: false, flipY: false, diagonalFlip: false, rotation: 0 };
  actions.run('tile.flipH'); assert.equal(S.tileFlags.flipX, true);
  actions.run('tile.flipV'); assert.equal(S.tileFlags.flipY, true);
  actions.run('tile.flipH'); assert.equal(S.tileFlags.flipX, false);
});

t('tilemap: удаление Tile-слоя НЕ удаляет тайлы из палитры', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  const tsA = tsmgr.createTileset('A', 8, 8), tsB = tsmgr.createTileset('B', 4, 4); // несколько тайлсетов
  const tile = tsmgr.addTile(tsB);
  const L = tmap.makeTilemapLayer('tm', tsB.id, 2, 2); S.layers.push(L); S.cur = S.layers.indexOf(L);
  S.activeTile = { tilesetId: tsB.id, tileId: tile.id };
  lops.deleteLayerRef(L);
  assert.ok(S.tilesets.includes(tsB)); assert.equal(tsB.tiles.length, 1); // тайлсет и тайл целы
  assert.equal(tops.activeTileset(), tsB); // палитра по-прежнему показывает тайлсет активного тайла, не tsA
  assert.notEqual(tops.activeTileset(), tsA);
});

t('tilemap: Add tile после изменения слоёв даёт новый тайл (дедуп по контенту)', () => {
  resetWH(8, 8); S.tilesets = []; S.tilesetSeq = 0; S.tileGrid.size = 4;
  S.layers[0].grid[0][0] = [1, 1, 1, 255]; S.cur = 0; S.tileSel = { li: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
  tmode.addToSet(); const ts = S.tilesets[0]; assert.equal(ts.tiles.length, 1);
  tmode.addToSet(); assert.equal(ts.tiles.length, 1); // тот же контент → дубль не добавляется
  S.layers[0].grid[1][1] = [2, 2, 2, 255]; // перерисовали клетку
  tmode.addToSet(); assert.equal(ts.tiles.length, 2); // новый контент → новый тайл
});

console.log(`\nВсе ${n} интеграционных тестов прошли ✓`);
