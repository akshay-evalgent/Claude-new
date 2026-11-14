// Chapter 2: Five Years Later (b1-b7) + Chapter 3: The Time Heist (c1-c9)
import { THREE, SET, SHOT, LINE, mkScene, move, shot, shake, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, label, setPop, makeChar, ground, building, van, car, CAST, makeShield, makeHammer, dustFx } from './engine.js';

// ---- extra wardrobe (added to the shared CAST; nothing existing is changed) ----
const suit = n => { const k = 'q_' + n; if (!CAST[k]) CAST[k] = { ...CAST[n], torso: { style: 'armor', jacket: '#e9e9ee', plate: '#a8262c' }, arm: 0xe9e9ee, leg: 0xd6d6dc, hand: 0xa8262c, cape: undefined, ex: undefined }; return k; };
CAST.steveCiv = { ...CAST.steve, torso: { style: 'zip', jacket: '#4a5a6a', shirt: '#e8e8e8' }, arm: 0x4a5a6a, leg: 0x3a3e48, hand: undefined };
CAST.scottCiv = { ...CAST.scott, torso: { style: 'zip', jacket: '#6a5a4a', shirt: '#8a3a3a' }, arm: 0x6a5a4a, leg: 0x3a4660, hand: undefined };
CAST.thorBro = { ...CAST.thor, torso: { style: 'zip', jacket: '#5a6a5a', shirt: '#c9b48a' }, arm: 0x5a6a5a, leg: 0x4a4a52, cape: undefined, hand: undefined };
CAST.einherjar = { ...CAST.guard, face: { brow: '#5a3d26' }, torso: { style: 'armor', jacket: '#b8892f', plate: '#e6c56a' }, arm: 0xb8892f, leg: 0x6a4a2e, cape: 0xa81f24 };
CAST.guide = { skin: 0x1a1418, head: 0x1a1418, hair: ['none'], face: { eyeGlow: '#ff5a4a', brow: '#000' }, torso: { style: 'dress', jacket: '#1a1418' }, arm: 0x1a1418, leg: 0x1a1418, skirt: 0x1a1418, hand: 0x1a1418 };
const stand = (ch, T, e = 'neutral', talk = 0) => { ch.reset(); ch.idle(T); ch.look(e, T, talk); return ch; };
const seated = (ch, T, e = 'neutral') => { ch.reset(); ch.sit(); ch.look(e, T); ch.head.rotation.z = Math.sin(T * 1.1 + ch.g.position.x) * 0.03; return ch; };
const chair = (s, x, z, ry, col = 0x4a4a52, y = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; s.add(g); box(2.4, 0.4, 2.2, col, 0, 1.3, 0, g); box(2.4, 3.6, 0.4, col, 0, 3.0, -1.1, g); for (const sx of [-1, 1]) box(0.3, 1.2, 0.3, 0x2a2a30, sx * 1, 0.6, 0.8, g); return g; };
const glow = c => new THREE.MeshBasicMaterial({ color: c });
const STONES = [['POWER', '#b050ff'], ['SPACE', '#3a8aff'], ['REALITY', '#ff3838'], ['SOUL', '#ffa030'], ['MIND', '#ffe84a'], ['TIME', '#4aff7a']];

// ================= GREY NEW YORK (street / harbour / memorial) =================
SET('nyc', () => {
  const { s, cam } = mkScene(0x9ea6ad, [40, 280], 0xdfe6ee, 1.5, [0xdfe6ee, 0x6a6f76, 1.5], [-20, 40, 20], 70);
  s.userData.bloom = 0.25; ground(s, 900, '#5a5e64', '#62666c');
  for (let z = -200; z < 80; z += 9) box(0.5, 0.05, 4, 0xbdb9a8, 0, 0.03, z, s);
  for (const sx of [-1, 1]) { box(8, 0.5, 300, 0x7b7f86, sx * 14, 0.25, -60, s); for (let i = 0; i < 14; i++) { const h = 34 + hash(i * sx + 3) * 60, b = building(20, h, 20, ['#6a7079', '#7b8089', '#5d636c'][i % 3], 0.03, i + (sx > 0 ? 40 : 0), '#cfd6de'); b.position.set(sx * 28, h / 2, 50 - i * 22); s.add(b); } }
  const cars = [[-4, 12, 0.3, 0x8a8f96], [5, -6, -0.5, 0x6a6f76], [-3, -30, 1.4, 0x9a8f86], [4.5, -52, 0.1, 0x7b8089], [-5, -80, -0.2, 0x8a8f96]].map(([x, z, ry, c]) => { const g = car(c); g.position.set(x, 0, z); g.rotation.y = ry; s.add(g); return g; });
  box(0.5, 9, 0.5, 0x3a3e46, 9.5, 4.5, 24, s); box(1.2, 3, 1.2, 0x2a2d33, 9.5, 9.5, 24, s);
  const PN = 60, paper = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.02, 0.9), M(0xe8e6e0), PN); paper.frustumCulled = false; s.add(paper); const dm = new THREE.Object3D();
  // harbour (x ~ 300)
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshPhongMaterial({ color: 0x5a7486, shininess: 90 })); water.rotation.x = -Math.PI / 2; water.position.set(300, 0.3, -120); s.add(water);
  box(120, 2, 30, 0x6a6f76, 300, 0.5, 60, s); for (let i = 0; i < 4; i++) box(5, 1.2, 46, 0x7a6a58, 262 + i * 24, 1.0, 30, s);
  const boats = []; for (let i = 0; i < 9; i++) { const g = new THREE.Group(); g.position.set(250 + (i % 5) * 24 + (i > 4 ? 12 : 0), 0.6, i > 4 ? -8 : 22); g.rotation.y = (hash(i) - 0.5) * 0.4; s.add(g); box(5, 2.2, 13, [0xd8d4c8, 0x7a8a96, 0xc9b8a0][i % 3], 0, 0.8, 0, g); box(3.6, 2.4, 5, 0xeeeae0, 0, 3.0, -1.5, g); box(0.25, 9, 0.25, 0x5a5a5a, 0, 6, 2.5, g); boats.push(g); }
  for (let i = 0; i < 9; i++) { const h = 40 + hash(i + 60) * 70, b = building(22, h, 22, '#737982', 0.02, i + 70, '#cfd6de'); b.position.set(190 + i * 30, h / 2, -230 - hash(i + 9) * 40); s.add(b); }
  // memorial (x ~ -300)
  const nm = tex(256, 512, c => { c.fillStyle = '#2f3338'; c.fillRect(0, 0, 256, 512); c.fillStyle = '#c9ced6'; c.font = '700 22px Inter'; c.textAlign = 'center'; c.fillText('THE VANISHED', 128, 34); c.fillStyle = 'rgba(210,216,224,.75)'; for (let y = 60; y < 500; y += 15) for (let x = 14; x < 240; x += 78) c.fillRect(x, y, 30 + ((x * 7 + y * 13) % 36), 5); });
  const slabM = [M(0x2f3338), M(0x2f3338), M(0x2f3338), M(0x2f3338), new THREE.MeshLambertMaterial({ map: nm }), new THREE.MeshLambertMaterial({ map: nm })];
  for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), slabM); m.scale.set(7, 13, 1.2); m.position.set(-342 + (i % 8) * 12, 6.5, i > 7 ? -16 : 0); m.castShadow = m.receiveShadow = true; s.add(m); }
  for (let i = 0; i < 26; i++) box(0.5, 0.5, 0.5, [0xd04a5a, 0xf2c230, 0xffffff][i % 3], -344 + hash(i) * 90, 0.3, 1.4 + hash(i + 4) * 0.8, s);
  const mourn = [put(makeChar('civB', 'sad'), -318, 0, 4.6, Math.PI), put(makeChar('civD', 'sad'), -296, 0, 5.2, Math.PI + 0.2)]; mourn.forEach(m => s.add(m.g));
  const scott = makeChar('scottCiv', 'surprised'); s.add(scott.g);
  return { s, cam, scott, mourn, pre(T) {
    for (let i = 0; i < PN; i++) { const zz = ((hash(i) * 260 + T * (1.5 + hash(i + 2) * 3)) % 260) - 200; dm.position.set((hash(i + 0.4) - 0.5) * 22 + Math.sin(T * 0.8 + i) * 2, 0.15 + Math.max(0, Math.sin(T * 1.3 + i * 2)) * 2.4 * hash(i + 0.8), zz); dm.rotation.set(T * (hash(i) - 0.5) * 3, i + T * 0.6, 0); dm.updateMatrix(); paper.setMatrixAt(i, dm.matrix); } paper.instanceMatrix.needsUpdate = true;
    boats.forEach((b, i) => { b.position.y = 0.6 + Math.sin(T * 1.2 + i) * 0.22; b.rotation.z = Math.sin(T * 0.9 + i * 2) * 0.05; });
    mourn.forEach((m, i) => { m.reset(); m.idle(T + i); m.look('sad', T); m.head.rotation.x = 0.35; }); scott.g.visible = false;
  } };
});
SHOT('b1:0', 'nyc', c => move(c.cam, [1, 26, 78], [0, 10, -60], [-1.5, 5, 34], [0, 7, -80], c.k, 40));
SHOT('b1:1', 'nyc', c => move(c.cam, [268, 3.2, 52], [300, 4, 0], [280, 3.6, 46], [306, 4, -6], c.k, 38));
SHOT('b1:2', 'nyc', c => move(c.cam, [-334, 5.2, 26], [-316, 6, 0], [-322, 5.2, 21], [-306, 6, 0], c.k, 36));
SHOT('b6:0', 'nyc', c => { const sc = c.S.scott; sc.g.visible = true; sc.reset(); put(sc, lerp(-311, -305.5, ease(c.k * 1.6)), 0, 6.5, 2.5); if (c.k < 0.62) sc.walk(c.T * 8, 0.6); else sc.idle(c.T); sc.look('surprised', c.T); sc.head.rotation.y = Math.sin(c.T * 2.2) * 0.5; sc.armR.rotation.x = -1.3 * ease((c.k - 0.6) / 0.3);
  move(c.cam, [-299.6, 5.2, 0.6], [-306, 4.7, 6.5], [-300.2, 5.0, 1.8], [-305.5, 4.8, 6.5], c.k, 34); });

