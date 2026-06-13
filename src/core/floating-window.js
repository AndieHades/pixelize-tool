// Плавающее окно: перетаскивание за грип + ресайз за уголок + сохранение
// геометрии. Один помощник на палитру, боковую панель, окна слоёв/превью/референса.
let zTop = 30; // общий счётчик: окно, за которое взялись, поднимается над остальными
const bringToFront = (el) => { el.style.zIndex = ++zTop; };

export function floatingWindow(el, opts = {}) {
  if (el.__fw) return; el.__fw = true; // идемпотентно: окно делается перетаскиваемым один раз
  const { grip = el, handle, storeKey, minW = 120, minH = 80, clampRight = 70, clampBottom = 50, onResize, onClose } = opts;
  const place = (l, t) => {
    el.style.left = Math.max(4, Math.min(l, innerWidth - clampRight)) + 'px';
    el.style.top = Math.max(4, Math.min(t, innerHeight - clampBottom)) + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none';
  };
  const save = () => { if (!storeKey) return; const r = el.getBoundingClientRect();
    try { localStorage.setItem(storeKey, JSON.stringify({ l: r.left, t: r.top, w: r.width, h: r.height })); } catch (e) {} };
  const applySize = (w, h) => { if (onResize) onResize(w, h); else { el.style.width = Math.max(minW, w) + 'px'; el.style.height = Math.max(minH, h) + 'px'; } };

  if (storeKey) try { const s = JSON.parse(localStorage.getItem(storeKey));
    // размер восстанавливаем только у растягиваемых окон; иначе фикс. высота режет
    // контент с переменным числом строк (окна эффектов) — «пол-окна нет»
    if (s && s.l != null) { place(s.l, s.t); if (s.w && (handle || onResize)) applySize(s.w, s.h); } } catch (e) {}

  // крестик закрытия в шапке (общий для всех окон): прячет окно / зовёт onClose
  const xb = el.querySelector('.win-x');
  if (xb) xb.addEventListener('click', (e) => { e.stopPropagation(); if (onClose) onClose(); else el.classList.remove('on'); });

  el.addEventListener('pointerdown', () => bringToFront(el), true); // любой тык по окну — наверх стопки
  let d = null;
  grip.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return;
    grip.setPointerCapture(e.pointerId); bringToFront(el); const r = el.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top }; });
  grip.addEventListener('pointermove', (e) => { if (d) place(e.clientX - d.dx, e.clientY - d.dy); });
  const dEnd = () => { if (d) { d = null; save(); } };
  grip.addEventListener('pointerup', dEnd); grip.addEventListener('pointercancel', dEnd);

  if (handle) { let rz = null;
    handle.addEventListener('pointerdown', (e) => { e.preventDefault(); handle.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect(); rz = { w: r.width, h: r.height, x: e.clientX, y: e.clientY }; });
    handle.addEventListener('pointermove', (e) => { if (rz) applySize(rz.w + e.clientX - rz.x, rz.h + e.clientY - rz.y); });
    const rEnd = () => { if (rz) { rz = null; save(); } };
    handle.addEventListener('pointerup', rEnd); handle.addEventListener('pointercancel', rEnd); }
}
