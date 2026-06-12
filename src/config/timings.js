// Тайминги и пороги жестов/ввода (мс и px). Тонкая настройка ощущения — здесь.
export const LONG_PRESS_MS = 480;   // долгий тап → меню/перетаскивание
export const HOLD_PICK_MS = 450;    // удержание одним пальцем → пипетка
export const TAP_MAX_MS = 350;      // длительность тапа для жестов undo/redo
export const DRAG_THRESHOLD = 6;    // сдвиг указателя до начала перетаскивания, px
export const STABILIZE = 0.35;      // коэффициент сглаживания штриха (0..1)
export const PINCH_MIN = 12;        // порог «настоящего» щипка против тап-отмены, px
export const PINCH_MERGE = 0.55;    // щипок строк слоёв до этой доли расстояния → слить
export const TOAST_MS = 2000;       // сколько висит всплывающее уведомление
