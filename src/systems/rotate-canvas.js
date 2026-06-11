// Поворот всего холста на 90° по часовой.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { parseKey } from '../logic/raster.js';
import { dirtyAll } from '../core/layer-cache.js';
import { toast, t } from '../core/dom.js';

export function rotateCanvas() {
  snapshot();
  for (const L of S.layers) { const g = L.grid, out = [];
    for (let x = 0; x < S.W; x++) { const row = []; for (let y = S.H - 1; y >= 0; y--) row.push(g[y][x]); out.push(row); } L.grid = out;
    const ne = new Map();
    for (const [k, c] of L.ext) { const [ax, ay] = parseKey(k); ne.set((S.H - 1 - ay) + ',' + ax, c); }
    L.ext = ne; }
  const tw = S.W; S.W = S.H; S.H = tw; S.sel = null;
  bus.emit('selection'); dirtyAll(); bus.emit('layers'); bus.emit('fit'); toast(t('toast.rotated90'));
}

actions.register('canvas.rotate', rotateCanvas);
