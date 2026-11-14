// =====================================================================
// A DETAILED HAND for macro shots, with an x-ray skeleton inside
// hand units: palm ~0.56 long, fingers +y, back of the hand +z, palm faces -z
// =====================================================================
const SKIN_B = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(41);
  for (let i = 0; i < 6000; i++) { g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(r() * w, r() * h, 0.5 + r() * 1.3, 0, 7); g.fill(); }
}, { rep: [3, 3], srgb: false });
// knuckle creases near both ends of a finger segment (v runs along the segment)
const CREASE_B = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(7);
  [0.07, 0.93].forEach(v0 => { for (let k = 0; k < 5; k++) { const y = (v0 + (k - 2) * 0.012) * h; g.strokeStyle = 'rgba(30,30,30,0.7)'; g.lineWidth = 2 + r() * 2; g.beginPath(); for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x * 0.05 + k) * 4 + (r() - 0.5) * 2; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); } });
  for (let i = 0; i < 1500; i++) { g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'; g.fillRect(r() * w, r() * h, 2, 2); }
}, { srgb: false });
const NAIL_T = canvasTex(128, 192, (g, w, h) => {
  const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#f6dcd6'); gr.addColorStop(0.22, '#f6dcd6'); gr.addColorStop(0.26, '#e9a9a4'); gr.addColorStop(0.85, '#e8a6a0'); gr.addColorStop(0.9, '#fbf4ee'); gr.addColorStop(1, '#fffaf4');
  g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,245,240,0.8)'; g.beginPath(); g.ellipse(w / 2, h * 0.86, w * 0.36, h * 0.12, 0, Math.PI, 0); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w * (0.25 + i * 0.1), 0); g.lineTo(w * (0.25 + i * 0.1), h); g.stroke(); }
});
function boneGeo(L, R) {
  const P = []; const N = 24;
  for (let i = 0; i <= N; i++) { const t = i / N, y = t * L; const end = Math.max(Math.exp(-((t / 0.16) ** 2)), Math.exp(-(((t - 1) / 0.16) ** 2))); let r = R * (0.48 + 0.36 * end); const cap = Math.min(t, 1 - t) / 0.06; if (cap < 1) r *= Math.sqrt(Math.max(0, 1 - (1 - cap) ** 2)); P.push(new THREE.Vector2(Math.max(r, 0.001), y)); }
  return new THREE.LatheGeometry(P, 28);
}
function makeHandRig({ side = 'R', skin = 0xe2a27e, xray = false, sleeve = 0x3a3f4a } = {}) {
  const tx = side === 'R' ? -1 : 1;   // thumb side (x)
  const G = new THREE.Group();
  const skinM = xray ? xrayMat(new THREE.Color(0.55, 0.85, 1.0), new THREE.Color(0.03, 0.12, 0.3), 2.2, 1.0) : new THREE.MeshPhysicalMaterial({ color: skin, roughness: 0.48, sheen: 0.7, sheenColor: new THREE.Color(0xffd0bc), sheenRoughness: 0.45, clearcoat: 0.12, clearcoatRoughness: 0.5, bumpMap: SKIN_B, bumpScale: 0.6 });
  const segM = xray ? skinM : skinM.clone(); if (!xray) { segM.bumpMap = CREASE_B; segM.bumpScale = 1.4; }
  const boneM = xray ? new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.9, 2.3), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }) : new THREE.MeshPhysicalMaterial({ color: 0xf2ead8, roughness: 0.5 });
  const nailM = xray ? skinM : new THREE.MeshPhysicalMaterial({ map: NAIL_T, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const add = (m, p, parent, shadow = true) => { if (!xray) { m.castShadow = shadow; m.receiveShadow = true; } if (p) m.position.copy(p); parent.add(m); return m; };
  // palm with a slightly domed back
  const pg = new RoundedBoxGeometry(0.47, 0.56, 0.17, 8, 0.075), pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); if (z > 0) pp.setZ(i, z + 0.02 * Math.max(0, 1 - (x / 0.24) ** 2)); if (z < 0 && x * tx > 0.05 && y < 0.05) pp.setZ(i, z - 0.035 * Math.exp(-(((y + 0.12) / 0.14) ** 2))); }
  pg.computeVertexNormals(); const palm = add(new THREE.Mesh(pg, skinM), null, G);
  const wrist = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.7, 10, 32), skinM), V(0, -0.62, -0.005), G); wrist.scale.set(1.12, 1, 0.72);
  if (!xray) { const sl = add(new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.27, 0.5, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: sleeve, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(sleeve).lerp(new THREE.Color(0xffffff), 0.4), side: THREE.DoubleSide, bumpMap: WEAVE, bumpScale: 1 })), V(0, -1.0, 0), G); sl.scale.z = 0.8;
    for (let k = 0; k < 6; k++) { const rb = add(new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.018, 8, 40), new THREE.MeshPhysicalMaterial({ color: sleeve, roughness: 0.9, sheen: 1 })), V(0, -0.72 - k * 0.028, 0), G); rb.rotation.x = Math.PI / 2; rb.scale.set(1, 0.8, 1); } }
  // metacarpals, carpals, forearm bones (x-ray)
  const bones = [];
  const boneBetween = (a, b, R, parent = G) => { const L = a.distanceTo(b); const m = add(new THREE.Mesh(boneGeo(L, R), boneM), a, parent, false); m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); bones.push(m); return m; };
  const F = [[0.17, 0.27, 0.05, [0.24, 0.15, 0.115]], [0.055, 0.29, 0.052, [0.27, 0.17, 0.12]], [-0.06, 0.275, 0.048, [0.25, 0.16, 0.115]], [-0.17, 0.24, 0.042, [0.19, 0.12, 0.1]]].map(([x, y, R, Ls]) => [x * tx, y, R, Ls]);
  const fingers = F.map(([x, y, R, Ls], fi) => {
    boneBetween(V(x * 0.55, -0.24, 0), V(x, y - 0.04, 0), R * 1.05);
    add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 20, 14), skinM), V(x, y - 0.035, 0.065), G).scale.set(1, 0.78, 0.62);
    const mcp = new THREE.Group(); mcp.position.set(x, y, 0); G.add(mcp);
    const segs = []; let parent = mcp; const joints = [mcp];
    Ls.forEach((L, k) => {
      const r = R * (1 - k * 0.07);
      const seg = add(new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, L - r * 0.6), 8, 24), segM), V(0, L / 2, 0), parent); seg.scale.z = 0.86; segs.push(seg);
      boneBetween(V(0, L * 0.08, 0), V(0, L * 0.92, 0), r * 0.95, parent);
      if (k === 2) { const nail = add(new THREE.Mesh(new RoundedBoxGeometry(r * 1.45, L * 0.6, 0.016, 3, 0.007), nailM), V(0, L * 0.6, r * 0.8), parent); nail.rotation.x = -0.12; }
      if (k < 2) { const j = new THREE.Group(); j.position.set(0, L, 0); parent.add(j); joints.push(j); parent = j; if (!xray) add(new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 16, 12), segM), V(0, 0, 0.004), j).scale.set(1, 0.9, 0.86); }
    });
    return { mcp, joints, segs, R, Ls, x, y, fi };
  });
  // thumb
  const cmc = new THREE.Group(); cmc.position.set(tx * 0.19, -0.13, -0.02); cmc.rotation.set(0.15, tx * 0.35, tx * 0.62); G.add(cmc);
  const tL = [0.2, 0.16, 0.13], thumbJ = [cmc]; let tp = cmc;
  tL.forEach((L, k) => { const r = 0.062 - k * 0.006; const seg = add(new THREE.Mesh(new THREE.CapsuleGeometry(r, L - r * 0.5, 8, 24), k ? segM : skinM), V(0, L / 2, 0), tp); seg.scale.z = 0.88; boneBetween(V(0, L * 0.08, 0), V(0, L * 0.92, 0), r * 0.95, tp);
    if (k === 2) { const nail = add(new THREE.Mesh(new RoundedBoxGeometry(r * 1.5, L * 0.55, 0.016, 3, 0.007), nailM), V(0, L * 0.6, r * 0.82), tp); nail.rotation.x = -0.12; }
    if (k < 2) { const j = new THREE.Group(); j.position.set(0, L, 0); tp.add(j); thumbJ.push(j); tp = j; } });
  for (let i = 0; i < 8; i++) { const c = add(new THREE.Mesh(new THREE.SphereGeometry(0.045 + 0.015 * h3(i, 1, 2), 14, 10), boneM), V(-0.12 + (i % 4) * 0.08, -0.31 - Math.floor(i / 4) * 0.075, 0), G, false); c.scale.set(1, 0.8, 0.8); bones.push(c); }
  boneBetween(V(tx * 0.1, -1.3, 0), V(tx * 0.1, -0.4, 0), 0.07); boneBetween(V(-tx * 0.11, -1.3, 0), V(-tx * 0.1, -0.4, 0), 0.055);
  bones.forEach(b => b.visible = xray);
  const api = {
    G, fingers, thumbJ, skinM, bones, tx,
    // c: curl of each finger 0..1 (index, middle, ring, pinky); thumb 0..1; spread
    pose({ c = [0, 0, 0, 0], thumb = 0, spread = 0.05, mcpBias = [0, 0, 0, 0] } = {}) {
      fingers.forEach((f, i) => { const k = c[i]; f.mcp.rotation.set(-1.45 * k - mcpBias[i], 0, f.x * spread * 3 * (1 - k)); f.joints[1].rotation.x = -1.65 * Math.min(1, k * 1.15); f.joints[2].rotation.x = -1.05 * Math.min(1, k * 1.2); });
      thumbJ[0].rotation.set(0.15 + 0.5 * thumb, tx * (0.35 + 0.4 * thumb), tx * (0.62 - 0.35 * thumb)); thumbJ[1].rotation.x = -0.5 * thumb; thumbJ[2].rotation.x = -0.9 * thumb;
    },
    // world position of a finger joint: j 0 = knuckle (MCP), 1 = middle (PIP), 2 = top (DIP)
    jointW(i, j) { G.updateMatrixWorld(true); return fingers[i].joints[j].getWorldPosition(new THREE.Vector3()); },
  };
  api.pose();
  return api;
}
