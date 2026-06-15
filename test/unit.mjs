// Юнит-тесты модулей src/ — чистый node, без DOM. Валидируют слои и логику
// по мере сборки новой архитектуры (приложение пока работает на js/*.js).
import assert from 'node:assert/strict';
import { S, MAX_LAYERS, blank, newLayer, cloneLayer, G } from '../src/core/state.js';
import * as bus from '../src/core/bus.js';
import { hexToRgb, rgbToHex, rgb, eqc, rgbToHsv, hsvToRgb } from '../src/logic/color.js';
import { parseKey, blendOver, mergeCells, gridBounds, alphaBounds, boundsWithExt, symmetrizeGrid, rectFill, ellipseEdges, ellipseFill, cloneGrid } from '../src/logic/raster.js';
import { clamp, clamp01, clamp255, clampRound } from '../src/logic/math.js';
import { floodRegion } from '../src/logic/flood.js';
import { parsePsdEffects } from '../src/logic/psd-effects.js';
import { sampleGrid } from '../src/logic/sample.js';
import { medianCut, nearest, paletteFromGrid, dedupePal, exactPaletteFromRgba, samplesFromRgba } from '../src/logic/quantize.js';
import { despeckle, cropEmpty } from '../src/logic/cleanup.js';
import { rotSprite } from '../src/logic/rotsprite.js';
import { computeGlow } from '../src/logic/glow.js';
import { outlineRings } from '../src/logic/outline.js';
import { bcAdjust, contrastFactor } from '../src/logic/bc.js';
import { adjustColor } from '../src/logic/adjustment.js';
import { generateTints, generateShades, generateHarmonyBaseColors, generateTintShadeScalesForHarmony } from '../src/logic/tint-shade.js';
import { sortPalette } from '../src/logic/palette-sort.js';
import { polygonToMask } from '../src/logic/poly-mask.js';
import { combineMask } from '../src/logic/mask-ops.js';
import { coverageToMask, maskRound, coverageToTile } from '../src/logic/brush-mask.js';
import { unarchiveBrush } from '../src/core/brush-import/bplist.js';
import { importAbr } from '../src/core/brush-import/abr.js';
import { previewStroke, stampIcon } from '../src/logic/brush-preview.js';
import { footprintMask, footprintRotation } from '../src/logic/brush-cursor.js';
import { keyName, eventKey } from '../src/logic/key-code.js';
import { packSet, unpackSet } from '../src/core/brush-pack.js';
import { brushMode, stampSize, planDab, brushHasShape } from '../src/logic/brush-stamp.js';
import { recognizeShape } from '../src/logic/quickshape.js';
import { expandMask, mirrorDeltas } from '../src/logic/symmetry.js';
import { ZOOM_MIN, ZOOM_MAX, historyCap } from '../src/config/limits.js';
import { SIZE_PRESETS, DEFAULT_DOC } from '../src/config/presets.js';
import { defaultPalette, DEFAULT_PALETTE_HEX, DEFAULT_ACTIVE } from '../src/config/palette.js';
import { FLAGS_DEFAULT } from '../src/config/defaults.js';
import { t as tr } from '../src/i18n/index.js';
import { ru } from '../src/i18n/locales/ru.js';
import { en } from '../src/i18n/locales/en.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };

t('state: дефолты документа', () => { assert.equal(S.W, 32); assert.equal(S.layers.length, 1); assert.equal(S.cur, 0); assert.equal(MAX_LAYERS, Infinity); });
t('state: Pixel Perfect выключен по умолчанию', () => { assert.equal(FLAGS_DEFAULT.pixelPerfect, false); assert.equal(S.ppOn, false); });
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
t('raster: alphaBounds (Trim по итоговым пикселям, в т.ч. запечённым эффектам)', () => {
  const W = 4, H = 4, d = new Uint8Array(W * H * 4); assert.equal(alphaBounds(d, W, H), null); // всё прозрачно
  const set = (x, y) => { d[(y * W + x) * 4 + 3] = 255; }; set(1, 2); set(3, 1);
  assert.deepEqual(alphaBounds(d, W, H), { minx: 1, miny: 1, maxx: 3, maxy: 2 }); });
