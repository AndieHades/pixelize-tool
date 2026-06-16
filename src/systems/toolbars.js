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
import { ICONS, BRUSH_MODES, LINE_MODES, SHAPE_MODES, SYM_MODES, SYM_TOOLS, FLIP_MODES } from '../config/toolbar.js';

const TOOLS = ['pencil', 'eraser', 'fill', 'select', 'lasso', 'line', 'move', 'adjust'];
let lastFlipMode = 'h';

function setButtonIcon(btn, mode) {
  if (!btn || !mode) return;
  btn.innerHTML = ICONS[mode.icon];
  btn.dataset.i18nTitle = mode.key;
  btn.title = t(mode.key);
}

function currentLineMode() { return LINE_MODES.find((m) => m.mode === S.lineMode) || LINE_MODES[0]; }
function currentBrushMode() { return S.shading && (S.shading.on || S.shading.picking) ? BRUSH_MODES[1] : BRUSH_MODES[0]; }
function currentShapeMode() { const tool = S.shapeTool || (S.tool === 'ellipse' ? 'ellipse' : 'rect'), fill = !!S.fillShape[tool];
  return SHAPE_MODES.find((m) => m.tool === tool && m.fill === fill) || SHAPE_MODES[0]; }
function currentSymMode() { const on = SYM_MODES.filter((m) => S[m.flag]);
  if (on.length > 1) return { icon: S.sym && S.symH && on.length === 2 ? 'symBoth' : 'symMulti', key: 'side.symBoth' };
  if (on.length === 1) return on[0]; return { icon: 'symV', key: 'side.symmetry' }; }
function currentFlipMode() { return FLIP_MODES.find((m) => m.mode === lastFlipMode) || FLIP_MODES[0]; }

function syncChoiceMenus() {
  const brush = $('brush-choice'); if (brush) for (const b of brush.querySelectorAll('button')) b.classList.toggle('on', b.dataset.brushMode === currentBrushMode().mode);
  const line = $('line-choice'); if (line) for (const b of line.querySelectorAll('button')) b.classList.toggle('on', b.dataset.lineMode === S.lineMode);
  const shape = $('shape-choice'); if (shape) for (const b of shape.querySelectorAll('button')) b.classList.toggle('on', b.dataset.shapeTool === (S.shapeTool || 'rect') && (b.dataset.fill === '1') === !!S.fillShape[S.shapeTool || 'rect']);
  const sym = $('sym-choice'); if (sym) for (const b of sym.querySelectorAll('button')) {
    if (b.dataset.symFlag) b.classList.toggle('on', !!S[b.dataset.symFlag]);
    if (b.dataset.symTool) b.classList.toggle('on', (S.symLines && S.symLines.mode) === b.dataset.symTool);
  }
  const flip = $('flip-choice'); if (flip) for (const b of flip.querySelectorAll('button')) b.classList.toggle('on', b.dataset.flipMode === lastFlipMode);
}

function syncModeButtons() {
  setButtonIcon($('t-pencil'), currentBrushMode());
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
  const brush = $('brush-choice');
  if (brush && !brush.dataset.ready) { brush.dataset.ready = '1';
    for (const m of BRUSH_MODES) { const b = choiceButton(m.icon, m.key); b.dataset.brushMode = m.mode;
      b.onclick = () => { brush.classList.remove('on'); setTool('pencil');
        if (m.mode === 'shading') { actions.run('shading.open'); if (!S.shading || !S.shading.colors || S.shading.colors.length < 2) actions.run('shading.pickColors'); }
        else actions.run('shading.disable');
        syncModeButtons(); };
      brush.appendChild(b); } }
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
function pencilClick(e) {
  if (S.tool !== 'pencil') setTool('pencil');
  actions.run('ui.brushLibrary', 'pencil');
  showToolChoice('brush-choice', e.currentTarget);
}
const brushClick = (tool) => { if (S.tool === tool) actions.run('ui.brushLibrary', tool); else setTool(tool); };

export function mount() {
  buildToolChoices();
  $('t-pencil').onclick = pencilClick;
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
  $('img-settings').onclick = () => actions.run('effect.bc', null, null, { scope: S.bgSel ? 'canvas' : 'layer' }); // фон → весь документ, слой/папка → к выбранному
  $('trim').onclick = () => actions.run('canvas.trim');
  $('center').onclick = () => actions.run('layer.center');

  $('zin').onclick = () => actions.run('zoom.in');
  $('zout').onclick = () => actions.run('zoom.out');
  $('fit').onclick = () => actions.run('view.fit');

  $('pp').classList.toggle('on', S.ppOn); $('stab').classList.toggle('on', S.stabOn); syncModeButtons();
  bus.on('tool', syncToolButtons); bus.on('selection', syncToolButtons); bus.on('shading', syncToolButtons); syncToolButtons();
}

actions.register('toggle.symV', () => toggleSym('sym'));
actions.register('toggle.symH', () => toggleSym('symH'));
actions.register('toggle.pixelPerfect', () => $('pp').click());
actions.register('toggle.stabilize', () => $('stab').click());
