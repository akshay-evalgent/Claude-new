// =====================================================================
// SHOTS (13). The first and last shots share the loop frame: the mosquito has just landed on the forearm.
// The last shot pushes in from the table to that frame; the first carries on as she starts to bite.
// =====================================================================
const END = C.end, LX = 2.0, HH = 0.12;
// the park, the table, the forearm and the landing spot (shared by every park shot)
function hookSet(s, { plants = true, sky = true, nHair = 3000, hero = true, showArm = true } = {}) {
  const sc = s.scene, P = park(sc, { plants, sky }); const sunH = V(P.sd.x, 0, P.sd.z).normalize(), A = sunH.clone().applyAxisAngle(V(0, 1, 0), Math.PI / 2 + 0.55);
  const arm = forearm({ clear: [[LX, 0, 0.22]], nHair }); arm.position.set(-8, TOP + 2.85 - 0.25, 7); arm.rotation.y = Math.atan2(-A.z, A.x); sc.add(arm); arm.visible = showArm;
  let mq = null; if (hero) { mq = makeMosquito(); arm.add(mq); }
  arm.updateMatrixWorld(true); const top = arm.userData.surfY(LX, 0), Lw = arm.localToWorld(V(LX, top, 0));
  const surfFor = (H) => (x, z) => arm.userData.surfY(LX + x, z) - (top + H);
  P.sunL.userData.aim(Lw, 3, 60); const side = sunH.clone().cross(V(0, 1, 0)).normalize();
  return { sc, P, arm, mq, sunH, A, Lw, top, surfFor, side, AL: (v) => arm.localToWorld(v.clone()) };
}
// the hero's landing and bite, in seconds from the loop point (negative = still flying in)
function heroPose(h, tau, { fill = null, probe = null, ghost = 0, eggs = 0 } = {}) {
  const land = smooth(-1.15, -0.42, tau), k = 1 - land;
  const off = V(-0.9 * k ** 1.2 + 0.05 * Math.sin(tau * 6) * k, HH + 0.75 * k ** 1.4 + 0.03 * Math.sin(tau * 9) * k, 0.4 * k ** 1.3);
  h.mq.position.set(LX, h.top, 0).add(off); h.mq.rotation.set(0, 0.25 * k + 0.03 * Math.sin(tau * 3) * land, 0.12 * k);
  const pr = probe ?? smooth(0.55, 1.55, tau), fl = fill ?? 0.3 * smooth(1.3, 2.62, tau);
  h.mq.userData.pose({ t: tau + 50, fly: k > 0.02 ? clamp(k * 1.6) : 0, flap: k > 0.01 ? 1 : 0, hang: k, probe: pr, fill: fl, surf: h.surfFor(HH + (h.mq.position.y - h.top - HH)), H: HH, fidget: land, ghost, eggs, biteX: 0.21 });
}
const HOOK = (h) => ({ p: h.Lw.clone().addScaledVector(h.sunH, -2.3).addScaledVector(h.side, 0.45).add(V(0, 0.38, 0)), t: h.Lw.clone().add(V(0, 0.16, 0)) });
function hookCam(s, h, tau, push = 0) { const H0 = HOOK(h), p = lv(H0.p, H0.t, 0.07 * push); shoot(s.cam, p, H0.t, { fov: 30, t: tau + 100, hand: 0.012, focus: p.distanceTo(h.Lw.clone().add(V(0, 0.12, 0))) }); }
// a text label that always faces the camera, placed in the world
function faceCam(lab, cam, p, sc = 1) { lab.position.copy(p); lab.quaternion.copy(cam.quaternion); lab.scale.setScalar(Math.max(1e-4, sc)); }
// "CO2" with a proper subscript
function co2Label(w = 1) { const [c, g] = mkCanvas(512, 256); g.font = '900 170px "Nunito", Arial, sans-serif'; g.textBaseline = 'alphabetic'; g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 22; g.fillStyle = '#ffffff'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(0,20,40,0.5)';
  const wCO = g.measureText('CO').width; g.font = '900 170px "Nunito", Arial, sans-serif'; const x0 = (512 - wCO - 70) / 2; g.lineWidth = 15; g.strokeText('CO', x0, 180); g.fillText('CO', x0, 180); g.font = '900 100px "Nunito", Arial, sans-serif'; g.lineWidth = 9; g.strokeText('2', x0 + wCO + 6, 215); g.fillText('2', x0 + wCO + 6, 215);
  const tx = texOf(c), m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); m.renderOrder = 20; m.userData.dofMap = tx; return m; }

