// Chapters f (Rose and Jack Dawson), g (Four Days), h (The Heart of the Ocean) and the outro (o).
// Every set here is prefixed a4_ (set names are global across act files).
import { THREE, SET, SHOT, LINE, CAST, mkScene, move, shot, shake, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, makeChar, ground, building, makeDoor } from './engine.js';

const basic = (c, o) => new THREE.MeshBasicMaterial({ color: c, ...o });
const D = (x, y, w, h, st, inner = '') => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;${h ? `height:${h}px;` : ''}${st}">${inner}</div>`;
const STR = '-webkit-text-stroke:14px rgba(0,0,0,.75);paint-order:stroke fill';
const STR2 = '-webkit-text-stroke:9px rgba(0,0,0,.8);paint-order:stroke fill';

// ---------- helpers ----------
function castOf(s, names) { const o = {}; for (const n of names) { o[n] = makeChar(n); s.add(o[n].g); } return o; }
function hideCast(o) { for (const c of Object.values(o)) { c.reset(); c.g.visible = false; c.g.rotation.set(0, 0, 0); c.g.scale.setScalar(CAST[c.name].scale || 1); } }
const show = (ch, x, y, z, ry = 0) => { ch.g.visible = true; return put(ch, x, y, z, ry); };
const seatAt = (ch, x, y, z, ry = 0) => { show(ch, x, y - 1.51, z, ry); ch.sit(); return ch; };   // y = the surface they sit on
function skyDome(s, stops, r = 780) {
  const t = tex(8, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); stops.forEach(([o, col]) => g.addColorStop(o, col)); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })); s.add(m); return m;
}
// the Heart of the Ocean: a blue heart on a short chain, with its own glow
function makeGem(sc = 1, li = 5) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.55); sh.bezierCurveTo(-0.2, -0.35, -0.6, -0.05, -0.55, 0.22); sh.bezierCurveTo(-0.5, 0.5, -0.12, 0.56, 0, 0.3); sh.bezierCurveTo(0.12, 0.56, 0.5, 0.5, 0.55, 0.22); sh.bezierCurveTo(0.6, -0.05, 0.2, -0.35, 0, -0.55);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.07, bevelSegments: 1, curveSegments: 5 }); geo.center();
  const g = new THREE.Group(), m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0x3f7fff, emissive: 0x1c46d0, emissiveIntensity: 0.85, shininess: 160, specular: 0xffffff, flatShading: true })); g.add(m);
  for (let i = 0; i < 7; i++) box(0.06, 0.09, 0.06, 0xdfe4ee, Math.sin(i * 0.5) * 0.05, 0.42 + i * 0.12, 0, g).castShadow = false;
  const l = new THREE.PointLight(0x5a9aff, li, 7); g.add(l); g.userData.light = l; g.scale.setScalar(sc); return g;
}
function rainFx(s, n = 1000, op = 0.45, col = 0xa8c0e8) {
  const p = new Float32Array(n * 6), r = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op })); r.geometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); r.frustumCulled = false; s.add(r);
  return (T, cx, cy, cz, R = 34, H = 30) => { for (let i = 0; i < n; i++) { const x = cx + (hash(i) - 0.5) * R * 2, z = cz + (hash(i + 0.5) - 0.5) * R * 2, y = cy - H / 2 + H - ((T * 34 + hash(i + 0.25) * H) % H); p.set([x, y, z, x + 0.12, y - 1.1, z], i * 6); } r.geometry.attributes.position.needsUpdate = true; };
}
function snowFx(s, n = 600, size = 0.16, col = 0xffffff) {
  const p = new Float32Array(n * 3), pts = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: col, size, transparent: true, opacity: 0.9 })); pts.geometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); pts.frustumCulled = false; s.add(pts);
  return { pts, set(T, cx, cy, cz, Rx = 20, H = 16, Rz = 20, sp = 2.0) { for (let i = 0; i < n; i++) p.set([cx + (hash(i) - 0.5) * 2 * Rx + Math.sin(T * 0.7 + i) * 0.5, cy + H - ((T * sp * (0.6 + hash(i + 0.2)) + hash(i + 0.4) * H) % H), cz + (hash(i + 0.7) - 0.5) * 2 * Rz], i * 3); pts.geometry.attributes.position.needsUpdate = true; } };
}

// =====================================================================================
// RESCUE SHIP AT DAWN (f1, f2)
// =====================================================================================
const JX = 3.6, JZ = -30.85, RZ = -33.1, BZ = (JZ + RZ) / 2;
SET('a4_rescue', () => {
  const FOG = 0xf0c8b4;
  const { s, cam } = mkScene(FOG, [150, 760], 0xffd8bc, 2.2, [0xffece4, 0x5a6a88, 1.35], [-170, 60, -240], 50);
  s.userData.bloom = 0.42; cam.far = 2000;
  skyDome(s, [[0, '#5a78b4'], [0.3, '#b9a0c8'], [0.44, '#f2b8a8'], [0.49, '#ffd8ac'], [0.5, '#f0c8b4'], [1, '#f0c8b4']]);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(30, 32), basic(0xfff0c8, { fog: false })); sun.position.set(-380, 34, -560); sun.lookAt(0, 0, 0); s.add(sun);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshPhongMaterial({ color: 0x5a789e, shininess: 90, specular: 0xffc8a8 })); sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true; s.add(sea);
  const WN = 300, waves = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.05, 1), basic(0xffffff, { transparent: true, opacity: 0.2 }), WN); waves.frustumCulled = false; s.add(waves);
  const ice = new THREE.MeshPhongMaterial({ color: 0xf2f6ff, shininess: 60, flatShading: true }), r = rng(41);
  for (let i = 0; i < 8; i++) { const a = -2.6 + i * 0.5 + r() * 0.2, d = 240 + r() * 300, g = new THREE.Group(); g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); s.add(g); for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(new THREE.ConeGeometry(6 + r() * 10, 12 + r() * 28, 5), ice); m.position.set((r() - 0.5) * 18, 5 + r() * 6, (r() - 0.5) * 14); m.rotation.y = r() * 6; g.add(m); } }
  // the rescue steamer: bow toward +z, main deck at y = 8, open aft deck z -56..-8 where the survivors are
  const SH = new THREE.Group(); s.add(SH);
  const HULL = M(0x1d1e24), WHT = M(0xf0ece2), DK = M(0xb89a72);
  const dk = (w, h, d, x, y, z, side = HULL) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [side, side, DK, side, side, side]); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; SH.add(m); return m; };
  dk(18, 12, 112, 0, 2, 0); box(18.3, 3, 112, 0x8a2e24, 0, -3, 0, SH);
  [16, 13, 9.5, 6, 2.6].forEach((w, i) => dk(w, 12 + i * 0.4, 3, 0, 2 + i * 0.2, 57.5 + i * 3));
  [16.5, 14.5, 11.5, 7.5].forEach((w, i) => dk(w, 12, 2.5, 0, 2, -57.25 - i * 2.5));
  dk(17, 2.5, 24, 0, 9.25, 43);
  dk(13, 5, 26, 0, 10.5, 10, WHT); dk(10, 3.5, 18, 0, 14.75, 11, WHT); dk(15, 2.4, 4.5, 0, 17.7, 21, WHT); box(14.2, 0.8, 0.1, 0x2a3440, 0, 17.9, 23.3, SH);
  const fun = new THREE.Group(); fun.position.set(0, 16.5, 6); fun.rotation.x = -0.08; SH.add(fun);
  const fc = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 15, 14), M(0xd25a2a)); fc.position.y = 7.5; const ft = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 3, 14), M(0x15151a)); ft.position.y = 16.5; fc.castShadow = ft.castShadow = true; fun.add(fc, ft);
  for (const z of [46, -40]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 28, 6), M(0x8a6a3a)); m.position.set(0, 22, z); SH.add(m); }
  dk(6, 1.6, 6, 0, 8.8, -32, M(0x6a5238)); box(6.3, 0.22, 6.3, 0x7d7f74, 0, 9.66, -32, SH);
  const rail = (x1, z1, x2, z2, y) => { const L = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1); for (const h of [1.2, 2.4]) { const b = box(0.14, 0.14, L, 0xf0ece2, (x1 + x2) / 2, y + h, (z1 + z2) / 2, SH); b.rotation.y = a; b.castShadow = false; } for (let i = 0; i <= L; i += 2.4) box(0.14, 2.4, 0.14, 0xf0ece2, lerp(x1, x2, i / L), y + 1.2, lerp(z1, z2, i / L), SH).castShadow = false; };
  rail(-8.7, -56, -8.7, -4, 8); rail(8.7, -56, 8.7, -4, 8); rail(-8.7, -56, 8.7, -56, 8);
  { const P = []; for (const sx of [-1, 1]) for (let z = -50; z <= 52; z += 4) P.push([sx * 9.05, 4.4, z]); const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.7, 0.7), basic(0xffe2a8), P.length), dm = new THREE.Object3D(); P.forEach((p, i) => { dm.position.set(...p); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }); SH.add(im); }
  for (const z of [-14, -7]) { box(0.4, 6.4, 0.4, 0xf0ece2, 8.9, 11.2, z, SH); box(2.6, 0.4, 0.4, 0xf0ece2, 10.0, 14.2, z, SH); }
  const mkBoat = () => { const b = new THREE.Group(); s.add(b); box(3.4, 1.5, 9, 0xf2efe6, 0, 0.55, 0, b); box(2.8, 0.2, 8.2, 0xc9b48a, 0, 1.1, 0, b); box(2.0, 1.1, 1.4, 0xf2efe6, 0, 0.7, 4.9, b); box(2.0, 1.1, 1.4, 0xf2efe6, 0, 0.7, -4.9, b); for (let i = 0; i < 6; i++) { const x = i % 2 ? 0.7 : -0.7, z = -3 + Math.floor(i / 2) * 2.4; box(0.9, 1.1, 0.8, [0x3a3a44, 0x7a6a5a, 0x5a6a7a][i % 3], x, 1.8, z, b); box(0.7, 0.7, 0.7, 0xe6c09a, x, 2.7, z, b); } const oars = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 1.6, 1.4, 0); b.add(p); box(5, 0.16, 0.16, 0xc9b48a, sx * 2.4, 0, 0, p); return p; }); return { b, oars }; };
  const boats = [mkBoat(), mkBoat(), mkBoat()], hoist = mkBoat(); const ropes = [-14, -7].map(() => box(0.08, 1, 0.08, 0xd8d0c0, 0, 0, 0, s));
  const SMN = 40, smoke = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x8a8a92, transparent: true, opacity: 0.6 }), SMN); smoke.frustumCulled = false; s.add(smoke);
  const C = castOf(s, ['jack', 'roseCoat', 'cal', 'civA', 'civB', 'civC', 'civD', 'steerA', 'steerB', 'steerC', 'ladyB', 'gentA', 'gentB', 'ladyA', 'brock', 'steward']);
  const CROWD = [
    ['civA', 'sit', -3.6, -30.6, -Math.PI / 2], ['ladyB', 'sit', -3.6, -33.0, -Math.PI / 2], ['steerA', 'stand', -7.2, -18, -Math.PI / 2 + 0.25], ['steerB', 'stand', -7.2, -21.5, -Math.PI / 2 - 0.1],
    ['gentA', 'sit', -7.4, -44, Math.PI / 2], ['civC', 'sit', -1.3, -27.6, 0.15], ['gentB', 'sit', 1.4, -27.6, -0.1], ['civB', 'stand', 7.3, -45, Math.PI / 2 + 0.2],
    ['steerC', 'sit', 7.4, -51, -Math.PI / 2], ['ladyA', 'stand', 7.5, -8, Math.PI / 2 - 0.2], ['brock', 'stand', -1.8, -49, 0.5], ['civD', 'sit', -7.4, -48.5, Math.PI / 2],
  ];
  const BLC = [0x7a7f86, 0x8a7a6a, 0x6a7280, 0x8a8478]; CROWD.forEach(([n], i) => box(2.3, 2.4, 1.3, BLC[i % 4], 0, 3.0, 0, C[n].body));
  box(1.4, 0.12, 1.0, 0xb8b8b0, 0, -2.05, 0.4, C.steward.armR); for (let i = 0; i < 4; i++) box(0.22, 0.3, 0.22, 0xf2f2ee, -0.4 + i * 0.27, -1.85, 0.4, C.steward.armR);
  // Jack and Rose's single grey blanket, plus the "hood" that comes up over both their heads
  const blM = new THREE.MeshLambertMaterial({ color: 0x80868e }); const bl = new THREE.Group(); s.add(bl);
  box(1.6, 2.2, 5.0, blM, JX + 0.15, 9.5, BZ, bl); box(2.4, 0.5, 5.0, blM, JX + 1.35, 9.05, BZ, bl);
  const hood = new THREE.Group(); s.add(hood);
  box(1.9, 0.45, 5.2, blM, JX, 12.05, BZ, hood); box(0.4, 1.7, 5.2, blM, JX - 0.75, 11.2, BZ, hood); box(0.35, 1.55, 2.4, blM, JX + 0.78, 11.2, RZ, hood); box(0.35, 0.78, 2.4, blM, JX + 0.78, 10.84, JZ, hood); box(1.9, 1.75, 0.35, blM, JX, 11.2, RZ - 1.3, hood); box(1.9, 1.75, 0.35, blM, JX, 11.2, JZ + 1.3, hood);
  const dm = new THREE.Object3D();
  return {
    s, cam, C, hood,
    pre(T) {
      hideCast(C); hood.visible = false; hood.position.y = 0;
      CROWD.forEach(([n, pose, x, z, ry], i) => { const ch = C[n]; if (pose === 'sit') { seatAt(ch, x, 8, z, ry); ch.armL.rotation.x = ch.armR.rotation.x = -0.9; } else { show(ch, x, 8, z, ry); ch.idle(T + i); } ch.look(i % 3 ? 'sad' : 'neutral', T); });
      seatAt(C.jack, JX, 8, JZ, Math.PI / 2); seatAt(C.roseCoat, JX, 8, RZ, Math.PI / 2); C.jack.armL.rotation.x = C.jack.armR.rotation.x = -0.8; C.roseCoat.armL.rotation.x = C.roseCoat.armR.rotation.x = -0.8; C.jack.look('neutral', T); C.roseCoat.look('neutral', T);
      const sw = C.steward, sz = -40 + Math.sin(T * 0.4) * 4; show(sw, -4.4, 8, sz, Math.cos(T * 0.4) > 0 ? Math.PI : 0); sw.walk(T * 5, 0.35); sw.armR.rotation.set(-1.4, 0, 0); sw.look('neutral', T);
      const tt = T - 231; [[36 - tt * 1.2, -2], [54 - tt, 24], [74 - tt * 1.4, -36]].forEach(([x, z], i) => { const b = boats[i]; b.b.position.set(x, 0.3 + Math.sin(T * 1.3 + i) * 0.12, z); b.b.rotation.set(0, -Math.PI / 2, Math.sin(T * 1.1 + i) * 0.03); b.oars.forEach((o, j) => o.rotation.y = Math.sin(T * 2.4 + i) * 0.4 * (j ? 1 : -1)); });
      const hy = lerp(0.4, 9, clamp(tt / 16)); hoist.b.position.set(10.9, hy, -10.5); hoist.b.rotation.set(0, 0, Math.sin(T * 1.5) * 0.03);
      ropes.forEach((rp, i) => { const z = i ? -7 : -14, h = 14 - (hy + 1.2); rp.scale.y = Math.max(0.1, h); rp.position.set(10.9, hy + 1.2 + h / 2, z); });
      for (let i = 0; i < WN; i++) { dm.position.set((hash(i) - 0.5) * 700, 0.06, (hash(i + 0.5) - 0.5) * 700 + ((T * 2 + hash(i + 0.2) * 40) % 40)); dm.rotation.set(0, 0, 0); dm.scale.set(6 + hash(i + 0.7) * 22, 1, 0.6 + hash(i + 0.9)); dm.updateMatrix(); waves.setMatrixAt(i, dm.matrix); } waves.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < SMN; i++) { const k = (T * 0.08 + hash(i)) % 1; dm.position.set((hash(i + 0.2) - 0.5) * 3 * (1 + k * 3), 34 + k * 26, 6 - k * 70); dm.rotation.set(T + i, i, 0); dm.scale.setScalar(2 + k * 9); dm.updateMatrix(); smoke.setMatrixAt(i, dm.matrix); } smoke.instanceMatrix.needsUpdate = true;
    },
  };
});
const RES = (key, fn) => SHOT(key, 'a4_rescue', c => fn(c, c.S, c.S.C));
RES('f1:0', (c, S) => move(c.cam, [100, 16, 150], [0, 12, -8], [84, 21, 122], [0, 12, -12], c.k, 40));
RES('f1:1', (c, S) => move(c.cam, [19, 27, -6], [0, 8, -34], [15.5, 18, -15], [0, 9, -36], c.k, 42));
RES('f1:2', (c, S, C) => { C.jack.look('neutral', c.T); C.roseCoat.look('neutral', c.T); C.jack.head.rotation.set(0.12, 0.45, 0); C.roseCoat.head.rotation.z = 0.2; move(c.cam, [14, 12.8, -24.4], [3.9, 10.7, -32], [10.4, 11.8, -28.4], [3.9, 10.9, -32], c.k, 32); });
RES('f2:0', (c, S, C) => { const z = lerp(-12, -22.5, c.k), cal = C.cal; show(cal, 6.9, 8, z, Math.PI); cal.walk(c.T * 5.5, 0.45); cal.head.rotation.y = Math.sin(c.T * 1.7) * 0.7; cal.look('serious', c.T); move(c.cam, [10.6, 12.4, z - 8.6], [6.9, 12.4, z], [10.6, 12.4, z - 8.6], [6.9, 12.4, z], c.k, 32); });
RES('f2:1', (c, S, C) => {
  const [i, k] = cuts(c.k, [0.5]), cal = C.cal, hk = i ? 1 : ease(k * 1.6); S.hood.visible = true; S.hood.position.y = (hk - 1) * 2.4;
  const z = i ? lerp(-36, -42, k) : lerp(-22.5, -29, k); show(cal, 6.9, 8, z, Math.PI); cal.walk(c.T * 5.5, 0.45); cal.head.rotation.y = i ? 0.4 : Math.sin(c.T * 1.7) * 0.7; cal.look('serious', c.T);
  C.jack.head.rotation.set(0, i ? 0.3 : 0, 0); C.jack.look('neutral', c.T); C.roseCoat.look('sleep', c.T);
  if (i === 0) move(c.cam, [13.5, 11.8, -38.5], [4.8, 11, -30], [12.8, 11.6, -37.4], [4.8, 11, -30], k, 34);
  else move(c.cam, [9.8, 11.3, -34.8], [4.2, 11.3, -30.9], [9.5, 11.3, -34.4], [4.2, 11.3, -30.9], k, 30);
});

