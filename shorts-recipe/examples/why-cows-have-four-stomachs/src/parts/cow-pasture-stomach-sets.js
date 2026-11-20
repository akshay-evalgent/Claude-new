// =====================================================================
// THE COW: a Holstein built on the shared lofted skin (body, neck, head as one surface), with four jointed legs,
// a swishing tail, an udder, ears and a chewing jaw; an Alpine pasture (real HDR, scanned grass and dandelions);
// the four-chambered stomach in wet tissue (rumen, reticulum, omasum, abomasum) and the insides of each room
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, ASPECT, 0.004, 900) }; build(s); shots.push(s); return s; }
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const s2l = (c) => c.map(v => Math.pow(v, 2.2));
const mixc = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// short hair: fine streaks along the body
const HAIR_T = () => { const [c, g] = mkCanvas(512, 512), [hc, hg] = mkCanvas(512, 512), r = rng(17); g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 512, 512); hg.fillStyle = '#808080'; hg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const x = r() * 512, y = r() * 512, L = 6 + r() * 14, v = r() > 0.5 ? 200 : 60; hg.strokeStyle = `rgba(${v},${v},${v},0.35)`; hg.lineWidth = 0.8; hg.beginPath(); hg.moveTo(x, y); hg.lineTo(x - L, y + (r() - 0.5) * 3); hg.stroke(); const a = 0.9 + r() * 0.2; g.fillStyle = `rgba(${235 * a},${235 * a},${232 * a},0.25)`; g.fillRect(x, y, 2, 1); }
  const [bc, bg] = mkCanvas(512, 512); bg.filter = 'blur(0.6px)'; bg.drawImage(hc, 0, 0); return { map: texOf(c), normalMap: heightToNormal(bc, 2.5) }; };

