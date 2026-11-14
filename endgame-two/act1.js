// Prologue (p1-p5) + Chapter 1: The Snap (a1-a8)
import { THREE, SET, SHOT, LINE, mkScene, move, shot, shake, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, label, makeChar, ground, makeAxe, makeGauntlet, dustFx } from './engine.js';

// ---------------- STRANGE'S FUTURES ----------------
SET('visions', () => {
  const { s, cam } = mkScene(0x04100f, [30, 140], 0x9fffd0, 0.5, [0xa8e8d8, 0x12201c, 1.0], [6, 20, 14]);
  s.userData.bloom = 0.45; s.userData.sun.castShadow = false;
  const fl = new THREE.Mesh(new THREE.CircleGeometry(60, 40), new THREE.MeshPhongMaterial({ color: 0x0a1a18, shininess: 120, specular: 0x2a6a5a })); fl.rotation.x = -Math.PI / 2; s.add(fl);
  const N = 1500, pan = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 0.62), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, fog: false }), N); pan.frustumCulled = false; s.add(pan);
  const dm = new THREE.Object3D(), col = new THREE.Color(), P = [];
  for (let i = 0; i < N; i++) { const a = hash(i) * 6.283, r = 22 + hash(i + 0.3) * 34, y = 0.8 + hash(i + 0.6) * 30; P.push([Math.cos(a) * r, y, Math.sin(a) * r, a]); dm.position.set(P[i][0], y, P[i][2]); dm.rotation.set(0, -a + Math.PI / 2, 0); dm.updateMatrix(); pan.setMatrixAt(i, dm.matrix); }
  const strange = put(makeChar('strange', 'serious'), 0, 2.2, 0); s.add(strange.g); box(0.24, 0.8, 0.24, 0xeec4a0, 0.2, -2.45, 0, strange.armR);
  const gem = new THREE.PointLight(0x5dff9a, 9, 18); gem.position.set(0, 5.8, 1.6); s.add(gem);
  const rings = [0, 1, 2].map(i => { const m = new THREE.Mesh(new THREE.TorusGeometry(2.8 + i * 0.9, 0.035, 6, 40), new THREE.MeshBasicMaterial({ color: 0x5dff9a })); m.position.set(0, 5.6, 0); s.add(m); return m; });
  const tony = put(makeChar('tonyArmor', 'serious'), -6, 0, 1, 1.4); s.add(tony.g);
  // the two winning futures, as big framed panels
  const big = (c, x) => { const g = new THREE.Group(); g.position.set(x, 5.4, -10); s.add(g); box(6.6, 3.9, 0.2, 0x0a1a18, 0, 0, -0.15, g); const m = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.5), new THREE.MeshBasicMaterial({ color: c, fog: false })); g.add(m); g.visible = false; return g; };
  const winA = big(0xcfc8a8, -4), winB = big(0xd9941c, 4);
  return { s, cam, strange, tony, winA, winB, gem, mode: 0,
    pre(T) { this.mode = 0; winA.visible = winB.visible = false; tony.g.visible = false; tony.reset(); tony.idle(T); strange.reset(); strange.sit(); strange.g.position.y = 2.2 + Math.sin(T * 1.2) * 0.25; strange.armL.rotation.set(-0.9, 0, 0.5); strange.armR.rotation.set(-0.9, 0, -0.5); rings.forEach((r, i) => { r.rotation.set(T * (0.7 + i * 0.3), T * (0.5 - i * 0.4), i); r.visible = true; }); },
    post(T) { const q = Math.floor(T * 14); for (let i = 0; i < N; i++) { const h = hash(i * 3.7 + Math.floor(q / (1 + (i % 3)))); if (this.mode === 0) col.setHSL(h < 0.5 ? 0.45 : 0.07, 0.7, 0.04 + h * 0.3); else col.setHSL(0.45, 0.4, 0.025); pan.setColorAt(i, col); } pan.instanceColor.needsUpdate = true; } };
});
const FUT = (key, fn) => SHOT(key, 'visions', c => { fn(c, c.S); c.S.post(c.T); });
FUT('p1', (c, S) => { S.strange.look('sleep', c.T); S.strange.head.rotation.set(0, (hash(Math.floor(c.T * 20)) - 0.5) * 0.9, (hash(Math.floor(c.T * 20) + 5) - 0.5) * 0.5); const a = 0.4 + c.k * 0.9; shot(c.cam, [Math.sin(a) * lerp(19, 12, ease(c.k)), lerp(11, 5.5, ease(c.k)), Math.cos(a) * lerp(19, 12, ease(c.k))], [0, 5, 0], 42); });
FUT('p2', (c, S) => { S.tony.g.visible = true; S.tony.look('serious', c.T); S.strange.look('serious', c.T); S.strange.head.rotation.y = -0.7; S.strange.armR.rotation.set(-2.5 * ease(c.k * 2.5), 0, 0.15); move(c.cam, [-3, 4.6, 17], [-3, 4.8, 0], [-3, 4.8, 14], [-2.6, 5.0, 0], c.k, 34); });
FUT('p3', (c, S) => { S.strange.look('serious', c.T); S.strange.armR.rotation.set(-2.5, 0, 0.15); move(c.cam, [1.5, 6.8, 10], [0, 7.0, 0], [1.0, 6.9, 8], [0, 7.05, 0], c.k, 28); if (c.l < 0.25) c.flash(0.6 * (1 - c.l / 0.25)); });
FUT('p4:0', (c, S) => { S.mode = 1; S.strange.g.position.x = -10; S.strange.g.position.z = -4; S.winA.visible = S.winB.visible = true; S.strange.look('serious', c.T); S.strange.g.rotation.y = 0.9; move(c.cam, [2, 5.6, 16], [-1.5, 5.4, -10], [1, 5.5, 12], [-1.5, 5.4, -10], c.k, 40); });
FUT('p4:1', (c, S) => { S.mode = 1; S.strange.g.position.x = -10; S.strange.g.position.z = -4; S.winA.visible = S.winB.visible = true; S.strange.look('serious', c.T); S.strange.g.rotation.y = 0.9; S.strange.armL.rotation.set(-1.7 * ease(c.k * 2), 0, -0.3); S.winB.position.z = -10 - ease((c.k - 0.3) / 0.6) * 30; S.winB.scale.setScalar(1 - ease((c.k - 0.3) / 0.6) * 0.8); move(c.cam, [1, 5.5, 12], [-1, 5.4, -10], [2, 5.6, 10], [0, 5.4, -12], c.k, 40); });
FUT('p5', (c, S) => { const e = LINE.p5.sents[1].end; S.mode = c.si === 0 ? 0 : 1; S.strange.look(c.si ? 'serious' : 'sleep', c.T); if (c.si) { S.winB.visible = true; S.winB.position.set(0, 9 + c.sk * 1.5, -9); S.winB.scale.setScalar(0.6 + c.sk * 0.5); } const a = 2.4 + c.k * 0.7; shot(c.cam, [Math.sin(a) * lerp(11, 18, ease(c.k)), lerp(5, 8, c.k), Math.cos(a) * lerp(11, 18, ease(c.k))], [0, 6, 0], 42); if (c.T > e + 0.3) c.title(c.T - e - 0.3); });

