import * as THREE from 'three';
import { makeChar, HERO, NEIGHBOUR, WIFE, SIT } from './char.js';
import { toon, glow, mesh, canvasTex, INK } from './toon.js';
import * as P from './props.js';
import * as U from './ui.js';

const OLD = { ...HERO, hair: '#b9b3ac', hairHi: '#f4f0ea', browColor: '#a8a29a', wrinkles: true, skin: '#f2d0b6' };
const KID = { ...HERO };

function lights(scene, o = {}) {
  scene.add(new THREE.AmbientLight(o.amb ?? 0x9a8fc0, o.ambI ?? 1.6));
  const key = new THREE.DirectionalLight(o.key ?? 0xfff0dd, o.keyI ?? 2.2);
  key.position.set(...(o.keyPos || [6, 10, 8])); scene.add(key);
  if (o.back) { const b = new THREE.DirectionalLight(o.back, o.backI ?? 1.5); b.position.set(...(o.backPos || [-6, 6, -10])); scene.add(b); }
  return key;
}
const cam = (camera, pos, at, fov = 30) => { camera.fov = fov; camera.position.set(...pos); camera.lookAt(...at); camera.updateProjectionMatrix(); };
const blob = (parent, x, z, r = 2.2, k = 0.22) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color: 0x2a2040, transparent: true, opacity: k, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); parent.add(m); return m; };

function sheetBackdrop(scene, W, H, o = {}) {
  scene.background = new THREE.Color(o.bg || '#efe8dc');
  const tex = canvasTex(2048, 1024, (g, w, h) => {
    g.fillStyle = o.bg || '#efe8dc'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,70,120,0.12)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), new THREE.MeshBasicMaterial({ map: tex }));
  pl.position.set(0, 50, -30); scene.add(pl);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), new THREE.MeshBasicMaterial({ color: o.bg || '#efe8dc' })); floor.rotation.x = -Math.PI / 2; floor.position.z = 60; scene.add(floor);
}
const label = (g, x, y, en, jp, o = {}) => {
  U.text(g, jp, x, y, { font: `${o.jp || 26}px IPAGothic`, color: '#c8402e', align: 'center' });
  U.text(g, en, x, y + (o.gap || 34), { font: `800 ${o.en || 22}px Archivo`, color: '#2a2030', align: 'center', letter: 3 });
};
const header = (g, W, en, jp) => {
  U.text(g, jp, 48, 70, { font: '44px IPAGothic', color: '#2a2030' });
  U.text(g, en, 48, 108, { font: '700 22px Archivo', color: '#c8402e', letter: 6 });
  U.text(g, '30,000 DAYS · 三万日', W - 48, 70, { font: '700 26px Archivo', color: '#2a2030', align: 'right' });
  U.text(g, 'whatifgraphics', W - 48, 104, { font: '500 20px Archivo', color: 'rgba(42,32,48,0.6)', align: 'right', letter: 2 });
};

export const SHOTS = {
  // ---------------- character sheets ----------------
  sheet_turn({ scene, camera, W, H }) {
    sheetBackdrop(scene, W, H);
    lights(scene, { keyPos: [-4, 9, 10], keyI: 2.3, ambI: 1.7, back: 0xbfd4ff, backI: 0.6 });
    const xs = [-17, -8.8, -0.6, 7.6, 16.3];
    const turns = [0, -0.7, -Math.PI / 2, Math.PI];
    turns.forEach((t, i) => { const c = makeChar(HERO, { expr: i === 0 ? 'neutral' : 'neutral' }); scene.add(c.root); c.root.position.x = xs[i]; c.pose({ turn: t }); blob(scene, xs[i], 0); });
    const n = makeChar(NEIGHBOUR, { expr: 'happy', hat: true, cardigan: true, glasses: false }); scene.add(n.root); n.root.position.x = xs[4]; n.pose({ turn: -0.25, lean: 0.06 }); blob(scene, xs[4], 0);
    cam(camera, [0, 7.4, 118], [0, 7.0, 0], 11.4);
    return {
      bloom: false,
      overlay(g, W, H, { project }) {
        header(g, W, 'CHARACTER SHEET · TURNAROUND', 'キャラクター設定');
        const names = [['FRONT', '正面'], ['3/4', '斜め'], ['SIDE', '横'], ['BACK', '背面']];
        xs.slice(0, 4).forEach((x, i) => { const [px] = project(new THREE.Vector3(x, 0, 0)); label(g, px, H - 88, names[i][0], names[i][1]); });
        const [nx] = project(new THREE.Vector3(xs[4], 0, 0)); label(g, nx, H - 88, 'THE NEIGHBOUR', '隣人');
        const [hx] = project(new THREE.Vector3(xs[1], 0, 0)); U.text(g, '主人公 · HIM, AGE 24', 48, 160, { font: '700 24px Archivo', color: '#2a2030' });
        g.strokeStyle = 'rgba(42,32,48,0.35)'; g.lineWidth = 2; const [sx] = project(new THREE.Vector3(12.0, 0, 0)); g.beginPath(); g.moveTo(sx, 150); g.lineTo(sx, H - 120); g.stroke();
      },
    };
  },
  sheet_ages({ scene, camera, W, H }) {
    sheetBackdrop(scene, W, H);
    lights(scene, { keyPos: [-4, 9, 10], keyI: 2.3, ambI: 1.7 });
    const kid = makeChar(KID, { expr: 'happy', headScale: 1.5 }); kid.root.scale.setScalar(0.62); kid.root.position.x = -16; kid.pose({ turn: 0.25 }); scene.add(kid.root);
    const a = makeChar(HERO, { expr: 'determined' }); a.root.position.x = -5.5; a.pose({ turn: 0.15 }); scene.add(a.root);
    const m = makeChar({ ...HERO, hair: '#4a3a32', top: '#7a8a6a', topShade: '#5a6a4a' }, { expr: 'tired', cardigan: true }); m.root.position.x = 5.5; m.pose({ turn: -0.15 }); scene.add(m.root);
    const o = makeChar(OLD, { expr: 'happy', cardigan: true, glasses: true }); o.root.position.x = 16; o.pose({ turn: -0.25, lean: 0.14, headX: -0.1, hipY: 5.4 }); scene.add(o.root);
    for (const x of [-16, -5.5, 5.5, 16]) blob(scene, x, 0, x === -16 ? 1.5 : 2.2);
    cam(camera, [0, 7.4, 118], [0, 7.0, 0], 11.4);
    return {
      bloom: false,
      overlay(g, W, H, { project }) {
        header(g, W, 'HIM, AT EVERY AGE · THE SCARF AND THE CURL STAY', '年齢別');
        const L = [['AGE 7 · 27,443 LEFT', '七歳'], ['AGE 24 · 21,234 LEFT', '二十四歳'], ['AGE 45 · 13,564 LEFT', '四十五歳'], ['AGE 80 · 780 LEFT', '八十歳']];
        [-16, -5.5, 5.5, 16].forEach((x, i) => label(g, project(new THREE.Vector3(x, 0, 0))[0], H - 88, L[i][0], L[i][1]));
      },
    };
  },
  sheet_faces({ scene, camera, W, H }) {
    scene.background = new THREE.Color('#efe8dc');
    lights(scene, { keyPos: [-3, 6, 10], keyI: 2.0, ambI: 1.8 });
    const ex = ['neutral', 'tired', 'sad', 'wide', 'determined', 'happy', 'laugh', 'asleep'];
    const views = [];
    const pw = (W - 96 - 3 * 24) / 4, ph = (H - 170 - 40 - 24) / 2;
    ex.forEach((e, i) => {
      const c = makeChar(HERO, { expr: e }); scene.add(c.root); c.root.position.x = i * 60;
      c.pose({ headY: [0.25, 0.15, 0.2, 0.05, -0.15, 0.2, 0.05, 0.15][i], headX: [0, 0.14, 0.2, -0.06, 0.06, -0.08, -0.16, 0.22][i], headZ: [0, 0.06, -0.1, 0, 0, 0.12, -0.06, 0.28][i], turn: [0.3, 0.25, 0.35, 0, -0.25, 0.3, -0.15, 0.15][i], armL: [0.08, 0.1, -0.12], armR: [0.08, -0.1, -0.12] });
      const cm = new THREE.PerspectiveCamera(24, pw / ph, 0.1, 500);
      cm.position.set(i * 60 + 0.4, 10.4, 17); cm.lookAt(i * 60 + 0.1, 9.9, 0);
      views.push({ camera: cm, x: 48 + (i % 4) * (pw + 24), y: 170 + (i >> 2) * (ph + 24), w: pw, h: ph });
    });
    return {
      bloom: false, views,
      overlay(g, W, H) {
        header(g, W, 'EXPRESSIONS · NO ONE SPEAKS; THE FACE TELLS YOU HOW A DAY WENT', '表情集');
        const jp = ['ふつう', 'つかれ', 'かなしい', 'びっくり', 'けつい', 'うれしい', 'わらう', 'ねむる'];
        views.forEach((v, i) => {
          g.strokeStyle = '#2a2030'; g.lineWidth = 3; g.strokeRect(v.x, v.y, v.w, v.h);
          g.fillStyle = '#fffdf6'; g.fillRect(v.x, v.y + v.h - 46, v.w, 46); g.strokeRect(v.x, v.y + v.h - 46, v.w, 46);
          U.text(g, jp[i], v.x + 16, v.y + v.h - 15, { font: '22px IPAGothic', color: '#c8402e' });
          U.text(g, ex[i].toUpperCase(), v.x + v.w - 16, v.y + v.h - 15, { font: '800 18px Archivo', color: '#2a2030', align: 'right', letter: 3 });
        });
      },
    };
  },
};

