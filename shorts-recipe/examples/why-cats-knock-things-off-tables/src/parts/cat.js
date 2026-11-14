// =====================================================================
// THE CAT: four IK legs, three body poses that blend (sit / crouch / stand),
// a head that can hold eye contact, pupils that open from slits to circles
// =====================================================================
function solve2(S, T, pole, l1, l2) {
  const D = T.clone().sub(S); const d = clamp(D.length(), Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.999); const dir = D.normalize();
  const a1 = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const pp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))); if (pp.lengthSq() < 1e-8) pp.set(0, 0, 1); pp.normalize();
  const El = S.clone().add(dir.clone().multiplyScalar(Math.cos(a1)).add(pp.multiplyScalar(Math.sin(a1))).multiplyScalar(l1));
  const u1 = El.clone().sub(S).normalize(), u2 = S.clone().add(dir.multiplyScalar(d)).sub(El).normalize(), down = V(0, -1, 0);
  return { q1: new THREE.Quaternion().setFromUnitVectors(down, u1), q2: new THREE.Quaternion().setFromUnitVectors(down, u2) };
}
function catEyeMat(irisA = 0xf4ff8c, irisB = 0x6aa828) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
  const U = { uP: { value: 0.15 }, uGlow: { value: 0.0 }, uA: { value: new THREE.Color(irisA) }, uB: { value: new THREE.Color(irisB) } };
  m.userData.U = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = normalize(position);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; uniform float uP; uniform float uGlow; uniform vec3 uA; uniform vec3 uB;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 en = normalize(vOP); vec2 eq = en.xy / 0.8; float er = length(eq); float eang = atan(eq.y, eq.x);
        float streak = 0.5 + 0.5 * sin(eang * 36.0 + sin(eang * 7.0) * 2.0);
        vec3 iris = mix(uA, uB, smoothstep(0.1, 0.95, er)) * (0.82 + 0.3 * streak * smoothstep(0.2, 0.9, er));
        iris = mix(iris, vec3(0.03, 0.05, 0.01), smoothstep(0.84, 1.0, er));
        vec2 pq = eq / vec2(mix(0.085, 0.74, uP), mix(0.78, 0.76, uP)); float pm = 1.0 - smoothstep(0.9, 1.08, length(pq));
        vec3 ec = mix(iris, vec3(0.004), pm);
        ec = mix(ec, vec3(0.05, 0.045, 0.03), smoothstep(1.0, 1.05, er));
        ec = mix(vec3(0.05, 0.045, 0.03), ec, step(0.0, en.z));
        diffuseColor.rgb = ec; float irisMask = (1.0 - pm) * (1.0 - smoothstep(0.84, 1.0, er)) * step(0.0, en.z);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += iris * irisMask * (0.1 + uGlow);');
  };
  return m;
}
// shell fur: thin layers of fine strands pushed out along the normal and combed over,
// each layer sparser than the last. Lambert shading keeps the layers cheap.
function furShellMat(src, h, len, freq, comb, short) {
  const m = new THREE.MeshLambertMaterial({ map: src.map, color: src.color, transparent: true, depthWrite: false });
  const U = { uH: { value: h }, uLen: { value: len }, uFreq: { value: freq }, uComb: { value: comb }, uShort: { value: short } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uH; uniform float uLen; uniform vec3 uComb; uniform vec4 uShort; varying vec3 vBP;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBP = position; vec3 fnn = normalize(normal);
        float lenK = uShort.w > 0.0 ? mix(0.16, 1.0, smoothstep(uShort.w * 0.55, uShort.w, distance(position, uShort.xyz))) : 1.0;
        vec3 cmb = uComb - fnn * dot(uComb, fnn);
        transformed += (fnn * uH + cmb * 1.15 * uH * uH) * uLen * lenK;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uH; uniform float uFreq; varying vec3 vBP;
      float fh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float fvn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(fh(i), fh(i + vec3(1,0,0)), f.x), mix(fh(i + vec3(0,1,0)), fh(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(fh(i + vec3(0,0,1)), fh(i + vec3(1,0,1)), f.x), mix(fh(i + vec3(0,1,1)), fh(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <map_fragment>', `vec3 fp = vBP * uFreq; fp = vec3(fp.x * 0.8 + fp.z * 0.6, fp.y, fp.z * 0.8 - fp.x * 0.6);
        float strand = fvn(fp) * 0.62 + fvn(fp * 2.3 + 7.0) * 0.38;
        float fa = smoothstep(0.3 + 0.36 * uH, 0.5 + 0.36 * uH, strand) * (1.0 - 0.3 * uH);
        if (fa < 0.03) discard;
        #include <map_fragment>
        diffuseColor.rgb *= mix(0.93, 1.07, uH) * (0.96 + 0.08 * strand); diffuseColor.a *= fa;`);
  };
  return m;
}
const FUR_LAYERS = +(new URLSearchParams(location.search).get('fur') ?? 6);
function addFur(mesh, lenW = 0.07, { freq = 150, comb = V(0, -1, 0), short = new THREE.Vector4(0, 0, 0, 0) } = {}) {
  const s = (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3 || 1; const shells = [];
  for (let i = 0; i < FUR_LAYERS; i++) { const sh = new THREE.Mesh(mesh.geometry, furShellMat(mesh.material, (i + 1) / FUR_LAYERS, lenW / s, freq * s, comb, short)); sh.castShadow = false; sh.receiveShadow = true; mesh.add(sh); shells.push(sh); }
  mesh.userData.shells = shells; return mesh;
}
const CATCFG = {
  //        x  y     z     sx    sy    sz    rx
  sit:    { hips: [0, 0.5, -0.28, 0.6, 0.52, 0.72, 0], torso: [0, 1.0, -0.06, 0.5, 0.82, 0.56, 0.22], bib: [0, 1.05, 0.24, 0.36, 0.47, 0.29, 0], neck: [0, 1.5, 0.08, 0.36, 0.34, 0.36, 0], head: [0, 1.84, 0.12], sh: [0.2, 1.08, 0.26], hj: [0.3, 0.5, -0.3], th: [0.38, 0.44, -0.12, 0.37, 0.44, 0.52, 0], tail: [0, 0.3, -0.92], fp: [0.17, 0.03, 0.4], hp: [0.41, 0.03, 0.14] },
  crouch: { hips: [0, 0.52, -0.55, 0.56, 0.46, 0.6, 0], torso: [0, 0.52, 0.0, 0.5, 0.74, 0.48, 1.45], bib: [0, 0.42, 0.44, 0.34, 0.3, 0.3, 0], neck: [0, 0.62, 0.52, 0.34, 0.3, 0.36, 0], head: [0, 0.8, 0.8], sh: [0.22, 0.62, 0.42], hj: [0.3, 0.52, -0.55], th: [0.36, 0.42, -0.5, 0.32, 0.38, 0.44, 0], tail: [0, 0.5, -1.12], fp: [0.2, 0.03, 0.92], hp: [0.36, 0.03, -0.3] },
  stand:  { hips: [0, 1.0, -0.5, 0.5, 0.44, 0.55, 0], torso: [0, 1.0, -0.02, 0.46, 0.74, 0.46, 1.5], bib: [0, 0.9, 0.44, 0.33, 0.34, 0.3, 0], neck: [0, 1.15, 0.52, 0.32, 0.3, 0.34, 0], head: [0, 1.46, 0.74], sh: [0.2, 0.98, 0.38], hj: [0.24, 0.98, -0.52], th: [0.25, 0.82, -0.5, 0.24, 0.36, 0.3, 0], tail: [0, 1.12, -1.02], fp: [0.2, 0.03, 0.4], hp: [0.24, 0.03, -0.52] },
};
function makeCat2({ base = '#e58a3a', stripe = '#a24e18', seed = 1, xray = false } = {}) {
  const X = xray ? XM() : null;
  const fur = X || furMat(base, stripe, seed, true), white = X || WHITE_FUR(), pink = X || PINK, dark = X || DARK;
  const furLeg = X || furMat(base, stripe, seed + 3, false);
  if (!X) { fur.sheenRoughness = 0.35; fur.bumpScale = 1.6; white.sheenRoughness = 0.35; furLeg.sheenRoughness = 0.35; }
  const F = (m, len, o) => X ? m : addFur(m, len, o);
  const cat = new THREE.Group();
  const add = (m, p, parent = cat) => { if (!X) { m.castShadow = true; m.receiveShadow = true; } if (p) m.position.copy(p); parent.add(m); return m; };
  const sph = (r, mat, seg = 40) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.66)), mat);
  const hips = add(sph(1, fur, 48)), torso = add(sph(1, fur, 56)), bib = add(sph(1, white, 40)), neck = add(sph(1, fur, 32));
  const thighs = [-1, 1].map(() => add(sph(1, fur, 36)));
  if (!X) { [hips, torso, neck, ...thighs].forEach(m => { m.scale.setScalar(0.55); addFur(m, 0.075, { comb: V(0, -1, -0.25).normalize() }); }); bib.scale.setScalar(0.38); addFur(bib, 0.09, { comb: V(0, -1, 0.15).normalize() }); }
  // ---- legs: 0 front-left (-x), 1 front-right (+x), 2 hind-left, 3 hind-right
  const mkLeg = (front, sx) => {
    const l1 = front ? 0.56 : 0.52, l2 = front ? 0.52 : 0.5;
    const up = new THREE.Group(); cat.add(up);
    F(add(new THREE.Mesh(new THREE.CapsuleGeometry(front ? 0.15 : 0.165, l1 - 0.1, 8, 24), furLeg), V(0, -l1 / 2, 0), up), 0.05);
    const lo = new THREE.Group(); lo.position.set(0, -l1, 0); up.add(lo);
    F(add(new THREE.Mesh(new THREE.CapsuleGeometry(front ? 0.128 : 0.115, l2 - 0.06, 8, 24), furLeg), V(0, -l2 / 2, 0), lo), 0.04);
    const paw = new THREE.Group(); paw.position.set(0, -l2, 0); lo.add(paw);
    const pmesh = add(sph(1, white, 28), V(0, 0.055, 0.045), paw); pmesh.scale.set(0.15, 0.1, 0.19); F(pmesh, 0.022, { freq: 200, comb: V(0, -0.3, 1).normalize() });
    [-1.5, -0.5, 0.5, 1.5].forEach(k => add(sph(0.052, white, 16), V(k * 0.058, 0.03, 0.2 - Math.abs(k) * 0.022), paw).scale.set(1, 0.85, 1.25));
    add(sph(1, pink, 20), V(0, -0.028, 0.03), paw).scale.set(0.078, 0.022, 0.066);
    [-1.5, -0.5, 0.5, 1.5].forEach(k => add(sph(1, pink, 12), V(k * 0.056, -0.012, 0.185 - Math.abs(k) * 0.022), paw).scale.set(0.03, 0.02, 0.038));
    return { up, lo, paw, l1, l2, front, sx, T: V(0, 0, 0), pitch: 0 };
  };
  const legs = [mkLeg(true, -1), mkLeg(true, 1), mkLeg(false, -1), mkLeg(false, 1)];
  // ---- head
  const head = new THREE.Group(); head.rotation.order = 'YXZ'; cat.add(head);
  F(add(sph(0.55, fur, 56), null, head), 0.065, { comb: V(0, -0.45, -0.9).normalize(), short: new THREE.Vector4(0, 0.0, 0.52, 0.5) }).scale.set(1.15, 0.95, 1.0);
  [-1, 1].forEach(sx => F(add(sph(0.22, fur, 32), V(sx * 0.35, -0.2, 0.16), head), 0.075, { comb: V(sx * 0.7, -0.7, -0.2).normalize() }).scale.set(1, 0.7, 0.9));
  [-1, 1].forEach(sx => F(add(sph(0.2, white), V(sx * 0.13, -0.16, 0.42), head), 0.016, { freq: 220, comb: V(sx * 0.8, -0.6, 0).normalize() }).scale.set(1, 0.85, 0.9));
  F(add(sph(0.12, white), V(0, -0.3, 0.38), head), 0.02, { freq: 220 });
  add(sph(1, pink, 24), V(0, -0.05, 0.57), head).scale.set(0.075, 0.05, 0.05);
  [-1, 1].forEach(sx => { const m = add(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 8, 20, Math.PI), dark), V(sx * 0.055, -0.13, 0.602), head); m.rotation.z = Math.PI; });
  const eyeM = X || catEyeMat(); const eyes = [], lids = [], lows = [], ears = [], wh = [], glints = [];
  [-1, 1].forEach(sx => {
    const EP = V(sx * 0.22, 0.08, 0.42);
    const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 48, 32), eyeM), EP, head); e.rotation.order = 'YXZ'; e.rotation.y = sx * 0.18; e.userData.ry = sx * 0.18; e.castShadow = false; eyes.push(e);
    const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.0105, 8, 36), dark), EP.clone().add(V(sx * 0.018, 0, 0.098)), head); rim.rotation.y = sx * 0.18; rim.castShadow = false;
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); gl.position.set(sx * 0.22 - 0.04, 0.135, 0.553); head.add(gl); glints.push(gl); gl.visible = !X;
    const lid = add(new THREE.Mesh(new THREE.SphereGeometry(0.149, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), furLeg), EP, head); lid.rotation.y = sx * 0.18; lid.rotation.order = 'YXZ'; lids.push(lid); F(lid, 0.018, { freq: 230, comb: V(0, -1, 0.3).normalize() });
    const lash = new THREE.Mesh(new THREE.TorusGeometry(0.151, 0.009, 6, 30, Math.PI), dark); lash.rotation.x = Math.PI / 2; lid.add(lash);
    const low = add(new THREE.Mesh(new THREE.SphereGeometry(0.147, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), furLeg), EP, head); low.rotation.order = 'YXZ'; low.rotation.y = sx * 0.18; lows.push(low); F(low, 0.015, { freq: 230 });
    const ear = new THREE.Group(); ear.position.set(sx * 0.34, 0.38, -0.06); head.add(ear);
    F(add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 32), fur), V(0, 0.2, 0), ear), 0.025, { freq: 200, comb: V(0, 1, 0) }).scale.z = 0.5;
    add(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.31, 32), pink), V(0, 0.15, 0.047), ear).scale.z = 0.35;
    [-1, 1].forEach(k => { const tf = add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 8), white), V(k * 0.05, 0.1, 0.07), ear); tf.rotation.z = -k * 0.3; tf.castShadow = false; });
    ears.push(ear);
    const wg = new THREE.Group(); wg.position.set(sx * 0.2, -0.17, 0.47); head.add(wg); wh.push(wg);
    for (let k = 0; k < 4; k++) { const g = new THREE.CylinderGeometry(0.0025, 0.007, 0.6 - k * 0.04, 6); g.translate(0, (0.6 - k * 0.04) / 2, 0); const w = new THREE.Mesh(g, X || new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6) })); w.rotation.z = -sx * (Math.PI / 2 + (k - 1.3) * 0.17); w.rotation.y = -sx * 0.12 * (k - 1.5); wg.add(w); }
    for (let k = 0; k < 2; k++) { const g = new THREE.CylinderGeometry(0.002, 0.005, 0.26, 6); g.translate(0, 0.13, 0); const w = new THREE.Mesh(g, X || new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.4) })); w.position.set(sx * (0.2 + k * 0.05), 0.24, 0.44); w.rotation.set(-0.5, 0, -sx * (0.25 + k * 0.3)); head.add(w); }
  });
  // ---- tail (rebuilt each frame)
  const tailM = new THREE.Mesh(new THREE.BufferGeometry(), fur); if (!X) { tailM.castShadow = true; addFur(tailM, 0.065, { comb: V(0, 0, 0) }); } cat.add(tailM);
  const tailTip = add(sph(0.056, fur, 16));
  const mix = (a, b, c, w) => a.map((v, i) => v * w.sit + b[i] * w.crouch + c[i] * w.stand);
  let cfg = null;
  const place = (m, a) => { m.position.set(a[0], a[1], a[2]); m.scale.set(a[3], a[4], a[5]); m.rotation.set(a[6] || 0, 0, 0); };
  const api = {
    head, eyes, lids, ears, legs, hips, torso, eyeM, fur,
    // body pose: weights for sit / crouch / stand (they should sum to 1)
    pose(w = { sit: 1, crouch: 0, stand: 0 }) {
      const W_ = { sit: w.sit || 0, crouch: w.crouch || 0, stand: w.stand || 0 }; cfg = {}; Object.keys(CATCFG.sit).forEach(k => cfg[k] = mix(CATCFG.sit[k], CATCFG.crouch[k], CATCFG.stand[k], W_));
      place(hips, cfg.hips); place(torso, cfg.torso); place(bib, cfg.bib); place(neck, cfg.neck);
      thighs.forEach((m, i) => { const sx = i ? 1 : -1; m.position.set(sx * cfg.th[0], cfg.th[1], cfg.th[2]); m.scale.set(cfg.th[3], cfg.th[4], cfg.th[5]); });
      head.position.set(cfg.head[0], cfg.head[1], cfg.head[2]); head.rotation.set(0, 0, 0);
      legs.forEach((L, i) => { const j = L.front ? cfg.sh : cfg.hj, p = L.front ? cfg.fp : cfg.hp; L.up.position.set(L.sx * j[0], j[1], j[2]); L.T.set(L.sx * p[0], p[1], p[2]); L.pitch = 0; });
      api.cfg = cfg; return api;
    },
    // override a paw target (cat-local); pitch tilts the paw (positive = toes down)
    paw(i, p, pitch = 0) { legs[i].T.copy(p); legs[i].pitch = pitch; return api; },
    solve() {
      legs.forEach(L => {
        const { q1, q2 } = solve2(L.up.position, L.T, L.front ? V(L.sx * 0.12, 0, -1) : V(L.sx * 0.35, 0, 1), L.l1, L.l2);
        L.up.quaternion.copy(q1); L.lo.quaternion.copy(q1.clone().invert().multiply(q2));
        L.paw.quaternion.copy(q2.clone().invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(L.pitch, 0, 0))));
      });
      return api;
    },
    // turn the head toward a world point (k blends, limits keep it natural); tilt rolls it
    look(target, k = 1, tilt = 0, maxYaw = 1.2, maxPitch = 0.7) {
      cat.updateMatrixWorld(true); const d = cat.worldToLocal(target.clone()).sub(head.position);
      const yaw = clamp(Math.atan2(d.x, d.z), -maxYaw, maxYaw), pitch = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -maxPitch, maxPitch);
      head.rotation.set(pitch * k, yaw * k, tilt); return api;
    },
    gaze(target) {
      cat.updateMatrixWorld(true);
      eyes.forEach(e => { const d = head.worldToLocal(target.clone()).sub(e.position); e.rotation.set(clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.35, 0.35), clamp(Math.atan2(d.x, d.z), e.userData.ry - 0.45, e.userData.ry + 0.45), 0); });
      return api;
    },
    gazeRest() { eyes.forEach(e => e.rotation.set(0, e.userData.ry, 0)); return api; },
    lid(k, low = 0) { lids.forEach(l => l.rotation.x = lerp(-0.8, 1.45, k)); lows.forEach(l => l.rotation.x = lerp(0.75, -0.55, low)); glints.forEach(g => g.visible = !X && k < 0.62); return api; },
    pupil(k) { if (!X) eyeM.userData.U.uP.value = k; return api; },
    glow(k) { if (!X) eyeM.userData.U.uGlow.value = k; return api; },
    ears(back = 0, swL = 0, swR = 0) { ears.forEach((e, i) => { const sx = i ? 1 : -1; e.rotation.set(-0.7 * back, (i ? swR : swL), -sx * (0.38 + 1.0 * back)); }); return api; },
    whisk(k) { wh.forEach((g, i) => g.rotation.y = -(i ? 1 : -1) * 0.55 * k); return api; },
    tail(pts) {
      const curve = new THREE.CatmullRomCurve3(pts); const TS = 48, RS = 12, geo = new THREE.TubeGeometry(curve, TS, 0.105, RS, false), p = geo.attributes.position;
      for (let j = 0; j <= TS; j++) { const c = curve.getPointAt(j / TS), f = 1 - 0.5 * j / TS; for (let k = 0; k <= RS; k++) { const idx = j * (RS + 1) + k; p.setXYZ(idx, c.x + (p.getX(idx) - c.x) * f, c.y + (p.getY(idx) - c.y) * f, c.z + (p.getZ(idx) - c.z) * f); } }
      geo.computeVertexNormals(); tailM.geometry.dispose(); tailM.geometry = geo; (tailM.userData.shells || []).forEach(sh => sh.geometry = geo); tailTip.position.copy(pts[pts.length - 1]); return api;
    },
    // a relaxed tail for the current pose; sw swishes the last third
    tailRest(t = 0, sw = 0.25, side = 1) {
      const b = V(cfg.tail[0], cfg.tail[1], cfg.tail[2]), s = Math.sin(t * 2.2) * sw, s2 = Math.sin(t * 2.2 - 1.0) * sw, up = cfg.tail[1] > 0.8 ? 1 : 0;
      if (up) return api.tail([b, b.clone().add(V(0.02, 0.25, -0.3)), b.clone().add(V(s * 0.2, 0.75, -0.42)), b.clone().add(V(s2 * 0.35, 1.2, -0.3)), b.clone().add(V(s2 * 0.5, 1.5, -0.05))]);
      return api.tail([b, b.clone().add(V(side * 0.3, -0.16, -0.16)), b.clone().add(V(side * 0.72, -0.2, 0.25 + s * 0.2)), b.clone().add(V(side * (0.86 + s * 0.25), -0.2, 0.85)), b.clone().add(V(side * (0.62 + s2 * 0.55), -0.18, 1.32))]);
    },
    breathe(t, amp = 0.02) { const k = Math.sin(t * 2 * Math.PI * 0.45); torso.scale.x *= 1 + amp * k; torso.scale.z *= 1 + amp * k; bib.scale.z *= 1 + amp * 1.5 * k; return api; },
    W(v) { cat.updateMatrixWorld(true); return cat.localToWorld(v.clone()); },
    eyeW() { cat.updateMatrixWorld(true); return head.localToWorld(V(0, 0.08, 0.5)); },
    pawW(i) { cat.updateMatrixWorld(true); return legs[i].paw.getWorldPosition(new THREE.Vector3()); },
  };
  cat.userData = api; api.pose().solve().lid(0.12).ears(0).whisk(0).tailRest(0);
  return cat;
}

// ---------- a small grey mouse ----------
function makeMouse() {
  const g = new THREE.Group(), fur = new THREE.MeshPhysicalMaterial({ color: 0xa59d95, roughness: 0.8, sheen: 1, sheenColor: new THREE.Color(0xe2dcd6), sheenRoughness: 0.4, bumpMap: FUR_BUMP, bumpScale: 1 });
  const pk = new THREE.MeshPhysicalMaterial({ color: 0xf2a6b0, roughness: 0.45, clearcoat: 0.3 });
  const add = (m, p, parent = g) => { m.castShadow = true; m.receiveShadow = true; if (p) m.position.copy(p); parent.add(m); return m; };
  const body = add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), fur), V(0, 0.15, 0)); body.scale.set(0.16, 0.15, 0.25);
  const hd = new THREE.Group(); hd.position.set(0, 0.16, 0.24); g.add(hd);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.115, 28, 20), fur), null, hd).scale.set(1, 0.92, 1.1);
  const sn = add(new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 20), fur), V(0, -0.015, 0.14), hd); sn.rotation.x = Math.PI / 2;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), pk), V(0, -0.012, 0.225), hd);
  [-1, 1].forEach(sx => {
    const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 14), fur), V(sx * 0.1, 0.11, -0.03), hd); e.scale.set(1, 1, 0.22); e.rotation.y = sx * 0.4;
    const ei = add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), pk), V(sx * 0.1, 0.11, -0.012), hd); ei.scale.set(1, 1, 0.2); ei.rotation.y = sx * 0.4;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.05, clearcoat: 1 })), V(sx * 0.062, 0.035, 0.085), hd);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); gl.position.set(sx * 0.066, 0.045, 0.104); hd.add(gl);
    for (let k = 0; k < 3; k++) { const c = new THREE.CylinderGeometry(0.001, 0.003, 0.14, 4); c.translate(0, 0.07, 0); const w = new THREE.Mesh(c, new THREE.MeshBasicMaterial({ color: 0xffffff })); w.position.set(sx * 0.03, -0.01, 0.2); w.rotation.z = -sx * (Math.PI / 2 + (k - 1) * 0.25); hd.add(w); }
    [0.14, -0.1].forEach(z => add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), pk), V(sx * 0.11, 0.025, z)).scale.set(1, 0.6, 1.5));
  });
  const tail = new THREE.Mesh(new THREE.BufferGeometry(), pk); tail.castShadow = true; g.add(tail);
  g.userData = {
    hd, body,
    update(t, run = 0, fear = 0) {
      const w = Math.sin(t * 30) * 0.12 * run + Math.sin(t * 2.3) * 0.06;
      const pts = [V(0, 0.1, -0.22), V(w * 0.3, 0.05, -0.42), V(w, 0.035 + 0.05 * run, -0.62), V(w * 1.6, 0.04 + 0.1 * run, -0.82)];
      tail.geometry.dispose(); tail.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.013, 6);
      body.scale.set(0.16 * (1 - 0.1 * run), 0.15 * (1 + 0.06 * Math.sin(t * 30) * run), 0.25 * (1 + 0.2 * run)); body.position.y = 0.15 + 0.012 * Math.abs(Math.sin(t * 30)) * run;
      hd.rotation.set(-0.1 * fear + 0.05 * Math.sin(t * 40) * fear, 0.1 * Math.sin(t * 3), 0); hd.position.y = 0.16 - 0.02 * fear;
    },
  };
  g.userData.update(0); return g;
}

// ---------- a tumbler of ice water that can slide, fall and shatter ----------
function makeGlass(sc, { h = 0.36, r = 0.115 } = {}) {
  const g = new THREE.Group(); sc.add(g);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.18, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false });
  const R = y => lerp(r * 0.86, r, y / h);
  const prof = []; for (let i = 0; i <= 16; i++) { const y = h * i / 16; prof.push(new THREE.Vector2(R(y), y)); }
  const wall = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), glassM); wall.renderOrder = 6; g.add(wall);
  const baseM = new THREE.MeshPhysicalMaterial({ color: 0xdff0fa, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.32, envMapIntensity: 1.2 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R(0.035), R(0), 0.035, 48), baseM); base.position.y = 0.0175; base.castShadow = true; g.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.55 })); rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  const waterM = new THREE.MeshPhysicalMaterial({ color: 0x8fd4f0, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.36, envMapIntensity: 1.0, depthWrite: false });
  const wg = new THREE.Group(); wg.position.y = 0.04; g.add(wg);
  const wh0 = h * 0.72, water = new THREE.Mesh(new THREE.CylinderGeometry(R(wh0) - 0.008, R(0.04) - 0.008, wh0 - 0.04, 48), waterM); water.position.y = (wh0 - 0.04) / 2; water.renderOrder = 4; wg.add(water);
  const surf = new THREE.Mesh(new THREE.CircleGeometry(R(wh0) - 0.008, 48), new THREE.MeshPhysicalMaterial({ color: 0xc8ecfa, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.32, envMapIntensity: 1.0, side: THREE.DoubleSide })); surf.rotation.x = -Math.PI / 2; surf.position.y = wh0 - 0.04; surf.renderOrder = 5; wg.add(surf);
  const iceM = new THREE.MeshPhysicalMaterial({ color: 0xf2faff, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.4, envMapIntensity: 1.2 });
  const ice = [0, 1, 2].map(i => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.075, 0.075, 3, 0.018), iceM); m.position.set(Math.cos(i * 2.1) * 0.035, wh0 - 0.07 - i * 0.012, Math.sin(i * 2.1) * 0.035); m.rotation.set(i, i * 2, i * 0.7); m.renderOrder = 5; wg.add(m); return m; });
  // shards, droplets, puddle
  const r0 = rng(31), shardM = new THREE.MeshPhysicalMaterial({ color: 0xf2faff, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.55, envMapIntensity: 2.4, side: THREE.DoubleSide });
  const shards = []; for (let i = 0; i < 46; i++) {
    const s = 0.03 + r0() * 0.07, sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s, s * (0.2 + r0() * 0.5)); sh.lineTo(s * (0.2 + r0() * 0.4), s * (0.9 + r0() * 0.6)); sh.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false }), shardM); m.castShadow = true; m.visible = false; sc.add(m);
    const a = r0() * Math.PI * 2, sp = 0.5 + r0() * 2.2; shards.push({ m, v: V(Math.cos(a) * sp, 0.6 + r0() * 2.0, Math.sin(a) * sp), w: V(r0() * 14 - 7, r0() * 14 - 7, r0() * 14 - 7), rest: r0() * 6.28 });
  }
  const ND = 90, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.7, envMapIntensity: 2 }), ND); drops.frustumCulled = false; sc.add(drops);
  const DD = []; for (let i = 0; i < ND; i++) { const a = r0() * Math.PI * 2, sp = 0.3 + r0() * 2.6; DD.push({ v: V(Math.cos(a) * sp, 0.8 + r0() * 2.6, Math.sin(a) * sp), s: 0.008 + r0() * 0.022, del: r0() * 0.05 }); }
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshPhysicalMaterial({ color: 0xcfeeff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.38, envMapIntensity: 2.2, depthWrite: false })); puddle.rotation.x = -Math.PI / 2; puddle.visible = false; sc.add(puddle);
  const iceLoose = [0, 1, 2].map(() => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.075, 0.075, 3, 0.018), iceM); m.castShadow = true; m.visible = false; sc.add(m); return m; });
  const dm = new THREE.Object3D(), GR = 9.8 * 1.15;
  const ballistic = (p0, v, a, floorY) => { // parabolic flight, then slide to a stop on the floor
    const A = 0.5 * GR, B = -v.y, Cc = floorY - p0.y, tf = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * Cc))) / (2 * A);
    if (a < tf) return { p: V(p0.x + v.x * a, p0.y + v.y * a - 0.5 * GR * a * a, p0.z + v.z * a), air: true, tf };
    const k = 5, b = a - tf, sl = (1 - Math.exp(-k * b)) / k * 0.45; return { p: V(p0.x + v.x * (tf + sl), floorY, p0.z + v.z * (tf + sl)), air: false, tf };
  };
  const api = {
    g, h, r, wg, hit: null,
    // whole glass: position on the table, tilt (a quaternion), water staying level, ice bobbing
    place(p, q = null, t = 0, slosh = 0) {
      g.visible = true; g.position.copy(p); if (q) g.quaternion.copy(q); else g.quaternion.identity();
      const inv = g.quaternion.clone().invert(); wg.quaternion.copy(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), inv, 0.85));
      surf.rotation.set(-Math.PI / 2 + slosh * 0.22 * Math.sin(t * 11), slosh * 0.18 * Math.cos(t * 9), 0);
      ice.forEach((m, i) => { m.position.y = wh0 - 0.07 - i * 0.012 + 0.006 * Math.sin(t * 3 + i * 2) + slosh * 0.012 * Math.sin(t * 12 + i); m.rotation.y = i * 2 + t * 0.3 + slosh * 0.5 * Math.sin(t * 8 + i); });
    },
    // after impact at point P (on the floor) at age a seconds
    shatter(P, a, floorY = 0) {
      const on = a >= 0; g.visible = !on; shards.forEach(o => o.m.visible = on); puddle.visible = on; iceLoose.forEach(m => m.visible = on);
      if (!on) { for (let i = 0; i < ND; i++) { dm.scale.setScalar(0.0001); dm.position.set(0, -50, 0); dm.updateMatrix(); drops.setMatrixAt(i, dm.matrix); } drops.instanceMatrix.needsUpdate = true; return; }
      shards.forEach((o, i) => { const b = ballistic(V(P.x, P.y + 0.06, P.z), o.v, a, floorY + 0.006); o.m.position.copy(b.p); if (b.air) o.m.rotation.set(o.w.x * a, o.w.y * a, o.w.z * a); else o.m.rotation.set(-Math.PI / 2, 0, o.rest); });
      for (let i = 0; i < ND; i++) { const d = DD[i], b = ballistic(V(P.x, P.y + 0.05, P.z), d.v, Math.max(0, a - d.del), floorY + 0.004); dm.position.copy(b.p); const s = d.s * (b.air ? 1 : Math.max(0.35, 1 - (a - b.tf) * 0.6)); dm.scale.set(s * (b.air ? 1 : 1.8), s * (b.air ? 1.3 : 0.35), s * (b.air ? 1 : 1.8)); dm.rotation.set(0, 0, 0); dm.updateMatrix(); drops.setMatrixAt(i, dm.matrix); }
      drops.instanceMatrix.needsUpdate = true;
      const ps = 0.75 * (1 - Math.exp(-a * 3.2)); puddle.position.set(P.x, floorY + 0.004, P.z); puddle.scale.set(ps * 1.15, ps, 1);
      iceLoose.forEach((m, i) => { const b = ballistic(V(P.x, P.y + 0.08, P.z), V(Math.cos(i * 2.2 + 1) * 1.3, 1.4 + i * 0.3, Math.sin(i * 2.2 + 1) * 1.3), a, floorY + 0.037); m.position.copy(b.p); m.rotation.set(b.air ? a * 7 : 0, i + (b.air ? a * 5 : 0), b.air ? a * 4 : 0); });
    },
  };
  api.place(V(0, 0, 0)); api.shatter(V(0, 0, 0), -1);
  return api;
}
