// Операции с эффектами как со слоями: контекст-меню строки (Правка/Скопировать/
// Дублировать/Удалить) работает над выделением; копирование/вставка на все
// выбранные слои. Перенос/переупорядочивание — drag в списке (layers/fx-drag).
import { S, cloneFx } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { $, showMenuAt, toast, t } from '../../core/dom.js';
import { openFxEdit } from './settings.js';
import { pasteTargets, getFxClip, setFxClip, ownerOf, selectedEffects } from './shared.js';

let ref = null; // { target, eff } — по какой строке открыто меню
const refresh = () => { bus.emit('layers'); bus.emit('render'); };

export function deleteFx() { const list = selectedEffects(); if (!list.length) return; snapshot();
  for (const e of list) { const o = ownerOf(e); if (o) { const i = o.effects.indexOf(e); if (i >= 0) o.effects.splice(i, 1); } }
  S.fxSel.clear(); S.fxCur = null; refresh(); }

export function duplicateFx() { const list = selectedEffects(); if (!list.length) return; snapshot(); const made = new Set();
  for (const e of list) { const o = ownerOf(e); if (!o) continue; const i = o.effects.indexOf(e); const c = cloneFx([e])[0];
    o.effects.splice(i + 1, 0, c); made.add(c); }
  S.fxSel = made; S.fxCur = [...made][0] || null; refresh(); }

export function copyFx() { const list = selectedEffects(); if (!list.length) return; setFxClip(cloneFx(list)); toast(t('toast.fxCopied')); }

export function pasteFx() { const clip = getFxClip(); if (!clip.length) { toast(t('toast.noFxClipboard')); return; }
  const targets = pasteTargets(); if (!targets.length) return; snapshot();
  for (const tg of targets) tg.effects.push(...cloneFx(clip)); refresh(); toast(t('toast.fxPasted')); }

export function openFxMenu(x, y, target, eff) { ref = { target, eff }; showMenuAt($('fxctx'), x, y); }

export function mountClipboard() {
  const close = () => $('fxctx').classList.remove('on');
  $('fxctx-edit').onclick = () => { close(); if (ref) openFxEdit(ref.target, ref.eff); };
  $('fxctx-copy').onclick = () => { close(); copyFx(); };
  $('fxctx-dup').onclick = () => { close(); duplicateFx(); };
  $('fxctx-del').onclick = () => { close(); deleteFx(); };
}
