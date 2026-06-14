// SymmetryOperationMapper: одно действие пользователя → набор симметричных.
// Чистая логика без DOM/state. Оси берутся флагами: sx — лево/право (x→W-1-x),
// sy — верх/низ (y→H-1-y). Двойная симметрия — обе инверсии (4 копии).
import { parseKey } from './raster.js';

// зеркальные копии точки (включая её саму) по активным осям
export function mirrorPoints(x, y, W, H, sx, sy) { const out = [[x, y]];
  if (sx) out.push([W - 1 - x, y]);
  if (sy) out.push([x, H - 1 - y]);
  if (sx && sy) out.push([W - 1 - x, H - 1 - y]);
  return out; }

// маска + все её зеркальные копии (mapSelectionMask)
export function expandMask(mask, W, H, sx, sy) { if (!sx && !sy) return new Set(mask);
  const out = new Set();
  for (const k of mask) { const [x, y] = parseKey(k);
    for (const [mx, my] of mirrorPoints(x, y, W, H, sx, sy)) out.add(mx + ',' + my); }
  return out; }

// зеркальные дельты переноса (mapMoveDelta): по активной оси знак инвертируется
export function mirrorDeltas(dx, dy, sx, sy) { const out = [[dx, dy]];
  if (sx) out.push([-dx, dy]);
  if (sy) out.push([dx, -dy]);
  if (sx && sy) out.push([-dx, -dy]);
  return out; }