function cowHead(head) {
  const hair = new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color(0.4, 0.4, 0.42) });
  const pink = new THREE.MeshPhysicalMaterial({ color: 0x8a6a64, roughness: 0.7, sheen: 0.6, sheenColor: new THREE.Color(0.8, 0.7, 0.7) });
  for (const sd of [-1, 1]) { const ear = new THREE.Group(); ear.position.set(-0.10, 0.05, sd * 0.1); ear.rotation.set(sd * 0.7, 0, 0.15); head.add(ear);
    const o = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), hair); o.scale.set(0.045, 0.012, 0.095); o.position.z = sd * 0.09; o.castShadow = true; ear.add(o);
    const i = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), pink); i.scale.set(0.028, 0.008, 0.06); i.position.set(0.004, 0.007, sd * 0.09); ear.add(i); head.userData['ear' + sd] = ear; }
  const nm = new THREE.MeshPhysicalMaterial({ color: 0x1a1010, roughness: 0.3, clearcoat: 0.8 });
  for (const sd of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), nm); n.scale.set(0.006, 0.016, 0.011); n.position.set(0.384, -0.062, sd * 0.03); n.rotation.y = -sd * 0.6; head.add(n); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0x5a4444, roughness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.25 })); nose.scale.set(0.03, 0.045, 0.07); nose.position.set(0.37, -0.068, 0); head.add(nose);
  // the lower jaw (it grinds from side to side when chewing)
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0x2a2a2c, roughness: 0.75, sheen: 0.5, sheenColor: new THREE.Color(0.5, 0.5, 0.5) })); jaw.scale.set(0.13, 0.03, 0.06); jaw.position.set(0.21, -0.098, 0); jaw.castShadow = true;
  const jp = new THREE.Group(); jp.position.set(0.02, -0.07, 0); head.add(jp); jaw.position.sub(jp.position); jp.add(jaw); head.userData.jaw = jp;
}
const COW = {
  body: [[-0.86, 0.12, 0.06, 0.05, 0.05], [-0.78, 0.14, 0.20, 0.13, 0.20], [-0.55, 0.12, 0.30, 0.19, 0.34], [-0.2, 0.08, 0.33, 0.22, 0.35], [0.15, 0.08, 0.31, 0.24, 0.34], [0.42, 0.14, 0.22, 0.22, 0.28], [0.55, 0.22, 0.15, 0.17, 0.20]],
  head: [[-0.15, 0.0, 0.10, 0.10, 0.12], [-0.07, 0.02, 0.118, 0.105, 0.13], [0.04, 0.005, 0.104, 0.085, 0.125], [0.15, -0.02, 0.084, 0.07, 0.095], [0.26, -0.04, 0.086, 0.07, 0.085], [0.33, -0.05, 0.088, 0.072, 0.082], [0.37, -0.055, 0.055, 0.05, 0.055]],
  neckPuff: 1.25, neckSlope: 0.3, neckTan: [1.0, 0.8], neckDir0: V(1, 0.15, 0), rowLen: [0.12, 0.08, 0.06], skinTex: HAIR_T, featherNormal: 0.45, sheen: 0.5, sheenColor: [0.45, 0.45, 0.46],
  noWings: true, noTail: true, noLegs: true,
  color(u, th, nz) {
    const white = [0.86, 0.85, 0.82], black = [0.07, 0.07, 0.075], muzzle = [0.62, 0.52, 0.50];
    const n = noise3(u * 7 + 3, Math.cos(th) * 1.6, Math.sin(th) * 1.6 + (u > 0.71 ? 5 : 0)) + 0.08 * Math.sin(u * 40 + th * 3);
    let c = mixc(white, black, smooth(-0.03, 0.03, n));
    if (u > 0.71) { c = mixc(c, black, 0.6); c = mixc(c, white, smooth(0.55, 0.2, Math.abs(th - Math.PI / 2)) * smooth(0.76, 0.84, u)); } // a white blaze down the face
    c = mixc(c, muzzle, smooth(0.93, 0.98, u));
    c = mixc(c, white, smooth(-0.3, -0.9, Math.sin(th)) * smooth(0.2, 0.3, u) * smooth(0.45, 0.35, u)); // white belly
    const k = 1 + nz * 0.06; return s2l(c.map(v => clamp(v * k)));
  },
  eye: { pos: [-0.01, 0.045, 0.093], R: 0.022, EV: 0.017, yaw: 0.25, ring: [0.03, 0.022], ringCol: [0.08, 0.07, 0.07] }, iris: ['#24160c', '#3a2414', 80, '#f2eee8'],
  beak: cowHead, headHeight: 1.05, bodyHeight: 0.95, bodyPitch: 0.0,
};
COW.restPose = () => cowPose({});
// pose: graze 0 = head up (standing, chewing), 1 = head down in the grass
function cowPose({ t = 0, graze = 0, look = 0, tilt = 0 } = {}) {
  const b = { x: 0, y: 1.03 + 0.004 * Math.sin(t * 1.3), pitch: 0.0, roll: 0.006 * Math.sin(t * 0.8), yaw: 0 };
  const up = { x: 0.92, y: 1.22, pitch: -0.95, yaw: look }, dn = { x: 1.05, y: 0.36, pitch: -1.5, yaw: look * 0.3 };
  const h = {}; for (const k of ['x', 'y', 'pitch', 'yaw']) h[k] = lerp(up[k], dn[k], graze); h.z = 0; h.roll = tilt;
  return { body: b, head: h, feet: [], neckDir: V(1, lerp(0.35, -0.2, graze), 0), neckTan: [lerp(1.0, 1.1, graze), lerp(0.8, 0.9, graze)] };
}
// legs: smooth tubes hip -> joint -> hoof, solved each frame (front knees point forward, hind hocks back)
function cowLegs(cow) {
  const vc = (u) => { const hoof = smooth(0.9, 0.93, u); let c = mixc([0.86, 0.85, 0.82], [0.07, 0.07, 0.075], smooth(0.35, 0.25, u) * 0.85); c = mixc(c, [0.10, 0.09, 0.09], hoof); return s2l(c); };
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.75, sheen: 0.5, sheenColor: new THREE.Color(0.45, 0.45, 0.45), normalMap: birdTex(COW).feather.normalMap, normalScale: new THREE.Vector2(0.3, 0.3) });
  const legs = [[0.36, -0.20, 0.17, 0.40, 0.18, 1], [-0.58, -0.10, 0.17, -0.62, 0.17, -1]].flatMap(([hx, hy, hz, fx, fz, dir]) => [-1, 1].map(sd => ({ hip: V(hx, hy, hz * sd), foot: V(fx, 0, fz * sd), dir, sd })));
  legs.forEach(L => { const nu = 48, nv = 18, cols = nv + 1, pos = new Float32Array((nu + 1) * cols * 3), col = new Float32Array((nu + 1) * cols * 3), idx = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const c = vc(i / nu), k = (i * cols + j) * 3; col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2]; }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, d, a, d, c); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((nu + 1) * cols * 2), 2)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; cow.add(m); L.m = m; L.nu = nu; L.nv = nv; L.pos = pos; });
  const rad = (u, dir) => { const top = lerp(0.10, 0.065, smooth(0, 0.35, u)), cannon = 0.034, fet = 0.046 * Math.exp(-Math.pow((u - 0.84) / 0.04, 2)), hoof = 0.052 * smooth(0.9, 0.95, u) * (1 - smooth(0.985, 1.0, u)); return Math.max(lerp(top, cannon, smooth(0.35, 0.55, u)) + fet * 0.4, hoof, 0.004); };
  return (bodyM) => legs.forEach(L => { const hip = L.hip.clone().applyMatrix4(bodyM), foot = L.foot.clone(); const mid = hip.clone().lerp(foot, 0.5).add(V(0.05 * L.dir, 0, 0));
    const curve = new THREE.CatmullRomCurve3([hip, hip.clone().lerp(mid, 0.5), mid, mid.clone().lerp(foot, 0.6).add(V(-0.02 * L.dir, 0, 0)), foot.clone().add(V(0, 0.08, 0)), foot]); const F = ptFrames(curve, L.nu), cols = L.nv + 1;
    for (let i = 0; i <= L.nu; i++) { const r = rad(i / L.nu, L.dir); for (let j = 0; j <= L.nv; j++) { const th = 2 * Math.PI * j / L.nv, k = (i * cols + j) * 3; const p = F.P[i].clone().addScaledVector(F.N[i], Math.cos(th) * r).addScaledVector(F.B[i], Math.sin(th) * r * (i / L.nu > 0.9 ? 1.15 : 1)); L.pos[k] = p.x; L.pos[k + 1] = p.y; L.pos[k + 2] = p.z; } }
    L.m.geometry.attributes.position.needsUpdate = true; L.m.geometry.computeVertexNormals(); });
}
function cowTail(cow) { const mat = new THREE.MeshPhysicalMaterial({ color: 0x1a1a1c, roughness: 0.8, sheen: 0.5, sheenColor: new THREE.Color(0.5, 0.5, 0.5) });
  const tube = new THREE.Mesh(new THREE.BufferGeometry(), mat); tube.castShadow = true; cow.add(tube); const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 12), new THREE.MeshPhysicalMaterial({ color: 0xe8e4dc, roughness: 1, sheen: 1, sheenColor: new THREE.Color(1, 1, 1) })); tuft.castShadow = true; cow.add(tuft);
  return (bodyM, t, swish = 1) => { const base = V(-0.86, 0.14, 0).applyMatrix4(bodyM), pts = [base]; for (let i = 1; i <= 6; i++) { const s = i / 6; pts.push(base.clone().add(V(-0.06 * s - 0.02, -0.75 * s, swish * 0.12 * Math.sin(t * 2.4 - s * 2.2) * s))); }
    tube.geometry.dispose(); tube.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.018, 8); const e = pts[6], d = e.clone().sub(pts[5]).normalize(); tuft.position.copy(e).addScaledVector(d, 0.09); tuft.quaternion.setFromUnitVectors(V(0, -1, 0), d); }; }
