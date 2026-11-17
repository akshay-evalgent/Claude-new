// =====================================================================
// SHOTS: "Why Onions Make You Cry"
// =====================================================================
const END = C.end, CHOP = 2.1;   // chops per second (matches the real chopping recording)
const CX = 0.3, CZ = -0.08;                         // where you stand at the counter
const BOARD = V(0.3, TOP + 0.07, -1.0);
// you chopping an onion: the half onion on the board, the knife chopping, pieces piling up; tears (k)
function cookScene(s, { golden = false } = {}) {
  const sc = s.scene; const R = kitchen(sc); const O = person(sc, COOK); const kn = knife(); sc.add(kn); const half = onionHalf(0.27); if (golden) half.children[0].material.color.set(0xffe6a0); sc.add(half);
  const n = 26, pieces = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 12, 1, false, 0, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0xf6eed8, roughness: 0.3, clearcoat: 0.6 }), n); pieces.castShadow = true; pieces.frustumCulled = false; sc.add(pieces);
  const tr = tears(sc, O); const o = new THREE.Object3D();
  const pose = (t, { chop = 1, cry = 0, look = null } = {}) => {
    const u = O.userData; u.reset(); O.rotation.set(0, Math.PI, 0); O.position.set(CX, 0, CZ); u.breathe(t, 0.25, 0.02); const q = O.quaternion;
    half.position.copy(BOARD).add(V(-0.12, 0, 0)); half.rotation.set(0, 0.3, 0);
    // the chop: the blade rises and falls about three times a second
    const ph = ((t * CHOP) % 1 + 1) % 1, lift = chop * (ph < 0.55 ? E.io(ph / 0.55) : 1 - E.in((ph - 0.55) / 0.45)), cutX = BOARD.x + 0.1 + 0.03 * Math.sin(t * 0.7);
    const edge = V(cutX, BOARD.y + 0.02 + 0.32 * lift, BOARD.z - 0.02);
    kn.position.copy(edge).add(V(0, 0, 0.42)); kn.rotation.set(0, Math.PI / 2, 0); kn.rotateZ(-0.12 * lift);
    kn.updateMatrixWorld(true); const grip = kn.localToWorld(V(-0.22, 0.07, 0));
    ik2(O, u.arms[1], grip.clone().add(V(0, 0.02, 0.03)), V(1, -1, 0.3).applyQuaternion(q)); u.hands[1].curl(0.85);
    ik2(O, u.arms[0], half.position.clone().add(V(-0.12, 0.3, 0.02)), V(-1, -1, 0.3).applyQuaternion(q)); u.hands[0].curl(0.55);
    // pieces: one more for every chop
    const chops = Math.floor(t * CHOP + 50) % n;
    for (let i = 0; i < n; i++) { const vis = i <= chops || chop < 0.5; o.position.set(cutX + 0.22 + 0.25 * h3(i, 1, 2), BOARD.y + 0.015 + 0.02 * h3(i, 3, 4), BOARD.z + (h3(i, 5, 6) - 0.5) * 0.35); o.rotation.set(0, h3(i, 7, 8) * 6, (h3(i, 9, 1) - 0.5) * 0.4); o.scale.setScalar(vis ? 1 : 1e-4); o.updateMatrix(); pieces.setMatrixAt(i, o.matrix); }
    pieces.instanceMatrix.needsUpdate = true;
    // the face: squint and tears
    u.head.rotation.x += 0.42 - 0.2 * cry; u.head.rotation.y += 0.05 * Math.sin(t * 0.8);
    u.lid(0.2 + 0.6 * cry, t, 2); u.wince(0.8 * cry); u.smile(0.2 * (1 - cry)); u.mouthOpen(0.08 * cry * (0.5 + 0.5 * Math.sin(t * 5)));
    if (cry > 0.2) u.head.rotation.z += 0.03 * Math.sin(t * 7) * cry;
    tr(t, cry);
    return u;
  };
  return { R, O, kn, half, pose };
}
const headW = (O) => headPt(O, V(0, 0, 0));

