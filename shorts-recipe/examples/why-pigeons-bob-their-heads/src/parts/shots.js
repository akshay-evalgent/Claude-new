// =====================================================================
// SHOTS (16). Bird clocks are warped per shot for slow motion; the first and last shots share one
// walk and one camera path measured from the loop point, so the last frame flows into the first.
// =====================================================================
const END = C.end, GV = 0.2, GTS = 0.24, GTF = 0.3;
const eyeW = (b) => { const v = new THREE.Vector3(); b.userData.head.userData.eyeR.getWorldPosition(v); return v; };
const headW = (b) => { const v = new THREE.Vector3(); b.userData.head.getWorldPosition(v); return v; };
const BG_FLOCK = [[-0.5, -0.9, 2.6, 0.3, 1.3], [0.9, -1.4, -0.6, 1.7, 0.9, 0x9a96a0], [0.2, -2.2, 0.4, 2.9, 1.1], [-1.4, -2.0, 1.2, 4.1, 0.7, 0x7d8190], [1.7, -0.7, 3.3, 5.3, 1.5], [-0.9, -3.4, -0.2, 6.2, 1.0]];

// the loop walk: tau = seconds from the loop point (0 at the first frame, negative before the end)
function hookScene(s) {
  const sc = s.scene, P = plaza(sc, {}), b = walker(sc, {}), F = flock(sc, BG_FLOCK); s.ap = 10; s.exposure = 1.0; s.bloom = 0.14;
  return (tau, t) => {
    const tw = tau + 2.0, g = b.userData.walk(tw); F.forEach(f => f(t)); const bx = GV * tw;
    P.sun.userData.aim(V(bx, 0.1, 0));
    const hookP = V(bx + 0.40, 0.10, 0.34), hookT = V(bx + 0.03, 0.108, 0);
    const k = E.io(seg(tau, -3.25, -0.35));
    const p = lv(V(bx + 1.1, 0.55, 1.4), hookP, k), tg = lv(V(bx + 0.0, 0.06, 0), hookT, k);
    shoot(s.cam, p, tg, { fov: lerp(34, 30, k), t: tau + 100, hand: 0.25, focus: p.distanceTo(V(bx + 0.06, 0.12, 0)) });
  };
}

// 0) That pigeon isn't bobbing its head.
shot(0, C.watch, (s) => { const up = hookScene(s); s.update = (t) => up(t, t); });

// 1) Watch. Time slows; the camera pushes in on the head
shot(C.watch, C.with_, (s) => {
  const sc = s.scene, P = plaza(sc, {}), b = walker(sc, {}), F = flock(sc, BG_FLOCK); s.ap = 11; s.exposure = 1.0; s.bloom = 0.14;
  const W = warp([[C.watch, C.watch + 2.0], [C.with_, C.watch + 2.0 + 0.86 * 0.45]]);
  s.update = (t) => {
    const tw = W(t), g = b.userData.walk(tw); F.forEach(f => f(t * 0.45)); const bx = GV * tw;
    const h = headW(b); P.sun.userData.aim(h);
    const kk = E.io(seg(t, C.watch, C.with_)), p = lv(V(bx + 0.40, 0.10, 0.34), h.clone().add(V(0.09, 0.004, 0.13)), kk), tg = lv(V(bx + 0.03, 0.108, 0), h, kk);
    shoot(s.cam, p, tg, { fov: lerp(30, 24, kk), t, hand: 0.15, focus: p.distanceTo(h) });
  };
});

