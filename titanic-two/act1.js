// Prologue (p1-p5) + Chapter 1: The Ship of Dreams (a1-a8)
import { THREE, SET, SHOT, LINE, mkScene, move, shot, shake, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, label, makeChar, ground, makeDoor, makeVest } from './engine.js';

// extras added to the shared 'sea' set (hidden every frame by a wrapped pre)
function EX(S) {
  if (S._a1) return S._a1;
  const s = S.s, x = {};
  x.fill = new THREE.PointLight(0xa8c8ff, 0, 60); s.add(x.fill);
  x.hl = box(3.1, 0.06, 3.3, new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.55 }), 0, 0, 0, s); x.hl.castShadow = false;
  x.vest = makeVest(); s.add(x.vest);
  // Southampton dock along the port side
  const d = x.dock = new THREE.Group(); s.add(d);
  box(70, 4, 330, 0x8a8478, -52, 0.2, 0, d); for (let i = 0; i < 6; i++) { box(34, 22, 40, [0x9a5a44, 0x8a6a54, 0xa86a4a][i % 3], -66, 13, -130 + i * 52, d); box(36, 3, 42, 0x4a4038, -66, 25.5, -130 + i * 52, d); }
  for (const z of [-40, 60]) { box(2, 44, 2, 0x4a4a52, -30, 24, z, d); const j = box(26, 1.6, 1.6, 0x4a4a52, -20, 44, z, d); j.rotation.z = 0.25; }
  for (const z of [20, -20]) { const g = box(22, 0.6, 3.4, 0xd9d4c4, -22, 9.5, z, d); g.rotation.z = 0.36; }
  const CN = 500, cb = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 3.4, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), CN), chd = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), M(0xe6c2a2), CN); cb.frustumCulled = chd.frustumCulled = false; d.add(cb, chd);
  const col = new THREE.Color(), cc = [0x3a3a44, 0x5a4a3a, 0x6a2a2a, 0x2a4a6a, 0xd9d4c4, 0x4a5a3a, 0x8a7a5a]; for (let i = 0; i < CN; i++) cb.setColorAt(i, col.set(cc[i % 7]));
  x.crowd = (T, clear = false) => { const dm = new THREE.Object3D(); for (let i = 0; i < CN; i++) { const px = -20 - hash(i) * 24, pz = (hash(i + 0.4) - 0.5) * 260, j = Math.abs(Math.sin(T * 4 + i)) * 0.5 * (i % 3 === 0 ? 1 : 0.2); dm.position.set(px, (clear && Math.abs(pz - 11) < 16 ? -40 : 3.9) + j, pz); dm.updateMatrix(); cb.setMatrixAt(i, dm.matrix); dm.position.y = (clear && Math.abs(pz - 11) < 16 ? -40 : 6.2) + j; dm.updateMatrix(); chd.setMatrixAt(i, dm.matrix); } cb.instanceMatrix.needsUpdate = chd.instanceMatrix.needsUpdate = true; };
  const car = x.car = new THREE.Group(); d.add(car); box(3.4, 1.6, 7, 0x6a1a1a, 0, 1.4, 0, car); box(3.2, 2.2, 3.6, 0x1c1c22, 0, 3.2, -0.8, car); box(3.0, 0.3, 4, 0x1c1c22, 0, 4.4, -0.8, car); for (const [wx, wz] of [[-1.7, 2.4], [1.7, 2.4], [-1.7, -2.4], [1.7, -2.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.4, 12), M(0x1a1a1a)); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.9, wz); car.add(w); } car.position.set(-34, 2.2, 6);
  x.dol = [0, 1, 2].map(() => { const g = new THREE.Group(); s.add(g); box(0.9, 0.9, 3.4, 0x7a8a9a, 0, 0, 0, g); box(0.2, 0.8, 0.9, 0x6a7a8a, 0, 0.7, -0.2, g); box(1.6, 0.2, 0.8, 0x6a7a8a, 0, 0, -1.9, g); return g; });
  const pre0 = S.pre.bind(S); S.pre = T => { pre0(T); x.fill.intensity = 0; x.hl.visible = false; x.vest.visible = false; d.visible = false; x.dol.forEach(g => g.visible = false); };
  S.pre(0); return S._a1 = x;
}
const SEA = (key, fn) => SHOT(key, 'sea', c => { fn(c, c.S, EX(c.S)); c.S.post(c.T); });
// the famous image: Rose on the panel, Jack in the water
function doorScene(S, X, T, jackOn = false) {
  S.mode('night'); S.ship.visible = false; S.debris = 0.6; S.door.visible = true; S.door.position.set(0, 0.25 + Math.sin(T * 1.3) * 0.06, 0); X.fill.intensity = 260; X.fill.position.set(4, 9, 9);
  const rose = S.C('rose'), jack = S.C('jack'); S.put(rose, 2.9, 2.0 + Math.sin(T * 1.3) * 0.06, 0.2, 0); rose.g.rotation.z = Math.PI / 2; S.vest(rose); rose.look('sad', T); rose.head.rotation.y = 0.3;
  if (jackOn) { S.put(jack, 2.9, 2.0, 1.6, 0); jack.g.rotation.z = Math.PI / 2; } else { S.put(jack, -1.4, -3.3 + Math.sin(T * 1.1) * 0.05, 3.0, Math.PI); jack.armL.rotation.x = jack.armR.rotation.x = -1.5; }
  jack.look('sad', T); return { rose, jack };
}
SEA('p1', (c, S, X) => { doorScene(S, X, c.T); move(c.cam, [10, 9, 34], [0, 1.5, 0], [5, 4.5, 17], [0, 1.6, 0.5], c.k, 34); });
SEA('p2', (c, S, X) => { doorScene(S, X, c.T); X.hl.visible = Math.sin(c.T * 10) > -0.3; X.hl.position.set(1.6, 0.5, -0.1); X.hl.scale.set(3.1, 0.06, 3.3); shot(c.cam, [0.01, 21 - c.k * 3, 3], [0, 0, 0.6], 34); });