// =====================================================================================
// NEW YORK HARBOUR IN THE RAIN (f3-f6) — ship deck at y = 8 facing +z; the statue slides past; street at x = 600
// =====================================================================================
SET('a4_harbor', () => {
  const { s, cam } = mkScene(0x0e1626, [90, 900], 0xa8bce8, 0.75, [0x8aa0d0, 0x0c1018, 0.8], [30, 80, 60], 30);
  s.userData.bloom = 0.32; cam.far = 1600;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshPhongMaterial({ color: 0x0f1e30, shininess: 110, specular: 0x5a76a0 })); sea.rotation.x = -Math.PI / 2; s.add(sea);
  const WHT = M(0xf0ece2);
  box(44, 1, 16, 0x6a5a48, 0, 7.5, -3, s); box(44, 8.5, 16, 0x1a1c22, 0, 2.8, -3, s);
  const wt = tex(256, 64, c => { c.fillStyle = '#e8e2d4'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#ffd98a'; for (let x = 10; x < 250; x += 26) c.fillRect(x, 18, 14, 22); }); wt.wrapS = THREE.RepeatWrapping; wt.repeat.set(4, 1);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(44, 6, 0.6), [WHT, WHT, WHT, WHT, new THREE.MeshLambertMaterial({ map: wt, emissive: 0x332211 }), WHT]); wall.position.set(0, 11, -6.5); s.add(wall);
  for (let x = -21; x <= 21; x += 2) box(0.14, 2.6, 0.14, 0xf0ece2, x, 9.3, 3.6, s).castShadow = false; for (const y of [9.4, 10.6]) box(42, 0.16, 0.16, 0xf0ece2, 0, y, 3.6, s);
  for (const x of [-8, 8]) { box(0.3, 6, 0.3, 0x2a2a2a, x, 11, -4.5, s); box(0.9, 1.1, 0.9, basic(0xc8a070), x, 14.4, -4.5, s); const p = new THREE.PointLight(0xffd9a0, 60, 28); p.position.set(x, 14, -4); s.add(p); }
  const fill = new THREE.PointLight(0xffe2c0, 30, 26); fill.position.set(0, 14, 9); s.add(fill);
  // the statue, its island, the skyline (all in W, which glides past)
  const W = new THREE.Group(); s.add(W);
  const ST = new THREE.Group(); ST.position.set(40, 0, 230); ST.rotation.y = Math.PI; W.add(ST);
  const stone = M(0x8f897c), cu = new THREE.MeshLambertMaterial({ color: 0x6aa892 });
  box(90, 3, 90, 0x34362e, 0, 0.5, 0, ST); box(42, 6, 42, 0x7a756a, 0, 4, 0, ST); box(42, 6, 42, 0x7a756a, 0, 4, 0, ST).rotation.y = Math.PI / 4;
  box(18, 6, 18, stone, 0, 10, 0, ST); box(14, 18, 14, stone, 0, 22, 0, ST); box(16, 2, 16, stone, 0, 32, 0, ST); box(11, 4, 11, stone, 0, 35, 0, ST);
  box(8.4, 16, 6.8, cu, 0, 45, 0, ST); box(7.2, 8, 5.6, cu, 0, 57, 0, ST); box(3.6, 4.2, 3.6, cu, 0, 63.1, 0.3, ST);
  for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; box(0.6, 3.6, 0.4, cu, Math.sin(a) * 2.7, 65.4 + Math.cos(a) * 1.3, 1.2, ST).rotation.z = -a; }
  box(2.2, 13, 2.2, cu, 4.2, 67, 0, ST).rotation.z = -0.1; box(1.4, 3, 1.4, cu, 4.9, 74.6, 0, ST); box(3, 1.4, 3, 0xc9a24a, 4.9, 76.6, 0, ST); box(2, 2.6, 2, basic(0xffc860), 4.9, 78.6, 0, ST);
  const tl = new THREE.PointLight(0xffb040, 900, 120); tl.position.set(4.9, 80, 0); ST.add(tl);
  box(2, 8, 2, cu, -4.4, 55, 0.8, ST); box(1.2, 6, 4, cu, -5.2, 52, 1.8, ST);
  const fl1 = new THREE.PointLight(0xdfe8ff, 2600, 160); fl1.position.set(0, 14, 34); ST.add(fl1);
  for (let i = 0; i < 40; i++) { const h = 22 + hash(i * 3.1) * 70, b = building(14 + hash(i) * 14, h, 14, ['#1c2232', '#232a3c', '#2a2f3e'][i % 3], 0.45, i + 70, '#ffd98a'); b.position.set(-420 + i * 21 + hash(i + 9) * 8, h / 2, 560 + hash(i + 4) * 80); b.castShadow = false; W.add(b); }
  const rain = rainFx(s, 1100, 0.42);
  // clipboard insert at x = 300
  const PCV = document.createElement('canvas'); PCV.width = 384; PCV.height = 512; const ptex = new THREE.CanvasTexture(PCV); ptex.colorSpace = THREE.SRGBColorSpace; let lastP = -1;
  const drawPaper = p => { if (Math.abs(p - lastP) < 0.004) return; lastP = p; const c = PCV.getContext('2d');
    c.fillStyle = '#efe7d2'; c.fillRect(0, 0, 384, 512); c.strokeStyle = 'rgba(80,110,160,.35)'; c.lineWidth = 2; for (let y = 120; y < 512; y += 52) { c.beginPath(); c.moveTo(20, y); c.lineTo(364, y); c.stroke(); }
    c.fillStyle = '#3a3a44'; c.font = '700 22px Inter'; c.fillText('PORT OF NEW YORK', 24, 40); c.font = '700 14px Inter'; c.fillText('ARRIVALS  ·  APRIL 18, 1912', 24, 66);
    c.font = 'italic 34px Georgia, serif'; c.fillStyle = 'rgba(30,30,60,.5)'; c.fillText('Harper, M.', 30, 110); c.fillText("O'Neill, P.", 30, 162);
    c.fillStyle = '#1c1c3a'; c.font = 'italic 700 40px Georgia, serif'; c.fillText('DAWSON, Rose', 30, 214);
    c.save(); c.beginPath(); c.rect(0, 225, 30 + 310 * p, 60); c.clip(); c.fillText('DAWSON, Jack', 30, 266); c.restore();
    c.fillStyle = 'rgba(110,120,140,.22)'; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(hash(i) * 384, hash(i + 3) * 512, 3 + hash(i + 5) * 6, 0, 7); c.fill(); }
    ptex.needsUpdate = true; };
  drawPaper(0);
  const PZ = new THREE.Group(); PZ.position.set(300, 0, 0); s.add(PZ); box(3.4, 0.2, 4.6, 0x7a5232, 0, 0.1, 0, PZ);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 4.0), new THREE.MeshLambertMaterial({ map: ptex })); paper.rotation.x = -Math.PI / 2; paper.position.y = 0.22; PZ.add(paper); box(1.4, 0.3, 0.5, 0x9aa2ac, 0, 0.3, -2.05, PZ);
  const pl = new THREE.PointLight(0xffe2b8, 40, 14); pl.position.set(0.5, 5, 2); PZ.add(pl);
  // the New York street at x = 600 (couple walks toward -z)
  const SG = new THREE.Group(); SG.position.set(600, 0, 0); s.add(SG);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(26, 260), new THREE.MeshPhongMaterial({ color: 0x1c1f26, shininess: 120, specular: 0x8a96b8 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.03, -100); SG.add(road);
  for (const sx of [-1, 1]) { box(6, 0.4, 260, 0x3a3c42, sx * 11, 0.2, -100, SG); for (let i = 0; i < 13; i++) { const h = 22 + hash(i * 7 + sx) * 20, b = building(16, h, 15, ['#3a2e2a', '#2e2c30', '#40342c'][i % 3], 0.5, i * 3 + (sx > 0 ? 9 : 2), '#ffd28a'); b.position.set(sx * 22, h / 2, 6 - i * 16); SG.add(b); } for (let i = 0; i < 13; i++) { const z = 8 - i * 16; box(0.3, 7, 0.3, 0x1a1a1e, sx * 8.6, 3.5, z, SG); box(0.9, 1.2, 0.9, basic(0xffd59a), sx * 8.6, 7.4, z, SG); if (i < 4) { const p = new THREE.PointLight(0xffc888, 70, 24); p.position.set(sx * 8.2, 7, z); SG.add(p); } } }
  box(26, 0.6, 16, 0x6a5238, 0, 0.3, 18, SG);
  const C = castOf(s, ['jack', 'roseCoat', 'officer']);
  const umb = new THREE.Group(); C.officer.g.add(umb); const can = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.2, 10), M(0x121216)); can.position.set(0, 8.0, 0.2); umb.add(can); box(0.12, 4.6, 0.12, 0x2a2a2a, -1.0, 5.7, 0.6, umb);
  const clip = new THREE.Group(); clip.position.set(0, -2.1, 0.5); C.officer.armR.add(clip); box(1.1, 0.08, 1.5, 0x7a5232, 0, 0, 0, clip); box(0.95, 0.09, 1.3, 0xefe7d2, 0, 0.02, 0.05, clip);
  const gem = makeGem(0.62, 5); gem.position.set(0, -2.25, 0.4); C.roseCoat.armR.add(gem);
  return {
    s, cam, C, gem, W,
    statueX() { return 40 + W.position.x; },
    paper: drawPaper,
    pose() { const o = C.officer; o.armL.rotation.set(-0.9, 0, 0.3); o.armR.rotation.set(-1.0, 0, -0.2); },
    trio(T, off) { show(C.roseCoat, -1.2, 8, 0.6, 0); show(C.jack, 1.3, 8, 0.6, 0); C.roseCoat.look('neutral', T); C.jack.look('neutral', T); C.roseCoat.idle(T); C.jack.idle(T + 1); if (off) { show(C.officer, -4.6, 8, 0.6, Math.PI / 2); C.officer.look('neutral', T); this.pose(); } },
    pre(T) { hideCast(C); gem.visible = false; W.position.x = -(T - 246) * 2.2; },
    post(T) { rain(T, cam.position.x, cam.position.y - 6, cam.position.z, 30, 30); },
  };
});
const HAR = (key, fn) => SHOT(key, 'a4_harbor', c => { fn(c, c.S, c.S.C); c.S.post(c.T); });
HAR('f3:0', (c, S, C) => { S.trio(c.T, false); C.roseCoat.head.rotation.x = -0.32; C.jack.head.rotation.x = -0.28; const sx = S.statueX(); move(c.cam, [-3.5, 13.6, -8.5], [sx - 6, 46, 230], [-2.2, 12.8, -6], [sx - 6, 42, 230], c.k, 32); });
HAR('f3:1', (c, S, C) => {
  const [i, k] = cuts(c.k, [0.42]), sx = S.statueX();
  if (i === 0) { S.trio(c.T, false); move(c.cam, [sx - 36, 44, 176], [sx - 4.9, 68, 230], [sx - 30, 48, 184], [sx - 4.9, 70, 230], k, 34); return; }
  S.trio(c.T, true); const o = C.officer, kw = ease(k / 0.6); o.g.position.x = lerp(-7.8, -4.6, kw); if (k < 0.6) o.walk(c.T * 6, 0.4); S.pose(); C.roseCoat.head.rotation.y = -0.6 * ease((k - 0.45) / 0.4);
  move(c.cam, [-11, 12.8, 10], [-2.6, 12.0, 0.6], [-10, 12.6, 9.2], [-2.6, 12.0, 0.6], k, 34);
});
HAR('f4', (c, S, C) => { S.trio(c.T, true); const r2 = C.roseCoat; r2.head.rotation.set(0, -0.6, 0); r2.look('smirk', c.T, c.talk); move(c.cam, [-5.6, 13.0, 5.8], [-1.55, 12.75, 0.95], [-5.2, 12.95, 5.3], [-1.55, 12.75, 0.95], c.k, 30); });
HAR('f5', (c, S, C) => {
  const [i, k] = cuts(c.k, [0.5]);
  if (i === 0) { S.trio(c.T, true); C.jack.head.rotation.set(0, -0.7, 0); C.jack.look('joy', c.T); C.roseCoat.head.rotation.y = 0.35; C.roseCoat.look('smirk', c.T); move(c.cam, [-8.2, 13.2, 5.2], [1.2, 12.5, 0.6], [-7.6, 13.0, 4.8], [1.2, 12.5, 0.6], k, 32); return; }
  S.paper(ease(k * 1.5)); move(c.cam, [300.6, 4.6, 2.6], [300, 0.2, 0.1], [300.4, 4.0, 2.0], [300, 0.2, 0.2], k, 40);
});
HAR('f6:0', (c, S, C) => {
  const [i, k] = cuts(c.k, [0.45]), r2 = C.roseCoat, j = C.jack; S.trio(c.T, false); S.gem.visible = true;
  const up = i ? 1 : ease((k - 0.35) / 0.65); r2.armR.rotation.set(lerp(0.25, -0.95, up), 0, 0); if (i === 0 && k < 0.35) S.gem.visible = false;
  r2.head.rotation.x = 0.35 * up; j.head.rotation.set(0.3 * up, -0.35 * up, 0); r2.look(up > 0.5 ? 'surprised' : 'neutral', c.T); j.look(up > 0.5 ? 'surprised' : 'neutral', c.T); S.gem.rotation.y = c.T * 0.8;
  if (i === 0) move(c.cam, [2.0, 12.8, 10], [0, 11.6, 0.6], [1.5, 12.6, 9.2], [0, 11.6, 0.6], k, 34);
  else move(c.cam, [0.8, 13.0, 10.6], [0.2, 11.9, 1.4], [0.7, 12.9, 9.8], [0.2, 11.95, 1.4], k, 32);
});
HAR('f6:1', (c, S, C) => {
  const st = LINE.f6.sents[1], dur = st.end - st.start, z = lerp(8, -8, c.k), r2 = C.roseCoat, j = C.jack;
  show(r2, 599.1, 0.4, z, Math.PI); show(j, 600.9, 0.4, z, Math.PI); r2.walk(c.T * 5, 0.45); j.walk(c.T * 5 + 0.4, 0.45); r2.armL.rotation.set(-0.15, 0, -0.25); j.armR.rotation.set(-0.15, 0, 0.25); r2.look('joy', c.T); j.look('joy', c.T);
  move(c.cam, [606, 17, 30], [600, 3, -30], [604, 14, 24], [600, 3.5, -34], c.k, 40);
  const words = [['FREE', '#ffffff', 0.15], ['BROKE', '#ffd24a', 0.45], ['ALIVE', '#ff8fa8', 0.82]];
  c.dom(D(0, 150, 1920, 0, 'text-align:center', words.map(([w, col, f]) => { const k = (c.T - st.start) - f * dur; return `<span style="display:inline-block;margin:0 34px;font-size:128px;color:${col};opacity:${clamp(k / 0.08)};transform:scale(${1.6 - 0.6 * ease(k / 0.22)});${STR}">${w}.</span>`; }).join('')));
});

// =====================================================================================
// g1: the door, alone, on black water (shared 'sea' set)
// =====================================================================================
SHOT('g1', 'sea', c => { const S = c.S; S.mode('night'); S.ship.visible = false; S.lights = 0; S.door.visible = true; S.door.position.set(0, 0.24 + Math.sin(c.T * 1.2) * 0.08, 0); S.door.rotation.set(Math.sin(c.T * 0.9) * 0.03, 0.4, Math.sin(c.T * 1.1) * 0.03); S.debris = 0.12; move(c.cam, [17, 5, 15], [0, 0.3, 0], [10, 2.8, 9], [0, 0.3, 0], c.k, 34); S.post(c.T); });

