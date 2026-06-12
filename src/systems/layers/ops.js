// Операции над слоями: добавить, слить отмеченные, сгруппировать, дублировать.
import { S, newLayer } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot, cloneGrid } from '../../core/history.js';
import { mergeCells } from '../../logic/raster.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { toast, t } from '../../core/dom.js';
import { MAX_LAYERS } from '../../config/limits.js';
import { folderChain } from '../../core/layers.js';
import { folderLayers, topOfFolder, commonParent } from './helpers.js';

export function doAddLayer() { if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  snapshot(); const nl = newLayer('Слой ' + (++S.layerSeq), S.W, S.H); nl.fid = S.layers[S.cur].fid;
  S.layers.splice(S.cur + 1, 0, nl); S.cur++; S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); }

function mergeIndices(idx) { idx = [...new Set(idx)].filter((i) => S.layers[i]).sort((a, b) => a - b); if (idx.length < 2) return;
  snapshot();
  const base = idx[0], out = cloneGrid(S.layers[base].grid), ext = new Map(S.layers[base].ext);
  for (let j = 1; j < idx.length; j++) { const L = S.layers[idx[j]];
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const t2 = L.grid[y][x]; if (t2) out[y][x] = mergeCells(out[y][x], t2, L.opacity); }
    for (const [k, c] of L.ext) ext.set(k, c); }
  const merged = { name: S.layers[base].name, grid: out, opacity: 1, visible: true, fid: S.layers[base].fid, clip: false, lock: false, alphaLock: false, ext };
  for (let j = idx.length - 1; j >= 0; j--) S.layers.splice(idx[j], 1);
  S.layers.splice(base, 0, merged); S.cur = base; S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(t('toast.layersMerged')); }

export function doMerge() { let idx = [...S.marked].sort((a, b) => a - b);
  if (idx.length < 2) { if (S.cur > 0) idx = [S.cur - 1, S.cur]; else { toast(t('toast.markLayers')); return; } }
  mergeIndices(idx); }

// слить диапазон слоёв [a..b] (щипок), независимо от выбора
export function mergeRange(a, b) { const idx = []; for (let i = Math.min(a, b); i <= Math.max(a, b); i++) idx.push(i); mergeIndices(idx); }

export function doGroup() { let idx = [...S.marked].sort((a, b) => a - b); if (!idx.length) idx = [S.cur];
  snapshot(); const parent = commonParent(idx.map((i) => S.layers[i])); // вложить в общую папку, если она одна
  const f = { id: ++S.folderSeq, name: 'Папка ' + S.folderSeq, open: true, visible: true, symLock: false, parent };
  S.folders.push(f); const moved = [];
  for (let j = idx.length - 1; j >= 0; j--) moved.unshift(S.layers.splice(idx[j], 1)[0]);
  moved.forEach((L) => { L.fid = f.id; }); S.layers.splice(idx[0], 0, ...moved);
  S.cur = idx[0] + moved.length - 1; S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(t('toast.folderCreated')); }

export function duplicateLayer(L) { if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  const idx = S.layers.indexOf(L); if (idx < 0) return; snapshot();
  S.layers.splice(idx + 1, 0, { name: L.name + ' копия', opacity: L.opacity, visible: L.visible, fid: L.fid, clip: !!L.clip, lock: !!L.lock, alphaLock: !!L.alphaLock, symLock: !!L.symLock, ext: new Map(L.ext), grid: cloneGrid(L.grid) });
  S.cur = idx + 1; S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(t('toast.layerDup')); }

// переключатели свойств слоя — общие для свайпов и контекстного меню
export function toggleLock(L) { snapshot(); L.lock = !L.lock; bus.emit('layers'); }
export function toggleAlphaLock(L) { snapshot(); L.alphaLock = !L.alphaLock; bus.emit('layers'); }
export function toggleClip(L) { snapshot(); L.clip = !L.clip; bus.emit('layers'); bus.emit('render'); }
export function deleteLayerRef(L) { if (S.layers.length < 2) { toast(t('toast.onlyLayer')); return; }
  const idx = S.layers.indexOf(L); if (idx < 0) return; snapshot(); S.layers.splice(idx, 1);
  S.cur = Math.min(S.cur, S.layers.length - 1); S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); }

export function duplicateFolder(f) { const kids = folderLayers(f); if (!kids.length) return;
  if (S.layers.length + kids.length > MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  snapshot();
  const subs = S.folders.filter((sf) => folderChain(sf.id).some((x) => x.id === f.id)); // f + все потомки
  const map = new Map(); for (const sf of subs) map.set(sf.id, { ...sf, id: ++S.folderSeq, name: sf.name + (sf === f ? ' копия' : '') });
  for (const sf of subs) { const nf = map.get(sf.id); nf.parent = (sf === f) ? (f.parent ?? null) : (map.has(sf.parent) ? map.get(sf.parent).id : sf.parent ?? null); }
  for (const nf of map.values()) S.folders.push(nf);
  const copies = kids.map((L) => ({ name: L.name + ' копия', opacity: L.opacity, visible: L.visible, fid: map.get(L.fid).id, clip: !!L.clip, lock: !!L.lock, alphaLock: !!L.alphaLock, symLock: !!L.symLock, ext: new Map(L.ext), grid: cloneGrid(L.grid) }));
  const dst = topOfFolder(f.id) + 1; S.layers.splice(dst, 0, ...copies); S.cur = dst + copies.length - 1; S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(t('toast.folderDup')); }

export function deleteLayer() { if (S.layers.length < 2) { toast(t('toast.onlyLayer')); return; }
  snapshot(); S.layers.splice(S.cur, 1); S.cur = Math.max(0, S.cur - 1); S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); }

actions.register('layer.add', doAddLayer);
actions.register('layer.merge', doMerge);
actions.register('layer.group', doGroup);
