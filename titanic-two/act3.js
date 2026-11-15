// Chapter 4: The Door (d1-d7) + Chapter 5: The Door Fits Two (e1-e9). Everything plays on the shared 'sea' set.
import { THREE, SHOT, LINE, move, shot, shake, cuts, clamp, ease, lerp, hash, M, box, makeVest } from './engine.js';
const PI = Math.PI;

// ---- extras added to the shared sea set on first use (hidden again every frame by the wrapped pre) ----
function EX(S) {
  if (S._a3) return S._a3; const s = S.s, X = {};
  X.fill = new THREE.PointLight(0x9fbcff, 0, 60); X.fill.position.set(-4, 9, -7); s.add(X.fill);
  X.key = new THREE.PointLight(0xcfe0ff, 0, 40); X.key.position.set(3, 5, 8); s.add(X.key);
  X.warm = new THREE.SpotLight(0xffe2a8, 0, 260, 0.16, 0.6); s.add(X.warm, X.warm.target);
  X.lantern = new THREE.PointLight(0xffd08a, 0, 40); s.add(X.lantern);
  X.beam = new THREE.Group(); s.add(X.beam); const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 90, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xffeeb0, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, fog: false })); cone.rotation.x = -PI / 2; cone.position.z = 45; X.beam.add(cone);
  // milky way
  const N = 900, p = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = -0.2 + hash(i) * 3.5, w = (hash(i + 0.3) - 0.5) * 0.28 * (0.4 + hash(i + 0.6)), R = 1150; p.set([Math.cos(a) * Math.cos(0.5 + w) * R, Math.sin(0.5 + w + Math.sin(a) * 0.5) * R * 0.9 + 80, Math.sin(a) * Math.cos(0.5 + w) * R], i * 3); }
  X.milky = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xcfdcff, size: 2.0, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })); X.milky.geometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); X.milky.frustumCulled = false; s.add(X.milky);
  // breath puffs, splashes, bubbles
  const pm = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.16, depthWrite: false });
  X.puffs = Array.from({ length: 10 }, () => { const m = box(0.3, 0.3, 0.3, pm, 0, -50, 0, s); m.castShadow = false; return m; });
  X.splash = Array.from({ length: 16 }, () => { const m = box(0.4, 0.4, 0.4, new THREE.MeshBasicMaterial({ color: 0xdff1ff }), 0, -50, 0, s); m.castShadow = false; return m; });
  // loose lifejacket, the one tied under the door, straps, whistle, plank, sound rings
  X.vest = makeVest(); s.add(X.vest); X.under = new THREE.Group(); const uv = makeVest(); uv.position.set(0, -3.15, 0); X.under.add(uv); s.add(X.under);
  X.straps = [-0.7, 0.7].map(x => { const g = new THREE.Group(); box(0.16, 0.08, 1.5, 0x8a7a5a, x, 0.24, 1.0, g); box(0.16, 0.5, 0.08, 0x8a7a5a, x, 0.02, 1.72, g); s.add(g); return g; });
  X.whistle = new THREE.Group(); box(0.5, 0.2, 0.2, 0xcfd6de, 0, 0, 0, X.whistle); box(0.2, 0.3, 0.22, 0xaab3bd, 0.2, 0.1, 0, X.whistle); s.add(X.whistle);
  X.plank = box(3.4, 0.25, 1.3, 0x6a4a2e, 0, -50, 0, s);
  X.rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false })); s.add(m); return m; });
  // band instruments
  X.inst = [0, 1, 2].map(() => { const g = new THREE.Group(); box(0.5, 1.3, 0.25, 0x8a4a22, 0, 0, 0, g); box(0.14, 1.0, 0.14, 0x3a2412, 0, 1.1, 0, g); return g; }); X.bows = [0, 1, 2, 3].map(() => { const g = new THREE.Group(); box(0.07, 1.9, 0.07, 0xe6dcc8, 0, 0, 0, g); return g; });
  X.cello = new THREE.Group(); box(1.3, 2.6, 0.6, 0x7a3f1c, 0, 1.6, 0, X.cello); box(0.25, 1.8, 0.25, 0x3a2412, 0, 3.7, 0, X.cello); box(0.1, 0.5, 0.1, 0x222222, 0, 0.1, 0, X.cello);
  X.frost = null; X.all = [X.vest, X.under, ...X.straps, X.whistle, X.plank, ...X.rings, X.beam, X.milky];
  const pre0 = S.pre.bind(S);
  S.pre = function (T) {
    pre0(T); X.fill.intensity = X.key.intensity = X.warm.intensity = X.lantern.intensity = 0; X.all.forEach(o => o.visible = false);
    X.puffs.forEach(m => m.position.y = -50); X.splash.forEach(m => m.position.y = -50); X.plank.position.y = -50;
    [...X.inst, ...X.bows, X.cello].forEach(o => { if (o.parent) o.parent.remove(o); }); if (X.frost) X.frost.visible = false;
    for (const c of Object.values(S.chars)) c.g.rotation.order = 'XYZ';
  };
  return S._a3 = X;
}
const SEA = (key, fn) => SHOT(key, 'sea', c => { const X = EX(c.S); c.S.pre(c.T); fn(c, c.S, X); c.S.post(c.T); });
const world = (S, grp, x, y, z) => { S.ship.updateMatrixWorld(true); const v = new THREE.Vector3(x, y, z); grp.localToWorld(v); return [v.x, v.y, v.z]; };
const tag = (t, x = 110, y = 130, col = '#ffd24a') => `<div style="position:absolute;left:${x}px;top:${y}px;font-size:30px;letter-spacing:8px;font-weight:800;color:${col};text-shadow:0 2px 10px #000">${t}</div>`;

