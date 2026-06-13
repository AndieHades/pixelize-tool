// Менеджер палитр: сохранить текущую, загрузить, собрать из изображения.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import { $, toast, t } from '../core/dom.js';
import { rgb } from '../logic/color.js';
import { medianCut, dedupePal } from '../logic/quantize.js';

const STORE = 'palettes';
const palStore = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };
const saveStore = (o) => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} };

function loadPalette(arr, name) { S.palette = dedupePal(arr); if (S.palette.length) S.active = S.palette[0].slice();
  bus.emit('palette'); bus.emit('render'); $('pal-ovl').classList.remove('on'); if (name) toast(t('toast.paletteLoaded', { name })); }

function palListUI() { const box = $('pal-list'); box.innerHTML = '';
  const st = palStore(), names = Object.keys(st);
  if (!names.length) { box.innerHTML = '<p class="hint" style="margin:10px 2px">' + t('palette.none') + '</p>'; return; }
  for (const nm of names) { const row = document.createElement('div'); row.className = 'prow';
    const head = document.createElement('div'); head.className = 'prow-top'; // имя сверху + удаление
    const name = document.createElement('span'); name.className = 'pname'; name.textContent = nm;
    const del = document.createElement('button'); del.className = 'prow-del'; del.title = t('gallery.delete');
    del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    del.onclick = (e) => { e.stopPropagation(); const s2 = palStore(); delete s2[nm]; saveStore(s2); palListUI(); };
    head.append(name, del);
    const sw = document.createElement('div'); sw.className = 'pswatches'; sw.title = t('btn.addPalette'); // вся палитра целиком, квадраты как в #pal; клик — загрузить
    st[nm].forEach((c) => { const i = document.createElement('i'); i.style.background = rgb(c); sw.appendChild(i); });
    sw.onclick = () => loadPalette(st[nm], nm);
    row.append(head, sw); box.appendChild(row); } }

export function mount() {
  $('pal-menu').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('pal-menu').addEventListener('click', () => { $('pal-name').value = ''; palListUI(); $('pal-ovl').classList.add('on'); });
  $('pal-close').onclick = () => $('pal-ovl').classList.remove('on');
  $('pal-save').onclick = () => { const nm = ($('pal-name').value.trim() || t('label.palette')).slice(0, 20);
    const s2 = palStore(); s2[nm] = S.palette.map((c) => [c[0], c[1], c[2]]); saveStore(s2); palListUI(); toast(t('toast.paletteSaved', { name: nm })); };
  bus.on('locale', palListUI);
  const palImg = document.createElement('input'); palImg.type = 'file'; palImg.accept = 'image/*';
  $('pal-from-img').onclick = () => palImg.click();
  palImg.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const im = new Image(); im.onerror = () => toast(t('toast.imgOpenFail'));
    im.onload = () => { const MAX = 160, k = Math.min(1, MAX / Math.max(im.naturalWidth, im.naturalHeight));
      const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
      const d = c.getContext('2d').getImageData(0, 0, w, h).data, samples = [];
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 127) samples.push([d[i], d[i + 1], d[i + 2]]);
      if (!samples.length) { toast(t('toast.imgEmpty')); return; }
      const pal = medianCut(samples, 16);
      loadPalette(pal); toast(t('toast.paletteFromImg', { n: pal.length })); };
    im.src = URL.createObjectURL(f); };
}
