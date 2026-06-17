// Оверлей tilemap: сетка границ клеток активного tilemap-слоя и рамка выбранной
// клетки/области. Рисуется поверх холста через событие 'overlay' (как рамка
// трансформации) — композит не трогаем.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { getTileset, getTile } from '../core/tileset.js';
import { isTilemap, inMap, stampTileId, rollRandomTile } from '../core/tilemap.js';
import { transformTile } from '../logic/tile-transform.js';
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
  drawBrushPreview(ctx, ox, oy, z, ts, L);
}

// превью тайла на кисти: показывает, ЧЕМ заполняешь (с учётом флипов/паттерна/
// random), ровно в клетке под курсором. Random фиксируется на клетку → клик
// ставит именно то, что в превью.
let lastCell = '';
function drawBrushPreview(ctx, ox, oy, z, ts, L) {
  if (S.tool !== 'tilebrush' || S.tileMode !== 'paint' || !S.hoverPx) return;
  const cx = Math.floor(S.hoverPx[0] / ts.tileW), cy = Math.floor(S.hoverPx[1] / ts.tileH);
  if (!inMap(L.tilemap, cx, cy)) return;
  const key = cx + ',' + cy; if (S.tileRandom && key !== lastCell) rollRandomTile(); lastCell = key;
  const px0 = ox + cx * ts.tileW * z, py0 = oy + cy * ts.tileH * z;
  const id = stampTileId(cx, cy), tile = id != null && getTile(ts, id);
  ctx.save();
  if (tile) { const g = transformTile(tile.grid, S.tileFlags); ctx.globalAlpha = 0.75;
    for (let y = 0; y < ts.tileH; y++) for (let x = 0; x < ts.tileW; x++) { const c = g[y] && g[y][x]; if (!c) continue;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(c.length > 3 ? c[3] : 255) / 255})`; ctx.fillRect(px0 + x * z, py0 + y * z, z + 0.6, z + 0.6); } }
  ctx.globalAlpha = 1; ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
  ctx.strokeRect(px0, py0, ts.tileW * z, ts.tileH * z); ctx.restore();
}

export function mount() { bus.on('overlay', draw); }
