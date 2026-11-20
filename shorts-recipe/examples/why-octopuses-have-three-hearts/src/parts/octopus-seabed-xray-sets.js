// =====================================================================
// THE OCTOPUS: a lofted body (head + mantle), eight tapering arms with suckers, wet mottled skin; the seabed
// (scanned rocks and coral sand under moving caustics, drifting particles); x-ray hearts, gills and blue blood;
// two test tubes of blood (copper-blue and iron-red)
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, ASPECT, 0.004, 400) }; build(s); shots.push(s); return s; }
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const texOf = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
function heightToNormal(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const im = g.createImageData(w, h);
  const Hh = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (Hh(x + 1, y) - Hh(x - 1, y)) * strength, dy = (Hh(x, y + 1) - Hh(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4; im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function ptFrames(curve, n) {
  const P = [], T = [], N = [], B = [];
  for (let i = 0; i <= n; i++) { P.push(curve.getPointAt(i / n)); T.push(curve.getTangentAt(i / n).normalize()); }
  let up = Math.abs(T[0].y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  N.push(up.clone().sub(T[0].clone().multiplyScalar(up.dot(T[0]))).normalize()); B.push(T[0].clone().cross(N[0]));
  for (let i = 1; i <= n; i++) { const ax = T[i - 1].clone().cross(T[i]), s = ax.length(); const nn = N[i - 1].clone();
    if (s > 1e-6) nn.applyAxisAngle(ax.normalize(), Math.asin(clamp(s, -1, 1)) * (T[i - 1].dot(T[i]) < 0 ? -1 : 1));
    nn.sub(T[i].clone().multiplyScalar(nn.dot(T[i]))).normalize(); N.push(nn); B.push(T[i].clone().cross(nn)); }
  return { P, T, N, B };
}
// a tube rebuilt every frame along a moving curve: radius(u, th)
function dynTube(nu, nv, mat, uvRep = [1, 1]) {
  const cols = nv + 1, pos = new Float32Array((nu + 1) * cols * 3), uv = new Float32Array((nu + 1) * cols * 2), idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const k = i * cols + j; uv[k * 2] = i / nu * uvRep[0]; uv[k * 2 + 1] = j / nv * uvRep[1]; }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
  m.userData.update = (curve, rad, upHint = null) => { const F = ptFrames(curve, nu); m.userData.F = F;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const th = 2 * Math.PI * j / nv, r = rad(i / nu, th), k = (i * cols + j) * 3, c = Math.cos(th), s = Math.sin(th);
      pos[k] = F.P[i].x + (F.N[i].x * c + F.B[i].x * s) * r; pos[k + 1] = F.P[i].y + (F.N[i].y * c + F.B[i].y * s) * r; pos[k + 2] = F.P[i].z + (F.N[i].z * c + F.B[i].z * s) * r; }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    const nr = geo.attributes.normal.array; for (let i = 0; i <= nu; i++) { const a = i * cols * 3, b = (i * cols + nv) * 3; for (let q = 0; q < 3; q++) { const mm = (nr[a + q] + nr[b + q]) / 2; nr[a + q] = nr[b + q] = mm; } } };
  return m;
}

// ---------- skin: mottled red-brown with pale spots; bumpy papillae ----------
const OCTO_T = (() => { const [c, g] = mkCanvas(1024, 512), r = rng(7); g.fillStyle = '#9a3e26'; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 700; i++) { const x = r() * 1024, y = r() * 512, rr = 6 + r() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, rr); const dark = r() > 0.5; gr.addColorStop(0, dark ? 'rgba(70,22,12,0.5)' : 'rgba(205,120,80,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(240,200,170,${0.25 + r() * 0.35})`; g.beginPath(); g.arc(r() * 1024, r() * 512, 1.5 + r() * 4, 0, 6.29); g.fill(); }
  return texOf(c); })();
const OCTO_N = (() => { const [c, g] = mkCanvas(512, 512), r = rng(9); g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { const x = r() * 512, y = r() * 512, rr = 2 + r() * 7; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  const [bc, bg] = mkCanvas(512, 512); bg.filter = 'blur(1px)'; bg.drawImage(c, 0, 0); return heightToNormal(bc, 3); })();
const OCTO_EYE = (() => { const [c, g] = mkCanvas(256, 256); g.fillStyle = '#3a2a10'; g.fillRect(0, 0, 256, 256); const gr = g.createRadialGradient(128, 128, 20, 128, 128, 120); gr.addColorStop(0, '#e8c050'); gr.addColorStop(0.7, '#c89030'); gr.addColorStop(1, '#5a3a10'); g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 118, 0, 6.29); g.fill();
  const r = rng(3); for (let i = 0; i < 300; i++) { const a = r() * 6.28; g.strokeStyle = `rgba(90,50,10,${r() * 0.3})`; g.beginPath(); g.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40); g.lineTo(128 + Math.cos(a) * 115, 128 + Math.sin(a) * 115); g.stroke(); }
  g.fillStyle = '#050505'; g.beginPath(); g.roundRect ? g.roundRect(66, 112, 124, 32, 14) : g.rect(66, 112, 124, 32); g.fill(); return texOf(c); })();

function makeOctopus() {
  const g = new THREE.Group(), skin = new THREE.MeshPhysicalMaterial({ map: OCTO_T, normalMap: OCTO_N, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.3, sheen: 0.4, sheenColor: new THREE.Color(1.0, 0.6, 0.5) });
  const under = new THREE.MeshPhysicalMaterial({ color: 0xe8c4ae, roughness: 0.45, clearcoat: 0.5, normalMap: OCTO_N, normalScale: new THREE.Vector2(0.4, 0.4) });
  const body = dynTube(70, 40, skin, [2, 2]); g.add(body);
  const arms = []; for (let i = 0; i < 8; i++) { const a = dynTube(70, 18, skin, [6, 1]); g.add(a); const su = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.75, 0.6, 12), under, 46); su.castShadow = true; su.frustumCulled = false; g.add(su); arms.push({ a, su, ang: (i + 0.5) / 8 * Math.PI * 2 }); }
  const eyes = [-1, 1].map(sd => { const e = new THREE.Group(); const eg = new THREE.SphereGeometry(0.0085, 32, 24); eg.rotateX(Math.PI / 2); const q = eg.attributes.position, uv = eg.attributes.uv; for (let i = 0; i < q.count; i++) { if (q.getZ(i) > 0) uv.setXY(i, 0.5 + q.getX(i) / 0.014, 0.5 + q.getY(i) / 0.014); else uv.setXY(i, 0.02, 0.02); }
    const m = new THREE.Mesh(eg, new THREE.MeshPhysicalMaterial({ map: OCTO_EYE, roughness: 0.15, clearcoat: 1 })); e.add(m); const lid = new THREE.Mesh(new THREE.TorusGeometry(0.0078, 0.0022, 12, 32), skin); lid.position.z = 0.003; e.add(lid); g.add(e); return { e, sd }; });
  const o = new THREE.Object3D();
  // pose: P = { lift, spread, curl, wave, t, jet, mantleK } ; the octopus faces +x, arms radiate round the crown, the mantle sits behind and above
  g.userData.pose = (P) => {
    const { t = 0, lift = 0.02, spread = 1, curl = 0.6, wave = 1, jet = 0, mantleK = 1, look = 0 } = P;
    // body spine: crown -> head -> mantle tip; in a jet the whole body streams out horizontally behind (-x)
    const tip = V(lerp(-0.10, -0.15, jet), lerp(0.115, 0.05, jet), 0), mid = V(lerp(-0.045, -0.07, jet), lerp(0.095, 0.05, jet), 0);
    const curve = new THREE.CatmullRomCurve3([V(0.0, lift + 0.012, 0), V(0.002, lift + 0.042, 0), V(-0.012, lift + 0.068, 0).lerp(V(-0.03, 0.05, 0), jet), mid.clone().add(V(0, lift * (1 - jet), 0)), tip.clone().add(V(0, lift * (1 - jet), 0))]);
    const breathe = 1 + 0.05 * Math.sin(t * 2.4) * (1 - jet);
    body.userData.update(curve, (u, th) => { const head = 0.034 + 0.008 * Math.exp(-Math.pow((u - 0.25) / 0.12, 2)), neck = -0.004 * Math.exp(-Math.pow((u - 0.42) / 0.06, 2)), mant = 0.052 * mantleK * breathe * Math.exp(-Math.pow((u - 0.72) / 0.2, 2));
      let r = Math.max(head + neck, mant * (u > 0.45 ? 1 : 0.0) + (u > 0.45 ? 0.0 : 0)) ; if (u > 0.45) r = Math.max(head * smooth(0.6, 0.45, u) + neck, mant); return Math.max(0.0005, r * smooth(1.0, 0.86, u) * smooth(-0.15, 0.06, u) * (1 + 0.03 * Math.sin(th * 3 + u * 9))); });
    const F = body.userData.F, iH = Math.round(0.25 * 70);
    eyes.forEach(({ e, sd }) => { const p = F.P[iH].clone().add(F.B[iH].clone().multiplyScalar(sd * 0.033)).add(F.N[iH].clone().multiplyScalar(0.012)).add(V(0.006, 0, 0)); e.position.copy(p); e.lookAt(p.clone().add(V(0.35 * Math.cos(look), 0.1, sd * 1.0 + 0.35 * Math.sin(look)))); });
    // arms
    arms.forEach(({ a, su, ang }, i) => {
      const L = 0.29, pts = [], n = 10; const dir = V(Math.cos(ang), 0, Math.sin(ang));
      for (let k = 0; k <= n; k++) { const s = k / n, w = wave * 0.35 * Math.sin(t * 2.2 + i * 1.3 - s * 4) * s;
        let p;
        if (jet > 0) { const trail = V(-1, 0, 0), sp = 0.035 * (1 - s * 0.6) * spread; const base = dir.clone().multiplyScalar(0.02 + sp * Math.min(1, s * 3)); p = base.add(trail.clone().multiplyScalar(L * s * 1.05)).add(V(0, lift * 0.6 + 0.01 * Math.sin(t * 6 + i + s * 5) * s, 0)); p.lerp(V(0, 0, 0).add(dir.clone().multiplyScalar(0.02 + L * s * spread)).add(V(0, lift * (1 - s), 0)), 1 - jet); }
        else { const d2 = dir.clone().applyAxisAngle(V(0, 1, 0), w * 0.6); const rr = 0.02 + L * s * spread; p = d2.multiplyScalar(rr).add(V(0, Math.max(0.006, lift * (1 - s) * 1.0 + 0.012 * Math.sin(t * 1.7 + i) * s), 0));
          const c = curl * smooth(0.6, 1.0, s); if (c > 0) { const back = dir.clone().multiplyScalar(-c * 0.05 * (s - 0.6) / 0.4); p.add(back).add(V(0, c * 0.05 * Math.pow((s - 0.6) / 0.4, 2), 0)); } }
        pts.push(p); }
      const crv = new THREE.CatmullRomCurve3(pts);
      a.userData.update(crv, (u) => Math.max(0.0007, 0.0125 * Math.pow(1 - u, 0.9) + 0.0006));
      const AF = a.userData.F; let q = 0;
      for (let k = 2; k < 70 && q < 46; k += 3) for (const sd of [-1, 1]) { if (q >= 46) break; const u = k / 70, r0 = 0.0125 * Math.pow(1 - u, 0.9);
        // the underside: the frame direction pointing most downward
        const dn = AF.N[k].y < AF.B[k].y ? AF.N[k] : AF.B[k], sideV = dn === AF.N[k] ? AF.B[k] : AF.N[k];
        o.position.copy(AF.P[k]).addScaledVector(dn.clone().multiplyScalar(AF.N[k].y < AF.B[k].y ? 1 : 1), r0 * 0.82 * (dn.y < 0 ? 1 : -1)).addScaledVector(sideV, sd * r0 * 0.38);
        const sz = r0 * 0.42; o.scale.set(sz, sz * 0.9, sz); o.quaternion.setFromUnitVectors(V(0, 1, 0), dn.clone().multiplyScalar(dn.y < 0 ? -1 : 1).negate()); o.updateMatrix(); su.setMatrixAt(q++, o.matrix); }
      su.count = q; su.instanceMatrix.needsUpdate = true;
    });
  };
  g.userData.body = body; g.userData.skin = skin; g.userData.arms = arms; g.userData.eyes = eyes;
  g.userData.pose({});
  return g;
}

