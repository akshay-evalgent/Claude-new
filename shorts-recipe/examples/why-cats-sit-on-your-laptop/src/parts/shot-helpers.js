// ---------- shared scene helpers (shot list, label pinning, canvas textures, moving tubes, live labels) ----------
const shots = [];
function shot(start, end, build, { near = 0.02, far = 6000 } = {}) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, ASPECT, near, far) }; build(s); shots.push(s); return s; }
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const texOf = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
function heightToNormal(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const im = g.createImageData(w, h);
  const Hh = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (Hh(x + 1, y) - Hh(x - 1, y)) * strength, dy = (Hh(x, y + 1) - Hh(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4; im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function ptFrames(curve, n) {
  const P = [], T = [], N = [], B = [];
  for (let i = 0; i <= n; i++) { P.push(curve.getPointAt(i / n)); T.push(curve.getTangentAt(i / n).normalize()); }
  let up = Math.abs(T[0].y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  N.push(up.clone().sub(T[0].clone().multiplyScalar(up.dot(T[0]))).normalize()); B.push(T[0].clone().cross(N[0]));
  for (let i = 1; i <= n; i++) { const ax = T[i - 1].clone().cross(T[i]), s = ax.length(); const nn = N[i - 1].clone();
    if (s > 1e-6) nn.applyAxisAngle(ax.normalize(), Math.asin(clamp(s, -1, 1)) * (T[i - 1].dot(T[i]) < 0 ? -1 : 1));
    nn.sub(T[i].clone().multiplyScalar(nn.dot(T[i]))).normalize(); N.push(nn); B.push(T[i].clone().cross(nn)); }
  return { P, T, N, B };
}
// a tube rebuilt every frame along a moving curve: radius(u, th)
function dynTube(nu, nv, mat, uvRep = [1, 1]) {
  const cols = nv + 1, pos = new Float32Array((nu + 1) * cols * 3), uv = new Float32Array((nu + 1) * cols * 2), idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const k = i * cols + j; uv[k * 2] = i / nu * uvRep[0]; uv[k * 2 + 1] = j / nv * uvRep[1]; }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
  m.userData.update = (curve, rad, upHint = null) => { const F = ptFrames(curve, nu); m.userData.F = F;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const th = 2 * Math.PI * j / nv, r = rad(i / nu, th), k = (i * cols + j) * 3, c = Math.cos(th), s = Math.sin(th);
      pos[k] = F.P[i].x + (F.N[i].x * c + F.B[i].x * s) * r; pos[k + 1] = F.P[i].y + (F.N[i].y * c + F.B[i].y * s) * r; pos[k + 2] = F.P[i].z + (F.N[i].z * c + F.B[i].z * s) * r; }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    const nr = geo.attributes.normal.array; for (let i = 0; i <= nu; i++) { const a = i * cols * 3, b = (i * cols + nv) * 3; for (let q = 0; q < 3; q++) { const mm = (nr[a + q] + nr[b + q]) / 2; nr[a + q] = nr[b + q] = mm; } } };
  return m;
}

function liveLabel(w = 0.5, aspect = 0.28) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * aspect); const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * aspect), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  m.renderOrder = 20; m.userData.dofMap = tex; let last = null;
  m.userData.set = (lines) => { const key = JSON.stringify(lines); if (key === last) return; last = key; g.clearRect(0, 0, c.width, c.height);
    for (const [txt, size, y, col, wt, passes] of lines) { g.font = `${wt || 800} ${size}px "Nunito", "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 22; g.lineJoin = 'round'; g.lineWidth = size * 0.09; g.strokeStyle = 'rgba(0,0,0,0.42)'; g.strokeText(txt, c.width / 2, y * c.height); g.fillStyle = col || '#ffffff'; for (let i = 0; i < (passes || 1); i++) g.fillText(txt, c.width / 2, y * c.height); }
    tex.needsUpdate = true; };
  return m;
}

// pin a label in front of the camera at the focus distance (so depth of field keeps it sharp), scaled to look the same size
function pinF(cam, lab, x, y, d0, k = 1) { const d = cam.userData.focus || d0, f = d / d0; pin(cam, lab, x * f, y * f, d); lab.scale.setScalar(Math.max(1e-4, k * f)); }
// put a label in the shot's overlay (drawn after depth of field)
function OV(s, ...ms) { if (!s.overlay) s.overlay = new THREE.Scene(); ms.forEach(m => s.overlay.add(m)); return ms[0]; }
