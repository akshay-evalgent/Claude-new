// =====================================================================
// LOOK + ANIMATION UPGRADE
// jointed characters (knees, ankles, fingers), gait, breathing, blinks, saccades,
// springs and overshoot easing, handheld camera with focus, procedural wood/fabric/hair textures
// =====================================================================
E.back = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
E.outQ = x => 1 - (1 - x) * (1 - x);
E.inQ = x => x * x;
// 0 -> 1 with a damped overshoot (settles like a spring)
const spring = (t, t0, f = 2.2, d = 6) => { const a = t - t0; if (a <= 0) return 0; return 1 - Math.exp(-d * a) * Math.cos(2 * Math.PI * f * a); };
// impulse wobble that dies away
const wob = (t, t0, f = 4, d = 6) => { const a = t - t0; if (a <= 0) return 0; return Math.exp(-d * a) * Math.sin(2 * Math.PI * f * a); };
const fbm = (x, y = 0, z = 0) => noise3(x, y, z) * 0.62 + noise3(x * 2.03 + 5.1, y * 2.03, z * 2.03) * 0.28 + noise3(x * 4.1 + 9.3, y * 4.1, z * 4.1) * 0.1;
// eye saccades: hold, then jump fast to the next random target
function saccade(t, seed = 1, rate = 3.2) {
  const q = t * rate + seed * 0.37, k = Math.floor(q), f = q - k;
  const m = smooth(0, 0.16, f);
  return [lerp(h3(k - 1, seed, 1) * 2 - 1, h3(k, seed, 1) * 2 - 1, m), lerp(h3(k - 1, seed, 7) * 2 - 1, h3(k, seed, 7) * 2 - 1, m)];
}
// camera with handheld drift, rack-focus distance stored for the depth-of-field pass
function shoot(cam, pos, target, { roll = 0, fov, hand = 1, t = 0, focus = null } = {}) {
  const d = pos.distanceTo(target), n = 0.01 * hand * Math.max(d, 1.5);
  const p = pos.clone().add(V(fbm(t * 0.55, 1.1), fbm(t * 0.55, 2.2), fbm(t * 0.55, 3.3)).multiplyScalar(n));
  const tg = target.clone().add(V(fbm(t * 0.45, 4.4), fbm(t * 0.45, 5.5), 0).multiplyScalar(n * 0.6));
  setCam(cam, p, tg, roll + fbm(t * 0.4, 6.6) * 0.7 * hand, fov);
  cam.userData.focus = focus ?? p.distanceTo(tg);
}

