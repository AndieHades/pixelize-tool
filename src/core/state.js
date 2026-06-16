// Слой данных: единственный изменяемый объект состояния документа.
// Системы общаются с ним только через этот модуль — прямых связей между
// системами нет. Поля менять как S.W = …, не реэкспортируя биндинги.
// Настраиваемые значения берутся из src/config (а не зашиты тут).
import { MAX_LAYERS, MAX_SIZE, BP_SMAX } from '../config/limits.js';
import { DEFAULT_DOC } from '../config/presets.js';
import { defaultPalette, DEFAULT_ACTIVE } from '../config/palette.js';
import { BRUSH_DEFAULTS, FLAGS_DEFAULT, ADJUST_DEFAULT, EFFECT_DEFAULTS } from '../config/defaults.js';
import { LASSO_DEFAULT } from '../config/lasso.js';
import { BRUSH_RESIZE } from '../config/brush-resize.js';
import { EYEDROPPER } from '../config/eyedropper.js';
import { CURSOR } from '../config/cursor.js';
import { loadBrushPrefs } from './brush-prefs.js';
import { cloneGrid } from '../logic/raster.js';
import { t } from '../i18n/index.js';
export { MAX_LAYERS, MAX_SIZE, BP_SMAX };

export const blank = (w, h) => Array.from({ length: h }, () => new Array(w).fill(null));
export const newLayer = (name, w, h) => ({ name, grid: blank(w, h), opacity: 1, visible: true, fid: null, clip: false, lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [] });
// глубокая копия слоя (история/галерея/дубликат); overrides перекрывают поля
// (напр. дубликат: reference:false и новое имя). Все поля слоя — в одном месте.
export const cloneLayer = (L, overrides = {}) => ({
  name: L.name, opacity: L.opacity, visible: L.visible, fid: L.fid,
  clip: !!L.clip, lock: !!L.lock, alphaLock: !!L.alphaLock, reference: !!L.reference, symLock: !!L.symLock,
  ext: new Map(L.ext), grid: cloneGrid(L.grid), effects: cloneFx(L.effects), ...overrides,
});

// фабрика эффекта слоя/папки: уникальный id, видимость, копия дефолтных параметров
let fxSeq = 0;
export const newEffect = (type, params = {}) => ({ id: ++fxSeq, type, visible: true, params: { ...EFFECT_DEFAULTS[type], ...params } });
// глубокая копия списка эффектов (только данные — для истории/сериализации/копипаста)
export const cloneFx = (list) => (list || []).map((e) => ({ id: ++fxSeq, type: e.type, visible: e.visible !== false, opacity: e.opacity ?? 1, params: { ...e.params } }));

const pal0 = defaultPalette();
const brushPrefs = loadBrushPrefs(BRUSH_DEFAULTS(), FLAGS_DEFAULT);
// единый контейнер изменяемого состояния
export const S = {
  W: DEFAULT_DOC.w, H: DEFAULT_DOC.h, layerSeq: 1, docName: '',
  layers: [newLayer(t('layer.name') + ' 1', DEFAULT_DOC.w, DEFAULT_DOC.h)], cur: 0,
  bg: { color: null, visible: true }, bgSel: false, // фон-слой Background: цвет (null=прозрачный) и видимость; bgSel — выбран ли он
  folders: [], folderSeq: 0, marked: new Set(), selFolder: null, markedFolders: new Set(),
  fxSel: new Set(), fxCur: null, fxDraft: null, // выделенные строки эффектов + черновик окна

  palette: pal0, active: pal0[DEFAULT_ACTIVE].slice(),
  colorMode: 'rgba',
  shading: { colors: [], on: false, open: false, picking: false }, // palette ramp + Aseprite-like shading brush mode
  tool: 'pencil', sym: false, symH: false, symD1: false, symD2: false,
  xMirror: false, // зажатый X — временное горизонтальное зеркало кисти во время рисования
  symLines: { x: null, y: null, d1: null, d2: null, mode: null, hover: null },
  grid: { w: 16, h: 16, color: '#4aa3ff', opacity: 70, visible: false, preview: false, link: true },
  lineMode: 'line', shapeTool: 'rect',
  fillShape: { rect: false, ellipse: false }, // режимы общей кнопки фигур: контур/заливка
  brushes: brushPrefs.brushes, stampBrush: { pencil: null, eraser: null }, // активная кисть-штамп по инструменту (null = квадрат)
  ppOn: brushPrefs.flags.pixelPerfect, stabOn: brushPrefs.flags.stabilize, stroke: false,
  adjMode: ADJUST_DEFAULT.mode, adjAmt: ADJUST_DEFAULT.amount,
  sel: null, selMask: null, selFloat: null,
  lassoMode: LASSO_DEFAULT.mode, lassoOp: LASSO_DEFAULT.op, lassoPath: null,
  cursorMode: CURSOR.mode, // Cursor Preview Mode: real | circle | hybrid
  brushResize: { ...BRUSH_RESIZE, capturing: false }, // жест Brush Size Modifier (настройки + захват клавиши)
  eyedrop: { ...EYEDROPPER, capturing: false }, // Eyedropper System (Hot Key + захват клавиши)
  view: { zoom: 12, ox: 0, oy: 0 },
  undoStack: [], redoStack: [],
  // общая интерактивная/превью-стейт, которую читает рендер и пишут системы
  // (system-private мелочь вроде ppPath/strokeSeen живёт внутри своих систем)
  qsShape: null, // QuickShape: распознанная ровная форма для превью/коммита
  cropMode: null, rotMode: null, rotPrev: null, rotQuad: null, moveDrag: null,
  hoverPx: null, lineStart: null, linePrev: null, linePath: null,
  replaceMode: null,
};

// активная сетка текущего слоя
export const G = () => S.layers[S.cur].grid;
