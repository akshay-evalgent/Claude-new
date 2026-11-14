// Chapter 4: The Return (d1-d9) + Chapter 5: Assemble (e1-e11)
import { THREE, SET, SHOT, LINE, getSet, mkScene, move, shot, shake, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, label, makeChar, ground, makeGauntlet, portalFx, CAST } from './engine.js';

const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
// stretch a unit box between two points (beams, bolts, webs)
function seg(m, a, b, w = 0.25) { const A = V3(a), B = V3(b); m.visible = true; m.position.copy(A).lerp(B, 0.5); m.lookAt(B); m.scale.set(w, w, Math.max(0.01, A.distanceTo(B))); }
const glowBox = (col, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: col, fog: false })); m.visible = false; parent.add(m); return m; };
const kneel = ch => { ch.legL.rotation.x = 1.5; ch.legR.rotation.x = 1.5; ch.body.position.y = -1.5; };
const run = (ch, T, sp = 13) => { ch.walk(T * sp, 1.0); ch.body.rotation.x = 0.35; };

// ---------------- COMPOUND LAB (d1, d2) ----------------
SET('lab', () => {
  const { s, cam } = mkScene(0xa9c8e4, [60, 200], 0xfff0d8, 1.4, [0xcfd8e6, 0x3a3e48, 1.0], [-10, 30, -40], 40);
  s.userData.bloom = 0.5;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 50), new THREE.MeshPhongMaterial({ color: 0x3a3e46, shininess: 60 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  box(60, 0.6, 50, 0x2a2d33, 0, 15, 0, s); box(0.6, 15, 50, 0x4a4f58, -26, 7.5, 0, s); box(0.6, 15, 50, 0x4a4f58, 26, 7.5, 0, s);
  box(16, 15, 0.6, 0x4a4f58, -19, 7.5, -14, s); box(16, 15, 0.6, 0x4a4f58, 19, 7.5, -14, s); box(22, 2.2, 0.6, 0x4a4f58, 0, 1.1, -14, s); box(22, 2.4, 0.6, 0x4a4f58, 0, 13.8, -14, s);
  for (const x of [-11, -3.7, 3.7, 11]) box(0.4, 10.4, 0.5, 0x23262b, x, 7.4, -14, s);
  // outside: lawn + trees
  const lawn = box(300, 0.4, 200, 0x5f9a52, 0, -0.3, -120, s); lawn.castShadow = false;
  const trees = [[-7, -30], [8, -36], [20, -44], [-22, -48]].map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0, z); s.add(g); box(1.4, 9, 1.4, 0x5a3d26, 0, 4.5, 0, g); box(8, 6, 8, 0x2f6b45, 0, 11, 0, g); box(5.5, 4, 5.5, 0x3a7a50, 0, 15, 0, g); box(5, 0.5, 0.8, 0x5a3d26, 3.6, 7.2, 0.5, g); return g; });
  const birds = [0, 1, 2, 3, 4, 5, 6].map(i => { const g = new THREE.Group(); s.add(g); box(0.7, 0.5, 1.0, [0x3a6fd0, 0xd04a3a, 0xe2c12f][i % 3], 0, 0, 0, g); box(0.3, 0.3, 0.3, 0xe2a12f, 0, 0, 0.6, g); const wl = box(1.1, 0.1, 0.6, 0x2a2d33, -0.8, 0.1, 0, g), wr = box(1.1, 0.1, 0.6, 0x2a2d33, 0.8, 0.1, 0, g); g.userData = { wl, wr }; return g; });
  // work table + stand
  box(7, 0.4, 3.4, 0x8a9199, 13, 3.0, 6, s); box(0.5, 3, 0.5, 0x4a4f58, 10, 1.5, 6, s); box(0.5, 3, 0.5, 0x4a4f58, 16, 1.5, 6, s);
  const phone = new THREE.Group(); phone.position.set(12.4, 3.28, 6.3); s.add(phone); box(1.0, 0.14, 1.9, 0x15161a, 0, 0, 0, phone);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.7), new THREE.MeshBasicMaterial({ map: tex(128, 256, c => { c.fillStyle = '#1c2a3a'; c.fillRect(0, 0, 128, 256); c.fillStyle = '#7a9a6a'; c.beginPath(); c.arc(64, 86, 34, 0, 7); c.fill(); c.fillStyle = '#f0cdb0'; c.beginPath(); c.arc(64, 78, 18, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '900 30px Inter'; c.textAlign = 'center'; c.fillText('LAURA', 64, 166); c.font = '700 13px Inter'; c.fillStyle = '#9fb4c8'; c.fillText('incoming call', 64, 188); c.fillStyle = '#3ad06a'; c.beginPath(); c.arc(92, 224, 16, 0, 7); c.fill(); c.fillStyle = '#e04a4a'; c.beginPath(); c.arc(36, 224, 16, 0, 7); c.fill(); }) })); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.08; phone.add(scr);
  const pl = new THREE.PointLight(0x9fd0ff, 0, 10); pl.position.set(12.4, 4.6, 6.3); s.add(pl);
  const N = { hulk: [0, 0, -3, 0], tonyArmor: [-9, 0, 2, 0.5], steve: [9, 0, 1, -0.5], thor: [-14, 0, -3, 0.7], clint: [15, 0, -1, -0.9], rocket: [5.5, 0, 5, -0.3], nebula: [-5.5, 0, 6, 0.3], scott: [-17, 0, 4, 0.9] };
  const ch = {}; for (const n in N) { ch[n] = makeChar(n, 'serious'); s.add(ch[n].g); }
  const g = makeGauntlet(0xa8211f); g.scale.setScalar(1.15); ch.hulk.armR.add(g); g.position.set(0, -2.0, 0.1);
  const burn = [0, 1, 2, 3, 4, 5].map(i => { const m = glowBox([0xb050ff, 0x3a8aff, 0xff3838, 0xffa030, 0xffe84a, 0x4aff7a][i], ch.hulk.armR); return m; });
  const char = box(1.02, 2.0, 1.02, 0x2a241c, 0, -0.9, 0, ch.hulk.armR); char.visible = false;
  const el = new THREE.PointLight(0xffb060, 0, 40); s.add(el);
  const warm = new THREE.PointLight(0xffe2b0, 0, 70); warm.position.set(0, 12, -6); s.add(warm);
  for (const x of [-12, 12]) { const p = new THREE.PointLight(0xcfe0ff, 220, 60); p.position.set(x, 12, 10); s.add(p); }
  return { s, cam, ch, N, g, burn, char, el, warm, phone, pl, birds, trees,
    pre(T) { for (const n in N) { ch[n].reset(); ch[n].g.visible = true; put(ch[n], ...N[n]); ch[n].idle(T + N[n][0]); ch[n].look('serious', T); } burn.forEach(b => b.visible = false); char.visible = false; el.intensity = 0; warm.intensity = 0; pl.intensity = 0; phone.rotation.y = 0; g.userData.glow.intensity = 0; birds.forEach(b => b.visible = false); } };
});
const burnArm = (S, T, a) => { S.burn.forEach((b, i) => { const y = -2 + ((T * 2.2 + i / 6) % 1) * 2.4 * a; b.visible = a > 0.05; b.position.set(Math.sin(T * 17 + i * 2) * 0.55, y, Math.cos(T * 13 + i) * 0.55); b.scale.setScalar(0.22 + hash(i + Math.floor(T * 12)) * 0.3); }); S.el.position.set(2.4, 7, -1); S.el.intensity = a * (120 + Math.sin(T * 31) * 60); S.el.color.setHSL((T * 0.9) % 1, 0.9, 0.6); S.char.visible = a > 0.5; S.char.scale.y = 2.0 * clamp((a - 0.5) * 2); S.char.position.y = -1.9 + S.char.scale.y / 2; };
SHOT('d1:0', 'lab', c => { const S = c.S, h = S.ch.hulk, k = ease((c.k - 0.35) / 0.5); h.armR.rotation.x = -1.3 * k; h.head.rotation.x = 0.25 * k; h.head.rotation.y = -0.3 * k; S.g.scale.setScalar(1.15 * (0.6 + 0.4 * k)); move(c.cam, [0, 9, 34], [0, 5.5, -2], [3, 7, 20], [1, 6, -3], c.k, 36); });
SHOT('d1:1', 'lab', c => {
  const S = c.S, h = S.ch.hulk, [i, k] = cuts(c.k, [0.55]); burnArm(S, c.T, 0.3 + c.k * 0.7); h.armR.rotation.x = -1.3; h.armR.rotation.z = Math.sin(c.T * 40) * 0.05; h.look('sad', c.T); h.head.rotation.x = -0.2 + Math.sin(c.T * 23) * 0.06; h.body.position.y = -c.k * 0.8; h.legL.rotation.x = h.legR.rotation.x = -0.3 * c.k;
  for (const n of ['tonyArmor', 'steve', 'thor', 'clint']) { const a = S.ch[n]; a.look('surprised', c.T); a.armL.rotation.x = -1.9; a.armL.rotation.z = 0.5; a.body.rotation.x = -0.12; }
  if (i === 0) { move(c.cam, [7, 6.5, 13], [1.5, 6.6, -3], [5.5, 6.5, 10.5], [1.5, 6.6, -3], k, 34); shake(c.cam, c.T, 0.05); }
  else { move(c.cam, [-5, 4.6, 15], [-11.5, 4.3, 0], [-6, 4.6, 13.5], [-11.5, 4.3, 0], k, 36); shake(c.cam, c.T, 0.06); }
});
SHOT('d1:2', 'lab', c => {
  const S = c.S, h = S.ch.hulk, sn = clamp((c.l - 0.55) / 0.12); burnArm(S, c.T, 1); h.look('serious', c.T); h.armR.rotation.x = -2.5; h.armR.rotation.z = 0.25; h.body.position.y = -0.8; S.g.userData.glow.intensity = 60;
  move(c.cam, [6, 5, 13], [1.8, 9, -3], [5, 5.4, 11], [1.8, 9.4, -3], c.k, 36); shake(c.cam, c.T, 0.07);
  if (sn > 0) c.flash(c.l < 1.15 ? 1 : 1 - (c.l - 1.15) / 0.5);
});
SHOT('d2:0', 'lab', c => {
  const S = c.S; S.warm.intensity = 160; S.s.userData.sun.intensity = 2.6; S.ch.scott.reset(); put(S.ch.scott, -6, 0, -10, Math.PI + 0.3); S.ch.scott.look('surprised', c.T); S.ch.scott.head.rotation.x = -0.25;
  S.birds.forEach((b, i) => { const k = clamp(c.k * 1.5 - i * 0.09), e = ease(k), tx = -7 + 3.6 + (i - 3) * 0.75, ty = 7.9, tz = -29.4; b.visible = true; b.position.set(lerp(30 + i * 5, tx, e), lerp(22 + (i % 3) * 4, ty, e) + Math.sin(k * 9 + i) * (1 - e) * 2, lerp(-70 - i * 6, tz, e)); b.rotation.y = -1.1; const fl = k < 1 ? Math.sin(c.T * 22 + i) * 0.9 : 0.1; b.userData.wl.rotation.z = fl; b.userData.wr.rotation.z = -fl; });
  move(c.cam, [-1, 6.5, 6], [-4, 8, -30], [-3, 7, -4], [-4, 8.2, -30], c.k, 34);
});
SHOT('d2:1', 'lab', c => { const S = c.S; S.warm.intensity = 160; S.pl.intensity = 14 + Math.sin(c.T * 20) * 6; S.phone.rotation.y = Math.sin(c.T * 60) * 0.06; S.phone.position.x = 12.4 + Math.sin(c.T * 47) * 0.04; const cl = S.ch.clint; cl.reset(); put(cl, 12.6, 0, 1.6, 0.05); cl.look('surprised', c.T); cl.head.rotation.x = 0.45; cl.armR.rotation.x = -1.1 * ease(c.k * 1.4); move(c.cam, [10.6, 7.2, 10.5], [12.4, 3.3, 6.2], [11.4, 6.2, 9.4], [12.4, 3.3, 6.2], c.k, 30); });
SHOT('d2:2', 'lab', c => { const S = c.S; S.warm.intensity = 160; S.phone.visible = c.k < 0; S.ch.steve.g.visible = false; S.ch.rocket.g.visible = false; const cl = S.ch.clint; cl.reset(); put(cl, 12.6, 0, 1.6, 0.15); cl.look(c.k > 0.45 ? 'joy' : 'surprised', c.T); cl.armR.rotation.x = -2.6; cl.armR.rotation.z = -0.55; cl.head.rotation.z = -0.1; S.pl.intensity = 30; S.pl.position.set(11, 6, 6); move(c.cam, [8.6, 5, 12.5], [12.5, 4.7, 1.6], [9.4, 5, 11], [12.5, 4.75, 1.6], c.k, 30); if (c.k > 0.999) S.phone.visible = true; else S.phone.visible = false; });

