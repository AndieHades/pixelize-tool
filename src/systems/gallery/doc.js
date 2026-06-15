// Персистентность активной работы: снимок S → запись, восстановление, новая
// работа (в т.ч. из картинки), автосохранение.
import { S, newLayer, cloneFx, cloneLayer } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { compositeLayers, dirtyAll } from '../../core/layer-cache.js';
import { dedupePal } from '../../logic/quantize.js';
import { defaultPalette, DEFAULT_ACTIVE } from '../../config/palette.js';
import { saveDoc, getDoc } from '../../core/storage.js';
import { t } from '../../i18n/index.js';
import { uid } from './store.js';

let curId = null, curFolder = null, saveT = null;
export const curWorkId = () => curId;

function record() {
  const c = document.createElement('canvas'); c.width = S.W; c.height = S.H; compositeLayers(c.getContext('2d'));
  return { id: curId, kind: 'doc', folder: curFolder, name: S.docName || t('gallery.untitled'), W: S.W, H: S.H,
    layerSeq: S.layerSeq, folderSeq: S.folderSeq,
    layers: S.layers.map((L) => cloneLayer(L)),
    folders: S.folders.map((f) => ({ ...f, effects: cloneFx(f.effects) })), palette: S.palette.map((p) => p.slice()), active: S.active.slice(),
    preview: c.toDataURL('image/png'), order: Date.now(), updated: Date.now() };
}

export async function saveCurrent() { if (!curId) return;
  try { const rec = record(); const old = await getDoc(curId); if (old) { rec.folder = old.folder ?? null; rec.order = old.order ?? rec.order; } await saveDoc(rec); } catch (e) {} }
export const autosave = () => { clearTimeout(saveT); saveT = setTimeout(saveCurrent, 800); };

function applyRec(rec) { S.W = rec.W; S.H = rec.H; S.layerSeq = rec.layerSeq || 1;
  S.layers = rec.layers; S.folders = rec.folders || [];
  S.layers.forEach((L) => { if (!L.effects) L.effects = []; L.reference = !!L.reference; }); S.folders.forEach((f) => { if (!f.effects) f.effects = []; }); // старые проекты без эффектов/reference
  // folderSeq всегда впереди реальных id — иначе новые папки могут получить чужой id (старые проекты)
  S.folderSeq = S.folders.reduce((m, f) => Math.max(m, f.id), rec.folderSeq || 0); S.palette = dedupePal(rec.palette); S.active = (rec.active || S.palette[0]).slice();
  S.shading = { colors: [], on: false, open: false, picking: false };
  S.docName = rec.name; S.cur = 0; S.marked.clear(); S.undoStack.length = 0; S.redoStack.length = 0;
  S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.fxDraft = null;
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('selection'); bus.emit('fit'); }

function blankWork(w, h, name) { curId = uid('d'); curFolder = null;
  S.W = w; S.H = h; S.layerSeq = 1; S.folderSeq = 0; S.layers = [newLayer(t('layer.name') + ' 1', w, h)]; S.folders = []; S.cur = 0; S.marked.clear();
  S.palette = defaultPalette(); S.active = S.palette[DEFAULT_ACTIVE].slice(); S.docName = name || t('gallery.untitled');
  S.shading = { colors: [], on: false, open: false, picking: false };
  S.undoStack.length = 0; S.redoStack.length = 0; S.sel = S.selMask = S.selFloat = S.cropMode = S.rotMode = S.fxDraft = null; }

export function newWork(w, h, name) { blankWork(w, h, name);
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); saveCurrent(); }

export function newWorkFromImage(w, h, data, name) { blankWork(w, h, name);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (data[o + 3] < 8) continue; S.layers[0].grid[y][x] = [data[o], data[o + 1], data[o + 2], data[o + 3]]; }
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); saveCurrent(); }

export function newWorkFromLayers(w, h, layers, name) { blankWork(w, h, name);
  S.layers = layers.map((L, i) => ({ name: L.name || (t('layer.name') + ' ' + (i + 1)), grid: L.grid, opacity: 1, visible: true, fid: null, clip: false, lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [] }));
  if (!S.layers.length) S.layers = [newLayer(t('layer.name') + ' 1', w, h)];
  S.cur = S.layers.length - 1;
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); saveCurrent(); }

// заготовка нового документа под результат конвертера (applyImport заполнит S)
export function beginConvertedWork() { curId = uid('d'); curFolder = null; S.docName = t('gallery.untitled'); }

export async function openWork(id) { const rec = await getDoc(id); if (!rec || rec.kind === 'folder') return false;
  await saveCurrent(); curId = id; curFolder = rec.folder ?? null; applyRec(rec); return true; }
