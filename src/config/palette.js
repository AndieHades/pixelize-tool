// Палитра по умолчанию для нового документа.
import { hexToRgb } from '../logic/color.js';

export const DEFAULT_PALETTE_HEX = ['#0c0c10', '#202733', '#cbd3dc', '#e9edf0', '#ff7a18', '#c74a00', '#78d7ff'];
export const DEFAULT_ACTIVE = 4; // индекс активного цвета в палитре по умолчанию
export const GRAYSCALE_PALETTE_HEX = ['#ffffff', '#d9d9d9', '#9a9a9a', '#646464', '#2f2f2f', '#000000'];

export const defaultPalette = () => DEFAULT_PALETTE_HEX.map(hexToRgb);
export const grayscalePalette = () => GRAYSCALE_PALETTE_HEX.map(hexToRgb);
