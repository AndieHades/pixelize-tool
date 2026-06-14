// Автоцентрирование объекта слоя: сдвигает содержимое так, чтобы его габаритный
// центр совпал с центром холста (или центром выделения, если оно активно).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { boundsWithExt } from '../logic/raster.js';
import { shiftLayerGrid } from '../core/document.js';
import { markDirty } from '../core/layer-cache.js';
import { toast, t } from '../core/dom.js';

export function centerLayer() {
  const L = S.layers[S.cur]; if (L.lock) return;
  const b = boundsWithExt(L.grid, L.ext); if (!b) { toast(t('toast.layerEmpty')); return; }
  const cx = (b.minx + b.maxx + 1) / 2, cy = (b.miny + b.maxy + 1) / 2; // центр габаритов объекта
  const tx = S.sel ? (S.sel.x0 + S.sel.x1 + 1) / 2 : S.W / 2;            // цель: центр выделения или холста
  const ty = S.sel ? (S.sel.y0 + S.sel.y1 + 1) / 2 : S.H / 2;
  const dx = Math.round(tx - cx), dy = Math.round(ty - cy);
  if (!dx && !dy) { toast(t('toast.centered')); return; }
  snapshot(); shiftLayerGrid(L, dx, dy); markDirty(S.cur); // вне холста — в ext, объект не теряется
  bus.emit('render'); bus.emit('layers'); toast(t('toast.centered'));
}

actions.register('layer.center', centerLayer);
