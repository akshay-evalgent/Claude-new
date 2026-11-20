// =====================================================================
// THE OTHER SETS: a breath plume (soft puffs and CO2 molecules), callouts, the microscopic skin surface (µm) with
// skin flakes, a hair, oil and bacteria, nylon stockings (sleeve and magnified knit), the two-choice olfactometer
// with a swarm of small mosquitoes.
// =====================================================================
// a soft, lumpy puff (alpha) for breath and scent
const PUFF_T = (() => { const [c, g] = mkCanvas(256, 256), r = rng(41); for (let i = 0; i < 40; i++) { const x = 128 + (r() - 0.5) * 110, y = 128 + (r() - 0.5) * 110, rr = 30 + r() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  const im = g.getImageData(0, 0, 256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const d = Math.hypot(x - 128, y - 128) / 128, k = (y * 256 + x) * 4; im.data[k + 3] *= clamp(1 - d) ** 1.5; } g.putImageData(im, 0, 0); return texOf(c, false); })();
// camera-facing puffs: update(cam, fn(i) -> {p, s, c (THREE.Color, additive)})
function puffs(n, { tex = PUFF_T, additive = true } = {}) { const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: true }), n);
  m.frustumCulled = false; m.userData.noDof = false; m.renderOrder = 5; const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), rq = new THREE.Quaternion(); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  m.userData.update = (cam, fn) => { let k = 0; cam.getWorldQuaternion(q); for (let i = 0; i < n; i++) { const d = fn(i); if (!d) continue; rq.setFromAxisAngle(V(0, 0, 1), d.rot ?? i * 1.7); M4.compose(d.p, q.clone().multiply(rq), V(d.s, d.s, d.s)); m.setMatrixAt(k, M4); m.setColorAt(k, d.c); k++; }
    m.count = k; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; };
  return m; }
// ---------- the breath plume (park coordinates, cm): from a face at the table, carried downwind and meandering ----------
const FACE = V(-12, 118, 44), WIND = V(0.25, -0.03, -1).normalize();
const plumeAt = (s, t, side = null) => { const sd = side || V(WIND.z, 0, -WIND.x); return FACE.clone().addScaledVector(WIND, s).addScaledVector(sd, Math.sin(s / 140 - t * 0.6) * 0.09 * s).add(V(0, Math.sin(s / 90 - t * 0.9) * 0.025 * s - 0.004 * s, 0)); };
const plumeR = (s) => 3 + 0.075 * s;
function plume(sc, n = 500, smax = 1100, { co2 = 0, molScale = 0.35, bright = 1 } = {}) { const P = puffs(n); sc.add(P); const r = rng(77), D = []; for (let i = 0; i < n; i++) D.push({ s0: r() * smax, a: r() * 6.28, rr: Math.sqrt(r()), sz: 0.5 + r() * 0.8, ph: r() * 6.28 });
  const mol = co2 ? molCloud([CO2_GEO], co2) : null; if (mol) sc.add(mol); const MD = []; for (let i = 0; i < co2; i++) MD.push({ s0: r() * 260, a: r() * 6.28, rr: Math.sqrt(r()), rot: V(r() * 6, r() * 6, r() * 6), w: V(r() - 0.5, r() - 0.5, r() - 0.5) });
  const sd = V(WIND.z, 0, -WIND.x), up = V(0, 1, 0);
  return { P, mol, update(cam, t, { sRange = [0, smax], molRange = [0, 260], molAt = 0 } = {}) {
    P.userData.update(cam, (i) => { const d = D[i], s = (d.s0 + t * 40) % smax; if (s < sRange[0] || s > sRange[1]) return null; const R = plumeR(s) * d.rr, c = plumeAt(s, t).addScaledVector(sd, Math.cos(d.a + t * 0.3) * R).addScaledVector(up, Math.sin(d.a + t * 0.3) * R * 0.6);
      const sz = plumeR(s) * 1.4 * d.sz, k = bright * 0.11 * smooth(0, 30, s) * (1 - 0.7 * s / smax) * (0.7 + 0.3 * Math.sin(t * 2 + d.ph)) * smooth(0.25, 1.0, cam.position.distanceTo(c) / sz); return { p: c, s: sz, c: new THREE.Color(0.55 * k, 0.75 * k, 1.0 * k) }; });
    if (mol) mol.userData.update((i) => { const d = MD[i], s = molAt + (d.s0 + t * 40) % 260 - 130; const R = plumeR(Math.max(s, 0)) * d.rr * 0.7, c = plumeAt(Math.max(s, 0), t).addScaledVector(sd, Math.cos(d.a) * R).addScaledVector(up, Math.sin(d.a) * R * 0.6);
      return { p: c, s: molScale, rot: d.rot.clone().addScaledVector(d.w, t * 2.5) }; }); } };
}
// ---------- callouts: a ring around something small, a measuring line with a label ----------
const RING_T = (() => { const [c, g] = mkCanvas(256, 256); g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 8; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.stroke(); return texOf(c); })();
function ring(size) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: RING_T, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); m.renderOrder = 19; m.userData.noDof = true; return m; }
function measureLine(a, b, r = 0.5) { const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const d = b.clone().sub(a), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
  const line = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), mat); line.position.copy(lv(a, b, 0.5)); line.quaternion.copy(q); line.scale.set(1, L, 1); g.add(line);
  for (const e of [a, b]) { const tick = new THREE.Mesh(new THREE.SphereGeometry(r * 2.6, 12, 8), mat); tick.position.copy(e); g.add(tick); }
  g.traverse(o => { if (o.isMesh) { o.renderOrder = 19; o.userData.noDof = true; } }); g.userData = { line, mat, a, b, L, q };
  g.userData.grow = (k) => { const e = lv(a, b, k); line.position.copy(lv(a, e, 0.5)); line.scale.set(1, Math.max(L * k, 1e-3), 1); g.children[2].position.copy(e); g.children[2].visible = k > 0.98; };
  return g; }