// ---------------- the tests: pool, lab tank, TV ----------------
SET('a1_pool', () => {
  const { s, cam } = mkScene(0xdfe9f2, [60, 200], 0xffffff, 2.0, [0xffffff, 0xb8c8d8, 1.6], [10, 30, 20]);
  s.userData.bloom = 0.3; box(80, 1, 60, 0xe6edf2, 0, -0.5, 0, s); const water = new THREE.Mesh(new THREE.PlaneGeometry(36, 22), new THREE.MeshPhongMaterial({ color: 0x3fa8d8, transparent: true, opacity: 0.86, shininess: 100 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.05; s.add(water);
  for (const [w, d2, px, pz] of [[40, 2, 0, 12], [40, 2, 0, -12], [2, 26, 19, 0], [2, 26, -19, 0]]) box(w, 1, d2, 0xf4f6f9, px, 0.5, pz, s); box(80, 26, 1, 0xcfdbe6, 0, 13, -30, s); for (let i = -3; i <= 3; i++) box(6, 9, 0.4, new THREE.MeshBasicMaterial({ color: 0xbfe4ff }), i * 10, 14, -29.4, s);
  for (let i = 0; i < 5; i++) box(36, 0.12, 0.3, 0xd9463a, 0, 0.12, -8 + i * 4, s);
  const door = makeDoor(); s.add(door); const A = makeChar('civA'), B = makeChar('civB'), sci = makeChar('designer'); [A, B, sci].forEach(c => s.add(c.g)); box(1.4, 1.9, 0.14, 0xf4efe6, 0, -1.9, 0.6, sci.armL);
  // lab tank at x = 200
  const L = new THREE.Group(); L.position.set(200, 0, 0); s.add(L); box(40, 1, 30, 0x4a4f5a, 0, -0.5, 0, L); box(40, 20, 1, 0x3a4048, 0, 10, -12, L); box(14, 3.4, 5, 0x6a7078, 0, 1.7, 0, L);
  box(12, 5, 4.4, new THREE.MeshPhongMaterial({ color: 0x5ac0e8, transparent: true, opacity: 0.55 }), 0, 6, 0, L); const mini = makeDoor(); mini.scale.setScalar(0.45); L.add(mini); const m1 = makeChar('civA'), m2 = makeChar('civB'); m1.g.scale.setScalar(0.3); m2.g.scale.setScalar(0.3); L.add(m1.g, m2.g);
  const sci2 = makeChar('designer'); L.add(sci2.g); for (let i = 0; i < 5; i++) box(0.5, 0.25, 0.3, new THREE.MeshBasicMaterial({ color: [0x7dffb0, 0xffd24a, 0xff6b7d][i % 3] }), -5 + i * 1.2, 3.6, 2.6, L);
  const tl = new THREE.PointLight(0xbfe4ff, 120, 40); tl.position.set(0, 12, 6); L.add(tl);
  return { s, cam, door, A, B, sci, mini, m1, m2, sci2,
    pre(T) { this.sinkK = 0; this.both = 0; [A, B, sci, sci2].forEach(c => c.reset()); put(sci, 14, 1, 9, -0.9); sci.idle(T); sci.look('serious', T); sci.armL.rotation.x = -1.1; put(sci2, 209, 0, 6, -0.9); sci2.idle(T); sci2.look('serious', T); sci2.armR.rotation.x = -1.3; },
    post(T) { const y = 0.3 - this.sinkK * 1.1 + Math.sin(T * 2) * 0.05; door.position.set(0, y, 0); door.rotation.z = Math.sin(T * 1.7) * 0.03 + this.tip * 0.5; put(A, 2.9, y + 1.75, -0.7, 0); A.g.rotation.z = Math.PI / 2; A.look('neutral', T); if (this.both) { put(B, 2.9, y + 1.75, 0.9, 0); B.g.rotation.z = Math.PI / 2; } else { put(B, -1.0, -3.2 + this.tip * 1.2, 3.0, Math.PI); B.armL.rotation.x = B.armR.rotation.x = -1.5 - this.tip * 0.8; } B.look(this.tip > 0.3 ? 'surprised' : 'neutral', T);
      const my = 6.9 - this.sinkK * 0.6; this.mini.position.set(0, my, 0); put(m1, 1.0, my + 0.6, -0.3, 0); m1.g.rotation.z = Math.PI / 2; put(m2, 1.0, my + 0.6, 0.4, 0); m2.g.rotation.z = Math.PI / 2; }, tip: 0 };
});
const POOL = (key, fn) => SHOT(key, 'a1_pool', c => { c.S.tip = 0; fn(c, c.S); c.S.post(c.T); });
const tag = (c, t1, t2, col = '#ffd24a') => c.dom(`<div style="position:absolute;left:110px;top:140px"><div style="font-size:30px;letter-spacing:8px;color:${col};font-weight:700">${t1}</div><div style="font-size:84px;line-height:1">${t2}</div></div>`);
POOL('p3:0', (c, S) => { move(c.cam, [22, 12, 30], [0, 1, 0], [15, 9, 24], [0, 1, 0], c.k, 38); });
POOL('p3:1', (c, S) => { S.tip = Math.sin(clamp(c.k * 1.4) * Math.PI); tag(c, 'TEST 01', 'THE POOL'); move(c.cam, [-6, 7, 16], [1, 1.2, 1], [-4.5, 6, 13], [1, 1.2, 1], c.k, 34); });
POOL('p3:2', (c, S) => { S.sinkK = 0.5 + Math.sin(c.T * 2) * 0.3; tag(c, 'TEST 02', 'THE LAB'); move(c.cam, [206, 8, 17], [200, 6.4, 0], [204, 7.6, 14], [200, 6.4, 0], c.k, 34); });
POOL('p3:3', (c, S) => { S.both = 1; S.sinkK = ease(c.k * 1.5); c.dom(`<div style="position:absolute;left:0;right:0;top:92px;bottom:92px;border:26px solid #111;border-radius:60px;box-shadow:inset 0 0 120px rgba(0,0,0,.7)"></div><div style="position:absolute;left:120px;top:150px;background:#e02a2a;font-size:34px;padding:6px 20px;border-radius:8px;letter-spacing:4px">● LIVE</div><div style="position:absolute;left:120px;bottom:300px;background:#ffd24a;color:#111;font-size:44px;padding:8px 26px">DOES THE DOOR FLOAT TWO?</div>`); move(c.cam, [10, 6, 18], [0, 1, 0], [8, 5, 15], [0, 1, 0], c.k, 36); });
POOL('p4:0', (c, S) => { S.both = 1; S.sinkK = 1; S.sci.head.rotation.x = 0.3; move(c.cam, [10.5, 5.6, 14.5], [14, 4.9, 9], [11, 5.5, 14], [14, 4.9, 9], c.k, 30); });
POOL('p4:1', (c, S) => { S.both = 1; S.sinkK = 0; c.dom(`<div style="position:absolute;left:0;right:0;top:170px;text-align:center;font-size:110px">FITS: <span style="color:#5dff9a">2 ✓</span></div>`); shot(c.cam, [0.01, 19 - c.k * 2, 3], [0, 0, 0.4], 34); });
POOL('p4:2', (c, S) => { S.both = 1; S.sinkK = ease(c.k * 1.6) * 1.3; c.dom(`<div style="position:absolute;left:0;right:0;top:170px;text-align:center;font-size:110px">FLOATS: <span style="color:#ff5a66">1 ✗</span></div>`); move(c.cam, [11, 1.6, 15], [0, 0.6, 0], [9, 1.3, 13], [0, 0.4, 0], c.k, 34); });
SEA('p5:0', (c, S, X) => { S.mode('night'); S.ship.visible = false; S.debris = 0.5; X.fill.intensity = 300; X.fill.position.set(3, 7, 7); X.vest.visible = true; X.vest.position.set(0, -2.6 + Math.sin(c.T * 1.5) * 0.08, 0); X.vest.rotation.set(-1.4, c.T * 0.25, 0); move(c.cam, [5, 4, 10], [0, 0.4, 0], [3.5, 3, 7.5], [0, 0.4, 0], c.k, 32); });
SEA('p5:1', (c, S) => { S.mode('sunset'); S.smoke = 1; S.speed = 1; move(c.cam, [150, 12, 250], [0, 22, 30], [120, 16, 215], [0, 22, 30], c.k, 40); });
SEA('p5:2', (c, S) => { S.mode('sunset'); S.smoke = 1; S.speed = 1; const jack = S.C('jack'), rose = S.C('roseFly'), e = LINE.p5.sents[2].end; S.board(rose, 'fore', 0, 14, 115.2, 0); S.board(jack, 'fore', 0, 14, 113.9, 0); rose.armL.rotation.z = -1.5; rose.armR.rotation.z = 1.5; jack.armL.rotation.set(-0.9, 0, 0.3); jack.armR.rotation.set(-0.9, 0, -0.3); rose.look('joy', c.T); jack.look('joy', c.T); const a = 0.5 - c.k * 0.5; shot(c.cam, [Math.sin(a) * 26, 19 + c.k * 3, 116 + Math.cos(a) * 26], [0, 17.5, 114], 36); if (c.T > e + 0.3) c.title(c.T - e - 0.3); });

// ---------------- the wreck + research ship lab ----------------
SET('a1_deep', () => {
  const { s, cam } = mkScene(0x02101c, [10, 110], 0x4a8ab8, 0.5, [0x3a6a9a, 0x04101a, 0.8], [0, 40, 10]);
  s.userData.bloom = 0.6; s.userData.sun.castShadow = false; box(400, 2, 400, 0x1a2a30, 0, -1, 0, s);
  const rust = [0x5a3a2a, 0x4a3024, 0x6a4a34]; const r = rng(3); const W = new THREE.Group(); s.add(W);
  [22, 18, 13, 8, 3].forEach((w, i) => { box(w, 16, 9, rust[i % 3], 0, 8, 10 + i * 8.5, W); box(w + 0.4, 0.5, 9, 0x3a4a44, 0, 16.2, 10 + i * 8.5, W); });
  box(24, 16, 30, rust[0], 0, 8, -9, W); for (let i = 0; i < 70; i++) box(0.3, 1 + r() * 4, 0.3, 0x7a5236, (r() - 0.5) * 22, 13 - r() * 4, -20 + r() * 68, W);
  for (const sx of [-1, 1]) for (let z = 20; z < 52; z += 2.6) box(0.2, 2.2, 0.2, 0x8a6a4a, sx * Math.max(1.4, 11 - (z - 10) * 0.24), 17.3, z, W);
  const sub = new THREE.Group(); s.add(sub); box(5, 4, 8, 0xe8c020, 0, 0, 0, sub); box(3.4, 2.4, 1, new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), 0, 0.3, 4.2, sub); box(6.4, 1, 3, 0x3a3a40, 0, -2.4, 0, sub); const sl = new THREE.SpotLight(0xdff4ff, 900, 90, 0.34, 0.6); sl.position.set(0, 0, 4); sub.add(sl); sl.target.position.set(0, -2, 30); sub.add(sl.target);
  const N = 500, pp = new Float32Array(N * 3), snow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xbfe0ff, size: 0.22, transparent: true, opacity: 0.7 })); snow.geometry.setAttribute('position', new THREE.BufferAttribute(pp, 3)); snow.frustumCulled = false; s.add(snow);
  // lab on the research ship at x = 300
  const L = new THREE.Group(); L.position.set(300, 0, 0); s.add(L); box(40, 1, 30, 0x4a5058, 0, -0.5, 0, L); box(40, 18, 1, 0x6a7480, 0, 9, -10, L); box(1, 18, 30, 0x6a7480, -18, 9, 0, L); box(1, 18, 30, 0x6a7480, 18, 9, 0, L);
  const ll = new THREE.PointLight(0xfff0d8, 400, 60); ll.position.set(0, 14, 8); L.add(ll); const fl = new THREE.PointLight(0xfff0d8, 70, 14); fl.position.set(-5, 6.5, 0.5); L.add(fl); box(10, 3, 5, 0x8a9199, 0, 1.5, 0, L);
  const safe = new THREE.Group(); safe.position.set(-2.5, 3, 0); L.add(safe); box(4, 4.4, 3.6, 0x5a3a2a, 0, 2.2, -0.2, safe); box(3.4, 3.8, 0.2, 0x1a120c, 0, 2.2, 1.62, safe); const sd = new THREE.Group(); sd.position.set(-2, 2.2, 1.7); safe.add(sd); box(4, 4.4, 0.4, 0x6a4a34, 2, 0, 0, sd); const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 10), M(0x8a8f96)); dial.rotation.x = Math.PI / 2; dial.position.set(2, 0, 0.3); sd.add(dial);
  const tray = box(5, 0.5, 4, 0xd9e2ea, 3.2, 3.25, 0.3, L); const dt = tex(256, 320, c => { c.fillStyle = '#e9dcc0'; c.fillRect(0, 0, 256, 320); c.strokeStyle = '#4a3a2a'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.ellipse(128, 110, 46, 58, 0, 0, 7); c.stroke(); c.beginPath(); c.moveTo(82, 96); c.bezierCurveTo(60, 20, 196, 20, 174, 96); c.moveTo(80, 100); c.bezierCurveTo(50, 170, 70, 220, 60, 250); c.moveTo(176, 100); c.bezierCurveTo(206, 170, 186, 220, 196, 250); c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(112, 104, 5, 0, 7); c.arc(146, 104, 5, 0, 7); c.moveTo(114, 136); c.quadraticCurveTo(128, 146, 144, 136); c.moveTo(96, 176); c.quadraticCurveTo(128, 236, 160, 176); c.stroke(); c.fillStyle = '#2f5fb8'; c.beginPath(); c.moveTo(128, 250); c.bezierCurveTo(100, 214, 104, 206, 128, 220); c.bezierCurveTo(152, 206, 156, 214, 128, 250); c.fill(); c.font = 'italic 700 20px serif'; c.fillStyle = '#4a3a2a'; c.fillText('JD  April 14 1912', 70, 300); });
  const draw = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4), new THREE.MeshBasicMaterial({ map: dt })); draw.rotation.x = -Math.PI / 2; draw.rotation.z = 0.3; draw.position.set(3.2, 3.56, 0.3); L.add(draw);
  const brock = makeChar('brock', 'smirk'), crew = makeChar('civC'); L.add(brock.g, crew.g); const phone = box(0.5, 1.2, 0.3, 0x1c1c22, 0, -2.0, 0.4, brock.armR); phone.visible = false;
  return { s, cam, sub, sd, brock, crew, phone, pre(T) { for (let i = 0; i < N; i++) pp.set([(hash(i) - 0.5) * 80, (hash(i + 0.3) * 40 - T * 0.4 * (0.5 + hash(i + 0.6)) + 400) % 40, (hash(i + 0.9) - 0.5) * 90 + 20], i * 3); snow.geometry.attributes.position.needsUpdate = true; brock.reset(); crew.reset(); put(brock, -4, 0, 5.5, Math.PI - 0.3); put(crew, 5.5, 0, 5.5, Math.PI + 0.4); brock.idle(T); crew.idle(T); crew.look('neutral', T); sd.rotation.y = 0; sd.visible = true; phone.visible = false; } };
});
SHOT('a1:0', 'a1_deep', c => { const S = c.S, [i, k] = cuts(c.k, [0.55]); if (i === 0) { S.sub.position.set(lerp(-26, -8, k), 24 - k * 3, lerp(64, 58, k)); S.sub.rotation.set(0.25, 2.4, 0); move(c.cam, [-30, 22, 96], [0, 15, 44], [-20, 21, 84], [0, 16, 46], k, 44); } else { S.sd.rotation.y = -2.0 * ease((k - 0.25) / 0.4); S.brock.look('smirk', c.T); S.brock.armR.rotation.x = -1.3; move(c.cam, [295, 6.6, 15], [298.5, 5, 0], [296.5, 6.2, 12.5], [298.5, 5, 0], k, 34); } });
SHOT('a1:1', 'a1_deep', c => { const S = c.S; S.sd.visible = false; S.brock.look('sad', c.T); S.brock.head.rotation.x = 0.08; move(c.cam, [292.5, 5.2, -1.2], [296, 4.75, 5.5], [293.2, 5.1, -0.6], [296, 4.75, 5.5], c.k, 30); });
SHOT('a1:2', 'a1_deep', c => { const S = c.S; S.sd.rotation.y = -2.0; move(c.cam, [304.5, 9.5, 5.5], [303.2, 3.5, 0.6], [303.9, 8, 3.6], [303.2, 3.5, 0.4], c.k, 32); });
SHOT('a2:0', 'a1_deep', c => { const S = c.S; S.sd.visible = false; S.phone.visible = true; S.brock.armR.rotation.set(-2.5, 0, -0.4); S.brock.look('surprised', c.T); move(c.cam, [300.2, 5.6, 2.0], [296, 5.0, 5.5], [299.8, 5.5, 2.4], [296, 5.0, 5.5], c.k, 34); });

