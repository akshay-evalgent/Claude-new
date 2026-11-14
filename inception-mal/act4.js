// Act 4: b5 (the memory), Chapter 7 (g1-g9), the ending (h2:1, h2:2, h3-h11) and the outro (o1-o4)
import { THREE, SET, SHOT, LINE, CAST, mkScene, move, shot, shake, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, label, makeChar, makeTop, ground } from './engine.js';

const basic = c => new THREE.MeshBasicMaterial({ color: c });
const chairAt = (p, x, z, ry, col = 0x6a4a2e, y = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); box(2.4, 0.4, 2.2, col, 0, 1.3, 0, g); box(2.4, 4.4, 0.4, col, 0, 3.4, -1.1, g); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.3, 1.2, 0.3, col, a, 0.6, b * 0.9, g); return g; };
const mazeTex = (bg = '#f4efe2', fg = '#27395c') => tex(128, 128, c => { c.fillStyle = bg; c.fillRect(0, 0, 128, 128); c.strokeStyle = fg; c.lineWidth = 5; for (let i = 0; i < 5; i++) { const a = 10 + i * 12, w = 108 - i * 24; c.strokeRect(a, a, w, w); c.clearRect(a + (i % 2 ? w - 14 : 6), a - 4 + (i % 2 ? w : 0), 12, 8); c.fillStyle = bg; c.fillRect(a + (i % 2 ? w - 16 : 6), a - 4 + (i % 2 ? w : 0), 12, 8); } });
// drifting-block dissolve: particles start inside figure volumes at srcs [[x,y,z],..] and either rise away or fly to a target point
function mkDust(s, n, palette) {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), basic(0xffffff), n); im.frustumCulled = false; s.add(im); const col = new THREE.Color(), dm = new THREE.Object3D();
  for (let i = 0; i < n; i++) im.setColorAt(i, col.set(palette[i % palette.length]));
  return { im, set(k, srcs, target, size = 0.3) { im.visible = k > 0; if (k <= 0) return; for (let i = 0; i < n; i++) { const o = srcs[i % srcs.length], d = hash(i + 0.37), pk = clamp((k - d * 0.5) / 0.5), e = pk * pk, sx = o[0] + (hash(i) - 0.5) * 2.6, sy = o[1] + hash(i + 0.5) * 5.2, sz = o[2] + (hash(i + 0.7) - 0.5); if (target) dm.position.set(lerp(sx, target[0], ease(pk)) + Math.sin(pk * 3.14) * (hash(i + 2) - 0.5) * 4, lerp(sy, target[1], ease(pk)) + Math.sin(pk * 3.14) * 2.5, lerp(sz, target[2], ease(pk))); else dm.position.set(sx + e * (hash(i + 2) - 0.3) * 5, sy + e * (3 + d * 6), sz + e * (hash(i + 3) - 0.5) * 3); dm.rotation.set(pk * 5 * d, pk * 4, i); dm.scale.setScalar(size * (target ? (pk > 0.85 ? (1 - pk) / 0.15 : 1) : 1 - e * pk)); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); } im.instanceMatrix.needsUpdate = true; } };
}
CAST.malReal = { ...CAST.malOld, hair: ['bob', 0x2b1b14], face: CAST.mal.face };
CAST.malMid = { ...CAST.malOld, hair: ['bob', 0x7a6a60] };
CAST.cobbBed = { ...CAST.cobbOld, hair: ['slick', 0x7a5632], face: CAST.cobb.face };
CAST.cobbMid = { ...CAST.cobbOld, hair: ['slick', 0x988468] };

