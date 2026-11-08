// Moving things, rebuilt every frame from fixed seeds so their paint never boils:
// the girl, the boy, paper planes, the pile of failed planes, rain, flight trails.
import { Strokes, KNIFE, DAB, hex, hash, mixc } from './impasto.js';

export const COL = {
  plane: hex('#f07a2a'), plane2: hex('#ffb070'), planeShade: hex('#c8551c'),
  blue: hex('#2f6fd0'), blue2: hex('#7fb0ff'), blueShade: hex('#1f4a98'),
  coat: hex('#2f6a5e'), coat2: hex('#4a8c7c'), hair: hex('#2a1a12'), skin: hex('#e9b894'), legs: hex('#262a3c'), shoe: hex('#5a2a1c'),
  scarf: hex('#e0b040'), scarf2: hex('#f4d070'),
  bcoat: hex('#2c3a66'), bhair: hex('#20160f'), bpants: hex('#4a3a2a'),
};
const FLAGS = (exempt, gloss = 0.12) => (exempt ? 128 : 0) + Math.round(gloss * 127);

// a figure builder: parts are capsules painted as an underpaint polygon plus a few knife strokes along the bone
export class Painter {
  constructor() { this.ops = []; this.s = new Strokes(64); this.tris = []; }
  _fill() { const o = this.ops[this.ops.length - 1]; if (o && o.k === 'f') return o.d; const d = []; this.ops.push({ k: 'f', d }); return d; }
  _str() { const o = this.ops[this.ops.length - 1]; if (o && o.k === 's') return o.d; const d = new Strokes(64); this.ops.push({ k: 's', d }); return d; }
  poly(pts, c, exempt = false) {   // convex-ish polygon as a fan
    const f = FLAGS(exempt), T = this._fill();
    for (let i = 1; i < pts.length - 1; i++) for (const p of [pts[0], pts[i], pts[i + 1]]) T.push(p[0], p[1], c[0], c[1], c[2], f / 255);
  }
  flush(E, t, cam) { for (const o of this.ops) { if (o.k === 'f') E.fill(t, o.d, { cam }); else E.draw(t, o.d.data(), { cam }); } this.ops = []; }
  capsule(a, b, ra, rb, c, c2, seed, o = {}) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, ang = Math.atan2(dy, dx);
    const pts = [];
    for (let k = 0; k <= 8; k++) { const t = Math.PI / 2 + k / 8 * Math.PI; pts.push([a[0] + Math.cos(ang + t) * ra, a[1] + Math.sin(ang + t) * ra]); }
    for (let k = 0; k <= 8; k++) { const t = -Math.PI / 2 + k / 8 * Math.PI; pts.push([b[0] + Math.cos(ang + t) * rb, b[1] + Math.sin(ang + t) * rb]); }
    this.poly(pts, mixc(c, [0, 0, 0], 0.06), o.exempt);
    const n = o.n ?? Math.max(1, Math.round(L / ((ra + rb) * 0.9)));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, r = ra + (rb - ra) * t;
      const side = n > 1 ? 0 : 0;
      this._str().push({ x: a[0] + dx * t + nx * side, y: a[1] + dy * t + ny * side, ang: ang + (hash(seed + k) - 0.5) * 0.25, len: Math.max(L / n * 1.5, r * 1.6), wid: r * 1.55, c, c2,
        seed: seed + k, run: 0.05, taper: 0.12, exempt: o.exempt, h: 0.55 });
      if (r > 7) this._str().push({ x: a[0] + dx * t + nx * r * 0.45, y: a[1] + dy * t + ny * r * 0.45, ang: ang + 0.08, len: Math.max(L / n * 1.2, r * 1.3), wid: r * 0.7, c: mixc(c, c2, 0.6), c2: c2, seed: seed + 50 + k, run: 0.1, exempt: o.exempt, h: 0.6 });
    }
  }
  disc(p, r, c, c2, seed, o = {}) {
    const pts = []; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; pts.push([p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r * (o.sy || 1)]); }
    this.poly(pts, c, o.exempt);
    this._str().push({ x: p[0] - r * 0.1, y: p[1] + r * 0.05, ang: (o.ang ?? -0.4), len: r * 1.6, wid: r * 1.45, c, c2, seed, run: 0.03, exempt: o.exempt, type: KNIFE, h: 0.55 });
    this._str().push({ x: p[0] + r * 0.28, y: p[1] - r * 0.28, ang: (o.ang ?? -0.4) + 0.3, len: r * 0.9, wid: r * 0.7, c: c2, c2: c, seed: seed + 1, run: 0.05, exempt: o.exempt, h: 0.6 });
  }
  dab(p, r, c, seed, o = {}) { this._str().push({ x: p[0], y: p[1], ang: o.ang || 0, len: r * 2, wid: r * 2, c, c2: o.c2 || c, seed, type: DAB, exempt: o.exempt, h: o.h ?? 1.2, gloss: o.gloss ?? 0.15 }); }
  knife(o) { this._str().push(o); }
}

