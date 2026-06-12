// Юнит-тесты модулей src/ — чистый node, без DOM. Валидируют слои и логику
// по мере сборки новой архитектуры (приложение пока работает на js/*.js).
import assert from 'node:assert/strict';
import { S, MAX_LAYERS, blank, newLayer, G } from '../src/core/state.js';
import * as bus from '../src/core/bus.js';
import { hexToRgb, rgbToHex, rgb, eqc, rgbToHsv, hsvToRgb } from '../src/logic/color.js';
import { parseKey, blendOver, mergeCells, gridBounds, symmetrizeGrid, rectFill, ellipseEdges, ellipseFill } from '../src/logic/raster.js';
import { sampleGrid } from '../src/logic/sample.js';
import { medianCut, nearest, paletteFromGrid, dedupePal } from '../src/logic/quantize.js';
import { despeckle, cropEmpty } from '../src/logic/cleanup.js';
import { rotSprite } from '../src/logic/rotsprite.js';
import { computeGlow } from '../src/logic/glow.js';
import { outlineRings } from '../src/logic/outline.js';
import { bcAdjust, contrastFactor } from '../src/logic/bc.js';
import { ZOOM_MIN, ZOOM_MAX, historyCap } from '../src/config/limits.js';
import { SIZE_PRESETS, DEFAULT_DOC } from '../src/config/presets.js';
import { defaultPalette, DEFAULT_PALETTE_HEX, DEFAULT_ACTIVE } from '../src/config/palette.js';
import { t as tr } from '../src/i18n/index.js';
import { ru } from '../src/i18n/locales/ru.js';
import { en } from '../src/i18n/locales/en.js';

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
t('raster: rectFill заливает всю область', () => { const c = new Set(); rectFill(1, 1, 3, 2, (x, y) => c.add(x + ',' + y));
  assert.equal(c.size, 6); assert.ok(c.has('2,1') && c.has('3,2')); });
t('raster: ellipseEdges касается всех сторон бокса', () => { const c = new Set(); ellipseEdges(0, 0, 8, 6, (x, y) => c.add(x + ',' + y));
  let l = false, r = false, t2 = false, b = false;
  for (const k of c) { const [x, y] = parseKey(k); if (x === 0) l = true; if (x === 8) r = true; if (y === 0) t2 = true; if (y === 6) b = true;
    assert.ok(x >= 0 && x <= 8 && y >= 0 && y <= 6); }
  assert.ok(l && r && t2 && b); });
t('raster: ellipseFill заполняет середину', () => { const c = new Set(); ellipseFill(0, 0, 8, 6, (x, y) => c.add(x + ',' + y));
  assert.ok(c.has('4,3')); const edge = new Set(); ellipseEdges(0, 0, 8, 6, (x, y) => edge.add(x + ',' + y));
  assert.ok(c.size > edge.size); });
t('raster: symmetrizeGrid', () => { const g = blank(8, 4); g[0][0] = [1, 2, 3, 255]; symmetrizeGrid(g, true, false); assert.deepEqual(g[0][7], [1, 2, 3, 255]); });

