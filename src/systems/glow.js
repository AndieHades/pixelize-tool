// Управляемое свечение: мягкий ореол вокруг контента слоя(ёв).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { snapshot, restore } from '../core/history.js';
import { gridBounds } from '../logic/raster.js';
import { computeGlow } from '../logic/glow.js';
import { expandCanvas } from '../core/document.js';
import { markDirty } from '../core/layer-cache.js';
import { toast } from '../core/dom.js';

export function glowLayers(targets, range, col, intensity) {
  targets = targets.filter((L) => S.layers.includes(L)); let b = null;
  for (const L of targets) { const lb = gridBounds(L.grid); if (!lb) continue;
    b = b ? { minx: Math.min(b.minx, lb.minx), miny: Math.min(b.miny, lb.miny), maxx: Math.max(b.maxx, lb.maxx), maxy: Math.max(b.maxy, lb.maxy) } : lb; }
  if (!b) { toast('Слой пуст'); return; }
  snapshot();
  const pl = Math.max(0, Math.ceil(range - b.minx)), pt = Math.max(0, Math.ceil(range - b.miny));
  const pr = Math.max(0, Math.ceil(range - (S.W - 1 - b.maxx))), pb = Math.max(0, Math.ceil(range - (S.H - 1 - b.maxy)));
  if (pl || pt || pr || pb) expandCanvas(pl, pt, pr, pb);
  let n = 0;
  for (const L of targets) { const cells = computeGlow(L.grid, S.W, S.H, range, intensity); n += cells.length;
    const g = L.grid; for (const [x, y, a] of cells) g[y][x] = [col[0], col[1], col[2], a];
    const i = S.layers.indexOf(L); if (i >= 0) markDirty(i); }
  if (!n) { const s = S.undoStack.pop(); if (s) restore(s); toast('Нечего подсветить'); return; }
  bus.emit('render'); bus.emit('layers'); toast(targets.length > 1 ? 'Свечение добавлено для папки' : 'Свечение добавлено');
}

export const glowLayer = (L, range, col, intensity) => glowLayers([L], range, col, intensity);
