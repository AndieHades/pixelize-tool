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
import { toggleLock, toggleAlphaLock, toggleReference } from './ops.js';
import { appendEffects } from './fx-rows.js';
import { syncLayerActionButtons } from './actions-bar.js';

const INDENT = 16; // отступ на уровень вложенности

export const EYE = '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/><path class="slash" d="M4 4l16 16"/></svg>'; // глаз = видимость
const CLIP_IC = '<svg viewBox="0 0 24 24"><path d="M16 5h-4.5A2.5 2.5 0 0 0 9 7.5V15"/><path d="M5.5 11.5l3.5 4 3.5-4"/></svg>'; // обтравка: стрелка вниз на слой ниже
const LOCK_IC = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const ALPHA_IC = '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="2"/><path d="M12 4.5v15M4.5 12h15"/></svg>';
const REF_IC = '<svg viewBox="0 0 24 24"><path d="M6 4.5h12v15l-6-3.5-6 3.5z"/><path d="M9 8.5h6M9 12h4"/></svg>';
const SYM_IC = '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="2.5 2.5"/><path d="M8.5 8.5L5 12l3.5 3.5M15.5 8.5L19 12l-3.5 3.5"/><path class="slash" d="M4 4l16 16"/></svg>';
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

// глаз видимости: переключает мягко (без ре-рендера списка) и НЕ выбирает слой
function wireVis(vis, obj) {
  vis.addEventListener('pointerdown', (e) => e.stopPropagation());
  vis.addEventListener('click', (e) => { e.stopPropagation(); snapshot(); obj.visible = !obj.visible; vis.classList.toggle('off', !obj.visible); bus.emit('render'); });
}

function folderRow(f, depth) {
  const isSel = S.markedFolders.has(f.id);
  const fr = document.createElement('div'); fr.dataset.fid = f.id; fr.style.marginLeft = depth * INDENT + 'px';
  fr.className = 'lrow frow' + (f.open ? ' open' : '') + (f.id === S.selFolder && !S.fxCur ? ' on' : isSel ? ' marked' : '');
  const car = document.createElement('button'); car.className = 'caret' + (f.open ? ' open' : ''); car.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
  car.addEventListener('pointerdown', (e) => e.stopPropagation());
  car.addEventListener('click', (e) => { e.stopPropagation(); if (layDragSquelch) return;
    if (f.open && activeInside(f)) { S.selFolder = f.id; S.markedFolders = new Set([f.id]); S.marked.clear(); S.fxSel.clear(); S.fxCur = null; }
    f.open = !f.open; layList(); });
  const nm = nameSpan(f.name);
  const vis = document.createElement('button'); vis.className = 'eye' + (f.visible ? '' : ' off'); vis.innerHTML = EYE; wireVis(vis, f);
  fr.append(car, nm);
  if (S.sym || S.symH) { const sy = document.createElement('button'); sy.className = 'eye lsym' + (f.symLock ? ' off' : ''); sy.innerHTML = SYM_IC;
    sy.addEventListener('pointerdown', (e) => e.stopPropagation());
    sy.addEventListener('click', (ev) => { ev.stopPropagation(); snapshot(); f.symLock = !f.symLock; sy.classList.toggle('off', f.symLock); bus.emit('render'); }); fr.append(sy); }
  fr.append(vis);
  fr.addEventListener('click', (ev) => { if (layDragSquelch) return; const now = performance.now(), key = 'f' + f.id;
    if (lastClick.idx === key && now - lastClick.t < 350) { lastClick.idx = -1; startInlineRename(nm, f); return; }
    lastClick = { idx: key, t: now };
    if (ev.ctrlKey || ev.metaKey) { if (S.markedFolders.has(f.id)) { S.markedFolders.delete(f.id); if (S.selFolder === f.id) S.selFolder = S.markedFolders.size ? [...S.markedFolders][0] : null; }
      else S.markedFolders.add(f.id); layList(); return; } // ctrl-добавление не делает папку активной — primary не меняется
    S.selFolder = f.id; S.markedFolders = new Set([f.id]); S.marked.clear(); S.fxSel.clear(); S.fxCur = null; layList(); }); // обычный клик — только эта папка активна
  longPress(fr, (x, y) => openLctx(x, y, 'folder', f)); dragRow(fr, { kind: 'folder', fid: f.id }); return fr;
}

