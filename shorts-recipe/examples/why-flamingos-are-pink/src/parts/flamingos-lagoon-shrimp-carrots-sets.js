// =====================================================================
// FLAMINGOS: the species (adult + chick), the bent bill, poses; the lagoon (a mirror-like Reflector
// with ripples over a real salt-pan sky); the nest, brine shrimp and algae, carrots, zoo pellets
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, ASPECT, 0.004, 900) }; build(s); shots.push(s); return s; }
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const s2l = (c) => c.map(v => Math.pow(v, 2.2));
const mixc = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// desaturate/darken a textured material towards grey (k = 1 full colour, 0 grey): for wings, tail
function satMat(m) { m.userData.sat = { value: 1 }; m.onBeforeCompile = (sh) => { sh.uniforms.uSat = m.userData.sat; sh.fragmentShader = 'uniform float uSat;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n { float L = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = mix(vec3(L) * vec3(0.98, 0.96, 0.93) * 1.05, diffuseColor.rgb, uSat); }'); }; return m; }

// ---------- the bill: tall at the base, bent sharply down halfway, a black tip ----------
function flamingoBill(head, spec) {
  const B = spec.bill, curve = new THREE.CatmullRomCurve3(B.pts.map(p => V(p[0], p[1], 0))), ns = 48, nv = 28, cols = nv + 1;
  const pos = new Float32Array((ns + 1) * cols * 3), col = new Float32Array((ns + 1) * cols * 3), idx = [];
  const F = ptFrames(curve, ns);
  for (let i = 0; i <= ns; i++) for (let j = 0; j <= nv; j++) {
    const s = i / ns, th = 2 * Math.PI * j / nv, k = i * cols + j, h = lerp(B.h[0], B.h[1], Math.pow(s, 0.85)), w = lerp(B.w[0], B.w[1], s), c = Math.cos(th), sn = Math.sin(th);
    const lower = sn < 0 ? B.lowerFat : 1, P = F.P[i].clone().addScaledVector(F.N[i], sn * h * lower).addScaledVector(F.B[i], c * w * (1 - 0.15 * Math.abs(sn)));
    pos[k * 3] = P.x; pos[k * 3 + 1] = P.y; pos[k * 3 + 2] = P.z;
  }
  for (let i = 0; i < ns; i++) for (let j = 0; j < nv; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.1, clearcoatRoughness: 0.4, envMapIntensity: 0.7 })); m.castShadow = m.receiveShadow = true; head.add(m);
  head.userData.bill = m;
  m.userData.recolor = (kk) => { for (let i = 0; i <= ns; i++) for (let j = 0; j <= nv; j++) { const s = i / ns, th = 2 * Math.PI * j / nv, q = i * cols + j;
      let c = mixc(mixc(B.base0, B.base1, kk), B.tip, smooth(B.tipAt - 0.04, B.tipAt + 0.04, s)); if (Math.abs(Math.sin(th)) < 0.08 && s < B.tipAt) c = c.map(v => v * 0.55); // the gape line
      c = s2l(c); col[q * 3] = c[0]; col[q * 3 + 1] = c[1]; col[q * 3 + 2] = c[2]; }
    geo.attributes.color.needsUpdate = true; };
  m.userData.recolor(1);
}
const flamingoTail = () => { const [c, g] = mkCanvas(512, 256), [hc, hg] = mkCanvas(512, 256); g.fillStyle = '#f08890'; g.fillRect(0, 0, 512, 256); hg.fillStyle = '#808080'; hg.fillRect(0, 0, 512, 256);
  for (let i = 0; i <= 10; i++) { const y = i * 25.6; g.fillStyle = 'rgba(160,60,70,0.18)'; g.fillRect(0, y - 1, 512, 2); hg.fillStyle = '#404040'; hg.fillRect(0, y - 1.5, 512, 3); hg.fillStyle = '#b0b0b0'; hg.fillRect(0, y + 1.5, 512, 8); }
  const [bc, bg] = mkCanvas(512, 256); bg.filter = 'blur(2px)'; bg.drawImage(hc, 0, 0); return { map: texOf(c), normalMap: heightToNormal(bc, 2) }; };

