// Интерактивный кроп: рамка с маркерами, грани наружу — расширить, внутри —
// сдвиг рисунка. Применение — через core/document.applyCropRect.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast } from '../core/dom.js';
import { applyCropRect } from '../core/document.js';
import { registerMode } from '../core/canvas-handlers.js';
import { MAX_SIZE } from '../config/limits.js';

let cropDrag = null, cropSym = false;

export function toggleCrop() { if (S.cropMode) { cancelCrop(); return; }
  const b = S.sel ? { x0: S.sel.x0, y0: S.sel.y0, x1: S.sel.x1, y1: S.sel.y1 } : { x0: 0, y0: 0, x1: S.W - 1, y1: S.H - 1 };
  S.cropMode = { ...b, idx: 0, idy: 0, b }; S.sel = null; S.selMask = null; bus.emit('selection');
  $('crop').classList.add('on'); $('cropbar').classList.add('on'); bus.emit('render');
  toast('Грани наружу — расширить · внутри — сдвиг рисунка · ✓/Enter'); }

export function cancelCrop() { S.cropMode = null; cropDrag = null; $('cv').style.cursor = '';
  $('crop').classList.remove('on'); $('cropbar').classList.remove('on'); bus.emit('render'); }

export function applyCrop() { if (!S.cropMode) return; const c = S.cropMode; cancelCrop();
  if (c.x0 === 0 && c.y0 === 0 && c.x1 === S.W - 1 && c.y1 === S.H - 1 && !c.idx && !c.idy) { toast('Размер не менялся'); return; }
  applyCropRect(c.x0 - c.idx, c.y0 - c.idy, c.x1 - c.idx, c.y1 - c.idy); }

function cropZone(e) { const r = $('cv').getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
  const z = S.view.zoom, lx = S.view.ox + S.cropMode.x0 * z, rx = S.view.ox + (S.cropMode.x1 + 1) * z, ty = S.view.oy + S.cropMode.y0 * z, by = S.view.oy + (S.cropMode.y1 + 1) * z, tol = 24;
  const nl = Math.abs(px - lx) < tol, nr = Math.abs(px - rx) < tol, nt = Math.abs(py - ty) < tol, nb = Math.abs(py - by) < tol;
  const inX = px > lx - tol && px < rx + tol, inY = py > ty - tol && py < by + tol;
  return { l: nl && inY, r: nr && inY, t: nt && inX, b: nb && inX, inside: px > lx && px < rx && py > ty && py < by }; }
function cropCursor(zn) { const h = zn.l || zn.r, v = zn.t || zn.b;
  if (h && v) return ((zn.l && zn.t) || (zn.r && zn.b)) ? 'nwse-resize' : 'nesw-resize'; if (h) return 'ew-resize'; if (v) return 'ns-resize'; return zn.inside ? 'move' : ''; }

function cropDown({ e }) { const zn = cropZone(e);
  if (zn.l || zn.r || zn.t || zn.b) cropDrag = { l: zn.l, r: zn.r, t: zn.t, b: zn.b, cx: (S.cropMode.x0 + S.cropMode.x1) / 2, cy: (S.cropMode.y0 + S.cropMode.y1) / 2 };
  else if (zn.inside) { const r = $('cv').getBoundingClientRect(); cropDrag = { img: true, gx: (e.clientX - r.left - S.view.ox) / S.view.zoom, gy: (e.clientY - r.top - S.view.oy) / S.view.zoom }; }
  else cropDrag = null; }

function cropMovePt({ e }) { if (!cropDrag || !S.cropMode) return; const r = $('cv').getBoundingClientRect(), z = S.view.zoom, c = S.cropMode;
  const fx = (e.clientX - r.left - S.view.ox) / z, fy = (e.clientY - r.top - S.view.oy) / z;
  if (cropDrag.img) { const dx = Math.round(fx - cropDrag.gx), dy = Math.round(fy - cropDrag.gy); if (dx || dy) { c.idx += dx; c.idy += dy; cropDrag.gx += dx; cropDrag.gy += dy; } }
  else { const symm = cropSym || e.shiftKey;
    if (cropDrag.l) { c.x0 = Math.min(c.x1, Math.round(fx)); if (symm) c.x1 = Math.round(2 * cropDrag.cx - c.x0); }
    if (cropDrag.r) { c.x1 = Math.max(c.x0, Math.round(fx) - 1); if (symm) c.x0 = Math.round(2 * cropDrag.cx - c.x1); }
    if (cropDrag.t) { c.y0 = Math.min(c.y1, Math.round(fy)); if (symm) c.y1 = Math.round(2 * cropDrag.cy - c.y0); }
    if (cropDrag.b) { c.y1 = Math.max(c.y0, Math.round(fy) - 1); if (symm) c.y0 = Math.round(2 * cropDrag.cy - c.y1); }
    if (c.x1 - c.x0 + 1 > MAX_SIZE) { if (cropDrag.l) c.x0 = c.x1 - MAX_SIZE + 1; else c.x1 = c.x0 + MAX_SIZE - 1; }
    if (c.y1 - c.y0 + 1 > MAX_SIZE) { if (cropDrag.t) c.y0 = c.y1 - MAX_SIZE + 1; else c.y1 = c.y0 + MAX_SIZE - 1; } }
  bus.emit('render'); }

export function mount() {
  $('crop').onclick = toggleCrop; $('crop-ok').onclick = applyCrop; $('crop-cancel').onclick = cancelCrop;
  $('crop-sym').onclick = () => { cropSym = !cropSym; $('crop-sym').classList.toggle('on', cropSym); toast(cropSym ? 'Кроп от центра' : 'Кроп от грани'); };
  registerMode('crop', { down: cropDown, move: cropMovePt, up: () => { cropDrag = null; }, hover: ({ e }) => { $('cv').style.cursor = cropCursor(cropZone(e)); } });
}

actions.register('canvas.crop', toggleCrop);