// ---------------- old Rose's house ----------------
SET('a1_home', () => {
  const { s, cam } = mkScene(0xf2dcc0, [40, 120], 0xfff0d8, 2.2, [0xfff4e6, 0x9a7a5a, 1.5], [-12, 20, 14]);
  s.userData.bloom = 0.35; box(40, 1, 30, 0xb98a58, 0, -0.5, 0, s); box(40, 18, 1, 0xf2e6d2, 0, 9, -9, s); box(1, 18, 30, 0xf2e6d2, -16, 9, 0, s);
  box(8, 7, 0.3, new THREE.MeshBasicMaterial({ color: 0xcfe8ff }), -6, 9, -8.4, s); box(8.6, 0.4, 0.5, 0x8a6238, -6, 5.3, -8.3, s); box(0.4, 7.4, 0.5, 0x8a6238, -6, 9, -8.3, s);
  for (let i = 0; i < 6; i++) { box(1.6, 2, 0.2, 0x4a3a2a, 3 + (i % 3) * 2.4, 8 + Math.floor(i / 3) * 2.8, -8.4, s); box(1.2, 1.6, 0.1, [0xcfd8e6, 0xe6d8c0, 0xd8e6cf][i % 3], 3 + (i % 3) * 2.4, 8 + Math.floor(i / 3) * 2.8, -8.25, s); }
  box(3, 2.4, 3, 0x8a6238, 0, 1.2, 1.5, s); const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 16), M(0x6a6a70)); wheel.position.set(0, 2.6, 1.5); s.add(wheel); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 1.4, 10), M(0xb8623a)); pot.position.set(0, 3.4, 1.5); s.add(pot);
  box(4, 3, 2.4, 0x3a3a40, 9, 4, -3, s); const tv = box(3.4, 2.4, 0.1, new THREE.MeshBasicMaterial({ color: 0x9fc8ea }), 9, 4.1, -1.75, s); box(5, 2.4, 3, 0x6a4a2e, 9, 1.2, -3, s);
  const rose = makeChar('roseOld', 'neutral'); s.add(rose.g); const phone = box(0.5, 1.2, 0.3, 0xf2efe6, 0, -2.0, 0.4, rose.armR);
  return { s, cam, rose, pot, wheel, phone, pre(T) { rose.reset(); put(rose, 0, 0, -1.2, 0); rose.idle(T); wheel.rotation.y = pot.rotation.y = T * 4; phone.visible = false; } };
});
SHOT('a2:1', 'a1_home', c => { const S = c.S; S.rose.look('neutral', c.T); S.rose.armL.rotation.x = S.rose.armR.rotation.x = -1.0; S.rose.head.rotation.y = 0.9 * ease((c.k - 0.4) * 3); move(c.cam, [-7, 6, 14], [1, 4, 0], [-4, 5.4, 10.5], [1, 4.2, 0], c.k, 36); });
SHOT('a3', 'a1_home', c => { const S = c.S; S.phone.visible = true; S.rose.armR.rotation.set(-2.5, 0, -0.4); S.rose.look('smirk', c.T, c.talk); S.rose.head.rotation.z = -0.06; move(c.cam, [2.2, 4.9, 7.2], [0, 4.7, -1.2], [1.6, 4.9, 6.2], [0, 4.75, -1.2], c.k, 28); });