// ---------------- helpers for key frames ----------------
function povHand(parent, look = HERO) {
  const Hd = new THREE.Group(); parent.add(Hd);
  const skin = toon(look.skin, { steps: [0.7, 1.0], rim: 0x7fb0ff, rimStrength: 0.5 }), top = toon(look.top, { steps: [0.62, 0.84, 1.0], rim: 0x7fb0ff, rimStrength: 0.4 });
  const sleeve = mesh(new THREE.CylinderGeometry(0.62, 0.7, 3.0, 20), top, 0.03, Hd); sleeve.position.set(0.2, -2.1, 0.1); sleeve.rotation.z = 0.25;
  mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.35, 20), toon(look.topShade, { steps: [0.62, 1.0] }), 0.025, Hd).position.set(-0.12, -0.72, 0.1);
  const palm = mesh(new THREE.SphereGeometry(0.62, 20, 16), skin, 0.025, Hd); palm.scale.set(1.0, 1.15, 0.5); palm.position.set(0.1, -0.1, -0.45);
  for (let k = 0; k < 4; k++) { const f = mesh(new THREE.CapsuleGeometry(0.13, 0.36, 4, 10), skin, 0.02, Hd); f.position.set(0.68, 0.72 - k * 0.3, -0.05); f.rotation.set(0, 0.9, 1.4); }
  const th = mesh(new THREE.CapsuleGeometry(0.15, 0.42, 4, 10), skin, 0.022, Hd); th.position.set(-0.32, 0.12, 0.12); th.rotation.set(0.15, 0, -0.85);
  const thb = mesh(new THREE.SphereGeometry(0.26, 14, 10), skin, 0.02, Hd); thb.position.set(0.05, -0.32, 0.02); thb.scale.set(1, 1.3, 0.6);
  return Hd;
}

function lockScreen(days, o = {}) {
  return (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16224a'); gr.addColorStop(0.6, '#2a2a5a'); gr.addColorStop(1, '#4a2f5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,240,210,${Math.random() * 0.6})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h * 0.5, Math.random() * 2, 0, 7); g.fill(); }
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '500 26px Archivo'; g.fillText(o.date || 'Tuesday 12 March', w / 2, h * 0.11);
    g.font = '300 150px Archivo'; g.fillText(o.time || '2:14', w / 2, h * 0.24);
    // notification card
    const x = 28, y = h * 0.36, cw = w - 56, ch = 300;
    U.rrect(g, x, y, cw, ch, 34); g.fillStyle = 'rgba(245,240,255,0.93)'; g.fill();
    U.rrect(g, x + 26, y + 26, 64, 64, 16); g.fillStyle = '#2a170c'; g.fill();
    g.fillStyle = '#ffc566'; U.rrect(g, x + 44, y + 40, 28, 40, 8); g.fill(); g.fillStyle = '#7a4a2a'; g.fillRect(x + 42, y + 34, 32, 8);
    g.textAlign = 'left'; g.fillStyle = '#5a5470'; g.font = '700 22px Archivo'; g.fillText('30,000 DAYS', x + 108, y + 52); g.textAlign = 'right'; g.font = '500 20px Archivo'; g.fillText('now', x + cw - 26, y + 52);
    g.textAlign = 'left'; g.fillStyle = '#16122a'; g.font = '800 30px Archivo'; g.fillText('DAYS LEFT', x + 108, y + 92);
    g.font = '800 64px Archivo'; g.fillText(days, x + 26, y + 170);
    g.font = '24px IPAGothic'; g.fillStyle = '#5a5470'; g.fillText(`残り ${days} 日`, x + 28, y + 210);
    U.rrect(g, x + 26, y + 232, cw - 52, 50, 25); g.fillStyle = '#ffc566'; g.fill();
    g.fillStyle = '#2a170c'; g.textAlign = 'center'; g.font = '700 24px Archivo'; g.fillText('Remind me later', w / 2, y + 266);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = '500 22px Archivo'; g.fillText('swipe up to open', w / 2, h * 0.94);
  };
}

