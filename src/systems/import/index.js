// Импорт картинки: выбор файла/drag-n-drop → пиксель-арт (через диалог) или
// вставка как есть. Конвертация — в ./convert.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot, restore } from '../../core/history.js';
import { expandCanvas, placeImageLayer } from '../../core/document.js';
import { MAX_LAYERS, IMPORT_MAX_SIDE } from '../../config/limits.js';
import { $, toast, t } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { imageData, looksPixelArt } from '../../core/image.js';
import { setImpData, impConvert, applyImport, rotateImp } from './convert.js';

let impSrcImg = null;
export { looksPixelArt };

export function insertPixelImage(im) { // вставить как есть в натуральном размере
  const iw = im.naturalWidth, ih = im.naturalHeight, d = imageData(im, iw, ih, false).data;
  snapshot();
  const nW = Math.max(S.W, iw), nH = Math.max(S.H, ih);
  if (nW !== S.W || nH !== S.H) { const pl = (nW - S.W) >> 1, pt = (nH - S.H) >> 1; expandCanvas(pl, pt, nW - S.W - pl, nH - S.H - pt); }
  if (S.layers.length >= MAX_LAYERS) { restore(S.undoStack.pop()); toast(t('toast.maxLayersDel')); return; }
  placeImageLayer(iw, ih, d); bus.emit('layers'); bus.emit('fit'); toast(t('toast.inserted', { w: iw, h: ih }));
}

export function openImport(file) {
  if (!file) return;
  const im = new Image(); im.onerror = () => toast(t('toast.imgOpenFail'));
  im.onload = () => { impSrcImg = im;
    // исходник держим в максимальном разрешении: даунскейл (со сглаживанием) — только
    // у гигантских файлов, иначе размывается родная сетка пиксель-арта
    const k = Math.min(1, IMPORT_MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
    setImpData(imageData(im, w, h, k < 1));
    $('imp-colorsv').textContent = +$('imp-colors').value || t('label.noQuant'); // синхронизировать подпись (0 = без квантования)
    $('imp-ovl').classList.add('on');
    requestAnimationFrame(impConvert); }; // первый рендер — после раскладки, чтобы превью сразу было полного размера
  im.src = URL.createObjectURL(file);
}

export function dropImage(file) { if (!file) return;
  const im = new Image(); im.onerror = () => toast(t('toast.imgOpenFail'));
  im.onload = () => { if (looksPixelArt(im)) insertPixelImage(im); else openImport(file); };
  im.src = URL.createObjectURL(file); }

export function mount() {
  const fileInp = document.createElement('input'); fileInp.type = 'file'; fileInp.accept = 'image/*'; fileInp.id = 'file';
  document.body.appendChild(fileInp);
  fileInp.onchange = (e) => { openImport(e.target.files[0]); e.target.value = ''; };
  $('imp').onclick = () => fileInp.click();
  actions.register('file.import', () => fileInp.click());
  let timer = null; const soon = () => { clearTimeout(timer); timer = setTimeout(impConvert, 60); };
  $('imp-colors').addEventListener('input', () => { $('imp-colorsv').textContent = +$('imp-colors').value || t('label.noQuant'); soon(); }); // 0 = без квантования
  $('imp-bgtol').addEventListener('input', () => { $('imp-bgtolv').textContent = $('imp-bgtol').value; soon(); });
  $('imp-cell').addEventListener('input', () => { const v = +$('imp-cell').value; $('imp-cellv').textContent = v || 'Авто'; soon(); });
  ['imp-clean', 'imp-sym'].forEach((id) => $(id).addEventListener('change', impConvert));
  $('imp-apply').onclick = applyImport; $('imp-rot').onclick = rotateImp;
  $('imp-cancel').onclick = () => $('imp-ovl').classList.remove('on');
  $('imp-asis').onclick = () => { if (impSrcImg) { $('imp-ovl').classList.remove('on'); actions.run('gallery.hide'); insertPixelImage(impSrcImg); } };
  floatingWindow($('imp-box'), { grip: $('imp-grip'), storeKey: 'impwin' }); // конвертер — перетаскиваемое окно
  let depth = 0; const show = (on) => $('dropmask').classList.toggle('on', on);
  window.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  window.addEventListener('dragenter', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); depth++; show(true); } });
  window.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) show(false); });
  window.addEventListener('drop', (e) => { e.preventDefault(); depth = 0; show(false);
    const f = e.dataTransfer && [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'));
    if (f) dropImage(f); else if (e.dataTransfer && e.dataTransfer.files.length) toast(t('toast.notImage')); });
}

actions.register('import.openFile', openImport); // открыть файл в конвертере (для галереи)