// ---- the water around the door (ship gone) ----
function water(S, X, T, o = {}) {
  S.mode('night'); S.ship.visible = false; S.lights = 0; S.debris = o.debris ?? 1; S.swimmers = o.sw ?? 0.3; X.fill.intensity = o.fill ?? 260; X.key.intensity = o.key ?? 90; X.milky.visible = true;
  const bob = Math.sin(T * 1.3) * 0.06; S.door.visible = o.door !== false; S.door.position.set(0, (o.dy ?? 0.25) + bob, 0); S.door.rotation.set(o.tilt || 0, 0, 0); return (o.dy ?? 0.25) + bob + 0.2;   // returns door-top y
}
const puff = (X, i, p, T, ph = 0) => { const k = (T * 0.45 + ph) % 1; for (let j = 0; j < 3; j++) { const m = X.puffs[i * 3 + j]; if (!m) return; const kk = (k + j * 0.12) % 1; m.position.set(p[0] + 0.5 + kk * 0.9 + Math.sin(j * 2 + T) * 0.08, p[1] + 0.9 + kk * 1.1, p[2] - 0.2); m.scale.setScalar(0.12 + kk * 0.4); } };
function roseLie(S, T, top, vest = true, o = {}) { const r = S.C('rose'); S.put(r, 2.6, top + 0.6 - (o.dip || 0) * 0.5, -0.35 + (o.slide || 0)); r.g.rotation.order = 'YXZ'; r.g.rotation.set(-PI / 2 + (o.roll || 0), PI / 2, 0); if (vest) S.vest(r); r.look(o.expr || 'sad', T); r.armL.rotation.set(0, 0, -0.3); r.head.rotation.z = -0.5; return r; }
function jackWater(S, T, o = {}) { const j = S.C('jack'); S.put(j, o.x ?? 0.3, (o.y ?? -3.5) + Math.sin(T * 1.3 + 1) * 0.05, o.z ?? 2.45, o.ry ?? PI); const a = o.arms ?? 1; j.armL.rotation.set(-1.52 * a, 0, 0.12); j.armR.rotation.set(-1.52 * a, 0, -0.12); j.look(o.expr || 'sad', T); return j; }
function sitOn(S, ch, x, top, z, ry) { S.put(ch, x, top - 1.5, z, ry); ch.sit(); return ch; }
function frost(S, X, k) { const j = S.C('jack'); if (!X.frost) { X.frost = new THREE.Group(); for (let i = 0; i < 14; i++) box(0.16, 0.12, 0.16, 0xeaf4ff, (hash(i) - 0.5) * 1.3, 1.52 + hash(i + 0.3) * 0.08, (hash(i + 0.6) - 0.5) * 1.2, X.frost); for (let i = 0; i < 5; i++) box(0.12, 0.1, 0.06, 0xeaf4ff, (hash(i + 2) - 0.5) * 0.9, 0.95 + hash(i + 5) * 0.2, 0.67, X.frost); j.head.add(X.frost); } X.frost.visible = k > 0; X.frost.children.forEach((m, i) => m.visible = hash(i + 0.9) < k); }
function huddle(S, X, T, top, o = {}) {
  const r = S.C('rose'), j = S.C('jack'); sitOn(S, r, -1.25, top, -0.75, 0.3); sitOn(S, j, 1.25, top, -0.75, -0.3);
  const rub = Math.sin(T * 7) * 0.12 * (o.rub ?? 1); r.armL.rotation.set(-0.9, 0, 0.75 + rub); r.armR.rotation.set(-0.6, 0, -0.2); j.armR.rotation.set(-0.9, 0, -0.75 - rub); j.armL.rotation.set(-0.6, 0, 0.2);
  r.body.rotation.z = -0.1; j.body.rotation.z = 0.1; r.body.position.x = Math.sin(T * 23) * 0.012; j.body.position.x = Math.sin(T * 21 + 1) * 0.012;
  r.look(o.re || 'smirk', T, o.rt || 0); j.look(o.je || 'smirk', T);
  puff(X, 0, [-1.1, top + 3.0, 0.2], T, 0); puff(X, 1, [1.1, top + 3.0, 0.2], T, 0.5);
  X.under.visible = true; X.under.position.set(0, top - 0.75, 0.6); X.straps.forEach(g => { g.visible = true; g.position.set(0, top - 0.2, 0); });
  return [r, j];
}

// ================= d1: the band, the lights =================
SEA('d1:0', (c, S, X) => {
  S.mode('night'); S.sink(0.34 + c.k * 0.03); S.deckBoats = false;
  const names = ['gentA', 'gentB', 'designer', 'steward'];
  names.forEach((n, i) => { const m = S.C(n); S.board(m, 'fore', 3.4 + (i % 2) * 0.9, 21, 23.5 + i * 2.6, -PI / 2 + (i - 1.5) * 0.14); m.look('serious', c.T); const bw = X.bows[i]; m.armR.add(bw); bw.position.set(0, -2.0, 0.7); bw.rotation.set(0.3, 0, 1.2); m.armR.rotation.set(-1.25 + Math.sin(c.T * 5 + i) * 0.28, 0, -0.5); if (i < 3) { const v = X.inst[i]; m.armL.add(v); v.position.set(0.1, -2.1, 0.6); v.rotation.set(-1.2, 0, 0.5); m.armL.rotation.set(-1.5, 0, 0.55); m.head.rotation.z = 0.22; } else { m.body.add(X.cello); X.cello.position.set(0, 0, 1.1); m.armL.rotation.set(-1.0, 0, 0.2); } m.body.rotation.z = Math.sin(c.T * 1.6 + i) * 0.04; });
  ['steerA', 'ladyB', 'steerB', 'civD'].forEach((n, i) => { const m = S.C(n); const z = 52 - ((c.l * (7 + i) + i * 9) % 44); S.board(m, 'fore', 6.6 + (i % 2) * 1.6, 21, z, PI); m.walk(c.T * (11 + i) + i, 0.9); S.vest(m); m.look('surprised', c.T); });
  const p0 = world(S, S.fore, -9.0, 24.2, 30), p1 = world(S, S.fore, -7.6, 24.0, 28), l0 = world(S, S.fore, 4, 23.4, 27.2);
  move(c.cam, p0, l0, p1, l0, c.k, 40);
});
SEA('d1:1', (c, S) => { S.mode('night'); S.sink(0.38 + c.k * 0.05); S.deckBoats = false; S.boats.slice(0, 4).forEach((b, i) => { b.visible = true; b.position.set(150 + i * 26, 0, 40 + i * 34); b.rotation.y = 0.6 + i; }); move(c.cam, [250, 16, 190], [0, 16, 10], [215, 22, 165], [0, 18, 0], c.k, 38); });
SEA('d1:2', (c, S) => { S.mode('night'); S.sink(0.44 + c.k * 0.04); S.deckBoats = false; const t = c.l; S.lights = t < 0.5 ? 1 : t < 0.62 ? 0.25 : t < 0.7 ? 0.9 : 0; if (t > 0.7 && t < 0.95) c.flash(0.25 * (1 - (t - 0.7) / 0.25)); S.swimmers = 0.15; move(c.cam, [150, 7, -175], [0, 26, -40], [135, 9, -165], [0, 30, -45], c.k, 40); });

