const allWins = new Set(); // все плавающие окна — чтобы новое вставало в свободное место
// Плавающее окно: перетаскивание за грип + ресайз за уголок + сохранение
// геометрии. Один помощник на палитру, боковую панель, окна слоёв/превью/референса.
const NORMAL_Z_BASE = 30, NORMAL_Z_MAX = 860, TOOLBAR_Z = 900;
let zTop = NORMAL_Z_BASE; // общий счётчик: окно, за которое взялись, поднимается над остальными
const TOPBAR = 58;         // не залезаем под верхнюю панель
const hostFor = (el) => el.closest('.ovl') || el;
const shown = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const s = window.getComputedStyle(n);
  if (s.display === 'none' || s.visibility === 'hidden') return false; } return true; };
const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const interactive = 'button,input,select,textarea,label,a,[contenteditable="true"]';
const zOf = (el) => { const host = hostFor(el), n = parseFloat(window.getComputedStyle(host).zIndex || host.style.zIndex);
  return Number.isFinite(n) ? n : 0; };
function rebalanceNormalZ() {
  const wins = [...allWins].filter((el) => !el.__fwAlwaysOnTop && shown(el)).sort((a, b) => zOf(a) - zOf(b));
  zTop = NORMAL_Z_BASE;
  for (const el of wins) { const host = hostFor(el); host.style.zIndex = ++zTop; if (host !== el) el.style.zIndex = ''; }
}
export const nextFloatingZ = () => { if (zTop >= NORMAL_Z_MAX) rebalanceNormalZ(); return ++zTop; };
const bringToFront = (el, alwaysOnTop = false) => {
  const host = hostFor(el);
  host.style.zIndex = alwaysOnTop ? TOOLBAR_Z : nextFloatingZ();
  if (host !== el) el.style.zIndex = '';
};
// первое свободное место для окна el среди других видимых окон (или null — места нет)
function freeSpot(el) { const r = el.getBoundingClientRect(), w = r.width, h = r.height, m = 8, step = 24;
  const occ = [...allWins].filter((x) => x !== el && shown(x)).map((x) => x.getBoundingClientRect());
  for (let t = TOPBAR; t + h <= innerHeight - m; t += step) for (let l = m; l + w <= innerWidth - m; l += step)
    if (!occ.some((o) => hit({ left: l, top: t, right: l + w, bottom: t + h }, o))) return { l, t };
  return null; }

export function floatingWindow(el, opts = {}) {
  if (el.__fw) return; el.__fw = true; // идемпотентно: окно делается перетаскиваемым один раз
  const { grip = el, handle, storeKey, minW = 120, minH = 80, clampRight = 70, clampBottom = 50, avoidOverlap = true, alwaysOnTop = false, onResize, onClose } = opts;
  el.__fwAlwaysOnTop = alwaysOnTop;
  let placed = false; // есть ли осмысленная позиция (восстановлена / выбрана пользователем / переставлена)
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
    if (s && s.l != null) { place(s.l, s.t); placed = true; if (s.w && (handle || onResize)) applySize(s.w, s.h); } } catch (e) {}

  // крестик закрытия в шапке (общий для всех окон): прячет окно / зовёт onClose
  const xb = el.querySelector('.win-x');
  if (xb) xb.addEventListener('click', (e) => { e.stopPropagation(); if (onClose) onClose(); else el.classList.remove('on'); });

  el.addEventListener('pointerdown', () => bringToFront(el, alwaysOnTop), true); // любой тык по окну — наверх стопки
  let d = null;
  grip.addEventListener('pointerdown', (e) => { if (e.target.closest(interactive)) return;
    grip.setPointerCapture(e.pointerId); bringToFront(el, alwaysOnTop); const r = el.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top }; });
  grip.addEventListener('pointermove', (e) => { if (d) place(e.clientX - d.dx, e.clientY - d.dy); });
  const dEnd = () => { if (d) { d = null; placed = true; save(); } };
  grip.addEventListener('pointerup', dEnd); grip.addEventListener('pointercancel', dEnd);

  if (handle) { let rz = null;
    handle.addEventListener('pointerdown', (e) => { e.preventDefault(); handle.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect(); rz = { w: r.width, h: r.height, x: e.clientX, y: e.clientY }; });
    handle.addEventListener('pointermove', (e) => { if (rz) applySize(rz.w + e.clientX - rz.x, rz.h + e.clientY - rz.y); });
    const rEnd = () => { if (rz) { rz = null; placed = true; save(); } };
    handle.addEventListener('pointerup', rEnd); handle.addEventListener('pointercancel', rEnd); }

  // при открытии: поднять окно над остальными; если перекрывает другое окно и
  // позиция ещё не выбрана — переставить в свободное место (или наверх, если места нет)
  allWins.add(el);
  const onShow = () => { bringToFront(el, alwaysOnTop);
    if (placed || !avoidOverlap) return;
    const r = el.getBoundingClientRect();
    const occ = [...allWins].filter((x) => x !== el && shown(x)).map((x) => x.getBoundingClientRect());
    if (occ.some((o) => hit(r, o))) { const s = freeSpot(el);
      place(s ? s.l : Math.max(4, (innerWidth - r.width) / 2), s ? s.t : TOPBAR); placed = true; save(); } };
  let wasShown = shown(el);
  const mo = new window.MutationObserver(() => { const v = shown(el); if (v && !wasShown) onShow(); wasShown = v; });
  mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
  const host = hostFor(el);
  if (host !== el) mo.observe(host, { attributes: true, attributeFilter: ['class', 'style'] });
}