// ======================= HOME (house + garden) =======================
SET('home', () => {
  const { s, cam } = mkScene(0xcfe6fa, [70, 260], 0xfff0d0, 2.8, [0xfff4e0, 0x9a7a5a, 1.25], [10, 22, -44], 46);
  const sun = s.userData.sun, hemi = s.children[0];
  const wood = tex(64, 64, c => { c.fillStyle = '#b98a58'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#a97a4a'; c.fillRect(0, 0, 64, 3); c.fillRect(30, 0, 3, 64); }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(9, 10);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(36, 38), new THREE.MeshLambertMaterial({ map: wood })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, 7); fl.receiveShadow = true; s.add(fl);
  const g = ground(s, 240, '#63b356', '#6fc061', -0.05); g.position.z = -132;
  const wc = 0xf2e6d2;
  box(12, 15, 0.8, wc, -12.4, 7.5, -12, s); box(12, 15, 0.8, wc, 12.4, 7.5, -12, s); box(13, 4, 0.8, wc, 0, 13, -12, s);
  box(0.8, 15, 38, wc, -18, 7.5, 7, s); box(0.8, 15, 38, wc, 18, 7.5, 7, s); box(36, 0.8, 38, 0xfaf3e6, 0, 15.2, 7, s);
  box(15.5, 15, 0.8, wc, -10.25, 7.5, 26, s); box(15.5, 15, 0.8, wc, 10.25, 7.5, 26, s); box(5, 6, 0.8, wc, 0, 12, 26, s);
  for (const x of [-6.6, 6.6]) box(0.5, 11, 1.0, 0x8a6238, x, 5.5, -12, s); box(13.7, 0.5, 1.0, 0x8a6238, 0, 11.2, -12, s);
  // front door
  const door = new THREE.Group(); door.position.set(-2.5, 0, 26); s.add(door); box(5, 9, 0.35, 0x6b4a2e, 2.5, 4.5, 0, door); box(0.3, 0.3, 0.5, 0xd9b24a, 4.3, 4.3, -0.3, door);
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), basic(0xe6cf9f)); outside.position.set(0, 5, 30); outside.rotation.y = Math.PI; s.add(outside);
  const dl = new THREE.PointLight(0xffe2b0, 0, 40); dl.position.set(0, 7, 27.5); s.add(dl);
  const il = new THREE.PointLight(0xffd9a8, 70, 45); il.position.set(0, 11, 6); s.add(il);
  // furniture
  box(7, 0.35, 4, 0x8a5a34, 7, 2.9, 3, s); for (const [x, z] of [[-3.2, -1.7], [3.2, -1.7], [-3.2, 1.7], [3.2, 1.7]]) box(0.35, 2.75, 0.35, 0x74492a, 7 + x, 1.38, 3 + z, s);
  chairAt(s, 9, 0.2, 0); box(8, 3, 3.4, 0x7d8fa6, -11, 1.5, 12, s); box(8, 2.4, 1, 0x6c7e95, -11, 4, 13.6, s); box(5, 0.1, 7, 0xb5524a, -6, 0.06, 4, s);
  box(4, 5, 0.3, 0xd9c7a0, -17.4, 8, 2, s); box(3, 3, 0.3, 0x9fb7c9, -17.4, 8, 9, s); box(2.4, 6.5, 2.4, 0x7a5232, 15.5, 3.25, -9, s);
  const kc = new THREE.Group(); kc.position.set(6, 0, 9.6); s.add(kc); chairAt(kc, 0, -1.2, Math.PI, 0x74492a);
  const cobbSit = makeChar('cobb', 'neutral'); cobbSit.g.position.set(0, 0, -1.3); cobbSit.g.rotation.y = Math.PI; kc.add(cobbSit.g);
  const top = makeTop(0.6); top.position.set(4.5, 3.08, 3.7); s.add(top);
  // garden
  const r = rng(77);
  for (let i = 0; i < 12; i++) { const x = (r() - 0.5) * 110, z = -48 - r() * 40; box(1.3, 6, 1.3, 0x6a4a2e, x, 3, z, s); box(7, 6, 7, i % 2 ? 0x3f9a4a : 0x4aa856, x, 8.5, z, s); }
  for (let x = -60; x <= 60; x += 3) box(0.5, 2.6, 0.3, 0xf4f0e6, x, 1.3, -44, s); box(124, 0.3, 0.3, 0xf4f0e6, 0, 2, -44, s);
  box(6, 0.5, 6, 0xcdb98c, 6, 0.25, -26, s); box(1.4, 1.2, 1.4, 0xd9c79a, 5, 1.0, -26.5, s); box(0.9, 0.9, 0.9, 0xe24b3b, 7.2, 0.9, -25, s);
  for (const x of [-10, -6]) box(0.4, 7, 0.4, 0x8a8f96, x, 3.5, -30, s); box(4.4, 0.4, 0.4, 0x8a8f96, -8, 7, -30, s); const swing = new THREE.Group(); swing.position.set(-8, 7, -30); s.add(swing); box(0.08, 4.6, 0.08, 0x333, -0.8, -2.3, 0, swing); box(0.08, 4.6, 0.08, 0x333, 0.8, -2.3, 0, swing); box(2, 0.2, 0.8, 0xe2a23b, 0, -4.7, 0, swing);
  const cobb = makeChar('cobb', 'neutral'), boy = makeChar('boy', 'neutral'), girl = makeChar('girl', 'neutral'); boy.g.scale.setScalar(0.62); girl.g.scale.setScalar(0.66); s.add(cobb.g, boy.g, girl.g);
  return {
    s, cam, cobb, cobbSit, boy, girl, kids: [boy, girl], top, door, dl, kc, sun, hemi, il,
    pre(T) {
      s.userData.bloom = 0.32; swing.rotation.x = Math.sin(T * 1.6) * 0.25; cobb.reset(); cobb.g.visible = true; cobbSit.reset(); cobbSit.g.visible = false; cobbSit.g.position.y = 0; kc.rotation.x = 0; door.rotation.y = 0; dl.intensity = 0; il.intensity = 70;
      sun.position.set(10, 22, -44); sun.color.set(0xfff0d0); sun.intensity = 2.8; hemi.intensity = 1.25; s.background.set(0xcfe6fa); s.fog.color.set(0xcfe6fa);
      [boy, girl].forEach((k, i) => { k.reset(); put(k, i ? 2 : -1.5, 0, i ? -25 : -24, Math.PI); k.body.rotation.x = 0.5; k.look('neutral', T); });
      top.userData.set(T, 0.02, 0); top.visible = true;
    }
  };
});
SHOT('b5:0', 'home', c => {
  const S = c.S; s_bloom(S, 0.75); c.flash(0.1); put(S.cobb, -3.4, 0, 3, Math.PI - 0.15); S.cobb.idle(c.T); S.cobb.look('sad', c.T);
  S.kids.forEach((k, i) => { k.armR.rotation.x = -0.9 + Math.sin(c.T * 3 + i) * 0.3; });
  move(c.cam, [1.5, 5.2, 17], [0, 2.8, -24], [0.6, 4.6, 9.5], [0, 2.6, -24], c.k, 34);
});
SHOT('b5:1', 'home', c => {
  const S = c.S; s_bloom(S, 0.85); c.flash(0.1 + 0.25 * ease((c.k - 0.6) / 0.4)); S.cobb.g.visible = false;
  S.kids.forEach((k, i) => { const t = ease((c.k - 0.35) / 0.9); k.g.rotation.y = Math.PI - t * 1.15 * (i ? -1 : 1); k.head.rotation.y = -t * 0.5 * (i ? -1 : 1); k.body.rotation.x = 0.5 * (1 - t); });
  move(c.cam, [0.4, 3.4, -15], [0.2, 2.3, -24.5], [0.3, 2.9, -19.2], [0.2, 2.4, -24.5], c.k, 32);
});
function s_bloom(S, v) { S.s.userData.bloom = v; }
SHOT('h2:2', 'home', c => {
  const S = c.S, o = ease((c.k - 0.1) / 0.5); S.door.rotation.y = o * 1.75; S.dl.intensity = 45 * o; S.il.intensity = 30; s_bloom(S, 0.42);
  put(S.cobb, 0, 0, lerp(28.5, 22.5, ease((c.k - 0.25) / 0.75)), Math.PI); if (c.k > 0.25) S.cobb.walk(c.T * 6, 0.5); S.cobb.look('neutral', c.T);
  move(c.cam, [1.5, 4.2, 9], [0, 4.6, 26], [0.8, 4.4, 12], [0, 4.6, 26], c.k, 36);
});
SHOT('h3:0', 'home', c => {
  const S = c.S; s_bloom(S, 0.55); S.cobb.g.visible = false;
  S.kids.forEach((k, i) => { const t = ease((c.k - 0.1) / 0.75); k.g.rotation.y = Math.PI * (1 - t) * (i ? -1 : 1); k.body.rotation.x = 0.5 * (1 - t); k.look(t > 0.55 ? 'joy' : 'surprised', c.T); });
  move(c.cam, [0.4, 3.3, -15.5], [0.2, 2.3, -24.5], [0.3, 3.0, -17.5], [0.2, 2.5, -24.5], c.k, 32);
});
SHOT('h3:1', 'home', c => {
  const S = c.S, [i, k] = cuts(c.k, [0.42]); s_bloom(S, 0.6); c.flash(0.06);
  if (i === 0) {
    S.cobb.g.visible = false;
    S.kids.forEach((kd, j) => { put(kd, j ? 1.6 : -1.4, 0, lerp(j ? -25 : -24, -20.5, k), 0); kd.walk(c.T * 6.5 + j * 1.7, 0.9); kd.look('joy', c.T); kd.armL.rotation.z = -0.6; kd.armR.rotation.z = 0.6; });
    move(c.cam, [0.2, 2.5, -13.5], [0.1, 2.5, -22], [0.2, 2.5, -14.5], [0.1, 2.6, -21], k, 30);
  } else {
    const cb = S.cobb, kn = ease(k * 2.2); put(cb, 0, 0, -14.5, Math.PI); cb.body.position.y = -1.75 * kn; cb.legL.rotation.x = cb.legR.rotation.x = 1.45 * kn; cb.armL.rotation.set(-1.2 * kn, 0, -0.5 * kn); cb.armR.rotation.set(-1.2 * kn, 0, 0.5 * kn); cb.look('joy', c.T); cb.head.rotation.x = 0.15;
    S.kids.forEach((kd, j) => { const rk = ease(k * 1.8); put(kd, j ? 1.25 : -1.25, 0, lerp(-20.5, -16.6, rk), 0); if (rk < 1) kd.walk(c.T * 8 + j, 0.9); else { kd.g.position.y = Math.abs(Math.sin(c.T * 5 + j * 1.3)) * 0.35; kd.armL.rotation.set(-1.4, 0, 0.3); kd.armR.rotation.set(-1.4, 0, -0.3); } kd.look('joy', c.T); });
    move(c.cam, [10, 3.4, -20], [0, 2.6, -15.8], [8, 2.9, -18.6], [0, 2.7, -15.8], k, 32);
  }
});
const TABLE = c => { const S = c.S; put(S.cobb, 6, 0, 5.9, Math.PI); S.kids.forEach((k, j) => { put(k, j ? -3 : -6, 0, -22 - j * 3, 0.4); k.body.rotation.x = 0; k.walk(c.T * 5 + j, 0.6); k.look('joy', c.T); }); return S; };
SHOT('h4:0', 'home', c => {
  const S = TABLE(c), cb = S.cobb, sp = ease(c.k * 1.8); cb.armR.rotation.x = -1.2 + Math.sin(sp * Math.PI) * 0.25; cb.armR.rotation.z = 0.35 * Math.sin(sp * Math.PI); cb.head.rotation.x = 0.3; cb.look('neutral', c.T);
  S.top.userData.set(c.T, 0.05 * (1 - sp) + 0.02, 0); S.top.userData.spin.rotation.y = sp * sp * 40 + c.T * 36 * sp;
  move(c.cam, [0.8, 4.3, 1.2], [4.6, 3.5, 4.0], [1.6, 4.0, 1.6], [4.6, 3.5, 4.0], c.k, 32);
});
SHOT('h4:1', 'home', c => {
  const S = TABLE(c), cb = S.cobb, w = ease(c.k * 1.1); put(cb, lerp(1.5, 0, w), 0, lerp(1, -13, w), Math.PI + 0.1 * (1 - w)); cb.walk(c.T * 6.5, 0.6); cb.look('neutral', c.T);
  S.top.userData.set(c.T, 0.02); move(c.cam, [7.6, 3.75, 8.4], [3.4, 3.3, 0.5], [7.0, 3.65, 7.6], [3.4, 3.35, 0.5], c.k, 30);
});
SHOT('h5:0', 'home', c => {
  const S = TABLE(c), cb = S.cobb, t = ease((c.k - 0.1) / 0.5); put(cb, 0, 0, -12 + 2 * ease((c.k - 0.6) / 0.4), Math.PI * (1 - t)); if (c.k > 0.6) cb.walk(c.T * 6, 0.5); else cb.idle(c.T); cb.look(t > 0.5 ? 'serious' : 'neutral', c.T);
  S.top.userData.set(c.T, 0.02); move(c.cam, [2.0, 4.9, 1.5], [0, 4.7, -11.5], [1.4, 4.9, -1.5], [0, 4.7, -11.5], c.k, 30);
});
SHOT('h5:1', 'home', c => { const S = TABLE(c), cb = S.cobb; cb.idle(c.T); cb.head.rotation.x = 0.28; cb.look('serious', c.T); S.top.userData.set(c.T, 0.02); move(c.cam, [4.6, 3.5, -2.6], [5.6, 4.3, 5.9], [4.9, 3.6, -1.8], [5.7, 4.4, 5.9], c.k, 30); });
SHOT('h5:2', 'home', c => {
  const S = TABLE(c), cb = S.cobb, [i, k] = cuts(c.k, [0.56]); cb.head.rotation.x = 0.28; cb.look('serious', c.T); S.top.userData.set(c.T, 0.015);
  S.kids.forEach(kd => kd.g.visible = i === 1);
  if (i === 0) {
    const ph = k * 2.2, day = 0.5 + 0.5 * Math.cos(ph * Math.PI * 2); S.sun.position.set(40 * Math.cos(ph * Math.PI * 2 + 1.2), 6 + 20 * day, -44); S.sun.intensity = 0.3 + 2.6 * day; S.sun.color.setHSL(0.09, 0.9, 0.6 + 0.25 * day); S.hemi.intensity = 0.45 + 0.8 * day;
    const sky = new THREE.Color(0x14204a).lerp(new THREE.Color(0xcfe6fa), day); S.s.background.copy(sky); S.s.fog.color.copy(sky); S.il.intensity = 30 + 60 * (1 - day);
    move(c.cam, [-9, 6.4, 15], [3.5, 3.2, 1.5], [-6.5, 5.6, 12.5], [4, 3.3, 2.5], k, 36);
  } else { S.kids.forEach(kd => kd.g.visible = true); move(c.cam, [2.2, 3.55, 6.0], [4.5, 3.5, 3.7], [2.9, 3.5, 5.2], [4.5, 3.5, 3.7], k, 26); }
});
const SITK = (c, tip, low) => { const S = TABLE(c), cs = S.cobbSit; S.cobb.g.visible = false; cs.g.visible = true; cs.legL.rotation.x = cs.legR.rotation.x = -Math.PI / 2 * low; cs.g.position.y = 0.55 * (1 - low); cs.armL.rotation.x = cs.armR.rotation.x = -0.5 * low; S.kc.rotation.x = tip; S.top.userData.set(c.T, 0.015); return S; };
SHOT('h6:0', 'home', c => { const S = SITK(c, 0, ease(c.k * 1.6)); S.cobbSit.look('serious', c.T); S.cobbSit.head.rotation.x = 0.2 * (1 - c.k); move(c.cam, [-3.5, 4.6, 3.5], [6, 3.4, 8.2], [-2.5, 4.4, 4.2], [6, 3.5, 8.3], c.k, 32); });
SHOT('h6:1', 'home', c => { const S = SITK(c, 0.3 * ease(c.k), 1), cs = S.cobbSit; cs.look(c.k > 0.4 ? 'sleep' : 'neutral', c.T); cs.head.rotation.x = -0.25 * ease(c.k); move(c.cam, [-0.5, 4.5, 5.2], [6, 4.3, 8.6], [0.3, 4.4, 5.6], [6, 4.4, 8.8], c.k, 28); });
SHOT('h6:2', 'home', c => {
  const t = clamp(c.l / 1.5), S = SITK(c, 0.3 + 1.2 * t * t, 1), cs = S.cobbSit; cs.look('sleep', c.T); cs.head.rotation.x = -0.3; cs.armL.rotation.set(-0.5 - 1.6 * t, 0, -0.5 * t); cs.armR.rotation.set(-0.5 - 1.6 * t, 0, 0.5 * t); cs.legL.rotation.x = cs.legR.rotation.x = -Math.PI / 2 + 0.5 * t;
  s_bloom(S, 0.4 + t * 1.2); c.flash(ease((c.l - 0.45) / 1.0)); move(c.cam, [-1.5, 2.4, 5.5], [6, 3.6, 9.2], [-0.5, 2.0, 6.2], [6, 3.2, 10.2], t, 32, 0.06 * t);
});