// ================= d2: stern rises, the break, the ride down =================
const sternFolk = (S, T, n = 6) => ['steerC', 'civA', 'civB', 'ladyA', 'steerA', 'steerB'].slice(0, n).forEach((nm, i) => { const m = S.C(nm); S.board(m, 'aft', -7 + i * 2.8, 14, -98 - (i % 3) * 5, PI); m.armL.rotation.x = m.armR.rotation.x = -1.3; m.body.rotation.x = 0.3; S.vest(m); m.look('surprised', T); });
SEA('d2:0', (c, S) => { S.mode('night'); S.lights = 0; S.sink(0.5 + c.k * 0.2); S.deckBoats = false; S.swimmers = 0.25; S.debris = 0.3; sternFolk(S, c.T); move(c.cam, [70, 5, -235], [0, 30, -95], [85, 8, -215], [0, 52, -85], c.k, 44); shake(c.cam, c.T, 0.05); });
SEA('d2:1', (c, S) => { S.mode('night'); S.lights = 0; S.sink(0.7 + ease(c.k * 1.15) * 0.1); S.deckBoats = false; S.swimmers = 0.3; S.debris = 0.5; sternFolk(S, c.T, 4); const hit = Math.abs(c.k - 0.3); if (hit < 0.06) c.flash(0.75 * (1 - hit / 0.06)); move(c.cam, [215, 26, -60], [0, 34, -40], [190, 18, -75], [0, 22, -45], c.k, 42); shake(c.cam, c.T, c.k > 0.25 ? 0.5 * (1 - c.k * 0.6) : 0.08); });
SEA('d2:2', (c, S) => {
  S.mode('night'); S.lights = 0; const k = 0.845 + c.k * 0.15; S.sink(k); S.deckBoats = false; S.swimmers = 0.3; S.debris = 0.6; EX(S).fill.intensity = 0;
  const pitch = S.ship.rotation.x + S.aft.rotation.x, r = S.C('rose'), j = S.C('jack');
  S.board(r, 'aft', -1.5, 13.4, -120.4, 0); S.board(j, 'aft', 1.5, 13.4, -120.4, 0); S.vest(r);
  for (const ch of [r, j]) { ch.g.rotation.x = -pitch; ch.armL.rotation.set(-1.5, 0, 0.1); ch.armR.rotation.set(-1.5, 0, -0.1); ch.body.rotation.x = 0.25; }
  r.look(c.k > 0.8 ? 'o' in {} ? 'surprised' : 'surprised' : 'surprised', c.T); j.look('serious', c.T); j.head.rotation.y = 0.5; r.head.rotation.y = -0.5 * ease((c.k - 0.5) * 3);
  const P = world(S, S.aft, 0, 15, -121); const [i, kk] = cuts(c.k, [0.5]);
  if (i === 0) { shot(c.cam, [P[0] + 7, P[1] + 5.5, P[2] + 13 - kk * 2], [P[0], P[1] + 3.6, P[2] + 1], 38, 0.06); }
  else { shot(c.cam, [P[0] + 34 - kk * 6, P[1] - 4 - kk * 4, P[2] + 44 - kk * 8], [P[0], P[1] - 8 - kk * 6, P[2]], 40, -0.05); }
  shake(c.cam, c.T, 0.07); if (c.k > 0.9) c.flash((c.k - 0.9) / 0.1);
  const X = EX(S); X.key.position.set(P[0] + 5, P[1] + 6, P[2] + 9); X.key.intensity = i === 0 ? 260 : 0; X.key.distance = 40;
});

// ================= d3: the surface =================
SEA('d3:0', (c, S, X) => {
  water(S, X, c.T, { door: false, sw: 0.25 }); X.key.position.set(3, 5, 8); X.key.distance = 40; if (c.l < 0.35) c.flash(1 - c.l / 0.35);
  const x = -3 + c.k * 2.2, j = jackWater(S, c.T, { x: x + 1.6, z: 0, y: -3.45, ry: 0.25, arms: 0.3, expr: 'serious' }), r = S.C('rose'); S.put(r, x - 1.4, -3.5 + Math.sin(c.T * 1.5) * 0.06, 0.3, 0.2); S.vest(r); r.look('surprised', c.T); r.armL.rotation.set(-1.2, 0, 0.5); j.armR.rotation.set(-1.1, 0, 0.9 + Math.sin(c.T * 4) * 0.2);
  puff(X, 0, [x - 1.3, 1.1, 1.0], c.T, 0); puff(X, 1, [x + 1.7, 1.15, 0.8], c.T, 0.4);
  move(c.cam, [1.5, 1.7, 12], [-0.6, 1.0, 0], [0.5, 1.5, 9.5], [-0.2, 1.0, 0], c.k, 32);
});
SEA('d3:1', (c, S, X) => {
  water(S, X, c.T, { door: false, sw: 0.55, fill: 500 }); X.fill.position.set(0, 60, 0); X.fill.distance = 400;
  S.boats.slice(0, 4).forEach((b, i) => { b.visible = true; b.position.set(-190 + i * 120, 0, -200 - (i % 2) * 40); b.rotation.y = i; });
  jackWater(S, c.T, { x: 1.2, z: 0, y: -3.45, ry: 0, arms: 0.3 }); const r = S.C('rose'); S.put(r, -1.6, -3.5, 0.3, 0); S.vest(r);
  move(c.cam, [0, 46, 80], [0, 0, -20], [0, 80, 120], [0, 0, -40], c.k, 44);
  c.dom(tag('APRIL 15, 1912 · 2:20 AM', 110, 130) + `<div style="position:absolute;left:110px;top:178px;font-size:44px;font-weight:800;color:#dfe8f4;text-shadow:0 2px 12px #000;opacity:${clamp((c.l - 0.4) / 0.5)}">More than 1,500 people did not come home.</div>`);
});
SEA('d3:2', (c, S, X) => {
  water(S, X, c.T, { door: false, sw: 0.35 }); S.boats.slice(0, 3).forEach((b, i) => { b.visible = true; b.position.set(150 + i * 46, 0, -110 - i * 30); b.rotation.y = 0.8 + i * 0.4; });
  X.lantern.position.set(150, 3, -108); X.lantern.intensity = 300;
  move(c.cam, [8, 3.2, -6], [170, 2, -125], [11, 3.6, -8.5], [170, 2, -125], c.k, 30);
});

