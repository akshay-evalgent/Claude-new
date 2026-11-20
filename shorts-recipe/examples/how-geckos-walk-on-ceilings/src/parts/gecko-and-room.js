// =====================================================================
// THE GECKO: a tokay (Gekko gecko), in centimetres, built in a "surface frame" (the surface is y = 0, the gecko on +y),
// which is then turned upside down onto the ceiling (or stood up as a window pane). A lofted body that follows its own
// path like a snake follows its head, with granular blue-grey skin and orange spots; big slit-pupil eyes; sprawling legs
// by IK; five splayed toes per foot with ridged pads that can peel back from the tip like tape. A procedural trot gait.
// Also: the room at night, a glass pane, the microscope sets (setae, a branching seta, atoms) and the coin-sized patch.
// =====================================================================
// skin colour, painted along the body (x: snout -> tail tip) and around it (y: belly -> back -> belly)
const GK_T = (() => { const [c, g] = mkCanvas(2048, 512), r = rng(61); const W = 2048, H = 512;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#e2dccd'); gr.addColorStop(0.2, '#c4c6c8'); gr.addColorStop(0.3, '#93a4c0'); gr.addColorStop(0.5, '#8698b6'); gr.addColorStop(0.7, '#93a4c0'); gr.addColorStop(0.8, '#c4c6c8'); gr.addColorStop(1, '#e2dccd'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3000; i++) { const x = r() * W, y = H * (0.25 + r() * 0.5); g.fillStyle = r() < 0.5 ? 'rgba(150,170,200,0.25)' : 'rgba(60,70,90,0.22)'; g.fillRect(x, y, 3 + r() * 6, 2 + r() * 4); }
  // tail bands
  for (let k = 0; k < 9; k++) { const x = W * (0.55 + k * 0.05); g.fillStyle = 'rgba(200,210,225,0.35)'; g.fillRect(x, H * 0.22, W * 0.018, H * 0.56); }
  // orange spots, in loose rows along the back and flanks
  for (let i = 0; i < 260; i++) { const x = W * (0.04 + r() * 0.62), y = H * (0.27 + r() * 0.46), rr = 6 + r() * 10 * (x < W * 0.15 ? 0.6 : 1);
    const sp = g.createRadialGradient(x, y, 0, x, y, rr); sp.addColorStop(0, 'rgba(246,140,70,0.95)'); sp.addColorStop(0.7, 'rgba(238,124,62,0.85)'); sp.addColorStop(1, 'rgba(238,124,62,0)'); g.fillStyle = sp; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  // pale tubercles
  for (let i = 0; i < 700; i++) { const x = W * (0.05 + r() * 0.6), y = H * (0.28 + r() * 0.44); g.fillStyle = 'rgba(225,230,236,0.6)'; g.beginPath(); g.arc(x, y, 1.5 + r() * 2, 0, 7); g.fill(); }
  // a dark lip line along the jaw, darker head top
  g.fillStyle = 'rgba(40,45,60,0.5)'; g.fillRect(0, H * 0.24, W * 0.13, 4); g.fillRect(0, H * 0.76, W * 0.13, 4);
  return texOf(c); })();
// legs: blue-grey with orange spots
const LIMB_T = (() => { const [c, g] = mkCanvas(512, 256), r = rng(64); g.fillStyle = '#8a9cb8'; g.fillRect(0, 0, 512, 256); g.fillStyle = 'rgba(214,208,194,0.85)'; g.fillRect(0, 100, 512, 56);
  for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() < 0.5 ? r() * 90 : 166 + r() * 90, rr = 5 + r() * 8; const sp = g.createRadialGradient(x, y, 0, x, y, rr); sp.addColorStop(0, 'rgba(246,140,70,0.95)'); sp.addColorStop(1, 'rgba(238,124,62,0)'); g.fillStyle = sp; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  return texOf(c); })();
// granular scales: small packed bumps
const GRAN_N = heightToNormal(hCanvas(512, 512, (g, w, h) => { const r = rng(62); for (let i = 0; i < 5200; i++) { const x = r() * w, y = r() * h, rr = 3 + r() * 3; const gg = g.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, '#e8e8e8'); gg.addColorStop(1, 'rgba(90,90,90,0)'); g.fillStyle = gg; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); } }), 2.6);
// the toe pad underside: ridges (lamellae) across the toe, pale; the top of the toe like the skin
const TOE_T = (() => { const [c, g] = mkCanvas(512, 128); g.fillStyle = '#8698b6'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#d6d0c2'; g.fillRect(0, 36, 512, 56);
  for (let i = 0; i < 18; i++) { const x = 40 + i * 25; g.strokeStyle = 'rgba(140,128,114,0.95)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 36); g.quadraticCurveTo(x + 9, 64, x, 92); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(236,108,58,0.8)'; g.beginPath(); g.arc(80 + Math.random() * 380, Math.random() < 0.5 ? 6 + Math.random() * 22 : 104 + Math.random() * 20, 3 + Math.random() * 4, 0, 7); g.fill(); }
  const t = texOf(c); t.wrapS = THREE.ClampToEdgeWrapping; return t; })();
