// =====================================================================
// SHOTS: "Why Dogs Shake Off Water"
// =====================================================================
const DS = 0.62, END = C.end;
function dogIn(sc, o = LAB, s = DS) { const d = makeDog(o); d.scale.setScalar(s); d.userData.collar.visible = false; sc.add(d); return d; }
const MAT = V(0.3, 0.02, 1.3);            // the bath mat
const TUBD = V(0.05, 0.2, -0.2);          // the dog standing in the bath
// the big drop that the fur's water collects into
function bigDrop(r = 0.3) {
  const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI; const y = -Math.cos(a), x = Math.sin(a) * (y > 0 ? Math.pow(1 - y, 0.85) * 1.0 : 1); pts.push(new THREE.Vector2(Math.max(1e-4, x * r), (y > 0 ? y * 1.7 : y) * r)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshPhysicalMaterial({ color: 0x8fd8ff, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.78, envMapIntensity: 2.2 }));
  return m;
}

// ---------------------------------------------------------------------
// 0 + 13) the loop: the dog climbs out of the bath, lands on the mat and starts to shake (real time);
// shot 0 picks up the same shake in slow motion. Both run on tau = seconds from the loop point.
// ---------------------------------------------------------------------
const LOOPSH = [{ s0: -0.78, dur: 1.55, f: 4.2 }];
function climbScene(s) {
  const sc = s.scene; const R = dayBath(sc); const d = dogIn(sc), u = d.userData; const sp = spray(sc, 650, { seed: 4 });
  const tw = towel(); sc.add(tw); const lens = lensDrops(sc, [{ t: 0.55, x: -0.05, y: 0.06, s: 0.05 }, { t: 1.15, x: 0.075, y: -0.03, s: 0.036 }, { t: 1.7, x: -0.09, y: -0.1, s: 0.044 }]);
  s.ap = 3.2; s.exposure = 1.02; s.bloom = 0.5;
  const P0 = V(0.25, 0.2, -0.3), P1 = V(0.3, 0.02, 1.12), tJ = C.out - END - 0.05, tL = tJ + 0.52;
  return (sim, t) => {
    // sim: seconds from the loop point in story time (slowed in shot 0); t: seconds from the loop point on screen
    const j = E.io(seg(sim, tJ, tL)), land = smooth(tL, tL + 0.3, sim), crouch = smooth(tJ - 0.35, tJ, sim) * (1 - smooth(tJ, tJ + 0.08, sim)) + 0.6 * wob(sim, tL, 2.5, 7) * (sim > tL ? 1 : 0);
    d.position.copy(P0).lerp(P1, j); d.position.y += Math.sin(Math.PI * j) * 0.95 - 0.05 * crouch; d.rotation.set(-0.32 * Math.sin(2 * Math.PI * j), 0.06 * (1 - j), 0);
    const look = s.cam.position.clone();
    if (sim < LOOPSH[0].s0 + 0.02) {
      wetStand(d, sim, { look, sad: 0.35, blink: 3, perk: -0.1 });
      // legs tucked in the air
      if (j > 0 && j < 1) { const tuck = Math.sin(Math.PI * j); u.legs.forEach((L, i) => u.paw(i, L.T.clone().add(V(0, 0.42 * tuck, (L.front ? 0.25 : -0.15) * tuck)), 0)); u.solve(); }
    } else {
      wetStand(d, sim, { look, sad: 0.2, blink: 3 });
      shakePose(d, sim, LOOPSH);
    }
    furState(d, { wet: 1, fling: sim > LOOPSH[0].s0 ? shakeFling(d, sim, LOOPSH) : 0 });
    sp(sim, dogEmitter(d, LOOPSH, { drip: { t0: -3.4, t1: 0.7, frac: 0.12, floor: j < 0.5 ? 0.6 : 0.03 } }), { floorY: 0.03 });
    R.ripple(sim, [[0.3, -0.12, -3.4, 0.01], [0.3, -0.1, tJ, 0.04]]);
    // camera: wide on the bath, settling low in front of the mat for the shake
    const c = E.io(seg(t, -3.2, -0.55)), cp = lv(V(1.15, 2.0, 5.6), V(0.42, 1.2, 4.75), c).add(V(-0.03 * clamp(t / 2.8, 0, 1), -0.03 * clamp(t / 2.8, 0, 1), -0.5 * E.io(clamp(t / 2.84, 0, 1))));
    const tg = lv(V(0.2, 1.05, 0.4), V(0.3, 0.95, 1.5), c);
    shoot(s.cam, cp, tg, { fov: lerp(44, 40, c), t, focus: cp.distanceTo(u.eyeW()), hand: 0.7 });
    // your towel, held up at the right edge
    const tk = E.out(seg(t, C.grab - END - 0.1, C.grab - END + 0.35)); tw.visible = tk > 0; if (tk > 0) { pin(s.cam, tw, 0.225 + 0.15 * (1 - tk), 0.5, 1.15); tw.rotateY(-0.55); tw.rotateZ(0.1 * (1 - tk)); tw.scale.setScalar(0.27); tw.userData.drape(t); }
    lens(s.cam, t);
  };
}
shot(0, C.a2, (s) => { const up = climbScene(s); s.update = (t) => up(t * 0.22, t); });

