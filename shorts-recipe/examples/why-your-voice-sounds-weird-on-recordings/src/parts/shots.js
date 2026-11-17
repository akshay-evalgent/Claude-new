// =====================================================================
// SHOTS: "Why Your Voice Sounds Weird On Recordings"
// =====================================================================
const END = C.end;
// you on the sofa (seated at X0), a friend beside you
function sofaSet(s, { friend = false, xray = false } = {}) {
  const sc = s.scene; const R = livingRoom(sc); const O = person(sc, OWNER); const F = friend ? person(sc, FRIEND) : null; const ph = livePhone(); sc.add(ph);
  const glow = xray ? xrayHead(O) : null;
  const X0 = R.sofa.x - 0.55, Z0 = R.sofa.z - 0.15;
  const seat = (P, x, t) => { const u = P.userData; u.reset(); P.rotation.set(0, Math.PI, 0); P.position.set(x, 0, Z0); seatOn(P, R.sofa.seatY); u.breathe(t, 0.25, 0.02); return u; };
  return { R, O, F, ph, glow, X0, Z0, seat };
}
const H0 = (Z) => headPt(Z.O, V(0, 0, 0));

// ---------------------------------------------------------------------
// 0 + 11) the loop: you play back a video of yourself and cringe, then (at the start) make peace with it.
// Both shots run on tau = seconds from the loop point.
// ---------------------------------------------------------------------
function cringeScene(s) {
  const Z = sofaSet(s); s.ap = 3.5; s.exposure = 1.06; s.bloom = 0.42;
  return (tau) => {
    const u = Z.seat(Z.O, Z.X0, tau);
    const cr = smooth(C.video - END, C.cringe - END + 0.1, tau) * (1 - smooth(C.really, C.you + 0.2, tau)), ok = smooth(C.really, C.you + 0.3, tau);
    holdPhone(Z.O, Z.ph, tau, { up: 1 - 0.15 * cr, out: 0.35 * cr });
    u.head.rotation.x += 0.12 - 0.2 * cr; u.head.rotation.z += 0.1 * cr; u.head.rotation.y += -0.42 * cr; u.head.position.z -= 0.08 * cr;
    u.wince(cr); u.lid(0.15 + 0.5 * cr, tau, 2); u.smile(0.35 * ok + 0.15 * (1 - cr)); u.raise(0.3 * ok); u.mouthOpen(0.12 * cr);
    u.gaze(0.0, 0.35); Z.ph.userData.draw('video', tau, clamp((tau + 2.4) / 5.6));
    const h = H0(Z), cp = h.clone().add(V(-1.35 + 0.05 * Math.sin(tau * 0.5), 0.12, -3.5 + 0.05 * tau));
    shoot(s.cam, cp, lv(h, Z.ph.position, 0.4).add(V(0, -0.05, 0)), { fov: 38, t: tau, focus: cp.distanceTo(h), hand: 0.6 });
  };
}
shot(0, C.when, (s) => { const up = cringeScene(s); s.update = (t) => up(t); });

