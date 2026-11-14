// =====================================================================
// SHOTS
// =====================================================================
const popRing = (sc) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 8, 40), hdr(2.2, 2.2, 2.4, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sc.add(m); return m; };
const showRing = (m, pos, t, t0, cam, size = 1) => { const a = t - t0; m.visible = a > 0 && a < 0.3; if (!m.visible) return; m.position.copy(pos); m.scale.setScalar(size * (0.5 + a * 9)); m.material.color.setScalar(2.4 * (1 - a / 0.3)); m.lookAt(cam.position); };
// the gamer in his chair, with acting controls
function gamerSet(s) {
  const sc = s.scene; const R = gamerRoom(sc); const K = makeGamer(); sc.add(K); const u = K.userData;
  const rings = [0, 1, 2].map(() => popRing(sc));
  const A = {
    // push: 0 hands at chest, 1 arms locked out with interlocked fingers
    pose(t, { push = 0, smirk = 0, look = 0, strain = 0, tryK = 0, annoyed = 0, turn = 0 } = {}) {
      u.reset(); K.position.set(0, 0, 0.3); K.rotation.y = Math.PI; seatOn(K, 1.03, 0.95); u.breathe(t, 0.3, 0.025);
      const q = K.quaternion, L = (x, y, z) => worldPt(K, V(x, y, z));
      if (tryK > 0.001) {
        // left index held up, right hand grabbing and pulling it
        const tip = L(-0.12, 2.25, 0.62); ik2(K, u.arms[0], tip, V(-1, -1, 0).applyQuaternion(q)); u.hands[0].curl(0.9); u.hands[0].finger(0, 0.0);
        const pull = 0.05 * Math.max(0, Math.sin(t * 9)) * strain;
        ik2(K, u.arms[1], L(0.0 + pull, 2.33, 0.78 + pull), V(1, -1, 0.2).applyQuaternion(q)); u.hands[1].curl(0.75);
      } else {
        const hz = lerp(0.42, 0.98, push), hy = lerp(2.0, 2.2, push);
        ik2(K, u.arms[0], L(-0.06, hy, hz), V(-1, -1.2, -0.2).applyQuaternion(q)); ik2(K, u.arms[1], L(0.06, hy, hz), V(1, -1.2, -0.2).applyQuaternion(q));
        u.hands.forEach(h => h.curl(lerp(0.55, 0.75, push))); u.hands[0].hand.rotation.z = 0.3 * push; u.hands[1].hand.rotation.z = -0.3 * push;
      }
      u.lid(lerp(0.15, 0.5, smirk) + 0.4 * strain, t, 1); u.smile(smirk * (1 - strain)); u.wince(strain * 0.8 + annoyed * 0.5); if (strain > 0.05) u.mouthOpen(0.12 * strain);
      u.head.rotation.y += look * 0.9 + turn * 1.1; u.head.rotation.x += -0.12 * smirk + 0.1 * annoyed; u.head.rotation.z += 0.1 * smirk;
      u.gaze(look * 0.4 + turn * 0.5, 0.05);
      R.update(t);
    },
  };
  return { sc, R, K, u, A, rings };
}