// ---------- the seabed: coral sand, scanned rocks, a conch; caustics dancing over it; drifting particles ----------
const CAUSTIC = (() => { const [c, g] = mkCanvas(512, 512); const im = g.createImageData(512, 512), r = rng(12), S = []; for (let i = 0; i < 60; i++) S.push([r() * 512, r() * 512]);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { let d1 = 1e9, d2 = 1e9; for (const [sx, sy] of S) for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { const d = Math.hypot(x - sx - ox, y - sy - oy); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    const v = Math.pow(clamp(1 - (d2 - d1) / 9), 2.2) * 255, i = (y * 512 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const SEA_BG = (() => { const [c, g] = mkCanvas(8, 512); const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#5fb6c8'); gr.addColorStop(0.55, '#2b6a7a'); gr.addColorStop(1, '#174450'); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function seabed(sc, { fog = 0x2b6a7a, density = 2.2 } = {}) {
  sc.background = SEA_BG; sc.fog = new THREE.FogExp2(fog, density); sc.environment = STUDIO.env; sc.environmentIntensity = 0.45;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), pbrMat(TX.seabed, { rep: [14, 14], color: 0xc9c2a8, normal: 1.4 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const cm = new THREE.MeshBasicMaterial({ map: CAUSTIC, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xbfefff }); const c1 = CAUSTIC.clone(), c2 = CAUSTIC.clone(); c1.needsUpdate = c2.needsUpdate = true; c1.repeat.set(9, 9); c2.repeat.set(7, 7);
  const ca = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), cm.clone()); ca.material.map = c1; ca.rotation.x = -Math.PI / 2; ca.position.y = 0.002; sc.add(ca); const cb = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), cm.clone()); cb.material.map = c2; cb.material.opacity = 0.22; cb.rotation.x = -Math.PI / 2; cb.position.y = 0.0025; sc.add(cb);
  const rocks = model('coast_rocks_01'); rocks.scale.setScalar(0.012); rocks.position.set(-0.35, -0.004, -0.55); rocks.rotation.y = 0.6; sc.add(rocks);
  const conch = model('lambis_shell'); conch.scale.setScalar(0.9); conch.position.set(0.32, 0.0, 0.18); conch.rotation.y = 2.2; sc.add(conch);
  const sun = new THREE.DirectionalLight(0xd8f4ff, 2.6); sun.position.set(0.3, 3, 0.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -0.6, right: 0.6, top: 0.6, bottom: -0.6, near: 0.5, far: 6 }); sun.shadow.bias = -0.0003; sun.userData.soft = 0.06; sc.add(sun);
  const hemi = new THREE.HemisphereLight(0x8fd8f0, 0x3a4a40, 0.5); sc.add(hemi);
  const snow = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xcfe8e8, transparent: true, opacity: 0.55 }), 260), o = new THREE.Object3D(), r = rng(31), SN = [];
  for (let i = 0; i < 260; i++) SN.push([r() * 1.2 - 0.6, r() * 0.5, r() * 1.0 - 0.6, 0.0005 + r() * 0.0012, r() * 6]); sc.add(snow);
  const rays = new THREE.Group(); const rm = new THREE.MeshBasicMaterial({ color: 0xd8f8ff, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) { const cyl_ = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.12, 1.6, 16, 1, true), rm); cyl_.position.set(-0.5 + i * 0.22, 0.6, -0.5 - (i % 2) * 0.2); cyl_.rotation.z = 0.18; cyl_.userData.noDof = true; rays.add(cyl_); } sc.add(rays);
  return { floor, rocks, conch, sun, tick: (t) => { c1.offset.set(t * 0.013, t * 0.007); c2.offset.set(-t * 0.009, t * 0.011); SN.forEach(([x, y, z, s, ph], i) => { o.position.set(x + 0.01 * Math.sin(t * 0.3 + ph), (y + t * 0.004) % 0.5, z); o.scale.setScalar(s); o.updateMatrix(); snow.setMatrixAt(i, o.matrix); }); snow.instanceMatrix.needsUpdate = true; } };
}

