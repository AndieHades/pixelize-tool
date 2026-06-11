// Юнит-тесты модулей src/ — чистый node, без DOM. Валидируют слои и логику
// по мере сборки новой архитектуры (приложение пока работает на js/*.js).
import assert from 'node:assert/strict';
import { S, MAX_LAYERS, blank, newLayer, G } from '../src/core/state.js';
import * as bus from '../src/core/bus.js';
import { hexToRgb, rgbToHex, rgb, eqc, rgbToHsv, hsvToRgb } from '../src/logic/color.js';
import { parseKey, blendOver, mergeCells, gridBounds, symmetrizeGrid } from '../src/logic/raster.js';

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

console.log(`\nВсе ${n} юнит-тестов прошли ✓`);
