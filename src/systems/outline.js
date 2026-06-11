// Обводка контуром: толщина, свой цвет, прозрачность; у края раздвигает холст.
import { S, G } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot, restore, cloneGrid } from '../core/history.js';
import { hexToRgb, rgbToHex } from '../logic/color.js';
import { N8, outlineRings } from '../logic/outline.js';
import { expandCanvas } from '../core/document.js';
import { markDirty } from '../core/layer-cache.js';
import { $, toast, t } from '../core/dom.js';
import { OUTLINE_DEFAULT } from '../config/defaults.js';

const outSet = { ...OUTLINE_DEFAULT };

export function computeOutlinePreview() { S.outPreview = outlineRings(G(), S.W, S.H, +$('out-size').value); }

export function outlineLayer() {
  outSet.size = +$('out-size').value; outSet.op = +$('out-op').value / 100;
  const col = hexToRgb($('out-col').value), a = Math.round(outSet.op * 255);
  snapshot(); let added = 0;
  for (let pass = 0; pass < outSet.size; pass++) {
    let g = G(), pl = 0, pt = 0, pr = 0, pb = 0; // рисунок у края — раздвигаем под обводку
    for (let x = 0; x < S.W; x++) { if (g[0][x]) pt = 1; if (g[S.H - 1][x]) pb = 1; }
    for (let y = 0; y < S.H; y++) { if (g[y][0]) pl = 1; if (g[y][S.W - 1]) pr = 1; }
    expandCanvas(pl, pt, pr, pb); g = G();
    const out = cloneGrid(g);
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { if (g[y][x]) continue;
      let near = false;
      for (const [dx, dy] of N8) { const x2 = x + dx, y2 = y + dy; if (x2 < 0 || y2 < 0 || x2 >= S.W || y2 >= S.H) continue; if (g[y2][x2]) { near = true; break; } }
      if (near) { out[y][x] = [col[0], col[1], col[2], a]; added++; } }
    S.layers[S.cur].grid = out; markDirty(S.cur);
  }
  if (!added) { const s = S.undoStack.pop(); if (s) restore(s); toast(t('toast.nothingOutline')); return; }
  S.outPreview = null; $('outpop').classList.remove('on'); bus.emit('render'); bus.emit('layers'); toast(t('toast.outlined'));
}

export function openOutlinePop() {
  $('dspop').classList.remove('on'); $('glowpop').classList.remove('on'); S.dsPreview = null; S.glowPreview = null;
  const v = rgbToHex(S.active); $('out-col').value = v; $('out-colsw').style.background = v;
  $('out-size').value = outSet.size; $('out-sizev').textContent = outSet.size;
  $('out-op').value = Math.round(outSet.op * 100); $('out-opv').textContent = Math.round(outSet.op * 100) + '%';
  const on = $('outpop').classList.toggle('on');
  if (on) computeOutlinePreview(); else S.outPreview = null;
  bus.emit('render');
}

export function mount() {
  $('out-apply').onclick = outlineLayer;
  $('out-size').addEventListener('input', () => { $('out-sizev').textContent = $('out-size').value; computeOutlinePreview(); bus.emit('render'); });
  $('out-op').addEventListener('input', () => { $('out-opv').textContent = $('out-op').value + '%'; bus.emit('render'); });
  $('out-col').addEventListener('input', () => { $('out-colsw').style.background = $('out-col').value; bus.emit('render'); });
}

actions.register('effect.outline', openOutlinePop);
