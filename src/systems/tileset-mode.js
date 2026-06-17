// Tileset Mode: тумблер в сайдбаре (рядом с grid). Включён → открыта панель
// тайлов, выбрана кисть тайлов, сетка совмещена с тайлами. ПКМ по клетке холста
// в этом режиме даёт контекст-меню клетки (выбрать/перенести/правка/уникальность).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, showMenuAt, t } from '../core/dom.js';
import { setTool } from '../core/tools.js';
import { gridAt } from '../core/viewport.js';
import { getTileset } from '../core/tileset.js';
import { isTilemap, inMap } from '../core/tilemap.js';

const syncBtn = () => { const b = $('tilemap-btn'); if (b) b.classList.toggle('on', !!(S.tileset && S.tileset.on)); };

export function setMode(on) {
  S.tileset.on = on; syncBtn();
  if (on) { actions.run('tile.palette.open'); if (isTilemap(S.layers[S.cur])) actions.run('tilemap.syncGrid'); setTool('tilebrush'); }
  else { actions.run('tile.palette.close'); if (S.tool === 'tilebrush' || S.tool === 'tileselect') setTool('pencil'); }
  bus.emit('render');
}
export const toggle = () => setMode(!(S.tileset && S.tileset.on));

// клетка карты под экранной точкой (или null)
function cellAt(clientX, clientY) {
  const L = S.layers[S.cur]; if (!isTilemap(L)) return null;
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return null;
  const [gx, gy] = gridAt(clientX, clientY);
  const cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH);
  return inMap(L.tilemap, cx, cy) ? { cx, cy } : null;
}

let menu = null;
function item(label, act) { const b = document.createElement('button'); b.textContent = label;
  b.onclick = () => { menu.classList.remove('on'); actions.run(act); }; return b; }

function openCellMenu(px, py) {
  if (!menu) { menu = document.createElement('div'); menu.id = 'tile-cctx'; menu.className = 'menu'; document.body.appendChild(menu); }
  menu.innerHTML = '';
  menu.append(
    item(t('tile.edit'), 'tile.edit'), item(t('tile.makeUnique'), 'tile.makeUnique'),
    item(t('tile.copy'), 'tile.sel.copy'), item(t('tile.cut'), 'tile.sel.cut'),
    item(t('tile.paste'), 'tile.sel.paste'), item(t('tile.delete'), 'tile.sel.delete'),
  );
  showMenuAt(menu, px, py);
}

// ПКМ по холсту в Tileset Mode: выделяем клетку и открываем её меню
function onCanvasMenu(e) {
  if (!S.tileset || !S.tileset.on) return false;
  const c = cellAt(e.clientX, e.clientY); if (!c) return false;
  S.tileSel = { li: S.cur, x0: c.cx, y0: c.cy, x1: c.cx, y1: c.cy }; bus.emit('render');
  openCellMenu(e.clientX, e.clientY); return true;
}

export const tilesetCellMenu = onCanvasMenu; // экспорт для guard в панели слоёв

export function mount() {
  syncBtn();
  const b = $('tilemap-btn'); if (b) b.onclick = toggle;
  actions.register('tileset.mode', toggle);
  bus.on('canvas-menu', onCanvasMenu);
}
