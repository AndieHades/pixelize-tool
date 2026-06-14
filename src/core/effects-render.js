// Растеризация неразрушающих эффектов слоя/папки в canvas (с кешем по подписи).
// Эффекты «под слоём» (обводка/свечение/тень) и «внутри» (внутр. тень, по маске).
import { S } from './state.js';
import { hexToRgb } from '../logic/color.js';
import { EFFECT_PIXELS, INNER_EFFECTS, maskFromGrid, maskFromAlpha } from '../logic/layer-effects.js';
import { layerFloatCanvas, layerSrcCanvas, layerExtCanvas, layerRev } from './layer-cache.js';
import { effVis, clipBase, folderChain } from './layers.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// булев силуэт цели (слой — по сетке, папка — по композиту поддерева): нужен
// для расчёта пикселей одного эффекта (Convert To Layer). groupCanvas — ниже (hoisted).
export function targetSilhouette(target) { const W = S.W, H = S.H;
  if (target.grid) return maskFromGrid(target.grid, W, H);
  const g = groupCanvas(target.id); return maskFromAlpha(g.getContext('2d').getImageData(0, 0, W, H).data, W, H); }

const effectsFor = (target) => { const base = target.effects || [], d = S.fxDraft;
  return d && d.target === target && !base.includes(d.eff) ? [...base, d.eff] : base; };
export const layerEffectsFor = (L) => effectsFor(L);
export const folderEffectsFor = (f) => effectsFor(f);

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
export function layerFxCanvas(i) { const L = S.layers[i], src = layerFloatCanvas(i), W = S.W, H = S.H, effects = layerEffectsFor(L);
  if (!effects.length) return src;
  // поднятый фрагмент выделения этого слоя: при его движении силуэт берём из src
  // (вместе с фрагментом на текущем месте) — иначе обводка/тень над выделенной
  // областью пропадают и «застывают» на месте подъёма (кеш по подписи).
  const f = S.selFloat && (S.selFloat.li ?? S.cur) === i ? S.selFloat : null;
  const fsig = f ? '|f' + (f.symItems ? f.dx + ',' + f.dy : f.x + ',' + f.y + ',' + f.w + ',' + f.h) : '';
  const sig = W + 'x' + H + '|' + layerRev(i) + '|' + JSON.stringify(effects) + fsig;
  const hit = lcache.get(i); if (hit && hit.sig === sig) return hit.canvas;
  const mask = f ? maskFromAlpha(src.getContext('2d').getImageData(0, 0, W, H).data, W, H) : maskFromGrid(L.grid, W, H);
  const c = build(src, mask, effects, W, H); lcache.set(i, { sig, canvas: c }); return c; }

// Превью слоя i при перетаскивании на (dx,dy): содержимое (grid + запас ext) и
// его эффекты, пересчитанные для нового положения. Иначе при заезде из-за края
// обводка/тень показывались бы «обрезанными» (как раньше само изображение).
export function layerMoveCanvas(i, dx, dy) { const L = S.layers[i], W = S.W, H = S.H;
  const src = cv(W, H), sx = src.getContext('2d'); sx.imageSmoothingEnabled = false;
  sx.drawImage(layerFloatCanvas(i), dx, dy);
  const ex = layerExtCanvas(i); if (ex) sx.drawImage(ex.canvas, ex.ox + dx, ex.oy + dy);
  const effects = layerEffectsFor(L); if (!effects.length) return src;
  return build(src, maskFromAlpha(sx.getImageData(0, 0, W, H).data, W, H), effects, W, H); }

// эффекты поверх произвольного W×H-контента (превью трансформации): силуэт — по альфе,
// толщина обводки/тени постоянна (эффект пересчитывается под текущую форму)
export function fxOnCanvas(src, effects, W, H) {
  if (!effects || !effects.length) return src;
  return build(src, maskFromAlpha(src.getContext('2d').getImageData(0, 0, W, H).data, W, H), effects, W, H); }

function clipPreview(m, memByIdx, src, W, H) {
  if (!m.L.clip) return src;
  const bi = clipBase(m.idx); if (bi < 0 || !effVis(bi)) return null;
  const mask = memByIdx.get(bi)?.content || layerFloatCanvas(bi);
  const out = cv(W, H), x = out.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'destination-in';
  x.drawImage(mask, 0, 0); x.globalCompositeOperation = 'source-over'; return out;
}

