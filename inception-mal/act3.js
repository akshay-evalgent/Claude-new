// Chapter 5: The Heist (e1-e10) + Chapter 6: Limbo (f1-f7) + the kicks (h1) + waking on the plane (h2:0)
import { THREE, SET, SHOT, LINE, mkScene, move, shot, shake, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, label, makeChar, makeTop, ground, building, van, car, CAST } from './engine.js';

CAST.saitoOld = { ...CAST.saito, hair: ['part', 0xd4d4d0], face: { brow: '#b8b8b4', lines: 1, stubble: 'rgba(200,200,195,.35)' } };
CAST.attendant = { skin: 0xf0cdb0, hair: ['pony', 0x3a2418], face: { lashes: 1, brow: '#3a2418', browW: 7, lips: '#b5544f' }, torso: { style: 'suit', jacket: '#1f3a6a', shirt: '#f4f4f2', tie: '#c9342e' }, arm: 0x1f3a6a, leg: 0xf0cdb0, skirt: 0x1f3a6a };

// ---------- helpers ----------
const basic = c => new THREE.MeshBasicMaterial({ color: c });
const fakeTalk = T => Math.abs(Math.sin(T * 9)) * (0.4 + 0.6 * Math.abs(Math.sin(T * 2.3)));
const lie = (ch, x, y, z, ry = 0) => { ch.g.position.set(x, y, z); ch.g.rotation.set(-Math.PI / 2, 0, ry); };   // on the back, head toward -z
function tube(parent, a, b, col = 0xe8e8e0, th = 0.09) { const m = box(th, th, 1, col, 0, 0, 0, parent); const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); m.position.copy(A).lerp(B, 0.5); m.scale.z = A.distanceTo(B); m.lookAt(B); m.castShadow = false; return m; }
function mkRain(s, n = 1800, spread = [90, 90], h = 40) {
  const pos = new Float32Array(n * 6), r = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xcfe2f5, transparent: true, opacity: 0.5 })); r.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); r.frustumCulled = false; s.add(r);
  return (T, cx = 0, cy = 0, cz = 0) => { for (let i = 0; i < n; i++) { const x = cx + (hash(i) - 0.5) * spread[0], z = cz + (hash(i + 0.5) - 0.5) * spread[1], y = cy + h - ((T * 46 + hash(i + 0.25) * h) % h); pos.set([x, y, z, x + 0.3, y - 1.7, z], i * 6); } r.geometry.attributes.position.needsUpdate = true; };
}
function mkBurst(s, n, col) {   // reusable block-burst: call fire(origin, t, spread, grav)
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), typeof col === 'object' ? col : M(col), n); im.frustumCulled = false; s.add(im); const dm = new THREE.Object3D();
  return { im, fire(o, t, sp = 14, g = 16, size = 1, seed = 0) { im.visible = t > 0; if (t <= 0) return; for (let i = 0; i < n; i++) { const h = k => hash(i * 3.1 + k + seed), a = h(1) * 6.283, e = h(2) * 1.4, v = sp * (0.35 + h(3)); dm.position.set(o[0] + Math.cos(a) * Math.cos(e) * v * t, Math.max(o[3] ?? -1e9, o[1] + Math.sin(e) * v * t - g * t * t * 0.5), o[2] + Math.sin(a) * Math.cos(e) * v * t); dm.rotation.set(t * 5 * h(4), t * 4 * h(5), i); dm.scale.setScalar(size * (0.3 + h(6))); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); } im.instanceMatrix.needsUpdate = true; } };
}
const levelDom = (n, sub, l, dur) => { const k = ease(l / 0.25), o = Math.min(1, clamp((dur - l) / 0.3)); return `<div style="position:absolute;left:0;right:0;top:${250 - 30 * (1 - k)}px;text-align:center;opacity:${o * clamp(l / 0.15)}"><div style="font-size:36px;letter-spacing:16px;color:#fff;font-weight:700">DREAM</div><div style="font-size:${190 + 40 * (1 - k)}px;line-height:1;color:#ffd24a;-webkit-text-stroke:18px #14161c;paint-order:stroke fill;letter-spacing:8px">LEVEL ${n}</div><div style="font-size:40px;letter-spacing:10px;color:#fff;font-weight:700;margin-top:6px;-webkit-text-stroke:8px #14161c;paint-order:stroke fill">${sub}</div></div>`; };

// ================= PLANE =================
SET('plane', () => {
  const { s, cam } = mkScene(0xdfe8f2, [40, 120], 0xfff4e0, 1.2, [0xffffff, 0xb0b6c2, 1.5], [10, 20, 14]);
  s.userData.bloom = 0.32;
  box(16, 0.5, 70, 0x2f3a52, 0, -0.25, -15, s); box(3, 0.06, 70, 0x8a2b32, 0, 0.03, -15, s); box(16, 0.5, 70, 0xf1f3f6, 0, 9.6, -15, s);
  const sky = tex(256, 64, c => { const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#5aa6e8'); g.addColorStop(1, '#cfe9fb'); c.fillStyle = g; c.fillRect(0, 0, 256, 64); c.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(hash(i) * 256, 26 + hash(i + 3) * 30, 22 + hash(i + 5) * 20, 7, 0, 0, 7); c.fill(); } }); sky.wrapS = THREE.RepeatWrapping; sky.repeat.x = 0.3;
  const skm = new THREE.MeshBasicMaterial({ map: sky });
  for (const sx of [-1, 1]) { box(0.6, 10, 70, 0xe6e9ee, sx * 8, 4.8, -15, s); for (let z = 14; z > -46; z -= 5) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), skm); w.position.set(sx * 7.66, 5.4, z); w.rotation.y = -sx * Math.PI / 2; s.add(w); box(0.12, 3.3, 2.7, 0xcfd4dc, sx * 7.7, 5.4, z, s).scale.set(0.1, 3.3, 0.2 + 2.5); } box(0.9, 0.5, 70, 0xf7f8fa, sx * 6.8, 8.2, -15, s); }
  for (let z = 10; z > -46; z -= 7) box(1.2, 0.12, 2.2, basic(0xfff3d6), 0, 9.3, z, s);
  box(16, 10, 0.6, 0xcfd4dc, 0, 5, -48, s); box(3.4, 7.4, 0.3, 0x5a3d7a, 0, 3.7, -47.6, s);
  const seatAt = (x, z) => { box(3.6, 1.5, 3.4, 0x6b4a36, x, 0.75, z - 0.3, s); box(3.6, 5.6, 0.9, 0x7a563e, x, 3.9, z - 2.1, s); box(3.0, 1.2, 0.5, 0xe9e2d2, x, 6.0, z - 1.62, s); box(0.5, 0.9, 3.2, 0x4f3626, x - 2.05, 2.1, z - 0.3, s); box(0.5, 0.9, 3.2, 0x4f3626, x + 2.05, 2.1, z - 0.3, s); };
  const who = [['cobb', 3.9, 0], ['fischer', -3.9, 0], ['arthur', 3.9, -8], ['ariadne', -3.9, -8], ['saito', 3.9, -16], ['eames', -3.9, -16], ['yusuf', 3.9, -24]], P = {};
  for (const [n, x, z] of who) { seatAt(x, z); const c = put(makeChar(n, 'neutral'), x, 0, z); s.add(c.g); P[n] = c; }
  seatAt(-3.9, -24);
  const att = makeChar('attendant', 'neutral'); s.add(att.g); const tray = att.hand('R'); box(1.6, 0.1, 1.1, 0xc9ced6, 0, 0, 0.5, tray); const glass = box(0.34, 0.6, 0.34, new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.7 }), 0, 0.36, 0.5, tray);
  const fg = P.fischer.hand('R'); const g2 = box(0.34, 0.6, 0.34, new THREE.MeshPhongMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.75 }), 0, 0, 0.35, fg);
  // dream machine
  const mc = new THREE.Group(); mc.position.set(0, 0, -4); s.add(mc); const silver = new THREE.MeshPhongMaterial({ color: 0xb9c0c9, shininess: 90, specular: 0xffffff });
  box(3.0, 0.9, 2.2, silver, 0, 0.45, 0, mc); const lid = new THREE.Group(); lid.position.set(0, 0.9, -1.1); mc.add(lid); box(3.0, 0.25, 2.2, silver, 0, 0.12, 1.1, lid);
  const btn = box(0.6, 0.25, 0.6, basic(0xffd24a), 0, 1.0, 0, mc); const tubes = new THREE.Group(); s.add(tubes);
  for (const [n, x, z] of who.slice(0, 6)) tube(tubes, [0, 1.0, -4], [x - Math.sign(x) * 1.6, 2.2, z + 0.6]);
  const phone = box(0.4, 0.9, 0.16, 0x14161c, 0, 0, 0.3, P.saito.hand('L'));
  return {
    s, cam, P, att, lid, btn, tubes, glass, g2, phone, sky,
    pre(T) { sky.offset.x = T * 0.02; for (const k in P) { const c = P[k]; c.reset(); c.sit(); c.idle(T + k.length); c.look('neutral', T); } att.reset(); this.lid.rotation.x = 0; tubes.visible = false; btn.visible = false; g2.visible = false; glass.visible = true; phone.visible = false; att.g.visible = true; }
  };
});
SHOT('e1:0', 'plane', c => { const S = c.S, a = S.att; put(a, 0, 0, 5 - c.l * 2.4, Math.PI); a.walk(c.T * 5, 0.3); a.armR.rotation.x = -1.2; a.armR.rotation.z = 0; a.look('neutral', c.T); S.P.fischer.head.rotation.y = 0.5; S.P.cobb.look('serious', c.T); S.P.cobb.head.rotation.y = -0.5 * ease(c.k * 2); move(c.cam, [0, 8.2, 24], [0, 4.0, -10], [0, 6.4, 13], [0, 3.8, -12], c.k, 44); });
SHOT('e1:1', 'plane', c => {
  const S = c.S, f = S.P.fischer, [i, k] = cuts(c.k, [0.55]); put(S.att, 0, 0, 2.2, -Math.PI / 2); S.att.look('neutral', c.T); S.glass.visible = false;
  if (i === 0) { S.g2.visible = true; const d = Math.sin(clamp(k / 0.55) * Math.PI); f.armR.rotation.x = -0.5 - d * 1.5; f.armR.rotation.z = -0.25 * d; f.head.rotation.x = -0.25 * d + 0.45 * ease((k - 0.6) / 0.3); f.look(k > 0.72 ? 'sleep' : 'neutral', c.T); move(c.cam, [-1.2, 5.0, 10], [-3.9, 4.7, 0], [-1.8, 5.0, 8.4], [-3.9, 4.6, 0], k, 30); }
  else { for (const n of ['fischer', 'cobb', 'arthur', 'ariadne', 'saito', 'eames']) { const ch = S.P[n]; ch.look('sleep', c.T); ch.head.rotation.x = 0.35; ch.head.rotation.z = (n.length % 2 ? 1 : -1) * 0.12; } S.lid.rotation.x = -1.9 * ease(k * 3); S.tubes.visible = k > 0.2; S.btn.visible = true; S.btn.position.y = 1.0 - 0.1 * ease((k - 0.5) * 5); S.att.g.visible = false; move(c.cam, [0, 9, 10], [0, 2.5, -6], [0, 8.6, 5], [0, 2.2, -8], k, 46); if (k > 0.8) c.flash((k - 0.8) / 0.2); }
});
SHOT('h2:0', 'plane', c => {
  const S = c.S, cb = S.P.cobb, aw = c.k > 0.28; S.att.g.visible = false; if (c.l < 0.35) c.flash(1 - c.l / 0.35);
  for (const n of ['fischer', 'arthur', 'ariadne', 'eames']) { const ch = S.P[n]; ch.look(aw ? 'neutral' : 'sleep', c.T); ch.head.rotation.y = aw ? (ch.g.position.x > 0 ? 0.3 : -0.6) * ease((c.k - 0.4) * 3) : 0; }
  cb.look(aw ? (c.k > 0.6 ? 'neutral' : 'surprised') : 'sleep', c.T); cb.head.rotation.x = aw ? 0 : 0.35; cb.head.rotation.y = -0.6 * ease((c.k - 0.55) * 3);
  S.phone.visible = true; const sa = S.P.saito; sa.look('smirk', c.T); sa.armL.rotation.x = -2.5 * ease((c.k - 0.45) * 3); sa.armL.rotation.z = -0.5 * ease((c.k - 0.45) * 3);
  move(c.cam, [0.8, 5.0, 9], [3.6, 4.7, 0], [-0.6, 5.3, 10.5], [2.4, 4.6, -6], c.k, 34);
});

