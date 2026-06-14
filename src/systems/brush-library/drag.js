// Перетаскивание кистей (как строки слоёв): вертикаль — перестановка в списке,
// бросок на строку набора слева — перенос кисти в этот набор. Горизонталь
// остаётся смахиванию (тач). Мышь — ЛКМ-перетаскивание.
import { $ } from '../../core/dom.js';
import { dragGhost } from '../../core/drag-ghost.js';
import { moveToSet, reorder } from './data.js';

export function dragBrush(el, b, rerender) {
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY, pop = $('brush-pop');
    let started = false, ghost = null, dropRow = null, dropBelow = false, dropSet = null;
    const clearDrop = () => { if (dropRow) dropRow.classList.remove('drop-above', 'drop-below'); if (dropSet) dropSet.classList.remove('drop-into'); dropRow = null; dropSet = null; };

    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!started) { if (Math.hypot(dx, dy) < 7 || Math.abs(dy) < Math.abs(dx)) return; // вертикаль → drag
        started = true; el.classList.add('dragging'); try { el.setPointerCapture(e.pointerId); } catch (err) {}
        ghost = dragGhost(el, el.getBoundingClientRect().width, 1); ghost.move(ev.clientX, ev.clientY); }
      const pr = pop.getBoundingClientRect();
      const gx = Math.max(pr.left + 8, Math.min(ev.clientX, pr.right - 8)), gy = Math.max(pr.top + 8, Math.min(ev.clientY, pr.bottom - 8));
      ghost.move(gx, gy);
      const tEl = document.elementFromPoint(gx, gy), to = tEl && tEl.closest ? tEl : null;
      const setRow = to ? to.closest('#brush-sets .brow.set') : null, bRow = to ? to.closest('#brush-list .brow.brush:not(.dragging)') : null;
      clearDrop();
      if (setRow && setRow.dataset.set !== b.setId) { dropSet = setRow; setRow.classList.add('drop-into'); }
      else if (bRow) { const r = bRow.getBoundingClientRect(); dropBelow = gy > r.top + r.height / 2; dropRow = bRow; bRow.classList.add(dropBelow ? 'drop-below' : 'drop-above'); }
    };
    const up = async () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up);
      if (ghost) ghost.remove(); el.classList.remove('dragging');
      const set = dropSet, row = dropRow, below = dropBelow; clearDrop();
      if (!started) return;
      if (set) { await moveToSet(b, set.dataset.set); rerender(); }
      else if (row) { await reorder(b, row.dataset.id, below); rerender(); }
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  });
}