// 1) a soaked Labrador: close on the wet face in the bath; drips from the chin and ears -----------------
shot(C.a2, C.a3, (s) => {
  const sc = s.scene; const R = dayBath(sc); const d = dogIn(sc), u = d.userData; const sp = spray(sc, 260, { seed: 7 });
  s.ap = 2.4; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => {
    d.position.copy(TUBD); d.rotation.set(0, Math.PI / 2 - 0.55, 0);
    const c = E.io(seg(t, C.a2 - 0.2, C.a3 + 0.3)), cp = lv(V(1.25, 1.62, 1.45), V(1.12, 1.56, 1.3), c);
    wetStand(d, t, { look: cp, sad: 0.9, blink: 5, perk: -0.35 }); u.head.rotation.x += 0.12; u.lid(clamp(0.3 + 0.9 * blinkAt(t, 5)));
    furState(d, { wet: 1 });
    sp(t, dogEmitter(d, [], { drip: { t0: C.a2 - 1.2, t1: C.a3 + 0.3, frac: 1, floor: 0.6 } }));
    R.ripple(t, [[0.1, 0, C.a2 - 2, 0.006]]);
    shoot(s.cam, cp, u.eyeW().add(V(0, -0.1, 0)), { fov: 34, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 2) about a pound of water in its fur: water streams out of the fur into one big drop -----------------
shot(C.a3, C.drying, (s) => {
  const sc = s.scene; const R = dayBath(sc); const d = dogIn(sc), u = d.userData; const sp = spray(sc, 200, { seed: 8 });
  const drop = bigDrop(0.26); sc.add(drop); const lab = textPlane('1 lb', 0.72, '#ffffff', '#0f3a5a'); lab.material.depthTest = false; lab.renderOrder = 12; sc.add(lab);
  const n = 90, rr = rng(5), str = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.85, envMapIntensity: 2.2 }), n); str.frustumCulled = false; sc.add(str);
  const S0 = []; for (let i = 0; i < n; i++) S0.push({ x: rr(), z: rr(), del: rr(), s: 0.012 + 0.012 * rr() }); const o = new THREE.Object3D();
  s.ap = 3.5; s.exposure = 1.05; s.bloom = 0.5; const DP = V(0.62, 2.12, 0.25), tP = C.pound - 0.15;
  s.update = (t) => {
    d.position.copy(TUBD); d.rotation.set(0, Math.PI / 2 - 0.25, 0);
    const c = E.io(seg(t, C.a3 - 0.2, C.drying + 0.3)), cp = lv(V(0.75, 2.75, 3.3), V(0.7, 2.65, 3.0), c);
    wetStand(d, t, { look: lv(cp, DP, smooth(tP + 0.2, tP + 0.6, t)), sad: 0.8, blink: 6 });
    furState(d, { wet: 1 });
    sp(t, dogEmitter(d, [], { drip: { t0: C.a3 - 1, t1: C.drying + 0.3, frac: 1, floor: 0.6 } }));
    R.ripple(t, [[0.1, 0, C.a3 - 2, 0.006]]);
    // the stream: drops lift off the back and fly into the big drop
    let got = 0;
    S0.forEach((q, i) => { const st = tP + q.del * 1.0, a = clamp((t - st) / 0.55); const from = u.W(V((q.x - 0.5) * 0.6, 1.62, lerp(-0.8, 0.5, q.z))); const p = from.clone().lerp(DP, E.io(a)); p.y += Math.sin(Math.PI * a) * 0.35; o.position.copy(p); o.scale.setScalar(a <= 0 || a >= 1 ? 1e-4 : q.s * (1 - 0.3 * a)); o.updateMatrix(); str.setMatrixAt(i, o.matrix); if (a >= 1) got++; });
    str.instanceMatrix.needsUpdate = true;
    const g = got / n, wob2 = 1 + 0.06 * Math.sin(t * 9) * (1 - smooth(C.drying - 0.3, C.drying, t));
    drop.position.copy(DP).add(V(0, 0.02 * Math.sin(t * 2), 0)); drop.scale.set(wob2, 2 - wob2, wob2).multiplyScalar(Math.max(1e-4, 0.25 + 0.75 * E.out(g)) * Math.max(1e-4, spring(t, tP, 2, 6)));
    lab.position.copy(DP).add(V(0.0, -0.02, 0.3)); lab.quaternion.copy(s.cam.quaternion); lab.scale.setScalar(Math.max(1e-4, spring(t, C.pound + 0.05, 2.2, 6)));
    shoot(s.cam, cp, V(0.45, 1.45, -0.1), { fov: 46, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 3) drying that with body heat would…: out on the mat, shivering, steam rising off its back -----------
shot(C.drying, C.burn, (s) => {
  const sc = s.scene; const R = dayBath(sc); const d = dogIn(sc), u = d.userData; const sp = spray(sc, 160, { seed: 9 }); const st = steam(sc, 40);
  s.ap = 3; s.exposure = 1.04; s.bloom = 0.5;
  s.update = (t) => {
    d.position.copy(MAT); d.rotation.set(0, Math.PI / 2 - 0.35, 0);
    const c = E.io(seg(t, C.drying - 0.2, C.burn + 0.3)), cp = lv(V(2.1, 1.35, 3.25), V(1.95, 1.3, 3.0), c);
    wetStand(d, t, { look: cp, sad: 0.8, blink: 7, shiver: 1 });
    furState(d, { wet: 1 });
    sp(t, dogEmitter(d, [], { drip: { t0: C.drying - 1, t1: C.burn + 0.3, frac: 1, floor: 0.03 } }));
    st(t, s.cam, (x, z) => u.W(V(x * 0.5, 1.68, lerp(-0.75, 0.4, z))), smooth(C.drying, C.with_ + 0.2, t));
    shoot(s.cam, cp, u.W(V(0, 1.4, 0)), { fov: 44, t, focus: cp.distanceTo(u.W(V(0, 1.4, 0))) });
  };
});

// 4) …burn about a fifth of its daily food: a wedge of the kibble burns away; "1/5" ---------------------
shot(C.burn, C.so, (s) => {
  const sc = s.scene; const R = dayBath(sc); const d = dogIn(sc), u = d.userData; const BP = V(1.32, 0, 1.72); const kb = kibbleBowl(sc, BP, 0.28);
  const ring = ringChart('1/5', 0xff8a3a, 0.2); ring.traverse(o => o.userData.noDof = true); sc.add(ring);
  const n = 40, rr = rng(3), emb = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), hdr(3.0, 1.3, 0.35, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), n); emb.frustumCulled = false; sc.add(emb); const E0 = []; for (let i = 0; i < n; i++) E0.push([rr(), rr(), rr(), rr()]); const o = new THREE.Object3D();
  s.ap = 2.4; s.exposure = 1.04; s.bloom = 0.6; const tB = C.about2;
  s.update = (t) => {
    d.position.copy(MAT); d.rotation.set(0, Math.PI / 2 - 0.15, 0);
    wetStand(d, t, { look: BP.clone().add(V(0, 0.1, 0)), sad: 1, blink: 8, perk: -0.4 }); furState(d, { wet: 1 });
    const burn = E.io(seg(t, tB, C.food + 0.2)); kb.update(burn, -0.95);
    E0.forEach((q, i) => { const a = ((t - tB) * (0.7 + 0.5 * q[3]) + q[0]) % 1, on = t > tB && t < C.so + 0.3; const ang = -0.95 + q[1] * kb.WEDGE, rad = 0.08 + 0.15 * q[2]; o.position.set(BP.x + Math.cos(ang) * rad, BP.y + 0.08 + a * 0.45, BP.z + Math.sin(ang) * rad).add(V(0.03 * Math.sin(t * 5 + i), 0, 0)); o.scale.setScalar(on ? 0.008 * (1 - a) * (0.5 + q[3]) : 1e-4); o.updateMatrix(); emb.setMatrixAt(i, o.matrix); });
    emb.instanceMatrix.needsUpdate = true;
    const c = E.io(seg(t, C.burn - 0.2, C.so + 0.3)), cp = lv(V(2.2, 0.82, 3.0), V(2.08, 0.76, 2.82), c);
    shoot(s.cam, cp, V(1.12, 0.5, 1.58), { fov: 42, t, focus: cp.distanceTo(BP) });
    pin(s.cam, ring, 0.085, 0.06, 1.6); ring.scale.setScalar(Math.max(1e-4, spring(t, C.fifth - 0.05, 1.8, 6))); ring.userData.set(0.2 * E.out(seg(t, C.fifth, C.fifth + 0.5)));
  };
});

// 5) so instead, it shakes: the dog plants its feet; the shake starts at the head (real time) ---------
const SH5 = [{ s0: C.it - 0.12, dur: 1.45, f: 4.2 }];
shot(C.so, C.it2, (s) => {
  const sc = s.scene; const R = dayBath(sc); const d = dogIn(sc), u = d.userData; const sp = spray(sc, 700, { seed: 10 });
  s.ap = 3.2; s.exposure = 1.04; s.bloom = 0.5;
  s.update = (t) => {
    d.position.copy(MAT); d.rotation.set(0, Math.PI / 2 - 0.5, 0);
    const c = E.io(seg(t, C.so - 0.2, C.it2 + 0.3)), cp = lv(V(2.15, 1.25, 3.55), V(2.0, 1.15, 3.3), c);
    wetStand(d, t, { look: cp, sad: 0.4, blink: 9 }); const pre = smooth(C.instead, C.it, t); d.position.y -= 0.01 * pre;
    shakePose(d, t, SH5);
    furState(d, { wet: 1 - 0.25 * smooth(SH5[0].s0, SH5[0].s0 + 1.2, t), fling: shakeFling(d, t, SH5) });
    sp(t, dogEmitter(d, SH5, { drip: { t0: C.so - 1, t1: C.it, frac: 0.1, floor: 0.03 } }));
    shoot(s.cam, cp, u.W(V(0, 1.25, 0.15)), { fov: 46, t, focus: cp.distanceTo(u.W(V(0, 1.4, 0.3))) });
  };
});

// slow-motion shake shots: story time runs at `rate`, from the shake's start
const SLOW = [{ s0: 0, dur: 1.6, f: 4.2 }];
function slowShake(s, t0, rate, sim0, { wet0 = 1 } = {}) {
  const sc = s.scene; const R = dayBath(sc); const d = dogIn(sc), u = d.userData; const sp = spray(sc, 900, { seed: 11 + Math.round(t0) });
  const sim = (t) => sim0 + (t - t0) * rate;
  const pose = (t, look) => {
    const m = sim(t); d.position.copy(MAT); d.rotation.set(0, Math.PI / 2, 0);
    wetStand(d, m, { look, sad: 0.2, blink: 9 }); const sp2 = shakePose(d, m, SLOW);
    furState(d, { wet: wet0 * (1 - 0.3 * smooth(0.1, 1.3, m)), fling: shakeFling(d, m, SLOW) });
    sp(m, dogEmitter(d, SLOW, { gain: 1 }), { stretch: 0.03 }); return { m, ...sp2 };
  };
  return { R, d, u, pose, sim };
}

// 6) it twists back and forth about four times a second: slow motion, from the front -------------------
shot(C.it2, C.starting, (s) => {
  const S6 = slowShake(s, C.it2, 0.2, 0.2); const sc = s.scene; const lab = textPlane('4 TIMES A SECOND', 0.7, '#ffffff', '#1a3a5a'); lab.userData.noDof = true; sc.add(lab);
  const dots = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false })); m.userData.noDof = true; sc.add(m); return m; });
  s.ap = 2.8; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => {
    const c = E.io(seg(t, C.it2 - 0.2, C.starting + 0.3)), cp = lv(V(3.05, 1.2, 1.78), V(2.85, 1.15, 1.66), c);
    const st = S6.pose(t, cp); const u = S6.u;
    shoot(s.cam, cp, u.W(V(0, 1.35, 0.5)), { fov: 42, t, focus: cp.distanceTo(u.eyeW()), hand: 0.5 });
    const k = spring(t, C.four - 0.08, 2, 6); pin(s.cam, lab, 0, 0.255, 1.6); lab.scale.setScalar(Math.max(1e-4, k));
    const cyc = Math.floor(4.2 * st.m * 2) / 2; // a dot per half swing pair
    dots.forEach((m, i) => { pin(s.cam, m, -0.09 + i * 0.06, 0.205, 1.6); const on = t > C.four && ((Math.floor(4.2 * st.m) % 4 + 4) % 4) >= i; m.scale.setScalar(Math.max(1e-4, k) * (on ? 0.02 : 0.014)); m.material.color.setRGB(on ? 1.4 : 0.9, on ? 0.75 : 0.9, on ? 0.3 : 0.9); m.material.opacity = on ? 1 : 0.55; });
  };
});

