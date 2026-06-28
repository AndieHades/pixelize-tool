import { TEXT_DEFAULT, TEXT_SIZE } from '../config/text.js';
import { clamp, clampRound } from './math.js';

const HEX = /^#[0-9a-fA-F]{6}$/;
const ALIGNS = new Set(['left', 'center', 'right']);
const finite = (v, fallback) => Number.isFinite(+v) ? +v : fallback;
const str = (v, fallback = '') => typeof v === 'string' ? v : fallback;
const hex = (v, fallback = TEXT_DEFAULT.color) => HEX.test(str(v)) ? v.toLowerCase() : fallback;

function normBox(box = {}) {
  const d = TEXT_DEFAULT.box;
  return {
    x: Math.round(finite(box.x, d.x)),
    y: Math.round(finite(box.y, d.y)),
    w: Math.max(1, Math.round(finite(box.w, d.w))),
    h: Math.max(1, Math.round(finite(box.h, d.h))),
  };
}

function normTransform(tr = {}) {
  const d = TEXT_DEFAULT.transform;
  return {
    x: finite(tr.x, d.x),
    y: finite(tr.y, d.y),
    scaleX: finite(tr.scaleX, d.scaleX) || d.scaleX,
    scaleY: finite(tr.scaleY, d.scaleY) || d.scaleY,
    rotation: finite(tr.rotation, d.rotation),
  };
}

export function normalizeTextPrefs(p = {}) {
  return {
    fontId: str(p.fontId, TEXT_DEFAULT.fontId) || TEXT_DEFAULT.fontId,
    size: clampRound(finite(p.size, TEXT_DEFAULT.size), TEXT_SIZE.min, TEXT_SIZE.max),
    color: hex(p.color),
  };
}

export function normalizeTextSource(src = {}) {
  const prefs = normalizeTextPrefs(src);
  return {
    value: str(src.value, TEXT_DEFAULT.value),
    ...prefs,
    align: ALIGNS.has(src.align) ? src.align : TEXT_DEFAULT.align,
    lineHeight: clamp(finite(src.lineHeight, TEXT_DEFAULT.lineHeight), 0.8, 3),
    letterSpacing: clamp(finite(src.letterSpacing, TEXT_DEFAULT.letterSpacing), -8, 32),
    box: normBox(src.box),
    transform: normTransform(src.transform),
  };
}

export function cloneTextSource(src = {}) {
  const n = normalizeTextSource(src);
  return { ...n, box: { ...n.box }, transform: { ...n.transform } };
}

export function moveTextSource(src, dx, dy) {
  const n = cloneTextSource(src);
  n.box.x += Math.round(finite(dx, 0));
  n.box.y += Math.round(finite(dy, 0));
  return n;
}

export const isTextLayer = (L) => !!(L && L.kind === 'text' && L.text);