const FLAMINGO = {
  body: [[-0.34, 0.06, 0.010, 0.008, 0.008], [-0.28, 0.05, 0.045, 0.028, 0.030], [-0.19, 0.03, 0.085, 0.058, 0.070], [-0.07, 0.01, 0.108, 0.078, 0.098],
         [0.05, 0.01, 0.108, 0.080, 0.100], [0.15, 0.04, 0.080, 0.068, 0.080], [0.20, 0.09, 0.024, 0.024, 0.026]],
  head: [[-0.040, -0.034, 0.017, 0.016, 0.018], [-0.028, -0.012, 0.024, 0.024, 0.023], [-0.012, 0.0, 0.027, 0.028, 0.024], [0.006, -0.001, 0.023, 0.024, 0.020], [0.020, -0.006, 0.017, 0.017, 0.016], [0.028, -0.009, 0.012, 0.012, 0.012]],
  neckPuff: 1.0, neckSlope: 0.12, neckTan: [1.6, 1.2], neckDir0: V(-0.2, 1, 0), rowLen: [0.028, 0.011, 0.0055], featherOpts: { seed: 11 }, featherNormal: 0.2, sheen: 0.22, sheenColor: [0.55, 0.28, 0.30],
  color(u, th, nz, k) {
    const top = Math.sin(th);
    const P = { body: [0.96, 0.48, 0.48], back: [0.95, 0.46, 0.47], belly: [0.98, 0.56, 0.55], neck: [0.96, 0.42, 0.46], head: [0.95, 0.44, 0.48], face: [0.97, 0.74, 0.70] };
    const G = { body: [0.52, 0.50, 0.48], back: [0.44, 0.42, 0.40], belly: [0.60, 0.58, 0.56], neck: [0.48, 0.47, 0.45], head: [0.47, 0.46, 0.44], face: [0.58, 0.57, 0.55] };
    const PL = { body: [0.97, 0.88, 0.86], back: [0.95, 0.86, 0.84], belly: [0.98, 0.91, 0.89], neck: [0.96, 0.84, 0.83], head: [0.95, 0.84, 0.83], face: [0.97, 0.90, 0.87] };
    const pal = (key) => k <= 1 ? mixc(G[key], P[key], k) : mixc(P[key], PL[key], k - 1); // 0 grey juvenile, 1 pink, 2 faded pale
    let c = mixc(mixc(pal('body'), pal('belly'), smooth(0, -0.9, top)), pal('back'), smooth(0.2, 0.9, top));
    c = mixc(c, pal('neck'), smooth(0.42, 0.52, u)); c = mixc(c, pal('head'), smooth(0.72, 0.8, u)); c = mixc(c, pal('face'), smooth(0.9, 0.97, u));
    const n = 1 + nz * 0.05; return s2l(c.map(v => clamp(v * n)));
  },
  wingOpts: { base: [235, 82, 92], bar: [20, 20, 22], prim: [22, 20, 22], bars: false, seed: 13 },
  wing: { xFront: 0.10, xTip: -0.40, tailX: -0.30, tipA: 0.02, tipLift: 0.03, thTop: [1.2, 1.42], thBot: [-0.3, 0.6], sz: 3.6, ns: 44, nt: 18 },
  tail: { len: 0.12, w: [0.045, 0.065], h: [0.022, 0.006], droop: 0.02, cup: 0.012, pos: [-0.28, 0.06, 0.2] }, tailTex: flamingoTail,
  eye: { pos: [-0.004, 0.008, 0.0215], R: 0.0072, EV: 0.0046, yaw: 0.25, ring: [0.0072, 0.0052], ringCol: [0.98, 0.88, 0.85] }, iris: ['#e8c83a', '#f1dc72', 30],
  bill: { pts: [[0.022, -0.010], [0.050, -0.016], [0.074, -0.026], [0.090, -0.050], [0.100, -0.082], [0.104, -0.096]], h: [0.017, 0.0035], w: [0.012, 0.0035], lowerFat: 1.25, base0: [0.62, 0.60, 0.60], base1: [0.93, 0.66, 0.66], tip: [0.04, 0.04, 0.05], tipAt: 0.56 },
  beak: flamingoBill,
  leg: { tib: [0.011, 0.0095], tar: [0.0105, 0.0085], ank: 0.0155, bareTib: true, toes: [[0.085, 0, 0.0065], [0.075, 0.5, 0.0055], [0.075, -0.5, 0.0055], [0.016, Math.PI, 0.004]] },
  legColor: 0xe0707c, legHip: V(0.02, -0.06, 0.05), L1: 0.375, L2: 0.37, headHeight: 1.26, bodyHeight: 0.79, bodyPitch: 0.04, tuck: V(0.05, -0.17, 0.02), footLift: 0.012,
  gaitDef: { footZ: 0.055, lift: 0.09, ahead: 0.10 },
};
FLAMINGO.restPose = () => standPose(FLAMINGO);
const CHICK = {
  body: [[-0.062, 0.012, 0.005, 0.004, 0.004], [-0.05, 0.010, 0.026, 0.023, 0.023], [-0.025, 0.005, 0.042, 0.040, 0.042], [0.01, 0.005, 0.045, 0.043, 0.045], [0.04, 0.016, 0.034, 0.033, 0.035], [0.054, 0.034, 0.022, 0.022, 0.024]],
  head: [[-0.02, -0.018, 0.019, 0.017, 0.019], [-0.012, -0.004, 0.021, 0.021, 0.02], [0.0, 0.0, 0.021, 0.022, 0.019], [0.012, -0.003, 0.016, 0.016, 0.014], [0.02, -0.006, 0.009, 0.009, 0.009]],
  neckPuff: 1.1, neckTan: [0.9, 0.8], rowLen: [0.006, 0.004, 0.003], featherOpts: { seed: 31 }, featherNormal: 0.5, sheen: 0.9, sheenColor: [0.6, 0.6, 0.6],
  color(u, th, nz) { const top = Math.sin(th); let c = mixc(mixc([0.50, 0.49, 0.48], [0.62, 0.61, 0.60], smooth(0, -0.9, top)), [0.44, 0.43, 0.42], smooth(0.2, 0.9, top)); c = mixc(c, [0.56, 0.55, 0.54], smooth(0.72, 0.8, u)); const n = 1 + nz * 0.12; return s2l(c.map(v => clamp(v * n))); },
  wingOpts: { base: [150, 148, 146], prim: [140, 138, 136], bars: false, seed: 33 }, wing: { xFront: 0.02, xTip: -0.03, tailX: -0.05, tipA: 0.01, tipLift: 0.0, thTop: [0.6, 0.7], thBot: [0.0, 0.2], sz: -2.5, ns: 8, nt: 4 },
  tail: { len: 0.015, w: [0.008, 0.01], h: [0.006, 0.003], droop: 0.002, cup: 0.001, pos: [-0.055, 0.012, 0.2] },
  eye: { pos: [0.002, 0.004, 0.0165], R: 0.0048, EV: 0.0030, yaw: 0.25, ring: [0.0046, 0.0034], ringCol: [0.5, 0.5, 0.5] }, iris: ['#2a2a2a', '#3a3a3a', 70],
  bill: { pts: [[0.016, -0.006], [0.026, -0.008], [0.034, -0.011], [0.038, -0.013]], h: [0.0075, 0.0025], w: [0.006, 0.002], lowerFat: 1.1, base0: [0.72, 0.62, 0.62], base1: [0.72, 0.62, 0.62], tip: [0.3, 0.28, 0.3], tipAt: 0.85 },
  beak: flamingoBill, leg: { tib: [0.008, 0.0065], tar: [0.0062, 0.0055], ank: 0.0075, bareTib: true, toes: [[0.022, 0, 0.0035], [0.019, 0.5, 0.003], [0.019, -0.5, 0.003], [0.006, Math.PI, 0.0022]] },
  legColor: 0xc98f8a, legHip: V(0.0, -0.025, 0.02), L1: 0.04, L2: 0.042, headHeight: 0.15, bodyHeight: 0.085, bodyPitch: 0.1, footLift: 0.004, gaitDef: { footZ: 0.022, lift: 0.015, ahead: 0.02 },
};
CHICK.restPose = () => standPose(CHICK);