// 0) Some people really are mosquito magnets. — she has just landed on a forearm at dusk and starts to bite
// two more mosquitoes circle the table (the same flight in the first and last shots, so the loop matches)
function circlers(sc) { const o = [makeMosquito({ seed: 3 }), makeMosquito({ seed: 4 })]; o.forEach(m => sc.add(m)); return o; }
function circle(others, h, t) { others.forEach((o, i) => { const a = t * (0.9 + i * 0.4) + i * 2; o.position.copy(h.Lw).add(V(Math.cos(a) * (9 + i * 6), 4 + i * 3 + Math.sin(a * 1.7) * 2, Math.sin(a) * (9 + i * 6))); o.rotation.y = -a - Math.PI / 2; o.userData.pose({ t: t + i, fly: 1, flap: 1 }); }); }
shot(0, C.only, (s) => { const h = hookSet(s); s.ap = 24; s.maxR = 18; s.exposure = 1.0; s.bloom = 0.3; const others = circlers(s.scene);
  s.update = (t) => { heroPose(h, t); hookCam(s, h, t, seg(t, 0, C.only)); circle(others, h, t + END); }; });

// 1) Only females bite. — a female and a male hover side by side; only she has the biting mouthparts
shot(C.only, C.they, (s) => { const h = hookSet(s, { hero: false, showArm: false, nHair: 10 }); s.ap = 20; s.maxR = 18; s.exposure = 1.0; s.bloom = 0.32; const sc = s.scene;
  const fem = makeMosquito(), mal = makeMosquito({ male: true, seed: 5 }); sc.add(fem, mal); const Q = h.Lw.clone().add(V(0, 7, 0)).addScaledVector(h.A, 3);
  const lf = liveLabel(0.85, 0.3), lm = liveLabel(0.85, 0.3); OV(s, lf, lm); lf.userData.set([['FEMALE', 150, 0.36, '#ffffff', 900, 2], ['bites', 110, 0.78, '#ff9a8a', 800, 2]]); lm.userData.set([['MALE', 150, 0.36, '#ffffff', 900, 2], ['sips nectar', 110, 0.78, '#c8f0a0', 800, 2]]);
  const fdir = h.side.clone().multiplyScalar(Math.cos(0.5)).addScaledVector(h.sunH, -Math.sin(0.5)); const yaw0 = Math.atan2(-fdir.z, fdir.x);
  s.update = (t) => { const yaw = yaw0;
    const pf = Q.clone().add(V(0, 0.42 + 0.03 * Math.sin(t * 2.3), 0)).addScaledVector(h.side, -0.12 + 0.02 * Math.sin(t * 1.7)), pm = Q.clone().add(V(0, -0.5 + 0.03 * Math.sin(t * 2.0 + 1), 0)).addScaledVector(h.side, 0.18 + 0.15 * smooth(C.bite, C.they, t)).addScaledVector(h.sunH, 0.4 * smooth(C.bite + 0.2, C.they, t));
    fem.position.copy(pf); mal.position.copy(pm); fem.rotation.set(0, yaw, 0.05); mal.rotation.set(0, yaw - 0.25, 0.05);
    fem.userData.pose({ t: t + 3, fly: 1, flap: 1 }); mal.userData.pose({ t: t + 7, fly: 1, flap: 1 });
    const cp = Q.clone().addScaledVector(h.sunH, -4.6).addScaledVector(h.side, 0.5).add(V(0, 0.15, 0)), ct = Q.clone();
    shoot(s.cam, cp, ct, { fov: 30, t, hand: 0.015, focus: cp.distanceTo(Q) });
    faceCam(lf, s.cam, pf.clone().add(V(0, -0.36, 0)).addScaledVector(h.side, -0.05), spring(t, C.females - 0.1, 2, 6)); faceCam(lm, s.cam, pm.clone().add(V(0, -0.4, 0)).addScaledVector(h.side, 0.05), spring(t, C.females + 0.05, 2, 6)); }; });