// ---------------- Southampton ----------------
SEA('a4:0', (c, S, X) => { X.dock.visible = true; X.crowd(c.T); S.smoke = 0.6; c.dom(`<div style="position:absolute;left:110px;top:150px"><div style="font-size:30px;letter-spacing:8px;color:#ffd24a;font-weight:700">APRIL 10, 1912</div><div style="font-size:84px;line-height:1">SOUTHAMPTON</div></div>`); move(c.cam, [-46, 8, 150], [-6, 22, 40], [-42, 9, 128], [-4, 26, 30], c.k, 46); });
SEA('a4:1', (c, S, X) => { X.dock.visible = true; X.crowd(c.T); S.smoke = 1; move(c.cam, [-120, 20, 190], [0, 20, 20], [-150, 70, 150], [0, 22, 0], c.k, 44); });
SEA('a5', (c, S, X) => { X.dock.visible = true; X.crowd(c.T, true); S.smoke = 0.6; const rose = S.C('roseBoard'), cal = S.C('cal'), [i, k] = cuts(c.k, [0.5]); S.put(rose, -30, 2.2, 11, 0.6); S.put(cal, -27.2, 2.2, 10.4, 0.5); rose.idle(c.T); cal.idle(c.T + 1);
  if (i === 0) { rose.look('serious', c.T); cal.look('smirk', c.T); rose.head.rotation.x = -0.35 * ease(k * 2); move(c.cam, [-22, 6, 24], [-29, 6.4, 11], [-23.5, 6.4, 21], [-29, 6.8, 11], k, 32); }
  else { cal.armR.rotation.set(-0.9, 0, 0.7); cal.look('smirk', c.T); rose.look('sad', c.T); rose.head.rotation.y = -0.4; move(c.cam, [-24.5, 7, 19], [-28.4, 6.8, 10.8], [-25.5, 7, 17.5], [-28.4, 6.9, 10.8], k, 28); } });

