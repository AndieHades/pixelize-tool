// Свободная трансформация слоя(ёв): рамка с углами (поворот) и сторонами
// (растяжение). Живое превью в S.rotPrev (рендер рисует), рамка — оверлеем.
import { S, blank } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, toast, t } from '../../core/dom.js';
import { snapshot, setUndoGuard } from '../../core/history.js';
import { expandCanvas } from '../../core/document.js';
import { dirtyAll, markDirty } from '../../core/layer-cache.js';
import { registerMode } from '../../core/canvas-handlers.js';
import { gridBounds } from '../../logic/raster.js';
import { fxPreview } from '../../core/effects-render.js';
import { rotBuildCells, rotHasChanges, rotRestoreState } from './math.js';
import { rotGrab, rotDrag, rotHover, drawTransformFrame } from './drag.js';

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
    const L = S.layers[s.idx]; if (L) mems.push({ idx: s.idx, L, content: memberCanvas(r.cells, W, H) }); }
  S.rotPrev = any ? { idx: S.rotMode.idx, canvas: fxPreview(mems, W, H), px: 0, py: 0, ow: W, oh: H } : { idx: S.rotMode.idx, canvas: null };
  bus.emit('render'); }
const rotRebuildSoon = () => { cancelAnimationFrame(rotRAF); rotRAF = requestAnimationFrame(rotRebuild); };

export function enterRotMode(target) { const targets = (Array.isArray(target) ? target : [target]).filter((L) => S.layers.includes(L));
  if (!targets.length) return; let b0 = null;
  for (const L of targets) { const lb = gridBounds(L.grid); if (!lb) continue; b0 = b0 ? { minx: Math.min(b0.minx, lb.minx), miny: Math.min(b0.miny, lb.miny), maxx: Math.max(b0.maxx, lb.maxx), maxy: Math.max(b0.maxy, lb.maxy) } : lb; }
  if (!b0) { toast(t('toast.layerEmpty')); return; }
  const idxs = targets.map((L) => S.layers.indexOf(L)).sort((a, b) => a - b), i = idxs[idxs.length - 1]; S.cur = i;
  const sources = targets.slice().sort((a, b) => S.layers.indexOf(a) - S.layers.indexOf(b)).map((L) => { const src = [];
    for (let y = b0.miny; y <= b0.maxy; y++) { const row = []; for (let x = b0.minx; x <= b0.maxx; x++) row.push(L.grid[y][x] ? L.grid[y][x].slice() : null); src.push(row); } return { L, idx: S.layers.indexOf(L), src }; });
  S.rotMode = { idx: i, idxs, sources, src: sources[0].src, b: { x0: b0.minx, y0: b0.miny, w: b0.maxx - b0.minx + 1, h: b0.maxy - b0.miny + 1 }, ang: 0, sx: 1, sy: 1, tx: 0, ty: 0, grab: null, changed: false, hist: [] };
  bus.emit('layers'); $('rotbar').classList.add('on'); rotRebuild();
  toast(t('toast.transformHint')); }

function applyRotMode(m) { let res = null, per = [];
  for (const s of m.sources) { const r = rotBuildCells(m, s.src); per.push({ s, r }); if (!r) continue;
    res = res ? { minx: Math.min(res.minx, r.minx), miny: Math.min(res.miny, r.miny), maxx: Math.max(res.maxx, r.maxx), maxy: Math.max(res.maxy, r.maxy) } : r; }
  if (!res) { toast(t('toast.transformEmpty')); return false; }
  snapshot();
  const pl = Math.max(0, -res.minx), pt = Math.max(0, -res.miny), pr = Math.max(0, res.maxx - (S.W - 1)), pb = Math.max(0, res.maxy - (S.H - 1));
  if (pl || pt || pr || pb) expandCanvas(pl, pt, pr, pb);
  for (const { s, r } of per) { const L = s.L; if (!S.layers.includes(L)) continue; const g = blank(S.W, S.H);
    if (r) for (const [x, y, c] of r.cells) { const nx = x + pl, ny = y + pt; if (nx >= 0 && ny >= 0 && nx < S.W && ny < S.H) g[ny][nx] = c.slice(); }
    L.grid = g; L.ext = new Map(); const idx = S.layers.indexOf(L); if (idx >= 0) markDirty(idx); }
  dirtyAll(); bus.emit('layers'); bus.emit('render'); return true; }

export function undoRotStep() { if (!S.rotMode) return false;
  if (!S.rotMode.hist.length) { toast(t('toast.noTransformUndo')); return true; }
  rotRestoreState(S.rotMode, S.rotMode.hist.pop()); rotRebuild(); toast(t('toast.transformStepUndone')); return true; }

export function exitRotMode(apply) { if (!S.rotMode) return; const m = S.rotMode, changed = rotHasChanges(m);
  S.rotMode = null; S.rotPrev = null; $('rotbar').classList.remove('on'); $('cv').style.cursor = '';
  if (apply && changed) { if (applyRotMode(m)) toast(t('toast.transformApplied')); }
  else { bus.emit('render'); if (!apply && changed) toast(t('toast.transformCancelled')); } }

export function mount() {
  $('rot-ok').onclick = () => exitRotMode(true); $('rot-x').onclick = () => exitRotMode(false);
  registerMode('transform', { down: rotGrab, move: ({ e }) => rotDrag(e, rotRebuildSoon), up: () => { if (S.rotMode) S.rotMode.grab = null; }, hover: rotHover });
  bus.on('overlay', ({ ctx }) => drawTransformFrame(ctx));
  setUndoGuard(() => (S.rotMode ? undoRotStep() : false));
  window.addEventListener('keydown', (e) => { if (!S.rotMode) return;
    if (e.key === 'Enter') { e.preventDefault(); exitRotMode(true); }
    else if (e.key === 'Escape') { e.preventDefault(); exitRotMode(false); } });
}

actions.register('transform.enter', () => enterRotMode(S.layers[S.cur]));
actions.register('transform.enterTargets', (targets) => enterRotMode(targets));
