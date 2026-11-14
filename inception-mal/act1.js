// Prologue (p1-p5) + Chapter 1: The Thief (a1-a8)
import { THREE, SET, SHOT, LINE, mkScene, move, shot, shake, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, label, makeChar, makeTop, ground } from './engine.js';

// ---------------- VOID: the spinning top ----------------
SET('void', () => {
  const { s, cam } = mkScene(0x05060a, [18, 70], 0xffffff, 0.15, [0x8899bb, 0x221a14, 0.5]);
  s.userData.bloom = 0.4;
  const t = new THREE.Mesh(new THREE.BoxGeometry(44, 1, 26), new THREE.MeshPhongMaterial({ color: 0x241a12, shininess: 90, specular: 0x886644 })); t.position.y = -0.5; t.receiveShadow = true; s.add(t);
  const sp = new THREE.SpotLight(0xffe2b8, 900, 60, 0.42, 0.7); sp.position.set(2, 16, 5); sp.castShadow = true; s.add(sp, sp.target);
  const top = makeTop(2.3); s.add(top);
  const N = 260, pos = new Float32Array(N * 3), dust = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffe2b8, size: 0.07, transparent: true, opacity: 0.6 })); dust.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); dust.frustumCulled = false; s.add(dust);
  const mal = put(makeChar('mal', 'smirk'), 4.2, -2.6, -6); s.add(mal.g);
  const rim = new THREE.PointLight(0xff3848, 0, 30); rim.position.set(-3, 5, -12); s.add(rim);
  const key = new THREE.PointLight(0xffd0b0, 0, 20); key.position.set(6, 3.5, -1); s.add(key);
  return { s, cam, top, mal, rim, key, pre(T) { for (let i = 0; i < N; i++) pos.set([(hash(i) - 0.5) * 14 + Math.sin(T * 0.3 + i) * 0.5, (hash(i + 0.3) * 9 + T * 0.12 * (0.5 + hash(i + 0.7))) % 9, (hash(i + 0.6) - 0.5) * 12], i * 3); dust.geometry.attributes.position.needsUpdate = true; mal.g.visible = false; rim.intensity = key.intensity = 0; top.userData.set(T, 0.035); } };
});
SHOT('p1', 'void', c => move(c.cam, [0, 6, 17], [0, 1.6, 0], [5, 3, 9], [0, 1.8, 0], c.k));
SHOT('p2', 'void', c => move(c.cam, [3.4, 2.2, 6.4], [0, 1.9, 0], [2.4, 2.0, 5.2], [0, 1.9, 0], c.k));
SHOT('p3', 'void', c => { c.S.top.userData.set(c.T, 0.11); move(c.cam, [0.01, 13, 5], [0, 0.5, 0], [0.01, 10, 4], [0, 0.5, 0], c.k, 35, c.k * 0.4); });
SHOT('p4', 'void', c => { const a = 0.5 + c.k * 1.3; shot(c.cam, [Math.sin(a) * 10, 3 + c.k, Math.cos(a) * 10], [0, 1.9, 0]); });
SHOT('p5', 'void', c => {
  const S = c.S, e = LINE.p5.sents[0].end; S.mal.g.visible = true; S.mal.reset(); S.mal.idle(c.T); S.mal.look('smirk', c.T); S.mal.head.rotation.z = 0.12;
  S.rim.intensity = 130 * ease(c.l / 1.5); S.key.intensity = 160 * ease((c.l - 0.5) / 1.5);
  move(c.cam, [0.5, 2.2, 12], [1.6, 1.8, -3], [1.2, 2.2, 9.5], [2.0, 2.0, -5], c.k, 35);
  if (c.T > e + 0.25) c.title(c.T - e - 0.25);
});