// ---------------- COMPOUND EXTERIOR (d3) ----------------
SET('compound', () => {
  const { s, cam } = mkScene(0x9fb8d0, [80, 520], 0xfff0d8, 2.2, [0xffffff, 0x6a8a5a, 1.3], [30, 40, 40], 80);
  s.userData.bloom = 0.5;
  ground(s, 700, '#5f9a52', '#69a65c');
  const B = new THREE.Group(); s.add(B);
  box(90, 14, 30, 0xe9edf2, 0, 7, -40, B); box(60, 10, 26, 0xdfe5ec, -10, 19, -42, B); box(92, 1, 32, 0xcfd6de, 0, 14.2, -40, B);
  for (let i = -5; i <= 5; i++) box(6, 7, 0.4, 0x6fa3c8, i * 8, 7, -24.8, B);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ transparent: true, map: tex(256, 256, c => { c.strokeStyle = '#3a4a5a'; c.lineWidth = 26; c.lineJoin = 'round'; c.beginPath(); c.arc(128, 128, 104, 0.6, 5.9); c.stroke(); c.beginPath(); c.moveTo(70, 220); c.lineTo(128, 40); c.lineTo(186, 220); c.moveTo(92, 158); c.lineTo(190, 158); c.stroke(); }) })); logo.position.set(-10, 19, -28.8); B.add(logo);
  const r = rng(5); for (let i = 0; i < 30; i++) { const x = (r() - 0.5) * 380, z = -90 - r() * 120, g = new THREE.Group(); g.position.set(x, 0, z); s.add(g); box(1.6, 12, 1.6, 0x5a3d26, 0, 6, 0, g); box(9, 7, 9, 0x2f6b45, 0, 14, 0, g); }
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x1a1024, fog: false })); hole.position.set(0, 190, -230); hole.lookAt(0, 0, 60); s.add(hole);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.12, 40), new THREE.MeshBasicMaterial({ color: 0xffb060, fog: false, side: THREE.DoubleSide })); rim.position.copy(hole.position); rim.quaternion.copy(hole.quaternion); s.add(rim);
  const ship = new THREE.Group(); s.add(ship); const dk = new THREE.MeshLambertMaterial({ color: 0x23202a, fog: false });
  box(40, 26, 150, dk, -60, 0, 0, ship); box(40, 26, 150, dk, 60, 0, 0, ship); box(100, 14, 40, dk, 0, 0, 0, ship); for (let i = 0; i < 8; i++) box(6, 3, 3, new THREE.MeshBasicMaterial({ color: 0xffb060, fog: false }), -60 + (i % 2) * 120, -8 + (i >> 1) * 5, 76, ship);
  const MN = 46, mis = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.9, 5), new THREE.MeshBasicMaterial({ color: 0xffc070, fog: false }), MN); mis.frustumCulled = false; s.add(mis);
  const ex = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd070 : 0xff8a2a, fog: false })); s.add(m); return m; });
  const DN = 260, deb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0xcfd6de), DN); deb.frustumCulled = false; s.add(deb);
  const crater = new THREE.Mesh(new THREE.CircleGeometry(62, 30), M(0x4a3a2e)); crater.rotation.x = -Math.PI / 2; crater.position.set(0, 0.15, -40); s.add(crater);
  const dm = new THREE.Object3D();
  return { s, cam, B, ship, hole, rim,
    // k: 0..1 over the whole attack
    set(k, T) {
      const open = ease(k / 0.3); hole.scale.setScalar(1 + open * 120); rim.scale.setScalar(1 + open * 120); rim.rotation.z = T;
      const sd = ease(clamp((k - 0.1) / 0.5)); ship.position.set(0, lerp(230, 120, sd), lerp(-300, -200, sd)); ship.rotation.x = 0.25; ship.visible = k > 0.08;
      const hit = clamp((k - 0.62) / 0.38);
      for (let i = 0; i < MN; i++) { const st = 0.36 + hash(i) * 0.36, t = clamp((k - st) / 0.2), tx = (hash(i + 3) - 0.5) * 90, tz = -40 + (hash(i + 5) - 0.5) * 30; const sx = (hash(i + 1) > 0.5 ? 60 : -60), p0 = [sx, ship.position.y - 10, ship.position.z + 70]; dm.position.set(lerp(p0[0], tx, t), lerp(p0[1], 6, t), lerp(p0[2], tz, t)); dm.lookAt(tx, 6, tz); dm.scale.setScalar(t > 0 && t < 1 ? 1 : 0.0001); dm.updateMatrix(); mis.setMatrixAt(i, dm.matrix); } mis.instanceMatrix.needsUpdate = true;
      ex.forEach((m, i) => { const st = 0.56 + i * 0.045, t = clamp((k - st) / 0.3); m.visible = t > 0 && t < 1; m.position.set((hash(i + 11) - 0.5) * 80, 8 + t * 14, -40 + (hash(i + 13) - 0.5) * 24); m.scale.setScalar(3 + t * 17); });
      B.visible = hit < 0.35; B.position.y = -hit * 20; crater.visible = hit > 0.3;
      for (let i = 0; i < DN; i++) { const t = hit * (0.7 + hash(i) * 0.6), a = hash(i + 2) * 6.28, sp = 20 + hash(i + 4) * 70, y = 6 + t * (50 + hash(i + 6) * 80) - t * t * 90; dm.position.set(Math.cos(a) * sp * t + (hash(i + 8) - 0.5) * 80, Math.max(0.5, y), -40 + Math.sin(a) * sp * t * 0.8 + 6 * t); dm.rotation.set(t * 5 + i, i, t * 4); dm.scale.setScalar(hit > 0.02 ? 1.5 + hash(i + 9) * 5 : 0.0001); dm.updateMatrix(); deb.setMatrixAt(i, dm.matrix); } deb.instanceMatrix.needsUpdate = true;
    } };
});
SHOT('d3', 'compound', c => {
  const S = c.S; S.set(c.k, c.T); const [i, k] = cuts(c.k, [0.34, 0.66]);
  if (i === 0) move(c.cam, [20, 4, 60], [0, 60, -120], [14, 4, 52], [0, 120, -200], k, 46);
  else if (i === 1) { move(c.cam, [-50, 10, 40], [0, 70, -150], [-44, 9, 34], [0, 40, -90], k, 48); shake(c.cam, c.T, 0.15); }
  else { move(c.cam, [30, 16, 70], [0, 12, -40], [40, 22, 92], [0, 16, -40], k, 44); shake(c.cam, c.T, 0.5 * (1 - k * 0.5)); if (k < 0.12) c.flash(1 - k / 0.12); if (k > 0.86) c.flash((k - 0.86) / 0.14); }
});

