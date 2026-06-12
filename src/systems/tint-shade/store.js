// Состояние окна генератора: базовый цвет, режим гармонии, выбранные цвета (rgb[]).
import { rgbToHex } from '../../logic/color.js';

export const tsg = { base: null, harmony: null, sel: [] };

const key = (c) => rgbToHex(c);
export const isSel = (c) => tsg.sel.some((s) => key(s) === key(c));

export function toggleSel(c) {
  const i = tsg.sel.findIndex((s) => key(s) === key(c));
  if (i >= 0) tsg.sel.splice(i, 1); else tsg.sel.push(c.slice(0, 3));
}

export function openWith(base) { tsg.base = base.slice(0, 3); tsg.harmony = null; tsg.sel = []; }