// 7) starting at the head and rippling down to the tail: from above, a pulse runs along the spine --------
shot(C.starting, C.its3, (s) => {
  const S7 = slowShake(s, C.starting, 0.18, 0.35); const line = spineWave(S7.d);
  s.ap = 2.2; s.exposure = 1.05; s.bloom = 0.65;
  s.update = (t) => {
    const c = E.io(seg(t, C.starting - 0.2, C.its3 + 0.3)), cp = lv(V(0.38, 4.05, 1.42), V(0.38, 3.85, 1.38), c);
    const st = S7.pose(t, cp.clone().add(V(1.5, -2.5, 0)));
    line.material.uniforms.p.value = ((4.2 * st.m * 0.5) % 1) * 1.3 - 0.12; line.material.uniforms.fade.value = smooth(C.starting - 0.1, C.starting + 0.25, t);
    shoot(s.cam, cp, V(0.36, 0.5, 1.32), { fov: 46, t, focus: cp.distanceTo(V(0.3, 1.0, 1.3)) }); s.cam.up.set(1, 0, -0.12); s.cam.lookAt(V(0.36, 0.5, 1.32));
  };
});

// 8) its loose skin whips around even further: from behind, BODY vs SKIN arcs ------------------------------
shot(C.its3, C.flinging, (s) => {
  const S8 = slowShake(s, C.its3, 0.2, 0.3); const arcs = swingArcs(); S8.d.add(arcs); arcs.position.set(0, 1.2, -1.35);
  s.ap = 2.6; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => {
    const c = E.io(seg(t, C.its3 - 0.2, C.flinging + 0.3)), cp = lv(V(-1.66, 1.8, 1.36), V(-1.55, 1.74, 1.32), c);
    const st = S8.pose(t, cp);
    const tr = shakeA(st.m, SLOW, LAG.torso, AMP.torso), sk = shakeA(st.m - 0.03, SLOW, LAG.torso, AMP.torso * AMP.skin);
    arcs.userData.set(tr, sk, Math.max(1e-4, spring(t, C.loose - 0.05, 2, 6)));
    shoot(s.cam, cp, S8.u.W(V(0, 1.2, -0.1)), { fov: 50, t, focus: cp.distanceTo(S8.u.W(V(0, 1.2, -0.9))) });
  };
});

