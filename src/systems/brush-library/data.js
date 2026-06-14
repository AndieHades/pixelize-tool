// Память библиотеки кистей: наборы (папки) и кисти с порядком/принадлежностью
// (как слои). Грузится из IndexedDB, мутации сразу персистятся. Активная кисть
// живёт в S.stampBrush — тут только каталог.
import { listBrushes, listSets, saveBrush, saveSet, removeBrush, removeSet } from '../../core/brush-store.js';
import { t } from '../../i18n/index.js';

export const lib = { sets: [], brushes: [], curSet: null };
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const byOrder = (a, b) => a.order - b.order;

let loaded = false;
export async function ensureLib() { if (loaded) return; loaded = true; await loadLib(); }

export async function loadLib() {
  lib.sets = (await listSets()).sort(byOrder);
  lib.brushes = (await listBrushes()).sort(byOrder);
  if (!lib.sets.length) { const s = { id: uid('s'), name: '', order: 0, imported: true }; await saveSet(s); lib.sets = [s]; }
  if (!lib.curSet || !lib.sets.some((s) => s.id === lib.curSet)) lib.curSet = lib.sets[0].id;
  if (!lib.brushes.length) await seedBase(lib.sets[0].id); // базовые кисти, если библиотека пуста
}

// встроенные базовые кисти (генерируются, без внешних файлов): круг, квадрат, дизеринг
async function seedBase(setId) {
  const square = { w: 1, h: 1, data: new Uint8Array([255]) }; // 1×1 → сплошной квадрат при ресемпле
  const checker = { w: 2, h: 2, data: new Uint8Array([0, 1, 1, 0]) }; // дизер-тайл (шахматка)
  const base = [
    { name: t('brush.round'), source: 'base', shape: 'round', cov: null, grain: null, params: {} },
    { name: t('brush.square'), source: 'base', shape: 'shape', cov: square, grain: null, params: {} },
    { name: t('brush.dither'), source: 'base', shape: 'round', cov: null, grain: checker, params: {} },
  ];
  for (const b of base) await addBrush(b, setId);
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
export async function delSet(id) {
  for (const b of brushesOf(id)) await delBrush(b.id);
  lib.sets = lib.sets.filter((s) => s.id !== id); await removeSet(id);
  if (!lib.sets.length) await loadLib(); // не оставляем библиотеку без наборов
  if (!lib.sets.some((s) => s.id === lib.curSet)) lib.curSet = lib.sets[0].id;
}
export async function renameBrush(b, name) { b.name = name || b.name; await saveBrush(b); }
export async function renameSet(s, name) { s.name = name; s.imported = false; await saveSet(s); }

// перенос кисти в набор (в конец)
export async function moveToSet(b, setId) { if (b.setId === setId) return; b.setId = setId; b.order = nextOrder(setId); await saveBrush(b); }
// перестановка кисти внутри набора относительно цели (below — встать ниже цели)
export async function reorder(b, targetId, below) {
  const arr = brushesOf(b.setId).filter((x) => x.id !== b.id);
  let to = arr.findIndex((x) => x.id === targetId); if (to < 0) return;
  arr.splice(below ? to + 1 : to, 0, b);
  for (let i = 0; i < arr.length; i++) if (arr[i].order !== i) { arr[i].order = i; await saveBrush(arr[i]); }
}