function nightRoom(scene, o = {}) {
  const R = new THREE.Group(); scene.add(R);
  const wall = o.wall || '#26305a';
  // back wall with a window
  P.wallWithWindow(R, 120, 60, [o.winX ?? -18, 26, 22, 26], wall, -40).position.y = -20;
  P.windowFrame(R, 22, 26, [o.winX ?? -18, 6, -39.6], '#3a4470');
  box(R, [200, 1, 200], [0, -20, 0], o.floor || '#1a1e3a');
  // the sky through the window
  P.sky(scene, { stops: [[0, '#040820'], [0.6, '#101c48'], [1, '#2c2a5e']], stars: 900, r: 400 });
  if (o.city !== false) P.city(scene, { n: 70, near: 80, depth: 160, spread: 260, y: -40, maxH: 50, lit: 0.3, bright: 0.9 });
  return R;
}
const box = (parent, size, pos, color, th = 0.03, o) => P.box(parent, size, pos, color, th, o);

Object.assign(SHOTS, {
  k1_hook({ scene, camera, W, H }) {
    scene.background = new THREE.Color('#05081c');
    nightRoom(scene, { winX: -22 });
    scene.add(new THREE.AmbientLight(0x5a5a9a, 1.25));
    // shelf and jar behind, to the right
    box(scene, [20, 0.8, 5], [9, -6, -26], '#3a2a2a');
    const J = P.jar(scene, { r: 2.6, h: 6.8, n: 420, mr: 0.32, label: '21,236', sub: 'DAYS LEFT', labelSize: 96, lightI: 70, lightD: 60, glow: 1.15 }); J.position.set(8.5, -5.6, -25);
    box(scene, [3, 4, 3], [14.5, -3.6, -26], '#6a4a3a'); box(scene, [2.4, 2.6, 2.4], [2.8, -4.3, -26], '#4a5a8a');
    // the phone in his hand
    const rig = new THREE.Group(); scene.add(rig); rig.position.set(-3.0, -0.6, -9.5); rig.rotation.set(0.08, 0.2, -0.06);
    P.phone(rig, lockScreen('21,236'), { w: 3.0, h: 6.0, lightI: 5, lightD: 10, lightZ: 2.5, bright: 0.92 });
    const hand = povHand(rig); hand.position.set(0.9, -1.9, -0.1); hand.scale.setScalar(1.7);
    cam(camera, [0, 0, 0], [0.5, -0.6, -10], 42);
    return {
      bloom: { strength: 0.7, radius: 0.55, threshold: 0.88 },
      overlay(g, W, H) {
        U.vignette(g, W, H, 0.6);
        U.sfx(g, 'ブブッ', W * 0.44, H * 0.1, 84, { rot: 0.18, fill: '#bfe0ff', stroke: '#16122a', outer: 'rgba(255,255,255,0.0)' });
        U.text(g, '2:14 A.M.', 48, H - 52, { font: '700 30px Archivo', color: 'rgba(255,255,255,0.85)', letter: 6 });
        U.text(g, '午前二時十四分', 48, H - 92, { font: '26px IPAGothic', color: 'rgba(255,255,255,0.6)' });
      },
    };
  },
});