const R2 = (p, a, l) => [p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l];
// 2-bone IK in 2D: shoulder s, target t, lengths a b, bend sign
function ik(s, t, a, b, bend = 1) {
  const dx = t[0] - s[0], dy = t[1] - s[1]; let d = Math.hypot(dx, dy); d = Math.min(d, a + b - 0.01);
  const base = Math.atan2(dy, dx), cosA = (a * a + d * d - b * b) / (2 * a * d);
  const A = base - bend * Math.acos(Math.max(-1, Math.min(1, cosA)));
  const e = R2(s, A, a); return [e, R2(e, Math.atan2(t[1] - e[1], t[0] - e[0]), b)];
}

// The girl. p: feet position (plate px). o: { scale, face (-1 left, 1 right, 0 front), lean, arm targets, legs phase, scarf wind }
export function girl(P, p, o = {}) {
  const k = o.scale || 1, back = o.face === 2, f = back ? 0 : (o.face ?? 1), sd = o.seed || 1000, C = o.col || COL;
  o = { ...o, back };
  const lean = o.lean || 0;
  const hip = [p[0] + lean * 20 * k, p[1] - (o.sit ? 16 : 62) * k + (o.bob || 0) * k], neck = [hip[0] + lean * 34 * k, hip[1] - 66 * k], head = [neck[0] + lean * 8 * k, neck[1] - 26 * k];
  // legs
  const step = o.step || 0;
  const fl = [p[0] - 9 * k + step * 16 * k, p[1]], fr = [p[0] + 9 * k - step * 16 * k, p[1]];
  if (o.sit) { const fs = f === 0 ? 1 : f; fl[0] = hip[0] - 14 * k + (f === 0 ? 0 : 30 * k * fs); fl[1] = hip[1] + 40 * k; fr[0] = hip[0] + 14 * k + (f === 0 ? 0 : 26 * k * fs); fr[1] = hip[1] + 44 * k; }
  P.capsule([hip[0] - 7 * k, hip[1]], fl, 6.5 * k, 5 * k, C.legs, mixc(C.legs, [1, 1, 1], 0.15), sd + 1);
  P.capsule([hip[0] + 7 * k, hip[1]], fr, 6.5 * k, 5 * k, C.legs, mixc(C.legs, [1, 1, 1], 0.15), sd + 3);
  P.disc([fl[0] + 5 * k * f, fl[1] - 2 * k], 7 * k, C.shoe, mixc(C.shoe, [1, 1, 1], 0.2), sd + 5, { sy: 0.6 });
  P.disc([fr[0] + 5 * k * f, fr[1] - 2 * k], 7 * k, C.shoe, mixc(C.shoe, [1, 1, 1], 0.2), sd + 7, { sy: 0.6 });
  // back arm
  const sh = [neck[0] - 2 * k * f, neck[1] + 10 * k];
  const backT = o.backHand || [sh[0] - 14 * k * f, sh[1] + 48 * k];
  const [be, bh] = ik([sh[0] - 6 * k * f, sh[1]], backT, 26 * k, 25 * k, -f);
  P.capsule([sh[0] - 6 * k * f, sh[1]], be, 7 * k, 6 * k, mixc(C.coat, [0, 0, 0], 0.18), C.coat, sd + 9);
  P.capsule(be, bh, 6 * k, 5 * k, mixc(C.coat, [0, 0, 0], 0.18), C.coat, sd + 11);
  P.disc(bh, 5 * k, C.skin, C.skin, sd + 13);
  // coat: a trapezoid from shoulders to knees
  const coat = [[neck[0] - 18 * k, neck[1] + 4 * k], [neck[0] + 18 * k, neck[1] + 4 * k], [hip[0] + 30 * k, hip[1] + 26 * k], [hip[0] - 30 * k, hip[1] + 26 * k]];
  P.poly(coat, mixc(C.coat, [0, 0, 0], 0.05));
  for (let i = 0; i < 4; i++) {
    const t = (i + 0.5) / 4, cx = neck[0] + (hip[0] - neck[0]) * (t * 1.25), cy = neck[1] + 10 * k + t * 74 * k;
    P.knife({ x: cx + (i % 2 ? 6 : -6) * k, y: cy, ang: Math.PI / 2 + lean * 0.4 + (hash(sd + 20 + i) - 0.5) * 0.3, len: 30 * k, wid: (28 + t * 22) * k, c: C.coat, c2: C.coat2, seed: sd + 20 + i, run: 0.06, taper: 0.1, h: 0.6 });
  }
  P.knife({ x: neck[0] + 9 * k * f, y: neck[1] + 40 * k, ang: Math.PI / 2, len: 54 * k, wid: 10 * k, c: C.coat2, c2: C.coat, seed: sd + 30, run: 0.1, h: 0.65 });
  // scarf: around the neck and a tail that streams in the wind
  const wind = o.wind ?? 0.4, wt = o.t || 0;
  P.capsule([neck[0] - 12 * k, neck[1] + 2 * k], [neck[0] + 12 * k, neck[1] + 4 * k], 6 * k, 6 * k, C.scarf, C.scarf2, sd + 32, { n: 2 });
  let q = [neck[0] - 8 * k * f, neck[1] + 4 * k];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * (f > 0 ? 1 : 0) + (f > 0 ? -1 : 1) * (0.35 - wind * 0.3) + Math.sin(wt * 6 + i * 1.1) * 0.18 * wind + (1 - wind) * 1.0 * (f > 0 ? -1 : 1);
    const q2 = R2(q, a + (f > 0 ? 0 : 0), 13 * k);
    P.capsule(q, q2, 4.5 * k - i * 0.6 * k, 4 * k - i * 0.6 * k, C.scarf, C.scarf2, sd + 34 + i * 2, { n: 1 });
    q = q2;
  }
  // head and hair (a bob with a fringe), front (f = 0) or side (f = +-1)
  head_(P, head, k, f, C, sd, o);
  // front arm (the throwing arm)
  const fsh = [neck[0] + 4 * k * f, neck[1] + 10 * k];
  const frontT = o.hand || [fsh[0] + 10 * k * f, fsh[1] + 48 * k];
  const [fe, fh] = ik(fsh, frontT, 26 * k, 25 * k, f);
  P.capsule(fsh, fe, 7 * k, 6 * k, C.coat, C.coat2, sd + 70);
  P.capsule(fe, fh, 6 * k, 5 * k, C.coat, C.coat2, sd + 72);
  P.disc(fh, 5.5 * k, C.skin, C.skin, sd + 74);
  return { hand: fh, head, neck, hip };
}