function cowUdder(cow) { const m = new THREE.MeshPhysicalMaterial({ color: 0xd8a8a0, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(1, 0.8, 0.8) }); const g = new THREE.Group(); const u = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), m); u.scale.set(0.17, 0.11, 0.15); g.add(u);
  for (const [x, z] of [[0.06, 0.06], [0.06, -0.06], [-0.06, 0.06], [-0.06, -0.06]]) { const tt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.06, 10), m); tt.position.set(x, -0.12, z); g.add(tt); } g.traverse(o => { if (o.isMesh) o.castShadow = true; }); cow.add(g); return (bodyM) => { g.position.copy(V(-0.45, -0.32, 0).applyMatrix4(bodyM)); }; }
function makeCow(sc, { at = V(0, 0, 0), heading = 0, fluffy = true } = {}) {
  const c = makeBird(COW, { lod: { nb: 64, nn: 40, nh: 48, nv: 56 } }); c.position.copy(at); c.rotation.y = heading; sc.add(c);
  if (fluffy) c.add(fluff(c.userData.skin, { layers: 2, len: 0.004, rep: [20, 6] }));
  const legs = cowLegs(c), tail = cowTail(c), udder = cowUdder(c);
  c.userData.pose = (P, t = 0, chew = 0) => { poseBird(c, P); const bm = c.userData.body.matrix; legs(bm); tail(bm, t); udder(bm); const j = c.userData.head.userData.jaw; j.rotation.set(0, 0.10 * chew * Math.sin(t * 9), -0.06 * chew * Math.max(0, Math.sin(t * 9 + 1))); };
  c.userData.pose(cowPose({})); return c;
}

