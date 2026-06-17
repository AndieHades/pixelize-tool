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
import { initSelect, mountSelect } from './select.js';
import { buildToolbar, syncToolbar } from './toolbar.js';
import { mountGridPop, toggleGridPop } from './grid-pop.js';

let panel = null;

function build() {
  if (panel) return panel;
  panel = document.createElement('aside'); panel.id = 'tilebar'; panel.className = 'closed';
  const head = document.createElement('div'); head.id = 'tilegrip'; head.className = 'pop-head';
  const title = document.createElement('span'); title.className = 'pop-title'; title.id = 'tile-title'; title.textContent = t('tile.tileset');
  const acts = document.createElement('span'); acts.className = 'pop-acts';
  const x = document.createElement('button'); x.className = 'win-x'; x.title = t('btn.close');
  x.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  x.onclick = () => { panel.classList.add('closed'); S.tileset.open = false; }; acts.appendChild(x);
  head.append(title, acts);
  const list = document.createElement('div'); list.id = 'tile-list';
  const rsz = document.createElement('div'); rsz.id = 'tilersz'; rsz.title = t('ui.resizeWindow');
  rsz.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 13l-6 6M19 17.5L16.5 20"/></svg>';
  panel.append(head, list, buildToolbar(), rsz);
  document.body.appendChild(panel);
  return panel;
}

function refresh() { if (!panel || panel.classList.contains('closed')) return;
  const ts = activeTileset(), tt = $('tile-title'); // в шапке — Tileset, имя и размер тайла
  if (tt) tt.textContent = ts ? t('tile.tileset') + ' · ' + (ts.name || '') + '  ' + ts.tileW + '×' + ts.tileH : t('tile.tileset');
  renderTiles(); syncToolbar(); }

export function toggle() { build();
  const closed = panel.classList.toggle('closed'); S.tileset.open = !closed;
  if (!closed) refresh();
}

export function openPanel() { build(); panel.classList.remove('closed'); S.tileset.open = true; refresh(); }

export function mount() {
  build();
  actions.register('tile.palette.toggle', toggle);
  actions.register('tile.palette.open', openPanel);
  actions.register('tile.palette.close', () => { build(); panel.classList.add('closed'); S.tileset.open = false; });
  actions.register('tile.new', newTile);
  actions.register('tile.dupActive', () => { if (S.activeTile) dupTile(S.activeTile.tileId); });
  actions.register('tile.delActive', () => { if (S.activeTile) delTile(S.activeTile.tileId); });
  initSelect(refresh); mountSelect(); mountGridPop();
  actions.register('tileset.gridPop', toggleGridPop);
  // тянется со всех сторон, размер независим от содержимого (как окно слоёв):
  // панель задаёт w/h, список скроллится внутри
  floatingWindow(panel, { grip: $('tilegrip'), handle: $('tilersz'), storeKey: 'tilewin', minW: 160, minH: 140, clampBottom: 50, resizeEdges: true,
    onClose: () => { panel.classList.add('closed'); S.tileset.open = false; },
    onResize: (w, h) => { panel.style.width = Math.max(160, Math.min(window.innerWidth - 12, w)) + 'px';
      panel.style.height = Math.max(140, Math.min(window.innerHeight - 12, h)) + 'px'; } });
  bus.on('tileset-changed', refresh);
  bus.on('tool', refresh);
  bus.on('layers', refresh);
}

export { activeTileset };
