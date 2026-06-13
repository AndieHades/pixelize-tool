// Заливка связной области (4-связность) с учётом выделения-маски.
import { S, G } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { eqc } from '../../logic/color.js';
import { floodRegion } from '../../logic/flood.js';
import { inSel } from '../../core/selection.js';
import { referenceIndexFor } from '../../core/layers.js';
import { $ } from '../../core/dom.js';
import { setCell } from './cells.js';

export function flood(x, y) {
  if (x < 0 || y < 0 || x >= S.W || y >= S.H) return;
  const g = G(), ri = referenceIndexFor(S.cur), src = ri >= 0 ? S.layers[ri].grid : g, target = src[y][x], to = S.active;
  if (src === g && eqc(target, to)) return;
  for (const [cx, cy] of floodRegion(src, x, y, inSel)) setCell(cx, cy, to);
}

// заливка как самостоятельное действие (снимок + перерисовка) — для drop-to-fill
export function floodAt(x, y) { snapshot(); flood(x, y); bus.emit('render'); bus.emit('layers'); }
actions.register('edit.floodAt', floodAt);

// бросили цвет (палитра/кружок) на холст: есть выделение — заливаем его целиком,
// иначе — заливка связной области под точкой (пустой слой, замкнутый контур).
// Координаты — client-пиксели указателя (одинаково для мыши и тача).
export function dropColorAt(color, clientX, clientY) {
  const cv = $('cv'); if (document.elementFromPoint(clientX, clientY) !== cv) return;
  S.active = color.slice(); bus.emit('palette'); bus.emit('color-sync');
  if (S.sel) { actions.run('selection.fill'); return; }
  const r = cv.getBoundingClientRect();
  const gx = Math.floor((clientX - r.left - S.view.ox) / S.view.zoom), gy = Math.floor((clientY - r.top - S.view.oy) / S.view.zoom);
  if (gx >= 0 && gy >= 0 && gx < S.W && gy < S.H) floodAt(gx, gy);
}
actions.register('edit.dropColorAt', dropColorAt);