function activeInside(f) {
  const cur = S.layers[S.cur], layerIn = cur && folderChain(cur.fid).some((x) => x.id === f.id);
  const folderIn = S.selFolder != null && folderChain(S.selFolder).some((x) => x.id === f.id);
  return layerIn || folderIn;
}

function selectLayerRange(i) {
  const a = Math.min(S.cur, i), b = Math.max(S.cur, i);
  S.marked = new Set(); for (let k = a; k <= b; k++) if (k !== S.cur && S.layers[k]) S.marked.add(k);
  S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null; layList();
}

function layerRow(L, i, depth) {
  // активный слой ярко-синий, только если не выбрана папка и не выделен эффект
  // (тогда ярко-синий — у строки эффекта); двух активных строк быть не может
  const isCurPrim = i === S.cur && !S.selFolder && !S.fxCur;
  const row = document.createElement('div'); row.className = 'lrow' + (isCurPrim ? ' on' : S.marked.has(i) ? ' marked' : '') + (L.clip ? ' clip' : '');
  row.dataset.li = i; row.style.marginLeft = depth * INDENT + 'px';
  const nm = nameSpan(L.name);
  const vis = document.createElement('button'); vis.className = 'eye' + (L.visible ? '' : ' off'); vis.innerHTML = EYE; wireVis(vis, L); // глаз = видимость
  if (L.clip) { const ar = document.createElement('i'); ar.className = 'clip-arrow'; ar.innerHTML = CLIP_IC; row.append(ar); } // обтравка: стрелка вниз + сдвиг строки
  row.append(thumbFor(i), nm);
  if (S.sym || S.symH) { const sy = document.createElement('button'); sy.className = 'eye lsym' + (L.symLock ? ' off' : ''); sy.innerHTML = SYM_IC; // симметрия на слое (можно выключить)
    sy.addEventListener('pointerdown', (e) => e.stopPropagation());
    sy.addEventListener('click', (ev) => { ev.stopPropagation(); snapshot(); L.symLock = !L.symLock; sy.classList.toggle('off', L.symLock); bus.emit('render'); }); row.append(sy); }
  if (L.reference) { const rf = document.createElement('button'); rf.className = 'eye lref'; rf.innerHTML = REF_IC;
    rf.addEventListener('pointerdown', (e) => e.stopPropagation());
    rf.addEventListener('click', (ev) => { ev.stopPropagation(); toggleReference(L); }); row.append(rf); }
  if (L.lock || L.alphaLock) { const fl = document.createElement('button'); fl.className = 'eye'; fl.innerHTML = L.lock ? LOCK_IC : ALPHA_IC; // замок/альфа — клик снимает
    fl.addEventListener('pointerdown', (e) => e.stopPropagation());
    fl.addEventListener('click', (ev) => { ev.stopPropagation(); if (L.lock) toggleLock(L); else toggleAlphaLock(L); }); row.append(fl); }
  row.append(vis);
  row.addEventListener('click', (ev) => { if (layDragSquelch) return;
    if (ev.ctrlKey || ev.metaKey) { selectLayerRange(i); return; } // ctrl/cmd-клик — диапазон от активного слоя до кликнутого
    const now = performance.now();
    if (lastClick.idx === i && now - lastClick.t < 350) { lastClick.idx = -1; startInlineRename(nm, L); return; } // двойной клик — переименование
    lastClick = { idx: i, t: now }; S.cur = i; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null; layList(); }); // клик без Ctrl — сбросить общее выделение, выбрать только этот слой
  longPress(row, (x, y) => { if (S.cur !== i) S.cur = i; S.markedFolders.clear(); S.selFolder = null; layList(); openLctx(x, y, 'layer', L); });
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
      if (!hidden) { box.appendChild(folderRow(f, d)); appendEffects(box, f, d + 1); } stack.push(f); if (!f.open) hidden = true; }
    if (hidden) continue;
    box.appendChild(layerRow(L, i, chain.length)); appendEffects(box, L, chain.length + 1);
  }
  const cur = S.layers[S.cur], op = $('lay-op'); if (op) { const v = Math.round(cur.opacity * 100); op.value = v; $('lay-opv').textContent = v + '%'; }
  syncLayerActionButtons();
}
