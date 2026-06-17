// Создание tilemap-слоя: диалог (размер тайла + размер карты в клетках) и
// вставка нового слоя поверх активного. Тайлсет создаётся, если ещё нет.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { $, toast, t } from '../core/dom.js';
import { dirtyAll } from '../core/layer-cache.js';
import { createTileset } from '../core/tileset.js';
import { makeTilemapLayer, rasterLayer } from '../core/tilemap.js';
import { TILE_SIZE_PRESETS, TILE_SIZE_DEFAULT, MAP_CELLS_DEFAULT, MAP_CELLS_MAX } from '../config/tileset.js';
import { clampRound } from '../logic/math.js';

let tileW = TILE_SIZE_DEFAULT, dlg = null;

// собрать оверлей диалога один раз (DOM в JS — без правок index.html)
function build() {
  if (dlg) return dlg;
  const ovl = document.createElement('div'); ovl.className = 'ovl'; ovl.id = 'tmap-ovl';
  const sheet = document.createElement('div'); sheet.className = 'sheet'; ovl.appendChild(sheet);
  const h = document.createElement('h3'); h.textContent = t('tile.newLayer'); sheet.appendChild(h);
  const sizes = document.createElement('div'); sizes.className = 'tmap-sizes';
  for (const s of TILE_SIZE_PRESETS) { const b = document.createElement('button'); b.className = 'txtbtn'; b.textContent = s + '×' + s;
    b.onclick = () => { tileW = s; syncSizes(sizes); }; sizes.appendChild(b); }
  sheet.appendChild(rowLabel(t('tile.size'), sizes));
  const wIn = numInput('tmap-w', MAP_CELLS_DEFAULT.w), hIn = numInput('tmap-h', MAP_CELLS_DEFAULT.h);
  sheet.appendChild(rowLabel(t('tile.mapW'), wIn)); sheet.appendChild(rowLabel(t('tile.mapH'), hIn));
  const act = document.createElement('div'); act.className = 'iact';
  const cancel = document.createElement('button'); cancel.className = 'txtbtn'; cancel.textContent = t('btn.cancel'); cancel.onclick = close;
  const ok = document.createElement('button'); ok.className = 'txtbtn primary'; ok.textContent = t('tile.create');
  ok.onclick = () => create(clampRound(+wIn.value || 0, 1, MAP_CELLS_MAX), clampRound(+hIn.value || 0, 1, MAP_CELLS_MAX));
  act.append(cancel, ok); sheet.appendChild(act);
  document.body.appendChild(ovl); dlg = ovl; syncSizes(sizes); return ovl;
}

function rowLabel(text, control) { const r = document.createElement('div'); r.className = 'irow';
  const l = document.createElement('label'); l.textContent = text; r.append(l, control); return r; }
function numInput(id, val) { const i = document.createElement('input'); i.id = id; i.type = 'number'; i.min = '1'; i.value = val; i.style.flex = '1'; return i; }
function syncSizes(box) { [...box.children].forEach((b, k) => b.classList.toggle('on', TILE_SIZE_PRESETS[k] === tileW)); }

const close = () => dlg && dlg.classList.remove('on');

function create(mapW, mapH) {
  close(); snapshot();
  let ts = S.tilesets.find((x) => x.tileW === tileW && x.tileH === tileW);
  if (!ts) ts = createTileset(t('tile.palette') + ' ' + tileW, tileW, tileW);
  const L = makeTilemapLayer(t('tile.tilemapLayer'), ts.id, mapW, mapH);
  const at = S.layers.length; S.layers.splice(at, 0, L); S.cur = at;
  S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxCur = null;
  S.activeTile = ts.tiles.length ? { tilesetId: ts.id, tileId: ts.tiles[0].id } : { tilesetId: ts.id, tileId: null };
  rasterLayer(at); dirtyAll(); bus.emitDoc(); bus.emit('tileset-changed'); toast(t('toast.tilemapCreated'));
}

export function open() { build(); dlg.dataset.openedAt = Date.now(); dlg.classList.add('on'); }
export function mount() {
  build();
  actions.register('tilemap.newLayer', open);
  const btn = $('lay-tmap'); if (btn) btn.onclick = open;
}
