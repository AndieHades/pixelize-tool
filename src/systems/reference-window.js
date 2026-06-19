// Окно референса: открыть картинку, пан/зум, поворот, отражение. Пипетка по
// референсу — через единую Eyedropper System (читает пиксели #refcv), не здесь.
import { $, toast, t } from '../core/dom.js';
import * as actions from '../core/actions.js';
import { floatingWindow } from '../core/floating-window.js';
import { attachPanZoom } from '../core/pan-zoom.js';
import { makeCanvas, syncCanvasSize } from '../core/canvas.js';
import { C } from '../styles/canvas-colors.js';

let refOn = false, refSrc = null, detachedWin = null, detachedPoll = null; const rv = { z: 1, x: 0, y: 0 };
const rcv = () => $('refcv');
const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i;
const isImageFile = (f) => f && (((f.type || '').startsWith('image/')) || IMG_EXT.test(f.name || ''));
const hasFiles = (e) => e.dataTransfer && ([...(e.dataTransfer.types || [])].includes('Files') || (e.dataTransfer.files && e.dataTransfer.files.length));
const dropImageFile = (e) => e.dataTransfer && [...(e.dataTransfer.files || [])].find(isImageFile);
const resetGlobalDrop = () => window.dispatchEvent(new window.CustomEvent('pxh:drop-reset'));
const detachedOpen = () => !!(detachedWin && !detachedWin.closed);
const refDataUrl = () => refSrc ? refSrc.toDataURL('image/png') : null;
const syncRefButton = () => $('refbtn').classList.toggle('on', refOn || detachedOpen());

function refRender() { if (!refOn) return; const cv = rcv();
  const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth, ch = cv.clientHeight;
  syncCanvasSize(cv, cw, ch, dpr);
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cw, ch); c.fillStyle = C.prevBg; c.fillRect(0, 0, cw, ch);
  if (!refSrc) { c.fillStyle = C.hint; c.font = '12px system-ui'; c.textAlign = 'center'; c.fillText(t('reference.emptyHint'), cw / 2, ch / 2); return; }
  c.imageSmoothingEnabled = rv.z < 2; c.drawImage(refSrc, rv.x, rv.y, refSrc.width * rv.z, refSrc.height * rv.z); }

function refFit() { if (!refSrc) { refRender(); return; } const cv = rcv(), cw = cv.clientWidth, ch = cv.clientHeight;
  rv.z = Math.min(cw / refSrc.width, ch / refSrc.height); rv.x = (cw - refSrc.width * rv.z) / 2; rv.y = (ch - refSrc.height * rv.z) / 2; refRender(); }

function toggleRef(on) { refOn = on === undefined ? !refOn : on;
  $('refwin').classList.toggle('on', refOn); syncRefButton();
  if (refOn) requestAnimationFrame(refFit); }

function syncDetachedImage() { if (detachedOpen() && detachedWin.__pxhSetReference) detachedWin.__pxhSetReference(refDataUrl()); }

function setRefImage(im, opts = {}) {
  const w = Math.max(1, im.naturalWidth || im.width || 1), h = Math.max(1, im.naturalHeight || im.height || 1);
  const c = makeCanvas(w, h); c.getContext('2d').drawImage(im, 0, 0); refSrc = c;
  if (opts.open !== false && !detachedOpen()) toggleRef(true); else if (refOn) refFit();
  if (opts.sync !== false) syncDetachedImage();
}

function loadRefUrl(url, opts = {}) { const im = new Image();
  im.onerror = () => { if (opts.revoke) URL.revokeObjectURL(url); toast(t('toast.imgOpenFail')); };
  im.onload = () => { if (opts.revoke) URL.revokeObjectURL(url); setRefImage(im, opts); };
  im.src = url; }
function loadRefFile(f) { if (f) loadRefUrl(URL.createObjectURL(f), { revoke: true }); }

function rotateRef() { if (!refSrc) return; const c = makeCanvas(refSrc.height, refSrc.width);
  const x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(refSrc, 0, 0); refSrc = c; refFit(); syncDetachedImage(); }
