// Интерактивная половина палитры: модель выделения свотчей, перетаскивание/
// перестановка, подбор shade-рампы и контекст-меню. Рендер свотчей — в
// palette.js; обратная связь идёт через колбэки rebuild()/setActive(),
// заданные initPaletteSelect (без кольцевых импортов).
import { S } from '../core/state.js';
import * as actions from '../core/actions.js';
import { $, toast, t, copyText, showMenuAt } from '../core/dom.js';
import { rgbToHex, eqc } from '../logic/color.js';
import { LONG_PRESS_MS } from '../config/timings.js';
import { dropZone, makeDropGap } from '../core/drop-gap.js';

const PANEL_TARGETS = []; // нативных панелей с input[type=color] больше нет — цвет везде через наш #colpop
let swHold = null, swX = 0, swY = 0, palDrag = null, palSquelch = false, ctxIdx = -1, ctxIdxs = [];
let palSel = new Set(), palAnchorIdx = -1, palRef = S.palette;
let rebuild = () => {}, setActive = () => {};

// согласовать выделение с текущей S.palette (другой массив → сброс; чистка
// устаревших индексов). Вызывается рендером перед отрисовкой свотчей.
export const validSel = () => { if (S.palette !== palRef) { palRef = S.palette; palSel = new Set(); palAnchorIdx = -1; }
  palSel = new Set([...palSel].filter((i) => i >= 0 && i < S.palette.length));
  if (!palSel.has(palAnchorIdx)) palAnchorIdx = palSel.size ? Math.min(...palSel) : -1; };

function setOpenPanelColor(c) {
  const target = PANEL_TARGETS.find((p) => $(p.pop).classList.contains('on'));
  if (!target) return false;
  const v = rgbToHex(c); $(target.input).value = v; $(target.sw).style.background = v;
  $(target.input).dispatchEvent(new Event('input', { bubbles: true })); return true;
}

function selectionForIdx(idx) { validSel(); return palSel.has(idx) && palSel.size ? [...palSel] : [idx]; }
function openCtx(x, y, idx) { ctxIdx = idx; ctxIdxs = selectionForIdx(idx); showMenuAt($('ctx'), x, y, true); }

function rangeIdx(from, to, max = Infinity) {
  const out = [], step = to >= from ? 1 : -1;
  for (let i = from; i >= 0 && i < S.palette.length && out.length < max; i += step) { out.push(i); if (i === to) break; }
  return out;
}
const colorsFromIdx = (idxs) => idxs.map((i) => S.palette[i].slice(0, 3));
function setPaletteSelection(idxs, anchor = idxs[0]) { palSel = new Set(idxs); palAnchorIdx = anchor ?? -1; rebuild(); }
function setShadingFromSelection(idxs) { const cols = colorsFromIdx(idxs); palSel = new Set(); palAnchorIdx = -1; actions.run('shading.setRamp', cols); }
function markMoving(idxs, on) { const set = new Set(idxs);
  for (const sw of $('pal').querySelectorAll('.sw:not(.plus)')) sw.classList.toggle('dragging', on && set.has(+sw.dataset.i)); }
function ctrlPaletteSelect(idx) {
  if (palAnchorIdx < 0 || !palSel.size) setPaletteSelection([idx], idx);
  else setPaletteSelection(rangeIdx(palAnchorIdx, idx), palAnchorIdx);
  if (S.shading && S.shading.picking && palSel.size > 1) setShadingFromSelection([...palSel]);
}
export function clearPaletteSelection() { if (!palSel.size) return; palSel = new Set(); palAnchorIdx = -1; rebuild(); }
actions.register('palette.clearSelection', clearPaletteSelection);

function markShadeRange(toIdx) {
  if (!palDrag) return;
  const idxs = rangeIdx(palDrag.idx, toIdx), picked = new Set(idxs);
  for (const sw of $('pal').querySelectorAll('.sw:not(.plus)')) { const i = +sw.dataset.i; sw.classList.toggle('shade-pending', picked.has(i)); }
  palDrag.idxs = idxs;
}
function clearShadePending() { $('pal').querySelectorAll('.shade-pending').forEach((sw) => sw.classList.remove('shade-pending')); }

