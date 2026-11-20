// =====================================================================
// SHOTS (11). The first and last shots share one camera and the same stare over the back (the loop frame).
// =====================================================================
const END = C.end;
const headW = (b) => { const v = new THREE.Vector3(); b.userData.head.getWorldPosition(v); return v; };
const OWL_AT = V(0.2, 0.255, 0.0);
const HOOK_P = V(-0.62, 0.66, 0.28), HOOK_T = V(0.17, 0.66, 0.0);
// the loop camera and head: tau = seconds from the loop point
function hookScene(s) {
  const sc = s.scene, F = forest(sc), o = owl(sc, { at: OWL_AT, heading: 0 }); s.ap = 7; s.exposure = 1.0; s.bloom = 0.2;
  return { o, F, cam: (tau, t) => { F.sun.userData.aim(V(0.2, 0.5, 0)); const k = E.io(seg(tau, -3.2, -0.3)); const p = lv(V(-1.05, 0.75, 0.62), HOOK_P, k), tg = lv(V(0.15, 0.58, 0.0), HOOK_T, k);
    shoot(s.cam, p, tg, { fov: lerp(32, 30, k), t: tau + 100, hand: 0.15, focus: p.distanceTo(headW(o)) }); } };
}
// 0) An owl can turn its head almost all the way around. — from behind: it stares back over its shoulders, then swivels through 270 degrees
shot(0, C.it, (s) => {
  const H = hookScene(s), lab = liveLabel(0.12, 0.3); s.scene.add(lab); lab.userData.set([['270°', 190, 0.5, '#ffffff', 900, 3]]);
  s.update = (t) => { const yaw = Math.PI - 1.5 * Math.PI * E.io(seg(t, 0.55, 2.95)); H.o.userData.pose(perchPose(yaw, { t })); H.cam(t, t);
    pin(s.cam, lab, 0, 0.085, 0.5); lab.scale.setScalar(Math.max(1e-4, spring(t, C.way - 0.05, 2, 6))); };
});
// 1) It has to, because its eyes aren't balls like ours. — face to face; a slow push in on the eyes, a curious head tilt
shot(C.it, C.theyre, (s) => {
  const sc = s.scene, F = forest(sc), o = owl(sc, { at: OWL_AT, heading: 0 }); s.ap = 10; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { const k = seg(t, C.it, C.theyre); o.userData.pose(perchPose(0.05 * Math.sin(t), { t, tilt: 0.28 * smooth(C.eyes - 0.2, C.eyes + 0.4, t) - 0.28 * smooth(C.like, C.ours + 0.3, t) })); F.sun.userData.aim(V(0.2, 0.5, 0));
    const h = headW(o); shoot(s.cam, h.clone().add(V(0.62 - 0.22 * E.io(k), -0.01, 0.04)), h.clone().add(V(0.0, 0.0, 0)), { fov: 24, t, hand: 0.06 }); };
});
// the x-ray owl: a glowing ghost of the bird with its tubular eyes, neck bones, arteries, blood pools and brain inside
function xrayOwl(sc) {
  const o = owl(sc, { at: V(0, 0, 0), heading: 0 }), G = ghostMat(), U = o.userData;
  o.traverse(m => { if (m.isMesh) { m.material = G; m.castShadow = false; } });
  o.traverse(c => { if (c.userData.fluff) c.visible = false; }); // no fluff shells on the ghost
  U.body.children.forEach(c => c.visible = false); U.legs.forEach(L => [L.tib, L.tar, L.ank, L.foot].forEach(m => m.visible = false)); // just the body, the head and what is inside
  U.head.children.forEach(c => { if (c.isMesh && c.geometry.type === 'LatheGeometry' && c !== U.head.children[0]) c.visible = false; if (c.isGroup && c.userData.fluff) c.visible = false; });
  U.head.traverse(c => { if (c.isMesh && c.geometry.type === 'ConeGeometry') c.visible = false; });
  // tubular eyes inside the head, looking forward
  const eyes = [-1, 1].map(sd => { const e = tubeEye(1.1); e.rotation.z = -Math.PI / 2; e.position.set(0.018, 0.008, sd * 0.024); U.head.add(e); return e; });
  const brain = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xf0a0a8, roughness: 0.5, emissive: 0x501018, emissiveIntensity: 0.4 })); brain.scale.set(1.0, 0.8, 1.1); brain.position.set(-0.012, 0.022, 0); U.head.add(brain);
  const col = new THREE.Group(); sc.add(col); const am = ARTERY(); const pools = [];
  for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 20, 16), am); pools.push({ m: p, sd }); sc.add(p); }
  let built = false, arts = [], verts = [];
  const update = (P, { swell = 0, flow = 0, t = 0 } = {}) => {
    poseBird(o, P); o.updateMatrixWorld(true);
    const base = U.body.localToWorld(V(0.125, 0.0, 0)), top = U.head.localToWorld(V(-0.012, -0.045, 0)), mid = base.clone().lerp(top, 0.5).add(V(-0.02, 0, 0));
    const curve = new THREE.CatmullRomCurve3([base, base.clone().lerp(mid, 0.5).add(V(0.012, 0, 0)), mid, mid.clone().lerp(top, 0.5).add(V(0.014, 0, 0)), top]);
    if (!built) { for (let i = 0; i < 14; i++) { const v = vertebra({ s: 0.55, holeR: 0.0032 }); col.add(v); verts.push(v); } built = true; }
    const frames = ptFrames(curve, 13), hq = new THREE.Quaternion(); U.head.getWorldQuaternion(hq); const bq = new THREE.Quaternion(); U.body.getWorldQuaternion(bq);
    verts.forEach((v, i) => { const u = i / 13; v.position.copy(frames.P[i]); v.quaternion.setFromUnitVectors(V(0, 1, 0), frames.T[i]); const tw = new THREE.Quaternion().setFromAxisAngle(frames.T[i], (P.twist || 0) * smooth(0, 1, u)); v.quaternion.premultiply(tw); v.updateMatrixWorld(); });
    arts.forEach(a => { a.geometry.dispose(); col.remove(a); }); arts = [];
    for (const sd of [0, 1]) { const pts = verts.map(v => v.localToWorld(v.userData.holes[sd].clone())); pts.unshift(pts[0].clone().add(V(0.0, -0.03, 0))); const last = pts[pts.length - 1]; const jaw = U.head.localToWorld(V(0.004, -0.032, (sd ? 1 : -1) * 0.022)); pts.push(last.clone().lerp(jaw, 0.6), jaw);
      const a = tube(pts, 0.0011, am); col.add(a); arts.push(a); pools[sd].m.position.copy(jaw); pools[sd].m.scale.setScalar(Math.max(0.15, 0.25 + 0.9 * swell)); }
    am.emissiveIntensity = 1 + 2.5 * flow * (0.5 + 0.5 * Math.sin(t * 9)); brain.material.emissiveIntensity = 0.4 + 1.4 * flow * (0.5 + 0.5 * Math.sin(t * 9 - 1));
  };
  return { o, eyes, brain, update };
}
// 2) They're long tubes, locked in place, — the x-ray: inside the head, two long tubes instead of balls
shot(C.theyre, C.so, (s) => {
  const sc = s.scene; xrayStudio(sc); const X = xrayOwl(sc); s.ap = 4; s.exposure = 1.05; s.bloom = 0.35; const lab = liveLabel(0.06, 0.3); sc.add(lab); lab.userData.set([['TUBES', 160, 0.5, '#ffd28a', 900, 3]]);
  X.eyes.forEach(e => e.scale.setScalar(1.15));
  s.update = (t) => { X.update(perchPose(0.0, { t })); const h = headW(X.o), k = seg(t, C.theyre, C.so);
    shoot(s.cam, h.clone().add(V(0.035, 0.02, 0.30 - 0.04 * k)), h.clone().add(V(0.012, 0.004, 0.0)), { fov: 28, t, hand: 0.05 });
    pin(s.cam, lab, 0, 0.04, 0.25); lab.scale.setScalar(Math.max(1e-4, spring(t, C.tubes - 0.05, 2, 6))); };
});
// 3) so the head does the looking. — the eyes stay fixed; the whole head snaps from side to side
shot(C.so, C.that, (s) => {
  const sc = s.scene, F = forest(sc), o = owl(sc, { at: OWL_AT, heading: 0 }); s.ap = 8; s.exposure = 1.0; s.bloom = 0.2;
  const keys = [[C.so, 0.0], [C.so + 0.35, 0.95], [C.head2 + 0.2, 0.95], [C.head2 + 0.45, -0.8], [C.looking, -0.8], [C.looking + 0.25, 0.3]];
  s.update = (t) => { let yaw = keys[0][1]; for (let i = 1; i < keys.length; i++) if (t >= keys[i - 1][0]) yaw = lerp(keys[i - 1][1], keys[i][1], E.io(seg(t, keys[i - 1][0], keys[i][0]))); o.userData.pose(perchPose(yaw, { t })); F.sun.userData.aim(V(0.2, 0.5, 0));
    shoot(s.cam, V(0.85, 0.62, 0.32), V(0.2, 0.6, 0.0), { fov: 30, t, hand: 0.1 }); };
});
// 4) That twist would tear the blood vessels in your neck. — a human neck: seven vertebrae, the arteries strain as it twists
function humanNeck(sc, n = 7, h = 0.16) { const curve = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, h * 0.5, 0.006), V(0, h, 0)]); const g = column(n, curve, { s: 1.25, holeR: 0.0012 }); sc.add(g); const am = ARTERY(); let arts = [];
  return { g, am, update: (twist, strain) => { g.userData.vs.forEach((v, i) => { v.rotation.set(0, twist * i / (n - 1), 0); v.updateMatrixWorld(); }); arts.forEach(a => { a.geometry.dispose(); g.remove(a); }); arts = [];
    for (const sd of [0, 1]) { const pts = g.userData.vs.map(v => g.worldToLocal(v.localToWorld(v.userData.holes[sd].clone()))); pts.unshift(pts[0].clone().add(V(0, -0.03, 0))); pts.push(pts[pts.length - 1].clone().add(V(0, 0.03, 0))); const a = tube(pts, 0.0011 * (1 - 0.35 * strain), am); g.add(a); arts.push(a); }
    am.color.setHex(0xc81e24).lerp(new THREE.Color(0xff3020), strain); am.emissiveIntensity = 1 + 4 * strain; } }; }
