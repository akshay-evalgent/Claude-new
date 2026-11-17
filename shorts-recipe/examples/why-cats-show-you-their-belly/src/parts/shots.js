// =====================================================================
// SHOTS: "Why Cats Show You Their Belly"
// Each frame is posed from scratch in a fixed order (you first, then the cat, then anything that
// depends on both), so any frame renders on its own.
// =====================================================================
const END = C.end;
const CP = V(1.3, 0, 2.7), CRY = -2.2;                          // the cat's spot on the floor, and its heading
const F = V(Math.sin(CRY), 0, Math.cos(CRY));                    // the way its head points
const BDIR = V(Math.cos(CRY), 0, -Math.sin(CRY));                // the side its belly faces when it flops (+roll)
const Y = V(0, 1, 0);
const at = (f, b, y) => CP.clone().addScaledVector(F, f).addScaledVector(BDIR, b).add(V(0, y, 0));   // a point around the cat
const OWNP = at(0, 0.95, 0), ORY = Math.atan2(-BDIR.x, -BDIR.z);
const bellyW = (u, x = 0, z = 0) => u.W(V(x, 0.02, -0.12 + z));
function sunRoom(s) {
  const R = livingRoom(s.scene);
  // a warm patch of afternoon sun on the cat's spot
  const sp = new THREE.SpotLight(0xffd6a0, 34, 10, 0.42, 0.6, 1.4); sp.position.copy(CP).add(V(-2.6, 4.6, -1.4)); sp.target.position.copy(CP).add(V(0, 0.2, 0));
  sp.castShadow = true; sp.shadow.mapSize.set(2048, 2048); sp.shadow.bias = -0.0004; sp.userData.soft = 0.25; s.scene.add(sp, sp.target);
  return R;
}
function owner(sc) { const O = makeKid(OWNER); addSmile(O); sc.add(O); return O; }
const restHand = (O) => worldPt(O, V(0.35, 1.2, 0.45));
const headOf = (O) => O.userData.head.getWorldPosition(new THREE.Vector3());

// ---------------------------------------------------------------------
// 0 + 14) the loop: the cat flops onto its side in front of you, then rolls onto its back.
// Both shots run on tau = seconds from the loop point, so the last frame and the first frame match.
// ---------------------------------------------------------------------
function rollRoll(tau) {
  // 0 crouched on its feet → PI/2 on its side (the flop) → PI belly up (the roll)
  const flop = E.in(seg(tau, -3.12, -2.74)), bounce = 0.07 * wob(tau, -2.74, 2.4, 6), roll = E.io(seg(tau, -0.45, 1.05));
  return Math.PI / 2 * flop + bounce + Math.PI / 2 * roll;
}
function loopScene(s) {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; s.ap = 3.2; s.exposure = 1.05; s.bloom = 0.5;
  return (tau) => {
    if (R.update) R.update(tau);
    const r = rollRoll(tau), drift = E.io(seg(tau, -3.4, 2.78));
    const cp = lv(at(2.35, 0.2, 1.55), at(2.1, 0.15, 1.45), drift);
    catRoll(c, tau, { P: CP, ry: CRY, roll: r, look: cp, lid: lerp(0.25, 0.18, clamp(r / Math.PI)), tilt: 0.6, tailSw: 0.35 });
    u.head.rotation.z += 0.08 * Math.sin(tau * 1.4) * clamp(r / Math.PI); fluff(c, 0.25 * clamp(r / Math.PI));
    shoot(s.cam, cp, at(-0.05, 0.02, 0.3), { fov: 40, t: tau, focus: cp.distanceTo(u.eyeW()), hand: 0.6 });
  };
}
shot(0, C.its2, (s) => { const up = loopScene(s); s.update = (t) => up(t); });