// ================= d4: the panel =================
SEA('d4:0', (c, S, X) => {
  const top = water(S, X, c.T), [i, k] = cuts(c.k, [0.48]);
  if (i === 0) { const x = -9 + ease(k) * 5.2; jackWater(S, c.T, { x: x + 1.5, z: 1.2, y: -3.45, ry: PI / 2 - 0.3, arms: 0.5, expr: 'serious' }); const r = S.C('rose'); S.put(r, x - 0.6, -3.5, 1.6, PI / 2 - 0.2); S.vest(r); r.look('sad', c.T); move(c.cam, [5, 4.2, 13], [-2, 0.6, 0.5], [3, 3.6, 11], [-1, 0.6, 0.5], k, 34); }
  else { roseLie(S, c.T, top, true, { expr: 'sad', roll: (1 - ease(k * 2)) * 0.5 }); const j = jackWater(S, c.T, { expr: 'serious' }); j.armL.rotation.x = j.armR.rotation.x = -1.9 + ease(k * 2) * 0.4; move(c.cam, [-6.5, 3.6, -7.5], [0.4, 1.0, 0.6], [-5.2, 3.2, -6.4], [0.4, 1.0, 0.6], k, 34); }
});
SEA('d4:1', (c, S, X) => { const a = ease(c.k) * 0.3, top = water(S, X, c.T, { tilt: a, dy: 0.25 - a * 0.6 }); roseLie(S, c.T, top, true, { expr: 'surprised', slide: a * 1.6, dip: a * 0.8 }); const j = jackWater(S, c.T, { y: -3.5 + ease(c.k) * 1.5, z: 2.3 - ease(c.k) * 0.5, expr: 'serious' }); j.body.rotation.x = 0.3 * ease(c.k); move(c.cam, [7.5, 2.6, 5.5], [0, 0.8, 0.6], [6.5, 2.4, 4.6], [0, 0.8, 0.6], c.k, 34); });
SEA('d4:2', (c, S, X) => {
  const a = 0.3 + Math.sin(clamp(c.k * 1.4) * PI) * 0.3, top = water(S, X, c.T, { tilt: a, dy: 0.25 - a * 0.7 }); roseLie(S, c.T, top, true, { expr: 'surprised', slide: a * 1.9, dip: a * 0.9, roll: 0.25 });
  jackWater(S, c.T, { y: -2.0 - c.k * 0.6, z: 1.8, expr: 'surprised' });
  X.splash.forEach((m, i) => { const t = c.l * 1.6 - hash(i) * 0.3; if (t > 0 && t < 1) m.position.set((hash(i + 1) - 0.5) * 6, 0.2 + t * (3 + hash(i + 2) * 3) - t * t * 6, 1.6 + (hash(i + 3) - 0.3) * 2.2 * t); });
  move(c.cam, [-7, 4.4, 7], [0, 0.6, 0.8], [-6.2, 4.0, 6.2], [0, 0.6, 0.8], c.k, 36); shake(c.cam, c.T, 0.07);
});
SEA('d4:3', (c, S, X) => { const top = water(S, X, c.T); roseLie(S, c.T, top, true, { expr: 'sad' }); const j = jackWater(S, c.T, { y: -2.6 - ease(c.k * 1.6) * 0.9, expr: 'sad' }); puff(X, 0, [0.3, 1.1, 1.6], c.T, 0.2); move(c.cam, [-7.2, 3.2, -6.4], [0.5, 1.0, 0.8], [-5.6, 2.8, -5.4], [0.4, 1.0, 0.8], c.k, 32); });

