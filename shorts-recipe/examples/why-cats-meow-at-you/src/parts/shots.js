// =====================================================================
// SHOTS: "Why Cats Meow At You"
// =====================================================================
const CS = 0.55, GC = 0.6, END = C.end;
const TABBY = {}, GREY = { base: '#8f9299', stripe: '#53565d', seed: 4 }, MOM = { base: '#f3b679', stripe: '#c9783c', seed: 7 };
const bumpy = (x) => 1 - Math.pow(1 - clamp(x), 2);
const backE = (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
// diagonal walk cycle on the paw targets (after pose(), before solve())
function walkLegs(u, ph, stride = 0.26, lift = 0.14) {
  u.legs.forEach((L, i) => { const f = (((ph + ((i === 0 || i === 3) ? 0 : Math.PI)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); L.T.z += stride * (f < Math.PI ? -Math.cos(f) : Math.cos(f - Math.PI)); L.T.y += f < Math.PI ? lift * Math.sin(f) : 0; });
}
// a bounding run: front pair and hind pair move together
function runLegs(u, ph, stride = 0.42, lift = 0.22) {
  u.legs.forEach((L, i) => { const f = (((ph + (L.front ? 0 : Math.PI * 0.85) + (L.sx > 0 ? 0.35 : 0)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); L.T.z += stride * (f < Math.PI ? -Math.cos(f) : Math.cos(f - Math.PI)); L.T.y += f < Math.PI ? lift * Math.sin(f) : 0; });
}
// head and face for a meow (call after look()): chin up, ears back a little, eyes squeeze
function meowFace(u, k, { up = 0.3 } = {}) { u.meow(k); u.head.rotation.x -= up * k; }
function ownerKneel(O, t, x, z, ry, { pet = null, look = null, left = null } = {}) {
  const ou = O.userData; ou.reset(); O.rotation.set(0, ry, 0); O.position.set(x, -0.62, z);
  ou.legs.forEach((L, i) => { L.hip.rotation.set(-0.15, (i ? 1 : -1) * 0.1, 0); L.knee.rotation.x = 1.75; L.ankle.rotation.x = 0.6; });
  ou.breathe(t, 0.3, 0.025); const q = O.quaternion;
  if (pet) { ik2(O, ou.arms[1], pet, V(0.3, -1, 0.3).applyQuaternion(q)); ou.hands[1].curl(0.35); } else ik2(O, ou.arms[1], worldPt(O, V(0.45, 1.5, 0.35)), V(1, -0.6, -0.4).applyQuaternion(q));
  ik2(O, ou.arms[0], left || worldPt(O, V(-0.42, 1.45, 0.4)), V(-1, -0.6, -0.4).applyQuaternion(q)); ou.hands[0].curl(0.4);
  if (look) { const hp = ou.head.getWorldPosition(new THREE.Vector3()), d = O.worldToLocal(look.clone()).sub(O.worldToLocal(hp.clone())); ou.head.rotation.y += clamp(Math.atan2(d.x, d.z), -0.8, 0.8); ou.head.rotation.x += clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 0.5); }
  return ou;
}
// paws follow an uneven surface (heightAt(x, z) in world space)
function pawsOn(cat, u, heightAt) {
  cat.updateMatrixWorld(true);
  u.legs.forEach(L => { const w = cat.localToWorld(L.T.clone()); w.y = heightAt(w.x, w.z) + (w.y - cat.position.y) * 0 + Math.max(0, L.T.y) * cat.scale.x; L.T.copy(cat.worldToLocal(w)); });
}

// ---------------------------------------------------------------------
// 0 + 18) POV in bed at dawn: the cat on your chest, bowl dropped by your face, meowing into the lens.
// Both shots run on tau = seconds from the loop point, so the last frame and the first frame match.
// ---------------------------------------------------------------------
const POD = { cat: V(0.04, 0, -0.12), bowlRest: V(0.36, 0, -0.4), drop: -0.86, land: -0.72 };
function podSet(s) {
  const sc = s.scene; const R = bedroom(sc); const cat = makeCat2(TABBY); cat.scale.setScalar(CS); cat.rotation.order = 'YXZ'; sc.add(cat); const u = cat.userData;
  const BR = 0.2, bowl = ceramicBowl(BR); sc.add(bowl);
  const restP = POD.bowlRest.clone(); restP.y = duvetY(restP.x, restP.z) - 0.005; const restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0.4, -0.18));
  const H = { R, cat, u, bowl,
    cam(tau) { return V(0.02, 1.6, -2.0).add(V(0.0, 0.01, 0.05).multiplyScalar(tau + 1.2)); },
    act(tau, cp) {
      const cy = duvetY(POD.cat.x, POD.cat.z);
      const fy = duvetY(POD.cat.x, POD.cat.z - 0.3), hy = duvetY(POD.cat.x, POD.cat.z + 0.3);
      cat.position.set(POD.cat.x, cy - 0.02, POD.cat.z); cat.rotation.set(-Math.atan2(fy - hy, 0.6) * 0.8, Math.PI + 0.05, 0);
      u.pose({ stand: 1 }); pawsOn(cat, u, (x, z) => duvetY(x, z) + 0.01);
      const holding = tau < POD.drop, rel = seg(tau, POD.drop, POD.drop + 0.35), m = mouthOf('hero', tau);
      u.solve().breathe(tau, 0.025);
      const blink = Math.max(0, 1 - Math.abs(tau + 0.35) / 0.08);
      u.pupil(0.42).ears(0.12 * m - 0.05, 0.05 * Math.sin(tau * 3), -0.05 * Math.sin(tau * 2.3)).whisk(0.25).glow(0);
      u.tailRest(tau, 0.3);
      const eye = cp.clone().add(V(0, 0.02, 0));
      u.look(eye, 1, 0.08 * Math.sin(tau * 1.3) + (holding ? -0.1 : 0), 1.0, 0.85).gaze(eye);
      if (holding) u.head.rotation.x += 0.18; else u.head.rotation.x += 0.18 * (1 - E.io(rel));
      u.lid(clamp(0.14 + 0.8 * blink), 0.08);
      if (holding) u.meow(0.32); else if (tau < POD.drop + 0.2) u.meow(0.32 * (1 - seg(tau, POD.drop, POD.drop + 0.2)) + 0.25 * (1 - seg(tau, POD.drop, POD.drop + 0.08)));
      else { u.meow(m); u.head.rotation.x -= 0.28 * m; u.lid(clamp(0.14 + 0.14 * m + 0.8 * blink), 0.15 * m); }
      // the bowl: hangs from the mouth by its rim, drops, bounces once, settles
      cat.updateMatrixWorld(true);
      if (holding) {
        const mp = u.jaw.localToWorld(V(0, -0.14, 0.34)); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.25, 0.15, 0)); q.premultiply(u.head.getWorldQuaternion(new THREE.Quaternion()));
        const rim = V(0, 0.55 * BR, BR).applyQuaternion(q); bowl.position.copy(mp).sub(rim); bowl.quaternion.copy(q);
        bowl.position.y += 0.004 * Math.sin(tau * 9);
      } else {
        const mp = u.jaw.localToWorld(V(0, -0.14, 0.34)); const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.25, 0.15, 0)); q0.premultiply(u.head.getWorldQuaternion(new THREE.Quaternion()));
        const p0 = mp.clone().sub(V(0, 0.55 * BR, BR).applyQuaternion(q0));
        const a = seg(tau, POD.drop, POD.land), b = tau - POD.land;
        if (a < 1) { bowl.position.lerpVectors(p0, restP, a); bowl.position.y = lerp(p0.y, restP.y, a * a); bowl.quaternion.slerpQuaternions(q0, restQ, E.io(a)); }
        else { const wob = Math.exp(-b * 9) * Math.sin(b * 38); bowl.position.copy(restP); bowl.position.y += Math.max(0, 0.018 * Math.exp(-b * 12) * Math.sin(b * 30)); bowl.quaternion.copy(restQ).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12 * wob, 0, 0.1 * wob))); }
      }
    },
  };
  return H;
}
function podShot(s, tauOf) {
  const H = podSet(s); s.ap = 7; s.exposure = 1.22; s.bloom = 0.42;
  s.update = (t) => { const tau = tauOf(t), cp = H.cam(tau); H.act(tau, cp); const tg = H.u.eyeW().add(V(0, -0.42, 0)); shoot(s.cam, cp, tg, { fov: 54, t: tau, focus: cp.distanceTo(H.u.eyeW()), hand: 0.7 }); };
}
shot(0, C.but, (s) => podShot(s, t => t));

