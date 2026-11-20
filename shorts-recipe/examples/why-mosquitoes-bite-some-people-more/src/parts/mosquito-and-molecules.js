// =====================================================================
// THE MOSQUITO: a female Aedes aegypti, in centimetres (+x head, +y up). A scaled thorax with the white lyre, a
// banded abdomen that swells red as she feeds (the plates spread apart over a stretched, blood-filled membrane),
// faceted compound eyes, antennae with whorls of hairs (bushy on the male), palps, a proboscis whose sheath bows
// back while the needle goes in, six banded legs placed by IK, wings that fold at rest and blur in flight.
// Also: ball-and-stick molecules (merged into single meshes).
// =====================================================================
const V2 = (x, y) => new THREE.Vector2(x, y);
const hCanvas = (w, h, draw) => { const [c, g] = mkCanvas(w, h); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); draw(g, w, h); return c; };
const rep = (t, x, y) => { const k = t.clone(); k.repeat.set(x, y); k.wrapS = k.wrapT = THREE.RepeatWrapping; k.needsUpdate = true; return k; };
// overlapping cuticle scales
const SCALE_N = heightToNormal(hCanvas(512, 512, (g, w, h) => { const r = rng(31);
  for (let row = 0; row < 42; row++) for (let i = 0; i < 28; i++) { const x = (i + (row % 2) * 0.5) * w / 28 + (r() - 0.5) * 4, y = row * h / 42 + (r() - 0.5) * 3;
    const gr = g.createLinearGradient(x, y - 9, x, y + 9); gr.addColorStop(0, '#5a5a5a'); gr.addColorStop(0.72, '#d0d0d0'); gr.addColorStop(1, '#8a8a8a');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 10.5, 8.5, 0, 0, 7); g.fill(); } }), 2.2);
// hexagonal facets of the compound eye
const FACET_N = heightToNormal(hCanvas(256, 256, (g, w, h) => { const s = 8, hh = s * 0.866;
  for (let y = -1; y < h / hh + 1; y++) for (let x = -1; x < w / s + 1; x++) { const cx = x * s + (y % 2) * s / 2, cy = y * hh, gr = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.56);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.8, '#9a9a9a'); gr.addColorStop(1, '#303030'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, s * 0.56, 0, 7); g.fill(); } }), 3);
