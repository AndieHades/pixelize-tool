// Экран галереи: рендер плиток (работы/папки), переименование двойным кликом,
// режим выбора, складывание (drag/наложение) и переупорядочивание.
import { $ } from '../../core/dom.js';
import { t } from '../../i18n/index.js';
import { childrenOf, renameItem, removeItem, createFolder, moveToFolder, duplicateItem, folderPreviews, setOrder } from './store.js';
import { openWork } from './doc.js';
import { attachDrag } from './drag.js';

let viewFolder = null, selecting = false, onOpen = null; const selected = new Set();
export const configure = (o) => { onOpen = o.onOpen; };
const gridEl = () => $('gal-grid');
export const isSelecting = () => selecting;

export function setSelecting(v) { selecting = v; selected.clear();
  const sb = $('gal-select'); sb.textContent = v ? '✓' : t('gallery.select'); sb.classList.toggle('confirm', v); sb.title = v ? t('gallery.done') : '';
  for (const id of ['gal-stack', 'gal-dup', 'gal-del']) $(id).style.display = v ? '' : 'none';
  for (const id of ['gal-convert', 'gal-import', 'gal-photo', 'gal-new']) $(id).style.display = v ? 'none' : '';
  gridEl().classList.toggle('selecting', v); updateSel(); render(); }
function updateSel() { const n = selected.size;
  setBtn('gal-stack', 'gallery.stack', n, n < 2); setBtn('gal-dup', 'gallery.duplicate', n, !n); setBtn('gal-del', 'gallery.delete', n, !n);
  $('gal-stack').classList.toggle('lit', n >= 2); }
function setBtn(id, key, n, dis) { const b = $(id); if (!b) return; b.textContent = t(key) + (n ? ` (${n})` : ''); b.disabled = dis; }

async function openItem(id) { if (await openWork(id) && onOpen) onOpen(); }
export function goBack() { viewFolder = null; render(); }

function renameInline(nm, item) { nm.contentEditable = 'true'; nm.classList.add('editing'); nm.focus();
  const r = document.createRange(); r.selectNodeContents(nm); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  let done = false; const fin = async (save) => { if (done) return; done = true; nm.contentEditable = 'false'; nm.classList.remove('editing');
    const v = nm.textContent.trim().slice(0, 40); if (save && v && v !== item.name) await renameItem(item.id, v); render(); };
  nm.onblur = () => fin(true); nm.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); nm.blur(); } else if (e.key === 'Escape') { e.preventDefault(); fin(false); } }; }

async function tileEl(d) {
  const tile = document.createElement('div'); tile.className = 'gal-tile' + (d.kind === 'folder' ? ' folder' : '') + (selected.has(d.id) ? ' sel' : '');
  tile.dataset.id = d.id; tile.dataset.kind = d.kind || 'doc';
  const thumb = document.createElement('div'); thumb.className = 'gal-thumb';
  if (d.kind === 'folder') { for (const p of await folderPreviews(d.id)) { const im = document.createElement('img'); im.src = p; thumb.appendChild(im); } }
  else { const im = document.createElement('img'); im.src = d.preview || ''; thumb.appendChild(im); }
  const chk = document.createElement('div'); chk.className = 'gal-check' + (selected.has(d.id) ? ' on' : ''); thumb.appendChild(chk);
  const cap = document.createElement('div'); cap.className = 'gal-cap';
  const nm = document.createElement('b'); nm.textContent = d.name;
  const sub = document.createElement('small'); sub.textContent = d.kind === 'folder' ? '' : `${d.W}×${d.H} px`;
  cap.append(nm, sub); tile.append(thumb, cap);
  thumb.onclick = () => { if (selecting) { const on = !selected.has(d.id); if (on) selected.add(d.id); else selected.delete(d.id);
      tile.classList.toggle('sel', on); chk.classList.toggle('on', on); updateSel(); }
    else if (d.kind === 'folder') { viewFolder = d.id; render(); } else openItem(d.id); };
  nm.onclick = (e) => e.stopPropagation();
  nm.ondblclick = (e) => { e.stopPropagation(); renameInline(nm, d); };
  attachDrag(tile, d.id, { gridEl, selecting: isSelecting,
    onStack: async (dragId, targetId, kind) => { if (kind === 'folder') await moveToFolder([dragId], targetId); else await createFolder(t('gallery.folderName'), [targetId, dragId], viewFolder); render(); },
    onReorder: async (dragId, beforeId) => { const items = (await childrenOf(viewFolder)).filter((x) => x.id !== dragId).sort((a, b) => (b.order || 0) - (a.order || 0));
      let ord; if (!beforeId) ord = (items.length ? items[items.length - 1].order : Date.now()) - 1000;
      else { const i = items.findIndex((x) => x.id === beforeId); const bo = items[i].order, ao = i > 0 ? items[i - 1].order : bo + 2000; ord = (ao + bo) / 2; }
      await setOrder(dragId, ord); render(); } });
  return tile;
}

export async function render() { const grid = gridEl(); grid.innerHTML = '';
  $('gal-back').style.display = viewFolder ? '' : 'none';
  const items = (await childrenOf(viewFolder)).sort((a, b) => (b.order || b.updated) - (a.order || a.updated));
  for (const d of items) grid.appendChild(await tileEl(d)); }

export async function stackSelected() { if (selected.size < 2) return; await createFolder(t('gallery.folderName'), [...selected], viewFolder); setSelecting(false); }
export async function dupSelected() { for (const id of selected) await duplicateItem(id); setSelecting(false); }
export async function delSelected() { for (const id of selected) await removeItem(id); setSelecting(false); }
