// Trim — подгоняет холст под реальные границы ВСЕХ слоёв (включая скрытые и
// пиксели за краем в ext): есть пустые поля → обрезает; контент выходит за холст
// → расширяет, открывая его; уже впритык → ничего не делает.
import { S } from '../core/state.js';
import * as actions from '../core/actions.js';
import { boundsWithExt } from '../logic/raster.js';
import { applyCropRect } from '../core/document.js';
import { toast, t } from '../core/dom.js';

export function trimCanvas() {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const L of S.layers) { const b = boundsWithExt(L.grid, L.ext); if (!b) continue; // скрытые слои тоже учитываем
    if (b.minx < x0) x0 = b.minx; if (b.maxx > x1) x1 = b.maxx; if (b.miny < y0) y0 = b.miny; if (b.maxy > y1) y1 = b.maxy; }
  if (x1 === -Infinity) { toast(t('toast.canvasEmpty')); return; }
  if (x0 === 0 && y0 === 0 && x1 === S.W - 1 && y1 === S.H - 1) { toast(t('toast.nothingTrim')); return; } // холст уже впритык
  applyCropRect(x0, y0, x1, y1); // меньше холста → обрезка; больше (x0<0 / x1>W-1) → расширение и показ
}

actions.register('canvas.trim', trimCanvas);
