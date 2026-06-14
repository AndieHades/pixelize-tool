// Диспетчер импорта файла кисти → нормализованные записи кончика.
// Запись: { name, source, shape:'shape'|'round', cov|null, params }.
// Пока поддержан Procreate (.brush); Photoshop (.abr) — следующая итерация.
import { importProcreate } from './procreate.js';

const baseName = (n) => n.replace(/\.[^.]+$/, '');

export async function importBrushFile(file) {
  const buf = await file.arrayBuffer();
  if (/\.brush$/i.test(file.name)) return importProcreate(buf, baseName(file.name));
  throw new Error('brush: unsupported format: ' + file.name);
}