function flipRef() { if (!refSrc) return; const c = makeCanvas(refSrc.width, refSrc.height);
  const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(refSrc, 0, 0); refSrc = c; refRender(); syncDetachedImage(); }

function detachedScript() {
  const cv = document.getElementById('cv'), hint = document.getElementById('hint'), x = cv.getContext('2d', { willReadFrequently: true });
  const img = new Image(), src = document.createElement('canvas'), sx = src.getContext('2d', { willReadFrequently: true });
  const view = { z: 1, x: 0, y: 0 }; let has = false, drag = null;
  function resize() { const d = window.devicePixelRatio || 1; cv.width = Math.max(1, Math.round(innerWidth * d)); cv.height = Math.max(1, Math.round(innerHeight * d)); cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; x.setTransform(d, 0, 0, d, 0, 0); render(); }
  function fit() { if (!has) { render(); return; } view.z = Math.min(innerWidth / src.width, innerHeight / src.height); view.x = (innerWidth - src.width * view.z) / 2; view.y = (innerHeight - src.height * view.z) / 2; render(); }
  function render() { x.fillStyle = '#1f1f1f'; x.fillRect(0, 0, innerWidth, innerHeight); hint.style.display = has ? 'none' : 'block'; if (!has) return; x.imageSmoothingEnabled = view.z < 2; x.drawImage(src, view.x, view.y, src.width * view.z, src.height * view.z); }
  function load(url) { if (!url) { has = false; render(); return; } img.onload = () => { src.width = Math.max(1, img.naturalWidth || img.width || 1); src.height = Math.max(1, img.naturalHeight || img.height || 1); sx.clearRect(0, 0, src.width, src.height); sx.drawImage(img, 0, 0); has = true; fit(); }; img.src = url; }
  function pick(e) { if (!has) return; const px = Math.floor((e.clientX - view.x) / view.z), py = Math.floor((e.clientY - view.y) / view.z); if (px < 0 || py < 0 || px >= src.width || py >= src.height) return; const d = sx.getImageData(px, py, 1, 1).data; if (d[3] > 10 && opener && opener.__pxhReferencePick) opener.__pxhReferencePick([d[0], d[1], d[2]]); }
  function fileDrop(e) { e.preventDefault(); const f = [...(e.dataTransfer.files || [])].find((it) => ((it.type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(it.name || ''))); if (!f) return; const r = new FileReader(); r.onload = () => { load(r.result); if (opener && opener.__pxhReferenceSetDataUrl) opener.__pxhReferenceSetDataUrl(r.result); }; r.readAsDataURL(f); }
  window.__pxhSetReference = load; window.addEventListener('resize', resize);
  cv.addEventListener('wheel', (e) => { if (!has) return; e.preventDefault(); const old = view.z, nz = Math.max(0.05, Math.min(40, old * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); view.x = e.clientX - (e.clientX - view.x) * (nz / old); view.y = e.clientY - (e.clientY - view.y) * (nz / old); view.z = nz; render(); }, { passive: false });
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (err) {} drag = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: view.x, oy: view.y, moved: false, pick: e.button === 0 }; });
  cv.addEventListener('pointermove', (e) => { if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 3) drag.moved = true; view.x = drag.ox + dx; view.y = drag.oy + dy; render(); });
  cv.addEventListener('pointerup', (e) => { if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null; if (d.pick && !d.moved) pick(e); });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('dragover', (e) => e.preventDefault()); window.addEventListener('drop', fileDrop); resize();
}

function detachedHtml() { return `<!doctype html><html><head><meta charset="utf-8"><title>${t('label.reference')}</title><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#1f1f1f;color:#a9a9a9;font:12px system-ui}
#cv{display:block;width:100vw;height:100vh;cursor:crosshair;touch-action:none}
#hint{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;white-space:nowrap}
</style></head><body><canvas id="cv"></canvas><div id="hint">${t('reference.emptyHint')}</div><script>(${detachedScript.toString()})()</script></body></html>`; }