function reorderIdxs(idxs, targetIdx, after) {
  const moving = [...idxs].sort((a, b) => a - b);
  if (!moving.length || moving.includes(targetIdx)) return false;
  const moveSet = new Set(moving), movingColors = moving.map((i) => S.palette[i]);
  const rest = S.palette.filter((_, i) => !moveSet.has(i));
  const insertRaw = targetIdx + (after ? 1 : 0);
  const insertAt = Math.max(0, Math.min(rest.length, insertRaw - moving.filter((i) => i < insertRaw).length));
  S.palette = [...rest.slice(0, insertAt), ...movingColors, ...rest.slice(insertAt)];
  palRef = S.palette; palSel = new Set(movingColors.map((_, i) => insertAt + i)); palAnchorIdx = insertAt;
  return true;
}

function deleteIdxs(idxs) {
  const del = new Set(idxs);
  if (!del.size) return;
  const removed = S.palette.filter((_, i) => del.has(i));
  S.palette = S.palette.filter((_, i) => !del.has(i));
  palRef = S.palette; palSel = new Set(); palAnchorIdx = -1;
  if (S.shading && S.shading.colors && S.shading.colors.some((c) => removed.some((r) => eqc(c, r)))) actions.run('shading.clear');
  else rebuild();
  toast(t('toast.colorRemoved'));
}

// навесить интеракцию на свотч: выбор/перекраска по клику, перетаскивание/
// длинный тап на pointerdown; класс выделения тоже ставим здесь
export function wireSwatch(b, c, idx) {
  if (palSel.has(idx)) b.classList.add('pal-sel');
  b.addEventListener('click', (e) => { clearTimeout(swHold);
    if (palSquelch) { palSquelch = false; return; }
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); ctrlPaletteSelect(idx); return; }
    if (e.detail > 1) { setActive(c); return; }
    if (setOpenPanelColor(c)) return;
    if (S.replaceMode) { const from = S.replaceMode.from; S.replaceMode = null; actions.run('recolor.all', from, c.slice()); return; }
    clearPaletteSelection();
    setActive(c); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  b.addEventListener('pointerdown', (e) => {
    const movingSelection = palSel.has(idx) && palSel.size && !e.ctrlKey && !e.metaKey;
    const moveIdxs = movingSelection ? [...palSel] : [idx], gap = makeDropGap({ className: 'palette-drop-gap', enabled: false });
    if (e.pointerType === 'touch') { swX = e.clientX; swY = e.clientY; clearTimeout(swHold); swHold = setTimeout(() => openCtx(swX, swY, idx), LONG_PRESS_MS);
      palDrag = { b, idx, touch: true, x: e.clientX, y: e.clientY, moved: false, moveSel: movingSelection, moveIdxs, gap }; }
    else if (e.button === 0) palDrag = { b, idx, x: e.clientX, y: e.clientY, moved: false, moveSel: movingSelection, moveIdxs, gap };
    else if (e.button === 2) { e.preventDefault(); palDrag = { b, idx, rmb: true, x: e.clientX, y: e.clientY, moved: false, moveSel: movingSelection, moveIdxs, gap }; } });
}

function palDragMove(e) { if (!palDrag) return; const pal = $('pal'), chip = $('paldrag');
  if (!palDrag.moved) { if (Math.hypot(e.clientX - palDrag.x, e.clientY - palDrag.y) <= 6) return;
    palDrag.moved = true; clearTimeout(swHold); }
  const el = document.elementFromPoint(e.clientX, e.clientY), tg = el && el.closest ? el.closest('#pal .sw:not(.plus)') : null;
  if (palDrag.moveSel) { markMoving(palDrag.moveIdxs, true); chip.classList.add('on'); if (palDrag.moveIdxs.length > 1) chip.dataset.stack = palDrag.moveIdxs.length > 2 ? '3' : '2';
    chip.style.background = palDrag.b.style.background; chip.style.left = e.clientX + 'px'; chip.style.top = e.clientY + 'px';
    if (tg) palDrag.gap.show(pal, tg, dropZone(tg, e.clientX, e.clientY, 'x', 0).after, tg); return; }
  if (!palDrag.rmb && tg && tg !== palDrag.b) { palDrag.selecting = true; palDrag.b.classList.remove('dragging'); chip.classList.remove('on'); markShadeRange(+tg.dataset.i); return; }
  if (palDrag.selecting) { if (tg) markShadeRange(+tg.dataset.i); return; }
  if (palDrag.rmb && tg && tg !== palDrag.b) { palDrag.reordering = true; chip.classList.remove('on');
    palDrag.b.classList.add('dragging'); palDrag.gap.show(pal, tg, dropZone(tg, e.clientX, e.clientY, 'x', 0).after, tg); return; }
  palDrag.b.classList.add('dragging');
  chip.style.background = palDrag.b.style.background; chip.classList.add('on');
  chip.style.left = e.clientX + 'px'; chip.style.top = e.clientY + 'px'; }