t('raster: boundsWithExt учитывает пиксели за краем', () => { const g = blank(4, 4); g[1][1] = [1, 1, 1, 255];
  const ext = new Map([['-2,5', [2, 2, 2, 255]], ['6,0', [3, 3, 3, 255]]]);
  assert.deepEqual(boundsWithExt(g, ext), { minx: -2, miny: 0, maxx: 6, maxy: 5 });
  assert.equal(boundsWithExt(blank(2, 2), new Map()), null); });
t('psd-effects: мусорный буфер не падает, эффектов нет', () => { const buf = new ArrayBuffer(32), dv = new DataView(buf), u8 = new Uint8Array(buf);
  const r = parsePsdEffects(dv, u8, 0); assert.deepEqual(r.effects, []); assert.ok(Array.isArray(r.warnings)); });
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
t('flood: область останавливается на непрозрачном контуре', () => { const g = blank(5, 5), line = [1, 1, 1, 255];
  for (let y = 0; y < 5; y++) g[y][2] = line;
  const cells = floodRegion(g, 0, 0); assert.equal(cells.length, 10);
  assert.ok(cells.every(([x]) => x < 2)); });

// --- логика импорта/поворота ---
t('math: clamp/clamp01/clamp255/clampRound', () => {
  assert.equal(clamp(5, 0, 10), 5); assert.equal(clamp(-3, 0, 10), 0); assert.equal(clamp(20, 0, 10), 10);
  assert.equal(clamp01(1.4), 1); assert.equal(clamp01(-0.2), 0); assert.equal(clamp01(0.5), 0.5);
  assert.equal(clamp255(300), 255); assert.equal(clamp255(-1), 0);
  assert.equal(clampRound(7.6, 0, 100), 8); assert.equal(clampRound(2.4, 5, 99), 5);
});
t('cloneGrid: глубокая копия, клетки не делят ссылок', () => {
  const g = [[[1, 2, 3, 255], null], [null, [4, 5, 6, 255]]];
  const c = cloneGrid(g);
  assert.deepEqual(c, g); assert.notEqual(c[0][0], g[0][0]);
  c[0][0][0] = 99; assert.equal(g[0][0][0], 1); // правка копии не трогает оригинал
});
t('cloneLayer: копирует все поля, overrides перекрывают, grid/ext независимы', () => {
  const L = { name: 'A', opacity: 0.5, visible: false, fid: 7, clip: true, lock: true, alphaLock: true,
    reference: true, symLock: true, ext: new Map([['1,1', [9, 9, 9, 255]]]), grid: [[[1, 2, 3, 255]]], effects: [] };
  const c = cloneLayer(L, { name: 'A copy', reference: false });
  assert.equal(c.name, 'A copy'); assert.equal(c.reference, false); // override
  assert.equal(c.opacity, 0.5); assert.equal(c.fid, 7); assert.equal(c.clip, true); assert.equal(c.alphaLock, true); assert.equal(c.symLock, true);
  assert.notEqual(c.ext, L.ext); assert.notEqual(c.grid, L.grid);
  c.grid[0][0][0] = 50; assert.equal(L.grid[0][0][0], 1);
});
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
t('sample: «Детализация» выше натуральной не апскейлит (потолок 1:1)', () => {
  // 51×128 исходник, cell<1 (ручная детализация > ширины) — клеток не больше пикселей
  const data = new Uint8ClampedArray(51 * 128 * 4).fill(200);
  const r = sampleGrid({ w: 51, h: 128, ch: 4, data }, 51 / 120, 0); // detail=120 → cell≈0.425
  assert.equal(r.nx, 51); assert.equal(r.ny, 128);
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
t('quantize: exactPaletteFromRgba сохраняет все цвета strip-палитры', () => {
  const d = new Uint8ClampedArray(46 * 4);
  for (let i = 0; i < 46; i++) { d[i * 4] = i; d[i * 4 + 1] = 80 + i; d[i * 4 + 2] = 160 - i; d[i * 4 + 3] = 255; }
  const r = exactPaletteFromRgba(d, 64);
  assert.equal(r.overflow, false); assert.equal(r.colors.length, 46);
  assert.deepEqual(r.colors[0], [0, 80, 160]); assert.deepEqual(r.colors[45], [45, 125, 115]);
});
t('quantize: exactPaletteFromRgba сообщает переполнение, samplesFromRgba берёт непрозрачные', () => {
  const d = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 0, 7, 8, 9, 255]);
  assert.deepEqual(samplesFromRgba(d), [[1, 2, 3], [7, 8, 9]]);
  const r = exactPaletteFromRgba(d, 1); assert.equal(r.overflow, true); assert.equal(r.colors.length, 2);
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
t('adjustment: saturation -100 делает цвет серым без потери альфы', () => { const c = adjustColor([100, 50, 50, 128], { saturation: -100 });
  assert.deepEqual(c, [100, 100, 100, 128]); });
t('adjustment: hue сдвигает тон', () => { const c = adjustColor([255, 0, 0, 255], { hue: 120 });
  assert.deepEqual(c, [0, 255, 0, 255]); });
t('rotsprite: поворот не теряет контент', () => {
  const src = new Int32Array([0, 0, 0, 0xff0000ff | 0]); // один непрозрачный пиксель 2×2
  const r = rotSprite(src, 2, 2, 0, 1);
  assert.ok(r.w > 0 && r.h > 0); assert.ok(r.data.some((v) => v !== 0));
});

// --- Tint & Shade Generator ---
t('tint-shade: тинты — ровно 5 цветов, первый = база', () => {
  const ti = generateTints([100, 50, 20]);
  assert.equal(ti.length, 5); assert.deepEqual(ti[0], [100, 50, 20]);
});
t('tint-shade: тинт светлеет к белому по формуле', () => {
  assert.deepEqual(generateTints([100, 50, 20])[1], [131, 91, 67]); // +20%: 100+(155*.2)=131 …
  assert.deepEqual(generateTints([0, 0, 0])[4], [204, 204, 204]); // +80% от чёрного
});
t('tint-shade: шейды — ровно 5 цветов, темнеют к чёрному', () => {
  const sh = generateShades([200, 100, 50]);
  assert.equal(sh.length, 5); assert.deepEqual(sh[0], [200, 100, 50]);
  assert.deepEqual(sh[4], [40, 20, 10]); // ×(1-.8)
});
t('tint-shade: число базовых цветов гармонии', () => {
  const b = [200, 80, 60];
  assert.equal(generateHarmonyBaseColors(b, 'complementary').length, 1);
  assert.equal(generateHarmonyBaseColors(b, 'splitComplementary').length, 2);
  assert.equal(generateHarmonyBaseColors(b, 'analogous').length, 2);
  assert.equal(generateHarmonyBaseColors(b, 'triadic').length, 2);
});
t('tint-shade: каждая шкала гармонии — база + 4 тинта/шейда (по 5)', () => {
  const scales = generateTintShadeScalesForHarmony([200, 80, 60], 'triadic');
  assert.equal(scales.length, 2);
  for (const s of scales) { assert.equal(s.tints.length, 5); assert.equal(s.shades.length, 5); assert.deepEqual(s.tints[0], s.base); }
});

t('palette-sort: тон группами (коричневый не лезет к зелёным), серые впереди, внутри светлое→тёмное', () => {
  const gray = [128, 128, 128], brown = [139, 90, 43], gLight = [168, 208, 141], gDark = [78, 107, 58];
  const out = sortPalette([gDark, brown, gLight, gray]);
  assert.deepEqual(out, [gray, brown, gLight, gDark]); // серый, затем коричневый (тон ~30), затем зелёные (тон ~95) светлый→тёмный
});

// --- выделение: растеризация контура и операции над масками ---
t('poly-mask: прямоугольный контур заполняет клетки внутри', () => {
  const m = polygonToMask([[1, 1], [4, 1], [4, 4], [1, 4]], 8, 8);
  assert.ok(m.has('2,2') && m.has('3,3')); assert.ok(!m.has('0,0') && !m.has('5,5')); });
t('poly-mask: вырожденный контур (<3 точек) даёт пустое множество', () => {
  assert.equal(polygonToMask([[1, 1], [2, 2]], 8, 8).size, 0); });
t('poly-mask: треугольник заполняется по even-odd', () => {
  const m = polygonToMask([[0, 0], [6, 0], [0, 6]], 8, 8);
  assert.ok(m.has('1,1')); assert.ok(!m.has('5,5')); });
t('poly-mask: клипуется границами холста', () => {
  const m = polygonToMask([[-5, -5], [3, -5], [3, 3], [-5, 3]], 4, 4);
  for (const k of m) { const [x, y] = parseKey(k); assert.ok(x >= 0 && y >= 0 && x < 4 && y < 4); } });
t('mask-ops: replace заменяет, не глядя на базу', () => {
  const out = combineMask(new Set(['0,0']), new Set(['2,2']), 'replace');
  assert.ok(out.has('2,2') && !out.has('0,0')); });
t('mask-ops: add объединяет', () => {
  const out = combineMask(new Set(['0,0']), new Set(['2,2']), 'add');
  assert.ok(out.has('0,0') && out.has('2,2')); });
t('mask-ops: subtract вычитает', () => {
  const out = combineMask(new Set(['0,0', '1,1']), new Set(['1,1']), 'subtract');
  assert.ok(out.has('0,0') && !out.has('1,1')); });
t('mask-ops: intersect оставляет общее', () => {
  const out = combineMask(new Set(['0,0', '1,1']), new Set(['1,1', '2,2']), 'intersect');
  assert.ok(out.has('1,1') && !out.has('0,0') && !out.has('2,2')); });
t('mask-ops: без базы возвращает копию новой области', () => {
  const add = new Set(['3,3']); const out = combineMask(null, add, 'subtract');
  assert.ok(out.has('3,3') && out !== add); });

// --- QuickShape: распознавание формы штриха ---
t('quickshape: прямой штрих → line', () => { const pts = []; for (let i = 0; i <= 12; i++) pts.push([i, 0]);
  const sh = recognizeShape(pts); assert.equal(sh && sh.type, 'line'); assert.deepEqual([sh.x0, sh.y0, sh.x1, sh.y1], [0, 0, 12, 0]); });
t('quickshape: замкнутый прямоугольный штрих → rect по bounds', () => { const pts = [], add = (x, y) => pts.push([x, y]);
  for (let x = 0; x <= 12; x++) add(x, 0); for (let y = 1; y <= 9; y++) add(12, y);
  for (let x = 11; x >= 0; x--) add(x, 9); for (let y = 8; y >= 0; y--) add(0, y);
  const sh = recognizeShape(pts); assert.equal(sh && sh.type, 'rect'); assert.deepEqual([sh.x0, sh.y0, sh.x1, sh.y1], [0, 0, 12, 9]); });
t('quickshape: овальный штрих → ellipse', () => { const pts = [], cx = 10, cy = 7, rx = 10, ry = 6;
  for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; pts.push([Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a))]); }
  assert.equal(recognizeShape(pts).type, 'ellipse'); });
