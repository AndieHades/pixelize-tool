// Чистые числовые помощники. Один источник для повсеместного «зажима» значений —
// не переписывай Math.max(a, Math.min(b, v)) локально.
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const clamp01 = (v) => clamp(v, 0, 1);
export const clamp255 = (v) => clamp(v, 0, 255);
// зажим с округлением — для целочисленных размеров/шагов
export const clampRound = (v, min, max) => clamp(Math.round(v), min, max);
