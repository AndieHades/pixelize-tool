// Кнопки панелей: инструменты, переключатели (симметрия/pp/стабилизация),
// эффекты и экспорт. Кросс-системные операции — через actions.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast } from '../core/dom.js';
import { setTool } from '../core/tools.js';

const TOOLS = ['pencil', 'eraser', 'pick', 'fill', 'select', 'line', 'rect', 'move', 'adjust'];

function syncToolButtons() {
  for (const id of TOOLS) { const b = $('t-' + id); if (b) b.classList.toggle('on', S.tool === id); }
  $('bb-pick').classList.toggle('on', S.tool === 'pick');
  document.body.classList.toggle('picking', S.tool === 'pick');
  $('cv').style.cursor = S.tool === 'move' ? 'move' : '';
}

function toggle(flag, btnId, onMsg, offMsg) { S[flag] = !S[flag]; $(btnId).classList.toggle('on', S[flag]); bus.emit('render'); toast(S[flag] ? onMsg : offMsg); }

export function mount() {
  $('t-pencil').onclick = () => setTool('pencil');
  $('t-eraser').onclick = () => setTool('eraser');
  $('t-pick').onclick = () => setTool('pick');
  $('t-line').onclick = () => setTool('line');
  $('t-rect').onclick = () => setTool('rect');
  $('t-move').onclick = () => setTool('move');
  $('t-select').onclick = () => setTool('select');
  $('t-fill').onclick = () => { if (S.sel) actions.run('selection.fill'); else setTool('fill'); };
  $('t-adjust').onclick = () => { if (S.tool === 'adjust') $('adjpop').classList.toggle('on'); else setTool('adjust'); };

  $('sym').onclick = () => toggle('sym', 'sym', 'Симметрия лево-право включена', 'Симметрия лево-право выключена');
  $('sym-h').onclick = () => toggle('symH', 'sym-h', 'Симметрия верх-низ включена', 'Симметрия верх-низ выключена');
  $('pp').onclick = () => toggle('ppOn', 'pp', 'Пиксель-перфект включён', 'Пиксель-перфект выключен');
  $('stab').onclick = () => toggle('stabOn', 'stab', 'Стабилизация включена', 'Стабилизация выключена');

  $('outline').onclick = () => actions.run('effect.outline');
  $('flip-h').onclick = () => actions.run('layer.flipH');
  $('flip-v').onclick = () => actions.run('layer.flipV');
  $('rot').onclick = () => actions.run('canvas.rotate');
  $('mono').onclick = () => actions.run('effect.mono');
  $('bc').onclick = () => actions.run('effect.bc');
  $('trim').onclick = () => actions.run('canvas.trim');

  $('zin').onclick = () => actions.run('zoom.in');
  $('zout').onclick = () => actions.run('zoom.out');
  $('fit').onclick = () => actions.run('view.fit');
  $('exp').onclick = () => $('exp-ovl').classList.add('on');
  $('exp-png').onclick = () => { $('exp-ovl').classList.remove('on'); actions.run('file.exportPng'); };
  $('exp-psd').onclick = () => { $('exp-ovl').classList.remove('on'); actions.run('file.exportPsd'); };

  $('pp').classList.toggle('on', S.ppOn); $('stab').classList.toggle('on', S.stabOn);
  bus.on('tool', syncToolButtons); syncToolButtons();
}