// 1) but almost never at other cats: nose to nose in the garden, in silence (staged in depth for the vertical frame)
function twoCats(sc) { const a = makeCat2(TABBY), b = makeCat2(GREY); a.scale.setScalar(GC); b.scale.setScalar(GC * 0.97); sc.add(a, b); return [a, b]; }
const MEET = { G: V(1.25, 0, 0.1), dir: V(-0.62, 0, 1).normalize() };
shot(C.but, C.kittens, (s) => {
  const R = garden(s.scene); const [a, b] = twoCats(s.scene); const ua = a.userData, ub = b.userData; s.ap = 7; s.exposure = 1.15; s.bloom = 0.5;
  const G = MEET.G, dir = MEET.dir, T1 = G.clone().addScaledVector(dir, 1.18), T0 = T1.clone().addScaledVector(dir, 1.1), tA = C.but - 0.35, tB = C.other + 0.05, ry = Math.atan2(-dir.x, -dir.z);
  s.update = (t) => {
    R.update(t);
    const go = E.io(seg(t, tA, tB)), walking = go > 0.001 && go < 0.999, d = 1.1 * go;
    a.position.copy(T0).addScaledVector(dir, -d); a.rotation.set(0, ry, 0); ua.pose({ stand: 1 });
    const ph = d * Math.PI / (2 * 0.26 * GC); if (walking) { walkLegs(ua, ph); a.position.y = 0.012 * Math.abs(Math.sin(ph)); }
    const boop = smooth(C.other + 0.1, C.cats + 0.05, t) * (1 - smooth(C.cats + 0.55, C.cats + 0.9, t));
    ua.head.position.z += 0.18 * boop; ua.head.position.y += 0.05 * boop;
    ua.solve().breathe(t).pupil(0.55).ears(0, 0.1, 0.1).whisk(0.4 * boop).lid(0.15 + 0.6 * Math.max(0, 1 - Math.abs(t - (C.cats + 0.35)) / 0.12), 0.1);
    ua.tail([V(0, 1.12, -1.02), V(0, 1.4, -1.18), V(0.05 * Math.sin(t * 2), 1.85, -1.22), V(0.08 * Math.sin(t * 2 - 1), 2.25, -1.08), V(0.25 + 0.08 * Math.sin(t * 2 - 1.5), 2.42, -0.86)]);
    b.position.copy(G); b.rotation.set(0, Math.atan2(dir.x, dir.z), 0); ub.pose({ sit: 1 }); ub.head.position.z += 0.14 * boop;
    ub.solve().breathe(t + 1).pupil(0.5).ears(0.05, 0, 0.15).whisk(0.3 * boop).lid(0.2 + 0.7 * Math.max(0, 1 - Math.abs(t - (C.cats + 0.45)) / 0.13), 0.1);
    ub.tail([V(0, 0.3, -0.92), V(0.1, 0.6, -1.15), V(0.12, 1.1, -1.25), V(0.1, 1.5, -1.1), V(-0.1, 1.68, -0.9)]);
    const na = ua.eyeW(), nb = ub.eyeW();
    ua.look(nb.clone().add(V(0, -0.08, 0)), 1, 0.05, 1.0, 0.6).gaze(nb); ub.look(na.clone().add(V(0, -0.1, 0)), 1, -0.12 * boop, 1.0, 0.6).gaze(na);
    const side = V(dir.z, 0, -dir.x), c = E.io(seg(t, C.but - 0.2, C.kittens + 0.2)), mid = lv(na, nb, 0.5);
    const cp = mid.clone().addScaledVector(side, lerp(-3.1, -2.8, c)).add(V(0, lerp(0.1, 0.05, c), 0));
    shoot(s.cam, cp, mid.clone().add(V(0, -0.1, 0)), { fov: 38, t, focus: cp.distanceTo(mid) });
  };
});

