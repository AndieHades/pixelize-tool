// Tile Editor: изолированный редактор source tile (tileW×tileH). Рисует пиксели
// активным цветом, стирает ПКМ. После каждого мазка обновляет ВСЕ экземпляры
// тайла на картах (refreshTile) — правка идёт в source tile, не в клетку карты.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { t } from '../../core/dom.js';
import { snapshot } from '../../core/history.js';
import { getTileset, getTile } from '../../core/tileset.js';
import { refreshTile } from '../../core/tilemap.js';
import { C } from '../../styles/canvas-colors.js';

const DISP = 256;
let ovl = null, cv = null, cur = null, painting = false, snapped = false;

function build() {
  if (ovl) return ovl;
  ovl = document.createElement('div'); ovl.className = 'ovl'; ovl.id = 'tile-edit-ovl';
  const sheet = document.createElement('div'); sheet.className = 'sheet';
  const h = document.createElement('h3'); h.textContent = t('tile.editTitle');
  cv = document.createElement('canvas'); cv.id = 'tile-edit-cv'; cv.width = cv.height = DISP; cv.className = 'tile-edit-cv';
  const act = document.createElement('div'); act.className = 'iact';
  const done = document.createElement('button'); done.className = 'txtbtn primary'; done.textContent = t('btn.close');
  done.onclick = () => ovl.classList.remove('on'); act.appendChild(done);
  sheet.append(h, cv, act); ovl.appendChild(sheet); document.body.appendChild(ovl);
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', () => { painting = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  return ovl;
}

function ctxTile() { const ts = getTileset(S.activeTile && S.activeTile.tilesetId); const tile = ts && getTile(ts, S.activeTile.tileId);
  return tile ? { ts, tile } : null; }

function redraw() { if (!cur) return; const { ts, tile } = cur, x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  const s = DISP / ts.tileW; x.clearRect(0, 0, DISP, DISP);
  x.fillStyle = C.checkA; x.fillRect(0, 0, DISP, DISP); x.fillStyle = C.checkB;
  for (let yy = 0; yy < ts.tileH; yy++) for (let xx = 0; xx < ts.tileW; xx++) if ((xx + yy) & 1) x.fillRect(xx * s, yy * (DISP / ts.tileH), s, DISP / ts.tileH);
  const sy = DISP / ts.tileH;
  for (let yy = 0; yy < ts.tileH; yy++) for (let xx = 0; xx < ts.tileW; xx++) { const c = tile.grid[yy][xx]; if (!c) continue;
    x.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(c.length > 3 ? c[3] : 255) / 255})`; x.fillRect(xx * s, yy * sy, s, sy); } }

function cellAt(e) { const r = cv.getBoundingClientRect(), ts = cur.ts;
  return [Math.floor((e.clientX - r.left) / (r.width / ts.tileW)), Math.floor((e.clientY - r.top) / (r.height / ts.tileH))]; }

function paint(e) { const [px, py] = cellAt(e), { ts, tile } = cur; if (px < 0 || py < 0 || px >= ts.tileW || py >= ts.tileH) return;
  tile.grid[py][px] = e.buttons === 2 || painting === 'erase' ? null : [S.active[0], S.active[1], S.active[2], 255];
  refreshTile(ts.id, tile.id); redraw(); bus.emit('render'); }

function onDown(e) { if (!cur) return; if (!snapped) { snapshot(); snapped = true; } painting = e.button === 2 ? 'erase' : true; paint(e); }
function onMove(e) { if (painting && cur) paint(e); }

export function open() { const c = ctxTile(); if (!c) return; build(); cur = c; snapped = false; redraw();
  ovl.dataset.openedAt = Date.now(); ovl.classList.add('on'); }

export function mount() { build(); actions.register('tile.edit', open); }
