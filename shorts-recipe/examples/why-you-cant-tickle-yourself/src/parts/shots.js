// =====================================================================
// SHOTS: "Why You Can't Tickle Yourself"
// =====================================================================
const END = C.end;
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const VOL = { shirt: 0x3a7fc8, pants: 0x2f3d5c, hair: 0x2a1a10, skin: 0xc68a64, style: 'short', s: 1.0, hs: 1.0 };
const PA = { shirt: 0x4a9a5a, pants: 0x3a3f4a, hair: 0x5a3a1a, skin: 0xf0c0a0, style: 'short', glasses: true, s: 1.0, hs: 1.0 };
const PB = { shirt: 0xc8503a, pants: 0x2f3d5c, hair: 0x1a1a1a, skin: 0x8a5a3a, style: 'long', s: 1.0, hs: 1.0 };
const KID1 = { shirt: 0xe0b040, pants: 0x3a6a9a, hair: 0x6a3a1a, skin: 0xf0b890, style: 'short' }, KID2 = { shirt: 0x7a5ab8, pants: 0x2f3d5c, hair: 0x2a1a10, skin: 0xd09a70, style: 'long' };
function person(sc, o) { const P = makeKid(o); addSmile(P); sc.add(P); return P; }
// a laugh: mouth flaps, eyes squeeze, head and shoulders shake (k = 0..1)
function laugh(P, u, t, k) { if (k <= 0) return; u.smile(1); u.mouthOpen(k * (0.35 + 0.3 * Math.abs(Math.sin(t * 15)))); u.lid(0.55 * k, t, 1); u.head.rotation.z += 0.09 * k * Math.sin(t * 9); u.head.rotation.x -= 0.15 * k; P.position.y += 0.025 * k * Math.abs(Math.sin(t * 15)); }

// ---------------------------------------------------------------------
// You on the sofa, tickling your own palm. Optionally headless (your point of view) or with an x-ray head.
// ---------------------------------------------------------------------
function palmSet(s, { pov = false, xray = false, ghost = false } = {}) {
  const sc = s.scene; const R = livingRoom(sc); const O = person(sc, OWNER);
  if (pov) { O.userData.head.visible = false; O.userData.torso.visible = false; O.children.forEach(m => { if (m.isMesh && (m.material === O.userData.skinM || m.material === O.userData.torso.material)) m.visible = false; }); }
  const glow = xray ? xrayHead(O) : null; const G = ghost ? ghostArm(sc, OWNER) : null;
  const X = R.sofa.x;
  const seat = (P, t) => { const u = P.userData; u.reset(); P.rotation.set(0, Math.PI, 0); P.position.set(X, 0, R.sofa.z - 0.15); seatOn(P, R.sofa.seatY); u.breathe(t, 0.25, 0.02); return u; };
  // the left palm rests in front of you, palm up; the right index finger draws little circles on it
  const PAng = +(new URLSearchParams(location.search).get('pa') ?? -1.35);
  const palmP = (P) => worldPt(P, V(0.08, 1.5, 0.62));
  const pose = (P, t, { reach = 1, wig = 1 } = {}) => {
    const u = seat(P, t), q = P.quaternion; const pp = palmP(P);
    ik2(P, u.arms[0], pp.clone().add(V(0, -0.02, 0)), V(-0.4, -1, 0.2).applyQuaternion(q)); palmUp(u.hands[0], PAng); u.hands[0].curl(0.15, 0.3);
    const circ = V(0.045 * Math.cos(t * 9), 0.0, 0.035 * Math.sin(t * 9)).multiplyScalar(wig * reach);
    const away = worldPt(P, V(-0.35, 1.5, 0.5)), tip = pp.clone().add(V(0.0, 0.11, -0.02)).add(circ);
    ik2(P, u.arms[1], lv(away, tip, reach), V(1, -1, 0.3).applyQuaternion(q));
    const h = u.hands[1]; h.curl(0.85); h.finger(3, 0.08 + 0.25 * reach * (0.5 + 0.5 * Math.sin(t * 18)) * wig); h.finger(2, 0.75);
    h.hand.rotation.y = 0.9; return u;
  };
  return { R, O, G, glow, pose, palmP, X };
}
function povPalm(s, tauOf) {
  // you on the sofa, tickling your own palm, completely unimpressed (the loop shot)
  const Z = palmSet(s); s.ap = 4.5; s.exposure = 1.08; s.bloom = 0.42;
  s.update = (t) => {
    const tau = tauOf(t); Z.R.update(tau); const u = Z.pose(Z.O, tau);
    u.smile(0.0); u.lid(0.38, tau, 2); u.raise(0.25 + 0.1 * Math.sin(tau * 0.7)); u.head.rotation.x += 0.12; u.head.rotation.z += 0.05;
    const face = headPt(Z.O, V(0, 0, 0.3)), pp = Z.palmP(Z.O), cp = V(Z.X - 0.45, 3.05, 1.55).add(V(0.02 * Math.sin(tau * 0.6), 0, 0.03 * tau));
    shoot(s.cam, cp, lv(face, pp, 0.42).add(V(0, 0.02, 0)), { fov: 42, t: tau, focus: cp.distanceTo(face), hand: 0.6 });
  };
}
shot(0, C.your, (s) => povPalm(s, t => t));