// ================= RAINY CITY =================
SET('city', () => {
  const { s, cam } = mkScene(0x4c5866, [35, 210], 0xcfe0f0, 1.4, [0xb8c8d8, 0x3a4048, 1.5], [-14, 34, 12], 55);
  s.userData.bloom = 0.4;
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(64, 420), new THREE.MeshPhongMaterial({ color: 0x23272d, shininess: 90, specular: 0x8899aa })); rd.rotation.x = -Math.PI / 2; rd.position.z = -110; rd.receiveShadow = true; s.add(rd);
  for (let z = -300; z < 60; z += 9) { box(0.5, 0.05, 4, 0xe8e0b0, 0, 0.03, z, s); box(0.4, 0.05, 4, 0xbfc4c9, -7, 0.03, z, s); box(0.4, 0.05, 4, 0xbfc4c9, 7, 0.03, z, s); }
  for (const sx of [-1, 1]) {
    box(9, 0.6, 420, 0x6b7078, sx * 18.5, 0.3, -110, s);
    for (let i = 0; i < 16; i++) { const h = 44 + hash(i * sx + 40) * 70, b = building(22, h, 22, ['#3d4753', '#4a4f5a', '#39424d', '#454c58'][i % 4], 0.38, i + (sx > 0 ? 30 : 0)); b.position.set(sx * 34, h / 2, 30 - i * 23); b.castShadow = false; s.add(b); box(21, 3.2, 0.4, [0x8a2b22, 0x2f5f45, 0x35507a][i % 3], sx * 34 - sx * 11.2, 5.4, 30 - i * 23, s).rotation.y = Math.PI / 2; }
    for (let z = 20; z > -200; z -= 26) { box(0.4, 9, 0.4, 0x2a2e33, sx * 14.6, 4.5, z, s); box(2.4, 0.3, 0.4, 0x2a2e33, sx * 13.6, 9, z, s); box(0.9, 0.3, 0.6, basic(0xffe6a8), sx * 12.8, 8.8, z, s); }
  }
  for (const z of [-22, -120]) { box(0.4, 8, 0.4, 0x2a2e33, 13.6, 4, z, s); box(0.9, 2.4, 0.9, 0x14161a, 13.6, 8, z, s); box(0.5, 0.5, 0.2, basic(0xff3b30), 13.6, 8.7, z + 0.5, s); }
  const parked = []; for (let i = 0; i < 10; i++) { const c = car([0x3a6fd0, 0x8a8f96, 0xd04a3a, 0x2f5f45, 0xeeeeee][i % 5]); c.position.set(i % 2 ? 11.6 : -11.6, 0, 6 - i * 15); s.add(c); parked.push(c); }
  const traffic = [0xe2c12f, 0x3a6fd0, 0xeeeeee, 0xd04a3a, 0xe2c12f, 0x23262d].map((col, i) => { const c = car(col); s.add(c); return c; });
  const taxi = car(0xf0c020); box(1.2, 0.5, 0.6, basic(0xfff2b0), 0, 3.25, -0.3, taxi); s.add(taxi); const suv = car(0x15171a); suv.scale.set(1.1, 1.25, 1.1); s.add(suv);
  const train = new THREE.Group(); s.add(train);
  box(8, 8, 18, 0x8a2b22, 0, 4.8, 0, train); box(8.2, 2.6, 6, 0x2a2a2a, 0, 7.4, 6.4, train); box(6.8, 1.6, 0.2, 0xcfe6ff, 0, 7.3, 9.3, train); box(9.4, 1.8, 3, 0x444444, 0, 1.2, 9.8, train); box(1.5, 1.5, 0.3, basic(0xfff6b0), 0, 4.2, 9.1, train); box(8.2, 0.8, 0.3, 0xe2c12f, 0, 3.0, 9.1, train);
  for (let i = 1; i < 6; i++) box(7.6, 7.4, 17, [0x5f6b3a, 0x3a5f6b, 0x6b4a3a][i % 3], 0, 4.5, -i * 18.6, train);
  const guards = []; for (let i = 0; i < 9; i++) { const g = makeChar('guard', 'serious'); box(0.3, 0.3, 3.0, 0x111111, 0, -1.9, 1.1, g.armR); const mz = box(0.7, 0.7, 0.7, basic(0xffe9a0), 0, -1.9, 3.0, g.armR); g.mz = mz; s.add(g.g); guards.push(g); }
  const cobb = makeChar('cobb', 'serious'), arthur = makeChar('arthur', 'serious'), fis = makeChar('fischer', 'surprised'); s.add(cobb.g, arthur.g, fis.g); for (const h of [cobb, arthur]) { box(0.3, 0.45, 1.4, 0x111111, 0, -1.9, 0.6, h.armR); }
  const TN = 18, tr = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 2.4), basic(0xd9c070), TN); tr.frustumCulled = false; s.add(tr); const dm = new THREE.Object3D();
  const rain = mkRain(s, 2200, [110, 120], 44); const sparks = mkBurst(s, 60, basic(0xffd27a));
  return {
    s, cam, parked, traffic, taxi, suv, train, guards, cobb, arthur, fis, rain, sparks,
    tracers(T, on) { tr.visible = on; if (!on) return; for (let i = 0; i < TN; i++) { const dir = i % 3 ? 1 : -1, ph = (T * 2.6 + hash(i) * 5) % 1; dm.position.set((hash(i + 7) - 0.5) * 22, 2.4 + hash(i + 9) * 2.2, dir > 0 ? lerp(-24, 12, ph) : lerp(8, -26, ph)); dm.rotation.set((hash(i + 2) - 0.5) * 0.1, (hash(i + 4) - 0.5) * 0.3, 0); dm.updateMatrix(); tr.setMatrixAt(i, dm.matrix); } tr.instanceMatrix.needsUpdate = true; },
    pre(T) { train.visible = false; taxi.visible = suv.visible = false; guards.forEach(g => { g.g.visible = false; g.mz.visible = false; }); cobb.g.visible = arthur.g.visible = fis.g.visible = false; this.tracers(T, false); sparks.im.visible = false; traffic.forEach((c, i) => { const dir = i % 2 ? 1 : -1; c.visible = true; c.rotation.set(0, dir > 0 ? Math.PI : 0, 0); c.position.set(dir * 3.5 + (i > 3 ? dir * 7 : 0) * 0, 0, dir > 0 ? 40 - ((T * 16 + i * 55) % 260) : -220 + ((T * 14 + i * 60) % 260)); }); parked.forEach((c, i) => { c.position.set(i % 2 ? 11.6 : -11.6, 0, 6 - i * 15); c.rotation.set(0, 0, 0); }); }
  };
});
SHOT('e2:0', 'city', c => { c.S.rain(c.T, 0, 0, 0); move(c.cam, [0, 34, 46], [0, 10, -50], [0, 27, 38], [0, 9, -50], c.k, 46); c.dom(levelDom(1, 'THE CITY', c.l, 9)); });
SHOT('e2:1', 'city', c => { const S = c.S; S.taxi.visible = true; S.taxi.position.set(3.5, 0, 26 - c.k * 30); S.taxi.rotation.y = Math.PI; S.rain(c.T, 0, 0, 10); move(c.cam, [-6, 1.5, 20], [2, 5, -30], [-5, 2.2, 14], [3, 4.5, -30], c.k, 46); c.dom(levelDom(1, 'THE CITY', c.l + 0.67, 1.9)); });
SHOT('e2:2', 'city', c => {
  const S = c.S, k = c.k; S.traffic.forEach(t => t.visible = false); S.taxi.visible = S.suv.visible = true; S.rain(c.T, 0, 0, 0);
  const br = ease(k * 1.6); S.taxi.position.set(3.5 - br * 2.5, 0, lerp(26, 2, 1 - (1 - clamp(k * 1.4)) ** 2)); S.taxi.rotation.set(0, Math.PI + br * 0.5, 0);
  S.suv.position.set(lerp(30, 1, ease(k * 1.5)), 0, -9); S.suv.rotation.y = -Math.PI / 2 + ease(k * 1.5) * 0.5;
  const p = S.parked[1]; p.position.set(11.6 - ease((k - 0.3) * 2) * 7, 0, -9 + ease((k - 0.3) * 2) * 6); p.rotation.y = ease((k - 0.3) * 2) * 1.9;
  S.sparks.fire([2, 0.6, 1], (k - 0.45) * 1.6, 7, 18, 0.25);
  move(c.cam, [-10, 3.2, 12], [2, 2, -3], [-7, 2.4, 9], [2, 2, -4], k, 44); shake(c.cam, c.T, 0.05 + 0.1 * br);
});
SHOT('e3:0', 'city', c => {
  const S = c.S, k = c.k; S.traffic.forEach(t => t.visible = false); S.train.visible = true; S.rain(c.T, 0, 0, 10);
  const tz = lerp(-190, 14, Math.pow(k, 0.8)); S.train.position.set(Math.sin(c.T * 30) * 0.07, 0, tz);
  S.parked.forEach((p, i) => { const z0 = -10 - i * 14, hit = tz + 10 - z0, sx = i % 2 ? 1 : -1; if (hit > 0) { p.position.set(sx * (4 + hit * 0.42), Math.sin(clamp(hit / 26) * Math.PI) * 4.5, z0 + hit * 0.7); p.rotation.set(hit * 0.11, hit * 0.07 * sx, hit * 0.09 * sx); } else { p.position.set(sx * 4, 0, z0); p.rotation.set(0, i * 2, 0); } });
  S.sparks.fire([0, 0.5, tz + 11, 0.2], 0.25 + (c.T * 3 % 0.5), 10, 30, 0.22, Math.floor(c.T * 6));
  move(c.cam, [10, 2.2, 36], [0, 8, -30], [12, 1.8, 31], [0, 6, -30], k, 44); shake(c.cam, c.T, 0.04 + 0.3 * k * k);
});
SHOT('e3:1', 'city', c => {
  const S = c.S; S.traffic.forEach(t => t.visible = false); S.rain(c.T, 0, 0, 0);
  S.guards.forEach((g, i) => { const sx = i % 2 ? 1 : -1, k = clamp((c.l - i * 0.09) / 0.9), x = sx * lerp(17, 2.5 + (i >> 1) * 2.6, ease(k)), z = -8 - (i >> 1) * 4.5 + c.l * 2.2; g.g.visible = k > 0; put(g, x, k < 0.35 ? 0.6 : 0, z, sx * -0.5 * (1 - k)); g.reset(); g.walk(c.T * 9 + i, 0.7); g.armR.rotation.x = -1.45; g.look('serious', c.T); });
  move(c.cam, [0, 2.6, 22], [0, 3.6, -14], [0, 3.2, 15], [0, 3.6, -14], c.k, 40);
});
SHOT('e3:2', 'city', c => {
  const S = c.S, T = c.T; S.traffic.forEach(t => t.visible = false); S.rain(T, 0, 0, 0); S.tracers(T, true);
  S.taxi.visible = true; S.taxi.position.set(-1, 0, 7.5); S.taxi.rotation.set(0, 1.45, 0);
  S.guards.forEach((g, i) => { const sx = i % 2 ? 1 : -1; g.g.visible = true; put(g, sx * (2.5 + (i >> 1) * 3.2), 0, -15 - (i >> 1) * 3.5 + Math.sin(T * 2 + i) * 0.6, 0); g.reset(); g.armR.rotation.x = -1.5 + Math.sin(T * 30 + i) * 0.04; g.legL.rotation.x = 0.3; g.legR.rotation.x = -0.3; g.mz.visible = hash(Math.floor(T * 12) + i * 7) > 0.6; g.look('serious', T); });
  [[S.cobb, -3.4, 0], [S.arthur, 1.2, 1.3]].forEach(([h, x, ph]) => { const up = ease(Math.sin(T * 2.4 + ph) * 2); h.g.visible = true; put(h, x, 0, 11, Math.PI); h.reset(); h.legL.rotation.x = h.legR.rotation.x = -1.0 * (1 - up); h.body.position.y = -0.9 * (1 - up); h.body.rotation.x = 0.25 * (1 - up); h.armR.rotation.x = -1.5 * up; h.look('serious', T); });
  S.fis.g.visible = true; put(S.fis, -0.8, 0, 12.2, Math.PI - 0.4); S.fis.reset(); S.fis.legL.rotation.x = S.fis.legR.rotation.x = -1.2; S.fis.body.position.y = -1.1; S.fis.armL.rotation.z = -2.6; S.fis.armR.rotation.z = 2.6; S.fis.look('surprised', T);
  S.sparks.fire([-1, 2.6, 6.8, 0.1], (T * 2.5) % 1 * 0.5, 8, 26, 0.16, Math.floor(T * 2.5));
  const [i, k] = cuts(c.k, [0.5]);
  if (i === 0) move(c.cam, [13, 6, 24], [-1, 2.6, 2], [11, 5, 21], [-1, 2.6, 2], k, 40); else move(c.cam, [-10, 3.2, -1], [-1.2, 3.0, 11], [-8.5, 3.4, 0.5], [-1.2, 3.2, 11], k, 36);
  shake(c.cam, T, 0.07);
});

// ================= WAREHOUSE =================
SET('warehouse', () => {
  const { s, cam } = mkScene(0x14161b, [40, 130], 0xbcd0ff, 0.7, [0x9fb0c8, 0x2a2c33, 0.95], [-10, 26, 16]);
  s.userData.bloom = 0.25; ground(s, 200, '#3a3d44', '#42454d');
  box(90, 30, 1, 0x24272e, 0, 15, -22, s); for (let x = -36; x <= 36; x += 12) { box(1.6, 30, 1.6, 0x1c1e24, x, 15, -21, s); for (let y = 9; y < 26; y += 5) for (let k = -1; k <= 1; k++) box(2.6, 3.6, 0.2, basic(0x6f86a8), x + 6 + k * 3.2, y, -21.4, s); }
  for (let i = 0; i < 9; i++) box(3 + hash(i) * 2, 3 + hash(i + 1) * 2, 3, [0x6b5a3c, 0x5a4a32][i % 2], -26 + hash(i + 2) * 12, 1.5 + (i % 3 === 0 ? 3.4 : 0), -14 + hash(i + 3) * 8, s);
  const v = van(); v.position.set(19, 0, -8); v.rotation.y = -0.5; s.add(v);
  box(0.12, 9, 0.12, 0x222222, 0, 13.5, 0, s); box(2.4, 0.5, 2.4, 0x333333, 0, 9, 0, s); box(1.2, 0.3, 1.2, basic(0xa88c58), 0, 8.7, 0, s);
  const lamp = new THREE.SpotLight(0xffe2b0, 230, 50, 0.6, 0.6); lamp.position.set(0, 8.4, 0); lamp.target.position.set(0, 0, 0); lamp.castShadow = true; s.add(lamp, lamp.target);
  box(4.2, 0.4, 8.4, 0x7d848c, 0, 2.7, 0, s); for (const [x, z] of [[-1.8, -3.8], [1.8, -3.8], [-1.8, 3.8], [1.8, 3.8]]) box(0.3, 2.5, 0.3, 0x555b62, x, 1.25, z, s);
  const saito = makeChar('saito', 'sad'); lie(saito, 0, 3.45, 2.6); s.add(saito.g); box(1.5, 0.9, 0.2, 0xb9b9b2, 0.2, 3.0, 0.55, saito.body); box(0.5, 0.4, 0.22, 0x9a2a2a, 0.3, 3.0, 0.56, saito.body);
  const P = { eames: put(makeChar('eames', 'serious'), -4.3, 0, 0.2, Math.PI / 2), cobb: put(makeChar('cobb', 'serious'), 4.6, 0, 1.6, -1.2), arthur: put(makeChar('arthur', 'surprised'), 5.6, 0, -3.4, -0.9), ariadne: put(makeChar('ariadne', 'sad'), -3.6, 0, -4.6, 0.8), fischer: put(makeChar('fischer', 'sleep'), -13, 0, -12, 0.4) };
  for (const k in P) s.add(P[k].g); box(2.6, 1.6, 2.6, 0x4a4f58, -13, 0.8, -12.6, s);
  return { s, cam, saito, P, pre(T) { for (const k in P) { P[k].reset(); P[k].idle(T + k.length); } const f = P.fischer; f.sit(); f.g.position.y = 0.1; f.look('sleep', T); f.head.rotation.x = 0.4; saito.reset(); saito.armR.rotation.x = -1.25; saito.armR.rotation.z = -0.35; saito.head.rotation.z = Math.sin(T * 1.5) * 0.12; saito.look(Math.sin(T * 2.2) > 0.4 ? 'sleep' : 'sad', T); P.eames.armL.rotation.x = P.eames.armR.rotation.x = -1.2; P.eames.body.rotation.x = 0.2; P.eames.look('serious', T); P.ariadne.look('sad', T); P.arthur.look('surprised', T); P.cobb.look('serious', T); } };
});
SHOT('e4:0', 'warehouse', c => { move(c.cam, [4.5, 7.8, 8.5], [0, 3.2, -0.4], [3.2, 7.2, 6.5], [0, 3.3, -0.6], c.k, 34); });
SHOT('e4:1', 'warehouse', c => {
  const S = c.S, cb = S.P.cobb, [i, k] = cuts(c.k, [0.5]); cb.look('serious', c.T, fakeTalk(c.T)); cb.armL.rotation.x = -1.2 + Math.sin(c.T * 5) * 0.3; cb.armL.rotation.z = -0.4; S.P.arthur.armL.rotation.z = -0.9 * ease(c.k * 3); S.P.arthur.armR.rotation.z = 0.9 * ease(c.k * 3);
  if (i === 0) move(c.cam, [-11, 4.6, 13], [1, 3.6, 0], [-9, 4.4, 11], [1.4, 3.6, 0], k, 36); else move(c.cam, [-3.6, 5.0, 5.4], [4.6, 4.7, 1.6], [-2.8, 5.0, 4.8], [4.6, 4.7, 1.6], k, 30);
  c.lower('NO WAY TO WAKE UP', 'under this sedative, dying sends you deeper', c.l - 0.5);
});

