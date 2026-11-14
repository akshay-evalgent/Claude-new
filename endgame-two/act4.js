// Chapters f (The Second Future), g (Home), h (The Price) and the outro (o).
import { THREE, SET, SHOT, LINE, CAST, mkScene, move, shot, shake, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, label, makeChar, ground, building, makeShield, makeHammer, makeAxe, portalFx } from './engine.js';

const basic = (c, o) => new THREE.MeshBasicMaterial({ color: c, ...o });
const STONE = [0xb050ff, 0x3a8aff, 0xff3838, 0xffa030, 0xffe84a, 0x4aff7a];
const D = (x, y, w, h, st, inner = '') => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;${h ? `height:${h}px;` : ''}${st}">${inner}</div>`;

// ======================= BATTLE: shared-snap effects =======================
// the chain of heroes, in the order they link up; x positions along the line (everyone at z = 6 facing -z)
const CH = [['steve', 3.3], ['thor', 6.8], ['carol', 10.2], ['peter', 13.5], ['hulk', 17.7], ['wanda', 21.9], ['tchalla', 25.2], ['strange', 28.6], ['sam', 33.2], ['clint', 37.6], ['scott', 40.9], ['nebula', 44.2], ['rocket', 46.8]];
const LZ = 6, TONY = [0, 0, LZ];
function FX(S) {
  if (S._fx) return S._fx;
  const s = S.s, N = 460, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), basic(0xffffff, { fog: false }), N); im.frustumCulled = false; s.add(im);
  const col = new THREE.Color(), dm = new THREE.Object3D(); for (let i = 0; i < N; i++) im.setColorAt(i, col.set(STONE[i % 6]));
  const hl = new THREE.PointLight(0xffc070, 0, 30); s.add(hl); const ml = new THREE.PointLight(0xc9a0ff, 0, 60); s.add(ml);
  // six stones on Tony's right hand
  const tony = S.H('tonyArmor'), st = new THREE.Group(); st.position.set(0, -1.85, 0); tony.armR.add(st);
  STONE.forEach((c, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.16), basic(c)); m.position.set(i < 4 ? -0.36 + i * 0.24 : (i === 4 ? 0 : -0.56), i < 4 ? -0.2 : (i === 4 ? 0.12 : 0.05), i === 5 ? 0 : -0.56); if (i === 5) m.rotation.y = Math.PI / 2; st.add(m); });
  // Strange's open hand + golden mandala
  const strange = S.H('strange'), hand = new THREE.Group(); hand.position.set(0, -2.25, 0); strange.armR.add(hand); const sk = CAST.strange.skin;
  box(1.15, 0.34, 1.05, sk, 0, 0, 0.2, hand); const fingers = [-0.42, -0.14, 0.14, 0.42].map(x => { const f = new THREE.Group(); f.position.set(x, 0, 0.72); hand.add(f); box(0.24, 0.28, 0.85, sk, 0, 0, 0.42, f); return f; }); const thumb = new THREE.Group(); thumb.position.set(-0.55, 0, 0.1); hand.add(thumb); box(0.7, 0.28, 0.26, sk, -0.35, 0, 0, thumb);
  const mand = portalFx(s, 0x8a5a14, 1.9);
  const outs = [makeChar('outrider'), makeChar('outrider')]; outs.forEach(o => s.add(o.g));
  const bg0 = s.background.clone(), sun0 = s.userData.sun.intensity;
  const fx = {
    st, hand, fingers, thumb, mand, outs, hl, ml,
    hide() { im.visible = false; hl.intensity = ml.intensity = 0; st.visible = false; hand.visible = false; mand.userData.set(0, 0); outs.forEach(o => { o.reset(); o.g.visible = false; }); S.gauntlet.userData.stones.forEach(v => v.visible = true); s.background.copy(bg0); s.fog.color.copy(bg0); s.userData.sun.intensity = sun0; s.userData.bloom = 0.42; },
    dusk() { s.background.set(0x3a2f3c); s.fog.color.set(0x3a2f3c); s.userData.sun.intensity = 0.7; s.userData.bloom = 0.3; },
    open(k) { fingers.forEach((f, i) => f.rotation.x = 1.5 * (1 - ease(k * 1.3 - i * 0.06))); thumb.rotation.y = -1.2 * (1 - ease(k)); },
    // coloured energy streaming along a polyline (path) up to segment `reach`
    energy(path, reach, T, amp = 1) {
      im.visible = reach > 0; if (!im.visible) return;
      for (let i = 0; i < N; i++) {
        const u = (hash(i) + T * (0.3 + hash(i + 0.3) * 0.5)) % 1, sp = Math.min(u * reach, path.length - 1.001), a = Math.floor(sp), f = sp - a, A = path[a], B = path[a + 1], j = hash(i + 0.6);
        dm.position.set(lerp(A[0], B[0], f) + Math.sin(T * 7 + i) * 0.45 * amp, lerp(A[1], B[1], f) + Math.sin(f * Math.PI) * (j - 0.3) * 2.2 * amp + Math.cos(T * 9 + i * 2) * 0.3, lerp(A[2], B[2], f) + Math.sin(T * 5 + i * 3) * 0.5 * amp);
        dm.rotation.set(T * 4 + i, i, 0); dm.scale.setScalar((0.07 + j * 0.17) * Math.min(amp, 1.6)); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    },
  };
  const p0 = S.pre.bind(S); S.pre = T => { p0(T); fx.hide(); };
  fx.hide(); return (S._fx = fx);
}
const hx = i => i < 0 ? 0 : CH[i][1], hs = i => CAST[CH[i][0]].scale || 1;
const PATH = (() => { const p = [[-1.5, 5.9, LZ - 0.7], [-1.5, 4.0, LZ], [0, 3.5, LZ]]; CH.forEach((c, i) => p.push([c[1], 3.4 * hs(i), LZ])); return p; })();
// place Tony + the first n linked heroes; returns tony.  opts: up (free arms raised for the snap), enter (0..1 slide-in of hero n-1)
function chain(S, n, T, o = {}) {
  const fx = FX(S), tony = S.H('tonyArmor'); S.place(tony, ...TONY); tony.armR.rotation.x = -2.8; tony.armR.rotation.z = Math.sin(T * 31) * 0.05; tony.body.rotation.x = 0.08; tony.look(o.tface || 'serious', T, o.ttalk || 0); fx.st.visible = true;
  for (let i = 0; i < n; i++) {
    const h = S.H(CH[i][0]), e = i === n - 1 && o.enter !== undefined ? ease(o.enter) : 1; S.place(h, CH[i][1], 0, LZ + (1 - e) * 7); if (e < 1) h.walk(T * 9, 0.7);
    h.armR.rotation.z = 1.35 * e + Math.sin(T * 27 + i) * 0.04; h.armR.rotation.x = -0.25; h.body.rotation.x = 0.06; if (o.up) { h.armL.rotation.x = -2.7 * o.up; } h.look(i === 1 ? 'serious' : 'serious', T);
    if (CH[i][0] === 'thor') { S.hold(S.axe, h, 'L'); S.axe.position.set(0, -3.6, 0.2); }
  }
  if (o.up) tony.armL.rotation.x = -0.4;
  fx.hl.position.set(-1.5, 6, LZ - 1.2); fx.hl.intensity = 36 + Math.sin(T * 23) * 10; fx.ml.position.set(hx(Math.max(0, n - 1)) * 0.5, 8, LZ - 6); fx.ml.intensity = n * 26;
  fx.energy(PATH, 2 + n - (o.enter !== undefined ? 1 - ease(o.enter) : 0), T, o.amp || 1);
  return tony;
}
const thanosAt = (S, T, expr = 'menace', talk = 0, stones = false) => { const th = S.H('thanos'); S.place(th, 0, 0, -14, 0); th.idle(T); th.look(expr, T, talk); S.hold(S.gauntlet, th, 'L'); S.gauntlet.userData.stones.forEach(v => v.visible = stones); return th; };
const BAT = (key, fn, o = {}) => SHOT(key, 'battle', c => { const S = c.S; FX(S); S.army = o.army ?? 1; S.allies = o.allies ?? 1; S.ship.visible = o.ship ?? true; if (o.portals ?? true) S.portals.forEach(p => p.userData.set(1, c.T)); fn(c, S, S._fx); S.post(c.T); });

