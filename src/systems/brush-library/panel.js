// Панель библиотеки кистей (в стиле Procreate, на базе панели слоёв). Одна
// панель для карандаша и ластика — активная кисть у них разная (режим mode).
// «+» — новый набор / импорт из файла; ПКМ/смахивание — дублировать/удалить.
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { importBrushFile } from '../../core/brush-import/index.js';
import { setStampBrush } from '../../core/stamp-brush.js';
import { loadLib, addBrush, dupBrush, delBrush, addSet } from './data.js';
import { renderSets, renderBrushes, bindList } from './list.js';

let loaded = false, mode = 'pencil';
function rerender() { renderSets(); renderBrushes(); }
async function ensure() { if (loaded) return; loaded = true; await loadLib(); }

function pickBrush(fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = '.brush,.abr';
  i.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fn(f); }; i.click(); }
function importBrush() { pickBrush((f) => importBrushFile(f)
  .then(async (list) => { let first = null; for (const rec of list) { const b = await addBrush(rec); first = first || b; } // .abr — набор кистей
    if (first) setStampBrush(mode, first); rerender(); }).catch(() => {})); }

const dup = (b) => dupBrush(b).then(rerender);
const del = (b) => delBrush(b.id).then(rerender);
function menu(b, x, y) { const m = $('brush-ctx');
  m.querySelector('[data-act=dup]').onclick = () => { m.classList.remove('on'); dup(b); };
  m.querySelector('[data-act=del]').onclick = () => { m.classList.remove('on'); del(b); };
  showMenuAt(m, x, y); }

async function open(which) { mode = which; await ensure(); $('brush-pop').classList.add('on'); rerender(); }
export function toggle(which) { const p = $('brush-pop');
  if (p.classList.contains('on') && which === mode) p.classList.remove('on'); else open(which); }

export function mount() {
  bindList({ rerender, dup, del, menu, mode: () => mode });
  floatingWindow($('brush-pop'), { grip: $('brush-head'), handle: $('brush-rsz'), storeKey: 'brushwin', minW: 320, minH: 260,
    onClose: () => $('brush-pop').classList.remove('on') });
  $('brush-add').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); showMenuAt($('brush-plus'), r.left, r.bottom); });
  const closePlus = () => $('brush-plus').classList.remove('on');
  $('brush-new-set').onclick = () => { closePlus(); addSet('').then(rerender); };
  $('brush-import').onclick = () => { closePlus(); importBrush(); };
  document.addEventListener('pointerdown', (e) => {
    if (!$('brush-plus').contains(e.target)) closePlus();
    if (!$('brush-ctx').contains(e.target)) $('brush-ctx').classList.remove('on'); }, true);
  bus.on('locale', () => { if ($('brush-pop').classList.contains('on')) rerender(); });
  actions.register('ui.brushLibrary', toggle); // вызывается с 'pencil'/'eraser'
}
