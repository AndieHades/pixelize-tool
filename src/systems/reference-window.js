// Окно референса: открыть картинку, пан/зум, поворот, отражение, пипетка по клику.
import * as actions from '../core/actions.js';
import { $, toast, t } from '../core/dom.js';
import { floatingWindow } from '../core/floating-window.js';
import { attachPanZoom } from '../core/pan-zoom.js';

let refOn = false, refSrc = null; const rv = { z: 1, x: 0, y: 0 };
const rcv = () => $('refcv');

function refRender() { if (!refOn) return; const cv = rcv();
  const dpr = window.devicePixelRatio || 1, cw = cv.clientWidth, ch = cv.clientHeight;
  if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cw, ch); c.fillStyle = '#101014'; c.fillRect(0, 0, cw, ch);
  if (!refSrc) { c.fillStyle = '#9a9aa3'; c.font = '12px system-ui'; c.textAlign = 'center'; c.fillText('Открой картинку кнопкой 📁 сверху', cw / 2, ch / 2); return; }
  c.imageSmoothingEnabled = rv.z < 2; c.drawImage(refSrc, rv.x, rv.y, refSrc.width * rv.z, refSrc.height * rv.z); }

function refFit() { if (!refSrc) { refRender(); return; } const cv = rcv(), cw = cv.clientWidth, ch = cv.clientHeight;
  rv.z = Math.min(cw / refSrc.width, ch / refSrc.height); rv.x = (cw - refSrc.width * rv.z) / 2; rv.y = (ch - refSrc.height * rv.z) / 2; refRender(); }

function toggleRef(on) { refOn = on === undefined ? !refOn : on;
  $('refwin').classList.toggle('on', refOn); $('refbtn').classList.toggle('on', refOn);
  if (refOn) requestAnimationFrame(refFit); }

function rotateRef() { if (!refSrc) return; const c = document.createElement('canvas'); c.width = refSrc.height; c.height = refSrc.width;
  const x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(refSrc, 0, 0); refSrc = c; refFit(); }
function flipRef() { if (!refSrc) return; const c = document.createElement('canvas'); c.width = refSrc.width; c.height = refSrc.height;
  const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(refSrc, 0, 0); refSrc = c; refRender(); }

function pickFromRef(e) { if (!refSrc) return; const cv = rcv(), dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
  try { const px = cv.getContext('2d').getImageData(Math.round((e.clientX - r.left) * dpr), Math.round((e.clientY - r.top) * dpr), 1, 1).data;
    if (px[3] > 10) { const hex = '#' + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      actions.run('palette.add', hex); $('picker').value = hex; toast(t('toast.colorFromRef')); } } catch (err) {} }

export function mount() {
  $('refbtn').onclick = () => toggleRef(); $('ref-x').onclick = () => toggleRef(false);
  $('ref-rot').onclick = rotateRef; $('ref-flip').onclick = flipRef;
  const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*';
  $('ref-open').onclick = () => file.click();
  file.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const im = new Image(); im.onerror = () => toast(t('toast.imgOpenFail'));
    im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      c.getContext('2d').drawImage(im, 0, 0); refSrc = c; refFit(); }; im.src = URL.createObjectURL(f); };
  floatingWindow($('refwin'), { grip: $('refgrip'), handle: $('refrsz'), clampRight: 70,
    onResize: (w, h) => { $('refwin').style.width = Math.max(140, Math.min(innerWidth - 12, w)) + 'px';
      $('refwin').style.height = Math.max(120, Math.min(innerHeight - 12, h)) + 'px'; refRender(); } });
  attachPanZoom(rcv(), rv, { min: 0.05, max: 40, render: refRender, onPick: pickFromRef });
}
