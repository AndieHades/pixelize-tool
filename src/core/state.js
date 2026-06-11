// Слой данных: единственный изменяемый объект состояния документа.
// Системы общаются с ним только через этот модуль — прямых связей между
// системами нет. Поля менять как S.W = …, не реэкспортируя биндинги.
// Настраиваемые значения берутся из src/config (а не зашиты тут).
import { MAX_LAYERS, MAX_SIZE, BP_SMAX } from '../config/limits.js';
import { DEFAULT_DOC } from '../config/presets.js';
import { defaultPalette, DEFAULT_ACTIVE } from '../config/palette.js';
import { BRUSH_DEFAULTS, FLAGS_DEFAULT, ADJUST_DEFAULT } from '../config/defaults.js';
export { MAX_LAYERS, MAX_SIZE, BP_SMAX };

export const blank = (w, h) => Array.from({ length: h }, () => new Array(w).fill(null));
export const newLayer = (name, w, h) => ({ name, grid: blank(w, h), opacity: 1, visible: true, fid: null, clip: false, ext: new Map() });

const pal0 = defaultPalette();
// единый контейнер изменяемого состояния
export const S = {
  W: DEFAULT_DOC.w, H: DEFAULT_DOC.h, layerSeq: 1,
  layers: [newLayer('Слой 1', DEFAULT_DOC.w, DEFAULT_DOC.h)], cur: 0,
  folders: [], folderSeq: 0, marked: new Set(),
  palette: pal0, active: pal0[DEFAULT_ACTIVE].slice(),
  tool: 'pencil', sym: false, symH: false,
  brushes: BRUSH_DEFAULTS(),
  ppOn: FLAGS_DEFAULT.pixelPerfect, stabOn: FLAGS_DEFAULT.stabilize, stroke: false,
  adjMode: ADJUST_DEFAULT.mode, adjAmt: ADJUST_DEFAULT.amount,
  sel: null, selMask: null, selFloat: null,
  view: { zoom: 12, ox: 0, oy: 0 },
  undoStack: [], redoStack: [],
  // общая интерактивная/превью-стейт, которую читает рендер и пишут системы
  // (system-private мелочь вроде ppPath/strokeSeen живёт внутри своих систем)
  cropMode: null, rotMode: null, rotPrev: null, moveDrag: null,
  hoverPx: null, lineStart: null, linePrev: null,
  outPreview: null, dsPreview: null, glowPreview: null, replaceMode: null,
};

// активная сетка текущего слоя
export const G = () => S.layers[S.cur].grid;
