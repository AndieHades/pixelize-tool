// Экспорт: PNG (композит видимых слоёв), PNG слоя (весь/по контуру), PSD со слоями.
import { S } from '../core/state.js';
import * as actions from '../core/actions.js';
import { compositeLayers, layerCanvas } from '../core/layer-cache.js';
import { gridBounds } from '../logic/raster.js';
import { saveCanvas, gridToCanvas, saveFile } from '../core/io.js';
import { toast, t } from '../core/dom.js';

export function exportPng() {
  const c = document.createElement('canvas'); c.width = S.W; c.height = S.H;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; compositeLayers(x);
  saveCanvas(c, `pixel_${S.W}x${S.H}.png`);
}

export function exportLayerPng(L, tight) { // tight — по контуру содержимого
  const safe = (L.name || 'layer').replace(/[^\wА-Яа-яЁё -]+/g, '_').trim() || 'layer';
  if (!tight) { saveCanvas(gridToCanvas(L.grid, 0, 0, S.W, S.H), `${safe}_${S.W}x${S.H}.png`); return; }
  const b = gridBounds(L.grid); if (!b) { toast(t('toast.layerEmpty')); return; }
  const w = b.maxx - b.minx + 1, h = b.maxy - b.miny + 1;
  saveCanvas(gridToCanvas(L.grid, b.minx, b.miny, w, h), `${safe}_${w}x${h}.png`);
}

export function exportPsd() { // минимальный PSD: RGBA-слои без сжатия + композит
  const W = S.W, H = S.H, N = S.layers.length, chunks = [];
  const bytes = (a) => chunks.push(a);
  const u8 = (...v) => bytes(Uint8Array.from(v));
  const u16 = (v) => u8((v >> 8) & 255, v & 255);
  const u32 = (v) => u8((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
  const ascii = (s) => bytes(Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 255)));
  const planes = S.layers.map((L, i) => layerCanvas(i).getContext('2d').getImageData(0, 0, W, H).data);
  ascii('8BPS'); u16(1); bytes(new Uint8Array(6)); u16(4); u32(H); u32(W); u16(8); u16(3);
  u32(0); u32(0);
  const names = S.layers.map((L) => (L.name || 'Layer').slice(0, 60));
  const pas = names.map((s) => { let a = ''; for (const ch of s) a += ch.charCodeAt(0) < 128 ? ch : '_'; return (a.slice(0, 31) || 'Layer'); });
  const pasPad = (s) => { const l = 1 + s.length; return l + ((4 - (l % 4)) % 4); };
  const extraLen = (i) => 8 + pasPad(pas[i]) + (12 + 4 + names[i].length * 2);
  const recLen = (i) => 16 + 2 + 24 + 4 + 4 + 4 + 4 + extraLen(i);
  let liLen = 2; for (let i = 0; i < N; i++) liLen += recLen(i);
  liLen += N * 4 * (2 + W * H);
  const liPad = liLen % 2; liLen += liPad;
  u32(4 + liLen + 4); u32(liLen); u16(N);
  for (let i = 0; i < N; i++) {
    u32(0); u32(0); u32(H); u32(W); u16(4);
    for (const cid of [0, 1, 2, -1]) { u16(cid & 0xffff); u32(2 + W * H); }
    ascii('8BIM'); ascii('norm');
    u8(Math.round(S.layers[i].opacity * 255)); u8(S.layers[i].clip ? 1 : 0); u8(S.layers[i].visible ? 0 : 2); u8(0);
    u32(extraLen(i)); u32(0); u32(0);
    u8(pas[i].length); ascii(pas[i]); for (let k = 1 + pas[i].length; k % 4; k++) u8(0);
    ascii('8BIM'); ascii('luni'); u32(4 + names[i].length * 2); u32(names[i].length);
    for (const ch of names[i]) u16(ch.charCodeAt(0));
  }
  for (let i = 0; i < N; i++) { const d = planes[i];
    for (const off of [0, 1, 2, 3]) { u16(0); const pl = new Uint8Array(W * H);
      for (let p = 0; p < W * H; p++) pl[p] = d[p * 4 + off]; bytes(pl); } }
  if (liPad) u8(0);
  u32(0);
  const comp = document.createElement('canvas'); comp.width = W; comp.height = H;
  const cx2 = comp.getContext('2d'); cx2.imageSmoothingEnabled = false; compositeLayers(cx2);
  const cd = cx2.getImageData(0, 0, W, H).data;
  u16(0);
  for (const off of [0, 1, 2, 3]) { const pl = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) pl[p] = cd[p * 4 + off]; bytes(pl); }
  saveFile(new Blob(chunks, { type: 'image/vnd.adobe.photoshop' }), `pixel_${W}x${H}.psd`, 'image/vnd.adobe.photoshop', 'Photoshop PSD');
}

actions.register('export.layer', (L, tight) => exportLayerPng(L, tight));
actions.register('file.exportPng', exportPng);
actions.register('file.exportPsd', exportPsd);