function head_(P, head, k, f, C, sd, o) {
  const hr = 22 * k, hc = mixc(C.hair, [1, 1, 1], 0.22);
  if (o.back) {   // seen from behind: the bob covers the head
    for (const sx of [-1, 1]) P.capsule([head[0] + sx * hr * 0.84, head[1] - hr * 0.1], [head[0] + sx * hr * 0.8, head[1] + hr * 0.8], hr * 0.34, hr * 0.3, C.hair, hc, sd + 80 + sx, { n: 1 });
    P.disc([head[0], head[1] + hr * 0.02], hr * 1.02, C.hair, hc, sd + 84, { ang: Math.PI / 2 });
    for (let i = 0; i < 5; i++) { const a = Math.PI * (0.15 + i * 0.175) + Math.PI; P.knife({ x: head[0] + Math.cos(a) * hr * 0.5, y: head[1] + hr * 0.1 + Math.sin(a) * hr * 0.5, ang: Math.PI / 2 + (i - 2) * 0.18, len: hr * 1.1, wid: hr * 0.4, c: C.hair, c2: hc, seed: sd + 86 + i, run: 0.05, h: 0.65 }); }
    return;
  }
  // hair behind the head
  if (f === 0) for (const sx of [-1, 1]) P.capsule([head[0] + sx * hr * 0.86, head[1] - hr * 0.2], [head[0] + sx * hr * 0.84, head[1] + hr * 0.78], hr * 0.32, hr * 0.3, C.hair, hc, sd + 80 + sx, { n: 1 });
  else { const b = [head[0] - f * hr * 0.32, head[1] + hr * 0.08]; const pts = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; pts.push([b[0] + Math.cos(a) * hr * 0.86, b[1] + Math.sin(a) * hr * 1.02]); } P.poly(pts, C.hair);
    P.knife({ x: b[0] - f * hr * 0.2, y: b[1] + hr * 0.3, ang: Math.PI / 2 + f * 0.2, len: hr * 1.2, wid: hr * 0.9, c: C.hair, c2: hc, seed: sd + 82, run: 0.05, h: 0.6 }); }
  // face
  const skin = C.skin, skin2 = mixc(C.skin, [1, 0.92, 0.88], 0.35);
  P.disc([head[0] + f * hr * 0.06, head[1] + hr * 0.04], hr * 0.92, skin, skin2, sd + 84, { ang: -0.3 });
  // the cap and the fringe
  const cap = [], cy = head[1] - hr * 0.12, cx = head[0] - f * hr * 0.14;
  const a0 = f === 0 ? Math.PI * 1.0 : (f > 0 ? Math.PI * 0.9 : Math.PI * 1.08), a1 = f === 0 ? Math.PI * 2.0 : (f > 0 ? Math.PI * 1.92 : Math.PI * 2.1);
  for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; cap.push([cx + Math.cos(a) * hr * 1.06, cy + Math.sin(a) * hr * 1.0]); }
  if (f === 0) { cap.push([cx + hr * 0.95, cy + hr * 0.05], [cx + hr * 0.4, cy - hr * 0.08], [cx - hr * 0.4, cy - hr * 0.08], [cx - hr * 0.95, cy + hr * 0.05]); }
  else { cap.push([cx + f * hr * 0.75, cy - hr * 0.02], [cx + f * hr * 0.2, cy - hr * 0.12], [cx - f * hr * 0.9, cy + hr * 0.5]); }
  P.poly(cap, C.hair);
  for (let i = 0; i < 4; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / 4; P.knife({ x: cx + Math.cos(a) * hr * 0.62, y: cy + Math.sin(a) * hr * 0.55, ang: a + Math.PI / 2, len: hr * 0.9, wid: hr * 0.45, c: C.hair, c2: hc, seed: sd + 86 + i, run: 0.05, h: 0.65 }); }
  // features
  if (o.eyes === false) return;
  const ink = [0.1, 0.07, 0.06], mood = o.mood || (o.smile ? 'happy' : 'neutral');
  const ly = -(o.lookUp || 0) * hr * 0.16, lx = (o.lookX || 0) * hr * 0.12;
  const eyes = f === 0 ? [[head[0] - hr * 0.36 + lx, head[1] + hr * 0.12 + ly], [head[0] + hr * 0.36 + lx, head[1] + hr * 0.12 + ly]] : [[head[0] + f * hr * 0.5 + lx, head[1] + hr * 0.12 + ly]];
  eyes.forEach((e, i) => {
    if (o.eyesShut || mood === 'happy') P.knife({ x: e[0], y: e[1] + hr * 0.02, ang: 0, len: hr * 0.3, wid: hr * 0.08, c: ink, seed: sd + 90 + i, run: 0, h: 0.7 });
    else P.dab(e, hr * (mood === 'surprised' ? 0.14 : 0.11), ink, sd + 90 + i, { h: 0.7 });
    const bt = mood === 'sad' ? 0.35 : mood === 'determined' ? -0.35 : 0;
    const bs = f === 0 ? (i === 0 ? 1 : -1) : -f;
    P.knife({ x: e[0], y: e[1] - hr * (mood === 'surprised' ? 0.36 : 0.28), ang: bt * bs, len: hr * 0.34, wid: hr * 0.07, c: mixc(C.hair, [0, 0, 0], 0.2), seed: sd + 94 + i, run: 0, h: 0.7 });
  });
  const mx = head[0] + f * hr * 0.42, my = head[1] + hr * 0.5;
  if (mood === 'happy') { for (let k2 = 0; k2 < 3; k2++) P.knife({ x: mx + (k2 - 1) * hr * 0.1, y: my + (k2 === 1 ? hr * 0.04 : 0), ang: (k2 - 1) * -0.5, len: hr * 0.16, wid: hr * 0.07, c: [0.45, 0.15, 0.12], seed: sd + 97 + k2, run: 0, h: 0.7 }); }
  else if (mood === 'surprised') P.dab([mx, my], hr * 0.09, [0.35, 0.12, 0.1], sd + 97);
  else P.knife({ x: mx, y: my, ang: mood === 'sad' ? 0.12 * (f || 1) : 0, len: hr * 0.22, wid: hr * 0.06, c: [0.45, 0.15, 0.12], seed: sd + 97, run: 0, h: 0.7 });
  for (const e of eyes) P.dab([e[0] + (f === 0 ? Math.sign(e[0] - head[0]) * hr * 0.1 : f * hr * 0.05), e[1] + hr * 0.28], hr * 0.12, [0.93, 0.62, 0.56], sd + 99, { h: 0.55 });
}

