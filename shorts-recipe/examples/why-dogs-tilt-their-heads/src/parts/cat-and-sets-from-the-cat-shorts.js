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
function makeCat2({ base = '#e58a3a', stripe = '#a24e18', seed = 1, xray = false, iris = null } = {}) {
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
  const jaw = new THREE.Group(); jaw.position.set(0, -0.2, 0.22); head.add(jaw);
  const chin = F(add(sph(0.12, white), V(0, -0.1, 0.16), jaw), 0.02, { freq: 220 });
  const mouthM = X || new THREE.MeshStandardMaterial({ color: 0x5c1a26, roughness: 0.5 }), tongueM = X || new THREE.MeshPhysicalMaterial({ color: 0xe0707e, roughness: 0.35, clearcoat: 0.4 }), fangM = X || new THREE.MeshPhysicalMaterial({ color: 0xfbf6ee, roughness: 0.25, clearcoat: 0.6 });
  const cav = add(sph(1, mouthM, 32), V(0, -0.25, 0.43), head); cav.castShadow = false; cav.scale.set(0.13, 0.05, 0.1); cav.visible = false;
  const tongue = add(sph(1, tongueM, 24), V(0, -0.075, 0.07), jaw); tongue.scale.set(0.075, 0.024, 0.085); tongue.castShadow = false; tongue.visible = false;
  const fangs = [-1, 1].map(sx => { const f = add(new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.05, 10), fangM), V(sx * 0.058, -0.29, 0.53), head); f.rotation.x = Math.PI; f.castShadow = false; f.visible = false; return f; });
  add(sph(1, pink, 24), V(0, -0.05, 0.57), head).scale.set(0.075, 0.05, 0.05);
  [-1, 1].forEach(sx => { const m = add(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 8, 20, Math.PI), dark), V(sx * 0.055, -0.13, 0.602), head); m.rotation.z = Math.PI; });
  const eyeM = X || catEyeMat(...(iris || [])); const eyes = [], lids = [], lows = [], ears = [], wh = [], glints = [];
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
    for (let k = 0; k < 4; k++) { const g = new THREE.CylinderGeometry(0.0025, 0.007, 0.6 - k * 0.04, 6); g.translate(0, (0.6 - k * 0.04) / 2, 0); const w = new THREE.Mesh(g, X || new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.2, 1.2) })); w.rotation.z = -sx * (Math.PI / 2 + (k - 1.3) * 0.17); w.rotation.y = -sx * 0.12 * (k - 1.5); wg.add(w); }
    for (let k = 0; k < 2; k++) { const g = new THREE.CylinderGeometry(0.002, 0.005, 0.26, 6); g.translate(0, 0.13, 0); const w = new THREE.Mesh(g, X || new THREE.MeshBasicMaterial({ color: new THREE.Color(1.05, 1.05, 1.05) })); w.position.set(sx * (0.2 + k * 0.05), 0.24, 0.44); w.rotation.set(-0.5, 0, -sx * (0.25 + k * 0.3)); head.add(w); }
  });
  // ---- tail (rebuilt each frame)
  const tailM = new THREE.Mesh(new THREE.BufferGeometry(), fur); if (!X) { tailM.castShadow = true; addFur(tailM, 0.065, { comb: V(0, 0, 0) }); } cat.add(tailM);
  const tailTip = add(sph(0.056, fur, 16));
  const mix = (a, b, c, w) => a.map((v, i) => v * w.sit + b[i] * w.crouch + c[i] * w.stand);
  let cfg = null;
  const place = (m, a) => { m.position.set(a[0], a[1], a[2]); m.scale.set(a[3], a[4], a[5]); m.rotation.set(a[6] || 0, 0, 0); };
  const api = {
    head, eyes, lids, ears, legs, hips, torso, eyeM, fur, jaw, lift: 0,
    // open the mouth (0..1): the jaw drops and swings back, revealing the mouth, tongue and fangs
    meow(k) {
      k = clamp(k); jaw.rotation.x = 0.62 * k; cav.visible = tongue.visible = k > 0.03; fangs.forEach(f => f.visible = k > 0.22);
      cav.scale.set(0.12 + 0.03 * k, 0.04 + 0.13 * k, 0.1); cav.position.set(0, -0.255 - 0.07 * k, 0.45 - 0.03 * k); return api;
    },
    // 0 = a kitten (big head, blue eyes, bigger ears), 1 = grown up
    age(a) {
      a = clamp(a); head.scale.setScalar(lerp(1.4, 1, a)); api.lift = lerp(0.16, 0, a); ears.forEach(e => e.scale.setScalar(lerp(1.15, 1, a)));
      if (!X) { const U = eyeM.userData.U; U.uA.value.set(0xc6ecff).lerp(new THREE.Color(0xf4ff8c), a); U.uB.value.set(0x3f7fc8).lerp(new THREE.Color(0x6aa828), a); }
      return api;
    },
    // body pose: weights for sit / crouch / stand (they should sum to 1)
    pose(w = { sit: 1, crouch: 0, stand: 0 }) {
      const W_ = { sit: w.sit || 0, crouch: w.crouch || 0, stand: w.stand || 0 }; cfg = {}; Object.keys(CATCFG.sit).forEach(k => cfg[k] = mix(CATCFG.sit[k], CATCFG.crouch[k], CATCFG.stand[k], W_));
      place(hips, cfg.hips); place(torso, cfg.torso); place(bib, cfg.bib); place(neck, cfg.neck);
      thighs.forEach((m, i) => { const sx = i ? 1 : -1; m.position.set(sx * cfg.th[0], cfg.th[1], cfg.th[2]); m.scale.set(cfg.th[3], cfg.th[4], cfg.th[5]); });
      head.position.set(cfg.head[0], cfg.head[1] + api.lift, cfg.head[2]); head.rotation.set(0, 0, 0);
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
  cat.userData = api; api.pose().solve().lid(0.12).ears(0).whisk(0).tailRest(0).meow(0);
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

// turn a cat into an invisible shadow caster (it shows up only as a shadow)
function shadowOnly(obj) {
  const inv = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  obj.traverse(o => { if (!o.isMesh) return; if (o.material && o.material.transparent && o.material.depthWrite === false && o.parent && o.parent.userData && o.parent.userData.shells) { o.visible = false; return; } o.material = inv; o.castShadow = true; o.receiveShadow = false; o.userData.noDof = true; });
  return obj;
}
function noShadow(obj) { obj.traverse(o => { if (o.isMesh) o.castShadow = false; }); return obj; }
// =====================================================================
// SETS for "Why Cats Meow At You": bedroom at dawn, kitten nest, shadow wall,
// radio, sound lab with a live spectrogram, hallway door, alarm clock, bowls
// =====================================================================
const PJ = { ...OWNER, shirt: 0x8fb6d4, pants: 0x6f8fb0 };
const smax = (a, b, k = 0.12) => { const h = clamp(0.5 + 0.5 * (b - a) / k); return lerp(a, b, h) + k * h * (1 - h); };
const lamp = (sc, color, I, d, x, y, z) => { const l = new THREE.PointLight(color, I, d, 2); l.position.set(x, y, z); sc.add(l); return l; };

// ---------- props ----------
// stainless steel cat bowl (radius r), open side up
function steelBowl(r = 0.2) {
  const pts = [[0.0, 0.0], [0.62, 0.0], [0.7, 0.04], [0.82, 0.3], [0.98, 0.42], [1.0, 0.45], [0.96, 0.46], [0.8, 0.34], [0.68, 0.1], [0.0, 0.1]].map(([x, y]) => new THREE.Vector2(x * r, y * r));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshPhysicalMaterial({ color: 0xdfe4e8, metalness: 1, roughness: 0.22, envMapIntensity: 1.4 }));
  m.castShadow = true; m.receiveShadow = true; const g = new THREE.Group(); g.add(m); g.userData.r = r; return g;
}
// ceramic bowl with a stripe, for the kitchen floor
function ceramicBowl(r = 0.24) {
  const pts = [[0, 0], [0.7, 0], [0.78, 0.05], [0.95, 0.4], [1.0, 0.55], [0.93, 0.56], [0.86, 0.42], [0.66, 0.14], [0, 0.14]].map(([x, y]) => new THREE.Vector2(x * r, y * r));
  const tex = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#3f7fbf'; g.fillRect(0, h * 0.62, w, h * 0.12); for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(i * 32 + 16, h * 0.35, 5, 0, 7); g.fill(); } });
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }));
  m.castShadow = true; m.receiveShadow = true; const g = new THREE.Group(); g.add(m); return g;
}
// kibble: little rounded brown nuggets that pour from a bag into a bowl
function kibblePour(sc, n, bowlPos, r) {
  const geo = new THREE.SphereGeometry(1, 10, 8), mat = new THREE.MeshStandardMaterial({ color: 0x8a4f22, roughness: 0.55 });
  const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = true; im.frustumCulled = false; sc.add(im);
  const rr = rng(9), K = [], dm = new THREE.Object3D(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = rr() * 6.283, d = Math.sqrt(rr()) * r * 0.78, layer = Math.floor(i / (n * 0.45));
    const end = V(bowlPos.x + Math.cos(a) * d, bowlPos.y + r * 0.13 + 0.03 + layer * 0.03 + 0.025 * (1 - d / r) * (1 + layer), bowlPos.z + Math.sin(a) * d);
    K.push({ end, del: i / n, rot: V(rr() * 6, rr() * 6, rr() * 6), s: 0.022 + rr() * 0.01, sq: 0.7 + rr() * 0.3 });
    im.setColorAt(i, col.setHSL(0.07 + rr() * 0.02, 0.6, 0.22 + rr() * 0.1));
  }
  // spout: world point where the kibble leaves the bag; k0..k1: pour window
  return (t, spout, t0, dur) => {
    K.forEach((k, i) => {
      const tl = t0 + k.del * dur, fl = 0.28, a = (t - tl) / fl;
      if (a < 0) { dm.position.set(0, -50, 0); dm.scale.setScalar(0.0001); }
      else if (a < 1) { const p = lv(spout, k.end, a); p.y = lerp(spout.y, k.end.y, a * a) + 0.05 * Math.sin(Math.PI * a); dm.position.copy(p); dm.scale.set(k.s, k.s * k.sq, k.s * 1.2); dm.rotation.set(k.rot.x + a * 6, k.rot.y, k.rot.z + a * 4); }
      else { dm.position.copy(k.end); dm.scale.set(k.s, k.s * k.sq, k.s * 1.2); dm.rotation.set(k.rot.x, k.rot.y, k.rot.z); }
      dm.updateMatrix(); im.setMatrixAt(i, dm.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  };
}
function kibbleBag() {
  const g = new THREE.Group();
  const lab = canvasTex(256, 320, (c, w, h) => { c.fillStyle = '#c9965e'; c.fillRect(0, 0, w, h); noiseFill(c, w, h, 4, 18); c.fillStyle = '#e8572f'; c.fillRect(0, 90, w, 150); c.fillStyle = '#fff6e6'; c.font = '900 52px Arial Black, Arial'; c.textAlign = 'center'; c.fillText('KIBBLE', w / 2, 160);
    c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(w / 2 - 10, 205, 40, 20, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(w / 2 + 25, 205); c.lineTo(w / 2 + 60, 185); c.lineTo(w / 2 + 60, 225); c.fill(); });
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.62, 0.22, 3, 0.03), new THREE.MeshStandardMaterial({ map: lab, roughness: 0.8 })); body.castShadow = true; g.add(body);
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.1, 0.06, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0xc9965e, roughness: 0.85 })); top.position.y = 0.34; top.rotation.z = 0.06; g.add(top);
  g.userData.spout = V(0.17, 0.34, 0); return g;
}
// twin-bell alarm clock; set(h, m, s)
function alarmClock() {
  const g = new THREE.Group(), red = new THREE.MeshPhysicalMaterial({ color: 0xd8402f, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }), steel = new THREE.MeshPhysicalMaterial({ color: 0xe6e9ec, metalness: 1, roughness: 0.18 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.11, 48), red); body.rotation.x = Math.PI / 2; body.position.y = 0.24; body.castShadow = true; g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.012, 10, 48), steel); rim.position.set(0, 0.24, 0.056); g.add(rim);
  const face = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#f6efdc'; c.beginPath(); c.arc(256, 256, 256, 0, 7); c.fill(); c.fillStyle = '#2a2420'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 62px Georgia, serif';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(String(i), 256 + Math.sin(a) * 190, 260 - Math.cos(a) * 190); }
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 232 : 222; c.lineWidth = i % 5 ? 3 : 7; c.strokeStyle = '#2a2420'; c.beginPath(); c.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); c.lineTo(256 + Math.sin(a) * 246, 256 - Math.cos(a) * 246); c.stroke(); }
    c.fillStyle = '#6fd08a'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.beginPath(); c.arc(256 + Math.sin(a) * 140, 256 - Math.cos(a) * 140, 9, 0, 7); c.fill(); } });
  const fm = new THREE.Mesh(new THREE.CircleGeometry(0.155, 64), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5, emissive: new THREE.Color(0x203828), emissiveIntensity: 0.4 })); fm.position.set(0, 0.24, 0.057); g.add(fm);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 16, 0, Math.PI * 2, 0, 0.5), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.18, clearcoat: 1 })); glass.rotation.x = Math.PI / 2; glass.position.set(0, 0.24, 0.0); glass.scale.set(1, 0.6, 1); g.add(glass);
  const hand = (len, wd, col, z) => { const p = new THREE.Group(); p.position.set(0, 0.24, z); g.add(p); const m = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.004), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 })); m.position.y = len * 0.42; p.add(m); return p; };
  const hH = hand(0.09, 0.016, 0x1a1614, 0.061), hM = hand(0.13, 0.011, 0x1a1614, 0.064), hS = hand(0.14, 0.004, 0xd8402f, 0.067);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 16), steel); cap.rotation.x = Math.PI / 2; cap.position.set(0, 0.24, 0.07); g.add(cap);
  [-1, 1].forEach(sx => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), steel); b.position.set(sx * 0.11, 0.41, -0.01); b.rotation.z = -sx * 0.55; b.castShadow = true; g.add(b);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.13, 12), steel); leg.position.set(sx * 0.1, 0.07, 0); leg.rotation.z = sx * 0.4; g.add(leg); });
  const ham = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 8), steel); ham.position.set(0, 0.43, 0.0); g.add(ham);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 24, Math.PI), steel); handle.position.set(0, 0.42, -0.03); g.add(handle);
  g.userData.set = (h, m, s) => { hH.rotation.z = -((h % 12) + m / 60) / 12 * Math.PI * 2; hM.rotation.z = -(m + s / 60) / 60 * Math.PI * 2; hS.rotation.z = -Math.floor(s) / 60 * Math.PI * 2; };
  return g;
}