// ================= THE ABYSS (limbo vision) =================
SET('abyss', () => {
  const { s, cam } = mkScene(0x030811, [30, 170], 0x9fc4ff, 1.1, [0x4f74b8, 0x02040a, 0.9], [4, 40, 10]);
  s.userData.bloom = 0.6;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshPhongMaterial({ color: 0x0a2440, shininess: 120, specular: 0x9fc4ff })); sea.rotation.x = -Math.PI / 2; sea.position.y = -40; s.add(sea);
  const N = 500, pos = new Float32Array(N * 6), st = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.5 })); st.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); st.frustumCulled = false; s.add(st);
  const faller = makeChar('saito', 'sleep'); s.add(faller.g); const fl = new THREE.PointLight(0xcfe0ff, 0, 60); s.add(fl);
  // island + clock
  const I = new THREE.Group(); I.position.set(300, -40, 0); s.add(I);
  const isl = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 1.6, 20), M(0xcdbb92)); isl.position.y = 0.6; isl.receiveShadow = true; I.add(isl);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(11, 0.5, 6, 48), basic(0xdfeaff)); ring.position.set(0, 13.5, -9); I.add(ring);
  for (let i = 0; i < 12; i++) { const t = box(0.4, i % 3 ? 1.1 : 2.0, 0.3, basic(0xdfeaff), Math.sin(i * Math.PI / 6) * 9.6, 13.5 + Math.cos(i * Math.PI / 6) * 9.6, -9, I); t.rotation.z = -i * Math.PI / 6; }
  const hh = new THREE.Group(), mh = new THREE.Group(); hh.position.set(0, 13.5, -9); mh.position.set(0, 13.5, -9); I.add(hh, mh); box(0.6, 5.2, 0.3, basic(0xffd24a), 0, 2.6, 0, hh); box(0.36, 8.4, 0.3, basic(0xffffff), 0, 4.2, 0, mh);
  const y1 = put(makeChar('saito', 'serious'), 0, 1.4, 0), y2 = put(makeChar('saitoOld', 'sad'), 0, 1.4, 0); I.add(y1.g, y2.g);
  const sun = new THREE.PointLight(0xffe2b0, 0, 80); sun.position.set(0, 20, 12); I.add(sun);
  return { s, cam, faller, fl, hh, mh, y1, y2, sun, streaks(T, cy, sp) { for (let i = 0; i < N; i++) { const x = (hash(i) - 0.5) * 60, z = (hash(i + 0.5) - 0.5) * 60, y = cy - 30 + ((T * sp + hash(i + 0.2) * 60) % 60); pos.set([x, y, z, x, y + 2.5, z], i * 6); } st.geometry.attributes.position.needsUpdate = true; }, pre() { st.visible = true; fl.intensity = 0; } };
});
SHOT('e4:2', 'abyss', c => { const S = c.S, f = S.faller, y = 14 - c.l * 9; f.reset(); f.g.position.set(0, y, 0); f.g.rotation.set(-1.2 + c.T * 0.5, c.T * 0.35, 0.3); f.armL.rotation.z = -2.2 + Math.sin(c.T * 3) * 0.3; f.armR.rotation.z = 2.2 - Math.sin(c.T * 3.3) * 0.3; f.legL.rotation.x = Math.sin(c.T * 2) * 0.5; f.legR.rotation.x = -Math.sin(c.T * 2) * 0.5; f.look('sleep', c.T); S.streaks(c.T, y, 40); f.g.updateMatrixWorld(true); const ct = f.g.localToWorld(new THREE.Vector3(0, 2.8, 0)); S.fl.intensity = 500; S.fl.position.set(ct.x + 5, ct.y + 4, ct.z + 9); move(c.cam, [8, ct.y + 5, 15], [ct.x, ct.y, ct.z], [5, ct.y - 4, 12.5], [ct.x, ct.y, ct.z], c.k, 38, 0.15); });
SHOT('e4:3', 'abyss', c => {
  const S = c.S, old = c.k > 0.5; S.streaks(c.T, -200, 0); S.hh.rotation.z = -c.l * 5; S.mh.rotation.z = -c.l * 60; S.sun.intensity = 380 * (0.55 + 0.45 * Math.sin(c.l * 9));
  S.y1.g.visible = !old; S.y2.g.visible = old; const ch = old ? S.y2 : S.y1; ch.reset(); ch.idle(c.T); ch.look(old ? 'sad' : 'serious', c.T); if (old) { ch.body.rotation.x = 0.22 * ease((c.k - 0.5) * 4); ch.head.rotation.x = 0.2; }
  if (Math.abs(c.k - 0.5) < 0.04) c.flash(0.7 * (1 - Math.abs(c.k - 0.5) / 0.04));
  move(c.cam, [304, -34, 38], [300, -30.5, -4], [301.5, -34.6, 15], [300, -36.2, 0], c.k, 38);
});

// ================= BRIDGE + VAN =================
SET('bridge', () => {
  const { s, cam } = mkScene(0x687582, [60, 330], 0xdfeaf5, 1.7, [0xcfd9e4, 0x4a5560, 1.5], [-16, 40, 22], 45);
  s.userData.bloom = 0.35;
  const river = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshPhongMaterial({ color: 0x2c566e, shininess: 70 })); river.rotation.x = -Math.PI / 2; river.position.y = -42; s.add(river);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(22, 2.5, 640), new THREE.MeshPhongMaterial({ color: 0x3a3f46, shininess: 60, specular: 0x556677 })); deck.position.set(0, -1.25, 0); deck.receiveShadow = true; s.add(deck);
  for (let z = -310; z < 310; z += 9) box(0.5, 0.05, 4, 0xe8e0b0, 0, 0.03, z, s);
  const rails = []; for (const sx of [-1, 1]) { box(0.5, 0.5, 640, 0x8a9199, sx * 10.6, 2.4, 0, s); for (let z = -312; z < 312; z += 6) { const p = box(0.4, 2.4, 0.4, 0x8a9199, sx * 10.6, 1.2, z, s); if (sx > 0) rails.push(p); } }
  for (const z of [-140, 0, 140]) { for (const sx of [-1, 1]) { box(5, 120, 6, 0x7a4a3a, sx * 13.5, 18, z, s); for (let k = 1; k < 12; k++) { const zz = z + k * 6, h = 60 - Math.sin(k / 23 * Math.PI) * 58; tube(s, [sx * 12, 76 - (76 - 2.4) * (1 - Math.abs(1 - k / 11.5)) ** 0 * 0 + 0, zz], [sx * 12, 2.6, zz], 0x7a4a3a, 0.14).visible = false; } } box(32, 5, 5, 0x7a4a3a, 0, 70, z, s); box(32, 4, 4, 0x7a4a3a, 0, 40, z, s); }
  for (const sx of [-1, 1]) for (let z = -300; z < 300; z += 7) { const d = Math.abs(((z + 70 + 700) % 140) - 70) / 70, top = 6 + 66 * (1 - d) ** 2 + 4; box(0.16, top - 2.5, 0.16, 0x7a4a3a, sx * 11.6, 2.5 + (top - 2.5) / 2, z, s).castShadow = false; box(0.5, 0.5, 7.4, 0x7a4a3a, sx * 11.6, top, z, s).castShadow = false; }
  for (let i = 0; i < 30; i++) { const h = 30 + hash(i) * 70, b = box(16 + hash(i + 1) * 14, h, 16, [0x4d5864, 0x566270, 0x47525d][i % 3], (i % 2 ? 1 : -1) * (90 + hash(i + 2) * 110), h / 2 - 42, -300 + i * 20, s); b.castShadow = false; }
  // custom van with an interior
  const V = new THREE.Group(); s.add(V); const body = new THREE.Group(); V.add(body); const wh = 0xf2f2ee;
  box(6, 0.3, 12, 0xd9d9d4, 0, 1.3, 0, body); box(6, 0.3, 12.4, wh, 0, 6.5, -0.2, body); box(0.2, 5, 12, wh, 3, 3.9, 0, body); const sideL = box(0.2, 5, 12, wh, -3, 3.9, 0, body); box(6, 5, 0.2, wh, 0, 3.9, -6, body);
  box(6.2, 2.0, 2.6, wh, 0, 2.3, 7.2, body); box(6, 0.6, 0.3, 0x333333, 0, 1.5, 8.5, body); box(1.2, 0.5, 0.2, basic(0xfff2b0), -2, 2.6, 8.52, body); box(1.2, 0.5, 0.2, basic(0xfff2b0), 2, 2.6, 8.52, body);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.2), new THREE.MeshPhongMaterial({ color: 0x9fc8e6, transparent: true, opacity: 0.22, shininess: 100, side: THREE.DoubleSide })); gl.position.set(0, 4.8, 6.0); body.add(gl); box(0.25, 3.4, 0.25, wh, -2.9, 4.8, 6, body); box(0.25, 3.4, 0.25, wh, 2.9, 4.8, 6, body); box(6, 0.3, 1.6, 0x2a2e33, 0, 3.2, 5.4, body);
  const wheelS = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 6, 14), M(0x1a1a1a)); wheelS.position.set(-1.45, 3.9, 4.75); wheelS.rotation.x = -0.4; body.add(wheelS);
  const wip = [-1.4, 1.4].map(x => { const g = new THREE.Group(); g.position.set(x, 3.35, 6.08); body.add(g); box(0.1, 2.4, 0.06, 0x111111, 0, 1.2, 0, g); return g; });
  for (const [x, z] of [[-3, 4.4], [3, 4.4], [-3, -3.6], [3, -3.6]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.8, 12), M(0x1a1a1a)); w.rotation.z = Math.PI / 2; w.position.set(x, 1.15, z); w.castShadow = true; body.add(w); }
  for (const z of [3.6, -0.6, -3.6]) box(5.4, 0.7, 2.0, 0x4a5568, 0, 1.8, z - 0.3, body);
  const il = new THREE.PointLight(0xfff0d8, 12, 14); il.position.set(0, 5.6, -1); body.add(il);
  const mk = (n, x, z) => { const c = makeChar(n, 'sleep'); c.g.scale.setScalar(0.72); c.g.position.set(x, 1.07, z); body.add(c.g); c.home = [x, 1.07, z]; return c; };
  const yusuf = mk('yusuf', -1.45, 3.6), sl = [mk('cobb', -1.45, -0.6), mk('arthur', 1.45, -0.6), mk('ariadne', -1.45, -3.6), mk('eames', 1.45, -3.6), mk('fischer', 1.45, 3.6)];
  const mach = box(1.2, 0.5, 0.9, new THREE.MeshPhongMaterial({ color: 0xb9c0c9, shininess: 90 }), 0, 2.4, -2.1, body); const tubes = new THREE.Group(); body.add(tubes); for (const c of sl) tube(tubes, [0, 2.6, -2.1], [c.home[0] * 0.5, 2.9, c.home[2] + 0.6], 0xe8e8e0, 0.07);
  const rain = mkRain(s, 2200, [120, 120], 50); const splash = mkBurst(s, 220, new THREE.MeshPhongMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.85 })); const debris = mkBurst(s, 40, 0x8a9199);
  return {
    s, cam, V, body, sideL, yusuf, sl, wip, rails, rain, splash, debris, wheelS,
    pre(T) { V.position.set(-3.6, 0, 0); V.rotation.set(0, 0, 0); body.rotation.set(0, 0, 0); body.position.y = Math.abs(Math.sin(T * 17)) * 0.05; sideL.visible = true; splash.im.visible = debris.im.visible = false; wip.forEach(w => w.rotation.z = Math.sin(T * 5) * 0.75 - 0.2); rails.forEach(r => r.visible = true);
      yusuf.reset(); yusuf.sit(); yusuf.armL.rotation.x = yusuf.armR.rotation.x = -1.25; yusuf.armL.rotation.z = -0.25 + Math.sin(T * 3) * 0.15; yusuf.armR.rotation.z = 0.25 + Math.sin(T * 3) * 0.15; yusuf.look('serious', T); yusuf.head.rotation.y = Math.sin(T * 1.3) * 0.25; wheelS.rotation.z = Math.sin(T * 3) * 0.4;
      sl.forEach((c, i) => { c.reset(); c.sit(); c.g.position.set(...c.home); c.g.rotation.set(0, 0, 0); c.look('sleep', T); c.head.rotation.x = 0.32; c.head.rotation.z = Math.sin(T * 2.2 + i * 2) * 0.14; }); }
  };
});
SHOT('e5:0', 'bridge', c => { const S = c.S, vz = -120 + c.l * 26; S.V.position.z = vz; S.sideL.visible = false; S.rain(c.T, 0, 0, vz); move(c.cam, [-17, 5.2, vz - 3], [-3.6, 3.7, vz - 1.5], [-13.5, 4.6, vz - 1], [-3.6, 3.7, vz - 1.5], c.k, 36); });
SHOT('e5:1', 'bridge', c => { const S = c.S, vz = -70 + c.l * 26; S.V.position.z = vz; S.rain(c.T, 0, 0, vz); move(c.cam, [-3.6, 5.0, vz + 16], [-4.6, 4.3, vz + 3.6], [-4.2, 4.8, vz + 12.5], [-4.8, 4.3, vz + 3.6], c.k, 30); });
SHOT('e5:2', 'bridge', c => { const S = c.S, vz = -40 + c.l * 30; S.V.position.z = vz; S.rain(c.T, 0, 20, vz + 20); move(c.cam, [5, 9, vz + 24], [-3.6, 2, vz], [8, 34, vz + 50], [-3.6, 2, vz + 8], c.k, 40); if (c.k > 0.78) c.flash((c.k - 0.78) / 0.22); });
SHOT('e7:0', 'bridge', c => {
  const S = c.S, T = c.T, [i, k] = cuts(c.k, [0.5]), g = ease(c.k * 1.15);
  const vz = -30 + c.l * 22; S.V.position.set(-3.6 + g * 16, g * g * -5, vz); S.V.rotation.set(0, Math.sin(c.l * 6) * 0.35 * (1 - g) + g * 0.9, 0); S.body.rotation.z = -g * 1.9; S.rain(T, 0, 0, vz);
  S.rails.forEach(r => { if (Math.abs(r.position.z - (vz + 4)) < 9 && g > 0.55) r.visible = false; }); S.debris.fire([10.6, 1.5, vz + 2], (g - 0.55) * 1.4, 12, 20, 0.7);
  S.sl.forEach((ch, j) => { const f = ease(c.k * 1.4); ch.g.position.y = ch.home[1] + f * (0.9 + (j % 2) * 0.5) + Math.sin(T * 2 + j) * 0.15 * f; ch.g.rotation.z = f * (j % 2 ? 0.5 : -0.4); ch.armL.rotation.z = -f * 1.2; ch.armR.rotation.z = f * 1.2; ch.legL.rotation.x = -Math.PI / 2 + f * 0.9; ch.legR.rotation.x = -Math.PI / 2 + f * 0.6; });
  if (i === 0) { move(c.cam, [-8, 3.4, vz + 34], [0, 2.5, vz], [-6.5, 2.6, vz + 27], [5, 1, vz], k, 40); shake(c.cam, T, 0.06); }
  else { S.sideL.visible = false; const o = new THREE.Vector3(-15, 3.4, -1.5).applyEuler(S.body.rotation).applyEuler(S.V.rotation).add(S.V.position), t = new THREE.Vector3(0, 3.6, -1.5).applyEuler(S.body.rotation).applyEuler(S.V.rotation).add(S.V.position); shot(c.cam, [o.x, o.y, o.z], [t.x, t.y, t.z], 38, S.body.rotation.z * 0.75); }
});
SHOT('h1:3', 'bridge', c => {
  const S = c.S, T = c.T, k = c.k, y = lerp(-6, -41, Math.pow(k, 1.25)); S.V.position.set(16, y, 0); S.V.rotation.set(-1.15 - k * 0.25, 0.3, 0); S.body.rotation.z = 0.25; S.rain(T, 0, -20, 0);
  const hit = (k - 0.62) / 0.38; S.splash.fire([16, -42, -3, -43], hit * 1.5, 30, 34, 2.6); if (hit > 0 && hit < 0.12) c.flash(0.6 * (1 - hit / 0.12)); if (k > 0.86) c.flash((k - 0.86) / 0.14);
  move(c.cam, [46, -30, 30], [16, y + 3, 0], [40, -37, 24], [16, Math.max(y + 3, -36), 0], k, 40, 0.08); shake(c.cam, T, hit > 0 ? 0.25 : 0.03);
});

