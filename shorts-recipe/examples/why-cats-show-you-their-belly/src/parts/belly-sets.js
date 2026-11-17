// =====================================================================
// SETS: "Why Cats Show You Their Belly". A fluffy white belly for the tabby, a belly-up roll,
// an x-ray with the ribs and the soft organs, the grab-and-kick, and the little signs.
// =====================================================================
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const blinkAt = (t, seed = 0) => { const P = 3.4 + seed * 0.37, a = (((t + seed * 1.13) % P) + P) % P; return a < 0.16 ? Math.sin(Math.PI * a / 0.16) : 0; };
const STRANGER = { shirt: 0x3f6fa8, pants: 0x2f2f36, hair: 0x2a2018, skin: 0xc98a62, style: 'short', s: 1.0, hs: 1.0 };

// a soft, cream belly on the underside of the torso (rides on the torso, so it follows every pose)
function addBelly(cat, xray = false) {
  const u = cat.userData;
  const b = new THREE.Mesh(new THREE.SphereGeometry(1, 44, 30), xray ? XM() : WHITE_FUR()); b.position.set(0, 0.05, 0.6); b.scale.set(0.8, 0.84, 0.46);
  if (!xray) { b.castShadow = b.receiveShadow = true; addFur(b, 0.17, { comb: V(0, -0.6, 0.6).normalize(), freq: 190 }); }
  u.torso.add(b); u.belly = b; return cat;
}
function mkCat(sc, { xray = false, s = CS } = {}) { const c = makeCat2(xray ? { xray: true } : TABBY); c.scale.setScalar(s); c.rotation.order = 'YXZ'; sc.add(c); addBelly(c, xray); if (!xray) addClaws(c); else c.userData.claws = () => c.userData; return c; }

// lying with the body rolled by `roll` about its own length (0 = crouched on its feet, -PI/2 = on its side, -PI = belly up).
// P is the floor point under the middle of the body; ry the heading. Legs relax into the air as it goes over.
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function catRoll(c, t, { P, ry = 0, roll = -Math.PI, look = null, lid = 0.3, legs = 1, tilt = 0.55, tailSw = 0.25, pawUp = 0 } = {}) {
  const u = c.userData, S = c.scale.x; c.rotation.order = 'YXZ'; c.rotation.set(0, ry, roll);
  _q.setFromEuler(_e.set(0, ry, roll, 'YXZ')); const off = V(0, 0.5, -0.05).multiplyScalar(S).applyQuaternion(_q);
  c.position.set(P.x, 0.5 * S, P.z).sub(off);
  u.pose({ crouch: 1 });
  const k = clamp(Math.abs(roll) / Math.PI), lk = smooth(0.25, 0.95, k) * legs;
  u.legs.forEach((L, i) => {
    const j = L.up.position, rest = L.T.clone();
    const sway = 0.03 * Math.sin(t * 1.3 + i * 1.7);
    const air = L.front ? V(L.sx * 0.24, -0.12 - 0.12 * pawUp + sway, 0.64 + 0.1 * pawUp) : V(L.sx * 0.52, -0.08 + sway, -0.32);
    L.T.copy(rest.lerp(air, lk)); L.pitch = (L.front ? 1.25 : 0.6) * lk;
  });
  u.solve().breathe(t, 0.025).whisk(0.15);
  if (look) u.look(look, 0.9, tilt * k, 1.2, 0.85).gaze(look);
  u.lid(clamp(lid + 0.9 * blinkAt(t, 2)), 0.1);
  // the tail lies along the floor behind; its tip flicks
  const tb = (a, b) => a.clone().lerp(b, k), s = Math.sin(t * 3.1) * tailSw;
  u.tail([V(0, 0.52, -1.1), tb(V(0.2, 0.35, -1.4), V(0.18, 0.82, -1.4)), tb(V(0.55, 0.25, -1.55), V(0.45, 0.95, -1.62)), tb(V(0.9, 0.2, -1.45), V(0.82, 1.0, -1.72 + s * 0.4)), tb(V(1.15, 0.2, -1.2), V(1.12 + s, 0.98, -1.6 + s))]);
  return u;
}

