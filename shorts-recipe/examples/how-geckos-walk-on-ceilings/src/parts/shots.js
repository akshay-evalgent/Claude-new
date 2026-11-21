// =====================================================================
// SHOTS (11). The first and last shots share the loop frame: the gecko resting upside down on the ceiling by the bulb.
// The last shot has it dash in and stop exactly there.
// =====================================================================
const END = C.end, DD = 40;
// the resting spot (surface-frame coordinates): ~17 cm from the bulb's cord, heading toward the light
const P_REST = V(-14, 0, 9), DIR = V(14, 0, -9).normalize(), HEAD = Math.atan2(-DIR.z, DIR.x);
const restPath = (d) => ({ p: P_REST.clone().addScaledVector(DIR, d - DD), h: HEAD });
function ceilSet(s, opts = {}) { const sc = s.scene, R = room(sc, opts); const F = ceilingFrame(sc, V(0, 0, 0), 0); const gk = makeGecko(); F.add(gk); F.updateMatrixWorld(true);
  const W = (v) => F.localToWorld(v.clone()), fwdW = W(DIR.clone()).sub(W(V(0, 0, 0))).normalize(), sideW = fwdW.clone().cross(V(0, -1, 0)).normalize();
  return { sc, R, F, gk, W, fwdW, sideW }; }
// the hook camera: below the gecko's middle, looking up, its head at the top of the frame
const hookAt = (h) => { const mid = h.W(restPath(DD - 10).p); return { p: mid.clone().add(V(0, -54, 0)).addScaledVector(h.sideW, 9).addScaledVector(h.fwdW, -6), t: mid, up: h.fwdW }; };
const restPose = (t) => ({ t: t + 30, d: DD, path: restPath, headYaw: 0.16 * Math.sin(t * 0.8) + 0.05 * Math.sin(t * 2.1) });
// the final dash: full speed until 1.1 s before the loop point, braking to a stop 0.55 s before it
const dashSpeed = (tau) => smooth(-0.55, -1.1, tau);
const DV = 24; // walk-in speed for the loop shot: slow enough that it's on screen from the cut
function dashD(tau, v = DV) { if (tau >= -0.55) return DD; let d = 0; const n = 60, a = tau, b = -0.55; for (let i = 0; i < n; i++) { const x = a + (b - a) * (i + 0.5) / n; d += dashSpeed(x) * v * (b - a) / n; } return DD - d; }

// 0) A gecko could hang from your ceiling all day, with no glue at all. — upside down on the ceiling by the bulb
shot(0, C.look, (s) => { const h = ceilSet(s); s.ap = 9; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => { h.gk.userData.pose(restPose(t)); const H0 = hookAt(h), k = 0.06 * seg(t, 0, C.look); shootC(s.cam, lv(H0.p, H0.t, k), H0.t, H0.up, { fov: 30, t: t + 100, hand: 0.05, focus: H0.p.distanceTo(H0.t) * (1 - k) }); }; });

// 1) Look closer at its toes. — pushing in toward a front foot
shot(C.look, C.theyre, (s) => { const h = ceilSet(s); s.ap = 12; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => { h.gk.userData.pose(restPose(t)); const H0 = hookAt(h), k = E.io(seg(t, C.look, C.theyre)); const foot = h.W(restPath(DD - 6.4).p.clone().add(V(0, 0, 0))).addScaledVector(h.sideW, -3.6).addScaledVector(h.fwdW, 2.4);
    const p = lv(H0.p, foot.clone().add(V(0, -11, 0)).addScaledVector(h.sideW, -3).addScaledVector(h.fwdW, -4), k), tg = lv(H0.t, foot, k); shootC(s.cam, p, tg, h.fwdW, { fov: 30, t: t + 100, hand: 0.05 }); }; });