// ================= HOTEL: bar, spinning corridor, elevator shaft =================
SET('hotel', () => {
  const { s, cam } = mkScene(0x1a120c, [45, 150], 0xffe2b0, 0.5, [0xffe8c8, 0x6a4a30, 1.15], [6, 30, 20]);
  s.userData.bloom = 0.5; s.userData.sun.castShadow = false;
  const carpet = tex(64, 64, c => { c.fillStyle = '#6f1c22'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#b8862f'; c.lineWidth = 3; c.strokeRect(6, 6, 52, 52); c.fillStyle = '#b8862f'; c.fillRect(28, 28, 8, 8); }); carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping;
  const cm = carpet.clone(); cm.repeat.set(16, 12); const fl = new THREE.Mesh(new THREE.PlaneGeometry(64, 48), new THREE.MeshLambertMaterial({ map: cm })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  box(64, 0.6, 48, 0xe9dcc0, 0, 15.3, 0, s); box(64, 15, 1, 0x4a2f1b, 0, 7.5, -21, s); for (const sx of [-1, 1]) box(1, 15, 48, 0x5a3a22, sx * 32, 7.5, 0, s);
  for (let x = -24; x <= 24; x += 12) { box(8, 11, 0.3, basic(0x4f6f9a), x, 7.5, 23.6, s); box(8.6, 0.5, 0.6, 0x3a2416, x, 13.2, 23.4, s); box(0.4, 11, 0.6, 0x3a2416, x, 7.5, 23.4, s); box(2.2, 15, 1.2, 0x5a3a22, x + 6, 7.5, 23.6, s); }
  // bar
  const gold = new THREE.MeshPhongMaterial({ color: 0xb8892f, shininess: 120, specular: 0xffe0a0 });
  box(30, 3.0, 2.6, 0x3a2416, 0, 1.5, -14, s); box(30.6, 0.3, 3.2, gold, 0, 3.15, -14, s); box(30, 9, 0.6, 0x2a1a10, 0, 6.5, -20.2, s); for (let y = 4.4; y < 10; y += 1.9) box(28, 0.2, 1.0, gold, 0, y, -19.6, s);
  const bc = [0xff9d3a, 0x6fd08a, 0xffd24a, 0xd04a3a, 0x8fd0ff]; for (let i = 0; i < 66; i++) box(0.4, 1.0 + hash(i) * 0.5, 0.4, basic(bc[i % 5]), -13.5 + (i % 22) * 1.28, 5.1 + Math.floor(i / 22) * 1.9, -19.5, s).material.color.multiplyScalar(0.55);
  for (let x = -12; x <= 12; x += 3) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.35, 12), M(0x7a1f24)); st.position.set(x, 2.25, -10.8); s.add(st); box(0.3, 2.1, 0.3, 0xb8892f, x, 1.05, -10.8, s); }
  const glasses = [-6.2, -4.6, -2.9, 0.2, 2.8].map(x => { const g = box(0.42, 0.7, 0.42, new THREE.MeshPhongMaterial({ color: 0xffe2b0, transparent: true, opacity: 0.75, shininess: 100 }), x, 3.65, -13.4, s); g.userData.x = x; return g; });
  // lounge
  const civ = []; const chand = [];
  [[-16, 4], [-6, 10], [8, 6], [18, 12], [-22, 14], [22, 0]].forEach(([x, z], i) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 14), M(0x2a1a10)); t.position.set(x, 2.6, z); s.add(t); box(0.5, 2.5, 0.5, 0x2a1a10, x, 1.25, z, s); box(0.5, 0.9, 0.5, basic(0xffd9a0), x, 3.5, z, s); box(1.2, 0.2, 1.2, 0xb8892f, x, 4.05, z, s);
    for (const sx of [-1, 1]) { box(2.2, 1.5, 2.2, 0x7a1f24, x + sx * 3.6, 0.75, z, s); if ((i + (sx > 0)) % 3) { const c = put(makeChar(['civA', 'civB', 'civC', 'civD'][(i * 2 + (sx > 0)) % 4]), x + sx * 3.6, 0, z, -sx * Math.PI / 2); s.add(c.g); civ.push(c); } } });
  for (const [x, z] of [[-12, 4], [12, 4], [0, 14]]) { const g = new THREE.Group(); g.position.set(x, 15, z); s.add(g); box(0.15, 3, 0.15, 0xb8892f, 0, -1.5, 0, g); for (let i = 0; i < 14; i++) box(0.6, 0.8, 0.6, basic(0xffd9a0), Math.sin(i * 0.9) * (1.2 + (i % 3) * 0.8), -3.2 - (i % 3) * 0.6, Math.cos(i * 0.9) * (1.2 + (i % 3) * 0.8), g); chand.push(g); const p = new THREE.PointLight(0xffc888, 130, 40); p.position.set(x, 10, z); s.add(p); }
  const bl = new THREE.PointLight(0xffd0a0, 22, 22); bl.position.set(0, 7, -15); s.add(bl);
  const cobb = makeChar('cobb', 'serious'), fis = makeChar('fischer', 'neutral'); s.add(cobb.g, fis.g);
  // ---- corridor (x = 300)
  const cor = new THREE.Group(); cor.position.set(300, 0, 0); s.add(cor); const Hh = 4.2, L = 90;
  const cp = carpet.clone(); cp.repeat.set(3, 30); const pl = (w, h, m, x, y, z, rx, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); cor.add(p); };
  pl(Hh * 2, L, new THREE.MeshLambertMaterial({ map: cp }), 0, -Hh, -L / 2 + 26, -Math.PI / 2, 0); pl(Hh * 2, L, M(0xe9dcc0), 0, Hh, -L / 2 + 26, Math.PI / 2, 0);
  const wall = tex(64, 64, c => { c.fillStyle = '#d9c7a0'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#6b4a2e'; c.fillRect(0, 44, 64, 20); c.fillStyle = '#8a6238'; c.fillRect(0, 42, 64, 4); }); wall.wrapS = THREE.RepeatWrapping; wall.repeat.set(22, 1); const wm = new THREE.MeshLambertMaterial({ map: wall });
  pl(L, Hh * 2, wm, -Hh, 0, -L / 2 + 26, 0, Math.PI / 2); pl(L, Hh * 2, wm, Hh, 0, -L / 2 + 26, 0, -Math.PI / 2);
  for (let z = 20; z > -62; z -= 9) { for (const sx of [-1, 1]) { box(0.16, 5.6, 3, 0x4a2f1b, sx * (Hh - 0.08), -Hh + 2.8, z, cor); box(0.2, 0.3, 0.3, 0xd9b24a, sx * (Hh - 0.2), -Hh + 2.7, z + 1.1, cor); box(0.3, 0.9, 0.5, basic(0xb89a60), sx * (Hh - 0.2), 1.6, z - 4.5, cor); } box(1.6, 0.25, 1.6, basic(0xc9b488), 0, Hh - 0.13, z - 4, cor); if (z > -30 && (z + 7) % 18 === 0) { const p = new THREE.PointLight(0xffd9a0, 10, 26); p.position.set(0, Hh - 1.4, z - 4); cor.add(p); } }
  box(Hh * 2, Hh * 2, 0.4, 0x3a2416, 0, 0, -64, cor); const cl = new THREE.PointLight(0xffe2c0, 30, 40); cl.position.set(300, 0, 12); s.add(cl);
  const arthur = makeChar('arthur', 'serious'), guard = makeChar('guard', 'serious'); arthur.g.rotation.order = guard.g.rotation.order = 'ZYX'; s.add(arthur.g, guard.g);
  // ---- elevator shaft (x = 600)
  const sh = new THREE.Group(); sh.position.set(600, 0, 0); s.add(sh);
  box(16, 400, 1, 0x2a2c31, 0, 0, -7, sh); box(1, 400, 14, 0x33363c, -8, 0, 0, sh); box(1, 400, 14, 0x33363c, 8, 0, 0, sh);
  for (let y = -190; y < 190; y += 9) { box(16, 0.8, 0.8, 0x4a4e56, 0, y, -6.2, sh); box(0.8, 0.8, 14, 0x4a4e56, -7.2, y, 0, sh); box(0.8, 0.8, 14, 0x4a4e56, 7.2, y, 0, sh); if (y % 27 === 0) box(1.4, 0.5, 0.4, basic(0xffb866), -4, y + 2, -6, sh); }
  box(0.5, 400, 0.5, 0x8a9199, -5.4, 0, -3, sh); box(0.5, 400, 0.5, 0x8a9199, 5.4, 0, -3, sh);
  const carg = new THREE.Group(); sh.add(carg); box(10, 9, 9, 0x6b4a2e, 0, 0, 0, carg); box(10.4, 0.6, 9.4, 0xb8892f, 0, 4.8, 0, carg); box(10.4, 0.6, 9.4, 0xb8892f, 0, -4.8, 0, carg); box(3.6, 7, 0.2, 0xc9a24a, -1.9, -0.4, 4.6, carg); box(3.6, 7, 0.2, 0xc9a24a, 1.9, -0.4, 4.6, carg); box(2.4, 0.8, 0.2, basic(0xffe9b0), 0, 3.9, 4.62, carg);
  const cables = [-1.5, 1.5].map(x => box(0.25, 200, 0.25, 0x15171a, x, 105, 0, carg)); const el = new THREE.PointLight(0xffc888, 300, 60); el.position.set(0, 0, 12); carg.add(el);
  const spk = mkBurst(s, 90, basic(0xffc060)), spk2 = mkBurst(s, 90, basic(0xffe9a0));
  return {
    s, cam, cobb, fis, glasses, chand, civ, cor, arthur, guard, carg, cables, spk, spk2, Hh,
    pre(T) { cobb.reset(); fis.reset(); put(cobb, 1.6, 0.9, -10.8, Math.PI); put(fis, -1.6, 0.9, -10.8, Math.PI); cobb.sit(); fis.sit(); cobb.armL.rotation.x = cobb.armR.rotation.x = fis.armL.rotation.x = fis.armR.rotation.x = -1.0; glasses.forEach(g => { g.position.x = g.userData.x; g.rotation.z = 0; }); chand.forEach(g => g.rotation.z = 0); civ.forEach((c, i) => { c.reset(); c.sit(); c.idle(T + i); c.look('neutral', T + i, i % 2 ? fakeTalk(T + i) * 0.7 : 0); c.armR.rotation.x = -1.0 - (i % 2) * Math.sin(T * 2 + i) * 0.3; }); cor.rotation.z = 0; spk.im.visible = spk2.im.visible = false; }
  };
});
SHOT('e6:0', 'hotel', c => { c.S.cobb.look('serious', c.T); c.S.fis.look('neutral', c.T); move(c.cam, [0, 8, 21.5], [0, 4.6, -14], [0, 6.8, 16], [0, 4.4, -14], c.k, 46); c.dom(levelDom(2, 'THE HOTEL', c.l, 9)); });
SHOT('e6:1', 'hotel', c => { c.S.cobb.look('serious', c.T); c.S.fis.look('neutral', c.T); move(c.cam, [-22, 11, 12], [-2, 4, -8], [-17, 7.5, 7], [0, 4, -10], c.k, 42); c.dom(levelDom(2, 'THE HOTEL', c.l + 0.78, 1.68)); });
SHOT('e6:2', 'hotel', c => {
  const S = c.S, [i, k] = cuts(c.k, [0.58]); S.cobb.look('serious', c.T, fakeTalk(c.T)); S.cobb.head.rotation.y = 0.75; S.cobb.body.rotation.z = 0.08;
  const sh = ease((c.k - 0.45) * 4); S.fis.look(sh > 0.5 ? 'surprised' : 'neutral', c.T); S.fis.head.rotation.y = -0.8 * sh;
  if (i === 0) move(c.cam, [1.5, 5.8, -18.6], [0, 5.3, -10.8], [0.6, 5.7, -18.2], [0, 5.3, -10.8], k, 34); else move(c.cam, [-0.4, 5.6, -17.6], [-1.6, 5.4, -10.8], [-0.9, 5.6, -16.9], [-1.6, 5.4, -10.8], k, 28);
});
SHOT('e6:3', 'hotel', c => {
  const S = c.S, t = ease(c.k * 1.3); S.cobb.look('smirk', c.T, fakeTalk(c.T) * (c.k < 0.5)); S.cobb.head.rotation.y = 0.6; S.fis.look('surprised', c.T); S.fis.head.rotation.y = 0.9 * t; S.fis.head.rotation.x = 0.2;
  S.glasses.forEach((g, i) => { g.position.x = g.userData.x + t * t * (5 + i * 1.3); g.rotation.z = -t * 0.25; }); S.chand.forEach(g => g.rotation.z = -t * 0.45 + Math.sin(c.T * 3) * 0.05 * t); S.civ.forEach(cv => cv.body.rotation.z = -t * 0.18);
  move(c.cam, [-10.5, 4.5, -16.6], [0, 3.9, -12.6], [-9, 4.4, -16.4], [1.5, 3.9, -12.4], c.k, 34, t * 0.3);
});
SHOT('e7:1', 'hotel', c => {
  const S = c.S, T = c.T, rot = c.l * 1.9; S.cor.rotation.z = rot; const base = 1.15 * Math.sin(rot * 0.85 + 0.4), R = S.Hh - 0.15;
  const p = (c.l * 2.4) % 1, punch = Math.sin(clamp(p * 2.2) * Math.PI), who = Math.floor(c.l * 2.4) % 2;
  [[S.arthur, base - 0.6, Math.PI / 2 + 0.3, 3], [S.guard, base + 0.6, -Math.PI / 2 - 0.3, 1.5]].forEach(([ch, ph, ry, z], j) => { ch.reset(); ch.g.position.set(300 + Math.sin(ph) * R, -Math.cos(ph) * R, z); ch.g.rotation.set(0, ry, ph); const hit = j === who ? punch : 0, got = j !== who ? punch : 0; ch.armR.rotation.x = -1.0 - hit * 0.8; ch.armL.rotation.x = -0.9; ch.body.rotation.x = hit * 0.22 - got * 0.4; ch.head.rotation.x = -got * 0.5; ch.legL.rotation.x = Math.sin(T * 9 + j) * 0.5; ch.legR.rotation.x = -Math.sin(T * 9 + j) * 0.5; ch.body.position.y = Math.abs(Math.sin(T * 6 + j * 2)) * 0.5; ch.look(got > 0.4 ? 'surprised' : 'serious', T); });
  move(c.cam, [300, 0.2, 23], [300, -0.4, 0], [300, 0, 18], [300, -0.5, 0], c.k, 38, -0.15 * Math.sin(rot * 0.85 + 0.4));
});
SHOT('h1:2', 'hotel', c => {
  const S = c.S, k = c.k, y = 60 - Math.pow(k, 1.5) * 150; S.carg.position.y = y; S.carg.rotation.z = Math.sin(c.T * 40) * 0.012; S.cables.forEach((cb, i) => { cb.visible = k < 0.12; });
  const ph = (c.T * 5) % 1; S.spk.fire([594.6, y - 4, -3], 0.1 + ph * 0.3, 9, -30, 0.3, Math.floor(c.T * 5)); S.spk2.fire([605.4, y - 4, -3], 0.1 + ((ph + 0.5) % 1) * 0.3, 9, -30, 0.3, Math.floor(c.T * 5 + 0.5) + 9);
  if (c.l < 0.15) c.flash(0.8 * (1 - c.l / 0.15)); move(c.cam, [600, 16, 34], [600, y * 0.75 + 4, 0], [601, -22, 30], [600, y * 0.8, 0], k, 44, Math.sin(c.T * 3) * 0.05); shake(c.cam, c.T, 0.2);
});

