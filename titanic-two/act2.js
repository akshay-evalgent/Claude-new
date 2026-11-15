// Chapter 2: You Jump, I Jump (b1-b8) + Chapter 3: Iceberg, Right Ahead (c1-c8)
import { THREE, SET, SHOT, LINE, getSet, mkScene, move, shot, shake, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, label, makeChar, ground, makeVest } from './engine.js';

const basic = c => new THREE.MeshBasicMaterial({ color: c });
// per-set cast: mkCast(scene, ['jack', 'r:rose']) -> { jack, r, all, reset(T) }; show with P(ch, x, y, z, ry)
function mkCast(s, list) { const o = { all: [] }; for (const e of list) { const [k, n] = e.includes(':') ? e.split(':') : [e, e]; o[k] = makeChar(n); s.add(o[k].g); o.all.push(o[k]); } o.reset = T => o.all.forEach((c, i) => { c.reset(); c.g.visible = false; c.g.scale.setScalar(1); c.look('neutral', T + i); }); return o; }
const P = (ch, x, y, z, ry = 0) => { ch.g.visible = true; return put(ch, x, y, z, ry); };
const room = (s, w, h, d, wall, floor, ceil, cx = 0, cz = 0) => { box(w, 0.4, d, floor, cx, -0.2, cz, s); box(w, 0.4, d, ceil, cx, h + 0.2, cz, s); box(w, h, 0.4, wall, cx, h / 2, cz - d / 2, s); box(0.4, h, d, wall, cx - w / 2, h / 2, cz, s); box(0.4, h, d, wall, cx + w / 2, h / 2, cz, s); };

// ================= extras on the shared 'sea' set =================
function EX(S) {
  if (S._a2) return S._a2; const s = S.s, X = S._a2 = {};
  X.fill = new THREE.PointLight(0xffe2c0, 0, 40); s.add(X.fill);
  // stern deck extension under the overhanging rail (the hull model stops at z = -116)
  const side = M(0x15161a), dk = M(0xc2a070), st = new THREE.Mesh(new THREE.BoxGeometry(9.4, 14, 5), [side, side, dk, side, side, side]); st.position.set(0, 7, -118.2); S.aft.add(st);
  // crow's nest dressing
  X.bell = box(0.7, 0.8, 0.7, 0xd9b24a, 0, 30.9, 84.3, S.fore); X.binbox = new THREE.Group(); X.binbox.position.set(0.95, 29.35, 86.1); S.fore.add(X.binbox);
  box(1.0, 0.1, 0.7, 0x5a3d26, 0, 0, 0, X.binbox); for (const [x, z, w, d] of [[-0.5, 0, 0.08, 0.7], [0.5, 0, 0.08, 0.7], [0, -0.35, 1.0, 0.08], [0, 0.35, 1.0, 0.08]]) box(w, 0.5, d, 0x5a3d26, x, 0.25, z, X.binbox);
  X.binlab = label('BINOCULARS', { h: 0.22, bg: '#efe6c8', color: '#3a2a18' }); X.binlab.position.set(0.95, 29.55, 86.6); S.fore.add(X.binlab);
  X.puffs = [0, 1, 2, 3, 4, 5].map(() => { const m = box(0.3, 0.3, 0.3, new THREE.MeshBasicMaterial({ color: 0xe6eef6, transparent: true, opacity: 0.5 }), 0, 0, 0, S.fore); m.castShadow = false; return m; });
  X.ice = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: 0xe6f2fa, flatShading: true }), 70); X.ice.frustumCulled = false; s.add(X.ice);
  X.flare = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), 90); X.flare.frustumCulled = false; s.add(X.flare);
  X.flareL = new THREE.PointLight(0xdfe8ff, 0, 400); s.add(X.flareL);
  X.ropes = [-4, 4].map(z => { const r = box(0.12, 1, 0.12, 0xc9b48a, 0, 0, z, s); r.castShadow = false; return r; });
  X.dm = new THREE.Object3D();
  const p0 = S.pre.bind(S);
  S.pre = function (T) { p0(T); X.fill.intensity = 0; X.puffs.forEach(p => p.visible = false); X.ice.visible = false; X.flare.visible = false; X.flareL.intensity = 0; X.ropes.forEach(r => r.visible = false); X.binlab.visible = false; };
  S.pre(0); return X;
}
const SEA = (key, fn) => SHOT(key, 'sea', c => { const X = EX(c.S); if (!c.S._a2first) { c.S._a2first = 1; c.S.pre(c.T); } fn(c, c.S, X); c.S.post(c.T); });
const fillAt = (X, x, y, z, i = 40, d = 34) => { X.fill.position.set(x, y, z); X.fill.intensity = i; X.fill.distance = d; };
const night = (S, sp = 1) => { S.mode('night'); S.speed = sp; S.smoke = sp; };

// ---------------- b1 / b2: the stern ----------------
SEA('b1:0', (c, S, X) => {
  night(S); const [i, k] = cuts(c.k, [0.36, 0.68]), R = S.C('roseDinner');
  if (i === 0) { move(c.cam, [70, 34, -215], [0, 16, -50], [46, 24, -172], [0, 16, -70], k, 40); return; }
  if (i === 1) { const z = lerp(-92, -113, k); S.board(R, 'aft', 0.5, 14, z, Math.PI); R.walk(c.T * 13, 0.9); R.look('sad', c.T); fillAt(X, 8, 19, z - 6, 60); move(c.cam, [13, 18.4, z - 9], [0.5, 17, z - 1], [11, 18, z - 10], [0.5, 17.2, z - 1], k, 36); return; }
  S.board(R, 'aft', 0, 14, -119.5, Math.PI); R.look('sad', c.T); R.armL.rotation.x = R.armR.rotation.x = 0.75; R.head.rotation.x = 0.35 - 0.2 * Math.sin(c.T * 1.5); R.body.rotation.x = 0.08 + Math.sin(c.T * 2) * 0.02;
  fillAt(X, 4, 18, -127, 60); move(c.cam, [6, 12.5, -133], [0, 17.4, -119.5], [3.5, 14.5, -129.5], [0, 17.8, -119.5], k, 32);
});
SEA('b1:1', (c, S, X) => {
  night(S); const R = S.C('roseDinner'), J = S.C('jack'), back = ease((c.k - 0.5) / 0.4);
  S.board(J, 'aft', 2.4, 14, lerp(-111.5, -115.2, ease(c.k * 2)), Math.PI - 0.25); if (c.k < 0.5) J.walk(c.T * 4, 0.25); J.look('neutral', c.T); J.armR.rotation.x = -1.35; J.armR.rotation.z = 0.25;
  S.board(R, 'aft', lerp(0, 0.4, back), 14, lerp(-119.5, -116.9, back), lerp(Math.PI, Math.PI + 2.2, back)); R.look(back > 0.5 ? 'neutral' : 'sad', c.T); R.head.rotation.y = -1.9 * ease(c.k * 3) * (1 - back); R.armL.rotation.x = 0.75 * (1 - back); R.armR.rotation.x = lerp(0.75, -1.2, ease((c.k - 0.3) / 0.3));
  fillAt(X, 9, 19, -124, 70); move(c.cam, [13, 17.6, -127], [1, 17.4, -117.4], [10.5, 17.6, -124.5], [1.2, 17.5, -116.8], c.k, 32);
});
SEA('b2', (c, S, X) => {
  night(S); const R = S.C('roseDinner'), J = S.C('jack'), [i, k] = cuts(c.k, [0.66]);
  S.board(J, 'aft', 2.4, 14, -115.2, Math.PI - 0.25); J.look('smirk', c.T, c.talk); J.armR.rotation.x = -1.2; S.board(R, 'aft', 0.4, 14, -116.9, Math.PI + 2.2); R.look('smirk', c.T); R.armR.rotation.x = -1.2;
  fillAt(X, 7, 19.5, -122, 70);
  if (i === 0) move(c.cam, [4.8, 18.7, -122], [3.2, 18.75, -115.2], [4.5, 18.7, -121.4], [3.2, 18.75, -115.2], k, 30);
  else { R.g.rotation.y = 0.86 + Math.PI; R.g.rotation.y = 0.86; move(c.cam, [2.0, 18.6, -110.6], [0.4, 18.7, -116.9], [1.8, 18.6, -111.2], [0.4, 18.7, -116.9], k, 30); }
});

// ---------------- b5 / b6: the bow at sunset ----------------
const bowPose = (S, c, up) => { const R = S.C('roseFly'), J = S.C('jack'); S.board(R, 'fore', 0, 14 + 1.1 * up, 116.3, 0); S.board(J, 'fore', 0, 14, 114.5, 0); R.look('joy', c.T); J.look('smirk', c.T); J.armL.rotation.x = J.armR.rotation.x = -1.0; J.armL.rotation.z = 0.25; J.armR.rotation.z = -0.25; return [R, J]; };
SEA('b5', (c, S, X) => {
  S.mode('sunset'); S.speed = 1; S.smoke = 1; const [i, k] = cuts(c.k, [0.34, 0.62]);
  if (i === 0) { bowPose(S, c, 0); move(c.cam, [150, 16, 200], [0, 16, 70], [110, 20, 190], [0, 16, 90], k, 40); return; }
  const up = i === 1 ? ease(k * 1.4) : 1, [R] = bowPose(S, c, up), open = i === 1 ? 0 : ease(k * 2);
  R.armL.rotation.z = -1.5 * open; R.armR.rotation.z = 1.5 * open; R.look(open > 0.5 ? 'joy' : 'surprised', c.T); R.body.position.y = Math.sin(clamp(up) * Math.PI) * 0.25;
  if (i === 1) move(c.cam, [-9, 17, 124], [0, 17.6, 115.6], [-7.5, 17.6, 126], [0, 18, 115.8], k, 34);
  else { const a = lerp(-0.7, 0.7, ease(k)); shot(c.cam, [Math.sin(a) * 13, 19.2 + k * 1.5, 116.3 + Math.cos(a) * 13], [0, 18.4, 115.8], 34); }
});
SEA('b6', (c, S, X) => {
  S.mode('sunset'); S.speed = 1; S.smoke = 1; const [R] = bowPose(S, c, 1), [i, k] = cuts(c.k, [0.6]); R.armL.rotation.z = -1.5; R.armR.rotation.z = 1.5; R.look('joy', c.T, c.talk); R.head.rotation.x = -0.15;
  if (i === 0) move(c.cam, [2.6, 20, 124.5], [0, 19.85, 116.3], [2, 20, 123.4], [0, 19.9, 116.3], k, 28);
  else move(c.cam, [30, 34, 40], [0, 19, 112], [22, 30, 56], [0, 19, 113], k, 34);
});
SEA('b8', (c, S) => { night(S, 0.7); move(c.cam, [-170, 22, 300], [0, 18, 40], [-120, 13, 232], [0, 18, 50], c.k, 38); });