// 2) They're lined with ridges, — looking down through glass at the toe pads pressed flat: rows of ridges
shot(C.theyre, C.covered, (s) => { const sc = s.scene, K = skylight(sc), gk = makeGecko(); K.F.add(gk); K.F.updateMatrixWorld(true); s.ap = 14; s.maxR = 16; s.exposure = 1.05; s.bloom = 0.35;
  const path = (d) => ({ p: V(d - DD, 0, 0), h: 0 });
  s.update = (t) => { gk.userData.pose({ t, d: DD, path, headYaw: 0.1 * Math.sin(t) }); const foot = K.F.localToWorld(V(-6.4 + 2.4, 0, 3.6)); const k = seg(t, C.theyre, C.covered);
    shoot(s.cam, foot.clone().add(V(-0.5 - 0.6 * k, 7.5 - 1.6 * k, 2.2 - 0.4 * k)), foot.clone().add(V(0, -0.1, 0)), { fov: 30, t, hand: 0.03 }); }; }, { near: 0.05, far: 2000 });

// 3) covered in about two million tiny hairs. — under the electron microscope: a lamella's carpet of setae
shot(C.covered, C.each, (s) => { const sc = s.scene; semLight(sc); setaeCarpet(sc); s.ap = 10; s.maxR = 16; s.exposure = 1.05; s.bloom = 0.3;
  const lab = liveLabel(0.95, 0.26); OV(s, lab); lab.userData.set([['≈ 2,000,000 HAIRS', 92, 0.5, '#ffffff', 900, 3]]);
  s.update = (t) => { const k = seg(t, C.covered, C.each); const cp = V(-260 + 90 * k, 210 - 50 * k, 260 - 70 * k), ct = V(-20 + 20 * k, 60, 0); shoot(s.cam, cp, ct, { fov: 30, t, hand: 0.3, focus: cp.distanceTo(V(-20, 60, 0)) });
    pinF(s.cam, lab, 0, 0.36, 3, spring(t, C.two - 0.05, 2, 6)); }; }, { near: 0.5, far: 8000 });

// 4) Each hair splits into hundreds of even tinier tips. — one seta: up the shaft to the branching tip
shot(C.each, C.theyre2, (s) => { const sc = s.scene; semLight(sc, { bg: 0x040506 }); sc.fog = new THREE.FogExp2(0x040506, 0.006); const car = setaeCarpet(sc, { n: 900, seed: 9 }); car.im.position.set(0, -20, -160); car.plate.position.set(0, -30, -160); const S = oneSeta(sc); S.position.set(0, 0, 0); s.ap = 10; s.maxR = 16; s.exposure = 0.8; s.bloom = 0.25;
  const lab = liveLabel(0.8, 0.26); OV(s, lab); lab.userData.set([['SPATULAE', 120, 0.5, '#ffffff', 900, 3]]);
  s.update = (t) => { const k = E.io(seg(t, C.each, C.theyre2)), tip = S.userData.top.clone().add(V(4, 8, 0)); const tg = lv(V(14, 52, 0), tip, k), cp = lv(V(-40, 70, 150), tip.clone().add(V(-14, 6, 34)), k);
    shoot(s.cam, cp, tg, { fov: 30, t, hand: 0.2, focus: cp.distanceTo(tg) }); pinF(s.cam, lab, 0, -0.34, 3, spring(t, C.tinier, 2, 6)); }; }, { near: 0.2, far: 8000 });

// 5-6) They're so small, they get close enough for the molecules themselves to pull together. — atoms of a spatula tip and the ceiling
function atomSet(s) { const sc = s.scene; sc.background = new THREE.Color(0x05070c); sc.environment = STUDIO.env; sc.environmentIntensity = 0.5; sc.fog = new THREE.FogExp2(0x05070c, 0.12);
  const k = new THREE.DirectionalLight(0xffffff, 1.8); k.position.set(-3, 6, 5); sc.add(k); const rim = new THREE.DirectionalLight(0x9ac8ff, 1.6); rim.position.set(4, 2, -6); sc.add(rim);
  const bot = atomsMesh([...atomLayer(26, 18, 0.32, [0xd8c89a, 0xd8c89a, 0xc8302a], 0.13, 3, 0.02), ...atomLayer(26, 18, 0.32, [0xd8c89a, 0xc8302a], 0.13, 4, 0.02).map(([x, y, z, c, r]) => [x + 0.16, y - 0.27, z + 0.09, c, r])]); sc.add(bot);
  const top = new THREE.Group(); top.add(atomsMesh([...atomLayer(22, 16, 0.36, [0x3a3a40, 0x3a3a40, 0x3a3a40, 0xd42a20, 0x3456e0, 0xf0f0f0], 0.15, 7, 0.12), ...atomLayer(22, 16, 0.36, [0x3a3a40, 0xf0f0f0, 0xd42a20], 0.15, 8, 0.12).map(([x, y, z, c, r]) => [x + 0.18, y + 0.3, z + 0.1, c, r])])); sc.add(top);
  const clouds = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: CLOUD_T, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 300); clouds.frustumCulled = false; sc.add(clouds); clouds.userData.noDof = true;
  const r = rng(12), CL = []; for (let i = 0; i < 300; i++) CL.push({ x: (r() - 0.5) * 7, z: (r() - 0.5) * 5, top: r() < 0.5, ph: r() * 6.28 });
  return { top, bot, clouds, CL }; }
