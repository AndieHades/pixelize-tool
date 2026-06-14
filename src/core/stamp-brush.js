// Активная импортированная кисть-штамп: запись кончика + токен для кеша маски.
// Системы рисования читают S.stampBrush; токен меняется при каждой смене кисти,
// чтобы кеш маски (в systems/draw/brush.js) пересобрался.
import { S } from './state.js';

let seq = 0;
export function setStampBrush(rec) { S.stampBrush = rec ? { ...rec, tok: ++seq } : null; }
export function clearStampBrush() { S.stampBrush = null; }
