// Shared sets used by several acts: 'battle' (the ruined compound battlefield) and 'cabin' (Tony's lake house).
import { THREE, SET, mkScene, put, clamp, ease, lerp, hash, rng, M, tex, box, label, makeChar, ground, CAST, makeShield, makeHammer, makeAxe, makeGauntlet, dustFx, portalFx } from './engine.js';

// ================= BATTLEFIELD =================
// Heroes stand on the +z side facing -z (ry = Math.PI); Thanos and his army are on the -z side facing +z.
//   const S = c.S;  const cap = S.H('steve');  S.place(cap, x, y, z, ry)   -> shows + positions a hero (all are hidden/reset every frame)
//   S.shield / S.shieldBroken / S.hammer / S.axe / S.gauntlet / S.sword     -> free props (hidden each frame): set .visible, position, or attach with S.hold(prop, ch, 'L'|'R')
//   S.army = 0..1 (how much of Thanos' army is visible), S.armyDust = 0..1 (army dissolving), S.allies = 0..1 (returned heroes crowd)
//   S.portals[i].userData.set(k, T)  (20 portals behind the hero line),  S.dust[i].set([x,y,z], k, scale)  (6 dust dissolves),  S.ship.visible
SET('battle', () => {
  const { s, cam } = mkScene(0x8f7058, [50, 330], 0xffd2a0, 2.2, [0xffe2c4, 0x4a3a30, 1.2], [-30, 34, 20], 70);
  s.userData.bloom = 0.42;
  ground(s, 700, '#5c4c3e', '#655445');
  const r = rng(77);
  for (let i = 0; i < 170; i++) { const x = (r() - 0.5) * 320, z = (r() - 0.5) * 320, sc = 1 + r() * 5; if (Math.abs(x) < 14 && Math.abs(z) < 30) continue; const b = box(sc * (1 + r()), sc * (0.4 + r() * 0.8), sc * (1 + r()), [0x7b756d, 0x6a655e, 0x8a847b, 0x4a4640][i % 4], x, sc * 0.25, z, s); b.rotation.set(r() * 0.5, r() * 3, r() * 0.5); }
  // broken compound wall with the A logo
  const wall = new THREE.Group(); wall.position.set(-34, 0, 26); wall.rotation.set(0, 0.5, -0.12); s.add(wall);
  box(30, 22, 3, 0x8a847b, 0, 10, 0, wall); box(12, 9, 3, 0x7b756d, 19, 4, 1, wall).rotation.z = 0.3;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshBasicMaterial({ transparent: true, map: tex(256, 256, c => { c.strokeStyle = '#d9dde3'; c.lineWidth = 26; c.lineJoin = 'round'; c.beginPath(); c.arc(128, 128, 104, 0.6, 5.9); c.stroke(); c.beginPath(); c.moveTo(70, 220); c.lineTo(128, 40); c.lineTo(186, 220); c.moveTo(92, 158); c.lineTo(190, 158); c.stroke(); }) })); logo.position.set(0, 12, 1.6); wall.add(logo);
  for (let i = 0; i < 9; i++) { const g = new THREE.Group(); g.position.set((r() - 0.5) * 200, 0, (r() - 0.5) * 200); s.add(g); const b = box(3 + r() * 3, 14 + r() * 22, 3 + r() * 3, 0x6a655e, 0, 8, 0, g); b.rotation.z = (r() - 0.5) * 0.7; }
  // fires
  const fires = []; for (let i = 0; i < 22; i++) { const x = (r() - 0.5) * 240, z = (r() - 0.5) * 240; if (Math.abs(x) < 12 && Math.abs(z) < 26) continue; const f = box(2, 3, 2, new THREE.MeshBasicMaterial({ color: 0xff8a2a }), x, 1.5, z, s); f.castShadow = false; fires.push(f); }
  for (const [x, z] of [[-40, -30], [45, 10], [10, -80]]) { const p = new THREE.PointLight(0xff7a2a, 500, 90); p.position.set(x, 8, z); s.add(p); }
  const AN = 500, ap = new Float32Array(AN * 3), ash = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffc890, size: 0.32, transparent: true, opacity: 0.7 })); ash.geometry.setAttribute('position', new THREE.BufferAttribute(ap, 3)); ash.frustumCulled = false; s.add(ash);
  // warship
  const ship = new THREE.Group(); ship.position.set(0, 120, -300); s.add(ship); const dk = new THREE.MeshLambertMaterial({ color: 0x23202a, fog: false });
  box(40, 26, 150, dk, -60, 0, 0, ship); box(40, 26, 150, dk, 60, 0, 0, ship); box(100, 14, 40, dk, 0, 0, 0, ship); for (let i = 0; i < 8; i++) box(6, 3, 3, new THREE.MeshBasicMaterial({ color: 0xffb060, fog: false }), -60 + (i % 2) * 120, -8 + (i >> 1) * 5, 76, ship);
  // army + allies as instanced silhouettes
  const crowd = (n, col, zs) => { const body = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 4, 1.2), M(col), n), head = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), M(col), n); body.frustumCulled = head.frustumCulled = false; s.add(body, head); const P = []; for (let i = 0; i < n; i++) P.push([(hash(i + zs) - 0.5) * 300, zs * (46 + hash(i * 3.1 + zs) * 150), hash(i * 1.7), 0.8 + hash(i * 2.3) * 0.7]); return { body, head, P }; };
  const army = crowd(700, 0x2a2830, -1), allies = crowd(420, 0x4a4a52, 1); const col = new THREE.Color(); const acol = [0x24457a, 0x8a1a22, 0x2a2d35, 0xc9a04f, 0x3f6a4a, 0x5a5f68, 0x6a3a8a]; for (let i = 0; i < 420; i++) { allies.body.setColorAt(i, col.set(acol[i % 7])); allies.head.setColorAt(i, col.set([0xe6bd98, 0x8a5a3c, 0xf0c9a4, 0x15161a][i % 4])); }
  const dm = new THREE.Object3D();
  const drawCrowd = (c, vis, dust, T) => { for (let i = 0; i < c.P.length; i++) { const p = c.P[i], on = p[2] < vis, d = clamp((dust - p[2] * 0.6) / 0.4), y = Math.abs(Math.sin(T * 5 + i)) * 0.25 + d * d * 10, sc = on ? p[3] * (1 - d) : 0.0001; dm.rotation.set(0, 0, 0); dm.scale.setScalar(sc); dm.position.set(p[0] + d * 6, 2 * sc + y, p[1]); dm.updateMatrix(); c.body.setMatrixAt(i, dm.matrix); dm.position.y = 4.65 * sc + y; dm.updateMatrix(); c.head.setMatrixAt(i, dm.matrix); } c.body.instanceMatrix.needsUpdate = c.head.instanceMatrix.needsUpdate = true; };
  const heroes = {};
  const props = { shield: makeShield(), shieldBroken: makeShield(true), hammer: makeHammer(), axe: makeAxe(), gauntlet: makeGauntlet(), sword: (() => { const g = new THREE.Group(); box(0.4, 5, 0.4, 0x8a8f96, 0, 0, 0, g); box(1.6, 3.4, 0.2, 0xb9c0c9, 0.4, 2.6, 0, g); box(1.6, 3.4, 0.2, 0xb9c0c9, -0.4, -2.6, 0, g); return g; })() };
  Object.values(props).forEach(p => s.add(p));
  const portals = []; const pc = [0x9fd0ff, 0x7fc98a, 0xffe2a8, 0xc9a8ff, 0x9fd0ff, 0xffb8a0];
  for (let i = 0; i < 20; i++) { const p = portalFx(s, pc[i % 6], 4 + hash(i + 3) * 2.5); p.position.set((i % 2 ? 1 : -1) * (10 + (i >> 1) * 11) + (hash(i) - 0.5) * 6, p.position.y + (i > 9 ? 8 + hash(i + 7) * 14 : 0), 48 + hash(i + 1) * 40); p.rotation.y = Math.PI; portals.push(p); }
  const dust = [0, 1, 2, 3, 4, 5].map(() => dustFx(s, 200));
  const S = {
    s, cam, heroes, portals, dust, ship, ...props, army: 0, armyDust: 0, allies: 0,
    H(name) { if (!heroes[name]) { heroes[name] = makeChar(name); s.add(heroes[name].g); } return heroes[name]; },
    place(ch, x, y, z, ry = Math.PI) { ch.g.visible = true; return put(ch, x, y, z, ry); },
    hold(prop, ch, side = 'R') { const a = side === 'R' ? ch.armR : ch.armL; prop.visible = true; a.add(prop); prop.position.set(0, -2.1, 0.5); prop.rotation.set(0, 0, 0); prop.scale.setScalar(1); return prop; },
    pre(T) {
      this.army = 0; this.armyDust = 0; this.allies = 0; ship.visible = false;
      for (const h of Object.values(heroes)) { h.reset(); h.g.visible = false; h.g.scale.setScalar(CAST[h.name].scale || 1); }
      for (const p of Object.values(props)) { if (p.parent !== s) s.add(p); p.visible = false; p.rotation.set(0, 0, 0); p.scale.setScalar(1); }
      portals.forEach(p => p.userData.set(0, T)); dust.forEach(d => d.set([0, 0, 0], 0));
      fires.forEach((f, i) => { f.scale.set(2 + Math.sin(T * 9 + i) * 0.5, 3 + Math.sin(T * 13 + i * 2) * 1.2, 2); f.position.y = f.scale.y / 2; });
      for (let i = 0; i < AN; i++) ap.set([(hash(i) - 0.5) * 160 + Math.sin(T * 0.4 + i) * 3, (hash(i + 0.3) * 40 + T * (0.6 + hash(i + 0.6))) % 40, (hash(i + 0.9) - 0.5) * 160], i * 3); ash.geometry.attributes.position.needsUpdate = true;
    },
    // call at the END of every battle shot so the instanced crowds reflect S.army / S.armyDust / S.allies
    post(T) { drawCrowd(army, this.army, this.armyDust, T); drawCrowd(allies, this.allies, 0, T); },
  };
  return S;
});