// ---- f1: the look. Strange opens his whole hand ----
const SP = [12, 0, 14], SRY = -2.3, TRY = 0.98;
const strangeAt = (S, T, k) => { const st = S.H('strange'), fx = S._fx; S.place(st, ...SP, SRY); st.idle(T); st.look('serious', T); st.armR.rotation.x = -1.57 * ease(k); fx.hand.visible = true; return st; };
const tonyKneel = (S, T, expr = 'serious', talk = 0) => { const t = S.H('tonyArmor'); S.place(t, ...TONY, TRY); t.idle(T); t.body.rotation.x = 0.18; t.legL.rotation.x = -0.9; t.legR.rotation.x = 0.5; t.body.position.y = -0.5; t.look(expr, T, talk); return t; };
BAT('f1:0', (c, S, fx) => {
  const [i, k] = cuts(c.k, [0.48]); S.s.userData.bloom = 0.22; thanosAt(S, c.T, 'menace', 0, true); tonyKneel(S, c.T); const st = strangeAt(S, c.T, i ? k * 0.9 : 0); fx.open(0);
  if (i === 0) move(c.cam, [-6, 7, -2], [10, 4.2, 13], [-4.5, 5.6, 0.5], [11, 4.4, 13.5], k, 36);
  else { st.head.rotation.y = Math.sin(c.T * 5) * 0.12 * (1 - k); move(c.cam, [6.4, 4.9, 8.2], [11.6, 4.6, 14], [5.6, 4.8, 8.6], [11.2, 4.6, 14], k, 30); }
});
BAT('f1:1', (c, S, fx) => {
  strangeAt(S, c.T, 1); tonyKneel(S, c.T); const o = ease((c.k - 0.12) / 0.5); fx.open(o);
  S.s.userData.bloom = 0.22; fx.mand.position.set(10.6, 4.7, 14.9); fx.mand.rotation.y = SRY; fx.mand.userData.set(o * 0.999, c.T); fx.hl.position.set(7.6, 5.4, 11.6); fx.hl.intensity = 14 * o;
  move(c.cam, [5.2, 4.3, 9.4], [9.3, 4.7, 13.6], [4.6, 4.6, 9.0], [9.4, 4.8, 13.6], c.k, 27);
});
// ---- f2: Tony understands ----
BAT('f2:0', (c, S) => { const t = tonyKneel(S, c.T, c.k > 0.45 ? 'serious' : 'surprised'); t.head.rotation.x = -0.1; move(c.cam, [6.6, 4.4, 10.6], [0.2, 4.1, 6.1], [5.8, 4.3, 10], [0.2, 4.15, 6.1], c.k, 28); });
BAT('f2:1', (c, S, fx) => {
  const [i, k] = cuts(c.k, [0.55]);
  if (i === 0) { const sv = S.H('steve'); S.place(sv, -30, 0, -2, Math.PI + 0.3); S.hold(S.hammer, sv, 'R'); sv.armR.rotation.x = -2.7 + 2.2 * ease(k * 1.8); sv.look('serious', c.T); fx.outs.forEach((o, j) => { o.g.visible = true; const e = clamp((k - 0.25 - j * 0.18) / 0.55); put(o, -31 + j * 3.2 - e * 2, e * (1 - e) * 14, -6.5 - j * 1.5 - e * 9, 0.2); o.g.rotation.x = -e * 2.4; o.armL.rotation.z = -1.4; o.armR.rotation.z = 1.4; o.look('neutral', c.T); }); move(c.cam, [-20, 3.6, -13], [-29.5, 4, -4], [-21, 4, -12], [-29.5, 4.2, -4], k, 38); shake(c.cam, c.T, 0.06); }
  else { const t = tonyKneel(S, c.T, 'smirk'); t.head.rotation.x = 0.12 * Math.sin(k * Math.PI); move(c.cam, [5.8, 4.3, 10], [0.2, 4.15, 6.1], [5.2, 4.2, 9.5], [0.2, 4.2, 6.1], k, 28); }
});
// ---- f3: he takes the stones ----
BAT('f3:0', (c, S, fx) => {
  const took = c.k > 0.55, th = thanosAt(S, c.T, took ? 'surprised' : 'menace', 0, !took); th.armL.rotation.x = -1.3; th.armL.rotation.z = -0.2;
  const t = S.H('tonyArmor'); S.place(t, -5.2 + ease(c.k * 1.8) * 1.4, 0, -9.6 - ease(c.k * 1.8) * 1.2, 1.0); t.armL.rotation.x = t.armR.rotation.x = -1.7; t.body.rotation.x = 0.3; t.look('serious', c.T); fx.st.visible = took; fx.hl.position.set(-3.4, 6, -11); fx.hl.intensity = took ? 90 : 20;
  if (took) c.flash(clamp(1 - (c.k - 0.55) / 0.2) * 0.5);
  move(c.cam, [-15, 5, 5], [-2, 5.6, -12], [-13, 5.4, 3], [-2, 5.8, -12], c.k, 36); shake(c.cam, c.T, 0.08);
});
BAT('f3:1', (c, S, fx) => {
  const t = chain(S, 0, c.T, { amp: 0.6 + c.k }); t.look('surprised', c.T); t.body.rotation.x = 0.12 + Math.sin(c.T * 40) * 0.02; t.head.rotation.x = -0.25; S._fx.energy(PATH, 2, c.T, 0.8 + c.k * 0.8); fx.hl.intensity = 40 + c.k * 30;
  move(c.cam, [-4.5, 3.6, -2.6], [-0.6, 4.7, 6], [-3.4, 4.2, -1.4], [-0.6, 4.9, 6], c.k, 32); shake(c.cam, c.T, 0.1 + c.k * 0.08);
});
BAT('f3:2', (c, S, fx) => {
  const [i, k] = cuts(c.k, [0.42]);
  if (i === 0) { const t = chain(S, 0, c.T, { amp: 0.7 }); t.head.rotation.x = -0.3; move(c.cam, [-5.6, 5.0, -1.6], [-1.3, 5.8, 5.4], [-5.0, 5.4, -1.0], [-1.3, 5.9, 5.4], k, 26); shake(c.cam, c.T, 0.12); }
  else { const t = chain(S, 1, c.T, { enter: k * 2.2, amp: 1.2 }); t.head.rotation.y = -0.9 * ease((k - 0.4) * 3); t.look(k > 0.5 ? 'surprised' : 'serious', c.T); move(c.cam, [3.6, 4.8, -3.2], [1.4, 4.5, 6], [2.8, 4.7, -2.4], [1.6, 4.5, 6], k, 32); shake(c.cam, c.T, 0.05); }
});
BAT('f4', (c, S) => { chain(S, 1, c.T, { amp: 1.1 }); const sv = S.H('steve'); sv.look('smirk', c.T, c.talk); sv.head.rotation.y = 0.35; move(c.cam, [5.6, 4.9, -1.4], [3.3, 4.7, 6], [5.2, 4.9, -1.0], [3.3, 4.7, 6], c.k, 26); });
// ---- f5: hand over hand ----
const grab = i => (c, S) => { chain(S, i + 1, c.T, { enter: c.k * 1.9, amp: 1.1 + i * 0.05 }); const cx = (hx(i) + hx(i - 1)) / 2 + 0.6, sc = Math.max(1, hs(i)), d = sc > 1 ? 15 : 10.5; move(c.cam, [cx + 2.2, 4.6 * sc * 0.9, LZ - d], [cx, 4.1 * (0.6 + sc * 0.4), LZ], [cx + 1.2, 4.5 * sc * 0.9, LZ - d + 1], [cx, 4.2 * (0.6 + sc * 0.4), LZ], c.k, 34); shake(c.cam, c.T, 0.04); };
for (let i = 1; i <= 6; i++) BAT(`f5:${i - 1}`, grab(i));
BAT('f5:6', (c, S) => { const n = Math.min(CH.length, 7 + Math.floor(c.k * 2.6 * 6) + 1); chain(S, n, c.T, { enter: (c.k * 2.6 * 6) % 1, amp: 1.5 }); move(c.cam, [8, 3.5, -8], [10, 4, LZ], [34, 24, -32], [20, 2, LZ + 6], c.k, 42); });
// ---- f6: the Guardians did this once ----
SET('purple', () => {
  const { s, cam } = mkScene(0x140a22, [30, 140], 0xc9a0ff, 0.25, [0x6a4a9a, 0x0a0612, 0.35]);
  s.userData.bloom = 0.85; ground(s, 300, '#2a2238', '#322a44');
  const r = rng(5); for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = 20 + r() * 70, h = 6 + r() * 30; box(4 + r() * 8, h, 4 + r() * 8, 0x2a2238, Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d, s).rotation.z = (r() - 0.5) * 0.4; }
  const figs = ['civA', 'civB', 'civD', 'civC', 'boy'].map((n, i) => { const f = makeChar(n, 'serious'); s.add(f.g); return f; });
  const orb = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), basic(0xd9a0ff)); s.add(orb); const pl = new THREE.PointLight(0xb050ff, 260, 40); s.add(pl);
  const N = 260, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), basic(0xb050ff), N); im.frustumCulled = false; s.add(im); const dm = new THREE.Object3D();
  return { s, cam, pre(T) {
    figs.forEach((f, i) => { const a = (i - 2) * 0.62, sc = i === 2 ? 1.35 : i === 4 ? 0.5 : 1; f.reset(); put(f, Math.sin(a) * 6.5, 0, -Math.cos(a) * 6.5 + 4, a); f.g.scale.setScalar(sc); f.armL.rotation.z = -1.3; f.armR.rotation.z = 1.3; f.body.rotation.x = 0.1 + Math.sin(T * 30 + i) * 0.015; f.look('serious', T); });
    orb.position.set(0, 4.6, 5.2); orb.rotation.set(T * 2, T * 3, 0); orb.scale.setScalar(0.9 + Math.sin(T * 14) * 0.2); pl.position.copy(orb.position); pl.intensity = 220 + Math.sin(T * 17) * 60;
    for (let i = 0; i < N; i++) { const u = (hash(i) + T * (0.5 + hash(i + 0.4))) % 1, f = i % 5, a = (f - 2) * 0.62, sc = f === 2 ? 1.35 : f === 4 ? 0.5 : 1, tx = Math.sin(a) * 6.5, tz = -Math.cos(a) * 6.5 + 4; dm.position.set(lerp(0, tx, u) + Math.sin(T * 8 + i) * 0.4, lerp(4.6, 3.6 * sc, u) + Math.sin(u * 3.14) * (hash(i + 0.2) - 0.3) * 3, lerp(5.2, tz, u) + Math.cos(T * 7 + i) * 0.4); dm.rotation.set(T * 3 + i, i, 0); dm.scale.setScalar(0.1 + hash(i + 0.7) * 0.25); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); } im.instanceMatrix.needsUpdate = true;
  } };
});
SHOT('f6:0', 'purple', c => { const a = -0.5 + c.k * 0.7; shot(c.cam, [Math.sin(a) * 21, 6 + c.k * 2, 4 + Math.cos(a) * 21], [0, 4, 1], 36); shake(c.cam, c.T, 0.05); if (c.l < 0.25) c.flash((1 - c.l / 0.25) * 0.7); });
BAT('f6:1', (c, S) => { chain(S, CH.length, c.T, { amp: 1.7 }); const x = lerp(46, 4, ease(c.k)); move(c.cam, [x + 4, 4.2, LZ - 12], [x - 4, 4, LZ], [x + 4, 4.2, LZ - 12], [x - 4, 4, LZ], 0, 40); c.cam.position.y += c.k * 1.5; shake(c.cam, c.T, 0.05); if (c.l < 0.2) c.flash((1 - c.l / 0.2) * 0.7); });
BAT('f7', (c, S) => { const th = thanosAt(S, c.T, 'menace', c.talk); th.armL.rotation.x = -2.3 * ease(c.k * 2.5); th.armL.rotation.z = -0.25; th.head.rotation.x = 0.18; chain(S, 3, c.T, { amp: 1.5 }); move(c.cam, [2.4, 2.0, -3.5], [-0.6, 8.2, -14], [1.8, 2.4, -4.6], [-0.6, 8.4, -14], c.k, 34); });
BAT('f8', (c, S) => { const t = chain(S, 4, c.T, { amp: 0.55, tface: 'smirk', ttalk: c.talk }); t.head.rotation.x = -0.08; move(c.cam, [-2.6, 4.6, -1.6], [0.5, 4.6, 6], [-2.2, 4.7, -1.0], [0.5, 4.65, 6], c.k, 28); shake(c.cam, c.T, 0.03); });
BAT('f9:0', (c, S, fx) => { chain(S, 2, c.T, { amp: 0.45 }); fx.hl.intensity = 16; S.s.userData.bloom = 0.25; move(c.cam, [-5.4, 6.6, -1.2], [-1.4, 5.9, 5.4], [-4.8, 6.5, -0.4], [-1.4, 5.9, 5.4], c.k, 20); shake(c.cam, c.T, 0.1); });
BAT('f9:1', (c, S, fx) => {
  const sn = clamp((c.l - 0.55) / 0.3); chain(S, CH.length, c.T, { amp: 1.8 + sn, up: ease(c.l / 0.5) }); thanosAt(S, c.T, 'surprised');
  move(c.cam, [16, 9, -30], [16, 4, LZ], [20, 13, -40], [20, 4, LZ], c.k, 44); shake(c.cam, c.T, 0.06 + sn * 0.2); c.flash(ease((c.l - 0.6) / 0.5));
});

