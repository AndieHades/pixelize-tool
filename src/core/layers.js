// Запросы к слоям: видимость с учётом папок, обтравка, замок симметрии.
// Чистые функции над состоянием S (без DOM).
import { S } from './state.js';

export const layerFolder = (L) => (L && L.fid != null ? S.folders.find((x) => x.id === L.fid) : null);

export const effVis = (i) => { const L = S.layers[i]; if (!L.visible) return false; if (L.fid == null) return true;
  const f = S.folders.find((x) => x.id === L.fid); return !f || f.visible; };

export const layerSymLocked = (L) => !!(L && (L.symLock || (layerFolder(L) && layerFolder(L).symLock)));

// база обтравки: ближайший необтравочный слой ниже (или -1)
export function clipBase(i) { if (!S.layers[i].clip) return -1;
  let j = i - 1; while (j >= 0 && S.layers[j].clip) j--; return j; }