// 2) They need blood to make eggs. — side-on as she feeds: the abdomen swells red; then x-ray: eggs forming
shot(C.they, C.first, (s) => { const h = hookSet(s); s.ap = 26; s.maxR = 18; s.exposure = 1.0; s.bloom = 0.35;
  s.update = (t) => { const g = smooth(C.eggs - 0.12, C.eggs + 0.05, t); heroPose(h, 3.0 + t - C.they, { probe: 1, fill: lerp(0.32, 1, E.io(seg(t, C.they, C.eggs + 0.2))), ghost: g, eggs: seg(t, C.eggs, C.first - 0.15) });
    const k = seg(t, C.they, C.first), base = h.AL(V(LX - 0.16, h.top + 0.13, 0)); const p = h.AL(V(LX - 0.2 + 0.05 * k, h.top + 0.62, -2.35 + 0.25 * k));
    shoot(s.cam, p, base, { fov: 30, t, hand: 0.01 }); }; });

// 3) First, she follows your breath, the carbon dioxide, — inside the plume, flying upwind, zig-zagging
shot(C.first, C.from, (s) => { const h = hookSet(s, { hero: false, showArm: false, nHair: 10 }); s.ap = 18; s.maxR = 18; s.exposure = 1.0; s.bloom = 0.35; const sc = s.scene;
  const pl = plume(sc, 700, 700, { bright: 0.9 }); const mq = makeMosquito(); sc.add(mq); const lab = co2Label(0.9); OV(s, lab);
  const sd = V(WIND.z, 0, -WIND.x), mol = molCloud([CO2_GEO], 120); sc.add(mol); const rr_ = rng(33), MD = []; for (let i = 0; i < 120; i++) MD.push({ s0: rr_() * 90, a: rr_() * 6.28, r: 0.6 + Math.sqrt(rr_()) * 5, rot: V(rr_() * 6, rr_() * 6, rr_() * 6), w: V(rr_() - 0.5, rr_() - 0.5, rr_() - 0.5) });
  s.update = (t) => { const u = t - C.first, sm = 240 - 34 * u; const c = plumeAt(sm, t), zig = Math.sin(u * 2.4) * 5.5, bob = Math.sin(u * 1.7) * 1.6;
    const M = c.clone().addScaledVector(sd, zig).add(V(0, bob, 0)), Mn = plumeAt(sm - 1, t).addScaledVector(sd, Math.sin((u + 0.03) * 2.4) * 5.5); const dir = Mn.sub(M).setY(0).normalize();
    mq.position.copy(M); mq.rotation.set(0, Math.atan2(-dir.z, dir.x), 0.1); mq.userData.pose({ t, fly: 1, flap: 1 });
    const cp = M.clone().addScaledVector(dir, -5.2).addScaledVector(sd, 2.2).add(V(0, 0.9, 0)), ct = M.clone().addScaledVector(dir, 1.2).add(V(0, 0.15, 0));
    shoot(s.cam, cp, ct, { fov: 32, t, hand: 0.05, focus: cp.distanceTo(M) });
    pl.update(s.cam, t);
    mol.userData.update((i) => { const d = MD[i], ss = sm - 50 + (d.s0 + u * 40) % 90; const c0 = plumeAt(ss, t).addScaledVector(sd, Math.cos(d.a) * d.r + Math.sin(u * 2.4) * 5.5 * 0.6).add(V(0, Math.sin(d.a) * d.r * 0.6, 0)); return { p: c0, s: 0.24, rot: d.rot.clone().addScaledVector(d.w, u * 3) }; });
    pinF(s.cam, lab, 0, 0.62, 3.2, spring(t, C.carbon, 2, 6)); }; }, { near: 0.05, far: 80000 });

