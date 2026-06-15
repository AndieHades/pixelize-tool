import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $ } from '../core/dom.js';

const clampStep = (v) => Math.max(1, Math.min(128, Math.round(+v || 1)));

function sync() {
  S.grid ||= { w: 1, h: 1, color: '#3a3a3a' };
  $('grid-w').value = clampStep(S.grid.w);
  $('grid-h').value = clampStep(S.grid.h);
  $('grid-color').style.background = S.grid.color || '#3a3a3a';
}

export function openGridPop() {
  sync();
  $('grid-pop').classList.add('on');
}

export function mount() {
  sync();
  $('grid-btn').onclick = openGridPop;
  $('grid-pop').querySelector('.win-x').onclick = () => $('grid-pop').classList.remove('on');
  $('grid-w').addEventListener('input', () => { S.grid.w = clampStep($('grid-w').value); sync(); bus.emit('render'); });
  $('grid-h').addEventListener('input', () => { S.grid.h = clampStep($('grid-h').value); sync(); bus.emit('render'); });
  $('grid-color').onclick = () => actions.run('color.for', S.grid.color || '#3a3a3a', (hex) => {
    S.grid.color = hex;
    sync();
    bus.emit('render');
  });
}

actions.register('grid.open', openGridPop);