// the hold-and-snap demonstration (shots 2-4): one bird, one warped clock. Hold k runs 2.69 -> 8.2, the snap 8.2 -> 8.75, then hold k+1
const HK = 10, TA = HK * GTS + 0.31 * GTS, WHS = warp([[C.with_, TA], [C.snaps, (HK + 1) * GTS], [C.snaps + 0.55, (HK + 1 + GTF) * GTS + 0.004], [C.hold, (HK + 1 + GTF) * GTS + 0.07]]);
function holdScene(s) {
  const sc = s.scene, P = plaza(sc, {}), b = walker(sc, {}), F = flock(sc, BG_FLOCK); s.ap = 10; s.exposure = 1.0; s.bloom = 0.2;
  b.userData.walk(TA + 0.01); const e1 = eyeW(b); b.userData.walk((HK + 1 + GTF) * GTS + 0.02); const e2 = eyeW(b);
  const L1 = laserLine(), L2 = laserLine(); L1.position.set(e1.x, 0, e1.z + 0.004); L2.position.set(e2.x, 0, e2.z + 0.004); sc.add(L1, L2);
  P.sun.userData.aim(V(e1.x - 0.05, 0.1, 0));
  return { b, F, e1, e2, L1, L2, P, step: (t) => { b.userData.walk(WHS(t)); F.forEach(f => f(t * 0.1)); L1.userData.grow(smooth(C.locks - 0.05, C.locks + 0.45, t)); L2.userData.grow(smooth(C.locks2 - 0.05, C.locks2 + 0.4, t)); } };
}
// 2) With every step, its head locks in place, frozen in the air,
shot(C.with_, C.while, (s) => {
  const H = holdScene(s);
  s.update = (t) => { H.step(t); const e = H.e1, k = seg(t, C.with_, C.while); shoot(s.cam, V(e.x - 0.02 + 0.01 * k, 0.14, 0.40), V(e.x - 0.025, 0.128, 0), { fov: 30, t, hand: 0.12, focus: 0.40 }); };
});
// 3) while its body walks forward underneath.
shot(C.while, C.then, (s) => {
  const H = holdScene(s); s.ap = 9;
  s.update = (t) => { H.step(t); const e = H.e1, k = seg(t, C.while, C.then); shoot(s.cam, V(e.x + 0.07 - 0.02 * k, 0.03, 0.30), V(e.x - 0.035, 0.10, 0), { fov: 40, t, hand: 0.12, focus: 0.31 }); };
});
// 4) Then the head snaps ahead to catch up, and locks again.
shot(C.then, C.hold, (s) => {
  const H = holdScene(s);
  s.update = (t) => { H.step(t); const e = H.e1, k = seg(t, C.then, C.hold); shoot(s.cam, V(e.x + 0.02 + 0.01 * k, 0.14, 0.46), V(e.x + 0.01, 0.125, 0), { fov: 28, t, hand: 0.12, focus: 0.46 }); };
});

// 5) Hold, snap. Hold, snap. Each hold leaves a line where the eye stopped
shot(C.hold, C.why, (s) => {
  const sc = s.scene, P = plaza(sc, {}), b = walker(sc, {}), F = flock(sc, BG_FLOCK); s.ap = 9; s.exposure = 1.0; s.bloom = 0.2;
  const K1 = 30, r = GTS / (C.snap2 - C.snap), W = (t) => K1 * GTS + (t - C.snap) * r;
  const lines = []; for (let j = -1; j <= 2; j++) { b.userData.walk((K1 + j + GTF) * GTS + 0.02); const e = eyeW(b); const L = laserLine(0.24); L.position.set(e.x, 0, e.z + 0.004); sc.add(L); lines.push({ L, t0: C.snap + (j + GTF) * GTS / r }); }
  const mid = (lines[1].L.position.x + lines[2].L.position.x) / 2; P.sun.userData.aim(V(mid, 0.1, 0));
  s.update = (t) => { b.userData.walk(W(t)); F.forEach(f => f(t * 0.3)); lines.forEach(({ L, t0 }) => L.userData.grow(smooth(t0 - 0.02, t0 + 0.18, t), 0.24)); shoot(s.cam, V(mid - 0.01, 0.125, 0.56), V(mid - 0.02, 0.11, 0), { fov: 24, t, hand: 0.1, focus: 0.56 }); };
});

