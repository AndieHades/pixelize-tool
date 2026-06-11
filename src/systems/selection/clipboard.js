// Буфер обмена: копировать/вырезать/вставить/удалить (выделение или весь слой).
import { S, G, newLayer } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot, cloneGrid } from '../../core/history.js';
import { clearLayer } from '../../core/document.js';
import { markDirty, dirtyAll } from '../../core/layer-cache.js';
import { toast } from '../../core/dom.js';
import { MAX_LAYERS } from '../../config/limits.js';
import { normSel, fragFromSel, deleteSelContent, deselect } from './model.js';

let clip = null;

export function doCopy() { clip = S.sel ? fragFromSel() : cloneGrid(G()); toast(S.sel ? 'Выделение скопировано' : 'Слой скопирован'); }
export function doCut() { clip = S.sel ? fragFromSel() : cloneGrid(G()); toast((S.sel ? deleteSelContent() : clearLayer()) ? 'Вырезано' : 'Тут пусто'); }

export function doPaste() { if (!clip) { toast('Буфер пуст'); return; } snapshot();
  const px = S.sel ? S.sel.x0 : 0, py = S.sel ? S.sel.y0 : 0, asNew = S.layers.length < MAX_LAYERS;
  let g;
  if (asNew) { const nl = newLayer('Вставка', S.W, S.H); nl.fid = S.layers[S.cur].fid; // вставка — на новый слой
    S.layers.splice(S.cur + 1, 0, nl); S.cur++; S.marked.clear(); dirtyAll(); g = nl.grid; }
  else g = G(); // достигнут лимит слоёв — в активный
  for (let y = 0; y < clip.length; y++) for (let x = 0; x < clip[y].length; x++) { const c = clip[y][x]; if (!c) continue;
    const yy = py + y, xx = px + x; if (xx < 0 || yy < 0 || xx >= S.W || yy >= S.H) continue; g[yy][xx] = c.slice(); }
  S.sel = normSel(px, py, px + clip[0].length - 1, py + clip.length - 1);
  markDirty(S.cur); bus.emit('selection'); bus.emit('layers'); bus.emit('render'); toast(asNew ? 'Вставлено на новый слой' : 'Вставлено'); }

export function doDelete() { if (S.sel ? deleteSelContent() : clearLayer()) toast(S.sel ? 'Выделение удалено' : 'Слой очищен'); }

actions.register('edit.copy', doCopy); actions.register('edit.cut', doCut);
actions.register('edit.paste', doPaste); actions.register('edit.delete', doDelete);
actions.register('select.none', deselect);
