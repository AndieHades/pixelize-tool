// Оверлеи поверх слоёв: оси симметрии, превью линии/эффектов, плавающее
// выделение, рамка/маска выделения, подсветка перекраски, рамка кропа, контур
// кисти. Всё выражается из общего S.
import { S } from '../../core/state.js';
import { rgb, eqc } from '../../logic/color.js';
import { bres, rectEdges, rectFill, ellipseEdges, ellipseFill } from '../../logic/raster.js';
import { symA, symHA, effVis } from '../../core/layers.js';
import { C } from '../../styles/canvas-colors.js';

export function drawOverlays(ctx, ox, oy, z) {
  const W = S.W, H = S.H;
  if (S.sym) { const ax = ox + (W / 2) * z; ctx.strokeStyle = 'rgba(61,139,253,.85)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(ax, oy - 8); ctx.lineTo(ax, oy + H * z + 8); ctx.stroke(); ctx.setLineDash([]); }
  if (S.symH) { const ay = oy + (H / 2) * z; ctx.strokeStyle = 'rgba(61,139,253,.85)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(ox - 8, ay); ctx.lineTo(ox + W * z + 8, ay); ctx.stroke(); ctx.setLineDash([]); }
  if (S.linePrev || S.qsShape) { ctx.globalAlpha = .6; ctx.fillStyle = rgb(S.active);
    const s = S.brushes.pencil.size, off = s >> 1, sa = symA(), sha = symHA();
    const paint = (px2, py2) => { for (let dy2 = 0; dy2 < s; dy2++) for (let dx2 = 0; dx2 < s; dx2++) {
      const xx = px2 - off + dx2, yy = py2 - off + dy2;
      ctx.fillRect(ox + xx * z, oy + yy * z, z, z);
      if (sa) ctx.fillRect(ox + (W - 1 - xx) * z, oy + yy * z, z, z);
      if (sha) ctx.fillRect(ox + xx * z, oy + (H - 1 - yy) * z, z, z);
      if (sa && sha) ctx.fillRect(ox + (W - 1 - xx) * z, oy + (H - 1 - yy) * z, z, z); } };
    // QuickShape: ровная форма всегда контуром; иначе превью инструмента (rect/ellipse — с учётом заливки)
    const q = S.qsShape, lp = q ? [q.x0, q.y0, q.x1, q.y1] : S.linePrev, type = q ? q.type : S.tool;
    if (type === 'rect') (!q && S.fillShape.rect ? rectFill : rectEdges)(lp[0], lp[1], lp[2], lp[3], paint);
    else if (type === 'ellipse') (!q && S.fillShape.ellipse ? ellipseFill : ellipseEdges)(lp[0], lp[1], lp[2], lp[3], paint);
    else bres(lp[0], lp[1], lp[2], lp[3], paint);
    ctx.globalAlpha = 1; }
  // плавающий фрагмент рисуется в композите слоёв (layerFloatCanvas) — обтравка видит его, швов нет
  if (S.sel && !S.selFloat) { // ручки активного выделения видны всегда, поверх любого инструмента
    const hx = ox + S.sel.x0 * z, hy = oy + S.sel.y0 * z, hw = (S.sel.x1 - S.sel.x0 + 1) * z, hh = (S.sel.y1 - S.sel.y0 + 1) * z, R = 5;
    for (const p of [[hx, hy], [hx + hw, hy], [hx, hy + hh], [hx + hw, hy + hh], [hx + hw / 2, hy], [hx + hw / 2, hy + hh], [hx, hy + hh / 2], [hx + hw, hy + hh / 2]]) {
      ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, Math.PI * 2);
      ctx.fillStyle = C.accent; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff'; ctx.stroke(); } }
  if (S.lassoPath && S.lassoPath.pts.length) drawLasso(ctx, ox, oy, z);
  if (S.replaceMode) { const replaceColors = Array.isArray(S.replaceMode.from && S.replaceMode.from[0]) ? S.replaceMode.from : [S.replaceMode.from];
    ctx.fillStyle = 'rgba(61,139,253,.5)';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let hit = false; for (let i = 0; i < S.layers.length; i++) { if (!effVis(i)) continue; const c = S.layers[i].grid[y][x]; if (c && replaceColors.some((f) => eqc(c, f))) { hit = true; break; } }
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
  // курсор кисти (предпросмотр отпечатка) рисует Brush Cursor Renderer — systems/render/cursor.js
}

// строящийся контур лассо: пунктир по траектории + зеркальные контуры (симметрия)
// в реальном времени; старт/конец точками с подсветкой замыкания (Continuous/Segment)
function drawLasso(ctx, ox, oy, z) { const lp = S.lassoPath, pts = lp.pts, W = S.W, H = S.H, end = pts[pts.length - 1];
  const sx = (p) => ox + (p[0] + 0.5) * z, sy = (p) => oy + (p[1] + 0.5) * z;
  const tfs = [(p) => p]; // оригинал + зеркальные копии по активным осям
  if (symA()) tfs.push((p) => [W - 1 - p[0], p[1]]);
  if (symHA()) tfs.push((p) => [p[0], H - 1 - p[1]]);
  if (symA() && symHA()) tfs.push((p) => [W - 1 - p[0], H - 1 - p[1]]);
  ctx.lineWidth = 1.5; ctx.strokeStyle = C.accent;
  for (const tf of tfs) { const a = tf(pts[0]), e = tf(end);
    ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(sx(a), sy(a));
    for (let i = 1; i < pts.length; i++) { const b = tf(pts[i]); ctx.lineTo(sx(b), sy(b)); } ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx(e), sy(e)); ctx.lineTo(sx(a), sy(a)); // замыкающий сегмент
    ctx.globalAlpha = lp.near ? 0.9 : 0.35; ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]); }
  const R = lp.near ? 6 : 4, a0 = pts[0]; // точки старта/конца — на оригинале
  ctx.beginPath(); ctx.arc(sx(a0), sy(a0), R, 0, Math.PI * 2);
  ctx.fillStyle = lp.near ? C.accent : '#fff'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = lp.near ? '#fff' : C.accent; ctx.stroke();
  ctx.beginPath(); ctx.arc(sx(end), sy(end), 3, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
}
