// =====================================================================
// ANATOMY: wet tissue materials, deformable organ tubes (stomach, small intestine, colon),
// the squeezing wave, interior views, cut-aways, gas bubbles, liquid and food.
// =====================================================================

// ---------- procedural tissue textures (colour + normal from a height field) ----------
function heightToNormal(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const im = g.createImageData(w, h);
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
// branching vessels drawn as tapered random walks
function drawVessels(g, w, h, r, n, col, maxW, len = 160) {
  const branch = (x, y, a, wd, L, d) => {
    g.strokeStyle = col; g.lineCap = 'round';
    for (let i = 0; i < L; i++) {
      const nx = x + Math.cos(a) * 3, ny = y + Math.sin(a) * 3; g.lineWidth = wd * (1 - i / L * 0.7); g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      // draw wrapped copies near the edges so the texture tiles
      for (const [ox, oy] of [[w, 0], [-w, 0], [0, h], [0, -h]]) if ((ox && (x < 20 || x > w - 20)) || (oy && (y < 20 || y > h - 20))) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(nx + ox, ny + oy); g.stroke(); }
      x = (nx + w) % w; y = (ny + h) % h; a += (r() - 0.5) * 0.35;
      if (d < 4 && r() < 0.03) branch(x, y, a + (r() > 0.5 ? 1 : -1) * (0.5 + r() * 0.6), wd * 0.65, L * 0.6, d + 1);
    }
  };
  for (let i = 0; i < n; i++) branch(r() * w, r() * h, r() * Math.PI * 2, maxW * (0.5 + r() * 0.5), len * (0.5 + r()), 0);
}
function tissueSet(kind, seed = 1) {
  const S = 1024, r = rng(seed);
  const col = document.createElement('canvas'), hgt = document.createElement('canvas'); col.width = hgt.width = S; col.height = hgt.height = S;
  const g = col.getContext('2d'), hg = hgt.getContext('2d');
  const P = {
    serosa: { base: '#b8625a', blot: ['#cf857a', '#9c4a48', '#c4706a', '#d99a8a'], ves: ['rgba(110,15,40,0.6)', 'rgba(140,35,70,0.4)'], fat: true },
    colon: { base: '#c79a86', blot: ['#dcb6a0', '#b88472', '#e2c2ac'], ves: ['rgba(120,30,50,0.4)', 'rgba(150,60,80,0.3)'], fat: true },
    mucosa: { base: '#b9474a', blot: ['#d0645e', '#9a3138', '#c95a57', '#e07b70'], ves: ['rgba(90,10,30,0.35)', 'rgba(220,120,110,0.25)'], fat: false },
    villi: { base: '#c45a55', blot: ['#d9786c', '#a84047', '#e0897a'], ves: ['rgba(110,20,40,0.25)'], fat: false },
  }[kind];
  g.fillStyle = P.base; g.fillRect(0, 0, S, S); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  // soft mottling
  for (let i = 0; i < 260; i++) { const x = r() * S, y = r() * S, rad = 20 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, P.blot[i % P.blot.length] + '55'); gr.addColorStop(1, P.blot[i % P.blot.length] + '00'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  if (P.fat) for (let i = 0; i < 9; i++) { const x = r() * S, y = r() * S, rw = 40 + r() * 110; g.fillStyle = `rgba(226,${190 + r() * 30},${130 + r() * 40},0.16)`; g.beginPath(); g.ellipse(x, y, rw, rw * (0.3 + r() * 0.4), r() * 3, 0, Math.PI * 2); g.fill(); }
  // vessels in colour, raised in the height map
  for (const c of P.ves) drawVessels(g, S, S, r, kind === 'villi' ? 6 : 14, c, kind === 'serosa' ? 4.5 : 3.2);
  const r2 = rng(seed); drawVessels(hg, S, S, r2, kind === 'villi' ? 6 : 14, 'rgba(255,255,255,0.35)', kind === 'serosa' ? 4.5 : 3.2);
  // fine grain: muscle fibres (serosa), pits (mucosa), velvet (villi)
  const im = hg.getImageData(0, 0, S, S), d = im.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4; let v = 0;
    if (kind === 'serosa' || kind === 'colon') v = Math.sin(y * 0.9 + noise3(x * 0.02, y * 0.02, seed) * 6) * 10 + noise3(x * 0.15, y * 0.15, seed) * 14;
    else if (kind === 'mucosa') v = (noise3(x * 0.12, y * 0.12, seed) > 0.35 ? -26 : 0) + noise3(x * 0.04, y * 0.04, seed + 3) * 22 + noise3(x * 0.4, y * 0.4, seed) * 10;
    else v = (h3(Math.floor(x / 3), Math.floor(y / 3), seed) - 0.5) * 70 + noise3(x * 0.05, y * 0.05, seed) * 20;
    d[i] = d[i + 1] = d[i + 2] = clamp(d[i] + v, 0, 255);
  }
  hg.putImageData(im, 0, 0);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  return { map, normalMap: heightToNormal(hgt, kind === 'villi' ? 3.5 : 2.2) };
}
const TS = { serosa: tissueSet('serosa', 3), colon: tissueSet('colon', 8), mucosa: tissueSet('mucosa', 5), villi: tissueSet('villi', 11) };
function tissueMat(kind, { rep = [8, 2], wet = 1, ...extra } = {}) {
  const t = TS[kind], c = (x) => { const k = x.clone(); k.repeat.set(rep[0], rep[1]); k.needsUpdate = true; return k; };
  const inner = kind === 'mucosa' || kind === 'villi';
  return new THREE.MeshPhysicalMaterial({
    map: c(t.map), normalMap: c(t.normalMap), normalScale: new THREE.Vector2(inner ? 1.1 : 0.8, inner ? 1.1 : 0.8),
    roughness: inner ? 0.4 : 0.5, clearcoat: wet, clearcoatRoughness: inner ? 0.07 : 0.14, sheen: inner ? 0.35 : 0.2, sheenRoughness: 0.5,
    sheenColor: new THREE.Color(inner ? 0xff6a5a : 0xffa090), vertexColors: true, ...extra,
  });
}

