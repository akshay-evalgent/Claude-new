// =====================================================================
// SETS: the Piazza San Marco at pigeon height (the real HDR photo projected onto the ground, scanned
// granite slabs near the camera), a flock, the lab treadmill, a camera on a tripod, a hawk, seeds
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, ASPECT, 0.004, 400) }; build(s); shots.push(s); return s; }
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }

const FADE = (() => { const [c, g] = mkCanvas(512, 512); const gr = g.createRadialGradient(256, 256, 60, 256, 256, 256); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); const t = new THREE.CanvasTexture(c); return t; })();
function aimSun(L, c, d = 5) { L.position.copy(c).addScaledVector(SUN_DIR.dir, d); L.target.position.copy(c); L.target.updateMatrixWorld(); }

// the square (the sun's direction comes from the photo; shots pick headings and camera angles around it)
function plaza(sc, { sun = 1.7, env = 0.9, shadowBox = 0.45, tint = 0xc2b8aa } = {}) {
  sc.environment = PIAZZA.env; sc.environmentIntensity = env; sc.background = new THREE.Color(0x7d8794);
  const sky = new GroundProjectedSkybox(PIAZZA.tex); sky.scale.setScalar(90); sky.height = 1.6; sky.radius = 90; sc.add(sky);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), pbrMat(TX.granite, { rep: [10, 10], color: tint, normal: 1.3, transparent: true, alphaMap: FADE, depthWrite: true, envMapIntensity: 0.8 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0.0004; ground.receiveShadow = true; sc.add(ground);
  const sunL = new THREE.DirectionalLight(0xfff1de, sun); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
  Object.assign(sunL.shadow.camera, { left: -shadowBox, right: shadowBox, top: shadowBox, bottom: -shadowBox, near: 0.5, far: 12 }); sunL.shadow.bias = -0.00015; sunL.shadow.normalBias = 0.002; sunL.userData.soft = 0.035;
  sc.add(sunL, sunL.target);
  const dir = SUN_DIR.dir.clone();
  sunL.userData.aim = (c, d = 5) => { sunL.position.copy(c).addScaledVector(dir, d); sunL.target.position.copy(c); sunL.target.updateMatrixWorld(); };
  sunL.userData.aim(V(0, 0, 0));
  return { sky, ground, sun: sunL, dir };
}

// a bird walking along a path in the square: heading (radians, 0 = +x), start point, its own clock offset
function walker(sc, { spec = PIGEON, at = V(0, 0, 0), heading = 0, gaitOpts = {}, lod = null, tint = null } = {}) {
  const b = makeBird(spec, lod ? { lod } : {}); b.position.copy(at); b.rotation.y = heading; sc.add(b);
  if (tint) b.userData.skin.material.color = new THREE.Color(tint);
  b.userData.walk = (tw, extra = {}) => { const P = gait(tw, { ...gaitOpts, ...extra }, spec); poseBird(b, P); return P; };
  b.userData.world = (local) => b.localToWorld(local.clone());
  return b;
}

// a background flock: pigeons milling about and pecking (lower-detail skins)
function flock(sc, list) {
  return list.map(([x, z, hd, ph, peckRate, tint]) => {
    const b = walker(sc, { at: V(x, 0, z), heading: hd, lod: { nb: 36, nn: 24, nh: 24, nv: 32 } }); if (tint) b.userData.skin.material.color.setHex(tint);
    return (t) => { const tw = t * 0.55 + ph, pk = Math.max(0, Math.sin(tw * peckRate * 2 + ph * 3)) ** 6; b.userData.walk(tw, { v: 0.1, peck: pk }); };
  });
}

// piecewise-linear time warp: [[t, tau], ...] -> the bird's clock at shot time t (slow motion, freeze, speed-up)
function warp(keys) { return (t) => { if (t <= keys[0][0]) return keys[0][1] + (t - keys[0][0]) * ((keys[1][1] - keys[0][1]) / (keys[1][0] - keys[0][0])); for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, A] = keys[i - 1], [b, B] = keys[i]; return lerp(A, B, (t - a) / (b - a)); } const n = keys.length - 1, [a, A] = keys[n - 1], [b, B] = keys[n]; return B + (t - b) * (B - A) / (b - a); }; }

