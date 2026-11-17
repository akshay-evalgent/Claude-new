// =====================================================================
// SETS: "Why Dogs Shake Off Water". A sunny bathroom, wet fur, the shake itself
// (a twist wave from head to tail) and the water it throws.
// =====================================================================
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const LAB = { base: '#e2b46a', light: '#f3daa8', seed: 3, iris: [0xc0823a, 0x6a3c14], snout: 1.02, earLen: 0.88 };
const TERRIER = { base: '#f1ece2', light: '#fbf8f2', seed: 21, iris: [0x9a6430, 0x4a2a10], snout: 0.82, earLen: 0.62 };

// ---------- the storm bathroom from the thunder short, re-lit for a sunny morning, with a full bath ----------
function dayBath(sc, { water = true } = {}) {
  const R = bathroom(sc, { strikes: [] }); R.update = () => {};
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), hdr(2.2, 2.4, 2.6)); sky.position.set(0.7, 3.75, -0.975); sc.add(sky);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.0); sun.position.set(0.9, 6.5, -4.2); sun.target.position.set(0.4, 0.2, 1.5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 5; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); sc.add(sun, sun.target);
  sc.add(new THREE.HemisphereLight(0xeaf3ff, 0x8a7a68, 0.7)); R.warm.intensity = 11; R.bfill.intensity = 7; R.sun = sun;
  sc.traverse(o => { const m = o.material; if (m && m.isMeshStandardMaterial && m.roughness === 0.18 && m.map && m.bumpMap === m.map) m.color.set(0x9cc9c0); if (m && m.isMeshLambertMaterial && m.color.getHex() === 0xe8e2d6) m.color.set(0xf1e6d2); });
  if (water) {
    const td = R.tub.userData, tp = R.tub.position;
    const wm = new THREE.MeshPhysicalMaterial({ color: 0xcbe6ec, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.62, envMapIntensity: 1.6 });
    const wg = new THREE.PlaneGeometry(td.L - 0.26, td.Wd - 0.26, 80, 40);
    const w = new THREE.Mesh(wg, wm); w.rotation.x = -Math.PI / 2; w.position.set(tp.x, 0.6, tp.z); w.receiveShadow = true; sc.add(w); R.water = w;
    const base = Float32Array.from(wg.attributes.position.array);
    // ripples spreading from a point (tub-local x, z), from time t0
    R.ripple = (t, src) => { const p = wg.attributes.position; for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1]; let h = 0.004 * Math.sin(x * 7 + t * 1.3) * Math.sin(y * 9 - t); src.forEach(([sx, sz, t0, a]) => { const d = Math.hypot(x - sx, -y - sz), age = t - t0; if (age > 0) h += a * Math.exp(-2.5 * age) * Math.exp(-1.2 * d) * Math.sin(18 * (d - 0.9 * age)) * smooth(0, 0.08, 0.9 * age - d + 0.08); }); p.setZ(i, h); } p.needsUpdate = true; wg.computeVertexNormals(); };
    // suds along the edges
    const n = 300, bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.88, envMapIntensity: 1.5 }), n);
    const r = rng(44), o = new THREE.Object3D(); const CL = [[-1.25, 0.38], [-0.75, -0.42], [1.15, 0.36], [1.3, -0.4], [-1.05, -0.05], [0.95, 0.05], [0.25, -0.46]];
    for (let i = 0; i < n; i++) { const [cx, cz] = CL[Math.floor(r() * CL.length)], a = r() * 6.28, d = Math.sqrt(r()) * 0.26; o.position.set(tp.x + cx + Math.cos(a) * d, 0.6 + r() * 0.025, tp.z + cz + Math.sin(a) * d * 0.55); o.scale.setScalar(0.01 + r() * r() * 0.05); o.updateMatrix(); bub.setMatrixAt(i, o.matrix); }
    sc.add(bub);
  }
  return R;
}

