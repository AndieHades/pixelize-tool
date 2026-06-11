// Drop-shadow: силуэт каждого целевого слоя отдельным слоем под ним, со сдвигом.
import { S, newLayer } from '../core/state.js';
import * as bus from '../core/bus.js';
import { snapshot } from '../core/history.js';
import { expandCanvas } from '../core/document.js';
import { dirtyAll } from '../core/layer-cache.js';
import { toast } from '../core/dom.js';
import { MAX_LAYERS } from '../config/limits.js';

export function dropShadowLayers(targets, dx, dy, col, op) {
  targets = targets.filter((L) => S.layers.includes(L));
  let any = false, minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const L of targets) for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (L.grid[y][x]) { any = true;
    const sx = x + dx, sy = y + dy; if (sx < minx) minx = sx; if (sy < miny) miny = sy; if (sx > maxx) maxx = sx; if (sy > maxy) maxy = sy; }
  if (!any) { toast('Слой пуст'); return; }
  if (S.layers.length + targets.length > MAX_LAYERS) { toast('Максимум 8 слоёв — удали лишние'); return; }
  snapshot();
  const pl = Math.max(0, -minx), pt = Math.max(0, -miny), pr = Math.max(0, maxx - (S.W - 1)), pb = Math.max(0, maxy - (S.H - 1));
  if (pl || pt || pr || pb) expandCanvas(pl, pt, pr, pb); // не лезет — раздвигаем холст
  const a = Math.round(op * 255);
  for (const L of targets.slice().sort((a2, b2) => S.layers.indexOf(a2) - S.layers.indexOf(b2))) {
    const sh = newLayer('Тень', S.W, S.H); sh.fid = L.fid;
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (L.grid[y][x]) { const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < S.W && ny < S.H) sh.grid[ny][nx] = [col[0], col[1], col[2], a]; }
    const li = S.layers.indexOf(L); S.layers.splice(li, 0, sh); S.cur = li + 1; // тень под исходным слоем
  }
  S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(targets.length > 1 ? 'Тень создана для папки' : 'Тень создана');
}

export const dropShadow = (L, dx, dy, col, op) => dropShadowLayers([L], dx, dy, col, op);
