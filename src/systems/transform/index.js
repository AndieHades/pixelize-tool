// Свободная трансформация слоя(ёв): рамка с углами (поворот) и сторонами
// (растяжение). Живое превью в S.rotPrev (рендер рисует), рамка — оверлеем.
import { S, blank } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, toast, t } from '../../core/dom.js';
import { snapshot, setUndoGuard, cloneGrid } from '../../core/history.js';
import { expandCanvas } from '../../core/document.js';
import { dirtyAll, markDirty } from '../../core/layer-cache.js';
import { registerMode } from '../../core/canvas-handlers.js';
import { effVis, folderChain } from '../../core/layers.js';
import { boundsWithExt } from '../../logic/raster.js';
import { fxPreview } from '../../core/effects-render.js';
import { rotBuildCells, rotHasChanges, rotRestoreState } from './math.js';
import { rotGrab, rotDrag, rotHover, drawTransformFrame, rotHit } from './drag.js';

let rotRAF = 0;

// трансформированный контент одного слоя на полном W×H (вне холста — обрезается,
// при применении холст расширяется); эффекты накладываются в fxPreview по новой форме
function memberCanvas(cells, W, H) { const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), id = x.createImageData(W, H);
  for (const [px, py, cc] of cells) { if (px < 0 || py < 0 || px >= W || py >= H) continue;
    const o = (py * W + px) * 4; id.data[o] = cc[0]; id.data[o + 1] = cc[1]; id.data[o + 2] = cc[2]; id.data[o + 3] = cc.length > 3 ? cc[3] : 255; }
  x.putImageData(id, 0, 0); return c; }

function rotRebuild() { if (!S.rotMode) return; const W = S.W, H = S.H, mems = []; let any = false;
  for (const s of S.rotMode.sources) { const r = rotBuildCells(S.rotMode, s.src); if (!r) continue; any = true;
    const L = S.layers[s.idx]; if (L && effVis(s.idx) && L.opacity > 0) mems.push({ idx: s.idx, L, content: memberCanvas(r.cells, W, H) }); }
  S.rotPrev = any ? { idx: S.rotMode.idx, canvas: fxPreview(mems, W, H), px: 0, py: 0, ow: W, oh: H } : { idx: S.rotMode.idx, canvas: null };
  bus.emit('render'); }
const rotRebuildSoon = () => { cancelAnimationFrame(rotRAF); rotRAF = requestAnimationFrame(rotRebuild); };

const cloneSel = (s) => (s ? { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 } : null);
const cloneMask = (m) => (m ? new Set(m) : null);

function selectionSource(L, sel, mask) {
  const src = []; let any = false;
  for (let y = sel.y0; y <= sel.y1; y++) { const row = [];
    for (let x = sel.x0; x <= sel.x1; x++) { const ok = !mask || mask.has(x + ',' + y), c = ok && L.grid[y][x] ? L.grid[y][x].slice() : null;
      if (c) any = true; row.push(c); }
    src.push(row); }
  return any ? src : null;
}

function clearSelectionCells(L, sel, mask, dx, dy) {
  for (let y = sel.y0; y <= sel.y1; y++) for (let x = sel.x0; x <= sel.x1; x++) {
    if (mask && !mask.has(x + ',' + y)) continue; const xx = x + dx, yy = y + dy;
    if (L.grid[yy] && xx >= 0 && xx < L.grid[yy].length) L.grid[yy][xx] = null; }
}

const inFolder = (L, fid) => folderChain(L.fid).some((f) => f.id === fid);
const folderLayers = (fid) => S.layers.filter((L) => inFolder(L, fid));

function activeTargets() {
  const out = new Set(), fids = new Set(S.markedFolders);
  if (S.selFolder != null) fids.add(S.selFolder);
  for (const fid of fids) for (const L of folderLayers(fid)) out.add(L);
  for (const i of S.marked) if (S.layers[i]) out.add(S.layers[i]);
  if (!fids.size || S.marked.size) if (S.layers[S.cur]) out.add(S.layers[S.cur]);
  return [...out].filter((L) => S.layers.includes(L));
}

