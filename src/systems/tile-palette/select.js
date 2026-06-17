// Выбор тайлов как свотчей палитры: клик = active, Shift = диапазон, Ctrl =
// тумблер мультивыбора, зажатая ЛКМ = перестановка. Несколько выбранных тайлов
// образуют ПАТТЕРН (как в Godot): сохраняют взаимное расположение и штампуются
// с выравниванием по сетке — так рисуют замкнутые участки/острова.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { activeTileset } from './ops.js';

let anchor = null, drag = null, rebuild = () => {};
export const initSelect = (rb) => { rebuild = rb; };

const ids = (ts) => ts.tiles.map((t) => t.id);
function rangeIds(ts, a, b) { const arr = ids(ts), i = arr.indexOf(a), j = arr.indexOf(b); if (i < 0 || j < 0) return [b];
  const [lo, hi] = i <= j ? [i, j] : [j, i]; return arr.slice(lo, hi + 1); }

export function selectTile(ts, tileId, e) {
  S.activeTile = { tilesetId: ts.id, tileId };
  if (e && (e.ctrlKey || e.metaKey)) { if (S.tileMarks.has(tileId)) S.tileMarks.delete(tileId); else S.tileMarks.add(tileId); anchor = tileId; }
  else if (e && e.shiftKey) { S.tileMarks = new Set(rangeIds(ts, anchor ?? tileId, tileId)); }
  else { S.tileMarks = new Set([tileId]); anchor = tileId; }
  rebuild(); buildPattern(); bus.emit('tileset-changed');
}

// паттерн из выбранных свотчей по их видимому расположению (строки/столбцы DOM)
export function buildPattern() {
  if (S.tileMarks.size < 2) { S.tilePattern = null; return; }
  const cells = [...document.querySelectorAll('#tile-list .tile-cell')].filter((c) => S.tileMarks.has(+c.dataset.tid));
  if (cells.length < 2) { S.tilePattern = null; return; }
  const rects = cells.map((c) => ({ id: +c.dataset.tid, r: c.getBoundingClientRect() }));
  const rows = [...new Set(rects.map((x) => Math.round(x.r.top)))].sort((a, b) => a - b);
  const cols = [...new Set(rects.map((x) => Math.round(x.r.left)))].sort((a, b) => a - b);
  const grid = new Array(rows.length * cols.length).fill(null);
  for (const x of rects) { const r = rows.indexOf(Math.round(x.r.top)), c = cols.indexOf(Math.round(x.r.left)); grid[r * cols.length + c] = x.id; }
  S.tilePattern = { w: cols.length, h: rows.length, ids: grid };
}

// --- перестановка зажатой ЛКМ ---
export function startDrag(ts, tileId, e) { if (e.button !== 0) return; drag = { ts, tileId, x: e.clientX, y: e.clientY, moved: false }; }
function onMove(e) { if (!drag) return; if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return; drag.moved = true; }
function onUp(e) { if (!drag) return; const d = drag; drag = null; if (!d.moved) return;
  const el = document.elementFromPoint(e.clientX, e.clientY); const tgt = el && el.closest ? el.closest('#tile-list .tile-cell') : null;
  if (!tgt) return; const ts = d.ts, arr = ts.tiles, from = arr.findIndex((t) => t.id === d.tileId), to = arr.findIndex((t) => t.id === +tgt.dataset.tid);
  if (from < 0 || to < 0 || from === to) return;
  const r = tgt.getBoundingClientRect(), after = e.clientX >= r.left + r.width / 2;
  const [moved] = arr.splice(from, 1); let ins = arr.findIndex((t) => t.id === +tgt.dataset.tid); if (after) ins++;
  arr.splice(ins, 0, moved); rebuild(); bus.emit('tileset-changed'); }

export function mountSelect() { document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp); }
export const dragMoved = () => !!(drag && drag.moved);
export { activeTileset };
