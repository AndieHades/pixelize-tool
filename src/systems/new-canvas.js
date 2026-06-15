// Диалог «Новый холст»: список пресетов (config) + кастомные размеры
// (сохраняются). Тап по строке — создать и открыть. Кастомные строки можно
// свайпнуть влево → Правка/Удалить. Создаёт новую работу в галерее.
import { $, showMenuAt } from '../core/dom.js';
import * as actions from '../core/actions.js';
import { attachSwipe, closeSwipe } from '../core/swipe-actions.js';
import { isDesktop } from '../core/env.js';
import { t } from '../i18n/index.js';
import { SIZE_PRESETS } from '../config/presets.js';
import { MAX_SIZE } from '../config/limits.js';
import { newWork } from './gallery/doc.js';
import { hide as hideGallery } from './gallery/index.js';

const STORE = 'customSizes';
const custom = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } };
const saveCustom = (a) => { try { localStorage.setItem(STORE, JSON.stringify(a)); } catch (e) {} };
let editIdx = null; // null — добавление нового; число — правка кастомного по индексу

function open(p) { closeEditor(); $('new-ovl').classList.remove('on'); hideGallery(); newWork(p.w, p.h); }

function row(p, customIdx) {
  const r = document.createElement('div'); r.className = 'new-row';
  const nm = document.createElement('span'); nm.className = 'new-name'; nm.textContent = p.label || `${p.w}×${p.h}`;
  const sz = document.createElement('span'); sz.className = 'new-size'; sz.textContent = `${p.w} × ${p.h} px`;
  r.append(nm, sz); r.onclick = () => open(p);
  if (customIdx != null) { const acts = [ // палец — свайп; мышь (десктоп) — ПКМ-меню
    { label: t('menu.edit'), onClick: () => editCustom(customIdx) },
    { label: t('gallery.delete'), danger: true, onClick: () => removeCustom(customIdx) }];
    if (!isDesktop()) attachSwipe(r, { actions: acts }); // тач — свайп, десктоп — ПКМ
    r.addEventListener('contextmenu', (e) => { e.preventDefault(); rowMenu(e.clientX, e.clientY, acts); }); }
  return r;
}

function rowMenu(x, y, acts) { const m = $('rowctx'); m.innerHTML = '';
  for (const a of acts) { const b = document.createElement('button'); b.textContent = a.label; if (a.danger) b.classList.add('danger');
    b.onclick = () => { m.classList.remove('on'); a.onClick(); }; m.appendChild(b); }
  showMenuAt(m, x, y); }

function buildList() { const box = $('new-list'); if (!box) return; closeSwipe(); box.innerHTML = '';
  SIZE_PRESETS.forEach((p) => box.appendChild(row(p, null)));
  custom().forEach((p, i) => box.appendChild(row(p, i))); }

// окно создания/правки размера (имя + ширина/высота + связка пропорций)
let linked = false, ratio = 1;
const clampSize = (v) => Math.max(2, Math.min(MAX_SIZE, Math.round(v)));
function setLinked(on) { linked = on; $('new-link').classList.toggle('on', on);
  if (on) { const w = +$('new-w').value, h = +$('new-h').value; ratio = (w > 0 && h > 0) ? w / h : 1; } }
function syncRatio(which) { if (!linked) return;
  if (which === 'w') { const w = +$('new-w').value; if (w > 0) $('new-h').value = clampSize(w / ratio); }
  else { const h = +$('new-h').value; if (h > 0) $('new-w').value = clampSize(h * ratio); } }

function openEditor(name, w, h) { $('new-name-in').value = name; $('new-w').value = w; $('new-h').value = h;
  if (linked) setLinked(true); // пересчитать пропорцию под новые значения
  $('new-ovl').classList.add('editing'); setTimeout(() => { $('new-w').focus(); $('new-w').select(); }, 30); }
function closeEditor() { $('new-ovl').classList.remove('editing'); }
function editCustom(i) { editIdx = i; const c = custom()[i]; if (!c) return; openEditor(c.label || `${c.w}×${c.h}`, c.w, c.h); }
function removeCustom(i) { const c = custom(); c.splice(i, 1); saveCustom(c); buildList(); }

function create() { const w = parseInt($('new-w').value, 10), h = parseInt($('new-h').value, 10);
  if (!w || !h || w < 2 || h < 2 || w > MAX_SIZE || h > MAX_SIZE) return;
  const label = ($('new-name-in').value.trim() || `${w}×${h}`).slice(0, 24);
  const c = custom(), entry = { w, h, label };
  if (editIdx != null) { c[editIdx] = entry; saveCustom(c); editIdx = null; closeEditor(); buildList(); return; } // правка — обновить и остаться в списке
  c.push(entry); saveCustom(c); open(entry); // добавление — сохранить пресет и сразу создать холст
}

export function mount() {
  const openDlg = () => { editIdx = null; closeEditor(); buildList(); $('new-ovl').classList.add('on'); };
  $('new').onclick = openDlg; $('gal-new').onclick = openDlg;
  actions.register('doc.new', openDlg);
  $('new-add').onclick = () => { editIdx = null; openEditor('32×32', 32, 32); };
  $('new-cancel').onclick = () => { editIdx = null; closeEditor(); };
  $('new-create').onclick = create;
  $('new-link').onclick = () => setLinked(!linked);
  $('new-w').addEventListener('input', () => syncRatio('w'));
  $('new-h').addEventListener('input', () => syncRatio('h'));
  ['new-w', 'new-h', 'new-name-in'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); create(); } }));
}