// 6) Why? The eye, close
shot(C.why, C.a, (s) => {
  const sc = s.scene, P = plaza(sc, {}), b = walker(sc, {}); s.ap = 13; s.exposure = 1.02; s.bloom = 0.16;
  s.update = (t) => { b.userData.walk(TA + 0.02 + (t - C.why) * 0.03); const e = eyeW(b); P.sun.userData.aim(e); const k = seg(t, C.why, C.a);
    shoot(s.cam, e.clone().add(V(0.06 - 0.01 * k, 0.006, 0.17 - 0.025 * k)), e.clone().add(V(0.012, -0.008, 0)), { fov: 22, t, hand: 0.08, focus: 0.18 - 0.025 * k }); };
});
// 7) A pigeon can barely move its eyes, — the head turns, the eye stays put in its socket
shot(C.a, C.so, (s) => {
  const sc = s.scene, P = plaza(sc, {}), b = walker(sc, { heading: 0.5 }); s.ap = 12; s.exposure = 1.02; s.bloom = 0.16;
  s.update = (t) => { const k = seg(t, C.a, C.so); b.userData.walk(5 + t * 0.1, { mode: 'tread', v: 0, look: 0.35 * Math.sin((t - C.a) * 2.2), pitch: 0.05 * Math.sin((t - C.a) * 1.7) });
    const h = headW(b); P.sun.userData.aim(h); const ang = 0.5 + lerp(1.1, 0.55, E.io(k));
    shoot(s.cam, h.clone().add(V(Math.cos(ang) * 0.15, 0.012, Math.sin(ang) * 0.15)), h.clone().add(V(0.006, -0.006, 0)), { fov: 22, t, hand: 0.1, focus: 0.15 }); };
});
// 8) so it steadies its whole head instead, — walking at us: the body rocks and bobs, the head holds dead still, then jumps
shot(C.so, C.like, (s) => {
  const sc = s.scene, P = plaza(sc, {}), b = walker(sc, { heading: -0.9, at: V(-0.35, 0, -0.45) }), F = flock(sc, BG_FLOCK); s.ap = 10; s.exposure = 1.0; s.bloom = 0.14;
  const W = (t) => 1.0 + (t - C.so) * 0.32;
  s.update = (t) => { b.userData.walk(W(t)); F.forEach(f => f(t * 0.3)); const h = headW(b); P.sun.userData.aim(h);
    const c = b.userData.world(V(GV * 1.6, 0.12, 0)), cp = b.userData.world(V(GV * 1.6 + 0.34, 0.13, 0.30)); shoot(s.cam, cp, c, { fov: 28, t, hand: 0.06, focus: cp.distanceTo(c) }); };
});
// 9) like a camera on a tripod. — a little tripod beside a pigeon, both dead still
shot(C.like, C.every2, (s) => {
  const sc = s.scene, P = plaza(sc, {}), b = walker(sc, { heading: 0.0, at: V(0.0, 0, 0.06) }), F = flock(sc, BG_FLOCK), tp = tripodCam(sc); s.ap = 9; s.exposure = 1.0; s.bloom = 0.14;
  tp.position.set(0.02, 0, -0.17); tp.rotation.y = -Math.PI / 2;
  s.update = (t) => { const k = seg(t, C.like, C.every2); b.userData.walk(3 + t * 0.2, { mode: 'tread', v: 0, look: 0.03 * Math.sin(t) }); F.forEach(f => f(t * 0.5)); P.sun.userData.aim(V(0.0, 0.1, 0));
    const tg = V(0.05, 0.13, -0.05), p = V(0.40 - 0.06 * E.io(k), 0.13, 0.55 - 0.06 * E.io(k)); shoot(s.cam, p, tg, { fov: 30, t, hand: 0.15, focus: p.distanceTo(V(0.07, 0.15, 0.06)) }); };
});

