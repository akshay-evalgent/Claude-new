// Props and sets for 30,000 DAYS in the toon look.
import * as THREE from 'three';
import { toon, glow, mesh, canvasTex, INK } from './toon.js';

export const GOLD = '#ffc566';
let seed = 7;
export const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
export const reseed = (s) => { seed = s; };

// --- sky: a painted dome (vertical gradient, stars, anime clouds, sun glow) ---
export function sky(scene, o = {}) {
  const stops = o.stops || [[0, '#03061a'], [0.5, '#0e1838'], [1, '#2a2050']];
  const tex = canvasTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h * 0.5);
    for (const [t, c] of stops) gr.addColorStop(t, c);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (o.sun) {   // [u, v, radius, color]
      const [u, v, r, c] = o.sun; const sg = g.createRadialGradient(u * w, v * h, 0, u * w, v * h, r * h);
      sg.addColorStop(0, c); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
    }
    if (o.stars) {
      reseed(o.seed || 11);
      for (let i = 0; i < o.stars; i++) {
        const x = rnd() * w, y = Math.pow(rnd(), 1.3) * h * 0.47, s = rnd();
        g.fillStyle = `rgba(255,${230 + s * 25 | 0},${200 + s * 55 | 0},${0.35 + s * 0.65})`;
        g.beginPath(); g.arc(x, y, 0.6 + s * s * 2.2, 0, 7); g.fill();
      }
    }
    if (o.clouds) {
      reseed(o.seed || 5);
      for (const [cx, cy, sc, col, hi] of o.clouds) {
        for (let k = 0; k < 9; k++) {
          const x = cx * w + (rnd() - 0.5) * 260 * sc, y = cy * h + (rnd() - 0.5) * 40 * sc, r = (40 + rnd() * 60) * sc;
          g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r * 1.5, r, 0, 0, 7); g.fill();
          g.fillStyle = hi; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.35, r * 1.1, r * 0.55, 0, 0, 7); g.fill();
        }
      }
    }
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(o.r || 900, 48, 24), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, toneMapped: false, fog: false }));
  m.rotation.y = o.rotY || 0; scene.add(m);
  return m;
}

// --- glowing star points (spent days) ---
export function starField(parent, n, box, o = {}) {
  reseed(o.seed || 3);
  const pos = [], col = [];
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    pos.push(box[0] + rnd() * (box[1] - box[0]), box[2] + Math.pow(rnd(), o.pow || 1) * (box[3] - box[2]), box[4] + rnd() * (box[5] - box[4]));
    c.set(o.colors ? o.colors[i % o.colors.length] : '#ffd27a').multiplyScalar(o.k ?? 2.2); col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const sprite = canvasTex(64, 64, (x, w) => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); });
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: o.size || 0.5, map: sprite, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  parent.add(p);
  return p;
}

// --- the jar of days: glass, glowing marbles, wooden lid, a number on the label ---
export function jar(parent, o = {}) {
  const J = new THREE.Group(); parent.add(J);
  const R = o.r || 1, H = o.h || 2.6, fill = o.fill ?? 0.8;
  const prof = [[0.0, 0], [R * 0.92, 0], [R, 0.12], [R, H * 0.82], [R * 0.86, H * 0.92], [R * 0.72, H * 0.96], [R * 0.72, H]];
  const glassG = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 48);
  const glass = new THREE.Mesh(glassG, new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: o.glassK ?? 0.1, depthWrite: false, side: THREE.DoubleSide }));
  J.add(glass);
  // ink silhouette lines on the glass (outline hull only on the back faces)
  const hull = new THREE.Mesh(glassG, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }));
  hull.scale.set(1.025, 1.01, 1.025); J.add(hull);
  const inner = new THREE.Mesh(glassG, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, colorWrite: false })); inner.scale.set(1.0, 1.0, 1.0); inner.renderOrder = -1;
  // marbles
  const n = o.n || 260, mr = o.mr || R * 0.13;
  const geo = new THREE.SphereGeometry(mr, 12, 10);
  const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const im = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  reseed(o.seed || 21);
  let k = 0;
  for (let i = 0; i < n * 4 && k < n; i++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * (R - mr * 1.1), y = mr + rnd() * (H * 0.8 * fill - mr);
    m4.makeTranslation(Math.cos(a) * rr, y, Math.sin(a) * rr); im.setMatrixAt(k, m4);
    const warm = rnd();
    c.set(warm < 0.15 ? '#ffe9a8' : warm < 0.55 ? '#ffbf4a' : warm < 0.85 ? '#ffa030' : '#ff7a24').multiplyScalar((o.glow ?? 1.0) * (0.75 + rnd() * 0.5)); im.setColorAt(k, c); k++;
  }
  im.count = k; J.add(im);
  // inner glow core
  const core = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.7, R * 0.7, H * 0.8 * fill, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(o.coreK ?? 0.2), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  core.position.y = H * 0.4 * fill; J.add(core);
  // lid
  const lid = mesh(new THREE.CylinderGeometry(R * 0.8, R * 0.8, H * 0.1, 32), toon('#7a4a2a', { steps: [0.55, 1.0] }), 0.03, J); lid.position.y = H + H * 0.04;
  // label
  if (o.label !== false) {
    const lt = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#f2e6cc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a2410'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = '#3a2410'; g.textAlign = 'center'; g.font = `700 ${o.labelSize || 110}px Archivo`; g.fillText(o.label || '30,000', w / 2, h * 0.62);
      g.font = '500 34px Archivo'; g.fillText(o.sub || 'DAYS', w / 2, h * 0.88);
    });
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 1.01, H * 0.26, 32, 1, true, -0.7, 1.4), new THREE.MeshBasicMaterial({ map: lt, color: new THREE.Color(o.labelK ?? 0.9, (o.labelK ?? 0.9) * 0.92, (o.labelK ?? 0.9) * 0.8) }));
    lt.colorSpace = THREE.SRGBColorSpace;
    lab.position.y = H * 0.42; J.add(lab);
  }
  if (o.light !== false) { const L = new THREE.PointLight(0xffb84a, o.lightI ?? 40, o.lightD ?? 30, 1.6); L.position.y = H * 0.5; J.add(L); }
  J.userData.H = H;
  return J;
}