// ---------- procedural textures ----------
function canvasTex(w, h, draw, { rep = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t;
}
function noiseFill(g, w, h, seed, amp, base = 128, scale = 1) {
  const im = g.getImageData(0, 0, w, h), r = rng(seed);
  for (let i = 0; i < im.data.length; i += 4) { const n = (r() - 0.5) * amp; im.data[i] = clamp(im.data[i] + n, 0, 255); im.data[i + 1] = clamp(im.data[i + 1] + n, 0, 255); im.data[i + 2] = clamp(im.data[i + 2] + n, 0, 255); }
  g.putImageData(im, 0, 0);
}
const woodTex = (base, dark, seed = 1, rep = [1, 1], planks = 0) => canvasTex(512, 512, (g, w, h) => {
  const r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
  const rows = planks || 1;
  for (let k = 0; k < rows; k++) {
    const y0 = k * h / rows, ph = h / rows;
    g.globalAlpha = 1; g.fillStyle = r() > 0.5 ? `rgba(0,0,0,${0.12 * r()})` : `rgba(255,220,180,${0.08 * r()})`; g.fillRect(0, y0, w, ph);
    for (let i = 0; i < 30; i++) {
      const yy = y0 + r() * ph; g.strokeStyle = dark; g.globalAlpha = 0.06 + r() * 0.2; g.lineWidth = 0.5 + r() * 2.4; g.beginPath();
      for (let x = 0; x <= w; x += 8) { const yv = yy + Math.sin(x * 0.011 + i * 1.3) * 2.5 + Math.sin(x * 0.047 + i * 2.7) * 0.7; x ? g.lineTo(x, yv) : g.moveTo(x, yv); }
      g.stroke();
    }
    if (r() > 0.5) { g.globalAlpha = 0.3; g.strokeStyle = dark; const kx = r() * w, ky = y0 + ph * 0.5; for (let q = 1; q < 6; q++) { g.lineWidth = 1; g.beginPath(); g.ellipse(kx, ky, q * 5, q * 2, 0, 0, 7); g.stroke(); } }
    if (planks) { g.globalAlpha = 0.7; g.fillStyle = '#24130a'; g.fillRect(0, y0, w, 2.5); g.fillRect(r() * w, y0, 2.5, ph); }
  }
  g.globalAlpha = 1;
}, { rep });
const weaveTex = (rep = [24, 24], seed = 9) => canvasTex(128, 128, (g, w, h) => {
  const im = g.createImageData(w, h), r = rng(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cell = ((x >> 2) + (y >> 2)) & 1, along = cell ? (x & 3) : (y & 3);
    const v = 128 + (cell ? 26 : -26) + 22 * Math.sin(along / 4 * Math.PI) + (r() - 0.5) * 26;
    const i = (y * w + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
}, { rep, srgb: false });
const quiltTex = (rep = [5, 7]) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#202020'; g.fillRect(0, 0, w, h);
  const gr = g.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w * 0.66); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#c8c8c8'); gr.addColorStop(1, '#3a3a3a');
  g.fillStyle = gr; g.fillRect(3, 3, w - 6, h - 6);
  g.strokeStyle = '#101010'; g.lineWidth = 2; g.setLineDash([7, 5]); g.strokeRect(3, 3, w - 6, h - 6);
  noiseFill(g, w, h, 4, 18);
}, { rep, srgb: false });
const plasterTex = (rep = [6, 4]) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 12, 60); }, { rep, srgb: false });
const HAIR_BUMP = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(4);
  for (let i = 0; i < 1400; i++) {
    const x = r() * w; g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.32)'; g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath(); g.moveTo(x, -4); g.bezierCurveTo(x + (r() - 0.5) * 22, h * 0.33, x + (r() - 0.5) * 22, h * 0.66, x + (r() - 0.5) * 34, h + 4); g.stroke();
  }
}, { rep: [3, 1], srgb: false });
const WEAVE = weaveTex([22, 22]), WEAVE_FINE = weaveTex([60, 60], 3), QUILT = quiltTex([5, 7]), PLASTER = plasterTex([8, 5]);
// dim/tinted copies of the studio environment so night scenes are not lit like a showroom
function tintedEnv(r, g, b) {
  const room = new RoomEnvironment(); const tint = new THREE.Color(r, g, b);
  room.traverse(o => { if (o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiply(tint); if (o.material.emissive) o.material.emissive.multiply(tint); } });
  return pmrem.fromScene(room, 0.04).texture;
}
const NENV = tintedEnv(0.16, 0.2, 0.36), MENV = tintedEnv(0.85, 0.72, 0.58), DENV = tintedEnv(0.8, 0.62, 1.0);