t('quickshape: круговой штрих → ellipse с равными сторонами', () => { const pts = [], c = 12, r = 9;
  for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; pts.push([Math.round(c + r * Math.cos(a)), Math.round(c + r * Math.sin(a))]); }
  const sh = recognizeShape(pts); assert.equal(sh.type, 'ellipse'); assert.equal(sh.x1 - sh.x0, sh.y1 - sh.y0); });
t('quickshape: каракули и короткий штрих не распознаются (raw остаётся)', () => {
  assert.equal(recognizeShape([[0, 0], [9, 1], [1, 8], [8, 2], [2, 9], [0, 4]]), null);
  assert.equal(recognizeShape([[0, 0], [1, 1]]), null); });

// --- импорт кистей (brush-mask) ---
t('brush-mask: круглый кончик 1×1 — одна клетка', () => { const m = maskRound(1); assert.deepEqual([m.w, m.h], [1, 1]); assert.equal(m.data[0], 1); });
t('brush-mask: круглый кончик 5×5 — центр вкл, углы выкл', () => { const m = maskRound(5);
  assert.equal(m.data[2 * 5 + 2], 1); assert.equal(m.data[0], 0); assert.equal(m.data[4], 0); });
t('brush-mask: точечный кончик (1×1 покрытие) → сплошной квадрат size×size', () => {
  const m = coverageToMask({ w: 1, h: 1, data: new Uint8Array([254]) }, 4);
  assert.deepEqual([m.w, m.h], [4, 4]); assert.ok(m.data.every((v) => v === 1)); });
