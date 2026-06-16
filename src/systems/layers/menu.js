// Контекстное меню слоя/папки и переименование. Кросс-системные операции —
// через actions; правки слоёв — на месте.
import { S, blank } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuBeside } from '../../core/dom.js';
import { snapshot } from '../../core/history.js';
import { markDirty } from '../../core/layer-cache.js';
import { t } from '../../i18n/index.js';
import { folderLayers } from './helpers.js';
import { duplicateLayer, duplicateFolder, symmetrizeLayerRefs, toggleLock, toggleAlphaLock, toggleClip, toggleReference, deleteLayerRef, deleteFolder } from './ops.js';

let lctxRef = null, renRef = null;
const targets = () => (!lctxRef ? [] : (lctxRef.kind === 'folder' ? folderLayers(lctxRef.ref) : [lctxRef.ref])).filter((L) => S.layers.includes(L));
const close = () => $('lctx').classList.remove('on');
const curTo = (L) => { const i = S.layers.indexOf(L); if (i >= 0) S.cur = i; };

const showItem = (id, on) => { const el = $(id); if (el) el.style.display = on ? '' : 'none'; };

export function openLctx(x, y, kind, ref) { lctxRef = { kind, ref };
  const isFolder = kind === 'folder', isLayer = kind === 'layer', isBg = kind === 'background';
  // фон — то же меню #lctx (единый вид/поведение), но только Залить/Очистить
  for (const id of ['lctx-ren', 'lctx-dup', 'lctx-symm', 'lctx-rotate', 'lctx-copy-fx', 'lctx-paste-fx', 'lctx-mono', 'lctx-bc']) showItem(id, !isBg);
  showItem('lctx-ung', isFolder); showItem('lctx-clip', isLayer);
  for (const id of ['lctx-select', 'lctx-invert', 'lctx-lock', 'lctx-alpha', 'lctx-ref', 'lctx-png-full', 'lctx-png-tight']) showItem(id, isLayer);
  showItem('lctx-del', !isBg); showItem('lctx-fill', true); showItem('lctx-clear', true); // фон не удаляется
  $('lctx-dup').textContent = t(isFolder ? 'menu.dupFolder' : 'menu.dupLayer');
  $('lctx-del').textContent = t(isFolder ? 'menu.deleteFolder' : 'menu.deleteLayer');
  $('lctx-fill').textContent = t('menu.fill');
  $('lctx-clear').textContent = t(isBg ? 'menu.bgClear' : isFolder ? 'menu.clearFolder' : 'menu.clearLayer');
  $('lctx-rotate').textContent = t(isFolder ? 'menu.transformFolder' : 'menu.transform');
  if (isLayer) { $('lctx-clip').textContent = (ref.clip ? '✓ ' : '') + t('menu.clip');
    $('lctx-lock').textContent = (ref.lock ? '✓ ' : '') + t('menu.lock'); $('lctx-alpha').textContent = (ref.alphaLock ? '✓ ' : '') + t('menu.alphaLock');
    $('lctx-ref').textContent = (ref.reference ? '✓ ' : '') + t('label.reference'); }
  showMenuBeside($('lctx'), $('lay-pop'), y); }

export function openRename(ref) { renRef = ref; $('ren-name').value = ref.name; $('ren-ovl').classList.add('on'); setTimeout(() => { $('ren-name').focus(); $('ren-name').select(); }, 80); }

export function mountMenu() {
  $('lctx-ren').onclick = () => { close(); if (lctxRef) openRename(lctxRef.ref); };
  $('lctx-dup').onclick = () => { close(); if (!lctxRef) return; if (lctxRef.kind === 'folder') duplicateFolder(lctxRef.ref); else duplicateLayer(lctxRef.ref); };
  $('lctx-select').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') { curTo(lctxRef.ref); actions.run('selection.layer'); } };
  $('lctx-invert').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') { curTo(lctxRef.ref); actions.run('selection.invert'); } };
  $('lctx-fill').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'background') { actions.run('bg.fill'); return; }
    const ts = targets(); if (!ts.length) return; snapshot(); const a = [S.active[0], S.active[1], S.active[2], 255];
    for (const L of ts) { for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) L.grid[y][x] = a.slice(); L.ext = new Map(); markDirty(S.layers.indexOf(L)); }
    actions.run('color.used', S.active); bus.emitDoc(); };
  $('lctx-clear').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'background') { actions.run('bg.clear'); return; }
    const ts = targets(); if (!ts.length) return; snapshot();
    for (const L of ts) { L.grid = blank(S.W, S.H); L.ext = new Map(); markDirty(S.layers.indexOf(L)); } bus.emitDoc(); };
  $('lctx-symm').onclick = () => { close(); symmetrizeLayerRefs(targets()); };
  $('lctx-rotate').onclick = () => { close(); const ts = targets(); if (ts.length) actions.run('transform.enterTargets', ts); };
  $('lctx-copy-fx').onclick = () => { close(); if (lctxRef) actions.run('fx.copyAll', lctxRef.ref); };
  $('lctx-paste-fx').onclick = () => { close(); actions.run('fx.paste'); };
  $('lctx-mono').onclick = () => { close(); const ts = targets(); if (ts.length) actions.run('effect.mono', ts); };
  $('lctx-bc').onclick = () => { close(); if (lctxRef) actions.run('effect.bc', [lctxRef.ref], t('pop.bc'), { scope: 'layer' }); };
  $('lctx-clip').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') toggleClip(lctxRef.ref); };
  $('lctx-lock').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') toggleLock(lctxRef.ref); };
  $('lctx-alpha').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') toggleAlphaLock(lctxRef.ref); };
  $('lctx-ref').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') toggleReference(lctxRef.ref); };
  $('lctx-del').onclick = () => { close(); if (!lctxRef) return; if (lctxRef.kind === 'folder') deleteFolder(lctxRef.ref); else deleteLayerRef(lctxRef.ref); };
  $('lctx-png-full').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') actions.run('export.layer', lctxRef.ref, false); };
  $('lctx-png-tight').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'layer') actions.run('export.layer', lctxRef.ref, true); };
  $('lctx-ung').onclick = () => { close(); if (lctxRef && lctxRef.kind === 'folder') { snapshot(); const f = lctxRef.ref; // расформировать: содержимое — на уровень выше
    S.layers.forEach((L) => { if (L.fid === f.id) L.fid = f.parent ?? null; });
    S.folders.forEach((sf) => { if (sf.parent === f.id) sf.parent = f.parent ?? null; });
    S.folders = S.folders.filter((x) => x !== f); bus.emitDoc(); } };
  $('ren-ok').onclick = () => { if (renRef) { const v = $('ren-name').value.trim(); if (v) { snapshot(); renRef.name = v.slice(0, 24); bus.emit('layers'); } } renRef = null; $('ren-ovl').classList.remove('on'); };
  $('ren-cancel').onclick = () => { renRef = null; $('ren-ovl').classList.remove('on'); };
  $('ren-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('ren-ok').click(); });
}
