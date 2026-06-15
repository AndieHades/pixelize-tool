// Единый физический gap для drag/drop: ничего не рисует, только раздвигает
// элементы на половину размера цели. Его можно отключить флагом — расчёт
// места вставки продолжит работать без визуального раздвигания.
import { DROP_CENTER_RATIO, DROP_GAP_RATIO, PHYSICAL_DROP_GAP } from '../config/drag-drop.js';

export function makeDropGap({ axis = 'x', className = '', ratio = DROP_GAP_RATIO, min = 1, enabled = true } = {}) {
  const el = document.createElement('div');
  el.className = ['drop-gap', axis === 'y' ? 'drop-gap-y' : 'drop-gap-x', className].filter(Boolean).join(' ');
  let target = null, after = false, active = false;

  function sampleSize(sample) {
    if (!sample) return min;
    const r = sample.getBoundingClientRect();
    const size = axis === 'y' ? r.height : r.width;
    return Math.max(min, Math.round(size * ratio));
  }

  function show(parent, node, placeAfter = false, sample = node) {
    if (!parent) return;
    target = node || null; after = !!placeAfter; active = true;
    if (!enabled || !PHYSICAL_DROP_GAP) return;
    el.style.setProperty('--drop-gap-size', sampleSize(sample) + 'px');
    const ref = node ? (placeAfter ? node.nextSibling : node) : null;
    if (el.parentNode !== parent || ref !== el) parent.insertBefore(el, ref);
  }

  function next(selector, ignored = new Set()) {
    if (!active) return null;
    let n = el.parentNode ? el.nextElementSibling : (after ? target?.nextElementSibling : target);
    while (n && ((selector && !n.matches(selector)) || ignored.has(n))) n = n.nextElementSibling;
    return n;
  }

  return {
    el,
    get target() { return target; },
    get after() { return after; },
    get active() { return active; },
    show,
    next,
    remove() { el.remove(); target = null; after = false; active = false; }
  };
}

export function dropZone(el, x, y, axis = 'x', centerRatio = DROP_CENTER_RATIO) {
  const r = el.getBoundingClientRect();
  const size = axis === 'y' ? r.height : r.width;
  const pos = size > 0 ? ((axis === 'y' ? y - r.top : x - r.left) / size) : 0.5;
  const pad = Math.max(0, Math.min(0.49, (1 - centerRatio) / 2));
  const after = pos >= 0.5;
  return { zone: pos > pad && pos < 1 - pad ? 'center' : (after ? 'after' : 'before'), after };
}
