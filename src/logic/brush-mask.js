// Чистая логика кисти-штампа: превращает карту покрытия кончика (0..255) в
// бинарную пиксельную маску заданного размера и синтезирует круглый кончик.
// Без DOM и state — только данные.

// cov = { w, h, data:Uint8Array(0..255) }; size — большая сторона маски в клетках.
// Кадрируем по содержимому, ресемплим с сохранением пропорций, нормируем по
// максимуму и режем порогом. Возвращает { w, h, data:Uint8Array(0/1) } или null.
export function coverageToMask(cov, size, opts = {}) {
  const { threshold = 0.5, floor = 8, invert = false } = opts;
  const { w, h, data } = cov, n = Math.max(1, size | 0);
  const val = invert ? (i) => 255 - data[i] : (i) => data[i];
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (val(y * w + x) > floor) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null; // пусто
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, scale = n / Math.max(bw, bh);
  const tw = Math.max(1, Math.round(bw * scale)), th = Math.max(1, Math.round(bh * scale));
  // идём по клеткам маски и усредняем покрытие исходной области (работает на
  // увеличение и на уменьшение: при апскейле клетки делят один исходный пиксель).
  const avg = new Float64Array(tw * th); let max = 0;
  for (let ty = 0; ty < th; ty++) {
    const sy0 = y0 + (ty * bh / th | 0), sy1 = y0 + Math.max((ty + 1) * bh / th | 0, (ty * bh / th | 0) + 1);
    for (let tx = 0; tx < tw; tx++) {
      const sx0 = x0 + (tx * bw / tw | 0), sx1 = x0 + Math.max((tx + 1) * bw / tw | 0, (tx * bw / tw | 0) + 1);
      let s = 0, c = 0;
      for (let sy = sy0; sy < sy1 && sy <= y1; sy++) for (let sx = sx0; sx < sx1 && sx <= x1; sx++) { s += val(sy * w + sx); c++; }
      const a = c ? s / c : 0; avg[ty * tw + tx] = a; if (a > max) max = a; } }
  if (max <= 0) return null;
  const out = new Uint8Array(tw * th);
  for (let i = 0; i < out.length; i++) out[i] = avg[i] / max >= threshold ? 1 : 0;
  return { w: tw, h: th, data: out };
}

// Бинаризует мелкий grain в дизер-тайл (тайлится в координатах холста). Без
// кадрирования и нормировки — паттерн целиком. null, если тайл вырожден
// (всё вкл/выкл — дизеринга нет). cov = { w, h, data:Uint8Array(0..255) }.
export function coverageToTile(cov, threshold = 0.5) {
  const { w, h, data } = cov, out = new Uint8Array(w * h), cut = threshold * 255;
  let on = 0;
  for (let i = 0; i < out.length; i++) { const v = data[i] >= cut ? 1 : 0; out[i] = v; on += v; }
  if (on === 0 || on === out.length) return null;
  return { w, h, data: out };
}

// Круглый кончик size×size (дефолт для Procreate-кистей без Shape.png).
export function maskRound(size) {
  const n = Math.max(1, size | 0), out = new Uint8Array(n * n), r = n / 2, c = (n - 1) / 2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = x - c, dy = y - c; out[y * n + x] = dx * dx + dy * dy <= r * r ? 1 : 0; }
  return { w: n, h: n, data: out };
}
