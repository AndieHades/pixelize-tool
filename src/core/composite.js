// Раскладка композита: слои в порядке стопки, их эффекты (через layerSrcCanvas),
// обтравка, эффекты папок (под группой и поверх неё) и живые превью move/transform.
// Единая точка для видимого рендера, экспорта и окна-превью.
import { S } from './state.js';
import { effVis, clipBase, folderChain } from './layers.js';
import { layerSrcCanvas, clippedShift } from './layer-cache.js';
import { folderFx } from './effects-render.js';

const memberOf = (i, fid) => folderChain(S.layers[i].fid).some((f) => f.id === fid);
const folderVis = (f) => folderChain(f.id).every((x) => x.visible);
const depth = (f) => folderChain(f.id).length;

// папки с эффектами: границы поддерева (нижний/верхний индекс слоёв в стопке)
function fxGroups() { const res = [];
  for (const f of S.folders) { if (!f.effects || !f.effects.length || !folderVis(f)) continue;
    let bottom = Infinity, top = -1;
    for (let i = 0; i < S.layers.length; i++) if (memberOf(i, f.id)) { if (i < bottom) bottom = i; if (i > top) top = i; }
    if (top >= 0) res.push({ f, bottom, top }); }
  return res; }

export function paintStack(ctx, live) {
  const iox = live && S.cropMode ? S.cropMode.idx : 0, ioy = live && S.cropMode ? S.cropMode.idy : 0;
  const groups = fxGroups();
  const drawC = (c) => { if (c) { ctx.globalAlpha = 1; ctx.drawImage(c, iox, ioy); } };
  for (let i = 0; i < S.layers.length; i++) {
    groups.filter((g) => g.bottom === i).sort((a, b) => depth(a.f) - depth(b.f)).forEach((g) => drawC(folderFx(g.f, 'below')));
    drawLayer(ctx, i, live, iox, ioy);
    groups.filter((g) => g.top === i).sort((a, b) => depth(b.f) - depth(a.f)).forEach((g) => drawC(folderFx(g.f, 'above')));
  }
  ctx.globalAlpha = 1;
}

function drawLayer(ctx, i, live, iox, ioy) { const L = S.layers[i]; if (!effVis(i) || L.opacity <= 0) return;
  const cb = clipBase(i); if (L.clip && (cb < 0 || !effVis(cb))) return;
  ctx.globalAlpha = L.opacity;
  if (live && S.rotMode && S.rotMode.idxs && S.rotMode.idxs.includes(i)) { // живое превью трансформации
    if (i === S.rotMode.idx && S.rotPrev && S.rotPrev.canvas) ctx.drawImage(S.rotPrev.canvas, S.rotPrev.px, S.rotPrev.py, S.rotPrev.ow, S.rotPrev.oh);
    return; }
  const md = live ? S.moveDrag : null, di = (md && md.idxs.includes(i)) ? md : null;
  if (cb >= 0) { const db = (md && md.idxs.includes(cb)) ? md : null;
    ctx.drawImage(clippedShift(i, cb, di ? di.dx : 0, di ? di.dy : 0, db ? db.dx : 0, db ? db.dy : 0), iox, ioy);
  } else ctx.drawImage(layerSrcCanvas(i), iox + (di ? di.dx : 0), ioy + (di ? di.dy : 0));
}