// ---------- fur state: wet (darker, glossy, slicked flat), puff (fluffed up after the shake), fling (fur thrown sideways) ----------
// fling: a number, or a function of the furred mesh giving its own value (so each body part can lag)
function furState(obj, { wet = 0, puff = 0, fling = 0 } = {}) {
  obj.updateMatrixWorld(true); const dq = obj.getWorldQuaternion(new THREE.Quaternion()), q = new THREE.Quaternion(), side = new THREE.Vector3();
  obj.traverse(o => {
    const m = o.material; if (!m || Array.isArray(m)) return; const ud = m.userData;
    if (ud.U && ud.U.len0 !== undefined) {
      if (!ud.c0) ud.c0 = m.color.clone();
      m.color.copy(ud.c0).multiplyScalar(1 - 0.36 * wet);
      ud.U.uLen.value = ud.U.len0 * (1 - 0.5 * wet) * (1 + 0.85 * puff);
      const c = ud.U.uComb.value.copy(ud.U.comb0).multiplyScalar((1 + 1.1 * wet) * (1 - 0.85 * puff));
      const f = typeof fling === 'function' ? fling(o.parent) : fling;
      if (f) { o.parent.getWorldQuaternion(q); side.set(1, 0, 0).applyQuaternion(dq).applyQuaternion(q.invert()); c.addScaledVector(side, 1.7 * f); }
    } else if (m.isMeshPhysicalMaterial && m.bumpMap === FUR_BUMP) {
      if (!ud.w0) ud.w0 = { c: m.color.clone(), r: m.roughness, cc: m.clearcoat, sh: m.sheen };
      m.color.copy(ud.w0.c).multiplyScalar(1 - 0.32 * wet); m.roughness = lerp(ud.w0.r, 0.3, wet); m.clearcoat = lerp(ud.w0.cc, 0.7, wet); m.clearcoatRoughness = 0.2; m.sheen = lerp(ud.w0.sh, 0.25, wet);
    }
  });
}

