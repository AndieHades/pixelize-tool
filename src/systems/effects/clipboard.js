// Операции с эффектами: контекст-меню строки (Правка/Скопировать/Удалить),
// копирование/вставка (на все выбранные слои) и перенос на другой слой.
import { cloneFx } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot } from '../../core/history.js';
import { $, showMenuAt, toast, t } from '../../core/dom.js';
import { openFxEdit } from './settings.js';
import { pasteTargets, getFxClip, setFxClip } from './shared.js';

let ref = null; // { target, eff } — для контекст-меню строки эффекта

const refresh = () => { bus.emit('layers'); bus.emit('render'); };

export function deleteFx(target, eff) { const i = target.effects.indexOf(eff); if (i < 0) return; snapshot(); target.effects.splice(i, 1); refresh(); }
export function copyFx(eff) { setFxClip(cloneFx([eff])); toast(t('toast.fxCopied')); }

export function pasteFx() { const clip = getFxClip(); if (!clip.length) { toast(t('toast.noFxClipboard')); return; }
  const targets = pasteTargets(); if (!targets.length) return; snapshot();
  for (const tg of targets) tg.effects.push(...cloneFx(clip)); refresh(); toast(t('toast.fxPasted')); }

// перенос эффекта со слоя/папки на другой слой/папку (drag в списке)
export function moveFx(eff, from, to) { if (!to || from === to) return; const i = from.effects.indexOf(eff); if (i < 0) return;
  snapshot(); from.effects.splice(i, 1); to.effects.push(eff); refresh(); }

export function openFxMenu(x, y, target, eff) { ref = { target, eff }; showMenuAt($('fxctx'), x, y); }

export function mountClipboard() {
  const close = () => $('fxctx').classList.remove('on');
  $('fxctx-edit').onclick = () => { close(); if (ref) openFxEdit(ref.target, ref.eff); };
  $('fxctx-copy').onclick = () => { close(); if (ref) copyFx(ref.eff); };
  $('fxctx-del').onclick = () => { close(); if (ref) deleteFx(ref.target, ref.eff); };
  actions.register('fx.paste', pasteFx);
}