// =====================================================================================
// MEMORY GALLERY (g2, g3): three framed memories in the dark; they frost over, crack, and fall away
// =====================================================================================
const PAINT = [
  (c, w, h) => { // the bow at sunset
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3d4a8c'); g.addColorStop(0.45, '#e88a6a'); g.addColorStop(0.6, '#ffd08c'); g.addColorStop(0.61, '#6a5a7a'); g.addColorStop(1, '#2c2c4c'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff2c0'; c.beginPath(); c.arc(w * 0.24, h * 0.61, 30, Math.PI, 0); c.fill();
    c.strokeStyle = 'rgba(255,220,160,.6)'; c.lineWidth = 3; for (let i = 0; i < 9; i++) { const y = h * 0.66 + i * 9; c.beginPath(); c.moveTo(w * 0.1 + i * 7, y); c.lineTo(w * 0.38 - i * 5, y); c.stroke(); }
    c.fillStyle = '#121218'; c.beginPath(); c.moveTo(w * 0.42, h * 0.68); c.lineTo(w, h * 0.5); c.lineTo(w, h); c.lineTo(w * 0.6, h); c.closePath(); c.fill();
    c.strokeStyle = '#d8d0c0'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.44, h * 0.645); c.lineTo(w, h * 0.465); c.stroke();
    const fx = w * 0.52, fy = h * 0.66; c.fillStyle = '#1a1018'; c.fillRect(fx - 4, fy - 30, 9, 26); c.beginPath(); c.arc(fx, fy - 36, 6, 0, 7); c.fill(); c.fillRect(fx - 36, fy - 27, 72, 4); c.fillRect(fx + 9, fy - 33, 9, 28); c.beginPath(); c.arc(fx + 13, fy - 39, 6, 0, 7); c.fill();
    c.fillStyle = '#c0402a'; c.beginPath(); c.arc(fx - 1, fy - 38, 6, Math.PI * 0.9, Math.PI * 1.9); c.fill();
  },
  (c, w, h) => { // the party below decks
    c.fillStyle = '#4a2c1a'; c.fillRect(0, 0, w, h); c.fillStyle = '#6e4a2a'; c.fillRect(0, h * 0.7, w, h * 0.3);
    for (let i = 0; i < 5; i++) { const x = 40 + i * 76, g = c.createRadialGradient(x, 30, 2, x, 30, 44); g.addColorStop(0, 'rgba(255,220,140,.95)'); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(x - 44, 0, 88, 88); }
    const fig = (x, y, s, col, head, arms) => { c.fillStyle = col; c.fillRect(x - 6 * s, y - 34 * s, 12 * s, 26 * s); c.fillRect(x - 5 * s, y - 8 * s, 4 * s, 10 * s); c.fillRect(x + 1 * s, y - 8 * s, 4 * s, 10 * s); c.fillStyle = head; c.beginPath(); c.arc(x, y - 40 * s, 7 * s, 0, 7); c.fill(); if (arms !== undefined) { c.fillStyle = col; c.save(); c.translate(x, y - 30 * s); c.rotate(arms); c.fillRect(0, -2 * s, 20 * s, 4 * s); c.restore(); } };
    const r = rng(9); for (let i = 0; i < 16; i++) fig(20 + r() * (w - 40), h * 0.74 + r() * 40, 0.8 + r() * 0.4, ['#2a1a14', '#3a2a20', '#1e1612'][i % 3], '#2a1a14', r() * 3 - 1.5);
    fig(w * 0.46, h * 0.9, 1.6, '#e6dcc8', '#c8442a', -0.6); fig(w * 0.56, h * 0.9, 1.6, '#4a3a2a', '#e6c06a', -2.5);
    c.strokeStyle = 'rgba(255,230,180,.5)'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(w * 0.51, h * 0.7, 40 + i * 10, Math.PI * 1.1, Math.PI * 1.6); c.stroke(); }
    fig(w * 0.12, h * 0.84, 1.2, '#2a1a14', '#2a1a14', -0.9); c.fillStyle = '#8a4a20'; c.fillRect(w * 0.12 + 6, h * 0.84 - 46, 16, 7);
  },
  (c, w, h) => { // the drawing
    c.fillStyle = '#efe6d0'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(40,34,30,.85)'; c.lineCap = 'round'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(40, 190); c.quadraticCurveTo(60, 120, 120, 130); c.lineTo(330, 140); c.quadraticCurveTo(360, 150, 350, 200); c.stroke(); c.beginPath(); c.moveTo(40, 190); c.lineTo(350, 205); c.stroke();
    c.lineWidth = 2.5; c.beginPath(); c.arc(105, 120, 18, 0, 7); c.stroke(); c.beginPath(); c.moveTo(120, 132); c.quadraticCurveTo(170, 120, 210, 140); c.quadraticCurveTo(260, 160, 320, 150); c.stroke(); c.beginPath(); c.moveTo(118, 150); c.quadraticCurveTo(180, 170, 230, 165); c.quadraticCurveTo(280, 175, 325, 165); c.stroke();
    c.beginPath(); c.moveTo(150, 136); c.quadraticCurveTo(140, 110, 112, 104); c.stroke();
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(88 + i * 3, 104 + i); c.lineTo(80 + i * 3, 128 + i * 2); c.stroke(); }
    c.fillStyle = '#3a6ae0'; c.beginPath(); c.moveTo(132, 142); c.lineTo(139, 136); c.lineTo(146, 142); c.lineTo(139, 152); c.fill();
    c.font = 'italic 18px Georgia, serif'; c.fillStyle = 'rgba(40,34,30,.85)'; c.fillText('J.D.  14 - 4 - 1912', w - 170, h - 22);
    c.strokeStyle = 'rgba(40,34,30,.25)'; c.lineWidth = 1.5; for (let i = 0; i < 40; i++) { const x = 60 + hash(i) * 280, y = 150 + hash(i + 3) * 50; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 14, y + 6); c.stroke(); }
  },
];
SET('a4_memory', () => {
  const { s, cam } = mkScene(0x05060b, [30, 140], 0xc8d8ff, 0.4, [0x8899bb, 0x0a0a10, 0.5], [0, 30, 20]);
  s.userData.bloom = 0.5; s.userData.sun.castShadow = false;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshPhongMaterial({ color: 0x0a0b10, shininess: 120, specular: 0x2a3348 })); fl.rotation.x = -Math.PI / 2; s.add(fl);
  const fr = new THREE.PointLight(0xdfe8ff, 60, 40); fr.position.set(0, 9, 9); s.add(fr);
  const frostT = tex(256, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, 180); g.addColorStop(0, 'rgba(210,235,255,.3)'); g.addColorStop(1, 'rgba(235,248,255,.92)'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.4; const r = rng(3); for (let i = 0; i < 70; i++) { let x = r() * w, y = r() * h, a = r() * 6.28; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 6; j++) { x += Math.cos(a) * 9; y += Math.sin(a) * 9; c.lineTo(x, y); if (r() < 0.4) { c.moveTo(x, y); c.lineTo(x + Math.cos(a + 0.8) * 6, y + Math.sin(a + 0.8) * 6); c.moveTo(x, y); } a += (r() - 0.5) * 0.6; } c.stroke(); } });
  const crackT = tex(384, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2.5; const r = rng(77); for (let i = 0; i < 12; i++) { let x = w * 0.5, y = h * 0.48, a = i / 12 * 6.283 + r() * 0.3; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 9; j++) { x += Math.cos(a) * 22; y += Math.sin(a) * 22; c.lineTo(x, y); a += (r() - 0.5) * 0.7; } c.stroke(); } });
  const NX = 6, NY = 4, TW = 7.2 / NX, TH = 4.8 / NY;
  const tileGeo = (i, j) => { const g = new THREE.PlaneGeometry(TW, TH), uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, (i + uv.getX(k)) / NX, (j + uv.getY(k)) / NY); return g; };
  const frames = PAINT.map((draw, f) => {
    const fg = new THREE.Group(); fg.position.set((f - 1) * 8.6, 6.2, f === 1 ? 0 : 1.4); fg.rotation.y = (1 - f) * 0.22; s.add(fg);
    const gold = new THREE.MeshPhongMaterial({ color: 0xc9a24a, shininess: 90, specular: 0xffe8a8 });
    box(7.9, 0.36, 0.3, gold, 0, 2.58, 0, fg); box(7.9, 0.36, 0.3, gold, 0, -2.58, 0, fg); box(0.36, 5.5, 0.3, gold, -3.78, 0, 0, fg); box(0.36, 5.5, 0.3, gold, 3.78, 0, 0, fg);
    box(0.04, 6, 0.04, 0x8a8a8a, -2.6, 5.7, 0, fg).castShadow = false; box(0.04, 6, 0.04, 0x8a8a8a, 2.6, 5.7, 0, fg).castShadow = false;
    const pm = new THREE.MeshBasicMaterial({ map: tex(384, 256, draw) }), fm = new THREE.MeshBasicMaterial({ map: frostT, transparent: true, opacity: 0, depthWrite: false });
    const tiles = []; for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const tg = new THREE.Group(), x = -3.6 + TW / 2 + i * TW, y = -2.4 + TH / 2 + j * TH; tg.position.set(x, y, 0.02); fg.add(tg); const geo = tileGeo(i, j); tg.add(new THREE.Mesh(geo, pm)); const fmm = new THREE.Mesh(geo, fm); fmm.position.z = 0.015; tg.add(fmm); tiles.push({ tg, x, y, h: hash(f * 40 + i * 7 + j * 3) }); }
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.8), new THREE.MeshBasicMaterial({ map: crackT, transparent: true, opacity: 0, depthWrite: false })); crack.position.z = 0.05; fg.add(crack);
    return { fg, pm, fm, tiles, crack };
  });
  // the warm doorway behind the frames, and the two of them with one suitcase
  const DW = new THREE.Group(); DW.position.set(0, 0, -16); s.add(DW);
  const dwM = new THREE.MeshBasicMaterial({ color: 0x000000 }); const opening = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 8.2), dwM); opening.position.set(0, 4.1, -0.2); DW.add(opening);
  box(0.5, 8.8, 0.6, 0xe8dcc8, -2.85, 4.4, 0, DW); box(0.5, 8.8, 0.6, 0xe8dcc8, 2.85, 4.4, 0, DW); box(6.2, 0.5, 0.6, 0xe8dcc8, 0, 8.9, 0, DW);
  const spillM = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false }); const spill = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 12), spillM); spill.rotation.x = -Math.PI / 2; spill.position.set(0, 0.02, 6); DW.add(spill);
  const dl = new THREE.PointLight(0xffd29a, 0, 30); dl.position.set(0, 6, 9); DW.add(dl);
  const C = castOf(s, ['jack', 'roseCoat']); const case1 = box(1.9, 1.3, 0.6, 0x6a4026, 0, 1.75, 0, s); box(0.6, 0.15, 0.15, 0x2a1a10, 0, 2.5, 0, case1);
  const snow = snowFx(s, 500, 0.14, 0xe8f4ff);
  return {
    s, cam, C, frames, frost: 0, crack: 0, fall: 0, doorway: 0,
    pre(T) { this.frost = 0; this.crack = 0; this.fall = 0; this.doorway = 0; hideCast(C); case1.visible = false; snow.pts.visible = false; },
    post(T) {
      const fr2 = this.frost, cr = this.crack, fa = this.fall;
      frames.forEach((F, f) => {
        F.fm.opacity = fr2 * 0.85; F.pm.color.setRGB(lerp(1, 0.68, fr2), lerp(1, 0.82, fr2), 1); F.crack.material.opacity = fa > 0.02 ? 0 : cr; F.fg.position.y = 6.2 + Math.sin(T * 0.6 + f) * 0.06;
        F.tiles.forEach(t => { const tt = clamp((fa - t.h * 0.35) / 0.65), e = tt * tt; let y = t.y - 15 * e; const lay = y < -6.05; if (lay) y = -6.05; t.tg.position.set(t.x + (t.h - 0.5) * 4 * tt, y, 0.02 + (lay ? 0.8 + t.h * 2 : 1.6 * tt)); t.tg.rotation.set(lay ? -Math.PI / 2 : -tt * (2 + t.h * 4), tt * (t.h - 0.5) * 3, tt * (t.h - 0.5) * 5); });
      });
      const d = this.doorway; dwM.color.setRGB(d * 0.62, d * 0.5, d * 0.34); spillM.opacity = d * 0.16; dl.intensity = d * 22;
      if (d > 0.05) { show(C.jack, 1.25, 0, -15.6 + this.step, 0); show(C.roseCoat, -1.25, 0, -15.6 + this.step, 0); C.jack.armL.rotation.set(0, 0, -0.22); C.roseCoat.armR.rotation.set(0, 0, 0.22); C.jack.look('joy', T); C.roseCoat.look('joy', T); case1.visible = true; case1.position.set(0, 1.75, -15.4 + this.step); }
      if (fr2 > 0.05) { snow.pts.visible = true; snow.set(T, 0, 0, 2, 16, 14, 8, 1.2); }
    },
  };
});
const MEM = (key, fn) => SHOT(key, 'a4_memory', c => { c.S.step = 0; fn(c, c.S); c.S.post(c.T); });
const HOUSE = '<svg width="170" height="170" viewBox="0 0 170 170"><path d="M20 80 L85 25 L150 80 L150 150 L20 150 Z" fill="none" stroke="#e8f2ff" stroke-width="10" stroke-linejoin="round"/><text x="85" y="134" font-size="64" font-family="Inter" font-weight="900" fill="#e8f2ff" text-anchor="middle">$</text></svg>';
const BUBBLES = '<svg width="170" height="170" viewBox="0 0 170 170"><path d="M12 30 h80 a10 10 0 0 1 10 10 v40 a10 10 0 0 1 -10 10 h-50 l-18 18 v-18 h-12 a10 10 0 0 1 -10 -10 v-40 a10 10 0 0 1 10 -10z" fill="none" stroke="#e8f2ff" stroke-width="8"/><path d="M78 74 h70 a10 10 0 0 1 10 10 v36 a10 10 0 0 1 -10 10 h-10 v16 l-16 -16 h-44 a10 10 0 0 1 -10 -10 v-36 a10 10 0 0 1 10 -10z" fill="#e8f2ff" fill-opacity=".2" stroke="#e8f2ff" stroke-width="8"/><text x="52" y="76" font-size="44" font-family="Inter" font-weight="900" fill="#e8f2ff" text-anchor="middle">!</text><text x="118" y="122" font-size="40" font-family="Inter" font-weight="900" fill="#e8f2ff" text-anchor="middle">?!</text></svg>';
const icon = (svg, lbl, k, x) => D(x, 110, 380, 0, `text-align:center;opacity:${0.95 * clamp(k / 0.12)};transform:scale(${1.25 - 0.25 * ease(k / 0.2)})`, `<div style="position:relative;display:inline-block;width:170px;height:170px">${svg}<svg width="170" height="170" viewBox="0 0 170 170" style="position:absolute;left:0;top:0"><line x1="18" y1="152" x2="152" y2="18" stroke="#ff4a5a" stroke-width="16" stroke-linecap="round" stroke-dasharray="190" stroke-dashoffset="${190 * (1 - ease((k - 0.12) / 0.25))}"/></svg></div><div style="font-size:42px;letter-spacing:6px;margin-top:6px;${STR2}">${lbl}</div>`);
const calStrip = t => D(0, 104, 1920, 0, 'text-align:center', [['THU', '11'], ['FRI', '12'], ['SAT', '13'], ['SUN', '14']].map(([d, n], i) => { const k = t - 0.05 - i * 0.14; return `<span style="display:inline-block;margin:0 14px;width:170px;padding:12px 0 16px;border-radius:16px;background:rgba(246,240,228,.96);color:#14161c;opacity:${clamp(k / 0.12)};transform:translateY(${(1 - ease(k / 0.2)) * -40}px) rotate(${(i - 1.5) * 2}deg);box-shadow:0 12px 30px rgba(0,0,0,.6)"><div style="font-size:24px;letter-spacing:5px;font-weight:700;color:#b3242c">APR · ${d}</div><div style="font-size:84px;line-height:1">${n}</div></span>`; }).join('') + `<div style="margin-top:14px;font-size:34px;letter-spacing:12px;font-weight:700;color:#fff;opacity:${clamp((t - 0.7) / 0.2)}">1912</div>`);
MEM('g2:0', (c, S) => move(c.cam, [-11, 6.6, 12], [-6, 6.1, 0], [7, 6.6, 12.5], [4, 6.1, 0], c.k, 36));
MEM('g2:1', (c, S) => { move(c.cam, [0, 5.4, 19], [0, 7.9, 0], [0, 5.5, 18], [0, 7.9, 0], c.k, 36); c.dom(calStrip(c.l)); });
MEM('g2:2', (c, S) => { move(c.cam, [0, 5.5, 18], [0, 7.9, 0], [0, 5.5, 17.4], [0, 7.9, 0], c.k, 36); c.dom(icon(HOUSE, 'NO RENT', c.l, 770)); });
MEM('g2:3', (c, S) => { move(c.cam, [0, 5.5, 17.4], [0, 7.9, 0], [0, 5.5, 16.6], [0, 7.9, 0], c.k, 36); c.dom(icon(HOUSE, 'NO RENT', 9, 540) + icon(BUBBLES, 'NO ARGUMENTS', c.l, 1000)); });
MEM('g2:4', (c, S) => { S.frost = ease(c.k * 1.3); move(c.cam, [0, 5.6, 16.6], [0, 6.1, 0], [0, 6.1, 11], [0, 6.2, 0], c.k, 36); });
MEM('g3', (c, S) => { S.frost = 1; S.crack = ease(c.l / 0.45); S.fall = clamp((c.l - 0.5) / 1.3); S.doorway = ease((c.l - 0.55) / 0.9); S.step = ease((c.l - 1.6) / 1.2) * 1.2; move(c.cam, [0, 6.1, 11], [0, 5.6, -4], [0, 4.4, 2.5], [0, 3.9, -15], c.k, 36); });