// ======================= g1: dust, and Tony opens his eyes =======================
BAT('g1:0', (c, S) => {
  const [i, k] = cuts(c.k, [0.58]); const th = S.H('thanos'); S.place(th, 0, 0, -14, 0); th.look('sad', c.T); th.armL.rotation.x = th.armR.rotation.x = -1.0; th.armL.rotation.z = 0.25; th.armR.rotation.z = -0.25; th.head.rotation.x = 0.45;
  if (i === 0) move(c.cam, [9, 6.5, 10], [0, 6.6, -14], [7, 7, 6], [0, 6.8, -14], k, 34);
  else { const d = k * 1.05; th.g.visible = d < 0.14; S.dust[0].set([0, 0, -14], d, 1.75); move(c.cam, [7, 7, 6], [0, 6.8, -14], [5, 6, 10], [3, 8.5, -14], k, 36); }
}, { portals: true });
BAT('g1:1', (c, S) => { S.armyDust = c.k * 1.15; S.ship.visible = c.k < 0.5; move(c.cam, [-30, 16, 20], [0, 6, -80], [-10, 26, 30], [10, 4, -90], c.k, 46); }, { army: 1 });
BAT('g1:2', (c, S) => {
  const t = S.H('tonyArmor'), aw = c.k > 0.34; S.place(t, 0, 0.55, 8, Math.PI); t.g.rotation.set(-Math.PI / 2, 0, 0); t.armL.rotation.z = -0.5; t.armR.rotation.z = 0.5; t.look(aw ? (c.k > 0.6 ? 'smirk' : 'surprised') : 'sleep', c.T); t.head.rotation.x = aw ? -0.25 * ease((c.k - 0.34) * 4) : 0;
  const p = S.H('peter'), pp = S.H('pepper'); S.place(p, -3.6, 0, 6.6, Math.PI / 2 - 0.5); S.place(pp, 3.6, 0, 6.6, -Math.PI / 2 + 0.5);
  for (const h of [p, pp]) { h.legL.rotation.x = h.legR.rotation.x = -1.4; h.body.position.y = -1.2; h.body.rotation.x = 0.15; h.armL.rotation.x = h.armR.rotation.x = -0.5; }
  pp.look(aw ? 'joy' : 'sad', c.T); if (aw) { p.armL.rotation.z = -2.4; p.armR.rotation.z = 2.4; p.body.position.y = -1.2 + Math.abs(Math.sin(c.T * 9)) * 0.4; }
  move(c.cam, [0.8, 11, 13], [0, 1.2, 4.6], [0.4, 9.5, 11], [0, 1.2, 4.2], c.k, 28);
}, { army: 0, ship: false });

// ======================= g2 / g3: home =======================
SHOT('g2:0', 'cabin', c => { const S = c.S, t = S.place(S.tony, 2, 0, 26 - c.k * 5, Math.PI); t.walk(c.T * 6, 0.5); t.look('neutral', c.T); move(c.cam, [16, 4, 44], [0, 6, 0], [13, 5, 40], [0, 6, 0], c.k, 40); });
SHOT('g2:1', 'cabin', c => { const S = c.S, z = lerp(11, 3.4, c.k), y = clamp((8.6 - z) / 3.6) * 1.6, t = S.place(S.tony, 0, y, z, Math.PI); t.walk(c.T * 6, 0.5); t.look('smirk', c.T); move(c.cam, [11, 1.6, z + 8], [0, y + 2.4, z], [9, 3.4, z + 6], [0, y + 3.6, z], c.k, 36); });
const hug = (S, T, k, mtalk = 0) => {
  const t = S.place(S.tony, 0.2, 1.6, 3.3, Math.PI), m = S.morgan, p = S.place(S.pepper, 3.4, 1.6, -0.4, -0.3), up = ease((k - 0.45) / 0.3);
  const mz = lerp(-0.8, 2.0, ease(k / 0.45)); S.place(m, 1.0, 1.6 + up * 1.85, mz, 0.45); if (k < 0.45) m.walk(T * 14, 1.0); m.armL.rotation.z = -1.5 * (1 - up); m.armR.rotation.z = 1.5 * (1 - up); m.armL.rotation.x = m.armR.rotation.x = -1.3 * up; m.look('joy', T, mtalk);
  t.armL.rotation.x = t.armR.rotation.x = -1.05 * ease(k * 2.2); t.armL.rotation.z = 0.25; t.armR.rotation.z = -0.25; t.look(k > 0.3 ? 'joy' : 'smirk', T); t.head.rotation.x = -0.05; p.idle(T); p.look('joy', T); p.armR.rotation.x = -1.6; p.armR.rotation.z = -0.5; return { t, m };
};
SHOT('g2:2', 'cabin', c => { hug(c.S, c.T, c.k * 1.15); move(c.cam, [-4.6, 5.4, -1.0], [0.5, 5.2, 2.9], [-3.6, 6.0, -0.8], [0.5, 5.9, 2.9], c.k, 40); });
SHOT('g3', 'cabin', c => {
  const [i, k] = cuts(c.k, [0.62]); const { m, t } = hug(c.S, c.T, 1, c.talk); m.head.rotation.z = Math.sin(c.T * 2) * 0.05;
  if (i === 0) move(c.cam, [2.9, 6.8, 9.0], [1.0, 6.25, 2.0], [2.6, 6.7, 8.4], [1.0, 6.25, 2.0], k, 22);
  else { t.look('joy', c.T); t.head.rotation.z = -0.06; move(c.cam, [-3.6, 6.5, -1.2], [0.2, 6.3, 3.3], [-3.2, 6.5, -0.9], [0.2, 6.3, 3.3], k, 30); }
});