t('brush-mask: сохраняет пропорции по большей стороне', () => {
  const data = new Uint8Array(8 * 2).fill(255); // широкий кончик 8×2
  const m = coverageToMask({ w: 8, h: 2, data }, 8); assert.equal(Math.max(m.w, m.h), 8); assert.ok(m.h < m.w); });
t('brush-mask: пустое покрытие → null', () => { assert.equal(coverageToMask({ w: 4, h: 4, data: new Uint8Array(16) }, 4), null); });
t('brush-mask: дизер-тайл сводится к фундаментальному периоду (шахматка → 2×2)', () => {
  const d = new Uint8Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) d[y * 8 + x] = (x + y) % 2 ? 255 : 0;
  const tile = coverageToTile({ w: 8, h: 8, data: d }); assert.deepEqual([tile.w, tile.h], [2, 2]);
  assert.deepEqual([...tile.data], [0, 1, 1, 0]); });
t('brush-mask: дизер 4×4 (.#../пусто) → период 2×2', () => {
  const d = new Uint8Array([0, 255, 0, 255, 0, 0, 0, 0, 0, 255, 0, 255, 0, 0, 0, 0]);
  const tile = coverageToTile({ w: 4, h: 4, data: d }); assert.deepEqual([tile.w, tile.h], [2, 2]);
  assert.deepEqual([...tile.data], [0, 1, 0, 0]); });
