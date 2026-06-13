// Буфер обмена: копировать/вырезать/вставить/удалить (выделение или весь слой).
import { S, G, newLayer } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot, cloneGrid, doUndo, doRedo } from '../../core/history.js';
import { clearLayer } from '../../core/document.js';
import { markDirty, dirtyAll } from '../../core/layer-cache.js';
import { toast, t } from '../../core/dom.js';
import { MAX_LAYERS } from '../../config/limits.js';
import { fragFromSel, deleteSelContent, deselect } from './model.js';
import { commitFloat } from './float.js';

let clip = null;

export function doCopy() { clip = S.sel ? fragFromSel() : cloneGrid(G()); toast(S.sel ? t('toast.selCopied') : t('toast.layerCopied')); }
export function doCut() { clip = S.sel ? fragFromSel() : cloneGrid(G()); toast((S.sel ? deleteSelContent() : clearLayer()) ? t('toast.cut') : t('toast.hereEmpty')); }

export function doPaste() { if (!clip) { toast(t('toast.bufferEmpty')); return; } commitFloat(); snapshot();
  const px = S.sel ? S.sel.x0 : 0, py = S.sel ? S.sel.y0 : 0, asNew = S.layers.length < MAX_LAYERS;
  let g;
  if (asNew) { const nl = newLayer(t('layer.pasteName'), S.W, S.H); nl.fid = S.layers[S.cur].fid; // вставка — на новый слой
    S.layers.splice(S.cur + 1, 0, nl); S.cur++; S.marked.clear(); dirtyAll(); g = nl.grid; }
  else g = G(); // достигнут лимит слоёв — в активный
  for (let y = 0; y < clip.length; y++) for (let x = 0; x < clip[y].length; x++) { const c = clip[y][x]; if (!c) continue;
    const yy = py + y, xx = px + x; if (xx < 0 || yy < 0 || xx >= S.W || yy >= S.H) continue; g[yy][xx] = c.slice(); }
  S.sel = null; S.selMask = null;
  markDirty(S.cur); bus.emit('selection'); bus.emit('layers'); bus.emit('render'); toast(asNew ? t('toast.pastedNew') : t('toast.pasted')); }

export function doDelete() { if (S.fxCur || S.fxSel.size) { actions.run('fx.delete'); return; } // выбран эффект → удалить эффект, а не чистить слой
  if (S.sel ? deleteSelContent() : clearLayer()) toast(S.sel ? t('toast.selDeleted') : t('toast.layerCleared')); }

actions.register('edit.copy', doCopy); actions.register('edit.cut', doCut);
actions.register('edit.paste', doPaste); actions.register('edit.delete', doDelete);
actions.register('select.none', deselect);
actions.register('edit.undo', doUndo);
actions.register('edit.redo', doRedo);