function palDragEnd(e) { if (!palDrag) return; clearTimeout(swHold);
  const d = palDrag, chip = $('paldrag'); palDrag = null; markMoving(d.moveIdxs || [d.idx], false);
  d.b.classList.remove('dragging'); chip.classList.remove('on'); delete chip.dataset.stack; clearShadePending();
  const tgt = e ? document.elementFromPoint(e.clientX, e.clientY) : null;
  const targetSw = d.gap?.target || (tgt && tgt.closest ? tgt.closest('#pal .sw:not(.plus)') : null), gapAfter = !!d.gap?.after, gapActive = !!d.gap?.active;
  d.gap?.remove();
  if (d.moveSel && !d.moved) { if (d.rmb) openCtx(e.clientX, e.clientY, d.idx); return; }
  if (d.moveSel) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    if (targetSw) { const r = targetSw.getBoundingClientRect();
      if (reorderIdxs(d.moveIdxs, +targetSw.dataset.i, gapActive ? gapAfter : e.clientX >= r.left + r.width / 2)) rebuild(); }
    return; }
  if (d.selecting) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    if (d.idxs && d.idxs.length > 1) {
      if (S.shading && S.shading.picking) setShadingFromSelection(d.idxs);
      else setPaletteSelection(d.idxs, d.idx);
    } return; }
  if (d.reordering) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    if (targetSw) reorderIdxs(d.moveIdxs, +targetSw.dataset.i, gapAfter); rebuild(); return; }
  if (d.moved) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    const onPal = tgt && tgt.closest && tgt.closest('#pal');
    if (!onPal) { if (!actions.run('layer.dropColorAt', S.palette[d.idx], e.clientX, e.clientY)) actions.run('edit.dropColorAt', S.palette[d.idx], e.clientX, e.clientY); rebuild(); return; } // бросок мимо палитры → слой/заливка холста
    rebuild(); }
  else if (d.rmb) openCtx(e.clientX, e.clientY, d.idx); }

// document-слушатели жеста + обработчик контекст-меню; колбэки связывают с рендером
export function initPaletteSelect({ rebuild: rb, setActive: sa }) {
  rebuild = rb; setActive = sa;
  document.addEventListener('pointermove', palDragMove);
  document.addEventListener('pointerup', palDragEnd);
  document.addEventListener('pointercancel', palDragEnd);
  $('ctx').addEventListener('click', (e) => { const btn = e.target.closest('button'); if (!btn) return;
    validSel();
    const ids = (ctxIdxs.length ? ctxIdxs : [ctxIdx]).filter((i) => i >= 0 && i < S.palette.length);
    const cols = colorsFromIdx(ids);
    const col = cols[0]; $('ctx').classList.remove('on'); if (!col) return;
    const act = btn.dataset.act;
    if (act === 'copy') { const h = cols.map((c) => rgbToHex(c).toUpperCase()).join('\n'); copyText(h).then(() => toast(t('toast.copied', { s: h }))); }
    else if (act === 'shade') { palSel = new Set(); palAnchorIdx = -1; actions.run('shading.setRamp', cols); }
    else if (act === 'delete') deleteIdxs(ids);
    else if (act === 'select') actions.run('selection.byColor', cols);
    else if (act === 'replace') actions.run('color.replace', cols); });
}
