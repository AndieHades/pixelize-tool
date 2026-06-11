    const $ = (id) => document.getElementById(id);
    const cv = $('cv'), ctx = cv.getContext('2d');

    // ---- состояние ----
    let W = 32, H = 32, layerSeq = 1;
    function blank(w, h) { return Array.from({ length: h }, () => new Array(w).fill(null)); }
    function newLayer(name) { return { name, grid: blank(W, H), opacity: 1, visible: true, fid: null, clip: false, ext: new Map() }; }
    function clipBase(i) { if (!layers[i].clip) return -1; // база обтравки: ближайший необтравочный слой ниже
      let j = i - 1; while (j >= 0 && layers[j].clip) j--; return j; }
    function clippedCanvas(i, base) { const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.drawImage(layerCanvas(i), 0, 0);
      x.globalCompositeOperation = 'destination-in'; x.drawImage(layerCanvas(base), 0, 0); return c; }
    let layers = [newLayer('Слой 1')], cur = 0;
    let folders = [], folderSeq = 0; const marked = new Set(); // папки слоёв и мультивыбор
    const effVis = (i) => { const L = layers[i]; if (!L.visible) return false; if (L.fid == null) return true;
      const f = folders.find((x) => x.id === L.fid); return !f || f.visible; };
    const G = () => layers[cur].grid;
    const defaultPalette = () => ['#0c0c10', '#202733', '#cbd3dc', '#e9edf0', '#ff7a18', '#c74a00', '#78d7ff'].map(hexToRgb);
    let palette = defaultPalette();
    let active = palette[4];
    let tool = 'pencil', sym = false, symH = false, outPreview = null;
    let sel = null, selMask = null, selFloat = null, selDrag = null, selDirect = false, selHinted = false;
    let replaceMode = null, palDrag = null, palSquelch = false, swHold = null, swX = 0, swY = 0, ctxIdx = -1, replFrom = null;
    let ppOn = true, ppPath = [], ppOrig = new Map(); // пиксель-перфект: чистим Г-образные уголки штриха
    let hoverPx = null; // позиция курсора в клетках — для контура кисти
    let stabOn = true, stabPt = null; // стабилизация штриха
    let lineStart = null, linePrev = null; // инструмент «линия»
    const brushes = { pencil: { size: 1, op: 1 }, eraser: { size: 1, op: 1 } };
    const outSet = { size: 1, op: 1 };
    const strokeSeen = new Set(); // чтобы полупрозрачная кисть не красила клетку дважды за штрих
    const view = { zoom: 12, ox: 0, oy: 0 };
    const undoStack = [], redoStack = [];

    function hexToRgb(h) { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); }
    const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
    const eqc = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

    let toastT = null;
    function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show');
      clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2000); }

    // ---- конвертер для импорта: сетка «квадратиков» -> цвета ----
