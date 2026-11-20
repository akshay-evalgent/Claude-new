// =====================================================================
// SHOTS: "Why Your Stomach Growls"
// =====================================================================
const END = C.end;
const ease = E.io;

// ---------- the exam hall, shared by the first and last shots; `tau` is time from the loop point ----------
// growls that shake the glass, in tau: "roars" at the end, "growl" and "food" at the start
const GROWLS = [[C.roars - END + 0.08, 1.3], [C.growl + 0.05, 1.4], [C.food + 0.12, 0.7]];
function hallScene(s) {
  const R = examHall(s.scene, { heroCol: 2, heroRow: 3 }); s.ap = 3.2; s.exposure = 0.98; s.bloom = 0.18;
  const gp = () => { R.hero.cell.updateMatrixWorld(true); return R.glass.getWorldPosition(V(0, 0, 0)).add(V(0, 0.082, 0)); };
  const G0 = gp();
  // camera keys: wide from the back of the hall, over the hero's shoulder, down to the glass
  const macro = G0.clone().add(V(-0.13, 0.3, -0.6));
  const path = new THREE.CatmullRomCurve3([V(-1.15, 1.95, -4.6), V(-0.8, 1.6, -2.7), V(-0.42, 1.36, -1.5), macro]);
  const look = new THREE.CatmullRomCurve3([V(-0.1, 0.95, 0.6), V(-0.15, 0.95, 0.1), V(-0.2, 0.96, -0.35), G0.clone().add(V(0, -0.004, 0))]);
  return (tau) => {
    // neighbours glance over at the growl, then go back to their papers
    const turn = smooth(-2.25, -1.7, tau) * (1 - smooth(1.6, 2.6, tau));
    R.students.forEach(({ st, hero, k }) => {
      const near = Math.abs(st.parent.position.x - R.hero.cell.position.x) < 1.4 && Math.abs(st.parent.position.z - R.hero.cell.position.z) < 1.5 && !hero;
      const side = Math.sign(R.hero.cell.position.x - st.parent.position.x) || 1;
      st.userData.pose(tau + 40, hero ? { lean: 0.32 + 0.12 * smooth(-2.2, -1.5, tau) * (1 - smooth(2.0, 3.0, tau)), write: 1 - turn, look: 0.42 } : { turn: near ? turn * (0.7 + 0.3 * h3(k, 1, 2)) : 0, turnYaw: -0.7 * side, write: near ? 1 - turn : 1 });
    });
    R.glass.userData.ripple(tau, GROWLS);
    // tau in [-3.13, 0]: the push-in; tau > 0: hold close on the glass with a slow drift
    const k = ease(seg(tau, C.so2 - END, 0)), q = tau > 0 ? 1 : k;
    const p = path.getPoint(q).add(tau > 0 ? V(0.02 * tau, 0.006 * tau, 0.012 * tau) : V(0, 0, 0)), tg = look.getPoint(q);
    shoot(s.cam, p, tg, { fov: lerp(42, 26, k), t: tau + 50, hand: 0.6, focus: p.distanceTo(G0) });
    s.ap = lerp(1.2, 3.2, k);
  };
}
// 0) That growl isn't your stomach begging for food: the glass trembles in the silent exam hall (loop)
shot(0, C.its, (s) => { const up = hallScene(s); s.update = (t) => up(t); });

// 1) It's your gut cleaning house: the whole gut, a squeeze starting at the top of the stomach
shot(C.its, C.when, (s) => {
  const sc = s.scene; anatomyStudio(sc); const G = makeGut(sc); s.ap = 1.2; s.exposure = 0.9; s.bloom = 0.12;
  s.update = (t) => {
    const k = seg(t, C.its, C.when);
    G.update(t, { wave: lerp(0.12, 0.32, k) * G.LST, amp: 0.6 });
    const a = lerp(-0.32, 0.06, ease(k)), d = lerp(1.32, 1.2, k), tg = V(0.0, -0.13, 0);
    shoot(s.cam, tg.clone().add(V(Math.sin(a) * d, 0.04, Math.cos(a) * d)), tg, { fov: 38, t, hand: 0.4, focus: d });
  };
});

