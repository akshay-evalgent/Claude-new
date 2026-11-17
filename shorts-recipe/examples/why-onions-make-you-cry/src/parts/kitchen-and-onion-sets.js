// =====================================================================
// SETS: "Why Onions Make You Cry". A kitchen, onions (whole, halved, sliced), a knife and board, tears,
// the gas, a close-up of onion cells, the enzyme, the eye's nerves, a fridge, and a hungry mouse.
// =====================================================================
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
function person(sc, o) { const P = makeKid(o); addSmile(P); sc.add(P); return P; }
const COOK = { ...OWNER, shirt: 0x5a8ac8 };
const TOP = 1.86;                                   // worktop height

// ---------- the kitchen ----------
function kitchen(sc, { night = false } = {}) {
  sc.background = new THREE.Color(0x1a1612); sc.environment = MENV; const R = {};
  const fw = woodTex('#b08a62', '#6a4a2e', 41, [3, 3], 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.4, roughness: 0.45 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wallM = new THREE.MeshLambertMaterial({ color: 0xf0e6d6, bumpMap: PLASTER, bumpScale: 0.4 });
  const wall = (w, h, x, y, z, ry, m = wallM) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry; p.receiveShadow = true; sc.add(p); return p; };
  wall(14, 8, 0, 4, -1.85, 0); wall(10, 8, -4.5, 4, 2, Math.PI / 2); wall(10, 8, 4.8, 4, 2, -Math.PI / 2);
  // a tiled backsplash
  const tT = tileTex({ n: 8, cols: ['#e9f1ee', '#e2ece8', '#f1f5f2'], grout: '#c9d2cf', seed: 8, rep: [4, 1.2] });
  const bs = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), new THREE.MeshStandardMaterial({ map: tT, bumpMap: tT, bumpScale: 0.5, roughness: 0.2 })); bs.position.set(0.6, TOP + 0.8, -1.84); bs.receiveShadow = true; sc.add(bs);
  // base cabinets and the worktop
  const cab = new THREE.MeshStandardMaterial({ color: 0x3f6f6a, roughness: 0.5 }), wt = new THREE.MeshStandardMaterial({ map: woodTex('#c89a68', '#8a5a34', 7, [2, 1], 0), roughness: 0.35 });
  box(sc, 6.4, TOP - 0.08, 1.15, 0.6, (TOP - 0.08) / 2, -1.25, cab, 0.03);
  box(sc, 6.6, 0.08, 1.3, 0.6, TOP - 0.04, -1.2, wt, 0.02);
  for (let i = 0; i < 5; i++) { const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.25, 4, 8), M.chrome); h.rotation.z = Math.PI / 2; h.position.set(-2.1 + i * 1.3, TOP - 0.35, -0.66); sc.add(h); }
  // upper cabinets with a window between them
  box(sc, 2.0, 1.2, 0.6, -1.8, 4.6, -1.55, cab, 0.03); box(sc, 2.0, 1.2, 0.6, 3.0, 4.6, -1.55, cab, 0.03);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.4), hdr(2.0, 2.2, 2.4)); sky.position.set(0.6, 4.1, -1.83); sc.add(sky);
  const wf = new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.45 }); box(sc, 2.05, 0.08, 0.1, 0.6, 4.84, -1.8, wf, 0.02); box(sc, 2.05, 0.08, 0.1, 0.6, 3.36, -1.8, wf, 0.02); box(sc, 0.08, 1.5, 0.1, -0.4, 4.1, -1.8, wf, 0.02); box(sc, 0.08, 1.5, 0.1, 1.6, 4.1, -1.8, wf, 0.02);
  // a fridge on the left
  const fr = new THREE.Group(); fr.position.set(-3.25, 0, -1.0); sc.add(fr); R.fridge = fr;
  const fm = new THREE.MeshPhysicalMaterial({ color: 0xeef2f4, roughness: 0.25, clearcoat: 0.6 });
  // a hollow cabinet (back, sides, top, bottom) so you can see in when the door is open
  [[1.5, 3.9, 0.08, 0, 1.95, -0.66], [0.08, 3.9, 1.4, -0.71, 1.95, 0], [0.08, 3.9, 1.4, 0.71, 1.95, 0], [1.5, 0.08, 1.4, 0, 3.86, 0], [1.5, 1.32, 1.4, 0, 0.66, 0]].forEach(([w, h, d, x, y, z]) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.03), fm); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; fr.add(b); });
  const door = new THREE.Group(); door.position.set(0.75, 0, 0.7); fr.add(door); R.door = door;
  const dm = new THREE.Mesh(new RoundedBoxGeometry(1.5, 2.5, 0.08, 4, 0.04), fm); dm.position.set(-0.75, 2.6, 0.04); dm.castShadow = true; door.add(dm);
  const hd = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.6, 4, 8), M.chrome); hd.position.set(-1.35, 2.45, 0.12); door.add(hd);
  const coldL = new THREE.PointLight(0xbfe4ff, 0, 4, 2); coldL.position.set(0, 2.6, 0.4); fr.add(coldL); R.coldL = coldL;
  // pot plant and a jar on the worktop for life
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1 })); jar.position.set(2.4, TOP + 0.21, -1.5); sc.add(jar);
  pottedPlant(sc, 3.2, -1.45, 0.45);
  // light: daylight through the window, a warm ceiling light
  sc.add(new THREE.HemisphereLight(0xfff4e6, 0x6a5a4a, 0.75));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4); sun.position.set(1.0, 6.5, -6); sun.target.position.set(0.3, TOP, 0.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); sun.shadow.bias = -0.0005; sun.userData.soft = 0.25; sc.add(sun, sun.target);
  const ceil = new THREE.PointLight(0xffdcb0, 14, 12, 2); ceil.position.set(0.4, 6.0, 1.2); ceil.castShadow = true; ceil.shadow.mapSize.set(1024, 1024); ceil.shadow.bias = -0.002; sc.add(ceil);
  const fill = new THREE.PointLight(0xffe2c0, 6, 9, 1.6); fill.position.set(0.5, 3.4, -1.2); sc.add(fill);
  R.board = cuttingBoard(); R.board.position.set(0.3, TOP, -1.0); sc.add(R.board);
  return R;
}
function cuttingBoard() { const g = new THREE.Group(); const m = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.07, 0.8, 4, 0.03), new THREE.MeshStandardMaterial({ map: woodTex('#d8a870', '#9a6a3a', 11, [1, 1], 0), roughness: 0.55 })); m.position.y = 0.035; m.castShadow = m.receiveShadow = true; g.add(m); g.userData.top = 0.07; return g; }
function knife() {
  const g = new THREE.Group();
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.62, 0); s.quadraticCurveTo(0.78, 0.0, 0.84, 0.1); s.lineTo(0, 0.13); s.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }), new THREE.MeshPhysicalMaterial({ color: 0xdfe6ea, metalness: 1, roughness: 0.16, envMapIntensity: 1.6 })); blade.position.set(0.0, 0, -0.004); g.add(blade);
  const handle = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.09, 0.05, 3, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x1d1a18, roughness: 0.35, clearcoat: 0.5 })); handle.position.set(-0.22, 0.07, 0); g.add(handle);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;        // the edge runs along +x at y = 0; the handle is at -x
}
// ---------- onions ----------
const SKIN_T = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c98a3e'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(${120 + r() * 80},${70 + r() * 40},${20 + r() * 20},${0.3 + r() * 0.4})`; g.lineWidth = 1 + r() * 2.5; const x = r() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 30, h * 0.3, x + (r() - 0.5) * 30, h * 0.7, x + (r() - 0.5) * 20, h); g.stroke(); } noiseFill(g, w, h, 6, 18); });
const RING_T = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f6eed8'; g.fillRect(0, 0, w, h); for (let r = 124; r > 6; r -= 13) { g.strokeStyle = 'rgba(190,170,120,0.8)'; g.lineWidth = 2.5; g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); g.strokeStyle = 'rgba(255,255,245,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(128, 128, r - 4, 0, 7); g.stroke(); } g.strokeStyle = '#c98a3e'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 125, 0, 7); g.stroke(); });
function onionProfile(r = 0.3) { const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40, y = -Math.cos(a * Math.PI), rr = Math.sin(a * Math.PI) * (y > 0 ? Math.pow(1 - y, 0.7) * 1.05 + 0.02 : 1); pts.push(new THREE.Vector2(Math.max(1e-3, rr * r), (y > 0 ? y * 1.25 : y * 0.92) * r + 0.92 * r)); } return pts; }
function onion(r = 0.3, { golden = false } = {}) {
  const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ map: SKIN_T, roughness: 0.42, clearcoat: 0.35, sheen: 0.4, sheenColor: new THREE.Color(0xffe0a0) }); if (golden) m.color.set(0xffe6a0);
  const b = new THREE.Mesh(new THREE.LatheGeometry(onionProfile(r), 48), m); b.castShadow = b.receiveShadow = true; g.add(b);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02 * r / 0.3, 0.14 * r / 0.3, 8), m); tip.position.y = 0.92 * r + 1.25 * r + 0.05 * r / 0.3; g.add(tip);
  for (let i = 0; i < 9; i++) { const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.002, 0.08 * r / 0.3, 4), new THREE.MeshStandardMaterial({ color: 0xd8c4a0 })); rt.position.set((h3(i, 1, 2) - 0.5) * 0.05, 0.0, (h3(i, 3, 4) - 0.5) * 0.05); rt.rotation.set((h3(i, 5, 6) - 0.5) * 1.2, 0, (h3(i, 7, 8) - 0.5) * 1.2); g.add(rt); }
  return g;
}
// a half onion, cut face up, showing its rings
function onionHalf(r = 0.3) {
  const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ map: SKIN_T, roughness: 0.42, clearcoat: 0.35 });
  const half = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m); half.scale.set(1, 1.15, 1); half.rotation.x = Math.PI; half.position.y = r * 1.15; half.castShadow = true; g.add(half);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshPhysicalMaterial({ map: RING_T, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 })); face.rotation.x = -Math.PI / 2; face.position.y = r * 1.15 + 0.001; g.add(face);
  return g;
}
// thin rings that fall away as you slice (n slices, cut progress k)
function slices(sc, n = 8, r = 0.28) {
  const geo = new THREE.CylinderGeometry(r, r, 0.035, 40), mats = [new THREE.MeshPhysicalMaterial({ color: 0xc98a3e, roughness: 0.4 }), new THREE.MeshPhysicalMaterial({ map: RING_T, roughness: 0.25, clearcoat: 0.8 }), new THREE.MeshPhysicalMaterial({ map: RING_T, roughness: 0.25, clearcoat: 0.8 })];
  const S = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, mats); m.castShadow = true; m.visible = false; sc.add(m); S.push(m); } return S;
}