// 1) when you talk, you hear yourself two ways: you talk; a blue path through the air, an orange one inside ----
const AIRP = [V(0, -0.2, 0.45), V(-0.12, -0.16, 0.8), V(-0.6, -0.05, 0.45), V(-0.66, 0.0, 0.05), V(-0.47, 0.02, -0.02)];
const BONEP = [V(0, -0.52, 0.12), V(-0.12, -0.38, 0.22), V(-0.25, -0.18, 0.12), V(-0.3, 0.02, -0.02)];
function paths(sc) { const a = pulsePath([0.35, 0.75, 1.4]), b = pulsePath([1.5, 0.75, 0.2]); sc.add(a, b); return { a, b }; }
shot(C.when, C.sound, (s) => {
  const Z = sofaSet(s, { xray: true }); const sc = s.scene; const P = paths(sc); const ie = innerEar(); Z.O.userData.head.add(ie); ie.position.copy(HL.inner); ie.rotation.y = 0.2;
  const lab = textPlane('2 WAYS', 0.5, '#ffffff', '#1a2a4a'); lab.userData.noDof = true; lab.material.depthTest = false; lab.renderOrder = 16; sc.add(lab);
  s.ap = 2.6; s.exposure = 1.06; s.bloom = 0.6;
  s.update = (t) => {
    const u = Z.seat(Z.O, Z.X0, t); holdPhone(Z.O, Z.ph, t, { up: 0 }); talk(u, t, smooth(C.talk - 0.2, C.talk, t) * (1 - smooth(C.ways, C.ways + 0.3, t))); u.smile(0.2); u.lid(0.12, t, 1);
    Z.glow(0.3); const hd = u.head;
    P.a.userData.set(AIRP.map(p => worldPt(hd, p)), t, smooth(C.two - 0.1, C.two + 0.2, t)); P.b.userData.set(BONEP.map(p => worldPt(hd, p)), t, smooth(C.ways - 0.15, C.ways + 0.15, t), 1.6, 0.022);
    const h = H0(Z), c = E.io(seg(t, C.when - 0.2, C.sound + 0.3)), cp = h.clone().add(V(lerp(3.7, 3.5, c), 0.15, lerp(-1.1, -1.0, c)));
    shoot(s.cam, cp, h.clone().add(V(0, -0.2, -0.2)), { fov: 36, t, focus: cp.distanceTo(h) });
    pin(s.cam, lab, 0, 0.26, 1.6); lab.scale.setScalar(Math.max(1e-4, spring(t, C.two - 0.05, 2, 6)));
  };
});

// 2) sound leaves your mouth and travels through the air into your ears: rings, the blue path, the ear lights up ----
shot(C.sound, C.the3, (s) => {
  const Z = sofaSet(s); const sc = s.scene; const P = paths(sc); const rg = rings(sc); s.ap = 2.8; s.exposure = 1.06; s.bloom = 0.55;
  s.update = (t) => {
    const u = Z.seat(Z.O, Z.X0, t); holdPhone(Z.O, Z.ph, t, { up: 0 }); talk(u, t, 1); u.smile(0.25); u.lid(0.12, t, 1);
    const hd = u.head; P.a.userData.set(AIRP.map(p => worldPt(hd, p)), t, smooth(C.travels - 0.1, C.through, t)); P.b.visible = false;
    const h = H0(Z), c = E.io(seg(t, C.sound - 0.2, C.the3 + 0.3)), cp = h.clone().add(V(lerp(3.3, 3.1, c), 0.2, lerp(-1.5, -1.35, c)));
    shoot(s.cam, cp, h.clone().add(V(0, -0.2, -0.22)), { fov: 36, t, focus: cp.distanceTo(h) });
    rg(t, worldPt(hd, V(0, -0.2, 0.5)), s.cam, smooth(C.sound - 0.1, C.leaves, t), 0.4, 0.28);
  };
});

// 3) the same way everyone else hears it: your friend beside you gets the same blue waves ------------------
shot(C.the3, C.but, (s) => {
  const Z = sofaSet(s, { friend: true }); const sc = s.scene; const air = pulsePath([0.35, 0.75, 1.4]); sc.add(air); const rg = rings(sc); s.ap = 3.2; s.exposure = 1.06; s.bloom = 0.5;
  s.update = (t) => {
    const u = Z.seat(Z.O, Z.X0, t); const fu = Z.seat(Z.F, Z.X0 + 1.15, t); holdPhone(Z.O, Z.ph, t, { up: 0 }); talk(u, t, 1); u.smile(0.3); u.lid(0.12, t, 1);
    fu.head.rotation.y = -0.45; fu.smile(0.4); fu.lid(0.12, t, 3); fu.raise(0.3); ik2(Z.F, fu.arms[0], worldPt(Z.F, V(0.3, 1.45, 0.55)), V(-1, -1, 0)); ik2(Z.F, fu.arms[1], worldPt(Z.F, V(-0.3, 1.45, 0.55)), V(1, -1, 0));
    u.head.rotation.y = 0.35;
    const m = worldPt(u.head, V(0, -0.2, 0.45)), fe = worldPt(fu.head, HL.earL), mid = m.clone().lerp(fe, 0.5).add(V(0, 0.12, -0.35));
    air.userData.set([m, mid, fe], t, smooth(C.same - 0.1, C.way, t), 1.6, 0.02);
    const h = H0(Z), c = E.io(seg(t, C.the3 - 0.2, C.but + 0.3)), cp = lv(h, headPt(Z.F, V(0, 0, 0)), 0.5).add(V(0.0, 0.3, lerp(-4.2, -3.9, c)));
    shoot(s.cam, cp, lv(h, headPt(Z.F, V(0, 0, 0)), 0.5).add(V(0, -0.15, 0)), { fov: 44, t, focus: cp.distanceTo(h) });
    rg(t, m, s.cam, 1, -0.6, 0.3);
  };
});

