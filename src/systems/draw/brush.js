// Штамп кисти/ластика: маска кончика или квадрат size×size, с разбросом
// (spacing/jitter из Procreate), дизер-тайлом (grain) и осями симметрии.
import { S } from '../../core/state.js';
import { symA, symHA } from '../../core/layers.js';
import { paintCell } from './cells.js';
import { ppVisit } from './pixel-perfect.js';
import { coverageToMask, maskRound } from '../../logic/brush-mask.js';
import { BRUSH_MASK, BRUSH_SCATTER } from '../../config/brush-import.js';

let cTok = -1, cSize = -1, cMask = null, acc = 0; // кеш маски + счётчик spacing
export function resetScatter() { acc = 0; } // вызывается в начале штриха

function activeMask(sb, size) {
  if (!sb) return null;
  if (sb.tok === cTok && size === cSize) return cMask;
  cMask = sb.cov ? coverageToMask(sb.cov, size, BRUSH_MASK) : maskRound(size);
  cTok = sb.tok; cSize = size; return cMask;
}

// ok(x,y) — фильтр дизер-тайла (в координатах холста) либо null.
function paintSym(x, y, erase, ok) {
  if (!ok || ok(x, y)) paintCell(x, y, erase);
  const mx = S.W - 1 - x, my = S.H - 1 - y, sa = symA(), sha = symHA();
  if (sa && mx !== x && (!ok || ok(mx, y))) paintCell(mx, y, erase);
  if (sha && my !== y && (!ok || ok(x, my))) paintCell(x, my, erase);
  if (sa && sha && mx !== x && my !== y && (!ok || ok(mx, my))) paintCell(mx, my, erase);
}
function footprint(cx, cy, erase, m, ok) { const ox = m.w >> 1, oy = m.h >> 1;
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.data[j * m.w + i]) paintSym(cx - ox + i, cy - oy + j, erase, ok); }

export function brushStamp(x, y, erase) {
  const tool = erase ? 'eraser' : 'pencil', s = S.brushes[tool].size, sb = S.stampBrush[tool];
  const m = activeMask(sb, s), g = sb && sb.grain ? sb.grain : null; // grain — уже бинарный дизер-тайл
  const ok = g ? (px, py) => g.data[(((py % g.h) + g.h) % g.h) * g.w + (((px % g.w) + g.w) % g.w)] : null;
  const p = sb && sb.params;
  if (m && p && (p.spacing > 0 || p.jitter > 0)) { // режим разброса (shatter)
    const gap = Math.max(1, Math.round(p.spacing * s));
    if (acc++ % gap) return; // соблюдаем spacing: дабы реже, чем каждая клетка
    let cx = x, cy = y;
    if (p.jitter > 0) { const r = p.jitter * s * BRUSH_SCATTER.jitterScale, a = Math.random() * 6.2832, d = Math.random() * r;
      cx = x + Math.round(Math.cos(a) * d); cy = y + Math.round(Math.sin(a) * d); }
    footprint(cx, cy, erase, m, ok); return;
  }
  if (m) { footprint(x, y, erase, m, ok); return; }
  if (s === 1 && !g) ppVisit(x, y);
  const off = s >> 1;
  for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) paintSym(x - off + dx, y - off + dy, erase, ok);
}