// ---------------- BEACH + CASTLE ----------------
SET('beach', () => {
  const { s, cam } = mkScene(0xc4d6e4, [60, 330], 0xfff0dc, 2.4, [0xffffff, 0x9a8f7a, 1.4], [-20, 30, 24], 60);
  ground(s, 500, '#d6c49c', '#decda8');
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 300), new THREE.MeshPhongMaterial({ color: 0x3c7f9f, shininess: 80, transparent: true, opacity: 0.93 })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.12, 160); s.add(sea);
  const foam = [0, 1, 2, 3, 4].map(i => { const f = box(500, 0.16, 1.3, 0xf4fbff, 0, 0.16, 14 + i * 9, s); f.castShadow = false; return f; });
  // cliff + castle
  const r = rng(31);
  for (let i = 0; i < 26; i++) box(14 + r() * 16, 10 + r() * 22, 14 + r() * 12, [0x6f6a62, 0x7b756b, 0x625d56][i % 3], (r() - 0.5) * 150, 6 + r() * 6, -62 - r() * 26, s).rotation.y = r();
  const C = new THREE.Group(); C.position.set(0, 26, -84); s.add(C);
  box(70, 10, 44, 0x8a857c, 0, -3, 0, C); box(62, 6, 38, 0x9a958c, 0, 4, 0, C);
  for (let i = 0; i < 5; i++) { const w = 46 - i * 7.5, d = 28 - i * 4.5, y = 9 + i * 9.5; box(w, 7.5, d, 0xf1ece0, 0, y + 3.7, 0, C); box(w + 9, 1.3, d + 9, 0x2f3d44, 0, y + 8.1, 0, C); box(w + 5, 1.1, d + 5, 0x394a52, 0, y + 9.2, 0, C); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const k = box(3, 0.9, 3, 0x2f3d44, sx * (w / 2 + 4.6), y + 8.9, sz * (d / 2 + 4.6), C); k.rotation.z = -sx * 0.4; } for (let j = -2; j <= 2; j++) box(2.2, 3, 0.3, 0x3a2f28, j * (w / 6), y + 3.5, d / 2 + 0.1, C); }
  box(3, 5, 3, 0xd9b24a, 0, 59, 0, C);
  for (let i = 0; i < 14; i++) { const x = (r() - 0.5) * 120, g = new THREE.Group(); g.position.set(x, 0, -34 - r() * 14); s.add(g); box(1, 7, 1, 0x5a3d26, 0, 3.5, 0, g); box(6, 2, 6, 0x2f5f45, 0, 8, 0, g); box(4.4, 2, 4.4, 0x356b4d, 0, 10, 0, g); }
  const cobb = makeChar('cobb', 'sleep'); s.add(cobb.g);
  const kids = [put(makeChar('boy'), 13, 0, -9, Math.PI + 0.3), put(makeChar('girl'), 16, 0, -10, Math.PI - 0.2)]; kids.forEach((k, i) => { k.g.scale.setScalar(0.62); k.body.rotation.x = 0.5; s.add(k.g); }); box(2.2, 1.2, 2.2, 0xcdb98c, 14.5, 0.6, -11.5, s); box(1.2, 1.2, 1.2, 0xcdb98c, 14.5, 1.8, -11.5, s);
  const guards = [makeChar('guard', 'serious'), makeChar('guard', 'serious')]; guards.forEach(g => { box(0.3, 0.3, 3.4, 0x1c1c1c, 0, -1.9, 1.2, g.armR); s.add(g.g); });
  return { s, cam, cobb, guards, kids, pre(T) { foam.forEach((f, i) => { const ph = (T * 0.22 + i * 0.2) % 1; f.position.z = 6 + (1 - ph) * 44; f.scale.z = 0.6 + ph * 1.6; }); cobb.reset(); cobb.g.rotation.set(-Math.PI / 2, Math.PI, 0); cobb.g.position.set(0, 0.55, 8 + Math.sin(T * 1.4) * 0.15); cobb.armL.rotation.z = -2.4; cobb.armR.rotation.z = 1.9; guards.forEach(g => g.g.visible = false); } };
});
SHOT('a1', 'beach', c => {
  const [i, k] = cuts(c.k, [0.5]); c.S.cobb.look('sleep', c.T);
  if (i === 0) move(c.cam, [12, 2.2, 9], [0, 0.6, 6], [9, 3, 7], [0, 0.6, 5.6], k, 32);
  else move(c.cam, [10, 3, 34], [0, 3, 0], [14, 9, 44], [0, 40, -84], k, 40);
});
SHOT('a2:0', 'beach', c => { const S = c.S; S.cobb.look(c.k > 0.35 ? 'serious' : 'sleep', c.T); S.cobb.head.rotation.x = -0.9 * ease((c.k - 0.3) / 0.3); const g = S.guards[0]; g.g.visible = true; put(g, -3.2, 0, 4.5, 0.9); g.reset(); g.armR.rotation.x = -0.9; move(c.cam, [2.0, 0.8, -1.5], [0, 1.1, 3.4], [1.4, 0.9, -0.6], [0, 1.2, 3.4], c.k, 34); });
SHOT('a2:1', 'beach', c => { c.S.guards.forEach((g, i) => { g.g.visible = true; put(g, -4 + i * 8, 0, 2 - c.k * 5, Math.PI); g.reset(); g.walk(c.T * 6 + i); }); c.S.cobb.g.position.set(0, 2.2, 1 - c.k * 5); move(c.cam, [0, 2.2, 22], [0, 30, -84], [0, 3, 12], [0, 44, -84], c.k, 46); });

