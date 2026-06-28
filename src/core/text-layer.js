import { blank } from './state.js';
import { makeCanvas } from './canvas.js';
import { TEXT_DEFAULT, TEXT_BOX } from '../config/text.js';
import { fontById } from './font-store.js';
import { hexToRgb } from '../logic/color.js';
import { cloneTextSource, normalizeTextPrefs, normalizeTextSource, isTextLayer } from '../logic/text-model.js';

const alpha = (v) => v > 7;
const textLines = (v) => String(v || '').split(/\r?\n/);

function textToGrid(text, W, H, fonts) {
  const src = normalizeTextSource(text), grid = blank(W, H);
  if (!src.value) return grid;
  const c = makeCanvas(W, H), ctx = c.getContext('2d'), font = fontById(src.fontId, fonts);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = src.color;
  ctx.textBaseline = 'top';
  ctx.textAlign = src.align;
  ctx.font = `${src.size}px ${font.family}`;
  const x = src.align === 'right' ? src.box.x + src.box.w : src.align === 'center' ? src.box.x + src.box.w / 2 : src.box.x;
  let y = src.box.y, any = false;
  for (const line of textLines(src.value)) {
    ctx.fillText(line, x, y);
    y += Math.max(1, Math.round(src.size * src.lineHeight));
  }
  const data = ctx.getImageData(0, 0, W, H).data, [r, g, b] = hexToRgb(src.color);
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const o = (yy * W + xx) * 4, a = data[o + 3];
    if (alpha(a)) { grid[yy][xx] = [r, g, b, a]; any = true; }
  }
  return any ? grid : fallbackGrid(src, W, H, [r, g, b, 255]);
}

function fallbackGrid(src, W, H, color) {
  const grid = blank(W, H);
  if (!src.value.trim()) return grid;
  const cw = Math.max(1, Math.round(src.size * 0.5)), ch = Math.max(1, src.size);
  let y = src.box.y;
  for (const line of textLines(src.value)) {
    let x = src.box.x;
    for (const chv of line) {
      if (chv !== ' ') paintGlyph(grid, W, H, x, y, cw, ch, color);
      x += cw + Math.round(src.letterSpacing);
    }
    y += Math.max(1, Math.round(src.size * src.lineHeight));
  }
  return grid;
}

function paintGlyph(grid, W, H, x0, y0, w, h, color) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x && x !== w - 1 && y && y !== h - 1 && x !== (w >> 1)) continue;
    const px = x0 + x, py = y0 + y;
    if (px >= 0 && py >= 0 && px < W && py < H) grid[py][px] = color.slice();
  }
}

export function makeTextLayer(name, W, H, prefs = {}, at = {}) {
  const p = normalizeTextPrefs(prefs);
  const layer = { name, grid: blank(W, H), opacity: 1, visible: true, fid: null, clip: false, lock: false,
    alphaLock: false, reference: false, ext: new Map(), effects: [], kind: 'text',
    text: normalizeTextSource({ ...TEXT_DEFAULT, ...prefs, ...p, box: { ...TEXT_BOX, x: at.x || 0, y: at.y || 0 } }) };
  updateTextLayerGrid(layer, W, H);
  return layer;
}

export function normalizeTextLayer(L, W, H, fonts) {
  if (!isTextLayer(L)) return L;
  L.text = cloneTextSource(L.text);
  L.grid = L.grid || blank(W, H);
  L.ext = L.ext || new Map();
  if (!L.grid.length || L.grid.length !== H || L.grid[0].length !== W) updateTextLayerGrid(L, W, H, fonts);
  return L;
}

export function updateTextLayerGrid(L, W, H, fonts) {
  if (!isTextLayer(L)) return false;
  L.text = cloneTextSource(L.text);
  L.grid = textToGrid(L.text, W, H, fonts);
  L.ext = new Map();
  return true;
}
