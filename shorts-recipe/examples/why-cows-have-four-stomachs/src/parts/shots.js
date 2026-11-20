// =====================================================================
// SHOTS (13). The first and last shots share one camera path and the same chewing cow (the loop frame).
// =====================================================================
const END = C.end;
const headW = (b) => { const v = new THREE.Vector3(); b.userData.head.getWorldPosition(v); return v; };
const L = (c, v) => c.localToWorld(v.clone());
function hookScene(s) {
  const sc = s.scene, P = pasture(sc), cow = makeCow(sc, { heading: 0.35 }); s.ap = 5; s.exposure = 1.0; s.bloom = 0.18;
  cow.updateMatrixWorld(true); const HP = L(cow, V(3.4, 1.25, 4.4)), HT = L(cow, V(0.25, 0.85, 0.0));
  return { cow, P, cam: (tau, t) => { P.sun.userData.aim(V(0.3, 0.8, 0)); const k = E.io(seg(tau, -3.8, -0.3)); const p = lv(L(cow, V(3.2, 1.6, 2.6)), HP, k), tg = lv(L(cow, V(0.1, 0.85, 0)), HT, k);
    shoot(s.cam, p, tg, { fov: lerp(34, 30, k), t: tau + 100, hand: 0.2, focus: p.distanceTo(headW(cow)) }); } };
}
// 0) A cow eats every meal twice. — a Holstein in an Alpine pasture, chewing, looking at you
shot(0, C.it, (s) => { const H = hookScene(s); s.update = (t) => { H.cow.userData.pose(cowPose({ t, look: 0.35 }), t, 1); H.cam(t, t); }; });
// the x-ray cow: a glowing ghost with the four-chambered stomach inside
function xrayCow(sc) { sc.background = new THREE.Color(0x05080c); sc.environment = STUDIO.env; sc.environmentIntensity = 0.6; const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(1, 2, 2); sc.add(k); const k2 = new THREE.DirectionalLight(0x9fc8ff, 1); k2.position.set(-2, 1, -1); sc.add(k2);
  const cow = makeCow(sc, { fluffy: false }); const G = xrayMat(new THREE.Color(0.55, 0.8, 1.0), new THREE.Color(0.03, 0.08, 0.16), 2.2, 0.75); cow.traverse(m => { if (m.isMesh) { m.material = G; m.castShadow = false; } });
  const st = stomach4(); cow.userData.body.add(st); return { cow, st }; }
// 1) It doesn't have four stomachs.
shot(C.it, C.it2, (s) => { const { cow, st } = xrayCow(s.scene); s.ap = 3; s.exposure = 1.0; s.bloom = 0.35;
  s.update = (t) => { cow.userData.pose(cowPose({ t }), t, 1); const k = seg(t, C.it, C.it2); shoot(s.cam, V(0.2 + 0.3 * k, 1.1, 3.2 - 0.3 * k), V(0.0, 0.85, 0), { fov: 34, t, hand: 0.1 }); }; });
// 2) It has one, with four rooms. — the organ alone, turning; each room lights up and is numbered
shot(C.it2, C.grass, (s) => { const sc = s.scene; sc.background = new THREE.Color(0x0a0a0c); sc.environment = STUDIO.env; sc.environmentIntensity = 0.8; const k = new THREE.DirectionalLight(0xfff0e8, 2); k.position.set(1, 2, 2); sc.add(k);
  const st = stomach4(); sc.add(st); s.ap = 3; s.exposure = 1.0; s.bloom = 0.3; const labs = [1, 2, 3, 4].map(n => { const l = liveLabel(0.12, 0.6); l.userData.set([[String(n), 260, 0.5, '#ffffff', 900, 3]]); sc.add(l); return l; });
  s.update = (t) => { st.rotation.y = 0.5 + 0.25 * (t - C.it2); const lit = [C.one, C.four2, C.four2 + 0.2, C.rooms].map(x => smooth(x - 0.05, x + 0.25, t)); const rooms = st.userData.rooms;
    rooms.forEach((r, i) => { r.material.emissive = new THREE.Color(0x401010).multiplyScalar(lit[i] * 0.8); const p = new THREE.Vector3(); r.getWorldPosition(p); labs[i].position.copy(p).add(V(0, 0.2, 0.12)); labs[i].quaternion.copy(s.cam.quaternion); labs[i].scale.setScalar(Math.max(1e-4, spring(t, [C.one, C.four2, C.four2 + 0.2, C.rooms][i] - 0.05, 2, 6))); });
    shoot(s.cam, V(0.3, 0.25, 1.5), V(-0.02, -0.04, 0), { fov: 34, t, hand: 0.06 }); }; });
