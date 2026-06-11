// Диалог «Новый холст»: пресеты пиксельных размеров (config) + кастомные
// (сохраняются), создаёт новую работу в галерее.
import { $ } from '../core/dom.js';
import * as actions from '../core/actions.js';
import { SIZE_PRESETS, DEFAULT_DOC } from '../config/presets.js';
import { MAX_SIZE } from '../config/limits.js';
import { newWork } from './gallery/doc.js';

const STORE = 'customSizes';
const custom = () => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } };
const saveCustom = (a) => { try { localStorage.setItem(STORE, JSON.stringify(a)); } catch (e) {} };

function buildChips() { const box = $('new-chips'); if (!box) return; box.innerHTML = '';
  for (const p of [...SIZE_PRESETS, ...custom()]) {
    const b = document.createElement('button'); b.dataset.w = p.w; b.dataset.h = p.h; b.textContent = p.label || `${p.w}×${p.h}`;
    if (p.w === DEFAULT_DOC.w && p.h === DEFAULT_DOC.h) b.classList.add('on');
    b.onclick = () => { $('new-w').value = p.w; $('new-h').value = p.h; box.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); };
    box.appendChild(b); }
}

function create() { const w = parseInt($('new-w').value, 10), h = parseInt($('new-h').value, 10);
  if (!w || !h || w < 2 || h < 2 || w > MAX_SIZE || h > MAX_SIZE) return;
  if (![...SIZE_PRESETS, ...custom()].some((p) => p.w === w && p.h === h)) { const c = custom(); c.push({ w, h, label: `${w}×${h}` }); saveCustom(c); } // запомнить кастомный
  $('new-ovl').classList.remove('on'); $('gallery').classList.remove('on'); newWork(w, h);
}

export function mount() {
  buildChips();
  const open = () => { buildChips(); $('new-ovl').classList.add('on'); };
  $('new').onclick = open; $('gal-new').onclick = open;
  actions.register('doc.new', open);
  $('new-cancel').onclick = () => $('new-ovl').classList.remove('on');
  $('new-create').onclick = create;
}
