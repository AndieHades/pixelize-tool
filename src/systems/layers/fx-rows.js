// Строки эффектов под слоем/папкой в списке слоёв: звёздочка, имя, глаз.
// Глаз — видимость эффекта; ПКМ — меню (Правка/Скопировать/Удалить); drag — перенос
// на другой слой. Все кросс-системные операции идут через действия fx.* (см. systems/effects).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { t } from '../../core/dom.js';
import { dragGhost } from '../../core/drag-ghost.js';
import { longPress, EYE } from './list.js';

const STAR = '<svg viewBox="0 0 24 24"><path d="M12 3.2l1.9 5.5 5.7.2-4.5 3.4 1.6 5.5L12 14.9l-4.7 2.9 1.6-5.5L4.4 8.9l5.7-.2z"/></svg>';
const INDENT = 16;

function targetFromRow(row) { if (!row) return null;
  if (row.dataset.li != null) return S.layers[+row.dataset.li];
  if (row.dataset.fid != null) return S.folders.find((f) => f.id === +row.dataset.fid); return null; }

function fxDrag(el, from, eff) {
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY; let started = false, ghost = null;
    const move = (ev) => { if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 7) {
        started = true; el.classList.add('dragging'); ghost = dragGhost(el, el.getBoundingClientRect().width, 1); }
      if (started) ghost.move(ev.clientX, ev.clientY); };
    const up = (ev) => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if (ghost) ghost.remove(); el.classList.remove('dragging'); if (!started) return;
      const t2 = document.elementFromPoint(ev.clientX, ev.clientY), row = t2 && t2.closest ? t2.closest('#lay-list .lrow') : null;
      const to = targetFromRow(row); if (to) actions.run('fx.move', eff, from, to); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); });
}

function effectRow(target, eff, depth) {
  const row = document.createElement('div'); row.className = 'fxrow' + (eff.visible === false ? ' fxoff' : '');
  row.style.marginLeft = depth * INDENT + 'px';
  const star = document.createElement('i'); star.className = 'fxstar'; star.innerHTML = STAR;
  const nm = document.createElement('span'); nm.className = 'lname'; nm.textContent = t('fx.' + eff.type);
  const vis = document.createElement('button'); vis.className = 'eye' + (eff.visible === false ? ' off' : ''); vis.innerHTML = EYE;
  vis.addEventListener('pointerdown', (e) => e.stopPropagation());
  vis.addEventListener('click', (e) => { e.stopPropagation(); snapshot(); eff.visible = eff.visible === false;
    vis.classList.toggle('off', eff.visible === false); row.classList.toggle('fxoff', eff.visible === false); bus.emit('render'); });
  row.append(star, nm, vis);
  row.addEventListener('dblclick', (e) => { e.stopPropagation(); actions.run('fx.edit', target, eff); });
  longPress(row, (x, y) => actions.run('fx.menu', x, y, target, eff));
  fxDrag(row, target, eff); return row;
}

// добавить строки эффектов цели (слой/папка) в список после её строки
export function appendEffects(box, target, depth) {
  for (const eff of (target.effects || [])) box.appendChild(effectRow(target, eff, depth));
}
