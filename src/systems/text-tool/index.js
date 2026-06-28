import { S, MAX_LAYERS } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, t, toast } from '../../core/dom.js';
import { setTool } from '../../core/tools.js';
import { registerTool } from '../../core/canvas-handlers.js';
import { snapshot } from '../../core/history.js';
import { shiftLayerGrid } from '../../core/document.js';
import { markDirty, dirtyAll } from '../../core/layer-cache.js';
import { makeTextLayer, updateTextLayerGrid } from '../../core/text-layer.js';
import { loadTextPrefs } from '../../core/text-prefs.js';
import { loadFonts, fontById } from '../../core/font-store.js';

let drag = null, edit = null, fonts = [];
const cv = () => $('cv');
const textBtn = () => $('t-text');
const layerName = () => t('layer.textName') + ' ' + (S.layerSeq++);
const activeText = () => S.layers[S.cur] && S.layers[S.cur].kind === 'text' ? S.layers[S.cur] : null;

async function refreshFonts() { fonts = await loadFonts(); }

function hitText(gx, gy) {
  for (let i = S.layers.length - 1; i >= 0; i--) {
    const L = S.layers[i], b = L && L.text && L.text.box;
    if (L && L.kind === 'text' && L.visible !== false && b && gx >= b.x && gy >= b.y && gx < b.x + b.w && gy < b.y + b.h) return i;
  }
  return -1;
}

function selectLayer(i) {
  S.cur = i; S.bgSel = false; S.marked.clear(); S.markedFolders.clear(); S.selFolder = null; S.fxSel.clear(); S.fxCur = null;
  bus.emit('layers');
}

function createText(gx, gy) {
  if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return null; }
  snapshot();
  const L = makeTextLayer(layerName(), S.W, S.H, loadTextPrefs(), { x: gx, y: gy });
  const cur = S.layers[S.cur]; L.fid = cur ? cur.fid : null;
  const at = cur ? S.cur + 1 : S.layers.length;
  S.layers.splice(at, 0, L); selectLayer(at); dirtyAll(); bus.emitDoc(); toast(t('toast.textCreated'));
  return L;
}

function editorText() { const ed = $('text-editor'); return (ed.innerText ?? ed.textContent).replace(/\n$/, ''); }
function placeEditor() {
  if (!edit) return;
  const L = edit.layer, ed = $('text-editor'), r = cv().getBoundingClientRect(), z = S.view.zoom, b = L.text.box;
  const f = fontById(L.text.fontId, fonts);
  ed.style.left = r.left + S.view.ox + b.x * z + 'px';
  ed.style.top = r.top + S.view.oy + b.y * z + 'px';
  ed.style.width = Math.max(24, b.w * z) + 'px';
  ed.style.minHeight = Math.max(18, b.h * z) + 'px';
  ed.style.fontSize = Math.max(10, L.text.size * z) + 'px';
  ed.style.lineHeight = Math.max(12, L.text.size * L.text.lineHeight * z) + 'px';
  ed.style.fontFamily = f.family; ed.style.color = L.text.color;
}

function commitEdit(save = true) {
  if (!edit) return;
  const { layer, original } = edit, ed = $('text-editor');
  if (save) layer.text.value = editorText(); else layer.text = original;
  updateTextLayerGrid(layer, S.W, S.H, fonts); markDirty(S.layers.indexOf(layer));
  edit = null; ed.classList.remove('on'); ed.blur(); bus.emit('layers'); bus.emit('render');
}

function startEdit(L = activeText()) {
  if (!L || L.lock) return false;
  if (edit) commitEdit(true);
  snapshot(); edit = { layer: L, original: JSON.parse(JSON.stringify(L.text)) };
  const ed = $('text-editor'); ed.textContent = L.text.value || '';
  ed.classList.add('on'); placeEditor(); ed.focus();
  const range = document.createRange(); range.selectNodeContents(ed); const sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(range); return true;
}

function finishDrag() {
  if (!drag) return;
  const { idx, dx, dy } = drag; S.moveDrag = null; drag = null;
  if (!dx && !dy) { bus.emit('render'); return; }
  snapshot(); shiftLayerGrid(S.layers[idx], dx, dy); markDirty(idx); bus.emit('layers'); bus.emit('render');
}

const handler = {
  down({ gx, gy, e }) {
    if (edit) commitEdit(true);
    const i = hitText(gx, gy);
    if (i >= 0) { selectLayer(i); if (e && e.detail >= 2) { startEdit(S.layers[i]); return; }
      drag = { idx: i, sx: gx, sy: gy, dx: 0, dy: 0 }; return; }
    const L = createText(gx, gy); if (L) startEdit(L);
  },
  move({ gx, gy }) { if (!drag) return; drag.dx = gx - drag.sx; drag.dy = gy - drag.sy; S.moveDrag = { ...drag, idxs: [drag.idx] }; bus.emit('render'); },
  up() { finishDrag(); },
  hover({ gx, gy }) { return hitText(gx, gy) >= 0 ? 'move' : 'text'; },
};

function activateText() { if (S.tool === 'text') setTool('pencil'); else { setTool('text'); actions.run('ui.fontLibrary', true); } }
function syncButton() { const b = textBtn(); if (b) b.classList.toggle('on', S.tool === 'text'); }

export function mount() {
  refreshFonts(); registerTool('text', handler);
  actions.register('tool.text', activateText);
  actions.register('text.editLayer', (i = S.cur) => { if (S.layers[i]?.kind === 'text') { selectLayer(i); return startEdit(S.layers[i]); } return false; });
  textBtn().onclick = activateText;
  bus.on('tool', syncButton); bus.on('render', placeEditor); bus.on('layers', refreshFonts);
  $('text-editor').addEventListener('blur', () => commitEdit(true));
  $('text-editor').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); commitEdit(false); } });
  $('lay-list').addEventListener('dblclick', (e) => { const r = e.target.closest('.lrow[data-li]'); if (r) actions.run('text.editLayer', +r.dataset.li); });
  syncButton();
}