// 1) it's not asking for a rub: your hand comes toward the belly; the cat's eyes lock on, the tail tip flicks
shot(C.its2, C.its3, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const O = owner(sc); s.ap = 3.5; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => {
    ownerKneel(O, t, OWNP.x, OWNP.z, ORY, {}); const rest = restHand(O);
    catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI, lid: 0.12 });
    const hk = E.io(seg(t, C.its2 + 0.1, C.rub)) * (1 - 0.15 * E.io(seg(t, C.rub, C.its3)));
    const hand = rest.clone().lerp(bellyW(u).add(V(0, 0.18, 0)), hk * 0.85);
    ownerKneel(O, t, OWNP.x, OWNP.z, ORY, { pet: hand, look: u.eyeW() }).smile(0.5);
    catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI, look: hand, lid: 0.12, tilt: 0.5, tailSw: 0.6 }); u.ears(0.15 * hk, 0.3 * hk, -0.3 * hk).pupil(0.5 + 0.25 * hk);
    const c2 = E.io(seg(t, C.its2 - 0.2, C.its3 + 0.3)), cp = lv(at(0.9, -2.9, 1.05), at(0.85, -2.7, 1.0), c2);
    shoot(s.cam, cp, lv(CP.clone().add(V(0, 0.45, 0)), hand, 0.35).add(V(0, 0.3, 0)), { fov: 46, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 2) it's telling you it feels safe: close on the upside-down face, a slow blink, purring, a heart ---------
shot(C.its3, C.the, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const pr = purrRings(sc, 3, 0xffe6c0); const hb = heartBurst(sc, 7, 4); s.ap = 2.4; s.exposure = 1.06; s.bloom = 0.55;
  s.update = (t) => {
    const c2 = E.io(seg(t, C.its3 - 0.2, C.the + 0.3)), cp = lv(at(2.0, 0.3, 1.1), at(1.85, 0.25, 1.02), c2);
    const sb = Math.max(0, 1 - Math.abs(t - (C.safe + 0.1)) / 0.4);
    catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI, look: cp, lid: 0.2 + 0.7 * E.io(sb), tilt: 0.7, tailSw: 0.15 }); fluff(c, 0.3);
    pr(t, u.eyeW().add(V(0, 0.05, 0)), smooth(C.telling, C.telling + 0.3, t), 0.55, cp); hb(t, C.safe - 0.1, u.W(V(0, -0.5, 0.2)));
    shoot(s.cam, cp, u.eyeW().add(V(0, 0.05, 0)), { fov: 36, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 3 + 4) the x-ray: the belly holds the soft organs; the ribs only cover the chest -------------------------
function xrayScene(s) {
  const sc = s.scene; sc.background = BG.xray; sc.environment = NENV; sc.add(new THREE.HemisphereLight(0x8fb8ff, 0x101830, 0.6));
  const c = mkCat(sc, { xray: true }), u = c.userData; const ins = insides(c); s.ap = 2.5; s.exposure = 1.0; s.bloom = 0.6;
  c.traverse(o => { const m = o.material; if (m && m.uniforms && m.uniforms.intensity && !ins.getObjectById(o.id)) m.uniforms.intensity.value = 0.3; });
  return { c, u, ins };
}
const XF = V(0, 0, 1);
shot(C.the, C.with_, (s) => {
  const X = xrayScene(s);
  s.update = (t) => {
    catRoll(X.c, t, { P: V(0, 0, 0), ry: 0, roll: Math.PI, look: V(0, 2, 3), lid: 0.3, tilt: 0.3 });
    const k = smooth(C.soft - 0.15, C.soft + 0.1, t) * 1.2 + smooth(C.important - 0.1, C.important + 0.2, t) * 1.3 + smooth(C.organs - 0.1, C.organs + 0.25, t) * 1.6;
    X.ins.userData.set(k, 0.3, 0, t);
    const c2 = E.io(seg(t, C.the - 0.2, C.with_ + 0.3)), cp = lv(V(0.35, 2.35, 1.5), V(0.25, 2.2, 1.25), c2);
    shoot(s.cam, cp, V(0, 0.4, -0.12), { fov: 38, t, focus: cp.distanceTo(V(0, 0.4, 0)) });
  };
});
shot(C.with_, C.so, (s) => {
  const X = xrayScene(s);
  s.update = (t) => {
    catRoll(X.c, t, { P: V(0, 0, 0), ry: 0, roll: Math.PI, look: V(0, 2, 3), lid: 0.3, tilt: 0.3 });
    X.ins.userData.set(4.2, smooth(C.no - 0.1, C.ribs + 0.2, t) * (1 - 0.35 * smooth(C.protect, C.them, t)), smooth(C.protect - 0.1, C.them, t), t);
    const c2 = E.io(seg(t, C.with_ - 0.2, C.so + 0.3)), cp = lv(V(-1.25, 2.0, 1.35), V(-1.3, 1.85, 0.95), c2);
    shoot(s.cam, cp, lv(V(0, 0.42, 0.2), V(0, 0.38, -0.12), c2), { fov: 40, t, focus: cp.distanceTo(V(0, 0.4, 0.1)) });
  };
});

// 5) so a cat only shows it to someone it trusts: wary of a visitor, it turns to you and flops ---------
shot(C.so, C.but, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const V1 = makeKid(STRANGER); sc.add(V1); const O = owner(sc); const hb = heartBurst(sc, 6, 7);
  s.ap = 3.6; s.exposure = 1.05; s.bloom = 0.45;
  const SP = at(0.1, -0.85, 0), SRY = Math.atan2(BDIR.x, BDIR.z), OP5 = at(0, 0.85, 0);
  s.update = (t) => {
    const turn = E.io(seg(t, C.only, C.someone)), flop = E.in(seg(t, C.it3 - 0.2, C.trusts + 0.15)) * Math.PI;
    const catHead = CP.clone().add(V(0, 0.5, 0));
    ownerKneel(V1, t, SP.x, SP.z, SRY, { look: catHead }); ownerKneel(O, t, OP5.x, OP5.z, ORY, { look: catHead }).smile(0.55);
    const lookAt = lv(headOf(V1), headOf(O), turn);
    if (flop < 0.02) {
      c.rotation.set(0, CRY + Math.PI / 2 * lerp(-1, 1, turn) * 0.75, 0); c.position.copy(CP); u.pose({ sit: 1 }); u.solve().breathe(t, 0.02).whisk(0.2);
      u.look(lookAt, 0.9).gaze(lookAt); u.ears(0.55 * (1 - turn), -0.4 * (1 - turn), 0.4 * (1 - turn)).pupil(0.7 - 0.3 * turn).lid(0.08 + 0.2 * turn); u.tail([V(0, 0.3, -0.92), V(0.3, 0.12, -1.0), V(0.55, 0.06, -0.7), V(0.6, 0.06, -0.3), V(0.45, 0.06, 0.05)]);
    } else catRoll(c, t, { P: CP, ry: CRY, roll: flop, look: headOf(O), lid: 0.25, tilt: 0.5 });
    hb(t, C.trusts + 0.1, CP.clone().add(V(0, 0.75, 0)).addScaledVector(BDIR, 0.35));
    const c2 = E.io(seg(t, C.so - 0.2, C.but + 0.3)), cp = lv(at(3.9, 0.0, 1.95), at(3.6, 0.0, 1.9), c2);
    shoot(s.cam, cp, CP.clone().add(V(0, 0.95, 0)), { fov: 52, t, focus: cp.distanceTo(CP) });
  };
});

// 6) but touch it, and an old reflex kicks in: your hand lands; pupils blow wide, ears back, a red pulse ---------
shot(C.but, C.the3, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const O = owner(sc); const al = alertRing(); sc.add(al); s.ap = 2.8; s.exposure = 1.05; s.bloom = 0.55;
  s.update = (t) => {
    ownerKneel(O, t, OWNP.x, OWNP.z, ORY, {}); const rest = restHand(O);
    catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI, lid: 0.15 });
    const touch = E.io(seg(t, C.but, C.touch + 0.15)), zap = smooth(C.it4 - 0.05, C.it4 + 0.12, t);
    const hand = rest.clone().lerp(bellyW(u, 0, 0.05).add(V(0, 0.07, 0)), touch);
    ownerKneel(O, t, OWNP.x, OWNP.z, ORY, { pet: hand, look: u.eyeW() }).smile(0.5 - 0.3 * zap);
    const c2 = E.io(seg(t, C.but - 0.2, C.the3 + 0.3)), cp = lv(at(1.25, -2.3, 0.95), at(1.1, -2.05, 0.9), c2);
    catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI, look: lv(cp, hand, 0.7 * zap), lid: 0.15 - 0.15 * zap, tilt: 0.5, tailSw: 0.3 + 0.6 * zap });
    u.ears(1.0 * zap, 0, 0).pupil(0.42 + 0.5 * zap); c.position.y += 0.012 * Math.sin(t * 40) * zap * (1 - smooth(C.it4 + 0.3, C.it4 + 0.6, t));
    al.position.copy(CP).add(V(0, 0.35, 0)); al.quaternion.copy(s.cam.quaternion); al.userData.set(t, C.reflex - 0.1, smooth(C.reflex - 0.15, C.reflex + 0.1, t));
    shoot(s.cam, cp, lv(u.eyeW(), hand, 0.4).add(V(0, 0.18, 0)), { fov: 44, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 7-9) the grab, the claws, the bunny kicks: the cat wraps your forearm ---------------------------------
function grabPose(c, u, O, t, { grab = 1, claws = 0, kick = 0, look = null }) {
  catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI, lid: 0 });
  const hand = bellyW(u, 0.02, 0.12).add(V(0, 0.07, 0));
  ownerKneel(O, t, OWNP.x, OWNP.z, ORY, { pet: hand, look: u.eyeW() }).smile(0.1);
  catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI, look: look || forearm(O, 0.75), lid: 0.0, tilt: 0.35, tailSw: 0.8 });
  u.ears(0.9, 0, 0).pupil(0.85);
  // front paws clamp round the forearm; hind paws rake it (kick = 0..1)
  c.updateMatrixWorld(true); const toL = (w) => c.worldToLocal(w.clone());
  const a0 = toL(forearm(O, 0.5)), a1 = toL(forearm(O, 0.82));
  u.legs.forEach((L) => {
    if (L.front) { const g = (L.sx < 0 ? a0 : a1).clone().add(V(L.sx * 0.12, -0.04, 0)); L.T.lerp(g, grab); L.pitch = lerp(L.pitch, 1.6, grab); }
    else { const ph = 2 * Math.PI * 5.2 * t + (L.sx > 0 ? Math.PI : 0), s = Math.max(0, Math.sin(ph)), g = a0.clone().lerp(a1, 0.3).add(V(L.sx * 0.12, 0.28 * s - 0.08, -0.18 * s)); L.T.lerp(g, kick); L.pitch = lerp(L.pitch, 0.2, kick); }
  });
  u.solve(); u.claws(claws);
  if (kick > 0) { u.hips.position.y += 0.03 * Math.sin(2 * Math.PI * 5.2 * t) * kick; u.head.rotation.x += 0.05 * Math.sin(2 * Math.PI * 5.2 * t + 1) * kick; }
  return hand;
}
shot(C.the3, C.the4, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const O = owner(sc); s.ap = 2.6; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => {
    const grab = backE(seg(t, C.front, C.grab + 0.12));
    grabPose(c, u, O, t, { grab, claws: 0 });
    const fa = forearm(O, 0.68), mid = fa.clone().lerp(u.eyeW(), 0.45), c2 = E.io(seg(t, C.the3 - 0.2, C.the4 + 0.3)), cp = mid.clone().addScaledVector(BDIR, -1.15).addScaledVector(F, 0.85).add(V(0, 0.75, 0)).addScaledVector(BDIR, 0.12 * c2);
    shoot(s.cam, cp, mid, { fov: 40, t, focus: cp.distanceTo(mid) });
  };
});
shot(C.the4, C.and3, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const O = owner(sc); s.ap = 1.5; s.exposure = 1.06; s.bloom = 0.45;
  s.update = (t) => {
    grabPose(c, u, O, t, { grab: 1, claws: backE(seg(t, C.claws - 0.05, C.come + 0.15)) });
    const pw = u.pawW(1), c2 = E.io(seg(t, C.the4 - 0.2, C.and3 + 0.3)), cp = pw.clone().addScaledVector(BDIR, -0.5).addScaledVector(F, 0.25).add(V(0, 0.32, 0)).addScaledVector(BDIR, 0.06 * c2);
    shoot(s.cam, cp, pw.clone().add(V(0, 0.02, 0)), { fov: 34, t, focus: cp.distanceTo(pw), hand: 0.4 });
  };
});
shot(C.and3, C.on, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const O = owner(sc); const tf = furTufts(sc, 50); s.ap = 3; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => {
    const kick = smooth(C.back - 0.15, C.legs, t);
    grabPose(c, u, O, t, { grab: 1, claws: 1, kick });
    tf(t, C.kick - 0.1, C.on, forearm(O, 0.6));
    const c2 = E.io(seg(t, C.and3 - 0.2, C.on + 0.3)), cp = lv(at(-1.75, -1.25, 1.55), at(-1.6, -1.1, 1.45), c2);
    shoot(s.cam, cp, at(-0.05, 0.3, 0.4), { fov: 42, t, focus: cp.distanceTo(at(-0.2, 0.2, 0.3)) });
  };
});

