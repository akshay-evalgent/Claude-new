// 30,000 DAYS characters, toon-shaded 3D with ink outlines and painted anime faces.
// Original designs: he keeps the film's signatures (red scarf, the cowlick as an ahoge, freckles, mustard hoodie).
import * as THREE from 'three';
import { toon, mesh, canvasTex } from './toon.js';
import { faceTexture } from './face.js';

export const HERO = {
  skin: '#f8d8c0', skinShade: '#e8ad98', hair: '#3a2620', hairHi: '#8a6450', iris: '#c07a2a', irisDark: '#4a2608', irisLight: '#ffd27a',
  browColor: '#3a2620', top: '#dba236', topShade: '#b07a1e', pants: '#2c3550', shoes: '#efeae0', sole: '#c8402e', scarf: '#d2412e', freckles: true,
  rim: 0xa8c8ff, shade: 0x8a7cb0,
};
export const NEIGHBOUR = {
  skin: '#efc8aa', skinShade: '#cf9c84', hair: '#e6e1d8', hairHi: '#ffffff', iris: '#5a7a9a', irisDark: '#22344a', irisLight: '#b8d4ec',
  browColor: '#cfc8be', top: '#3d4a6a', topShade: '#2a3450', pants: '#4a4036', shoes: '#3a2a1e', sole: '#2a1e16', scarf: '#8a2e2e', mustache: true, old: true,
  rim: 0xffdcaa, shade: 0x8a7cb0,
};

export const WIFE = {
  skin: '#f0caae', skinShade: '#d09c86', hair: '#d8d2ca', hairHi: '#ffffff', iris: '#7a5a3a', irisDark: '#3a2410', irisLight: '#d8b48a',
  browColor: '#bdb5aa', top: '#b8707a', topShade: '#8a4e58', pants: '#5a4a6a', shoes: '#4a3428', sole: '#2a1e16', scarf: '#e0b84a', bun: true, wrinkles: true,
  rim: 0xffdcaa, shade: 0x8a7cb0,
};

// The head is a deformed sphere; hair is built on its surface with the same deformation.
function deform(x, y, z) {
  if (y < 0) { const f = -y; x *= 1 - 0.36 * Math.pow(f, 1.5); z *= 1 - 0.12 * Math.pow(f, 1.4); y *= 1.08; }
  if (z > 0) z *= 0.9;
  x *= 0.94;
  return [x, y, z];
}
const dir = (th, ph) => new THREE.Vector3(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
function scalp(th, ph, off) { const d = dir(th, ph); const [x, y, z] = deform(d.x, d.y, d.z); return new THREE.Vector3(x, y, z).addScaledVector(d, off); }

function headGeometry() {
  const g = new THREE.SphereGeometry(1, 80, 60);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = deform(p.getX(i), p.getY(i), p.getZ(i));
    p.setXYZ(i, x, y, z);
    if (z > 0.0) uv.setXY(i, (x + 1) / 2, (y + 1.08) / 2.16);
    else uv.setXY(i, 0.005, 0.995);
  }
  g.computeVertexNormals();
  return g;
}

// A clump of hair: a tube along a curve, tapering to a point and flattened against the head.
function strand(parent, mat, ctrl, r, o = {}) {
  const curve = new THREE.CatmullRomCurve3(ctrl);
  const seg = o.seg || 22, rad = 10, flat = o.flat ?? 0.5;
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false);
  const pos = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg; curve.getPointAt(t, c);
    const out = c.clone().normalize();
    const taper = r * Math.pow(Math.max(0, 1 - t), o.pow ?? 0.75) * (t < 0.12 ? 0.75 + t / 0.12 * 0.25 : 1);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c);
      v.addScaledVector(out, -v.dot(out) * (1 - flat)).multiplyScalar(taper);
      pos.setXYZ(k, c.x + v.x, c.y + v.y, c.z + v.z);
    }
  }
  g.computeVertexNormals();
  return mesh(g, mat, o.ink ?? 0.022, parent);
}
// a strand laid over the scalp: [theta, phi, offset] points
const sStrand = (parent, mat, pts, r, o) => strand(parent, mat, pts.map(([t, p, f]) => scalp(t, p, f)), r, o);