// ---------- bedroom at dawn ----------
const BED = { top: 1.02, head: -2.2, z0: -1.12, z1: 2.15 };
// height of the duvet over the sleeper (world x, z)
function duvetY(x, z) {
  const torso = 0.38 * Math.exp(-((x / 0.66) ** 2) - ((z + 0.25) / 0.85) ** 2);
  const legs = Math.max(...[-0.27, 0.27].map(lx => 0.21 * Math.exp(-(((x - lx) / 0.27) ** 2) - ((z - 1.05) / 0.8) ** 2)));
  const feet = Math.max(...[-0.3, 0.3].map(lx => 0.22 * Math.exp(-(((x - lx) / 0.2) ** 2) - ((z - 1.8) / 0.18) ** 2)));
  return BED.top + 0.04 + smax(smax(torso, legs, 0.1), feet, 0.06) + 0.012 * fbm(x * 2.2, z * 2.2, 3);
}
function bedroom(sc) {
  sc.background = new THREE.Color(0x0e1220); sc.environment = tintedEnv(0.35, 0.42, 0.66); const R = {};
  const fw = woodTex('#9a7556', '#5a3c26', 33, [3, 4], 7);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.5, roughness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.position.z = 1; floor.receiveShadow = true; sc.add(floor);
  const wallM = new THREE.MeshLambertMaterial({ color: 0x8b9cb6, bumpMap: PLASTER, bumpScale: 0.5 });
  const wall = (w, h, x, y, z, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); p.position.set(x, y, z); p.rotation.y = ry; p.receiveShadow = true; sc.add(p); return p; };
  wall(9, 7, 0, 3.5, -2.45, 0); wall(10, 7, -3.6, 3.5, 1.2, Math.PI / 2); wall(10, 7, 3.6, 3.5, 1.2, -Math.PI / 2);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9, 10), new THREE.MeshLambertMaterial({ color: 0xa9b6cc })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 5.6, 1.2); ceil.receiveShadow = true; sc.add(ceil);
  // far wall (foot of the bed) with a window opening and the dawn sky behind it
  const fz = 4.7, wx0 = -1.15, wx1 = 1.15, wy0 = 2.0, wy1 = 4.6;
  const fb = (x0, x1, y0, y1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.3), wallM); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, fz + 0.15); b.receiveShadow = true; b.castShadow = true; sc.add(b); };
  fb(-4.5, wx0, 0, 7); fb(wx1, 4.5, 0, 7); fb(wx0, wx1, 0, wy0); fb(wx0, wx1, wy1, 7);
  const trimM = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.45 });
  [[0, (wy1 - wy0) / 2 + 0.05, 2.5, 0.1], [0, -(wy1 - wy0) / 2 - 0.05, 2.6, 0.14], [0, 0, 0.07, wy1 - wy0], [-1.15, 0, 0.1, wy1 - wy0], [1.15, 0, 0.1, wy1 - wy0], [0, 0.35, 2.3, 0.06]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), trimM); b.position.set(x, (wy0 + wy1) / 2 + y, fz - 0.02); sc.add(b); });
  const DAWN = gradTex([[0, '#ffd9b0'], [0.22, '#f4a6a0'], [0.5, '#8f86c4'], [0.8, '#3c4a8c'], [1, '#1c2350']], 0.5, 0.95);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshBasicMaterial({ map: DAWN, color: new THREE.Color(1.25, 1.2, 1.2) })); sky.position.set(0, 3.0, fz + 5); sky.rotation.y = Math.PI; sc.add(sky);
  const cr = rng(5); for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.6 + cr() * 1.2, 0.8 + cr() * 2.2, 0.1), new THREE.MeshBasicMaterial({ color: 0x2a2a4a })); b.position.set(-6 + i * 1.1, 0.4 + cr() * 0.6, fz + 4.6); sc.add(b); }
  const curtM = new THREE.MeshLambertMaterial({ color: 0xe8d2c4, side: THREE.DoubleSide, bumpMap: WEAVE_FINE, bumpScale: 0.6, transparent: true, opacity: 0.94 });
  [-1.55, 1.55].forEach(x => { const gg = new THREE.PlaneGeometry(0.85, 4.4, 40, 6), p = gg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.07 * Math.sin((p.getX(i) + 0.4) * 22)); gg.computeVertexNormals(); const c = new THREE.Mesh(gg, curtM); c.rotation.y = Math.PI; c.position.set(x, 3.0, fz - 0.25); c.castShadow = true; sc.add(c); });
  // bed: frame, mattress, upholstered headboard, pillows, duvet shaped by the sleeper
  const frameM = new THREE.MeshStandardMaterial({ map: woodTex('#a57a52', '#6a4a30', 12, [1, 2]), roughness: 0.5 });
  box(sc, 2.95, 0.42, 4.6, 0, 0.36, -0.02, frameM, 0.05); box(sc, 2.75, 0.36, 4.35, 0, 0.78, -0.02, new THREE.MeshLambertMaterial({ color: 0xf2efe8 }), 0.12);
  const hb = box(sc, 3.0, 2.3, 0.26, 0, 1.6, -2.3, new THREE.MeshLambertMaterial({ color: 0x3f6f7a, bumpMap: QUILT, bumpScale: 2.2 }), 0.12);
  const btnM = new THREE.MeshStandardMaterial({ color: 0x2f5560, roughness: 0.4 }); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), btnM); b.position.set(-1.1 + i * 0.55, 1.15 + j * 0.45, -2.16); sc.add(b); }
  const pilM = new THREE.MeshLambertMaterial({ color: 0xf4f1ea, bumpMap: WEAVE_FINE, bumpScale: 0.4 });
  const pillow = (x, z, ry = 0) => { const p = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), pilM); p.scale.set(0.62, 0.17, 0.36); p.position.set(x, 1.13, z); p.rotation.y = ry; p.castShadow = p.receiveShadow = true; sc.add(p); return p; };
  R.pillowL = pillow(-0.72, -1.75, 0.05); R.pillowR = pillow(0.72, -1.72, -0.06);
  const NX = 110, NZ = 120, dg = new THREE.PlaneGeometry(1, 1, NX, NZ); dg.rotateX(-Math.PI / 2); const dp = dg.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    const u = dp.getX(i) + 0.5, v = dp.getZ(i) + 0.5; let x = lerp(-1.95, 1.95, u), z = lerp(BED.z0, BED.z1 + 0.6, v), y;
    const ax = Math.abs(x), over = Math.max(0, ax - 1.38), overZ = Math.max(0, z - BED.z1);
    const base = duvetY(Math.sign(x) * Math.min(ax, 1.38), Math.min(z, BED.z1));
    y = base - Math.min(over * 1.9, 0.62) - Math.min(overZ * 1.9, 0.62) + 0.02 * Math.sin(z * 9 + x * 2) * Math.min(1, over * 6);
    x = Math.sign(x) * (Math.min(ax, 1.38) + over * 0.12 + Math.min(over, 0.3) * 0.15); z = Math.min(z, BED.z1) + overZ * 0.12 + Math.min(overZ, 0.3) * 0.15;
    dp.setXYZ(i, x, y, z);
  }
  dg.computeVertexNormals();
  const duvetT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#e9a58f'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 6, 10); g.strokeStyle = 'rgba(255,236,226,0.16)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); } }, { rep: [3, 3] });
  const duvet = new THREE.Mesh(dg, new THREE.MeshLambertMaterial({ map: duvetT, bumpMap: QUILT, bumpScale: 1.6 })); duvet.castShadow = duvet.receiveShadow = true; sc.add(duvet); R.duvet = duvet;
  const roll = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 2.7, 8, 24), new THREE.MeshLambertMaterial({ color: 0xf6f3ec, bumpMap: WEAVE_FINE, bumpScale: 0.4 })); roll.rotation.z = Math.PI / 2; roll.position.set(0, duvetY(0, BED.z0) - 0.02, BED.z0 + 0.02); roll.castShadow = true; sc.add(roll);
  // nightstand with the alarm clock, a book and a glowing salt lamp
  const ns = new THREE.Group(); ns.position.set(2.05, 0, -1.75); sc.add(ns);
  box(ns, 0.95, 1.05, 0.8, 0, 0.53, 0, frameM, 0.04); box(ns, 0.8, 0.32, 0.04, 0, 0.68, 0.4, new THREE.MeshStandardMaterial({ color: 0x8a6444, roughness: 0.5 }), 0.02);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.chrome); knob.position.set(0, 0.68, 0.43); ns.add(knob);
  const clock = alarmClock(); clock.position.set(-0.12, 1.05, 0.12); clock.rotation.y = -0.55; ns.add(clock); R.clock = clock;
  box(ns, 0.42, 0.07, 0.3, 0.2, 1.09, -0.12, new THREE.MeshStandardMaterial({ color: 0x3a6a8a, roughness: 0.6 }), 0.01);
  const salt = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 1), hdr(2.6, 1.15, 0.45)); salt.position.set(0.27, 1.27, -0.12); salt.scale.set(1, 1.3, 1); ns.add(salt);
  lamp(sc, 0xff9a4a, 2.6, 5, 2.3, 1.45, -1.85);
  // a framed print over the headboard
  const art = canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#e8dcc6'; g.fillRect(0, 0, w, h); g.fillStyle = '#e07a4a'; g.beginPath(); g.arc(w / 2, h * 0.42, 60, 0, 7); g.fill(); g.fillStyle = '#3f6f7a'; g.beginPath(); g.moveTo(0, h); g.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.6, h * 0.75); g.quadraticCurveTo(w * 0.8, h * 0.6, w, h * 0.7); g.lineTo(w, h); g.fill(); });
  box(sc, 1.1, 1.35, 0.06, 0, 3.6, -2.42, new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.5 }), 0.01, false); const ap = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1.2), new THREE.MeshLambertMaterial({ map: art })); ap.position.set(0, 3.6, -2.385); sc.add(ap);
  // dawn light through the window, cool bounce from the ceiling
  const key = new THREE.DirectionalLight(0xc7b8ff, 2.4); key.position.set(0.6, 6.8, 11); key.target.position.set(0, 1.2, -0.5); sc.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.03; key.userData.soft = 0.25; R.key = key;
  sc.add(new THREE.HemisphereLight(0x9fb2e0, 0x3a2a30, 0.85));
  const fill = new THREE.DirectionalLight(0x9fb0ff, 0.9); fill.position.set(-1.5, 4.5, -6); fill.target.position.set(0, 1.5, 0); sc.add(fill, fill.target);
  R.update = () => {};
  return R;
}

