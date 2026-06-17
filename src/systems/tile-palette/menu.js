// Контекст-меню тайла: команды edit/dup/rename/variant/make-unique/delete.
// Команды-«хозяева» (edit/variant/make-unique) дёргаются по имени через actions —
// панель не импортирует системы-редакторы напрямую.
import * as actions from '../../core/actions.js';
import { $, showMenuAt, t } from '../../core/dom.js';
import { dupTile, delTile } from './ops.js';
import { startTileRename } from './list.js';

let menu = null;

function item(label, fn) { const b = document.createElement('button'); b.textContent = label;
  b.onclick = () => { menu.classList.remove('on'); fn(); }; return b; }

function build() {
  if (menu) return menu;
  menu = document.createElement('div'); menu.id = 'tile-menu'; menu.className = 'menu';
  document.body.appendChild(menu); return menu;
}

export function openTileMenu(x, y, tileId) {
  build(); menu.innerHTML = '';
  menu.append(
    item(t('tile.dup'), () => dupTile(tileId)),
    item(t('tile.rename'), () => startTileRename(tileId)),
    item(t('tile.variant'), () => actions.run('tile.variant')),
    item(t('tile.makeUnique'), () => actions.run('tile.makeUnique')),
    item(t('tile.delete'), () => delTile(tileId)),
  );
  showMenuAt(menu, x, y);
}

export const menuEl = () => $('tile-menu');
