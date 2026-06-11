// Активный инструмент: смена + сигнал. Кнопки/курсор/бары реагируют на 'tool',
// не зная про систему инструмента.
import { S } from './state.js';
import * as bus from './bus.js';

export function setTool(id) {
  S.tool = id; S.lineStart = null; S.linePrev = null;
  bus.emit('tool', id); bus.emit('render');
}
