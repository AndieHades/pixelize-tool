// HSV-пикер в углу: тап по кружку — открыть, перетащить на холст — залить
// активным цветом. Активный цвет хранится в S; смену разносит событие 'palette'.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, t } from '../core/dom.js';
import { rgb, rgbToHex, rgbToHsv, hsvToRgb, hexToRgb } from '../logic/color.js';

let colH = 0, colS = 0, colV = 100, replaceFrom = null; // replaceFrom — цвет или список цветов для режима замены
let onPick = null; // режим «выбрать цвет для произвольной цели» (эффекты): колбэк(hex) на каждое изменение
const COL_HISTORY_STORE = 'pixel-heart:color-history';
let colHistory = [];

const currentColor = () => hsvToRgb(colH, colS, colV);
const colorKey = (c) => c ? c.slice(0, 3).join(',') : '';

function loadColorHistory() {
  try { colHistory = JSON.parse(localStorage.getItem(COL_HISTORY_STORE) || '[]').filter((c) => Array.isArray(c) && c.length >= 3).map((c) => c.slice(0, 3)); }
  catch (e) { colHistory = []; }
}

function saveColorHistory() {
  try { localStorage.setItem(COL_HISTORY_STORE, JSON.stringify(colHistory)); } catch (e) {}
}

function renderColorHistory() {
  const host = $('col-hist'); if (!host) return; host.innerHTML = '';
  for (const c of colHistory.slice(0, 10)) { const b = document.createElement('button'), hex = rgbToHex(c).toUpperCase();
    b.type = 'button'; b.style.background = hex; b.title = hex; b.onclick = () => setColorFromRgb(c, true); host.appendChild(b); }
}

function rememberColor(c) {
  const key = colorKey(c);
  colHistory = [c.slice(0, 3), ...colHistory.filter((x) => colorKey(x) !== key)].slice(0, 10);
  saveColorHistory(); renderColorHistory();
}

function syncModeActions() {
  const btn = $('col-commit'); if (!btn) return; const active = !!(onPick || replaceFrom);
  btn.classList.toggle('hide', !active); btn.dataset.i18nTitle = onPick ? 'btn.done' : 'btn.replaceColor';
  btn.title = t(btn.dataset.i18nTitle);
}

function syncColUI() { const hex = rgbToHex(hsvToRgb(colH, colS, colV)).toUpperCase();
  $('col-h').value = Math.round(colH); $('col-hv').textContent = Math.round(colH);
  $('col-s').value = Math.round(colS); $('col-sv').textContent = Math.round(colS);
  $('col-v').value = Math.round(colV); $('col-vv').textContent = Math.round(colV);
  $('col-sw').style.background = hex; if (document.activeElement !== $('col-hex')) $('col-hex').value = hex;
  const hueHex = rgbToHex(hsvToRgb(colH, 100, 100)); $('col-disc').style.setProperty('--col-hue', hueHex);
  const r = $('col-disc').clientWidth / 2 || 143, ringR = r * .8, a = (colH - 90) * Math.PI / 180;
  $('col-hmark').style.left = (r + Math.cos(a) * ringR) + 'px'; $('col-hmark').style.top = (r + Math.sin(a) * ringR) + 'px'; $('col-hmark').style.background = hueHex;
  const sv = $('col-svdisc'), svD = sv.clientWidth || 132, svR = svD / 2;
  let sx = sv.offsetLeft + svD * colS / 100, sy = sv.offsetTop + svD * (100 - colV) / 100;
  const scx = sv.offsetLeft + svR, scy = sv.offsetTop + svR, sd = Math.hypot(sx - scx, sy - scy);
  if (sd > svR) { sx = scx + (sx - scx) / sd * svR; sy = scy + (sy - scy) / sd * svR; }
  $('col-svmark').style.left = sx + 'px'; $('col-svmark').style.top = sy + 'px'; $('col-svmark').style.background = hex;
  $('col-svmark').classList.toggle('white', colS < 8 && colV > 92);
  $('col-s').style.background = 'linear-gradient(90deg,' + rgbToHex(hsvToRgb(colH, 0, colV)) + ',' + rgbToHex(hsvToRgb(colH, 100, colV)) + ')';
  $('col-v').style.background = 'linear-gradient(90deg,#000,' + rgbToHex(hsvToRgb(colH, colS, 100)) + ')'; }