// =====================================================================================
// SANTA MONICA PIER — the roller coaster (g4:0)
// =====================================================================================
const TRK = u => { const x = -70 + 140 * u; return [x, 16 + 7 * Math.cos(x * 0.07) + 3 * Math.cos(x * 0.19 + 1), -4]; };
SET('a4_coaster', () => {
  const { s, cam } = mkScene(0xbfe2f6, [150, 800], 0xfff2d8, 2.6, [0xffffff, 0x8a9a8a, 1.3], [50, 80, 70], 80);
  s.userData.bloom = 0.3; cam.far = 1600;
  skyDome(s, [[0, '#4f9ae0'], [0.45, '#a8d4f2'], [0.5, '#bfe2f6'], [1, '#bfe2f6']]);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshPhongMaterial({ color: 0x3a8ac0, shininess: 90, specular: 0xffffff })); sea.rotation.x = -Math.PI / 2; s.add(sea);
  const plank = tex(64, 64, c => { c.fillStyle = '#a8865a'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#8a6a44'; for (let y = 0; y < 64; y += 8) c.fillRect(0, y, 64, 1.5); }); plank.wrapS = plank.wrapT = THREE.RepeatWrapping; plank.repeat.set(40, 8);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(220, 1, 40), [M(0x8a6a44), M(0x8a6a44), new THREE.MeshLambertMaterial({ map: plank }), M(0x8a6a44), M(0x8a6a44), M(0x8a6a44)]); deck.position.set(0, 5.5, -6); deck.receiveShadow = true; s.add(deck);
  for (let x = -100; x <= 100; x += 8) for (const z of [-24, -6, 12]) box(0.9, 5.2, 0.9, 0x6a5238, x, 2.6, z, s);
  const N = 300, ties = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.3, 3.4), M(0x8a5a32), N), rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.22, 0.22), M(0xd0d4da), N * 2), NP = Math.ceil(N / 5) * 2, posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 1, 0.45), M(0xf2ece0), NP);
  const dm = new THREE.Object3D(); let pi = 0;
  for (let i = 0; i < N; i++) { const p = TRK(i / N), q = TRK((i + 1) / N), a = Math.atan2(q[1] - p[1], q[0] - p[0]), L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    dm.position.set(...p); dm.rotation.set(0, 0, a); dm.scale.set(1, 1, 1); dm.updateMatrix(); ties.setMatrixAt(i, dm.matrix);
    for (const [k, sd] of [[0, -1.3], [1, 1.3]]) { dm.position.set((p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + 0.25, -4 + sd); dm.scale.set(L + 0.05, 1, 1); dm.updateMatrix(); rails.setMatrixAt(i * 2 + k, dm.matrix); }
    if (i % 5 === 0) for (const sd of [-1.6, 1.6]) { const h = p[1] - 6; dm.position.set(p[0], 6 + h / 2, -4 + sd); dm.rotation.set(0, 0, 0); dm.scale.set(1, h, 1); dm.updateMatrix(); posts.setMatrixAt(pi++, dm.matrix); } }
  [ties, rails, posts].forEach(m => { m.castShadow = true; s.add(m); });
  // ferris wheel
  const FW = new THREE.Group(); FW.position.set(30, 25, -40); s.add(FW); const wheel = new THREE.Group(); FW.add(wheel); const gond = [];
  for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; box(4.3, 0.4, 0.4, 0xf2f2ee, Math.cos(a) * 17, Math.sin(a) * 17, 0, wheel).rotation.z = a + Math.PI / 2; }
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; box(17, 0.25, 0.25, 0xf2f2ee, Math.cos(a) * 8.5, Math.sin(a) * 8.5, 0, wheel).rotation.z = a; const g = new THREE.Group(); g.position.set(Math.cos(a) * 17, Math.sin(a) * 17, 0); wheel.add(g); box(2.2, 2, 1.8, [0xd8402a, 0x2a7ad8, 0xf2c230][i % 3], 0, -1.6, 0, g); gond.push(g); }
  for (const sx of [-1, 1]) box(0.8, 22, 0.8, 0xf2f2ee, sx * 4, -9.5, 2, FW).rotation.z = sx * 0.18;
  for (let x = -90; x <= 90; x += 12) { box(0.25, 5, 0.25, 0xf2f2ee, x, 8.5, 13.6, s); box(0.6, 0.6, 0.6, basic(0xfff2c8), x, 11.2, 13.6, s); box(1.6, 1.0, 0.05, [0xd8402a, 0x2a7ad8, 0xf2c230][(x / 12 + 9) % 3], x + 0.9, 10.4, 13.6, s); }
  const mkCar = (col) => { const g = new THREE.Group(); s.add(g); box(3.6, 1.0, 3.8, col, 0, 0.5, 0, g); box(0.4, 1.8, 3.8, col, 1.8, 1.1, 0, g); box(0.3, 1.5, 3.6, 0x8a1a1a, -0.4, 1.3, 0, g); box(3.8, 0.3, 0.3, 0xd0d4da, 0, 0.1, -1.9, g); box(3.8, 0.3, 0.3, 0xd0d4da, 0, 0.1, 1.9, g); return g; };
  const car1 = mkCar(0xc8302a), car2 = mkCar(0x2a6ac8);
  const C = castOf(s, ['jack', 'roseFly', 'civA', 'civB']); [[C.jack, car1, -1.3], [C.roseFly, car1, 1.3], [C.civA, car2, -1.3], [C.civB, car2, 1.3]].forEach(([ch, car, z]) => { car.add(ch.g); });
  return {
    s, cam, C, car1,
    place(u, T) {
      [[car1, u], [car2, u - 0.03]].forEach(([car, uu]) => { const p = TRK(uu), q = TRK(uu + 0.002); car.position.set(p[0], p[1] + 0.45, -4); car.rotation.set(0, 0, Math.atan2(q[1] - p[1], q[0] - p[0])); });
      [[C.jack, -1.3], [C.roseFly, 1.3], [C.civA, -1.3], [C.civB, 1.3]].forEach(([ch, z], i) => { ch.reset(); ch.g.visible = true; ch.g.position.set(0.2, -1.1, z); ch.g.rotation.set(0, Math.PI / 2, 0); ch.sit(); const w = Math.sin(T * 9 + i) * 0.18; ch.armL.rotation.set(-3.0 + w, 0, -0.25); ch.armR.rotation.set(-3.0 - w, 0, 0.25); ch.look('joy', T); ch.head.rotation.x = -0.15; });
    },
    pre(T) { wheel.rotation.z = T * 0.12; gond.forEach(g => g.rotation.z = -T * 0.12); },
  };
});
SHOT('g4:0', 'a4_coaster', c => { const S = c.S, u = 0.33 + 0.26 * c.k; S.place(u, c.T); const p = TRK(u); shot(c.cam, [p[0] + 12, p[1] + 4.4, 5.6], [p[0] - 0.5, p[1] + 3.4, -4], 32); });

// =====================================================================================
// HORSES IN THE SURF AT SUNSET (g4:1, g4:2)
// =====================================================================================
function makeHorse(col, mane) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  box(2.1, 2.2, 5.2, col, 0, 5.1, 0, body); box(2.3, 0.3, 1.8, 0x5a3a20, 0, 6.3, 0.2, body);
  const neck = new THREE.Group(); neck.position.set(0, 5.8, 2.2); body.add(neck); box(1.3, 3.2, 1.5, col, 0, 1.4, 0.2, neck); box(1.25, 1.3, 2.6, col, 0, 3.0, 1.2, neck); box(1.2, 0.9, 1.0, 0x2a1e18, 0, 2.75, 2.5, neck); box(0.3, 0.6, 0.3, col, -0.4, 3.9, 0.4, neck); box(0.3, 0.6, 0.3, col, 0.4, 3.9, 0.4, neck); box(0.4, 3.4, 0.6, mane, 0, 1.8, -0.6, neck);
  const tail = new THREE.Group(); tail.position.set(0, 5.9, -2.6); body.add(tail); box(0.5, 3.0, 0.5, mane, 0, -1.4, -0.4, tail);
  const legs = [[-0.7, 2.1], [0.7, 2.1], [-0.7, -2.0], [0.7, -2.0]].map(([x, z]) => { const p = new THREE.Group(); p.position.set(x, 4.2, z); body.add(p); box(0.6, 3.9, 0.6, col, 0, -1.95, 0, p); box(0.66, 0.4, 0.66, 0x2a2420, 0, -4.0, 0, p); return p; });
  return { g, body, run(ph, a = 0.7) { const o = [0, 0.7, Math.PI, Math.PI + 0.7]; legs.forEach((l, i) => l.rotation.x = Math.sin(ph + o[i]) * a); body.position.y = Math.abs(Math.sin(ph)) * 0.35 * a; body.rotation.x = Math.sin(ph) * 0.04 * a; neck.rotation.x = 0.5 + Math.sin(ph + 1) * 0.1 * a; tail.rotation.x = 0.7 + Math.sin(ph * 2) * 0.15; } };
}
const HX = T => T < 284.46 ? (T - 283.6) * 10 : (284.46 - 283.6) * 10 + (T - 284.46) * 4.5;
SET('a4_beach', () => {
  const FOG = 0xf2b088;
  const { s, cam } = mkScene(FOG, [90, 700], 0xffb070, 2.2, [0xffe2c8, 0x7a5a5a, 1.2], [-60, 24, -220], 50);
  s.userData.bloom = 0.48; cam.far = 1600;
  skyDome(s, [[0, '#4a5a9a'], [0.32, '#c8789a'], [0.44, '#f89a6a'], [0.49, '#ffc888'], [0.5, '#f2b088'], [1, '#f2b088']]);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(40, 32), basic(0xffe0a0, { fog: false })); sun.position.set(-120, 30, -660); sun.lookAt(0, 0, 0); s.add(sun);
  const fill = new THREE.DirectionalLight(0xffd8b8, 1.3); fill.position.set(20, 20, 60); s.add(fill);
  ground(s, 600, '#e2b884', '#e8c08e');
  const sea = new THREE.Mesh(new THREE.BoxGeometry(1600, 0.2, 800), new THREE.MeshPhongMaterial({ color: 0x5a6a96, shininess: 100, specular: 0xffc090 })); sea.position.set(0, 0.2, -403); s.add(sea);
  const foamM = basic(0xfff6ea, { transparent: true, opacity: 0.8 }); const foam = [0, 1, 2, 3].map(() => { const f = box(1600, 0.06, 0.8, foamM, 0, 0.32, -4, s); f.castShadow = false; return f; });
  const r = rng(31); for (let i = 0; i < 12; i++) { const x = (r() - 0.5) * 400, z = 40 + r() * 60, h = 14 + r() * 6, g = new THREE.Group(); g.position.set(x, 0, z); s.add(g); box(0.9, h, 0.9, 0x5a4030, 0, h / 2, 0, g); for (let k = 0; k < 5; k++) box(5, 0.4, 1.2, 0x3a5a30, Math.cos(k * 1.25) * 2.4, h, Math.sin(k * 1.25) * 2.4, g).rotation.y = -k * 1.25; }
  const hJ = makeHorse(0x6a4026, 0x1c140e), hR = makeHorse(0xe8e0d0, 0x8a8478); s.add(hJ.g, hR.g);
  const C = castOf(s, ['jack', 'rose']); hJ.body.add(C.jack.g); hR.body.add(C.rose.g);
  const SPN = 160, spl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), basic(0xffffff), SPN); spl.frustumCulled = false; s.add(spl); const dm = new THREE.Object3D();
  return {
    s, cam, C,
    pre(T) {
      foam.forEach((f, i) => { const k = (T * 0.25 + i * 0.25) % 1; f.position.z = -1.5 - k * 9; f.material.opacity = 0.8 * Math.sin(k * Math.PI); });
      const X = HX(T), gal = T < 284.46, amp = gal ? 0.75 : 0.42, ph = gal ? T * 11 : T * 6;
      [[hJ, C.jack, -8.2, 0], [hR, C.rose, -4.4, 0.9]].forEach(([h, ch, z, o]) => {
        h.g.position.set(X + (o ? 0 : 6.5), 0, z); h.g.rotation.set(0, Math.PI / 2, 0); h.run(ph + o, amp);
        ch.reset(); ch.g.visible = true; ch.g.position.set(0, 4.25, 0.2); ch.g.rotation.set(0, 0, 0); ch.legL.rotation.set(-0.35, 0, -0.8); ch.legR.rotation.set(-0.35, 0, 0.8); ch.armL.rotation.set(-0.8, 0, 0.2); ch.armR.rotation.set(-0.8, 0, -0.2); ch.body.rotation.x = gal ? 0.15 : 0.05; ch.look('joy', T);
      });
      for (let i = 0; i < SPN; i++) { const h = i % 2 ? hR : hJ, k = (T * 2.2 + hash(i)) % 1, on = T < 284.46 || hash(i + 0.4) < 0.4; dm.position.set(h.g.position.x + (hash(i + 0.1) - 0.5) * 5, on ? 0.3 + Math.sin(k * Math.PI) * 1.8 * (0.5 + hash(i + 0.2)) : -5, h.g.position.z + (hash(i + 0.3) - 0.5) * 2.6); dm.scale.setScalar(1 - k * 0.8); dm.updateMatrix(); spl.setMatrixAt(i, dm.matrix); } spl.instanceMatrix.needsUpdate = true;
    },
  };
});
SHOT('g4:1', 'a4_beach', c => { const X = HX(c.T); shot(c.cam, [X + 5 - c.k * 2, 6.0, 24], [X + 3.5, 5.6, -6], 38); });
SHOT('g4:2', 'a4_beach', c => { const S = c.S, X = HX(c.T); S.C.rose.head.rotation.y = -0.7; S.C.jack.head.rotation.y = -0.5; move(c.cam, [X + 2.5, 9.0, 12], [X + 3, 8.5, -6], [X + 3.5, 8.9, 10.8], [X + 3.5, 8.5, -6], c.k, 30); });

