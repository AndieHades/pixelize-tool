// Сборка панели слоёв: кнопки, плавающее окно, прозрачность, картинка-в-слой,
// меню выбора слоя по ПКМ. Список рисует list.js по событию 'layers'.
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt, t } from '../../core/dom.js';
import { snapshot } from '../../core/history.js';
import { effVis } from '../../core/layers.js';
import { floatingWindow } from '../../core/floating-window.js';
import { layList } from './list.js';
import { mountActionBars } from './actions-bar.js';
import { mountPinch } from './pinch.js';
import { mountMenu } from './menu.js';

function openLayerMenu(px, py) { const m = $('cctx'); m.innerHTML = '';
  const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = t('menu.pickLayer'); m.appendChild(head);
  for (let i = S.layers.length - 1; i >= 0; i--) { const b = document.createElement('button'); b.textContent = S.layers[i].name;
    if (i === S.cur) b.classList.add('cur'); if (!effVis(i)) b.classList.add('dim');
    b.addEventListener('click', ((idx) => () => { S.cur = idx; layList(); m.classList.remove('on'); })(i)); m.appendChild(b); }
  showMenuAt(m, px, py); }

export function mount() {
  $('layers').addEventListener('click', () => { const p = $('lay-pop'); const on = p.classList.toggle('on'); $('layers').classList.toggle('on', on); if (on) layList(); });
  mountActionBars();
  $('lay-op').addEventListener('pointerdown', () => snapshot());
  $('lay-op').addEventListener('input', () => { S.layers[S.cur].opacity = +$('lay-op').value / 100; $('lay-opv').textContent = Math.round(S.layers[S.cur].opacity * 100) + '%'; bus.emit('render'); });
  floatingWindow($('lay-pop'), { grip: $('lay-head'), handle: $('lay-rsz'), storeKey: 'laywin', minW: 240, minH: 220,
    onClose: () => { $('lay-pop').classList.remove('on'); $('layers').classList.remove('on'); },
    onResize: (w, h) => { $('lay-pop').style.width = Math.max(240, Math.min(innerWidth - 12, w)) + 'px';
      $('lay-list').style.maxHeight = Math.max(80, h - 198) + 'px'; } }); // высота окна — по содержимому; ресайз тянет область списка
  mountMenu();
  mountPinch();
  bus.on('layers', layList);
  bus.on('locale', layList);
  bus.on('canvas-menu', (e) => openLayerMenu(e.clientX, e.clientY));
  actions.register('ui.layers', () => $('layers').click());
}
