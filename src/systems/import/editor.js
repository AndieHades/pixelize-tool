// Единая кнопка Import редактора (рядом с Галереей): меню Photo / File / Pixelize.
// Всё вставляется в ТЕКУЩИЙ документ верхним слоем/папкой; новый холст/проект не
// создаём. Photo/File — прямая вставка, Pixelize — открыть конвертер.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { $, showMenuAt, toast, t } from '../../core/dom.js';
import { imageData } from '../../core/image.js';
import { addImageLayerTop } from '../../core/document.js';
import { MAX_LAYERS, IMPORT_MAX_SIDE } from '../../config/limits.js';
import { readPsd } from '../../logic/psd.js';
import { insertPsd } from './psd-insert.js';
import { openImport } from './index.js';

function pick(accept, fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
  i.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fn(f); }; i.click(); }
function loadImg(f, cb) { const im = new Image(); im.onerror = () => toast(t('toast.imgOpenFail')); im.onload = () => cb(im); im.src = URL.createObjectURL(f); }
const baseName = (n) => n.replace(/\.[^.]+$/, '');

// картинку — верхним слоем текущего холста (натуральные пиксели, перебор → ext)
function insertImageTop(im, name) {
  if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
  const k = Math.min(1, IMPORT_MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
  const d = imageData(im, w, h, k < 1).data; snapshot(); addImageLayerTop(w, h, d, name);
  bus.emit('layers'); bus.emit('render'); bus.emit('fit'); toast(t('toast.imgImported'));
}

const photo = () => pick('image/*', (f) => loadImg(f, (im) => insertImageTop(im, baseName(f.name))));
const pixelize = () => pick('image/*', (f) => openImport(f)); // в конвертер (текущая логика Pixelize)
function file(f0) { const go = (f) => { if (/\.psd$/i.test(f.name) || f.type === 'image/vnd.adobe.photoshop')
    f.arrayBuffer().then((b) => { let psd = null; try { psd = readPsd(b); } catch (e) {} // битый/непрочитанный PSD не должен ронять импорт
      if (psd && psd.layers.length) insertPsd(psd, baseName(f.name)); else toast(t('toast.imgOpenFail')); });
  else loadImg(f, (im) => insertImageTop(im, baseName(f.name))); };
  if (f0) go(f0); else pick('image/*,.psd,image/vnd.adobe.photoshop', go); }

export function mount() {
  $('imp-btn').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); showMenuAt($('impmenu'), r.left + r.width / 2, r.bottom); });
  const close = () => $('impmenu').classList.remove('on');
  $('impmenu-photo').onclick = () => { close(); photo(); };
  $('impmenu-file').onclick = () => { close(); file(); };
  $('impmenu-pix').onclick = () => { close(); pixelize(); };
  actions.register('file.import', () => file());
}
