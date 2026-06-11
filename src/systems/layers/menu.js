// Контекстное меню слоя/папки и переименование. Кросс-системные операции —
// через actions; правки слоёв — на месте.
import { S, blank } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt } from '../../core/dom.js';
import { snapshot } from '../../core/history.js';
import { symmetrizeGrid } from '../../logic/raster.js';
import { markDirty } from '../../core/layer-cache.js';
import { t } from '../../i18n/index.js';
import { folderLayers } from './helpers.js';
import { duplicateLayer, duplicateFolder } from './ops.js';

let lctxRef = null, renRef = null;
const targets = () => (!lctxRef ? [] : (lctxRef.kind === 'folder' ? folderLayers(lctxRef.ref) : [lctxRef.ref])).filter((L) => S.layers.includes(L));
const close = () => $('lctx').classList.remove('on');
const curTo = (L) => { const i = S.layers.indexOf(L); if (i >= 0) S.cur = i; };

export function openLctx(x, y, kind, ref) { lctxRef = { kind, ref };
  const isFolder = kind === 'folder', isLayer = kind === 'layer';
  $('lctx-ung').style.display = isFolder ? '' : 'none'; $('lctx-clip').style.display = isLayer ? '' : 'none';
  for (const id of ['lctx-select', 'lctx-invert', 'lctx-send', 'lctx-png-full', 'lctx-png-tight']) $(id).style.display = isLayer ? '' : 'none';
  $('lctx-dup').textContent = t(isFolder ? 'menu.dupFolder' : 'menu.dupLayer');
  $('lctx-clear').textContent = t(isFolder ? 'menu.clearFolder' : 'menu.clearLayer');
  $('lctx-rotate').textContent = t(isFolder ? 'menu.transformFolder' : 'menu.transform');
  if (isLayer) $('lctx-clip').textContent = (ref.clip ? '✓ ' : '') + t('menu.clip');
  showMenuAt($('lctx'), x, y); }

export function openRename(ref) { renRef = ref; $('ren-name').value = ref.name; $('ren-ovl').classList.add('on'); setTimeout(() => { $('ren-name').focus(); $('ren-name').select(); }, 80); }

export function mountMenu() {
  $('lctx-ren').onclick = () => { close(); if (lctxRef) openRename(lctxRef.ref); };
  $('lctx-dup').onclick = () => { close(); if (!lctxRef) return; if (lctxRef.kind === 'folder') duplicateFolder(lctxRef.ref); else duplicateLayer(lctxRef.ref); };
  $('lctx-select').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') { curTo(lctxRef.ref); actions.run('selection.layer'); } };
  $('lctx-invert').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') { curTo(lctxRef.ref); actions.run('selection.invert'); } };
  $('lctx-fill').onclick = () => { close(); const ts = targets(); if (!ts.length) return; snapshot(); const a = [S.active[0], S.active[1], S.active[2], 255];
    for (const L of ts) { for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) L.grid[y][x] = a.slice(); L.ext = new Map(); markDirty(S.layers.indexOf(L)); } bus.emit('layers'); bus.emit('render'); };
  $('lctx-clear').onclick = () => { close(); const ts = targets(); if (!ts.length) return; snapshot();
    for (const L of ts) { L.grid = blank(S.W, S.H); L.ext = new Map(); markDirty(S.layers.indexOf(L)); } bus.emit('layers'); bus.emit('render'); };
  $('lctx-symm').onclick = () => { close(); const ts = targets(); if (!ts.length) return; snapshot(); const v = S.sym || (!S.sym && !S.symH), h = S.symH;
    for (const L of ts) { symmetrizeGrid(L.grid, v, h); markDirty(S.layers.indexOf(L)); } bus.emit('layers'); bus.emit('render'); };
  $('lctx-rotate').onclick = () => { close(); const ts = targets(); if (ts.length) actions.run('transform.enterTargets', ts); };
  $('lctx-shadow').onclick = () => { close(); const ts = targets(); if (ts.length) { curTo(ts[ts.length - 1]); actions.run('effect.shadow', ts.length > 1 ? ts : ts[0]); } };
  $('lctx-glow').onclick = () => { close(); const ts = targets(); if (ts.length) actions.run('effect.glow', ts.length > 1 ? ts : ts[0]); };
  $('lctx-mono').onclick = () => { close(); const ts = targets(); if (ts.length) actions.run('effect.mono', ts); };
  $('lctx-bc').onclick = () => { close(); const ts = targets(); if (ts.length) actions.run('effect.bc', ts, 'Яркость/контраст'); };
  $('lctx-clip').onclick = () => { close(); if (!lctxRef || lctxRef.kind !== 'layer') return; snapshot(); lctxRef.ref.clip = !lctxRef.ref.clip; bus.emit('layers'); bus.emit('render'); };
  $('lctx-png-full').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') actions.run('export.layer', lctxRef.ref, false); };
  $('lctx-png-tight').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') actions.run('export.layer', lctxRef.ref, true); };
  $('lctx-send').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') bus.emit('send-layer', lctxRef.ref); };
  $('lctx-ung').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'folder') { snapshot(); const f = lctxRef.ref; S.layers.forEach((L) => { if (L.fid === f.id) L.fid = null; }); S.folders = S.folders.filter((x) => x !== f); bus.emit('layers'); bus.emit('render'); } };
  $('ren-ok').onclick = () => { if (renRef) { const v = $('ren-name').value.trim(); if (v) { snapshot(); renRef.name = v.slice(0, 24); bus.emit('layers'); } } renRef = null; $('ren-ovl').classList.remove('on'); };
  $('ren-cancel').onclick = () => { renRef = null; $('ren-ovl').classList.remove('on'); };
  $('ren-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('ren-ok').click(); });
}
