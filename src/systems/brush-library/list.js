// Рендер двух колонок библиотеки: наборы (папки) слева, кисти выбранного
// набора справа с превью-мазком. Тач — смахивание влево (Переименовать/…),
// ПК — ПКМ-меню. Перетаскивание — drag.js. Инлайн-переименование по editId.
import { S } from '../../core/state.js';
import { $, t } from '../../core/dom.js';
import { lib, brushesOf } from './data.js';
import { previewStroke } from '../../logic/brush-preview.js';
import { setStampBrush } from '../../core/stamp-brush.js';
import { attachSwipe } from '../../core/swipe-actions.js';
import { isDesktop } from '../../core/env.js';
import { dragBrush } from './drag.js';

let cb = {}, editId = null; // cb: { rerender, dup, del, menu, mode, rename, delSet }
export function bindList(c) { cb = c; }
export function startEdit(id) { editId = id; cb.rerender(); }

const setLabel = (s) => s.name || (s.imported ? t('brush.imported') : t('brush.set'));

function nameInput(cur, save) {
  const inp = document.createElement('input'); inp.className = 'brow-edit'; inp.value = cur;
  const done = (ok) => { if (inp._d) return; inp._d = true; editId = null; if (ok) save(inp.value.trim()); else cb.rerender(); };
  inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); done(true); } else if (e.key === 'Escape') done(false); };
  inp.onblur = () => done(true); setTimeout(() => { inp.focus(); inp.select(); }, 0);
  return inp;
}

export function renderSets() {
  const host = $('brush-sets'); host.innerHTML = '';
  for (const s of lib.sets) {
    const row = document.createElement('div'); row.className = 'brow set' + (s.id === lib.curSet ? ' on' : ''); row.dataset.set = s.id;
    if (s.id === editId) { row.appendChild(nameInput(s.name, (v) => cb.rename('set', s, v))); host.appendChild(row); continue; }
    row.textContent = setLabel(s);
    row.onclick = () => { lib.curSet = s.id; cb.rerender(); };
    if (isDesktop()) row.addEventListener('contextmenu', (e) => { e.preventDefault(); cb.menu(s, 'set', e.clientX, e.clientY); });
    else attachSwipe(row, { actions: [
      { label: t('menu.rename'), onClick: () => startEdit(s.id) },
      { label: t('menu.delete'), danger: true, onClick: () => cb.delSet(s) }] });
    host.appendChild(row);
  }
}

function previewCanvas(b) {
  const W = 132, H = 30, cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'brush-prev';
  const pr = previewStroke(b, W, H), cx = cv.getContext('2d'), img = cx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) { img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = pr.data[i] ? 255 : 0; }
  cx.putImageData(img, 0, 0); return cv;
}

export function renderBrushes() {
  const host = $('brush-list'); host.innerHTML = '';
  const active = S.stampBrush[cb.mode()] && S.stampBrush[cb.mode()].id;
  for (const b of brushesOf(lib.curSet)) {
    const row = document.createElement('div'); row.className = 'brow brush' + (b.id === active ? ' on' : ''); row.dataset.id = b.id;
    if (b.id === editId) { row.appendChild(nameInput(b.name, (v) => cb.rename('brush', b, v))); host.appendChild(row); continue; }
    const name = document.createElement('div'); name.className = 'brush-name'; name.textContent = b.name;
    row.append(name, previewCanvas(b));
    row.addEventListener('click', () => { setStampBrush(cb.mode(), b); renderBrushes(); });
    if (isDesktop()) row.addEventListener('contextmenu', (e) => { e.preventDefault(); cb.menu(b, 'brush', e.clientX, e.clientY); });
    else attachSwipe(row, { actions: [
      { label: t('menu.rename'), onClick: () => startEdit(b.id) },
      { label: t('menu.duplicate'), onClick: () => cb.dup(b) },
      { label: t('menu.delete'), danger: true, onClick: () => cb.del(b) }] });
    dragBrush(row, b, cb.rerender);
    host.appendChild(row);
  }
}