// ---------- the shake: a twist that starts at the head and travels to the tail ----------
// a shake = { s0, dur, f (Hz), amp }. Lags are in seconds at 4.2 Hz (scaled for other rates).
const shakeEnv = (tau, sh) => smooth(sh.s0, sh.s0 + 0.16, tau) * (1 - smooth(sh.s0 + sh.dur - 0.3, sh.s0 + sh.dur, tau));
const LAG = { head: 0, neck: 0.03, chest: 0.045, torso: 0.06, hips: 0.085, tail: 0.11 };
const AMP = { head: 0.72, hyaw: 0.3, neck: 0.5, chest: 0.42, torso: 0.36, hips: 0.3, skin: 2.4 };
function shakeA(tau, shakes, lag, a) { let s = 0; for (const sh of shakes) { const tt = tau - lag * 4.2 / sh.f; s += a * (sh.amp ?? 1) * shakeEnv(tt, sh) * Math.sin(2 * Math.PI * sh.f * (tt - sh.s0)); } return s; }
function shakeW(tau, shakes, lag, a) { const e = 0.003; return (shakeA(tau + e, shakes, lag, a) - shakeA(tau - e, shakes, lag, a)) / (2 * e); }
const shakeK = (tau, shakes) => shakes.reduce((m, sh) => Math.max(m, shakeEnv(tau, sh)), 0);
// pose a standing dog mid-shake (call after the base pose; it solves the legs)
function shakePose(d, tau, shakes, { brace = 1 } = {}) {
  const u = d.userData, A = (p, a) => shakeA(tau, shakes, LAG[p], a), k = shakeK(tau, shakes);
  const f0 = shakes.length ? shakes[0].f : 4.2;
  const hr = A('head', AMP.head), hy = shakeA(tau + 0.25 / f0, shakes, LAG.head, AMP.hyaw);
  u.head.rotation.z += hr; u.head.rotation.y += hy; u.head.rotation.x += 0.1 * k; u.head.position.x += -0.06 * hr;
  [[u.neck, 'neck'], [u.chest, 'chest'], [u.torso, 'torso'], [u.hips, 'hips']].forEach(([m, p]) => { const r = A(p, AMP[p]); m.rotation.order = 'ZYX'; m.rotation.z = r; m.position.x += -0.07 * r; });
  const pr = A('hips', AMP.hips); u.thighs.forEach(m => m.position.x += -0.06 * pr);
  // ears fly out and trail the head; jowls flap; eyes squint
  const hw = shakeW(tau, shakes, LAG.head, AMP.head), hl = shakeA(tau - 0.045 * 4.2 / f0, shakes, LAG.head, AMP.head);
  const out = clamp(Math.abs(hw) * 0.075, 0, 1.25) * k;
  u.earsSet(-0.2 * k, 1.25 * (hl - hr), out, -out);
  u.mouth(0.06 + 0.12 * k * Math.abs(Math.sin(2 * Math.PI * f0 * tau * 2))); u.lid(clamp(0.1 + 0.6 * k));
  // the tail whips last
  const c = u.cfg.tail, b = V(c[0], c[1], c[2]), ts = (i) => shakeA(tau - 0.03 * i, shakes, LAG.tail, 0.4 * i);
  u.tail([b, b.clone().add(V(ts(1) * 0.32, -0.08, -0.22)), b.clone().add(V(ts(2) * 0.42, -0.2, -0.42)), b.clone().add(V(ts(3) * 0.5, -0.34, -0.55)), b.clone().add(V(ts(4) * 0.55, -0.48, -0.6))]);
  // legs braced a little wider, and the body bobs with each swing
  u.legs.forEach((L, i) => u.paw(i, L.T.clone().add(V(L.sx * 0.07 * brace * k, 0, 0)))); u.solve();
  d.position.y -= 0.018 * k * DS; d.position.x += -0.025 * A('torso', 1) * DS;
  u.tagSwing(1.2 * hr);
  return { k, hr, tr: A('torso', AMP.torso) };
}
// per-part fling for furState: the fur trails each part's swing
function shakeFling(d, tau, shakes) {
  const u = d.userData, map = new Map([[u.neck, 'neck'], [u.chest, 'chest'], [u.torso, 'torso'], [u.hips, 'hips']]);
  u.thighs.forEach(m => map.set(m, 'hips'));
  return (mesh) => { let p = map.get(mesh); if (!p) { let o = mesh; while (o && o !== d) { if (o === u.head) { p = 'head'; break; } o = o.parent; } } if (!p) p = 'torso'; return -0.065 * shakeW(tau, shakes, LAG[p] + 0.02, AMP[p] || 0.4); };
}

// ---------- a calm wet dog standing (no shake): sad brows, slow blinks, drips ----------
const blinkAt = (t, seed = 0) => { const P = 3.1 + seed * 0.37, a = (((t + seed * 1.13) % P) + P) % P; return a < 0.16 ? Math.sin(Math.PI * a / 0.16) : 0; };
function wetStand(d, t, { look = null, stand = 1, sad = 0.7, blink = 0, shiver = 0, perk = -0.3 } = {}) {
  const u = d.userData; u.pose(stand); u.solve().breathe(t, 0.02, 0.45);
  u.earsSet(perk, 0.02 * Math.sin(t * 2.1)); if (look) u.look(look, 0.85, 0, 1.1, 0.8).gaze(look);
  u.lid(clamp(0.22 + 0.9 * blinkAt(t, blink))).brows(sad).mouth(0);
  const c = u.cfg.tail, b = V(c[0], c[1], c[2]), w = 0.02 * Math.sin(t * 1.7);
  if (stand > 0.5) u.tail([b, b.clone().add(V(w, -0.12, -0.2)), b.clone().add(V(w, -0.32, -0.32)), b.clone().add(V(w * 2, -0.55, -0.36)), b.clone().add(V(w * 2, -0.72, -0.32))]); else tuckTail(u, stand, t);
  if (shiver) { u.head.rotation.z += 0.012 * shiver * Math.sin(t * 2 * Math.PI * 11); d.position.x += 0.002 * shiver * Math.sin(t * 2 * Math.PI * 9.3); }
  return u;
}