// ================= d5-d7: the ending you know, then the rewind =================
function origEnd(S, X, T, ph, camK) {     // ph 0 = Jack at the door ... 1 = Rose alone
  const top = water(S, X, T, { sw: 0.25 * (1 - ph * 0.6), fill: 240 }), r = roseLie(S, T, top, true, { expr: ph > 0.75 ? 'sleep' : 'sad' }); r.armL.rotation.set(0, 0, -0.3 - 0.9 * (1 - ph));
  const gone = ph > 0.72; if (!gone) { const j = jackWater(S, T, { expr: ph > 0.45 ? 'sleep' : 'sad', arms: 1 - ease((ph - 0.5) / 0.22) * 0.75, y: -3.5 - ease((ph - 0.5) / 0.22) * 0.25 }); j.head.rotation.x = 0.35 * ease(ph * 2); frost(S, X, ph * 1.5); puff(X, 0, [0.3, 1.0, 1.6], T, 0.2); }
  S.boats[0].visible = ph > 0.6; S.boats[0].position.set(-150 + ph * 20, 0, 120); S.boats[0].rotation.y = 2.2; X.lantern.position.set(-140, 3, 118); X.lantern.intensity = ph > 0.6 ? 400 : 0;
  puff(X, 1, [-2.2, top + 1.1, -0.2], T, 0.6);
  if (camK !== undefined) move(S.cam, [-6.4, 3.0, -5.8], [0.4, 1.0, 0.8], [-4.8, 4.6, -8.4], [0.2, 0.7, 0.6], camK, 32);
}
SEA('d5:0', (c, S, X) => { origEnd(S, X, c.T, c.k * 0.4); move(c.cam, [-5.6, 2.8, -5.4], [0.4, 1.0, 0.8], [-4.4, 2.4, -4.6], [0.4, 1.05, 0.9], c.k, 30); });
SEA('d5:1', (c, S, X) => { const [i, k] = cuts(c.k, [0.34]); if (i === 0) { origEnd(S, X, c.T, 0.4 + k * 0.31); move(c.cam, [2.2, 1.9, -6.2], [0.3, 0.9, 1.6], [1.4, 1.7, -5.4], [0.3, 0.9, 1.6], k, 28); } else { origEnd(S, X, c.T, 0.74 + k * 0.26, k); if (k < 0.12) c.fade(1 - k / 0.12); } });
const frozen = (c, S, X) => { origEnd(S, X, 181.4, 1, 1); };
SEA('d6', (c, S, X) => {
  frozen(c, S, X); const k = ease(c.l / 0.35);
  c.dom(`<div style="position:absolute;inset:0;backdrop-filter:grayscale(${0.85 * k}) brightness(${1 + 0.12 * k});background:rgba(120,170,225,${0.16 * k})"></div><div style="position:absolute;left:${150 * k}px;right:${150 * k}px;top:${92 + 70 * k}px;bottom:${92 + 70 * k}px;border:6px solid rgba(255,255,255,${0.85 * k});box-shadow:0 0 0 2000px rgba(0,0,0,${0.5 * k})"></div>` + tag('● THE ORIGINAL ENDING', 190, 196, '#fff'));
});
SEA('d7', (c, S, X) => {
  const e = LINE.d7.sents[0].end, rk = clamp(c.l / 1.5), ph = 1 - ease(rk) * 0.98; origEnd(S, X, 181.4 - rk * 6, Math.max(0.02, ph)); frost(S, X, ph);
  move(c.cam, [-4.8, 4.6, -8.4], [0.2, 0.7, 0.6], [-6.6, 3.2, -6.2], [0.4, 1.0, 0.8], rk, 32);
  let h = ''; if (rk < 1) { for (let i = 0; i < 9; i++) { const y = 110 + hash(i + Math.floor(c.T * 24)) * 780; h += `<div style="position:absolute;left:0;right:0;top:${y}px;height:${3 + hash(i) * 5}px;background:rgba(255,255,255,${0.12 + hash(i + 3) * 0.2})"></div>`; } h += tag('◀◀ REWIND', 110, 130, '#fff'); }
  const tk = clamp((c.T - e + 1.3) / 0.35); if (tk > 0) h += `<div style="position:absolute;left:0;right:0;top:330px;text-align:center;font-size:42px;letter-spacing:12px;font-weight:800;color:#fff;opacity:${tk};text-shadow:0 3px 14px #000">BUT</div><div style="position:absolute;left:0;right:0;top:380px;text-align:center;font-size:${150 - 14 * ease(tk)}px;font-weight:900;letter-spacing:2px;color:#ffd24a;opacity:${tk};-webkit-text-stroke:14px #000;paint-order:stroke fill">THE DOOR FITS TWO</div>`;
  c.dom(h); const endk = (c.T - (LINE.d7.slot[1] - 0.45)) / 0.4; if (endk > 0) c.flash(clamp(endk));
});

// ================= e1: why it failed =================
const DIAG = (people, sinkY, vest, note, col = '#ffd24a') => {
  const wl = 560, dy = wl - 26 + sinkY, fig = (x, blue) => `<div style="position:absolute;left:${x}px;top:${dy - 46}px;width:150px;height:44px;border-radius:14px;background:${blue ? '#6f9ad8' : '#f2c9a4'};border:5px solid #14161c"></div><div style="position:absolute;left:${x - 44}px;top:${dy - 50}px;width:50px;height:50px;border-radius:12px;background:${blue ? '#8fb4ea' : '#f6d8c2'};border:5px solid #14161c"></div>`;
  return `<div style="position:absolute;left:300px;right:300px;top:170px;bottom:250px;background:rgba(6,10,20,.86);border:3px solid rgba(255,255,255,.25);border-radius:22px;overflow:hidden">
  <div style="position:absolute;left:0;right:0;top:${wl - 170}px;bottom:0;background:linear-gradient(#17406a,#0a1c33)"></div><div style="position:absolute;left:0;right:0;top:${wl - 172}px;height:5px;background:#9fd0ff"></div>
  <div style="position:absolute;left:40px;top:${wl - 215}px;font-size:24px;letter-spacing:5px;font-weight:800;color:#9fd0ff">WATERLINE · −2°C</div>
  <div style="position:absolute;left:0;top:-170px;right:0;bottom:0">
  ${vest ? `<div style="position:absolute;left:560px;top:${dy + 26}px;width:200px;height:40px;border-radius:8px;background:repeating-linear-gradient(90deg,#f2efe6 0 30px,#c9c4b4 30px 36px);border:5px solid #14161c"></div>` : ''}
  <div style="position:absolute;left:440px;top:${dy}px;width:440px;height:28px;border-radius:6px;background:#8a5f3a;border:5px solid #14161c"></div>
  ${people > 0 ? fig(500, sinkY > 20) : ''}${people > 1 ? fig(700, sinkY > 20) : ''}</div>
  <div style="position:absolute;left:0;right:0;top:36px;text-align:center;font-size:54px;font-weight:900;color:${col}">${note}</div></div>`;
};
SEA('e1:0', (c, S, X) => { const top = water(S, X, c.T, { sw: 0.2 }); roseLie(S, c.T, top, true); jackWater(S, c.T); const a = 0.6 + c.k * 0.9; shot(c.cam, [Math.sin(a) * 13, 6 - c.k * 1.5, Math.cos(a) * -13], [0, 0.6, 0.5], 34); if (c.T > LINE.e1.sents[0].start - 0.2) c.dom(tag('6 FT × 3 FT OF SOLID OAK · ROOM FOR TWO ✓', 110, 130)); });
SEA('e1:1', (c, S, X) => { const top = water(S, X, c.T, { sw: 0.2 }); roseLie(S, c.T, top, true); jackWater(S, c.T); move(c.cam, [10, 3, -9], [0, 0.8, 0.5], [9, 2.8, -8], [0, 0.8, 0.5], c.k, 34); c.dom(DIAG(1, 14 * ease(c.k * 2), false, 'ONE PERSON: IT SITS LOW')); });
SEA('e1:2', (c, S, X) => { const a = ease(c.k * 1.6), top = water(S, X, c.T, { sw: 0.2 }); roseLie(S, c.T, top, true); jackWater(S, c.T); move(c.cam, [9, 2.8, -8], [0, 0.8, 0.5], [8, 2.6, -7], [0, 0.8, 0.5], c.k, 34); c.dom(DIAG(a > 0.25 ? 2 : 1, 14 + 44 * ease((c.k - 0.2) * 2.2), false, c.k > 0.5 ? 'TWO PEOPLE: UNDER THE SURFACE. BOTH FREEZE.' : 'TWO PEOPLE…', c.k > 0.5 ? '#ff6b7d' : '#ffd24a')); });