// ---------- poses (bird-root space, x forward) ----------
function standPose(spec, { tuck = null, hx = null, hy = null, pitch = -0.1, yaw = 0, roll = 0, bodyY = null, bodyPitch = null, sway = 0, t = 0 } = {}) {
  const fz = (spec.gaitDef || {}).footZ ?? 0.0135;
  return { body: { x: 0.004 * Math.sin(t * 0.7) * sway, y: (bodyY ?? spec.bodyHeight) + 0.004 * Math.sin(t * 1.3) * sway, pitch: bodyPitch ?? spec.bodyPitch, roll: 0.01 * Math.sin(t * 0.9) * sway, yaw: 0 },
    head: { x: hx ?? (spec === FLAMINGO ? 0.17 : 0.07), y: hy ?? spec.headHeight, z: 0, pitch, yaw, roll },
    feet: [{ x: 0.02, y: 0, z: -fz, curl: 0, tuck: tuck === 'L' }, { x: 0.02, y: 0, z: fz, curl: 0, tuck: tuck === 'R' }] };
}
// filter-feeding: legs bent, body tipped forward, the head upside down at the water, swinging side to side
function feedPose(t) { const P = standPose(FLAMINGO, { bodyY: 0.68, bodyPitch: -0.32 }); P.head = { x: 0.40 + 0.02 * Math.sin(t * 2.1), y: 0.03, z: 0.05 * Math.sin(t * 1.4), pitch: Math.PI - 0.6, yaw: 0.15 * Math.sin(t * 1.4), roll: 0 }; P.neckDir = V(1, -0.6, 0); P.neckTan = [0.9, 0.7]; P.feet[0].x = -0.02; P.feet[1].x = 0.05; return P; }
// preening: the head back at the base of the tail (the preen gland), then rubbing the neck and breast
function preenPose(t, phase) {
  const P = standPose(FLAMINGO, {}); const k = phase;
  const gland = { x: -0.17, y: 0.92, z: 0.07, pitch: -2.4, yaw: 0, roll: 0.6 }, breast = { x: 0.20, y: 0.86, z: 0.05, pitch: -1.9, yaw: 0, roll: 0.5 };
  const q = k < 0.5 ? smooth(0, 0.5, k) * 0 : smooth(0.5, 1, k), H = {};
  for (const key of ['x', 'y', 'z', 'pitch', 'yaw', 'roll']) H[key] = lerp(gland[key], breast[key], q);
  H.x += 0.012 * Math.sin(t * 9) * (1 - Math.abs(0.5 - k) * 1.2); H.y += 0.008 * Math.sin(t * 11); P.head = H; return P;
}

