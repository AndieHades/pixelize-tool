// Экран галереи: рендер плиток (работы/папки), переименование двойным кликом,
// режим выбора, складывание (drag/наложение) и переупорядочивание.
import { $, showMenuAt } from '../../core/dom.js';
import { t, getLocale } from '../../i18n/index.js';
import { childrenOf, renameItem, removeItem, createFolder, moveToFolder, duplicateItem, setOrder, getItem, nextFolderName } from './store.js';
import { openWork } from './doc.js';
import { attachDrag } from './drag.js';

const FOLDER_IC = '<svg viewBox="0 0 24 24"><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2.5h7A2 2 0 0 1 20.5 10v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.5z"/></svg>';

// относительное время последнего изменения (как в галереях): только что / N мин / N ч / вчера / N дн / дата
function relTime(ts) {
  if (!ts) return '';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return t('time.now');
  if (m < 60) return m + ' ' + t('time.min');
  const h = Math.floor(m / 60); if (h < 24) return h + ' ' + t('time.hour');
  const d = Math.floor(h / 24); if (d === 1) return t('time.yesterday');
  if (d < 30) return d + ' ' + t('time.days');
  const dt = new Date(ts); return dt.toLocaleDateString(getLocale(), { month: 'long' }) + ' ' + dt.getFullYear(); // больше месяца — «май 2025»
}
let viewFolder = null, selecting = false, onOpen = null, rootTitle = ''; const selected = new Set();
export const configure = (o) => { onOpen = o.onOpen; rootTitle = $('gal-title').textContent; };
const gridEl = () => $('gal-grid');
export const isSelecting = () => selecting;

export function setSelecting(v) { selecting = v; selected.clear();
  const sb = $('gal-select'); sb.textContent = v ? '✓' : t('gallery.select');
  sb.classList.toggle('confirm', v); sb.classList.toggle('gal-round', v); sb.title = v ? t('gallery.done') : '';
  for (const id of ['gal-stack', 'gal-dup', 'gal-del']) $(id).style.display = v ? '' : 'none';
  for (const id of ['gal-import', 'gal-photo', 'gal-new', 'gal-settings']) $(id).style.display = v ? 'none' : '';
  gridEl().classList.toggle('selecting', v); updateSel(); return render(); }
function updateSel() { const n = selected.size;
  setBtn('gal-stack', 'gallery.stack', n, n < 2); setBtn('gal-dup', 'gallery.duplicate', n, !n); setBtn('gal-del', 'gallery.delete', n, !n);
  $('gal-stack').classList.toggle('lit', n >= 2); }
function setBtn(id, key, n, dis) { const b = $(id); if (!b) return; b.textContent = t(key) + (n ? ` (${n})` : ''); b.disabled = dis; }

async function openItem(id) { if (await openWork(id) && onOpen) onOpen(); }
export function goBack() { viewFolder = null; render(); }

// начать переименование плитки по id (после создания папки сразу даём ввести имя)
function editName(id) { const tile = gridEl().querySelector(`.gal-tile[data-id="${id}"]`); if (!tile) return;
  const nm = tile.querySelector('.gal-cap b'); if (nm) renameInline(nm, { id, name: nm.textContent }); }

function renameInline(nm, item) { nm.contentEditable = 'true'; nm.classList.add('editing'); nm.focus();
  const r = document.createRange(); r.selectNodeContents(nm); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  let done = false; const fin = async (save) => { if (done) return; done = true; nm.contentEditable = 'false'; nm.classList.remove('editing');
    const v = nm.textContent.trim().slice(0, 40); if (save && v && v !== item.name) await renameItem(item.id, v); render(); };
  nm.onblur = () => fin(true); nm.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); nm.blur(); } else if (e.key === 'Escape') { e.preventDefault(); fin(false); } }; }

function tileMenu(x, y, d) { const m = $('rowctx'); m.innerHTML = ''; // ПКМ по плитке: переименовать / дублировать / удалить
  const ren = document.createElement('button'); ren.textContent = t('menu.rename');
  ren.onclick = () => { m.classList.remove('on'); editName(d.id); }; m.appendChild(ren); // переименование — без ре-рендера
  const mk = (label, danger, fn) => { const b = document.createElement('button'); b.textContent = label; if (danger) b.classList.add('danger');
    b.onclick = async () => { m.classList.remove('on'); await fn(); render(); }; m.appendChild(b); };
  mk(t('gallery.duplicate'), false, () => duplicateItem(d.id));
  mk(t('gallery.delete'), true, () => removeItem(d.id));
  showMenuAt(m, x, y); }