// ---------- the Alpine pasture: the real HDR, near grass from scanned clumps and dandelions ----------
const ALPS_SUN = (() => { const im = ALPS.tex.image, d = im.data, w = im.width, h = im.height; let best = -1, bi = 0; const toF = d instanceof Uint16Array ? THREE.DataUtils.fromHalfFloat : (x) => x;
  for (let y = 0; y < h / 2; y++) for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4; const L = toF(d[i]) * 0.3 + toF(d[i + 1]) * 0.59 + toF(d[i + 2]) * 0.11; if (L > best) { best = L; bi = y * w + x; } }
  const phi = ((bi % w + 0.5) / w - 0.5) * 2 * Math.PI, lat = (0.5 - (Math.floor(bi / w) + 0.5) / h) * Math.PI; return V(Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat)); })();
const FADE = (() => { const [c, g] = mkCanvas(512, 512); const gr = g.createRadialGradient(256, 256, 60, 256, 256, 256); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); return new THREE.CanvasTexture(c); })();
function pasture(sc, { sun = 2.6, n = 120, r = 3.2, seed = 3 } = {}) {
  sc.environment = ALPS.env; sc.environmentIntensity = 0.9; sc.background = new THREE.Color(0x9fc0e0);
  const sky = new GroundProjectedSkybox(ALPS.tex); sky.scale.setScalar(200); sky.height = 1.7; sky.radius = 200; sc.add(sky);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), pbrMat(TX.grass, { rep: [10, 10], color: 0xd8e0c8, transparent: true, alphaMap: FADE, depthWrite: true })); ground.rotation.x = -Math.PI / 2; ground.position.y = 0.003; ground.receiveShadow = true; sc.add(ground);
  const clumps = [], src = model('grass_medium_01'), dand = model('dandelion_01'); src.traverse(o => { if (o.isMesh) clumps.push(o); }); const dl = []; dand.traverse(o => { if (o.isMesh) dl.push(o); });
  const rr = rng(seed); for (let i = 0; i < n; i++) { const m = (rr() < 0.12 ? dl : clumps)[Math.floor(rr() * (rr() < 0.12 ? dl.length : clumps.length))]; if (!m) continue; const c = new THREE.Mesh(m.geometry, m.material); const a = rr() * 6.28, d = 0.2 + Math.sqrt(rr()) * r; c.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); c.rotation.y = rr() * 6.28; c.scale.setScalar(1.4 + rr() * 1.4); c.castShadow = true; c.receiveShadow = true; sc.add(c); }
  const sunL = new THREE.DirectionalLight(0xfff2e0, sun); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048); Object.assign(sunL.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 1, far: 30 }); sunL.shadow.bias = -0.0003; sunL.shadow.normalBias = 0.02; sunL.userData.soft = 0.12; sc.add(sunL, sunL.target);
  sunL.userData.aim = (c, d = 10) => { sunL.position.copy(c).addScaledVector(ALPS_SUN, d); sunL.target.position.copy(c); sunL.target.updateMatrixWorld(); }; sunL.userData.aim(V(0, 0.8, 0));
  return { sun: sunL, sky };
}

// ---------- the stomach: one organ, four rooms (body-local, metres) ----------
function sac(len, r0, r1, bend = 0, seg = 48) { const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = (x + 1) / 2, r = lerp(r0, r1, k); p.setXYZ(i, x * len / 2, y * r + bend * x * x * len * 0.15, z * r); }
  g.computeVertexNormals(); const col = new Float32Array(p.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; }