// 1) your brain sees it coming: an x-ray of your head; the brain lights up; a signal runs down to the hand
shot(C.your, C.every, (s) => {
  const Z = palmSet(s, { xray: true }); s.ap = 3.5; s.exposure = 1.08; s.bloom = 0.6;
  const n = 26, dm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.9, 3.2), toneMapped: false }), dots = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), dm); s.scene.add(m); dots.push(m); }
  s.update = (t) => {
    Z.R.update(t); const u = Z.pose(Z.O, t, { reach: 0.6 + 0.4 * Math.sin(t * 2) }); u.lid(0.15, t, 2); u.smile(0.3);
    const g = smooth(C.brain - 0.1, C.sees + 0.1, t); Z.glow(g * (0.7 + 0.3 * Math.sin(t * 12)));
    const bp = headPt(Z.O, V(0, 0.15, 0)), hp = u.hands[1].hand.getWorldPosition(new THREE.Vector3()), cur = new THREE.CatmullRomCurve3([bp, bp.clone().add(V(0.15, -0.4, -0.25)), lv(bp, hp, 0.6).add(V(0.1, 0, -0.3)), hp]);
    dots.forEach((m, i) => { const a = (((t - C.sees) * 1.4 + i / n) % 1 + 1) % 1; m.visible = t > C.sees - 0.05; m.position.copy(cur.getPointAt(a)); m.scale.setScalar(0.6 + 0.6 * Math.sin(Math.PI * a)); });
    const c = E.io(seg(t, C.your - 0.2, C.every + 0.3)), cp = lv(V(-1.65, 2.75, 2.75), V(-1.45, 2.6, 2.95), c);
    shoot(s.cam, cp, lv(bp, Z.palmP(Z.O), 0.45), { fov: 44, t, focus: cp.distanceTo(bp) });
  };
});

// 2) every time you move, it predicts what the touch will feel like: a ghost hand gets there first ----
shot(C.every, C.and, (s) => {
  const Z = palmSet(s, { ghost: true }); s.ap = 3; s.exposure = 1.08; s.bloom = 0.6;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 8, 48), glow(0x9fd0ff, 0.9)); s.scene.add(ring);
  const lead = 0.32, cyc = (tt) => { const a = (((tt - C.every) / 1.25) % 1 + 1) % 1; return a < 0.55 ? E.io(a / 0.55) : 1 - E.io((a - 0.55) / 0.45); };
  s.update = (t) => {
    Z.R.update(t); Z.pose(Z.O, t, { reach: cyc(t), wig: 0.4 }); Z.pose(Z.G, t + lead, { reach: cyc(t + lead), wig: 0.4 });
    const pp = Z.palmP(Z.O), arr = cyc(t), m = smooth(0.82, 0.98, arr);
    ring.position.copy(pp).add(V(0, 0.03, 0)); ring.rotation.x = Math.PI / 2; ring.scale.setScalar(0.6 + 1.6 * m); ring.material.opacity = 0.9 * m * (1 - smooth(0.98, 1, arr) * 0.5);
    const c = E.io(seg(t, C.every - 0.2, C.and + 0.3)), cp = lv(V(-1.25, 2.15, 3.2), V(-1.05, 2.05, 3.4), c);
    shoot(s.cam, cp, pp.clone().add(V(0.05, 0.12, 0)), { fov: 40, t, focus: cp.distanceTo(pp) });
  };
});