function atomUpdate(s, A, t, gap, glow) { A.top.position.y = gap; const q = new THREE.Quaternion(); s.cam.getWorldQuaternion(q); const M4 = new THREE.Matrix4();
  A.CL.forEach((c, i) => { const y = c.top ? gap - 0.05 : 0.08, off = 0.05 * Math.sin(t * 9 + c.ph); const sz = 0.55 * glow * (0.7 + 0.3 * Math.sin(t * 6 + c.ph)); M4.compose(V(c.x + off, y, c.z), q, V(sz + 1e-4, sz + 1e-4, 1)); A.clouds.setMatrixAt(i, M4); }); A.clouds.instanceMatrix.needsUpdate = true; }
shot(C.theyre2, C.for, (s) => { const A = atomSet(s); s.ap = 8; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.45;
  s.update = (t) => { const k = E.io(seg(t, C.theyre2, C.for + 0.2)); atomUpdate(s, A, t, lerp(3.2, 0.62, k), 0.3 * k); shoot(s.cam, V(-0.6 + 0.5 * k, 0.4 + 0.5 * (1 - k), 4.6 - 0.8 * k), V(0, 0.35 + 0.6 * (1 - k), 0), { fov: 30, t, hand: 0.05, focus: 4.4 }); }; }, { near: 0.01, far: 200 });
shot(C.for, C.a2, (s) => { const A = atomSet(s); s.ap = 8; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.55;
  const lab = liveLabel(0.95, 0.26); OV(s, lab); lab.userData.set([['VAN DER WAALS FORCE', 70, 0.5, '#9fd4ff', 900, 3]]);
  s.update = (t) => { const pull = smooth(C.pull - 0.1, C.pull + 0.25, t); atomUpdate(s, A, t, 0.62 - 0.1 * pull + 0.015 * Math.sin(t * 8) * (1 - pull), 0.5 + 0.8 * pull); const k = seg(t, C.for, C.a2);
    shoot(s.cam, V(-0.1 + 0.6 * k, 0.32, 3.8 - 0.5 * k), V(0, 0.3, 0), { fov: 30, t, hand: 0.05, focus: 3.6 }); pinF(s.cam, lab, 0, 0.42, 3, spring(t, C.molecules, 2, 6)); }; }, { near: 0.01, far: 200 });

// 7) A patch of hairs the size of a coin could lift a small child. — a coin-sized patch on the ceiling holding up a cement bag
shot(C.a2, C.to2, (s) => { const sc = s.scene; room(sc); const at = V(38, CEIL, 26), PB = patchAndBag(sc, at); s.ap = 7; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.35;
  const l1 = liveLabel(0.8, 0.26), l2 = liveLabel(0.8, 0.26); OV(s, l1, l2); l1.userData.set([['COIN-SIZED PATCH', 104, 0.5, '#ffffff', 900, 3]]); l2.userData.set([['≈ 20 KG · 45 LB', 116, 0.5, '#ffd27a', 900, 3]]);
  s.update = (t) => { PB.userData.update(t); const k = E.io(seg(t, C.coin - 0.1, C.child)); const tg = lv(at.clone().add(V(0, -1.5, 0)), at.clone().add(V(0, -88, 0)), k);
    const cp = lv(at.clone().add(V(-16, -16, 22)), at.clone().add(V(-120, -70, 170)), k); shoot(s.cam, cp, tg, { fov: 30, t, hand: 0.15, focus: cp.distanceTo(tg) });
    pinF(s.cam, l1, 0, 0.3, 3, spring(t, C.patch, 2, 6) * (1 - smooth(C.lift - 0.3, C.lift, t))); pinF(s.cam, l2, 0, -0.32, 3, spring(t, C.lift, 2, 6)); }; });

