// Кнопки панелей: инструменты, переключатели (симметрия/pp/стабилизация),
// эффекты и экспорт. Кросс-системные операции — через actions.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast, t } from '../core/dom.js';
import { setTool } from '../core/tools.js';
import { longPress } from '../core/long-press.js';

const TOOLS = ['pencil', 'eraser', 'fill', 'select', 'lasso', 'line', 'rect', 'ellipse', 'move', 'adjust'];

// фигура (rect/ellipse): клик — выбрать, ПКМ по иконке — контур ↔ залитая
function wireShape(id, outlineKey, fillKey) { const b = $('t-' + id);
  const sync = () => { b.classList.toggle('toolfill', S.fillShape[id]);
    b.dataset.i18nTitle = S.fillShape[id] ? fillKey : outlineKey; b.title = t(b.dataset.i18nTitle); };
  b.onclick = () => setTool(id);
  b.addEventListener('contextmenu', (e) => { e.preventDefault(); S.fillShape[id] = !S.fillShape[id]; sync(); setTool(id); });
  sync(); }

function syncToolButtons() {
  for (const id of TOOLS) { const b = $('t-' + id); if (b) b.classList.toggle('on', S.tool === id); }
  $('t-select').classList.toggle('on', S.tool === 'select' || !!S.sel);
  $('t-move').classList.toggle('on', !!S.rotMode);
  $('cv').style.cursor = S.tool === 'move' ? 'move' : ''; // пипетка (bb-pick «on», body.picking) — на Eyedropper System
}

function toggle(flag, btnId, onKey, offKey) { S[flag] = !S[flag]; $(btnId).classList.toggle('on', S[flag]); bus.emit('render'); toast(t(S[flag] ? onKey : offKey)); }

export function mount() {
  $('t-pencil').onclick = () => setTool('pencil'); // ЛКМ — выбор инструмента
  $('t-eraser').onclick = () => setTool('eraser');
  longPress($('t-pencil'), () => actions.run('ui.brushLibrary', 'pencil')); // ПКМ/долгое нажатие — галерея кистей
  longPress($('t-eraser'), () => actions.run('ui.brushLibrary', 'eraser'));
  $('t-line').onclick = () => setTool('line');
  wireShape('rect', 'tool.rect', 'tool.rectFill');
  wireShape('ellipse', 'tool.ellipse', 'tool.ellipseFill');
  $('t-move').onclick = () => actions.run('transform.enter'); // Move = свободная трансформация (носить + размер + поворот), как Ctrl+T
  $('t-select').onclick = () => setTool('select');
  $('t-lasso').onclick = () => setTool('lasso');
  $('t-fill').onclick = () => { if (S.sel) actions.run('selection.fill'); else setTool('fill'); };
  $('t-adjust').onclick = () => { if (S.tool === 'adjust') $('adjpop').classList.toggle('on'); else setTool('adjust'); };

  $('sym').onclick = () => toggle('sym', 'sym', 'toast.symVon', 'toast.symVoff');
  $('sym-h').onclick = () => toggle('symH', 'sym-h', 'toast.symHon', 'toast.symHoff');
  $('pp').onclick = () => toggle('ppOn', 'pp', 'toast.ppOn', 'toast.ppOff');
  $('stab').onclick = () => toggle('stabOn', 'stab', 'toast.stabOn', 'toast.stabOff');

  $('flip-h').onclick = () => actions.run('layer.flipH');
  $('flip-v').onclick = () => actions.run('layer.flipV');
  $('rot').onclick = () => actions.run('canvas.rotate');
  $('mono').onclick = () => actions.run('effect.mono');
  $('bc').onclick = () => actions.run('effect.bc');
  $('trim').onclick = () => actions.run('canvas.trim');

  $('zin').onclick = () => actions.run('zoom.in');
  $('zout').onclick = () => actions.run('zoom.out');
  $('fit').onclick = () => actions.run('view.fit');

  $('pp').classList.toggle('on', S.ppOn); $('stab').classList.toggle('on', S.stabOn);
  bus.on('tool', syncToolButtons); bus.on('selection', syncToolButtons); syncToolButtons();
}

actions.register('toggle.symV', () => $('sym').click());
actions.register('toggle.symH', () => $('sym-h').click());
actions.register('toggle.pixelPerfect', () => $('pp').click());
actions.register('toggle.stabilize', () => $('stab').click());
