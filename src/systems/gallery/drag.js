// Перетаскивание плиток: видимый объект один — на курсоре, в сетке открывается
// слот-gap места вставки. Удержание над плиткой по-прежнему складывает в проект.
import { DRAG_THRESHOLD, FOLDER_HOLD_MS } from '../../config/timings.js';
import { $ } from '../../core/dom.js';
import { dragGhost } from '../../core/drag-ghost.js';

let clickGuard = false, clickGuardUntil = 0;

function ensureClickGuard() {
  if (clickGuard) return; clickGuard = true;
  document.addEventListener('click', (e) => {
    if (Date.now() > clickGuardUntil) return;
    e.preventDefault(); e.stopPropagation();
  }, true);
}

function pointIn(el, x, y) {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function insertSlot(grid, slot, target, after) {
  if (!target) { if (slot.parentNode !== grid || slot.nextSibling) grid.appendChild(slot); return; }
  const ref = after ? target.nextSibling : target;
  if (ref !== slot) grid.insertBefore(slot, ref);
}

function nextTile(slot, source) {
  let n = slot.nextElementSibling;
  while (n && (n === source || !n.classList.contains('gal-tile'))) n = n.nextElementSibling;
  return n;
}

function slotFromPoint(grid, source, x, y) {
  const tiles = [...grid.querySelectorAll('.gal-tile')].filter((n) => n !== source && !n.classList.contains('dragging'));
  for (const t of tiles) {
    const r = t.getBoundingClientRect();
    if (y < r.top + r.height / 2 || (y <= r.bottom && x < r.left + r.width / 2)) return t;
  }
  return null;
}

export function attachDrag(tile, id, ctx) {
  ensureClickGuard();
  tile.addEventListener('pointerdown', (e) => {
    if (ctx.selecting() || (e.pointerType === 'mouse' && e.button)) return;
    if (e.target.closest && e.target.closest('.gal-cap')) return; // имя/подпись — не драг, чтобы двойной клик переименовывал
    const sx = e.clientX, sy = e.clientY; let started = false, ghost = null, dwell = null, overId = null, stackTo = null, onBack = false;
    const grid = ctx.gridEl(), back = $('gal-back'), dragKind = tile.dataset.kind;
    const slot = document.createElement('div'); slot.className = 'gal-drop-slot';
    const hold = setTimeout(() => begin(sx, sy), e.pointerType === 'touch' ? 250 : 1e9); // тач: долгий тап; мышь: по сдвигу
    function begin(x, y) { if (started) return; started = true; try { tile.setPointerCapture(e.pointerId); } catch (err) {}
      const ghostW = tile.getBoundingClientRect().width; tile.classList.add('dragging'); ghost = dragGhost(tile, ghostW); ghost.move(x, y);
      grid.insertBefore(slot, tile);
      if (back.style.display !== 'none') back.classList.add('lift'); } // «назад» увеличивается на всё время перетаскивания
    const clearMarks = () => { grid.querySelectorAll('.drop-into').forEach((n) => n.classList.remove('drop-into')); back.classList.remove('over'); };
    const canStack = (tg) => tg && !(dragKind === 'folder' && tg.dataset.kind !== 'folder');
    const move = (ev) => {
      if (!started) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > DRAG_THRESHOLD) { clearTimeout(hold); begin(ev.clientX, ev.clientY); } else return; }
      ghost.move(ev.clientX, ev.clientY);
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const overBack = back.style.display !== 'none' && el && el.closest && el.closest('#gal-back'); // бросок на «назад» — на уровень выше
      if (overBack) { if (!onBack) { onBack = true; clearTimeout(dwell); stackTo = null; clearMarks(); back.classList.add('over'); } return; }
      onBack = false;
      const tg = el && el.closest ? el.closest('.gal-tile') : null;
      const tid = tg && tg !== tile ? tg.dataset.id : null;
      if (tid !== overId) { overId = tid; clearTimeout(dwell); stackTo = null; clearMarks();
        if (tg && tg !== tile && canStack(tg)) dwell = setTimeout(() => { tg.classList.add('drop-into'); stackTo = tg; }, FOLDER_HOLD_MS); }
      if (stackTo) return;
      if (tg && tg !== tile) { const r = tg.getBoundingClientRect(); insertSlot(grid, slot, tg, ev.clientX > r.left + r.width / 2); }
      else if (pointIn(grid, ev.clientX, ev.clientY)) insertSlot(grid, slot, slotFromPoint(grid, tile, ev.clientX, ev.clientY), false);
    };
    const up = (ev) => { clearTimeout(hold); clearTimeout(dwell);
      tile.removeEventListener('pointermove', move); tile.removeEventListener('pointerup', up); tile.removeEventListener('pointercancel', up); tile.removeEventListener('lostpointercapture', up);
      if (ghost) ghost.remove(); tile.classList.remove('dragging', 'lifting'); back.classList.remove('lift', 'over');
      const target = stackTo, toBack = onBack; clearMarks();
      const before = slot.parentNode ? nextTile(slot, tile) : null; slot.remove();
      if (!started) return; clickGuardUntil = Date.now() + 450;
      if (toBack) ctx.onBack(id);
      else if (target) ctx.onStack(id, target.dataset.id, target.dataset.kind);
      else ctx.onReorder(id, before ? before.dataset.id : null);
    };
    tile.addEventListener('pointermove', move); tile.addEventListener('pointerup', up); tile.addEventListener('pointercancel', up); tile.addEventListener('lostpointercapture', up);
  });
}
