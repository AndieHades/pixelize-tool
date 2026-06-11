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
import * as documents from './systems/documents.js';
import * as importSys from './systems/import/index.js';
import * as palManager from './systems/palette-manager.js';
import * as preview from './systems/preview-window.js';
import * as reference from './systems/reference-window.js';
import * as input from './systems/input/index.js';
import * as crop from './systems/crop.js';
import * as transform from './systems/transform/index.js';
import * as outline from './systems/outline.js';
import * as shadow from './systems/shadow.js';
import * as glow from './systems/glow.js';
import * as bc from './systems/brightness-contrast.js';
import * as adjust from './systems/draw/adjust.js';
import * as gallery from './systems/gallery/index.js';
import * as newCanvas from './systems/new-canvas.js';

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
import './systems/export.js';
import { mount as mountKeyboard } from './systems/keyboard/index.js';

const MOUNTS = [palette, brushBar, colorPicker, toolbars, layersUI, documents, importSys, palManager, preview, reference, input, crop, transform, outline, shadow, glow, bc, adjust, gallery, newCanvas];

export function start() {
  detect(); applyTheme(); refreshColors();
  for (const m of MOUNTS) if (m.mount) m.mount();
  mountKeyboard();
  applyDom(); // проставить переводы в статичный UI

  floatingWindow($('palbar'), { grip: $('palgrip'), handle: $('palrsz'), storeKey: 'palwin', clampBottom: 50,
    onResize: (w, h) => { $('palbar').style.width = Math.max(130, Math.min(innerWidth - 12, w)) + 'px'; $('pal').style.height = Math.max(38, Math.min(innerHeight * 0.6, h)) + 'px'; } });
  floatingWindow($('sidebar'), { grip: $('sb-grip'), handle: $('sb-rsz'), storeKey: 'sbwin', clampRight: 46, clampBottom: 60,
    onResize: (w, h) => { $('sidebar').style.width = Math.max(48, Math.min(innerWidth - 12, w)) + 'px'; $('sidebar').style.maxHeight = Math.max(80, Math.min(innerHeight - 12, h)) + 'px'; } });

  for (const id of ['ovl', 'imp-ovl', 'new-ovl', 'ren-ovl', 'pal-ovl', 'exp-ovl', 'tools-ovl']) $(id).addEventListener('click', (e) => { if (e.target.id === id) $(id).classList.remove('on'); });
  $('ovlclose').onclick = () => $('ovl').classList.remove('on');

  requestAnimationFrame(() => { fitView(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

start();
window.__app = { S, bus, start }; // для headless-boot теста
