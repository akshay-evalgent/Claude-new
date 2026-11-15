// Shared set 'sea': the open ocean with the Titanic, iceberg, lifeboats, the door, swimmers and debris.
//
// SHIP GEOMETRY (ship-local units; a character is 5.25 tall): bow tip at z = +120, stern at z = -120, beam 26, waterline y = 0.
//   deck heights: forecastle (bow, z 70..120) y = 14 | well decks y = 12 | boat deck (z -58..56, |x| < 9.5) y = 21 | poop deck (stern, z -120..-92) y = 14
//   bow rail tip ~ (0, 14, 117); stern rail ~ (0, 14, -117); crow's nest floor (0, 27, 84); bridge front (0, 21, 58); four funnels at z = 40, 14, -12, -38
//   S.ship is the whole ship; S.fore (z >= 0) and S.aft (z < 0) are its halves, both pivoting at the keel midships, so S.aft.rotation.x breaks the ship in two.
//   Pitch: S.ship.rotation.x > 0 puts the BOW DOWN (stern up). Lower the ship with S.ship.position.y.
// API (everything is reset every frame by pre(); call S.post(T) at the END of each shot):
//   S.mode('day' | 'sunset' | 'night' | 'dawn')      sky, sea, sun and stars
//   S.C(name)                                         cached character (lib CAST name), hidden + reset each frame
//   S.board(ch, 'fore' | 'aft', x, y, z, ry)          stand a character on the ship (moves and tilts with that half)
//   S.put(ch, x, y, z, ry)                            place a character in world space (water, boats, door)
//   S.vest(ch)                                        show a white lifejacket on that character this frame
//   S.sink(k)                                         poses the whole sinking, k = 0 afloat .. 1 gone (see the method); use it for every sinking shot so the ship stays consistent
//   S.lights = 0..1 (ship's lights), S.smoke = 0..1 (funnel smoke), S.speed = 0..1 (bow foam), S.deckBoats = true/false
//   S.berg (Group; .visible, .position), S.door (Group; .visible), S.boats[0..5] (lifeboats in the water; .visible, .position, .rotation.y; seats at local y = 1.2)
//   S.swimmers = 0..1, S.debris = 0..1  (people and wreckage in the water around the origin, kept distant and non-graphic)
import { THREE, SET, mkScene, put, clamp, ease, lerp, hash, rng, M, tex, box, makeChar, CAST, makeDoor, makeVest } from './engine.js';

