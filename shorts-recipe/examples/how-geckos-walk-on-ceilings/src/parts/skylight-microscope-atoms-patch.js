// =====================================================================
// THE GECKO'S OTHER SETS: a glass skylight to see the toe pads from above; under the electron microscope (µm), a
// lamella's carpet of setae and one seta branching into hundreds of spatulae; the atoms (nm) of a spatula tip meeting
// the ceiling; a coin-sized patch on the ceiling holding up a cement bag.
// =====================================================================
// a camera with a chosen "up" (for looking up at a ceiling), with the same handheld drift as shoot()
function shootC(cam, pos, target, up, { fov, t = 0, hand = 1, focus = null } = {}) { const d = pos.distanceTo(target), n = 0.01 * hand * Math.max(d, 1.5);
  const p = pos.clone().add(V(fbm(t * 0.55, 1.1), fbm(t * 0.55, 2.2), fbm(t * 0.55, 3.3)).multiplyScalar(n)), tg = target.clone().add(V(fbm(t * 0.45, 4.4), fbm(t * 0.45, 5.5), fbm(t * 0.45, 6.6)).multiplyScalar(n * 0.6));
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } cam.position.copy(p); cam.up.copy(up).normalize(); cam.lookAt(tg); cam.userData.focus = focus ?? p.distanceTo(tg); }
// ---------- the glass skylight: the gecko hangs under a pane of glass; we look down through it at the toe pads ----------
function skylight(sc) { sc.environment = FIRE.env; sc.environmentIntensity = 0.9; sc.background = new THREE.Color(0x1a0f08);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false, envMapIntensity: 0.6 })); glass.rotation.x = -Math.PI / 2; glass.position.y = 0.01; glass.userData.noDof = true; sc.add(glass);
  // a few specks of dust on the glass sell the surface
  const dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: 0x8a7a6a }), 300), r = rng(71), M4 = new THREE.Matrix4(); for (let i = 0; i < 300; i++) { M4.makeTranslation((r() - 0.5) * 40, 0.03, (r() - 0.5) * 40); dust.setMatrixAt(i, M4); } sc.add(dust);
  const below = new THREE.PointLight(0xffb070, 1800, 0, 2); below.position.set(-14, -40, 10); sc.add(below); const fill = new THREE.HemisphereLight(0xffe0c0, 0xff9050, 0.5); sc.add(fill);
  const room = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.MeshBasicMaterial({ map: FIRE.tex, side: THREE.BackSide, color: 0x9a8070 })); room.position.y = -60; sc.add(room);
  const F = new THREE.Group(); F.rotation.set(Math.PI, 0, 0); sc.add(F); return { F, glass }; }
// ---------- under the electron microscope (µm): grey, edge-lit, dark ----------
function semLight(sc, { bg = 0x050607 } = {}) { sc.background = new THREE.Color(bg); sc.environment = STUDIO.env; sc.environmentIntensity = 0.35; sc.fog = new THREE.FogExp2(bg, 0.0022);
  const k = new THREE.DirectionalLight(0xf4f6ff, 2.2); k.position.set(-200, 300, 250); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, near: 10, far: 1500 }); k.shadow.bias = -0.0004; k.userData.soft = 6; sc.add(k);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 2.6); rim.position.set(150, 120, -300); sc.add(rim); return { k, rim }; }
const SEM_M = () => new THREE.MeshPhysicalMaterial({ color: 0xa4a8b0, roughness: 0.55, sheen: 1.0, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.35, clearcoat: 0.2 });
// one seta for the carpet: a curved, tapering shaft (length 1) with a brush of branches at its tip
const SETA_GEO = (() => { const parts = [], c = new THREE.Color(1, 1, 1); const pts = []; for (let i = 0; i <= 12; i++) { const s = i / 12; pts.push(V(0.28 * s * s, s, 0)); }
  const cv = new THREE.CatmullRomCurve3(pts), tube = new THREE.TubeGeometry(cv, 12, 1, 5); const p = tube.attributes.position; for (let i = 0; i <= 12; i++) { const u = i / 12, cp = cv.getPointAt(u), k = 0.022 * (1 - 0.45 * u); for (let j = 0; j <= 5; j++) { const idx = i * 6 + j, v = V(p.getX(idx), p.getY(idx), p.getZ(idx)).sub(cp).multiplyScalar(k).add(cp); p.setXYZ(idx, v.x, v.y, v.z); } } tube.computeVertexNormals();
  parts.push([tube, c, new THREE.Matrix4()]); const tip = cv.getPointAt(1), r = rng(3), br = new THREE.CylinderGeometry(0.0035, 0.007, 1, 4, 1); br.translate(0, 0.5, 0);
  for (let i = 0; i < 7; i++) { const d = V((r() - 0.3) * 0.9, 0.8 + r() * 0.4, (r() - 0.5) * 0.9).normalize(); parts.push([br, c, new THREE.Matrix4().compose(tip.clone().addScaledVector(V(0, -1, 0), r() * 0.06), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d), V(1, 0.06 + r() * 0.05, 1))]); }
  return mergeColored(parts); })();