// ---------- flying water: each drop leaves at its own moment, then falls (closed form, so any frame renders on its own) ----------
function spray(sc, n = 700, { seed = 3, size = 1, opacity = 0.6 } = {}) {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x8fd0f6, roughness: 0.0, clearcoat: 1, clearcoatRoughness: 0.0, transparent: true, opacity, envMapIntensity: 3.6, depthWrite: false });
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat, n); im.frustumCulled = false; im.castShadow = false; sc.add(im);
  const r = rng(seed), D = []; for (let i = 0; i < n; i++) D.push({ a: r(), b: r(), c: r(), d: r(), e: r(), f: r(), s: (0.006 + 0.016 * r() * r()) * size });
  const o = new THREE.Object3D(), Z = V(0, 0, 1), vv = new THREE.Vector3(), G = V(0, -12.5, 0);
  return (tau, emit, { floorY = 0.02, life = 1.2, stretch = 0.045 } = {}) => {
    for (let i = 0; i < n; i++) {
      const e = emit(i, D[i]); let ok = false;
      if (e) {
        const a = tau - e.te;
        if (a > 0 && a < life) {
          o.position.copy(e.p).addScaledVector(e.v, a).addScaledVector(G, 0.5 * a * a);
          if (o.position.y > (e.floor ?? floorY)) { vv.copy(e.v).addScaledVector(G, a); const sp = vv.length(); if (sp > 1e-4) o.quaternion.setFromUnitVectors(Z, vv.multiplyScalar(1 / sp)); o.scale.set(D[i].s, D[i].s, D[i].s * (1 + stretch * sp * 6)); ok = true; }
        }
      }
      if (!ok) { o.position.set(0, -50, 0); o.scale.setScalar(1e-4); }
      o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  };
}
// where the drops leave a shaking dog (rest pose of a standing dog, dog-local), mapped to world space.
// drip: { t0, t1, frac, floor } also lets some drops simply drip off the belly, chin and ears.
function dogEmitter(d, shakes, { drip = null, gain = 1 } = {}) {
  d.updateMatrixWorld(true); const M4 = d.matrixWorld.clone(), Q = d.getWorldQuaternion(new THREE.Quaternion()), S = d.getWorldScale(new THREE.Vector3()).x;
  return (i, R) => {
    if (drip && R.e < drip.frac) {
      const te = drip.t0 + R.a * (drip.t1 - drip.t0), w = R.b;
      const p = w < 0.6 ? V((R.c - 0.5) * 0.4, 0.8, lerp(-0.7, 0.35, R.d)) : w < 0.8 ? V((R.c - 0.5) * 0.12, 1.6, 1.2) : V((R.c < 0.5 ? -1 : 1) * 0.42, 1.38, 0.82);
      return { te, p: p.applyMatrix4(M4), v: V(0, -0.15 - 0.3 * R.f, 0), floor: drip.floor };
    }
    if (!shakes.length) return null;
    const sh = shakes[Math.min(shakes.length - 1, Math.floor(R.f * shakes.length))];
    const te = sh.s0 + 0.05 + (sh.dur - 0.22) * Math.pow(R.a, 1.4);
    const part = R.b < 0.6 ? 'torso' : R.b < 0.8 ? 'head' : R.b < 0.9 ? 'ear' : 'tail';
    let c, rad, lag, amp;
    if (part === 'torso') { const z = lerp(-0.85, 0.5, R.c); c = V(0, 1.2 + 0.16 * clamp((z + 0.1) / 0.6), z); rad = 0.5; lag = lerp(LAG.hips, LAG.chest, R.c); amp = AMP.torso * AMP.skin; }
    else if (part === 'head') { c = V(0, 1.9, 0.86 + 0.25 * R.c); rad = 0.4; lag = LAG.head; amp = AMP.head * 1.3; }
    else if (part === 'ear') { c = V(0, 1.75, 0.8); rad = 0.62; lag = LAG.head - 0.04; amp = AMP.head * 1.8; }
    else { c = V(0, 1.15 - 0.3 * R.c, -1.3 - 0.35 * R.c); rad = 0.15; lag = LAG.tail + 0.03 * R.c * 4; amp = 1.6; }
    const roll = shakeA(te, shakes, lag, amp), w = shakeW(te, shakes, lag, amp);
    const al = part === 'ear' ? (R.d < 0.5 ? -1 : 1) * (1.8 + 0.4 * R.c) : (R.d - 0.5) * 3.7, be = al + roll;
    const P = V(-Math.sin(be) * rad, Math.cos(be) * rad, 0).add(c);
    const tang = V(-Math.cos(be), -Math.sin(be), 0), out = V(-Math.sin(be), Math.cos(be), 0);
    const v = tang.multiplyScalar(w * rad * 0.42 * gain).addScaledVector(out, (0.5 + 0.9 * R.c) * gain).add(V(0, 0.4 + 0.5 * R.e, (R.d - 0.5) * 0.4));
    return { te, p: P.applyMatrix4(M4), v: v.applyQuaternion(Q).multiplyScalar(S) };
  };
}