// --- a phone with a lit canvas screen ---
export function phone(parent, draw, o = {}) {
  const P = new THREE.Group(); parent.add(P);
  const W = o.w || 0.7, H = o.h || 1.4;
  mesh(new THREE.BoxGeometry(W, H, 0.08), toon('#1c1c26', { steps: [0.6, 1.0] }), 0.012, P);
  const res = o.res || 2;
  const tex = canvasTex(360 * res, 720 * res, draw || ((g, w, h) => { g.fillStyle = '#1a2a50'; g.fillRect(0, 0, w, h); }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.92, H * 0.94), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1, 1, 1).multiplyScalar(o.bright ?? 0.95) }));
  scr.position.z = 0.042; P.add(scr);
  if (o.light !== false) { const L = new THREE.PointLight(o.lightColor ?? 0x7fb0ff, o.lightI ?? 6, o.lightD ?? 8, 1.5); L.position.z = o.lightZ ?? 0.6; P.add(L); }
  return P;
}

// --- a LATER box ---
const boxTex = {};
export function laterBox(parent, s = 1, o = {}) {
  const key = o.text || 'LATER';
  if (!boxTex[key]) boxTex[key] = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c99a62'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(90,50,20,0.25)'; g.fillRect(0, h * 0.42, w, h * 0.16);
    g.fillStyle = '#3a2410'; g.textAlign = 'center'; g.font = `800 ${key.length > 6 ? 46 : 62}px Archivo`; g.fillText(key, w / 2, h * 0.66);
  });
  const side = toon('#b8874f', { steps: [0.55, 0.8, 1.0] }), front = toon('#ffffff', { map: boxTex[key], steps: [0.55, 0.8, 1.0] });
  const b = mesh(new THREE.BoxGeometry(s, s * 0.8, s * 0.8), [side, side, side, side, front, side], 0.03, parent);
  const tape = mesh(new THREE.BoxGeometry(s * 0.2, s * 0.02, s * 0.82), toon('#e2c08a', { steps: [0.6, 1.0] }), null, b); tape.position.y = s * 0.4;
  return b;
}

// --- room pieces ---
export function box(parent, size, pos, color, th = 0.03, o = {}) {
  const m = mesh(new THREE.BoxGeometry(...size), toon(color, { steps: o.steps || [0.55, 0.8, 1.0], rim: o.rim ?? 0x000000, rimStrength: o.rimK ?? 0 }), th, parent);
  m.position.set(...pos); if (o.rot) m.rotation.set(...o.rot);
  return m;
}

export function bed(parent, o = {}) {
  const B = new THREE.Group(); parent.add(B);
  box(B, [7, 1.2, 11], [0, 0.6, 0], o.frame || '#5a3a2a');
  box(B, [6.8, 0.9, 10.8], [0, 1.6, 0], '#e8e2d8');
  const blanket = box(B, [7.0, 0.5, 6.6], [0, 2.2, 1.9], o.blanket || '#4a5a8a'); blanket.rotation.x = 0.0;
  const pillow = mesh(new THREE.CapsuleGeometry(0.8, 2.6, 6, 14), toon('#f2ece2', { steps: [0.6, 0.85, 1.0] }), 0.03, B); pillow.rotation.z = Math.PI / 2; pillow.scale.set(1, 1, 0.45); pillow.position.set(0, 2.45, -4.0);
  box(B, [7.2, 3.2, 0.5], [0, 2.2, -5.55], o.frame || '#5a3a2a');
  return B;
}