// ---------- the lagoon: a real sunrise sky over a salt pan, shallow water as a rippled mirror ----------
const RIPPLE_N = (() => { const [c, g] = mkCanvas(512, 512); g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512); const r = rng(5);
  for (let i = 0; i < 900; i++) { const x = r() * 512, y = r() * 512, rr = 6 + r() * 40, v = r() > 0.5 ? 255 : 0; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${v},${v},${v},0.10)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) g.fillRect(x - rr + ox, y - rr + oy, rr * 2, rr * 2); }
  return heightToNormal(c, 6); })();
const WaterShader = {
  name: 'LagoonWater',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tNorm: { value: RIPPLE_N }, time: { value: 0 }, dist: { value: 0.035 }, deep: { value: new THREE.Color(0.05, 0.04, 0.035) }, scale: { value: 0.35 }, refl: { value: 0.95 } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW; void main(){ vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform sampler2D tNorm; uniform float time; uniform float dist; uniform vec3 deep; uniform float scale; uniform float refl; varying vec4 vUv; varying vec3 vW;
    #include <common>
    void main(){ vec2 p = vW.xz * scale; vec3 n1 = texture2D(tNorm, p + vec2(time * 0.011, time * 0.007)).xyz * 2. - 1.; vec3 n2 = texture2D(tNorm, p * 2.3 - vec2(time * 0.009, -time * 0.013)).xyz * 2. - 1.; vec2 nn = (n1.xy + n2.xy) * 0.5;
      vec3 Vd = normalize(cameraPosition - vW); float fres = 0.04 + 0.96 * pow(1.0 - max(Vd.y, 0.0), 4.0);
      float d = length(cameraPosition.xz - vW.xz); vec4 uv = vUv; uv.xy += nn * dist * uv.w / (1.0 + d * 0.15); vec3 r = texture2DProj(tDiffuse, uv).rgb;
      vec3 c = mix(deep, r * color, clamp(fres * refl + 0.22, 0., 1.)); gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};
function hdrSun(hdr) { const im = hdr.tex.image, d = im.data, w = im.width, h = im.height; let best = -1, bi = 0; const toF = d instanceof Uint16Array ? THREE.DataUtils.fromHalfFloat : (x) => x;
  for (let y = 0; y < h / 2; y++) for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4; const L = toF(d[i]) * 0.3 + toF(d[i + 1]) * 0.59 + toF(d[i + 2]) * 0.11; if (L > best) { best = L; bi = y * w + x; } }
  const phi = ((bi % w + 0.5) / w - 0.5) * 2 * Math.PI, lat = (0.5 - (Math.floor(bi / w) + 0.5) / h) * Math.PI; return V(Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat)); }