// ================= e2-e4: the fix =================
function roseSit(S, T, top, vest, expr = 'serious') { const r = sitOn(S, S.C('rose'), -0.4, top, -0.7, 0.15); if (vest) S.vest(r); r.look(expr, T); return r; }
SEA('e2:0', (c, S, X) => {
  const top = water(S, X, c.T), up = ease(c.k / 0.5);
  if (up < 0.5) roseLie(S, c.T, top, true, { expr: 'serious' }); else { const r = roseSit(S, c.T, top, true); r.armR.rotation.set(-1.35, 0, 0.05); r.body.rotation.x = 0.25; }
  const j = jackWater(S, c.T, { arms: 0.55 + 0.45 * ease((c.k - 0.5) * 2), expr: c.k > 0.55 ? 'surprised' : 'sad' }); frost(S, X, 0.25);
  move(c.cam, [9.5, 3.4, 4.5], [0, 1.6, 0.8], [8, 3.0, 3.6], [0, 1.7, 0.8], c.k, 32);
});
SEA('e2:1', (c, S, X) => {
  const top = water(S, X, c.T), off = ease((c.k - 0.3) / 0.4), r = roseSit(S, c.T, top, off < 0.5, 'serious'); r.armL.rotation.set(-1.2, 0, 0.35 - off * 0.3); r.armR.rotation.set(-1.2, 0, -0.35 + off * 0.3);
  if (off >= 0.5) { X.vest.visible = true; X.vest.position.set(-0.4, top - 1.5 + 0.2 + (off - 0.5) * 0.6, -0.7 + 1.0 + (off - 0.5) * 1.2); X.vest.rotation.set(-0.5 * (off - 0.5) * 2, 0.15, 0); }
  jackWater(S, c.T, { expr: 'surprised' }); frost(S, X, 0.25);
  move(c.cam, [4.6, 3.6, 8.6], [-0.3, 2.6, 0], [3.4, 3.4, 7.4], [-0.3, 2.6, 0], c.k, 30);
});
SEA('e3', (c, S, X) => {
  const top = water(S, X, c.T), k = ease(c.k * 1.5), r = roseSit(S, c.T, top, false, 'serious'); r.body.rotation.x = 0.55; r.armL.rotation.set(-0.6, 0, 0.2); r.armR.rotation.set(-0.6, 0, -0.2);
  X.under.visible = true; X.under.position.set(lerp(-0.4, 0, k), lerp(top + 0.9, top - 0.75, k), lerp(1.6, 0.6, k)); X.under.rotation.set(lerp(-1.2, 0, k), 0, 0);
  X.straps.forEach(g => { g.visible = c.k > 0.6; g.position.set(0, top - 0.2, 0); });
  X.splash.slice(0, 8).forEach((m, i) => { const t = (c.l * 1.1 + hash(i)) % 1; m.position.set((hash(i + 1) - 0.5) * 3.4, 0.1 + t * 0.9, 1.9 + hash(i + 2) * 0.6); m.scale.setScalar(0.5 * (1 - t)); });
  jackWater(S, c.T, { expr: 'surprised', x: 2.6 }); frost(S, X, 0.25);
  move(c.cam, [3.6, 5.6, 8.6], [0, 0.4, 1.0], [2.6, 4.8, 7.4], [0, 0.4, 1.2], c.k, 32);
});
SEA('e4:0', (c, S, X) => { const top = water(S, X, c.T, { dy: 0.25 }); roseSit(S, c.T, top, false, 'smirk'); jackWater(S, c.T, { x: 2.6, expr: 'surprised' }); frost(S, X, 0.25); X.under.visible = true; X.under.position.set(0, top - 0.75, 0.6); move(c.cam, [9, 2.8, -8], [0, 1.2, 0.5], [8, 2.6, -7], [0, 1.2, 0.5], c.k, 34); const a = ease((c.k - 0.25) * 2); c.dom(DIAG(2, 58 - 76 * a, true, a > 0.6 ? 'LIFEJACKET UNDERNEATH: IT FLOATS TWO ✓' : 'ADD THE LIFEJACKET…', a > 0.6 ? '#7dffb0' : '#ffd24a')); });
SEA('e4:1', (c, S, X) => { const dy = 0.25 + ease(c.k) * 0.45, top = water(S, X, c.T, { dy }); roseSit(S, c.T, top, false, 'smirk'); jackWater(S, c.T, { x: 2.6, expr: 'surprised' }); frost(S, X, 0.25); X.under.visible = true; X.under.position.set(0, top - 0.75, 0.6); X.straps.forEach(g => { g.visible = true; g.position.set(0, top - 0.2, 0); }); move(c.cam, [5.5, 1.3, 9], [0, 0.7, 0.6], [4.4, 1.2, 7.6], [0, 0.8, 0.6], c.k, 30); });
SEA('e4:2', (c, S, X) => { const top = water(S, X, c.T, { dy: 0.7 }); roseSit(S, c.T, top, false, 'smirk'); const j = jackWater(S, c.T, { x: 2.2, y: -3.3, expr: 'smirk' }); j.armL.rotation.x = j.armR.rotation.x = -1.5 - Math.sin(clamp(c.k) * PI) * 0.25; frost(S, X, 0.25); X.under.visible = true; X.under.position.set(0, top - 0.75, 0.6); X.straps.forEach(g => { g.visible = true; g.position.set(0, top - 0.2, 0); }); move(c.cam, [-6.8, 3.2, -6.0], [0.8, 1.2, 0.8], [-6.0, 3.0, -5.4], [0.8, 1.2, 0.8], c.k, 32); });
SEA('e4:3', (c, S, X) => {
  const top = water(S, X, c.T, { dy: 0.7 }), k = ease(c.k * 1.25);
  if (k < 0.55) { const kk = k / 0.55; roseSit(S, c.T, top, false, 'smirk').armR.rotation.set(-1.3, 0, -0.4); const j = jackWater(S, c.T, { x: 2.2 - kk * 0.6, y: -3.3 + kk * 2.3, z: 2.45 - kk * 1.6, expr: 'serious' }); j.body.rotation.x = 0.5 * kk; frost(S, X, 0.25); X.under.visible = true; X.under.position.set(0, top - 0.75, 0.6); X.straps.forEach(g => { g.visible = true; g.position.set(0, top - 0.2, 0); }); X.splash.slice(0, 10).forEach((m, i) => { const t = kk * 1.3 - hash(i) * 0.3; if (t > 0 && t < 1) m.position.set(1.6 + (hash(i + 1) - 0.5) * 3, 0.3 + t * 3 - t * t * 4, 2 + hash(i + 3) * 1.4); }); }
  else { const [r, j] = huddle(S, X, c.T, top, { re: 'joy', je: 'joy', rub: 0.4 }); frost(S, X, 0.2); }
  move(c.cam, [7.5, 3.6, 7.5], [0.6, 1.8, 0.2], [5.4, 3.6, 8.4], [0, 2.4, -0.4], c.k, 32);
});

