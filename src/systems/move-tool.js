// Инструмент «перемещение»: тащит активный слой (или все отмеченные) целиком.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { registerTool } from '../core/canvas-handlers.js';
import { snapshot } from '../core/history.js';
import { shiftLayerGrid } from '../core/document.js';
import { markDirty } from '../core/layer-cache.js';

export function moveTargets() { return (S.marked.size > 1) ? [...S.marked].filter((i) => i < S.layers.length).sort((a, b) => a - b) : [S.cur]; }

const move = {
  down({ gx, gy }) { if (S.layers[S.cur].lock) return; S.moveDrag = { sx: gx, sy: gy, dx: 0, dy: 0, idxs: moveTargets() }; },
  move({ gx, gy }) { if (S.moveDrag) { S.moveDrag.dx = gx - S.moveDrag.sx; S.moveDrag.dy = gy - S.moveDrag.sy; bus.emit('render'); } },
  up() { if (!S.moveDrag) return; const { dx, dy, idxs } = S.moveDrag; S.moveDrag = null;
    if (!dx && !dy) { bus.emit('render'); return; }
    snapshot(); for (const i of idxs) if (S.layers[i]) { shiftLayerGrid(S.layers[i], dx, dy); markDirty(i); }
    if (S.sel) S.sel = { x0: S.sel.x0 + dx, y0: S.sel.y0 + dy, x1: S.sel.x1 + dx, y1: S.sel.y1 + dy }; // рамка едет вместе со слоем
    if (S.selMask) { const m = new Set(); for (const k of S.selMask) { const c = k.indexOf(','); m.add((+k.slice(0, c) + dx) + ',' + (+k.slice(c + 1) + dy)); } S.selMask = m; }
    bus.emit('render'); bus.emit('layers'); },
};

registerTool('move', move);