// a lamella: a gently curved plate thick with setae, leaning toward the base of the toe
function setaeCarpet(sc, { n = 1800, w = 420, l = 420, seed = 5 } = {}) { const m = SEM_M(); m.vertexColors = true;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(w * 1.6, 20, l * 1.6, 60, 1, 60), SEM_M()); { const p = plate.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (p.getY(i) > 0) p.setY(i, 10 + 6 * Math.sin(x * 0.012) + 4 * Math.sin(z * 0.02)); } plate.geometry.computeVertexNormals(); } plate.position.y = -10; plate.receiveShadow = true; sc.add(plate);
  const im = new THREE.InstancedMesh(SETA_GEO, m, n), r = rng(seed), M4 = new THREE.Matrix4(), sp = Math.sqrt(w * l / n);
  let k = 0; for (let a = -w / 2; a < w / 2; a += sp) for (let b = -l / 2; b < l / 2; b += sp) { if (k >= n) break; const x = a + (r() - 0.5) * sp * 0.8, z = b + (r() - 0.5) * sp * 0.8, y = 6 * Math.sin(x * 0.012) + 4 * Math.sin(z * 0.02); const L = 95 + r() * 30;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.2, -0.3 + (r() - 0.5) * 0.4, -0.5 + (r() - 0.5) * 0.2)); M4.compose(V(x, y, z), q, V(L, L, L)); im.setMatrixAt(k, M4); im.setColorAt(k, new THREE.Color().setScalar(0.85 + r() * 0.15)); k++; }
  im.count = k; im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; sc.add(im); return { plate, im }; }
// one seta up close: a shaft that splits into branches, each ending in a fan of flat spatulae
function oneSeta(sc, { L = 110, seed = 8 } = {}) { const g = new THREE.Group(), m = SEM_M(), r = rng(seed); const shaftPts = []; for (let i = 0; i <= 16; i++) { const s = i / 16; shaftPts.push(V(30 * s * s, L * 0.75 * s, 0)); }
  const shaft = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shaftPts), 64, 2.2, 16), m); shaft.castShadow = true; g.add(shaft);
  const top = shaftPts[16], dirTop = top.clone().sub(shaftPts[14]).normalize(); const brG = new THREE.CylinderGeometry(0.35, 0.6, 1, 8, 1); brG.translate(0, 0.5, 0); const subG = new THREE.CylinderGeometry(0.1, 0.2, 1, 5, 1); subG.translate(0, 0.5, 0);
  const spG = new THREE.BufferGeometry(); spG.setAttribute('position', new THREE.Float32BufferAttribute([-0.55, 0, 0, 0.55, 0, 0, 0, 0.9, 0.05, 0.55, 0, 0, -0.55, 0, 0, 0, 0.9, 0.05], 3)); spG.computeVertexNormals();
  const NB = 14, NSB = 18, br = new THREE.InstancedMesh(brG, m, NB), sb = new THREE.InstancedMesh(subG, m, NB * NSB), spat = new THREE.InstancedMesh(spG, new THREE.MeshPhysicalMaterial({ color: 0xd8dade, roughness: 0.4, side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color(0xffffff) }), NB * NSB);
  const M4 = new THREE.Matrix4(), ends = []; let k = 0;
  for (let i = 0; i < NB; i++) { const d = dirTop.clone().add(V((r() - 0.5) * 1.1, (r() - 0.2) * 0.4, (r() - 0.5) * 1.1)).normalize(), len = 14 + r() * 8, base = top.clone().addScaledVector(dirTop, -r() * 4);
    M4.compose(base, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d), V(1, len, 1)); br.setMatrixAt(i, M4); const tip = base.clone().addScaledVector(d, len);
    for (let j = 0; j < NSB; j++) { const d2 = d.clone().add(V((r() - 0.5) * 1.6, (r() - 0.3) * 0.6, (r() - 0.5) * 1.6)).normalize(), l2 = 3 + r() * 3, b2 = tip.clone().addScaledVector(d, -r() * 3);
      M4.compose(b2, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d2), V(1, l2, 1)); sb.setMatrixAt(k, M4); const e = b2.clone().addScaledVector(d2, l2);
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d2).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), 1.2)); M4.compose(e, q, V(1, 1, 1)); spat.setMatrixAt(k, M4); ends.push(e); k++; } }
  [br, sb, spat].forEach(x => { x.castShadow = true; x.frustumCulled = false; g.add(x); }); g.userData = { top, ends, shaftPts }; sc.add(g); return g; }
