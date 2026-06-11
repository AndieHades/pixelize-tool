// Отражение активного слоя по горизонтали/вертикали.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { parseKey } from '../logic/raster.js';
import { markDirty } from '../core/layer-cache.js';
import { toast } from '../core/dom.js';

export function flipLayer(horiz) {
  snapshot(); const L = S.layers[S.cur], g = L.grid;
  if (horiz) for (const r of g) r.reverse(); else g.reverse();
  const ne = new Map();
  for (const [k, c] of L.ext) { const [ax, ay] = parseKey(k);
    ne.set(horiz ? (S.W - 1 - ax) + ',' + ay : ax + ',' + (S.H - 1 - ay), c); }
  L.ext = ne; markDirty(S.cur);
  bus.emit('render'); bus.emit('layers'); toast(horiz ? 'Отражено по горизонтали' : 'Отражено по вертикали');
}

actions.register('layer.flipH', () => flipLayer(true));
actions.register('layer.flipV', () => flipLayer(false));
