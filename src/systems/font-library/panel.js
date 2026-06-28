import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, t, toast } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { snapshot } from '../../core/history.js';
import { markDirty } from '../../core/layer-cache.js';
import { updateTextLayerGrid } from '../../core/text-layer.js';
import { loadFonts, importFontFile, renameFont, deleteFont } from '../../core/font-store.js';
import { loadTextPrefs, saveTextPrefs } from '../../core/text-prefs.js';
import { TEXT_IMPORT, TEXT_SIZE } from '../../config/text.js';

let fonts = [], prefs = loadTextPrefs(), menuFont = null, live = false;
const activeText = () => S.layers[S.cur] && S.layers[S.cur].kind === 'text' ? S.layers[S.cur] : null;
const current = () => activeText()?.text || prefs;
const opened = () => $('font-pop').classList.contains('on');

function applyPatch(patch, hist = true) {
  const L = activeText();
  prefs = saveTextPrefs({ ...prefs, ...patch });
  if (L) {
    if (hist) snapshot();
    L.text = { ...L.text, ...patch };
    updateTextLayerGrid(L, S.W, S.H, fonts); markDirty(S.cur);
    bus.emit('layers'); bus.emit('render');
  }
  syncControls(); renderFonts();
}

function syncControls() {
  const src = current();
  $('font-size').min = TEXT_SIZE.min; $('font-size').max = TEXT_SIZE.max; $('font-size').step = TEXT_SIZE.step;
  $('font-size').value = src.size; $('font-sizev').textContent = src.size + ' px';
  $('font-color').style.background = src.color;
}

function tile(f) {
  const b = document.createElement('button'); b.className = 'ftile'; b.dataset.id = f.id; b.title = f.name;
  b.classList.toggle('on', current().fontId === f.id);
  const mark = document.createElement('b'); mark.textContent = 'T'; mark.style.fontFamily = f.family;
  const nm = document.createElement('span'); nm.textContent = f.name;
  b.append(mark, nm);
  b.onclick = () => applyPatch({ fontId: f.id });
  b.oncontextmenu = (e) => { e.preventDefault(); if (f.builtin || f.folder) return; menuFont = f; showMenuAt($('font-menu'), e.clientX, e.clientY, true); };
  return b;
}

function renderFonts() {
  const box = $('font-list'); if (!box) return; box.innerHTML = '';
  fonts.forEach((f) => box.appendChild(tile(f)));
}

async function refresh() {
  fonts = await loadFonts(); syncControls(); renderFonts();
}

function pickFont() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = TEXT_IMPORT.accept; i.multiple = true;
  i.onchange = async (e) => {
    const list = [...e.target.files]; e.target.value = '';
    for (const f of list) try { await importFontFile(f); toast(t('toast.fontImported', { name: f.name })); } catch (err) { toast(t('toast.fontImportFail')); }
    refresh();
  };
  i.click();
}

function menuAct(act) {
  const f = menuFont; $('font-menu').classList.remove('on'); if (!f) return;
  if (act === 'delete') deleteFont(f.id).then(refresh);
  if (act === 'rename') {
    const next = window.prompt(t('font.rename'), f.name);
    if (next) renameFont(f.id, next).then(refresh);
  }
}

function open(force = false) { if (force) $('font-pop').classList.add('on'); else $('font-pop').classList.toggle('on'); refresh(); }

export function mount() {
  floatingWindow($('font-pop'), { grip: $('font-head'), handle: $('font-rsz'), storeKey: 'fontwin', minW: 250, minH: 180,
    onClose: () => $('font-pop').classList.remove('on') });
  $('font-add').onclick = pickFont;
  $('font-size').addEventListener('pointerdown', () => { live = false; });
  $('font-size').addEventListener('input', () => { if (!live) { snapshot(); live = true; } applyPatch({ size: +$('font-size').value }, false); });
  $('font-size').addEventListener('change', () => { live = false; });
  $('font-color').onclick = () => { snapshot(); actions.run('color.for', current().color, (hex) => applyPatch({ color: hex }, false)); };
  $('font-menu').onclick = (e) => { const b = e.target.closest('button'); if (b) menuAct(b.dataset.act); };
  $('font-pop').addEventListener('dragover', (e) => { e.preventDefault(); });
  $('font-pop').addEventListener('drop', async (e) => { e.preventDefault(); for (const f of e.dataTransfer.files) try { await importFontFile(f); } catch (err) {} refresh(); });
  bus.on('layer-active', () => { if (opened()) { syncControls(); renderFonts(); } });
  bus.on('locale', () => { if (opened()) renderFonts(); });
  actions.register('ui.fontLibrary', open);
  actions.register('text.applyPrefs', applyPatch);
  refresh();
}