// 2) When your stomach's been empty for a while: inside the empty stomach, wet folds, a puddle
shot(C.when, C.about, (s) => {
  const sc = s.scene; const I = stomachInside(sc); s.ap = 2.2; s.exposure = 1.1; s.bloom = 0.22;
  s.update = (t) => {
    const k = seg(t, C.when, C.about), u = lerp(0.1, 0.19, k);
    const p = I.curve.getPointAt(u).add(V(0.1, 0.2, 0)), tg = I.curve.getPointAt(u + 0.16).add(V(-0.1, -0.15, 0));
    shoot(s.cam, p, tg, { fov: 62, t, hand: 0.8, focus: 1.6 });
    I.update(t, s.cam);
  };
});

// 3) about every hour and a half: a wall clock, ninety minutes passing, the sunlight sliding across the wall
shot(C.about, C.a3, (s) => {
  const sc = s.scene; const K = clockWall(sc); const lab = liveLabel(0.11, 0.3); sc.add(lab); s.ap = 2.4; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => {
    const k = seg(t, C.about, C.a3), m = 90 * ease(seg(t, C.about + 0.05, C.a3 - 0.15));
    K.set(m, k);
    const p = V(lerp(0.32, 0.2, k), lerp(2.18, 2.22, k), lerp(1.25, 0.98, k)), tg = V(0, 2.25, 0);
    shoot(s.cam, p, tg, { fov: 34, t, hand: 0.4, focus: p.distanceTo(tg) });
    const mm = Math.round(m), hh = Math.floor(mm / 60);
    lab.userData.set([[`+${hh} h ${String(mm % 60).padStart(2, '0')} min`, 130, 0.5, '#2e2924', 800]]); pin(s.cam, lab, 0, -0.1, 0.6);
  };
});

// 4) a powerful wave of muscle squeezes through it: close on the stomach, the ring of muscle travelling down
shot(C.a3, C.and2, (s) => {
  const sc = s.scene; anatomyStudio(sc); const G = makeGut(sc); s.ap = 2.6; s.exposure = 0.9; s.bloom = 0.12;
  s.update = (t) => {
    const k = seg(t, C.a3, C.and2), w = lerp(0.2, 0.76, ease(k)) * G.LST;
    G.update(t, { wave: w, amp: 0.62, width: 0.034 });
    const ring = G.st.userData.at(w / G.LST, 0, 0), tg = lv(V(-0.02, 0.03, 0.02), ring, 0.55), p = tg.clone().add(V(0.22, 0.04, 0.55));
    shoot(s.cam, p, tg, { fov: 34, t, hand: 0.5, focus: p.distanceTo(tg) });
  };
});

// 5) and down your intestines: the squeeze runs on into the coils, the camera riding along
shot(C.and2, C.sweeping, (s) => {
  const sc = s.scene; anatomyStudio(sc); const G = makeGut(sc); s.ap = 2.8; s.exposure = 0.9; s.bloom = 0.12;
  s.update = (t) => {
    const k = seg(t, C.and2, C.sweeping), w = G.LST * 0.86 + lerp(0.0, 0.62, k);
    G.update(t, { wave: w, amp: 0.6, width: 0.03 });
    const u = clamp((w - G.LST) / G.LSI, 0, 1), tg = G.si.userData.at(u, 0, 0), p = tg.clone().add(V(0.12, 0.08, 0.36));
    shoot(s.cam, p, tg, { fov: 36, t, hand: 0.5, focus: p.distanceTo(tg) });
  };
});

// 6) sweeping out leftover scraps: inside the intestine, the squeeze closes in and pushes crumbs away
shot(C.sweeping, C.with_, (s) => {
  const sc = s.scene; const I = intestineInside(sc); s.ap = 2.0; s.exposure = 1.1; s.bloom = 0.2;
  s.update = (t) => {
    const k = seg(t, C.sweeping, C.with_);
    const p = I.curve.getPointAt(0.13).add(V(0.12, 0.22, 0)), tg = I.curve.getPointAt(0.24).add(V(-0.05, -0.2, 0));
    shoot(s.cam, p, tg, { fov: 64, t, hand: 0.7, focus: 1.8 });
    I.update(t, s.cam, { c: lerp(0.09, 0.5, E.inQ(k) * 0.4 + k * 0.6), amp: 0.72, w: 0.035 });
  };
});