// 9) flinging the water off faster: close on the back, drops peel off the fur --------------------------
shot(C.flinging, C.in_2, (s) => {
  const S9 = slowShake(s, C.flinging, 0.12, 0.45);
  s.ap = 1.6; s.exposure = 1.06; s.bloom = 0.6;
  s.update = (t) => {
    const c = E.io(seg(t, C.flinging - 0.2, C.in_2 + 0.3)), cp = lv(V(2.3, 1.5, 2.7), V(2.18, 1.46, 2.55), c);
    S9.pose(t, cp.clone().add(V(0.6, 0, 0.6)));
    shoot(s.cam, cp, S9.u.W(V(0, 1.6, 0.6)), { fov: 36, t, focus: cp.distanceTo(S9.u.W(V(0, 1.9, 0.9))), hand: 0.4 });
  };
});

// 10) in about four seconds, seventy percent of the water is gone: two real-time shakes, a gauge ----------
const SH10 = [{ s0: 0.15, dur: 1.25, f: 4.2 }, { s0: 2.0, dur: 1.3, f: 4.2 }];
shot(C.in_2, C.smaller, (s) => {
  const sc = s.scene; const R = dayBath(sc); const d = dogIn(sc), u = d.userData; const sp = spray(sc, 900, { seed: 12 }); const card = gaugeCard(0.34); sc.add(card);
  s.ap = 3.4; s.exposure = 1.04; s.bloom = 0.5; const rate = 4.05 / (C.smaller - C.in_2);
  s.update = (t) => {
    const m = (t - C.in_2) * rate;
    d.position.copy(MAT); d.rotation.set(0, Math.PI / 2 - 0.6, 0);
    const c = E.io(seg(t, C.in_2 - 0.2, C.smaller + 0.3)), cp = lv(V(2.3, 1.45, 3.7), V(2.15, 1.38, 3.45), c);
    wetStand(d, m, { look: cp, sad: 0.1, blink: 10 }); shakePose(d, m, SH10);
    const gone = 0.7 * (0.62 * smooth(0.2, 1.3, m) + 0.38 * smooth(2.05, 3.2, m));
    furState(d, { wet: 1 - gone * 1.2, puff: smooth(2.8, 3.9, m) * 0.5, fling: shakeFling(d, m, SH10) });
    sp(m, dogEmitter(d, SH10, {}));
    shoot(s.cam, cp, u.W(V(0, 1.2, 0.2)).add(V(-0.25, 0.25, 0)), { fov: 46, t, focus: cp.distanceTo(u.eyeW()) });
    pin(s.cam, card, -0.105, 0.16, 1.2); card.scale.setScalar(Math.max(1e-4, spring(t, C.in_2 + 0.05, 2, 6))); card.userData.draw(gone, clamp(m, 0, 4));
  };
});