const LAMELLA_N = heightToNormal(hCanvas(512, 128, (g) => { for (let i = 0; i < 18; i++) { const x = 40 + i * 25; for (const [y0, y1] of [[36, 92]]) { const gr = g.createLinearGradient(x - 10, 0, x + 12, 0); gr.addColorStop(0, '#808080'); gr.addColorStop(0.6, '#e0e0e0'); gr.addColorStop(1, '#505050'); g.fillStyle = gr; g.fillRect(x - 10, y0, 22, y1 - y0); } } }), 3);
// the eye: gold with dark veins and a vertical slit pupil with wavy edges
const GK_EYE = (() => { const [c, g] = mkCanvas(512, 512), r = rng(63); const gr = g.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, '#d8b860'); gr.addColorStop(0.6, '#b89048'); gr.addColorStop(0.9, '#6a5a3a'); gr.addColorStop(1, '#3a3428'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) { const a = r() * 6.28; g.strokeStyle = `rgba(${60 + r() * 40},${50 + r() * 30},30,0.5)`; g.lineWidth = 1 + r() * 2; g.beginPath(); let x = 256 + Math.cos(a) * 40, y = 256 + Math.sin(a) * 40; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += Math.cos(a + (r() - 0.5)) * 25; y += Math.sin(a + (r() - 0.5)) * 25; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = '#060504'; g.beginPath(); for (let y = 60; y <= 452; y += 4) { const w = 10 + 7 * Math.sin(y * 0.09) + 18 * Math.sin(Math.PI * (y - 60) / 392) ** 0.5; g.lineTo(256 + w, y); } for (let y = 452; y >= 60; y -= 4) { const w = 10 + 7 * Math.sin(y * 0.09 + 1) + 18 * Math.sin(Math.PI * (y - 60) / 392) ** 0.5; g.lineTo(256 - w, y); } g.fill();
  return texOf(c); })();
// body half-width and half-height along the body (s = cm from the snout)
const GK_PROF = [[0, 0.22, 0.16], [0.6, 0.72, 0.42], [1.5, 1.12, 0.62], [2.6, 1.42, 0.8], [3.6, 1.58, 0.86], [4.4, 1.22, 0.74], [5.4, 1.32, 0.78], [7.0, 1.72, 0.92], [9.5, 1.98, 1.0], [12.0, 1.84, 0.92], [13.6, 1.42, 0.8], [14.6, 1.12, 0.7], [16.5, 0.94, 0.6], [20, 0.64, 0.42], [24, 0.38, 0.28], [27.4, 0.13, 0.1], [28, 0.02, 0.02]];
const GK_L = 28;
function gkProf(s) { const P = GK_PROF; let i = 0; while (i < P.length - 2 && s > P[i + 1][0]) i++; const [s0, w0, h0] = P[i], [s1, w1, h1] = P[i + 1]; const k = smooth(0, 1, clamp((s - s0) / (s1 - s0))); return [lerp(w0, w1, k), lerp(h0, h1, k)]; }
const GK_LEGS = [ // where each leg joins the body (s), segment lengths, the rest foot (along/side, in body terms), toe fan heading
  { s: 6.4, L: [1.9, 1.8], rest: [2.4, 3.6], fan: 0.55, side: 1, front: true }, { s: 6.4, L: [1.9, 1.8], rest: [2.4, 3.6], fan: 0.55, side: -1, front: true },
  { s: 13.4, L: [2.5, 2.3], rest: [-1.4, 4.0], fan: -0.35, side: 1, front: false }, { s: 13.4, L: [2.5, 2.3], rest: [-1.4, 4.0], fan: -0.35, side: -1, front: false }];
