// Жесты по строке слоя. Свайп влево — настраиваемые кнопки действий
// (config/layer-actions.js). Свайп вправо — выбор слоя цветом (мультивыбор:
// смахни несколько). Те же действия есть в контекстном меню (menu.js).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { t } from '../../i18n/index.js';
import { attachSwipe } from '../../core/swipe-actions.js';
import { isDesktop } from '../../core/env.js';
import { LAYER_SWIPE_ACTIONS } from '../../config/layer-actions.js';
import { duplicateLayer, deleteLayerRef, toggleLock, toggleAlphaLock, toggleClip } from './ops.js';
import { pinchActive } from './pinch.js';

const ACT = {
  lock: (L) => ({ label: t('menu.lock'), on: L.lock, onClick: () => toggleLock(L) }),
  alphaLock: (L) => ({ label: t('menu.alphaLock'), on: L.alphaLock, onClick: () => toggleAlphaLock(L) }),
  clip: (L) => ({ label: t('menu.clipMask'), on: L.clip, onClick: () => toggleClip(L) }),
  duplicate: (L) => ({ label: t('menu.duplicate'), onClick: () => duplicateLayer(L) }),
  delete: (L) => ({ label: t('menu.delete'), danger: true, onClick: () => deleteLayerRef(L) }),
};

function toggleSelect(L) { const i = S.layers.indexOf(L); if (i < 0) return;
  if (S.marked.has(i)) S.marked.delete(i); else S.marked.add(i); bus.emit('layers'); }

export function attachLayerSwipe(row, L) {
  if (isDesktop()) return; // на десктопе свайпа нет — действия в ПКМ-меню (lctx)
  attachSwipe(row, { actions: LAYER_SWIPE_ACTIONS.filter((id) => ACT[id]).map((id) => ACT[id](L)), onSwipeRight: () => toggleSelect(L), guard: pinchActive });
}
