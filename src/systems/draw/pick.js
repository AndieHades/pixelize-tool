// Пипетка: берём итоговый цвет точки по всем слоям в активный цвет.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { toast, t } from '../../core/dom.js';
import { compositeAt } from '../../core/layer-cache.js';

export function pickAt(gx, gy) {
  if (gx < 0 || gy < 0 || gx >= S.W || gy >= S.H) return;
  const c = compositeAt(gx, gy); if (!c) return;
  S.active = c.slice();
  bus.emit('palette'); toast(t('toast.colorPicked'));
}

actions.register('draw.pickAt', pickAt);