// ================= e5-e6: holding on =================
SEA('e5', (c, S, X) => { const top = water(S, X, c.T, { dy: 0.7, sw: 0.15 }), [r, j] = huddle(S, X, c.T, top, { re: 'smirk', rt: c.talk, je: c.si ? 'joy' : 'smirk' }); frost(S, X, 0.15); r.head.rotation.y = 0.45; j.head.rotation.y = -0.45; r.body.position.x = Math.sin(c.T * 31) * 0.03; move(c.cam, [-1.8, top + 3.3, 8.2], [-0.9, top + 3.05, -0.6], [-1.4, top + 3.3, 7.2], [-0.8, top + 3.05, -0.6], c.k, 28); });
const orbit = (c, top, a0, a1, R = 13, h = 4.2) => { const a = lerp(a0, a1, c.k); shot(c.cam, [Math.sin(a) * R, top + h, Math.cos(a) * R], [0, top + 2.3, -0.5], 32); };
SEA('e6:0', (c, S, X) => { const top = water(S, X, c.T, { dy: 0.7, sw: 0.15 }); huddle(S, X, c.T, top, { re: 'smirk', je: 'smirk', rub: 1.3 }); orbit(c, top, -0.5, -0.2, 12); });
SEA('e6:1', (c, S, X) => { const top = water(S, X, c.T, { dy: 0.7, sw: 0.15 }), [r, j] = huddle(S, X, c.T, top, { re: 'joy', je: 'smirk', rub: 0.6 }); r.head.rotation.y = 0.5; j.head.rotation.y = -0.5; j.head.rotation.x = Math.sin(c.T * 5) * 0.06; shot(c.cam, [1.5 - c.k * 2, top + 6 + c.k * 5, 15 + c.k * 9], [0, top + 9 + c.k * 14, -20], 40); });
SEA('e6:2', (c, S, X) => { const top = water(S, X, c.T, { dy: 0.7, sw: 0.15 }), nod = c.k < 0.5, [r, j] = huddle(S, X, c.T, top, { re: nod ? 'serious' : 'smirk', je: nod ? 'sleep' : 'surprised', rub: 0.3 }); j.head.rotation.x = nod ? 0.45 * ease(c.k * 3) : 0; if (!nod) { r.armL.rotation.set(-1.2, 0, 1.0 + Math.sin(c.T * 18) * 0.15); j.body.position.x = Math.sin(c.T * 26) * 0.05; } r.head.rotation.y = 0.6; move(c.cam, [2.8, top + 3.4, 8.6], [0.6, top + 3.0, -0.6], [2.2, top + 3.4, 7.6], [0.5, top + 3.0, -0.6], c.k, 28); });

