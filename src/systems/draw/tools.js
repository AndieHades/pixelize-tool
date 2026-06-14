// Регистрация обработчиков холста для инструментов рисования. Ввод вызывает
// down/move/up; координаты клетки приходят готовыми из системы ввода.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { registerTool } from '../../core/canvas-handlers.js';
import { snapshot } from '../../core/history.js';
import { toast, t } from '../../core/dom.js';
import { SHAPE_SNAP_MS } from '../../config/timings.js';
import { stamp } from './stamp.js';
import { line, commitLine } from './shapes.js';
import { beginStroke, afterStroke } from './stroke.js';
import { qsBegin, qsMove, qsRelease } from './quickshape.js';

let last = null;

// --- удержание фигуры на месте → ровный квадрат/круг (тач-альтернатива Shift) ---
let snapTimer = null, snapCell = null, snapped = false;
const canSnap = () => S.tool === 'rect' || S.tool === 'ellipse';
function square(gx, gy) { const dx = gx - S.lineStart[0], dy = gy - S.lineStart[1], s = Math.max(Math.abs(dx), Math.abs(dy));
  return [S.lineStart[0] + (dx < 0 ? -1 : 1) * s, S.lineStart[1] + (dy < 0 ? -1 : 1) * s]; }
function armSnap(gx, gy) { clearTimeout(snapTimer);
  if (snapped || !canSnap()) return;
  snapTimer = setTimeout(() => { if (!S.lineStart) return; snapped = true;
    const [nx, ny] = square(gx, gy); S.linePrev = [S.lineStart[0], S.lineStart[1], nx, ny]; bus.emit('render');
    toast(t(S.tool === 'ellipse' ? 'toast.shapeCircle' : 'toast.shapeSquare')); }, SHAPE_SNAP_MS); }
function endSnap() { clearTimeout(snapTimer); snapTimer = null; snapCell = null; snapped = false; }

const brush = {
  down({ gx, gy }) { beginStroke(); qsBegin(gx, gy); stamp(gx, gy); last = [gx, gy]; bus.emit('render'); },
  move({ gx, gy }) { if (qsMove(gx, gy)) { bus.emit('render'); return; } // QuickShape выровнял форму — raw больше не рисуем
    if (last) line(last[0], last[1], gx, gy); else stamp(gx, gy); last = [gx, gy]; bus.emit('render'); },
  up() { qsRelease(); S.stroke = false; last = null; afterStroke(); bus.emit('render'); }, // удержал → коммитит ровную форму, иначе raw остаётся
};

const shape = {
  down({ gx, gy }) { S.lineStart = [gx, gy]; S.linePrev = [gx, gy, gx, gy];
    snapCell = [gx, gy]; snapped = false; armSnap(gx, gy); bus.emit('render'); },
  move({ gx, gy, e }) { if (!S.lineStart) return;
    if (!snapCell || gx !== snapCell[0] || gy !== snapCell[1]) { snapCell = [gx, gy]; armSnap(gx, gy); } // двинулся в новую клетку — заново ждём удержания
    if (canSnap() && (snapped || (e && e.shiftKey))) [gx, gy] = square(gx, gy); // удержание или Shift — квадрат/круг
    S.linePrev = [S.lineStart[0], S.lineStart[1], gx, gy]; bus.emit('render'); },
  up() { endSnap(); if (S.linePrev) commitLine(); },
};

const fill = { down({ gx, gy }) { snapshot(); stamp(gx, gy); bus.emit('render'); afterStroke(); } };

for (const t of ['pencil', 'eraser', 'adjust']) registerTool(t, brush);
for (const t of ['line', 'rect', 'ellipse']) registerTool(t, shape);
registerTool('fill', fill);