// ================= SUPPORT GROUP =================
SET('group', () => {
  const { s, cam } = mkScene(0xd9d2c4, [60, 160], 0xfff2dc, 1.6, [0xfff6e8, 0x8a8478, 1.5], [-18, 24, 6], 30);
  s.userData.bloom = 0.3; ground(s, 80, '#8a7f70', '#93887a');
  box(60, 22, 1, 0xcfc6b4, 0, 11, -18, s); box(1, 22, 60, 0xc6bdab, -24, 11, 0, s); box(1, 22, 60, 0xc6bdab, 24, 11, 0, s);
  for (const x of [-14, 0, 14]) { box(8, 10, 0.3, glow(0xeef6ff), x, 10, -17.4, s); box(8.6, 0.5, 0.6, 0x8a8478, x, 10, -17.3, s); box(0.5, 10.4, 0.6, 0x8a8478, x, 10, -17.3, s); }
  box(5, 0.3, 2.4, 0x6a5a48, 18, 2.8, -14, s); for (let i = 0; i < 5; i++) box(0.5, 0.7, 0.5, 0xf4f4f4, 16.5 + i * 0.8, 3.3, -14, s);
  const names = ['steveCiv', 'civA', 'civB', 'civC', 'civD', 'laura', 'civA'], ring = [];
  names.forEach((n, i) => { const a = i / 7 * 6.283 + 3.6, x = Math.sin(a) * 6.5, z = Math.cos(a) * 6.5; chair(s, Math.sin(a) * 7.0, Math.cos(a) * 7.0, a + Math.PI, 0x5a6a7a); const ch = put(makeChar(n, i ? 'sad' : 'neutral'), x, -0.2, z, a + Math.PI); s.add(ch.g); ring.push(ch); });
  return { s, cam, ring, pre(T) { ring.forEach((ch, i) => { seated(ch, T + i, i ? 'sad' : 'neutral'); if (i) { ch.head.rotation.x = 0.2 + Math.sin(T * 0.7 + i) * 0.08; } }); const st = ring[0]; st.armR.rotation.x = -1.1 + Math.sin(T * 2.6) * 0.3; st.armR.rotation.z = -0.3; st.head.rotation.y = Math.sin(T * 0.9) * 0.4; } };
});
SHOT('b2:0', 'group', c => { const st = c.S.ring[0]; move(c.cam, [st.g.position.x * -2.3 + 5, 12, st.g.position.z * -2.3], [st.g.position.x * 0.5, 3.4, st.g.position.z * 0.5], [st.g.position.x * -1.9 + 2, 10.5, st.g.position.z * -1.9], [st.g.position.x * 0.6, 3.6, st.g.position.z * 0.6], c.k, 38); });

// ================= AVENGERS COMPOUND (desk x=0 / holo table x=60 / quantum platform x=130) =================
SET('compound', () => {
  const { s, cam } = mkScene(0xaeb9c6, [80, 300], 0xeef4ff, 1.4, [0xf4f8ff, 0x5a606a, 1.5], [20, 40, 30], 60);
  s.userData.bloom = 0.45;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(300, 90), new THREE.MeshPhongMaterial({ color: 0x4a505a, shininess: 90, specular: 0x8899aa })); fl.rotation.x = -Math.PI / 2; fl.position.set(60, 0, 0); fl.receiveShadow = true; s.add(fl);
  box(300, 1, 90, 0x2f343c, 60, 24, 0, s); box(300, 24, 1, 0x3a4048, 60, 12, 30, s);
  for (let x = -70; x < 200; x += 18) { box(1.4, 24, 1.4, 0x2a2e36, x, 12, -24, s); const w = box(16.4, 20, 0.2, glow(0x7f96ad), x + 9, 12, -24.4, s); w.castShadow = false; }
  for (let x = -60; x < 200; x += 30) { const l = box(10, 0.3, 1.6, glow(0xffffff), x, 23.3, 4, s); l.castShadow = false; }
  // desk
  box(11, 0.4, 4.4, 0x2a2e36, 0, 2.9, 0, s); box(10.4, 2.7, 0.4, 0x23262d, 0, 1.35, 1.9, s); chair(s, 0, -3.4, 0, 0x3a3e46);
  box(1.6, 0.12, 1.6, 0xf4f4f4, -2.6, 3.2, 0.4, s); box(0.5, 0.9, 0.5, 0x8a3a2a, 3.4, 3.5, 0.2, s);
  const screens = [['ROCKET', '#7a5a3c', -7.5], ['NEBULA', '#4f78b5', 0], ['CAROL', '#e0bd6a', 7.5]].map(([n, col, x], i) => { const t = tex(256, 192, c => { c.fillStyle = 'rgba(40,110,190,.55)'; c.fillRect(0, 0, 256, 192); c.strokeStyle = '#9fe0ff'; c.lineWidth = 6; c.strokeRect(3, 3, 250, 186); c.fillStyle = col; c.fillRect(88, 34, 80, 78); c.fillStyle = '#0c1a2a'; c.fillRect(104, 62, 12, 18); c.fillRect(140, 62, 12, 18); c.fillStyle = col; c.fillRect(70, 118, 116, 50); c.fillStyle = '#dff4ff'; c.font = '900 24px Inter'; c.textAlign = 'center'; c.fillText(n, 128, 26); for (let y = 8; y < 190; y += 8) { c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(0, y, 256, 2); } }); const m = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.6), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.9, side: THREE.DoubleSide })); m.position.set(x * 0.85, 9.4, 2.5 - Math.abs(x) * 0.25); m.rotation.y = Math.PI + (x > 0 ? 0.45 : x < 0 ? -0.45 : 0); s.add(m); return m; });
  const dl = new THREE.PointLight(0x9fd8ff, 120, 30); dl.position.set(0, 9, 2); s.add(dl);
  const nat = makeChar('natasha', 'sad'), steve = makeChar('steveCiv'), scott = makeChar('scottCiv'); s.add(nat.g, steve.g, scott.g);
  const sand = box(0.9, 0.35, 0.9, 0xd9b27a, 0, 0, 0, nat.hand('R'));
  // holo table
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4, 2.6, 20), M(0x2a2e36)); tb.position.set(60, 1.3, 0); s.add(tb);
  const tt = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 0.15, 20), glow(0x5ac8ff)); tt.position.set(60, 2.7, 0); s.add(tt);
  const st6 = STONES.map(([n, col], i) => { const m = box(0.7, 0.7, 0.7, glow(col), 60 + Math.cos(i / 6 * 6.283) * 2.4, 4.6, Math.sin(i / 6 * 6.283) * 2.4, s); m.castShadow = false; return m; });
  const tl = new THREE.PointLight(0x7fd4ff, 160, 34); tl.position.set(60, 7, 0); s.add(tl);
  const team = ['tony', 'steve', 'thor', 'hulk', 'natasha', 'clint', 'scott', 'nebula', 'rocket'].map(n => { const ch = makeChar(suit(n)); s.add(ch.g); return ch; });
  // quantum platform
  const pf = new THREE.Mesh(new THREE.CylinderGeometry(10, 10.6, 0.8, 28), M(0x3a4048)); pf.position.set(130, 0.4, 0); pf.receiveShadow = true; s.add(pf);
  const pfTop = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 0.1, 28), new THREE.MeshBasicMaterial({ color: 0x10202e })); pfTop.position.set(130, 0.86, 0); s.add(pfTop);
  const posts = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; box(0.9, 9, 0.9, 0x23262d, 130 + Math.cos(a) * 11.5, 4.5, Math.sin(a) * 11.5, s); const g = box(0.4, 7.6, 0.4, new THREE.MeshBasicMaterial({ color: 0x10202e }), 130 + Math.cos(a) * 11.1, 4.6, Math.sin(a) * 11.1, s); g.castShadow = false; posts.push(g); }
  const ringT = new THREE.Mesh(new THREE.TorusGeometry(11.5, 0.5, 6, 30), M(0x23262d)); ringT.rotation.x = Math.PI / 2; ringT.position.set(130, 9.4, 0); s.add(ringT);
  const pl = new THREE.PointLight(0x7fe0ff, 0, 50); pl.position.set(130, 6, 0); s.add(pl);
  const kase = new THREE.Group(); kase.position.set(130, 0.9, 1.2); s.add(kase); box(3.4, 0.5, 2, 0x8a9199, 0, 0.25, 0, kase); const kst = STONES.map(([n, col], i) => { const m = box(0.36, 0.36, 0.36, glow(col), -1.25 + i * 0.5, 0.7, 0, kase); m.castShadow = false; return m; });
  const spot = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 24), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.8 })); spot.rotation.x = -Math.PI / 2; s.add(spot);
  const col = new THREE.Color();
  return { s, cam, nat, steve, scott, sand, screens, team, st6, kase, spot,
    glow(k, T) { col.setHex(0x10202e).lerp(new THREE.Color(0x7fe8ff), k * (0.8 + 0.2 * Math.sin(T * 14))); posts.forEach(p => p.material.color.copy(col)); pfTop.material.color.copy(col); pl.intensity = 420 * k; },
    // team on the platform; skip = index left empty; sc = uniform scale factor
    onPad(T, sc = 1, skip = -1) { team.forEach((ch, i) => { const a = -Math.PI / 2 + (i - 4) * 0.6, r = i % 2 ? 6.6 : 4.2; ch.g.visible = i !== skip && sc > 0.02; ch.reset(); put(ch, 130 + Math.cos(a) * r, 0.86, -Math.sin(a) * r - 1, 0); ch.g.scale.setScalar((CAST[ch.name].scale || 1) * sc); ch.idle(T + i); ch.look('serious', T); }); },
    padPos(i) { const a = -Math.PI / 2 + (i - 4) * 0.6, r = i % 2 ? 6.6 : 4.2; return [130 + Math.cos(a) * r, 0.86, -Math.sin(a) * r - 1]; },
    pre(T) {
      nat.reset(); put(nat, 0, -0.2, -2.9, 0); nat.sit(); nat.look('sad', T); sand.visible = true; steve.g.visible = scott.g.visible = false;
      screens.forEach((m, i) => { m.material.opacity = 0.75 + 0.2 * Math.sin(T * 7 + i * 2) * (hash(Math.floor(T * 8) + i) > 0.2 ? 1 : 0.2); m.position.y = 9.4 + Math.sin(T * 1.3 + i) * 0.12; });
      st6.forEach((m, i) => { const a = i / 6 * 6.283 + T * 0.7; m.position.set(60 + Math.cos(a) * 2.4, 4.6 + Math.sin(T * 2 + i) * 0.25, Math.sin(a) * 2.4); m.rotation.set(T, T * 1.3, 0); });
      team.forEach(ch => { ch.g.visible = false; ch.g.scale.setScalar(CAST[ch.name].scale || 1); }); kase.visible = false; spot.visible = false; this.glow(0, T);
    } };
});
SHOT('b2:1', 'compound', c => { const n = c.S.nat, b = Math.max(0, Math.sin(c.T * 1.1 - 1)) ** 2; n.armR.rotation.x = -0.6 - b * 1.5; n.armR.rotation.z = -0.35 * b; n.head.rotation.x = 0.12; n.head.rotation.y = Math.sin(c.T * 0.6) * 0.3; move(c.cam, [6, 5.4, 14], [0, 5.9, 0], [3, 5.0, 11], [0, 5.7, 0], c.k, 38); });
const talk3 = (c, T, pt) => { const S = c.S, sc = S.scott, st = S.steve, n = S.nat; S.sand.visible = false; for (const ch of [sc, st]) ch.g.visible = true; stand(put(sc, -4, 0, 10, 1.2), T, 'surprised'); stand(put(st, 2.6, 0, 9.0, -1.0), T + 1, 'serious'); stand(put(n, 5.2, 0, 10.6, -1.2), T + 2, 'serious'); sc.armL.rotation.x = -1.3 + Math.sin(T * 6) * 0.5; sc.armR.rotation.x = -1.3 + Math.cos(T * 6) * 0.5; sc.armL.rotation.z = -0.4; sc.armR.rotation.z = 0.4; };
SHOT('b6:1', 'compound', c => { talk3(c, c.T); move(c.cam, [-1, 5.6, 25], [0, 3.6, 10], [-1.5, 5.4, 22], [0, 3.7, 10], c.k, 30);
  const a = clamp(c.l / 0.3), b = clamp((c.l - 0.5) / 0.3);
  c.dom(`<div style="position:absolute;right:120px;top:170px;font:900 34px Inter;letter-spacing:6px;text-align:right"><div style="opacity:${a};color:#c9ced8">FOR THE WORLD</div><div style="opacity:${a};font-size:120px;letter-spacing:0;line-height:1;color:#fff">5 YEARS</div><div style="opacity:${b};color:#ffd24a;margin-top:26px">FOR SCOTT</div><div style="opacity:${b};font-size:150px;letter-spacing:0;line-height:1;color:#ffd24a;transform:scale(${0.8 + 0.2 * ease(b)});transform-origin:100% 50%">5 HOURS</div></div>`); });
