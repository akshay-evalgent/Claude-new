// =====================================================================
// CAFETERIA: long table, kids, ice cream, a chalkboard chart that draws itself
// =====================================================================
function iceCreamCup(scoop1 = 0xffa8c8, scoop2 = 0x8a5236) {
  const g = new THREE.Group();
  const cupT = canvasTex(512, 128, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#ff9ab8'; c.fillRect(i * 32, 0, 32, h); } c.fillStyle = 'rgba(0,0,0,0.06)'; c.fillRect(0, 0, w, 10); });
  const prof = [[0.0, 0], [0.13, 0], [0.135, 0.01], [0.17, 0.2], [0.175, 0.21]].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ map: cupT, roughness: 0.55, side: THREE.DoubleSide })); cup.castShadow = true; g.add(cup);
  const scoopG = (seed) => { const sg = new THREE.SphereGeometry(0.15, 40, 28), p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const k = 1 + 0.08 * noise3(v.x * 20 + seed, v.y * 20, v.z * 20) + (v.y < -0.05 ? 0.06 * Math.sin(Math.atan2(v.z, v.x) * 7) : 0); p.setXYZ(i, v.x * k, v.y * k, v.z * k); } sg.computeVertexNormals(); return sg; };
  const sc = [scoop1, scoop2].map((c, i) => { const m = new THREE.Mesh(scoopG(i * 3), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), clearcoat: 0.25 })); m.position.set(i ? -0.06 : 0.06, 0.26 + i * 0.1, i ? 0.02 : -0.02); m.castShadow = true; g.add(m); return m; });
  g.userData.eat = (k) => sc.forEach((m, i) => { const left = clamp(1 - k * 1.1 + i * 0.1); m.scale.setScalar(Math.max(0.001, 0.25 + 0.75 * left)); m.position.y = 0.2 + (0.06 + i * 0.1) * left; m.visible = left > 0.02 || i === 0; });
  return g;
}
function spoon(color = 0xff6a8a) { const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.8 }); const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.22, 4, 8), m); h.position.y = -0.11; g.add(h); const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 10), m); b.scale.set(0.8, 1.2, 0.35); b.position.y = -0.26; g.add(b); const bite = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xffb8d0, roughness: 0.5 })); bite.position.set(0, -0.265, 0.018); g.add(bite); g.userData.bite = bite; g.traverse(o => o.castShadow = true); return g; }
// a smile arc for any kid
function addSmile(p) {
  const u = p.userData; const sm = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.013, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0x3a1418, roughness: 0.5 })); sm.rotation.z = Math.PI; sm.position.set(0, 0.03, 0.01); sm.visible = false; u.mouth.add(sm);
  const line = u.mouth.children[0]; const r0 = u.reset; u.reset = () => { r0(); sm.visible = false; };
  u.smile = (k) => { sm.visible = k > 0.05; if (sm.visible) { line.visible = false; sm.scale.set(1 + 0.2 * k, 0.4 + 0.6 * k, 1); } };
}
const KIDS = [
  { shirt: 0xffc93c, pants: 0x2f4a7a, hair: 0x4a2c18, skin: 0xd8956a, shorts: true, hairUp: 0.42 },     // the hero
  { shirt: 0x3fbf6a, pants: 0x34405a, hair: 0x141010, skin: 0x7a4a2e, style: 'curly', glasses: true },
  { shirt: 0xe8505a, pants: 0x5a3a8a, hair: 0xb8501e, skin: 0xf2c0a0, style: 'long' },
  { shirt: 0x9a6ae8, pants: 0x2a2f3a, hair: 0x2a1a12, skin: 0xb8784e, style: 'long' },                  // the smug slow eater
  { shirt: 0x4aa8ff, pants: 0x3a3a48, hair: 0xe8c070, skin: 0xf0c4a4 },
  { shirt: 0xff8ab8, pants: 0x2f4a6a, hair: 0x5a3416, skin: 0x9a6040, style: 'curly' },
];
function cafeteria(sc) {
  sc.background = new THREE.Color(0xe8e2d0); sc.environment = MENV;
  const R = {};
  const tile = canvasTex(256, 256, (c, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#f1ead8' : '#5ab0a8'; c.fillRect(i * 64, j * 64, 64, 64); } c.strokeStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } noiseFill(c, w, h, 3, 10); }, { rep: [7, 7] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.28 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const upper = new THREE.MeshLambertMaterial({ color: 0xf3ead2, bumpMap: PLASTER, bumpScale: 0.4 }), lower = new THREE.MeshLambertMaterial({ color: 0x7fc4b8 });
  const wall = (w, h, x, y, z, ry, m) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.y = ry; p.receiveShadow = true; sc.add(p); return p; };
  wall(20, 6, 0, 4.6, -4.5, 0, upper); wall(20, 1.6, 0, 0.8, -4.49, 0, lower);
  wall(20, 6, -5.5, 4.6, 0, Math.PI / 2, upper); wall(20, 1.6, -5.49, 0.8, 0, Math.PI / 2, lower);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(20, 0.08, 0.06), new THREE.MeshStandardMaterial({ color: 0xffffff })); trim.position.set(0, 1.62, -4.47); sc.add(trim);
  // windows on the left wall with daylight
  for (let k = 0; k < 3; k++) { const z = -3 + k * 2.6; const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.0), hdr(2.4, 2.5, 2.6)); pane.position.set(-5.47, 3.2, z); pane.rotation.y = Math.PI / 2; sc.add(pane); const fr = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 1.9), new THREE.MeshStandardMaterial({ color: 0xffffff })); fr.position.set(-5.45, 3.2, z); sc.add(fr); [-0.0].forEach(() => { const mul = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.06), new THREE.MeshStandardMaterial({ color: 0xffffff })); mul.position.set(-5.42, 3.2, z); sc.add(mul); }); }
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.0); sun.position.set(-9, 7, 2); sun.target.position.set(0, 0.8, -0.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02; sun.userData.soft = 0.25; sc.add(sun, sun.target);
  sc.add(new THREE.HemisphereLight(0xfff8ec, 0xb8a888, 0.9));
  const fill = new THREE.DirectionalLight(0xfff4e8, 0.9); fill.position.set(5, 6, 6); sc.add(fill);
  for (let k = 0; k < 3; k++) { const pnl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), hdr(2.2, 2.2, 2.1)); pnl.rotation.x = Math.PI / 2; pnl.position.set(0, 7.4, -3 + k * 2.6); sc.add(pnl); }
  // chalkboard with a chart that draws itself
  const W2 = 1024, H2 = 640, cv = document.createElement('canvas'); cv.width = W2; cv.height = H2; const cg = cv.getContext('2d'); const chalkT = new THREE.CanvasTexture(cv); chalkT.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.62), new THREE.MeshStandardMaterial({ map: chalkT, roughness: 0.92 })); board.position.set(0.6, 3.25, -4.44); sc.add(board); R.board = board;
  const bfm = new THREE.MeshStandardMaterial({ map: woodTex('#8a5a32', '#4a2a14', 61), roughness: 0.5 });
  [[0, 1.36, 4.4, 0.1], [0, -1.36, 4.4, 0.1], [-2.15, 0, 0.1, 2.82], [2.15, 0, 0.1, 2.82]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), bfm); b.position.set(0.6 + x, 3.25 + y, -4.42); b.castShadow = true; sc.add(b); });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 0.14), bfm); tray.position.set(0.6, 1.86, -4.36); sc.add(tray);
  const r = rng(77), smudge = [...Array(40)].map(() => [r() * W2, r() * H2, 40 + r() * 120, r()]);
  const stroke = (pts, k, wd = 7) => { if (k <= 0) return; const n = Math.max(2, Math.ceil(pts.length * k)); cg.lineWidth = wd; cg.lineCap = 'round'; cg.lineJoin = 'round'; for (let pass = 0; pass < 3; pass++) { cg.strokeStyle = `rgba(250,250,245,${0.35 + pass * 0.15})`; cg.beginPath(); for (let i = 0; i < n; i++) { const [x, y] = pts[i]; const j = (h3(i, pass, 7) - 0.5) * 2.5; i ? cg.lineTo(x + j, y + j) : cg.moveTo(x + j, y + j); } cg.stroke(); } };
  const line = (x0, y0, x1, y1, n = 20) => [...Array(n + 1)].map((_, i) => [lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
  const chalkText = (txt, x, y, size, k) => { if (k <= 0) return; cg.save(); cg.globalAlpha = Math.min(1, k * 1.3); cg.font = `bold ${size}px "Comic Sans MS","Chalkboard SE","Segoe Print",sans-serif`; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillStyle = 'rgba(250,250,245,0.88)'; const w = cg.measureText(txt).width; cg.beginPath(); cg.rect(x - w / 2 - 4, y - size, (w + 8) * k, size * 2); cg.clip(); cg.fillText(txt, x, y); cg.restore(); };
  const hatch = (x0, y0, w, h, k) => { if (k <= 0) return; const top = y0 - h * k; for (let i = 0; i < Math.floor(w / 9); i++) { const x = x0 + 4 + i * 9; stroke(line(x, y0, x + 8, top, 2), 1, 3.5); } stroke([[x0, y0], [x0, top], [x0 + w, top], [x0 + w, y0]], 1, 6); };
  R.drawBoard = (t, k = 0) => {
    const gr = cg.createRadialGradient(W2 / 2, H2 / 2, 50, W2 / 2, H2 / 2, W2 * 0.7); gr.addColorStop(0, '#2f4a3c'); gr.addColorStop(1, '#1d3028'); cg.fillStyle = gr; cg.fillRect(0, 0, W2, H2);
    smudge.forEach(([x, y, s, a]) => { cg.fillStyle = `rgba(255,255,255,${0.025 + 0.03 * a})`; cg.beginPath(); cg.ellipse(x, y, s, s * 0.4, a * 3, 0, 7); cg.fill(); });
    chalkText('BRAIN FREEZE', W2 / 2, 62, 40, seg(k, 0, 0.2));
    stroke(line(352, 560, 672, 560, 20), seg(k, 0.1, 0.25)); stroke(line(352, 560, 352, 150, 16), seg(k, 0.1, 0.25));
    hatch(385, 560, 105, 165, E.out(seg(k, 0.22, 0.45))); chalkText('SLOW', 437, 600, 34, seg(k, 0.3, 0.42));
    hatch(540, 560, 105, 330, E.out(seg(k, 0.4, 0.72))); chalkText('FAST', 592, 600, 34, seg(k, 0.5, 0.62));
    chalkText('2x', 592, 180, 58, seg(k, 0.74, 0.86));
    if (k > 0.86) { const kk = seg(k, 0.86, 1); const c = [...Array(24)].map((_, i) => [592 + Math.cos(i / 23 * 6.6) * 52, 180 + Math.sin(i / 23 * 6.6) * 42]); stroke(c, kk, 5); }
    chalkT.needsUpdate = true;
  };
  R.drawBoard(0, 0);
  // clock and a poster
  const clk = new THREE.Group(); clk.position.set(3.6, 4.6, -4.43); sc.add(clk);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshStandardMaterial({ color: 0xffffff })); clk.add(face);
  const rimC = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 10, 48), new THREE.MeshStandardMaterial({ color: 0x2a2a2a })); clk.add(rimC);
  const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.01), M.black); hand1.position.set(0, 0.12, 0.02); hand1.geometry.translate(0, 0.0, 0); clk.add(hand1); R.clkHand = hand1;
  const posterT = canvasTex(256, 360, (c, w, h) => { c.fillStyle = '#ffe9b8'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff6a5a'; c.beginPath(); c.arc(90, 120, 50, 0, 7); c.fill(); c.fillStyle = '#5ac87a'; c.beginPath(); c.ellipse(170, 200, 45, 60, 0.4, 0, 7); c.fill(); c.fillStyle = '#ffb83a'; c.beginPath(); c.arc(110, 270, 40, 0, 7); c.fill(); c.fillStyle = '#7a4a2a'; c.fillRect(85, 60, 8, 22); });
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.55), new THREE.MeshStandardMaterial({ map: posterT, roughness: 0.8 })); poster.position.set(-3.4, 3.4, -4.43); sc.add(poster);
  // table and benches
  const top = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.08, 6.4, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.35 })); top.position.set(0, 1.3, -0.2); top.castShadow = top.receiveShadow = true; sc.add(top);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.04, 6.42), new THREE.MeshStandardMaterial({ color: 0x3a8a84 })); edge.position.set(0, 1.25, -0.2); sc.add(edge);
  [[-0.6, -2.9], [0.6, -2.9], [-0.6, 2.5], [0.6, 2.5]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 12), M.chrome); l.position.set(x, 0.65, z); sc.add(l); });
  [-1, 1].forEach(sd => { const b = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.07, 6.2, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x3a8a84, roughness: 0.4 })); b.position.set(sd * 1.15, 0.82, -0.2); b.castShadow = b.receiveShadow = true; sc.add(b); [-2.6, 2.3].forEach(z => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 10), M.chrome); l.position.set(sd * 1.15, 0.4, z); sc.add(l); }); });
  // kids: fast eaters on the left bench (x<0), slow eaters on the right
  const seats = [[-1, -1.6], [-1, -0.2], [-1, 1.2], [1, -1.6], [1, -0.2], [1, 1.2]];
  R.kids = seats.map(([sd, z], i) => {
    const K = makeKid(KIDS[i]); addSmile(K); sc.add(K); const fr = foreheadFrost(K);
    const sp = spoon([0xff6a8a, 0x5ab8ff, 0xffd23f, 0x9a6ae8, 0x5ad88a, 0xff9a4a][i]); K.userData.hands[1].hand.add(sp); sp.position.set(-0.03, -0.12, 0.03); sp.rotation.set(0.25, 0, 0.15);
    const cupI = iceCreamCup([0xffa8c8, 0xfff2d8, 0x9ae0b8, 0xffa8c8, 0x8a5236, 0xfff2d8][i], [0x8a5236, 0xffa8c8, 0x8a5236, 0xfff2d8, 0x9ae0b8, 0x8a5236][i]); cupI.position.set(sd * 0.38, 1.34, z + 0.05); sc.add(cupI);
    return { K, u: K.userData, sd, z, fr, sp, cup: cupI, fast: sd < 0 };
  });
  R.seat = (kd) => {
    const { K, u, sd, z } = kd; K.rotation.set(0, -sd * Math.PI / 2, 0); K.position.set(sd * 1.15, 0.86 - 1.14 * 0.82, z);
    u.legs.forEach((L, i) => { L.hip.rotation.set(-1.45, (i ? 1 : -1) * 0.08, 0); L.knee.rotation.x = 1.35 + 0.15 * Math.sin(i * 2.1); });
  };
  // spoon path: cup -> mouth, with the hand following by IK
  R.eat = (kd, t, { period = 0.55, phase = 0, linger = 0.0, on = 1 } = {}) => {
    const { K, u, sd } = kd; const ph = (((t / period + phase) % 1) + 1) % 1;
    const up = linger > 0 ? kf(ph, [[0, 0], [0.25, 1], [0.25 + linger, 1], [0.95, 0]]) : 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
    const cupP = kd.cup.position.clone().add(V(0, 0.32, 0)), mouth = headPt(K, V(0.0, -0.22, 0.62));
    const T = lv(cupP, mouth, E.io(up)).add(V(0, 0.18 * Math.sin(Math.PI * up), 0));
    const sideW = V(1, 0, 0).applyQuaternion(K.quaternion);
    ik2(K, u.arms[1], lv(K.userData.arms[1].sh.getWorldPosition(new THREE.Vector3()).add(V(0, -0.5, 0)), T, on), sideW.clone().add(V(0, -1, 0)));
    u.hands[1].curl(0.7); u.mouthOpen(on * 0.25 * smooth(0.7, 0.95, up)); kd.sp.userData.bite.visible = up > 0.1 && up < 0.98 && linger === 0 ? true : up < 0.9;
    return up;
  };
  R.update = (t) => { R.clkHand.rotation.z = -t * 0.3; };
  return R;
}