// ---------- jointed character ----------
// one smooth head surface (cranium blended into the jaw) so there is no crease across the face
function mergedHeadGeo() {
  const g = new THREE.SphereGeometry(1, 72, 54), p = g.attributes.position;
  const c = V(0, -0.24, 0.13), a = V(0.29, 0.232, 0.2755), k = 0.08;
  for (let i = 0; i < p.count; i++) {
    const n = V(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const rh = 1 / Math.sqrt((n.x / 0.437) ** 2 + (n.y / 0.4968) ** 2 + (n.z / 0.46) ** 2);
    const A = (n.x / a.x) ** 2 + (n.y / a.y) ** 2 + (n.z / a.z) ** 2, B = -2 * (n.x * c.x / a.x ** 2 + n.y * c.y / a.y ** 2 + n.z * c.z / a.z ** 2), Cc = (c.x / a.x) ** 2 + (c.y / a.y) ** 2 + (c.z / a.z) ** 2 - 1;
    const disc = B * B - 4 * A * Cc; const rj = disc > 0 ? (-B + Math.sqrt(disc)) / (2 * A) : 0;
    const hh = Math.max(k - Math.abs(rh - rj), 0) / k, r = Math.max(rh, rj) + hh * hh * k * 0.25;
    p.setXYZ(i, n.x * r, n.y * r, n.z * r);
  }
  g.computeVertexNormals(); return g;
}
const HEADGEO = mergedHeadGeo();
function makeChar2(opts = {}) {
  const p = makeChar(opts); const u = p.userData; const H = u.head; const skinM = u.skinM;
  const add = (m, pos, parent) => { m.castShadow = true; m.receiveShadow = true; m.position.copy(pos); parent.add(m); return m; };
  H.children[0].geometry = HEADGEO; H.children[0].scale.set(1, 1, 1); H.children[1].visible = false;
  // fabric + hair surface detail
  const shirtM = u.torso.material; shirtM.bumpMap = WEAVE; shirtM.bumpScale = 1.2; shirtM.sheen = 0.8; shirtM.sheenRoughness = 0.7; shirtM.sheenColor = shirtM.color.clone().lerp(new THREE.Color(0xffffff), 0.45);
  H.traverse(o => { if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial && o.material.sheen === 1) { o.material.bumpMap = HAIR_BUMP; o.material.bumpScale = 2.2; o.material.roughness = 0.45; } });
  skinM.sheenRoughness = 0.45;
  // lash line along the rim of each eyelid
  const lashM = new THREE.MeshStandardMaterial({ color: 0x24160f, roughness: 0.6 });
  H.children.filter(o => o.isMesh && o.geometry.parameters && o.geometry.parameters.radius === 0.081).forEach(l => { const ls = new THREE.Mesh(new THREE.TorusGeometry(0.081, 0.0065, 6, 28, Math.PI), lashM); ls.rotation.x = Math.PI / 2; l.add(ls); });
  // eyes, for gaze and pop
  const eyes = H.children.filter(o => o.isMesh && o.material && o.material.map === HEYE); eyes.forEach(e => e.userData.ry = e.rotation.y);
  // hands with fingers replace the mitts
  const hands = u.arms.map(a => {
    const el = a.el, sx = a.sx; const mitt = el.children[1]; el.remove(mitt);
    const hand = new THREE.Group(); hand.position.set(0, -0.5, 0); el.add(hand);
    add(new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.16, 0.165, 3, 0.036), skinM), V(0, -0.075, 0), hand);
    const fingers = [[-0.057, 0.072], [-0.02, 0.088], [0.018, 0.086], [0.055, 0.078]].map(([z, L]) => {
      const f1 = new THREE.Group(); f1.position.set(0, -0.145, z); hand.add(f1);
      add(new THREE.Mesh(new THREE.CapsuleGeometry(0.021, L * 0.42, 4, 10), skinM), V(0, -L * 0.3, 0), f1);
      const f2 = new THREE.Group(); f2.position.set(0, -L * 0.6, 0); f1.add(f2);
      add(new THREE.Mesh(new THREE.CapsuleGeometry(0.019, L * 0.32, 4, 10), skinM), V(0, -L * 0.24, 0), f2);
      return { f1, f2 };
    });
    const th = new THREE.Group(); th.position.set(-sx * 0.015, -0.035, 0.07); hand.add(th);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.05, 4, 10), skinM), V(0, -0.045, 0), th);
    const th2 = new THREE.Group(); th2.position.set(0, -0.085, 0); th.add(th2);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.034, 4, 10), skinM), V(0, -0.03, 0), th2);
    const api = {
      hand, curl(k, spread = 0) {
        fingers.forEach((f, j) => { f.f1.rotation.set((1.5 - j) * 0.07 * (1 - k) * (1 + spread), 0, -sx * (0.12 + 1.5 * k)); f.f2.rotation.set(0, 0, -sx * (0.12 + 1.55 * k)); });
        th.rotation.set(-0.6 + 0.4 * k, 0, -sx * (0.2 + 0.7 * k)); th2.rotation.set(0, 0, -sx * 0.7 * k);
      },
    };
    api.curl(0.3); return api;
  });
  // legs with knees and ankles
  const legs = u.legG.map(g => {
    const [thM, shM, so] = g.children; const pantsM = thM.material; g.remove(thM, shM, so);
    pantsM.bumpMap = WEAVE; pantsM.bumpScale = 1.0;
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.158, 0.42, 8, 20), pantsM), V(0, -0.3, 0), g);
    const knee = new THREE.Group(); knee.position.set(0, -0.62, 0); g.add(knee);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.148, 20, 14), pantsM), V(0, 0, 0), knee);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.138, 0.42, 8, 20), pantsM), V(0, -0.3, 0), knee);
    const ankle = new THREE.Group(); ankle.position.set(0, -0.6, 0); knee.add(ankle);
    so.position.set(0, 0, 0.1); ankle.add(so);
    const sole = add(new THREE.Mesh(new RoundedBoxGeometry(0.275, 0.05, 0.5, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x3a3f46, roughness: 0.7 })), V(0, -0.07, 0.1), ankle);
    // bare foot (hidden unless barefoot)
    const foot = new THREE.Group(); foot.position.set(0, -0.02, 0.06); ankle.add(foot); foot.visible = false;
    const fm = add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), skinM), V(0, 0, 0.06), foot); fm.scale.set(0.105, 0.075, 0.2);
    const heel = add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), skinM), V(0, 0.0, -0.08), foot);
    [-0.06, -0.03, 0.0, 0.03, 0.06].forEach((x, k) => add(new THREE.Mesh(new THREE.SphereGeometry(k === 0 ? 0.03 : 0.022, 12, 8), skinM), V(x * 1.2, -0.01, 0.245 - Math.abs(x) * 0.5), foot));
    return { hip: g, knee, ankle, shoe: [so, sole], foot };
  });
  const reset0 = u.reset;
  Object.assign(u, {
    hands, legs, eyes, bob: 0, lean: 0,
    barefoot(on = true) { legs.forEach(L => { L.shoe.forEach(m => m.visible = !on); L.foot.visible = on; }); },
    reset() {
      reset0(); H.position.set(0, 2.92, 0); u.torso.scale.set(1.05, 1, 0.72); hands.forEach(h => h.curl(0.3));
      legs.forEach(L => { L.hip.rotation.set(0, 0, 0); L.knee.rotation.set(0, 0, 0); L.ankle.rotation.set(0, 0, 0); });
      eyes.forEach(e => { e.rotation.set(0, e.userData.ry, 0); e.scale.setScalar(1); }); u.bob = 0; u.lean = 0;
    },
    // walk (run=0) to sprint (run=1)
    gait(ph, amt = 1, run = 0) {
      const A = lerp(0.42, 0.85, run) * amt, Kb = lerp(0.8, 1.95, run) * amt;
      legs.forEach((L, i) => { const f = ph + i * Math.PI; L.hip.rotation.x = -A * Math.sin(f) - 0.1 * run * amt; L.knee.rotation.x = Kb * Math.pow(Math.max(0, Math.cos(f + 0.6)), 2) + 0.12 * amt; L.ankle.rotation.x = -0.28 * amt * Math.sin(f + 0.9); });
      u.arms.forEach((a, i) => { const f = ph + i * Math.PI; a.sh.rotation.set(lerp(0.38, 0.95, run) * amt * Math.sin(f), 0, a.sx * (0.12 + 0.1 * run)); a.el.rotation.set(-lerp(0.25, 1.45, run) * amt * (1 + 0.25 * Math.sin(f)), 0, 0); });
      hands.forEach(h => h.curl(lerp(0.35, 0.8, run)));
      const s = Math.abs(Math.sin(ph)); u.bob = amt * (lerp(0.045, 0, run) * (1 - s) + run * 0.14 * s); u.lean = 0.17 * run * amt;
    },
    breathe(t, rate = 0.25, amp = 0.035, ph = 0) { const k = Math.sin(2 * Math.PI * rate * t + ph); u.torso.scale.set(1.05 * (1 + 0.012 * k), 1 + 0.006 * k, 0.72 * (1 + amp * k)); return k; },
    blink(t, seed = 0) { const P = 2.6 + (seed % 3) * 0.7, a = (((t + seed * 1.37) % P) + P) % P; return a < 0.17 ? Math.sin(Math.PI * a / 0.17) : 0; },
    lid(base, t, seed = 0) { u.setLid(lerp(base, 1, u.blink(t, seed))); },
    // bend at the neck (chin toward chest); the head pivots about the base of the neck
    neck(al) { H.position.set(0, 2.5 + 0.42 * Math.cos(al), 0.42 * Math.sin(al)); H.rotation.x += al; },
    gaze(yaw, pitch = 0) { eyes.forEach(e => e.rotation.set(pitch, e.userData.ry + yaw, 0)); },
    eyePop(k) { eyes.forEach(e => e.scale.setScalar(k)); },
    life(t, amt = 1, seed = 0) { H.rotation.x += 0.04 * amt * fbm(t * 0.6, seed); H.rotation.y += 0.06 * amt * fbm(t * 0.5, seed + 3); H.rotation.z += 0.03 * amt * fbm(t * 0.5, seed + 6); },
  });
  u.reset();
  if (opts.barefoot) u.barefoot(true);
  return p;
}