// ---------- kitten nest: a wicker basket in a dim corner ----------
function nest(sc, { day = false } = {}) {
  sc.background = new THREE.Color(day ? 0x2a2018 : 0x0b0f1a); sc.environment = day ? MENV : NENV; const R = {};
  const fw = woodTex('#a07a58', '#5c3e28', 51, [4, 5], 8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.5, roughness: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.position.z = -2; floor.receiveShadow = true; sc.add(floor);
  const wallM = new THREE.MeshLambertMaterial({ color: day ? 0xd8c8b0 : 0x7e8aa6, bumpMap: PLASTER, bumpScale: 0.5 });
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallM); wl.position.set(0, 4, -7.5); wl.receiveShadow = true; sc.add(wl);
  const wl2 = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallM); wl2.position.set(-3.2, 4, -1); wl2.rotation.y = Math.PI / 2; wl2.receiveShadow = true; sc.add(wl2);
  box(sc, 16, 0.24, 0.05, 0, 0.12, -7.47, new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.5 }), 0, false);
  // window on the back wall
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), day ? hdr(3.0, 2.6, 2.0) : hdr(0.35, 0.5, 1.1)); win.position.set(2.2, 3.0, -7.44); sc.add(win);
  const fr = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.5 }); [[0, 1.1, 1.75, 0.08], [0, -1.1, 1.75, 0.08], [0, 0, 0.06, 2.2], [-0.8, 0, 0.08, 2.25], [0.8, 0, 0.08, 2.25]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), fr); b.position.set(2.2 + x, 3.0 + y, -7.42); sc.add(b); });
  if (!day) { const moon = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), hdr(2.2, 2.3, 2.5)); moon.position.set(2.5, 3.5, -7.43); sc.add(moon); }
  // the basket: woven sides, a rope rim, a knitted blanket inside
  const BR = 0.78, BH = 0.42;
  const wv = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#b98a4e'; g.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = 0; i < 32; i++) { const o = (i + j) % 2; g.fillStyle = o ? '#c79a5e' : '#ad8048'; g.fillRect(i * 16, j * 16, 16, 16); g.fillStyle = 'rgba(60,35,10,0.22)'; g.fillRect(i * 16, j * 16 + (o ? 0 : 14), 16, 2); } noiseFill(g, w, h, 3, 14); }, { rep: [3, 1] });
  const bm = new THREE.MeshStandardMaterial({ map: wv, bumpMap: wv, bumpScale: 2, roughness: 0.75, side: THREE.DoubleSide });
  const basket = new THREE.Group(); sc.add(basket); R.basket = basket;
  const side = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR * 0.86, BH, 64, 1, true), bm); side.position.y = BH / 2; side.castShadow = side.receiveShadow = true; basket.add(side);
  const bot = new THREE.Mesh(new THREE.CircleGeometry(BR * 0.86, 48), bm); bot.rotation.x = -Math.PI / 2; bot.position.y = 0.02; basket.add(bot);
  const rimG = new THREE.TorusGeometry(BR, 0.045, 12, 96); const rim = new THREE.Mesh(rimG, new THREE.MeshStandardMaterial({ color: 0xa87a42, roughness: 0.7, bumpMap: WEAVE, bumpScale: 1.5 })); rim.rotation.x = Math.PI / 2; rim.position.y = BH; rim.castShadow = true; basket.add(rim);
  const bg = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), bp = bg.attributes.position; for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), z = bp.getZ(i), y = bp.getY(i); bp.setY(i, y * (0.6 + 0.4 * Math.abs(Math.sin(Math.atan2(z, x) * 3))) + 0.05 * fbm(x * 3, z * 3)); } bg.computeVertexNormals();
  const blanket = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ color: day ? 0xe0b8a0 : 0xd9a898, bumpMap: WEAVE_FINE, bumpScale: 1.2 })); blanket.scale.set(BR * 0.92, 0.18, BR * 0.92); blanket.position.y = 0.06; blanket.receiveShadow = true; basket.add(blanket);
  R.seatY = 0.2;
  // a little stool and a plant for depth
  pottedPlant(sc, -2.1, -4.6, 0.8, 0x6f8fb0);
  // light: moon through the window (cool) or morning sun
  const key = new THREE.DirectionalLight(day ? 0xffd6a0 : 0xb4c0ff, day ? 3.0 : 1.9); key.position.set(4, 7, -12); key.target.position.set(0, 0.3, 0); sc.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.03; key.userData.soft = 0.2; R.key = key;
  sc.add(new THREE.HemisphereLight(day ? 0xfff0dc : 0x9098c0, day ? 0x6a4a30 : 0x3a2a20, day ? 1.0 : 0.75));
  const front = new THREE.DirectionalLight(day ? 0xffe6c8 : 0x6f7fd0, day ? 0.9 : 0.5); front.position.set(-2, 3, 6); sc.add(front);
  R.warm = lamp(sc, 0xffa060, day ? 0 : 7, 5, 1.6, 1.0, 1.4);
  R.update = () => {};
  return R;
}

