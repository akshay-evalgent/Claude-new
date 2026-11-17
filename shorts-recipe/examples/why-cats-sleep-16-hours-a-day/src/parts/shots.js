// =====================================================================
// SHOTS: "Why Cats Sleep 16 Hours A Day"
// =====================================================================
const END = C.end;
const BEDP = (x, z) => V(x, duvetY(x, z), z);
const SLP = () => BEDP(0.35, 1.62);                // where the cat sleeps: across the foot of the bed, by your feet
const SLRY = Math.PI / 2 - 0.75;
const GP = V(0.4, 0, 1.4);                          // the cat's spot in the garden grass
function gardenSet(s) { const R = garden(s.scene); return R; }

// ---------------------------------------------------------------------
// 0 + 13) the loop: curled up asleep on your bed. Both shots run on tau = seconds from the loop point.
// ---------------------------------------------------------------------
function bedLoop(s, { dial = false } = {}) {
  const sc = s.scene; const R = sleepRoom(sc, 'day'); const c = mkCat(sc), u = c.userData; const z = zzz(sc); const d24 = dial ? dial24(0.34) : null; if (d24) sc.add(d24);
  s.ap = 3.5; s.exposure = 1.05; s.bloom = 0.45;
  return (tau, t) => {
    const P = SLP(); sideSleep(c, tau, { P, ry: SLRY, earL: 0.15 * wob(tau, 1.6, 3, 4), breath: 1 });
    const k = E.io(seg(tau, -3.3, 2.6)), eye = u.eyeW(), fd = u.head.getWorldDirection(new THREE.Vector3()).setY(0).normalize(), cp = eye.clone().addScaledVector(fd, lerp(2.45, 2.2, k)).add(V(0.1, lerp(0.95, 0.85, k), 0.35));
    shoot(s.cam, cp, eye.clone().addScaledVector(fd, -0.3).add(V(0, -0.08, 0)), { fov: 40, t: tau, focus: cp.distanceTo(eye), hand: 0.5 });
    z(tau, s.cam, u.eyeW().add(V(0.05, 0.25, 0)), 1, 0.9);
    if (d24) { pin(s.cam, d24, 0, 0.36, 1.6); const a = spring(t, C.sixteen - 0.1, 2, 6); d24.scale.setScalar(Math.max(1e-4, a)); d24.userData.draw({ fill: (16 / 24) * E.out(seg(t, C.sixteen, C.day + 0.2)), label: Math.round(16 * E.out(seg(t, C.sixteen, C.day + 0.2))) + 'h' }); }
  };
}
shot(0, C.and, (s) => { const up = bedLoop(s, { dial: true }); s.update = (t) => up(t, t); });

// 1) and it's not being lazy: close on the face; one eye opens, deadpan, and closes again ------------
shot(C.and, C.cats, (s) => {
  const sc = s.scene; const R = sleepRoom(sc, 'day'); const c = mkCat(sc), u = c.userData; s.ap = 2.2; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => {
    const P = SLP(), open = smooth(C.not - 0.1, C.not + 0.15, t) * (1 - smooth(C.lazy + 0.25, C.lazy + 0.5, t));
    sideSleep(c, t, { P, ry: SLRY, eyeUp: 0.6 * open, headUp: 0.12 * open });
    const k = E.io(seg(t, C.and - 0.2, C.cats + 0.3)), eye = u.eyeW(), fd = u.head.getWorldDirection(new THREE.Vector3()), cp = eye.clone().addScaledVector(fd, lerp(1.25, 1.08, k)).add(V(0, 0.22, 0.25));
    if (open > 0.3) u.gaze(cp);
    shoot(s.cam, cp, eye.clone().add(V(0, -0.04, 0)), { fov: 34, t, focus: cp.distanceTo(eye) });
  };
});