function enterSelectionRotMode() { const L = S.layers[S.cur], sel = cloneSel(S.sel), mask = cloneMask(S.selMask);
  if (!L || !sel || S.selFloat) return false; const src = selectionSource(L, sel, mask);
  if (!src) { toast(t('toast.transformEmpty')); return false; }
  const backup = { idx: S.cur, sel, mask, grid: cloneGrid(L.grid), ext: new Map(L.ext) };
  clearSelectionCells(L, sel, mask, 0, 0); S.sel = null; S.selMask = null; markDirty(S.cur);
  S.rotMode = { idx: S.cur, idxs: [S.cur], sources: [{ L, idx: S.cur, src }], src, b: { x0: sel.x0, y0: sel.y0, w: sel.x1 - sel.x0 + 1, h: sel.y1 - sel.y0 + 1 }, ang: 0, sx: 1, sy: 1, tx: 0, ty: 0, grab: null, changed: false, hist: [], selection: backup };
  bus.emit('selection'); bus.emit('tool', S.tool); $('rotbar').classList.add('on'); rotRebuild(); toast(t('toast.transformHint')); return true; }

export function enterRotMode(target) { const targets = (Array.isArray(target) ? target : [target]).filter((L) => S.layers.includes(L));
  if (!targets.length) return; let b0 = null;
  for (const L of targets) { const lb = boundsWithExt(L.grid, L.ext); if (!lb) continue; b0 = b0 ? { minx: Math.min(b0.minx, lb.minx), miny: Math.min(b0.miny, lb.miny), maxx: Math.max(b0.maxx, lb.maxx), maxy: Math.max(b0.maxy, lb.maxy) } : lb; }
  if (!b0) { toast(t('toast.layerEmpty')); return; }
  const idxs = targets.map((L) => S.layers.indexOf(L)).sort((a, b) => a - b), i = idxs[idxs.length - 1]; S.cur = i;
  const sources = targets.slice().sort((a, b) => S.layers.indexOf(a) - S.layers.indexOf(b)).map((L) => { const src = [];
    for (let y = b0.miny; y <= b0.maxy; y++) { const row = []; for (let x = b0.minx; x <= b0.maxx; x++) {
      const c = L.grid[y] && x >= 0 && x < S.W ? L.grid[y][x] : L.ext.get(x + ',' + y); row.push(c ? c.slice() : null); }
    src.push(row); } return { L, idx: S.layers.indexOf(L), src }; });
  S.rotMode = { idx: i, idxs, sources, src: sources[0].src, b: { x0: b0.minx, y0: b0.miny, w: b0.maxx - b0.minx + 1, h: b0.maxy - b0.miny + 1 }, ang: 0, sx: 1, sy: 1, tx: 0, ty: 0, grab: null, changed: false, hist: [] };
  bus.emit('layers'); bus.emit('tool', S.tool); $('rotbar').classList.add('on'); rotRebuild();
  toast(t('toast.transformHint')); }

function applyRotMode(m) { let res = null, per = [];
  for (const s of m.sources) { const r = rotBuildCells(m, s.src); per.push({ s, r }); if (!r) continue;
    res = res ? { minx: Math.min(res.minx, r.minx), miny: Math.min(res.miny, r.miny), maxx: Math.max(res.maxx, r.maxx), maxy: Math.max(res.maxy, r.maxy) } : r; }
  if (!res) { toast(t('toast.transformEmpty')); return false; }
  if (m.selection) return applySelectionRotMode(m, per, res);
  snapshot();
  const pl = Math.max(0, -res.minx), pt = Math.max(0, -res.miny), pr = Math.max(0, res.maxx - (S.W - 1)), pb = Math.max(0, res.maxy - (S.H - 1));
  if (pl || pt || pr || pb) expandCanvas(pl, pt, pr, pb);
  for (const { s, r } of per) { const L = s.L; if (!S.layers.includes(L)) continue; const g = blank(S.W, S.H);
    if (r) for (const [x, y, c] of r.cells) { const nx = x + pl, ny = y + pt; if (nx >= 0 && ny >= 0 && nx < S.W && ny < S.H) g[ny][nx] = c.slice(); }
    L.grid = g; L.ext = new Map(); const idx = S.layers.indexOf(L); if (idx >= 0) markDirty(idx); }
  dirtyAll(); bus.emit('layers'); bus.emit('render'); return true; }

function restoreSelectionMode(m) { const b = m.selection, L = m.sources[0].L;
  if (!b || !L) return; L.grid = cloneGrid(b.grid); L.ext = new Map(b.ext); S.cur = b.idx; S.sel = null; S.selMask = null; markDirty(b.idx); }