// ---------- a warm wall for the shadow shot ----------
function shadowWall(sc) {
  sc.background = new THREE.Color(0x1a120c); sc.environment = MENV; const R = {};
  const fw = woodTex('#b08458', '#6a4426', 61, [3, 3], 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.5, roughness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshLambertMaterial({ color: 0xead6b8, bumpMap: PLASTER, bumpScale: 0.6 })); wall.position.set(0, 3.5, -1.1); wall.receiveShadow = true; sc.add(wall);
  box(sc, 14, 0.9, 0.06, 0, 0.45, -1.07, new THREE.MeshStandardMaterial({ color: 0x6f8f86, roughness: 0.55 }), 0.01, false);
  box(sc, 14, 0.06, 0.1, 0, 0.92, -1.05, new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.4 }), 0.01, false);
  const key = new THREE.SpotLight(0xffb070, 70, 16, 0.5, 0.45, 2); key.position.set(-3.6, 1.35, 3.4); key.target.position.set(0.9, 0.9, -1.1); sc.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02; key.userData.soft = 0.05; R.key = key;
  sc.add(new THREE.HemisphereLight(0x8a7a8a, 0x3a2418, 0.45));
  const rim = new THREE.DirectionalLight(0x9fb0ff, 0.6); rim.position.set(3, 3, -2); sc.add(rim);
  R.update = () => {};
  return R;
}

