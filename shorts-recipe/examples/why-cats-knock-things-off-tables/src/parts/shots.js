// =====================================================================
// SHOTS
// =====================================================================
const CATP = V(-0.15, TBL.y, 0.05), CS = 0.55, G0 = V(0.026, TBL.y, 0.435), GH = 0.36, GRAV = 9.8 * 1.15;
const QX = (a) => new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), a);
// the glass tipping over the front edge of the table, falling and hitting the floor. tau = seconds since it started to tip
function glassFall(tau) {
  const piv = V(G0.x, TBL.y, TBL.zf), tA = 0.24, th1 = 0.95;
  if (tau <= 0) return { p: V(G0.x, TBL.y, TBL.zf + 0.02), q: QX(0), a: -1, th: 0 };
  if (tau < tA) { const th = th1 * (tau / tA) ** 2, q = QX(th); return { p: piv.clone().add(V(0, 0, 0.02).applyQuaternion(q)), q, a: -1, th }; }
  const b = tau - tA, q1 = QX(th1), p1 = piv.clone().add(V(0, 0, 0.02).applyQuaternion(q1)), v = V(0, -0.55, 1.05), om = 2 * th1 / tA * 0.62;
  const A = 0.5 * GRAV, B = -v.y, Cc = 0.16 - p1.y, bHit = (-B + Math.sqrt(B * B - 4 * A * Cc)) / (2 * A);
  if (b < bHit) return { p: V(p1.x, p1.y + v.y * b - A * b * b, p1.z + v.z * b), q: QX(th1 + om * b), a: -1, th: th1 + om * b };
  return { p: null, q: null, a: b - bHit, P: V(p1.x, 0, p1.z + v.z * bHit), th: 9 };
}
// living room with the cat on the table and the glass; act() poses the cat for one frame
function heroSet(s, { owner = false } = {}) {
  const sc = s.scene; const R = livingRoom(sc); const cat = makeCat2(); cat.scale.setScalar(CS); cat.position.copy(CATP); sc.add(cat); const u = cat.userData;
  const glass = makeGlass(sc, { h: GH });
  const spill = []; for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008 + 0.012 * h3(i, 1, 1), 10, 8), new THREE.MeshPhysicalMaterial({ color: 0x9fdcf6, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.5, envMapIntensity: 1.2 })); m.visible = false; sc.add(m); spill.push(m); }
  let O = null, lap = null;
  if (owner) { O = makeKid(OWNER); addSmile(O); sc.add(O); lap = makeLaptop(); sc.add(lap); }
  const H = {
    sc, R, cat, u, glass, O, lap,
    // cat sitting on the table. o.paw: world point for the right front paw (null = resting)
    act(t, o = {}) {
      cat.position.copy(CATP).add(o.off || V(0, 0, 0)); cat.rotation.set(0, o.ry || 0, 0); cat.scale.setScalar(CS);
      u.pose({ sit: 1 });
      if (o.lean) { u.torso.rotation.x += 0.25 * o.lean; u.head.position.z += 0.22 * o.lean; u.head.position.y -= 0.1 * o.lean; }
      if (o.paw) u.paw(1, cat.worldToLocal(o.paw.clone()), o.pawPitch ?? 0.55);
      u.solve().breathe(t).lid(o.lid ?? 0.3, o.low ?? 0.12).pupil(o.pupil ?? 0.2).ears(o.ears ?? 0, o.swL ?? 0, o.swR ?? 0).whisk(o.whisk ?? 0).glow(0);
      const sw = (o.tailSw ?? 0.3) * Math.sin(t * 2.2), sw2 = (o.tailSw ?? 0.3) * Math.sin(t * 2.2 - 1.1);
      u.tail([V(0, 0.3, -0.92), V(0.08, 0.24, -1.22), V(0.14 + sw * 0.25, -0.2, -1.5), V(0.14 + sw * 0.8, -0.78, -1.52), V(0.14 + sw2 * 1.3, -1.28, -1.44)]);
      if (o.look) u.look(o.look, o.lookK ?? 1, o.tilt ?? 0); else u.head.rotation.z = o.tilt ?? 0;
      if (o.gaze) u.gaze(o.gaze); else u.gazeRest();
      R.update(t);
    },
    // the paw resting on the back of the rim, for a glass standing at p
    rimPaw(p) { return p.clone().add(V(0, GH + 0.03, -0.075)); },
    pushPaw(p) { return p.clone().add(V(0, GH * 0.8, -0.14)); },
    // glass state for a time since tipping; draws falling water and the shatter
    fall(tau, t) {
      const f = glassFall(tau);
      if (f.a < 0) { glass.shatter(V(0, 0, 0), -1); glass.place(f.p, f.q, t, tau > 0 ? 1 : 0); glass.wg.visible = f.th < 0.7; }
      else glass.shatter(f.P, f.a);
      spill.forEach((m, i) => { const e = 0.14 + i * 0.012, age = tau - e; const fe = glassFall(e); m.visible = age > 0 && fe.a < 0 && f.a < 0.25; if (!m.visible) return;
        const mouth = fe.p.clone().add(V(0, GH * 0.9, 0).applyQuaternion(fe.q)), vv = V((h3(i, 2, 2) - 0.5) * 1.1, 0.9 * h3(i, 3, 3) - 0.2, 0.5 + 1.1 * h3(i, 4, 4));
        m.position.set(mouth.x + vv.x * age, Math.max(0.02, mouth.y + vv.y * age - 0.5 * GRAV * age * age), mouth.z + vv.z * age); m.scale.set(1, 1 + 2.5 * Math.min(age, 0.3), 1); });
      return f;
    },
    stand(p = G0, t = 0, slosh = 0) { glass.shatter(V(0, 0, 0), -1); glass.place(p, null, t, slosh); glass.wg.visible = true; spill.forEach(m => m.visible = false); },
    // the owner on the sofa with a laptop
    ownerSofa(t, { gasp = 0 } = {}) {
      const ou = O.userData; ou.reset(); O.rotation.set(0, Math.PI, 0); O.position.set(R.sofa.x, 0, R.sofa.z - 0.25); seatOn(O, R.sofa.seatY); ou.breathe(t, 0.28, 0.025);
      lap.position.set(R.sofa.x, R.sofa.seatY + 0.42, R.sofa.z - 0.78); lap.rotation.set(0, Math.PI, 0);
      const q = O.quaternion, ty = Math.sin(t * 17) * 0.012;
      if (gasp < 0.02) { ik2(O, ou.arms[0], lap.position.clone().add(V(0.2, 0.05 + ty, 0.02)), V(1, -1, 0)); ik2(O, ou.arms[1], lap.position.clone().add(V(-0.2, 0.05 - ty, 0.02)), V(-1, -1, 0)); ou.hands.forEach(h => h.curl(0.35)); ou.head.rotation.x += 0.32; ou.lid(0.3, t, 2); }
      else { const hp = headPt(O, V(0, -0.05, 0.3)); ik2(O, ou.arms[0], lv(lap.position, hp.clone().add(V(0.42, 0.1, -0.2)), gasp), V(1, -0.3, 0)); ik2(O, ou.arms[1], lv(lap.position, hp.clone().add(V(-0.42, 0.1, -0.2)), gasp), V(-1, -0.3, 0)); ou.hands.forEach(h => h.curl(0.05, 1)); ou.head.rotation.x += lerp(0.32, -0.12, gasp); ou.setLid(-0.3 * gasp); ou.eyePop(1 + 0.25 * gasp); ou.raise(gasp); ou.mouthOpen(0.55 * gasp); }
    },
  };
  return H;
}
const OPEN = [V(0.3, 2.12, 4.25), V(0.0, 1.78, 0.2)];
const pushZ = (t) => kf(t, [[C.slowly - 0.05, G0.z], [2.5, 0.5], [2.74, 0.5], [3.14, 0.59], [3.28, 0.59], [C.off, TBL.zf + 0.02, E.in]]);
const TIP = C.off, IMPACT = TIP + 0.24 + 0.404;