// =====================================================================================
// THE APARTMENT (g5, g6, g7) — era 0 = cold first winter, era 1 = years later
// =====================================================================================
SET('a4_flat', () => {
  const { s, cam } = mkScene(0x1a1c22, [40, 160], 0xc8d8f0, 0.9, [0xc8d0e0, 0x3a3430, 0.95], [-10, 20, -40], 24);
  s.userData.bloom = 0.35; s.userData.sun.castShadow = false;
  const wood = tex(64, 64, c => { c.fillStyle = '#6a4a32'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#5a3c28'; for (let y = 0; y < 64; y += 16) c.fillRect(0, y, 64, 2); c.fillRect(30, 0, 2, 16); c.fillRect(10, 16, 2, 16); c.fillRect(44, 32, 2, 16); c.fillRect(20, 48, 2, 16); }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(6, 4);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(22, 16), new THREE.MeshLambertMaterial({ map: wood })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, 1); fl.receiveShadow = true; s.add(fl);
  const wallM = new THREE.MeshLambertMaterial({ color: 0x7f877e });
  box(8.8, 11, 0.4, wallM, -6.6, 5.5, -7, s); box(8.8, 11, 0.4, wallM, 6.6, 5.5, -7, s); box(4.4, 4, 0.4, wallM, 0, 2, -7, s); box(4.4, 2.6, 0.4, wallM, 0, 9.7, -7, s);
  box(0.4, 11, 16, wallM, -11, 5.5, 1, s); box(0.4, 11, 16, wallM, 11, 5.5, 1, s); box(22, 0.4, 16, 0x3a3832, 0, 11.2, 1, s);
  for (const [w, h, x, y] of [[4.8, 0.3, 0, 4.05], [4.8, 0.3, 0, 8.35], [0.3, 4.6, -2.25, 6.2], [0.3, 4.6, 2.25, 6.2], [4.4, 0.15, 0, 6.2], [0.15, 4.4, 0, 6.2]]) box(w, h, 0.5, 0x3a2a1e, x, y, -6.9, s);
  const outT = tex(256, 128, (c, w, h) => { c.fillStyle = '#b8c0cc'; c.fillRect(0, 0, w, h); c.fillStyle = '#4a4a52'; for (let i = 0; i < 9; i++) { const x = i * 30 - 6, hh = 30 + hash(i) * 40; c.fillRect(x, h - hh, 26, hh); c.fillStyle = '#eef2f6'; c.fillRect(x, h - hh, 26, 5); c.fillStyle = '#4a4a52'; c.fillRect(x + 16, h - hh - 12, 5, 12); } });
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: outT })); outside.position.set(0, 6, -20); s.add(outside);
  const winSnow = snowFx(s, 220, 0.12);
  box(3.6, 2.2, 0.6, 0x7a7f86, 0, 1.3, -6.4, s); for (let i = 0; i < 9; i++) box(0.18, 2.3, 0.7, 0x8a9096, -1.6 + i * 0.4, 1.3, -6.4, s);
  box(6, 0.3, 3.2, 0x5a3a24, 0, 3.0, -1.5, s); for (const [x, z] of [[-2.7, -2.8], [2.7, -2.8], [-2.7, -0.2], [2.7, -0.2]]) box(0.3, 2.9, 0.3, 0x4a2e1c, x, 1.45, z, s);
  for (const sx of [-1, 1]) { box(1.8, 0.3, 1.8, 0x4a2e1c, sx * 3.9, 2.0, -1.5, s); box(0.3, 3, 1.8, 0x4a2e1c, sx * 4.7, 3.3, -1.5, s); for (const dz of [-0.7, 0.7]) box(0.25, 2, 0.25, 0x4a2e1c, sx * 3.9, 1, -1.5 + dz, s); }
  const billT = tex(64, 80, c => { c.fillStyle = '#f2ece0'; c.fillRect(0, 0, 64, 80); c.fillStyle = '#6a6a72'; for (let y = 12; y < 74; y += 9) c.fillRect(8, y, 30 + hash(y) * 20, 3); c.fillStyle = '#b3242c'; c.fillRect(8, 64, 26, 6); });
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 1.15), [M(0xf2ece0), M(0xf2ece0), new THREE.MeshLambertMaterial({ map: billT }), M(0xf2ece0), M(0xf2ece0), M(0xf2ece0)]); b.position.set(-2.2 + hash(i) * 4.4, 3.17 + i * 0.005, -1.5 + (hash(i + 2) - 0.5) * 2.2); b.rotation.y = (hash(i + 4) - 0.5) * 1.6; s.add(b); }
  box(2.6, 3.0, 2.2, 0x1c1c20, 8.2, 1.5, -5, s); box(0.6, 8, 0.6, 0x1c1c20, 8.6, 7, -5.7, s); const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 14), M(0x2a2a2e)); pan.position.set(7.8, 3.15, -4.6); s.add(pan); box(0.9, 0.12, 0.7, 0x0c0a08, 7.8, 3.3, -4.6, s); box(1.2, 0.14, 0.18, 0x2a2a2e, 6.6, 3.2, -4.6, s);
  const SMN = 44, smoke = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x5a5a60, transparent: true, opacity: 0.55 }), SMN); smoke.frustumCulled = false; s.add(smoke);
  box(0.05, 1.4, 0.05, 0x1a1a1a, 0, 10.4, 0, s); const bulbM = basic(0xdfe8ff); box(0.4, 0.5, 0.4, bulbM, 0, 9.5, 0, s); const bulb = new THREE.PointLight(0xc8d8ff, 30, 30); bulb.position.set(0, 9.2, 0); s.add(bulb);
  const keyL = new THREE.PointLight(0xffe2c8, 22, 26); keyL.position.set(0, 8, 10); s.add(keyL);
  box(1.6, 3, 0.5, 0x3a3a44, -10.6, 6.2, -2, s).rotation.y = Math.PI / 2; box(1.6, 3, 0.5, 0x5a4232, -10.6, 6.2, 0.2, s).rotation.y = Math.PI / 2; box(0.2, 7.2, 3, 0x5a3a24, -10.75, 3.6, 5, s);
  // years-later things
  const later = new THREE.Group(); s.add(later);
  const rugT = tex(64, 48, c => { c.fillStyle = '#8a2a2a'; c.fillRect(0, 0, 64, 48); c.strokeStyle = '#e2b84a'; c.lineWidth = 3; c.strokeRect(5, 5, 54, 38); c.fillStyle = '#2a4a6a'; c.fillRect(24, 16, 16, 16); });
  const rug = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 6), [M(0x8a2a2a), M(0x8a2a2a), new THREE.MeshLambertMaterial({ map: rugT }), M(0x8a2a2a), M(0x8a2a2a), M(0x8a2a2a)]); rug.position.set(0, 0.03, 3.4); later.add(rug);
  for (const sx of [-1, 1]) box(1.4, 6, 0.3, 0xe8d8b0, sx * 3.0, 6.6, -6.6, later);
  box(1.2, 1.2, 1.2, 0x8a5a3a, -8.8, 0.6, -5.6, later); for (let i = 0; i < 5; i++) box(0.5, 2.2, 0.5, 0x3f8a4a, -8.8 + Math.cos(i * 1.3) * 0.5, 2.0, -5.6 + Math.sin(i * 1.3) * 0.5, later).rotation.z = Math.cos(i * 1.3) * 0.4;
  const sk = tex(96, 72, (c, w, h) => { c.fillStyle = '#efe6d0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a3028'; c.lineWidth = 2; c.beginPath(); c.arc(48, 30, 13, 0, 7); c.stroke(); c.beginPath(); c.moveTo(26, 70); c.quadraticCurveTo(48, 40, 70, 70); c.stroke(); });
  for (let i = 0; i < 3; i++) { box(0.15, 2.4, 3.0, 0xb8892f, -10.75, 6.5, -2.8 + i * 3.6, later); const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.0), new THREE.MeshBasicMaterial({ map: sk })); p.rotation.y = Math.PI / 2; p.position.set(-10.66, 6.5, -2.8 + i * 3.6); later.add(p); }
  box(5, 1.6, 2.2, 0x3f5a7a, -6.6, 0.8, -5.2, later); box(5, 2.2, 0.6, 0x3f5a7a, -6.6, 2.4, -6.1, later);
  const C = castOf(s, ['jackMid', 'roseMid', 'boy', 'girl']);
  const scarves = [[C.jackMid, 0x8a2a2a], [C.roseMid, 0x5a6a7a]].map(([ch, col]) => { const g = new THREE.Group(); ch.body.add(g); box(1.7, 0.55, 1.4, col, 0, 4.15, 0, g); box(0.5, 1.5, 0.2, col, 0.45, 3.35, 0.65, g); return g; });
  const towel = box(0.9, 1.3, 0.1, 0xf2f2ee, 0, -2.4, 0.3, C.roseMid.armR);
  const cold = new THREE.Color(0x7f877e), warm = new THREE.Color(0xe2cfaa), dmm = new THREE.Object3D();
  return {
    s, cam, C, era: 0, smoke: 0,
    pre(T) { this.era = 0; this.smoke = 0; hideCast(C); towel.visible = false; },
    post(T) {
      const e = this.era; wallM.color.lerpColors(cold, warm, e); later.visible = e > 0.5; scarves.forEach(g => g.visible = e < 0.5);
      bulb.color.setRGB(lerp(0.78, 1, e), lerp(0.85, 0.85, e), lerp(1, 0.62, e)); bulbM.color.setRGB(lerp(0.88, 1, e), lerp(0.9, 0.9, e), lerp(1, 0.7, e)); bulb.intensity = lerp(26, 60, e);
      winSnow.pts.visible = e < 0.7; winSnow.set(T, 0, 0, -13, 6, 12, 5, 1.6);
      for (let i = 0; i < SMN; i++) { const k = (T * 0.45 + hash(i)) % 1, on = hash(i + 0.5) < this.smoke; dmm.position.set(7.8 + (hash(i + 0.1) - 0.5) * (0.6 + k * 2.4), on ? 3.4 + k * 6 : -20, -4.6 + (hash(i + 0.3) - 0.5) * (0.6 + k * 2)); dmm.rotation.set(T + i, i, 0); dmm.scale.setScalar(0.4 + k * 1.8); dmm.updateMatrix(); smoke.setMatrixAt(i, dmm.matrix); } smoke.instanceMatrix.needsUpdate = true;
    },
    towel,
  };
});
const FLAT = (key, fn) => SHOT(key, 'a4_flat', c => { fn(c, c.S, c.S.C); c.S.post(c.T); });
FLAT('g5:0', (c, S, C) => {
  const r2 = C.roseMid, j = C.jackMid; show(r2, 0.6, 0, -5.0, Math.PI); r2.armL.rotation.set(-1.2 + Math.sin(c.T * 8) * 0.12, 0, 0.25); r2.armR.rotation.set(-1.2 - Math.sin(c.T * 8) * 0.12, 0, -0.25); r2.look('sad', c.T);
  seatAt(j, -3.9, 2.15, -1.5, Math.PI / 2); j.armL.rotation.x = j.armR.rotation.x = -1.45; j.head.rotation.x = 0.35; j.look('sad', c.T);
  move(c.cam, [6, 7.6, 14], [-1, 4, -3], [3.8, 7.0, 11.2], [-1, 4, -3], c.k, 38);
});
FLAT('g5:1', (c, S, C) => { S.smoke = 1; const r2 = C.roseMid; show(r2, 5.6, 0, -4.4, Math.PI / 2); S.towel.visible = true; r2.armR.rotation.set(-1.6 + Math.sin(c.T * 14) * 0.45, 0, 0); r2.armL.rotation.set(-0.6, 0, 0.2); r2.head.rotation.y = -0.3; r2.look('surprised', c.T); move(c.cam, [10.2, 6.4, 2.2], [6.8, 4.2, -4.4], [9.8, 6.2, 1.6], [6.8, 4.3, -4.4], c.k, 34); });
FLAT('g5:3', (c, S, C) => {
  const [i, k] = cuts(c.k, [0.6]), r2 = C.roseMid, j = C.jackMid, tw = i ? ease(k / 0.5) : 0;
  show(j, -1.8, 0, 3.4, lerp(Math.PI / 2, -Math.PI / 2, tw)); show(r2, 1.8, 0, 3.4, lerp(-Math.PI / 2, Math.PI / 2, tw));
  if (i === 0) { j.armR.rotation.set(-1.0 + Math.sin(c.T * 7) * 0.5, 0, 0); j.armL.rotation.set(-0.6 + Math.sin(c.T * 6 + 1) * 0.4, 0, 0); r2.armL.rotation.set(-1.5, 0, 0); r2.armR.rotation.set(-0.4 + Math.sin(c.T * 8) * 0.3, 0, 0); j.look('serious', c.T); r2.look('serious', c.T); move(c.cam, [0, 6.8, 16], [0, 4.0, 2], [0, 6.5, 14.6], [0, 4.0, 2], k, 34); }
  else { j.head.rotation.x = 0.3; r2.head.rotation.x = 0.25; j.look('sad', c.T); r2.look('sad', c.T); move(c.cam, [0, 6.4, 14.4], [0, 4.1, 2.5], [0, 6.3, 13.8], [0, 4.1, 2.5], k, 34); }
});
FLAT('g6', (c, S, C) => {
  const [i, k] = cuts(c.k, [0.32, 0.6]), r2 = C.roseMid, j = C.jackMid;
  if (i === 0) { show(j, -1.8, 0, 3.4, -Math.PI / 2); show(r2, 1.8, 0, 3.4, Math.PI / 2); j.head.rotation.x = 0.3; r2.head.rotation.x = 0.25; j.look('sad', c.T); r2.look('sad', c.T); move(c.cam, [0, 6.3, 13.8], [0, 4.1, 2.5], [0, 6.2, 13.0], [0, 4.0, 2.5], k, 34); return; }
  const turn = i === 1 ? ease(k / 0.45) : 1, reach = i === 1 ? ease((k - 0.35) / 0.5) : 1;
  show(r2, 1.8, 0, 3.4, lerp(Math.PI / 2, -Math.PI / 2, turn)); show(j, -1.8, 0, 3.4, lerp(-Math.PI / 2, Math.PI / 2, i === 1 ? ease((k - 0.3) / 0.45) : 1));
  r2.armR.rotation.set(-1.4 * reach, 0, 0); j.armL.rotation.set(-1.4 * reach, 0, 0);
  if (i === 1) { r2.look('sad', c.T); j.look(k > 0.7 ? 'neutral' : 'sad', c.T); move(c.cam, [0.8, 5.8, 14.2], [0, 4.0, 3.8], [0.5, 5.6, 13.2], [0, 3.9, 4.0], k, 32); return; }
  S.era = ease((k - 0.1) / 0.7); r2.look('neutral', c.T); j.look('neutral', c.T); r2.head.rotation.z = 0.12; j.head.rotation.z = -0.12;
  if (S.era > 0.55) { const b = C.boy, g = C.girl; const ab = c.T * 0.9; show(b, Math.cos(ab) * 3.2, 0, -2.6 + Math.sin(ab) * 1.2, -ab); show(g, -5 + Math.sin(c.T * 0.7) * 1.2, 0, -3.6, 0.6); b.g.scale.setScalar(0.62); g.g.scale.setScalar(0.72); b.walk(c.T * 8, 0.6); b.look('joy', c.T); g.look('joy', c.T); g.sit(); g.g.position.y = -0.9; }
  const yr = Math.round(lerp(1913, 1927, S.era)); c.dom(D(0, 120, 1920, 0, `text-align:center;font-size:130px;letter-spacing:8px;opacity:${clamp(k / 0.1)};${STR}`, `${yr}`));
  move(c.cam, [9, 8.4, 15], [0, 3.6, 0], [-8, 8.4, 14], [0, 3.6, 0], k, 38);
});
FLAT('g7', (c, S, C) => {
  const [i, k] = cuts(c.k, [0.5]), r2 = C.roseMid, j = C.jackMid; S.era = 1;
  show(j, -1.8, 0, 3.4, Math.PI / 2); show(r2, 1.8, 0, 3.4, -Math.PI / 2); const b = C.boy, g = C.girl; show(b, 4.6, 0, -3.0, -0.4); show(g, -4.8, 0, -3.4, 0.5); b.g.scale.setScalar(0.62); g.g.scale.setScalar(0.72); b.look('joy', c.T); g.look('joy', c.T); g.sit(); g.g.position.y = -0.9; b.sit(); b.g.position.y = -0.6;
  if (i === 0) { j.head.rotation.z = -0.06; j.look('smirk', c.T, c.talk); r2.look('neutral', c.T); move(c.cam, [4.6, 5.0, 7.6], [-1.15, 4.7, 3.4], [4.4, 5.0, 7.2], [-1.15, 4.7, 3.4], k, 30); return; }
  const h = ease(k / 0.5); r2.armR.rotation.set(-1.4 * h, 0, 0); j.armL.rotation.set(-1.4 * h, 0, 0); r2.look('joy', c.T); j.look('joy', c.T); r2.head.rotation.z = -0.08;
  move(c.cam, [0, 6.2, 15], [0, 4.0, 2.4], [0, 6.0, 14], [0, 4.0, 2.4], k, 34);
});
// the street corner where his drawings sell for a nickel (g5:2)
SET('a4_street', () => {
  const { s, cam } = mkScene(0xc9ced6, [40, 220], 0xf0f2f6, 1.6, [0xffffff, 0x6a6a72, 1.2], [20, 40, 30], 30);
  s.userData.bloom = 0.3;
  ground(s, 200, '#d8dbe0', '#e2e5ea'); box(200, 0.1, 14, 0x7a7e86, 0, 0.05, 14, s);
  const brick = tex(128, 64, c => { c.fillStyle = '#7a3a2a'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#5a2a20'; for (let y = 0; y < 64; y += 8) { c.fillRect(0, y, 128, 1.5); for (let x = (y / 8) % 2 ? 0 : 8; x < 128; x += 16) c.fillRect(x, y, 1.5, 8); } }); brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(8, 4);
  box(60, 16, 1, new THREE.MeshLambertMaterial({ map: brick }), 0, 8, -6, s);
  box(9, 5.5, 0.2, basic(0xffe2b0), -11, 4.4, -5.45, s); box(9.6, 0.4, 0.5, 0x2a2a30, -11, 7.3, -5.4, s); box(9.6, 0.4, 0.5, 0x2a2a30, -11, 1.5, -5.4, s);
  box(0.3, 9, 0.3, 0x1c1c22, 7, 4.5, -3, s); box(0.9, 1.2, 0.9, basic(0xfff2c8), 7, 9.3, -3, s);
  const sketchT = tex(128, 160, (c, w, h) => { c.fillStyle = '#efe6d0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a2420'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(64, 66, 30, 38, 0, 0, 7); c.stroke(); c.beginPath(); c.moveTo(24, 160); c.quadraticCurveTo(64, 104, 104, 160); c.stroke(); c.beginPath(); c.moveTo(48, 60); c.lineTo(54, 60); c.moveTo(74, 60); c.lineTo(80, 60); c.moveTo(56, 86); c.quadraticCurveTo(64, 92, 72, 86); c.stroke(); for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(36 + i * 5, 34); c.lineTo(32 + i * 6, 52); c.stroke(); } });
  const EZ = new THREE.Group(); EZ.position.set(2.6, 0, 0.2); EZ.rotation.y = -0.35; s.add(EZ); for (const [x, z, rz, rx] of [[-0.9, 0.3, 0.1, -0.08], [0.9, 0.3, -0.1, -0.08], [0, -0.7, 0, 0.25]]) { const l = box(0.15, 6.2, 0.15, 0x6a4a2e, x, 3.0, z, EZ); l.rotation.set(rx, 0, rz); }
  const canv = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.0, 0.1), [M(0xefe6d0), M(0xefe6d0), M(0xefe6d0), M(0xefe6d0), new THREE.MeshLambertMaterial({ map: sketchT }), M(0xefe6d0)]); canv.position.set(0, 4.6, 0.45); canv.rotation.x = -0.08; EZ.add(canv);
  const signT = tex(160, 200, (c, w, h) => { c.fillStyle = '#efe6d0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a2420'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#2a2420'; c.font = '900 26px Inter'; c.textAlign = 'center'; c.fillText('PORTRAITS', w / 2, 54); c.fillStyle = '#b3242c'; c.font = '900 92px Inter'; c.fillText('5¢', w / 2, 150); c.fillStyle = '#2a2420'; c.font = '700 18px Inter'; c.fillText('while you wait', w / 2, 182); });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.4, 0.12), [M(0x6a4a2e), M(0x6a4a2e), M(0x6a4a2e), M(0x6a4a2e), new THREE.MeshLambertMaterial({ map: signT }), M(0x6a4a2e)]); sign.position.set(-3.0, 1.75, 1.0); sign.rotation.set(-0.12, 0.2, 0); s.add(sign);
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), new THREE.MeshLambertMaterial({ map: sketchT })); p.position.set(-1.2 + i * 1.7, 7.2 + (i % 2) * 0.4, -5.45); p.rotation.z = (hash(i) - 0.5) * 0.2; s.add(p); }
  const snow = snowFx(s, 700, 0.16);
  const C = castOf(s, ['jackMid', 'civA', 'ladyB']); const sc = new THREE.Group(); C.jackMid.body.add(sc); box(1.7, 0.55, 1.4, 0x8a2a2a, 0, 4.15, 0, sc); box(0.5, 1.5, 0.2, 0x8a2a2a, 0.45, 3.35, 0.65, sc);
  const coin = box(0.3, 0.3, 0.06, basic(0xe2c25a), 0, -2.25, 0.4, C.ladyB.armR);
  return { s, cam, C, coin, pre(T) { hideCast(C); }, post(T) { snow.set(T, cam.position.x, 0, cam.position.z - 10, 20, 16, 14, 1.4); } };
});
SHOT('g5:2', 'a4_street', c => {
  const S = c.S, C = S.C, j = C.jackMid; show(j, 0.4, 0, -0.6, 0.15); j.armR.rotation.set(-1.0, 0, -0.35); j.look(c.k > 0.55 ? 'smirk' : 'neutral', c.T); j.head.rotation.y = c.k > 0.5 ? -0.5 : 0;
  const pa = C.civA; show(pa, lerp(-12, 9, c.k), 0, 5.2, Math.PI / 2); pa.walk(c.T * 6, 0.5); pa.look('neutral', c.T);
  const lb = C.ladyB, kk = ease(c.k / 0.4); show(lb, lerp(9, 3.8, kk), 0, 2.6, lerp(-Math.PI / 2, -2.2, kk)); if (kk < 1) lb.walk(c.T * 6, 0.4); lb.armR.rotation.set(-1.3 * ease((c.k - 0.45) / 0.25), 0, 0); lb.look('neutral', c.T);
  move(c.cam, [-2.6, 6.0, 13.4], [0.3, 3.9, 0], [-1.8, 5.6, 11.2], [0.3, 3.9, 0], c.k, 38); S.post(c.T);
});