t('brush-mask: вырожденный grain (всё вкл/выкл) → null', () => {
  assert.equal(coverageToTile({ w: 2, h: 2, data: new Uint8Array([255, 255, 255, 255]) }), null);
  assert.equal(coverageToTile({ w: 2, h: 2, data: new Uint8Array(4) }), null); });

// --- bplist (Brush.archive → параметры) ---
t('bplist: распаковка NSKeyedArchiver → имя и параметры', () => {
  // минимальный bplist00: обёртка {$top,$objects}; CF$UID индексируют $objects.
  const str = (s) => Uint8Array.from([0x50 | s.length, ...[...s].map((c) => c.charCodeAt(0))]);
  const real = (v) => { const b = new Uint8Array(9); b[0] = 0x23; new DataView(b.buffer).setFloat64(1, v); return b; };
  const uid = (n) => Uint8Array.from([0x80, n]);
  const arr = (r) => Uint8Array.from([0xa0 | r.length, ...r]);
  const dict = (k, v) => Uint8Array.from([0xd0 | k.length, ...k, ...v]);
  const parts = [
    dict([1, 2], [3, 6]), str('$top'), str('$objects'), dict([4], [5]), str('root'), uid(0),
    arr([7, 14, 15, 16]), dict([8, 9, 10], [11, 12, 13]), str('name'), str('plotSpacing'), str('plotJitter'),
    uid(1), uid(2), uid(3), str('Test'), real(1), real(2.5),
  ];
  const offs = []; let pos = 8; for (const p of parts) { offs.push(pos); pos += p.length; }
  const tr = new Uint8Array(32), dv = new DataView(tr.buffer); tr[6] = 1; tr[7] = 1;
  dv.setBigUint64(8, BigInt(parts.length)); dv.setBigUint64(16, 0n); dv.setBigUint64(24, BigInt(pos));
  const blocks = [new TextEncoder().encode('bplist00'), ...parts, Uint8Array.from(offs), tr];
  const buf = new Uint8Array(blocks.reduce((a, b) => a + b.length, 0)); let o = 0; for (const b of blocks) { buf.set(b, o); o += b.length; }
  const a = unarchiveBrush(buf);
  assert.equal(a.name, 'Test'); assert.equal(a.plotSpacing, 1); assert.equal(a.plotJitter, 2.5);
});