// ---------------- the pub ----------------
SET('a1_pub', () => {
  const { s, cam } = mkScene(0x2a1a10, [30, 90], 0xffd9a0, 1.2, [0xffe2b8, 0x4a3020, 1.1], [8, 20, 12]);
  s.userData.bloom = 0.5; box(40, 1, 30, 0x5a3d26, 0, -0.5, 0, s); box(40, 16, 1, 0x6a4a2e, 0, 8, -9, s); box(1, 16, 30, 0x6a4a2e, -14, 8, 0, s); box(9, 6, 0.3, new THREE.MeshBasicMaterial({ color: 0xcfe8ff }), 5, 8, -8.4, s); box(9.6, 0.4, 0.5, 0x3a2416, 5, 8, -8.3, s);
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.4, 16), M(0x7a5230)); tb.position.set(0, 2.8, 0); s.add(tb); box(0.8, 2.8, 0.8, 0x4a3020, 0, 1.4, 0, s);
  const pl = new THREE.PointLight(0xffc880, 220, 30); pl.position.set(0, 9, 2); s.add(pl); box(0.3, 4, 0.3, 0x1c1c1c, 0, 13, 0, s); box(2, 0.8, 2, new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), 0, 10.8, 0, s);
  for (let i = 0; i < 9; i++) box(0.7, 0.05, 1.0, [0xf4efe6, 0xe24b3b][i % 2], -1.6 + (i % 5) * 0.8, 3.05, -0.6 + Math.floor(i / 5) * 1.2, s).rotation.y = hash(i) * 2; for (let i = 0; i < 5; i++) box(0.5, 0.3, 0.5, 0xd9b24a, 1.6 + (i % 2) * 0.5, 3.15 + i * 0.1, 1.2, s);
  const tk = box(1.6, 0.06, 0.8, 0xf4efe6, 0, 3.06, 0.2, s);
  const jack = makeChar('jack', 'smirk'), a = makeChar('steerA'), b = makeChar('steerC'); [jack, a, b].forEach(c => s.add(c.g));
  return { s, cam, jack, a, b, tk, pre(T) { [jack, a, b].forEach(c => { c.reset(); c.sit(); c.idle(T); }); put(jack, 0, 0, -3.6, 0); put(a, -3.6, 0, 0.6, 1.4); put(b, 3.6, 0, 0.6, -1.4); a.look('serious', T); b.look('serious', T); } };
});
SHOT('a6', 'a1_pub', c => { const S = c.S, [i, k] = cuts(c.k, [0.6]); const win = i === 0 ? ease((k - 0.45) / 0.2) : 1; S.jack.look(win > 0.5 ? 'joy' : 'serious', c.T); S.jack.armR.rotation.x = -1.2 - win * 1.5; S.jack.armL.rotation.x = -1.2 - win * 1.5; S.jack.body.position.y = win * Math.abs(Math.sin(c.T * 9)) * 0.5; S.a.look(win > 0.5 ? 'surprised' : 'serious', c.T); S.b.look(win > 0.5 ? 'sad' : 'serious', c.T); S.tk.position.y = 3.06 + win * 2.2; S.tk.position.z = 0.2 - win * 2.4;
  if (i === 0) move(c.cam, [5, 6.4, 11], [0, 4, -1.5], [2.5, 5.6, 8], [0, 4.4, -2.5], k, 36); else move(c.cam, [1.2, 5.0, 3.6], [0, 5.0, -3.6], [0.8, 5.0, 2.8], [0, 5.1, -3.6], k, 30); });

