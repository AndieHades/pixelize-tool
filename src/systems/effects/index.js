// Сборка системы эффектов слоя: панель, окно настроек, контекст-меню и буфер.
// Регистрирует именованные действия — список слоёв (fx-строки) дёргает их через bus.
import * as actions from '../../core/actions.js';
import { mountPanel } from './panel.js';
import { mountSettings, openFxEdit } from './settings.js';
import { mountClipboard, openFxMenu, moveFx, deleteFx, copyFx } from './clipboard.js';

export function mount() {
  mountPanel(); mountSettings(); mountClipboard();
  actions.register('fx.edit', openFxEdit);
  actions.register('fx.menu', openFxMenu);
  actions.register('fx.move', moveFx);
  actions.register('fx.delete', deleteFx);
  actions.register('fx.copy', copyFx);
}