// ================= SNOW FORTRESS =================
SET('snow', () => {
  const { s, cam } = mkScene(0xdfe9f2, [70, 360], 0xffffff, 2.3, [0xffffff, 0xb8c4d2, 1.6], [24, 40, 30], 70);
  s.userData.bloom = 0.3; ground(s, 700, '#eef3f8', '#f8fbfd');
  const r = rng(8);
  for (let i = 0; i < 11; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(50 + r() * 40, 90 + r() * 70, 4), M(i % 2 ? 0xc6d2de : 0xb4c2d0)); m.position.set((i - 5) * 60 + r() * 20, 40, -230 - r() * 60); m.rotation.y = r() * 3; s.add(m); const c = new THREE.Mesh(new THREE.ConeGeometry(20, 36, 4), M(0xffffff)); c.position.set(m.position.x, m.position.y + m.geometry.parameters.height / 2 - 17, m.position.z); c.rotation.y = m.rotation.y; s.add(c); }
  for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 220, z = 30 - r() * 110; if (Math.abs(x) < 14) continue; const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(0.8 + r() * 0.7); s.add(g); box(0.8, 2, 0.8, 0x5a3d26, 0, 1, 0, g); for (let k = 0; k < 3; k++) { box(4 - k * 1.1, 1.6, 4 - k * 1.1, 0x2f6b45, 0, 2.6 + k * 1.6, 0, g); box(4.1 - k * 1.1, 0.35, 4.1 - k * 1.1, 0xffffff, 0, 3.5 + k * 1.6, 0, g); } }
  const F = new THREE.Group(); F.position.set(0, 0, -110); s.add(F); const con = [0x8d949c, 0x7b828a, 0x9aa1a9];
  box(150, 9, 50, 0xe6edf3, 0, 4.5, -8, F); box(110, 5, 40, 0xedf2f7, 0, 11, -8, F);
  const mid = [-1, 1].map(sx => { const g = new THREE.Group(); F.add(g); box(22, 22, 20, con[0], sx * 11, 24.5, -8, g); box(23, 1.2, 21, 0xffffff, sx * 11, 36, -8, g); for (let i = 0; i < 3; i++) box(3.2, 1.3, 0.3, 0x22262b, sx * (4.5 + i * 6), 30, 2.1, g); return g; });
  const towers = [-1, 1].map(sx => { const g = new THREE.Group(); g.position.set(sx * 33, 13.5, -8); F.add(g); box(16, 34, 16, con[1], 0, 17, 0, g); box(17, 1.2, 17, 0xffffff, 0, 34.6, 0, g); box(10, 6, 10, con[2], 0, 38, 0, g); box(0.4, 12, 0.4, 0x333333, 0, 46, 0, g); for (let y = 8; y < 32; y += 7) box(6, 1.2, 0.3, 0x22262b, 0, y, 8.1, g); return g; });
  const door = new THREE.Group(); door.position.set(0, 21.5, 2.3); F.add(door); const steel = new THREE.MeshPhongMaterial({ color: 0xaab3bd, shininess: 60, flatShading: true });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 1, 24), M(0x4b5158)); ring.rotation.x = Math.PI / 2; door.add(ring); const disc = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 1.5, 24), steel); disc.rotation.x = Math.PI / 2; door.add(disc);
  const wheel = new THREE.Group(); wheel.position.z = 1.0; door.add(wheel); for (let i = 0; i < 4; i++) box(8, 0.6, 0.4, 0x2d3238, 0, 0, 0, wheel).rotation.z = i * Math.PI / 4; box(1.6, 1.6, 0.7, 0x2d3238, 0, 0, 0.1, wheel);
  const charges = []; for (let i = 0; i < 10; i++) charges.push(box(0.9, 0.9, 0.5, basic(0xff3b30), (i % 2 ? 1 : -1) * (6 + (i >> 1) * 7.5), 15 + (i % 3) * 5, i < 4 ? 2.4 : 0.4, F));
  const SN = 1400, sp = new Float32Array(SN * 3), snow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, fog: false })); snow.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3)); snow.frustumCulled = false; s.add(snow);
  const sk = ['cobb', 'eames', 'ariadne'].map(n => { const c = makeChar(n, 'serious'); for (const l of [c.legL, c.legR]) box(0.5, 0.12, 5, 0xd03a2e, 0, -2.05, 0.6, l); for (const a of [c.armL, c.armR]) box(0.12, 3.2, 0.12, 0x222222, 0, -2.4, 0.5, a); s.add(c.g); return c; });
  const eames = makeChar('eames', 'smirk'); s.add(eames.g); const det = box(0.5, 0.9, 0.4, 0x22262b, 0, 0, 0.3, eames.hand('R')); box(0.2, 0.2, 0.2, basic(0xff3b30), 0, 0.5, 0, det);
  const b1 = mkBurst(s, 200, 0x8d949c), b2 = mkBurst(s, 160, basic(0xffb040)), b3 = mkBurst(s, 200, 0xffffff);
  return {
    s, cam, F, mid, towers, wheel, charges, sk, eames, b1, b2, b3,
    snowAt(T, cx, cy, cz) { for (let i = 0; i < SN; i++) sp.set([cx + (hash(i) - 0.5) * 110 + Math.sin(T + i) * 0.8, cy + 40 - ((T * 6 + hash(i + 0.3) * 40) % 40), cz + (hash(i + 0.6) - 0.5) * 110], i * 3); snow.geometry.attributes.position.needsUpdate = true; },
    pre(T) { wheel.rotation.z = T * 0.6; sk.forEach(c => c.g.visible = false); eames.g.visible = false; charges.forEach(c => c.visible = false); towers.forEach(t => t.rotation.set(0, 0, 0)); towers.forEach((t, i) => t.position.y = 13.5); mid.forEach(m => { m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); }); b1.im.visible = b2.im.visible = b3.im.visible = false; }
  };
});
const skiers = (S, T, l, z0, sp) => S.sk.forEach((c, i) => { c.g.visible = true; c.reset(); const ph = l * 2.6 + i * 1.9; put(c, [-5, 4, 0][i] + Math.sin(ph) * 3.2, 0.12, z0 + l * sp - [0, 6, 13][i], Math.cos(ph) * 0.5); c.g.rotation.z = -Math.cos(ph) * 0.24; c.body.rotation.x = 0.3; c.legL.rotation.x = c.legR.rotation.x = -0.3; c.armL.rotation.x = c.armR.rotation.x = -0.7; c.armL.rotation.z = -0.35; c.armR.rotation.z = 0.35; c.look(i === 1 ? 'joy' : 'serious', T); });
SHOT('e8:0', 'snow', c => { c.S.snowAt(c.T, 20, 10, 20); skiers(c.S, c.T, c.l, -20, 14); move(c.cam, [40, 46, 70], [0, 20, -110], [32, 38, 56], [0, 20, -110], c.k, 44); c.dom(levelDom(3, 'THE FORTRESS', c.l, 2.2)); });
SHOT('e8:1', 'snow', c => {
  const S = c.S, [i, k] = cuts(c.k, [0.36, 0.68]);
  if (i === 0) { const z = -30 + c.l * 14; skiers(S, c.T, c.l, -24, 14); S.snowAt(c.T, 0, 0, z); move(c.cam, [13, 3.4, z + 27], [0, 3.6, z - 4], [10, 4.4, z + 23], [0, 3.8, z - 4], k, 40); if (c.l < 1.1) c.dom(levelDom(3, 'THE FORTRESS', c.l + 1.1, 2.2)); }
  else if (i === 1) { S.snowAt(c.T, -20, 0, -50); move(c.cam, [-44, 5, -34], [0, 30, -116], [-34, 9, -44], [0, 28, -116], k, 46); }
  else { S.snowAt(c.T, 0, 10, -80); move(c.cam, [5, 20, -66], [0, 21.5, -108], [1.5, 21.5, -88], [0, 21.5, -108], k, 40); }
});
SHOT('h1:0', 'snow', c => {
  const S = c.S, e = S.eames; S.snowAt(c.T, 0, 0, -30); e.g.visible = true; e.reset(); put(e, -2.4, 0, -40, 0.25); e.idle(c.T); e.look('smirk', c.T); const pr = ease((c.k - 0.6) * 4); e.armR.rotation.x = -1.5 * pr; e.armR.rotation.z = -0.3 * pr;
  S.charges.forEach((ch, i) => ch.visible = Math.sin(c.T * (10 + c.k * 30) + i) > 0);
  move(c.cam, [4, 4.2, -24], [0.5, 9, -60], [2.2, 4.8, -28.5], [0, 8.5, -60], c.k, 40); if (c.k > 0.93) c.flash((c.k - 0.93) / 0.07);
});
SHOT('h1:1', 'snow', c => {
  const S = c.S, k = c.k, t = c.l; S.snowAt(c.T, 0, 10, -60);
  S.towers.forEach((tw, i) => { const f = ease((k - 0.08 - i * 0.12) * 1.6); tw.rotation.z = (i ? -1 : 1) * f * 1.25; tw.rotation.x = f * 0.3; tw.position.y = 13.5 - f * 5; });
  S.mid.forEach((m, i) => { const f = ease((k - 0.2) * 1.5); m.position.set((i ? 1 : -1) * f * 5, -f * 13, 0); m.rotation.z = (i ? -1 : 1) * f * 0.3; });
  S.b2.fire([0, 30, -106], t * 1.2, 46, 30, 1.5); S.b1.fire([-33, 34, -116], t - 0.1, 44, 40, 4, 3); S.b3.fire([20, 24, -112, 0], t - 0.25, 50, 36, 3.4, 7);
  if (t < 0.25) c.flash(1 - t / 0.25); move(c.cam, [26, 12, -34], [0, 26, -116], [34, 15, -22], [0, 22, -116], k, 46); shake(c.cam, c.T, 0.35 * (1 - k * 0.5));
});

