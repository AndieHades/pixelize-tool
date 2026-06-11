// Яркость/контраст одной клетки. Чисто.
export function bcAdjust(c, bri, f) { const ap = (v) => Math.max(0, Math.min(255, Math.round(f * (v - 128) + 128 + bri)));
  return c.length > 3 ? [ap(c[0]), ap(c[1]), ap(c[2]), c[3]] : [ap(c[0]), ap(c[1]), ap(c[2])]; }

export const contrastFactor = (cc) => (259 * (cc + 255)) / (255 * (259 - cc));