// a tilted cut-away intestine with gas and fluid; `c` is where the squeeze is (0..1)
function cutawayScene(s, { pipe = false } = {}) {
  const sc = s.scene;
  if (pipe) { sc.background = PIPEHDR.tex; sc.backgroundBlurriness = 0.5; sc.backgroundIntensity = 0.55; sc.environment = PIPEHDR.env; }
  else anatomyStudio(sc, { env: 0.8 });
  const holder = new THREE.Group(); holder.rotation.z = pipe ? 0.0 : 0.38; sc.add(holder);
  const CA = gutCutaway(holder, pipe ? { R0: 0.24, len: 3.2, outMat: ironMat([8, 3]), inMat: ironMat([8, 3], 0xb8a898, 0.75), edgeMat: new THREE.MeshPhysicalMaterial({ color: 0x8a8580, metalness: 0.9, roughness: 0.3 }), fluid: fluidMat(0x9ab8c0), thick: 0.025 } : {});
  const bubbles = [0.9, 0.7, 0.55, 0.4].map((r) => { const b = bubble(1); holder.add(b); return b; });
  if (!pipe) { const key = new THREE.SpotLight(0xfff1e6, 30, 6, 0.7, 0.6, 1.6); key.position.set(-0.8, 1.6, 2.2); key.target.position.set(0, 0, 0); sc.add(key, key.target); }
  else { const key = new THREE.SpotLight(0xffe8cc, 60, 7, 0.7, 0.6, 1.5); key.position.set(-0.6, 1.8, 2.4); key.castShadow = true; sc.add(key); const fl = new THREE.PointLight(0xcfe0ff, 3, 4, 1.5); fl.position.set(0.8, 0.2, 1.2); sc.add(fl); }
  return { CA, holder, bubbles };
}
// gas pockets ride just ahead of the squeeze; each is squashed to fit the local tube radius
function placeBubbles(Z, t, c, w, shape, list) {
  const ri = Z.CA.rIn();
  list.forEach(([u0, rf, lane], i) => {
    const b = Z.bubbles[i]; if (!b) return;
    const u = c >= 0 ? Math.max(u0, c + w * (1.15 + i * 0.35)) : u0, sc = shape(u, Math.PI / 2, t), rLoc = ri * sc;
    let rad = rf * ri, sx = 1, sy = 1; if (rad > rLoc * 0.92) { const f = rLoc * 0.92 / rad; sy = f; sx = 1 / (f * f) * 0.9; }
    b.position.copy(Z.CA.out.userData.at(clamp(u, 0.02, 0.98), 0, rLoc - rad * sy * 1.02 + lane * 0.0));
    b.scale.set(rad * sx, rad * sy, rad * sy); b.lookAt(b.position.clone().add(Z.CA.out.userData.F.T[Math.round(clamp(u) * 300)]));
    b.rotateY(Math.PI / 2);
  });
}
// 7) With no food inside, that wave pushes only gas and liquid
shot(C.with_, C.so, (s) => {
  const Z = cutawayScene(s); s.ap = 1.6; s.exposure = 1.0; s.bloom = 0.15;
  const lg = liveLabel(0.2, 0.25), ll = liveLabel(0.2, 0.25); s.scene.add(lg, ll); lg.userData.set([['GAS', 140, 0.5]]); ll.userData.set([['LIQUID', 140, 0.5]]);
  s.update = (t) => {
    const k = seg(t, C.with_, C.so), c = lerp(0.12, 0.48, ease(k)), w = 0.06;
    const shape = (u, a, tt) => waveAt(u, c, w, 0.7) * (1 + 0.012 * Math.sin(tt * 1.5 + u * 9));
    Z.CA.update(t, { shape, level: (u) => -0.5 + 0.55 * Math.exp(-Math.pow((u - c - w * 1.3) / (w * 1.3), 2)) - 0.4 * smooth(0.2, 1.4, (c - u) / w) });
    placeBubbles(Z, t, c, w, shape, [[0.5, 0.42, 0], [0.62, 0.34, 0], [0.74, 0.28, 0], [0.84, 0.22, 0]]);
    const tg = Z.CA.out.userData.at(c + 0.12, 0, 0).applyMatrix4(Z.holder.matrixWorld), p = tg.clone().add(V(0.05, 0.12, 1.45));
    shoot(s.cam, p, tg, { fov: 38, t, hand: 0.5, focus: p.distanceTo(tg) });
    pin(s.cam, lg, 0.0, 0.2, 1.2); lg.scale.setScalar(Math.max(1e-4, spring(t, C.gas, 2, 6)));
    pin(s.cam, ll, 0.0, -0.19, 1.2); ll.scale.setScalar(Math.max(1e-4, spring(t, C.liquid, 2, 6)));
  };
});

