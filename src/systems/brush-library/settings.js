// Окно настроек активной кисти (перетаскиваемое): режим (единичный/разброс/
// поток), размер, расстояние, разброс; превью мазка и тест-канвас. Открывается
// кликом по кисти. Параметры — на кисть (сохраняются), размер — общий инструмента.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { $ } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { BP_SMAX } from '../../config/limits.js';
import { BRUSH_SETTINGS } from '../../config/brush-import.js';
import { brushMode, stampSize } from '../../logic/brush-stamp.js';
import { previewStroke } from '../../logic/brush-preview.js';
import { lib } from './data.js';
import { saveBrush } from '../../core/brush-store.js';
import { setStampBrush } from '../../core/stamp-brush.js';
import { initTestCanvas, clearTest } from './test-canvas.js';

let getMode = () => 'pencil';
const activeRec = () => { const sb = S.stampBrush[getMode()]; return sb ? lib.brushes.find((b) => b.id === sb.id) : null; };

function drawPreview() { const rec = activeRec(), cv = $('bs-preview'), W = 184, H = 40; cv.width = W; cv.height = H;
  const cx = cv.getContext('2d'); cx.clearRect(0, 0, W, H); if (!rec) return;
  const size = Math.max(2, Math.min(H - 2, stampSize(rec, S.brushes[getMode()].size, BP_SMAX)));
  const pr = previewStroke(rec, W, H, size), c = S.active, img = cx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) if (pr.data[i]) { img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
  cx.putImageData(img, 0, 0); }
function syncModes() { const rec = activeRec(), mode = rec ? brushMode(rec.params) : 'flow';
  for (const b of $('bs-mode').children) b.classList.toggle('on', b.dataset.mode === mode); }
function apply() { const rec = activeRec(); if (rec) { saveBrush(rec); setStampBrush(getMode(), rec); } bus.emit('render'); syncModes(); drawPreview(); clearTest(); }
const editParam = (patch) => { const rec = activeRec(); if (!rec) return; rec.params = { ...rec.params, ...patch }; apply(); };

export function mountSettings(modeFn) {
  getMode = modeFn;
  $('bs-size').max = BP_SMAX; $('bs-spacing').max = BRUSH_SETTINGS.spacingMax; $('bs-scatter').max = BRUSH_SETTINGS.jitterMax;
  $('bs-size').addEventListener('input', () => { S.brushes[getMode()].size = +$('bs-size').value; bus.emit('brushlib'); bus.emit('render'); drawPreview(); clearTest(); });
  $('bs-spacing').addEventListener('input', () => editParam({ spacing: +$('bs-spacing').value }));
  $('bs-scatter').addEventListener('input', () => { const v = +$('bs-scatter').value; editParam({ jitter: v, sizeJitter: Math.min(0.85, v / BRUSH_SETTINGS.jitterMax) }); });
  for (const b of $('bs-mode').children) b.addEventListener('click', () => editParam({ mode: b.dataset.mode }));
  initTestCanvas(getMode);
  floatingWindow($('brush-settings'), { grip: $('brush-set-head'), storeKey: 'brushsetwin', minW: 210, minH: 150,
    onClose: () => $('brush-settings').classList.remove('on') });
}

export function openSettings() { if (activeRec()) { $('brush-settings').classList.add('on'); syncSettings(); clearTest(); } }
export function syncSettings() { const rec = activeRec();
  if (!rec) { $('brush-settings').classList.remove('on'); return; }
  $('bs-size').value = S.brushes[getMode()].size;
  $('bs-spacing').value = (rec.params && rec.params.spacing) || 0;
  $('bs-scatter').value = (rec.params && rec.params.jitter) || 0;
  syncModes(); drawPreview();
}
