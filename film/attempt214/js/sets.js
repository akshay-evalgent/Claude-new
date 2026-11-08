// Value-planned reference illustrations for each set. Painted in full colour; the film shows them grey
// (luminance of the same strokes) until the knife re-lays the colour.
import { hex, mixc, hash, Strokes, KNIFE, DAB } from './impasto.js';

const rect = (x, y, w, h) => (p) => p.rect(x, y, w, h);
const lin = (x0, y0, x1, y1, stops) => (g) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([t, c]) => gr.addColorStop(t, c)); return gr; };
function blobs(p, pts) { for (const [x, y, r] of pts) { p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2); } }

export const SEASON = {
  grey:   { sky: [[0, '#8fa6c4'], [0.6, '#b9c6d6'], [1, '#d9dfe6']], cloud: '#e8ecf0', tree: '#4f6a46', tree2: '#6f8a5a', wall: '#c9b08a', wall2: '#b39a74', ground: '#7d838c', ground2: '#9aa0a8', wet: 0.12, puddle: '#b4c2d2' },
  rain:   { sky: [[0, '#5e6c80'], [0.6, '#7d8a9c'], [1, '#98a2b0']], cloud: '#8e98a6', tree: '#36483a', tree2: '#4a5e48', wall: '#a8957a', wall2: '#8e7c64', ground: '#4e545e', ground2: '#68707a', wet: 0.7, puddle: '#8e9cae' },
  autumn: { sky: [[0, '#9ab0c8'], [0.6, '#d6c8b0'], [1, '#e8d8c0']], cloud: '#f0e6d8', tree: '#b0562a', tree2: '#d88a3a', wall: '#c9a87e', wall2: '#ad8e66', ground: '#80786c', ground2: '#9a8e7c', wet: 0.15, puddle: '#c2c6cc', leaves: true },
  snow:   { sky: [[0, '#a8b8cc'], [0.6, '#d0d8e2'], [1, '#e8edf2']], cloud: '#f4f6f8', tree: '#5a6a64', tree2: '#e8eef2', wall: '#c4b49c', wall2: '#a8987e', ground: '#e6ebf0', ground2: '#f6f8fa', wet: 0.05, puddle: '#cfd8e2', snow: true },
  spring: { sky: [[0, '#7fa8d8'], [0.6, '#b8d0e8'], [1, '#e2ecf4']], cloud: '#f6f8fa', tree: '#5a8a4a', tree2: '#f2c0d0', wall: '#cdb48e', wall2: '#b49a76', ground: '#848a90', ground2: '#a0a6ac', wet: 0.1, puddle: '#bcd0e4', blossom: true },
  sunset: { sky: [[0, '#2f55a8'], [0.45, '#e9a07a'], [0.8, '#f4c86a'], [1, '#f8dc96']], cloud: '#f6b48a', tree: '#3f6a3a', tree2: '#7a9a4a', wall: '#d8a660', wall2: '#b8843e', ground: '#6a6470', ground2: '#9a8a86', wet: 0.5, puddle: '#f0b878', sun: true },
};