function colApply() { if (onPick) { onPick(rgbToHex(hsvToRgb(colH, colS, colV))); return; } // отдаём цвет цели (эффекту), активный не трогаем
  if (replaceFrom) return; // в режиме замены активный цвет не трогаем — только превью в col-sw
  S.active = hsvToRgb(colH, colS, colV); bus.emit('palette'); bus.emit('render'); }

function setColorFromRgb(c, remember = false) { const [h, s, v] = rgbToHsv(c[0], c[1], c[2]); colH = h; colS = s; colV = v; syncColUI(); colApply(); if (remember) rememberColor(currentColor()); }
function setColorFromHsv(h, s, v, remember = false) { colH = h; colS = s; colV = v; syncColUI(); colApply(); if (remember) rememberColor(currentColor()); }

export function syncColFromActive() { const [h, s, v] = rgbToHsv(S.active[0], S.active[1], S.active[2]); colH = h; colS = s; colV = v; syncColUI(); }

// кружок цвета открывает СРАЗУ пикер и палитру (это два отдельных перетаскиваемых
// окна — можно растащить); повторный тап при обоих открытых — прячет оба.
function openColPop() { const pb = $('palbar'), cp = $('colpop');
  if (!pb.classList.contains('closed') && cp.classList.contains('on')) { pb.classList.add('closed'); cp.classList.remove('on'); onPick = null; return; }
  pb.classList.remove('closed'); replaceFrom = null; onPick = null; syncModeActions(); $('fx-edit').classList.remove('on'); syncColFromActive(); cp.classList.add('on'); }

// открыть наш пикер для выбора нового цвета в палитру (вместо нативного input)
export function openColPick() { replaceFrom = null; onPick = null; syncModeActions(); $('fx-edit').classList.remove('on'); syncColFromActive(); $('colpop').classList.add('on'); }

// открыть наш пикер в режиме «заменить цвет from на выбранный по всему рисунку»
export function openColReplace(from) { replaceFrom = null; onPick = null; replaceFrom = from.slice(); $('fx-edit').classList.remove('on');
  const seed = Array.isArray(from[0]) ? S.active : from;
  const [h, s, v] = rgbToHsv(seed[0], seed[1], seed[2]); colH = h; colS = s; colV = v; syncColUI(); syncModeActions(); $('colpop').classList.add('on'); }

// открыть наш пикер для произвольной цели (эффекты): cb(hex) на каждое изменение; окно эффекта не прячем
export function openColFor(hex, cb) { replaceFrom = null; onPick = cb || null;
  const [h, s, v] = rgbToHsv(...hexToRgb(hex)); colH = h; colS = s; colV = v; syncColUI(); syncModeActions(); $('colpop').classList.add('on'); }

