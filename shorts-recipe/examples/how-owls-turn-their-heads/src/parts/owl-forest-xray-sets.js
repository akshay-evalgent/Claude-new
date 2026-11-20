// =====================================================================
// OWLS: the species (a great horned owl: ear tufts, facial disc, forward-facing orange eyes), the forest perch,
// x-ray anatomy (tubular eyes, neck vertebrae with wide artery holes, arteries, blood reservoirs under the jaw)
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, ASPECT, 0.004, 900) }; build(s); shots.push(s); return s; }
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const s2l = (c) => c.map(v => Math.pow(v, 2.2));
const mixc = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// the owl's head: a round, feathered skull with a flat face, a facial disc of radiating feathers round two big forward eyes
const OWL_DISC_T = (() => { const [c, g] = mkCanvas(512, 512); g.fillStyle = '#b99a74'; g.fillRect(0, 0, 512, 512); const r = rng(51);
  for (let i = 0; i < 2600; i++) { const a = r() * Math.PI * 2, r0 = 30 + r() * 60, r1 = r0 + 60 + r() * 160; const v = 120 + r() * 90; g.strokeStyle = `rgba(${v + 20},${v},${v * 0.72},${0.25 + r() * 0.35})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); g.lineTo(256 + Math.cos(a + 0.04) * r1, 256 + Math.sin(a + 0.04) * r1); g.stroke(); }
  const gr = g.createRadialGradient(256, 256, 170, 256, 256, 256); gr.addColorStop(0, 'rgba(60,40,25,0)'); gr.addColorStop(0.65, 'rgba(60,40,25,0.55)'); gr.addColorStop(1, 'rgba(45,30,18,0.95)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const ir = g.createRadialGradient(256, 256, 20, 256, 256, 90); ir.addColorStop(0, 'rgba(40,26,14,0.8)'); ir.addColorStop(1, 'rgba(40,26,14,0)'); g.fillStyle = ir; g.fillRect(0, 0, 512, 512); return texOf(c); })();
function owlHead(head) {
  const TXO = birdTex(OWL);
  // skull: a sphere, wider than tall, flattened at the face
  const sg = new THREE.SphereGeometry(0.07, 64, 48), p = sg.attributes.position, cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); y *= 0.9; z *= 1.12; if (x > 0.018) x = 0.018 + (x - 0.018) * 0.42; x -= 0.012; y += 0.012;
    p.setXYZ(i, x, y, z); const top = smooth(0.0, 0.07, y), n = h3(x * 300, y * 300, z * 300); let c = mixc([0.50, 0.37, 0.25], [0.33, 0.23, 0.15], top * 0.8); c = c.map(v => v * (0.85 + 0.3 * n)); c = s2l(c); cols[i * 3] = c[0]; cols[i * 3 + 1] = c[1]; cols[i * 3 + 2] = c[2]; }
  sg.setAttribute('color', new THREE.BufferAttribute(cols, 3)); sg.computeVertexNormals();
  const fm = TXO.feather.map.clone(); fm.needsUpdate = true; fm.repeat.set(5, 3); const fn = TXO.feather.normalMap.clone(); fn.needsUpdate = true; fn.repeat.set(5, 3);
  const skull = new THREE.Mesh(sg, new THREE.MeshPhysicalMaterial({ vertexColors: true, map: fm, normalMap: fn, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.95, sheen: 0.8, sheenColor: new THREE.Color(0.45, 0.35, 0.24) })); skull.castShadow = skull.receiveShadow = true; head.add(skull);
  const hf = fluff(skull, { layers: 4, len: 0.005, rep: [16, 10] }); hf.userData.fluff = true; head.add(hf);
  // facial disc: a shallow dish of radiating feathers round each eye
  const dm = new THREE.MeshPhysicalMaterial({ map: OWL_DISC_T, roughness: 0.95, sheen: 0.7, sheenColor: new THREE.Color(0.6, 0.5, 0.4) });
  for (const sd of [-1, 1]) { const dg = new THREE.LatheGeometry([[0.0, 0.0], [0.012, 0.003], [0.026, 0.0065], [0.036, 0.006], [0.041, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), 48); const q = dg.attributes.position, uvq = dg.attributes.uv;
    for (let i = 0; i < q.count; i++) { uvq.setXY(i, 0.5 + q.getX(i) / 0.082, 0.5 + q.getZ(i) / 0.082); } dg.rotateZ(-Math.PI / 2); // dish faces +x
    const d = new THREE.Mesh(dg, dm); d.position.set(0.039, 0.006, sd * 0.024); d.scale.set(1, 1, 1.05); d.rotation.y = -sd * 0.28; d.castShadow = true; head.add(d); }
  // eyes: big, forward, orange
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: TXO.iris, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02 });
  const ER = 0.0165, EV = 0.0098, eg = new THREE.SphereGeometry(ER, 40, 30); eg.rotateX(Math.PI / 2); { const q = eg.attributes.position, uvq = eg.attributes.uv; for (let i = 0; i < q.count; i++) { const z = q.getZ(i); if (z > 0) uvq.setXY(i, 0.5 + q.getX(i) / (2 * EV), 0.5 + q.getY(i) / (2 * EV)); else uvq.setXY(i, 0.03, 0.03); } }
  for (const sd of [-1, 1]) { const g = new THREE.Group(); g.position.set(0.026, 0.008, sd * 0.024); g.rotation.y = Math.PI / 2 - sd * 0.18; head.add(g); const e = new THREE.Mesh(eg, eyeMat); g.add(e);
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.0104, 0.0018, 12, 40), new THREE.MeshStandardMaterial({ color: 0x24180f, roughness: 0.9 })); lid.position.z = 0.0128; g.add(lid); head.userData['eye' + (sd > 0 ? 'R' : 'L')] = g; }
}
function owlBeak(head) {
  const prof = []; for (let i = 0; i <= 16; i++) { const k = i / 16; prof.push(new THREE.Vector2(Math.max(0.0003, 0.0085 * Math.pow(1 - k, 0.7)), k * 0.026)); }
  const g = new THREE.LatheGeometry(prof, 20); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y / 0.026; p.setXYZ(i, y * 0.75, -p.getX(i) * 0.9 - 0.016 * k * k, p.getZ(i) * 0.75); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x2e2a28, roughness: 0.35, clearcoat: 0.5 })); m.position.set(0.034, -0.006, 0); m.scale.setScalar(0.8); m.castShadow = true; head.add(m);
  // ear tufts: soft feather tufts on the brow
  const tm = new THREE.MeshPhysicalMaterial({ color: 0x5a4330, roughness: 0.9, sheen: 0.8, sheenColor: new THREE.Color(0.5, 0.4, 0.3) });
  for (const sd of [-1, 1]) { const tf = new THREE.Group(); tf.position.set(0.0, 0.066, sd * 0.034); tf.rotation.set(sd * 0.3, 0, -0.35); head.add(tf);
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.0065 - i * 0.0006, 0.05 - i * 0.004, 8), tm); c.position.set(-i * 0.003, 0.022, (i % 2 - 0.5) * 0.004); c.rotation.z = 0.1 * i; c.castShadow = true; tf.add(c); } }
}
const OWL = {
  // an upright body: the spine runs mostly up (the body is pitched up when posed)
  body: [[-0.17, 0.0, 0.020, 0.016, 0.016], [-0.13, 0.0, 0.058, 0.048, 0.052], [-0.07, 0.0, 0.094, 0.082, 0.096], [0.0, 0.0, 0.104, 0.090, 0.106], [0.07, 0.0, 0.094, 0.080, 0.090], [0.11, -0.004, 0.072, 0.064, 0.058], [0.135, -0.006, 0.052, 0.048, 0.036]],
  head: [[-0.02, -0.05, 0.045, 0.040, 0.045], [-0.018, -0.034, 0.048, 0.043, 0.044], [-0.012, -0.02, 0.042, 0.038, 0.036], [-0.006, -0.008, 0.034, 0.030, 0.028], [0.0, 0.0, 0.022, 0.020, 0.018]],
  customHead: owlHead,
  neckPuff: 1.0, neckSlope: 0.4, neckTan: [0.6, 0.6], neckDir0: V(1, 0, 0), rowLen: [0.016, 0.012, 0.007], featherOpts: { seed: 41 }, featherNormal: 0.35, sheen: 0.7, sheenColor: [0.45, 0.36, 0.26],
  color(u, th, nz, k) {
    const top = Math.sin(th), front = -Math.sin(th); // with the body pitched up, "below" faces forward (the breast)
    const back = [0.40, 0.29, 0.19], breast = [0.66, 0.53, 0.38], disc = [0.74, 0.60, 0.44], rim = [0.22, 0.15, 0.10], crown = [0.36, 0.26, 0.17];
    let c = mixc(back, breast, smooth(-0.2, 0.7, front));
    // streaks and bars down the breast, mottling on the back
    const st = Math.pow(Math.abs(Math.sin(th * 14 + u * 40 + nz * 2)), 10), bar = Math.pow(Math.abs(Math.sin(u * 95)), 12);
    c = c.map(v => v * (1 - 0.35 * st * smooth(0, 0.6, front) - 0.25 * bar * smooth(-0.2, 0.5, front) - 0.2 * (nz + 0.5) * smooth(0.2, -0.6, front)));
    c = mixc(c, crown, smooth(0.66, 0.76, u) * smooth(-0.2, 0.6, top));
    // the facial disc: pale round the face, with a dark rim
    const face = smooth(0.80, 0.92, u) * smooth(-0.2, 0.5, Math.cos(th) * 0 + 1 - Math.abs(top) * 0.9);
    c = mixc(c, disc, face * 0.85); c = mixc(c, rim, smooth(0.78, 0.82, u) * smooth(0.86, 0.82, u) * 0.7);
    c = mixc(c, [0.30, 0.21, 0.14], smooth(0.74, 0.8, u)); // the stub of skin inside the skull stays dark
    const n = 1 + nz * 0.12; return s2l(c.map(v => clamp(v * n)));
  },
  wingOpts: { base: [112, 84, 58], bar: [62, 44, 30], prim: [86, 64, 44], bars: false, seed: 43 },
  tailTex: () => { const [c, g] = mkCanvas(512, 256), [hc, hg] = mkCanvas(512, 256); g.fillStyle = '#6e5238'; g.fillRect(0, 0, 512, 256); hg.fillStyle = '#808080'; hg.fillRect(0, 0, 512, 256);
    for (let x = 30; x < 512; x += 60) { g.fillStyle = 'rgba(40,28,18,0.6)'; g.fillRect(x, 0, 18, 256); } for (let i = 0; i <= 10; i++) { const y = i * 25.6; g.fillStyle = 'rgba(30,20,12,0.25)'; g.fillRect(0, y - 1, 512, 2); hg.fillStyle = '#404040'; hg.fillRect(0, y - 1.5, 512, 3); hg.fillStyle = '#b0b0b0'; hg.fillRect(0, y + 1.5, 512, 8); }
    const [bc, bg] = mkCanvas(512, 256); bg.filter = 'blur(2px)'; bg.drawImage(hc, 0, 0); return { map: texOf(c), normalMap: heightToNormal(bc, 2) }; },
  wing: { xFront: 0.10, xTip: -0.21, tailX: -0.16, tipA: 0.012, tipLift: 0.01, thTop: [1.15, 1.35], thBot: [-0.55, 0.3], sz: 2.4, ns: 30, nt: 14 },
  tail: { len: 0.08, w: [0.025, 0.04], h: [0.012, 0.004], droop: 0.006, cup: 0.006, pos: [-0.15, 0.0, 0.05] },
  eye: { pos: [0.040, 0.008, 0.025], R: 0.016, EV: 0.0118, yaw: 1.05, ring: [0.016, 0.012], ringCol: [0.14, 0.10, 0.07] }, iris: ['#e88a14', '#f6b432', 62, '#140c06'],
  beak: owlBeak,
  leg: { tib: [0.016, 0.012], tar: [0.011, 0.009], ank: 0.012, bareTib: false, toes: [[0.034, 0.35, 0.0055], [0.034, -0.3, 0.0055], [0.028, Math.PI - 0.35, 0.005], [0.026, Math.PI + 0.35, 0.005]] },
  legColor: 0x7a5c40, legHip: V(-0.02, -0.06, 0.04), L1: 0.06, L2: 0.06, headHeight: 0.40, bodyHeight: 0.20, bodyPitch: 1.25, footLift: 0.008,
  gaitDef: { footZ: 0.035, lift: 0.02, ahead: 0.02 },
};
OWL.restPose = () => perchPose(0);
// perched: body upright, head on top; yaw = the head's turn about the body's own vertical (unwrapped: 3*PI/2 = 270 degrees)
function perchPose(yaw, { t = 0, tilt = 0, pitch = 0, breathe = 1 } = {}) {
  const b = { x: 0, y: OWL.bodyHeight + 0.002 * Math.sin(t * 2.2) * breathe, pitch: OWL.bodyPitch, roll: 0, yaw: 0 };
  return { body: b, head: { x: -0.018, y: OWL.bodyHeight + 0.215, z: 0, pitch: pitch - 0.05, yaw, roll: tilt }, feet: [{ x: 0.0, y: 0, z: -0.035, curl: 0.3 }, { x: 0.0, y: 0, z: 0.035, curl: 0.3 }], twist: yaw, neckDir: V(1, 0.0, 0) };
}
function owl(sc, { at = V(0, 0, 0), heading = 0 } = {}) { const b = makeBird(OWL); b.position.copy(at); b.rotation.y = heading; sc.add(b); const bf = fluff(b.userData.skin, { layers: 5, len: 0.006, rep: [9, 4], tint: 1.0 }); bf.userData.fluff = true; b.add(bf); b.userData.pose = (P) => poseBird(b, P); return b; }

// ---------- the forest at sunset, a fallen trunk to perch on ----------
const FOREST_SUN = (() => { const im = FOREST.tex.image, d = im.data, w = im.width, h = im.height; let best = -1, bi = 0; const toF = d instanceof Uint16Array ? THREE.DataUtils.fromHalfFloat : (x) => x;
  for (let y = 0; y < h / 2; y++) for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4; const L = toF(d[i]) * 0.3 + toF(d[i + 1]) * 0.59 + toF(d[i + 2]) * 0.11; if (L > best) { best = L; bi = y * w + x; } }
  const phi = ((bi % w + 0.5) / w - 0.5) * 2 * Math.PI, lat = (0.5 - (Math.floor(bi / w) + 0.5) / h) * Math.PI; return V(Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat)); })();
function forest(sc, { sun = 2.4, env = 0.9 } = {}) {
  sc.environment = FOREST.env; sc.environmentIntensity = env; sc.background = new THREE.Color(0x4a5040);
  const sky = new GroundProjectedSkybox(FOREST.tex); sky.scale.setScalar(120); sky.height = 1.6; sky.radius = 120; sc.add(sky);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const log = model('dead_tree_trunk'); log.position.set(0, 0, 0); sc.add(log);
  const sunL = new THREE.DirectionalLight(0xffd4a0, sun); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048); Object.assign(sunL.shadow.camera, { left: -0.8, right: 0.8, top: 0.8, bottom: -0.8, near: 0.5, far: 20 }); sunL.shadow.bias = -0.0002; sunL.shadow.normalBias = 0.01; sunL.userData.soft = 0.05; sc.add(sunL, sunL.target);
  sunL.userData.aim = (c, d = 6) => { sunL.position.copy(c).addScaledVector(FOREST_SUN, d); sunL.target.position.copy(c); sunL.target.updateMatrixWorld(); }; sunL.userData.aim(V(0, 0.5, 0));
  return { log, sun: sunL, top: 0.255 };
}

// ---------- x-ray look: a dark studio, a glowing ghost of the bird, bones, arteries ----------
function xrayStudio(sc) { sc.background = new THREE.Color(0x05080d); sc.environment = STUDIO.env; sc.environmentIntensity = 0.5;
  const key = new THREE.DirectionalLight(0xdfe8ff, 1.6); key.position.set(0.5, 1, 0.8); sc.add(key); const rim = new THREE.DirectionalLight(0x9fc4ff, 1.4); rim.position.set(-0.6, 0.4, -0.8); sc.add(rim); }
const ghostMat = () => { const m = xrayMat(new THREE.Color(0.55, 0.8, 1.0), new THREE.Color(0.03, 0.08, 0.16), 2.2, 0.9); m.userData.noDofMat = true; return m; };
const BONE = () => new THREE.MeshPhysicalMaterial({ color: 0xeee4cf, roughness: 0.55, clearcoat: 0.2, sheen: 0.4, sheenColor: new THREE.Color(1, 0.95, 0.85) });
const ARTERY = () => new THREE.MeshPhysicalMaterial({ color: 0xc81e24, roughness: 0.35, clearcoat: 0.6, emissive: 0x400406, emissiveIntensity: 1 });
// a neck vertebra (local y up): a centrum, an arch, a spine, and two transverse processes, each with a hole (foramen) for the artery
function vertebra({ s = 1, holeR = 0.0034, wide = true } = {}) {
  const g = new THREE.Group(), bm = BONE();
  const cen = new THREE.Mesh(new THREE.CylinderGeometry(0.0062 * s, 0.0068 * s, 0.009 * s, 24), bm); g.add(cen);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.0062 * s, 0.0018 * s, 12, 28, Math.PI), bm); arch.rotation.x = Math.PI / 2; arch.position.z = -0.006 * s; arch.rotation.z = Math.PI; g.add(arch);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(0.0022 * s, 0.009 * s, 10), bm); sp.rotation.x = -Math.PI / 2; sp.position.z = -0.016 * s; g.add(sp);
  const holes = [];
  for (const sd of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(holeR * s + 0.0013 * s, 0.0013 * s, 12, 32), bm); ring.rotation.x = Math.PI / 2; ring.position.set(sd * (0.0062 + holeR + 0.0014) * s, 0, 0.0); g.add(ring);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.004 * s, 0.003 * s, 0.003 * s), bm); bar.position.set(sd * 0.0062 * s, 0, 0); g.add(bar); holes.push(ring.position.clone()); }
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); g.userData.holes = holes; return g;
}
// a column of vertebrae along a curve; returns the group and each vertebra's frame
function column(n, curve, opts) { const g = new THREE.Group(), vs = []; for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, p = curve.getPointAt(u), t = curve.getTangentAt(u); const v = vertebra(opts); v.position.copy(p); v.quaternion.setFromUnitVectors(V(0, 1, 0), t); g.add(v); vs.push(v); } g.userData.vs = vs; return g; }
// a tube through points (an artery), rebuilt on demand
function tube(points, r, mat) { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(16, points.length * 6), r, 12, false), mat); m.castShadow = true; return m; }
// a tubular owl eye (cut-away): a long tube, the lens at the front, the cup of retina at the back, a ring of small bones (sclerotic ring)
function tubeEye(s = 1) { const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.LatheGeometry([[0.0, -0.014], [0.009, -0.013], [0.012, -0.008], [0.0085, 0.002], [0.0075, 0.009], [0.0072, 0.012], [0.0, 0.0125]].map(([x, y]) => new THREE.Vector2(x * s, y * s)), 32), new THREE.MeshPhysicalMaterial({ color: 0xf2ece4, roughness: 0.4, transparent: true, opacity: 0.85, side: THREE.DoubleSide })); g.add(shell);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0080 * s, 0.0098 * s, 0.009 * s, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xe8dcc6, roughness: 0.6, side: THREE.DoubleSide })); ring.position.y = -0.002 * s; g.add(ring);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.0062 * s, 24, 18), new THREE.MeshPhysicalMaterial({ color: 0xf8b040, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.9 })); lens.position.y = 0.010 * s; lens.scale.set(1, 0.55, 1); g.add(lens);
  return g; }
function humanEyeball(s = 1) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.012 * s, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xf4f1ec, roughness: 0.3, clearcoat: 1 })); g.add(b);
  const ir = new THREE.Mesh(new THREE.CircleGeometry(0.0055 * s, 32), new THREE.MeshPhysicalMaterial({ color: 0x4a6a8a, roughness: 0.4 })); ir.position.z = 0.0118 * s; g.add(ir); const pu = new THREE.Mesh(new THREE.CircleGeometry(0.0024 * s, 24), new THREE.MeshBasicMaterial({ color: 0x050505 })); pu.position.z = 0.0119 * s; g.add(pu); return g; }
function liveLabel(w = 0.5, aspect = 0.28) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * aspect); const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * aspect), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  m.renderOrder = 20; m.userData.noDof = true; let last = null;
  m.userData.set = (lines) => { const key = JSON.stringify(lines); if (key === last) return; last = key; g.clearRect(0, 0, c.width, c.height);
    for (const [txt, size, y, col, wt, passes] of lines) { g.font = `${wt || 800} ${size}px "Nunito", "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 18; g.fillStyle = col || '#ffffff'; for (let i = 0; i < (passes || 1); i++) g.fillText(txt, c.width / 2, y * c.height); }
    tex.needsUpdate = true; };
  return m;
}