const PAN_SUN = hdrSun(PAN);
function lagoon(sc, { sun = 2.2, env = 1.0, shadowBox = 1.2, tint = 0xd8c8c0 } = {}) {
  sc.environment = PAN.env; sc.environmentIntensity = env; sc.background = new THREE.Color(0x9fb3c8);
  const sky = new GroundProjectedSkybox(PAN.tex); sky.scale.setScalar(300); sky.height = 1.6; sky.radius = 300; sc.add(sky);
  const water = new Reflector(new THREE.PlaneGeometry(1200, 1200), { textureWidth: 540, textureHeight: 960, color: tint, shader: WaterShader, multisample: 0 }); water.rotation.x = -Math.PI / 2; water.position.y = 0; sc.add(water);
  const sunL = new THREE.DirectionalLight(0xffe2c2, sun); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
  Object.assign(sunL.shadow.camera, { left: -shadowBox, right: shadowBox, top: shadowBox, bottom: -shadowBox, near: 0.5, far: 30 }); sunL.shadow.bias = -0.0002; sunL.shadow.normalBias = 0.01; sunL.userData.soft = 0.06; sc.add(sunL, sunL.target);
  sunL.userData.aim = (c, d = 8) => { sunL.position.copy(c).addScaledVector(PAN_SUN, d); sunL.target.position.copy(c); sunL.target.updateMatrixWorld(); }; sunL.userData.aim(V(0, 0.5, 0));
  return { sky, water, sun: sunL, tick: (t) => { water.material.uniforms.time.value = t; } };
}
function flamingo(sc, { at = V(0, 0, 0), heading = 0, pink = 1, lod = null } = {}) {
  const b = makeBird(FLAMINGO, lod ? { lod } : {}); b.position.copy(at); b.rotation.y = heading; sc.add(b);
  const U = b.userData; [U.body.children].flat().forEach(o => { if (o.isMesh && o.material.map) satMat(o.material); });
  b.userData.setPink = (k, legK = null, billK = null) => { const kk = typeof k === 'function' ? 1 : k, sat = kk <= 1 ? kk : 2 - kk * 0.7 - 0.3;
    U.skin.userData.recolor(k); U.head.userData.bill.userData.recolor(Math.min(billK ?? kk, 1)); U.body.children.forEach(o => { if (o.material && o.material.userData.sat) o.material.userData.sat.value = clamp(sat, 0, 1); });
    const lk = legK ?? kk; U.legMat.color.setHex(0xe0707c); if (lk < 1) U.legMat.color.lerp(new THREE.Color(0x8d8784), 1 - lk); else U.legMat.color.lerp(new THREE.Color(0xe9c6c4), lk - 1); };
  if (pink !== 1) b.userData.setPink(pink);
  b.userData.pose = (P) => poseBird(b, P); return b;
}
function chick(sc, { at = V(0, 0, 0), heading = 0 } = {}) { const b = makeBird(CHICK); b.position.copy(at); b.rotation.y = heading; sc.add(b); b.add(fluff(b.userData.skin, { layers: 6, len: 0.007, rep: [10, 4], tint: 1.0 })); b.userData.pose = (P) => poseBird(b, P); return b; }

