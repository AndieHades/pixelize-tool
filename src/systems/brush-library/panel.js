// Панель библиотеки кистей: единая сетка плиток (папок нет), одна на карандаш
// и ластик (активная кисть у них разная — режим mode). «+» — из выделения /
// импорт / экспорт. ЛКМ — выбор, клик по активной / долгое нажатие — настройки.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, t, toast } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { importBrushFile } from '../../core/brush-import/index.js';
import { packSet, unpackSet } from '../../core/brush-pack.js';
import { saveFile } from '../../core/io.js';
import { setStampBrush } from '../../core/stamp-brush.js';
import { brushHasShape } from '../../logic/brush-stamp.js';
import { BP_SMAX } from '../../config/limits.js';
import { ensureLib, allBrushes, addBrush, dupBrush, delBrush, addSet, renameBrush } from './data.js';
import { renderBrushes, bindList, renameById } from './list.js';
import { createFromSelection } from './from-selection.js';
import { mountSettings, syncSettings, openSettings } from './settings.js';

let mode = 'pencil';
function rerender() { renderBrushes(); syncSettings(); }
// выбор кисти: нестандартная встаёт в натуральный размер (отпечаток = вид в палитре)
function selectBrush(b) { setStampBrush(mode, b); if (brushHasShape(b)) { S.brushes[mode].size = BP_SMAX; bus.emit('brushlib'); bus.emit('render'); } }

function pickBrush(fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = '.brush,.abr,.phbrush,.json';
  i.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fn(f); }; i.click(); }
async function addAll(recs, setId) { let first = null; for (const rec of recs) { const b = await addBrush(rec, setId); first = first || b; }
  if (first) selectBrush(first); rerender(); }
function importBrush() { pickBrush((f) => {
  if (/\.phbrush$|\.json$/i.test(f.name)) { f.text().then((txt) => { const pack = unpackSet(txt);
    return addSet(pack.name).then((s) => addAll(pack.brushes, s.id)); }).catch(() => toast(t('toast.brushImportFail'))); return; }
  importBrushFile(f).then((list) => addAll(list)).catch(() => toast(t('toast.brushImportFail'))); }); }
function exportAll() { const text = packSet(t('brush.library'), allBrushes());
  saveFile(new Blob([text], { type: 'application/json' }), 'brushes.phbrush', 'application/json', t('brush.packDesc')); }

const pick = (b) => { selectBrush(b); rerender(); }; // ЛКМ — выбор (натуральный размер для нестандартных)
const settings = (b) => { setStampBrush(mode, b); rerender(); openSettings(); }; // клик по активной / долгое нажатие — настройки
const dup = (b) => dupBrush(b).then(rerender);
const del = (b) => delBrush(b.id).then(rerender);
const rename = (b, name) => renameBrush(b, name).then(rerender);

const opened = () => $('brush-pop').classList.contains('on');
async function open(which) { mode = which; await ensureLib(); $('brush-pop').classList.add('on'); rerender(); }
export function toggle(which) { const p = $('brush-pop');
  if (opened() && which === mode) p.classList.remove('on'); else open(which); }

export function mount() {
  bindList({ rerender, pick, settings, rename, mode: () => mode });
  mountSettings(() => mode, { dup, del, rename: (id) => renameById(id) });
  floatingWindow($('brush-pop'), { grip: $('brush-head'), handle: $('brush-rsz'), storeKey: 'brushwin', minW: 240, minH: 220,
    onClose: () => $('brush-pop').classList.remove('on') });
  $('brush-add').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); showMenuAt($('brush-plus'), r.left, r.bottom); });
  const closePlus = () => $('brush-plus').classList.remove('on');
  $('brush-from-sel').onclick = () => { closePlus(); createFromSelection(); };
  $('brush-import').onclick = () => { closePlus(); importBrush(); };
  $('brush-export').onclick = () => { closePlus(); exportAll(); };
  document.addEventListener('pointerdown', (e) => { if (!$('brush-plus').contains(e.target)) closePlus(); }, true);
  bus.on('locale', () => { if (opened()) rerender(); });
  bus.on('brushlib', () => { if (opened()) rerender(); });
  actions.register('ui.brushLibrary', toggle);
  actions.register('brush.fromSelection', createFromSelection);
}
