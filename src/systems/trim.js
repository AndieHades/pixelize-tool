// Trim — обрезать пустые поля впритык к рисунку (по всем слоям).
import { S } from '../core/state.js';
import * as actions from '../core/actions.js';
import { gridBounds } from '../logic/raster.js';
import { applyCropRect } from '../core/document.js';
import { toast } from '../core/dom.js';

export function trimCanvas() {
  let x0 = S.W, y0 = S.H, x1 = -1, y1 = -1;
  for (const L of S.layers) { const b = gridBounds(L.grid); if (!b) continue;
    if (b.minx < x0) x0 = b.minx; if (b.maxx > x1) x1 = b.maxx; if (b.miny < y0) y0 = b.miny; if (b.maxy > y1) y1 = b.maxy; }
  if (x1 < 0) { toast('Холст пуст'); return; }
  if (x0 === 0 && y0 === 0 && x1 === S.W - 1 && y1 === S.H - 1) { toast('Обрезать нечего'); return; }
  applyCropRect(x0, y0, x1, y1);
}

actions.register('canvas.trim', trimCanvas);
