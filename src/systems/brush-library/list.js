// Сетка кистей: плитки-квадратики с оригинальным видом кончика (штамп) —
// как переносной тулбар с иконками. ЛКМ — выбор; клик по уже выбранной —
// настройки; долгое нажатие / ПКМ-перетаскивание — перестановка плиток.
import { S } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { lib, allBrushes, setOrder } from './data.js';
import { stampIcon } from '../../logic/brush-preview.js';
import { paintCanvas, fillMask } from '../../core/canvas.js';
import { inlineRename } from '../../core/inline-rename.js';
import { attachReorder } from '../../core/reorder-drag.js';
import { DRAG_THRESHOLD } from '../../config/timings.js';

let cb = {}, squelchUntil = 0;
const squelch = () => { squelchUntil = Date.now() + 350; };
export function bindList(c) { cb = c; }

function rename(span, b) { inlineRename(span, b.name, (v) => { if (v) cb.rename(b, v); else cb.rerender(); }); }
export function renameById(id) { const tile = $('brush-list').querySelector('.btile[data-id="' + id + '"]'), b = lib.brushes.find((x) => x.id === id);
  if (tile && b) rename(tile.querySelector('.bname'), b); }
function nameSpan(text) { const s = document.createElement('span'); s.className = 'bname'; s.textContent = text;
  const guard = (e) => { if (s.isContentEditable) e.stopPropagation(); };
  s.addEventListener('pointerdown', guard); s.addEventListener('click', guard); return s; }

function iconCanvas(b) { const N = 32, ic = stampIcon(b, N);
  const cv = paintCanvas(N, N, (d) => fillMask(d, ic.data, N, N, [235, 235, 235, 255]));
  cv.className = 'btile-ic'; return cv;
}
function persist() { setOrder([...$('brush-list').children].map((t) => t.dataset.id).filter(Boolean)); }

export function renderBrushes() {
  const host = $('brush-list'); host.innerHTML = '';
  const active = S.stampBrush[cb.mode()] && S.stampBrush[cb.mode()].id;
  for (const b of allBrushes()) {
    const tile = document.createElement('div'); tile.className = 'btile' + (b.id === active ? ' on' : ''); tile.dataset.id = b.id;
    tile.append(iconCanvas(b), nameSpan(b.name));
    let rightDown = null;
    tile.addEventListener('pointerdown', (e) => { if (e.button === 2) rightDown = { x: e.clientX, y: e.clientY }; });
    tile.addEventListener('pointerup', (e) => { if (e.button !== 2 || !rightDown) return;
      const moved = Math.hypot(e.clientX - rightDown.x, e.clientY - rightDown.y) > DRAG_THRESHOLD; rightDown = null;
      if (!moved && Date.now() >= squelchUntil) cb.settings(b); });
    tile.addEventListener('click', () => { if (Date.now() < squelchUntil) return; if (b.id === active) cb.settings(b); else cb.pick(b); });
    tile.addEventListener('contextmenu', (e) => e.preventDefault());
    attachReorder(tile, { dropSel: '#brush-list', itemSel: '.btile', save: persist, squelch });
    host.appendChild(tile);
  }
}
