// Попап выбора размера Tileset Grid: только числа (16/32/48/96/128), квадрат.
// Передвигаемый, закрывается по клику мимо. Размер персистится (последний выбор).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { floatingWindow } from '../../core/floating-window.js';
import { TILE_GRID_SIZES } from '../../config/tileset.js';

let pop = null;
const anchorBtn = () => document.querySelector('#tile-act [data-tb="gridsize"]');

function setSize(n) { S.tileGrid.size = n; try { localStorage.setItem('pxh.tileGrid', n); } catch (e) {}
  sync(); bus.emit('tileset-changed'); bus.emit('render'); }
function sync() { if (!pop) return; for (const b of pop.querySelectorAll('button')) b.classList.toggle('on', +b.dataset.sz === S.tileGrid.size); }

function build() { if (pop) return pop;
  pop = document.createElement('div'); pop.id = 'tilegrid-pop'; pop.className = 'tilegrid-pop';
  for (const n of TILE_GRID_SIZES) { const b = document.createElement('button'); b.dataset.sz = n; b.textContent = n; b.onclick = () => setSize(n); pop.appendChild(b); }
  document.body.appendChild(pop);
  floatingWindow(pop, { grip: pop });
  document.addEventListener('pointerdown', (e) => { if (!pop.classList.contains('on')) return;
    if (!pop.contains(e.target) && !(e.target.closest && e.target.closest('#tile-act [data-tb="gridsize"]'))) pop.classList.remove('on'); }, true);
  return pop; }

export function toggleGridPop() { build();
  if (pop.classList.contains('on')) { pop.classList.remove('on'); return; }
  sync(); const a = anchorBtn(), r = a ? a.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, height: 0 };
  pop.style.left = Math.min(r.left, innerWidth - 160) + 'px'; pop.style.top = Math.max(8, r.top - 8 - 44) + 'px'; pop.classList.add('on'); }
export function mountGridPop() { build(); }
