// Запросы к слоям: видимость с учётом папок, обтравка, замок симметрии.
// Чистые функции над состоянием S (без DOM).
import { S } from './state.js';

export const folderById = (id) => S.folders.find((x) => x.id === id);
export const layerFolder = (L) => (L && L.fid != null ? folderById(L.fid) : null);

// цепочка папок-предков (от ближайшей к корню) — основа вложенных групп
export function folderChain(fid) { const a = []; let id = fid; while (id != null) { const f = folderById(id); if (!f) break; a.push(f); id = f.parent ?? null; } return a; }

export const effVis = (i) => { const L = S.layers[i]; if (!L.visible) return false;
  for (const f of folderChain(L.fid)) if (!f.visible) return false; return true; };

export const layerSymLocked = (L) => !!(L && (L.symLock || folderChain(L.fid).some((f) => f.symLock)));

// ближайший видимый reference-слой над target; он задаёт границы заливки
export function referenceIndexFor(target) {
  for (let i = target + 1; i < S.layers.length; i++) if (S.layers[i].reference && effVis(i)) return i;
  return -1;
}

// база обтравки: ближайший необтравочный слой ниже (или -1)
export function clipBase(i) { if (!S.layers[i].clip) return -1;
  let j = i - 1; while (j >= 0 && S.layers[j].clip) j--; return j; }

// активна ли симметрия на текущем слое (с учётом замка слоя/папки)
export const symA = () => S.sym && !layerSymLocked(S.layers[S.cur]);   // лево-право
export const symHA = () => S.symH && !layerSymLocked(S.layers[S.cur]); // верх-низ
