// Индикатор размера документа в статус-баре. Обновляется на сменах размера
// (импорт, новый холст, кроп, поворот, трим — все шлют 'layers'/'fit'), а во
// время кропа — на каждый 'render', показывая текущий размер рамки рядом с холстом.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { $ } from '../core/dom.js';

function sync() { const el = $('status'); if (!el) return; const c = S.cropMode;
  el.textContent = c
    ? S.W + '×' + S.H + ' → ' + (c.x1 - c.x0 + 1) + '×' + (c.y1 - c.y0 + 1) + ' px'
    : S.W + '×' + S.H + ' px'; }

export function mount() { bus.on('layers', sync); bus.on('fit', sync); bus.on('render', sync); sync(); }
