// =====================================================================
// SETS: the exam hall (real desks, chairs, HDR hall), students, the glass of water
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.01, 300) }; build(s); shots.push(s); return s; }
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const DESK_TOP = 0.882, SEAT = 0.455;

// ---------- materials ----------
const knitMat = (color, rep = 6) => pbrMat(TX.knit, { rep: [rep, rep], color, normal: 1.4, phys: true, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4) });
const skinMat = (color = 0xc89478) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.62, sheen: 0.18, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xc85a44), clearcoat: 0.04, clearcoatRoughness: 0.6, envMapIntensity: 0.7 });
const denimMat = (color = 0x3a4a66) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.85, sheen: 0.4, sheenColor: new THREE.Color(0x8aa0c8), normalMap: TX.knit.normalMap, normalScale: new THREE.Vector2(0.3, 0.3) });
const HAIR_N = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h); const r = rng(77);
  for (let i = 0; i < 900; i++) { const x = r() * w, v = r() > 0.5 ? 170 : 86; g.strokeStyle = `rgba(${v},128,235,${0.25 + r() * 0.4})`; g.lineWidth = 0.6 + r() * 1.4; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 20, h * 0.33, x + (r() - 0.5) * 20, h * 0.66, x + (r() - 0.5) * 14, h); g.stroke(); }
}, { srgb: false, rep: [3, 1] });
const hairMat = (color = 0x2a1a12) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, normalMap: HAIR_N, normalScale: new THREE.Vector2(1.2, 1.2), sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xfff0dd), 0.35), anisotropy: 0.8 });

// ---------- a seated student with realistic proportions (metres), posed every frame ----------
function lathe(profile, seg = 48) { return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg); }
function limb(r0, r1, len, mat) { // a tapered capsule hanging from its top end along -y
  const g = new THREE.CapsuleGeometry((r0 + r1) / 2, len, 8, 20); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = clamp((y + len / 2) / len); const s = lerp(r1, r0, k) / ((r0 + r1) / 2); p.setX(i, p.getX(i) * s); p.setZ(i, p.getZ(i) * s); }
  g.translate(0, -len / 2, 0); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