// a thin vertical laser line (a fixed reference in space) with a soft glow, grown from the ground
function laserLine(h = 0.26, color = 0xff3a1e) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.00045, 0.00045, 1, 8), new THREE.MeshBasicMaterial({ color: 0xffd2c4, toneMapped: false })); core.geometry.translate(0, 0.5, 0);
  const glowM = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 12), glowM); halo.geometry.translate(0, 0.5, 0);
  core.userData.noDof = true; halo.userData.noDof = true; g.add(core, halo); g.scale.set(1, h, 1);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 16, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); dot.userData.noDof = true;
  g.userData = { grow: (k, hh = h) => { g.scale.y = Math.max(1e-4, hh * k); g.visible = k > 0.001; }, core, halo };
  return g;
}

// seeds scattered on the paving
function seeds(sc, n = 90, area = [0.6, 0.4], at = V(0, 0, 0), seed = 3) {
  const r = rng(seed), geo = new THREE.SphereGeometry(1, 10, 8), mat = new THREE.MeshPhysicalMaterial({ roughness: 0.55, clearcoat: 0.3 });
  const m = new THREE.InstancedMesh(geo, mat, n), o = new THREE.Object3D(), cols = [0xc9a35a, 0xb98f45, 0xd8bf7a, 0x6b4a2a, 0xe0c890];
  for (let i = 0; i < n; i++) { o.position.set(at.x + (r() - 0.5) * area[0], 0.0016, at.z + (r() - 0.5) * area[1]); o.rotation.set(0, r() * 6.28, r() * 0.3); o.scale.set(0.0032 + r() * 0.0015, 0.0016, 0.0019); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, new THREE.Color(cols[Math.floor(r() * cols.length)])); }
  m.castShadow = m.receiveShadow = true; sc.add(m); return m;
}

// a little tabletop tripod with the vintage camera on it
function tripodCam(sc) {
  const g = new THREE.Group(), al = new THREE.MeshPhysicalMaterial({ color: 0x1b1c1f, roughness: 0.35, metalness: 0.6, clearcoat: 0.4 }), rub = new THREE.MeshStandardMaterial({ color: 0x0e0e0f, roughness: 0.9 });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.022, 24), al); head.position.y = 0.118; g.add(head);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 16), al); col.position.y = 0.09; g.add(col);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.3, top = V(0, 0.078, 0), foot = V(Math.cos(a) * 0.075, 0.003, Math.sin(a) * 0.075); const leg = cyl(0.0042, 0.0034, al, 12); placeBetween(leg, foot, top); g.add(leg); const f = new THREE.Mesh(new THREE.SphereGeometry(0.005, 12, 8), rub); f.position.copy(foot); g.add(f); }
  const cam = model('Camera_01'); cam.position.y = 0.129; g.add(cam); g.userData.cam = cam;
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); sc.add(g); return g;
}