// ---------- the microscopic skin surface (µm): flakes of dead skin, furrows, a hair follicle with a hair ----------
function skinHeight(x, z) {
  const S = 38, gx = Math.floor(x / S), gz = Math.floor(z / S); let d1 = 1e9, d2 = 1e9, own = null;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const cx = gx + a, cz = gz + b, jx = (cx + h3(cx, cz, 1)) * S, jz = (cz + h3(cx, cz, 2)) * S, d = Math.hypot(x - jx, z - jz);
    if (d < d1) { d2 = d1; d1 = d; own = [cx, cz, jx, jz]; } else if (d < d2) d2 = d; }
  const e = d2 - d1, [cx, cz, jx, jz] = own; let h = (h3(cx, cz, 3) - 0.5) * 2.2 + ((x - jx) * (h3(cx, cz, 4) - 0.5) + (z - jz) * (h3(cx, cz, 5) - 0.5)) * 0.07;
  h += 0.9 * clamp(1 - e / 2.2) * (h3(cx, cz, 6) > 0.5 ? 1 : -1.4);   // flake edges lift or tuck
  for (const [ang, sp, ph] of [[0.6, 180, 20], [-0.7, 210, 70]]) { const u = x * Math.cos(ang) + z * Math.sin(ang) + ph, dd = ((u % sp) + sp) % sp - sp / 2; h -= 13 * Math.exp(-(((dd + 4 * Math.sin(x * 0.01)) / 11) ** 2)); }
  const df = Math.hypot(x, z); h -= 26 * Math.exp(-((df / 27) ** 2)); h += 3 * Math.exp(-(((df - 40) / 9) ** 2));
  return h; }
