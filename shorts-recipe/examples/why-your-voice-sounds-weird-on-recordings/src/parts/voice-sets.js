// =====================================================================
// SETS: "Why Your Voice Sounds Weird On Recordings". You on the sofa with a phone, the two paths your voice takes
// (through the air, and through the bones of your skull), a spectrum card, headphones and a ratings card.
// =====================================================================
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const FRIEND = { shirt: 0x4a9a5a, pants: 0x3a3f4a, hair: 0x5a3a1a, skin: 0xf0c0a0, style: 'short', glasses: true, s: 1.0, hs: 1.0 };
const LISTENER = { shirt: 0xc8503a, pants: 0x2f3d5c, hair: 0x1a1a1a, skin: 0x8a5a3a, style: 'long', s: 1.0, hs: 1.0 };
function person(sc, o) { const P = makeKid(o); addSmile(P); sc.add(P); return P; }
// head landmarks (head-local), and their world positions
const HL = { mouth: V(0, -0.2, 0.43), earR: V(-0.45, 0.02, -0.02), earL: V(0.45, 0.02, -0.02), inner: V(-0.3, 0.02, -0.02), throat: V(0, -0.5, 0.15), jaw: V(-0.18, -0.32, 0.28) };
const hw = (P, k) => worldPt(P.userData.head, HL[k] || k);
// talking: the mouth flaps while the person speaks (k = 0..1)
function talk(u, t, k) { if (k <= 0.01) return; u.mouthOpen(k * (0.22 + 0.32 * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 3.1)))); }

// ---------- the phone with a live screen: 'memo' (a voice memo playing), 'rec' (recording), 'video' (a clip of you) ----------
function livePhone() {
  const ph = makePhone(); const scr = ph.children.find(o => o.isMesh && o.geometry.type === 'PlaneGeometry' && o.position.z > 0.01);
  const cd = canvasDyn(270, 560), g = cd.g; scr.material = new THREE.MeshBasicMaterial({ map: cd.t, toneMapped: false });
  ph.userData.draw = (mode, t, prog = 0) => {
    g.fillStyle = '#0d1018'; g.fillRect(0, 0, 270, 560);
    if (mode === 'video') {
      const gr = g.createLinearGradient(0, 120, 0, 380); gr.addColorStop(0, '#f4c9a0'); gr.addColorStop(1, '#d99a70'); g.fillStyle = '#5a6a8a'; g.fillRect(10, 110, 250, 300);
      g.fillStyle = '#7a3b18'; g.beginPath(); g.ellipse(135, 220, 70, 78, 0, Math.PI, 0); g.fill(); g.fillStyle = gr; g.beginPath(); g.ellipse(135, 250, 62, 72, 0, 0, 7); g.fill();
      g.fillStyle = '#1a1a1a'; [-22, 22].forEach(dx => { g.beginPath(); g.arc(135 + dx, 240, 6, 0, 7); g.fill(); }); g.fillStyle = '#8a2a2a'; const mo = 6 + 10 * Math.abs(Math.sin(t * 13)); g.beginPath(); g.ellipse(135, 282, 14, mo, 0, 0, 7); g.fill();
      g.fillStyle = '#d9a441'; g.fillRect(70, 330, 130, 80);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(20, 440, 230, 8); g.fillStyle = '#ff4a5a'; g.fillRect(20, 440, 230 * prog, 8); g.beginPath(); g.arc(20 + 230 * prog, 444, 9, 0, 7); g.fill();
    } else {
      g.fillStyle = '#ffffff'; g.font = '800 26px Arial, sans-serif'; g.textAlign = 'center'; g.fillText(mode === 'rec' ? 'Recording…' : 'New Recording 1', 135, 80);
      g.fillStyle = mode === 'rec' ? '#ff4a5a' : '#8fa0b8'; g.font = '700 22px Arial, sans-serif'; g.fillText(mode === 'rec' ? '● REC  0:0' + Math.floor(t % 10) : '0:0' + Math.floor(2 + prog * 6), 135, 120);
      for (let i = 0; i < 36; i++) { const x = 18 + i * 6.8, a = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + 0.3) * Math.sin(i * 0.37 + 1.1)), live = mode === 'rec' ? (i > 30 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 9 + i)) : a) : a; const h = 140 * live; g.fillStyle = (mode === 'memo' && i / 36 < prog) ? '#ff4a5a' : '#cfd8e6'; g.fillRect(x, 300 - h / 2, 4, h); }
      if (mode === 'memo') { g.fillStyle = '#ffffff'; g.fillRect(18 + prog * 245, 210, 3, 180); }
      g.fillStyle = mode === 'rec' ? '#ff4a5a' : '#ffffff'; g.beginPath(); g.arc(135, 470, 32, 0, 7); g.fill();
      if (mode !== 'rec') { g.fillStyle = '#0d1018'; g.beginPath(); g.moveTo(125, 455); g.lineTo(152, 470); g.lineTo(125, 485); g.closePath(); g.fill(); }
    }
    cd.t.needsUpdate = true;
  };
  ph.userData.draw('memo', 0); return ph;
}
// hold the phone in the right hand: in front of the face (look) or held out (show)
function holdPhone(P, ph, t, { up = 1, out = 0 } = {}) {
  const u = P.userData, q = P.quaternion;
  const at = worldPt(P, lv(V(-0.22, 1.85, 0.62), V(-0.15, 2.45, 0.95), up).add(V(0, 0, 0.25 * out)));
  ik2(P, u.arms[1], at.clone().add(V(0, -0.12, 0)), V(1, -1, 0).applyQuaternion(q)); u.hands[1].curl(0.7);
  ph.position.copy(at); ph.quaternion.copy(q); ph.rotateY(Math.PI); ph.rotateX(-0.35 + 0.25 * up); ph.rotateZ(0.08 * Math.sin(t * 0.7));
  ik2(P, u.arms[0], worldPt(P, V(0.3, 1.45, 0.55)), V(-1, -1, 0).applyQuaternion(q)); u.hands[0].curl(0.45);
  return at;
}

