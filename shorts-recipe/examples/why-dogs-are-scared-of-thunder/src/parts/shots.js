// =====================================================================
// SHOTS: "Why Dogs Are Scared Of Thunder"
// =====================================================================
const DS = 0.62, END = C.end;
const GOLD = {}, BLACK = { base: '#2c2522', light: '#463a34', seed: 9, iris: [0xb07a3a, 0x5a3818], snout: 1.05 }, CREAM = { base: '#e6cda4', light: '#f6e9d2', seed: 13, iris: [0xc08848, 0x6a4020], snout: 0.95 };
const blinkAt = (t, seed = 0) => { const P = 3.1 + seed * 0.37, a = (((t + seed * 1.13) % P) + P) % P; return a < 0.16 ? Math.sin(Math.PI * a / 0.16) : 0; };
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
// a two-line speech bubble ("|" starts the accent colour on the second line)
function bubble2(l1, l2, w = 0.6, { fill = '#ffffff', ink = '#2a2420', accent = '#e8572f' } = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 700; const g = c.getContext('2d');
  const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
  g.fillStyle = 'rgba(0,0,0,0.18)'; rr(40, 50, 940, 500, 130); g.fill(); g.fillStyle = fill; rr(30, 30, 940, 500, 130); g.fill(); g.beginPath(); g.moveTo(330, 520); g.lineTo(250, 670); g.lineTo(450, 520); g.closePath(); g.fill();
  g.textBaseline = 'middle'; const F = (fs) => `900 ${fs}px "Arial Black", Arial, sans-serif`;
  let fs = 150; g.font = F(fs); while ((g.measureText(l1).width > 820 || g.measureText(l2.replace('|', '')).width > 820) && fs > 60) { fs -= 6; g.font = F(fs); }
  g.textAlign = 'center'; g.fillStyle = ink; g.fillText(l1, 500, 190);
  const parts = l2.split('|'), w1 = g.measureText(parts[0]).width, w2 = g.measureText(parts[1] || '').width, x0 = 500 - (w1 + w2) / 2; g.textAlign = 'left'; g.fillStyle = ink; g.fillText(parts[0], x0, 370); g.fillStyle = accent; g.fillText(parts[1] || '', x0 + w1, 370);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 700 / 1024), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); m.userData.dofMap = t; return m;
}
// a scared dog: ears pinned, worried brows, tail tucked, trembling; flinch ducks the head (0..1)
function scaredAct(d, t, { look = null, gaze = null, stand = 0, fear = 1, flinch = 0, tremble = 1, lid = 0.0, pant = 0, mouth = 0, blink = 0, maxPitch = 0.9, k = 1, wag = null } = {}) {
  const u = d.userData; u.pose(stand); u.solve().breathe(t, 0.028, 0.9 + 0.8 * fear);
  u.earsSet(-0.75 * fear - 0.45 * flinch, 0.025 * Math.sin(t * 21) * tremble);
  if (look) u.look(look, k, 0, 1.2, maxPitch); u.gaze(gaze || look || u.eyeW().add(V(0, 0, 1)));
  u.head.rotation.x += 0.28 * flinch; u.head.position.y -= 0.09 * flinch; u.head.position.z -= 0.05 * flinch;
  u.head.rotation.z += 0.022 * tremble * Math.sin(t * 2 * Math.PI * 10.7); u.head.rotation.x += 0.012 * tremble * Math.sin(t * 2 * Math.PI * 8.3);
  d.position.x += 0.004 * tremble * Math.sin(t * 2 * Math.PI * 9.1); d.position.z += 0.003 * tremble * Math.cos(t * 2 * Math.PI * 7.7);
  u.lid(clamp(lid + 0.95 * blinkAt(t, blink))).brows(0.85 * fear, 0).mouth(mouth); if (pant) u.pant(pant);
  if (wag) u.wag(t, wag[0], wag[1]); else tuckTail(u, stand, t);
  u.tagSwing(0.05 * Math.sin(t * 13) * tremble);
  return u;
}
// a calm dog (for the other two in the line-up)
function calmAct(d, t, { look = null, perk = 0.2, blink = 0, wag = 0.3, stand = 0 } = {}) {
  const u = d.userData; u.pose(stand); u.solve().breathe(t, 0.02, 0.4); u.earsSet(perk, 0); if (look) u.look(look, 0.8, 0, 1.2, 0.8).gaze(look);
  u.lid(clamp(0.08 + 0.95 * blinkAt(t, blink))).brows(0.1).mouth(0).wag(t, 1.6, wag); return u;
}
function ownerKneel(O, t, x, z, ry, { pet = null, look = null, left = null } = {}) {
  const ou = O.userData; ou.reset(); O.rotation.set(0, ry, 0); O.position.set(x, -0.62, z);
  ou.legs.forEach((L, i) => { L.hip.rotation.set(-0.15, (i ? 1 : -1) * 0.1, 0); L.knee.rotation.x = 1.75; L.ankle.rotation.x = 0.6; });
  ou.breathe(t, 0.3, 0.025); const q = O.quaternion;
  if (pet) { ik2(O, ou.arms[1], pet, V(0.3, -1, 0.3).applyQuaternion(q)); ou.hands[1].curl(0.35); } else ik2(O, ou.arms[1], worldPt(O, V(0.45, 1.5, 0.35)), V(1, -0.6, -0.4).applyQuaternion(q));
  ik2(O, ou.arms[0], left || worldPt(O, V(-0.42, 1.45, 0.4)), V(-1, -0.6, -0.4).applyQuaternion(q)); ou.hands[0].curl(0.4);
  if (look) { const hp = ou.head.getWorldPosition(new THREE.Vector3()), d = O.worldToLocal(look.clone()).sub(O.worldToLocal(hp.clone())); ou.head.rotation.y += clamp(Math.atan2(d.x, d.z), -0.8, 0.8); ou.head.rotation.x += clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 0.5); }
  return ou;
}
function dogIn(sc, o = GOLD) { const d = makeDog(o); d.scale.setScalar(DS); sc.add(d); return d; }
// the owner on the sofa (seated at x), optionally with no head (for your point of view)
function sofaSeat(sc, R, x = 0.55, { pov = false } = {}) {
  const O = makeKid(OWNER); addSmile(O); sc.add(O); if (pov) O.userData.head.visible = false;
  const pose = (t) => { const ou = O.userData; ou.reset(); O.rotation.set(0, Math.PI, 0); O.position.set(x, 0, R.sofa.z - 0.22); seatOn(O, R.sofa.seatY); ou.breathe(t, 0.28, 0.025); return ou; };
  return { O, pose };
}

