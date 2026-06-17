// Оверлей tilemap: сетка границ клеток активного tilemap-слоя и рамка выбранной
// клетки/области. Рисуется поверх холста через событие 'overlay' (как рамка
// трансформации) — композит не трогаем.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { getTileset } from '../core/tileset.js';
import { isTilemap } from '../core/tilemap.js';
import { C } from '../styles/canvas-colors.js';

function draw({ ctx, ox, oy, z }) {
  const L = S.layers[S.cur]; if (!isTilemap(L)) return;
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return;
  const { mapW, mapH } = L.tilemap, pw = mapW * ts.tileW * z, ph = mapH * ts.tileH * z;
  ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.beginPath();
  for (let cx = 0; cx <= mapW; cx++) { const x = ox + cx * ts.tileW * z; ctx.moveTo(x, oy); ctx.lineTo(x, oy + ph); }
  for (let cy = 0; cy <= mapH; cy++) { const y = oy + cy * ts.tileH * z; ctx.moveTo(ox, y); ctx.lineTo(ox + pw, y); }
  ctx.stroke();
  const sel = S.tileSel; // выделение клеток — отдельная рамка
  if (sel && sel.li === S.cur) { ctx.globalAlpha = 0.9; ctx.lineWidth = 2;
    const x0 = Math.min(sel.x0, sel.x1), y0 = Math.min(sel.y0, sel.y1), x1 = Math.max(sel.x0, sel.x1), y1 = Math.max(sel.y0, sel.y1);
    ctx.strokeRect(ox + x0 * ts.tileW * z, oy + y0 * ts.tileH * z, (x1 - x0 + 1) * ts.tileW * z, (y1 - y0 + 1) * ts.tileH * z); }
  ctx.restore();
}

export function mount() { bus.on('overlay', draw); }