// 4) from up to thirty feet away. — from out in the field, 9 m downwind: she hangs in the air; the table glows far off
shot(C.from, C.up2, (s) => { const h = hookSet(s, { hero: false, showArm: false, nHair: 10 }); s.ap = 22; s.maxR = 18; s.exposure = 1.0; s.bloom = 0.4; const sc = s.scene;
  const pl = plume(sc, 900, 1100, { bright: 0.9 }); const mq = makeMosquito(); sc.add(mq); const rg = ring(34); OV(s, rg);
  const lab = liveLabel(0.95, 0.3); OV(s, lab); lab.userData.set([['30 FT · 9 M', 150, 0.5, '#ffffff', 900, 3]]);
  s.update = (t) => { const u = t - C.from, M = plumeAt(914, t).add(V(0, 2 * Math.sin(u * 1.6), 0)); const toT = FACE.clone().sub(M).setY(0).normalize(); mq.position.copy(M); mq.rotation.set(0, Math.atan2(-toT.z, toT.x), 0.08); mq.userData.pose({ t, fly: 1, flap: 1 });
    const cp = M.clone().addScaledVector(toT, -6.0 + 0.8 * u).add(V(0, 1.0, 0)).addScaledVector(V(toT.z, 0, -toT.x), 0.35), ct = FACE.clone().add(V(0, -40, 0));
    shoot(s.cam, cp, ct, { fov: 30, t, hand: 0.05, focus: cp.distanceTo(M) });
    pl.update(s.cam, t, { sRange: [0, 420] });
    { const lp = h.P.flame.position.clone().add(V(0, -6, 0)), cpos = s.cam.position.clone(), dist = lp.distanceTo(cpos), f = s.cam.userData.focus; faceCam(rg, s.cam, cpos.add(lp.sub(cpos).normalize().multiplyScalar(f)), spring(t, C.thirty - 0.1, 2, 6) * f / dist); } pinF(s.cam, lab, 0, 0.42, 3, spring(t, C.thirty, 2, 6)); }; }, { near: 0.05, far: 80000 });

// 5) Up close, she smells your skin. — her head and antennae, hovering over the skin; scent rising past them
shot(C.up2, C.your3, (s) => { const h = hookSet(s); s.ap = 26; s.maxR = 18; s.exposure = 1.0; s.bloom = 0.35; const sc = s.scene;
  const sc2 = puffs(90); sc.add(sc2); const mol = molCloud(ODOR_GEOS, 10); sc.add(mol); const r = rng(51), D = []; for (let i = 0; i < 90; i++) D.push({ x: (r() - 0.5) * 1.6, z: (r() - 0.5) * 1.2, ph: r(), sz: 0.25 + r() * 0.5 }); const MD = []; for (let i = 0; i < 10; i++) MD.push({ x: (r() - 0.4) * 0.8, z: (r() - 0.5) * 0.6, ph: r(), rot: V(r() * 6, r() * 6, r() * 6) });
  s.update = (t) => { const u = t - C.up2; h.mq.position.set(LX - 0.2 + 0.02 * Math.sin(u * 3), h.top + 0.62 + 0.02 * Math.sin(u * 2.3), 0.05 * Math.sin(u * 1.3)); h.mq.rotation.set(0, 0.05 * Math.sin(u * 1.1), 0.08);
    h.mq.userData.pose({ t: u, fly: 1, flap: 1 }); h.mq.userData.antG.rotation.set(0.05 * Math.sin(u * 7), 0.06 * Math.sin(u * 5.3), 0.05 * Math.sin(u * 6.1));
    const head = h.mq.userData.head.getWorldPosition(new THREE.Vector3()), ahead = h.AL(V(LX + 0.5, h.top + 0.55, 0));
    const cp = h.AL(V(LX + 0.62 - 0.08 * seg(t, C.up2, C.your3), h.top + 0.72, -0.62)); shoot(s.cam, cp, lv(head, ahead, 0.25), { fov: 30, t, hand: 0.01, focus: cp.distanceTo(head) });
    sc2.userData.update(s.cam, (i) => { const d = D[i], a = ((u * 0.35 + d.ph) % 1), p = h.AL(V(LX - 0.2 + d.x + a * 0.25, h.top + 0.05 + a * 1.2, d.z * (1 - 0.5 * a))); const k = 0.09 * Math.sin(Math.PI * a) * smooth(C.up2, C.close, t);
      return { p, s: d.sz * (0.6 + a), c: new THREE.Color(1.0 * k, 0.62 * k, 0.4 * k) }; });
    mol.userData.update((i) => { const d = MD[i], a = ((u * 0.3 + d.ph) % 1); if (t < C.smells - 0.2) return null; return { p: h.AL(V(LX + d.x, h.top + 0.1 + a * 0.9, d.z)), s: 0.007, rot: d.rot.clone().addScalar(u * 1.5), kind: i }; }); }; });