const CUTICLE_N = heightToNormal(hCanvas(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { const y0 = i * h / 8; const gr = g.createLinearGradient(0, y0, 0, y0 + h / 8); gr.addColorStop(0, '#d0d0d0'); gr.addColorStop(0.85, '#6a6a6a'); gr.addColorStop(1, '#d8d8d8'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, y0); for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.05 + i) * 4 + Math.sin(x * 0.13 + i * 2) * 2); g.lineTo(w, y0 + h / 8 + 4); g.lineTo(0, y0 + h / 8 + 4); g.fill(); } }), 2.5);
function microSkin(sc, { size = 700, seg = 300, cx = 0, cz = 0, hair = true } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, z = p.getZ(i) + cz, h = skinHeight(x, z); p.setXYZ(i, x, h, z); const S = 38, k = 0.86 + 0.14 * h3(Math.floor(x / S + 0.5), Math.floor(z / S + 0.5), 9) + clamp(h / 30, -0.35, 0.05);
    col.set([k, k * 0.93, k * 0.88], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xead2bf, vertexColors: true, roughness: 0.58, sheen: 0.6, sheenColor: new THREE.Color(0xfff0e6), sheenRoughness: 0.5, normalMap: rep(GRAIN_N, size / 40, size / 40), normalScale: V2(0.35, 0.35), emissive: 0x2a1008, emissiveIntensity: 0.15 }));
  m.receiveShadow = m.castShadow = true; sc.add(m);
  let shaft = null; if (hair) { shaft = new THREE.Mesh(new THREE.CylinderGeometry(19, 21, 1400, 48, 1, false), new THREE.MeshPhysicalMaterial({ color: 0x9a6a44, roughness: 0.33, clearcoat: 0.7, clearcoatRoughness: 0.2, normalMap: rep(CUTICLE_N, 3, 22), normalScale: V2(0.9, 0.9), sheen: 0.6, sheenColor: new THREE.Color(0xffd0a0), emissive: 0x1a0a04, emissiveIntensity: 0.3 }));
    shaft.geometry.translate(0, 700, 0); shaft.position.set(0, -24, 0); shaft.rotation.set(0, 0, -0.85); shaft.castShadow = shaft.receiveShadow = true; sc.add(shaft); }
  return { m, shaft };
}
const SEBUM_M = () => new THREE.MeshPhysicalMaterial({ color: 0xf2d48a, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.78, ior: 1.47, envMapIntensity: 1.6, emissive: 0x3a2808, emissiveIntensity: 0.25 });
function microLight(sc, { env = 0.75, key = 2.2, bg = 0x140c09, fog = 0.0016 } = {}) { sc.background = new THREE.Color(bg); sc.environment = STUDIO.env; sc.environmentIntensity = env; sc.fog = new THREE.FogExp2(bg, fog);
  const k = new THREE.DirectionalLight(0xfff0e0, key); k.position.set(-300, 420, 260); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -400, right: 400, top: 400, bottom: -400, near: 10, far: 2000 }); k.shadow.bias = -0.0004; k.userData.soft = 12; sc.add(k);
  const rim = new THREE.DirectionalLight(0xbfd8ff, key * 0.5); rim.position.set(300, 160, -400); sc.add(rim); return { k, rim }; }
// bacteria on the skin: grape-like clusters of cocci and rods
function bacteria(sc, n = 30, area = 60, seed = 9, cx = 0, cz = 0) { const r = rng(seed), spheres = [], rods = [];
  for (let i = 0; i < n; i++) { const x = cx + (r() - 0.5) * area, z = cz + (r() - 0.5) * area; if (r() < 0.6) { const k = 5 + Math.floor(r() * 14); for (let j = 0; j < k; j++) { const a = r() * 6.28, d = Math.sqrt(r()) * 1.4, xx = x + Math.cos(a) * d, zz = z + Math.sin(a) * d, rr = 0.42 + r() * 0.1; spheres.push([V(xx, skinHeight(xx, zz) + rr + (r() < 0.3 ? 0.7 : 0), zz), rr]); } }
    else { const k = 1 + Math.floor(r() * 3), a = r() * 6.28; for (let j = 0; j < k; j++) { const len = 1.3 + r() * 0.9, xx = x + Math.cos(a) * j * (len + 0.5), zz = z + Math.sin(a) * j * (len + 0.5); rods.push([V(xx, skinHeight(xx, zz) + 0.33, zz), a + (r() - 0.5) * 0.4, len]); } } }
  const sm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0xe8cc7a, roughness: 0.45, sheen: 0.9, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.4, clearcoat: 0.3, emissive: 0x2a1e08, emissiveIntensity: 0.35, normalMap: rep(GRAIN_N, 1, 1), normalScale: V2(0.3, 0.3) }), spheres.length);
  const M4 = new THREE.Matrix4(); spheres.forEach(([p, rr], i) => { M4.compose(p, new THREE.Quaternion(), V(rr, rr * 0.96, rr)); sm.setMatrixAt(i, M4); });
  const rm = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.33, 1, 6, 12), new THREE.MeshPhysicalMaterial({ color: 0xb6c696, roughness: 0.45, sheen: 0.9, sheenColor: new THREE.Color(0xffffff), clearcoat: 0.3, emissive: 0x16200c, emissiveIntensity: 0.35 }), rods.length);
  rods.forEach(([p, a, len], i) => { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, Math.PI / 2)); M4.compose(p, q, V(1, len, 1)); rm.setMatrixAt(i, M4); });
  [sm, rm].forEach(m => { m.castShadow = m.receiveShadow = true; sc.add(m); }); return { sm, rm, spheres, rods }; }

