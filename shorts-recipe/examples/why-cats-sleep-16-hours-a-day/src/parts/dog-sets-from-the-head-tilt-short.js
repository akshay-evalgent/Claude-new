// =====================================================================
// SETS + PROPS for "Why Dogs Tilt Their Heads": play room, speech bubbles, ring charts,
// hearts, a phone, a leash on a hook
// =====================================================================
function playRoom(sc) {
  sc.background = new THREE.Color(0xeef2f0); sc.environment = tintedEnv(0.95, 0.96, 0.98); const R = {};
  const fw = woodTex('#d9b48a', '#a8805a', 23, [3, 4], 7);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.4, roughness: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const rugT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#f4efe6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2aa7a0'; for (let i = 0; i < 6; i++) { g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, 60 + i * 34, 0, 7); g.stroke(); } noiseFill(g, w, h, 4, 10); });
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 64), new THREE.MeshLambertMaterial({ map: rugT, bumpMap: WEAVE, bumpScale: 1.2 })); rug.rotation.x = -Math.PI / 2; rug.position.y = 0.006; rug.receiveShadow = true; sc.add(rug);
  const wallM = new THREE.MeshLambertMaterial({ color: 0xf3f5f4, bumpMap: PLASTER, bumpScale: 0.4 });
  const w1 = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallM); w1.position.set(0, 4, -3.4); w1.receiveShadow = true; sc.add(w1);
  const w2 = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallM); w2.position.set(-4.4, 4, 2); w2.rotation.y = Math.PI / 2; w2.receiveShadow = true; sc.add(w2);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(20, 0.26), new THREE.MeshLambertMaterial({ color: 0x2aa7a0 })); stripe.position.set(0, 1.6, -3.39); sc.add(stripe);
  const stripe2 = stripe.clone(); stripe2.position.set(-4.39, 1.6, 2); stripe2.rotation.y = Math.PI / 2; sc.add(stripe2);
  // a big window on the side wall
  const win = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), hdr(2.6, 2.7, 2.8)); win.position.set(-4.38, 3.1, 0.6); win.rotation.y = Math.PI / 2; sc.add(win);
  const tr = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }); [[0, 1.33, 3.4, 0.08], [0, -1.33, 3.4, 0.08], [1.63, 0, 0.08, 2.7], [-1.63, 0, 0.08, 2.7], [0, 0, 0.06, 2.6]].forEach(([dz, dy, wz, hy]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, hy, wz), tr); b.position.set(-4.36, 3.1 + dy, 0.6 + dz); sc.add(b); });
  // a toy basket and a shelf for depth
  pottedPlant(sc, 3.2, -2.7, 0.9, 0xd8704a);
  box(sc, 2.4, 0.08, 0.5, -1.6, 2.6, -3.15, new THREE.MeshStandardMaterial({ color: 0xc89a6a, roughness: 0.5 }), 0.02);
  // soft daylight from the window, sky fill
  const key = new THREE.DirectionalLight(0xfff4e4, 2.6); key.position.set(-8, 7, 2.5); key.target.position.set(0, 0.5, 0); sc.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.03; key.userData.soft = 0.3;
  sc.add(new THREE.HemisphereLight(0xffffff, 0xd8c4a8, 1.1));
  const fill = new THREE.DirectionalLight(0xe4ecff, 0.6); fill.position.set(4, 4, 6); sc.add(fill);
  R.update = () => {};
  return R;
}
// toys scattered on the floor around a point; returns [{name, obj}]
function scatterToys(sc, center, n = 26, r0 = 0.9, r1 = 2.3, seed = 5) {
  const rr = rng(seed), names = Object.keys(TOYS), out = [];
  for (let i = 0; i < n; i++) {
    const name = names[i % names.length], a = i * 2.399 + rr() * 0.3, d = r0 + (r1 - r0) * Math.sqrt((i + 0.5) / n);
    const o = TOYS[name](0.9 + rr() * 0.25); o.position.set(center.x + Math.cos(a) * d, 0, center.z + Math.sin(a) * d); o.rotation.y = rr() * 6.28; sc.add(o); out.push({ name, obj: o });
  }
  return out;
}
// speech bubble with text (a flat card that always faces the camera)
function speechBubble(text, w = 1.5, { fill = '#ffffff', ink = '#2a2420', accent = '#e8572f' } = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 520; const g = c.getContext('2d');
  const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
  g.fillStyle = 'rgba(0,0,0,0.18)'; rr(40, 50, 940, 340, 120); g.fill();
  g.fillStyle = fill; rr(30, 30, 940, 340, 120); g.fill(); g.beginPath(); g.moveTo(330, 360); g.lineTo(250, 490); g.lineTo(450, 360); g.closePath(); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = 150; g.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
  while (g.measureText(text).width > 840 && fs > 60) { fs -= 6; g.font = `900 ${fs}px "Arial Black", Arial, sans-serif`; }
  const parts = text.split('|'); if (parts.length > 1) { const w1 = g.measureText(parts[0]).width, w2 = g.measureText(parts[1]).width, x0 = 500 - (w1 + w2) / 2; g.textAlign = 'left'; g.fillStyle = ink; g.fillText(parts[0], x0, 205); g.fillStyle = accent; g.fillText(parts[1], x0 + w1, 205); }
  else { g.fillStyle = ink; g.fillText(text, 500, 205); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 520 / 1024), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  m.userData.dofMap = t; return m;
}
// a ring chart that fills to p (0..1) with a number in the middle
function ringChart(label, color = 0xffc233, r = 0.42) {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.16, 16, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })); g.add(bg);
  const fg = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.4), toneMapped: false })); g.add(fg);
  const txt = textPlane(label, r * 2.1, '#ffffff', '#1a2a3a'); txt.position.z = 0.02; g.add(txt);
  g.userData.set = (p) => { fg.geometry.dispose(); fg.geometry = new THREE.TorusGeometry(r, r * 0.17, 16, 96, Math.max(0.001, p) * Math.PI * 2); fg.rotation.z = Math.PI / 2; fg.scale.x = -1; };
  g.userData.set(0); return g;
}
// floating hearts
function heartGeo() { const s = new THREE.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(-0.15, -0.35, -0.6, -0.15, -0.6, 0.2); s.bezierCurveTo(-0.6, 0.55, -0.2, 0.65, 0, 0.35); s.bezierCurveTo(0.2, 0.65, 0.6, 0.55, 0.6, 0.2); s.bezierCurveTo(0.6, -0.15, 0.15, -0.35, 0, -0.5); const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 24 }); g.center(); return g; }
function heartBurst(sc, n = 9, seed = 2) {
  const geo = heartGeo(), mat = new THREE.MeshPhysicalMaterial({ color: 0xff4f7a, roughness: 0.25, clearcoat: 1, emissive: new THREE.Color(0xff2f5a), emissiveIntensity: 0.35 });
  const r = rng(seed), H = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(geo, mat); m.castShadow = false; sc.add(m); H.push({ m, dx: (r() - 0.5) * 0.9, dz: (r() - 0.5) * 0.4, sp: 0.5 + r() * 0.5, del: i * 0.09 + r() * 0.05, s: 0.07 + r() * 0.06, ph: r() * 6 }); }
  return (t, t0, origin) => { H.forEach(h => { const a = t - t0 - h.del; if (a < 0 || a > 1.6) { h.m.visible = false; return; } h.m.visible = true; h.m.position.set(origin.x + h.dx * (0.3 + a) + 0.05 * Math.sin(a * 6 + h.ph), origin.y + a * h.sp, origin.z + h.dz); const sc_ = h.s * Math.min(1, spring(t, t0 + h.del, 2.2, 7) * 1.2) * (1 - smooth(1.1, 1.6, a)); h.m.scale.setScalar(Math.max(0.0001, sc_)); h.m.rotation.set(0, 0.6 * Math.sin(a * 3 + h.ph), 0.25 * Math.sin(a * 4 + h.ph)); }); };
}
function makePhone() {
  const g = new THREE.Group(); const body = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.6, 0.03, 4, 0.04), new THREE.MeshPhysicalMaterial({ color: 0x2a2f3a, roughness: 0.25, metalness: 0.6, clearcoat: 1 })); body.castShadow = true; g.add(body);
  const bump = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.12, 0.02, 3, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x1a1d24, roughness: 0.2, metalness: 0.7 })); bump.position.set(-0.07, 0.21, -0.022); g.add(bump);
  [[-0.095, 0.235], [-0.045, 0.235], [-0.095, 0.185]].forEach(([x, y]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 20), M.black); l.rotation.x = Math.PI / 2; l.position.set(x, y, -0.034); g.add(l); });
  const fl = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), hdr(1, 1, 1)); fl.position.set(-0.045, 0.185, -0.035); fl.rotation.y = Math.PI; g.add(fl); g.userData.flash = fl;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.56), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.6, 0.7) })); scr.position.z = 0.016; g.add(scr);
  return g;
}
// a leash: red cord from a handle loop to a clip, hanging in a catenary between two points
function makeLeash() {
  const g = new THREE.Group(), red = new THREE.MeshPhysicalMaterial({ color: 0xc8322a, roughness: 0.5, bumpMap: WEAVE_FINE, bumpScale: 1.5 });
  const cord = new THREE.Mesh(new THREE.BufferGeometry(), red); cord.castShadow = true; g.add(cord);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 10, 32), red); loop.castShadow = true; g.add(loop);
  const clip = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.07, 6, 12), M.chrome); clip.castShadow = true; g.add(clip);
  g.userData.set = (a, b, sag = 0.4) => {
    const pts = []; for (let i = 0; i <= 16; i++) { const k = i / 16; pts.push(lv(a, b, k).add(V(0, -sag * 4 * k * (1 - k), 0))); }
    cord.geometry.dispose(); cord.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.014, 8, false);
    loop.position.copy(a).add(V(0, 0.09, 0)); loop.rotation.set(0, 0.3, 0); clip.position.copy(b).add(V(0, -0.04, 0));
  };
  return g;
}
