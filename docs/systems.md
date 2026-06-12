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
| `core/document.js` | структурно меняет холст (expand/crop/clearLayer/placeImage/картинка верхним слоем) | ✅ | 05-draw |
| `core/selection.js` | запросы попадания в выделение/маску | ✅ | 06-selection |
| `core/tools.js` | переключает активный инструмент | ✅ | 08-palette |
| `core/canvas-handlers.js` | реестр обработчиков холста (инструменты/режимы) | ✅ | 07-input |
| `core/layer-cache.js` | кеширует слой в canvas и собирает композит | ✅ | 03-render |
| `core/composite.js` | раскладка композита: слои+обтравка+эффекты слоёв/папок | ✅ | (эффекты) |
| `core/effects-render.js` | растеризует эффекты слоя/папки в canvas (кеш по подписи) | ✅ | (эффекты) |
| `core/history.js` | пишет и откатывает снимки документа | ✅ | 04-history |
| `core/actions.js` | реестр именованных действий (для хоткеев/кнопок/меню) | ✅ | (новое) |
| `core/io.js` | сохраняет canvas/blob в файл | ✅ | 11-export |
| `core/image.js` | `imageData`/`looksPixelArt` — растеризация и эвристика пиксель-арта | ✅ | (новое) |
| `core/storage.js` | документы галереи в IndexedDB | ✅ | (новое) |
| `core/swipe-actions.js` | свайп строки → панель действий / разовый жест (тач) | ✅ | (новое) |
| `core/drag-ghost.js` | `dragGhost(el)` — клон-призрак под курсором (плитки, слои) | ✅ | (новое) |
| `core/reorder-drag.js` | `attachReorder` — перестановка кнопок (как цвета палитры) | ✅ | (новое) |
| `core/env.js` | `isDesktop()` — тип управления (мышь vs тач) | ✅ | (новое) |

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
| `logic/layer-effects.js` | пиксели эффектов слоя из маски силуэта (обводка/свечение/тени) | ✅ | (эффекты) |
| `logic/bc.js` | яркость/контраст клетки | ✅ | 05-draw |
| `logic/tint-shade.js` | генерирует 5-цветные шкалы тинтов/шейдов и цвета гармоний | ✅ | (новое) |

## systems/ — оркестрация (один процесс; связь через state+bus)

| Модуль | Одна фраза | Статус | Источник |
|--------|-----------|:--:|----------|
| `systems/render/*` | рисует видимый холст (index+overlays+checker) | ✅ | 03-render |
| `systems/draw/*` | рисует: кисть/ластик/линия/прямоугольник/коррекция/заливка/пипетка | ✅ | 05-draw |
| `systems/effects/*` | неразрушающие Layer Effects: панель, окно настроек (превью+Apply/Cancel), копипаст/меню | ✅ | (эффекты) |
| `systems/mono.js` | переводит слой/изображение в монохром | ✅ | 05-draw |
| `systems/rotate-canvas.js` | поворачивает холст на 90° | ✅ | 05-draw |
| `systems/flip.js` | отражает слой по осям | ✅ | 05-draw |
| `systems/trim.js` | обрезает пустые поля до контура | ✅ | 05-draw |
| `systems/brightness-contrast.js` | правит яркость/контраст | ✅ | 05-draw |
| `systems/free-rotate.js` | применяет чистый поворот к слою | ✅ | 05-draw |
| `systems/crop.js` | интерактивно кадрирует холст | ✅ | 05-draw |
| `systems/selection/model.js` | держит выделение, маски, операции содержимого | ✅ | 06-selection |
| `systems/selection/input.js` + `float.js` | тянет/тащит/растягивает выделение | ✅ | 06-selection |
| `systems/selection/clipboard.js` | копирует/вырезает/вставляет/удаляет | ✅ | 06-selection |
| `systems/input/*` | разбирает указатель и тач-жесты, диспетчеризует в обработчики | ✅ | 07-input |
| `systems/palette.js` | показывает палитру и выбирает цвет | ✅ | 08-palette |
| `systems/recolor.js` | заменяет цвет по всему документу | ✅ | 08-palette |
| `systems/import/*` | импорт в редактор: кнопка Import (Photo/File/Pixelize), конвертер, вставка PSD папкой | ✅ | 10-import |
| `systems/export.js` | выгружает PNG/PSD | ✅ | 11-export |
| `systems/transform/*` | свободно трансформирует слой рамкой | ✅ | 12-app |
| `systems/layers/*` | панель слоёв: вложенные группы, список/драг/свайпы/щипок-слияние/операции/меню, строки эффектов (fx-rows) | ✅ | 09-layers-ui |
| `systems/panels.js` | перестановка кнопок тулбара/сайдбара (ПКМ-удержание/долгий тап) | ✅ | (новое) |
| `systems/color-picker.js` | подбирает цвет в HSV | ✅ | 12-app |
| `systems/brush-bar.js` | правит размер/непрозрачность кисти | ✅ | 12-app |
| `systems/preview-window.js` | показывает превью 1:1 | ✅ | 12-app |
| `systems/reference-window.js` | показывает окно референса | ✅ | 12-app |
| `systems/palette-manager.js` | сохраняет/грузит палитры | ✅ | 12-app |
| `systems/tint-shade/*` | окно Tint & Shade: шкалы тинтов/шейдов + гармонии от базового цвета, выбор → палитра | ✅ | (новое) |
| `systems/toolbars.js` | кнопки панелей: инструменты/тогглы/эффекты/экспорт | ✅ | 12-app |
| `systems/keyboard/*` | сопоставляет комбо с действиями (data-driven, rebind) | ✅ | 12-app |
| `app.js` | поднимает системы и инициализирует приложение | ✅ | 12-app |

