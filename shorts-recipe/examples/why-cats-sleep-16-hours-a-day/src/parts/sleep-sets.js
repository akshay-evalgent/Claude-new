// =====================================================================
// SETS: "Why Cats Sleep 16 Hours A Day". A curled-up sleeping cat, a gallop for the sprint, the bedroom
// by day, night and dawn, a 24-hour dial, an energy battery, Zzz, and sound rings for the swivelling ears.
// =====================================================================
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const blinkAt = (t, seed = 0) => { const P = 3.4 + seed * 0.37, a = (((t + seed * 1.13) % P) + P) % P; return a < 0.16 ? Math.sin(Math.PI * a / 0.16) : 0; };
function mkCat(sc, s = CS) { const c = makeCat2(TABBY); c.scale.setScalar(s); c.rotation.order = 'YXZ'; sc.add(c); return c; }
const _q2 = new THREE.Quaternion(), _e2 = new THREE.Euler();

// curled up asleep on its side: paws tucked, head tucked toward the tail, the tail wrapped round the front.
// P = the surface point under the middle of the body (y = surface height); ry = heading.
function curlSleep(c, t, { P, ry = 0, eye = 0, eyeL = null, earL = 0, earR = 0, head = 0, breath = 1, curl = 1 } = {}) {
  const u = c.userData, S = c.scale.x, roll = Math.PI / 2 * 0.86 * curl; c.rotation.order = 'YXZ'; c.rotation.set(0, ry, roll);
  _q2.setFromEuler(_e2.set(0, ry, roll, 'YXZ')); const off = V(0, 0.5, -0.05).multiplyScalar(S).applyQuaternion(_q2);
  c.position.set(P.x, P.y + 0.46 * S, P.z).sub(off);
  u.pose({ crouch: 1 });
  u.legs.forEach(L => {
    const j = L.up.position;
    if (L.front) { L.T.lerp(V(L.sx * 0.12 - 0.05, 0.12, j.z + 0.42), curl); L.pitch = 0.9 * curl; }
    else { L.T.lerp(V(L.sx * 0.18 - 0.08, 0.18, j.z + 0.55), curl); L.pitch = 0.4 * curl; }
  });
  u.solve().breathe(t, 0.035 * breath).whisk(0.1);
  // head tucked down and round toward the tail
  u.head.rotation.set(0.55 * curl - 0.5 * head, -0.55 * curl * (1 - head), 0.35 * curl * (1 - head)); u.head.position.y -= 0.12 * curl * (1 - head); u.head.position.z -= 0.06 * curl;
  u.gazeRest(); u.lid(clamp(1 - eye), 0.05);
  if (eyeL !== null) u.lids[0].rotation.x = lerp(-0.8, 1.45, clamp(1 - eyeL));
  u.ears(0.05, earL, earR);
  const w = 0.03 * Math.sin(t * 0.9);
  u.tail([V(0, 0.5, -1.05), V(-0.4, 0.3, -1.25), V(-0.85, 0.2, -0.85), V(-0.95 + w, 0.18, -0.2), V(-0.7 + w, 0.18, 0.4)]);
  return u;
}
// asleep on its side (lie = 0 sitting in a loaf ... 1 lying on its side), cheek on the bed, paws tucked, tail curled round.
// With ry = PI/2 the head points +x and the belly faces +z. eyeUp opens the upper eye (a side-eye).
function sideSleep(c, t, { P, ry = Math.PI / 2, eye = 0, eyeUp = 0, earL = 0, earR = 0, headUp = 0, breath = 1, lie = 1 } = {}) {
  const u = c.userData, S = c.scale.x, roll = (-Math.PI / 2 + 0.12) * lie; c.rotation.order = 'YXZ'; c.rotation.set(0, ry, roll);
  c.position.set(P.x, P.y + 0.3 * S / 0.55 * lie, P.z);
  u.pose({ crouch: 1 });
  u.legs.forEach(L => { L.T.y += 0.1 * lie; L.T.x += L.sx * 0.1 * lie; L.T.z += (L.front ? 0.05 : 0.15) * lie; L.pitch = (L.front ? 0.9 : 0.3) * lie; });
  u.solve().breathe(t, 0.035 * breath).whisk(0.1);
  u.head.position.y += 0.05 * lie; u.head.position.z += 0.02 * lie;
  u.head.rotation.set((0.25 - 0.3 * headUp) * lie + 0.15 * (1 - lie), 0, (0.4 + 0.5 * headUp) * lie);
  u.gazeRest(); u.lid(clamp(1 - eye), 0.05); if (eyeUp) u.lids[1].rotation.x = lerp(-0.8, 1.45, clamp(1 - eyeUp));
  u.ears(0.05, earL, earR);
  const w = 0.02 * Math.sin(t * 0.9);
  u.tail([V(0, 0.5, -1.1), V(0.02, 0.22, -1.3), V(0.05, -0.02, -1.0), V(0.08 + w, -0.1, -0.45), V(0.1 + w, -0.06, 0.05)].map((p, i) => lie < 1 ? p.clone().lerp([V(0, 0.3, -0.92), V(0.3, 0.12, -1.0), V(0.55, 0.06, -0.7), V(0.6, 0.06, -0.3), V(0.45, 0.06, 0.05)][i], 1 - lie) : p));
  return u;
}
// a bounding gallop for a standing cat (s = distance in cat units; k fades it in)
function catGallop(u, s, k = 1, { stride = 1.1 } = {}) {
  const ph = (s / stride) % 1;
  u.legs.forEach((L, i) => {
    const p = (ph + (L.front ? 0 : 0.5) + (L.sx > 0 ? 0.06 : 0)) % 1, base = L.T.clone();
    let z, y = 0, pitch = 0;
    if (p < 0.45) z = stride * 0.55 * (0.5 - p / 0.45); else { const w = (p - 0.45) / 0.55; z = -stride * 0.275 + stride * 0.55 * E.io(w); y = 0.32 * Math.sin(Math.PI * w); pitch = -0.7 * Math.sin(Math.PI * w); }
    u.paw(i, base.add(V(0, y * k, z * k)), pitch * k);
  });
  u.solve();
  const flex = Math.sin(2 * Math.PI * ph) * k; u.torso.scale.z *= 1 + 0.08 * flex; u.hips.position.y += 0.05 * flex; u.head.position.y += 0.03 * Math.cos(2 * Math.PI * ph) * k;
  return ph;
}
// you, asleep in bed under the duvet (only the head shows)
function sleeper(sc) {
  const O = makeKid(PJ); sc.add(O); const ou = O.userData;
  return { O, ou, pose(t, { lift = 0, glare = 0 } = {}) {
    ou.reset(); O.rotation.set(-Math.PI / 2, 0, 0); O.position.set(0.05, 1.04, 1.22); ou.neck(0.85); ou.breathe(t, 0.22, 0.03); ou.legs.forEach(L => L.hip.visible = false); ou.torso.visible = false;
    ou.setLid(lerp(0.9, 0.35, glare)); ou.wince(0.5 * glare); return ou; } };
}
// the bedroom re-lit: 'day' (warm sun), 'night' (moonlight), 'dawn' (blue with a pink edge)
function sleepRoom(sc, mood = 'day') {
  const R = bedroom(sc);
  sc.traverse(o => { if (o.isLight && !o.isHemisphereLight) o.userData.base = o.intensity; });
  const add = (l) => { sc.add(l); if (l.target) sc.add(l.target); return l; };
  if (mood === 'day') {
    sc.environment = tintedEnv(1.0, 0.92, 0.8); sc.add(new THREE.HemisphereLight(0xfff2e0, 0x8a6a50, 1.25));
    const sun = add(new THREE.DirectionalLight(0xffdcb0, 3.4)); sun.position.set(4.5, 6, 3.5); sun.target.position.set(0, 1, 0.8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); sun.shadow.bias = -0.0004; sun.userData.soft = 0.25;
  } else if (mood === 'night') {
    sc.traverse(o => { if (o.isLight && !o.isHemisphereLight) o.intensity = (o.userData.base || o.intensity) * 0.05; if (o.isHemisphereLight) o.intensity *= 0.3; });
    sc.environment = tintedEnv(0.12, 0.15, 0.3); sc.add(new THREE.HemisphereLight(0x5a6ab0, 0x0a0c14, 0.18));
    const moon = add(new THREE.DirectionalLight(0x9fb4ff, 1.3)); moon.position.set(4.5, 5, 2.5); moon.target.position.set(0, 1, 0.8); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); moon.userData.soft = 0.2;
  } else {
    sc.traverse(o => { if (o.isLight && !o.isHemisphereLight) o.intensity = (o.userData.base || o.intensity) * 0.45; });
    sc.environment = tintedEnv(0.55, 0.55, 0.85); sc.add(new THREE.HemisphereLight(0xa8b8ff, 0x302838, 0.55));
    const dawn = add(new THREE.DirectionalLight(0xffa8b8, 1.5)); dawn.position.set(4.5, 2.2, 3); dawn.target.position.set(0, 1, 0.5); dawn.castShadow = true; dawn.shadow.mapSize.set(2048, 2048); Object.assign(dawn.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
  }
  return R;
}