SHOT('b7', 'compound', c => { const [i, k] = cuts(c.k, [0.6]), S = c.S;
  if (i === 0) { talk3(c, c.T); S.scott.armL.rotation.x = S.scott.armR.rotation.x = 0; S.scott.look('joy', c.T); S.steve.head.rotation.y = -0.9 * ease(k * 2.5); S.nat.head.rotation.y = 0.8 * ease(k * 2.5 - 0.3); S.nat.look(k > 0.5 ? 'surprised' : 'serious', c.T); S.steve.look(k > 0.4 ? 'surprised' : 'serious', c.T); move(c.cam, [-10.5, 5.6, 16], [3.6, 4.7, 9.8], [-7.5, 5.4, 14.5], [3.6, 4.75, 9.8], k, 30); }
  else { S.glow(ease(k * 1.4), c.T); move(c.cam, [130, 2.4, 34], [130, 6, 0], [130, 3.2, 25], [130, 6, 0], k, 40); } });
SHOT('c3:0', 'compound', c => { const S = c.S; S.team.forEach((ch, i) => { const a = i / 9 * 6.283 + 0.35; ch.g.visible = true; stand(put(ch, 60 + Math.sin(a) * 8.2, 0, Math.cos(a) * 8.2, a + Math.PI), c.T + i, 'serious'); ch.head.rotation.x = 0.12; }); S.team[0].armR.rotation.x = -1.3; const a = 0.7 + c.k * 0.5; shot(c.cam, [60 + Math.sin(a) * 21, 9.5 - c.k, Math.cos(a) * 21], [60, 4.2, 0], 36); });
SHOT('c3:1', 'compound', c => { const S = c.S, [i, k] = cuts(c.k, [0.45]);
  const rows = [['NEW YORK 2012', [5, 4, 1]], ['ASGARD 2013 · MORAG 2014', [2, 0]], ['VORMIR 2014', [3]]];
  if (i === 0) { S.team.forEach((ch, j) => { const a = j / 9 * 6.283 + 0.35; ch.g.visible = true; stand(put(ch, 60 + Math.sin(a) * 8.2, 0, Math.cos(a) * 8.2, a + Math.PI), c.T + j, 'serious'); }); move(c.cam, [60, 13, 15], [60, 3.4, 0], [60, 10.5, 11], [60, 3.6, 0], k, 40);
    c.dom(`<div style="position:absolute;left:110px;top:150px;font:900 30px Inter"><div style="letter-spacing:10px;color:#ffd24a;font-size:28px">THE TIME HEIST</div>${rows.map((r, j) => { const o = clamp((c.l - j * 0.28) / 0.25); return `<div style="opacity:${o};transform:translateX(${(1 - ease(o)) * -40}px);margin-top:20px;background:rgba(8,10,14,.8);border-left:8px solid #ffd24a;padding:12px 22px;border-radius:6px"><span style="color:#8f97a6;font-size:20px;letter-spacing:5px">TEAM ${j + 1}</span><br>${r[0]} ${r[1].map(q => `<span style="display:inline-block;width:26px;height:26px;border-radius:5px;margin-left:10px;vertical-align:-3px;background:${STONES[q][1]};box-shadow:0 0 18px ${STONES[q][1]}"></span>`).join('')}</div>`; }).join('')}</div>`); }
  else { const sh = ease((k - 0.45) / 0.3); S.glow(clamp(k * 3), c.T); S.onPad(c.T, 1 - sh); S.team.forEach(ch => { ch.g.position.y += sh * 0.5; }); if (k > 0.72) c.flash(clamp(1 - (k - 0.72) / 0.2)); move(c.cam, [118, 6.5, 30], [130, 4.2, 0], [124, 5.2, 24], [130, 4, 0], k, 40); } });
SHOT('c9', 'compound', c => { const S = c.S; const ap = ease(c.l / 0.5); S.glow(1 - ease((c.l - 0.4) / 1.6) * 0.75, c.T); S.onPad(c.T, ap, 4); S.kase.visible = true; S.spot.visible = c.l > 0.5; const p = S.padPos(4); S.spot.position.set(p[0], 0.93, p[2]); S.spot.material.opacity = 0.35 + 0.3 * Math.sin(c.T * 3);
  S.team.forEach((ch, i) => { if (i === 4) return; ch.look('sad', c.T); const dx = p[0] - ch.g.position.x, dz = p[2] - ch.g.position.z; ch.head.rotation.y = clamp(Math.atan2(dx, dz), -1.1, 1.1) * ease((c.l - 0.9 - i * 0.12) / 0.5); ch.head.rotation.x = 0.25 * ease((c.l - 1.2) / 0.6); });
  const cl = S.team[5]; cl.body.position.y = -0.8 * ease((c.l - 1.4) / 0.8); cl.legL.rotation.x = cl.legR.rotation.x = -1.0 * ease((c.l - 1.4) / 0.8); cl.head.rotation.x = 0.5 * ease((c.l - 1.4) / 0.8);
  if (c.l < 0.3) c.flash(1 - c.l / 0.3); move(c.cam, [130, 9, 30], [130, 3.8, 0], [p[0] + 1.5, 4.2, p[2] + 12], [p[0], 2.2, p[2]], ease(c.k), 38); });

// ================= THOR'S HUT (New Asgard) =================
SET('hut', () => {
  const { s, cam } = mkScene(0x2a2018, [30, 90], 0xffd9a8, 1.0, [0xffe2c0, 0x5a4634, 1.5], [6, 14, 10], 20);
  s.userData.bloom = 0.5; ground(s, 60, '#5a4634', '#63503c');
  box(30, 14, 1, 0x4a3828, 0, 7, -9, s); box(1, 14, 30, 0x443222, -13, 7, 0, s); box(1, 14, 30, 0x443222, 13, 7, 0, s); box(30, 1, 30, 0x3a2c1e, 0, 13.5, 0, s);
  box(5, 4, 0.3, glow(0xbfe0f4), -6, 7.5, -8.4, s); box(5.4, 0.4, 0.5, 0x2a1c12, -6, 7.5, -8.3, s); box(0.4, 4.4, 0.5, 0x2a1c12, -6, 7.5, -8.3, s);
  box(8, 1.6, 3.4, 0x5a4a6a, 2, 0.9, -5.5, s); box(8, 3.4, 0.8, 0x5a4a6a, 2, 2.6, -7, s); box(1, 2.6, 3.4, 0x4a3c5a, -2.4, 1.5, -5.5, s); box(1, 2.6, 3.4, 0x4a3c5a, 6.4, 1.5, -5.5, s);
  box(4, 0.4, 2.4, 0x3a2a1a, 2, 1.4, 0.2, s);
  const r = rng(5); for (let i = 0; i < 9; i++) { const b = box(2.2, 0.35, 2.2, 0xe2d2b0, -5 + r() * 14, 0.2 + (i % 3) * 0.36, -3 + r() * 7, s); b.rotation.y = r() * 3; } for (let i = 0; i < 16; i++) { const b = box(0.4, 1.1, 0.4, [0x4a7a3a, 0x8a5a2a][i % 2], -6 + r() * 15, i % 4 ? 0.55 : 0.2, -4 + r() * 8, s); if (i % 4 === 0) b.rotation.z = 1.57; } for (let i = 0; i < 4; i++) box(0.4, 1.1, 0.4, 0x4a7a3a, 1 + i * 0.6, 2.15, 0.2, s);
  const tvT = tex(128, 80, c => { c.fillStyle = '#16304a'; c.fillRect(0, 0, 128, 80); c.fillStyle = '#4a9a4a'; c.fillRect(0, 56, 128, 24); c.fillStyle = '#ffd24a'; c.fillRect(20, 40, 12, 16); c.fillStyle = '#e24b3b'; c.fillRect(84, 36, 14, 20); c.fillStyle = '#fff'; c.fillRect(6, 6, 40, 6); c.fillRect(82, 6, 40, 6); });
  box(8.4, 5.2, 0.5, 0x15161a, 2, 4.2, 7.2, s); const tv = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.5), new THREE.MeshBasicMaterial({ map: tvT })); tv.position.set(2, 4.2, 6.9); tv.rotation.y = Math.PI; s.add(tv);
  const tvl = new THREE.PointLight(0x9fd0ff, 60, 26); tvl.position.set(2, 4.5, 4); s.add(tvl);
  const door = new THREE.Group(); door.position.set(12.4, 0, 3.6); s.add(door); box(0.4, 8.4, 4.2, 0x9a7248, 0, 4.2, -2.1, door); const dlt = new THREE.PointLight(0xffd0a0, 70, 22); dlt.position.set(8, 6, 1.5); s.add(dlt); box(0.3, 0.15, 4.2, glow(0xfff0c8), 12.3, 0.1, 1.5, s); box(0.3, 0.4, 0.4, 0xd9b24a, -0.3, 4, -3.6, door);
  const thor = put(makeChar('thorBro'), 2, 0.25, -5.2, 0); s.add(thor.g); box(1.6, 0.4, 0.7, 0x23262d, 0.75, 0.1, 0.5, thor.hand('L')); box(3.0, 0.3, 0.3, 0x23262d, 0, 1.45, 0, thor.head); box(0.5, 0.9, 0.9, 0x23262d, -0.8, 0.8, 0, thor.head); box(0.5, 0.9, 0.9, 0x23262d, 0.8, 0.8, 0, thor.head);
  return { s, cam, thor, door, pre(T) { thor.reset(); thor.sit(); thor.look('serious', T); thor.armL.rotation.set(-0.8, 0, 0.45); thor.armR.rotation.set(-0.8, 0, -0.45); thor.armL.rotation.x += Math.sin(T * 17) * 0.06; thor.body.rotation.z = Math.sin(T * 2.3) * 0.05; tvl.intensity = 50 + 30 * hash(Math.floor(T * 9)); tvT.offset.x = Math.floor(T * 6) * 0.02; door.rotation.y = 0; } };
});
SHOT('b2:2', 'hut', c => { const [i, k] = cuts(c.k, [0.42]), S = c.S; const kn = Math.max(0, Math.sin(c.T * 22)) * (Math.sin(c.T * 4.5) > 0 ? 1 : 0); S.door.rotation.y = kn * 0.035; S.door.position.x = 12.4 - kn * 0.08;
  if (i === 0) { move(c.cam, [2, 4.6, 1], [12.3, 4.4, 1.5], [3.5, 4.6, 1.2], [12.3, 4.4, 1.5], k, 40); shake(c.cam, c.T, 0.02 * kn); }
  else { S.thor.head.rotation.y = -0.25 * Math.sin(k * 3.14); move(c.cam, [-4.5, 5.6, 6.2], [2, 4.0, -5.2], [-2.5, 5.6, 4.6], [2, 4.2, -5.2], k, 34); } });