// 10) on its back, a cat can fight with all four paws at once: four rings count the paws; a hiss -----------
shot(C.on, C.so2, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const rings = pawRings(sc); s.ap = 3; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => {
    const c2 = E.io(seg(t, C.on - 0.2, C.so2 + 0.3)), cp = lv(at(1.5, -0.7, 2.3), at(1.35, -0.62, 2.2), c2);
    catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI, look: cp, lid: 0, tilt: 0.3, pawUp: 1, tailSw: 0.8 });
    u.ears(1, 0, 0).pupil(0.9).claws(1).meow(0.55 * smooth(C.fight - 0.1, C.fight + 0.1, t) * (1 - smooth(C.once, C.once + 0.4, t)));
    u.legs.forEach((L, i) => { L.T.add(V(0.04 * Math.sin(t * 7 + i * 1.7), 0.05 * Math.sin(t * 9 + i), 0)); }); u.solve();
    const P = [0, 1, 2, 3].map(i => u.pawW(i));
    rings(s.cam, P, [C.all2 - 0.05, C.four - 0.02, C.paws2 - 0.1, C.paws2 + 0.12], t);
    shoot(s.cam, cp, at(0.0, 0.0, 0.3), { fov: 42, t, focus: cp.distanceTo(CP) });
  };
});