// =====================================================================================
// THE RESEARCH SHIP'S STERN AT NIGHT (h1-h5) — deck y = 0, stern rail at z = 17.8, sea at y = -9; underwater at y = -400
// =====================================================================================
const NIGHT = 0x060a14;
const RZ0 = T => lerp(-14, 15.4, clamp((T - 300.3) / 7.2));
SET('a4_stern', () => {
  const { s, cam } = mkScene(NIGHT, [90, 700], 0xc8d8ff, 1.15, [0x8aa0d0, 0x101418, 0.7], [-6, 30, -60], 40);
  s.userData.bloom = 0.36; cam.far = 1600;
  const sp = []; for (let i = 0; i < 1100; i++) { const a = hash(i) * 6.283, e = 0.05 + hash(i + 0.3) * 1.4; sp.push(Math.cos(a) * Math.cos(e) * 700, Math.sin(e) * 700, Math.sin(a) * Math.cos(e) * 700); }
  const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, fog: false })); stars.geometry.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); s.add(stars);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(12, 32), basic(0xeef2ff, { fog: false })); moon.position.set(-120, 110, 560); moon.lookAt(0, 0, 0); s.add(moon);
  const seaM = new THREE.MeshPhongMaterial({ color: 0x0b1828, shininess: 120, specular: 0x6a80a8 }); const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), seaM); sea.rotation.x = -Math.PI / 2; sea.position.y = -9; s.add(sea);
  const plate = tex(64, 64, c => { c.fillStyle = '#4a5058'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#3a4048'; c.lineWidth = 2; c.strokeRect(1, 1, 62, 62); c.fillStyle = '#3e444c'; for (let i = 0; i < 6; i++) c.fillRect(6 + i * 10, 6, 3, 52); }); plate.wrapS = plate.wrapT = THREE.RepeatWrapping; plate.repeat.set(6, 10);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(24, 1, 40), [M(0x4a5058), M(0x4a5058), new THREE.MeshLambertMaterial({ map: plate }), M(0x4a5058), M(0x4a5058), M(0x4a5058)]); deck.position.set(0, -0.5, -1); deck.receiveShadow = true; s.add(deck);
  box(24.4, 8.5, 40.4, 0x1e2a3a, 0, -5.2, -1, s); for (const sx of [-1, 1]) box(0.4, 1.2, 40, 0x8a9098, sx * 12, 0.6, -1, s);
  for (let x = -11; x <= 11; x += 2) box(0.16, 3.0, 0.16, 0xd8dce2, x, 1.5, 17.8, s).castShadow = false; for (const y of [0.6, 1.8, 3.0]) box(22, 0.16, 0.16, 0xd8dce2, 0, y, 17.8, s);
  const AF = M(0xe0782a); for (const sx of [-1, 1]) { const l = box(1.1, 15, 1.1, AF, sx * 8, 7.2, 15.6, s); l.rotation.x = 0.12; } box(17.2, 1.2, 1.2, AF, 0, 14.6, 16.8, s); box(1.6, 1.6, 1.0, 0x2a2a30, 0, 13.0, 17.0, s); box(0.08, 6.4, 0.08, 0x9aa2ac, 0, 9.0, 17.0, s);
  const wd = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 4, 16), M(0x6a7078)); wd.rotation.z = Math.PI / 2; wd.position.set(5.5, 1.6, 6); s.add(wd); box(0.4, 3.2, 3, 0x3a4048, 3.3, 1.6, 6, s); box(0.4, 3.2, 3, 0x3a4048, 7.7, 1.6, 6, s);
  const SUB = new THREE.Group(); SUB.position.set(-6.5, 0, 3); s.add(SUB); box(3.6, 1.0, 1.0, 0x3a4048, 0, 0.5, -2.2, SUB); box(3.6, 1.0, 1.0, 0x3a4048, 0, 0.5, 2.2, SUB);
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.9, 4.2, 6, 12), new THREE.MeshPhongMaterial({ color: 0xf2c22a, shininess: 60 })); hull.rotation.x = Math.PI / 2; hull.position.y = 2.9; hull.castShadow = true; SUB.add(hull); box(1.2, 1.4, 2.4, 0xc8302a, 0, 5.0, 0, SUB); const vp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), new THREE.MeshPhongMaterial({ color: 0x1a3a6a, shininess: 120 })); vp.position.set(0, 2.7, 3.8); SUB.add(vp);
  for (const sx of [-1, 1]) { const th = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 10), M(0x2a2a30)); th.rotation.x = Math.PI / 2; th.position.set(sx * 1.9, 2.4, -3.6); SUB.add(th); }
  box(5, 5, 9, 0x2f5a8a, 8, 2.5, -10, s); box(1.4, 3.4, 0.1, 0x1a2a3a, 6.2, 1.8, -5.45, s);
  const work = []; for (const [x, z] of [[-10, 8], [10, 8], [0, -16]]) { box(0.3, 9, 0.3, 0x8a9098, x, 4.5, z, s); box(1.2, 0.6, 0.8, basic(0xfff4e0), x, 9, z, s); const p = new THREE.PointLight(0xfff0dc, 70, 34); p.position.set(x, 8.6, z); s.add(p); work.push(p); }
  const pool = new THREE.SpotLight(0xfff2e0, 260, 30, 0.38, 0.6); pool.position.set(0, 12, 10); pool.target.position.set(0, 0, 16.6); s.add(pool, pool.target);
  const fill = new THREE.PointLight(0xffe8d0, 0, 16); s.add(fill);
  const C = castOf(s, ['roseOld', 'jackOld']);
  box(2.5, 1.0, 1.45, 0xe8dcc8, 0, 3.95, 0, C.roseOld.body);
  const tart = tex(64, 64, c => { c.fillStyle = '#7a2a2a'; c.fillRect(0, 0, 64, 64); c.fillStyle = 'rgba(30,50,40,.6)'; for (let i = 0; i < 64; i += 16) { c.fillRect(i, 0, 6, 64); c.fillRect(0, i, 64, 6); } c.fillStyle = 'rgba(230,200,120,.6)'; for (let i = 8; i < 64; i += 16) { c.fillRect(i, 0, 1.5, 64); c.fillRect(0, i, 64, 1.5); } });
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.0, 1.7), new THREE.MeshLambertMaterial({ map: tart })); blanket.position.set(0, 3.35, 0); C.roseOld.body.add(blanket);
  const stick = new THREE.Group(); stick.position.set(0, -2.0, 0.15); stick.name = 'stick'; C.jackOld.armR.add(stick); box(0.12, 2.2, 0.12, 0x5a3a20, 0, -1.1, 0, stick); box(0.5, 0.14, 0.14, 0x5a3a20, 0.2, 0.05, 0, stick);
  const gemH = makeGem(0.75, 4); gemH.position.set(0, -2.25, 0.35); C.roseOld.armR.add(gemH);
  const gemF = makeGem(0.75, 14); s.add(gemF);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 30), basic(0xdfefff, { transparent: true, opacity: 0.8 })); ring.rotation.x = Math.PI / 2; s.add(ring);
  const DN = 40, drops = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), basic(0xeef6ff), DN); drops.frustumCulled = false; s.add(drops);
  // underwater: the gem sinking toward the bow of the wreck
  const UW = new THREE.Group(); UW.position.set(0, -400, 0); s.add(UW); const rust = M(0x3a2a24), rust2 = M(0x4a3428);
  const BOW = new THREE.Group(); BOW.position.set(2, -34, -6); BOW.rotation.set(0.08, -0.6, 0); UW.add(BOW);
  [[16, 0], [13, 3], [9.5, 6], [6, 9], [2.6, 12]].forEach(([w, z]) => box(w, 12, 3.2, rust, 0, 0, z, BOW)); box(16, 12, 20, rust2, 0, 0, -11, BOW); for (let z = -20; z < 12; z += 1.6) { box(0.12, 1.8, 0.12, 0x5a4a3a, 7.4 - Math.max(0, z) * 0.45, 6.9, z, BOW); box(0.12, 1.8, 0.12, 0x5a4a3a, -7.4 + Math.max(0, z) * 0.45, 6.9, z, BOW); }
  for (let i = 0; i < 26; i++) box(0.3, 0.8 + hash(i) * 1.6, 0.3, 0x7a4a2a, (hash(i + 1) - 0.5) * 14, -6.4 - hash(i + 2), -20 + hash(i + 3) * 30, BOW);
  const gemU = makeGem(1.1, 30); UW.add(gemU); const wl = new THREE.PointLight(0x4a7aff, 900, 70); wl.position.set(0, -22, 6); UW.add(wl);
  const mp = []; for (let i = 0; i < 500; i++) mp.push((hash(i) - 0.5) * 60, -50 + hash(i + 0.3) * 70, (hash(i + 0.6) - 0.5) * 60); const msnow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0x9fb8d0, size: 0.12, transparent: true, opacity: 0.7 })); msnow.geometry.setAttribute('position', new THREE.Float32BufferAttribute(mp, 3)); UW.add(msnow);
  const BN = 30, bub = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), basic(0xcfe6ff), BN); bub.frustumCulled = false; UW.add(bub);
  const dm = new THREE.Object3D();
  return {
    s, cam, C, gemH, gemF, gemU, fill, work, pool, stick, blanketK: 0,
    under(gy, T) { s.background.setHex(0x021626); s.fog.color.setHex(0x021626); s.fog.near = 2; s.fog.far = 55; gemU.position.set(0, gy, 0); gemU.rotation.set(T * 0.7, T * 1.1, 0.3); for (let i = 0; i < BN; i++) { const k = (T * 0.8 + hash(i)) % 1; dm.position.set((hash(i + 0.2) - 0.5) * 1.6, gy + k * 6, (hash(i + 0.4) - 0.5) * 1.6); dm.scale.setScalar(1 - k * 0.6); dm.updateMatrix(); bub.setMatrixAt(i, dm.matrix); } bub.instanceMatrix.needsUpdate = true; },
    splash(k) { const on = k > 0 && k < 1; ring.visible = drops.visible = on; if (!on) return; ring.position.set(0, -8.95, 19.6); ring.scale.setScalar(0.3 + k * 4); ring.material.opacity = 0.8 * (1 - k); for (let i = 0; i < DN; i++) { const a = hash(i) * 6.283, v = 0.5 + hash(i + 0.5); dm.position.set(Math.cos(a) * k * 2.2 * v, -9 + Math.sin(k * Math.PI) * 2.6 * v, 19.6 + Math.sin(a) * k * 2.2 * v); dm.scale.setScalar(1 - k); dm.updateMatrix(); drops.setMatrixAt(i, dm.matrix); } drops.instanceMatrix.needsUpdate = true; },
    pre(T) {
      s.background.setHex(NIGHT); s.fog.color.setHex(NIGHT); s.fog.near = 90; s.fog.far = 700;
      hideCast(C); this.blanketK = 0; stick.visible = true; gemH.visible = true; gemF.visible = false; ring.visible = drops.visible = false; fill.intensity = 0; work.forEach(p => p.intensity = 70); pool.intensity = 260;
    },
    post(T) { const b = this.blanketK; blanket.visible = b > 0.01; blanket.scale.setScalar(Math.max(0.01, b)); [gemH, gemF].forEach(g => g.rotation.y = T * 0.6); },
  };
});
const STN = (key, fn) => SHOT(key, 'a4_stern', c => { fn(c, c.S, c.S.C); c.S.post(c.T); });
const roseWalk = (S, T) => { const r2 = S.C.roseOld, z = RZ0(T), w = z < 15.3; show(r2, 0, 0, z, 0); if (w) r2.walk(T * 3.2, 0.28); r2.armR.rotation.set(-0.55, 0, 0.1); r2.look('neutral', T); return z; };
STN('h1', (c, S) => {
  const [i, k] = cuts(c.k, [0.5]), z = roseWalk(S, c.T); S.fill.position.set(4, 6, z + 4); S.fill.intensity = 10;
  if (i === 0) move(c.cam, [-26, 24, -34], [0, 3, 4], [-17, 13, -24], [0, 3, 6], k, 40);
  else move(c.cam, [3.6, 5.8, z + 9.5], [0, 3.9, z], [3.2, 5.6, z + 8.6], [0, 3.9, z], k, 32);
});
STN('h2', (c, S, C) => { const r2 = C.roseOld; show(r2, 0, 0.6 * ease(c.l / 0.6), 17.05, 0); r2.armL.rotation.set(-0.5, 0, 0); r2.armR.rotation.set(-0.5, 0, 0); r2.look('neutral', c.T); S.work.forEach(p => p.intensity = 18); move(c.cam, [-12, 9, 2], [0, 3.4, 17], [-17, 12, -6], [0, 3.4, 17], c.k, 38); });
STN('h3', (c, S, C) => {
  const r2 = C.roseOld, j = C.jackOld; show(r2, 0, 0.6, 17.05, 0); r2.armL.rotation.set(-0.5, 0, 0); r2.armR.rotation.set(-0.5, 0, 0); r2.look('neutral', c.T);
  const z = lerp(2.4, 10.5, c.k); show(j, -2.8, 0, z, 0.12); j.walk(c.T * 2.8, 0.3); j.armR.rotation.set(-0.3 + Math.sin(c.T * 2.8) * 0.1, 0, 0); j.look('neutral', c.T); S.work.forEach(p => p.intensity = 30);
  move(c.cam, [2.8, 1.0, 0.4], [-0.6, 2.4, 17], [2.6, 1.1, 1.2], [-0.6, 2.6, 17], c.k, 40);
});
STN('h4', (c, S, C) => {
  const [i, k] = cuts(c.k, [0.55]), r2 = C.roseOld, j = C.jackOld;
  show(j, -1.9, 0, 13.4, 0.2); const up = i === 0 ? ease(k / 0.4) : 1; j.armL.rotation.set(-1.25 * up, 0, 0.15); j.armR.rotation.set(-1.25 * up, 0, -0.1); S.blanketK = i === 0 ? ease((k - 0.35) / 0.4) : 1;
  S.fill.position.set(-3, 7, 18); S.fill.intensity = 14;
  if (i === 0) { show(r2, 0.6, 0, 16.3, 0); r2.head.rotation.y = -0.9; r2.look('neutral', c.T); j.look('smirk', c.T, c.talk); move(c.cam, [-6.2, 5.2, 18.2], [-1.9, 4.7, 13.6], [-5.9, 5.1, 17.8], [-1.9, 4.7, 13.6], k, 30); return; }
  show(r2, 0.6, 0, 16.3, -2.6); r2.look('joy', c.T); j.look('smirk', c.T, c.talk); S.fill.position.set(-0.5, 6, 11); S.fill.intensity = 7; S.pool.intensity = 120; move(c.cam, [-0.2, 5.0, 9.6], [0.26, 4.7, 15.84], [-0.15, 5.0, 10.2], [0.26, 4.7, 15.84], k, 30);
});
const pairAtRail = (S, T, hk = 1) => { const r2 = S.C.roseOld, j = S.C.jackOld; S.stick.visible = false; S.pool.intensity = 110; show(r2, 0.85, 0, 16.4, 0); show(j, -0.85, 0, 16.4, 0); S.blanketK = 1; S.gemH.visible = false; r2.armL.rotation.set(-1.15, 0, 0.3 * hk); j.armR.rotation.set(-1.15, 0, -0.3 * hk); r2.look('joy', T); j.look('joy', T); S.fill.position.set(0, 6, 23); S.fill.intensity = 10; };
STN('h5:0', (c, S) => { pairAtRail(S, c.T); S.gemF.visible = true; S.gemF.position.set(0, 3.0, 18.25); move(c.cam, [1.8, 5.0, 27], [0, 3.9, 17.2], [1.4, 4.9, 26], [0, 3.9, 17.2], c.k, 30); });
STN('h5:1', (c, S, C) => { pairAtRail(S, c.T); S.gemF.visible = true; S.gemF.position.set(0, 3.0, 18.25); C.roseOld.head.rotation.z = 0.18; C.jackOld.head.rotation.z = -0.18; move(c.cam, [0, 5.4, 25.5], [0, 4.6, 16.4], [0, 5.3, 24.6], [0, 4.6, 16.4], c.k, 30); });
STN('h5:2', (c, S, C) => {
  const [i, k] = cuts(c.k, [0.22, 0.45, 0.74]);
  if (i === 2) { const gy = lerp(-2, -25, ease(k)); S.under(gy, c.T); shot(c.cam, [3.4, -400 + gy + 2.5, 10], [0, -400 + gy - 2.8, 0], 40); return; }
  if (i === 3) { pairAtRail(S, c.T, 0); C.roseOld.armL.rotation.set(0, 0, 0); C.jackOld.armR.rotation.set(0, 0, 0); C.roseOld.head.rotation.z = 0.22; C.jackOld.head.rotation.z = -0.22; S.fill.intensity = 0; move(c.cam, [0.4, 5.6, 7.0], [0, 4.0, 30], [0.4, 5.8, 6.2], [0, 4.4, 30], k, 36); return; }
  pairAtRail(S, c.T, i === 0 ? 1 - ease(k / 0.5) : 0); S.gemF.visible = true;
  if (i === 0) { const t = Math.max(0, k - 0.45); S.gemF.position.set(0, 3.0 - 30 * t * t, 18.25); move(c.cam, [2.4, 4.6, 25.4], [0, 3.9, 17.6], [2.1, 4.5, 24.8], [0, 3.8, 17.6], k, 32); return; }
  const t = clamp(k / 0.75), y = 3.0 - 0.3 - 11.7 * t * t; S.gemF.visible = t < 1; S.gemF.position.set(0, y, 18.25 + t * 1.3); S.splash((k - 0.75) / 0.25); move(c.cam, [7, 0.5, 29], [0, -5.0, 19.4], [6.6, 0, 28.4], [0, -6.0, 19.4], k, 40);
});