// ================= VAULT ANTECHAMBER =================
SET('vault', () => {
  const { s, cam } = mkScene(0xd9dee4, [50, 150], 0xffffff, 1.3, [0xffffff, 0xc4cad2, 1.4], [10, 30, 18]);
  s.userData.bloom = 0.35; ground(s, 140, '#c9cfd6', '#d4d9df');
  box(60, 22, 1, 0xbfc5cc, 0, 11, -26, s); box(1, 22, 70, 0xb4bac2, 26, 11, 0, s); box(60, 1, 70, 0xe9edf0, 0, 22, 0, s);
  box(1, 22, 30, 0xb4bac2, -26, 11, 20, s); box(1, 22, 14, 0xb4bac2, -26, 11, -19, s); box(14, 22, 1, 0x15171c, -33, 11, -12, s); box(1, 22, 16, 0x101216, -40, 11, -4, s); box(16, 1, 18, 0x101216, -33, 22, -4, s); box(16, 0.1, 18, 0x1a1c22, -33, 0.05, -4, s);
  for (let x = -18; x <= 18; x += 12) for (let z = -18; z <= 18; z += 12) box(5, 0.2, 1.2, basic(0xf4f8ff), x, 21.4, z, s);
  for (const sx of [-1, 1]) for (let z = -20; z <= 20; z += 10) box(1.6, 22, 1.6, 0xa9afb7, sx * 20, 11, z, s);
  const door = new THREE.Group(); door.position.set(0, 8, -25.2); s.add(door); const steel = new THREE.MeshPhongMaterial({ color: 0xaab3bd, shininess: 70, flatShading: true });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 1, 28), M(0x4b5158)); ring.rotation.x = Math.PI / 2; door.add(ring); const disc = new THREE.Mesh(new THREE.CylinderGeometry(6.7, 6.7, 1.6, 28), steel); disc.rotation.x = Math.PI / 2; door.add(disc);
  const wheel = new THREE.Group(); wheel.position.z = 1.1; door.add(wheel); for (let i = 0; i < 4; i++) box(9.4, 0.7, 0.5, 0x2d3238, 0, 0, 0, wheel).rotation.z = i * Math.PI / 4; box(1.8, 1.8, 0.8, 0x2d3238, 0, 0, 0.1, wheel);
  for (let i = 0; i < 12; i++) box(0.9, 0.9, 0.6, 0x6b7279, Math.sin(i * Math.PI / 6) * 7.1, Math.cos(i * Math.PI / 6) * 7.1, 0.6, door);
  const P = {}; for (const n of ['fischer', 'eames', 'cobb', 'ariadne', 'mal']) { P[n] = makeChar(n, 'serious'); s.add(P[n].g); }
  const red = new THREE.PointLight(0xff2a3a, 0, 30); red.position.set(-28, 6, -6); s.add(red);
  const mach = new THREE.Group(); s.add(mach); box(3.0, 0.9, 2.2, new THREE.MeshPhongMaterial({ color: 0xb9c0c9, shininess: 90 }), 0, 0.45, 0, mach); box(0.6, 0.25, 0.6, basic(0xffd24a), 0, 1.0, 0, mach); tube(mach, [0, 1, 0], [-2.6, 0.9, 1.2]); tube(mach, [0, 1, 0], [2.6, 0.9, 1.2]);
  return { s, cam, P, wheel, red, mach, pre(T) { for (const k in P) { P[k].reset(); P[k].g.visible = true; P[k].g.rotation.set(0, 0, 0); } P.mal.g.visible = false; red.intensity = 0; wheel.rotation.z = T * 0.4; mach.visible = false; } };
});
const overFischer = (S, T) => { const P = S.P; P.fischer.g.position.set(0, 0.55, -14); P.fischer.g.rotation.set(Math.PI / 2, Math.PI, 0); P.fischer.look('sleep', T); P.fischer.armL.rotation.z = -0.7; P.fischer.armR.rotation.z = 0.5;
  put(P.eames, -3.4, 0, -11, Math.PI / 2); P.eames.legL.rotation.x = P.eames.legR.rotation.x = -1.3; P.eames.body.position.y = -1.3; P.eames.body.rotation.x = 0.35; P.eames.armL.rotation.x = P.eames.armR.rotation.x = -1.0; P.eames.look('sad', T);
  put(P.ariadne, 3.6, 0, -13.2, -1.9); P.ariadne.idle(T); P.ariadne.look('sad', T); P.ariadne.head.rotation.x = 0.3; put(P.cobb, 3.4, 0, -7.6, -1.75); P.cobb.idle(T); P.cobb.look('serious', T); P.cobb.head.rotation.x = 0.25; };
SHOT('e9:0', 'vault', c => {
  const S = c.S, P = S.P, [i, k] = cuts(c.k, [0.48]), z = 12 - c.l * 6.5;
  put(P.fischer, -1.4, 0, z, Math.PI); P.fischer.walk(c.T * 8, 0.6); put(P.eames, 1.6, 0, z + 1.5, Math.PI); P.eames.walk(c.T * 8 + 1, 0.6); put(P.cobb, 9, 0, z + 12, Math.PI); P.cobb.walk(c.T * 8 + 2, 0.6); put(P.ariadne, 6, 0, z + 14, Math.PI); P.ariadne.walk(c.T * 8 + 3, 0.6); for (const n of ['fischer', 'eames', 'cobb', 'ariadne']) P[n].look('serious', c.T);
  if (i === 0) move(c.cam, [6, 7.5, z + 22], [0, 4.2, -25], [4.5, 6.8, z + 18], [0, 4.6, -25], k, 40);
  else { const m = P.mal; m.g.visible = true; put(m, lerp(-34, -19.5, ease(k * 1.2)), 0, -5, Math.PI / 2 - 0.5); if (k < 0.82) m.walk(c.T * 5, 0.4); m.look('menace', c.T); m.armR.rotation.x = -1.5 * ease((k - 0.6) * 3); S.red.intensity = 260; move(c.cam, [-9, 4.9, -0.5], [-21, 4.8, -5], [-10.5, 4.9, -1.5], [-19.5, 4.8, -5], k, 32); }
});
SHOT('e9:1', 'vault', c => {
  const S = c.S, P = S.P, f = ease(c.k * 1.7); if (c.l < 0.18) c.flash(1 - c.l / 0.18); S.red.intensity = 200;
  P.fischer.g.position.set(-1.4 + f * 1.4, f * 0.55, -9 - f * 5); P.fischer.g.rotation.set(f * Math.PI / 2, Math.PI, 0); P.fischer.look(f > 0.4 ? 'sleep' : 'surprised', c.T); P.fischer.armL.rotation.z = -1.6 * Math.sin(f * Math.PI) - 0.7 * f; P.fischer.armR.rotation.z = 1.6 * Math.sin(f * Math.PI) + 0.5 * f;
  put(P.eames, 1.6 + f, 0, -8, Math.PI + 0.9 * f); P.eames.look('surprised', c.T); P.eames.armL.rotation.x = -1.2 * f; P.eames.armR.rotation.x = -1.2 * f;
  put(P.cobb, 8, 0, 4 - c.l * 4, Math.PI + 0.4); P.cobb.walk(c.T * 11, 0.9); P.cobb.look('surprised', c.T); put(P.ariadne, 5.5, 0, 7 - c.l * 4, Math.PI + 0.3); P.ariadne.walk(c.T * 11 + 2, 0.9); P.ariadne.look('surprised', c.T);
  move(c.cam, [-11, 2.4, -3], [0, 2.6, -11], [-9, 1.8, -5], [0, 2.0, -12], c.k, 40); shake(c.cam, c.T, 0.1 * (1 - c.k));
});
SHOT('e10:0', 'vault', c => { overFischer(c.S, c.T); move(c.cam, [1, 17, -2], [0, 0.5, -11.5], [0.4, 14, -4], [0, 0.5, -11.5], c.k, 38, 0.15 - c.k * 0.1); });
SHOT('e10:1', 'vault', c => { const S = c.S; overFischer(S, c.T); const cb = S.P.cobb; cb.head.rotation.x = 0.25 * (1 - ease(c.k * 2.5)); cb.head.rotation.y = -0.7 * ease((c.k - 0.55) * 3); move(c.cam, [-5.2, 5.0, -6.2], [3.4, 4.75, -7.6], [-3.6, 5.0, -6.6], [3.4, 4.75, -7.6], c.k, 28); });
SHOT('e10:2', 'vault', c => {
  const S = c.S, P = S.P; overFischer(S, c.T); S.mach.visible = true; S.mach.position.set(0, 0, 9.5);
  for (const [n, x] of [['cobb', -2.6], ['ariadne', 2.6]]) { const ch = P[n]; ch.reset(); lie(ch, x, 0.55, 13.6); ch.look(c.k > 0.3 ? 'sleep' : 'serious', c.T); ch.armL.rotation.z = -0.25; ch.armR.rotation.z = 0.25; }
  move(c.cam, [0, 20, 15], [0, 0, 10.6], [0, 6, 11.5], [0, 0, 10.4], Math.pow(c.k, 1.6), 40, c.k * 0.5); if (c.k > 0.55) c.flash((c.k - 0.55) / 0.4);
});

// ================= LIMBO SHORE =================
SET('limbo', () => {
  const { s, cam } = mkScene(0xbccdd9, [90, 460], 0xfff0dc, 2.2, [0xffffff, 0x8a94a0, 1.4], [-30, 44, 26], 80);
  s.userData.bloom = 0.3; ground(s, 900, '#d2c29c', '#dbcba6');
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 900), new THREE.MeshPhongMaterial({ color: 0x3a7896, shininess: 80, transparent: true, opacity: 0.94 })); sea.rotation.x = -Math.PI / 2; sea.position.set(-292, 0.14, -150); s.add(sea);
  const foam = [0, 1, 2, 3].map(() => { const f = box(1.4, 0.16, 900, 0xf4fbff, 0, 0.18, -150, s); f.castShadow = false; return f; });
  const r = rng(77), tw = [];
  for (let i = 0; i < 74; i++) { let x = -95 + r() * 200; if (x > 10 && x < 36) x += 30; const z = -30 - r() * 380, h = 30 + r() * 110, w = 12 + r() * 12, b = building(w, h, w, ['#9aa3ad', '#8b949e', '#a5aab0', '#7f8892'][i % 4], 0.04, i, '#dfe8f0'); b.position.set(x, h / 2 - 4, z); if (x < 4 && i % 3 === 0) { b.rotation.z = (r() - 0.5) * 0.3; b.rotation.x = (r() - 0.5) * 0.2; } b.castShadow = i % 4 === 0; s.add(b); tw.push({ x, z, h, w }); }
  const wet = tw.filter(t => t.x < 6);
  const CN = 300, ch = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0x8b949e), CN); ch.frustumCulled = false; s.add(ch); const SPN = 60, spl = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0xf4fbff), SPN); spl.frustumCulled = false; s.add(spl); const dm = new THREE.Object3D();
  // their house
  const H = new THREE.Group(); H.position.set(23, 0, -150); s.add(H); box(16, 9, 12, 0xe9dfc8, 0, 4.5, 0, H); box(16.6, 0.6, 12.6, 0x5a3d26, 0, 9.2, 0, H); for (const sx of [-1, 1]) box(10, 0.7, 13, 0x7a3a2e, sx * 4.2, 11.6, 0, H).rotation.z = -sx * 0.55; box(2.4, 4.6, 0.3, 0x5a3d26, 0, 2.3, 6.1, H); for (const x of [-5, 5]) box(2.6, 2.6, 0.3, basic(0xffe2a8), x, 5.2, 6.1, H); box(7, 0.4, 3, 0xcfc4a8, 0, 0.2, 7.5, H);
  const cobb = makeChar('cobb', 'sleep'), mal = makeChar('mal', 'neutral'), co = makeChar('cobbOld', 'neutral'), mo = makeChar('malOld', 'neutral'); s.add(cobb.g, mal.g, co.g, mo.g);
  const minis = []; for (let i = 0; i < 16; i++) minis.push(box(1.6, 1, 1.6, [0x9aa3ad, 0xa5aab0, 0x8b949e][i % 3], 12 + (i % 4) * 2.6 + hash(i) * 0.6, 0.5, -6 - Math.floor(i / 4) * 2.6, s));
  const sun = s.userData.sun, bg0 = s.background.clone(), gold = new THREE.Color(0xf2c27a);
  return {
    s, cam, cobb, mal, co, mo, minis,
    grade(k) { s.background.copy(bg0).lerp(gold, k); s.fog.color.copy(s.background); sun.color.set(0xfff0dc).lerp(new THREE.Color(0xffb860), k); },
    pre(T) {
      this.grade(0); foam.forEach((f, i) => { const ph = (T * 0.2 + i * 0.25) % 1; f.position.x = 8 - ph * 34; f.scale.x = 0.7 + ph * 1.6; }); [mal, co, mo].forEach(c => c.g.visible = false); cobb.g.visible = true; cobb.reset(); minis.forEach(m => m.visible = false);
      for (let i = 0; i < CN; i++) { const t = wet[i % wet.length], ph = (T * (0.16 + hash(i) * 0.12) + hash(i + 1)) % 1, side = hash(i + 2) < 0.5 ? -1 : 1, top = t.h * (0.35 + hash(i + 3) * 0.6); dm.position.set(t.x + side * (t.w / 2 + ph * 3), Math.max(-2, top - 4 - ph * ph * top * 1.15), t.z + (hash(i + 4) - 0.5) * t.w + t.w * 0.5 * (hash(i + 5) < 0.4 ? 1 : 0)); dm.rotation.set(ph * 5 + i, i, ph * 4); dm.scale.setScalar(1.2 + hash(i + 6) * 3.2); dm.updateMatrix(); ch.setMatrixAt(i, dm.matrix); if (i < SPN) { const k = clamp((ph - 0.9) / 0.1); dm.position.set(dm.position.x, 0.3 + k * 3, dm.position.z); dm.rotation.set(0, 0, 0); dm.scale.set(2 + k * 7, 0.4 + Math.sin(k * Math.PI) * 5, 2 + k * 7); dm.updateMatrix(); spl.setMatrixAt(i, dm.matrix); } }
      ch.instanceMatrix.needsUpdate = true; spl.instanceMatrix.needsUpdate = true;
    }
  };
});
SHOT('f1:0', 'limbo', c => { const S = c.S, cb = S.cobb; cb.g.rotation.set(-Math.PI / 2, Math.PI, 0.3); cb.g.position.set(5 + Math.sin(c.T * 1.3) * 0.3, 0.55, 8); cb.armL.rotation.z = -2.3; cb.armR.rotation.z = 1.7; cb.look('sleep', c.T); move(c.cam, [14, 1.6, 15], [4, 0.8, 5], [11, 2.6, 13], [3, 3, -10], c.k, 36); });
SHOT('f1:1', 'limbo', c => { c.S.cobb.g.visible = false; move(c.cam, [26, 6, 34], [-20, 30, -150], [20, 30, 20], [-30, 34, -170], c.k, 46); shake(c.cam, c.T, 0.04); });
SHOT('f1:2', 'limbo', c => { const cb = c.S.cobb; put(cb, 8, 0, 2, Math.PI + 0.5); cb.idle(c.T); cb.look('sad', c.T); cb.head.rotation.x = -0.3 * ease(c.k * 2); cb.head.rotation.y = 0.5 - ease(c.k) * 0.9; move(c.cam, [3.6, 4.2, -5.2], [8, 4.8, 2], [4.4, 4.4, -4.2], [8, 4.8, 2], c.k, 30); });
SHOT('f1:3', 'limbo', c => { const cb = c.S.cobb, z = -70 - c.l * 6; put(cb, 23, 0, z, Math.PI); cb.walk(c.T * 6, 0.5); cb.look('sad', c.T); move(c.cam, [26, 5, z + 16], [23, 9, -150], [24.5, 7, z + 12], [23, 8, -150], c.k, 40); });
SHOT('f2:0', 'limbo', c => {
  const S = c.S, g = ease(c.k * 1.3); S.grade(0.85); S.mal.g.visible = true; S.minis.forEach((m, i) => { m.visible = true; const h = 1 + g * g * (6 + hash(i + 3) * 26) * clamp(c.k * 3 - i * 0.05); m.scale.y = h; m.position.y = h / 2; });
  [[S.cobb, 9.2, 1.1, 'smirk'], [S.mal, 23.4, -1.1, 'joy']].forEach(([ch, x, ry, e], i) => { ch.reset(); put(ch, x, 0, -9, ry); ch.legL.rotation.x = ch.legR.rotation.x = -1.3 * (1 - g); ch.body.position.y = -1.3 * (1 - g); ch.armL.rotation.x = -1.2 + Math.sin(c.T * 7 + i) * 0.3; ch.armR.rotation.x = -1.2 - Math.sin(c.T * 7 + i) * 0.3; ch.head.rotation.x = -0.5 * g; ch.look(e, c.T); });
  move(c.cam, [16.5, 2.6, 9], [16.5, 2.4, -9], [16.5, 5, 24], [16.5, 13, -9], c.k, 40);
});
SHOT('f2:1', 'limbo', c => { const S = c.S, z = -40 - c.l * 2.6; S.grade(0.85); S.cobb.g.visible = false; S.co.g.visible = S.mo.g.visible = true; [[S.co, 21.6, 1], [S.mo, 24.4, -1]].forEach(([ch, x, sgn], i) => { ch.reset(); put(ch, x, 0, z, Math.PI); ch.walk(c.T * 3.2 + i * 0.4, 0.3); ch.body.rotation.x = 0.12; (sgn > 0 ? ch.armL : ch.armR).rotation.set(0, 0, -sgn * 0.42); ch.look('neutral', c.T); ch.head.rotation.y = -sgn * 0.35; }); move(c.cam, [19, 3.4, z - 15], [23, 4.2, z], [20.5, 3.8, z - 12], [23, 4.3, z], c.k, 32); });

