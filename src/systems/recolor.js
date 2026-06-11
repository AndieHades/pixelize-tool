// Замена цвета по всему документу (на всех слоях и в палитре).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot } from '../core/history.js';
import { eqc } from '../logic/color.js';
import { dirtyAll } from '../core/layer-cache.js';
import { toast } from '../core/dom.js';

export function recolorAll(from, to) {
  snapshot(); let n = 0;
  for (const L of S.layers) { const g = L.grid;
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (g[y][x] && eqc(g[y][x], from)) { g[y][x] = to.slice(); n++; }
    for (const [k, c] of L.ext) if (eqc(c, from)) L.ext.set(k, to.slice()); }
  const pi = S.palette.findIndex((p) => eqc(p, from));
  if (pi >= 0) { if (S.palette.some((p, i) => i !== pi && eqc(p, to))) S.palette.splice(pi, 1); else S.palette[pi] = to.slice(); }
  if (eqc(S.active, from)) S.active = to.slice();
  dirtyAll(); bus.emit('palette'); bus.emit('render'); bus.emit('layers');
  toast(n ? `Перекрашено: ${n} пикс.` : 'Цвет заменён в палитре');
}

export function startReplace(from) { S.replaceMode = { from: from.slice() }; bus.emit('render'); toast('Пиксели подсвечены — тапни новый цвет в палитре'); }

actions.register('recolor.all', recolorAll);
actions.register('recolor.start', startReplace);