// ---------- tubes along curves with parallel-transport frames ----------
function ptFrames(curve, n) {
  const P = [], T = [], N = [], B = [];
  for (let i = 0; i <= n; i++) { P.push(curve.getPointAt(i / n)); T.push(curve.getTangentAt(i / n).normalize()); }
  let up = Math.abs(T[0].y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  N.push(up.clone().sub(T[0].clone().multiplyScalar(up.dot(T[0]))).normalize()); B.push(T[0].clone().cross(N[0]));
  for (let i = 1; i <= n; i++) {
    const ax = T[i - 1].clone().cross(T[i]), s = ax.length(); const nn = N[i - 1].clone();
    if (s > 1e-6) nn.applyAxisAngle(ax.normalize(), Math.asin(clamp(s, -1, 1)) * (T[i - 1].dot(T[i]) < 0 ? -1 : 1));
    nn.sub(T[i].clone().multiplyScalar(nn.dot(T[i]))).normalize(); N.push(nn); B.push(T[i].clone().cross(nn));
  }
  return { P, T, N, B };
}
// a deformable tube: shape(u, th, t) -> radius; `cut` keeps only th in [a0, a1]; `inside` flips faces for interior views
function organTube(curve, { nu = 300, nv = 48, shape, mat, cut = null, inside = false, uvRep = [1, 1], len = null } = {}) {
  const F = ptFrames(curve, nu), L = len ?? curve.getLength();
  const a0 = cut ? cut[0] : 0, a1 = cut ? cut[1] : Math.PI * 2, wrap = !cut, cols = wrap ? nv : nv + 1;
  const pos = new Float32Array((nu + 1) * cols * 3), uv = new Float32Array((nu + 1) * cols * 2), colr = new Float32Array((nu + 1) * cols * 3).fill(1), idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j < cols; j++) { const k = i * cols + j; uv[k * 2] = (i / nu) * uvRep[0]; uv[k * 2 + 1] = (j / nv) * uvRep[1]; }
  for (let i = 0; i < nu; i++) for (let j = 0; j < (wrap ? nv : nv); j++) {
    const a = i * cols + j, b = i * cols + (wrap ? (j + 1) % nv : j + 1), c = (i + 1) * cols + j, d = (i + 1) * cols + (wrap ? (j + 1) % nv : j + 1);
    if (inside) idx.push(a, d, b, a, c, d); else idx.push(a, b, d, a, d, c);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3)); geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  const th = (j) => a0 + (a1 - a0) * j / (wrap ? nv : nv);
  // world point on the surface (for attaching things)
  mesh.userData = { F, nu, nv, L, curve,
    at(u, ang, rr) { const i = Math.round(clamp(u) * nu); return F.P[i].clone().add(F.N[i].clone().multiplyScalar(Math.cos(ang) * rr)).add(F.B[i].clone().multiplyScalar(Math.sin(ang) * rr)); },
    update(t, { shape: sf = shape, tint = null } = {}) {
      for (let i = 0; i <= nu; i++) {
        const u = i / nu, P = F.P[i], N = F.N[i], B = F.B[i];
        for (let j = 0; j < cols; j++) {
          const a = th(j), r = sf(u, a, t), k = (i * cols + j) * 3, ca = Math.cos(a), sa = Math.sin(a);
          pos[k] = P.x + (N.x * ca + B.x * sa) * r; pos[k + 1] = P.y + (N.y * ca + B.y * sa) * r; pos[k + 2] = P.z + (N.z * ca + B.z * sa) * r;
          if (tint) { const c = tint(u, a, t); colr[k] = c[0]; colr[k + 1] = c[1]; colr[k + 2] = c[2]; }
        }
      }
      geo.attributes.position.needsUpdate = true; if (tint) geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
    },
  };
  return mesh;
}
// smooth piecewise profile: [[u, value], ...]
function profile(pts) { return (u) => { if (u <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) { const [ua, va] = pts[i - 1], [ub, vb] = pts[i]; const k = (u - ua) / (ub - ua); return lerp(va, vb, k * k * (3 - 2 * k)); } return pts[pts.length - 1][1]; }; }
// the squeezing wave: a tight ring at c, the pushed contents bulging just ahead of it
const waveAt = (u, c, w, A = 0.6) => { const d = (u - c) / w; return 1 - A * Math.exp(-d * d * 2.2) + A * 0.32 * Math.exp(-Math.pow(d - 1.6, 2) * 1.2); };
const waveDark = (u, c, w) => { const d = (u - c) / w; return Math.exp(-d * d * 2.2); };