function makeStudent({ sweater = 0x5b6e8c, hair = 0x2a1a12, skin = 0xc89478, jeans = 0x34425e, seed = 1, long = false } = {}) {
  const g = new THREE.Group(), sw = knitMat(sweater), sk = skinMat(skin), hm = hairMat(hair), dm = denimMat(jeans), r = rng(seed);
  const hips = new THREE.Group(); hips.position.y = SEAT + 0.06; g.add(hips);
  // pelvis + thighs + shins (seated)
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 20), dm); pelvis.scale.set(1, 0.55, 0.8); hips.add(pelvis); pelvis.castShadow = true;
  const legs = [];
  for (const s of [-1, 1]) {
    const th = limb(0.085, 0.065, 0.42, dm); th.position.set(s * 0.09, 0, 0.02); th.rotation.x = -Math.PI / 2 + 0.05; hips.add(th);
    const knee = new THREE.Group(); knee.position.set(0, -0.42, 0); th.add(knee);
    const sh = limb(0.058, 0.045, 0.43, dm); sh.rotation.x = Math.PI / 2 - 0.05; knee.add(sh);
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.07, 0.26, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0x23201e, roughness: 0.6 })); shoe.position.set(0, -0.43, 0.06); sh.add(shoe); shoe.castShadow = true;
    legs.push(th);
  }
  // torso: a lathe shell, flattened front-to-back, leaning forward from the hips
  const spine = new THREE.Group(); hips.add(spine);
  const torso = new THREE.Mesh(lathe([[0.001, -0.02], [0.15, 0.0], [0.162, 0.08], [0.168, 0.17], [0.172, 0.28], [0.182, 0.38], [0.19, 0.45], [0.16, 0.52], [0.09, 0.56], [0.06, 0.575], [0.001, 0.58]]), sw);
  torso.scale.set(1, 1, 0.64); torso.castShadow = torso.receiveShadow = true; spine.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 20), sw); belly.scale.set(1, 0.85, 0.62); belly.position.set(0, 0.14, 0.035); spine.add(belly); belly.castShadow = true;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.016, 12, 32), sw); collar.rotation.x = Math.PI / 2; collar.position.y = 0.565; spine.add(collar);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.12, 24), sk); neck.position.y = 0.6; spine.add(neck);
  const head = new THREE.Group(); head.position.y = 0.66; spine.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 48, 32), sk); skull.scale.set(0.78, 1.12, 0.98); skull.position.set(0, 0.1, 0.01); head.add(skull); skull.castShadow = true;
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 20), sk); jaw.scale.set(0.95, 0.9, 1.05); jaw.position.set(0, 0.03, 0.035); head.add(jaw);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), sk); ear.scale.set(0.4, 1, 0.75); ear.position.set(s * 0.077, 0.1, 0.0); head.add(ear); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 16), sk); nose.rotation.x = Math.PI / 2 + 0.3; nose.position.set(0, 0.08, 0.105); head.add(nose);
  // hair: a cap over the crown and back of the head, longer at the back for some
  // hair: the skull's own ellipsoid, a little larger, covering the crown and back (tilted in the geometry so it stays on the skull)
  const capG = new THREE.SphereGeometry(0.1, 64, 40, 0, Math.PI * 2, 0, long ? 2.2 : 1.85); capG.rotateX(-0.62);
  { const p = capG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = 1 + 0.035 * fbm(x * 40 + seed, y * 40, z * 40); p.setXYZ(i, x * n, y * n, z * n); } capG.computeVertexNormals(); }
  const cap = new THREE.Mesh(capG, hm); cap.scale.set(0.78 * 1.07, 1.12 * 1.05, 0.98 * 1.07); cap.position.set(0, 0.1, 0.0); head.add(cap); cap.castShadow = true;
  if (long) { const drape = new THREE.Mesh(new THREE.SphereGeometry(0.1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), hm); drape.scale.set(0.95, 1.6, 0.45); drape.rotation.x = Math.PI; drape.position.set(0, 0.12, -0.055); head.add(drape); drape.castShadow = true; }
  // arms: shoulder -> elbow -> forearm resting on the desk
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.19, 0.49, 0.0); spine.add(sh);
    const up = limb(0.058, 0.048, 0.29, sw); sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.29; up.add(el);
    const fo = limb(0.046, 0.036, 0.26, sw); el.add(fo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), sk); hand.scale.set(0.8, 1.25, 0.42); hand.position.y = -0.3; fo.add(hand); hand.castShadow = true;
    arms.push({ sh, el, up, fo, hand, s });
  }
  g.userData = { hips, spine, head, arms, legs, belly, torso };
  // pose: lean over the desk and write; `turn` swivels the head toward a point (0..1)
  g.userData.pose = (t, { lean = 0.32, look = 0.42, write = 1, turn = 0, turnYaw = 0.6 } = {}) => {
    const n1 = fbm(t * 0.3 + seed * 3.1, seed), n2 = fbm(t * 0.25 + seed * 1.7, seed + 9);
    spine.rotation.x = lean + n1 * 0.04 + Math.sin(t * 1.3 + seed) * 0.006;
    head.rotation.set(look + n2 * 0.08 - turn * 0.35, turn * turnYaw + n1 * 0.05, 0);
    for (const a of arms) {
      const w = a.s > 0 ? write * (Math.sin(t * 9 + seed) * 0.03 + Math.sin(t * 3.1 + seed) * 0.05) : 0;
      a.sh.rotation.set(-0.55 - lean * 0.5 + w, 0, -a.s * 0.16); a.el.rotation.set(-1.25 + w * 0.6, 0, a.s * 0.2);
    }
  };
  g.userData.pose(0);
  return g;
}

