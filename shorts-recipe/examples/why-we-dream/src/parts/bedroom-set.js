// =====================================================================
// SETS: a real bedroom (window opening, moon/sun shaft, curtains, textured wood and fabric)
// =====================================================================
const TOP = 1.03;   // mattress top
const NIGHT_SKY = gradTex([[0, '#3a4f98'], [0.45, '#18214f'], [1, '#060a1e']], 0.62, 0.32);
const DAY_SKY = gradTex([[0, '#fffbe6'], [0.3, '#ffe2a8'], [0.7, '#a8d4f0'], [1, '#6aa8e0']], 0.35, 0.55);
const DREAMBG = gradTex([[0, '#ffe0f6'], [0.3, '#d6a8ff'], [0.7, '#7a5ae0'], [1, '#2e1f78']], 0.5, 0.35);
const PJ = { shirt: 0x8fb8ff, pants: 0x6f8fe0, hair: 0x3a2416, skin: 0xe9a07c, barefoot: true };
const hdr = (r, g, b, extra = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), ...extra });
const kf = (t, keys) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b, ease = E.io] = keys[i]; const k = ease(clamp((t - t0) / (t1 - t0)));
    return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
  }
  return keys[keys.length - 1][1];
};
const setRot = (o, r) => o.rotation.set(r[0], r[1], r[2]);

