// Кнопки панелей: инструменты, переключатели (симметрия/pp/стабилизация),
// эффекты и экспорт. Кросс-системные операции — через actions.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, showMenuAt, toast, t } from '../core/dom.js';
import { setTool } from '../core/tools.js';
import { longPress } from '../core/long-press.js';
import { saveBrushPrefs } from '../core/brush-prefs.js';

const TOOLS = ['pencil', 'eraser', 'fill', 'select', 'lasso', 'line', 'move', 'adjust'];

const ICONS = {
  line: '<svg viewBox="0 0 24 24"><path d="M6 18 18 6"/></svg>',
  contour: '<svg viewBox="0 0 24 24"><path d="M5 15c1.3-6.5 8.6-10.2 12.6-5.4 3.7 4.4-1.4 9.5-7.2 8.6-2.7-.4-4.6-1.5-5.4-3.2z"/></svg>',
  rect: '<svg viewBox="0 0 24 24"><rect x="4.5" y="6.5" width="15" height="11" rx="1.5"/></svg>',
  rectFill: '<svg viewBox="0 0 24 24"><rect x="4.5" y="6.5" width="15" height="11" rx="1.5" fill="currentColor"/><rect x="4.5" y="6.5" width="15" height="11" rx="1.5"/></svg>',
  ellipse: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7.5" ry="5.5"/></svg>',
  ellipseFill: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7.5" ry="5.5" fill="currentColor"/><ellipse cx="12" cy="12" rx="7.5" ry="5.5"/></svg>',
};

const LINE_MODES = [
  { mode: 'line', icon: 'line', key: 'tool.lineStraight' },
  { mode: 'contour', icon: 'contour', key: 'tool.lineContour' },
];
const SHAPE_MODES = [
  { tool: 'rect', fill: false, icon: 'rect', key: 'tool.rect' },
  { tool: 'rect', fill: true, icon: 'rectFill', key: 'tool.rectFill' },
  { tool: 'ellipse', fill: false, icon: 'ellipse', key: 'tool.ellipse' },
  { tool: 'ellipse', fill: true, icon: 'ellipseFill', key: 'tool.ellipseFill' },
];

function setButtonIcon(btn, mode) {
  if (!btn || !mode) return;
  btn.innerHTML = ICONS[mode.icon];
  btn.dataset.i18nTitle = mode.key;
  btn.title = t(mode.key);
}

function currentLineMode() { return LINE_MODES.find((m) => m.mode === S.lineMode) || LINE_MODES[0]; }
function currentShapeMode() { const tool = S.shapeTool || (S.tool === 'ellipse' ? 'ellipse' : 'rect'), fill = !!S.fillShape[tool];
  return SHAPE_MODES.find((m) => m.tool === tool && m.fill === fill) || SHAPE_MODES[0]; }

function syncChoiceMenus() {
  const line = $('line-choice'); if (line) for (const b of line.querySelectorAll('button')) b.classList.toggle('on', b.dataset.lineMode === S.lineMode);
  const shape = $('shape-choice'); if (shape) for (const b of shape.querySelectorAll('button')) b.classList.toggle('on', b.dataset.shapeTool === (S.shapeTool || 'rect') && (b.dataset.fill === '1') === !!S.fillShape[S.shapeTool || 'rect']);
}

function syncModeButtons() {
  setButtonIcon($('t-line'), currentLineMode());
  setButtonIcon($('t-shape'), currentShapeMode());
  syncChoiceMenus();
}

function choiceButton(icon, key) {
  const b = document.createElement('button');
  b.innerHTML = ICONS[icon]; b.title = t(key); b.dataset.i18nTitle = key;
  return b;
}

function buildToolChoices() {
  const line = $('line-choice');
  if (line && !line.dataset.ready) { line.dataset.ready = '1';
    for (const m of LINE_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.lineMode = m.mode;
      b.onclick = () => { S.lineMode = m.mode; line.classList.remove('on'); setTool('line'); syncModeButtons(); };
      line.appendChild(b); } }
  const shape = $('shape-choice');
  if (shape && !shape.dataset.ready) { shape.dataset.ready = '1';
    for (const m of SHAPE_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.shapeTool = m.tool; b.dataset.fill = m.fill ? '1' : '0';
      b.onclick = () => { S.shapeTool = m.tool; S.fillShape[m.tool] = m.fill; shape.classList.remove('on'); setTool(m.tool); syncModeButtons(); };
      shape.appendChild(b); } }
}