// ---------------------------------------------------------------------
// 0 + 14) your point of view on the sofa in the storm: the dog pressed against you, ears flat.
// Both shots run on tau = seconds from the loop point, so the last frame and the first frame match.
// ---------------------------------------------------------------------
const POVS = { dog: V(-0.72, 0, 4.7), seat: 0.6 };
function povStorm(s, tauOf, { arm = (tau) => 1 } = {}) {
  const sc = s.scene; const R = stormRoom(sc, { strikes: [-0.95, 0.1, 1.6] }); const d = dogIn(sc), u = d.userData; const own = sofaSeat(sc, R, POVS.seat, { pov: true });
  s.ap = 4; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => {
    const tau = tauOf(t); R.update(tau); const ou = own.pose(tau), f = R.flash(tau); s.exposure = 1.05 + 0.35 * Math.min(1, f);
    const eye = headPt(own.O, V(0, 0.1, 0.1));
    d.position.set(POVS.dog.x, R.sofa.seatY - 0.13, POVS.dog.z - 0.1); d.rotation.set(0, Math.PI - 0.3, 0);
    const fl = Math.max(0, Math.min(1, 1.6 * flashAt(tau - 0.04, [0.1, 1.6]))) * 0.9;
    scaredAct(d, tau, { look: eye, flinch: fl, blink: 2, maxPitch: 1.1, lid: 0.0 });
    // your left arm: resting on your lap, then around the dog (hold = 1)
    const hold = arm(tau), stroke = Math.sin(tau * 2.2) * 0.04;
    const onDog = u.W(V(-0.14, 1.56 + 0.3 * stroke, -0.32 + stroke)), lap = worldPt(own.O, V(0.25, 1.2, 0.55));
    ik2(own.O, ou.arms[0], lv(lap, onDog, hold), V(0.2, 1, 0.3).applyQuaternion(own.O.quaternion)); ou.hands[0].curl(0.45);
    ik2(own.O, ou.arms[1], worldPt(own.O, V(-0.3, 1.2, 0.55)), V(1, -1, 0).applyQuaternion(own.O.quaternion)); ou.hands[1].curl(0.4);
    const cp = eye.clone().add(V(-0.05 - 0.02 * Math.sin(tau * 0.7), 0.3, 0.22)), tgt = u.eyeW().add(V(0.08, -0.5, -0.05));
    shoot(s.cam, cp, tgt, { fov: 58, t: tau, focus: cp.distanceTo(u.eyeW()), hand: 0.6, roll: -5 });
  };
}
shot(0, C.about2, (s) => povStorm(s, t => t));

// 1) about one in three dogs is afraid of loud noises: three dogs in a line; a boom; one ducks -------
shot(C.about2, C.and, (s) => {
  const sc = s.scene; const R = stormRoom(sc, { strikes: [4.42] }); const A = dogIn(sc, CREAM), B = dogIn(sc), K = dogIn(sc, BLACK);
  const ring = ringChart('1 in 3', 0x6aa8ff, 0.2); sc.add(ring); s.ap = 5; s.exposure = 1.05; s.bloom = 0.45;
  const P = [V(-1.38, 0, 0.85), V(-0.57, 0, 2.05), V(-1.8, 0, 1.67)];
  s.update = (t) => {
    R.update(t); const f = R.flash(t);
    const c = E.io(seg(t, C.about2 - 0.2, C.and + 0.3)), cp = lv(V(1.25, 1.75, 3.45), V(1.05, 1.68, 3.25), c);
    [A, B, K].forEach((d, i) => { d.position.copy(P[i]); d.rotation.set(0, 0.91 + [0.2, 0, -0.1][i], 0); });
    const winP = V(-3.7, 2.8, 0.6);
    calmAct(A, t, { look: lv(cp, winP, smooth(4.45, 4.75, t)), perk: 0.25 + 0.3 * smooth(4.45, 4.7, t), blink: 3 });
    calmAct(K, t, { look: lv(cp, winP, smooth(4.52, 4.85, t)), perk: 0.2 + 0.35 * smooth(4.5, 4.75, t), blink: 5, wag: 0.25 });
    const duck = smooth(4.45, 4.62, t);
    scaredAct(B, t, { look: cp, fear: 0.25 + 0.75 * duck, flinch: duck * (0.8 + 0.2 * Math.sin(t * 3)), tremble: duck, blink: 4, lid: 0.02 });
    shoot(s.cam, cp, lv(P[1], lv(P[0], P[2], 0.5), 0.3).add(V(0, 0.95, 0)), { fov: 48, t, focus: cp.distanceTo(B.userData.eyeW()) });
    pin(s.cam, ring, 0.0, 0.43, 1.6); ring.scale.setScalar(Math.max(0.0001, spring(t, C.one - 0.05, 1.8, 6))); ring.userData.set(0.333 * E.out(seg(t, C.one, C.three + 0.4)));
  };
});