// ======================= LIMBO HOUSE =======================
SET('limbohouse', () => {
  const { s, cam } = mkScene(0xf3a25a, [70, 330], 0xffc98a, 2.7, [0xffd9b0, 0x8a5a4a, 1.25], [-14, 12, -34], 40);
  s.userData.bloom = 0.42;
  ground(s, 500, '#d9c095', '#e2caa0');
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, 400), new THREE.MeshPhongMaterial({ color: 0x3f7396, shininess: 70, specular: 0xffc98a })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.06, -226); s.add(sea);
  const foam = [0, 1, 2].map(i => { const f = box(600, 0.14, 1.2, 0xfff0dc, 0, 0.14, -30, s); f.castShadow = false; return f; });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(30, 40), new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false })); sun.position.set(0, 20, -330); s.add(sun);
  const r = rng(13), tw = [];
  for (let i = 0; i < 20; i++) { const h = 26 + r() * 60, x = (r() - 0.5) * 340; if (Math.abs(x) < 34) continue; const b = box(9 + r() * 10, h, 9 + r() * 10, 0xa98a78, x, h / 2 - 4, -120 - r() * 150, s); b.rotation.z = (r() - 0.5) * 0.3; b.castShadow = false; tw.push(b); }
  // terrace + glass room
  const Y = 0.6; box(26, Y, 20, 0xcfc4b2, 0, Y / 2, 0, s); box(28, 0.5, 22, 0xe9e2d4, 0, 10.6, 0, s);
  for (const x of [-12.6, 12.6]) for (const z of [-9.6, 9.6]) box(0.5, 10, 0.5, 0x4a4038, x, 5.6, z, s);
  const glass = new THREE.MeshPhongMaterial({ color: 0xffe9c9, transparent: true, opacity: 0.1, shininess: 120, depthWrite: false });
  box(25, 9.6, 0.1, glass, 0, 5.6, -9.6, s).castShadow = false; for (const x of [-12.6, 12.6]) box(0.1, 9.6, 19, glass, x, 5.6, 0, s).castShadow = false;
  for (const x of [-6.3, 0, 6.3]) box(0.18, 9.6, 0.18, 0x4a4038, x, 5.6, -9.6, s);
  box(3.2, 0.3, 10, 0x5a3d28, 0, Y + 2.9, 0, s); for (const z of [-4.4, 4.4]) for (const x of [-1.2, 1.2]) box(0.3, 2.8, 0.3, 0x4a3020, x, Y + 1.4, z, s);
  chairAt(s, -3.4, 0, Math.PI / 2, 0x4a3020, Y); chairAt(s, 3.4, 0, -Math.PI / 2, 0x4a3020, Y);
  for (const z of [-2.6, 2.6]) { box(0.3, 1.0, 0.3, 0xf4efe6, 0, Y + 3.55, z, s); box(0.16, 0.3, 0.16, basic(0xffd27a), 0, Y + 4.2, z, s); }
  for (const x of [-0.9, 0.9]) { box(0.9, 0.08, 0.9, 0xf4efe6, x, Y + 3.1, 0, s); box(0.3, 0.55, 0.3, 0xcfe6f2, x * 0.6, Y + 3.33, 0.9, s); }
  const cl = new THREE.PointLight(0xffc27a, 55, 22); cl.position.set(0, 6.4, 3); s.add(cl);
  const mal = put(makeChar('mal', 'neutral'), -3.3, Y, 0, Math.PI / 2), cobb = put(makeChar('cobb', 'serious'), 3.3, Y, 0, -Math.PI / 2), fis = put(makeChar('fischer', 'neutral'), 22, 0, 2, -0.3); s.add(mal.g, cobb.g, fis.g);
  const dust = mkDust(s, 260, [0x3e4b5e, 0x3e4b5e, 0xf5dac6, 0x354051, 0xcfe0f2]);
  return { s, cam, mal, cobb, fis, dust, Y, pre(T) { s.userData.bloom = 0.42; foam.forEach((f, i) => { const ph = (T * 0.16 + i / 3) % 1; f.position.z = -22 - (1 - ph) * 40; f.scale.z = 0.6 + ph * 1.5; }); cobb.g.visible = true; for (const ch of [mal, cobb]) { ch.reset(); ch.sit(); ch.idle(T + (ch === mal ? 1 : 0)); ch.body.position.y = 0; } fis.g.visible = false; dust.set(0); mal.look('neutral', T); cobb.look('serious', T); } };
});
const HY = 5.3;   // seated head height on the terrace
SHOT('g1:0', 'limbohouse', c => { move(c.cam, [26, 15, 46], [0, 5, -6], [7, 6.4, 21], [0, 4.4, 0], c.k, 38); });
SHOT('g1:1', 'limbohouse', c => { const S = c.S; S.mal.body.rotation.x = 0.12 * ease(c.k * 1.5); S.mal.armR.rotation.x = -1.1; S.mal.armL.rotation.x = -1.1; S.cobb.look('sad', c.T); move(c.cam, [1.5, 5.0, 16.5], [0, 4.6, 0], [0.5, 5.0, 13.5], [0, 4.6, 0], c.k, 34); });
SHOT('g2', 'limbohouse', c => { const S = c.S; S.mal.look('neutral', c.T, c.talk); S.mal.head.rotation.z = 0.08; S.mal.head.rotation.y = 0.2; S.mal.body.rotation.x = 0.1; move(c.cam, [6.4, HY + 0.7, 2.9], [-3.3, HY - 0.1, 0], [5.8, HY + 0.6, 2.5], [-3.3, HY - 0.1, 0], c.k, 24); });
SHOT('g3', 'limbohouse', c => { const S = c.S, d = ease((c.k - 0.35) / 0.5); S.cobb.look(d > 0.5 ? 'sad' : 'surprised', c.T); S.cobb.head.rotation.y = -0.35; S.cobb.head.rotation.x = 0.32 * d; move(c.cam, [-2.6, HY + 0.1, 5.6], [3.3, HY, 0], [-2.0, HY + 0.1, 4.6], [3.3, HY - 0.1, 0], c.k, 28); });
SHOT('g4:0', 'limbohouse', c => { const S = c.S; S.mal.look('sad', c.T, c.talk); S.mal.head.rotation.y = 0.2; S.mal.head.rotation.x = 0.06; S.mal.body.rotation.x = 0.1; move(c.cam, [5.9, HY + 0.6, 2.6], [-3.3, HY - 0.1, 0], [5.2, HY + 0.5, 2.3], [-3.3, HY - 0.1, 0], c.k, 22); });
SHOT('g4:1', 'limbohouse', c => { const S = c.S; S.mal.look('neutral', c.T, c.talk); S.mal.head.rotation.y = 0.2; S.mal.body.rotation.x = 0.14; S.mal.armR.rotation.x = -1.35 * ease(c.k * 1.6); S.cobb.look('sad', c.T); S.cobb.head.rotation.x = 0.2; move(c.cam, [0.6, HY - 0.4, 9.5], [-0.6, HY - 0.5, 0], [0.3, HY - 0.4, 8.4], [-0.8, HY - 0.5, 0], c.k, 30); });
SHOT('g8:0', 'limbohouse', c => {
  const S = c.S, f = S.fis, d = ease((c.k - 0.25) / 0.75); f.g.visible = d < 0.35 && (d < 0.08 || hash(Math.floor(c.T * 24)) > 0.35); f.reset(); f.idle(c.T); f.look('neutral', c.T); S.dust.set(d, [[22, 0, 2]], null, 0.34);
  move(c.cam, [24, 4.2, 18], [22, 3.6, 2], [23.2, 4.4, 15], [22.3, 4.4, 2], c.k, 32);
});
SHOT('g8:1', 'limbohouse', c => { const S = c.S; S.cobb.look('surprised', c.T); S.cobb.head.rotation.y = -0.35; move(c.cam, [-3.2, HY + 0.2, 8], [3.3, HY, 0], [-1.6, HY + 0.1, 4.2], [3.3, HY, 0], c.k, 28); });
SHOT('g8:2', 'limbohouse', c => {
  const S = c.S, [i, k] = cuts(c.k, [0.5]), r = ease(c.k * 1.4); S.mal.body.rotation.x = 0.16; S.mal.armR.rotation.x = -1.4 * r; S.mal.armR.rotation.z = 0.1; S.mal.look('neutral', c.T); S.cobb.look('sad', c.T); S.cobb.head.rotation.x = 0.15 * (1 - k);
  if (i === 0) move(c.cam, [-2, 5.2, 19], [0, 4.8, 0], [1.0, 5.0, 14], [0, 4.7, 0], k, 32);
  else { S.cobb.armL.rotation.x = -1.3 * ease(k * 1.3); move(c.cam, [5.6, HY + 0.9, 5.4], [-3.3, HY - 0.5, -0.2], [5.0, HY + 0.7, 4.6], [-3.3, HY - 0.4, -0.2], k, 30); }
});
SHOT('g9', 'limbohouse', c => { const S = c.S; S.s.userData.bloom = 0.42 + 0.3 * c.k; S.mal.look('neutral', c.T, c.talk); S.mal.head.rotation.y = 0.2; S.mal.head.rotation.z = 0.06; S.mal.body.rotation.x = 0.12; S.mal.armR.rotation.x = -1.4; S.cobb.g.visible = false; move(c.cam, [4.6, HY + 0.2, 1.9], [-3.3, HY - 0.05, 0], [3.6, HY + 0.15, 1.5], [-3.3, HY - 0.05, 0], c.k, 24); });

