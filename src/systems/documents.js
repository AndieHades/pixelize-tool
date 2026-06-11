// Документы: несколько работ в памяти, переключение сохраняет/восстанавливает
// состояние. Диалог «Новый» строит плитки из config/presets.
import { S, newLayer } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, toast, showMenuAt } from '../core/dom.js';
import { dirtyAll } from '../core/layer-cache.js';
import { dedupePal } from '../logic/quantize.js';
import { defaultPalette, DEFAULT_ACTIVE } from '../config/palette.js';
import { SIZE_PRESETS, DEFAULT_DOC } from '../config/presets.js';
import { MAX_SIZE, MAX_LAYERS } from '../config/limits.js';
import { t, getLocale, locales, setLocale } from '../i18n/index.js';
import { toggleTheme, getTheme } from '../styles/theme.js';

let docs = [{ name: 'Документ 1' }], docCur = 0, docSeq = 1, dblTimer = null, dblIdx = -1;
export const docList = () => docs; export const curDoc = () => docCur;

function saveDocState() { const old = docs[docCur] || {};
  docs[docCur] = { name: old.name || 'Документ ' + (docCur + 1), W: S.W, H: S.H, layers: S.layers, folders: S.folders, folderSeq: S.folderSeq, layerSeq: S.layerSeq,
    palette: S.palette, active: S.active, cur: S.cur, undo: S.undoStack.slice(), redo: S.redoStack.slice(), view: { ...S.view } }; }

function applyDoc(d) { S.W = d.W; S.H = d.H; S.layers = d.layers; S.folders = d.folders; S.folderSeq = d.folderSeq; S.layerSeq = d.layerSeq;
  S.palette = dedupePal(d.palette); S.active = d.active; S.cur = Math.min(d.cur || 0, S.layers.length - 1);
  S.undoStack.length = 0; S.undoStack.push(...d.undo); S.redoStack.length = 0; S.redoStack.push(...d.redo);
  Object.assign(S.view, d.view); S.marked.clear();
  S.sel = null; S.selMask = null; S.selFloat = null; S.cropMode = null;
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('selection'); bus.emit('render'); }

export function loadDoc(i) { if (i === docCur) return; saveDocState(); docCur = i; applyDoc(docs[i]); toast('→ ' + docs[i].name); }

export function newDocument(w, h) { saveDocState();
  docCur = docs.length; docs.push({ name: 'Документ ' + (++docSeq) });
  S.W = w; S.H = h; S.layerSeq = 1; S.layers = [newLayer('Слой 1', w, h)]; S.cur = 0;
  S.folders = []; S.folderSeq = 0; S.marked.clear();
  S.palette = defaultPalette(); S.active = S.palette[DEFAULT_ACTIVE].slice();
  S.undoStack.length = 0; S.redoStack.length = 0;
  S.sel = null; S.selMask = null; S.selFloat = null; S.cropMode = null;
  dirtyAll(); bus.emit('palette'); bus.emit('layers'); bus.emit('fit'); toast(`${docs[docCur].name}: ${w}×${h}`); }

function closeDoc(i) { if (docs.length < 2) { toast('Это единственный документ'); return; }
  if (i === docCur) { saveDocState(); const t = docs[i === 0 ? 1 : i - 1]; docs.splice(i, 1); docCur = docs.indexOf(t); applyDoc(t); }
  else { const cd = docs[docCur]; docs.splice(i, 1); docCur = docs.indexOf(cd); } toast('Документ закрыт'); }

export function sendLayerToDoc(L, i) { const d = docs[i];
  if (d.layers.length >= MAX_LAYERS) { toast('В целевом документе уже 8 слоёв'); return; }
  const copy = { name: L.name, opacity: L.opacity, visible: true, fid: null, clip: false, ext: new Map(),
    grid: Array.from({ length: d.H }, () => new Array(d.W).fill(null)) };
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = L.grid[y][x]; if (!c) continue;
    if (x < d.W && y < d.H) copy.grid[y][x] = c.slice(); else copy.ext.set(x + ',' + y, c.slice()); }
  for (const [k, c] of L.ext) copy.ext.set(k, c.slice());
  d.layers.push(copy); toast('Слой скопирован в ' + d.name); }

