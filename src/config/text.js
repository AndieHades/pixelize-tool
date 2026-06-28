export const TEXT_FONTS = [
  { id: 'builtin-pixel', name: 'Pixel Mono', family: '"Courier New", ui-monospace, monospace', builtin: true, order: 0 },
  { id: 'builtin-system', name: 'System', family: 'system-ui, sans-serif', builtin: true, order: 1 },
  { id: 'builtin-serif', name: 'Serif', family: 'Georgia, serif', builtin: true, order: 2 },
];

export const TEXT_SIZE = { min: 4, max: 128, step: 1 };
export const TEXT_BOX = { w: 96, h: 32 };
export const TEXT_DEFAULT = {
  value: 'Text',
  fontId: 'builtin-pixel',
  size: 16,
  color: '#ffffff',
  align: 'left',
  lineHeight: 1.1,
  letterSpacing: 0,
  box: { x: 0, y: 0, w: TEXT_BOX.w, h: TEXT_BOX.h },
  transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
};

export const TEXT_IMPORT = {
  accept: '.ttf,.otf,.woff,.woff2',
  formats: ['ttf', 'otf', 'woff', 'woff2'],
  maxBytes: 8 * 1024 * 1024,
};