// 3) and turns the feeling down: a brain above a TICKLE knob that turns from 10 to 1 ------------------
shot(C.and, C.in_, (s) => {
  const sc = s.scene; sc.background = gradTex([[0, '#2a3346'], [1, '#0e1220']], 0.5, 0.4); sc.environment = MENV;
  sc.add(new THREE.HemisphereLight(0xdfe8ff, 0x202430, 0.9)); const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 3, 5); sc.add(key);
  const knob = tickleKnob(); knob.position.set(0, 0, 0); sc.add(knob);
  const brain = makeBrain(); brain.scale.multiplyScalar(0.42); brain.position.set(0, 1.3, -0.2); sc.add(brain); brain.material.emissive = new THREE.Color(0xff3a20);
  s.ap = 1.5; s.exposure = 1.1; s.bloom = 0.55;
  s.update = (t) => {
    const k = 1 - 0.9 * E.io(seg(t, C.turns - 0.05, C.down + 0.25)); knob.userData.set(k); brain.material.emissiveIntensity = 0.3 + 0.6 * k;
    brain.rotation.y = 0.4 + 0.15 * Math.sin(t * 0.8); brain.position.y = 1.3 + 0.03 * Math.sin(t * 1.5);
    const c = E.io(seg(t, C.and - 0.2, C.in_ + 0.3)), cp = lv(V(0.35, 0.75, 3.6), V(0.25, 0.7, 3.25), c);
    shoot(s.cam, cp, V(0, 0.55, 0), { fov: 40, t });
  };
});

// 4-7) the robot experiment ----------------------------------------------------------------------
function robotLab(s) {
  const sc = s.scene; const R = tickleLab(sc); const P = person(sc, VOL); const rob = robotArm(); rob.position.set(0.85, R.tableY, -0.45); sc.add(rob);
  const lev = leverHandle(); lev.position.set(-0.6, R.tableY, 0.42); sc.add(lev); const dbox = delayBox(); dbox.position.set(-0.05, R.tableY, -0.4); dbox.rotation.y = 0.15; sc.add(dbox);
  const meter = ringChart('TICKLE', 0xff6a4a, 0.2); sc.add(meter);
  const act = (t, { delay = 0, giggle = 0 } = {}) => {
    const u = seatAt(P, t, 0.05, 1.45, Math.PI, R.tableY - 0.3), q = P.quaternion;
    // the left hand moves the lever in little circles; the robot copies the motion onto the right palm, after the delay
    const mv = (tt) => V(0.07 * Math.cos(tt * 7), 0, 0.05 * Math.sin(tt * 7));
    lev.userData.set(0.35 * Math.sin(t * 7), 0.35 * Math.cos(t * 7)); const kn = lev.userData.knobW();
    ik2(P, u.arms[0], kn.clone().add(V(0, 0.02, 0)), V(-1, -1, 0.3).applyQuaternion(q)); u.hands[0].curl(0.8);
    const palm = V(0.55, R.tableY + 0.07, 0.62); ik2(P, u.arms[1], palm.clone().add(V(0, 0.0, 0.05)), V(1, -1, 0.3).applyQuaternion(q)); palmUp(u.hands[1], 1.35); u.hands[1].curl(0.12);
    rob.userData.reach(palm.clone().add(V(0, 0.12, 0)).add(mv(t - delay)));
    u.smile(0.3 + 0.7 * giggle); laugh(P, u, t, giggle); if (giggle) { u.hands[1].curl(0.12 + 0.5 * giggle * (0.5 + 0.5 * Math.sin(t * 13))); }
    return u;
  };
  return { R, P, rob, lev, dbox, meter, act };
}
shot(C.in_, C.when, (s) => {
  const L = robotLab(s); s.ap = 4; s.exposure = 1.0; s.bloom = 0.35; L.meter.visible = false;
  s.update = (t) => {
    L.act(t); L.dbox.userData.set(0);
    const c = E.io(seg(t, C.in_ - 0.2, C.when + 0.3)), cp = lv(V(2.75, 3.25, 3.4), V(2.35, 2.95, 3.0), c);
    shoot(s.cam, cp, V(0.2, 1.75, 0.35), { fov: 44, t, focus: cp.distanceTo(V(0.3, 1.5, 0.5)) });
  };
});
shot(C.when, C.add, (s) => {
  const L = robotLab(s); s.ap = 5; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => {
    const u = L.act(t); u.lid(0.32, t, 3); u.smile(0.15); L.dbox.userData.set(0);
    const face = headPt(L.P, V(0, 0, 0.3)), c = E.io(seg(t, C.when - 0.2, C.add + 0.3)), cp = lv(V(-0.35, 2.75, -1.05), V(-0.3, 2.7, -0.85), c);
    shoot(s.cam, cp, lv(face, V(0.4, 1.4, 0.6), 0.4).add(V(0.12, 0, 0)), { fov: 46, t, focus: cp.distanceTo(face) });
    pin(s.cam, L.meter, -0.16, 0.36, 1.6); L.meter.scale.setScalar(Math.max(0.0001, spring(t, C.copied, 1.8, 6))); L.meter.userData.set(0.12 * E.out(seg(t, C.copied, C.barely + 0.3)) + 0.02 * Math.sin(t * 9));
  };
});
shot(C.add, C.and2, (s) => {
  const L = robotLab(s); s.ap = 2.5; s.exposure = 1.0; s.bloom = 0.45; L.meter.visible = false; L.P.visible = false;
  s.update = (t) => {
    L.act(t, { delay: 0.2 * smooth(C.delay, C.second, t) }); const d = 0.2 * E.io(seg(t, C.delay - 0.05, C.second + 0.1)); L.dbox.userData.set(Math.round(d * 10) / 10 + (d > 0.001 && d < 0.199 ? 0.1 * (Math.floor(t * 12) % 2) * 0 : 0), d > 0.19 ? Math.max(0, 1 - (t - C.second - 0.1) * 3) : 0);
    L.dbox.updateMatrixWorld(true); const bx = L.dbox.localToWorld(V(-0.1, 0.3, 0.25)), c = E.io(seg(t, C.add - 0.2, C.and2 + 0.3)), cp = bx.clone().add(lv(V(0.22, 0.3, 1.35), V(0.18, 0.27, 1.15), c));
    shoot(s.cam, cp, bx, { fov: 44, t, focus: cp.distanceTo(bx) });
  };
});
shot(C.and2, C.the4, (s) => {
  const L = robotLab(s); s.ap = 5; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => {
    const g = smooth(C.tickle2 - 0.05, C.tickle2 + 0.25, t); L.act(t, { delay: 0.2, giggle: g }); L.dbox.userData.set(0.2);
    const face = headPt(L.P, V(0, 0, 0.3)), c = E.io(seg(t, C.and2 - 0.2, C.the4 + 0.3)), cp = lv(V(-0.3, 2.7, -0.95), V(-0.25, 2.62, -0.7), c);
    shoot(s.cam, cp, lv(face, V(0.4, 1.4, 0.6), 0.4).add(V(0.12, 0, 0)), { fov: 46, t, focus: cp.distanceTo(face) });
    pin(s.cam, L.meter, -0.16, 0.36, 1.6); L.meter.scale.setScalar(1 + 0.15 * wob(t, C.came, 3, 5)); L.meter.userData.set(0.12 + 0.8 * E.out(seg(t, C.tickle2, C.back + 0.2)) + 0.03 * Math.sin(t * 13) * g);
  };
});