// 6) Your skin makes oils, — the skin surface magnified: flakes, a hair, oil welling up from its follicle
shot(C.your3, C.and, (s) => { const sc = s.scene; microLight(sc); microSkin(sc); s.ap = 10; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.3;
  const pool = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), SEBUM_M()); sc.add(pool); const drops = []; const r = rng(61); for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), SEBUM_M()); sc.add(d); drops.push({ d, a: -0.4 + r() * 2.6, sp: 0.6 + r() * 0.5, sz: 6 + r() * 9, t0: r() * 0.7 }); }
  s.update = (t) => { const u = t - C.your3, k = smooth(0, 1.0, u); pool.position.set(0, -14 + 10 * k, 0); pool.scale.set(22 + 34 * k, 6 + 8 * k, 22 + 30 * k);
    drops.forEach(D => { const a = clamp((u - D.t0) / 1.2), rr = 30 + 55 * a * D.sp, x = Math.cos(D.a) * rr, z = Math.sin(D.a) * rr, sz = D.sz * smooth(0, 0.2, a); D.d.position.set(x, skinHeight(x, z) + sz * 0.45, z); D.d.scale.set(sz, sz * 0.75, sz); D.d.visible = sz > 0.05; });
    const cp = V(-250 + 40 * u, 150 - 18 * u, 230 - 30 * u), ct = V(10, -6, 0); shoot(s.cam, cp, ct, { fov: 30, t, hand: 0.15, focus: cp.distanceTo(V(0, 0, 0)) }); }; }, { near: 0.5, far: 20000 });

// 7) and bacteria turn them into your own personal scent. — closer: bacteria on the flakes, the oil, odour molecules rising
shot(C.and, C.in, (s) => { const sc = s.scene; microLight(sc, { fog: 0.006 }); const CX = 95, CZ = 40; microSkin(sc, { size: 120, seg: 360, cx: CX, cz: CZ, hair: false }); s.ap = 12; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.3;
  const B = bacteria(sc, 80, 44, 9, CX, CZ); const oil = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), SEBUM_M()); sc.add(oil); const oil2 = oil.clone(); sc.add(oil2);
  const mol = molCloud(ODOR_GEOS, 70); sc.add(mol); const r = rng(71), MD = []; for (let i = 0; i < 70; i++) { const src = B.spheres[Math.floor(r() * B.spheres.length)][0]; MD.push({ p: src.clone(), t0: r() * 3, rot: V(r() * 6, r() * 6, r() * 6), w: V(r() - 0.5, r() - 0.5, r() - 0.5), dx: (r() - 0.5) * 3 }); }
  s.update = (t) => { const u = t - C.and; const o1 = 1 - 0.45 * seg(t, C.bacteria, C.in); oil.position.set(CX + 2, skinHeight(CX + 2, CZ - 3) + 1.2 * o1, CZ - 3); oil.scale.set(7 * o1, 2.6 * o1, 6 * o1); oil2.position.set(CX - 9, skinHeight(CX - 9, CZ + 6) + 0.8, CZ + 6); oil2.scale.set(4 * o1, 1.6 * o1, 4.5 * o1);
    mol.userData.update((i) => { const d = MD[i], a = u - d.t0 * 0.8; if (a < 0 || t < C.turn) return null; return { p: d.p.clone().add(V(d.dx * a * 0.5 + Math.sin(a * 2 + i) * 0.6, 0.6 + a * 3.2, Math.cos(a * 1.7 + i) * 0.6)), s: 0.32 * smooth(0, 0.25, a), rot: d.rot.clone().addScaledVector(d.w, a * 3), kind: i }; });
    const k = seg(t, C.and, C.in); const cp = V(CX - 22 + 7 * k, 13 + 8 * E.io(k), CZ + 20 - 5 * k), ct = V(CX + 1, 1.5 + 3 * E.io(k), CZ - 1); shoot(s.cam, cp, ct, { fov: 30, t, hand: 0.02, focus: cp.distanceTo(V(CX, 0, CZ)) }); }; }, { near: 0.02, far: 3000 });

