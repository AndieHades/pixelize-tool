// DOM-помощники: единая точка доступа к элементам, тосты, копирование в буфер.
// Это сервис фундамента — им пользуются системы визуала, но не logic.
import { TOAST_MS } from '../config/timings.js';
export { t } from '../i18n/index.js'; // реэкспорт для удобства (toast(t('ключ')))

export const $ = (id) => document.getElementById(id);

let toastT = null;
export function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), TOAST_MS); }

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) {
    const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.appendChild(a); a.select(); let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) {}
    a.remove(); return ok;
  }
}

// Всплывающее меню-бабл m у якоря (ax, ay): центрируем по горизонтали на якоре,
// рисуем треугольник, указывающий на точку вызова. Единый вид для всех меню.
export function showMenuAt(m, ax, ay, above = false) {
  m.style.visibility = 'hidden'; m.classList.add('on');
  let arrow = m.querySelector(':scope > .menu-arrow');
  if (!arrow) { arrow = document.createElement('div'); arrow.className = 'menu-arrow'; m.appendChild(arrow); }
  requestAnimationFrame(() => { const r = m.getBoundingClientRect(), gap = 10;
    const left = Math.max(8, Math.min(ax - r.width / 2, innerWidth - r.width - 8));
    const top = Math.max(8, Math.min(above ? ay - r.height - gap : ay + gap, innerHeight - r.height - 8));
    m.style.left = left + 'px'; m.style.top = top + 'px';
    arrow.className = 'menu-arrow ' + (above ? 'down' : 'up');
    arrow.style.left = (Math.max(16, Math.min(ax - left, r.width - 16)) - 6) + 'px';
    m.style.visibility = ''; });
}

// Меню сбоку от опорного элемента (панель слоёв): справа, если влезает, иначе
// слева — чтобы никогда не перекрывать панель. По вертикали — у ay, в экране.
export function showMenuBeside(m, anchorEl, ay) {
  m.style.visibility = 'hidden'; m.classList.add('on');
  const arrow = m.querySelector(':scope > .menu-arrow'); if (arrow) arrow.remove();
  requestAnimationFrame(() => { const r = m.getBoundingClientRect(), a = anchorEl.getBoundingClientRect(), gap = 8;
    let left = a.right + gap; if (left + r.width > innerWidth - 8) left = a.left - gap - r.width;
    left = Math.max(8, Math.min(left, innerWidth - r.width - 8));
    const top = Math.max(8, Math.min(ay - r.height / 2, innerHeight - r.height - 8));
    m.style.left = left + 'px'; m.style.top = top + 'px'; m.style.visibility = ''; });
}