// 3) Grass goes into the first, — head down in the grass, tearing it
shot(C.grass, C.the2, (s) => { const sc = s.scene, P = pasture(sc, { seed: 7 }), cow = makeCow(sc, { heading: -0.5 }); s.ap = 7; s.exposure = 1.0; s.bloom = 0.18;
  s.update = (t) => { cow.userData.pose(cowPose({ t, graze: 1, look: 0.15 * Math.sin(t * 3) }), t, 0.6); P.sun.userData.aim(V(0.5, 0.4, 0)); cow.updateMatrixWorld(true); shoot(s.cam, L(cow, V(2.6, 0.6, 2.6)), L(cow, V(0.7, 0.45, 0.0)), { fov: 30, t, hand: 0.15 }); }; });
// 4) the rumen, a vat as big as a bathtub, — the rumen, lifted out, sitting in a bathtub it fills
shot(C.the2, C.packed, (s) => { const sc = s.scene; sc.background = new THREE.Color(0x0c0c0e); sc.environment = STUDIO.env; sc.environmentIntensity = 0.9; const k = new THREE.DirectionalLight(0xfff0e8, 2.2); k.position.set(1, 2.4, 1.6); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.5, far: 6 }); sc.add(k);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, roughness: 0.6 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
  const tub = bathtub(); sc.add(tub); const st = stomach4(); const ru = st.userData.rooms[0], rv = st.userData.rumenV; [ru, rv].forEach(m => { st.remove(m); }); const R = new THREE.Group(); R.add(ru, rv); ru.position.set(0, 0.12, 0); rv.position.set(-0.04, -0.06, 0); R.scale.setScalar(1.25); sc.add(R); s.ap = 3; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { const k2 = seg(t, C.the2, C.packed); R.position.set(0, lerp(1.0, 0.36, E.io(seg(t, C.a2 - 0.1, C.bathtub + 0.2))), 0); R.rotation.y = 0.2 * Math.sin(t * 0.6); shoot(s.cam, V(1.2 - 0.2 * k2, 1.0, 1.9 - 0.2 * k2), V(0.0, 0.42, 0), { fov: 34, t, hand: 0.1 }); }; });
// 5) packed with trillions of microbes that break down tough plant fiber. — inside the rumen
shot(C.packed, C.then, (s) => { const up = rumenInside(s.scene); s.ap = 6; s.exposure = 1.05; s.bloom = 0.25; s.maxR = 14;
  s.update = (t) => { up(t, smooth(C.break - 0.2, C.fiber + 0.4, t)); const k = seg(t, C.packed, C.then); shoot(s.cam, V(0.05 * k, 0.02, 0.18 - 0.08 * k), V(0.0, 0.0, -0.1), { fov: 40, t, hand: 0.05, focus: 0.15 }); }; });
// 6) Then the cow burps the mush back up, — x-ray: a ball of cud rides up the gullet to the mouth
shot(C.then, C.and, (s) => { const { cow, st } = xrayCow(s.scene); s.ap = 3; s.exposure = 1.0; s.bloom = 0.4; const bol = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 18), new THREE.MeshPhysicalMaterial({ color: 0x6a8a2a, roughness: 0.5, emissive: 0x2a4a08, emissiveIntensity: 1.2 })); s.scene.add(bol);
  s.update = (t) => { cow.userData.pose(cowPose({ t }), t, 0); cow.updateMatrixWorld(true); const k = E.io(seg(t, C.burps - 0.1, C.up + 0.2));
    const a = V(0.22, 0.04, -0.05).applyMatrix4(cow.userData.body.matrixWorld), m = V(0.55, 0.22, 0).applyMatrix4(cow.userData.body.matrixWorld), mouth = cow.userData.head.localToWorld(V(0.25, -0.08, 0));
    const cv = new THREE.CatmullRomCurve3([a, m, m.clone().lerp(mouth, 0.5).add(V(0, 0.08, 0)), mouth]); bol.position.copy(cv.getPointAt(k)); bol.visible = t < C.and - 0.05;
    shoot(s.cam, V(0.8, 1.2, 2.6), V(0.5, 0.9, 0), { fov: 34, t, hand: 0.1 }); }; });
