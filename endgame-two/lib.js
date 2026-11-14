// Blocky avatar characters, props and shared helpers.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = k => { k = clamp(k); return k * k * (3 - 2 * k); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const pop = k => { k = clamp(k); return k >= 1 ? 1 : 1 + Math.sin(k * Math.PI) * 0.25 * (1 - k) - Math.pow(1 - k, 3); };
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

const mats = new Map();
export function M(c, o) {
  if (o) return new THREE.MeshLambertMaterial({ color: c, ...o });
  if (!mats.has(c)) mats.set(c, new THREE.MeshLambertMaterial({ color: c }));
  return mats.get(c);
}
export function tex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
export function box(w, h, d, c, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(boxGeo, typeof c === 'object' ? c : M(c));
  m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m); return m;
}
export function label(lines, o = {}) {
  lines = [].concat(lines);
  const px = 120, pad = 46, font = `900 ${px}px Inter, sans-serif`;
  const c0 = document.createElement('canvas').getContext('2d'); c0.font = font;
  const w = Math.ceil(Math.max(...lines.map(l => c0.measureText(l).width)) + pad * 2), h = lines.length * px * 1.12 + pad * 1.4;
  const t = tex(w, h, (c) => {
    if (o.bg) { c.fillStyle = o.bg; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 44); c.fill(); if (o.border) { c.lineWidth = 10; c.strokeStyle = o.border; c.stroke(); } }
    c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    lines.forEach((l, i) => {
      const y = pad * 0.7 + px * 0.56 + i * px * 1.12;
      if (!o.bg) { c.lineWidth = 26; c.strokeStyle = o.stroke || '#000'; c.strokeText(l, w / 2, y); }
      c.fillStyle = o.color || '#fff'; c.fillText(l, w / 2, y);
    });
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, fog: false }));
  const H = (o.h || 1) * lines.length; s.scale.set(H * w / h, H, 1); s.userData.base = s.scale.clone(); s.renderOrder = 20;
  return s;
}
export function setPop(s, k) { const p = k <= 0 ? 0.0001 : pop(k); s.scale.set(s.userData.base.x * p, s.userData.base.y * p, 1); s.visible = k > 0; }

