// Рендер двух колонок библиотеки: наборы (папки) слева, кисти выбранного
// набора справа с превью-мазком. Переименование/меню/жесты — общие хелперы
// (longPress, inlineRename, swipe), как у слоёв: двойной клик/тап или долгое
// нажатие/ПКМ. Перетаскивание кистей — drag.js.
import { S } from '../../core/state.js';
import { $, t } from '../../core/dom.js';
import { lib, brushesOf } from './data.js';
import { previewStroke } from '../../logic/brush-preview.js';
import { attachSwipe } from '../../core/swipe-actions.js';
import { longPress } from '../../core/long-press.js';
import { inlineRename } from '../../core/inline-rename.js';
import { dragBrush } from './drag.js';

let cb = {}, lastTap = { id: null, t: 0 }; // cb: { rerender, dup, del, menu, delSet, rename, mode }
export function bindList(c) { cb = c; }

const setLabel = (s) => s.name || (s.imported ? t('brush.imported') : t('brush.set'));

// единая точка переименования (двойной клик / меню / свайп) — общий inlineRename
function rename(span, item, kind) {
  inlineRename(span, kind === 'set' ? item.name || '' : item.name, (v) => { if (v) cb.rename(kind, item, v); else cb.rerender(); });
}
export function renameById(id) {
  let row = $('brush-list').querySelector('.brow[data-id="' + id + '"]'), item = lib.brushes.find((b) => b.id === id), kind = 'brush';
  if (!item) { row = $('brush-sets').querySelector('.brow[data-set="' + id + '"]'); item = lib.sets.find((s) => s.id === id); kind = 'set'; }
  if (row && item) rename(row.querySelector('.bname'), item, kind);
}
function dblHit(id) { const now = Date.now(), hit = lastTap.id === id && now - lastTap.t < 350;
  lastTap = hit ? { id: null, t: 0 } : { id, t: now }; return hit; }

function nameSpan(text) { const s = document.createElement('span'); s.className = 'bname'; s.textContent = text;
  const guard = (e) => { if (s.isContentEditable) e.stopPropagation(); };
  s.addEventListener('pointerdown', guard); s.addEventListener('click', guard); return s; }

export function renderSets() {
  const host = $('brush-sets'); host.innerHTML = '';
  for (const s of lib.sets) {
    const row = document.createElement('div'); row.className = 'brow set' + (s.id === lib.curSet ? ' on' : ''); row.dataset.set = s.id;
    const span = nameSpan(setLabel(s)); row.appendChild(span);
    row.addEventListener('click', () => { if (dblHit(s.id)) { rename(span, s, 'set'); return; } lib.curSet = s.id; cb.rerender(); });
    longPress(row, (x, y) => cb.menu(s, 'set', x, y));
    attachSwipe(row, { actions: [
      { label: t('menu.rename'), onClick: () => rename(span, s, 'set') },
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
    const span = nameSpan(b.name); row.append(span, previewCanvas(b));
    row.addEventListener('click', () => { if (dblHit(b.id)) { rename(span, b, 'brush'); return; } cb.pick(b); });
    longPress(row, (x, y) => cb.menu(b, 'brush', x, y));
    attachSwipe(row, { actions: [
      { label: t('menu.rename'), onClick: () => rename(span, b, 'brush') },
      { label: t('menu.duplicate'), onClick: () => cb.dup(b) },
      { label: t('menu.delete'), danger: true, onClick: () => cb.del(b) }] });
    dragBrush(row, b, cb.rerender);
    host.appendChild(row);
  }
}
