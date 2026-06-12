// Перетаскивание слоёв/папок: между собой, внутрь папки и наружу.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { $ } from '../../core/dom.js';
import { dragGhost } from '../../core/drag-ghost.js';
import { folderChain } from '../../core/layers.js';
import { topOfFolder, commonParent, folderLayers } from './helpers.js';
import { setSquelch } from './list.js';
import { pinchActive } from './pinch.js';

function folderFromLayers(block, target) {
  const members = [...new Set([target, ...block])].filter(Boolean), idxs = members.map((L) => S.layers.indexOf(L)).filter((i) => i >= 0).sort((a, b) => a - b);
  if (idxs.length < 2) return false;
  const moved = idxs.map((i) => S.layers[i]), parent = commonParent(moved); // новая группа вложится в общую папку слоёв
  snapshot(); const f = { id: ++S.folderSeq, name: 'Папка ' + S.folderSeq, open: true, visible: true, symLock: false, parent };
  S.folders.push(f);
  for (let j = idxs.length - 1; j >= 0; j--) S.layers.splice(idxs[j], 1);
  moved.forEach((L) => { L.fid = f.id; }); S.layers.splice(idxs[0], 0, ...moved);
  S.cur = idxs[0] + moved.length - 1; S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); return true; }

// выделение для перетаскивания: слои S.marked+S.cur + слои из выделенных папок
export function dragBlock(srcIdx) { const sel = new Set(S.marked); sel.add(S.cur);
  for (const fid of S.markedFolders) { const f = S.folders.find((x) => x.id === fid);
    if (f) for (const L of folderLayers(f)) { const i = S.layers.indexOf(L); if (i >= 0) sel.add(i); } }
  return (sel.size > 1 && (sel.has(srcIdx) || S.markedFolders.size > 0)) ? [...sel].filter((i) => S.layers[i]).sort((a, b) => a - b).map((i) => S.layers[i]) : [S.layers[srcIdx]]; }

// набор папок для перетаскивания: все выделенные папки если src в их числе, иначе одна
function dragFolderBlock(srcFid) {
  return (S.markedFolders.has(srcFid) && S.markedFolders.size > 1)
    ? [...S.markedFolders].map((fid) => S.folders.find((f) => f.id === fid)).filter(Boolean)
    : [S.folders.find((f) => f.id === srcFid)].filter(Boolean); }

function layDrop(src, row, into) { const tIsFolder = row.classList.contains('frow');
  if (src.kind === 'layer') { const tL = tIsFolder ? null : S.layers[+row.dataset.li], tFid = tIsFolder ? +row.dataset.fid : null;
    const block = dragBlock(src.idx);
    if (tL && block.includes(tL)) return;
    if (into && tL) { folderFromLayers(block, tL); return; } // бросок слоя в слой → новая (возможно вложенная) группа
    snapshot();
    for (const L of block) { const i = S.layers.indexOf(L); if (i >= 0) S.layers.splice(i, 1); }
    const dstFid = tIsFolder ? (into ? tFid : null) : (tL ? tL.fid : null);
    for (const L of block) L.fid = dstFid;
    let dstIdx = tIsFolder ? topOfFolder(tFid) + 1 : S.layers.indexOf(tL) + 1; if (dstIdx < 0) dstIdx = S.layers.length;
    S.layers.splice(dstIdx, 0, ...block); S.cur = dstIdx + block.length - 1;
  } else { const foldersToMove = dragFolderBlock(src.fid);
    const tL = tIsFolder ? null : S.layers[+row.dataset.li], tFid = tIsFolder ? +row.dataset.fid : null;
    if (tIsFolder && foldersToMove.some((f) => f.id === +row.dataset.fid)) return;
    if (foldersToMove.some((f) => (tL && folderChain(tL.fid).some((x) => x.id === f.id)) || (tFid != null && folderChain(tFid).some((x) => x.id === f.id)))) return;
    snapshot(); const block = [];
    for (let i = S.layers.length - 1; i >= 0; i--) if (foldersToMove.some((f) => folderChain(S.layers[i].fid).some((x) => x.id === f.id))) block.unshift(S.layers.splice(i, 1)[0]);
    const newParent = tIsFolder ? (into ? tFid : (S.folders.find((f) => f.id === tFid)?.parent ?? null)) : (tL ? (tL.fid ?? null) : null);
    for (const f of foldersToMove) f.parent = newParent;
    let dstIdx; if (tIsFolder) dstIdx = topOfFolder(tFid) + 1; else if (tL && tL.fid != null) dstIdx = topOfFolder(tL.fid) + 1; else dstIdx = (tL ? S.layers.indexOf(tL) : S.layers.length - 1) + 1;
    S.layers.splice(Math.min(Math.max(dstIdx, 0), S.layers.length), 0, ...block); S.cur = Math.min(S.cur, S.layers.length - 1); }
  S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; dirtyAll(); bus.emit('layers'); bus.emit('render'); }