// ---------------- THE GOLDEN HALL ----------------
SET('hall', () => {
  const { s, cam } = mkScene(0x120b06, [50, 150], 0xffc98a, 0.5, [0xffd9a8, 0x3a2412, 0.75], [6, 30, 10]);
  s.userData.bloom = 0.7; s.userData.sun.castShadow = false;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(34, 110), new THREE.MeshPhongMaterial({ color: 0x2a1a10, shininess: 100, specular: 0xaa7733 })); fl.rotation.x = -Math.PI / 2; fl.position.z = -40; fl.receiveShadow = true; s.add(fl);
  const lat = tex(128, 128, c => { c.fillStyle = '#3a2412'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#c9983c'; c.lineWidth = 6; for (let i = 0; i <= 128; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.moveTo(0, i); c.lineTo(128, i); c.stroke(); } c.fillStyle = '#e6b85a'; c.fillRect(44, 44, 40, 40); c.fillStyle = '#3a2412'; c.fillRect(54, 54, 20, 20); }); lat.wrapS = lat.wrapT = THREE.RepeatWrapping; lat.repeat.set(22, 3);
  const wm = new THREE.MeshLambertMaterial({ map: lat });
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(110, 16), wm); w.position.set(sx * 17, 8, -40); w.rotation.y = -sx * Math.PI / 2; s.add(w); for (let z = 5; z > -90; z -= 11) box(1.2, 16, 1.2, 0x1c110a, sx * 16.4, 8, z, s); }
  box(34, 16, 1, 0x1c110a, 0, 8, -95, s); box(10, 12, 0.6, 0x0a0705, 0, 6, -94.4, s);
  // lantern ceiling
  const LN = 520, lan = new THREE.InstancedMesh(new THREE.BoxGeometry(0.75, 1.0, 0.75), new THREE.MeshBasicMaterial({ color: 0xffc76a }), LN); s.add(lan); const dm = new THREE.Object3D(); const lp = [];
  for (let i = 0; i < LN; i++) lp.push([(hash(i) - 0.5) * 31, 10.2 + hash(i + 0.4) * 3.6, 8 - hash(i + 0.8) * 100, hash(i + 0.2)]);
  for (let z = 0; z > -90; z -= 22) { const p = new THREE.PointLight(0xffb866, 260, 46); p.position.set(0, 9, z); s.add(p); }
  // table
  const gold = new THREE.MeshPhongMaterial({ color: 0xb8892f, shininess: 120, specular: 0xffe0a0 });
  const tb = box(5.4, 0.4, 40, gold, 0, 2.9, -22, s); for (let z = -4; z > -42; z -= 6) { box(0.5, 2.7, 0.5, 0x2a1a10, -2.2, 1.35, z, s); box(0.5, 2.7, 0.5, 0x2a1a10, 2.2, 1.35, z, s); }
  for (let z = -6; z > -40; z -= 3.4) for (const sx of [-1, 1]) { box(1.1, 0.12, 1.1, 0xf4efe6, sx * 1.5, 3.16, z, s); box(0.35, 0.5, 0.35, sx > 0 ? 0x8a2b22 : 0x2f5f45, sx * 1.5 + 0.9 * sx * -1, 3.35, z + 0.6, s); }
  for (let z = -8; z > -40; z -= 8) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 6), gold); c.position.set(0, 3.9, z); s.add(c); box(0.22, 0.4, 0.22, new THREE.MeshBasicMaterial({ color: 0xfff0b0 }), 0, 4.9, z, s); }
  const chair = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; s.add(g); box(2.4, 0.4, 2.2, 0x3a2412, 0, 1.55, 0, g); box(2.4, 4.2, 0.4, 0x3a2412, 0, 3.4, -1.1, g); };
  chair(0, -44, 0); chair(4.6, -38, -Math.PI / 2); chair(-4.6, -38, Math.PI / 2);
  const saito = put(makeChar('saito', 'serious'), 0, 0, -43.6), cobb = makeChar('cobb', 'smirk'), arthur = put(makeChar('arthur', 'serious'), -4.3, 0, -38, Math.PI / 2); s.add(saito.g, cobb.g, arthur.g);
  // wall safe
  box(0.5, 4.4, 4.4, 0x2d3238, 16.5, 5.2, -60, s); const env = box(0.3, 1.2, 1.8, new THREE.MeshBasicMaterial({ color: 0xd9c890 }), 16.1, 5.0, -60, s);
  const door = new THREE.Group(); door.position.set(16.1, 5.2, -57.9); s.add(door); box(0.4, 4.2, 4.2, 0x8a9199, 0, 0, -2.1, door); const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.4, 12), M(0x23272c)); dial.rotation.z = Math.PI / 2; dial.position.set(-0.4, 0, -2.1); door.add(dial); box(0.2, 0.2, 1.2, 0xd9b24a, -0.65, 0, -2.1, door);
  const glow = new THREE.PointLight(0xffe9a8, 0, 14); glow.position.set(14.6, 5, -60); s.add(glow);
  const mal = makeChar('mal', 'smirk'); s.add(mal.g);
  // flood + debris
  const wat = new THREE.MeshPhongMaterial({ color: 0x3f8fb8, transparent: true, opacity: 0.82, shininess: 90 });
  const waves = [0, 1, 2, 3, 4, 5].map(i => { const w = box(10, 9, 14, wat, 0, 0, 0, s); w.castShadow = false; return w; });
  const pool = box(34, 1, 110, wat, 0, -2, -40, s); pool.castShadow = false;
  const DN = 120, deb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0x3a2412), DN); s.add(deb);
  // bullet-train compartment (where they wake)
  const TR = new THREE.Group(); TR.position.set(300, 0, 0); s.add(TR);
  box(16, 0.5, 14, 0x3a4048, 0, -0.25, 0, TR); box(16, 0.5, 14, 0xe9edf2, 0, 9.2, 0, TR); box(16, 9.5, 0.5, 0xdfe5ec, 0, 4.5, -7, TR); box(0.5, 9.5, 14, 0xdfe5ec, -8, 4.5, 0, TR); box(0.5, 9.5, 14, 0xdfe5ec, 8, 4.5, 0, TR);
  const wt = tex(256, 64, c => { const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#9fd0f2'); g.addColorStop(0.6, '#dff0fa'); g.addColorStop(0.61, '#6fa860'); g.addColorStop(1, '#4f8a48'); c.fillStyle = g; c.fillRect(0, 0, 256, 64); c.fillStyle = '#5a6a78'; for (let i = 0; i < 7; i++) c.fillRect(i * 40 + 6, 22 + (i % 3) * 5, 14, 18 - (i % 3) * 5); }); wt.wrapS = THREE.RepeatWrapping;
  const win = new THREE.Mesh(new THREE.PlaneGeometry(11, 4), new THREE.MeshBasicMaterial({ map: wt })); win.position.set(0, 5.4, -6.7); TR.add(win);
  for (const sx of [-1, 1]) { box(3.4, 1.2, 4.6, 0x35507a, sx * 4.6, 1.5, -2.6, TR); box(0.8, 5, 4.6, 0x35507a, sx * 6.3, 4.2, -2.6, TR); } box(3, 0.3, 3, 0xcfd6de, 0, 3.0, -4.6, TR);
  const tl = new THREE.PointLight(0xffffff, 120, 30); tl.position.set(0, 8, 2); TR.add(tl);
  const saito2 = put(makeChar('saito', 'sleep'), -4.4, 0, -2.6, Math.PI / 2), cobb2 = put(makeChar('cobb', 'serious'), 4.4, 0, -2.6, -Math.PI / 2); TR.add(saito2.g, cobb2.g);
  return {
    s, cam, saito, cobb, arthur, mal, door, dial, env, glow, saito2, cobb2, wt,
    pre(T) {
      this.quake = 0; this.flood = -1; this.fall = 0;
      saito.reset(); saito.sit(); saito.idle(T); arthur.reset(); arthur.sit(); arthur.idle(T + 1); cobb.reset(); put(cobb, 4.3, 0, -38, -Math.PI / 2); cobb.sit();
      saito.look('serious', T); arthur.look('serious', T); mal.g.visible = false; door.rotation.y = 0; glow.intensity = 0; env.visible = false; wt.offset.x = T * 0.9;
    },
    post(T) {
      const q = this.quake, fl = this.flood;
      for (let i = 0; i < LN; i++) { const p = lp[i], sw = Math.sin(T * (3 + p[3] * 2) + i) * q; dm.position.set(p[0] + sw * 1.4, p[1] - this.fall * p[3] * 14 * (p[3] > 0.6 ? 1 : 0), p[2]); dm.rotation.set(0, i, sw * 0.5); dm.updateMatrix(); lan.setMatrixAt(i, dm.matrix); } lan.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < DN; i++) { const st = hash(i + 5) * 1.6, t = Math.max(0, this.fall * 2.6 - st), y = 16 - 9 * t * t; dm.position.set((hash(i) - 0.5) * 30, q > 0 && t > 0 ? Math.max(0.4, y) : 40, -10 - hash(i + 9) * 70); dm.rotation.set(t * 3 + i, i, t * 2); dm.scale.set(0.5 + hash(i + 2) * 1.6, 0.4 + hash(i + 3), 0.5 + hash(i + 4) * 1.6); dm.updateMatrix(); deb.setMatrixAt(i, dm.matrix); } deb.instanceMatrix.needsUpdate = true;
      waves.forEach((w, i) => { const sx = i % 2 ? 1 : -1, k = clamp(fl * 1.5 - i * 0.12); w.visible = fl >= 0 && k > 0; w.position.set(sx * lerp(22, 2, ease(k)), 3 + Math.sin(T * 5 + i) * 0.8, -14 - i * 11); w.scale.set(10 + k * 10, 6 + 6 * Math.sin(k * Math.PI), 16); w.rotation.z = sx * 0.3 * (1 - k); });
      pool.position.y = fl >= 0 ? lerp(-2, 4.6, ease(fl)) : -2;
    }
  };
});
const HALL = (key, fn) => SHOT(key, 'hall', c => { fn(c, c.S); c.S.post(c.T); });
HALL('a2:2', (c, S) => { S.cobb.look('smirk', c.T); move(c.cam, [0, 11.5, 12], [0, 9, -30], [0, 7, -8], [0, 4.5, -44], c.k, 50); });
HALL('a3', (c, S) => {
  const [i, k] = cuts(c.k, [0.55]); S.cobb.look('smirk', c.T); S.cobb.armR.rotation.x = -1.0 + Math.sin(c.T * 3) * 0.2;
  if (i === 0) move(c.cam, [0, 5.2, -4], [0, 4.2, -44], [0, 4.6, -24], [0, 4.4, -44], k, 42);
  else { move(c.cam, [9, 4.6, -30], [0, 4.4, -41], [7.5, 4.4, -31], [0, 4.4, -41.5], k, 38); S.saito.armR.rotation.x = -1.3 - Math.sin(c.T * 2.5) * 0.25; }
});
HALL('a4:0', (c, S) => { S.cobb.look('smirk', c.T, c.talk); S.cobb.armL.rotation.x = -1.3 + Math.sin(c.T * 4) * 0.3; S.cobb.armL.rotation.z = -0.3; S.cobb.head.rotation.y = -0.5; move(c.cam, [-1.5, 4.9, -33.5], [4.3, 4.7, -38], [-1.0, 4.9, -34.2], [4.3, 4.7, -38], c.k, 30); });
HALL('a4:1', (c, S) => { S.cobb.look('smirk', c.T, c.talk); S.saito.look('smirk', c.T); S.saito.head.rotation.y = 0.5; S.saito.head.rotation.z = 0.08; move(c.cam, [2.6, 4.9, -37.5], [0, 4.7, -43.6], [2.0, 4.9, -38.4], [0, 4.7, -43.6], c.k, 30); });
HALL('a5:0', (c, S) => { S.arthur.look('smirk', c.T); S.arthur.head.rotation.y = -0.7 * ease(c.k * 2); S.cobb.look('smirk', c.T); move(c.cam, [1.2, 4.8, -35], [-4.3, 4.7, -38], [0.6, 4.8, -35.6], [-4.3, 4.7, -38], c.k, 30); });
HALL('a5:1', (c, S) => {
  const cb = S.cobb; cb.reset(); put(cb, 13.2, 0, -59.2, Math.PI / 2 - 0.2); cb.look('serious', c.T); cb.armR.rotation.x = -1.5; cb.armR.rotation.z = -0.2;
  const op = ease((c.k - 0.5) / 0.3); S.dial.rotation.x = c.T * 3 * (1 - op); S.door.rotation.y = -op * 1.9; S.env.visible = true; S.glow.intensity = 22 * op; if (op > 0.5) cb.look('smirk', c.T);
  const [i, k] = cuts(c.k, [0.5]);
  if (i === 0) move(c.cam, [8, 5.4, -52], [16, 5, -60], [9.5, 5.4, -53.5], [16, 5, -60], k, 34); else { cb.armR.rotation.x = -0.6; cb.armR.rotation.z = 0.5; S.env.visible = false; S.glow.intensity = 1.6 * op; move(c.cam, [16.05, 4.9, -60.6], [13.2, 4.75, -59.3], [16.05, 4.9, -60.2], [13.2, 4.75, -59.3], k, 52); }
});
HALL('a6:0', (c, S) => { S.mal.g.visible = true; S.mal.reset(); put(S.mal, 0, 0, -86 + c.k * 9, 0); S.mal.walk(c.T * 4.5, 0.35); S.mal.look('smirk', c.T); put(S.cobb, 13.2, 0, -59.2, Math.PI / 2); move(c.cam, [0, 5, -48], [0, 4.6, -90], [0, 4.8, -58], [0, 4.6, -90], c.k, 34); });
HALL('a6:1', (c, S) => { const cb = S.cobb; cb.reset(); put(cb, 13.2, 0, -59.2, Math.PI / 2); cb.head.rotation.y = -1.9 * ease(c.k * 2.2); cb.look('surprised', c.T); S.door.rotation.y = -1.9; S.env.visible = true; S.glow.intensity = 22; move(c.cam, [10.5, 4.9, -52], [13.2, 4.7, -59.2], [11, 4.9, -53], [13.2, 4.7, -59.2], c.k, 30); });
HALL('a6:2', (c, S) => { S.mal.g.visible = true; S.mal.reset(); put(S.mal, 0, 0, -74, 0); S.mal.idle(c.T); S.mal.look('smirk', c.T); S.mal.head.rotation.z = 0.1; move(c.cam, [1.5, 4.8, -62], [0, 4.7, -74], [0.8, 4.8, -67.5], [0, 4.7, -74], c.k, 30); });
HALL('a7', (c, S) => { S.mal.g.visible = true; S.mal.reset(); put(S.mal, 0, 0, -74, 0); S.mal.idle(c.T); S.mal.look('smirk', c.T, c.talk); S.mal.head.rotation.z = 0.1; S.mal.armR.rotation.x = -0.5 * ease(c.k * 2); move(c.cam, [-1.2, 4.8, -68], [0, 4.75, -74], [-0.8, 4.8, -68.6], [0, 4.75, -74], c.k, 28); });
HALL('a8:0', (c, S) => { S.quake = ease(c.k * 3); S.fall = c.k * 0.5; S.cobb.look('surprised', c.T); S.saito.look('surprised', c.T); S.arthur.look('surprised', c.T); move(c.cam, [0, 4.2, -8], [0, 6.5, -44], [0, 4.4, -13], [0, 6.5, -44], c.k, 46); shake(c.cam, c.T, 0.12); });
HALL('a8:1', (c, S) => { S.quake = 1; S.fall = 0.5 + c.k * 0.5; S.flood = c.k; S.cobb.look('surprised', c.T); S.saito.look('surprised', c.T); S.arthur.look('surprised', c.T); S.saito.g.position.y = S.arthur.g.position.y = S.cobb.g.position.y = c.k * 2.5; move(c.cam, [0, 6.5, -2], [0, 4, -40], [0, 8.5, 2], [0, 4.5, -40], c.k, 46); shake(c.cam, c.T, 0.16); });
HALL('a8:2', (c, S) => { const sa = S.saito2, cb = S.cobb2; sa.reset(); sa.sit(); cb.reset(); cb.sit(); const aw = c.k > 0.3; sa.look(aw ? (c.k > 0.55 ? 'smirk' : 'surprised') : 'sleep', c.T); sa.head.rotation.x = aw ? 0 : 0.35; sa.head.rotation.y = aw ? -0.6 * ease((c.k - 0.5) * 3) : 0; cb.look('serious', c.T); if (c.l < 0.2) c.flash(1 - c.l / 0.2); move(c.cam, [301.5, 4.6, 7.5], [297, 4.6, -2.6], [299.5, 4.8, 5], [296.2, 4.7, -2.6], c.k, 32); });