// ================= TONY'S CABIN (shared set 'cabin' + this act's extras) =================
const cabinX = S => { if (S._a2) return S._a2; const X = { steve: makeChar('steveCiv'), nat: makeChar('natasha'), scott: makeChar('scottCiv') }; Object.values(X).forEach(ch => S.s.add(ch.g));
  X.helmet = new THREE.Group(); S.morgan.head.add(X.helmet); box(1.9, 1.8, 1.9, 0x3f6fd0, 0, 0.75, 0, X.helmet); box(1.3, 0.9, 0.2, 0xcfe6ff, 0, 0.75, 0.9, X.helmet);
  const pre = S.pre.bind(S); S.pre = T => { pre(T); for (const k of ['steve', 'nat', 'scott']) { X[k].reset(); X[k].g.visible = false; } X.helmet.visible = false; }; S.pre(0); return S._a2 = X; };
SHOT('b3', 'cabin', c => { const S = c.S, X = cabinX(S), [i, k] = cuts(c.k, [0.45]);
  const t = S.place(S.tony, 3.2, 1.6, 2.6, 0.3); stand(t, c.T, 'neutral'); t.armR.rotation.x = -1.1; t.armR.rotation.z = -0.3; const p = S.place(S.pepper, -4, 1.6, 2.2, 0.2); stand(p, c.T + 1, 'neutral');
  const a = c.T * 1.5, m = S.place(S.morgan, 0 + Math.sin(a) * 4.2, 0, 11.5 + Math.cos(a) * 2.4, a + Math.PI / 2); m.walk(c.T * 14, 0.9); m.look('joy', c.T); m.armL.rotation.z = -2.2; m.armR.rotation.z = 2.2; X.helmet.visible = true; X.helmet.rotation.z = Math.sin(c.T * 9) * 0.12;
  if (i === 0) move(c.cam, [46, 12, 54], [-6, 5, -2], [34, 8.5, 42], [-4, 5, 0], k, 38);
  else { t.head.rotation.y = clamp((m.g.position.x - 3.2) * 0.12, -0.8, 0.8); t.look('joy', c.T); move(c.cam, [11, 3.4, 30], [0.5, 2.8, 10], [9, 3.4, 27], [1, 3.0, 9.5], k, 34); } });
SHOT('b4', 'cabin', c => { const S = c.S, X = cabinX(S), [i, k] = cuts(c.k, [0.62]);
  const m = S.place(S.morgan, -0.6, 1.6, 2.8, 0.55); m.reset(); m.look('joy', c.T, c.talk); m.head.rotation.x = -0.28; m.head.rotation.z = Math.sin(c.T * 2) * 0.06; m.body.position.y = Math.abs(Math.sin(c.T * 5)) * 0.12;
  const t = S.place(S.tony, 3.0, 1.6, 4.0, -1.25); t.reset(); t.look('joy', c.T); t.head.rotation.x = 0.2; t.body.rotation.x = 0.1; t.armL.rotation.x = -0.5;
  if (i === 0) move(c.cam, [4.6, 4.7, 8.6], [-0.6, 3.75, 2.8], [4.0, 4.5, 8.0], [-0.6, 3.8, 2.8], k, 24);
  else move(c.cam, [-3.8, 6.4, 9.5], [3.0, 6.0, 4.0], [-3.2, 6.4, 9.0], [3.0, 6.05, 4.0], k, 28); });
SHOT('c1:0', 'cabin', c => { const S = c.S, X = cabinX(S), [i, k] = cuts(c.k, [0.62]);
  const t = S.place(S.tony, 0.5, 1.6, 3.0, 0); stand(t, c.T, 'serious'); t.armL.rotation.set(-0.9, 0, 0.75); t.armR.rotation.set(-0.9, 0, -0.75); t.head.rotation.y = Math.sin(c.T * 5) * 0.35 * (i === 1 ? 1 : 0.2);
  [[X.steve, -3.4, 13], [X.nat, 0.4, 14], [X.scott, 4, 13.2]].forEach(([ch, x, z], j) => { ch.g.visible = true; stand(put(ch, x, 0, z, Math.PI + (0.4 - j * 0.4) * 0.5), c.T + j, j === 2 ? 'sad' : 'serious'); ch.head.rotation.x = -0.15; });
  if (i === 0) move(c.cam, [-14, 5.5, 30], [0, 4.6, 6], [-9, 5, 25], [0.5, 4.8, 5], k, 36);
  else { X.scott.head.rotation.x = 0.3; move(c.cam, [1.6, 6.3, 10.5], [0.5, 6.3, 3.0], [1.2, 6.3, 9.4], [0.5, 6.3, 3.0], k, 28); } });

// ================= STORAGE UNIT (van) + dashboard close-up at x=100 =================
SET('storage', () => {
  const { s, cam } = mkScene(0x15171b, [30, 110], 0xffe2c0, 0.4, [0xdfe6ee, 0x23262b, 0.7], [4, 20, 10], 30);
  s.userData.bloom = 0.55; ground(s, 80, '#3a3c40', '#424448');
  box(26, 14, 1, 0x4a4e56, 0, 7, -18, s); box(1, 14, 50, 0x454950, -13, 7, 0, s); box(1, 14, 50, 0x454950, 13, 7, 0, s); box(26, 1, 50, 0x2f3238, 0, 14, 0, s);
  for (let y = 1; y < 13; y += 1.5) box(25, 0.2, 0.3, 0x5a5e66, 0, y, -17.4, s);
  const r = rng(12); for (let i = 0; i < 22; i++) { const sz = 1.5 + r() * 1.6; box(sz, sz, sz, [0x9a7a52, 0x8a6a44, 0xa88a60][i % 3], (i % 2 ? 1 : -1) * (9 + r() * 2.5), sz / 2 + (i % 3 === 0 ? 1.8 : 0), -15 + r() * 28, s).rotation.y = r() * 0.4; }
  const lamp = box(1.4, 0.2, 5, glow(0xfff0d0), 0, 13.3, 2, s); lamp.castShadow = false; const ll = new THREE.PointLight(0xfff0d0, 110, 40); ll.position.set(0, 12, 2); s.add(ll);
  const v = van(0x7a5a3c); v.position.set(0, 0, 4); s.add(v); box(4.5, 0.06, 9.1, new THREE.MeshLambertMaterial({ color: 0xa89a84, transparent: true, opacity: 0.55 }), 0, 3.95, 4, s);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 6, 20), glow(0x2a4a5a)); ring.position.set(0, 2.5, -0.9); s.add(ring); box(3.6, 2.8, 0.3, 0x23262d, 0, 2.4, -0.4, s);
  const rl = new THREE.PointLight(0x7fe8ff, 0, 30); rl.position.set(0, 3, -3); s.add(rl);
  const scott = makeChar(suit('scott'), 'surprised'); s.add(scott.g);
  // dashboard mock
  const D = new THREE.Group(); D.position.set(100, 0, 0); s.add(D);
  box(14, 1.2, 4, 0x2a2622, 0, 3, 0, D); box(14, 4, 0.3, 0x1c1a18, 0, 1.2, 1.9, D); const wsh = box(14, 5, 0.1, new THREE.MeshLambertMaterial({ color: 0x8a9aa6, transparent: true, opacity: 0.25 }), 0, 6, -2.4, D); wsh.rotation.x = -0.4; wsh.castShadow = false;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.22, 6, 18), M(0x15161a)); wheel.position.set(-4, 4.4, 2.6); wheel.rotation.x = -0.5; D.add(wheel);
  for (let i = 0; i < 7; i++) box(0.5, 0.2, 0.5, glow([0x8a2a2a, 0x8a7a2a, 0x2a5a8a][i % 3]), -0.5 + i * 0.9, 3.65, 0.9, D);
  const btn = box(1.0, 0.3, 1.0, glow(0x1a5a2a), 3.2, 3.7, 0.2, D); box(3, 1.6, 0.2, glow(0x16384a), 3.2, 4.6, -1.2, D).rotation.x = -0.3;
  const dlight = new THREE.PointLight(0xffe2c0, 40, 20); dlight.position.set(0, 8, 5); D.add(dlight);
  const rat = new THREE.Group(); D.add(rat); box(0.5, 0.42, 1.0, 0x8a8478, 0, 0.25, 0, rat); box(0.36, 0.34, 0.4, 0x8a8478, 0, 0.32, 0.65, rat); box(0.12, 0.12, 0.12, 0xe8a0a0, 0, 0.3, 0.88, rat); for (const sx of [-1, 1]) { box(0.16, 0.2, 0.08, 0xc9a8a0, sx * 0.16, 0.56, 0.55, rat); box(0.06, 0.06, 0.06, 0x111, sx * 0.12, 0.42, 0.84, rat); } const tail = box(0.08, 0.08, 1.0, 0xc9a8a0, 0, 0.2, -0.95, rat);
  const dust = dustFx(s, 80, 0x9a9488);
  return { s, cam, scott, ring, rl, rat, tail, btn, dust, pre(T) { scott.g.visible = false; ring.material.color.setHex(0x2a4a5a); rl.intensity = 0; btn.material.color.setHex(0x1a5a2a); dust.set([0, 0, 0], 0); } };
});
SHOT('b5', 'storage', c => { const [i, k] = cuts(c.k, [0.4, 0.56]), S = c.S, r = S.rat;
  if (i < 2) { const kk = i === 0 ? k * 0.8 : 0.8 + k * 0.2, x = lerp(-5.5, 3.2, kk); r.position.set(x, 3.6 + Math.abs(Math.sin(c.T * 18)) * 0.07, 0.25 + Math.sin(kk * 9) * 0.25); r.rotation.y = Math.PI / 2 + Math.cos(kk * 9) * 0.3; S.tail.rotation.y = Math.sin(c.T * 10) * 0.5;
    if (i === 0) move(c.cam, [98, 5.4, 9], [98.5, 4, 0], [101, 5.2, 8], [101.5, 4, 0], k, 34);
    else { if (k > 0.5) S.btn.material.color.setHex(0x4aff7a); move(c.cam, [105.2, 4.9, 4.4], [103.2, 3.9, 0.2], [104.6, 4.7, 3.8], [103.2, 3.9, 0.2], k, 30); if (k > 0.75) c.flash((k - 0.75) * 4); } }
  else { const sc = S.scott, on = clamp(1 - k * 1.3); S.ring.material.color.setHex(0x7fe8ff); S.rl.intensity = 300 * on; if (k < 0.15) c.flash(1 - k / 0.15);
    const f = clamp(k / 0.42), land = f >= 1; sc.g.visible = true; sc.reset(); put(sc, Math.sin(f * 2) * 0.6, 2.2 + Math.sin(f * Math.PI) * 2.6 - f * 1.7, lerp(-1.5, -10.5, f), Math.PI);
    if (!land) { sc.g.rotation.x = -f * 5.2; sc.armL.rotation.z = -2; sc.armR.rotation.z = 2; } else { sc.g.rotation.x = -Math.PI / 2; sc.g.position.set(0.6, 0.55, -10.5); const up = ease((k - 0.62) / 0.3); sc.head.rotation.x = -0.9 * up; sc.armL.rotation.z = -1.6; sc.armR.rotation.z = 1.6; S.dust.set([0.6, 0, -10], clamp((k - 0.42) / 0.5) * 0.99, 0.9, [0.3, 0.5, -0.6]); }
    sc.look('surprised', c.T); move(c.cam, [-9.5, 3.4, -15.5], [0, 3, -5], [-7.5, 2.4, -16], [0.4, 1.6, -9.5], k, 42); if (!land) shake(c.cam, c.T, 0.06); } });

