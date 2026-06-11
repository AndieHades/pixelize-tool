// Жёсткие пределы приложения. Менять — здесь.
export const MAX_LAYERS = 8;     // потолок числа слоёв в документе
export const MAX_SIZE = 640;     // максимальная сторона холста, px
export const BP_SMAX = 8;        // максимальный размер кисти/ластика, px
export const ZOOM_MIN = 1;       // минимальный зум холста
export const ZOOM_MAX = 48;      // максимальный зум холста

// глубина истории отмен по площади холста (компромисс память/удобство)
export const historyCap = (area) => (area > 90000 ? 8 : area > 20000 ? 15 : 30);
