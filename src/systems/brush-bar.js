// Левая полоса кисти: размер сверху, пипетка по центру, прозрачность снизу.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { $ } from '../core/dom.js';
import { brushKey } from '../core/tools.js';
import { doUndo, doRedo } from '../core/history.js';
import { BP_SMAX } from '../config/limits.js';

const curBrush = brushKey;

function vslPos(fillId, knobId, frac) { const f = Math.max(0, Math.min(1, frac)), knob = $(knobId), sl = knob.parentElement;
  $(fillId).style.height = f * 100 + '%'; knob.style.bottom = Math.max(0, (sl.clientHeight - knob.offsetHeight) * f) + 'px'; }

export function syncBars() { const b = S.brushes[curBrush()];
  vslPos('bp-size-fill', 'bp-size-knob', (b.size - 1) / (BP_SMAX - 1));
  vslPos('bp-op-fill', 'bp-op-knob', b.op); }

let bbValT = null;
function showBbVal(slId, txt) { const v = $('bb-val'), r = $(slId).getBoundingClientRect();
  v.textContent = txt; v.style.left = (r.right + 8) + 'px'; v.style.top = r.top + r.height / 2 + 'px'; v.classList.add('on');
  clearTimeout(bbValT); bbValT = setTimeout(() => v.classList.remove('on'), 700); }

function vslDrag(slId, onFrac) { const sl = $(slId); let on = false;
  const set = (e) => { const r = sl.getBoundingClientRect(); onFrac(Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height))); };
  sl.addEventListener('pointerdown', (e) => { on = true; sl.setPointerCapture(e.pointerId); set(e); });
  sl.addEventListener('pointermove', (e) => { if (on) set(e); });
  const end = () => { on = false; }; sl.addEventListener('pointerup', end); sl.addEventListener('pointercancel', end); }

export function mount() {
  vslDrag('bp-size-sl', (f) => { S.brushes[curBrush()].size = Math.max(1, Math.min(BP_SMAX, Math.round(1 + f * (BP_SMAX - 1))));
    syncBars(); showBbVal('bp-size-sl', S.brushes[curBrush()].size + ' px'); bus.emit('render'); });
  vslDrag('bp-op-sl', (f) => { S.brushes[curBrush()].op = Math.max(0, Math.min(1, f));
    syncBars(); showBbVal('bp-op-sl', Math.round(S.brushes[curBrush()].op * 100) + '%'); });
  $('bb-undo').onclick = doUndo; $('bb-redo').onclick = doRedo; // bb-pick — кнопка пипетки: клик/удержание ведёт Eyedropper System
  window.addEventListener('resize', syncBars);
  bus.on('tool', syncBars);
  bus.on('brush', syncBars); // живое обновление ползунка при жесте Brush Size Modifier
  syncBars();
}