await (async () => { // .abr v1: один семплированный кончик 2×2 (raw)
  const ab = new Uint8Array(48), dv = new DataView(ab.buffer); let q = 0;
  dv.setUint16(q, 1); q += 2; dv.setUint16(q, 1); q += 2; // version=1, count=1
  dv.setUint16(q, 2); q += 2; dv.setUint32(q, 38); q += 4; // type=sampled, len=38
  q += 4; dv.setUint16(q, 25); q += 2; ab[q++] = 0; q += 8; // misc, spacing, antialias, bounds(short)
  dv.setInt32(q, 0); q += 4; dv.setInt32(q, 0); q += 4; dv.setInt32(q, 2); q += 4; dv.setInt32(q, 2); q += 4; // top,left,bottom,right
  dv.setUint16(q, 8); q += 2; ab[q++] = 0; // depth=8, comp=raw
  ab[q++] = 10; ab[q++] = 250; ab[q++] = 250; ab[q++] = 10; // 2×2 bitmap
  const list = await importAbr(ab.buffer);
  assert.equal(list.length, 1); assert.equal(list[0].source, 'abr');
  assert.deepEqual([list[0].cov.w, list[0].cov.h], [2, 2]);
  n++; console.log('  ok   abr: v1 sampled tip → запись кисти');
})();

t('brush-pack: round-trip набора кистей (маска Uint8Array)', () => {
  const brushes = [{ name: 'Star', source: 'custom', shape: 'shape', baseSize: 6, params: { spacing: 1, jitter: 0 },
    cov: { w: 2, h: 2, data: new Uint8Array([0, 255, 200, 0]) }, grain: { w: 2, h: 2, data: new Uint8Array([1, 0, 0, 1]) } }];
  const out = unpackSet(packSet('Decor', brushes));
  assert.equal(out.name, 'Decor'); assert.equal(out.brushes.length, 1);
  const b = out.brushes[0]; assert.equal(b.name, 'Star'); assert.equal(b.baseSize, 6); assert.equal(b.params.spacing, 1);
  assert.ok(b.cov.data instanceof Uint8Array); assert.deepEqual([...b.cov.data], [0, 255, 200, 0]); assert.deepEqual([...b.grain.data], [1, 0, 0, 1]);
});
t('brush-pack: чужой файл отвергается', () => { assert.throws(() => unpackSet('{"format":"other"}')); });

t('brush-stamp: режим выводится по параметрам и переопределяется явно', () => {
  assert.equal(brushMode({}), 'flow'); assert.equal(brushMode({ spacing: 1 }), 'single');
  assert.equal(brushMode({ jitter: 2 }), 'scatter'); assert.equal(brushMode({ mode: 'flow', jitter: 2 }), 'flow'); });
