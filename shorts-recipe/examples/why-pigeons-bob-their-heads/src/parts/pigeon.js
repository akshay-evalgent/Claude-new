// =====================================================================
// THE PIGEON: one lofted skin from tail to beak, so body, neck and head move as one smooth surface,
// feathered with procedural textures (overlapping contour feathers, an iridescent neck), with folded
// wings, a tail fan, eyes, cere, beak and two legs solved by IK.
// The gait: the body walks on steadily; the head holds still in space, then thrusts ahead (hold-thrust).
// =====================================================================
function heightToNormal(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const im = g.createImageData(w, h);
  const Hh = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (Hh(x + 1, y) - Hh(x - 1, y)) * strength, dy = (Hh(x, y + 1) - Hh(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const texOf = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };

// ---------- contour feathers: overlapping scallops, tips toward -x (the tail); anterior rows overlap posterior ones ----------
function featherSheet({ w = 1024, h = 1024, rows = 16, cols = 16, seed = 3, barbs = 0.5 } = {}) {
  const [hc, g] = mkCanvas(w, h), [ac, a] = mkCanvas(w, h), r = rng(seed), fw = w / rows, fh = h / cols;
  g.fillStyle = '#202020'; g.fillRect(0, 0, w, h); a.fillStyle = '#c8c8c8'; a.fillRect(0, 0, w, h);
  const feather = (cx, cy, lum, jit) => {
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      const x = cx + ox, y = cy + oy; if (x < -fw * 2 || x > w + fw * 2 || y < -fh * 2 || y > h + fh * 2) continue;
      const rx = fw * (0.95 + jit * 0.1), ry = fh * (0.64 + jit * 0.08), ex = x - fw * 0.15;
      const gr = g.createLinearGradient(x + fw * 0.7, y, ex - rx, y); gr.addColorStop(0, '#787878'); gr.addColorStop(0.8, '#a4a4a4'); gr.addColorStop(1, '#b0b0b0');
      g.fillStyle = gr; g.beginPath(); g.ellipse(ex, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
      // the rachis: a faint ridge down the middle
      g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + fw * 0.6, y); g.lineTo(ex - rx * 0.85, y + (jit - 0.5) * 2); g.stroke();
      // albedo: each feather a touch lighter or darker, its visible tip edge slightly darker
      const ag = a.createLinearGradient(x + fw * 0.7, y, ex - rx, y); const L = Math.round(200 + lum * 14);
      ag.addColorStop(0, `rgb(${L},${L},${L})`); ag.addColorStop(0.82, `rgb(${L},${L},${L})`); ag.addColorStop(1, `rgb(${L - 14},${L - 14},${L - 13})`);
      a.fillStyle = ag; a.beginPath(); a.ellipse(ex, y, rx, ry, 0, 0, Math.PI * 2); a.fill();
    }
  };
  for (let i = 0; i <= rows + 1; i++) for (let j = -1; j <= cols; j++) feather(i * fw + (r() - 0.5) * fw * 0.12, (j + (i % 2) * 0.5) * fh + (r() - 0.5) * fh * 0.15, r() - 0.5, r());
  // barbs: fine streaks running back and out from each rachis
  g.globalAlpha = 0.05 * barbs; g.strokeStyle = '#ffffff';
  for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, L = 4 + r() * 8, s = r() > 0.5 ? 1 : -1; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x - L, y + s * L * 0.55); g.stroke(); }
  g.globalAlpha = 1;
  const [bc, bg] = mkCanvas(w, h); bg.filter = 'blur(1.6px)'; bg.drawImage(hc, 0, 0);
  return { map: texOf(ac), normalMap: heightToNormal(bc, 3.0) };
}