// ================= QUANTUM REALM =================
SET('quantum', () => {
  const { s, cam } = mkScene(0x140a2a, [20, 120], 0xffffff, 0.6, [0xc9a8ff, 0x2a1050, 1.2]);
  s.userData.bloom = 0.7; s.userData.sun.castShadow = false;
  const N = 420, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), N); im.frustumCulled = false; s.add(im); const dm = new THREE.Object3D(), col = new THREE.Color(), pal = [0x7a4aff, 0x3ac8ff, 0xff5ac8, 0x4affc8, 0xffc84a]; for (let i = 0; i < N; i++) im.setColorAt(i, col.set(pal[i % 5]).multiplyScalar(0.55 + hash(i) * 0.5));
  const scott = makeChar(suit('scott'), 'surprised'); s.add(scott.g);
  return { s, cam, scott, pre(T) { for (let i = 0; i < N; i++) { const z = ((hash(i) * 140 + T * (10 + hash(i + 3) * 16)) % 140) - 120, a = hash(i + 0.5) * 6.283 + T * 0.5 + z * 0.03, r = 7 + hash(i + 0.2) * 16; dm.position.set(Math.cos(a) * r, Math.sin(a) * r, z); dm.rotation.set(T + i, T * 0.7 + i, 0); dm.scale.setScalar(0.3 + hash(i + 0.9) * 1.6); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); } im.instanceMatrix.needsUpdate = true; } };
});
SHOT('b6:2', 'quantum', c => { const sc = c.S.scott; sc.reset(); put(sc, Math.sin(c.T * 1.3) * 1.5, -2 + Math.cos(c.T * 1.1) * 1.2, lerp(-6, -46, ease(c.k)), 0); sc.g.rotation.set(c.T * 1.7, c.T * 1.1, c.T * 0.8); sc.g.scale.setScalar(lerp(1.2, 0.35, c.k)); sc.armL.rotation.z = -2 + Math.sin(c.T * 7) * 0.4; sc.armR.rotation.z = 2 + Math.cos(c.T * 7) * 0.4; sc.legL.rotation.x = Math.sin(c.T * 6) * 0.7; sc.legR.rotation.x = -Math.sin(c.T * 6) * 0.7; sc.look('surprised', c.T);
  move(c.cam, [0, 0, 12], [0, 0, -30], [0, 0, 6], [0, 0, -40], c.k, 50, c.T * 0.25);
  const o = clamp(c.l / 0.3); c.dom(`<div style="position:absolute;left:0;right:0;top:150px;text-align:center;opacity:${o}"><div style="font:700 30px Inter;letter-spacing:12px;color:#c9a8ff">THE QUANTUM REALM</div><div style="font:900 64px Inter;margin-top:10px">5 HOURS IN HERE <span style="color:#ffd24a">= 5 YEARS OUT THERE</span></div></div>`); });

// ================= TONY'S MIDNIGHT HOLOGRAM =================
SET('holo', () => {
  const { s, cam } = mkScene(0x0a0d14, [30, 90], 0x9fc8ff, 0.3, [0x7f9fd0, 0x14100c, 0.5], [4, 14, 10], 20);
  s.userData.bloom = 0.75; ground(s, 60, '#3a2c20', '#423324');
  box(30, 14, 1, 0x3a2c20, 0, 7, -9, s); for (let i = 0; i < 6; i++) box(4, 0.3, 1.2, 0x2a1f16, -10 + i * 4, 3 + (i % 3) * 3, -8.3, s); for (let i = 0; i < 30; i++) box(0.4, 1 + hash(i) * 0.6, 0.8, [0x7a2a2a, 0x2a4a7a, 0x4a6a3a, 0xa88a50][i % 4], -11.5 + hash(i + 2) * 22, 3.9 + (i % 3) * 3, -8.3, s);
  box(9, 0.4, 3.4, 0x2a1f16, 0, 2.8, 2.6, s); box(0.4, 2.8, 3, 0x241a12, -4, 1.4, 2.6, s); box(0.4, 2.8, 3, 0x241a12, 4, 1.4, 2.6, s);
  chair(s, 0, -4.6, 0, 0x4a3828);
  const N = 54, W = 3, strip = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), new THREE.MeshBasicMaterial({ color: 0x5ac8ff }), N * W); strip.frustumCulled = false; const sg = new THREE.Group(); sg.position.set(0, 6.2, 2.6); s.add(sg); sg.add(strip); const dm = new THREE.Object3D();
  for (let i = 0; i < N; i++) for (let j = 0; j < W; j++) { const u = i / N * 6.283, v = (j - 1) * 0.42, r = 2.6 + v * Math.cos(u / 2); dm.position.set(r * Math.cos(u), v * Math.sin(u / 2), r * Math.sin(u)); dm.rotation.set(0, -u, u / 2); dm.updateMatrix(); strip.setMatrixAt(i * W + j, dm.matrix); }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 18), glow(0x2a6a9a)); base.position.set(0, 3.1, 2.6); s.add(base);
  const hl = new THREE.PointLight(0x5ac8ff, 90, 26); hl.position.set(0, 6, 3); s.add(hl);
  const panels = [0, 1, 2, 3].map(i => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.7), new THREE.MeshBasicMaterial({ color: 0x3a8ac8, transparent: true, opacity: 0.35, side: THREE.DoubleSide })); m.position.set((i < 2 ? -1 : 1) * (4.6 + (i % 2) * 1.2), 5 + (i % 2) * 2.4, 2.2); m.rotation.y = (i < 2 ? 1 : -1) * 0.5; s.add(m); return m; });
  const tony = makeChar('tony'); s.add(tony.g);
  return { s, cam, tony, sg, strip, hl, panels, base, pre(T) { sg.rotation.set(0.35, T * 0.9, 0.15); strip.material.color.setHex(0x5ac8ff); hl.color.setHex(0x5ac8ff); hl.intensity = 60; base.material.color.setHex(0x2a6a9a); panels.forEach((p, i) => { p.material.color.setHex(0x3a8ac8); p.material.opacity = 0.25 + 0.12 * Math.sin(T * 5 + i * 2); }); } };
});
SHOT('c1:1', 'holo', c => { const S = c.S, t = S.tony; stand(put(t, 0, 0, -0.6, 0), c.T, 'serious'); t.armL.rotation.set(-1.5 + Math.sin(c.T * 3) * 0.3, 0, -0.5); t.armR.rotation.set(-1.5 + Math.cos(c.T * 2.6) * 0.4, 0, 0.5 + Math.sin(c.T * 3) * 0.3); S.sg.rotation.y = c.T * 0.9 + Math.sin(c.T * 2.6) * 0.8; S.sg.rotation.x = 0.35 + Math.sin(c.T * 1.7) * 0.3;
  move(c.cam, [7, 5.6, 13.5], [0, 5.4, 1], [3.5, 5.4, 11], [0, 5.5, 1], c.k, 36); });
SHOT('c1:2', 'holo', c => { const S = c.S, t = S.tony, g = 0x4aff7a; S.strip.material.color.setHex(g); S.hl.color.setHex(g); S.hl.intensity = 22; S.base.material.color.setHex(0x2a9a4a); S.panels.forEach(p => p.material.color.setHex(0x3ac86a));
  const f = ease((c.l - 0.35) / 0.55); t.reset(); put(t, 0, -0.2 * f, lerp(-0.6, -4.1, f), 0); t.legL.rotation.x = t.legR.rotation.x = -1.57 * f; t.armL.rotation.x = t.armR.rotation.x = -0.5 * f; t.body.rotation.x = -0.12 * f; t.look('surprised', c.T); t.head.rotation.x = -0.1;
  move(c.cam, [2.6, 5.0, 7.2], [0, 4.9, -1], [1.6, 4.7, 5.2], [0, 4.6, -4], c.k, 34);
  const o = clamp(c.l / 0.2), bl = Math.sin(c.T * 14) > -0.3 ? 1 : 0.5; c.dom(`<div style="position:absolute;right:130px;top:170px;opacity:${o * bl};border:5px solid #4aff7a;border-radius:10px;padding:18px 34px;background:rgba(6,20,10,.7);text-align:center;box-shadow:0 0 40px rgba(74,255,122,.5)"><div style="font:700 26px Inter;letter-spacing:8px;color:#4aff7a">MODEL RENDERED</div><div style="font:900 78px Inter;color:#eafff0;line-height:1.05">SUCCESSFUL</div></div>`); });

