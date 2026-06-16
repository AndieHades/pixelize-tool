// Перетаскивание плиток: видимый объект один — на курсоре. Gap открывается
// только после удержания над конкретной стороной цели, чтобы сетка не дрожала.
import { DRAG_THRESHOLD, FOLDER_HOLD_MS } from '../../config/timings.js';
import { DROP_GAP_HOLD_MS } from '../../config/drag-drop.js';
import { $ } from '../../core/dom.js';
import { dragGhost } from '../../core/drag-ghost.js';
import { dropZone, makeDropGap } from '../../core/drop-gap.js';

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

function slotFromPoint(grid, dragged, x, y) {
  const items = [...grid.querySelectorAll('.gal-tile')]
    .filter((n) => !dragged.has(n) && !n.classList.contains('dragging'))
    .map((el) => ({ el, r: el.getBoundingClientRect() }));
  const row = items.filter((it) => y >= it.r.top && y <= it.r.bottom).sort((a, b) => a.r.left - b.r.left);
  if (!row.length) return null;
  if (x < row[0].r.left || x > row[row.length - 1].r.right) return null;
  for (const it of row) if (x < it.r.left + it.r.width / 2) return { node: it.el, after: false };
  return { node: row[row.length - 1].el, after: true };
}

export function attachDrag(tile, id, ctx) {
  ensureClickGuard();
  tile.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button) return;
    if (e.target.closest && e.target.closest('.gal-cap')) return; // имя/подпись — не драг, чтобы двойной клик переименовывал
    const sx = e.clientX, sy = e.clientY; let started = false, ghost = null, dwell = null, overKey = '', stackTo = null, onBack = false;
    let dragIds = [id], dragEls = [tile], dragged = new Set(dragEls);
    const grid = ctx.gridEl(), back = $('gal-back'), dragKind = tile.dataset.kind;
    const gap = makeDropGap({ className: 'gal-drop-gap' });
    const hold = setTimeout(() => begin(sx, sy), e.pointerType === 'touch' ? 250 : 1e9); // тач: долгий тап; мышь: по сдвигу
    function begin(x, y) { if (started) return; started = true; try { tile.setPointerCapture(e.pointerId); } catch (err) {}
      dragIds = ctx.dragIds ? ctx.dragIds(id) : [id];
      dragEls = dragIds.map((did) => grid.querySelector(`.gal-tile[data-id="${did}"]`)).filter(Boolean);
      dragged = new Set(dragEls);
      const ghostW = tile.getBoundingClientRect().width; dragEls.forEach((el) => el.classList.add('dragging'));
      ghost = dragGhost(tile, ghostW, dragIds.length); ghost.move(x, y);
      if (back.style.display !== 'none') back.classList.add('lift'); } // «назад» увеличивается на всё время перетаскивания
    const clearMarks = () => { grid.querySelectorAll('.drop-into').forEach((n) => n.classList.remove('drop-into')); back.classList.remove('over'); };
    const resetHover = (key) => { if (key === overKey) return; overKey = key; clearTimeout(dwell); stackTo = null; clearMarks(); };
    const canStack = (tg) => tg && !(dragKind === 'folder' && tg.dataset.kind !== 'folder');
    const move = (ev) => {
      if (!started) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > DRAG_THRESHOLD) { clearTimeout(hold); begin(ev.clientX, ev.clientY); } else return; }
      ghost.move(ev.clientX, ev.clientY);
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const overBack = back.style.display !== 'none' && el && el.closest && el.closest('#gal-back'); // бросок на «назад» — на уровень выше
      if (overBack) { if (!onBack) { onBack = true; overKey = ''; clearTimeout(dwell); stackTo = null; gap.cancel(); clearMarks(); back.classList.add('over'); } return; }
      onBack = false;
      const raw = el && el.closest ? el.closest('.gal-tile') : null;
      const tg = raw && !dragged.has(raw) ? raw : null;
      const tid = tg ? tg.dataset.id : null;
      const zone = tg ? dropZone(tg, ev.clientX, ev.clientY, 'x') : null, into = tg && zone.zone === 'center' && canStack(tg);
      const key = tg ? tid + ':' + (into ? 'center' : (zone.after ? 'after' : 'before')) : '';
      if (key !== overKey) { resetHover(key); if (into) dwell = setTimeout(() => { tg.classList.add('drop-into'); stackTo = tg; }, FOLDER_HOLD_MS); }
      if (stackTo) return;
      if (tg && !into) gap.request(grid, tg, zone.after, tg, key, DROP_GAP_HOLD_MS);
      else if (into) gap.cancel();
      else if (pointIn(grid, ev.clientX, ev.clientY)) {
        const pos = slotFromPoint(grid, dragged, ev.clientX, ev.clientY);
        if (!pos) { gap.cancel(); return; }
        const gkey = 'empty:' + pos.node.dataset.id + ':' + (pos.after ? 'after' : 'before');
        resetHover(gkey); gap.request(grid, pos.node, pos.after, pos.node, gkey, DROP_GAP_HOLD_MS);
      } else gap.cancel();
    };
    const up = (ev) => { clearTimeout(hold); clearTimeout(dwell);
      tile.removeEventListener('pointermove', move); tile.removeEventListener('pointerup', up); tile.removeEventListener('pointercancel', up); tile.removeEventListener('lostpointercapture', up);
      if (ghost) ghost.remove(); dragEls.forEach((el) => el.classList.remove('dragging', 'lifting')); back.classList.remove('lift', 'over');
      const target = stackTo, toBack = onBack; clearMarks();
      const hadGap = gap.active, before = gap.next('.gal-tile', dragged); gap.remove();
      if (!started) return; clickGuardUntil = Date.now() + 450;
      if (toBack) ctx.onBack(dragIds);
      else if (target) ctx.onStack(dragIds, target.dataset.id, target.dataset.kind);
      else if (hadGap) ctx.onReorder(dragIds, before ? before.dataset.id : null);
    };
    tile.addEventListener('pointermove', move); tile.addEventListener('pointerup', up); tile.addEventListener('pointercancel', up); tile.addEventListener('lostpointercapture', up);
  });
}