// ---------------- BATTLEFIELD extras ----------------
function EX(S) {
  if (S._a3) return S._a3;
  const s = S.s, e = {};
  e.bolts = [0, 1, 2, 3].map(() => [0, 1, 2, 3, 4].map(() => glowBox(0xcfe8ff, s)));
  e.beams = [0, 1, 2, 3, 4, 5].map(() => glowBox(0xffffff, s));
  e.light = new THREE.PointLight(0xffffff, 0, 60); s.add(e.light);
  e.slab = box(7, 2.6, 5, 0x6a655e, 0, 1.3, -16, s); e.slab2 = box(6, 5, 2.4, 0x7b756d, 0, 2.2, 0, s); e.slab2.rotation.x = -0.25;
  e.out = [0, 1, 2, 3, 4, 5, 6, 7].map(() => { const o = makeChar('outrider', 'menace'); s.add(o.g); return o; });
  e.al = ['civA', 'civB', 'civC', 'civD', 'laura', 'civA', 'civC'].map(n => { const o = makeChar(n, 'serious'); s.add(o.g); return o; });
  e.spears = e.al.map(a => { const g = box(0.16, 6, 0.16, 0xb9c0c9, 0.2, -1.2, 0.6, a.armR); return g; });
  e.mand = [0, 1, 2, 3, 4, 5].map(() => { const g = new THREE.Group(); s.add(g); const mt = new THREE.MeshBasicMaterial({ color: 0xffa030, side: THREE.DoubleSide, fog: false }); g.add(new THREE.Mesh(new THREE.RingGeometry(1.25, 1.45, 24), mt)); g.add(new THREE.Mesh(new THREE.RingGeometry(0.7, 0.8, 4), mt)); const q = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.05, 4), mt); q.rotation.z = 0.785; g.add(q); return g; });
  e.port = [[-13, 26, 0x7fc98a], [13, 28, 0xffe2a8], [0, 36, 0x6a4a9a]].map(([x, z, col]) => { const p = portalFx(s, col, 5.2); p.position.x = x; p.position.z = z; return p; });
  e.gship = new THREE.Group(); s.add(e.gship); box(7, 1.6, 9, 0xd9822f, 0, 0, 0, e.gship); box(16, 0.5, 5, 0x3f6a8f, 0, 0.3, -1, e.gship); box(3, 1.2, 3, 0x9fd0ff, 0, 1, 2.6, e.gship); box(1.2, 1.2, 1.2, new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), -3, 0, -5, e.gship); box(1.2, 1.2, 1.2, new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), 3, 0, -5, e.gship);
  e.horse = new THREE.Group(); s.add(e.horse); box(1.6, 1.8, 4.2, 0xf2f2ee, 0, 0, 0, e.horse); box(1.1, 2.2, 1.2, 0xf2f2ee, 0, 1.5, 2.3, e.horse); box(1.0, 1.0, 1.8, 0xf2f2ee, 0, 2.4, 3.2, e.horse); for (const [x, z] of [[-0.5, 1.5], [0.5, 1.5], [-0.5, -1.5], [0.5, -1.5]]) box(0.45, 2.2, 0.45, 0xe2e2dc, x, -1.9, z, e.horse);
  e.wings = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 0.8, 0.8, 0.3); e.horse.add(p); box(5.2, 0.2, 2.6, 0xffffff, sx * 2.6, 0, 0, p); return p; });
  e.stones = new THREE.Group(); s.add(e.stones); [0xb050ff, 0x3a8aff, 0xff3838, 0xffa030, 0xffe84a, 0x4aff7a].forEach((col, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: col, fog: false })); m.position.set(Math.cos(i * 1.047) * 0.45, Math.sin(i * 1.047) * 0.45, 0); e.stones.add(m); });
  e.sl = new THREE.PointLight(0xffc070, 0, 22); e.stones.add(e.sl);
  e.ear = glowBox(0x9fe8ff, s); e.arcOff = box(0.9, 0.9, 0.1, 0x1c1210, 0, 0, 0, s);
  e.repulsor = glowBox(0xbff2ff, s); e.aura = new THREE.PointLight(0xffd070, 0, 40); s.add(e.aura);
  e.finger = box(0.26, 0.8, 0.26, CAST.strange.skin, 0.2, -2.55, 0.2, S.H('strange').armR);
  e.boom = [0, 1, 2, 3].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd070 : 0xff8a2a, fog: false })); m.visible = false; s.add(m); return m; });
  e.reset = () => {
    e.bolts.flat().forEach(m => m.visible = false); e.beams.forEach(m => m.visible = false); e.light.intensity = 0; e.slab.visible = e.slab2.visible = false;
    e.out.forEach(o => { o.reset(); o.g.visible = false; }); e.al.forEach(o => { o.reset(); o.g.visible = false; }); e.spears.forEach(p => p.visible = false); e.mand.forEach(m => m.visible = false);
    e.port.forEach(p => p.userData.set(0, 0)); e.gship.visible = e.horse.visible = e.stones.visible = e.ear.visible = e.arcOff.visible = e.repulsor.visible = e.finger.visible = false; e.sl.intensity = 0; e.aura.intensity = 0; e.boom.forEach(m => m.visible = false);
    S.gauntlet.userData.stones.forEach(m => m.visible = true); S.gauntlet.userData.glow.intensity = 0;
  };
  const pre = S.pre; S.pre = function (T) { pre.call(this, T); e.reset(); };
  e.reset(); S._a3 = e; return e;
}
// jagged lightning from a to b
function bolt(e, i, a, b, T, w = 0.3) { const q = Math.floor(T * 18) + i * 7; let p = a; for (let j = 0; j < 5; j++) { const t = (j + 1) / 5, n = j === 4 ? b : [lerp(a[0], b[0], t) + (hash(q + j) - 0.5) * 3, lerp(a[1], b[1], t), lerp(a[2], b[2], t) + (hash(q + j + 9) - 0.5) * 3]; seg(e.bolts[i][j], p, n, w); p = n; } }
const beam = (e, i, a, b, col, w = 0.3) => { e.beams[i].material.color.set(col); seg(e.beams[i], a, b, w); };
const lit = (e, p, col, I) => { e.light.position.set(...p); e.light.color.set(col); e.light.intensity = I; };
const BAT = (key, fn) => SHOT(key, 'battle', c => { const S = c.S, e = EX(S); S.pre(c.T); fn(c, S, e); S.post(c.T); });
const TH = [0, 0, -14];
// Thanos helpers
const thanos = (S, c, expr = 'menace', x = TH[0], z = TH[2], ry = 0) => { const t = S.H('thanos'); S.place(t, x, 0, z, ry); t.idle(c.T); t.look(expr, c.T); return t; };
const trio = (S, c, z = 10) => { const iron = S.H('ironman'), thor = S.H('thor'), cap = S.H('steve'); S.place(iron, -6, 0, z); S.place(thor, 0, 0, z + 1); S.place(cap, 6, 0, z); thor.look('serious', c.T); cap.look('serious', c.T); S.hold(S.axe, thor, 'R').position.set(0, -4.2, 0.4); S.hold(S.hammer, thor, 'L').position.set(0, -2.6, 0.5); S.hammer.rotation.x = Math.PI; const sh = S.hold(S.shield, cap, 'L'); sh.position.set(-0.62, -1.1, 0.2); sh.rotation.y = -Math.PI / 2; return { iron, thor, cap }; };
const capShield = (S, cap, broken = false) => { const sh = S.hold(broken ? S.shieldBroken : S.shield, cap, 'L'); sh.position.set(-0.62, -1.1, 0.2); sh.rotation.y = -Math.PI / 2; return sh; };

