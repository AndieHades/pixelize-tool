// Точка входа приложения: поднимает все системы (импорт регистрирует их
// действия/обработчики и самоподписки на шину), монтирует UI, инициализирует.
import { S } from './core/state.js';
import * as bus from './core/bus.js';
import { $ } from './core/dom.js';
import { floatingWindow } from './core/floating-window.js';
import { fitView } from './systems/render/index.js';
import { detect, applyDom } from './i18n/index.js';
import { applyTheme } from './styles/theme.js';
import { refreshColors } from './styles/canvas-colors.js';

// системы с UI-монтированием
import * as palette from './systems/palette.js';
import * as brushBar from './systems/brush-bar.js';
import * as colorPicker from './systems/color-picker.js';
import * as toolbars from './systems/toolbars.js';
import * as layersUI from './systems/layers/index.js';
import * as importSys from './systems/import/index.js';
import * as importEditor from './systems/import/editor.js';
import * as exportSys from './systems/export/index.js';
import * as palManager from './systems/palette-manager.js';
import * as tintShade from './systems/tint-shade/index.js';
import * as preview from './systems/preview-window.js';
import * as reference from './systems/reference-window.js';
import * as input from './systems/input/index.js';
import * as crop from './systems/crop.js';
import * as transform from './systems/transform/index.js';
import * as effects from './systems/effects/index.js';
import * as bc from './systems/brightness-contrast.js';
import * as adjust from './systems/draw/adjust.js';
import * as gallery from './systems/gallery/index.js';
import * as newCanvas from './systems/new-canvas.js';
import * as settings from './systems/settings.js';
import * as panels from './systems/panels.js';
import * as selBar from './systems/selection/bar.js';
import * as status from './systems/status.js';
import * as toolpops from './systems/toolpops.js';

// системы-эффекты без mount: импорт регистрирует инструменты/действия/тулы
import './systems/draw/tools.js';
import './systems/move-tool.js';
import './systems/selection/input.js';
import './systems/selection/clipboard.js';
import './systems/rotate-canvas.js';
import './systems/flip.js';
import './systems/trim.js';
import './systems/mono.js';
import './systems/recolor.js';
import './systems/free-rotate.js';
import { mount as mountKeyboard } from './systems/keyboard/index.js';

const MOUNTS = [palette, brushBar, colorPicker, toolbars, layersUI, importSys, importEditor, exportSys, palManager, tintShade, preview, reference, input, crop, transform, effects, bc, adjust, gallery, newCanvas, settings, panels, selBar, status, toolpops];

export function start() {
  detect(); applyTheme(); refreshColors();
  for (const m of MOUNTS) if (m.mount) m.mount();
  mountKeyboard();
  applyDom(); // проставить переводы в статичный UI

  floatingWindow($('palbar'), { grip: $('palgrip'), handle: $('palrsz'), storeKey: 'palwin', clampBottom: 50,
    onClose: () => $('palbar').classList.add('closed'), // крестик прячет палитру; вернуть — кружком цвета
    onResize: (w, h) => { $('palbar').style.width = Math.max(130, Math.min(innerWidth - 12, w)) + 'px'; $('pal').style.height = Math.max(38, Math.min(innerHeight * 0.6, h)) + 'px'; } });
  floatingWindow($('sidebar'), { grip: $('sb-grip'), handle: $('sb-rsz'), storeKey: 'sbwin', clampRight: 46, clampBottom: 60,
    onResize: (w, h) => { $('sidebar').style.width = Math.max(48, Math.min(innerWidth - 12, w)) + 'px'; $('sidebar').style.maxHeight = Math.max(80, Math.min(innerHeight - 12, h)) + 'px'; } });

  // ЕДИНО: любой модальный диалог (.ovl .sheet) — перетаскиваемое окно за заголовок.
  // Уже подключённые окна (конвертер/экспорт) пропускаются идемпотентным floatingWindow.
  // Новые диалоги достаточно сверстать как <div class="ovl"><div class="sheet"><h3>…
  for (const win of document.querySelectorAll('.ovl .sheet, .ovl .new-panel')) floatingWindow(win, { grip: win.querySelector('.new-head, .pop-head, h3') || win, storeKey: win.id ? 'win-' + win.id : undefined });

  for (const id of ['ovl', 'new-ovl', 'ren-ovl', 'tools-ovl']) $(id).addEventListener('click', (e) => { if (e.target.id === id) $(id).classList.remove('on'); }); // окна (imp-ovl/export-ovl/pal-ovl) не закрываем по фону — только крестиком
  document.addEventListener('pointerdown', (e) => { // контекстные меню закрываются кликом мимо (это не окна)
    for (const id of ['ctx', 'lctx', 'cctx', 'fxctx', 'impmenu', 'setmenu', 'rowctx', 'tctx']) { const m = $(id); if (m && m.classList.contains('on') && !m.contains(e.target)) m.classList.remove('on'); } }, true);
  $('ovlclose').onclick = () => $('ovl').classList.remove('on');
  window.addEventListener('blur', () => { // защита: не оставлять призрак/состояние драга при потере фокуса (скриншот, alt-tab)
    document.querySelectorAll('.drag-ghost').forEach((g) => g.remove());
    document.querySelectorAll('.dragging, .lift, .lifting, .over, .drop-into, .drop-before, .drop-above').forEach((n) => n.classList.remove('dragging', 'lift', 'lifting', 'over', 'drop-into', 'drop-before', 'drop-above')); });

  requestAnimationFrame(() => { fitView(); });
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
}

start();
window.__app = { S, bus, start }; // для headless-boot теста