// ---------- nylon ----------
// knit loops of a sheer stocking (one tile = 6 x 6 loops), alpha between the yarns
const KNIT_T = (() => { const [c, g] = mkCanvas(512, 512), n = 6, w = 512 / n; g.lineCap = 'round'; g.fillStyle = 'rgba(120,78,52,0.22)'; g.fillRect(0, 0, 512, 512);
  for (let pass = 0; pass < 2; pass++) for (let j = -1; j <= n; j++) for (let i = -1; i <= n; i++) { const x = i * w + (j % 2 ? 0 : 0), y = j * w;
    g.strokeStyle = pass ? 'rgba(250,215,185,0.6)' : 'rgba(118,72,46,0.95)'; g.lineWidth = pass ? 2.6 : 11;
    g.beginPath(); g.moveTo(x + w * 0.12, y + w * 1.02); g.bezierCurveTo(x + w * 0.2, y + w * 0.5, x + w * 0.05, y + w * 0.05, x + w * 0.5, y + w * 0.02); g.bezierCurveTo(x + w * 0.95, y + w * 0.05, x + w * 0.8, y + w * 0.5, x + w * 0.88, y + w * 1.02); g.stroke(); }
  return texOf(c); })();
const nylonMat = (repx, repy) => new THREE.MeshPhysicalMaterial({ map: rep(KNIT_T, repx, repy), transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.4, sheen: 1.0, sheenColor: new THREE.Color(0xffc8a0), sheenRoughness: 0.35, clearcoat: 0.25 });
// a stocking pulled over the forearm up to x = end, finished with a denser elastic cuff
function nylonSleeve(arm, len = 22, end = 4) { const { rx, ry } = arm.userData, g = new THREE.Group(), L = arm.userData.len, circ = Math.PI * (rx + ry);
  const tube = (x0, x1, off, mat) => { const geo = new THREE.CylinderGeometry(1, 1, x1 - x0, 256, 30, true); geo.rotateZ(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, 0);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), taper = 1 - 0.06 * (x / L + 0.5), bulge = off(x); p.setXYZ(i, x, p.getY(i) * (ry * taper + bulge), p.getZ(i) * (rx * taper + bulge)); } geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.userData.dofMap = mat.map; g.add(m); return m; };
  tube(end - len, end - 1.1, () => 0.018, nylonMat(circ / 0.36, (len - 1.1) / 0.36));
  const cuffM = nylonMat(circ / 0.12, 1.1 / 0.12); cuffM.color = new THREE.Color(0x8a6048); cuffM.map.repeat.set(circ / 0.12, 1.1 / 0.12);
  tube(end - 1.1, end, (x) => 0.03 + 0.012 * Math.sin(Math.PI * clamp((x - end + 1.1) / 1.1)), cuffM);
  return g; }
// the magnified knit (µm): yarns of twisted filaments in interlocking loops
function knitFibers(sc, { wales = 7, courses = 8, ws = 360, cs = 300 } = {}) { const g = new THREE.Group(), mat = new THREE.MeshPhysicalMaterial({ color: 0xc89a78, roughness: 0.32, sheen: 1.0, sheenColor: new THREE.Color(0xffe0c8), sheenRoughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2, transmission: 0, emissive: 0x24140a, emissiveIntensity: 0.4 });
  for (let j = 0; j < courses; j++) { const yarn = (t) => V(ws * t + 100 * Math.sin(2 * Math.PI * t), cs * j - 175 * Math.cos(2 * Math.PI * t), 45 * Math.cos(4 * Math.PI * t) + 20 * Math.sin(2 * Math.PI * t));
    const N = wales * 40; for (let f = 0; f < 6; f++) { const pts = []; for (let i = 0; i <= N; i++) { const t = i / N * wales - 0.5, c = yarn(t), d = yarn(t + 0.002).sub(c).normalize(), a = d.clone().cross(V(0, 0, 1)).normalize(), b = d.clone().cross(a).normalize(), th = f / 6 * 6.28 + t * 9;
      pts.push(c.add(a.multiplyScalar(Math.cos(th) * 13)).add(b.multiplyScalar(Math.sin(th) * 13))); }
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, 7.5, 6), mat); m.castShadow = m.receiveShadow = true; g.add(m); } }
  g.position.set(-ws * wales / 2, -cs * courses / 2, 0); sc.add(g); return g; }