// ---------------------------------------------------------------------
// 0 + 12) the loop: chopping an onion, eyes streaming. Both shots run on tau = seconds from the loop point.
// ---------------------------------------------------------------------
function loopCook(s) {
  const Z = cookScene(s); s.ap = 3.2; s.exposure = 1.06; s.bloom = 0.45;
  return (tau) => {
    const cry = smooth(C.chop - END - 0.2, C.because - END, tau) * 0.75 + 0.25 * smooth(C.so2 - END, C.chop - END, tau);
    Z.pose(tau, { chop: 1, cry: Math.max(cry, tau >= 0 ? 1 : 0) });
    const h = headW(Z.O), cp = V(CX + 1.25, 2.35, -1.7).add(V(0.03 * Math.sin(tau * 0.6), 0, 0.02 * tau));
    shoot(s.cam, cp, lv(h, BOARD, 0.42).add(V(0, 0.15, 0)), { fov: 46, t: tau, focus: cp.distanceTo(h), hand: 0.6 });
  };
}
shot(0, C.inside, (s) => { const up = loopCook(s); s.update = (t) => up(t); });

// 1-3) inside the onion: long glassy cells, purple vacuoles and yellow granules; the knife; the mix; the gas --------
function cellScene(s) {
  const sc = s.scene; sc.background = gradTex([[0, '#2a4a3a'], [0.5, '#16302a'], [1, '#0a1814']], 0.5, 0.45); sc.environment = NENV;
  sc.add(new THREE.HemisphereLight(0xd8ffe8, 0x102018, 0.9)); const k = new THREE.DirectionalLight(0xffffff, 1.4); k.position.set(1, 2, 3); sc.add(k);
  const F = cellField(sc); s.ap = 0.01; s.exposure = 1.05; s.bloom = 0.55; return F;
}
shot(C.inside, C.when, (s) => {
  const F = cellScene(s); const sc = s.scene; const lA = textPlane('ENZYME', 0.42, '#d8a8ff', '#2a0a4a'), lB = textPlane('SULFUR', 0.42, '#ffe27a', '#4a3a00'); [lA, lB].forEach(l => { l.userData.noDof = true; l.material.depthTest = false; l.renderOrder = 16; sc.add(l); });
  s.update = (t) => {
    const z = lerp(4.6, 2.6, E.io(seg(t, C.inside - 0.3, C.cell + 0.4))); setCam(s.cam, V(0.1, -0.2 + 0.05 * Math.sin(t), z), V(0, 0, 0), 4, 40); s.cam.userData.focus = z;
    F.userData.set(t, () => 0, 0, 0);
    const c = F.userData.cells[13].c; c.updateMatrixWorld(true);
    lA.position.copy(c.localToWorld(V(-0.1, 0.32, 0.2))); lA.quaternion.copy(s.cam.quaternion); lA.scale.setScalar(Math.max(1e-4, spring(t, C.two - 0.05, 2, 6)));
    lB.position.copy(c.localToWorld(V(0.25, -0.3, 0.2))); lB.quaternion.copy(s.cam.quaternion); lB.scale.setScalar(Math.max(1e-4, spring(t, C.chemicals, 2, 6)));
  };
});
shot(C.when, C.they, (s) => {
  const F = cellScene(s); const sc = s.scene; const blade = knife(); blade.scale.setScalar(3.2); blade.children[0].material = new THREE.MeshPhysicalMaterial({ color: 0xf2f6f8, metalness: 0.4, roughness: 0.18, clearcoat: 1, envMapIntensity: 2 }); sc.add(blade);
  s.update = (t) => {
    setCam(s.cam, V(0.1, -0.2, 2.6), V(0, 0, 0), 4, 40); s.cam.userData.focus = 2.6;
    const k = E.io(seg(t, C.knife - 0.1, C.cells + 0.2)), bx = lerp(-3.2, 3.2, k);
    blade.position.set(bx, 2.1, 0.2); blade.rotation.set(0, 0, -Math.PI / 2 - 0.08);
    F.userData.set(t, (q) => smooth(-0.1, 0.12, bx - q.c.position.x) * (Math.abs(q.c.position.x - 0.0) < 9 ? 1 : 0), 0, 0);
  };
});
shot(C.they, C.that, (s) => {
  const F = cellScene(s);
  s.update = (t) => {
    setCam(s.cam, V(0.1, -0.1, lerp(2.6, 2.1, E.io(seg(t, C.they, C.that)))), V(0, 0.15, 0), 4, 40);
    F.userData.set(t, () => 1, smooth(C.mix - 0.1, C.mix + 0.4, t), smooth(C.turns - 0.1, C.gas + 0.4, t));
  };
});

