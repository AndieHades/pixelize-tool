import { $, showMenuAt } from '../core/dom.js';
import * as actions from '../core/actions.js';
import { t } from '../i18n/index.js';
import { SPRITE_PRESETS, GAME_FRAME_PRESETS } from '../config/presets.js';
import { MAX_SIZE } from '../config/limits.js';
import { clampRound } from '../logic/math.js';
import { rgb } from '../logic/color.js';
import { newWork } from './gallery/doc.js';
import { hide as hideGallery, show as showGallery } from './gallery/index.js';

const STORE = 'customSizes';
const BGS = [{ label: 'new.bgTransparent', color: null }, { label: 'new.bgWhite', color: [255, 255, 255] }, { label: 'new.bgBlack', color: [0, 0, 0] }];
let editIdx = null, linked = false, ratio = 1, bgIdx = 0, mode = 'rgba', nameCustom = false, suppressOutsideClick = false;
const custom = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } };
const saveCustom = (a) => { try { localStorage.setItem(STORE, JSON.stringify(a)); } catch (e) {} };
const dim = (p) => `${p.w} x ${p.h}`;
const clampSize = (v) => clampRound(v, 2, MAX_SIZE);
const panel = () => $('new-ovl')?.querySelector('.new-panel');
const isOpen = () => $('new-ovl')?.classList.contains('on');
const bgColor = () => BGS[bgIdx].color;
const currentDimName = () => dim({ w: parseInt($('new-w').value, 10) || 64, h: parseInt($('new-h').value, 10) || 64 });
const syncName = (force = false) => { if (force || !nameCustom) $('new-name-in').value = currentDimName(); };

function setMode(next) {
  mode = next;
  $('new-mode-rgba').classList.toggle('on', mode === 'rgba');
  $('new-mode-gray').classList.toggle('on', mode === 'grayscale');
}

function syncBg() {
  const st = BGS[bgIdx], sw = $('new-bg-swatch');
  sw.classList.toggle('transparent', !st.color);
  sw.style.background = st.color ? rgb(st.color) : '';
  $('new-bg-text').textContent = t(st.label);
}

function createDoc(p) {
  $('new-ovl').classList.remove('on');
  hideGallery();
  newWork(p.w, p.h, p.label, bgColor(), mode);
}

function menuForSaved(e, i) {
  e.preventDefault(); e.stopPropagation();
  const m = $('rowctx'); m.innerHTML = '';
  for (const a of [
    { label: t('menu.edit'), fn: () => editCustom(i) },
    { label: t('gallery.delete'), danger: true, fn: () => removeCustom(i) },
  ]) {
    const b = document.createElement('button'); b.textContent = a.label;
    if (a.danger) b.classList.add('danger');
    b.onclick = () => { m.classList.remove('on'); a.fn(); };
    m.appendChild(b);
  }
  showMenuAt(m, e.clientX, e.clientY);
}

function row(p, savedIdx = null) {
  const el = document.createElement(savedIdx == null ? 'button' : 'div');
  el.className = 'new-row' + (savedIdx == null ? '' : ' saved'); if (el.tagName === 'BUTTON') el.type = 'button';
  const name = document.createElement('span'); name.className = 'new-name'; name.textContent = p.label || dim(p);
  const size = document.createElement('span'); size.className = 'new-size'; size.textContent = savedIdx == null ? '›' : dim(p);
  el.append(name, size); el.onclick = () => createDoc(p);
  if (savedIdx != null) {
    const dots = document.createElement('button'); dots.type = 'button'; dots.className = 'new-dots'; dots.textContent = '...';
    dots.onclick = (e) => menuForSaved(e, savedIdx); el.appendChild(dots);
  }
  return el;
}

function fillStack(id, list, saved = false) {
  const box = $(id); box.innerHTML = '';
  if (saved && !list.length) { const p = document.createElement('p'); p.className = 'new-empty'; p.textContent = t('new.savedEmpty'); box.appendChild(p); return; }
  list.forEach((p, i) => box.appendChild(row(p, saved ? i : null)));
}

function buildLists() {
  fillStack('new-sprites', SPRITE_PRESETS);
  fillStack('new-frames', GAME_FRAME_PRESETS);
  fillStack('new-saved', custom(), true);
}