// 11) smaller animals have to shake faster: a big dog and a little terrier shake side by side -------------
shot(C.smaller, C.a6, (s) => {
  const sc = s.scene; const R = dayBath(sc); const B = dogIn(sc), K = dogIn(sc, TERRIER, 0.33); const spB = spray(sc, 600, { seed: 13 }), spK = spray(sc, 400, { seed: 14, size: 0.6 });
  const SB = [{ s0: C.smaller + 0.1, dur: 2.0, f: 4.2 }], SK = [{ s0: C.smaller + 0.05, dur: 2.0, f: 7.0 }];
  s.ap = 3.6; s.exposure = 1.04; s.bloom = 0.5;
  s.update = (t) => {
    B.position.set(0.05, 0.02, 1.25); B.rotation.set(0, Math.PI / 2 - 0.45, 0); K.position.set(1.45, 0.02, 1.85); K.rotation.set(0, Math.PI / 2 - 0.85, 0);
    const c = E.io(seg(t, C.smaller - 0.2, C.a6 + 0.3)), cp = lv(V(2.75, 1.75, 4.85), V(2.6, 1.7, 4.6), c);
    wetStand(B, t, { look: cp, sad: 0.1, blink: 11 }); shakePose(B, t, SB); furState(B, { wet: 0.8, fling: shakeFling(B, t, SB) }); spB(t, dogEmitter(B, SB, {}));
    wetStand(K, t, { look: cp, sad: 0.1, blink: 12 }); shakePose(K, t, SK); furState(K, { wet: 0.8, fling: shakeFling(K, t, SK) }); spK(t, dogEmitter(K, SK, { gain: 0.8 }));
    shoot(s.cam, cp, V(0.75, 0.8, 1.5), { fov: 44, t, focus: cp.distanceTo(V(0.9, 0.6, 1.6)) });
  };
});

