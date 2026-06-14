// Чистое превью-мазок кисти: штампует маску кончика вдоль S-кривой в сетку
// занятости W×H (как образец мазка в Procreate). Без DOM — рисует панель.
import { coverageToMask, maskRound, coverageToTile } from './brush-mask.js';
import { BRUSH_MASK } from '../config/brush-import.js';

export function previewStroke(brush, W, H, size) {
  const out = new Uint8Array(W * H);
  const s = size || Math.max(3, Math.min(H - 2, 6));
  const m = brush.cov ? coverageToMask(brush.cov, s, BRUSH_MASK) : maskRound(s);
  if (!m) return { w: W, h: H, data: out };
  const g = brush.grain ? coverageToTile(brush.grain, BRUSH_MASK.threshold) : null;
  const ox = m.w >> 1, oy = m.h >> 1, midY = H / 2, amp = Math.max(0, (H - m.h - 2) / 2);
  const x0 = ox + 1, x1 = W - ox - 1;
  for (let x = x0; x < x1; x++) {
    const cy = Math.round(midY + amp * Math.sin((x - x0) / (x1 - x0) * Math.PI * 2));
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
      if (!m.data[j * m.w + i]) continue;
      const px = x - ox + i, py = cy - oy + j;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      if (g && !g.data[((py % g.h + g.h) % g.h) * g.w + ((px % g.w + g.w) % g.w)]) continue;
      out[py * W + px] = 1;
    }
  }
  return { w: W, h: H, data: out };
}
