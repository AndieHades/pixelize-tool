// HSV-пикер в углу: тап по кружку — открыть, перетащить на холст — залить
// активным цветом. Активный цвет хранится в S; смену разносит событие 'palette'.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, t } from '../core/dom.js';
import { rgb, rgbToHex, rgbToHsv, hsvToRgb, hexToRgb, eqc } from '../logic/color.js';

let colH = 0, colS = 0, colV = 100, replaceFrom = null; // replaceFrom — цвет или список цветов для режима замены
let onPick = null; // режим «выбрать цвет для произвольной цели» (эффекты): колбэк(hex) на каждое изменение
const setAddLabel = () => { $('col-add').textContent = t(onPick ? 'btn.done' : replaceFrom ? 'btn.replaceColor' : 'btn.addPalette'); };

function syncColUI() { const hex = rgbToHex(hsvToRgb(colH, colS, colV)).toUpperCase();
  $('col-h').value = Math.round(colH); $('col-hv').textContent = Math.round(colH);
  $('col-s').value = Math.round(colS); $('col-sv').textContent = Math.round(colS);
  $('col-v').value = Math.round(colV); $('col-vv').textContent = Math.round(colV);
  $('col-sw').style.background = hex; if (document.activeElement !== $('col-hex')) $('col-hex').value = hex;
  $('col-s').style.background = 'linear-gradient(90deg,' + rgbToHex(hsvToRgb(colH, 0, colV)) + ',' + rgbToHex(hsvToRgb(colH, 100, colV)) + ')';
  $('col-v').style.background = 'linear-gradient(90deg,#000,' + rgbToHex(hsvToRgb(colH, colS, 100)) + ')'; }

function colApply() { if (onPick) { onPick(rgbToHex(hsvToRgb(colH, colS, colV))); return; } // отдаём цвет цели (эффекту), активный не трогаем
  if (replaceFrom) return; // в режиме замены активный цвет не трогаем — только превью в col-sw
  S.active = hsvToRgb(colH, colS, colV); bus.emit('palette'); bus.emit('render'); }

export function syncColFromActive() { const [h, s, v] = rgbToHsv(S.active[0], S.active[1], S.active[2]); colH = h; colS = s; colV = v; syncColUI(); }

// кружок цвета открывает СРАЗУ пикер и палитру (это два отдельных перетаскиваемых
// окна — можно растащить); повторный тап при обоих открытых — прячет оба.
function openColPop() { const pb = $('palbar'), cp = $('colpop');
  if (!pb.classList.contains('closed') && cp.classList.contains('on')) { pb.classList.add('closed'); cp.classList.remove('on'); onPick = null; return; }
  pb.classList.remove('closed'); replaceFrom = null; onPick = null; setAddLabel(); $('fx-edit').classList.remove('on'); syncColFromActive(); cp.classList.add('on'); }

// открыть наш пикер для выбора нового цвета в палитру (вместо нативного input)
export function openColPick() { replaceFrom = null; onPick = null; setAddLabel(); $('fx-edit').classList.remove('on'); syncColFromActive(); $('colpop').classList.add('on'); }

// открыть наш пикер в режиме «заменить цвет from на выбранный по всему рисунку»
export function openColReplace(from) { replaceFrom = null; onPick = null; replaceFrom = from.slice(); $('fx-edit').classList.remove('on');
  const seed = Array.isArray(from[0]) ? S.active : from;
  const [h, s, v] = rgbToHsv(seed[0], seed[1], seed[2]); colH = h; colS = s; colV = v; syncColUI(); setAddLabel(); $('colpop').classList.add('on'); }

// открыть наш пикер для произвольной цели (эффекты): cb(hex) на каждое изменение; окно эффекта не прячем
export function openColFor(hex, cb) { replaceFrom = null; onPick = cb || null;
  const [h, s, v] = rgbToHsv(...hexToRgb(hex)); colH = h; colS = s; colV = v; syncColUI(); setAddLabel(); $('colpop').classList.add('on'); }

export function mount() {
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
  $('col-h').addEventListener('input', () => { colH = +$('col-h').value; syncColUI(); colApply(); });
  $('col-s').addEventListener('input', () => { colS = +$('col-s').value; syncColUI(); colApply(); });
  $('col-v').addEventListener('input', () => { colV = +$('col-v').value; syncColUI(); colApply(); });
  $('col-hex').addEventListener('input', () => { const v = $('col-hex').value.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(v)) { const [h, s, vv] = rgbToHsv(...hexToRgb(v)); colH = h; colS = s; colV = vv; syncColUI(); colApply(); } });
  $('col-add').onclick = () => { const c = hsvToRgb(colH, colS, colV);
    if (onPick) { onPick = null; setAddLabel(); $('colpop').classList.remove('on'); return; } // «Готово» — закрыть пикер эффекта
    if (replaceFrom) { const from = replaceFrom; replaceFrom = null; setAddLabel(); $('colpop').classList.remove('on'); actions.run('recolor.all', from, c); return; }
    if (S.palette.some((p) => eqc(p, c))) return; S.palette.push(c.slice()); S.active = c.slice(); bus.emit('palette'); bus.emit('render'); };
  bus.on('color-sync', () => { if (onPick) return; if ($('colpop').classList.contains('on')) syncColFromActive(); }); // в режиме цели не сбрасываем на активный
  $('colpop').querySelector('.win-x').onclick = () => { onPick = null; $('colpop').classList.remove('on'); };
}

actions.register('color.pick', openColPick);     // выбрать новый цвет в палитру (вместо нативного input)
actions.register('color.replace', openColReplace); // заменить цвет по всему рисунку нашим пикером
actions.register('color.for', openColFor);        // выбрать цвет для произвольной цели (эффекты) нашим пикером