// 11) so it's not a trap: a TRAP sign pops over the cat, then gets crossed out --------------------------
shot(C.so2, C.its6, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const sign = trapSign(); sc.add(sign); s.ap = 3; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => {
    const c2 = E.io(seg(t, C.so2 - 0.2, C.its6 + 0.3)), cp = lv(at(2.6, 0.3, 1.45), at(2.45, 0.25, 1.38), c2);
    catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI, look: cp, lid: 0.2, tilt: 0.6 }); fluff(c, 0.3);
    shoot(s.cam, cp, at(0.1, 0, 0.3), { fov: 40, t, focus: cp.distanceTo(u.eyeW()) });
    pin(s.cam, sign, 0, 0.1, 1.6); sign.rotateZ(0.06 * Math.sin(t * 3)); sign.userData.set(0.5 * spring(t, C.so2 + 0.05, 2.2, 6), E.out(seg(t, C.not2 - 0.05, C.not2 + 0.15)));
  };
});

// 12) it's a compliment: a slow blink right at you; hearts ------------------------------------------------
shot(C.its6, C.scratch, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const hb = heartBurst(sc, 9, 9); s.ap = 2.4; s.exposure = 1.06; s.bloom = 0.55;
  s.update = (t) => {
    const c2 = E.io(seg(t, C.its6 - 0.2, C.scratch + 0.3)), cp = lv(at(1.95, 0.35, 1.0), at(1.85, 0.32, 0.95), c2);
    const sb = Math.max(0, 1 - Math.abs(t - (C.compliment + 0.2)) / 0.45);
    catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI, look: cp, lid: 0.2 + 0.75 * E.io(sb), tilt: 0.75 }); fluff(c, 0.3);
    hb(t, C.compliment, u.eyeW().add(V(0, 0.12, 0)));
    shoot(s.cam, cp, u.eyeW(), { fov: 36, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 13) scratch its chin instead: your finger under the chin; it stretches its head up, eyes shut, purring ------
shot(C.scratch, C.and4, (s) => {
  const sc = s.scene; const R = sunRoom(s); const c = mkCat(sc), u = c.userData; const O = owner(sc); const pr = purrRings(sc, 3, 0xffe6c0); s.ap = 2.8; s.exposure = 1.06; s.bloom = 0.5;
  s.update = (t) => {
    ownerKneel(O, t, OWNP.x, OWNP.z, ORY, {}); const rest = restHand(O);
    const k = E.io(seg(t, C.scratch, C.chin)), wig = Math.sin(t * 13) * 0.025 * k;
    catRoll(c, t, { P: CP, ry: CRY, roll: Math.PI * 0.6, look: headOf(O), lid: 0.2 + 0.75 * smooth(C.chin, C.instead, t), tilt: 0.2 });
    u.head.rotation.x -= 0.35 * k; fluff(c, 0.2);
    c.updateMatrixWorld(true); const chin = u.head.localToWorld(V(0, -0.36, 0.38)), pt = chin.clone().add(V(wig, -0.03, wig));
    ownerKneel(O, t, OWNP.x, OWNP.z, ORY, { pet: rest.clone().lerp(pt, k), look: chin }).smile(0.7);
    pr(t, u.head.localToWorld(V(0, -0.1, 0.2)), smooth(C.chin, C.chin + 0.3, t), 0.45, s.cam.position);
    const c2 = E.io(seg(t, C.scratch - 0.2, C.and4 + 0.3)), cp = lv(at(2.0, 0.6, 1.05), at(1.85, 0.55, 1.0), c2);
    shoot(s.cam, cp, chin.clone().add(V(0, 0.12, 0)), { fov: 42, t, focus: cp.distanceTo(chin) });
  };
});

// 14) and if it flops over in front of you again, just say thanks, because… → (loop)
shot(C.and4, END, (s) => { const up = loopScene(s); s.update = (t) => up(t - END); });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