// 2) and storms hit them with more than noise: rain down the glass, a fork of lightning, the dog flinches back
shot(C.and, C.some, (s) => {
  const sc = s.scene; const R = stormRoom(sc, { strikes: [5.95, 7.45] }); const d = dogIn(sc), u = d.userData; s.ap = 3; s.exposure = 1.0; s.bloom = 0.55;
  s.update = (t) => {
    R.update(t); const f = R.flash(t);
    d.position.set(-2.65, 0, 1.05); d.rotation.set(0, -Math.PI / 2 + 0.15, 0);
    const fl = Math.min(1, 1.3 * flashAt(t - 0.05, [5.95, 7.45]));
    scaredAct(d, t, { look: V(-4.5, 2.6, 0.5), flinch: fl, blink: 6 });
    const c = E.io(seg(t, C.and - 0.2, C.some + 0.3)), cp = lv(V(-1.7, 0.85, 2.45), V(-1.9, 0.9, 2.2), c);
    shoot(s.cam, cp, lv(V(-3.7, 2.45, 0.75), u.eyeW(), 0.35), { fov: 56, t, focus: cp.distanceTo(u.eyeW()) + 0.2 });
  };
});

// 3) some dogs start pacing before you hear a thing: a quiet evening, the dog paces, you read ----------
shot(C.some, C.they, (s) => {
  const sc = s.scene; const R = stormRoom(sc, { storm: 0 }); const d = dogIn(sc), u = d.userData; const own = sofaSeat(sc, R, 0.55); const book = makeBook(); sc.add(book);
  s.ap = 4; s.exposure = 1.05; s.bloom = 0.4; const speed = 1.0 / DS, t0 = C.some - 0.6;
  // the path: right to left along the rug, a U-turn, back again
  const path = (sd) => { const L = 2.3, r = 0.42, x0 = 1.55, z0 = 3.1; if (sd < L) return { p: V(x0 - sd, 0, z0), h: -Math.PI / 2 }; const a = (sd - L) / r; if (a < Math.PI) return { p: V(x0 - L - r * Math.sin(a), 0, z0 + r - r * Math.cos(a)), h: -Math.PI / 2 + a }; const b = sd - L - Math.PI * r; return { p: V(x0 - L + b, 0, z0 + 2 * r), h: Math.PI / 2 }; };
  s.update = (t) => {
    R.update(t); const ou = own.pose(t); ou.head.rotation.x += 0.42; ou.lid(0.25, t, 3); ou.smile(0.4);
    const bp = worldPt(own.O, V(0, 1.38, 0.62)); book.position.copy(bp); book.quaternion.copy(own.O.quaternion); book.rotateX(-0.95);
    ik2(own.O, ou.arms[0], worldPt(own.O, V(0.27, 1.33, 0.6)), V(1, -1, 0).applyQuaternion(own.O.quaternion)); ik2(own.O, ou.arms[1], worldPt(own.O, V(-0.27, 1.33, 0.6)), V(-1, -1, 0).applyQuaternion(own.O.quaternion)); ou.hands.forEach(h => h.curl(0.5));
    const sd = (t - t0) * speed * DS, P = path(sd); d.position.copy(P.p); d.rotation.set(0, P.h, 0);
    d.position.y = 0.012 * Math.abs(Math.sin(sd / DS * Math.PI / 0.52));
    const wp = V(-3.7, 2.6, 0.6), lookW = smooth(9.3, 9.6, t) * (1 - smooth(10.2, 10.5, t));
    scaredAct(d, t, { stand: 1, look: lv(d.position.clone().add(V(Math.sin(P.h) * 2, 0.5, Math.cos(P.h) * 2)), wp, lookW), fear: 0.55, tremble: 0, pant: 0.45, mouth: 0.22, blink: 7, k: 0.9 });
    walkLegs(u, sd / DS);
    const c = E.io(seg(t, C.some - 0.2, C.they + 0.3)), cp = lv(V(-3.05, 1.3, 0.35), V(-2.85, 1.28, 0.55), c);
    shoot(s.cam, cp, d.position.clone().add(V(0, 0.8, 0)).lerp(V(0.55, 1.6, 4.6), 0.45), { fov: 50, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 4) they may feel the air pressure drop: the barometer's needle swings to STORMY; the dog looks up --
shot(C.they, C.one2, (s) => {
  const sc = s.scene; const R = stormRoom(sc, { storm: 0 }); const d = dogIn(sc), u = d.userData; const bar = barometer(); bar.position.set(-3.66, 3.15, 3.75); bar.rotation.y = Math.PI / 2; sc.add(bar);
  s.ap = 5; s.exposure = 1.08; s.bloom = 0.4; const tDrop = C.feel;
  s.update = (t) => {
    R.update(t); bar.userData.set(E.io(seg(t, tDrop, tDrop + 1.0)) + 0.03 * wob(t, tDrop + 1.0, 3, 5));
    d.position.set(-2.75, 0, 3.7); d.rotation.set(0, Math.PI / 2 - 0.35, 0);
    const up = smooth(C.drop - 0.1, C.drop + 0.3, t), twitch = Math.max(0, wob(t, C.pressure + 0.05, 5, 6)) * 0.6 + Math.max(0, wob(t, C.drop + 0.2, 5, 6)) * 0.5;
    scaredAct(d, t, { look: lv(V(-1.2, 1.1, 4.6), V(-1.4, 1.9, 4.5), up), gaze: lv(V(-1.2, 1.1, 4.6), V(-2.0, 4.5, 4.2), up), fear: 0.4 + 0.3 * up, tremble: 0.25 * up, blink: 8, maxPitch: 0.8 });
    u.earsSet(-0.3 - 0.4 * up + twitch, 0, 0.25 * twitch, -0.15 * twitch);
    const c = t < C.drop - 0.22 ? 0 : 1, drift = E.io(seg(t, C.they - 0.2, C.one2 + 0.3));
    const cp = lv(V(-1.6, 3.1, 3.82), V(-1.35, 1.85, 4.5), c).add(V(0.1 * drift, -0.03 * drift, 0));
    const tgt = lv(bar.position.clone(), u.eyeW(), c);
    shoot(s.cam, cp, tgt, { fov: lerp(40, 44, c), t, focus: cp.distanceTo(tgt) });
  };
});

// 5) one theory: storms also charge the air. The cloud fills with + and −; a bolt jumps to the ground --
shot(C.one2, C.so, (s) => {
  const sc = s.scene; sc.background = gradTex([[0, '#2a3350'], [0.6, '#151a2c'], [1, '#0a0d18']], 0.5, 0.9); sc.environment = MENV;
  sc.add(new THREE.HemisphereLight(0x8090c0, 0x101018, 0.6)); const moon = new THREE.DirectionalLight(0xa8b8ff, 0.9); moon.position.set(-4, 6, 8); sc.add(moon);
  const cloud = stormCloud(5, 12, 2.6, 4); cloud.position.set(0, 6.6, -2); sc.add(cloud);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshLambertMaterial({ color: 0x141a16 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -4); sc.add(ground);
  const hm = new THREE.MeshLambertMaterial({ color: 0x0f1412 }); [[-7, -9, 4], [4, -11, 6], [10, -8, 3.5]].forEach(([x, z, r]) => { const h = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), hm); h.position.set(x, -r * 0.6, z); sc.add(h); });
  // a little house with warm windows
  const hs = new THREE.Group(); hs.position.set(1.6, 0, -1.5); hs.rotation.y = -0.35; sc.add(hs); const wm = new THREE.MeshLambertMaterial({ color: 0x3a3430 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.6), wm); body.position.y = 0.75; hs.add(body);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.35, 0.9, 4, 1), new THREE.MeshLambertMaterial({ color: 0x2a2220 })); roof.position.y = 1.95; roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.85); hs.add(roof);
  [[-0.5, 0.85], [0.5, 0.85]].forEach(([x, y]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), hdr(2.2, 1.4, 0.6)); w.position.set(x, y, 0.81); hs.add(w); });
  const tree = stormTree(4); tree.position.set(-1.6, 0, -1.2); tree.scale.setScalar(0.55); sc.add(tree);
  const plus = [], minus = [], gplus = []; const r = rng(31);
  for (let i = 0; i < 14; i++) { const m = chargeSign(true, 0.62); m.position.set((r() - 0.5) * 5.0, 7.2 + r() * 0.7, 2.0 + r() * 0.4); sc.add(m); plus.push([m, C.theory + i * 0.06]); }
  for (let i = 0; i < 14; i++) { const m = chargeSign(false, 0.62); m.position.set((r() - 0.5) * 5.4, 5.2 + r() * 0.5, 2.2 + r() * 0.4); sc.add(m); minus.push([m, C.storms2 + i * 0.05]); }
  for (let i = 0; i < 10; i++) { const m = chargeSign(true, 0.46); m.position.set(-2.7 + i * 0.6 + (r() - 0.5) * 0.3, 0.35 + r() * 0.3, 1.6 + r() * 0.6); sc.add(m); gplus.push([m, C.charge + i * 0.05]); }
  const bolt = makeBolt(41, V(0.4, 5.3, 0.3), V(-1.55, 1.6, -1.1), { jag: 0.9, width: 0.05, branches: 4 }); sc.add(bolt);
  const inner = new THREE.PointLight(0xb8c8ff, 0, 30, 1.5); inner.position.set(0, 6.4, 0); sc.add(inner);
  const rain = rainBox(sc, V(-7, -0.5, -3), V(7, 6, 2), 700, { seed: 9, op: 0.25 });
  s.ap = 1.2; s.exposure = 1.1; s.bloom = 0.7;
  s.update = (t) => {
    const f = flashAt(t, [C.air2 - 0.05]) + 0.35 * flashAt(t, [C.theory + 0.25, C.also]);
    cloud.userData.mat.emissiveIntensity = 0.05 + 0.55 * f; inner.intensity = 22 * f; bolt.userData.set(flashAt(t, [C.air2 - 0.05])); moon.intensity = 0.9 + 2 * f;
    const sp = (arr) => arr.forEach(([m, t0], i) => { const k = Math.max(0.0001, spring(t, t0, 2.2, 6)); m.scale.setScalar(k * (1 + 0.12 * Math.sin(t * 9 + i))); m.position.x += 0.004 * Math.sin(t * 5 + i * 1.7); });
    sp(plus); sp(minus); sp(gplus); tree.userData.sway(t); rain(t, f);
    const c = E.io(seg(t, C.one2 - 0.2, C.so + 0.3)), cp = lv(V(0.3, 1.1, 10.5), V(0.1, 1.5, 9.6), c);
    shoot(s.cam, cp, V(0, 4.4, -0.5), { fov: 52, t, roll: lerp(3, 0, c) });
  };
});

