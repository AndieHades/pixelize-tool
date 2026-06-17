// Нижний тулбар Tileset Palette (закреплён снизу): Manual/Auto-режимы правки,
// штамп/пипетка тайлов, Random (кубик), создать и удалить тайл. Иконки — SVG в
// стиле проекта. Кнопки дёргают действия; подсветка активного — по состоянию.
import { S } from '../../core/state.js';
import * as actions from '../../core/actions.js';
import { setTool } from '../../core/tools.js';
import { t } from '../../core/dom.js';

const IC = {
  stamp: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none"/></svg>',
  pick: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></svg>',
  rnd: '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="3"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/></svg>',
  add: '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M4.5 6.5h15"/><path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><path d="M6.5 6.5l.8 11.7A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8l.8-11.7"/><path d="M10 10.5v6M14 10.5v6"/></svg>',
};

function btn(html, title, onclick, mark) { const b = document.createElement('button'); b.innerHTML = html; b.title = title;
  if (mark) b.dataset.mark = mark; b.onclick = onclick; return b; }
const letter = (ch, title, onclick, mark) => { const b = btn('', title, onclick, mark); b.textContent = ch; b.classList.add('tile-modebtn'); return b; };

export function buildToolbar() {
  const bar = document.createElement('div'); bar.className = 'lay-act tile-act'; bar.id = 'tile-act';
  bar.append(
    letter('M', t('tile.manual'), () => actions.run('tile.manual'), 'manual'),
    letter('A', t('tile.auto'), () => actions.run('tile.auto'), 'auto'),
    btn(IC.stamp, t('tool.tilebrush'), () => { S.tileMode = 'paint'; setTool('tilebrush'); }, 'stamp'),
    btn(IC.pick, t('tile.pickTile'), () => { S.tileMode = 'pick'; setTool('tilebrush'); }, 'pick'),
    btn(IC.rnd, t('tile.random'), () => actions.run('tile.random'), 'rnd'),
    btn(IC.add, t('tile.new'), () => actions.run('tile.new')),
    btn(IC.del, t('tile.delete'), () => actions.run('tile.delActive')),
  );
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