// ---------- a glowing path with a pulse running along it (blue = air, orange = bone) ----------
function pulsePath(color = [0.35, 0.75, 1.4]) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { p: { value: -1 }, fade: { value: 0 }, col: { value: new THREE.Vector3(...color) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float p; uniform float fade; uniform vec3 col; varying vec2 vUv;
      void main(){ float d=fract(vUv.x*3.0-p); float g=smoothstep(0.0,0.08,d)*smoothstep(0.35,0.08,d); vec3 c=col*(0.35+1.4*g); gl_FragColor=vec4(c*fade,1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat); m.renderOrder = 12; m.userData.noDof = true; m.frustumCulled = false;
  m.userData.set = (pts, t, k, speed = 1.6, r = 0.018) => { m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, r, 8, false); mat.uniforms.p.value = t * speed; mat.uniforms.fade.value = k; m.visible = k > 0.01; };
  return m;
}
// sound rings leaving a point (facing the camera)
function rings(sc, color = 0x8fd0ff, n = 3) {
  const ms = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 64, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.4), transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); m.userData.noDof = true; m.renderOrder = 12; sc.add(m); ms.push(m); }
  return (t, src, cam, on = 1, dir = 0, size = 0.3) => ms.forEach((m, i) => { const a = ((t * 1.5 + i / n) % 1); m.visible = on > 0.01; if (!m.visible) return; m.position.copy(src); m.quaternion.copy(cam.quaternion); m.rotateZ(dir - Math.PI * 0.4); m.scale.setScalar(0.03 + a * size); m.material.opacity = on * (1 - a) * 0.9; });
}
// a glowing inner ear (a little spiral) for the x-ray head
function innerEar() {
  const pts = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 5, r = 0.06 * (1 - i / 75); pts.push(V(0, Math.sin(a) * r, Math.cos(a) * r + i * 0.0005)); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.012, 8, false), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.5), transparent: true, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })); m.renderOrder = 13; m.userData.noDof = true; return m;
}