// 12) a mouse does it thirty times a second: a tiny wet mouse, shown eight times slower ----------------
shot(C.a6, C.so2, (s) => {
  const sc = s.scene; const R = dayBath(sc); const mo = makeMouse(); mo.scale.setScalar(0.55); sc.add(mo); const mu = mo.userData; const sp = spray(sc, 260, { seed: 15, size: 0.35 });
  const lab = textPlane('30 TIMES A SECOND', 0.4, '#ffffff', '#1a3a5a'), tag = textPlane('SLOWED DOWN 8×', 0.24, '#ffd36a', '#1a3a5a'); [lab, tag].forEach(l => { l.userData.noDof = true; l.material.depthTest = false; l.renderOrder = 15; sc.add(l); });
  const MS = [{ s0: 0.08, dur: 0.5, f: 30 }]; const MP = V(1.5, 0.02, 2.25);
  s.ap = 1.4; s.exposure = 1.06; s.bloom = 0.5;
  s.update = (t) => {
    const m = (t - C.a6) / 8 + 0.0;
    mo.position.copy(MP); mo.rotation.set(0, 0.55, 0); mu.update(t * 0.2, 0, 0);
    const k = shakeEnv(m, MS[0]), r = shakeA(m, MS, 0, 0.55), rh = shakeA(m, MS, -0.01, 0.4);
    mo.rotation.z = r; mu.body.rotation.z = 0; mu.hd.rotation.z = rh; mo.position.y += 0.004 * k;
    furState(mo, { wet: 1 - 0.4 * smooth(0.1, 0.6, m) });
    mo.updateMatrixWorld(true); const M4 = mo.matrixWorld.clone(), Q = mo.getWorldQuaternion(new THREE.Quaternion());
    sp(m, (i, D) => { const te = MS[0].s0 + 0.03 + (MS[0].dur - 0.12) * Math.pow(D.a, 1.3), roll = shakeA(te, MS, 0, 1.2), w = shakeW(te, MS, 0, 1.2), be = (D.d - 0.5) * 3.6 + roll, rad = 0.16, cz = lerp(-0.22, 0.28, D.c);
      const p = V(-Math.sin(be) * rad, 0.15 + Math.cos(be) * rad, cz).applyMatrix4(M4), v = V(-Math.cos(be), -Math.sin(be), 0).multiplyScalar(w * rad * 0.06).add(V(-Math.sin(be), Math.cos(be), 0).multiplyScalar(0.6)).applyQuaternion(Q).multiplyScalar(0.55);
      return { te, p, v }; }, { floorY: 0.03, life: 0.4 });
    const c = E.io(seg(t, C.a6 - 0.2, C.so2 + 0.3)), cp = lv(V(2.12, 0.42, 3.22), V(2.02, 0.38, 3.08), c);
    shoot(s.cam, cp, MP.clone().add(V(0, 0.09, 0)), { fov: 30, t, focus: cp.distanceTo(MP), hand: 0.5 });
    pin(s.cam, lab, 0, 0.14, 1.6); lab.scale.setScalar(Math.max(1e-4, spring(t, C.thirty - 0.05, 2, 6)));
    pin(s.cam, tag, 0, 0.098, 1.6); tag.scale.setScalar(Math.max(1e-4, spring(t, C.a6 + 0.1, 2, 6)));
  };
});

// 13) so when your dog climbs out of the bath, grab a towel, because… → (loop) ------------------------
shot(C.so2, END, (s) => { const up = climbScene(s); s.update = (t) => up(t - END, t - END); });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
