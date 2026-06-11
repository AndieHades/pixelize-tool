// Конвертация картинки в пиксель-арт: дискретизация → палитра → чистка →
// предпросмотр; применение создаёт новый документ. Чистые алгоритмы — в logic.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { rgb } from '../../logic/color.js';
import { sampleGrid } from '../../logic/sample.js';
import { medianCut, nearest, paletteFromGrid } from '../../logic/quantize.js';
import { symmetrizeV, despeckle, cropEmpty } from '../../logic/cleanup.js';
import { setTool } from '../../core/tools.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { $, toast } from '../../core/dom.js';

let impData = null, impGrid = null;
export const setImpData = (d) => { impData = d; };
export const getImpData = () => impData;

export function impConvert() {
  if (!impData) return;
  const colors = +$('imp-colors').value, detail = +$('imp-cell').value, bgtol = +$('imp-bgtol').value;
  const cell = detail > 0 ? impData.width / detail : 0; // «Детализация» = ширина результата в клетках
  const r = sampleGrid({ w: impData.width, h: impData.height, ch: 4, data: impData.data }, cell, bgtol);
  let g = r.grid;
  if (colors > 0 && r.samples.length) { const pal = medianCut(r.samples, colors); g = g.map((row) => row.map((c) => (c ? nearest(c, pal) : null))); }
  if ($('imp-sym').checked) g = symmetrizeV(g, r.nx, r.ny);
  if ($('imp-clean').checked) g = despeckle(g, r.nx, r.ny);
  impGrid = g; drawTo($('imp-prev'), g, r.nx, r.ny);
}

export function rotateImp() { // поворот исходника на 90° до конвертации
  if (!impData) return;
  const w = impData.width, h = impData.height;
  const a = document.createElement('canvas'); a.width = w; a.height = h; a.getContext('2d').putImageData(impData, 0, 0);
  const b = document.createElement('canvas'); b.width = h; b.height = w;
  const x = b.getContext('2d'); x.translate(h, 0); x.rotate(Math.PI / 2); x.drawImage(a, 0, 0);
  impData = x.getImageData(0, 0, h, w); impConvert();
}

export function drawTo(cvp, g, nx, ny) {
  const dpr = window.devicePixelRatio || 1, cw = cvp.clientWidth, chh = cvp.clientHeight;
  if (cvp.width !== Math.round(cw * dpr)) { cvp.width = Math.round(cw * dpr); cvp.height = Math.round(chh * dpr); }
  const c = cvp.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false;
  c.fillStyle = '#101014'; c.fillRect(0, 0, cw, chh);
  const z = Math.max(1, Math.floor(Math.min((cw - 8) / nx, (chh - 8) / ny))), ox = Math.floor((cw - nx * z) / 2), oy = Math.floor((chh - ny * z) / 2);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { const col = g[y][x]; c.fillStyle = col ? rgb(col) : (((x + y) & 1) ? '#222228' : '#1a1a20'); c.fillRect(ox + x * z, oy + y * z, z, z); }
}

export function applyImport() {
  if (!impGrid) return;
  const g = cropEmpty(impGrid.map((r) => r.map((c) => (c ? c.slice() : null))));
  S.W = g[0].length; S.H = g.length;
  S.layerSeq = 1; S.layers = [{ name: 'Слой 1', grid: g, opacity: 1, visible: true, fid: null, clip: false, ext: new Map() }]; S.cur = 0;
  S.folders = []; S.folderSeq = 0; S.marked.clear();
  S.palette = paletteFromGrid(g); if (S.palette.length) S.active = S.palette[0].slice();
  S.sym = $('imp-sym').checked; $('sym').classList.toggle('on', S.sym);
  S.undoStack.length = S.redoStack.length = 0; dirtyAll();
  bus.emit('palette'); setTool('pencil'); bus.emit('layers');
  $('imp-ovl').classList.remove('on'); bus.emit('fit');
  toast(`Готово: ${S.W}×${S.H} — рисуй!`);
}
