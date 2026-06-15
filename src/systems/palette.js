// Палитра: отрисовка свотчей, выбор активного цвета, добавление,
// перетаскивание-перестановка и контекст-меню. Перекраска/выбор по цвету —
// через actions (палитра не импортирует другие системы).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast, t, copyText, showMenuAt } from '../core/dom.js';
import { rgb, rgbToHex, hexToRgb, eqc } from '../logic/color.js';
import { sortPalette } from '../logic/palette-sort.js';
import { setTool } from '../core/tools.js';
import { LONG_PRESS_MS } from '../config/timings.js';
import { effVis } from '../core/layers.js';

const PANEL_TARGETS = []; // нативных панелей с input[type=color] больше нет — цвет везде через наш #colpop
let swHold = null, swX = 0, swY = 0, palDrag = null, palSquelch = false, ctxIdx = -1, ctxIdxs = [], showUsed = false;
let palSel = new Set(), palAnchorIdx = -1, palRef = S.palette;

export const refreshActive = () => { $('active').style.background = rgb(S.active); };
const colorKey = (c) => c ? c[0] + ',' + c[1] + ',' + c[2] : '';
const inShadeRamp = (c) => S.shading && S.shading.colors && S.shading.colors.some((x) => eqc(x, c));
const validSel = () => { if (S.palette !== palRef) { palRef = S.palette; palSel = new Set(); palAnchorIdx = -1; }
  palSel = new Set([...palSel].filter((i) => i >= 0 && i < S.palette.length));
  if (!palSel.has(palAnchorIdx)) palAnchorIdx = palSel.size ? Math.min(...palSel) : -1; };

function usedColorKeys() { const keys = new Set();
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i]; if (!L || !effVis(i) || L.opacity <= 0) continue;
    for (const row of L.grid) for (const c of row) if (c && c[3] > 0) keys.add(colorKey(c));
    for (const c of (L.ext || new Map()).values()) if (c && c[3] > 0) keys.add(colorKey(c)); }
  return keys;
}

function setOpenPanelColor(c) {
  const target = PANEL_TARGETS.find((t) => $(t.pop).classList.contains('on'));
  if (!target) return false;
  const v = rgbToHex(c); $(target.input).value = v; $(target.sw).style.background = v;
  $(target.input).dispatchEvent(new Event('input', { bubbles: true })); return true;
}

function addRgbColor(c, notify = false) {
  if (!c) return false;
  if (S.palette.some((p) => eqc(p, c))) { if (notify) toast(t('toast.colorExists')); return false; }
  S.palette.push(c.slice(0, 3)); bus.emit('palette');
  if (notify) toast(t('toast.colorAdded'));
  return true;
}

export function setActiveColor(c, pickTool = true) {
  S.active = c.slice(); refreshActive();
  bus.emit('color-sync'); buildPalette();
  if (pickTool) setTool('pencil');
}

export function addColor(hex) { const c = hexToRgb(hex); addRgbColor(c); setActiveColor(c); }

actions.register('palette.add', addColor);
actions.register('palette.addRgb', (c) => addRgbColor(c, true));
actions.register('color.setActive', (c) => setActiveColor(c, false)); // Active Color Manager: пипетка/источники ставят активный цвет, не меняя инструмент
// упорядочить палитру по тону и светлоте (кнопку добавим позже — пока через action)
actions.register('palette.sort', () => { S.palette = sortPalette(S.palette); bus.emit('palette'); });

function selectionForIdx(idx) {
  validSel();
  return palSel.has(idx) && palSel.size ? [...palSel] : [idx];
}

function openCtx(x, y, idx) {
  ctxIdx = idx; ctxIdxs = selectionForIdx(idx);
  showMenuAt($('ctx'), x, y, true);
}