// ---------- d4 / d5: Thanos waits ----------
BAT('d4:0', (c, S, e) => { const t = thanos(S, c, 'serious'); t.sit(); e.slab.visible = true; S.ship.visible = true; S.sword.visible = true; S.sword.position.set(5.2, 3.6, -12.5); S.sword.rotation.z = 0.12; S.sword.scale.setScalar(1.5); if (c.l < 0.3) c.flash(1 - c.l / 0.3); move(c.cam, [16, 5, 22], [0, 7, -14], [10, 4.4, 12], [0, 6.5, -14], c.k, 38); });
BAT('d4:1', (c, S, e) => { const t = thanos(S, c, 'menace'); t.sit(); e.slab.visible = true; S.sword.visible = true; S.sword.position.set(5.2, 3.6, -12.5); S.sword.scale.setScalar(1.5); t.head.rotation.x = 0.12; move(c.cam, [2.4, 8.4, 2], [0, 8.2, -14], [1.4, 8.3, -1.5], [0, 8.2, -14], c.k, 28); });
BAT('d5', (c, S, e) => {
  const t = thanos(S, c, 'menace'), [i, k] = cuts(c.k, [0.5]); S.ship.visible = true; S.sword.visible = true; S.sword.scale.setScalar(1.5); t.look('menace', c.T, c.talk);
  if (i === 0) { t.sit(); e.slab.visible = true; S.sword.position.set(5.2, 3.6, -12.5); t.body.rotation.x = 0.12; move(c.cam, [-3, 7.6, 0], [0, 8.2, -14], [-2, 7.8, -2.5], [0, 8.2, -14], k, 28); }
  else { e.slab.visible = true; t.g.position.z = -11; S.hold(S.sword, t, 'R'); S.sword.position.set(0, -2.1, 0.4); S.sword.rotation.x = 1.2; move(c.cam, [-5, 1.6, 2], [0, 7.4, -11], [-3.5, 1.6, 0.5], [0, 7.8, -11], k, 40); }
});
// ---------- d6: three walk out ----------
BAT('d6:0', (c, S, e) => { const z = lerp(34, 24, c.k), { iron, thor, cap } = trio(S, c, z); [iron, thor, cap].forEach((h, i) => h.walk(c.T * 5.5 + i * 2, 0.5)); move(c.cam, [2, 2.6, z - 20], [0, 4.2, z], [-1, 2.8, z - 17], [0, 4.2, z], c.k, 38); });
BAT('d6:1', (c, S, e) => { const { iron } = trio(S, c, 24); iron.armR.rotation.x = -1.5 * ease(c.k * 2.5); iron.g.position.y = ease(c.k) * 1.2; iron.legL.rotation.x = 0.2; e.repulsor.visible = c.k > 0.3; e.repulsor.position.set(-7.4, 4.1 + ease(c.k) * 1.2, 21.4); e.repulsor.scale.setScalar(0.3 + Math.sin(c.T * 30) * 0.06); lit(e, [-7.4, 5, 20], 0x9fe8ff, 60 * c.k); move(c.cam, [-9, 3.4, 13], [-6, 4.8, 24], [-8, 3.6, 15], [-6, 5.4, 24], c.k, 32); });
BAT('d6:2', (c, S, e) => { const { thor } = trio(S, c, 24); thor.armR.rotation.z = 2.3; thor.armL.rotation.z = -2.3; thor.look('menace', c.T); bolt(e, 0, [4, 60, 30], [3.4, 11.5, 25], c.T, 0.4); bolt(e, 1, [-5, 60, 20], [-3.4, 10.5, 25], c.T, 0.4); lit(e, [0, 12, 22], 0xcfe8ff, 500 * (0.5 + hash(Math.floor(c.T * 20)) * 0.5)); if (c.l < 0.1) c.flash(0.7); move(c.cam, [2, 3, 6], [0, 5.2, 25], [1.2, 3.2, 8.5], [0, 5.4, 25], c.k, 40); shake(c.cam, c.T, 0.05); });
BAT('d6:3', (c, S, e) => { const { cap } = trio(S, c, 24); cap.armL.rotation.x = -1.2; cap.armL.rotation.z = -0.5; cap.armR.rotation.x = -1.1; cap.armR.rotation.z = -0.75 + Math.sin(c.T * 10) * 0.08; cap.head.rotation.x = 0.12; move(c.cam, [8.5, 4.6, 14.5], [6, 4.5, 24], [7.6, 4.7, 16], [6, 4.6, 24], c.k, 30); });
// ---------- d7: they lose / the hammer ----------
BAT('d7:0', (c, S, e) => {
  const t = thanos(S, c, 'menace', 0, -6); S.hold(S.sword, t, 'R'); S.sword.position.set(0, -2.1, 0.4); S.sword.scale.setScalar(1.3); t.armR.rotation.x = -2.2 + c.k * 2.6; t.body.rotation.y = 0.6 - c.k * 1.2;
  const iron = S.H('ironman'); S.place(iron, lerp(-3, -30, c.k), 3 + Math.sin(c.k * 3.1) * 12, lerp(0, 22, c.k)); iron.g.rotation.set(c.k * 9, 0, c.k * 5);
  const cap = S.H('steve'); S.place(cap, lerp(6, 14, c.k), Math.sin(c.k * 3.1) * 3, lerp(2, 16, c.k)); cap.g.rotation.x = -c.k * 1.4; capShield(S, cap);
  lit(e, [0, 6, 0], 0xffb060, 500 * (1 - c.k));
  if (c.l < 0.15) c.flash(0.8 - c.l * 5); move(c.cam, [26, 5, 14], [0, 6, 2], [24, 5.5, 18], [-4, 7, 6], c.k, 44); shake(c.cam, c.T, 0.3);
});
BAT('d7:1', (c, S, e) => {
  const thor = S.H('thor'); S.place(thor, -6, 0.75, 2, Math.PI); thor.g.rotation.x = Math.PI / 2; thor.look('sad', c.T); thor.armL.rotation.x = -1.4; thor.armR.rotation.x = -1.4; thor.armL.rotation.z = -0.3; thor.armR.rotation.z = 0.3;
  const t = thanos(S, c, 'menace', -6, -3.4); t.body.rotation.x = 0.55; t.armL.rotation.x = -1.0; t.armR.rotation.x = -1.0; t.legL.rotation.x = -0.4;
  S.axe.visible = true; S.axe.position.set(-6, 2.2 + Math.sin(c.T * 30) * 0.06 - c.k * 0.5, 2.2); S.axe.rotation.set(0.9, 0, Math.PI); S.axe.scale.setScalar(1.2);
  move(c.cam, [5, 1.6, 9], [-6, 3.2, 0], [3.5, 1.9, 8], [-6, 3, 0.5], c.k, 38); shake(c.cam, c.T, 0.04);
});
BAT('d7:2', (c, S, e) => {
  const [i, k] = cuts(c.k, [0.3, 0.6]); S.hammer.visible = true;
  const cap = S.H('steve'), t = S.H('thanos');
  if (i === 0) { const up = ease((k - 0.45) / 0.55); S.hammer.position.set(14 + Math.sin(c.T * 45) * 0.05 * (1 - up), -0.9 + up * 3.4 + Math.abs(Math.sin(c.T * 38)) * 0.12, -4); S.hammer.rotation.set(0, 0.6 + up * 3, 0.15 * (1 - up)); S.hammer.scale.setScalar(1.3); move(c.cam, [18, 1.0, 1.5], [14, 1.0, -4], [17, 1.4, 0.5], [14, 2.6, -4], k, 34); }
  else if (i === 1) {
    S.place(t, -6, 0, -3.4, 0); t.look('surprised', c.T); t.body.rotation.x = 0.4 - ease(k * 3) * 0.7; S.place(S.H('thor'), -6, 0.75, 2, Math.PI).g.rotation.x = Math.PI / 2; S.H('thor').look('surprised', c.T);
    const p = k < 0.5 ? [lerp(14, -6, k * 2), 4 + k * 8, lerp(-4, -5, k * 2)] : [lerp(-6, 12, (k - 0.5) * 2), lerp(8, 5.5, (k - 0.5) * 2), lerp(-5, 14, (k - 0.5) * 2)]; S.hammer.position.set(...p); S.hammer.rotation.set(c.T * 20, 0, 1.5); S.hammer.scale.setScalar(1.3);
    if (Math.abs(k - 0.5) < 0.08) { c.flash(0.8); } move(c.cam, [-18, 4, 12], [-4, 7, -3], [-15, 4, 16], [2, 6, 4], k, 44); shake(c.cam, c.T, k > 0.45 ? 0.25 : 0.05);
  } else {
    S.place(cap, 12, 0, 14); cap.look('serious', c.T); capShield(S, cap); S.hold(S.hammer, cap, 'R'); S.hammer.position.set(0, -2.9, 0.5); S.hammer.rotation.x = Math.PI; S.hammer.scale.setScalar(1.15); cap.armR.rotation.x = -0.5 - ease(k * 3) * 0.4; cap.armR.rotation.z = 0.4;
    bolt(e, 0, [14, 60, 16], [13.6, 5.5, 13], c.T, 0.3); lit(e, [12, 8, 11], 0xcfe8ff, 260 * (0.5 + hash(Math.floor(c.T * 20)) * 0.5)); if (k < 0.08) c.flash(0.9); move(c.cam, [10, 2.6, 2], [12, 4.4, 14], [10.6, 2.8, 4.5], [12, 4.6, 14], k, 36);
  }
});
BAT('d8', (c, S, e) => { const thor = S.H('thor'); S.place(thor, -6, 0.75, 2, Math.PI); thor.g.rotation.x = Math.PI / 2; thor.head.rotation.x = 0.95; thor.look('joy', c.T, c.talk); thor.armR.rotation.x = -2.2; thor.armR.rotation.z = 0.2; move(c.cam, [-4.4, 4.6, -1.5], [-6, 1.9, 6.4], [-4.8, 4.2, -0.6], [-6, 1.9, 6.4], c.k, 32); });
// ---------- d9: the shield breaks, Steve alone ----------
BAT('d9:0', (c, S, e) => {
  const t = thanos(S, c, 'surprised', 0, -4), cap = S.H('steve'); S.place(cap, 5.5, Math.sin(c.k * 3.1) * 2.5, -1.5, Math.PI + 0.9); cap.look('serious', c.T); capShield(S, cap); S.hold(S.hammer, cap, 'R'); S.hammer.position.set(0, -2.9, 0.5); S.hammer.rotation.x = Math.PI; S.hammer.scale.setScalar(1.15); cap.armR.rotation.x = -2.8 + ease(c.k * 2) * 2.2;
  t.body.rotation.x = -0.25 * ease(c.k * 2); S.hold(S.sword, t, 'R'); S.sword.position.set(0, -2.1, 0.4); S.sword.scale.setScalar(1.3);
  if (c.k > 0.35) { bolt(e, 0, [4, 60, -6], [1.5, 8, -4], c.T, 0.45); bolt(e, 1, [5.5, 6, -1.5], [1, 6, -4], c.T, 0.3); lit(e, [2, 8, -2], 0xcfe8ff, 400); if (c.k < 0.5) c.flash(0.7); }
  move(c.cam, [16, 4, 10], [2, 6, -3], [13, 4.4, 8], [2, 6.4, -3], c.k, 40); shake(c.cam, c.T, 0.15);
});
BAT('d9:1', (c, S, e) => {
  const cap = S.H('steve'); S.place(cap, 6, 0, 6); kneel(cap); cap.look('sad', c.T); const hit = (c.k * 3) % 1, n = Math.floor(c.k * 3), br = n >= 2; const sh = capShield(S, cap, br); cap.armL.rotation.x = -2.0; cap.armL.rotation.z = -0.3; cap.body.rotation.x = -0.15 - Math.sin(clamp(hit * 3) * 3.1) * 0.12;
  const t = thanos(S, c, 'menace', 5, 0.5); S.hold(S.sword, t, 'R'); S.sword.position.set(0, -2.1, 0.6); S.sword.rotation.x = 1.35; S.sword.scale.setScalar(1.3); t.armR.rotation.x = -2.6 + ease(clamp(hit * 3.5)) * 1.5; t.body.rotation.x = 0.25;
  if (hit < 0.3 && hit > 0.2) { c.flash(0.45); lit(e, [6, 5, 4], 0xffd070, 300); }
  move(c.cam, [16, 2.4, 9], [6, 4.4, 4], [14, 2.8, 10], [6, 4.4, 4], c.k, 34); shake(c.cam, c.T, 0.14);
});
const horde = (S, c, e, a = 1) => { S.army = a; S.ship.visible = true; e.out.forEach((o, i) => { o.g.visible = a > 0.5; put(o, (i - 3.5) * 9 + Math.sin(i * 7) * 3, 0, -34 - (i % 3) * 7, 0); o.idle(c.T + i); o.look('menace', c.T); o.body.rotation.x = 0.25; o.armL.rotation.z = -0.4; o.armR.rotation.z = 0.4; }); };
BAT('d9:2', (c, S, e) => {
  const [i, k] = cuts(c.k, [0.3, 0.58]), cap = S.H('steve'), t = S.H('thanos');
  if (i === 0) { S.place(t, 0, 0, -14, 0); t.look('menace', c.T); t.idle(c.T); S.hold(S.sword, t, 'R'); S.sword.position.set(0, -2.1, 0.4); S.sword.scale.setScalar(1.3); horde(S, c, e, ease(k * 1.4)); move(c.cam, [4, 2.2, 6], [0, 9, -30], [3, 6, 14], [0, 12, -60], k, 46); }
  else if (i === 1) { S.place(cap, 6, 0, 8); const up = ease(k * 1.6); cap.body.position.y = -1.5 * (1 - up); cap.legL.rotation.x = cap.legR.rotation.x = 1.5 * (1 - up); cap.look('serious', c.T); capShield(S, cap, true); cap.armL.rotation.x = -1.2; cap.armL.rotation.z = -0.5; cap.armR.rotation.x = -1.1; cap.armR.rotation.z = -0.75 + Math.sin(c.T * 12) * 0.1; cap.body.rotation.z = Math.sin(c.T * 3) * 0.02; move(c.cam, [4.5, 3.6, -1.5], [6, 4.0, 8], [5, 4.2, 0], [6, 4.5, 8], k, 30); }
  else { S.place(cap, 0, 0, 12); cap.look('serious', c.T); capShield(S, cap, true); cap.idle(c.T); S.place(t, 0, 0, -22, 0); t.idle(c.T); horde(S, c, e, 1); move(c.cam, [3, 4.2, 30], [0, 6, -30], [1.5, 5.2, 24], [0, 7, -30], k, 44); }
});
// ---------- e1-e3: on your left, portals ----------
const earPos = [-0.75, 4.75, 12];
BAT('e1', (c, S, e) => {
  const [i, k] = cuts(c.k, [0.5]), cap = S.H('steve'); S.place(cap, 0, 0, 12); cap.look('serious', c.T); capShield(S, cap, true); cap.idle(c.T); S.place(S.H('thanos'), 0, 0, -22, 0).idle(c.T); horde(S, c, e, 1);
  if (i === 0) move(c.cam, [1.5, 5.2, 24], [0, 7, -30], [0.8, 5.6, 21], [0, 7, -30], k, 44);
  else { const on = hash(Math.floor(c.T * 14)) > 0.45; e.ear.visible = on; e.ear.position.set(0.76, 4.75, 12); e.ear.scale.setScalar(0.22); cap.head.rotation.y = -0.25 * ease((k - 0.5) * 2); cap.look('serious', c.T); move(c.cam, [3.2, 4.9, 4.5], [0, 4.7, 12], [2.6, 4.9, 5.5], [0, 4.7, 12], k, 28); }
});
BAT('e2', (c, S, e) => { const cap = S.H('steve'); S.place(cap, 0, 0, 12); capShield(S, cap, true); cap.look('surprised', c.T); cap.head.rotation.y = -0.25 - 0.9 * ease(c.k * 1.3); cap.body.rotation.y = -0.5 * ease(c.k * 1.3); e.ear.visible = c.talk > 0.1; e.ear.position.set(0.76, 4.75, 12); e.ear.scale.setScalar(0.2 + c.talk * 0.25); horde(S, c, e, 1); move(c.cam, [2.6, 4.9, 5.5], [0, 4.7, 12], [2.0, 4.9, 6.2], [0, 4.7, 12], c.k, 28); });
const capBack = (S, c, turn = 1) => { const cap = S.H('steve'); S.place(cap, 0, 0, 12, Math.PI + 2.6 * turn); capShield(S, cap, true); cap.look('surprised', c.T); cap.idle(c.T); return cap; };
BAT('e3:0', (c, S, e) => {
  capBack(S, c, 0.75); e.port[0].userData.set(clamp(c.k * 1.5), c.T); lit(e, [-13, 6, 24], 0xffa030, 200 * c.k);
  const tc = S.H('tchalla'), k2 = clamp((c.k - 0.45) / 0.55); if (k2 > 0) { S.place(tc, -13, 0, 26 - k2 * 3); tc.walk(c.T * 5, 0.4); e.al[0].g.visible = e.al[1].g.visible = true; put(e.al[0], -15.5, 0, 28 - k2 * 3, Math.PI); put(e.al[1], -10.5, 0, 28.5 - k2 * 3, Math.PI); e.al[0].walk(c.T * 5 + 1, 0.4); e.al[1].walk(c.T * 5 + 2, 0.4); e.spears[0].visible = true; }
  move(c.cam, [4, 3.6, 0], [-9, 5, 24], [3, 4, 2], [-10, 5.2, 24], c.k, 40);
});
BAT('e3:1', (c, S, e) => { capBack(S, c, 1); e.port[0].userData.set(1, c.T); e.port[1].userData.set(clamp(c.k * 2), c.T); e.port[2].userData.set(clamp(c.k * 2 - 0.4), c.T); S.portals.forEach((p, i) => { if (i < 5) p.userData.set(clamp(c.k * 2 - 0.3 - i * 0.12), c.T); }); S.place(S.H('tchalla'), -13, 0, 22); e.al[0].g.visible = e.al[1].g.visible = true; put(e.al[0], -15.5, 0, 24, Math.PI); put(e.al[1], -10.5, 0, 24.5, Math.PI); const sm = S.H('sam'); S.place(sm, lerp(-13, 6, c.k), 9 + c.k * 8, lerp(26, 6, c.k)); sm.body.rotation.x = 1.0; lit(e, [0, 8, 26], 0xffa030, 260); move(c.cam, [0, 4, -4], [0, 7, 30], [0, 5, -7], [0, 9, 30], c.k, 46); });
BAT('e3:2', (c, S, e) => { capBack(S, c, 1); e.port.forEach(p => p.userData.set(1, c.T)); S.portals.forEach((p, i) => p.userData.set(clamp(c.k * 3.5 - i * 0.1), c.T)); S.allies = c.k * 0.5; S.place(S.H('tchalla'), -13, 0, 22); lit(e, [0, 10, 30], 0xffa030, 400); move(c.cam, [0, 5, -8], [0, 9, 30], [0, 9, -22], [0, 14, 40], c.k, 50); });
// ---------- e4: everyone returns ----------
const P = [[-13, 26], [13, 28], [0, 36]];
BAT('e4:0', (c, S, e) => { e.port[0].userData.set(1, c.T); S.allies = 0.4; const tc = S.H('tchalla'); S.place(tc, -13, 0, 19); tc.armL.rotation.set(-1.9, 0, -0.9); tc.armR.rotation.set(-1.9, 0, 0.9); e.al.slice(0, 5).forEach((a, i) => { a.g.visible = true; put(a, -13 + (i - 2) * 3.4, 0, 23 + (i % 2) * 1.6, Math.PI); a.idle(c.T + i); a.look('serious', c.T); e.spears[i].visible = true; a.armR.rotation.x = -0.5; }); lit(e, [-13, 6, 22], 0xffa030, 200); move(c.cam, [-2, 3.4, 5], [-13, 4.6, 20], [-3.5, 3.8, 7.5], [-13, 4.8, 20], c.k, 36); });
BAT('e4:1', (c, S, e) => { e.port[1].userData.set(1, c.T); S.allies = 0.5; e.horse.visible = true; const y = 9 + Math.sin(c.T * 3) * 0.6, z = lerp(26, 16, c.k); e.horse.position.set(13, y, z); e.horse.rotation.set(-0.15, Math.PI, 0); e.wings.forEach((w, i) => w.rotation.z = (i ? 1 : -1) * Math.sin(c.T * 9) * 0.6); const v = e.al[1]; v.g.visible = true; put(v, 13, y + 0.2, z + 0.3, Math.PI); v.sit(); v.look('serious', c.T); e.spears[1].visible = true; v.armR.rotation.x = -2.4; [2, 3, 4].forEach((j, i) => { const a = e.al[j]; a.g.visible = true; put(a, 9 + i * 4, 0, 22 + i, Math.PI); a.walk(c.T * 6 + i, 0.5); e.spears[j].visible = true; }); lit(e, [13, 8, 24], 0xffe2a8, 220); move(c.cam, [8, 3, 4], [13, 8, 20], [9, 3.4, 6], [13, 8.6, 18], c.k, 40); });
BAT('e4:2', (c, S, e) => { e.port[2].userData.set(1, c.T); S.allies = 0.6; const st = S.H('strange'); S.place(st, 0, 3.5 - c.k * 2.2 + Math.sin(c.T * 2) * 0.2, 26); st.look('serious', c.T); st.armL.rotation.set(-1.3, 0, -0.5); st.armR.rotation.set(-1.3, 0, 0.5); const m = (i, x, y, z) => { e.mand[i].visible = true; e.mand[i].position.set(x, y, z); e.mand[i].rotation.set(0, 0, c.T * 2 * (i % 2 ? 1 : -1)); }; const sy = st.g.position.y; m(0, 1.9, sy + 3.4, 23.6); m(1, -1.9, sy + 3.4, 23.6); [[e.al[2], -6], [e.al[0], 6]].forEach(([a, x], i) => { a.g.visible = true; put(a, x, 0, 28, Math.PI); a.look('serious', c.T); a.armL.rotation.set(-1.3, 0, -0.4); a.armR.rotation.set(-1.3, 0, 0.4); m(2 + i * 2, x + 1.7, 3.4, 25.8); m(3 + i * 2, x - 1.7, 3.4, 25.8); }); lit(e, [0, 6, 22], 0xffa030, 240); move(c.cam, [1.5, 3, 12], [0, 6.2, 26], [1, 3.4, 14], [0, 5.6, 26], c.k, 38); });
BAT('e4:3', (c, S, e) => { S.portals.forEach(p => p.userData.set(1, c.T)); e.port.forEach(p => p.userData.set(1, c.T)); S.allies = 0.7; e.gship.visible = true; e.gship.position.set(lerp(-30, 10, c.k), 20 - c.k * 4, lerp(60, 18, c.k)); e.gship.rotation.set(0.1, Math.PI + 0.5, -0.25); const w = S.H('wanda'); S.place(w, 6, 7 - c.k * 5, 20); w.look('menace', c.T); w.armL.rotation.z = -1.0; w.armR.rotation.z = 1.0; lit(e, [6, 9, 14], 0xff3040, 70); move(c.cam, [10, 3, 4], [0, 14, 30], [8, 3.4, 6], [4, 12, 24], c.k, 46); });
BAT('e4:4', (c, S, e) => { S.portals.forEach(p => p.userData.set(1, c.T)); S.allies = 0.8; const p = S.H('peter'), a = lerp(-0.9, 0.9, ease(c.k)), piv = [-4, 30, 20], L = 22, x = piv[0] + Math.sin(a) * L, y = piv[1] - Math.cos(a) * L; S.place(p, x, y, 20, Math.PI); p.g.rotation.z = a * 0.8; p.armR.rotation.z = 2.8; p.legL.rotation.x = -0.9; p.legR.rotation.x = 0.5; beam(e, 0, [x + 1.2, y + 5.6, 20], piv, 0xffffff, 0.12); move(c.cam, [0, 4, 0], [-4, 12, 20], [2, 4.4, 2], [2, 12, 20], c.k, 46); });
const lineup = (S, c, e) => {
  const cap = S.H('steve'); S.place(cap, 0, 0, 12); cap.look('serious', c.T); capShield(S, cap, true); cap.idle(c.T);
  [['thor', -5, 14], ['ironman', 5, 14], ['tchalla', -10, 16], ['strange', 10, 17], ['wanda', -15, 18], ['hulk', 17, 20], ['clint', -20, 20], ['scott', 22, 22]].forEach(([n, x, z], i) => { const h = S.H(n); S.place(h, x, 0, z); h.idle(c.T + i); h.look('serious', c.T); });
  S.hold(S.axe, S.H('thor'), 'R').position.set(0, -4.2, 0.4);
  const pe = S.H('peter'); S.place(pe, -7, 6.5, 20); pe.legL.rotation.x = -1.2; pe.legR.rotation.x = -1.2; e.slab2.visible = true; e.slab2.position.set(-7, 3.2, 21.5); e.slab2.rotation.x = 0; e.slab2.scale.set(6, 6.4, 3);
  const sm = S.H('sam'); S.place(sm, 9, 16 + Math.sin(c.T * 2), 22); sm.body.rotation.x = 0.4;
  const ca = S.H('carol'); S.place(ca, -2, 24 + Math.sin(c.T * 1.5), 30); ca.look('serious', c.T); e.aura.position.set(-2, 26, 28); e.aura.intensity = 500;
  S.allies = 1; S.portals.forEach(p => p.userData.set(1, c.T)); e.port.forEach(p => p.userData.set(1, c.T));
  return cap;
};
BAT('e4:5', (c, S, e) => { lineup(S, c, e); move(c.cam, [6, 3, -8], [0, 5, 14], [-4, 12, -22], [0, 10, 30], c.k, 48); });
// ---------- e5: assemble ----------
BAT('e5:0', (c, S, e) => {
  const cap = lineup(S, c, e); cap.look('serious', c.T, c.talk); const kk = ease((c.k - 0.45) / 0.4);
  if (kk < 1) { S.hammer.visible = true; S.hammer.position.set(lerp(40, 1.6, kk), lerp(14, 2.4, kk), lerp(-6, 11.6, kk)); S.hammer.rotation.set(c.T * 22, 0, 1.4); S.hammer.scale.setScalar(1.15); cap.armR.rotation.z = 1.2 * kk; }
  else { S.hold(S.hammer, cap, 'R'); S.hammer.position.set(0, -2.9, 0.5); S.hammer.rotation.x = Math.PI; S.hammer.scale.setScalar(1.15); cap.armR.rotation.z = 0.5; bolt(e, 0, [2, 60, 12], [1.9, 3, 11.6], c.T, 0.25); }
  move(c.cam, [1.4, 4.5, -2], [0, 4.6, 12], [0.6, 4.7, 3.5], [0, 4.7, 12], c.k, 30);
});
BAT('e5:1', (c, S, e) => {
  const [i, k] = cuts(c.k, [0.32]);
  if (i === 0) { const cap = lineup(S, c, e); cap.look('menace', c.T, c.talk); S.hold(S.hammer, cap, 'R'); S.hammer.position.set(0, -2.9, 0.5); S.hammer.rotation.x = Math.PI; S.hammer.scale.setScalar(1.15); cap.armR.rotation.x = -0.4; move(c.cam, [0.6, 4.7, 3.5], [0, 4.7, 12], [0.2, 4.7, 5], [0, 4.75, 12], k, 28); return; }
  const adv = k * 20; S.allies = 1; S.army = 1; S.ship.visible = true; S.portals.forEach(p => p.userData.set(1, c.T));
  [['steve', 0, 12], ['thor', -5, 14], ['tchalla', -10, 15], ['hulk', 15, 17], ['strange', 9, 16], ['wanda', -15, 17], ['clint', -19, 18], ['scott', 21, 19]].forEach(([n, x, z], j) => { const h = S.H(n); S.place(h, x, 0, z - adv - j * 0.3); run(h, c.T + j * 0.37); h.look('menace', c.T); });
  const cap = S.H('steve'); capShield(S, cap, true); S.hold(S.hammer, cap, 'R'); S.hammer.position.set(0, -2.9, 0.5); S.hammer.rotation.x = Math.PI; S.hold(S.axe, S.H('thor'), 'R').position.set(0, -4.2, 0.4);
  e.al.forEach((a, j) => { a.g.visible = true; put(a, -24 + j * 8, 0, 24 - adv + (j % 2) * 3, Math.PI); run(a, c.T + j); e.spears[j].visible = true; });
  const im = S.H('ironman'); S.place(im, 6, 9, 16 - adv * 1.3); im.body.rotation.x = 1.1; const pe = S.H('peter'); S.place(pe, -8, 10 + Math.sin(c.T * 4) * 2, 18 - adv * 1.2); pe.armR.rotation.z = 2.8; const sm = S.H('sam'); S.place(sm, 12, 15, 20 - adv * 1.4); sm.body.rotation.x = 1.1;
  const th = S.H('thanos'); S.place(th, 0, 0, -30 + adv * 0.6, 0); run(th, c.T, 9); S.hold(S.sword, th, 'R'); S.sword.position.set(0, -2.1, 0.4);
  e.out.forEach((o, j) => { o.g.visible = true; put(o, (j - 3.5) * 8, 0, -30 + adv * 0.9 - (j % 3) * 5, 0); run(o, c.T + j * 0.5, 15); o.look('menace', c.T); });
  if (k < 0.1) c.flash(0.8 * (1 - k / 0.1)); const cz = 4 - adv * 0.55; move(c.cam, [34, 5, cz + 8], [0, 5, cz - 6], [30, 6, cz + 4], [0, 5, cz - 8], k, 46); shake(c.cam, c.T, 0.22);
});
// ---------- e6: the gauntlet relay ----------
const melee = (S, c, e, n = 1) => { S.allies = 1; S.army = 1; S.ship.visible = true; e.out.forEach((o, j) => { o.g.visible = true; put(o, (hash(j + 3) - 0.5) * 60, 0, -6 - hash(j + 8) * 30, 0); run(o, c.T + j, 14); }); for (let i = 0; i < 4; i++) { const on = hash(Math.floor(c.T * 6) + i * 5) > 0.5; if (on) beam(e, 2 + i, [(hash(i + 20) - 0.5) * 80, 3 + hash(i) * 8, 20], [(hash(i + 30) - 0.5) * 80, 4, -30], [0xffa030, 0x9fe8ff, 0xff3040, 0xffe84a][i], 0.22); } };
const gaunt = (S, ch, side = 'L') => { const g = S.hold(S.gauntlet, ch, side); g.position.set(0, -2.0, 0.3); g.scale.setScalar(0.95); g.userData.glow.intensity = 14; return g; };
BAT('e6:0', (c, S, e) => { melee(S, c, e); const cl = S.H('clint'); S.place(cl, lerp(24, 10, c.k), 0, lerp(10, 4, c.k), Math.PI - 0.9); run(cl, c.T); cl.look('surprised', c.T); gaunt(S, cl); cl.armL.rotation.x = -1.0; const h = S.H('hulk'); S.place(h, -14, 0, 6, Math.PI + 0.4); h.look('menace', c.T); h.armR.rotation.x = -2.4 + Math.sin(c.T * 8) * 1.2; const st = S.H('strange'); S.place(st, -26, 3, 14); st.armL.rotation.z = -1.4; st.armR.rotation.z = 1.4; move(c.cam, [0, 14, 44], [0, 4, -4], [6, 9, 30], [4, 4, -2], c.k, 46); shake(c.cam, c.T, 0.1); });
BAT('e6:1', (c, S, e) => { melee(S, c, e); const cl = S.H('clint'); const z = lerp(4, -4, c.k); S.place(cl, 10, 0, z, Math.PI - 0.5); run(cl, c.T, 15); cl.look('surprised', c.T); gaunt(S, cl); cl.armL.rotation.x = -1.0; e.out[0].g.visible = e.out[1].g.visible = true; put(e.out[0], 14, 0, z + 9, Math.PI); put(e.out[1], 7, 0, z + 12, Math.PI); run(e.out[0], c.T, 16); run(e.out[1], c.T + 1, 16); move(c.cam, [7, 3.4, z - 11], [10, 4.4, z], [7.5, 3.4, z - 12], [10, 4.4, z], c.k, 34); shake(c.cam, c.T, 0.1); });
BAT('e6:2', (c, S, e) => { melee(S, c, e); const tc = S.H('tchalla'), x = lerp(8, -8, c.k); S.place(tc, x, Math.sin(c.k * 3.1) * 2.2, -6, Math.PI + 1.2); run(tc, c.T, 16); gaunt(S, tc); tc.armL.rotation.x = -1.2; lit(e, [x, 4, -6], 0xb050ff, 120); move(c.cam, [x * 0.4, 3, 10], [x, 5, -6], [x * 0.4 - 2, 3.2, 9], [x, 5.4, -6], c.k, 38); shake(c.cam, c.T, 0.1); });
BAT('e6:3', (c, S, e) => { melee(S, c, e); const p = S.H('peter'), a = lerp(-0.7, 0.8, c.k), piv = [-14, 34, -4], L = 26, x = piv[0] + Math.sin(a) * L, y = piv[1] - Math.cos(a) * L; S.place(p, x, y, -4, Math.PI - 0.5); p.g.rotation.z = a * 0.8; p.armR.rotation.z = 2.8; gaunt(S, p); p.armL.rotation.x = -1.3; p.legL.rotation.x = -0.9; beam(e, 0, [x + 1.2, y + 5.6, -4], piv, 0xffffff, 0.12); beam(e, 1, [x, y + 3, -4], [x - 8, 0, -12], 0xffffff, 0.1); move(c.cam, [-8, 5, 16], [x, y + 3, -4], [-10, 5, 14], [x, y + 3, -4], c.k, 40); });
BAT('e6:4', (c, S, e) => { S.army = 1; S.allies = 1; S.ship.visible = true; const ca = S.H('carol'), k = c.k; const p = [lerp(-20, 0, k), lerp(20, 110, k), lerp(-40, -260, k)]; S.place(ca, ...p, Math.PI); ca.body.rotation.x = 1.2; gaunt(S, ca); e.aura.position.set(...p); e.aura.intensity = 900; beam(e, 0, p, [p[0] - 6, p[1] - 30, p[2] + 60], 0xffe2a0, 1.2); e.boom.forEach((m, i) => { m.visible = k > 0.45 + i * 0.1; m.position.set(-60 + i * 40, 120 + (i % 2) * 10, -300 + i * 20); m.scale.setScalar(10 + (k - 0.45) * 90); }); if (k > 0.5 && k < 0.62) c.flash(0.7); move(c.cam, [10, 6, 30], [0, 60, -150], [14, 7, 34], [0, 110, -280], k, 50); shake(c.cam, c.T, 0.15); });
// ---------- e7: Thanos gets it, one finger ----------
const TONY = [9, 0, 6], STR = [-18, 0, 10];
BAT('e7:0', (c, S, e) => {
  const [i, k] = cuts(c.k, [0.5]); S.army = 1; S.allies = 1; const t = thanos(S, c, 'menace', 0, -6); const g = S.hold(S.gauntlet, t, 'L'); g.position.set(0, -2.0, 0.3); g.userData.glow.intensity = 30;
  const ca = S.H('carol');
  if (i === 0) { S.place(ca, 5.5, 2.2, -5, -1.3); ca.look('menace', c.T); ca.armL.rotation.x = -1.6; ca.armR.rotation.x = -1.6; t.armL.rotation.x = -1.4; t.armL.rotation.z = -0.2; e.aura.position.set(4, 10, 4); e.aura.intensity = 110; move(c.cam, [12, 5, 8], [0, 7, -5], [10, 5.4, 6], [0, 7.4, -5], k, 38); shake(c.cam, c.T, 0.08); }
  else { t.armR.rotation.x = -1.7; const f = ease(k * 1.4); S.place(ca, lerp(1.5, 40, f), 4.5 + Math.sin(f * 3.1) * 14, lerp(-2.5, 30, f)); ca.g.rotation.set(f * 8, 0, f * 4); beam(e, 0, [1.4, 7, -4], [lerp(1.5, 30, f), 9, lerp(-2.5, 22, f)], 0xb050ff, 1.0); lit(e, [1, 7, -3], 0xb050ff, 600); if (k < 0.12) c.flash(0.8); move(c.cam, [-14, 4, 10], [2, 8, -4], [-12, 4.4, 14], [10, 10, 4], k, 44); shake(c.cam, c.T, 0.3); }
});
const tonyKneel = (S, c, expr = 'serious') => { const tn = S.H('tonyArmor'); S.place(tn, ...TONY, Math.PI); kneel(tn); tn.look(expr, c.T); return tn; };
BAT('e7:1', (c, S, e) => { S.army = 1; S.allies = 1; const tn = tonyKneel(S, c, 'sad'); tn.head.rotation.y = 1.1 * ease((c.k - 0.2) / 0.5); tn.armL.rotation.x = -0.5; move(c.cam, [7.4, 3.4, -2.5], [9, 3.3, 6], [7.8, 3.4, -1.5], [9, 3.3, 6], c.k, 30); });
BAT('e7:2', (c, S, e) => { S.allies = 1; const st = S.H('strange'); S.place(st, ...STR, Math.PI - 0.5); st.look('sad', c.T); st.armL.rotation.set(-1.4, 0, -0.9 + Math.sin(c.T * 40) * 0.03); const up = ease((c.k - 0.25) / 0.4); st.armR.rotation.x = -1.4 - up * 1.3 + Math.sin(c.T * 36) * 0.025; st.armR.rotation.z = 0.9 * (1 - up) + 0.1; e.finger.visible = up > 0.5; e.mand[0].visible = true; e.mand[0].position.set(-21, 3.6, 8.2); e.mand[0].rotation.set(0, 0.5, c.T * 2); st.head.rotation.x = Math.sin(c.T * 30) * 0.012; move(c.cam, [-13.6, 5, -1], [-18.6, 6.2, 10], [-14.4, 5.2, 0.8], [-18.6, 6.6, 10], c.k, 32); });
// ---------- e8: you know this part ----------
BAT('e8:0', (c, S, e) => { S.army = 1; S.allies = 1; const tn = S.H('tonyArmor'); S.place(tn, ...TONY, Math.PI); const up = ease(c.k * 2); tn.body.position.y = -1.5 * (1 - up); tn.legL.rotation.x = tn.legR.rotation.x = 1.5 * (1 - up); tn.look('serious', c.T); tn.head.rotation.y = 1.1 * (1 - up); move(c.cam, [8, 3.6, -3], [9, 3.6, 6], [8.4, 4.4, -1.5], [9, 4.6, 6], c.k, 30); });
BAT('e8:1', (c, S, e) => {
  S.army = 1; S.allies = 1; const t = thanos(S, c, 'menace', 0, -6), tn = S.H('tonyArmor'), [i, k] = cuts(c.k, [0.6]); const g = S.hold(S.gauntlet, t, 'L'); g.position.set(0, -2.0, 0.3); g.userData.glow.intensity = 30;
  if (i === 0) { const f = ease(k * 1.5); S.place(tn, lerp(9, -2.4, f), 2.4 * Math.sin(f * 1.6), lerp(6, -3.6, f), Math.PI + 0.5); run(tn, c.T); tn.armL.rotation.x = tn.armR.rotation.x = -1.7; t.armL.rotation.x = -1.2; t.armL.rotation.z = -0.35 + Math.sin(c.T * 30) * 0.05; if (f > 0.95) lit(e, [-2, 6, -4.5], 0xffc070, 300); move(c.cam, [12, 4, 12], [2, 6, -3], [8, 4.4, 8], [-1, 6.4, -4], k, 38); shake(c.cam, c.T, 0.12); }
  else { const f = ease(k * 1.6); S.place(tn, lerp(-2.4, 9, f), 2.4 + Math.sin(f * 3.1) * 3 - 2.4 * f, lerp(-3.6, 6, f), Math.PI); tn.g.rotation.x = -f * 1.2 * (1 - f) * 4 * 0.3; t.armL.rotation.x = -1.2 - f * 0.6; t.armR.rotation.x = -1.6 * (1 - f); if (k < 0.12) c.flash(0.6); move(c.cam, [8, 4.4, 8], [-1, 6.4, -4], [12, 4, 14], [4, 5, 0], k, 40); shake(c.cam, c.T, 0.2 * (1 - k)); }
});
BAT('e8:2', (c, S, e) => { S.army = 1; const t = thanos(S, c, c.k > 0.6 ? 'surprised' : 'menace', 0, -6); const g = S.hold(S.gauntlet, t, 'L'); g.position.set(0, -2.0, 0.3); g.userData.stones.forEach(m => m.visible = false); t.armL.rotation.x = -2.5; t.armL.rotation.z = -0.25; const sn = clamp((c.k - 0.45) / 0.06); t.armL.rotation.x += sn * 0.15; t.head.rotation.y = -0.5 * ease((c.k - 0.6) / 0.3); t.head.rotation.x = -0.15 * ease((c.k - 0.6) / 0.3); move(c.cam, [-5, 8, 12], [-0.6, 9.4, -6], [-4, 8.2, 9.5], [-0.6, 9.6, -6], c.k, 30); });
const stonesAt = (e, p, T, I = 60) => { e.stones.visible = true; e.stones.position.set(...p); e.stones.rotation.z = T * 1.5; e.sl.intensity = I * (0.8 + Math.sin(T * 25) * 0.2); };
BAT('e8:3', (c, S, e) => {
  S.army = 1; S.allies = 1; const tn = tonyKneel(S, c, 'serious'), up = ease(c.k * 1.6); tn.armR.rotation.x = -2.5 * up; tn.armR.rotation.z = 0.35; tn.head.rotation.y = -0.4 * up;
  const hp = [TONY[0] - 1.9, 3.1 + 2.2 * up, TONY[2] - 1.0 * up]; stonesAt(e, hp, c.T, 60 * up); for (let i = 0; i < 3; i++) if (up > 0.6) { const col = [0xb050ff, 0xff3838, 0xffe84a][i]; e.bolts[i].forEach(m => m.material.color.set(col)); bolt(e, i, hp, [TONY[0] - 1.2 + i * 0.5, 2.5, TONY[2]], c.T + i, 0.12); }
  move(c.cam, [5, 3, -3.5], [8.4, 3.8, 6], [5.8, 3.4, -2], [8.2, 4.2, 6], c.k, 32); shake(c.cam, c.T, 0.04 * up);
});
// ---------- e9: I am Iron Man ----------
BAT('e9', (c, S, e) => {
  const d = LINE.e9.sents[0], te = d.end - LINE.e9.slot[0] + 0.12, l = c.l; e.bolts.flat().forEach(m => m.material.color.set(0xcfe8ff));
  if (l < te) { S.army = 1; S.allies = 1; const tn = tonyKneel(S, c, 'serious'); tn.look('serious', c.T, c.talk); tn.armR.rotation.x = -2.5; tn.armR.rotation.z = 0.35; const hp = [TONY[0] - 1.9, 5.3, TONY[2] - 1.0]; stonesAt(e, hp, c.T, 80); const sn = clamp((l - te + 0.14) / 0.1); tn.armR.rotation.z = 0.35 - sn * 0.2; move(c.cam, [7.6, 3.6, -3.2], [8.6, 3.9, 6], [8, 3.7, -1.8], [8.6, 4.0, 6], l / te, 30); if (l > te - 0.1) c.flash((l - te + 0.1) / 0.1); return; }
  const k = clamp((l - te) / (c.dur - te)); S.army = 1; S.armyDust = k * 0.75; S.allies = 1; S.ship.visible = false;
  const tn = S.H('tonyArmor'); S.place(tn, 9, -1.5, 4.6, Math.PI); tn.sit(); tn.body.rotation.x = -0.28; tn.look(k > 0.7 ? 'sleep' : 'sad', c.T); tn.head.rotation.x = 0.2 + k * 0.2; tn.head.rotation.z = 0.15; tn.armL.rotation.x = -0.3; tn.armR.rotation.x = -0.2;
  e.slab2.visible = true; e.slab2.position.set(9, 2.0, 6.6); e.slab2.rotation.x = -0.2; e.slab2.scale.set(7, 5.5, 2.4);
  const flick = k < 0.75 ? hash(Math.floor(c.T * 14)) > k : false; e.arcOff.visible = !flick; e.arcOff.position.set(9, 1.62, 4.86); e.arcOff.rotation.x = 0.28; e.arcOff.scale.set(0.62, 0.62, 0.1);
  const pe = S.H('peter'); S.place(pe, 12.4, 0, 2.6, Math.PI + 1.2); kneel(pe); pe.body.rotation.x = 0.2; pe.armL.rotation.x = -1.0;
  const pp = S.H('pepper'); S.place(pp, 5.6, 0, 2.6, Math.PI - 1.2); kneel(pp); pp.look('sad', c.T); pp.armR.rotation.x = -1.0; pp.body.rotation.x = 0.15;
  const t = S.H('thanos'); S.place(t, -14, 0, -22, 0.4); t.sit(); t.look('sad', c.T); t.g.visible = k < 0.5; S.dust[0].set([-14, 0, -22], k * 1.6 - 0.3, 1.75);
  c.flash(1 - k / 0.25); move(c.cam, [8, 2.4, -9], [8.6, 2.6, 4], [8.6, 2.8, -6.5], [9, 2.6, 4.6], k, 38);
});