// ---------------- c1 / c2: the crow's nest ----------------
const nest = (S, c, X) => { const a = S.C('lookout'), b = S.C('steward'); S.board(a, 'fore', -0.85, 27, 84.3, 0.1); S.board(b, 'fore', 0.95, 27, 84.1, -0.15); for (const [j, ch] of [[0, a], [1, b]]) { ch.g.scale.setScalar(0.72); ch.g.position.x += Math.sin(c.T * 41 + j * 2) * 0.03; ch.armL.rotation.set(-0.9, 0, 0.7); ch.armR.rotation.set(-0.9, 0, -0.7); ch.look('serious', c.T + j); } X.puffs.forEach((p, j) => { const kk = (c.T * 0.7 + j * 0.37) % 1; p.visible = true; p.position.set((j % 2 ? 0.95 : -0.85) + kk * 0.3, 30.0 + kk * 0.9, 85.3 + kk * 0.8); p.scale.setScalar(0.5 + kk * 1.6); p.material.opacity = 0.5 * (1 - kk); }); fillAt(X, 2.5, 31, 91, 26, 20); return [a, b]; };
SEA('c1:0', (c, S) => { night(S, 0.8); move(c.cam, [150, 130, -80], [0, 10, 40], [105, 84, -20], [0, 12, 50], c.k, 40); });
SEA('c1:1', (c, S) => { night(S, 0.8); move(c.cam, [-70, 1.6, 250], [0, 14, 90], [-62, 1.8, 236], [0, 14, 90], c.k, 40); });
SEA('c1:2', (c, S) => { night(S, 0.8); move(c.cam, [24, 22, 150], [6, 40, 70], [22, 24, 146], [0, 90, 40], c.k, 44); });
SEA('c1:3', (c, S, X) => {
  night(S, 0.8); nest(S, c, X); const [i, k] = cuts(c.k, [0.58]);
  if (i === 0) move(c.cam, [4, 30.2, 95], [0, 29.5, 84.3], [2.6, 29.8, 92.5], [0, 29.5, 84.3], k, 30);
  else { X.binlab.visible = true; X.puffs.forEach(p => p.visible = false); fillAt(X, 1.5, 30.5, 89, 14, 12); move(c.cam, [2.6, 30.4, 89.6], [0.95, 29.5, 86.2], [2.2, 30.2, 89], [0.95, 29.5, 86.2], k, 30); }
});
SEA('c2', (c, S, X) => {
  night(S, 0.8); const [a, b] = nest(S, c, X), [i, k] = cuts(c.k, [0.55]); S.berg.visible = true; S.berg.position.set(-8, 0, lerp(330, 250, c.k));
  a.look('surprised', c.T, c.talk); b.look('surprised', c.T); a.armR.rotation.set(-2.9, 0, -0.1 + Math.sin(c.T * 26) * 0.25); X.bell.rotation.z = Math.sin(c.T * 26) * 0.5; b.armL.rotation.set(-1.5, 0, 0.2);
  if (i === 0) { move(c.cam, [2.8, 30, 91.6], [-0.4, 29.7, 84.3], [2.2, 29.9, 90.6], [-0.4, 29.7, 84.3], k, 30); shake(c.cam, c.T, 0.03); }
  else { a.g.visible = b.g.visible = false; X.puffs.forEach(p => p.visible = false); move(c.cam, [0, 30, 90], [-6, 22, 260], [0, 30, 96], [-7, 26, 250], k, 44); }
});
SEA('c3:1', (c, S) => { night(S, 0.8); S.berg.visible = true; S.berg.position.set(-44, 0, lerp(215, 160, c.k)); S.ship.rotation.y = 0.11 * ease(c.k); move(c.cam, [70, 44, 280], [-14, 12, 160], [58, 36, 262], [-16, 12, 150], c.k, 40); });
// ---------------- c5: the boat deck ----------------
const CROWD = ['gentA', 'ladyA', 'gentB', 'ladyB', 'steerB', 'steerA', 'civB', 'civD', 'steerC', 'civA', 'girl', 'boy'];
function deck(S, c, X) {
  night(S, 0); S.sink(0.12); S.lights = 1; const o = S.C('officer');
  CROWD.forEach((n, i) => { const h = S.C(n), x = -5 + (i % 4) * 3.1 + hash(i) * 1.2, z = 22 + Math.floor(i / 4) * 5.2 + hash(i + 3) * 2; S.board(h, 'fore', x, 21, z, -1.2 + hash(i + 5) * 0.8); if (n === 'girl' || n === 'boy') h.g.scale.setScalar(0.62); S.vest(h); h.look(i % 3 ? 'sad' : 'surprised', c.T + i); h.g.position.x += Math.sin(c.T * 2 + i) * 0.15; h.head.rotation.y = Math.sin(c.T * 1.3 + i) * 0.5; });
  S.board(o, 'fore', -7, 21, 30, 1.5); o.look('serious', c.T); o.armR.rotation.set(-2.2 + Math.sin(c.T * 6) * 0.4, 0, -0.3); o.armL.rotation.set(-1.2, 0, 0.3);
  // rockets
  const ph = (c.T * 0.45) % 1, by = 150, bx = 30; X.flare.visible = true; for (let i = 0; i < 90; i++) { const a = hash(i) * 6.283, e = hash(i + 0.4) * 3.14, r = ph < 0.25 ? 0 : (ph - 0.25) * 90 * (0.5 + hash(i + 0.7)); X.dm.position.set(bx + Math.cos(a) * Math.sin(e) * r, (ph < 0.25 ? lerp(30, by, ph / 0.25) : by - (ph - 0.25) * 40) + Math.cos(e) * r, 40 + Math.sin(a) * Math.sin(e) * r); X.dm.rotation.set(0, 0, 0); X.dm.scale.setScalar(ph < 0.25 ? (i < 3 ? 2 : 0.001) : 1.6 * (1 - ph)); X.dm.updateMatrix(); X.flare.setMatrixAt(i, X.dm.matrix); } X.flare.instanceMatrix.needsUpdate = true;
  X.flareL.position.set(bx, by, 40); X.flareL.intensity = ph > 0.25 ? 9000 * (1 - ph) : 0; fillAt(X, 0, 30, 46, 120, 60);
}
SEA('c5:0', (c, S, X) => { deck(S, c, X); const [i, k] = cuts(c.k, [0.5]); if (i === 0) move(c.cam, [-2, 26.5, 56], [0, 23.2, 30], [-1, 25.6, 50], [0, 23.4, 30], k, 40); else move(c.cam, [70, 60, 150], [20, 80, 40], [64, 50, 140], [20, 96, 40], k, 44); });
SEA('c5:1', (c, S, X) => {
  deck(S, c, X); const b = S.boats[0]; b.visible = true; b.position.set(16.2, 17.2 - c.k * 1.2, 33); X.ropes.forEach((r, j) => { r.visible = true; r.position.set(16.2, 21.5, 33 + (j ? 4.4 : -4.4)); r.scale.y = 7; });
  ['ladyB', 'steerB', 'girl'].forEach((n, i) => { const h = S.C(n); S.put(h, 16.2, b.position.y - 0.7, 30 + i * 3, 0.4); if (n === 'girl') h.g.scale.setScalar(0.62); h.sit(); S.vest(h); h.look('sad', c.T + i); h.head.rotation.y = 1.2; h.head.rotation.x = -0.3; });
  move(c.cam, [40, 26, 58], [13, 20.5, 34], [36, 24.5, 54], [13, 20.5, 33], c.k, 36);
  const n = Math.round(lerp(0, 1178, ease(c.k * 1.6)));
  c.dom(`<div style="position:absolute;left:110px;top:150px;font-family:Inter,sans-serif;color:#fff"><div style="font-size:26px;letter-spacing:8px;font-weight:700;color:#ffd24a">APRIL 15, 1912 · 12:45 AM</div><div style="display:flex;gap:60px;margin-top:18px"><div><div style="font-size:92px;font-weight:900;line-height:1">2,200</div><div style="font-size:26px;letter-spacing:5px;font-weight:700;opacity:.8">PEOPLE ON BOARD</div></div><div><div style="font-size:92px;font-weight:900;line-height:1;color:#ff6b6b">${n.toLocaleString('en-US')}</div><div style="font-size:26px;letter-spacing:5px;font-weight:700;opacity:.8">LIFEBOAT SEATS</div></div></div><div style="margin-top:22px;width:620px;height:16px;background:rgba(255,255,255,.18);border-radius:8px"><div style="width:${n / 2200 * 100}%;height:16px;background:#ff6b6b;border-radius:8px"></div></div></div>`);
});
// ---------------- c7:0 Rose in the lifeboat, then the leap back ----------------
SEA('c7:0', (c, S, X) => {
  night(S, 0); S.sink(0.2); const b = S.boats[0], y = lerp(15, 9.5, c.k); b.visible = true; b.position.set(17, y, 30); X.ropes.forEach((r, j) => { r.visible = true; r.scale.y = 22 - y; r.position.set(17, (22 + y) / 2 + 1, 30 + (j ? 4.4 : -4.4)); });
  const R = S.C('rose'); S.put(R, 17, y - 0.7, 30, -1.3); R.sit(); S.vest(R); R.look('sad', c.T); R.head.rotation.x = -0.55; R.head.rotation.y = -0.3;
  ['ladyA', 'steerB'].forEach((n, i) => { const h = S.C(n); S.put(h, 17, y - 0.7, i ? 33.2 : 26.8, -1.2); h.sit(); S.vest(h); h.look('sad', c.T + i); });
  const o = S.C('officer'); S.board(o, 'fore', 8.6, 21, 30, -1.5); o.look('serious', c.T); o.armR.rotation.x = -1.4;
  fillAt(X, 26, y + 6, 36, 80, 40); move(c.cam, [31, y + 5, 42], [16.5, y + 3, 30], [28, y + 4.6, 39], [16.5, y + 3.2, 30], c.k, 34);
});
// ================= DINING SALOON + GRAND STAIRCASE =================
SET('a2_dining', () => {
  const { s, cam } = mkScene(0x2a1c12, [60, 200], 0xfff0d6, 1.2, [0xfff2dc, 0x6a4a2e, 1.2], [10, 40, 30]);
  s.userData.bloom = 0.5; s.userData.sun.castShadow = false;
  const tile = tex(64, 64, c => { c.fillStyle = '#efe6d2'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#7a5a3a'; c.fillRect(0, 0, 32, 32); c.fillRect(32, 32, 32, 32); }); tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(14, 16);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(64, 76), new THREE.MeshLambertMaterial({ map: tile })); fl.rotation.x = -Math.PI / 2; fl.position.z = 2; fl.receiveShadow = true; s.add(fl);
  const panel = tex(64, 128, c => { c.fillStyle = '#8a5f3a'; c.fillRect(0, 0, 64, 128); c.strokeStyle = '#5a3a20'; c.lineWidth = 4; c.strokeRect(8, 8, 48, 70); c.strokeRect(8, 88, 48, 32); c.strokeStyle = '#c99a5a'; c.lineWidth = 2; c.strokeRect(14, 14, 36, 58); }); panel.wrapS = THREE.RepeatWrapping; panel.repeat.set(12, 1);
  const wm = new THREE.MeshLambertMaterial({ map: panel });
  for (const [w, x, z, ry] of [[64, 0, -36, 0], [76, -32, 2, Math.PI / 2], [76, 32, 2, -Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 24), wm); m.position.set(x, 12, z); m.rotation.y = ry; s.add(m); }
  box(64, 0.5, 76, 0xf2ead8, 0, 24, 2, s);
  // dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(13, 20, 10, 0, 6.3, 0, 1.2), new THREE.MeshBasicMaterial({ color: 0xfff6dc, side: THREE.BackSide })); dome.position.set(0, 17.5, -16); s.add(dome);
  for (let i = 0; i < 12; i++) { const r = box(0.3, 0.3, 13, 0xd9b24a, 0, 0, 0, s); r.position.set(Math.sin(i * 0.5236) * 6.2, 23.4, -16 + Math.cos(i * 0.5236) * 6.2); r.rotation.y = i * 0.5236; }
  const dl = new THREE.PointLight(0xfff0d0, 380, 80); dl.position.set(0, 20, -12); s.add(dl);
  // staircase
  for (let i = 0; i < 11; i++) box(15, 0.8, 1.6, i % 2 ? 0x8a5f3a : 0x9a6f48, 0, 0.4 + i * 0.8, -8.8 - i * 1.5, s);
  box(15, 0.8, 9, 0x8a5f3a, 0, 8.4, -29.5, s); box(15, 8.8, 9, 0x6a4a2e, 0, 4, -30.5, s);
  for (const sx of [-1, 1]) { for (let i = 0; i < 11; i++) box(0.4, 2.6, 0.4, 0xd9b24a, sx * 7.4, 1.9 + i * 0.8, -8.8 - i * 1.5, s); const h = box(0.6, 0.5, 18, 0x5a3a20, sx * 7.4, 7.3, -16.2, s); h.rotation.x = 0.49; box(1.2, 4.4, 1.2, 0x6a4a2e, sx * 7.4, 2.2, -7.4, s); }
  box(1.6, 5.6, 1.6, 0x6a4a2e, 0, 2.8, -6.6, s); box(0.5, 2.2, 0.5, 0xd9b24a, 0, 6.6, -6.6, s); box(1.2, 1.2, 1.2, basic(0xfff0c0), 0, 8.2, -6.6, s);
  // carved clock panel
  box(9, 9, 0.6, 0x6a4a2e, 0, 14.5, -35.4, s); const ck = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshBasicMaterial({ map: tex(128, 128, c => { c.fillStyle = '#f6efdc'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = '#3a2a18'; c.lineWidth = 5; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.stroke(); for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(64 + Math.sin(i * 0.5236) * 46, 64 - Math.cos(i * 0.5236) * 46); c.lineTo(64 + Math.sin(i * 0.5236) * 54, 64 - Math.cos(i * 0.5236) * 54); c.stroke(); } c.lineWidth = 6; c.beginPath(); c.moveTo(64, 64); c.lineTo(64, 24); c.moveTo(64, 64); c.lineTo(90, 76); c.stroke(); }) })); ck.position.set(0, 14.5, -35.05); s.add(ck);
  for (const sx of [-1, 1]) { box(1.6, 6, 1, 0xd9b24a, sx * 3.4, 14.5, -35, s); box(2.4, 2.4, 1, 0xc99a5a, sx * 3.4, 18.6, -35, s); }
  // chandeliers + tables
  for (const [x, z] of [[-16, 12], [16, 12], [-16, -4], [16, -4], [0, 22]]) { box(0.2, 5, 0.2, 0xd9b24a, x, 21.5, z, s); for (let i = 0; i < 6; i++) box(0.7, 0.9, 0.7, basic(0xffe2a0), x + Math.sin(i * 1.05) * 1.6, 18.6, z + Math.cos(i * 1.05) * 1.6, s); const p = new THREE.PointLight(0xffd9a0, 160, 44); p.position.set(x, 17, z); s.add(p); }
  const tbl = (x, z) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.3, 18), M(0xd9d2c2)); t.position.set(x, 3, z); s.add(t); box(0.8, 3, 0.8, 0x6a4a2e, x, 1.5, z, s); box(0.5, 1.4, 0.5, basic(0xfff0c0), x, 3.9, z, s); };
  for (const [x, z] of [[-18, 4], [18, 4], [-20, 22], [20, 22]]) tbl(x, z);
  box(18, 0.4, 5, 0xd9d2c2, 0, 2.9, 15, s); box(17, 2.6, 4, 0xe6e0d2, 0, 1.4, 15, s);
  for (let i = 0; i < 7; i++) { box(1.1, 0.1, 1.1, 0xffffff, -7.5 + i * 2.5, 3.16, 14.4, s); box(0.4, 0.7, 0.4, basic(0xffe6a8), -6.3 + i * 2.5, 3.5, 13.6, s); }
  const forks = []; for (let i = 0; i < 8; i++) forks.push(box(0.14, 0.06, 1.3, 0xcfd6de, -4.6 + i * 0.52, 3.16, 16.4, s));
  const C = mkCast(s, ['jack:jackTux', 'rose:roseDinner', 'cal', 'gentA', 'gentB', 'ladyA', 'ladyB', 'steward', 'civD']);
  return { s, cam, C, forks, pre(T) { C.reset(T); P(C.gentA, -18, 0, 8, 2.6); P(C.ladyA, -15.5, 0, 6.5, -2.2); P(C.gentB, 17, 0, 8.2, -2.6); P(C.ladyB, 19.8, 0, 6.8, 2.4); P(C.steward, 11, 0, 20, -2.4); P(C.civD, -10, 0, -3, 0.8); for (const k of ['gentA', 'ladyA', 'gentB', 'ladyB', 'civD']) { C[k].idle(T); C[k].head.rotation.y = Math.sin(T * 0.8 + C[k].g.position.x) * 0.4; } } };
});
SHOT('b3:0', 'a2_dining', c => {
  const { C } = c.S, [i, k] = cuts(c.k, [0.5]), J = C.jack, R = C.rose, cal = C.cal;
  P(cal, 4.6, 0, -4.6, Math.PI + 0.3); cal.idle(c.T); cal.look('serious', c.T);
  if (i === 0) { const d = ease(k); P(J, 0, lerp(8.8, 3.2, d), lerp(-26, -13.4, d), 0); J.walk(c.T * 6, 0.4); J.look('smirk', c.T); P(R, 1.6, 0, -4.4, Math.PI); R.idle(c.T); R.look('smirk', c.T); move(c.cam, [-4, 4.6, 30], [0, 10, -18], [-2, 5.6, 16], [0, 8.6, -18], k, 42); }
  else { P(J, 0.4, 0, -6.6, 0.2); P(R, 1.6, 0, -3.6, Math.PI + 0.2); const b = Math.sin(clamp(k * 1.3) * Math.PI); J.body.rotation.x = 0.5 * b; J.armR.rotation.set(-1.2, 0, -0.25); J.look('smirk', c.T); R.armR.rotation.set(-1.3, 0, 0.2); R.look('joy', c.T); cal.look('menace', c.T); move(c.cam, [-8.4, 4.8, -2], [1, 4.3, -5], [-7.4, 4.6, -2.6], [1, 4.3, -5], k, 32); }
});
SHOT('b3:1', 'a2_dining', c => {
  const { C } = c.S, [i, k] = cuts(c.k, [0.62]), J = C.jack, R = C.rose, cal = C.cal;
  P(J, -2.6, 0, 11.4, 0); J.sit(); P(R, 1.4, 0, 11.4, 0); R.sit(); P(cal, 5.4, 0, 11.4, 0); cal.sit(); P(C.gentA, -6.6, 0, 11.4, 0); C.gentA.sit(); P(C.ladyA, 9.2, 0, 11.4, 0); C.ladyA.sit();
  J.look(k > 0.5 && i === 0 ? 'surprised' : 'neutral', c.T); J.head.rotation.x = 0.35; J.head.rotation.y = Math.sin(c.T * 3) * 0.3; J.armR.rotation.x = -1.3; R.look('smirk', c.T); R.head.rotation.y = 0.5; cal.look('menace', c.T); cal.head.rotation.y = 0.6; cal.armR.rotation.x = -1.2 + Math.sin(c.T * 2) * 0.1; C.gentA.look('serious', c.T); C.ladyA.look('neutral', c.T);
  c.S.forks.forEach((f, j) => f.position.y = 3.16 + Math.max(0, Math.sin(c.T * 5 - j * 0.6)) * 0.12);
  if (i === 0) move(c.cam, [-1.5, 7.4, 25], [-1.5, 4.2, 12], [-2.4, 6.2, 21.5], [-2.6, 4.3, 12], k, 34); else move(c.cam, [7.4, 5, 20.5], [5.4, 4.75, 11.4], [6.8, 5, 19.5], [5.4, 4.75, 11.4], k, 28);
});