function rangeIdx(from, to, max = Infinity) {
  const out = [], step = to >= from ? 1 : -1;
  for (let i = from; i >= 0 && i < S.palette.length && out.length < max; i += step) {
    out.push(i);
    if (i === to) break;
  }
  return out;
}
const colorsFromIdx = (idxs) => idxs.map((i) => S.palette[i].slice(0, 3));
function setPaletteSelection(idxs, anchor = idxs[0]) {
  palSel = new Set(idxs);
  palAnchorIdx = anchor ?? -1;
  buildPalette();
}
function ctrlPaletteSelect(idx) {
  if (palAnchorIdx < 0 || !palSel.size) setPaletteSelection([idx], idx);
  else setPaletteSelection(rangeIdx(palAnchorIdx, idx), palAnchorIdx);
}
function clearPaletteSelection() {
  if (!palSel.size) return;
  palSel = new Set(); palAnchorIdx = -1; buildPalette();
}

export function buildPalette() {
  validSel();
  const box = $('pal'); box.innerHTML = '';
  $('palgrip-label').textContent = t('label.paletteN', { n: S.palette.length });
  const used = showUsed ? usedColorKeys() : null;
  let activeShown = false;
  S.palette.forEach((c, idx) => {
    const b = document.createElement('button'); b.className = 'sw'; b.style.background = rgb(c); b.dataset.i = idx;
    b.title = rgbToHex(c).toUpperCase();
    if (!activeShown && eqc(c, S.active)) { b.classList.add('on'); activeShown = true; }
    if (inShadeRamp(c)) b.classList.add('shade-sel');
    if (palSel.has(idx)) b.classList.add('pal-sel');
    if (used && used.has(colorKey(c))) b.classList.add('used');
    b.addEventListener('click', (e) => { clearTimeout(swHold);
      if (palSquelch) { palSquelch = false; return; }
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); ctrlPaletteSelect(idx); return; }
      if (e.detail > 1) { setActiveColor(c); return; }
      if (setOpenPanelColor(c)) return;
      if (S.replaceMode) { const from = S.replaceMode.from; S.replaceMode = null; actions.run('recolor.all', from, c.slice()); return; }
      clearPaletteSelection();
      setActiveColor(c); });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('pointerdown', (e) => {
      const movingSelection = palSel.has(idx) && palSel.size && !e.ctrlKey && !e.metaKey;
      const moveIdxs = movingSelection ? [...palSel] : [idx];
      if (e.pointerType === 'touch') { swX = e.clientX; swY = e.clientY; clearTimeout(swHold); swHold = setTimeout(() => openCtx(swX, swY, idx), LONG_PRESS_MS);
        palDrag = { b, idx, touch: true, x: e.clientX, y: e.clientY, moved: false, moveSel: movingSelection, moveIdxs }; }
      else if (e.button === 0) palDrag = { b, idx, x: e.clientX, y: e.clientY, moved: false, moveSel: movingSelection, moveIdxs };
      else if (e.button === 2) { e.preventDefault(); palDrag = { b, idx, rmb: true, x: e.clientX, y: e.clientY, moved: false, moveSel: movingSelection, moveIdxs }; } });
    box.appendChild(b);
  });
  const add = document.createElement('button'); add.className = 'sw plus'; add.title = t('palette.addActiveTitle');
  add.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  add.addEventListener('click', () => { if (S.palette.some((p) => eqc(p, S.active))) { toast(t('toast.colorExists')); return; }
    S.palette.push(S.active.slice()); buildPalette(); toast(t('toast.colorAdded')); });
  add.addEventListener('contextmenu', (e) => { e.preventDefault(); actions.run('color.pick'); });
  box.appendChild(add);
}

function markShadeRange(toIdx) {
  if (!palDrag) return;
  const idxs = rangeIdx(palDrag.idx, toIdx), picked = new Set(idxs);
  for (const sw of $('pal').querySelectorAll('.sw:not(.plus)')) {
    const i = +sw.dataset.i; sw.classList.toggle('shade-pending', picked.has(i));
  }
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
  palRef = S.palette;
  palSel = new Set(movingColors.map((_, i) => insertAt + i));
  palAnchorIdx = insertAt;
  return true;
}

