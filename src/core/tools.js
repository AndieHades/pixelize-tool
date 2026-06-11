// Активный инструмент: смена + сигнал. Кнопки/курсор/бары реагируют на 'tool',
// не зная про систему инструмента.
import { S } from './state.js';
import * as bus from './bus.js';
import * as actions from './actions.js';

export function setTool(id) {
  S.tool = id; S.lineStart = null; S.linePrev = null;
  bus.emit('tool', id); bus.emit('render');
}

for (const t of ['pencil', 'eraser', 'pick', 'select', 'line', 'rect', 'move', 'adjust']) actions.register('tool.' + t, () => setTool(t));
actions.register('tool.fill', () => { if (S.sel) actions.run('selection.fill'); else setTool('fill'); });