// ======================= h1: Strange, alone =======================
BAT('h1:0', (c, S, fx) => { fx.dusk(); const st = S.H('strange'); S.place(st, 0, 0, 0, Math.PI); st.idle(c.T); st.look('sad', c.T); st.cape.rotation.x = 0.12 + Math.sin(c.T * 2) * 0.05; move(c.cam, [10, 3, 30], [0, 5, 0], [5, 3.6, 19], [0, 4.6, 0], c.k, 38); }, { army: 0, allies: 0, ship: false, portals: false });
BAT('h1:1', (c, S, fx) => { fx.dusk(); const st = S.H('strange'); S.place(st, 0, 0, 0, Math.PI); st.idle(c.T); st.look('sad', c.T); st.head.rotation.x = 0.22 * ease(c.k * 1.5); move(c.cam, [-2.6, 4.5, -8.4], [0, 4.5, 0], [-1.6, 4.6, -6.8], [0, 4.55, 0], c.k, 30); }, { army: 0, allies: 0, ship: false, portals: false });

// ======================= h2: the price, four vignettes =======================
SET('price', () => {
  const { s, cam } = mkScene(0x2a2f3c, [50, 260], 0xdfe6f5, 1.4, [0xcfd8ea, 0x3a3e46, 1.1], [-16, 28, 20], 50);
  ground(s, 1700, '#4a5046', '#535a4e'); const sun = s.userData.sun;
  // 0: Thor's cliff
  const r = rng(12); for (let i = 0; i < 24; i++) box(5 + r() * 9, 3 + r() * 9, 5 + r() * 9, [0x5a5d63, 0x6a6d74][i % 2], (r() - 0.5) * 60, 1, -8 - r() * 40, s).rotation.y = r() * 3;
  const clouds = []; for (let i = 0; i < 16; i++) { const cl = box(26 + r() * 30, 5 + r() * 5, 16 + r() * 12, new THREE.MeshLambertMaterial({ color: 0x3a3f4c, fog: false }), (r() - 0.5) * 160, 34 + r() * 16, -30 - r() * 80, s); cl.castShadow = false; clouds.push(cl); }
  const thor = makeChar('thor', 'serious'), axe = makeAxe(); thor.armR.add(axe); axe.position.set(0, -3.6, 0.2); s.add(thor.g);
  // 1: Carol (x = 200)
  const carol = makeChar('carol', 'serious'); s.add(carol.g); const aura = new THREE.Mesh(new THREE.SphereGeometry(4.2, 14, 10), basic(0xffd66a, { transparent: true, opacity: 0.3, fog: false })); s.add(aura); const cl = new THREE.PointLight(0xffc860, 0, 50); s.add(cl);
  for (let i = 0; i < 12; i++) { const g = new THREE.Group(); g.position.set(200 + (r() - 0.5) * 80, 0, -14 - r() * 40); s.add(g); box(1.2, 8, 1.2, 0x4a3524, 0, 4, 0, g); box(6, 6, 6, 0x2a4a38, 0, 10, 0, g); }
  // 2: Peter (x = 400)
  box(60, 0.4, 14, 0x2a2d33, 400, 0.2, -10, s); box(60, 0.7, 7, 0x8a8d92, 400, 0.35, 0.5, s); for (let i = 0; i < 6; i++) { const h = 30 + r() * 30, b = building(16, h, 14, ['#4a505c', '#5a5148', '#3f4a58'][i % 3], 0.4, i + 3); b.position.set(366 + i * 15, h / 2, -26); s.add(b); }
  const peter = makeChar('peter'); s.add(peter.g); const bus = new THREE.Group(); s.add(bus); box(17, 5.4, 4.6, 0x2f6fb5, 0, 3.4, 0, bus); box(16.6, 1.8, 4.7, 0xbfe0f5, 0, 4.6, 0, bus); box(17.2, 0.8, 4.8, 0xf2c230, 0, 1.6, 0, bus); for (const x of [-5.5, 5.5]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4.8, 12), M(0x15161a)); w.rotation.x = Math.PI / 2; w.position.set(x, 1, 0); bus.add(w); }
  // 3: Steve (x = 600)
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), new THREE.MeshPhongMaterial({ color: 0x4f7f9f, shininess: 90 })); lake.rotation.x = -Math.PI / 2; lake.position.set(600, 0.1, -112); s.add(lake);
  box(6.4, 0.4, 2, 0x6a4a2e, 600, 1.6, 0, s); box(6.4, 2.4, 0.4, 0x6a4a2e, 600, 2.9, 1.0, s); for (const x of [-2.8, 2.8]) box(0.4, 1.5, 1.8, 0x4a3524, 600 + x, 0.75, 0, s);
  const sh = makeShield(); sh.position.set(603.9, 1.5, -0.4); sh.rotation.set(-0.25, -0.4, 0); s.add(sh);
  const steve = makeChar('steve', 'sad'), old = makeChar('steveOld', 'sad'); s.add(steve.g, old.g);
  return { s, cam, sun, clouds, thor, carol, aura, cl, peter, bus, steve, old,
    sky(col, si = 1.4) { s.background.set(col); s.fog.color.set(col); sun.intensity = si; },
    pre(T) { s.userData.bloom = 0.4; [thor, carol, peter, steve, old].forEach(h => { h.reset(); h.g.visible = false; }); aura.visible = false; cl.intensity = 0; bus.visible = false; } };
});
SHOT('h2:0', 'price', c => {
  const S = c.S, t = S.thor, up = ease(c.k / 0.25) * (1 - ease((c.k - 0.62) / 0.3)); S.sky(0x3a4252, 1.7); t.g.visible = true; put(t, 0, 0, 0, 0.15); t.armR.rotation.x = -2.9 * up; t.head.rotation.x = -0.45 * up + 0.3 * (1 - up) * ease((c.k - 0.6) * 3); t.look(c.k > 0.62 ? 'sad' : 'serious', c.T); t.cape.rotation.x = 0.12 + Math.sin(c.T * 3) * 0.06;
  S.clouds.forEach((cl, i) => cl.position.x += 0.02 * (i % 2 ? 1 : -1)); move(c.cam, [2.8, 2.6, 12], [0, 5.6, 0], [1.4, 3.8, 9], [0, 4.8, 0], c.k, 36);
});
SHOT('h2:1', 'price', c => {
  const S = c.S, ca = S.carol, out = clamp((c.k - 0.3) / 0.3), fl = out > 0 && out < 1 ? (hash(Math.floor(c.T * 14)) > 0.45 ? 1 : 0.15) : 1 - out, y = 4.5 * (1 - ease((c.k - 0.5) / 0.4));
  S.sky(0x1c2233, 0.7); ca.g.visible = true; put(ca, 200, y, 0, 0.1); ca.armL.rotation.z = -0.5 * (y / 4.5); ca.armR.rotation.z = 0.5 * (y / 4.5); ca.legL.rotation.x = 0.2 * (y / 4.5); ca.look(c.k > 0.55 ? 'sad' : 'serious', c.T); ca.head.rotation.x = 0.3 * ease((c.k - 0.6) * 3);
  S.aura.visible = fl > 0.05; S.aura.position.set(200, y + 3, 0); S.aura.scale.setScalar(fl * (1 + Math.sin(c.T * 10) * 0.05)); S.aura.material.opacity = 0.3 * fl; S.cl.position.set(200, y + 4, 3); S.cl.intensity = 260 * fl;
  move(c.cam, [203, 3, 16], [200, 6, 0], [202, 3.2, 12.5], [200, 4.2, 0], c.k, 36);
});
SHOT('h2:2', 'price', c => {
  const S = c.S, p = S.peter, lk = ease((c.k - 0.5) / 0.3); S.sky(0x6f7f95, 1.6); p.g.visible = true; S.bus.visible = true; put(p, 400, 0.7, 2.2, 0.2); p.idle(c.T); p.armL.rotation.x = p.armR.rotation.x = -1.1 * lk; p.armL.rotation.z = 0.2 * lk; p.armR.rotation.z = -0.2 * lk; p.head.rotation.x = 0.45 * lk;
  S.bus.position.set(lerp(440, 362, clamp(c.k / 0.5)), 0.4, -8.5); move(c.cam, [402.5, 4.2, 13], [400, 4.2, 2], [401.6, 4.4, 10.5], [400, 4.2, 2], c.k, 34);
});
SHOT('h2:3', 'price', c => {
  const S = c.S, sw = c.k > 0.42, h = sw ? S.old : S.steve, o = sw ? S.steve : S.old; S.sky(0xe0a878, 2.2); o.g.visible = false; h.g.visible = true; put(h, 600, 0, 0.4, 0); h.sit(); h.armL.rotation.set(-1.25, 0, 0.3); h.armR.rotation.set(-1.25, 0, -0.3); h.head.rotation.x = 0.45 - 0.4 * ease((c.k - 0.72) * 4); h.look(c.k > 0.8 ? 'smirk' : 'sad', c.T);
  if (sw) c.flash(clamp(1 - (c.k - 0.42) / 0.12) * 0.75); move(c.cam, [603, 4.2, 10.5], [600, 3.6, 0.4], [601.6, 4.6, 8], [600, 4.2, 0.4], c.k, 30);
});