export function dragRow(el, info) {
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY, box = $('lay-list');
    let started = false, ghost = null, lastDropRow = null, lastDropKind = null;

    const setDrop = (row, kind) => {
      if (row === lastDropRow && kind === lastDropKind) return; // no-op — prevent CSS restart
      if (lastDropRow) { lastDropRow.classList.remove('drop-above', 'drop-into'); }
      lastDropRow = row; lastDropKind = kind;
      if (row && kind) row.classList.add(kind);
    };

    const move = (ev) => {
      if (pinchActive()) return;
      const ddx = ev.clientX - sx, ddy = ev.clientY - sy;
      if (!started && Math.hypot(ddx, ddy) > 7 && Math.abs(ddy) >= Math.abs(ddx)) {
        started = true; el.classList.add('dragging');
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
        const blk = dragBlock(info.idx);
        const stackCount = info.kind === 'folder'
          ? (S.markedFolders.has(info.fid) ? S.markedFolders.size : 1)
          : blk.length;
        ghost = dragGhost(el, el.getBoundingClientRect().width, stackCount);
        ghost.move(ev.clientX, ev.clientY);
        if (info.kind === 'layer' && blk.length > 1) {
          box.querySelectorAll('#lay-list .lrow[data-li]').forEach((r) => { if (blk.includes(S.layers[+r.dataset.li])) r.classList.add('dragging'); });
        }
        if (info.kind === 'folder' && S.markedFolders.has(info.fid) && S.markedFolders.size > 1) {
          box.querySelectorAll('#lay-list .lrow[data-fid]').forEach((r) => { if (S.markedFolders.has(+r.dataset.fid)) r.classList.add('dragging'); });
        }
      }
      if (!started) return;
      ghost.move(ev.clientX, ev.clientY);
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      const row = t && t.closest ? t.closest('#lay-list .lrow:not(.dragging)') : null;
      if (!row) { setDrop(null, null); return; }
      const r = row.getBoundingClientRect();
      // drop-into only in central 20% of row; folder accepts drop-into only in top 40%
      const intoZone = row.classList.contains('frow')
        ? (info.kind === 'layer' && ev.clientY > r.top + r.height * 0.5 && ev.clientY < r.bottom - r.height * 0.25)
        : (info.kind === 'layer' && row.dataset.li && ev.clientY > r.top + r.height * 0.4 && ev.clientY < r.bottom - r.height * 0.4);
      setDrop(row, intoZone ? 'drop-into' : 'drop-above');
    };

    const up = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if (ghost) ghost.remove();
      box.querySelectorAll('.dragging').forEach((r) => r.classList.remove('dragging'));
      const intoEl = box.querySelector('.drop-into'), aboveEl = box.querySelector('.drop-above'), target = intoEl || aboveEl;
      setDrop(null, null);
      if (!started) return; setSquelch(true); setTimeout(() => setSquelch(false), 0);
      if (target) {
        layDrop(info, target, !!intoEl);
        const dropped = $('lay-list').querySelector('.lrow[data-li="' + S.cur + '"]');
        if (dropped) { dropped.classList.add('dropped'); dropped.addEventListener('animationend', () => dropped.classList.remove('dropped'), { once: true }); }
      }
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  });
}