// 2) kittens meow when they're cold or hungry: alone in the basket, mewing -------------------------
const KS = 0.27;
function kitten(sc, o = {}) { const k = makeCat2({ ...TABBY, ...o }); k.scale.setScalar(KS); k.userData.age(0); sc.add(k); return k; }
function kittenAct(k, t, { look = null, shiver = 0, mew = 0, lid = 0.18 } = {}) {
  const u = k.userData; u.age(0); u.pose({ sit: 1 }); u.solve().breathe(t, 0.03).pupil(0.8).ears(0.25 + 0.25 * shiver, 0, 0).whisk(0.2);
  u.tailRest(t, 0.15, -1);
  if (look) u.look(look, 1, 0.12 * Math.sin(t * 0.9)).gaze(look);
  u.meow(mew); u.head.rotation.x -= 0.35 * mew; u.lid(lid + 0.35 * mew, 0.25 * mew);
  if (shiver) { k.position.x += 0.004 * Math.sin(t * 70) * shiver; u.head.rotation.z += 0.03 * Math.sin(t * 55) * shiver; }
}
shot(C.kittens, C.so, (s) => {
  const R = nest(s.scene); const k = kitten(s.scene); s.ap = 6; s.exposure = 1.3; s.bloom = 0.5;
  s.update = (t) => {
    k.position.set(0, R.seatY + 0.03, 0); k.rotation.set(0, 0.25, 0);
    const lookL = V(-1.5, 0.6, 1.0), lookR = V(1.8, 0.7, 0.4), lk = t < C.cold ? lv(lookL, lookR, E.io(seg(t, C.kittens + 0.2, C.kittens + 0.6))) : t < C.hungry ? lv(lookR, V(0.2, 0.9, 3), E.io(seg(t, C.or, C.hungry))) : V(0.3, 0.9, 3);
    kittenAct(k, t, { look: lk, shiver: 1, mew: mouthOf('kit', t) });
    const c = E.io(seg(t, C.kittens - 0.2, C.so + 0.3)), cp = lv(V(0.85, 1.2, 2.75), V(0.6, 1.05, 2.15), c);
    shoot(s.cam, cp, k.userData.eyeW().add(V(0, -0.08, 0)), { fov: 34, t, focus: cp.distanceTo(k.userData.eyeW()) });
  };
});

// 3) so their mother comes running ---------------------------------------------------------------
shot(C.so, C.adult, (s) => {
  const R = nest(s.scene); const k = kitten(s.scene); const mom = makeCat2(MOM); mom.scale.setScalar(CS * 1.05); s.scene.add(mom); const um = mom.userData; s.ap = 6; s.exposure = 1.3; s.bloom = 0.5;
  const t0 = C.so + 0.05, t1 = C.running + 0.1, Z0 = -5.6, Z1 = -0.95, X = 0.35;
  s.update = (t) => {
    k.position.set(0, R.seatY + 0.03, 0); k.rotation.set(0, Math.PI - 0.3, 0);
    const go = seg(t, t0, t1), z = lerp(Z0, Z1, 1 - Math.pow(1 - go, 1.6)), d = z - Z0, running = go > 0 && go < 1, arrived = smooth(t1 - 0.15, t1 + 0.25, t);
    mom.position.set(X * (1 - 0.3 * arrived), 0, z); mom.rotation.set(0, 0.08 * Math.sin(go * 9) * (1 - arrived), 0);
    um.pose({ stand: 1 - 0.25 * (running ? 1 : 0), crouch: 0.25 * (running ? 1 : 0) });
    const ph = d * Math.PI / (2 * 0.42 * CS * 1.05);
    if (running) { runLegs(um, ph, 0.42 * (1 - go * 0.6), 0.24 * (1 - go * 0.5)); mom.position.y = 0.05 * Math.abs(Math.sin(ph)) * (1 - go); }
    const nuzzle = smooth(t1 + 0.05, t1 + 0.5, t);
    um.head.position.y -= 0.32 * nuzzle; um.head.position.z += 0.12 * nuzzle;
    um.solve().breathe(t).pupil(0.45).ears(-0.05, 0, 0).whisk(0.3).lid(0.2 + 0.45 * nuzzle, 0.1);
    um.tailRest(t, 0.45);
    const ke = k.userData.eyeW(); um.look(running ? V(X, 0.6, 2) : ke.clone().add(V(0, 0.1, 0)), 1, 0.25 * nuzzle, 1.2, 0.8).gaze(ke);
    um.meow(mouthOf('mom', t)); um.head.rotation.x -= 0.15 * mouthOf('mom', t);
    const mw = mom.userData.eyeW();
    kittenAct(k, t, { look: running ? mw : mw.clone().add(V(0, -0.1, 0)), shiver: 1 - arrived, lid: 0.18 + 0.4 * smooth(t1 + 0.3, t1 + 0.7, t) });
    const settle = smooth(t1 - 0.5, t1 + 0.4, t), mh = mom.position.clone().add(V(0, 0.75, 0)), pair = lv(ke, um.eyeW(), 0.5).add(V(0, -0.05, 0));
    const cp = V(2.35, 0.95, lerp(clamp(mom.position.z + 1.6, -4, 0.9), 0.75, settle)), tg = lv(mh, pair, settle);
    shoot(s.cam, cp, tg, { fov: 38, t, focus: cp.distanceTo(tg) });
  };
});

