// DOM-помощники: единая точка доступа к элементам, тосты, копирование в буфер.
// Это сервис фундамента — им пользуются системы визуала, но не logic.
import { TOAST_MS } from '../config/timings.js';

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

// показать всплывающее меню m у точки (x, y), удерживая в пределах экрана
export function showMenuAt(m, x, y, above = false) {
  m.style.visibility = 'hidden'; m.classList.add('on');
  requestAnimationFrame(() => { const r = m.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
    m.style.top = Math.max(8, Math.min(above ? y - r.height - 10 : y, innerHeight - r.height - 8)) + 'px';
    m.style.visibility = ''; });
}
