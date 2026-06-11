// Общие запросы по слоям/папкам для системы панели слоёв.
import { S } from '../../core/state.js';

export const folderLayers = (f) => S.layers.filter((L) => L.fid === f.id);
export function topOfFolder(fid) { let t = -1; for (let i = 0; i < S.layers.length; i++) if (S.layers[i].fid === fid) t = i; return t; }
