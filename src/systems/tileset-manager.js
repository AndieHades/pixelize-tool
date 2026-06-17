// Менеджер тайлсетов (как менеджер палитр): сохранить текущий тайлсет под
// именем, переименовать, загрузить, список с превью, удалить. Хранится в
// localStorage. Окно строится в JS (без правок index.html).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast, t } from '../core/dom.js';
import { makeCanvas } from '../core/canvas.js';
import { cloneTileset } from '../logic/tileset-data.js';
import { isTilemap, rasterLayer } from '../core/tilemap.js';
import { activeTileset } from './tile-palette/ops.js';

const STORE = 'tilesetsLib';
const lib = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };
const save = (o) => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} };

let ovl = null, nameIn = null;

// мини-превью тайлсета: первые тайлы подряд
function setPreview(ts) { const n = Math.min(ts.tiles.length, 8), c = makeCanvas(Math.max(1, n) * 10, 10), x = c.getContext('2d');
  x.imageSmoothingEnabled = false; c.className = 'pswatches';
  ts.tiles.slice(0, 8).forEach((tile, i) => { const b = makeCanvas(ts.tileW, ts.tileH), bx = b.getContext('2d'), id = bx.createImageData(ts.tileW, ts.tileH);
    for (let y = 0; y < ts.tileH; y++) for (let xx = 0; xx < ts.tileW; xx++) { const cc = tile.grid[y][xx]; if (!cc) continue;
      const o = (y * ts.tileW + xx) * 4; id.data[o] = cc[0]; id.data[o + 1] = cc[1]; id.data[o + 2] = cc[2]; id.data[o + 3] = cc.length > 3 ? cc[3] : 255; }
    bx.putImageData(id, 0, 0); x.drawImage(b, i * 10, 0, 10, 10); });
  return c; }

function saveCurrent() { const ts = activeTileset(); if (!ts) { toast(t('toast.noTilemap')); return; }
  const nm = (nameIn.value.trim() || ts.name || t('tile.palette')).slice(0, 24); ts.name = nm;
  const st = lib(); st[nm] = cloneTileset(ts); save(st); listUI(); bus.emit('tileset-changed'); }

// загрузить: импортируем как новый тайлсет; если активный слой — tilemap без
// нарисованных клеток, привязываем к нему, иначе кладём в библиотеку проекта
function load(name) { const data = lib()[name]; if (!data) return;
  const nts = { ...cloneTileset(data), id: ++S.tilesetSeq }; S.tilesets.push(nts);
  const L = S.layers[S.cur];
  if (isTilemap(L) && L.tilemap.cells.every((c) => !c)) { L.tilemap.tilesetId = nts.id; rasterLayer(S.cur); }
  S.activeTile = { tilesetId: nts.id, tileId: nts.tiles[0] ? nts.tiles[0].id : null };
  bus.emit('tileset-changed'); bus.emitDoc(); toast(t('toast.tilesetLoaded', { name })); close();
}

function listUI() { const box = $('tsetm-list'); if (!box) return; box.innerHTML = '';
  const st = lib(), names = Object.keys(st);
  if (!names.length) { box.innerHTML = '<p class="hint" style="margin:10px 2px">' + t('tile.noSets') + '</p>'; return; }
  for (const nm of names) { const row = document.createElement('div'); row.className = 'prow';
    const head = document.createElement('div'); head.className = 'prow-top';
    const name = document.createElement('span'); name.className = 'pname'; name.textContent = nm;
    const del = document.createElement('button'); del.className = 'prow-del'; del.title = t('tile.delete');
    del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    del.onclick = (e) => { e.stopPropagation(); const s2 = lib(); delete s2[nm]; save(s2); listUI(); };
    head.append(name, del);
    const prev = setPreview(st[nm]); prev.onclick = () => load(nm);
    row.append(head, prev); box.appendChild(row); } }

function build() { if (ovl) return;
  ovl = document.createElement('div'); ovl.className = 'ovl'; ovl.id = 'tsetm-ovl';
  const sheet = document.createElement('div'); sheet.className = 'sheet';
  const h = document.createElement('h3'); h.textContent = t('tile.loadSet');
  const row = document.createElement('div'); row.className = 'irow';
  nameIn = document.createElement('input'); nameIn.type = 'text'; nameIn.maxLength = 24; nameIn.placeholder = t('tile.setName'); nameIn.style.flex = '1';
  const sb = document.createElement('button'); sb.className = 'txtbtn'; sb.textContent = t('btn.save'); sb.onclick = saveCurrent;
  row.append(nameIn, sb);
  const list = document.createElement('div'); list.id = 'tsetm-list';
  sheet.append(h, row, list); ovl.appendChild(sheet); document.body.appendChild(ovl); }

const close = () => ovl && ovl.classList.remove('on');
export function open() { build(); const ts = activeTileset(); if (ts) nameIn.value = ts.name || ''; listUI(); ovl.dataset.openedAt = Date.now(); ovl.classList.add('on'); }
export function mount() { build(); actions.register('tileset.manager', open); const b = $('tset-lib'); if (b) b.onclick = open; }