// ---------- the glass of water: glass shell + water volume with a rippling surface ----------
function waterGlass() {
  const g = new THREE.Group(); const R0 = 0.034, R1 = 0.04, Hh = 0.118, th = 0.0026, base = 0.011, HW = 0.082;
  const prof = [[0.0005, 0], [R0 - 0.002, 0], [R0, 0.003], [R1, Hh], [R1 - th, Hh], [R0 - th + 0.0004, base], [0.0005, base]];
  // glass: reflections only, added on top (a second transmissive layer would hide the water); a faint grey for its edges
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, specularIntensity: 1, ior: 1.5, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const edgeM = new THREE.MeshBasicMaterial({ color: 0x9fb4b0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.BackSide });
  const shell = new THREE.Mesh(lathe(prof, 96), glassM); g.add(shell); shell.castShadow = false; shell.renderOrder = 5;
  const edge = new THREE.Mesh(lathe(prof, 96), edgeM); edge.renderOrder = 4; g.add(edge);
  const rIn = (y) => lerp(R0 - th, R1 - th, clamp((y - base) / (Hh - base))) - 0.0006;
  const waterM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.03, ior: 1.33, thickness: 0.07, attenuationColor: new THREE.Color(0xcfe9ea), attenuationDistance: 0.35, side: THREE.DoubleSide });
  const side = new THREE.Mesh(lathe([[rIn(base), base], [rIn(HW), HW]], 96), waterM); g.add(side);
  // surface: polar grid so ripples are smooth rings
  const NR = 40, NA = 96, rs = rIn(HW), pos = [], idx = [];
  pos.push(0, HW, 0);
  for (let i = 1; i <= NR; i++) for (let j = 0; j < NA; j++) { const a = j / NA * Math.PI * 2, rr = rs * i / NR; pos.push(Math.cos(a) * rr, HW, Math.sin(a) * rr); }
  for (let j = 0; j < NA; j++) idx.push(0, 1 + (j + 1) % NA, 1 + j);
  for (let i = 1; i < NR; i++) for (let j = 0; j < NA; j++) { const a = 1 + (i - 1) * NA + j, b = 1 + (i - 1) * NA + (j + 1) % NA, c = 1 + i * NA + j, d = 1 + i * NA + (j + 1) % NA; idx.push(a, b, d, a, d, c); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx);
  const surf = new THREE.Mesh(sg, waterM); g.add(surf);
  // ripples: each event is a burst of concentric rings driven by the desk's vibration
  g.userData.ripple = (t, events) => {
    const p = sg.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), z = p.getZ(k), rr = Math.hypot(x, z) / rs; let h = 0;
      for (const [t0, amp] of events) {
        const a = t - t0; if (a <= 0 || a > 3) continue;
        const env = Math.exp(-a * 1.6) * smooth(0, 0.08, a);
        // a standing ring pattern (the whole glass shakes) plus a ring travelling inward from the wall
        h += amp * env * (Math.cos(rr * 15.0 - a * 42) * 0.55 * (0.4 + 0.6 * rr) + Math.cos((1 - rr) * 22 - a * 30) * 0.45 * smooth(0, 0.5, a * 3 - (1 - rr) * 1.5));
      }
      p.setY(k, HW + h * 0.0026 * (1 - Math.pow(rr, 8) * 0.6));
    }
    p.needsUpdate = true; sg.computeVertexNormals();
  };
  g.userData.ripple(0, []);
  return g;
}

// ---------- an exam paper (canvas print) ----------
const EXAM_TEX = canvasTex(768, 1086, (g, w, h) => {
  g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = 'bold 34px serif'; g.fillText('BIOLOGY  —  FINAL EXAMINATION', 60, 90);
  g.font = '20px serif'; g.fillStyle = '#444'; g.fillText('Time allowed: 2 hours.   Answer ALL questions.', 60, 130); g.fillRect(60, 150, w - 120, 2);
  const r = rng(5); let y = 210;
  for (let q = 1; q <= 6; q++) {
    g.fillStyle = '#222'; g.font = 'bold 22px serif'; g.fillText(`${q}.`, 60, y);
    g.font = '21px serif'; g.fillStyle = '#333'; const n = 2 + Math.floor(r() * 2);
    for (let l = 0; l < n; l++) { g.fillRect(100, y - 14 + l * 30, (w - 200) * (l === n - 1 ? 0.4 + r() * 0.4 : 0.9 + r() * 0.1), 2.5); }
    y += n * 30 + 20; g.strokeStyle = '#b9c3d4'; g.lineWidth = 1.2;
    for (let l = 0; l < 3; l++) { g.beginPath(); g.moveTo(100, y + l * 32); g.lineTo(w - 60, y + l * 32); g.stroke(); }
    // handwriting on the first answers
    if (q < 4) { g.strokeStyle = '#1d3c8c'; g.lineWidth = 2; for (let l = 0; l < (q === 3 ? 1 : 3); l++) { g.beginPath(); let x = 104; g.moveTo(x, y + l * 32 - 6); while (x < w - 120 - r() * 200) { x += 6 + r() * 6; g.lineTo(x, y + l * 32 - 6 - Math.abs(Math.sin(x * 0.7)) * (6 + r() * 6)); } g.stroke(); } }
    y += 120;
  }
}, { rep: [1, 1] });
const examPaper = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshStandardMaterial({ map: EXAM_TEX, roughness: 0.85 })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m; };

