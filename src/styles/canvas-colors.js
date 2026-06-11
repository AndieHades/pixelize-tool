// Цвета холста для JS-рендера, читаются из CSS-токенов (var(--cv-*)) и
// обновляются при смене темы. Дефолты — тёмная тема (на случай headless).
import * as bus from '../core/bus.js';

export const C = { bg: '#0d0d10', doc: '#141419', check1: '#1a1a20', check2: '#222228', grid: 'rgba(255,255,255,.05)' };
const KEYS = { bg: '--cv-bg', doc: '--cv-doc', check1: '--cv-check1', check2: '--cv-check2', grid: '--cv-grid' };

export function refreshColors() {
  if (typeof getComputedStyle !== 'function') return;
  const cs = getComputedStyle(document.documentElement);
  for (const k in KEYS) { const v = cs.getPropertyValue(KEYS[k]).trim(); if (v) C[k] = v; }
}

bus.on('theme', refreshColors);
