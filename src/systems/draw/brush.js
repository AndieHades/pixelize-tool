// Штамп кисти/ластика: квадрат size×size с зеркалами по активным осям симметрии.
import { S } from '../../core/state.js';
import { symA, symHA } from '../../core/layers.js';
import { paintCell } from './cells.js';
import { ppVisit } from './pixel-perfect.js';

export function brushStamp(x, y, erase) {
  const s = S.brushes[erase ? 'eraser' : 'pencil'].size, off = s >> 1;
  if (s === 1) ppVisit(x, y);
  const sa = symA(), sha = symHA();
  for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) { const xx = x - off + dx, yy = y - off + dy;
    paintCell(xx, yy, erase);
    const mx = S.W - 1 - xx, my = S.H - 1 - yy;
    if (sa && mx !== xx) paintCell(mx, yy, erase);
    if (sha && my !== yy) paintCell(xx, my, erase);
    if (sa && sha && mx !== xx && my !== yy) paintCell(mx, my, erase); }
}
