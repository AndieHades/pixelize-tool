// Рендер списка тайлов: превью, видимый индекс, имя, метка группы. Клик —
// выбрать для рисования; двойной клик / долгий тап — меню тайла.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { makeCanvas } from '../../core/canvas.js';
import { menuGesture } from '../../core/long-press.js';
import { inlineRename } from '../../core/inline-rename.js';
import { snapshot } from '../../core/history.js';
import { C } from '../../styles/canvas-colors.js';
import { activeTileset } from './ops.js';
import { renameTile } from '../../core/tileset.js';
import { openTileMenu } from './menu.js';

const PREVIEW = 40;

function tilePreview(ts, tile) {
  const c = makeCanvas(PREVIEW, PREVIEW); c.className = 'tile-th';
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = C.checkA; x.fillRect(0, 0, PREVIEW, PREVIEW); x.fillStyle = C.checkB;
  const cs = PREVIEW / 5; for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) if ((xx + yy) & 1) x.fillRect(xx * cs, yy * cs, cs, cs);
  const buf = makeCanvas(ts.tileW, ts.tileH), bx = buf.getContext('2d'), id = bx.createImageData(ts.tileW, ts.tileH);
  for (let y = 0; y < ts.tileH; y++) for (let xx = 0; xx < ts.tileW; xx++) { const cc = tile.grid[y][xx]; if (!cc) continue;
    const o = (y * ts.tileW + xx) * 4; id.data[o] = cc[0]; id.data[o + 1] = cc[1]; id.data[o + 2] = cc[2]; id.data[o + 3] = cc.length > 3 ? cc[3] : 255; }
  bx.putImageData(id, 0, 0); x.drawImage(buf, 0, 0, PREVIEW, PREVIEW);
  return c;
}

function tileCell(ts, tile, index) {
  const cell = document.createElement('div'); cell.className = 'tile-cell'; cell.dataset.tid = tile.id;
  const a = S.activeTile;
  if (a && a.tilesetId === ts.id && a.tileId === tile.id && a.groupId == null) cell.classList.add('on');
  cell.appendChild(tilePreview(ts, tile));
  const cap = document.createElement('span'); cap.className = 'tile-idx'; cap.textContent = index;
  cell.appendChild(cap);
  const nm = document.createElement('span'); nm.className = 'tile-nm'; nm.textContent = tile.name || ''; cell.appendChild(nm);
  if (tile.groupId != null) cell.classList.add('grouped');
  cell.addEventListener('click', () => { S.activeTile = { tilesetId: ts.id, tileId: tile.id }; bus.emit('tileset-changed'); });
  cell.addEventListener('dblclick', () => { S.activeTile = { tilesetId: ts.id, tileId: tile.id }; actions.run('tile.edit'); });
  menuGesture(cell, (x, y) => { S.activeTile = { tilesetId: ts.id, tileId: tile.id }; bus.emit('tileset-changed'); openTileMenu(x, y, tile.id); });
  return cell;
}

export function renderTiles() {
  const box = $('tile-list'); if (!box) return; box.innerHTML = '';
  const ts = activeTileset(); if (!ts) return;
  ts.tiles.forEach((tile, i) => box.appendChild(tileCell(ts, tile, i)));
}

// инлайн-переименование тайла по id (из меню)
export function startTileRename(tileId) {
  const ts = activeTileset(); if (!ts) return;
  const cell = document.querySelector('#tile-list .tile-cell[data-tid="' + tileId + '"]');
  const span = cell && cell.querySelector('.tile-nm'); const tile = ts.tiles.find((x) => x.id === tileId); if (!span || !tile) return;
  inlineRename(span, tile.name || '', (v) => { if (v != null) { snapshot(); renameTile(ts, tileId, v); } renderTiles(); });
}
