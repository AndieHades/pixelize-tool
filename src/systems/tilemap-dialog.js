import { S } from '../core/state.js';
import { $, t } from '../core/dom.js';
import { commitNumericField, isNumericLiteral, numericFieldValue, setNumericField } from '../core/numeric-field.js';
import { MAX_SIZE } from '../config/limits.js';
import { TILE_GRID_DEFAULT, TILEMAP_PRESET_SIZES } from '../config/tileset.js';

const STORE = 'tilemapPresets';
let submit = null, mounted = false, suppressOutsideClick = false, linked = false, ratio = 1, nameCustom = false;

const custom = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } };
const saveCustom = (a) => { try { localStorage.setItem(STORE, JSON.stringify(a)); } catch (e) {} };
const dim = (p) => `${p.tileW} x ${p.tileH}`;
const presets = () => [...custom(), ...TILEMAP_PRESET_SIZES.map((n) => ({ name: dim({ tileW: n, tileH: n }), tileW: n, tileH: n }))];
const fallbackSize = () => Math.max(1, Math.round(S.tileGrid?.size || TILE_GRID_DEFAULT));
const panel = () => $('tilemap-ovl')?.querySelector('.tilemap-panel');
const isOpen = () => $('tilemap-ovl')?.classList.contains('on');
const dimValue = (id) => numericFieldValue($(id), fallbackSize());
const currentDimName = () => dim({ tileW: dimValue('tm-grid-w'), tileH: dimValue('tm-grid-h') });
const syncName = (force = false) => { if (force || !nameCustom) $('tm-name').value = currentDimName(); };

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
          <button id="tm-link" class="new-link tilemap-link" type="button" data-i18n-title="new.lockRatio"><svg viewBox="0 0 24 24"><path d="M9.5 8H8a4 4 0 0 0 0 8h1.5"/><path d="M14.5 8H16a4 4 0 0 1 0 8h-1.5"/><path d="M8.5 12h7"/></svg></button>
          <label><span data-i18n="tilemap.gridH"></span><input id="tm-grid-h" inputmode="numeric"></label>
        </div>
        <label class="tilemap-save"><input id="tm-save" type="checkbox"><span></span><b data-i18n="tilemap.savePreset"></b></label>
        <label class="tilemap-save tilemap-resize"><input id="tm-resize-canvas" type="checkbox"><span></span><b data-i18n="tilemap.resizeCanvas"></b></label>
        <div class="tilemap-actions iact">
          <button id="tm-cancel" type="button" class="txtbtn" data-i18n="btn.cancel"></button>
          <button id="tm-apply" type="button" class="txtbtn primary" data-i18n="btn.apply"></button>
        </div>
      </section>
    </div>`;
  document.body.appendChild(ovl);
}

function applyTranslations() {
  const root = $('tilemap-ovl'); if (!root) return;
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
}

function setDim(id, v) { setNumericField($(id), Math.max(1, Math.min(MAX_SIZE, Math.round(v || fallbackSize())))); }
function setLinked(on) {
  linked = on; $('tm-link')?.classList.toggle('on', linked);
  if (linked) { const w = dimValue('tm-grid-w'), h = dimValue('tm-grid-h'); ratio = (w > 0 && h > 0) ? w / h : 1; }
}
function syncRatio(which) {
  if (!linked) return;
  if (which === 'w') { const w = dimValue('tm-grid-w'); if (w > 0) setDim('tm-grid-h', w / ratio); }
  else { const h = dimValue('tm-grid-h'); if (h > 0) setDim('tm-grid-w', h * ratio); }
}
function commitDim(which) {
  const id = which === 'w' ? 'tm-grid-w' : 'tm-grid-h';
  const v = commitNumericField($(id), { min: 1, max: MAX_SIZE, integer: true, fallback: fallbackSize() });
  if (v == null) return false;
  syncRatio(which); syncName(); return true;
}
function commitDims() { const first = document.activeElement === $('tm-grid-h') ? 'h' : 'w'; commitDim(first); commitDim(first === 'w' ? 'h' : 'w'); }

function readEntry() {
  commitDims(); const tileW = dimValue('tm-grid-w'), tileH = dimValue('tm-grid-h');
  return tileW && tileH ? { name: ($('tm-name').value.trim() || currentDimName()).slice(0, 32), tileW, tileH, resizeCanvas: !!$('tm-resize-canvas')?.checked } : null;
}

function renderSaved() {
  const host = $('tm-saved'); if (!host) return;
  host.innerHTML = '';
  const list = presets();
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
  setDim('tm-grid-w', p.tileW); setDim('tm-grid-h', p.tileH);
  nameCustom = !!(p.name && p.name !== dim(p)); $('tm-name').value = p.name || dim(p);
  if (linked) setLinked(true);
  syncName();
}

function closeDlg() { const ovl = $('tilemap-ovl'); if (ovl) ovl.classList.remove('on'); submit = null; }

function confirmDlg() {
  const entry = readEntry(); if (!entry) return;
  if ($('tm-save').checked) persistPreset({ name: entry.name, tileW: entry.tileW, tileH: entry.tileH });
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
  $('tm-apply').onclick = confirmDlg;
  $('tm-cancel').onclick = closeDlg;
  $('tm-link').onclick = () => setLinked(!linked);
  for (const [id, which] of [['tm-grid-w', 'w'], ['tm-grid-h', 'h']]) {
    $(id).addEventListener('input', () => { if (isNumericLiteral($(id).value)) { syncRatio(which); syncName(); } });
    $(id).addEventListener('blur', () => commitDim(which));
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmDlg(); } });
  }
  $('tm-name').addEventListener('input', () => { nameCustom = $('tm-name').value.trim() !== ''; if (!nameCustom) syncName(true); });
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
  setDim('tm-grid-w', opts.tileW || fallbackSize());
  setDim('tm-grid-h', opts.tileH || opts.tileW || fallbackSize());
  nameCustom = !!opts.name; $('tm-name').value = opts.name || currentDimName();
  setLinked(linked);
  $('tm-save').checked = false;
  $('tm-resize-canvas').checked = !!opts.resizeCanvas;
  submit = opts.onSubmit || null;
  renderSaved();
  const ovl = $('tilemap-ovl'); ovl.dataset.openedAt = Date.now(); ovl.classList.add('on');
  $('tm-name').focus(); $('tm-name').select();
}

export function mount() { ensure(); bind(); applyTranslations(); renderSaved(); }
