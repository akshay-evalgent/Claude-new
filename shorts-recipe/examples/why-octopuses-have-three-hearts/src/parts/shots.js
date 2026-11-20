// =====================================================================
// SHOTS (11). The first and last shots share one camera path and the octopus's resting pose (the loop frame).
// =====================================================================
const END = C.end;
const HOOK_P = V(0.40, 0.11, 0.34), HOOK_T = V(-0.01, 0.06, 0.0);
const restP = (t) => ({ t, lift: 0.016, spread: 1, curl: 0.7, wave: 0.6, look: 0.4 });
function hookScene(s, extra = false) {
  const sc = s.scene, B = seabed(sc), oc = makeOctopus(); oc.rotation.y = 0.75; sc.add(oc); s.ap = 7; s.exposure = 1.05; s.bloom = 0.2; s.maxR = 14;
  let o2 = null; if (extra) { o2 = makeOctopus(); o2.scale.setScalar(0.8); sc.add(o2); }
  return { B, oc, o2, cam: (tau, t) => { B.tick(t); const k = E.io(seg(tau, -3.6, -0.3)); const p = lv(V(0.75, 0.32, 0.7), HOOK_P, k), tg = lv(V(-0.05, 0.05, -0.1), HOOK_T, k);
    shoot(s.cam, p, tg, { fov: lerp(34, 30, k), t: tau + 100, hand: 0.15, focus: p.distanceTo(V(0, 0.06, 0)) }); } };
}
// 0) An octopus has three hearts,
shot(0, C.three, (s) => { const H = hookScene(s); s.update = (t) => { H.oc.userData.pose(restP(t + 40)); H.cam(t, t); }; });
// x-ray version of the same octopus
function xrayOcto(sc) { const oc = makeOctopus(); const G = GHOST(); oc.traverse(m => { if (m.isMesh && m.material !== undefined && !m.isInstancedMesh) { if (m.parent === oc && !m.userData.keep) m.material = G; } if (m.isInstancedMesh) m.visible = false; });
  oc.userData.eyes.forEach(({ e }) => e.traverse(m => { if (m.isMesh) m.visible = true; })); const X = octoXray(oc); return { oc, X }; }
function xraySea(sc) { sc.background = new THREE.Color(0x061318); sc.fog = new THREE.FogExp2(0x061318, 2.5); sc.environment = STUDIO.env; sc.environmentIntensity = 0.4; const key = new THREE.DirectionalLight(0xd8f4ff, 1.4); key.position.set(0.3, 1, 0.5); sc.add(key); }
// 1) ...three hearts, and blue blood. — the body turns to glass: three hearts beat inside, blue blood flows
shot(C.three, C.two, (s) => { const sc = s.scene; xraySea(sc); const { oc, X } = xrayOcto(sc); oc.rotation.y = 0.75; sc.add(oc); s.ap = 5; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => { oc.userData.pose(restP(t + 40)); X.userData.update(t, { flow: smooth(C.blue - 0.2, C.blood, t) }); const k = seg(t, C.three, C.two); shoot(s.cam, lv(HOOK_P, V(0.18, 0.15, 0.3), E.io(k)), lv(HOOK_T, V(-0.05, 0.09, 0), E.io(k)), { fov: 30, t, hand: 0.1 }); }; });
// 2) Two of the hearts sit by the gills, pumping blood through them to pick up oxygen. — close on the gills: pale blood goes in, blue comes out
shot(C.two, C.the3, (s) => { const sc = s.scene; xraySea(sc); const { oc, X } = xrayOcto(sc); oc.rotation.y = 0.0; sc.add(oc); s.ap = 6; s.exposure = 1.05; s.bloom = 0.45; const lab = liveLabel(0.05, 0.3); sc.add(lab); lab.userData.set([['OXYGEN', 150, 0.5, '#8fd0ff', 900, 3]]);
  s.update = (t) => { oc.userData.pose(restP(t + 40)); X.userData.update(t, { beat: 1, sysBeat: 0.3 }); const k = seg(t, C.two, C.the3), hp = new THREE.Vector3(); X.userData.sys.getWorldPosition(hp); shoot(s.cam, hp.clone().add(V(0.03 - 0.02 * k, 0.05, 0.17 - 0.03 * k)), hp.clone().add(V(-0.01, 0, 0)), { fov: 30, t, hand: 0.06 });
    pin(s.cam, lab, 0, 0.032, 0.2); lab.scale.setScalar(Math.max(1e-4, spring(t, C.oxygen - 0.05, 2, 6))); }; });