function deleteIdxs(idxs) {
  const del = new Set(idxs);
  if (!del.size) return;
  const removed = S.palette.filter((_, i) => del.has(i));
  S.palette = S.palette.filter((_, i) => !del.has(i));
  palRef = S.palette;
  palSel = new Set(); palAnchorIdx = -1;
  if (S.shading && S.shading.colors && S.shading.colors.some((c) => removed.some((r) => eqc(c, r)))) actions.run('shading.clear');
  else buildPalette();
  toast(t('toast.colorRemoved'));
}

function palDragMove(e) { if (!palDrag) return; const pal = $('pal'), chip = $('paldrag');
  if (!palDrag.moved) { if (Math.hypot(e.clientX - palDrag.x, e.clientY - palDrag.y) <= 6) return;
    palDrag.moved = true; clearTimeout(swHold); }
  const el = document.elementFromPoint(e.clientX, e.clientY), t = el && el.closest ? el.closest('#pal .sw:not(.plus)') : null;
  if (palDrag.moveSel) { chip.classList.add('on'); chip.style.background = palDrag.b.style.background; chip.style.left = e.clientX + 'px'; chip.style.top = e.clientY + 'px'; return; }
  if (!palDrag.rmb && t && t !== palDrag.b) { palDrag.selecting = true; palDrag.b.classList.remove('dragging'); chip.classList.remove('on'); markShadeRange(+t.dataset.i); return; }
  if (palDrag.selecting) { if (t) markShadeRange(+t.dataset.i); return; }
  if (palDrag.rmb && t && t !== palDrag.b) { const r = t.getBoundingClientRect(); palDrag.reordering = true; chip.classList.remove('on');
    palDrag.b.classList.add('dragging'); pal.insertBefore(palDrag.b, (e.clientX < r.left + r.width / 2) ? t : t.nextSibling); return; }
  palDrag.b.classList.add('dragging');
  chip.style.background = palDrag.b.style.background; chip.classList.add('on');
  chip.style.left = e.clientX + 'px'; chip.style.top = e.clientY + 'px'; }

function palDragEnd(e) { if (!palDrag) return; clearTimeout(swHold);
  const d = palDrag; palDrag = null; d.b.classList.remove('dragging'); $('paldrag').classList.remove('on'); clearShadePending();
  const tgt = e ? document.elementFromPoint(e.clientX, e.clientY) : null;
  const targetSw = tgt && tgt.closest ? tgt.closest('#pal .sw:not(.plus)') : null;
  if (d.moveSel && !d.moved) { if (d.rmb) openCtx(e.clientX, e.clientY, d.idx); return; }
  if (d.moveSel) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    if (targetSw) { const r = targetSw.getBoundingClientRect();
      if (reorderIdxs(d.moveIdxs, +targetSw.dataset.i, e.clientX >= r.left + r.width / 2)) buildPalette(); }
    return; }
  if (d.selecting) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    if (d.idxs && d.idxs.length > 1) setPaletteSelection(d.idxs, d.idx); return; }
  if (d.reordering) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    S.palette = [...$('pal').querySelectorAll('.sw:not(.plus)')].map((el) => S.palette[+el.dataset.i]); buildPalette(); return; }
  if (d.moved) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    const onPal = tgt && tgt.closest && tgt.closest('#pal');
    if (!onPal) { actions.run('edit.dropColorAt', S.palette[d.idx], e.clientX, e.clientY); buildPalette(); return; } // бросок мимо палитры → заливка холста
    buildPalette(); }
  else if (d.rmb) openCtx(e.clientX, e.clientY, d.idx); }

export function mount() {
  document.addEventListener('pointermove', palDragMove);
  document.addEventListener('pointerup', palDragEnd);
  document.addEventListener('pointercancel', palDragEnd);
  $('pal-used').addEventListener('click', () => { showUsed = !showUsed; $('pal-used').classList.toggle('on', showUsed); buildPalette(); });
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
  bus.on('palette', () => { buildPalette(); refreshActive(); });
  bus.on('render', () => { if (showUsed) buildPalette(); });
  bus.on('locale', buildPalette);
  refreshActive(); buildPalette();
}