// ================= COMPOUND DRIVEWAY =================
SET('drive', () => {
  const { s, cam } = mkScene(0xbcd6ea, [80, 320], 0xfff2dc, 2.4, [0xffffff, 0x6a8a5a, 1.4], [-20, 30, 26], 50);
  s.userData.bloom = 0.3; ground(s, 500, '#5f9a52', '#69a65c');
  box(16, 0.1, 300, 0x4a4e56, 0, 0.06, 0, s); const b = building(120, 30, 30, '#e2e6ea', 0.0, 3, '#9fc4e0'); b.position.set(0, 15, -70); s.add(b); box(124, 3, 34, 0xc9ced6, 0, 31, -70, s);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ transparent: true, map: tex(256, 256, c => { c.strokeStyle = '#2a3a52'; c.lineWidth = 26; c.lineJoin = 'round'; c.beginPath(); c.arc(128, 128, 104, 0.6, 5.9); c.stroke(); c.beginPath(); c.moveTo(70, 220); c.lineTo(128, 40); c.lineTo(186, 220); c.moveTo(92, 158); c.lineTo(190, 158); c.stroke(); }) })); logo.position.set(30, 18, -54.8); s.add(logo);
  for (let i = 0; i < 14; i++) { const g = new THREE.Group(); g.position.set((i % 2 ? 1 : -1) * (26 + hash(i) * 50), 0, -30 + hash(i + 3) * 90); s.add(g); box(1.2, 8, 1.2, 0x5a3d26, 0, 4, 0, g); box(7, 6, 7, 0x3a7a50, 0, 10, 0, g); }
  const cr = car(0xd9762a); cr.position.set(-5.5, 0, -2); cr.rotation.y = 0.5; s.add(cr);
  const tony = makeChar('tony'), steve = makeChar('steveCiv'); s.add(tony.g, steve.g); const sh = makeShield(); tony.hand('R').add(sh); sh.position.set(0, -0.1, 0.9); sh.rotation.x = 0;
  return { s, cam, tony, steve, cr, pre(T) { stand(put(tony, -2.1, 0, 2, 1.0), T, 'smirk'); stand(put(steve, 2.3, 0, 2, -1.0), T + 1, 'neutral'); } };
});
SHOT('c2', 'drive', c => { const S = c.S, t = S.tony; t.look('smirk', c.T, c.talk); t.armR.rotation.x = -0.95 * ease(c.k * 2.2); t.armR.rotation.z = -0.15; S.steve.look(c.k > 0.55 ? 'joy' : 'surprised', c.T); S.steve.armL.rotation.x = -1.0 * ease((c.k - 0.45) / 0.3);
  move(c.cam, [1.6, 5.1, 12.5], [-1.4, 4.7, 2], [0.8, 5.0, 10.5], [-1.5, 4.75, 2], c.k, 30); });

// ================= NEW YORK 2012 (street at x=0, glass corridor at x=200) =================
SET('ny2012', () => {
  const { s, cam } = mkScene(0x8a8f96, [40, 240], 0xffe2c0, 2.0, [0xe8e2d8, 0x4a4640, 1.3], [-24, 36, 14], 60);
  s.userData.bloom = 0.4; ground(s, 700, '#4a4c50', '#525458');
  for (const sx of [-1, 1]) for (let i = 0; i < 10; i++) { const h = 40 + hash(i * sx + 5) * 70, b = building(22, h, 22, ['#6a6660', '#7b7670', '#5d5a56'][i % 3], 0.2, i + (sx > 0 ? 20 : 0)); b.position.set(sx * 30, h / 2, 30 - i * 24); s.add(b); }
  const tw = building(26, 190, 26, '#4a5666', 0.5, 9, '#bfe3ff'); tw.position.set(0, 95, -210); s.add(tw); box(40, 5, 40, 0x3a4452, 0, 150, -210, s); const beam = box(4, 300, 4, new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.7, fog: false }), 0, 300, -210, s); beam.castShadow = false;
  const r = rng(22); const wrecks = []; for (let i = 0; i < 7; i++) { const g = car([0xd0b020, 0x8a2a2a, 0x3a5a8a, 0xdddddd][i % 4]); g.position.set((r() - 0.5) * 16, 0, 10 - i * 14); g.rotation.set(0, r() * 3, i % 3 === 0 ? 1.5 : 0); if (i % 3 === 0) g.position.y = 1.6; s.add(g); }
  const smoke = []; for (let i = 0; i < 40; i++) { const m = box(5, 5, 5, new THREE.MeshLambertMaterial({ color: 0x2a2826, transparent: true, opacity: 0.75 }), 0, 0, 0, s); m.castShadow = false; smoke.push(m); }
  const fires = [[-9, -20], [11, -44], [-6, -70]].map(([x, z]) => { const f = box(3, 4, 3, glow(0xff8a2a), x, 2, z, s); f.castShadow = false; return f; });
  const fly = [0, 1, 2, 3, 4, 5].map(i => { const g = new THREE.Group(); s.add(g); box(7, 0.8, 2.4, 0x3a3e46, 0, 0, 0, g); box(1.4, 1.2, 1.4, 0x6a5a8a, 0, 0.9, 0, g); box(0.5, 0.5, 0.5, glow(0x7fd0ff), 0, 0, -1.6, g); return g; });
  // glass corridor
  const C = new THREE.Group(); C.position.set(200, 60, 0); s.add(C);
  box(12, 0.6, 70, 0x9aa1ab, 0, -0.3, 0, C); box(12, 0.4, 70, 0x7b828a, 0, 12, 0, C); const gm = new THREE.MeshPhongMaterial({ color: 0xbfe0f4, transparent: true, opacity: 0.22, shininess: 100 });
  for (const sx of [-1, 1]) { const g = box(0.15, 12, 70, gm, sx * 6, 6, 0, C); g.castShadow = false; for (let z = -35; z <= 35; z += 7) box(0.4, 12, 0.4, 0x5a606a, sx * 6, 6, z, C); }
  for (let i = 0; i < 12; i++) { const h = 50 + hash(i + 30) * 80, b = building(26, h, 26, '#737982', 0.25, i + 50); b.position.set(200 + (i % 2 ? 1 : -1) * (40 + hash(i) * 30), h / 2, 60 - i * 22); s.add(b); }
  const cl = new THREE.PointLight(0xffffff, 120, 40); cl.position.set(0, 10, 4); C.add(cl);
  const A = makeChar('steve', 'serious'), B = makeChar('steve', 'serious'); C.add(A.g, B.g); const sA = makeShield(), sB = makeShield(); A.hand('L').add(sA); B.hand('L').add(sB); for (const x of [sA, sB]) { x.position.set(-0.6, 0.3, 0.3); x.rotation.y = -Math.PI / 2; }
  const scep = new THREE.Group(); C.add(scep); box(0.2, 0.2, 4.4, 0xb8892f, 0, 0, 0, scep); box(0.5, 0.5, 0.9, 0xd0a43a, 0, 0, 2.4, scep); box(0.34, 0.34, 0.34, glow(0xffe84a), 0, 0, 2.9, scep); const sl = new THREE.PointLight(0xffe84a, 14, 10); sl.position.set(0, 0.6, 2.9); scep.add(sl);
  const bub = label('"Bucky is alive."', { h: 0.5, bg: '#ffffff', color: '#14161c' }); C.add(bub);
  return { s, cam, A, B, scep, bub, pre(T) {
    smoke.forEach((m, i) => { const src = i % 4, k = ((T * 0.25 + i * 0.137) % 1), x = [-9, 11, -6, 6][src], z = [-20, -44, -70, -110][src]; m.position.set(x + Math.sin(i + k * 3) * 3 + k * 6, 3 + k * 46, z); m.scale.setScalar(3 + k * 9); m.material.opacity = 0.7 * (1 - k); m.rotation.y = i + T * 0.3; });
    fires.forEach((f, i) => { f.scale.y = 4 + Math.sin(T * 11 + i) * 1.2; f.position.y = f.scale.y / 2; });
    fly.forEach((g, i) => { const a = T * 0.6 + i * 1.05; g.position.set(Math.sin(a) * 30, 30 + i * 6 + Math.sin(T + i) * 3, -60 - i * 16 + Math.cos(a * 1.3) * 18); g.rotation.y = a + Math.PI / 2; g.rotation.z = Math.cos(a) * 0.4; });
    scep.position.set(-3.5, 0.3, -4); scep.rotation.y = 0.6; setPop(bub, 0); } };
});
SHOT('c4:0', 'ny2012', c => { move(c.cam, [5, 3, 44], [0, 34, -120], [3, 5, 30], [0, 48, -160], c.k, 46); shake(c.cam, c.T, 0.05); });
SHOT('c4:1', 'ny2012', c => { const S = c.S, A = S.A, B = S.B, [i, k] = cuts(c.k, [0.4, 0.74]); A.reset(); B.reset(); A.look('serious', c.T); B.look('serious', c.T);
  if (i === 0) { const p = (c.l * 2.4) % 1, hit = Math.sin(clamp(p * 2) * Math.PI), alt = Math.floor(c.l * 2.4) % 2; put(A, -1.9 - (alt ? hit * 0.5 : 0), 0, 0, 1.2); put(B, 1.9 + (alt ? 0 : hit * 0.5), 0, 0, -1.2); (alt ? B : A).armR.rotation.x = -1.2 - hit * 0.7; (alt ? A : B).armL.rotation.x = -1.3; (alt ? A : B).body.rotation.x = -hit * 0.18; A.g.position.x += alt ? 0 : hit * 0.6; B.g.position.x -= alt ? hit * 0.6 : 0;
    move(c.cam, [200 - 2, 64.6, 17], [200, 64.0, 0], [200 + 3, 64.4, 14], [200, 64.0, 0], k, 34); shake(c.cam, c.T, 0.04 * hit); }
  else if (i === 1) { put(A, -1.25, 0, 0, 0.95); put(B, 1.25, 0, 0, -0.95); A.body.rotation.x = 0.16; A.head.rotation.x = 0.1; A.look('smirk', c.T, Math.abs(Math.sin(c.T * 13)) * (k < 0.6 ? 0.5 : 0)); B.look(k > 0.45 ? 'surprised' : 'serious', c.T); B.armL.rotation.x = -1.3 * (1 - ease((k - 0.45) / 0.3)); S.bub.position.set(0, 6.55, 1.2); setPop(S.bub, (k - 0.15) / 0.2);
    move(c.cam, [200 + 1.2, 65.0, 9.5], [200 + 0.2, 64.9, 0], [200 + 0.8, 65.0, 8], [200 + 0.4, 64.9, 0], k, 30); }
  else { const hit = ease(k / 0.22), dn = ease((k - 0.12) / 0.5); put(A, -1.15 + hit * 0.7, 0, 0, 1.35); A.armR.rotation.x = -1.6 * Math.sin(clamp(k / 0.3) * Math.PI); put(B, 1.15 + dn * 3.2, dn * 0.5, 0, -1.35); B.g.rotation.x = -dn * 1.5; B.look('sleep', c.T); if (k < 0.2 && k > 0.08) c.flash(0.5);
    const g = ease((k - 0.5) / 0.4); A.g.rotation.y = 1.35 + g * 1.4; A.armL.rotation.x = 0; S.scep.position.set(-3.5, 0.3 + g * 2.6, -4 + g * 2.5); S.scep.rotation.set(-g * 0.9, 0.6, 0);
    move(c.cam, [200 - 5, 63.5, 13], [200 + 1.5, 62.5, 0], [200 - 6.5, 64, 10], [200 - 1, 63, -1], k, 36); } });

