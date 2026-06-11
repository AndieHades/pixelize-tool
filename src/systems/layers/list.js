// Отрисовка списка слоёв и папок: миниатюры, видимость, замок симметрии,
// мультивыбор, инлайн-переименование. Перетаскивание — drag.js, меню — menu.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { $ } from '../../core/dom.js';
import { snapshot } from '../../core/history.js';
import { layerFolder, layerSymLocked } from '../../core/layers.js';
import { layerCanvas } from '../../core/layer-cache.js';
import { dragRow } from './drag.js';
import { openLctx } from './menu.js';

const EYE = '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/><path class="slash" d="M4 4l16 16"/></svg>';
const SYMLOCK = '<svg viewBox="0 0 24 24"><path d="M12 5v14" stroke-dasharray="2.5 2.5"/><path d="M8.5 8.5L5 12l3.5 3.5"/><path d="M15.5 8.5L19 12l-3.5 3.5"/><path class="slash" d="M4 4l16 16"/></svg>';
let lastClick = { idx: -1, t: 0 };
export let layDragSquelch = false;
export const setSquelch = (v) => { layDragSquelch = v; };

export function longPress(el, fn) {
  let t = null, x0 = 0, y0 = 0;
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); fn(e.clientX, e.clientY); });
  el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; x0 = e.clientX; y0 = e.clientY; clearTimeout(t); t = setTimeout(() => fn(x0, y0), 480); });
  el.addEventListener('pointermove', (e) => { if (t && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) { clearTimeout(t); t = null; } });
  const c = () => { clearTimeout(t); t = null; }; el.addEventListener('pointerup', c); el.addEventListener('pointercancel', c);
}

function thumbFor(i) { const th = document.createElement('canvas'); th.className = 'lth'; th.width = 40; th.height = 40;
  const tx = th.getContext('2d'); tx.imageSmoothingEnabled = false; tx.fillStyle = '#26262c'; tx.fillRect(0, 0, 40, 40); tx.fillStyle = '#1d1d23';
  for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) if ((xx + yy) & 1) tx.fillRect(xx * 8, yy * 8, 8, 8);
  const k = Math.min(40 / S.W, 40 / S.H), w2 = Math.max(1, Math.round(S.W * k)), h2 = Math.max(1, Math.round(S.H * k));
  tx.drawImage(layerCanvas(i), (40 - w2) / 2, (40 - h2) / 2, w2, h2); return th; }

export function startInlineRename(span, ref) { if (!span) return;
  span.contentEditable = 'true'; span.classList.add('editing'); span.textContent = ref.name; span.focus();
  const r = document.createRange(); r.selectNodeContents(span); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  let done = false;
  const finish = (save) => { if (done) return; done = true; span.contentEditable = 'false'; span.classList.remove('editing');
    span.removeEventListener('blur', onBlur); span.removeEventListener('keydown', onKey);
    const v = span.textContent.trim().slice(0, 24); if (save && v && v !== ref.name) { snapshot(); ref.name = v; } layList(); };
  const onBlur = () => finish(true);
  const onKey = (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); span.blur(); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); } };
  span.addEventListener('blur', onBlur); span.addEventListener('keydown', onKey); }

function nameSpan(text) { const nm = document.createElement('span'); nm.className = 'lname'; nm.textContent = text;
  nm.addEventListener('pointerdown', (e) => { if (nm.isContentEditable) e.stopPropagation(); });
  nm.addEventListener('click', (e) => { if (nm.isContentEditable) e.stopPropagation(); }); return nm; }

export function layList() {
  S.folders = S.folders.filter((f) => S.layers.some((L) => L.fid === f.id));
  const box = $('lay-list'); if (!box) return; box.innerHTML = ''; const doneF = new Set();
  for (let i = S.layers.length - 1; i >= 0; i--) { const L = S.layers[i];
    const f = L.fid != null ? S.folders.find((x) => x.id === L.fid) : null;
    if (f && !doneF.has(f.id)) { doneF.add(f.id);
      const fr = document.createElement('div'); fr.className = 'lrow frow'; fr.dataset.fid = f.id;
      const car = document.createElement('button'); car.className = 'caret' + (f.open ? ' open' : ''); car.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
      const nm = nameSpan(f.name);
      const eye = document.createElement('button'); eye.className = 'eye' + (f.visible ? '' : ' off'); eye.innerHTML = EYE;
      eye.addEventListener('click', (ev) => { ev.stopPropagation(); snapshot(); f.visible = !f.visible; layList(); bus.emit('render'); });
      fr.append(car, nm, eye);
      fr.addEventListener('click', ((fld, sp) => () => { if (layDragSquelch) return; const now = performance.now(), key = 'f' + fld.id;
        if (lastClick.idx === key && now - lastClick.t < 350) { lastClick.idx = -1; startInlineRename(sp, fld); return; }
        lastClick = { idx: key, t: now }; fld.open = !fld.open; layList(); })(f, nm));
      longPress(fr, (x, y) => openLctx(x, y, 'folder', f)); dragRow(fr, { kind: 'folder', fid: f.id }); box.appendChild(fr); }
    if (f && !f.open) continue;
    const row = document.createElement('div'); row.className = 'lrow' + (i === S.cur ? ' on' : '') + (f ? ' inf' : ''); row.dataset.li = i;
    const chk = document.createElement('button'); chk.className = 'lchk' + (S.marked.has(i) ? ' on' : '');
    chk.addEventListener('click', ((idx) => (ev) => { ev.stopPropagation(); if (S.marked.has(idx)) S.marked.delete(idx); else S.marked.add(idx); layList(); })(i));
    const nm = nameSpan((L.clip ? '⤵ ' : '') + L.name);
    const eye = document.createElement('button'); eye.className = 'eye' + (L.visible ? '' : ' off'); eye.innerHTML = EYE;
    eye.addEventListener('click', (ev) => { ev.stopPropagation(); snapshot(); L.visible = !L.visible; layList(); bus.emit('render'); });
    row.append(chk, thumbFor(i), nm, eye);
    row.addEventListener('click', ((idx, lay, sp) => (ev) => { if (layDragSquelch) return;
      if (ev.ctrlKey || ev.metaKey) { if (S.marked.has(idx)) S.marked.delete(idx); else S.marked.add(idx); layList(); return; }
      const now = performance.now();
      if (lastClick.idx === idx && now - lastClick.t < 350) { lastClick.idx = -1; startInlineRename(sp, lay); return; }
      lastClick = { idx, t: now }; S.cur = idx; layList(); })(i, L, nm));
    longPress(row, (x, y) => openLctx(x, y, 'layer', L)); dragRow(row, { kind: 'layer', idx: i }); box.appendChild(row);
  }
  const op = $('lay-op'), v = Math.round(S.layers[S.cur].opacity * 100); if (op) { op.value = v; $('lay-opv').textContent = v + '%'; }
}
