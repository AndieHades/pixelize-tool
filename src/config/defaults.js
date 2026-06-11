// Дефолты инструментов, эффектов и импорта. Стартовые значения настроек —
// здесь, чтобы подправить поведение без копания в системах.
export const BRUSH_DEFAULTS = () => ({ pencil: { size: 1, op: 1 }, eraser: { size: 1, op: 1 } });
export const FLAGS_DEFAULT = { pixelPerfect: true, stabilize: true };

export const OUTLINE_DEFAULT = { size: 1, op: 1 };
export const SHADOW_DEFAULT = { dx: 2, dy: 2, op: 0.6, color: '#000000' };
export const GLOW_DEFAULT = { range: 6, intensity: 0.8, color: '#78d7ff' };
export const ADJUST_DEFAULT = { mode: 'dodge', amount: 8 };
export const IMPORT_DEFAULT = { colors: 24, cell: 0, bgTol: 30 };