const TOE_LEN = [1.0, 1.35, 1.5, 1.45, 1.15];
// a path on the surface: P(d) -> {p (x, z), h (heading angle)}. Default: a straight line along +x.
const straightPath = (d) => ({ p: V(d, 0, 0), h: 0 });
function makeGecko({ seed = 1 } = {}) {
  const root = new THREE.Group(); const r = rng(seed);
  const skin = new THREE.MeshPhysicalMaterial({ map: GK_T, normalMap: rep(GRAN_N, 14, 3), normalScale: V2(0.7, 0.7), roughness: 0.58, sheen: 0.45, sheenColor: new THREE.Color(0xb8c8e0), sheenRoughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const NS = 150, NR = 32, cols = NR + 1; const pos = new Float32Array((NS + 1) * cols * 3), uv = new Float32Array((NS + 1) * cols * 2), idx = [];
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= NR; j++) { const k = i * cols + j; uv[k * 2] = i / NS; uv[k * 2 + 1] = j / NR; }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * cols + j, b = a + 1, c2 = a + cols, d = c2 + 1; idx.push(a, d, b, a, c2, d); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); bg.setIndex(idx);
  const body = new THREE.Mesh(bg, skin); body.castShadow = body.receiveShadow = true; body.frustumCulled = false; root.add(body);
  // eyes
  const eyeM = new THREE.MeshPhysicalMaterial({ map: GK_EYE, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 }); const eyes = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 24), eyeM); e.castShadow = true; root.add(e); const lid = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 10, 32), skin); root.add(lid); eyes.push({ s, e, lid }); }
  // legs and toes
  const limbM = new THREE.MeshPhysicalMaterial({ map: LIMB_T, normalMap: rep(GRAN_N, 4, 1), normalScale: V2(0.6, 0.6), roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color(0xb8c8e0), clearcoat: 0.1 });
  const toeM = new THREE.MeshPhysicalMaterial({ map: TOE_T, normalMap: LAMELLA_N, normalScale: V2(0.8, 0.8), roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0xdde4f0), clearcoat: 0.1 });
  const legs = GK_LEGS.map(L => { const m = dynTube(30, 10, limbM); root.add(m); const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), limbM); palm.scale.set(0.42, 0.18, 0.4); palm.castShadow = true; root.add(palm); const toes = TOE_LEN.map(len => { const t = dynTube(22, 12, toeM); root.add(t); return { t, len }; }); return { L, m, toes, palm }; });
  const M4 = new THREE.Matrix4();
  // pose: { t, path(d), d, speed (0..1 running), breath, headYaw, peel: [per-leg 0..1] or number, stride, lift }
  root.userData = { body, eyes, legs, pose(P) {
    const t = P.t ?? 0, path = P.path || straightPath, d = P.d ?? 0, run = P.speed ?? 0, stride = P.stride ?? 4.2;
    // spine: the body trails back along the path from the snout, with a sideways wave while running
    const spine = (s) => { const q = path(d - s), side = V(-Math.sin(q.h), 0, -Math.cos(q.h)); const wave = run * 0.55 * Math.sin((d / stride) * 2 * Math.PI - s * 0.42) * clamp(s / 6) + (1 - run) * 0.12 * Math.sin(t * 0.7 + s * 0.3) * clamp((s - 14) / 6);
      return { p: q.p.clone().addScaledVector(side, wave), h: q.h, side }; };
    const yaw = P.headYaw ?? 0, breathe = 1 + 0.025 * Math.sin(t * 2.4) * (1 - run);
    const ring = [];
    for (let i = 0; i <= NS; i++) { const s = (i / NS) * GK_L, sp = spine(s), sn = spine(Math.min(GK_L, s + 0.3)), fwd = sp.p.clone().sub(sn.p).normalize(); const side = V(fwd.z, 0, -fwd.x); let [w, h] = gkProf(s);
      if (s > 6 && s < 14) { w *= breathe; h *= breathe; }
      const lift = 0.32 + 0.25 * smooth(4.6, 0, s) + (P.lift ?? 0) * smooth(4.6, 0, s);
      const c = sp.p.clone().add(V(0, h * 0.62 + lift, 0)); if (s < 4.5 && yaw) { const k = smooth(4.5, 0, s); const piv = spine(4.5).p; const off = c.clone().sub(piv); off.applyAxisAngle(V(0, 1, 0), yaw * k); c.copy(piv).add(off); fwd.applyAxisAngle(V(0, 1, 0), yaw * k); side.set(fwd.z, 0, -fwd.x); }
      ring.push({ c, side, w, h, fwd, s });
      for (let j = 0; j <= NR; j++) { const th = (j / NR) * 2 * Math.PI, cs = Math.cos(th), sn2 = Math.sin(th); // th = 0 at the belly
        const ex = Math.sign(sn2) * Math.pow(Math.abs(sn2), 0.75) * w, ey = -Math.sign(cs) * Math.pow(Math.abs(cs), 0.85) * h * (cs > 0 ? 0.62 : 1.0);
        const k3 = (i * cols + j) * 3; pos[k3] = c.x + side.x * ex; pos[k3 + 1] = c.y + ey; pos[k3 + 2] = c.z + side.z * ex; } }
    bg.attributes.position.needsUpdate = true; bg.computeVertexNormals();
    // eyes on the sides of the head, near the top
    const ri = ring[Math.round(2.5 / GK_L * NS)];
    eyes.forEach(({ s, e, lid }) => { e.position.copy(ri.c).addScaledVector(ri.side, s * ri.w * 0.78).add(V(0, ri.h * 0.42, 0)); const out = ri.side.clone().multiplyScalar(s).add(V(0, 0.45, 0)).addScaledVector(ri.fwd, 0.25).normalize(); e.lookAt(e.position.clone().add(out)); e.rotateY(Math.PI / 2 * 0); lid.position.copy(e.position).addScaledVector(out, 0.12); lid.lookAt(lid.position.clone().add(out)); });
    // legs: a trot (diagonal pairs), planted feet stay put while the body moves; at rest the feet sit at their rest spots
    const peel = P.peel ?? 0;
    legs.forEach(({ L, m, toes, palm }, li) => { const rg = ring[Math.round(L.s / GK_L * NS)], hip = rg.c.clone().addScaledVector(rg.side, L.side * rg.w * 0.82).add(V(0, -rg.h * 0.15, 0));
      const restAt = (dd) => { const q = spine(L.s + (d - dd)); return q.p.clone().addScaledVector(V(Math.cos(q.h), 0, -Math.sin(q.h)), L.rest[0]).addScaledVector(q.side, -L.side * L.rest[1]); };
      let foot = restAt(d), lift = 0;
      if (run > 0) { const ph = (li === 0 || li === 3) ? 0 : 0.5, u = d / stride + ph, cyc = Math.floor(u), q = u - cyc, duty = 0.62;
        const plant = (cc) => restAt((cc + 0.31 - ph) * stride + stride * 0.0);
        let g = q < duty ? plant(cyc) : lv(plant(cyc), plant(cyc + 1), smooth(duty, 1, q)); if (q >= duty) lift = Math.sin(Math.PI * (q - duty) / (1 - duty)) * 0.9;
        foot = lv(foot, g, run); lift *= run; }
      const wrist = foot.clone().add(V(0, 0.3 + lift, 0)); const out = rg.side.clone().multiplyScalar(L.side); legs[li].wrist = wrist.clone();
      const elbow = ik2(hip, wrist, L.L[0], L.L[1], V(0, 1, 0).addScaledVector(out, 0.6));
      m.userData.update(new THREE.CatmullRomCurve3([hip, lv(hip, elbow, 0.5), elbow, lv(elbow, wrist, 0.5), wrist], false, 'centripetal'), (u) => lerp(0.5, 0.24, u) * (1 + 0.18 * Math.exp(-(((u - 0.5) / 0.08) ** 2))) * (u < 0.12 ? 1 + (0.12 - u) * 4 : 1));
      palm.position.copy(wrist).add(V(0, -0.14, 0)); palm.rotation.set(0, Math.atan2(-out.z, out.x), 0);
      // five toes fanned out from the wrist; peeling curls each toe up from its tip
      const q0 = spine(L.s), fwd = V(Math.cos(q0.h), 0, -Math.sin(q0.h)); const base = fwd.clone().applyAxisAngle(V(0, 1, 0), L.side * (L.front ? -L.fan : -L.fan) + (L.front ? 0 : 0)); const outDir = lv(base, out, 0.55).normalize();
      const pl = Array.isArray(peel) ? peel[li] : peel;
      toes.forEach(({ t: tm, len }, k) => { const a = (k - 2) * 0.42 * L.side, dir = outDir.clone().applyAxisAngle(V(0, 1, 0), a); const pts = []; let p = wrist.clone().add(V(0, -0.22 - lift * 0.0, 0)).addScaledVector(dir, 0.25); p.y = 0.08 + lift; pts.push(p.clone());
        const n = 8; let ang = 0; for (let i = 1; i <= n; i++) { const qq = i / n; ang = pl * 1.9 * smooth(0.999 - pl * 0.95, 1, qq) + (lift > 0 ? 0.5 * qq : 0); const st = dir.clone().multiplyScalar(Math.cos(ang) * len / n).add(V(0, Math.sin(ang) * len / n, 0)); p = p.clone().add(st); pts.push(p.clone()); }
        tm.userData.update(new THREE.CatmullRomCurve3(pts), (u, th) => { const wd = (u < 0.15 ? lerp(0.16, 0.24, u / 0.15) : u > 0.82 ? lerp(0.26, 0.06, (u - 0.82) / 0.18) : 0.26), tk = 0.085; const c = Math.cos(th), s2 = Math.sin(th); return 1 / Math.sqrt((c / tk) ** 2 + (s2 / wd) ** 2); }); }); });
  } };
  root.userData.pose({ t: 0 });
  return root;
}
// ---------- the room at night: the ceiling (the gecko's floor), a bare bulb on a pull-chain socket, the fire-lit room below ----------
const CEIL = 250;
function room(sc, { env = 0.8, bulb = 1, drop = 30 } = {}) { sc.environment = FIRE.env; sc.environmentIntensity = env; sc.background = FIRE.tex; sc.backgroundIntensity = 0.6;
  const cm = new THREE.MeshPhysicalMaterial({ color: 0xece8e2, roughness: 0.92, normalMap: rep(TX.ceiling.normalMap, 24, 24), normalScale: V2(0.5, 0.5), aoMap: null });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), cm); ceil.rotation.x = Math.PI / 2; ceil.position.y = CEIL; ceil.receiveShadow = true; sc.add(ceil);
  // a bare bulb on a short pendant cord
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, drop, 10), new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: 0.45, clearcoat: 0.4 })); cord.position.set(0, CEIL - drop / 2, 0); sc.add(cord);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.8, 1.6, 40), new THREE.MeshPhysicalMaterial({ color: 0xf2f0ec, roughness: 0.4 })); rose.position.set(0, CEIL - 0.8, 0); sc.add(rose);
  const sock = model('pull_chain_light_socket'); sock.position.set(0, CEIL - drop, 0); sc.add(sock); const bulbM = model('lightbulb_01'); bulbM.rotation.x = Math.PI; bulbM.position.set(0, CEIL - drop - 4.6, 0); sc.add(bulbM);
  bulbM.traverse(o => { if (o.isMesh && /glass/.test(o.material.name)) { o.material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffc070, emissiveIntensity: 7, roughness: 0.2, transparent: true, opacity: 0.94 }); o.castShadow = false; } });
  const L = new THREE.PointLight(0xffc27a, 4200 * bulb, 0, 2); L.position.set(0, CEIL - drop - 8.5, 0); L.castShadow = true; L.shadow.mapSize.set(2048, 2048); L.shadow.bias = -0.0005; L.shadow.camera.near = 1; L.shadow.camera.far = 500; L.userData.soft = 1.0; sc.add(L);
  const fill = new THREE.HemisphereLight(0xffe4c8, 0xff9a50, 0.35); sc.add(fill);
  const plant = model('potted_plant_01'); plant.position.set(-120, 0, -160); sc.add(plant);
  return { ceil, L, bulb: bulbM, sock, fill };
}
// the surface frame on the ceiling: local y = down from the ceiling; place a gecko group inside it
function ceilingFrame(sc, at = V(0, 0, 0), yaw = 0) { const f = new THREE.Group(); f.position.set(at.x, CEIL - 0.05, at.z); f.rotation.set(Math.PI, yaw, 0); sc.add(f); return f; }