// ================= STEERAGE PARTY =================
SET('a2_party', () => {
  const { s, cam } = mkScene(0x1c120a, [40, 120], 0xffd9a0, 0.9, [0xffe2b8, 0x4a3018, 1.2], [6, 20, 14]);
  s.userData.bloom = 0.45; s.userData.sun.castShadow = false;
  const wood = tex(64, 64, c => { c.fillStyle = '#7a5230'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#5a3a20'; for (let x = 0; x < 64; x += 16) c.fillRect(x, 0, 2, 64); }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(8, 6);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(46, 34), new THREE.MeshLambertMaterial({ map: wood })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; s.add(fl);
  box(46, 0.4, 34, 0x5a3a20, 0, 9.6, 0, s); box(46, 9.6, 0.4, 0x6a4a2e, 0, 4.8, -17, s); box(0.4, 9.6, 34, 0x6a4a2e, -23, 4.8, 0, s); box(0.4, 9.6, 34, 0x6a4a2e, 23, 4.8, 0, s); box(46, 9.6, 0.4, 0x6a4a2e, 0, 4.8, 17, s);
  for (let x = -20; x <= 20; x += 8) box(0.8, 0.8, 34, 0x4a3018, x, 9.1, 0, s); for (const [x, z] of [[-12, -8], [12, -8], [-12, 8], [12, 8]]) box(0.9, 9.4, 0.9, 0x4a3018, x, 4.7, z, s);
  for (const [x, z] of [[-6, 0], [8, -6], [8, 8], [-16, 6]]) { box(0.5, 0.8, 0.5, basic(0xffd28a), x, 8.3, z, s); const p = new THREE.PointLight(0xffb866, 110, 34); p.position.set(x, 7.4, z); s.add(p); }
  box(9, 0.8, 7, 0x5a3a20, -17.5, 0.4, -11, s);
  const mugs = []; for (const [x, z] of [[14, -11], [15.5, 10], [-3, -13.5]]) { box(5, 0.3, 3, 0x6a4a2e, x, 2.6, z, s); box(0.4, 2.6, 0.4, 0x4a3018, x - 2, 1.3, z, s); box(0.4, 2.6, 0.4, 0x4a3018, x + 2, 1.3, z, s); for (let i = 0; i < 4; i++) mugs.push(box(0.5, 0.7, 0.5, 0xd9b24a, x - 1.6 + i * 1.1, 3.1, z + (i % 2 ? 0.6 : -0.5), s)); }
  const C = mkCast(s, ['jack', 'rose:roseFly', 'steerA', 'steerB', 'steerC', 'civA', 'civB', 'civC', 'civD', 'girl']);
  const fiddle = new THREE.Group(); box(0.5, 1.4, 0.25, 0x8a4a22, 0, 0, 0, fiddle); box(0.14, 1.2, 0.14, 0x3a2412, 0, 1.2, 0, fiddle); C.steerC.armL.add(fiddle); fiddle.position.set(0.3, -1.7, 0.7); fiddle.rotation.z = 0.9;
  const bow = box(0.08, 2.2, 0.08, 0xe6dcc0, 0, -2.2, 0.6, C.steerC.armR); bow.rotation.x = 1.2;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 12), M(0xa83a2a)); drum.position.set(-19.5, 2.0, -9.6); s.add(drum); box(0.2, 1.4, 0.2, 0x4a3018, -19.5, 0.9, -9.6, s);
  box(0.2, 1.6, 0.2, 0x2a2a2a, 0, -2.0, 0.7, C.civC.armR);
  return { s, cam, C, mugs,
    pre(T) { C.reset(T); const b = Math.abs(Math.sin(T * 8));
      P(C.steerC, -16.5, 0.8, -12, 0.9); C.steerC.armL.rotation.set(-1.9, 0, 0.5); C.steerC.armR.rotation.set(-1.7 + Math.sin(T * 16) * 0.35, 0, -0.5); C.steerC.look('joy', T); C.steerC.body.position.y = b * 0.2;
      P(C.civA, -19.5, 0.8, -12.2, 0.6); C.civA.armL.rotation.x = -1.0 - Math.sin(T * 16) * 0.5; C.civA.armR.rotation.x = -1.0 + Math.sin(T * 16) * 0.5; C.civA.look('joy', T);
      P(C.civC, -14, 0.8, -9.4, 1.2); C.civC.armR.rotation.set(-2.2, 0, -0.4); C.civC.armL.rotation.set(-2.0, 0, 0.5); C.civC.look('neutral', T);
      [['steerA', -7, -7, 0.7], ['steerB', 7.5, -5.5, -0.9], ['civB', 8, 5, -2.2], ['civD', -7.5, 6.5, 2.3], ['girl', 10.5, 0.5, -1.5]].forEach(([n, x, z, ry], i) => { const h = P(C[n], x, 0, z, ry); if (n === 'girl') h.g.scale.setScalar(0.62); h.look('joy', T + i); h.body.position.y = Math.abs(Math.sin(T * 8 + i)) * 0.35; const cl = Math.sin(T * 16 + i) * 0.25; h.armL.rotation.set(-1.4, 0, 0.45 + cl); h.armR.rotation.set(-1.4, 0, -0.45 - cl); });
      mugs.forEach((m, i) => m.position.y = 3.1 + Math.abs(Math.sin(T * 8 + i * 0.5)) * 0.18); } };
});
const spin = (S, T, sp, r = 1.7) => { const { C } = S, a = T * sp, b = Math.abs(Math.sin(T * 8)) * 0.3; for (const [ch, o] of [[C.jack, 0], [C.rose, Math.PI]]) { P(ch, Math.sin(a + o) * r, b, Math.cos(a + o) * r, a + o + Math.PI); ch.armL.rotation.set(-1.45, 0, 0.3); ch.armR.rotation.set(-1.45, 0, -0.3); ch.legL.rotation.x = Math.sin(T * 16 + o) * 0.6; ch.legR.rotation.x = -Math.sin(T * 16 + o) * 0.6; ch.look('joy', T); } };
SHOT('b4:0', 'a2_party', c => { const { C } = c.S, d = ease(c.k); P(C.jack, lerp(4, 1.2, d), 0, lerp(15, 4.5, d), Math.PI + 0.2); C.jack.walk(c.T * 9, 0.6); C.jack.look('joy', c.T); C.jack.armL.rotation.set(0.9, 0, -0.3); P(C.rose, lerp(5.6, 2.6, d), 0, lerp(17.6, 7, d), Math.PI + 0.2); C.rose.walk(c.T * 9 + 1, 0.5); C.rose.look('surprised', c.T); C.rose.armR.rotation.set(-1.2, 0, 0.3); move(c.cam, [-6, 4.8, -5], [3, 4.2, 9], [-4.5, 4.6, -3], [2, 4.2, 6], c.k, 38); });
SHOT('b4:1', 'a2_party', c => { spin(c.S, c.T, 2.4); move(c.cam, [-7.5, 4.6, -13.5], [-16.5, 4, -11], [-8.5, 4.4, -13.2], [-16.5, 4, -11], c.k, 40); });
SHOT('b4:2', 'a2_party', c => {
  const [i, k] = cuts(c.k, [0.52]); spin(c.S, c.T, 3.2 + c.k * 3.5);
  if (i === 0) { const a = c.T * 0.9; shot(c.cam, [Math.sin(a) * 7.5, 7.4, Math.cos(a) * 7.5], [0, 3.8, 0], 40); }
  else { move(c.cam, [15, 8.2, 13], [0, 2.6, -1], [12.5, 7.6, 11], [0, 2.8, -1], k, 44); }
  shake(c.cam, c.T, 0.05);
});