export function mount() {
  loadColorHistory(); renderColorHistory(); syncModeActions();
  let drop = null;
  $('activewrap').addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return;
    drop = { x: e.clientX, y: e.clientY, moved: false }; try { $('activewrap').setPointerCapture(e.pointerId); } catch (err) {} });
  $('activewrap').addEventListener('pointermove', (e) => { if (!drop) return;
    if (!drop.moved && Math.hypot(e.clientX - drop.x, e.clientY - drop.y) > 8) { drop.moved = true; $('swdrop').style.background = rgb(S.active); $('swdrop').classList.add('on'); }
    if (drop.moved) { $('swdrop').style.left = e.clientX + 'px'; $('swdrop').style.top = e.clientY + 'px'; } });
  $('activewrap').addEventListener('pointerup', (e) => { if (!drop) return; const moved = drop.moved; drop = null; $('swdrop').classList.remove('on');
    if (!moved) { openColPop(); return; }
    actions.run('edit.dropColorAt', S.active, e.clientX, e.clientY); });
  $('activewrap').addEventListener('pointercancel', () => { if (drop) { drop = null; $('swdrop').classList.remove('on'); } });
  const rectWithSize = (el, fallback) => { const r = el.getBoundingClientRect(), w = r.width || el.clientWidth || fallback, h = r.height || el.clientHeight || fallback;
    return { left: r.left, top: r.top, width: w, height: h }; };
  const svPoint = (e) => {
    const sv = rectWithSize($('col-svdisc'), 132), svCx = sv.left + sv.width / 2, svCy = sv.top + sv.height / 2;
    if (Math.hypot(e.clientX - svCx, e.clientY - svCy) > Math.min(sv.width, sv.height) / 2) return null;
    return {
      s: Math.max(0, Math.min(100, (e.clientX - sv.left) / sv.width * 100)),
      v: Math.max(0, Math.min(100, 100 - (e.clientY - sv.top) / sv.height * 100)),
      sv,
    };
  };
  const snapSvPoint = (p) => {
    const snaps = [[0, 100], [50, 100], [100, 100], [100, 58], [100, 24], [50, 0], [0, 24], [0, 58]];
    let best = snaps[0], bd = Infinity;
    for (const q of snaps) { const d = (q[0] - p.s) ** 2 + (q[1] - p.v) ** 2; if (d < bd) { bd = d; best = q; } }
    setColorFromHsv(colH, best[0], best[1], true);
  };
  const discPick = (e) => {
    const r = rectWithSize($('col-disc'), 286), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy), outer = Math.min(r.width, r.height) / 2, inner = outer * .52;
    if (d >= inner && d <= outer) { setColorFromHsv((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360, colS, colV, true); return 'hue'; }
    const p = svPoint(e); if (p) { setColorFromHsv(colH, p.s, p.v, true); return 'sv'; }
    return '';
  };
  let discDrag = false, lastSvTap = null;
  $('col-disc').addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const p = svPoint(e), now = Date.now();
    if (p && lastSvTap && now - lastSvTap.t < 360 && Math.hypot(e.clientX - lastSvTap.x, e.clientY - lastSvTap.y) < 22) {
      snapSvPoint(p); lastSvTap = null; discDrag = false; return;
    }
    const mode = discPick(e); discDrag = !!mode; lastSvTap = mode === 'sv' ? { t: now, x: e.clientX, y: e.clientY } : null;
    if (discDrag) try { $('col-disc').setPointerCapture(e.pointerId); } catch (err) {} });
  $('col-disc').addEventListener('pointermove', (e) => { if (discDrag) discPick(e); });
  $('col-disc').addEventListener('pointerup', () => { discDrag = false; });
  $('col-disc').addEventListener('pointercancel', () => { discDrag = false; });
  $('col-h').addEventListener('input', () => setColorFromHsv(+$('col-h').value, colS, colV, true));
  $('col-s').addEventListener('input', () => setColorFromHsv(colH, +$('col-s').value, colV, true));
  $('col-v').addEventListener('input', () => setColorFromHsv(colH, colS, +$('col-v').value, true));
  $('col-hex').addEventListener('input', () => { const v = $('col-hex').value.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(v)) setColorFromRgb(hexToRgb(v), true); });
  $('col-add').onclick = () => { const c = hsvToRgb(colH, colS, colV);
    actions.run('palette.addRgb', c); rememberColor(c); };
  $('col-commit').onclick = () => { const c = hsvToRgb(colH, colS, colV);
    if (onPick) { onPick = null; syncModeActions(); $('colpop').classList.remove('on'); return; } // «Готово» — закрыть пикер эффекта
    if (replaceFrom) { const from = replaceFrom; replaceFrom = null; syncModeActions(); $('colpop').classList.remove('on'); actions.run('recolor.all', from, c); } };
  $('col-hist-clear').onclick = () => { colHistory = []; saveColorHistory(); renderColorHistory(); };
  bus.on('color-sync', () => { if (onPick) return; if ($('colpop').classList.contains('on')) syncColFromActive(); }); // в режиме цели не сбрасываем на активный
  $('colpop').querySelector('.win-x').onclick = () => { onPick = null; $('colpop').classList.remove('on'); syncModeActions(); };
}

actions.register('color.pick', openColPick);     // выбрать новый цвет в палитру (вместо нативного input)
actions.register('color.replace', openColReplace); // заменить цвет по всему рисунку нашим пикером
actions.register('color.for', openColFor);        // выбрать цвет для произвольной цели (эффекты) нашим пикером
