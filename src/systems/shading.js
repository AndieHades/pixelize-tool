// Shading ramp: a compact Aseprite-like ink mode driven by a selected palette
// range. The ramp order is the brush direction; clicking it reverses direction.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, t } from '../core/dom.js';
import { floatingWindow } from '../core/floating-window.js';
import { rgb, rgbToHex, eqc } from '../logic/color.js';

export const SHADING_MAX = 6;

const clean = (colors) => {
  const out = [];
  for (const c of colors || []) {
    const v = c && c.slice(0, 3);
    if (v && !out.some((x) => eqc(x, v))) out.push(v);
    if (out.length >= SHADING_MAX) break;
  }
  return out;
};

export const active = () => (S.shading && S.shading.colors && S.shading.colors.length > 1);
export const ramp = () => (active() ? S.shading.colors : []);

function render() {
  const box = $('shade-list'); if (!box) return;
  box.innerHTML = '';
  for (const c of ramp()) {
    const b = document.createElement('button');
    b.className = 'shade-sw';
    b.style.background = rgb(c);
    b.title = rgbToHex(c).toUpperCase();
    b.onclick = reverse;
    box.appendChild(b);
  }
  $('shade-pop').classList.toggle('on', active());
}

export function setRamp(colors) {
  const next = clean(colors);
  S.shading = { colors: next };
  render();
  bus.emit('palette');
  bus.emit('render');
}

export function reverse() {
  if (!active()) return;
  S.shading.colors = S.shading.colors.slice().reverse();
  render();
  bus.emit('palette');
  bus.emit('render');
}

export function clear() {
  S.shading = { colors: [] };
  render();
  bus.emit('palette');
  bus.emit('render');
}

export function mount() {
  $('shade-title').textContent = t('shade.title');
  floatingWindow($('shade-pop'), { grip: $('shade-head'), handle: $('shade-rsz'), storeKey: 'shadewin', minW: 160, minH: 70,
    onClose: clear,
    onResize: (w) => { $('shade-pop').style.width = Math.max(160, Math.min(innerWidth - 12, w)) + 'px'; } });
  bus.on('locale', () => { $('shade-title').textContent = t('shade.title'); });
  bus.on('palette', render);
  actions.register('shading.setRamp', setRamp);
  actions.register('shading.clear', clear);
  actions.register('shading.reverse', reverse);
}