// ================= TONY'S CABIN =================
//   S.tony ('tony', casual), S.tonyArmor, S.morgan, S.pepper -> all hidden/reset each frame; show with S.place(ch, x, y, z, ry)
//   porch floor is y = 1.6 for |x| < 9, z between -1 and 4; steps come down toward +z to the lawn (y = 0); lake is on the -x side; a dock runs out at z = 18.
SET('cabin', () => {
  const { s, cam } = mkScene(0xbfd8ea, [70, 330], 0xfff0d0, 2.5, [0xffffff, 0x6a8a5a, 1.4], [26, 30, 30], 60);
  s.userData.bloom = 0.3;
  ground(s, 500, '#5f9a52', '#69a65c');
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(300, 400), new THREE.MeshPhongMaterial({ color: 0x4f8fb5, shininess: 100, transparent: true, opacity: 0.94 })); lake.rotation.x = -Math.PI / 2; lake.position.set(-175, 0.1, 0); s.add(lake);
  box(22, 0.5, 3.4, 0x8a6238, -34, 1.0, 18, s); for (let i = 0; i < 5; i++) box(0.6, 3, 0.6, 0x6a4a2e, -26 - i * 4.5, 0, 19.5, s);
  // cabin
  const wood = tex(64, 64, c => { c.fillStyle = '#8a5f3a'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#74492a'; for (let y = 0; y < 64; y += 16) c.fillRect(0, y, 64, 3); }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(4, 3);
  const wm = new THREE.MeshLambertMaterial({ map: wood });
  box(22, 12, 14, wm, 0, 7.6, -8.5, s); box(20, 0.6, 6, 0x9a7248, 0, 1.3, 1.5, s); box(20, 1.3, 6, 0x6a4a2e, 0, 0.65, 1.5, s);
  for (const x of [-9.4, -3.2, 3.2, 9.4]) box(0.7, 8.4, 0.7, 0x6a4a2e, x, 5.8, 4.1, s);
  box(22, 0.7, 7.5, 0x4a3524, 0, 10.2, 1.4, s).rotation.x = 0.12;
  const roofL = box(15, 0.9, 16, 0x3f4a44, -6, 16, -8.5, s); roofL.rotation.z = 0.55; const roofR = box(15, 0.9, 16, 0x3f4a44, 6, 16, -8.5, s); roofR.rotation.z = -0.55;
  box(3.4, 6.6, 0.4, 0x4a3020, 0, 4.9, -1.4, s); for (const x of [-6.5, 6.5]) { box(4, 3.6, 0.3, new THREE.MeshBasicMaterial({ color: 0xffe2a8 }), x, 6.2, -1.42, s); box(4.4, 0.3, 0.5, 0x4a3020, x, 6.2, -1.3, s); box(0.3, 4, 0.5, 0x4a3020, x, 6.2, -1.3, s); }
  for (let i = 0; i < 3; i++) box(6, 0.45, 1.3, 0x9a7248, 0, 1.1 - i * 0.45, 5 + i * 1.3, s);
  box(2.6, 0.4, 2.2, 0x6a4a2e, 5.5, 2.6, 1.2, s); box(2.6, 2.6, 0.4, 0x6a4a2e, 5.5, 3.9, 0.2, s);   // porch bench
  const r = rng(9); for (let i = 0; i < 46; i++) { const a = r() * 6.28, d = 34 + r() * 110, x = Math.cos(a) * d + 20, z = Math.sin(a) * d - 20; if (x < -30) continue; const g = new THREE.Group(); g.position.set(x, 0, z); s.add(g); const h = 9 + r() * 9; box(1.3, h, 1.3, 0x5a3d26, 0, h / 2, 0, g); box(7, 5, 7, 0x2f6b45, 0, h + 1, 0, g); box(5, 4, 5, 0x3a7a50, 0, h + 5, 0, g); }
  const chars = { tony: makeChar('tony'), tonyArmor: makeChar('tonyArmor'), morgan: makeChar('morgan', 'joy'), pepper: makeChar('pepper') };
  Object.values(chars).forEach(c => s.add(c.g));
  return { s, cam, ...chars, lake,
    place(ch, x, y, z, ry = 0) { ch.g.visible = true; return put(ch, x, y, z, ry); },
    pre(T) { for (const c of Object.values(chars)) { c.reset(); c.g.visible = false; } } };
});