function makeBed(sc, W = 2.0) {
  const wood = woodTex('#8a5532', '#4a2a14', 31, [1, 1]);
  const fm = new THREE.MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: 0.5, roughness: 0.38 });
  const box = (w, h, d, x, y, z, r = 0.03) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), fm); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; sc.add(b); return b; };
  box(0.1, 0.32, 3.95, -W / 2 - 0.07, 0.56, 0); box(0.1, 0.32, 3.95, W / 2 + 0.07, 0.56, 0);
  box(W + 0.26, 0.62, 0.12, 0, 0.55, 2.02);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(0.15, b < 0 ? 2.35 : 0.85, 0.15, a * (W / 2 + 0.08), b < 0 ? 1.175 : 0.425, b * 2.02, 0.045));
  box(W + 0.1, 1.2, 0.07, 0, 1.6, -2.04); box(W + 0.42, 0.14, 0.22, 0, 2.36, -2.03, 0.06); box(W + 0.1, 0.1, 0.12, 0, 1.0, -2.03);
  for (let i = 1; i < 4; i++) { const v = new THREE.Mesh(new RoundedBoxGeometry(0.05, 1.1, 0.05, 2, 0.02), fm); v.position.set(-W / 2 + i * W / 4, 1.6, -1.99); sc.add(v); }
  const slat = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, 3.9), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); slat.position.set(0, 0.66, 0); sc.add(slat);
  const sheetM = new THREE.MeshStandardMaterial({ color: 0xf4f5f9, roughness: 0.9, bumpMap: WEAVE_FINE, bumpScale: 0.8 });
  const mat = new THREE.Mesh(new RoundedBoxGeometry(W, 0.34, 3.86, 6, 0.13), sheetM); mat.position.set(0, TOP - 0.17, 0); mat.castShadow = mat.receiveShadow = true; sc.add(mat);
}
function pillow(sc, x, z = -1.62, w = 1.2, d = 0.76, h = 0.3) {
  const g = new THREE.SphereGeometry(1, 72, 36), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i);
    const sx = Math.sign(X) * Math.pow(Math.abs(X), 0.3), sz = Math.sign(Z) * Math.pow(Math.abs(Z), 0.3);
    const e = Math.max(Math.abs(sx), Math.abs(sz));
    let y = Y * h * 0.5 * (1 - 0.62 * Math.pow(e, 6));
    if (Y > 0) y -= 0.07 * Math.exp(-((sx * w / 2) ** 2 + (sz * d / 2 - 0.08) ** 2) / 0.07);
    p.setXYZ(i, sx * w / 2, y + 0.01 * noise3(sx * 5, sz * 5, Y), sz * d / 2);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.85, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xdde6ff), bumpMap: WEAVE_FINE, bumpScale: 0.6 }));
  m.position.set(x, TOP + h * 0.42, z); m.castShadow = m.receiveShadow = true; sc.add(m); return m;
}
// cloth that drapes over the mattress and over whoever is underneath.
// fit() raycasts the posed bodies into a height field, then lets the cloth tent between high points.
function drape(sc, { W = 2.0, z0 = -0.72, z1 = 1.92, color = 0x5a72c8 } = {}) {
  const NX = 70, NZ = 80, geo = new THREE.PlaneGeometry(1, 1, NX, NZ);
  const hex = c => '#' + new THREE.Color(c).getHexString();
  const map = canvasTex(256, 512, (g, w, h) => { g.fillStyle = hex(color); g.fillRect(0, 0, w, h); g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, w, h * 0.075); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, h * 0.075, w, 3); noiseFill(g, w, h, 5, 10); });
  const mat = new THREE.MeshPhysicalMaterial({ map, roughness: 0.86, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55), bumpMap: QUILT, bumpScale: 2.2, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; sc.add(mesh);
  const pos = geo.attributes.position;
  const GX = 90, GZ = 130, gx0 = -W / 2 - 0.6, gx1 = W / 2 + 0.6, gz0 = -2.2, gz1 = 2.7, slots = [];
  const sample = (hf, x, z) => { const fx = clamp((x - gx0) / (gx1 - gx0)) * GX, fz = clamp((z - gz0) / (gz1 - gz0)) * GZ; const i = Math.min(Math.floor(fx), GX - 1), j = Math.min(Math.floor(fz), GZ - 1), u = fx - i, v = fz - j, I = (a, b) => hf[b * (GX + 1) + a]; return lerp(lerp(I(i, j), I(i + 1, j), u), lerp(I(i, j + 1), I(i + 1, j + 1), u), v); };
  mesh.userData.fit = (objs, slot = 0) => {
    const meshes = []; objs.forEach(o => { o.updateMatrixWorld(true); o.traverse(m => { if (m.isMesh && m.visible && !m.userData.skipCloth) meshes.push(m); }); });
    const rc = new THREE.Raycaster(); rc.ray.direction.set(0, -1, 0);
    const hf = new Float32Array((GX + 1) * (GZ + 1));
    for (let j = 0; j <= GZ; j++) for (let i = 0; i <= GX; i++) { rc.ray.origin.set(lerp(gx0, gx1, i / GX), 6, lerp(gz0, gz1, j / GZ)); const hit = rc.intersectObjects(meshes, false)[0]; hf[j * (GX + 1) + i] = hit ? Math.max(0, hit.point.y - (TOP + 0.03) + 0.05) : 0; }
    const dx = (gx1 - gx0) / GX, dz = (gz1 - gz0) / GZ, rad = 9, out = new Float32Array(hf.length);
    for (let j = 0; j <= GZ; j++) for (let i = 0; i <= GX; i++) {
      let m = hf[j * (GX + 1) + i];
      for (let b = Math.max(0, j - rad); b <= Math.min(GZ, j + rad); b++) for (let a = Math.max(0, i - rad); a <= Math.min(GX, i + rad); a++) { const v = hf[b * (GX + 1) + a]; if (v > m) m = Math.max(m, v - Math.hypot((a - i) * dx, (b - j) * dz) * 1.25); }
      out[j * (GX + 1) + i] = m;
    }
    for (let it = 0; it < 3; it++) { const c = out.slice(); for (let j = 1; j < GZ; j++) for (let i = 1; i < GX; i++) { let sm = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) sm += c[(j + b) * (GX + 1) + i + a]; out[j * (GX + 1) + i] = sm / 9; } }
    for (let k = 0; k < out.length; k++) if (hf[k] > 0) out[k] = Math.max(out[k], hf[k] + 0.025);
    slots[slot] = out;
  };
  // fit a character: ignore the head and arms (they lie on top of the cloth)
  mesh.userData.fitChar = (p, slot = 0) => { const u = p.userData; [u.head, ...u.arms.map(a => a.sh)].forEach(g => g.traverse(m => m.userData.skipCloth = true)); mesh.userData.fit([p], slot); };
  mesh.userData.set = (o = {}) => {
    const Z0 = o.z0 ?? z0, wts = o.w || [], br = o.breath ?? 0, pokes = o.pokes || [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      let x = lerp(-W / 2 - 0.55, W / 2 + 0.55, i / NX), z = lerp(Z0, z1 + 0.6, j / NZ), h = 0;
      slots.forEach((hf, k) => { if (hf) h = Math.max(h, sample(hf, x, z) * (wts[k] ?? 1)); });
      h *= 1 + 0.03 * br;
      for (const pk of pokes) { const q = 1 - ((x - pk.x) ** 2 + (z - pk.z) ** 2) / (pk.r * pk.r); if (q > 0) h = Math.max(h, pk.h * Math.pow(q, 0.6)); }
      let y = TOP + 0.03 + h;
      const ax = Math.abs(x) - W / 2;
      if (ax > 0) { const k = Math.min(ax / 0.14, 1); x = Math.sign(x) * (W / 2 + 0.08 * Math.sin(k * Math.PI / 2)); y = TOP + 0.03 - 0.08 * (1 - Math.cos(k * Math.PI / 2)) - Math.max(ax - 0.14, 0) * 1.05; }
      const az = z - z1;
      if (az > 0) { const k = Math.min(az / 0.14, 1); z = z1 + 0.08 * Math.sin(k * Math.PI / 2); y = Math.min(y, TOP + 0.03 - 0.08 * (1 - Math.cos(k * Math.PI / 2)) - Math.max(az - 0.14, 0) * 1.05); }
      y += 0.016 * noise3(x * 3.1, z * 3.1, 1.7) + 0.006 * noise3(x * 9, z * 9, 4);
      pos.setXYZ(j * (NX + 1) + i, x, y, z);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  mesh.userData.set(); return mesh;
}
function lightShaft(sc, wc, dir, w, h, L, color, op) {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => wc.clone().add(V(a * w / 2, b * h / 2, 0)));
  const far = corners.map(c => c.clone().addScaledVector(dir, L));
  const P = [], A = [];
  for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i + 1) % 4], c = far[(i + 1) % 4], d = far[i]; P.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray()); A.push(0, 0, 1, 0, 1, 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('a', new THREE.Float32BufferAttribute(A, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { col: { value: new THREE.Color(color) }, op: { value: op } },
    vertexShader: `attribute float a; varying float vA; void main(){ vA=a; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 col; uniform float op; varying float vA; void main(){ float f=pow(1.0-vA,1.5)*smoothstep(0.0,0.06,vA); gl_FragColor=vec4(col*op*f,1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m); sc.add(mesh);
  // dust drifting inside the shaft
  const n = 45, dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 6, 4), hdr(0.55, 0.55, 0.6, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), n); sc.add(dust);
  const r = rng(17), D = []; for (let i = 0; i < n; i++) D.push([r() - 0.5, r() - 0.5, 0.15 + r() * 0.7, r() * 10]);
  const dm = new THREE.Object3D();
  mesh.userData.update = (t, amt = 1) => {
    D.forEach(([a, b, c, s], i) => {
      dm.position.copy(wc).add(V(a * w * 0.9, b * h * 0.9, 0)).addScaledVector(dir, c * L * 0.75).add(V(fbm(t * 0.07 + s, 1) * 0.3, fbm(t * 0.06 + s, 2) * 0.3 - 0.02 * t, fbm(t * 0.07 + s, 3) * 0.3));
      dm.scale.setScalar(amt * (0.6 + 0.8 * h3(i, 2, 3))); dm.updateMatrix(); dust.setMatrixAt(i, dm.matrix);
    });
    dust.instanceMatrix.needsUpdate = true; m.uniforms.op.value = op * amt;
  };
  mesh.userData.update(0); return mesh;
}
function room(sc, { night = true, double = false } = {}) {
  const W = double ? 3.0 : 2.0, wx = double ? 1.6 : 1.0, wz = -3.2, oy0 = 2.6, oy1 = 4.7;
  sc.background = new THREE.Color(night ? 0x070b1c : 0xf0d8b8); sc.environment = night ? NENV : MENV;
  const R = { W, wx };
  // floor and rug
  const fw = woodTex('#a06e46', '#5a3820', 21, [2.5, 2.5], 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.7, roughness: 0.32 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const rugT = canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#c86a4e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2e2c4'; g.lineWidth = 10; g.strokeRect(22, 22, w - 44, h - 44); g.lineWidth = 4; g.strokeRect(44, 44, w - 88, h - 88); g.fillStyle = '#2f4a6e'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w / 2, 90 + i * 34); g.lineTo(w / 2 + 60, 107 + i * 34); g.lineTo(w / 2, 124 + i * 34); g.lineTo(w / 2 - 60, 107 + i * 34); g.fill(); } noiseFill(g, w, h, 8, 24); });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.5), new THREE.MeshLambertMaterial({ map: rugT, bumpMap: WEAVE, bumpScale: 1.5 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(W / 2 + 0.7, 0.006, 1.1); rug.receiveShadow = true; sc.add(rug);
  // walls with a real window opening
  const wallM = new THREE.MeshLambertMaterial({ color: 0xe6d8c2, bumpMap: PLASTER, bumpScale: 0.6 });
  const wallBox = (x0, x1, y0, y1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.3), wallM); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, wz - 0.15); b.castShadow = b.receiveShadow = true; sc.add(b); };
  wallBox(-8, wx - 0.9, 0, 10); wallBox(wx + 0.9, 8, 0, 10); wallBox(wx - 0.9, wx + 0.9, 0, oy0); wallBox(wx - 0.9, wx + 0.9, oy1, 10);
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.3, 10, 14), wallM); side.position.set(-4.3, 5, 3.6); side.receiveShadow = true; sc.add(side);
  const trimM = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 0.4 });
  const bb = new THREE.Mesh(new THREE.BoxGeometry(16, 0.24, 0.06), trimM); bb.position.set(0, 0.12, wz + 0.03); bb.receiveShadow = true; sc.add(bb);
  const bb2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 14), trimM); bb2.position.set(-4.12, 0.12, 3.6); sc.add(bb2);
  const win = new THREE.Group(); win.position.set(wx, (oy0 + oy1) / 2, wz); sc.add(win);
  [[0, 1.05, 1.92, 0.12], [0, -1.05, 1.92, 0.12], [0.95, 0, 0.12, 2.22], [-0.95, 0, 0.12, 2.22], [0, 0, 0.06, 2.1], [0, 0.0, 1.8, 0.06]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16), trimM); b.position.set(x, y, 0); b.castShadow = true; win.add(b); });
  const sill = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.08, 0.4, 2, 0.02), trimM); sill.position.set(0, -1.1, 0.14); sill.castShadow = sill.receiveShadow = true; win.add(sill);
  const plant = new THREE.Group(); plant.position.set(-0.6, -1.06, 0.16); win.add(plant);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.2, 24), new THREE.MeshPhysicalMaterial({ color: 0xd86a3c, roughness: 0.55 })); pot.position.y = 0.1; pot.castShadow = true; plant.add(pot);
  for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0x3f9a52, roughness: 0.5, sheen: 0.5 })); lf.scale.set(0.45, 1.3, 0.18); lf.position.set(Math.cos(i * 2.4) * 0.07, 0.3 + (i % 3) * 0.06, Math.sin(i * 2.4) * 0.07); lf.rotation.set(Math.sin(i) * 0.7, i * 2.4, Math.cos(i) * 0.7); lf.castShadow = true; plant.add(lf); }
  // sky beyond the opening
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), new THREE.MeshBasicMaterial({ map: night ? NIGHT_SKY : DAY_SKY })); sky.position.set(wx, 4.2, -10); sc.add(sky); R.sky = sky;
  if (night) {
    const moon = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), hdr(3.2, 3.1, 2.7)); moon.position.set(wx + 0.9, 5.3, -9.9); sc.add(moon); R.moon = moon;
    const halo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshBasicMaterial({ map: gradTex([[0, 'rgba(160,180,255,0.5)'], [1, 'rgba(0,0,0,0)']], 0.5, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.set(wx + 0.9, 5.3, -9.95); sc.add(halo);
    const r = rng(5); for (let i = 0; i < 40; i++) { const st = new THREE.Mesh(new THREE.CircleGeometry(0.02 + r() * 0.03, 6), hdr(2, 2, 2.2)); st.position.set(wx + (r() - 0.5) * 9, 3 + r() * 5, -9.9); sc.add(st); }
  } else {
    const sun = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), hdr(6, 5, 3.4)); sun.position.set(wx - 0.6, 3.6, -9.9); sc.add(sun); R.sun = sun;
  }
  // curtains on a rod
  const curtM = new THREE.MeshLambertMaterial({ color: night ? 0x5566a8 : 0x6f80c4, bumpMap: WEAVE_FINE, bumpScale: 0.7, side: THREE.DoubleSide });
  [-1, 1].forEach(sd => {
    const g = new THREE.PlaneGeometry(0.85, 3.6, 60, 10), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), f = 0.6 + 0.4 * (1.8 - y) / 3.6; p.setX(i, x * f); p.setZ(i, 0.075 * Math.sin((x + 0.43) * 24) * (0.8 + 0.2 * f)); }
    g.computeVertexNormals(); const c = new THREE.Mesh(g, curtM); c.position.set(wx + sd * 1.3, 3.25, wz + 0.25); c.castShadow = c.receiveShadow = true; sc.add(c);
  });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.4, 12), M.chrome); rod.rotation.z = Math.PI / 2; rod.position.set(wx, 5.07, wz + 0.25); sc.add(rod);
  // picture on the side wall
  const art = canvasTex(256, 320, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6c27a'); gr.addColorStop(1, '#e46a5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(170, 110, 34, 0, 7); g.fill(); g.fillStyle = '#5a3a6e'; g.beginPath(); g.moveTo(0, 250); g.lineTo(90, 150); g.lineTo(160, 230); g.lineTo(210, 180); g.lineTo(256, 230); g.lineTo(256, 320); g.lineTo(0, 320); g.fill(); });
  const pic = new THREE.Group(); pic.position.set(-4.13, 3.5, 0.2); pic.rotation.y = Math.PI / 2; sc.add(pic);
  const pf = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.24, 0.06, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x2b2420, roughness: 0.4, clearcoat: 0.6 })); pic.add(pf);
  const pc = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.06), new THREE.MeshStandardMaterial({ map: art, roughness: 0.7 })); pc.position.z = 0.032; pic.add(pc);
  // bed, nightstand, lamp, clock, books
  makeBed(sc, W);
  const nx = -W / 2 - 0.75, nz = -1.55;
  const nwood = woodTex('#7a4a2a', '#3e2412', 41);
  const nm = new THREE.MeshStandardMaterial({ map: nwood, bumpMap: nwood, bumpScale: 0.4, roughness: 0.35 });
  const ns = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.88, 0.66, 3, 0.03), nm); ns.position.set(nx, 0.47, nz); ns.castShadow = ns.receiveShadow = true; sc.add(ns);
  const nt = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.06, 0.72, 3, 0.025), nm); nt.position.set(nx, 0.94, nz); nt.castShadow = nt.receiveShadow = true; sc.add(nt);
  [0.66, 0.3].forEach(y => { const d = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.3, 0.02, 2, 0.01), nm); d.position.set(nx, y, nz + 0.335); sc.add(d); const k = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xd8b060, metalness: 1, roughness: 0.25 })); k.position.set(nx, y, nz + 0.36); sc.add(k); });
  const lampG = new THREE.Group(); lampG.position.set(nx - 0.12, 0.97, nz - 0.08); sc.add(lampG);
  const lb = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.11, 0], [0.13, 0.04], [0.15, 0.16], [0.12, 0.29], [0.05, 0.34], [0.035, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 32), new THREE.MeshPhysicalMaterial({ color: 0x8fb8b0, roughness: 0.15, clearcoat: 1 })); lb.castShadow = true; lampG.add(lb);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.32, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xfff1dc, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(1.0, 0.62, 0.3), emissiveIntensity: night ? 1.4 : 0 })); shade.position.y = 0.66; lampG.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), night ? hdr(6, 4, 2.2) : hdr(1, 1, 1)); bulb.position.y = 0.56; lampG.add(bulb);
  const lamp = new THREE.PointLight(0xffb070, night ? 9 : 0, 9, 2); lamp.position.set(nx - 0.12, 1.55, nz - 0.08); sc.add(lamp); R.lamp = lamp;
  const clockT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#060606'; g.fillRect(0, 0, w, h); g.fillStyle = night ? '#ff3b2e' : '#ff3b2e'; g.font = 'bold 92px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(night ? '3:12' : '7:00', w / 2, h / 2 + 4); });
  const ck = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.18, 0.14, 2, 0.03), new THREE.MeshPhysicalMaterial({ color: 0x1d1f24, roughness: 0.35, clearcoat: 1 })); ck.position.set(nx + 0.22, 1.06, nz + 0.12); ck.rotation.y = 0.35; ck.castShadow = true; sc.add(ck);
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.13), new THREE.MeshBasicMaterial({ map: clockT, color: new THREE.Color(2.2, 2.2, 2.2) })); cs.position.set(0, 0, 0.071); ck.add(cs);
  [[0x2f6f8f, 0.04], [0xc0503a, 0.035], [0xe0b040, 0.03]].reduce((y, [c, hgt], i) => { const b = new THREE.Mesh(new RoundedBoxGeometry(0.3, hgt, 0.22, 2, 0.008), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.6 })); b.position.set(nx + 0.22, y + hgt / 2, nz - 0.18); b.rotation.y = 0.2 * i - 0.2; b.castShadow = true; sc.add(b); return y + hgt; }, 0.97);
  // light through the window
  const tgt = V(0, 1.0, -0.4), wc = V(wx, (oy0 + oy1) / 2, wz);
  const key = new THREE.DirectionalLight(night ? 0xa8bcff : 0xffd29a, night ? 2.6 : 4.6);
  key.position.copy(tgt.clone().add(wc.clone().sub(tgt).multiplyScalar(2.6))); key.target.position.copy(tgt); sc.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  key.shadow.bias = -0.0003; key.shadow.normalBias = 0.03; key.userData.soft = 0.22; R.key = key;
  sc.add(new THREE.HemisphereLight(night ? 0x6a7eb8 : 0xfff0dc, night ? 0x221a24 : 0x9a7a5a, night ? 0.5 : 0.75));
  const faceL = new THREE.DirectionalLight(night ? 0xffc89a : 0xfff0e0, night ? 1.25 : 0.7); faceL.position.set(-3.5, 5, 3.5); sc.add(faceL);
  const fillL = new THREE.DirectionalLight(night ? 0x3a4a8a : 0xffe6c8, night ? 0.25 : 0.6); fillL.position.set(4, 5, 6); sc.add(fillL);
  R.shaft = lightShaft(sc, wc.clone().add(V(0, 0, 0.1)), tgt.clone().sub(wc).normalize(), 1.8, 2.1, 7, night ? 0x8fa8ff : 0xffd8a0, night ? 0.07 : 0.11);
  return R;
}
// pose a character lying on its back: head on the pillow, body inclined slightly, legs flat
function lie(p, x = 0, headZ = -1.5, d = 0.08, neckA = 0.45) {
  const u = p.userData; p.rotation.set(-Math.PI / 2 + d, 0, 0);
  const hipY = TOP + 0.31, hipZ = headZ + 1.62;
  p.position.set(x, hipY - 1.3 * Math.sin(d), hipZ + 1.3 * Math.cos(d));
  u.legs.forEach((L, i) => L.hip.rotation.set(-d + 0.1, (i ? 1 : -1) * 0.4, 0));
  u.neck(neckA);
}
const armsRest = (u, k = 1) => u.arms.forEach(a => { a.sh.rotation.set(-0.6 * k, 0, -a.sx * 0.22 * k); a.el.rotation.set(0.25 * k, 0, -a.sx * 0.3 * k); });
