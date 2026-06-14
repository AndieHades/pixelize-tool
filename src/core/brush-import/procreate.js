// Импорт кисти Procreate (.brush): ZIP → кончик (Shape.png) и дизер-тайл (Grain.png).
// Нет Shape.png (типично для пиксельных кистей) — форма дефолтная круглая.
// Grain берём только мелкий (дизер-решётка); крупную бумажную текстуру игнорируем.
import { unzip } from '../zip.js';
import { blobToCoverage } from '../brush-decode.js';
import { BRUSH_SRC_MAX, BRUSH_GRAIN_NATIVE_MAX } from '../../config/brush-import.js';

export async function importProcreate(buf, name) {
  const files = await unzip(buf);
  const shapePng = files.get('Shape.png') || files.get('shape.png');
  let cov = null, kind = 'round';
  if (shapePng) { cov = await blobToCoverage(new Blob([shapePng]), BRUSH_SRC_MAX); kind = 'shape'; }
  const grainPng = files.get('Grain.png') || files.get('grain.png');
  let grain = null;
  if (grainPng) { const gc = await blobToCoverage(new Blob([grainPng]), BRUSH_GRAIN_NATIVE_MAX + 1);
    if (Math.max(gc.w, gc.h) <= BRUSH_GRAIN_NATIVE_MAX) grain = gc; } // крупный grain — следующая итерация (нужен масштаб)
  return [{ name, source: 'procreate', shape: kind, cov, grain, params: {} }];
}