// ---------- folded wing sheet: coverts (scallops) -> two dark bars -> long dark primaries; s along x, across along y ----------
function wingSheet({ w = 1024, h = 512, seed = 5, base = [134, 140, 154], bar = [38, 40, 46], prim = [68, 73, 84], bars = true } = {}) {
  const [hc, g] = mkCanvas(w, h), [ac, a] = mkCanvas(w, h), r = rng(seed); const col = (c, k = 0) => `rgb(${c.map(v => Math.round(clamp(v + k, 0, 255))).join(',')})`;
  g.fillStyle = '#404040'; g.fillRect(0, 0, w, h); a.fillStyle = col(base); a.fillRect(0, 0, w, h);
  const plume = (x0, y0, len, wid, ang, c, hv = 200) => { // one feather lying along +x from its base (x0, y0), tip rounded
    const gr = g.createLinearGradient(x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len); gr.addColorStop(0, '#303030'); gr.addColorStop(0.7, `rgb(${hv},${hv},${hv})`); gr.addColorStop(1, '#e8e8e8');
    for (const [cx, cy] of [[g, gr], [a, c]]) { cx.save(); cx.translate(x0, y0); cx.rotate(ang); cx.fillStyle = cy; cx.beginPath(); cx.moveTo(0, -wid * 0.5); cx.lineTo(len - wid * 0.5, -wid * 0.5); cx.arc(len - wid * 0.5, 0, wid * 0.5, -Math.PI / 2, Math.PI / 2); cx.lineTo(0, wid * 0.5); cx.closePath(); cx.fill(); cx.restore(); }
    g.save(); g.translate(x0, y0); g.rotate(ang); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(len - wid * 0.4, 0); g.stroke(); g.restore();
  };
  // primaries (rear 40%), drawn first so the secondaries and coverts lie on top
  for (let i = 0; i < 9; i++) { const y = h * (0.12 + i * 0.1), x0 = w * (0.5 + i * 0.012); plume(x0, y, w * (0.5 - i * 0.012), h * 0.2, -0.05 - i * 0.012, col(prim, (r() - 0.5) * 10 - i * 2)); }
  // secondaries with the two dark bars across them (on a pigeon the bars lie across the secondaries and greater coverts)
  for (let i = 0; i < 12; i++) { const y = h * (-0.02 + i * 0.095), x0 = w * (0.3 + i * 0.006); const L = w * 0.33; plume(x0, y, L, h * 0.19, -0.04, col(base, (r() - 0.5) * 12)); }
  if (bars) for (let b = 0; b < 2; b++) {
    a.save(); a.fillStyle = col(bar); a.beginPath(); const x0 = w * (b ? 0.585 : 0.455), bw = w * 0.055;
    a.moveTo(x0, 0); a.lineTo(x0 + bw, 0); a.lineTo(x0 + bw + w * 0.05, h); a.lineTo(x0 + w * 0.05, h); a.closePath(); a.globalAlpha = 0.92; a.fill(); a.restore();
  }
  // coverts: rows of small scallops over the front of the wing
  for (let i = 0; i < 15; i++) for (let j = -1; j < 11; j++) { // coverts: overlapping rounded scallops
    const x = w * (0.0 + i * 0.026) + (r() - 0.5) * 6, y = h * (j + (i % 2) * 0.5) / 10, rx = w * 0.03, ry = h * 0.065, cc = col(base, (r() - 0.5) * 8 + 4 - i * 0.4);
    const gr = g.createLinearGradient(x - rx, y, x + rx, y); gr.addColorStop(0, '#6c6c6c'); gr.addColorStop(0.8, '#a0a0a0'); gr.addColorStop(1, '#a8a8a8');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); a.fillStyle = cc; a.beginPath(); a.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); a.fill();
  }
  const [bc, bg] = mkCanvas(w, h); bg.filter = 'blur(2px)'; bg.drawImage(hc, 0, 0);
  const [cc2, cg] = mkCanvas(w, h); cg.filter = 'blur(1.2px)'; cg.drawImage(ac, 0, 0);
  return { map: texOf(cc2), normalMap: heightToNormal(bc, 2.0) };
}