// 4) that gas floats up into your eyes: back in the kitchen, a faint haze rises from the board to your face ----------
shot(C.that, C.and2, (s) => {
  const Z = cookScene(s); const g = gasCloud(s.scene, 70); s.ap = 0.9; s.exposure = 1.06; s.bloom = 0.55;
  s.update = (t) => {
    Z.pose(t, { chop: 0.6, cry: 0.35 * smooth(C.into2, C.eyes + 0.3, t) });
    const h = headW(Z.O), eye = headPt(Z.O, V(0, 0.05, 0.42));
    const c = E.io(seg(t, C.that - 0.2, C.and2 + 0.3)), cp = lv(V(CX + 3.1, 2.75, -1.2), V(CX + 2.85, 2.85, -1.05), c);
    shoot(s.cam, cp, lv(h, BOARD, 0.45), { fov: 42, t, focus: cp.distanceTo(h) });
    g(t, s.cam, BOARD.clone().add(V(0, 0.12, 0)), eye, smooth(C.that - 0.1, C.gas2 + 0.2, t));
  };
});

// 5) and irritates the nerves there: a big eye; nerve branches flare as the gas hits ---------------------------
shot(C.and2, C.so, (s) => {
  const sc = s.scene; sc.background = gradTex([[0, '#3a2a2a'], [0.6, '#1a1214'], [1, '#0c0809']], 0.5, 0.45); sc.environment = NENV; sc.add(new THREE.HemisphereLight(0xffffff, 0x201010, 1.0)); const k = new THREE.DirectionalLight(0xffffff, 1.6); k.position.set(1, 2, 3); sc.add(k);
  const eye = nerveEye(); sc.add(eye); const g = gasCloud(sc, 30, 4); s.ap = 0.01; s.exposure = 1.05; s.bloom = 0.7;
  s.update = (t) => {
    setCam(s.cam, V(0, 0, lerp(2.2, 1.9, E.io(seg(t, C.and2, C.so)))), V(0, 0, 0), 0, 40); s.cam.userData.focus = 2;
    eye.rotation.set(0.08 * Math.sin(t * 7), 0.1 * Math.sin(t * 5), 0); eye.userData.set(smooth(C.irritates - 0.1, C.irritates + 0.2, t), t);
    g(t, s.cam, V(0, -1.6, 0.6), V(0, 0, 0.55), 1);
  };
});

// 6) so your eyes flood with tears to wash it out: close on your face, tears pouring -----------------------
shot(C.so, C.its, (s) => {
  const Z = cookScene(s); s.ap = 2.6; s.exposure = 1.06; s.bloom = 0.5;
  s.update = (t) => {
    Z.pose(t, { chop: 0.3, cry: 0.5 + 0.5 * smooth(C.flood - 0.2, C.tears, t) });
    const h = headW(Z.O), c = E.io(seg(t, C.so - 0.2, C.its + 0.3)), cp = h.clone().add(V(0.75, -0.35, -2.3)).lerp(h.clone().add(V(0.65, -0.3, -2.05)), c);
    shoot(s.cam, cp, h.clone().add(V(0, -0.2, 0)), { fov: 38, t, focus: cp.distanceTo(h) });
  };
});

