// Инструменты «линия» и «прямоугольник»: интерполяция Брезенхемом и фиксация
// превью в слой (углы целы — pp молчит при stroke=false).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { bres, parseKey, rectEdges, rectFill, ellipseEdges, ellipseFill } from '../../logic/raster.js';
import { polygonToMask } from '../../logic/poly-mask.js';
import { maskRound } from '../../logic/brush-mask.js';
import { stamp } from './stamp.js';
import { setCell } from './cells.js';
import { afterStroke } from './stroke.js';

export const line = (x0, y0, x1, y1) => bres(x0, y0, x1, y1, stamp);

export function commitLine() {
  const lp = S.linePrev; S.linePrev = null; S.lineStart = null;
  if (!lp) { bus.emit('render'); return; }
  snapshot();
  if (S.tool === 'rect') (S.fillShape.rect ? rectFill : rectEdges)(lp[0], lp[1], lp[2], lp[3], stamp);
  else if (S.tool === 'ellipse') (S.fillShape.ellipse ? ellipseFill : ellipseEdges)(lp[0], lp[1], lp[2], lp[3], stamp);
  else line(lp[0], lp[1], lp[2], lp[3]);
  actions.run('color.used', S.active);
  bus.emit('render'); afterStroke();
}

function contourCell() {
  return [S.active[0], S.active[1], S.active[2], 255];
}

export function contourDab(cx, cy, cell = contourCell()) {
  const m = maskRound(S.brushes.pencil.size), ox = m.w >> 1, oy = m.h >> 1;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.data[y * m.w + x]) setCell(cx - ox + x, cy - oy + y, cell);
}

export function contourStroke(x0, y0, x1, y1, cell = contourCell()) {
  bres(x0, y0, x1, y1, (x, y) => contourDab(x, y, cell));
}

export function commitContour(pts = S.linePath && S.linePath.pts) {
  const wasStroke = S.stroke;
  S.linePath = null; S.lineStart = null; S.linePrev = null;
  if (!pts || pts.length < 2) {
    S.stroke = false;
    if (wasStroke && pts && pts.length) actions.run('color.used', S.active);
    bus.emit('render'); if (wasStroke) { bus.emit('layers'); afterStroke(); }
    return;
  }
  if (!wasStroke) snapshot();
  const cell = contourCell();
  const mask = pts.length >= 3 ? polygonToMask(pts, S.W, S.H) : new Set();
  for (const k of mask) { const [x, y] = parseKey(k); setCell(x, y, cell); }
  const n = pts.length;
  for (let i = wasStroke ? n - 1 : 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; contourStroke(a[0], a[1], b[0], b[1], cell); }
  S.stroke = false;
  actions.run('color.used', S.active);
  bus.emit('render'); bus.emit('layers'); afterStroke();
}