function openDocsMenu() { const m = $('dctx'); m.innerHTML = '';
  const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = 'Документы'; m.appendChild(head);
  docs.forEach((d, i) => { const row = document.createElement('div'); row.style.display = 'flex'; row.style.gap = '2px';
    const b = document.createElement('button'); b.style.flex = '1';
    b.textContent = (d.name || 'Документ') + ' · ' + (i === docCur ? `${S.W}×${S.H}` : `${d.W}×${d.H}`);
    if (i === docCur) b.classList.add('cur');
    b.onclick = () => { m.classList.remove('on'); loadDoc(i); };
    row.appendChild(b);
    if (docs.length > 1) { const x = document.createElement('button'); x.textContent = '✕'; x.style.width = '40px';
      x.onclick = (ev) => { ev.stopPropagation(); m.classList.remove('on'); closeDoc(i); }; row.appendChild(x); }
    m.appendChild(row); });
  const add = document.createElement('button'); add.textContent = '＋ Новый документ…';
  add.onclick = () => { m.classList.remove('on'); $('new-ovl').classList.add('on'); }; m.appendChild(add);
  const others = locales().filter((l) => l !== getLocale());
  const lang = document.createElement('button'); lang.textContent = t('ui.language') + ': ' + getLocale().toUpperCase() + (others[0] ? ' → ' + others[0].toUpperCase() : '');
  lang.onclick = () => { m.classList.remove('on'); if (others[0]) setLocale(others[0]); }; m.appendChild(lang);
  const theme = document.createElement('button'); theme.textContent = t('ui.theme') + ': ' + (getTheme() === 'light' ? '☀' : '🌙');
  theme.onclick = () => { m.classList.remove('on'); toggleTheme(); }; m.appendChild(theme);
  showMenuAt(m, $('docsbtn').getBoundingClientRect().left, $('docsbtn').getBoundingClientRect().bottom + 6); }

export function mount() {
  const chips = $('new-chips'); chips.innerHTML = '';
  SIZE_PRESETS.forEach((p) => { const b = document.createElement('button'); b.dataset.w = p.w; b.dataset.h = p.h; b.textContent = p.label;
    if (p.w === DEFAULT_DOC.w && p.h === DEFAULT_DOC.h) b.classList.add('on');
    b.addEventListener('click', () => { $('new-w').value = p.w; $('new-h').value = p.h; chips.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); });
    chips.appendChild(b); });
  $('new').onclick = () => $('new-ovl').classList.add('on');
  $('new-cancel').onclick = () => $('new-ovl').classList.remove('on');
  actions.register('doc.new', () => $('new-ovl').classList.add('on'));
  $('new-create').onclick = () => { const w = parseInt($('new-w').value, 10), h = parseInt($('new-h').value, 10);
    if (!w || !h || w < 2 || h < 2 || w > MAX_SIZE || h > MAX_SIZE) { toast(`Размеры от 2 до ${MAX_SIZE}`); return; }
    $('new-ovl').classList.remove('on'); newDocument(w, h); };
  $('docsbtn').onclick = openDocsMenu;
  bus.on('send-layer', (L) => { if (docs.length < 2) { toast('Создай второй документ — кнопка слева сверху'); return; }
    saveDocState(); const m = $('cctx'); m.innerHTML = '';
    const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = 'Куда копировать:'; m.appendChild(head);
    docs.forEach((d, i) => { if (i === docCur) return; const b = document.createElement('button'); b.textContent = (d.name || 'Документ') + ` · ${d.W}×${d.H}`;
      b.onclick = () => { m.classList.remove('on'); sendLayerToDoc(L, i); }; m.appendChild(b); });
    m.style.visibility = 'hidden'; m.classList.add('on');
    requestAnimationFrame(() => { const r = m.getBoundingClientRect(); m.style.left = Math.round((innerWidth - r.width) / 2) + 'px'; m.style.top = Math.round(innerHeight * 0.35) + 'px'; m.style.visibility = ''; }); });
}
