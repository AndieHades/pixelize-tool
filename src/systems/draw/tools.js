// Регистрация обработчиков холста для инструментов рисования. Ввод вызывает
// down/move/up; координаты клетки приходят готовыми из системы ввода.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { registerTool } from '../../core/canvas-handlers.js';
import { snapshot } from '../../core/history.js';
import { stamp } from './stamp.js';
import { line, commitLine } from './shapes.js';
import { beginStroke, afterStroke } from './stroke.js';

let last = null;

const brush = {
  down({ gx, gy }) { beginStroke(); stamp(gx, gy); last = [gx, gy]; bus.emit('render'); },
  move({ gx, gy }) { if (last) line(last[0], last[1], gx, gy); else stamp(gx, gy); last = [gx, gy]; bus.emit('render'); },
  up() { S.stroke = false; last = null; afterStroke(); bus.emit('render'); },
};

const shape = {
  down({ gx, gy }) { S.lineStart = [gx, gy]; S.linePrev = [gx, gy, gx, gy]; bus.emit('render'); },
  move({ gx, gy }) { if (S.lineStart) { S.linePrev = [S.lineStart[0], S.lineStart[1], gx, gy]; bus.emit('render'); } },
  up() { if (S.linePrev) commitLine(); },
};

const fill = { down({ gx, gy }) { snapshot(); stamp(gx, gy); bus.emit('render'); afterStroke(); } };
const pick = { down({ gx, gy }) { stamp(gx, gy); } }; // stamp при tool=pick подбирает цвет и ставит карандаш

for (const t of ['pencil', 'eraser', 'adjust']) registerTool(t, brush);
for (const t of ['line', 'rect']) registerTool(t, shape);
registerTool('fill', fill);
registerTool('pick', pick);