// canvas только эффектов папки вокруг готового силуэта grp (which='below' под группой |
// 'above' внутр.-тени по силуэту). Возвращает прозрачный W×H, если эффектов нет.
function folderFxOn(grp, effects, which, W, H) {
  const eff = (effects || []).filter((e) => e.visible !== false && (which === 'above' ? INNER_EFFECTS.has(e.type) : !INNER_EFFECTS.has(e.type)));
  const out = cv(W, H); if (!eff.length) return out;
  const mask = maskFromAlpha(grp.getContext('2d').getImageData(0, 0, W, H).data, W, H), ox = out.getContext('2d');
  for (const e of eff) { const ec = effCanvas(EFFECT_PIXELS[e.type](mask, W, H, e.params), hexToRgb(e.params.color), W, H);
    if (which === 'above') { const ix = ec.getContext('2d'); ix.globalCompositeOperation = 'destination-in'; ix.drawImage(grp, 0, 0); }
    ox.drawImage(ec, 0, 0); }
  return out; }

// Превью трансформации с эффектами: mems = [{ idx, L, content }] — трансформированный
// контент каждого слоя на полном W×H, снизу вверх. Кладёт эффекты каждого слоя и
// эффекты папок, чьи члены попали в трансформацию (как в обычном композите).
export function fxPreview(mems, W, H) { const out = cv(W, H), ox = out.getContext('2d'); ox.imageSmoothingEnabled = false;
  const inF = (L, fid) => folderChain(L.fid).some((f) => f.id === fid);
  const memByIdx = new Map(mems.map((m) => [m.idx, m]));
  const folders = S.folders.filter((f) => folderEffectsFor(f).length && mems.some((m) => inF(m.L, f.id)));
  const grpCanvas = (f) => { const g = cv(W, H), gx = g.getContext('2d'); gx.imageSmoothingEnabled = false;
    for (const m of mems) if (inF(m.L, f.id) && !m.L.clip) gx.drawImage(m.content, 0, 0); return g; };
  const byDepth = (a, b) => folderChain(a.id).length - folderChain(b.id).length;
  for (const f of folders.slice().sort(byDepth)) ox.drawImage(folderFxOn(grpCanvas(f), folderEffectsFor(f), 'below', W, H), 0, 0);
  for (const m of mems) { const c = clipPreview(m, memByIdx, fxOnCanvas(m.content, layerEffectsFor(m.L), W, H), W, H);
    if (c) ox.drawImage(c, 0, 0); }
  for (const f of folders.slice().sort((a, b) => byDepth(b, a))) ox.drawImage(folderFxOn(grpCanvas(f), folderEffectsFor(f), 'above', W, H), 0, 0);
  return out; }

// слои поддерева папки (с их эффектами) в один canvas — силуэт группы для её эффектов
function groupCanvas(fid) { const c = cv(S.W, S.H), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i];
    if (!folderChain(L.fid).some((f) => f.id === fid) || !effVis(i) || L.opacity <= 0) continue;
    const cb = L.clip ? null : layerSrcCanvas(i); if (!cb) continue; x.globalAlpha = L.opacity; x.drawImage(cb, 0, 0); }
  x.globalAlpha = 1; return c; }

function memberSig(fid) { let s = ''; for (let i = 0; i < S.layers.length; i++) if (folderChain(S.layers[i].fid).some((f) => f.id === fid)) s += i + ':' + layerRev(i) + ';'; return s; }

const fcache = new Map(); // fid+'|'+which → { sig, canvas }
// canvas эффектов папки: which='below' (под группой) | 'above' (поверх, по силуэту группы)
export function folderFx(folder, which) { const all = folderEffectsFor(folder);
  const eff = all.filter((e) => e.visible !== false && (which === 'above' ? INNER_EFFECTS.has(e.type) : !INNER_EFFECTS.has(e.type)));
  if (!eff.length) return null;
  const key = folder.id + '|' + which, sig = S.W + 'x' + S.H + '|' + memberSig(folder.id) + '|' + JSON.stringify(eff);
  const hit = fcache.get(key); if (hit && hit.sig === sig) return hit.canvas;
  const out = folderFxOn(groupCanvas(folder.id), all, which, S.W, S.H);
  fcache.set(key, { sig, canvas: out }); return out; }