// --- логика импорта/поворота ---
t('sample: сетка из картинки', () => {
  const data = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255]);
  const r = sampleGrid({ w: 2, h: 2, ch: 4, data }, 1, 0); // bgTol=0 → ничего не считаем фоном
  assert.equal(r.nx, 2); assert.equal(r.ny, 2); assert.equal(r.samples.length, 4);
  assert.deepEqual(r.grid[0][0], [10, 20, 30]);
});
t('sample: автосетка находит настоящий период, не гармонику', () => {
  // 50×50 случайных клеток, апскейл 6× → 300×300; автодетект обязан дать 50×50
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF) % 256;
  const cells = Array.from({ length: 50 }, () => Array.from({ length: 50 }, () => [rnd(), rnd(), rnd()]));
  const data = new Uint8ClampedArray(300 * 300 * 4);
  for (let y = 0; y < 300; y++) for (let x = 0; x < 300; x++) { const c = cells[(y / 6) | 0][(x / 6) | 0], i = (y * 300 + x) * 4;
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255; }
  const r = sampleGrid({ w: 300, h: 300, ch: 4, data }, 0, 0);
  assert.equal(r.nx, 50); assert.equal(r.ny, 50);
});
t('sample: прозрачные пиксели → прозрачная клетка (вырез по альфе)', () => {
  // 2×1: слева непрозрачный красный, справа полностью прозрачный
  const data = new Uint8ClampedArray([200, 10, 10, 255, 0, 0, 0, 0]);
  const r = sampleGrid({ w: 2, h: 1, ch: 4, data }, 1, 0);
  assert.deepEqual(r.grid[0][0], [200, 10, 10]); assert.equal(r.grid[0][1], null);
});
t('quantize: medianCut/nearest', () => {
  const pal = medianCut([[0, 0, 0], [255, 255, 255]], 2);
  assert.equal(pal.length, 2); assert.deepEqual(nearest([20, 20, 20], pal), [0, 0, 0]);
});
t('quantize: medianCut сливает почти-дубли, бережёт редкий цвет', () => {
  // тысяча почти одинаковых красных + один зелёный: зелёный остаётся, красные — один слот
  const cols = [];
  for (let i = 0; i < 1000; i++) cols.push([200 + (i % 11), (i % 7), (i % 5)]);
  cols.push([0, 180, 0]);
  const pal = medianCut(cols, 8);
  assert.ok(pal.some((c) => c[1] > 150), 'зелёный должен выжить');
  const reds = pal.filter((c) => c[0] > 150);
  assert.equal(reds.length, 1, 'почти одинаковые красные — один цвет');
});
t('quantize: medianCut поглощает редкие переходные тона, бережёт уникальные', () => {
  // крем ×500, чёрный ×500, редкий «анти-алиасный» крем ×5 (тот же тон, чуть темнее)
  // и редкий зелёный ×5 (уникальный тон): AA-тон должен влиться в крем, зелёный — остаться
  const cols = [];
  for (let i = 0; i < 500; i++) cols.push([240, 230, 220], [20, 20, 20]);
  for (let i = 0; i < 5; i++) cols.push([228, 216, 204], [40, 160, 50]);
  const pal = medianCut(cols, 16);
  assert.ok(pal.some((c) => c[1] > c[0] + 50), 'зелёный должен остаться');
  assert.equal(pal.filter((c) => c[0] > 180).length, 1, 'AA-крем поглощён основным кремом');
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
t('glow: ореол вокруг пикселя непустой', () => { const g = blank(8, 8); g[4][4] = [1, 1, 1, 255]; assert.ok(computeGlow(g, 8, 8, 3, 0.8).length > 0); });
t('outline: кольцо включает соседа', () => { const g = blank(8, 8); g[4][4] = [1, 1, 1, 255]; assert.ok(outlineRings(g, 8, 8, 1).some(([x, y]) => x === 4 && y === 3)); });
t('bc: яркость поднимает значение', () => { const c = bcAdjust([100, 100, 100, 255], 50, 1); assert.equal(c[0], 150); assert.equal(c[3], 255); });
t('bc: contrastFactor нейтрален при 0', () => { assert.ok(Math.abs(contrastFactor(0) - 1) < 1e-9); });
t('rotsprite: поворот не теряет контент', () => {
  const src = new Int32Array([0, 0, 0, 0xff0000ff | 0]); // один непрозрачный пиксель 2×2
  const r = rotSprite(src, 2, 2, 0, 1);
  assert.ok(r.w > 0 && r.h > 0); assert.ok(r.data.some((v) => v !== 0));
});

// --- конфигурация ---
t('config: limits разумны', () => { assert.ok(MAX_LAYERS >= 1 && ZOOM_MAX > ZOOM_MIN); });
t('config: historyCap не растёт с площадью', () => { assert.ok(historyCap(100) >= historyCap(50000) && historyCap(50000) >= historyCap(200000)); });
t('config: пресеты размеров валидны', () => { assert.ok(SIZE_PRESETS.length > 0); for (const p of SIZE_PRESETS) assert.ok(p.w > 0 && p.h > 0 && p.label); assert.ok(DEFAULT_DOC.w > 0 && DEFAULT_DOC.h > 0); });
t('config: палитра по умолчанию', () => { const p = defaultPalette(); assert.equal(p.length, DEFAULT_PALETTE_HEX.length); assert.ok(DEFAULT_ACTIVE < p.length); assert.deepEqual(p[0], [12, 12, 16]); });
t('config: S берёт дефолты из config', () => { assert.equal(S.palette.length, DEFAULT_PALETTE_HEX.length); assert.deepEqual(S.active, defaultPalette()[DEFAULT_ACTIVE]); });

t('i18n: t() даёт строку ru по умолчанию', () => { assert.equal(tr('tool.pencil'), ru['tool.pencil']); assert.equal(tr('нет.такого'), 'нет.такого'); });
t('i18n: ключи ru и en совпадают', () => { assert.deepEqual(Object.keys(ru).sort(), Object.keys(en).sort()); });

console.log(`\nВсе ${n} юнит-тестов прошли ✓`);
