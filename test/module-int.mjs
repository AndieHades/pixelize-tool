// Интеграционные тесты сервисов core/, которым нужен DOM (canvas). Поднимаем
// jsdom-глобали и импортируем модули напрямую — проверяем по мере портирования,
// не дожидаясь сборки всего приложения.
import assert from 'node:assert/strict';
import { makeDom } from './harness.mjs';

const { window } = makeDom();
// аккуратно прокидываем jsdom-глобали в node (часть из них — read-only геттеры)
for (const k of ['document', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'HTMLCanvasElement', 'Blob', 'File', 'Image', 'window']) {
  try { Object.defineProperty(globalThis, k, { value: k === 'window' ? window : window[k], configurable: true, writable: true }); } catch (e) {}
}

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
const resetWH = (w, h) => { S.W = w; S.H = h; S.cur = 0; S.folders = []; S.marked = new Set();
  S.layers = [{ name: 'a', grid: blank(w, h), opacity: 1, visible: true, fid: null, clip: false, ext: new Map() }];
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.moveDrag = null; S.tool = 'pencil'; cache.dirtyAll(); };

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
t('keyboard: незарегистрированное действие игнорится', () => { assert.equal(kbd.handle(ev('KeyK')), false); });
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

console.log(`\nВсе ${n} интеграционных тестов прошли ✓`);
