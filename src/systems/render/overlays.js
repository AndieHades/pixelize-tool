// Оверлеи поверх слоёв: оси симметрии, превью линии/эффектов, плавающее
// выделение, рамка/маска выделения, подсветка перекраски, рамка кропа, контур
// кисти. Всё выражается из общего S.
import { S } from '../../core/state.js';
import { rgb, hexToRgb, eqc } from '../../logic/color.js';
import { bres, rectEdges } from '../../logic/raster.js';
import { symA, symHA, effVis } from '../../core/layers.js';
import { $ } from '../../core/dom.js';
import { C } from '../../styles/canvas-colors.js';

export function drawOverlays(ctx, ox, oy, z) {
  const W = S.W, H = S.H;
  if (S.sym) { const ax = ox + (W / 2) * z; ctx.strokeStyle = 'rgba(61,139,253,.85)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(ax, oy - 8); ctx.lineTo(ax, oy + H * z + 8); ctx.stroke(); ctx.setLineDash([]); }
  if (S.symH) { const ay = oy + (H / 2) * z; ctx.strokeStyle = 'rgba(61,139,253,.85)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(ox - 8, ay); ctx.lineTo(ox + W * z + 8, ay); ctx.stroke(); ctx.setLineDash([]); }
  if (S.linePrev) { ctx.globalAlpha = .6; ctx.fillStyle = rgb(S.active);
    const s = S.brushes.pencil.size, off = s >> 1, sa = symA(), sha = symHA();
    const paint = (px2, py2) => { for (let dy2 = 0; dy2 < s; dy2++) for (let dx2 = 0; dx2 < s; dx2++) {
      const xx = px2 - off + dx2, yy = py2 - off + dy2;
      ctx.fillRect(ox + xx * z, oy + yy * z, z, z);
      if (sa) ctx.fillRect(ox + (W - 1 - xx) * z, oy + yy * z, z, z);
      if (sha) ctx.fillRect(ox + xx * z, oy + (H - 1 - yy) * z, z, z);
      if (sa && sha) ctx.fillRect(ox + (W - 1 - xx) * z, oy + (H - 1 - yy) * z, z, z); } };
    if (S.tool === 'rect') rectEdges(S.linePrev[0], S.linePrev[1], S.linePrev[2], S.linePrev[3], paint);
    else bres(S.linePrev[0], S.linePrev[1], S.linePrev[2], S.linePrev[3], paint);
    ctx.globalAlpha = 1; }
  if (S.outPreview && $('outpop').classList.contains('on')) {
    const oc = hexToRgb($('out-col').value); ctx.fillStyle = rgb(oc); ctx.globalAlpha = (+$('out-op').value / 100) * .8;
    for (const p of S.outPreview) ctx.fillRect(ox + p[0] * z, oy + p[1] * z, z, z); ctx.globalAlpha = 1; }
  if (S.dsPreview && $('dspop').classList.contains('on')) {
    const dc = hexToRgb($('ds-col').value); ctx.fillStyle = rgb(dc); ctx.globalAlpha = (+$('ds-op').value / 100) * .85;
    for (const p of S.dsPreview) ctx.fillRect(ox + p[0] * z, oy + p[1] * z, z, z); ctx.globalAlpha = 1; }
  if (S.glowPreview && $('glowpop').classList.contains('on')) {
    const gc = hexToRgb($('glow-col').value); ctx.fillStyle = rgb(gc);
    for (const p of S.glowPreview) { ctx.globalAlpha = p[2] / 255; ctx.fillRect(ox + p[0] * z, oy + p[1] * z, z, z); } ctx.globalAlpha = 1; }
  // плавающий фрагмент рисуется в композите слоёв (layerFloatCanvas) — обтравка видит его, швов нет
  // при перетаскивании слоя инструментом move рамка/маска выделения едет вместе с содержимым
  const mdx = (S.moveDrag && S.tool === 'move') ? S.moveDrag.dx * z : 0, mdy = (S.moveDrag && S.tool === 'move') ? S.moveDrag.dy * z : 0;
  if (S.sel && !S.selMask && !S.selFloat) { const sx = ox + S.sel.x0 * z + mdx, sy = oy + S.sel.y0 * z + mdy, sw = (S.sel.x1 - S.sel.x0 + 1) * z, sh = (S.sel.y1 - S.sel.y0 + 1) * z;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; // затемнение вне рамки; сам пунктир — SVG #sel-ants (бежит по кругу)
    ctx.fillRect(ox, oy, W * z, Math.max(0, sy - oy)); ctx.fillRect(ox, sy + sh, W * z, Math.max(0, oy + H * z - sy - sh));
    ctx.fillRect(ox, Math.max(sy, oy), Math.max(0, sx - ox), sh); ctx.fillRect(sx + sw, Math.max(sy, oy), Math.max(0, ox + W * z - sx - sw), sh); }
  if (S.sel && S.tool === 'select') { // круглые ручки (как в Procreate); работают и у плавающего фрагмента
    const hx = ox + S.sel.x0 * z, hy = oy + S.sel.y0 * z, hw = (S.sel.x1 - S.sel.x0 + 1) * z, hh = (S.sel.y1 - S.sel.y0 + 1) * z, R = 5;
    for (const p of [[hx, hy], [hx + hw, hy], [hx, hy + hh], [hx + hw, hy + hh], [hx + hw / 2, hy], [hx + hw / 2, hy + hh], [hx, hy + hh / 2], [hx + hw, hy + hh / 2]]) {
      ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, Math.PI * 2);
      ctx.fillStyle = C.accent; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff'; ctx.stroke(); } }
  if (S.replaceMode) { ctx.fillStyle = 'rgba(61,139,253,.5)';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let hit = false; for (let i = 0; i < S.layers.length; i++) { if (!effVis(i)) continue; const c = S.layers[i].grid[y][x]; if (c && eqc(c, S.replaceMode.from)) { hit = true; break; } }
      if (hit) ctx.fillRect(ox + x * z, oy + y * z, z, z); } }
  if (S.cropMode) { const c = S.cropMode, x = ox + c.x0 * z, y = oy + c.y0 * z, w = (c.x1 - c.x0 + 1) * z, h = (c.y1 - c.y0 + 1) * z;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(ox, oy, W * z, y - oy); ctx.fillRect(ox, y + h, W * z, oy + H * z - y - h);
    ctx.fillRect(ox, y, x - ox, h); ctx.fillRect(x + w, y, ox + W * z - x - w, h);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.fillStyle = '#fff';
    const hs = Math.min(18, h - 4), ws = Math.min(18, w - 4), hw = 5, cs = 10;
    ctx.fillRect(x - hw / 2, y + h / 2 - hs / 2, hw, hs); ctx.fillRect(x + w - hw / 2, y + h / 2 - hs / 2, hw, hs);
    ctx.fillRect(x + w / 2 - ws / 2, y - hw / 2, ws, hw); ctx.fillRect(x + w / 2 - ws / 2, y + h - hw / 2, ws, hw);
    for (const p of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) ctx.fillRect(p[0] - cs / 2, p[1] - cs / 2, cs, cs); }
  if (S.hoverPx && !S.cropMode && !S.selFloat && (S.tool === 'pencil' || S.tool === 'eraser' || S.tool === 'line' || S.tool === 'adjust')) {
    const s = S.brushes[S.tool === 'eraser' ? 'eraser' : 'pencil'].size, off2 = s >> 1;
    const bx = ox + (S.hoverPx[0] - off2) * z, by2 = oy + (S.hoverPx[1] - off2) * z;
    ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 3; ctx.strokeRect(bx - .5, by2 - .5, s * z + 1, s * z + 1);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.strokeRect(bx - .5, by2 - .5, s * z + 1, s * z + 1); }
}