// ================= ASGARD =================
SET('asgard', () => {
  const { s, cam } = mkScene(0xffe6b0, [60, 260], 0xfff0c8, 2.2, [0xfff2d0, 0xa8782a, 1.3], [-20, 40, 30], 60);
  s.userData.bloom = 0.6;
  const gold = new THREE.MeshPhongMaterial({ color: 0xc9983a, shininess: 110, specular: 0xffe8b0 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(90, 260), gold); fl.rotation.x = -Math.PI / 2; fl.position.z = -80; fl.receiveShadow = true; s.add(fl);
  for (let z = 20; z > -200; z -= 20) for (const sx of [-1, 1]) { box(4.4, 46, 4.4, gold, sx * 22, 23, z, s); box(6.4, 2, 6.4, 0x8a6a22, sx * 22, 1, z, s); box(6.4, 2.4, 6.4, 0x8a6a22, sx * 22, 45, z, s); const bn = box(0.2, 16, 5, 0xa81f24, sx * 19.5, 30, z, s); bn.castShadow = false; }
  box(100, 2, 260, 0xb8892f, 0, 47, -80, s); for (const sx of [-1, 1]) box(1, 46, 260, 0xd9b24a, sx * 40, 23, -80, s);
  const arch = box(30, 34, 0.3, new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: false }), 0, 20, -208, s); arch.castShadow = false; box(46, 46, 1, 0xb8892f, -38, 23, -209, s); box(46, 46, 1, 0xb8892f, 38, 23, -209, s);
  box(8, 0.08, 240, 0xa81f24, 0, 0.05, -80, s);
  for (let i = 0; i < 6; i++) { const a = put(makeChar('einherjar'), (i % 2 ? 1 : -1) * 15, 0, -20 - i * 22, (i % 2 ? -1 : 1) * 1.57); a.face('serious'); s.add(a.g); box(0.2, 7, 0.2, 0xd9b24a, 0, -0.5, 0.4, a.armR); }
  const thor = makeChar('thorBro'), fr = makeChar('frigga'); s.add(thor.g, fr.g); const ham = makeHammer(); s.add(ham);
  return { s, cam, thor, fr, ham, pre(T) { if (ham.parent !== s) s.add(ham); ham.visible = false; thor.reset(); fr.reset(); thor.g.visible = fr.g.visible = true; } };
});
SHOT('c5:0', 'asgard', c => { c.S.thor.g.visible = c.S.fr.g.visible = false; move(c.cam, [0, 5, 44], [0, 22, -200], [0, 9, 26], [0, 20, -200], c.k, 46); });
SHOT('c5:1', 'asgard', c => { const S = c.S, t = S.thor, f = S.fr, h = ease(c.k * 2.2); put(t, -lerp(2.6, 0.95, h), 0, -30, 1.57); put(f, lerp(2.6, 0.95, h), 0, -30, -1.57); if (h < 1) { t.walk(c.T * 7, 0.4); f.walk(c.T * 7, 0.3); } t.armL.rotation.x = t.armR.rotation.x = -1.25 * h; t.armL.rotation.z = 0.35 * h; t.armR.rotation.z = -0.35 * h; f.armL.rotation.x = f.armR.rotation.x = -1.25 * h; f.armL.rotation.z = 0.3 * h; f.armR.rotation.z = -0.3 * h; t.head.rotation.x = 0.25 * h; t.look(h > 0.9 ? 'sleep' : 'sad', c.T); f.look('neutral', c.T); f.head.rotation.z = 0.1 * h; t.body.position.y = Math.sin(c.T * 3) * 0.04;
  const a = -0.5 + c.k * 0.7; shot(c.cam, [Math.sin(a) * 15, 5.4, -30 + Math.cos(a) * 15], [0, 4.4, -30], 32); });
SHOT('c5:2', 'asgard', c => { const S = c.S, t = S.thor, [i, k] = cuts(c.k, [0.58]); S.fr.g.visible = false; put(t, 0, 0, -30, 0.5); t.idle(c.T); const kk = i === 0 ? k : 1;
  t.armR.rotation.z = 1.75; t.armR.rotation.x = 0; const f = clamp(kk / 0.85), got = f >= 1; S.ham.visible = true;
  if (!got) { S.ham.position.set(lerp(-36, 2.3, f * f) + 1.6, 6.2 + Math.sin(f * 3.14) * 5, lerp(-150, -30, f * f) + 2.2); S.ham.rotation.set(c.T * 14, 0, 1.57); t.look('serious', c.T); }
  else { t.armR.add(S.ham); S.ham.position.set(0, -2.9, 0); S.ham.rotation.set(Math.PI, 0, 0); t.look('joy', c.T); t.armR.rotation.z = 2.3 + Math.sin(c.T * 8) * 0.08; t.body.position.y = Math.abs(Math.sin(c.T * 6)) * 0.2; }
  if (i === 0) { move(c.cam, [10, 5, -14], [0, 5.5, -34], [7, 5, -17], [1, 6, -31], k, 40); if (k > 0.83 && k < 0.92) c.flash(0.5); }
  else move(c.cam, [5.5, 5.6, -21.5], [0.6, 5.3, -30], [4.6, 5.5, -22.5], [0.6, 5.4, -30], k, 30); });

// ================= MORAG (x=0) + THANOS' THRONE (x=300) =================
SET('morag', () => {
  const { s, cam } = mkScene(0x3a4a52, [40, 240], 0xbfe0e8, 1.2, [0xa8c8d0, 0x1c2428, 1.2], [20, 30, 20], 60);
  s.userData.bloom = 0.6; ground(s, 800, '#2f3a3e', '#364246');
  const r = rng(41); for (let i = 0; i < 60; i++) { const sc = 2 + r() * 7; box(sc, sc * (0.5 + r()), sc, [0x3a4448, 0x465256, 0x2a3236][i % 3], (r() - 0.5) * 220, sc * 0.3, -20 - r() * 160, s).rotation.set(r() * 0.4, r() * 3, r() * 0.4); }
  for (let i = 0; i < 10; i++) { const x = (i % 2 ? 1 : -1) * 16, z = -30 - (i >> 1) * 16, h = 20 + hash(i + 2) * 16; box(4.5, h, 4.5, 0x4a5458, x, h / 2, z, s).rotation.z = (hash(i) - 0.5) * 0.12; } box(44, 4, 12, 0x4a5458, 0, 38, -94, s); box(8, 38, 8, 0x40494d, -18, 19, -94, s); box(8, 38, 8, 0x40494d, 18, 19, -94, s);
  box(4, 5, 4, 0x2a3236, 0, 2.5, -70, s); const orb = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), glow(0xb050ff)); orb.position.set(0, 7, -70); s.add(orb); const ol = new THREE.PointLight(0xb050ff, 300, 60); ol.position.set(0, 8, -68); s.add(ol);
  const RN = 900, rp = new Float32Array(RN * 6), rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xbfe0e8, transparent: true, opacity: 0.45 })); rain.geometry.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rain.frustumCulled = false; s.add(rain);
  const neb = makeChar('nebula', 'sad'), ghost = makeChar('nebula', 'surprised'); s.add(neb.g, ghost.g);
  const mem = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, side: THREE.DoubleSide, map: tex(256, 148, c => { c.fillStyle = 'rgba(40,100,200,.6)'; c.fillRect(0, 0, 256, 148); c.strokeStyle = '#9fd0ff'; c.lineWidth = 5; c.strokeRect(2, 2, 252, 144); const fig = (x, col) => { c.fillStyle = col; c.fillRect(x, 60, 26, 44); c.fillRect(x + 4, 38, 18, 18); }; fig(40, '#a8211f'); fig(80, '#24457a'); fig(120, '#6fae52'); fig(160, '#4f78b5'); c.fillStyle = '#d0a43a'; c.fillRect(204, 52, 30, 42); STONES.forEach((q, i) => { c.fillStyle = q[1]; c.fillRect(206 + (i % 3) * 9, 58 + (i > 2 ? 14 : 0), 7, 7); }); c.fillStyle = '#dff4ff'; c.font = '900 16px Inter'; c.fillText('2023', 12, 24); }) })); s.add(mem);
  // throne room
  const TH = new THREE.Group(); TH.position.set(300, 0, 0); s.add(TH); box(60, 1, 80, 0x1c1a22, 0, -0.5, 0, TH); box(60, 40, 1, 0x18161e, 0, 20, -30, TH); for (const sx of [-1, 1]) { box(1, 40, 80, 0x18161e, sx * 30, 20, 0, TH); for (let z = -24; z < 30; z += 12) box(2.4, 30, 2.4, 0x2a2632, sx * 18, 15, z, TH); }
  box(12, 2, 12, 0x2a2632, 0, 1, -16, TH); box(9, 2.6, 7, 0x3a3644, 0, 3.3, -17, TH); box(9, 13, 2, 0x3a3644, 0, 10, -20.4, TH); box(2, 6, 7, 0x4a4656, -5.4, 6, -17, TH); box(2, 6, 7, 0x4a4656, 5.4, 6, -17, TH);
  const thL = new THREE.PointLight(0x7f9fff, 260, 60); thL.position.set(0, 12, 0); TH.add(thL); const thR = new THREE.PointLight(0xb050ff, 120, 40); thR.position.set(-10, 6, -14); TH.add(thR);
  const than = makeChar('thanos', 'serious'), neb2 = makeChar('nebula', 'sad'); TH.add(than.g, neb2.g);
  const proj = new THREE.Mesh(new THREE.PlaneGeometry(15, 8.7), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, side: THREE.DoubleSide, map: mem.material.map })); proj.position.set(0, 8.5, 0); TH.add(proj);
  const beam = box(0.2, 0.2, 1, new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.6 }), 0, 0, 0, TH); beam.castShadow = false;
  return { s, cam, neb, ghost, mem, than, neb2, proj, beam, ol, pre(T) {
    for (let i = 0; i < RN; i++) { const x = cam.position.x + (hash(i) - 0.5) * 80, z = cam.position.z + (hash(i + 0.5) - 0.5) * 80 - 20, y = 40 - ((T * 50 + hash(i + 0.25) * 40) % 40); rp.set([x, y, z, x + 0.5, y - 1.8, z], i * 6); } rain.geometry.attributes.position.needsUpdate = true; rain.visible = cam.position.x < 150;
    orb.rotation.y = T; orb.scale.setScalar(1 + Math.sin(T * 4) * 0.08); ol.intensity = 260 + 80 * Math.sin(T * 4); neb.g.visible = ghost.g.visible = mem.visible = false;
    than.reset(); put(than, 0, 1.2, -16.2, 0); than.sit(); neb2.reset(); put(neb2, 9, 0, -6, -2.2); neb2.body.position.y = -0.8; neb2.legL.rotation.x = neb2.legR.rotation.x = -1.0; neb2.head.rotation.x = -0.2; neb2.look('sad', T); proj.material.opacity = 0.7 + 0.15 * Math.sin(T * 9);
    const a = [9 - 0.6, 4.2, -6 - 0.5], b = [0, 8.5, 0]; beam.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); beam.scale.z = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); beam.lookAt(TH.position.x + b[0], b[1], b[2]); } };
});
SHOT('c6:0', 'morag', c => { move(c.cam, [8, 3.5, 30], [0, 18, -90], [5, 4.5, 20], [0, 18, -90], c.k, 46); if (hash(Math.floor(c.T * 8)) > 0.8) c.flash(0.35); });
SHOT('c6:1', 'morag', c => { const S = c.S, n = S.neb, g = S.ghost, q = Math.floor(c.T * 12), gl = hash(q) > 0.55; n.g.visible = true; n.reset(); put(n, (gl ? (hash(q + 1) - 0.5) * 0.5 : 0), 0, -40, 0.2); n.armL.rotation.set(-2.6, 0, 0.5); n.armR.rotation.set(-2.6, 0, -0.5); n.head.rotation.z = (hash(q + 2) - 0.5) * (gl ? 0.5 : 0.1); n.body.rotation.x = 0.2; n.look('sad', c.T);
  g.g.visible = gl; g.reset(); put(g, 1.2 * (hash(q + 3) - 0.5) * 3, 0, -40.4, 0.2); g.armL.rotation.set(-2.6, 0, 0.5); g.armR.rotation.set(-2.6, 0, -0.5); g.look('surprised', c.T);
  S.mem.visible = hash(q + 5) > 0.2; S.mem.position.set(3.5, 9.6 + Math.sin(c.T * 2) * 0.2, -43); S.mem.rotation.y = -0.3; S.mem.material.opacity = 0.45 + hash(q + 7) * 0.45;
  move(c.cam, [-4.5, 4.8, -27], [1, 6.0, -41], [-3, 5.0, -29.5], [1, 6.2, -41], c.k, 36); });
