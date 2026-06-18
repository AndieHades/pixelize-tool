import { S } from '../core/state.js';
import { $, t } from '../core/dom.js';
import { commitNumericField, isNumericLiteral, numericFieldValue, setNumericField } from '../core/numeric-field.js';
import { MAX_SIZE } from '../config/limits.js';
import { TILE_GRID_DEFAULT } from '../config/tileset.js';

const STORE = 'tilemapPresets';
let submit = null, mounted = false, suppressOutsideClick = false;

const custom = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } };
const saveCustom = (a) => { try { localStorage.setItem(STORE, JSON.stringify(a)); } catch (e) {} };
const dim = (p) => `${p.tileW} x ${p.tileH}`;
const fallbackSize = () => Math.max(1, Math.round(S.tileGrid?.size || TILE_GRID_DEFAULT));
const panel = () => $('tilemap-ovl')?.querySelector('.tilemap-panel');
const isOpen = () => $('tilemap-ovl')?.classList.contains('on');

function ensure() {
  if ($('tilemap-ovl')) return;
  const ovl = document.createElement('div'); ovl.id = 'tilemap-ovl'; ovl.className = 'ovl';
  ovl.innerHTML = `
    <div class="tilemap-panel" role="dialog" aria-modal="true" aria-labelledby="tm-title">
      <header class="tilemap-head"><h3 id="tm-title"></h3></header>
      <div class="tilemap-scroll">
        <section class="tilemap-group">
          <h4 data-i18n="tilemap.tileset"></h4>
          <button id="tm-kind" class="tilemap-row tilemap-select" type="button">
            <b id="tm-kind-name"></b><span>&rsaquo;</span>
          </button>
        </section>
        <section class="tilemap-group tilemap-saved">
          <h4 data-i18n="tilemap.saved"></h4>
          <div id="tm-saved" class="tilemap-stack"></div>
        </section>
      </div>
      <section class="tilemap-custom">
        <h4 data-i18n="tilemap.custom"></h4>
        <label class="tilemap-name-field"><span data-i18n="tilemap.name"></span><input id="tm-name" type="text" autocomplete="off"></label>
        <div class="tilemap-grid-fields">
          <label><span data-i18n="tilemap.gridW"></span><input id="tm-grid-w" inputmode="numeric"></label>
          <label><span data-i18n="tilemap.gridH"></span><input id="tm-grid-h" inputmode="numeric"></label>
        </div>
        <label class="tilemap-save"><input id="tm-save" type="checkbox"><span></span><b data-i18n="tilemap.savePreset"></b></label>
        <div class="tilemap-actions">
          <button id="tm-ok" type="button" class="primary" data-i18n="btn.ok"></button>
          <button id="tm-cancel" type="button" data-i18n="btn.cancel"></button>
        </div>
      </section>
    </div>`;
  document.body.appendChild(ovl);
}

function applyTranslations() {
  const root = $('tilemap-ovl'); if (!root) return;
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
}

function setDim(id, v) { setNumericField($(id), Math.max(1, Math.min(MAX_SIZE, Math.round(v || fallbackSize())))); }
function readDim(id) {
  return commitNumericField($(id), { min: 1, max: MAX_SIZE, integer: true, fallback: fallbackSize() });
}

function readEntry() {
  const tileW = readDim('tm-grid-w'), tileH = readDim('tm-grid-h');
  if (!tileW || !tileH) return null;
  const name = ($('tm-name').value.trim() || t('tilemap.newTileset')).slice(0, 32);
  return { name, tileW, tileH };
}

function renderSaved() {
  const host = $('tm-saved'); if (!host) return;
  host.innerHTML = '';
  const list = custom();
  if (!list.length) {
    const p = document.createElement('p'); p.className = 'tilemap-empty'; p.textContent = t('tilemap.savedEmpty'); host.appendChild(p); return;
  }
  for (const p of list) {
    const row = document.createElement('button'); row.type = 'button'; row.className = 'tilemap-row saved';
    row.innerHTML = '<b></b><em></em>';
    row.querySelector('b').textContent = p.name || t('tilemap.newTileset');
    row.querySelector('em').textContent = dim(p);
    row.onclick = () => applyPreset(p);
    host.appendChild(row);
  }
}

function persistPreset(entry) {
  const list = custom();
  const old = list.findIndex((p) => p.name === entry.name && p.tileW === entry.tileW && p.tileH === entry.tileH);
  if (old >= 0) list.splice(old, 1);
  list.unshift(entry);
  saveCustom(list.slice(0, 24));
  renderSaved();
}

function applyPreset(p) {
  $('tm-name').value = p.name || t('tilemap.newTileset');
  setDim('tm-grid-w', p.tileW); setDim('tm-grid-h', p.tileH);
}

function closeDlg() { const ovl = $('tilemap-ovl'); if (ovl) ovl.classList.remove('on'); submit = null; }

function confirmDlg() {
  const entry = readEntry(); if (!entry) return;
  if ($('tm-save').checked) persistPreset(entry);
  const fn = submit; closeDlg();
  if (fn) fn(entry);
}

function closeOutside(e) {
  if (!isOpen()) return;
  const p = panel(), target = e.target;
  if (p?.contains(target) || target.closest?.('#lay-tmap') || target.closest?.('#lctx')) return;
  suppressOutsideClick = true; e.preventDefault(); e.stopPropagation(); closeDlg();
}

function bind() {
  if (mounted) return; mounted = true;
  $('tm-ok').onclick = confirmDlg;
  $('tm-cancel').onclick = closeDlg;
  for (const id of ['tm-grid-w', 'tm-grid-h']) {
    $(id).addEventListener('input', () => { if (isNumericLiteral($(id).value)) setNumericField($(id), numericFieldValue($(id), fallbackSize())); });
    $(id).addEventListener('blur', () => readDim(id));
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmDlg(); } });
  }
  $('tm-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmDlg(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) closeDlg(); }, true);
  document.addEventListener('pointerdown', closeOutside, true);
  document.addEventListener('click', (e) => {
    if (!suppressOutsideClick) return;
    suppressOutsideClick = false; e.preventDefault(); e.stopPropagation();
  }, true);
}

export function openTilemapDialog(opts = {}) {
  ensure(); bind(); applyTranslations();
  $('tm-title').textContent = opts.title || t('tile.newLayer');
  $('tm-kind-name').textContent = t('tilemap.newTileset');
  $('tm-name').value = opts.name || t('tilemap.newTileset');
  setDim('tm-grid-w', opts.tileW || fallbackSize());
  setDim('tm-grid-h', opts.tileH || opts.tileW || fallbackSize());
  $('tm-save').checked = false;
  submit = opts.onSubmit || null;
  renderSaved();
  const ovl = $('tilemap-ovl'); ovl.dataset.openedAt = Date.now(); ovl.classList.add('on');
  $('tm-name').focus(); $('tm-name').select();
}

export function mount() { ensure(); bind(); applyTranslations(); renderSaved(); }
