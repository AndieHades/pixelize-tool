// Растеризация слоёв: каждый слой кешируется в canvas W×H, грязь помечается
// markDirty. Здесь же сборка композита — единственная точка композита в проекте.
import { S } from './state.js';
import { effVis, clipBase } from './layers.js';
import { parseKey } from '../logic/raster.js';

let lcs = []; const dirtySet = new Set();
export const markDirty = (i) => dirtySet.add(i);
export function dirtyAll() { lcs = []; dirtySet.clear(); }

export function layerCanvas(i) { let c = lcs[i];
  if (!c) { c = document.createElement('canvas'); lcs[i] = c; dirtySet.add(i); }
  if (c.width !== S.W || c.height !== S.H) { c.width = S.W; c.height = S.H; dirtySet.add(i); }
  if (dirtySet.has(i)) { const x = c.getContext('2d'), id = x.createImageData(S.W, S.H), g = S.layers[i].grid;
    for (let y = 0; y < S.H; y++) for (let xx = 0; xx < S.W; xx++) { const cc = g[y][xx]; if (!cc) continue;
      const o = (y * S.W + xx) * 4; id.data[o] = cc[0]; id.data[o + 1] = cc[1]; id.data[o + 2] = cc[2]; id.data[o + 3] = cc.length > 3 ? cc[3] : 255; }
    x.putImageData(id, 0, 0); dirtySet.delete(i); }
  return c; }

// слой i вместе с «висящим» фрагментом выделения (если фрагмент поднят с него):
// обтравка и композит видят фрагмент так, будто он уже лежит в слое
export function layerFloatCanvas(i) {
  const f = S.selFloat; if (!f || (f.li ?? S.cur) !== i) return layerCanvas(i);
  const c = document.createElement('canvas'); c.width = S.W; c.height = S.H;
  const x = c.getContext('2d'); x.drawImage(layerCanvas(i), 0, 0);
  const put = (xx, yy, cc) => { if (xx >= 0 && yy >= 0 && xx < S.W && yy < S.H) {
    x.fillStyle = 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',' + (cc.length > 3 ? cc[3] : 255) / 255 + ')'; x.fillRect(xx, yy, 1, 1); } };
  if (f.symItems) for (const it of f.symItems) put(it.ax + it.sgnx * f.dx, it.ay + it.sgny * f.dy, it.c);
  else for (const [k, cc] of f.cells) { const [dx, dy] = parseKey(k); put(f.x + dx, f.y + dy, cc); }
  return c; }

// слой i, обрезанный по силуэту базового слоя base (обтравочная маска)
export function clippedCanvas(i, base) { return clippedShift(i, base, 0, 0, 0, 0); }

// то же, но слой и база могут быть сдвинуты раздельно (в пикселях сетки) —
// нужно для живого превью Move: маска едет вместе с базой, а не «застывает»
export function clippedShift(i, base, dix, diy, dbx, dby) {
  const c = document.createElement('canvas'); c.width = S.W; c.height = S.H;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(layerFloatCanvas(i), dix, diy);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(layerFloatCanvas(base), dbx, dby); return c; }

// итоговый цвет точки (x,y) по всем видимым слоям, либо null
export function compositeAt(x, y) { let r = 0, g = 0, b = 0, a = 0;
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i]; if (!effVis(i) || L.opacity <= 0) continue; const c = L.grid[y] && L.grid[y][x]; if (!c) continue;
    let la = L.opacity * (c.length > 3 ? c[3] / 255 : 1);
    const cb = clipBase(i); if (L.clip) { const bc = cb >= 0 && effVis(cb) ? S.layers[cb].grid[y][x] : null;
      if (!bc) continue; la *= (bc.length > 3 ? bc[3] / 255 : 1); }
    r = c[0] * la + r * (1 - la); g = c[1] * la + g * (1 - la); b = c[2] * la + b * (1 - la); a = la + a * (1 - la); }
  return a > 0.02 ? [Math.round(r), Math.round(g), Math.round(b)] : null; }

// нарисовать все видимые слои (с обтравкой) в произвольный 2D-контекст
export function compositeLayers(x) {
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i]; if (!effVis(i) || L.opacity <= 0) continue;
    const cb = clipBase(i); if (L.clip && (cb < 0 || !effVis(cb))) continue;
    x.globalAlpha = L.opacity; x.drawImage(cb >= 0 ? clippedCanvas(i, cb) : layerFloatCanvas(i), 0, 0); }
  x.globalAlpha = 1; }
