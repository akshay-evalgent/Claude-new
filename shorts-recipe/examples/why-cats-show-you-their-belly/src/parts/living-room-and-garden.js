// =====================================================================
// SETS: living room at sunset, garden at dusk, study lab
// =====================================================================
function addSmile(p) {
  const u = p.userData; const sm = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.013, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0x3a1418, roughness: 0.5 })); sm.rotation.z = Math.PI; sm.position.set(0, 0.03, 0.01); sm.visible = false; u.mouth.add(sm);
  const line = u.mouth.children[0]; const r0 = u.reset; u.reset = () => { r0(); sm.visible = false; };
  u.smile = (k) => { sm.visible = k > 0.05; if (sm.visible) { line.visible = false; sm.scale.set(1 + 0.2 * k, 0.4 + 0.6 * k, 1); } };
}
function cloudPuffs(w = 1.6, h = 1.2, color = 0xffffff) {
  const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.65, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffffff), emissive: new THREE.Color(color), emissiveIntensity: 0.3 });
  const r = rng(Math.round(w * 100 + h * 7)); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const s = new THREE.Mesh(new THREE.SphereGeometry(0.2 + r() * 0.12, 24, 16), m); s.position.set(Math.cos(a) * w * 0.5, Math.sin(a) * h * 0.5, -0.1 + r() * 0.05); g.add(s); }
  const core = new THREE.Mesh(new THREE.CircleGeometry(1, 48), m); core.scale.set(w * 0.52, h * 0.52, 1); core.position.z = -0.12; g.add(core);
  return g;
}
const canvasDyn = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, g: c.getContext('2d'), t }; };
// light shaft from a rectangular opening (u, v are the opening's in-plane axes) with drifting dust
function shaft(sc, wc, au, av, dir, w, h, L, color, op) {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => wc.clone().addScaledVector(au, a * w / 2).addScaledVector(av, b * h / 2));
  const far = corners.map(c => c.clone().addScaledVector(dir, L)); const P = [], A = [];
  for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i + 1) % 4], c = far[(i + 1) % 4], d = far[i]; P.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray()); A.push(0, 0, 1, 0, 1, 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('a', new THREE.Float32BufferAttribute(A, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(color) }, op: { value: op } },
    vertexShader: `attribute float a; varying float vA; void main(){ vA=a; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 col; uniform float op; varying float vA; void main(){ float f=pow(max(0.,1.0-vA),1.5)*smoothstep(0.0,0.06,vA); gl_FragColor=vec4(col*op*f,1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); sc.add(mesh);
  const n = 60, dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.007, 6, 4), hdr(1.2, 0.9, 0.6, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), n); dust.frustumCulled = false; sc.add(dust);
  const r = rng(17), D = []; for (let i = 0; i < n; i++) D.push([r() - 0.5, r() - 0.5, 0.1 + r() * 0.75, r() * 10]); const dm = new THREE.Object3D();
  return (t) => { D.forEach(([a, b, c, s], i) => { dm.position.copy(wc).addScaledVector(au, a * w * 0.9).addScaledVector(av, b * h * 0.9).addScaledVector(dir, c * L * 0.7).add(V(fbm(t * 0.07 + s, 1) * 0.3, fbm(t * 0.06 + s, 2) * 0.3, fbm(t * 0.07 + s, 3) * 0.3)); dm.scale.setScalar(0.6 + 0.9 * h3(i, 2, 3)); dm.updateMatrix(); dust.setMatrixAt(i, dm.matrix); }); dust.instanceMatrix.needsUpdate = true; };
}
const box = (sc, w, h, d, x, y, z, m, r = 0.03, shadow = true) => { const b = new THREE.Mesh(r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)) : new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = shadow; b.receiveShadow = true; sc.add(b); return b; };
function pottedPlant(sc, x, z, s = 1, potC = 0xd8704a) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); sc.add(g);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 28), new THREE.MeshStandardMaterial({ color: potC, roughness: 0.6 })); pot.position.y = 0.275; pot.castShadow = true; g.add(pot);
  const lm = new THREE.MeshStandardMaterial({ color: 0x3f8f4e, roughness: 0.55, side: THREE.DoubleSide }), lm2 = new THREE.MeshStandardMaterial({ color: 0x2f7a44, roughness: 0.55, side: THREE.DoubleSide });
  const r = rng(Math.round(x * 10 + z * 7 + 50));
  for (let i = 0; i < 11; i++) { const a = i * 2.4, len = 0.8 + r() * 0.9, tilt = 0.35 + r() * 0.7; const st = new THREE.Group(); st.position.y = 0.5; st.rotation.set(0, a, 0); g.add(st);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, len, 6), lm2); stem.geometry.translate(0, len / 2, 0); stem.rotation.z = -tilt; st.add(stem);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 10), i % 2 ? lm : lm2); leaf.scale.set(0.9, 0.05, 0.62); leaf.position.set(Math.sin(tilt) * len, Math.cos(tilt) * len, 0); leaf.rotation.z = -tilt + 0.9; leaf.castShadow = true; st.add(leaf); }
  return g;
}
const TBL = { y: 1.3, zf: 0.65 };
function livingRoom(sc) {
  sc.background = new THREE.Color(0x120e0c); sc.environment = MENV; const R = {};
  const fw = woodTex('#b58556', '#6a4424', 91, [3, 4], 7);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.6, roughness: 0.3 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 1.8); floor.receiveShadow = true; sc.add(floor);
  const rugT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#efe4d0'; g.fillRect(0, 0, w, h); const cols = ['#c8643c', '#2f6f6a', '#e0a83a']; for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { g.fillStyle = cols[(i + j * 2) % 3]; g.beginPath(); const x = i * 64 + 32, y = j * 64 + 32; g.moveTo(x, y - 22); g.lineTo(x + 22, y); g.lineTo(x, y + 22); g.lineTo(x - 22, y); g.fill(); } g.strokeStyle = '#2f6f6a'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); noiseFill(g, w, h, 8, 22); });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.6), new THREE.MeshLambertMaterial({ map: rugT, bumpMap: WEAVE, bumpScale: 1.5 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0.2, 0.008, 4.7); rug.receiveShadow = true; sc.add(rug);
  // walls (the left wall has a real window opening, so the sunset only enters through it)
  const wallM = new THREE.MeshLambertMaterial({ color: 0xc6d4c0, bumpMap: PLASTER, bumpScale: 0.5 }), trimM = new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.45 });
  const wall = (w, h, x, y, z, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); p.position.set(x, y, z); p.rotation.y = ry; p.receiveShadow = true; sc.add(p); };
  wall(8, 8, 0, 4, -2.6, 0); wall(10, 8, 3.7, 4, 1.8, -Math.PI / 2); wall(8, 8, 0, 4, 6.3, Math.PI);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8, 10), new THREE.MeshLambertMaterial({ color: 0xf2ece0 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 6.6, 1.8); sc.add(ceil);
  box(sc, 7.4, 0.22, 0.05, 0, 0.11, -2.57, trimM, 0, false);
  const wx = -3.7, oz0 = -1.3, oz1 = 2.9, oy0 = 1.45, oy1 = 4.75;
  const lw = (z0, z1, y0, y1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, y1 - y0, z1 - z0), wallM); b.position.set(wx - 0.15, (y0 + y1) / 2, (z0 + z1) / 2); b.castShadow = b.receiveShadow = true; sc.add(b); };
  lw(-3, oz0, 0, 8); lw(oz1, 6.6, 0, 8); lw(oz0, oz1, 0, oy0); lw(oz0, oz1, oy1, 8);
  const wc = V(wx, (oy0 + oy1) / 2, (oz0 + oz1) / 2), ww = oz1 - oz0, wh = oy1 - oy0;
  [[0, wh / 2, 0.12, ww + 0.1], [0, -wh / 2, 0.12, ww + 0.1]].forEach(([dz, dy, th, len]) => box(sc, 0.16, th, len, wx, wc.y + dy, wc.z, trimM, 0));
  [-ww / 2, 0, ww / 2].forEach(dz => box(sc, 0.14, wh, dz === 0 ? 0.07 : 0.12, wx, wc.y, wc.z + dz, trimM, 0));
  box(sc, 0.14, 0.06, ww, wx, wc.y + 0.2, wc.z, trimM, 0); box(sc, 0.42, 0.08, ww + 0.3, wx + 0.16, oy0 - 0.02, wc.z, trimM, 0.02);
  const SUNSET = gradTex([[0, '#fff0c0'], [0.18, '#ffc070'], [0.45, '#f07a58'], [0.75, '#8a5aa8'], [1, '#3a3a7a']], 0.5, 0.78);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(26, 16), new THREE.MeshBasicMaterial({ map: SUNSET, color: new THREE.Color(1.15, 1.1, 1.05) })); sky.position.set(-11, 4, 1); sky.rotation.y = Math.PI / 2; sc.add(sky);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(0.7, 48), hdr(5, 3.0, 1.3)); sun.position.set(-10.9, 2.5, -2.6); sun.rotation.y = Math.PI / 2; sc.add(sun);
  const cr = rng(8); for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6 + cr() * 1.8, 0.7 + cr() * 0.7), new THREE.MeshBasicMaterial({ color: 0x3a2a4a })); b.position.set(-10.5, 0.6, -5 + i * 1.5); b.position.y = b.geometry.parameters.height / 2 - 0.2; sc.add(b); }
  const curtM = new THREE.MeshLambertMaterial({ color: 0xf2e6d0, side: THREE.DoubleSide, bumpMap: WEAVE_FINE, bumpScale: 0.6, transparent: true, opacity: 0.92 });
  [oz0 - 0.15, oz1 + 0.15].forEach(z => { const g = new THREE.PlaneGeometry(0.9, 3.9, 50, 8), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.07 * Math.sin((x + 0.45) * 24)); } g.computeVertexNormals(); const c = new THREE.Mesh(g, curtM); c.rotation.y = Math.PI / 2; c.position.set(wx + 0.28, 3.1, z); c.castShadow = true; sc.add(c); });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, ww + 1.4, 10), M.chrome); rod.rotation.x = Math.PI / 2; rod.position.set(wx + 0.28, 5.08, wc.z); sc.add(rod);
  // sunset key through the window, cool sky fill, warm lamp
  const tgt = V(0.2, 1.1, 0.6), key = new THREE.DirectionalLight(0xffa25a, 4.2); key.position.copy(tgt.clone().add(wc.clone().sub(tgt).multiplyScalar(2.6))); key.target.position.copy(tgt); sc.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.03; key.userData.soft = 0.22; R.key = key;
  sc.add(new THREE.HemisphereLight(0xf6ece4, 0xb07a52, 1.0));
  const fill = new THREE.DirectionalLight(0xd4dcff, 0.55); fill.position.set(4, 5, 6); sc.add(fill);
  R.dust = shaft(sc, wc.clone().add(V(0.1, 0, 0)), V(0, 0, 1), V(0, 1, 0), tgt.clone().sub(wc).normalize(), ww, wh, 7.5, 0xffb070, 0.085);
  // back wall: console with books, vase, photo; floor lamp; plants; cat tree; framed art
  const walnut = woodTex('#6a4228', '#33200f', 92), walM = new THREE.MeshStandardMaterial({ map: walnut, bumpMap: walnut, bumpScale: 0.4, roughness: 0.4 });
  box(sc, 2.7, 0.95, 0.62, -0.9, 0.6, -2.25, walM, 0.03); [-1.8, -0.9, 0.0].forEach(x => { box(sc, 0.84, 0.75, 0.02, x, 0.6, -1.935, walM, 0.01, false); const k = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 1, roughness: 0.3 })); k.position.set(x + 0.3, 0.62, -1.91); sc.add(k); });
  [-2.1, 0.3].forEach(x => box(sc, 0.07, 0.14, 0.07, x, 0.07, -2.25, walM, 0));
  const br = rng(6); let bx = -2.05; for (let i = 0; i < 9; i++) { const w = 0.07 + br() * 0.07, h = 0.42 + br() * 0.22; box(sc, w, h, 0.34, bx + w / 2, 1.08 + h / 2, -2.28, new THREE.MeshStandardMaterial({ color: [0xc8503a, 0x2f6f8f, 0xe0b040, 0x4a8a5a, 0xf2e6d0, 0x7a4a8a][i % 6], roughness: 0.6 }), 0.01).rotation.z = i === 8 ? 0.22 : 0; bx += w + 0.008; }
  const vase = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.12, 0], [0.17, 0.12], [0.15, 0.3], [0.07, 0.42], [0.09, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 28), new THREE.MeshPhysicalMaterial({ color: 0x2f8f8a, roughness: 0.2, clearcoat: 1 })); vase.position.set(-0.35, 1.08, -2.25); vase.castShadow = true; sc.add(vase);
  for (let i = 0; i < 5; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 5), new THREE.MeshStandardMaterial({ color: 0xc8a878 })); st.geometry.translate(0, 0.45, 0); st.position.set(-0.35, 1.5, -2.25); st.rotation.set((i - 2) * 0.12, 0, (i - 2) * 0.16); sc.add(st); const pf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf2e2c0, roughness: 1 })); pf.position.set(-0.35 - Math.sin((i - 2) * 0.16) * 0.9, 1.5 + 0.88, -2.25 + Math.sin((i - 2) * 0.12) * 0.9); pf.scale.y = 1.8; sc.add(pf); }
  const artT = canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#f2e6d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#e07a4a'; g.beginPath(); g.arc(128, 120, 62, 0, 7); g.fill(); g.fillStyle = '#2f6f6a'; g.beginPath(); g.moveTo(0, 320); g.quadraticCurveTo(90, 150, 256, 250); g.lineTo(256, 320); g.fill(); g.fillStyle = '#e0a83a'; g.beginPath(); g.moveTo(0, 320); g.quadraticCurveTo(170, 230, 256, 300); g.lineTo(256, 320); g.fill(); });
  const art = new THREE.Group(); art.position.set(-1.25, 3.25, -2.56); sc.add(art); art.add(new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.42, 0.06, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.4 }))); const ac = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 1.24), new THREE.MeshStandardMaterial({ map: artT, roughness: 0.8 })); ac.position.z = 0.035; art.add(ac);
  const mir = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshStandardMaterial({ color: 0xdfe8ea, metalness: 1, roughness: 0.08 })); mir.position.set(0.15, 3.3, -2.55); sc.add(mir); const mr = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 10, 48), new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 1, roughness: 0.3 })); mr.position.copy(mir.position); sc.add(mr);
  const lampG = new THREE.Group(); lampG.position.set(1.75, 0, -2.05); sc.add(lampG);
  const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.06, 28), M.black); lb.position.y = 0.03; lampG.add(lb); const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 3.3, 10), new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 1, roughness: 0.3 })); lp.position.y = 1.65; lampG.add(lp);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.46, 0.55, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff0d8, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(1.0, 0.6, 0.28), emissiveIntensity: 1.5 })); shade.position.y = 3.45; lampG.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), hdr(6, 4, 2)); bulb.position.y = 3.35; lampG.add(bulb);
  const lampL = new THREE.PointLight(0xffc890, 9, 9, 2); lampL.position.set(1.75, 3.3, -1.9); sc.add(lampL);
  pottedPlant(sc, -2.85, -1.95, 1.25); pottedPlant(sc, 3.0, 5.6, 1.1, 0x4a6a8a);
  const tree = new THREE.Group(); tree.position.set(2.85, 0, -1.75); sc.add(tree); const carpet = new THREE.MeshLambertMaterial({ color: 0xd9c9a8, bumpMap: WEAVE, bumpScale: 2 }), rope = new THREE.MeshLambertMaterial({ color: 0xb89a6a, bumpMap: WEAVE, bumpScale: 3 });
  [[0, 0.06, 0, 1.1, 0.12, 1.0], [0.1, 1.5, 0, 0.9, 0.1, 0.8], [-0.1, 2.75, 0, 0.75, 0.1, 0.7]].forEach(([x, y, z, w, h, d]) => { const p = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.04), carpet); p.position.set(x, y, z); p.castShadow = true; tree.add(p); });
  [[0.25, 0.78, 0.1, 1.4], [-0.25, 2.12, -0.05, 1.2]].forEach(([x, y, z, h]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, h, 20), rope); p.position.set(x, y, z); p.castShadow = true; tree.add(p); });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshStandardMaterial({ color: 0xe8505a, roughness: 0.5 })); ball.position.set(1.9, 0.11, 1.9); ball.castShadow = true; sc.add(ball);
  // coffee table with its things
  const tT = woodTex('#7a4c2c', '#3a2210', 93, [1, 2], 0), tM = new THREE.MeshStandardMaterial({ map: tT, bumpMap: tT, bumpScale: 0.5, roughness: 0.3 });
  box(sc, 2.5, 0.12, 1.3, 0, TBL.y - 0.06, 0, tM, 0.045); box(sc, 2.2, 0.08, 1.05, 0, 0.42, 0, tM, 0.03);
  [[-1.1, -0.52], [1.1, -0.52], [-1.1, 0.52], [1.1, 0.52]].forEach(([x, z]) => box(sc, 0.09, TBL.y - 0.12, 0.09, x, (TBL.y - 0.12) / 2, z, tM, 0.02));
  [[0x2f6f8f, 0.07, 0.62], [0xe0b040, 0.06, 0.56], [0xc8503a, 0.05, 0.5]].reduce((y, [c, h, w], i) => { box(sc, w, h, 0.42, -0.82, y + h / 2, -0.25, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }), 0.012).rotation.y = 0.2 - i * 0.18; return y + h; }, TBL.y);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.2, 28), new THREE.MeshPhysicalMaterial({ color: 0xf2efe6, roughness: 0.25, clearcoat: 0.8 })); mug.position.set(-0.8, TBL.y + 0.28, -0.25); mug.castShadow = true; sc.add(mug);
  const mh = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.015, 8, 20), mug.material); mh.position.set(-0.69, TBL.y + 0.28, -0.25); sc.add(mh);
  const suc = pottedPlant(sc, 0.88, -0.36, 0.3, 0xf2efe6); suc.position.y = TBL.y;
  const phone = box(sc, 0.2, 0.02, 0.4, 0.92, TBL.y + 0.01, 0.2, new THREE.MeshPhysicalMaterial({ color: 0x15171c, roughness: 0.15, clearcoat: 1 }), 0.008); phone.rotation.y = -0.25; R.phone = phone;
  // sofa with cushions and a throw
  const sofaM = new THREE.MeshLambertMaterial({ color: 0x4f7f8a, bumpMap: WEAVE, bumpScale: 1.6 }), sz = 5.0, sxc = 0.3;
  box(sc, 3.5, 0.5, 1.35, sxc, 0.48, sz, sofaM, 0.08); box(sc, 3.5, 1.25, 0.4, sxc, 1.25, sz + 0.52, sofaM, 0.12);
  [-1, 1].forEach(sd => { box(sc, 0.42, 1.05, 1.4, sxc + sd * 1.72, 0.72, sz, sofaM, 0.14); box(sc, 1.5, 0.3, 1.05, sxc + sd * 0.76, 0.88, sz - 0.12, sofaM, 0.11); box(sc, 1.45, 0.75, 0.3, sxc + sd * 0.76, 1.42, sz + 0.28, sofaM, 0.13).rotation.x = -0.12; });
  [[-1.25, 0xe0a83a, 0.3], [1.3, 0xc8643c, -0.25]].forEach(([x, c, rz]) => { const p = box(sc, 0.62, 0.62, 0.22, sxc + x, 1.38, sz + 0.05, new THREE.MeshLambertMaterial({ color: c, bumpMap: WEAVE_FINE, bumpScale: 1 }), 0.1); p.rotation.set(-0.3, 0, rz); });
  [[-1.5, -0.55], [1.5, -0.55], [-1.5, 0.55], [1.5, 0.55]].forEach(([x, z]) => box(sc, 0.08, 0.24, 0.08, sxc + x, 0.12, sz + z, walM, 0));
  R.sofa = { x: sxc, z: sz, seatY: 1.03 };
  R.update = (t) => { R.dust(t); };
  return R;
}
const OWNER = { shirt: 0xd9a441, pants: 0x4a5a78, hair: 0x7a3b18, skin: 0xf0b48e, style: 'long', s: 1.0, hs: 1.0, barefoot: true };
// seat a character on a surface of height y
function seatOn(p, y, s = 1) { const u = p.userData; p.position.y = y + 0.16 * s - 1.3 * s; u.legs.forEach((L, i) => { L.hip.rotation.set(-1.45, (i ? 1 : -1) * 0.08, 0); L.knee.rotation.x = 1.4; }); }
function makeLaptop() {
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0xb8bcc4, metalness: 0.9, roughness: 0.3 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.035, 0.58, 2, 0.012), m); base.castShadow = true; g.add(base);
  const lid = new THREE.Group(); lid.position.set(0, 0.018, -0.29); lid.rotation.x = -0.32; g.add(lid);
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.56, 0.025, 2, 0.01), m); back.position.y = 0.28; back.castShadow = true; lid.add(back);
  const scrT = canvasTex(256, 160, (c, w, h) => { c.fillStyle = '#f4f6fa'; c.fillRect(0, 0, w, h); c.fillStyle = '#2f6fdf'; c.fillRect(0, 0, w, 18); c.fillStyle = '#c8d0dc'; for (let i = 0; i < 7; i++) c.fillRect(14, 32 + i * 17, 120 + (i * 37) % 100, 8); c.fillStyle = '#e0a83a'; c.fillRect(170, 96, 70, 46); });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.79, 0.5), new THREE.MeshBasicMaterial({ map: scrT, color: new THREE.Color(1.5, 1.5, 1.6) })); scr.position.set(0, 0.28, 0.014); lid.add(scr);
  return g;
}

// ---------- garden at dusk ----------
function garden(sc) {
  sc.background = gradTex([[0, '#ffb070'], [0.25, '#c86a8a'], [0.55, '#4a3a8a'], [1, '#141a44']], 0.5, 0.95); sc.environment = tintedEnv(0.3, 0.3, 0.55); sc.fog = new THREE.Fog(0x3a3a6a, 9, 30);
  const R = {};
  const gT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#2f5a34'; g.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 5000; i++) { g.strokeStyle = `rgba(${40 + r() * 60},${90 + r() * 90},${40 + r() * 40},0.7)`; g.lineWidth = 1 + r(); const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - 5 - r() * 8); g.stroke(); } }, { rep: [8, 8] });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshLambertMaterial({ map: gT })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  // grass blades that sway
  const bg = new THREE.PlaneGeometry(0.035, 0.34, 1, 4); bg.translate(0, 0.17, 0); const bp = bg.attributes.position; for (let i = 0; i < bp.count; i++) { const y = bp.getY(i) / 0.34; bp.setX(i, bp.getX(i) * (1 - y * 0.92)); bp.setZ(i, 0.07 * y * y); } bg.computeVertexNormals();
  const NB = 9000, bm = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }); const uT = { value: 0 };
  bm.onBeforeCompile = sh => { sh.uniforms.uT = uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n float sw = sin(uT * 1.6 + instanceMatrix[3].x * 1.3 + instanceMatrix[3].z * 0.9) * 0.06 + sin(uT * 3.1 + instanceMatrix[3].z * 2.1) * 0.02; transformed.x += sw * uv.y * uv.y * 4.0; transformed.z += sw * 0.5 * uv.y * uv.y * 4.0;'); };
  const blades = new THREE.InstancedMesh(bg, bm, NB); blades.frustumCulled = false; blades.receiveShadow = true; const r = rng(11), dm = new THREE.Object3D(), col = new THREE.Color();
  for (let i = 0; i < NB; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 9; dm.position.set(Math.cos(a) * d, 0, Math.sin(a) * d - 1.5); dm.rotation.set((r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5); const px = dm.position.x, pz = dm.position.z, clear = px > -1.1 && px < 3.8 && pz > -1.4 && pz < 4.6; const s = clear ? 0.28 + r() * 0.22 : 0.7 + r() * 1.0; dm.scale.set(s * (clear ? 1.6 : 1), s * (0.7 + r() * 0.9), s); dm.updateMatrix(); blades.setMatrixAt(i, dm.matrix); blades.setColorAt(i, col.setHSL(0.27 + r() * 0.08, 0.5 + r() * 0.2, 0.2 + r() * 0.16)); }
  sc.add(blades); R.blades = blades;
  // fence, house wall with a warm window, flowers, moon and fireflies
  const fenceM = new THREE.MeshLambertMaterial({ color: 0x8a6a4e, map: woodTex('#8a6a4e', '#4a3422', 14) });
  for (let i = -14; i <= 14; i++) { const pk = new THREE.Mesh(new RoundedBoxGeometry(0.42, 2.3 + 0.06 * Math.sin(i * 3.1), 0.06, 1, 0.02), fenceM); pk.position.set(i * 0.5, 1.15, -6.5); pk.castShadow = true; sc.add(pk); }
  [0.7, 1.8].forEach(y => { const rl = new THREE.Mesh(new THREE.BoxGeometry(15, 0.14, 0.08), fenceM); rl.position.set(0, y, -6.58); sc.add(rl); });
  const hw = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshLambertMaterial({ color: 0x5a5470 })); hw.position.set(-7, 4.5, -1); hw.rotation.y = Math.PI / 2; sc.add(hw);
  const winG = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.2), hdr(3.2, 2.0, 0.9)); winG.position.set(-6.97, 3.0, -0.5); winG.rotation.y = Math.PI / 2; sc.add(winG);
  [[0, 0, 0.07, 2.2], [0, 0, 2.0, 0.07]].forEach(([a, b, w, h]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x3a3048 })); m.position.set(-6.96, 3.0, -0.5); m.rotation.y = Math.PI / 2; sc.add(m); });
  const winL = new THREE.PointLight(0xffb060, 14, 12, 2); winL.position.set(-6.2, 3.0, -0.5); sc.add(winL);
  const fr = rng(21); for (let i = 0; i < 26; i++) { const g = new THREE.Group(); const a = fr() * 6.28, d = 1.5 + fr() * 6; g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d - 2); if (g.position.x > -1.3 && g.position.x < 4 && g.position.z > -1.5 && g.position.z < 5) g.position.x -= 5.5; sc.add(g); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 5), new THREE.MeshLambertMaterial({ color: 0x3f7a44 })); st.position.y = 0.25; g.add(st); const ce = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffd23f })); ce.position.y = 0.52; g.add(ce); for (let k = 0; k < 7; k++) { const pt = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshLambertMaterial({ color: i % 3 ? 0xf6f2ff : 0xffb8d8 })); pt.scale.set(1.6, 0.25, 0.8); pt.position.set(Math.cos(k * 0.9) * 0.07, 0.52, Math.sin(k * 0.9) * 0.07); pt.rotation.y = -k * 0.9; g.add(pt); } }
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), hdr(2.6, 2.6, 2.4)); moon.position.set(5, 11, -28); sc.add(moon);
  const sr = rng(4); for (let i = 0; i < 60; i++) { const st = new THREE.Mesh(new THREE.CircleGeometry(0.04 + sr() * 0.05, 6), hdr(1.8, 1.8, 2.2)); st.position.set((sr() - 0.5) * 50, 8 + sr() * 14, -29); sc.add(st); }
  const flies = []; for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), hdr(3.5, 3.6, 1.2)); sc.add(m); flies.push([m, sr() * 10, sr() * 10, sr() * 10]); }
  sc.add(new THREE.HemisphereLight(0xa8a8dc, 0x2a3a2a, 0.9));
  const key = new THREE.DirectionalLight(0xb8c4ff, 1.5); key.position.set(4, 8, -5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); key.shadow.bias = -0.0003; key.userData.soft = 0.2; sc.add(key);
  const warm = new THREE.DirectionalLight(0xffb070, 1.9); warm.position.set(-6, 2.5, 3); sc.add(warm);
  R.update = (t) => { uT.value = t; flies.forEach(([m, a, b, c], i) => { m.position.set(fbm(t * 0.12 + a, 1) * 5, 0.8 + 0.7 * (0.5 + 0.5 * fbm(t * 0.15 + b, 2)), -2 + fbm(t * 0.12 + c, 3) * 4); m.scale.setScalar(0.5 + 0.8 * Math.max(0, Math.sin(t * 2.2 + i * 1.7))); }); };
  return R;
}

// ---------- the study room: four stations around the cat ----------
function lab(sc) {
  sc.background = new THREE.Color(0xdfe9ee); sc.environment = ENV; const R = {};
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ color: 0xc9d6dc, roughness: 0.32 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wallM = new THREE.MeshLambertMaterial({ color: 0xeef3f5 });
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), wallM); bw.position.set(0, 4, -4.4); bw.receiveShadow = true; sc.add(bw);
  const st = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.3), new THREE.MeshLambertMaterial({ color: 0x5ab8c8 })); st.position.set(0, 1.5, -4.39); sc.add(st);
  [-1, 1].forEach(sd => { const w = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallM); w.position.set(sd * 5.2, 4, 1); w.rotation.y = -sd * Math.PI / 2; sc.add(w); });
  for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), hdr(2.2, 2.2, 2.1)); p.rotation.x = Math.PI / 2; p.position.set(-3 + k * 3, 7.2, -0.5); sc.add(p); }
  sc.add(new THREE.HemisphereLight(0xffffff, 0xb8c8d0, 1.0));
  const key = new THREE.DirectionalLight(0xfffaf0, 2.2); key.position.set(3, 8, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 25 }); key.shadow.bias = -0.0003; key.userData.soft = 0.3; sc.add(key);
  const mat = (x, z, c) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.78, 48), new THREE.MeshLambertMaterial({ color: c, bumpMap: WEAVE, bumpScale: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); m.receiveShadow = true; sc.add(m); };
  R.P = { human: V(0, 0, -2.2), food: V(1.25, 0, 0.0), toy: V(-1.25, 0, 0.0), scent: V(0, 0, 2.45) };
  mat(R.P.human.x, R.P.human.z, 0xf2c94c); mat(R.P.food.x, R.P.food.z, 0xeb8f6a); mat(R.P.toy.x, R.P.toy.z, 0x7ac6e8); mat(R.P.scent.x, R.P.scent.z, 0xb9a4e8);
  // food bowl with kibble
  const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.3, 0], [0.42, 0.05], [0.46, 0.2], [0.42, 0.21], [0.37, 0.07], [0, 0.06]].map(([x, y]) => new THREE.Vector2(x, y)), 40), new THREE.MeshPhysicalMaterial({ color: 0xe8505a, roughness: 0.25, clearcoat: 1, side: THREE.DoubleSide })); bowl.position.copy(R.P.food); bowl.castShadow = true; sc.add(bowl);
  const kr = rng(5), kib = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshLambertMaterial({ color: 0x9a6a3a }), 70), dm = new THREE.Object3D(); for (let i = 0; i < 70; i++) { const a = kr() * 6.28, d = Math.sqrt(kr()) * 0.3; dm.position.set(R.P.food.x + Math.cos(a) * d, 0.1 + kr() * 0.07 * (1 - d / 0.3), R.P.food.z + Math.sin(a) * d); dm.scale.set(1, 0.7, 1); dm.updateMatrix(); kib.setMatrixAt(i, dm.matrix); } kib.castShadow = true; sc.add(kib);
  // toy: a feather wand lying on the mat and a ball
  const tg = new THREE.Group(); tg.position.copy(R.P.toy); sc.add(tg);
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x3a3a3a })); wand.rotation.z = Math.PI / 2; wand.rotation.y = 0.4; wand.position.set(0, 0.03, 0.1); tg.add(wand);
  [0xff6a8a, 0xffd23f, 0x5ab8ff].forEach((c, i) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshLambertMaterial({ color: c })); f.scale.set(1, 0.1, 0.35); f.position.set(-0.5, 0.05 + i * 0.01, 0.3 - i * 0.02); f.rotation.y = 0.4 + (i - 1) * 0.5; f.castShadow = true; tg.add(f); });
  const tb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), new THREE.MeshStandardMaterial({ color: 0x5ad88a, roughness: 0.5 })); tb.position.set(0.35, 0.13, -0.25); tb.castShadow = true; tg.add(tb);
  // scent: a folded cloth in a dish
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.06, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1 })); dish.position.copy(R.P.scent).add(V(0, 0.03, 0)); dish.castShadow = true; sc.add(dish);
  const cloth = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.07, 0.36, 3, 0.03), new THREE.MeshLambertMaterial({ color: 0xa8d8c0, bumpMap: WEAVE_FINE, bumpScale: 1.5 })); cloth.position.copy(R.P.scent).add(V(0, 0.095, 0)); cloth.rotation.y = 0.3; cloth.castShadow = true; sc.add(cloth);
  // labels on the floor and the result numbers that pop up
  const lab_ = (txt, p, w = 1.0) => { const m = textPlane(txt, w, '#ffffff', '#2a3a44'); m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.012, p.z + 0.93); m.userData.dofMap = m.material.map; sc.add(m); };
  lab_('HUMAN', R.P.human, 0.9); lab_('FOOD', R.P.food, 0.8); lab_('TOY', R.P.toy, 0.8); lab_('SCENT', R.P.scent, 0.8);
  R.num = {}; [['human', '50%', '#ffd23f', 1.9], ['food', '37%', '#ff9a7a', 1.45], ['toy', '11%', '#8ad4ff', 1.35], ['scent', '2%', '#c8b4ff', 1.2]].forEach(([k, txt, c, w]) => { const m = textPlane(txt, w, c, '#1a2a34'); m.userData.dofMap = m.material.map; m.renderOrder = 12; sc.add(m); R.num[k] = m; });
  return R;
}
