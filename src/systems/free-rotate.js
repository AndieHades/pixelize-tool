// Свободный поворот слоя с чистыми гранями (RotSprite). Превью — canvas для
// рендера; применение пишет в слой.
import { S, blank } from '../core/state.js';
import * as bus from '../core/bus.js';
import { snapshot } from '../core/history.js';
import { rotSprite } from '../logic/rotsprite.js';
import { markDirty } from '../core/layer-cache.js';
import { toast } from '../core/dom.js';

const cellInt = (c) => (c ? (((c[0] << 24) | (c[1] << 16) | (c[2] << 8) | (c.length > 3 ? c[3] : 255)) >>> 0) : 0);
const intCell = (v) => (v ? [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255] : null);

export function layerToInt(L) { const src = new Int32Array(S.W * S.H);
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) src[y * S.W + x] = cellInt(L.grid[y][x]); return src; }

export function buildRotPreview(L, ang, scale) { const r = rotSprite(layerToInt(L), S.W, S.H, ang, scale);
  const c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
  const x = c.getContext('2d'), id = x.createImageData(r.w, r.h);
  for (let i = 0; i < r.w * r.h; i++) { const v = r.data[i]; if (!v) continue; const o = i * 4;
    id.data[o] = (v >>> 24) & 255; id.data[o + 1] = (v >>> 16) & 255; id.data[o + 2] = (v >>> 8) & 255; id.data[o + 3] = v & 255; }
  x.putImageData(id, 0, 0);
  return { canvas: c, px: Math.round((S.W - r.w) / 2), py: Math.round((S.H - r.h) / 2), ow: r.w, oh: r.h }; }

export function freeRotateLayer(L, ang, scale) { const r = rotSprite(layerToInt(L), S.W, S.H, ang, scale);
  snapshot(); L.grid = blank(S.W, S.H); L.ext = new Map();
  const tx = Math.round((S.W - r.w) / 2), ty = Math.round((S.H - r.h) / 2);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const v = r.data[y * r.w + x]; if (!v) continue;
    const cx = tx + x, cy = ty + y; if (cx >= 0 && cy >= 0 && cx < S.W && cy < S.H) L.grid[cy][cx] = intCell(v); else L.ext.set(cx + ',' + cy, intCell(v)); }
  const i = S.layers.indexOf(L); if (i >= 0) markDirty(i); bus.emit('render'); bus.emit('layers'); toast('Слой повёрнут'); }
