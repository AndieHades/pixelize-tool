// Операции над слоями: добавить, слить отмеченные/диапазон, сгруппировать, дублировать.
import { S, newLayer, cloneFx, blank } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot, cloneGrid } from '../../core/history.js';
import { symmetrizeGrid } from '../../logic/raster.js';
import { rgbToHex } from '../../logic/color.js';
import { dirtyAll, markDirty } from '../../core/layer-cache.js';
import { bakeFolder, bakeLayerIndices } from '../../core/layer-bake.js';
import { toast, t } from '../../core/dom.js';
import { MAX_LAYERS } from '../../config/limits.js';
import { folderChain } from '../../core/layers.js';
import { localeValues } from '../../i18n/index.js';
import { folderLayers, topOfFolder, commonParent, selectedIdx, nextFolderId, uniqueFolderName, nextFolderName, clearFolderEmptyPos, rememberEmptyFolderPositions } from './helpers.js';

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function nextLayerName() {
  const bases = localeValues('layer.name').map(escRe), re = new RegExp('^(?:' + bases.join('|') + ')\\s+(\\d+)$');
  let max = 0;
  for (const L of S.layers) { const m = (L.name || '').trim().match(re); if (m) max = Math.max(max, +m[1]); }
  S.layerSeq = max + 1; return t('layer.name') + ' ' + S.layerSeq;
}

export function doAddLayer() { if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  snapshot(); const cur = S.layers[S.cur], chain = cur ? folderChain(cur.fid) : [];
  const inOpenFolder = !S.selFolder && cur && cur.fid != null && chain.every((f) => f.open);
  const nl = newLayer(nextLayerName(), S.W, S.H); nl.fid = inOpenFolder ? cur.fid : null;
  const at = inOpenFolder ? S.cur + 1 : S.layers.length;
  S.layers.splice(at, 0, nl); clearFolderEmptyPos(nl.fid);
  S.cur = at; S.selFolder = null; S.marked.clear(); S.markedFolders.clear(); S.fxSel.clear(); S.fxCur = null;
  dirtyAll(); bus.emit('layers'); bus.emit('render'); }

function mergeIndices(idx) { idx = [...new Set(idx)].filter((i) => S.layers[i]).sort((a, b) => a - b); if (idx.length < 2) return;
  snapshot();
  const meta = idx[idx.length - 1], out = bakeLayerIndices(idx), ext = new Map();
  const merged = { name: S.layers[meta].name, grid: out, opacity: 1, visible: true, fid: S.layers[meta].fid, clip: false, lock: false, alphaLock: false, reference: idx.some((i) => S.layers[i].reference), ext, effects: [] };
  for (let j = idx.length - 1; j >= 0; j--) S.layers.splice(idx[j], 1);
  const at = meta - idx.length + 1;
  S.layers.splice(at, 0, merged); clearFolderEmptyPos(merged.fid);
  S.cur = at; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(t('toast.layersMerged')); }

function selectedFolder() { const id = S.selFolder ?? (S.markedFolders.size === 1 ? [...S.markedFolders][0] : null);
  return id == null ? null : S.folders.find((f) => f.id === id); }

function mergeFolder(f) { const baked = bakeFolder(f); if (baked.idx.length < 1) return;
  snapshot(); const at = Math.min(...baked.idx), parent = f.parent ?? null;
  const merged = { name: f.name, grid: baked.grid, opacity: 1, visible: true, fid: parent, clip: false, lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [] };
  for (let j = baked.idx.length - 1; j >= 0; j--) S.layers.splice(baked.idx[j], 1);
  S.folders = S.folders.filter((sf) => !folderChain(sf.id).some((x) => x.id === f.id));
  S.layers.splice(at, 0, merged); S.cur = at; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(t('toast.layersMerged')); }

export function doMerge() { const f = selectedFolder(); if (f) { mergeFolder(f); return; } let idx = selectedIdx();
  if (idx.length < 2) { if (S.cur > 0) idx = [S.cur - 1, S.cur]; else { toast(t('toast.markLayers')); return; } }
  mergeIndices(idx); }

// слить диапазон слоёв [a..b] (щипок), независимо от выбора
export function mergeRange(a, b) { const idx = []; for (let i = Math.min(a, b); i <= Math.max(a, b); i++) idx.push(i); mergeIndices(idx); }

function activeAfterDelete(idx) {
  const gone = new Set(idx), curObj = S.layers[S.cur]; let target = gone.has(S.cur) ? null : curObj;
  if (!target) for (let i = S.cur - 1; i >= 0; i--) if (!gone.has(i)) { target = S.layers[i]; break; }
  return () => { S.cur = target && S.layers.includes(target) ? S.layers.indexOf(target) : 0; };
}