t('brush-stamp: stampSize — натуральный для кисти из выделения, иначе слайдер', () => {
  assert.equal(stampSize({ baseSize: 20 }, 8, 8), 20); assert.equal(stampSize({ baseSize: 20 }, 4, 8), 10); assert.equal(stampSize({}, 5, 8), 5); });
t('brush-stamp: brushHasShape — нестандартные кисти (baseSize/форма), не базовые', () => {
  assert.equal(brushHasShape({ baseSize: 8 }), true);            // из выделения
  assert.equal(brushHasShape({ cov: { w: 12, h: 9 } }), true);  // импортированная форма
  assert.equal(brushHasShape({ cov: { w: 1, h: 1 } }), false);  // базовый квадрат
  assert.equal(brushHasShape({ cov: null }), false);            // базовый круг/дизер
  assert.equal(brushHasShape(null), false);
});
t('brush-stamp: planDab — flow штампует всегда, single соблюдает spacing', () => {
  assert.deepEqual(planDab({}, 4, { acc: 0 }, 3, 7), { cx: 3, cy: 7, size: 4 }); // flow
  const st = { acc: 0 }; const a = planDab({ mode: 'single', spacing: 1 }, 4, st, 0, 0); // gap=4
  assert.ok(a && a.cx === 0); assert.equal(planDab({ mode: 'single', spacing: 1 }, 4, st, 1, 0), null); });

t('brush-preview: круглая кисть рисует непустой мазок в полосе', () => {
  const pr = previewStroke({ cov: null, shape: 'round' }, 40, 16); let on = 0; for (const v of pr.data) on += v;
  assert.deepEqual([pr.w, pr.h], [40, 16]); assert.ok(on > 0, 'мазок непустой');
});
t('brush-preview: дизеринг в иконке совпадает с реальным footprint', () => {
  const b = { cov: null, shape: 'round', grain: { w: 2, h: 2, data: new Uint8Array([0, 1, 1, 0]) } };
  const fp = footprintMask(b, 6, 64, 0, 0), ic = stampIcon(b, 10, 6, 0, 0);
  let fpn = 0, icn = 0; for (const v of fp.data) fpn += v; for (const v of ic.data) icn += v;
  assert.ok(fpn > 0 && fpn < fp.data.length); assert.equal(icn, fpn);
});

t('brush-cursor: без кисти — сплошной квадрат size×size', () => {
  const m = footprintMask(null, 4, 64);
  assert.deepEqual([m.w, m.h], [4, 4]); let on = 0; for (const v of m.data) on += v; assert.equal(on, 16);
});
t('brush-cursor: круглая кисть — непустая маска отпечатка', () => {
  const m = footprintMask({ cov: null, shape: 'round' }, 8, 64); let on = 0; for (const v of m.data) on += v;
  assert.ok(m.w === 8 && m.h === 8 && on > 0);
});
t('brush-cursor: dither/grain входит в маску отпечатка', () => {
  const b = { cov: null, shape: 'round', grain: { w: 2, h: 2, data: new Uint8Array([0, 1, 1, 0]) } };
  const m = footprintMask(b, 8, 64, 0, 0), full = footprintMask({ cov: null, shape: 'round' }, 8, 64);
  let on = 0, all = 0; for (const v of m.data) on += v; for (const v of full.data) all += v;
  assert.ok(on > 0 && on < all);
});
t('brush-cursor: размер маски следует за натуральным размером кисти', () => {
  const m = footprintMask({ cov: null, baseSize: 20 }, 64, 64); assert.equal(Math.max(m.w, m.h), 20);
});
t('brush-cursor: поворот по умолчанию 0, читается из params', () => {
  assert.equal(footprintRotation(null), 0); assert.equal(footprintRotation({ params: {} }), 0);
  assert.equal(footprintRotation({ params: { rotation: 1.5 } }), 1.5);
});