// The boy on the other side: same build, different colours and hair
export function boy(P, p, o = {}) {
  return girl(P, p, { ...o, col: { ...COL, coat: COL.bcoat, coat2: hex('#6a8ad0'), hair: COL.bhair, legs: COL.bpants, scarf: hex('#c8b070'), scarf2: hex('#e8d090') }, seed: (o.seed || 5000) });
}

// a paper plane: a dart of three knife planes; ang = heading, bank = roll (0..1 flattens)
export function plane(P, p, ang, o = {}) {
  const k = o.scale || 1, sd = o.seed || 7000, ex = o.exempt ?? true;
  const c = o.blue ? COL.blue : COL.plane, c2 = o.blue ? COL.blue2 : COL.plane2, cs = o.blue ? COL.blueShade : COL.planeShade;
  const ca = Math.cos(ang), sa = Math.sin(ang), bank = o.bank ?? 0.6;
  const T = (u, v) => [p[0] + ca * u - sa * v, p[1] + sa * u + ca * v];
  const nose = T(26 * k, 0), tl = T(-20 * k, -16 * k * bank), tr = T(-20 * k, 14 * k * bank), tail = T(-16 * k, 0), keel = T(-16 * k, 7 * k);
  P.poly([nose, tl, tail], c, ex); P.poly([nose, tail, tr], cs, ex); P.poly([nose, tail, keel], mixc(cs, [0, 0, 0], 0.2), ex);
  P.knife({ x: (nose[0] + tl[0] + tail[0]) / 3, y: (nose[1] + tl[1] + tail[1]) / 3, ang: ang - 0.25 * bank, len: 30 * k, wid: 10 * k * (0.4 + bank), c: c2, c2: c, seed: sd, run: 0.05, exempt: ex, h: 1.2, gloss: 0.3 });
  P.knife({ x: (nose[0] + tr[0] + tail[0]) / 3, y: (nose[1] + tr[1] + tail[1]) / 3, ang: ang + 0.25 * bank, len: 28 * k, wid: 8 * k * (0.4 + bank), c: cs, c2: c, seed: sd + 1, run: 0.05, exempt: ex, h: 1.15 });
}
// a crumpled failed plane on the pile
export function crumple(P, p, k, sd, blue = false) {
  const c = blue ? COL.blue : COL.plane, c2 = blue ? COL.blue2 : COL.plane2, cs = blue ? COL.blueShade : COL.planeShade;
  const a = hash(sd) * Math.PI * 2;
  const pts = []; for (let i = 0; i < 6; i++) { const t = a + i / 6 * Math.PI * 2; const r = (8 + hash(sd + i) * 7) * k; pts.push([p[0] + Math.cos(t) * r, p[1] + Math.sin(t) * r * 0.75]); }
  P.poly(pts, hash(sd + 9) < 0.5 ? c : cs, true);
  P.knife({ x: p[0], y: p[1] - 2 * k, ang: a, len: 16 * k, wid: 9 * k, c: hash(sd + 7) < 0.5 ? c2 : c, c2: cs, seed: sd + 3, run: 0.1, exempt: true, h: 1.25 });
  if (hash(sd + 11) < 0.6) P.knife({ x: p[0] + 4 * k, y: p[1] + 2 * k, ang: a + 1.2, len: 11 * k, wid: 6 * k, c: cs, c2: c, seed: sd + 5, run: 0.1, exempt: true, h: 1.2 });
}
// the pile at the foot of the wall: n planes in a mound centred at base (x, groundY)
export function pile(P, base, n, o = {}) {
  const k = o.scale || 1, sd = o.seed || 9000, spread = o.spread || 1;
  for (let i = 0; i < n; i++) {
    const u = hash(sd + i * 3.1), v = hash(sd + i * 5.7);
    const H = Math.sqrt(n) * 7.5 * k;                          // mound height grows with the count
    const x = (u - 0.5) * 2 * Math.sqrt(n) * 13 * k * spread;
    const h = H * Math.max(0, 1 - Math.pow(Math.abs(x) / (Math.sqrt(n) * 13 * k * spread + 1e-6), 1.6)) * (0.35 + 0.65 * v);
    crumple(P, [base[0] + x, base[1] - h - 4 * k], k * (0.85 + hash(sd + i) * 0.3), sd + i * 13, o.blue);
  }
}
// rain: short slanted strokes falling (fixed per-drop seeds; positions advance with time)
export function rain(P, t, box, n, o = {}) {
  const sp = o.speed || 1400, ang = o.ang ?? 1.75, c = o.c || [0.78, 0.82, 0.88];
  for (let i = 0; i < n; i++) {
    const x0 = box[0] + hash(i * 1.7) * (box[2] - box[0]), ph = hash(i * 2.9);
    const yy = ((ph + t * sp / (box[3] - box[1])) % 1) * (box[3] - box[1]) + box[1];
    P.knife({ x: x0 + (yy - box[1]) * Math.cos(ang) * 0.3, y: yy, ang, len: 22 + hash(i) * 14, wid: 2.2, c, c2: c, seed: 50000 + i, run: 0.3, alpha: 0.85, h: 0.7, gloss: 0.6 });
  }
}
// a flight trail: the path paints itself as knife dabs behind the plane
export function trail(P, path, t0, t1, o = {}) {
  const c = o.blue ? COL.blue : COL.plane, c2 = o.blue ? COL.blue2 : COL.plane2;
  const n = o.n || 40;
  for (let i = 0; i < n; i++) {
    const u = t0 + (t1 - t0) * (i / n);
    const p = path(u), p2 = path(u + 0.002);
    const a = Math.atan2(p2[1] - p[1], p2[0] - p[0]);
    const age = (t1 - u) / Math.max(1e-6, t1 - t0);
    if (age > (o.fade ?? 1.01)) continue;
    P.knife({ x: p[0], y: p[1], ang: a, len: (o.len || 24), wid: (o.wid || 7) * (1 - age * 0.6), c, c2, seed: 60000 + Math.round(u * 1000) + (o.blue ? 5000 : 0), run: 0.5 + age * 0.4, exempt: true, alpha: Math.max(0.2, 1 - age * (o.fadeK ?? 0.8)), h: 0.9 });
  }
}