SHOT('c6:2', 'morag', c => { const S = c.S, t = S.than; t.look(c.k > 0.5 ? 'menace' : 'serious', c.T); t.head.rotation.x = -0.05; t.armR.rotation.x = -0.5 - 0.7 * ease((c.k - 0.4) / 0.3); t.armR.rotation.z = -0.3;
  const [i, k] = cuts(c.k, [0.45]); if (i === 0) move(c.cam, [300 - 14, 7, 24], [300, 8.5, -6], [300 - 9, 7.5, 20], [300, 8.5, -8], k, 40); else move(c.cam, [300 + 3.5, 9.6, 3.5], [300, 9.3, -16], [300 + 2.6, 9.6, 0.6], [300, 9.4, -16], k, 32); });

// ================= VORMIR (peaks far, cliff top at y=80, pool at z=220) =================
SET('vormir', () => {
  const { s, cam } = mkScene(0x2a1c3c, [50, 420], 0xffb070, 1.5, [0xc9a0ff, 0x1a0f24, 0.9], [0, 30, -60], 60);
  s.userData.bloom = 0.65; ground(s, 1200, '#2a2230', '#30283a');
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1400, 260), new THREE.MeshBasicMaterial({ fog: false, map: tex(8, 128, c => { const g = c.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#1c1230'); g.addColorStop(0.55, '#5a2a52'); g.addColorStop(0.85, '#e07a3a'); g.addColorStop(1, '#ffc070'); c.fillStyle = g; c.fillRect(0, 0, 8, 128); }) })); sky.position.set(0, 110, -560); s.add(sky);
  const ecl = new THREE.Group(); ecl.position.set(0, 190, -540); s.add(ecl); ecl.add(new THREE.Mesh(new THREE.CircleGeometry(46, 40), new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false }))); const moon = new THREE.Mesh(new THREE.CircleGeometry(42, 40), new THREE.MeshBasicMaterial({ color: 0x120a1c, fog: false })); moon.position.set(3, 2, 1); ecl.add(moon);
  const peak = (x, h) => { for (let i = 0; i < 9; i++) { const w = 50 - i * 5; box(w, h / 9 + 1, w, [0x2f2438, 0x382b44][i % 2], x + Math.sin(i * 1.3) * 3, h / 18 + i * h / 9, -220, s).rotation.y = i * 0.3; } };
  peak(-42, 190); peak(42, 170); box(30, 6, 30, 0x2f2438, 0, 150, -220, s);
  const r = rng(51); for (let i = 0; i < 70; i++) { const sc = 3 + r() * 12; box(sc, sc * (0.4 + r()), sc, [0x2f2438, 0x382b44, 0x241c2c][i % 3], (r() - 0.5) * 400, sc * 0.25, -60 - r() * 260, s).rotation.set(r() * 0.4, r() * 3, r() * 0.4); }
  // cliff top
  const CT = new THREE.Group(); CT.position.set(0, 80, 0); s.add(CT); box(34, 8, 30, 0x382b44, 0, -4, -7, CT); box(3, 12, 3, 0x2f2438, -12, 6, -16, CT); box(3, 12, 3, 0x2f2438, 12, 6, -16, CT); box(27, 2.4, 3, 0x2f2438, 0, 12.6, -16, CT);
  const sl = new THREE.PointLight(0xffa030, 160, 50); sl.position.set(0, 4, 12); CT.add(sl);
  const guide = makeChar('guide'); CT.add(guide.g); box(1.9, 1.9, 1.7, 0x1a1418, 0, 0.75, -0.2, guide.head); for (let i = 0; i < 5; i++) box(0.5, 2.2, 0.1, 0x1a1418, -1 + i * 0.5, -0.4, 0, guide.body);
  const nat = makeChar('natasha'), clint = makeChar('clint'); CT.add(nat.g, clint.g);
  const AN = 400, ap = new Float32Array(AN * 3), ash = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffd0a0, size: 0.28, transparent: true, opacity: 0.7 })); ash.geometry.setAttribute('position', new THREE.BufferAttribute(ap, 3)); ash.frustumCulled = false; s.add(ash);
  // pool
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), new THREE.MeshPhongMaterial({ color: 0x4a3a66, shininess: 120, specular: 0xffb070, transparent: true, opacity: 0.9 })); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.5, 240); s.add(pool);
  const clint2 = makeChar('clint', 'sad'); s.add(clint2.g); const stone = box(0.4, 0.4, 0.4, glow(0xffa030), 0, 0, 0.1, clint2.hand('R')); stone.castShadow = false; const stl = new THREE.PointLight(0xffa030, 0, 20); clint2.hand('R').add(stl);
  return { s, cam, nat, clint, guide, clint2, stone, stl, pre(T) {
    for (let i = 0; i < AN; i++) ap.set([cam.position.x + (hash(i) - 0.5) * 70 + Math.sin(T * 0.6 + i), cam.position.y - 14 + ((hash(i + 0.3) * 30 + T * (1 + hash(i + 0.6) * 1.5)) % 30), cam.position.z - 30 + (hash(i + 0.9) - 0.5) * 60], i * 3); ash.geometry.attributes.position.needsUpdate = true;
    guide.reset(); put(guide, -8, 1 + Math.sin(T * 1.2) * 0.35, -6, 0.9); guide.look('serious', T); guide.armL.rotation.z = -0.25; guide.armR.rotation.z = 0.25; guide.body.rotation.z = Math.sin(T * 0.8) * 0.03;
    nat.reset(); clint.reset(); nat.g.visible = clint.g.visible = true; nat.g.rotation.set(0, 0, 0); clint.g.rotation.set(0, 0, 0); clint2.g.visible = false; stl.intensity = 0; } };
});
SHOT('c7:0', 'vormir', c => move(c.cam, [0, 6, 60], [0, 120, -220], [0, 22, 30], [0, 150, -220], c.k, 50));
SHOT('c7:1', 'vormir', c => { const S = c.S; stand(put(S.nat, -2.2, 0, 2, 0.15), c.T, 'serious'); stand(put(S.clint, 2.2, 0, 1.4, -0.15), c.T + 1, 'serious'); S.guide.armR.rotation.x = -1.2 * ease(c.k * 2); S.guide.armR.rotation.z = 0.2;
  move(c.cam, [10, 88, -20], [-1, 84.5, 6], [6, 86.5, -17], [-1, 84.5, 8], c.k, 40); });
SHOT('c7:2', 'vormir', c => { const S = c.S; stand(put(S.nat, -1.9, 0, 4, 1.2), c.T, 'sad'); stand(put(S.clint, 1.9, 0, 4, -1.2), c.T + 1, 'sad'); S.nat.head.rotation.x = -0.05; S.clint.head.rotation.x = 0.15;
  move(c.cam, [1.5, 85.0, 15.5], [0, 84.7, 4], [0.5, 85.0, 13.5], [0, 84.7, 4], c.k, 30); });
const hang = (S, T) => { const n = S.nat, cl = S.clint; put(cl, 0, 0.55, 4.4, 0); cl.g.rotation.x = Math.PI / 2; cl.armR.rotation.x = -1.57; cl.armL.rotation.x = -2.6; cl.armL.rotation.z = -0.5; cl.head.rotation.x = -0.5; cl.look('sad', T);
  put(n, 0, -5.75 + Math.sin(T * 1.5) * 0.1, 9.1, 0); n.armR.rotation.z = 2.95; n.head.rotation.x = -0.5; n.legL.rotation.x = Math.sin(T * 1.5) * 0.12; n.legR.rotation.x = -Math.sin(T * 1.5) * 0.12; };
SHOT('c8:0', 'vormir', c => { const S = c.S, n = S.nat, cl = S.clint, [i, k] = cuts(c.k, [0.52]); S.guide.g.visible = i === 0;
  if (i === 0) { const sw = Math.sin(c.T * 3.2) * 1.3; put(n, -1.05 + sw, 0, 6 + Math.sin(c.T * 1.7) * 0.8, 1.45); put(cl, 1.05 + sw, 0, 6 + Math.sin(c.T * 1.7) * 0.8, -1.45); for (const ch of [n, cl]) { ch.armL.rotation.x = ch.armR.rotation.x = -1.4; ch.armL.rotation.z = 0.25; ch.armR.rotation.z = -0.25; ch.legL.rotation.x = Math.sin(c.T * 9) * 0.4; ch.legR.rotation.x = -Math.sin(c.T * 9) * 0.4; ch.body.rotation.x = 0.14; ch.look('serious', c.T); }
    move(c.cam, [-9, 84.2, 17], [0, 84, 6], [8, 83.6, 16], [0, 84, 6.5], k, 36); shake(c.cam, c.T, 0.05); }
  else { hang(S, c.T); n.look('neutral', c.T); move(c.cam, [11, 79.5, 19], [0.6, 79.2, 8], [8.5, 80.5, 18], [0.6, 79.4, 8], k, 36); } });
SHOT('c8:1', 'vormir', c => { const S = c.S, n = S.nat, cl = S.clint, [i, k] = cuts(c.k, [0.36]);
  if (i === 0) { S.guide.g.visible = false; hang(S, c.T); n.look(k > 0.5 ? 'sleep' : 'neutral', c.T);
    move(c.cam, [2.6, 80.6, 16.2], [0, 79.0, 9.1], [1.8, 80.4, 15.2], [0, 79.05, 9.1], k, 26); c.fade(clamp((k - 0.8) / 0.2)); }
  else { const c2 = S.clint2; c2.g.visible = true; c2.reset(); put(c2, 0, -0.9, 232, 0.25); c2.legL.rotation.x = c2.legR.rotation.x = -1.2; c2.body.rotation.x = 0.25; c2.head.rotation.x = 0.55; c2.look('sad', c.T); const op = ease((k - 0.25) / 0.4); c2.armR.rotation.x = -1.2 * op - 0.2; c2.armR.rotation.z = -0.3; S.stone.visible = op > 0.3; S.stl.intensity = 70 * op * (0.8 + 0.2 * Math.sin(c.T * 5));
    c.fade(clamp(1 - k / 0.12)); move(c.cam, [-3, 3.4, 246], [0, 4, 232], [-1.5, 3.2, 242.5], [0.3, 3.4, 232], k, 34); } });