// 4) but it also travels straight through the bones of your skull: x-ray; orange pulses up the jaw to the inner ear ----
shot(C.but, C.and2, (s) => {
  const Z = sofaSet(s, { xray: true }); const sc = s.scene; const P = paths(sc); const ie = innerEar(); Z.O.userData.head.add(ie); ie.position.copy(HL.inner); ie.rotation.y = 0.2; s.ap = 2.4; s.exposure = 1.06; s.bloom = 0.65;
  s.update = (t) => {
    const u = Z.seat(Z.O, Z.X0, t); holdPhone(Z.O, Z.ph, t, { up: 0 }); talk(u, t, 1); u.smile(0.2); u.lid(0.12, t, 1); Z.glow(0.25);
    const hd = u.head; P.a.visible = false; P.b.userData.set(BONEP.map(p => worldPt(hd, p)), t, smooth(C.travels2 - 0.1, C.straight, t), 1.8, 0.03);
    ie.scale.setScalar(1 + 0.25 * smooth(C.skull - 0.1, C.skull + 0.2, t) * (0.6 + 0.4 * Math.sin(t * 14)));
    const h = H0(Z), c = E.io(seg(t, C.but - 0.2, C.and2 + 0.3)), cp = h.clone().add(V(lerp(3.0, 2.8, c), 0.0, lerp(-0.7, -0.6, c)));
    shoot(s.cam, cp, h.clone().add(V(0, -0.22, 0.0)), { fov: 36, t, focus: cp.distanceTo(h) });
  };
});

// 5) and that path makes your voice sound deeper and fuller: the spectrum card, bass boosted ----------------
shot(C.and2, C.a, (s) => {
  const Z = sofaSet(s, { xray: true }); const sc = s.scene; const P = paths(sc); const sp = spectrumCard(0.48); sc.add(sp); s.ap = 2.8; s.exposure = 1.06; s.bloom = 0.6;
  s.update = (t) => {
    const u = Z.seat(Z.O, Z.X0, t); holdPhone(Z.O, Z.ph, t, { up: 0 }); talk(u, t, 1); u.smile(0.3); u.lid(0.12, t, 1); Z.glow(0.25 + 0.3 * smooth(C.deeper, C.fuller, t));
    const hd = u.head; P.a.visible = false; P.b.userData.set(BONEP.map(p => worldPt(hd, p)), t, 1, 1.8, 0.03);
    const h = H0(Z), c = E.io(seg(t, C.and2 - 0.2, C.a + 0.3)), cp = h.clone().add(V(lerp(2.9, 2.7, c), -0.1, lerp(-2.6, -2.4, c)));
    shoot(s.cam, cp, h.clone().add(V(0, -0.35, 0)), { fov: 40, t, focus: cp.distanceTo(h) });
    pin(s.cam, sp, 0, -0.2, 1.6); sp.scale.setScalar(Math.max(1e-4, spring(t, C.path - 0.1, 2, 6))); sp.userData.draw(0.5 + 0.5 * E.io(seg(t, C.deeper - 0.1, C.fuller + 0.2)), 'IN YOUR HEAD');
  };
});