// 0) the stare: paw on the rim, eyes locked on you ---------------------------------------------------
shot(0, C.slowly, (s) => {
  const H = heroSet(s); s.ap = 6; s.exposure = 0.98; s.bloom = 0.4;
  s.update = (t) => {
    const c = E.io(seg(t, -0.3, C.slowly + 0.3)), cp = lv(OPEN[0], V(0.22, 2.08, 3.55), c);
    H.stand(G0, t, 0);
    H.act(t, { paw: H.rimPaw(G0), look: cp, gaze: cp, tilt: 0.1, lid: 0.3, pupil: 0.2, swR: 0.35 * Math.max(0, Math.sin((t - 0.9) * 9)) * (t > 0.9 && t < 1.25 ? 1 : 0) });
    shoot(s.cam, cp, lv(OPEN[1], V(0, 1.84, 0.2), c), { fov: 34, t, focus: cp.distanceTo(H.u.eyeW()) });
  };
});
// 1) side macro: the paw shoves the glass toward the edge in little pushes -----------------------------
shot(C.slowly, C.off, (s) => {
  const H = heroSet(s); s.ap = 9; s.exposure = 0.95; s.bloom = 0.5;
  s.update = (t) => {
    const gz = pushZ(t), gp = V(G0.x, TBL.y, gz), moving = Math.abs(pushZ(t + 0.03) - pushZ(t - 0.03)) * 16;
    H.stand(gp, t, clamp(moving * 3));
    H.act(t, { paw: H.pushPaw(gp), pawPitch: 0.25, look: OPEN[0], gaze: OPEN[0], tilt: 0.1, lid: 0.3, lean: seg(t, C.slowly, C.off) * 0.5 });
    const c = E.io(seg(t, C.slowly - 0.2, C.off + 0.3));
    shoot(s.cam, lv(V(1.75, 1.6, 0.42), V(1.45, 1.56, 0.62), c), V(G0.x, 1.5, lerp(0.5, 0.62, c)), { fov: 30, t, hand: 0.6 });
  };
});
// 2) it tips, falls and smashes; the cat peers over the edge ------------------------------------------
shot(C.off, C.yousee, (s) => {
  const H = heroSet(s); s.ap = 5; s.exposure = 0.95; s.bloom = 0.45; s.sub = 4;
  s.update = (t) => {
    const f = H.fall(t - TIP, t), peek = E.io(seg(t, TIP + 0.15, TIP + 0.6)), floorP = V(G0.x, 0, 1.1);
    H.act(t, { paw: lv(H.pushPaw(V(G0.x, TBL.y, TBL.zf)), H.pushPaw(V(G0.x, TBL.y, 0.35)).add(V(0, -0.1, 0)), E.io(seg(t, TIP + 0.25, TIP + 0.7))), pawPitch: 0.25, look: floorP, lookK: peek, gaze: floorP, lean: 0.5 + 0.5 * peek, lid: lerp(0.3, 0.05, peek), pupil: lerp(0.2, 0.75, peek), ears: 0, whisk: peek, off: V(0, 0, 0.1 * peek) });
    const c = E.io(seg(t, C.off - 0.2, C.yousee + 0.3)), hit = t - IMPACT;
    shoot(s.cam, lv(V(0.85, 0.2, 2.45), V(0.7, 0.24, 2.2), c).add(shake(t, 0.035 * jolt(t, IMPACT))), lv(V(0, 1.05, 0.72), V(0, 0.7, 0.8), c), { fov: 40, t });
  };
});
// 3) cats are hunters: stalking through the grass at dusk ----------------------------------------------
const MOUSE0 = V(0.2, 0, 1.0), GC = 0.6;
function gardenSet(s) {
  const sc = s.scene; const R = garden(sc); const cat = makeCat2(); cat.scale.setScalar(GC); sc.add(cat); const u = cat.userData; const mouse = makeMouse(); mouse.scale.setScalar(0.85); sc.add(mouse);
  const tBolt = C.run - 0.05, tPounce = C.run + 0.32;
  const H = {
    R, cat, u, mouse, tBolt, tPounce,
    act(t, { creep = 0, taps = [] } = {}) {
      R.update(t);
      // the mouse: frozen, squashed by each tap, then it bolts in a zigzag
      const run = Math.max(0, t - tBolt), bolt = run > 0 ? 1 : 0, dist = 3.6 * run * run + 1.2 * run;
      mouse.position.set(MOUSE0.x - 0.5 * Math.sin(dist * 1.6), 0, MOUSE0.z + dist); mouse.rotation.y = bolt ? -0.8 * Math.cos(dist * 1.6) : Math.PI / 2;
      const tapK = taps.reduce((a, t0) => Math.max(a, jolt(t, t0 + 0.02)), 0);
      mouse.userData.update(t, bolt, 1 - bolt); mouse.scale.set(0.85 * (1 + 0.12 * tapK), 0.85 * (1 - 0.25 * tapK), 0.85 * (1 + 0.12 * tapK));
      // the cat: low crouch, shoulder wiggle, a paw that reaches out to pat; then the leap
      const leap = clamp((t - tPounce) / 0.42), air = Math.sin(Math.PI * leap), z0 = -0.55 + 0.75 * creep;
      cat.position.set(0.02 * Math.sin(t * 15) * (t > tBolt && t < tPounce ? 1 : 0), 0.75 * air, z0 + 2.6 * E.inQ(leap) + 1.2 * leap); cat.rotation.set(-0.35 * Math.cos(Math.PI * leap) * (leap > 0 ? 1 : 0), 0, 0);
      u.pose({ crouch: 1 - 0.6 * air, stand: 0.6 * air });
      const wig = t > tBolt - 0.9 && t < tPounce ? Math.sin(t * 16) * 0.05 : 0; u.hips.position.x += wig; u.hips.position.y -= 0.04 * (t > tBolt && t < tPounce ? 1 : 0);
      if (leap > 0) { [0, 1].forEach(i => u.paw(i, V(u.legs[i].sx * 0.2, 0.45 - 0.3 * leap, 1.35), -0.6)); [2, 3].forEach(i => u.paw(i, V(u.legs[i].sx * 0.3, 0.2 + 0.25 * air, -1.25), 0.8)); }
      else {
        const walk = creep * 14; [0, 1].forEach(i => { const ph = walk + i * Math.PI; u.legs[i].T.z += 0.1 * Math.cos(ph) * (creep < 1 ? 1 : 0); u.legs[i].T.y += 0.05 * Math.max(0, Math.sin(ph)) * (creep < 1 ? 1 : 0); });
        let reach = 0, lift = 0; taps.forEach(t0 => { const a = t - t0; if (a > -0.34 && a < 0.36) { reach = Math.max(reach, a < 0 ? E.io((a + 0.34) / 0.34) : 1 - E.io(a / 0.36)); lift = Math.max(lift, a < 0 ? Math.sin(Math.PI * (a + 0.34) / 0.34) : 0); } });
        if (reach > 0) { const tgt = cat.worldToLocal(mouse.position.clone().add(V(0, 0.27, -0.03))); u.paw(1, lv(u.legs[1].T.clone(), tgt, reach).add(V(0, 0.22 * lift, 0)), 0.5 * reach); }
      }
      u.solve().breathe(t, 0.012).lid(0.04, 0.0).pupil(t > tBolt - 0.1 ? 1 : 0.55).ears(0, 0.1 * Math.sin(t * 3), -0.1 * Math.sin(t * 3)).whisk(0.8).glow(0.55);
      const tw = Math.sin(t * 9) * 0.12; u.tail([V(0, 0.5, -1.12), V(0, 0.42, -1.5), V(tw * 0.5, 0.36, -1.95), V(tw * 1.6, 0.42 + 0.2 * air, -2.35), V(tw * 3, 0.56 + 0.4 * air, -2.6)]);
      const mw = mouse.position.clone().add(V(0, 0.15, 0)); u.look(mw, 1, 0, 0.9, 0.6).gaze(mw);
    },
  };
  return H;
}
shot(C.yousee, C.and1, (s) => {
  const G = gardenSet(s); s.ap = 8; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => { G.act(t, { creep: E.io(seg(t, C.yousee - 0.2, C.and1 + 0.2)) * 0.7 }); G.mouse.visible = false; const c = E.io(seg(t, C.yousee - 0.2, C.and1 + 0.3)); shoot(s.cam, lv(V(0.95, 0.3, 3.3), V(0.7, 0.34, 2.7), c), G.u.eyeW().add(V(0, -0.05, 0)), { fov: 34, t }); };
});
const TAPS = [C.test + 0.05, C.paws + 0.05, C.tapping + 0.12];
shot(C.and1, C.tapping, (s) => {
  const G = gardenSet(s); s.ap = 9; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => { G.act(t, { creep: 1, taps: TAPS }); const c = E.io(seg(t, C.and1 - 0.2, C.tapping + 0.3)); shoot(s.cam, lv(V(1.7, 0.42, 2.25), V(1.45, 0.38, 1.95), c), MOUSE0.clone().add(V(-0.05, 0.27, -0.22)), { fov: 34, t, hand: 0.6, focus: lv(V(1.7, 0.42, 2.25), V(1.45, 0.38, 1.95), c).distanceTo(MOUSE0) }); };
});
shot(C.tapping, C.so, (s) => {
  const G = gardenSet(s); s.ap = 6; s.exposure = 1.05; s.bloom = 0.5; s.sub = 4;
  s.update = (t) => { G.act(t, { creep: 1, taps: TAPS }); const fol = E.io(seg(t, G.tBolt, C.so)); shoot(s.cam, lv(V(3.0, 0.55, 1.5), V(3.3, 0.7, 2.6), fol).add(shake(t, 0.012 * jolt(t, G.tPounce))), lv(V(0.1, 0.35, 0.55), V(0.0, 0.5, 2.2), fol), { fov: 36, t, hand: 1.2 }); };
});
// 6) so when the glass falls (slow motion) ------------------------------------------------------------
shot(C.so, C.that, (s) => {
  const H = heroSet(s); s.ap = 6; s.exposure = 0.95; s.bloom = 0.45; s.sub = 4;
  s.update = (t) => {
    const tau = 0.14 + (t - C.so) * 0.3, f = H.fall(tau, t), gp = f.p || V(G0.x, 0.2, 1.1);
    H.act(t, { look: gp, gaze: gp, lean: 1, lid: 0.05, pupil: lerp(0.3, 0.6, seg(t, C.so, C.that)), whisk: 0.6, off: V(0, 0, 0.1), tailSw: 0.1 });
    const c = E.io(seg(t, C.so - 0.2, C.that + 0.3)); shoot(s.cam, lv(V(-1.45, 0.95, 3.5), V(-1.25, 0.9, 3.2), c), lv(V(-0.05, 1.5, 0.75), V(-0.05, 1.42, 0.78), c), { fov: 40, t, focus: lv(V(-1.45, 0.95, 3.5), V(-1.25, 0.9, 3.2), c).distanceTo(gp) });
  };
});
// 7) that sudden movement: the pupils blow wide open -------------------------------------------------
shot(C.that, C.instinct, (s) => {
  const H = heroSet(s); s.ap = 10; s.exposure = 0.98; s.bloom = 0.45;
  const fl = new THREE.PointLight(0xffe2c8, 5, 7, 2); s.scene.add(fl);
  const refl = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.6, 2.8), transparent: true, opacity: 0.8, depthWrite: false })); H.u.head.add(m); return m; });
  s.update = (t) => {
    const floorP = V(G0.x, 0.1, 1.15), dil = clamp(spring(t, C.sudden - 0.02, 2.2, 6));
    H.stand(V(0, -5, 0)); H.act(t, { look: floorP, gaze: floorP, lean: 1, lid: lerp(0.08, 0.0, dil), low: 0, pupil: lerp(0.24, 1.0, dil), ears: 0, swL: -0.25 * dil, swR: 0.25 * dil, whisk: dil, off: V(0, 0, 0.1), tailSw: 0.05 });
    const eye = H.u.eyeW(), dir = floorP.clone().sub(eye).normalize(), c = E.io(seg(t, C.that - 0.2, C.instinct + 0.3)), cp = eye.clone().addScaledVector(dir, lerp(2.15, 1.7, c)).add(V(0.08, 0.1, 0)); fl.position.copy(cp).add(V(-0.4, 0.5, 0.2));
    const fy = lerp(0.1, -0.09, seg(t, C.that, C.instinct)); refl.forEach((m, i) => { m.position.set((i ? 1 : -1) * 0.22 + 0.02, 0.08 + fy, 0.563); m.rotation.z = (t - C.that) * 2.5; m.material.opacity = 0.75 * Math.sin(Math.PI * seg(t, C.that, C.instinct)); });
    shoot(s.cam, cp, eye.clone().add(V(0, -0.1, 0)), { fov: 30, t, hand: 0.5 });
  };
});
// 8) the same instinct as chasing prey: x-ray of the cat, the hunting signal fires down to the paws ---
shot(C.instinct, C.but, (s) => {
  const sc = s.scene; sc.background = BG.xray; s.ap = 0; s.exposure = 1.0; s.bloom = 0.55;
  const cat = makeCat2({ xray: true }); sc.add(cat); const u = cat.userData; cat.rotation.y = -0.5; u.fur.uniforms.fade.value = 0.5;
  const brain = makeBrain(); brain.scale.multiplyScalar(0.26); brain.material = glow(0xff8a3a, 0.7); u.head.add(brain); brain.position.set(0, 0.1, -0.05);
  const nm = (dens) => new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, on: { value: 0 }, dens: { value: dens } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT; uniform float on; uniform float dens; varying vec2 vUv; void main(){ float ph=fract(vUv.x*dens-uT*1.8); float q=(ph-0.5)/0.08; float pulse=exp(-q*q); gl_FragColor=vec4(vec3(1.0,0.62,0.2)*(0.25+0.3*on)+vec3(1.0,0.95,0.7)*pulse*2.8*on,1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const spineM = nm(4), legM = nm(3); const spine = new THREE.Mesh(new THREE.BufferGeometry(), spineM); cat.add(spine); const nerves = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), legM); cat.add(m); return m; });
  const ghost = makeMouse(); const gm = xrayMat(new THREE.Color(1.0, 0.75, 0.4), new THREE.Color(0.25, 0.1, 0.02), 2.0, 1.1); ghost.traverse(o => { if (o.isMesh) { o.material = gm; o.castShadow = false; } }); ghost.scale.setScalar(1.5); sc.add(ghost);
  const r = rng(2); for (let i = 0; i < 50; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008 + r() * 0.012, 6, 4), glow(0x6fb6ff, 0.35)); m.position.set((r() - 0.5) * 7, r() * 4, (r() - 0.5) * 4 - 1.5); sc.add(m); }
  s.update = (t) => {
    const on = clamp(spring(t, C.instinct + 0.05, 2, 6)), swipe = jolt(t, C.chasing + 0.1) + jolt(t, C.chasing + 0.5);
    const gx = lerp(-2.6, 2.8, seg(t, C.chasing - 0.25, C.but)), gp = V(gx, 0, 1.55);
    ghost.position.copy(gp); ghost.rotation.y = Math.PI / 2; ghost.userData.update(t, 1, 0); ghost.visible = t > C.chasing - 0.25;
    u.pose({ sit: 1 }); u.paw(1, lv(u.legs[1].T.clone(), V(0.3, 0.6, 1.05), swipe), 0.4 * swipe);
    u.solve().lid(0.02).ears(0, -0.2, 0.2).whisk(1);
    const sw = Math.sin(t * 7) * 0.5 * on; u.tail([V(0, 0.3, -0.92), V(0.3, 0.14, -1.08), V(0.74, 0.1, -0.7 + sw * 0.2), V(0.9 + sw * 0.25, 0.1, -0.1), V(0.7 + sw * 0.6, 0.12, 0.4)]);
    if (ghost.visible) u.look(gp.clone().add(V(0, 0.2, 0)), 1, 0, 1.0, 0.6);
    brain.material.opacity = 0.35 + 0.6 * on * (0.75 + 0.25 * Math.sin(t * 16));
    const hp = u.head.position, sp = [hp.clone().add(V(0, 0, -0.1)), V(0, 1.45, -0.25), V(0, 1.05, -0.48), V(0, 0.6, -0.75)]; spine.geometry.dispose(); spine.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 40, 0.045, 8);
    nerves.forEach((m, i) => { const L = u.legs[i]; cat.updateMatrixWorld(true); const el = cat.worldToLocal(L.lo.getWorldPosition(new THREE.Vector3())), pw = cat.worldToLocal(L.paw.getWorldPosition(new THREE.Vector3())); m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 1.4, -0.2), L.up.position.clone(), el, pw.add(V(0, 0.05, 0.05))]), 40, 0.03, 8); });
    [spineM, legM].forEach(m => { m.uniforms.uT.value = t; m.uniforms.on.value = on; });
    const c = E.io(seg(t, C.instinct - 0.2, C.but + 0.3)); shoot(s.cam, lv(V(2.6, 1.7, 5.2), V(1.9, 1.5, 4.4), c), V(0.1, 1.05, 0.2), { fov: 36, t });
  };
});
// 9) but there's another reason: the cat, and beyond it the owner who isn't paying attention ---------
shot(C.but, C.the, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 9; s.exposure = 0.98; s.bloom = 0.42;
  s.update = (t) => {
    const cp = lv(V(-1.25, 2.45, -1.75), V(-1.05, 2.4, -1.45), E.io(seg(t, C.but - 0.2, C.the + 0.3))), side = E.io(seg(t, C.another, C.reason + 0.3));
    H.stand(G0, t, 0); H.ownerSofa(t);
    H.act(t, { look: lv(V(0.3, 2.2, 4.6), cp, side), lookK: 1, gaze: cp, tilt: -0.1 * side, lid: lerp(0.25, 0.5, side), pupil: 0.25, tailSw: 0.55 });
    const rack = E.io(seg(t, C.but + 0.25, C.another + 0.1)) * (1 - E.io(seg(t, C.reason, C.reason + 0.4)));
    shoot(s.cam, cp, V(0.1, 2.0, 2.4), { fov: 36, t, focus: lerp(cp.distanceTo(H.u.eyeW()), cp.distanceTo(V(0.3, 2.6, 4.75)), rack) });
  };
});
// 10) the first time it crashed (seen from above) ---------------------------------------------------
shot(C.the, C.you, (s) => {
  const H = heroSet(s); s.ap = 4; s.exposure = 0.98; s.bloom = 0.45; s.sub = 4;
  const hitT = C.crashed + 0.06;
  s.update = (t) => {
    const tau = t < hitT ? 0.644 - (hitT - t) * 0.45 : 0.644 + (t - hitT); H.fall(tau, t);
    H.act(t, { look: V(G0.x, 0, 1.1), gaze: V(G0.x, 0, 1.1), lean: 1, lid: 0.05, pupil: 0.8, whisk: 1, off: V(0, 0, 0.1) });
    const c = E.io(seg(t, C.the - 0.2, C.you + 0.3)); shoot(s.cam, lv(V(0.5, 3.5, 2.5), V(0.35, 3.1, 2.2), c).add(shake(t, 0.03 * jolt(t, hitT))), V(G0.x, 0.1, 1.05), { fov: 38, t });
  };
});
// 11) you gasped and came running ----------------------------------------------------------------------
shot(C.you, C.and2, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 5; s.exposure = 0.98; s.bloom = 0.42; s.sub = 4;
  s.update = (t) => {
    const gasp = clamp(spring(t, C.gasped - 0.05, 2.2, 6)), up = E.io(seg(t, C.gasped + 0.3, C.came + 0.05)), run = seg(t, C.came, C.and2 + 0.3);
    H.fall(2, t); H.act(t, { look: V(0.3, 2.3, 3.5), gaze: V(0.3, 2.3, 3.5), lid: 0.15, pupil: 0.45, tailSw: 0.5 });
    H.ownerSofa(t, { gasp });
    if (up > 0) {
      const ou = H.O.userData; ou.reset(); H.O.rotation.set(0, Math.PI, 0); const z = lerp(R_SOFA_Z, 2.9, E.inQ(run)); H.O.position.set(0.3, 0, z);
      if (run > 0) { ou.gait((t - C.came) * 11, 1, 1); H.O.position.y = ou.bob; H.O.rotation.x = -ou.lean; } else { seatOn(H.O, lerp(1.03, 1.44, up)); ou.legs.forEach(L => { L.hip.rotation.x = lerp(-1.45, 0, up); L.knee.rotation.x = lerp(1.4, 0, up); }); }
      ou.setLid(-0.3); ou.eyePop(1.25); ou.raise(1); ou.mouthOpen(0.5); if (run <= 0) { const hp = headPt(H.O, V(0, -0.05, 0.3)); ik2(H.O, ou.arms[0], hp.clone().add(V(0.42, 0.1, -0.2)), V(1, -0.3, 0)); ik2(H.O, ou.arms[1], hp.clone().add(V(-0.42, 0.1, -0.2)), V(-1, -0.3, 0)); ou.hands.forEach(h => h.curl(0.05, 1)); }
    }
    const c = E.io(seg(t, C.you - 0.2, C.and2 + 0.3)); shoot(s.cam, lv(V(1.35, 1.95, 0.2), V(1.3, 1.9, 0.0), c), lv(V(0.3, 2.35, 4.6), V(0.3, 2.05, 3.2), run), { fov: 40, t });
  };
});
const R_SOFA_Z = 4.75;
// 12) and your cat learned: a thought bubble connects the crash with the human appearing ---------------
function ownerKneel(O, t, x, z, ry, { armsUp = 0, pet = null, look = null } = {}) {
  const ou = O.userData; ou.reset(); O.rotation.set(0, ry, 0); O.position.set(x, -0.62, z);
  ou.legs.forEach((L, i) => { L.hip.rotation.set(-0.15, (i ? 1 : -1) * 0.1, 0); L.knee.rotation.x = 1.75; L.ankle.rotation.x = 0.6; });
  ou.breathe(t, 0.3, 0.025); const q = O.quaternion;
  if (pet) { ik2(O, ou.arms[1], pet, V(0, -1, 0.3)); ou.hands[1].curl(0.25); } else ik2(O, ou.arms[1], worldPt(O, V(0.45 + 0.25 * armsUp, 1.5 + 1.35 * armsUp, 0.35)), V(1, -0.6, -0.4).applyQuaternion(q));
  ik2(O, ou.arms[0], worldPt(O, V(-0.45 - 0.25 * armsUp, 1.5 + 1.35 * armsUp, 0.35)), V(-1, -0.6, -0.4).applyQuaternion(q)); if (!pet) ou.hands.forEach(h => h.curl(0.1, 1)); else ou.hands[0].curl(0.4);
  if (look) { const hp = ou.head.getWorldPosition(new THREE.Vector3()), d = O.worldToLocal(look.clone()).sub(O.worldToLocal(hp.clone())); ou.head.rotation.y += clamp(Math.atan2(d.x, d.z), -0.8, 0.8); ou.head.rotation.x += clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 0.5); }
  return ou;
}
shot(C.and2, C.fastest, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 6; s.exposure = 0.98; s.bloom = 0.42; H.lap.visible = false;
  const bub = cloudPuffs(1.5, 1.0); s.scene.add(bub); const ic = canvasDyn(512, 300); const icM = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.73), new THREE.MeshBasicMaterial({ map: ic.t, transparent: true })); icM.position.z = 0.26; bub.add(icM);
  const trail = [0.07, 0.11].map(r => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), bub.children[0].material); s.scene.add(m); return m; });
  const draw = (k) => { const g = ic.g; g.clearRect(0, 0, 512, 300); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#2a3a44'; g.fillStyle = '#2a3a44'; g.lineWidth = 9;
    const a = clamp(k / 0.3); g.globalAlpha = a; g.save(); g.translate(92, 150); g.rotate(0.6); g.beginPath(); g.moveTo(-34, -52); g.lineTo(34, -52); g.lineTo(26, 52); g.lineTo(-26, 52); g.closePath(); g.stroke(); g.fillStyle = '#7ad0f0'; g.fillRect(-27, -8, 54, 56); g.restore(); g.strokeStyle = '#7ad0f0'; [[150, 190], [164, 222], [136, 232]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); });
    const b = clamp((k - 0.3) / 0.3); g.globalAlpha = b; g.strokeStyle = '#2a3a44'; g.beginPath(); g.moveTo(205, 150); g.lineTo(205 + 80 * b, 150); g.stroke(); if (b > 0.9) { g.beginPath(); g.moveTo(262, 126); g.lineTo(290, 150); g.lineTo(262, 174); g.stroke(); }
    const c = clamp((k - 0.6) / 0.3); g.globalAlpha = c; g.fillStyle = '#d9a441'; g.beginPath(); g.arc(400, 196, 70, Math.PI, 0); g.fill(); g.fillStyle = '#f0b48e'; g.beginPath(); g.arc(400, 118, 44, 0, 7); g.fill(); g.fillStyle = '#7a3b18'; g.beginPath(); g.arc(400, 104, 46, Math.PI, 0); g.fill(); g.fillStyle = '#ff5a3a'; g.font = 'bold 80px sans-serif'; g.textAlign = 'center'; g.fillText('!', 474, 96); g.globalAlpha = 1; ic.t.needsUpdate = true; };
  s.update = (t) => {
    const ou = ownerKneel(H.O, t, -0.7, 1.7, Math.PI - 0.3, { armsUp: 0.75 + 0.1 * Math.sin(t * 9), look: H.u.eyeW() }); ou.raise(0.8); ou.mouthOpen(0.3 + 0.15 * Math.sin(t * 8)); ou.setLid(0.05);
    H.fall(3, t); const smug = E.io(seg(t, C.learned, C.fastest));
    H.act(t, { look: headPt(H.O, V(0, 0, 0.3)), gaze: headPt(H.O, V(0, 0, 0.3)), lid: lerp(0.1, 0.45, smug), pupil: lerp(0.6, 0.25, smug), tilt: 0.12 * smug, tailSw: 0.6 });
    const c = E.io(seg(t, C.and2 - 0.2, C.fastest + 0.3)), cp = lv(V(1.7, 2.5, 4.4), V(1.5, 2.55, 4.0), c);
    const hw = H.u.W(V(0.3, 2.5, 0.1)), pop = Math.max(0.0001, spring(t, C.and2 + 0.2, 1.8, 6)); bub.position.copy(hw).add(V(0.2, 0.62, 0)); bub.scale.setScalar(pop * 0.7); bub.lookAt(cp);
    trail.forEach((m, i) => { m.position.copy(hw).add(V(0.02 + i * 0.07, 0.06 + i * 0.17, 0)); m.scale.setScalar(Math.max(0.0001, spring(t, C.and2 + 0.05 + i * 0.07, 2, 6))); });
    draw(seg(t, C.and2 + 0.35, C.learned + 0.5));
    shoot(s.cam, cp, V(0.02, 2.82, 0.3), { fov: 38, t, focus: cp.distanceTo(H.u.eyeW()) });
  };
});
// 13) the fastest way to get your attention: chin scratches, and one smug eye for the camera ----------
shot(C.fastest, C.in1, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 7; s.exposure = 0.98; s.bloom = 0.42; H.lap.visible = false; H.glass.g.visible = false;
  s.update = (t) => {
    H.fall(4, t); const cp = lv(V(0.7, 2.35, 3.7), V(0.55, 2.32, 3.3), E.io(seg(t, C.fastest - 0.2, C.in1 + 0.3)));
    const bliss = E.io(seg(t, C.fastest, C.way + 0.2)), wink = E.io(seg(t, C.attention - 0.05, C.attention + 0.3)), purr = 0.006 * Math.sin(t * 60);
    H.act(t, { look: cp, lookK: 0.5 + 0.5 * wink, gaze: cp, tilt: -0.22 * bliss, lid: lerp(0.3, 0.95, bliss), low: 0.5 * bliss, pupil: 0.3, tailSw: 0.7, off: V(purr, 0, 0) });
    H.u.lids[1].rotation.x = lerp(-0.8, 1.45, lerp(0.95, 0.42, wink) * bliss + 0.3 * (1 - bliss));
    const top = H.u.W(V(-0.25, 2.42 + 0.03 * Math.sin(t * 7), 0.05)); const ou = ownerKneel(H.O, t, -1.02, 0.8, 2.25, { pet: top, look: H.u.eyeW() }); ou.smile(0.9); ou.lid(0.25, t, 1); ou.head.rotation.z += -0.12;
    shoot(s.cam, cp, H.u.eyeW().add(V(-0.3, -0.12, 0)), { fov: 36, t, focus: cp.distanceTo(H.u.eyeW()) });
  };
});
// 14-16) the study: food, toy, scent or a human -----------------------------------------------------
function labSet(s) {
  const sc = s.scene; const R = lab(sc); const cat = makeCat2(); cat.scale.setScalar(0.62); sc.add(cat); const u = cat.userData;
  const sci = makeKid({ shirt: 0xf5f5f5, pants: 0x3a4a5a, hair: 0x1a1210, skin: 0x8d5a3b, style: 'curly', glasses: true, coat: true, s: 1.0, hs: 1.0 }); addSmile(sci); sc.add(sci);
  const tGo = C.half - 0.25, tArr = C.human - 0.1, Z0 = 1.15, Z1 = -1.2;
  const H = {
    R, cat, u, sci, tGo, tArr,
    act(t, cam) {
      const su = sci.userData; su.reset(); sci.position.set(R.P.human.x, -1.3 + 0.2, R.P.human.z - 0.25); sci.rotation.set(0, 0, 0);
      su.legs.forEach((L, i) => { const sx = i ? 1 : -1; L.hip.rotation.set(-1.5, sx * 0.75, 0); L.knee.rotation.x = 2.2; });
      su.breathe(t, 0.3, 0.02); su.smile(0.6 + 0.4 * smooth(tArr, tArr + 0.4, t)); su.lid(0.15, t, 3);
      const go = E.io(seg(t, tGo, tArr)), z = lerp(Z0, Z1, go), arrived = smooth(tArr - 0.1, tArr + 0.3, t), walking = go > 0 && go < 1 ? 1 : 0;
      cat.position.set(0.1 * Math.sin(go * 6) * walking, 0, z); cat.rotation.set(0, Math.PI + 0.15 * arrived, 0);
      u.pose({ sit: 1 - smooth(tGo - 0.15, tGo + 0.1, t) + smooth(tArr + 0.5, tArr + 0.9, t) * 0, stand: smooth(tGo - 0.15, tGo + 0.1, t) });
      const speed = (Z0 - Z1) / (tArr - tGo), ph = (t - tGo) * Math.PI * speed / (2 * 0.26 * 0.62);
      if (walking) u.legs.forEach((L, i) => { const f = ((ph + ((i === 0 || i === 3) ? 0 : Math.PI)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); L.T.z += 0.26 * (f < Math.PI ? -Math.cos(f) : Math.cos(f - Math.PI)); L.T.y += f < Math.PI ? 0.14 * Math.sin(f) : 0; });
      u.solve().breathe(t).lid(lerp(0.15, 0.8, arrived), 0.3 * arrived).pupil(0.35).ears(0).whisk(0.3);
      u.tailRest(t, 0.35); if (walking) cat.position.y = 0.02 * Math.abs(Math.sin(ph));
      // before it starts: looks at the food, then the toy; then walks straight to the human and rubs a cheek on the hand
      const hand = worldPt(sci, V(0.2, 1.05, 0.95));
      const lk = t < tGo ? (t < tGo - 0.45 ? R.P.food.clone().add(V(0, 0.3, 0)) : R.P.toy.clone().add(V(0, 0.3, 0))) : hand;
      u.look(lk, 1, 0.3 * arrived * Math.sin(t * 5), 1.0, 0.6).gaze(lk);
      ik2(sci, su.arms[1], lv(worldPt(sci, V(0.45, 1.3, 0.7)), u.eyeW().add(V(0.05, 0.12, 0.0)), arrived), V(1, -1, 0)); su.hands[1].curl(0.3, 0.5);
      ik2(sci, su.arms[0], worldPt(sci, V(-0.5, 1.25, 0.55)), V(-1, -1, 0)); su.hands[0].curl(0.5);
      const hl = u.eyeW(); const hp = su.head.getWorldPosition(new THREE.Vector3()), d = hl.clone().sub(hp); su.head.rotation.y += clamp(Math.atan2(d.x, d.z), -0.6, 0.6); su.head.rotation.x += clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.3, 0.6);
      // result numbers pop up over each station
      const pops = { human: C.over + 0.04, food: C.food + 0.05, toy: C.toys - 0.08, scent: C.toys + 0.17 }, hgt = { human: 2.95, food: 0.95, toy: 0.9, scent: 0.75 };
      Object.keys(R.num).forEach(k => { const m = R.num[k]; m.position.copy(R.P[k]).add(V(0, hgt[k], 0)); m.scale.setScalar(Math.max(0.0001, spring(t, pops[k], 1.8, 6))); m.lookAt(cam.position); });
    },
  };
  return H;
}
shot(C.in1, C.half, (s) => { const L = labSet(s); s.ap = 3; s.exposure = 1.0; s.update = (t) => { const c = E.io(seg(t, C.in1 - 0.2, C.half + 0.3)); shoot(s.cam, lv(V(0.3, 9.0, 5.6), V(0.25, 8.0, 5.0), c), V(0, 0.3, 0.15), { fov: 40, t }); L.act(t, s.cam); }; });
shot(C.half, C.over, (s) => { const L = labSet(s); s.ap = 5; s.exposure = 1.0; s.update = (t) => { const c = E.io(seg(t, C.half - 0.2, C.over + 0.3)); const cz = L.cat.position.z; shoot(s.cam, lv(V(2.6, 3.0, 4.0), V(2.0, 2.4, 1.9), c), lv(V(0, 0.8, 0.6), V(0, 1.45, -1.7), c), { fov: 40, t }); L.act(t, s.cam); }; });
shot(C.over, C.so2, (s) => { const L = labSet(s); s.ap = 8; s.exposure = 1.0; s.update = (t) => { const c = E.io(seg(t, C.over - 0.2, C.so2 + 0.3)); shoot(s.cam, lv(V(2.6, 5.4, 8.4), V(2.3, 5.0, 7.7), c), V(0, 1.75, -0.2), { fov: 40, t, focus: lv(V(2.6, 5.4, 8.2), V(2.3, 5.0, 7.5), c).distanceTo(V(0, 0.9, -1.4)) }); L.act(t, s.cam); }; });
// 17) so the more you react -------------------------------------------------------------------------
shot(C.so2, C.react + 0.42, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 5; s.exposure = 0.98; s.bloom = 0.42; H.lap.visible = false;
  s.update = (t) => {
    H.fall(5, t); const up = clamp(spring(t, C.more - 0.1, 2, 5));
    const ou = ownerKneel(H.O, t, 0.2, 1.9, Math.PI, { armsUp: up, look: H.u.eyeW() }); ou.wince(0.7 * up); ou.mouthOpen(0.4 * up); ou.setLid(0.2); ou.head.rotation.z += 0.1 * Math.sin(t * 9) * up;
    const oh = headPt(H.O, V(0, 0, 0.3)); H.act(t, { look: oh, gaze: oh, lean: 0.5, lid: 0.45, pupil: 0.25, tilt: 0.1, tailSw: 0.7 });
    const c = E.io(seg(t, C.so2 - 0.2, C.react + 0.6)); shoot(s.cam, lv(V(-2.0, 3.3, -1.5), V(-1.8, 3.2, -1.3), c), V(-0.15, 1.7, 1.0), { fov: 40, t, focus: lv(V(-2.0, 3.3, -1.5), V(-1.8, 3.2, -1.3), c).distanceTo(oh) });
  };
});
// 18) the more often... a fresh glass, and the paw is already on it (matches frame one) --------------
shot(C.react + 0.42, C.end + 0.3, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 6; s.exposure = 0.98; s.bloom = 0.4; H.lap.visible = false;
  const T0 = C.react + 0.42, T1 = C.end;
  s.update = (t) => {
    const tt = t - T1; H.stand(G0, tt, 0.6 * Math.exp(-(t - T0) * 5));
    const away = E.io(seg(t, T0 + 0.05, T0 + 0.5)), pawUp = E.io(seg(t, T0 + 0.3, T1 - 0.2)), rest = H.u.W(V(0.17, 0.03, 0.4));
    const ou = ownerKneel(H.O, t, lerp(1.05, 1.9, away), 1.35, Math.PI + 0.35); const grip = lv(G0.clone().add(V(0.14, GH * 0.6, 0.06)), V(1.7, 1.2, 1.6), away);
    ik2(H.O, ou.arms[1], grip, V(0.3, -1, 0.3)); ou.hands[1].curl(lerp(0.6, 0.3, away));
    const c = E.io(seg(t, T0 - 0.1, T1)), cp = lv(V(0.4, 2.2, 4.6), OPEN[0], c);
    const pawT = lv(rest, H.rimPaw(G0), pawUp).add(V(0, 0.14 * Math.sin(Math.PI * pawUp), 0));
    H.act(tt, { paw: pawT, pawPitch: 0.55 * pawUp, look: lv(G0.clone().add(V(0, 0.4, 0)), cp, E.io(seg(t, T0 + 0.45, T1 - 0.15))), gaze: cp, tilt: 0.1 * pawUp, lid: 0.3, pupil: 0.2 });
    shoot(s.cam, cp, lv(V(0.05, 1.8, 0.25), OPEN[1], c), { fov: 34, t: tt, focus: cp.distanceTo(H.u.eyeW()) });
  };
});
