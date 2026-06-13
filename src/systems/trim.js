// Trim — подгоняет холст под реальные границы ВСЕХ слоёв: непустые пиксели,
// пиксели за краем (ext) И охват видимых эффектов (обводка/свечение/тень). Есть
// пустые поля → обрезает; контент/эффект выходят за холст → расширяет; впритык → ничего.
import { S } from '../core/state.js';
import * as actions from '../core/actions.js';
import { boundsWithExt } from '../logic/raster.js';
import { effectReach } from '../logic/layer-effects.js';
import { folderChain } from '../core/layers.js';
import { applyCropRect } from '../core/document.js';
import { toast, t } from '../core/dom.js';

const grow = (b, R) => ({ minx: b.minx - R.l, miny: b.miny - R.t, maxx: b.maxx + R.r, maxy: b.maxy + R.b });
const merge = (a, b) => (a ? { minx: Math.min(a.minx, b.minx), miny: Math.min(a.miny, b.miny), maxx: Math.max(a.maxx, b.maxx), maxy: Math.max(a.maxy, b.maxy) } : b);

export function trimCanvas() {
  let g = null; const add = (b) => { if (b) g = merge(g, b); };
  for (const L of S.layers) { let b = boundsWithExt(L.grid, L.ext); if (!b) continue; // скрытые слои тоже учитываем
    if (L.effects && L.effects.length) b = grow(b, effectReach(L.effects)); add(b); }
  for (const f of S.folders) { if (!f.effects || !f.effects.length) continue; // эффект папки — вокруг силуэта вложенных слоёв
    let fb = null; for (const L of S.layers) { if (!folderChain(L.fid).some((x) => x.id === f.id)) continue; fb = merge(fb, boundsWithExt(L.grid, L.ext)); }
    if (fb) add(grow(fb, effectReach(f.effects))); }
  if (!g) { toast(t('toast.canvasEmpty')); return; }
  if (g.minx === 0 && g.miny === 0 && g.maxx === S.W - 1 && g.maxy === S.H - 1) { toast(t('toast.nothingTrim')); return; } // холст уже впритык
  applyCropRect(g.minx, g.miny, g.maxx, g.maxy); // меньше холста → обрезка; больше → расширение и показ
}

actions.register('canvas.trim', trimCanvas);
