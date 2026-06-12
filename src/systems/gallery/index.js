// Галерея: сборка экрана, кнопки (Photo/Convert/Import/Select), навигация,
// автосохранение, инициализация (на старте открываем галерею).
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { imageData, looksPixelArt } from '../../core/image.js';
import { newWorkFromImage, newWorkFromLayers, beginConvertedWork, saveCurrent, autosave, openWork } from './doc.js';
import { listAll } from './store.js';
import { configure, render, goBack, setSelecting, isSelecting, stackSelected, dupSelected, delSelected } from './screen.js';
import { readPsd } from '../../logic/psd.js';

export function show() { saveCurrent(); render(); $('gallery').classList.add('on'); }
function hide() { $('gallery').classList.remove('on'); }

function pick(accept, fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
  i.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fn(f); }; i.click(); }

function photo() { pick('image/*', (f) => { const im = new Image(); im.onerror = () => {};
  im.onload = () => { if (looksPixelArt(im)) { const d = imageData(im, im.naturalWidth, im.naturalHeight, false); hide(); newWorkFromImage(d.width, d.height, d.data, f.name.replace(/\.\w+$/, '')); }
    else { beginConvertedWork(); actions.run('import.openFile', f); } }; im.src = URL.createObjectURL(f); }); } // конвертер поверх галереи; уйдём по «Применить»
function convert() { pick('image/*', (f) => { beginConvertedWork(); actions.run('import.openFile', f); }); }
function importPsd() { pick('.psd,image/vnd.adobe.photoshop', async (f) => { try { const psd = readPsd(await f.arrayBuffer());
  if (psd && psd.layers.length) { hide(); newWorkFromLayers(psd.W, psd.H, psd.layers, f.name.replace(/\.psd$/i, '')); } } catch (e) {} }); }

export async function mount() {
  configure({ onOpen: hide });
  $('gal-photo').onclick = photo; $('gal-convert').onclick = convert; $('gal-import').onclick = importPsd;
  $('gal-select').onclick = () => setSelecting(!isSelecting());
  $('gal-stack').onclick = stackSelected; $('gal-dup').onclick = dupSelected; $('gal-del').onclick = delSelected;
  $('gal-back').onclick = goBack;
  $('docsbtn').onclick = show;
  actions.register('gallery.hide', hide); // конвертер/импорт после «Применить» уводят с галереи в редактор
  bus.on('snapshot', autosave); bus.on('layers', autosave);
  try { const docs = (await listAll()).filter((d) => d.kind !== 'folder'); // последнюю работу грузим под галереей (для «продолжить»)
    if (docs.length) { const last = docs.sort((a, b) => b.updated - a.updated)[0]; await openWork(last.id); } } catch (e) {}
  show(); // на старте всегда открываем галерею, что бы ни случилось при чтении
}