// 3) The third, the biggest, sends it around the body. — the big heart pumps; blue blood runs out to the head and arms
shot(C.the3, C.and2, (s) => { const sc = s.scene; xraySea(sc); const { oc, X } = xrayOcto(sc); oc.rotation.y = 0.3; sc.add(oc); s.ap = 5; s.exposure = 1.05; s.bloom = 0.45;
  s.update = (t) => { oc.userData.pose(restP(t + 40)); X.userData.update(t, { beat: 0.4, sysBeat: 1.4, flow: 1.3 }); const k = seg(t, C.the3, C.and2); shoot(s.cam, V(0.28 - 0.05 * k, 0.2, 0.26 - 0.04 * k), V(-0.03, 0.07, 0), { fov: 30, t, hand: 0.06 }); }; });
// 4) And that blood is blue because it carries oxygen on copper, not iron like ours. — two test tubes: copper-blue, iron-red
shot(C.and2, C.but, (s) => { const sc = s.scene; const T = bloodTubes(sc); s.ap = 6; s.exposure = 1.0; s.bloom = 0.3; const lc = liveLabel(0.06, 0.3), li = liveLabel(0.06, 0.3); sc.add(lc, li); lc.userData.set([['COPPER', 150, 0.5, '#7fb8ff', 900, 3]]); li.userData.set([['IRON', 150, 0.5, '#ff8a80', 900, 3]]);
  s.update = (t) => { const k = seg(t, C.and2, C.but); shoot(s.cam, V(0.03 - 0.03 * k, 0.16, 0.74 - 0.08 * k), V(0.0, 0.1, 0.0), { fov: 26, t, hand: 0.08, focus: 0.73 - 0.08 * k });
    lc.position.set(-0.04, 0.215, 0.01); li.position.set(0.04, 0.215, 0.01); [lc, li].forEach(l => l.quaternion.copy(s.cam.quaternion));
    lc.scale.setScalar(Math.max(1e-4, spring(t, C.copper - 0.05, 2, 6))); li.scale.setScalar(Math.max(1e-4, spring(t, C.iron - 0.05, 2, 6))); }; });
// 5) But here's the catch: — the eye
shot(C.but, C.every, (s) => { const sc = s.scene, B = seabed(sc), oc = makeOctopus(); oc.rotation.y = 1.4; sc.add(oc); s.ap = 10; s.exposure = 1.05; s.bloom = 0.2;
  s.update = (t) => { B.tick(t); oc.userData.pose({ ...restP(t + 40), look: 0.6 }); const e = oc.userData.eyes[1].e, ep = new THREE.Vector3(), dir = new THREE.Vector3(); e.getWorldPosition(ep); e.getWorldDirection(dir); const k = seg(t, C.but, C.every), d = 0.11 - 0.02 * k;
    shoot(s.cam, ep.clone().addScaledVector(dir, d).add(V(0, 0.012, 0)), ep, { fov: 26, t, hand: 0.05, focus: d }); }; });
// 6) every time an octopus jets through the water, — it squeezes its mantle and shoots off, arms streaming behind
const jetX = (t, t0) => { const a = Math.max(0, t - t0); return -0.18 * a - 0.12 * a * a; };
shot(C.every, C.that2, (s) => { const sc = s.scene, B = seabed(sc), oc = makeOctopus(); sc.add(oc); s.ap = 5; s.exposure = 1.05; s.bloom = 0.2;
  s.update = (t) => { B.tick(t); const j = smooth(C.every, C.every + 0.5, t), pulse = 0.5 + 0.5 * Math.sin((t - C.every) * 9); oc.userData.pose({ t: t + 40, lift: lerp(0.016, 0.06, j), jet: j, mantleK: lerp(1, 0.82 + 0.18 * pulse, j), spread: lerp(1, 0.6, j), wave: 0.3 });
    oc.position.set(0.25 + jetX(t, C.every + 0.3), lerp(0, 0.05, j), 0); shoot(s.cam, V(oc.position.x + 0.16, 0.12, 0.5), V(oc.position.x - 0.04, 0.07, 0), { fov: 32, t, hand: 0.2 }); }; });