// 7) it's how the onion defends itself from hungry animals: a mouse bites an onion and gets a face full ---------
shot(C.its, C.in_, (s) => {
  const sc = s.scene; const R = kitchen(sc); const on = onion(0.3); on.position.set(1.4, 0, 0.9); on.rotation.set(0, 0.4, 0.35); sc.add(on); const mo = makeMouse(); mo.scale.setScalar(0.7); sc.add(mo); const g = gasCloud(sc, 30, 12);
  s.ap = 2.6; s.exposure = 1.08; s.bloom = 0.5; const tB = C.hungry - 0.05;
  s.update = (t) => {
    const approach = E.io(seg(t, C.its, tB)), recoil = E.out(seg(t, tB + 0.25, tB + 0.6));
    mo.position.set(lerp(2.35, 1.82, approach) + 0.35 * recoil, 0, 1.05); mo.rotation.set(0, -Math.PI / 2 + 0.2 + 0.6 * recoil, 0);
    const mu = mo.userData; mu.update(t, approach < 1 ? 0.6 : 0, recoil); mu.hd.rotation.x += 0.25 * smooth(tB - 0.15, tB, t) * (1 - recoil) - 0.2 * recoil; mu.hd.rotation.z = 0.15 * Math.sin(t * 20) * recoil;
    const c = E.io(seg(t, C.its - 0.2, C.in_ + 0.3)), cp = lv(V(2.4, 0.55, 2.4), V(2.25, 0.5, 2.2), c);
    shoot(s.cam, cp, V(1.75, 0.25, 0.95), { fov: 40, t, focus: cp.distanceTo(V(1.75, 0.2, 0.95)) });
    g(t, s.cam, on.position.clone().add(V(0.3, 0.25, 0.1)), mo.position.clone().add(V(0.05, 0.3, 0)), 0.7 * smooth(tB, tB + 0.2, t) * (1 - smooth(C.animals + 0.4, C.in_ + 0.2, t)));
  };
});

// 8) in 2002, scientists found the exact enzyme that makes the gas: a lab; the enzyme turns, "2002" -------------
shot(C.in_, C.and3, (s) => {
  const sc = s.scene; const R = tickleLab(sc); const ez = enzyme(5); ez.position.set(0, 2.6, 0.6); sc.add(ez); const yr = textPlane('2002', 0.6, '#ffffff', '#1a3a2a'); yr.userData.noDof = true; yr.material.depthTest = false; yr.renderOrder = 16; sc.add(yr);
  const tag = textPlane('THE TEAR ENZYME', 0.62, '#9af0b8', '#0a3a1a'); tag.userData.noDof = true; tag.material.depthTest = false; tag.renderOrder = 16; sc.add(tag);
  const glowL = new THREE.PointLight(0x9af0b8, 8, 4, 2); glowL.position.set(0, 2.6, 1.2); sc.add(glowL); s.ap = 2.5; s.exposure = 1.05; s.bloom = 0.6;
  s.update = (t) => {
    ez.rotation.set(0.3 * Math.sin(t * 0.7), t * 0.6, 0.2); ez.scale.setScalar(Math.max(1e-4, spring(t, C.found - 0.1, 2, 6)));
    const c = E.io(seg(t, C.in_ - 0.2, C.and3 + 0.3)), cp = lv(V(0.6, 2.9, 3.0), V(0.5, 2.8, 2.6), c);
    shoot(s.cam, cp, V(0, 2.55, 0.6), { fov: 40, t, focus: cp.distanceTo(V(0, 2.6, 0.6)) });
    pin(s.cam, yr, 0, 0.2, 1.6); yr.scale.setScalar(Math.max(1e-4, spring(t, C.two2 - 0.05, 2, 6)));
    pin(s.cam, tag, 0, -0.17, 1.6); tag.scale.setScalar(Math.max(1e-4, spring(t, C.exact, 2, 6)));
  };
});