// ---------- vintage radio with a tuning dial ----------
function makeRadio() {
  const g = new THREE.Group(), wood = new THREE.MeshPhysicalMaterial({ map: woodTex('#8a5230', '#4a2614', 77, [1, 1]), roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.62, 0.42, 4, 0.08), wood); body.position.y = 0.31; body.castShadow = body.receiveShadow = true; g.add(body);
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.42, 48, 1, false, -Math.PI / 2, Math.PI), wood); arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI / 2; arch.position.y = 0.6; arch.scale.set(1, 1, 0.42); arch.castShadow = true; g.add(arch);
  const grille = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48, 0, Math.PI), new THREE.MeshLambertMaterial({ color: 0xd9c49a, bumpMap: WEAVE_FINE, bumpScale: 1.5 })); grille.position.set(0, 0.6, 0.212); g.add(grille);
  const gb = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.2), grille.material); gb.position.set(0, 0.5, 0.212); g.add(gb);
  for (let i = -2; i <= 2; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.36, 0.02), wood); s.position.set(i * 0.1, 0.62, 0.222); g.add(s); }
  const dial = canvasDyn(512, 96); const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.115), new THREE.MeshBasicMaterial({ map: dial.t, color: new THREE.Color(1.6, 1.35, 0.95) })); dm.position.set(0, 0.24, 0.213); g.add(dm);
  const bez = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 4), M.chrome); g.add(bez); bez.visible = false;
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xd6a85a, metalness: 1, roughness: 0.25 });
  const knobs = [-0.27, 0.27].map(x => { const k = new THREE.Group(); k.position.set(x, 0.1, 0.215); g.add(k); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.066, 0.05, 24), brass); c.rotation.x = Math.PI / 2; c.position.z = 0.025; k.add(c); for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.05), brass); const a = i / 12 * 6.283; r.position.set(Math.cos(a) * 0.064, Math.sin(a) * 0.064, 0.025); r.rotation.z = a; k.add(r); } const mk = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.04, 0.004), new THREE.MeshBasicMaterial({ color: 0x2a1a10 })); mk.position.set(0, 0.03, 0.052); k.add(mk); return k; });
  const draw = (f) => { const c = dial.g; c.fillStyle = '#f3dcae'; c.fillRect(0, 0, 512, 96); c.strokeStyle = '#5a3a1a'; c.fillStyle = '#5a3a1a'; c.font = 'bold 22px Georgia, serif'; c.textAlign = 'center';
    for (let i = 0; i <= 40; i++) { const x = 26 + i * 11.5; c.lineWidth = i % 5 ? 1.5 : 3; c.beginPath(); c.moveTo(x, 60); c.lineTo(x, i % 5 ? 70 : 76); c.stroke(); }
    ['55', '60', '70', '80', '100', '120', '140', '160', '170'].forEach((s, i) => c.fillText(s, 26 + i * 57.5, 46)); c.font = 'italic 16px Georgia, serif'; c.fillText('kHz', 486, 86);
    const x = 26 + f * 460; c.fillStyle = '#d23a22'; c.fillRect(x - 2, 8, 4, 82); dial.t.needsUpdate = true; };
  draw(0.3);
  g.userData = { knobs, draw }; return g;
}

