// Интерактивный кроп: рамка с маркерами, грани наружу — расширить, внутри —
// ЛКМ сдвигает рисунок, ПКМ сдвигает crop-рамку. Применение — applyCropRect.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast, t } from '../core/dom.js';
import { applyCropRect } from '../core/document.js';
import { registerMode } from '../core/canvas-handlers.js';
import { MAX_SIZE } from '../config/limits.js';

let cropDrag = null, cropSym = false, cropLink = false, cropRatio = 1;

const cropSize = (c = S.cropMode) => ({ w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1 });
const clampDim = (v) => Math.max(1, Math.min(MAX_SIZE, Math.round(v)));
function syncCropInputs() { if (!S.cropMode) return;
  const s = cropSize(); $('crop-w').value = s.w; $('crop-h').value = s.h; }
function setCropLink(on) { cropLink = on; $('crop-link').classList.toggle('on', on);
  if (on && S.cropMode) { const s = cropSize(); cropRatio = s.w > 0 && s.h > 0 ? s.w / s.h : 1; } }
function placeCrop(w, h, cx = (S.cropMode.x0 + S.cropMode.x1) / 2, cy = (S.cropMode.y0 + S.cropMode.y1) / 2) {
  const c = S.cropMode; w = clampDim(w); h = clampDim(h);
  c.x0 = Math.round(cx - (w - 1) / 2); c.y0 = Math.round(cy - (h - 1) / 2);
  c.x1 = c.x0 + w - 1; c.y1 = c.y0 + h - 1; syncCropInputs(); bus.emit('render'); }
function ratioDims(w, h, preferW) {
  w = clampDim(w); h = clampDim(h);
  if (preferW) h = clampDim(w / cropRatio); else w = clampDim(h * cropRatio);
  return { w, h };
}
function lockRatio(c, d, symm) {
  const s = cropSize(c), sw = d.x1 - d.x0 + 1, sh = d.y1 - d.y0 + 1;
  const preferW = (d.l || d.r) && !(d.t || d.b) ? true : (d.t || d.b) && !(d.l || d.r) ? false : s.w / sw >= s.h / sh;
  const r = ratioDims(s.w, s.h, preferW), byCx = symm || !(d.l || d.r), byCy = symm || !(d.t || d.b);
  c.x0 = byCx ? Math.round(d.cx - (r.w - 1) / 2) : d.l ? d.x1 - r.w + 1 : d.x0;
  c.y0 = byCy ? Math.round(d.cy - (r.h - 1) / 2) : d.t ? d.y1 - r.h + 1 : d.y0;
  c.x1 = c.x0 + r.w - 1; c.y1 = c.y0 + r.h - 1;
}

export function toggleCrop() { if (S.cropMode) { cancelCrop(); return; }
  const b = S.sel ? { x0: S.sel.x0, y0: S.sel.y0, x1: S.sel.x1, y1: S.sel.y1 } : { x0: 0, y0: 0, x1: S.W - 1, y1: S.H - 1 };
  S.cropMode = { ...b, idx: 0, idy: 0, b }; S.sel = null; S.selMask = null; bus.emit('selection');
  $('crop').classList.add('on'); $('cropbar').classList.add('on'); if (cropLink) setCropLink(true); syncCropInputs(); bus.emit('render');
  toast(t('toast.cropHint')); }

export function cancelCrop() { S.cropMode = null; cropDrag = null; $('cv').style.cursor = '';
  $('crop').classList.remove('on'); $('cropbar').classList.remove('on'); bus.emit('render'); }

export function applyCrop() { if (!S.cropMode) return; const c = S.cropMode; cancelCrop();
  if (c.x0 === 0 && c.y0 === 0 && c.x1 === S.W - 1 && c.y1 === S.H - 1 && !c.idx && !c.idy) { toast(t('toast.sizeUnchanged')); return; }
  applyCropRect(c.x0 - c.idx, c.y0 - c.idy, c.x1 - c.idx, c.y1 - c.idy); }

function cropZone(e) { const r = $('cv').getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  const z = S.view.zoom, lx = S.view.ox + S.cropMode.x0 * z, rx = S.view.ox + (S.cropMode.x1 + 1) * z, ty = S.view.oy + S.cropMode.y0 * z, by = S.view.oy + (S.cropMode.y1 + 1) * z, tol = 24;
  const nl = Math.abs(px - lx) < tol, nr = Math.abs(px - rx) < tol, nt = Math.abs(py - ty) < tol, nb = Math.abs(py - by) < tol;
  const inX = px > lx - tol && px < rx + tol, inY = py > ty - tol && py < by + tol;
  return { l: nl && inY, r: nr && inY, t: nt && inX, b: nb && inX, inside: px > lx && px < rx && py > ty && py < by }; }