// ---------------- STRANGE'S FUTURES (e10, e11) ----------------
SET('futures', () => {
  const { s, cam } = mkScene(0x04100a, [30, 190], 0xffffff, 0.3, [0x7affb0, 0x04100a, 0.5]);
  s.userData.bloom = 0.6; s.userData.sun.castShadow = false;
  const N = 2200, im = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4, 1.95), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), N); im.frustumCulled = false; s.add(im);
  const dm = new THREE.Object3D(), col = new THREE.Color(), PP = [];
  for (let i = 0; i < N; i++) { const cx = Math.round((hash(i) - 0.5) * 60), cy = Math.round((hash(i + 0.31) - 0.5) * 40), z = -hash(i + 0.7) * 150 - (Math.abs(cx) < 2 && Math.abs(cy) < 2 ? 12 : 0); PP.push([cx * 4.2, cy * 2.5, z, hash(i + 0.5)]); im.setColorAt(i, col.setHSL(0.38, 0.6, 0.05 + hash(i + 0.9) * 0.1)); }
  // panel A: the future we know (a little diorama behind glass)
  const A = new THREE.Group(); s.add(A);
  box(3.6, 0.1, 0.12, 0x9affc0, 0, 1.02, 0, A); box(3.6, 0.1, 0.12, 0x9affc0, 0, -1.02, 0, A); box(0.1, 2.1, 0.12, 0x9affc0, -1.78, 0, 0, A); box(0.1, 2.1, 0.12, 0x9affc0, 1.78, 0, 0, A);
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.0), new THREE.MeshBasicMaterial({ map: tex(256, 144, c => { const g = c.createLinearGradient(0, 0, 0, 144); g.addColorStop(0, '#8f7058'); g.addColorStop(0.62, '#b98a62'); g.addColorStop(0.63, '#5c4c3e'); g.addColorStop(1, '#3a3028'); c.fillStyle = g; c.fillRect(0, 0, 256, 144); c.fillStyle = 'rgba(40,34,30,.8)'; for (let i = 0; i < 14; i++) c.fillRect(i * 19, 70 + (i % 3) * 6, 9 + (i % 4) * 3, 22); }) })); bg.position.z = -0.5; A.add(bg);
  const D = new THREE.Group(); D.scale.setScalar(0.2); D.position.set(0, -0.92, -0.2); A.add(D);
  const tn = makeChar('tonyArmor', 'sleep'); put(tn, 0, -1.5, 0); tn.sit(); tn.body.rotation.x = -0.28; tn.head.rotation.x = 0.4; D.add(tn.g); box(7, 5.5, 2.4, 0x6a655e, 0, 2, -2.4, D);
  const pe = makeChar('peter'); put(pe, 3.6, 0, 1, -1.2); kneel(pe); D.add(pe.g); const pp = makeChar('pepper', 'sad'); put(pp, -3.6, 0, 1, 1.2); kneel(pp); D.add(pp.g);
  const la = label('FUTURE 14,000,605', { h: 0.34, color: '#9affc0', stroke: '#04100a' }); la.position.set(0, 1.5, 0); s.add(la);
  // panel B: the sealed one
  const Bp = new THREE.Group(); Bp.position.set(4.2, 0, 0); s.add(Bp); const fm = new THREE.MeshBasicMaterial({ color: 0x1c3a2a });
  box(3.6, 0.1, 0.12, fm, 0, 1.02, 0, Bp); box(3.6, 0.1, 0.12, fm, 0, -1.02, 0, Bp); box(0.1, 2.1, 0.12, fm, -1.78, 0, 0, Bp); box(0.1, 2.1, 0.12, fm, 1.78, 0, 0, Bp);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.0), new THREE.MeshBasicMaterial({ color: 0x06140c })); face.position.z = -0.05; Bp.add(face);
  const chains = [-0.5, 0.5].map(r => { const m = box(4.2, 0.12, 0.14, 0x2a3a30, 0, 0, 0.05, Bp); m.rotation.z = r; return m; });
  const lb = label('FUTURE 14,000,606', { h: 0.34, color: '#ffd24a', stroke: '#1a1204' }); lb.position.set(4.2, 1.5, 0); s.add(lb);
  const gl = new THREE.PointLight(0xffd24a, 0, 30); gl.position.set(4.2, 0, 2); s.add(gl); const tg = new THREE.PointLight(0x5dff9a, 40, 30); tg.position.set(0, 0, 4); s.add(tg);
  const st = makeChar('strange', 'serious'); s.add(st.g); st.g.scale.setScalar(0.62);
  return { s, cam, A, Bp, face, fm, chains, la, lb, gl, st,
    pre(T) { for (let i = 0; i < N; i++) { const p = PP[i]; dm.position.set(p[0], p[1] + Math.sin(T * 0.6 + i) * 0.15, p[2] - 8); dm.rotation.set(0, Math.sin(T * 0.3 + i) * 0.12, 0); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); } im.instanceMatrix.needsUpdate = true; face.material.color.set(0x06140c); fm.color.set(0x1c3a2a); gl.intensity = 0; chains.forEach(m => m.visible = true); lb.visible = false; st.g.visible = false; A.position.y = Math.sin(T * 0.8) * 0.04; } };
});
SHOT('e10', 'futures', c => { const S = c.S; if (c.l < 0.35) c.flash(1 - c.l / 0.35); move(c.cam, [0, 0, 3.3], [0, 0, 0], [-1.5, 0.6, 15], [1.2, 0.2, 0], c.k, 34); });
SHOT('e11', 'futures', c => {
  const S = c.S, d = LINE.e11.sents[0], te = d.end - LINE.e11.slot[0], g = ease((c.l - 0.7) / 0.9); S.lb.visible = true; S.face.material.color.setRGB(0.02 + g * 1.0, 0.08 + g * 0.72, 0.05 + g * 0.2); S.fm.color.setRGB(0.11 + g * 0.9, 0.23 + g * 0.6, 0.16 + g * 0.1); S.gl.intensity = 90 * g; S.chains.forEach((m, i) => { m.visible = g < 0.6; m.rotation.z = (i ? 0.5 : -0.5) + g * (i ? 1 : -1); });
  const st = S.st; st.g.visible = true; st.reset(); put(st, 6.9, -3.5, 2.6, Math.PI + 0.45); st.look('serious', c.T); st.armL.rotation.x = -2.0 - Math.sin(c.T * 3) * 0.05; st.armL.rotation.z = -0.2;
  move(c.cam, [-1.5, 0.6, 15], [1.2, 0.2, 0], [4.6, 0.3, 7.5], [4.2, 0.1, 0], c.k * 1.25, 34);
  const over = c.l - te; if (over > 0.25) c.flash(clamp((over - 0.25) / 0.5));
  if (c.l > 0.9) c.dom(`<div style="position:absolute;left:0;right:0;top:770px;text-align:center;font-size:44px;letter-spacing:14px;color:#ffd24a;opacity:${clamp((c.l - 0.9) / 0.4)}">THE ONE HE NEVER SHOWED US</div>`);
});