function stomach4() { const g = new THREE.Group(), ser = tissueMat('serosa', { rep: [3, 2], wet: 0.8 });
  const rumenD = new THREE.Mesh(sac(0.62, 0.17, 0.2, 0.1), ser); rumenD.position.set(-0.18, 0.08, -0.08); g.add(rumenD);
  const rumenV = new THREE.Mesh(sac(0.58, 0.15, 0.17, -0.05), ser); rumenV.position.set(-0.22, -0.12, -0.08); g.add(rumenV);
  const ret = new THREE.Mesh(sac(0.2, 0.1, 0.11), tissueMat('serosa', { rep: [2, 1], wet: 0.8, color: 0xe0b0a0 })); ret.position.set(0.17, -0.1, -0.04); g.add(ret);
  const oma = new THREE.Mesh(new THREE.SphereGeometry(0.11, 40, 30), tissueMat('colon', { rep: [2, 1], wet: 0.8, vertexColors: false })); oma.position.set(0.12, -0.02, 0.17); g.add(oma);
  const abo = new THREE.Mesh(sac(0.42, 0.06, 0.1, 0.25), tissueMat('serosa', { rep: [3, 1], wet: 0.85, color: 0xf0c0b0 })); abo.position.set(-0.02, -0.22, 0.16); abo.rotation.y = 0.35; g.add(abo);
  const eso = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.55, 0.2, 0), V(0.38, 0.12, -0.02), V(0.22, 0.04, -0.05)]), 30, 0.03, 12), tissueMat('colon', { rep: [3, 1], vertexColors: false })); g.add(eso);
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); g.userData = { rooms: [rumenD, ret, oma, abo], rumenV, eso }; return g; }

// ---------- inside the rooms ----------
function insideLight(sc, color = 0xffe0d0, I = 2.0) { sc.background = new THREE.Color(0x0a0404); sc.environment = STUDIO.env; sc.environmentIntensity = 0.5; const p = new THREE.PointLight(color, I, 3, 1.2); p.position.set(0.1, 0.12, 0.3); sc.add(p); const k = new THREE.DirectionalLight(0xfff0e0, 0.8); k.position.set(0.3, 1, 0.6); sc.add(k); return p; }
// the rumen: a chamber lined with papillae, full of green fibre, microbes chewing it apart
function rumenInside(sc) { insideLight(sc, 0xffd8b8); const m = tissueMat('villi', { rep: [10, 6], wet: 0.9, side: THREE.BackSide, color: 0xb0905a, vertexColors: false });
  const wall = new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 48), m); sc.add(wall); sc.fog = new THREE.FogExp2(0x2a2410, 2.2);
  const r = rng(5), fib = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ color: 0x6a8a2a, roughness: 0.6, clearcoat: 0.4 }), 260), F = [];
  for (let i = 0; i < 260; i++) { F.push({ p: V((r() - 0.5) * 0.5, (r() - 0.5) * 0.35, (r() - 0.5) * 0.4 - 0.1), rot: V(r() * 6, r() * 6, r() * 6), L: 0.03 + r() * 0.06, ph: r() * 6 }); fib.setColorAt(i, new THREE.Color().setHSL(0.2 + r() * 0.06, 0.5, 0.25 + r() * 0.15)); } sc.add(fib);
  const mic = new THREE.InstancedMesh(new THREE.CapsuleGeometry(1, 2.4, 4, 8), new THREE.MeshPhysicalMaterial({ color: 0xd8c890, roughness: 0.4, transparent: true, opacity: 0.9, emissive: 0x302810, emissiveIntensity: 0.6 }), 400), M = [];
  for (let i = 0; i < 400; i++) M.push({ f: Math.floor(r() * 260), o: V((r() - 0.5), (r() - 0.5), (r() - 0.5)).normalize().multiplyScalar(0.004 + r() * 0.004), s: 0.0008 + r() * 0.0006, ph: r() * 6 }); sc.add(mic);
  const o = new THREE.Object3D();
  return (t, eat = 0) => { F.forEach((f, i) => { o.position.copy(f.p).add(V(0.01 * Math.sin(t * 0.4 + f.ph), 0.008 * Math.sin(t * 0.3 + f.ph * 2), 0)); o.rotation.set(f.rot.x + t * 0.05, f.rot.y, f.rot.z); const sh = 1 - 0.55 * eat * smooth(0, 1, (i % 7) / 7 + eat - 0.5); o.scale.set(f.L * sh, 0.004 * sh, 0.0025); o.updateMatrix(); fib.setMatrixAt(i, o.matrix); }); fib.instanceMatrix.needsUpdate = true;
    M.forEach((m, i) => { const f = F[m.f]; o.position.copy(f.p).add(m.o).add(V(0.002 * Math.sin(t * 3 + m.ph), 0.002 * Math.cos(t * 2.6 + m.ph), 0)); o.rotation.set(m.ph, t + m.ph, 0); o.scale.setScalar(m.s); o.updateMatrix(); mic.setMatrixAt(i, o.matrix); }); mic.instanceMatrix.needsUpdate = true; }; }
