// Общие данные системы эффектов: активная цель (слой/папка), цели для вставки,
// и буфер обмена эффектов. Цель = объект с полем .effects.
import { S } from '../../core/state.js';
import { folderById } from '../../core/layers.js';

// объект, к которому привязываются новые эффекты: выбранная папка или активный слой
export const activeTarget = () => (S.selFolder != null ? folderById(S.selFolder) : S.layers[S.cur]);

// цели вставки: отмеченные слои (+активный) и выбранные папки; минимум — активная цель
export function pasteTargets() {
  const out = []; const li = new Set([...S.marked]); if (S.selFolder == null) li.add(S.cur);
  for (const i of li) if (S.layers[i]) out.push(S.layers[i]);
  for (const fid of new Set([...(S.selFolder != null ? [S.selFolder] : []), ...S.markedFolders])) {
    const f = folderById(fid); if (f && !out.includes(f)) out.push(f); }
  if (!out.length) { const a = activeTarget(); if (a) out.push(a); }
  return out;
}

let fxClip = []; // последний скопированный набор эффектов (данные)
export const getFxClip = () => fxClip;
export const setFxClip = (a) => { fxClip = a; };
