// Свайп-влево по строке открывает кнопки действий (Правка/Удалить и т.п.).
// Переиспользуемо: галерея (кастомные размеры), слои и др. Палец и мышь.
// Открытой держится только одна строка — следующий свайп закрывает прежнюю.
import { DRAG_THRESHOLD } from '../config/timings.js';

let openFront = null;
export function closeSwipe() { if (openFront) { openFront.style.transform = ''; openFront._open = false; openFront = null; } }

// row — строка-контейнер; buttons — [{ label, danger?, onClick }].
export function attachSwipe(row, buttons) {
  row.classList.add('swipe-row');
  const front = document.createElement('div'); front.className = 'swipe-front';
  while (row.firstChild) front.appendChild(row.firstChild);
  const acts = document.createElement('div'); acts.className = 'swipe-acts';
  for (const b of buttons) { const el = document.createElement('button'); el.className = 'swipe-act' + (b.danger ? ' danger' : '');
    el.textContent = b.label; el.addEventListener('click', (e) => { e.stopPropagation(); reset(); b.onClick(); }); acts.appendChild(el); }
  row.append(acts, front);

  let w = 0, sx = 0, dx = 0, drag = false, suppress = false;
  const setX = (x) => { front.style.transform = x ? `translateX(${x}px)` : ''; };
  const reset = () => { front._open = false; setX(0); if (openFront === front) openFront = null; };
  const openIt = () => { front._open = true; setX(-w); openFront = front; };

  front.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button) return;
    w = acts.offsetWidth || 120; sx = e.clientX; dx = 0; drag = false;
    const move = (ev) => { const d = ev.clientX - sx;
      if (!drag) { if (Math.abs(d) <= DRAG_THRESHOLD) return; drag = true; if (openFront && openFront !== front) closeSwipe(); }
      dx = Math.max(-w - 24, Math.min(0, (front._open ? -w : 0) + d)); setX(dx); ev.preventDefault(); };
    const up = () => { front.removeEventListener('pointermove', move); front.removeEventListener('pointerup', up); front.removeEventListener('pointercancel', up);
      if (!drag) { if (front._open) reset(); return; }
      suppress = true; setTimeout(() => { suppress = false; }, 0);
      if (dx < -w / 2) openIt(); else reset(); };
    front.addEventListener('pointermove', move); front.addEventListener('pointerup', up); front.addEventListener('pointercancel', up); });

  // тап по открытой строке (или сразу после свайпа) — поглотить клик, не «проваливать» в onclick строки
  front.addEventListener('click', (e) => { if (front._open || suppress) { e.stopPropagation(); if (!suppress) reset(); } }, true);
}