// 8) the same trick starts poke wars: two kids on the sofa, each poke harder than the last -----------
shot(C.the4, C.in_2, (s) => {
  const sc = s.scene; const R = livingRoom(sc); const A = person(sc, KID1), B = person(sc, KID2); s.ap = 5; s.exposure = 1.08; s.bloom = 0.4;
  const pokes = [[C.same - 0.05, 0, 0.5], [C.trick + 0.05, 1, 0.75], [C.starts + 0.1, 0, 1.0], [C.poke + 0.05, 1, 1.3], [C.wars + 0.25, 0, 1.6]];
  s.update = (t) => {
    R.update(t); const uA = seatAt(A, t, R.sofa.x + 0.55, R.sofa.z - 0.15, Math.PI + 0.55, R.sofa.seatY), uB = seatAt(B, t + 1.3, R.sofa.x - 0.55, R.sofa.z - 0.15, Math.PI - 0.55, R.sofa.seatY);
    const ribs = (P, side) => worldPt(P, V(side * 0.32, 1.75, 0.15));
    [[A, uA, 0], [B, uB, 1]].forEach(([P, u, who]) => {
      const mine = pokes.filter(p => p[1] === who && t > p[0] - 0.25 && t < p[0] + 0.35).pop(), hit = pokes.filter(p => p[1] !== who && t > p[0] && t < p[0] + 0.45).pop();
      const other = who ? A : B, q = P.quaternion;
      if (mine) { const k = 1 - Math.abs(t - mine[0]) / 0.3, tgt = ribs(other, who ? -1 : 1); ik2(P, u.arms[who ? 0 : 1], lv(worldPt(P, V(who ? 0.3 : -0.3, 1.55, 0.45)), tgt, clamp(k * 1.4)), V(0, -1, 0.3).applyQuaternion(q)); u.hands[who ? 0 : 1].curl(0.85); u.hands[who ? 0 : 1].finger(3, 0.05); }
      else ik2(P, u.arms[who ? 0 : 1], worldPt(P, V(who ? 0.3 : -0.3, 1.25, 0.45)), V(0, -1, 0.3).applyQuaternion(q));
      ik2(P, u.arms[who ? 1 : 0], worldPt(P, V(who ? -0.3 : 0.3, 1.25, 0.45)), V(0, -1, 0.3).applyQuaternion(q));
      const r = hit ? wob(t, hit[0], 3, 5) * hit[2] : 0; P.rotation.z += (who ? 1 : -1) * 0.08 * r; u.wince(clamp(Math.abs(r) * 1.3)); u.smile(0.5); if (hit) u.mouthOpen(0.3 * clamp(Math.abs(r) * 2));
    });
    const c = E.io(seg(t, C.the4 - 0.2, C.in_2 + 0.3)), cp = lv(V(R.sofa.x, 2.55, 1.35), V(R.sofa.x, 2.45, 1.7), c);
    shoot(s.cam, cp, V(R.sofa.x, 1.95, R.sofa.z - 0.2), { fov: 48, t, focus: cp.distanceTo(V(R.sofa.x, 1.85, R.sofa.z)) });
  };
});

