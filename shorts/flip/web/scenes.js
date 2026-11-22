// "Mom was never in our photos": six life stages drawn with the people.js rig.
// Each scene is a 1200x1500 canvas; the paper fold sits at y = 750, so faces and the year live in the top half.
import { drawPerson, drawBaby, pencilTexture, camera, AGES, OUT, mix, joints } from './people.js';

export const SW = 1200, SH = 1500, FOLD = 750;
const SKIN_MOM = '#f2c9a8', SKIN_KID = '#f6d3bd';
const MOM_HAIR = '#6b4632', KID_HAIR = '#8a5a3c';
const GROUND = 1440;
const K = 1.13;                                   // character scale (bigger figures read better on a phone)

function headOf(age, x, y, scale = 1) {
  const P = AGES[age]();
  const hy = y - (P.leg + P.torso + P.neck + P.R * 0.92) * scale;
  return { x, y: hy, R: P.R * scale };
}

// photographer pose: camera covering most of the face (she is always behind the lens), elbows tucked down and out
export function cameraPose(age, x, scale) {
  const J = joints(age, x, GROUND, scale);
  const cx = J.head[0] - J.R * 0.42, cy = J.head[1] + J.R * 0.28;
  return { cx, cy, pose: {
    l: [cx - 50 * scale, cy + 18], r: [cx + 50 * scale, cy + 22],
    lElbow: [J.shL[0] - J.W * 0.42, J.shL[1] + J.up * 0.62], rElbow: [J.shR[0] + J.W * 0.30, J.shR[1] + J.up * 0.66] } };
}

// mum holding a camera up to her face, aimed a little to her right (towards the child)
function momWithCamera(o) {
  const sc = o.scale || K;
  const cp = cameraPose(o.age || 'adult', o.x, sc);
  return {
    age: o.age || 'adult', x: o.x, y: GROUND, scale: sc, skin: SKIN_MOM, hairCol: MOM_HAIR, grey: o.grey || 0, hair: o.hair || 'bun',
    top: o.top, bottom: o.bottom || '#5d7fa8', shoes: o.shoes || '#7a5a48', sleeve: o.sleeve || 'three', cardigan: o.cardigan, glasses: o.glasses, wrinkles: o.wrinkles,
    face: o.face || { eyes: 'happy', mouth: 'smile' },
    pose: cp.pose,
    extras: { camera: true, cameraScale: 0.92 },
  };
}

function ground(ctx, x, w, col = 'rgba(120,100,90,0.13)') {
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, GROUND - 8, w, 26, 0, 0, Math.PI * 2); ctx.fill();
}

function yearLabel(ctx, year, sub) {
  ctx.save();
  ctx.font = '700 118px Caveat'; ctx.fillStyle = '#4a3a30'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(year, 70, 170);
  const w = ctx.measureText(year).width;
  heart(ctx, 70 + w + 48, 128, 30, '#e8566a');
  if (sub) { ctx.font = '600 58px Caveat'; ctx.fillStyle = '#7a6658'; ctx.fillText(sub, 76, 236); }
  ctx.restore();
}

function heart(ctx, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.beginPath();
  ctx.moveTo(0, s * 0.35); ctx.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.5, -s * 1.15, 0, -s * 0.45);
  ctx.bezierCurveTo(s * 0.5, -s * 1.15, s * 1.1, -s * 0.35, 0, s * 0.35);
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.restore();
}

function doodleLine(ctx, pts, col = 'rgba(74,58,48,0.55)', w = 4) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke();
}