// ---------- brine shrimp: a translucent segmented body, 11 pairs of leafy legs beating in a wave, stalked eyes; pigment granules inside ----------
function brineShrimp(seed = 1) {
  const g = new THREE.Group(), r = rng(seed), L = 0.010;
  const bodyM = new THREE.MeshPhysicalMaterial({ color: 0xe8865a, roughness: 0.35, transmission: 0, transparent: true, opacity: 0.82, clearcoat: 0.6, sheen: 0.5, sheenColor: new THREE.Color(1, 0.7, 0.5), emissive: 0x3a1206, emissiveIntensity: 0.4 });
  const prof = []; for (let i = 0; i <= 24; i++) { const k = i / 24; prof.push(new THREE.Vector2(0.00105 * Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.05 + 0.04)), 0.6) * (1 - 0.6 * k) + 0.00018 + 0.00003 * Math.sin(k * 70), k * L)); }
  const bg = new THREE.LatheGeometry(prof, 18); bg.rotateZ(Math.PI / 2); const body = new THREE.Mesh(bg, bodyM); g.add(body); // along -x: head at x=0, tail at -L
  const legM = new THREE.MeshPhysicalMaterial({ color: 0xf2a070, roughness: 0.4, transparent: true, opacity: 0.65, side: THREE.DoubleSide, sheen: 0.6 });
  const legs = []; for (let i = 0; i < 11; i++) for (const sd of [-1, 1]) { const lg = new THREE.Mesh(new THREE.CircleGeometry(0.0009, 10), legM); lg.scale.set(0.5, 1, 1); const piv = new THREE.Group(); piv.position.set(-0.0016 - i * 0.00042, -0.0004, sd * 0.0004); piv.add(lg); lg.position.set(0, -0.0007, sd * 0.0003); g.add(piv); legs.push({ piv, i, sd }); }
  for (const sd of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.00018, 0.00022, 0.0012, 6), bodyM); st.rotation.x = sd * 1.1; st.position.set(0.0003, 0.0002, sd * 0.0006); g.add(st);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.00042, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0x080808, roughness: 0.2, clearcoat: 1 })); eye.position.set(0.0004, 0.0006, sd * 0.0011); g.add(eye); }
  for (const sd of [-1, 1]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.00008, 0.00016, 0.0016, 6), bodyM); f.rotation.z = Math.PI / 2 + sd * 0.4; f.rotation.y = sd * 0.3; f.position.set(-L - 0.0005, 0.0001, sd * 0.0003); g.add(f); }
  // the carotenoids: orange-red granules packed in the gut and tissues (they glow a little in close-up)
  const gm = new THREE.MeshStandardMaterial({ color: 0xff5a14, emissive: 0xff3a06, emissiveIntensity: 0.0, roughness: 0.4 }), gr = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), gm, 90), o = new THREE.Object3D();
  for (let i = 0; i < 90; i++) { const x = -r() * L * 0.85 - 0.0006; o.position.set(x, (r() - 0.5) * 0.0011 * (1 + x / L), (r() - 0.5) * 0.0011 * (1 + x / L)); o.scale.setScalar(0.00007 + r() * 0.00009); o.updateMatrix(); gr.setMatrixAt(i, o.matrix); }
  g.add(gr); g.userData = { legs, granules: gr, body, glow: (k) => { gm.emissiveIntensity = k * 2.2; bodyM.opacity = lerp(0.82, 0.5, k); } };
  g.userData.swim = (t) => { legs.forEach(({ piv, i, sd }) => { piv.rotation.z = 0.5 * Math.sin(t * 22 - i * 0.55); piv.rotation.x = sd * 0.15; }); body.rotation.x = 0.05 * Math.sin(t * 3); };
  return g;
}
// algae: single cells and short chains, green and red, drifting
function algae(sc, n = 300, box = [0.06, 0.04, 0.05], c0 = V(0, 0, 0), seed = 5) {
  const r = rng(seed), m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ roughness: 0.4, transparent: true, opacity: 0.85, sheen: 0.5 }), n), o = new THREE.Object3D(), P = [];
  const cols = [0x5f9a3a, 0x7fae4a, 0x3f7a2e, 0xb8502e, 0xd06a3a, 0x8aa84a];
  for (let i = 0; i < n; i++) { const p = V(c0.x + (r() - 0.5) * box[0], c0.y + (r() - 0.5) * box[1], c0.z + (r() - 0.5) * box[2]); P.push({ p, s: 0.00008 + r() * 0.00022, ph: r() * 6, sp: 0.3 + r() }); m.setColorAt(i, new THREE.Color(cols[Math.floor(r() * cols.length)])); }
  sc.add(m); m.userData.tick = (t) => { P.forEach((q, i) => { o.position.copy(q.p).add(V(Math.sin(t * 0.3 * q.sp + q.ph) * 0.0015, Math.sin(t * 0.21 * q.sp + q.ph * 2) * 0.001 + t * 0.0004, 0)); o.scale.setScalar(q.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.instanceMatrix.needsUpdate = true; };
  m.userData.tick(0); return m;
}
function underwater(sc) { sc.background = new THREE.Color(0x2a3a2c); sc.fog = new THREE.FogExp2(0x2c3e2e, 18); sc.environment = PAN.env; sc.environmentIntensity = 0.35;
  const key = new THREE.DirectionalLight(0xffe8c0, 2.4); key.position.set(0.3, 1, 0.2); sc.add(key); const back = new THREE.DirectionalLight(0xffb070, 1.6); back.position.set(-0.4, 0.3, -1); sc.add(back);
  const rays = new THREE.Group(); const rm = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.008, 0.12, 12, 1, true), rm); c.position.set(-0.04 + i * 0.013, 0.02, -0.03 - (i % 3) * 0.01); c.rotation.z = 0.25; c.userData.noDof = true; rays.add(c); } sc.add(rays); return { rays }; }

