import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $ } from '../core/dom.js';
import { clampRound } from '../logic/math.js';

const clampStep = (v) => clampRound(+v || 1, 1, 128);
const clampOpacity = (v) => clampRound(+v || 70, 5, 100);
let backup = null;

function ensureGrid() {
  S.grid ||= {};
  S.grid.w = clampStep(S.grid.w || 16);
  S.grid.h = clampStep(S.grid.h || 16);
  S.grid.color ||= '#4aa3ff';
  S.grid.opacity = clampOpacity(S.grid.opacity);
  S.grid.visible = !!S.grid.visible;
  S.grid.preview = !!S.grid.preview;
  S.grid.link = S.grid.link !== false;
  return S.grid;
}

function sync() {
  const g = ensureGrid();
  $('grid-w').value = g.w;
  $('grid-h').value = g.h;
  $('grid-op').value = g.opacity;
  $('grid-opv').textContent = g.opacity + '%';
  $('grid-color').style.background = g.color;
  $('grid-link').classList.toggle('on', !!g.link);
  $('grid-btn').classList.toggle('on', !!g.visible);
}

const snapshotGrid = () => ({ ...ensureGrid() });

function closeGridPop(restore) {
  if (restore && backup) Object.assign(S.grid, backup);
  ensureGrid().preview = false;
  backup = null;
  $('grid-pop').classList.remove('on');
  sync();
  bus.emit('render');
}

function previewChange(from) {
  const g = ensureGrid();
  let w = clampStep($('grid-w').value), h = clampStep($('grid-h').value);
  if (g.link && from === 'w') h = w;
  if (g.link && from === 'h') w = h;
  g.w = w; g.h = h; g.opacity = clampOpacity($('grid-op').value);
  g.preview = true;
  g.visible = false;
  sync();
  bus.emit('render');
}

export function openGridPop() {
  const g = ensureGrid();
  if ($('grid-pop').classList.contains('on')) { closeGridPop(true); return; }
  if (g.visible) { g.visible = false; g.preview = false; sync(); bus.emit('render'); return; }
  backup = snapshotGrid();
  g.preview = true;
  sync();
  $('grid-pop').classList.add('on');
  bus.emit('render');
}

function applyGrid() {
  const g = ensureGrid();
  previewChange();
  g.preview = false;
  g.visible = true;
  backup = null;
  $('grid-pop').classList.remove('on');
  sync();
  bus.emit('render');
}

export function mount() {
  sync();
  $('grid-btn').onclick = openGridPop;
  $('grid-pop').querySelector('.win-x').onclick = () => closeGridPop(true);
  $('grid-cancel').onclick = () => closeGridPop(true);
  $('grid-apply').onclick = applyGrid;
  $('grid-link').onclick = () => { const g = ensureGrid(); g.link = !g.link; previewChange(); };
  $('grid-w').addEventListener('input', () => previewChange('w'));
  $('grid-h').addEventListener('input', () => previewChange('h'));
  $('grid-op').addEventListener('input', () => previewChange());
  $('grid-color').onclick = () => actions.run('color.for', ensureGrid().color, (hex) => {
    const g = ensureGrid();
    g.color = hex;
    g.preview = true;
    g.visible = false;
    sync();
    bus.emit('render');
  });
}

actions.register('grid.open', openGridPop);