// ======================= h3: a quiet gathering at the lake =======================
function LAKE(S) {
  if (S._lk) return S._lk;
  const s = S.s, names = ['thor', 'carol', 'peter', 'steveOld', 'strange', 'hulk', 'clint', 'wanda', 'sam'], hs2 = names.map(n => { const h = makeChar(n, 'sad'); s.add(h.g); return h; });
  const raft = new THREE.Group(); s.add(raft); box(5, 0.3, 5, 0x6a4a2e, 0, 0, 0, raft); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; box(0.9, 0.5, 0.9, i % 2 ? 0xf2f2f2 : 0xd98aa0, Math.cos(a) * 2.6, 0.3, Math.sin(a) * 2.6, raft); }
  const sh = makeShield(); sh.scale.setScalar(0.8); sh.rotation.x = -Math.PI / 2 + 0.35; sh.position.set(-1, 0.9, 0.4); raft.add(sh); const hm = makeHammer(); hm.scale.setScalar(0.7); hm.position.set(1.2, 0.2, -0.6); raft.add(hm);
  const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 16), basic(0x9fe8ff)); arc.position.set(0.3, 0.5, 1.1); raft.add(arc); const al = new THREE.PointLight(0x9fe8ff, 30, 16); al.position.set(0.3, 1.6, 1.1); raft.add(al);
  const bg0 = s.background.clone(), sun0 = s.userData.sun.intensity, lk = { hs2, raft, names, hide() { hs2.forEach(h => { h.reset(); h.g.visible = false; }); raft.visible = false; s.background.copy(bg0); s.fog.color.copy(bg0); s.userData.sun.intensity = sun0; } };
  const p0 = S.pre.bind(S); S.pre = T => { p0(T); lk.hide(); }; lk.hide(); return (S._lk = lk);
}
const lakeShot = (c, far) => {
  const S = c.S, lk = LAKE(S), s = S.s; s.background.set(0xd9a070); s.fog.color.set(0xd9a070); s.userData.sun.intensity = 1.5;
  lk.raft.visible = true; lk.raft.position.set(-34 - far * 14, 0.25 + Math.sin(c.T * 1.6) * 0.1, 10); lk.raft.rotation.set(Math.sin(c.T * 1.2) * 0.04, c.T * 0.15, Math.sin(c.T * 1.5) * 0.04);
  const all = [[S.tony, 'tony'], [S.pepper, 'pepper'], [S.morgan, 'morgan'], ...lk.hs2.map((h, i) => [h, lk.names[i]])];
  all.forEach(([h, n], i) => { h.g.visible = true; put(h, -19 + (i % 2) * 2.6 + hash(i) * 0.8, 0, -8 + i * 3.1, -Math.PI / 2 + (hash(i + 2) - 0.5) * 0.3); h.idle(c.T + i); h.head.rotation.x = 0.2; h.look(n === 'morgan' ? 'neutral' : 'sad', c.T + i * 0.4); });
  S.tony.armL.rotation.z = -0.4;
};
SHOT('h3:0', 'cabin', c => { lakeShot(c, c.k * 0.3); move(c.cam, [-27, 1.6, 15], [-36, 0.9, 10], [-28.5, 2.2, 15.5], [-37, 0.9, 10], c.k, 30); });
SHOT('h3:1', 'cabin', c => { lakeShot(c, 0.3 + c.k * 0.7); move(c.cam, [4, 7, 22], [-30, 2.5, 8], [10, 14, 26], [-32, 1, 8], c.k, 40); });

// ======================= h4: the Sanctum =======================
SET('sanctum', () => {
  const { s, cam } = mkScene(0x0c0a10, [30, 140], 0x9fb4ff, 0.3, [0x5a628a, 0x120c08, 0.5]);
  s.userData.bloom = 0.65; s.userData.sun.castShadow = false;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshPhongMaterial({ color: 0x2a1c12, shininess: 80, specular: 0x664422 })); fl.rotation.x = -Math.PI / 2; s.add(fl);
  box(80, 30, 1, 0x1c140e, 0, 15, -14.6, s);
  const sky = new THREE.Mesh(new THREE.CircleGeometry(8.6, 40), new THREE.MeshBasicMaterial({ map: tex(256, 256, c => { const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#16224a'); g.addColorStop(1, '#3a4a7a'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 26; i++) { const h = 30 + hash(i) * 110, x = i * 10; c.fillStyle = '#0c1226'; c.fillRect(x, 256 - h, 9, h); c.fillStyle = '#ffd98a'; for (let y = 256 - h + 6; y < 250; y += 12) if (hash(i * 7 + y) > 0.55) c.fillRect(x + 2, y, 4, 5); } }) })); sky.position.set(0, 10.5, -14); s.add(sky);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.5, 8, 40), M(0x2a1c12)); ring.position.set(0, 10.5, -13.8); s.add(ring);
  for (const a of [-0.5, 0.5]) { const b = box(0.4, 17, 0.4, 0x2a1c12, 0, 10.5, -13.8, s); b.rotation.z = a; } box(17, 0.4, 0.4, 0x2a1c12, 0, 9, -13.8, s); const inner = new THREE.Mesh(new THREE.TorusGeometry(3, 0.3, 6, 24), M(0x2a1c12)); inner.position.set(-1.5, 9, -13.8); s.add(inner);
  const wl = new THREE.PointLight(0x7f96ff, 120, 50); wl.position.set(0, 10, -8); s.add(wl);
  const st = makeChar('strange', 'sad'); s.add(st.g);
  const panel = label('FUTURE 14,000,606', { h: 1.1, bg: '#3a2a08', color: '#ffd24a', border: '#ffd24a' }); s.add(panel); const pl = new THREE.PointLight(0xffc860, 0, 26); s.add(pl);
  // map table at x = 40
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.6, 40), M(0x1c140e)); tb.position.set(40, 2.6, 0); s.add(tb); const mp = new THREE.Mesh(new THREE.CircleGeometry(8.4, 40), new THREE.MeshBasicMaterial({ map: tex(256, 256, c => { c.fillStyle = '#0a1a2c'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#16405a'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(40 + hash(i) * 180, 50 + hash(i + 3) * 150, 18 + hash(i + 5) * 34, 12 + hash(i + 7) * 26, hash(i) * 3, 0, 7); c.fill(); } c.strokeStyle = 'rgba(120,200,255,.25)'; c.lineWidth = 1.5; for (let i = 16; i < 256; i += 24) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.moveTo(0, i); c.lineTo(256, i); c.stroke(); } }) })); mp.rotation.x = -Math.PI / 2; mp.position.set(40, 2.95, 0); s.add(mp);
  const dots = []; for (let i = 0; i < 34; i++) { const a = hash(i) * 6.28, d = 1 + hash(i + 0.5) * 6.6, m = box(0.3, 0.3, 0.3, basic(0x7fe0ff), 40 + Math.cos(a) * d, 3.3, Math.sin(a) * d, s); m.castShadow = false; dots.push(m); }
  const beacon = box(0.7, 1.2, 0.7, basic(0xff3838), 40, 3.8, 0, s), bl = new THREE.PointLight(0xff3838, 0, 30); bl.position.set(40, 6, 0); s.add(bl); const tl = new THREE.PointLight(0x7fe0ff, 60, 30); tl.position.set(40, 9, 4); s.add(tl);
  return { s, cam, st, panel, pl, dots, beacon, bl, tl, pre(T) { st.reset(); st.idle(T); st.look('sad', T); st.cape.rotation.x = 0.1; } };
});
SHOT('h4:0', 'sanctum', c => { const S = c.S, dim = 1 - 0.75 * ease(c.k); put(S.st, -2.6, 0, -5, 0.5); S.panel.position.set(3.2, 6.3, -5); S.panel.material.opacity = dim; S.pl.position.set(3.2, 6.3, -3.5); S.pl.intensity = 70 * dim; S.st.head.rotation.y = 0.5; move(c.cam, [1.6, 4.6, 12], [0.3, 5.2, -6], [0.8, 5.0, 8.5], [0.3, 5.4, -6], c.k, 34); });
SHOT('h4:1', 'sanctum', c => {
  const S = c.S, [i, k] = cuts(c.k, [0.56]), on = i === 0 ? 1 - k : 0; put(S.st, 40, 0, -11.5, 0); S.st.head.rotation.x = 0.3;
  S.dots.forEach((d, j) => { const lit = hash(j + 0.9) < on; d.material.color.set(lit ? 0x7fe0ff : 0x12222c); d.scale.y = lit ? 0.3 + Math.sin(c.T * 4 + j) * 0.05 : 0.12; }); S.tl.intensity = 45 + 50 * on;
  const bk = Math.sin(c.T * 7) > 0 ? 1 : 0.08; S.beacon.material.color.set(bk > 0.5 ? 0xff3838 : 0x3a0a0a); S.bl.intensity = 110 * bk;
  if (i === 0) move(c.cam, [44, 12, 15], [40, 3, 0], [42, 9, 12], [40, 3.2, 0], k, 36);
  else { S.st.g.rotation.y = Math.PI * ease(k * 1.4); S.st.walk(c.T * 4, 0.3 * (k > 0.5 ? 1 : 0)); S.st.g.position.z = -11.5 - Math.max(0, k - 0.5) * 6; move(c.cam, [41.5, 4.4, 8.5], [40, 4.2, 0], [41, 4.3, 6.5], [40, 4.1, 0], k, 30); c.dom(D(1090, 150, 720, 0, `text-align:right;font-size:30px;letter-spacing:6px;font-weight:700;color:#ff6b6b;opacity:${0.35 + 0.65 * bk}`, 'INCOMING CALL · NO ANSWER')); }
});

// ======================= h5: something notices =======================
SET('deep', () => {
  const { s, cam } = mkScene(0x020308, null, 0xffffff, 0.1, [0x4a5a8a, 0x000000, 0.2]);
  s.userData.bloom = 0.9;
  const sp = []; for (let i = 0; i < 1400; i++) sp.push((hash(i) - 0.5) * 900, (hash(i + 0.3) - 0.5) * 520, -620 + hash(i + 0.6) * 120);
  const st = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.7 })); st.geometry.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); s.add(st);
  // the edge of the map: a faint grid that simply ends
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, map: tex(512, 512, c => { c.strokeStyle = '#3f8fd0'; c.lineWidth = 2; for (let i = 0; i <= 512; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 512); c.moveTo(0, i); c.lineTo(512, i); c.stroke(); } const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, 'rgba(2,3,8,1)'); g.addColorStop(0.45, 'rgba(2,3,8,0)'); c.fillStyle = g; c.fillRect(0, 0, 512, 512); c.fillStyle = '#7fd0ff'; c.fillRect(250, 440, 12, 12); }) })); grid.rotation.x = -Math.PI / 2; grid.position.set(0, -14, -90); s.add(grid);
  const tag = label('EARTH', { h: 2.2, color: '#7fd0ff' }); tag.position.set(0, -8, -18); s.add(tag);
  const shape = new THREE.Group(); shape.position.set(0, 30, -520); s.add(shape);
  const body = new THREE.Mesh(new THREE.SphereGeometry(170, 40, 24), basic(0x000000)); body.scale.set(1.5, 0.8, 1); shape.add(body);
  const lidT = box(230, 30, 4, basic(0x000000), 0, 15, 172, shape), lidB = box(230, 30, 4, basic(0x000000), 0, -15, 172, shape), eye = box(170, 1, 2, basic(0xffe2c4), 0, 0, 170, shape), pupil = box(10, 1, 2.2, basic(0xff5030), 0, 0, 171.5, shape);
  return { s, cam, shape, eye, pupil, lidT, lidB, tag, pre() {} };
});
SHOT('h5', 'deep', c => {
  const S = c.S, e = LINE.h5.sents[0].end - LINE.h5.slot[0], op = ease((c.l - 2.2) / 2.2); S.shape.rotation.y = lerp(0.9, 0, ease(c.l / 4.2)); S.shape.rotation.x = 0.06;
  S.eye.scale.y = 0.6 + op * 9; S.pupil.scale.y = 0.6 + op * 9; S.pupil.scale.x = 1 + op * 0.6; S.pupil.position.x = Math.sin(c.T * 0.8) * 3 * (1 - op); S.lidT.position.y = 15 + op * 5; S.lidB.position.y = -15 - op * 5; S.tag.material.opacity = 1 - ease(c.l / 2.5);
  move(c.cam, [0, -4, 30], [0, -6, -90], [0, 10, -40], [0, 28, -520], clamp(c.l / 5.2), 40); if (c.l > e + 1.2) c.fade(1);
});

