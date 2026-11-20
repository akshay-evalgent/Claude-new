// =====================================================================
// SHOTS (17). The first and last shots share one camera path measured from the loop point.
// =====================================================================
const END = C.end;
const headW = (b) => { const v = new THREE.Vector3(); b.userData.head.getWorldPosition(v); return v; };
const eyeW = (b) => { const v = new THREE.Vector3(); b.userData.head.userData.eyeR.getWorldPosition(v); return v; };
const LODB = { nb: 30, nn: 30, nh: 20, nv: 24 };
const side = (b, h, d, up = 0, fwd = 0) => { const q = new THREE.Quaternion(); b.userData.head.getWorldQuaternion(q); return h.clone().add(V(fwd, up, d).applyQuaternion(q)); }; // a point beside the head, in the head's own frame
// a background flock standing, feeding and preening across the lagoon
function lagoonFlock(sc, list) { return list.map(([x, z, hd, mode, ph]) => { const b = flamingo(sc, { at: V(x, 0, z), heading: hd, lod: LODB });
  return (t) => { const tt = t + ph; if (mode === 'feed') b.userData.pose(feedPose(tt)); else if (mode === 'tuck') b.userData.pose(standPose(FLAMINGO, { tuck: 'R', t: tt, sway: 1, yaw: 0.3 * Math.sin(tt * 0.4) })); else b.userData.pose(standPose(FLAMINGO, { t: tt, sway: 1, yaw: 0.4 * Math.sin(tt * 0.5 + ph), pitch: -0.1 + 0.1 * Math.sin(tt * 0.3) })); }; }); }
const FLOCK1 = [[-2.2, -4.5, 0.6, 'stand', 0.5], [1.8, -6.0, 2.6, 'feed', 1.3], [3.6, -9.0, -0.4, 'tuck', 2.1], [-4.4, -10.5, 1.2, 'feed', 3.3], [0.3, -13.0, 3.0, 'stand', 4.2], [-1.2, -7.6, -1.0, 'tuck', 5.1], [5.5, -14.0, 1.6, 'feed', 6.4]];

// the loop shot: tau = seconds from the loop point
function hookScene(s) {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.5 }), F = lagoonFlock(sc, FLOCK1); s.ap = 5; s.exposure = 1.0; s.bloom = 0.22;
  return (tau, t) => {
    L.tick(t); F.forEach(u => u(t)); f.userData.pose(standPose(FLAMINGO, { tuck: 'L', t: tau + 50, sway: 1, yaw: 0.12 * Math.sin((tau + 50) * 0.6), pitch: -0.12 }));
    L.sun.userData.aim(V(0, 0.7, 0)); const k = E.io(seg(tau, -2.3, -0.25));
    const p = lv(V(1.6, 1.3, 4.9), V(0.62, 0.42, 2.7), k), tg = lv(V(-0.1, 0.75, 0), V(-0.06, 0.76, 0), k);
    shoot(s.cam, p, tg, { fov: lerp(32, 30, k), t: tau + 100, hand: 0.25, focus: p.distanceTo(V(0, 0.9, 0)) });
  };
}
// 0) Flamingos aren't born pink.
shot(0, C.their, (s) => { const up = hookScene(s); s.update = (t) => up(t, t); });