function setLinked(on) {
  linked = on; $('new-link').classList.toggle('on', on);
  if (on) { const w = +$('new-w').value, h = +$('new-h').value; ratio = (w > 0 && h > 0) ? w / h : 1; }
}

function syncRatio(which) {
  if (!linked) return;
  if (which === 'w') { const w = +$('new-w').value; if (w > 0) $('new-h').value = clampSize(w / ratio); }
  else { const h = +$('new-h').value; if (h > 0) $('new-w').value = clampSize(h * ratio); }
}

function readCustom() {
  const w = parseInt($('new-w').value, 10), h = parseInt($('new-h').value, 10);
  if (!w || !h || w < 2 || h < 2 || w > MAX_SIZE || h > MAX_SIZE) return null;
  return { w, h, label: ($('new-name-in').value.trim() || dim({ w, h })).slice(0, 24) };
}

function persistPreset(entry) {
  const a = custom();
  if (editIdx != null) a[editIdx] = entry;
  else {
    const old = a.findIndex((p) => p.w === entry.w && p.h === entry.h && p.label === entry.label);
    if (old >= 0) a.splice(old, 1);
    a.unshift(entry);
  }
  saveCustom(a); buildLists(); editIdx = null;
}

function editCustom(i) {
  const c = custom()[i]; if (!c) return;
  editIdx = i; nameCustom = true; $('new-name-in').value = c.label || dim(c); $('new-w').value = c.w; $('new-h').value = c.h; $('new-save').checked = true;
  if (linked) setLinked(true);
  $('new-w').focus(); $('new-w').select();
}

function removeCustom(i) { const a = custom(); a.splice(i, 1); saveCustom(a); buildLists(); }

function createCustom() {
  const entry = readCustom(); if (!entry) return;
  if ($('new-save').checked) persistPreset(entry);
  else editIdx = null;
  createDoc(entry);
}

function closeDlg() { editIdx = null; $('new-ovl').classList.remove('on'); }

function openDlg(ensureGallery = true) {
  if (ensureGallery) showGallery();
  syncName();
  buildLists(); syncBg(); setMode(mode);
  const ovl = $('new-ovl'); ovl.dataset.openedAt = Date.now(); ovl.classList.add('on');
}

function closeOutside(e) {
  if (!isOpen()) return;
  const target = e.target, p = panel(), r = p?.getBoundingClientRect();
  const inPanel = r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (p?.contains(target) || inPanel || target.closest?.('#rowctx') || target.closest?.('#gal-new') || target.closest?.('#new')) return;
  suppressOutsideClick = true; e.preventDefault(); e.stopPropagation(); closeDlg();
}

function bindOpen(el, ensureGallery) {
  if (!el) return; let suppressClick = 0;
  el.onclick = (e) => { if (Date.now() < suppressClick) { e.preventDefault(); return; } isOpen() ? closeDlg() : openDlg(ensureGallery); };
  el.addEventListener('touchend', (e) => {
    e.preventDefault(); suppressClick = Date.now() + 500; setTimeout(() => { isOpen() ? closeDlg() : openDlg(ensureGallery); }, 0);
  }, { passive: false });
}

export function mount() {
  bindOpen($('new'), true); bindOpen($('gal-new'), false);
  actions.register('doc.new', () => openDlg(true));
  $('new-create').onclick = createCustom;
  $('new-link').onclick = () => setLinked(!linked);
  $('new-bg').onclick = () => { bgIdx = (bgIdx + 1) % BGS.length; syncBg(); };
  $('new-mode-rgba').onclick = () => setMode('rgba');
  $('new-mode-gray').onclick = () => setMode('grayscale');
  $('new-w').addEventListener('input', () => { syncRatio('w'); syncName(); });
  $('new-h').addEventListener('input', () => { syncRatio('h'); syncName(); });
  $('new-name-in').addEventListener('input', () => { nameCustom = $('new-name-in').value.trim() !== ''; if (!nameCustom) syncName(true); });
  ['new-w', 'new-h', 'new-name-in'].forEach((id) => $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); createCustom(); } }));
  document.addEventListener('pointerdown', closeOutside, true);
  document.addEventListener('click', (e) => {
    if (suppressOutsideClick) { suppressOutsideClick = false; e.preventDefault(); e.stopPropagation(); return; }
    closeOutside(e);
  }, true);
  syncBg(); setMode('rgba');
}
