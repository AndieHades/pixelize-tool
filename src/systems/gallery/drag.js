// Перетаскивание плиток: долгое нажатие (палец/мышь) → драг; задержать над
// плиткой → «сложить» (папка/внутрь папки); бросок на «назад» → на уровень
// выше; иначе бросок → переупорядочить. Призрак — общий core/drag-ghost.
import { DRAG_THRESHOLD } from '../../config/timings.js';
import { $ } from '../../core/dom.js';
import { dragGhost } from '../../core/drag-ghost.js';

export function attachDrag(tile, id, ctx) {
  tile.addEventListener('pointerdown', (e) => {
    if (ctx.selecting() || (e.pointerType === 'mouse' && e.button)) return;
    const sx = e.clientX, sy = e.clientY; let started = false, ghost = null, dwell = null, overId = null, stackTo = null, onBack = false;
    const grid = ctx.gridEl(), back = $('gal-back'), dragKind = tile.dataset.kind;
    const hold = setTimeout(() => begin(sx, sy), e.pointerType === 'touch' ? 250 : 1e9); // тач: долгий тап; мышь: по сдвигу
    function begin(x, y) { if (started) return; started = true; try { tile.setPointerCapture(e.pointerId); } catch (err) {}
      tile.classList.add('dragging'); ghost = dragGhost(tile, 120); ghost.move(x, y); }
    const clearMarks = () => { grid.querySelectorAll('.drop-into,.drop-before').forEach((n) => n.classList.remove('drop-into', 'drop-before')); back.classList.remove('drop-up'); };
    const move = (ev) => {
      if (!started) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > DRAG_THRESHOLD) { clearTimeout(hold); begin(ev.clientX, ev.clientY); } else return; }
      ghost.move(ev.clientX, ev.clientY);
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const overBack = back.style.display !== 'none' && el && el.closest && el.closest('#gal-back'); // бросок на «назад» — на уровень выше
      if (overBack) { if (!onBack) { onBack = true; clearTimeout(dwell); stackTo = null; clearMarks(); back.classList.add('drop-up'); } return; }
      onBack = false;
      const tg = el && el.closest ? el.closest('.gal-tile') : null;
      const tid = tg && tg !== tile ? tg.dataset.id : null;
      if (tid !== overId) { overId = tid; clearTimeout(dwell); if (stackTo) { stackTo = null; } clearMarks();
        if (tg && tg !== tile) { tg.classList.add('drop-before'); // папку на файл не вкладываем — только переставляем
          if (!(dragKind === 'folder' && tg.dataset.kind !== 'folder'))
            dwell = setTimeout(() => { tg.classList.remove('drop-before'); tg.classList.add('drop-into'); stackTo = tg; }, 450); } }
    };
    const up = (ev) => { clearTimeout(hold); clearTimeout(dwell);
      tile.removeEventListener('pointermove', move); tile.removeEventListener('pointerup', up); tile.removeEventListener('pointercancel', up);
      if (ghost) ghost.remove(); tile.classList.remove('dragging', 'lifting');
      const target = stackTo, toBack = onBack; clearMarks();
      if (!started) return;
      if (toBack) ctx.onBack(id);
      else if (target) ctx.onStack(id, target.dataset.id, target.dataset.kind);
      else { const el = document.elementFromPoint(ev.clientX, ev.clientY), tg = el && el.closest ? el.closest('.gal-tile') : null;
        ctx.onReorder(id, tg && tg !== tile ? tg.dataset.id : null); }
    };
    tile.addEventListener('pointermove', move); tile.addEventListener('pointerup', up); tile.addEventListener('pointercancel', up);
  });
}
