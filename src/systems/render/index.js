// Система рендера: рисует видимый холст (фон, шахматка, слои с живыми
// превью move/transform/crop, сетка), затем оверлеи. Системные оверлеи
// (рамка трансформации) подмешиваются через событие 'overlay'.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { effVis, clipBase } from '../../core/layers.js';
import { layerFloatCanvas, clippedShift } from '../../core/layer-cache.js';
import { ZOOM_MIN, ZOOM_MAX } from '../../config/limits.js';
import { C } from '../../styles/canvas-colors.js';
import { drawChecker } from './checker.js';
import { drawOverlays } from './overlays.js';

const cv = $('cv'), ctx = cv.getContext('2d');

export function render() {
  const W = S.W, H = S.H;
  const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth, chh = cv.clientHeight;
  if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(chh * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(chh * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, cw, chh);
  const z = S.view.zoom, ox = S.view.ox, oy = S.view.oy;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20;
  ctx.fillStyle = C.doc; ctx.fillRect(ox, oy, W * z, H * z); ctx.restore();
  drawChecker(ctx, ox, oy, z, cw, chh);
  const iox = S.cropMode ? S.cropMode.idx * z : 0, ioy = S.cropMode ? S.cropMode.idy * z : 0; // сдвиг рисунка в кропе
  ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, W * z, H * z); ctx.clip(); // слои не выходят за холст: живой сдвиг Move/crop клипуется как итог
  for (let i = 0; i < S.layers.length; i++) { const L = S.layers[i]; if (!effVis(i) || L.opacity <= 0) continue;
    const cb = clipBase(i); if (L.clip && (cb < 0 || !effVis(cb))) continue;
    ctx.globalAlpha = L.opacity;
    if (S.rotMode && S.rotMode.idxs && S.rotMode.idxs.includes(i)) { // живое превью трансформации
      if (i === S.rotMode.idx && S.rotPrev && S.rotPrev.canvas) ctx.drawImage(S.rotPrev.canvas, ox + S.rotPrev.px * z, oy + S.rotPrev.py * z, S.rotPrev.ow * z, S.rotPrev.oh * z);
      continue; }
    const md = S.moveDrag, di = (md && md.idxs.includes(i)) ? md : null; // живой сдвиг слоя инструментом Move
    if (cb >= 0) { // обтравка: слой и база могут двигаться раздельно — маска едет вместе с базой
      const db = (md && md.idxs.includes(cb)) ? md : null;
      ctx.drawImage(clippedShift(i, cb, di ? di.dx : 0, di ? di.dy : 0, db ? db.dx : 0, db ? db.dy : 0), ox + iox, oy + ioy, W * z, H * z);
    } else ctx.drawImage(layerFloatCanvas(i), ox + iox + (di ? di.dx * z : 0), oy + ioy + (di ? di.dy * z : 0), W * z, H * z); }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (z >= 7) { ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x <= W; x++) { ctx.moveTo(ox + x * z, oy); ctx.lineTo(ox + x * z, oy + H * z); }
    for (let y = 0; y <= H; y++) { ctx.moveTo(ox, oy + y * z); ctx.lineTo(ox + W * z, oy + y * z); }
    ctx.stroke(); }
  bus.emit('overlay', { ctx, ox, oy, z }); // системные оверлеи (напр. рамка трансформации)
  drawOverlays(ctx, ox, oy, z);
}

export function fitView() {
  const cw = cv.clientWidth, chh = cv.clientHeight, pad = 24;
  S.view.zoom = Math.max(1, Math.floor(Math.min((cw - pad * 2) / S.W, (chh - pad * 2) / S.H)));
  S.view.ox = Math.round((cw - S.W * S.view.zoom) / 2);
  S.view.oy = Math.round((chh - S.H * S.view.zoom) / 2);
  render();
}

export function zoomBy(f) { const cw = cv.clientWidth / 2, chh = cv.clientHeight / 2;
  const wx = (cw - S.view.ox) / S.view.zoom, wy = (chh - S.view.oy) / S.view.zoom;
  S.view.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, S.view.zoom * f));
  S.view.ox = cw - wx * S.view.zoom; S.view.oy = chh - wy * S.view.zoom; render();
}

// система сама подписывается на сигналы (app.js только импортирует систему)
bus.on('render', render);
bus.on('fit', fitView);
window.addEventListener('resize', fitView);
actions.register('view.fit', fitView);
actions.register('zoom.in', () => zoomBy(1.25));
actions.register('zoom.out', () => zoomBy(0.8));
