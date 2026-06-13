// Заливка связной области (4-связность) с учётом выделения-маски.
import { S, G } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { eqc } from '../../logic/color.js';
import { inSel } from '../../core/selection.js';
import { $ } from '../../core/dom.js';
import { setCell } from './cells.js';

export function flood(x, y) {
  if (x < 0 || y < 0 || x >= S.W || y >= S.H) return;
  const g = G(), target = g[y][x], to = S.active;
  if (eqc(target, to)) return;
  const st = [[x, y]];
  while (st.length) { const [cx, cy] = st.pop(); if (cx < 0 || cy < 0 || cx >= S.W || cy >= S.H || !inSel(cx, cy)) continue;
    const c = g[cy][cx]; if (!(eqc(c, target) || (!c && !target))) continue;
    setCell(cx, cy, to); st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); }
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
