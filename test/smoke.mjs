// Smoke-тест: грузит приложение в headless-DOM и прогоняет сценарии из probe.js.
// Цель — поймать ошибки импортов/ссылок/TDZ и регрессии систем, которые нельзя
// проверить глазами без браузера.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeDom } from './harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const probe = fs.readFileSync(path.join(ROOT, 'test/probe.js'), 'utf8');

const classic = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const moduleEntry = (html.match(/<script type="module" src="([^"]+)"><\/script>/) || [])[1];

const dom = makeDom();

if (moduleEntry) {
  // после конвертации в ES-модули: точка входа поднимает window.__app = { run } для пробы
  globalThis.__JSDOM_WINDOW__ = dom.window;
  await import(pathToFileURL(path.join(ROOT, moduleEntry)).href);
  if (!dom.window.__app || !dom.window.__app.run) throw new Error('модульная точка входа не выставила window.__app.run');
  dom.window.__app.run(probe);
} else {
  dom.run(dom.concat(classic) + '\n;\n' + probe);
}

const R = dom.window.__result || globalThis.__result;
if (!R) { console.error('НЕТ результата — приложение не инициализировалось'); process.exit(1); }

console.log('Smoke-тест Pixel Heart:');
let fails = 0;
for (const t of R.tests) {
  if (t.ok) console.log(`  ok   ${t.name}`);
  else { fails++; console.error(`  FAIL ${t.name}\n       ${String(t.got).split('\n').slice(0, 4).join('\n       ')}`); }
}
if (fails) { console.error(`\n${fails}/${R.tests.length} сценариев упало`); process.exit(1); }
console.log(`\nВсе ${R.tests.length} сценариев прошли ✓`);
