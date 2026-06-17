// Нижний тулбар Tileset Palette (закреплён снизу): Manual/Auto-режимы правки,
// штамп/пипетка тайлов, Random (кубик), создать и удалить тайл. Иконки — SVG в
// стиле проекта. Кнопки можно переставлять зажатым ПКМ/долгим тапом (attachReorder).
import { S } from '../../core/state.js';
import * as actions from '../../core/actions.js';
import { setTool } from '../../core/tools.js';
import { t } from '../../core/dom.js';
import { attachReorder } from '../../core/reorder-drag.js';

const STORE = 'tileToolbarOrder';
let squelchUntil = 0;
const squelch = () => { squelchUntil = performance.now() + 350; };

const IC = {
  stamp: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none"/></svg>',
  pick: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></svg>',
  rnd: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="3"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg>',
  add: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M4.5 6.5h15"/><path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><path d="M6.5 6.5l.8 11.7A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8l.8-11.7"/><path d="M10 10.5v6M14 10.5v6"/></svg>',
};

// id → { html|letter, title, onclick, mark }
const DEFS = {
  manual: { letter: 'M', title: () => t('tile.manual'), run: () => actions.run('tile.manual'), mark: 'manual' },
  auto: { letter: 'A', title: () => t('tile.auto'), run: () => actions.run('tile.auto'), mark: 'auto' },
  stamp: { html: IC.stamp, title: () => t('tool.tilebrush'), run: () => { S.tileMode = 'paint'; setTool('tilebrush'); }, mark: 'stamp' },
  pick: { html: IC.pick, title: () => t('tile.pickTile'), run: () => { S.tileMode = 'pick'; setTool('tilebrush'); }, mark: 'pick' },
  rnd: { html: IC.rnd, title: () => t('tile.random'), run: () => actions.run('tile.random'), mark: 'rnd' },
  new: { html: IC.add, title: () => t('tile.new'), run: () => actions.run('tile.new') },
  del: { html: IC.del, title: () => t('tile.delete'), run: () => actions.run('tile.delActive') },
};
const DEFAULT_ORDER = ['manual', 'auto', 'stamp', 'pick', 'rnd', 'new', 'del'];
const savedOrder = () => { try { const a = JSON.parse(localStorage.getItem(STORE)); return Array.isArray(a) ? a : null; } catch (e) { return null; } };
function saveOrder() { const bar = document.getElementById('tile-act'); if (!bar) return;
  try { localStorage.setItem(STORE, JSON.stringify([...bar.children].map((b) => b.dataset.tb))); } catch (e) {} }

function makeBtn(id) { const d = DEFS[id]; const b = document.createElement('button'); b.dataset.tb = id; b.title = d.title();
  if (d.html) b.innerHTML = d.html; else { b.textContent = d.letter; b.classList.add('tile-modebtn'); }
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
  set('stamp', S.tool === 'tilebrush' && S.tileMode === 'paint');
  set('pick', S.tool === 'tilebrush' && S.tileMode === 'pick');
  set('rnd', S.tileRandom);
}