// 8) In one study, people wore nylon stockings on their arms, — a stockinged forearm on a lab bench
function tagCard(text, w = 6) { const [c, g] = mkCanvas(768, 320); g.fillStyle = '#f2efe6'; g.fillRect(0, 0, 768, 320); g.fillStyle = 'rgba(0,0,0,0.05)'; for (let i = 0; i < 400; i++) g.fillRect(Math.random() * 768, Math.random() * 320, 2, 2);
  g.fillStyle = '#20242a'; g.font = '800 120px "Nunito", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 384, 168); g.strokeStyle = '#c84a3a'; g.lineWidth = 6; g.strokeRect(18, 18, 732, 284);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 320 / 768), new THREE.MeshPhysicalMaterial({ map: texOf(c), roughness: 0.75 })); m.rotation.x = -Math.PI / 2; m.receiveShadow = m.castShadow = true; return m; }
shot(C.in, C.and2, (s) => { const sc = s.scene; sc.environment = LAB.env; sc.environmentIntensity = 1.0; sc.background = LAB.tex; sc.backgroundIntensity = 0.85; s.ap = 16; s.maxR = 18; s.exposure = 1.0; s.bloom = 0.3;
  const bench = new THREE.Mesh(new THREE.BoxGeometry(160, 4, 80), new THREE.MeshPhysicalMaterial({ map: woodTex('#6a4a30', '#3a2818', 3, [2, 1], 5), roughness: 0.5, clearcoat: 0.35 })); bench.position.y = -2; bench.receiveShadow = true; sc.add(bench);
  const arm = forearm({ nHair: 3200, span: [-11, 11], flatX: 3.9 }); arm.position.set(0, 2.85 - 0.2, 0); arm.rotation.y = 0.35; sc.add(arm); const sl = nylonSleeve(arm, 22, 4); arm.add(sl);
  const tag = tagCard('SUBJECT 33', 4.6); arm.updateMatrixWorld(true); tag.position.copy(arm.localToWorld(V(1.4, 0, -4.9))); tag.position.y = 0.03; tag.rotation.z = 0.35 + 0.1; sc.add(tag); const set = model('chemistry_set'); set.position.set(-40, 0, -28); set.rotation.y = 0.8; sc.add(set); const cb = model('clipboard'); cb.position.set(14, 0, 14); cb.rotation.y = -0.4; sc.add(cb);
  const key = new THREE.DirectionalLight(0xfff2e6, 1.8); key.position.set(-40, 80, 50); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 10, far: 300 }); key.shadow.bias = -0.0003; key.userData.soft = 1.5; sc.add(key);
  s.update = (t) => { const k = seg(t, C.in, C.and2); arm.updateMatrixWorld(true); const tg = arm.localToWorld(V(3.2 + 0.6 * k, 2.1, -1.4)); const cp = arm.localToWorld(V(5.6 + 1.2 * k, 6.6 - 0.5 * k, -8.2 + 0.8 * k)); shoot(s.cam, cp, tg, { fov: 30, t, hand: 0.05, focus: cp.distanceTo(tg) }); }; }, { near: 0.05, far: 20000 });