SET('sea', () => {
  const { s, cam } = mkScene(0x9fc8ea, [200, 850], 0xfff4e0, 2.4, [0xffffff, 0x6a7f96, 1.3], [60, 80, 40], 150);
  s.userData.bloom = 0.4; const sun = s.userData.sun; sun.shadow.camera.far = 400; cam.far = 1600; cam.updateProjectionMatrix();
  const hemi = s.children.find(o => o.isHemisphereLight);
  const seaM = new THREE.MeshPhongMaterial({ color: 0x2f6a94, shininess: 90, specular: 0x88aacc });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), seaM); sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true; s.add(sea);
  const WN = 420, waveM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, fog: true }), waves = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.05, 1), waveM, WN); waves.frustumCulled = false; s.add(waves);
  const SN = 1400, sp = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) { const a = hash(i) * 6.283, e = 0.06 + hash(i + 0.3) * 1.4, R = 1200; sp.set([Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R], i * 3); }
  const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 3.2, sizeAttenuation: false, fog: false })); stars.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3)); stars.frustumCulled = false; s.add(stars);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(70, 32), new THREE.MeshBasicMaterial({ color: 0xffe0a0, fog: false })); disc.position.set(-300, 60, 1100); disc.rotation.y = Math.PI; s.add(disc);

  // ---------------- the ship ----------------
  const ship = new THREE.Group(), fore = new THREE.Group(), aft = new THREE.Group(); ship.add(fore, aft); s.add(ship);
  const BLK = M(0x15161a), RED = M(0x8a2a22), WHT = M(0xf2efe6), DECK = M(0xc2a070), BUFF = M(0xd9a03c);
  const lightM = new THREE.MeshBasicMaterial({ color: 0xffe2a0 });
  const dbox = (g, w, h, d, x, y, z, side) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [side, side, DECK, side, side, side]); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const ports = [];
  for (const [g, sg] of [[fore, 1], [aft, -1]]) {
    dbox(g, 26, 12, 88, 0, 6, sg * 44, BLK); box(26.3, 5, 88, RED, 0, -1.5, sg * 44, g);
    const tw = sg > 0 ? [23, 19, 14.5, 10, 6, 2.6] : [24, 21, 16, 9];
    tw.forEach((w, i) => { const L = sg > 0 ? 5.4 : 7, z = sg * (88 + L / 2 + i * L); dbox(g, w, 14, L + 0.05, 0, 7, z, BLK); box(w + 0.3, 5, L, RED, 0, -1.5, z, g); });
    dbox(g, 26, 2, sg > 0 ? 18 : 0.01, 0, 13, sg > 0 ? 79 : -88, BLK);                                   // forecastle step
    if (sg < 0) dbox(g, 24.5, 2, 4, 0, 13, -90, BLK);
    dbox(g, 22, 6, sg > 0 ? 62 : 66, 0, 15, sg * (sg > 0 ? 31 : 33), WHT); dbox(g, 19, 3, sg > 0 ? 56 : 58, 0, 19.5, sg * (sg > 0 ? 28 : 29), WHT);
    if (sg > 0) { dbox(g, 23, 3.2, 5, 0, 22.6, 58, WHT); box(21, 1.2, 0.2, 0x2a3a4a, 0, 23, 60.6, g); }
    for (const fz of sg > 0 ? [40, 14] : [-12, -38]) { const f = new THREE.Group(); f.position.set(0, 21, fz); f.rotation.x = -0.13; g.add(f); const c1 = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 13, 14), BUFF); c1.position.y = 6.5; const c2 = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.45, 4, 14), BLK); c2.position.y = 15; c1.castShadow = c2.castShadow = true; f.add(c1, c2); }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 34, 6), M(0x8a6a3a)); mast.position.set(0, sg > 0 ? 31 : 29, sg * 86); mast.rotation.x = -0.1; g.add(mast);
    if (sg > 0) { box(3, 0.3, 3, 0x4a3a28, 0, 26.8, 84.4, g); for (const [x, z, w, d] of [[0, 85.9, 3, 0.2], [-1.4, 84.4, 0.2, 3], [1.4, 84.4, 0.2, 3]]) box(w, 2.4, d, 0x4a3a28, x, 28, z, g); }
    else { const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 5), WHT); fp.position.set(0, 18.5, -118.5); fp.rotation.x = -0.25; g.add(fp); }
    // lit portholes + windows
    const P = []; for (const sx of [-1, 1]) { for (let z = 4; z < 104; z += 4) for (const y of [4.6, 8.4]) { const w = z < 88 ? 13.05 : 13.05 - (z - 88) * (sg > 0 ? 0.36 : 0.42); if (w > 2) P.push([sx * w, y, sg * z, 0.7]); } for (let z = 3; z < (sg > 0 ? 60 : 64); z += 3) { P.push([sx * 11.05, 15.2, sg * z, 1.2]); if (z < 54) P.push([sx * 9.55, 19.6, sg * z, 1.0]); } }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1, 1), lightM, P.length), dm = new THREE.Object3D(); P.forEach((p, i) => { dm.position.set(p[0], p[1], p[2]); dm.scale.set(1, p[3], p[3] * 1.3); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }); g.add(im); ports.push(im);
  }
  // railings
  const rail = (g, x1, z1, x2, z2, y) => { const L = Math.hypot(x2 - x1, z2 - z1), a = Math.atan2(x2 - x1, z2 - z1); for (const h of [1.1, 2.2]) { const r = box(0.14, 0.14, L, 0xf2efe6, (x1 + x2) / 2, y + h, (z1 + z2) / 2, g); r.rotation.y = a; r.castShadow = false; } for (let i = 0; i <= L; i += 2.4) box(0.14, 2.2, 0.14, 0xf2efe6, lerp(x1, x2, i / L), y + 1.1, lerp(z1, z2, i / L), g).castShadow = false; };
  rail(fore, -11.4, 70, -11.4, 88, 14); rail(fore, 11.4, 70, 11.4, 88, 14); rail(fore, -11.4, 88, -1.2, 119.4, 14); rail(fore, 11.4, 88, 1.2, 119.4, 14); rail(fore, -1.2, 119.4, 1.2, 119.4, 14);
  rail(aft, -12, -92, -4, -118.6, 14); rail(aft, 12, -92, 4, -118.6, 14); rail(aft, -4, -118.6, 4, -118.6, 14); rail(aft, -12, -92, -12, -66, 12); rail(aft, 12, -92, 12, -66, 12);
  for (const sx of [-1, 1]) { rail(fore, sx * 9.4, 0, sx * 9.4, 56, 21); rail(aft, sx * 9.4, -58, sx * 9.4, 0, 21); }
  const deckBoats = []; for (const sx of [-1, 1]) for (const z of [48, 38, 28, 18, -18, -28, -38, -48]) { const b = new THREE.Group(); b.position.set(sx * 8.1, 22.3, z); (z > 0 ? fore : aft).add(b); box(2.0, 1.3, 7.4, 0xf2efe6, 0, 0, 0, b); box(1.6, 0.2, 6.8, 0xc9b48a, 0, 0.7, 0, b); deckBoats.push(b); }
  const glow = [44, 0, -44].map(z => { const p = new THREE.PointLight(0xffd9a0, 0, 150); p.position.set(0, 30, z); ship.add(p); return p; });
  const SMN = 70, smoke = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x4a4a52, transparent: true, opacity: 0.75 }), SMN); smoke.frustumCulled = false; ship.add(smoke);
  const foam = [-1, 1].map(sx => { const f = box(2.4, 0.5, 26, new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.9 }), sx * 5, 0.3, 108, ship); f.rotation.y = -sx * 0.32; f.castShadow = false; return f; });

  // ---------------- iceberg, boats, door, swimmers, debris ----------------
  const berg = new THREE.Group(); s.add(berg); const ice = new THREE.MeshPhongMaterial({ color: 0xdfeef8, shininess: 60, flatShading: true }); const r = rng(5);
  for (let i = 0; i < 11; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(10 + r() * 16, 24 + r() * 44, 5), ice); m.position.set((r() - 0.5) * 44, 8 + r() * 10, (r() - 0.5) * 34); m.rotation.set((r() - 0.5) * 0.4, r() * 6, (r() - 0.5) * 0.4); m.castShadow = true; berg.add(m); } box(70, 6, 50, ice, 0, 1, 0, berg);
  const boats = [0, 1, 2, 3, 4, 5].map(() => { const b = new THREE.Group(); s.add(b); box(3.6, 1.6, 10, 0xf2efe6, 0, 0.6, 0, b); box(3.0, 0.2, 9.2, 0xc9b48a, 0, 1.1, 0, b); box(2.2, 1.2, 1.6, 0xf2efe6, 0, 0.7, 5.4, b); box(2.2, 1.2, 1.6, 0xf2efe6, 0, 0.7, -5.4, b); for (const z of [-3, 0, 3]) box(3.2, 0.25, 0.8, 0x8a6238, 0, 1.3, z, b); const l = box(0.3, 0.4, 0.3, new THREE.MeshBasicMaterial({ color: 0xffe6a0 }), 0, 2.4, 5.2, b); l.castShadow = false; return b; });
  const door = makeDoor(); s.add(door);
  const SWN = 320, swH = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), M(0x3a3038), SWN), swV = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 0.9, 1.1), M(0xe8e4d8), SWN); swH.frustumCulled = swV.frustumCulled = false; s.add(swH, swV);
  const DBN = 90, deb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0x6a4a2e), DBN); deb.frustumCulled = false; s.add(deb);
  const dm = new THREE.Object3D(), chars = {}, vests = new Map();
  const MODES = { day: [0x9fc8ea, 0x2f6a94, 0xfff4e0, 2.4, 1.3, [60, 80, 40]], sunset: [0xf2a868, 0x7a5a52, 0xffb060, 2.3, 1.0, [-80, 26, 160]], night: [0x060913, 0x0a1826, 0x9fb8e8, 1.0, 0.62, [40, 90, -30]], dawn: [0xd9bcc4, 0x587a96, 0xffd0b0, 1.7, 1.1, [120, 30, 60]] };
  const S = {
    s, cam, ship, fore, aft, berg, door, boats, chars, lights: 1, smoke: 0, speed: 0, swimmers: 0, debris: 0, deckBoats: true, _mode: '',
    mode(m) { if (this._mode === m) return; this._mode = m; const [bg, sc, sunC, sunI, hemiI, sp2] = MODES[m]; s.background.setHex(bg); s.fog.color.setHex(bg); seaM.color.setHex(sc); sun.color.setHex(sunC); sun.intensity = sunI; hemi.intensity = hemiI; sun.position.set(...sp2); stars.visible = m === 'night'; disc.visible = m === 'sunset'; s.fog.near = m === 'night' ? 120 : 200; s.fog.far = m === 'night' ? 620 : 850; waveM.opacity = m === 'night' ? 0.045 : 0.16; s.userData.bloom = m === 'night' ? 0.3 : 0.4; },
    C(name) { if (!chars[name]) { chars[name] = makeChar(name); s.add(chars[name].g); } return chars[name]; },
    board(ch, half, x, y, z, ry = 0) { (half === 'aft' ? aft : fore).add(ch.g); ch.g.visible = true; return put(ch, x, y, z, ry); },
    put(ch, x, y, z, ry = 0) { if (ch.g.parent !== s) s.add(ch.g); ch.g.visible = true; return put(ch, x, y, z, ry); },
    vest(ch) { let v = vests.get(ch); if (!v) { v = makeVest(); ch.body.add(v); vests.set(ch, v); } v.visible = true; return v; },
    // the whole sinking in one parameter, k = 0 (afloat) .. 1 (gone): bow settles (0-0.45), stern rises (0.45-0.7), the ship breaks and the stern falls back (0.7-0.8), stern stands vertical (0.8-0.9) and slides under (0.9-1)
    sink(k) {
      const a = ease(k / 0.45), b = ease((k - 0.45) / 0.25), c = ease((k - 0.7) / 0.1), d = ease((k - 0.8) / 0.1), d2 = ease((k - 0.9) / 0.1);
      ship.rotation.x = a * 0.2 + b * 0.5; ship.position.y = -a * 12 - b * 16 - d2 * 150;
      aft.rotation.x = -c * 0.62 + d * 1.25; aft.position.y = c * 20 - d * 6; fore.rotation.x = c * 0.25 + d * 0.3; fore.position.y = -c * 14 - d * 60; this.smoke = 0;
    },
    pre(T) {
      this.mode('day'); this.lights = 1; this.smoke = 0; this.speed = 0; this.swimmers = 0; this.debris = 0; this.deckBoats = true;
      ship.position.set(0, 0, 0); ship.rotation.set(0, 0, 0); fore.rotation.set(0, 0, 0); fore.position.set(0, 0, 0); aft.rotation.set(0, 0, 0); aft.position.set(0, 0, 0); ship.visible = true;
      berg.visible = false; berg.position.set(60, 0, 300); door.visible = false; door.position.set(0, 0.25, 0); door.rotation.set(0, 0, 0); boats.forEach(b => { b.visible = false; b.rotation.set(0, 0, 0); });
      for (const c of Object.values(chars)) { c.reset(); c.g.visible = false; c.g.scale.setScalar(CAST[c.name].scale || 1); c.g.rotation.set(0, 0, 0); } vests.forEach(v => v.visible = false);
    },
    post(T) {
      const L = this.lights; lightM.color.setRGB(1.0 * L + 0.04, 0.89 * L + 0.04, 0.63 * L + 0.05); glow.forEach(p => p.intensity = this._mode === 'night' ? 420 * L : this._mode === 'sunset' ? 150 * L : 0);
      deckBoats.forEach(b => b.visible = this.deckBoats); foam.forEach(f => { f.visible = this.speed > 0.05; f.scale.z = 26 * (0.6 + this.speed * 0.5 + Math.sin(T * 5) * 0.05); });
      const cx = cam.position.x, cz = cam.position.z;
      for (let i = 0; i < WN; i++) { const x = cx + (hash(i) - 0.5) * 700, z = cz + (hash(i + 0.5) - 0.5) * 700 + ((T * 3 + hash(i + 0.2) * 40) % 40) - 20; dm.position.set(x, 0.06, z); dm.rotation.set(0, 0, 0); dm.scale.set(8 + hash(i + 0.7) * 26, 1, 0.7 + hash(i + 0.9) * 1.2); dm.updateMatrix(); waves.setMatrixAt(i, dm.matrix); } waves.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < SMN; i++) { const f = i % 3, k = (T * 0.12 + hash(i)) % 1, on = this.smoke > hash(i + 0.4) * 0.9; dm.position.set((hash(i + 0.2) - 0.5) * 4 * (1 + k * 3), 40 + k * 46, [40, 14, -12][f] - 3 - k * 90); dm.rotation.set(T + i, i, 0); dm.scale.setScalar(on ? 2.5 + k * 11 : 0.0001); dm.updateMatrix(); smoke.setMatrixAt(i, dm.matrix); } smoke.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < SWN; i++) { const a = hash(i) * 6.283, d = 24 + hash(i + 0.3) * 170, on = hash(i + 0.6) < this.swimmers, y = on ? Math.sin(T * 1.4 + i) * 0.18 : -30; dm.rotation.set(0, i, 0); dm.scale.setScalar(1); dm.position.set(Math.cos(a) * d, 0.5 + y, Math.sin(a) * d); dm.updateMatrix(); swH.setMatrixAt(i, dm.matrix); dm.position.y = -0.25 + y; dm.updateMatrix(); swV.setMatrixAt(i, dm.matrix); } swH.instanceMatrix.needsUpdate = swV.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < DBN; i++) { const a = hash(i + 7) * 6.283, d = 10 + hash(i + 7.3) * 130, on = hash(i + 7.6) < this.debris; dm.position.set(Math.cos(a) * d, on ? 0.1 + Math.sin(T * 1.2 + i) * 0.12 : -30, Math.sin(a) * d); dm.rotation.set(0, i, Math.sin(T + i) * 0.06); dm.scale.set(1 + hash(i + 1) * 4, 0.3, 0.6 + hash(i + 2) * 2); dm.updateMatrix(); deb.setMatrixAt(i, dm.matrix); } deb.instanceMatrix.needsUpdate = true;
    },
  };
  return S;
});