// =====================================================================================
// THE MUSEUM (h6)
// =====================================================================================
SET('a4_museum', () => {
  const { s, cam } = mkScene(0x0a0a0c, [30, 120], 0xffffff, 0.12, [0x8a8a9a, 0x1a1410, 0.35], [0, 30, 20]);
  s.userData.bloom = 0.42; s.userData.sun.castShadow = false;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshPhongMaterial({ color: 0x2a1f18, shininess: 100, specular: 0x6a5a4a })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  box(40, 14, 0.4, 0x2a2e36, 0, 7, -8, s); box(0.4, 14, 30, 0x2a2e36, -16, 7, 4, s); box(0.4, 14, 30, 0x2a2e36, 16, 7, 4, s);
  box(8, 2.2, 2.4, 0x17181c, 0, 1.1, 0, s); box(8.1, 0.12, 2.5, 0xb8892f, 0, 2.24, 0, s); box(8.1, 0.12, 2.5, 0xb8892f, 0, 0.06, 0, s);
  const door = makeDoor(); door.rotation.x = Math.PI / 2 - 0.12; door.position.set(0, 4.0, -0.25); s.add(door); for (const sx of [-1, 1]) box(0.3, 1.6, 0.3, 0xb8892f, sx * 2.6, 2.9, -0.6, s);
  const plT = tex(512, 192, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#d8b45a'); g.addColorStop(0.5, '#b8902e'); g.addColorStop(1, '#8a6a22'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = '#5a4210'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#3a2a08'; c.textAlign = 'center'; c.font = '900 46px Inter'; c.fillText('THE DOOR', w / 2, 66); c.font = '700 20px Inter'; c.fillText('CARVED PANEL  ·  R.M.S. TITANIC  ·  APRIL 1912', w / 2, 100); c.font = '900 52px Inter'; c.fillText('CAPACITY: 2', w / 2, 162); });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshPhongMaterial({ map: plT, shininess: 80, specular: 0xfff2c8 })); plaque.position.set(0, 1.15, 1.215); s.add(plaque);
  const brass = new THREE.MeshPhongMaterial({ color: 0xc9a24a, shininess: 100 });
  for (const x of [-5, 5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 10), brass); p.position.set(x, 1.3, 3.8); s.add(p); const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), brass); b.position.set(x, 2.65, 3.8); s.add(b); const d = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 14), brass); d.position.set(x, 0.05, 3.8); s.add(d); }
  const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-5, 2.5, 3.8], [-2.5, 1.9, 3.8], [0, 1.75, 3.8], [2.5, 1.9, 3.8], [5, 2.5, 3.8]].map(p => new THREE.Vector3(...p))), 30, 0.09, 6), M(0x8a1a22)); s.add(rope);
  const spot = new THREE.SpotLight(0xfff2dc, 0, 30, 0.33, 0.5); spot.position.set(0, 13, 6); spot.target.position.set(0, 3.2, 0); spot.castShadow = true; s.add(spot, spot.target);
  const pspot = new THREE.SpotLight(0xfff2dc, 0, 10, 0.4, 0.5); pspot.position.set(0, 6, 5); pspot.target.position.set(0, 1.15, 1.2); s.add(pspot, pspot.target);
  const wallL = new THREE.PointLight(0xffe2c0, 0, 30); wallL.position.set(0, 10, 10); s.add(wallL);
  const sep = tex(96, 72, (c, w, h) => { c.fillStyle = '#c9b08a'; c.fillRect(0, 0, w, h); c.fillStyle = '#5a4a3a'; c.fillRect(8, 40, 80, 14); c.fillRect(30, 26, 40, 14); for (let i = 0; i < 4; i++) c.fillRect(34 + i * 9, 12, 5, 14); });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { box(0.15, 3.0, 4.0, 0x3a2a1a, sx * 15.75, 6.5, -4 + i * 6, s); const p = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), new THREE.MeshLambertMaterial({ map: sep })); p.rotation.y = -sx * Math.PI / 2; p.position.set(sx * 15.6, 6.5, -4 + i * 6); s.add(p); }
  const C = castOf(s, ['boy', 'gentB']);
  return { s, cam, C, lit: 0, pre(T) { hideCast(C); this.lit = 0; }, post(T) { const l = this.lit; spot.intensity = 420 * l; pspot.intensity = 30 * l; wallL.intensity = 30 * l; } };
});
const MUS = (key, fn) => SHOT(key, 'a4_museum', c => { const S = c.S, b = S.C.boy, g = S.C.gentB; show(b, -3.4, 0, 5.4, Math.PI + 0.25); b.g.scale.setScalar(0.62); b.head.rotation.x = -0.45; b.look('surprised', c.T); show(g, -5.2, 0, 7.6, Math.PI - 0.1); g.armR.rotation.set(-0.3, 0, 0.35); g.look('neutral', c.T); fn(c, S); S.post(c.T); });
MUS('h6:0', (c, S) => { S.lit = c.l < 0.3 ? 0 : 1 - (c.l < 0.4 ? hash(Math.floor(c.l * 60)) * 0.6 : 0); move(c.cam, [0, 3.6, 13.5], [0, 3.6, 0], [0, 3.6, 12.6], [0, 3.6, 0], c.k, 34); });
MUS('h6:1', (c, S) => { S.lit = 1; move(c.cam, [9.5, 6.5, 14], [0, 3, 1], [7.5, 5.6, 12], [0, 3, 1], c.k, 36); });
MUS('h6:2', (c, S) => { S.lit = 1; move(c.cam, [0, 2.6, 9.5], [0, 1.6, 1.2], [0, 1.25, 3.3], [0, 1.15, 1.2], clamp(c.l / 2.4), 34); const e = LINE.h6.sents[2].end; c.fade(clamp((c.T - e - 1.0) / 0.25)); });