// ======================= THE BEDSIDE (real world) =======================
SET('bedroom', () => {
  const { s, cam } = mkScene(0xe9e4da, null, 0xfff4e2, 2.2, [0xffffff, 0xb9a890, 1.2], [-10, 18, -30], 26);
  s.userData.bloom = 0.4; const sun = s.userData.sun, hemi = s.children[0];
  const wood = tex(64, 64, c => { c.fillStyle = '#c9a57a'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#b9956a'; c.fillRect(0, 0, 64, 3); c.fillRect(30, 0, 3, 64); }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(6, 6);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(24, 26), new THREE.MeshLambertMaterial({ map: wood })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, 3); fl.receiveShadow = true; s.add(fl);
  const wc = 0xe6ddcd, Z = -8.5;
  box(24, 4, 0.6, wc, 0, 2, Z, s); box(24, 2.4, 0.6, wc, 0, 10.2, Z, s); box(1.6, 5, 0.6, wc, -10.7, 6.5, Z, s); box(8, 5, 0.6, wc, 0, 6.5, Z, s); box(1.6, 5, 0.6, wc, 10.7, 6.5, Z, s);
  box(0.6, 11.4, 26, wc, -11.5, 5.7, 3, s); box(24, 0.6, 26, 0xf4efe6, 0, 11.4, 3, s);
  box(0.6, 11.4, 9.5, wc, 11.5, 5.7, -3.75, s); box(0.6, 11.4, 8.5, wc, 11.5, 5.7, 11.75, s); box(0.6, 2.4, 6.5, wc, 11.5, 10.2, 4.25, s);
  box(8, 9, 8, 0xf2d9b0, 16, 4.5, 4.25, s).castShadow = false; const hall = new THREE.PointLight(0xffd9a0, 40, 18); hall.position.set(14, 6, 4.25); s.add(hall);
  for (const x of [-6.95, 6.95]) { box(5.9, 0.3, 1.1, 0xf4efe6, x, 3.95, Z + 0.4, s); box(0.2, 5, 0.3, 0xf4efe6, x, 6.5, Z + 0.2, s); box(5.9, 0.2, 0.3, 0xf4efe6, x, 6.5, Z + 0.2, s); }
  const skyM = basic(0xbfe0ff), sky = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), skyM); sky.position.set(0, 8, -30); s.add(sky);
  const leafM = new THREE.MeshLambertMaterial({ color: 0x4aa856 }); for (const x of [-7.5, 8.5]) { box(0.8, 7, 0.8, 0x6a4a2e, x, 3.5, -17, s); box(5.5, 5, 5.5, leafM, x, 8.5, -17, s); }
  // bed
  box(5.8, 1.3, 8.8, 0x8a6a4a, 0.5, 0.85, -3.9, s); box(5.4, 0.6, 8.4, 0xf4f1ea, 0.5, 1.8, -3.9, s); box(5.8, 3.4, 0.4, 0x8a6a4a, 0.5, 2.6, -8.1, s); box(3.6, 0.5, 1.7, 0xffffff, 0.5, 2.05, -7.0, s); box(5.5, 1.3, 4.5, 0x9fb7d4, 0.5, 2.72, -1.35, s); box(5.6, 0.2, 0.8, 0xf4f1ea, 0.5, 3.36, -3.3, s);
  // nightstand, dream machine, lamp
  box(2.7, 2.6, 2.7, 0x8a6a4a, -4.1, 1.3, -6.6, s); box(2.9, 0.2, 2.9, 0x74573c, -4.1, 2.7, -6.6, s);
  const steel = new THREE.MeshPhongMaterial({ color: 0xc3cad3, shininess: 90, specular: 0xffffff });
  box(3.0, 1.0, 2.0, steel, 4.4, 0.5, -6.8, s); box(2.6, 0.12, 1.6, 0x2a2e36, 4.4, 1.06, -6.8, s); const led = box(0.25, 0.14, 0.25, basic(0x7dffb0), 5.3, 1.15, -6.3, s);
  const tube = (a, b) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), m = box(0.09, 0.09, A.distanceTo(B), 0xe9eef2, 0, 0, 0, s); m.position.copy(A).lerp(B, 0.5); m.lookAt(B); m.castShadow = false; }; tube([4.0, 1.1, -6.4], [3.2, 2.7, -4.6]); tube([3.2, 2.7, -4.6], [2.1, 3.25, -2.9]);
  box(0.3, 1.2, 0.3, 0x8a8f96, -4.9, 3.4, -7.4, s); box(1.3, 1.0, 1.3, basic(0xffe7b8), -4.9, 4.5, -7.4, s); const lamp = new THREE.PointLight(0xffd9a0, 30, 18); lamp.position.set(-4.4, 5.2, -5.6); s.add(lamp);
  chairAt(s, 4.8, -2.6, -Math.PI / 2, 0x74573c);
  // maze drawings that fill the walls over the years
  const mz = new THREE.MeshLambertMaterial({ map: mazeTex() }), sheets = [];
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), mz); m.position.set(-2.9 + (i % 4) * 1.95, 5.3 + Math.floor(i / 4) * 1.9, Z + 0.34); m.rotation.z = (hash(i) - 0.5) * 0.25; s.add(m); sheets.push(m); }
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), mz); m.position.set(11.15, 4.6 + Math.floor(i / 4) * 1.9, -7.2 + (i % 4) * 1.9); m.rotation.set(0, -Math.PI / 2, (hash(i + 9) - 0.5) * 0.25); s.add(m); sheets.push(m); }
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), mz);
  // people
  const cobbs = ['cobbBed', 'cobbMid', 'cobbOld'].map(n => { const ch = makeChar(n, 'sleep'); s.add(ch.g); return ch; });
  const mals = ['malReal', 'malMid', 'malOld'].map(n => { const ch = makeChar(n, 'sad'); s.add(ch.g); return ch; });
  const tears = [-1, 1].map(x => box(0.1, 0.3, 0.06, basic(0x9fd8ff), x * 0.36, 0.42, 0.67, mals[2].head));
  mals.forEach(m => { const p = pad.clone(); p.rotation.x = -1.1; p.position.set(0, 0.25, 0.75); m.hand('L').add(p); m.pad = p; });
  const son = makeChar('son', 'surprised'), dau = makeChar('daughter', 'surprised'); s.add(son.g, dau.g);
  const top1 = makeTop(0.55); top1.position.set(-3.7, 2.8, -5.9); s.add(top1);
  const top2 = makeTop(0.55); top2.position.set(-7.6, 4.1, Z + 0.5); s.add(top2);
  const colA = new THREE.Color(), colB = new THREE.Color();
  return {
    s, cam, cobbs, mals, son, dau, top1, top2, tears, sheets,
    // age 0..2, day 0..1 (1 = noon), season 0..1, sketch: Mal draws instead of holding his hand, awake: Cobb's eyes
    pre(T) { this.age = 0; this.day = 1; this.season = 0; this.sketch = 0; this.awake = 0; this.nsheets = 0; this.hold = 1; top1.rotation.y = 0; son.g.visible = dau.g.visible = false; top1.visible = top2.visible = false; top1.userData.tilt.rotation.set(0, 0, 0); top1.position.set(-3.7, 2.8, -5.9); tears.forEach(t => t.visible = false); s.userData.bloom = 0.4; led.material.color.set(Math.sin(T * 3) > 0 ? 0x7dffb0 : 0x2a6a48); },
    post(T) {
      const a = Math.round(this.age), d = this.day;
      cobbs.forEach((ch, i) => { ch.g.visible = i === a; if (i !== a) return; ch.reset(); ch.g.rotation.set(-Math.PI / 2, 0, 0); ch.g.position.set(0.5, 2.6, 0.2); ch.armR.rotation.x = -0.32; ch.armL.rotation.x = -0.05; ch.body.position.y = 0; ch.look(this.awake > 0.5 ? 'neutral' : 'sleep', T); ch.body.scale.z = 1 + Math.sin(T * 1.6) * 0.03; });
      mals.forEach((ch, i) => { ch.g.visible = i === a; if (i !== a) return; ch.reset(); put(ch, 4.6, 0, -2.6, -Math.PI / 2); ch.sit(); ch.idle(T); ch.pad.visible = this.sketch > 0.5; if (this.sketch > 0.5) { ch.armL.rotation.set(-0.95, 0, 0.25); ch.armR.rotation.set(-1.05 + Math.sin(T * 14) * 0.08, 0, -0.45 + Math.sin(T * 9) * 0.1); ch.head.rotation.x = 0.35; } else if (this.hold) { ch.body.rotation.x = 0.22; ch.armR.rotation.set(-1.05, 0, -0.1); ch.armL.rotation.set(-1.0, 0, 0.35); ch.head.rotation.x = 0.12; } });
      sheets.forEach((m, i) => { const k = clamp(this.nsheets - i); m.visible = k > 0; m.scale.setScalar(k < 1 ? 1 + Math.sin(k * Math.PI) * 0.3 : 1); });
      colA.set(0x101a3a).lerp(colB.set(0xf2a65a), clamp(d * 2)).lerp(colB.set(0xbfe0ff), clamp(d * 2 - 1)); skyM.color.copy(colA); sun.intensity = 0.15 + 2.1 * d; sun.color.setHSL(0.09, 0.8, 0.62 + 0.3 * d); hemi.intensity = 0.4 + 0.8 * d; lamp.intensity = 12 + 45 * (1 - d); s.background.set(0xe9e4da);
      const se = (this.season % 1) * 4, si = Math.floor(se) % 4, pal = [0x4aa856, 0xd98a2e, 0xf4f6f8, 0xf2a6c0]; leafM.color.set(pal[si]).lerp(colB.set(pal[(si + 1) % 4]), ease(se - Math.floor(se)));
      top2.userData.set(T, 0.012);
    }
  };
});
const BED = (key, fn) => SHOT(key, 'bedroom', c => { fn(c, c.S); c.S.post(c.T); c.late && c.late(); });
BED('g5:0', (c, S) => { c.flash(1 - c.l / 0.55); S.s.userData.bloom = 0.4 + 0.6 * (1 - ease(c.k * 2)); move(c.cam, [0.5, 6.6, -1.6], [0.5, 2.9, -4.6], [0.6, 10, 2.5], [0.8, 2.8, -4.0], c.k, 30); });
BED('g5:1', (c, S) => { const m = S.mals[0]; m.look('sad', c.T); move(c.cam, [-2.4, 5.4, 2.2], [4.6, 4.7, -2.6], [-1.8, 5.3, 1.6], [4.6, 4.7, -2.6], c.k, 28); });
BED('g5:2', (c, S) => { S.mals[0].look('sad', c.T); S.season = c.k * 0.5; S.day = 1 - 0.3 * c.k; move(c.cam, [-6.5, 7.2, 17], [1, 3.8, -3], [-4, 6.0, 13.5], [1.4, 3.8, -3], c.k, 36); });
BED('g6', (c, S) => {
  const k = c.k; S.age = k < 0.34 ? 0 : k < 0.68 ? 1 : 2; S.day = 0.5 + 0.5 * Math.cos(k * Math.PI * 2 * 7); S.season = k * 5; S.nsheets = k * 17.5; S.sketch = (k * 6) % 2 < 1.25 ? 1 : 0; S.mals.forEach(m => m.look(S.sketch ? 'serious' : 'sad', c.T));
  for (const e of [0.34, 0.68]) c.flash(0.45 * clamp(1 - Math.abs(k - e) / 0.035));
  const yr = String(1 + Math.floor(k * 15.99)).padStart(2, '0');
  c.dom(`<div style="position:absolute;left:90px;top:128px;background:rgba(8,9,12,.62);border-radius:18px;padding:18px 34px 22px"><div style="font-size:30px;letter-spacing:10px;color:#ffd24a;font-weight:700">AT HIS BEDSIDE</div><div style="font-size:104px;line-height:1.05;letter-spacing:4px">YEAR ${yr}</div><div style="width:${Math.round(340 * k)}px;height:8px;background:#ffd24a;margin-top:10px"></div></div>`);
  move(c.cam, [-7.5, 6.2, 14.5], [1.2, 4.2, -3], [5.5, 5.4, 12], [2.2, 4.4, -3.4], k, 36);
});
BED('h7:0', (c, S) => { S.age = 2; S.nsheets = 16; S.awake = c.k > 0.5 ? 1 : 0; S.mals[2].look('sad', c.T); c.flash(1 - c.l / 1.1); S.s.userData.bloom = 0.4 + 0.5 * (1 - ease(c.l / 1.5)); const ch = S.cobbs[2]; move(c.cam, [0.5, 9.6, 2.2], [0.5, 2.9, -4.7], [0.5, 8.2, 0.6], [0.5, 2.9, -4.7], c.k, 26); });
BED('h7:1', (c, S) => { S.age = 2; S.nsheets = 16; S.awake = 1; S.mals[2].look('joy', c.T); move(c.cam, [1.8, 8.0, -1.6], [0.5, 2.9, -4.9], [1.0, 7.2, -2.2], [0.5, 2.9, -4.9], c.k, 22); });
BED('h7:2', (c, S) => { S.age = 2; S.nsheets = 16; S.awake = 1; S.mals[2].look('joy', c.T); c.late = () => { S.mals[2].armR.rotation.x = -1.05 + Math.sin(c.T * 5) * 0.05; }; move(c.cam, [1.6, 8.2, 2.6], [2.6, 3.2, -2.5], [2.0, 7.0, 1.6], [2.6, 3.2, -2.5], c.k, 24); });
BED('h8', (c, S) => { S.age = 2; S.nsheets = 16; S.awake = 1; const m = S.mals[2]; S.tears.forEach((t, i) => { t.visible = true; t.position.y = 0.42 - ((c.T * 0.25 + i * 0.4) % 1) * 0.45; }); S.s.userData.bloom = 0.5; move(c.cam, [-2.8, 5.3, -0.9], [4.6, 4.7, -2.6], [-2.0, 5.2, -1.1], [4.6, 4.7, -2.6], c.k, 24); c.late = () => { m.body.rotation.x = 0.08; m.head.rotation.set(0.02, 0.1, -0.06); m.look('neutral', c.T, c.talk); }; });
BED('h9', (c, S) => {
  S.age = 2; S.nsheets = 16; S.awake = 1; S.mals[2].look('joy', c.T); const run = ease((c.k - 0.45) / 0.55);
  [S.son, S.dau].forEach((k, i) => { k.g.visible = true; k.reset(); put(k, lerp(12.2 + i * 1.6, 7.4 - i * 0.6, run), 0, lerp(3.4 + i * 1.9, 1.0 + i * 2.6, run), -Math.PI / 2 - 0.25); if (run > 0 && run < 1) k.walk(c.T * 9 + i, 0.8); else k.idle(c.T + i); k.look(c.k > 0.3 ? 'joy' : 'surprised', c.T); if (c.k > 0.3) { k.armL.rotation.z = -0.5 * run; k.armR.rotation.z = 0.5 * run; } });
  move(c.cam, [-3.5, 4.9, 3.2], [11.5, 4.3, 4.2], [-5, 5.2, 4.6], [9, 4.2, 3.2], c.k, 32);
});
BED('h10', (c, S) => {
  S.age = 2; S.nsheets = 16; S.awake = 1; S.mals[2].look('joy', c.T); S.top1.visible = true;
  const tf = LINE.h10.sents[0].end - 0.4, t = c.T - tf, pre = clamp(1 - (tf - c.T) / (tf - LINE.h10.slot[0])), u = S.top1.userData;
  if (t < 0) { u.set(c.T, 0.03 + 0.3 * pre * pre, 38 - 22 * pre); }
  else { const f = clamp(t / 0.32), b = Math.exp(-t * 3.2) * Math.sin(t * 16) * 0.16 * (t > 0.32 ? 1 : 0); u.tilt.rotation.set(0, 0, -(1.42 * f * f + b)); u.spin.rotation.y = (tf * 16) + 6 * (1 - Math.exp(-t * 2.2)); S.top1.rotation.y = 0.9 * (1 - Math.exp(-t * 2.5)); S.top1.position.x = -3.7 - 0.25 * clamp(t / 0.6); }
  move(c.cam, [-1.4, 4.4, -0.6], [-3.8, 3.2, -6.0], [-2.2, 3.9, -2.2], [-3.9, 3.15, -6.0], c.k, 28);
});
BED('h11', (c, S) => {
  S.age = 2; S.nsheets = 16; S.awake = 1; S.top1.visible = S.top2.visible = true; S.top1.userData.tilt.rotation.set(0, 0, -1.42); S.top1.rotation.y = 0.9; S.top1.position.x = -3.95; S.top1.userData.spin.rotation.y = 0;
  const e = LINE.h11.sents[0].end, k = ease(c.l / 2.2), k2 = clamp((c.l - 1.2) / 3.5); S.s.userData.bloom = 0.4 + 0.25 * k;
  move(c.cam, [-2.2, 3.9, -2.2], [-3.9, 3.15, -6.0], [-5.6 - 0.9 * k2, 4.9, -3.4 - 1.6 * k2], [-7.6, 4.75, -8.0], k, 28 - 4 * k2);
  if (c.T > e + 1.2) c.fade(1);
});

