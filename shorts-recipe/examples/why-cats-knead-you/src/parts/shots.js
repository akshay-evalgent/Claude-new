// =====================================================================
// SHOTS: "Why Cats Knead You"
// =====================================================================
const END = C.end, RATE = 1.35;
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const blinkAt = (t, seed = 0) => { const P = 3.4 + seed * 0.37, a = (((t + seed * 1.13) % P) + P) % P; return a < 0.16 ? Math.sin(Math.PI * a / 0.16) : 0; };
function mkCat(sc, o = TABBY, s = CS) { const c = makeCat2(o); c.scale.setScalar(s); c.rotation.order = 'YXZ'; sc.add(c); addClaws(c); return c; }
// one kneading cat standing on a surface at height y: content eyes, purr, tail up
function kneadAct(c, t, { look = null, k = 1, lid = 0.4, rate = RATE, claw = 0, stand = 1, age = 1, slowBlink = null } = {}) {
  const u = c.userData; u.age(age); u.pose({ stand, sit: 1 - stand }); kneadPaws(u, t, { rate, k }); u.solve().breathe(t, 0.02).pupil(0.42).ears(0.05, 0.05 * Math.sin(t * 1.3), -0.05 * Math.sin(t * 1.1)).whisk(0.3);
  if (look) u.look(look, 0.9, 0.06 * Math.sin(t * 0.9), 1.1, 0.8).gaze(look);
  const sb = slowBlink != null ? Math.max(0, 1 - Math.abs(t - slowBlink) / 0.35) : 0;
  u.lid(clamp(lid + 0.55 * E.io(sb) + 0.6 * blinkAt(t, 3) * (1 - sb)), 0.12); u.claws(claw);
  u.tail([V(0, 1.12, -1.02), V(0, 1.42, -1.2), V(0.05 * Math.sin(t * 1.7), 1.86, -1.26), V(0.1 * Math.sin(t * 1.7 - 1), 2.2, -1.1), V(0.28 + 0.06 * Math.sin(t * 1.7 - 1.5), 2.32, -0.88)]);
  return u;
}
// you on the sofa with a folded blanket on your lap (optionally headless, for your point of view)
function lapSet(s, { pov = false } = {}) {
  const sc = s.scene; const R = livingRoom(sc); const O = makeKid(OWNER); addSmile(O); sc.add(O);
  if (pov) { O.userData.head.visible = false; O.userData.torso.visible = false; O.children.forEach(m => { if (m.isMesh && (m.material === O.userData.skinM || m.material === O.userData.torso.material)) m.visible = false; }); }
  const X = R.sofa.x, bl = lapBlanket(sc, V(X, R.sofa.seatY + 0.33, R.sofa.z - 0.85), 1.3, 1.5, 0.26);
  const pose = (t) => { const ou = O.userData; ou.reset(); O.rotation.set(0, Math.PI, 0); O.position.set(X, 0, R.sofa.z - 0.15); seatOn(O, R.sofa.seatY); ou.breathe(t, 0.28, 0.02);
    ik2(O, ou.arms[0], V(X - 0.62, bl.userData.top - 0.02, R.sofa.z - 0.55), V(1, -1, 0)); ik2(O, ou.arms[1], V(X + 0.62, bl.userData.top - 0.02, R.sofa.z - 0.55), V(-1, -1, 0)); ou.hands.forEach(h => h.curl(0.45)); return ou; };
  return { R, O, bl, X, top: bl.userData.top, pose };
}
const LAPCAT = (L) => V(L.X + 0.02, L.top - 0.03 * CS, L.R.sofa.z - 1.25);

// ---------------------------------------------------------------------
// 0 + 15) your point of view: the cat on your lap, kneading the blanket, purring, looking up at you.
// Both shots run on tau = seconds from the loop point, so the last frame and the first frame match.
// ---------------------------------------------------------------------
function povLap(s, tauOf) {
  const L = lapSet(s, { pov: true }); const c = mkCat(s.scene), u = c.userData; s.ap = 6; s.exposure = 1.12; s.bloom = 0.45;
  const purr = purrRings(s.scene, 3, 0xffe2b0);
  s.update = (t) => {
    const tau = tauOf(t); L.R.update(tau); const ou = L.pose(tau);
    const eye = headPt(L.O, V(0, 0.1, 0.1)), cp = eye.clone().add(V(0.02 * Math.sin(tau * 0.6), 0.32, 0.5));
    c.position.copy(LAPCAT(L)); c.rotation.set(0, 0.08, 0);
    kneadAct(c, tau, { look: cp, lid: 0.42, slowBlink: -0.55 });
    purr(tau, u.W(V(0, 1.0, 0.2)), 0.35, 0.55, cp);
    shoot(s.cam, cp, u.eyeW().add(V(0, -0.3, -0.05)), { fov: 54, t: tau, focus: cp.distanceTo(u.eyeW()), hand: 0.6 });
  };
}
shot(0, C.its, (s) => povLap(s, t => t));

