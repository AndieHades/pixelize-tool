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

console.log(`\nВсе ${n} интеграционных тестов прошли ✓`);