// ================= ROSE'S SUITE (the drawing; the diamond) =================
SET('a2_suite', () => {
  const { s, cam } = mkScene(0x1c120c, [50, 140], 0xffe2b8, 0.8, [0xfff0d8, 0x5a3a20, 1.25], [6, 18, 16]);
  s.userData.bloom = 0.45; s.userData.sun.castShadow = false;
  room(s, 34, 13, 28, 0x7a5230, 0x6a2a2a, 0xf2ead8);
  for (let x = -15; x <= 15; x += 5) box(0.3, 13, 0.3, 0x5a3a20, x, 6.5, -13.7, s);
  box(8, 6, 1.4, 0x3a2a20, 8, 3, -13.2, s); box(5, 3.4, 0.5, basic(0xff8a3a), 8, 2.2, -12.6, s); box(9, 0.6, 2, 0xe6e0d2, 8, 6.3, -13, s); const fp = new THREE.PointLight(0xff9a50, 60, 26); fp.position.set(8, 3, -10); s.add(fp);
  for (const [x, z] of [[-11, 2], [12, 6]]) { box(0.3, 5.4, 0.3, 0xd9b24a, x, 2.7, z, s); box(1.8, 1.4, 1.8, basic(0xffe6b0), x, 6, z, s); const p = new THREE.PointLight(0xffd9a0, 120, 34); p.position.set(x, 6.5, z); s.add(p); }
  // sofa
  box(9, 1.4, 3.6, 0x2f5a4a, -2, 1.4, 0, s); box(9, 3.6, 0.9, 0x2f5a4a, -2, 3.6, -1.6, s); box(0.9, 2.6, 3.6, 0x2f5a4a, -6.6, 2.6, 0, s); box(0.9, 2.6, 3.6, 0x2f5a4a, 2.6, 2.6, 0, s); box(2.4, 0.9, 1.6, 0xd9b24a, -5.2, 2.6, 0.2, s);
  box(2.4, 0.4, 2.2, 0x5a3a20, 6.5, 1.5, 8.5, s);
  const C = mkCast(s, ['jack', 'rose', 'cal', 'steward']);
  // Heart of the Ocean
  const mkGem = sc => { const g = new THREE.Group(), bm = basic(0x2f6aff); for (const sx of [-1, 1]) { const m = box(0.34, 0.34, 0.12, bm, sx * 0.13, 0.1, 0, g); m.rotation.z = Math.PI / 4; } const t = box(0.36, 0.36, 0.12, bm, 0, -0.08, 0, g); t.rotation.z = Math.PI / 4; box(0.1, 0.1, 0.14, basic(0xdff0ff), -0.1, 0.14, 0.02, g); g.scale.setScalar(sc); return g; };
  const gem = mkGem(1.5); gem.position.set(0, 3.45, 0.58); C.rose.body.add(gem); for (const sx of [-1, 1]) { const ch = box(0.06, 0.8, 0.06, 0xdfe6ee, sx * 0.3, 3.85, 0.56, C.rose.body); ch.rotation.z = sx * 0.5; }
  const gl = new THREE.PointLight(0x4f8aff, 8, 6); gl.position.set(0, 3.4, 1.2); C.rose.body.add(gl);
  const gem2 = mkGem(1.6); s.add(gem2);
  const pad = box(1.9, 2.4, 0.12, 0xefe6cf, 0.2, -1.6, 0.9, C.jack.armL); pad.rotation.x = -0.9; const coal = box(0.12, 0.7, 0.12, 0x1c1c1c, 0, -2.3, 0.3, C.jack.armR);
  // the drawing, as its own little stage
  const sketch = sig => tex(768, 576, c => { c.fillStyle = '#efe6cf'; c.fillRect(0, 0, 768, 576); c.strokeStyle = 'rgba(40,34,30,.85)'; c.lineCap = 'round'; c.lineWidth = 5;
    const r = rng(8), wob = () => (r() - 0.5) * 5; const line = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] + wob(), p[1] + wob()) : c.moveTo(p[0], p[1])); c.stroke(); };
    c.beginPath(); c.ellipse(384, 210, 92, 116, 0, 0, 7); c.stroke(); c.lineWidth = 3; for (let i = 0; i < 60; i++) { const a = -2.8 + r() * 2.5 + (i % 2 ? 3.0 : 0), rr = 104 + r() * 60; c.beginPath(); c.arc(384 + Math.cos(a) * rr, 200 + Math.sin(a) * rr * 0.9 + 40, 16 + r() * 12, r() * 3, r() * 3 + 3.6); c.stroke(); }
    c.lineWidth = 5; c.beginPath(); c.arc(346, 196, 16, 0.2, 2.9); c.stroke(); c.beginPath(); c.arc(422, 196, 16, 0.2, 2.9); c.stroke(); line([[330, 168], [362, 162]]); line([[406, 162], [438, 168]]); line([[384, 210], [378, 244], [392, 246]]); c.beginPath(); c.arc(384, 262, 26, 0.35, 2.8); c.stroke();
    line([[350, 318], [346, 372], [250, 410], [200, 470], [190, 560]]); line([[418, 318], [422, 372], [518, 410], [568, 470], [578, 560]]); c.lineWidth = 3; line([[330, 392], [384, 452], [438, 392]]);
    c.fillStyle = 'rgba(60,84,130,.9)'; c.beginPath(); c.moveTo(384, 506); c.bezierCurveTo(330, 468, 346, 432, 384, 458); c.bezierCurveTo(422, 432, 438, 468, 384, 506); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(370, 462, 6, 0, 7); c.fill();
    c.strokeStyle = 'rgba(40,34,30,.25)'; c.lineWidth = 2; for (let i = 0; i < 40; i++) line([[470 + r() * 60, 150 + i * 5], [500 + r() * 40, 156 + i * 5]]);
    if (sig) { c.fillStyle = '#2a2420'; c.font = 'italic 700 46px Georgia, serif'; c.fillText('JD', 596, 500); c.font = 'italic 400 30px Georgia, serif'; c.fillText('4 · 14 · 1912', 566, 540); } });
  const tA = sketch(false), tB = sketch(true); const paper = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ map: tA })); paper.position.set(60, 5, 0); s.add(paper); box(9, 7, 0.3, 0x5a3a20, 60, 5, -0.2, s);
  const hand = new THREE.Group(); s.add(hand); box(1.1, 1.3, 0.9, 0xf0c9a4, 0, 0, 0, hand); box(1.2, 2.2, 1.0, 0xefe9da, 0, -1.7, 0, hand); const st = box(0.16, 1.2, 0.16, 0x1c1c1c, -0.3, 0.9, 0.2, hand); st.rotation.z = 0.5; hand.rotation.z = 0.6;
  const pl = new THREE.PointLight(0xfff0d8, 30, 20); pl.position.set(60, 6, 8); s.add(pl);
  return { s, cam, C, gem, gem2, paper, tA, tB, hand,
    pre(T) { C.reset(T); gem2.visible = false; gem.visible = true; paper.material.map = tA; hand.visible = false; gem.rotation.y = Math.sin(T * 2) * 0.15; } };
});
const drawPose = (S, T) => { const { C } = S; P(C.rose, -2, 0.1, 0.5, 0.15); C.rose.sit(); C.rose.body.rotation.z = 0.22; C.rose.armR.rotation.set(-2.6, 0, 0.5); C.rose.armL.rotation.set(-0.3, 0, -0.4); C.rose.look('smirk', T); C.rose.head.rotation.z = -0.12; P(C.jack, 6.5, -0.1, 8.5, Math.PI + 0.75); C.jack.sit(); C.jack.armL.rotation.set(-1.3, 0, 0.2); C.jack.armR.rotation.set(-1.5 + Math.sin(T * 9) * 0.12, 0, 0.35 + Math.sin(T * 6) * 0.1); C.jack.look('serious', T); C.jack.head.rotation.x = Math.sin(T * 1.6) > 0.2 ? 0.3 : -0.05; };
SHOT('b7:0', 'a2_suite', c => { drawPose(c.S, c.T); const [i, k] = cuts(c.k, [0.5]); if (i === 0) move(c.cam, [10, 6.4, 19], [1.5, 3.6, 3], [8, 5.6, 16.5], [1, 3.6, 3], k, 36); else move(c.cam, [-0.5, 4.5, 9.5], [-2, 4.15, 0.6], [-0.9, 4.4, 8], [-2, 4.15, 0.6], k, 30); });
SHOT('b7:1', 'a2_suite', c => { const S = c.S; S.hand.visible = true; S.hand.position.set(63 + Math.sin(c.T * 9) * 0.25, 2.9 + Math.sin(c.T * 13) * 0.12, 0.8); move(c.cam, [58.5, 5.4, 12], [60, 5, 0], [59.2, 5.2, 10.6], [60.2, 4.9, 0], c.k, 34); });
SHOT('b7:2', 'a2_suite', c => { const S = c.S; S.paper.material.map = S.tB; S.hand.visible = c.k < 0.45; S.hand.position.set(63.2 + c.k * 1.6, 2.2 - c.k * 2.5, 0.8); move(c.cam, [60.8, 4.4, 9.4], [61.4, 3.9, 0], [61.6, 3.9, 7.2], [62.2, 3.3, 0], c.k, 32); });
SHOT('c6:0', 'a2_suite', c => {
  const { C } = c.S, S = c.S, k = c.k; S.gem.visible = false; P(C.jack, 2.6, 0, 6, 0.25); C.jack.look('surprised', c.T); C.jack.armL.rotation.set(0.5, 0, 0); C.jack.armR.rotation.set(0.5, 0, 0);
  P(C.steward, 4.9, 0, 5.2, -0.5); C.steward.look('serious', c.T); C.steward.armL.rotation.set(-1.2, 0, 0.6); P(C.cal, 0.5, 0, 4.2, 0.9); C.cal.look('menace', c.T); C.cal.armR.rotation.set(-1.25 * Math.sin(clamp(k * 1.5) * Math.PI), 0, -0.3);
  P(C.rose, -5.5, 0, 8, 1.2); C.rose.look('surprised', c.T);
  S.gem2.visible = true; const g = ease(k * 1.6); S.gem2.position.set(lerp(1.2, 1.75, g), lerp(3.4, 2.5, g), lerp(5.9, 6.4, g)); S.gem2.rotation.y = c.T * 3; S.gem2.scale.setScalar(1.6 * (1 - 0.5 * ease((k - 0.6) / 0.3)));
  move(c.cam, [1.5, 4.6, 15.5], [2.2, 3.6, 6], [1.9, 4.2, 13.6], [2.2, 3.5, 6], k, 30);
});