// ---------- the sound lab: bench, studio mic, a monitor with a live spectrogram ----------
function labRoom(sc) {
  sc.background = new THREE.Color(0xe8eef0); sc.environment = tintedEnv(0.95, 0.98, 1.0); const R = {};
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshLambertMaterial({ color: 0xd6dcdf })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wallM = new THREE.MeshLambertMaterial({ color: 0xf2f5f6 });
  const w1 = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallM); w1.position.set(0, 4, -3.2); w1.receiveShadow = true; sc.add(w1);
  const w2 = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallM); w2.position.set(-4.5, 4, 2); w2.rotation.y = Math.PI / 2; w2.receiveShadow = true; sc.add(w2);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(20, 0.24), new THREE.MeshLambertMaterial({ color: 0x2aa7a0 })); stripe.position.set(0, 2.2, -3.19); sc.add(stripe);
  // acoustic foam panels
  const foam = canvasTex(256, 256, (g, w, h) => { for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const gr = g.createLinearGradient(i * 32, j * 32, i * 32 + ((i + j) % 2 ? 32 : 0), j * 32 + ((i + j) % 2 ? 0 : 32)); gr.addColorStop(0, '#5a6a74'); gr.addColorStop(1, '#2e3a42'); g.fillStyle = gr; g.fillRect(i * 32, j * 32, 32, 32); } });
  [[-2.6, 3.6], [-0.8, 3.6], [1.0, 3.6]].forEach(([x, y]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.12), new THREE.MeshLambertMaterial({ map: foam, bumpMap: foam, bumpScale: 3 })); p.position.set(x, y, -3.12); sc.add(p); });
  // bench
  box(sc, 4.2, 0.12, 1.8, 0, 1.44, -0.3, new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.35 }), 0.03);
  [[-1.95, 0.45], [1.95, 0.45], [-1.95, -1.05], [1.95, -1.05]].forEach(([x, z]) => box(sc, 0.1, 1.4, 0.1, x, 0.7, z, new THREE.MeshStandardMaterial({ color: 0x9aa4aa, roughness: 0.4, metalness: 0.5 }), 0.02));
  R.benchY = 1.5;
  // studio microphone on a short stand, with a pop filter
  const mic = new THREE.Group(); sc.add(mic); R.mic = mic;
  const blk = new THREE.MeshPhysicalMaterial({ color: 0x1c1f24, roughness: 0.35, metalness: 0.6 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 32), blk); base.position.y = 0.02; mic.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 12), blk); pole.position.y = 0.27; mic.add(pole);
  const head = new THREE.Group(); head.position.y = 0.56; head.rotation.x = 0.35; mic.add(head); R.micHead = head;
  const capM = new THREE.MeshPhysicalMaterial({ color: 0xc9cdd2, metalness: 1, roughness: 0.35, bumpMap: WEAVE_FINE, bumpScale: 2 });
  const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.16, 8, 24), capM); cap.position.y = 0.06; head.add(cap);
  const bodyM = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.2, 24), new THREE.MeshPhysicalMaterial({ color: 0xd8b45a, metalness: 1, roughness: 0.28 })); bodyM.position.y = -0.12; head.add(bodyM);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.01, 8, 32), blk); ring.rotation.x = Math.PI / 2; ring.position.y = -0.05; head.add(ring);
  const pop = new THREE.Mesh(new THREE.CircleGeometry(0.16, 40), new THREE.MeshPhysicalMaterial({ color: 0x15181c, transparent: true, opacity: 0.45, roughness: 0.6, side: THREE.DoubleSide, bumpMap: WEAVE_FINE, bumpScale: 1 })); pop.position.set(0, 0.06, 0.24); pop.rotation.x = -0.35; mic.add(pop); pop.position.y = 0.62;
  const popR = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 6, 40), blk); popR.position.copy(pop.position); popR.rotation.copy(pop.rotation); mic.add(popR);
  // monitor with the spectrogram
  const mon = new THREE.Group(); sc.add(mon); R.mon = mon;
  box(mon, 1.2, 1.86, 0.07, 0, 1.08, 0, new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, roughness: 0.3 }), 0.03);
  box(mon, 0.12, 0.3, 0.08, 0, 0.15, -0.05, new THREE.MeshPhysicalMaterial({ color: 0x9aa4aa, metalness: 0.8, roughness: 0.3 }), 0.02); box(mon, 0.6, 0.03, 0.34, 0, 0.015, 0, new THREE.MeshPhysicalMaterial({ color: 0x9aa4aa, metalness: 0.8, roughness: 0.3 }), 0.01);
  const scr = canvasDyn(624, 1024); const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.78), new THREE.MeshBasicMaterial({ map: scr.t, color: new THREE.Color(1.25, 1.25, 1.25), toneMapped: true })); sm.position.set(0, 1.08, 0.037); mon.add(sm); R.screen = scr; R.screenMesh = sm;
  // light: big soft daylight
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 7, 6); key.target.position.set(0, 1.4, -0.4); sc.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.03; key.userData.soft = 0.3;
  sc.add(new THREE.HemisphereLight(0xffffff, 0xb8c0c4, 1.15));
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6); fill.position.set(5, 3, 4); sc.add(fill);
  R.update = () => {};
  return R;
}
// spectrogram (portrait): time scrolls right to left, pitch goes up. cry: 0..1 reveals the cry hidden in the purr; baby: 0..1 slides in a baby-cry track
function drawSpectro(scr, t, { cry = 0, baby = 0 } = {}) {
  const g = scr.g, W = scr.c.width, H = scr.c.height, px = 150;
  g.globalAlpha = 1; g.shadowBlur = 0; g.fillStyle = '#0a0f1e'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(120,150,200,0.13)'; g.lineWidth = 1; for (let y = 64; y < H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } for (let x = 0; x < W; x += 78) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  const split = baby > 0 ? lerp(H, H * 0.5, E.io(baby)) : H;
  const curve = (y0, amp, ph, k) => { g.beginPath(); for (let x = 0; x <= W; x += 6) { const tt = t - (W - x) / px; const y = y0 - k * (amp * Math.sin(tt * 3.1 + ph) + 5 * fbm(tt * 2.5, ph)); x ? g.lineTo(x, y) : g.moveTo(x, y); } };
  const catTrack = (y0, y1) => {
    const h = y1 - y0, base = y1 - 26, top = base - h * 0.62, cryY = y0 + h * 0.5;
    const gr = g.createLinearGradient(0, base, 0, top); gr.addColorStop(0, 'rgba(255,160,70,1)'); gr.addColorStop(0.3, 'rgba(255,120,45,0.6)'); gr.addColorStop(1, 'rgba(255,90,30,0)'); g.fillStyle = gr;
    for (let x = 0; x < W; x += 3) { const tt = t - (W - x) / px, puls = Math.pow(Math.abs(Math.sin(tt * Math.PI * 25)), 1.5), env = 0.72 + 0.28 * fbm(tt * 1.1, 2); g.globalAlpha = clamp(0.18 + 0.82 * puls * env); g.fillRect(x, top, 3, base - top + 26); }
    g.globalAlpha = 1;
    // the cry inside the purr: camouflaged in orange until it is revealed
    const rv = clamp(cry);
    [[0, 7, 1], [-h * 0.17, 4, 0.55]].forEach(([dy, lw, a]) => {
      g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
      if (rv < 0.05) { g.strokeStyle = `rgba(255,205,150,${0.32 * a})`; } else { g.shadowColor = '#5ae6ff'; g.shadowBlur = 22 * rv; g.strokeStyle = `rgba(${lerp(255, 110, rv)},${lerp(205, 236, rv)},${lerp(150, 255, rv)},${lerp(0.32, 1, rv) * a})`; }
      curve(cryY + dy, 14, 0, 1); g.stroke(); g.shadowBlur = 0;
    });
    g.font = 'bold 40px Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#ffb070'; g.fillText('PURR', 22, base - 40);
    if (rv > 0.05) { g.globalAlpha = clamp(rv * 1.6); g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.setLineDash([12, 9]); g.beginPath(); g.ellipse(W * 0.55, cryY - h * 0.08, W * 0.5, h * 0.17, 0, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = '#7aeaff'; g.font = 'bold 46px Arial, sans-serif'; g.fillText('CRY', 22, cryY - h * 0.3); g.globalAlpha = 1; }
    return cryY;
  };
  const babyTrack = (y0, y1) => {
    const h = y1 - y0, cryY = y0 + h * 0.5;
    [[0, 8, 1], [-h * 0.17, 5, 0.6], [-h * 0.34, 3, 0.35]].forEach(([dy, lw, a]) => { g.lineWidth = lw; g.shadowColor = '#5ae6ff'; g.shadowBlur = 18; g.strokeStyle = `rgba(150,236,255,${a})`; curve(cryY + dy, 20, 1.3, 1.2); g.stroke(); g.shadowBlur = 0; });
    const bx = 56, by = y1 - 70; g.fillStyle = '#ffd7b0'; g.beginPath(); g.arc(bx, by, 32, 0, 7); g.fill(); g.fillStyle = '#7a4a2a'; g.beginPath(); g.arc(bx, by - 30, 10, 0, 7); g.fill(); g.fillStyle = '#3a2418'; g.lineWidth = 4; g.strokeStyle = '#3a2418'; [-11, 11].forEach(dx => { g.beginPath(); g.moveTo(bx + dx - 6, by - 6); g.lineTo(bx + dx + 6, by - 4); g.stroke(); }); g.beginPath(); g.ellipse(bx, by + 12, 9, 11, 0, 0, 7); g.fill();
    g.font = 'bold 40px Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#9fe6ff'; g.fillText('BABY CRY', 104, by);
    return cryY;
  };
  g.save(); g.beginPath(); g.rect(0, 0, W, split); g.clip(); const cy = catTrack(0, split); g.restore();
  if (baby > 0.001) {
    g.save(); g.beginPath(); g.rect(0, split, W, H - split); g.clip(); g.fillStyle = '#0d1426'; g.fillRect(0, split, W, H - split); const by = babyTrack(split, split + H * 0.5); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, split - 2, W, 4);
    const k = clamp((baby - 0.55) * 2.5);
    if (k > 0) { g.globalAlpha = k; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.setLineDash([14, 10]); [cy, by].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }); g.setLineDash([]);
      g.fillStyle = 'rgba(10,15,30,0.85)'; g.fillRect(W / 2 - 170, split - 34, 340, 68); g.fillStyle = '#ffffff'; g.font = 'bold 44px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('SAME PITCH', W / 2, split + 2); g.globalAlpha = 1; }
  }
  g.fillStyle = Math.sin(t * 6) > -0.3 ? '#ff3b3b' : '#5a1a1a'; g.beginPath(); g.arc(W - 110, 40, 12, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.font = 'bold 30px Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('REC', W - 90, 41);
  scr.t.needsUpdate = true;
}

