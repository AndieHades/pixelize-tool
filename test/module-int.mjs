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
const { SHAPE_SNAP_MS } = await import('../src/config/timings.js');
const { rotateCanvas } = await import('../src/systems/rotate-canvas.js');
const { flipLayer } = await import('../src/systems/flip.js');
const { trimCanvas } = await import('../src/systems/trim.js');
const { monoAll } = await import('../src/systems/mono.js');
const { recolorAll } = await import('../src/systems/recolor.js');
const { freeRotateLayer } = await import('../src/systems/free-rotate.js');
const bc = await import('../src/systems/brightness-contrast.js');
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
const cp = await import('../src/systems/color-picker.js');
const prev = await import('../src/systems/preview-window.js');
const ref = await import('../src/systems/reference-window.js');
const palMgr = await import('../src/systems/palette-manager.js');
const tsg = await import('../src/systems/tint-shade/index.js');
const tb = await import('../src/systems/toolbars.js');
const effects = await import('../src/systems/effects/index.js');
const fxr = await import('../src/core/effects-render.js');
const fxlogic = await import('../src/logic/layer-effects.js');
const adjust = await import('../src/systems/draw/adjust.js');
const crop = await import('../src/systems/crop.js');
const status = await import('../src/systems/status.js');
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
  S.layers = [{ name: 'a', grid: blank(w, h), opacity: 1, visible: true, fid: null, clip: false, ext: new Map(), effects: [] }];
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.moveDrag = null; S.tool = 'pencil'; S.sym = S.symH = false; cache.dirtyAll(); };

