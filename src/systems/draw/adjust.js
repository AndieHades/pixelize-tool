// Кисть-коррекция: +1 уровень осветления/затемнения/тона за штрих (strokeSeen
// не даёт копить, пока не отпустишь).
import { S, G } from '../../core/state.js';
import { rgbToHsv, hsvToRgb } from '../../logic/color.js';
import { symA, symHA } from '../../core/layers.js';
import { inSel } from '../../core/selection.js';
import { markDirty } from '../../core/layer-cache.js';
import { $ } from '../../core/dom.js';
import { strokeSeen } from './seen.js';

export function adjustCell(x, y) {
  if (x < 0 || y < 0 || x >= S.W || y >= S.H || !inSel(x, y)) return;
  if (S.layers[S.cur].lock) return; // замок: слой нельзя трогать
  const key = y * S.W + x; if (strokeSeen.has(key)) return; strokeSeen.add(key);
  const g = G(), c = g[y][x]; if (!c) return; // только непустые пиксели
  const a = c.length > 3 ? c[3] : 255; let [h, s, v] = rgbToHsv(c[0], c[1], c[2]);
  if (S.adjMode === 'dodge') v = Math.min(100, v + S.adjAmt);
  else if (S.adjMode === 'burn') v = Math.max(0, v - S.adjAmt);
  else { const t = S.adjAmt / 100, th = rgbToHsv(S.active[0], S.active[1], S.active[2]); // в активный цвет (тон+насыщ.)
    if (s < 5) h = th[0]; else { const dd = ((th[0] - h + 540) % 360) - 180; h = (h + dd * t + 360) % 360; }
    s = s + (th[1] - s) * t; }
  const r = hsvToRgb(h, s, v); g[y][x] = [r[0], r[1], r[2], a]; markDirty(S.cur);
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
    document.querySelectorAll('#adj-modes button').forEach((x) => x.classList.toggle('on', x === b)); }; });
  $('adj-amt').addEventListener('input', () => { S.adjAmt = +$('adj-amt').value; $('adj-amtv').textContent = S.adjAmt; });
}
