// =====================================================================
// SKIN AND THE PARK (centimetres): a forearm with mottled skin, furrows, pores and fine hairs; the scanned table,
// chairs, lantern and plants in a park just after sunset.
// =====================================================================
// draw something tileably: every stroke is repeated across the 3x3 neighbouring tiles
const tiled = (w, h, fn) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(dx, dy); };
// skin colour: one tile covers 6 cm
const SKIN_COL = (() => { const [c, g] = mkCanvas(1024, 1024), r = rng(21); g.fillStyle = '#b3785a'; g.fillRect(0, 0, 1024, 1024);
  const blob = (x, y, rad, col) => tiled(1024, 1024, (dx, dy) => { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2); });
  for (let i = 0; i < 70; i++) blob(r() * 1024, r() * 1024, 60 + r() * 160, r() < 0.5 ? 'rgba(200,110,90,0.16)' : 'rgba(225,175,135,0.16)');
  for (let i = 0; i < 26; i++) { const x0 = r() * 1024, y0 = r() * 1024; g.strokeStyle = 'rgba(120,120,170,0.07)'; g.lineWidth = 6 + r() * 6; g.beginPath(); let x = x0, y = y0, a = r() * 6.28; g.moveTo(x, y); for (let k = 0; k < 30; k++) { a += (r() - 0.5) * 0.5; x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 60; i++) blob(r() * 1024, r() * 1024, 2 + r() * 5, `rgba(${110 + r() * 40 | 0},${60 + r() * 20 | 0},${40},${0.35 + r() * 0.3})`);
  for (let i = 0; i < 20000; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(150,80,60,0.05)' : 'rgba(240,200,170,0.05)'; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
  return texOf(c); })();
// skin relief: one tile covers 1 cm. Two families of fine furrows (the diamond pattern), pores, fine grain
const SKIN_N = (() => { const W = 1024, c = hCanvas(W, W, (g) => { const r = rng(22);
  g.lineCap = 'round';
  for (const [ang, n, wd, al] of [[0.62, 16, 7, 0.55], [-0.7, 15, 7, 0.5], [0.15, 26, 3, 0.25], [1.4, 22, 3, 0.22]]) {
    for (let i = 0; i < n; i++) { const off = (i + r() * 0.6) / n; g.strokeStyle = `rgba(30,30,30,${al})`; g.lineWidth = wd * (0.6 + r() * 0.8);
      const ca = Math.cos(ang), sa = Math.sin(ang), cx = off * W * 1.0;
      for (let k = -10; k <= 10; k++) { if (r() < 0.45) continue; const t = k * 110, wob = Math.sin(k * 1.7 + i * 3.1) * 9, t2 = t + 60 + r() * 120, wob2 = Math.sin((k + 1) * 1.7 + i * 3.1) * 9;
        tiled(W, W, (dx, dy) => { g.beginPath(); g.moveTo(cx + t * ca - wob * sa + dx, off * W * 0.37 + t * sa + wob * ca + dy); g.lineTo(cx + t2 * ca - wob2 * sa + dx, off * W * 0.37 + t2 * sa + wob2 * ca + dy); g.stroke(); }); } } }
  for (let i = 0; i < 520; i++) { const x = r() * W, y = r() * W, rr = 2.5 + r() * 4; tiled(W, W, (dx, dy) => { g.fillStyle = 'rgba(20,20,20,0.7)'; g.beginPath(); g.arc(x + dx, y + dy, rr, 0, 7); g.fill(); }); }
  { const [c2, g2] = mkCanvas(W, W); g2.drawImage(g.canvas, 0, 0); g.filter = 'blur(2px)'; g.drawImage(c2, 0, 0); g.filter = 'none'; }   // one soft blur pass over everything
  for (let i = 0; i < 40000; i++) { const v = 100 + r() * 56 | 0; g.fillStyle = `rgba(${v},${v},${v},0.25)`; g.fillRect(r() * W, r() * W, 2, 2); } });
  return heightToNormal(c, 2.2); })();
// a curved, tapered hair (length 1 along +x, lifting off the skin then lying down), for instancing
const SKIN_HAIR_GEO = (() => { const pts = []; for (let i = 0; i <= 10; i++) { const s = i / 10; pts.push(V(s, 0.34 * s - 0.22 * s * s, 0)); }
  const cv = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(cv, 24, 1, 5); const p = g.attributes.position;
  // taper: pull each ring toward its centre line
  for (let i = 0; i <= 24; i++) { const u = i / 24, cpt = cv.getPointAt(u), k = 0.0052 * (1 - 0.85 * u); for (let j = 0; j <= 5; j++) { const idx = i * 6 + j; const v = V(p.getX(idx), p.getY(idx), p.getZ(idx)).sub(cpt).multiplyScalar(k).add(cpt); p.setXYZ(idx, v.x, v.y, v.z); } }
  g.computeVertexNormals(); return g; })();
// the forearm: an elliptical cylinder along +x, top of the skin at y = ry. clear: [x, z, radius] spots kept free of hairs
function forearm({ len = 32, rx = 3.4, ry = 2.85, nHair = 3000, span = [-9, 9], clear = [], seed = 2, flat = 0, flatX = -1e9 } = {}) {
  const g = new THREE.Group(); const geo = new THREE.CylinderGeometry(1, 1, len, 360, 80, false); geo.rotateZ(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), taper = 1 - 0.06 * (x / len + 0.5); p.setXYZ(i, x, y * ry * taper, z * rx * taper); } geo.computeVertexNormals();
  const circ = Math.PI * (rx + ry);
  const mat = new THREE.MeshPhysicalMaterial({ map: rep(SKIN_COL, circ / 6, len / 6), normalMap: rep(SKIN_N, circ, len), normalScale: V2(0.5, 0.5), roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0xff9868), sheenRoughness: 0.5, clearcoat: 0.08, clearcoatRoughness: 0.4, emissive: 0x4a1406, emissiveIntensity: 0.14 });
  const arm = new THREE.Mesh(geo, mat); arm.receiveShadow = arm.castShadow = true; g.add(arm);
  // hairs: rooted in the skin, combed toward the wrist (+x), lifting 10-25 degrees
  const r = rng(seed), H = [], M4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const surf = (x, phi) => { const taper = 1 - 0.06 * (x / len + 0.5); return V(x, Math.cos(phi) * ry * taper, Math.sin(phi) * rx * taper); };
  const nrm = (phi) => V(0, Math.cos(phi) / ry, Math.sin(phi) / rx).normalize();
  for (let i = 0; i < nHair; i++) { const x = lerp(span[0], span[1], r()), phi = (r() - 0.5) * 2.3; const P = surf(x, phi); if (clear.some(([cx, cz, cr]) => Math.hypot(P.x - cx, P.z - cz) < cr)) continue;
    const N = nrm(phi), T = V(1, 0, 0).applyAxisAngle(N, (r() - 0.5) * 0.7 + 0.25 * Math.sin(x * 0.7 + phi * 2)); T.sub(N.clone().multiplyScalar(T.dot(N))).normalize();
    const fl_ = x < flatX ? 1 : flat, lift = 0.22 + r() * 0.45 - fl_ * 0.55, Bv = new THREE.Vector3().crossVectors(T, N); const basis = new THREE.Matrix4().makeBasis(T, N, Bv); q.setFromRotationMatrix(basis); q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), lift - 0.33));
    const L = 0.12 + r() * r() * 0.55; M4.compose(P.clone().sub(N.clone().multiplyScalar(0.004)), q, V(L, L, L)); H.push(M4.clone()); }
  const hm = new THREE.InstancedMesh(SKIN_HAIR_GEO, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, sheen: 1.0, sheenColor: new THREE.Color(0xffc890), sheenRoughness: 0.3, clearcoat: 0.4, emissive: 0x2a1406, emissiveIntensity: 0.3 }), H.length);
  H.forEach((m, i) => { hm.setMatrixAt(i, m); hm.setColorAt(i, new THREE.Color().setHSL(0.075, 0.45 + r() * 0.2, 0.3 + r() * 0.3)); }); hm.castShadow = true; hm.receiveShadow = true; hm.frustumCulled = false; g.add(hm);
  g.userData = { arm, hairs: hm, mat, rx, ry, len, surfY: (x, z) => { const taper = 1 - 0.06 * (x / len + 0.5), a = rx * taper, b = ry * taper; return b * Math.sqrt(Math.max(0, 1 - (z / a) ** 2)); } };
  return g;
}
// ---------- the park at dusk ----------
const TOP = 72.6;   // table top height (cm)
function park(sc, { sky = true, env = 0.6, sun = 2.6, lamp = 1.4, plants = true } = {}) {
  sc.environment = PARK.env; sc.environmentIntensity = env; sc.background = PARK.tex; sc.backgroundIntensity = 1;
  if (sky) { const s = new GroundProjectedSkybox(PARK.tex); s.scale.setScalar(30000); s.height = 160; s.radius = 30000; sc.add(s); }
  const sunL = new THREE.DirectionalLight(0xffb27a, sun); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048); sunL.shadow.bias = -0.0002; sunL.shadow.normalBias = 0.002; sc.add(sunL, sunL.target);
  const sd = PARK_SUN.clone(); sd.y = Math.max(sd.y, 0.3); sd.normalize();
  sunL.userData.aim = (c, box = 2, d = 60) => { sunL.position.copy(c).addScaledVector(sd, d); sunL.target.position.copy(c); sunL.target.updateMatrixWorld(); Object.assign(sunL.shadow.camera, { left: -box, right: box, top: box, bottom: -box, near: d * 0.2, far: d * 2 }); sunL.shadow.camera.updateProjectionMatrix(); sunL.userData.soft = box * 0.04; };
  const table = model('outdoor_table_chair_set_01'); sc.add(table);
  const lan = model('Lantern_01'); lan.position.set(-22, TOP, 20); lan.rotation.y = 0.6; sc.add(lan);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.55, 0.18).multiplyScalar(6), toneMapped: true })); flame.scale.set(0.7, 1.4, 0.7); flame.position.set(-22, TOP + 9.5, 20); flame.userData.noDof = false; sc.add(flame);
  const lampL = new THREE.PointLight(0xff9a48, 900 * lamp, 0, 2); lampL.position.copy(flame.position); sc.add(lampL);
  if (plants) { const r = rng(17), srcs = []; ['periwinkle_plant', 'nettle_plant', 'grass_medium_01'].forEach(id => { const m = model(id); m.traverse(o => { if (o.isMesh) srcs.push(o); }); });
    for (let i = 0; i < 90; i++) { const m = srcs[Math.floor(r() * srcs.length)], c = new THREE.Mesh(m.geometry, m.material); const a = r() * 6.28, d = 70 + Math.sqrt(r()) * 380; c.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); c.rotation.y = r() * 6.28; c.scale.setScalar(100 * (0.8 + r() * 0.8)); c.castShadow = c.receiveShadow = true; sc.add(c); } }
  return { sunL, table, lan, flame, lampL, sd };
}