// a hawk gliding overhead (seen from below against the sky)
function hawk() {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.8 }), pale = new THREE.MeshStandardMaterial({ color: 0x8a7258, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), pale); body.scale.set(0.24, 0.075, 0.08); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), m); head.position.x = 0.22; g.add(head);
  const wingShape = (sd) => { const s = new THREE.Shape(); s.moveTo(0.06, 0); s.bezierCurveTo(0.12, sd * 0.25, 0.1, sd * 0.55, 0.02, sd * 0.62);
    for (let f = 0; f < 5; f++) { const y = sd * (0.62 + f * 0.035), x = 0.0 - f * 0.05; s.lineTo(x + 0.05, y + sd * 0.04); s.lineTo(x, y); }
    s.bezierCurveTo(-0.24, sd * 0.5, -0.16, sd * 0.2, -0.08, 0); s.closePath(); return s; };
  const wings = [-1, 1].map(sd => { const w = new THREE.Mesh(new THREE.ShapeGeometry(wingShape(sd)), m); w.rotation.x = -Math.PI / 2; w.material.side = THREE.DoubleSide; g.add(w); return w; });
  const tail = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20, Math.PI - 0.35, 0.7), m); tail.rotation.x = -Math.PI / 2; tail.position.x = -0.12; tail.material.side = THREE.DoubleSide; g.add(tail);
  g.userData.flap = (t) => wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * 0.12 * Math.sin(t * 2.2); });
  g.scale.setScalar(1.15); return g;
}

// the lab: a small treadmill on a bench in a studio, acrylic side walls
const BELT_T = (() => { const [c, g] = mkCanvas(256, 512); g.fillStyle = '#1c1d1f'; g.fillRect(0, 0, 256, 512); const r = rng(8); for (let y = 0; y < 512; y += 8) { g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.02})`; g.fillRect(0, y, 256, 2); } for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * 256, r() * 512, 2, 2); } return texOf(c); })();
function lab(sc) {
  sc.environment = STUDIO.env; sc.environmentIntensity = 0.55; sc.background = new THREE.Color(0x15171a);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.95 })); back.position.set(0, 1.0, -1.2); sc.add(back);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 1.2), new THREE.MeshPhysicalMaterial({ color: 0x5d5852, roughness: 0.7, clearcoat: 0.1 })); bench.position.set(0, -0.06, -0.2); bench.receiveShadow = true; sc.add(bench);
  const al = new THREE.MeshPhysicalMaterial({ color: 0x3a3d42, roughness: 0.35, metalness: 0.7 }), dark = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.6 });
  const T = new THREE.Group(); sc.add(T);
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.035, 0.2, 4, 0.008), dark); base.position.y = -0.022; T.add(base);
  const beltTex = BELT_T.clone(); beltTex.needsUpdate = true; beltTex.repeat.set(1, 3); beltTex.rotation = Math.PI / 2;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.004, 0.15), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.85 })); belt.position.y = -0.002; belt.receiveShadow = true; T.add(belt);
  for (const sd of [-1, 1]) { const rail = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.016, 0.018, 3, 0.004), al); rail.position.set(0, 0.002, sd * 0.084); T.add(rail);
  }
  const motor = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.06, 0.2, 4, 0.01), dark); motor.position.set(0.34, 0.005, 0); T.add(motor);
  for (const x of [-0.285, 0.285]) { const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 24), al); rl.rotation.x = Math.PI / 2; rl.position.set(x, -0.012, 0); T.add(rl); }
  const [dc, dg] = mkCanvas(256, 96); dg.fillStyle = '#050806'; dg.fillRect(0, 0, 256, 96); dg.fillStyle = '#7dff9a'; dg.font = 'bold 56px monospace'; dg.textAlign = 'center'; dg.textBaseline = 'middle'; dg.fillText('0.7 km/h', 128, 50);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.0225), new THREE.MeshBasicMaterial({ map: texOf(dc), toneMapped: false })); disp.position.set(0.336, 0.022, 0.1005); T.add(disp);
  const lamp = new THREE.SpotLight(0xfff4e8, 9, 4, 0.5, 0.7); lamp.position.set(-0.6, 1.1, 0.8); lamp.target.position.set(0, 0.05, 0); lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0002; lamp.userData.soft = 0.08; sc.add(lamp, lamp.target);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 1.2); rim.position.set(0.8, 0.6, -1); sc.add(rim);
  T.traverse(o => { if (o.isMesh) { o.castShadow = !o.userData.glassWall; o.receiveShadow = true; } });
  return { T, beltTex, belt };
}
