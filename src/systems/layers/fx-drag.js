// Перетаскивание строк эффектов: переупорядочивание внутри слоя (порядок в стеке
// важен — обводка над/под свечением) и перенос на другой слой/папку. Тянется весь
// выделенный набор. Манипуляция данными — как в layers/drag.js (snapshot + splice).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { dragGhost } from '../../core/drag-ghost.js';

const ownerIndex = (eff) => { for (const L of S.layers) { const i = L.effects.indexOf(eff); if (i >= 0) return [L, i]; }
  for (const f of S.folders) { const i = (f.effects || []).indexOf(eff); if (i >= 0) return [f, i]; } return [null, -1]; };

function rowTarget(row) { if (!row) return null;
  if (row.dataset.li != null) return S.layers[+row.dataset.li];
  if (row.dataset.fid != null) return S.folders.find((f) => f.id === +row.dataset.fid); return null; }

function block(eff) { if (!(S.fxSel.has(eff) && S.fxSel.size > 1)) return [eff]; const out = [];
  for (const L of S.layers) for (const e of L.effects) if (S.fxSel.has(e)) out.push(e);
  for (const f of S.folders) for (const e of (f.effects || [])) if (S.fxSel.has(e)) out.push(e); return out; }

function drop(blk, row) {
  let owner, at;
  if (row.classList.contains('fxrow')) { if (blk.includes(row.__eff)) return; const [o, j] = ownerIndex(row.__eff); if (!o) return; owner = o; at = j + 1; }
  else { owner = rowTarget(row); if (!owner) return; at = owner.effects.length; }
  snapshot();
  for (const e of blk) { const [o, k] = ownerIndex(e); if (o) { o.effects.splice(k, 1); if (o === owner && k < at) at--; } }
  owner.effects.splice(at, 0, ...blk); bus.emit('layers'); bus.emit('render');
}

const findRow = (x, y) => { const t = document.elementFromPoint(x, y); return t && t.closest ? t.closest('#lay-list .lrow, #lay-list .fxrow') : null; };

export function fxDrag(el) {
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY; let started = false, ghost = null, blk = null, hot = null;
    const move = (ev) => {
      if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 7) { started = true; el.classList.add('dragging');
        blk = block(el.__eff); ghost = dragGhost(el, el.getBoundingClientRect().width, blk.length); }
      if (!started) return; ghost.move(ev.clientX, ev.clientY);
      const row = findRow(ev.clientX, ev.clientY); if (row === hot) return;
      if (hot) hot.classList.remove('fxdrop'); hot = row;
      if (row && !blk.includes(row.__eff)) row.classList.add('fxdrop'); };
    const up = (ev) => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if (ghost) ghost.remove(); el.classList.remove('dragging'); if (hot) hot.classList.remove('fxdrop');
      if (!started) return; const row = findRow(ev.clientX, ev.clientY); if (row) drop(blk, row); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); });
}