shot(C.that, C.but, (s) => {
  const sc = s.scene; xrayStudio(sc); const Hn = humanNeck(sc); s.ap = 3; s.exposure = 1.05; s.bloom = 0.4; const lab = liveLabel(0.07, 0.3); sc.add(lab); lab.userData.set([['YOU', 170, 0.5, '#9fd0ff', 900, 3]]);
  s.update = (t) => { const tw = 1.6 * E.io(seg(t, C.twist - 0.1, C.tear + 0.2)), st = smooth(C.tear - 0.2, C.blood, t) * (0.7 + 0.3 * Math.sin(t * 20)); Hn.update(tw, st);
    shoot(s.cam, V(0.09, 0.11, 0.26), V(0, 0.085, 0), { fov: 34, t, hand: 0.05 }); pin(s.cam, lab, 0, 0.055, 0.25); lab.scale.setScalar(Math.max(1e-4, spring(t, C.your - 0.05, 2, 6))); };
});
// 5) But an owl has fourteen neck bones, twice as many as you. — side by side: seven, and fourteen in a long S
shot(C.but, C.its3, (s) => {
  const sc = s.scene; xrayStudio(sc); const Hn = humanNeck(sc); Hn.g.position.set(-0.07, 0, 0); Hn.update(0, 0);
  const curve = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0.018, 0.05, 0), V(-0.012, 0.11, 0), V(0.012, 0.17, 0), V(0.0, 0.2, 0)]); const Ow = column(14, curve, { s: 1.0, holeR: 0.0034 }); Ow.position.set(0.05, 0, 0); sc.add(Ow);
  const l7 = liveLabel(0.06, 0.3), l14 = liveLabel(0.06, 0.3); sc.add(l7, l14); s.ap = 2; s.exposure = 1.05; s.bloom = 0.35;
  s.update = (t) => { const k14 = Math.floor(14 * smooth(C.fourteen - 0.2, C.bones + 0.3, t)), k7 = Math.floor(7 * smooth(C.twice, C.you, t));
    Ow.userData.vs.forEach((v, i) => v.traverse(m => { if (m.isMesh) m.material.emissive = new THREE.Color(i < k14 ? 0x5a3c10 : 0x000000); }));
    Hn.g.userData.vs.forEach((v, i) => v.traverse(m => { if (m.isMesh) m.material.emissive = new THREE.Color(i < k7 ? 0x103a5a : 0x000000); }));
    l14.userData.set([[String(Math.max(k14, 0) || ''), 200, 0.5, '#ffd28a', 900, 3]]); l7.userData.set([[k7 ? String(k7) : '', 200, 0.5, '#9fd0ff', 900, 3]]);
    l14.position.set(0.05, 0.235, 0.02); l7.position.set(-0.07, 0.235, 0.02); [l7, l14].forEach(l => l.quaternion.copy(s.cam.quaternion));
    shoot(s.cam, V(-0.01, 0.12, 0.62), V(-0.01, 0.115, 0), { fov: 34, t, hand: 0.05 }); };
});
// 6-7) Its arteries run through holes ten times wider than they are, cushioned with air, so they never get pinched.
function bigVertebra(sc) { const v = vertebra({ s: 4, holeR: 0.0034 }); sc.add(v); const am = ARTERY(); const hole = v.userData.holes[1];
  const art = new THREE.Mesh(new THREE.CylinderGeometry(0.0013 * 4 * 0.25, 0.0013 * 4 * 0.25, 0.12, 24), am); art.position.copy(hole); sc.add(art);
  const air = new THREE.Mesh(new THREE.CylinderGeometry(0.0034 * 4 * 0.92, 0.0034 * 4 * 0.92, 0.05, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); air.position.copy(hole); air.userData.noDof = true; sc.add(air);
  return { v, art, air, hole }; }
shot(C.its3, C.cushioned, (s) => {
  const sc = s.scene; xrayStudio(sc); const B = bigVertebra(sc); s.ap = 5; s.exposure = 1.05; s.bloom = 0.35; const lab = liveLabel(0.05, 0.3); sc.add(lab); lab.userData.set([['10×', 200, 0.5, '#ffd28a', 900, 3]]);
  s.update = (t) => { const k = seg(t, C.its3, C.cushioned); B.v.rotation.y = 0.25 * Math.sin(t * 0.8); B.v.updateMatrixWorld(); B.art.position.copy(B.v.localToWorld(B.hole.clone()));
    shoot(s.cam, V(0.09 + 0.02 * k, 0.11, 0.2 - 0.02 * k), V(0.012, 0.0, 0.0), { fov: 32, t, hand: 0.04 }); pin(s.cam, lab, 0, 0.045, 0.25); lab.scale.setScalar(Math.max(1e-4, spring(t, C.ten - 0.05, 2, 6))); };
});
shot(C.cushioned, C.and, (s) => {
  const sc = s.scene; xrayStudio(sc); const B = bigVertebra(sc); s.ap = 5; s.exposure = 1.05; s.bloom = 0.4;
  s.update = (t) => { const tw = 0.9 * Math.sin((t - C.cushioned) * 2.2); B.v.rotation.set(0, tw, 0); B.v.updateMatrixWorld(); const hp = B.v.localToWorld(B.hole.clone()); B.art.position.copy(hp).add(V(-0.0016 * Math.sin(tw * 3), 0, 0.0012 * Math.cos(tw * 2))); B.air.position.copy(hp);
    B.air.material.opacity = 0.18 * smooth(C.cushioned, C.air, t) * (0.8 + 0.2 * Math.sin(t * 6));
    shoot(s.cam, V(0.07, 0.12, 0.13), V(0.03, 0.0, 0.0), { fov: 30, t, hand: 0.04 }); };
});
// 8) And under the jaw, they swell into little pools of blood — the x-ray head: the arteries balloon into reservoirs under the jaw
shot(C.and, C.that2, (s) => {
  const sc = s.scene; xrayStudio(sc); const X = xrayOwl(sc); s.ap = 4; s.exposure = 1.05; s.bloom = 0.4;
  s.update = (t) => { X.update(perchPose(0.2 * Math.sin(t * 0.5), { t }), { swell: smooth(C.swell - 0.1, C.pools + 0.3, t), t }); const h = headW(X.o), k = seg(t, C.and, C.that2);
    shoot(s.cam, h.clone().add(V(0.13 - 0.02 * k, -0.04, 0.2 - 0.03 * k)), h.clone().add(V(0.0, -0.05, 0)), { fov: 32, t, hand: 0.05 }); };
});
// 9) that keep the brain fed while the head turns. — the head turns; blood pulses up into the brain
shot(C.that2, C.so3, (s) => {
  const sc = s.scene; xrayStudio(sc); const X = xrayOwl(sc); s.ap = 3; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => { const yaw = 1.6 * E.io(seg(t, C.that2 + 0.2, C.turns + 0.4)); const P = perchPose(yaw, { t }); X.update(P, { swell: 1, flow: smooth(C.keep - 0.2, C.brain, t), t });
    const h = headW(X.o); shoot(s.cam, h.clone().add(V(0.2, 0.02, 0.26)), h.clone().add(V(-0.01, -0.05, 0)), { fov: 34, t, hand: 0.05 }); };
});
// 10) So if one ever stares straight behind it, don't panic, because… — back in the forest, from behind: the head swings round to stare at us (loop)
shot(C.so3, END, (s) => {
  const H = hookScene(s);
  s.update = (t) => { const yaw = Math.PI * E.io(seg(t, C.stares - 0.2, C.behind + 0.1)); H.o.userData.pose(perchPose(yaw, { t })); H.cam(t - END, t); };
});

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