// ---------- water drops landing on the camera lens ----------
const LENS_T = canvasTex(256, 256, (g, w, h) => {
  const gr = g.createRadialGradient(128, 128, 20, 128, 128, 124); gr.addColorStop(0, 'rgba(225,240,255,0.10)'); gr.addColorStop(0.75, 'rgba(200,225,245,0.22)'); gr.addColorStop(0.93, 'rgba(40,60,80,0.45)'); gr.addColorStop(1, 'rgba(40,60,80,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.arc(128, 128, 92, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
  const g2 = g.createRadialGradient(160, 172, 2, 160, 172, 50); g2.addColorStop(0, 'rgba(255,250,235,0.85)'); g2.addColorStop(1, 'rgba(255,250,235,0)'); g.fillStyle = g2; g.beginPath(); g.arc(160, 172, 50, 0, 7); g.fill();
});
function lensDrops(sc, hits) {
  const ms = hits.map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: LENS_T, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); m.renderOrder = 20; m.userData.noDof = true; m.visible = false; sc.add(m); return m; });
  return (cam, t) => hits.forEach((h, i) => {
    const m = ms[i], a = t - h.t; m.visible = a > 0 && a < 2.2; if (!m.visible) return;
    pin(cam, m, h.x, h.y - 0.006 * a * a, 0.5); m.scale.set(h.s * (0.55 + 0.45 * E.out(clamp(a / 0.06))), h.s * (0.55 + 0.45 * E.out(clamp(a / 0.06))) * (1 + 0.08 * a), 1);
    m.material.opacity = 1 - smooth(1.5, 2.2, a);
  });
}

// ---------- steam rising off a wet back ----------
const STEAM_T = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
function steam(sc, n = 34, seed = 5) {
  const r = rng(seed), P = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: STEAM_T, transparent: true, depthWrite: false, opacity: 0 })); sc.add(m); P.push({ m, x: r() - 0.5, z: r(), ph: r(), sp: 0.8 + 0.4 * r() }); }
  // anchor(x 0..1 across, z 0..1 along) -> world point on the back; k: amount
  return (t, cam, anchor, k = 1) => P.forEach((q, i) => {
    const ph = ((t * 0.55 * q.sp + q.ph) % 1 + 1) % 1, base = anchor(q.x, q.z);
    q.m.position.copy(base).add(V(fbm(t * 0.4 + i, 1) * 0.12, ph * 0.55, fbm(t * 0.4 + i, 2) * 0.12));
    q.m.quaternion.copy(cam.quaternion); q.m.scale.setScalar(0.12 + 0.3 * ph); q.m.material.opacity = 0.2 * k * Math.sin(Math.PI * ph);
  });
}