// 7) and chews it again. — close on the jaw, grinding side to side
shot(C.and, C.thats, (s) => { const sc = s.scene, P = pasture(sc, { seed: 5 }), cow = makeCow(sc, { heading: 0.6 }); s.ap = 8; s.exposure = 1.0; s.bloom = 0.18;
  s.update = (t) => { cow.userData.pose(cowPose({ t, look: 0.2 }), t, 1); P.sun.userData.aim(V(0.5, 1.0, 0)); cow.updateMatrixWorld(true); const h = headW(cow); shoot(s.cam, L(cow, V(2.6, 1.1, 2.8)), h.clone().add(V(-0.3, -0.2, 0)), { fov: 30, t, hand: 0.1 }); }; });
// 8) That's chewing the cud, up to eight hours a day. — time-lapse: the cow chews on as the shadows swing round; "8 HOURS"
shot(C.thats, C.the6, (s) => { const sc = s.scene, P = pasture(sc, { seed: 11 }), cow = makeCow(sc, { heading: -0.2 }); s.ap = 4; s.exposure = 1.0; s.bloom = 0.2; const lab = liveLabel(0.4, 0.3); sc.add(lab); lab.userData.set([['8 HOURS', 170, 0.5, '#ffffff', 900, 3]]);
  const base = ALPS_SUN.clone();
  s.update = (t) => { const k = seg(t, C.thats, C.the6); cow.userData.pose(cowPose({ t: t * 6, look: 0.4 * Math.sin(t * 2) }), t * 6, 1); const dir = base.clone().applyAxisAngle(V(0, 1, 0), lerp(-0.9, 0.9, k)); P.sun.position.copy(V(0.3, 0.8, 0)).addScaledVector(dir, 10); P.sun.target.position.set(0.3, 0.8, 0); P.sun.target.updateMatrixWorld();
    shoot(s.cam, V(2.6, 1.3, 3.0), V(0.2, 0.85, 0), { fov: 32, t, hand: 0.1 }); pin(s.cam, lab, 0, 0.62, 2.0); lab.scale.setScalar(Math.max(1e-4, spring(t, C.eight - 0.05, 2, 6))); }; });
// 9) The honeycomb room sorts it, — inside the reticulum
shot(C.the6, C.the7, (s) => { const up = honeycombInside(s.scene); s.ap = 6; s.exposure = 1.05; s.bloom = 0.22;
  s.update = (t) => { up(t); const k = seg(t, C.the6, C.the7); shoot(s.cam, V(0.04 * k, 0.03, 0.12 - 0.05 * k), V(0.0, -0.02, -0.2), { fov: 40, t, hand: 0.05, focus: 0.2 }); }; });
// 10) the third squeezes out the water, — the omasum's leaves press together; water drips out
shot(C.the7, C.and2, (s) => { const up = omasumLeaves(s.scene); s.ap = 6; s.exposure = 1.05; s.bloom = 0.22;
  s.update = (t) => { up(t, smooth(C.squeezes - 0.1, C.water + 0.2, t)); shoot(s.cam, V(0.3, 0.06, -0.02), V(0.0, 0.0, -0.05), { fov: 34, t, hand: 0.05 }); }; });
// 11) and the fourth digests with acid, just like yours. — inside the abomasum: folds and a fizzing pool of acid
shot(C.and2, C.so, (s) => { const up = abomasumInside(s.scene); s.ap = 6; s.exposure = 1.05; s.bloom = 0.22;
  s.update = (t) => { up(t); const k = seg(t, C.and2, C.so); shoot(s.cam, V(0.3 - 0.25 * k, 0.02, 0.02), V(-0.3, -0.06, 0.0), { fov: 40, t, hand: 0.05, focus: 0.3 }); }; });
// 12) So when a cow just stands there chewing, it's not bored, because… — back in the pasture (loop)
shot(C.so, END, (s) => { const H = hookScene(s); s.update = (t) => { H.cow.userData.pose(cowPose({ t: t - END, look: 0.35 }), t - END, 1); H.cam(t - END, t); }; });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