// 6) so static builds up in their fur: the fur lifts; tiny sparks crawl over it -----------------------
function staticPts(d) {
  const u = d.userData, r = rng(77), P = [];
  for (let i = 0; i < 60; i++) { let v; do { v = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); } while (v.lengthSq() > 1 || v.lengthSq() < 0.05); v.normalize(); if (v.y < -0.15) v.y = -v.y; P.push([i % 3, v]); }
  return (i, ph) => {
    const [part, v0] = P[(i * 7 + ph * 3) % P.length]; d.updateMatrixWorld(true);
    if (part === 0) { const p = u.head.localToWorld(v0.clone().multiplyScalar(0.36).add(V(0, 0.06, 0.05))); return { p, n: p.clone().sub(u.head.getWorldPosition(new THREE.Vector3())).normalize() }; }
    const c = part === 1 ? u.cfg.neck : u.cfg.torso, ctr = V(c[0], c[1], c[2]), p = d.localToWorld(ctr.clone().add(V(v0.x * c[3], v0.y * c[4], v0.z * c[5]).multiplyScalar(1.05)));
    return { p, n: p.clone().sub(d.localToWorld(ctr.clone())).normalize() };
  };
}
shot(C.so, C.and2, (s) => {
  const sc = s.scene; const R = stormRoom(sc, { strikes: [16.35] }); const d = dogIn(sc), u = d.userData; const sparks = sparkField(sc, 44, 5); const pts = staticPts(d);
  s.ap = 4; s.exposure = 1.0; s.bloom = 0.6;
  s.update = (t) => {
    R.update(t); d.position.set(-0.6, 0, 2.3); d.rotation.set(0, 0.55, 0);
    const k = smooth(C.static - 0.1, C.up + 0.35, t);
    scaredAct(d, t, { look: V(1.3, 1.7, 4.6), fear: 0.6 + 0.3 * k, tremble: 0.4 + 0.5 * k, blink: 9 });
    furPuff(d, k);
    const c = E.io(seg(t, C.so - 0.2, C.and2 + 0.3)), cp = lv(V(1.05, 1.5, 4.2), V(0.8, 1.45, 3.9), c);
    shoot(s.cam, cp, u.eyeW().add(V(-0.1, -0.32, -0.15)), { fov: 44, t, focus: cp.distanceTo(u.eyeW()) });
    sparks(t, pts, s.cam, 0.3 + 0.7 * k, 0.075);
  };
});