// ---------------- THE SNAP (Wakanda clearing) ----------------
SET('snapfield', () => {
  const { s, cam } = mkScene(0xd9b48a, [50, 260], 0xffc890, 2.3, [0xffe6c4, 0x4a5a3a, 1.3], [-24, 22, 10], 50);
  s.userData.bloom = 0.4; ground(s, 400, '#5a7a45', '#64864e');
  const r = rng(12); for (let i = 0; i < 60; i++) { const a = r() * 6.28, d = 26 + r() * 100, g = new THREE.Group(); g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); s.add(g); const h = 12 + r() * 14; box(1.6, h, 1.6, 0x4a3524, 0, h / 2, 0, g); box(9, 5, 9, 0x2f5a35, 0, h, 0, g); box(6, 4, 6, 0x3a6b40, 0, h + 4, 0, g); }
  const thanos = makeChar('thanos', 'serious'); s.add(thanos.g); const gaunt = makeGauntlet(); gaunt.position.set(0, -2.1, 0.2); thanos.armL.add(gaunt);
  const thor = makeChar('thor', 'serious'), steve = makeChar('steve', 'sad'), vics = [makeChar('sam'), makeChar('wanda'), makeChar('tchalla'), makeChar('civC')]; const axe = makeAxe(); axe.position.set(0, -2.6, 0.4); axe.rotation.x = Math.PI / 2; thor.armR.add(axe);
  [thor, steve, ...vics].forEach(c => s.add(c.g)); const dust = vics.map(() => dustFx(s, 220));
  return { s, cam, thanos, gaunt, thor, steve, vics, dust, pre(T) { [thanos, thor, steve, ...vics].forEach(c => { c.reset(); c.g.visible = true; }); put(thanos, 0, 0, 0, 0.3); put(thor, 7, 0, 5, -2.4); put(steve, -8, 0, 9, 2.6); steve.body.rotation.x = 0.3; vics.forEach((v, i) => put(v, -16 + i * 9, 0, 16 + (i % 2) * 5, Math.PI + (i - 1.5) * 0.3)); dust.forEach(d => d.set([0, 0, 0], 0)); gaunt.userData.glow.intensity = 0; thanos.idle(T); } };
});
SHOT('a1:0', 'snapfield', c => { const S = c.S; S.thanos.look('serious', c.T); S.thor.look('serious', c.T); S.steve.look('sad', c.T); move(c.cam, [24, 4, 20], [0, 6, 3], [17, 4.5, 15], [0, 6.5, 3], c.k, 38); });
SHOT('a1:1', 'snapfield', c => {
  const S = c.S, [i, k] = cuts(c.k, [0.3, 0.62]); S.thanos.look('serious', c.T); const snapT = 0.22;
  S.thanos.armL.rotation.set(-2.4 * ease(c.k / 0.18), 0, -0.25); S.gaunt.userData.glow.intensity = c.k < snapT ? 30 * c.k / snapT : 0;
  if (c.k > snapT && c.k < snapT + 0.08) c.flash(1 - (c.k - snapT) / 0.08);
  const dk = clamp((c.k - 0.34) / 0.5); S.vics.forEach((v, j) => { const kk = clamp(dk * 1.6 - j * 0.18); v.look(kk > 0 ? 'surprised' : 'serious', c.T); v.g.visible = kk < 0.14; S.dust[j].set([v.g.position.x, 0, v.g.position.z], kk, 1, [0.8, 0.7, -0.3]); if (kk > 0 && kk < 0.14) v.armR.rotation.x = -1.2; });
  S.steve.look('surprised', c.T); S.thor.look('surprised', c.T);
  if (i === 0) move(c.cam, [-9, 8, 18], [-1.5, 9.5, 0], [-7, 8.5, 15], [-1.5, 10, 0], k, 32);
  else if (i === 1) move(c.cam, [-22, 5, 38], [-9, 4, 18], [-16, 5, 37], [-5, 4.2, 18], k, 34);
  else move(c.cam, [16, 5, 24], [-2, 4, 12], [18, 13, 25], [-2, 3, 10], k, 40);
});