function watchDetached() {
  clearInterval(detachedPoll);
  detachedPoll = setInterval(() => { if (!detachedWin || detachedWin.closed) { clearInterval(detachedPoll); detachedPoll = null; detachedWin = null; syncRefButton(); } }, 600);
  if (detachedPoll && detachedPoll.unref) detachedPoll.unref();
}

function openDetached(e) {
  if (detachedOpen()) { detachedWin.focus(); return true; }
  const r = $('refwin').getBoundingClientRect(), w = Math.max(220, Math.round(r.width)), h = Math.max(180, Math.round(r.height));
  const left = Math.round(Number.isFinite(e && e.screenX) ? e.screenX - w / 2 : window.screenX + r.left);
  const top = Math.round(Number.isFinite(e && e.screenY) ? e.screenY - 18 : window.screenY + r.top);
  const p = window.open('', 'pxh-reference-detached', `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
  if (!p) { toast(t('toast.refPopupBlocked')); return false; }
  detachedWin = p; p.document.open(); p.document.write(detachedHtml()); p.document.close();
  p.addEventListener('beforeunload', () => { detachedWin = null; syncRefButton(); });
  window.__pxhReferencePick = (rgb) => actions.run('color.setActive', rgb);
  window.__pxhReferenceSetDataUrl = (url) => loadRefUrl(url, { open: false, sync: false });
  watchDetached(); toggleRef(false); syncRefButton(); setTimeout(syncDetachedImage, 0); return true;
}

function bindDetachDrag() {
  let d = null; const M = 24;
  $('refgrip').addEventListener('pointerdown', (e) => { if (e.button !== 0 || (e.target.closest && e.target.closest('button'))) return; d = { id: e.pointerId }; }, true);
  window.addEventListener('pointermove', (e) => { if (!d || e.pointerId !== d.id) return;
    if (e.clientX < -M || e.clientY < -M || e.clientX > innerWidth + M || e.clientY > innerHeight + M) { d = null; openDetached(e); } }, true);
  window.addEventListener('pointerup', (e) => { if (d && e.pointerId === d.id) d = null; }, true);
  window.addEventListener('pointercancel', () => { d = null; }, true);
}

export function mount() {
  $('refbtn').onclick = () => { if (detachedOpen()) detachedWin.focus(); else toggleRef(); }; $('ref-x').onclick = () => toggleRef(false);
  $('ref-rot').onclick = rotateRef; $('ref-flip').onclick = flipRef;
  const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*';
  $('ref-open').onclick = () => file.click();
  file.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) loadRefFile(f); };
  let dropDepth = 0; const over = (on) => $('refwin').classList.toggle('drop-over', on);
  const stopFileDrag = (e) => { if (!hasFiles(e)) return false;
    e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; resetGlobalDrop(); return true; };
  $('refwin').addEventListener('dragenter', (e) => { if (stopFileDrag(e)) { dropDepth++; over(true); } });
  $('refwin').addEventListener('dragover', stopFileDrag);
  $('refwin').addEventListener('dragleave', (e) => { if (!stopFileDrag(e)) return;
    if (e.relatedTarget && $('refwin').contains(e.relatedTarget)) return;
    dropDepth = Math.max(0, dropDepth - 1); if (!dropDepth) over(false); });
  $('refwin').addEventListener('drop', (e) => { if (!stopFileDrag(e)) return;
    dropDepth = 0; over(false); const f = dropImageFile(e);
    if (f) loadRefFile(f); else if (e.dataTransfer && e.dataTransfer.files.length) toast(t('toast.notImage')); });
  bindDetachDrag();
  floatingWindow($('refwin'), { grip: $('refgrip'), handle: $('refrsz'), clampRight: 70,
    onResize: (w, h) => { $('refwin').style.width = Math.max(140, Math.min(innerWidth - 12, w)) + 'px';
      $('refwin').style.height = Math.max(120, Math.min(innerHeight - 12, h)) + 'px'; refRender(); } });
  attachPanZoom(rcv(), rv, { min: 0.05, max: 40, render: refRender });
}