// ---------- tail feather card (alpha): grey, a black band near the tip, a pale edge ----------
function tailFeatherTex() {
  const [c, g] = mkCanvas(128, 512);
  g.clearRect(0, 0, 128, 512); g.save(); g.beginPath(); g.moveTo(22, 512); g.lineTo(18, 60); g.quadraticCurveTo(64, -18, 110, 60); g.lineTo(106, 512); g.closePath(); g.clip();
  const gr = g.createLinearGradient(0, 512, 0, 0); gr.addColorStop(0, '#8d94a3'); gr.addColorStop(0.72, '#7f8696'); gr.addColorStop(0.76, '#24262b'); gr.addColorStop(0.95, '#2b2d33'); gr.addColorStop(1, '#5d6068');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 512);
  g.strokeStyle = 'rgba(230,232,238,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 512); g.lineTo(64, 14); g.stroke();
  g.globalAlpha = 0.08; g.strokeStyle = '#fff'; for (let y = 20; y < 512; y += 5) { g.beginPath(); g.moveTo(64, y); g.lineTo(10, y - 22); g.moveTo(64, y); g.lineTo(118, y - 22); g.stroke(); }
  g.restore(); return texOf(c);
}
function irisTex(outer = '#a8401a', inner = '#c7742a') {
  const [c, g] = mkCanvas(256, 256); const r = rng(9);
  g.fillStyle = '#5a1a08'; g.fillRect(0, 0, 256, 256);
  const gr = g.createRadialGradient(128, 128, 30, 128, 128, 120); gr.addColorStop(0, inner); gr.addColorStop(0.42, inner); gr.addColorStop(0.56, outer); gr.addColorStop(0.88, outer); gr.addColorStop(1, '#5c1a08');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 900; i++) { const an = r() * Math.PI * 2, r0 = 44 + r() * 30, r1 = 70 + r() * 50; g.strokeStyle = `rgba(${r() > 0.5 ? '255,200,120' : '120,30,10'},${0.08 + r() * 0.12})`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(128 + Math.cos(an) * r0, 128 + Math.sin(an) * r0); g.lineTo(128 + Math.cos(an + 0.05) * r1, 128 + Math.sin(an + 0.05) * r1); g.stroke(); }
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '70,20,6' : '230,150,70'},${0.06 + r() * 0.1})`; const an = r() * 6.28, rr = 50 + r() * 65; g.beginPath(); g.arc(128 + Math.cos(an) * rr, 128 + Math.sin(an) * rr, 3 + r() * 7, 0, 6.28); g.fill(); }
  g.fillStyle = '#050505'; g.beginPath(); g.arc(128, 128, 44, 0, Math.PI * 2); g.fill();
  return texOf(c);
}
const SCALE_N = (() => { // reptile-like scales on the legs and toes
  const [c, g] = mkCanvas(128, 256); g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 256); const r = rng(4);
  for (let y = 0; y < 256; y += 14) { const gr = g.createLinearGradient(0, y, 0, y + 14); gr.addColorStop(0, '#c0c0c0'); gr.addColorStop(0.8, '#6a6a6a'); gr.addColorStop(1, '#404040'); g.fillStyle = gr; g.fillRect(0, y, 128, 14); for (let x = 0; x < 128; x += 18 + r() * 10) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y, 2, 14); } }
  return heightToNormal(c, 2);
})();

const FEATHER = featherSheet({ seed: 3 }), WINGT = wingSheet({}), TAILT = tailFeatherTex(), IRIS = irisTex();

// ---------- small math: Catmull-Rom over arrays of numbers (uniform), Hermite ----------
function crArr(P, t) { // P: array of arrays; t in [0, 1]
  const n = P.length - 1, f = clamp(t) * n, i = Math.min(Math.floor(f), n - 1), u = f - i;
  const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, n)];
  return p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
}
const hermite = (p0, m0, p1, m1, u) => { const u2 = u * u, u3 = u2 * u; return p0.clone().multiplyScalar(2 * u3 - 3 * u2 + 1).add(m0.clone().multiplyScalar(u3 - 2 * u2 + u)).add(p1.clone().multiplyScalar(-2 * u3 + 3 * u2)).add(m1.clone().multiplyScalar(u3 - u2)); };

// ---------- the species ----------
const PIGEON = {
  // body-local spine samples (x forward, y up): [x, y, halfWidth, upperHeight, lowerHeight]
  body: [[-0.118, 0.030, 0.004, 0.003, 0.003], [-0.100, 0.026, 0.010, 0.006, 0.008], [-0.082, 0.021, 0.017, 0.012, 0.012], [-0.056, 0.015, 0.028, 0.021, 0.022], [-0.026, 0.010, 0.039, 0.028, 0.034],
         [0.006, 0.010, 0.043, 0.031, 0.042], [0.030, 0.019, 0.038, 0.030, 0.039], [0.042, 0.033, 0.028, 0.025, 0.029]],
  // head-local (origin at the middle of the skull)
  head: [[-0.017, -0.017, 0.0168, 0.0150, 0.0190], [-0.0115, -0.0065, 0.0166, 0.0164, 0.0166], [-0.003, 0.000, 0.0158, 0.0165, 0.0140], [0.007, -0.001, 0.0135, 0.0145, 0.0118], [0.015, -0.004, 0.0092, 0.0096, 0.0080], [0.0215, -0.0055, 0.0044, 0.0042, 0.0038]],
  neckPuff: 1.05, rowLen: [0.0105, 0.0060, 0.0028],
  color(u, th, nz) { // u: 0 tail -> 1 beak; th: angle around (pi/2 = top)
    const top = Math.sin(th), body = [0.56, 0.59, 0.66], back = [0.53, 0.56, 0.63], belly = [0.62, 0.64, 0.70], breast = [0.50, 0.47, 0.53], neck = [0.25, 0.28, 0.33], head = [0.35, 0.38, 0.45];
    let c = body.map((v, k) => lerp(lerp(v, belly[k], smooth(0, -0.9, top)), back[k], smooth(0.2, 0.9, top)));
    c = c.map((v, k) => lerp(v, breast[k], smooth(0.24, 0.40, u) * smooth(0.2, -0.6, top) * 0.8));
    c = c.map((v, k) => lerp(v, [0.66, 0.68, 0.74][k], smooth(0.13, 0.02, u) * 0.6));
    c = c.map((v, k) => lerp(v, neck[k], smooth(0.36, 0.47, u)));
    c = c.map((v, k) => lerp(v, head[k], smooth(0.70, 0.78, u)));
    const n = 1 + nz * 0.07; return c.map(v => Math.pow(v * n, 2.2));
  },
  // the iridescent patch (u, around) -> [mask, thickness 0..1]
  irid(u, th) { const m = smooth(0.40, 0.50, u) * smooth(0.76, 0.66, u); const front = Math.sin(th) < 0 ? 1 : 0.4; return [m, clamp(0.35 + 0.45 * smooth(0.48, 0.70, u) * (1 - 0.6 * front) + 0.1 * Math.cos(th))]; },
  legHip: V(0.006, -0.020, 0.015), L1: 0.032, L2: 0.031, legColor: 0xa8433d, headHeight: 0.170, bodyHeight: 0.074, bodyPitch: 0.16,
};

// ---------- a lofted bird skin ----------
function birdSkin(spec, { nb = 64, nn = 44, nh = 44, nv = 56 } = {}) {
  const nu = nb + nn + nh, cols = nv + 1, N = nu * cols;
  const pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), uv1 = new Float32Array(N * 2), col = new Float32Array(N * 3), idx = [];
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, d, b, a, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  // u of each ring, and its section parameters in its own part's frame
  const uB = 0.47, uN = 0.71; const ringU = [], part = [];
  for (let i = 0; i < nb; i++) { ringU.push(uB * i / nb); part.push(0); }
  for (let i = 0; i < nn; i++) { ringU.push(uB + (uN - uB) * i / nn); part.push(1); }
  for (let i = 0; i < nh; i++) { ringU.push(uN + (1 - uN) * i / (nh - 1)); part.push(2); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < cols; j++) {
    const k = i * cols + j, th = -Math.PI / 2 + 2 * Math.PI * j / nv, nz = (h3(i * 0.37, j * 0.71, 3) - 0.5);
    uv1[k * 2] = ringU[i]; uv1[k * 2 + 1] = j / nv; uv[k * 2 + 1] = j / nv;
    const c = spec.color(ringU[i], th, nz); col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
  }
  // iridescence mask + thickness, roughness (glossier neck) in uv1 space
  const [mc, mg] = mkCanvas(256, 64), [tc, tg] = mkCanvas(256, 64), [rc, rg] = mkCanvas(256, 64);
  const mi = mg.createImageData(256, 64), ti = tg.createImageData(256, 64), ri = rg.createImageData(256, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) {
    const u = (x + 0.5) / 256, th = -Math.PI / 2 + 2 * Math.PI * (1 - (y + 0.5) / 64), [m, t] = spec.irid(u, th), q = (y * 256 + x) * 4, n = h3(x * 0.3, y * 0.9, 1) * 0.08;
    mi.data[q] = mi.data[q + 1] = mi.data[q + 2] = m * 255; mi.data[q + 3] = 255;
    ti.data[q] = ti.data[q + 1] = ti.data[q + 2] = clamp(t + n - 0.04) * 255; ti.data[q + 3] = 255;
    const ro = lerp(0.82, 0.5, m); ri.data[q] = ri.data[q + 1] = ri.data[q + 2] = ro * 255; ri.data[q + 3] = 255;
  }
  mg.putImageData(mi, 0, 0); tg.putImageData(ti, 0, 0); rg.putImageData(ri, 0, 0);
  const ch1 = (c) => { const t = new THREE.CanvasTexture(c); t.channel = 1; t.flipY = true; return t; };
  const fm = FEATHER.map.clone(), fn = FEATHER.normalMap.clone(); [fm, fn].forEach(t => { t.needsUpdate = true; t.repeat.set(1, 1); });
  const mat = new THREE.MeshPhysicalMaterial({
    map: fm, normalMap: fn, normalScale: new THREE.Vector2(0.24, 0.24), vertexColors: true, roughness: 1, roughnessMap: ch1(rc),
    sheen: 0.45, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.30, 0.32, 0.38),
    iridescence: 1, iridescenceMap: ch1(mc), iridescenceIOR: 1.6, iridescenceThicknessRange: [220, 560], iridescenceThicknessMap: ch1(tc), envMapIntensity: 1.0,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  const P = Array.from({ length: nu }, () => new THREE.Vector3()), S = Array.from({ length: nu }, () => [0, 0, 0]), UP = Array.from({ length: nu }, () => new THREE.Vector3());
  const tmp = new THREE.Vector3(), T = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3();
  // bodyM / headM: matrices (bird-root space); returns nothing, rewrites the vertices
  mesh.userData.update = (bodyM, headM) => {
    const bq = new THREE.Quaternion().setFromRotationMatrix(bodyM), hq = new THREE.Quaternion().setFromRotationMatrix(headM);
    const bUp = V(0, 1, 0).applyQuaternion(bq), hUp = V(0, 1, 0).applyQuaternion(hq);
    for (let i = 0; i < nb; i++) { const s = crArr(spec.body, i / (nb - 1)); P[i].set(s[0], s[1], 0).applyMatrix4(bodyM); S[i] = [s[2], s[3], s[4]]; UP[i].copy(bUp); }
    for (let i = 0; i < nh; i++) { const s = crArr(spec.head, i / (nh - 1)); P[nb + nn + i].set(s[0], s[1], 0).applyMatrix4(headM); S[nb + nn + i] = [s[2], s[3], s[4]]; UP[nb + nn + i].copy(hUp); }
    // the neck: a Hermite curve leaving the body along its spine and entering the head along its own
    const p0 = P[nb - 1], p1 = P[nb + nn], chord = p0.distanceTo(p1);
    const m0 = P[nb - 1].clone().sub(P[nb - 3]).normalize().multiplyScalar(chord * 0.85), m1 = P[nb + nn + 2].clone().sub(P[nb + nn]).normalize().multiplyScalar(chord * 0.75);
    // the neck's section sizes: a cubic that continues the body's taper and arrives with the head's (no crease at either joint)
    const lb = P[nb - 1].distanceTo(P[nb - 2]) || 1e-4, lh = P[nb + nn + 1].distanceTo(P[nb + nn]) || 1e-4, nl = chord * 1.15; // slopes per metre, scaled to the neck's length
    const s0 = S[nb - 1], s1 = S[nb + nn], d0 = S[nb - 1].map((v, k) => (v - S[nb - 2][k]) / lb * nl), d1 = S[nb + nn + 1].map((v, k) => (v - S[nb + nn][k]) / lh * nl);
    for (let i = 0; i < nn; i++) {
      const u = (i + 1) / (nn + 1), u2 = u * u, u3 = u2 * u; P[nb + i].copy(hermite(p0, m0, p1, m1, u)); const puff = 1 + (spec.neckPuff - 1) * Math.pow(Math.sin(Math.PI * u), 2);
      S[nb + i] = s0.map((v, k) => ((2 * u3 - 3 * u2 + 1) * v + (u3 - 2 * u2 + u) * d0[k] + (-2 * u3 + 3 * u2) * s1[k] + (u3 - u2) * d1[k]) * puff); UP[nb + i].copy(bUp).lerp(hUp, smooth(0.1, 0.9, u)).normalize();
    }
    for (let i = 0; i < nu; i++) {
      T.copy(P[Math.min(i + 1, nu - 1)]).sub(P[Math.max(i - 1, 0)]).normalize();
      side.crossVectors(T, UP[i]).normalize(); up.crossVectors(side, T).normalize();
      const [a, bu, bd] = S[i];
      for (let j = 0; j < cols; j++) {
        const th = -Math.PI / 2 + 2 * Math.PI * j / nv, c = Math.cos(th), s = Math.sin(th), k = (i * cols + j) * 3;
        tmp.copy(P[i]).addScaledVector(side, a * c).addScaledVector(up, (s > 0 ? bu : bd) * s);
        pos[k] = tmp.x; pos[k + 1] = tmp.y; pos[k + 2] = tmp.z;
      }
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    const nr = geo.attributes.normal.array; // weld the seam normals (belly line)
    for (let i = 0; i < nu; i++) { const a = i * cols * 3, b = (i * cols + nv) * 3; for (let q = 0; q < 3; q++) { const m = (nr[a + q] + nr[b + q]) / 2; nr[a + q] = nr[b + q] = m; } }
  };
  // uv.x: feather rows by rest-pose arc length (fixed afterwards, so a stretching neck stretches its feathers instead of sliding them)
  mesh.userData.initUV = () => {
    let acc = 0;
    for (let i = 0; i < nu; i++) {
      if (i > 0) acc += P[i].distanceTo(P[i - 1]) / spec.rowLen[part[i]];
      for (let j = 0; j < cols; j++) uv[(i * cols + j) * 2] = acc / 16;
    }
    geo.attributes.uv.needsUpdate = true;
  };
  mesh.userData.section = (x) => { // body-local cross-section at body x (for placing wings): [y, a, bu, bd]
    const B = spec.body; if (x <= B[0][0]) return [B[0][1], B[0][2], B[0][3], B[0][4]];
    for (let t = 0; t <= 1.0001; t += 0.005) { const s = crArr(B, t); if (s[0] >= x) return [s[1], s[2], s[3], s[4]]; }
    const l = B[B.length - 1]; return [l[1], l[2], l[3], l[4]];
  };
  return mesh;
}

// ---------- a folded wing lying on the body's side (body-local); side = +1 right, -1 left ----------
function foldedWing(skin, sideSign, { xFront = 0.026, xTip = -0.142, ns = 44, nt = 16, color = 0xffffff } = {}) {
  const cols = nt + 1, N = (ns + 1) * cols, pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), idx = [];
  for (let i = 0; i <= ns; i++) for (let j = 0; j <= nt; j++) {
    const s = i / ns, t = j / nt, x = lerp(xFront, xTip, s), k = i * cols + j;
    let [cy, a, bu, bd] = skin.userData.section(Math.max(x, -0.086));
    if (x < -0.086) { const q = smooth(-0.086, xTip, x); a = lerp(a, 0.004, q); cy += 0.004 * q; bu = lerp(bu, 0.003, q); }
    const thTop = lerp(1.32, 1.47, smooth(0, 1, s)), thBot = lerp(-0.42, 0.55, smooth(0.15, 1, s)) - 0.25 * Math.sin(Math.PI * clamp(s * 1.6)) * (1 - s);
    const th = lerp(thTop, thBot, t), c = Math.cos(th), sn = Math.sin(th), b = sn > 0 ? bu : bd;
    const off = lerp(-0.0020, 0.0010, smooth(0, 0.3, s)) - 0.0024 * (1 - smooth(0, 0.4, t)) * (1 - 0.6 * smooth(0.5, 1, s)) + 0.0028 * smooth(0.35, 1, t) * smooth(0.05, 0.4, s);
    const nz = c / Math.max(a, 1e-4), ny = sn / Math.max(b, 1e-4), nl = Math.hypot(nz, ny) || 1;
    const y = cy + b * sn + off * ny / nl + 0.0008, z = sideSign * (a * c + off * nz / nl);
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = s; uv[k * 2 + 1] = t;
  }
  for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; if (sideSign > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: WINGT.map, normalMap: WINGT.normalMap, normalScale: new THREE.Vector2(0.42, 0.42), color, roughness: 0.84, sheen: 0.4, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.32, 0.34, 0.4), side: THREE.DoubleSide }));
  m.castShadow = m.receiveShadow = true; return m;
}
// the tail: a closed, slightly cupped fan of stacked feathers (a lofted solid, so it reads from every angle)
const TAIL_T = (() => {
  const [c, g] = mkCanvas(512, 256), [hc, hg] = mkCanvas(512, 256);
  const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#8a91a0'); gr.addColorStop(0.70, '#7c8392'); gr.addColorStop(0.75, '#26282d'); gr.addColorStop(0.93, '#2a2c31'); gr.addColorStop(1, '#4d5058');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256); hg.fillStyle = '#808080'; hg.fillRect(0, 0, 512, 256);
  for (let i = 0; i <= 12; i++) { const y = i * 256 / 12; g.fillStyle = 'rgba(20,20,24,0.25)'; g.fillRect(0, y - 1, 512, 2); hg.fillStyle = '#404040'; hg.fillRect(0, y - 1.5, 512, 3); hg.fillStyle = '#b0b0b0'; hg.fillRect(0, y + 1.5, 512, 6); }
  const [bc, bg] = mkCanvas(512, 256); bg.filter = 'blur(1.5px)'; bg.drawImage(hc, 0, 0);
  return { map: texOf(c), normalMap: heightToNormal(bc, 2) };
})();
function tailSolid({ len = 0.105, ns = 24, nv = 28 } = {}) {
  const cols = nv + 1, pos = new Float32Array((ns + 1) * cols * 3), uv = new Float32Array((ns + 1) * cols * 2), idx = [];
  for (let i = 0; i <= ns; i++) for (let j = 0; j <= nv; j++) {
    const s = i / ns, th = 2 * Math.PI * j / nv, k = i * cols + j, w = lerp(0.014, 0.027, Math.pow(s, 0.8)), h = lerp(0.0065, 0.0012, s), c = Math.cos(th), sn = Math.sin(th);
    const z = w * Math.sign(c) * Math.pow(Math.abs(c), 0.45), y = h * Math.sign(sn) * Math.pow(Math.abs(sn), 0.9) - 0.006 * s * s + 0.004 * (z / 0.027) ** 2;
    pos[k * 3] = -s * len; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = s; uv[k * 2 + 1] = j / nv;
  }
  for (let i = 0; i < ns; i++) for (let j = 0; j < nv; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: TAIL_T.map, normalMap: TAIL_T.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.8, sheen: 0.4, sheenColor: new THREE.Color(0.3, 0.32, 0.38), side: THREE.DoubleSide }));
  m.castShadow = m.receiveShadow = true; return m;
}
// ---------- legs ----------
function cyl(r0, r1, mat, rs = 14) { const g = new THREE.CylinderGeometry(r1, r0, 1, rs, 1, true); g.translate(0, 0.5, 0); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m; }
const UPY = V(0, 1, 0);
function placeBetween(m, a, b) { const d = b.clone().sub(a), L = d.length(); m.position.copy(a); m.quaternion.setFromUnitVectors(UPY, d.normalize()); m.scale.set(1, Math.max(L, 1e-5), 1); }
function makeFoot(legMat, clawMat) {
  const f = new THREE.Group(); const toes = [];
  const toe = (len, yaw, r0) => {
    const g = new THREE.Group(); g.rotation.y = yaw; f.add(g);
    const segs = []; let parent = g;
    for (let s = 0; s < 3; s++) { const j = new THREE.Group(); if (s) j.position.x = len / 3; parent.add(j); const c = cyl(r0 * (1 - s * 0.18), r0 * (1 - (s + 1) * 0.18), legMat, 10); c.rotation.z = -Math.PI / 2; c.scale.y = len / 3; j.add(c);
      const k = new THREE.Mesh(new THREE.SphereGeometry(r0 * (1 - s * 0.18) * 1.15, 10, 8), legMat); j.add(k); k.castShadow = true; segs.push(j); parent = j; }
    const claw = new THREE.Mesh(new THREE.ConeGeometry(r0 * 0.55, len * 0.2, 8), clawMat); claw.rotation.z = -Math.PI / 2 - 0.5; claw.position.set(len / 3 + len * 0.06, -r0 * 0.3, 0); parent.add(claw);
    toes.push({ g, segs }); return g;
  };
  toe(0.026, 0, 0.0018); toe(0.020, 0.45, 0.0016); toe(0.020, -0.45, 0.0016); toe(0.013, Math.PI, 0.0015);
  f.userData.curl = (k) => toes.forEach((t, i) => t.segs.forEach((s, j) => { s.rotation.z = -(i === 3 ? -0.3 : 1) * k * (0.35 + j * 0.25); }));
  return f;
}

// ---------- the whole bird ----------
function makeBird(spec = PIGEON, opts = {}) {
  const root = new THREE.Group(), skin = birdSkin(spec, opts.lod || {}); root.add(skin);
  const body = new THREE.Group(), head = new THREE.Group(); root.add(body, head); // transforms only; children follow
  const wl = foldedWing(skin, -1), wr = foldedWing(skin, 1); body.add(wl, wr);
  const tail = tailSolid(); tail.position.set(-0.08, 0.021, 0); tail.rotation.z = 0.07; body.add(tail);
  // head parts (head-local)
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: IRIS, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x6e6468, roughness: 0.8, normalMap: SCALE_N, normalScale: new THREE.Vector2(0.4, 0.4) });
  const beakMat = new THREE.MeshPhysicalMaterial({ color: 0x2e2d31, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const cereMat = new THREE.MeshStandardMaterial({ color: 0xb4afa9, roughness: 1, normalMap: FEATHER.normalMap, normalScale: new THREE.Vector2(0.6, 0.6) });
  const ER = 0.0055, EV = 0.0035, eyeGeo = (() => { const g = new THREE.SphereGeometry(ER, 40, 30); g.rotateX(Math.PI / 2); const p = g.attributes.position, q = g.attributes.uv; // a big, mostly buried eyeball: only a flat cap shows
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (z > 0) q.setXY(i, 0.5 + x / (2 * EV), 0.5 + y / (2 * EV)); else q.setXY(i, 0.03, 0.03); } return g; })();
  for (const sd of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(0.003, 0.0035, sd * 0.0094); eg.rotation.y = sd > 0 ? 0.3 : Math.PI - 0.3; head.add(eg);
    const e = new THREE.Mesh(eyeGeo, eyeMat); eg.add(e);
    head.userData['eye' + (sd > 0 ? 'R' : 'L')] = eg;
  }
  // beak: a tapered, slightly hooked shape from x=0.0195 to 0.040
  { const prof = []; for (let i = 0; i <= 16; i++) { const k = i / 16; prof.push(new THREE.Vector2(Math.max(0.0002, 0.0050 * Math.pow(1 - k, 0.6)), k * 0.0195)); }
    const g = new THREE.LatheGeometry(prof, 20); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y / 0.0195; p.setXYZ(i, y, -p.getX(i) * 0.95 - 0.0032 * k * k, p.getZ(i) * 0.8); }
    g.computeVertexNormals(); const bk = new THREE.Mesh(g, beakMat); bk.position.set(0.0185, -0.0055, 0); bk.castShadow = true; head.add(bk);
    // flip so the curve bends down: the lathe's x became -y above
  }
  for (const sd of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), cereMat); c.scale.set(0.0046, 0.0024, 0.0021); c.position.set(0.0222, -0.0020, sd * 0.0015); c.castShadow = true; head.add(c); }
  // legs
  const legMat = new THREE.MeshPhysicalMaterial({ color: spec.legColor, roughness: 0.5, normalMap: SCALE_N, normalScale: new THREE.Vector2(0.8, 0.8), sheen: 0.3, sheenColor: new THREE.Color(0.9, 0.5, 0.5) });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x2b2522, roughness: 0.45 });
  const thighMat = skin.material;
  const legs = [-1, 1].map(sd => {
    const tib = cyl(0.0080, 0.0034, new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(...spec.color(0.3, -1.2, 0)).multiplyScalar(0.75), map: FEATHER.map, normalMap: FEATHER.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.9, sheen: 0.45, sheenColor: new THREE.Color(0.32, 0.34, 0.4) }), 16);
    const tar = cyl(0.0027, 0.0023, legMat, 12), ank = new THREE.Mesh(new THREE.SphereGeometry(0.0031, 12, 10), legMat), foot = makeFoot(legMat, clawMat);
    ank.castShadow = true; root.add(tib, tar, ank, foot); return { sd, tib, tar, ank, foot };
  });
  root.userData = { skin, body, head, legs, spec };
  poseBird(root, gait(0, {}, spec)); skin.userData.initUV();
  // paint the bare eye-ring onto the skin round each eye (rest pose, head-local)
  { const inv = head.matrix.clone().invert(), pa = skin.geometry.attributes.position, ca = skin.geometry.attributes.color, v = new THREE.Vector3(), rc = [0.44, 0.40, 0.42].map(x => Math.pow(x, 2.2));
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(inv); if (Math.abs(v.z) < 0.006) continue; const d = Math.hypot(v.x - 0.003, v.y - 0.0035); const k = smooth(0.0056, 0.0040, d);
      if (k > 0) ca.setXYZ(i, lerp(ca.getX(i), rc[0], k), lerp(ca.getY(i), rc[1], k), lerp(ca.getZ(i), rc[2], k)); }
    ca.needsUpdate = true; }
  return root;
}

// ---------- the gait. tw: the bird's own clock (s). Returns poses in bird-root space (x forward) ----------
// mode 'walk': body advances at v and the head hold-thrusts; 'tread': a treadmill, body and head stay put while the belt runs back
function gait(tw, { v = 0.2, Ts = 0.24, duty = 0.62, mode = 'walk', lead = 0.096, thrustFrac = 0.3, headY = null, look = 0, pitch = 0, peck = 0 } = {}, spec = PIGEON) {
  const k0 = Math.floor(tw / Ts), ph = tw / Ts - k0, sw = (1 - duty) * 2; // each foot swings for sw*Ts
  const bx = mode === 'tread' ? 0 : v * tw;
  const body = { x: bx + 0.002 * Math.sin(2 * Math.PI * tw / Ts), y: spec.bodyHeight + 0.0016 * Math.cos(2 * Math.PI * tw / Ts), pitch: spec.bodyPitch + 0.012 * Math.sin(2 * Math.PI * tw / Ts), roll: 0.035 * Math.sin(Math.PI * tw / Ts), yaw: 0.02 * Math.sin(Math.PI * tw / Ts + 1) };
  // feet: foot of step k (left even, right odd) swings during [k Ts, k Ts + sw Ts] and lands lead-ahead of the body
  const land = (k) => v * (k * Ts + sw * Ts) + 0.03;
  const feet = [0, 1].map(f => {
    // the most recent step index of this foot
    let k = k0 - ((k0 - f) % 2 + 2) % 2; const t0 = k * Ts, p = (tw - t0) / (sw * Ts);
    let x, y = 0, curl = 0;
    if (p < 1) { x = lerp(land(k - 2), land(k), E.io(clamp(p))); y = 0.013 * Math.sin(Math.PI * clamp(p)); curl = Math.sin(Math.PI * clamp(p)); }
    else x = land(k);
    if (mode === 'tread') x -= v * tw;
    return { x, y, z: (f ? 1 : -1) * 0.0135, curl };
  });
  // head: holds during each step, then thrusts in ballistic fashion
  let hx;
  if (mode === 'tread') hx = lead - v * Ts * (1 - thrustFrac) * 0.5;
  else { const tp = clamp(ph / thrustFrac), hold = (k) => v * (k * Ts + thrustFrac * Ts) + lead; hx = ph < thrustFrac ? lerp(hold(k0 - 1), hold(k0), tp * tp * tp * (tp * (tp * 6 - 15) + 10)) : hold(k0); }
  const thr = mode === 'tread' ? 0 : (ph < thrustFrac ? Math.sin(Math.PI * clamp(ph / thrustFrac)) : 0);
  const head = { x: hx, y: (headY ?? spec.headHeight) - 0.003 * thr - peck * 0.11, pitch: -0.10 + pitch - 0.06 * thr - peck * 1.1, yaw: look, z: 0 };
  if (peck) head.x += peck * 0.02;
  return { body, feet, head, thr };
}
function poseBird(bird, P) {
  const U = bird.userData, b = P.body, h = P.head;
  U.body.position.set(b.x, b.y, 0); U.body.rotation.set(b.roll, b.yaw, b.pitch, 'YXZ');
  U.head.position.set(h.x, h.y, h.z || 0); U.head.rotation.set(0, h.yaw, h.pitch, 'YXZ');
  U.body.updateMatrix(); U.head.updateMatrix();
  U.skin.userData.update(U.body.matrix, U.head.matrix);
  for (const L of U.legs) {
    const F = P.feet[L.sd > 0 ? 1 : 0], hip = U.spec.legHip.clone().setZ(U.spec.legHip.z * L.sd).applyMatrix4(U.body.matrix);
    const foot = V(F.x, F.y + 0.0045, F.z), d = Math.min(foot.distanceTo(hip), (U.spec.L1 + U.spec.L2) * 0.995), e = foot.clone().sub(hip).normalize();
    const ca = (U.spec.L1 ** 2 + d * d - U.spec.L2 ** 2) / (2 * U.spec.L1 * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    const back = V(-1, 0, 0).sub(e.clone().multiplyScalar(-e.x)).normalize(), ank = hip.clone().addScaledVector(e, U.spec.L1 * ca).addScaledVector(back, U.spec.L1 * sa);
    const footP = ank.clone().add(foot.clone().sub(ank).normalize().multiplyScalar(U.spec.L2));
    placeBetween(L.tib, hip, ank); placeBetween(L.tar, ank, footP); L.ank.position.copy(ank);
    L.foot.position.set(footP.x, Math.max(footP.y - 0.0025, 0.0019), footP.z); L.foot.rotation.set(0, L.sd * -0.12, 0); L.foot.userData.curl(F.curl);
  }
}