// ---------- the whole gut: stomach + duodenum, coiled small intestine, colon framing it ----------
function gutCurves() {
  const st = new THREE.CatmullRomCurve3([
    V(-0.035, 0.30, -0.03), V(-0.03, 0.22, -0.01), V(-0.045, 0.15, 0.0), V(-0.075, 0.08, 0.01), V(-0.08, 0.0, 0.02), V(-0.06, -0.075, 0.03), V(-0.01, -0.125, 0.035),
    V(0.055, -0.115, 0.03), V(0.105, -0.075, 0.02), V(0.135, -0.035, 0.0), V(0.155, -0.02, -0.02), V(0.175, -0.06, -0.035), V(0.172, -0.12, -0.03), V(0.14, -0.165, -0.02), V(0.09, -0.18, -0.01),
  ], false, 'catmullrom', 0.5);
  // the small intestine: rows of loops in two layers (back layer down, front layer up), every row with its own
  // length, wiggle and depth so it reads as packed loops; turns are wide enough never to pinch the tube
  const pts = [V(0.125, -0.168, -0.018), V(0.09, -0.18, -0.01), V(0.04, -0.205, -0.01)], R = rng(21), sp = 0.046, rows = 7;
  // a list of rows (y, z, direction); each row ends where the next begins, joined by a round turn
  const seq = [];
  for (let r = 0; r < rows; r++) seq.push({ y: -0.235 - r * sp, z: -0.005 + (R() - 0.5) * 0.012 });
  for (let r = rows - 1; r >= 0; r--) seq.push({ y: -0.235 - r * sp - sp * 0.5, z: 0.045 + (R() - 0.5) * 0.014 });
  let x = 0.03;
  seq.forEach((q, i) => {
    const dir = i % 2 ? 1 : -1, L = 0.12 + R() * 0.035, xe = dir * L + (R() - 0.5) * 0.02, ph = R() * 6, ph2 = R() * 6, kk = 22 + R() * 18;
    const bul = R() > 0.5 ? (R() - 0.3) * 0.05 : 0, bx = (R() - 0.5) * 0.12, xs = x;
    const sl = (R() - 0.5) * 0.22; for (let k = 1; k <= 18; k++) { const f = k / 18, xx = lerp(xs, xe, f), w = Math.sin(f * Math.PI); pts.push(V(xx, q.y + (Math.sin(xx * kk + ph) * 0.015 + sl * (f - 0.5) * 0.25) * w, q.z + Math.sin(xx * 15 + ph2) * 0.016 * w + bul * Math.exp(-Math.pow((xx - bx) / 0.045, 2)))); }
    x = xe; const nx = seq[i + 1]; if (!nx) return;
    const dy = q.y - nx.y, dz = nx.z - q.z, rr = Math.max(Math.abs(dy) / 2, 0.012) * 1.1;
    for (let k = 1; k < 7; k++) { const a = k / 7 * Math.PI; pts.push(V(xe + dir * Math.sin(a) * rr, q.y - dy * (1 - Math.cos(a)) / 2, q.z + dz * k / 7)); }
  });
  pts.push(V(0.16, -0.27, 0.0), V(0.17, -0.4, -0.025), V(0.155, -0.5, 0.0), V(0.175, -0.49, 0.02));
  const si = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const co = new THREE.CatmullRomCurve3([V(0.14, -0.56, 0.02), V(0.19, -0.48, 0.01), V(0.205, -0.34, 0.0), V(0.2, -0.22, 0.03), V(0.15, -0.195, 0.085), V(0.0, -0.21, 0.1), V(-0.15, -0.195, 0.085), V(-0.205, -0.23, 0.03), V(-0.21, -0.36, 0.0), V(-0.2, -0.5, 0.01), V(-0.14, -0.57, 0.03), V(-0.06, -0.6, 0.04)], false, 'catmullrom', 0.5);
  return { st, si, co };
}
const ST_R = profile([[0, 0.011], [0.08, 0.013], [0.16, 0.042], [0.24, 0.068], [0.36, 0.074], [0.5, 0.066], [0.6, 0.05], [0.68, 0.032], [0.72, 0.013], [0.76, 0.016], [1, 0.0155]]);
const ST_AMP = 0.3;   // a stomach contraction is a deep ring-shaped dent, not a full pinch
function makeGut(sc, { cutStomach = null, siSeg = 2400 } = {}) {
  const C3 = gutCurves(), g = new THREE.Group(); sc.add(g);
  const LST = C3.st.getLength(), LSI = C3.si.getLength();
  const st = organTube(C3.st, { nu: 360, nv: 80, cut: cutStomach, mat: tissueMat('serosa', { rep: [6, 3], side: cutStomach ? THREE.DoubleSide : THREE.FrontSide }), shape: () => 0.05 });
  const si = organTube(C3.si, { nu: siSeg, nv: 28, mat: tissueMat('serosa', { rep: [90, 1] }), shape: () => 0.016 });
  const co = organTube(C3.co, { nu: 420, nv: 40, mat: tissueMat('colon', { rep: [18, 2] }), shape: () => 0.026 });
  g.add(st, si, co);
  const stIn = cutStomach ? organTube(C3.st, { nu: 360, nv: 80, cut: cutStomach, inside: true, mat: tissueMat('mucosa', { rep: [5, 3] }), shape: () => 0.045 }) : null;
  if (stIn) g.add(stIn);
  // colon haustra: pouches every few centimetres
  const coShape = (u, a, t) => 0.026 * (0.86 + 0.18 * Math.pow(Math.abs(Math.sin(u * Math.PI * 34)), 0.6)) * (u < 0.04 ? 1.2 : 1) * (1 + 0.008 * Math.sin(t * 0.9 + u * 6));
  const G = { g, st, si, co, stIn, LST, LSI, C3 };
  // `wave` = how far the squeeze has travelled along the gut, in metres (stomach first, then intestine)
  G.shapes = (t, { wave = -1, amp = 0.55, width = 0.03, breathe = 1 } = {}) => {
    const cs = wave / LST, ci = (wave - LST) / LSI, on = wave >= 0;
    const stS = (u, a, tt) => { const d = on ? waveDark(u, cs, width * 1.6 / LST) : 0; return ST_R(u) * (on ? waveAt(u, cs, width * 1.6 / LST, amp * ST_AMP / 0.55) : 1) * (1 + 0.012 * Math.sin(tt * 1.1 + u * 8) * breathe) * (1 + 0.06 * d * Math.sin(a * 9)); };
    const siS = (u, a, tt) => { const d = on ? waveDark(u, ci, width * 0.7 / LSI) : 0; return 0.0158 * (on ? waveAt(u, ci, width * 0.7 / LSI, amp * 0.9) : 1) * (1 + 0.01 * Math.sin(tt * 1.3 + u * 40) * breathe) * (1 + 0.08 * d * Math.sin(a * 6)); };
    const tint = (cc, w) => (u) => { const d = on ? waveDark(u, cc, w) : 0; return [1 - 0.18 * d, 1 - 0.36 * d, 1 - 0.32 * d]; };
    return { stS, siS, stT: tint(cs, width * 1.6 / LST), siT: tint(ci, width * 0.7 / LSI) };
  };
  G.update = (t, o = {}) => {
    const Z = G.shapes(t, o);
    st.userData.update(t, { shape: Z.stS, tint: Z.stT });
    if (stIn) stIn.userData.update(t, { shape: (u, a, tt) => Z.stS(u, a, tt) * 0.9 });
    si.userData.update(t, { shape: Z.siS, tint: Z.siT });
    co.userData.update(t, { shape: coShape });
  };
  return G;
}

