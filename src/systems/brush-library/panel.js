// Панель библиотеки кистей (в стиле Procreate, на базе панели слоёв). Одна
// панель для карандаша и ластика — активная кисть у них разная (режим mode).
// «+» — новый набор / импорт / из выделения; ПКМ/долгое нажатие/свайп — меню.
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, t, toast } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { importBrushFile } from '../../core/brush-import/index.js';
import { packSet, unpackSet } from '../../core/brush-pack.js';
import { saveFile } from '../../core/io.js';
import { setStampBrush } from '../../core/stamp-brush.js';
import { ensureLib, addBrush, dupBrush, delBrush, addSet, delSet, renameBrush, renameSet, brushesOf } from './data.js';
import { renderSets, renderBrushes, bindList, renameById } from './list.js';
import { createFromSelection } from './from-selection.js';
import { mountSettings, syncSettings, openSettings } from './settings.js';

let mode = 'pencil';
function rerender() { renderSets(); renderBrushes(); syncSettings(); }

function pickBrush(fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = '.brush,.abr,.phbrush,.json';
  i.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fn(f); }; i.click(); }
async function addAll(recs, setId) { let first = null; for (const rec of recs) { const b = await addBrush(rec, setId); first = first || b; }
  if (first) setStampBrush(mode, first); rerender(); }
function importBrush() { pickBrush((f) => {
  if (/\.phbrush$|\.json$/i.test(f.name)) { f.text().then((txt) => { const pack = unpackSet(txt); // набор → новый набор
    return addSet(pack.name).then((s) => addAll(pack.brushes, s.id)); }).catch(() => toast(t('toast.brushImportFail'))); return; }
  importBrushFile(f).then((list) => addAll(list)).catch(() => toast(t('toast.brushImportFail'))); }); } // .brush/.abr — в текущий набор
function exportSet(s) { const text = packSet(s.name || t('brush.imported'), brushesOf(s.id));
  saveFile(new Blob([text], { type: 'application/json' }), (s.name || 'brushes') + '.phbrush', 'application/json', t('brush.packDesc')); }

const pick = (b) => { setStampBrush(mode, b); rerender(); }; // ЛКМ — только выбор
const settings = (b) => { setStampBrush(mode, b); rerender(); openSettings(); }; // ПКМ/долгое — выбрать + настройки
const dup = (b) => dupBrush(b).then(rerender);
const del = (b) => delBrush(b.id).then(rerender);
const removeSet = (s) => delSet(s.id).then(rerender);
const rename = (kind, item, name) => (kind === 'set' ? renameSet(item, name) : renameBrush(item, name)).then(rerender);

function menu(item, kind, x, y) { const m = $('brush-ctx'); m.innerHTML = '';
  const add = (label, fn, danger) => { const b = document.createElement('button'); b.textContent = label; if (danger) b.dataset.act = 'del';
    b.onclick = () => { m.classList.remove('on'); fn(); }; m.appendChild(b); };
  add(t('menu.rename'), () => renameById(item.id));
  if (kind === 'brush') add(t('menu.duplicate'), () => dup(item));
  if (kind === 'set') add(t('menu.export'), () => exportSet(item));
  add(t('menu.delete'), () => (kind === 'set' ? removeSet(item) : del(item)), true);
  showMenuAt(m, x, y); }

const opened = () => $('brush-pop').classList.contains('on');
async function open(which) { mode = which; await ensureLib(); $('brush-pop').classList.add('on'); rerender(); }
export function toggle(which) { const p = $('brush-pop');
  if (opened() && which === mode) p.classList.remove('on'); else open(which); }

export function mount() {
  bindList({ rerender, pick, settings, dup, del, menu, rename, delSet: removeSet, mode: () => mode });
  mountSettings(() => mode, { dup, del, rename: (id) => renameById(id) });
  floatingWindow($('brush-pop'), { grip: $('brush-head'), handle: $('brush-rsz'), storeKey: 'brushwin', minW: 320, minH: 260,
    onClose: () => $('brush-pop').classList.remove('on') });
  $('brush-add').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); showMenuAt($('brush-plus'), r.left, r.bottom); });
  const closePlus = () => $('brush-plus').classList.remove('on');
  $('brush-new-set').onclick = () => { closePlus(); addSet('').then(rerender); };
  $('brush-import').onclick = () => { closePlus(); importBrush(); };
  $('brush-from-sel').onclick = () => { closePlus(); createFromSelection(); };
  document.addEventListener('pointerdown', (e) => {
    if (!$('brush-plus').contains(e.target)) closePlus();
    if (!$('brush-ctx').contains(e.target)) $('brush-ctx').classList.remove('on'); }, true);
  bus.on('locale', () => { if (opened()) rerender(); });
  bus.on('brushlib', () => { if (opened()) rerender(); }); // кисть создана из выделения и т.п.
  actions.register('ui.brushLibrary', toggle); // вызывается с 'pencil'/'eraser'
  actions.register('brush.fromSelection', createFromSelection); // хоткей mod+b
}