// ======================= AIRPORT =======================
SET('airport', () => {
  const { s, cam } = mkScene(0xdfeaf4, [60, 220], 0xffffff, 2.2, [0xffffff, 0xc4ccd6, 1.6], [-16, 30, 10], 44);
  s.userData.bloom = 0.35;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(90, 120), new THREE.MeshPhongMaterial({ color: 0xd9dde3, shininess: 90, specular: 0xffffff })); fl.rotation.x = -Math.PI / 2; fl.position.z = -30; fl.receiveShadow = true; s.add(fl);
  for (let x = -42; x <= 42; x += 12) box(0.8, 22, 0.8, 0x6b7480, x, 11, -70, s); const gl = new THREE.Mesh(new THREE.PlaneGeometry(90, 22), basic(0xbfe0fb)); gl.position.set(0, 11, -71); s.add(gl);
  box(90, 1, 120, 0xf4f6f9, 0, 22.5, -30, s); for (let z = -60; z < 20; z += 12) box(60, 0.3, 1.2, basic(0xffffff), 0, 21.8, z, s);
  const pl = new THREE.Group(); pl.position.set(-10, 0, -86); s.add(pl); box(50, 5, 5, 0xffffff, 0, 6, 0, pl); box(8, 9, 1, 0x3f6fb5, 22, 11, 0, pl); box(16, 0.8, 26, 0xe6ebf0, 0, 5, 0, pl);
  for (let i = 0; i < 4; i++) { const x = -15 + i * 6.5; box(3.4, 3.6, 2.4, 0x3d4a5c, x, 1.8, -34, s); box(3.6, 0.2, 2.6, 0x9aa6b4, x, 3.7, -34, s); box(0.15, 3, 2.4, new THREE.MeshPhongMaterial({ color: 0xcfe6f7, transparent: true, opacity: 0.35 }), x - 1.7, 5.2, -34, s); }
  const off = put(makeChar('civD', 'neutral'), -8.5, 0, -36, 0); s.add(off.g);
  const sign = label('ARRIVALS', { h: 1.5, bg: '#14161c', color: '#ffd24a' }); sign.position.set(0, 13.5, -40); s.add(sign);
  const sign2 = label('WELCOME HOME', { h: 0.9, bg: '#1f4f9a', color: '#fff' }); sign2.position.set(14, 10, -30); s.add(sign2);
  // carousel
  const C = new THREE.Group(); C.position.set(15, 0, -12); s.add(C); box(9, 1.4, 22, 0x4a5058, 0, 0.7, 0, C); box(6, 1.8, 19, 0x2b2f36, 0, 1.2, 0, C); box(9.4, 0.3, 22.4, 0xaab3bd, 0, 1.5, 0, C);
  const bags = [0, 1, 2, 3, 4, 5, 6].map(i => box(1.5 + hash(i) * 0.8, 1.0, 2.2, [0xb5433a, 0x2f5f8f, 0x3f8f5a, 0x8a6a3a, 0x5a4a8f][i % 5], 0, 2.1, 0, C));
  const crew = [['arthur', -7, -14, 0.9], ['ariadne', -9.5, -6, 1.1], ['eames', 9, -20, -0.9], ['yusuf', 8.5, -3, -1.3], ['saito', -6.5, -24, 0.7], ['fischer', 10.5, -11, -1.2]].map(([n, x, z, ry]) => { const ch = put(makeChar(n, 'neutral'), x, 0, z, ry); ch.ry = ry; s.add(ch.g); return ch; });
  box(0.5, 0.9, 0.2, 0x111, 0, -1.7, 0.5, crew[4].armR); box(1.6, 2.4, 0.9, 0x6a4a2e, 12, 1.2, -10, s);
  const cobb = makeChar('cobb', 'neutral'); s.add(cobb.g);
  return { s, cam, cobb, crew, off, pre(T) { bags.forEach((b, i) => { const ph = (T * 0.09 + i / 7) % 1, a = ph * Math.PI * 2; b.position.set(Math.sin(a) * 3.6, 2.1, Math.cos(a) * 10); b.rotation.y = a; }); } };
});
SHOT('h2:1', 'airport', c => {
  const S = c.S, cb = S.cobb, z = lerp(-28, -12, c.k); put(cb, 0, 0, z, 0); cb.walk(c.T * 7, 0.6); cb.look(c.k > 0.5 ? 'neutral' : 'serious', c.T);
  S.crew.forEach((ch, i) => { ch.reset(); ch.idle(c.T + i); const dx = 0 - ch.g.position.x, dz = z - ch.g.position.z; ch.head.rotation.y = clamp(Math.atan2(dx, dz) - ch.ry, -1.2, 1.2); ch.look(i === 0 || i === 2 ? 'smirk' : 'neutral', c.T); if (i === 4) { ch.armR.rotation.x = -2.5; ch.armR.rotation.z = -0.35; } if (i === 2) ch.head.rotation.x = 0.15 * Math.sin(c.k * Math.PI * 2); });
  S.off.reset(); S.off.armR.rotation.x = -1.0 - Math.abs(Math.sin(c.T * 7)) * 0.5; S.off.look('neutral', c.T);
  move(c.cam, [1.5, 4.6, 9], [0, 4.4, -16], [0.6, 4.6, 3], [0, 4.5, -16], c.k, 40);
});

