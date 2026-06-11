// Юнит-тесты модулей src/ — чистый node, без DOM. Валидируют слои и логику
// по мере сборки новой архитектуры (приложение пока работает на js/*.js).
import assert from 'node:assert/strict';
import { S, MAX_LAYERS, blank, newLayer, G } from '../src/core/state.js';
import * as bus from '../src/core/bus.js';
import { hexToRgb, rgbToHex, rgb, eqc, rgbToHsv, hsvToRgb } from '../src/logic/color.js';
import { parseKey, blendOver, mergeCells, gridBounds, symmetrizeGrid } from '../src/logic/raster.js';
import { sampleGrid } from '../src/logic/sample.js';
import { medianCut, nearest, paletteFromGrid, dedupePal } from '../src/logic/quantize.js';
import { despeckle, cropEmpty } from '../src/logic/cleanup.js';
import { rotSprite } from '../src/logic/rotsprite.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };

t('state: дефолты документа', () => { assert.equal(S.W, 32); assert.equal(S.layers.length, 1); assert.equal(MAX_LAYERS, 8); });
t('state: blank/newLayer', () => { const L = newLayer('x', 4, 3); assert.equal(L.grid.length, 3); assert.equal(L.grid[0].length, 4); assert.equal(L.grid[0][0], null); });
t('state: G() — сетка текущего слоя', () => { assert.equal(G(), S.layers[S.cur].grid); });

t('bus: on/emit синхронно', () => { let got = 0; const off = bus.on('ping', (v) => { got = v; }); bus.emit('ping', 7); assert.equal(got, 7); off(); bus.emit('ping', 9); assert.equal(got, 7); });

t('color: hex↔rgb', () => { assert.deepEqual(hexToRgb('#ff7a18'), [255, 122, 24]); assert.equal(rgbToHex([255, 122, 24]), '#ff7a18'); assert.equal(rgb([1, 2, 3]), 'rgb(1,2,3)'); });
t('color: eqc по RGB', () => { assert.ok(eqc([1, 2, 3], [1, 2, 3, 200])); assert.ok(!eqc([1, 2, 3], [1, 2, 4])); });
t('color: hsv round-trip', () => { const [h, s, v] = rgbToHsv(255, 122, 24); assert.deepEqual(hsvToRgb(h, s, v), [255, 122, 24]); });

t('raster: parseKey', () => { assert.deepEqual(parseKey('3,7'), [3, 7]); assert.deepEqual(parseKey('-2,40'), [-2, 40]); });
t('raster: blendOver непрозрачный', () => { assert.deepEqual(blendOver([255, 0, 0], null, 1), [255, 0, 0, 255]); });
t('raster: blendOver 50%', () => { assert.deepEqual(blendOver([255, 255, 255], [0, 0, 0, 255], 0.5), [128, 128, 128, 255]); });
t('raster: mergeCells пусто', () => { assert.equal(mergeCells(null, null, 1), null); assert.deepEqual(mergeCells(null, [9, 9, 9, 255], 1), [9, 9, 9, 255]); });
t('raster: gridBounds', () => { const g = blank(8, 8); assert.equal(gridBounds(g), null); g[2][5] = [1, 1, 1, 255]; assert.deepEqual(gridBounds(g), { minx: 5, miny: 2, maxx: 5, maxy: 2 }); });
t('raster: symmetrizeGrid', () => { const g = blank(8, 4); g[0][0] = [1, 2, 3, 255]; symmetrizeGrid(g, true, false); assert.deepEqual(g[0][7], [1, 2, 3, 255]); });

// --- логика импорта/поворота ---
t('sample: сетка из картинки', () => {
  const data = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255]);
  const r = sampleGrid({ w: 2, h: 2, ch: 4, data }, 1, 0); // bgTol=0 → ничего не считаем фоном
  assert.equal(r.nx, 2); assert.equal(r.ny, 2); assert.equal(r.samples.length, 4);
  assert.deepEqual(r.grid[0][0], [10, 20, 30]);
});
t('quantize: medianCut/nearest', () => {
  const pal = medianCut([[0, 0, 0], [255, 255, 255]], 2);
  assert.equal(pal.length, 2); assert.deepEqual(nearest([20, 20, 20], pal), [0, 0, 0]);
});
t('quantize: paletteFromGrid по частоте', () => {
  const g = [[[1, 1, 1, 255], [1, 1, 1, 255]], [[2, 2, 2, 255], null]];
  assert.deepEqual(paletteFromGrid(g)[0], [1, 1, 1]);
});
t('quantize: dedupePal', () => { assert.deepEqual(dedupePal([[1, 1, 1], [1, 1, 1]]), [[1, 1, 1]]); assert.deepEqual(dedupePal([]), [[12, 12, 16]]); });
t('cleanup: cropEmpty до контура', () => {
  const g = [[null, null, null], [null, [9, 9, 9, 255], null], [null, null, null]];
  const c = cropEmpty(g); assert.equal(c.length, 1); assert.equal(c[0].length, 1); assert.deepEqual(c[0][0], [9, 9, 9, 255]);
});
t('cleanup: despeckle убирает одиночку', () => {
  const g = [[null, null, null], [null, [9, 9, 9, 255], null], [null, null, null]];
  assert.equal(despeckle(g, 3, 3)[1][1], null);
});
t('rotsprite: поворот не теряет контент', () => {
  const src = new Int32Array([0, 0, 0, 0xff0000ff | 0]); // один непрозрачный пиксель 2×2
  const r = rotSprite(src, 2, 2, 0, 1);
  assert.ok(r.w > 0 && r.h > 0); assert.ok(r.data.some((v) => v !== 0));
});

console.log(`\nВсе ${n} юнит-тестов прошли ✓`);
