// Сведение набора цветов к палитре (median-cut) и подбор ближайшего. Чисто.
export function medianCut(cols, n) {
  // Один представитель на куб 16×16×16 в RGB-пространстве.
  // Сотни почти одинаковых оттенков кожи схлопываются; редкие уникальные (зелёные глаза) — в своих кубах, остаются.
  const umap = new Map();
  for (const c of cols) { const k = (c[0] >> 4) + ',' + (c[1] >> 4) + ',' + (c[2] >> 4); if (!umap.has(k)) umap.set(k, [c[0], c[1], c[2]]); }
  let bx = [[...umap.values()]];
  const bnd = (b) => { const mn = [255, 255, 255], mx = [0, 0, 0]; for (const c of b) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], c[k]); mx[k] = Math.max(mx[k], c[k]); } return [mn, mx]; };
  while (bx.length < n) { let bi = -1, bv = -1; bx.forEach((b, i) => { if (b.length < 2) return; const [mn, mx] = bnd(b), v = (mx[0] - mn[0]) + (mx[1] - mn[1]) + (mx[2] - mn[2]); if (v > bv) { bv = v; bi = i; } }); if (bi < 0) break;
    const b = bx[bi], [mn, mx] = bnd(b); let ch = 0; if (mx[1] - mn[1] > mx[ch] - mn[ch]) ch = 1; if (mx[2] - mn[2] > mx[ch] - mn[ch]) ch = 2; b.sort((p, q) => p[ch] - q[ch]); const mid = b.length >> 1; bx.splice(bi, 1, b.slice(0, mid), b.slice(mid)); }
  const avg = bx.map((b) => { const s = [0, 0, 0]; for (const c of b) for (let k = 0; k < 3; k++) s[k] += c[k]; return s.map((v) => Math.round(v / b.length)); });
  const seen = new Set(), out = [];
  for (const c of avg) { const k = c.join(','); if (!seen.has(k)) { seen.add(k); out.push(c); } }
  return out;
}

export const nearest = (c, pal) => { let best = pal[0], bd = Infinity; for (const p of pal) { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (d < bd) { bd = d; best = p; } } return best; };

export function paletteFromGrid(g, cap = 32) { const m = new Map();
  for (const row of g) for (const c of row) { if (!c) continue;
    const k = c[0] + ',' + c[1] + ',' + c[2]; // только RGB: полупрозрачные варианты того же цвета не плодят дубликаты
    const e = m.get(k); if (e) e.n++; else m.set(k, { c: [c[0], c[1], c[2]], n: 1 }); }
  return [...m.values()].sort((a, b) => b.n - a.n).slice(0, cap).map((e) => e.c); }

export function dedupePal(arr) { const seen = new Set(), out = [];
  for (const c of arr || []) { if (!c) continue; const k = c[0] + ',' + c[1] + ',' + c[2];
    if (!seen.has(k)) { seen.add(k); out.push([c[0], c[1], c[2]]); } }
  return out.length ? out : [[12, 12, 16]]; }