// ================= THE BRIDGE =================
SET('a2_bridge', () => {
  const { s, cam } = mkScene(0x0a0e16, [40, 120], 0x9fb8e8, 0.6, [0xbcd0f0, 0x2a2018, 0.9], [-6, 14, 10]);
  s.userData.bloom = 0.4; s.userData.sun.castShadow = false;
  room(s, 26, 10, 16, 0x6a4a2e, 0x8a6a48, 0xe6e0d2);
  for (let x = -11; x <= 11; x += 4.4) { box(3.6, 3.4, 0.2, basic(0x0c1830), x, 6.6, -7.7, s); }
  const wheel = new THREE.Group(); wheel.position.set(0, 4.4, -2.2); s.add(wheel); const rim = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 6, 20), M(0x8a5a2e)); wheel.add(rim); for (let i = 0; i < 8; i++) { const sp = box(0.16, 4.2, 0.16, 0x8a5a2e, 0, 0, 0, wheel); sp.rotation.z = i * Math.PI / 8; } box(0.5, 0.5, 0.5, 0xd9b24a, 0, 0, 0.1, wheel);
  box(0.6, 4.2, 0.6, 0x5a3a20, 0, 2.1, -2.5, s);
  for (const x of [-5.5, 5.5]) { box(0.5, 3.6, 0.5, 0xd9b24a, x, 1.8, -3, s); const d = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 14), M(0xd9b24a)); d.rotation.z = Math.PI / 2; d.position.set(x, 4.2, -3); s.add(d); }
  const lamp = new THREE.PointLight(0xffd9a0, 50, 30); lamp.position.set(0, 8, 3); s.add(lamp);
  const C = mkCast(s, ['officer', 'helm:lookout']);
  return { s, cam, C, wheel, pre(T) { C.reset(T); } };
});
SHOT('c3:0', 'a2_bridge', c => {
  const { C } = c.S; c.S.wheel.rotation.z = -c.T * 9; P(C.helm, 0, 0, -0.2, Math.PI); C.helm.look('serious', c.T); C.helm.armL.rotation.set(-1.4 + Math.sin(c.T * 9) * 0.5, 0, 0.2); C.helm.armR.rotation.set(-1.4 - Math.sin(c.T * 9) * 0.5, 0, -0.2); C.helm.body.rotation.z = Math.sin(c.T * 9) * 0.12;
  P(C.officer, 4.6, 0, 0.8, Math.PI - 0.5); C.officer.look('surprised', c.T, 0.9 * Math.abs(Math.sin(c.T * 14))); C.officer.armR.rotation.set(-1.6, 0, -0.9);
  move(c.cam, [-4.5, 4.6, -11.5], [1.6, 4.6, 0], [-3.4, 4.6, -10.5], [1.8, 4.6, 0], c.k, 36); shake(c.cam, c.T, 0.04);
});