// 4) adult cats grow out of it: the kitten grows up in one bounce -----------------------------------
shot(C.adult, C.and, (s) => {
  const R = nest(s.scene, { day: true }); const k = makeCat2(TABBY); s.scene.add(k); const u = k.userData; s.ap = 4; s.exposure = 1.0; s.bloom = 0.45;
  R.basket.position.set(-1.05, 0, -0.45);
  const tg0 = C.adult + 0.2, tg1 = C.grow + 0.35;
  s.update = (t) => {
    const g = seg(t, tg0, tg1), a = E.io(g), sp = g > 0 ? 1 + 0.06 * Math.exp(-(t - tg1) * 6) * Math.sin((t - tg1) * 22) * (t > tg1 ? 1 : 0) : 1;
    k.scale.setScalar(lerp(KS, CS, backE(g)) * sp); k.position.set(0.25, 0, 0.2); k.rotation.set(0, -0.2, 0);
    u.age(a); u.pose({ sit: 1 }); u.solve().breathe(t).pupil(0.35).ears(0).whisk(0.2).lid(lerp(0.18, 0.32, a), 0.1); u.tailRest(t, 0.3, -1);
    const cp = lv(V(0.6, 1.35, 4.6), V(0.5, 1.3, 4.25), E.io(seg(t, C.adult - 0.2, C.and + 0.3)));
    u.look(cp, 0.6 + 0.4 * a, 0.08 * (1 - a)).gaze(cp);
    shoot(s.cam, cp, V(0.05, lerp(0.6, 0.95, a), 0.1), { fov: 34, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 5) and talk with scent: walking toward us, the cat rubs its cheek along a fence post and leaves a shimmer
shot(C.and, C.and2, (s) => {
  const R = garden(s.scene); const cat = makeCat2(TABBY); cat.scale.setScalar(GC); s.scene.add(cat); const u = cat.userData; s.ap = 6; s.exposure = 1.15; s.bloom = 0.6;
  const postM = new THREE.MeshLambertMaterial({ map: woodTex('#8a6a4e', '#4a3422', 18, [1, 2]) }), PX = 0.9, PZ = 0.6;
  const post = new THREE.Mesh(new RoundedBoxGeometry(0.24, 1.7, 0.24, 2, 0.03), postM); post.position.set(PX, 0.85, PZ); post.castShadow = post.receiveShadow = true; s.scene.add(post);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.14, 4), postM); cap.rotation.y = Math.PI / 4; cap.position.set(PX, 1.77, PZ); s.scene.add(cap);
  const NP = 80, sp = new THREE.InstancedMesh(new THREE.SphereGeometry(0.01, 6, 4), hdr(4.0, 3.0, 1.2, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), NP); sp.frustumCulled = false; s.scene.add(sp); const dm = new THREE.Object3D();
  const SP = []; const rr = rng(31); for (let i = 0; i < NP; i++) SP.push({ y: 0.5 + rr() * 0.4, z: -0.1 + rr() * 0.25, t: C.and + 0.15 + rr() * 0.75, s: 0.6 + rr() * 1.3, d: V(-0.1 - rr() * 0.25, 0.1 + rr() * 0.3, (rr() - 0.3) * 0.25) });
  s.update = (t) => {
    R.update(t);
    const k = seg(t, C.and - 0.15, C.and2 + 0.15), z = lerp(PZ - 0.85, PZ - 0.15, k);
    cat.position.set(PX - 0.37, 0, z); cat.rotation.set(0, 0.1, 0); u.pose({ stand: 1 }); walkLegs(u, (z - PZ) * Math.PI / (2 * 0.26 * GC), 0.2);
    u.solve().breathe(t).pupil(0.3).ears(0.12, 0.2, 0).whisk(0.15).lid(0.8, 0.4); u.tailRest(t, 0.4);
    u.look(V(PX + 0.15, 0.8, z + 2.0), 1, -0.38, 1.4, 0.4);
    SP.forEach((p, i) => { const a = t - p.t; if (a < 0) dm.scale.setScalar(0.0001); else { dm.position.set(PX - 0.13, p.y, PZ + p.z).add(p.d.clone().multiplyScalar(Math.min(a, 1.5))); dm.scale.setScalar(p.s * Math.max(0, 1 - a * 0.45) * (0.6 + 0.4 * Math.sin(t * 9 + i))); } dm.updateMatrix(); sp.setMatrixAt(i, dm.matrix); }); sp.instanceMatrix.needsUpdate = true;
    const cp = lv(V(PX - 1.0, 0.9, PZ + 2.05), V(PX - 0.85, 0.85, PZ + 1.8), k), tg = V(PX - 0.25, 0.7, PZ - 0.1);
    shoot(s.cam, cp, tg, { fov: 36, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 6) and body language instead: tail up (a friendly hello), and a slow blink back
shot(C.and2, C.except, (s) => {
  const R = garden(s.scene); const [a, b] = twoCats(s.scene); const ua = a.userData, ub = b.userData; s.ap = 6; s.exposure = 1.15; s.bloom = 0.5;
  const G = V(1.2, 0, -0.35), A = V(0.45, 0, 1.05), dir = A.clone().sub(G).normalize();
  s.update = (t) => {
    R.update(t);
    const blinkB = Math.max(0, 1 - Math.abs(t - (C.instead + 0.15)) / 0.38);
    b.position.copy(G); b.rotation.set(0, Math.atan2(dir.x, dir.z), 0); ub.pose({ sit: 1 }); ub.solve().breathe(t + 1).pupil(0.45).ears(0.05, 0, 0).whisk(0.2).lid(0.22 + 0.73 * E.io(blinkB), 0.35 * blinkB);
    ub.tail([V(0, 0.3, -0.92), V(0.2, 0.25, -1.2), V(0.55, 0.2, -1.0), V(0.75, 0.2, -0.5), V(0.62 + 0.1 * Math.sin(t * 2.4), 0.25, -0.05)]);
    ub.look(A.clone().add(V(0, 0.9, 0)), 1, -0.1).gaze(A.clone().add(V(0, 0.9, 0)));
    a.position.copy(A); a.rotation.set(0, Math.atan2(-dir.x, -dir.z), 0); ua.pose({ stand: 1 }); ua.solve().breathe(t).pupil(0.45).ears(0, 0.1, 0.1).whisk(0.2);
    const blinkA = Math.max(0, 1 - Math.abs(t - (C.language + 0.05)) / 0.4); ua.lid(0.18 + 0.77 * E.io(blinkA), 0.35 * blinkA);
    const q = 0.3 * Math.sin(t * 3.0), up = smooth(C.and2, C.body + 0.15, t);
    ua.tail([V(0, 1.12, -1.02), V(0, 1.35 + 0.1 * up, -1.2), V(0.05 * q, lerp(1.2, 1.9, up), lerp(-1.6, -1.25, up)), V(0.1 * q, lerp(1.0, 2.3, up), lerp(-2.0, -1.1, up)), V(lerp(0, 0.28, up) + 0.1 * q, lerp(0.85, 2.42, up), lerp(-2.3, -0.82, up))]);
    ua.look(ub.eyeW(), 1, 0.15 * Math.sin(t * 1.4)).gaze(ub.eyeW());
    const side = V(dir.z, 0, -dir.x), c = E.io(seg(t, C.and2 - 0.2, C.except + 0.3));
    const v = dir.clone().multiplyScalar(-Math.cos(0.5)).addScaledVector(side, -Math.sin(0.5)), cp = A.clone().addScaledVector(v, lerp(3.2, 2.9, c)).add(V(0, 1.0, 0)), tg = A.clone().add(V(0, 0.98, 0)).addScaledVector(dir, -0.12);
    shoot(s.cam, cp, tg, { fov: 40, t, focus: cp.distanceTo(ua.eyeW()) });
  };
});

// 7) except with us: from your height, the cat looks up and meows -------------------------------
function homeCat(s, o = {}) { const sc = s.scene; const R = livingRoom(sc); const cat = makeCat2(TABBY); cat.scale.setScalar(CS); sc.add(cat); return { R, cat, u: cat.userData }; }
shot(C.except, C.humans, (s) => {
  const { R, cat, u } = homeCat(s); s.ap = 5; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => {
    R.update(t); cat.position.set(0.3, 0, 3.7); cat.rotation.set(0, 0.35, 0);
    const cp = lv(V(0.55, 3.6, 5.6), V(0.5, 3.45, 5.35), E.io(seg(t, C.except - 0.2, C.humans + 0.3)));
    u.pose({ sit: 1 }); u.solve().breathe(t).pupil(0.6).ears(0, 0.1, -0.1).whisk(0.3).tailRest(t, 0.4, -1);
    const m = mouthOf('hero', t); u.look(cp, 1, 0.1, 1.2, 1.1).gaze(cp); u.head.rotation.x -= 0.15; meowFace(u, m, { up: 0.2 }); u.lid(0.12 + 0.12 * m, 0.15 * m);
    shoot(s.cam, cp, u.eyeW().add(V(0, -0.35, 0.1)), { fov: 38, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 8) humans kept answering: the owner kneels and pours kibble ---------------------------------------
shot(C.humans, C.so2, (s) => {
  const { R, cat, u } = homeCat(s); const O = makeKid(OWNER); addSmile(O); s.scene.add(O); const bag = kibbleBag(); s.scene.add(bag); s.ap = 6; s.exposure = 1.0; s.bloom = 0.4;
  const BW = V(0.55, 0, 3.55); const bowl = ceramicBowl(0.26); bowl.position.copy(BW); s.scene.add(bowl); const pour = kibblePour(s.scene, 150, BW, 0.26);
  const tp = C.humans + 0.1;
  s.update = (t) => {
    R.update(t);
    const tilt = E.io(seg(t, C.humans - 0.15, tp + 0.15)) * 1.9;
    const hand = V(0.85, 1.3 - 0.08 * tilt / 1.9, 3.75);
    const ou = ownerKneel(O, t, 1.55, 4.35, -2.55, { pet: hand, look: BW.clone().add(V(0, 0.2, 0)) }); ou.smile(0.8); ou.lid(0.2, t, 1);
    bag.position.copy(hand).add(V(-0.05, -0.1, -0.05)); bag.rotation.set(0, -0.6, tilt);
    bag.updateMatrixWorld(true); const spout = bag.localToWorld(bag.userData.spout.clone());
    pour(t, spout, tp + 0.08, 0.8);
    cat.position.set(-0.05, 0, 3.2); cat.rotation.set(0, 1.0, 0);
    u.pose({ sit: 1 }); u.solve().breathe(t).pupil(0.7).ears(0, 0.05, 0).whisk(0.4).tailRest(t, 0.5, -1);
    const lk = t < tp + 0.25 ? headPt(O, V(0, 0, 0.3)) : BW.clone().add(V(0, 0.15, 0)); u.look(lk, 1, 0.1).gaze(lk); u.lid(0.15, 0.1);
    const c = E.io(seg(t, C.humans - 0.2, C.so2 + 0.3)), cp = lv(V(0.2, 1.75, 0.75), V(0.25, 1.65, 1.05), c), tg = lv(V(0.5, 0.95, 3.6), V(0.48, 0.85, 3.6), c);
    shoot(s.cam, cp, tg, { fov: 40, t, focus: cp.distanceTo(BW) });
  };
});

// 9) so cats kept the kitten voice: the cat meows, and its shadow on the wall is a kitten ---------
shot(C.so2, C.and3, (s) => {
  const sc = s.scene; const R = shadowWall(sc); const cat = makeCat2(TABBY); cat.scale.setScalar(CS); sc.add(cat); noShadow(cat); const u = cat.userData;
  const ghost = makeCat2(TABBY); sc.add(ghost); shadowOnly(ghost); const g = ghost.userData; s.ap = 5; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => {
    R.update(t); cat.position.set(-0.35, 0, -0.05); cat.rotation.set(0, Math.PI / 2 - 0.15, 0);
    const m = mouthOf('hero', t), lk = V(2.5, 1.9, 0.5);
    u.pose({ sit: 1 }); u.solve().breathe(t).pupil(0.45).ears(0.1 * m, 0.05, 0).whisk(0.2).tailRest(t, 0.3, 1);
    u.look(lk, 1, 0.05).gaze(lk); meowFace(u, m, { up: 0.35 }); u.lid(0.2 + 0.45 * m, 0.2 * m);
    ghost.scale.setScalar(KS * 1.1); ghost.position.set(-0.05, 0, -0.35); ghost.rotation.set(0, Math.PI / 2 - 0.15, 0); g.age(0); g.head.scale.setScalar(1.6); g.lift = 0.22;
    g.pose({ sit: 1 }); g.solve().breathe(t).ears(0.1 * m, 0, 0).tailRest(t, 0.3, 1); g.look(lk, 1, 0.05); g.meow(m); g.head.rotation.x -= 0.4 * m;
    const c = E.io(seg(t, C.so2 - 0.2, C.and3 + 0.3)), cp = lv(V(0.05, 1.3, 4.6), V(0.15, 1.25, 4.2), c), tg = lv(V(0.2, 1.05, -0.8), V(0.25, 1.0, -0.8), c);
    shoot(s.cam, cp, tg, { fov: 40, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 10) and they tuned it: a paw turns the dial of an old radio -----------------------------------
shot(C.and3, C.in_, (s) => {
  const { R, cat, u } = homeCat(s); const radio = makeRadio(); radio.scale.setScalar(0.82); radio.position.set(-0.55, TBL.y, 0.3); radio.rotation.y = 0.12; s.scene.add(radio); s.ap = 3.5; s.exposure = 1.0; s.bloom = 0.45;
  const knob = radio.userData.knobs[1];
  s.update = (t) => {
    R.update(t);
    const turn = E.io(seg(t, C.and3 + 0.1, C.it2 + 0.25));
    knob.rotation.z = -2.2 * turn; radio.userData.draw(0.25 + 0.4 * turn + 0.01 * Math.sin(t * 20) * turn * (1 - turn) * 4);
    cat.position.set(0.42, TBL.y, -0.02); cat.rotation.set(0, -0.3, 0); u.pose({ sit: 1 });
    radio.updateMatrixWorld(true); const kw = knob.localToWorld(V(0.0, 0.06, 0.05)), ang = -2.2 * turn;
    const pw = kw.clone().add(V(0.03 * Math.sin(ang), 0.02, 0.06));
    const reach = smooth(C.and3 - 0.3, C.and3 + 0.05, t);
    u.paw(0, lv(u.legs[0].T.clone(), cat.worldToLocal(pw.clone()), reach), 0.9 * reach);
    u.solve().breathe(t).pupil(0.55).ears(-0.1, 0.15, -0.1).whisk(0.35).tailRest(t, 0.35);
    const dial = radio.localToWorld(V(0, 0.24, 0.22)); u.look(dial, 1, 0.35).gaze(dial); u.lid(0.18, 0.05);
    const c = E.io(seg(t, C.and3 - 0.2, C.in_ + 0.3)), cp = lv(V(-0.3, 1.95, 3.05), V(-0.32, 1.9, 2.75), c);
    shoot(s.cam, cp, lv(dial, u.eyeW(), 0.38), { fov: 42, t, focus: cp.distanceTo(kw) });
  };
});

// 11-13) the study: a cat begging for food at a microphone; the purr on the screen hides a cry ----
function studySet(s) {
  const sc = s.scene; const R = labRoom(sc); const cat = makeCat2(TABBY); cat.scale.setScalar(0.6); sc.add(cat); const u = cat.userData;
  const sci = makeKid({ shirt: 0xf5f5f5, pants: 0x3a4a5a, hair: 0x1a1210, skin: 0x8d5a3b, style: 'curly', glasses: true, coat: true, s: 1.0, hs: 1.0 }); addSmile(sci); sc.add(sci);
  const bowl = ceramicBowl(0.24); sc.add(bowl); const food = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9a5a2a, roughness: 0.6, bumpMap: WEAVE, bumpScale: 3 })); food.scale.set(0.2, 0.08, 0.2); food.position.y = 0.06; bowl.add(food);
  R.mic.position.set(0.0, R.benchY, 0.62); R.mic.rotation.y = Math.PI; R.micHead.rotation.x = 0.45;
  R.mon.position.set(-1.3, R.benchY, -0.7); R.mon.rotation.y = 0.5;
  const H = { R, cat, u, sci,
    act(t) {
      cat.position.set(-0.05, R.benchY, -0.15); cat.rotation.set(0, 0.1, 0);
      const knead = Math.sin(t * 7);
      u.pose({ sit: 1 }); u.paw(0, u.legs[0].T.clone().add(V(0, 0.06 * Math.max(0, knead), 0.02)), 0.3 * Math.max(0, knead)); u.paw(1, u.legs[1].T.clone().add(V(0, 0.06 * Math.max(0, -knead), 0.02)), 0.3 * Math.max(0, -knead));
      u.solve().breathe(t, 0.03).pupil(0.75).ears(0, 0.1, -0.1).whisk(0.4);
      cat.position.x += 0.003 * Math.sin(t * 150);
      u.tailRest(t, 0.5, -1);
      const su = sci.userData; su.reset(); sci.position.set(1.45, 0, -0.75); sci.rotation.set(0, -1.05, 0); su.breathe(t, 0.3, 0.02); su.smile(0.6); su.lid(0.15, t, 3);
      const bp = V(0.5 + 0.03 * Math.sin(t * 1.3), 2.95, 0.12); ik2(sci, su.arms[1], bp.clone().add(V(0.12, -0.06, 0.02)), V(0.3, -1, 0.5)); su.hands[1].curl(0.5); ik2(sci, su.arms[0], worldPt(sci, V(-0.45, 1.3, 0.4)), V(-1, -1, 0));
      bowl.position.copy(bp); bowl.rotation.set(0.25, 0, 0.1);
      const hl = u.eyeW(); const hp = su.head.getWorldPosition(new THREE.Vector3()), d = hl.clone().sub(hp); su.head.rotation.y += clamp(Math.atan2(d.x, d.z), -0.6, 0.6); su.head.rotation.x += clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.3, 0.6);
      u.look(bp, 1, 0.12 * Math.sin(t * 1.1), 1.2, 1.0).gaze(bp); u.lid(0.42, 0.2);
    },
  };
  return H;
}
shot(C.in_, C.hid, (s) => {
  const H = studySet(s); s.ap = 5; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => {
    H.act(t); drawSpectro(H.R.screen, t, { cry: 0 });
    const c = E.io(seg(t, C.in_ - 0.2, C.hid + 0.3)), cp = lv(V(0.9, 2.55, 4.1), V(0.75, 2.45, 3.7), c), tg = lv(V(0.35, 2.3, -0.3), V(0.3, 2.25, -0.35), c);
    shoot(s.cam, cp, tg, { fov: 38, t, focus: cp.distanceTo(H.u.eyeW()) });
  };
});
shot(C.hid, C.near, (s) => {
  const H = studySet(s); s.ap = 4; s.exposure = 1.0; s.bloom = 0.55;
  s.update = (t) => {
    H.act(t); drawSpectro(H.R.screen, t, { cry: E.io(seg(t, C.hid + 0.2, C.cry + 0.4)) });
    H.R.mon.updateMatrixWorld(true); const sc = H.R.mon.localToWorld(V(0, 1.08, 0.04));
    const c = E.io(seg(t, C.hid - 0.2, C.near + 0.3)), cp = lv(H.R.mon.localToWorld(V(-0.75, 1.15, 3.3)), H.R.mon.localToWorld(V(-0.3, 1.1, 2.75)), c);
    shoot(s.cam, cp, sc, { fov: 36, t, focus: cp.distanceTo(sc) });
  };
});
shot(C.near, C.and4, (s) => {
  const H = studySet(s); s.ap = 4; s.exposure = 1.0; s.bloom = 0.55;
  s.update = (t) => {
    H.act(t); drawSpectro(H.R.screen, t, { cry: 1, baby: seg(t, C.near + 0.05, C.baby + 0.2) });
    H.R.mon.updateMatrixWorld(true); const sc = H.R.mon.localToWorld(V(0, 1.08, 0.04));
    const c = E.io(seg(t, C.near - 0.2, C.and4 + 0.3)), cp = lv(H.R.mon.localToWorld(V(0.3, 1.0, 2.75)), H.R.mon.localToWorld(V(0.15, 1.05, 2.6)), c);
    shoot(s.cam, cp, sc, { fov: 38, t, focus: cp.distanceTo(sc), roll: -2 });
  };
});

// 14) and people found it hard to ignore: pillow over the face, purring cat on the chest ----------
function sleeper(sc) {
  const O = makeKid(PJ); sc.add(O); const ou = O.userData;
  return { O, ou, pose(t, { lift = 0, glare = 0 } = {}) {
    ou.reset(); O.rotation.set(-Math.PI / 2, 0, 0); O.position.set(0.05, 1.04, 1.22); ou.neck(0.85); ou.breathe(t, 0.22, 0.03); ou.legs.forEach(L => L.hip.visible = false); ou.torso.visible = false;
    ou.setLid(lerp(0.9, 0.35, glare)); ou.wince(0.5 * glare); return ou; } };
}
shot(C.and4, C.every, (s) => {
  const sc = s.scene; const R = bedroom(sc); const SL = sleeper(sc); const cat = makeCat2(TABBY); cat.scale.setScalar(CS); cat.rotation.order = 'YXZ'; sc.add(cat); const u = cat.userData; s.ap = 6; s.exposure = 1.12; s.bloom = 0.45;
  const pil = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), R.pillowL.material); pil.scale.set(0.58, 0.16, 0.34); pil.castShadow = true; sc.add(pil); R.pillowR.visible = false;
  const tUp = C.ignore - 0.15;
  s.update = (t) => {
    const lift = E.io(seg(t, tUp, tUp + 0.45)), press = 1 - lift;
    const c = E.io(seg(t, C.and4 - 0.2, C.every + 0.3)), cp = lv(V(0.75, 3.45, 2.0), V(0.65, 3.3, 1.65), c), tg = lv(V(0.12, 1.75, -0.95), V(0.1, 1.75, -1.0), c);
    const ou = SL.pose(t, { glare: smooth(tUp + 0.3, tUp + 0.6, t) });
    const face = headPt(SL.O, V(0, 0, 0.55));
    const pp = lv(face.clone().add(V(0, 0.12, 0.02)), face.clone().add(V(0.95, 0.55, 0.25)), lift); pp.y += 0.015 * Math.sin(t * 13) * press;
    pil.position.copy(pp); pil.rotation.set(0.15 * press, 0.4 * lift, 0.9 * lift);
    const hL = pp.clone().add(V(-0.45 + 0.2 * lift, 0.05, 0.05)), hR = pp.clone().add(V(0.45, 0.05, 0.05));
    ik2(SL.O, ou.arms[0], hL, V(-1, 0, 0.5)); ik2(SL.O, ou.arms[1], hR, V(1, 0, 0.5)); ou.hands.forEach(h => h.curl(0.5 * press + 0.2));
    // the cat: loafing on the chest, purring with its eyes closed, then one eye opens at her
    const cx = 0.62, cz = -0.6; cat.position.set(cx, duvetY(cx, cz) - 0.04, cz); cat.rotation.set(0, 0.25, 0);
    u.pose({ sit: 1 }); pawsOn(cat, u, (x, z) => duvetY(x, z)); cat.position.x += 0.004 * Math.sin(t * 150);
    u.solve().breathe(t, 0.035).pupil(0.4).ears(0, 0.05, 0).whisk(0.2).tailRest(t, 0.2);
    const peek = smooth(tUp + 0.35, tUp + 0.6, t); u.look(lv(cp, face, peek), 1, -0.2 * peek + 0.15 * (1 - peek), 1.6, 0.7); u.lid(lerp(0.92, 0.5, peek), 0.45 * (1 - peek)); u.lids[0].rotation.x = lerp(-0.8, 1.45, 0.92);
    
    shoot(s.cam, cp, tg, { fov: 40, t, focus: cp.distanceTo(face) });
  };
});

// 15) every cat learns: a little chirp at the door, and the door opens ---------------------------
shot(C.every, C.meows2, (s) => {
  const sc = s.scene; const R = hallway(sc); const cat = makeCat2(TABBY); cat.scale.setScalar(CS); sc.add(cat); const u = cat.userData; s.ap = 5; s.exposure = 1.08; s.bloom = 0.55;
  const O = makeKid(OWNER); addSmile(O); sc.add(O);
  const tO = C.learns - 0.05;
  s.update = (t) => {
    const op = E.io(seg(t, tO, tO + 0.55)); R.open(op);
    const ou = O.userData; ou.reset(); O.position.set(0.45, 0, -1.75 + 0.1 * op); O.rotation.set(0, 0, 0); ou.breathe(t, 0.25, 0.02); ou.smile(0.7); O.visible = op > 0.05;
    const m = mouthOf('hero', t);
    const go = seg(t, tO + 0.4, C.meows2 + 0.2), z = lerp(1.0, 0.3, E.io(go));
    cat.position.set(0.05, 0, z); cat.rotation.set(0, Math.PI, 0);
    u.pose({ sit: 1 - smooth(tO + 0.25, tO + 0.45, t), stand: smooth(tO + 0.25, tO + 0.45, t) }); if (go > 0 && go < 1) walkLegs(u, (1.0 - z) * Math.PI / (2 * 0.26 * CS));
    u.solve().breathe(t).pupil(0.5).ears(0, 0.1, 0.1).whisk(0.3);
    u.tail([V(0, 0.7, -0.98), V(0, 1.1, -1.15), V(0.02, 1.6, -1.2), V(0.05, 2.0, -1.05), V(0.22, 2.2, -0.85)]);
    const lk = V(0.6, 1.55, 0.1); u.look(lk, 1, 0.1, 1.2, 1.0).gaze(lk); meowFace(u, m, { up: 0.25 }); u.lid(0.15 + 0.3 * m, 0.2 * m);
    const c = E.io(seg(t, C.every - 0.2, C.meows2 + 0.3)), cp = lv(V(2.35, 1.0, 2.0), V(2.1, 1.05, 1.75), c), tg = lv(V(0.0, 1.15, 0.45), V(-0.05, 1.3, 0.1), c);
    shoot(s.cam, cp, tg, { fov: 38, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 16) which meows work on its human: one meow, and the laptop closes ------------------------------
shot(C.meows2, C.so3, (s) => {
  const { R, cat, u } = homeCat(s); const O = makeKid(OWNER); addSmile(O); s.scene.add(O); const lap = makeLaptop(); s.scene.add(lap); const lid = lap.children[1]; s.ap = 6; s.exposure = 1.0; s.bloom = 0.42;
  const tC = C.work + 0.15;
  s.update = (t) => {
    R.update(t);
    const ou = O.userData; ou.reset(); O.rotation.set(0, Math.PI, 0); O.position.set(R.sofa.x, 0, R.sofa.z - 0.25); seatOn(O, R.sofa.seatY); ou.breathe(t, 0.28, 0.025);
    lap.position.set(R.sofa.x, R.sofa.seatY + 0.42, R.sofa.z - 0.78); lap.rotation.set(0, Math.PI, 0);
    const shut = E.io(seg(t, tC, tC + 0.35)); lid.rotation.x = lerp(-0.32, 1.52, shut);
    const typing = 1 - smooth(C.meows2 + 0.25, C.meows2 + 0.45, t), ty = Math.sin(t * 17) * 0.012 * typing;
    if (shut < 0.02) { ik2(O, ou.arms[0], lap.position.clone().add(V(0.2, 0.05 + ty, 0.02)), V(1, -1, 0)); ik2(O, ou.arms[1], lap.position.clone().add(V(-0.2, 0.05 - ty, 0.02)), V(-1, -1, 0)); }
    else { const top = lap.position.clone().add(V(0, 0.08 + 0.45 * (1 - shut), -0.2 * (1 - shut))); ik2(O, ou.arms[0], top.clone().add(V(0.25, 0, 0)), V(1, -1, 0)); ik2(O, ou.arms[1], top.clone().add(V(-0.25, 0, 0)), V(-1, -1, 0)); }
    ou.hands.forEach(h => h.curl(0.35));
    const cw = cat.position.clone().add(V(0, 1.0, 0)), hp = ou.head.getWorldPosition(new THREE.Vector3()), look = smooth(C.meows2 + 0.3, C.meows2 + 0.7, t);
    const d = O.worldToLocal(cw.clone()).sub(O.worldToLocal(hp.clone())); ou.head.rotation.y += look * clamp(Math.atan2(d.x, d.z), -0.8, 0.8); ou.head.rotation.x += lerp(0.32, clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.3, 0.6), look);
    ou.smile(0.5 * smooth(tC + 0.2, tC + 0.6, t)); ou.raise(0.6 * look); ou.lid(0.2, t, 2);
    cat.position.set(R.sofa.x + 1.05, R.sofa.seatY - 0.05, R.sofa.z - 0.45); cat.rotation.set(0, -Math.PI / 2 - 0.35, 0);
    const m = mouthOf('hero', t); u.pose({ sit: 1 }); u.solve().breathe(t).pupil(0.55).ears(0, 0.1, 0).whisk(0.3).tailRest(t, 0.45, 1);
    const fh = headPt(O, V(0, 0, 0.3)); u.look(fh, 1, 0.1, 1.2, 1.0).gaze(fh); meowFace(u, m, { up: 0.25 }); u.lid(0.15 + 0.3 * m, 0.2 * m);
    const c = E.io(seg(t, C.meows2 - 0.2, C.so3 + 0.3)), cp = lv(V(R.sofa.x + 0.9, 2.0, R.sofa.z - 3.4), V(R.sofa.x + 0.8, 2.0, R.sofa.z - 3.05), c), tg = lv(V(R.sofa.x + 0.7, 2.25, R.sofa.z - 0.6), V(R.sofa.x + 0.65, 2.3, R.sofa.z - 0.6), c);
    shoot(s.cam, cp, tg, { fov: 44, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 17) so at five in the morning: the alarm clock ticks over to 5:00; two eyes glow behind it -------
shot(C.so3, C.when2, (s) => {
  const sc = s.scene; const R = bedroom(sc); const cat = makeCat2(TABBY); cat.scale.setScalar(CS); sc.add(cat); const u = cat.userData; s.ap = 3; s.exposure = 1.15; s.bloom = 0.6;
  const SL = sleeper(sc);
  s.update = (t) => {
    const T5 = C.five + 0.02, sec = 57 + (t - (T5 - 3)) % 60, h = t < T5 ? 4 : 5, mn = t < T5 ? 59 : 0, ss = t < T5 ? 57 + Math.floor(t - (T5 - 3)) : Math.floor(t - T5);
    R.clock.userData.set(h, mn, Math.max(0, ss)); const tick = Math.exp(-Math.max(0, t - T5) * 10) * (t > T5 ? 1 : 0); R.clock.rotation.z = 0.02 * tick * Math.sin((t - T5) * 60);
    SL.pose(t, {});
    // the cat on the bed, behind the clock: eyes open in the dark at 5:00
    cat.position.set(1.0, BED.top + 0.02, -1.95); cat.rotation.set(0, 0.85, 0); u.pose({ sit: 1 }); u.solve().breathe(t).ears(0.05, 0, 0).whisk(0.2).tailRest(t, 0.2);
    const open = smooth(T5 + 0.08, T5 + 0.3, t); u.lid(lerp(0.95, 0.12, open), 0.1); u.pupil(0.95).glow(1.2 * open);
    R.clock.rotation.y = 0.9; R.clock.updateMatrixWorld(true); const cw = R.clock.localToWorld(V(0, 0.24, 0.06)); const cp = lv(R.clock.localToWorld(V(0.0, 0.42, 1.25)), R.clock.localToWorld(V(0.0, 0.38, 1.0)), E.io(seg(t, C.so3 - 0.2, C.when2 + 0.3)));
    u.look(cp, 1, 0.05).gaze(cp);
    shoot(s.cam, cp, lv(cw, u.eyeW(), 0.4), { fov: 36, t, focus: cp.distanceTo(cw) });
  };
});

// 18) when the bowl is empty: back to the first frame
shot(C.when2, END, (s) => podShot(s, t => t - END));
// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