// 7) and gives them tiny shocks: nose to the steel bowl, ZAP, the dog jerks back ---------------------
shot(C.and2, C.that, (s) => {
  const sc = s.scene; const R = stormRoom(sc, { strikes: [] }); const d = dogIn(sc), u = d.userData; const bowl = steelBowl(0.42); bowl.position.set(0.6, 0, 3.15); sc.add(bowl);
  const arc = sparkArc(sc); const sparks = sparkField(sc, 30, 8); const pts = staticPts(d); s.ap = 3; s.exposure = 1.05; s.bloom = 0.65;
  const tZ = C.shocks - 0.02;
  s.update = (t) => {
    R.update(t); d.position.set(0.6, 0, 1.95); d.rotation.set(0, 0, 0);
    const reach = E.io(seg(t, C.and2 - 0.1, tZ)) * (1 - E.out(seg(t, tZ + 0.03, tZ + 0.22))), jerk = Math.max(0, wob(t, tZ + 0.03, 2.2, 5)) + smooth(tZ, tZ + 0.1, t) * 0.4;
    const rim = V(0.6, 0.2, 3.15 - 0.4);
    const u2 = scaredAct(d, t, { stand: 0.6, look: lv(V(0.6, 1.6, 5), rim, 0.9), fear: 0.35 + 0.65 * smooth(tZ, tZ + 0.1, t), flinch: jerk, tremble: 0.3, blink: 11, maxPitch: 1.25, lid: 0.0 });
    u.head.position.z += 0.24 * reach; u.head.position.y -= 0.28 * reach; u.head.rotation.x += 0.35 * reach;
    furPuff(d, 0.6 * (1 - smooth(tZ + 0.1, tZ + 0.6, t)));
    const z = flashAt(t, [tZ]); arc(u.noseW(), rim.clone().add(V(0.03, 0.02, 0)), z, Math.floor(t * 30));
    const c = E.io(seg(t, C.and2 - 0.2, C.that + 0.3)), cp = lv(V(1.75, 0.6, 3.95), V(1.6, 0.58, 3.8), c);
    shoot(s.cam, cp, lv(u.noseW(), rim, 0.25).add(V(0, 0.32, -0.1)), { fov: 48, t, focus: cp.distanceTo(u.noseW()) });
    sparks(t, pts, s.cam, 0.35 * (1 - smooth(tZ, tZ + 0.2, t)), 0.04);
  };
});

