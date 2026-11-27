// Procedural 16x16 pixel textures in the vanilla block style.
// Everything is drawn to small canvases and sampled with NearestFilter.
import * as THREE from 'three';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(c, k) {
  const [r, g, b] = hex(c);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Fill a rect with per-pixel brightness jitter.
export function noisy(g, x, y, w, h, color, amt, R) {
  for (let i = x; i < x + w; i++)
    for (let j = y; j < y + h; j++) {
      g.fillStyle = shade(color, 1 + (R() - 0.5) * 2 * amt);
      g.fillRect(i, j, 1, 1);
    }
}

export function texFromCanvas(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  draw(g, w, h);
  return c;
}

export function tex(w, h, draw, repeat) { return texFromCanvas(canvas(w, h, draw), repeat); }

const cache = new Map();
function cached(key, make) { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); }

// ---------- block textures ----------
export const BLOCK = {
  grassTop: () => cached('grassTop', () => canvas(16, 16, (g) => {
    const R = rng(1); noisy(g, 0, 0, 16, 16, '#6cbf45', 0.12, R);
    for (let i = 0; i < 18; i++) { g.fillStyle = shade('#5aa83a', 1); g.fillRect((R() * 16) | 0, (R() * 16) | 0, 1, 1); }
  })),
  grassSide: () => cached('grassSide', () => canvas(16, 16, (g) => {
    const R = rng(2); noisy(g, 0, 0, 16, 16, '#8b5a33', 0.14, R);
    noisy(g, 0, 0, 16, 3, '#6cbf45', 0.1, R);
    for (let i = 0; i < 16; i++) if (R() > 0.45) { g.fillStyle = '#62b23e'; g.fillRect(i, 3, 1, 1 + ((R() * 2) | 0)); }
  })),
  dirt: () => cached('dirt', () => canvas(16, 16, (g) => { noisy(g, 0, 0, 16, 16, '#8b5a33', 0.16, rng(3)); })),
  planks: () => cached('planks', () => canvas(16, 16, (g) => {
    const R = rng(4); noisy(g, 0, 0, 16, 16, '#b8945f', 0.07, R);
    g.fillStyle = '#8a6a3e';
    for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    [[4, 0], [11, 4], [6, 8], [13, 12]].forEach(([x, y]) => g.fillRect(x, y, 1, 3));
  })),
  darkPlanks: () => cached('darkPlanks', () => canvas(16, 16, (g) => {
    const R = rng(5); noisy(g, 0, 0, 16, 16, '#5a3d22', 0.08, R);
    g.fillStyle = '#3d2814';
    for (let y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1);
    [[4, 0], [11, 4], [6, 8], [13, 12]].forEach(([x, y]) => g.fillRect(x, y, 1, 3));
  })),
  logSide: () => cached('logSide', () => canvas(16, 16, (g) => {
    const R = rng(6); noisy(g, 0, 0, 16, 16, '#6b5032', 0.1, R);
    for (let x = 0; x < 16; x += 3) { g.fillStyle = '#4e3a22'; g.fillRect(x + ((R() * 2) | 0), 0, 1, 16); }
  })),
  logTop: () => cached('logTop', () => canvas(16, 16, (g) => {
    const R = rng(7); noisy(g, 0, 0, 16, 16, '#6b5032', 0.1, R);
    noisy(g, 1, 1, 14, 14, '#b8945f', 0.06, R);
    g.strokeStyle = '#8a6a3e'; g.lineWidth = 1;
    g.strokeRect(3.5, 3.5, 9, 9); g.strokeRect(6.5, 6.5, 3, 3);
  })),
  leaves: () => cached('leaves', () => canvas(16, 16, (g) => {
    const R = rng(8); noisy(g, 0, 0, 16, 16, '#3f8f2c', 0.22, R);
    for (let i = 0; i < 30; i++) { g.fillStyle = '#2c6b1e'; g.fillRect((R() * 16) | 0, (R() * 16) | 0, 1, 1); }
  })),
  stone: () => cached('stone', () => canvas(16, 16, (g) => {
    const R = rng(9); noisy(g, 0, 0, 16, 16, '#8a8a8a', 0.1, R);
    for (let i = 0; i < 10; i++) { g.fillStyle = '#6f6f6f'; g.fillRect((R() * 15) | 0, (R() * 16) | 0, 2, 1); }
  })),
  stoneBricks: () => cached('stoneBricks', () => canvas(16, 16, (g) => {
    const R = rng(10); noisy(g, 0, 0, 16, 16, '#7d7d7d', 0.08, R);
    g.fillStyle = '#5c5c5c'; g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(7, 0, 1, 7); g.fillRect(15, 8, 1, 7);
  })),
  hay: () => cached('hay', () => canvas(16, 16, (g) => {
    const R = rng(11); noisy(g, 0, 0, 16, 16, '#c9a53a', 0.12, R);
    g.fillStyle = '#9a3a24'; g.fillRect(0, 3, 16, 1); g.fillRect(0, 12, 16, 1);
    for (let x = 0; x < 16; x += 2) { g.fillStyle = '#e0c25a'; g.fillRect(x, (R() * 16) | 0, 1, 2); }
  })),
  lavaWool: () => cached('lavaWool', () => canvas(16, 16, (g) => {
    const R = rng(12); noisy(g, 0, 0, 16, 16, '#e8681c', 0.12, R);
    for (let i = 0; i < 26; i++) { g.fillStyle = R() > 0.5 ? '#f7b733' : '#ff8a1f'; g.fillRect((R() * 16) | 0, (R() * 16) | 0, 1 + ((R() * 2) | 0), 1); }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 1; y < 16; y += 3) g.fillRect(0, y, 16, 1);
  })),
  wool: (c) => cached('wool' + c, () => canvas(16, 16, (g) => {
    const R = rng(hashStr(c)); noisy(g, 0, 0, 16, 16, c, 0.07, R);
    g.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 1; y < 16; y += 3) g.fillRect(0, y, 16, 1);
  })),
  glow: () => cached('glow', () => canvas(16, 16, (g) => {
    const R = rng(13); noisy(g, 0, 0, 16, 16, '#f6d36b', 0.15, R);
    for (let i = 0; i < 14; i++) { g.fillStyle = '#fff2b0'; g.fillRect((R() * 16) | 0, (R() * 16) | 0, 1, 1); }
  })),
  iron: () => cached('iron', () => canvas(16, 16, (g) => {
    const R = rng(14); noisy(g, 0, 0, 16, 16, '#c9c9c9', 0.05, R);
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1);
  })),
  cookie: () => cached('cookie', () => canvas(16, 16, (g) => {
    const R = rng(15); noisy(g, 0, 0, 16, 16, '#c98a3e', 0.1, R);
    for (let i = 0; i < 8; i++) { g.fillStyle = '#4a2a14'; g.fillRect(1 + ((R() * 13) | 0), 1 + ((R() * 13) | 0), 2, 1); }
  })),
  pot: () => cached('pot', () => canvas(16, 16, (g) => {
    const R = rng(16); noisy(g, 0, 0, 16, 16, '#9a5236', 0.08, R);
    g.fillStyle = '#6e3522'; g.fillRect(0, 0, 16, 2);
  })),
};

export function blockTex(name, arg, repeat) {
  const c = typeof BLOCK[name] === 'function' ? BLOCK[name](arg) : null;
  return texFromCanvas(c, repeat);
}