// 6) a recording only catches the sound in the air: you record a memo; blue rings go into the phone, orange stays inside --
shot(C.a, C.so, (s) => {
  const Z = sofaSet(s, { xray: true }); const sc = s.scene; const P = paths(sc); const rg = rings(sc); s.ap = 2.8; s.exposure = 1.06; s.bloom = 0.6;
  s.update = (t) => {
    const u = Z.seat(Z.O, Z.X0, t); const at = holdPhone(Z.O, Z.ph, t, { up: 0.55, out: 0.2 }); talk(u, t, 1); u.smile(0.2); u.lid(0.15, t, 1); Z.glow(0.2);
    Z.ph.userData.draw('rec', t);
    const hd = u.head, m = worldPt(hd, V(0, -0.2, 0.45)); P.a.userData.set([m, m.clone().lerp(at, 0.5).add(V(0, 0.05, 0)), at.clone().add(V(0, 0.2, 0))], t, smooth(C.catches - 0.1, C.the5, t), 1.8, 0.02);
    P.b.userData.set(BONEP.map(p => worldPt(hd, p)), t, 0.55, 1.6, 0.022);
    const h = H0(Z), c = E.io(seg(t, C.a - 0.2, C.so + 0.3)), cp = h.clone().add(V(lerp(3.2, 3.0, c), -0.05, lerp(-2.2, -2.0, c)));
    shoot(s.cam, cp, lv(h, at, 0.45), { fov: 40, t, focus: cp.distanceTo(h) });
    rg(t, m, s.cam, 1, 0.4, 0.22);
  };
});

// 7) so it sounds thinner and higher than the voice in your head: playback, the bass drops away; you wince -----
shot(C.so, C.the8, (s) => {
  const Z = sofaSet(s); const sc = s.scene; const sp = spectrumCard(0.48); sc.add(sp); s.ap = 3; s.exposure = 1.06; s.bloom = 0.45;
  s.update = (t) => {
    const u = Z.seat(Z.O, Z.X0, t); holdPhone(Z.O, Z.ph, t, { up: 1 }); Z.ph.userData.draw('memo', t, clamp((t - C.so) / (C.the8 - C.so)));
    const w = smooth(C.thinner - 0.2, C.thinner + 0.2, t); u.wince(w); u.lid(0.15 + 0.3 * w, t, 2); u.head.rotation.y -= 0.15 * w; u.gaze(0, 0.35);
    const h = H0(Z), c = E.io(seg(t, C.so - 0.2, C.the8 + 0.3)), cp = h.clone().add(V(-1.2, 0.0, lerp(-3.4, -3.2, c)));
    shoot(s.cam, cp, lv(h, Z.ph.position, 0.3).add(V(0, -0.25, 0)), { fov: 40, t, focus: cp.distanceTo(h) });
    pin(s.cam, sp, 0, -0.2, 1.6); sp.scale.setScalar(Math.max(1e-4, spring(t, C.so + 0.05, 2, 6))); sp.userData.draw(0.5 - 0.5 * E.io(seg(t, C.thinner - 0.1, C.higher + 0.2)), 'ON A RECORDING', '#ff6a5a');
  };
});

// 8) the good news? you look up, brows raised, a little smile ------------------------------------------------
shot(C.the8, C.in_3, (s) => {
  const Z = sofaSet(s); s.ap = 3; s.exposure = 1.06; s.bloom = 0.45;
  s.update = (t) => {
    const u = Z.seat(Z.O, Z.X0, t); holdPhone(Z.O, Z.ph, t, { up: 0.3 }); const k = smooth(C.the8 - 0.1, C.good, t);
    u.raise(0.8 * k); u.smile(0.6 * k); u.lid(0.08, t, 2); u.head.rotation.x -= 0.12 * k; u.gaze(0, -0.1 * k); u.eyePop(1 + 0.08 * k);
    const h = H0(Z), cp = h.clone().add(V(-0.6, 0.0, -2.9 + 0.15 * (t - C.the8)));
    shoot(s.cam, cp, h.clone().add(V(0, -0.1, 0)), { fov: 36, t, focus: cp.distanceTo(h) });
  };
});

