// Перетаскивание строк эффектов — как у слоёв (layers/drag.js): захват указателя,
// раздвигающийся слот над/под строкой эффекта (переупорядочивание) и подсветка строки
// слоя/папки (перенос — эффект применяется к этому слою/папке). Тянется весь выделенный
// набор. Манипуляция данными — snapshot + splice по .effects (как в layers/drag.js).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { $ } from '../../core/dom.js';
import { dragGhost } from '../../core/drag-ghost.js';
import { setSquelch } from './list.js';

const ownerIndex = (eff) => { for (const L of S.layers) { const i = L.effects.indexOf(eff); if (i >= 0) return [L, i]; }
  for (const f of S.folders) { const i = (f.effects || []).indexOf(eff); if (i >= 0) return [f, i]; } return [null, -1]; };

const rowTarget = (row) => (row.dataset.li != null ? S.layers[+row.dataset.li]
  : row.dataset.fid != null ? S.folders.find((f) => f.id === +row.dataset.fid) : null);

// весь перетаскиваемый набор эффектов (в порядке стека), если тянем выделенную группу
function block(eff) { if (!(S.fxSel.has(eff) && S.fxSel.size > 1)) return [eff]; const out = [];
  for (const L of S.layers) for (const e of L.effects) if (S.fxSel.has(e)) out.push(e);
  for (const f of S.folders) for (const e of (f.effects || [])) if (S.fxSel.has(e)) out.push(e); return out; }

// row — строка эффекта (вставка над/под, верх списка = верх стека) или строка слоя/папки
// (применить к ней — встать наверх её стека эффектов). below — нижняя половина строки.
export function fxDrop(blk, row, below) { let owner, at;
  if (row.classList.contains('fxrow')) { if (blk.includes(row.__eff)) return;
    const [o, j] = ownerIndex(row.__eff); if (!o) return; owner = o; at = below ? j : j + 1; }
  else { owner = rowTarget(row); if (!owner) return; if (!owner.effects) owner.effects = []; at = owner.effects.length; }
  snapshot();
  for (const e of blk) { const [o, k] = ownerIndex(e); if (o) { o.effects.splice(k, 1); if (o === owner && k < at) at--; } }
  owner.effects.splice(at, 0, ...blk); dirtyAll(); bus.emitDoc(); } // dirtyAll — гарантированно сбросить кеш эффектов на старом и новом владельце

const findRow = (x, y) => { const t = document.elementFromPoint(x, y);
  return t && t.closest ? t.closest('#lay-list .fxrow:not(.dragging), #lay-list .lrow:not(.dragging)') : null; };

export function fxDrag(el) {
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY, box = $('lay-list'); let started = false, ghost = null, blk = null, hot = null, below = false;
    const clear = () => { if (hot) hot.classList.remove('fxdrop', 'drop-above', 'drop-below'); hot = null; };
    const move = (ev) => {
      if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 7) { started = true; blk = block(el.__eff);
        box.querySelectorAll('.fxrow').forEach((r) => { if (blk.includes(r.__eff)) r.classList.add('dragging'); });
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
        ghost = dragGhost(el, el.getBoundingClientRect().width, blk.length); }
      if (!started) return;
      const pr = ($('lay-pop') || box).getBoundingClientRect();
      const gx = Math.max(pr.left + 8, Math.min(ev.clientX, pr.right - 8)), gy = Math.max(pr.top + 8, Math.min(ev.clientY, pr.bottom - 8));
      ghost.move(gx, gy);
      const row = findRow(gx, gy); if (!row || blk.includes(row.__eff)) return; // над открытым слотом/пустотой/своей строкой — держим текущую цель (иначе слот мигает)
      const r = row.getBoundingClientRect(), lower = gy > r.top + r.height / 2;
      if (row === hot && lower === below) return; clear(); hot = row; below = lower;
      if (row.classList.contains('fxrow')) row.classList.add(lower ? 'drop-below' : 'drop-above'); else row.classList.add('fxdrop'); };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up);
      if (ghost) ghost.remove(); box.querySelectorAll('.fxrow.dragging').forEach((r) => r.classList.remove('dragging'));
      const target = hot, lower = below; clear();
      if (!started) return; setSquelch(true); setTimeout(() => setSquelch(false), 0);
      if (target) fxDrop(blk, target, lower); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up); });
}