// ---------- dark studio for the medical renders ----------
function anatomyStudio(sc, { bg = [[0, '#20262f'], [0.55, '#0d1016'], [1, '#050608']], env = 0.5 } = {}) {
  sc.background = gradTex(bg, 0.5, 0.42); sc.environment = STUDIO.env; sc.environmentIntensity = env;
  const key = new THREE.SpotLight(0xfff1e6, 15, 4, 0.6, 0.6, 1.6); key.position.set(-0.6, 0.9, 1.0); key.target.position.set(0, -0.1, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.userData.soft = 0.08; sc.add(key, key.target);
  const rim = new THREE.SpotLight(0x9ec8ff, 9, 4, 0.7, 0.7, 1.6); rim.position.set(0.8, 0.5, -0.9); rim.target.position.set(0, -0.1, 0); sc.add(rim, rim.target);
  const fill = new THREE.PointLight(0xffd2c0, 1.2, 3, 2); fill.position.set(0.4, -0.2, 0.9); sc.add(fill);
  return { key, rim, fill };
}

// ---------- glossy see-through things: gas bubbles (reflections only, added on top) and gut fluid ----------
const bubbleMat = () => new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.02, specularIntensity: 1, envMapIntensity: 2.4, clearcoat: 1, clearcoatRoughness: 0.0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const bubbleRim = () => new THREE.MeshBasicMaterial({ color: 0x2a0808, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.BackSide });
function bubble(r = 0.05) {
  const g = new THREE.Group(); const a = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), bubbleMat()); a.renderOrder = 6; const b = new THREE.Mesh(new THREE.SphereGeometry(r * 1.01, 40, 28), bubbleRim()); b.renderOrder = 5; g.add(b, a); g.userData.r = r; return g;
}
const fluidMat = (color = 0xc9a44a) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.04, transmission: 0.82, thickness: 0.25, ior: 1.34, attenuationColor: new THREE.Color(color), attenuationDistance: 0.4, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide });

