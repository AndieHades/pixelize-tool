// Слой данных: единственный изменяемый объект состояния документа.
// Системы общаются с ним только через этот модуль — прямых связей между
// системами нет. Поля менять как S.W = …, не реэкспортируя биндинги.
export const MAX_LAYERS = 8;        // потолок числа слоёв в документе
export const MAX_SIZE = 640;        // максимальная сторона холста
export const BP_SMAX = 8;           // максимальный размер кисти

export const blank = (w, h) => Array.from({ length: h }, () => new Array(w).fill(null));
export const newLayer = (name, w, h) => ({ name, grid: blank(w, h), opacity: 1, visible: true, fid: null, clip: false, ext: new Map() });

// единый контейнер изменяемого состояния
export const S = {
  W: 32, H: 32, layerSeq: 1,
  layers: [newLayer('Слой 1', 32, 32)], cur: 0,
  folders: [], folderSeq: 0, marked: new Set(),
  palette: [], active: [255, 122, 24],
  tool: 'pencil', sym: false, symH: false,
  brushes: { pencil: { size: 1, op: 1 }, eraser: { size: 1, op: 1 } },
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