// the hair cap: a shell over the head down to a hairline that is high at the front and low at the back
function capGeometry(front, back, off) {
  const g = new THREE.SphereGeometry(1, 64, 48);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const d = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    let ph = Math.acos(THREE.MathUtils.clamp(d.y, -1, 1));
    const th = Math.atan2(d.x, d.z);
    const cut = front + (back - front) * Math.pow((1 - Math.cos(th)) / 2, 0.8);
    if (ph > cut) ph = cut;
    const q = scalp(th, ph, off);
    p.setXYZ(i, q.x, q.y, q.z);
  }
  g.computeVertexNormals();
  return g;
}

function buildHair(head, look, M) {
  const hair = new THREE.Group(); head.add(hair);
  if (!look.old) {
    mesh(capGeometry(0.62, 2.15, 0.07), M.hair, 0.026, hair);
    // fringe, swept toward his left (screen right)
    const fr = [[-0.95, 1.5, 0.3], [-0.62, 1.3, 0.3], [-0.3, 1.2, 0.3], [-0.02, 1.25, 0.32], [0.28, 1.17, 0.3], [0.58, 1.28, 0.3], [0.9, 1.45, 0.28]];
    fr.forEach(([th, end, r], k) => {
      const sw = 0.2 + k * 0.03;
      sStrand(hair, M.hair, [[th - 0.25, 0.2, 0.06], [th - 0.1, 0.62, 0.13], [th + sw * 0.6, 1.0, 0.12], [th + sw, end, 0.1]], r);
    });
    // side locks framing the face
    for (const s of [-1, 1]) {
      sStrand(hair, M.hair, [[s * 1.05, 0.5, 0.08], [s * 1.18, 1.1, 0.12], [s * 1.25, 1.65, 0.1], [s * 1.22, 2.05, 0.12]], 0.3);
      sStrand(hair, M.hair, [[s * 1.5, 0.6, 0.08], [s * 1.6, 1.2, 0.13], [s * 1.68, 1.75, 0.14], [s * 1.62, 2.05, 0.2]], 0.3);
    }
    // back and nape
    for (let k = 0; k < 9; k++) {
      const th = Math.PI * (0.62 + k * 0.095);
      sStrand(hair, M.hair, [[th, 0.6, 0.08], [th, 1.3, 0.14], [th, 1.95, 0.15], [th + 0.04, 2.35, 0.24]], 0.38);
    }
    // crown tufts
    for (const [th, r] of [[2.4, 0.3], [3.0, 0.32], [3.6, 0.3]]) sStrand(hair, M.hair, [[th - 0.2, 0.05, 0.05], [th, 0.35, 0.14], [th + 0.1, 0.75, 0.2], [th + 0.15, 1.0, 0.26]], r);
    // the ahoge
    strand(hair, M.hair, [new THREE.Vector3(0.0, 0.98, 0.1), new THREE.Vector3(0.05, 1.32, 0.18), new THREE.Vector3(0.28, 1.55, 0.3), new THREE.Vector3(0.5, 1.45, 0.42), new THREE.Vector3(0.58, 1.28, 0.44)], 0.1, { flat: 0.9, pow: 0.5 });
  } else if (look.bun) {
    mesh(capGeometry(0.75, 2.2, 0.07), M.hair, 0.022, hair);
    for (const s of [-1, 1]) sStrand(hair, M.hair, [[s * 0.15, 0.3, 0.06], [s * 0.6, 0.8, 0.12], [s * 1.2, 1.3, 0.1], [s * 1.6, 1.6, 0.08]], 0.32);
    const bun = mesh(new THREE.SphereGeometry(0.48, 24, 18), M.hair, 0.022, hair); bun.position.set(0, 0.75, -0.85);
  } else {
    mesh(capGeometry(0.3, 2.1, 0.05), M.hair, 0.022, hair);
    for (const s of [-1, 1]) for (const [th, r] of [[1.3, 0.24], [1.6, 0.26], [1.95, 0.26]])
      sStrand(hair, M.hair, [[s * th, 1.15, 0.06], [s * th, 1.5, 0.11], [s * (th + 0.05), 1.85, 0.12]], r);
    for (let k = 0; k < 6; k++) { const th = Math.PI * (0.75 + k * 0.1); sStrand(hair, M.hair, [[th, 1.3, 0.06], [th, 1.75, 0.11], [th, 2.05, 0.14]], 0.3); }
  }
  return hair;
}

