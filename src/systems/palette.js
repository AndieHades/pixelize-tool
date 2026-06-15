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
let swHold = null, swX = 0, swY = 0, palDrag = null, palSquelch = false, ctxIdx = -1, showUsed = false;

export const refreshActive = () => { $('active').style.background = rgb(S.active); };
const colorKey = (c) => c ? c[0] + ',' + c[1] + ',' + c[2] : '';
const inShadeRamp = (c) => S.shading && S.shading.colors && S.shading.colors.some((x) => eqc(x, c));

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

function openCtx(x, y, idx) { ctxIdx = idx; showMenuAt($('ctx'), x, y, true); }

export function buildPalette() {
  const box = $('pal'); box.innerHTML = '';
  $('palgrip-label').textContent = t('label.paletteN', { n: S.palette.length });
  const used = showUsed ? usedColorKeys() : null;
  let activeShown = false;
  S.palette.forEach((c, idx) => {
    const b = document.createElement('button'); b.className = 'sw'; b.style.background = rgb(c); b.dataset.i = idx;
    b.title = rgbToHex(c).toUpperCase();
    if (!activeShown && eqc(c, S.active)) { b.classList.add('on'); activeShown = true; }
    if (inShadeRamp(c)) b.classList.add('shade-sel');
    if (used && used.has(colorKey(c))) b.classList.add('used');
    b.addEventListener('click', (e) => { clearTimeout(swHold);
      if (palSquelch) { palSquelch = false; return; }
      if (e.detail > 1) { setActiveColor(c); return; }
      if (setOpenPanelColor(c)) return;
      if (S.replaceMode) { const from = S.replaceMode.from; S.replaceMode = null; actions.run('recolor.all', from, c.slice()); return; }
      setActiveColor(c); });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') { swX = e.clientX; swY = e.clientY; clearTimeout(swHold); swHold = setTimeout(() => openCtx(swX, swY, idx), LONG_PRESS_MS);
        palDrag = { b, idx, touch: true, x: e.clientX, y: e.clientY, moved: false }; }
      else if (e.button === 0) palDrag = { b, idx, x: e.clientX, y: e.clientY, moved: false };
      else if (e.button === 2) { e.preventDefault(); palDrag = { b, idx, rmb: true, x: e.clientX, y: e.clientY, moved: false }; } });
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
  const a = palDrag.idx, lo = Math.min(a, toIdx), hi = Math.max(a, toIdx);
  for (const sw of $('pal').querySelectorAll('.sw:not(.plus)')) {
    const i = +sw.dataset.i; sw.classList.toggle('shade-pending', i >= lo && i <= hi);
  }
  const colors = S.palette.slice(lo, hi + 1).map((c) => c.slice(0, 3));
  palDrag.range = toIdx < a ? colors.reverse() : colors;
}
function clearShadePending() { $('pal').querySelectorAll('.shade-pending').forEach((sw) => sw.classList.remove('shade-pending')); }

function palDragMove(e) { if (!palDrag) return; const pal = $('pal'), chip = $('paldrag');
  if (!palDrag.moved) { if (Math.hypot(e.clientX - palDrag.x, e.clientY - palDrag.y) <= 6) return;
    palDrag.moved = true; clearTimeout(swHold); }
  const el = document.elementFromPoint(e.clientX, e.clientY), t = el && el.closest ? el.closest('#pal .sw:not(.plus)') : null;
  if (!palDrag.rmb && t && t !== palDrag.b) { palDrag.selecting = true; palDrag.b.classList.remove('dragging'); chip.classList.remove('on'); markShadeRange(+t.dataset.i); return; }
  if (palDrag.selecting) { if (t) markShadeRange(+t.dataset.i); return; }
  if (palDrag.rmb && t && t !== palDrag.b) { const r = t.getBoundingClientRect(); palDrag.reordering = true; chip.classList.remove('on');
    palDrag.b.classList.add('dragging'); pal.insertBefore(palDrag.b, (e.clientX < r.left + r.width / 2) ? t : t.nextSibling); return; }
  palDrag.b.classList.add('dragging');
  chip.style.background = palDrag.b.style.background; chip.classList.add('on');
  chip.style.left = e.clientX + 'px'; chip.style.top = e.clientY + 'px'; }

function palDragEnd(e) { if (!palDrag) return; clearTimeout(swHold);
  const d = palDrag; palDrag = null; d.b.classList.remove('dragging'); $('paldrag').classList.remove('on'); clearShadePending();
  if (d.selecting) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    if (d.range && d.range.length > 1) actions.run('shading.setRamp', d.range); return; }
  if (d.reordering) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    S.palette = [...$('pal').querySelectorAll('.sw:not(.plus)')].map((el) => S.palette[+el.dataset.i]); buildPalette(); return; }
  if (d.moved) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    const tgt = document.elementFromPoint(e.clientX, e.clientY), onPal = tgt && tgt.closest && tgt.closest('#pal');
    if (!onPal) { actions.run('edit.dropColorAt', S.palette[d.idx], e.clientX, e.clientY); buildPalette(); return; } // бросок мимо палитры → заливка холста
    buildPalette(); }
  else if (d.rmb) openCtx(e.clientX, e.clientY, d.idx); }

export function mount() {
  document.addEventListener('pointermove', palDragMove);
  document.addEventListener('pointerup', palDragEnd);
  document.addEventListener('pointercancel', palDragEnd);
  $('pal-used').addEventListener('click', () => { showUsed = !showUsed; $('pal-used').classList.toggle('on', showUsed); buildPalette(); });
  $('ctx').addEventListener('click', (e) => { const btn = e.target.closest('button'); if (!btn) return;
    const col = S.palette[ctxIdx]; $('ctx').classList.remove('on'); if (!col) return;
    const act = btn.dataset.act;
    if (act === 'copy') { const h = rgbToHex(col).toUpperCase(); copyText(h).then(() => toast(t('toast.copied', { s: h }))); }
    else if (act === 'delete') { S.palette.splice(ctxIdx, 1); buildPalette(); toast(t('toast.colorRemoved')); }
    else if (act === 'select') actions.run('selection.byColor', col);
    else if (act === 'replace') actions.run('color.replace', col); });
  bus.on('palette', () => { buildPalette(); refreshActive(); });
  bus.on('render', () => { if (showUsed) buildPalette(); });
  bus.on('locale', buildPalette);
  refreshActive(); buildPalette();
}