// 9-12) the finger-press study ------------------------------------------------------------------
function pressLab(s) {
  const sc = s.scene; const R = tickleLab(sc); const A = person(sc, PA), B = person(sc, PB); const rig = pressRig(); rig.position.set(0, R.tableY, 0.1); sc.add(rig);
  // turns: who presses (0 = A, 1 = B) and how hard (they escalate ~40% a turn)
  const T = [C.two - 0.1, C.pressing - 0.05, C.trying, C.match + 0.2, C.felt + 0.15, C.press - 0.1, C.always + 0.2, C.so + 0.1, C.every2 + 0.05, C.turn + 0.05, C.got + 0.1, C.harder + 0.15];
  const F = T.map((_, i) => Math.pow(1.4, i));
  const at = (t) => { let i = -1; for (let k = 0; k < T.length; k++) if (t >= T[k]) i = k; return i; };
  const act = (t, { faces = true } = {}) => {
    const uA = seatAt(A, t, -1.12, 0.1, Math.PI / 2, R.tableY - 0.3), uB = seatAt(B, t + 0.7, 1.12, 0.1, -Math.PI / 2, R.tableY - 0.3);
    const i = at(t), who = i % 2, k = i >= 0 ? Math.sin(Math.PI * clamp((t - T[i]) / 0.55)) : 0, f = i >= 0 ? F[i] : 0;
    const tilt = (who ? -1 : 1) * -0.06 * k * Math.min(1, 0.4 + 0.12 * f); rig.userData.set(tilt);
    [[A, uA, -1, 0], [B, uB, 1, 1]].forEach(([P, u, sd, w]) => {
      const q = P.quaternion, pressing = who === w && k > 0, under = who !== w && k > 0;
      const end = rig.userData.endW(sd), rest = rig.userData.restW(-sd);
      ik2(P, u.arms[sd < 0 ? 1 : 0], end.clone().add(V(0, 0.04 + (pressing ? -0.02 * k : 0), 0)), V(0, -1, 0.4).applyQuaternion(q)); u.hands[sd < 0 ? 1 : 0].curl(0.85); u.hands[sd < 0 ? 1 : 0].finger(3, 0.1);
      ik2(P, u.arms[sd < 0 ? 0 : 1], worldPt(P, V(sd < 0 ? 0.32 : -0.32, 1.32, 0.55)), V(0, -1, 0.3).applyQuaternion(q));
      if (faces) { u.smile(0.2); if (pressing) u.raise(0.3 * k); if (under) u.wince(clamp(0.25 * k * f)); }
    });
    return { i, who, k, f };
  };
  return { R, A, B, rig, act, T, F, at };
}
shot(C.in_2, C.pressing, (s) => {
  const L = pressLab(s); s.ap = 4; s.exposure = 1.0; s.bloom = 0.35;
  s.update = (t) => { L.act(t); const c = E.io(seg(t, C.in_2 - 0.2, C.pressing + 0.3)), cp = lv(V(0.2, 3.25, 4.9), V(0.15, 3.1, 4.5), c); shoot(s.cam, cp, V(0, 2.0, 0.1), { fov: 50, t, focus: cp.distanceTo(V(0, 1.8, 0.1)) }); };
});
shot(C.pressing, C.their2, (s) => {
  const L = pressLab(s); const bars = barChart(['A', 'B'], ['#6ad08a', '#ff7a5a'], { w: 0.16, gap: 0.1, H: 0.36 }); s.scene.add(bars); s.ap = 3; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => {
    const r = L.act(t); const end = L.rig.userData.endW(1), c = E.io(seg(t, C.pressing - 0.2, C.their2 + 0.3)), cp = lv(V(0.1, 2.55, 2.55), V(0.08, 2.45, 2.25), c);
    shoot(s.cam, cp, V(0, 1.85, 0.1), { fov: 50, t, focus: cp.distanceTo(V(0, 1.7, 0.1)) });
    const vA = [], vB = []; L.T.forEach((tt, i) => { if (t >= tt) (i % 2 ? vB : vA).push(L.F[i]); });
    pin(s.cam, bars, 0.0, 0.08, 1.3); bars.userData.set([(vA.length ? vA[vA.length - 1] : 0) / 6, (vB.length ? vB[vB.length - 1] : 0) / 6]);
  };
});
// 11) their own press always felt softer: PRESSED vs FELT
shot(C.their2, C.so, (s) => {
  const L = pressLab(s); const bars = barChart(['PRESSED', 'FELT'], ['#6ad08a', '#9ab8ff'], { w: 0.12, H: 0.3, gap: 0.1 }); s.scene.add(bars); s.ap = 4; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => {
    const r = L.act(t); const face = headPt(L.A, V(0, 0, 0.3)), c = E.io(seg(t, C.their2 - 0.2, C.so + 0.3)), cp = lv(V(0.35, 2.65, 2.05), V(0.25, 2.55, 1.8), c);
    shoot(s.cam, cp, lv(face, V(-0.5, 1.5, 0.1), 0.4).add(V(0.25, 0, 0)), { fov: 48, t, focus: cp.distanceTo(face) });
    const a = smooth(C.own2 - 0.1, C.press + 0.2, t), b = smooth(C.press + 0.1, C.always + 0.4, t);
    pin(s.cam, bars, 0.13, 0.05, 1.3); bars.userData.set([0.9 * a, 0.45 * b]);
  };
});
// 12) so every turn got harder: the bars climb, turn after turn
shot(C.so, C.so2, (s) => {
  const L = pressLab(s); const labels = ['1', '2', '3', '4', '5', '6', '7', '8'], bars = barChart(labels, ['#6ad08a', '#ff7a5a'], { w: 0.07, gap: 0.03, H: 0.3 }); s.scene.add(bars); s.ap = 4; s.exposure = 1.0; s.bloom = 0.4;
  const TT = labels.map((_, i) => C.so + 0.05 + i * 0.21);
  s.update = (t) => {
    L.act(t); const c = E.io(seg(t, C.so - 0.2, C.so2 + 0.3)), cp = lv(V(0.2, 3.35, 4.6), V(0.15, 3.2, 4.3), c);
    shoot(s.cam, cp, V(0, 2.1, 0.1), { fov: 50, t, focus: cp.distanceTo(V(0, 1.8, 0.1)) });
    pin(s.cam, bars, 0.0, 0.1, 1.3); bars.userData.set(TT.map((tt, i) => t > tt ? Math.pow(1.38, i) / Math.pow(1.38, 7) * E.out(clamp((t - tt) / 0.15)) : 0));
  };
});

// 13) so go ahead, try it right now: you hold out your palm to us
shot(C.so2, C.it6, (s) => {
  const Z = palmSet(s); s.ap = 4; s.exposure = 1.08; s.bloom = 0.42;
  s.update = (t) => {
    Z.R.update(t); const u = Z.pose(Z.O, t, { reach: smooth(C.try_ - 0.1, C.right, t), wig: 1 }); u.smile(0.85); u.lid(0.12, t, 4);
    const c = E.io(seg(t, C.so2 - 0.2, C.it6 + 0.3)), cp = lv(V(Z.X + 0.2, 2.85, 1.85), V(Z.X + 0.15, 2.75, 2.2), c);
    const face = headPt(Z.O, V(0, 0, 0.3)); const hp = u.head; // look at us
    hp.rotation.x -= 0.05; shoot(s.cam, cp, lv(face, Z.palmP(Z.O), 0.45), { fov: 44, t, focus: cp.distanceTo(face) });
  };
});

// 14) it won't work, because… → back to your point of view (loop)
shot(C.it6, END, (s) => povPalm(s, t => t - END));

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