// ---------- the hall: HDR floor and walls, real desks and chairs in rows, students ----------
const HALL_YAW = Math.PI;   // the rows face the bright end of the hall, so the water reflects it
function examHall(sc, { heroCol = 1, heroRow = 1, cols = 5, rows = 6 } = {}) {
  sc.environment = HALL.env;
  const sky = new GroundProjectedSkybox(HALL.tex); sky.scale.setScalar(60); sky.height = 1.7; sky.radius = 60; sc.add(sky); sky.userData.isSky = true;
  sc.background = new THREE.Color(0x111111);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 })); shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = 0.002; shadowFloor.receiveShadow = true; sc.add(shadowFloor);
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.0); sun.position.set(-3, 9, 4); sun.target.position.set(0, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.userData.soft = 0.6; sc.add(sun, sun.target);
  const R = { desks: [], students: [], sun, sky };
  const room = new THREE.Group(); room.rotation.y = HALL_YAW; sc.add(room); R.room = room;
  const cloth = [0x5b6e8c, 0x8a3b3b, 0x3f5e4a, 0x7a7a7a, 0x2d3a55, 0xb08a5a, 0x6b4a6e, 0x3a3a3a, 0x9aa7b4, 0x4f6b73, 0xa0522d, 0x2f4f4f];
  const hairs = [0x2a1a12, 0x4a2e1a, 0x0f0c0a, 0x6b4a2a, 0x1c1410, 0x8a6a3a, 0x3a2418];
  const skins = [0xc89478, 0xe0b49a, 0x9a6a4e, 0xd8a688, 0x7a4e36, 0xeec2a6];
  for (let rI = 0; rI < rows; rI++) for (let cI = 0; cI < cols; cI++) {
    const x = (cI - (cols - 1) / 2) * 1.25, z = (rI - (rows - 1) / 2) * 1.35, k = rI * cols + cI, rr = rng(k * 13 + 7);
    const cell = new THREE.Group(); cell.position.set(x + (rr() - 0.5) * 0.06, 0, z + (rr() - 0.5) * 0.05); cell.rotation.y = (rr() - 0.5) * 0.04; room.add(cell);
    const desk = model('SchoolDesk_01'); cell.add(desk);
    const chair = model('SchoolChair_01'); chair.position.set(0, 0, 0.56); chair.rotation.y = Math.PI; cell.add(chair);
    const paper = examPaper(); paper.position.set(-0.05 + (rr() - 0.5) * 0.06, DESK_TOP + 0.0015, 0.02); paper.rotation.z = (rr() - 0.5) * 0.25; cell.add(paper);
    const hero = cI === heroCol && rI === heroRow;
    const st = makeStudent({ sweater: cloth[k % cloth.length], hair: hairs[k % hairs.length], skin: skins[(k * 5) % skins.length], seed: k + 1, long: rr() > 0.55 });
    st.position.set(0, 0, 0.6); st.rotation.y = Math.PI; cell.add(st);
    R.students.push({ st, hero, cell, k }); R.desks.push(cell);
    if (hero) R.hero = { st, cell, desk, paper };
  }
  // the hero's glass of water and pencils
  const glass = waterGlass(); glass.position.set(0.24, DESK_TOP, 0.12); R.hero.cell.add(glass); R.glass = glass;
  const pens = model('stationery_supplies'); pens.position.set(-0.22, DESK_TOP, -0.12); pens.rotation.y = 0.4; R.hero.cell.add(pens);
  return R;
}