// 1) Their chicks hatch fluffy and grey. — a grey chick on its mud nest, a parent's legs behind
shot(C.their, C.the, (s) => {
  const sc = s.scene, L = lagoon(sc, { shadowBox: 0.6 }); nestMound(sc); const c = chick(sc, { at: V(0, 0.086, 0), heading: 1.3 }); const p = flamingo(sc, { at: V(-0.32, 0, -0.32), heading: 0.6 }); const F = lagoonFlock(sc, FLOCK1.slice(0, 4)); s.ap = 9; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); F.forEach(u => u(t)); c.userData.pose(standPose(CHICK, { t, sway: 2, yaw: 0.35 * Math.sin(t * 1.3), pitch: -0.05 + 0.1 * Math.sin(t * 2.1) })); p.userData.pose(standPose(FLAMINGO, { t, sway: 1, pitch: -0.4 }));
    L.sun.userData.aim(V(0, 0.2, 0), 4); const k = seg(t, C.their, C.the); shoot(s.cam, V(0.55 - 0.08 * k, 0.24, 0.8 - 0.1 * k), V(-0.03, 0.22, 0), { fov: 32, t, hand: 0.15, focus: 0.95 - 0.12 * k }); };
});
// 2) The pink comes from their food: — feeding, head upside down in the water
shot(C.the, C.tiny, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: -0.35 }), F = lagoonFlock(sc, FLOCK1); s.ap = 6; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); F.forEach(u => u(t)); f.userData.pose(feedPose(t)); L.sun.userData.aim(V(0.2, 0.4, 0)); const k = seg(t, C.the, C.tiny);
    shoot(s.cam, V(1.25 - 0.15 * k, 0.32, 1.05 - 0.1 * k), V(0.2, 0.36, 0), { fov: 32, t, hand: 0.2 }); };
});
// 3) tiny shrimp and algae — under the surface: brine shrimp swimming among algae
shot(C.tiny, C.orangered, (s) => {
  const sc = s.scene; underwater(sc); const A = algae(sc, 420, [0.08, 0.05, 0.06], V(0, 0, -0.01)); const SH = []; s.ap = 14; s.exposure = 1.05; s.bloom = 0.25; s.maxR = 18;
  for (let i = 0; i < 7; i++) { const b = brineShrimp(i + 1); b.position.set(-0.03 + i * 0.011, (i % 3 - 1) * 0.007, -0.012 * (i % 4)); b.rotation.set(0.3 * (i % 2), 0.4 * i, 0.2); sc.add(b); SH.push(b); }
  s.update = (t) => { A.userData.tick(t); SH.forEach((b, i) => { b.userData.swim(t + i); b.position.x += 0; b.position.y = (i % 3 - 1) * 0.007 + 0.002 * Math.sin(t * 1.3 + i); }); const k = seg(t, C.tiny, C.orangered);
    shoot(s.cam, V(0.002 + 0.006 * k, 0.003, 0.034 - 0.006 * k), V(0.0, 0.0, -0.006), { fov: 34, t, hand: 0.05, focus: 0.036 - 0.006 * k }); };
});
// 4) full of orange-red pigments called carotenoids, — one shrimp close; its pigment granules light up
shot(C.orangered, C.the2, (s) => {
  const sc = s.scene; underwater(sc); const A = algae(sc, 260, [0.05, 0.03, 0.04], V(0, 0, -0.012), 9); const b = brineShrimp(3); b.rotation.set(0.1, 0.35, 0.05); sc.add(b); s.ap = 12; s.exposure = 1.05; s.bloom = 0.45; s.maxR = 18;
  const lab = liveLabel(0.0048, 0.25); sc.add(lab); lab.userData.set([['CAROTENOIDS', 120, 0.5, '#ffb36b', 900, 3]]);
  s.update = (t) => { A.userData.tick(t); b.userData.swim(t); b.userData.glow(smooth(C.pigments - 0.1, C.pigments + 0.5, t)); const k = seg(t, C.orangered, C.the2);
    shoot(s.cam, V(-0.005 + 0.003 * k, 0.004, 0.03 - 0.005 * k), V(-0.0052, -0.0004, 0.0), { fov: 30, t, hand: 0.04, focus: 0.031 - 0.005 * k });
    pin(s.cam, lab, 0, 0.0021, 0.02); lab.scale.setScalar(Math.max(1e-4, spring(t, C.carotenoids - 0.05, 2, 6))); };
});
// 5) the same kind that make carrots orange. — carrots on a cutting board, a pink feather beside them
shot(C.the2, C.a, (s) => {
  const sc = s.scene, K = kitchen(sc); s.ap = 7; s.exposure = 1.0; s.bloom = 0.15;
  const cs = [[0.0, 0.03, 0.02, 0.15, 1], [-0.02, 0.031, -0.03, 0.4, 2], [0.03, 0.033, 0.06, -0.2, 3]].map(([x, y, z, ry, sd]) => { const c = carrot(0.16 + sd * 0.01, 0.016, sd); c.position.set(x, y + 0.0, z); c.rotation.y = ry; sc.add(c); return c; });
  const fe = pinkFeather(); fe.rotation.set(-Math.PI / 2 + 0.05, 0, 0.6); fe.position.set(0.02, 0.03, -0.09); sc.add(fe);
  s.update = (t) => { const k = seg(t, C.the2, C.a); shoot(s.cam, V(0.22 - 0.05 * k, 0.34 - 0.04 * k, 0.32 - 0.05 * k), V(0.0, 0.03, -0.02), { fov: 34, t, hand: 0.12 }); };
});
// 6) A flamingo's body pulls out those pigments — a young grey flamingo blushes pink over time
shot(C.a, C.and3, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.9, pink: 0 }), F = lagoonFlock(sc, FLOCK1.slice(1)); s.ap = 5; s.exposure = 1.0; s.bloom = 0.22;
  s.update = (t) => { L.tick(t); F.forEach(u => u(t)); const k = smooth(C.a + 0.3, C.and3 - 0.1, t); f.userData.setPink(k); f.userData.pose(standPose(FLAMINGO, { t, sway: 1, yaw: 0.2 * Math.sin(t * 0.7) }));
    L.sun.userData.aim(V(0, 0.7, 0)); shoot(s.cam, V(1.2, 0.75, 2.0), V(0.0, 0.8, 0), { fov: 34, t, hand: 0.2 }); };
});
// 7-9) and packs them into its growing feathers, legs and beak — the pink spreads through new feathers, then the legs, then the beak
shot(C.and3, C.legs - 0.08, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.2, pink: 0.25 }); s.ap = 9; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); const w = lerp(0.15, 0.85, smooth(C.and3, C.legs - 0.2, t)); f.userData.setPink((u) => 0.25 + 0.75 * smooth(w - 0.12, w, 1 - u), 0.25, 0.25); f.userData.pose(standPose(FLAMINGO, { t, sway: 1 }));
    L.sun.userData.aim(V(0, 0.8, 0)); const k = seg(t, C.and3, C.legs); shoot(s.cam, V(0.55 - 0.08 * k, 0.86, 0.5), V(0.05, 0.82 + 0.03 * k, 0.04), { fov: 30, t, hand: 0.1 }); };
});
shot(C.legs - 0.08, C.beak - 0.08, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.2, pink: 1 }); s.ap = 8; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); const k = smooth(C.legs - 0.05, C.beak - 0.2, t); f.userData.setPink(1, 0.25 + 0.75 * k, 0.25); f.userData.pose(standPose(FLAMINGO, { t, sway: 1 }));
    L.sun.userData.aim(V(0, 0.4, 0)); shoot(s.cam, V(0.42, 0.3, 0.55), V(0.03, 0.34, 0.0), { fov: 30, t, hand: 0.1 }); };
});
shot(C.beak - 0.08, C.take, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.2, pink: 1 }); s.ap = 10; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); const k = smooth(C.beak - 0.1, C.take - 0.02, t); f.userData.setPink(1, 1, 0.25 + 0.75 * k); f.userData.pose(standPose(FLAMINGO, { t, sway: 0.5 }));
    L.sun.userData.aim(V(0, 1.2, 0)); const h = headW(f), tg = side(f, h, 0, -0.04, 0.05); shoot(s.cam, side(f, h, 0.42, -0.02, 0.06), tg, { fov: 26, t, hand: 0.08 }); };
});
// 10) Take them away, and new feathers grow in pale. — the same bird washes out to a pale, almost white pink
shot(C.take, C.thats, (s) => {
  const sc = s.scene, L = lagoon(sc, { sun: 1.6 }), f = flamingo(sc, { heading: -0.5 }), F = lagoonFlock(sc, FLOCK1.slice(2)); s.ap = 5; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); F.forEach(u => u(t)); f.userData.setPink(1 + smooth(C.away, C.pale + 0.4, t)); f.userData.pose(standPose(FLAMINGO, { t, sway: 1, pitch: -0.25 }));
    L.sun.userData.aim(V(0, 0.7, 0)); const k = seg(t, C.take, C.thats); shoot(s.cam, V(-1.0 + 0.2 * k, 0.7, 2.0), V(0.0, 0.78, 0), { fov: 32, t, hand: 0.2 }); };
});
// 11) That's why zoos add pigment to their food. — a scoop of pink pellets poured into a zoo pond
shot(C.thats, C.and6, (s) => {
  const sc = s.scene, L = lagoon(sc, { shadowBox: 1.0 }); const rim = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 0.4), pbrMat(TX.concrete, { rep: [6, 1], color: 0xbab3a8 })); rim.position.set(0, 0.1, 0.55); rim.receiveShadow = rim.castShadow = true; sc.add(rim);
  const bucket = model('wooden_bucket_01'); bucket.scale.setScalar(0.45); sc.add(bucket); const pe = pellets(sc, 180, V(0.0, 0.40, 0.40));
  const fa = flamingo(sc, { at: V(-0.25, 0, -0.35), heading: -1.2 }), fb = flamingo(sc, { at: V(0.45, 0, -0.55), heading: 2.2 }); s.ap = 7; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); const a = t - (C.zoos + 0.1); bucket.position.set(0.0, 0.30, 0.58); bucket.rotation.set(-lerp(0.2, 1.7, smooth(-0.4, 0.3, a)), 0, 0); pe.userData.tick(a);
    fa.userData.pose(standPose(FLAMINGO, { t, sway: 1, pitch: -0.5 - 0.3 * smooth(0.5, 1.5, a) })); fb.userData.pose(a > 0.8 ? feedPose(t) : standPose(FLAMINGO, { t, sway: 1, pitch: -0.4 }));
    L.sun.userData.aim(V(0, 0.4, 0)); shoot(s.cam, V(0.62, 0.36, 0.95), V(-0.02, 0.2, 0.4), { fov: 36, t, hand: 0.2, focus: 0.75 }); };
});
// 12) And in mating season, — a group display: a tight flock marching, heads up, flagging side to side
shot(C.and6, C.flamingos3, (s) => {
  const sc = s.scene, L = lagoon(sc, { shadowBox: 2.2 }); const G = []; for (let i = 0; i < 7; i++) { const b = flamingo(sc, { at: V(-0.9 + (i % 4) * 0.42 + (i > 3 ? 0.2 : 0), 0, (i > 3 ? -0.5 : 0) + (i % 2) * 0.1), heading: 0.05, lod: i ? LODB : null }); G.push(b); }
  s.ap = 4; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); G.forEach((b, i) => { const P = gait(t * 0.9 + i * 0.13, { v: 0.32, Ts: 0.42, duty: 0.6, lead: 0.2, thrustFrac: 1, headY: 1.36, look: 0.7 * Math.sin(t * 5 + i * 1.7), pitch: 0.15 }, FLAMINGO); P.body.y = FLAMINGO.bodyHeight + 0.01 * Math.sin(t * 7 + i); P.neckDir = V(0.1, 1, 0); b.userData.pose(P); });
    L.sun.userData.aim(V(0.3, 0.8, 0), 9); const cx = 0.32 * 0.9 * t; shoot(s.cam, V(cx + 0.6, 0.6, 3.6), V(cx + 0.2, 0.95, -0.2), { fov: 32, t, hand: 0.25 }); };
});
// 13) flamingos even wear makeup, — close on a face
shot(C.flamingos3, C.rubbing, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.4 }); s.ap = 10; s.exposure = 1.0; s.bloom = 0.25;
  s.update = (t) => { L.tick(t); f.userData.pose(standPose(FLAMINGO, { t, sway: 0.5, yaw: 0.25 * Math.sin(t * 0.8) - 0.2, pitch: -0.05 })); L.sun.userData.aim(V(0, 1.2, 0));
    const h = headW(f), k = seg(t, C.flamingos3, C.rubbing), tg = side(f, h, 0, -0.06, 0.03); shoot(s.cam, side(f, h, 0.40 - 0.06 * k, -0.03, 0.18), tg, { fov: 28, t, hand: 0.08 }); };
});
// 14) rubbing pink oil from a gland near their tail — the head swings back to the base of the tail and rubs
shot(C.rubbing, C.all, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.0 }); s.ap = 8; s.exposure = 1.0; s.bloom = 0.25;
  s.update = (t) => { L.tick(t); const ph = lerp(0.0, 0.5, smooth(C.rubbing - 0.2, C.gland, t)), P = smooth(C.rubbing - 0.3, C.rubbing + 0.5, t);
    const st = standPose(FLAMINGO, { t, sway: 0.5 }), pr = preenPose(t, ph); for (const key of ['x', 'y', 'z', 'pitch', 'yaw', 'roll']) pr.head[key] = lerp(st.head[key], pr.head[key], P); f.userData.pose(pr);
    L.sun.userData.aim(V(-0.1, 0.9, 0)); const k = seg(t, C.rubbing, C.all); shoot(s.cam, V(-0.1 - 0.05 * k, 1.05, 0.95), V(-0.12, 0.92, 0.0), { fov: 30, t, hand: 0.1 }); };
});
// 15) all over their feathers. — rubbing the oil into the neck and breast, which glisten
shot(C.all, C.so, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.0 }); s.ap = 8; s.exposure = 1.0; s.bloom = 0.25;
  s.update = (t) => { L.tick(t); f.userData.pose(preenPose(t, lerp(0.5, 1.0, smooth(C.all - 0.1, C.feathers3 + 0.3, t)))); const m = f.userData.skin.material; m.clearcoat = 0.5 * smooth(C.all, C.so, t); m.clearcoatRoughness = 0.35;
    L.sun.userData.aim(V(0.1, 0.9, 0)); const k = seg(t, C.all, C.so); shoot(s.cam, V(0.75, 0.95, 0.85), V(0.12, 0.88, 0.02), { fov: 30, t, hand: 0.1 }); };
});
// 16) So that pink isn't really theirs at all, because… — back to the lagoon (loop)
shot(C.so, END, (s) => { const up = hookScene(s); s.update = (t) => up(t - END, t); });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