// ---------------- CLINT'S FARM ----------------
SET('farm', () => {
  const { s, cam } = mkScene(0xbfe0f4, [70, 300], 0xfff2d6, 2.6, [0xffffff, 0x7a9a5a, 1.4], [20, 30, 24], 50);
  s.userData.bloom = 0.3; ground(s, 400, '#7fb05a', '#8aba64');
  box(24, 12, 16, 0xf2ead8, -30, 6, -30, s); const rf = box(27, 1, 12, 0x8a3a2a, -30, 15, -34, s); rf.rotation.x = -0.6; const rf2 = box(27, 1, 12, 0x8a3a2a, -30, 15, -26, s); rf2.rotation.x = 0.6; box(14, 16, 12, 0xa83a2a, 26, 8, -40, s); box(15, 1, 14, 0x5a2a20, 26, 16.5, -40, s);
  for (let i = 0; i < 26; i++) box(0.5, 2.4, 0.5, 0xf2ead8, -50 + i * 4, 1.2, 20, s); box(104, 0.4, 0.3, 0xf2ead8, 0, 2, 20, s);
  const r = rng(4); for (let i = 0; i < 18; i++) { const g = new THREE.Group(); g.position.set((r() - 0.5) * 180, 0, -60 - r() * 50); s.add(g); box(1.4, 9, 1.4, 0x5a3d26, 0, 4.5, 0, g); box(8, 7, 8, 0x3f8a4a, 0, 11, 0, g); }
  box(6, 0.4, 3, 0x9a7248, 8, 2.6, 4, s); box(6, 0.3, 1.2, 0x9a7248, 8, 1.5, 6.4, s); for (const x of [5.4, 10.6]) box(0.4, 2.6, 2.6, 0x74492a, x, 1.3, 4, s);
  box(0.4, 4.4, 0.4, 0x74492a, -12, 2.2, -14, s); const tg = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.4, 20), new THREE.MeshLambertMaterial({ map: tex(64, 64, c => { ['#f2f2f2', '#c0262e', '#f2f2f2', '#c0262e', '#ffd24a'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(32, 32, 32 - i * 6.4, 0, 7); c.fill(); }); }) })); tg.rotation.x = Math.PI / 2; tg.position.set(-12, 4.4, -14); s.add(tg);
  const clint = makeChar('clint'), girl = makeChar('girl', 'joy'), laura = makeChar('laura'), boy = makeChar('boy', 'joy'); girl.g.scale.setScalar(0.72); boy.g.scale.setScalar(0.62); [clint, girl, laura, boy].forEach(c => s.add(c.g));
  const fam = [girl, laura, boy], dust = fam.map(() => dustFx(s, 200, 0x8a7a66));
  return { s, cam, clint, fam, dust, pre(T) { [clint, ...fam].forEach(c => { c.reset(); c.g.visible = true; c.idle(T); }); put(clint, -9, 0, 0, Math.PI + 0.3); put(girl, -12, 0, -3, Math.PI); girl.armL.rotation.x = -1.5; put(laura, 8, 0, 2, Math.PI + 0.4); put(boy, 10.5, 0, 6.6, Math.PI); dust.forEach(d => d.set([0, 0, 0], 0)); } };
});
SHOT('a2:0', 'farm', c => { const S = c.S, t = ease((c.k - 0.45) / 0.35); S.clint.look(t > 0.6 ? 'neutral' : 'smirk', c.T); S.clint.g.rotation.y = Math.PI + 0.3 - t * 2.7; S.fam.forEach(f => f.look('joy', c.T)); const dk = clamp((c.k - 0.5) / 0.5); S.fam.forEach((f, j) => { const kk = clamp(dk * 1.5 - j * 0.1); f.g.visible = kk < 0.14; S.dust[j].set([f.g.position.x, 0, f.g.position.z], kk, f.g.scale.x, [0.9, 0.5, 0.3]); }); move(c.cam, [-2, 4.6, 16], [-9, 3.8, -1], [-4, 4.4, 12], [-9, 4, 0], c.k, 36); });
SHOT('a2:1', 'farm', c => { const S = c.S; S.fam.forEach(f => f.g.visible = false); const cl = S.clint; cl.look('surprised', c.T); cl.g.rotation.y = 0.5 + Math.sin(c.l * 2.6) * 0.9; put(cl, -9 + c.k * 5, 0, c.k * 3, cl.g.rotation.y); cl.walk(c.T * 8, 0.5); const [i, k] = cuts(c.k, [0.45]); if (i === 0) move(c.cam, [-3, 4.8, 9], [-8, 4.6, 1], [-1, 4.8, 9.5], [-6, 4.6, 2], k, 30); else move(c.cam, [0, 9, 24], [-4, 3, 2], [0, 26, 44], [-4, 2, 0], k, 40); });

