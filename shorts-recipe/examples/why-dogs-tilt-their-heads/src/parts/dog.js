// =====================================================================
// THE DOG: a golden retriever. IK legs, sit / stand poses, a long muzzle with a jaw,
// big brown eyes with brows, floppy ears that hang against the head tilt, a feathered wagging tail
// =====================================================================
const DOGCFG = {
  //        x  y     z     sx    sy    sz    rx
  sit:   { hips: [0, 0.58, -0.34, 0.5, 0.46, 0.6, 0], torso: [0, 1.06, -0.04, 0.44, 0.8, 0.5, 0.28], chest: [0, 1.1, 0.24, 0.33, 0.52, 0.26, 0.2], neck: [0, 1.62, 0.14, 0.3, 0.36, 0.32, 0.3], head: [0, 2.02, 0.24], sh: [0.2, 1.18, 0.2], hj: [0.28, 0.58, -0.32], th: [0.33, 0.46, -0.16, 0.3, 0.42, 0.5, 0], tail: [0, 0.32, -0.86], fp: [0.19, 0.03, 0.44], hp: [0.4, 0.03, 0.16] },
  stand: { hips: [0, 1.16, -0.72, 0.44, 0.44, 0.5, 0], torso: [0, 1.22, -0.08, 0.44, 0.84, 0.48, 1.52], chest: [0, 1.06, 0.5, 0.31, 0.4, 0.3, 0.5], neck: [0, 1.5, 0.62, 0.28, 0.36, 0.3, 0.6], head: [0, 1.9, 0.86], sh: [0.2, 1.16, 0.48], hj: [0.24, 1.12, -0.72], th: [0.25, 0.96, -0.72, 0.25, 0.38, 0.34, 0], tail: [0, 1.3, -1.18], fp: [0.2, 0.03, 0.56], hp: [0.25, 0.03, -0.74] },
};
function makeDog({ base = '#d89a52', light = '#f2d39e', seed = 3, iris = [0xe0a258, 0x9a5a22], snout = 1.0, earLen = 1.0 } = {}) {
  const fur = furMat(base, base, seed, false), furL = furMat(light, light, seed + 1, false), furEar = furMat(base, base, seed + 2, false);
  [fur, furL, furEar].forEach(m => { m.sheenRoughness = 0.4; m.bumpScale = 1.4; });
  furEar.color.multiplyScalar(0.86);
  const nose = new THREE.MeshPhysicalMaterial({ color: 0x1b1412, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, bumpMap: WEAVE_FINE, bumpScale: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.5 });
  const dog = new THREE.Group();
  const add = (m, p, parent = dog) => { m.castShadow = true; m.receiveShadow = true; if (p) m.position.copy(p); parent.add(m); return m; };
  const sph = (r, mat, seg = 40) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.66)), mat);
  const hips = add(sph(1, fur, 48)), torso = add(sph(1, fur, 56)), chest = add(sph(1, furL, 40)), neck = add(sph(1, fur, 32));
  const thighs = [-1, 1].map(() => add(sph(1, fur, 36)));
  [hips, torso, neck, ...thighs].forEach(m => { m.scale.setScalar(0.5); addFur(m, 0.08, { comb: V(0, -1, -0.3).normalize(), freq: 420 }); });
  chest.scale.setScalar(0.4); addFur(chest, 0.12, { comb: V(0, -1, 0.2).normalize(), freq: 300 });
  // legs: 0 front-right (-x), 1 front-left (+x), 2 hind-right, 3 hind-left  (the dog faces +z, so its left is +x)
  const mkLeg = (front, sx) => {
    const l1 = front ? 0.6 : 0.58, l2 = front ? 0.58 : 0.56;
    const up = new THREE.Group(); dog.add(up);
    addFur(add(new THREE.Mesh(new THREE.CapsuleGeometry(front ? 0.13 : 0.16, l1 - 0.1, 8, 24), fur), V(0, -l1 / 2, 0), up), 0.06, { freq: 420 });
    const lo = new THREE.Group(); lo.position.set(0, -l1, 0); up.add(lo);
    addFur(add(new THREE.Mesh(new THREE.CapsuleGeometry(front ? 0.11 : 0.105, l2 - 0.06, 8, 24), fur), V(0, -l2 / 2, 0), lo), front ? 0.05 : 0.04, { freq: 420 });
    const paw = new THREE.Group(); paw.position.set(0, -l2, 0); lo.add(paw);
    const pm = add(sph(1, fur, 28), V(0, 0.06, 0.06), paw); pm.scale.set(0.15, 0.1, 0.2); addFur(pm, 0.02, { freq: 200 });
    [-1.5, -0.5, 0.5, 1.5].forEach(k => { const t = add(sph(0.05, fur, 16), V(k * 0.058, 0.035, 0.21 - Math.abs(k) * 0.025), paw); t.scale.set(1, 0.85, 1.2); const nl = add(new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 8), dark), V(k * 0.058, 0.03, 0.26 - Math.abs(k) * 0.025), paw); nl.rotation.x = Math.PI / 2; });
    return { up, lo, paw, l1, l2, front, sx, T: V(0, 0, 0), pitch: 0 };
  };
  const legs = [mkLeg(true, -1), mkLeg(true, 1), mkLeg(false, -1), mkLeg(false, 1)];
  // ---- head
  const head = new THREE.Group(); head.rotation.order = 'YXZ'; dog.add(head);
  addFur(add(sph(0.4, fur, 56), V(0, 0.06, 0), head), 0.045, { comb: V(0, -0.3, -1).normalize(), short: new THREE.Vector4(0, -0.1, 0.42, 0.42), freq: 420 }).scale.set(1.0, 0.95, 1.05);
  [-1, 1].forEach(sx => addFur(add(sph(0.21, fur, 32), V(sx * 0.2, -0.08, 0.16), head), 0.055, { comb: V(sx * 0.6, -0.8, -0.2).normalize(), freq: 420 }));
  const muz = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.44 * snout, 12, 32), furL), V(0, -0.14, 0.44 + 0.15 * (snout - 1)), head); muz.rotation.x = Math.PI / 2 - 0.1; muz.scale.set(1.0, 0.92, 0.95);
  const bridge = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3 * snout, 10, 24), fur), V(0, -0.03, 0.42 + 0.12 * (snout - 1)), head); bridge.rotation.x = Math.PI / 2 - 0.22; bridge.scale.set(1.1, 0.8, 1); addFur(bridge, 0.022, { freq: 520, comb: V(0, 0, -1) }); addFur(muz, 0.016, { freq: 520, comb: V(0, -0.4, -1).normalize() });
  const tipZ = 0.82 + 0.38 * (snout - 1);
  const noseM = add(sph(1, nose, 32), V(0, -0.045, tipZ - 0.035), head); noseM.scale.set(0.072, 0.052, 0.058);
  [-1, 1].forEach(sx => { const n = add(sph(0.014, dark, 10), V(sx * 0.03, -0.055, tipZ + 0.012), head); n.scale.set(1, 0.6, 0.6); });
  const phil = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.03, 4, 8), dark), V(0, -0.11, tipZ - 0.04), head); phil.rotation.x = -0.25;
  [-1, 1].forEach(sx => { const m = add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.0055, 6, 20, Math.PI * 0.5), dark), V(sx * 0.055, -0.185, tipZ - 0.06), head); m.rotation.set(0.25, sx * 0.9, sx > 0 ? Math.PI + 0.5 : -0.5); });
  // jaw, mouth and tongue
  const jaw = new THREE.Group(); jaw.position.set(0, -0.22, 0.22); head.add(jaw);
  const chin = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.34 * snout, 10, 24), furL), V(0, -0.02, 0.28 + 0.12 * (snout - 1)), jaw); chin.rotation.x = Math.PI / 2; chin.scale.set(1.1, 0.75, 1); addFur(chin, 0.018, { freq: 520 });
  const mouthM = new THREE.MeshStandardMaterial({ color: 0x5c1a26, roughness: 0.5 }), tongueM = new THREE.MeshPhysicalMaterial({ color: 0xe46a7c, roughness: 0.32, clearcoat: 0.5 });
  const cav = add(sph(1, mouthM, 28), V(0, -0.24, 0.55), head); cav.scale.set(0.12, 0.05, 0.26); cav.castShadow = false; cav.visible = false;
  const tongue = add(sph(1, tongueM, 24), V(0, 0.02, 0.24), jaw); tongue.scale.set(0.085, 0.022, 0.18); tongue.castShadow = false; tongue.visible = false;
  // eyes, lids, brows
  const eyeM = catEyeMat(iris[0], iris[1]); eyeM.userData.U.uP.value = 0.42; eyeM.envMapIntensity = 0.12; eyeM.clearcoat = 0.25; eyeM.roughness = 0.12;
  const eyes = [], lids = [], brows = [], glints = [];
  [-1, 1].forEach(sx => {
    const EP = V(sx * 0.155, 0.11, 0.31);
    const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.084, 40, 28), eyeM), EP, head); e.rotation.order = 'YXZ'; e.rotation.y = sx * 0.25; e.userData.ry = sx * 0.25; e.castShadow = false; eyes.push(e);
    
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); gl.position.set(sx * 0.155 + sx * 0.012 - 0.02, 0.142, 0.388); gl.scale.setScalar(0.85); head.add(gl); glints.push(gl);
    const lid = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), fur), EP, head); lid.rotation.order = 'YXZ'; lid.rotation.y = sx * 0.25; lids.push(lid); addFur(lid, 0.012, { freq: 240 });
    const ls = new THREE.Mesh(new THREE.TorusGeometry(0.091, 0.006, 6, 30, Math.PI), dark); ls.rotation.x = Math.PI / 2; lid.add(ls);
    const br = add(sph(1, fur, 20), V(sx * 0.15, 0.215, 0.3), head); br.scale.set(0.07, 0.028, 0.045); br.userData.y = 0.215; br.userData.sx = sx; brows.push(br);
  });
  // floppy ears, hinged at the top of the skull
  const ears = [-1, 1].map(sx => {
    const piv = new THREE.Group(); piv.position.set(sx * 0.34, 0.24, -0.04); head.add(piv);
    const g = new THREE.SphereGeometry(1, 32, 20); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) * (1 - 0.35 * Math.max(0, y))); p.setX(i, p.getX(i) * (1 + 0.15 * Math.max(0, -y))); } g.computeVertexNormals();
    const ear = add(new THREE.Mesh(g, furEar), V(sx * 0.03, -0.27 * earLen, 0.04), piv); ear.scale.set(0.06, 0.3 * earLen, 0.17); addFur(ear, 0.06, { comb: V(0, -1, 0), freq: 320 });
    return { piv, sx };
  });
  // collar with a little tag
  const collar = add(new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 12, 48), new THREE.MeshPhysicalMaterial({ color: 0xc8322a, roughness: 0.45, clearcoat: 0.4 })), null);
  const tag = new THREE.Group(); collar.add(tag); const tg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 24), new THREE.MeshPhysicalMaterial({ color: 0xe6c060, metalness: 1, roughness: 0.25 })), V(0, -0.07, 0), tag); tg.rotation.x = Math.PI / 2;
  const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.005, 6, 12), M.chrome), V(0, -0.012, 0), tag);
  // tail (rebuilt every frame)
  const tailM = new THREE.Mesh(new THREE.BufferGeometry(), fur); tailM.castShadow = true; addFur(tailM, 0.1, { comb: V(0, -1, 0), freq: 300 }); dog.add(tailM);
  let cfg = null; const mix = (a, b, w) => a.map((v, i) => v * (1 - w) + b[i] * w);
  const place = (m, a) => { m.position.set(a[0], a[1], a[2]); m.scale.set(a[3], a[4], a[5]); m.rotation.set(a[6] || 0, 0, 0); };
  const api = {
    head, eyes, lids, legs, hips, torso, jaw, ears, fur, collar, tipZ,
    pose(stand = 0) {
      cfg = {}; Object.keys(DOGCFG.sit).forEach(k => cfg[k] = mix(DOGCFG.sit[k], DOGCFG.stand[k], stand));
      place(hips, cfg.hips); place(torso, cfg.torso); place(chest, cfg.chest); place(neck, cfg.neck);
      thighs.forEach((m, i) => { const sx = i ? 1 : -1; m.position.set(sx * cfg.th[0], cfg.th[1], cfg.th[2]); m.scale.set(cfg.th[3], cfg.th[4], cfg.th[5]); });
      head.position.set(cfg.head[0], cfg.head[1], cfg.head[2]); head.rotation.set(0, 0, 0);
      collar.position.set(cfg.neck[0], cfg.neck[1] - 0.06, cfg.neck[2] + 0.02); collar.rotation.set(Math.PI / 2 - 0.35 - 0.4 * stand, 0, 0);
      legs.forEach(L => { const j = L.front ? cfg.sh : cfg.hj, p = L.front ? cfg.fp : cfg.hp; L.up.position.set(L.sx * j[0], j[1], j[2]); L.T.set(L.sx * p[0], p[1], p[2]); L.pitch = 0; });
      api.cfg = cfg; return api;
    },
    paw(i, p, pitch = 0) { legs[i].T.copy(p); legs[i].pitch = pitch; return api; },
    solve() {
      legs.forEach(L => {
        const { q1, q2 } = solve2(L.up.position, L.T, L.front ? V(L.sx * 0.1, 0, -1) : V(L.sx * 0.3, 0, 1), L.l1, L.l2);
        L.up.quaternion.copy(q1); L.lo.quaternion.copy(q1.clone().invert().multiply(q2));
        L.paw.quaternion.copy(q2.clone().invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(L.pitch, 0, 0))));
      });
      return api;
    },
    // head toward a world point; tilt = the head tilt (roll), positive toward the dog's left
    look(target, k = 1, tilt = 0, maxYaw = 1.1, maxPitch = 0.8) {
      dog.updateMatrixWorld(true); const d = dog.worldToLocal(target.clone()).sub(head.position);
      const yaw = clamp(Math.atan2(d.x, d.z), -maxYaw, maxYaw), pitch = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -maxPitch, maxPitch);
      head.rotation.set(pitch * k, yaw * k, -tilt); return api;
    },
    gaze(target) { dog.updateMatrixWorld(true); eyes.forEach(e => { const d = head.worldToLocal(target.clone()).sub(e.position); e.rotation.set(clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.35, 0.35), clamp(Math.atan2(d.x, d.z), e.userData.ry - 0.5, e.userData.ry + 0.5), 0); }); return api; },
    lid(k) { lids.forEach(l => l.rotation.x = lerp(-0.9, 1.45, k)); glints.forEach(g => g.visible = k < 0.6); return api; },
    // brows up (worried / curious puppy look), one side more than the other when tilting
    brows(k, asym = 0) { brows.forEach(b => { const kk = k + asym * b.userData.sx; b.position.y = b.userData.y + 0.03 * kk; b.rotation.z = -b.userData.sx * 0.3 * kk; }); return api; },
    // ears: perk lifts them at the base; swing turns them about the head's forward axis (to hang against a tilt)
    earsSet(perk = 0, swing = 0, flapL = 0, flapR = 0) { ears.forEach(({ piv, sx }) => { piv.rotation.set(-0.25 * perk + 0.12, 0.25 * sx * perk, sx * (0.18 + 0.55 * perk) + swing + (sx > 0 ? flapL : flapR)); }); return api; },
    mouth(k) { k = clamp(k); jaw.rotation.x = 0.5 * k; cav.visible = tongue.visible = k > 0.03; cav.scale.set(0.12, 0.04 + 0.1 * k, 0.26); cav.position.set(0, -0.245 - 0.05 * k, 0.55 + 0.12 * (snout - 1)); return api; },
    pant(k) { tongue.visible = true; tongue.position.set(0, -0.01 - 0.03 * k, 0.24 + 0.1 * k); tongue.scale.set(0.08, 0.02, 0.17 + 0.04 * k); return api; },
    tail(pts) {
      const curve = new THREE.CatmullRomCurve3(pts); const TS = 40, RS = 12, geo = new THREE.TubeGeometry(curve, TS, 0.1, RS, false), p = geo.attributes.position;
      for (let j = 0; j <= TS; j++) { const c = curve.getPointAt(j / TS), f = 1 - 0.55 * j / TS; for (let k = 0; k <= RS; k++) { const idx = j * (RS + 1) + k; p.setXYZ(idx, c.x + (p.getX(idx) - c.x) * f, c.y + (p.getY(idx) - c.y) * f, c.z + (p.getZ(idx) - c.z) * f); } }
      geo.computeVertexNormals(); tailM.geometry.dispose(); tailM.geometry = geo; (tailM.userData.shells || []).forEach(sh => sh.geometry = geo); return api;
    },
    // a happy wag: speed in wags per second, amt 0..1
    wag(t, speed = 2.5, amt = 0.6) {
      const b = V(cfg.tail[0], cfg.tail[1], cfg.tail[2]), s = Math.sin(t * 2 * Math.PI * speed) * amt, s2 = Math.sin(t * 2 * Math.PI * speed - 0.9) * amt, up = cfg.tail[1] > 0.8;
      if (up) return api.tail([b, b.clone().add(V(s * 0.12, 0.18, -0.25)), b.clone().add(V(s * 0.4, 0.42, -0.45)), b.clone().add(V(s2 * 0.7, 0.62, -0.5)), b.clone().add(V(s2 * 0.95, 0.72, -0.42))]);
      return api.tail([b, b.clone().add(V(s * 0.1, -0.12, -0.22)), b.clone().add(V(s * 0.45, -0.24, -0.4)), b.clone().add(V(s2 * 0.75, -0.3, -0.42)), b.clone().add(V(s2 * 1.0, -0.32, -0.3))]);
    },
    breathe(t, amp = 0.02, rate = 0.4) { const k = Math.sin(t * 2 * Math.PI * rate); torso.scale.x *= 1 + amp * k; torso.scale.z *= 1 + amp * k; chest.scale.z *= 1 + amp * 1.5 * k; return api; },
    // the collar tag swings with the motion
    tagSwing(a) { tag.rotation.set(a, 0, 0.6 * a); return api; },
    W(v) { dog.updateMatrixWorld(true); return dog.localToWorld(v.clone()); },
    eyeW() { dog.updateMatrixWorld(true); return head.localToWorld(V(0, 0.1, 0.36)); },
    noseW() { dog.updateMatrixWorld(true); return head.localToWorld(V(0, -0.06, tipZ + 0.06)); },
    pawW(i) { dog.updateMatrixWorld(true); return legs[i].paw.getWorldPosition(new THREE.Vector3()); },
  };
  dog.userData = api; api.pose(0).solve().lid(0.1).brows(0).earsSet(0).mouth(0).wag(0, 2, 0.3);
  return dog;
}
// ear swing that trails the head tilt (gravity + a little overshoot), from a tilt function of time
function earSwing(tiltFn, t) { const lag = 0.07, a = tiltFn(t - lag), b = tiltFn(t - 2 * lag), c = tiltFn(t - 3 * lag); return 0.85 * a + 0.35 * (a - b) - 0.15 * (b - c); }