// ---------- the spectrum card: bass on the left, treble on the right ----------
function spectrumCard(w = 0.5) {
  const cd = canvasDyn(640, 420), g = cd.g;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 420 / 640), new THREE.MeshBasicMaterial({ map: cd.t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); m.renderOrder = 15; m.userData.noDof = true;
  m.userData.draw = (bass, label, col = '#ff9a3a') => {
    g.clearRect(0, 0, 640, 420); g.fillStyle = 'rgba(14,22,44,0.85)'; g.beginPath(); g.roundRect(8, 8, 624, 404, 40); g.fill();
    g.fillStyle = '#ffffff'; g.font = '900 44px "Arial Black", Arial, sans-serif'; g.textAlign = 'center'; g.fillText(label, 320, 70);
    for (let i = 0; i < 14; i++) { const x = 50 + i * 39, base = 0.35 + 0.45 * Math.abs(Math.sin(i * 0.9 + 0.4)), boost = Math.max(0, 1 - i / 6), h = 230 * Math.min(1, base * (1 + (bass - 0.5) * 1.6 * boost)); g.fillStyle = i < 6 ? col : '#8fd0ff'; g.fillRect(x, 350 - h, 28, h); }
    g.fillStyle = '#cfd8e6'; g.font = '800 26px Arial, sans-serif'; g.textAlign = 'left'; g.fillText('BASS', 50, 392); g.textAlign = 'right'; g.fillText('TREBLE', 590, 392);
    cd.t.needsUpdate = true;
  };
  m.userData.draw(0.5, ''); return m;
}
// ---------- headphones on a head ----------
function headphones(P) {
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0x23262e, roughness: 0.35, clearcoat: 0.6 }), pad = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.9 });
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 10, 48, Math.PI), m); band.position.y = 0.08; g.add(band);
  [-1, 1].forEach(sx => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 32), m); c.rotation.z = Math.PI / 2; c.position.set(sx * 0.5, 0.0, 0); g.add(c); const p = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 10, 32), pad); p.rotation.y = Math.PI / 2; p.position.set(sx * 0.45, 0, 0); g.add(p); });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); P.userData.head.add(g); return g;
}
// ---------- the ratings card: three voices, stars; the third is secretly yours ----------
function ratingsCard(w = 0.56) {
  const cd = canvasDyn(640, 520), g = cd.g;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 520 / 640), new THREE.MeshBasicMaterial({ map: cd.t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); m.renderOrder = 15; m.userData.noDof = true;
  const star = (x, y, r, on) => { g.fillStyle = on ? '#ffc93a' : 'rgba(255,255,255,0.18)'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  m.userData.draw = (s1, s2, s3, reveal, hi = 0) => {
    g.clearRect(0, 0, 640, 520); g.fillStyle = 'rgba(14,22,44,0.86)'; g.beginPath(); g.roundRect(8, 8, 624, 504, 40); g.fill();
    [['VOICE A', s1], ['VOICE B', s2], [reveal > 0.5 ? 'YOU!' : 'VOICE C', s3]].forEach(([name, sc], i) => {
      const y = 100 + i * 140; if (i === 2 && hi > 0) { g.fillStyle = `rgba(255,201,58,${0.18 * hi})`; g.beginPath(); g.roundRect(24, y - 58, 592, 116, 26); g.fill(); }
      g.fillStyle = i === 2 && reveal > 0.5 ? '#ff6a5a' : '#ffffff'; g.font = '900 46px "Arial Black", Arial, sans-serif'; g.textAlign = 'left'; g.fillText(name, 48, y + 16);
      for (let k = 0; k < 5; k++) star(372 + k * 54, y, 24, k < sc);
    });
    cd.t.needsUpdate = true;
  };
  m.userData.draw(0, 0, 0, 0); return m;
}