// 8) so the bubbles squeeze through the tubes and echo: close on a narrow ring, a bubble forcing through, the wall ringing
shot(C.so, C.like, (s) => {
  const Z = cutawayScene(s); s.ap = 2.2; s.exposure = 1.0; s.bloom = 0.15;
  s.update = (t) => {
    const k = seg(t, C.so, C.like), c = 0.5, w = 0.05, tb = lerp(0.43, 0.57, ease(seg(t, C.so, C.like - 0.1)));
    // the squeeze holds; a ripple runs out along the wall each time the bubble pops through ("echo")
    const pop = C.echo - 0.1;
    const shape = (u, a, tt) => waveAt(u, c, w, 0.62) * (1 + 0.02 * Math.sin((Math.abs(u - c) * 90) - (tt - pop) * 40) * Math.exp(-Math.abs(u - c) * 9) * smooth(pop, pop + 0.05, tt) * Math.exp(-Math.max(0, tt - pop) * 2.2));
    Z.CA.update(t, { shape, level: (u) => -0.62 + 0.25 * Math.exp(-Math.pow((u - c) / 0.06, 2)) });
    placeBubbles(Z, t, -1, w, shape, [[tb, 0.5, 0], [0.585, 0.26, 0], [0.415, 0.22, 0], [0.6, 0.16, 0]]);
    const tg = Z.CA.out.userData.at(0.5, 0, 0.08).applyMatrix4(Z.holder.matrixWorld), p = tg.clone().add(V(0.1, 0.1, 1.0));
    shoot(s.cam, p, tg, { fov: 36, t, hand: 0.5, focus: p.distanceTo(tg) });
  };
});

// 9) like water in old pipes: old cast-iron plumbing on a basement wall, trembling and dripping as it gurgles
shot(C.like, C.doctors, (s) => {
  const P = pipeRun(s.scene); s.ap = 2.6; s.exposure = 1.0; s.bloom = 0.15;
  s.update = (t) => {
    const k = seg(t, C.like, C.doctors);
    P.update(t, 0.5 + 0.5 * Math.sin(t * 7) * Math.sin(t * 2.3));
    const tg = V(lerp(-0.16, -0.06, k), 1.12, 0.16), p = tg.clone().add(V(lerp(0.75, 0.62, k), lerp(0.22, 0.18, k), lerp(1.45, 1.3, k)));
    shoot(s.cam, p, tg, { fov: 40, t, hand: 0.6, focus: p.distanceTo(V(-0.45, 1.12, 0.16)) });
  };
});

// 10) Doctors call it borborygmi: a stethoscope on a belly, the name
shot(C.doctors, C.it3, (s) => {
  const B = bellyScene(s.scene); const lab = liveLabel(0.22, 0.4); s.scene.add(lab); lab.userData.set([['BORBORYGMI', 150, 0.4, '#ffffff', 900], ['bor · bo · RIG · mee', 74, 0.78, '#e8eef5', 700]]);
  s.ap = 3.0; s.exposure = 0.78; s.bloom = 0.12;
  s.update = (t) => {
    const k = seg(t, C.doctors, C.it3);
    B.update(t, { press: smooth(C.doctors, C.doctors + 0.4, t), gurgle: smooth(C.borborygmi - 0.1, C.borborygmi + 0.2, t) * (1 - smooth(C.it3 - 0.4, C.it3, t)) });
    const tg = V(0.02, 0.11, 0.02), p = V(lerp(-0.2, -0.17, k), lerp(0.24, 0.22, k), lerp(0.3, 0.27, k));
    shoot(s.cam, p, tg, { fov: 34, t, hand: 0.5, focus: p.distanceTo(tg) });
    pin(s.cam, lab, 0, 0.17, 0.75); lab.scale.setScalar(Math.max(1e-4, spring(t, C.borborygmi - 0.05, 2, 6)));
  };
});

