// Пипетка: берём итоговый цвет точки по всем слоям в активный цвет.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { $, toast } from '../../core/dom.js';
import { compositeAt } from '../../core/layer-cache.js';

export function pickAt(gx, gy) {
  if (gx < 0 || gy < 0 || gx >= S.W || gy >= S.H) return;
  const c = compositeAt(gx, gy); if (!c) return;
  S.active = c.slice();
  $('picker').value = '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  bus.emit('palette'); toast('Цвет подобран');
}