// ---------- the two-choice olfactometer on a lab bench (cm) ----------
const ACRYL = () => new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, roughness: 0.03, transparent: true, opacity: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4 });
const EDGE_M = () => new THREE.MeshPhysicalMaterial({ color: 0xb8c8d0, roughness: 0.15, transparent: true, opacity: 0.4, clearcoat: 1, envMapIntensity: 0.9 });
function acrylBox(w, h, d) { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ACRYL())); const e = EDGE_M(), t = 0.7;
  for (const [sx, sy, sz, px, py, pz] of [[w, t, t, 0, 1, 1], [w, t, t, 0, 1, -1], [w, t, t, 0, -1, 1], [w, t, t, 0, -1, -1], [t, h, t, 1, 0, 1], [t, h, t, 1, 0, -1], [t, h, t, -1, 0, 1], [t, h, t, -1, 0, -1], [t, t, d, 1, 1, 0], [t, t, d, 1, -1, 0], [t, t, d, -1, 1, 0], [t, t, d, -1, -1, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), e); m.position.set(px * w / 2, py * h / 2, pz * d / 2); g.add(m); }
  return g; }
function stockingRag(w = 11, h = 15, seed = 1) { const geo = new THREE.PlaneGeometry(w, h, 40, 50), p = geo.attributes.position, r = rng(seed), f = [r() * 6, r() * 6, r() * 6];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), k = (h / 2 - y) / h; p.setZ(i, Math.sin(x * 0.9 + f[0]) * 0.9 * k + Math.sin(x * 2.1 + y * 0.3 + f[1]) * 0.35 * k + Math.sin(y * 0.7 + f[2]) * 0.4); p.setX(i, x * (1 - 0.35 * (1 - k))); }
  geo.computeVertexNormals(); const m = new THREE.Mesh(geo, nylonMat(w / 0.5, h / 0.5)); m.castShadow = true; m.userData.dofMap = m.material.map; return m; }
// small mosquitoes for the crowd: a dark body and a pale blur of wings
const MINI_BODY = (() => { const parts = [], sph = new THREE.SphereGeometry(1, 10, 8), cyl = new THREE.CylinderGeometry(1, 1, 1, 4, 1), dk = new THREE.Color(0x141110);
  parts.push([sph, dk, new THREE.Matrix4().compose(V(0.02, 0, 0), new THREE.Quaternion(), V(0.08, 0.06, 0.05))], [sph, dk, new THREE.Matrix4().compose(V(-0.18, -0.01, 0), new THREE.Quaternion(), V(0.17, 0.035, 0.035))], [sph, dk, new THREE.Matrix4().compose(V(0.11, -0.02, 0), new THREE.Quaternion(), V(0.035, 0.035, 0.035))]);
  parts.push([cyl, dk, new THREE.Matrix4().compose(V(0.22, -0.06, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 1.2)), V(0.006, 0.22, 0.006))]);
  for (const s of [-1, 1]) for (const [x, a] of [[0.05, 0.5], [0, 0], [-0.04, -0.6]]) parts.push([cyl, dk, new THREE.Matrix4().compose(V(x - Math.sin(a) * 0.15, -0.2, s * 0.14), new THREE.Quaternion().setFromEuler(new THREE.Euler(s * 0.7, 0, a)), V(0.005, 0.5, 0.005))]);
  return mergeColored(parts); })();
function swarm(sc, n, scale = 1) { const body = new THREE.InstancedMesh(MINI_BODY, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.45, clearcoat: 0.4 }), n);
  const wg = new THREE.PlaneGeometry(0.34, 0.5); const wing = new THREE.InstancedMesh(wg, new THREE.MeshBasicMaterial({ map: PUFF_T, color: 0x6a6e78, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), n);
  [body, wing].forEach(m => { m.frustumCulled = false; sc.add(m); }); body.castShadow = true; const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  return { body, wing, update(fn) { let k = 0; for (let i = 0; i < n; i++) { const d = fn(i); if (!d) continue; const dir = d.v.clone().setY(0); const yaw = Math.atan2(-dir.z, dir.x);
      q.setFromEuler(new THREE.Euler(0, yaw, 0.1)); M4.compose(d.p, q, V(scale, scale, scale)); body.setMatrixAt(k, M4); q2.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, yaw)); M4.compose(d.p.clone().add(V(0, 0.06 * scale, 0)), q2, V(scale * 1.6, scale * 1.6, scale)); wing.setMatrixAt(k, M4); k++; }
    body.count = wing.count = k; body.instanceMatrix.needsUpdate = wing.instanceMatrix.needsUpdate = true; } }; }