// 9) and the mosquitoes picked one person a hundred times more than another. — the two-choice olfactometer
function olfShot(s, { years = false } = {}) { const sc = s.scene; const O = olfactometer(sc); const sw = swarm(sc, 70, 2.4); const r = rng(81), D = [];
  for (let i = 0; i < 70; i++) D.push({ side: i === 68 ? 1 : -1, stay: i === 69, delay: r() * 1.3, rr: [r(), r(), r(), r(), r(), r(), r()] });
  const l1 = liveLabel(24, 0.3), l2 = liveLabel(24, 0.3), big = liveLabel(30, 0.4); OV(s, l1, l2, big); l1.userData.set([['SUBJECT 33', 150, 0.5, '#ffffff', 900, 3]]); l2.userData.set([['SUBJECT 19', 150, 0.5, '#ffffff', 900, 3]]); big.userData.set([['100×', 300, 0.52, '#ff6a5a', 900, 3]]);
  return { O, sw, D, l1, l2, big }; }
shot(C.and2, C.that, (s) => { const X = olfShot(s); s.ap = 8; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.3;
  s.update = (t) => { X.sw.update((i) => { const d = X.D[i], tau = d.stay ? -1 : t - C.mosquitoes - 0.1 - d.delay; return olfPath(tau, d.side, d.rr, i); });
    const k = E.io(seg(t, C.and2, C.that)); const cp = V(96 - 14 * k, 58 - 8 * k, 44 - 6 * k), ct = V(-18 - 6 * k, 9, 0); shoot(s.cam, cp, ct, { fov: 34, t, hand: 0.3, focus: cp.distanceTo(V(-20, 8, 0)) });
    faceCam(X.l1, s.cam, V(-50, 26, 0), spring(t, C.person - 0.1, 2, 6)); faceCam(X.l2, s.cam, V(50, 25, 0), spring(t, C.person + 0.05, 2, 6)); faceCam(X.big, s.cam, V(-50, 33, 0), spring(t, C.hundred, 2.2, 6)); }; }, { near: 0.2, far: 20000 });

// 10) That person's skin made far more of certain acids, — the worn stocking, magnified, backlit; fatty acids drifting off it
shot(C.that, C.and3, (s) => { const sc = s.scene; sc.background = new THREE.Color(0x0b0c10); sc.environment = LAB.env; sc.environmentIntensity = 0.45; sc.fog = new THREE.FogExp2(0x0b0c10, 0.05); s.ap = 14; s.maxR = 16; s.exposure = 1.05; s.bloom = 0.4;
  const fab = new THREE.Mesh(new THREE.PlaneGeometry(9, 9, 90, 90), nylonMat(9 / 0.24, 9 / 0.24)); { const p = fab.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.35 * Math.sin(x * 0.9 + 0.4) * Math.cos(y * 0.6) + 0.12 * Math.sin(y * 2.1 + x)); } fab.geometry.computeVertexNormals(); }
  fab.rotation.x = -Math.PI / 2; fab.userData.dofMap = fab.material.map; sc.add(fab);
  const back = new THREE.DirectionalLight(0xffe2c8, 3.2); back.position.set(0, 6, -10); sc.add(back); const key = new THREE.DirectionalLight(0xfff0e0, 1.2); key.position.set(-6, 8, 5); sc.add(key);
  const mol = molCloud(ACID_GEOS, 120); sc.add(mol); const r = rng(91), MD = []; for (let i = 0; i < 120; i++) MD.push({ p: V((r() - 0.5) * 3.2, 0.15, (r() - 0.5) * 3), t0: r() * 3.4, rot: V(r() * 6, r() * 6, r() * 6), w: V(r() - 0.5, r() - 0.5, r() - 0.5) });
  const lab = liveLabel(0.7, 0.22); OV(s, lab); lab.userData.set([['CARBOXYLIC ACIDS', 96, 0.5, '#ffd27a', 900, 3]]);
  s.update = (t) => { const u = t - C.that; mol.userData.update((i) => { const d = MD[i], a = u + 2.2 - d.t0; if (a < 0) return null; return { p: d.p.clone().add(V(Math.sin(a * 0.8 + i) * 0.1, a * 0.38, a * 0.16)), s: 0.0095 * smooth(0, 0.3, a), rot: d.rot.clone().addScaledVector(d.w, a * 1.6), kind: i }; });
    const k = seg(t, C.that, C.and3); const cp = V(-0.3 + 0.5 * k, 1.5 + 0.35 * k, 2.4 - 0.25 * k), ct = V(0, 0.45 + 0.25 * k, 0); shoot(s.cam, cp, ct, { fov: 30, t, hand: 0.02, focus: cp.distanceTo(V(0, 0.55, 0.4)) }); pinF(s.cam, lab, 0, 0.12, 2.6, spring(t, C.acids - 0.05, 2, 6)); }; }, { near: 0.02, far: 2000 });

