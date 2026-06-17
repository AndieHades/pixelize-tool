// Tile Brush: рисует/стирает/берёт тайлы по клеткам tilemap-слоя. Работает
// только на tilemap-слое (иначе подсказка). Режим — S.tileMode (paint/erase/pick),
// трансформация новых экземпляров — S.tileFlags. Случайные варианты — из группы.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { registerTool } from '../../core/canvas-handlers.js';
import { setTool } from '../../core/tools.js';
import { snapshot } from '../../core/history.js';
import { toast, t } from '../../core/dom.js';
import { getTileset, getTile } from '../../core/tileset.js';
import { isTilemap, getCell, setCell, inMap } from '../../core/tilemap.js';
import { pickVariant } from '../../core/variant-groups.js';
import { cellFlags } from '../../logic/tile-transform.js';

// экранную клетку сетки (gx,gy) перевести в клетку карты текущего слоя
function toCell(gx, gy) { const L = S.layers[S.cur]; if (!isTilemap(L)) return null;
  const ts = getTileset(L.tilemap.tilesetId); if (!ts) return null;
  const cx = Math.floor(gx / ts.tileW), cy = Math.floor(gy / ts.tileH);
  return inMap(L.tilemap, cx, cy) ? { cx, cy, ts } : null; }

// какой tileId положить: из активного тайла или случайный вариант группы
function resolveTileId(ts) {
  const a = S.activeTile; if (!a) return null;
  if (a.groupId != null) return pickVariant(ts, a.groupId, Math.random);
  return a.tileId;
}

// Godot-стиль: при выбранном паттерне (несколько тайлов) штампуем его с
// выравниванием по сетке карты — так рисуются замкнутые участки/острова.
function patternId(cx, cy) { const p = S.tilePattern;
  return p.ids[(((cy % p.h) + p.h) % p.h) * p.w + (((cx % p.w) + p.w) % p.w)]; }

// случайный тайл из выбранных в палитре (режим «кубик»)
function randomMarkId() { const ids = [...S.tileMarks]; if (!ids.length) return S.activeTile && S.activeTile.tileId;
  return ids[Math.floor(Math.random() * ids.length)]; }

function paintAt(cx, cy, ts) {
  if (S.tileRandom && S.tileMarks.size) { const id = randomMarkId(); if (id != null && getTile(ts, id)) setCell(S.cur, cx, cy, { tileId: id, ...S.tileFlags }); return; }
  if (S.tilePattern) { const id = patternId(cx, cy); if (id != null && getTile(ts, id)) setCell(S.cur, cx, cy, { tileId: id, ...S.tileFlags }); return; }
  const id = resolveTileId(ts); if (id == null || !getTile(ts, id)) { toast(t('toast.noTiles')); return; }
  setCell(S.cur, cx, cy, { tileId: id, ...S.tileFlags });
}

function pickAt(cx, cy) {
  const L = S.layers[S.cur], cell = getCell(L.tilemap, cx, cy);
  if (!cell || cell.tileId == null) return;
  S.activeTile = { tilesetId: L.tilemap.tilesetId, tileId: cell.tileId };
  S.tileFlags = cellFlags(cell); bus.emit('tileset-changed');
}

function act(cx, cy, ts) {
  if (S.tileMode === 'pick') pickAt(cx, cy);
  else if (S.tileMode === 'erase') setCell(S.cur, cx, cy, null);
  else paintAt(cx, cy, ts);
}

let last = null;
const brush = {
  down({ gx, gy }) { const c = toCell(gx, gy);
    if (!c) { if (!isTilemap(S.layers[S.cur])) toast(t('toast.needTilemapLayer')); return; }
    if (S.tileMode !== 'pick') snapshot();
    act(c.cx, c.cy, c.ts); last = c.cx + ',' + c.cy; bus.emit('render'); },
  move({ gx, gy }) { if (S.tileMode === 'pick') return; const c = toCell(gx, gy); if (!c) return;
    const k = c.cx + ',' + c.cy; if (k === last) return; last = k; act(c.cx, c.cy, c.ts); bus.emit('render'); },
  up() { last = null; },
};

registerTool('tilebrush', brush);
actions.register('tool.tilebrush', () => setTool('tilebrush'));
actions.register('tile.mode.paint', () => { S.tileMode = 'paint'; bus.emit('tileset-changed'); });
actions.register('tile.mode.erase', () => { S.tileMode = 'erase'; bus.emit('tileset-changed'); });
actions.register('tile.mode.pick', () => { S.tileMode = 'pick'; bus.emit('tileset-changed'); });
actions.register('tile.random', () => { S.tileRandom = !S.tileRandom; bus.emit('tileset-changed'); });

// transform-флаги новых экземпляров (кнопки Flip/Rotate/Diagonal)
const ef = () => bus.emit('tileset-changed');
actions.register('tile.flipH', () => { S.tileFlags.flipX = !S.tileFlags.flipX; ef(); });
actions.register('tile.flipV', () => { S.tileFlags.flipY = !S.tileFlags.flipY; ef(); });
actions.register('tile.diagonal', () => { S.tileFlags.diagonalFlip = !S.tileFlags.diagonalFlip; ef(); });
actions.register('tile.rotate', () => { S.tileFlags.rotation = (S.tileFlags.rotation + 90) % 360; ef(); });
actions.register('tile.resetFlags', () => { S.tileFlags = { flipX: false, flipY: false, diagonalFlip: false, rotation: 0 }; ef(); });
