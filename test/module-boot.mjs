// Boot-тест модульной точки входа: грузим src/app.js в headless-DOM и проверяем,
// что приложение поднимается без ошибок (палитра построена, системы смонтированы).
import assert from 'node:assert/strict';
import { makeDom } from './harness.mjs';

const { window } = makeDom();
for (const k of ['document', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia', 'HTMLCanvasElement', 'Blob', 'File', 'Image', 'localStorage', 'getSelection', 'performance', 'window']) {
  try { Object.defineProperty(globalThis, k, { value: k === 'window' ? window : window[k], configurable: true, writable: true }); } catch (e) {}
}
globalThis.URL.createObjectURL = () => 'blob:stub';
globalThis.URL.revokeObjectURL = () => {};

await import('../src/app.js');

assert.ok(window.__app && window.__app.S, 'window.__app выставлен');
assert.ok(document.querySelectorAll('#pal .sw:not(.plus)').length > 0, 'палитра построена');
assert.ok(document.getElementById('active').style.background, 'активный цвет отрисован');
console.log('Boot-тест: приложение поднялось ✓');
console.log(`  свотчей в палитре: ${document.querySelectorAll('#pal .sw:not(.plus)').length}`);
