# Карта модулей и статус миграции

Целевая раскладка: каждый модуль ≤170 строк и описывается **одной фразой**
(если во фразе появилось «и» — модуль надо делить). Колонка «источник» —
откуда код переносится из монолита `js/*.js`.

Статус: ✅ портирован · 🔲 ждёт.

## core/ — фундамент (импортируется кем угодно)

| Модуль | Одна фраза | Статус | Источник |
|--------|-----------|:--:|----------|
| `core/state.js` | хранит изменяемое состояние документа | ✅ | 01-state |
| `core/bus.js` | разносит синхронные события между системами | ✅ | (новое) |
| `core/dom.js` | даёт DOM-помощники (`$`, `toast`, `copyText`, `showMenuAt`) | ✅ | 01-state |
| `core/layers.js` | отвечает на запросы видимости/обтравки/симметрии слоёв | ✅ | 01-state |
| `core/document.js` | структурно меняет холст (expand/crop/clearLayer) | ✅ | 05-draw |
| `core/selection.js` | запросы попадания в выделение/маску | ✅ | 06-selection |
| `core/tools.js` | переключает активный инструмент | ✅ | 08-palette |
| `core/layer-cache.js` | кеширует слой в canvas и собирает композит | ✅ | 03-render |
| `core/history.js` | пишет и откатывает снимки документа | ✅ | 04-history |
| `core/actions.js` | реестр именованных действий (для хоткеев/кнопок/меню) | ✅ | (новое) |
| `core/io.js` | сохраняет canvas/blob в файл | ✅ | 11-export |

## logic/ — чистые вычисления (без DOM и state)

| Модуль | Одна фраза | Статус | Источник |
|--------|-----------|:--:|----------|
| `logic/color.js` | преобразует цвет между RGB/HEX/HSV | ✅ | 01-state |
| `logic/raster.js` | оперирует пиксельной сеткой | ✅ | 00-util |
| `logic/sample.js` | дискретизирует картинку в сетку клеток | ✅ | 02-convert |
| `logic/quantize.js` | сводит цвета к палитре (median-cut) | ✅ | 02-convert |
| `logic/cleanup.js` | чистит импортированную сетку (мусор/симметрия/поля) | ✅ | 02-convert |
| `logic/rotsprite.js` | поворачивает спрайт с чистыми гранями | ✅ | 02-convert |
| `logic/glow.js` | считает поле расстояний и ореол | ✅ | 05-draw |
| `logic/outline.js` | считает кольца обводки | ✅ | 05-draw |
| `logic/bc.js` | яркость/контраст клетки | ✅ | 05-draw |

## systems/ — оркестрация (один процесс; связь через state+bus)

| Модуль | Одна фраза | Статус | Источник |
|--------|-----------|:--:|----------|
| `systems/render/*` | рисует видимый холст (index+overlays+checker) | ✅ | 03-render |
| `systems/draw/*` | рисует: кисть/ластик/линия/прямоугольник/коррекция/заливка/пипетка | ✅ | 05-draw |
| `systems/outline.js` | обводит контур слоя | ✅ | 05-draw |
| `systems/shadow.js` | строит drop-shadow слоя | ✅ | 05-draw |
| `systems/glow.js` | строит ореол слоя | ✅ | 05-draw |
| `systems/mono.js` | переводит слой/изображение в монохром | ✅ | 05-draw |
| `systems/rotate-canvas.js` | поворачивает холст на 90° | ✅ | 05-draw |
| `systems/flip.js` | отражает слой по осям | ✅ | 05-draw |
| `systems/trim.js` | обрезает пустые поля до контура | ✅ | 05-draw |
| `systems/brightness-contrast.js` | правит яркость/контраст | ✅ | 05-draw |
| `systems/free-rotate.js` | применяет чистый поворот к слою | ✅ | 05-draw |
| `systems/crop.js` | интерактивно кадрирует холст | 🔲 | 05-draw |
| `systems/selection/model.js` | держит выделение, маски, операции содержимого | ✅ | 06-selection |
| `systems/selection-input.js` | тянет/тащит/растягивает выделение | 🔲 | 06-selection |
| `systems/selection/clipboard.js` | копирует/вырезает/вставляет/удаляет | ✅ | 06-selection |
| `systems/input.js` | разбирает указатель и жесты | 🔲 | 07-input |
| `systems/palette.js` | показывает палитру и выбирает цвет | 🔲 | 08-palette |
| `systems/recolor.js` | заменяет цвет по всему документу | ✅ | 08-palette |
| `systems/layers-list.js` | рисует список слоёв и папок | 🔲 | 09-layers-ui |
| `systems/layers-drag.js` | перетаскивает слои и папки | 🔲 | 09-layers-ui |
| `systems/layers-ops.js` | сливает/группирует/дублирует слои | 🔲 | 09-layers-ui |
| `systems/layers-menu.js` | контекстное меню слоя/папки | 🔲 | 09-layers-ui |
| `systems/import.js` | импортирует картинку в пиксель-арт | 🔲 | 10-import |
| `systems/export.js` | выгружает PNG/PSD | ✅ | 11-export |
| `systems/transform.js` | свободно трансформирует слой рамкой | 🔲 | 12-app |
| `systems/color-picker.js` | подбирает цвет в HSV | 🔲 | 12-app |
| `systems/brush-bar.js` | правит размер/непрозрачность кисти | 🔲 | 12-app |
| `systems/documents.js` | держит несколько документов | 🔲 | 12-app |
| `systems/preview-window.js` | показывает превью 1:1 | 🔲 | 12-app |
| `systems/reference-window.js` | показывает окно референса | 🔲 | 12-app |
| `systems/palette-manager.js` | сохраняет/грузит палитры | 🔲 | 12-app |
| `systems/toolbars.js` | настраивает и перетаскивает кнопки панелей | 🔲 | 12-app |
| `systems/keyboard/*` | сопоставляет комбо с действиями (data-driven, rebind) | ✅ | 12-app |
| `app.js` | поднимает системы и инициализирует приложение | 🔲 | 12-app |

