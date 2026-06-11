// Импорт картинки: выбор файла/drag-n-drop → пиксель-арт (через диалог) или
// вставка как есть. Конвертация — в ./convert.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot, restore } from '../../core/history.js';
import { expandCanvas, placeImageLayer } from '../../core/document.js';
import { MAX_LAYERS } from '../../config/limits.js';
import { $, toast } from '../../core/dom.js';
import { setImpData, impConvert, applyImport, rotateImp } from './convert.js';

let impSrcImg = null;
const imageData = (im, w, h, smooth) => { const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = smooth; x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h); };

export function insertPixelImage(im) { // вставить как есть в натуральном размере
  const iw = im.naturalWidth, ih = im.naturalHeight, d = imageData(im, iw, ih, false).data;
  snapshot();
  const nW = Math.max(S.W, iw), nH = Math.max(S.H, ih);
  if (nW !== S.W || nH !== S.H) { const pl = (nW - S.W) >> 1, pt = (nH - S.H) >> 1; expandCanvas(pl, pt, nW - S.W - pl, nH - S.H - pt); }
  if (S.layers.length >= MAX_LAYERS) { restore(S.undoStack.pop()); toast('Максимум 8 слоёв — удали лишние'); return; }
  placeImageLayer(iw, ih, d); bus.emit('layers'); bus.emit('fit'); toast(`Вставлено ${iw}×${ih}`);
}

export function looksPixelArt(im) { // эвристика: мало цветов и/или маленький размер
  const w = im.naturalWidth, h = im.naturalHeight;
  if (Math.max(w, h) <= 96) return true;
  const SAMP = 220, k = Math.min(1, SAMP / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k));
  const d = imageData(im, sw, sh, false).data, colors = new Set();
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 8) continue;
    colors.add((d[i] >> 2) + ',' + (d[i + 1] >> 2) + ',' + (d[i + 2] >> 2)); if (colors.size > 180) return false; }
  return true;
}

export function openImport(file) {
  if (!file) return;
  const im = new Image(); im.onerror = () => toast('Не удалось открыть картинку');
  im.onload = () => { impSrcImg = im;
    const MAX = 600, k = Math.min(1, MAX / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
    setImpData(imageData(im, w, h, true)); $('imp-ovl').classList.add('on'); impConvert(); };
  im.src = URL.createObjectURL(file);
}

export function dropImage(file) { if (!file) return;
  const im = new Image(); im.onerror = () => toast('Не удалось открыть картинку');
  im.onload = () => { if (looksPixelArt(im)) insertPixelImage(im); else openImport(file); };
  im.src = URL.createObjectURL(file); }

export function mount() {
  const fileInp = document.createElement('input'); fileInp.type = 'file'; fileInp.accept = 'image/*'; fileInp.id = 'file';
  document.body.appendChild(fileInp);
  fileInp.onchange = (e) => { openImport(e.target.files[0]); e.target.value = ''; };
  $('imp').onclick = () => fileInp.click();
  actions.register('file.import', () => fileInp.click());
  let timer = null; const soon = () => { clearTimeout(timer); timer = setTimeout(impConvert, 60); };
  ['imp-colors', 'imp-bgtol'].forEach((id) => { const el = $(id), out = $(id + 'v'); el.addEventListener('input', () => { if (out) out.textContent = el.value; soon(); }); });
  $('imp-cell').addEventListener('input', () => { const v = +$('imp-cell').value; $('imp-cellv').textContent = v || 'Авто'; soon(); });
  ['imp-clean', 'imp-sym'].forEach((id) => $(id).addEventListener('change', impConvert));
  $('imp-apply').onclick = applyImport; $('imp-rot').onclick = rotateImp;
  $('imp-cancel').onclick = () => $('imp-ovl').classList.remove('on');
  $('imp-asis').onclick = () => { if (impSrcImg) { $('imp-ovl').classList.remove('on'); insertPixelImage(impSrcImg); } };
  let depth = 0; const show = (on) => $('dropmask').classList.toggle('on', on);
  addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  addEventListener('dragenter', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); depth++; show(true); } });
  addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) show(false); });
  addEventListener('drop', (e) => { e.preventDefault(); depth = 0; show(false);
    const f = e.dataTransfer && [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
    if (f) dropImage(f); else if (e.dataTransfer && e.dataTransfer.files.length) toast('Это не картинка'); });
}