// 10) Every hold gives it a sharp, still picture to spot seeds, — the pigeon's own view, still during holds, lurching on each snap
shot(C.every2, C.and2, (s) => {
  const sc = s.scene, P = plaza(sc, {}), b = walker(sc, {}), F = flock(sc, [[1.6, 0.5, 2.8, 1.0, 1.1], [2.4, -0.4, 3.6, 2.0, 1.3], [3.2, 0.3, -2.4, 3.0, 0.8]]);
  b.visible = false; s.ap = 3; s.exposure = 1.0; s.bloom = 0.14; s.maxR = 10;
  const W = (t) => 3 + (t - C.every2) * 0.5, x21 = GV * W(C.seeds) + 0.09; seeds(sc, 140, [0.5, 0.4], V(x21 + 0.18, 0, 0), 7);
  s.update = (t) => { b.userData.walk(W(t)); F.forEach(f => f(t * 0.5)); const h = headW(b); P.sun.userData.aim(h.clone().add(V(0.4, 0, 0)), 6);
    s.cam.position.copy(h).add(V(0.01, 0.006, 0)); s.cam.up.set(0, 1, 0); s.cam.lookAt(h.clone().add(V(0.35, -0.16, 0))); s.cam.fov = 58; s.cam.updateProjectionMatrix(); s.cam.userData.focus = 0.4; };
});
// 11) and hawks. — the view snaps up to the sky: a hawk gliding over the square
shot(C.and2, C.scientists, (s) => {
  const sc = s.scene, P = plaza(sc, {}), hk = hawk(); sc.add(hk); s.ap = 2; s.exposure = 0.95; s.bloom = 0.2;
  s.update = (t) => { const k = seg(t, C.and2, C.scientists), up = E.io(seg(t, C.and2, C.and2 + 0.35));
    const Ld = V(0.955, 1.25, -0.5).normalize(), Sd = Ld.clone().cross(V(0, 1, 0)).normalize();
    hk.position.copy(V(0, 0.16, 0)).addScaledVector(Ld, 6).addScaledVector(Sd, lerp(-2.6, 2.2, k)).add(V(0, 0.3 * Math.sin(k * 3), 0)); hk.lookAt(hk.position.clone().add(Sd)); hk.rotateY(-Math.PI / 2); hk.rotateX(0.25 * Math.sin(k * 4)); hk.userData.flap(t);
    s.cam.position.set(0, 0.16, 0); s.cam.up.set(0, 1, 0); s.cam.lookAt(V(0.955, lerp(-0.3, 1.25, up), -0.5)); s.cam.fov = 60; s.cam.updateProjectionMatrix(); s.cam.userData.focus = 8; };
});

// the treadmill: the belt runs back at walking speed, so the bird walks in place and the world around it never moves
function treadScene(s) {
  const sc = s.scene, L = lab(sc), b = walker(sc, { at: V(-0.06, 0, 0) }); sc.add(b); s.exposure = 1.0; s.bloom = 0.16;
  return { L, b, step: (t) => { const tw = 10 + t; b.userData.walk(tw, { mode: 'tread' }); L.beltTex.offset.x = (tw * GV / 0.56 * 1) % 1; } };
}
// 12) Scientists showed it with a treadmill.
shot(C.scientists, C.when, (s) => {
  const T = treadScene(s); s.ap = 7;
  s.update = (t) => { T.step(t); const k = E.io(seg(t, C.scientists - 0.2, C.when)); shoot(s.cam, lv(V(0.55, 0.42, 0.95), V(0.16, 0.16, 0.46), k), V(-0.02, 0.07, 0), { fov: 28, t, hand: 0.3 }); };
});
// 13) When the world around the walking pigeon stopped moving, — side on, a laser line through the eye; the head never leaves it
shot(C.when, C.so2, (s) => {
  const T = treadScene(s); s.ap = 8; const Ll = laserLine(0.2); s.scene.add(Ll); let LH = 0.2;
  s.update = (t) => { T.step(t); if (LH === 0.2) { const e = eyeW(T.b); Ll.position.set(e.x, 0, e.z + 0.004); LH = e.y + 0.025; } Ll.userData.grow(smooth(C.walking - 0.1, C.walking + 0.35, t), LH);
    shoot(s.cam, V(0.0, 0.125, 0.52), V(-0.01, 0.112, 0), { fov: 26, t, hand: 0.1, focus: 0.52 }); };
});
// 14) so did the bobbing. — close on the steady head
shot(C.so2, C.so3, (s) => {
  const T = treadScene(s); s.ap = 7; const Ll = laserLine(0.2); s.scene.add(Ll); let LH = 0.2;
  s.update = (t) => { T.step(t); if (LH === 0.2) { const e = eyeW(T.b); Ll.position.set(e.x, 0, e.z + 0.004); LH = e.y + 0.022; } Ll.userData.grow(1, LH);
    const e = eyeW(T.b), k = seg(t, C.so2, C.so3); shoot(s.cam, e.clone().add(V(0.03, 0.006, 0.2 - 0.04 * k)), e.clone().add(V(0.006, -0.006, 0)), { fov: 24, t, hand: 0.08, focus: 0.2 - 0.04 * k }); };
});

// 15) So next time one struts past you, look closely, because… — back in the square (loop)
shot(C.so3, END, (s) => { const up = hookScene(s); s.update = (t) => up(t - END, t); });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
