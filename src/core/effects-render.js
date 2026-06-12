// Растеризация неразрушающих эффектов слоя/папки в canvas (с кешем по подписи).
// Эффекты «под слоём» (обводка/свечение/тень) и «внутри» (внутр. тень, по маске).
import { S } from './state.js';
import { hexToRgb } from '../logic/color.js';
import { EFFECT_PIXELS, INNER_EFFECTS, maskFromGrid, maskFromAlpha } from '../logic/layer-effects.js';
import { layerFloatCanvas, layerSrcCanvas, layerRev } from './layer-cache.js';
import { effVis, folderChain } from './layers.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// один эффект → canvas W×H с его пикселями (цвет + альфа)
function effCanvas(pixels, col, W, H) { const c = cv(W, H), x = c.getContext('2d'), id = x.createImageData(W, H);
  for (const [px, py, a] of pixels) { const o = (py * W + px) * 4; id.data[o] = col[0]; id.data[o + 1] = col[1]; id.data[o + 2] = col[2]; id.data[o + 3] = a; }
  x.putImageData(id, 0, 0); return c; }

// слой effects поверх содержимого src (маска mask): низ-эффекты под src, внутр.-эффекты по альфе src
function build(src, mask, effects, W, H) { const c = cv(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  for (const e of effects) { if (e.visible === false || INNER_EFFECTS.has(e.type)) continue;
    x.drawImage(effCanvas(EFFECT_PIXELS[e.type](mask, W, H, e.params), hexToRgb(e.params.color), W, H), 0, 0); }
  x.drawImage(src, 0, 0);
  for (const e of effects) { if (e.visible === false || !INNER_EFFECTS.has(e.type)) continue;
    const ic = effCanvas(EFFECT_PIXELS[e.type](mask, W, H, e.params), hexToRgb(e.params.color), W, H);
    const ix = ic.getContext('2d'); ix.globalCompositeOperation = 'destination-in'; ix.drawImage(src, 0, 0); x.drawImage(ic, 0, 0); }
  return c; }

const lcache = new Map(); // i → { sig, canvas }
export function layerFxCanvas(i) { const L = S.layers[i], src = layerFloatCanvas(i);
  if (!L.effects || !L.effects.length) return src;
  const sig = S.W + 'x' + S.H + '|' + layerRev(i) + '|' + JSON.stringify(L.effects);
  const hit = lcache.get(i); if (hit && hit.sig === sig) return hit.canvas;
  const c = build(src, maskFromGrid(L.grid, S.W, S.H), L.effects, S.W, S.H); lcache.set(i, { sig, canvas: c }); return c; }

// слои поддерева папки (с их эффектами) в один canvas — силуэт группы для её эффектов
function groupCanvas(fid) { const c = cv(S.W, S.H), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i];
    if (!folderChain(L.fid).some((f) => f.id === fid) || !effVis(i) || L.opacity <= 0) continue;
    const cb = L.clip ? null : layerSrcCanvas(i); if (!cb) continue; x.globalAlpha = L.opacity; x.drawImage(cb, 0, 0); }
  x.globalAlpha = 1; return c; }

function memberSig(fid) { let s = ''; for (let i = 0; i < S.layers.length; i++) if (folderChain(S.layers[i].fid).some((f) => f.id === fid)) s += i + ':' + layerRev(i) + ';'; return s; }

const fcache = new Map(); // fid+'|'+which → { sig, canvas }
// canvas эффектов папки: which='below' (под группой) | 'above' (поверх, по силуэту группы)
export function folderFx(folder, which) { const eff = (folder.effects || []).filter((e) => e.visible !== false && (which === 'above' ? INNER_EFFECTS.has(e.type) : !INNER_EFFECTS.has(e.type)));
  if (!eff.length) return null;
  const key = folder.id + '|' + which, sig = S.W + 'x' + S.H + '|' + memberSig(folder.id) + '|' + JSON.stringify(eff);
  const hit = fcache.get(key); if (hit && hit.sig === sig) return hit.canvas;
  const grp = groupCanvas(folder.id), gx = grp.getContext('2d'), W = S.W, H = S.H;
  const mask = maskFromAlpha(gx.getImageData(0, 0, W, H).data, W, H), out = cv(W, H), ox = out.getContext('2d');
  for (const e of eff) { const ec = effCanvas(EFFECT_PIXELS[e.type](mask, W, H, e.params), hexToRgb(e.params.color), W, H);
    if (which === 'above') { const ix = ec.getContext('2d'); ix.globalCompositeOperation = 'destination-in'; ix.drawImage(grp, 0, 0); }
    ox.drawImage(ec, 0, 0); }
  fcache.set(key, { sig, canvas: out }); return out; }