// ======================= THE DESIGN (dark stage) =======================
SET('design', () => {
  const { s, cam } = mkScene(0x06080d, [30, 110], 0x9fc0ff, 0.5, [0x8fa8d8, 0x0a0c12, 0.8], [6, 20, 14]);
  s.userData.bloom = 0.5;
  const g = ground(s, 400, '#0d1118', '#121722'); g.position.x = 60;
  const spot = x => { const p = new THREE.PointLight(0xfff0d8, 420, 36); p.position.set(x, 11, 9); s.add(p); const d = new THREE.Mesh(new THREE.CircleGeometry(8.5, 40), basic(0x1b2333)); d.rotation.x = -Math.PI / 2; d.position.set(x, 0.03, 0); s.add(d); };
  [0, 50, 100, 150].forEach(spot);
  const names = ['saito', 'arthur', 'ariadne', 'eames', 'yusuf'], figs = names.map(n => { const ch = makeChar(n, 'neutral'); s.add(ch.g); return ch; });
  // miniature of the three dream levels
  const mini = new THREE.Group(); mini.position.set(100, 0, 0); s.add(mini); const r = rng(5);
  const L1 = new THREE.Group(), L2 = new THREE.Group(), L3 = new THREE.Group(); mini.add(L1, L2, L3); L1.position.y = 7.6; L2.position.y = 4.2; L3.position.y = 0.8;
  [L1, L2, L3].forEach((L, i) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.4, 28), M([0x39424d, 0x7a1f24, 0xeef3f8][i])); d.castShadow = true; L.add(d); });
  for (let i = 0; i < 16; i++) { const a = r() * 6.28, d = 1 + r() * 2.6, h = 0.8 + r() * 1.8; box(0.8, h, 0.8, 0x56626f, Math.sin(a) * d, 0.2 + h / 2, Math.cos(a) * d, L1); } box(0.5, 0.5, 2.6, 0x8a2b22, 0, 0.5, 0, L1);
  box(6, 0.2, 1.8, 0xd9c7a0, 0, 2.3, 0, L2); for (const z of [-0.9, 0.9]) box(6, 2.1, 0.15, 0xd9c7a0, 0, 1.25, z, L2); for (let x = -2.4; x < 3; x += 1.2) box(0.5, 1.4, 0.2, 0x4a2f1b, x, 0.9, 0.8, L2);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2 + r() * 1.4, 4), M(0xd6e0ea)); m.position.set(Math.sin(i) * 2.9, 1.2, Math.cos(i) * 2.9); L3.add(m); } box(2.2, 1.4, 1.6, 0x8d949c, 0, 0.9, 0, L3);
  const mal = makeChar('mal', 'neutral'); s.add(mal.g);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: mazeTex('#0f2a55', '#8fd0ff'), side: THREE.DoubleSide })); s.add(sheet);
  const sl = new THREE.PointLight(0x6fb6ff, 0, 22); s.add(sl);
  const dust = mkDust(s, 420, [0x4fa8ff, 0x8fd0ff, 0x2f7fe0, 0xcfe9ff]);
  return { s, cam, figs, mini, L: [L1, L2, L3], mal, sheet, sl, dust, pre(T) { s.userData.bloom = 0.5; figs.forEach(f => { f.reset(); f.g.visible = false; f.g.scale.setScalar(1); f.idle(T); f.look('neutral', T); }); mal.g.visible = false; sheet.visible = false; sl.intensity = 0; dust.set(0); mini.rotation.y = T * 0.9; [L1, L2, L3].forEach((L, i) => L.rotation.y = T * (i % 2 ? -1.4 : 1.2)); } };
});
SHOT('g7:0', 'design', c => { const f = c.S.figs[0]; f.g.visible = true; put(f, 0, 0, 0, 0.2); f.look('smirk', c.T); move(c.cam, [2.5, 4.6, 13], [0, 4.2, 0], [1.2, 4.8, 9], [0, 4.6, 0], c.k, 32); });
SHOT('g7:1', 'design', c => { c.S.figs.slice(1).forEach((f, i) => { f.g.visible = true; put(f, 50 + (i - 1.5) * 3.6, 0, 0, (1.5 - i) * 0.12); f.look(i === 2 ? 'smirk' : 'neutral', c.T); }); move(c.cam, [45, 4.4, 17], [48.5, 3.6, 0], [53, 4.4, 15.5], [51, 3.6, 0], c.k, 36); });
SHOT('g7:2', 'design', c => { move(c.cam, [107, 15, 24], [100, 5.5, 0], [105, 8, 20], [100, 4.6, 0], c.k, 36); });
SHOT('g7:3', 'design', c => {
  const S = c.S, X = 150, d = ease((c.k - 0.12) / 0.8), tg = [X, 3.3, 1.9], srcs = [];
  S.figs.forEach((f, i) => { const a = (i - 2) * 0.62, x = X + Math.sin(a) * 8.5, z = -1.5 - Math.cos(a) * 3.5 + 3; put(f, x, 0, z, -a * 0.6); srcs.push([x, 0, z]); f.g.visible = d < 0.22; f.g.scale.setScalar(1 - d * 2); });
  const m = S.mal; m.g.visible = true; m.reset(); put(m, X, 0, 0.6, 0); m.idle(c.T); m.armL.rotation.set(-1.0, 0, 0.3); m.armR.rotation.set(-1.0, 0, -0.3); m.look('neutral', c.T); m.head.rotation.x = 0.18;
  S.sheet.visible = true; S.sheet.position.set(...tg); S.sheet.rotation.set(-1.15, 0, 0); S.sheet.scale.setScalar(1 + 0.12 * Math.sin(c.T * 5) * d); S.sl.position.set(X, 4.6, 3.4); S.sl.intensity = 20 + 35 * d; S.s.userData.bloom = 0.5 - 0.28 * d; S.dust.set(d, srcs, tg, 0.3);
  move(c.cam, [X + 2, 6.2, 21], [X, 4.2, 0], [X + 0.6, 5.6, 14.5], [X, 4.6, 0.6], c.k, 36);
});