// The wall, seen from her side. Plate 2400 x 1500; the wall top at y 520, ground at y 1180.
export function wallFront(R, season = 'grey') {
  const S = SEASON[season];
  const W = R.pw, H = R.ph;
  R.shape({ path: rect(0, 0, W, 560), fill: lin(0, 0, 0, 560, S.sky), maxR: 70, detail: 22, dir: 0.06, jit: 9, run: 0.55, varThr: 0.004, h: 0.55,
    after: (g) => {
      for (const [x, y, rx, ry] of [[360, 170, 260, 60], [900, 110, 200, 44], [1500, 200, 320, 70], [2100, 120, 240, 52]]) { g.fillStyle = S.cloud; g.globalAlpha = 0.55; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.4, rx * 0.6, ry * 0.8, 0, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      if (S.sun) { const gr = g.createRadialGradient(1700, 470, 0, 1700, 470, 360); gr.addColorStop(0, 'rgba(255,236,170,0.95)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 560); }
    } });
  // beyond the wall: tree tops and a roof
  R.shape({ path: (p) => blobs(p, [[160, 470, 120], [330, 430, 130], [520, 470, 110], [1260, 460, 120], [1420, 420, 140], [1600, 470, 110], [2240, 450, 150]]), fill: S.tree, maxR: 26, detail: 8, dir: -0.6, jit: 25,
    after: (g) => { g.fillStyle = S.tree2; for (const [x, y, r] of [[300, 360, 60], [1400, 350, 70], [2200, 360, 70], [140, 420, 50]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } if (S.snow || S.blossom) { g.fillStyle = S.tree2; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(100 + hash(i) * 2200, 330 + hash(i + 9) * 150, 14 + hash(i + 3) * 18, 0, 7); g.fill(); } } } });
  R.shape({ path: (p) => { p.moveTo(700, 520); p.lineTo(860, 380); p.lineTo(1080, 380); p.lineTo(1170, 520); p.closePath(); }, fill: season === 'snow' ? '#e8eef2' : '#9a4a36', maxR: 16, detail: 5, dir: 0.5 });
  R.shape({ path: rect(1010, 330, 38, 80), fill: '#6a5a50', maxR: 8, detail: 4, dir: Math.PI / 2 });
  // the wall: coping, shadow line, face, plinth
  R.shape({ path: rect(0, 520, W, 40), fill: S.snow ? '#f4f6f8' : mixc(hex(S.wall), [1, 1, 1], 0.25).map((v) => Math.round(v * 255)).reduce((s, v, i) => s + (i ? ',' : 'rgb(') + v, '') + ')', maxR: 26, detail: 13, dir: 0, jit: 5, varThr: 0.02, h: 0.7 });
  R.shape({ path: rect(0, 560, W, 22), fill: S.wall2, maxR: 14, detail: 9, dir: 0, jit: 4, varThr: 0.02, h: 0.6 });
  R.shape({ path: rect(0, 582, W, 560), fill: lin(0, 582, 0, 1142, [[0, S.wall], [1, S.wall2]]), maxR: 54, detail: 12, dir: 0.1, jit: 20, run: 0.5, varThr: 0.006, h: 0.7,
    after: (g) => {
      for (let i = 0; i < 14; i++) { const x = hash(i * 3.3) * W, y = 600 + hash(i * 7.1) * 520; g.fillStyle = hash(i) < 0.5 ? 'rgba(255,248,230,0.12)' : 'rgba(80,60,40,0.1)'; g.beginPath(); g.ellipse(x, y, 60 + hash(i + 1) * 120, 20 + hash(i + 2) * 40, hash(i + 5) * 0.6 - 0.3, 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(90,70,50,0.3)'; g.lineWidth = 4;   // a few bricks showing through the plaster
      for (const [x, y] of [[300, 900], [2050, 1020]]) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g.strokeRect(x + c * 56 + (r % 2) * 28, y + r * 26, 52, 22);
    } });
  R.shape({ path: rect(0, 1142, W, 40), fill: mixc(hex(S.wall2), [0, 0, 0], 0.25).map((v) => Math.round(v * 255)).reduce((s, v, i) => s + (i ? ',' : 'rgb(') + v, '') + ')', maxR: 12, detail: 5, dir: 0 });
  // ground
  R.shape({ path: rect(0, 1182, W, H - 1182), fill: lin(0, 1182, 0, H, [[0, S.ground2], [1, S.ground]]), maxR: 40, detail: 10, dir: 0.02, jit: 9, gloss: S.wet, run: 0.5, varThr: 0.006, h: 0.75,
    after: (g) => { if (S.leaves) { for (let i = 0; i < 120; i++) { g.fillStyle = ['#c8642a', '#e09a3a', '#a84a22'][i % 3]; g.beginPath(); g.ellipse(hash(i * 1.9) * W, 1200 + hash(i * 4.1) * 290, 9, 5, hash(i) * 3, 0, 7); g.fill(); } }
      if (S.snow) { g.fillStyle = 'rgba(200,210,224,0.6)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(hash(i * 2.2) * W, 1220 + hash(i * 3.7) * 260, 80, 10, 0, 0, 7); g.fill(); } } } });
  R.shape({ path: rect(0, 1182, W, 46), fill: 'rgba(40,44,56,0.55)', group: 50, maxR: 22, detail: 12, dir: 0, varThr: 0.03, h: 0.6 });
  // puddle (glossy) mirroring the sky and the wall top
  R.shape({ path: (p) => { p.ellipse(760, 1335, 300 + S.wet * 80, 50 + S.wet * 12, 0, 0, Math.PI * 2); }, fill: lin(0, 1285, 0, 1395, [[0, S.wall2], [0.35, S.puddle], [1, S.sky[0][1]]]), maxR: 22, detail: 9, dir: 0, jit: 4, gloss: 0.85, run: 0.3, varThr: 0.006, h: 0.6 });
  // the lamp post
  R.shape({ path: (p) => { p.rect(1941, 700, 18, 488); p.rect(1925, 1168, 50, 18); }, fill: '#2e3036', maxR: 8, detail: 3, dir: Math.PI / 2, jit: 4, gloss: 0.4 });
  R.shape({ path: (p) => { p.moveTo(1910, 690); p.lineTo(1990, 690); p.lineTo(1978, 640); p.lineTo(1922, 640); p.closePath(); }, fill: '#2e3036', maxR: 7, detail: 3, dir: 0 });
  R.shape({ path: rect(1928, 650, 44, 34), fill: '#ffd890', maxR: 8, detail: 3, dir: Math.PI / 2, exempt: false, gloss: 0.3 });
}
// reflections: explicit stacks of short horizontal knife dabs under each light, broken and fading
export function reflections(strokes, season = 'grey') {
  const S = SEASON[season]; const k = S.wet;
  if (k < 0.3) return strokes;
  for (let i = 0; i < 26; i++) {
    const y = 1200 + i * 9 + hash(i) * 4, w = (46 - i * 1.2) * (0.7 + hash(i + 3) * 0.6);
    if (hash(i + 7) < 0.25) continue;
    strokes.push({ x: 1950 + (hash(i + 11) - 0.5) * 18, y, ang: 0, len: w, wid: 6, c: hex('#ffd890'), c2: hex('#f0b860'), seed: 80000 + i, run: 0.6, alpha: Math.max(0.25, 1 - i / 26), gloss: 0.8, h: 0.9 });
  }
  for (let i = 0; i < 14; i++) {   // the wall's warm top in the puddle
    strokes.push({ x: 560 + hash(i * 3) * 400, y: 1300 + hash(i * 5) * 50, ang: 0, len: 40 + hash(i) * 50, wid: 5, c: hex(S.wall), c2: hex(S.puddle), seed: 81000 + i, run: 0.6, alpha: 0.8, gloss: 0.9, h: 0.85 });
  }
  return strokes;
}

// The section: the wall seen edge-on, her yard on the left, his garden on the right. Plate 3600 x 2000.
// Painted in after-rain sunset colours; the film shows it grey until the colour is re-laid.
export const SECTION = { ground: 1640, wallX0: 1600, wallX1: 1730, wallTop: 640 };
export function section(R) {
  const W = R.pw, H = R.ph, G = SECTION.ground, X0 = SECTION.wallX0, X1 = SECTION.wallX1, T = SECTION.wallTop;
  R.shape({ path: rect(0, 0, W, G), fill: lin(0, 0, 0, G, [[0, '#2c4f9e'], [0.45, '#7d7fb8'], [0.72, '#e8a07c'], [0.9, '#f4c870'], [1, '#f8dc9a']]), maxR: 80, detail: 26, dir: 0.05, jit: 8, run: 0.55, varThr: 0.004, h: 0.55,
    after: (g) => { for (const [x, y, rx, ry] of [[500, 380, 360, 60], [1500, 260, 420, 70], [2600, 420, 380, 66], [3300, 240, 300, 52]]) { g.fillStyle = 'rgba(250,200,170,0.5)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(120,110,170,0.35)'; g.beginPath(); g.ellipse(x + 40, y + ry * 0.6, rx * 0.8, ry * 0.5, 0, 0, 7); g.fill(); } } });
  // distant rooftops along the horizon on both sides
  R.shape({ path: (p) => { p.moveTo(0, G); let x = 0; let i = 0; while (x < W) { const w = 120 + hash(i * 3.1) * 200, h = 120 + hash(i * 5.3) * 220; p.lineTo(x, G - h); p.lineTo(x + w * 0.5, G - h - 40 * hash(i)); p.lineTo(x + w, G - h); x += w; i++; } p.lineTo(W, G); p.closePath(); }, fill: '#6a5a7a', maxR: 22, detail: 9, dir: 0.0, jit: 10, h: 0.6 });
  // her side: cobbled ground and the lamp post
  R.shape({ path: rect(0, G, X0 + 65, H - G), fill: lin(0, G, 0, H, [[0, '#8a7c86'], [1, '#5a5262']]), maxR: 40, detail: 12, dir: 0.02, jit: 8, gloss: 0.45, h: 0.75, varThr: 0.006 });
  R.shape({ path: (p) => { p.rect(492, 980, 18, 662); p.rect(476, 1622, 50, 18); }, fill: '#2a2830', maxR: 8, detail: 3, dir: Math.PI / 2, jit: 4, gloss: 0.4 });
  R.shape({ path: (p) => { p.moveTo(460, 970); p.lineTo(542, 970); p.lineTo(530, 920); p.lineTo(472, 920); p.closePath(); }, fill: '#2a2830', maxR: 7, detail: 3, dir: 0 });
  R.shape({ path: rect(478, 930, 46, 34), fill: '#ffd890', maxR: 8, detail: 3, dir: Math.PI / 2 });
  // his side: a garden, a tree, a house with a lit window
  R.shape({ path: rect(X0 + 65, G, W - X0 - 65, H - G), fill: lin(0, G, 0, H, [[0, '#7aa04a'], [1, '#4a7034']]), maxR: 36, detail: 11, dir: -0.15, jit: 22, h: 0.8, varThr: 0.006 });
  R.shape({ path: (p) => { p.moveTo(2980, G); p.lineTo(3000, 1250); p.lineTo(3040, 1250); p.lineTo(3060, G); p.closePath(); }, fill: '#5a3a2a', maxR: 10, detail: 4, dir: Math.PI / 2 });
  R.shape({ path: (p) => blobs(p, [[3020, 1150, 170], [2890, 1240, 120], [3150, 1230, 130], [3020, 1030, 120]]), fill: '#3f6a3a', maxR: 26, detail: 8, dir: -0.6, jit: 25,
    after: (g) => { g.fillStyle = '#7a9a4a'; for (const [x, y, r] of [[2960, 1060, 60], [3080, 1100, 50]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } } });
  R.shape({ path: rect(3240, 1180, 420, 460), fill: '#c8907a', maxR: 22, detail: 7, dir: 0.1, h: 0.7 });
  R.shape({ path: (p) => { p.moveTo(3200, 1190); p.lineTo(3450, 1000); p.lineTo(3700, 1190); p.closePath(); }, fill: '#8a3a2e', maxR: 18, detail: 6, dir: 0.6 });
  R.shape({ path: rect(3330, 1300, 110, 120), fill: '#ffd890', maxR: 10, detail: 4, dir: Math.PI / 2 });
  R.shape({ path: (p) => { p.rect(2300, 1560, 260, 20); p.rect(2310, 1580, 16, 60); p.rect(2534, 1580, 16, 60); p.rect(2300, 1500, 260, 16); }, fill: '#6a4a36', maxR: 8, detail: 4, dir: 0 });
  // the wall, edge-on: the slab and its coping
  R.shape({ path: rect(X0, T, X1 - X0, G - T), fill: lin(X0, 0, X1, 0, [[0, '#e0b070'], [1, '#b8843e']]), maxR: 20, detail: 7, dir: Math.PI / 2, jit: 10, h: 0.8,
    after: (g) => { g.strokeStyle = 'rgba(90,60,30,0.3)'; g.lineWidth = 3; for (let y = T + 40; y < G; y += 44) { g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); } } });
  R.shape({ path: rect(X0 - 18, T - 34, X1 - X0 + 36, 36), fill: '#efd0a0', maxR: 12, detail: 6, dir: 0, h: 0.8 });
}

// Her room at night: umber shadows, the lamp's warm pool, one cold window with the wall outside. Plate 2400 x 1500.
export function room(R) {
  const W = R.pw, H = R.ph;
  R.shape({ path: rect(0, 0, W, 1040), fill: lin(0, 0, W, 0, [[0, '#2e2420'], [0.6, '#4a3626'], [1, '#2a201c']]), maxR: 56, detail: 14, dir: 0.4, jit: 18, h: 0.6, varThr: 0.006,
    after: (g) => { const gr = g.createRadialGradient(1700, 820, 0, 1700, 820, 900); gr.addColorStop(0, 'rgba(255,190,110,0.55)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 1040); } });
  // the window: night sky and the wall outside
  R.shape({ path: rect(260, 200, 560, 520), fill: lin(0, 200, 0, 720, [[0, '#1c2a52'], [1, '#3a4a78']]), maxR: 24, detail: 8, dir: 0.05, h: 0.6, gloss: 0.6,
    after: (g) => { g.fillStyle = '#e8ecf4'; g.beginPath(); g.arc(700, 300, 34, 0, 7); g.fill(); g.fillStyle = '#5a6080'; g.fillRect(260, 540, 560, 180); g.fillStyle = '#7a809a'; g.fillRect(260, 530, 560, 16); } });
  R.shape({ path: (p) => { p.rect(240, 180, 600, 20); p.rect(240, 720, 600, 26); p.rect(240, 180, 20, 566); p.rect(820, 180, 20, 566); p.rect(530, 180, 14, 566); p.rect(240, 450, 600, 12); }, fill: '#6a5040', maxR: 9, detail: 4, dir: 0 });
  // the cork board with pinned plane designs
  R.shape({ path: rect(1060, 180, 620, 420), fill: '#8a6440', maxR: 22, detail: 7, dir: 0.1, h: 0.7 });
  for (let i = 0; i < 7; i++) {
    const x = 1090 + (i % 4) * 148 + hash(i) * 20, y = 210 + Math.floor(i / 4) * 196 + hash(i + 3) * 18;
    R.shape({ path: (p) => { p.rect(x, y, 120, 150); }, fill: '#e8e0d0', maxR: 12, detail: 4, dir: 0.05, h: 0.6,
      after: (g) => { g.strokeStyle = 'rgba(60,40,30,0.8)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 20, y + 90); g.lineTo(x + 100, y + 60); g.lineTo(x + 30, y + 40); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(x + 20, y + 90); g.lineTo(x + 60, y + 70); g.stroke(); g.fillStyle = 'rgba(60,40,30,0.8)'; g.fillRect(x + 20, y + 115, 40 + hash(i) * 50, 8); } });
  }
  // the lamp (right) and the desk
  R.shape({ path: (p) => { p.moveTo(1820, 560); p.lineTo(2000, 560); p.lineTo(1950, 440); p.lineTo(1870, 440); p.closePath(); }, fill: '#c89a50', maxR: 12, detail: 5, dir: 0 });
  R.shape({ path: (p) => { p.rect(1902, 560, 16, 480); p.rect(1840, 1020, 140, 20); }, fill: '#3a3030', maxR: 8, detail: 4, dir: Math.PI / 2 });
  R.shape({ path: rect(1830, 548, 160, 24), fill: '#fff0c0', maxR: 8, detail: 4, dir: 0 });
  R.shape({ path: rect(0, 1040, W, H - 1040), fill: lin(0, 1040, 0, H, [[0, '#8a5a36'], [1, '#4a2e1c']]), maxR: 40, detail: 12, dir: 0.0, jit: 6, h: 0.8, varThr: 0.006,
    after: (g) => { const gr = g.createRadialGradient(1700, 1120, 0, 1700, 1120, 700); gr.addColorStop(0, 'rgba(255,200,120,0.6)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 1040, W, H - 1040);
      g.strokeStyle = 'rgba(40,24,14,0.4)'; g.lineWidth = 4; for (let y = 1110; y < H; y += 90) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + 10); g.stroke(); } } });
  // stacks of paper on the desk
  R.shape({ path: rect(1300, 990, 300, 60), fill: '#e8e0d0', maxR: 10, detail: 4, dir: 0, h: 0.7 });
  R.shape({ path: rect(1320, 950, 260, 42), fill: '#d8d0c0', maxR: 9, detail: 4, dir: 0, h: 0.7 });
}

// The desk from above, for the opening. Plate 2400 x 1500.
export function desk(R) {
  const W = R.pw, H = R.ph;
  R.shape({ path: rect(0, 0, W, H), fill: lin(0, 0, W, H, [[0, '#4a2e1c'], [0.5, '#8a5a36'], [1, '#3a2416']]), maxR: 48, detail: 12, dir: 0.0, jit: 6, h: 0.8, varThr: 0.006,
    after: (g) => { const gr = g.createRadialGradient(1200, 700, 0, 1200, 700, 1000); gr.addColorStop(0, 'rgba(255,200,120,0.6)'); gr.addColorStop(1, 'rgba(40,20,10,0.5)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(40,24,14,0.45)'; g.lineWidth = 5; for (let y = 120; y < H; y += 210) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + 14); g.stroke(); } } });
  R.shape({ path: (p) => { p.rect(1700, 300, 420, 300); }, fill: '#e8e0d0', maxR: 14, detail: 5, dir: 0.05, h: 0.7,
    after: (g) => { g.fillStyle = 'rgba(60,40,30,0.7)'; for (let i = 0; i < 6; i++) g.fillRect(1740, 340 + i * 40, 200 + hash(i) * 120, 8); } });
  R.shape({ path: (p) => { p.arc(450, 1100, 110, 0, Math.PI * 2); }, fill: '#6a7a8a', maxR: 12, detail: 5, dir: 0.3, gloss: 0.5 });
}

// a title laid in by the knife: returns shapes to add to a Ref (glyphs become groups)
export function titleShapes(R, lines) {
  for (const L of lines) R.shape({ text: { str: L.str, font: L.font, x: L.x, y: L.y, letter: L.letter || 0, stroke: L.strokeW || 0 }, fill: L.fill, maxR: L.maxR || 10, detail: L.detail || 3, dir: L.dir ?? 0, jit: 14, h: L.h ?? 1.0, follow: true, exempt: !!L.exempt, varThr: 0.01 });
}
