// Палитра: отрисовка свотчей, выбор активного цвета, добавление,
// перетаскивание-перестановка и контекст-меню. Перекраска/выбор по цвету —
// через actions (палитра не импортирует другие системы).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast, t, copyText, showMenuAt } from '../core/dom.js';
import { rgb, rgbToHex, hexToRgb, eqc } from '../logic/color.js';
import { setTool } from '../core/tools.js';
import { LONG_PRESS_MS } from '../config/timings.js';

const PANEL_TARGETS = [
  { pop: 'outpop', input: 'out-col', sw: 'out-colsw' },
  { pop: 'dspop', input: 'ds-col', sw: 'ds-colsw' },
  { pop: 'glowpop', input: 'glow-col', sw: 'glow-colsw' },
];
let swHold = null, swX = 0, swY = 0, palDrag = null, palSquelch = false, ctxIdx = -1, replFrom = null;

export const refreshActive = () => { $('active').style.background = rgb(S.active); };

function setOpenPanelColor(c) {
  const target = PANEL_TARGETS.find((t) => $(t.pop).classList.contains('on'));
  if (!target) return false;
  const v = rgbToHex(c); $(target.input).value = v; $(target.sw).style.background = v;
  $(target.input).dispatchEvent(new Event('input', { bubbles: true })); return true;
}

export function setActiveColor(c, pickTool = true) {
  S.active = c.slice(); $('picker').value = rgbToHex(S.active); refreshActive();
  bus.emit('color-sync'); buildPalette();
  if (pickTool) setTool('pencil');
}

export function addColor(hex) { const c = hexToRgb(hex); if (!S.palette.some((p) => eqc(p, c))) S.palette.push(c); setActiveColor(c); }

actions.register('palette.add', addColor);

function openCtx(x, y, idx) { ctxIdx = idx; showMenuAt($('ctx'), x, y, true); }

export function buildPalette() {
  const box = $('pal'); box.innerHTML = '';
  $('palgrip').textContent = 'Палитра · ' + S.palette.length;
  let activeShown = false;
  S.palette.forEach((c, idx) => {
    const b = document.createElement('button'); b.className = 'sw'; b.style.background = rgb(c); b.dataset.i = idx;
    b.title = rgbToHex(c).toUpperCase();
    if (!activeShown && eqc(c, S.active)) { b.classList.add('on'); activeShown = true; }
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
  const add = document.createElement('button'); add.className = 'sw plus'; add.title = 'Добавить активный цвет · долгий тап/ПКМ — выбрать новый';
  add.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  add.addEventListener('click', () => { if (S.palette.some((p) => eqc(p, S.active))) { toast(t('toast.colorExists')); return; }
    S.palette.push(S.active.slice()); buildPalette(); toast(t('toast.colorAdded')); });
  add.addEventListener('contextmenu', (e) => { e.preventDefault(); $('picker').click(); });
  box.appendChild(add);
}

function palDragMove(e) { if (!palDrag) return; const pal = $('pal'), chip = $('paldrag');
  if (!palDrag.moved) { if (Math.hypot(e.clientX - palDrag.x, e.clientY - palDrag.y) <= 6) return;
    palDrag.moved = true; palDrag.b.classList.add('dragging'); clearTimeout(swHold);
    chip.style.background = palDrag.b.style.background; chip.classList.add('on'); }
  chip.style.left = e.clientX + 'px'; chip.style.top = e.clientY + 'px';
  const el = document.elementFromPoint(e.clientX, e.clientY), t = el && el.closest ? el.closest('#pal .sw:not(.plus)') : null;
  if (t && t !== palDrag.b) { const r = t.getBoundingClientRect(); pal.insertBefore(palDrag.b, (e.clientX < r.left + r.width / 2) ? t : t.nextSibling); } }

function palDragEnd(e) { if (!palDrag) return; clearTimeout(swHold);
  const d = palDrag; palDrag = null; d.b.classList.remove('dragging'); $('paldrag').classList.remove('on');
  if (d.moved) { palSquelch = true; setTimeout(() => { palSquelch = false; }, 0);
    S.palette = [...$('pal').querySelectorAll('.sw:not(.plus)')].map((el) => S.palette[+el.dataset.i]); buildPalette(); }
  else if (d.rmb) openCtx(e.clientX, e.clientY, d.idx); }

export function mount() {
  document.addEventListener('pointermove', palDragMove);
  document.addEventListener('pointerup', palDragEnd);
  document.addEventListener('pointercancel', palDragEnd);
  $('ctx').addEventListener('click', (e) => { const btn = e.target.closest('button'); if (!btn) return;
    const col = S.palette[ctxIdx]; $('ctx').classList.remove('on'); if (!col) return;
    const act = btn.dataset.act;
    if (act === 'copy') { const h = rgbToHex(col).toUpperCase(); copyText(h).then(() => toast(t('toast.copied', { s: h }))); }
    else if (act === 'delete') { S.palette.splice(ctxIdx, 1); buildPalette(); toast(t('toast.colorRemoved')); }
    else if (act === 'select') actions.run('selection.byColor', col);
    else if (act === 'replace') { const r = $('repl'); replFrom = col.slice(); r.value = rgbToHex(col); r.click(); } });
  $('repl').addEventListener('change', (e) => { if (!replFrom) return; const from = replFrom; replFrom = null; actions.run('recolor.all', from, hexToRgb(e.target.value)); });
  $('picker').onchange = (e) => { if (S.replaceMode) { const from = S.replaceMode.from; S.replaceMode = null; actions.run('recolor.all', from, hexToRgb(e.target.value)); } else addColor(e.target.value); };
  bus.on('palette', () => { buildPalette(); refreshActive(); });
  refreshActive(); buildPalette();
}