export function doGroup() { const idx = selectedIdx(); // сгруппировать всё выделенное (активный + отмеченные)
  snapshot(); const parent = commonParent(idx.map((i) => S.layers[i])); // вложить в общую папку, если она одна
  const id = nextFolderId(); const f = { id, name: nextFolderName(), open: true, visible: true, symLock: false, parent, effects: [] };
  S.folders.push(f); const moved = [];
  for (let j = idx.length - 1; j >= 0; j--) moved.unshift(S.layers.splice(idx[j], 1)[0]);
  moved.forEach((L) => { L.fid = f.id; }); clearFolderEmptyPos(f.id); S.layers.splice(idx[0], 0, ...moved);
  S.cur = idx[0] + moved.length - 1; S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(t('toast.folderCreated')); }

export function duplicateLayer(L) { if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  const idx = S.layers.indexOf(L); if (idx < 0) return; snapshot();
  S.layers.splice(idx + 1, 0, { name: L.name + ' ' + t('layer.copySuffix'), opacity: L.opacity, visible: L.visible, fid: L.fid, clip: !!L.clip, lock: !!L.lock, alphaLock: !!L.alphaLock, reference: false, symLock: !!L.symLock, ext: new Map(L.ext), grid: cloneGrid(L.grid), effects: cloneFx(L.effects) });
  S.cur = idx + 1; S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(t('toast.layerDup')); }

export function symmetrizeLayerRefs(layers) { const ts = layers.filter((L) => S.layers.includes(L)); if (!ts.length) return;
  snapshot(); const v = S.sym || (!S.sym && !S.symH), h = S.symH;
  for (const L of ts) { symmetrizeGrid(L.grid, v, h); markDirty(S.layers.indexOf(L)); }
  bus.emit('layers'); bus.emit('render'); }

// переключатели свойств слоя — общие для свайпов и контекстного меню
export function toggleLock(L) { snapshot(); L.lock = !L.lock; bus.emit('layers'); }
export function toggleAlphaLock(L) { snapshot(); L.alphaLock = !L.alphaLock; bus.emit('layers'); }
export function toggleClip(L) { snapshot(); L.clip = !L.clip; bus.emit('layers'); bus.emit('render'); }
export function toggleReference(L) { if (!L) return; snapshot(); const on = !L.reference;
  for (const x of S.layers) if (x !== L) x.reference = false;
  L.reference = on; bus.emit('layers'); }
export function clearLayerRef(L) { const idx = S.layers.indexOf(L); if (idx < 0) return; snapshot();
  L.grid = blank(S.W, S.H); L.ext = new Map(); markDirty(idx); bus.emit('layers'); bus.emit('render'); toast(t('toast.layerCleared')); }

export function fillLayerRefs(layers, color) {
  const ts = layers.filter((L) => S.layers.includes(L));
  if (!ts.length || !Array.isArray(color) || color.length < 3) return false;
  snapshot(); const a = [color[0], color[1], color[2], 255];
  for (const L of ts) {
    let hasContent = false;
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
      const c = L.grid[y][x]; if (c && (c[3] ?? 255) > 0) hasContent = true;
    }
    if (!hasContent && L.ext) for (const c of L.ext.values()) if (c && (c[3] ?? 255) > 0) { hasContent = true; break; }
    if (hasContent) {
      for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) {
        const c = L.grid[y][x]; if (c && (c[3] ?? 255) > 0) L.grid[y][x] = [a[0], a[1], a[2], c[3] ?? 255];
      }
      if (L.ext) for (const [k, c] of L.ext) if (c && (c[3] ?? 255) > 0) L.ext.set(k, [a[0], a[1], a[2], c[3] ?? 255]);
    } else {
      for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) L.grid[y][x] = a.slice();
      L.ext = new Map();
    }
    markDirty(S.layers.indexOf(L));
  }
  actions.run('color.used', color); bus.emit('layers'); bus.emit('render'); return true;
}

export function dropColorAtLayer(color, clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  const fxrow = el && el.closest ? el.closest('#lay-list .fxrow') : null;
  if (fxrow && fxrow.__eff && fxrow.__eff.params && Object.prototype.hasOwnProperty.call(fxrow.__eff.params, 'color')) {
    snapshot(); fxrow.__eff.params.color = rgbToHex(color).toLowerCase();
    S.fxCur = fxrow.__eff; S.fxSel = new Set([fxrow.__eff]);
    actions.run('color.used', color); dirtyAll(); bus.emit('layers'); bus.emit('render'); return true;
  }
  const row = el && el.closest ? el.closest('#lay-list .lrow[data-li], #lay-list .lrow[data-fid]') : null;
  if (!row) return false;
  if (row.dataset.li != null) return fillLayerRefs([S.layers[+row.dataset.li]], color);
  const f = S.folders.find((x) => x.id === +row.dataset.fid);
  return f ? fillLayerRefs(folderLayers(f), color) : false;
}