export function windowFrame(parent, w, h, pos, color = '#e8dcc8') {
  const F = new THREE.Group(); parent.add(F); F.position.set(...pos);
  const t = 0.35;
  box(F, [w + t * 2, t, 0.5], [0, h / 2 + t / 2, 0], color); box(F, [w + t * 2, t * 1.4, 0.9], [0, -h / 2 - t * 0.7, 0.2], color);
  box(F, [t, h, 0.5], [-w / 2 - t / 2, 0, 0], color); box(F, [t, h, 0.5], [w / 2 + t / 2, 0, 0], color);
  box(F, [t * 0.5, h, 0.3], [0, 0, 0], color); box(F, [w, t * 0.5, 0.3], [0, 0, 0], color);
  return F;
}

// a wall with a rectangular hole for the window
export function wallWithWindow(parent, W, H, hole, color, z = 0) {
  const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.lineTo(-W / 2, 0);
  const [hx, hy, hw, hh] = hole; const p = new THREE.Path(); p.moveTo(hx - hw / 2, hy - hh / 2); p.lineTo(hx + hw / 2, hy - hh / 2); p.lineTo(hx + hw / 2, hy + hh / 2); p.lineTo(hx - hw / 2, hy + hh / 2); p.lineTo(hx - hw / 2, hy - hh / 2);
  s.holes.push(p);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), toon(color, { steps: [0.55, 0.8, 1.0], rimStrength: 0 }));
  m.position.z = z; parent.add(m);
  return m;
}

// --- a city of toon blocks with lit windows ---
export function city(parent, o = {}) {
  const C = new THREE.Group(); parent.add(C);
  reseed(o.seed || 9);
  const winTex = (lit) => canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = o.wall || '#1a2040'; g.fillRect(0, 0, w, h);
    for (let y = 10; y < h - 10; y += 22) for (let x = 10; x < w - 10; x += 26) {
      const on = rnd() < lit; g.fillStyle = on ? (rnd() < 0.7 ? '#ffd27a' : '#bfe0ff') : 'rgba(0,0,0,0.25)'; g.fillRect(x, y, 14, 12);
    }
  });
  const mats = [0, 1, 2, 3].map(() => new THREE.MeshBasicMaterial({ map: winTex(o.lit ?? 0.35), toneMapped: false, color: new THREE.Color(1, 1, 1).multiplyScalar(o.bright ?? 1.0) }));
  const top = new THREE.MeshBasicMaterial({ color: o.roof || '#121630' });
  for (let i = 0; i < (o.n || 60); i++) {
    const w = 4 + rnd() * 8, h = 6 + Math.pow(rnd(), 2) * (o.maxH || 40), d = 4 + rnd() * 6;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [mats[i % 4], mats[(i + 1) % 4], top, top, mats[(i + 2) % 4], mats[(i + 3) % 4]]);
    m.position.set((rnd() - 0.5) * (o.spread || 200), h / 2 + (o.y || 0), -(o.near || 30) - rnd() * (o.depth || 120));
    C.add(m);
  }
  return C;
}

// --- guitar ---
export function guitar(parent) {
  const G = new THREE.Group(); parent.add(G);
  const wood = toon('#c87a3a', { steps: [0.55, 0.8, 1.0] }), dark = toon('#4a2a1a', { steps: [0.55, 1.0] });
  const b1 = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.5, 32), wood, 0.03, G); b1.rotation.x = Math.PI / 2; b1.position.y = -0.6;
  const b2 = mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.5, 32), wood, 0.03, G); b2.rotation.x = Math.PI / 2; b2.position.y = 0.55;
  const hole = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.52, 24), dark, null, G); hole.rotation.x = Math.PI / 2; hole.position.y = 0.05;
  const neck = mesh(new THREE.BoxGeometry(0.24, 2.6, 0.16), dark, 0.02, G); neck.position.set(0, 2.2, 0.1);
  const head = mesh(new THREE.BoxGeometry(0.34, 0.6, 0.14), dark, 0.02, G); head.position.set(0, 3.7, 0.08);
  return G;
}

// an anime "kira" sparkle sprite (4-point star)
export function sparkle(parent, pos, s = 0.5, color = '#fff2c0', k = 2.5) {
  const t = canvasTex(128, 128, (g) => {
    g.translate(64, 64); g.fillStyle = '#fff';
    g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 9 : 62; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, color: new THREE.Color(color).multiplyScalar(k), toneMapped: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.position.set(...pos); sp.scale.setScalar(s); parent.add(sp);
  return sp;
}