// 0) hook: interlock, push out, pop pop pop ---------------------------------------------------------
const OPEN = [V(0.55, 2.55, -1.15), V(0.0, 2.35, 0.25)];
shot(0, C.that, (s) => {
  const G = gamerSet(s); s.ap = 5; s.exposure = 1.0; s.bloom = 0.45; s.sub = 4;
  const pops = [0.82, 0.98, 1.16];
  s.update = (t) => {
    const push = E.back(seg(t, 0.15, 0.85)), smirk = smooth(1.0, 1.35, t);
    G.A.pose(t, { push, smirk });
    const hands = G.u.hands[0].hand.getWorldPosition(new THREE.Vector3()).lerp(G.u.hands[1].hand.getWorldPosition(new THREE.Vector3()), 0.5);
    pops.forEach((p0, i) => showRing(G.rings[i], hands.clone().add(V((i - 1) * 0.06, 0.03, 0)), t, p0, s.cam, 1.2));
    const c = E.io(seg(t, -0.2, C.that + 0.3));
    shoot(s.cam, lv(OPEN[0], V(0.42, 2.5, -0.7), c).add(shake(t, 0.01 * (jolt(t, pops[0]) + jolt(t, pops[1]) + jolt(t, pops[2])))), lv(OPEN[1], V(0, 2.3, 0.1), c), { fov: 38, t });
  };
});
// 1-2) macro: a fist closing knuckle by knuckle, then the same thing in x-ray -------------------------
function fistShot(start, end, xray) {
  return shot(start, end, (s) => {
    const sc = s.scene; s.ap = xray ? 0 : 8; s.exposure = 1.0; s.bloom = xray ? 0.55 : 0.4; s.sub = 4;
    let R = null; if (!xray) R = gamerRoom(sc); else { sc.background = BG.xray; const rr = rng(2); for (let i = 0; i < 50; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008 + rr() * 0.01, 6, 4), glow(0x6fb6ff, 0.35)); m.position.set((rr() - 0.5) * 6, 0.5 + rr() * 4, -2 - rr() * 3); sc.add(m); } }
    const H = makeHandRig({ side: 'R', skin: 0xc68a5e, xray, sleeve: 0x34394a }); sc.add(H.G); const O = V(0, 2.1, -0.55); H.G.position.copy(O); H.G.rotation.set(0.15, Math.PI + 0.35, 0.1);
    const rings = [0, 1, 2, 3].map(() => popRing(sc)); const flashes = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 10), glow(0xbfe8ff, 0)); sc.add(m); return m; });
    const P = [1.6, 1.78, 1.92, 2.08].map(x => x + (xray ? 1.0 : 0));
    s.update = (t) => {
      if (R) R.update(t);
      const c = P.map((p0, i) => { const pre = smooth(p0 - 0.35, p0 - 0.02, t) * 0.88; const snap = t > p0 ? 0.88 + 0.12 * spring(t, p0, 3, 9) : pre; return Math.min(1.05, snap); });
      const jolt0 = P.reduce((a, p0) => a + jolt(t, p0), 0);
      H.pose({ c, thumb: smooth(P[0] - 0.4, P[3], t) * 0.9 }); H.G.position.copy(O).add(V(0, 0, -0.012 * jolt0));
      P.forEach((p0, i) => { const kn = H.jointW(i, 0); showRing(rings[i], kn, t, p0, s.cam, 0.9); const a = t - p0; flashes[i].position.copy(kn); flashes[i].material.opacity = xray && a > 0 ? Math.exp(-a * 9) * 0.9 : 0; flashes[i].scale.setScalar(xray && a > 0 ? 0.6 + a * 2 : 0.0001); });
      if (xray) H.bones.forEach(b => b.material.color.setScalar(1.6 + 0.8 * Math.exp(-Math.abs(t - C.bones - 0.1) * 6)));
      const c2 = E.io(seg(t, start - 0.2, end + 0.3));
      shoot(s.cam, O.clone().add(lv(V(0.75, 0.55, -1.7), V(0.55, 0.45, -1.35), c2)).add(shake(t, 0.006 * jolt0)), O.clone().add(V(0, 0.35, 0)), { fov: 34, t, hand: 0.6 });
    };
  });
}
fistShot(C.that, C.isnt, false);
fistShot(C.isnt, C.yousee, true);
// 3-6) inside the joint ---------------------------------------------------------------------------------
function jointShot(start, end, camFn, stateFn, extra = {}) {
  return shot(start, end, (s) => { const J = jointStudio(s.scene); s.ap = extra.ap ?? 5; s.exposure = 1.0; s.bloom = 0.42; Object.assign(s, extra); s.update = (t) => { const st = stateFn(t); J.gaugeOn = st.gaugeOn ?? 0; J.update(t, st); camFn(s, t); }; });
}
const jointState = (t) => {
  const gap = t < C.pull ? 0 : Math.max(0, kf(t, [[C.pull - 0.1, 0], [C.pull + 0.05, -0.02], [C.apart + 0.3, 0.3, E.back], [C.and2, 0.3], [C.dissolve + 0.5, 0.12]]));
  const born = C.bursts, bub = t < born ? 0 : (t < C.and2 ? 0.3 * clamp(spring(t, born, 2.2, 5)) : lerp(0.3, 0.04, E.io(seg(t, C.and2 + 0.1, C.which - 0.05))));
  return {
    gap, fluid: smooth(C.slippery - 0.2, C.fluid + 0.3, t), cap: smooth(C.capsule - 0.1, C.capsule + 0.3, t) * (1 - 0.6 * smooth(C.fluid, C.fluid + 0.6, t)),
    gauge: lerp(0.85, 0.12, E.out(seg(t, C.drops - 0.05, C.drops + 0.45))) + 0.02 * Math.sin(t * 30) * smooth(C.drops, C.fast, t), gaugeOn: clamp(spring(t, C.pull + 0.1, 1.8, 6)) * (1 - smooth(C.and2 - 0.2, C.and2, t)),
    bubble: bub, born, flashT: born, micro: t > born && t < born + 0.9 ? 1 : 0,
    swOn: clamp(spring(t, C.and2 + 0.15, 1.8, 6)), swVal: 20 * E.inQ(seg(t, C.and2 + 0.3, C.which - 0.1)),
  };
};
jointShot(C.yousee, C.tiny, (s, t) => { const c = E.io(seg(t, C.yousee - 0.2, C.tiny + 0.3)); shoot(s.cam, lv(V(1.6, 1.4, 6.6), V(0.8, 0.8, 4.6), c), V(0, 0, 0), { fov: 36, t }); }, jointState);
jointShot(C.tiny, C.and1, (s, t) => { const c = E.io(seg(t, C.tiny - 0.2, C.and1 + 0.3)); shoot(s.cam, lv(V(-1.4, 0.9, 3.6), V(-1.0, 0.7, 3.1), c), V(0.0, 0.0, -0.1), { fov: 36, t }); }, jointState);
jointShot(C.and1, C.fast, (s, t) => { const c = E.io(seg(t, C.and1 - 0.2, C.fast + 0.3)); shoot(s.cam, lv(V(1.0, 0.7, 4.2), V(0.6, 0.65, 3.6), c), V(0.25, 0.3, 0), { fov: 38, t }); }, jointState);
jointShot(C.fast, C.scientists, (s, t) => { const c = E.io(seg(t, C.fast - 0.2, C.scientists + 0.3)); shoot(s.cam, lv(V(0.45, 0.25, 2.5), V(0.3, 0.15, 1.8), c).add(shake(t, 0.03 * jolt(t, C.bursts + 0.05))), V(0.16, 0.0, -0.05), { fov: 36, t, focus: lv(V(0.45, 0.25, 2.5), V(0.3, 0.15, 1.8), c).distanceTo(V(0.16, 0, -0.06)) }); }, jointState, { sub: 4, ap: 7 });
// 7-8) the MRI ------------------------------------------------------------------------------------------
function mriSet(s) {
  const sc = s.scene; const R = mriRoom(sc);
  const vol = makeChar2({ shirt: 0x6fa8dc, pants: 0x3a4250, hair: 0x5a3416, skin: 0xe6a07a }); sc.add(vol);
  const sci = makeChar2({ shirt: 0xf5f5f5, pants: 0x3a3f4a, hair: 0x1a1210, skin: 0x8d5a3b, style: 'curly', glasses: true, coat: true }); sc.add(sci);
  const chairs = [V(0.9, 0, -0.6), V(2.2, 0, -0.35)].map(p => { const g = new THREE.Group(); g.position.copy(p); sc.add(g); const st = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.1, 0.8, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x3a4a5a })); st.position.y = 0.95; g.add(st); const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 10), M.chrome); lg.position.y = 0.45; g.add(lg); return g; });
  const pose = (t, pull = 0, react = 0) => {
    vol.userData.reset(); vol.position.set(0.9, 0, -0.6); vol.rotation.y = -Math.PI / 2; seatOn(vol, 1.0, 1);
    ik2(vol, vol.userData.arms[0], V(-0.62, 2.05, -0.62), V(0, -1, -0.5)); vol.userData.hands[0].curl(0.4); vol.userData.lid(0.15, t, 4); vol.userData.head.rotation.y += -0.2;
    ik2(vol, vol.userData.arms[1], V(0.75, 1.55, -0.2), V(1, -1, 0)); vol.userData.hands[1].curl(0.5);
    const su = sci.userData; su.reset(); sci.position.set(2.2, 0, -0.35); sci.rotation.y = Math.PI - 0.25; seatOn(sci, 1.0, 1);
    ik2(sci, su.arms[0], V(1.9, 1.48, -1.05), V(-1, -1, 0)); ik2(sci, su.arms[1], V(2.5, 1.48, -1.05), V(1, -1, 0)); su.hands.forEach(h => h.curl(0.4));
    su.lid(0.12 - 0.3 * react, t, 2); su.eyePop(1 + 0.15 * react); su.mouthOpen(0.3 * react); su.head.rotation.x += -0.1 * react;
    const fx = -0.62 - 0.04 * pull; const pts = [V(fx, 2.05, -0.62), V(-1.3, 2.0, -0.6), V(-2.05, 1.75, -0.6)]; R.cable.geometry.dispose(); R.cable.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.008, 6);
    R.weight.position.set(-2.15, 1.25 + 0.04 * pull, -0.6);
  };
  return { R, pose, vol, sci };
}
shot(C.scientists, C.mri, (s) => {
  const S = mriSet(s); s.ap = 4; s.exposure = 1.0;
  s.update = (t) => { const pull = smooth(C.filmed, C.inside, t); S.pose(t, pull); S.R.drawMRI(t, 0, pull * 0.5); const c = E.io(seg(t, C.scientists - 0.2, C.mri + 0.3)); shoot(s.cam, lv(V(3.4, 3.4, 4.8), V(2.6, 3.0, 3.8), c), V(0.4, 1.9, -0.7), { fov: 40, t }); };
});
shot(C.mri, C.and2, (s) => {
  const S = mriSet(s); s.ap = 6; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => {
    const pop = 18.05, k = t > pop ? clamp(spring(t, pop, 2.5, 7)) : 0; S.pose(t, 1, smooth(pop + 0.1, pop + 0.35, t)); S.R.drawMRI(t, k, 0.5 + 0.5 * smooth(17.8, pop, t));
    const m = S.R.mon.getWorldPosition(new THREE.Vector3()); const n = V(Math.sin(-0.25), 0, Math.cos(-0.25));
    const c = E.io(seg(t, C.mri - 0.2, C.and2 + 0.3)); shoot(s.cam, m.clone().addScaledVector(n, lerp(2.3, 1.75, c)).add(V(-0.35, 0.05, 0)).add(shake(t, 0.008 * jolt(t, pop))), m, { fov: 36, t });
  };
});
// 9) the bubble dissolves while the stopwatch races to twenty minutes ---------------------------------
jointShot(C.and2, C.which, (s, t) => { const c = E.io(seg(t, C.and2 - 0.2, C.which + 0.3)); shoot(s.cam, lv(V(-0.5, 0.9, 3.4), V(-0.35, 0.75, 2.9), c), V(-0.35, 0.55, 0), { fov: 38, t }); }, jointState, { ap: 4 });
// 10) trying to crack the same knuckle again: nothing ------------------------------------------------
shot(C.which, C.but, (s) => {
  const G = gamerSet(s); s.ap = 6; s.exposure = 1.0; s.bloom = 0.45;
  s.update = (t) => {
    const tryK = smooth(C.which, C.which + 0.3, t) * (1 - smooth(C.away - 0.1, C.away + 0.3, t));
    const strain = smooth(C.crack2 - 0.2, C.crack2, t) * (1 - smooth(C.again + 0.2, C.again + 0.4, t)) + smooth(23.95, 24.05, t) * (1 - smooth(C.away - 0.15, C.away, t));
    const annoyed = smooth(C.away - 0.05, C.away + 0.3, t);
    G.A.pose(t, { tryK, strain: clamp(strain), annoyed });
    if (annoyed > 0.01) { G.u.mouthOpen(0); G.u.head.rotation.x += 0.12 * annoyed; G.u.lid(0.45, t, 1); }
    const f = headPt(G.K, V(0, -0.35, 0.2)); const c = E.io(seg(t, C.which - 0.2, C.but + 0.3));
    shoot(s.cam, f.clone().add(lv(V(0.6, 0.15, -2.2), V(0.45, 0.12, -1.7), c)), f.clone().add(V(0, -0.1, 0)), { fov: 36, t });
  };
});
// 11) Grandma's warning --------------------------------------------------------------------------------
shot(C.but, C.one, (s) => {
  const G = gamerSet(s); s.ap = 4; s.exposure = 1.0; s.bloom = 0.45;
  const gm = makeKid({ shirt: 0xb07aa1, pants: 0x5a5a6a, hair: 0xdcdcdc, skin: 0xe8b090, style: 'long', glasses: true, s: 1.0, hs: 1.0 }); s.scene.add(gm);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xdcdcdc, roughness: 0.5, sheen: 1, bumpMap: HAIR_BUMP, bumpScale: 2 })); bun.position.set(0, 0.42, -0.3); gm.userData.head.add(bun);
  const bubble = cloudPuffs(1.3, 1.0); s.scene.add(bubble); const AH = arthriticHand(); AH.G.scale.setScalar(0.62); s.scene.add(AH.G);
  s.update = (t) => {
    G.A.pose(t, { turn: smooth(C.but + 0.15, C.but + 0.45, t) * 0.9, annoyed: 0.3 });
    const gu = gm.userData; gu.reset(); gm.position.set(2.4, 0, 3.0); gm.rotation.y = Math.PI + 0.35;
    const wag = Math.sin(t * 14) * 0.08; ik2(gm, gu.arms[1], worldPt(gm, V(0.32 + wag, 3.05, 0.45)), V(1, -1, 0).applyQuaternion(gm.quaternion));
    gu.hands[1].curl(1); gu.hands[1].finger(0, 0); gu.wince(0.6); gu.setLid(0.25); gu.mouthOpen(0.1 + 0.08 * Math.abs(Math.sin(t * 9)));
    ik2(gm, gu.arms[0], worldPt(gm, V(-0.35, 1.55, 0.15)), V(-1, 0, -0.3).applyQuaternion(gm.quaternion)); gu.hands[0].curl(0.5);
    const hp = headPt(gm, V(-0.2, 0.9, 0)); const pop = spring(t, C.but + 0.4, 1.8, 6);
    bubble.position.copy(hp).add(V(-0.6, 0.35, -0.2)); bubble.scale.setScalar(Math.max(0.0001, pop)); bubble.lookAt(s.cam.position);
    AH.G.position.copy(bubble.position).add(s.cam.position.clone().sub(bubble.position).normalize().multiplyScalar(0.25)).add(V(0, -0.25, 0)); AH.G.quaternion.copy(bubble.quaternion); AH.G.rotateY(Math.PI); AH.G.scale.setScalar(0.62 * Math.max(0.0001, pop));
    const c = E.io(seg(t, C.but - 0.2, C.one + 0.3)); shoot(s.cam, lv(V(0.9, 3.0, -1.6), V(0.8, 3.05, -1.3), c), V(0.9, 2.75, 1.4), { fov: 42, t, focus: 4.6 });
  };
});
// 12-14) the doctor who cracked one hand for sixty years ----------------------------------------------
function doctorSet(s) {
  const sc = s.scene; const R = doctorOffice(sc);
  const D = makeChar2({ shirt: 0xf6f6f2, pants: 0x3a3f4a, hair: 0x4a2c18, skin: 0xe8b08a, glasses: true, coat: true }); sc.add(D); const u = D.userData;
  const hairMs = []; u.head.traverse(o => { if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial && o.material.sheen === 1) hairMs.push(o.material); }); const hairBase = new THREE.Color(0x4a2c18);
  const must = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.18, 6, 12), new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, roughness: 0.6, sheen: 1 })); must.rotation.z = Math.PI / 2; must.position.set(0, -0.12, 0.45); u.head.add(must);
  R.tc.scale.setScalar(1.0); u.hands[1].hand.add(R.tc); R.tc.position.set(-0.02, -0.12, 0.06); R.tc.rotation.set(0, Math.PI / 2, 0);
  const rings = [0, 1, 2].map(() => popRing(sc));
  const pose = (t, { age = 0, crack = 1, shrug = 0, point = 0 } = {}) => {
    u.reset(); D.position.set(0, 0, -0.75); D.rotation.y = 0; seatOn(D, 1.0, 1);
    hairMs.forEach(m => m.color.copy(hairBase).lerp(new THREE.Color(0xeeeeee), clamp(age * 1.2)));
    must.scale.setScalar(Math.max(0.0001, smooth(0.5, 0.9, age))); u.head.rotation.x += 0.1 * age; D.rotation.x = 0.05 * age;
    // left hand cracks (fingers flex in a rhythm), right hand clicks the tally counter
    const cyc = (t * 1.6) % 1, fl = crack * (cyc < 0.35 ? E.io(cyc / 0.35) : 1 - E.io(clamp((cyc - 0.35) / 0.4)));
    ik2(D, u.arms[0], worldPt(D, V(-0.3 - 0.4 * shrug, 1.85 + 0.6 * shrug, 0.75 - 0.2 * shrug)), V(-1, -1, 0)); u.hands[0].curl(lerp(0.15, 1, fl) * (1 - shrug));
    ik2(D, u.arms[1], worldPt(D, V(0.3 + 0.4 * shrug + 0.45 * point, 1.85 + 0.6 * shrug + 0.9 * point, 0.75 - 0.2 * shrug - 0.6 * point)), V(1, -1, 0)); u.hands[1].curl(point > 0.5 ? 0.9 : 0.6); if (point > 0.5) u.hands[1].finger(0, 0);
    u.lid(0.15 + 0.15 * age, t, 3);
    return { fl, cyc };
  };
  return { R, D, u, pose, rings };
}
shot(C.one, C.hand, (s) => {
  const S = doctorSet(s); s.ap = 5; s.exposure = 1.0; addSmile(S.D);
  let lastCyc = 0, n = 0;
  s.update = (t) => {
    const { cyc } = S.pose(t, { age: 0 }); S.u.smile(0.3); S.R.sky.material.color.setRGB(2.0, 2.2, 2.4); S.R.drawCal(0);
    const clicks = Math.floor((t - C.one) * 1.6); S.R.drawTally(Math.max(0, clicks));
    const kn = S.u.hands[0].hand.getWorldPosition(new THREE.Vector3()); [0, 1, 2].forEach(i => showRing(S.rings[i], kn, t, C.one + (Math.floor((t - C.one) * 1.6) + 0.35) / 1.6 - (i ? 999 : 0), s.cam, 2));
    const c = E.io(seg(t, C.one - 0.2, C.hand + 0.3)); shoot(s.cam, lv(V(1.1, 2.9, 2.9), V(0.75, 2.75, 2.2), c), V(-0.15, 2.2, -0.6), { fov: 38, t });
  };
});
shot(C.hand, C.and3, (s) => {
  const S = doctorSet(s); s.ap = 4; s.exposure = 1.0; s.bloom = 0.4; addSmile(S.D);
  s.update = (t) => {
    const k = E.inQ(seg(t, C.hand, C.and3 - 0.1)); const age = k;
    S.pose(t * (1 + 6 * k), { age }); S.u.smile(0.25);
    const cyc = (t - C.hand) * (1.2 + 9 * k); const day = 0.5 - 0.5 * Math.cos(cyc * Math.PI * 2);
    S.R.sky.material.color.setRGB(lerp(0.15, 2.0, day), lerp(0.2, 2.2, day), lerp(0.45, 2.5, day)); S.R.key.intensity = lerp(0.5, 1.8, day);
    const pages = Math.floor(k * 60 * 12 / 12 * 1.5 + (t - C.hand) * 6); S.R.drawCal(pages);
    const fa = ((t - C.hand) * 6) % 1; S.R.flyer.position.set(-0.6 + fa * 1.2, 3.6 + fa * 0.8, -2.4 + fa * 1.2); S.R.flyer.rotation.set(fa * 2, fa * 5, fa * 3); S.R.flyer.material.opacity = 1;
    S.R.drawTally(Math.min(36500, 30 + 36500 * E.inQ(seg(t, C.hand, C.and3 - 0.15))));
    const c = E.io(seg(t, C.hand - 0.2, C.and3 + 0.3)); shoot(s.cam, lv(V(-0.9, 3.0, 3.6), V(-0.6, 2.9, 3.0), c), V(-0.5, 2.6, -1.2), { fov: 42, t });
  };
});
shot(C.and3, C.so, (s) => {
  const S = doctorSet(s); s.ap = 4; s.exposure = 1.0; addSmile(S.D);
  s.update = (t) => {
    const shrug = clamp(spring(t, C.got - 0.1, 1.6, 5)), point = 0;
    S.pose(t, { age: 1, crack: 0, shrug }); S.u.smile(0.4 + 0.5 * shrug); S.u.head.rotation.z += 0.12 * shrug; S.R.sky.material.color.setRGB(2.0, 2.2, 2.4); S.R.drawCal(7); S.R.drawTally(36500);
    S.D.position.set(0.0, S.D.position.y, -0.75);
    S.R.ticks.forEach((tk, i) => tk.scale.setScalar(Math.max(0.0001, spring(t, C.neither + 0.15 + i * 0.25, 2, 6))));
    const c = E.io(seg(t, C.and3 - 0.2, C.so + 0.3)); shoot(s.cam, lv(V(0.6, 3.2, 3.8), V(0.55, 3.25, 3.3), c), V(0.55, 2.95, -1.2), { fov: 44, t });
  };
});
// 15) "so..." back to the gamer's opening frame (loops into shot 0) -----------------------------------
shot(C.so, C.end + 0.2, (s) => {
  const G = gamerSet(s); s.ap = 5; s.exposure = 1.0; s.bloom = 0.45;
  s.update = (t) => { const T0 = C.end; G.A.pose(t - T0, { push: 0, smirk: 0 }); const c = E.io(seg(t, C.so - 0.1, T0)); shoot(s.cam, lv(V(0.7, 2.62, -1.5), OPEN[0], c), lv(V(0, 2.4, 0.25), OPEN[1], c), { fov: 38, t: t - T0 }); };
});
