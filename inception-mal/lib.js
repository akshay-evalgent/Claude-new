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
function drawFace(c, f, e) {
  c.lineCap = 'round';
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
  else if (o.style === 'waistcoat') { c.fillStyle = o.shirt; c.fillRect(0, 0, S, S); c.fillStyle = 'rgba(255,255,255,.35)'; for (let y = 14; y < S; y += 30) for (let x = 14 + (y % 60 ? 15 : 0); x < S; x += 30) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); } c.fillStyle = o.jacket; c.beginPath(); c.moveTo(0, 0); c.lineTo(70, 0); c.lineTo(118, 256); c.lineTo(0, 256); c.fill(); c.beginPath(); c.moveTo(256, 0); c.lineTo(186, 0); c.lineTo(138, 256); c.lineTo(256, 256); c.fill(); V(22, 40, o.skin); }
}

const headGeo = new RoundedBoxGeometry(1.36, 1.3, 1.3, 3, 0.2);
const faceGeo = new THREE.PlaneGeometry(1.22, 1.22);
function hair(style, col, head) {
  const g = new THREE.Group(); head.add(g); const b = (w, h, d, x, y, z, c = col) => box(w, h, d, c, x, y, z, g);
  const cap = (h = 0.34) => b(1.46, h, 1.42, 0, 1.3 - 0.17 + h / 2, 0.0);
  if (style === 'slick') { cap(0.36); b(1.46, 0.95, 0.3, 0, 0.9, -0.6); b(0.14, 0.5, 0.9, -0.69, 1.0, -0.1); b(0.14, 0.5, 0.9, 0.69, 1.0, -0.1); const f = b(1.3, 0.26, 0.6, 0, 1.52, 0.3); f.rotation.x = -0.35; }
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
  boy: { skin: 0xf2cfae, hair: ['kid', 0xd9b25f], face: { brow: '#a8843c', browW: 7 }, torso: { style: 'zip', jacket: '#4d8f5a', shirt: '#f1ead8' }, arm: 0x4d8f5a, leg: 0x4a5a78 },
  girl: { skin: 0xf2cfae, hair: ['pony', 0xe0bd6a], face: { lashes: 1, brow: '#a8843c', browW: 7 }, torso: { style: 'zip', jacket: '#d98aa0', shirt: '#fff3f5' }, arm: 0xd98aa0, leg: 0xf2cfae, skirt: 0xd98aa0 },
};

let charCount = 0;
export function makeChar(name, expr = 'neutral') {
  const o = CAST[name], g = new THREE.Group(); g.name = name; const seedN = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 7 + (charCount++) * 0.61;
  const skinHex = '#' + o.skin.toString(16).padStart(6, '0');
  const body = new THREE.Group(); g.add(body);
  const limb = (x, y, col, hand) => { const p = new THREE.Group(); p.position.set(x, y, 0); body.add(p); if (hand) { box(0.98, 1.55, 0.98, col, 0, -0.775, 0, p); box(0.98, 0.45, 0.98, o.skin, 0, -1.775, 0, p); } else { box(0.98, 2, 0.98, col, 0, -1, 0, p); } return p; };
  const legL = limb(-0.5, 2, o.leg), legR = limb(0.5, 2, o.leg);
  if (o.skirt) box(2.1, 1.15, 1.12, o.skirt, 0, 1.5, 0, body);
  const tt = tex(256, 256, c => drawTorso(c, { ...o.torso, skin: skinHex }));
  const side = M(o.torso.jacket);
  const torso = new THREE.Mesh(boxGeo, [side, side, side, side, new THREE.MeshLambertMaterial({ map: tt }), side]);
  torso.scale.set(2, 2, 1); torso.position.y = 3; torso.castShadow = true; body.add(torso);
  const armL = limb(-1.5, 4, o.arm, true), armR = limb(1.5, 4, o.arm, true);
  const head = new THREE.Group(); head.position.y = 4; body.add(head);
  const hm = new THREE.Mesh(headGeo, M(o.skin)); hm.position.y = 0.65; hm.castShadow = true; head.add(hm);
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