// ================= THE HULL OPENING (seen from inside) =================
SET('a2_hull', () => {
  const { s, cam } = mkScene(0x06090c, [30, 110], 0xff6a50, 0.5, [0x6a86a0, 0x10181c, 0.9], [0, 20, 30]);
  s.userData.bloom = 0.5; s.userData.sun.castShadow = false;
  const plate = tex(128, 128, c => { c.fillStyle = '#2a3238'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#151a1e'; c.lineWidth = 4; c.strokeRect(0, 0, 128, 128); c.fillStyle = '#4a565e'; for (let i = 8; i < 128; i += 16) { for (const y of [8, 120]) { c.beginPath(); c.arc(i, y, 3.5, 0, 7); c.fill(); } for (const x of [8, 120]) { c.beginPath(); c.arc(x, i, 3.5, 0, 7); c.fill(); } } }); plate.wrapS = plate.wrapT = THREE.RepeatWrapping; plate.repeat.set(14, 3);
  const wm = new THREE.MeshLambertMaterial({ map: plate }); for (const [y, h] of [[13, 12], [2.2, 4.4]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(100, h), wm.clone()); m.material.map = plate.clone(); m.material.map.repeat.set(14, h / 5); m.material.map.needsUpdate = true; m.position.set(0, y, 0); s.add(m); }
  box(100, 0.4, 30, 0x1c2226, 0, -0.2, 15, s); for (let x = -45; x <= 45; x += 10) box(1, 19, 1.4, 0x3a444a, x, 9.5, 0.7, s);
  const N = 26, segs = [], jets = []; for (let i = 0; i < N; i++) { const g = box(3.9, 2.7, 0.3, 0x2a3238, -49 + i * 3.84, 5.7, 0.1, s); segs.push(g); const j = box(2.2, 1.6, 1, new THREE.MeshBasicMaterial({ color: 0xbfe6f6, transparent: true, opacity: 0.85 }), -49 + i * 3.84, 5.6, 0, s); j.castShadow = false; jets.push(j); }
  const water = box(100, 1, 30, new THREE.MeshPhongMaterial({ color: 0x2f7a8a, transparent: true, opacity: 0.8 }), 0, -1, 15, s); water.castShadow = false;
  const red = new THREE.PointLight(0xff4030, 0, 60); red.position.set(0, 12, 14); s.add(red);
  box(8, 9, 8, 0x3a3a40, -20, 4.5, 20, s); box(8, 9, 8, 0x3a3a40, 12, 4.5, 22, s); box(3, 3, 0.4, basic(0xff7a2a), -20, 3, 15.9, s); box(3, 3, 0.4, basic(0xff7a2a), 12, 3, 17.9, s);
  return { s, cam, segs, jets, water, red };
});
const hullShot = c => {
  const S = c.S, zip = c.k * 30 - 2; S.segs.forEach((g, i) => { const o = clamp((zip - i) / 1.5); g.position.z = 0.1 + o * 2.4; g.rotation.x = o * 0.9; g.position.y = 5.7 - o * 0.6; const j = S.jets[i]; j.visible = o > 0.05; j.scale.set(2.2 + Math.sin(c.T * 20 + i) * 0.4, 1.6, 1 + o * (9 + Math.sin(c.T * 14 + i * 2) * 3)); j.position.z = j.scale.z / 2; j.position.y = 5.5 - o * 1.2; });
  S.water.position.y = -1 + c.k * 2.6; S.red.intensity = 120 * Math.abs(Math.sin(c.T * 7)); const x = -49 + zip * 3.84;
  move(c.cam, [x - 10, 6.5, 24], [x + 4, 6, 0], [x - 6, 6, 21], [x + 6, 5.8, 0], c.k, 42); shake(c.cam, c.T, 0.14);
};

// ================= THE CHART ROOM =================
SET('a2_chart', () => {
  const { s, cam } = mkScene(0x14100c, [40, 120], 0xffe2b8, 0.9, [0xfff0d8, 0x5a3a20, 1.2], [4, 16, 12]);
  s.userData.bloom = 0.4; s.userData.sun.castShadow = false; room(s, 26, 11, 20, 0x7a5230, 0x4a3a2a, 0xe6e0d2);
  box(14, 0.5, 7, 0x5a3a20, 0, 3.2, 0, s); for (const [x, z] of [[-6, -2.8], [6, -2.8], [-6, 2.8], [6, 2.8]]) box(0.6, 3.2, 0.6, 0x4a3018, x, 1.6, z, s);
  const bp = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.4), new THREE.MeshLambertMaterial({ map: tex(512, 230, c => { c.fillStyle = '#e9e2cc'; c.fillRect(0, 0, 512, 230); c.strokeStyle = '#2a3a6a'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 120); c.lineTo(50, 170); c.lineTo(470, 170); c.lineTo(496, 110); c.lineTo(20, 120); c.stroke(); for (let i = 1; i < 16; i++) { c.beginPath(); c.moveTo(50 + i * 26.5, 118); c.lineTo(50 + i * 26.5, 170); c.stroke(); } c.strokeRect(120, 90, 260, 28); for (const x of [170, 225, 280, 335]) c.strokeRect(x, 40, 22, 50); c.font = '700 16px Georgia'; c.fillStyle = '#2a3a6a'; c.fillText('R.M.S. TITANIC — WATERTIGHT COMPARTMENTS', 60, 206); }) })); bp.rotation.x = -Math.PI / 2; bp.position.set(0, 3.48, 0); s.add(bp);
  box(0.8, 0.8, 5.6, 0xe9e2cc, 6.2, 3.8, 0, s); box(1.2, 1.4, 1.2, basic(0xffe2a0), -5, 4.4, -2, s); const p = new THREE.PointLight(0xffd9a0, 130, 34); p.position.set(0, 8.5, 2); s.add(p);
  for (let i = 0; i < 6; i++) box(0.5, 2.6, 2, [0x6a2a2a, 0x2a4a6a, 0x3a5a3a][i % 3], -12.6, 6 + (i % 2) * 0.2, -6 + i * 2.2, s);
  const C = mkCast(s, ['designer', 'captain', 'officer']);
  return { s, cam, C, bp, pre(T) { C.reset(T); P(C.designer, -1.6, 0, -5, 0.15); P(C.captain, 3, 0, -5, -0.25); C.designer.idle(T); C.captain.idle(T + 1); C.designer.look('serious', T); C.captain.look('serious', T); C.designer.armR.rotation.set(-1.2, 0, -0.2); C.designer.head.rotation.x = 0.3; C.captain.head.rotation.x = 0.25; } };
});
const schematic = (filled, bad, note) => { let cells = ''; for (let i = 0; i < 16; i++) { const on = i < filled, red = bad && i === 4; cells += `<div style="flex:1;height:100%;border-right:3px solid #cfe0ff;background:${red ? '#e23b3b' : on ? '#2f8fe0' : 'transparent'};opacity:${on || red ? 0.92 : 1}"></div>`; }
  return `<div style="position:absolute;left:260px;top:170px;width:1400px;font-family:Inter,sans-serif;color:#fff"><div style="font-size:26px;letter-spacing:8px;font-weight:700;color:#ffd24a">16 WATERTIGHT COMPARTMENTS</div><div style="margin-top:22px;height:170px;border:4px solid #cfe0ff;border-left-width:10px;border-radius:90px 14px 14px 110px / 60px 14px 14px 170px;display:flex;flex-direction:row-reverse;overflow:hidden;background:rgba(10,20,40,.72)">${cells}</div><div style="display:flex;justify-content:space-between;margin-top:10px;font-size:24px;font-weight:700;letter-spacing:4px;opacity:.75"><span>STERN</span><span>BOW</span></div><div style="margin-top:14px;font-size:76px;font-weight:900;text-align:right;color:${bad ? '#ff5a5a' : '#fff'}">${note}</div></div>`; };