// 9) and later grew onions that barely make it: chopping a golden onion, dry-eyed and smiling; "TEAR-FREE" --------
shot(C.and3, C.cold, (s) => {
  const Z = cookScene(s, { golden: true }); const tag = textPlane('TEAR-FREE', 0.5, '#ffe27a', '#5a3a00'); tag.userData.noDof = true; tag.material.depthTest = false; tag.renderOrder = 16; s.scene.add(tag); s.ap = 3; s.exposure = 1.06; s.bloom = 0.45;
  s.update = (t) => {
    const u = Z.pose(t, { chop: 1, cry: 0 }); u.smile(0.8); u.lid(0.1, t, 2); u.head.rotation.x -= 0.1;
    const h = headW(Z.O), c = E.io(seg(t, C.and3 - 0.2, C.cold + 0.3)), tg = lv(h, BOARD, 0.45).add(V(0, 0.12, 0));
    const cp = tg.clone().add(V(CX - 1.15, 2.4, -1.7).sub(tg).multiplyScalar(lerp(1.16, 0.95, c))).add(V(lerp(-0.12, 0.1, c), 0, lerp(0.1, -0.05, c)));
    shoot(s.cam, cp, tg, { fov: 46, t, focus: cp.distanceTo(h) });
    pin(s.cam, tag, 0.02, -0.17, 1.6); tag.scale.setScalar(Math.max(1e-4, spring(t, C.barely - 0.1, 2, 6)));
  };
});

// 10) cold slows the gas down: the onion in the fridge, frosty blue light; the haze barely moves ---------------
shot(C.cold, C.and4, (s) => {
  const sc = s.scene; const R = kitchen(sc); const on = onion(0.3); sc.add(on); const g = gasCloud(sc, 18, 3); s.ap = 1.1; s.exposure = 0.76; s.bloom = 0.25;
  const F = R.fridge, add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; F.add(m); return m; };
  // a cold blue-grey interior with glass shelves, a light strip, and a few things a fridge holds
  add(new THREE.Mesh(new THREE.BoxGeometry(1.32, 2.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x8eaed0, side: THREE.BackSide, roughness: 0.35, emissive: new THREE.Color(0x2c5a96), emissiveIntensity: 0.45 })), 0, 2.6, 0.08).castShadow = false;
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd6ecff, roughness: 0.05, transparent: true, opacity: 0.45, clearcoat: 1 }), edge = new THREE.MeshStandardMaterial({ color: 0xe8f2fb, roughness: 0.3 });
  [2.05, 3.0].forEach(y => { add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.025, 1.1), glass), 0, y, 0); add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.04), edge), 0, y, 0.55); });
  add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.05), new THREE.MeshBasicMaterial({ color: 0xdff0ff })), 0, 3.78, 0.35).castShadow = false;
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4 }), blue = new THREE.MeshStandardMaterial({ color: 0x2f6fc0, roughness: 0.4 });
  add(new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.4, 0.22, 2, 0.02), white), -0.38, 3.215, -0.1); add(new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.1, 0.225), blue), -0.38, 3.25, -0.1);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 24), new THREE.MeshPhysicalMaterial({ color: 0xd84a3a, roughness: 0.2, transparent: true, opacity: 0.85, clearcoat: 1 })), 0.32, 3.143, -0.05); add(new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0xc9a23a, metalness: 0.6, roughness: 0.3 })), 0.32, 3.3, -0.05);
  const egg = new THREE.MeshStandardMaterial({ color: 0xf3e6d2, roughness: 0.55 }); for (let i = 0; i < 4; i++) { const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), egg), 0.18 + (i % 2) * 0.13, 1.4 + 0.07, 0.05 + Math.floor(i / 2) * 0.13); e.scale.set(1, 1.3, 1); }
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.36, 20), new THREE.MeshPhysicalMaterial({ color: 0x3f8a4a, roughness: 0.1, transparent: true, opacity: 0.8, clearcoat: 1 })), -0.4, 1.32 + 0.18, 0.1);
  const tag = textPlane('4°C', 0.42, '#cfeeff', '#0a2a4a'); tag.userData.noDof = true; tag.material.depthTest = false; tag.renderOrder = 16; sc.add(tag);
  s.update = (t) => {
    R.door.rotation.y = 2.2; R.coldL.intensity = 1.6; R.coldL.color.set(0x9fd0ff); R.coldL.position.set(0, 3.5, 0.45);
    F.updateMatrixWorld(true); on.position.copy(F.localToWorld(V(0, 2.07, 0.15))); on.rotation.set(0, t * 0.1, 0);
    on.children[0].material.color.setRGB(0.85, 0.92, 1.05);
    const c = E.io(seg(t, C.cold - 0.15, C.and4 + 0.2)), tg = on.position.clone().add(V(0, 0.32, 0)), cp = tg.clone().add(V(lerp(-0.3, -0.12, c), lerp(0.3, 0.12, c), lerp(3.1, 2.15, c)));
    shoot(s.cam, cp, tg, { fov: 40, t, focus: cp.distanceTo(tg) });
    g(t * 0.25, s.cam, on.position.clone().add(V(0, 0.45, 0)), on.position.clone().add(V(0.05, 0.9, 0.1)), 0.6);
    pin(s.cam, tag, 0.0, 0.31, 1.6); tag.scale.setScalar(Math.max(1e-4, spring(t, C.slows - 0.1, 2, 6)));
  };
});