// ================= THE SAFE (her childhood home) =================
SET('safe', () => {
  const { s, cam } = mkScene(0x0d0b09, [30, 90], 0xbfd0ff, 0.5, [0xb8bcd0, 0x2a2018, 0.95], [-10, 20, 8]);
  s.userData.bloom = 0.4; const fill = new THREE.PointLight(0xffd0a0, 70, 40); fill.position.set(7, 7, 8); s.add(fill);
  const wood = tex(64, 64, c => { c.fillStyle = '#5a3d26'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#4a311d'; c.fillRect(0, 0, 64, 3); c.fillRect(30, 0, 3, 64); }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(12, 12);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshLambertMaterial({ map: wood })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  const wp = tex(64, 64, c => { c.fillStyle = '#3f5346'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#4c6354'; c.fillRect(14, 0, 6, 64); c.fillRect(44, 0, 6, 64); }); wp.wrapS = wp.wrapT = THREE.RepeatWrapping; wp.repeat.set(10, 3);
  const wm = new THREE.MeshLambertMaterial({ map: wp }); for (const [x, z, ry] of [[0, -12, 0], [-16, 0, Math.PI / 2], [16, 0, -Math.PI / 2], [0, 14, Math.PI]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(34, 14), wm); w.position.set(x, 7, z); w.rotation.y = ry; s.add(w); }
  box(6, 7, 0.3, basic(0x8fa8d8), -8, 7, -11.8, s).material.color.multiplyScalar(0.5); box(6.6, 0.5, 0.5, 0x2a1a10, -8, 10.7, -11.6, s); box(0.4, 7, 0.5, 0x2a1a10, -8, 7, -11.6, s); const moon = new THREE.SpotLight(0x9fb8ff, 260, 50, 0.5, 0.6); moon.position.set(-8, 9, -11); moon.target.position.set(2, 0, 2); moon.castShadow = true; s.add(moon, moon.target);
  // doll's house shell around the safe
  box(7, 0.3, 4.6, 0xb98a58, 0, 0.15, -3, s); box(0.3, 5, 4.6, 0xc9a070, -3.5, 2.5, -3, s); box(0.3, 5, 4.6, 0xc9a070, 3.5, 2.5, -3, s); for (const sx of [-1, 1]) box(4.6, 0.3, 4.8, 0x8a3a2e, sx * 1.8, 6.1, -3, s).rotation.z = -sx * 0.6;
  const sf = new THREE.Group(); sf.position.set(0, 0.3, -3); s.add(sf); const st = M(0x4b5158);
  box(2.8, 0.2, 2.6, st, 0, 0.1, 0, sf); box(2.8, 0.2, 2.6, st, 0, 2.7, 0, sf); box(0.2, 2.8, 2.6, st, -1.3, 1.4, 0, sf); box(0.2, 2.8, 2.6, st, 1.3, 1.4, 0, sf); box(2.8, 2.8, 0.2, st, 0, 1.4, -1.2, sf);
  const door = new THREE.Group(); door.position.set(-1.3, 1.4, 1.3); sf.add(door); box(2.6, 2.6, 0.22, 0x8a9199, 1.3, 0, 0, door); const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 12), M(0x23272c)); dial.rotation.x = Math.PI / 2; dial.position.set(1.3, 0, 0.2); door.add(dial);
  const top = makeTop(0.62); top.position.set(0, 0.52, -3.1); s.add(top); const glow = new THREE.PointLight(0xffd9a0, 0, 16); glow.position.set(0, 1.6, -2.6); s.add(glow);
  const cobb = makeChar('cobb', 'serious'), mal = makeChar('mal', 'sad'); s.add(cobb.g, mal.g);
  const kneel = (ch, x, z, ry) => { ch.reset(); put(ch, x, 0, z, ry); ch.legL.rotation.x = ch.legR.rotation.x = -1.35; ch.body.position.y = -1.35; };
  return { s, cam, door, top, glow, cobb, mal, kneel, lay(k) { top.userData.tilt.rotation.set(0, 0, 0); top.rotation.set(0, 0, 1.4 * (1 - k)); top.position.set(0.25 * (1 - k), 0.52 + 0.28 * (1 - k), -3.1); }, pre(T) { cobb.g.visible = mal.g.visible = false; door.rotation.y = 0; glow.intensity = 0; this.lay(0); top.userData.spin.rotation.y = 0; } };
});
SHOT('f2:2', 'safe', c => { const S = c.S, m = S.mal, cl = ease((c.k - 0.45) * 2.6); m.g.visible = true; S.kneel(m, -1.6, 1.2, Math.PI - 0.35); m.armR.rotation.x = -1.35 + cl * 0.5; m.head.rotation.x = 0.3; m.head.rotation.y = -0.9; m.look('sad', c.T); S.door.rotation.y = -2.0 * (1 - cl); S.glow.intensity = 5 * (1 - cl); move(c.cam, [6.5, 4.4, 7], [-0.6, 2.2, -1.4], [5, 3.8, 6], [-0.5, 2.1, -1.4], c.k, 34); });
SHOT('f3:0', 'safe', c => { const S = c.S, cb = S.cobb, k = ease(c.k * 1.25); cb.g.visible = true; cb.reset(); put(cb, lerp(11, 1.0, k), 0, lerp(9, 2.2, k), Math.PI + 0.6 - k * 0.5); if (k < 1) cb.walk(c.T * 6, 0.5); cb.look('serious', c.T); move(c.cam, [-8, 2.6, 2], [4, 3.8, 6], [-7, 3, 1.6], [1.5, 3.6, 3], c.k, 36); });
SHOT('f3:1', 'safe', c => {
  const S = c.S, cb = S.cobb, [i, k] = cuts(c.k, [0.42]), op = i ? 1 : ease(k * 1.6), up = i ? ease(k * 2.2) : 0; cb.g.visible = true; S.kneel(cb, -1.6, 1.2, Math.PI - 0.35); cb.head.rotation.y = -0.6; cb.armR.rotation.x = -1.4 * ease(c.k * 3); cb.look('serious', c.T);
  S.door.rotation.y = -2.0 * op; S.lay(up); S.top.userData.spin.rotation.y = up * up * c.l * 30; S.glow.intensity = 4 * op + 10 * up;
  if (i === 0) move(c.cam, [6.5, 4.4, 7], [-0.6, 2.2, -1.4], [5, 3.8, 6], [-0.5, 2.0, -1.6], k, 34); else move(c.cam, [1.3, 1.9, 1.6], [0, 1.15, -3.1], [0.7, 1.6, 0.3], [0, 1.15, -3.1], k, 30);
});
SHOT('f4', 'safe', c => { const S = c.S, cb = S.cobb; cb.g.visible = true; S.kneel(cb, 0.3, 2.6, Math.PI); cb.head.rotation.x = 0.2; cb.look('serious', c.T, c.talk); S.door.rotation.y = -2.0; S.lay(1); S.top.userData.set(c.T, 0.02, 30); S.glow.intensity = 16; move(c.cam, [0.5, 1.5, -3.95], [0.3, 3.1, 2.6], [0.4, 1.6, -3.9], [0.3, 3.2, 2.6], c.k, 46); });
SHOT('f5:0', 'safe', c => { const S = c.S; S.door.rotation.y = -2.0; S.lay(1); S.top.userData.set(c.T, 0.02, 34); S.glow.intensity = 14 + c.k * 40; move(c.cam, [0.7, 1.6, 0.3], [0, 1.15, -3.1], [0.3, 1.4, -0.9], [0, 1.15, -3.1], c.k, 30); if (c.k > 0.45) c.flash((c.k - 0.45) / 0.5); });

// ================= REAL WORLD: apartment =================
SET('apartment', () => {
  const { s, cam } = mkScene(0x1c1a1e, [40, 120], 0xfff0d8, 1.2, [0xfff4e0, 0x6a5a4a, 1.2], [8, 22, 14]);
  s.userData.bloom = 0.4;
  const wood = tex(64, 64, c => { c.fillStyle = '#b98a58'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#a97a4a'; c.fillRect(0, 0, 64, 3); c.fillRect(30, 0, 3, 64); }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(10, 10);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshLambertMaterial({ map: wood })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  box(13, 0.12, 9, 0x8a2b32, 0, 0.06, 2, s); box(44, 14, 0.6, 0xe6dcc8, 0, 7, 16, s); for (const sx of [-1, 1]) { box(0.6, 14, 34, 0xe6dcc8, sx * 20, 7, 0, s); box(13, 14, 0.6, 0xe6dcc8, sx * 13.5, 7, -10, s); } box(14, 2, 0.6, 0xe6dcc8, 0, 1, -10, s); box(14, 2, 0.6, 0xe6dcc8, 0, 13, -10, s);
  box(0.4, 10, 0.5, 0x2a1a10, 0, 7, -10, s); box(14, 0.4, 0.5, 0x2a1a10, 0, 7, -10, s);
  for (let i = 0; i < 26; i++) { const h = 14 + hash(i) * 40, b = building(10, h, 10, '#1c2233', 0.45, i); b.position.set(-70 + i * 5.6 + hash(i + 1) * 3, h / 2 - 22, -50 - hash(i + 2) * 40); b.castShadow = false; s.add(b); }
  box(6, 0.35, 3.4, 0x6a4a2e, 9, 2.9, 2, s); for (const [x, z] of [[-2.7, -1.4], [2.7, -1.4], [-2.7, 1.4], [2.7, 1.4]]) box(0.3, 2.75, 0.3, 0x4a311d, 9 + x, 1.38, 2 + z, s); box(2.2, 0.4, 2.2, 0x4a311d, 9, 1.5, 5.2, s); box(2.2, 3.6, 0.4, 0x4a311d, 9, 3.2, 6.3, s);
  box(7, 1.6, 3, 0x5d6f8f, -11, 0.8, 8, s); box(7, 3.6, 0.8, 0x5d6f8f, -11, 2.6, 9.4, s);
  const lamp = new THREE.PointLight(0xffd9a8, 120, 40); lamp.position.set(0, 10, 4); s.add(lamp); const moon = new THREE.PointLight(0x8fb0ff, 0, 40); moon.position.set(0, 7, -15); s.add(moon);
  const mach = new THREE.Group(); mach.position.set(0, 0, 2); s.add(mach); box(2.6, 0.8, 1.9, new THREE.MeshPhongMaterial({ color: 0xb9c0c9, shininess: 90 }), 0, 0.4, 0, mach); box(0.5, 0.2, 0.5, basic(0xffd24a), 0, 0.9, 0, mach); tube(mach, [0, 0.9, 0], [-3, 0.9, 0]); tube(mach, [0, 0.9, 0], [3, 0.9, 0]);
  const tops = []; for (let i = 0; i < 13; i++) { const t = makeTop(i ? 0.22 + hash(i) * 0.25 : 0.42); t.position.set(i ? 9 + Math.cos(i * 2.4) * (1 + i * 0.22) * 0.9 : 9, 3.08, i ? 2 + Math.sin(i * 2.4) * (0.4 + i * 0.09) : 2); s.add(t); tops.push(t); }
  const cobb = makeChar('cobb', 'neutral'), mal = makeChar('mal', 'neutral'); s.add(cobb.g, mal.g);
  const hemi = s.children.find(o => o.isHemisphereLight), sun = s.userData.sun;
  return { s, cam, cobb, mal, tops, mach, night(n) { hemi.intensity = n ? 0.3 : 1.2; sun.intensity = n ? 0.1 : 1.2; lamp.intensity = n ? 14 : 120; moon.intensity = n ? 110 : 0; s.background.set(n ? 0x070a14 : 0x1c1a1e); s.fog.color.copy(s.background); }, pre(T) { this.night(0); cobb.reset(); mal.reset(); tops.forEach((t, i) => { t.visible = false; t.userData.set(T + i, 0.03); }); mach.visible = false; } };
});
SHOT('f5:1', 'apartment', c => { const S = c.S, e = ease((c.k - 0.15) * 1.8); S.mach.visible = true; [[S.cobb, -4.2, 1], [S.mal, 4.2, -1]].forEach(([ch, x, sgn]) => { ch.g.position.set(x, 0.55 * (1 - e) + 0, 2 + 2.6 * (1 - e)); ch.g.rotation.set(-Math.PI / 2 * (1 - e), 0, 0); ch.legL.rotation.x = ch.legR.rotation.x = -1.5 * e; ch.g.position.y = 0.55 * (1 - e) - 0.0; ch.look(e > 0.3 ? 'surprised' : 'sleep', c.T); ch.head.rotation.y = sgn * 0.8 * e; }); if (c.l < 0.3) c.flash(1 - c.l / 0.3); move(c.cam, [0, 13, 14], [0, 1.5, 1.5], [0, 9, 13], [0, 2.4, 1], c.k, 36); });
SHOT('f5:2', 'apartment', c => { const S = c.S, m = S.mal; S.cobb.g.visible = false; put(m, 9, 0, 5.0, Math.PI); m.sit(); m.armL.rotation.x = m.armR.rotation.x = -1.0; m.head.rotation.x = 0.28; m.look('sad', c.T); S.tops.forEach((t, i) => { const k = clamp((c.l - i * 0.12) / 0.25); t.visible = k > 0; t.scale.setScalar((i ? 0.22 + hash(i) * 0.25 : 0.42) * (i ? ease(k) : 1) * (1 + c.k * 0.3 * (i > 0))); }); move(c.cam, [11, 5.6, -4.2], [9, 3.6, 3.4], [9.8, 5.6, -2.8], [9, 4.0, 4.4], c.k, 34); });
SHOT('f5:3', 'apartment', c => { const S = c.S, m = S.mal, cb = S.cobb; S.night(1); put(m, -3.4, 0, -7.2, Math.PI); m.idle(c.T); m.look('sad', c.T); m.head.rotation.y = 0.5 * ease((c.k - 0.6) * 3); m.head.rotation.x = 0.12; put(cb, 0.4, 0, lerp(4, -3.4, ease(c.k * 1.3)), Math.PI + 0.3); if (c.k < 0.75) cb.walk(c.T * 5, 0.4); cb.armL.rotation.x = -1.2 * ease((c.k - 0.5) * 3); cb.look('sad', c.T); move(c.cam, [-1.2, 5.2, -18], [-2.6, 4.7, -7.2], [-2.0, 5.0, -15.5], [-2.8, 4.7, -7.2], c.k, 32); });

// ================= THE LEDGE (handled without showing the fall) =================
SET('ledge', () => {
  const { s, cam } = mkScene(0x070a16, [50, 220], 0x8fb0ff, 0.5, [0x5f78b8, 0x0a0c14, 0.8], [6, 30, 20]);
  s.userData.bloom = 0.32;
  const face = (x, dir) => { const g = new THREE.Group(); g.position.x = x; s.add(g); box(4, 160, 120, 0x3a342e, -dir * 2, 0, 0, g); for (let y = -60; y <= 70; y += 10) for (let z = -50; z <= 50; z += 10) { const lit = hash(y * 3.1 + z * 1.7 + x) > 0.62 || (y === 40 && z === 0); box(0.3, 6, 4.4, basic(lit ? 0xffd9a0 : 0x15171c), dir * 0.05, y + 2.4, z, g).material.color.multiplyScalar(lit ? 0.5 : 1); box(1.6, 0.5, 5.6, 0x6a6258, dir * 0.6, y - 0.9, z, g); } return g; };
  face(-9, 1); face(9, -1);
  for (let i = 0; i < 40; i++) box(1.2, 0.3, 0.6, basic(i % 3 ? 0xffe2a0 : 0xff5a4a), -7 + hash(i) * 14, -78, -50 + i * 2.6, s);
  const cur = [0, 1].map(i => { const g = new THREE.Group(); g.position.set(-8.4, 45.6, i ? 2.7 : -2.7); s.add(g); box(0.14, 5.6, 1.5, new THREE.MeshLambertMaterial({ color: 0xd9d2c4, emissive: 0x2a241c }), 0, -2.8, 0, g); return g; });
  const wl = new THREE.PointLight(0xffd9a0, 34, 26); wl.position.set(-5.5, 43, 3); s.add(wl); const wl2 = new THREE.PointLight(0xffd9a0, 34, 26); wl2.position.set(5.5, 43, 3); s.add(wl2);
  const mal = makeChar('mal', 'sad'), cobb = makeChar('cobb', 'sad'); s.add(mal.g, cobb.g);
  const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, fog: false })); const sp = new Float32Array(300 * 3); for (let i = 0; i < 300; i++) sp.set([(hash(i) - 0.5) * 30, 60 + hash(i + 1) * 80, -60 - hash(i + 2) * 140], i * 3); stars.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3)); s.add(stars);
  return { s, cam, mal, cobb, cur, pre(T) { cur.forEach((g, i) => { g.rotation.z = 0.35 + Math.sin(T * 2.2 + i * 1.4) * 0.3; g.rotation.x = Math.sin(T * 1.7 + i) * 0.12; }); mal.reset(); cobb.reset(); mal.g.visible = cobb.g.visible = true; } };
});
SHOT('f5:4', 'ledge', c => {
  const S = c.S, [i, k] = cuts(c.k, [0.56]);
  if (i === 0) { const m = S.mal, cb = S.cobb; put(m, -7.6, 37.7, 0, Math.PI / 2); m.sit(); m.look('sad', c.T); m.head.rotation.x = 0.15; m.armL.rotation.x = m.armR.rotation.x = -0.3; m.legL.rotation.x = -Math.PI / 2 + 1.2 + Math.sin(c.T * 1.5) * 0.1; m.legR.rotation.x = -Math.PI / 2 + 1.2 - Math.sin(c.T * 1.5) * 0.1;
    put(cb, 9.6, 38.6, 0, -Math.PI / 2); cb.body.rotation.x = 0.35; cb.armR.rotation.x = -1.5; cb.armL.rotation.x = -1.3 * ease(k * 2); cb.look('sad', c.T, fakeTalk(c.T)); move(c.cam, [0.6, 40.6, 21], [0, 41.6, 0], [-0.4, 41.2, 16.5], [0, 41.8, 0], k, 40, 0.04); }
  else { S.mal.g.visible = S.cobb.g.visible = false; move(c.cam, [5.5, 43.5, 4], [-9, 42.4, 0], [2.5, 43, 2], [-9, 42.4, 0], k, 34); }
});

