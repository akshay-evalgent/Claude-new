// =====================================================================
// ASSETS (tail short): a Poly Haven living room (HDR) and wood floor (CC0); the rigged "Fripouille" cat (CC BY) whose fur
// stands on end; the forearm with real-looking skin and hairs from the mosquito short, now with goosebumps; a microscope
// section through cat skin: follicles, hairs and the tiny arrector pili muscles.
// =====================================================================
const [HOME] = await Promise.all(['kiara_interior_4k.hdr'].map(loadHDR));
const [STUDIO_H] = await Promise.all(['studio_small_09_1k.hdr'].map(loadHDR));
const TX = {}; [TX.floor] = await Promise.all(['wood_floor'].map(id => loadPBR(id)));
const V2 = (x, y) => new THREE.Vector2(x, y);
const hCanvas = (w, h, draw) => { const [c, g] = mkCanvas(w, h); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); draw(g, w, h); return c; };
const rep = (t, x, y) => { const k = t.clone(); k.repeat.set(x, y); k.wrapS = k.wrapT = THREE.RepeatWrapping; k.needsUpdate = true; return k; };
// goosebump relief: small raised domes around the follicles (one tile covers about 1.8 cm)
const GOOSE_N = (() => { const W = 1024, c = hCanvas(W, W, (g) => { const r = rng(41); g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 150; i++) { const x = r() * W, y = r() * W, rr = 26 + r() * 22; for (const dx of [-W, 0, W]) for (const dy of [-W, 0, W]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rr); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(200,200,200,0.5)'); gr.addColorStop(1, 'rgba(90,90,90,0)'); g.fillStyle = gr; g.fillRect(x + dx - rr, y + dy - rr, rr * 2, rr * 2); } } });
  return heightToNormal(c, 3.0); })();
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
  const r = rng(seed), H = [], HB = [], M4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const surf = (x, phi) => { const taper = 1 - 0.06 * (x / len + 0.5); return V(x, Math.cos(phi) * ry * taper, Math.sin(phi) * rx * taper); };
  const nrm = (phi) => V(0, Math.cos(phi) / ry, Math.sin(phi) / rx).normalize();
  for (let i = 0; i < nHair; i++) { const x = lerp(span[0], span[1], r()), phi = (r() - 0.5) * 2.3; const P = surf(x, phi); if (clear.some(([cx, cz, cr]) => Math.hypot(P.x - cx, P.z - cz) < cr)) continue;
    const N = nrm(phi), T = V(1, 0, 0).applyAxisAngle(N, (r() - 0.5) * 0.7 + 0.25 * Math.sin(x * 0.7 + phi * 2)); T.sub(N.clone().multiplyScalar(T.dot(N))).normalize();
    const fl_ = x < flatX ? 1 : flat, lift = 0.22 + r() * 0.45 - fl_ * 0.55, Bv = new THREE.Vector3().crossVectors(T, N); const basis = new THREE.Matrix4().makeBasis(T, N, Bv); q.setFromRotationMatrix(basis); q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), lift - 0.33));
    const L = 0.12 + r() * r() * 0.55; M4.compose(P.clone().sub(N.clone().multiplyScalar(0.004)), q, V(L, L, L)); H.push(M4.clone()); HB.push({ P: P.clone().sub(N.clone().multiplyScalar(0.004)), basis: basis.clone(), lift, L }); }
  const hm = new THREE.InstancedMesh(SKIN_HAIR_GEO, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, sheen: 1.0, sheenColor: new THREE.Color(0xffc890), sheenRoughness: 0.3, clearcoat: 0.4, emissive: 0x2a1406, emissiveIntensity: 0.3 }), H.length);
  H.forEach((m, i) => { hm.setMatrixAt(i, m); hm.setColorAt(i, new THREE.Color().setHSL(0.075, 0.45 + r() * 0.2, 0.3 + r() * 0.3)); }); hm.castShadow = true; hm.receiveShadow = true; hm.frustumCulled = false; g.add(hm);
  // goosebumps: a second relief map of small domes, blended in by uGoose; hairs lift toward upright with setLift(k)
  const GU = { uGoose: { value: 0 }, gooseMap: { value: rep(GOOSE_N, circ * 0.55, len * 0.55) } };
  mat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, GU); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D gooseMap; uniform float uGoose;')
    .replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale; { vec3 gN = texture2D(gooseMap, vNormalMapUv * vec2(0.55)).xyz * 2.0 - 1.0; mapN.xy += gN.xy * uGoose * 1.6; }'); };
  mat.customProgramCacheKey = () => 'goosearm';
  const qq = new THREE.Quaternion(), M5 = new THREE.Matrix4(); let lastK = -1;
  const setLift = (k) => { if (Math.abs(k - lastK) < 1e-3) return; lastK = k; HB.forEach((h, i) => { qq.setFromRotationMatrix(h.basis); qq.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), lerp(h.lift - 0.33, 1.25 + 0.15 * Math.sin(i), k))); M5.compose(h.P, qq, V(h.L, h.L, h.L)); hm.setMatrixAt(i, M5); }); hm.instanceMatrix.needsUpdate = true; };
  g.userData = { arm, hairs: hm, mat, rx, ry, len, setLift, setGoose: (k) => { GU.uGoose.value = k; }, surfY: (x, z) => { const taper = 1 - 0.06 * (x / len + 0.5), a = rx * taper, b = ry * taper; return b * Math.sqrt(Math.max(0, 1 - (z / a) ** 2)); } };
  return g;
}
// ---------- the park at dusk ----------

