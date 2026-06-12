// Перетаскивание слоёв/папок: между собой, внутрь папки и наружу.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { $ } from '../../core/dom.js';
import { dragGhost } from '../../core/drag-ghost.js';
import { topOfFolder } from './helpers.js';
import { setSquelch } from './list.js';
import { pinchActive } from './pinch.js';

function folderFromLayers(block, target) {
  const members = [...new Set([target, ...block])].filter(Boolean), idxs = members.map((L) => S.layers.indexOf(L)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (idxs.length < 2) return false;
  snapshot(); const f = { id: ++S.folderSeq, name: 'Папка ' + S.folderSeq, open: true, visible: true, symLock: false };
  S.folders.push(f); const moved = idxs.map((i) => S.layers[i]);
  for (let j = idxs.length - 1; j >= 0; j--) S.layers.splice(idxs[j], 1);
  moved.forEach((L) => { L.fid = f.id; }); S.layers.splice(idxs[0], 0, ...moved);
  S.cur = idxs[0] + moved.length - 1; S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); return true; }

function layDrop(src, row, into) { const tIsFolder = row.classList.contains('frow');
  if (src.kind === 'layer') { const tL = tIsFolder ? null : S.layers[+row.dataset.li], tFid = tIsFolder ? +row.dataset.fid : null;
    const block = (S.marked.size > 1 && S.marked.has(src.idx)) ? [...S.marked].sort((a, b) => a - b).map((i) => S.layers[i]) : [S.layers[src.idx]];
    if (tL && block.includes(tL)) return;
    // группируем, только если ещё не в одной папке; иначе (уже сгруппированы) — просто переставляем, не пересоздаём папку
    if (into && tL && !(tL.fid != null && block.every((L) => L.fid === tL.fid))) { folderFromLayers(block, tL); return; }
    snapshot();
    for (const L of block) { const i = S.layers.indexOf(L); if (i >= 0) S.layers.splice(i, 1); }
    const dstFid = tIsFolder ? (into ? tFid : null) : (tL ? tL.fid : null);
    for (const L of block) L.fid = dstFid;
    let dstIdx = tIsFolder ? topOfFolder(tFid) + 1 : S.layers.indexOf(tL) + 1; if (dstIdx < 0) dstIdx = S.layers.length;
    S.layers.splice(dstIdx, 0, ...block); S.cur = dstIdx + block.length - 1;
  } else { if (tIsFolder && +row.dataset.fid === src.fid) return;
    const tL = tIsFolder ? null : S.layers[+row.dataset.li]; if (tL && tL.fid === src.fid) return; const tFid = tIsFolder ? +row.dataset.fid : null;
    snapshot(); const block = [];
    for (let i = S.layers.length - 1; i >= 0; i--) if (S.layers[i].fid === src.fid) block.unshift(S.layers.splice(i, 1)[0]);
    let dstIdx; if (tIsFolder) dstIdx = topOfFolder(tFid) + 1; else if (tL.fid != null) dstIdx = topOfFolder(tL.fid) + 1; else dstIdx = S.layers.indexOf(tL) + 1;
    S.layers.splice(Math.min(dstIdx, S.layers.length), 0, ...block); S.cur = Math.min(S.cur, S.layers.length - 1); }
  S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); }

export function dragRow(el, info) {
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY, box = $('lay-list'); let started = false, ghost = null;
    const move = (ev) => {
      if (pinchActive()) return; // два пальца — это щипок-слияние, не перетаскивание
      const ddx = ev.clientX - sx, ddy = ev.clientY - sy; // перетаскивание — по вертикали; горизонталь отдаём свайпу
      if (!started && Math.hypot(ddx, ddy) > 7 && Math.abs(ddy) >= Math.abs(ddx)) { started = true; el.classList.add('dragging'); try { el.setPointerCapture(e.pointerId); } catch (err) {}
        ghost = dragGhost(el, el.getBoundingClientRect().width); ghost.move(ev.clientX, ev.clientY);
        if (info.kind === 'layer' && S.marked.size > 1 && S.marked.has(info.idx)) box.querySelectorAll('#lay-list .lrow[data-li]').forEach((r) => { if (S.marked.has(+r.dataset.li)) r.classList.add('dragging'); }); }
      if (!started) return; ghost.move(ev.clientX, ev.clientY);
      box.querySelectorAll('.drop-above,.drop-into').forEach((r) => r.classList.remove('drop-above', 'drop-into'));
      const t = document.elementFromPoint(ev.clientX, ev.clientY), row = t && t.closest ? t.closest('#lay-list .lrow') : null;
      if (!row || row === el) return; const r = row.getBoundingClientRect();
      if (info.kind === 'layer' && row.dataset.li && ev.clientY > r.top + r.height * 0.28 && ev.clientY < r.bottom - r.height * 0.28) row.classList.add('drop-into');
      else if (row.classList.contains('frow') && info.kind === 'layer' && ev.clientY > r.top + r.height / 2) row.classList.add('drop-into');
      else row.classList.add('drop-above'); };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if (ghost) ghost.remove(); box.querySelectorAll('.dragging').forEach((r) => r.classList.remove('dragging'));
      const into = $('lay-list').querySelector('.drop-into'), above = $('lay-list').querySelector('.drop-above'), target = into || above;
      $('lay-list').querySelectorAll('.drop-above,.drop-into').forEach((r) => r.classList.remove('drop-above', 'drop-into'));
      if (!started) return; setSquelch(true); setTimeout(() => setSquelch(false), 0); if (target) layDrop(info, target, !!into); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
}