// ================= THE CINEMA ("the movie you know") =================
SET('cinema', () => {
  const { s, cam } = mkScene(0x050506, [60, 400], 0xffffff, 0.0, [0x8090b0, 0x050506, 0.16], [0, 30, 20]);
  s.userData.bloom = 0.45; s.userData.sun.castShadow = false;
  for (let r = 0; r < 7; r++) for (let i = -9; i <= 9; i++) { const y = r * 1.5, z = 10 + r * 5.5; box(3, 1.4, 3, 0x4a1418, i * 3.6, y + 0.7, z, s); box(3, 3.4, 0.7, 0x5a181d, i * 3.6, y + 2.6, z + 1.6, s); if (hash(r * 31 + i) > 0.62) { box(1.36, 1.3, 1.3, 0x0c0c10, i * 3.6, y + 4.6, z + 0.4, s); box(2.6, 2.2, 1, 0x0c0c10, i * 3.6, y + 2.8, z + 0.4, s); } }
  box(120, 3, 60, 0x0a0a0c, 0, -1.6, 20, s);
  // wall with the screen opening (44 x 18.5, centre y = 13)
  box(120, 60, 1, 0x08080a, -82, 13, -20, s); box(120, 60, 1, 0x08080a, 82, 13, -20, s); box(44, 30, 1, 0x08080a, 0, 37.25, -20, s); box(44, 30, 1, 0x08080a, 0, -11.25, -20, s);
  for (const [w, h, x, y] of [[45, 0.5, 0, 22.5], [45, 0.5, 0, 3.5], [0.5, 19.5, -22.2, 13], [0.5, 19.5, 22.2, 13]]) box(w, h, 0.4, basic(0x8a8f9c), x, y, -19.4, s);
  // stage behind the screen
  const ST = new THREE.Group(); ST.position.set(0, 3.75, -42); s.add(ST); const sl = new THREE.PointLight(0xfff4e0, 900, 140); sl.position.set(0, 22, 26); ST.add(sl); const sl2 = new THREE.PointLight(0xffffff, 140, 60); sl2.position.set(0, 10, 16); const al = new THREE.PointLight(0xffd9b0, 500, 110); al.position.set(0, 16, -14); s.add(al); ST.add(sl2);
  const back = (col, grp) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), basic(col)); m.position.set(0, 12, -16); grp.add(m); const f = new THREE.Mesh(new THREE.PlaneGeometry(90, 50), M(col)); f.rotation.x = -Math.PI / 2; f.position.z = -14; grp.add(f); return f; };
  const A = new THREE.Group(), B = new THREE.Group(), C = new THREE.Group(); ST.add(A, B, C); for (const g of [A, B, C]) { g.scale.setScalar(1.75); g.position.z = -6; }
  back(0xf3a25a, A).material = M(0xd9c095); const sun = new THREE.Mesh(new THREE.CircleGeometry(6, 24), basic(0xfff0c0)); sun.position.set(-8, 10, -15.5); A.add(sun); box(90, 0.2, 14, 0x3f7396, 0, 0.1, -10, A);
  const a1 = put(makeChar('cobb', 'sad'), -3.2, 0, 2, 1.0), a2 = put(makeChar('mal', 'sad'), 3.2, 0, 2, -1.0); A.add(a1.g, a2.g); const PN = 200, pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0x2b1b14), PN); pm.frustumCulled = false; A.add(pm); const dm = new THREE.Object3D();
  back(0x3a2412, B).material = M(0x2a1a10); for (let i = 0; i < 40; i++) box(0.7, 0.9, 0.7, basic(0xffc76a), (hash(i) - 0.5) * 60, 11 + hash(i + 1) * 5, -12 + hash(i + 2) * 12, B); box(18, 0.4, 5, new THREE.MeshPhongMaterial({ color: 0xb8892f, shininess: 120 }), 0, 2.9, 2, B);
  const b1 = put(makeChar('saitoOld', 'sad'), -7.5, 0, 2, Math.PI / 2), b2 = put(makeChar('cobb', 'serious'), 7.5, 0, 2, -Math.PI / 2); B.add(b1.g, b2.g); const bt = makeTop(0.6); bt.position.set(0, 3.1, 2.4); B.add(bt);
  back(0xdfe5ec, C).material = M(0xcfd6de); const arr = label('ARRIVALS', { h: 2.4, bg: '#14161c', color: '#ffd24a' }); arr.position.set(-12, 15, -14); C.add(arr); for (let x = -30; x <= 30; x += 12) box(1.4, 20, 1.4, 0xaab3bd, x, 10, -12, C); box(10, 3, 3, 0x35507a, 12, 1.5, -4, C);
  const c1 = makeChar('cobb', 'neutral'); C.add(c1.g); const cv = ['civA', 'civB', 'civC', 'civD', 'arthur', 'ariadne'].map(n => { const ch = makeChar(n); C.add(ch.g); return ch; });
  return {
    s, cam, A, B, C, ST,
    show(i, T) {
      A.visible = i === 0; B.visible = i === 1; C.visible = i === 2;
      if (i === 0) { const dk = clamp((T % 100) / 100); a1.reset(); a2.reset(); a1.idle(T); a1.look('sad', T); a2.look('sad', T); }
      if (i === 1) { b1.reset(); b1.sit(); b1.look('sad', T); b1.body.rotation.x = 0.15; b2.reset(); b2.sit(); b2.look('serious', T, fakeTalk(T)); b2.armR.rotation.x = -1.1; bt.userData.set(T, 0.04); }
      if (i === 2) { c1.reset(); put(c1, -6 + ((T * 1.2) % 4), 0, 4, Math.PI / 2 - 0.3); c1.walk(T * 6, 0.5); c1.look('neutral', T); cv.forEach((ch, j) => { ch.reset(); const dir = j % 2 ? 1 : -1; put(ch, dir * (((T * (2 + j * 0.4) + j * 9) % 44) - 22), 0, -6 + j * 1.6, dir * Math.PI / 2); ch.walk(T * 6 + j, 0.5); ch.look('neutral', T + j); }); }
    },
    dissolve(dk) { a2.g.visible = dk < 0.1; pm.visible = dk > 0.05; for (let i = 0; i < PN; i++) { const y = hash(i) * 5.3, k = clamp((dk - hash(i + 1) * 0.45) / 0.55), e = k * k; dm.position.set(3.2 + (hash(i + 2) - 0.5) * 1.8 + e * (2 + hash(i + 3) * 5), y + e * (3 + hash(i + 4) * 6), 2 + (hash(i + 5) - 0.5)); dm.rotation.set(e * 5, e * 4, i); dm.scale.setScalar(0.4 * (1 - k * k * k) + 0.001); dm.updateMatrix(); pm.setMatrixAt(i, dm.matrix); } pm.instanceMatrix.needsUpdate = true; },
    pre() { this.ST.position.x = 0; a2.g.visible = true; pm.visible = false; }
  };
});
const tagDom = (t, o = 1) => `<div style="position:absolute;left:120px;top:130px;font-size:30px;letter-spacing:8px;font-weight:700;color:#c9ced8;opacity:${o}"><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#e23b3b;margin-right:14px"></span>${t}</div>`;
SHOT('f6:0', 'cinema', c => { c.S.show(0, c.T); move(c.cam, [0, 15, 52], [0, 12.6, -20], [0, 13.5, 40], [0, 12.8, -20], c.k, 36); c.dom(tagDom('NOW SHOWING: THE ORIGINAL ENDING', clamp(c.l / 0.4))); });
SHOT('f6:1', 'cinema', c => {
  const S = c.S, [i, k] = cuts(c.k, [0.39, 0.55]); S.show(i, c.T); if (i === 0) S.dissolve(clamp(k * 1.15));
  move(c.cam, [[-3, 13.4, 34], [3, 13.2, 30], [0, 13, 28]][i], [0, 12.8, -20], [[-1.5, 13.2, 30], [1.5, 13, 27], [0, 13, 23]][i], [0, 12.8, -20], k, 36);
  c.dom(tagDom(['NOW SHOWING: THE ORIGINAL ENDING', 'COBB SAVES SAITO', 'COBB GOES HOME'][i])); if (k < 0.06 && i) c.flash(0.5 * (1 - k / 0.06));
});
SHOT('f7', 'cinema', c => {
  const S = c.S, l = c.l, T0 = LINE.f7.slot[0]; S.show(2, T0); const slam = clamp((l - 0.75) / 0.14), jit = l < 0.75 ? (hash(Math.floor(l * 24)) - 0.5) * 0.5 * clamp(l * 3) : 0; S.ST.position.x = jit * 3;
  move(c.cam, [0, 13, 23], [0, 12.8, -20], [0, 13.4, 31], [0, 12.8, -20], c.k, 36); if (slam > 0 && slam < 1) shake(c.cam, c.T, 0.5); if (l < 0.75 && hash(Math.floor(l * 24) + 3) > 0.7) c.flash(0.35); if (l > 0.75 && l < 0.95) c.flash(0.8 * (1 - (l - 0.75) / 0.2));
  const sc = 3 - 2 * ease(slam), bars = [0, 1, 2].map(i => `<div style="position:absolute;left:-10%;width:120%;top:${300 + i * 190 + jit * 60 * (i - 1)}px;height:${l < 0.75 ? 10 : 0}px;background:rgba(255,255,255,.35)"></div>`).join('');
  c.dom(tagDom('⏸ PAUSED', 1) + bars + (l > 0.75 ? `<div style="position:absolute;left:50%;top:470px;transform:translate(-50%,-50%) rotate(-7deg) scale(${sc});border:16px solid #e23b3b;border-radius:22px;padding:6px 60px 14px;font-size:210px;letter-spacing:14px;color:#e23b3b;background:rgba(10,4,4,.55);white-space:nowrap">REWRITE</div>` : ''));
});
