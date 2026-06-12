// Общие запросы по слоям/папкам (с учётом вложенных групп).
import { S } from '../../core/state.js';
import { folderChain } from '../../core/layers.js';

const inSubtree = (L, fid) => folderChain(L.fid).some((f) => f.id === fid); // слой лежит в поддереве папки
export const folderLayers = (f) => S.layers.filter((L) => inSubtree(L, f.id));
export function topOfFolder(fid) { let t = -1; for (let i = 0; i < S.layers.length; i++) if (inSubtree(S.layers[i], fid)) t = i; return t; }
// общая родительская папка набора слоёв (если одна) — новая группа вложится в неё
export function commonParent(layers) { const f0 = layers.length ? (layers[0].fid ?? null) : null;
  return layers.every((L) => (L.fid ?? null) === f0) ? f0 : null; }
// выделенные слои = активный + отмеченные; одиночные операции работают и над ними
export const selectedIdx = () => [...new Set([...S.marked, S.cur])].filter((i) => S.layers[i]).sort((a, b) => a - b);

// следующий id папки — заведомо больше всех существующих (даже если folderSeq
// отстал после загрузки старого проекта) → никаких коллизий id у папок
export function nextFolderId() { const max = S.folders.reduce((m, f) => Math.max(m, f.id), 0);
  S.folderSeq = Math.max(S.folderSeq, max) + 1; return S.folderSeq; }
// уникальное имя папки: к занятому добавляем счётчик («База 2», «База 3», …)
export function uniqueFolderName(base) { const used = new Set(S.folders.map((f) => f.name));
  if (!used.has(base)) return base; let n = 2; while (used.has(base + ' ' + n)) n++; return base + ' ' + n; }
