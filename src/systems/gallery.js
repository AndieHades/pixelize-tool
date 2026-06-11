// Галерея работ (Procreate-стиль): стартовый экран с плитками, открытие работы,
// автосохранение в IndexedDB. Превью — композит при сохранении.
import { S, newLayer, blank } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $ } from '../core/dom.js';
import { cloneGrid } from '../core/history.js';
import { compositeLayers, dirtyAll } from '../core/layer-cache.js';
import { dedupePal } from '../logic/quantize.js';
import { defaultPalette, DEFAULT_ACTIVE } from '../config/palette.js';
import { DEFAULT_DOC } from '../config/presets.js';
import { saveDoc, getDoc, listDocs, removeDoc } from '../core/storage.js';
import { t } from '../i18n/index.js';

let curId = null, saveT = null;
const uid = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function record(id) {
  const c = document.createElement('canvas'); c.width = S.W; c.height = S.H; compositeLayers(c.getContext('2d'));
  return { id, name: S.docName || t('gallery.untitled'), W: S.W, H: S.H, layerSeq: S.layerSeq, folderSeq: S.folderSeq,
    layers: S.layers.map((L) => ({ name: L.name, opacity: L.opacity, visible: L.visible, fid: L.fid, clip: !!L.clip, symLock: !!L.symLock, ext: new Map(L.ext), grid: cloneGrid(L.grid) })),
    folders: S.folders.map((f) => ({ ...f })), palette: S.palette.map((p) => p.slice()), active: S.active.slice(),
    preview: c.toDataURL('image/png'), updated: Date.now() }; }

function apply(rec) { S.W = rec.W; S.H = rec.H; S.layerSeq = rec.layerSeq || 1; S.folderSeq = rec.folderSeq || 0;
  S.layers = rec.layers; S.folders = rec.folders || []; S.palette = dedupePal(rec.palette); S.active = (rec.active || S.palette[0]).slice();
  S.docName = rec.name; S.cur = 0; S.marked.clear(); S.undoStack.length = 0; S.redoStack.length = 0;
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = null;
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('selection'); bus.emit('fit'); }

export async function saveCurrent() { if (!curId) return; try { await saveDoc(record(curId)); } catch (e) {} }
const autosave = () => { clearTimeout(saveT); saveT = setTimeout(saveCurrent, 800); };

export function newWork(w, h) { curId = uid();
  S.W = w; S.H = h; S.layerSeq = 1; S.folderSeq = 0; S.layers = [newLayer('Слой 1', w, h)]; S.folders = []; S.cur = 0; S.marked.clear();
  S.palette = defaultPalette(); S.active = S.palette[DEFAULT_ACTIVE].slice(); S.docName = t('gallery.untitled');
  S.undoStack.length = 0; S.redoStack.length = 0; S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = null;
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); hide(); saveCurrent(); }

async function openWork(id) { const rec = await getDoc(id); if (!rec) return; await saveCurrent(); curId = id; apply(rec); hide(); }

let selecting = false; const selected = new Set();
function updateDel() { const b = $('gal-del'); b.style.display = selecting ? '' : 'none';
  b.textContent = t('gallery.delete') + (selected.size ? ' (' + selected.size + ')' : ''); b.disabled = !selected.size; }
function toggleSelect() { selecting = !selecting; selected.clear();
  $('gal-select').classList.toggle('on', selecting); $('gal-select').textContent = t(selecting ? 'gallery.done' : 'gallery.select');
  updateDel(); renderTiles(); }
async function delSelected() { if (!selected.size) return; for (const id of selected) await removeDoc(id); selected.clear(); updateDel(); renderTiles(); }

async function renderTiles() { const grid = $('gal-grid'); grid.innerHTML = '';
  const docs = (await listDocs()).sort((a, b) => b.updated - a.updated);
  for (const d of docs) { const tile = document.createElement('div'); tile.className = 'gal-tile' + (selected.has(d.id) ? ' sel' : '');
    const img = document.createElement('img'); img.src = d.preview || ''; img.alt = d.name;
    const cap = document.createElement('div'); cap.className = 'gal-cap'; cap.innerHTML = `<b>${d.name}</b><small>${d.W}×${d.H} px</small>`;
    tile.append(img, cap);
    tile.onclick = () => { if (selecting) { if (selected.has(d.id)) selected.delete(d.id); else selected.add(d.id); tile.classList.toggle('sel'); updateDel(); } else openWork(d.id); };
    tile.oncontextmenu = (e) => { e.preventDefault(); if (confirm(t('gallery.deleteAsk') + ' «' + d.name + '»?')) removeDoc(d.id).then(renderTiles); };
    grid.appendChild(tile); } }

export function show() { saveCurrent(); renderTiles(); $('gallery').classList.add('on'); }
function hide() { $('gallery').classList.remove('on'); }

export async function mount() {
  $('gal-new').onclick = () => $('new-ovl').classList.add('on');
  $('gal-import').onclick = () => { hide(); actions.run('file.import'); };
  $('gal-convert').onclick = () => { hide(); actions.run('file.import'); };
  $('gal-select').onclick = toggleSelect; $('gal-del').onclick = delSelected;
  $('new-create').onclick = () => { const w = parseInt($('new-w').value, 10), h = parseInt($('new-h').value, 10);
    if (w >= 2 && h >= 2 && w <= 640 && h <= 640) { $('new-ovl').classList.remove('on'); newWork(w, h); } };
  $('docsbtn').onclick = show;
  bus.on('snapshot', autosave); bus.on('layers', autosave);
  const docs = await listDocs();
  if (docs.length) { curId = docs.sort((a, b) => b.updated - a.updated)[0].id; apply(await getDoc(curId)); show(); }
  else newWork(DEFAULT_DOC.w, DEFAULT_DOC.h);
}