// ---------- carrots (procedural) and a pink feather on a real cutting board ----------
const CARROT_T = (() => { const [c, g] = mkCanvas(256, 512); const r = rng(2); g.fillStyle = '#e8741c'; g.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 6 + r() * 12) { g.fillStyle = `rgba(150,60,10,${0.15 + r() * 0.25})`; g.fillRect(0, y, 256, 1 + r() * 2); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,170,90,${r() * 0.15})`; g.fillRect(r() * 256, r() * 512, 2 + r() * 30, 1); } return texOf(c); })();
const CARROT_N = (() => { const [c, g] = mkCanvas(256, 512); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 512); const r = rng(3); for (let y = 0; y < 512; y += 5 + r() * 14) { g.fillStyle = '#3a3a3a'; g.fillRect(0, y, 256, 2); g.fillStyle = '#b0b0b0'; g.fillRect(0, y + 2, 256, 3); } return heightToNormal(c, 3); })();
function carrot(len = 0.17, r0 = 0.017, seed = 1) {
  const g = new THREE.Group(), rr = rng(seed), prof = []; for (let i = 0; i <= 40; i++) { const k = i / 40; prof.push(new THREE.Vector2(Math.max(0.0006, r0 * Math.pow(1 - k, 0.75) * (1 + 0.04 * Math.sin(k * 40 + seed))), k * len)); }
  const geo = new THREE.LatheGeometry(prof, 28); geo.rotateZ(-Math.PI / 2); const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: CARROT_T, normalMap: CARROT_N, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.55, clearcoat: 0.15, sheen: 0.3, sheenColor: new THREE.Color(1, 0.6, 0.3) })); m.castShadow = m.receiveShadow = true; g.add(m);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r0 * 0.55, r0 * 0.7, 0.004, 20), new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.8 })); top.rotation.z = Math.PI / 2; top.position.x = -0.001; g.add(top);
  const stemM = new THREE.MeshStandardMaterial({ color: 0x4f7a2a, roughness: 0.6 }); for (let i = 0; i < 5; i++) { const st = cyl(0.0016, 0.0012, stemM, 8); st.rotation.z = Math.PI / 2 + (rr() - 0.5) * 0.6; st.rotation.x = (rr() - 0.5) * 0.8; st.scale.y = 0.02 + rr() * 0.015; st.position.x = 0.0; g.add(st); }
  return g;
}
const PFEATHER = (() => { const [c, g] = mkCanvas(256, 1024); g.clearRect(0, 0, 256, 1024); const r = rng(6);
  for (let y = 60; y < 1000; y += 2) { const k = y / 1024, w = 110 * Math.sin(Math.PI * Math.min(1, (1 - k) * 1.15)) * (0.75 + 0.25 * k); const a = 0.55 + r() * 0.4; g.strokeStyle = `rgba(${235 + r() * 20},${100 + k * 70 + r() * 20},${110 + k * 60},${a})`; g.lineWidth = 1.4;
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + sd * w * 0.6, y - 18, 128 + sd * w, y - 34 - r() * 10); g.stroke(); } }
  g.strokeStyle = '#f7d8d4'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 1020); g.lineTo(128, 40); g.stroke(); return texOf(c); })();
function pinkFeather() { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.2, 1, 8), new THREE.MeshStandardMaterial({ map: PFEATHER, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.8 })); m.userData.dofMap = PFEATHER; m.castShadow = true; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.004 * Math.sin(p.getY(i) * 12)); m.geometry.computeVertexNormals(); return m; }
function kitchen(sc) { sc.environment = STUDIO.env; sc.environmentIntensity = 0.7; sc.background = new THREE.Color(0x1c1814);
  const tab = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), pbrMat(TX.concrete, { rep: [6, 6], color: 0x8a8278 })); tab.rotation.x = -Math.PI / 2; tab.receiveShadow = true; sc.add(tab);
  const key = new THREE.DirectionalLight(0xfff0e0, 2.6); key.position.set(-0.5, 0.9, 0.4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -0.4, right: 0.4, top: 0.4, bottom: -0.4, near: 0.1, far: 3 }); key.shadow.bias = -0.0003; key.userData.soft = 0.05; sc.add(key);
  const board = model('wooden_cutting_board'); sc.add(board); return { board, key }; }

// ---------- the nest: a mud mound ----------
function nestMound(sc, at = V(0, 0, 0)) { const g = new THREE.LatheGeometry([[0.0, 0.09], [0.12, 0.085], [0.17, 0.07], [0.26, 0.02], [0.34, -0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); p.setY(i, y + 0.006 * Math.sin(x * 50) * Math.cos(z * 43)); } g.computeVertexNormals();
  const m = new THREE.Mesh(g, pbrMat(TX.mud, { rep: [3, 3], color: 0xffffff, normal: 1.6, envMapIntensity: 1.4 })); m.position.copy(at); m.scale.set(1.3, 1.0, 1.3); m.receiveShadow = m.castShadow = true; sc.add(m); return m; }

// ---------- zoo feeding: pink pellets pour from a scoop into the pond ----------
function pellets(sc, n = 160, from = V(0, 0.4, 0), seed = 4) { const r = rng(seed), m = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1.6, 10), new THREE.MeshPhysicalMaterial({ roughness: 0.75, color: 0xd9776a }), n), o = new THREE.Object3D(), P = [];
  for (let i = 0; i < n; i++) { P.push({ t0: r() * 1.6, v: V((r() - 0.5) * 0.25, -0.1 - r() * 0.2, 0.2 + (r() - 0.5) * 0.25), s: 0.0065 + r() * 0.002, rot: V(r() * 6, r() * 6, r() * 6), land: V((r() - 0.5) * 0.25, 0, 0.12 + r() * 0.3) }); m.setColorAt(i, new THREE.Color().setHSL(0.02 + r() * 0.03, 0.55, 0.5 + r() * 0.1)); }
  m.castShadow = true; sc.add(m);
  m.userData.tick = (tt) => { P.forEach((q, i) => { const a = tt - q.t0; if (a < 0) { o.position.set(0, -10, 0); } else { const fall = from.clone().add(q.v.clone().multiplyScalar(a)).add(V(0, -4.9 * a * a, 0)); if (fall.y < 0.002) { const land = from.clone().add(q.v.clone().multiplyScalar(Math.sqrt(from.y / 4.9))); land.y = 0.002 + 0.001 * Math.sin(tt * 3 + i); fall.copy(land); } o.position.copy(fall); }
      o.rotation.set(q.rot.x + tt * 3, q.rot.y, q.rot.z + tt * 2); o.scale.set(q.s, q.s, q.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.instanceMatrix.needsUpdate = true; };
  return m; }
// a liveLabel (canvas text plane) for on-screen words
function liveLabel(w = 0.5, aspect = 0.28) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * aspect); const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * aspect), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  m.renderOrder = 20; m.userData.noDof = true; let last = null;
  m.userData.set = (lines) => { const key = JSON.stringify(lines); if (key === last) return; last = key; g.clearRect(0, 0, c.width, c.height);
    for (const [txt, size, y, col, wt, passes] of lines) { g.font = `${wt || 800} ${size}px "Nunito", "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 18; g.fillStyle = col || '#ffffff'; for (let i = 0; i < (passes || 1); i++) g.fillText(txt, c.width / 2, y * c.height); }
    tex.needsUpdate = true; };
  return m;
}