// ---------- tears running down the cheeks ----------
function tears(sc, P, n = 6) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x9fd8ff, roughness: 0.0, clearcoat: 1, transparent: true, opacity: 0.5, envMapIntensity: 3.2 });
  const D = []; for (let i = 0; i < n; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 12), m); d.visible = false; sc.add(d); D.push(d); }
  const well = [-1, 1].map(() => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), m); w.scale.set(1.5, 0.6, 0.8); sc.add(w); return w; });
  return (t, k = 1) => {
    const H = P.userData.head; H.updateMatrixWorld(true);
    well.forEach((w, i) => { const sx = i ? 1 : -1; w.visible = k > 0.05; w.position.copy(worldPt(H, V(sx * 0.2, 0.0, 0.43))); w.scale.set(1.5 * k, 0.6 * k, 0.8 * k); });
    D.forEach((d, i) => { const sx = i % 2 ? 1 : -1, ph = ((t * 0.55 + i * 0.37) % 1 + 1) % 1; d.visible = k > 0.15; if (!d.visible) return;
      const p = worldPt(H, V(sx * (0.22 + 0.06 * ph), -0.02 - 0.42 * ph, 0.43 - 0.06 * ph * ph)); d.position.copy(p); const s = (0.7 + 0.5 * ph) * k; d.scale.set(s, s * (1.3 + 0.4 * ph), s); });
  };
}
// ---------- the gas: a faint yellow-green haze rising off the board ----------
const GAS_T = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, 'rgba(170,225,60,0.95)'); gr.addColorStop(0.5, 'rgba(150,205,50,0.5)'); gr.addColorStop(1, 'rgba(150,205,50,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
function gasCloud(sc, n = 40, seed = 9) {
  const r = rng(seed), P = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: GAS_T, transparent: true, depthWrite: false, opacity: 0, toneMapped: false })); m.userData.noDof = true; sc.add(m); P.push({ m, x: r() - 0.5, z: r() - 0.5, ph: r(), sp: 0.7 + 0.6 * r() }); }
  // from -> to (world): the haze rises from the board toward a target (your eyes)
  return (t, cam, from, to, k = 1) => P.forEach((q, i) => {
    const ph = ((t * 0.5 * q.sp + q.ph) % 1 + 1) % 1, p = from.clone().lerp(to, ph).add(V(q.x * 0.35 * (1 - ph) + 0.08 * fbm(t * 0.5 + i, 1), 0.1 * Math.sin(ph * 3 + i), q.z * 0.3 * (1 - ph)));
    q.m.position.copy(p); q.m.quaternion.copy(cam.quaternion); q.m.scale.setScalar(0.18 + 0.36 * ph); q.m.material.opacity = 0.8 * k * Math.sin(Math.PI * ph);
  });
}