// ======================= OUTRO =======================
SET('outro', () => {
  const { s, cam } = mkScene(0x07090e, [20, 80], 0xffffff, 0.2, [0x8899bb, 0x1a1512, 0.5]);
  s.userData.bloom = 0.5;
  const t = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 1, 48), new THREE.MeshPhongMaterial({ color: 0x14161c, shininess: 90, specular: 0x446688 })); t.position.y = -0.5; t.receiveShadow = true; s.add(t);
  const sp = new THREE.SpotLight(0xdff2ff, 700, 60, 0.4, 0.7); sp.position.set(2, 16, 6); sp.castShadow = true; s.add(sp, sp.target);
  const rl = new THREE.PointLight(0xffd24a, 40, 30); rl.position.set(-9, 4, -4); s.add(rl); const bl = new THREE.PointLight(0x8fd0ff, 40, 30); bl.position.set(9, 4, -4); s.add(bl);
  // a glowing reactor-like disc on a little stand ("proof" prop)
  const disc = new THREE.Group(); disc.position.y = 2.6; s.add(disc); box(2.4, 0.5, 2.4, 0x2a2d35, 0, 0.25, 0, s); box(0.5, 1.4, 0.5, 0x3a3e46, 0, 1.1, 0, s);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 10, 36), new THREE.MeshPhongMaterial({ color: 0x8a9199, shininess: 100 })); disc.add(rim); const core = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.3, 20), basic(0xdff8ff)); core.rotation.x = Math.PI / 2; disc.add(core);
  const segs = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, m = box(0.42, 0.3, 0.24, basic(0x7fe0ff), Math.cos(a) * 1.08, Math.sin(a) * 1.08, 0, disc); m.rotation.z = a + Math.PI / 2; m.castShadow = false; segs.push(m); }
  const gl = new THREE.PointLight(0x7fe0ff, 60, 20); gl.position.set(0, 2.6, 1.5); s.add(gl);
  return { s, cam, pre(T) { disc.rotation.y = Math.sin(T * 0.6) * 0.5; disc.rotation.z = T * 0.3; gl.intensity = 50 + Math.sin(T * 3) * 14; segs.forEach((m, i) => m.material.color.set(hash(i + Math.floor(T * 6)) > 0.2 ? 0x7fe0ff : 0x2f6f8a)); } };
});
const orbit = (c, a0, a1, r, y, ly = 2.2, fov = 35) => { const a = lerp(a0, a1, c.k); shot(c.cam, [Math.sin(a) * r, y, Math.cos(a) * r], [0, ly, 0], fov); };
const STR = '-webkit-text-stroke:14px rgba(0,0,0,.75);paint-order:stroke fill';
SHOT('o1', 'outro', c => {
  const T = c.T, L = LINE.o1, t1 = L.sents[1].start - 0.15, t2 = L.sents[2].start - 0.15; orbit(c, -0.5, 0.5, 11, 3.4, 2.4, 34);
  if (T < t1) return;
  if (T < t2) { const k = T - t1; c.dom(D(0, 215, 1920, 0, `text-align:center;font-size:104px;line-height:1.12;opacity:${clamp(k / 0.25)};${STR}`, `<span style="letter-spacing:${lerp(14, 4, ease(k / 0.5))}px">ONE HERO'S <span style="color:#ffd24a">LIFE</span></span><br><span style="opacity:${clamp((k - 1.0) / 0.25)}">OR EVERY HERO'S <span style="color:#8fd0ff">POWER?</span></span>`)); return; }
  const k = T - t2, g = ease(k / 1.6), a = Math.round(55 + 5 * Math.sin(k * 2.3) * (1 - g * 0.3)), n1 = Math.round(21360 * g * (a / 50)), n2 = Math.round(21360 * g * ((100 - a) / 50));
  const panel = (x, col, word, sub, pct, n, dir) => D(x, 250, 560, 420, `opacity:${clamp(k / 0.3)};transform:translateX(${(1 - ease(k / 0.45)) * dir * 80}px);text-align:center`,
    `<div style="font-size:140px;line-height:1;color:${col};${STR}">${word}</div><div style="font-size:34px;font-weight:700;color:#d6dbe4;margin-top:14px">${sub}</div><div style="margin:26px auto 0;width:440px;height:30px;border-radius:15px;background:rgba(255,255,255,.14);overflow:hidden"><div style="width:${pct * g}%;height:100%;background:${col}"></div></div><div style="font-size:44px;margin-top:16px">${Math.round(pct * g)}% <span style="font-size:28px;color:#aab2bf;font-weight:700">· ${n.toLocaleString('en-US')} votes</span></div>`);
  c.dom(D(0, 130, 1920, 0, 'text-align:center;font-size:38px;letter-spacing:10px;color:#fff;font-weight:700', "ONE HERO'S LIFE — OR EVERY HERO'S POWER?") + panel(110, '#ffd24a', 'TONY', 'He lives. The Avengers end.', a, n1, -1) + panel(1250, '#8fd0ff', 'POWERS', 'He falls. The Avengers stand.', 100 - a, n2, 1)
    + D(0, 720, 1920, 0, `text-align:center;opacity:${clamp((k - 0.7) / 0.3)}`, `<span style="display:inline-block;font-size:40px;letter-spacing:5px;background:#ffd24a;color:#14161c;padding:12px 34px;border-radius:40px;transform:translateY(${Math.sin(k * 6) * 5}px)">▼ COMMENT “TONY” OR “POWERS” ▼</span>`));
});
SHOT('o2', 'outro', c => {
  orbit(c, 0.5, 1.5, 12, 3.8, 2.4, 34); const words = ['WHAT', 'SHOULD', 'WE'], t = c.l;
  const w1 = words.map((w, i) => `<span style="display:inline-block;margin:0 14px;opacity:${clamp((t - 0.2 - i * 0.16) / 0.15)};transform:translateY(${(1 - ease((t - 0.2 - i * 0.16) / 0.25)) * 40}px)">${w}</span>`).join(''), k2 = t - 0.9;
  c.dom(D(0, 240, 1920, 0, `text-align:center;font-size:92px;${STR}`, w1) + D(0, 360, 1920, 0, `text-align:center;font-size:168px;line-height:1.1;color:#ffd24a;opacity:${clamp(k2 / 0.2)};transform:scale(${1.5 - 0.5 * ease(k2 / 0.3)});${STR}`, 'REIMAGINE NEXT?'));
});
const CARDS = [['A', 'TITANIC', 'the door fits two', '#8fd0ff'], ['B', 'THE MATRIX', 'Neo takes the blue pill', '#7dffb0'], ['C', 'THE DARK KNIGHT', 'the Joker tells the truth', '#c79bff']];
const cardDom = (i, k) => { const [a, t, s2, col] = CARDS[i]; return D(110, 600, 1500, 0, `opacity:${clamp(k / 0.2)};transform:translateX(${(1 - ease(k / 0.35)) * -70}px)`, `<div style="display:flex;align-items:center"><div style="width:150px;height:150px;border-radius:26px;background:${col};color:#14161c;font-size:120px;line-height:150px;text-align:center;flex:none">${a}</div><div style="margin-left:34px"><div style="font-size:104px;line-height:1;${STR}">${t}</div><div style="font-size:46px;font-weight:700;color:${col};margin-top:12px;-webkit-text-stroke:9px rgba(0,0,0,.8);paint-order:stroke fill">…where ${s2}</div></div></div>`) + D(1500, 130, 320, 0, 'text-align:right;font-size:30px;letter-spacing:8px;color:#fff;font-weight:700;opacity:.85', `VOTE ${a} · ${i + 1}/3`); };