SHOT('c4:0', 'a2_chart', c => { const S = c.S; S.bp.scale.x = 0.08 + 0.92 * ease(c.k * 1.6); S.bp.position.x = 5.5 * (1 - ease(c.k * 1.6)); S.C.designer.armR.rotation.set(-1.3, 0, 0.6 - ease(c.k * 1.6) * 0.9); move(c.cam, [0, 9, 13], [0.5, 4, -2], [0.5, 7.4, 10], [0.5, 4.2, -3], c.k, 38); });
SHOT('c4:1', 'a2_chart', c => { move(c.cam, [0, 10.5, 4.5], [0, 3.4, -0.2], [0, 9.6, 4], [0, 3.4, -0.2], c.k, 40); const n = Math.min(4, Math.floor(c.k * 5.2)); c.dom(schematic(n, false, n >= 4 ? 'FOUR: SHE FLOATS' : '&nbsp;')); });
SHOT('c4:2', 'a2_chart', c => { move(c.cam, [0, 9.6, 4], [0, 3.4, -0.2], [0, 9.2, 3.8], [0, 3.4, -0.2], c.k, 40); c.dom(schematic(5, Math.sin(c.T * 20) > -0.5, 'FIVE: SHE SINKS')); if (c.l < 0.15) c.flash(0.5 * (1 - c.l / 0.15)); });
SHOT('c4:3', 'a2_chart', c => { const { C } = c.S; C.designer.head.rotation.x = 0; C.captain.head.rotation.x = 0; C.designer.look('sad', c.T); C.captain.look('surprised', c.T); C.captain.head.rotation.y = 0.6; C.designer.head.rotation.y = -0.4; move(c.cam, [1.6, 4.9, 6.5], [0.7, 4.75, -5], [1.2, 4.9, 4.6], [0.7, 4.75, -5], c.k, 30);
  const m = Math.round(lerp(160, 118, ease(c.k))); c.dom(`<div style="position:absolute;right:130px;top:140px;font-family:Inter,sans-serif;color:#fff;text-align:right"><div style="font-size:26px;letter-spacing:8px;font-weight:700;color:#ffd24a">TIME UNTIL SHE FOUNDERS</div><div style="font-size:120px;font-weight:900;line-height:1.05">${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m</div></div>`); });

// ================= BELOW DECKS: the office, the corridor, the axe =================
SET('a2_below', () => {
  const { s, cam } = mkScene(0x0c1214, [40, 130], 0xdff0ff, 0.6, [0xe6f2ff, 0x2a3a40, 1.25], [4, 14, 10]);
  s.userData.bloom = 0.4; s.userData.sun.castShadow = false;
  const W = 0xdfe5ea; room(s, 18, 9, 13, W, 0x8a8f96, 0xeef2f6);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 9, 10), M(0xf2f4f6)); pipe.position.set(-3.2, 4.5, -3); s.add(pipe); const pipe2 = pipe.clone(); pipe2.position.set(-3.9, 4.5, -5.6); s.add(pipe2);
  box(5, 0.4, 2.6, 0x6a4a2e, 4.5, 3, -4.6, s); box(0.4, 3, 2.4, 0x5a3a20, 2.4, 1.5, -4.6, s); box(0.4, 3, 2.4, 0x5a3a20, 6.6, 1.5, -4.6, s);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.2, 6, 20), M(0xd9b24a)); ring.position.set(1.5, 5.6, -6.25); s.add(ring);
  const sky = new THREE.Mesh(new THREE.CircleGeometry(1.2, 20), basic(0x0a1420)); sky.position.set(1.5, 5.6, -6.28); s.add(sky);
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), basic(0x2f8a7a)); wl.position.set(1.5, 4, -6.27); s.add(wl); box(18, 9, 0.2, W, 0, 4.5, -6.45, s);
  // mask around the porthole so the water plane only shows inside the ring
  for (const [x, y, w, h] of [[1.5, 7.6, 3.2, 1.6], [1.5, 3.55, 3.2, 1.7], [-0.6, 5.6, 1.6, 3], [3.6, 5.6, 1.6, 3]]) box(w, h, 0.06, W, x, y, -6.22, s).castShadow = false;
  const door = box(0.3, 7.4, 3.6, 0x6a4a2e, 8.8, 3.7, 2, s); box(0.2, 0.4, 0.4, 0xd9b24a, 8.6, 3.6, 3.2, s);
  const lampM = basic(0xfff2c8); box(1.6, 0.3, 1.6, lampM, 0, 8.8, 0, s); const lamp = new THREE.PointLight(0xfff0d0, 90, 30); lamp.position.set(0, 7.6, 1); s.add(lamp);
  const wat = new THREE.MeshPhongMaterial({ color: 0x3f9a8a, transparent: true, opacity: 0.72, shininess: 90 });
  const water = box(17.6, 0.2, 12.6, wat, 0, -1, 0, s); water.castShadow = false;
  const foam = [0, 1, 2, 3, 4, 5, 6, 7].map(() => { const f = box(1, 0.3, 0.6, new THREE.MeshBasicMaterial({ color: 0xe6f6f6, transparent: true, opacity: 0.8 }), 0, 0, 0, s); f.castShadow = false; return f; });
  // corridor at x = 40
  box(7, 0.4, 70, 0x8a8f96, 40, -0.2, 0, s); box(7, 0.4, 70, 0xeef2f6, 40, 9.2, 0, s); box(0.4, 9, 70, W, 36.4, 4.5, 0, s); box(0.4, 9, 70, W, 43.6, 4.5, 0, s); box(7, 9, 0.4, W, 40, 4.5, -35, s);
  for (let z = -30; z <= 30; z += 10) { box(0.2, 6.8, 3, 0x6a4a2e, 36.65, 3.4, z + 4, s); box(0.2, 6.8, 3, 0x6a4a2e, 43.35, 3.4, z - 2, s); }
  const clamps = []; for (let z = -28; z <= 24; z += 13) { clamps.push(box(1.4, 0.3, 1.4, basic(0xfff2c8), 40, 8.9, z, s)); }
  const cl = new THREE.PointLight(0xfff0d0, 160, 46); cl.position.set(40, 7.5, 4); s.add(cl);
  const cwater = box(6.8, 0.2, 69.6, wat, 40, 1.7, 0, s); cwater.castShadow = false;
  const caseG = new THREE.Group(); caseG.position.set(36.75, 4.6, 10); s.add(caseG); box(0.3, 3.4, 2.2, 0xa8211f, 0, 0, 0, caseG); const glass = box(0.1, 3, 1.8, new THREE.MeshPhongMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35 }), 0.25, 0, 0, caseG);
  const mkAxe = () => { const g = new THREE.Group(); box(0.2, 3, 0.2, 0xa8211f, 0, 0, 0, g); box(0.25, 0.9, 1.2, 0x9aa1ab, 0, 1.1, 0.45, g); return g; };
  const axeCase = mkAxe(); axeCase.position.set(0.3, -0.1, 0); caseG.add(axeCase);
  const C = mkCast(s, ['jack', 'rose']); const axe = mkAxe(); C.rose.armR.add(axe); axe.position.set(0, -2.2, 0.5); axe.rotation.x = Math.PI / 2;
  const cuffs = [C.jack.armL, C.jack.armR].map(a => box(1.1, 0.25, 1.1, 0x8a9199, 0, -1.55, 0, a)); const chain = box(1.6, 0.14, 0.14, 0x8a9199, -3.2, 4.1, -3, s);
  return { s, cam, C, water, wl, foam, lamp, lampM, cl, clamps, cwater, glass, axe, axeCase, cuffs, chain, door,
    pre(T) { C.reset(T); this.level = 0; axe.visible = false; axeCase.visible = true; glass.visible = true; cuffs.forEach(m => m.visible = true); chain.visible = true; foam.forEach(f => f.visible = false); const fl = hash(Math.floor(T * 11)) > 0.18 ? 1 : 0.25; lamp.intensity = 90 * fl; lampM.color.setScalar(fl); cl.intensity = 160 * (hash(Math.floor(T * 9) + 3) > 0.25 ? 1 : 0.3); },
    post(T) { water.position.y = this.level - 0.1; water.visible = this.level > 0.05; wl.position.y = 4 + Math.min(2.2, this.level * 1.1 + 0.4) + Math.sin(T * 3) * 0.05; } };
});
const cuffed = (S, T, pull = 1) => { const J = S.C.jack; P(J, -1.3, 0, -3, -Math.PI / 2); J.armL.rotation.set(-1.5, 0, 0.12); J.armR.rotation.set(-1.5, 0, -0.12); J.body.rotation.x = -0.12 * pull * Math.abs(Math.sin(T * 5)); J.g.position.x += 0.25 * pull * Math.abs(Math.sin(T * 5)); return J; };
const BEL = (key, fn) => SHOT(key, 'a2_below', c => { fn(c, c.S); c.S.post(c.T); });
BEL('c6:1', (c, S) => {
  const [i, k] = cuts(c.k, [0.52]), J = cuffed(S, c.T); S.level = c.k * 1.5; J.look('surprised', c.T, 0.8 * Math.abs(Math.sin(c.T * 11))); J.head.rotation.y = 1.3;
  if (i === 0) move(c.cam, [5.6, 5.4, 5.4], [-1.2, 4.3, -3.4], [4.2, 5, 4.4], [-1.2, 4.4, -3.4], k, 36);
  else { S.foam.forEach((f, j) => { const kk = (c.T * 1.6 + j * 0.13) % 1; f.visible = true; f.position.set(8.4 - kk * 5, S.level + 0.1, 0.6 + j * 0.42); f.scale.set(1 + kk * 2.5, 1, 1); f.material.opacity = 0.8 * (1 - kk); }); move(c.cam, [1, 1.9 + S.level * 0.4, 6], [8.6, 0.6, 2], [0, 2.4 + S.level * 0.4, 5.6], [6, 1.2, 1], k, 40); }
});
const belowC7 = (c, S, i, k) => {
  const R = S.C.rose; R.look('serious', c.T);
  if (i === 1) { const z = lerp(-24, 5, k); P(R, 40, 0, z, 0); R.walk(c.T * 9, 0.55); R.armL.rotation.z = -0.6; R.armR.rotation.z = 0.6; S.foam.forEach((f, j) => { const kk = (c.T * 2 + j * 0.125) % 1; f.visible = true; f.position.set(40 + (j % 2 ? 1 : -1) * (0.8 + kk * 1.6), 1.85, z - 0.5 - kk * 2.5); f.scale.set(0.8 + kk, 1, 1); f.material.opacity = 0.8 * (1 - kk); }); move(c.cam, [41.2, 4.9, 22], [40, 4.1, z], [40.6, 4.6, 19], [40, 4.2, z], k, 38); shake(c.cam, c.T, 0.03); }
  else { P(R, 39.4, 0, 10.4, -Math.PI / 2 + 0.15); const hit = ease((k - 0.25) / 0.14), got = k > 0.6; R.armR.rotation.set(-1.5 * hit * (got ? 1 : 1), 0, 0); R.armL.rotation.set(-0.4, 0, 0.3); S.glass.visible = k < 0.38; S.axeCase.visible = !got; S.axe.visible = got; if (got) { R.armR.rotation.set(-1.0, 0, 0.2); R.look('menace', c.T); } if (k > 0.38 && k < 0.5) c.flash(0.7 * (1 - (k - 0.38) / 0.12)); move(c.cam, [43, 5, 15.6], [37.6, 4.5, 10.2], [42.6, 4.9, 14.4], [37.6, 4.5, 10.2], k, 34); }
};
BEL('c8', (c, S) => {
  const R = S.C.rose, sw = c.k > 0.6, J = cuffed(S, c.T, sw ? 0 : 0.5); S.level = 2.2; S.axe.visible = true;
  if (!sw) { P(R, 4.2, 0, 1.4, -Math.PI / 2 + 0.5); R.look('serious', c.T, c.talk); R.armR.rotation.set(-0.9, 0, 0.2); R.walk(c.T * 5, 0.2); R.armR.rotation.set(-0.9, 0, 0.2); J.look('surprised', c.T); J.head.rotation.y = 1.5; move(c.cam, [-1.5, 5.3, 8.4], [4.2, 4.75, 1.4], [-0.8, 5.2, 7.4], [4.2, 4.75, 1.4], c.k / 0.6, 30); }
  else { const k = (c.k - 0.6) / 0.4, down = ease((k - 0.3) / 0.14), free = k > 0.44; P(R, 0.9, 0, -1.2, -Math.PI / 2 - 0.5); R.look('menace', c.T); R.armR.rotation.set(-2.9 + down * 1.9, 0, 0); R.armL.rotation.set(-2.6 + down * 1.7, 0, 0.3); J.look(free ? 'joy' : 'surprised', c.T); J.head.rotation.y = 0.8;
    if (free) { S.chain.visible = false; J.armL.rotation.set(-0.6, 0, -0.8); J.armR.rotation.set(-0.6, 0, 0.8); J.g.position.x += (k - 0.44) * 3; } if (k > 0.44 && k < 0.6) c.flash(1 - (k - 0.44) / 0.16);
    move(c.cam, [4.6, 5.6, 5.8], [-1.6, 4.4, -2.6], [3.8, 5.2, 5], [-1.6, 4.4, -2.6], k, 36); shake(c.cam, c.T, 0.05); }
});