async function tileEl(d) {
  const tile = document.createElement('div'); tile.className = 'gal-tile' + (d.kind === 'folder' ? ' folder' : '') + (selected.has(d.id) ? ' sel' : '');
  tile.dataset.id = d.id; tile.dataset.kind = d.kind || 'doc';
  const thumb = document.createElement('div'); thumb.className = 'gal-thumb';
  if (d.kind === 'folder') { const ic = document.createElement('i'); ic.className = 'gal-folder-ic'; ic.innerHTML = FOLDER_IC; thumb.appendChild(ic); } // у всех папок — значок папки
  else { const im = document.createElement('img'); im.src = d.preview || ''; im.draggable = false; im.style.aspectRatio = `${d.W} / ${d.H}`; thumb.appendChild(im); } // плитка в пропорциях работы
  tile.addEventListener('dragstart', (e) => e.preventDefault()); // не запускать нативный драг картинки (мешает своему)
  tile.addEventListener('contextmenu', (e) => { e.preventDefault(); tileMenu(e.clientX, e.clientY, d); }); // ПКМ (десктоп) — меню
  const chk = document.createElement('div'); chk.className = 'gal-check' + (selected.has(d.id) ? ' on' : ''); thumb.appendChild(chk);
  const cap = document.createElement('div'); cap.className = 'gal-cap';
  const nm = document.createElement('b'); nm.textContent = d.name;
  const sub = document.createElement('small'), tm = document.createElement('small');
  if (d.kind !== 'folder') { sub.textContent = `${d.W}×${d.H} px`; tm.textContent = relTime(d.updated); } // размеры и время — на разных строках
  cap.append(nm, sub, tm); tile.append(thumb, cap);
  thumb.onclick = () => { if (selecting) { const on = !selected.has(d.id); if (on) selected.add(d.id); else selected.delete(d.id);
      tile.classList.toggle('sel', on); chk.classList.toggle('on', on); updateSel(); }
    else if (d.kind === 'folder') { viewFolder = d.id; render(); } else openItem(d.id); };
  nm.onclick = (e) => e.stopPropagation();
  nm.ondblclick = (e) => { e.stopPropagation(); renameInline(nm, d); };
  attachDrag(tile, d.id, { gridEl, selecting: isSelecting,
    onBack: async (dragId) => { const f = viewFolder ? await getItem(viewFolder) : null; // бросок на «назад» — на уровень выше
      await moveToFolder([dragId], f ? (f.folder ?? null) : null); render(); },
    onStack: async (dragId, targetId, kind) => {
      if (kind === 'folder') { await moveToFolder([dragId], targetId); await render(); }
      else { const fid = await createFolder(await nextFolderName(t('gallery.folderName')), [targetId, dragId], viewFolder); await render(); editName(fid); } },
    onReorder: async (dragId, beforeId) => { const items = (await childrenOf(viewFolder)).filter((x) => x.id !== dragId).sort((a, b) => (b.order || 0) - (a.order || 0));
      let ord; if (!beforeId) ord = (items.length ? items[items.length - 1].order : Date.now()) - 1000;
      else { const i = items.findIndex((x) => x.id === beforeId); const bo = items[i].order, ao = i > 0 ? items[i - 1].order : bo + 2000; ord = (ao + bo) / 2; }
      await setOrder(dragId, ord); render(); } });
  return tile;
}

export async function render() { const grid = gridEl(); grid.innerHTML = '';
  const f = viewFolder ? await getItem(viewFolder) : null; // внутри папки — имя папки прямо в кнопке «назад»
  const back = $('gal-back'); back.style.display = viewFolder ? '' : 'none';
  back.textContent = viewFolder ? '‹ ' + (f ? f.name : '') : '‹';
  $('gal-title').style.display = viewFolder ? 'none' : ''; $('gal-title').textContent = rootTitle;
  const items = (await childrenOf(viewFolder)).sort((a, b) => (b.order || b.updated) - (a.order || a.updated));
  for (const d of items) grid.appendChild(await tileEl(d)); }

export async function stackSelected() { if (selected.size < 2) return; const fid = await createFolder(await nextFolderName(t('gallery.folderName')), [...selected], viewFolder); await setSelecting(false); editName(fid); }
export async function dupSelected() { for (const id of selected) await duplicateItem(id); setSelecting(false); }
export async function delSelected() { for (const id of selected) await removeItem(id); setSelecting(false); }