// ---------- x-ray: hearts, gills, vessels and flowing blood inside the mantle (octopus-local) ----------
function octoXray(oc) {
  const g = new THREE.Group(); oc.add(g);
  const heartM = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, clearcoat: 0.6, emissive: c, emissiveIntensity: 0.3 });
  const sys = new THREE.Mesh(new THREE.SphereGeometry(0.011, 24, 18), heartM(0xc8304a)); sys.scale.set(1.2, 0.9, 1); g.add(sys);
  const bra = [-1, 1].map(sd => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 20, 16), heartM(0xb8405a)); g.add(h); return h; });
  const gillM = new THREE.MeshPhysicalMaterial({ color: 0xd88a9a, roughness: 0.5, transparent: true, opacity: 0.9, emissive: 0x3a1018, emissiveIntensity: 0.5, side: THREE.DoubleSide });
  const gills = [-1, 1].map(sd => { const gg = new THREE.Group(); for (let i = 0; i < 12; i++) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.008 - i * 0.0003, 10), gillM); f.position.x = -i * 0.0035; f.rotation.y = Math.PI / 2; gg.add(f); } g.add(gg); return gg; });
  const blood = new THREE.MeshBasicMaterial({ color: 0x3a8cff, toneMapped: false }), pale = new THREE.MeshBasicMaterial({ color: 0x9fb4c8, toneMapped: false });
  const vessels = []; const vm = new THREE.MeshPhysicalMaterial({ color: 0x4a6aa0, roughness: 0.4, transparent: true, opacity: 0.55 });
  const particles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), 240); g.add(particles); const o = new THREE.Object3D();
  const routes = []; // [curve, fromPale]
  let built = false;
  g.userData.update = (t, { beat = 1, sysBeat = 1, flow = 1 } = {}) => {
    const F = oc.userData.body.userData.F, at = (u, off) => F.P[Math.round(u * 70)].clone().add(off);
    const pSys = at(0.62, V(0, -0.004, 0)), pB = [-1, 1].map(sd => at(0.6, V(0, -0.002, sd * 0.026))), gl = [-1, 1].map(sd => [at(0.64, V(0, 0.004, sd * 0.034)), at(0.82, V(0, 0.006, sd * 0.03))]);
    const pulse = (ph) => 1 + 0.22 * Math.max(0, Math.sin(t * 7 + ph)) ** 3;
    sys.position.copy(pSys); sys.scale.set(1.2, 0.9, 1).multiplyScalar(lerp(1, pulse(0), sysBeat));
    bra.forEach((h, i) => { h.position.copy(pB[i]); h.scale.setScalar(lerp(1, pulse(1.3 + i), beat)); });
    gills.forEach((gg, i) => { gg.position.copy(gl[i][0]); gg.lookAt(gl[i][1]); gg.rotateY(Math.PI / 2); });
    if (!built) { built = true;
      for (const i of [0, 1]) { routes.push([new THREE.CatmullRomCurve3([at(0.35, V(0, -0.01, (i ? 1 : -1) * 0.01)), pB[i], gl[i][0], gl[i][1], pSys]), true]); }
      routes.push([new THREE.CatmullRomCurve3([pSys, at(0.45, V(0, 0.0, 0)), at(0.2, V(0, -0.004, 0)), at(0.0, V(0, -0.006, 0))]), false]);
      routes.forEach(([c]) => { const v = new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.0022, 8, false), vm); g.add(v); vessels.push(v); }); }
    let q = 0; const col = new THREE.Color();
    routes.forEach(([c, fromPale], ri) => { for (let k = 0; k < 80; k++) { const u = ((k / 80) + t * 0.25 * flow * (ri === 2 ? sysBeat * 0.9 + 0.1 : 1)) % 1; o.position.copy(c.getPointAt(u)); o.scale.setScalar(0.0014); o.updateMatrix(); particles.setMatrixAt(q, o.matrix);
      col.set(fromPale ? (u < 0.55 ? 0x9fb4c8 : 0x3a8cff) : 0x3a8cff); particles.setColorAt(q, col); q++; } });
    particles.count = q; particles.instanceMatrix.needsUpdate = true; particles.instanceColor.needsUpdate = true;
  };
  g.userData.sys = sys; return g;
}
const GHOST = () => { const m = xrayMat(new THREE.Color(1.0, 0.65, 0.55), new THREE.Color(0.12, 0.04, 0.04), 2.0, 0.85); return m; };