function showToolChoice(menuId, anchor) {
  const r = anchor.getBoundingClientRect();
  syncModeButtons(); showMenuAt($(menuId), r.left + r.width / 2, r.bottom + 2);
}

function syncToolButtons() {
  for (const id of TOOLS) { const b = $('t-' + id); if (b) b.classList.toggle('on', S.tool === id); }
  const shapeOn = S.tool === 'rect' || S.tool === 'ellipse';
  const shapeBtn = $('t-shape'); if (shapeBtn) shapeBtn.classList.toggle('on', shapeOn);
  $('t-select').classList.toggle('on', !S.rotMode && (S.tool === 'select' || !!S.sel));
  $('t-move').classList.toggle('on', !!S.rotMode);
  syncModeButtons();
  $('cv').style.cursor = S.tool === 'move' ? 'move' : ''; // пипетка (bb-pick «on», body.picking) — на Eyedropper System
}

function toggle(flag, btnId, onKey, offKey, save = false) { S[flag] = !S[flag]; if (save) saveBrushPrefs(S);
  $(btnId).classList.toggle('on', S[flag]); bus.emit('render'); toast(t(S[flag] ? onKey : offKey)); }
// повторное нажатие активной кнопки выделения — снять выделение и выйти из режима
const selOff = () => { if (S.sel) actions.run('select.none'); setTool('pencil'); };
const brushClick = (tool) => { if (S.tool === tool) actions.run('ui.brushLibrary', tool); else setTool(tool); };

export function mount() {
  buildToolChoices();
  $('t-pencil').onclick = () => brushClick('pencil'); // первый ЛКМ — инструмент, второй — библиотека кистей
  $('t-eraser').onclick = () => brushClick('eraser');
  longPress($('t-pencil'), () => actions.run('ui.brushLibrary', 'pencil')); // ПКМ/долгое нажатие — галерея кистей
  longPress($('t-eraser'), () => actions.run('ui.brushLibrary', 'eraser'));
  $('t-line').onclick = (e) => showToolChoice('line-choice', e.currentTarget);
  $('t-line').addEventListener('contextmenu', (e) => { e.preventDefault(); showToolChoice('line-choice', e.currentTarget); });
  $('t-shape').onclick = (e) => showToolChoice('shape-choice', e.currentTarget);
  $('t-shape').addEventListener('contextmenu', (e) => { e.preventDefault(); showToolChoice('shape-choice', e.currentTarget); });
  $('t-move').onclick = () => actions.run(S.rotMode ? 'transform.apply' : 'transform.enter'); // повторное нажатие — применить и выключить
  $('t-select').onclick = () => ((S.tool === 'select' || S.sel) ? selOff() : setTool('select'));
  $('t-lasso').onclick = () => (S.tool === 'lasso' ? selOff() : setTool('lasso'));
  $('t-fill').onclick = () => { if (S.sel) actions.run('selection.fill'); else setTool('fill'); };
  $('t-adjust').onclick = () => { if (S.tool === 'adjust') $('adjpop').classList.toggle('on'); else setTool('adjust'); };

  $('sym').onclick = () => toggle('sym', 'sym', 'toast.symVon', 'toast.symVoff');
  $('sym-h').onclick = () => toggle('symH', 'sym-h', 'toast.symHon', 'toast.symHoff');
  $('pp').onclick = () => toggle('ppOn', 'pp', 'toast.ppOn', 'toast.ppOff', true);
  $('stab').onclick = () => toggle('stabOn', 'stab', 'toast.stabOn', 'toast.stabOff', true);

  $('flip-h').onclick = () => actions.run('layer.flipH');
  $('flip-v').onclick = () => actions.run('layer.flipV');
  $('rot').onclick = () => actions.run('canvas.rotate');
  $('mono').onclick = () => actions.run('effect.mono');
  $('bc').onclick = () => actions.run('effect.bc');
  $('trim').onclick = () => actions.run('canvas.trim');
  $('center').onclick = () => actions.run('layer.center');

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
