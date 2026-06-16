// Перетаскивание слоёв/папок: между собой и внутрь папки (с задержкой).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { $ } from '../../core/dom.js';
import { dragGhost } from '../../core/drag-ghost.js';
import { dropZone, makeDropGap } from '../../core/drop-gap.js';
import { DROP_GAP_HOLD_MS } from '../../config/drag-drop.js';
import { folderChain } from '../../core/layers.js';
import { topOfFolder, folderLayers, folderInsertIndex, clearFolderEmptyPos, rememberEmptyFolderPositions } from './helpers.js';
import { setSquelch } from './list.js';
import { pinchActive } from './pinch.js';
import { FOLDER_HOLD_MS } from '../../config/timings.js';

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

// можно ли бросить перетаскиваемое внутрь папки fid (нельзя в себя/в своё поддерево)
function canIntoFolder(info, fid) {
  if (info.kind === 'layer') return true;
  return !dragFolderBlock(info.fid).some((f) => folderChain(fid).some((x) => x.id === f.id)); }

function layDrop(src, row, into, below) { const tIsFolder = row.classList.contains('frow');
  if (src.kind === 'layer') { const tL = tIsFolder ? null : S.layers[+row.dataset.li], tFid = tIsFolder ? +row.dataset.fid : null;
    const block = dragBlock(src.idx);
    if (tL && block.includes(tL)) return;
    const movedIdx = block.map((L) => S.layers.indexOf(L)).filter((i) => i >= 0);
    const restoreEmptyFolders = rememberEmptyFolderPositions(movedIdx);
    snapshot();
    for (const L of block) { const i = S.layers.indexOf(L); if (i >= 0) S.layers.splice(i, 1); }
    const dstFid = tIsFolder ? (into ? tFid : null) : (tL ? tL.fid : null);
    for (const L of block) L.fid = dstFid;
    // список рисуется сверху вниз от большего индекса к меньшему: «над целью» = индекс цели+1, «под целью» = индекс цели
    let dstIdx = tIsFolder ? folderInsertIndex(tFid) : S.layers.indexOf(tL) + (below ? 0 : 1); if (dstIdx < 0) dstIdx = S.layers.length;
    S.layers.splice(dstIdx, 0, ...block); restoreEmptyFolders(); clearFolderEmptyPos(dstFid);
    const ni = block.map((L) => S.layers.indexOf(L)).filter((i) => i >= 0); // сохранить выделение на новом месте
    S.cur = ni[ni.length - 1]; S.marked = ni.length > 1 ? new Set(ni) : new Set(); S.markedFolders.clear(); S.selFolder = null;
  } else { const foldersToMove = dragFolderBlock(src.fid);
    const tL = tIsFolder ? null : S.layers[+row.dataset.li], tFid = tIsFolder ? +row.dataset.fid : null;
    if (tIsFolder && foldersToMove.some((f) => f.id === +row.dataset.fid)) return;
    if (foldersToMove.some((f) => (tL && folderChain(tL.fid).some((x) => x.id === f.id)) || (tFid != null && folderChain(tFid).some((x) => x.id === f.id)))) return;
    snapshot(); const block = [];
    for (let i = S.layers.length - 1; i >= 0; i--) if (foldersToMove.some((f) => folderChain(S.layers[i].fid).some((x) => x.id === f.id))) block.unshift(S.layers.splice(i, 1)[0]);
    const newParent = tIsFolder ? (into ? tFid : (S.folders.find((f) => f.id === tFid)?.parent ?? null)) : (tL ? (tL.fid ?? null) : null);
    for (const f of foldersToMove) f.parent = newParent;
    let dstIdx; if (tIsFolder) dstIdx = folderInsertIndex(tFid); else if (tL && tL.fid != null) dstIdx = topOfFolder(tL.fid) + 1; else dstIdx = (tL ? S.layers.indexOf(tL) : S.layers.length - 1) + 1;
    dstIdx = Math.min(Math.max(dstIdx, 0), S.layers.length);
    if (block.length) S.layers.splice(dstIdx, 0, ...block);
    else for (const f of foldersToMove) f.emptyPos = dstIdx;
    for (const f of foldersToMove) if (block.length) delete f.emptyPos;
    clearFolderEmptyPos(newParent);
    S.cur = Math.min(S.cur, S.layers.length - 1); S.markedFolders = new Set(foldersToMove.map((f) => f.id)); S.selFolder = foldersToMove[0] ? foldersToMove[0].id : null; S.marked.clear(); }
  dirtyAll(); bus.emitDoc(); }

