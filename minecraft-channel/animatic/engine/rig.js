// Box-rig builder and face drawing. Units: 1 px = 1/16 block, times the rig scale.
import * as THREE from 'three';
import { canvas, texFromCanvas, noisy, rng, hashStr, shade } from './textures.js';

// Face order used by THREE.BoxGeometry material arrays.
const FACES = ['xp', 'xn', 'top', 'bottom', 'front', 'back'];

function faceDims(face, [w, h, d]) {
  if (face === 'xp' || face === 'xn') return [d, h];
  if (face === 'top' || face === 'bottom') return [w, d];
  return [w, h];
}

// paint: string colour | fn(g,w,h,R,face) | {front:..., all:...}
function painterFor(paint, face) {
  if (paint == null) return '#ff00ff';
  if (typeof paint === 'string' || typeof paint === 'function') return paint;
  return paint[face] ?? paint.sides ?? paint.all ?? '#ff00ff';
}

function makeFaceCanvas(p, w, h, seed, face) {
  const cw = Math.max(1, Math.ceil(w)), ch = Math.max(1, Math.ceil(h));
  return canvas(cw, ch, (g) => {
    const R = rng(seed);
    if (typeof p === 'string') noisy(g, 0, 0, cw, ch, p, 0.06, R);
    else p(g, cw, ch, R, face);
  });
}

export function buildRig(spec) {
  const S = (spec.scale ?? 1) / 16;
  const root = new THREE.Group();
  root.name = spec.id;
  const parts = { root };
  const meshes = [];
  let faceMat = null;
  for (const p of spec.parts) {
    const grp = new THREE.Group();
    grp.name = p.name;
    const pv = p.pivot ?? [0, 0, 0];
    grp.position.set(pv[0] * S, pv[1] * S, pv[2] * S);
    if (p.rest) grp.rotation.set(p.rest[0], p.rest[1], p.rest[2]);
    grp.userData.rest = p.rest ?? [0, 0, 0];
    grp.userData.base = grp.position.clone();
    (parts[p.parent ?? 'root']).add(grp);
    parts[p.name] = grp;
    if (p.size) {
      const [w, h, d] = p.size;
      const geo = new THREE.BoxGeometry(w * S, h * S, d * S);
      const mats = FACES.map((f) => {
        const [fw, fh] = faceDims(f, p.size);
        const pt = painterFor(p.paint, f);
        const c = makeFaceCanvas(pt, fw, fh, hashStr(spec.id + p.name + f), f);
        return new THREE.MeshLambertMaterial({ map: texFromCanvas(c), transparent: !!p.alpha, alphaTest: p.alpha ? 0.5 : 0 });
      });
      const m = new THREE.Mesh(geo, mats);
      const o = p.off ?? [0, 0, 0];
      m.position.set(o[0] * S, o[1] * S, o[2] * S);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
      meshes.push(m);
      grp.userData.mesh = m;
      if (p.face) faceMat = mats[4];
    }
  }
  // anchors: name-tag point, and hand points for props
  const rig = { spec, root, parts, meshes, faceMat, S, faceCache: new Map(), lastFace: '' };
  rig.setFace = (expr, open) => setFace(rig, expr, open);
  if (spec.face) rig.setFace('neutral', false);
  return rig;
}