// 11) and it stayed that way for years. — the same test, run again and again: day, night, year after year
shot(C.and3, C.so, (s) => { const X = olfShot(s); s.ap = 7; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.3; const sc = s.scene; const lab = liveLabel(1, 0.26); OV(s, lab); X.l1.visible = X.l2.visible = X.big.visible = false;
  s.update = (t) => { const yrs = 3, a = seg(t, C.and3 + 0.15, C.so - 0.1) * yrs, yr = Math.min(yrs - 1, Math.floor(a)), f = a - yr;
    const day = 0.5 + 0.5 * Math.cos(a * 2 * Math.PI * 2); sc.environmentIntensity = lerp(0.35, 1.0, day); sc.backgroundIntensity = lerp(0.18, 0.85, day); X.O.key.intensity = lerp(0.3, 1.7, day); X.O.key.color.setRGB(lerp(0.6, 1, day), lerp(0.7, 0.96, day), 1);
    X.sw.update((i) => { const d = X.D[i]; const tau = d.stay ? -1 : f * 3.2 - 0.2 - d.delay * 0.6; return olfPath(tau, d.side, d.rr, i + yr * 7); });
    lab.userData.set([[`YEAR ${yr + 1}`, 150, 0.5, '#ffffff', 900, 3]]);
    const k = seg(t, C.and3, C.so); const cp = V(-95 + 20 * k, 58 - 6 * k, 98 - 10 * k), ct = V(-10 - 8 * k, 6, 0); shoot(s.cam, cp, ct, { fov: 34, t, hand: 0.3, focus: cp.distanceTo(V(-30, 9, 0)) }); pinF(s.cam, lab, 0, 0.2, 2.6, spring(t, C.and3 + 0.1, 2, 6)); }; }, { near: 0.2, far: 20000 });

// 12) So if you always get bitten first, it's not bad luck. It's because — back at the table; she flies in and lands (the loop)
shot(C.so, END + 1, (s) => { const h = hookSet(s); s.ap = 24; s.maxR = 18; s.exposure = 1.0; s.bloom = 0.3; const sc = s.scene;
  const others = circlers(sc);
  s.update = (t) => { const tau = t - END; heroPose(h, tau); const H0 = HOOK(h);
    const k = E.io(seg(t, C.so, END - 0.3)), v1 = H0.p.clone().sub(h.Lw), v0 = h.Lw.clone().addScaledVector(h.sunH, -15).addScaledVector(h.side, 6).add(V(0, 6.5, 0)).sub(h.Lw);
    const len = Math.pow(v0.length(), 1 - k) * Math.pow(v1.length(), k), dir = lv(v0.clone().normalize(), v1.clone().normalize(), k).normalize(); const cp = h.Lw.clone().add(dir.multiplyScalar(len)), ct = lv(h.Lw.clone().add(V(0, 1.5, 0)), H0.t, k);
    shoot(s.cam, cp, ct, { fov: 30, t: k > 0.999 ? tau + 100 : lerp(t, tau + 100, k), hand: lerp(0.3, 0.012, k), focus: cp.distanceTo(h.mq.getWorldPosition(new THREE.Vector3())) });
    s.ap = lerp(14, 24, k);
    circle(others, h, t); }; });