// ---------- inside the empty stomach: big wet folds (rugae), a puddle of gastric juice, mucus strands ----------
function stomachInside(sc) {
  sc.background = new THREE.Color(0x000000); sc.environment = STUDIO.env; sc.environmentIntensity = 0.25;
  const curve = new THREE.CatmullRomCurve3([V(0, 0.2, 3.2), V(0.1, 0, 1.5), V(-0.2, -0.1, 0), V(0.25, 0.05, -1.6), V(0.0, 0.4, -3.2), V(-0.4, 0.9, -4.4)]);
  const Rr = profile([[0, 1.0], [0.25, 1.15], [0.55, 1.35], [0.8, 1.1], [1, 0.7]]);
  const folds = Array.from({ length: 9 }, (_, k) => ({ a: k / 9 * Math.PI * 2 + 0.3, ph: k * 1.7, w: 0.08 + (k % 3) * 0.025 }));
  const shape = (u, a, t) => {
    let f = 0; for (const q of folds) { let d = a - (q.a + 0.35 * Math.sin(u * 6 + q.ph) + 0.12 * Math.sin(u * 17 + q.ph)); d = Math.atan2(Math.sin(d), Math.cos(d)); f += Math.exp(-(d * d) / (q.w * q.w)); }
    return Rr(u) * (1 - 0.15 * f + 0.025 * fbm(u * 9, a * 2, 1) + 0.004 * Math.sin(t * 1.2 + u * 5));
  };
  const wall = organTube(curve, { nu: 260, nv: 140, inside: true, mat: tissueMat('mucosa', { rep: [14, 9] }), shape, uvRep: [1, 1] }); sc.add(wall);
  // the puddle: a rippling surface low in the cavity
  const pg = new THREE.PlaneGeometry(5, 7, 90, 120); pg.rotateX(-Math.PI / 2); const pool = new THREE.Mesh(pg, new THREE.MeshPhysicalMaterial({ color: 0x3a2a10, roughness: 0.02, metalness: 0.0, transmission: 0.25, thickness: 0.4, ior: 1.33, attenuationColor: new THREE.Color(0x6a4a18), attenuationDistance: 0.2, clearcoat: 1, clearcoatRoughness: 0.0, specularIntensity: 1 }));
  pool.position.set(0, -0.86, -0.4); pool.visible = false; sc.fog = new THREE.Fog(0x000000, 1.2, 4.2);
  // mucus strands between folds
  const muc = new THREE.MeshPhysicalMaterial({ color: 0xf0d8c8, roughness: 0.05, transmission: 0.7, thickness: 0.02, ior: 1.36, clearcoat: 1, transparent: true, opacity: 0.85 });
  const strands = [[V(-0.7, 0.45, 0.4), V(-0.35, 0.2, 0.1), V(-0.1, 0.65, -0.2)], [V(0.6, -0.3, -0.6), V(0.3, -0.45, -0.9), V(0.7, 0.1, -1.3)], [V(-0.5, -0.4, -1.4), V(-0.2, -0.65, -1.6), V(0.2, -0.4, -1.9)]];
  const sm = strands.map(pp => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp), 40, 0.012, 8), muc); sc.add(m); return m; });
  const lamp = new THREE.PointLight(0xfff4ea, 2.2, 0, 1.7); sc.add(lamp);
  const spot = new THREE.SpotLight(0xffffff, 8, 0, 0.75, 0.6, 1.6); sc.add(spot, spot.target);
  return { wall, pool, lamp, spot, curve, update(t, cam) {
    wall.userData.update(t);
    const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.003 * Math.sin(x * 9 + t * 2.3) * Math.sin(z * 7 - t * 1.7) + 0.0015 * Math.sin((x + z) * 15 - t * 3)); } p.needsUpdate = true; pg.computeVertexNormals();
    lamp.position.copy(cam.position); spot.position.copy(cam.position); spot.target.position.copy(cam.localToWorld(V(0, 0, -3)));
  } };
}

