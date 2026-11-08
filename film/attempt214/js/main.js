// Frame-by-frame renderer for one shot: ?shot=name&w=&h=&fps=
import { Impasto } from './impasto.js';
import { FILM } from './film.js';
const fonts = [new FontFace('Cormorant', 'url(./fonts/CormorantGaramond-wght.ttf)', { weight: '300 700' }), new FontFace('Archivo', 'url(./fonts/Archivo-wdth-wght.ttf)', { weight: '100 900' }), new FontFace('Fredoka', 'url(./fonts/Fredoka-Bold.ttf)', { weight: '700' })];
for (const f of fonts) { await f.load(); document.fonts.add(f); }
const q = new URLSearchParams(location.search);
const W = +(q.get('w') || 1920), H = +(q.get('h') || 1080), FPS = +(q.get('fps') || 24);
const stage = document.getElementById('stage'); stage.style.width = W + 'px'; stage.style.height = H + 'px';
const cv = document.createElement('canvas'); stage.appendChild(cv);
const DW = H > W ? 1080 : 1920, DH = H > W ? 1920 : 1080;
const E = new Impasto(cv, { W, H, DW, DH, ss: +(q.get('ss') || 2) });
const overlay = document.createElement('canvas'); overlay.width = W; overlay.height = H; stage.appendChild(overlay);
const og = overlay.getContext('2d');
const final = document.createElement('canvas'); final.width = W; final.height = H; const fg = final.getContext('2d');
const shot = FILM[q.get('shot')];
const t0 = performance.now();
const S = await shot.build({ E, W: DW, H: DH, vertical: H > W, fps: FPS });
console.log('built', q.get('shot'), ((performance.now() - t0) / 1000).toFixed(1) + 's');
window.DUR = shot.dur; window.FPS = FPS;
window.frame = async (i, fmt = 'jpeg') => {
  const t = i / FPS;
  E.beginLayer();
  const p = S.update(t);
  E.compose(p);
  og.clearRect(0, 0, W, H);
  if (S.overlay) S.overlay(og, W, H, t, p);
  fg.drawImage(cv, 0, 0); fg.drawImage(overlay, 0, 0);
  return final.toDataURL(fmt === 'png' ? 'image/png' : 'image/jpeg', 0.95);
};
window.READY = true;