// ================= e7-e9: the boat comes back =================
function boat(S, X, T, bx, bz, ry, aim) {
  const b = S.boats[0]; b.visible = true; b.position.set(bx, Math.sin(T * 1.1) * 0.08, bz); b.rotation.y = ry;
  const o = S.C('officer'), fw = [Math.sin(ry), Math.cos(ry)]; S.put(o, bx + fw[0] * 3.2, 1.3, bz + fw[1] * 3.2, ry); o.armR.rotation.set(-1.45, 0, -0.15);
  ['steward', 'lookout'].forEach((n, i) => { const m = S.C(n); S.put(m, bx - fw[0] * (0.5 + i * 3), 1.3 - 1.5, bz - fw[1] * (0.5 + i * 3), ry + PI); m.sit(); const row = Math.sin(T * 2.2 + i * 0.4); m.armL.rotation.x = m.armR.rotation.x = -1.0 + row * 0.35; m.body.rotation.x = row * 0.15; m.look('serious', T); });
  const tp = [bx + fw[0] * 4.2, 5.2, bz + fw[1] * 4.2]; X.beam.visible = true; X.beam.position.set(...tp); X.beam.lookAt(...aim); X.warm.position.set(...tp); X.warm.target.position.set(...aim); X.warm.intensity = 9000;
  X.lantern.position.set(bx + fw[0] * 5, 3.2, bz + fw[1] * 5); X.lantern.intensity = 260; return o;
}
SEA('e7', (c, S, X) => {
  const top = water(S, X, c.T, { dy: 0.7, sw: 0.3 }); const [r, j] = huddle(S, X, c.T, top, { re: 'serious', je: 'serious', rub: 0.3 }); r.g.rotation.y = 2.4; j.g.rotation.y = 2.0;
  const bx = 150 - c.k * 26, bz = -95 + c.k * 16, sw = Math.sin(c.T * 1.1) * 60; const o = boat(S, X, c.T, bx, bz, -1.0, [bx - 70 + sw * 0.3, 0, bz + 50 + sw]); o.look('serious', c.T);
  const [i, k] = cuts(c.k, [0.45]); if (i === 0) move(c.cam, [-7, top + 4.4, 8.5], [60, 2, -40], [-8, top + 4.0, 9.5], [70, 2, -45], k, 34); else move(c.cam, [bx - 34, 5, bz + 30], [bx, 3.4, bz], [bx - 26, 4.4, bz + 22], [bx, 3.4, bz], k, 30);
});
SEA('e8', (c, S, X) => { water(S, X, c.T, { door: false, sw: 0.3 }); const bx = 70, bz = -44, sw = Math.sin(c.T * 1.6) * 40; const o = boat(S, X, c.T, bx - c.k * 3, bz + c.k * 2, -1.0, [bx - 60 + sw * 0.4, 0, bz + 40 + sw]); o.look('serious', c.T, c.talk); o.armL.rotation.set(-2.6, 0, 0.5); o.head.rotation.y = Math.sin(c.T * 1.6) * 0.3; const h = [bx - 2.7, 6.1, bz + 1.7]; EX(S).key.position.set(h[0] - 4, 7, h[2] + 5); EX(S).key.intensity = 120; move(c.cam, [h[0] - 7.5, 6.4, h[2] + 6.5], h, [h[0] - 6.2, 6.3, h[2] + 5.4], h, c.k, 30); });
SEA('e9:0', (c, S, X) => {
  const top = water(S, X, c.T, { dy: 0.7, sw: 0.2 }), k = ease(c.k * 1.3), [r, j] = huddle(S, X, c.T, top, { re: 'surprised', je: 'serious', rub: 0 });
  X.plank.position.set(-4.6, 0.15 + Math.sin(c.T * 1.4) * 0.05, -0.2); X.plank.rotation.y = 0.5;
  r.body.rotation.z = 0.5 * Math.sin(clamp(k * 1.4) * PI); r.armL.rotation.set(-0.8, 0, 0.3); r.armR.rotation.set(-1.0 - k * 0.6, 0, -1.3 * Math.sin(clamp(k * 1.4) * PI) - 0.2);
  X.whistle.visible = true; const hp = k < 0.5 ? [-4.2, 0.45, -0.1] : [lerp(-4.2, -1.2, (k - 0.5) * 2), lerp(0.45, top + 2.9, (k - 0.5) * 2), lerp(-0.1, 0.3, (k - 0.5) * 2)]; X.whistle.position.set(...hp);
  move(c.cam, [-5.5, top + 3.4, 8.2], [-2.4, top + 1.6, -0.3], [-4.2, top + 3.6, 7.4], [-1.6, top + 2.4, -0.3], c.k, 30);
});
SEA('e9:1', (c, S, X) => {
  const top = water(S, X, c.T, { dy: 0.7, sw: 0.2 }), e = LINE.e9.sents[1].start, t = c.T - e, [i] = cuts(clamp(t / 1.5), [0.99]);
  const found = ease((t - 1.9) / 0.8), [r, j] = huddle(S, X, c.T, top, { re: i ? 'joy' : 'serious', je: found > 0.5 ? 'joy' : 'serious', rub: 0 });
  X.whistle.visible = true; X.whistle.position.set(-1.2, top + 2.9, 0.35); r.armR.rotation.set(-2.2, 0, 0.5);
  X.rings.forEach((m, n) => { const kk = ((t * 1.3 + n / 3) % 1); m.visible = t > 0.15 && t < 3.6; m.position.set(-1.2, top + 2.95, 0.6 + kk * 5); m.scale.setScalar(0.3 + kk * 2.6); m.material.opacity = 0.8 * (1 - kk); });
  if (t > 0.15 && t < 0.5) c.flash(0.35 * (1 - (t - 0.15) / 0.35));
  if (i === 0) move(c.cam, [-3.2, top + 3.2, 7.6], [-1.1, top + 3.0, -0.4], [-2.6, top + 3.2, 6.6], [-1.1, top + 3.0, -0.4], clamp(t / 1.5), 28);
  else {
    const kk = clamp((t - 1.5) / (LINE.e9.slot[1] - e - 1.5)), aim = [lerp(-70, 0, found), 1, lerp(60, 0, found)]; const o = boat(S, X, c.T, 62 - kk * 8, -40 + kk * 5, -1.0, aim); o.look('surprised', c.T);
    X.key.color.setHex(0xffe2a8); X.key.position.set(4, 7, -5); X.key.intensity = 900 * found; X.key.distance = 50; if (found > 0.3) { j.armR.rotation.set(-2.9, 0, -0.3 + Math.sin(c.T * 9) * 0.25); r.armR.rotation.set(-2.6, 0, 0.6 + Math.sin(c.T * 9 + 1) * 0.2); }
    move(c.cam, [-9, top + 4.6, 11], [0.5, top + 2.2, -0.5], [-6.5, top + 3.8, 8.6], [0.3, top + 2.4, -0.5], kk, 34);
    if (found < 1e-3) X.key.color.setHex(0xcfe0ff);
  }
  if (t <= 1.5) X.key.color.setHex(0xcfe0ff);
});
