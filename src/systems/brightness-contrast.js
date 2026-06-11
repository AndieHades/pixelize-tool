// Яркость/контраст с живым предпросмотром по ползункам (оригиналы — в backup).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot, cloneGrid } from '../core/history.js';
import { bcAdjust, contrastFactor } from '../logic/bc.js';
import { dirtyAll } from '../core/layer-cache.js';
import { $ } from '../core/dom.js';

let bcBackup = null;

export function bcPreview() { if (!bcBackup) return;
  const bri = +$('bc-bri').value * 1.27, f = contrastFactor(+$('bc-con').value * 1.27);
  for (const b of bcBackup) { const L = b.L;
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = b.grid[y][x]; L.grid[y][x] = c ? bcAdjust(c, bri, f) : null; }
    L.ext = new Map(); for (const [k, c] of b.ext) L.ext.set(k, bcAdjust(c, bri, f)); }
  dirtyAll(); bus.emit('render'); }

export function bcRestore() { if (!bcBackup) return;
  for (const b of bcBackup) { b.L.grid = cloneGrid(b.grid); b.L.ext = new Map(b.ext); } dirtyAll(); bus.emit('render'); }

export function openBcPop(targets, title) { bcCancel();
  bcBackup = targets.map((L) => ({ L, grid: cloneGrid(L.grid), ext: new Map(L.ext) }));
  $('bc-title').textContent = title;
  $('bc-bri').value = 0; $('bc-briv').textContent = '0'; $('bc-con').value = 0; $('bc-conv').textContent = '0';
  $('bcpop').classList.add('on'); }

export function bcApply() { if (!bcBackup) return;
  bcRestore(); snapshot(); bcPreview(); // в историю — оригинал, затем финальный прогон по ползункам
  bcBackup = null; $('bcpop').classList.remove('on'); bus.emit('layers'); bus.emit('render'); }

export function bcCancel() { if (bcBackup) { bcRestore(); bcBackup = null; } $('bcpop').classList.remove('on'); }

export function mount() {
  $('bc-bri').addEventListener('input', () => { $('bc-briv').textContent = $('bc-bri').value; bcPreview(); });
  $('bc-con').addEventListener('input', () => { $('bc-conv').textContent = $('bc-con').value; bcPreview(); });
  $('bc-apply').onclick = bcApply; $('bc-cancel').onclick = bcCancel;
}

actions.register('effect.bc', (targets, title) => openBcPop(targets && targets.length ? targets : S.layers, title || 'Яркость/контраст — всё изображение'));
