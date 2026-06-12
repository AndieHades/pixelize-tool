// Управляемое свечение: мягкий ореол вокруг контента слоя(ёв).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot, restore } from '../core/history.js';
import { gridBounds } from '../logic/raster.js';
import { computeGlow } from '../logic/glow.js';
import { expandCanvas } from '../core/document.js';
import { markDirty } from '../core/layer-cache.js';
import { $, toast, t } from '../core/dom.js';
import { hexToRgb } from '../logic/color.js';

let glowRef = null;
const effTargets = (ref) => (Array.isArray(ref) ? ref.filter((L) => S.layers.includes(L)) : (ref && S.layers.includes(ref) ? [ref] : []));

export function glowLayers(targets, range, col, intensity) {
  targets = targets.filter((L) => S.layers.includes(L)); let b = null;
  for (const L of targets) { const lb = gridBounds(L.grid); if (!lb) continue;
    b = b ? { minx: Math.min(b.minx, lb.minx), miny: Math.min(b.miny, lb.miny), maxx: Math.max(b.maxx, lb.maxx), maxy: Math.max(b.maxy, lb.maxy) } : lb; }
  if (!b) { toast(t('toast.layerEmpty')); return; }
  snapshot();
  const pl = Math.max(0, Math.ceil(range - b.minx)), pt = Math.max(0, Math.ceil(range - b.miny));
  const pr = Math.max(0, Math.ceil(range - (S.W - 1 - b.maxx))), pb = Math.max(0, Math.ceil(range - (S.H - 1 - b.maxy)));
  if (pl || pt || pr || pb) expandCanvas(pl, pt, pr, pb);
  let n = 0;
  for (const L of targets) { const cells = computeGlow(L.grid, S.W, S.H, range, intensity); n += cells.length;
    const g = L.grid; for (const [x, y, a] of cells) g[y][x] = [col[0], col[1], col[2], a];
    const i = S.layers.indexOf(L); if (i >= 0) markDirty(i); }
  if (!n) { const s = S.undoStack.pop(); if (s) restore(s); toast(t('toast.nothingGlow')); return; }
  bus.emit('render'); bus.emit('layers'); toast(targets.length > 1 ? t('toast.glowFolder') : t('toast.glow'));
}

export const glowLayer = (L, range, col, intensity) => glowLayers([L], range, col, intensity);

export function computeGlowPreview() { const targets = effTargets(glowRef);
  if (!targets.length || !$('glowpop').classList.contains('on')) { S.glowPreview = null; bus.emit('render'); return; }
  S.glowPreview = []; for (const L of targets) S.glowPreview = S.glowPreview.concat(computeGlow(L.grid, S.W, S.H, +$('glow-range').value, +$('glow-int').value / 100));
  bus.emit('render'); }

export function openGlowPop(L) { glowRef = L; $('outpop').classList.remove('on'); $('dspop').classList.remove('on'); S.outPreview = null; S.dsPreview = null;
  const on = $('glowpop').classList.toggle('on'); if (on) computeGlowPreview(); else { S.glowPreview = null; bus.emit('render'); } }

export function mount() {
  $('glow-range').addEventListener('input', () => { $('glow-rangev').textContent = $('glow-range').value; computeGlowPreview(); });
  $('glow-int').addEventListener('input', () => { $('glow-intv').textContent = $('glow-int').value + '%'; computeGlowPreview(); });
  $('glow-col').addEventListener('input', () => { $('glow-colsw').style.background = $('glow-col').value; bus.emit('render'); });
  $('glow-cancel').onclick = () => { $('glowpop').classList.remove('on'); S.glowPreview = null; bus.emit('render'); };
  $('glow-apply').onclick = () => { $('glowpop').classList.remove('on'); S.glowPreview = null; const targets = effTargets(glowRef);
    if (targets.length) glowLayers(targets, +$('glow-range').value, hexToRgb($('glow-col').value), +$('glow-int').value / 100); };
}

actions.register('effect.glow', openGlowPop);