// 8) To let go, a gecko simply peels its toes back, like tape, — at ceiling level: the toes curl up from the tips
shot(C.to2, C.up, (s) => { const h = ceilSet(s); s.ap = 14; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => { const pk = (o) => smooth(C.peels - 0.25 + o, C.peels + 0.55 + o, t) * (1 - smooth(C.like + 0.25, C.tape + 0.2, t));
    h.gk.userData.pose({ ...restPose(t), peel: [pk(0), 0, 0, 0] }); const foot = h.gk.localToWorld(h.gk.userData.legs[0].wrist.clone()); const out = foot.clone().sub(h.W(restPath(DD - 6.4).p)).setY(0).normalize(); const k = seg(t, C.to2, C.up);
    const toe = h.gk.userData.legs[0].toes[2].t.userData.F, tp = h.gk.localToWorld(toe.P[6].clone()), base = h.gk.localToWorld(toe.P[0].clone()), td = tp.clone().sub(base).setY(0).normalize(), sd = V(td.z, 0, -td.x);
    const aim = h.gk.localToWorld(toe.P[3].clone()); shoot(s.cam, aim.clone().add(V(0, -1.0, 0)).addScaledVector(sd, 6.5 - 1.0 * k).addScaledVector(td, 1.5), aim.clone().add(V(0, 0.4, 0)), { fov: 30, t, hand: 0.04 }); }; });

// 9) up to fifteen times a second. — the gecko dashes across the ceiling
shot(C.up, C.so2, (s) => { const h = ceilSet(s); s.ap = 7; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.4; const lab = liveLabel(0.9, 0.26); OV(s, lab); lab.userData.set([['15× A SECOND', 130, 0.5, '#ffffff', 900, 3]]);
  const path = (d) => ({ p: V(-90 + d, 0, 40 - 0.25 * d), h: 0.245 });
  s.update = (t) => { const u = t - C.up, d = 30 + u * 62; h.gk.userData.pose({ t, d, path, speed: 1 }); const c = h.W(path(d - 10).p);
    shootC(s.cam, c.clone().add(V(0, -60, 0)).addScaledVector(h.sideW, 8), c, V(0, 0, -1), { fov: 32, t, hand: 0.15 }); pinF(s.cam, lab, 0, 0.36, 3, 0.8 * spring(t, C.fifteen, 2, 6)); }; });

// 10) So if one ever lands on your ceiling, don't wait for it to fall, because — it dashes in and stops by the bulb (the loop)
shot(C.so2, END + 1, (s) => { const h = ceilSet(s); s.ap = 9; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => { const tau = t - END; const sp = dashSpeed(tau); if (sp > 0.001 || tau < -0.55) h.gk.userData.pose({ ...restPose(tau), d: dashD(tau), speed: sp, headYaw: (1 - sp) * restPose(tau).headYaw }); else h.gk.userData.pose(restPose(tau));
    const H0 = hookAt(h), k = E.io(seg(t, C.so2, END - 0.35)), wide = H0.p.clone().add(V(0, -75, 0)).addScaledVector(h.fwdW, -38);
    const p = lv(wide, H0.p, k), tg = lv(h.W(restPath(DD - 34).p), H0.t, k); shootC(s.cam, p, tg, H0.up, { fov: 30, t: k > 0.999 ? tau + 100 : lerp(t, tau + 100, k), hand: 0.05, focus: k > 0.999 ? H0.p.distanceTo(H0.t) : p.distanceTo(tg) }); }; });