// ======================= OUTRO =======================
SET('outro', () => {
  const { s, cam } = mkScene(0x07090e, [20, 80], 0xffffff, 0.2, [0x8899bb, 0x1a1512, 0.5]);
  s.userData.bloom = 0.5;
  const t = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 1, 48), new THREE.MeshPhongMaterial({ color: 0x1b1612, shininess: 90, specular: 0x886644 })); t.position.y = -0.5; t.receiveShadow = true; s.add(t);
  const sp = new THREE.SpotLight(0xffe2b8, 900, 60, 0.4, 0.7); sp.position.set(2, 16, 6); sp.castShadow = true; s.add(sp, sp.target);
  const rl = new THREE.PointLight(0xff6b7d, 40, 30); rl.position.set(-9, 4, -4); s.add(rl); const bl = new THREE.PointLight(0x8fd0ff, 40, 30); bl.position.set(9, 4, -4); s.add(bl);
  const top = makeTop(2.0); s.add(top);
  return { s, cam, top, pre(T) { top.userData.set(T, 0.035 + 0.02 * Math.sin(T * 0.9)); } };
});
const D = (x, y, w, h, st, inner = '') => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;${h ? `height:${h}px;` : ''}${st}">${inner}</div>`;
const orbit = (c, a0, a1, r, y, ly = 1.6, fov = 35) => { const a = lerp(a0, a1, c.k); shot(c.cam, [Math.sin(a) * r, y, Math.cos(a) * r], [0, ly, 0], fov); };
SHOT('o1', 'outro', c => {
  const T = c.T, L = LINE.o1, t1 = L.sents[1].start - 0.15, t2 = L.sents[2].start - 0.15; orbit(c, -0.5, 0.5, 11, 3.2, 1.8, 34);
  if (T < t1) return;
  if (T < t2) { const k = T - t1; c.dom(D(0, 250, 1920, 0, `text-align:center;font-size:${150}px;letter-spacing:${lerp(30, 10, ease(k / 0.5))}px;opacity:${clamp(k / 0.25)};-webkit-text-stroke:16px rgba(0,0,0,.75);paint-order:stroke fill`, 'WAS MAL <span style="color:#ffd24a">RIGHT?</span>')); return; }
  const k = T - t2, g = ease(k / 1.6), fall = Math.round(48 + 6 * Math.sin(k * 2.3) * (1 - g * 0.3)), n1 = Math.round(18420 * g * (fall / 50)), n2 = Math.round(18420 * g * ((100 - fall) / 50));
  const panel = (x, col, word, sub, pct, n, dir) => D(x, 250, 520, 420, `opacity:${clamp(k / 0.3)};transform:translateX(${(1 - ease(k / 0.45)) * dir * 80}px);text-align:center`,
    `<div style="font-size:150px;line-height:1;color:${col};-webkit-text-stroke:14px rgba(0,0,0,.7);paint-order:stroke fill">${word}</div><div style="font-size:34px;font-weight:700;color:#d6dbe4;margin-top:14px">${sub}</div><div style="margin:26px auto 0;width:440px;height:30px;border-radius:15px;background:rgba(255,255,255,.14);overflow:hidden"><div style="width:${pct * g}%;height:100%;background:${col}"></div></div><div style="font-size:44px;margin-top:16px">${Math.round(pct * g)}% <span style="font-size:28px;color:#aab2bf;font-weight:700">· ${n.toLocaleString('en-US')} votes</span></div>`);
  c.dom(D(0, 130, 1920, 0, 'text-align:center;font-size:40px;letter-spacing:12px;color:#ffd24a;font-weight:700', 'WAS MAL RIGHT?') + panel(150, '#ff6b7d', 'FALL', 'It fell. He made it home.', fall, n1, -1) + panel(1250, '#8fd0ff', 'SPIN', 'Still spinning. Still dreaming.', 100 - fall, n2, 1)
    + D(0, 720, 1920, 0, `text-align:center;opacity:${clamp((k - 0.7) / 0.3)}`, `<span style="display:inline-block;font-size:40px;letter-spacing:5px;background:#ffd24a;color:#14161c;padding:12px 34px;border-radius:40px;transform:translateY(${Math.sin(k * 6) * 5}px)">▼ COMMENT “FALL” OR “SPIN” ▼</span>`));
});
SHOT('o2', 'outro', c => {
  orbit(c, 0.5, 1.5, 12, 3.6, 1.8, 34); const words = ['WHICH', 'MOVIE', 'SHOULD', 'WE'], t = c.l;
  const w1 = words.map((w, i) => `<span style="display:inline-block;margin:0 14px;opacity:${clamp((t - 0.25 - i * 0.16) / 0.15)};transform:translateY(${(1 - ease((t - 0.25 - i * 0.16) / 0.25)) * 40}px)">${w}</span>`).join('');
  const k2 = t - 1.15;
  c.dom(D(0, 250, 1920, 0, 'text-align:center;font-size:92px;-webkit-text-stroke:12px rgba(0,0,0,.7);paint-order:stroke fill', w1) + D(0, 370, 1920, 0, `text-align:center;font-size:168px;line-height:1.1;color:#ffd24a;opacity:${clamp(k2 / 0.2)};transform:scale(${1.5 - 0.5 * ease(k2 / 0.3)});-webkit-text-stroke:16px rgba(0,0,0,.75);paint-order:stroke fill`, 'REIMAGINE NEXT?'));
});
const CARDS = [['A', 'TITANIC', 'the door fits two', '#8fd0ff'], ['B', 'THE MATRIX', 'Neo takes the blue pill', '#7dffb0'], ['C', 'INTERSTELLAR', 'Cooper never leaves', '#ffd24a']];
const cardDom = (i, k) => { const [a, t, s2, col] = CARDS[i]; return D(110, 600, 1300, 0, `opacity:${clamp(k / 0.2)};transform:translateX(${(1 - ease(k / 0.35)) * -70}px)`, `<div style="display:flex;align-items:center"><div style="width:150px;height:150px;border-radius:26px;background:${col};color:#14161c;font-size:120px;line-height:150px;text-align:center;flex:none">${a}</div><div style="margin-left:34px"><div style="font-size:104px;line-height:1;-webkit-text-stroke:14px rgba(0,0,0,.8);paint-order:stroke fill">${t}</div><div style="font-size:46px;font-weight:700;color:${col};margin-top:12px;-webkit-text-stroke:9px rgba(0,0,0,.8);paint-order:stroke fill">…where ${s2}</div></div></div>`) + D(1500, 130, 320, 0, 'text-align:right;font-size:30px;letter-spacing:8px;color:#fff;font-weight:700;opacity:.85', `VOTE ${a} · ${i + 1}/3`); };