// ---------- a bowl of kibble; a fifth of it can burn away ----------
function kibbleBowl(sc, pos, r = 0.3, n = 170) {
  const bowl = ceramicBowl(r); bowl.position.copy(pos); sc.add(bowl);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat, n); im.castShadow = true; im.frustumCulled = false; sc.add(im);
  const rr = rng(9), K = [], o = new THREE.Object3D(), col = new THREE.Color(), WEDGE = Math.PI * 2 / 5;
  for (let i = 0; i < n; i++) {
    const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * r * 0.8, layer = Math.floor(rr() * 3);
    K.push({ a, p: V(pos.x + Math.cos(a) * d, pos.y + r * 0.14 + 0.02 + layer * 0.022 + 0.04 * (1 - d / r), pos.z + Math.sin(a) * d), rot: V(rr() * 6, rr() * 6, rr() * 6), s: 0.02 + rr() * 0.009, c: col.setHSL(0.065 + rr() * 0.02, 0.62, 0.11 + rr() * 0.07).clone(), del: rr() });
  }
  const hot = new THREE.Color(1.0, 0.45, 0.12);
  // burn (0..1): the wedge of kibble glows, lifts and vanishes, one piece after another
  const update = (burn, a0 = -0.6) => K.forEach((k, i) => {
    const inW = ((k.a - a0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) < WEDGE, b = inW ? clamp((burn * 1.4 - k.del * 0.4)) : 0;
    o.position.copy(k.p).add(V(0, 0.25 * E.in(b), 0)); o.rotation.set(k.rot.x + 3 * b, k.rot.y, k.rot.z); o.scale.set(k.s * 1.3, k.s, k.s * 1.1).multiplyScalar(Math.max(1e-4, 1 - E.in(b)));
    o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.copy(k.c).lerp(hot, clamp(b * 3)));
  });
  update(0); im.instanceMatrix.needsUpdate = true;
  return { bowl, im, update: (b, a0) => { update(b, a0); im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; }, WEDGE };
}

// ---------- a 2D card drawn every frame: water left in the fur and a stopwatch ----------
function gaugeCard(w = 0.36) {
  const cd = canvasDyn(512, 600), g = cd.g;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 600 / 512), new THREE.MeshBasicMaterial({ map: cd.t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); m.renderOrder = 15; m.userData.noDof = true;
  m.userData.draw = (gone, secs) => {
    g.clearRect(0, 0, 512, 600);
    const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
    g.fillStyle = 'rgba(0,0,0,0.2)'; rr(14, 18, 484, 568, 60); g.fill(); g.fillStyle = 'rgba(255,255,255,0.94)'; rr(8, 8, 484, 568, 60); g.fill();
    // a drop that empties
    const dx = 160, dy = 330, R = 112, drop = () => { g.beginPath(); g.moveTo(dx, dy - R * 1.75); g.bezierCurveTo(dx + R * 0.35, dy - R * 1.1, dx + R, dy - R * 0.55, dx + R, dy); g.arc(dx, dy, R, 0, Math.PI); g.bezierCurveTo(dx - R, dy - R * 0.55, dx - R * 0.35, dy - R * 1.1, dx, dy - R * 1.75); g.closePath(); };
    drop(); g.fillStyle = '#e8eef2'; g.fill(); g.save(); drop(); g.clip(); const top = dy + R - (R * 2.75) * (1 - gone); const gr = g.createLinearGradient(0, top, 0, dy + R); gr.addColorStop(0, '#58c6f2'); gr.addColorStop(1, '#1e86d0'); g.fillStyle = gr; g.fillRect(0, top, 512, 600); g.restore();
    drop(); g.lineWidth = 10; g.strokeStyle = '#1e86d0'; g.stroke();
    g.fillStyle = '#18324a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 54px "Arial Black", Arial, sans-serif'; g.fillText('GONE', 380, 150);
    g.font = '900 108px "Arial Black", Arial, sans-serif'; g.fillStyle = '#e8572f'; g.fillText(Math.round(gone * 100) + '%', 368, 250);
    g.fillStyle = '#18324a'; g.font = '900 76px "Arial Black", Arial, sans-serif'; g.fillText(secs.toFixed(1) + ' s', 368, 400);
    g.strokeStyle = '#18324a'; g.lineWidth = 9; g.beginPath(); g.arc(256, 512, 0, 0, 1); g.stroke();
    cd.t.needsUpdate = true;
  };
  m.userData.draw(0, 0); return m;
}

