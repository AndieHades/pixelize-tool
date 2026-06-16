// Отражение по горизонтали/вертикали выбранной цели: слой/папка — её слои,
// фон — весь документ (все слои).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { parseKey } from '../logic/raster.js';
import { markDirty } from '../core/layer-cache.js';
import { toast, t } from '../core/dom.js';
import { opTargets } from '../core/targets.js';

function flipOne(L, horiz) { const g = L.grid;
  if (horiz) for (const r of g) r.reverse(); else g.reverse();
  const ne = new Map();
  for (const [k, c] of L.ext) { const [ax, ay] = parseKey(k);
    ne.set(horiz ? (S.W - 1 - ax) + ',' + ay : ax + ',' + (S.H - 1 - ay), c); }
  L.ext = ne; markDirty(S.layers.indexOf(L)); }

export function flipLayer(horiz) {
  const ts = opTargets(); if (!ts.length) return;
  snapshot();
  for (const L of ts) flipOne(L, horiz);
  bus.emit('render'); bus.emit('layers'); toast(horiz ? t('toast.flippedH') : t('toast.flippedV'));
}

actions.register('layer.flipH', () => flipLayer(true));
actions.register('layer.flipV', () => flipLayer(false));