// 11) and a sharp knife crushes fewer cells: two rows of cells, a dull blade and a sharp one -------------------
shot(C.and4, C.so2, (s) => {
  const sc = s.scene; sc.background = gradTex([[0, '#2a4a3a'], [0.5, '#16302a'], [1, '#0a1814']], 0.5, 0.45); sc.environment = NENV; sc.add(new THREE.HemisphereLight(0xd8ffe8, 0x102018, 0.9)); const kl = new THREE.DirectionalLight(0xffffff, 1.4); kl.position.set(1, 2, 3); sc.add(kl);
  const A = cellField(sc, 3, 3), B = cellField(sc, 3, 3); A.position.set(0, 0.62, 0); B.position.set(0, -0.62, 0); A.scale.setScalar(0.75); B.scale.setScalar(0.75);
  const kA = knife(), kB = knife(); [kA, kB].forEach(k => { k.scale.setScalar(2.2); sc.add(k); }); kA.children[0].material = kA.children[0].material.clone(); kA.children[0].material.roughness = 0.7; kA.children[0].material.color.set(0x8a8f94);
  const lA = textPlane('DULL', 0.4, '#ff8a7a', '#3a0a0a'), lB = textPlane('SHARP', 0.4, '#9af0b8', '#0a3a1a'); [lA, lB].forEach(l => { l.userData.noDof = true; l.material.depthTest = false; l.renderOrder = 16; sc.add(l); });
  s.ap = 0.01; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => {
    const cz = E.io(seg(t, C.and4 - 0.2, C.so2 + 0.2)); setCam(s.cam, V(lerp(0.1, -0.06, cz), lerp(0.04, -0.02, cz), lerp(3.45, 3.0, cz)), V(lerp(0.04, -0.03, cz), 0, 0), 0, 40); s.cam.userData.focus = 3.2;
    const k = E.io(seg(t, C.a2, C.crushes + 0.3));
    kA.position.set(0.0, 0.62 + lerp(1.0, -0.05, k), 0.25); kA.rotation.set(0, 0, -0.04); kB.position.set(0.0, -0.62 + lerp(1.0, -0.05, k), 0.25); kB.rotation.set(0, 0, -0.04);
    kA.position.x = -0.6; kB.position.x = -0.6;
    A.userData.set(t, (q) => (Math.abs(q.c.position.x) < 0.9 ? 1 : 0) * smooth(0.3, 0.9, k), 0.5, 0.6 * k);
    B.userData.set(t, (q) => (Math.abs(q.c.position.x) < 0.2 && Math.abs(q.c.position.y) < 0.1 ? 1 : 0) * smooth(0.3, 0.9, k), 0.5, 0.6 * k);
    pin(s.cam, lA, -0.17, 0.2, 1.6); pin(s.cam, lB, -0.17, -0.06, 1.6); lA.scale.setScalar(Math.max(1e-4, spring(t, C.a2, 2, 6))); lB.scale.setScalar(Math.max(1e-4, spring(t, C.sharp, 2, 6)));
  };
});

// 12) so next time you chop one, chill it first, because… → (loop)
shot(C.so2, END, (s) => { const up = loopCook(s); s.update = (t) => up(t - END); });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
