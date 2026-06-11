// Drop-shadow: силуэт каждого целевого слоя отдельным слоем под ним, со сдвигом.
import { S, newLayer } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { expandCanvas } from '../core/document.js';
import { dirtyAll } from '../core/layer-cache.js';
import { $, toast, t } from '../core/dom.js';
import { hexToRgb } from '../logic/color.js';
import { MAX_LAYERS } from '../config/limits.js';

let dsRef = null;
const effTargets = (ref) => (Array.isArray(ref) ? ref.filter((L) => S.layers.includes(L)) : (ref && S.layers.includes(ref) ? [ref] : []));

export function dropShadowLayers(targets, dx, dy, col, op) {
  targets = targets.filter((L) => S.layers.includes(L));
  let any = false, minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const L of targets) for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (L.grid[y][x]) { any = true;
    const sx = x + dx, sy = y + dy; if (sx < minx) minx = sx; if (sy < miny) miny = sy; if (sx > maxx) maxx = sx; if (sy > maxy) maxy = sy; }
  if (!any) { toast(t('toast.layerEmpty')); return; }
  if (S.layers.length + targets.length > MAX_LAYERS) { toast(t('toast.maxLayersDel')); return; }
  snapshot();
  const pl = Math.max(0, -minx), pt = Math.max(0, -miny), pr = Math.max(0, maxx - (S.W - 1)), pb = Math.max(0, maxy - (S.H - 1));
  if (pl || pt || pr || pb) expandCanvas(pl, pt, pr, pb); // не лезет — раздвигаем холст
  const a = Math.round(op * 255);
  for (const L of targets.slice().sort((a2, b2) => S.layers.indexOf(a2) - S.layers.indexOf(b2))) {
    const sh = newLayer('Тень', S.W, S.H); sh.fid = L.fid;
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (L.grid[y][x]) { const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < S.W && ny < S.H) sh.grid[ny][nx] = [col[0], col[1], col[2], a]; }
    const li = S.layers.indexOf(L); S.layers.splice(li, 0, sh); S.cur = li + 1; // тень под исходным слоем
  }
  S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); toast(targets.length > 1 ? t('toast.shadowFolder') : t('toast.shadow'));
}

export const dropShadow = (L, dx, dy, col, op) => dropShadowLayers([L], dx, dy, col, op);

export function computeDsPreview() { const targets = effTargets(dsRef);
  if (!targets.length || !$('dspop').classList.contains('on')) { S.dsPreview = null; bus.emit('render'); return; }
  const dx = +$('ds-x').value, dy = +$('ds-y').value, pre = [];
  for (const L of targets) for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (L.grid[y][x]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < S.W && ny < S.H) pre.push([nx, ny]); }
  S.dsPreview = pre; bus.emit('render'); }

export function openDsPop(L) { dsRef = L; $('outpop').classList.remove('on'); $('glowpop').classList.remove('on'); S.outPreview = null; S.glowPreview = null;
  const on = $('dspop').classList.toggle('on'); if (on) computeDsPreview(); else { S.dsPreview = null; bus.emit('render'); } }

export function mount() {
  $('ds-x').addEventListener('input', () => { $('ds-xv').textContent = $('ds-x').value; computeDsPreview(); });
  $('ds-y').addEventListener('input', () => { $('ds-yv').textContent = $('ds-y').value; computeDsPreview(); });
  $('ds-op').addEventListener('input', () => { $('ds-opv').textContent = $('ds-op').value + '%'; bus.emit('render'); });
  $('ds-col').addEventListener('input', () => { $('ds-colsw').style.background = $('ds-col').value; bus.emit('render'); });
  $('ds-apply').onclick = () => { $('dspop').classList.remove('on'); S.dsPreview = null; const targets = effTargets(dsRef);
    if (targets.length) dropShadowLayers(targets, +$('ds-x').value, +$('ds-y').value, hexToRgb($('ds-col').value), +$('ds-op').value / 100); };
}

actions.register('effect.shadow', openDsPop);
