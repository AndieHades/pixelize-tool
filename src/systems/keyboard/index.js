// Система клавиатуры: нормализует событие в «комбо», ищет действие в активной
// карте (дефолт + пользовательские переопределения из localStorage) и запускает
// его из реестра. Перенастройка — rebind()/resetKeymap(), сохраняется.
import * as actions from '../../core/actions.js';
import { DEFAULT_KEYMAP } from './keymap.js';
import { keyName } from '../../logic/key-code.js';

const STORE = 'keymap';

export function comboOf(e) { const k = keyName(e.code); if (!k) return null;
  return (e.ctrlKey || e.metaKey ? 'mod+' : '') + (e.shiftKey ? 'shift+' : '') + (e.altKey ? 'alt+' : '') + k; }

let overrides = {};
try { overrides = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) {}
let keymap = { ...DEFAULT_KEYMAP, ...overrides };

export const getKeymap = () => ({ ...keymap });
function persist() { try { localStorage.setItem(STORE, JSON.stringify(overrides)); } catch (e) {} }
export function rebind(combo, action) { overrides[combo] = action; keymap = { ...DEFAULT_KEYMAP, ...overrides }; persist(); }
export function unbind(combo) { overrides[combo] = null; keymap = { ...DEFAULT_KEYMAP, ...overrides }; persist(); }
export function resetKeymap() { overrides = {}; keymap = { ...DEFAULT_KEYMAP }; try { localStorage.removeItem(STORE); } catch (e) {} }

const typing = (t) => !!((t && t.matches && t.matches('input, textarea')) || (t && t.isContentEditable));

export function handle(e) {
  if (typing(e.target) || document.querySelector('.ovl.on')) return false; // ввод текста / открыт диалог
  const combo = comboOf(e); if (!combo) return false;
  const action = keymap[combo];
  if (!action || !actions.has(action)) return false;
  e.preventDefault(); actions.run(action); return true;
}

export function mount() { window.addEventListener('keydown', handle); }
