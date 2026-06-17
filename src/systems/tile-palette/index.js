// Tile Palette: плавающая панель тайлов активного тайлсета. Оболочка строится
// в JS (без правок index.html), список — list.js, тулбар — toolbar.js, меню —
// menu.js. Открывается кнопкой сайдбара; реагирует на изменения тайлсета/слоёв.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, t } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { newTile, dupTile, delTile, activeTileset } from './ops.js';
import { renderTiles } from './list.js';
import { buildToolbar, syncToolbar } from './toolbar.js';

let panel = null;

function build() {
  if (panel) return panel;
  panel = document.createElement('aside'); panel.id = 'tilebar'; panel.className = 'closed';
  const head = document.createElement('div'); head.id = 'tilegrip'; head.className = 'pop-head';
  const title = document.createElement('span'); title.className = 'pop-title'; title.textContent = t('tile.palette');
  const acts = document.createElement('span'); acts.className = 'pop-acts';
  const x = document.createElement('button'); x.className = 'win-x'; x.title = t('btn.close'); x.textContent = '×';
  x.onclick = () => panel.classList.add('closed'); acts.appendChild(x);
  head.append(title, acts);
  const list = document.createElement('div'); list.id = 'tile-list';
  panel.append(head, list, buildToolbar());
  document.body.appendChild(panel);
  return panel;
}

function refresh() { if (!panel || panel.classList.contains('closed')) return; renderTiles(); syncToolbar(); }

export function toggle() { build();
  const closed = panel.classList.toggle('closed');
  if (!closed) refresh();
}

export function openPanel() { build(); panel.classList.remove('closed'); refresh(); }

export function mount() {
  build();
  actions.register('tile.palette.toggle', toggle);
  actions.register('tile.palette.open', openPanel);
  actions.register('tile.palette.close', () => { build(); panel.classList.add('closed'); });
  actions.register('tile.new', newTile);
  actions.register('tile.dupActive', () => { if (S.activeTile) dupTile(S.activeTile.tileId); });
  actions.register('tile.delActive', () => { if (S.activeTile) delTile(S.activeTile.tileId); });
  floatingWindow(panel, { grip: $('tilegrip'), storeKey: 'tilewin', clampBottom: 50,
    onClose: () => panel.classList.add('closed') });
  bus.on('tileset-changed', refresh);
  bus.on('layers', refresh);
}

export { activeTileset };