// ---- lines that cut between two sets: tiny proxy sets pick the underlying set per sub-cut ----
function proxy(name, pick) { SET(name, () => { let cur = null; return { get s() { return cur.s; }, get cam() { return cur.cam; }, pre(T) { cur = pick(T); cur.pre && cur.pre(T); }, get cur() { return cur; } }; }); }
const subk = (L, i, T) => { const st = j => j === 0 ? L.slot[0] : L.sents[j].start - 0.15, a = st(i), b = i + 1 < L.sents.length ? st(i + 1) : L.slot[1]; return clamp((T - a) / (b - a)); };
// c3:2 = scrape (sea) then the hull opening (a2_hull)
const C3SPLIT = 0.45;
proxy('a2_c32', T => getSet(subk(LINE.c3, 2, T) < C3SPLIT ? 'sea' : 'a2_hull'));
const seaC32 = c => { const S = c.S.cur, X = EX(S); const k = c.k / C3SPLIT;
  night(S, 0.5); S.ship.rotation.y = 0.11; S.berg.visible = true; S.berg.position.set(-50, 0, lerp(150, 60, k)); const bz = S.berg.position.z;
  X.ice.visible = true; for (let i = 0; i < 70; i++) { const t0 = hash(i) * 0.8, t = k * 1.5 - t0, y = 40 - 60 * t * t; X.dm.position.set(-13 + hash(i + 0.3) * 9 + t * 4, t < 0 ? -50 : Math.max(12.4, y), bz - 6 + hash(i + 0.6) * 22); X.dm.rotation.set(i, t * 5, i * 2); X.dm.scale.setScalar(0.5 + hash(i + 0.9) * 1.7); X.dm.updateMatrix(); X.ice.setMatrixAt(i, X.dm.matrix); } X.ice.instanceMatrix.needsUpdate = true;
  move(S.cam, [16, 22, bz - 34], [-26, 24, bz + 6], [14, 21, bz - 30], [-26, 22, bz + 2], k, 46); shake(S.cam, c.T, 0.22); S.post(c.T); };
SHOT('c3:2', 'a2_c32', c => { if (c.k < C3SPLIT) seaC32(c); else hullShot({ ...c, S: c.S.cur, cam: c.S.cur.cam, k: (c.k - C3SPLIT) / (1 - C3SPLIT) }); });
// c7:1 = the leap back (sea), the flooded corridor, the axe (a2_below)
const C7A = 0.3, C7B = 0.66;
proxy('a2_c71', T => getSet(subk(LINE.c7, 1, T) < C7A ? 'sea' : 'a2_below'));
const seaC71 = c => { const S = c.S.cur, X = EX(S), k = c.k / C7A; night(S, 0); S.sink(0.2); const b = S.boats[0], y = 9.5 - k * 1.5; b.visible = true; b.position.set(17, y, 30); X.ropes.forEach((r, j) => { r.visible = true; r.scale.y = 22 - y; r.position.set(17, (22 + y) / 2 + 1, 30 + (j ? 4.4 : -4.4)); });
  ['ladyA', 'steerB'].forEach((n, i) => { const h = S.C(n); S.put(h, 17, y - 0.7, i ? 33.2 : 26.8, -1.2); h.sit(); S.vest(h); h.look('surprised', c.T + i); h.head.rotation.y = -1.2; });
  const R = S.C('rose'), j = ease(k * 1.2), jy = Math.sin(clamp(k * 1.2) * Math.PI) * 3.4; S.put(R, lerp(17, 11.8, j), lerp(y + 1.2, 9.6, j) + jy, 30, -1.5); S.vest(R); R.look('serious', c.T); R.armL.rotation.x = R.armR.rotation.x = -2.6; R.legL.rotation.x = -0.6; R.legR.rotation.x = 0.5;
  const g = S.C('gentB'); S.board(g, 'fore', 10.4, 12, 27, -1.6); g.armL.rotation.x = g.armR.rotation.x = -1.5; g.look('surprised', c.T);
  fillAt(X, 24, 14, 38, 80, 40); move(S.cam, [32, 13, 44], [14, 11.5, 30], [29, 12.5, 41], [13, 11.5, 30], k, 34); S.post(c.T); };
SHOT('c7:1', 'a2_c71', c => { if (c.k < C7A) return seaC71(c); const S = c.S.cur, i = c.k < C7B ? 1 : 2, k = i === 1 ? (c.k - C7A) / (C7B - C7A) : (c.k - C7B) / (1 - C7B); belowC7({ ...c, S, cam: S.cam }, S, i, k); S.post(c.T); });