function cropCursor(zn) { const h = zn.l || zn.r, v = zn.t || zn.b;
  if (h && v) return ((zn.l && zn.t) || (zn.r && zn.b)) ? 'nwse-resize' : 'nesw-resize'; if (h) return 'ew-resize'; if (v) return 'ns-resize'; return zn.inside ? 'move' : ''; }

function cropDown({ e }) { const zn = cropZone(e);
  if (zn.l || zn.r || zn.t || zn.b) cropDrag = { l: zn.l, r: zn.r, t: zn.t, b: zn.b, x0: S.cropMode.x0, y0: S.cropMode.y0, x1: S.cropMode.x1, y1: S.cropMode.y1, cx: (S.cropMode.x0 + S.cropMode.x1) / 2, cy: (S.cropMode.y0 + S.cropMode.y1) / 2 };
  else if (zn.inside) { const r = $('cv').getBoundingClientRect(), gx = (e.clientX - r.left - S.view.ox) / S.view.zoom, gy = (e.clientY - r.top - S.view.oy) / S.view.zoom;
    cropDrag = e.button === 2 ? { move: true, x0: S.cropMode.x0, y0: S.cropMode.y0, x1: S.cropMode.x1, y1: S.cropMode.y1, gx, gy } : { img: true, gx, gy }; }
  else cropDrag = null; }

function cropMovePt({ e }) { if (!cropDrag || !S.cropMode) return; const r = $('cv').getBoundingClientRect(), z = S.view.zoom, c = S.cropMode;
  const fx = (e.clientX - r.left - S.view.ox) / z, fy = (e.clientY - r.top - S.view.oy) / z;
  if (cropDrag.move) { const dx = Math.round(fx - cropDrag.gx), dy = Math.round(fy - cropDrag.gy);
    c.x0 = cropDrag.x0 + dx; c.x1 = cropDrag.x1 + dx; c.y0 = cropDrag.y0 + dy; c.y1 = cropDrag.y1 + dy; }
  else if (cropDrag.img) { const dx = Math.round(fx - cropDrag.gx), dy = Math.round(fy - cropDrag.gy); if (dx || dy) { c.idx += dx; c.idy += dy; cropDrag.gx += dx; cropDrag.gy += dy; } }
  else { const symm = cropSym || e.shiftKey;
    if (cropDrag.l) { c.x0 = Math.min(c.x1, Math.round(fx)); if (symm) c.x1 = Math.round(2 * cropDrag.cx - c.x0); }
    if (cropDrag.r) { c.x1 = Math.max(c.x0, Math.round(fx) - 1); if (symm) c.x0 = Math.round(2 * cropDrag.cx - c.x1); }
    if (cropDrag.t) { c.y0 = Math.min(c.y1, Math.round(fy)); if (symm) c.y1 = Math.round(2 * cropDrag.cy - c.y0); }
    if (cropDrag.b) { c.y1 = Math.max(c.y0, Math.round(fy) - 1); if (symm) c.y0 = Math.round(2 * cropDrag.cy - c.y1); }
    if (cropLink) lockRatio(c, cropDrag, symm);
    if (c.x1 - c.x0 + 1 > MAX_SIZE) { if (cropDrag.l) c.x0 = c.x1 - MAX_SIZE + 1; else c.x1 = c.x0 + MAX_SIZE - 1; }
    if (c.y1 - c.y0 + 1 > MAX_SIZE) { if (cropDrag.t) c.y0 = c.y1 - MAX_SIZE + 1; else c.y1 = c.y0 + MAX_SIZE - 1; } }
  syncCropInputs(); bus.emit('render'); }

function cropInput(which) { if (!S.cropMode) return; let w = parseInt($('crop-w').value, 10), h = parseInt($('crop-h').value, 10);
  if (!w || !h) return; if (cropLink) { const r = ratioDims(w, h, which === 'w'); w = r.w; h = r.h; }
  placeCrop(w, h); }

export function mount() {
  $('crop').onclick = toggleCrop; $('crop-ok').onclick = applyCrop; $('crop-cancel').onclick = cancelCrop;
  $('crop-sym').onclick = () => { cropSym = !cropSym; $('crop-sym').classList.toggle('on', cropSym); toast(cropSym ? t('toast.cropCenter') : t('toast.cropEdge')); };
  $('crop-link').onclick = () => setCropLink(!cropLink);
  for (const id of ['crop-w', 'crop-h']) { $(id).max = MAX_SIZE; $(id).addEventListener('input', () => cropInput(id === 'crop-w' ? 'w' : 'h'));
    $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); $(id).blur(); } }); }
  registerMode('crop', { down: cropDown, move: cropMovePt, up: () => { cropDrag = null; }, hover: ({ e }) => { $('cv').style.cursor = cropCursor(cropZone(e)); } });
  window.addEventListener('keydown', (e) => { if (!S.cropMode) return;
    if (e.key === 'Enter') { e.preventDefault(); applyCrop(); } else if (e.key === 'Escape') { e.preventDefault(); cancelCrop(); } });
}

actions.register('canvas.crop', toggleCrop);