// 1) it's doing one of the first things it ever learned: on your lap, the cat shrinks back into a kitten
shot(C.its, C.newborn, (s) => {
  const L = lapSet(s); const c = mkCat(s.scene), u = c.userData; s.ap = 5; s.exposure = 1.12; s.bloom = 0.45;
  const g0 = C.first - 0.15, g1 = C.learned + 0.25;
  s.update = (t) => {
    L.R.update(t); L.pose(t).smile(0.6);
    const g = seg(t, g0, g1), a = 1 - E.io(g), sp = 1 + (t > g1 ? 0.07 * Math.exp(-(t - g1) * 6) * Math.sin((t - g1) * 22) : 0);
    c.scale.setScalar(lerp(CS, KS * 1.15, backE(g)) * sp); c.position.copy(LAPCAT(L)).add(V(0, 0, 0.12 * E.io(g))); c.rotation.set(0, 0.55, 0);
    kneadAct(c, t, { look: headPt(L.O, V(0, 0, 0.3)), age: a, lid: lerp(0.25, 0.42, a) });
    const cc = E.io(seg(t, C.its - 0.2, C.newborn + 0.3)), cp = lv(V(2.75, 2.35, 2.55), V(2.45, 2.2, 2.8), cc);
    shoot(s.cam, cp, lv(u.eyeW(), c.position.clone().add(V(0, 0.2, 0)), 0.45), { fov: 44, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 2-3, 12-13) the nursery: the mother on her side, kittens nursing and kneading -----------------------
const KITS = [{ o: TABBY, p: V(0.45, 0, 0.2), ry: -0.3 }, { o: { base: '#f0c08a', stripe: '#c98848', seed: 11 }, p: V(-0.08, 0, 0.3), ry: 0.0 }, { o: { base: '#9a8f88', stripe: '#5a524e', seed: 5 }, p: V(-0.6, 0, 0.18), ry: 0.3 }];
function nurserySet(s, { day = false } = {}) {
  const sc = s.scene; const R = nursery(sc, { day }); const mom = mkCat(sc, MOM, CS * 1.05); const kits = KITS.map(k => { const c = mkCat(sc, k.o, KS); return c; });
  const act = (t, { claw = 0, puff = 0, momLid = 0.6 } = {}) => {
    momLying(mom, t, { pos: V(0.0, R.bedY + 0.3, -0.25), ry: Math.PI / 2, look: V(0, 0.5, 2.5), lid: momLid }); fluff(mom, puff);
    kits.forEach((c, i) => { const K = KITS[i]; c.position.copy(K.p).add(V(0, R.bedY, 0)); c.rotation.set(0, Math.PI + K.ry, 0);
      const u = c.userData; u.age(0); u.pose({ crouch: 1 }); kneadPaws(u, t + i * 0.37, { rate: 1.9, amp: 0.09, k: 1 }); u.solve().breathe(t + i, 0.03).pupil(0.7).ears(0.15, 0, 0).whisk(0.1);
      u.head.position.z += 0.06; u.head.rotation.x += 0.25; u.lid(0.62 + 0.05 * Math.sin(t * 3 + i), 0.2); u.claws(claw); u.tailRest(t + i, 0.15, i % 2 ? 1 : -1);
      u.head.rotation.x += 0.03 * Math.sin(t * 9 + i * 2); });
  };
  return { R, mom, kits, act };
}
shot(C.newborn, C.and, (s) => {
  const N = nurserySet(s); s.ap = 5; s.exposure = 1.3; s.bloom = 0.5;
  s.update = (t) => {
    N.act(t);
    const c = E.io(seg(t, C.newborn - 0.2, C.and + 0.3)), cp = lv(V(0.35, 1.65, 3.15), V(0.25, 1.45, 2.75), c);
    shoot(s.cam, cp, V(0.0, 0.45, 0.25), { fov: 44, t, focus: cp.distanceTo(V(0, 0.45, 0.45)) });
  };
});
// 3) and the pressing helps the milk flow: close on the paws; a milk bottle fills with every press
shot(C.and, C.most, (s) => {
  const N = nurserySet(s); const bottle = milkBottle(); s.scene.add(bottle); s.ap = 3; s.exposure = 1.3; s.bloom = 0.5;
  const P = pressTimes(C.and, C.most, 1.9);
  s.update = (t) => {
    N.act(t); const k0 = N.kits[0], u = k0.userData;
    const c = E.io(seg(t, C.and - 0.2, C.most + 0.3)), tgt = V(0.1, 0.33, 0.05), cp = lv(V(1.1, 0.95, 1.55), V(0.95, 0.85, 1.35), c);
    shoot(s.cam, cp, tgt, { fov: 40, t, focus: cp.distanceTo(u.eyeW()) });
    const n = P.filter(x => x <= t).length; pin(s.cam, bottle, 0.07, 0.085, 0.6); bottle.scale.setScalar(Math.max(0.0001, spring(t, C.pressing - 0.1, 2, 6)) * 0.22); bottle.rotateY(0.3 * Math.sin(t)); bottle.userData.set(Math.min(1, n / P.length * 1.05));
  };
});

// 4) most cats never grow out of it: the kitten grows up in one bounce, still kneading ----------------
shot(C.most, C.when, (s) => {
  const R = nursery(s.scene, { day: true }); const c = mkCat(s.scene), u = c.userData; s.ap = 4; s.exposure = 1.0; s.bloom = 0.45;
  const g0 = C.grow - 0.05, g1 = C.it2 + 0.3;
  s.update = (t) => {
    const g = seg(t, g0, g1), a = E.io(g), sp = 1 + (t > g1 ? 0.06 * Math.exp(-(t - g1) * 6) * Math.sin((t - g1) * 22) : 0);
    c.scale.setScalar(lerp(KS, CS, backE(g)) * sp); c.position.set(0.1, R.bedY, 0.15); c.rotation.set(0, -0.2, 0);
    const cp = lv(V(0.5, 1.35, 4.4), V(0.4, 1.35, 4.05), E.io(seg(t, C.most - 0.2, C.when + 0.3)));
    kneadAct(c, t, { look: cp, age: a, lid: lerp(0.3, 0.4, a) });
    shoot(s.cam, cp, V(0.05, lerp(0.45, 0.85, a), 0.1), { fov: 36, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 5-7) safe and warm: in the sunbeam on the rug; the kitten move comes back; purring, then drool ------
const SUN = V(1.85, 0, 2.15);
function sunSet(s) { const sc = s.scene; const R = livingRoom(sc); const bl = lapBlanket(sc, V(SUN.x, 0.07, SUN.z), 1.25, 1.0, 0.14); const c = mkCat(sc), u = c.userData; c.position.set(SUN.x, bl.userData.top - 0.03 * CS, SUN.z); c.rotation.set(0, -0.9, 0); return { R, bl, c, u }; }
shot(C.when, C.the4, (s) => {
  const Z = sunSet(s); s.ap = 4; s.exposure = 1.05; s.bloom = 0.55;
  s.update = (t) => {
    Z.R.update(t); const c = E.io(seg(t, C.when - 0.2, C.the4 + 0.3)), cp = lv(V(0.3, 0.95, 3.55), V(0.55, 0.9, 3.25), c);
    kneadAct(Z.c, t, { look: cp, lid: 0.45, slowBlink: C.safe + 0.15, k: 0.8 });
    shoot(s.cam, cp, Z.u.eyeW().add(V(0, -0.2, 0)), { fov: 40, t, focus: cp.distanceTo(Z.u.eyeW()) });
  };
});
shot(C.the4, C.often, (s) => {
  const Z = sunSet(s); const g = makeCat2({ ...TABBY, xray: true }); g.scale.setScalar(KS * 1.25); g.rotation.order = 'YXZ'; s.scene.add(g); s.ap = 3; s.exposure = 1.05; s.bloom = 0.6;
  s.update = (t) => {
    Z.R.update(t); kneadAct(Z.c, t, { look: V(0, 1, 5), lid: 0.5 });
    // the ghost of the kitten it was, kneading in step beside it
    g.position.copy(Z.c.position).add(V(-0.5, 0, 0.36)); g.rotation.set(0, -0.9, 0); const gu = g.userData; gu.age(0); gu.pose({ stand: 1 }); kneadPaws(gu, t, { rate: RATE }); gu.solve().lid(0.45, 0.1); gu.look(V(0, 1, 5), 0.8).gaze(V(0, 1, 5));
    g.visible = t > C.kitten - 0.05; g.scale.setScalar(KS * 1.25 * Math.max(0.0001, spring(t, C.kitten - 0.05, 1.8, 7)));
    const pw = Z.u.pawW(0).lerp(Z.u.pawW(1), 0.5), c = E.io(seg(t, C.the4 - 0.2, C.often + 0.3)), side = V(Math.cos(-0.9), 0, -Math.sin(-0.9)), cp = pw.clone().addScaledVector(side, lerp(-3.5, -3.2, c)).add(V(0, 0.55, 0));
    shoot(s.cam, cp, pw.clone().add(V(-0.2, 0.3, 0.15)), { fov: 40, t, focus: cp.distanceTo(pw) });
  };
});
shot(C.often, C.they3, (s) => {
  const Z = sunSet(s); const purr = purrRings(s.scene, 3, 0xffe2b0); const drop = dropMesh(0.022); s.scene.add(drop); s.ap = 3; s.exposure = 1.05; s.bloom = 0.55;
  const tD = C.drool - 0.1;
  s.update = (t) => {
    Z.R.update(t); const c = E.io(seg(t, C.often - 0.2, C.they3 + 0.3)), cp = Z.u.eyeW().add(lv(V(1.05, -0.02, 1.4), V(0.85, -0.05, 1.15), c));
    kneadAct(Z.c, t, { look: cp, lid: 0.82, k: 0.7 }); Z.u.head.rotation.x -= 0.12;
    purr(t, Z.u.W(V(0, 1.55, 0.6)), smooth(C.purring - 0.1, C.purring + 0.2, t), 0.6, cp);
    // drool: a drop swells at the chin and falls
    const chin = Z.u.jaw.localToWorld(V(0, -0.2, 0.25)), grow = smooth(tD - 0.6, tD, t), fall = Math.max(0, t - tD - 0.1);
    drop.visible = t > tD - 0.6; drop.position.copy(chin).add(V(0, -0.012 * grow - 4.9 * fall * fall, 0)); drop.scale.set(0.6 + 0.4 * grow, 0.7 + 0.7 * grow + 3 * Math.min(fall, 0.05), 0.6 + 0.4 * grow);
    shoot(s.cam, cp, Z.u.eyeW().add(V(0, -0.18, 0)), { fov: 38, t, focus: cp.distanceTo(Z.u.eyeW()) });
  };
});

// 8) scent glands between their toes: the big paw spreads its toes; the glands glow ------------------
shot(C.they3, C.so, (s) => {
  const sc = s.scene; const R = livingRoom(sc); const P = heroPaw(); P.position.set(0.3, 1.9, 2.6); P.rotation.set(0.25, -0.35, 0); sc.add(P); s.ap = 3.5; s.exposure = 1.1; s.bloom = 0.6;
  const key = new THREE.PointLight(0xfff0e0, 10, 6, 1.5); key.position.set(1.4, 2.6, 4.0); sc.add(key);
  s.update = (t) => {
    R.update(t); const sp = E.io(seg(t, C.between - 0.25, C.toes + 0.1)), gl = smooth(C.glands - 0.1, C.glands + 0.35, t);
    P.position.y = 1.9 + 0.03 * Math.sin(t * 1.4);
    const c = E.io(seg(t, C.they3 - 0.2, C.so + 0.3)), cp = lv(V(0.85, 2.3, 5.6), V(0.75, 2.2, 5.2), c), tgt = P.position.clone().add(V(0, 0.2, 0.2));
    shoot(s.cam, cp, tgt, { fov: 40, t, focus: cp.distanceTo(tgt) });
    P.userData.set(t, { spread: sp, gland: gl, claw: 0, cam: s.cam });
  };
});

// 9) every press leaves a little of their smell on you: glowing prints on the blanket (your view) -----
shot(C.so, C.youve, (s) => {
  const L = lapSet(s, { pov: true }); const c = mkCat(s.scene), u = c.userData; const prints = scentPrints(s.scene, 18); s.ap = 5; s.exposure = 1.12; s.bloom = 0.5;
  const P = pressTimes(C.so - 1.5, C.youve, RATE);
  s.update = (t) => {
    L.R.update(t); L.pose(t);
    const eye = headPt(L.O, V(0, 0.1, 0.1)), cp = eye.clone().add(V(-0.05, 0.32, 0.5));
    // the cat steps back a little as it kneads, so the prints spread out
    const back = 0.32 * E.io(seg(t, C.so - 0.3, C.youve));
    c.position.copy(LAPCAT(L)).add(V(0, 0, -back)); c.rotation.set(0, 0.08, 0); kneadAct(c, t, { look: cp, lid: 0.4 });
    // where each press landed (paw position at the press time, on the blanket top)
    const marks = P.map((tp, i) => { const fl = i % 2 === 0, side = fl ? -1 : 1, b = 0.32 * E.io(seg(tp, C.so - 0.3, C.youve)); return { p: V(L.X + 0.02 + side * 0.1, L.top + 0.005, L.R.sofa.z - 1.25 - b + 0.24), t0: tp, rot: 0.08 + side * 0.15 }; }).filter(m => m.t0 > C.so - 0.2);
    prints(t, marks);
    shoot(s.cam, cp, u.eyeW().add(V(0, -0.62, 0.05)), { fov: 58, t, focus: cp.distanceTo(u.eyeW()) + 0.15 });
  };
});

// 10) you've been claimed: the cat sits back, pleased; CLAIMED stamps in ---------------------------
shot(C.youve, C.and4, (s) => {
  const L = lapSet(s, { pov: true }); const c = mkCat(s.scene), u = c.userData; const stamp = claimedStamp(0.62); s.scene.add(stamp); const prints = scentPrints(s.scene, 10); s.ap = 5; s.exposure = 1.12; s.bloom = 0.5;
  s.update = (t) => {
    L.R.update(t); L.pose(t); const eye = headPt(L.O, V(0, 0.1, 0.1)), cp = eye.clone().add(V(-0.05, 0.32, 0.5));
    c.position.copy(LAPCAT(L)).add(V(0, 0, -0.32)); c.rotation.set(0, 0.08, 0);
    const sit = smooth(C.youve - 0.1, C.youve + 0.35, t); const uu = kneadAct(c, t, { look: cp, lid: 0.3, k: 1 - sit, stand: 1 - sit });
    uu.head.rotation.x -= 0.12 * sit; if (t > C.claimed + 0.25) uu.lid(clamp(0.3 + 0.55 * Math.max(0, 1 - Math.abs(t - (C.claimed + 0.55)) / 0.3)), 0.1);
    prints(t, [[-1, 0.0], [1, 0.12], [-1, 0.24], [1, 0.33], [-1, 0.4], [1, 0.5]].map(([sd, b], i) => ({ p: V(L.X + 0.02 + sd * 0.1, L.top + 0.005, L.R.sofa.z - 1.25 - b + 0.24), t0: -1, rot: 0.08 + sd * 0.15 })));
    shoot(s.cam, cp, u.eyeW().add(V(0, -0.5, 0.05)), { fov: 58, t, focus: cp.distanceTo(u.eyeW()) });
    pin(s.cam, stamp, 0.0, 0.12, 1.3); stamp.scale.setScalar(Math.max(0.0001, 1.6 - 0.6 * Math.min(1, spring(t, C.claimed - 0.08, 2.4, 8)))); stamp.visible = t > C.claimed - 0.08; stamp.material.opacity = Math.min(1, (t - C.claimed + 0.08) * 12);
  };
});

// 11) and the claws? Close on a paw pressing the blanket: the claws come out ------------------------
shot(C.and4, C.kittens2, (s) => {
  const L = lapSet(s); const c = mkCat(s.scene), u = c.userData; s.ap = 2.5; s.exposure = 1.12; s.bloom = 0.5;
  s.update = (t) => {
    L.R.update(t); L.pose(t); c.position.copy(LAPCAT(L)); c.rotation.set(0, 0.08, 0);
    const out = smooth(C.claws - 0.05, C.claws + 0.25, t);
    kneadAct(c, t, { look: headPt(L.O, V(0, 0, 0.3)), lid: 0.4, claw: 0.72 * out, k: 0.8 });
    const pw = u.pawW(1), c2 = E.io(seg(t, C.and4 - 0.2, C.kittens2 + 0.3)), cp = pw.clone().add(lv(V(0.18, 0.16, 0.62), V(0.14, 0.13, 0.5), c2));
    shoot(s.cam, cp, pw.clone().add(V(0, 0.03, 0.02)), { fov: 36, t, focus: cp.distanceTo(pw) });
  };
});

// 12) kittens do that too: tiny claws into mom's belly -----------------------------------------------
shot(C.kittens2, C.their4, (s) => {
  const N = nurserySet(s); s.ap = 3; s.exposure = 1.3; s.bloom = 0.5;
  s.update = (t) => {
    N.act(t, { claw: 1.6 }); const u = N.kits[0].userData;
    const c = E.io(seg(t, C.kittens2 - 0.2, C.their4 + 0.3)), tgt = V(-0.05, 0.3, 0.1), cp = lv(V(-0.95, 0.82, 1.4), V(-0.8, 0.74, 1.22), c);
    shoot(s.cam, cp, tgt, { fov: 40, t, focus: cp.distanceTo(tgt) });
  };
});
// 13) their mom just had more fur than you: mom fluffs up, unbothered; a slow blink -------------------
shot(C.their4, C.so2, (s) => {
  const N = nurserySet(s); s.ap = 4; s.exposure = 1.3; s.bloom = 0.5;
  s.update = (t) => {
    const puff = smooth(C.mom - 0.05, C.fur + 0.2, t), sb = Math.max(0, 1 - Math.abs(t - (C.than + 0.1)) / 0.35);
    N.act(t, { claw: 1, puff, momLid: 0.45 + 0.5 * E.io(sb) });
    const c = E.io(seg(t, C.their4 - 0.2, C.so2 + 0.3)), cp = lv(V(-1.25, 1.6, 2.55), V(-1.05, 1.45, 2.25), c), tgt = V(-0.2, 0.55, 0.0);
    shoot(s.cam, cp, tgt, { fov: 42, t, focus: cp.distanceTo(tgt) });
  };
});

// 14) so if your cat climbs on your lap and starts kneading: it hops up, turns, and starts ------------
shot(C.so2, C.hold, (s) => {
  const L = lapSet(s); const c = mkCat(s.scene), u = c.userData; s.ap = 4; s.exposure = 1.12; s.bloom = 0.45;
  const tJ = C.climbs - 0.1, tLand = tJ + 0.45;
  s.update = (t) => {
    L.R.update(t); const ou = L.pose(t); ou.smile(0.7); ou.lid(0.2, t, 3);
    const face = headPt(L.O, V(0, 0, 0.3)), p0 = V(L.X - 1.25, 0, L.R.sofa.z - 1.35), p1 = LAPCAT(L);
    const j = E.io(seg(t, tJ, tLand)), turn = E.io(seg(t, tLand - 0.05, tLand + 0.6)), kn = smooth(C.kneading - 0.1, C.kneading + 0.3, t);
    c.position.copy(p0).lerp(p1, j); c.position.y += Math.sin(Math.PI * j) * 0.75; c.rotation.set(0, lerp(0.9, 0.08, turn), 0);
    const crouch = smooth(tJ - 0.3, tJ, t) * (1 - j);
    const uu = kneadAct(c, t, { look: t > tLand ? face : p1.clone().add(V(0, 0.4, 0)), lid: 0.25 + 0.15 * kn, k: kn });
    if (crouch > 0) { uu.pose({ stand: 1 - crouch, crouch }); uu.solve(); }
    if (j > 0 && j < 1) { uu.legs.forEach((Lg, i) => uu.paw(i, Lg.T.clone().add(V(0, 0.25 * Math.sin(Math.PI * j), (Lg.front ? 0.2 : -0.1) * Math.sin(Math.PI * j))), 0)); uu.solve(); }
    const cc = E.io(seg(t, C.so2 - 0.2, C.hold + 0.3)), cp = lv(V(2.35, 2.55, 1.05), V(2.15, 2.5, 1.3), cc);
    shoot(s.cam, cp, lv(c.position.clone().add(V(0, 0.45, 0)), face, 0.35), { fov: 46, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 15) hold still, because… → back to your point of view (loop)
shot(C.hold, END, (s) => povLap(s, t => t - END));

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
