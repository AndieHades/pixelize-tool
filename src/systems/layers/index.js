// Сборка панели слоёв: кнопки, плавающее окно, прозрачность, картинка-в-слой,
// меню выбора слоя по ПКМ. Список рисует list.js по событию 'layers'.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, toast, t } from '../../core/dom.js';
import { snapshot } from '../../core/history.js';
import { effVis } from '../../core/layers.js';
import { placeImageLayer } from '../../core/document.js';
import { floatingWindow } from '../../core/floating-window.js';
import { MAX_LAYERS } from '../../config/limits.js';
import { layList } from './list.js';
import { doAddLayer, doMerge, doGroup, deleteLayer } from './ops.js';
import { mountMenu } from './menu.js';

function openLayerMenu(px, py) { const m = $('cctx'); m.innerHTML = '';
  const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = 'Слой:'; m.appendChild(head);
  for (let i = S.layers.length - 1; i >= 0; i--) { const b = document.createElement('button'); b.textContent = S.layers[i].name;
    if (i === S.cur) b.classList.add('cur'); if (!effVis(i)) b.classList.add('dim');
    b.addEventListener('click', ((idx) => () => { S.cur = idx; layList(); m.classList.remove('on'); })(i)); m.appendChild(b); }
  showMenuAt(m, px, py); }

export function mount() {
  $('layers').addEventListener('click', () => { const p = $('lay-pop'); const on = p.classList.toggle('on'); $('layers').classList.toggle('on', on); if (on) layList(); });
  $('lay-add').addEventListener('click', doAddLayer);
  $('lay-merge').addEventListener('click', doMerge);
  $('lay-group').addEventListener('click', doGroup);
  $('lay-del').addEventListener('click', deleteLayer);
  $('lay-op').addEventListener('pointerdown', () => snapshot());
  $('lay-op').addEventListener('input', () => { S.layers[S.cur].opacity = +$('lay-op').value / 100; $('lay-opv').textContent = Math.round(S.layers[S.cur].opacity * 100) + '%'; bus.emit('render'); });
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  $('lay-img').addEventListener('click', () => { if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; } inp.click(); });
  inp.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const im = new Image(); im.onerror = () => toast(t('toast.imgOpenFail'));
    im.onload = () => { if (S.layers.length >= MAX_LAYERS) { toast(t('toast.maxLayers')); return; }
      const k = Math.min(S.W / im.naturalWidth, S.H / im.naturalHeight), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
      const d = c.getContext('2d').getImageData(0, 0, w, h).data; snapshot(); placeImageLayer(w, h, d); layList(); bus.emit('render'); toast(t('toast.imgToLayer')); };
    im.src = URL.createObjectURL(f); };
  floatingWindow($('lay-pop'), { grip: $('lay-head'), handle: $('lay-rsz'), storeKey: 'laywin', minW: 240, minH: 220,
    onResize: (w, h) => { $('lay-pop').style.width = Math.max(240, Math.min(innerWidth - 12, w)) + 'px';
      $('lay-pop').style.height = Math.max(220, Math.min(innerHeight - 12, h)) + 'px';
      $('lay-list').style.maxHeight = Math.max(80, $('lay-pop').getBoundingClientRect().height - 156) + 'px'; } });
  mountMenu();
  bus.on('layers', layList);
  bus.on('canvas-menu', (e) => openLayerMenu(e.clientX, e.clientY));
  actions.register('ui.layers', () => $('layers').click());
}