export function makeChar(look, opts = {}) {
  const root = new THREE.Group();
  const R = { rim: look.rim };
  const M = {
    skin: toon(look.skin, { ...R, steps: [0.7, 1.0], rimStrength: 0.2 }),
    hair: toon(look.hair, { ...R, steps: [0.5, 0.78, 1.0], rimStrength: 0.4, band: { color: look.hairHi, y0: 0.42, y1: 0.58, k: 0.75 } }),
    top: toon(look.top, { ...R, steps: [0.62, 0.84, 1.0] }),
    topShade: toon(look.topShade, { ...R, steps: [0.62, 0.84, 1.0] }),
    pants: toon(look.pants, { ...R, steps: [0.55, 0.8, 1.0] }),
    shoes: toon(look.shoes, { ...R, steps: [0.62, 1.0] }),
    sole: toon(look.sole, { ...R, steps: [0.62, 1.0] }),
    scarf: toon(look.scarf, { ...R, rimStrength: 0.32, steps: [0.6, 0.82, 1.0] }),
    white: toon('#f2ebe0', { ...R, steps: [0.7, 1.0] }),
  };
  const faceMat = toon('#ffffff', { map: faceTexture(look, opts.expr || 'neutral', opts.face || {}), ...R, steps: [0.74, 1.0], rimStrength: 0.2 });

  // skeleton
  const hips = new THREE.Group(); root.add(hips);
  const spine = new THREE.Group(); hips.add(spine);
  const chest = new THREE.Group(); chest.position.y = 2.0; spine.add(chest);
  const neck = new THREE.Group(); neck.position.y = 1.55; chest.add(neck);
  const head = new THREE.Group(); head.position.y = 1.05; head.scale.setScalar(opts.headScale || 1.16); neck.add(head);

  // torso: a lathe-turned hoodie (or cardigan) with sloping shoulders
  const prof = [[1.28, -0.35], [1.36, -0.2], [1.36, 0.1], [1.28, 0.7], [1.24, 1.4], [1.3, 2.2], [1.3, 2.75], [1.18, 3.1], [0.92, 3.36], [0.55, 3.52], [0.4, 3.56]];
  const torso = mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40), M.top, 0.03, spine);
  torso.scale.set(1, 1, 0.74);
  const hem = mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.32, 40), M.topShade, 0.026, spine); hem.scale.set(1, 1, 0.75); hem.position.y = -0.2;
  if (!opts.cardigan) {
    const pocket = mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.85, 24, 1, true, -0.62, 1.24), M.topShade, 0.022, spine);
    pocket.scale.set(1.4, 1, 1.07); pocket.position.set(0, 0.55, 0.0); pocket.material = toon(look.topShade, { ...R, steps: [0.62, 0.84, 1.0], side: THREE.DoubleSide });
    const hood = mesh(new THREE.TorusGeometry(0.78, 0.34, 14, 32, Math.PI * 1.3), M.top, 0.03, chest);
    hood.position.set(0, 1.25, -0.42); hood.rotation.set(-1.15, 0, Math.PI * 0.85); hood.scale.set(1.15, 1, 1);
    for (const sx of [-0.3, 0.3]) {
      const s = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), M.white, 0.012, chest); s.position.set(sx, 0.85, 1.0); s.rotation.x = 0.12;
      const tip = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 6), M.white, 0.01, chest); tip.position.set(sx, 0.32, 1.06);
    }
  } else {
    const placket = mesh(new THREE.BoxGeometry(0.22, 3.2, 0.1), M.topShade, 0.012, spine); placket.position.set(0, 1.45, 0.94);
    for (let k = 0; k < 4; k++) {
      const b = mesh(new THREE.SphereGeometry(0.08, 10, 8), toon('#e8dcc0', { steps: [0.7, 1.0] }), 0.012, spine); b.position.set(0, 0.35 + k * 0.62, 1.0);
    }
    const collar = mesh(new THREE.TorusGeometry(0.56, 0.16, 10, 28), M.white, 0.02, chest); collar.rotation.x = Math.PI / 2; collar.position.y = 1.5;
  }
  // neck, head
  const nk = mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.1, 16), M.skin, 0.02, neck); nk.position.y = 0.15;
  const hd = mesh(headGeometry(), faceMat, 0.022, head);
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.19, 16, 12), M.skin, 0.018, head); ear.scale.set(0.45, 1, 0.75); ear.position.set(sx * 0.9, -0.12, -0.08);
  }
  const hair = buildHair(head, look, M);
  if (look.mustache) for (const sd of [-1, 1]) sStrand(head, M.hair, [[sd * 0.02, 2.06, 0.03], [sd * 0.22, 2.1, 0.07], [sd * 0.45, 2.22, 0.06]], 0.13, { flat: 0.55, pow: 0.9 });
  if (opts.glasses) {
    const gm = toon('#3a2a22', { steps: [0.6, 1.0] });
    for (const sd of [-1, 1]) { const r = mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 28), gm, null, head); r.position.set(sd * 0.36, -0.24, 0.98); }
    const br = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 6), gm, null, head); br.rotation.z = Math.PI / 2; br.position.set(0, -0.2, 1.0);
  }
  if (opts.hat) {
    const hat = new THREE.Group(); head.add(hat);
    const hm = toon('#2a2a36', { ...R, steps: [0.6, 1.0] });
    const brim = mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.08, 40), hm, 0.025, hat); brim.position.y = 0.62;
    const crown = mesh(new THREE.CylinderGeometry(0.86, 0.95, 0.72, 32), hm, 0.025, hat); crown.position.y = 0.98;
    mesh(new THREE.CylinderGeometry(0.955, 0.955, 0.16, 32), toon('#8a2e2e', { steps: [0.6, 1.0] }), null, hat).position.y = 0.72;
    hat.position.set(0, 0.05, -0.04); hat.rotation.set(-0.14, 0, 0.06);
  }
  // scarf
  const scarf = new THREE.Group(); chest.add(scarf); scarf.position.y = 1.5;
  const wrap = mesh(new THREE.TorusGeometry(0.6, 0.27, 14, 36), M.scarf, 0.03, scarf); wrap.rotation.x = Math.PI / 2; wrap.scale.set(1.18, 1.05, 1);
  const wrap2 = mesh(new THREE.TorusGeometry(0.56, 0.22, 12, 32), M.scarf, 0.026, scarf); wrap2.rotation.x = Math.PI / 2 - 0.12; wrap2.position.y = 0.3; wrap2.scale.set(1.1, 1, 1);
  const tailTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = look.scarf; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(40,0,10,0.25)'; for (let y = 18; y < h; y += 46) g.fillRect(0, y, w, 12); g.fillStyle = '#f2ebe0'; for (let x = 4; x < w; x += 12) g.fillRect(x, h - 14, 5, 14); });
  const tailG = new THREE.BoxGeometry(0.5, 1.9, 0.12, 1, 8, 1); tailG.translate(0, -0.95, 0);
  const tp = tailG.attributes.position; for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setZ(i, tp.getZ(i) + 0.08 * Math.sin(-y * 1.6)); }
  tailG.computeVertexNormals();
  const tail = mesh(tailG, toon('#ffffff', { map: tailTex, ...R, steps: [0.6, 0.82, 1.0] }), 0.024, scarf);
  tail.position.set(0.42, -0.12, 0.66); tail.rotation.set(0.18, 0.1, 0.1);
  if (opts.scarfFly) { tail.position.set(0.3, 0.0, -0.4); tail.rotation.set(-1.25, 0.3, 0.6); }

  // arms
  function arm(side) {
    const sh = new THREE.Group(); sh.position.set(side * 1.3, 1.08, 0); chest.add(sh);
    const cap = mesh(new THREE.SphereGeometry(0.46, 18, 14), M.top, 0.03, sh); cap.scale.set(1, 0.9, 0.9);
    const ua = mesh(new THREE.CapsuleGeometry(0.42, 1.3, 6, 16), M.top, 0.03, sh); ua.position.y = -0.85;
    const el = new THREE.Group(); el.position.y = -1.7; sh.add(el);
    const fa = mesh(new THREE.CylinderGeometry(0.4, 0.46, 1.5, 16), M.top, 0.03, el); fa.position.y = -0.75;
    const elb = mesh(new THREE.SphereGeometry(0.41, 14, 10), M.top, null, el);
    const cuff = mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.28, 16), M.topShade, 0.02, el); cuff.position.y = -1.58;
    const hand = new THREE.Group(); hand.position.y = -1.75; el.add(hand);
    const palm = mesh(new THREE.SphereGeometry(0.3, 16, 12), M.skin, 0.018, hand); palm.scale.set(0.9, 1.15, 0.62); palm.position.y = -0.22;
    const fing = mesh(new THREE.CapsuleGeometry(0.2, 0.22, 4, 10), M.skin, 0.016, hand); fing.scale.set(1.2, 1, 0.7); fing.position.set(0, -0.48, 0.04); fing.rotation.x = 0.2;
    const thumb = mesh(new THREE.CapsuleGeometry(0.085, 0.26, 4, 8), M.skin, 0.014, hand); thumb.position.set(-side * 0.24, -0.18, 0.14); thumb.rotation.z = side * 0.55;
    return { sh, el, hand };
  }
  const armL = arm(1), armR = arm(-1);
  // legs
  function leg(side) {
    const hp = new THREE.Group(); hp.position.set(side * 0.62, 0, 0); hips.add(hp);
    const th = mesh(new THREE.CapsuleGeometry(0.56, 2.0, 6, 16), M.pants, 0.03, hp); th.position.y = -1.2;
    const kn = new THREE.Group(); kn.position.y = -2.55; hp.add(kn);
    const sn = mesh(new THREE.CylinderGeometry(0.5, 0.56, 2.2, 16), M.pants, 0.03, kn); sn.position.y = -1.0;
    const knee = mesh(new THREE.SphereGeometry(0.53, 14, 10), M.pants, null, kn);
    const foot = new THREE.Group(); foot.position.y = -2.3; kn.add(foot);
    const shoe = mesh(new THREE.CapsuleGeometry(0.4, 0.62, 6, 14), M.shoes, 0.03, foot); shoe.rotation.x = Math.PI / 2; shoe.scale.set(1.05, 1, 0.82); shoe.position.set(0, -0.2, 0.32);
    const sole = mesh(new THREE.BoxGeometry(0.8, 0.14, 1.45), M.sole, 0.02, foot); sole.position.set(0, -0.5, 0.32);
    return { hp, kn, foot };
  }
  const legL = leg(1), legR = leg(-1);

  const HIP = 5.62;
  const api = {
    root, hips, spine, chest, neck, head, hair, armL, armR, legL, legR, faceMat, look, tail, HIP,
    setFace(expr, o = {}) { faceMat.map = faceTexture(look, expr, o); faceMat.needsUpdate = true; },
    setRim(color, k) {
      root.traverse((o) => { const m = o.material; if (m && m.userData && m.userData.rim) { m.userData.rim.value.set(color); if (k !== undefined) m.userData.rimK.value = k; } });
    },
    pose(p = {}) {
      spine.rotation.set(p.lean || 0, p.twist || 0, p.side || 0);
      chest.rotation.set(p.chestX || 0, p.chestY || 0, 0);
      head.rotation.set(p.headX || 0, p.headY || 0, p.headZ || 0);
      const A = (a, v) => { if (!v) return; a.sh.rotation.set(v[0], v[3] || 0, v[1]); a.el.rotation.set(v[2], v[4] || 0, 0); a.hand.rotation.set(v[5] || 0, v[6] || 0, 0); };
      A(armL, p.armL || [0.08, 0.14, -0.12]); A(armR, p.armR || [0.08, -0.14, -0.12]);
      const Lg = (l, v) => { l.hp.rotation.set(v[0], v[3] || 0, v[2] || 0); l.kn.rotation.set(v[1], 0, 0); l.foot.rotation.set(v[4] || 0, 0, 0); };
      Lg(legL, p.legL || [0, 0]); Lg(legR, p.legR || [0, 0]);
      hips.position.set(p.hipX || 0, p.hipY ?? HIP, p.hipZ || 0);
      hips.rotation.set(p.hipRX || 0, 0, 0);
      root.rotation.y = p.turn || 0;
      return api;
    },
  };
  api.pose({});
  return api;
}

// Seated pose helper: thighs forward, shins down.
export const SIT = (o = {}) => ({ hipY: o.h ?? 3.2, legL: [-1.5, 1.45, 0.08], legR: [-1.5, 1.45, -0.08], ...o });