// 8) that might be why some dogs hide in the bathtub ---------------------------------------------------
const TUBDOG = V(0.35, 0.2, -0.15);
function bathDog(s, strikes) { const R = bathroom(s.scene, { strikes }); const d = dogIn(s.scene), u = d.userData; return { R, d, u }; }
shot(C.that, C.right, (s) => {
  const { R, d, u } = bathDog(s, [20.05]); s.ap = 4; s.exposure = 1.08; s.bloom = 0.5;
  s.update = (t) => {
    R.update(t); d.position.copy(TUBDOG); d.rotation.set(0, 0.25, 0);
    const c = E.io(seg(t, C.that - 0.2, C.right + 0.3)), cp = lv(V(0.95, 1.55, 3.3), V(0.8, 1.5, 2.75), c);
    const fl = Math.min(1, 1.2 * flashAt(t - 0.05, [20.05]));
    scaredAct(d, t, { look: cp, flinch: 0.35 + 0.65 * fl, blink: 12, maxPitch: 1.0 });
    shoot(s.cam, cp, u.eyeW().add(V(0, -0.15, 0)), { fov: 44, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 9) right next to the pipes: x-ray of the tub; the charge drains down the pipe ----------------------
shot(C.right, C.and3, (s) => {
  const { R, d, u } = bathDog(s, []); const sc = s.scene; const tub = R.tub, td = tub.userData;
  const xm = xrayMat(new THREE.Color(0.6, 0.85, 1.0)); td.parts.forEach(p => p.material = xm);
  sc.traverse(o => { if (o.isMesh && Math.abs(o.position.z - 1.3) < 1e-6 && Math.abs(o.position.y - 0.02) < 1e-6) o.visible = false; });
  R.floor.material = new THREE.MeshStandardMaterial({ map: R.floor.material.map, roughness: 0.3, transparent: true, opacity: 0.22, depthWrite: false });
  const under = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 6), new THREE.MeshLambertMaterial({ color: 0x1a1612, side: THREE.BackSide })); under.position.set(0, -2.02, 0); sc.add(under);
  const dp = td.drain.getWorldPosition(new THREE.Vector3());
  const pipeP = [dp.clone(), dp.clone().add(V(0, -0.45, 0)), dp.clone().add(V(0.02, -0.75, 0)), dp.clone().add(V(0.3, -0.85, 0)), dp.clone().add(V(0.5, -0.65, 0)), dp.clone().add(V(0.55, -0.45, 0)), dp.clone().add(V(0.9, -0.45, 0)), dp.clone().add(V(1.2, -0.7, 0)), dp.clone().add(V(1.25, -3.5, 0))];
  const curve = new THREE.CatmullRomCurve3(pipeP, false, 'centripetal');
  const pipe = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.075, 18, false), new THREE.MeshPhysicalMaterial({ color: 0xc8ced4, metalness: 1, roughness: 0.25, envMapIntensity: 1.5 })); sc.add(pipe);
  const pts = staticPts(d); const n = 70, gt = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(230,240,255,1)'); gr.addColorStop(0.3, 'rgba(120,175,255,0.6)'); gr.addColorStop(1, 'rgba(60,110,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  const dots = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), n); dots.frustumCulled = false; sc.add(dots); const o = new THREE.Object3D();
  s.ap = 1.5; s.exposure = 1.1; s.bloom = 0.6;
  s.update = (t) => {
    R.update(t); d.position.copy(TUBDOG); d.rotation.set(0, 0.25, 0);
    const drain = smooth(C.right, C.pipes + 0.4, t);
    scaredAct(d, t, { look: V(0.8, 1.6, 3.5), fear: 0.9 - 0.4 * drain, tremble: 0.8 - 0.5 * drain, blink: 13 }); furPuff(d, 0.5 * (1 - drain));
    for (let i = 0; i < n; i++) {
      const st = C.right - 0.2 + (i / n) * 1.3, a = clamp((t - st) / 0.9); const P0 = pts(i, i).p;
      let p; if (a <= 0) p = P0; else if (a < 0.35) p = P0.clone().lerp(dp, E.in(a / 0.35)); else p = curve.getPointAt(clamp((a - 0.35) / 0.65));
      o.position.copy(p).add(V(0, 0, 0.09)); o.quaternion.copy(s.cam.quaternion); o.scale.setScalar(a >= 1 ? 0.0001 : 0.07 + 0.03 * h3(i, 1, 2)); o.updateMatrix(); dots.setMatrixAt(i, o.matrix);
    }
    dots.instanceMatrix.needsUpdate = true;
    const c = E.io(seg(t, C.right - 0.2, C.and3 + 0.3)), cp = lv(V(0.05, 1.45, 4.5), V(-0.2, 0.6, 4.1), c);
    shoot(s.cam, cp, lv(V(-0.15, 0.85, -0.15), V(-0.45, -0.45, -0.15), c), { fov: 56, t });
  };
});

