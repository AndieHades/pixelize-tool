# Каталог переиспользуемого

**Проверь этот список перед написанием любого помощника.** Если нужное здесь
есть — импортируй, не переписывай. Добавил общий помощник — впиши его сюда.

## `core/state.js` — данные и фабрики

| Имя | Назначение |
|-----|-----------|
| `S` | единый объект состояния (мутируй поля: `S.cur`, `S.layers`…) |
| `G()` | сетка текущего слоя (`S.layers[S.cur].grid`) |
| `blank(w,h)` | пустая `h×w` сетка из `null` |
| `newLayer(name,w,h)` | новый слой со стандартными полями |
| `MAX_LAYERS`,`MAX_SIZE`,`BP_SMAX` | потолок слоёв / стороны холста / размера кисти |

## `core/bus.js` — события

`on(event, fn) → off()` подписаться · `emit(event, payload)` послать. Список
событий — в [architecture.md](architecture.md).

## `logic/color.js` — цвет (чистый)

`hexToRgb` · `rgbToHex` · `rgb` (→ `rgb(r,g,b)`) · `eqc` (равенство по RGB,
игнорит альфу) · `rgbToHsv` · `hsvToRgb`.

## `logic/tint-shade.js` — оттенки и гармонии (чистый)

`generateTints(base)` / `generateShades(base)` — 5 цветов (база + 4 шага).
`generateHarmonyBaseColors(base, type)` — доп. базы по тону.
`generateTintShadeScalesForHarmony(base, type)` — `{base,tints,shades}[]`.
Шаги/углы — `config/tint-shade.js`.

## `logic/raster.js` — пиксельная сетка (чистый)

| Функция | Назначение |
|---------|-----------|
| `parseKey("x,y")` | `→ [x,y]`; разбор ключей `ext`. Не парси вручную. |
| `blendOver(s,d,sa)` | source-over: `s` (множитель альфы `sa`) поверх `d` |
| `mergeCells(b,t,op)` | пиксель `t` (непрозрачность `op`) поверх `b` |
| `gridBounds(g)` | охват непустых клеток `{minx,miny,maxx,maxy}` или `null` |
| `symmetrizeGrid(g,v,h)` | зеркалит опорную половину по осям |

## Сервисы `core/` (портируются — см. systems.md)

Эти куски были продублированы в монолите по 3–6 раз; в модулях они существуют
строго в одном месте. Не воссоздавай локально:

| Помощник | Что делает | Заменяет дубли в |
|----------|-----------|------------------|
| `compositeLayers(ctx)` / `paintStack(ctx,live)` | композит видимых слоёв (обтравка + эффекты слоёв/папок) в контекст | экспорт PNG, PSD, окно-превью, рендер |
| `layerSrcCanvas(i)` / `layerFxCanvas(i)` | canvas слоя с его неразрушающими эффектами (кеш по подписи) | композит, рендер |
| `saveFile(blob,name,mime,desc,overlay?)` | диалог→share→скачивание | весь экспорт |
| `placeImageLayer(w,h,data)` | RGBA-картинка новым слоем по центру | импорт, «слой из картинки» |
| `showMenuAt(el,ax,ay,above?)` | меню-бабл у якоря (ax,ay) с треугольником-указателем; единый вид всех меню | все контекстные меню (ctx/lctx/cctx/setmenu) |
| `floatingWindow(el,opts)` | drag за грип + resize за уголок + localStorage | палитра, боковая панель, окна слоёв/превью/референса |
| `core/pan-zoom.js` → `attachPanZoom(cv, view, opts)` | пан/зум двумя пальцами и колесом | холст, превью, референс |
| `markDirty(i)` / `layerCanvas(i)` | кеш слоя в `canvas` и его инвалидация | рендер, миниатюры, экспорт |
| `core/swipe-actions.js` → `attachSwipe(row, {actions, onSwipeRight?, guard?})` | свайп-влево (только тач) — липкая панель кнопок; свайп-вправо — разовый жест; открыта одна строка | «Новый холст» (правка/удаление), слои (Замок/Дубл./Удалить + выбор) |
| `core/swipe-actions.js` → `closeSwipe()` | закрыть открытую свайп-строку | при ре-рендере списков |
| `core/drag-ghost.js` → `dragGhost(el, width)` | клон элемента-призрака под курсором (`{move,remove}`) | перетаскивание плиток галереи и строк слоёв |
| `core/reorder-drag.js` → `attachReorder(el, {dropSel,itemSel,save,squelch})` | перестановка по тем же механикам, что цвета палитры (долгий тап/ПКМ) | кнопки тулбара и сайдбара |
| `core/env.js` → `isDesktop()` | `(hover:hover)` — мышь vs тач; свайпы только на таче | слои, «Новый холст» |
| `core/image.js` → `imageData(im,w,h,smooth)` / `looksPixelArt(im)` | растеризация картинки + эвристика «это пиксель-арт» | импорт, Photo в галерее |

> На время миграции часть этих помощников ещё живёт в `js/00-util.js`
> (классическая сборка). Канон — версии в `src/`. При портировании системы
> переноси вызовы на модульные.

## Кросс-срезы

| Ресурс | Как использовать |
|--------|------------------|
| `config/*` → `MAX_LAYERS`, `SIZE_PRESETS`, `GLOW_DEFAULT`, `LONG_PRESS_MS`… | любое настраиваемое значение (см. [config.md](config.md)) |
| `core/actions.js` → `register(name, fn)` / `run(name)` | команда по имени для хоткея/кнопки/меню (см. [keymap.md](keymap.md)) |
| `i18n` → `t('ключ', vars?)` | любая UI-строка; тексты в `locales/*` (см. [i18n.md](i18n.md)) |
| `styles/tokens.css` → `var(--col-…)`, `var(--btn)` | любое значение стиля (см. [theming.md](theming.md)) |

## Антипаттерны (так не делать)

- Ручной разбор `k.indexOf(',')` вместо `parseKey`.
- Свой цикл альфа-смешивания вместо `blendOver`/`mergeCells`.
- Свой цикл `for layers … drawImage` вместо `compositeLayers`.
- Свой сканер охвата `if(x<x0)x0=x…` вместо `gridBounds`.
- Своя обвязка drag/resize окна вместо `floatingWindow`.
- Прямой импорт другой системы вместо `bus.emit(...)`.
- Зашитая строка в UI вместо `t(...)`; зашитый цвет/размер вместо токена.
- Магическое число (предел/пресет/дефолт/тайминг) вместо значения из `config/*`.
- Разбор клавиш в системе вместо `keymap` + `actions`.