// ---------- a 24-hour dial (2D card): a filled arc, or dawn/dusk wedges with the sun and moon ----------
function dial24(w = 0.5) {
  const cd = canvasDyn(512, 512), g = cd.g;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({ map: cd.t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); m.renderOrder = 15; m.userData.noDof = true;
  const A = (h) => -Math.PI / 2 + h / 24 * Math.PI * 2;   // midnight at the top
  m.userData.draw = ({ fill = 0, label = '', wedges = 0, sunH = null, pulse = 0 } = {}) => {
    g.clearRect(0, 0, 512, 512); const cx = 256, cy = 256;
    g.fillStyle = 'rgba(14,22,44,0.82)'; g.beginPath(); g.arc(cx, cy, 236, 0, 7); g.fill();
    g.lineWidth = 34; g.strokeStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.arc(cx, cy, 190, 0, 7); g.stroke();
    if (fill > 0) { g.strokeStyle = '#8fb8ff'; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, 190, A(0), A(24 * fill)); g.stroke(); g.lineCap = 'butt'; }
    if (wedges > 0) [[4.5, 7.5, '#ffb070'], [17, 20, '#ff8a6a']].forEach(([a, b, col]) => { g.strokeStyle = col; g.globalAlpha = wedges * (0.75 + 0.25 * pulse); g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, 190, A(a), A(b)); g.stroke(); g.globalAlpha = 1; g.lineCap = 'butt'; });
    for (let h = 0; h < 24; h++) { const a = A(h), r0 = h % 6 ? 160 : 148; g.strokeStyle = h % 6 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)'; g.lineWidth = h % 6 ? 3 : 6; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * 172, cy + Math.sin(a) * 172); g.stroke(); }
    if (sunH !== null) { const a = A(sunH), day = sunH > 6 && sunH < 18.5; g.fillStyle = day ? '#ffd24a' : '#e8eeff'; g.beginPath(); g.arc(cx + Math.cos(a) * 190, cy + Math.sin(a) * 190, 30, 0, 7); g.fill(); if (!day) { g.fillStyle = 'rgba(14,22,44,1)'; g.beginPath(); g.arc(cx + Math.cos(a) * 190 + 12, cy + Math.sin(a) * 190 - 8, 26, 0, 7); g.fill(); } }
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 104px "Arial Black", Arial, sans-serif'; g.fillText(label, cx, cy + 6);
    cd.t.needsUpdate = true;
  };
  m.userData.draw(); return m;
}
// ---------- an energy battery (2D card) ----------
function battery(w = 0.32) {
  const cd = canvasDyn(512, 256), g = cd.g;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshBasicMaterial({ map: cd.t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); m.renderOrder = 15; m.userData.noDof = true;
  m.userData.draw = (lvl, bolt = 0) => {
    g.clearRect(0, 0, 512, 256); const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
    g.fillStyle = 'rgba(0,0,0,0.25)'; rr(30, 40, 430, 190, 40); g.fill(); g.fillStyle = '#ffffff'; rr(22, 30, 430, 190, 40); g.fill(); rr(452, 90, 40, 70, 14); g.fill();
    g.fillStyle = '#1f2a36'; rr(44, 52, 386, 146, 26); g.fill();
    const col = lvl > 0.5 ? '#5ad16a' : lvl > 0.22 ? '#ffc23a' : '#ff5a4a'; g.fillStyle = col; rr(56, 64, Math.max(30, 362 * lvl), 122, 18); g.fill();
    if (bolt > 0) { g.globalAlpha = bolt; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(260, 70); g.lineTo(200, 135); g.lineTo(245, 135); g.lineTo(225, 185); g.lineTo(295, 112); g.lineTo(250, 112); g.lineTo(270, 70); g.closePath(); g.fill(); g.globalAlpha = 1; }
    cd.t.needsUpdate = true;
  };
  m.userData.draw(1); return m;
}
// ---------- Zzz rising from a sleeper ----------
function zzz(sc, n = 3) {
  const Z = []; for (let i = 0; i < n; i++) { const m = textPlane('Z', 0.3, '#ffffff', '#3a4a7a'); m.userData.noDof = true; m.material.depthTest = false; m.renderOrder = 14; sc.add(m); Z.push(m); }
  return (t, cam, src, on = 1, size = 1) => Z.forEach((m, i) => { const a = ((t * 0.45 + i / n) % 1); m.visible = on > 0.01; m.position.copy(src).add(V(0.25 * a + 0.05 * Math.sin(t * 2 + i), 0.55 * a, 0)); m.quaternion.copy(cam.quaternion); m.rotateZ(0.25); m.scale.setScalar(size * (0.35 + 0.65 * a)); m.material.opacity = on * Math.sin(Math.PI * a); });
}
// ---------- sound rings coming from a point (a fly, a click) ----------
function soundRings(sc, color = 0xffffff) {
  const ms = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 64, Math.PI * 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.3), transparent: true, depthWrite: false, toneMapped: false })); m.userData.noDof = true; sc.add(m); return m; });
  return (t, t0, t1, src, toward, cam) => ms.forEach((m, i) => { const a = ((t - t0) * 1.6 + i / 3) % 1; m.visible = t > t0 && t < t1; if (!m.visible) return; m.position.copy(src); m.quaternion.copy(cam.quaternion); const d = toward.clone().sub(src); const ang = Math.atan2(cam.worldToLocal ? 0 : 0, 1); m.scale.setScalar(0.06 + a * 0.32); m.material.opacity = (1 - a) * 0.85 * smooth(t0, t0 + 0.1, t) * (1 - smooth(t1 - 0.15, t1, t)); m.rotateZ(Math.atan2(d.y, d.x) - Math.PI * 0.45); });
}
// ---------- a buzzing fly ----------
function fly() {
  const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })); b.scale.set(1, 0.8, 1.4); g.add(b);
  [-1, 1].forEach(sx => { const w = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })); w.position.set(sx * 0.018, 0.012, -0.004); w.rotation.set(-Math.PI / 2, 0, sx * 0.4); g.add(w); g.userData['w' + sx] = w; });
  return g;
}
// ---------- speed lines behind a sprinting cat ----------
function speedLines(sc, n = 14) {
  const ms = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.012), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false })); m.userData.noDof = true; sc.add(m); ms.push([m, h3(i, 2, 3), h3(i, 5, 1)]); }
  return (t, pos, dir, cam, k) => ms.forEach(([m, a, b], i) => { m.visible = k > 0.02; if (!m.visible) return; const ph = (t * 3 + a) % 1; m.position.copy(pos).addScaledVector(dir, -0.4 - ph * 0.9).add(V(0, (b - 0.5) * 0.45, (a - 0.5) * 0.2)); m.quaternion.copy(cam.quaternion); const sd = dir.clone().applyQuaternion(cam.quaternion.clone().invert()); m.rotateZ(Math.atan2(sd.y, sd.x)); m.scale.set(0.3 + 0.4 * b, 1, 1); m.material.opacity = 0.6 * k * Math.sin(Math.PI * ph); });
}