// ---------- onion cells under the microscope: long glassy cells, each with a purple vacuole (the enzyme) and yellow granules ----------
function cellField(sc, nx = 4, ny = 7) {
  const g = new THREE.Group(); sc.add(g);
  const wallM = new THREE.MeshPhysicalMaterial({ color: 0xf2ffe8, roughness: 0.15, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const vacM = new THREE.MeshPhysicalMaterial({ color: 0xb06ad8, roughness: 0.3, transparent: true, opacity: 0.72, clearcoat: 0.8, emissive: new THREE.Color(0x5a1a8a), emissiveIntensity: 0.4 });
  const yelM = new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: new THREE.Color(0x8a6a00), emissiveIntensity: 0.6, roughness: 0.4 });
  const gasM = new THREE.MeshStandardMaterial({ color: 0xb8f06a, emissive: new THREE.Color(0x5a9a1a), emissiveIntensity: 1.0, roughness: 0.3 });
  const C = [], cw = 0.62, ch = 0.3;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = new THREE.Group(); c.position.set((i - (nx - 1) / 2) * (cw + 0.03) + (j % 2) * 0.3, (j - (ny - 1) / 2) * (ch + 0.03), 0); g.add(c);
    const wall = new THREE.Mesh(new RoundedBoxGeometry(cw, ch, 0.22, 4, 0.06), wallM); wall.renderOrder = 3; c.add(wall);
    const vac = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), vacM); vac.scale.set(cw * 0.32, ch * 0.32, 0.07); vac.position.x = -cw * 0.12; c.add(vac);
    const gr = []; for (let k = 0; k < 7; k++) { const y = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), yelM); y.position.set(cw * (0.16 + 0.22 * h3(i, j, k)), ch * (h3(k, i, j) - 0.5) * 0.6, 0.02); c.add(y); gr.push(y); }
    const gas = []; for (let k = 0; k < 5; k++) { const q = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), gasM); q.visible = false; c.add(q); gas.push(q); }
    C.push({ c, wall, vac, gr, gas, i, j, seed: h3(i, j, 9) });
  }
  // cut: the cells the blade has reached burst (0..1 per cell); mix: contents swirl together; gas: green molecules rise
  g.userData.set = (t, burstOf, mix, gasK) => C.forEach(q => {
    const b = burstOf(q); q.wall.scale.set(1 + 0.25 * b, 1 + 0.25 * b, 1); q.wall.material.opacity = 0.28; q.wall.visible = b < 0.95;
    const m = clamp(mix * b * 1.2); q.vac.position.x = -0.62 * 0.12 * (1 - m) + 0.04 * Math.sin(t * 3 + q.seed * 9) * m; q.vac.scale.set(0.62 * 0.32 * (1 + 0.5 * m), 0.3 * 0.32 * (1 + 0.4 * m), 0.07);
    q.gr.forEach((y, k) => { y.position.x = lerp(0.62 * (0.16 + 0.22 * h3(q.i, q.j, k)), 0.12 * Math.cos(t * 2 + k), m); y.visible = gasK * b < 0.6; });
    q.gas.forEach((p, k) => { const a = clamp(gasK * b * 1.5 - k * 0.12); p.visible = a > 0.02; p.position.set(0.15 * Math.sin(k * 2.1 + t), -0.05 + a * (0.25 + 0.1 * k) + 0.02 * Math.sin(t * 4 + k), 0.06 + 0.04 * k); p.scale.setScalar(0.7 + 0.5 * a); });
  });
  g.userData.cells = C; return g;
}
// the tear enzyme: a ribbon-like protein that glows
function enzyme(seed = 3) {
  const g = new THREE.Group(), r = rng(seed); const pts = []; let p = V(0, 0, 0);
  for (let i = 0; i < 26; i++) { p = p.clone().add(V((r() - 0.5) * 0.35, (r() - 0.5) * 0.35, (r() - 0.5) * 0.35)); if (p.length() > 0.45) p.multiplyScalar(0.45 / p.length()); pts.push(p); }
  const m = new THREE.MeshPhysicalMaterial({ color: 0x7ad8a0, roughness: 0.3, clearcoat: 0.8, emissive: new THREE.Color(0x1a6a3a), emissiveIntensity: 0.5 });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.045, 10, false), m); g.add(tube);
  return g;
}
// the eye with its nerves: a big eyeball and glowing nerve branches that light up
function nerveEye() {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), new THREE.MeshPhysicalMaterial({ map: HEYE, roughness: 0.08, clearcoat: 1 })); ball.rotation.y = 0; g.add(ball);
  const nm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.7, 0.3), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  const NV = []; const r = rng(4);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, pts = [V(Math.cos(a) * 0.62, Math.sin(a) * 0.62, -0.1)]; for (let k = 1; k < 6; k++) { const b = a + (r() - 0.5) * 0.4, rr = 0.62 - k * 0.07; pts.push(V(Math.cos(b) * rr, Math.sin(b) * rr, 0.12 + k * 0.06)); } const n = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 6, false), nm.clone()); n.userData.noDof = true; g.add(n); NV.push(n); }
  g.userData.set = (k, t) => NV.forEach((n, i) => { n.material.opacity = k * (0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)); });
  return g;
}