SET('nextA', () => {   // an ocean liner, an iceberg, and a floating door with room for two
  const { s, cam } = mkScene(0x0a1226, [60, 320], 0xbcd0ff, 1.5, [0x7f96d0, 0x0a1020, 1.0], [-20, 30, 20], 50);
  s.userData.bloom = 0.55;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshPhongMaterial({ color: 0x14365a, shininess: 100, specular: 0x9fc0ff })); sea.rotation.x = -Math.PI / 2; s.add(sea);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: 0xf4f7ff, fog: false })); moon.position.set(-60, 70, -260); s.add(moon);
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
SET('nextC', () => {   // a farmhouse in the corn, a rocket that never launches
  const { s, cam } = mkScene(0xf0b27a, [60, 380], 0xffc58a, 2.5, [0xffd9b0, 0x6a5a3a, 1.2], [-30, 14, -30], 60);
  s.userData.bloom = 0.5;
  ground(s, 600, '#8a6f3a', '#967a42');
  const sun = new THREE.Mesh(new THREE.CircleGeometry(22, 32), new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false })); sun.position.set(-90, 26, -330); s.add(sun);
  const N = 2600, corn = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 4.2, 0.3), M(0xa9b84a), N); corn.frustumCulled = false; corn.castShadow = false; s.add(corn); const dm = new THREE.Object3D(), cp = [];
  for (let i = 0; i < N; i++) { const x = (hash(i) - 0.5) * 220, z = 16 - hash(i + 0.5) * 150; cp.push(Math.abs(x) < 15 && z > -26 ? [x + (x < 0 ? -15 : 15), z] : [x, z]); }
  const H = new THREE.Group(); H.position.set(0, 0, -8); s.add(H); box(16, 8, 11, 0xf4f1e8, 0, 4, 0, H); for (const sx of [-1, 1]) { const r = box(10, 0.7, 12.4, 0x7a3a2e, sx * 4.2, 10.2, 0, H); r.rotation.z = -sx * 0.62; } box(16, 3.4, 10.6, 0xf4f1e8, 0, 9, 0, H); box(18, 0.5, 5, 0x9a8a72, 0, 0.6, 8, H); box(18, 0.4, 5.4, 0x7a3a2e, 0, 6.6, 8, H); for (const x of [-8.4, 8.4]) box(0.5, 6, 0.5, 0xf4f1e8, x, 3.6, 10, H); box(3, 5.6, 0.3, 0x6b4a2e, 0, 3.4, 5.6, H); for (const x of [-5, 5]) box(3, 2.6, 0.2, basic(0xffe0a0), x, 4.6, 5.56, H);
  const truck = new THREE.Group(); truck.position.set(17, 0, 4); truck.rotation.y = -0.5; s.add(truck); box(4, 2, 9, 0x3f6a8f, 0, 1.8, 0, truck); box(3.8, 2.2, 3.6, 0x3f6a8f, 0, 3.8, 0.4, truck); box(3.9, 1.3, 3.2, 0x9fc6e0, 0, 4, 0.4, truck);
  const dad = makeChar('civD', 'neutral'), kid = makeChar('girl', 'joy'); kid.g.scale.setScalar(0.62); H.add(dad.g, kid.g);
  const R = new THREE.Group(); R.position.set(70, 0, -150); s.add(R); const rk = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 44, 12), M(0xf4f6f9)); rk.position.y = 26; R.add(rk); const nose = new THREE.Mesh(new THREE.ConeGeometry(4, 10, 12), M(0xd9dde3)); nose.position.y = 53; R.add(nose); box(22, 4, 22, 0x6b7279, 0, 2, 0, R); box(2, 50, 2, 0x8a6a4a, -8, 25, 0, R); for (const a of [0, 1, 2, 3]) { const f = box(0.6, 9, 6, 0xb5433a, Math.sin(a * 1.57) * 5.5, 8.5, Math.cos(a * 1.57) * 5.5, R); f.rotation.y = a * 1.57; }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(15, 1.3, 8, 40), new THREE.MeshBasicMaterial({ color: 0xcfe0ff, fog: false, transparent: true, opacity: 0.55 })); ring.position.set(-20, 105, -300); s.add(ring); const hole = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0x1a1430, fog: false, transparent: true, opacity: 0.7 })); hole.position.copy(ring.position); s.add(hole);
  return { s, cam, pre(T) { for (let i = 0; i < N; i++) { const p = cp[i]; dm.position.set(p[0], 2.1, p[1]); dm.rotation.set(Math.sin(T * 1.3 + p[0] * 0.15) * 0.1, i, Math.sin(T * 1.1 + p[1] * 0.2) * 0.12); dm.scale.y = 0.8 + hash(i + 3) * 0.4; dm.updateMatrix(); corn.setMatrixAt(i, dm.matrix); } corn.instanceMatrix.needsUpdate = true; ring.rotation.z = T * 0.4; dad.reset(); put(dad, -1.2, 0.85, 8.6, 0.25); dad.idle(T); dad.look('neutral', T); dad.armL.rotation.z = -0.9; dad.armL.rotation.x = -0.4; kid.reset(); put(kid, 0.6, 0.85, 8.9, -0.5); kid.look('joy', T); kid.armL.rotation.set(-1.3, 0, 0.4); kid.armR.rotation.set(-1.3, 0, -0.2); kid.g.position.y = 0.85 + Math.abs(Math.sin(T * 4)) * 0.15; } };
});
SHOT('o3:0', 'nextA', c => { c.dom(cardDom(0, c.l)); move(c.cam, [-9, 3.6, 19], [6, 5.5, -30], [-6.5, 3.0, 15], [6, 5, -30], c.k, 40); });
SHOT('o3:1', 'nextB', c => { const S = c.S, k = ease((c.k - 0.3) / 0.6); S.blue.p.position.y = 1.0 + 1.6 * k + Math.sin(c.T * 3) * 0.08; S.blue.p.rotation.y = c.T * 1.5 * k; S.blue.l.intensity = 30 + 160 * k; S.red.l.intensity = 30 * (1 - 0.7 * k); S.red.p.position.y = 1.0 + Math.sin(c.T * 3 + 1) * 0.06; c.dom(cardDom(1, c.l)); move(c.cam, [-1, 7, 16], [0, 2.4, 0], [0.8, 6, 13], [0.6, 2.8, 0], c.k, 36); });
SHOT('o3:2', 'nextC', c => { c.dom(cardDom(2, c.l)); move(c.cam, [-22, 5.5, 34], [6, 9, -30], [-13, 6.5, 26], [6, 8, -30], c.k, 40); });
SHOT('o4:0', 'outro', c => {
  orbit(c, 1.5, 1.9, 13, 4.4, 1.6, 34); const t = c.l;
  const cards = CARDS.map(([a, tt, s2, col], i) => { const k = t - 0.08 - i * 0.12; return D(150 + i * 550, 300, 500, 300, `box-sizing:border-box;border-radius:26px;background:rgba(12,14,20,.86);border:5px solid ${col};text-align:center;padding-top:26px;opacity:${clamp(k / 0.15)};transform:translateY(${(1 - ease(k / 0.3)) * 60}px)`, `<div style="display:inline-block;width:92px;height:92px;line-height:92px;border-radius:18px;background:${col};color:#14161c;font-size:72px">${a}</div><div style="font-size:56px;margin-top:14px">${tt}</div><div style="font-size:28px;font-weight:700;color:${col};margin-top:8px">${s2}</div>`); }).join('');
  const ks = t - 0.55; c.dom(D(0, 150, 1920, 0, 'text-align:center;font-size:40px;letter-spacing:12px;color:#fff;font-weight:700', 'WHAT DO WE REIMAGINE NEXT?') + cards + D(0, 655, 1920, 0, `text-align:center;opacity:${clamp(ks / 0.1)}`, `<span style="display:inline-block;font-size:76px;letter-spacing:5px;background:#ffd24a;color:#14161c;padding:12px 44px;border-radius:14px;transform:scale(${2 - ease(ks / 0.2)}) rotate(-3deg)">TOP COMMENT GETS MADE</span>`));
});
SHOT('o4:1', 'outro', c => {
  const S = c.S, t = c.l, e = LINE.o4.sents[1].end - (LINE.o4.sents[1].start - 0.15), end = t > e + 0.35; orbit(c, 1.9, 2.9, lerp(13, 9.5, c.k), 3.4, 1.8, 34);
  if (!end) {
    const ar = Math.sin(t * 5) * 14, k = t;
    c.dom(D(0, 215, 1920, 0, `text-align:center;font-size:40px;letter-spacing:12px;color:#ffd24a;font-weight:700;opacity:${clamp(k / 0.2)}`, 'ONE MORE THING')
      + D(0, 285, 1920, 0, `text-align:center;font-size:118px;line-height:1.08;opacity:${clamp(k / 0.25)};transform:scale(${1.1 - 0.1 * ease(k / 0.5)});-webkit-text-stroke:14px rgba(0,0,0,.75);paint-order:stroke fill`, 'SEND THIS TO THE FRIEND<br>WHO SWEARS <span style="color:#ff6b7d">IT FELL</span>')
      + D(0, 600, 1920, 0, `text-align:center;opacity:${clamp((k - 0.7) / 0.3)}`, `<span style="display:inline-flex;align-items:center;font-size:54px;letter-spacing:6px;background:#fff;color:#14161c;padding:16px 46px 16px 40px;border-radius:60px"><svg width="64" height="64" viewBox="0 0 64 64" style="margin-right:22px;transform:translateX(${ar}px)"><path d="M6 36 L40 36 L40 52 L60 30 L40 8 L40 24 L6 24 Z" fill="#14161c"/></svg>SHARE</span>`));
  } else {
    const k = t - e - 0.35;
    c.dom(D(0, 0, 1920, 1080, `background:rgba(4,5,8,${0.72 * clamp(k / 0.4)})`) + D(0, 255, 1920, 0, `text-align:center;opacity:${clamp(k / 0.4)}`, `<div style="font-size:34px;letter-spacing:18px;color:#c9ced8;font-weight:700">A REIMAGINING IN BLOCKS</div><div style="font-size:178px;letter-spacing:${lerp(34, 20, ease(k / 1.2))}px;line-height:1.08;margin-left:20px">INCEPTION</div><div style="display:inline-block;margin-top:8px;font-size:54px;letter-spacing:6px;color:#14161c;background:#ffd24a;padding:10px 36px;border-radius:10px">WHAT IF MAL WAS RIGHT?</div><div style="margin-top:44px;font-size:36px;font-weight:700;color:#d6dbe4;letter-spacing:3px;opacity:${clamp((k - 0.6) / 0.4)}">Comment <b style="color:#ff6b7d">FALL</b> or <b style="color:#8fd0ff">SPIN</b>  ·  Tell us what to reimagine next</div>`));
  }
});
