// Палитра (рендер): отрисовка свотчей, активный цвет, добавление, режим
// «использованные». Интерактив (выделение/drag/контекст-меню) — в
// palette-select.js. Перекраска/выбор по цвету — через actions.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast, t } from '../core/dom.js';
import { rgb, rgbToHex, hexToRgb, eqc } from '../logic/color.js';
import { sortPalette } from '../logic/palette-sort.js';
import { setTool } from '../core/tools.js';
import { effVis } from '../core/layers.js';
import { initPaletteSelect, wireSwatch, clearPaletteSelection, validSel } from './palette-select.js';

let showUsed = false;

export const refreshActive = () => { $('active').style.background = rgb(S.active); };
const colorKey = (c) => c ? c[0] + ',' + c[1] + ',' + c[2] : '';
const inShadeRamp = (c) => S.shading && S.shading.picking && S.shading.colors && S.shading.colors.some((x) => eqc(x, c));

function usedColorKeys() { const keys = new Set();
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i]; if (!L || !effVis(i) || L.opacity <= 0) continue;
    for (const row of L.grid) for (const c of row) if (c && c[3] > 0) keys.add(colorKey(c));
    for (const c of (L.ext || new Map()).values()) if (c && c[3] > 0) keys.add(colorKey(c)); }
  return keys;
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

export function buildPalette() {
  validSel(); // согласовать выделение с текущей палитрой до отрисовки
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
    wireSwatch(b, c, idx); // выделение/drag/контекст-меню + класс pal-sel
    box.appendChild(b);
  });
  const add = document.createElement('button'); add.className = 'sw plus'; add.title = t('palette.addActiveTitle');
  add.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  add.addEventListener('click', () => { if (S.palette.some((p) => eqc(p, S.active))) { toast(t('toast.colorExists')); return; }
    S.palette.push(S.active.slice()); buildPalette(); toast(t('toast.colorAdded')); });
  add.addEventListener('contextmenu', (e) => { e.preventDefault(); actions.run('color.pick'); });
  box.appendChild(add);
}

export function mount() {
  initPaletteSelect({ rebuild: buildPalette, setActive: setActiveColor });
  $('pal-used').addEventListener('click', () => { showUsed = !showUsed; $('pal-used').classList.toggle('on', showUsed); buildPalette(); });
  bus.on('palette', () => { buildPalette(); refreshActive(); });
  bus.on('render', () => { if (showUsed) buildPalette(); });
  bus.on('tool', (id) => { if (id !== 'pencil') clearPaletteSelection(); });
  bus.on('locale', buildPalette);
  refreshActive(); buildPalette();
}