// 11) It happens after meals too, but food muffles the sound: a cut-away full stomach, a bubble barely rising through the food
shot(C.it3, C.and5, (s) => {
  const sc = s.scene; anatomyStudio(sc); const cut = [Math.PI / 2 + 0.95, Math.PI / 2 + Math.PI * 2 - 0.95]; const G = makeGut(sc, { cutStomach: cut }); s.ap = 2.4; s.exposure = 1.0; s.bloom = 0.12;
  const food = chyme(900, 9); G.g.add(food); G.update(0, {});
  { const R = rng(5), st = G.st.userData, o = new THREE.Object3D(); let n = 0;
    for (let tries = 0; tries < 40000 && n < food.count; tries++) { const u = 0.26 + R() * 0.46, a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 0.8 * ST_R(u); const P = st.at(u, a, rr);
      if (P.y < -0.02 + 0.03 * (u - 0.5) && Math.sin(a) * rr < 0.45 * ST_R(u)) { o.position.copy(P); o.rotation.set(R() * 6, R() * 6, R() * 6); o.scale.setScalar(0.0045 + R() * 0.006); o.updateMatrix(); food.setMatrixAt(n++, o.matrix); } }
    food.count = n; food.instanceMatrix.needsUpdate = true; }
  const bub = bubble(0.012); G.g.add(bub);
  s.update = (t) => {
    const k = seg(t, C.it3, C.and5);
    G.update(t, { wave: -1, breathe: 1 });
    // the bubble works its way up slowly, muffled by the food around it
    const bk = seg(t, C.but - 0.1, C.sound + 0.3), bp = V(0.01, lerp(-0.1, -0.035, E.outQ(bk)), 0.0); bub.position.copy(bp); bub.scale.setScalar(lerp(0.6, 1.0, bk));
    const tg = V(0.01, -0.05, 0.0), p = V(lerp(0.1, 0.05, k), lerp(0.03, 0.01, k), lerp(0.66, 0.58, k));
    shoot(s.cam, p, tg, { fov: 36, t, hand: 0.5, focus: p.distanceTo(tg) });
  };
});

// 12) And hunger hormones can set the wave off early: glowing hormone particles stream to the stomach; a squeeze starts
shot(C.and5, C.so2, (s) => {
  const sc = s.scene; anatomyStudio(sc); const G = makeGut(sc); s.ap = 1.6; s.exposure = 0.95; s.bloom = 0.3;
  const lab = liveLabel(0.24, 0.25); sc.add(lab); lab.userData.set([['HUNGER HORMONES', 96, 0.5, '#d9ffb0', 900]]);
  const N = 46, R = rng(12), parts = [];
  const pm = new THREE.MeshBasicMaterial({ color: 0xc8ff7a, toneMapped: false }), hm = new THREE.MeshBasicMaterial({ color: 0x9aff5a, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (let i = 0; i < N; i++) { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0045, 1), pm), h = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), hm); h.userData.noDof = true; c.userData.noDof = true; g.add(c, h); sc.add(g); parts.push({ g, off: R(), lane: V((R() - 0.5) * 0.05, (R() - 0.5) * 0.05, (R() - 0.5) * 0.05), sp: 0.5 + R() * 0.3 }); }
  const stream = new THREE.CatmullRomCurve3([V(-0.17, -0.3, 0.12), V(-0.13, -0.16, 0.12), V(-0.1, -0.05, 0.1), V(-0.082, 0.02, 0.065)]);
  s.update = (t) => {
    const k = seg(t, C.and5, C.so2), early = C.early - 0.15;
    G.update(t, { wave: t > early ? lerp(0.16, 0.42, ease(seg(t, early, C.so2 + 0.3))) * G.LST : -1, amp: 0.6, width: 0.034 });
    parts.forEach((q) => { const f = ((t - C.and5) * q.sp * 0.55 + q.off) % 1.0; const P = stream.getPointAt(f).add(q.lane.clone().multiplyScalar(1 - f)); q.g.position.copy(P); q.g.scale.setScalar(Math.max(1e-4, smooth(0, 0.08, f) * (1 - smooth(0.85, 1, f)))); });
    const tg = V(-0.05, -0.08, 0), p = tg.clone().add(V(lerp(0.08, 0.14, k), 0.06, lerp(0.85, 0.75, k)));
    shoot(s.cam, p, tg, { fov: 36, t, hand: 0.5, focus: p.distanceTo(V(-0.07, 0.0, 0.05)) });
    pin(s.cam, lab, 0, 0.19, 0.75); lab.scale.setScalar(Math.max(1e-4, spring(t, C.hunger - 0.05, 2, 6)));
  };
});

// 13) So next time it roars in a silent room, relax, because… back in the hall, pushing in to the glass (loop)
shot(C.so2, END, (s) => { const up = hallScene(s); s.update = (t) => up(t - END); });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