function applySelectionRotMode(m, per, res) { const b = m.selection, L = m.sources[0].L;
  L.grid = cloneGrid(b.grid); L.ext = new Map(b.ext); S.cur = b.idx; S.sel = cloneSel(b.sel); S.selMask = cloneMask(b.mask); snapshot();
  const pl = Math.max(0, -res.minx), pt = Math.max(0, -res.miny), pr = Math.max(0, res.maxx - (S.W - 1)), pb = Math.max(0, res.maxy - (S.H - 1));
  if (pl || pt || pr || pb) expandCanvas(pl, pt, pr, pb);
  clearSelectionCells(L, b.sel, b.mask, pl, pt);
  for (const { r } of per) if (r) for (const [x, y, c] of r.cells) { const nx = x + pl, ny = y + pt;
    if (nx >= 0 && ny >= 0 && nx < S.W && ny < S.H) L.grid[ny][nx] = c.slice(); }
  S.sel = null; S.selMask = null; markDirty(b.idx); dirtyAll(); bus.emit('selection'); bus.emit('layers'); bus.emit('render'); return true; }

export function undoRotStep() { if (!S.rotMode) return false;
  if (!S.rotMode.hist.length) { toast(t('toast.noTransformUndo')); return true; }
  rotRestoreState(S.rotMode, S.rotMode.hist.pop()); rotRebuild(); toast(t('toast.transformStepUndone')); return true; }

export function exitRotMode(apply) { if (!S.rotMode) return; const m = S.rotMode, changed = rotHasChanges(m);
  S.rotMode = null; S.rotPrev = null; $('rotbar').classList.remove('on'); $('cv').style.cursor = '';
  bus.emit('tool', S.tool);
  if (m.selection && !changed) { restoreSelectionMode(m); bus.emit('selection'); bus.emit('render'); if (apply) toast(t('toast.transformApplied')); }
  else if (apply && changed) { if (applyRotMode(m)) toast(t('toast.transformApplied')); }
  else if (m.selection) { restoreSelectionMode(m); bus.emit('selection'); bus.emit('render'); if (!apply && changed) toast(t('toast.transformCancelled')); }
  else { bus.emit('render'); if (!apply && changed) toast(t('toast.transformCancelled')); } }

function menuStep(fn) { if (!S.rotMode) return; S.rotMode.hist.push({ ang: S.rotMode.ang, sx: S.rotMode.sx, sy: S.rotMode.sy, tx: S.rotMode.tx, ty: S.rotMode.ty }); fn(S.rotMode); S.rotMode.changed = rotHasChanges(S.rotMode); rotRebuild(); }

export function mount() {
  $('rot-ok').onclick = () => exitRotMode(true); $('rot-x').onclick = () => exitRotMode(false);
  $('trctx-flip-h').onclick = () => { $('trctx').classList.remove('on'); menuStep((m) => { m.sx *= -1; }); };
  $('trctx-flip-v').onclick = () => { $('trctx').classList.remove('on'); menuStep((m) => { m.sy *= -1; }); };
  $('trctx-rot-r').onclick = () => { $('trctx').classList.remove('on'); menuStep((m) => { m.ang += Math.PI / 2; }); };
  $('trctx-rot-l').onclick = () => { $('trctx').classList.remove('on'); menuStep((m) => { m.ang -= Math.PI / 2; }); };
  registerMode('transform', {
    down: ({ e }) => { if (e && e.pointerType !== 'touch' && !rotHit(e)) { if (S.rotMode) S.rotMode.exitOnUp = true; return; } // ЛКМ/перо вне рамки — применить (как клик вне выделения)
      if (S.rotMode) S.rotMode.exitOnUp = false; rotGrab({ e }); },
    move: ({ e }) => rotDrag(e, rotRebuildSoon),
    up: () => { if (!S.rotMode) return; if (S.rotMode.exitOnUp) { exitRotMode(true); return; } S.rotMode.grab = null; },
    hover: rotHover });
  bus.on('overlay', ({ ctx }) => drawTransformFrame(ctx));
  bus.on('transform-menu', (e) => { if (S.rotMode && e) showMenuAt($('trctx'), e.clientX, e.clientY, true); });
  setUndoGuard(() => { if (!S.rotMode) return false; exitRotMode(false); return true; });
  window.addEventListener('keydown', (e) => { if (!S.rotMode) return;
    if (e.key === 'Enter') { e.preventDefault(); exitRotMode(true); }
    else if (e.key === 'Escape') { e.preventDefault(); exitRotMode(false); } });
}

actions.register('transform.enter', () => { if (!enterSelectionRotMode()) enterRotMode(activeTargets()); });
actions.register('transform.enterTargets', (targets) => enterRotMode(targets));
actions.register('transform.cancel', () => exitRotMode(false));