// ---------- x-ray insides: a spine, ribs around the chest only, and the soft organs in the belly ----------
function insides(cat) {
  const g = new THREE.Group(); cat.add(g);
  const bone = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.95, 1.0), transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  // spine along the top of the body (crouch pose, cat-local)
  for (let i = 0; i <= 16; i++) { const z = lerp(0.75, -0.95, i / 16), y = 0.95 - 0.08 * Math.pow((z + 0.1) / 0.85, 2); const v = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), bone); v.position.set(0, y, z); v.scale.set(1, 0.8, 1.2); g.add(v); }
  // ribs: rings round the chest, open a little at the bottom (the breastbone end)
  const ribs = [];
  for (let i = 0; i < 9; i++) { const z = lerp(0.62, 0.12, i / 8), r = 0.4 - 0.03 * Math.abs(i - 3) / 3; const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 48, Math.PI * 1.7), bone.clone()); m.position.set(0, 0.55, z); m.rotation.z = Math.PI / 2 + Math.PI * 0.15; m.scale.set(1, 1.05, 1); g.add(m); ribs.push(m); }
  // organs: glowing, soft
  const O = (col, op = 0.95) => new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.95), transparent: true, opacity: op, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, depthTest: false });
  const org = [];
  const add = (mesh, p, s, t0) => { mesh.position.copy(p); mesh.scale.copy(s); mesh.userData.s0 = s.clone(); mesh.userData.t0 = t0; g.add(mesh); org.push(mesh); return mesh; };
  add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), O(new THREE.Color(1.3, 0.45, 0.6))), V(0, 0.55, 0.42), V(0.16, 0.15, 0.13), 0);          // heart
  [-1, 1].forEach(sx => add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), O(new THREE.Color(1.0, 0.55, 0.62), 0.45)), V(sx * 0.18, 0.62, 0.38), V(0.15, 0.22, 0.25), 0));  // lungs
  add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), O(new THREE.Color(0.9, 0.25, 0.25))), V(0, 0.42, 0.06), V(0.3, 0.12, 0.16), 1);           // liver
  add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), O(new THREE.Color(1.3, 0.75, 0.55))), V(0.1, 0.3, -0.1), V(0.17, 0.12, 0.15), 2);          // stomach
  const gut = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 7, r = 0.12 + 0.06 * Math.sin(i * 0.37); gut.push(V(Math.cos(a) * r, 0.28 + 0.05 * Math.sin(a * 0.5), -0.3 - i / 60 * 0.38 + Math.sin(a) * r * 0.5)); }
  add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gut), 200, 0.035, 10, false), O(new THREE.Color(1.25, 0.7, 0.75))), V(0, 0, 0), V(1, 1, 1), 3);   // intestines
  [-1, 1].forEach(sx => add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), O(new THREE.Color(0.95, 0.35, 0.4))), V(sx * 0.16, 0.66, -0.32), V(0.05, 0.07, 0.09), 3));   // kidneys
  // the belly's outline: a dashed oval that flashes when "no ribs" is said
  const dash = new THREE.Group(); for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 4, 8), O(new THREE.Color(1.6, 0.45, 0.3), 1)); d.position.set(Math.cos(a) * 0.34, 0.06, -0.2 + Math.sin(a) * 0.5); d.rotation.set(Math.PI / 2, 0, 0); d.rotation.y = -a; dash.add(d); } g.add(dash);
  g.traverse(o => { o.userData.noDof = true; if (o.isMesh) o.renderOrder = 6; });
  // reveal: organs pop in by group (k = 0..4); ribs (0..1); dash (0..1)
  g.userData.set = (k, rk, dk, t = 0) => {
    org.forEach(m => { const a = clamp(k - m.userData.t0); m.visible = a > 0.01; m.scale.copy(m.userData.s0).multiplyScalar(Math.max(1e-4, backE(a)) * (1 + 0.03 * Math.sin(t * 6 + m.userData.t0))); });
    ribs.forEach((m, i) => { m.material.opacity = 0.2 + 0.55 * rk; m.material.color.setRGB(0.55 + 0.35 * rk, 0.7 + 0.3 * rk, 0.95 + 0.15 * rk); });
    dash.visible = dk > 0.01; dash.children.forEach((d, i) => d.material.opacity = dk * (0.6 + 0.4 * Math.sin(t * 9 + i)));
  };
  g.userData.set(4, 0.6, 0); return g;
}

