// Индикатор размера документа в статус-баре. Обновляется на сменах размера
// (импорт, новый холст, кроп, поворот, трим — все шлют 'layers'/'fit').
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { $ } from '../core/dom.js';

function sync() { const el = $('status'); if (el) el.textContent = S.W + '×' + S.H + ' px'; }

export function mount() { bus.on('layers', sync); bus.on('fit', sync); sync(); }
