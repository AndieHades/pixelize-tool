// Настройки приложения: светлая/тёмная тема (тумблер) и смена языка.
// Открывается шестерёнкой в галерее. Заменяет прежнее меню документов.
import { $, showMenuAt } from '../core/dom.js';
import { t, getLocale, locales, setLocale } from '../i18n/index.js';
import { toggleTheme, getTheme } from '../styles/theme.js';

function build() { const m = $('setmenu'); m.innerHTML = '';
  const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = t('ui.settings'); m.appendChild(head);

  const themeRow = document.createElement('div'); themeRow.className = 'set-row';
  const tl = document.createElement('span'); tl.textContent = t('ui.lightTheme');
  const sw = document.createElement('span'); sw.className = 'switch';
  const inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = getTheme() === 'light';
  sw.append(inp, document.createElement('span'));
  themeRow.append(tl, sw);
  themeRow.onclick = () => { toggleTheme(); inp.checked = getTheme() === 'light'; };
  m.appendChild(themeRow);

  const langRow = document.createElement('div'); langRow.className = 'set-row';
  const ll = document.createElement('span'); ll.textContent = t('ui.language');
  const lv = document.createElement('span'); lv.className = 'set-val'; lv.textContent = getLocale().toUpperCase();
  langRow.append(ll, lv);
  langRow.onclick = () => { const ls = locales(); setLocale(ls[(ls.indexOf(getLocale()) + 1) % ls.length]); $('setmenu').classList.remove('on'); };
  m.appendChild(langRow);
}

function openSettings() { build(); const r = $('gal-settings').getBoundingClientRect(); showMenuAt($('setmenu'), r.right - 60, r.bottom + 6); }

export function mount() { $('gal-settings').onclick = openSettings; }