// ---------- inside the small intestine: ring folds, velvety villi, a squeeze that sweeps scraps along ----------
function intestineInside(sc) {
  sc.background = new THREE.Color(0x000000); sc.environment = STUDIO.env; sc.fog = new THREE.Fog(0x000000, 1.5, 5.5);
  const curve = new THREE.CatmullRomCurve3([V(0, 0, 4), V(0.15, 0.05, 2), V(-0.2, -0.05, 0), V(0.3, 0.1, -2.2), V(-0.1, 0.2, -4.5), V(0.4, 0.0, -7), V(0.0, -0.3, -9)]);
  const L = curve.getLength();
  const ring = (u, a) => { const z = u * L / 0.5 + 0.25 * Math.sin(a * 2 + u * 9); const c = Math.cos(z * Math.PI * 2); return Math.pow(Math.max(0, c), 3) * (0.6 + 0.4 * Math.sin(a * 1.0 + Math.floor(z + 0.5) * 2.1)); };
  const mat = tissueMat('villi', { rep: [36, 6] }); mat.sheen = 0.9; mat.sheenRoughness = 0.7; mat.roughness = 0.5;
  const wall = organTube(curve, { nu: 1300, nv: 110, inside: true, mat, shape: () => 1 }); sc.add(wall);
  const scrapsM = [new THREE.MeshPhysicalMaterial({ color: 0xc9a25a, roughness: 0.55, clearcoat: 0.6 }), new THREE.MeshPhysicalMaterial({ color: 0x6f8a3a, roughness: 0.5, clearcoat: 0.7 }), new THREE.MeshPhysicalMaterial({ color: 0xa8704a, roughness: 0.6, clearcoat: 0.5 })];
  const R = rng(4), scraps = [];
  for (let i = 0; i < 26; i++) {
    const g = new THREE.IcosahedronGeometry(0.05 + R() * 0.07, 1); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const n = 1 + 0.35 * (h3(k, i, 3) - 0.5); p.setXYZ(k, p.getX(k) * n, p.getY(k) * n * 0.7, p.getZ(k) * n); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, scrapsM[i % 3]); m.castShadow = true; sc.add(m); scraps.push({ m, u0: 0.15 + R() * 0.25, a: -Math.PI / 2 + (R() - 0.5) * 1.8, rr: 0.76 + R() * 0.12, sp: R() * 6 });
  }
  const lamp = new THREE.PointLight(0xfff0e6, 1.2, 0, 1.8); sc.add(lamp);
  const spot = new THREE.SpotLight(0xffffff, 7, 0, 0.8, 0.6, 1.6); sc.add(spot, spot.target);
  return { wall, curve, L, update(t, cam, { c = -1, amp = 0.72, w = 0.05 } = {}) {
    const shape = (u, a, tt) => 1.0 * (1 - 0.24 * ring(u, a)) * (c >= 0 ? waveAt(u, c, w, amp) : 1) * (1 + 0.01 * Math.sin(tt * 1.4 + u * 20));
    wall.userData.update(t, { shape, tint: (u) => { const d = c >= 0 ? waveDark(u, c, w) : 0; return [1 - 0.1 * d, 1 - 0.3 * d, 1 - 0.3 * d]; } });
    for (const q of scraps) {
      const u = c >= 0 ? Math.max(q.u0, c + w * 1.4 + (q.u0 - 0.12) * 0.08) : q.u0, pushed = u > q.u0 + 1e-4;
      const rr = q.rr * (1 - 0.24 * ring(u, q.a)) * (c >= 0 ? waveAt(u, c, w, amp) : 1) * 0.95;
      q.m.position.copy(wall.userData.at(clamp(u, 0, 0.98), q.a + (pushed ? Math.sin(t * 3 + q.sp) * 0.25 : 0), rr));
      q.m.rotation.set(q.sp + (pushed ? t * 3 : 0), q.sp * 2 + (pushed ? t * 2 : 0), 0);
    }
    lamp.position.copy(cam.position); spot.position.copy(cam.position); spot.target.position.copy(cam.localToWorld(V(0, 0, -3)));
  } };
}

