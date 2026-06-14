// Штамп кисти/ластика: квадрат size×size либо маска импортированной кисти,
// с дизер-тайлом (grain) и зеркалами по активным осям симметрии.
import { S } from '../../core/state.js';
import { symA, symHA } from '../../core/layers.js';
import { paintCell } from './cells.js';
import { ppVisit } from './pixel-perfect.js';
import { coverageToMask, maskRound, coverageToTile } from '../../logic/brush-mask.js';
import { BRUSH_MASK } from '../../config/brush-import.js';

let cTok = -1, cSize = -1, cMask = null, gTok = -1, gTile = null; // кеши по токену кисти
function activeMask(size) {
  const sb = S.stampBrush; if (!sb) return null;
  if (sb.tok === cTok && size === cSize) return cMask;
  cMask = sb.cov ? coverageToMask(sb.cov, size, BRUSH_MASK) : maskRound(size);
  cTok = sb.tok; cSize = size; return cMask;
}
function activeGrain() {
  const sb = S.stampBrush; if (!sb || !sb.grain) return null;
  if (sb.tok === gTok) return gTile;
  gTile = coverageToTile(sb.grain, BRUSH_MASK.threshold); gTok = sb.tok; return gTile;
}

// ok(x,y) — фильтр дизер-тайла (в координатах холста) либо null (без фильтра).
function paintSym(x, y, erase, ok) {
  if (!ok || ok(x, y)) paintCell(x, y, erase);
  const mx = S.W - 1 - x, my = S.H - 1 - y, sa = symA(), sha = symHA();
  if (sa && mx !== x && (!ok || ok(mx, y))) paintCell(mx, y, erase);
  if (sha && my !== y && (!ok || ok(x, my))) paintCell(x, my, erase);
  if (sa && sha && mx !== x && my !== y && (!ok || ok(mx, my))) paintCell(mx, my, erase);
}

export function brushStamp(x, y, erase) {
  const s = S.brushes[erase ? 'eraser' : 'pencil'].size, m = activeMask(s), g = activeGrain();
  const ok = g ? (px, py) => g.data[(((py % g.h) + g.h) % g.h) * g.w + (((px % g.w) + g.w) % g.w)] : null;
  if (m) { const ox = m.w >> 1, oy = m.h >> 1;
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.data[j * m.w + i]) paintSym(x - ox + i, y - oy + j, erase, ok);
    return; }
  if (s === 1 && !g) ppVisit(x, y);
  const off = s >> 1;
  for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) paintSym(x - off + dx, y - off + dy, erase, ok);
}