> «Окна» (`floatingWindow`, `pinchZoom`) — общие помощники из
> [utilities.md](utilities.md), а не отдельные системы: preview/reference/палитра
> используют их, не дублируя обвязку.

## Кросс-срезы и продуктовые подсистемы

| Модуль | Одна фраза | Статус | Док |
|--------|-----------|:--:|-----|
| `i18n/index.js` + `i18n/locales/*` | переводит интерфейс по `t(ключ)` (ru/en, паритет) | ✅ | [i18n.md](i18n.md) |
| `styles/tokens.css` | дизайн-токены темы (синий — один токен `--accent`) | ✅ | [theming.md](theming.md) |
| `systems/settings.js` | тумблер темы + смена языка (шестерёнка в галерее) | ✅ | i18n/theming |
| `systems/gallery/store.js` | элементы галереи: вложенные папки, перемещение, дубль, удаление, уникальные имена | ✅ | roadmap §5 |
| `systems/gallery/doc.js` | персистентность активной работы (снимок ↔ запись, автосейв) | ✅ | roadmap §5 |
| `systems/gallery/drag.js` | перетаскивание плиток (долгий тап → драг → папка) | ✅ | roadmap §5 |
| `systems/gallery/screen.js` | рендер плиток, режим выбора, переименование | ✅ | roadmap §5 |
| `systems/gallery/index.js` | кнопки (Photo/Convert/Import/Select/＋), навигация, инициализация | ✅ | roadmap §5 |
| `systems/new-canvas.js` | диалог «Новый холст»: пресеты + кастомные размеры | ✅ | roadmap §5 |
| `logic/psd.js` | чтение PSD послойно (raw + RLE): пиксели, видимость, группы, эффекты | ✅ | roadmap §5 |
| `logic/psd-effects.js` | разбор lfx2 → эффекты PixelHeart (best-effort) | ✅ | (импорт) |
| `styles/animations.css` | анимации UI (нажатие, выбор, драг) — единое место | ✅ | [theming.md](theming.md) |
| `systems/animation/*` | таймлайн кадров (точка расширения) | 🔲 | [architecture.md](architecture.md) |

## Конфигурация (`src/config/`)

| Файл | Что настраивает | Статус |
|------|-----------------|:--:|
| `config/limits.js` | пределы и глубина истории | ✅ |
| `config/presets.js` | пресеты размеров нового документа | ✅ |
| `config/palette.js` | палитра по умолчанию | ✅ |
| `config/defaults.js` | дефолты кисти/эффектов/импорта | ✅ |
| `config/timings.js` | тайминги и пороги жестов | ✅ |
| `config/layer-actions.js` | набор кнопок свайпа строки слоя (`LAYER_SWIPE_ACTIONS`) | ✅ |
| `config/tint-shade.js` | шаги шкал (`TINT_SHADE_STEPS`) и углы гармоний (`HARMONY_OFFSETS`) | ✅ |

Подробности — [config.md](config.md). Хоткеи — `systems/keyboard/keymap.js`.

## Инфраструктура

| Файл | Назначение | Статус |
|------|-----------|:--:|
| `vite.config.js` | конфиг сборки (base для Pages) | ✅ |
| `package.json` scripts | `dev`/`build`/`preview`/`test` | ✅ |
| `.github/workflows/deploy.yml` | сборка и публикация на Pages | ✅ |
| `src/app.js` | модульная точка входа (Vite-сборка активна) | ✅ |

## Тесты

- `test/unit.mjs` — `logic/*`, `core/state`, `core/bus` в чистом node.
- `test/module-int.mjs` — системы под jsdom (импорт модулей напрямую), 61 сценарий.
- `test/module-boot.mjs` — загрузка `src/app.js` целиком (приложение поднимается).
- `test/harness.mjs` — общий jsdom + фейковый 2D-контекст.

## Миграция завершена ✅

`index.html` грузит `src/app.js` (модули); монолит `js/*.js` удалён;
`vite build` собирает `dist/`; `npm test` зелёный по модульному пути
(unit + module-int + module-boot). Осталась ручная проверка интерактива в
браузере перед мержем и продуктовые фазы §3–§6 (см. [roadmap.md](roadmap.md)).