const reset4 = () => { S.W = 4; S.H = 4; S.cur = 0; S.folders = []; S.marked = new Set();
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
t('draw: пипетка берёт цвет в активный', () => { reset4(); S.layers[0].grid[1][1] = [40, 50, 60, 255]; cache.dirtyAll();
  S.tool = 'pick'; stamp(1, 1); assert.deepEqual(S.active, [40, 50, 60]); assert.equal(S.tool, 'pencil'); });

t('rotate-canvas: меняет W/H местами', () => { resetWH(4, 6); rotateCanvas(); assert.equal(S.W, 6); assert.equal(S.H, 4); });
t('flip: отражает слой по горизонтали', () => { resetWH(4, 4); S.layers[0].grid[1][0] = [5, 5, 5, 255]; flipLayer(true); assert.deepEqual(S.layers[0].grid[1][3], [5, 5, 5, 255]); });
t('trim: обрезает до контура', () => { resetWH(6, 6); S.layers[0].grid[2][3] = [9, 9, 9, 255]; trimCanvas(); assert.equal(S.W, 1); assert.equal(S.H, 1); assert.deepEqual(S.layers[0].grid[0][0], [9, 9, 9, 255]); });
t('trim: расширяет холст до пикселей за краем (включая скрытые)', () => { resetWH(4, 4); S.layers[0].grid[0][0] = [9, 9, 9, 255];
  S.layers[0].visible = false; S.layers[0].ext.set('6,6', [1, 1, 1, 255]); trimCanvas();
  assert.equal(S.W, 7); assert.equal(S.H, 7); assert.deepEqual(S.layers[0].grid[6][6], [1, 1, 1, 255]); S.layers[0].visible = true; });
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
t('effects-render: слой с эффектом рисуется через fx-канвас', () => { resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  S.layers[0].effects = [{ id: 1, type: 'stroke', visible: true, params: { size: 1, color: '#ff0000' } }];
  const c = fxr.layerFxCanvas(0); assert.ok(c && c.width === 8); assert.notEqual(c, cache.layerFloatCanvas(0)); S.layers[0].effects = []; });

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
  assert.equal(S.layers.length, 1); assert.ok(S.W >= 1 && S.W <= 4 && S.H >= 1 && S.H <= 4); assert.ok(S.palette.length > 0);
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
t('tint-shade: без активного цвета в палитре — окно не открывается', () => {
  document.getElementById('tsg-win').classList.remove('on');
  S.palette = [[1, 2, 3]]; S.active = [200, 200, 200]; // нет в палитре
  document.getElementById('tsg-btn').click();
  assert.ok(!document.getElementById('tsg-win').classList.contains('on'));
});

t('toolbars: mount + смена инструмента подсвечивает кнопку', () => { tb.mount(); setTool('eraser'); assert.ok(document.getElementById('t-eraser').classList.contains('on')); assert.ok(!document.getElementById('t-pencil').classList.contains('on')); });
t('toolbars: переключатель симметрии', () => { S.sym = false; document.getElementById('sym').click(); assert.equal(S.sym, true); });
t('effects: панель открывается, иконка добавляет черновик-эффект с превью', () => { effects.mount(); adjust.mount();
  resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  actions.run('fx.panel'); assert.ok(document.getElementById('fx-panel').classList.contains('on'));
  document.querySelector('#fx-types button[data-fx="glow"]').click();
  assert.equal(S.layers[0].effects.length, 1); assert.ok(document.getElementById('fx-edit').classList.contains('on'));
  document.getElementById('fx-cancel').click(); assert.equal(S.layers[0].effects.length, 0); });

t('effects: Apply фиксирует эффект, undo убирает', () => { resetWH(8, 8); S.layers[0].grid[4][4] = [1, 1, 1, 255]; cache.dirtyAll();
  document.querySelector('#fx-types button[data-fx="stroke"]').click(); document.getElementById('fx-apply').click();
  assert.equal(S.layers[0].effects.length, 1); history.doUndo(); assert.equal(S.layers[0].effects.length, 0); });

t('effects: copy/paste переносит эффект на выбранные слои', () => { resetWH(8, 8); lops.doAddLayer();
  S.layers[0].effects = [{ id: 9, type: 'stroke', visible: true, params: { size: 1, color: '#ff0000' } }];
  S.fxCur = S.layers[0].effects[0]; S.fxSel = new Set([S.fxCur]); actions.run('fx.copy');
  S.cur = 1; S.marked = new Set([0, 1]); actions.run('fx.paste');
  assert.ok(S.layers[1].effects.length >= 1 && S.layers[1].effects[0].type === 'stroke'); S.marked = new Set(); S.fxSel.clear(); S.fxCur = null; });

t('effects: дублирование/удаление выделенных эффектов', () => { resetWH(8, 8);
  S.layers[0].effects = [{ id: 11, type: 'stroke', visible: true, params: { size: 1, color: '#ff0000' } }];
  S.fxCur = S.layers[0].effects[0]; S.fxSel = new Set([S.fxCur]); actions.run('fx.duplicate'); assert.equal(S.layers[0].effects.length, 2);
  S.fxSel = new Set(S.layers[0].effects); actions.run('fx.delete'); assert.equal(S.layers[0].effects.length, 0); });

t('effects: list рисует строку эффекта под слоем', () => { resetWH(8, 8); S.layers[0].effects = [{ id: 7, type: 'glow', visible: true, params: { ...({ size: 6, intensity: 0.8, color: '#78d7ff' }) } }];
  document.getElementById('lay-pop').classList.add('on'); layList(); assert.ok(document.querySelectorAll('#lay-list .fxrow').length >= 1); S.layers[0].effects = []; });

t('effects: цвет эффекта — наш #colpop, не системный input[type=color]', () => { cp.mount();
  assert.equal(document.querySelectorAll('#fx-edit input[type=color]').length, 0); // системного пикера в окне эффекта нет
  resetWH(8, 8); document.querySelector('#fx-types button[data-fx="stroke"]').click(); // черновик stroke
  const eff = S.layers[S.cur].effects[0], before = eff.params.color;
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

t('canvas-handlers: move двигает рамку выделения вместе со слоем', () => { resetWH(8, 8); S.tool = 'move'; S.marked = new Set();
  S.sel = { x0: 1, y0: 1, x1: 3, y1: 3 }; S.selMask = new Set(['2,2']);
  const h = toolHandler('move'); h.down({ gx: 0, gy: 0, e: {} }); h.move({ gx: 2, gy: 1, e: {} }); h.up({});
  assert.deepEqual(S.sel, { x0: 3, y0: 2, x1: 5, y1: 4 }); assert.ok(S.selMask.has('4,3')); S.sel = S.selMask = null; });

t('input: mount + диспетч pencil рисует', () => { resetWH(8, 8); S.active = [3, 4, 5]; S.tool = 'pencil'; input.mount();
  input.down({ pointerType: 'mouse', button: 0, clientX: 2, clientY: 2 }); input.up({ pointerType: 'mouse', button: 0 });
  // координаты зависят от view; проверяем, что хоть одна клетка закрашена
  assert.ok(S.layers[0].grid.some((r) => r.some((c) => c))); });

t('selection-input: select-инструмент тянет рамку', () => { resetWH(8, 8); S.tool = 'select'; S.sel = null; S.selMask = null;
  S.layers[0].grid[2][2] = [1, 1, 1, 255]; // в рамке есть пиксель — выделение валидно
  const h = toolHandler('select'); h.down({ gx: 1, gy: 1, e: null }); h.move({ gx: 4, gy: 4, e: null }); h.up({});
  assert.deepEqual(S.sel, { x0: 1, y0: 1, x1: 4, y1: 4 }); });

t('selection-input: пустая рамка не создаётся', () => { resetWH(8, 8); S.tool = 'select'; S.sel = null; S.selMask = null;
  const h = toolHandler('select'); h.down({ gx: 1, gy: 1, e: null }); h.move({ gx: 4, gy: 4, e: null }); h.up({});
  assert.equal(S.sel, null); });
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