// the reticulum: a honeycomb lining
const HONEY = (() => { const S = 1024, [c, g] = mkCanvas(S, S), [hc, hg] = mkCanvas(S, S); g.fillStyle = '#8c5a48'; g.fillRect(0, 0, S, S); hg.fillStyle = '#202020'; hg.fillRect(0, 0, S, S); const R = 46, r = rng(4);
  for (let row = -1; row < S / (R * 1.5) + 2; row++) for (let col = -1; col < S / (R * 1.732) + 2; col++) { const cx = col * R * 1.732 + (row % 2) * R * 0.866, cy = row * R * 1.5;
    for (const [G, fill, lw] of [[hg, '#e0e0e0', 9], [g, '#c4917a', 9]]) { G.strokeStyle = fill; G.lineWidth = lw; G.beginPath(); for (let k = 0; k <= 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; k ? G.lineTo(x, y) : G.moveTo(x, y); } G.stroke(); }
    g.fillStyle = `rgba(90,50,40,${0.2 + r() * 0.3})`; g.beginPath(); g.arc(cx, cy, R * 0.55, 0, 6.29); g.fill(); }
  const [bc, bg] = mkCanvas(S, S); bg.filter = 'blur(3px)'; bg.drawImage(hc, 0, 0); return { map: texOf(c), normalMap: heightToNormal(bc, 5) }; })();
function honeycombInside(sc) { insideLight(sc, 0xffd0c0); const m = new THREE.MeshPhysicalMaterial({ map: HONEY.map, normalMap: HONEY.normalMap, normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.1, side: THREE.BackSide });
  [m.map, m.normalMap].forEach(t => { t.repeat.set(4, 3); }); const wall = new THREE.Mesh(new THREE.SphereGeometry(0.3, 64, 48), m); sc.add(wall); sc.fog = new THREE.FogExp2(0x200a06, 2.5);
  const r = rng(8), bits = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ color: 0x5f7a26, roughness: 0.6, clearcoat: 0.4 }), 120), B = []; for (let i = 0; i < 120; i++) B.push({ p: V((r() - 0.5) * 0.3, (r() - 0.5) * 0.2, -0.05 - r() * 0.15), L: 0.006 + r() * 0.02, a: V(r() * 6, r() * 6, r() * 6) }); sc.add(bits); const o = new THREE.Object3D();
  return (t) => { B.forEach((b, i) => { o.position.copy(b.p).add(V(0.003 * Math.sin(t + i), 0.004 * Math.sin(t * 0.7 + i), 0)); o.rotation.set(b.a.x + t * 0.2, b.a.y, b.a.z); o.scale.set(b.L, 0.002, 0.0015); o.updateMatrix(); bits.setMatrixAt(i, o.matrix); }); bits.instanceMatrix.needsUpdate = true; }; }
