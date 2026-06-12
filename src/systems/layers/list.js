// Отрисовка списка слоёв и папок: миниатюры, видимость (галочка), выделение
// цветом, инлайн-переименование. Свайпы — swipe.js, драг — drag.js, меню — menu.js.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { $ } from '../../core/dom.js';
import { snapshot } from '../../core/history.js';
import { layerCanvas } from '../../core/layer-cache.js';
import { folderChain } from '../../core/layers.js';
import { dragRow } from './drag.js';
import { openLctx } from './menu.js';
import { attachLayerSwipe } from './swipe.js';
import { toggleLock, toggleAlphaLock } from './ops.js';

const INDENT = 16; // отступ на уровень вложенности

const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'; // галочка = видимость
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

// галочка видимости: переключает мягко (без ре-рендера списка) и НЕ выбирает слой
function wireVis(vis, obj) {
  vis.addEventListener('pointerdown', (e) => e.stopPropagation());
  vis.addEventListener('click', (e) => { e.stopPropagation(); snapshot(); obj.visible = !obj.visible; vis.classList.toggle('on', obj.visible); bus.emit('render'); });
}

function folderRow(f, depth) {
  const fr = document.createElement('div'); fr.className = 'lrow frow'; fr.dataset.fid = f.id; fr.style.marginLeft = depth * INDENT + 'px';
  const car = document.createElement('button'); car.className = 'caret' + (f.open ? ' open' : ''); car.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
  const nm = nameSpan(f.name);
  const vis = document.createElement('button'); vis.className = 'lvis' + (f.visible ? ' on' : ''); vis.innerHTML = CHECK; wireVis(vis, f);
  fr.append(car, nm, vis);
  fr.addEventListener('click', () => { if (layDragSquelch) return; const now = performance.now(), key = 'f' + f.id;
    if (lastClick.idx === key && now - lastClick.t < 350) { lastClick.idx = -1; startInlineRename(nm, f); return; }
    lastClick = { idx: key, t: now }; f.open = !f.open; layList(); });
  longPress(fr, (x, y) => openLctx(x, y, 'folder', f)); dragRow(fr, { kind: 'folder', fid: f.id }); return fr;
}

function layerRow(L, i, depth) {
  const row = document.createElement('div'); row.className = 'lrow' + (i === S.cur ? ' on' : '') + (S.marked.has(i) ? ' marked' : '') + (L.clip ? ' clip' : '');
  row.dataset.li = i; row.style.marginLeft = depth * INDENT + 'px';
  const nm = nameSpan(L.name);
  const vis = document.createElement('button'); vis.className = 'lvis' + (L.visible ? ' on' : ''); vis.innerHTML = CHECK; wireVis(vis, L); // галочка = видимость
  if (L.clip) { const ar = document.createElement('i'); ar.className = 'clip-arrow'; row.append(ar); } // обтравка: стрелка + сдвиг строки
  row.append(thumbFor(i), nm);
  if (L.lock || L.alphaLock) { const fl = document.createElement('span'); fl.className = 'lflag'; fl.dataset.k = L.lock ? 'lk' : 'al'; // клик по замку — снять
    fl.addEventListener('click', (ev) => { ev.stopPropagation(); if (L.lock) toggleLock(L); else toggleAlphaLock(L); }); row.append(fl); }
  row.append(vis);
  row.addEventListener('click', (ev) => { if (layDragSquelch) return;
    if (ev.ctrlKey || ev.metaKey) { if (S.marked.has(i)) S.marked.delete(i); else S.marked.add(i); layList(); return; } // ctrl/cmd-клик — мультивыбор
    const now = performance.now();
    if (lastClick.idx === i && now - lastClick.t < 350) { lastClick.idx = -1; startInlineRename(nm, L); return; } // двойной клик — переименование
    lastClick = { idx: i, t: now }; S.cur = i; layList(); }); // клик — только сделать активным
  longPress(row, (x, y) => { if (S.cur !== i) { S.cur = i; layList(); } openLctx(x, y, 'layer', L); }); // ПКМ/долгий тап: активный + меню
  attachLayerSwipe(row, L); dragRow(row, { kind: 'layer', idx: i }); return row;
}

export function layList() {
  const used = new Set(); for (const L of S.layers) for (const f of folderChain(L.fid)) used.add(f.id); // убрать пустые папки (по всему поддереву)
  S.folders = S.folders.filter((f) => used.has(f.id));
  const box = $('lay-list'); if (!box) return; box.innerHTML = '';
  const stack = []; // папки-предки сверху вниз (учтённые в текущем месте обхода)
  for (let i = S.layers.length - 1; i >= 0; i--) { const L = S.layers[i];
    const chain = folderChain(L.fid).reverse(); // от корня к ближайшей папке
    let common = 0; while (common < stack.length && common < chain.length && stack[common].id === chain[common].id) common++;
    stack.length = common; let hidden = stack.some((f) => !f.open);
    for (let d = common; d < chain.length; d++) { const f = chain[d];
      if (!hidden) box.appendChild(folderRow(f, d)); stack.push(f); if (!f.open) hidden = true; }
    if (hidden) continue;
    box.appendChild(layerRow(L, i, chain.length));
  }
  const cur = S.layers[S.cur], op = $('lay-op'); if (op) { const v = Math.round(cur.opacity * 100); op.value = v; $('lay-opv').textContent = v + '%'; }
  if ($('lay-alpha')) { $('lay-alpha').classList.toggle('on', !!cur.alphaLock); $('lay-clip').classList.toggle('on', !!cur.clip); }
}
