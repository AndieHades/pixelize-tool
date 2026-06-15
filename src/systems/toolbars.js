// Кнопки панелей: инструменты, переключатели (симметрия/pp/стабилизация),
// эффекты и экспорт. Кросс-системные операции — через actions.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, showMenuForAnchor, toast, t } from '../core/dom.js';
import { setTool } from '../core/tools.js';
import { longPress } from '../core/long-press.js';
import { saveBrushPrefs } from '../core/brush-prefs.js';
import { ensureSymmetryDefaults } from '../core/layers.js';

const TOOLS = ['pencil', 'eraser', 'fill', 'select', 'lasso', 'line', 'move', 'adjust'];

const ICONS = {
  line: '<svg viewBox="0 0 24 24"><path d="M6 18 18 6"/></svg>',
  contour: '<svg viewBox="0 0 24 24"><path d="M5 15c1.3-6.5 8.6-10.2 12.6-5.4 3.7 4.4-1.4 9.5-7.2 8.6-2.7-.4-4.6-1.5-5.4-3.2z"/></svg>',
  rect: '<svg viewBox="0 0 24 24"><rect x="4.5" y="6.5" width="15" height="11" rx="1.5"/></svg>',
  rectFill: '<svg viewBox="0 0 24 24"><rect x="4.5" y="6.5" width="15" height="11" rx="1.5" fill="currentColor"/><rect x="4.5" y="6.5" width="15" height="11" rx="1.5"/></svg>',
  ellipse: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7.5" ry="5.5"/></svg>',
  ellipseFill: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7.5" ry="5.5" fill="currentColor"/><ellipse cx="12" cy="12" rx="7.5" ry="5.5"/></svg>',
  symV: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="3 3"/><path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/></svg>',
  symH: '<svg viewBox="0 0 24 24"><path d="M4 12h16" stroke-dasharray="3 3"/><path d="M8 8l4-4 4 4"/><path d="M8 16l4 4 4-4"/></svg>',
  symD1: '<svg viewBox="0 0 24 24"><path d="M5 19 19 5" stroke-dasharray="3 3"/><path d="M6 11l-3 3 3 3"/><path d="M18 7l3 3-3 3"/></svg>',
  symD2: '<svg viewBox="0 0 24 24"><path d="M5 5 19 19" stroke-dasharray="3 3"/><path d="M6 13l-3-3 3-3"/><path d="M18 17l3-3-3-3"/></svg>',
  symBoth: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="3 3"/><path d="M4 12h16" stroke-dasharray="3 3"/><path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/><path d="M8 8l4-4 4 4M8 16l4 4 4-4"/></svg>',
  symMulti: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="3 3"/><path d="M4 12h16" stroke-dasharray="3 3"/><path d="M6 18 18 6" stroke-dasharray="3 3"/><path d="M6 6 18 18" stroke-dasharray="3 3"/></svg>',
  symMove: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="3 3"/><path d="M8 8l4-4 4 4"/><path d="M8 16l4 4 4-4"/></svg>',
  symReset: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="3 3"/><path d="M4 12h16"/><path d="M8.5 7.5A5 5 0 1 1 7 11"/><path d="M7 7.5v3.5h3.5"/></svg>',
  flipH: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="2 2"/><path d="M8 7.5v9L3.8 12 8 7.5z" fill="currentColor" stroke="none"/><path d="M16 7.5v9l4.2-4.5L16 7.5z" fill="currentColor" stroke="none"/></svg>',
  flipV: '<svg viewBox="0 0 24 24"><path d="M4 12h16" stroke-dasharray="2 2"/><path d="M7.5 8h9L12 3.8 7.5 8z" fill="currentColor" stroke="none"/><path d="M7.5 16h9L12 20.2 7.5 16z" fill="currentColor" stroke="none"/></svg>',
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
const SYM_MODES = [
  { flag: 'sym', icon: 'symV', key: 'side.symV', onKey: 'toast.symVon', offKey: 'toast.symVoff' },
  { flag: 'symH', icon: 'symH', key: 'side.symH', onKey: 'toast.symHon', offKey: 'toast.symHoff' },
  { flag: 'symD1', icon: 'symD1', key: 'side.symD1', onKey: 'toast.symD1on', offKey: 'toast.symD1off' },
  { flag: 'symD2', icon: 'symD2', key: 'side.symD2', onKey: 'toast.symD2on', offKey: 'toast.symD2off' },
];
const SYM_TOOLS = [
  { mode: 'move', icon: 'symMove', key: 'side.symMove' },
  { mode: 'reset', icon: 'symReset', key: 'side.symReset' },
];
const FLIP_MODES = [
  { mode: 'h', icon: 'flipH', key: 'side.flipH', action: 'layer.flipH' },
  { mode: 'v', icon: 'flipV', key: 'side.flipV', action: 'layer.flipV' },
];
let lastFlipMode = 'h';

function setButtonIcon(btn, mode) {
  if (!btn || !mode) return;
  btn.innerHTML = ICONS[mode.icon];
  btn.dataset.i18nTitle = mode.key;
  btn.title = t(mode.key);
}

function currentLineMode() { return LINE_MODES.find((m) => m.mode === S.lineMode) || LINE_MODES[0]; }
function currentShapeMode() { const tool = S.shapeTool || (S.tool === 'ellipse' ? 'ellipse' : 'rect'), fill = !!S.fillShape[tool];
  return SHAPE_MODES.find((m) => m.tool === tool && m.fill === fill) || SHAPE_MODES[0]; }
function currentSymMode() { const on = SYM_MODES.filter((m) => S[m.flag]);
  if (on.length > 1) return { icon: S.sym && S.symH && on.length === 2 ? 'symBoth' : 'symMulti', key: 'side.symBoth' };
  if (on.length === 1) return on[0]; return { icon: 'symV', key: 'side.symmetry' }; }
function currentFlipMode() { return FLIP_MODES.find((m) => m.mode === lastFlipMode) || FLIP_MODES[0]; }

function syncChoiceMenus() {
  const line = $('line-choice'); if (line) for (const b of line.querySelectorAll('button')) b.classList.toggle('on', b.dataset.lineMode === S.lineMode);
  const shape = $('shape-choice'); if (shape) for (const b of shape.querySelectorAll('button')) b.classList.toggle('on', b.dataset.shapeTool === (S.shapeTool || 'rect') && (b.dataset.fill === '1') === !!S.fillShape[S.shapeTool || 'rect']);
  const sym = $('sym-choice'); if (sym) for (const b of sym.querySelectorAll('button')) {
    if (b.dataset.symFlag) b.classList.toggle('on', !!S[b.dataset.symFlag]);
    if (b.dataset.symTool) b.classList.toggle('on', (S.symLines && S.symLines.mode) === b.dataset.symTool);
  }
  const flip = $('flip-choice'); if (flip) for (const b of flip.querySelectorAll('button')) b.classList.toggle('on', b.dataset.flipMode === lastFlipMode);
}

function syncModeButtons() {
  setButtonIcon($('t-line'), currentLineMode());
  setButtonIcon($('t-shape'), currentShapeMode());
  setButtonIcon($('sym'), currentSymMode());
  setButtonIcon($('flip-h'), currentFlipMode());
  const sym = $('sym'); if (sym) sym.classList.toggle('on', !!(S.sym || S.symH || S.symD1 || S.symD2 || (S.symLines && S.symLines.mode)));
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
  const sym = $('sym-choice');
  if (sym && !sym.dataset.ready) { sym.dataset.ready = '1';
    for (const m of SYM_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.symFlag = m.flag;
      b.onclick = () => { toggleSym(m.flag); };
      sym.appendChild(b); } }
  if (sym && !sym.dataset.toolsReady) { sym.dataset.toolsReady = '1';
    for (const m of SYM_TOOLS) { const b = choiceButton(m.icon, m.key); b.dataset.symTool = m.mode;
      b.onclick = () => { S.symLines ||= { x: null, y: null, d1: null, d2: null, mode: null, hover: null };
        S.symLines.mode = S.symLines.mode === m.mode ? null : m.mode; S.symLines.hover = null; syncModeButtons(); bus.emit('render'); };
      sym.appendChild(b); } }
  const flip = $('flip-choice');
  if (flip && !flip.dataset.ready) { flip.dataset.ready = '1';
    for (const m of FLIP_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.flipMode = m.mode;
      b.onclick = () => { lastFlipMode = m.mode; flip.classList.remove('on'); syncModeButtons(); actions.run(m.action); };
      flip.appendChild(b); } }
}

function showToolChoice(menuId, anchor) {
  syncModeButtons(); showMenuForAnchor($(menuId), anchor);
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
function toggleSym(flag) { const m = SYM_MODES.find((x) => x.flag === flag); if (!m) return;
  ensureSymmetryDefaults();
  S[flag] = !S[flag]; syncModeButtons(); bus.emit('render'); bus.emit('layers'); toast(t(S[flag] ? m.onKey : m.offKey)); }
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

  $('sym').onclick = (e) => showToolChoice('sym-choice', e.currentTarget);
  $('sym').addEventListener('contextmenu', (e) => { e.preventDefault(); showToolChoice('sym-choice', e.currentTarget); });
  $('pp').onclick = () => toggle('ppOn', 'pp', 'toast.ppOn', 'toast.ppOff', true);
  $('stab').onclick = () => toggle('stabOn', 'stab', 'toast.stabOn', 'toast.stabOff', true);

  $('flip-h').onclick = (e) => showToolChoice('flip-choice', e.currentTarget);
  $('flip-h').addEventListener('contextmenu', (e) => { e.preventDefault(); showToolChoice('flip-choice', e.currentTarget); });
  $('rot').onclick = () => actions.run('canvas.rotate');
  $('mono').onclick = () => actions.run('effect.mono');
  $('bc').onclick = () => actions.run('effect.bc');
  $('trim').onclick = () => actions.run('canvas.trim');
  $('center').onclick = () => actions.run('layer.center');

  $('zin').onclick = () => actions.run('zoom.in');
  $('zout').onclick = () => actions.run('zoom.out');
  $('fit').onclick = () => actions.run('view.fit');

  $('pp').classList.toggle('on', S.ppOn); $('stab').classList.toggle('on', S.stabOn); syncModeButtons();
  bus.on('tool', syncToolButtons); bus.on('selection', syncToolButtons); syncToolButtons();
}

actions.register('toggle.symV', () => toggleSym('sym'));
actions.register('toggle.symH', () => toggleSym('symH'));
actions.register('toggle.pixelPerfect', () => $('pp').click());
actions.register('toggle.stabilize', () => $('stab').click());