// =====================================================================================
// OUTRO
// =====================================================================================
SET('a4_outro', () => {
  const { s, cam } = mkScene(0x07090e, [20, 80], 0xffffff, 0.2, [0x8899bb, 0x1a1512, 0.5]);
  s.userData.bloom = 0.45;
  const t = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 1, 48), new THREE.MeshPhongMaterial({ color: 0x14161c, shininess: 90, specular: 0x446688 })); t.position.y = -0.5; t.receiveShadow = true; s.add(t);
  const tt = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.6, 0.6, 32), new THREE.MeshPhongMaterial({ color: 0x22252c, shininess: 80 })); tt.position.y = 0.3; s.add(tt);
  const turn = new THREE.Group(); turn.position.y = 0.6; s.add(turn); const door = makeDoor(); door.rotation.x = Math.PI / 2; door.position.set(0, 1.75, 0); turn.add(door); door.scale.setScalar(0.8);
  const sp = new THREE.SpotLight(0xfff2e0, 600, 60, 0.4, 0.7); sp.position.set(2, 16, 6); sp.castShadow = true; s.add(sp, sp.target);
  const rl = new THREE.PointLight(0xff8fa8, 45, 30); rl.position.set(-9, 4, -4); s.add(rl); const bl = new THREE.PointLight(0x8fd0ff, 45, 30); bl.position.set(9, 4, -4); s.add(bl);
  return { s, cam, pre(T) { turn.rotation.y = T * 0.35; } };
});
const orbit = (c, a0, a1, r, y, ly = 2.2, fov = 35) => { const a = lerp(a0, a1, c.k); shot(c.cam, [Math.sin(a) * r, y, Math.cos(a) * r], [0, ly, 0], fov); };
SHOT('o1', 'a4_outro', c => {
  const T = c.T, L = LINE.o1, t1 = L.sents[1].start - 0.15, t2 = L.sents[2].start - 0.15; orbit(c, -0.5, 0.5, 12, 3.6, 2.2, 34);
  if (T < t1) return;
  if (T < t2) { const k = T - t1; c.dom(D(0, 215, 1920, 0, `text-align:center;font-size:104px;line-height:1.12;opacity:${clamp(k / 0.25)};${STR}`, `<span style="letter-spacing:${lerp(14, 4, ease(k / 0.5))}px">WOULD JACK AND ROSE</span><br><span style="opacity:${clamp((k - 0.8) / 0.25)}">HAVE <span style="color:#ffd24a">LASTED?</span></span>`)); return; }
  const k = T - t2, g = ease(k / 1.6), a = Math.round(57 + 5 * Math.sin(k * 2.3) * (1 - g * 0.3)), n1 = Math.round(18240 * g * (a / 50)), n2 = Math.round(18240 * g * ((100 - a) / 50));
  const panel = (x, col, word, sub, pct, n, dir) => D(x, 250, 560, 420, `opacity:${clamp(k / 0.3)};transform:translateX(${(1 - ease(k / 0.45)) * dir * 80}px);text-align:center`,
    `<div style="font-size:${word.length > 7 ? 112 : 132}px;line-height:1;color:${col};${STR}">${word}</div><div style="font-size:34px;font-weight:700;color:#d6dbe4;margin-top:14px">${sub}</div><div style="margin:26px auto 0;width:440px;height:30px;border-radius:15px;background:rgba(255,255,255,.14);overflow:hidden"><div style="width:${pct * g}%;height:100%;background:${col}"></div></div><div style="font-size:44px;margin-top:16px">${Math.round(pct * g)}% <span style="font-size:28px;color:#aab2bf;font-weight:700">· ${n.toLocaleString('en-US')} votes</span></div>`);
  c.dom(D(0, 130, 1920, 0, 'text-align:center;font-size:38px;letter-spacing:10px;color:#fff;font-weight:700', 'WOULD JACK AND ROSE HAVE LASTED?') + panel(110, '#ff8fa8', 'FOREVER', 'Married. Old. Still jumping.', a, n1, -1) + panel(1250, '#8fd0ff', 'FOUR DAYS', 'Perfect. Frozen. Over.', 100 - a, n2, 1)
    + D(0, 720, 1920, 0, `text-align:center;opacity:${clamp((k - 0.7) / 0.3)}`, `<span style="display:inline-block;font-size:40px;letter-spacing:5px;background:#ffd24a;color:#14161c;padding:12px 34px;border-radius:40px;transform:translateY(${Math.sin(k * 6) * 5}px)">▼ COMMENT “FOREVER” OR “FOUR DAYS” ▼</span>`));
});
SHOT('o2', 'a4_outro', c => {
  orbit(c, 0.5, 1.5, 12.5, 3.8, 2.2, 34); const words = ['WHAT', 'SHOULD', 'WE'], t = c.l;
  const w1 = words.map((w, i) => `<span style="display:inline-block;margin:0 14px;opacity:${clamp((t - 0.2 - i * 0.16) / 0.15)};transform:translateY(${(1 - ease((t - 0.2 - i * 0.16) / 0.25)) * 40}px)">${w}</span>`).join(''), k2 = t - 0.9;
  c.dom(D(0, 240, 1920, 0, `text-align:center;font-size:92px;${STR}`, w1) + D(0, 360, 1920, 0, `text-align:center;font-size:168px;line-height:1.1;color:#ffd24a;opacity:${clamp(k2 / 0.2)};transform:scale(${1.5 - 0.5 * ease(k2 / 0.3)});${STR}`, 'REIMAGINE NEXT?'));
});
const CARDS = [['A', 'THE MATRIX', 'Neo takes the blue pill', '#7dffb0'], ['B', 'THE DARK KNIGHT', 'the Joker tells the truth', '#c79bff'], ['C', 'JURASSIC PARK', 'the fences hold', '#ffb84a']];
const cardDom = (i, k) => { const [a, t, s2, col] = CARDS[i]; return D(110, 600, 1500, 0, `opacity:${clamp(k / 0.2)};transform:translateX(${(1 - ease(k / 0.35)) * -70}px)`, `<div style="display:flex;align-items:center"><div style="width:150px;height:150px;border-radius:26px;background:${col};color:#14161c;font-size:120px;line-height:150px;text-align:center;flex:none">${a}</div><div style="margin-left:34px"><div style="font-size:104px;line-height:1;${STR}">${t}</div><div style="font-size:46px;font-weight:700;color:${col};margin-top:12px;${STR2}">…where ${s2}</div></div></div>`) + D(1500, 130, 320, 0, 'text-align:right;font-size:30px;letter-spacing:8px;color:#fff;font-weight:700;opacity:.85', `VOTE ${a} · ${i + 1}/3`); };
SET('a4_nextA', () => {   // green falling code, a red pill and a blue pill
  const { s, cam } = mkScene(0x020604, [30, 110], 0x9fffc0, 0.5, [0x7dffb0, 0x020604, 0.5]);
  s.userData.bloom = 0.8;
  const N = 1400, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.5, 0.05), basic(0xffffff), N); im.frustumCulled = false; s.add(im); const dm = new THREE.Object3D(), col = new THREE.Color();
  const hand = (x, pc) => { const g = new THREE.Group(); g.position.set(x, 0, 0); s.add(g); box(3.2, 0.7, 3.4, 0xe2b089, 0, 0, 0, g); for (let i = 0; i < 4; i++) box(0.7, 0.6, 1.5, 0xe2b089, -1.2 + i * 0.8, 0.05, -2.3, g); box(0.8, 0.6, 1.6, 0xe2b089, x > 0 ? -2 : 2, 0, -0.4, g); const p = new THREE.Group(); p.position.y = 1.0; g.add(p); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 4, 12), new THREE.MeshPhongMaterial({ color: pc, emissive: pc, emissiveIntensity: 0.35, shininess: 120 })); m.rotation.z = Math.PI / 2; p.add(m); const l = new THREE.PointLight(pc, 30, 12); l.position.y = 1.2; p.add(l); return { g, p, l }; };
  const red = hand(-3.4, 0xff3040), blue = hand(3.4, 0x2f8bff);
  const key = new THREE.PointLight(0xfff0e0, 50, 30); key.position.set(0, 6, 8); s.add(key);
  return { s, cam, red, blue, pre(T) { for (let i = 0; i < N; i++) { const cx = Math.floor(hash(i) * 70) - 35, sp = 5 + hash(cx + 0.5) * 9, y = 22 - ((T * sp + hash(i + 0.3) * 30) % 30), z = -6 - hash(cx + 0.9) * 26; dm.position.set(cx * 0.8, y, z); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); im.setColorAt(i, col.setHSL(0.38, 1, hash(i + Math.floor(T * 8)) > 0.92 ? 0.85 : 0.22 + hash(i + 2) * 0.3)); } im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; } };
});
SET('a4_nextB', () => {   // a bare interrogation room: one lamp, one table, one playing card; rain on the window
  const { s, cam } = mkScene(0x06070c, [30, 120], 0x8fa4d0, 0.25, [0x4a5578, 0x05060a, 0.45]);
  s.userData.bloom = 0.3;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), M(0x23262d)); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  box(60, 24, 1, 0x2d3139, 0, 12, -14, s); box(1, 24, 60, 0x2d3139, -22, 12, 0, s);
  const wt = tex(256, 128, c => { c.fillStyle = '#0c1226'; c.fillRect(0, 0, 256, 128); for (let i = 0; i < 20; i++) { const h = 30 + hash(i) * 80, x = i * 13; c.fillStyle = '#141c36'; c.fillRect(x, 128 - h, 12, h); c.fillStyle = '#ffd98a'; for (let y = 128 - h + 5; y < 124; y += 10) if (hash(i * 5 + y) > 0.6) c.fillRect(x + 3, y, 5, 4); } });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), new THREE.MeshBasicMaterial({ map: wt })); win.position.set(4, 9.5, -13.4); s.add(win); box(22.8, 0.5, 0.6, 0x15171c, 4, 14.2, -13.3, s); box(22.8, 0.5, 0.6, 0x15171c, 4, 4.8, -13.3, s); for (const x of [-7.2, 4, 15.2]) box(0.5, 9.6, 0.6, 0x15171c, x, 9.5, -13.3, s);
  const RN = 500, rp = new Float32Array(RN * 6), rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x9fb8e0, transparent: true, opacity: 0.6 })); rain.geometry.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rain.frustumCulled = false; s.add(rain);
  box(9, 0.4, 5, 0x3a3e46, 0, 3.0, 0, s); for (const [x, z] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) box(0.4, 3, 0.4, 0x4a5058, x, 1.5, z, s);
  for (const z of [-4.6, 4.6]) { box(2.4, 0.4, 2.2, 0x3a3e46, 0, 1.7, z, s); box(2.4, 3, 0.4, 0x3a3e46, 0, 3.2, z + (z < 0 ? -1 : 1), s); }
  const lamp = new THREE.Group(); lamp.position.set(0, 14, 0); s.add(lamp); box(0.12, 5, 0.12, 0x15171c, 0, -2.5, 0, lamp); const shade = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.4, 14, 1, true), new THREE.MeshLambertMaterial({ color: 0x2f5a44, side: THREE.DoubleSide })); shade.position.y = -5.4; lamp.add(shade); box(0.4, 0.4, 0.4, basic(0xd9c890), 0, -5.6, 0, lamp);
  const sl = new THREE.SpotLight(0xfff0c8, 230, 40, 0.6, 0.6); sl.position.set(0, -5.6, 0); sl.castShadow = true; lamp.add(sl, sl.target); sl.target.position.set(0, -14, 0);
  const cardT = tex(128, 180, c => { c.fillStyle = '#f6f2e6'; c.fillRect(0, 0, 128, 180); c.strokeStyle = '#6a3a9a'; c.lineWidth = 5; c.strokeRect(8, 8, 112, 164); c.fillStyle = '#6a3a9a'; c.font = '900 34px Inter'; c.fillText('?', 16, 44); c.save(); c.translate(64, 96); c.rotate(Math.PI / 4); c.fillStyle = '#3f9a5a'; c.fillRect(-24, -24, 48, 48); c.fillStyle = '#f6f2e6'; c.fillRect(-10, -10, 20, 20); c.restore(); c.fillStyle = '#6a3a9a'; c.fillText('?', 94, 164); });
  const card = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 2.1), [M(0xf6f2e6), M(0xf6f2e6), new THREE.MeshLambertMaterial({ map: cardT }), M(0x3a2a5a), M(0xf6f2e6), M(0xf6f2e6)]); card.castShadow = true; s.add(card);
  return { s, cam, card, pre(T) { lamp.rotation.z = Math.sin(T * 1.3) * 0.12; for (let i = 0; i < RN; i++) { const x = 4 + (hash(i) - 0.5) * 22, y = 14 - ((T * 16 + hash(i + 0.4) * 9.4) % 9.4); rp.set([x, y, -13.2, x - 0.1, y - 0.7, -13.2], i * 6); } rain.geometry.attributes.position.needsUpdate = true; } };
});
SET('a4_nextC', () => {   // a jungle park gate; tall electric fences; something big behind them, and the fences hold
  const { s, cam } = mkScene(0x1e2e2a, [30, 170], 0xd8f0e0, 1.0, [0xa8d0b8, 0x101a14, 0.85], [-30, 40, 30], 60);
  s.userData.bloom = 0.45;
  ground(s, 300, '#2c4a30', '#325236');
  const r = rng(17); for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 220, z = -6 - r() * 120; if (Math.abs(x) < 9 && z > -40) continue; if (x > 8 && x < 34 && z > -30) continue; const h = 10 + r() * 16, g = new THREE.Group(); g.position.set(x, 0, z); s.add(g); box(1.2, h, 1.2, 0x4a3524, 0, h / 2, 0, g); for (let k = 0; k < 3; k++) box(6 + r() * 4, 1.6, 6 + r() * 4, [0x2f6a3a, 0x3a7a44, 0x28583a][k], (r() - 0.5) * 2, h - k * 1.8, (r() - 0.5) * 2, g).rotation.y = r(); }
  const stoneM = M(0x5a4a3a); box(3.4, 18, 3.4, stoneM, -8, 9, 0, s); box(3.4, 18, 3.4, stoneM, 8, 9, 0, s); box(21, 2.4, 2.6, stoneM, 0, 18.6, 0, s);
  for (const sx of [-1, 1]) { box(7.6, 15, 0.7, 0x6a5232, sx * 3.85, 7.6, 0, s); for (const y of [3, 7.6, 12.2]) box(7.4, 0.5, 0.85, 0x4a3a24, sx * 3.85, y, 0, s); box(1.6, 1.0, 1.6, 0x3a3028, sx * 8, 20.3, 0, s); box(1.0, 1.6, 1.0, basic(0xffa040), sx * 8, 21.6, 0, s); const p = new THREE.PointLight(0xffa040, 120, 40); p.position.set(sx * 8, 22, 1); s.add(p); }
  const boltT = tex(64, 64, c => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#14161c'; c.beginPath(); c.moveTo(36, 6); c.lineTo(16, 36); c.lineTo(30, 36); c.lineTo(24, 58); c.lineTo(48, 26); c.lineTo(34, 26); c.closePath(); c.fill(); });
  const cable = M(0x9aa2ac);
  for (const sx of [-1, 1]) { for (let x = 10; x <= 70; x += 6) { box(0.8, 20, 0.8, 0x6a6e74, sx * x, 10, 0, s); if ((x / 6) % 2 === 1) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshLambertMaterial({ map: boltT })); sg.position.set(sx * (x + 3), 6, 0.45); s.add(sg); } } for (let k = 0; k < 7; k++) box(60, 0.12, 0.12, cable, sx * 40, 2.5 + k * 2.6, 0, s).castShadow = false; }
  const DI = new THREE.Group(); DI.position.set(30, 0, -16); DI.rotation.y = -0.75; DI.scale.setScalar(1.25); s.add(DI); const dk = M(0x5a6a52); const rim = new THREE.PointLight(0xc8ffd8, 260, 50); rim.position.set(24, 26, -4); s.add(rim);
  box(6, 7, 13, dk, 0, 11, 0, DI); [[4.6, 5, 4, 8.6, -9], [3.2, 3.6, 4, 7.4, -12.8], [2, 2.4, 4, 6.4, -16.4], [1.2, 1.4, 4, 5.4, -19.8]].forEach(([w, h, d, y, z]) => box(w, h, d, dk, 0, y, z, DI));
  for (const sx of [-1, 1]) { box(2.6, 6, 3.4, dk, sx * 2.6, 7, -1, DI); box(1.8, 6, 1.8, dk, sx * 2.6, 3, 0.2, DI); box(2.4, 0.8, 3.2, dk, sx * 2.6, 0.4, 1.0, DI); box(0.6, 2, 0.6, dk, sx * 2.2, 11.5, 6.2, DI); }
  const neck = new THREE.Group(); neck.position.set(0, 14, 5.5); DI.add(neck); box(4, 5, 4, dk, 0, 1.4, 1.2, neck); const head = new THREE.Group(); head.position.set(0, 3.6, 3.6); neck.add(head); box(4.2, 3.6, 6.4, dk, 0, 0, 2.2, head); const jaw = new THREE.Group(); jaw.position.set(0, -1.6, 0); head.add(jaw); box(3.8, 1.2, 5.6, dk, 0, -0.5, 2.4, jaw); for (const sx of [-1, 1]) box(0.5, 0.4, 0.4, basic(0xffd24a), sx * 2.1, 0.7, 3.6, head); for (let i = 0; i < 8; i++) box(0.25, 0.5, 0.25, 0xe8e2d0, -1.5 + i * 0.43, -1.6, 5.1, head);
  const sparks = []; for (let i = 0; i < 10; i++) sparks.push(box(0.2, 0.2, 0.2, basic(0xcff0ff), 0, 0, 0, s)); const spl = new THREE.PointLight(0x9fd8ff, 0, 24); s.add(spl);
  return { s, cam, pre(T) {
    const ph = (T * 0.45) % 1, push = ph < 0.55 ? ease(ph / 0.55) : 1 - ease((ph - 0.55) / 0.2), hit = ph > 0.5 && ph < 0.62;
    neck.rotation.x = 0.15 + push * 0.32; neck.rotation.y = Math.sin(T * 0.8) * 0.15; jaw.rotation.x = hit ? 0.5 : 0.12 + Math.sin(T * 2) * 0.05; DI.position.z = -16 + push * 1.2;
    spl.intensity = hit ? 260 * hash(Math.floor(T * 30)) : 0; spl.position.set(24, 15, 0.6);
    sparks.forEach((m, i) => { m.visible = hit; m.position.set(24 + (hash(i + Math.floor(T * 30)) - 0.5) * 3, 13 + hash(i * 3 + Math.floor(T * 30)) * 5, 0.4); });
  } };
});
SHOT('o3:0', 'a4_nextA', c => { const S = c.S, k = ease((c.k - 0.3) / 0.6); S.blue.p.position.y = 1.0 + 1.6 * k + Math.sin(c.T * 3) * 0.08; S.blue.p.rotation.y = c.T * 1.5 * k; S.blue.l.intensity = 30 + 160 * k; S.red.l.intensity = 30 * (1 - 0.7 * k); S.red.p.position.y = 1.0 + Math.sin(c.T * 3 + 1) * 0.06; c.dom(cardDom(0, c.l)); move(c.cam, [-1, 7, 16], [0, 2.4, 0], [0.8, 6, 13], [0.6, 2.8, 0], c.k, 36); });
SHOT('o3:1', 'a4_nextB', c => { const S = c.S, k = ease((c.k - 0.15) / 0.5); S.card.position.set(0, 3.25 + Math.sin(k * Math.PI) * 1.6, 0); S.card.rotation.set(0, 0.5 + c.T * 0.25, Math.PI * (1 - k)); S.card.scale.setScalar(1.7); c.dom(cardDom(1, c.l)); move(c.cam, [-6.5, 8.5, 11.5], [0.8, 1.6, -0.5], [-4.5, 7.6, 9], [0.8, 1.4, -0.5], c.k, 36); });
SHOT('o3:2', 'a4_nextC', c => { c.dom(cardDom(2, c.l)); move(c.cam, [-16, 8, 40], [14, 12, -8], [-12, 7.4, 34], [15, 12.5, -8], c.k, 40); });
SHOT('o4:0', 'a4_outro', c => {
  orbit(c, 1.5, 1.9, 13, 4.6, 2.2, 34); const t = c.l;
  const cards = CARDS.map(([a, tt, s2, col], i) => { const k = t - 0.08 - i * 0.12; return D(150 + i * 550, 300, 500, 300, `box-sizing:border-box;border-radius:26px;background:rgba(12,14,20,.86);border:5px solid ${col};text-align:center;padding-top:26px;opacity:${clamp(k / 0.15)};transform:translateY(${(1 - ease(k / 0.3)) * 60}px)`, `<div style="display:inline-block;width:92px;height:92px;line-height:92px;border-radius:18px;background:${col};color:#14161c;font-size:72px">${a}</div><div style="font-size:${tt.length > 11 ? 44 : 56}px;margin-top:14px;line-height:1.2">${tt}</div><div style="font-size:28px;font-weight:700;color:${col};margin-top:8px">${s2}</div>`); }).join('');
  const ks = t - 0.55; c.dom(D(0, 150, 1920, 0, 'text-align:center;font-size:40px;letter-spacing:12px;color:#fff;font-weight:700', 'WHAT DO WE REIMAGINE NEXT?') + cards + D(0, 655, 1920, 0, `text-align:center;opacity:${clamp(ks / 0.1)}`, `<span style="display:inline-block;font-size:76px;letter-spacing:5px;background:#ffd24a;color:#14161c;padding:12px 44px;border-radius:14px;transform:scale(${2 - ease(ks / 0.2)}) rotate(-3deg)">TOP COMMENT GETS MADE</span>`));
});
SHOT('o4:1', 'a4_outro', c => {
  const t = c.l, e = LINE.o4.sents[1].end - (LINE.o4.sents[1].start - 0.15), end = t > e + 0.35; orbit(c, 1.9, 2.9, lerp(13, 10, c.k), 3.6, 2.2, 34);
  if (!end) {
    const ar = Math.sin(t * 5) * 14, k = t;
    c.dom(D(0, 205, 1920, 0, `text-align:center;font-size:40px;letter-spacing:12px;color:#ffd24a;font-weight:700;opacity:${clamp(k / 0.2)}`, 'ONE MORE THING')
      + D(0, 275, 1920, 0, `text-align:center;font-size:106px;line-height:1.1;opacity:${clamp(k / 0.25)};transform:scale(${1.1 - 0.1 * ease(k / 0.5)});${STR}`, `SEND THIS TO THE FRIEND<br>WHO STILL SAYS <span style="color:#ffd24a">THERE WAS ROOM</span>`)
      + D(0, 600, 1920, 0, `text-align:center;opacity:${clamp((k - 0.7) / 0.3)}`, `<span style="display:inline-flex;align-items:center;font-size:54px;letter-spacing:6px;background:#fff;color:#14161c;padding:16px 46px 16px 40px;border-radius:60px"><svg width="64" height="64" viewBox="0 0 64 64" style="margin-right:22px;transform:translateX(${ar}px)"><path d="M6 36 L40 36 L40 52 L60 30 L40 8 L40 24 L6 24 Z" fill="#14161c"/></svg>SHARE</span>`));
  } else {
    const k = t - e - 0.35;
    c.dom(D(0, 0, 1920, 1080, `background:rgba(4,5,8,${0.74 * clamp(k / 0.4)})`) + D(0, 245, 1920, 0, `text-align:center;opacity:${clamp(k / 0.4)}`, `<div style="font-size:32px;letter-spacing:14px;color:#c9ced8;font-weight:700">REIMAGINED IN BLOCKS</div><div style="font-size:180px;letter-spacing:${lerp(32, 18, ease(k / 1.2))}px;line-height:1.1;margin-left:18px">TITANIC</div><div style="display:inline-block;margin-top:8px;font-size:54px;letter-spacing:6px;color:#14161c;background:#ffd24a;padding:10px 36px;border-radius:10px">THE DOOR FITS TWO</div><div style="margin-top:44px;font-size:36px;font-weight:700;color:#d6dbe4;letter-spacing:3px;opacity:${clamp((k - 0.6) / 0.4)}">Comment <b style="color:#ff8fa8">FOREVER</b> or <b style="color:#8fd0ff">FOUR DAYS</b>  ·  Tell us what to reimagine next</div>`));
  }
});
