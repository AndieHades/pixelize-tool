// Память библиотеки кистей: наборы (папки) и кисти с порядком/принадлежностью
// (как слои). Грузится из IndexedDB, мутации сразу персистятся. Активная кисть
// живёт в S.stampBrush — тут только каталог.
import { listBrushes, listSets, saveBrush, saveSet, removeBrush, removeSet } from '../../core/brush-store.js';

export const lib = { sets: [], brushes: [], curSet: null };
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const byOrder = (a, b) => a.order - b.order;

export async function loadLib() {
  lib.sets = (await listSets()).sort(byOrder);
  lib.brushes = (await listBrushes()).sort(byOrder);
  if (!lib.sets.length) { const s = { id: uid('s'), name: '', order: 0, imported: true }; await saveSet(s); lib.sets = [s]; }
  if (!lib.curSet || !lib.sets.some((s) => s.id === lib.curSet)) lib.curSet = lib.sets[0].id;
}

export const brushesOf = (setId) => lib.brushes.filter((b) => b.setId === setId).sort(byOrder);
const nextOrder = (setId) => brushesOf(setId).reduce((m, b) => Math.max(m, b.order), -1) + 1;

export async function addBrush(rec, setId) {
  const sid = setId || lib.curSet, b = { ...rec, id: uid('b'), setId: sid, order: nextOrder(sid) };
  lib.brushes.push(b); await saveBrush(b); return b;
}
export async function dupBrush(b) { const c = { ...b, id: uid('b'), order: nextOrder(b.setId) }; lib.brushes.push(c); await saveBrush(c); return c; }
export async function delBrush(id) { lib.brushes = lib.brushes.filter((b) => b.id !== id); await removeBrush(id); }
export async function addSet(name) {
  const s = { id: uid('s'), name: name || '', order: lib.sets.reduce((m, x) => Math.max(m, x.order), -1) + 1 };
  lib.sets.push(s); lib.curSet = s.id; await saveSet(s); return s;
}
export async function delSet(id) { for (const b of brushesOf(id)) await delBrush(b.id); lib.sets = lib.sets.filter((s) => s.id !== id); await removeSet(id); }