// 2) cats are ambush hunters: low in the grass at dusk; wide eyes, the tail tip twitching ----------------
function crouchAct(c, t, { look, wig = 0, tail = 0.3, pupil = 0.85 } = {}) {
  const u = c.userData; u.pose({ crouch: 1 }); u.solve().breathe(t, 0.015).pupil(pupil).ears(-0.15, 0.1 * Math.sin(t * 2.3), -0.1 * Math.sin(t * 2.1)).whisk(0.4);
  u.hips.position.x += 0.04 * Math.sin(t * 18) * wig; u.hips.position.y += 0.03 * wig;
  if (look) u.look(look, 1, 0, 1.0, 0.6).gaze(look); u.lid(0.02 + 0.9 * blinkAt(t, 5) * (1 - wig));
  const s = Math.sin(t * 6) * tail; u.tail([V(0, 0.5, -1.12), V(0, 0.42, -1.45), V(0.05, 0.38, -1.8), V(0.1 + s * 0.4, 0.4, -2.1), V(0.15 + s, 0.48, -2.3)]);
  return u;
}
shot(C.cats, C.they, (s) => {
  const sc = s.scene; const R = gardenSet(s); const c = mkCat(sc), u = c.userData; s.ap = 3.2; s.exposure = 1.1; s.bloom = 0.5;
  s.update = (t) => {
    R.update(t); c.position.copy(GP); c.rotation.set(0, Math.PI - 0.25, 0);
    const k = E.io(seg(t, C.cats - 0.2, C.they + 0.3)), cp = lv(V(0.95, 0.32, -0.25), V(0.85, 0.3, -0.05), k);
    crouchAct(c, t, { look: V(-0.5, 0.2, -4), tail: 0.35 });
    shoot(s.cam, cp, u.eyeW().add(V(0.05, -0.05, 0)), { fov: 38, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 3) they don't chase prey for miles: the dog thunders past after a ball; the cat doesn't move -----------
shot(C.they, C.they2, (s) => {
  const sc = s.scene; const R = gardenSet(s); const c = mkCat(sc), u = c.userData; const d = makeDog(); d.scale.setScalar(0.62); d.userData.collar.visible = true; sc.add(d); const ball = toyBall(1.0); sc.add(ball);
  s.ap = 3.6; s.exposure = 1.1; s.bloom = 0.5;
  s.update = (t) => {
    R.update(t); c.position.set(0.72, 0, 2.75); c.rotation.set(0, Math.PI + 0.25, 0);
    const a = (t - C.they) / (C.they2 - C.they), x = lerp(4.2, -4.2, a);
    ball.position.set(x - 1.3, 0.11 * DSB + Math.abs(Math.sin(t * 7)) * 0.25, -1.6); ball.rotation.z = t * 9;
    d.position.set(x, 0, -1.4); d.rotation.set(0, -Math.PI / 2, 0); const du = d.userData; du.pose(1); walkLegs(du, (t * 4.8) / 0.62, { stride: 1.35, lift: 0.32 }); du.look(ball.position, 0.8).lid(0.05).brows(0.2).earsSet(0.3, 0.2 * Math.sin(t * 20)).mouth(0.25).pant(0.6).wag(t, 4, 0.7); d.position.y = 0.04 * Math.abs(Math.sin(t * 9));
    crouchAct(c, t, { look: d.position.clone().add(V(0, 0.6, 0)), tail: 0.12, pupil: 0.5 }); u.lid(0.45 + 0.4 * Math.max(0, 1 - Math.abs(t - (C.miles + 0.2)) / 0.4));
    const k = E.io(seg(t, C.they - 0.2, C.they2 + 0.3)), cp = lv(V(0.75, 0.8, 4.6), V(0.68, 0.78, 4.4), k);
    shoot(s.cam, cp, V(-0.45, 0.6, -1.1), { fov: 46, t, focus: cp.distanceTo(c.position) });
  };
});
const DSB = 1;

// 4) they wait, then explode into a few seconds of full-speed sprinting: the pounce after a mouse ---------
shot(C.they2, C.and2, (s) => {
  const sc = s.scene; const R = gardenSet(s); const c = mkCat(sc), u = c.userData; const mo = makeMouse(); mo.scale.setScalar(0.5); sc.add(mo); const sl = speedLines(sc);
  s.ap = 3.2; s.exposure = 1.1; s.bloom = 0.5; const tGo = C.explode - 0.05;
  const path = (d) => V(1.8 - d, 0, 0.6 + 0.12 * Math.sin(d * 0.6));
  s.update = (t) => {
    R.update(t);
    const run = Math.max(0, t - tGo), dist = run <= 0 ? 0 : 4.6 * run * smooth(0, 0.25, run) - (run > 2.2 ? 0 : 0);
    const P = path(dist), mP = path(Math.max(dist + 0.9, 0.9 + 3.8 * Math.max(0, t - (C.wait + 0.1))));
    mo.position.copy(mP); mo.rotation.set(0, -Math.PI / 2, 0); mo.userData.update(t, t > C.wait ? 1 : 0, 0.6);
    c.position.copy(P); c.rotation.set(0, -Math.PI / 2, 0);
    if (run <= 0) crouchAct(c, t, { look: mP.clone().add(V(0, 0.05, 0)), wig: smooth(C.then - 0.1, C.then + 0.1, t), tail: 0.4 });
    else { u.pose({ stand: 1 }); catGallop(u, dist / 0.55, smooth(0, 0.15, run)); u.look(mP, 0.9).gaze(mP); u.ears(0.35, 0, 0).pupil(0.9).lid(0.02).whisk(0.5); u.tail([V(0, 1.12, -1.02), V(0, 1.2, -1.4), V(0, 1.22, -1.8), V(0.05 * Math.sin(t * 9), 1.22, -2.2), V(0.1 * Math.sin(t * 9), 1.24, -2.5)]); c.position.y = 0.06 * Math.abs(Math.sin(dist / 0.55 / 1.1 * Math.PI * 2)); }
    const cp = V(P.x - 0.2, 0.62, 3.3), tg = P.clone().add(V(-0.35, 0.3, 0));
    shoot(s.cam, cp, tg, { fov: 42, t, focus: cp.distanceTo(P), hand: 0.7 });
    sl(t, P.clone().add(V(0, 0.4, 0)), V(-1, 0, 0), s.cam, smooth(tGo + 0.1, tGo + 0.4, t));
  };
});

// 5) and that burns a lot of energy: the cat flops down, panting; the battery drains to red --------------
shot(C.and2, C.so, (s) => {
  const sc = s.scene; const R = gardenSet(s); const c = mkCat(sc), u = c.userData; const bat = battery(0.34); sc.add(bat); s.ap = 3; s.exposure = 1.1; s.bloom = 0.5;
  s.update = (t) => {
    R.update(t); const P = V(-1.0, 0.0, 0.75);
    const fl = E.io(seg(t, C.and2 + 0.05, C.burns + 0.3));
    c.rotation.order = 'YXZ'; c.rotation.set(0, -Math.PI / 2 - 0.3, Math.PI / 2 * 0.85 * fl); c.position.copy(P).add(V(0, 0.25 * CS * fl, 0));
    u.pose({ crouch: 1 }); u.legs.forEach(L => { L.T.add(V(L.sx * 0.1, 0.15, L.front ? 0.25 : -0.15).multiplyScalar(fl)); }); u.solve().breathe(t, 0.05 + 0.05 * fl);
    u.head.rotation.z = 0.6 * fl; u.lid(0.45 * fl + 0.3, 0.1).meow(0.18 * fl * (0.6 + 0.4 * Math.sin(t * 14))); u.ears(0.3 * fl, 0, 0);
    u.tail([V(0, 0.5, -1.1), V(0.1, 0.3, -1.4), V(0.25, 0.2, -1.8), V(0.4, 0.2, -2.1), V(0.5, 0.2, -2.35)]);
    const k = E.io(seg(t, C.and2 - 0.2, C.so + 0.3)), cp = lv(V(-0.2, 0.95, 2.65), V(-0.3, 0.88, 2.45), k);
    shoot(s.cam, cp, P.clone().add(V(0, 0.3, 0)), { fov: 40, t, focus: cp.distanceTo(P) });
    pin(s.cam, bat, 0, 0.22, 1.6); bat.scale.setScalar(Math.max(1e-4, spring(t, C.burns - 0.1, 2, 6))); bat.userData.draw(lerp(0.95, 0.1, E.io(seg(t, C.burns, C.energy + 0.3))));
  };
});

// 6) so they nap to save it: curled up on the bed, Zzz; the battery charges back up ---------------------
shot(C.so, C.theyre, (s) => {
  const sc = s.scene; const R = sleepRoom(sc, 'day'); const c = mkCat(sc), u = c.userData; const z = zzz(sc); const bat = battery(0.34); sc.add(bat); s.ap = 3.2; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => {
    const P = SLP(), lie = E.io(seg(t, C.so - 0.1, C.nap + 0.15));
    sideSleep(c, t, { P, ry: SLRY, lie, eye: 1 - smooth(C.nap - 0.2, C.to2, t) });
    const k = E.io(seg(t, C.so - 0.2, C.theyre + 0.3)), cp = lv(P.clone().add(V(0.6, 1.25, 3.0)), P.clone().add(V(0.5, 1.15, 2.75)), k);
    shoot(s.cam, cp, P.clone().add(V(0, 0.2, 0)), { fov: 40, t, focus: cp.distanceTo(P) });
    z(t, s.cam, u.eyeW().add(V(0.05, 0.25, 0)), smooth(C.nap - 0.1, C.nap + 0.3, t), 0.9);
    pin(s.cam, bat, 0, 0.22, 1.6); bat.userData.draw(lerp(0.1, 1.0, E.io(seg(t, C.to2, C.it + 0.4))), smooth(C.save - 0.1, C.save + 0.1, t) * (1 - smooth(C.it + 0.3, C.it + 0.5, t)));
  };
});

// 7) they're not really night animals, either: the bedroom at night, moonlight; fast asleep at 2 a.m. ----
shot(C.theyre, C.theyre2, (s) => {
  const sc = s.scene; const R = sleepRoom(sc, 'night'); const c = mkCat(sc), u = c.userData; const z = zzz(sc); const SL = sleeper(sc); const d24 = dial24(0.34); sc.add(d24); s.ap = 3.5; s.exposure = 0.9; s.bloom = 0.55;
  s.update = (t) => {
    SL.pose(t); const P = SLP(); sideSleep(c, t, { P, ry: SLRY });
    const k = E.io(seg(t, C.theyre - 0.2, C.theyre2 + 0.3)), cp = lv(V(1.95, 2.65, 4.1), V(1.8, 2.5, 3.85), k);
    shoot(s.cam, cp, V(0.3, 1.2, 0.6), { fov: 44, t, focus: cp.distanceTo(P) });
    z(t, s.cam, u.eyeW().add(V(0.05, 0.25, 0)), 1, 0.8);
    pin(s.cam, d24, 0.065, 0.24, 1.6); d24.scale.setScalar(Math.max(1e-4, spring(t, C.night - 0.15, 2, 6))); d24.userData.draw({ sunH: 2.2, label: '2am' });
  };
});

// 8) they're built for dawn and dusk: the 24-hour dial; the sun goes round; dawn and dusk light up ----------
shot(C.theyre2, C.when, (s) => {
  const sc = s.scene; sc.background = gradTex([[0, '#ffcf9a'], [0.35, '#f08a7a'], [0.7, '#6a5aa8'], [1, '#22285a']], 0.5, 0.75); const d24 = dial24(0.62); sc.add(d24); s.ap = 0.01; s.exposure = 1.0; s.bloom = 0.35;
  s.update = (t) => {
    setCam(s.cam, V(0, 0, 3), V(0, 0, 0), 0, 40); s.cam.userData.focus = 3;
    pin(s.cam, d24, 0, 0.02, 1.6); d24.scale.setScalar(Math.max(1e-4, spring(t, C.theyre2 - 0.05, 2, 6)));
    const h = lerp(4.0, 20.5, E.io(seg(t, C.theyre2, C.when + 0.1)));
    d24.userData.draw({ sunH: h, wedges: smooth(C.dawn - 0.1, C.dawn + 0.15, t), pulse: Math.sin(t * 8) * 0.5 + 0.5, label: t < C.and3 ? 'dawn' : 'dusk' });
  };
});

// 9) when mice are most active: dusk in the garden; mice scurry through the grass; the cat locks on ------
shot(C.when, C.thats, (s) => {
  const sc = s.scene; const R = gardenSet(s); const c = mkCat(sc), u = c.userData; const mice = [0, 1, 2].map(() => { const m = makeMouse(); m.scale.setScalar(0.62); sc.add(m); return m; });
  s.ap = 2.6; s.exposure = 1.1; s.bloom = 0.5;
  s.update = (t) => {
    R.update(t); c.position.set(0.6, 0, 2.3); c.rotation.set(0, Math.PI + 0.1, 0);
    mice.forEach((m, i) => { const ph = t * (0.8 + 0.2 * i) + i * 2.1, x = 0.45 + 0.55 * Math.sin(ph * 0.7 + i), z = 0.55 + 0.22 * i + 0.25 * Math.cos(ph * 0.9); m.position.set(x, 0, z); m.rotation.set(0, Math.atan2(Math.cos(ph * 0.7 + i) * 1.12, -Math.sin(ph * 0.9) * 0.36) , 0); m.userData.update(t + i, 1, 0.3); });
    crouchAct(c, t, { look: mice[0].position.clone().add(V(0, 0.05, 0)), wig: 0.3 * smooth(C.most, C.active, t), tail: 0.4 });
    const k = E.io(seg(t, C.when - 0.2, C.thats + 0.3)), cp = lv(V(0.3, 0.32, -1.05), V(0.33, 0.3, -0.85), k);
    shoot(s.cam, cp, V(0.55, 0.3, 1.6), { fov: 42, t, focus: cp.distanceTo(V(0.45, 0.1, 0.7)) });
  };
});

// 10) that's why your cat gets the zoomies right before sunrise: dawn, the cat tears across the bed -------
shot(C.thats, C.most2, (s) => {
  const sc = s.scene; const R = sleepRoom(sc, 'dawn'); const c = mkCat(sc), u = c.userData; const SL = sleeper(sc); const sl = speedLines(sc); s.ap = 3.6; s.exposure = 1.12; s.bloom = 0.5;
  const pts = [V(1.9, 0, 3.3), V(1.0, 0, 1.9), BEDP(0.55, 0.9), BEDP(-0.45, -0.25), BEDP(-0.65, 1.4), BEDP(0.45, 1.9), V(2.0, 0, 2.6), V(2.6, 0, 0.6)];
  const curve = new THREE.CatmullRomCurve3(pts), L = curve.getLength();
  s.update = (t) => {
    const ou = SL.pose(t, { glare: smooth(C.zoomies, C.zoomies + 0.3, t) }); ou.smile && 0;
    const a = (t - C.thats + 0.1) * 3.2, f = clamp(a / L), P = curve.getPointAt(f), Tn = curve.getTangentAt(f);
    const onBed = Math.abs(P.x) < 1.35 && P.z > -1.1 && P.z < 2.15; P.y = onBed ? duvetY(P.x, P.z) : 0; if (onBed) P.y += 0.02;
    c.position.copy(P); c.rotation.set(0, Math.atan2(Tn.x, Tn.z), 0);
    u.pose({ stand: 1 }); catGallop(u, a / 0.55, 1); u.ears(0.4, 0, 0).pupil(0.95).lid(0.0).whisk(0.5); u.look(P.clone().addScaledVector(Tn, 2).add(V(0, 0.4, 0)), 0.8);
    u.tail([V(0, 1.12, -1.02), V(0, 1.4, -1.3), V(0.1, 1.55, -1.5), V(0.2 * Math.sin(t * 10), 1.65, -1.6), V(0.3 * Math.sin(t * 10), 1.75, -1.55)]);
    c.position.y += 0.05 * Math.abs(Math.sin(a / 0.55 / 1.1 * Math.PI * 2));
    const k = E.io(seg(t, C.thats - 0.2, C.most2 + 0.3)), cp = lv(V(2.6, 2.6, 4.5), V(2.4, 2.45, 4.2), k);
    shoot(s.cam, cp, V(0.2, 1.1, 0.7), { fov: 46, t, focus: cp.distanceTo(V(0, 1.1, 0.5)) });
    sl(t, P.clone().add(V(0, 0.35, 0)), Tn.clone().setY(0).normalize(), s.cam, 0.8);
  };
});

// 11) most of that sleep is light dozing, too: a loaf with drooping lids; a sleep-depth line, mostly shallow ----
function hypno(w = 0.5) {
  const cd = canvasDyn(640, 300), g = cd.g;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 300 / 640), new THREE.MeshBasicMaterial({ map: cd.t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); m.renderOrder = 15; m.userData.noDof = true;
  m.userData.draw = (k) => {
    g.clearRect(0, 0, 640, 300); g.fillStyle = 'rgba(14,22,44,0.8)'; g.beginPath(); g.roundRect(8, 8, 624, 284, 40); g.fill();
    g.fillStyle = '#ffffff'; g.font = '900 34px "Arial Black", Arial, sans-serif'; g.textAlign = 'left'; g.fillText('LIGHT', 34, 104); g.fillStyle = '#8fb8ff'; g.fillText('DEEP', 34, 222);
    g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 2; [92, 210].forEach(y => { g.beginPath(); g.moveTo(170, y); g.lineTo(600, y); g.stroke(); });
    const dips = [[0.3, 0.38], [0.72, 0.8]]; g.strokeStyle = '#ffd27a'; g.lineWidth = 9; g.lineJoin = 'round'; g.beginPath();
    for (let i = 0; i <= 200 * k; i++) { const x = i / 200, d = dips.some(([a, b]) => x > a && x < b) ? 1 : 0, y = 92 + 118 * d + 8 * Math.sin(i * 0.9); const px = 170 + 430 * x; i ? g.lineTo(px, y) : g.moveTo(px, y); } g.stroke();
    cd.t.needsUpdate = true;
  };
  m.userData.draw(0); return m;
}
shot(C.most2, C.the2, (s) => {
  const sc = s.scene; const R = sleepRoom(sc, 'day'); const c = mkCat(sc), u = c.userData; const hy = hypno(0.5); sc.add(hy); s.ap = 3.2; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => {
    const P = SLP(); c.position.copy(P).add(V(0, -0.02, 0)); c.rotation.set(0, 0.35, 0); u.pose({ crouch: 1 }); u.legs.forEach(L => { if (L.front) L.T.z -= 0.35; }); u.solve().breathe(t, 0.03);
    const nod = Math.max(0, Math.sin(t * 1.3)) * 0.25; u.head.rotation.x = 0.2 + nod; u.head.position.y -= 0.08; u.lid(0.72 + 0.2 * nod, 0.15).ears(0.1, 0.1 * Math.sin(t * 2), 0); u.tailRest(t, 0.05, 1);
    const k = E.io(seg(t, C.most2 - 0.2, C.the2 + 0.3)), cp = lv(P.clone().add(V(0.55, 0.85, 2.6)), P.clone().add(V(0.5, 0.8, 2.4)), k);
    shoot(s.cam, cp, P.clone().add(V(0, 0.62, 0)), { fov: 40, t, focus: cp.distanceTo(P) });
    pin(s.cam, hy, 0, 0.2, 1.6); hy.scale.setScalar(Math.max(1e-4, spring(t, C.light - 0.15, 2, 6))); hy.userData.draw(E.io(seg(t, C.light - 0.1, C.too + 0.4)));
  };
});

// 12) the ears keep turning toward every sound, ready to go: asleep, but the ears swivel to a fly and a click --
shot(C.the2, C.so2, (s) => {
  const sc = s.scene; const R = sleepRoom(sc, 'day'); const c = mkCat(sc), u = c.userData; const f = fly(); sc.add(f); const rA = soundRings(sc, 0xffffff), rB = soundRings(sc, 0xffd27a); s.ap = 2.2; s.exposure = 1.05; s.bloom = 0.45;
  const tA = C.turning - 0.25, tB = C.sound - 0.1;
  s.update = (t) => {
    const P = SLP();
    const eL = 0.9 * smooth(tA, tA + 0.12, t) * (1 - smooth(tB - 0.1, tB + 0.1, t)), eR = -0.9 * smooth(tB, tB + 0.12, t) * (1 - smooth(C.go + 0.2, C.go + 0.5, t));
    sideSleep(c, t, { P, ry: SLRY, earL: eL, earR: eR, eyeUp: 0.25 * smooth(C.ready - 0.1, C.ready + 0.1, t) * (1 - smooth(C.go + 0.3, C.go + 0.5, t)) });
    const head = u.eyeW(), k = E.io(seg(t, C.the2 - 0.2, C.so2 + 0.3)), cp = head.clone().add(V(0.45, 0.75, 1.15)).lerp(head.clone().add(V(0.38, 0.66, 1.0)), k);
    shoot(s.cam, cp, head.clone().add(V(0, 0.08, 0)), { fov: 36, t, focus: cp.distanceTo(head) });
    s.cam.updateMatrixWorld(true); const fp = s.cam.localToWorld(V(-0.11 + 0.03 * Math.sin(t * 7), 0.15 + 0.03 * Math.sin(t * 11), -cp.distanceTo(head) * 0.75 + 0.04 * Math.cos(t * 9))); f.position.copy(fp); f.visible = t < tB + 0.2; f.userData['w-1'].rotation.z = -0.4 + Math.sin(t * 160) * 0.6; f.userData.w1.rotation.z = 0.4 - Math.sin(t * 160) * 0.6;
    rA(t, tA, tB + 0.1, fp, head, s.cam); rB(t, tB, C.go + 0.4, head.clone().add(V(0.55, 0.2, 0.35)), head, s.cam);
  };
});

// 13) so if your cat is asleep on your bed right now, don't wake it, because… → (loop)
shot(C.so2, END, (s) => { const up = bedLoop(s); s.update = (t) => up(t - END, t); });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