// ---------- hallway with a door; the room behind is bright ----------
function hallway(sc) {
  sc.background = new THREE.Color(0x14161c); sc.environment = tintedEnv(0.5, 0.52, 0.62); const R = {};
  const fw = woodTex('#a07a58', '#5c3e28', 41, [3, 5], 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.5, roughness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wallM = new THREE.MeshLambertMaterial({ color: 0x9a8f86, bumpMap: PLASTER, bumpScale: 0.5 });
  const DX0 = -0.85, DX1 = 0.85, DH = 3.5;
  const wb = (x0, x1, y0, y1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.24), wallM); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, -0.12); b.receiveShadow = true; b.castShadow = true; sc.add(b); };
  wb(-7, DX0, 0, 7); wb(DX1, 7, 0, 7); wb(DX0, DX1, DH, 7);
  const sideW = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), wallM); sideW.position.set(-3.0, 3.5, 4.5); sideW.rotation.y = Math.PI / 2; sc.add(sideW);
  const trimM = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.4 });
  [[DX0 - 0.07, DH / 2, 0.14, DH + 0.1], [DX1 + 0.07, DH / 2, 0.14, DH + 0.1], [0, DH + 0.07, DX1 - DX0 + 0.28, 0.14]].forEach(([x, y, w, h]) => box(sc, w, h, 0.3, x, y, -0.1, trimM, 0.01));
  box(sc, 14, 0.24, 0.04, 0, 0.12, 0.02, trimM, 0, false);
  // the bright room behind the door
  const back = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshLambertMaterial({ color: 0xf2dcc0 })); back.position.set(0, 4, -5.5); sc.add(back);
  const fl2 = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshStandardMaterial({ map: fw, roughness: 0.35 })); fl2.rotation.x = -Math.PI / 2; fl2.position.set(0, 0.002, -3); sc.add(fl2);
  const sunWin = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), hdr(4, 3.5, 2.6)); sunWin.position.set(1.4, 2.8, -5.48); sc.add(sunWin);
  const inside = new THREE.PointLight(0xffd29a, 40, 12, 2); inside.position.set(0, 2.6, -2.6); sc.add(inside); R.inside = inside;
  const spill = new THREE.SpotLight(0xffd8a0, 0, 14, 0.55, 0.5, 2); spill.position.set(0.3, 3.0, -4.2); spill.target.position.set(0, 0, 2.0); sc.add(spill, spill.target); spill.castShadow = true; spill.shadow.mapSize.set(1024, 1024); spill.shadow.bias = -0.0003; spill.userData.soft = 0.15; R.spill = spill;
  // door (hinged on the left), opens away from us
  const door = new THREE.Group(); door.position.set(DX0, 0, -0.18); sc.add(door); R.door = door;
  const dm = new THREE.MeshStandardMaterial({ color: 0xf4f2ee, roughness: 0.45 });
  const slab = new THREE.Mesh(new RoundedBoxGeometry(DX1 - DX0 - 0.02, DH - 0.02, 0.08, 2, 0.015), dm); slab.position.set((DX1 - DX0) / 2, DH / 2, 0); slab.castShadow = slab.receiveShadow = true; door.add(slab);
  [[0.95, 1.2], [2.45, 1.2]].forEach(([y, h]) => { const p = new THREE.Mesh(new RoundedBoxGeometry(1.25, h, 0.03, 2, 0.04), dm); p.position.set((DX1 - DX0) / 2, y, 0.045); p.castShadow = true; door.add(p); });
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xd8b060, metalness: 1, roughness: 0.25 });
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 24), brass); rose.rotation.x = Math.PI / 2; rose.position.set(DX1 - DX0 - 0.16, 1.55, 0.06); door.add(rose);
  const lever = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.2, 6, 12), brass); lever.rotation.z = Math.PI / 2; lever.position.set(DX1 - DX0 - 0.25, 1.55, 0.1); door.add(lever); R.lever = lever;
  // a cool hallway light from above and behind us
  const key = new THREE.DirectionalLight(0xa8b8e8, 1.2); key.position.set(2, 6, 6); key.target.position.set(0, 0.5, 0); sc.add(key, key.target); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); key.shadow.bias = -0.0003; key.userData.soft = 0.25;
  sc.add(new THREE.HemisphereLight(0x8a90a8, 0x3a2a20, 0.6));
  R.open = (k) => { door.rotation.y = 1.45 * k; inside.intensity = 10 + 50 * k; spill.intensity = 120 * k; };
  R.update = () => {};
  return R;
}