// fine noise for organic surfaces
const GRAIN_N = heightToNormal(hCanvas(256, 256, (g, w, h) => { const r = rng(5); for (let i = 0; i < 9000; i++) { const v = 90 + r() * 80 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }), 1.5);

// thorax: dark scales with the white lyre, painted in a top-down projection (x: back -> front, y: right -> left)
const THORAX_T = (() => { const [c, g] = mkCanvas(512, 512), r = rng(3); g.fillStyle = '#2c2119'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(92,66,44,0.4)' : 'rgba(10,7,5,0.45)'; g.fillRect(r() * 512, r() * 512, 2 + r() * 3, 1 + r() * 2); }
  g.strokeStyle = 'rgba(238,232,220,0.95)'; g.lineCap = 'round'; g.shadowColor = 'rgba(238,232,220,0.6)'; g.shadowBlur = 6;
  for (const s of [-1, 1]) { g.lineWidth = 15; g.beginPath(); g.moveTo(410, 256 + s * 70); g.bezierCurveTo(330, 256 + s * 175, 200, 256 + s * 165, 120, 256 + s * 88); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(400, 256 + s * 16); g.lineTo(110, 256 + s * 14); g.stroke(); }
  g.shadowBlur = 0; g.fillStyle = 'rgba(225,222,215,0.9)'; for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(120 + i * 70, 256 + s * (228 + r() * 12), 22, 12, 0, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(232,230,222,0.9)'; g.beginPath(); g.ellipse(70, 256, 30, 46, 0, 0, 7); g.fill();
  return texOf(c); })();
// abdomen plate: u around (dorsal at 0.75), v along (front at 1): black with a white basal band and silver side spots, paler underneath
const PLATE_T = (() => { const [c, g] = mkCanvas(256, 128), r = rng(4); g.fillStyle = '#261c15'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = 'rgba(70,60,52,0.9)'; g.fillRect(20, 0, 70, 128);
  { const gr = g.createLinearGradient(0, 0, 0, 30); gr.addColorStop(0, 'rgba(200,196,188,0.9)'); gr.addColorStop(1, 'rgba(200,196,188,0)'); g.fillStyle = gr; g.fillRect(150, 0, 84, 30); }
  for (const u of [0, 128, 256]) { const gr = g.createRadialGradient(u, 30, 2, u, 30, 40); gr.addColorStop(0, 'rgba(190,192,196,0.75)'); gr.addColorStop(1, 'rgba(190,192,196,0)'); g.fillStyle = gr; g.fillRect(u - 42, 0, 84, 80); }
  for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(120,110,100,0.18)'; g.fillRect(r() * 256, r() * 128, 2, 1); }
  return texOf(c); })();
// one leg's bands along its length (u): black, a white knee spot, white rings at the base of the tarsal segments
function legTex(f1, f2, hind) { const [c, g] = mkCanvas(1024, 4); g.fillStyle = '#16120e'; g.fillRect(0, 0, 1024, 4);
  g.fillStyle = '#4a3c30'; g.fillRect(0, 0, f1 * 1024 * 0.55, 4);
  g.fillStyle = '#ece8df'; g.fillRect((f1 - 0.012) * 1024, 0, 0.016 * 1024, 4);
  const segs = [0.38, 0.22, 0.16, 0.12, 0.12]; let u = f2; const L = 1 - f2;
  segs.forEach((s, i) => { const w = s * L; if (hind && i === 4) { g.fillRect(u * 1024, 0, w * 1024, 4); } else if (hind || i < 2) g.fillRect(u * 1024, 0, w * 0.3 * 1024, 4); u += w; });
  const t = texOf(c); t.wrapS = THREE.ClampToEdgeWrapping; return t; }
// wing: veins lined with scales, a fringe of scales on the trailing edge, a clear membrane; plus a solid mask for depth
function wingCanvas(mask) { const [c, g] = mkCanvas(1024, 256), r = rng(8); const out = (u) => 0.5 + 0.42 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.9) * (u < 0.08 ? u / 0.08 : 1);
  const lead = (u) => 0.5 + 0.3 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.1) * (u < 0.05 ? u / 0.05 : 1);
  const P = (u, k) => [u * 1000 + 12, (lead(u) + (out(u) - lead(u)) * 0 - (lead(u) - 0.5) * 0 - k) * 256];
  g.beginPath(); for (let i = 0; i <= 100; i++) { const u = i / 100; g.lineTo(u * 1000 + 12, (1 - lead(u)) * 256); } for (let i = 100; i >= 0; i--) { const u = i / 100; g.lineTo(u * 1000 + 12, out(u) * 256 + (1 - out(u)) * 0); } g.closePath();
  if (mask) { g.fillStyle = '#fff'; g.fill(); return c; }
  g.fillStyle = 'rgba(205,205,212,0.13)'; g.fill(); g.save(); g.clip();
  // veins: lines fanning out from the base, some forking
  const vein = (pts, w) => { g.strokeStyle = 'rgba(38,28,20,0.92)'; g.lineWidth = w; g.beginPath(); pts.forEach(([u, v], i) => i ? g.lineTo(u * 1000 + 12, v * 256) : g.moveTo(u * 1000 + 12, v * 256)); g.stroke();
    for (let i = 0; i < 26; i++) { const k = r(), j = Math.floor(k * (pts.length - 1)), f = k * (pts.length - 1) - j, a = pts[j], b = pts[j + 1]; const x = lerp(a[0], b[0], f) * 1000 + 12, y = lerp(a[1], b[1], f) * 256; g.fillStyle = 'rgba(30,22,16,0.85)'; g.beginPath(); g.ellipse(x, y, 4, 2, (r() - 0.5) * 0.8, 0, 7); g.fill(); } };
  const ld = (u) => 1 - lead(u), od = (u) => out(u);
  vein([[0, 0.5], [0.3, ld(0.3) + 0.01], [0.7, ld(0.7) + 0.005], [1, 0.5]], 4);
  vein([[0.02, 0.5], [0.45, ld(0.45) + 0.06], [0.6, ld(0.6) + 0.04]], 3);
  vein([[0.03, 0.52], [0.5, 0.36], [0.97, 0.45]], 3); vein([[0.5, 0.36], [0.98, 0.39]], 2.5);
  vein([[0.04, 0.53], [0.55, 0.47], [0.9, 0.5]], 3); vein([[0.55, 0.47], [0.95, 0.55]], 2.5);
  vein([[0.05, 0.55], [0.5, 0.6], [0.85, 0.66]], 3); vein([[0.5, 0.6], [0.78, 0.74]], 2.5);
  vein([[0.06, 0.58], [0.4, 0.7], [0.6, od(0.6) - 0.02]], 2.5); vein([[0.08, 0.6], [0.3, od(0.3) - 0.03]], 2.5);
  vein([[0.45, 0.36], [0.47, 0.6]], 1.5); vein([[0.58, 0.47], [0.6, 0.6]], 1.5);
  g.restore();
  // fringe of long scales along the trailing edge
  for (let i = 0; i < 260; i++) { const u = 0.08 + 0.92 * i / 260, x = u * 1000 + 12, y = out(u) * 256; g.strokeStyle = `rgba(30,24,18,${0.5 + r() * 0.4})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x - 6 - r() * 4, y + 10 + r() * 12 * Math.sin(Math.PI * u)); g.stroke(); }
  return c; }
const WING_T = texOf(wingCanvas(false)), WING_MASK = texOf(wingCanvas(true), false);
// a female's short palp / the proboscis: dark, white palp tips
const PALP_T = (() => { const [c, g] = mkCanvas(256, 4); g.fillStyle = '#17130f'; g.fillRect(0, 0, 256, 4); g.fillStyle = '#ece8e0'; g.fillRect(190, 0, 66, 4); const t = texOf(c); t.wrapS = THREE.ClampToEdgeWrapping; return t; })();

// ---------- geometry helpers ----------
// a thin tapering hair along +y (base at the origin), for instancing
const HAIR_GEO = (() => { const g = new THREE.CylinderGeometry(0.25, 1, 1, 4, 1); g.translate(0, 0.5, 0); return g; })();
function instHairs(list, mat, radius = 0.0006) {   // list: [{p, dir, len}]
  const m = new THREE.InstancedMesh(HAIR_GEO, mat, Math.max(1, list.length)), q = new THREE.Quaternion(), M4 = new THREE.Matrix4();
  list.forEach((h, i) => { q.setFromUnitVectors(V(0, 1, 0), h.dir.clone().normalize()); M4.compose(h.p, q, V(radius, h.len, radius)); m.setMatrixAt(i, M4); });
  m.count = list.length; m.castShadow = true; m.frustumCulled = false; return m; }
// two-bone IK: the knee between base B and ankle A, bent toward the pole
function ik2(B, A, L1, L2, pole) { const d0 = A.clone().sub(B), d = clamp(d0.length(), 1e-4, (L1 + L2) * 0.999), dir = d0.normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(L1 * L1 - a * a, 0)); const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  return B.clone().add(dir.clone().multiplyScalar(a)).add(p.multiplyScalar(h)); }

// ---------- the mosquito ----------
const MQM = {
  scale: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: THORAX_T, roughness: 0.78, normalMap: rep(SCALE_N, 3, 3), normalScale: V2(0.9, 0.9), sheen: 0.3, sheenColor: new THREE.Color(0x8a7a68), sheenRoughness: 0.6, envMapIntensity: 0.7 }),
  dark: () => new THREE.MeshPhysicalMaterial({ color: 0x18130f, roughness: 0.45, normalMap: rep(SCALE_N, 4, 4), normalScale: V2(0.6, 0.6), clearcoat: 0.3, clearcoatRoughness: 0.35, sheen: 0.45, sheenColor: new THREE.Color(0x8a7a6a), sheenRoughness: 0.5 }),
  eye: () => new THREE.MeshPhysicalMaterial({ color: 0x1a120c, roughness: 0.28, normalMap: rep(FACET_N, 7, 4), normalScale: V2(0.9, 0.9), clearcoat: 0.8, clearcoatRoughness: 0.2, iridescence: 0.8, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 520], sheen: 0.3, sheenColor: new THREE.Color(0x40ffb0) }),
  wing: () => new THREE.MeshPhysicalMaterial({ map: WING_T, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.12, metalness: 0.0, iridescence: 1.0, iridescenceIOR: 1.35, iridescenceThicknessRange: [260, 640], clearcoat: 0.4, envMapIntensity: 1.4 }),
  hair: () => new THREE.MeshPhysicalMaterial({ color: 0x2a2018, roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0xb09a80) }),
  blood: () => new THREE.MeshPhysicalMaterial({ color: 0x6a5a50, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x000000, sheen: 0.7, sheenColor: new THREE.Color(0xff3020), sheenRoughness: 0.3, normalMap: rep(GRAIN_N, 3, 3), normalScale: V2(0.3, 0.3) }),
  egg: () => new THREE.MeshPhysicalMaterial({ color: 0xf4f0e4, roughness: 0.35, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), emissive: 0x2a2620, emissiveIntensity: 0.5 }),
};
// a beating wing seen at 1/60 s: a soft translucent sector, denser at the ends of the stroke where the wing slows
const FAN_T = (() => { const [c, g] = mkCanvas(256, 128); const im = g.createImageData(256, 128); for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) { const u = x / 255, v = y / 127, k = (y * 256 + x) * 4;
  const ends = 0.35 + 0.65 * (Math.pow(Math.abs(u - 0.5) * 2, 3)), radial = Math.sin(Math.PI * Math.min(1, v * 1.05)) ** 0.5 * (v > 0.08 ? 1 : v / 0.08); const vein = 0.85 + 0.15 * Math.sin(v * 60);
  im.data[k] = 150; im.data[k + 1] = 156; im.data[k + 2] = 166; im.data[k + 3] = 255 * clamp(0.42 * ends * radial * vein); } g.putImageData(im, 0, 0); return texOf(c, false); })();
const FAN_GEO = (() => { const g = new THREE.BufferGeometry(), P = [], U = [], I = [], nA = 24, nR = 6, a0 = 0.35, a1 = 1.95, L = 0.3;
  for (let i = 0; i <= nA; i++) for (let j = 0; j <= nR; j++) { const a = lerp(a0, a1, i / nA), r = L * j / nR; P.push(-Math.cos(a) * r, 0.02 * Math.sin(a * 2) * r, Math.sin(a) * r); U.push(i / nA, j / nR); }
  for (let i = 0; i < nA; i++) for (let j = 0; j < nR; j++) { const A = i * (nR + 1) + j, B = A + 1, Cc = A + nR + 1, D = Cc + 1; I.push(A, Cc, B, B, Cc, D); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g; })();
const FAN_M = new THREE.MeshBasicMaterial({ map: FAN_T, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff });
const LEGS = [ // base (on the thorax), segment lengths, foot when standing, side
  { b: V(0.040, -0.046, 0.018), L: [0.24, 0.24, 0.30], foot: V(0.47, 0, 0.2), kind: 'front' },
  { b: V(0.004, -0.052, 0.024), L: [0.26, 0.27, 0.31], foot: V(-0.06, 0, 0.44), kind: 'mid' },
  { b: V(-0.032, -0.046, 0.021), L: [0.28, 0.30, 0.38], foot: null, kind: 'hind' },
];
function makeMosquito({ male = false, seed = 1 } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); const r = rng(seed);
  // thorax: a humped ellipsoid, top-projected UVs for the lyre pattern
  const tg = new THREE.SphereGeometry(1, 56, 40), tp = tg.attributes.position, tuv = tg.attributes.uv;
  for (let i = 0; i < tp.count; i++) { let x = tp.getX(i) * 0.074, y = tp.getY(i) * 0.05, z = tp.getZ(i) * 0.044; if (y > 0) y += 0.014 * (1 - (x / 0.078) ** 2) + 0.006 * Math.max(0, x / 0.078); if (y < 0) y *= 0.9 - 0.15 * Math.max(0, -x / 0.078);
    tp.setXYZ(i, x, y, z); tuv.setXY(i, x / 0.17 + 0.5, z / 0.115 + 0.5); }
  tg.computeVertexNormals(); const thorax = new THREE.Mesh(tg, MQM.scale()); thorax.position.set(0.012, 0, 0); body.add(thorax);
  const scutel = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), MQM.dark()); scutel.scale.set(0.016, 0.012, 0.03); scutel.position.set(-0.064, 0.05, 0); body.add(scutel);
  // bristles on the thorax
  const br = []; for (let i = 0; i < 130; i++) { const a = r() * Math.PI, side = r() < 0.5 ? -1 : 1, x = 0.012 + (r() - 0.4) * 0.12; br.push({ p: V(x, 0.045 + 0.02 * Math.sin(a), side * (0.03 + 0.02 * r())), dir: V(-0.4 - r() * 0.4, 0.6 + r() * 0.4, side * (0.2 + r() * 0.5)), len: 0.016 + r() * 0.02 }); }
  body.add(instHairs(br, MQM.hair(), 0.0009));
  // head: two big faceted eyes and a scaled crown
  const head = new THREE.Group(); head.position.set(0.098, -0.026, 0); body.add(head);
  const eyeM = MQM.eye(); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.028, 40, 30), eyeM); e.position.set(0.012, 0, s * 0.011); e.scale.set(1, 1.05, 0.92); head.add(e); }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.02, 24, 18), new THREE.MeshPhysicalMaterial({ color: 0x4a4440, roughness: 0.5, normalMap: rep(SCALE_N, 2, 2), sheen: 0.8, sheenColor: new THREE.Color(0xe8e4dc) })); crown.position.set(0.0, 0.012, 0); crown.scale.set(1.2, 0.8, 0.8); head.add(crown);
  const clyp = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 12), MQM.dark()); clyp.position.set(0.037, -0.012, 0); head.add(clyp);
  // antennae: a shaft with whorls of hairs (short on the female, long and bushy on the male)
  const antG = new THREE.Group(); head.add(antG); const antHairs = [];
  for (const s of [-1, 1]) { const base = V(0.036, 0.006, s * 0.007), dir = V(0.82, 0.22, s * 0.5).normalize();
    const ped = new THREE.Mesh(new THREE.SphereGeometry(male ? 0.012 : 0.0075, 16, 12), new THREE.MeshPhysicalMaterial({ color: male ? 0x4a3a2a : 0x2a221c, roughness: 0.4, clearcoat: 0.6 })); ped.position.copy(base); antG.add(ped);
    const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(base.clone().add(dir.clone().multiplyScalar(k * (male ? 0.2 : 0.17))).add(V(0, -0.02 * k * k, 0))); }
    const cv = new THREE.CatmullRomCurve3(pts); antG.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 32, male ? 0.0018 : 0.0016, 5), MQM.dark()));
    for (let n = 1; n <= 13; n++) { const k = n / 14, p = cv.getPointAt(k), tng = cv.getTangentAt(k), q = Math.abs(tng.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0), a1 = tng.clone().cross(q).normalize(), a2 = tng.clone().cross(a1).normalize();
      const nh = male ? 22 : 7; for (let j = 0; j < nh; j++) { const th = 2 * Math.PI * (j + r() * 0.4) / nh, rad = a1.clone().multiplyScalar(Math.cos(th)).add(a2.clone().multiplyScalar(Math.sin(th)));
        antHairs.push({ p, dir: rad.add(tng.clone().multiplyScalar(male ? 0.35 : 0.9)), len: male ? 0.034 + 0.016 * Math.sin(Math.PI * k) + r() * 0.008 : 0.01 + r() * 0.004 }); } } }
  antG.add(instHairs(antHairs, MQM.hair(), male ? 0.00045 : 0.0005));
  // palps
  const palpM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: PALP_T, roughness: 0.45, normalMap: rep(SCALE_N, 6, 1), normalScale: V2(0.5, 0.5), clearcoat: 0.3 });
  const palps = []; for (const s of [-1, 1]) { const pts = male ? [V(0, 0, 0), V(0.08, -0.025, 0), V(0.16, -0.03, 0), V(0.205, -0.012, s * 0.004)] : [V(0, 0, 0), V(0.02, -0.008, 0), V(0.042, -0.014, 0)];
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, male ? 0.0034 : 0.0034, 6), palpM); m.position.set(0.04, -0.02, s * 0.006); head.add(m); palps.push(m);
    if (male) { const hs = []; for (let i = 0; i < 60; i++) { const k = 0.55 + 0.45 * r(); hs.push({ p: V(0.04 + k * 0.205, -0.02 - 0.03 * Math.sin(Math.PI * k), s * 0.006), dir: V(r() - 0.5, r() - 0.2, (r() - 0.5) * 2), len: 0.015 + r() * 0.012 }); } head.add(instHairs(hs, MQM.hair(), 0.0005)); } }
  // proboscis (rebuilt each frame in root space): the labium sheath, the fine needle, the labella at the tip
  const probM = new THREE.MeshPhysicalMaterial({ color: 0x1b1612, roughness: 0.42, normalMap: rep(SCALE_N, 10, 1), normalScale: V2(0.5, 0.5), clearcoat: 0.35, sheen: 0.4, sheenColor: new THREE.Color(0x8a7a6a) });
  const labium = dynTube(40, 8, probM); root.add(labium);
  const needle = dynTube(16, 6, new THREE.MeshPhysicalMaterial({ color: 0x3a1a12, roughness: 0.3, clearcoat: 0.8 })); root.add(needle);
  const labella = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 12, 10), probM); labella.scale.set(1.5, 1, 1); root.add(labella);
  // abdomen: segment plates (dorsal and ventral arcs) over a balloon that fills with blood; eggs for the x-ray
  const abd = new THREE.Group(); abd.position.set(-0.058, -0.004, 0); body.add(abd);
  const plateM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: PLATE_T, roughness: 0.74, normalMap: rep(SCALE_N, 3, 1), normalScale: V2(0.9, 0.9), sheen: 0.3, sheenColor: new THREE.Color(0x8a7a68), sheenRoughness: 0.6, envMapIntensity: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 1 });
  const ghostM = xrayMat(new THREE.Color(0.75, 0.9, 1.0), new THREE.Color(0.12, 0.2, 0.32), 1.6, 1.8);
  const NP = 8, plates = [];
  for (let i = 0; i < NP; i++) { const d = new THREE.Mesh(new THREE.BufferGeometry(), plateM), v = new THREE.Mesh(new THREE.BufferGeometry(), plateM); d.castShadow = v.castShadow = true; abd.add(d, v); plates.push([d, v]); }
  const bloodM = MQM.blood(), bloodG = MQM.blood(); bloodG.transparent = true; bloodG.opacity = 0.22; bloodG.depthWrite = false; const bal = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), bloodM); abd.add(bal); bal.castShadow = true;
  const eggM = MQM.egg(), eggs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.0065, 0.034, 4, 8), eggM, 80), eggP = []; eggs.frustumCulled = false;
  for (let i = 0; i < 80; i++) { const s = i < 40 ? 1 : -1; eggP.push({ s: 0.2 + 0.55 * r(), a: r() * Math.PI * 2, rr: Math.sqrt(r()) * 0.5, side: s, rot: V(r() - 0.5, r() - 0.5, r() - 0.5), ph: r() }); } abd.add(eggs); eggs.visible = false;
  const abr = []; for (let i = 0; i < 90; i++) { const sx = r(), side = r() < 0.5 ? -1 : 1, a = (r() - 0.5) * 2.4; abr.push({ p: V(-sx * 0.29, 0.03 * (1 - 0.5 * sx) * Math.cos(a) - 0.008, side * 0.03 * (1 - 0.5 * sx) * Math.abs(Math.sin(a))), dir: V(-0.7, 0.3 + r() * 0.3, side * (0.4 + r() * 0.6)), len: 0.01 + r() * 0.014 }); }
  const abrM = instHairs(abr, MQM.hair(), 0.0006); abd.add(abrM);
  let lastFill = -1;
  const abdProfile = (s) => 0.036 * (1 - 0.58 * Math.pow(s, 1.7)) * (s < 0.06 ? 0.75 + 0.25 * s / 0.06 : 1);
  function buildAbdomen(f) {   // f = blood fill 0..1
    const Lab = 0.3 * (1 + 0.32 * f), R = (s) => abdProfile(s) * (1 + 0.85 * f * Math.sin(Math.PI * clamp(s * 1.05 + 0.05, 0, 1)) ** 0.6);
    const yc = (s) => -0.012 * s * s - 0.03 * f * s * s, xc = (s) => -s * Lab;
    for (let i = 0; i < NP; i++) { const s0 = i / NP, s1 = (i + 1) / NP, len = (s1 - s0) * Lab * (1.12 - 0.2 * f), rTop = R(s0) * 1.03, rBot = R(Math.min(s1, 0.999)) * 1.03;
      const sm0 = (s0 + s1) / 2, stretch = R(sm0) / abdProfile(sm0), dA = 3.74 / stretch, vA = 2.44 / stretch;   // the hard plates don't stretch: they cover less of a swollen abdomen
      const mk = (mid, lenA) => { const g = new THREE.CylinderGeometry(rTop, rBot, len, 36, 1, true, mid - lenA / 2, lenA); g.rotateZ(-Math.PI / 2); return g; };
      const [d, v] = plates[i]; d.geometry.dispose(); v.geometry.dispose();
      d.geometry = mk(1.5 * Math.PI, dA); v.geometry = mk(0.5 * Math.PI, vA);
      const sm = (s0 + s1) / 2; d.position.set(xc(sm), yc(sm), 0); v.position.copy(d.position); const tilt = Math.atan2(yc(s1) - yc(s0), xc(s1) - xc(s0)) + Math.PI; d.rotation.z = v.rotation.z = tilt; }
    // the balloon follows the same centre line
    const g = bal.geometry, p = g.attributes.position; if (!g.userData.orig) g.userData.orig = p.array.slice(); const o = g.userData.orig;
    for (let i = 0; i < p.count; i++) { const ox = o[i * 3], oy = o[i * 3 + 1], oz = o[i * 3 + 2], s = clamp((1 - ox) / 2 * 1.02 - 0.01, 0, 1), rr = R(s) * 0.96; p.setXYZ(i, xc(s), yc(s) + oy * rr * 0.98, oz * rr); }
    p.needsUpdate = true; g.computeVertexNormals();
    abd.userData.R = R; abd.userData.xc = xc; abd.userData.yc = yc; }
  // wings
  const wingM = MQM.wing(); const wingGeo = new THREE.PlaneGeometry(0.3, 0.075); wingGeo.translate(0.15, 0, 0);
  const wings = []; for (const s of [-1, 1]) { const hinge = new THREE.Group(); hinge.position.set(0.0, 0.05, s * 0.03); body.add(hinge);
    const w = new THREE.Mesh(wingGeo, wingM); w.userData.dofMap = WING_MASK; w.renderOrder = 2; w.castShadow = false; hinge.add(w);
    const fan = new THREE.Mesh(FAN_GEO, FAN_M); fan.scale.set(1, 1, s); fan.renderOrder = 2; fan.userData.noDof = true; fan.castShadow = false; hinge.add(fan);
    wings.push({ s, hinge, w, fan }); }
  // legs (rebuilt each frame in root space)
  const legs = []; for (const s of [-1, 1]) for (const L of LEGS) { const tot = L.L[0] + L.L[1] + L.L[2], f1 = L.L[0] / tot, f2 = (L.L[0] + L.L[1]) / tot;
    const m = dynTube(64, 6, new THREE.MeshPhysicalMaterial({ map: legTex(f1, f2, L.kind === 'hind'), roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.4, sheenColor: new THREE.Color(0x8a7a6a) })); root.add(m); legs.push({ L, s, m, f1, f2, tot }); }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const M4 = new THREE.Matrix4(), tmp = new THREE.Vector3();
  // pose: { t, fill, probe, fly, pitch, H (body height over the surface), surf(x, z) -> y in root space, ghost, eggs, flap, legPhase, hang }
  root.userData = { male, body, head, abd, wings, legs, bal, antG,
    pose(P) {
      const t = P.t ?? 0, fly = P.fly ?? 0, fill = P.fill ?? 0, probe = P.probe ?? 0, H = P.H ?? 0.13;
      const surf = P.surf || (() => -H);
      body.rotation.set(0, 0, P.pitch ?? (-0.08 - 0.12 * probe + 0.04 * fly)); body.position.set(0, 0, 0);
      head.rotation.set(0, (P.headYaw ?? 0), -0.5 - 0.55 * probe * (1 - fly) + (P.headPitch ?? 0));
      const fq = Math.round(fill * 200) / 200; if (fq !== lastFill) { buildAbdomen(fq); lastFill = fq; }
      abd.rotation.z = 0.02 + 0.06 * fill - 0.08 * fly + 0.02 * Math.sin(t * 2.1);
      const breathe = 1 + 0.01 * Math.sin(t * 5.3); abd.scale.set(1, breathe, breathe);
      // blood colour: a stretched, translucent red membrane
      const bc = new THREE.Color(0x3a302c).lerp(new THREE.Color(0x7a080a), clamp(fill * 1.6)); bloodM.color.copy(bc); bloodM.emissive.setRGB(0.14 * fill, 0.006 * fill, 0.004 * fill); bloodM.emissiveIntensity = 1;
      // x-ray: the plates turn to glass and the eggs show
      const gh = P.ghost ?? 0; plates.forEach(([d, v]) => { d.material = v.material = gh > 0.5 ? ghostM : plateM; }); plateM.opacity = 1; bal.material = gh > 0.5 ? bloodG : bloodM; bloodG.color.copy(bloodM.color); bloodG.emissive.copy(bloodM.emissive);
      eggs.visible = (P.eggs ?? 0) > 0.001; if (eggs.visible) { const R = abd.userData.R, xc = abd.userData.xc, yc = abd.userData.yc; const q = new THREE.Quaternion(), e = new THREE.Euler();
        eggP.forEach((E_, i) => { const show = clamp((P.eggs - E_.ph * 0.8) / 0.2), sc = Math.max(1e-4, show); const rr = R(E_.s) * 0.55 * E_.rr; e.set(E_.rot.x, E_.rot.y + 1.57, E_.rot.z); q.setFromEuler(e);
          M4.compose(V(xc(E_.s), yc(E_.s) + Math.sin(E_.a) * rr, E_.side * (0.006 + Math.abs(Math.cos(E_.a)) * rr)), q, V(sc, sc, sc)); eggs.setMatrixAt(i, M4); }); eggs.instanceMatrix.needsUpdate = true; }
      // wings: folded flat over the back at rest; a narrow blurred fan in flight (mosquitoes beat ~500 times a second through a small arc)
      const fl = P.flap ?? fly;
      wings.forEach(({ s, hinge, w, fan }) => {
        w.visible = fl < 0.02; fan.visible = !w.visible;
        w.rotation.set(-s * 0.04, s * (Math.PI - 0.1), -0.06 - 0.03 * fill); w.position.set(0, 0.002 * (s + 1), 0);
        fan.rotation.set(-0.6 * s, 0, 0.25 + 0.05 * Math.sin(t * 13)); fan.material.opacity = 0.9 * fl; });
      // proboscis: rest = forward-down; probing = the sheath bows back while the needle runs straight into the skin
      body.updateMatrix(); head.updateMatrix(); M4.multiplyMatrices(body.matrix, head.matrix);
      const pb = V(0.044, -0.026, 0).applyMatrix4(M4), restDir = V(0.92, -0.38, 0).transformDirection(M4), Lp = 0.215;
      let tip = pb.clone().add(restDir.clone().multiplyScalar(Lp));
      if (probe > 0 && !fly) { const sx = P.biteX ?? (pb.x + 0.05), contact = V(sx, surf(sx, 0) + 0.002, 0); tip = lv(tip, contact, E.io(clamp(probe * 2.5))); }
      const bow = probe * (1 - fly) * 0.075 * clamp((probe - 0.25) / 0.5); const mid = lv(pb, tip, 0.55).add(V(-bow * 0.9, -bow * 0.2, 0)), mid2 = lv(pb, tip, 0.8).add(V(-bow * 0.5, 0, 0));
      labium.userData.update(new THREE.CatmullRomCurve3([pb, lv(pb, tip, 0.25).add(V(-bow * 0.4, 0, 0)), mid, mid2, tip]), (u) => (0.0056 - 0.0018 * u) * (u > 0.96 ? 1.2 : 1));
      labella.position.copy(tip); labella.lookAt(tip.clone().add(tip.clone().sub(mid2)));
      const nOn = clamp((probe - 0.3) / 0.3) * (1 - fly); needle.visible = nOn > 0.01; if (needle.visible) needle.userData.update(new THREE.LineCurve3(pb, tip.clone().add(V(0, -0.05 * nOn, 0))), (u) => 0.0017 * (1 - 0.5 * u));
      // legs
      const hang = P.hang ?? 0;
      legs.forEach(({ L, s, m }, li) => {
        const sg = V(1, 1, s), B = L.b.clone().multiply(sg).applyMatrix4(body.matrix); const [L1, L2, L3] = L.L;
        // standing
        let K, A, T = [];
        const wig = 0.006 * Math.sin(t * 3 + li) * (P.fidget ?? 0);
        if (L.kind !== 'hind') { const F = L.foot.clone().multiply(sg); F.x += wig; F.y = surf(F.x, F.z); const back = F.clone().sub(V(B.x, F.y, B.z)).setY(0).normalize();
          A = F.clone().sub(back.clone().multiplyScalar(L3 * 0.72)); A.y = F.y + 0.035; K = ik2(B, A, L1, L2, V(0, 0.55, s * 1.0).add(back.clone().multiplyScalar(-0.2)));
          const a1 = lv(A, F, 0.38), a2 = lv(A, F, 0.72); a1.y = lerp(A.y, F.y, 0.62) + 0.006; a2.y = F.y + 0.004; T = [a1, a2, F]; }
        else { K = B.clone().add(V(-0.12, 0.03, s * 0.2)); A = K.clone().add(V(-0.21, 0.13, s * 0.05)); T = [A.clone().add(V(-0.08, 0.09, s * 0.01)), A.clone().add(V(-0.1, 0.2, s * 0.015)), A.clone().add(V(-0.06, 0.3, s * 0.02))]; }
        if (fly > 0 || hang > 0) { const k = Math.max(fly, hang), sw = 0.02 * Math.sin(t * 4 + li * 1.3);
          const fx = L.kind === 'front' ? 0.12 : L.kind === 'mid' ? -0.04 : -0.14;
          const Kf = B.clone().add(V(fx * 0.7, -0.07, s * 0.1)), Af = Kf.clone().add(V(fx * 0.9 - 0.1 + sw, -0.17, s * 0.03)); const Tf = [Af.clone().add(V(-0.06, -0.1, s * 0.01)), Af.clone().add(V(-0.13 + sw, -0.17, s * 0.015)), Af.clone().add(V(-0.2 + sw * 2, -0.21, s * 0.02))];
          K = lv(K, Kf, k); A = lv(A, Af, k); T = T.map((p, i) => lv(p, Tf[i], k)); }
        // re-impose segment lengths (keeps the legs from stretching while blending)
        const fix = (a, b, len) => b.clone().sub(a).setLength(len).add(a); K = fix(B, K, L1); A = fix(K, A, L2);
        const segs = [A, ...T]; for (let i = 1; i < segs.length; i++) segs[i] = fix(segs[i - 1], segs[i], L3 / 3);
        const pts = [B, lv(B, K, 0.5), lv(B, K, 0.94), K, lv(K, A, 0.06), lv(K, A, 0.5), lv(K, A, 0.95), A, ...segs.slice(1)];
        const cv = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
        m.userData.update(cv, (u) => { const f1 = L1 / (L1 + L2 + L3), f2 = (L1 + L2) / (L1 + L2 + L3); return 0.78 * (u < f1 ? lerp(0.0078, 0.0064, u / f1) * (1 + 0.15 * Math.exp(-(((u - f1) / 0.01) ** 2))) : u < f2 ? lerp(0.0058, 0.0046, (u - f1) / (f2 - f1)) : lerp(0.0042, 0.0018, (u - f2) / (1 - f2))); });
      });
    } };
  root.userData.pose({ t: 0 });
  return root;
}

// ---------- molecules: ball-and-stick, merged into one mesh with vertex colours ----------
const ATOM = { C: [0.36, 0x34343a], O: [0.34, 0xd42a20], H: [0.23, 0xf4f4f4], N: [0.34, 0x3456e0] };
function mergeColored(parts) {   // parts: [geometry (non-indexed ok), THREE.Color, Matrix4]
  let n = 0; parts.forEach(([g]) => { n += (g.index ? g.index.count : g.attributes.position.count); });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0; const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  parts.forEach(([g, c, M]) => { const gi = g.index ? g.toNonIndexed() : g, P = gi.attributes.position, N = gi.attributes.normal; nm.getNormalMatrix(M);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M); pos.set([v.x, v.y, v.z], (o + i) * 3); v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (o + i) * 3); col.set([c.r, c.g, c.b], (o + i) * 3); }
    o += P.count; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; }
const MOL_MAT = () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
function moleculeGeo(atoms, bonds) {   // atoms [el, x, y, z] in angstroms; bonds [i, j, order]
  const parts = [], sph = new THREE.SphereGeometry(1, 20, 14), cyl = new THREE.CylinderGeometry(0.11, 0.11, 1, 10, 1);
  atoms.forEach(([el, x, y, z]) => { const [rr, c] = ATOM[el]; parts.push([sph, new THREE.Color(c).convertSRGBToLinear(), new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion(), V(rr, rr, rr))]); });
  bonds.forEach(([i, j, ord]) => { const a = V(...atoms[i].slice(1)), b = V(...atoms[j].slice(1)), d = b.clone().sub(a), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    const side = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 * L ? V(0, 1, 0) : V(1, 0, 0)).setLength(0.17);
    for (let k = 0; k < ord; k++) { const off = ord === 1 ? V(0, 0, 0) : side.clone().multiplyScalar(k ? 1 : -1); parts.push([cyl, new THREE.Color(0xb8b8b8).convertSRGBToLinear(), new THREE.Matrix4().compose(lv(a, b, 0.5).add(off), q, V(1, L, 1))]); } });
  const g = mergeColored(parts); g.computeBoundingSphere(); return g; }
const CO2_GEO = moleculeGeo([['C', 0, 0, 0], ['O', -1.16, 0, 0], ['O', 1.16, 0, 0]], [[0, 1, 2], [0, 2, 2]]);
// a fatty (carboxylic) acid: a zig-zag carbon chain with its hydrogens, ending in C(=O)OH
function acidGeo(n) { const A = [], B = []; for (let i = 0; i < n; i++) { const x = i * 1.26, y = (i % 2) * 0.86; A.push(['C', x, y, 0]); if (i) B.push([i - 1, i, 1]); }
  const nc = A.length; for (let i = 0; i < n - 1; i++) { const [, x, y] = A[i], dy = (i % 2) ? 0.55 : -0.55; for (const s of [-1, 1]) { A.push(['H', x, y + dy * 0.6, s * 0.9]); B.push([i, A.length - 1, 1]); } }
  A.push(['H', -0.9, -0.3, 0]); B.push([0, A.length - 1, 1]);
  const [, xl, yl] = A[n - 1], up = (n - 1) % 2 ? 1 : -1; A.push(['O', xl + 0.6, yl + up * 1.05, 0]); B.push([n - 1, A.length - 1, 2]); A.push(['O', xl + 1.25, yl - up * 0.3, 0]); B.push([n - 1, A.length - 1, 1]); A.push(['H', xl + 2.1, yl - up * 0.05, 0]); B.push([A.length - 2, A.length - 1, 1]);
  return moleculeGeo(A, B); }
const ACID_GEOS = [acidGeo(6), acidGeo(9), acidGeo(13)];
// odour molecules made by skin bacteria (short acids and a ketone-like one)
const ODOR_GEOS = [acidGeo(3), acidGeo(4), moleculeGeo([['C', 0, 0, 0], ['C', 1.26, 0.86, 0], ['O', 1.26, 2.06, 0], ['C', 2.52, 0, 0], ['H', -0.9, -0.3, 0], ['H', 0, 0.3, 1], ['H', 3.4, -0.3, 0], ['H', 2.5, 0.3, 1]], [[0, 1, 1], [1, 2, 2], [1, 3, 1], [0, 4, 1], [0, 5, 1], [3, 6, 1], [3, 7, 1]])];
// a cloud of molecules of one or more kinds that tumble and drift: update(t, fn(i) -> {p, s, rot})
function molCloud(geos, n, mat = MOL_MAT()) { const g = new THREE.Group(), per = geos.map(gg => new THREE.InstancedMesh(gg, mat, n)); per.forEach(m => { m.castShadow = true; m.frustumCulled = false; g.add(m); });
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); const cnt = geos.map(() => 0);
  g.userData.update = (fn) => { cnt.fill(0); for (let i = 0; i < n; i++) { const d = fn(i); if (!d) continue; const k = (d.kind ?? i) % geos.length; e.set(d.rot.x, d.rot.y, d.rot.z); q.setFromEuler(e); M4.compose(d.p, q, V(d.s, d.s, d.s)); per[k].setMatrixAt(cnt[k]++, M4); }
    per.forEach((m, k) => { m.count = cnt[k]; m.instanceMatrix.needsUpdate = true; }); };
  return g; }