t('key-code: физическая клавиша не зависит от раскладки (D работает в кириллице)', () => {
  assert.equal(keyName('KeyD'), 'd'); // e.key был бы 'в' в русской раскладке — code стабилен
  assert.equal(keyName('Digit5'), '5'); assert.equal(keyName('BracketLeft'), '[');
  assert.equal(keyName('Delete'), 'delete'); assert.equal(keyName('F7'), null);
});
t('key-code: eventKey покрывает и буквы, и модификаторы по позиции', () => {
  assert.equal(eventKey({ code: 'KeyD' }), 'd'); assert.equal(eventKey({ code: 'AltLeft' }), 'alt');
  assert.equal(eventKey({ code: 'ControlRight' }), 'control'); assert.equal(eventKey({ code: 'F7' }), null);
});

// --- Symmetry mapper ---
t('symmetry: expandMask зеркалит по X (лево-право)', () => { const m = expandMask(new Set(['1,2']), 8, 8, true, false);
  assert.ok(m.has('1,2') && m.has('6,2')); assert.equal(m.size, 2); });
t('symmetry: expandMask зеркалит по Y (верх-низ)', () => { const m = expandMask(new Set(['1,2']), 8, 8, false, true);
  assert.ok(m.has('1,2') && m.has('1,5')); });
t('symmetry: двойная симметрия даёт 4 копии', () => { const m = expandMask(new Set(['1,2']), 8, 8, true, true);
  assert.equal(m.size, 4); assert.ok(m.has('6,5')); });
t('symmetry: диагональные оси зеркалят по 45 и -45 градусам', () => {
  let m = expandMask(new Set(['1,3']), 6, 6, false, false, { d1: true });
  assert.ok(m.has('1,3') && m.has('3,1'));
  m = expandMask(new Set(['1,2']), 6, 6, false, false, { d2: true });
  assert.ok(m.has('1,2') && m.has('3,4'));
});
t('symmetry: без осей маска не меняется', () => { assert.deepEqual([...expandMask(new Set(['1,2']), 8, 8, false, false)], ['1,2']); });
t('symmetry: mirrorDeltas инвертирует знак по активной оси', () => {
  assert.deepEqual(mirrorDeltas(3, 2, true, false), [[3, 2], [-3, 2]]);
  assert.deepEqual(mirrorDeltas(3, 2, false, true), [[3, 2], [3, -2]]);
  assert.deepEqual(mirrorDeltas(3, 2, true, true), [[3, 2], [-3, 2], [3, -2], [-3, -2]]); });

// --- конфигурация ---
t('config: limits разумны', () => { assert.ok(MAX_LAYERS >= 1 && ZOOM_MAX > ZOOM_MIN); });
t('config: historyCap не растёт с площадью', () => { assert.ok(historyCap(100) >= historyCap(50000) && historyCap(50000) >= historyCap(200000)); });
t('config: пресеты размеров валидны', () => { assert.ok(SIZE_PRESETS.length > 0); for (const p of SIZE_PRESETS) assert.ok(p.w > 0 && p.h > 0 && p.label); assert.ok(DEFAULT_DOC.w > 0 && DEFAULT_DOC.h > 0); });
t('config: палитра по умолчанию', () => { const p = defaultPalette(); assert.equal(p.length, DEFAULT_PALETTE_HEX.length); assert.ok(DEFAULT_ACTIVE < p.length); assert.deepEqual(p[0], [12, 12, 16]); });
t('config: S берёт дефолты из config', () => { assert.equal(S.palette.length, DEFAULT_PALETTE_HEX.length); assert.deepEqual(S.active, defaultPalette()[DEFAULT_ACTIVE]); });

t('i18n: t() даёт строку ru по умолчанию', () => { assert.equal(tr('tool.pencil'), ru['tool.pencil']); assert.equal(tr('нет.такого'), 'нет.такого'); });
t('i18n: ключи ru и en совпадают', () => { assert.deepEqual(Object.keys(ru).sort(), Object.keys(en).sort()); });
console.log(`\nВсе ${n} юнит-тестов прошли ✓`);
