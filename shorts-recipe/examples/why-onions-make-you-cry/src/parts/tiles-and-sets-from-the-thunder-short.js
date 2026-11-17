// =====================================================================
// SETS: "Why Dogs Are Scared Of Thunder" — the living room in a storm, lightning, rain, a bathroom,
// a barometer, charged clouds, static sparks, and a walk cycle for the dog
// =====================================================================
// lightning: strike times -> flash level (bright first stroke, a quick re-strike, a faint third)
function flashAt(t, strikes) {
  let f = 0;
  for (const t0 of strikes) {
    const a = t - t0; if (a < 0 || a > 1.2) continue;
    const v = Math.exp(-a * 16) + (a > 0.08 ? 0.75 * Math.exp(-(a - 0.08) * 11) : 0) + (a > 0.24 ? 0.4 * Math.exp(-(a - 0.24) * 7) : 0);
    f = Math.max(f, v);
  }
  return Math.min(f, 1.5);
}
// a straight-segment polyline curve (lightning is jagged, not smooth)
class Poly extends THREE.Curve {
  constructor(P) { super(); this.P = P; }
  getPoint(u, tgt = new THREE.Vector3()) { const n = this.P.length - 1, x = clamp(u) * n, i = Math.min(Math.floor(x), n - 1); return tgt.copy(this.P[i]).lerp(this.P[i + 1], x - i); }
}
function jagPath(seed, a, b, n = 14, jag = 0.35) {
  const r = rng(seed), P = [], d = b.clone().sub(a), side = new THREE.Vector3().crossVectors(d, V(0, 0, 1)).normalize(), side2 = new THREE.Vector3().crossVectors(d, side).normalize();
  for (let i = 0; i <= n; i++) { const k = i / n, p = a.clone().lerp(b, k); if (i > 0 && i < n) p.addScaledVector(side, (r() - 0.5) * jag).addScaledVector(side2, (r() - 0.5) * jag * 0.6); P.push(p); }
  return P;
}
// a lightning bolt with branches; set(k) shows it at brightness k
function makeBolt(seed, a, b, { jag = 0.6, width = 0.05, branches = 3, n = 16 } = {}) {
  const g = new THREE.Group(), r = rng(seed + 50);
  const core = hdr(4, 4.4, 6, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), halo = hdr(0.5, 0.65, 1.4, { transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  const add = (P, w) => { const c = new Poly(P); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, P.length * 6, w, 6, false), core)); g.add(new THREE.Mesh(new THREE.TubeGeometry(c, P.length * 6, w * 5, 8, false), halo)); };
  const main = jagPath(seed, a, b, n, jag); add(main, width); const L = a.distanceTo(b);
  for (let i = 0; i < branches; i++) { const k = 2 + Math.floor(r() * (n - 5)), s = main[k]; const e = s.clone().add(V((r() - 0.5) * 1.6, -(0.6 + r() * 1.0), (r() - 0.5) * 1.6).multiplyScalar(L * 0.22)); add(jagPath(seed + i * 7 + 3, s, e, 7, jag * 0.55), width * 0.5); }
  g.userData.set = (k) => { g.visible = k > 0.03; core.color.setRGB(4 * k, 4.4 * k, 6 * k); halo.opacity = 0.5 * Math.min(k, 1); };
  g.userData.set(0); g.traverse(o => { o.castShadow = false; o.userData.noDof = true; }); return g;
}
// a dark, cloudy night sky
const STORM_SKY = () => canvasTex(512, 320, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#141a2a'); gr.addColorStop(0.55, '#262d44'); gr.addColorStop(1, '#3a3c52'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const im = g.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x / 70, y / 38, 3.3), k = smooth(0.0, 0.55, n) * 70, i = (y * w + x) * 4; im.data[i] += k * 0.85; im.data[i + 1] += k * 0.9; im.data[i + 2] += k; }
  g.putImageData(im, 0, 0);
});
// rain streaks falling through a box; returns update(t, bright)
function rainBox(sc, min, max, n = 700, { len = 0.45, speed = 11, seed = 4, op = 0.32 } = {}) {
  const geo = new THREE.BoxGeometry(0.008, len, 0.008); geo.translate(0, -len / 2, 0);
  const mat = new THREE.MeshBasicMaterial({ color: 0x9aa8c0, transparent: true, opacity: op, depthWrite: false });
  const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.userData.noDof = false; sc.add(m);
  const r = rng(seed), D = []; for (let i = 0; i < n; i++) D.push([r(), r(), r(), 0.8 + r() * 0.4]); const o = new THREE.Object3D(), H = max.y - min.y;
  const up = (t, bright = 0) => { mat.color.setRGB(0.42 + 0.7 * bright, 0.46 + 0.72 * bright, 0.56 + 0.8 * bright);
    D.forEach(([a, b, c, s], i) => { const fall = (((b * H + t * speed * s) % H) + H) % H; o.position.set(lerp(min.x, max.x, a) + 0.04 * fall, max.y - fall, lerp(min.z, max.z, c)); o.rotation.set(0, 0, 0.06); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; };
  up(0); up.mesh = m; return up;
}
// raindrops sliding down a pane of glass (drawn on a canvas every frame)
function rainGlass(w, h, seed = 3) {
  const cv = canvasDyn(512, Math.round(512 * h / w)), H = cv.c.height, r = rng(seed);
  const still = []; for (let i = 0; i < 360; i++) still.push([r() * 512, r() * H, 0.8 + r() * r() * 3.2]);
  const slide = []; for (let i = 0; i < 22; i++) slide.push([r() * 512, r() * H, 3 + r() * 3, 40 + r() * 120, r() * 10]);
  const mat = new THREE.MeshBasicMaterial({ map: cv.t, transparent: true, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.userData.dofMap = cv.t;
  m.userData.draw = (t, bright = 0) => {
    const g = cv.g; g.clearRect(0, 0, 512, H); g.fillStyle = `rgba(150,170,205,${0.04 + 0.03 * bright})`; g.fillRect(0, 0, 512, H);
    const a = 0.16 + 0.35 * bright, dot = (x, y, s) => { g.fillStyle = `rgba(150,170,205,${a})`; g.beginPath(); g.ellipse(x, y, s, s * 1.15, 0, 0, 7); g.fill(); g.strokeStyle = `rgba(20,30,50,${a})`; g.lineWidth = 0.8; g.stroke(); g.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * bright})`; g.beginPath(); g.arc(x - s * 0.3, y - s * 0.35, s * 0.28, 0, 7); g.fill(); };
    still.forEach(([x, y, s]) => dot(x, y, s));
    slide.forEach(([x, y0, s, v, ph]) => { const stick = Math.floor(t * 1.7 + ph), f = (t * 1.7 + ph) - stick, y = (y0 + v * (stick * 0.6 + smooth(0.3, 1, f) * 0.6)) % (H + 60) - 30;
      g.strokeStyle = `rgba(190,205,235,${a * 0.5})`; g.lineWidth = s * 0.7; g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x + 2 * Math.sin(y * 0.05), y); g.stroke(); dot(x + 2 * Math.sin(y * 0.05), y, s); });
    cv.t.needsUpdate = true; };
  m.userData.draw(0); return m;
}
// a dark tree outside that sways in the wind
function stormTree(seed = 2) {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0x0b0f16 }), r = rng(seed);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 4, 10), m); tr.position.y = 2; g.add(tr);
  const top = new THREE.Group(); top.position.y = 3.6; g.add(top);
  for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7 + r() * 0.6, 1), m); s.position.set((r() - 0.5) * 2.6, r() * 2.2, (r() - 0.5) * 2.6); top.add(s); }
  g.userData.sway = (t) => { const k = 0.08 * Math.sin(t * 1.3) + 0.05 * fbm(t * 0.9, 4); top.rotation.z = k; top.position.x = k * 1.6; tr.rotation.z = k * 0.3; };
  return g;
}
// the living room at night in a storm (built on the sunset room: the sky, sun and sun shaft are swapped out)
function stormRoom(sc, { storm = 1, strikes = [] } = {}) {
  const R = livingRoom(sc); const off = [];
  sc.traverse(o => {
    if (o.isMesh && o.geometry.type === 'PlaneGeometry' && o.geometry.parameters.width === 26) R.sky = o;
    else if (o.isMesh && o.geometry.type === 'CircleGeometry' && o.geometry.parameters.radius === 0.7) off.push(o);
    else if (o.isMesh && o.material.isShaderMaterial && o.material.uniforms && o.material.uniforms.col) off.push(o);
    else if (o.isInstancedMesh && o.count === 60) off.push(o);
    else if (o.isMesh && o.material.isMeshBasicMaterial && o.material.color.getHex() === 0x3a2a4a) o.material = new THREE.MeshBasicMaterial({ color: 0x07080d });
    else if (o.isHemisphereLight) R.hemi = o;
    else if (o.isPointLight) R.lampL = o;
    else if (o.isDirectionalLight && o !== R.key) R.fill = o;
  });
  off.forEach(o => o.visible = false); R.dust = () => {};
  R.sky.material = new THREE.MeshBasicMaterial({ map: STORM_SKY() }); R.sky.material.color.setScalar(0.8);
  R.key.color.set(0xa8b8ff); R.key.intensity = 0.25; R.key.userData.soft = 0.12;
  R.hemi.color.set(0x8a94b4); R.hemi.groundColor.set(0x4a3426); R.hemi.intensity = 0.55 + 0.2 * (1 - storm);
  R.fill.intensity = 0.12; R.lampL.intensity = 11;
  // a warm table lamp at the sofa's left end, so faces on the sofa stay lit between flashes
  const sideT = new THREE.MeshStandardMaterial({ map: woodTex('#6a4228', '#33200f', 95), roughness: 0.4 });
  box(sc, 0.7, 0.08, 0.7, -2.15, 1.25, 4.9, sideT, 0.02); [[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].forEach(([x, z]) => box(sc, 0.05, 1.2, 0.05, -2.15 + x, 0.6, 4.9 + z, sideT, 0.01));
  const tl = new THREE.Group(); tl.position.set(-2.15, 1.29, 4.9); sc.add(tl);
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0x2f6f6a, roughness: 0.2, clearcoat: 1 })); base.position.y = 0.17; base.scale.y = 1.1; tl.add(base);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.32, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff0d8, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(1.0, 0.62, 0.3), emissiveIntensity: 1.6 })); sh.position.y = 0.6; tl.add(sh);
  const tlL = new THREE.PointLight(0xffc48a, 5.5, 6, 2); tlL.position.set(-2.1, 2.0, 4.75); sc.add(tlL); R.tableLamp = tlL;
  const warmFill = new THREE.PointLight(0xffc890, 7, 10, 1.6); warmFill.position.set(1.7, 3.5, 3.0); sc.add(warmFill); R.warmFill = warmFill;
  // glass with raindrops in the window, a tree and rain outside, lightning in the sky
  const wx = -3.7, wc = V(wx, 3.1, 0.8), ww = 4.2, wh = 3.3;
  const glass = rainGlass(ww, wh, 5); glass.position.set(wx + 0.02, wc.y, wc.z); glass.rotation.y = Math.PI / 2; sc.add(glass); R.glass = glass;
  const tree = stormTree(3); tree.position.set(-8.2, -0.6, 2.4); sc.add(tree); const tree2 = stormTree(7); tree2.position.set(-9.5, -0.6, -2.2); tree2.scale.setScalar(0.85); sc.add(tree2);
  const rain = rainBox(sc, V(-10.4, -0.5, -4.5), V(-3.95, 8, 6.5), 900, { seed: 7 });
  const bolts = [makeBolt(11, V(-10.6, 9.5, -2.0), V(-10.4, 0.2, 1.4), { jag: 1.1, width: 0.05 }), makeBolt(23, V(-10.6, 9.5, 3.5), V(-10.4, 0.5, 0.6), { jag: 1.0, width: 0.045 })];
  bolts.forEach(b => sc.add(b));
  const flashL = new THREE.DirectionalLight(0xc8d4ff, 0); flashL.position.set(-12, 7, 0.8); flashL.target.position.set(0.5, 1, 3); sc.add(flashL, flashL.target); R.flashL = flashL;
  R.storm = storm; R.strikes = strikes;
  R.flash = (t) => flashAt(t, R.strikes) * (R.storm > 0.5 ? 1 : 0);
  R.update = (t) => {
    const f = R.flash(t), wet = R.storm > 0.5 ? 1 : 0;
    R.sky.material.color.setScalar(0.75 + 3.2 * f); flashL.intensity = 7.5 * f * (R.flashScale ?? 1); R.key.intensity = 0.25 + 0.6 * f;
    const bi = R.strikes.reduce((a, t0, i) => (t >= t0 ? i : a), 0); bolts.forEach((b, i) => b.userData.set(i === bi % 2 ? f : 0));
    tree.userData.sway(t); tree2.userData.sway(t + 3); rain.mesh.visible = !!wet; if (wet) rain(t, f);
    glass.visible = !!wet; if (wet) glass.userData.draw(t, f);
  };
  return R;
}
// a wall barometer: brass rim, glass, a dial from FAIR to STORMY and a needle; set(k) 0 = fair, 1 = stormy
function barometer() {
  const g = new THREE.Group(), brass = new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 1, roughness: 0.28 });
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 48), new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.5 })); back.rotation.x = Math.PI / 2; g.add(back);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 14, 64), brass); rim.position.z = 0.04; g.add(rim);
  const dial = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#f4ead4'; c.beginPath(); c.arc(256, 256, 256, 0, 7); c.fill(); c.strokeStyle = '#2a2018'; c.lineWidth = 3; c.beginPath(); c.arc(256, 256, 200, Math.PI * 0.75, Math.PI * 2.25); c.stroke();
    for (let i = 0; i <= 40; i++) { const a = Math.PI * 0.75 + i / 40 * Math.PI * 1.5, l = i % 5 ? 14 : 28; c.lineWidth = i % 5 ? 2 : 4; c.beginPath(); c.moveTo(256 + Math.cos(a) * 200, 256 + Math.sin(a) * 200); c.lineTo(256 + Math.cos(a) * (200 - l), 256 + Math.sin(a) * (200 - l)); c.stroke(); }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    [['STORMY', 0.08, '#b8352a'], ['RAIN', 0.3, '#2a2018'], ['CHANGE', 0.5, '#2a2018'], ['FAIR', 0.7, '#2a2018'], ['DRY', 0.92, '#2a2018']].forEach(([s, k, col]) => { const a = Math.PI * 0.75 + k * Math.PI * 1.5; c.save(); c.translate(256 + Math.cos(a) * 140, 256 + Math.sin(a) * 140); c.rotate(a + Math.PI / 2); c.fillStyle = col; c.font = `bold ${s === 'STORMY' ? 38 : 34}px Georgia, serif`; c.fillText(s, 0, 0); c.restore(); });
    c.fillStyle = '#6a5a48'; c.font = 'italic 22px Georgia, serif'; c.fillText('Barometer', 256, 330);
  });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.31, 64), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.7 })); face.position.z = 0.032; g.add(face);
  const nd = new THREE.Group(); nd.position.z = 0.045; g.add(nd);
  const nm = new THREE.MeshStandardMaterial({ color: 0x15120f, metalness: 0.5, roughness: 0.4 });
  const nb = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.27, 0.004), nm); nb.position.y = 0.11; nd.add(nb);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 3), nm); tip.position.y = 0.26; nd.add(tip);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 16), brass); hub.rotation.x = Math.PI / 2; hub.position.z = 0.05; g.add(hub);
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.31, 48, 16, 0, Math.PI * 2, 0, 0.35), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.12, clearcoat: 1, envMapIntensity: 2 })); gl.rotation.x = Math.PI / 2; gl.position.z = -0.24; g.add(gl);
  // needle angle: dial position k (0 = STORMY end, 1 = DRY end) -> rotation; the canvas runs clockwise from 135°
  const ang = (k) => -(Math.PI * 0.75 + k * Math.PI * 1.5) - Math.PI / 2;
  g.userData.set = (k) => { nd.rotation.z = ang(lerp(0.66, 0.1, k)); };
  g.userData.set(0); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
// glowing charge signs (+ / −)
function chargeSign(plus = true, s = 0.3) {
  const t = canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 62); const col = plus ? '255,150,90' : '120,190,255'; gr.addColorStop(0, `rgba(${col},0.7)`); gr.addColorStop(0.5, `rgba(${col},0.3)`); gr.addColorStop(1, `rgba(${col},0)`); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); c.fillStyle = '#ffffff'; c.fillRect(30, 56, 68, 16); if (plus) c.fillRect(56, 30, 16, 68); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.userData.dofMap = t; return m;
}
// a big storm cloud from many soft lumps; lit from inside by flashes
function stormCloud(seed = 5, w = 9, h = 2.4, d = 4) {
  const g = new THREE.Group(), r = rng(seed), m = new THREE.MeshStandardMaterial({ color: 0x3e4558, roughness: 1, emissive: new THREE.Color(0x6a7aa8), emissiveIntensity: 0 });
  const lump = (rad, sd) => { const geo = new THREE.IcosahedronGeometry(rad, 5), p = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = fbm(v.x * 0.9 + sd, v.y * 0.9, v.z * 0.9); v.multiplyScalar(1 + 0.2 * n); if (v.y < -rad * 0.35) v.y = -rad * 0.35 + (v.y + rad * 0.35) * 0.25; p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); return geo; };
  for (let i = 0; i < 70; i++) { const s = new THREE.Mesh(lump(0.6 + r() * 1.0, i * 3.1), m); const x = (r() - 0.5) * w, y = (r() - 0.25) * h * (1 - Math.abs(x) / w), z = (r() - 0.5) * d; s.position.set(x, y, z); s.scale.set(1.2, 0.8, 1.1); g.add(s); }
  g.userData.mat = m; return g;
}
// static: tiny sparks that flicker on a set of world points
function sparkField(sc, n = 40, seed = 9) {
  const r = rng(seed), segs = 4, pos = new Float32Array(n * segs * 2 * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lm = new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 2.2, 3.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const lines = new THREE.LineSegments(geo, lm); lines.frustumCulled = false; lines.userData.noDof = true; sc.add(lines);
  const gt = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(220,235,255,1)'); gr.addColorStop(0.3, 'rgba(120,170,255,0.5)'); gr.addColorStop(1, 'rgba(60,110,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
  const glows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), n); glows.frustumCulled = false; sc.add(glows);
  const o = new THREE.Object3D(), seeds = []; for (let i = 0; i < n; i++) seeds.push([r(), r(), r(), r() * 100]);
  // pts(i) -> world point and outward normal for spark i; cam for billboarding; k = how much static (0..1)
  return (t, pts, cam, k, size = 0.05) => {
    let w = 0;
    for (let i = 0; i < n; i++) {
      const [a, b, c, s] = seeds[i], ph = Math.floor(t * 24 + s), on = h3(i, ph, 3) < 0.42 * k ? 1 : 0, P = pts(i, ph);
      for (let j = 0; j < segs; j++) {
        const q0 = P.p.clone().addScaledVector(P.n, size * 0.6 * j / segs).add(V(h3(i, ph, j) - 0.5, h3(i, ph, j + 9) - 0.5, h3(i, ph, j + 19) - 0.5).multiplyScalar(size * 0.7 * on)),
          q1 = P.p.clone().addScaledVector(P.n, size * 0.6 * (j + 1) / segs).add(V(h3(i, ph, j + 1) - 0.5, h3(i, ph, j + 10) - 0.5, h3(i, ph, j + 20) - 0.5).multiplyScalar(size * 0.7 * on));
        if (!on) { q0.copy(P.p); q1.copy(P.p); }
        pos.set(q0.toArray(), w); pos.set(q1.toArray(), w + 3); w += 6;
      }
      o.position.copy(P.p); o.quaternion.copy(cam.quaternion); o.scale.setScalar(on ? size * (1.6 + 1.2 * h3(i, ph, 7)) : 0.0001); o.updateMatrix(); glows.setMatrixAt(i, o.matrix);
    }
    geo.attributes.position.needsUpdate = true; glows.instanceMatrix.needsUpdate = true;
  };
}
// a crackling arc between two points (rebuilt every frame)
function sparkArc(sc) {
  const core = hdr(3.2, 4.2, 7, { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), halo = hdr(0.4, 0.6, 1.6, { transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  const a = new THREE.Mesh(new THREE.BufferGeometry(), core), b = new THREE.Mesh(new THREE.BufferGeometry(), halo); a.userData.noDof = b.userData.noDof = true; sc.add(a, b);
  const pl = new THREE.PointLight(0x9fc4ff, 0, 3, 2); sc.add(pl);
  return (p, q, k, seed) => {
    a.visible = b.visible = k > 0.02; pl.intensity = 2.2 * k; pl.position.copy(p).lerp(q, 0.5); if (!a.visible) return;
    const P = jagPath(seed, p, q, 9, p.distanceTo(q) * 0.45), c = new Poly(P);
    a.geometry.dispose(); b.geometry.dispose(); a.geometry = new THREE.TubeGeometry(c, 54, 0.006, 5, false); b.geometry = new THREE.TubeGeometry(c, 54, 0.03, 6, false);
    core.color.setRGB(3.2 * k, 4.2 * k, 7 * k); halo.opacity = 0.6 * Math.min(1, k);
  };
}
// fur that stands on end: scales shell length and drops the comb (k = 0..1)
function furPuff(obj, k) { obj.traverse(o => { const U = o.material && o.material.userData && o.material.userData.U; if (U && U.len0 !== undefined) { U.uLen.value = U.len0 * (1 + 0.9 * k); U.uComb.value.copy(U.comb0).multiplyScalar(1 - 0.9 * k); } }); }
// a walk cycle for the dog in the stand pose (feet planted, diagonal sequence). s = distance walked (dog units)
function walkLegs(u, s, { stride = 0.95, lift = 0.2 } = {}) {
  const ph = { 'h-1': 0.5, 'h1': 0.0, 'f1': 0.25, 'f-1': 0.75 };
  u.legs.forEach(L => {
    const c = (s / stride + ph[(L.front ? 'f' : 'h') + L.sx]) % 1, base = L.T.clone();
    let z, y = 0, pitch = 0;
    if (c < 0.6) z = stride * (0.5 - c / 0.6); else { const w = (c - 0.6) / 0.4; z = -stride / 2 + stride * E.io(w); y = lift * Math.sin(Math.PI * w); pitch = -0.6 * Math.sin(Math.PI * w); }
    u.paw(u.legs.indexOf(L), base.add(V(0, y, z)), pitch);
  });
  u.solve();
}
// a tucked tail (scared): sit or stand
function tuckTail(u, stand = 0, t = 0) {
  const c = u.cfg.tail, b = V(c[0], c[1], c[2]), w = 0.03 * Math.sin(t * 9);
  if (stand > 0.5) u.tail([b, b.clone().add(V(w, -0.25, -0.06)), b.clone().add(V(w, -0.52, 0.02)), b.clone().add(V(w, -0.72, 0.2)), b.clone().add(V(w, -0.82, 0.38))]);
  else u.tail([b, b.clone().add(V(0.03, -0.14, -0.1)), b.clone().add(V(0.12 + w, -0.26, 0.06)), b.clone().add(V(0.24, -0.29, 0.3)), b.clone().add(V(0.3, -0.29, 0.52))]);
}

// ---------- the bathroom ----------
function tileTex({ n = 8, brick = false, cols = ['#f3f5f4'], grout = '#b8bfc2', seed = 3, rep = [2, 2] } = {}) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = grout; g.fillRect(0, 0, w, h); const r = rng(seed), sx = w / n, sy = brick ? sx / 2 : sx;
    for (let j = 0; j < h / sy; j++) for (let i = -1; i < n + 1; i++) { const x = i * sx + (brick && j % 2 ? sx / 2 : 0), y = j * sy; g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x + 3, y + 3, sx - 6, sy - 6); const gr = g.createLinearGradient(x, y, x, y + sy); gr.addColorStop(0, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0.06)'); g.fillStyle = gr; g.fillRect(x + 3, y + 3, sx - 6, sy - 6); }
    noiseFill(g, w, h, seed, 8);
  }, { rep });
}
function makeTub() {
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0xf6f7f4, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 });
  const L = 3.3, Wd = 1.55, Hh = 1.05, th = 0.13, parts = [];
  const part = (w, h, d, x, y, z, r = 0.05) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); parts.push(b); return b; };
  part(L, 0.2, Wd, 0, 0.1, 0, 0.05);
  part(L, Hh, th, 0, Hh / 2, Wd / 2 - th / 2, 0.06); part(L, Hh, th, 0, Hh / 2, -Wd / 2 + th / 2, 0.06);
  part(th, Hh, Wd, L / 2 - th / 2, Hh / 2, 0, 0.06); part(th, Hh, Wd, -L / 2 + th / 2, Hh / 2, 0, 0.06);
  // a rolled rim along the front
  const rim = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, L - 0.15, 8, 24), m); rim.rotation.z = Math.PI / 2; rim.position.set(0, Hh, Wd / 2 - th / 2); rim.castShadow = true; g.add(rim); parts.push(rim);
  const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 28), M.chrome); drain.position.set(-L / 2 + 0.45, 0.205, 0); g.add(drain);
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.012), M.black); s.position.set(drain.position.x, 0.213, -0.035 + i * 0.014); g.add(s); }
  const spout = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 12, 24, Math.PI), M.chrome); spout.position.set(-L / 2 + 0.12, Hh + 0.17, 0); spout.rotation.set(0, Math.PI / 2, 0); g.add(spout);
  [-0.3, 0.3].forEach(z => { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 6), M.chrome); k.position.set(-L / 2 + 0.07, Hh + 0.08, z); g.add(k); const c = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshStandardMaterial({ color: z < 0 ? 0x3a7ad8 : 0xd84a3a })); c.position.set(-L / 2 + 0.07, Hh + 0.15, z); g.add(c); });
  g.userData = { L, Wd, Hh, mat: m, parts, drain };
  return g;
}
function bathroom(sc, { strikes = [] } = {}) {
  sc.background = new THREE.Color(0x0c0d10); sc.environment = MENV; const R = { strikes };
  const fT = tileTex({ n: 6, cols: ['#6f8f96', '#668890', '#78979c'], grout: '#d8dcd8', seed: 4, rep: [4, 4] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: fT, bumpMap: fT, bumpScale: 0.8, roughness: 0.25 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 2); floor.receiveShadow = true; sc.add(floor); R.floor = floor;
  const wT = tileTex({ n: 6, brick: true, seed: 6, rep: [3, 2] });
  const wallM = new THREE.MeshStandardMaterial({ map: wT, bumpMap: wT, bumpScale: 0.7, roughness: 0.18 }), paintM = new THREE.MeshLambertMaterial({ color: 0xe8e2d6, bumpMap: PLASTER, bumpScale: 0.4 });
  const wall = (w, h, x, y, z, ry, m) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry; p.receiveShadow = true; sc.add(p); return p; };
  wall(9, 2.6, 1.4, 1.3, -1.0, 0, wallM); wall(9, 4.4, 1.4, 4.8, -1.0, 0, paintM); wall(6, 2.6, -1.75, 1.3, 2.0, Math.PI / 2, wallM); wall(6, 4.4, -1.75, 4.8, 2.0, Math.PI / 2, paintM); wall(6, 7, 5.6, 3.5, 2.0, -Math.PI / 2, paintM);
  const trim = new THREE.MeshStandardMaterial({ color: 0x2f6f6a, roughness: 0.4 }); box(sc, 9, 0.1, 0.06, 1.4, 2.62, -0.97, trim, 0.02, false); box(sc, 0.06, 0.1, 6, -1.72, 2.62, 2.0, trim, 0.02, false);
  const tub = makeTub(); tub.position.set(-0.05, 0, -0.2); sc.add(tub); R.tub = tub;
  // a frosted window above the tub: it flashes with the lightning
  const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.12, 0.18) }); const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), winM); win.position.set(0.7, 3.75, -0.98); sc.add(win);
  const wf = new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.45 }); box(sc, 1.45, 0.08, 0.1, 0.7, 4.32, -0.95, wf, 0.02); box(sc, 1.45, 0.08, 0.1, 0.7, 3.18, -0.95, wf, 0.02); box(sc, 0.08, 1.2, 0.1, 0.0, 3.75, -0.95, wf, 0.02); box(sc, 0.08, 1.2, 0.1, 1.4, 3.75, -0.95, wf, 0.02); box(sc, 0.06, 1.1, 0.08, 0.7, 3.75, -0.95, wf, 0.01);
  // shower curtain bunched at the tap end, on a chrome rod
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.5, 10), M.chrome); rod.rotation.z = Math.PI / 2; rod.position.set(-0.05, 4.55, 0.5); sc.add(rod);
  const cT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#e8f1ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#7fb8b0'; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(i * 32 + (j % 2) * 16 + 8, j * 32 + 8, 5, 0, 7); c.fill(); } }, { rep: [2, 6] });
  const cg = new THREE.PlaneGeometry(1.1, 3.5, 60, 10), cp = cg.attributes.position; for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i); cp.setZ(i, 0.09 * Math.sin((x + 0.55) * 31) * (0.8 + 0.2 * (y / 1.75))); } cg.computeVertexNormals();
  const curtain = new THREE.Mesh(cg, new THREE.MeshLambertMaterial({ map: cT, side: THREE.DoubleSide })); curtain.position.set(-1.05, 2.78, 0.5); curtain.castShadow = true; sc.add(curtain);
  // bath mat, towel rail with a towel, a little rubber duck on the rim
  const matT = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#e9a75a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f6e3c4'; c.lineWidth = 6; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(i * 24, 0); c.lineTo(i * 24, h); c.stroke(); } noiseFill(c, w, h, 3, 30); });
  const mat = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.04, 0.9, 2, 0.02), new THREE.MeshLambertMaterial({ map: matT, bumpMap: WEAVE, bumpScale: 3 })); mat.position.set(0.3, 0.02, 1.3); mat.receiveShadow = true; sc.add(mat);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 10), M.chrome); rail.rotation.x = Math.PI / 2; rail.position.set(5.5, 2.4, 1.6); sc.add(rail);
  box(sc, 0.12, 1.4, 1.2, 5.45, 1.75, 1.6, new THREE.MeshLambertMaterial({ color: 0xd8604a, bumpMap: WEAVE, bumpScale: 2.5 }), 0.05);
  const duck = toyDuck(1); duck.scale.setScalar(0.9); duck.position.set(1.35, 1.12, 0.45); duck.rotation.y = -0.6; sc.add(duck); R.duck = duck;
  // light: a warm vanity light off to the right, a cool flash through the window
  sc.add(new THREE.HemisphereLight(0xc8ccd8, 0x6a5a4a, 0.55));
  const warm = new THREE.PointLight(0xffd2a0, 16, 12, 2); warm.position.set(4.2, 4.6, 2.2); warm.castShadow = true; warm.shadow.mapSize.set(1024, 1024); warm.shadow.bias = -0.002; warm.userData.soft = 0.25; sc.add(warm); R.warm = warm;
  const bfill = new THREE.PointLight(0xffd8b0, 6, 9, 1.6); bfill.position.set(0.9, 2.6, 3.4); sc.add(bfill); R.bfill = bfill;
  const fl = new THREE.DirectionalLight(0xc8d4ff, 0); fl.position.set(0.9, 7, -6); fl.target.position.set(0, 0.5, 0.2); sc.add(fl, fl.target);
  R.flash = (t) => flashAt(t, R.strikes);
  R.update = (t) => { const f = R.flash(t); winM.color.setRGB(0.1 + 2.2 * f, 0.12 + 2.4 * f, 0.18 + 2.8 * f); fl.intensity = 3.2 * f; };
  return R;
}
// a seated person on the sofa holding an open book
function makeBook() {
  const g = new THREE.Group(), cover = new THREE.MeshStandardMaterial({ color: 0x2f5f8f, roughness: 0.6 }), pg = new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.9 });
  [-1, 1].forEach(s => { const half = new THREE.Group(); half.rotation.z = s * 0.22; g.add(half); const c = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.58), cover); c.position.x = s * 0.21; half.add(c); const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.55), pg); p.position.set(s * 0.2, 0.03, 0); half.add(p); });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