// 10) and comforting them won't make the fear worse: you kneel by the tub and stroke the dog ----------
function comfortScene(s, strikes) {
  const { R, d, u } = bathDog(s, strikes); const O = makeKid(OWNER); addSmile(O); s.scene.add(O); return { R, d, u, O };
}
function comfortPose(R, d, u, O, t, calm) {
  R.update(t); d.position.copy(TUBDOG); d.rotation.set(0, 0.1, 0);
  const stroke = Math.sin((t - C.and3) * 3.4) * 0.05, head = u.W(V(0, 2.25 + stroke * 0.3, 0.1 + stroke));
  const ou = ownerKneel(O, t, 0.3, 1.25, Math.PI, { pet: head, look: u.eyeW() }); ou.smile(0.55 + 0.3 * calm); ou.lid(0.18, t, 4);
  const eyeO = headPt(O, V(0, 0.05, 0.3));
  const um = scaredAct(d, t, { look: eyeO, fear: 1 - 0.65 * calm, tremble: 1 - 0.75 * calm, lid: 0.35 * calm, blink: 14 });
  um.head.rotation.z += 0.12 * calm; return ou;
}
shot(C.and3, C.vets, (s) => {
  const { R, d, u, O } = comfortScene(s, []); s.ap = 4.5; s.exposure = 1.08; s.bloom = 0.45;
  s.update = (t) => {
    const calm = smooth(C.and3 + 0.3, C.worse + 0.4, t); comfortPose(R, d, u, O, t, calm);
    const c = E.io(seg(t, C.and3 - 0.2, C.vets + 0.3)), cp = lv(V(1.85, 3.55, 2.45), V(1.7, 3.45, 2.25), c);
    shoot(s.cam, cp, u.eyeW().add(V(-0.1, -0.2, 0)), { fov: 44, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 11) vets call that a myth: "Comforting makes it WORSE" pops ---------------------------------------
shot(C.vets, C.so2, (s) => {
  const { R, d, u, O } = comfortScene(s, []); const sc = s.scene; const bub = bubble2('Comforting', 'makes it |WORSE', 0.62); sc.add(bub);
  const myth = textPlane('MYTH', 0.62, '#e8402f', '#ffffff'); sc.add(myth);
  const shards = [], r = rng(12), sm = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, depthWrite: false, toneMapped: false });
  for (let i = 0; i < 26; i++) { const g = new THREE.BufferGeometry(); const a = r() * 6.28; g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.05 + r() * 0.05, 0.01, 0, 0.02, 0.05 + r() * 0.05, 0], 3)); const m = new THREE.Mesh(g, sm); m.userData.v = V(Math.cos(a) * (0.5 + r() * 0.6), Math.sin(a) * (0.4 + r() * 0.6) + 0.2, 0); m.userData.home = V((r() - 0.5) * 0.9, (r() - 0.5) * 0.35, 0); m.userData.spin = (r() - 0.5) * 18; sc.add(m); shards.push(m); }
  s.ap = 4.5; s.exposure = 1.08; s.bloom = 0.45; const tPop = C.myth + 0.02;
  s.update = (t) => {
    comfortPose(R, d, u, O, t, 1);
    const c = E.io(seg(t, C.vets - 0.2, C.so2 + 0.3)), cp = lv(V(1.7, 3.45, 2.25), V(1.62, 3.4, 2.12), c);
    shoot(s.cam, cp, u.eyeW().add(V(-0.1, 0.12, 0)), { fov: 46, t, focus: cp.distanceTo(u.eyeW()) });
    const swell = 1 + 0.08 * smooth(tPop - 0.25, tPop, t);
    bub.visible = t < tPop; pin(s.cam, bub, 0.0, 0.245, 1.6); bub.scale.setScalar(Math.max(0.0001, spring(t, C.vets + 0.02, 2.0, 6)) * swell);
    s.cam.updateMatrixWorld(true); const a = t - tPop;
    shards.forEach(m => { m.visible = a > 0 && a < 0.55; if (!m.visible) return; const v = m.userData.v, h = m.userData.home; const lp = V(h.x + v.x * a * 1.4, h.y + v.y * a * 1.4 - 1.2 * a * a, 0.02); m.position.copy(s.cam.localToWorld(V(0, 0.245, -1.6).add(lp.multiplyScalar(0.55)))); m.quaternion.copy(s.cam.quaternion); m.rotateZ(m.userData.spin * a); sm.opacity = 1 - smooth(0.3, 0.55, a); });
    pin(s.cam, myth, 0.0, 0.24, 1.55); myth.scale.setScalar(Math.max(0.0001, spring(t, tPop + 0.06, 2.2, 6))); myth.rotation.z += -0.12;
  };
});