// ---------- a glowing line down the spine with a pulse that runs head -> tail ----------
function spineWave(d) {
  const P = [V(0, 2.12, 0.95), V(0, 2.02, 0.55), V(0, 1.78, 0.3), V(0, 1.72, -0.1), V(0, 1.7, -0.5), V(0, 1.66, -0.85), V(0, 1.45, -1.2), V(0, 1.2, -1.55), V(0, 0.95, -1.75)];
  const mat = new THREE.ShaderMaterial({
    uniforms: { p: { value: -1 }, fade: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float p; uniform float fade; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float d=vUv.x-p; float g=exp(-pow(d/0.06,2.))+0.55*exp(-pow(min(0.,d)/0.22,2.))*step(d,0.); float rim=0.55+0.45*pow(1.-abs(dot(vN,vV)),1.2);
        vec3 c=vec3(0.16,0.42,0.95)*0.8*rim+vec3(1.0,0.62,0.12)*g*1.15; gl_FragColor=vec4(c*fade,1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 120, 0.05, 12, false), mat); m.renderOrder = 12; m.userData.noDof = true; d.add(m);
  return m;
}

// ---------- two arcs over the back, from behind: how far the body turns vs how far the loose skin swings ----------
function swingArcs() {
  const g = new THREE.Group(), mk = (r, col) => {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.028, 8, 80, Math.PI * 1.2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthTest: false, depthWrite: false, toneMapped: false })); arc.rotation.z = Math.PI / 2 - Math.PI * 0.6; arc.renderOrder = 13; g.add(arc);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.3), depthTest: false, toneMapped: false })); dot.renderOrder = 14; g.add(dot);
    return { arc, dot, r };
  };
  const body = mk(0.6, 0xffffff), skin = mk(0.86, 0xffa23a);
  const lb = textPlane('BODY', 0.42, '#ffffff', '#1a2a3a'), ls = textPlane('SKIN', 0.42, '#ffb050', '#1a2a3a');
  [lb, ls].forEach(l => { l.material.depthTest = false; l.renderOrder = 16; l.rotation.y = Math.PI; g.add(l); });
  g.traverse(o => { o.userData.noDof = true; });
  g.userData.set = (aBody, aSkin, k = 1) => {
    body.dot.position.set(-Math.sin(aBody) * body.r, Math.cos(aBody) * body.r, 0); skin.dot.position.set(-Math.sin(aSkin) * skin.r, Math.cos(aSkin) * skin.r, 0);
    lb.position.set(0, body.r - 0.17, 0); ls.position.set(0, skin.r + 0.16, 0);
    [body, skin].forEach(o => { o.arc.material.opacity = 0.55 * k; o.dot.scale.setScalar(Math.max(1e-4, k)); }); lb.material.opacity = ls.material.opacity = k;
  };
  g.userData.set(0, 0, 0); return g;
}

// ---------- a towel held up in front of you ----------
function towel(w = 0.95, h = 1.35) {
  const tex = canvasTex(256, 384, (g, W, H) => { g.fillStyle = '#3f9fa3'; g.fillRect(0, 0, W, H); g.fillStyle = '#f4efe2'; [0.78, 0.84, 0.9].forEach(y => g.fillRect(0, H * y, W, H * 0.025)); noiseFill(g, W, H, 7, 26); });
  const geo = new THREE.PlaneGeometry(w, h, 24, 36); geo.translate(0, -h / 2, 0); const base = Float32Array.from(geo.attributes.position.array);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, bumpMap: WEAVE, bumpScale: 3, side: THREE.DoubleSide })); m.castShadow = true;
  m.userData.drape = (t) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], k = -y / h; p.setZ(i, (0.05 * Math.sin(x * 11 + 0.5) + 0.03 * Math.sin(x * 23 + t * 1.5)) * (0.3 + k) + 0.05 * k * k * Math.sin(t * 1.2)); p.setX(i, x * (1 - 0.12 * k)); } p.needsUpdate = true; geo.computeVertexNormals(); };
  m.userData.drape(0); return m;
}