// ---------- a red alert ring that pulses out from the cat ----------
function alertRing() {
  const g = new THREE.Group(); const ms = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.3, 0.2), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })); g.add(m); return m; });
  g.traverse(o => o.userData.noDof = true);
  g.userData.set = (t, t0, on) => ms.forEach((m, i) => { const a = ((t - t0) * 1.4 + i / 3) % 1; m.visible = t > t0 && on > 0.01; m.scale.setScalar(0.3 + a * 1.2); m.material.opacity = on * (1 - a) * 0.9; });
  return g;
}
// ---------- the sign: TRAP, crossed out ----------
function trapSign() {
  const g = new THREE.Group();
  const card = textPlane('TRAP', 0.8, '#ffffff', '#b8261c'); card.material.depthTest = false; card.renderOrder = 12; g.add(card);
  const bg = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.3, 0.02, 4, 0.06), new THREE.MeshBasicMaterial({ color: 0xd8382c, toneMapped: false, depthTest: false })); bg.position.z = -0.02; bg.renderOrder = 11; g.add(bg);
  const x = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, depthTest: false })); x.renderOrder = 13; x.rotation.z = -0.32; g.add(x);
  const x2 = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.1, 0.01), new THREE.MeshBasicMaterial({ color: 0x1a1a1a, toneMapped: false, depthTest: false })); x2.renderOrder = 12.5; x2.rotation.z = -0.32; x2.position.z = 0.005; g.add(x2);
  g.traverse(o => o.userData.noDof = true);
  g.userData.set = (k, cross) => { g.scale.setScalar(Math.max(1e-4, k)); x.scale.x = x2.scale.x = Math.max(1e-4, cross); x.position.x = x2.position.x = -0.475 * (1 - cross); };
  g.userData.set(0, 0); return g;
}
// ---------- four counting rings for the four paws ----------
function pawRings(sc) {
  const R = [1, 2, 3, 4].map(n => { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.9, 0.3), transparent: true, depthTest: false, toneMapped: false })); ring.renderOrder = 12; g.add(ring); const num = textPlane(String(n), 0.32, '#ffd27a', '#3a1a08'); num.material.depthTest = false; num.renderOrder = 13; num.position.set(0.17, 0.12, 0); g.add(num); g.traverse(o => o.userData.noDof = true); sc.add(g); return g; });
  return (cam, pts, times, t) => R.forEach((g, i) => { const a = t - times[i]; g.visible = a > 0; if (!g.visible) return; g.position.copy(pts[i]); g.quaternion.copy(cam.quaternion); g.scale.setScalar(Math.max(1e-4, spring(t, times[i], 2.2, 6))); });
}
// ---------- tufts of fur that fly off during the kicks ----------
function furTufts(sc, n = 40, seed = 6) {
  const m = new THREE.MeshStandardMaterial({ color: 0xf2d6b0, roughness: 1, transparent: true, opacity: 0.9 });
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), m, n); im.frustumCulled = false; sc.add(im);
  const r = rng(seed), D = []; for (let i = 0; i < n; i++) D.push([r(), r(), r(), r(), r()]); const o = new THREE.Object3D();
  return (t, t0, t1, src) => { D.forEach((d, i) => { const te = t0 + d[0] * (t1 - t0), a = t - te; if (a < 0 || a > 1.6) { o.scale.setScalar(1e-4); o.position.set(0, -9, 0); } else { o.position.copy(src).add(V((d[1] - 0.5) * 0.9 * a + 0.08 * Math.sin(a * 5 + i), 0.5 * a - 0.35 * a * a, (d[2] - 0.5) * 0.9 * a)); o.rotation.set(a * 3 + i, a * 2, 0); o.scale.set(0.02 + 0.02 * d[3], 0.008, 0.012 + 0.01 * d[4]); } o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.instanceMatrix.needsUpdate = true; };
}
// ---------- you, kneeling on the floor beside the cat ----------
function ownerKneel(O, t, x, z, ry, { pet = null, look = null, left = null, petPole = null } = {}) {
  const ou = O.userData; ou.reset(); O.rotation.set(0, ry, 0); O.position.set(x, -0.62, z);
  ou.legs.forEach((L, i) => { L.hip.rotation.set(-0.15, (i ? 1 : -1) * 0.1, 0); L.knee.rotation.x = 1.75; L.ankle.rotation.x = 0.6; });
  ou.breathe(t, 0.3, 0.025); const q = O.quaternion;
  if (pet) { ik2(O, ou.arms[1], pet, (petPole || V(0.3, -1, 0.3)).clone().applyQuaternion(q)); ou.hands[1].curl(0.35); } else ik2(O, ou.arms[1], worldPt(O, V(0.45, 1.5, 0.35)), V(1, -0.6, -0.4).applyQuaternion(q));
  ik2(O, ou.arms[0], left || worldPt(O, V(-0.42, 1.45, 0.4)), V(-1, -0.6, -0.4).applyQuaternion(q)); ou.hands[0].curl(0.4);
  if (look) { const hp = ou.head.getWorldPosition(new THREE.Vector3()), d = O.worldToLocal(look.clone()).sub(O.worldToLocal(hp.clone())); ou.head.rotation.y += clamp(Math.atan2(d.x, d.z), -0.8, 0.8); ou.head.rotation.x += clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 0.5); }
  return ou;
}
const forearm = (O, k) => worldPt(O.userData.arms[1].el, V(0, -0.5 * k, 0));
