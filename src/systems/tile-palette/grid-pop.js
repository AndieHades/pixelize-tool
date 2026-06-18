// Попап выбора размера Tileset Grid: только числа (16/32/48/96/128), квадрат.
// Обычный menu-bubble: общий вид, закрытие и стрелка через core/dom.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { showMenuForAnchor } from '../../core/dom.js';
import { TILE_GRID_SIZES } from '../../config/tileset.js';

let pop = null;
const anchorBtn = () => document.querySelector('#tile-act [data-tb="gridsize"]');

function setSize(n) { S.tileGrid.size = n; try { localStorage.setItem('pxh.tileGrid', n); } catch (e) {}
  sync(); bus.emit('tileset-changed'); bus.emit('render'); }
function sync() { if (!pop) return; for (const b of pop.querySelectorAll('button')) b.classList.toggle('on', +b.dataset.sz === S.tileGrid.size); }

function build() { if (pop) return pop;
  pop = document.createElement('div'); pop.id = 'tilegrid-pop'; pop.className = 'tool-choice tilegrid-pop';
  for (const n of TILE_GRID_SIZES) { const b = document.createElement('button'); b.dataset.sz = n; b.textContent = n; b.onclick = () => setSize(n); pop.appendChild(b); }
  document.body.appendChild(pop);
  return pop; }

export function toggleGridPop() { build();
  if (pop.classList.contains('on')) { pop.classList.remove('on'); return; }
  sync(); const a = anchorBtn(); if (a) showMenuForAnchor(pop, a, { containerSelector: '#tilebar' }); }
export function mountGridPop() { build(); }