> «Окна» (`floatingWindow`, `pinchZoom`) — общие помощники из
> [utilities.md](utilities.md), а не отдельные системы: preview/reference/палитра
> используют их, не дублируя обвязку.

## Кросс-срезы и продуктовые подсистемы

| Модуль | Одна фраза | Статус | Док |
|--------|-----------|:--:|-----|
| `i18n/index.js` + `i18n/locales/*` | переводит интерфейс по `t(ключ)` | 🔲 | [i18n.md](i18n.md) |
| `styles/tokens.css` | задаёт дизайн-токены темы | 🔲 | [theming.md](theming.md) |
| `systems/settings.js` | переключает язык и тему | 🔲 | i18n/theming |
| `core/storage.js` | хранит документы в IndexedDB | 🔲 | [roadmap.md](roadmap.md) §5 |
| `systems/gallery.js` | показывает галерею работ и открывает их | 🔲 | roadmap §5 |
| `systems/animation/*` | таймлайн кадров (точка расширения) | 🔲 | [architecture.md](architecture.md) |

## Конфигурация (`src/config/`)

| Файл | Что настраивает | Статус |
|------|-----------------|:--:|
| `config/limits.js` | пределы и глубина истории | ✅ |
| `config/presets.js` | пресеты размеров нового документа | ✅ |
| `config/palette.js` | палитра по умолчанию | ✅ |
| `config/defaults.js` | дефолты кисти/эффектов/импорта | ✅ |
| `config/timings.js` | тайминги и пороги жестов | ✅ |

Подробности — [config.md](config.md). Хоткеи — `systems/keyboard/keymap.js`.

## Инфраструктура

| Файл | Назначение | Статус |
|------|-----------|:--:|
| `vite.config.js` | конфиг сборки (base для Pages) | ✅ |
| `package.json` scripts | `dev`/`build`/`preview`/`test` | ✅ |
| `.github/workflows/deploy.yml` | сборка и публикация на Pages | ✅ (ждёт §1) |
| `src/app.js` | модульная точка входа (включает Vite-сборку) | 🔲 |

## Тесты

- `test/unit.mjs` — `logic/*`, `core/state`, `core/bus` в чистом node.
- `test/probe.js` — сценарии по системам, исполняются в общем scope приложения.
- `test/smoke.mjs` + `test/harness.mjs` — поднимают приложение в jsdom
  (фейковый 2D-контекст) и гоняют пробу. После переключения `index.html` на
  модули smoke грузит точку входа `app.js`, которая выставляет
  `window.__app.run(probe)`.

## Порядок переключения на модули (в конце миграции)

1. Все строки таблиц выше — ✅.
2. `app.js` выставляет `window.__app = { run }` для пробы.
3. `index.html`: один `<script type="module" src="src/app.js">` вместо `js/*.js`.
4. `npm test` зелёный по модульному пути.
5. Удалить `js/*.js` и `js/00-util.js`.