// 9 + 10) the study: a listener in headphones rates voices; voice C gets five stars… and it's theirs -----------
function studyScene(s) {
  const sc = s.scene; const R = tickleLab(sc); const L = person(sc, LISTENER); headphones(L); const card = ratingsCard(0.5); sc.add(card); s.ap = 3.2; s.exposure = 1.08; s.bloom = 0.45;
  return { R, L, card };
}
shot(C.in_3, C.as, (s) => {
  const Z = studyScene(s);
  s.update = (t) => {
    const u = seatAt(Z.L, t, 0, 0.6, 0.0); u.lid(0.3, t, 1); u.head.rotation.x += 0.12; u.head.rotation.y = 0.1 * Math.sin(t * 1.3); u.smile(0.25);
    ik2(Z.L, u.arms[0], worldPt(Z.L, V(0.32, 1.42, 0.55)), V(-1, -1, 0)); ik2(Z.L, u.arms[1], worldPt(Z.L, V(-0.32, 1.42, 0.55)), V(1, -1, 0));
    const h = headPt(Z.L, V(0, 0, 0)), c = E.io(seg(t, C.in_3 - 0.2, C.as + 0.3)), cp = h.clone().add(V(0.9, 0.15, lerp(3.7, 3.4, c)));
    shoot(s.cam, cp, h.clone().add(V(0, -0.45, 0)), { fov: 42, t, focus: cp.distanceTo(h) });
    pin(s.cam, Z.card, 0, -0.2, 1.6); Z.card.scale.setScalar(Math.max(1e-4, spring(t, C.rated - 0.1, 2, 6)));
    Z.card.userData.draw(Math.round(3 * smooth(C.rated, C.their, t)), Math.round(2 * smooth(C.their, C.own + 0.2, t)), 0, 0);
  };
});
shot(C.as, C.so2, (s) => {
  const Z = studyScene(s);
  s.update = (t) => {
    const u = seatAt(Z.L, t, 0, 0.6, 0.0); const rev = smooth(C.recognize - 0.05, C.recognize + 0.15, t);
    u.lid(0.3 - 0.25 * rev, t, 1); u.head.rotation.x += 0.12 - 0.15 * rev; u.smile(0.6 * (1 - rev)); u.raise(rev); u.eyePop(1 + 0.25 * rev); u.mouthOpen(0.35 * rev);
    ik2(Z.L, u.arms[0], worldPt(Z.L, V(0.32, 1.42, 0.55)).lerp(worldPt(Z.L, V(0.22, 2.3, 0.45)), rev), V(-1, -1, 0)); ik2(Z.L, u.arms[1], worldPt(Z.L, V(-0.32, 1.42, 0.55)).lerp(worldPt(Z.L, V(-0.22, 2.3, 0.45)), rev), V(1, -1, 0));
    const h = headPt(Z.L, V(0, 0, 0)), c = E.io(seg(t, C.as - 0.2, C.so2 + 0.3)), cp = h.clone().add(V(0.8, 0.15, lerp(3.3, 3.0, c)));
    shoot(s.cam, cp, h.clone().add(V(0, -0.45, 0)), { fov: 42, t, focus: cp.distanceTo(h) });
    pin(s.cam, Z.card, 0, -0.2, 1.6);
    Z.card.userData.draw(3, 2, Math.round(5 * smooth(C.more - 0.05, C.attractive + 0.3, t)), rev, smooth(C.more, C.attractive, t));
  };
});

// 11) so next time you hear yourself on a video, don't cringe, because… → (loop)
shot(C.so2, END, (s) => { const up = cringeScene(s); s.update = (t) => up(t - END); });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
