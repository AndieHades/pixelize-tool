// Диспетчер штампа: по активному инструменту кладёт кисть/ластик/коррекцию,
// заливает или подбирает цвет.
import { S } from '../../core/state.js';
import { setTool } from '../../core/tools.js';
import { brushStamp } from './brush.js';
import { adjustStamp } from './adjust.js';
import { flood } from './fill.js';
import { pickAt } from './pick.js';

export function stamp(x, y) {
  if (S.tool === 'select' || S.tool === 'move') return;
  if (S.tool === 'pencil' || S.tool === 'line' || S.tool === 'rect' || S.tool === 'ellipse') brushStamp(x, y, false);
  else if (S.tool === 'eraser') brushStamp(x, y, true);
  else if (S.tool === 'adjust') adjustStamp(x, y);
  else if (S.tool === 'pick') { pickAt(x, y); setTool('pencil'); }
  else if (S.tool === 'fill') flood(x, y);
}