export function dragRow(el, info) {
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; if (e.pointerType === 'mouse' && e.button !== 0) return;
    const sx = e.clientX, sy = e.clientY, box = $('lay-list');
    let started = false, ghost = null, dropRow = null, dropKey = '', dropBelow = false, dropInto = false, holdTimer = null;
    const gap = makeDropGap({ axis: 'y', className: 'layer-drop-gap' });

    // Место вставки фиксируем синхронно (dropRow/dropBelow/dropInto) и читаем
    // его на отпускании — зазор (gap) только визуальный и раскрывается с
    // задержкой, поэтому опираться на gap.active нельзя: быстрый бросок до
    // раскрытия зазора иначе ничего не делает.
    // Над папкой после FOLDER_HOLD_MS добавляется drop-into (синий) — до этого
    // момента отпускание над папкой работает как обычная перестановка рядом.
    const setDrop = (row, zone) => {
      const into = row.classList.contains('frow') && zone.zone === 'center' && canIntoFolder(info, +row.dataset.fid);
      const below = zone.after, key = row.dataset.li + ':' + row.dataset.fid + ':' + (into ? 'center' : (below ? 'after' : 'before'));
      if (key === dropKey) return;
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      if (dropRow) dropRow.classList.remove('drop-into');
      dropRow = row; dropKey = key; dropBelow = below; dropInto = false;
      if (into) { gap.cancel(); holdTimer = setTimeout(() => { row.classList.add('drop-into'); dropInto = true; }, FOLDER_HOLD_MS); return; }
      gap.request(box, row, below, row, key, DROP_GAP_HOLD_MS);
    };

    const move = (ev) => {
      if (pinchActive()) return;
      const ddx = ev.clientX - sx, ddy = ev.clientY - sy;
      if (!started && Math.hypot(ddx, ddy) > 7 && Math.abs(ddy) >= Math.abs(ddx)) {
        started = true; el.classList.add('dragging');
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
        const blk = dragBlock(info.idx);
        const stackCount = info.kind === 'folder' ? (S.markedFolders.has(info.fid) ? S.markedFolders.size : 1) : blk.length;
        ghost = dragGhost(el, el.getBoundingClientRect().width, stackCount); ghost.move(ev.clientX, ev.clientY);
        if (info.kind === 'layer' && blk.length > 1)
          box.querySelectorAll('#lay-list .lrow[data-li]').forEach((r) => { if (blk.includes(S.layers[+r.dataset.li])) r.classList.add('dragging'); });
        if (info.kind === 'folder' && S.markedFolders.has(info.fid) && S.markedFolders.size > 1)
          box.querySelectorAll('#lay-list .lrow[data-fid]').forEach((r) => { if (S.markedFolders.has(+r.dataset.fid)) r.classList.add('dragging'); });
      }
      if (!started) return;
      // призрак нельзя выносить за пределы панели слоёв — иначе он «зависает»;
      // зажимаем и его, и точку попадания в границы окна #lay-pop
      const pr = ($('lay-pop') || box).getBoundingClientRect();
      const gx = Math.max(pr.left + 8, Math.min(ev.clientX, pr.right - 8));
      const gy = Math.max(pr.top + 8, Math.min(ev.clientY, pr.bottom - 8));
      ghost.move(gx, gy);
      const t = document.elementFromPoint(gx, gy);
      const row = t && t.closest ? t.closest('#lay-list .lrow:not(.dragging)') : null;
      if (!row) return; // над открытым зазором держим текущую цель, чтобы gap не дрожал
      // нижняя половина строки-слоя → встать под неё (для папок — только над/внутрь)
      const canInto = row.classList.contains('frow') && canIntoFolder(info, +row.dataset.fid);
      setDrop(row, dropZone(row, gx, gy, 'y', canInto ? undefined : 0));
    };

    const up = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up);
      if (holdTimer) clearTimeout(holdTimer);
      if (ghost) ghost.remove();
      box.querySelectorAll('.dragging').forEach((r) => r.classList.remove('dragging'));
      const target = dropRow, into = dropInto, below = !into && dropBelow;
      box.querySelectorAll('.drop-into').forEach((r) => r.classList.remove('drop-into'));
      gap.remove();
      if (!started) return; setSquelch(true); setTimeout(() => setSquelch(false), 0);
      if (target) { layDrop(info, target, into, below);
        const dropped = $('lay-list').querySelector('.lrow[data-li="' + S.cur + '"]');
        if (dropped) { dropped.classList.add('dropped'); dropped.addEventListener('animationend', () => dropped.classList.remove('dropped'), { once: true }); } }
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  });
}