// 7) that main heart pauses. — x-ray: with each jet, the big heart stops
shot(C.that2, C.thats, (s) => { const sc = s.scene; xraySea(sc); const { oc, X } = xrayOcto(sc); sc.add(oc); s.ap = 5; s.exposure = 1.05; s.bloom = 0.45; const lab = liveLabel(0.06, 0.3); sc.add(lab); lab.userData.set([['PAUSED', 150, 0.5, '#ff8a80', 900, 3]]);
  s.update = (t) => { const pause = smooth(C.pauses - 0.2, C.pauses + 0.1, t); oc.userData.pose({ t: t + 40, lift: 0.05, jet: 1, mantleK: 0.85 + 0.15 * Math.sin(t * 9), spread: 0.6, wave: 0.3 }); X.userData.update(t, { beat: 1, sysBeat: 1 - pause, flow: 1 - 0.85 * pause });
    shoot(s.cam, V(-0.05, 0.16, 0.26), V(-0.08, 0.06, 0), { fov: 30, t, hand: 0.06 }); pin(s.cam, lab, 0, 0.03, 0.2); lab.scale.setScalar(Math.max(1e-4, spring(t, C.pauses - 0.05, 2, 6))); }; });
// 8) That's why they'd rather crawl than swim. — crawling over the sand
shot(C.thats, C.swimming, (s) => { const sc = s.scene, B = seabed(sc), oc = makeOctopus(); sc.add(oc); s.ap = 6; s.exposure = 1.05; s.bloom = 0.2;
  s.update = (t) => { B.tick(t); oc.userData.pose({ t: (t + 40) * 1.6, lift: 0.024 + 0.006 * Math.sin(t * 3.2), spread: 0.95, curl: 0.3, wave: 1.6 }); oc.position.set(-0.2 + 0.06 * (t - C.thats), 0, 0.05); oc.rotation.y = 0.0;
    shoot(s.cam, V(oc.position.x + 0.36, 0.09, 0.33), V(oc.position.x, 0.05, 0.0), { fov: 30, t, hand: 0.15 }); }; });
// 9) Swimming wears them out fast. — flopped on a rock, arms draped, breathing slowly
shot(C.swimming, C.so, (s) => { const sc = s.scene, B = seabed(sc), oc = makeOctopus(); oc.position.set(-0.1, 0.0, -0.08); oc.rotation.y = 0.9; sc.add(oc); s.ap = 6; s.exposure = 1.05; s.bloom = 0.2;
  s.update = (t) => { B.tick(t); oc.userData.pose({ t: (t + 40) * 0.5, lift: 0.008, spread: 1.15, curl: 0.2, wave: 0.2, mantleK: 0.92 + 0.08 * Math.sin(t * 1.4) }); shoot(s.cam, V(0.22, 0.14, 0.3), V(-0.1, 0.04, -0.08), { fov: 30, t, hand: 0.1 }); }; });
// 10) So next time you see one zooming away, cut it some slack, because… — another octopus jets off behind; back to the resting octopus (loop)
shot(C.so, END, (s) => { const H = hookScene(s, true);
  s.update = (t) => { H.oc.userData.pose(restP(t - END + 40)); const j = smooth(C.zooming - 0.3, C.zooming + 0.1, t), pulse = 0.5 + 0.5 * Math.sin(t * 9);
    H.o2.userData.pose({ t: t + 20, lift: lerp(0.016, 0.06, j), jet: j, mantleK: lerp(1, 0.82 + 0.18 * pulse, j), spread: lerp(1, 0.6, j), wave: 0.3 }); H.o2.position.set(-0.35 + jetX(t, C.zooming), lerp(0, 0.08, j) + 0.25 * Math.max(0, t - C.zooming) ** 2, -0.45); H.o2.rotation.y = 0.4;
    H.cam(t - END, t); }; });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