// ---------- a live text label (canvas redrawn on demand) ----------
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

// ---------- a wall clock on a plaster wall, sunlight from a window sliding across it ----------
function clockWall(sc) {
  sc.environment = HALL.env; sc.environmentIntensity = 0.35; sc.background = new THREE.Color(0x1a1612);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), pbrMat(TX.plaster, { rep: [3, 2], color: 0xe9dcc6, normal: 1.2 })); wall.position.set(0, 2.2, -0.02); wall.receiveShadow = true; sc.add(wall);
  const clock = model('wall_clock'); clock.scale.setScalar(1.0); clock.position.set(0, 2.25, 0); sc.add(clock);
  const hm = part(clock, 'wall_clock_minute_hand'), hh = part(clock, 'wall_clock_hours_hand'), hs = part(clock, 'wall_clock_second_hand'); if (hs) hs.visible = false;
  // the window: an unseen frame between the sun and the wall, so its shadow pattern lands on the wall
  const sun = new THREE.DirectionalLight(0xffe2b8, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.1, far: 12 }); sun.shadow.bias = -0.0005; sun.userData.soft = 0.05; sc.add(sun, sun.target);
  const frame = new THREE.Group(); sc.add(frame); const fm = new THREE.MeshBasicMaterial({ color: 0x000000 }); fm.colorWrite = false;
  const bar = (w, h, x, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), fm); b.position.set(x, y, 0); b.castShadow = true; frame.add(b); };
  bar(3, 0.9, 0, 1.35); bar(3, 0.9, 0, -1.35); bar(0.9, 3.6, -1.15, 0); bar(0.9, 3.6, 1.15, 0); bar(0.06, 1.8, 0, 0); bar(1.4, 0.06, 0, 0.2);
  const fill = new THREE.HemisphereLight(0xfff3e4, 0x3a3026, 0.25); sc.add(fill);
  return { clock, hm, hh, sun, frame, set(minutes, k) {
    // hands: minutes since 10:10
    const m = 10 + minutes, h = 10 + m / 60;
    hm.rotation.z = -m / 60 * Math.PI * 2; hh.rotation.z = -(h % 12) / 12 * Math.PI * 2;
    // the sun moves as time passes: the window's light patch slides across the wall
    const a = lerp(-0.75, -0.25, k), el = lerp(0.42, 0.3, k), dir = V(Math.sin(a), -Math.sin(el), -Math.cos(a)).normalize();
    sun.position.copy(V(0.3, 2.2, 0).sub(dir.clone().multiplyScalar(6))); sun.target.position.set(0.3, 2.2, 0);
    frame.position.copy(V(0.3, 2.2, 0).sub(dir.clone().multiplyScalar(2.6))); frame.lookAt(V(0.3, 2.2, 0));
  } };
}