function olfactometer(sc, { env = 0.9 } = {}) { sc.environment = LAB.env; sc.environmentIntensity = env; sc.background = LAB.tex; sc.backgroundIntensity = 0.8;
  const bench = new THREE.Mesh(new THREE.BoxGeometry(260, 6, 90), new THREE.MeshPhysicalMaterial({ map: woodTex('#6a4a30', '#3a2818', 3, [3, 1], 6), roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3 })); bench.position.set(0, -3, 0); bench.receiveShadow = true; sc.add(bench);
  const g = new THREE.Group(); sc.add(g);
  const start = acrylBox(18, 18, 18); start.position.set(0, 9, 0); g.add(start);
  const tubes = []; for (const s of [-1, 1]) { const tu = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 30, 48, 1, true), ACRYL()); tu.rotation.z = Math.PI / 2; tu.position.set(s * 24, 9, 0); g.add(tu); tubes.push(tu);
    for (const e of [-1, 1]) { const rimm = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.45, 10, 40), EDGE_M()); rimm.rotation.y = Math.PI / 2; rimm.position.set(s * 24 + e * 15, 9, 0); g.add(rimm); } }
  const boxes = []; for (const s of [-1, 1]) { const b = acrylBox(22, 22, 22); b.position.set(s * 50, 11, 0); g.add(b); boxes.push(b); const rag = stockingRag(11, 15, s > 0 ? 3 : 1); rag.position.set(s * 52, 11.5, 0); rag.rotation.y = s * 1.3; g.add(rag);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 1.2), new THREE.MeshPhysicalMaterial({ color: 0x2a2a2e, roughness: 0.3, metalness: 0.6 })); clip.position.set(s * 52, 19.3, 0); g.add(clip); }
  const key = new THREE.DirectionalLight(0xfff4e8, 1.6); key.position.set(-80, 160, 120); key.target.position.set(0, 8, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -90, right: 90, top: 60, bottom: -60, near: 20, far: 500 }); key.shadow.bias = -0.0003; key.userData.soft = 4; sc.add(key, key.target);
  return { g, boxes, tubes, key };
}
// a mosquito's flight in the olfactometer: from the start box, through one tube, then circling the stocking in that box
function olfPath(tau, side, r, i) { const jit = V(Math.sin(tau * 7 + i) * 0.8, Math.sin(tau * 5.3 + i * 2) * 0.8, Math.cos(tau * 6.1 + i) * 0.8);
  const s0 = V((r[0] - 0.5) * 12, 3 + r[1] * 12, (r[2] - 0.5) * 12);
  if (tau <= 0) return { p: s0.clone().add(jit.clone().multiplyScalar(0.5)), v: V(Math.cos(tau * 3 + i), 0, Math.sin(tau * 3 + i)) };
  const a = V(side * 9, 9, 0), b = V(side * 39, 9, 0), c = V(side * 52 + (r[3] - 0.5) * 6, 8 + r[4] * 8, (r[5] - 0.5) * 10);
  let p; if (tau < 0.6) p = lv(s0, a, E.io(tau / 0.6)); else if (tau < 1.6) p = lv(a, b, (tau - 0.6) / 1.0).add(V(0, Math.sin(tau * 9 + i) * 1.6, Math.cos(tau * 8 + i) * 1.6)); else { const k = Math.min(1, (tau - 1.6) / 0.6), th = tau * (1.5 + r[6]) + i; p = lv(b, c, E.io(k)).add(V(Math.cos(th) * 5 * k, Math.sin(th * 1.3) * 2.5 * k, Math.sin(th) * 5 * k)); }
  const p2 = tau < 1.6 ? p.clone().add(V(side, 0, 0)) : p.clone().add(V(-Math.sin(tau), 0, Math.cos(tau)));
  return { p: p.add(jit), v: p2.sub(p) }; }