// ---------- faces ----------
const EX = {
  neutral: { brow: 0, mouth: 'smile' }, serious: { brow: 1, mouth: 'flat' }, smirk: { brow: 0.5, mouth: 'smirk' },
  sad: { brow: -1, mouth: 'frown' }, joy: { brow: -0.3, mouth: 'open' }, sleep: { brow: 0, mouth: 'flat', closed: true },
  surprised: { brow: -0.8, mouth: 'o' }, menace: { brow: 1, mouth: 'smirk' },
};
function drawMask(c, m) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (m === 'iron') { c.fillStyle = '#e2b23c'; c.beginPath(); c.moveTo(48, 40); c.lineTo(208, 40); c.lineTo(222, 150); c.lineTo(176, 240); c.lineTo(80, 240); c.lineTo(34, 150); c.fill(); c.fillStyle = '#eafcff'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(128 + sx * 22, 112); c.lineTo(128 + sx * 78, 98); c.lineTo(128 + sx * 74, 120); c.lineTo(128 + sx * 24, 126); c.fill(); } c.strokeStyle = '#8a6a1c'; c.lineWidth = 6; c.beginPath(); c.moveTo(96, 200); c.lineTo(160, 200); c.moveTo(70, 150); c.lineTo(96, 200); c.moveTo(186, 150); c.lineTo(160, 200); c.stroke(); }
  if (m === 'spidey') { c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 3; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.cos(i * 0.785) * 200, 128 + Math.sin(i * 0.785) * 200); c.stroke(); } for (const r of [50, 95, 140]) { c.beginPath(); c.arc(128, 128, r, 0, 7); c.stroke(); } for (const sx of [-1, 1]) { c.fillStyle = '#111'; c.beginPath(); c.ellipse(128 + sx * 54, 112, 44, 30, sx * 0.5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(128 + sx * 54, 114, 32, 20, sx * 0.5, 0, 7); c.fill(); } }
  if (m === 'panther') { c.fillStyle = '#d5dae2'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(128 + sx * 26, 112); c.lineTo(128 + sx * 78, 96); c.lineTo(128 + sx * 70, 122); c.fill(); } c.strokeStyle = 'rgba(213,218,226,.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(60, 170); c.lineTo(110, 200); c.moveTo(196, 170); c.lineTo(146, 200); c.moveTo(128, 60); c.lineTo(128, 86); c.stroke(); }
}
function drawFace(c, f, e) {
  if (f.mask) return drawMask(c, f.mask);
  c.lineCap = 'round';
  if (f.raccoon) { c.fillStyle = '#e8ddd0'; c.beginPath(); c.ellipse(128, 196, 70, 54, 0, 0, 7); c.fill(); c.fillStyle = '#2a2420'; for (const x of [82, 174]) { c.beginPath(); c.ellipse(x, 104, 40, 34, 0, 0, 7); c.fill(); } c.beginPath(); c.ellipse(128, 160, 16, 11, 0, 0, 7); c.fill(); }
  if (f.chin) { c.strokeStyle = 'rgba(40,10,60,.55)'; c.lineWidth = 7; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(128 + i * 18, 214); c.lineTo(128 + i * 19, 252); c.stroke(); } }
  if (f.beard) { c.fillStyle = f.beard; c.beginPath(); c.moveTo(20, 120); c.lineTo(44, 120); c.lineTo(56, 158); c.lineTo(200, 158); c.lineTo(212, 120); c.lineTo(236, 120); c.lineTo(236, 256); c.lineTo(20, 256); c.fill(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.ellipse(128, 190, 40, 17, 0, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over'; }
  if (f.stubble) { c.fillStyle = f.stubble; c.beginPath(); c.ellipse(128, 206, 96, 62, 0, 0, 7); c.fill(); if (f.goatee) { c.fillStyle = f.goatee; c.beginPath(); c.roundRect(92, 160, 72, 18, 8); c.fill(); c.beginPath(); c.roundRect(104, 212, 48, 34, 10); c.fill(); } }
  for (const [x, sgn] of [[82, 1], [174, -1]]) {
    if (e.closed) { c.strokeStyle = '#1b1b1b'; c.lineWidth = 9; c.beginPath(); c.arc(x, 100, 17, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    else if (f.iris) { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, 106, 19, 22, 0, 0, 7); c.fill(); c.fillStyle = f.iris; c.beginPath(); c.arc(x, 108, 13, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(x, 108, 6, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 5, 102, 4, 0, 7); c.fill(); }
    else { c.fillStyle = '#1b1b1b'; c.beginPath(); c.ellipse(x, 106, 13, 21, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 4, 97, 4.5, 0, 7); c.fill(); }
    if (f.lashes && !e.closed) { c.strokeStyle = '#1b1b1b'; c.lineWidth = 6; c.beginPath(); c.moveTo(x - sgn * 14, 92); c.lineTo(x - sgn * 26, 80); c.stroke(); }
    if (f.shades) { c.fillStyle = '#0c0c0e'; c.beginPath(); c.roundRect(x - 34, 84, 68, 42, 10); c.fill(); }
    const b = e.brow * 11; c.strokeStyle = f.brow || '#2a1d14'; c.lineWidth = f.browW || 10;
    c.beginPath(); c.moveTo(x - sgn * 24, 66 - b * 0.4); c.lineTo(x + sgn * 22, 64 + b); c.stroke();
  }
  if (f.shades) { c.fillStyle = '#0c0c0e'; c.fillRect(100, 92, 56, 10); }
  if (f.glasses) { c.strokeStyle = '#1b1b1b'; c.lineWidth = 5; for (const x of [82, 174]) { c.beginPath(); c.roundRect(x - 30, 82, 60, 46, 10); c.stroke(); } c.beginPath(); c.moveTo(112, 104); c.lineTo(144, 104); c.stroke(); }
  if (f.eyeGlow && !e.closed) { c.fillStyle = f.eyeGlow; for (const x of [82, 174]) { c.beginPath(); c.ellipse(x, 106, 13, 21, 0, 0, 7); c.fill(); } }
  if (f.lines) { c.strokeStyle = 'rgba(90,55,30,.35)'; c.lineWidth = 5; c.beginPath(); c.moveTo(58, 150); c.lineTo(70, 176); c.moveTo(198, 150); c.lineTo(186, 176); c.stroke(); }
  c.strokeStyle = f.lips || '#3a1f17'; c.lineWidth = f.lips ? 13 : 9; c.fillStyle = '#5a1418';
  c.beginPath();
  if (e.mouth === 'smile') c.arc(128, 150, 50, 0.22 * Math.PI, 0.78 * Math.PI);
  else if (e.mouth === 'smirk') { c.moveTo(96, 190); c.quadraticCurveTo(132, 204, 168, 176); }
  else if (e.mouth === 'flat') { c.moveTo(100, 190); c.lineTo(156, 190); }
  else if (e.mouth === 'frown') c.arc(128, 226, 44, 1.25 * Math.PI, 1.75 * Math.PI);
  else if (e.mouth === 'talk1') { c.ellipse(128, 190, 20, 8, 0, 0, 7); c.fill(); }
  else if (e.mouth === 'talk2') { c.ellipse(128, 192, 24, 17, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.fillRect(110, 177, 36, 7); c.beginPath(); c.ellipse(128, 192, 24, 17, 0, 0, 7); }
  else if (e.mouth === 'o') { c.ellipse(128, 192, 13, 17, 0, 0, 7); c.fill(); }
  else if (e.mouth === 'open') { c.moveTo(84, 172); c.lineTo(172, 172); c.arc(128, 172, 44, 0, Math.PI); c.fill(); c.fillStyle = '#fff'; c.fillRect(96, 172, 64, 11); c.beginPath(); c.moveTo(84, 172); c.lineTo(172, 172); c.arc(128, 172, 44, 0, Math.PI); }
  c.stroke();
}
function drawTorso(c, o) {
  const S = 256; c.fillStyle = o.jacket; c.fillRect(0, 0, S, S);
  const V = (w, d, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(128 - w, 0); c.lineTo(128 + w, 0); c.lineTo(128, d); c.fill(); };
  const tie = col => { c.fillStyle = col; c.beginPath(); c.moveTo(116, 8); c.lineTo(140, 8); c.lineTo(134, 30); c.lineTo(144, 132); c.lineTo(128, 152); c.lineTo(112, 132); c.lineTo(122, 30); c.fill(); };
  const lapels = () => { c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 7; c.beginPath(); c.moveTo(60, 0); c.lineTo(128, 172); c.lineTo(196, 0); c.moveTo(128, 172); c.lineTo(128, 256); c.stroke(); c.fillStyle = 'rgba(0,0,0,.4)'; for (const y of [196, 232]) { c.beginPath(); c.arc(140, y, 6, 0, 7); c.fill(); } };
  if (o.style === 'suit') { V(62, 172, o.shirt); tie(o.tie); lapels(); }
  else if (o.style === 'open') { V(60, 150, o.shirt); c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 5; c.beginPath(); c.moveTo(128, 40); c.lineTo(128, 150); c.stroke(); V(26, 44, o.skin); lapels(); }
  else if (o.style === 'vest') { V(86, 256, o.shirt); c.fillStyle = o.vest; c.beginPath(); c.moveTo(70, 256); c.lineTo(78, 60); c.lineTo(128, 150); c.lineTo(178, 60); c.lineTo(186, 256); c.fill(); tie(o.tie); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 7; c.beginPath(); c.moveTo(42, 0); c.lineTo(70, 256); c.moveTo(214, 0); c.lineTo(186, 256); c.stroke(); c.fillStyle = 'rgba(0,0,0,.45)'; for (const y of [176, 206, 236]) { c.beginPath(); c.arc(128, y, 5, 0, 7); c.fill(); } }
  else if (o.style === 'zip') { c.fillStyle = o.shirt; c.fillRect(92, 0, 72, 256); c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 7; c.beginPath(); c.moveTo(92, 0); c.lineTo(92, 256); c.moveTo(164, 0); c.lineTo(164, 256); c.stroke(); }
  else if (o.style === 'dress') { V(58, 96, o.skin); c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 6; c.beginPath(); c.moveTo(70, 0); c.lineTo(128, 96); c.lineTo(186, 0); c.stroke(); }
  else if (o.style === 'arc') { if (o.trim) { c.fillStyle = o.trim; c.fillRect(0, 0, 60, 26); c.fillRect(196, 0, 60, 26); c.fillRect(96, 150, 64, 106); c.fillRect(0, 222, 256, 14); } c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(128, 92, 38, 0, 7); c.fill(); c.fillStyle = '#9fe8ff'; c.beginPath(); c.arc(128, 92, 28, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 92, 15, 0, 7); c.fill(); }
  else if (o.style === 'star') { if (o.stripes) { for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#f2f2f2' : '#b3242c'; c.fillRect(46 + i * 23.5, 150, 23.5, 106); } } c.fillStyle = o.star; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 54, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(128 + Math.cos(a) * r, 88 + Math.sin(a) * r); } c.fill(); if (o.band) { c.fillStyle = o.band; c.fillRect(0, 0, 256, 22); c.fillRect(0, 196, 256, 16); } }
  else if (o.style === 'spider') { c.fillStyle = '#1f3f9a'; c.fillRect(0, 60, 54, 196); c.fillRect(202, 60, 54, 196); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 3; for (let x = 70; x < 200; x += 26) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 256); c.stroke(); } for (let y = 30; y < 256; y += 40) { c.beginPath(); c.moveTo(54, y); c.lineTo(202, y); c.stroke(); } c.fillStyle = '#111'; c.beginPath(); c.ellipse(128, 96, 13, 22, 0, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#111'; for (const sx of [-1, 1]) for (const dy of [-22, -6, 10, 26]) { c.beginPath(); c.moveTo(128, 96 + dy * 0.4); c.lineTo(128 + sx * 40, 96 + dy * 1.5); c.stroke(); } }
  else if (o.style === 'armor') { c.fillStyle = o.plate || '#b9c0c9'; for (const x of [78, 178]) { c.beginPath(); c.arc(x, 74, 30, 0, 7); c.fill(); } c.fillRect(40, 212, 176, 20); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 6; c.beginPath(); c.moveTo(128, 0); c.lineTo(128, 212); c.moveTo(40, 130); c.lineTo(216, 130); c.moveTo(60, 170); c.lineTo(196, 170); c.stroke(); if (o.gem) { c.fillStyle = o.gem; c.beginPath(); c.arc(128, 222, 12, 0, 7); c.fill(); } }
  else if (o.style === 'widow') { c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 5; c.beginPath(); c.moveTo(128, 0); c.lineTo(128, 256); c.stroke(); c.fillStyle = '#c0262e'; c.beginPath(); c.moveTo(112, 196); c.lineTo(144, 196); c.lineTo(128, 214); c.lineTo(144, 232); c.lineTo(112, 232); c.lineTo(128, 214); c.fill(); c.fillStyle = o.skin; c.beginPath(); c.moveTo(108, 0); c.lineTo(148, 0); c.lineTo(128, 34); c.fill(); }
  else if (o.style === 'waistcoat') { c.fillStyle = o.shirt; c.fillRect(0, 0, S, S); c.fillStyle = 'rgba(255,255,255,.35)'; for (let y = 14; y < S; y += 30) for (let x = 14 + (y % 60 ? 15 : 0); x < S; x += 30) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); } c.fillStyle = o.jacket; c.beginPath(); c.moveTo(0, 0); c.lineTo(70, 0); c.lineTo(118, 256); c.lineTo(0, 256); c.fill(); c.beginPath(); c.moveTo(256, 0); c.lineTo(186, 0); c.lineTo(138, 256); c.lineTo(256, 256); c.fill(); V(22, 40, o.skin); }
}

const headGeo = new RoundedBoxGeometry(1.36, 1.3, 1.3, 3, 0.2);
const faceGeo = new THREE.PlaneGeometry(1.22, 1.22);
function hair(style, col, head) {
  const g = new THREE.Group(); head.add(g); const b = (w, h, d, x, y, z, c = col) => box(w, h, d, c, x, y, z, g);
  const cap = (h = 0.34) => b(1.46, h, 1.42, 0, 1.3 - 0.17 + h / 2, 0.0);
  if (style === 'none') return g;
  if (style === 'mohawk') { b(1.46, 0.2, 1.42, 0, 1.38, 0); b(0.5, 0.5, 1.5, 0, 1.6, -0.05); b(1.46, 0.6, 0.26, 0, 1.05, -0.6); }
  else if (style === 'slick') { cap(0.36); b(1.46, 0.95, 0.3, 0, 0.9, -0.6); b(0.14, 0.5, 0.9, -0.69, 1.0, -0.1); b(0.14, 0.5, 0.9, 0.69, 1.0, -0.1); const f = b(1.3, 0.26, 0.6, 0, 1.52, 0.3); f.rotation.x = -0.35; }
  else if (style === 'tight') { cap(0.24); b(1.46, 0.8, 0.26, 0, 0.98, -0.6); b(0.12, 0.42, 0.95, -0.69, 1.08, -0.08); b(0.12, 0.42, 0.95, 0.69, 1.08, -0.08); b(1.0, 0.1, 0.7, 0.15, 1.5, 0.1); }
  else if (style === 'long') { cap(0.3); b(1.5, 2.1, 0.32, 0, 0.35, -0.62); b(0.2, 1.75, 0.75, -0.72, 0.5, 0.1); b(0.2, 1.75, 0.75, 0.72, 0.5, 0.1); b(0.62, 0.22, 0.2, -0.38, 1.22, 0.66); b(0.62, 0.22, 0.2, 0.38, 1.22, 0.66); }
  else if (style === 'quiff') { cap(0.3); b(1.46, 0.8, 0.28, 0, 0.98, -0.6); b(0.12, 0.45, 0.95, -0.69, 1.05, -0.08); b(0.12, 0.45, 0.95, 0.69, 1.05, -0.08); const q = b(1.1, 0.34, 0.5, 0.1, 1.58, 0.42); q.rotation.x = -0.5; q.rotation.z = 0.12; }
  else if (style === 'curls') { const r = rng(11); for (let i = 0; i < 46; i++) { const a = r() * 6.28, y = 0.75 + r() * 0.95, rad = y > 1.35 ? r() * 0.6 : 0.72; const z = Math.cos(a) * rad, x = Math.sin(a) * rad; if (z > 0.45 && y < 1.3) continue; const s = 0.34 + r() * 0.2; const m = b(s, s, s, x, y, z); m.rotation.set(r(), r(), r()); } }
  else if (style === 'part') { cap(0.3); b(1.46, 0.85, 0.28, 0, 0.95, -0.6); b(0.12, 0.5, 0.95, -0.69, 1.02, -0.08); b(0.12, 0.5, 0.95, 0.69, 1.02, -0.08); const p = b(1.0, 0.18, 1.3, -0.2, 1.56, 0.04); p.rotation.z = 0.12; b(0.12, 0.3, 0.5, -0.7, 0.9, 0.2, 0x8a8f96); b(0.12, 0.3, 0.5, 0.7, 0.9, 0.2, 0x8a8f96); }
  else if (style === 'swept') { cap(0.3); b(1.46, 0.85, 0.28, 0, 0.95, -0.6); b(0.12, 0.45, 0.95, -0.69, 1.05, -0.08); b(0.12, 0.45, 0.95, 0.69, 1.05, -0.08); const p = b(1.2, 0.24, 0.6, -0.12, 1.5, 0.42); p.rotation.z = -0.16; p.rotation.x = 0.2; }
  else if (style === 'bob') { cap(0.34); b(1.52, 1.5, 0.34, 0, 0.62, -0.62); for (const s of [-1, 1]) { b(0.24, 1.35, 0.9, s * 0.74, 0.68, 0.0); b(0.3, 0.4, 0.5, s * 0.78, 0.2, 0.25); b(0.5, 0.26, 0.2, s * 0.42, 1.24, 0.66); } }
  else if (style === 'kid') { cap(0.34); b(1.46, 1.0, 0.3, 0, 0.85, -0.6); b(0.14, 0.7, 0.95, -0.69, 0.92, -0.08); b(0.14, 0.7, 0.95, 0.69, 0.92, -0.08); b(1.3, 0.2, 0.2, 0, 1.22, 0.66); }
  else if (style === 'pony') { cap(0.34); b(1.46, 1.0, 0.3, 0, 0.85, -0.6); b(0.14, 0.7, 0.95, -0.69, 0.92, -0.08); b(0.14, 0.7, 0.95, 0.69, 0.92, -0.08); b(1.3, 0.2, 0.2, 0, 1.22, 0.66); b(0.4, 1.3, 0.4, 0, 0.3, -0.9); }
  return g;
}

export const CAST = {
  cobb: { skin: 0xe6b78c, hair: ['slick', 0x7a5632], face: { stubble: 'rgba(92,62,36,.30)', goatee: 'rgba(92,62,36,.55)', brow: '#5d4024', browW: 12 }, torso: { style: 'open', jacket: '#2c2f38', shirt: '#b9c0c9' }, arm: 0x2c2f38, leg: 0x23252c },
  arthur: { skin: 0xf0c9a4, hair: ['tight', 0x17120f], face: { brow: '#17120f' }, torso: { style: 'vest', jacket: '#4b4037', shirt: '#f1efe9', vest: '#3a312a', tie: '#7a1f24' }, arm: 0x4b4037, leg: 0x3a312a },
  ariadne: { skin: 0xf3d0b0, hair: ['long', 0x6b3f22], face: { lashes: 1, brow: '#5a3520', browW: 7, lips: '#b5544f' }, torso: { style: 'zip', jacket: '#a3312b', shirt: '#efe4cf' }, arm: 0xa3312b, leg: 0x34425e, scarf: 0xcfa869 },
  eames: { skin: 0xe2b089, hair: ['quiff', 0x5a3d26], face: { stubble: 'rgba(80,55,35,.34)', brow: '#4a321f' }, torso: { style: 'open', jacket: '#b38d5c', shirt: '#dc8f7d' }, arm: 0xb38d5c, leg: 0x6a5238 },
  yusuf: { skin: 0xa9744f, hair: ['curls', 0x1c1512], face: { beard: '#1c1512', brow: '#1c1512', browW: 13 }, torso: { style: 'waistcoat', jacket: '#6b2d2d', shirt: '#4f68a8' }, arm: 0x4f68a8, leg: 0x9a8560 },
  saito: { skin: 0xdcae82, hair: ['part', 0x121214], face: { brow: '#121214', lines: 1 }, torso: { style: 'suit', jacket: '#16171c', shirt: '#f4f4f2', tie: '#9aa0a8' }, arm: 0x16171c, leg: 0x16171c },
  fischer: { skin: 0xf5dac6, hair: ['swept', 0x3a2a20], face: { iris: '#3f9be8', brow: '#3a2a20', browW: 8 }, torso: { style: 'suit', jacket: '#3e4b5e', shirt: '#cfe0f2', tie: '#1f2a44' }, arm: 0x3e4b5e, leg: 0x354051 },
  mal: { skin: 0xf0cdb0, hair: ['bob', 0x2b1b14], face: { lashes: 1, lips: '#b3202a', brow: '#2b1b14', browW: 7 }, torso: { style: 'dress', jacket: '#101014' }, arm: 0xf0cdb0, leg: 0xf0cdb0, skirt: 0x101014 },
  guard: { skin: 0xd9b08c, hair: ['tight', 0x222222], face: { shades: 1, brow: '#222' }, torso: { style: 'suit', jacket: '#3b3f46', shirt: '#e8e8e8', tie: '#111' }, arm: 0x3b3f46, leg: 0x2b2e33 },
  cobbOld: { skin: 0xdcae86, hair: ['slick', 0xb4b4ae], face: { stubble: 'rgba(170,170,165,.45)', goatee: 'rgba(190,190,185,.7)', brow: '#9a9a94', browW: 12, lines: 1 }, torso: { style: 'zip', jacket: '#7f9bb5', shirt: '#e9eef3' }, arm: 0x7f9bb5, leg: 0x7f9bb5 },
  malOld: { skin: 0xe9c6aa, hair: ['bob', 0xc9c5bf], face: { lashes: 1, lips: '#a8505a', brow: '#a9a5a0', browW: 7, lines: 1 }, torso: { style: 'zip', jacket: '#5d6f8f', shirt: '#f2ead8' }, arm: 0x5d6f8f, leg: 0x3a4152, skirt: 0x3a4152 },
  son: { skin: 0xf2cfae, hair: ['quiff', 0xc9a04f], face: { brow: '#a8843c', browW: 8 }, torso: { style: 'open', jacket: '#3f7350', shirt: '#f1ead8' }, arm: 0x3f7350, leg: 0x3a4660 },
  daughter: { skin: 0xf2cfae, hair: ['long', 0xdcb962], face: { lashes: 1, brow: '#a8843c', browW: 7, lips: '#c06a70' }, torso: { style: 'zip', jacket: '#c9778f', shirt: '#fff3f5' }, arm: 0xc9778f, leg: 0x4a5a78 },
  civA: { skin: 0xc98f66, hair: ['tight', 0x2a1c14], face: { brow: '#2a1c14' }, torso: { style: 'zip', jacket: '#6a7f5a', shirt: '#e8e2d0' }, arm: 0x6a7f5a, leg: 0x4a4a52 },
  civB: { skin: 0xf0cdb0, hair: ['long', 0xb07a3a], face: { lashes: 1, brow: '#8a5a2a', browW: 7, lips: '#b5544f' }, torso: { style: 'zip', jacket: '#3f6a8f', shirt: '#f4efe6' }, arm: 0x3f6a8f, leg: 0x2f3440 },
  civC: { skin: 0x8a5a3c, hair: ['curls', 0x15100d], face: { brow: '#15100d' }, torso: { style: 'open', jacket: '#c9b48a', shirt: '#ffffff' }, arm: 0xc9b48a, leg: 0x6a5a48 },
  civD: { skin: 0xe6c09a, hair: ['part', 0x4a3a2e], face: { brow: '#4a3a2e', lines: 1 }, torso: { style: 'suit', jacket: '#5a5f6a', shirt: '#f4f4f2', tie: '#2f4a7a' }, arm: 0x5a5f6a, leg: 0x3a3e46 },
  tony: { skin: 0xe6b78c, hair: ['quiff', 0x2a1c14], face: { stubble: 'rgba(40,26,18,.22)', goatee: 'rgba(30,20,14,.8)', brow: '#2a1c14', browW: 11 }, torso: { style: 'arc', jacket: '#23252b' }, arm: 0x23252b, leg: 0x3a3e48 },
  tonyArmor: { skin: 0xe6b78c, hair: ['quiff', 0x2a1c14], face: { stubble: 'rgba(40,26,18,.22)', goatee: 'rgba(30,20,14,.8)', brow: '#2a1c14', browW: 11 }, torso: { style: 'arc', jacket: '#a8211f', trim: '#e2b23c' }, arm: 0xa8211f, leg: 0xa8211f, hand: 0xe2b23c },
  ironman: { skin: 0xa8211f, head: 0xa8211f, hair: ['none'], face: { mask: 'iron' }, torso: { style: 'arc', jacket: '#a8211f', trim: '#e2b23c' }, arm: 0xa8211f, leg: 0xa8211f, hand: 0xe2b23c },
  steve: { skin: 0xf0c9a4, hair: ['part', 0xc9a04f], face: { brow: '#a07a34', browW: 10 }, torso: { style: 'star', jacket: '#24457a', star: '#eef2f6', stripes: 1 }, arm: 0x24457a, leg: 0x1f3a66, hand: 0x7a3a2a },
  steveOld: { skin: 0xe6c2a2, hair: ['part', 0xd5d5d0], face: { brow: '#b9b9b4', browW: 10, lines: 1 }, torso: { style: 'zip', jacket: '#c9b48a', shirt: '#eef2f6' }, arm: 0xc9b48a, leg: 0x6a6a5a },
  thor: { skin: 0xeec4a0, hair: ['long', 0xd9b25f], face: { beard: '#c9a04f', brow: '#a8843c', browW: 12 }, torso: { style: 'armor', jacket: '#2a2d35', plate: '#aab3bd' }, arm: 0x2a2d35, leg: 0x23252b, cape: 0xa81f24, belly: 1, hand: 0xeec4a0 },
  hulk: { skin: 0x6fae52, hair: ['tight', 0x1c1a16], face: { brow: '#1c1a16', browW: 13, glasses: 1 }, torso: { style: 'zip', jacket: '#7a7f8a', shirt: '#e8e8e8' }, arm: 0x7a7f8a, leg: 0x4a4a5a, scale: 1.45 },
  natasha: { skin: 0xf3d0b0, hair: ['long', 0xb5462c], face: { lashes: 1, brow: '#8a3a22', browW: 7, lips: '#b5544f' }, torso: { style: 'widow', jacket: '#17181c' }, arm: 0x17181c, leg: 0x17181c, hand: 0x17181c },
  clint: { skin: 0xe6bd98, hair: ['mohawk', 0x6a4a2e], face: { stubble: 'rgba(80,55,35,.3)', brow: '#5a3d26', browW: 11 }, torso: { style: 'widow', jacket: '#1c1c22' }, arm: 0x1c1c22, leg: 0x1c1c22, hand: 0x1c1c22 },
  nebula: { skin: 0x4f78b5, hair: ['none'], face: { brow: '#22345a', browW: 9, lines: 1 }, torso: { style: 'armor', jacket: '#3a2f52', plate: '#6a5f8a' }, arm: 0x3a2f52, leg: 0x2a2440, hand: 0x8a8f96 },
  rocket: { skin: 0x7a5a3c, hair: ['none'], face: { raccoon: 1, brow: '#2a2420' }, torso: { style: 'zip', jacket: '#c2622a', shirt: '#3a3a3a' }, arm: 0xc2622a, leg: 0xc2622a, scale: 0.5, ex: (ch, box) => { box(0.4, 0.5, 0.2, 0x5a4028, -0.45, 1.5, 0, ch.head); box(0.4, 0.5, 0.2, 0x5a4028, 0.45, 1.5, 0, ch.head); const t = box(0.5, 0.5, 2.2, 0x5a4028, 0, 2.3, -1.4, ch.body); t.rotation.x = -0.5; } },
  scott: { skin: 0xeec4a0, hair: ['swept', 0x2a1c14], face: { brow: '#2a1c14' }, torso: { style: 'armor', jacket: '#9a1f22', plate: '#2a2a30' }, arm: 0x2a2a30, leg: 0x9a1f22, hand: 0x2a2a30 },
  carol: { skin: 0xf3d0b0, hair: ['long', 0xe0bd6a], face: { lashes: 1, brow: '#a8843c', browW: 8, lips: '#b5544f' }, torso: { style: 'star', jacket: '#1f3a8a', star: '#e2b23c', band: '#b3242c' }, arm: 0xb3242c, leg: 0x1f3a8a, hand: 0xb3242c },
  strange: { skin: 0xeec4a0, hair: ['part', 0x1c1a18], face: { goatee: 'rgba(30,24,20,.85)', stubble: 'rgba(40,30,24,.15)', brow: '#1c1a18', browW: 10 }, torso: { style: 'armor', jacket: '#1f3f6a', plate: '#2a5a8a', gem: '#5dff9a' }, arm: 0x1f3f6a, leg: 0x1a2f52, cape: 0xa81f24, ex: (ch, box) => { box(2.6, 0.9, 0.3, 0xa81f24, 0, 4.2, -0.6, ch.body); box(0.3, 0.9, 0.9, 0xa81f24, -1.2, 4.2, -0.2, ch.body); box(0.3, 0.9, 0.9, 0xa81f24, 1.2, 4.2, -0.2, ch.body); } },
  peter: { skin: 0xc0262e, head: 0xc0262e, hair: ['none'], face: { mask: 'spidey' }, torso: { style: 'spider', jacket: '#c0262e' }, arm: 0xc0262e, leg: 0x1f3f9a, hand: 0xc0262e },
  tchalla: { skin: 0x15161a, head: 0x15161a, hair: ['none'], face: { mask: 'panther' }, torso: { style: 'armor', jacket: '#15161a', plate: '#2a2d35' }, arm: 0x15161a, leg: 0x15161a, hand: 0x15161a, ex: (ch, box) => { box(0.3, 0.35, 0.3, 0x15161a, -0.45, 1.42, 0, ch.head); box(0.3, 0.35, 0.3, 0x15161a, 0.45, 1.42, 0, ch.head); } },
  sam: { skin: 0x8a5a3c, hair: ['tight', 0x15100d], face: { goatee: 'rgba(20,14,10,.7)', brow: '#15100d' }, torso: { style: 'armor', jacket: '#5a5f68', plate: '#a8211f' }, arm: 0x5a5f68, leg: 0x3a3e46, hand: 0xa8211f, ex: (ch, box) => { for (const sx of [-1, 1]) { const w = box(4.6, 1.3, 0.14, 0x8a9199, sx * 3.0, 4.3, -0.7, ch.body); w.rotation.z = sx * 0.35; const w2 = box(3.2, 0.9, 0.14, 0xa8211f, sx * 3.4, 3.3, -0.7, ch.body); w2.rotation.z = sx * 0.15; } } },
  wanda: { skin: 0xf3d0b0, hair: ['long', 0x8a3a22], face: { lashes: 1, brow: '#6a2a18', browW: 7, lips: '#b5544f' }, torso: { style: 'widow', jacket: '#8a1a22' }, arm: 0x8a1a22, leg: 0x2a1a1c, hand: 0xf3d0b0 },
  thanos: { skin: 0x8f66ad, hair: ['none'], face: { chin: 1, brow: '#4a2a66', browW: 15 }, torso: { style: 'armor', jacket: '#3a4a7a', plate: '#d0a43a' }, arm: 0x8f66ad, leg: 0x2f3a62, scale: 1.75, ex: (ch, box) => { box(1.5, 0.7, 1.4, 0xd0a43a, -1.6, 4.2, 0, ch.body); box(1.5, 0.7, 1.4, 0xd0a43a, 1.6, 4.2, 0, ch.body); box(2.2, 0.5, 1.2, 0xd0a43a, 0, 1.9, 0, ch.body); } },
  outrider: { skin: 0x3a3a44, hair: ['none'], face: { eyeGlow: '#ffd24a', brow: '#111' }, torso: { style: 'armor', jacket: '#2a2a32', plate: '#4a4a56' }, arm: 0x3a3a44, leg: 0x2a2a32 },
  morgan: { skin: 0xf2cfae, hair: ['pony', 0x4a3020], face: { lashes: 1, brow: '#3a2418', browW: 7 }, torso: { style: 'zip', jacket: '#d9a441', shirt: '#fff3e0' }, arm: 0xd9a441, leg: 0x4a5a78, scale: 0.6 },
  pepper: { skin: 0xf3d0b0, hair: ['long', 0xd98a5a], face: { lashes: 1, brow: '#a8643c', browW: 7, lips: '#b5544f' }, torso: { style: 'zip', jacket: '#f2efe8', shirt: '#cfd8e6' }, arm: 0xf2efe8, leg: 0x4a5a78 },
  laura: { skin: 0xf0cdb0, hair: ['long', 0x5a3a24], face: { lashes: 1, brow: '#4a2a18', browW: 7, lips: '#b5544f' }, torso: { style: 'zip', jacket: '#7a9a6a', shirt: '#f4efe6' }, arm: 0x7a9a6a, leg: 0x4a5a78 },
  frigga: { skin: 0xf0cdb0, hair: ['long', 0xc9a04f], face: { lashes: 1, brow: '#a07a34', browW: 7, lips: '#b5544f', lines: 1 }, torso: { style: 'dress', jacket: '#3f6a8f' }, arm: 0x3f6a8f, leg: 0x3f6a8f, skirt: 0x3f6a8f },
  boy: { skin: 0xf2cfae, hair: ['kid', 0xd9b25f], face: { brow: '#a8843c', browW: 7 }, torso: { style: 'zip', jacket: '#4d8f5a', shirt: '#f1ead8' }, arm: 0x4d8f5a, leg: 0x4a5a78 },
  girl: { skin: 0xf2cfae, hair: ['pony', 0xe0bd6a], face: { lashes: 1, brow: '#a8843c', browW: 7 }, torso: { style: 'zip', jacket: '#d98aa0', shirt: '#fff3f5' }, arm: 0xd98aa0, leg: 0xf2cfae, skirt: 0xd98aa0 },
};

let charCount = 0;
export function makeChar(name, expr = 'neutral') {
  const o = CAST[name], g = new THREE.Group(); g.name = name; const seedN = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 7 + (charCount++) * 0.61;
  const skinHex = '#' + o.skin.toString(16).padStart(6, '0');
  const body = new THREE.Group(); g.add(body);
  const limb = (x, y, col, hand) => { const p = new THREE.Group(); p.position.set(x, y, 0); body.add(p); if (hand) { box(0.98, 1.55, 0.98, col, 0, -0.775, 0, p); box(0.98, 0.45, 0.98, o.hand ?? o.skin, 0, -1.775, 0, p); } else { box(0.98, 2, 0.98, col, 0, -1, 0, p); } return p; };
  const hc = o.hand ?? o.skin;
  const legL = limb(-0.5, 2, o.leg), legR = limb(0.5, 2, o.leg);
  if (o.skirt) box(2.1, 1.15, 1.12, o.skirt, 0, 1.5, 0, body);
  const tt = tex(256, 256, c => drawTorso(c, { ...o.torso, skin: skinHex }));
  const side = M(o.torso.jacket);
  const torso = new THREE.Mesh(boxGeo, [side, side, side, side, new THREE.MeshLambertMaterial({ map: tt }), side]);
  torso.scale.set(2, 2, 1); torso.position.y = 3; torso.castShadow = true; body.add(torso);
  const armL = limb(-1.5, 4, o.arm, true), armR = limb(1.5, 4, o.arm, true);
  const head = new THREE.Group(); head.position.y = 4; body.add(head);
  const hm = new THREE.Mesh(headGeo, M(o.head ?? o.skin)); hm.position.y = 0.65; hm.castShadow = true; head.add(hm);
  const faces = {};
  const fm = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  const fp = new THREE.Mesh(faceGeo, fm); fp.position.set(0, 0.65, 0.652); head.add(fp);
  hair(o.hair[0], o.hair[1], head);
  if (o.scarf) { box(1.5, 0.5, 1.4, o.scarf, 0, 4.12, 0, body); box(0.45, 1.1, 0.2, o.scarf, 0.35, 3.5, 0.56, body); }
  const ch = {
    g, body, head, armL, armR, legL, legR, name,
    face(e) { ch.base = e; ch._set(e, 0, 0); },
    _set(e, blink, talk) { const key = e + blink + talk; if (ch.expr === key) return; ch.expr = key; fm.map = faces[key] || (faces[key] = tex(256, 256, c => drawFace(c, o.face, { ...EX[e], ...(blink ? { closed: true } : {}), ...(talk ? { mouth: 'talk' + talk } : {}) }))); fm.needsUpdate = true; },
    // call every frame: expression + automatic blinking + lip-sync amount (0..1)
    look(e, T, talk = 0) { ch.base = e; const ph = (T + seedN * 1.37) % (2.6 + seedN % 1.7); ch._set(e, ph < 0.11 && !EX[e].closed ? 1 : 0, talk > 0.55 ? 2 : talk > 0.18 ? 1 : 0); if (talk > 0.18) ch.head.rotation.x += Math.sin(T * 9) * 0.03; },
    hand(side = 'R') { const a = side === 'R' ? armR : armL; const h = new THREE.Group(); h.position.set(0, -2.05, 0.2); a.add(h); return h; },
    reset() { for (const p of [armL, armR, legL, legR, head, body]) p.rotation.set(0, 0, 0); body.position.set(0, 0, 0); },
    walk(ph, a = 0.7) { legL.rotation.x = Math.sin(ph) * a; legR.rotation.x = -Math.sin(ph) * a; armL.rotation.x = -Math.sin(ph) * a; armR.rotation.x = Math.sin(ph) * a; body.position.y = Math.abs(Math.cos(ph)) * 0.12; },
    idle(t, k = 1) { head.rotation.z = Math.sin(t * 1.3) * 0.03 * k; armL.rotation.z = -0.05 - Math.sin(t * 1.7) * 0.02; armR.rotation.z = 0.05 + Math.sin(t * 1.7) * 0.02; body.position.y = Math.sin(t * 2) * 0.03; },
    sit() { legL.rotation.x = legR.rotation.x = -Math.PI / 2; armL.rotation.x = armR.rotation.x = -0.5; },
  };
  if (o.cape) { const cp = box(2.3, 3.9, 0.16, o.cape, 0, 2.2, -0.68, body); cp.rotation.x = 0.1; ch.cape = cp; }
  if (o.belly) box(2.05, 1.1, 0.5, o.torso.jacket, 0, 2.6, 0.6, body);
  if (o.ex) o.ex(ch, box);
  if (o.scale) g.scale.setScalar(o.scale);
  ch.face(expr); return ch;
}

// ---------- props ----------
export { THREE };
export function makeTop(s = 1) {
  const g = new THREE.Group(), m = new THREE.MeshPhongMaterial({ color: 0xaeb6c2, specular: 0xffffff, shininess: 90, flatShading: true });
  const a = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 10), m); a.rotation.x = Math.PI; a.position.y = 0.3;
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.5, 0.14, 10), m); b.position.y = 0.67;
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.25, 10), m); c.position.y = 0.86;
  const d = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6), m); d.position.y = 1.15;
  const spin = new THREE.Group(); spin.add(a, b, c, d); [a, b, c, d].forEach(x => x.castShadow = true);
  const tilt = new THREE.Group(); tilt.add(spin); g.add(tilt); g.scale.setScalar(s);
  g.userData.set = (t, wob = 0.04, speed = 38) => { spin.rotation.y = t * speed; tilt.rotation.z = Math.cos(t * 7) * wob; tilt.rotation.x = Math.sin(t * 7) * wob; };
  g.userData.tilt = tilt; g.userData.spin = spin;
  return g;
}
export const studs = (base, hi) => { const t = tex(64, 64, c => { c.fillStyle = base; c.fillRect(0, 0, 64, 64); c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.arc(33, 34, 19, 0, 7); c.fill(); c.fillStyle = hi; c.beginPath(); c.arc(32, 32, 19, 0, 7); c.fill(); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
export function ground(scene, size, base, hi, y = 0) {
  const t = studs(base, hi); t.repeat.set(size / 2, size / 2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: t }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; scene.add(m); return m;
}
const winTex = [0, 1, 2].map(i => null);
export function building(w, h, d, col, lit = 0.35, seed = 1, litCol = '#ffd98a') {
  const k = seed % 3 + (lit > 0.5 ? 3 : 0) + litCol;
  const r = rng(seed * 97 + 3);
  const t = tex(128, 256, c => { c.fillStyle = col; c.fillRect(0, 0, 128, 256); for (let y = 8; y < 250; y += 20) for (let x = 8; x < 120; x += 20) { c.fillStyle = r() < lit ? litCol : 'rgba(0,0,0,.35)'; c.fillRect(x, y, 12, 13); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 16)));
  const side = new THREE.MeshLambertMaterial({ map: t }), top = M(col);
  const m = new THREE.Mesh(boxGeo, [side, side, top, top, side, side]); m.scale.set(w, h, d); m.castShadow = m.receiveShadow = true; return m;
}
export function van(col = 0xf2f2ee) {
  const g = new THREE.Group();
  box(4.4, 3.2, 9, col, 0, 2.3, 0, g); box(4.2, 1.5, 2.6, col, 0, 1.45, 5.4, g); box(3.9, 1.3, 0.1, 0x6fa3c8, 0, 3.0, 4.52, g);
  box(0.1, 1.2, 3, 0x6fa3c8, 2.22, 3.0, 2.4, g); box(0.1, 1.2, 3, 0x6fa3c8, -2.22, 3.0, 2.4, g);
  for (const [x, z] of [[-2.1, 3.8], [2.1, 3.8], [-2.1, -3], [2.1, -3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.6, 12), M(0x1a1a1a)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.85, z); w.castShadow = true; g.add(w); }
  box(0.9, 0.4, 0.1, 0xfff2b0, -1.4, 1.5, 6.72, g); box(0.9, 0.4, 0.1, 0xfff2b0, 1.4, 1.5, 6.72, g);
  return g;
}
export function car(col) { const g = new THREE.Group(); box(3.6, 1.2, 7.4, col, 0, 1.2, 0, g); box(3.2, 1.2, 3.8, col, 0, 2.4, -0.3, g); box(3.25, 0.8, 3.2, 0x6fa3c8, 0, 2.45, -0.3, g); for (const [x, z] of [[-1.7, 2.4], [1.7, 2.4], [-1.7, -2.4], [1.7, -2.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.5, 10), M(0x1a1a1a)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.7, z); g.add(w); } return g; }

// ---------- Avengers props + effects ----------
export function makeShield(broken = false) {
  const t = tex(256, 256, c => { const ring = (r, col) => { c.fillStyle = col; c.beginPath(); c.arc(128, 128, r, 0, 7); c.fill(); }; ring(128, '#b3242c'); ring(100, '#eef2f6'); ring(74, '#b3242c'); ring(48, '#24457a'); c.fillStyle = '#eef2f6'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 17 : 42, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } c.fill(); });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.14, 28, 1, false, 0, broken ? Math.PI * 1.15 : Math.PI * 2), [M(0x8a9199), new THREE.MeshLambertMaterial({ map: t }), M(0x8a9199)]);
  m.rotation.x = Math.PI / 2; m.castShadow = true; const g = new THREE.Group(); g.add(m); return g;
}
export function makeHammer() { const g = new THREE.Group(); box(0.22, 1.9, 0.22, 0x5a3d26, 0, 0.95, 0, g); box(1.5, 0.9, 0.9, 0x8a9199, 0, 2.2, 0, g); box(1.6, 0.5, 0.5, 0x6a7078, 0, 2.2, 0, g); return g; }
export function makeAxe() { const g = new THREE.Group(); box(0.26, 4.4, 0.26, 0x6a4a2e, 0, 2.2, 0, g); box(1.9, 1.5, 0.4, 0x9aa1ab, 0.9, 4.0, 0, g); box(0.9, 1.1, 0.5, 0x7b828a, -0.6, 4.0, 0, g); box(0.3, 1.9, 0.42, 0xcfd6de, 1.9, 4.0, 0, g); return g; }
export function makeGauntlet(col = 0xd0a43a) {
  const g = new THREE.Group(); box(1.25, 1.5, 1.25, col, 0, 0, 0, g); box(1.35, 0.3, 1.35, 0xb8892f, 0, 0.6, 0, g);
  const stones = [0xb050ff, 0x3a8aff, 0xff3838, 0xffa030, 0xffe84a, 0x4aff7a].map((c, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.14), new THREE.MeshBasicMaterial({ color: c })); m.position.set(i < 4 ? -0.42 + i * 0.28 : (i === 4 ? 0 : 0.68), i < 4 ? -0.62 : (i === 4 ? -0.1 : -0.2), i === 5 ? 0.2 : 0.64); g.add(m); return m; });
  const glow = new THREE.PointLight(0xffc070, 0, 14); g.add(glow); g.userData = { stones, glow }; return g;
}
// ash/dust dissolve: fx.set([x,y,z], k, scale) with k 0..1 (k<=0 hides); hide the character yourself once k > ~0.12
export function dustFx(scene, n = 220, color = 0x7a6a58) {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color }), n); im.frustumCulled = false; im.visible = false; scene.add(im); const dm = new THREE.Object3D();
  return { im, set(p, k, sc = 1, wind = [1, 0.6, 0.2]) { im.visible = k > 0 && k < 1; if (!im.visible) return; for (let i = 0; i < n; i++) { const y = hash(i + 0.1) * 5.3, w = y > 4 ? 0.65 : y > 2 ? 1.9 : 1.0, d = hash(i + 0.7), s2 = hash(i + 0.3); const kk = clamp((k - d * 0.45 - (5.3 - y) * 0.035) / 0.5), e = kk * kk; dm.position.set(p[0] + ((hash(i + 0.5) - 0.5) * 2 * w + e * wind[0] * (2 + s2 * 6)) * sc, p[1] + (y + e * wind[1] * (2 + s2 * 6)) * sc, p[2] + ((hash(i + 0.9) - 0.5) + e * wind[2] * (s2 - 0.3) * 8) * sc); dm.rotation.set(e * 6 * s2, e * 5, 0); dm.scale.setScalar(0.36 * sc * (1 - kk * kk * kk)); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); } im.instanceMatrix.needsUpdate = true; } };
}
// sling-ring portal: g = portalFx(scene, innerColor); g.position / g.rotation.y to place; g.userData.set(k, T) with k 0..1 opening
export function portalFx(scene, inner = 0x9fd0ff, r = 4.2) {
  const g = new THREE.Group(); scene.add(g); const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 28), new THREE.MeshBasicMaterial({ color: inner, transparent: true, opacity: 0.85, side: THREE.DoubleSide, fog: false })); g.add(disc);
  const N = 110, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshBasicMaterial({ color: 0xffa030, fog: false }), N); im.frustumCulled = false; g.add(im); const dm = new THREE.Object3D();
  g.position.y = r; g.userData.set = (k, T) => { g.visible = k > 0; const e = ease(k); disc.scale.setScalar(e + 0.001); for (let i = 0; i < N; i++) { const a = i / N * 6.283 + T * 2.2, rr = r * e * (1 + (hash(i) - 0.3) * 0.16 * (1 + Math.sin(T * 9 + i))); dm.position.set(Math.cos(a) * rr, Math.sin(a) * rr, (hash(i + 0.5) - 0.5) * 0.5); dm.rotation.set(T * 3 + i, i, 0); dm.scale.setScalar(0.5 + hash(i + 0.2) * 1.1); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); } im.instanceMatrix.needsUpdate = true; };
  g.userData.set(0, 0); return g;
}