// ---------------- ADRIFT: the ship ----------------
SET('ship', () => {
  const { s, cam } = mkScene(0x03050c, null, 0x9fc0ff, 0.5, [0x8aa6e0, 0x2a3040, 1.5], [-10, 12, 16]);
  s.userData.bloom = 0.5; const il = new THREE.PointLight(0xffc890, 40, 40); il.position.set(4, 8, 2); s.add(il);
  const hull = 0x55617a; box(26, 0.6, 18, 0x3a4458, 0, -0.3, 0, s); box(26, 0.6, 18, hull, 0, 11.3, 0, s); box(0.6, 12, 18, hull, -13, 5.5, 0, s); box(0.6, 12, 18, hull, 13, 5.5, 0, s); box(26, 12, 0.6, hull, 0, 5.5, 9, s);
  box(26, 3, 0.6, hull, 0, 1.2, -9, s); box(26, 2.4, 0.6, hull, 0, 10.2, -9, s); for (const x of [-13, -4.4, 4.4, 13]) box(0.8, 7, 0.8, 0x3a4458, x, 5.6, -9, s);
  for (const x of [-7, 7]) { box(3.2, 1.2, 3.2, 0x5a3a2a, x, 1.6, -4, s); box(3.2, 4.6, 0.8, 0x5a3a2a, x, 3.6, -2.2, s); } box(10, 1.6, 2.4, 0x3a4458, 0, 2.2, -7.4, s);
  for (let i = 0; i < 9; i++) box(0.5, 0.2, 0.3, new THREE.MeshBasicMaterial({ color: [0xff8a3a, 0x5ad0ff, 0x7dff9a][i % 3] }), -3.6 + i * 0.9, 3.1, -7.2, s);
  const SN = 900, sp = new Float32Array(SN * 3), stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true })); for (let i = 0; i < SN; i++) sp.set([(hash(i) - 0.5) * 500, (hash(i + 0.3) - 0.5) * 300, -60 - hash(i + 0.6) * 300], i * 3); stars.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3)); stars.frustumCulled = false; s.add(stars);
  const tony = makeChar('tony', 'sad'), nebula = makeChar('nebula', 'sad'); s.add(tony.g, nebula.g);
  const helm = new THREE.Group(); helm.position.set(-1.2, 0.7, 3.2); helm.rotation.y = -2.2; s.add(helm); box(1.3, 1.3, 1.3, 0xa8211f, 0, 0, 0, helm); box(1.0, 0.9, 0.1, new THREE.MeshBasicMaterial({ color: 0xc99a2c }), 0, -0.05, 0.66, helm); const e1 = box(0.36, 0.12, 0.1, new THREE.MeshBasicMaterial({ color: 0x9fe8ff }), -0.26, 0.12, 0.72, helm), e2 = box(0.36, 0.12, 0.1, e1.material, 0.26, 0.12, 0.72, helm);
  const hl = new THREE.PointLight(0x7fd8ff, 14, 10); hl.position.set(-2, 1.6, 2.4); s.add(hl);
  const carol = makeChar('carol', 'smirk'); s.add(carol.g); const cl = new THREE.PointLight(0xffd070, 0, 60); s.add(cl);
  const aura = new THREE.Mesh(new THREE.SphereGeometry(4.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffc050, transparent: true, opacity: 0.16, fog: false })); s.add(aura);
  // exterior model
  const EX = new THREE.Group(); EX.position.set(0, 300, 0); s.add(EX); const ship = new THREE.Group(); EX.add(ship);
  box(8, 3, 16, 0xc2622a, 0, 0, 0, ship); box(5, 2.4, 6, 0x3a6fd0, 0, 0.6, 9, ship); for (const sx of [-1, 1]) { const w = box(12, 0.8, 8, 0xc2622a, sx * 9, 0.6, -2, ship); w.rotation.z = sx * 0.25; box(3, 2.4, 9, 0x3a4458, sx * 15, 1.6, -2, ship); }
  const earth = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 18), new THREE.MeshLambertMaterial({ map: tex(256, 128, c => { c.fillStyle = '#2a5fae'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#3f9a52'; for (let i = 0; i < 40; i++) { c.beginPath(); c.ellipse(hash(i) * 256, 20 + hash(i + 0.4) * 88, 8 + hash(i + 0.7) * 22, 5 + hash(i + 0.2) * 12, hash(i) * 3, 0, 7); c.fill(); } c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 30; i++) { c.beginPath(); c.ellipse(hash(i + 9) * 256, hash(i + 5) * 128, 14, 3, 0, 0, 7); c.fill(); } }) })); earth.position.set(-90, -60, 260); EX.add(earth);
  const sunl = new THREE.PointLight(0xffffff, 60000, 900); sunl.position.set(200, 150, -100); EX.add(sunl);
  return { s, cam, tony, nebula, helm, hl, carol, cl, aura, ship, earth, EX,
    pre(T) { tony.reset(); put(tony, 1.6, -0.9, 4.6, Math.PI - 0.5); tony.sit(); tony.body.rotation.x = -0.15; tony.head.rotation.x = 0.25; nebula.reset(); put(nebula, 7, 0.3, -3.4, Math.PI); nebula.sit(); nebula.head.rotation.x = 0.3; nebula.look('sad', T); hl.intensity = 12 + Math.sin(T * 6) * 3; e1.visible = e2.visible = Math.sin(T * 6) > -0.7; carol.g.visible = false; aura.visible = false; cl.intensity = 0; earth.rotation.y = T * 0.02; } };
});
SHOT('a3', 'ship', c => { const S = c.S; S.tony.look('sad', c.T); const [i, k] = cuts(c.k, [0.5]); if (i === 0) move(c.cam, [-11, 7.5, 7.5], [0, 2.5, 1], [-9, 6, 7], [0.5, 2.4, 2], k, 44); else move(c.cam, [-6.5, 1.8, -1.4], [-1.2, 0.8, 3.2], [-5.4, 1.5, -0.4], [-1.2, 0.8, 3.2], k, 30); });
SHOT('a4', 'ship', c => { const S = c.S; S.tony.look('sad', c.T, c.talk); S.tony.head.rotation.x = 0.1; move(c.cam, [4.2, 3.0, -2.2], [1.6, 3.4, 4.6], [3.8, 3.1, -1.4], [1.6, 3.45, 4.6], c.k, 30); });
SHOT('a5:0', 'ship', c => { const S = c.S, g = ease(c.k * 1.4); S.carol.g.visible = S.aura.visible = true; S.carol.reset(); put(S.carol, 0, lerp(-6, 3.2, g), -14, 0); S.carol.look('smirk', c.T); S.carol.armL.rotation.z = -0.4; S.carol.armR.rotation.z = 0.4; S.aura.position.set(0, S.carol.g.position.y + 3, -14); S.aura.scale.setScalar(0.8 + Math.sin(c.T * 7) * 0.06); S.cl.position.set(0, S.carol.g.position.y + 3, -11); S.cl.intensity = 500 * g; S.tony.look(g > 0.5 ? 'surprised' : 'sad', c.T); S.tony.head.rotation.x = -0.2 * g; S.tony.armR.rotation.x = -1.6 * ease((c.k - 0.4) / 0.3); move(c.cam, [5, 3.4, 9.5], [0, 4, -9], [3.5, 3.2, 8.6], [0, 4.6, -9], c.k, 44); });
SHOT('a5:1', 'ship', c => { const S = c.S, p = [lerp(60, -20, c.k), 300 + lerp(20, -4, c.k), lerp(-120, 60, c.k)]; S.ship.position.set(p[0], p[1] - 300, p[2]); S.ship.rotation.y = -0.4; S.carol.g.visible = S.aura.visible = true; S.carol.reset(); put(S.carol, p[0], p[1] - 6.5, p[2] + 2, -0.4); S.carol.g.rotation.x = 1.2; S.carol.armL.rotation.x = S.carol.armR.rotation.x = -2.9; S.carol.look('serious', c.T); S.aura.visible = false; S.aura.position.set(p[0], p[1] - 4, p[2] + 2); S.aura.scale.setScalar(0.9 + Math.sin(c.T * 8) * 0.06); S.cl.position.set(p[0], p[1] - 8, p[2]); S.cl.intensity = 900; move(c.cam, [p[0] + 22, p[1] + 4, p[2] + 30], p, [p[0] + 16, p[1] - 2, p[2] + 24], p, c.k, 40); });

// ---------------- THE GARDEN ----------------
SET('garden', () => {
  const { s, cam } = mkScene(0xd9a8c0, [60, 300], 0xffd8c0, 2.3, [0xffe2f0, 0x4a6a4a, 1.3], [24, 26, 20], 50);
  s.userData.bloom = 0.35; ground(s, 500, '#5c9a58', '#66a662');
  for (let i = 0; i < 7; i++) { box(260, 5, 30, [0x4f8a4c, 0x5c9a58][i % 2], 0, 2.5 + i * 5, -70 - i * 30, s); }
  const moon = new THREE.Mesh(new THREE.CircleGeometry(40, 30), new THREE.MeshBasicMaterial({ color: 0xffe2ea, fog: false })); moon.position.set(90, 120, -380); s.add(moon); const ring = new THREE.Mesh(new THREE.RingGeometry(52, 60, 40), new THREE.MeshBasicMaterial({ color: 0xf2c0d0, fog: false, side: THREE.DoubleSide })); ring.position.copy(moon.position); ring.rotation.x = 1.1; s.add(ring);
  const r = rng(6); for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 160, z = (r() - 0.5) * 100 - 10; if (Math.abs(x) < 16 && Math.abs(z) < 18) continue; box(1.4, 2.4 + r() * 2, 1.4, 0x3f7a40, x, 1.4, z, s); box(0.9, 0.9, 0.9, [0xe24b6b, 0xf2c230, 0xb050ff][i % 3], x, 3.2 + r(), z, s); }
  // hut
  const wd = 0x7a5a3c; box(18, 0.5, 14, 0x6a4a2e, 0, 0.25, -4, s); box(18, 9, 0.6, wd, 0, 4.7, -11, s); box(0.6, 9, 14, wd, -9, 4.7, -4, s); box(0.6, 9, 14, wd, 9, 4.7, -4, s); const rf = box(21, 0.8, 17, 0x8a7a4a, 0, 9.8, -4, s); rf.rotation.x = 0.08; for (const x of [-9, 9]) box(0.8, 9, 0.8, 0x5a3d26, x, 4.7, 3, s);
  box(2.4, 1.6, 2.4, 0x3a3a40, -4, 0.8, -6, s); box(1.6, 0.6, 1.6, new THREE.MeshBasicMaterial({ color: 0xff8a2a }), -4, 0.4, -6, s);
  const sc = new THREE.Group(); sc.position.set(22, 0, 8); s.add(sc); box(0.5, 9, 0.5, 0x5a3d26, 0, 4.5, 0, sc); box(6, 0.5, 0.5, 0x5a3d26, 0, 6.6, 0, sc); box(3.6, 3.4, 1.6, 0xd0a43a, 0, 6.2, 0, sc); box(1.8, 1.8, 1.8, 0xd0a43a, 0, 9.2, 0, sc);
  box(2.6, 1.9, 2.6, 0x6a4a2e, 14, 0.95, 2, s); const thanos = makeChar('thanos', 'neutral'); s.add(thanos.g); box(1.1, 2.1, 1.1, 0x3a2a30, 0, -1, 0, thanos.armL);
  const gaunt = makeGauntlet(0x4a3a2a); gaunt.userData.stones.forEach(m => m.material = new THREE.MeshBasicMaterial({ color: 0x15100d })); s.add(gaunt);
  const team = ['steve', 'thor', 'natasha', 'carol', 'nebula', 'rocket'].map(n => makeChar(n, 'serious')); team.forEach(c => s.add(c.g)); const axe = makeAxe(); axe.position.set(0, -2.6, 0.4); axe.rotation.x = Math.PI / 2; team[1].armR.add(axe);
  return { s, cam, thanos, gaunt, team, axe, pre(T) { thanos.reset(); put(thanos, 0, 0, -5, 0); thanos.g.scale.setScalar(1.75); thanos.sit(); thanos.g.position.y = -1.2; thanos.idle(T); team.forEach((c, i) => { c.reset(); put(c, -8 + i * 3.3, 0, 8 + Math.abs(i - 2.5) * 1.4, Math.PI); c.idle(T + i); c.look('serious', T); c.g.visible = true; }); gaunt.position.set(14, 2.7, 2); gaunt.rotation.set(0.5, -0.5, 0); gaunt.scale.setScalar(1.5); axe.visible = true; } };
});
SHOT('a6:0', 'garden', c => { const S = c.S; S.thanos.look('neutral', c.T); S.team.forEach((t, i) => { t.g.position.z += 26 * (1 - ease(c.k * 1.3)); if (c.k < 0.75) t.walk(c.T * 7 + i, 0.5); }); const [i, k] = cuts(c.k, [0.45]); if (i === 0) move(c.cam, [30, 14, 60], [0, 8, -20], [18, 9, 44], [0, 5, -6], k, 42); else move(c.cam, [-5, 4.6, -3], [-1, 4.4, 12], [-3, 4.6, -1], [0, 4.4, 12], k, 40); });
SHOT('a6:1', 'garden', c => { const S = c.S; S.thanos.look('neutral', c.T); const [i, k] = cuts(c.k, [0.55]); if (i === 0) move(c.cam, [18, 4.6, 10], [14, 2.6, 2], [17, 4.2, 8.5], [14, 2.6, 2], k, 30); else { S.team.forEach(t => t.look('sad', c.T)); move(c.cam, [-3, 4.6, 2], [-1.5, 4.6, 9], [-1.5, 4.6, 2.5], [-0.5, 4.6, 9], k, 34); } });
SHOT('a7:0', 'garden', c => { const S = c.S; S.thanos.look('neutral', c.T, c.talk); S.thanos.head.rotation.z = 0.06; move(c.cam, [2.5, 6.4, 6], [0, 7.2, -5], [1.6, 6.5, 4.4], [0, 7.3, -5], c.k, 30); });
SHOT('a7:1', 'garden', c => { const S = c.S; S.thanos.look('smirk', c.T, c.talk); S.team.forEach(t => t.look('serious', c.T)); move(c.cam, [-7.5, 6.2, 2], [0.5, 7.2, -5], [-6.5, 6.4, 1.5], [0.5, 7.3, -5], c.k, 34); });
SHOT('a8:0', 'garden', c => { const S = c.S, th = S.team[1]; S.thanos.look('neutral', c.T); put(th, 2.8, 0, -1.5, Math.PI + 0.7); th.look('serious', c.T); const sw = ease(c.k / 0.55); th.armR.rotation.set(-2.9 + sw * 0.2, 0, 0.3); if (c.k > 0.55) { th.armR.rotation.x = -2.7 + ease((c.k - 0.55) / 0.12) * 2.2; } move(c.cam, [8, 5.6, 5], [1.5, 6.4, -3], [6.5, 5.6, 4], [1.5, 6.6, -3], c.k, 32); shake(c.cam, c.T, 0.04); if (c.k > 0.64) c.fade(1); if (c.k > 0.64 && c.k < 0.72) c.flash(1 - (c.k - 0.64) / 0.08); });
SHOT('a8:1', 'garden', c => { const S = c.S, th = S.team[1]; S.thanos.g.visible = false; put(th, 0, 0, 2 + c.k * 5, 0); th.walk(c.T * 3.5, 0.3); th.look('sad', c.T); th.head.rotation.x = 0.3; S.team.forEach((t, i) => { if (i !== 1) { t.look('sad', c.T); t.g.position.z += 4; t.g.rotation.y = Math.PI; } }); move(c.cam, [0, 4.4, 26], [0, 4.6, 0], [0, 4.6, 22], [0, 4.8, 0], c.k, 34); c.fade(clamp(1 - c.l / 0.5)); S.thanos.g.visible = true; S.thanos.g.position.set(0, -40, 0); });