function balloon(ctx, x, y, col) {
  doodleLine(ctx, [x, y + 70, x - 10, y + 160, x + 6, y + 260], 'rgba(74,58,48,0.5)', 2.5);
  ctx.beginPath(); ctx.ellipse(x, y, 52, 64, 0, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(x - 18, y - 22, 12, 20, -0.4, 0, Math.PI * 2); ctx.fill();
}

const SCENES = [
  { year: '1999', draw(ctx) {
      // nursery: window with curtains, a mobile
      doodleLine(ctx, [140, 330, 470, 330, 470, 620, 140, 620, 140, 330]); doodleLine(ctx, [305, 330, 305, 620]); doodleLine(ctx, [140, 475, 470, 475]);
      ctx.fillStyle = 'rgba(160,205,235,0.25)'; ctx.fillRect(146, 336, 318, 278);
      for (const s of [0, 1]) { ctx.fillStyle = 'rgba(242,175,190,0.55)'; ctx.beginPath(); const x = s ? 470 : 140; ctx.moveTo(x, 320); ctx.quadraticCurveTo(x + (s ? 40 : -40), 470, x + (s ? 10 : -10), 640); ctx.lineTo(x + (s ? -38 : 38), 640); ctx.quadraticCurveTo(x + (s ? -10 : 10), 470, x, 320); ctx.fill(); }
      // blanket
      ctx.fillStyle = '#f7e3a1'; ctx.beginPath(); ctx.ellipse(380, GROUND - 20, 300, 70, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.strokeStyle = 'rgba(230,140,90,0.5)'; ctx.lineWidth = 6; for (const k of [-160, -60, 40, 140]) { ctx.beginPath(); ctx.moveTo(380 + k, GROUND - 70); ctx.lineTo(380 + k + 40, GROUND + 30); ctx.stroke(); }
      drawBaby(ctx, 380, GROUND - 40);
      ctx.save(); ctx.translate(560, GROUND - 40); ctx.rotate(0.15); ctx.fillStyle = '#7cc6a4'; ctx.fillRect(-28, -56, 56, 56); ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.strokeRect(-28, -56, 56, 56); ctx.font = '700 40px Caveat'; ctx.fillStyle = '#fff'; ctx.fillText('A', -10, -16); ctx.restore();
      ground(ctx, 840, 180);
      drawPerson(ctx, momWithCamera({ x: 840, top: '#9ad1c4', flash: 0.6 }));
  } },
  { year: '2005', sub: 'first day of school', draw(ctx) {
      // school doodle
      doodleLine(ctx, [110, 700, 110, 470, 300, 360, 490, 470, 490, 700]); doodleLine(ctx, [250, 700, 250, 590, 350, 590, 350, 700]);
      doodleLine(ctx, [300, 360, 300, 290]); ctx.fillStyle = '#e8566a'; ctx.beginPath(); ctx.moveTo(300, 290); ctx.lineTo(360, 308); ctx.lineTo(300, 326); ctx.fill();
      ctx.fillStyle = 'rgba(242,201,76,0.35)'; ctx.beginPath(); ctx.arc(1040, 300, 62, 0, Math.PI * 2); ctx.fill();
      ground(ctx, 370, 140); ground(ctx, 840, 180);
      drawPerson(ctx, { age: 'child6', scale: K, x: 370, y: GROUND, skin: SKIN_KID, hairCol: KID_HAIR, hair: 'pigtails', accent: '#f2c94c', dress: '#e45d5d', sleeve: 'short', socks: '#ffffff', shoes: '#a8323a',
        face: { eyes: 'open', mouth: 'open' }, pose: { l: 12, r: 158 }, extras: { backpack: '#f2c94c' } });
      drawPerson(ctx, momWithCamera({ x: 840, top: '#f3a683', flash: 0 }));
  } },
  { year: '2010', sub: 'turning 11', draw(ctx) {
      balloon(ctx, 200, 420, '#8fc9e8'); balloon(ctx, 330, 370, '#f6b26b'); balloon(ctx, 460, 430, '#e8566a');
      ground(ctx, 840, 180);
      drawPerson(ctx, { age: 'child11', scale: K, x: 360, y: GROUND, skin: SKIN_KID, hairCol: KID_HAIR, hair: 'ponytail', top: '#9b7fd1', bottom: '#4f6d96', sleeve: 'long',
        face: { eyes: 'closed', mouth: 'blow' }, pose: { l: [305, 1075], r: [425, 1075] } });
      // table and cake in front of her
      ctx.fillStyle = '#e9d6c0'; ctx.fillRect(70, 1130, 600, 300); ctx.lineWidth = 4.5; ctx.strokeStyle = OUT; ctx.strokeRect(70, 1130, 600, 300);
      ctx.fillStyle = '#f6efe6'; ctx.fillRect(70, 1130, 600, 40); ctx.strokeRect(70, 1130, 600, 40);
      ctx.fillStyle = '#fbe3ec'; ctx.beginPath(); ctx.roundRect(250, 1010, 230, 120, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8566a'; ctx.beginPath(); ctx.roundRect(250, 1010, 230, 32, 14); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 5; i++) { const x = 285 + i * 40; ctx.fillStyle = ['#8fc9e8', '#f2c94c', '#9ad1c4'][i % 3]; ctx.fillRect(x - 5, 965, 10, 46); ctx.strokeRect(x - 5, 965, 10, 46);
        ctx.fillStyle = 'rgba(255,190,60,0.9)'; ctx.beginPath(); ctx.ellipse(x, 950, 8, 14, 0, 0, Math.PI * 2); ctx.fill(); }
      drawPerson(ctx, momWithCamera({ x: 840, top: '#7fb3d5', flash: 0.9 }));
  } },
  { year: '2017', sub: 'graduation', draw(ctx) {
      let s = 7; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 40; i++) { ctx.fillStyle = ['#e8566a', '#f2c94c', '#8fc9e8', '#9ad1c4'][i % 4]; ctx.save(); ctx.translate(80 + rnd() * 1040, 260 + rnd() * 420); ctx.rotate(rnd() * 3); ctx.fillRect(-7, -4, 14, 8); ctx.restore(); }
      ground(ctx, 360, 150); ground(ctx, 840, 180);
      drawPerson(ctx, { age: 'teen', scale: K, x: 360, y: GROUND, skin: SKIN_KID, hairCol: KID_HAIR, hair: 'long', top: '#ffffff', bottom: '#3d4a66', sleeve: 'long', sleeveCol: '#2c3e6b',
        face: { eyes: 'happy', mouth: 'open' }, pose: { l: 10, r: 160 }, extras: { gown: '#2c3e6b', cap: true, diploma: 'r' } });
      drawPerson(ctx, momWithCamera({ x: 840, top: '#c39bd3', grey: 0.12, glasses: true, face: { eyes: 'happy', mouth: 'smile', tear: 'one' } }));
  } },
  { year: '2023', sub: 'her wedding day', draw(ctx) {
      // flower arch
      ctx.strokeStyle = 'rgba(106,154,85,0.8)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(110, 1420); ctx.lineTo(110, 560); ctx.arc(360, 560, 250, Math.PI, 0); ctx.lineTo(610, 1420); ctx.stroke();
      for (let i = 0; i <= 16; i++) { const a = Math.PI + i / 16 * Math.PI; const x = 360 + Math.cos(a) * 250, y = 560 + Math.sin(a) * 250;
        for (const d of [-18, 18]) { ctx.fillStyle = i % 2 ? '#f7c6d0' : '#fff4f6'; ctx.beginPath(); ctx.arc(x + d * 0.6, y + d * 0.4, 22, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke(); } }
      ground(ctx, 360, 200); ground(ctx, 840, 180);
      drawPerson(ctx, { age: 'adult', scale: K, x: 360, y: GROUND, skin: SKIN_KID, hairCol: KID_HAIR, hair: 'long', dress: '#fdfbf6', dressLen: 'long', sleeve: 'short',
        face: { eyes: 'happy', mouth: 'smile' }, pose: { l: [330, 900], r: [392, 900] }, extras: { veil: true, flowerCrown: true, bouquet: true, necklace: true } });
      drawPerson(ctx, momWithCamera({ x: 840, top: '#e3a6b5', grey: 0.45, glasses: true, wrinkles: true, cardigan: '#b7838f', face: { eyes: 'happy', mouth: 'smile', tear: 'both' } }));
  } },
  { year: '2026', sub: 'my turn, Mom.', draw(ctx) {
      // garden: soft sun, small flowers
      ctx.fillStyle = 'rgba(246,178,107,0.28)'; ctx.beginPath(); ctx.arc(330, 380, 120, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 14; i++) { const x = 90 + i * 75, y = 1410 - (i % 3) * 14; doodleLine(ctx, [x, y + 20, x, y - 30], 'rgba(106,154,85,0.8)', 4); ctx.fillStyle = ['#f7c6d0', '#f2c94c', '#fff4f6'][i % 3]; ctx.beginPath(); ctx.arc(x, y - 36, 12, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.stroke(); }
      ground(ctx, 360, 170); ground(ctx, 840, 180);
      // mum posing on the left now, hands clasped, a little shy
      drawPerson(ctx, { age: 'senior', scale: K, x: 360, y: GROUND, skin: SKIN_MOM, hairCol: MOM_HAIR, grey: 0.7, hair: 'bun', top: '#f3e3c3', bottom: '#6c7a89', cardigan: '#8fb3a2', sleeve: 'long', sleeveCol: '#8fb3a2',
        glasses: true, wrinkles: true, face: { eyes: 'happy', mouth: 'soft' }, pose: { l: [343, 892], r: [380, 896], lBend: 1, rBend: -1 } });
      heart(ctx, 520, 520, 26, '#e8566a'); heart(ctx, 210, 600, 20, '#f6a5b5');
      // daughter takes the photo
      const cp = cameraPose('adult', 840, K);
      drawPerson(ctx, { age: 'adult', x: 840, y: GROUND, skin: SKIN_KID, hairCol: KID_HAIR, hair: 'long', top: '#f28b6c', bottom: '#4f6d96', sleeve: 'three',
        face: { eyes: 'happy', mouth: 'smile' }, scale: K, pose: cp.pose, extras: { camera: true, cameraScale: 0.92 } });
  } },
];

export const N = SCENES.length;
export const YEARS = SCENES.map(s => s.year);

export function drawScene(i) {
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fdfcf8'; ctx.fillRect(0, 0, SW, SH);
  SCENES[i].draw(ctx);
  yearLabel(ctx, SCENES[i].year, SCENES[i].sub);
  pencilTexture(ctx, SW, SH, i + 3);
  return c;
}

// split a scene into its two printed halves
export function half(sceneCanvas, which) {
  const c = document.createElement('canvas'); c.width = SW; c.height = FOLD;
  c.getContext('2d').drawImage(sceneCanvas, 0, which === 'top' ? 0 : FOLD, SW, FOLD, 0, 0, SW, FOLD);
  return c;
}
