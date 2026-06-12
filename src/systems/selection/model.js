// Модель выделения: нормализация рамки, маски, операции над содержимым.
// Drag/перенос — в selection-input; здесь логика, не жесты.
import { S, G } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { parseKey } from '../../logic/raster.js';
import { eqc } from '../../logic/color.js';
import { symA, symHA } from '../../core/layers.js';
import { inMask } from '../../core/selection.js';
import { snapshot } from '../../core/history.js';
import { markDirty } from '../../core/layer-cache.js';
import { toast, t } from '../../core/dom.js';

export function normSel(ax, ay, bx, by) { let x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(S.W - 1, x1); y1 = Math.min(S.H - 1, y1);
  return (x1 < x0 || y1 < y0) ? null : { x0, y0, x1, y1 }; }

export function deselect() { S.sel = null; S.selMask = null; bus.emit('selection'); bus.emit('render'); }

export function maskFromCells(set) { let x0 = S.W, y0 = S.H, x1 = -1, y1 = -1;
  for (const k of set) { const [x, y] = parseKey(k); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { deselect(); return; }
  S.sel = { x0, y0, x1, y1 }; S.selMask = set; bus.emit('selection'); bus.emit('render'); }

export function symmetrizeSelection() { const sa = symA(), sha = symHA(); if (!S.sel || (!sa && !sha)) return;
  const base = new Set();
  if (S.selMask) for (const k of S.selMask) base.add(k);
  else for (let y = S.sel.y0; y <= S.sel.y1; y++) for (let x = S.sel.x0; x <= S.sel.x1; x++) base.add(x + ',' + y);
  const out = new Set(base), g = G();
  const add = (xx, yy) => { if (g[yy] && g[yy][xx]) out.add(xx + ',' + yy); }; // зеркалим только по существующим пикселям — не выделяем пустоту
  for (const k of base) { const [x, y] = parseKey(k);
    if (sa) add(S.W - 1 - x, y); if (sha) add(x, S.H - 1 - y); if (sa && sha) add(S.W - 1 - x, S.H - 1 - y); }
  maskFromCells(out); }

export function selectColorPixels(col) { const g = G(), mask = new Set(); let nn = 0, x0 = S.W, y0 = S.H, x1 = -1, y1 = -1;
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = g[y][x];
    if (c && eqc(c, col)) { mask.add(x + ',' + y); nn++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (!nn) { toast(t('toast.noColorOnLayer')); return; }
  S.sel = { x0, y0, x1, y1 }; S.selMask = mask; bus.emit('selection'); bus.emit('render'); // по цвету уже выбрано всё совпадающее — зеркалить не нужно
  toast(t('toast.selectedColorN', { n: nn })); }

export function selectLayerContent() { const g = G(), mask = new Set();
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (g[y][x]) mask.add(x + ',' + y);
  if (!mask.size) { deselect(); toast(t('toast.layerEmpty')); return; }
  maskFromCells(mask); toast(t('toast.selectedLayerN', { n: mask.size })); } // содержимое слоя уже выбрано полностью

export function invertSelection() { const inNow = (x, y) => (S.selMask ? S.selMask.has(x + ',' + y) : (S.sel && x >= S.sel.x0 && x <= S.sel.x1 && y >= S.sel.y0 && y <= S.sel.y1));
  const mask = new Set();
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (!inNow(x, y)) mask.add(x + ',' + y);
  if (!mask.size) { deselect(); toast(t('toast.invertAll')); return; }
  maskFromCells(mask); toast(t('toast.selInverted')); }

export function fragFromSel() { const g = G(), f = [];
  for (let y = S.sel.y0; y <= S.sel.y1; y++) { const row = []; for (let x = S.sel.x0; x <= S.sel.x1; x++) { const c = inMask(x, y) ? g[y][x] : null; row.push(c ? c.slice() : null); } f.push(row); }
  return f; }

export function deleteSelContent() { const g = G(); let any = false;
  for (let y = S.sel.y0; y <= S.sel.y1 && !any; y++) for (let x = S.sel.x0; x <= S.sel.x1; x++) if (g[y][x] && inMask(x, y)) { any = true; break; }
  if (!any) return false; snapshot();
  for (let y = S.sel.y0; y <= S.sel.y1; y++) for (let x = S.sel.x0; x <= S.sel.x1; x++) if (inMask(x, y)) g[y][x] = null;
  markDirty(S.cur); bus.emit('render'); bus.emit('layers'); return true; }

export function fillSelection() { if (!S.sel) return; snapshot(); const g = G(); let nn = 0;
  for (let y = S.sel.y0; y <= S.sel.y1; y++) for (let x = S.sel.x0; x <= S.sel.x1; x++) { if (!inMask(x, y)) continue; g[y][x] = [S.active[0], S.active[1], S.active[2], 255]; nn++; }
  markDirty(S.cur); bus.emit('render'); bus.emit('layers'); toast(t('toast.filledN', { n: nn })); }

actions.register('selection.byColor', selectColorPixels);
actions.register('selection.layer', selectLayerContent);
actions.register('selection.invert', invertSelection);
actions.register('selection.fill', fillSelection);
