// Экранное взаимодействие трансформации: захват ручек, перетаскивание, рамка.
import { S } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { C } from '../../styles/canvas-colors.js';
import { ROT_MIN_SCALE } from '../../config/limits.js';
import { rotFrame, rotCenter, rotWorldToLocal, rotState, rotHasChanges } from './math.js';

const cv = () => $('cv');
const rotScreen = (p) => ({ x: S.view.ox + p.x * S.view.zoom, y: S.view.oy + p.y * S.view.zoom });
const rotPointer = (e) => { const r = cv().getBoundingClientRect();
  return { sx: e.clientX - r.left, sy: e.clientY - r.top, x: (e.clientX - r.left - S.view.ox) / S.view.zoom, y: (e.clientY - r.top - S.view.oy) / S.view.zoom }; };

export function rotHit(e) { const m = S.rotMode, p = rotPointer(e), f = rotFrame(m), hit = 14;
  for (let i = 0; i < f.p.length; i++) { const s = rotScreen(f.p[i]); if (Math.hypot(p.sx - s.x, p.sy - s.y) <= hit) return { kind: 'rotate', corner: i }; }
  for (const side of f.sides) { const s = rotScreen(side.p); if (Math.hypot(p.sx - s.x, p.sy - s.y) <= hit) return side; }
  const q = rotWorldToLocal(m, p.x, p.y); if (q.x >= 0 && q.y >= 0 && q.x <= m.b.w && q.y <= m.b.h) return { kind: 'move' };
  return null; }

export function rotGrab({ e }) { const hit = rotHit(e); if (!hit) { S.rotMode.grab = null; return; }
  const p = rotPointer(e), c = rotCenter(S.rotMode);
  S.rotMode.grab = { ...hit, start: p, sx: S.rotMode.sx, sy: S.rotMode.sy, tx: S.rotMode.tx, ty: S.rotMode.ty, ang: S.rotMode.ang,
    cx: c.x, cy: c.y, a0: Math.atan2(p.y - c.y, p.x - c.x), w0: S.rotMode.b.w * S.rotMode.sx, h0: S.rotMode.b.h * S.rotMode.sy, logged: false }; }

export function rotDrag(e, rebuild) { const g = S.rotMode && S.rotMode.grab; if (!g) return; const p = rotPointer(e);
  if (!g.logged) { S.rotMode.hist.push(rotState(S.rotMode)); g.logged = true; }
  if (g.kind === 'rotate') { let a = g.ang + Math.atan2(p.y - g.cy, p.x - g.cx) - g.a0; if (e.shiftKey) a = Math.round(a / (Math.PI / 4)) * (Math.PI / 4); S.rotMode.ang = a; } // Shift — строго по 45°
  else if (g.kind === 'scale-x') { const ax = { x: Math.cos(g.ang), y: Math.sin(g.ang) }; const d = ((p.x - g.start.x) * ax.x + (p.y - g.start.y) * ax.y) * g.sign;
    const nsx = Math.max(ROT_MIN_SCALE, (g.w0 + d * 2) / S.rotMode.b.w); S.rotMode.sx = nsx;
    if (e.shiftKey && g.sx) S.rotMode.sy = Math.max(ROT_MIN_SCALE, g.sy * nsx / g.sx); } // Shift — пропорционально
  else if (g.kind === 'scale-y') { const ay = { x: -Math.sin(g.ang), y: Math.cos(g.ang) }; const d = ((p.x - g.start.x) * ay.x + (p.y - g.start.y) * ay.y) * g.sign;
    const nsy = Math.max(ROT_MIN_SCALE, (g.h0 + d * 2) / S.rotMode.b.h); S.rotMode.sy = nsy;
    if (e.shiftKey && g.sy) S.rotMode.sx = Math.max(ROT_MIN_SCALE, g.sx * nsy / g.sy); } // Shift — пропорционально
  else if (g.kind === 'move') { S.rotMode.tx = g.tx + p.x - g.start.x; S.rotMode.ty = g.ty + p.y - g.start.y; }
  S.rotMode.changed = rotHasChanges(S.rotMode); rebuild(); }

export function rotHover({ e }) { const h = rotHit(e);
  cv().style.cursor = !h ? '' : h.kind === 'move' ? 'move' : h.kind === 'rotate' ? 'grab' : h.kind === 'scale-x' ? 'ew-resize' : 'ns-resize'; }

// рамка трансформации: те же синие кружки + бегущий пунктир, что и у выделения
// (контур рисует SVG-ants по S.rotQuad — бег обеспечивает CSS, как у выделения)
export function drawTransformFrame(ctx) { if (!S.rotMode) return; const f = rotFrame(S.rotMode);
  S.rotQuad = f.p.map((p) => [p.x, p.y]);
  const dot = (p) => { const s = rotScreen(p); ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = C.accent; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff'; ctx.stroke(); };
  for (const p of f.p) dot(p);          // углы — поворот
  for (const s of f.sides) dot(s.p); }  // стороны — масштаб
