// Кисть-коррекция: +1 уровень осветления/затемнения/тона за штрих (strokeSeen
// не даёт копить, пока не отпустишь).
import { S, G } from '../../core/state.js';
import { symA, symHA } from '../../core/layers.js';
import { inSel } from '../../core/selection.js';
import { markDirty } from '../../core/layer-cache.js';
import { $ } from '../../core/dom.js';
import { setTool } from '../../core/tools.js';
import { strokeSeen } from './seen.js';

const mix = (a, b, t) => Math.max(0, Math.min(255, Math.round(a + (b - a) * t)));

export function adjustCell(x, y) {
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
  if (S.layers[S.cur].lock) return; // замок: слой нельзя трогать
  const key = y * S.W + x; if (strokeSeen.has(key)) return; strokeSeen.add(key);
  const g = G(), c = g[y][x]; if (!c) return; // только непустые пиксели
  const a = c.length > 3 ? c[3] : 255, t = S.adjAmt / 100;
  const target = S.adjMode === 'dodge' ? [255, 255, 255] : S.adjMode === 'burn' ? [0, 0, 0] : S.active;
  g[y][x] = [mix(c[0], target[0], t), mix(c[1], target[1], t), mix(c[2], target[2], t), a]; markDirty(S.cur);
}

export function adjustStamp(x, y) {
  const sz = S.brushes.pencil.size, off = sz >> 1, sa = symA(), sha = symHA();
  for (let dy = 0; dy < sz; dy++) for (let dx = 0; dx < sz; dx++) { const xx = x - off + dx, yy = y - off + dy;
    adjustCell(xx, yy); const mx = S.W - 1 - xx, my = S.H - 1 - yy;
    if (sa && mx !== xx) adjustCell(mx, yy);
    if (sha && my !== yy) adjustCell(xx, my);
    if (sa && sha && mx !== xx && my !== yy) adjustCell(mx, my); }
}

export function mount() {
  document.querySelectorAll('#adj-modes button').forEach((b) => { b.onclick = () => { S.adjMode = b.dataset.m;
    setTool('adjust');
    document.querySelectorAll('#adj-modes button').forEach((x) => x.classList.toggle('on', x === b)); }; });
  $('adj-amt').addEventListener('input', () => { S.adjAmt = +$('adj-amt').value; $('adj-amtv').textContent = S.adjAmt; });
}
