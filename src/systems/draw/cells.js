// Низкоуровневая запись клетки: с учётом выделения-маски и осей симметрии.
// setCell — простая запись (заливка), paintCell — кисть с альфа-смешиванием.
import { S, G } from '../../core/state.js';
import { blendOver } from '../../logic/raster.js';
import { symA, symHA } from '../../core/layers.js';
import { inSel } from '../../core/selection.js';
import { markDirty } from '../../core/layer-cache.js';
import { strokeSeen } from './seen.js';

export function setCell(x, y, c) {
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return; // выделение работает как маска
  const L = S.layers[S.cur]; if (L.lock) return; // замок: слой нельзя трогать
  const g = G(); const put = (px, py) => { if (L.alphaLock && !g[py][px]) return; g[py][px] = c ? c.slice() : null; }; // альфа-замок: только по существующим
  put(x, y);
  const mx = S.W - 1 - x, my = S.H - 1 - y, sa = symA(), sha = symHA();
  if (sa && mx !== x && inSel(mx, y)) put(mx, y);
  if (sha && my !== y && inSel(x, my)) put(x, my);
  if (sa && sha && mx !== x && my !== y && inSel(mx, my)) put(mx, my);
  markDirty(S.cur);
}

export function paintCell(x, y, erase) { // кисть с прозрачностью и альфа-смешиванием
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
  const L = S.layers[S.cur]; if (L.lock) return; // замок: слой нельзя трогать
  const br = S.brushes[erase ? 'eraser' : 'pencil'], o = br.op, g = G(), key = y * S.W + x;
  const dst = g[y][x];
  if (L.alphaLock && !dst) return; // альфа-замок: пустые клетки не трогаем
  if (o < 1) { if (strokeSeen.has(key)) return; strokeSeen.add(key); }
  if (erase) {
    if (o >= 1) g[y][x] = null;
    else if (dst) { const a1 = ((dst.length > 3 ? dst[3] : 255) / 255) * (1 - o);
      g[y][x] = a1 < .04 ? null : [dst[0], dst[1], dst[2], Math.round(a1 * 255)]; }
  } else {
    const s = S.active;
    if (o >= 1) g[y][x] = [s[0], s[1], s[2], 255];
    else g[y][x] = blendOver(s, dst, o);
  }
  markDirty(S.cur);
}
