// Долгое нажатие (тач, 480мс) / правый клик (десктоп) по элементу → fn(x, y).
// Единый жест для контекстных меню: слои, эффекты, кисти. Без дублирования.
export function longPress(el, fn) {
  let t = null, x0 = 0, y0 = 0;
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); fn(e.clientX, e.clientY); });
  el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; x0 = e.clientX; y0 = e.clientY; clearTimeout(t); t = setTimeout(() => fn(x0, y0), 480); });
  el.addEventListener('pointermove', (e) => { if (t && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) { clearTimeout(t); t = null; } });
  const c = () => { clearTimeout(t); t = null; }; el.addEventListener('pointerup', c); el.addEventListener('pointercancel', c);
}