// ---------- the blood: two test tubes, copper-blue and iron-red ----------
function bloodTubes(sc) { sc.background = new THREE.Color(0x0b1016); sc.environment = STUDIO.env; sc.environmentIntensity = 0.9;
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(0.4, 0.8, 0.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -0.3, right: 0.3, top: 0.3, bottom: -0.3, near: 0.1, far: 3 }); key.userData.soft = 0.04; sc.add(key);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 1.6); rim.position.set(-0.5, 0.4, -0.8); sc.add(rim);
  const tab = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshPhysicalMaterial({ color: 0x121418, roughness: 0.55, clearcoat: 0.2 })); tab.rotation.x = -Math.PI / 2; tab.receiveShadow = true; sc.add(tab);
  // two real test tubes from the scanned chemistry set, standing in its rack: copper-blue (octopus) left, iron-red (ours) right
  const set = model('chemistry_set'), get = (n) => { let f = null; set.traverse(o => { if (o.name === n) f = o; }); return f; };
  const stand = get('chemistry_set_test_tube_stand_a'), tA = get('chemistry_set_test_tube_a'), tB = get('chemistry_set_test_tube_b'), cA = get('chemistry_set_test_tube_content_d'), cB = get('chemistry_set_test_tube_content_e');
  [stand, tA, tB, cA, cB].forEach(o => { o.parent.remove(o); sc.add(o); o.rotation.set(0, 0, 0); });
  stand.position.set(0, 0, 0); tA.position.set(-0.035, 0.004, 0); tB.position.set(0.035, 0.004, 0); cA.position.copy(tA.position); cB.position.copy(tB.position);
  cA.material = new THREE.MeshPhysicalMaterial({ color: 0x1448c8, roughness: 0.1, clearcoat: 1, emissive: 0x0a2a8a, emissiveIntensity: 0.8, envMapIntensity: 0.5 }); cB.material = new THREE.MeshPhysicalMaterial({ color: 0x8a0810, roughness: 0.1, clearcoat: 1, emissive: 0x3a0306, emissiveIntensity: 0.7, envMapIntensity: 0.5 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.07, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false, side: THREE.FrontSide, envMapIntensity: 0.8 });
  [tA, tB].forEach(o => o.traverse(m => { if (m.isMesh) { m.material = glass; m.castShadow = false; } })); cA.scale.set(1, 1.25, 1); cB.scale.set(1, 1.25, 1);
  return { set, tA, tB };
}
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