// ---------------- more helpers ----------------
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function bigCard(g, W, H, label, num, jp, o = {}) {
  const x = o.x ?? W / 2, y = o.y ?? H * 0.2;
  U.text(g, label, x, y - (o.size || 120) * 0.72, { font: `800 ${(o.size || 120) * 0.26}px Archivo`, color: o.labelColor || 'rgba(255,240,215,0.9)', align: 'center', letter: 10 });
  U.text(g, num, x, y + (o.size || 120) * 0.3, { font: `800 ${o.size || 120}px Archivo`, color: o.color || '#ffd27a', align: 'center', glow: o.glow || 'rgba(255,170,60,0.9)', blur: 40, stroke: o.stroke || 'rgba(20,10,4,0.0)', lw: 0 });
  if (jp) U.text(g, jp, x, y + (o.size || 120) * 0.72, { font: `${(o.size || 120) * 0.24}px IPAGothic`, color: o.labelColor || 'rgba(255,240,215,0.85)', align: 'center' });
}
function marbleStream(parent, pts, n, r, o = {}) {   // glowing beads along a curve, with jitter
  const curve = new THREE.CatmullRomCurve3(pts);
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 12, 10), new THREE.MeshBasicMaterial({ toneMapped: false }), n);
  const m4 = new THREE.Matrix4(), c = new THREE.Color(), p = new THREE.Vector3();
  P.reseed(o.seed || 4);
  for (let i = 0; i < n; i++) {
    const t = Math.pow(P.rnd(), o.pow || 1); curve.getPointAt(t, p);
    const sp = (o.spread || 1) * (0.3 + t * 1.2);
    m4.makeTranslation(p.x + (P.rnd() - 0.5) * sp, p.y + (P.rnd() - 0.5) * sp, p.z + (P.rnd() - 0.5) * sp); im.setMatrixAt(i, m4);
    c.set(['#ffe9a8', '#ffbf4a', '#ffa030', '#ff7a24'][i % 4]).multiplyScalar(o.k ?? 1.2); im.setColorAt(i, c);
  }
  parent.add(im); return im;
}
function stringLights(parent, a, b, sag, n, color = '#ffd8a0') {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), a.z + (b.z - a.z) * t)); }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1a1220 })); parent.add(line);
  const bulb = new THREE.SphereGeometry(0.22, 10, 8), mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), toneMapped: false });
  pts.forEach((p, i) => { if (i % 2) { const m = new THREE.Mesh(bulb, mat); m.position.copy(p).y -= 0.3; parent.add(m); } });
}
function starRiver(parent, n, o = {}) {   // a band of warm stars across the sky
  P.reseed(o.seed || 17);
  const pos = [], col = [], c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const t = P.rnd(), x = (t - 0.5) * (o.len || 400), w = (P.rnd() + P.rnd() + P.rnd() - 1.5) * (o.width || 40);
    const y = (o.y || 80) + x * (o.slope || 0.25) + w, z = -(o.z || 200) + (P.rnd() - 0.5) * 60;
    pos.push(x, y, z); c.set(['#fff3d0', '#ffd27a', '#ffb54a', '#ffffff', '#bfe0ff'][i % 5]).multiplyScalar(o.k ?? 1.6 * (0.5 + P.rnd())); col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const sprite = canvasTex(64, 64, (x) => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.2, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); });
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: o.size || 2.4, map: sprite, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  parent.add(pts);
  // milky haze under the band
  const haze = canvasTex(1024, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,200,140,0)'); gr.addColorStop(0.5, `rgba(255,200,140,${o.haze ?? 0.35})`); gr.addColorStop(1, 'rgba(255,200,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const hz = new THREE.Mesh(new THREE.PlaneGeometry(o.len || 400, (o.width || 40) * 3.2), new THREE.MeshBasicMaterial({ map: haze, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  hz.position.set(0, o.y || 80, -(o.z || 200) - 30); hz.rotation.z = Math.atan(o.slope || 0.25); parent.add(hz);
  return pts;
}
const PHONE_POSE = { lean: 0.32, headX: 0.42, armR: [-1.05, -0.32, -1.55, 0.35], armL: [-1.05, 0.32, -1.55, -0.35] };
function feedScreen(kind, k = 0) {
  return (g, w, h) => {
    const hue = [210, 330, 160, 30, 270][k % 5];
    g.fillStyle = `hsl(${hue},45%,22%)`; g.fillRect(0, 0, w, h);
    if (kind === 'feed') {
      for (let i = 0; i < 4; i++) { const y = 40 + i * 340; g.fillStyle = `hsl(${(hue + i * 50) % 360},70%,${55 + (i % 2) * 10}%)`; U.rrect(g, 30, y, w - 60, 250, 24); g.fill(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(30, y + 268, w * 0.6, 18); g.fillRect(30, y + 296, w * 0.4, 14); }
      g.fillStyle = '#ff4a6a'; g.beginPath(); g.arc(w - 70, h * 0.62, 26, 0, 7); g.fill();
    } else if (kind === 'game') {
      g.fillStyle = '#1a1040'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) { g.fillStyle = ['#ff5a7a', '#ffc54a', '#5ad0ff', '#8aff7a'][(x * 3 + y * 5) % 4]; U.rrect(g, 40 + x * 108, 360 + y * 108, 92, 92, 18); g.fill(); }
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 64px Archivo'; g.fillText('LEVEL 248', w / 2, 200); g.font = '500 32px Archivo'; g.fillText('one more?', w / 2, 260);
    } else {
      g.fillStyle = '#0a0a12'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a3a6a'; g.fillRect(0, h * 0.18, w, h * 0.32);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '700 46px Archivo'; g.fillText('Next episode in', w / 2, h * 0.66); g.font = '800 180px Archivo'; g.fillText('5', w / 2, h * 0.84);
      g.strokeStyle = '#e8424a'; g.lineWidth = 14; g.beginPath(); g.arc(w / 2, h * 0.8, 130, -Math.PI / 2, Math.PI * 0.9); g.stroke();
    }
  };
}

Object.assign(SHOTS, {
  k2_card({ scene, camera }) {
    scene.background = new THREE.Color('#05081c');
    nightRoom(scene, { winX: 16 });
    scene.add(new THREE.AmbientLight(0x4a5096, 1.4));
    const B = P.bed(scene, { blanket: '#3c4a7a' }); B.scale.setScalar(1.5); B.position.set(-2, -20, -22); B.rotation.y = Math.PI / 2;
    box(scene, [16, 0.7, 4], [8, -8, -36], '#3a2a2a');
    const J = P.jar(scene, { r: 2.0, h: 5.2, n: 300, mr: 0.26, label: '21,236', sub: 'DAYS LEFT', labelSize: 96, lightI: 45, lightD: 40 }); J.position.set(8, -7.65, -35);
    const c = makeChar(HERO, { expr: 'tired', face: { lookY: -1 } }); scene.add(c.root);
    c.root.position.set(-2, -20 + 0.2, -16); c.pose({ ...SIT({ h: 4.4 }), ...PHONE_POSE, turn: 0.25 });
    c.root.updateMatrixWorld(true);
    const hp2 = c.armL.hand.getWorldPosition(V(0, 0, 0)).add(c.armR.hand.getWorldPosition(V(0, 0, 0))).multiplyScalar(0.5);
    const ph = P.phone(scene, null, { w: 0.9, h: 1.8, lightI: 0.15, lightD: 6, lightZ: 0.8, lightColor: 0x6fa0ff });
    ph.position.copy(hp2).add(V(0, -0.1, 0)); ph.lookAt(c.head.getWorldPosition(V(0, 0, 0)));
    cam(camera, [9, -6, 10], [0, -9.5, -22], 42);
    return {
      bloom: { strength: 0.65, radius: 0.5, threshold: 0.85 },
      overlay(g, W, H) { U.vignette(g, W, H, 0.55); bigCard(g, W, H, 'DAYS LEFT', '21,236', '残り 21,236 日', { x: W * 0.3, y: H * 0.2, size: 120 }); },
    };
  },
  k3_swipes({ scene, camera }) {
    scene.background = new THREE.Color('#090a1e');
    scene.add(new THREE.AmbientLight(0x6a6aa0, 1.5));
    const k3key = new THREE.DirectionalLight(0xffe0c8, 1.6); k3key.position.set(4, 6, 10); scene.add(k3key);
    P.sky(scene, { stops: [[0, '#05061a'], [0.5, '#0e1238'], [1, '#1a1a40']], stars: 300, r: 400 });
    const kinds = ['feed', 'game', 'next'];
    kinds.forEach((k, i) => {
      const grp = new THREE.Group(); scene.add(grp); grp.position.set((i - 1) * 9.5, 1.2 - Math.abs(i - 1) * 0.6, 0); grp.rotation.set(0.05, (1 - i) * 0.22, (i - 1) * -0.06);
      P.phone(grp, feedScreen(k, i), { w: 4.2, h: 8.4, lightI: 10, lightD: 12, lightZ: 3, bright: 0.95 });
      const hand = povHand(grp); hand.position.set(1.25, -2.9, -0.1); hand.scale.setScalar(2.4);
      marbleStream(scene, [V((i - 1) * 9.5 + 3.4, 2.5, 0.5), V((i - 1) * 9.5 + 3.7, -2, 0.8), V((i - 1) * 9.5 + 4.0, -9, 1.0)], 6, 0.32, { seed: 3 + i, spread: 0.8, k: 1.4 });
    });
    cam(camera, [0, 0, 30], [0, 0.2, 0], 36);
    return {
      bloom: { strength: 0.7, radius: 0.5, threshold: 0.85 },
      overlay(g, W, H) {
        U.vignette(g, W, H, 0.5);
        [0.27, 0.53, 0.79].forEach((x, i) => U.sfx(g, 'チン', W * x + 40, H * (0.7 + i * 0.03), 54, { rot: -0.15, fill: '#ffd27a', stroke: '#2a170c' }));
        U.text(g, 'EVERY SWIPE COSTS A MARBLE', W / 2, H - 48, { font: '800 34px Archivo', color: '#fff4dc', align: 'center', letter: 8 });
        U.text(g, 'スワイプ一回、ビー玉一個', W / 2, H - 96, { font: '28px IPAGothic', color: 'rgba(255,244,220,0.75)', align: 'center' });
      },
    };
  },
  k4_feed({ scene, camera }) {
    scene.background = new THREE.Color('#03040e');
    scene.fog = new THREE.Fog(0x03040e, 40, 170);
    scene.add(new THREE.AmbientLight(0x4a5aa0, 1.2));
    P.reseed(31);
    const g2 = new THREE.PlaneGeometry(3.2, 6.0);
    const tex = [0, 1, 2, 3, 4, 5].map((i) => canvasTex(180, 340, (g, w, h) => {
      g.fillStyle = `hsl(${[205, 330, 160, 30, 270, 190][i]},55%,${30 + i * 4}%)`; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 3; k++) { g.fillStyle = `hsla(${(i * 60 + k * 40) % 360},80%,70%,0.9)`; g.fillRect(14, 16 + k * 110, w - 28, 74); }
      g.fillStyle = '#d19a2e'; g.beginPath(); g.arc(w / 2, h * 0.5, 12, 0, 7); g.fill(); g.fillStyle = '#c8402e'; g.fillRect(w / 2 - 12, h * 0.5 + 10, 24, 6); g.fillStyle = '#d19a2e'; g.fillRect(w / 2 - 9, h * 0.5 + 16, 18, 24);
    }));
    const mats = tex.map((t) => new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15), fog: true }));
    for (let ring = 0; ring < 26; ring++) {
      const z = 8 - ring * 6.5, rad = 15 + Math.sin(ring * 0.7) * 1.5;
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2 + ring * 0.21;
        if (Math.sin(a) < -0.55 && ring < 3) continue;   // keep the floor open near him
        const m = new THREE.Mesh(g2, mats[(k + ring) % 6]); m.position.set(Math.cos(a) * rad, 4 + Math.sin(a) * rad, z); m.lookAt(0, 4, z + 4); scene.add(m);
        const fr = new THREE.Mesh(new THREE.PlaneGeometry(3.45, 6.3), new THREE.MeshBasicMaterial({ color: 0x0a0a14 })); fr.position.copy(m.position); fr.quaternion.copy(m.quaternion); fr.translateZ(-0.05); scene.add(fr);
      }
    }
    const c = makeChar(HERO, { expr: 'wide', face: { lookY: 0.6, lookX: 0.3 } }); scene.add(c.root); c.root.position.set(0, -9.5, -6);
    c.setRim(0x9fd0ff, 0.6);
    c.pose({ headX: -0.35, headY: 0.25, turn: 0.4, armL: [0.1, 0.3, -0.2], armR: [0.1, -0.3, -0.2] });
    const fl = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshBasicMaterial({ color: 0x6a8aff, transparent: true, opacity: 0.18 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, -9.45, -6); scene.add(fl);
    cam(camera, [3, -4, 22], [0, 0.5, -20], 52);
    return { bloom: { strength: 0.9, radius: 0.6, threshold: 0.7 }, overlay(g, W, H) { U.vignette(g, W, H, 0.7); U.letterbox(g, W, H, 0.07); } };
  },
  k5_eye({ scene, camera }) {
    scene.background = new THREE.Color('#0a0a1a');
    scene.add(new THREE.AmbientLight(0x8a80c0, 1.7));
    const key = new THREE.DirectionalLight(0xffd9a0, 1.6); key.position.set(-4, 2, 6); scene.add(key);
    const c = makeChar(HERO, { expr: 'wide', face: { reflectJar: true, size: 4096, lookX: -0.1 } }); scene.add(c.root);
    c.pose({});
    c.root.updateMatrixWorld(true);
    const eye = c.head.localToWorld(V(-0.36, -0.215, 0.86)), at = c.head.localToWorld(V(-0.34, -0.2, 0.0));
    camera.fov = 22; camera.position.copy(c.head.localToWorld(V(-0.3, -0.18, 2.3))); camera.lookAt(eye.x + 0.12, eye.y + 0.02, eye.z); camera.updateProjectionMatrix();
    return {
      bloom: { strength: 0.5, radius: 0.4, threshold: 0.9 },
      overlay(g, W, H) {
        U.vignette(g, W, H, 0.45);
        U.sfx(g, 'ドクン', W * 0.83, H * 0.2, 96, { rot: 0.1, fill: '#ffffff', stroke: '#1a1220' });
        U.letterbox(g, W, H, 0.1);
      },
    };
  },
  k6_panic({ scene, camera }) {
    scene.background = new THREE.Color('#2a0606');
    scene.fog = new THREE.Fog(0x3a0808, 40, 140);
    scene.add(new THREE.AmbientLight(0xff6a5a, 1.3));
    const key = new THREE.DirectionalLight(0xffb070, 2.2); key.position.set(-6, 10, 10); scene.add(key);
    box(scene, [300, 1, 300], [0, -0.5, 0], '#5a120a');
    box(scene, [300, 120, 1], [0, 60, -70], '#4a0e08');
    const J = P.jar(scene, { r: 9, h: 24, n: 500, mr: 1.0, label: '14,600', sub: 'DAYS LEFT', labelSize: 100, lightI: 400, lightD: 120, glow: 1.2 }); J.position.set(4, 3, -42); J.rotation.z = -0.5;
    marbleStream(scene, [V(14, 24, -40), V(16, 18, -30), V(12, 6, -16), V(8, 1, -4), V(4, 0.6, 8)], 260, 0.55, { seed: 9, spread: 3.2, k: 1.3 });
    P.reseed(12);
    for (let i = 0; i < 16; i++) {
      const b = P.laterBox(scene, 2.2 + P.rnd() * 2.6); b.position.set(-26 + P.rnd() * 22, 2 + P.rnd() * 22, -30 + P.rnd() * 30); b.rotation.set(P.rnd() * 3, P.rnd() * 3, P.rnd() * 3);
    }
    const c = makeChar(HERO, { expr: 'wide', scarfFly: true }); scene.add(c.root); c.root.position.set(-1, 0, 2);
    c.setRim(0xffd0a0, 0.5);
    c.pose({ lean: 0.3, headX: -0.05, turn: 0.3, legL: [-1.0, 1.4], legR: [0.55, 0.9], hipY: 5.2, armL: [0.9, 0.35, -1.3], armR: [-1.1, -0.35, -1.5] });
    cam(camera, [6, 7, 24], [-1, 8.5, -8], 44);
    return {
      bloom: { strength: 0.75, radius: 0.55, threshold: 0.8 },
      overlay(g, W, H) {
        U.speedLines(g, W, H, W * 0.42, H * 0.42, { n: 220, r0: H * 0.42, color: 'rgba(255,230,210,0.5)' });
        U.vignette(g, W, H, 0.6, '40,0,0');
        bigCard(g, W, H, 'DAYS LEFT', '14,600', '残り 14,600 日', { x: W * 0.55, y: H * 0.15, size: 92, color: '#ffe0c0', glow: 'rgba(255,80,40,0.9)' });
        U.sfx(g, 'ドドドド', W * 0.2, H * 0.83, 110, { rot: -0.12, fill: '#ffffff', stroke: '#2a0606', grow: 0.06 });
        U.sfx(g, 'ガラガラ', W * 0.15, H * 0.2, 64, { rot: 0.1, fill: '#ffd27a', stroke: '#2a0606' });
      },
    };
  },
  k7_rooftop({ scene, camera }) {
    scene.background = new THREE.Color('#0b0820');
    P.sky(scene, { stops: [[0, '#070618'], [0.55, '#1c1648'], [0.85, '#5a3a6a'], [1, '#c87a6a']], stars: 1400, r: 600 });
    starRiver(scene, 2600, { y: 70, slope: 0.18, width: 26, len: 520, z: 260, size: 2.2 });
    P.city(scene, { n: 90, near: 70, depth: 200, spread: 340, y: -60, maxH: 55, lit: 0.4, bright: 0.85 });
    scene.add(new THREE.AmbientLight(0x6a6ab0, 1.45));
    const key = new THREE.DirectionalLight(0xffc89a, 1.2); key.position.set(10, 6, 6); scene.add(key);
    box(scene, [80, 1, 50], [0, -0.5, -8], '#3a3450');
    box(scene, [80, 2.4, 1.2], [0, 1.2, -30], '#4a4460');
    box(scene, [1.2, 2.4, 50], [-34, 1.2, -8], '#4a4460');
    // the stair door, lit
    const door = new THREE.Group(); scene.add(door); door.position.set(-20, 0, -14);
    box(door, [10, 16, 8], [0, 8, 0], '#5a5070');
    const lit = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 9.5), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(1.15), toneMapped: false })); lit.position.set(1.0, 4.75, 4.02); door.add(lit);
    const dl = new THREE.PointLight(0xffc880, 10, 22, 1.5); dl.position.set(1, 5, 3.6); door.add(dl);
    stringLights(scene, V(-30, 13, -28), V(18, 12, -26), 3, 30); stringLights(scene, V(18, 12, -26), V(30, 10, 2), 2.5, 20);
    const him = makeChar(HERO, { expr: 'wide', face: { lookX: 0.6 } }); scene.add(him.root); him.root.position.set(-19, 0, -6.5); him.pose({ turn: 0.6, headY: 0.3 }); him.setRim(0xffc880, 0.9);
    const n = makeChar(NEIGHBOUR, { expr: 'laugh', hat: true, cardigan: true }); scene.add(n.root); n.root.position.set(4, 0, -12);
    n.pose({ turn: -0.5, lean: -0.08, headX: -0.15, armL: [-2.6, 0.5, -0.3], armR: [0.3, -0.5, -1.2, 0.4], legL: [-0.3, 0.6], legR: [0.15, 0.1] });
    const w = makeChar(WIFE, { expr: 'happy', cardigan: true }); scene.add(w.root); w.root.position.set(10, 0, -13);
    w.pose({ turn: -1.2, side: 0.08, headZ: -0.15, armL: [-0.9, 0.9, -0.8], armR: [-2.5, -0.6, -0.2], legL: [-0.2, 0.3], legR: [0.25, 0.4] });
    n.setRim(0xffd7a0, 0.5); w.setRim(0xffd7a0, 0.5);
    cam(camera, [-4, 8, 22], [-5, 10, -12], 48);
    return {
      bloom: { strength: 0.75, radius: 0.55, threshold: 0.8 },
      overlay(g, W, H, { project }) {
        U.vignette(g, W, H, 0.45);
        const [nx, ny] = project(V(7, 15.5, -12)), [hx, hy] = project(V(-19, 15, -6.5));
        U.tag(g, nx - 20, ny - 200, [['STARS', '24,880', '#ffd27a'], ['DAYS LEFT', '3', '#ff9a8a']], { px: nx + 20, py: ny + 20, w: 320 });
        U.tag(g, hx - 60, hy - 200, [['STARS', '1,204', '#9fc0ff'], ['DAYS LEFT', '18,250', '#ffffff']], { px: hx + 10, py: hy + 10, edge: '#9fc0ff', w: 320 });
        U.sfx(g, 'キラキラ', W * 0.5, H * 0.1, 56, { rot: 0.08, fill: '#fff4d0', stroke: '#2c1f4a' });
      },
    };
  },
  k8_comeback({ scene, camera }) {
    scene.background = new THREE.Color('#1a1030');
    P.sky(scene, { stops: [[0, '#140e34'], [0.5, '#3a2a5c'], [0.8, '#a85a6a'], [1, '#ffb070']], stars: 200, r: 500, sun: [0.5, 0.98, 0.25, 'rgba(255,200,140,0.8)'] });
    scene.add(new THREE.AmbientLight(0x8a7ab0, 1.5));
    const key = new THREE.DirectionalLight(0xffc89a, 1.5); key.position.set(-8, 6, -10); scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8b0ff, 0.6); fill.position.set(10, 8, 12); scene.add(fill);
    P.wallWithWindow(scene, 120, 40, [-2, 17, 22, 16], '#4a3a5c', -18);
    P.windowFrame(scene, 22, 16, [-2, 17, -17.6], '#6a5a7a');
    box(scene, [200, 1, 200], [0, -0.5, 0], '#2a2038');
    P.city(scene, { n: 60, near: 90, depth: 150, spread: 300, y: -30, maxH: 50, lit: 0.15, bright: 0.7, wall: '#2a2040' });
    // desk at 75 cm in the middle of the room; he faces us, the window behind him
    box(scene, [14, 0.6, 6], [0, 6.0, -6.5], '#7a5a42'); for (const x of [-6.6, 6.6]) box(scene, [0.7, 5.7, 5.5], [x, 2.85, -6.5], '#6a4a36');
    const lap = new THREE.Group(); scene.add(lap); lap.position.set(-0.4, 6.45, -6.0); lap.rotation.y = Math.PI + 0.15;
    box(lap, [3.6, 0.18, 2.5], [0, 0, 0], '#c8c8d4', 0.02);
    box(lap, [3.6, 2.35, 0.1], [0, 1.15, -1.26], '#d0d0dc', 0.02, { rot: [-0.2, 0, 0] });
    const scrL = new THREE.PointLight(0xffd59a, 0.9, 7, 1.5); scrL.position.set(-0.4, 7.9, -8.6); scene.add(scrL);
    const gtr = P.guitar(scene); gtr.position.set(8.2, 2.4, -4.4); gtr.rotation.set(0.1, -0.3, 0.22); gtr.scale.setScalar(1.25);
    const c = makeChar(HERO, { expr: 'determined', face: { lookY: -0.5, lookX: 0.1 } }); scene.add(c.root); c.root.position.set(0, 0, -10.6);
    c.pose({ ...SIT({ h: 4.7 }), turn: 0.08, lean: 0.14, headX: 0.18, armL: [-1.25, 0.15, -0.6, 0.2], armR: [-1.25, -0.15, -0.6, -0.2] });
    box(scene, [3.6, 0.6, 3.6], [0, 3.8, -10.8], '#3a2a3a'); box(scene, [0.6, 3.6, 0.6], [0, 1.8, -10.8], '#2a2030');
    // the star rising outside
    P.sparkle(scene, [4, 26, -60], 8, '#fff2c0', 3); P.sparkle(scene, [4, 26, -60], 3.2, '#ffffff', 3);
    marbleStream(scene, [V(3, 8, -60), V(3.5, 16, -60), V(4, 25, -60)], 18, 0.35, { seed: 5, spread: 0.6, k: 1.6 });
    cam(camera, [5, 11.5, 9], [0, 10.5, -12], 46);
    return {
      bloom: { strength: 0.8, radius: 0.55, threshold: 0.78 },
      overlay(g, W, H) {
        U.vignette(g, W, H, 0.45);
        const x = 60, y = H - 120, w = W * 0.42;
        U.rrect(g, W - 420, 40, 370, 118, 18); g.fillStyle = 'rgba(14,12,30,0.82)'; g.fill(); g.strokeStyle = '#ffc566'; g.lineWidth = 2; g.stroke();
        U.text(g, 'first_song.mp3', W - 396, 82, { font: '700 26px Archivo', color: '#fff' }); U.text(g, '92%', W - 76, 82, { font: '800 26px Archivo', color: '#ffc566', align: 'right' });
        U.rrect(g, W - 396, 108, 322, 16, 8); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fill(); U.rrect(g, W - 396, 108, 322 * 0.92, 16, 8); g.fillStyle = '#ffc566'; g.fill();
        U.text(g, 'STARS', x, y - 18, { font: '800 24px Archivo', color: '#ffd27a', letter: 6 }); U.text(g, '輝いた日', x + 120, y - 18, { font: '22px IPAGothic', color: 'rgba(255,240,220,0.7)' });
        U.rrect(g, x, y, w, 26, 13); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fill();
        U.rrect(g, x, y, w * 0.71, 26, 13); g.fillStyle = '#ffc566'; g.fill();
        U.rrect(g, x, y, w * 0.44, 26, 13); g.fillStyle = '#ffe4a8'; g.fill();
        U.text(g, '1,204', x, y + 64, { font: '700 28px Archivo', color: 'rgba(255,255,255,0.6)' });
        U.text(g, '→  1,973', x + w * 0.71 - 70, y + 64, { font: '800 34px Archivo', color: '#ffd27a' });
        U.sfx(g, 'ジャーン', W * 0.82, H * 0.62, 70, { rot: -0.1, fill: '#fff4d0', stroke: '#3a2a5c' });
      },
    };
  },
  k9_end({ scene, camera }) {
    scene.background = new THREE.Color('#03061a');
    P.sky(scene, { stops: [[0, '#02041a'], [0.6, '#0c1440'], [1, '#2a2050']], stars: 2600, r: 500 });
    starRiver(scene, 4200, { y: 46, slope: 0.3, width: 22, len: 520, z: 220, size: 2.6, haze: 0.45 });
    scene.add(new THREE.AmbientLight(0x6a70b8, 1.4));
    const moon = new THREE.DirectionalLight(0xbfd4ff, 1.1); moon.position.set(-4, 8, -10); scene.add(moon);
    P.wallWithWindow(scene, 140, 60, [4, 20, 40, 26], '#1e2448', -26);
    P.windowFrame(scene, 40, 26, [4, 20, -25.6], '#2e3460');
    box(scene, [200, 1, 200], [0, -0.5, 0], '#14182e');
    const B = P.bed(scene, { blanket: '#4a5a8a' }); B.scale.setScalar(1.5); B.position.set(-3, 0, -11.5); B.rotation.y = -Math.PI / 2;
    // asleep on the floor, leaning back against the bed, under the window
    const c = makeChar(HERO, { expr: 'asleep' }); scene.add(c.root); c.root.position.set(-2, 0, -2.2);
    c.pose({ hipY: 1.25, hipRX: 0.0, lean: -0.22, headX: 0.08, headZ: 0.42, headY: 0.1, turn: 0.25, legL: [-1.25, 1.1, 0.12], legR: [-1.45, 0.55, -0.1], armL: [-0.55, 0.2, -1.0], armR: [-0.6, -0.15, -1.05] });
    c.setRim(0xffe0a8, 0.55);
    const gtr = P.guitar(scene); gtr.position.set(4.2, 2.6, 0.4); gtr.rotation.set(-0.1, -0.5, -0.35); gtr.scale.setScalar(1.25);
    // his jar on the sill, still well over half full
    const J = P.jar(scene, { r: 1.6, h: 4.2, n: 160, mr: 0.22, fill: 0.62, label: false, lightI: 22, lightD: 22 }); J.position.set(17, 6.95, -24.8);
    P.starField(scene, 50, [-20, 24, 8, 30, -24, -20], { size: 0.8, k: 2.4, seed: 8 });
    cam(camera, [7, 6.5, 16], [-1, 10.5, -14], 50);
    return {
      bloom: { strength: 0.9, radius: 0.6, threshold: 0.72 },
      overlay(g, W, H) {
        U.vignette(g, W, H, 0.4);
        U.text(g, 'You get about 30,000 days.', W / 2, 92, { font: 'italic 600 46px Playfair', color: '#fff4dc', align: 'center', glow: 'rgba(0,0,0,0.6)', blur: 12 });
        U.text(g, 'Today is one of them.', W / 2, 148, { font: 'italic 600 46px Playfair', color: '#ffd27a', align: 'center', glow: 'rgba(0,0,0,0.6)', blur: 12 });
        U.text(g, '人生はおよそ三万日。今日もその一日。', W / 2, 196, { font: '26px IPAGothic', color: 'rgba(255,244,220,0.75)', align: 'center' });
      },
    };
  },
  k10_flash({ scene, camera }) {
    scene.background = new THREE.Color('#03061a');
    P.sky(scene, { stops: [[0, '#02041a'], [0.6, '#101a48'], [1, '#3a2a5a']], stars: 2600, r: 500 });
    starRiver(scene, 5200, { y: 40, slope: 0.22, width: 30, len: 560, z: 220, size: 2.8, haze: 0.5 });
    scene.add(new THREE.AmbientLight(0x7a76b8, 1.5));
    const key = new THREE.DirectionalLight(0xffe0b0, 0.9); key.position.set(0, 8, -10); scene.add(key);
    P.wallWithWindow(scene, 140, 60, [0, 18, 34, 28], '#232850', -16);
    P.windowFrame(scene, 34, 28, [0, 18, -15.6], '#33386a');
    box(scene, [200, 1, 200], [0, -0.5, 0], '#14182e');
    const o = makeChar(OLD, { expr: 'happy', cardigan: true, glasses: true }); scene.add(o.root); o.root.position.set(4, 0, -7);
    o.pose({ turn: Math.PI + 0.55, lean: -0.1, headX: -0.35, armL: [-2.25, 0.25, -0.5], armR: [-2.25, -0.25, -0.5] });
    o.setRim(0xffd8a0, 0.7);
    const k = makeChar({ ...HERO, scarf: '#d2412e', top: '#e98aa0', topShade: '#c8607a', pants: '#3a3a6a', hair: '#4a2e22', freckles: true, bun: true }, { expr: 'laugh', headScale: 1.55 });
    k.root.scale.setScalar(0.5); scene.add(k.root);
    o.root.updateMatrixWorld(true);
    const hp = o.armL.hand.getWorldPosition(V(0, 0, 0)).add(o.armR.hand.getWorldPosition(V(0, 0, 0))).multiplyScalar(0.5);
    const fwd = V(Math.sin(Math.PI + 0.55), 0, Math.cos(Math.PI + 0.55));
    k.root.position.set(hp.x + fwd.x * 0.6, hp.y - 2.4, hp.z + fwd.z * 0.6); k.pose({ turn: Math.PI + 0.4, armL: [-2.6, 0.4, -0.2], armR: [-2.3, -0.6, -0.2], legL: [-0.4, 0.8], legR: [0.2, 0.6] });
    k.setRim(0xffd8a0, 0.7);
    cam(camera, [15, 8, 8], [-1, 14, -11], 50);
    return {
      bloom: { strength: 0.9, radius: 0.6, threshold: 0.72 },
      overlay(g, W, H) { U.vignette(g, W, H, 0.45); U.letterbox(g, W, H, 0.08); U.text(g, '50 YEARS LATER · 五十年後', 56, H * 0.08 + 52, { font: '700 24px Archivo', color: 'rgba(255,244,220,0.8)', letter: 4 }); },
    };
  },
  thumb({ scene, camera }) {
    scene.background = new THREE.Color('#0a0820');
    P.sky(scene, { stops: [[0, '#05061a'], [0.6, '#1a1448'], [1, '#3a2a5c']], stars: 500, r: 300 });
    scene.add(new THREE.AmbientLight(0x8a80c0, 1.6));
    const key = new THREE.DirectionalLight(0xffc070, 1.2); key.position.set(8, 3, 6); scene.add(key);
    const c = makeChar(HERO, { expr: 'wide', face: { lookX: 0.8, lookY: 0.1, size: 2048 } }); scene.add(c.root); c.root.position.set(-4.2, 0, 0);
    c.pose({ turn: 0.35, headY: 0.15, headZ: -0.06 }); c.setRim(0xffc070, 0.45);
    const J = P.jar(scene, { r: 2.2, h: 5.8, n: 300, mr: 0.3, label: '20,504', sub: 'DAYS LEFT', labelSize: 100, lightI: 18, lightD: 30, glow: 1.3 }); J.position.set(3.0, 4.6, -1.5);
    cam(camera, [-0.6, 10.0, 12.5], [0.2, 8.6, 0], 42);
    return {
      bloom: { strength: 0.8, radius: 0.55, threshold: 0.8 },
      overlay(g, W, H) {
        U.vignette(g, W, H, 0.5);
        U.text(g, 'HOW MANY', W * 0.7, H * 0.15, { font: '900 84px Archivo', color: '#ffffff', align: 'center', stroke: '#120c0a', lw: 14 });
        U.text(g, 'DAYS LEFT?', W * 0.7, H * 0.29, { font: '900 96px Archivo', color: '#ffd27a', align: 'center', stroke: '#120c0a', lw: 14 });
      },
    };
  },
});

// ---------------- manga-page variants: same sets, closer cameras, no UI ----------------
const variant = (base, pos, at, fov) => (ctx) => { const cfg = SHOTS[base](ctx); cam(ctx.camera, pos, at, fov); return { ...cfg, overlay: (g, W, H) => U.vignette(g, W, H, 0.25) }; };
Object.assign(SHOTS, {
  m_card: variant('k2_card', [3.5, -8.5, -6], [-2.2, -11.2, -16], 38),
  m_roof: variant('k7_rooftop', [7, 10.5, 6], [6.5, 10.5, -12], 42),
  m_door: variant('k7_rooftop', [-14, 10, 6], [-19.5, 10.5, -7], 40),
  m_end: variant('k9_end', [3, 8, 7], [-2, 7.6, -6], 44),
});
