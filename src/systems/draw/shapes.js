// Инструменты «линия» и «прямоугольник»: интерполяция Брезенхемом и фиксация
// превью в слой (углы целы — pp молчит при stroke=false).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { bres, rectEdges, rectFill, ellipseEdges, ellipseFill } from '../../logic/raster.js';
import { stamp } from './stamp.js';
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
