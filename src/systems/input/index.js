// Система ввода: мышь/перо и колесо на холсте. Диспетчеризует указатель в
// обработчики инструментов/режимов (core/canvas-handlers), пан правой кнопкой,
// зум колесом, Alt — пипетка. Тач-жесты — в ./gestures.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { toolHandler, modeHandler } from '../../core/canvas-handlers.js';
import { STABILIZE, DRAG_THRESHOLD } from '../../config/timings.js';
import { ZOOM_MIN, ZOOM_MAX } from '../../config/limits.js';
import { mountGestures } from './gestures.js';

const cv = () => $('cv');
export const toGrid = (e) => { const r = cv().getBoundingClientRect();
  return [Math.floor((e.clientX - r.left - S.view.ox) / S.view.zoom), Math.floor((e.clientY - r.top - S.view.oy) / S.view.zoom)]; };
const activeMode = () => (S.cropMode ? modeHandler('crop') : S.rotMode ? modeHandler('transform') : null);
const capture = (id) => { try { cv().setPointerCapture(id); } catch (e) {} };

let rdrag = null, drawing = false, stabPt = null;
function smooth(e) { if (!S.stabOn) return [e.clientX, e.clientY];
  if (!stabPt) { stabPt = { x: e.clientX, y: e.clientY }; return [e.clientX, e.clientY]; }
  stabPt.x += (e.clientX - stabPt.x) * STABILIZE; stabPt.y += (e.clientY - stabPt.y) * STABILIZE; return [stabPt.x, stabPt.y]; }

export function down(e) { if (e.pointerId != null) capture(e.pointerId);
  if (e.pointerType === 'mouse' && (e.button === 1 || (e.button === 2 && S.tool !== 'move')) && !S.cropMode && !S.rotMode) {
    rdrag = { x: e.clientX, y: e.clientY, ox: S.view.ox, oy: S.view.oy, moved: false, btn: e.button }; return; }
  if (e.pointerType === 'mouse' && e.button) return;
  const [gx, gy] = toGrid(e);
  if (e.altKey) { actions.run('draw.pickAt', gx, gy); bus.emit('render'); return; }
  stabPt = { x: e.clientX, y: e.clientY };
  const m = activeMode(); if (m) { m.down({ gx, gy, e }); drawing = true; return; }
  const h = toolHandler(S.tool); if (h && h.down) { h.down({ gx, gy, e }); drawing = true; }
}

export function move(e) {
  if (e.pointerType !== 'touch') { const [hx, hy] = toGrid(e); const over = hx >= 0 && hy >= 0 && hx < S.W && hy < S.H; // курсор кисти — только над холстом
    S.hoverPx = over ? [hx, hy] : null; cv().style.cursor = over ? 'crosshair' : 'default'; }
  if (rdrag) { const dx = e.clientX - rdrag.x, dy = e.clientY - rdrag.y; if (Math.hypot(dx, dy) > DRAG_THRESHOLD) rdrag.moved = true;
    if (rdrag.moved) { S.view.ox = rdrag.ox + dx; S.view.oy = rdrag.oy + dy; bus.emit('render'); } return; }
  const m = activeMode();
  if (m) { const [gx, gy] = toGrid(e); if (drawing) m.move({ gx, gy, e }); else if (m.hover) m.hover({ gx, gy, e }); return; }
  const h = toolHandler(S.tool);
  if (drawing && h && h.move) { const [sx, sy] = smooth(e); const r = cv().getBoundingClientRect();
    h.move({ gx: Math.floor((sx - r.left - S.view.ox) / S.view.zoom), gy: Math.floor((sy - r.top - S.view.oy) / S.view.zoom), e }); }
  else if (e.pointerType !== 'touch') bus.emit('render'); // перерисовка контура кисти
}

export function up(e) {
  if (rdrag) { if (!rdrag.moved && rdrag.btn === 2) bus.emit('canvas-menu', e); rdrag = null; return; }
  stabPt = null;
  const m = activeMode(); if (m) { if (drawing && m.up) m.up({ e }); drawing = false; return; }
  const h = toolHandler(S.tool); if (drawing && h && h.up) h.up({ e }); drawing = false;
}

export function mount() {
  const c = cv();
  c.addEventListener('contextmenu', (e) => e.preventDefault());
  c.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') down(e); });
  c.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') move(e); });
  c.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') up(e); });
  c.addEventListener('pointercancel', (e) => { if (e.pointerType !== 'touch') up(e); });
  c.addEventListener('pointerleave', () => { if (S.hoverPx) { S.hoverPx = null; bus.emit('render'); } });
  window.addEventListener('pointermove', (e) => { if (S.hoverPx && e.target !== c) { S.hoverPx = null; bus.emit('render'); } }); // курсор кисти виден только над холстом
  c.addEventListener('wheel', (e) => { e.preventDefault(); const r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const wx = (mx - S.view.ox) / S.view.zoom, wy = (my - S.view.oy) / S.view.zoom;
    S.view.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, S.view.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    S.view.ox = mx - wx * S.view.zoom; S.view.oy = my - wy * S.view.zoom; bus.emit('render'); }, { passive: false });
  mountGestures(c, { toGrid, down, move, up });
}