// ---------- cast iron with rust (procedural) for the old pipe ----------
const IRON = (() => {
  const S = 512, c = document.createElement('canvas'), hc = document.createElement('canvas'); c.width = c.height = hc.width = hc.height = S; const g = c.getContext('2d'), hg = hc.getContext('2d'), r = rng(31);
  g.fillStyle = '#3a3532'; g.fillRect(0, 0, S, S); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  for (let i = 0; i < 400; i++) { const x = r() * S, y = r() * S, rad = 4 + r() * 40, col = r() > 0.4 ? `rgba(${120 + r() * 60},${55 + r() * 30},${25 + r() * 15},${0.15 + r() * 0.35})` : `rgba(20,18,16,${0.2 + r() * 0.3})`; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const hr = hg.createRadialGradient(x, y, 0, x, y, rad); hr.addColorStop(0, `rgba(255,255,255,${0.1 + r() * 0.2})`); hr.addColorStop(1, 'rgba(255,255,255,0)'); hg.fillStyle = hr; hg.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  const im = hg.getImageData(0, 0, S, S); for (let i = 0; i < im.data.length; i += 4) { const v = (Math.random() - 0.5) * 40; im.data[i] = im.data[i + 1] = im.data[i + 2] = clamp(im.data[i] + v, 0, 255); } hg.putImageData(im, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return { map, normalMap: heightToNormal(hc, 3) };
})();
const ironMat = (rep = [6, 2], col = 0xffffff, rough = 0.62) => { const c = (x) => { const k = x.clone(); k.repeat.set(rep[0], rep[1]); k.needsUpdate = true; return k; }; return new THREE.MeshPhysicalMaterial({ map: c(IRON.map), normalMap: c(IRON.normalMap), color: col, roughness: rough, metalness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.4, side: THREE.DoubleSide }); };

// ---------- the stethoscope: chest piece, tubing, a gloved hand, a belly ----------
const NITRILE = new THREE.MeshPhysicalMaterial({ color: 0x4f86d6, roughness: 0.42, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xa8ccff), clearcoat: 0.25, clearcoatRoughness: 0.35 });
const PORES = (() => { const S = 512, hc = document.createElement('canvas'); hc.width = hc.height = S; const g = hc.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, S, S); const r = rng(13);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.25})`; g.beginPath(); g.arc(r() * S, r() * S, 0.6 + r() * 1.2, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 20); g.stroke(); }
  const t = heightToNormal(hc, 2.5); t.repeat.set(5, 5); return t; })();
function chestPiece() {
  const g = new THREE.Group(), chrome = new THREE.MeshPhysicalMaterial({ color: 0xd8dde2, metalness: 1, roughness: 0.14, clearcoat: 0.3 }), black = new THREE.MeshPhysicalMaterial({ color: 0x15171a, roughness: 0.35, clearcoat: 0.6 });
  const body = new THREE.Mesh(lathe([[0.001, 0], [0.023, 0], [0.0235, 0.004], [0.022, 0.009], [0.016, 0.013], [0.007, 0.016], [0.001, 0.0165]], 64), chrome); g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0232, 0.0022, 16, 64), black); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0015; g.add(ring);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.03, 20), chrome); stem.rotation.z = Math.PI / 2 - 0.25; stem.position.set(0.02, 0.016, 0); g.add(stem);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.034, 0.02, 0), V(0.06, 0.03, -0.01), V(0.1, 0.07, -0.05), V(0.13, 0.16, -0.1), V(0.12, 0.3, -0.12)]), 60, 0.0048, 16), new THREE.MeshPhysicalMaterial({ color: 0x1b1d21, roughness: 0.55, clearcoat: 0.3 })); g.add(tube);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function glovedHand() {
  // a relaxed right hand pressing two fingers on top of the chest piece
  const g = new THREE.Group(); const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 32, 20), NITRILE); palm.scale.set(1.0, 0.42, 1.15); g.add(palm); palm.castShadow = true;
  const wrist = limb(0.032, 0.03, 0.12, NITRILE); wrist.rotation.x = -Math.PI / 2 - 0.25; wrist.position.set(0, 0.008, -0.04); wrist.scale.set(1.2, 1, 0.75); g.add(wrist);
  const fingers = [[-0.03, 0.9, [0.044, 0.026, 0.02]], [-0.01, 0.5, [0.048, 0.028, 0.022]], [0.012, 0.45, [0.046, 0.027, 0.021]], [0.032, 1.0, [0.038, 0.022, 0.018]]];
  fingers.forEach(([x, curl, lens], i) => { let par = new THREE.Group(); par.position.set(x, -0.004, 0.045); par.rotation.x = 0.25; g.add(par);
    lens.forEach((L, k) => { const seg = limb(0.0095 - k * 0.0012, 0.0085 - k * 0.0012, L, NITRILE); seg.rotation.x = -Math.PI / 2 + (k ? curl * 0.6 : curl * 0.35); par.add(seg); const nx = new THREE.Group(); nx.position.y = -L; seg.add(nx); par = nx; }); });
  const th = limb(0.011, 0.009, 0.04, NITRILE); th.position.set(-0.045, -0.004, 0.0); th.rotation.set(-Math.PI / 2 + 0.4, 0, 0.9); g.add(th);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const SKIN_MAP = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#b97a5c'; g.fillRect(0, 0, w, h); const r = rng(17);
  for (let i = 0; i < 500; i++) { const x = r() * w, y = r() * h, rad = 6 + r() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, rad); const c = r() > 0.5 ? '210,120,100' : '220,170,130'; gr.addColorStop(0, `rgba(${c},0.12)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,70,50,${0.15 + r() * 0.2})`; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 1.6, 0, 7); g.fill(); } }, { rep: [2, 2] });
function bellyScene(sc) {
  sc.background = SURG.tex; sc.backgroundBlurriness = 0.35; sc.backgroundIntensity = 0.6; sc.environment = SURG.env;
  const pg = new THREE.PlaneGeometry(0.8, 0.8, 220, 220); pg.rotateX(-Math.PI / 2); const base = pg.attributes.position.array.slice();
  const skin = new THREE.MeshPhysicalMaterial({ map: SKIN_MAP, color: 0xffffff, roughness: 0.5, normalMap: PORES, normalScale: new THREE.Vector2(0.5, 0.5), sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xd86a50), clearcoat: 0.12, clearcoatRoughness: 0.45 });
  const belly = new THREE.Mesh(pg, skin); belly.receiveShadow = true; sc.add(belly);
  // the shirt pulled up: a knit band across the top
  const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 64, 1, true, -0.55, 1.1), knitMat(0xd8dfe8, 10)); shirt.rotation.z = Math.PI / 2; shirt.position.set(0, -0.36, -0.32); shirt.castShadow = shirt.receiveShadow = true; sc.add(shirt);
  const cp = chestPiece(); sc.add(cp); const hand = new THREE.Group();
  const key = new THREE.SpotLight(0xffffff, 8, 3, 0.6, 0.6, 1.6); key.position.set(-0.35, 0.8, 0.45); key.target.position.set(0, 0, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.userData.soft = 0.05; sc.add(key, key.target);
  const NAV = V(-0.035, 0, 0.07), CP = V(0.04, 0, 0.0);
  const surf = (x, z, t, press) => { const dome = 0.13 * Math.exp(-(x * x * 7 + (z + 0.02) * (z + 0.02) * 5)) * (1 + 0.02 * Math.sin(t * 1.6)); const dn = Math.hypot(x - NAV.x, z - NAV.z); const navel = -0.012 * Math.exp(-dn * dn / 0.00012) + 0.0025 * Math.exp(-Math.pow((dn - 0.014) / 0.006, 2)); const dc = Math.hypot(x - CP.x, z - CP.z); const pr = -press * 0.006 * Math.exp(-dc * dc / 0.0011); return dome + navel + pr; };
  return { belly, cp, hand, update(t, { press = 1, gurgle = 0 } = {}) {
    const p = pg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; const rip = gurgle ? 0.0012 * gurgle * Math.sin(Math.hypot(x - 0.02, z + 0.05) * 120 - t * 30) * Math.exp(-Math.hypot(x - 0.02, z + 0.05) * 14) : 0; p.setY(i, surf(x, z, t, press) + rip); }
    p.needsUpdate = true; pg.computeVertexNormals();
    const y = surf(CP.x, CP.z, t, press) - 0.001; cp.position.set(CP.x, y, CP.z); cp.rotation.set(0.05, -0.5, 0);
    hand.position.set(CP.x - 0.005, y + 0.036, CP.z - 0.035); hand.rotation.set(0.15, -0.35, 0.05);
  } };
}

// ---------- old cast-iron plumbing on a basement wall: flanges, bolts, an elbow, a valve; it drips ----------
function pipeRun(sc) {
  sc.background = PIPEHDR.tex; sc.backgroundBlurriness = 0.6; sc.backgroundIntensity = 0.45; sc.environment = PIPEHDR.env;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), pbrMat(TX.plaster, { rep: [3, 2], color: 0x8a8e84, normal: 1.6 })); wall.position.set(0, 1.4, -0.02); wall.receiveShadow = true; sc.add(wall);
  const iron = ironMat([1.3, 7], 0xd8d0c8, 0.72), ironV = iron, g = new THREE.Group(); sc.add(g); iron.metalness = 0.35;
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x6a625a, metalness: 0.8, roughness: 0.45 });
  const pipe = (a, b, r = 0.055) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 48, 1), Math.abs(d.y) > Math.abs(d.x) ? ironV : iron); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const flange = (p, dir) => { const f = new THREE.Group(); f.position.copy(p); f.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()); g.add(f);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.034, 48), iron); d.castShadow = true; f.add(d);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.06, 6), steel); b.position.set(Math.cos(a) * 0.074, 0, Math.sin(a) * 0.074); b.castShadow = true; f.add(b); } return f; };
  const Y = 1.15, Z = 0.16;
  pipe(V(-1.6, Y, Z), V(0.25, Y, Z)); flange(V(-0.45, Y, Z), V(1, 0, 0)); flange(V(0.25, Y, Z), V(1, 0, 0));
  const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.055, 32, 48, Math.PI / 2), iron); elbow.position.set(0.25, Y + 0.16, Z); elbow.rotation.z = -Math.PI / 2; elbow.castShadow = true; g.add(elbow);
  pipe(V(0.41, Y + 0.16, Z), V(0.41, Y + 1.6, Z)); flange(V(0.41, Y + 0.6, Z), V(0, 1, 0));
  // a valve on a short branch
  pipe(V(-0.12, Y, Z), V(-0.12, Y - 0.3, Z), 0.04); const vb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 20), iron); vb.scale.set(1, 1.1, 1.3); vb.position.set(-0.12, Y - 0.32, Z); g.add(vb);
  pipe(V(-1.6, Y + 0.42, Z - 0.04), V(1.0, Y + 0.42, Z - 0.04), 0.032); flange(V(-0.25, Y + 0.42, Z - 0.04), V(1, 0, 0)).scale.setScalar(0.6);
  const wheel = new THREE.Group(); wheel.position.set(-0.12, Y - 0.32, Z + 0.15); g.add(wheel); const red = new THREE.MeshPhysicalMaterial({ color: 0x8a1e14, roughness: 0.55, clearcoat: 0.3 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.011, 16, 48), red); wheel.add(rim); for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.17, 8), red); sp.rotation.z = i * Math.PI / 4 * 2 / 2 + i * Math.PI / 4; wheel.add(sp); }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.15, 12), steel); stem.rotation.x = Math.PI / 2; stem.position.set(-0.12, Y - 0.32, Z + 0.075); g.add(stem);
  // wall brackets
  for (const x of [-1.2, -0.1]) { const br = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 10, 40, Math.PI), steel); br.position.set(x, Y, Z); br.rotation.y = Math.PI / 2; br.rotation.z = Math.PI / 2; g.add(br); const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, Z), steel); st.position.set(x, Y + 0.065, Z / 2); g.add(st); }
  // a wet streak under the flange and drops falling from it
  const water = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transmission: 1, thickness: 0.01, ior: 1.33 });
  const drops = [0, 1, 2].map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.009, 20, 14), water); sc.add(d); return d; });
  const key = new THREE.SpotLight(0xffe2c0, 30, 8, 0.6, 0.7, 1.5); key.position.set(-1.6, 2.6, 2.2); key.target.position.set(-0.3, 1.1, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.userData.soft = 0.06; sc.add(key, key.target);
  const fill = new THREE.PointLight(0x9fb8d8, 2, 5, 1.5); fill.position.set(1.2, 1.0, 1.5); sc.add(fill);
  return { g, update(t, gurgle) {
    // the whole run trembles a little with the gurgle
    g.position.set(Math.sin(t * 61) * 0.0008 * gurgle, Math.sin(t * 47 + 1) * 0.0008 * gurgle, 0);
    drops.forEach((d, i) => { const per = 0.9, ph = (t / per + i / 3) % 1; const fall = Math.max(0, ph - 0.55) / 0.45; d.position.set(-0.45 + (i - 1) * 0.004, Y - 0.092 - 0.012 * smooth(0, 0.55, ph) - 4.9 * Math.pow(fall * per * 0.45, 2), Z + 0.02); d.scale.set(1, 1 + 0.4 * smooth(0.3, 0.55, ph) - 0.3 * fall, 1); });
  } };
}