// ---------- atoms (nm): a spatula tip coming down onto the ceiling ----------
function atomLayer(nx, nz, a, colors, rr, seed, jitter = 0.05) { const r = rng(seed), list = []; for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const x = (i - nx / 2) * a + (k % 2) * a / 2 + (r() - 0.5) * jitter, z = (k - nz / 2) * a * 0.866 + (r() - 0.5) * jitter; list.push([x, (r() - 0.5) * jitter, z, colors[Math.floor(r() * colors.length)], rr * (0.9 + r() * 0.2)]); } return list; }
function atomsMesh(list) { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.15 }), list.length), M4 = new THREE.Matrix4();
  list.forEach(([x, y, z, c, rr], i) => { M4.compose(V(x, y, z), new THREE.Quaternion(), V(rr, rr, rr)); m.setMatrixAt(i, M4); m.setColorAt(i, new THREE.Color(c)); }); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; return m; }
// electron clouds: soft, slightly shifting halos around the atoms that face each other (fluctuating dipoles)
const CLOUD_T = (() => { const [c, g] = mkCanvas(128, 128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(140,200,255,0.5)'); gr.addColorStop(0.5, 'rgba(110,170,255,0.2)'); gr.addColorStop(1, 'rgba(90,150,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return texOf(c, false); })();
// ---------- a coin-sized patch of gecko-style hairs on the ceiling, holding a cement bag on a rope ----------
const PATCH_T = (() => { const [c, g] = mkCanvas(256, 256), r = rng(81); g.fillStyle = '#2a2c30'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); for (let i = 0; i < 5000; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 122; g.fillStyle = `rgba(${150 + r() * 60},${150 + r() * 60},${160 + r() * 60},0.35)`; g.fillRect(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 1.5, 1.5); } return texOf(c); })();
function patchAndBag(sc, at) { const g = new THREE.Group(); g.position.copy(at); sc.add(g);
  const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 48), new THREE.MeshPhysicalMaterial({ map: PATCH_T, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0x9aa4b4) })); patch.position.y = -0.06; g.add(patch);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 10, 24), new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.3 })); eye.position.y = -0.62; g.add(eye);
  const ropeM = new THREE.MeshPhysicalMaterial({ color: 0xc8b48a, roughness: 0.8, normalMap: rep(GRAIN_N, 1, 30), normalScale: V2(0.8, 0.8) });
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1, 10), ropeM); g.add(rope);
  const bag = model('cement_bag'); bag.rotation.set(Math.PI / 2, 0, 0); const bagG = new THREE.Group(); bagG.add(bag); bag.position.set(0, -35, -9); g.add(bagG);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(10, 0.3, 8, 40), ropeM); loop.rotation.set(0, 0, 0); loop.scale.set(1.25, 1, 0.55); bagG.add(loop); loop.position.set(0, -4, 0);
  g.userData = { patch, rope, bagG, update(t, k = 1) { const sw = 0.03 * Math.sin(t * 1.3), drop = 62; bagG.position.set(Math.sin(sw) * drop, -drop * Math.cos(sw), 0); bagG.rotation.z = sw; bagG.rotation.y = 0.15 * Math.sin(t * 0.7);
    const top = V(0, -0.7, 0), bot = bagG.position.clone().add(V(0, 5, 0)); rope.position.copy(lv(top, bot, 0.5)); rope.scale.set(1, top.distanceTo(bot), 1); rope.quaternion.setFromUnitVectors(V(0, 1, 0), top.clone().sub(bot).normalize()); } };
  return g; }