// ---------------- the bow ----------------
SEA('a7', (c, S, X) => { S.speed = 1; S.smoke = 1; const jack = S.C('jack'); S.board(jack, 'fore', -3, 14, 106, 0.5); jack.sit(); jack.g.position.y = 13.2; jack.armL.rotation.x = -1.2; jack.armR.rotation.x = -1.3 + Math.sin(c.T * 8) * 0.12; jack.look('smirk', c.T); jack.head.rotation.x = 0.2;
  X.dol.forEach((g, i) => { const ph = (c.T * 0.7 + i * 0.33) % 1; g.visible = true; g.position.set((i - 1) * 7 + 3, Math.sin(ph * Math.PI) * 5 - 1, 126 + i * 5); g.rotation.x = -Math.cos(ph * Math.PI) * 0.9; });
  const [i, k] = cuts(c.k, [0.5]); if (i === 0) move(c.cam, [8, 17.5, 116], [-3, 17.5, 106], [6, 17.5, 114], [-3, 17.6, 106], k, 34); else move(c.cam, [-16, 24, 96], [3, 6, 128], [-12, 22, 100], [3, 5, 130], k, 44); });
SEA('a8', (c, S, X) => { S.speed = 1; S.smoke = 1; const jack = S.C('jack'), mate = S.C('steerA'); S.board(jack, 'fore', 0, 15.1, 116.6, 0); S.board(mate, 'fore', 2.6, 14, 113.5, 0.2); mate.look('joy', c.T); mate.armR.rotation.z = 2.4; jack.armL.rotation.z = -1.9 - Math.sin(c.T * 3) * 0.1; jack.armR.rotation.z = 1.9 + Math.sin(c.T * 3) * 0.1; jack.look('joy', c.T, c.talk); jack.head.rotation.x = -0.2;
  const [i, k] = cuts(c.k, [0.55]); if (i === 0) move(c.cam, [3, 19.5, 128], [0, 19.6, 116.6], [2, 19.8, 125], [0, 19.8, 116.6], k, 30); else move(c.cam, [20, 30, 170], [0, 18, 100], [50, 52, 230], [0, 18, 60], k, 42); });