// ---------------- faces ----------------
// F: {w,h, base(g,R), eyeY, L, R, white, pupil, brow, lid, mouth:{y,x,w,c}|null, tear}
export function drawFace(g, F, expr, open) {
  const R = rng(7);
  F.base(g, R);
  const P = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const y = F.eyeY, L = F.L, Rx = F.R;
  const W = F.white, K = F.pupil, B = F.brow, LID = F.lid ?? F.brow;
  const tear = '#7fd3ff';
  const eyes = {
    neutral() { P(L, y, W); P(L + 1, y, K); P(Rx, y, K); P(Rx + 1, y, W); },
    side() { P(L, y, W); P(L + 1, y, K); P(Rx, y, W); P(Rx + 1, y, K); P(L, y - 1, LID); P(L + 1, y - 1, LID); P(Rx, y - 1, LID); P(Rx + 1, y - 1, LID); },
    happy() { P(L, y, K); P(L + 1, y - 1, K); P(Rx, y - 1, K); P(Rx + 1, y, K); },
    shocked() { [L, L + 1, Rx, Rx + 1].forEach((x) => { P(x, y - 1, W); P(x, y, W); }); P(L + 1, y, K); P(Rx, y, K); },
    angry() { eyes.neutral(); P(L, y - 2, B); P(L + 1, y - 1, B); P(Rx, y - 1, B); P(Rx + 1, y - 2, B); },
    sad() { eyes.neutral(); P(L, y - 1, B); P(L + 1, y - 2, B); P(Rx, y - 2, B); P(Rx + 1, y - 1, B); P(L, y + 1, tear); },
    smug() { P(L, y - 1, LID); P(L + 1, y - 1, LID); P(L, y, W); P(L + 1, y, K); P(Rx, y, W); P(Rx + 1, y, K); P(Rx, y - 2, B); P(Rx + 1, y - 2, B); },
    blank() { P(L, y, W); P(L + 1, y, W); P(Rx, y, W); P(Rx + 1, y, W); },
    sleep() { P(L, y, LID); P(L + 1, y, LID); P(Rx, y, LID); P(Rx + 1, y, LID); },
    teary() { [L, L + 1, Rx, Rx + 1].forEach((x) => { P(x, y - 1, K); P(x, y, tear); }); P(L + 1, y - 1, '#ffffff'); P(Rx + 1, y - 1, '#ffffff'); P(L, y - 2, B); P(Rx + 1, y - 2, B); },
    hopeful() { [L, L + 1, Rx, Rx + 1].forEach((x) => { P(x, y - 1, K); P(x, y, K); }); P(L + 1, y - 1, '#ffffff'); P(Rx + 1, y - 1, '#ffffff'); },
  };
  (eyes[expr] ?? eyes.neutral)();
  if (F.blush && (expr === 'happy' || expr === 'hopeful')) { P(L - 1 >= 0 ? L - 1 : L, y + 1, F.blush); P(Rx + 2 < F.w ? Rx + 2 : Rx + 1, y + 1, F.blush); }
  const M = F.mouth;
  if (!M) return;
  const mc = M.c, my = M.y, mx = M.x, mw = M.w;
  const line = (yy, x0, n) => { for (let i = 0; i < n; i++) P(x0 + i, yy, mc); };
  if (open) {
    line(my, mx, mw); for (let i = 0; i < mw; i++) P(mx + i, my + 1, i === 0 || i === mw - 1 ? mc : '#d0596a');
    return;
  }
  switch (expr) {
    case 'happy': case 'hopeful': line(my, mx, mw); P(mx - 1, my - 1, mc); P(mx + mw, my - 1, mc); break;
    case 'shocked': for (let i = 0; i < mw; i++) { P(mx + i, my, mc); P(mx + i, my + 1, mc); } break;
    case 'sad': case 'teary': case 'angry': line(my, mx, mw); P(mx - 1, my + 1, mc); P(mx + mw, my + 1, mc); break;
    case 'smug': line(my, mx, mw); P(mx + mw, my - 1, mc); break;
    case 'sleep': P(mx + ((mw / 2) | 0), my, mc); break;
    default: line(my, mx, mw);
  }
}

function setFace(rig, expr, open) {
  const key = expr + (open ? '_o' : '');
  if (rig.lastFace === key) return;
  rig.lastFace = key;
  const F = rig.spec.face;
  if (!F || !rig.faceMat) return;
  if (!rig.faceCache.has(key)) {
    const c = canvas(F.w, F.h, (g) => drawFace(g, F, expr, open));
    rig.faceCache.set(key, texFromCanvas(c));
  }
  rig.faceMat.map = rig.faceCache.get(key);
  rig.faceMat.needsUpdate = true;
}

// ---------------- painters ----------------
export const paint = {
  fur: (c, amt = 0.08) => (g, w, h, R) => noisy(g, 0, 0, w, h, c, amt, R),
  feet: (c, foot, rows = 1) => (g, w, h, R) => { noisy(g, 0, 0, w, h, c, 0.07, R); noisy(g, 0, h - rows, w, rows, foot, 0.05, R); },
  band: (c, c2, from, rows) => (g, w, h, R) => { noisy(g, 0, 0, w, h, c, 0.07, R); noisy(g, 0, from, w, rows, c2, 0.05, R); },
  stripes: (c, s) => (g, w, h, R) => { noisy(g, 0, 0, w, h, c, 0.07, R); g.fillStyle = s; for (let x = 1; x < w; x += 3) g.fillRect(x, 0, 1, Math.min(h, 3)); },
  shade,
};