// the kids who laugh at her
export const KIDS = [
  { coat: hex('#8a3a3a'), coat2: hex('#b05a50'), hair: hex('#d8b070'), legs: hex('#3a3a4a'), scarf: hex('#3a6aa0'), scarf2: hex('#5a8ac0') },
  { coat: hex('#5a5a7a'), coat2: hex('#7a7aa0'), hair: hex('#2a1a12'), legs: hex('#2a2a2a'), scarf: hex('#c8a040'), scarf2: hex('#e0c060') },
  { coat: hex('#3a6a3a'), coat2: hex('#5a8a5a'), hair: hex('#6a3a1a'), legs: hex('#3a2a2a'), scarf: hex('#a04a6a'), scarf2: hex('#c06a8a') },
];
export function kids(P, base, t, o = {}) {
  const k = o.scale || 1.25;
  KIDS.forEach((c, i) => {
    const x = base[0] + i * 120 * k, laugh = Math.abs(Math.sin(t * 9 + i * 1.3));
    const col = { ...COL, ...c };
    const point = i === 0 && o.point !== false;
    girl(P, [x, base[1] + (i % 2) * 14], { scale: k * (0.95 + i * 0.04), face: 0, mood: 'happy', col, seed: 20000 + i * 400, bob: -laugh * 4, wind: 0.3, t,
      hand: point ? [x - 70 * k, base[1] - 150 * k] : [x + 18 * k, base[1] - 70 * k - laugh * 8], backHand: [x - 22 * k, base[1] - 66 * k - laugh * 8] });
    if (o.umbrella) {   // umbrellas in the rain
      const ux = x, uy = base[1] - 210 * k;
      const pts = []; for (let a = 0; a <= 12; a++) { const th = Math.PI + a / 12 * Math.PI; pts.push([ux + Math.cos(th) * 70 * k, uy + Math.sin(th) * 36 * k]); }
      P.poly(pts, [[0.3, 0.3, 0.4], [0.5, 0.2, 0.2], [0.2, 0.35, 0.3]][i]);
      P.knife({ x: ux, y: uy - 18 * k, ang: 0, len: 120 * k, wid: 22 * k, c: [[0.4, 0.4, 0.5], [0.6, 0.3, 0.3], [0.3, 0.45, 0.4]][i], c2: [[0.3, 0.3, 0.4], [0.5, 0.2, 0.2], [0.2, 0.35, 0.3]][i], seed: 21000 + i, run: 0.1, h: 0.7, gloss: 0.6 });
      P.capsule([ux, uy], [ux, uy + 90 * k], 2 * k, 2 * k, [0.15, 0.15, 0.15], [0.3, 0.3, 0.3], 21100 + i, { n: 1 });
    }
  });
}
