// Заливка связной области (4-связность) с учётом выделения-маски.
import { S, G } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { eqc } from '../../logic/color.js';
import { inSel } from '../../core/selection.js';
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
