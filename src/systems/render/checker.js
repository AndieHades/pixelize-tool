// Шахматка прозрачного фона под рисунком (без CanvasPattern — iPad/Safari не
// сглаживает клетки градиентом).
import { S } from '../../core/state.js';

export function drawChecker(ctx, ox, oy, z, cw, chh) {
  const W = S.W, H = S.H;
  ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, W * z, H * z); ctx.clip();
  ctx.fillStyle = '#1a1a20'; ctx.fillRect(ox, oy, W * z, H * z);
  ctx.fillStyle = '#222228';
  const x0 = Math.max(0, Math.floor((0 - ox) / z)), y0 = Math.max(0, Math.floor((0 - oy) / z));
  const x1 = Math.min(W - 1, Math.ceil((cw - ox) / z)), y1 = Math.min(H - 1, Math.ceil((chh - oy) / z));
  for (let y = y0; y <= y1; y++) {
    let x = x0; if (((x + y) & 1) === 0) x++;
    for (; x <= x1; x += 2) ctx.fillRect(ox + x * z, oy + y * z, z, z);
  }
  ctx.restore();
}