SET('nextA', () => {   // an ocean liner at night and a floating door with room for two
  const { s, cam } = mkScene(0x0a1226, [60, 320], 0xbcd0ff, 1.5, [0x7f96d0, 0x0a1020, 1.0], [-20, 30, 20], 50);
  s.userData.bloom = 0.55;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshPhongMaterial({ color: 0x14365a, shininess: 100, specular: 0x9fc0ff })); sea.rotation.x = -Math.PI / 2; s.add(sea);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 32), basic(0xf4f7ff, { fog: false })); moon.position.set(-60, 70, -260); s.add(moon);
  const st = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, fog: false })); const sp = []; for (let i = 0; i < 300; i++) sp.push((hash(i) - 0.5) * 700, 30 + hash(i + 0.3) * 160, -300); st.geometry.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); s.add(st);
  const ship = new THREE.Group(); ship.position.set(18, 0, -70); s.add(ship);
  const wt = tex(256, 32, c => { c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 256, 32); c.fillStyle = '#ffd98a'; for (let x = 6; x < 250; x += 12) { c.fillRect(x, 6, 6, 6); c.fillRect(x, 20, 6, 6); } });
  box(90, 9, 12, 0x15181f, 0, 3, 0, ship); box(90, 1, 12.4, 0x8a2b22, 0, -1.2, 0, ship); const sup = new THREE.Mesh(new THREE.BoxGeometry(64, 6, 9), [M(0xf4f1e8), M(0xf4f1e8), M(0xf4f1e8), M(0xf4f1e8), new THREE.MeshLambertMaterial({ map: wt, emissive: 0x554422 }), M(0xf4f1e8)]); sup.position.set(-2, 10.5, 0); ship.add(sup);
  for (let i = 0; i < 4; i++) { box(4, 10, 4, 0xd9a03f, -22 + i * 13, 18, 0, ship); box(4.2, 2.4, 4.2, 0x15181f, -22 + i * 13, 23.4, 0, ship); }
  for (let i = 0; i < 9; i++) box(8 + hash(i) * 16, 10 + hash(i + 1) * 26, 8 + hash(i + 2) * 14, 0xe6f2ff, -70 + hash(i + 3) * 30, 6, -90 - hash(i + 4) * 30, s);
  const door = new THREE.Group(); s.add(door); box(7.4, 0.45, 4.2, 0x7a5232, 0, 0.2, 0, door); box(6.6, 0.1, 3.4, 0x8a6238, 0, 0.46, 0, door); box(0.3, 0.3, 0.3, 0xd9b24a, 3, 0.6, 0, door);
  const a = makeChar('civB', 'joy'), b = makeChar('civA', 'joy'); [a, b].forEach((ch, i) => { ch.g.scale.setScalar(0.55); ch.g.position.set(i ? 1.3 : -1.3, 0.45, 0); ch.g.rotation.y = i ? -0.35 : 0.35; door.add(ch.g); });
  const dl = new THREE.PointLight(0xffe2b8, 60, 26); dl.position.set(0, 6, 8); s.add(dl);
  return { s, cam, pre(T) { door.position.set(0, 0.2 + Math.sin(T * 1.5) * 0.18, 0); door.rotation.set(Math.sin(T * 1.1) * 0.05, 0.25, Math.sin(T * 1.4) * 0.06); ship.rotation.z = -0.2 - 0.03 * Math.sin(T * 0.5); ship.position.y = -3; [a, b].forEach((ch, i) => { ch.reset(); ch.sit(); ch.look('joy', T); ch.head.rotation.y = (i ? 1 : -1) * (0.45 + Math.sin(T * 2) * 0.1); ch.armL.rotation.z = i ? 0 : -0.5; }); } };
});
SET('nextB', () => {   // green falling code, a red pill and a blue pill
  const { s, cam } = mkScene(0x020604, [30, 110], 0x9fffc0, 0.5, [0x7dffb0, 0x020604, 0.5]);
  s.userData.bloom = 0.8;
  const N = 1400, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.5, 0.05), basic(0xffffff), N); im.frustumCulled = false; s.add(im); const dm = new THREE.Object3D(), col = new THREE.Color();
  const hand = (x, pc) => { const g = new THREE.Group(); g.position.set(x, 0, 0); s.add(g); box(3.2, 0.7, 3.4, 0xe2b089, 0, 0, 0, g); for (let i = 0; i < 4; i++) box(0.7, 0.6, 1.5, 0xe2b089, -1.2 + i * 0.8, 0.05, -2.3, g); box(0.8, 0.6, 1.6, 0xe2b089, x > 0 ? -2 : 2, 0, -0.4, g); const p = new THREE.Group(); p.position.y = 1.0; g.add(p); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 4, 12), new THREE.MeshPhongMaterial({ color: pc, emissive: pc, emissiveIntensity: 0.35, shininess: 120 })); m.rotation.z = Math.PI / 2; p.add(m); const l = new THREE.PointLight(pc, 30, 12); l.position.y = 1.2; p.add(l); return { g, p, l }; };
  const red = hand(-3.4, 0xff3040), blue = hand(3.4, 0x2f8bff);
  const key = new THREE.PointLight(0xfff0e0, 50, 30); key.position.set(0, 6, 8); s.add(key);
  return { s, cam, red, blue, pre(T) { for (let i = 0; i < N; i++) { const cx = Math.floor(hash(i) * 70) - 35, sp = 5 + hash(cx + 0.5) * 9, y = 22 - ((T * sp + hash(i + 0.3) * 30) % 30), z = -6 - hash(cx + 0.9) * 26; dm.position.set(cx * 0.8, y, z); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); im.setColorAt(i, col.setHSL(0.38, 1, hash(i + Math.floor(T * 8)) > 0.92 ? 0.85 : 0.22 + hash(i + 2) * 0.3)); } im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; } };
});
SET('nextC', () => {   // a bare interrogation room: one lamp, one table, one playing card; rain on the window
  const { s, cam } = mkScene(0x06070c, [30, 120], 0x8fa4d0, 0.25, [0x4a5578, 0x05060a, 0.45]);
  s.userData.bloom = 0.3;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), M(0x23262d)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  box(60, 24, 1, 0x2d3139, 0, 12, -14, s); box(1, 24, 60, 0x2d3139, -22, 12, 0, s);
  const wt = tex(256, 128, c => { c.fillStyle = '#0c1226'; c.fillRect(0, 0, 256, 128); for (let i = 0; i < 20; i++) { const h = 30 + hash(i) * 80, x = i * 13; c.fillStyle = '#141c36'; c.fillRect(x, 128 - h, 12, h); c.fillStyle = '#ffd98a'; for (let y = 128 - h + 5; y < 124; y += 10) if (hash(i * 5 + y) > 0.6) c.fillRect(x + 3, y, 5, 4); } });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), new THREE.MeshBasicMaterial({ map: wt })); win.position.set(4, 9.5, -13.4); s.add(win); box(22.8, 0.5, 0.6, 0x15171c, 4, 14.2, -13.3, s); box(22.8, 0.5, 0.6, 0x15171c, 4, 4.8, -13.3, s); for (const x of [-7.2, 4, 15.2]) box(0.5, 9.6, 0.6, 0x15171c, x, 9.5, -13.3, s);
  const RN = 500, rp = new Float32Array(RN * 6), rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x9fb8e0, transparent: true, opacity: 0.6 })); rain.geometry.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rain.frustumCulled = false; s.add(rain);
  box(9, 0.4, 5, 0x3a3e46, 0, 3.0, 0, s); for (const [x, z] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) box(0.4, 3, 0.4, 0x4a5058, x, 1.5, z, s);
  for (const z of [-4.6, 4.6]) { box(2.4, 0.4, 2.2, 0x3a3e46, 0, 1.7, z, s); box(2.4, 3, 0.4, 0x3a3e46, 0, 3.2, z + (z < 0 ? -1 : 1), s); }
  const lamp = new THREE.Group(); lamp.position.set(0, 14, 0); s.add(lamp); box(0.12, 5, 0.12, 0x15171c, 0, -2.5, 0, lamp); const shade = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.4, 14, 1, true), new THREE.MeshLambertMaterial({ color: 0x2f5a44, side: THREE.DoubleSide })); shade.position.y = -5.4; lamp.add(shade); const bulb = box(0.4, 0.4, 0.4, basic(0xd9c890), 0, -5.6, 0, lamp);
  const sl = new THREE.SpotLight(0xfff0c8, 230, 40, 0.6, 0.6); sl.position.set(0, -5.6, 0); sl.castShadow = true; lamp.add(sl, sl.target); sl.target.position.set(0, -14, 0);
  const cardT = tex(128, 180, c => { c.fillStyle = '#f6f2e6'; c.fillRect(0, 0, 128, 180); c.strokeStyle = '#6a3a9a'; c.lineWidth = 5; c.strokeRect(8, 8, 112, 164); c.fillStyle = '#6a3a9a'; c.font = '900 34px Inter'; c.fillText('?', 16, 44); c.save(); c.translate(64, 96); c.rotate(Math.PI / 4); c.fillStyle = '#3f9a5a'; c.fillRect(-24, -24, 48, 48); c.fillStyle = '#f6f2e6'; c.fillRect(-10, -10, 20, 20); c.restore(); c.fillStyle = '#6a3a9a'; c.fillText('?', 94, 164); });
  const card = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 2.1), [M(0xf6f2e6), M(0xf6f2e6), new THREE.MeshLambertMaterial({ map: cardT }), M(0x3a2a5a), M(0xf6f2e6), M(0xf6f2e6)]); card.castShadow = true; s.add(card);
  return { s, cam, card, lamp, pre(T) { lamp.rotation.z = Math.sin(T * 1.3) * 0.12; for (let i = 0; i < RN; i++) { const x = 4 + (hash(i) - 0.5) * 22, y = 14 - ((T * 16 + hash(i + 0.4) * 9.4) % 9.4); rp.set([x, y, -13.2, x - 0.1, y - 0.7, -13.2], i * 6); } rain.geometry.attributes.position.needsUpdate = true; } };
});
SHOT('o3:0', 'nextA', c => { c.dom(cardDom(0, c.l)); move(c.cam, [-9, 3.6, 19], [6, 5.5, -30], [-6.5, 3.0, 15], [6, 5, -30], c.k, 40); });
SHOT('o3:1', 'nextB', c => { const S = c.S, k = ease((c.k - 0.3) / 0.6); S.blue.p.position.y = 1.0 + 1.6 * k + Math.sin(c.T * 3) * 0.08; S.blue.p.rotation.y = c.T * 1.5 * k; S.blue.l.intensity = 30 + 160 * k; S.red.l.intensity = 30 * (1 - 0.7 * k); S.red.p.position.y = 1.0 + Math.sin(c.T * 3 + 1) * 0.06; c.dom(cardDom(1, c.l)); move(c.cam, [-1, 7, 16], [0, 2.4, 0], [0.8, 6, 13], [0.6, 2.8, 0], c.k, 36); });
SHOT('o3:2', 'nextC', c => { const S = c.S, k = ease((c.k - 0.15) / 0.5); S.card.position.set(0, 3.25 + Math.sin(k * Math.PI) * 1.6, 0); S.card.rotation.set(0, 0.5 + c.T * 0.25, Math.PI * (1 - k)); S.card.scale.setScalar(1.7); c.dom(cardDom(2, c.l)); move(c.cam, [-6.5, 8.5, 11.5], [0.8, 1.6, -0.5], [-4.5, 7.6, 9], [0.8, 1.4, -0.5], c.k, 36); });
SHOT('o4:0', 'outro', c => {
  orbit(c, 1.5, 1.9, 13, 4.6, 2.2, 34); const t = c.l;
  const cards = CARDS.map(([a, tt, s2, col], i) => { const k = t - 0.08 - i * 0.12; return D(150 + i * 550, 300, 500, 300, `box-sizing:border-box;border-radius:26px;background:rgba(12,14,20,.86);border:5px solid ${col};text-align:center;padding-top:26px;opacity:${clamp(k / 0.15)};transform:translateY(${(1 - ease(k / 0.3)) * 60}px)`, `<div style="display:inline-block;width:92px;height:92px;line-height:92px;border-radius:18px;background:${col};color:#14161c;font-size:72px">${a}</div><div style="font-size:${tt.length > 11 ? 44 : 56}px;margin-top:14px;line-height:1.2">${tt}</div><div style="font-size:28px;font-weight:700;color:${col};margin-top:8px">${s2}</div>`); }).join('');
  const ks = t - 0.55; c.dom(D(0, 150, 1920, 0, 'text-align:center;font-size:40px;letter-spacing:12px;color:#fff;font-weight:700', 'WHAT DO WE REIMAGINE NEXT?') + cards + D(0, 655, 1920, 0, `text-align:center;opacity:${clamp(ks / 0.1)}`, `<span style="display:inline-block;font-size:76px;letter-spacing:5px;background:#ffd24a;color:#14161c;padding:12px 44px;border-radius:14px;transform:scale(${2 - ease(ks / 0.2)}) rotate(-3deg)">TOP COMMENT GETS MADE</span>`));
});
SHOT('o4:1', 'outro', c => {
  const t = c.l, e = LINE.o4.sents[1].end - (LINE.o4.sents[1].start - 0.15), end = t > e + 0.35; orbit(c, 1.9, 2.9, lerp(13, 9.5, c.k), 3.6, 2.4, 34);
  if (!end) {
    const ar = Math.sin(t * 5) * 14, k = t;
    c.dom(D(0, 205, 1920, 0, `text-align:center;font-size:40px;letter-spacing:12px;color:#ffd24a;font-weight:700;opacity:${clamp(k / 0.2)}`, 'ONE MORE THING')
      + D(0, 275, 1920, 0, `text-align:center;font-size:106px;line-height:1.1;opacity:${clamp(k / 0.25)};transform:scale(${1.1 - 0.1 * ease(k / 0.5)});${STR}`, `SEND THIS TO THE FRIEND<br>WHO ISN'T OVER <span style="color:#ffd24a">TONY STARK</span>`)
      + D(0, 600, 1920, 0, `text-align:center;opacity:${clamp((k - 0.7) / 0.3)}`, `<span style="display:inline-flex;align-items:center;font-size:54px;letter-spacing:6px;background:#fff;color:#14161c;padding:16px 46px 16px 40px;border-radius:60px"><svg width="64" height="64" viewBox="0 0 64 64" style="margin-right:22px;transform:translateX(${ar}px)"><path d="M6 36 L40 36 L40 52 L60 30 L40 8 L40 24 L6 24 Z" fill="#14161c"/></svg>SHARE</span>`));
  } else {
    const k = t - e - 0.35;
    c.dom(D(0, 0, 1920, 1080, `background:rgba(4,5,8,${0.74 * clamp(k / 0.4)})`) + D(0, 245, 1920, 0, `text-align:center;opacity:${clamp(k / 0.4)}`, `<div style="font-size:32px;letter-spacing:14px;color:#c9ced8;font-weight:700">AVENGERS: ENDGAME, REIMAGINED IN BLOCKS</div><div style="font-size:176px;letter-spacing:${lerp(30, 16, ease(k / 1.2))}px;line-height:1.1;margin-left:16px">ENDGAME</div><div style="display:inline-block;margin-top:8px;font-size:54px;letter-spacing:6px;color:#14161c;background:#ffd24a;padding:10px 36px;border-radius:10px">THE SECOND FUTURE</div><div style="margin-top:44px;font-size:36px;font-weight:700;color:#d6dbe4;letter-spacing:3px;opacity:${clamp((k - 0.6) / 0.4)}">Comment <b style="color:#ffd24a">TONY</b> or <b style="color:#8fd0ff">POWERS</b>  ·  Tell us what to reimagine next</div>`));
  }
});