// ---------- dog toys ----------
function toyDuck(s = 1) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 20), M.duck); b.scale.set(1, 0.8, 1.25); b.position.y = 0.12; const h = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 18), M.duck); h.position.set(0, 0.29, 0.12); const bk = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), M.beak); bk.scale.set(1.2, 0.45, 1.3); bk.position.set(0, 0.27, 0.22); const e = [-1, 1].map(sx => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), M.black); m.position.set(sx * 0.05, 0.32, 0.2); return m; }); g.add(b, h, bk, ...e); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g; }
function toyBall(s = 1) { const t = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#d7e64a'; c.fillRect(0, 0, w, h); noiseFill(c, w, h, 2, 20); c.strokeStyle = '#f6f6ee'; c.lineWidth = 9; c.beginPath(); for (let x = 0; x <= w; x += 4) { const y = h / 2 + Math.sin(x / w * Math.PI * 4) * h * 0.28; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }); const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 20), new THREE.MeshLambertMaterial({ map: t, bumpMap: WEAVE_FINE, bumpScale: 2 })); m.position.y = 0.11; m.castShadow = true; const g = new THREE.Group(); g.add(m); g.scale.setScalar(s); return g; }
function toyRope(s = 1) { const g = new THREE.Group(); const cols = [0x2f7fc8, 0xf2f2ee, 0xd8402f]; for (let i = 0; i < 3; i++) { const pts = []; for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI * 6 + i * 2.09; pts.push(V(-0.32 + k / 20 * 0.64, 0.05 + Math.cos(a) * 0.025, Math.sin(a) * 0.025)); } const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.028, 8), new THREE.MeshLambertMaterial({ color: cols[i], bumpMap: WEAVE_FINE, bumpScale: 2 })); m.castShadow = true; g.add(m); } [-0.34, 0.34].forEach(x => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshLambertMaterial({ color: 0xf2f2ee, bumpMap: WEAVE_FINE, bumpScale: 2 })); k.position.set(x, 0.06, 0); k.castShadow = true; g.add(k); }); g.scale.setScalar(s); return g; }
function toyBone(s = 1) { const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0x5fb8e8, roughness: 0.35, clearcoat: 0.6 }); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 20), m); c.rotation.z = Math.PI / 2; c.position.y = 0.06; g.add(c); [-0.2, 0.2].forEach(x => [-0.05, 0.05].forEach(z => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 14), m); b.position.set(x, 0.06, z); g.add(b); })); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g; }
function toyBunny(s = 1) { const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0xf4b6c8, bumpMap: WEAVE_FINE, bumpScale: 2.5 }); const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), m); b.position.y = 0.13; b.scale.set(1, 1.1, 0.9); const h = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), m); h.position.y = 0.33; [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 6, 12), m); e.position.set(sx * 0.045, 0.48, 0); e.rotation.z = -sx * 0.2; g.add(e); const ey = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.black); ey.position.set(sx * 0.035, 0.35, 0.09); g.add(ey); }); g.add(b, h); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g; }
function toyFrog(s = 1) { const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0x5cc85a, roughness: 0.4, clearcoat: 0.5 }); const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), m); b.scale.set(1.2, 0.7, 1); b.position.y = 0.1; g.add(b); [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), m); e.position.set(sx * 0.07, 0.2, 0.06); const p = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), M.black); p.position.set(sx * 0.07, 0.22, 0.1); g.add(e, p); }); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(s); return g; }
function toyRing(s = 1) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.05, 16, 40), new THREE.MeshPhysicalMaterial({ color: 0xff8a2a, roughness: 0.4, clearcoat: 0.4 })); m.rotation.x = Math.PI / 2; m.position.y = 0.05; m.castShadow = true; const g = new THREE.Group(); g.add(m); g.scale.setScalar(s); return g; }
const TOYS = { DUCK: toyDuck, BALL: toyBall, ROPE: toyRope, BONE: toyBone, BUNNY: toyBunny, FROG: toyFrog, RING: toyRing };
