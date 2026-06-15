// GalleryGrid: adaptive left-aligned CSS grid fed by gallery items.
import { sortGalleryItems } from '../../logic/gallery-grid.js';

const px = (value, fallback) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

function metrics(grid) {
  const win = grid.ownerDocument.defaultView || window;
  const st = win.getComputedStyle(grid);
  return {
    gap: px(st.getPropertyValue('--gal-grid-gap'), 14),
    min: px(st.getPropertyValue('--gal-tile-min'), 112),
    max: px(st.getPropertyValue('--gal-tile-max'), 156),
    maxH: px(st.getPropertyValue('--gal-thumb-max-h'), 196),
    minW: px(st.getPropertyValue('--gal-thumb-min-w'), 54),
    padL: px(st.paddingLeft, 0),
    padR: px(st.paddingRight, 0),
  };
}

function sizeTile(tile, m) {
  const maxW = px(tile.style.getPropertyValue('--gal-card-max'), px(tile.parentElement?.style.getPropertyValue('--gal-tile'), m.max));
  let w = maxW, h = maxW;
  if (tile.dataset.kind !== 'folder') {
    const dw = Math.max(1, parseFloat(tile.dataset.w || '1')), dh = Math.max(1, parseFloat(tile.dataset.h || '1')), r = dw / dh;
    h = Math.round(w / r);
    if (h > m.maxH) { h = m.maxH; w = Math.round(h * r); }
    const minW = Math.min(m.minW, maxW);
    if (w < minW && Math.round(minW / r) <= m.maxH) { w = minW; h = Math.round(w / r); }
  }
  tile.style.setProperty('--gal-card-w', Math.round(w) + 'px');
  tile.style.setProperty('--gal-thumb-w', Math.round(w) + 'px');
  tile.style.setProperty('--gal-thumb-h', Math.round(h) + 'px');
}

export function updateGalleryGrid(grid) {
  const m = metrics(grid);
  const win = grid.ownerDocument.defaultView || window;
  const inner = Math.max(0, (grid.clientWidth || win.innerWidth || 0) - m.padL - m.padR);
  const cols = Math.max(1, Math.floor((inner + m.gap) / (m.min + m.gap)));
  const tile = Math.max(m.min, Math.min(m.max, Math.floor((inner - m.gap * (cols - 1)) / cols)));
  grid.style.setProperty('--gal-tile', tile + 'px');
  for (const tileEl of grid.querySelectorAll('.gal-tile')) sizeTile(tileEl, m);
}

export function mountGalleryGrid(grid) {
  if (grid.__galleryGridMounted) return;
  grid.__galleryGridMounted = true;
  const win = grid.ownerDocument.defaultView || window;
  const update = () => updateGalleryGrid(grid);
  if ('ResizeObserver' in win) new win.ResizeObserver(update).observe(grid);
  else win.addEventListener('resize', update);
  update();
}

export async function renderGalleryGrid(grid, items, createTile) {
  mountGalleryGrid(grid);
  updateGalleryGrid(grid);
  grid.innerHTML = '';
  const m = metrics(grid);
  for (const item of sortGalleryItems(items)) {
    const tile = await createTile(item); grid.appendChild(tile); sizeTile(tile, m);
  }
}