// the omasum: many leaves, pressed together to squeeze out the water
function omasumLeaves(sc) { insideLight(sc, 0xffe0d0); const m = tissueMat('mucosa', { rep: [2, 2], wet: 1, vertexColors: false, color: 0xd8b8a8, side: THREE.DoubleSide }); const leaves = [];
  for (let i = 0; i < 16; i++) { const g = new THREE.SphereGeometry(0.12, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.15, 1); const l = new THREE.Mesh(g, m); l.rotation.x = Math.PI / 2; sc.add(l); leaves.push(l); }
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0xd8e4ff, roughness: 0.02, transmission: 0, transparent: true, opacity: 0.7, clearcoat: 1 }), 80), D = [], r = rng(6); for (let i = 0; i < 80; i++) D.push({ x: (r() - 0.5) * 0.2, z: (r() - 0.5) * 0.25, t0: r() * 3, s: 0.002 + r() * 0.003 }); sc.add(drops); const o = new THREE.Object3D();
  return (t, sq = 0) => { leaves.forEach((l, i) => { l.position.set(0, 0, -0.18 + i * lerp(0.024, 0.011, sq)); l.scale.setScalar(1 - 0.02 * i); }); D.forEach((d, i) => { const a = ((t - d.t0) % 1.2 + 1.2) % 1.2; o.position.set(d.x, 0.05 - a * a * 0.4, d.z); o.scale.set(d.s, d.s * 1.3, d.s); o.updateMatrix(); drops.setMatrixAt(i, o.matrix); }); drops.instanceMatrix.needsUpdate = true; drops.material.opacity = 0.7 * sq; }; }
// the abomasum: folds of lining and a pool of acid, fizzing
function abomasumInside(sc) { insideLight(sc, 0xffc8b0, 5); const m = tissueMat('mucosa', { rep: [8, 4], wet: 1, vertexColors: false, side: THREE.BackSide });
  const g = new THREE.CylinderGeometry(0.22, 0.22, 1.2, 64, 60, true); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x); const k = 1 + 0.1 * Math.pow(Math.abs(Math.sin(a * 6 + y * 4)), 6); p.setXYZ(i, x * k, y, z * k); } g.computeVertexNormals(); g.rotateZ(Math.PI / 2);
  const tunnel = new THREE.Mesh(g, m); sc.add(tunnel); sc.fog = new THREE.FogExp2(0x200806, 0.9); const p2 = new THREE.PointLight(0xffd0b8, 3, 2, 1.2); p2.position.set(-0.3, 0.08, 0); sc.add(p2);
  const acid = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.34), new THREE.MeshPhysicalMaterial({ color: 0xd8c080, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.8, emissive: 0x302808, emissiveIntensity: 0.5 })); acid.rotation.x = -Math.PI / 2; acid.position.y = -0.12; sc.add(acid);
  const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0xfff2c8, roughness: 0.05, transparent: true, opacity: 0.6, clearcoat: 1 }), 120), Bs = [], r = rng(12); for (let i = 0; i < 120; i++) Bs.push({ x: (r() - 0.5) * 0.8, z: (r() - 0.5) * 0.28, t0: r() * 2, s: 0.002 + r() * 0.004 }); sc.add(bub); const o = new THREE.Object3D();
  return (t) => { Bs.forEach((b, i) => { const a = ((t - b.t0) % 1.6 + 1.6) % 1.6; o.position.set(b.x, -0.125 + a * 0.02, b.z); o.scale.setScalar(b.s * (a < 1.4 ? 1 : 0.2)); o.updateMatrix(); bub.setMatrixAt(i, o.matrix); }); bub.instanceMatrix.needsUpdate = true; }; }
// a bathtub (enamel), to show how big the rumen is
function bathtub() { const g = new THREE.Group(), en = new THREE.MeshPhysicalMaterial({ color: 0xf4f2ee, roughness: 0.12, clearcoat: 1 });
  const prof = [[0.0, 0.05], [0.32, 0.06], [0.36, 0.12], [0.37, 0.55], [0.39, 0.58], [0.355, 0.58], [0.335, 0.54], [0.33, 0.14], [0.29, 0.1], [0.0, 0.1]].map(([r, y]) => new THREE.Vector2(r, y));
  const tub = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), en); tub.scale.set(2.2, 1, 1.05); tub.castShadow = tub.receiveShadow = true; g.add(tub);
  const fm = new THREE.MeshPhysicalMaterial({ color: 0xc8a050, roughness: 0.3, metalness: 1 }); for (const [x, z] of [[0.6, 0.25], [0.6, -0.25], [-0.6, 0.25], [-0.6, -0.25]]) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), fm); f.position.set(x, 0.04, z); g.add(f); }
  return g; }
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