// 12) so when the sky rumbles: from outside in the rain, lightning lights the house; inside, a warm room
shot(C.so2, C.and4, (s) => {
  const sc = s.scene; const R = stormRoom(sc, { strikes: [28.3, 28.95] }); const d = dogIn(sc); const own = sofaSeat(sc, R, 0.55);
  // the outside of the wall around the window: painted boards
  const sid = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#5a6b78'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, i * 32 + 28, w, 4); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, i * 32, w, 6); } noiseFill(g, w, h, 5, 14); }, { rep: [3, 3] });
  const sm = new THREE.MeshStandardMaterial({ map: sid, bumpMap: sid, bumpScale: 1, roughness: 0.6 });
  const panel = (z0, z1, y0, y1) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), sm); p.position.set(-4.01, (y0 + y1) / 2, (z0 + z1) / 2); p.rotation.y = -Math.PI / 2; p.receiveShadow = true; sc.add(p); };
  panel(-4, -1.3, 0, 8); panel(2.9, 7, 0, 8); panel(-1.3, 2.9, 0, 1.45); panel(-1.3, 2.9, 4.75, 8);
  box(sc, 0.4, 0.1, 4.6, -4.15, 1.4, 0.8, new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.5 }), 0.02);
  const near = rainBox(sc, V(-6.8, -0.5, -1.5), V(-4.3, 6, 3.5), 500, { seed: 21, op: 0.4, len: 0.5 }); R.flashScale = 0.45;
  s.ap = 2.5; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => {
    R.update(t); const f = R.flash(t); near(t, f); own.pose(t).lid(0.2, t, 5);
    d.position.set(-0.75, 0, 3.55); d.rotation.set(0, 0.15, 0); scaredAct(d, t, { stand: 1, look: headPt(own.O, V(0, 0, 0.3)), blink: 15 });
    const c = E.io(seg(t, C.so2 - 0.2, C.and4 + 0.3)), cp = lv(V(-8.7, 2.4, -0.4), V(-8.2, 2.5, 0.0), c);
    shoot(s.cam, cp, V(-2.6, 2.45, 2.0), { fov: 44, t, roll: 1.5 });
  };
});

// 13) and they squeeze in next to you: the dog hops onto the sofa and wedges in beside you ------------
shot(C.and4, C.hold, (s) => {
  const sc = s.scene; const R = stormRoom(sc, { strikes: [29.45] }); const d = dogIn(sc), u = d.userData; const own = sofaSeat(sc, R, POVS.seat);
  s.ap = 4; s.exposure = 1.05; s.bloom = 0.5;
  const tJ = C.they2 - 0.05, tLand = tJ + 0.42;
  s.update = (t) => {
    R.update(t); const ou = own.pose(t); ou.smile(0.5); ou.lid(0.15, t, 6);
    const face = headPt(own.O, V(0, 0, 0.3));
    const j = E.io(seg(t, tJ, tLand)), sit = smooth(tLand + 0.05, tLand + 0.45, t), turn = E.io(seg(t, tLand - 0.1, tLand + 0.5)), wedge = E.io(seg(t, tLand + 0.3, C.hold));
    const p0 = V(-0.75, 0, 3.55), p1 = V(POVS.dog.x - 0.12 + 0.12 * wedge, R.sofa.seatY - 0.13, POVS.dog.z - 0.1);
    d.position.copy(p0).lerp(p1, j); d.position.y += Math.sin(Math.PI * j) * 0.55;
    d.rotation.set(0, lerp(0.15, Math.PI - 0.3, turn), 0);
    const pre = smooth(tJ - 0.25, tJ, t) * (1 - j);
    scaredAct(d, t, { stand: 1 - sit, look: face, fear: 1, tremble: 0.6 + 0.4 * sit, blink: 16, maxPitch: 1.1 });
    d.position.y -= 0.08 * pre; u.torso.rotation.z += 0.12 * wedge;
    if (j > 0 && j < 1) { u.legs.forEach((L, i) => { const tuck = Math.sin(Math.PI * j); u.paw(i, L.T.clone().add(V(0, 0.25 * tuck, (L.front ? 0.15 : -0.1) * tuck)), 0); }); u.solve(); }
    // your arm lifts to make room, then comes down around the dog
    const armK = smooth(tLand, tLand + 0.4, t);
    ik2(own.O, ou.arms[0], lv(worldPt(own.O, V(0.25, 1.2, 0.55)), u.W(V(-0.22, 1.42, -0.22)), armK * wedge), V(0.2, 1, 0.3).applyQuaternion(own.O.quaternion)); ou.hands[0].curl(0.45);
    ik2(own.O, ou.arms[1], worldPt(own.O, V(-0.3, 1.2, 0.55)), V(1, -1, 0).applyQuaternion(own.O.quaternion)); ou.hands[1].curl(0.4);
    const c = E.io(seg(t, C.and4 - 0.2, C.hold + 0.3)), cp = lv(V(-0.75, 2.35, 0.8), V(-0.65, 2.3, 1.1), c);
    shoot(s.cam, cp, V(-0.35, 1.8, 4.5), { fov: 52, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 14) hold them close, because… → back to your point of view (loop)
shot(C.hold, END, (s) => povStorm(s, t => t - END, { arm: (tau) => E.io(seg(tau, -1.05, -0.3)) }));

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
