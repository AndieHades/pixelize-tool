// Щипок двумя пальцами по строкам слоёв сводит их (и все слои между) в один —
// автоматический merge. Сливаются слои под пальцами, выбор роли не играет.
import { $ } from '../../core/dom.js';
import { PINCH_MERGE } from '../../config/timings.js';
import { mergeRange } from './ops.js';

const pts = new Map();
let start = 0, rows = null, merged = false, active = false;
export const pinchActive = () => active;

function rowAt(x, y) { const el = document.elementFromPoint(x, y), r = el && el.closest ? el.closest('#lay-list .lrow[data-li]') : null; return r ? +r.dataset.li : -1; }
function dist() { const v = [...pts.values()]; return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y); }

export function mountPinch() { const box = $('lay-list'); if (!box) return;
  box.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { active = true; merged = false; start = dist();
      const ids = [...pts.values()].map((p) => rowAt(p.x, p.y)); rows = (ids[0] >= 0 && ids[1] >= 0 && ids[0] !== ids[1]) ? ids : null; } });
  box.addEventListener('pointermove', (e) => { const p = pts.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2 && rows && !merged && start > 40 && dist() < start * PINCH_MERGE) { merged = true; mergeRange(rows[0], rows[1]); } });
  const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) { active = false; rows = null; } };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
}
