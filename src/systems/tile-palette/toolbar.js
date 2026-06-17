// Тулбар Tile Palette: создать/дублировать/удалить тайл, режимы кисти
// (paint/erase/pick) и transform-флаги (flip/rotate/diagonal). Кнопки дёргают
// действия по имени; подсветка активных синхронизируется по состоянию.
import { S } from '../../core/state.js';
import * as actions from '../../core/actions.js';
import { t } from '../../core/dom.js';

// группы кнопок: [actionName, i18nKey, label]
const FILE = [['tile.new', 'tile.new', '+'], ['tile.dupActive', 'tile.dup', '⧉'], ['tile.delActive', 'tile.delete', '🗑']];
const MODES = [['tile.mode.paint', 'paint'], ['tile.mode.erase', 'erase'], ['tile.mode.pick', 'pick']];
const FLAGS = [['tile.flipH', 'tile.flipH', 'H'], ['tile.flipV', 'tile.flipV', 'V'],
  ['tile.rotate', 'tile.rot90', '⟳'], ['tile.diagonal', 'tile.diagonal', '⤡'], ['tile.resetFlags', 'tile.resetFlags', '×']];

function btn(act, title, label) { const b = document.createElement('button'); b.dataset.act = act; b.title = t(title); b.textContent = label;
  b.onclick = () => actions.run(act); return b; }

export function buildToolbar() {
  const bar = document.createElement('div'); bar.className = 'lay-act tile-act'; bar.id = 'tile-act';
  for (const [a, k, l] of FILE) bar.appendChild(btn(a, k, l));
  for (const [a, m] of MODES) { const b = btn(a, 'tile.mode' + m, m[0].toUpperCase()); b.dataset.mode = m; b.textContent = m === 'paint' ? '✎' : m === 'erase' ? '⌫' : '⊙'; b.title = t(m === 'paint' ? 'tool.tilebrush' : m === 'erase' ? 'tile.eraseTile' : 'tile.pickTile'); bar.appendChild(b); }
  for (const [a, k, l] of FLAGS) bar.appendChild(btn(a, k, l));
  return bar;
}

// подсветка активного режима и нажатых флагов
export function syncToolbar() {
  const bar = document.getElementById('tile-act'); if (!bar) return;
  bar.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.tileMode));
  const f = S.tileFlags;
  const set = (act, on) => { const b = bar.querySelector('[data-act="' + act + '"]'); if (b) b.classList.toggle('on', on); };
  set('tile.flipH', f.flipX); set('tile.flipV', f.flipY); set('tile.diagonal', f.diagonalFlip); set('tile.rotate', !!f.rotation);
}
