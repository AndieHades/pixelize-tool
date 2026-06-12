// История: снимок всего документа (слои + размеры) и откат. Восстановление
// шлёт события 'layers'/'render' — история не знает про системы визуала.
import { S } from './state.js';
import * as bus from './bus.js';
import { toast, t } from './dom.js';
import { dirtyAll } from './layer-cache.js';
import { historyCap } from '../config/limits.js';

export const cloneGrid = (g) => g.map((r) => r.map((c) => (c ? c.slice() : null)));

function snapState() {
  return { cur: S.cur, W: S.W, H: S.H, folderSeq: S.folderSeq, folders: S.folders.map((f) => ({ ...f })),
    layers: S.layers.map((L) => ({ name: L.name, opacity: L.opacity, visible: L.visible, fid: L.fid, clip: !!L.clip, symLock: !!L.symLock, ext: new Map(L.ext), grid: cloneGrid(L.grid) })) };
}

export function snapshot() { S.undoStack.push(snapState());
  const cap = historyCap(S.W * S.H); // глубина истории по площади холста (config)
  if (S.undoStack.length > cap) S.undoStack.splice(0, S.undoStack.length - cap);
  S.redoStack.length = 0; bus.emit('snapshot'); }

export function restore(s) { S.W = s.W; S.H = s.H; S.layers = s.layers; S.folders = s.folders; S.folderSeq = s.folderSeq;
  S.cur = Math.min(s.cur, S.layers.length - 1); S.marked.clear(); dirtyAll(); bus.emit('layers'); bus.emit('render'); }

// перехватчик undo: система (напр. трансформация) может на время «забрать» отмену
let undoGuard = null;
export const setUndoGuard = (fn) => { undoGuard = fn; };

export function doUndo() { if (undoGuard && undoGuard()) return;
  bus.emit('before-undo'); // незавершённые жесты (плавающее выделение) оседают до снимка
  if (!S.undoStack.length) { toast(t('toast.nothingUndo')); return; }
  S.redoStack.push(snapState()); restore(S.undoStack.pop()); toast(t('toast.undone')); }

export function doRedo() { if (!S.redoStack.length) return;
  bus.emit('before-undo');
  S.undoStack.push(snapState()); restore(S.redoStack.pop()); toast(t('toast.redone')); }
