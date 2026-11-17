// =====================================================================
// SETS: "Why Cats Knead You" — claws, a kneading cycle, a lap blanket, a nursing bed, a milk bottle,
// a hero paw with scent glands, glowing scent prints, and a CLAIMED stamp
// =====================================================================
const CS = 0.55, KS = 0.27;
const TABBY = {}, MOM = { base: '#f3b679', stripe: '#c9783c', seed: 7 };
const backE = (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
// retractable claws on the front paws: u.claws(k), 0 = sheathed, 1 = out
function addClaws(cat) {
  const u = cat.userData, m = new THREE.MeshPhysicalMaterial({ color: 0xf4ecdc, roughness: 0.3, clearcoat: 0.6, transmission: 0, transparent: false }), all = [];
  u.legs.forEach(L => { if (!L.front) return; [-1.5, -0.5, 0.5, 1.5].forEach(k => {
    const g = new THREE.Group(); g.position.set(k * 0.058, 0.025, 0.21 - Math.abs(k) * 0.022); L.paw.add(g);
    const c = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, 1.5), m); c.rotation.set(0, -Math.PI / 2, 0); c.position.set(0, -0.05, -0.0); c.scale.set(1, 1, 1); g.add(c);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6), m); tip.position.set(0, -0.05, 0.035); tip.rotation.x = Math.PI; tip.rotation.x = Math.PI / 2 + 0.5; g.add(tip);
    g.userData.k = k; all.push(g); }); });
  u.claws = (k) => { all.forEach(g => { g.visible = k > 0.02; g.scale.setScalar(Math.max(0.001, k)); g.position.z = 0.21 - Math.abs(g.userData.k) * 0.022 + 0.02 * k; }); return u; };
  u.claws(0); return cat;
}
// the kneading cycle on the front paws (after pose(), before solve()). Returns the press phase of each paw.
// rate = presses per second per paw; the two paws alternate.
function kneadPaws(u, t, { rate = 1.4, amp = 0.12, k = 1, push = 0.04 } = {}) {
  const out = [];
  u.legs.forEach(L => {
    if (!L.front) return; const ph = 2 * Math.PI * rate * t + (L.sx > 0 ? Math.PI : 0), s = Math.sin(ph), up = Math.max(0, s);
    L.T.y += up * amp * k; L.T.z += push * Math.cos(ph) * k; L.pitch = (0.5 * up - 0.12 * Math.max(0, -s)) * k; out.push(s);
  });
  u.torso.rotation.z += 0.035 * Math.sin(2 * Math.PI * rate * t) * k; u.head.position.y += 0.012 * Math.sin(4 * Math.PI * rate * t) * k;
  return out;
}
// times of the presses (paw at its lowest) in [a, b]
function pressTimes(a, b, rate = 1.4) { const T = []; for (let n = Math.floor(a * rate) - 1; n <= b * rate + 1; n++) [0.75, 0.25].forEach(o => { const t = (n + o) / rate; if (t >= a && t <= b) T.push(t); }); return T.sort((x, y) => x - y); }
// a folded knit blanket on your lap (its top is where the cat stands)
function lapBlanket(sc, c, w = 1.35, d = 1.0, h = 0.24) {
  const kt = canvasTex(256, 256, (g, W, H) => { g.fillStyle = '#c95a4a'; g.fillRect(0, 0, W, H); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { g.fillStyle = (i + j) % 2 ? 'rgba(255,230,210,0.10)' : 'rgba(0,0,0,0.08)'; g.beginPath(); g.ellipse(i * 16 + 8, j * 16 + 8, 6, 8, 0, 0, 7); g.fill(); } g.strokeStyle = '#f2dcc8'; g.lineWidth = 10; [40, 216].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }); noiseFill(g, W, H, 4, 16); }, { rep: [2, 2] });
  const geo = new RoundedBoxGeometry(w, h, d, 6, 0.1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > 0) p.setY(i, y + 0.03 * Math.sin(x * 9) * Math.cos(z * 7) - 0.05 * Math.pow(Math.abs(x) / (w / 2), 3)); }
  geo.computeVertexNormals();
  const b = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: kt, bumpMap: WEAVE, bumpScale: 2.5, roughness: 0.95 })); b.position.copy(c); b.castShadow = b.receiveShadow = true; sc.add(b);
  b.userData.top = c.y + h / 2; return b;
}
// a round cat bed for the nursing scenes, in a dim warm room at night
function nursery(sc, { day = false } = {}) {
  sc.background = new THREE.Color(day ? 0xd8c8b0 : 0x16100c); sc.environment = MENV; const R = {};
  const fw = woodTex('#a87850', '#5a3a20', 31, [3, 3], 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.5, roughness: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshLambertMaterial({ color: day ? 0xe8d8c0 : 0x8a6a58, bumpMap: PLASTER, bumpScale: 0.4 })); wall.position.set(0, 4, -2.2); wall.receiveShadow = true; sc.add(wall);
  const plush = canvasTex(256, 256, (g, W, H) => { g.fillStyle = '#e8d6c0'; g.fillRect(0, 0, W, H); noiseFill(g, W, H, 9, 40); }, { rep: [3, 3] });
  const bedM = new THREE.MeshStandardMaterial({ map: plush, bumpMap: plush, bumpScale: 3, roughness: 1 }), rimM = new THREE.MeshStandardMaterial({ color: 0x9a6a5a, map: plush, roughness: 1 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.2, 24, 64), rimM); rim.rotation.x = Math.PI / 2; rim.position.y = 0.2; rim.scale.z = 0.8; rim.castShadow = rim.receiveShadow = true; sc.add(rim);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.16, 64), bedM); base.position.y = 0.08; base.receiveShadow = true; sc.add(base);
  R.bedY = 0.16;
  // a small knitted blanket in the bed
  const bl = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.MeshStandardMaterial({ color: 0xf4ead8, map: plush, roughness: 1 })); bl.rotation.x = -Math.PI / 2; bl.position.y = 0.165; bl.receiveShadow = true; sc.add(bl);
  if (day) { sc.add(new THREE.HemisphereLight(0xfff4e6, 0x8a6a50, 1.0)); const sun = new THREE.DirectionalLight(0xffe8c8, 2.6); sun.position.set(-4, 6, 4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); sun.userData.soft = 0.2; sc.add(sun); }
  else {
    sc.add(new THREE.HemisphereLight(0x8a7a90, 0x3a2418, 0.45));
    const lampL = new THREE.PointLight(0xffb070, 22, 12, 1.6); lampL.position.set(2.4, 3.2, 1.6); lampL.castShadow = true; lampL.shadow.mapSize.set(1024, 1024); lampL.shadow.bias = -0.002; lampL.userData.soft = 0.3; sc.add(lampL);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 0.5, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff0d8, side: THREE.DoubleSide, emissive: new THREE.Color(1, 0.6, 0.28), emissiveIntensity: 1.8 })); sh.position.set(2.6, 3.6, 1.2); sc.add(sh);
    const rimL = new THREE.DirectionalLight(0x9aa8ff, 0.35); rimL.position.set(-3, 3, -4); sc.add(rimL);
  }
  return R;
}
// the mother lying on her side: the crouch pose rolled over, legs out toward the kittens
function momLying(mom, t, { pos, ry = 0, purr = 0, look = null, lid = 0.55 } = {}) {
  const u = mom.userData; mom.rotation.order = 'YXZ'; mom.position.copy(pos); mom.rotation.set(0, ry, -Math.PI / 2 + 0.12);
  u.pose({ crouch: 1 });
  u.legs.forEach(L => { L.T.y += 0.1; L.T.x += L.sx * 0.12; L.T.z += L.front ? 0.12 : -0.05; });
  u.solve().breathe(t, 0.03).pupil(0.4).ears(0.1, 0, 0).whisk(0.2);
  u.head.position.y += 0.12; u.head.position.z += 0.05;
  if (look) u.look(look, 0.9, 0.0, 1.2, 0.8).gaze(look);
  u.head.rotation.z += 0.9; u.lid(lid + 0.04 * Math.sin(t * 2), 0.1);
  u.tail([V(0, 0.5, -1.12), V(0.25, 0.42, -1.4), V(0.6, 0.35, -1.5), V(0.95, 0.32, -1.35), V(1.15, 0.3, -1.1)]);
  return u;
}
// a little glass milk bottle that fills (infographic)
function milkBottle() {
  const g = new THREE.Group();
  const pts = [[0, 0], [0.12, 0], [0.13, 0.02], [0.13, 0.26], [0.08, 0.34], [0.065, 0.4], [0.07, 0.43], [0.07, 0.45], [0.0, 0.45]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.28, clearcoat: 1, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false })); g.add(glass);
  const milk = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 1, 40), new THREE.MeshStandardMaterial({ color: 0xfbf7ef, roughness: 0.35 })); g.add(milk);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 32), new THREE.MeshStandardMaterial({ color: 0x4a9ad8, roughness: 0.4 })); cap.position.y = 0.46; g.add(cap);
  g.userData.set = (k) => { const h = Math.max(0.002, 0.25 * clamp(k)); milk.scale.y = h; milk.position.y = 0.012 + h / 2; };
  g.userData.set(0); g.traverse(o => { o.userData.noDof = true; if (o.isMesh) { o.material.depthTest = false; o.renderOrder = 10; } }); return g;
}
// a big, close-up front paw: toe beans, a main pad, fur, claws, and scent glands between the toes
function heroPaw(base = '#e58a3a') {
  const g = new THREE.Group(), fur = furMat(base, '#a24e18', 3, false), white = WHITE_FUR(), bean = new THREE.MeshPhysicalMaterial({ color: 0xe88a96, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.4, sheen: 0.4, sheenColor: new THREE.Color(0xffc8d0) });
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.6, 12, 32), fur); leg.position.set(0, -1.15, -0.1); g.add(leg); addFur(leg, 0.11, { comb: V(0, -1, 0) });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), white); palm.scale.set(1, 0.85, 0.62); g.add(palm); addFur(palm, 0.09, { freq: 120, comb: V(0, -1, 0.2).normalize() });
  const main = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 20), bean); main.scale.set(1.25, 0.9, 0.45); main.position.set(0, -0.08, 0.36); g.add(main);
  const toes = [], beans = [], glands = [], claws = [];
  const gT2 = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,214,90,1)'); gr.addColorStop(0.3, 'rgba(255,170,40,0.9)'); gr.addColorStop(0.65, 'rgba(240,130,20,0.35)'); gr.addColorStop(1, 'rgba(230,120,20,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  const gT = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.35, 'rgba(255,190,70,0.6)'); gr.addColorStop(1, 'rgba(255,150,40,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  [-1.5, -0.5, 0.5, 1.5].forEach((k, i) => {
    const toe = new THREE.Group(); toe.userData.k = k; g.add(toe); toes.push(toe);
    const tf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), white); tf.scale.set(1, 1.1, 0.75); toe.add(tf); addFur(tf, 0.06, { freq: 130 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), bean); b.scale.set(0.9, 1.1, 0.45); b.position.z = 0.15; toe.add(b); beans.push(b);
    const cl = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 10), new THREE.MeshPhysicalMaterial({ color: 0xf6efe2, roughness: 0.25, clearcoat: 0.8 })); cl.position.set(0, 0.22, 0.05); cl.rotation.x = 0.35; toe.add(cl); claws.push(cl);
    if (i < 3) { const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: gT2, transparent: true, depthWrite: false, toneMapped: false })); gl.userData.noDof = false; g.add(gl); glands.push(gl); }
  });
  // scent wisps: little golden motes drifting off the glands
  const wn = 40, wisps = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: gT2, transparent: true, depthWrite: false, toneMapped: false }), wn); wisps.frustumCulled = false; g.add(wisps); const o = new THREE.Object3D();
  g.userData.set = (t, { spread = 0, gland = 0, claw = 0, cam = null } = {}) => {
    const qf = cam ? g.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(cam.quaternion) : null;
    toes.forEach((toe, i) => { const k = toe.userData.k; toe.position.set(k * (0.21 + 0.06 * spread), 0.5 - Math.abs(k) * 0.08 - 0.02 * spread * Math.abs(k), 0.12); toe.rotation.set(-0.15, 0, -k * (0.08 + 0.12 * spread)); claws[i].scale.setScalar(Math.max(0.001, claw)); claws[i].visible = claw > 0.02; });
    glands.forEach((gl, i) => { const a = toes[i].position, b = toes[i + 1].position; gl.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 - 0.05, 0.48); if (qf) gl.quaternion.copy(qf); gl.scale.setScalar(Math.max(0.001, gland * (0.9 + 0.15 * Math.sin(t * 7 + i * 2)))); });
    for (let i = 0; i < wn; i++) { const gi = i % 3, a = (((t * 0.6 + h3(i, 1, 2)) % 1) + 1) % 1, P = glands[gi].position; o.position.set(P.x + (h3(i, 3, 4) - 0.5) * 0.25 + 0.08 * Math.sin(t * 2 + i), P.y + a * 0.9, P.z + 0.05 + a * 0.35); if (qf) o.quaternion.copy(qf); o.scale.setScalar(gland * 0.07 * Math.sin(Math.PI * a)); o.updateMatrix(); wisps.setMatrixAt(i, o.matrix); }
    wisps.instanceMatrix.needsUpdate = true;
  };
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
// glowing scent prints left where the paws pressed
function scentPrints(sc, n = 16) {
  const t = canvasTex(128, 128, (c) => { c.fillStyle = 'rgba(255,200,80,0.9)'; c.beginPath(); c.ellipse(64, 80, 26, 22, 0, 0, 7); c.fill(); [[-30, 40], [-11, 26], [11, 26], [30, 40]].forEach(([x, y]) => { c.beginPath(); c.ellipse(64 + x, y + 6, 10, 12, 0, 0, 7); c.fill(); }); });
  const blur = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,200,90,0.55)'); gr.addColorStop(1, 'rgba(255,170,60,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); });
  const P = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 })); m.rotation.x = -Math.PI / 2; const h = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: blur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0 })); h.rotation.x = -Math.PI / 2; sc.add(m, h); P.push([m, h]); }
  // marks: [{ p, t0, rot }]
  return (t, marks) => { P.forEach(([m, h], i) => { const k = marks[i]; if (!k || t < k.t0) { m.visible = h.visible = false; return; } m.visible = h.visible = true; m.position.copy(k.p).add(V(0, 0.012, 0)); h.position.copy(k.p).add(V(0, 0.01, 0)); m.rotation.z = k.rot; const a = t - k.t0; m.material.opacity = Math.min(1, a * 6) * (0.75 + 0.25 * Math.sin(t * 5 + i)); h.material.opacity = Math.min(1, a * 4) * 0.8; }); };
}
// a CLAIMED stamp with a paw-print badge
function claimedStamp(w = 0.7) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 400; const g = c.getContext('2d');
  g.save(); g.translate(512, 200); g.rotate(-0.08); g.strokeStyle = '#e8402f'; g.lineWidth = 22; const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
  g.fillStyle = 'rgba(255,255,255,0.92)'; rr(-470, -150, 940, 300, 40); g.fill(); rr(-450, -132, 900, 264, 30); g.stroke();
  g.fillStyle = '#e8402f'; g.font = '900 170px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CLAIMED', 70, 10);
  g.beginPath(); g.ellipse(-345, 30, 46, 38, 0, 0, 7); g.fill(); [[-395, -30], [-362, -58], [-326, -58], [-293, -30]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 16, 20, 0, 0, 7); g.fill(); });
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 400 / 1024), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); m.userData.dofMap = t; return m;
}
// fur that stands on end / fluffs up (k = 0..1)
function fluff(obj, k) { obj.traverse(o => { const U = o.material && o.material.userData && o.material.userData.U; if (U && U.len0 !== undefined) { U.uLen.value = U.len0 * (1 + 1.1 * k); U.uComb.value.copy(U.comb0).multiplyScalar(1 - 0.7 * k); } }); }
