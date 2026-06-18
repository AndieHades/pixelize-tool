// Нижний тулбар Tileset Palette (закреплён снизу): Manual/Auto-режимы правки,
// штамп/пипетка тайлов, Random (кубик), менеджер и удаление тайла. Иконки — SVG в
// стиле проекта. Кнопки можно переставлять зажатым ПКМ/долгим тапом (attachReorder).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { setTool } from '../../core/tools.js';
import { t } from '../../core/dom.js';
import { attachReorder } from '../../core/reorder-drag.js';

const STORE = 'tileToolbarOrder4';
let squelchUntil = 0;
const squelch = () => { squelchUntil = performance.now() + 350; };

const IC = {
  draw: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="9" height="9" rx="1.5"/><path d="M14 14l5.5-5.5a1.6 1.6 0 0 1 2.3 2.3L16.3 16.3l-3 .7.7-3z"/></svg>',
  rnd: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="3"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M5 4.5h12l2 2v13H5z"/><path d="M8 4.5v6h8v-6"/><path d="M8 16.5h8"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M4.5 6.5h15"/><path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><path d="M6.5 6.5l.8 11.7A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8l.8-11.7"/><path d="M10 10.5v6M14 10.5v6"/></svg>',
};

// draw — toggle: вкл = рисуем тайлами (штамп), выкл = просто выбираем клетки/тайлы
function toggleDraw() { if (S.tool === 'tilebrush' && S.tileMode === 'paint') S.tileMode = 'pick';
  else { S.tileMode = 'paint'; setTool('tilebrush'); } bus.emit('tileset-changed'); }

// id → { html|letter, title, run, mark }
const DEFS = {
  draw: { html: IC.draw, title: () => t('tile.draw'), run: toggleDraw, mark: 'draw' },
  gridsize: { title: () => t('tile.gridSize'), run: () => actions.run('tileset.gridPop'), mark: 'gridsize', size: true },
  manual: { letter: 'M', title: () => t('tile.manual'), run: () => actions.run('tile.manual'), mark: 'manual' },
  auto: { letter: 'A', title: () => t('tile.auto'), run: () => actions.run('tile.auto'), mark: 'auto' },
  rnd: { html: IC.rnd, title: () => t('tile.random'), run: () => actions.run('tile.random'), mark: 'rnd' },
  save: { html: IC.save, title: () => t('tile.loadSet'), run: () => actions.run('tileset.manager') },
  del: { html: IC.del, title: () => t('tile.delete'), run: () => actions.run('tile.delActive') },
};
const DEFAULT_ORDER = ['draw', 'gridsize', 'manual', 'auto', 'rnd', 'save', 'del'];
const savedOrder = () => { try { const a = JSON.parse(localStorage.getItem(STORE)); return Array.isArray(a) ? a : null; } catch (e) { return null; } };
function saveOrder() { const bar = document.getElementById('tile-act'); if (!bar) return;
  try { localStorage.setItem(STORE, JSON.stringify([...bar.children].map((b) => b.dataset.tb))); } catch (e) {} }

function makeBtn(id) { const d = DEFS[id]; const b = document.createElement('button'); b.dataset.tb = id; b.title = d.title();
  if (d.size) { b.textContent = S.tileGrid.size; b.classList.add('tile-modebtn'); }
  else if (d.html) b.innerHTML = d.html; else { b.textContent = d.letter; b.classList.add('tile-modebtn'); }
  if (d.mark) b.dataset.mark = d.mark;
  b.addEventListener('click', (e) => { if (performance.now() < squelchUntil) { e.preventDefault(); return; } d.run(); });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  attachReorder(b, { dropSel: '#tile-act', itemSel: '#tile-act button', save: saveOrder, squelch });
  return b; }

export function buildToolbar() {
  const bar = document.createElement('div'); bar.className = 'lay-act tile-act'; bar.id = 'tile-act';
  const order = savedOrder() || DEFAULT_ORDER;
  for (const id of order) if (DEFS[id]) bar.appendChild(makeBtn(id));
  for (const id of DEFAULT_ORDER) if (!order.includes(id)) bar.appendChild(makeBtn(id)); // новые кнопки после обновления
  return bar;
}

// подсветка активного режима/инструмента
export function syncToolbar() {
  const bar = document.getElementById('tile-act'); if (!bar) return;
  const set = (mark, on) => { const b = bar.querySelector('[data-mark="' + mark + '"]'); if (b) b.classList.toggle('on', on); };
  const pixel = S.tool === 'pencil' || S.tool === 'eraser';
  set('manual', pixel && S.tileAutoMode === 'manual');
  set('auto', pixel && S.tileAutoMode === 'auto');
  set('draw', S.tool === 'tilebrush' && S.tileMode === 'paint');
  set('rnd', S.tileRandom);
  const gs = bar.querySelector('[data-tb="gridsize"]'); if (gs) gs.textContent = S.tileGrid.size; // текущий размер Tileset Grid
}