export function deleteLayerRef(L) { if (S.layers.length < 2) { toast(t('toast.onlyLayer')); return; }
  const idx = S.layers.indexOf(L); if (idx < 0) return; const restoreActive = activeAfterDelete([idx]);
  const restoreEmptyFolders = rememberEmptyFolderPositions([idx]);
  snapshot(); S.layers.splice(idx, 1); restoreEmptyFolders(); restoreActive(); S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); }

export function duplicateFolder(f) { const kids = folderLayers(f); if (!kids.length) return;
  if (S.layers.length + kids.length > MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  snapshot();
  const subs = S.folders.filter((sf) => folderChain(sf.id).some((x) => x.id === f.id)); // f + все потомки
  const map = new Map(); // имена и id новых папок — уникальны; пушим сразу, чтобы следующие копии это учитывали
  for (const sf of subs) { const nf = { ...sf, id: nextFolderId(), name: uniqueFolderName(sf === f ? sf.name + ' ' + t('layer.copySuffix') : sf.name), effects: cloneFx(sf.effects) }; delete nf.emptyPos; map.set(sf.id, nf); S.folders.push(nf); }
  for (const sf of subs) { const nf = map.get(sf.id); nf.parent = (sf === f) ? (f.parent ?? null) : (map.has(sf.parent) ? map.get(sf.parent).id : sf.parent ?? null); }
  const copies = kids.map((L) => ({ name: L.name + ' ' + t('layer.copySuffix'), opacity: L.opacity, visible: L.visible, fid: map.get(L.fid).id, clip: !!L.clip, lock: !!L.lock, alphaLock: !!L.alphaLock, reference: false, symLock: !!L.symLock, ext: new Map(L.ext), grid: cloneGrid(L.grid), effects: cloneFx(L.effects) }));
  const dst = topOfFolder(f.id) + 1; S.layers.splice(dst, 0, ...copies); S.cur = dst + copies.length - 1; S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(t('toast.folderDup')); }

// удалить папку и всё её содержимое (слои + вложенные папки)
export function deleteFolder(f) {
  const kids = folderLayers(f);
  if (S.layers.length - kids.length < 1) { toast(t('toast.onlyLayer')); return; }
  snapshot();
  for (let i = S.layers.length - 1; i >= 0; i--) if (folderChain(S.layers[i].fid).some((x) => x.id === f.id)) S.layers.splice(i, 1);
  S.folders = S.folders.filter((sf) => sf !== f && !folderChain(sf.id).some((x) => x.id === f.id));
  S.cur = Math.min(S.cur, S.layers.length - 1); S.marked.clear(); S.markedFolders.clear(); S.selFolder = null;
  dirtyAll(); bus.emit('layers'); bus.emit('render'); }

export function deleteLayer() {
  if (S.fxCur || S.fxSel.size) { actions.run('fx.delete'); return; } // выбран эффект → удаляем эффект, а не слой
  // удалить всё выделенное: слои S.marked+S.cur и содержимое выделенных папок
  const allIdx = new Set(selectedIdx());
  const markedFids = [...S.markedFolders];
  for (const fid of markedFids) { const f = S.folders.find((x) => x.id === fid); if (!f) continue;
    for (const L of folderLayers(f)) { const i = S.layers.indexOf(L); if (i >= 0) allIdx.add(i); } }
  const idx = [...allIdx].filter((i) => S.layers[i]).sort((a, b) => a - b);
  if (S.layers.length - idx.length < 1) { toast(t('toast.onlyLayer')); return; }
  const restoreActive = activeAfterDelete(idx);
  const removedFids = new Set(S.folders.filter((sf) => markedFids.includes(sf.id) || folderChain(sf.id).some((x) => markedFids.includes(x.id))).map((sf) => sf.id));
  const restoreEmptyFolders = rememberEmptyFolderPositions(idx, removedFids); snapshot();
  if (markedFids.length) S.folders = S.folders.filter((sf) => !markedFids.includes(sf.id) && !folderChain(sf.id).some((x) => markedFids.includes(x.id)));
  for (let j = idx.length - 1; j >= 0; j--) S.layers.splice(idx[j], 1);
  restoreEmptyFolders(); restoreActive();
  S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; dirtyAll(); bus.emit('layers'); bus.emit('render'); }

actions.register('layer.add', doAddLayer);
actions.register('layer.merge', doMerge);
actions.register('layer.group', doGroup);
actions.register('layer.dropColorAt', dropColorAtLayer);