// ---------- the cat (one rig, re-parented into whichever shot is drawing) ----------
const CAT = await makeRealCat({ furOpts: { shells: 18 } });
const use = (s, ...cats) => cats.forEach(c => s.scene.add(c.root));
// the living room: wood floor, daylight through the windows (HDR), a soft sun
function homeSet(s, { dim = 1 } = {}) {
  const sc = s.scene; sc.background = HOME.tex; sc.backgroundIntensity = 0.7 * dim; sc.environment = HOME.env;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), pbrMat(TX.floor, { rep: [10, 10], rough: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
  const sun = shadowSun(0xfff1de, 3.4 * dim, V(120, 220, 200), 160, 3); sc.add(sun);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.45 * dim); fill.position.set(160, 120, 80); sc.add(fill);
  envK(sc, 0.8 * dim);
}
// ---------- the forearm close-up ----------
function armSet(s) {
  const sc = s.scene; sc.background = new THREE.Color(0x1d1612); sc.environment = HOME.env;
  const arm = forearm({ len: 34, nHair: 3400, span: [-12, 12], seed: 5 }); sc.add(arm); s.arm = arm;
  const key = shadowSun(0xfff0e2, 2.6, V(-60, 22, 40), 30, 0.4); sc.add(key);
  const rim = new THREE.DirectionalLight(0xffd9b0, 1.6); rim.position.set(30, 20, -60); sc.add(rim);
  envK(sc, 0.5);
}
// ---------- MICROSCOPE: a slab of cat skin cut open (units: mm). Surface at y = 0, cut face at z = 0 ----------
const HISTO = canvasTex(1024, 512, (g, w, h) => {
  const yE = 0.06 * h, yD = 0.58 * h; // epidermis | dermis | fat
  g.fillStyle = '#c97f8f'; g.fillRect(0, 0, w, yE); g.fillStyle = '#e9b4b7'; g.fillRect(0, yE, w, yD - yE);
  for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${170 + 40 * Math.random() | 0},90,110,0.18)`; g.lineWidth = 1 + 2 * Math.random(); const x = Math.random() * w, y = yE + Math.random() * (yD - yE), a = (Math.random() - 0.5) * 0.8; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 20, y + 10 * a, x + 40, y - 10 * a, x + 70 * Math.cos(a), y + 70 * Math.sin(a)); g.stroke(); }
  g.fillStyle = '#f3dfb0'; g.fillRect(0, yD, w, h - yD);
  for (let i = 0; i < 260; i++) { const x = Math.random() * w, y = yD + Math.random() * (h - yD), r = 12 + Math.random() * 16; g.strokeStyle = 'rgba(200,160,90,0.55)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, r, r * 0.8, Math.random(), 0, 7); g.stroke(); }
  g.fillStyle = 'rgba(120,40,60,0.6)'; g.fillRect(0, yE - 3, w, 4);
}, { rep: [1, 1] });
const SKINTOP = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#d99aa4'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 5, 30); }, { rep: [6, 3] });
function microSet(s, { n = 15, spacing = 3.6 } = {}) {
  const sc = s.scene; sc.background = new THREE.Color(0x0e0807); sc.environment = STUDIO_H.env;
  const W = n * spacing + 10, D = 26, Hh = 12;
  const block = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D), [
    new THREE.MeshStandardMaterial({ color: 0xd8a3aa, roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: 0xd8a3aa, roughness: 0.7 }),
    new THREE.MeshPhysicalMaterial({ map: SKINTOP, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xffc0c0) }), new THREE.MeshStandardMaterial({ color: 0xe8d2a0 }),
    new THREE.MeshPhysicalMaterial({ map: HISTO, roughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color(0xffd0d0), clearcoat: 0.25, clearcoatRoughness: 0.5 }), new THREE.MeshStandardMaterial({ color: 0xd8a3aa })]);
  block.position.set(0, -Hh / 2, -D / 2); block.receiveShadow = true; sc.add(block);
  const HAIRM = new THREE.MeshPhysicalMaterial({ color: 0xd9822f, roughness: 0.35, sheen: 1, sheenColor: new THREE.Color(0xffc080), clearcoat: 0.5 });
  const FOLM = new THREE.MeshPhysicalMaterial({ color: 0xc26a7a, roughness: 0.45, transmission: 0, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color(0xffb0c0) });
  const MUS = new THREE.MeshPhysicalMaterial({ color: 0xb0283a, roughness: 0.4, clearcoat: 0.5, emissive: 0xff2a40, emissiveIntensity: 0 });
  const fols = [];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * spacing + (h3(i, 2, 3) - 0.5) * 0.8, depth = 4.6 + h3(i, 4, 1) * 0.8;
    const piv = new THREE.Group(); piv.position.set(x, 0, 0.2); sc.add(piv);
    // follicle sheath: a tube going down (local -y), with the bulb at the bottom
    const fol = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, depth, 18, 1, true), FOLM); fol.position.y = -depth / 2; piv.add(fol);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), FOLM); bulb.position.y = -depth; bulb.scale.set(1, 1.2, 1); piv.add(bulb);
    // the hair: down in the follicle and out above the skin, curving a little
    const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push(V(0.25 * Math.sin(u * 2.2) * u, -depth + 0.4 + u * (depth + 9), 0)); }
    const hair = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.16, 8), HAIRM); hair.castShadow = true; piv.add(hair);
    // arrector pili: from mid-follicle (on the side the hair leans toward) up to the dermis under the surface
    const musc = dynTube(16, 10, MUS); sc.add(musc);
    fols.push({ piv, depth, musc, anchor: V(x + 2.4, -1.0, 0.3), seed: i });
  }
  // the capillary below, carrying adrenaline
  const capC = new THREE.CatmullRomCurve3([V(-W / 2, -8.2, 0.4), V(-W / 4, -7.6, 0.6), V(0, -8.4, 0.5), V(W / 4, -7.8, 0.6), V(W / 2, -8.2, 0.4)]);
  const cap = new THREE.Mesh(new THREE.TubeGeometry(capC, 120, 0.75, 16), new THREE.MeshPhysicalMaterial({ color: 0xa3122a, roughness: 0.3, clearcoat: 0.8, transparent: true, opacity: 0.85 })); sc.add(cap);
  const adr = glowMotes(420, 0xd8ff6a, 0.55); sc.add(adr);
  // a carpet of hairs over the top surface (all of them stand up together)
  const N = 520, hg = new THREE.CylinderGeometry(0.06, 0.14, 1, 5, 1); hg.translate(0, 0.5, 0);
  const carpet = new THREE.InstancedMesh(hg, HAIRM, N); carpet.castShadow = true; sc.add(carpet);
  const cps = Array.from({ length: N }, (_, i) => ({ x: (h3(i, 7, 1) - 0.5) * W, z: -1.5 - h3(i, 8, 2) * (D - 3), L: 6 + 4 * h3(i, 9, 3), a: (h3(i, 1, 9) - 0.5) * 0.5 }));
  const key = new THREE.DirectionalLight(0xfff2e8, 2.4); key.position.set(-30, 40, 60); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -50, right: 50, top: 30, bottom: -30, near: 1, far: 200 }); key.shadow.bias = -0.0004; key.userData.soft = 0.6; sc.add(key);
  const rim = new THREE.DirectionalLight(0xffb39a, 1.5); rim.position.set(30, 20, -50); sc.add(rim);
  envK(sc, 0.6);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion();
  // k: 0 = hairs lying flat, 1 = standing up; glow: muscles light up as they squeeze; flow: adrenaline in the blood
  s.micro = { fols, update(t, k, glow = 0, flow = 0) {
    for (const f of fols) { const kk = clamp(k * (1.15 - 0.3 * h3(f.seed, 3, 3))); const ang = lerp(-1.05, -0.12, E.io(kk)); f.piv.rotation.z = ang; f.piv.updateMatrixWorld(true);
      const a = f.piv.localToWorld(V(0.45, -f.depth * 0.55, 0)), b = f.anchor, mid = a.clone().lerp(b, 0.5).add(V(0, 0.25 - 0.2 * kk, 0));
      const thick = 0.32 + 0.16 * kk; f.musc.userData.update(new THREE.CatmullRomCurve3([a, mid, b]), (u) => thick * (0.55 + 0.45 * Math.sin(Math.PI * u))); }
    MUS.emissiveIntensity = 0.9 * glow;
    for (let i = 0; i < N; i++) { const c = cps[i], ang = lerp(-1.05, -0.1, E.io(clamp(k * 1.1 - 0.1 * h3(i, 2, 2)))); Q.setFromAxisAngle(V(0, 0, 1), ang + c.a * 0.3); M4.compose(V(c.x, 0, c.z), Q, V(1, c.L, 1)); carpet.setMatrixAt(i, M4); }
    carpet.instanceMatrix.needsUpdate = true;
    const pa = adr.userData.pa; adr.userData.seeds.forEach(([a, b, c], i) => { const u = (a + t * 0.18) % 1, p = capC.getPointAt(u); const up = clamp(flow * 1.4 - b) * (0.5 + 0.5 * c); p.add(V((c - 0.5) * 1.2, up * 7 + (b - 0.5) * 0.8, (a - 0.5) * 1.0)); pa[i * 3] = p.x; pa[i * 3 + 1] = p.y; pa[i * 3 + 2] = p.z; });
    adr.geometry.attributes.position.needsUpdate = true; adr.material.opacity = 0.95 * clamp(flow * 3); } };
  return s.micro;
}