// ---------- a cut-away length of intestine: the front of the wall removed so gas and fluid show inside ----------
function gutCutaway(sc, { R0 = 0.3, len = 3.6, outMat = null, inMat = null, edgeMat = null, fluid = null, thick = null } = {}) {
  const curve = new THREE.CatmullRomCurve3([V(-len / 2, 0, 0), V(-len / 6, 0.03, -0.02), V(len / 6, -0.02, 0.02), V(len / 2, 0.02, 0)]);
  const cut = [Math.PI / 2 + 0.9, Math.PI / 2 + Math.PI * 2 - 0.9], wallT = thick ?? 0.06 * R0 / 0.3;
  const out = organTube(curve, { nu: 300, nv: 64, cut, mat: outMat || tissueMat('serosa', { rep: [10, 2] }), shape: () => R0 });
  const inn = organTube(curve, { nu: 300, nv: 64, cut, inside: true, mat: inMat || tissueMat('villi', { rep: [24, 5] }), shape: () => R0 - wallT });
  const edgeM = edgeMat || new THREE.MeshPhysicalMaterial({ color: 0x8e2f3a, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.3 });
  // the two cut faces of the wall (muscle layers), rebuilt each frame from the same radius
  const mkEdge = () => { const nu = 300, pos = new Float32Array((nu + 1) * 2 * 3), idx = []; for (let i = 0; i < nu; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); const m = new THREE.Mesh(g, edgeM); m.material.side = THREE.DoubleSide; m.frustumCulled = false; return m; };
  const e1 = mkEdge(), e2 = mkEdge(); sc.add(out, inn, e1, e2);
  const F = out.userData.F, nu = 300;
  // fluid along the bottom: its top surface and its cut face
  const fl = fluid || fluidMat(); const NFU = 200, NS = 16;
  const mkStrip = () => { const pos = new Float32Array((NFU + 1) * (NS + 1) * 3), idx = []; for (let i = 0; i < NFU; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + 1, c = a + NS + 1, d = c + 1; idx.push(a, c, b, b, c, d); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); const m = new THREE.Mesh(g, fl); m.frustumCulled = false; return m; };
  const top = mkStrip(), face = mkStrip(); sc.add(top, face);
  const zc = Math.cos(0.9);   // the cut plane sits at this fraction of the radius, towards the camera
  const C = { out, inn, curve, R0, F, top, face,
    radius: () => R0, rIn: () => R0 - wallT,
    update(t, { shape = () => 1, level = () => -0.45 } = {}) {
      out.userData.update(t, { shape: (u, a, tt) => R0 * shape(u, a, tt) });
      inn.userData.update(t, { shape: (u, a, tt) => (R0 - wallT) * shape(u, a, tt) });
      for (const [e, a] of [[e1, cut[0]], [e2, cut[1]]]) { const p = e.geometry.attributes.position; for (let i = 0; i <= nu; i++) { const u = i / nu, s = shape(u, a, t); const A = out.userData.at(u, a, R0 * s), B = out.userData.at(u, a, (R0 - wallT) * s); p.setXYZ(i * 2, A.x, A.y, A.z); p.setXYZ(i * 2 + 1, B.x, B.y, B.z); } p.needsUpdate = true; e.geometry.computeVertexNormals(); }
      // fluid: level(u) is the surface height as a fraction of the local inner radius (-1 bottom .. 1 top)
      const tp = top.geometry.attributes.position, fp = face.geometry.attributes.position;
      for (let i = 0; i <= NFU; i++) {
        const u = i / NFU, k = Math.round(u * nu), P = F.P[k], N = F.N[k], B = F.B[k], ri = (R0 - wallT) * shape(u, -Math.PI / 2, t) * 0.985, h = clamp(level(u), -0.98, 0.95) * ri;
        const zw = Math.sqrt(Math.max(ri * ri - h * h, 0)), z0 = -zw, z1 = Math.min(zw, zc * ri);
        for (let j = 0; j <= NS; j++) {
          const f = j / NS, z = lerp(z0, z1, f), k3 = (i * (NS + 1) + j) * 3, y = h + 0.004 * Math.sin(u * 60 + t * 5 + j) * ri;
          tp.array[k3] = P.x + N.x * y + B.x * z; tp.array[k3 + 1] = P.y + N.y * y + B.y * z; tp.array[k3 + 2] = P.z + N.z * y + B.z * z;
          const yb = -Math.sqrt(Math.max(ri * ri - (zc * ri) ** 2, 0)), yy = lerp(yb, Math.max(h, yb), f), zz = zc * ri;
          fp.array[k3] = P.x + N.x * yy + B.x * zz; fp.array[k3 + 1] = P.y + N.y * yy + B.y * zz; fp.array[k3 + 2] = P.z + N.z * yy + B.z * zz;
        }
      }
      tp.needsUpdate = fp.needsUpdate = true; top.geometry.computeVertexNormals(); face.geometry.computeVertexNormals();
    },
  };
  return C;
}

// ---------- chyme: what a full stomach holds (bits of food in liquid) ----------
function chyme(n = 700, seed = 9) {
  const R = rng(seed), geo = new THREE.IcosahedronGeometry(1, 2); { const p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const s = 1 + 0.18 * (h3(k, 3, seed) - 0.5); p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.75, p.getZ(k) * s); } geo.computeVertexNormals(); }
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1 });
  const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = im.receiveShadow = true;
  const cols = [0x8a6238, 0x6a4a28, 0x86703e, 0x56602a, 0x9a7a4c, 0x7a4426, 0xa08260].map(c => new THREE.Color(c));
  for (let i = 0; i < n; i++) im.setColorAt(i, cols[i % cols.length].clone().multiplyScalar(0.8 + R() * 0.3));
  im.userData.R = R; return im;
}
