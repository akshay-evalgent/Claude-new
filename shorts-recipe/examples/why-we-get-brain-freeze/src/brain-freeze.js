// "Why We Get Brain Freeze" — procedural 3D short, rendered frame by frame.
// Every update is a pure function of the global time t, so frames can render in any order.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 1080, H = 1920, ASPECT = W / H;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------- cue times (seconds) from the voiceover word timings ----------
const C = {
  slurp: 0.28, icy: 0.92, fast: 1.56, a: 2.28, stabbing: 2.38, pain: 2.76, shoots: 3.2, into: 3.88, forehead: 4.26, yousee: 5.18, cold: 5.84, tiny: 6.66,
  vessels: 7.32, roof: 8.08, mouth: 8.52, clamp: 8.82, shut: 9.14, then: 9.84, flood: 10.46, wide: 10.8, open: 11.2, rush: 11.82, warm: 12.04, blood: 12.5,
  back: 12.74, that: 13.8, swelling: 14.08, nerve: 15.4, covers: 16.28, forehead2: 16.86, so: 17.3, brain: 17.8, blames: 18.12, wrong: 18.74, spot: 18.96,
  the: 19.88, fix: 20.46, pressing: 21.16, tongue: 21.74, roof2: 22.72, warm2: 23.76, up: 24.34, and: 24.72, study: 25.6, kids: 26.38, wolfed: 26.78,
  icecream: 27.5, got: 28.14, freeze: 28.78, twice: 29.18, often: 29.86, kids2: 30.44, ate: 30.96, slowly: 31.18, because: 31.74, end: 32.45,
};

// ---------- small math helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const E = {
  io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  out: x => 1 - Math.pow(1 - x, 3),
  in: x => x * x * x,
  expo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lv = (a, b, k) => new THREE.Vector3().lerpVectors(a, b, k);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function h3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c = (a, b, d) => h3(xi + a, yi + b, zi + d);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), u), x10 = lerp(c(0, 1, 0), c(1, 1, 0), u);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), u), x11 = lerp(c(0, 1, 1), c(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w) * 2 - 1;
}
function setCam(cam, pos, target, rollDeg = 0, fov) {
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(target); cam.rotateZ(THREE.MathUtils.degToRad(rollDeg));
}
const drift = (t, a = 1.6, f = 0.55) => Math.sin(t * f * 2 * Math.PI * 0.5) * a;

// ---------- backgrounds ----------
function gradTex(stops, cx = 0.5, cy = 0.4) {
  const c = document.createElement('canvas'); c.width = 540; c.height = 960;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(540 * cx, 960 * cy, 0, 540 * cx, 960 * cy, 820);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 540, 960);
  // faint grain so the gradient does not band after encoding
  const im = g.getImageData(0, 0, 540, 960), r = rng(7);
  for (let i = 0; i < im.data.length; i += 4) { const n = (r() - 0.5) * 5; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const BG = {
  cyan: gradTex([[0, '#eafbff'], [0.2, '#86dcf5'], [0.5, '#16b2e3'], [1, '#05709f']]),
  xray: gradTex([[0, '#2a5fa8'], [0.35, '#12305f'], [0.75, '#081631'], [1, '#040a18']], 0.5, 0.45),
  storm: gradTex([[0, '#e8f6fb'], [0.3, '#9fd3e6'], [0.7, '#4d97b8'], [1, '#2b6787']], 0.5, 0.3),
};

// ---------- materials ----------
const M = {
  skin: () => new THREE.MeshPhysicalMaterial({ color: 0xe8916c, roughness: 0.42, sheen: 0.5, sheenColor: new THREE.Color(0xffcfbd), sheenRoughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.28 }),
  nail: new THREE.MeshPhysicalMaterial({ color: 0xf7d3cb, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
  water: new THREE.MeshPhysicalMaterial({ color: 0x9fe6fb, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.62, envMapIntensity: 1.8 }),
  pool: new THREE.MeshPhysicalMaterial({ color: 0x4cc6ec, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.92, envMapIntensity: 1.4 }),
  porcelain: new THREE.MeshPhysicalMaterial({ color: 0xf6fbfc, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.1 }),
  duck: new THREE.MeshPhysicalMaterial({ color: 0xffc81a, roughness: 0.3, clearcoat: 0.8 }),
  beak: new THREE.MeshPhysicalMaterial({ color: 0xff7a1a, roughness: 0.35, clearcoat: 0.6 }),
  black: new THREE.MeshPhysicalMaterial({ color: 0x14181c, roughness: 0.35, clearcoat: 0.4 }),
  rubber: new THREE.MeshPhysicalMaterial({ color: 0x1d2126, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
  chrome: new THREE.MeshPhysicalMaterial({ color: 0xdfe6ea, roughness: 0.18, metalness: 1 }),
  foam: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, transparent: true, opacity: 0.9 }),
};
const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

function xrayMat(rim = new THREE.Color(0.55, 0.85, 1.0), inner = new THREE.Color(0.05, 0.2, 0.5), power = 2.2, intensity = 1.2) {
  return new THREE.ShaderMaterial({
    uniforms: { rim: { value: rim }, inner: { value: inner }, power: { value: power }, intensity: { value: intensity }, fade: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 rim; uniform vec3 inner; uniform float power; uniform float intensity; uniform float fade; varying vec3 vN; varying vec3 vV;
      void main(){ float f=pow(max(0.,1.-abs(dot(normalize(vN),normalize(vV)))),power); vec3 c=mix(inner,rim,f)*intensity; gl_FragColor=vec4(c*fade, (0.15+0.85*f)*fade); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}
function pulseTubeMat(base, hot) {
  return new THREE.ShaderMaterial({
    uniforms: { base: { value: new THREE.Color(base) }, hot: { value: new THREE.Color(hot) }, p: { value: -1 }, k: { value: 0.6 }, fade: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 base; uniform vec3 hot; uniform float p; uniform float k; uniform float fade; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float g=exp(-pow((vUv.x-p)/0.05,2.)); float rimf=pow(1.-abs(dot(vN,vV)),1.5); vec3 c=base*(k+0.6*rimf)+hot*g*2.5; gl_FragColor=vec4(c*fade,1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
}

// ---------- studio ----------
function studio(scene, { bg = 'cyan', ground = 0, shadow = 0.2, key = 2.4, keyPos = V(3.5, 6, 4.5), area = 5 } = {}) {
  scene.background = BG[bg]; scene.environment = ENV;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6fd0ea, 0.55));
  const k = new THREE.DirectionalLight(0xffffff, key); k.position.copy(keyPos); k.castShadow = true;
  k.shadow.mapSize.set(2048, 2048); k.shadow.radius = 6; k.shadow.bias = -0.0004; k.shadow.normalBias = 0.02;
  Object.assign(k.shadow.camera, { left: -area, right: area, top: area, bottom: -area, near: 0.5, far: 40 });
  scene.add(k); scene.add(k.target);
  const rim = new THREE.DirectionalLight(0xd9f6ff, 1.3); rim.position.set(-4, 3, -5); scene.add(rim);
  if (ground !== null) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: shadow }));
    g.rotation.x = -Math.PI / 2; g.position.y = ground; g.receiveShadow = true; scene.add(g);
  }
  return k;
}

// ---------- fingertip with animatable wrinkles ----------
// Lathe around +Y, base at y=0, tip at y=L. Pad faces +Z, nail on -Z.
function makeTip({ r = 0.2, L = 0.62, radial = 128, rings = 110, K = 7, amp = 0.1, pattern = 'prune', seed = 1, mat }) {
  const pts = []; const ny = Math.floor(rings * 0.55), nc = rings - ny, rt = r * 0.97;
  for (let i = 0; i <= ny; i++) { const y = (L - rt) * i / ny; pts.push(new THREE.Vector2(r * (1 - 0.03 * i / ny), y)); }
  for (let i = 1; i <= nc; i++) { const a = (Math.PI / 2) * i / nc; pts.push(new THREE.Vector2(Math.max(rt * Math.cos(a), 1e-4), (L - rt) + rt * Math.sin(a))); }
  const g = new THREE.LatheGeometry(pts, radial);
  g.computeVertexNormals();
  const pos = g.attributes.position, n = pos.count;
  const base = Float32Array.from(pos.array), nrm = Float32Array.from(g.attributes.normal.array);
  const field = new Float32Array(n), o = seed * 13.1;
  for (let i = 0; i < n; i++) {
    const x = base[3 * i], y = base[3 * i + 1], z = base[3 * i + 2];
    const rr = Math.hypot(x, z) || 1e-6, th = Math.atan2(x, z), c = z / rr, yn = y / r;
    let f = 0;
    if (pattern === 'prune') {
      const w1 = noise3(x / r * 1.4 + o, yn * 0.9, z / r * 1.4);
      const s = Math.sin(K * th + 2.4 * w1 + 0.7 * Math.sin(yn * 1.3));
      const g1 = Math.exp(-(s * s) / 0.07);
      const s2 = Math.sin(yn * 4.2 + 3.2 * noise3(x / r + 5 + o, yn * 0.8, z / r + 5));
      const g2 = Math.exp(-(s2 * s2) / 0.05) * 0.45 * (0.5 + 0.5 * noise3(x / r * 2, yn * 2, z / r * 2 + o));
      const mY = smooth(L - 2.7 * r, L - 1.5 * r, y) * (1 - smooth(L - 0.06 * r, L + 0.001, y));
      const mS = smooth(-0.55, 0.25, c);
      f = (-(Math.max(g1, g2)) + 0.22) * mY * mS;
    } else { // 'tread': chevron grooves like a rain tyre
      const u = th * r, v = y;
      const chev = (v * 6.5 / r + Math.abs(u / r) * 3.2) % 1;
      const gC = Math.exp(-Math.pow(Math.min(chev, 1 - chev) / 0.07, 2));
      const gM = Math.exp(-Math.pow(u / (0.07 * r), 2));
      const mY = smooth(L - 2.6 * r, L - 1.6 * r, y) * (1 - smooth(L - 0.25 * r, L - 0.02 * r, y));
      const mS = smooth(0.05, 0.55, c);
      f = (-Math.max(gC, gM) + 0.15) * mY * mS;
    }
    field[i] = f;
  }
  const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.receiveShadow = true;
  let cur = -1;
  mesh.userData.setW = (w) => {
    w = Math.round(w * 200) / 200; if (w === cur) return; cur = w;
    const a = pos.array, d = amp * r * w;
    for (let i = 0; i < n; i++) { const k = field[i] * d; a[3 * i] = base[3 * i] + nrm[3 * i] * k; a[3 * i + 1] = base[3 * i + 1] + nrm[3 * i + 1] * k; a[3 * i + 2] = base[3 * i + 2] + nrm[3 * i + 2] * k; }
    pos.needsUpdate = true; g.computeVertexNormals();
  };
  mesh.userData.setW(0);
  const grp = new THREE.Group(); grp.add(mesh);
  const nail = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), M.nail);
  nail.scale.set(r * 0.74, (L - 0.3 * r) * 0.5, r * 0.16); nail.position.set(0, L - 0.62 * r - (L - 0.3 * r) * 0.18, -r * 0.92); nail.rotation.x = -0.12; nail.castShadow = true;
  grp.add(nail);
  grp.userData = { mesh, setW: mesh.userData.setW, r, L };
  return grp;
}

function capsule(r, len, mat, seg = 32) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 12, seg), mat); m.position.y = len / 2; m.castShadow = true; m.receiveShadow = true; return m;
}

// finger = knuckle group -> proximal -> middle -> tip
function makeFinger({ r, lens, curls = [0, 0, 0], mat, tipOpts = {} }) {
  const g1 = new THREE.Group(); g1.rotation.x = curls[0]; g1.add(capsule(r, lens[0], mat));
  const g2 = new THREE.Group(); g2.position.y = lens[0]; g2.rotation.x = curls[1]; g2.add(capsule(r * 0.97, lens[1], mat)); g1.add(g2);
  const g3 = new THREE.Group(); g3.position.y = lens[1]; g3.rotation.x = curls[2]; g2.add(g3);
  const tip = makeTip({ r: r * 0.95, L: lens[2], mat, ...tipOpts }); g3.add(tip);
  const root = new THREE.Group(); root.add(g1); root.scale.z = 0.9;
  root.userData = { tip, g1, g2, g3 };
  return root;
}

// open hand: wrist at origin, fingers along +Y, palm faces +Z
function makeHand({ mat = M.skin(), curls = null, thumb = null, heroRadial = 256, forearm = 2.6, wrinkleOpts = {} } = {}) {
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new RoundedBoxGeometry(1.8, 2.0, 0.66, 6, 0.3), mat); palm.position.y = 1.0; palm.castShadow = palm.receiveShadow = true; hand.add(palm);
  if (forearm > 0) {
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.68, forearm, 40), mat); fa.position.y = 0.25 - forearm / 2; fa.castShadow = true; hand.add(fa);
  }
  const defs = [
    { x: -0.64, r: 0.215, lens: [0.86, 0.55, 0.64], hero: true },
    { x: -0.21, r: 0.22, lens: [0.95, 0.6, 0.66] },
    { x: 0.22, r: 0.21, lens: [0.88, 0.56, 0.63] },
    { x: 0.63, r: 0.185, lens: [0.68, 0.43, 0.54] },
  ];
  const fingers = defs.map((d, i) => {
    const f = makeFinger({ r: d.r, lens: d.lens, curls: curls ? curls[i] : [0.04 * i, 0.06, 0.04], mat,
      tipOpts: { radial: d.hero ? heroRadial : 112, rings: d.hero ? 170 : 90, seed: i + 1, ...wrinkleOpts } });
    f.position.set(d.x, 1.86, 0); f.rotation.z = (d.x) * -0.09; hand.add(f); return f;
  });
  const th = thumb || { pos: V(-0.86, 0.55, 0.22), rot: new THREE.Euler(0.25, -0.35, 0.5), curls: [0.12, 0.18, 0.1] };
  const tf = makeFinger({ r: 0.24, lens: [0.7, 0.52, 0.62], curls: th.curls, mat, tipOpts: { radial: 160, rings: 120, seed: 9, ...(th.tipOpts || wrinkleOpts) } });
  tf.position.copy(th.pos); tf.rotation.copy(th.rot); hand.add(tf);
  hand.userData = { fingers, thumb: tf, palm, setW: (w) => { fingers.forEach(f => f.userData.tip.userData.setW(w)); tf.userData.tip.userData.setW(w); } };
  return hand;
}
const worldOf = (obj, local) => obj.localToWorld(local.clone());

// ---------- deterministic droplets ----------
function dropMesh(r = 0.05, mat = M.water) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat); m.castShadow = false; return m; }
function rippleRing(mat) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 64), mat || new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; return m;
}

// =====================================================================
// CAT BUILDER
// =====================================================================
function furTex(base, stripe, seed = 1, stripes = true) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 1024, 512); const r = rng(seed);
  if (stripes) {
    g.strokeStyle = stripe; g.lineCap = 'round';
    for (let i = 0; i < 15; i++) {
      const v = 30 + i * 31 + r() * 8; g.lineWidth = 9 + r() * 12; g.globalAlpha = 0.6; g.beginPath();
      for (let x = 0; x <= 1024; x += 8) { const y = v + Math.sin(x / 1024 * Math.PI * 8 + i * 1.7) * 9 + Math.sin(x / 70 + i) * 3; x === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  const im = g.getImageData(0, 0, 1024, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 1024; x++) { const i = (y * 1024 + x) * 4; const n = (r() - 0.5) * 22 + Math.sin(x * 0.9 + y * 0.15) * 4; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
const FUR_BUMP = (() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  const r = rng(99); for (let i = 0; i < 9000; i++) { const x = r() * 512, y = r() * 512, l = 4 + r() * 8; g.strokeStyle = r() < 0.5 ? '#9a9a9a' : '#666'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y + l); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); return t;
})();
function furMat(base, stripe, seed, stripes = true) {
  return new THREE.MeshPhysicalMaterial({ map: furTex(base, stripe, seed, stripes), bumpMap: FUR_BUMP, bumpScale: 1.2, roughness: 0.78, sheen: 1, sheenColor: new THREE.Color(base).lerp(new THREE.Color(0xffffff), 0.45), sheenRoughness: 0.45 });
}
function eyeTex(iris = '#9bd14a', big = false) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#2c2f1a'; g.fillRect(0, 0, 512, 256);
  const gr = g.createRadialGradient(128, 128, 4, 128, 128, 74); gr.addColorStop(0, '#f6ff9a'); gr.addColorStop(0.45, iris); gr.addColorStop(1, '#3d5a12');
  g.fillStyle = gr; g.beginPath(); g.ellipse(128, 128, 74, 74, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#060606'; g.beginPath(); big ? g.ellipse(128, 128, 46, 50, 0, 0, Math.PI * 2) : g.ellipse(128, 128, 9, 58, 0, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const EYE_N = eyeTex(), EYE_BIG = eyeTex('#9bd14a', true);
const WHITE_FUR = () => furMat('#fbf1e4', '#e7d8c6', 5, false);
const PINK = new THREE.MeshPhysicalMaterial({ color: 0xf2879a, roughness: 0.35, clearcoat: 0.6 });
const DARK = new THREE.MeshPhysicalMaterial({ color: 0x2a1a17, roughness: 0.5 });

function makeCat({ pose = 'sit', base = '#e58a3a', stripe = '#a24e18', seed = 1, stripes = true, override = null } = {}) {
  const fur = override || furMat(base, stripe, seed, stripes), white = override || WHITE_FUR();
  const pink = override || PINK, dark = override || DARK, eyeM = override || new THREE.MeshPhysicalMaterial({ map: EYE_N, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 });
  const cat = new THREE.Group(), add = (m, p, parent = cat) => { m.castShadow = true; m.receiveShadow = true; if (p) m.position.copy(p); parent.add(m); return m; };
  const sph = (r, mat, seg = 40) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.66)), mat);
  // ---- body
  let headPos;
  if (pose === 'sit') {
    const torso = add(sph(1, fur, 56), V(0, 0.9, -0.18)); torso.scale.set(0.6, 0.86, 0.68);
    add(sph(0.36, white), V(0, 1.02, 0.22)).scale.set(1, 1.25, 0.8);
    [-1, 1].forEach(sx => {
      add(sph(0.4, fur), V(sx * 0.33, 0.42, -0.3)).scale.set(0.9, 1, 1.15);
      const leg = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.62, 8, 20), white), V(sx * 0.17, 0.42, 0.25));
      add(sph(0.13, white), V(sx * 0.17, 0.07, 0.34)).scale.set(1, 0.6, 1.3);
      add(sph(0.14, white), V(sx * 0.4, 0.07, 0.02)).scale.set(1, 0.6, 1.6);
    });
    const tc = new THREE.CatmullRomCurve3([V(0.15, 0.15, -0.75), V(0.6, 0.09, -0.45), V(0.78, 0.08, 0.1), V(0.55, 0.08, 0.5), V(0.28, 0.08, 0.62)]);
    add(new THREE.Mesh(new THREE.TubeGeometry(tc, 60, 0.09, 14), fur));
    add(sph(0.09, fur, 20), V(0.28, 0.08, 0.62));
    headPos = V(0, 1.84, 0.1);
  } else { // loaf
    const torsoG = new THREE.SphereGeometry(1, 56, 36); torsoG.rotateX(Math.PI / 2);
    const torso = add(new THREE.Mesh(torsoG, fur), V(0, 0.55, -0.5)); torso.scale.set(0.74, 0.56, 1.15);
    add(sph(0.38, white), V(0, 0.55, 0.38)).scale.set(1, 1, 0.9);
    [-1, 1].forEach(sx => add(sph(0.14, white), V(sx * 0.2, 0.12, 0.66)).scale.set(1, 0.65, 1.5));
    const tc = new THREE.CatmullRomCurve3([V(0.4, 0.15, -1.45), V(0.78, 0.11, -0.7), V(0.76, 0.1, 0.1), V(0.48, 0.1, 0.58)]);
    add(new THREE.Mesh(new THREE.TubeGeometry(tc, 60, 0.1, 14), fur)); add(sph(0.1, fur, 20), V(0.48, 0.1, 0.58));
    headPos = V(0, 1.06, 0.5);
  }
  // ---- head
  const head = new THREE.Group(); head.position.copy(headPos); cat.add(head);
  const skullG = new THREE.SphereGeometry(0.55, 56, 40); const skull = add(new THREE.Mesh(skullG, fur), null, head); skull.scale.set(1.15, 0.95, 1.0);
  [-1, 1].forEach(sx => add(sph(0.2, white), V(sx * 0.13, -0.16, 0.42), head).scale.set(1, 0.85, 0.9));
  const chin = add(sph(0.12, white), V(0, -0.3, 0.38), head);
  const mouth = new THREE.Group(); mouth.position.set(0, -0.27, 0.43); head.add(mouth);
  const cav = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), override || new THREE.MeshPhysicalMaterial({ color: 0x4a0f18, roughness: 0.5 })); mouth.add(cav);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), override || PINK); mouth.add(tongue);
  const fangM = override || new THREE.MeshPhysicalMaterial({ color: 0xfffbf2, roughness: 0.3, clearcoat: 0.6 });
  const fangs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 12), fangM); f.userData = { sx, sy }; mouth.add(f); return f; });
  add(sph(1, pink, 24), V(0, -0.05, 0.57), head).scale.set(0.075, 0.05, 0.05);
  [-1, 1].forEach(sx => { const m = add(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 8, 20, Math.PI), dark), V(sx * 0.055, -0.13, 0.575), head); m.rotation.z = Math.PI; });
  const eyes = [], lids = [], ears = [];
  [-1, 1].forEach(sx => {
    const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 40, 24), eyeM), V(sx * 0.22, 0.08, 0.42), head); e.rotation.y = sx * 0.18; eyes.push(e);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(sx * 0.22 - 0.035, 0.13, 0.535); head.add(glint);
    const lid = add(new THREE.Mesh(new THREE.SphereGeometry(0.138, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), fur), V(sx * 0.22, 0.08, 0.42), head); lids.push(lid); lid.userData.glint = glint;
    const ear = new THREE.Group(); ear.position.set(sx * 0.34, 0.38, -0.06); ear.rotation.z = -sx * 0.38; head.add(ear);
    const eo = add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.44, 32), fur), V(0, 0.2, 0), ear); eo.scale.z = 0.5;
    const ei = add(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 32), pink), V(0, 0.15, 0.045), ear); ei.scale.z = 0.35;
    ears.push(ear);
    for (let k = 0; k < 3; k++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.6, 6), override || new THREE.MeshBasicMaterial({ color: 0xffffff })); w.rotation.z = sx * (Math.PI / 2 + (k - 1) * 0.16); w.position.set(sx * 0.48, -0.16 - k * 0.025, 0.47); head.add(w); }
  });
  let eyeBig = false;
  const api = {
    head, eyes, lids, ears, headPos,
    setLid(k) { lids.forEach(l => { l.rotation.x = lerp(-0.75, 1.5, k); l.userData.glint.visible = k < 0.6; }); },
    setEars(back) { ears.forEach((e, i) => { const sx = i ? 1 : -1; e.rotation.set(-0.7 * back, 0, -sx * (0.38 + 1.0 * back)); }); },
    setPupil(big) { if (override || big === eyeBig) return; eyeBig = big; eyes.forEach(e => { e.material = e.material.clone(); e.material.map = big ? EYE_BIG : EYE_N; e.material.needsUpdate = true; }); },
    setMouth(o) { const on = o > 0.02; mouth.visible = on; chin.position.y = -0.3 - 0.13 * o; if (!on) return; const hgt = 0.02 + 0.15 * o; cav.scale.set(0.13 + 0.03 * o, hgt, 0.07); cav.position.set(0, -hgt * 0.45, 0.02); tongue.scale.set(0.09, 0.03, 0.06); tongue.position.set(0, -hgt * 0.85, 0.04); fangs.forEach(f => { const { sx, sy } = f.userData; f.position.set(sx * 0.075, sy > 0 ? 0.02 : -hgt * 0.9 - 0.0, 0.07); f.rotation.z = sy > 0 ? Math.PI : 0; f.visible = o > 0.15; }); },
    purr(t, amt = 1) { const j = 1 + 0.008 * amt * Math.sin(t * 2 * Math.PI * 9.7); cat.scale.set(cat.userData.s * j, cat.userData.s * (2 - j), cat.userData.s * j); },
  };
  cat.userData = { ...api, s: 1 };
  api.setLid(0.15); api.setEars(0); api.setMouth(0);
  return cat;
}
function purrRings(scene, n = 3, color = 0xffffff) {
  const rings = []; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 8, 80), glow(color, 0.7)); scene.add(m); rings.push(m); }
  return (t, pos, on = 1, size = 1, facing = null) => rings.forEach((m, i) => {
    const a = ((t * 1.6 + i / n) % 1); m.position.copy(pos); m.scale.setScalar(size * (0.3 + a * 1.1)); m.material.opacity = on * 0.75 * (1 - a) * (a > 0.03 ? 1 : 0);
    if (facing) m.lookAt(facing);
  });
}
function textPlane(text, w = 2.2, color = '#ff4fa3', stroke = '#ffffff') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
  let fs = 150; g.font = `900 ${fs}px "Arial Black", Arial, sans-serif`; while (g.measureText(text).width > 930 && fs > 40) { fs -= 6; g.font = `900 ${fs}px "Arial Black", Arial, sans-serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 22; g.strokeStyle = stroke; g.strokeText(text, 512, 132); g.fillStyle = color; g.fillText(text, 512, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
}
const shake = (t, a) => V(Math.sin(t * 61) * a, Math.sin(t * 47 + 1) * a, 0);

// =====================================================================
// PERSON BUILDER (stylised toy-like character with a working yawn)
// =====================================================================
function humanEyeTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 512, 256);
  const gr = g.createRadialGradient(128, 128, 6, 128, 128, 44); gr.addColorStop(0, '#8a5a2c'); gr.addColorStop(0.7, '#5a3412'); gr.addColorStop(1, '#2a1606');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 44, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#080808'; g.beginPath(); g.arc(128, 128, 18, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const HEYE = humanEyeTex();
function yawnCurve(t, t0, dur) { const a = (t - t0) / dur; if (a <= 0 || a >= 1) return 0; return a < 0.3 ? E.io(a / 0.3) : a > 0.78 ? E.io((1 - a) / 0.22) : 1; }

function makePerson({ shirt = 0x2bb3a3, pants = 0x2f3d5c, hair = 0x3a2416, skinCol = 0xe9a07c, override = null, legs = true } = {}) {
  const skin = override || new THREE.MeshPhysicalMaterial({ color: skinCol, roughness: 0.45, sheen: 0.5, sheenColor: new THREE.Color(0xffd2c0), clearcoat: 0.15 });
  const shirtM = override || new THREE.MeshPhysicalMaterial({ color: shirt, roughness: 0.75, sheen: 0.6 });
  const pantsM = override || new THREE.MeshPhysicalMaterial({ color: pants, roughness: 0.8 });
  const hairM = override || new THREE.MeshPhysicalMaterial({ color: hair, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0x8a5a3a) });
  const darkM = override || new THREE.MeshPhysicalMaterial({ color: 0x2a1a14, roughness: 0.5 });
  const p = new THREE.Group(), add = (m, pos, parent = p) => { m.castShadow = true; m.receiveShadow = true; if (pos) m.position.copy(pos); parent.add(m); return m; };
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.75, 12, 40), shirtM), V(0, 1.85, 0)); torso.scale.set(1.05, 1, 0.72);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.3, 24), skin), V(0, 2.5, 0));
  if (legs) [-1, 1].forEach(sx => { add(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 1.0, 8, 24), pantsM), V(sx * 0.2, 0.75, 0)); add(new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.16, 0.48, 4, 0.06), override || new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, roughness: 0.5 })), V(sx * 0.2, 0.08, 0.1)); });
  // arms: shoulder -> elbow -> mitt
  const arms = [-1, 1].map(sx => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.5, 2.25, 0); p.add(sh);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 8, 20), shirtM), V(0, -0.3, 0), sh);
    const el = new THREE.Group(); el.position.set(0, -0.6, 0); sh.add(el);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.42, 8, 20), skin), V(0, -0.26, 0), el);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), skin), V(0, -0.55, 0), el);
    return { sh, el, sx };
  });
  // head
  const head = new THREE.Group(); head.position.set(0, 2.92, 0); p.add(head);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.46, 48, 36), skin), null, head).scale.set(0.95, 1.08, 1.0);
  const jaw = add(new THREE.Mesh(new THREE.SphereGeometry(0.29, 32, 24), skin), V(0, -0.24, 0.13), head); jaw.scale.set(1, 0.8, 0.95);
  const hairCap = add(new THREE.Mesh(new THREE.SphereGeometry(0.49, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM), V(0, 0.04, -0.02), head); hairCap.rotation.x = -0.32; hairCap.scale.set(0.98, 1.12, 1.05);
  [-1, 1].forEach(sx => add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), skin), V(sx * 0.44, 0.0, 0), head).scale.set(0.5, 1, 0.75));
  add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), skin), V(0, -0.02, 0.47), head).scale.set(0.8, 1, 1.15);
  const eyeM = override || new THREE.MeshPhysicalMaterial({ map: HEYE, roughness: 0.1, clearcoat: 1 });
  const lids = [], brows = [];
  [-1, 1].forEach(sx => {
    add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 28, 18), eyeM), V(sx * 0.16, 0.09, 0.39), head).rotation.y = sx * 0.1;
    const lid = add(new THREE.Mesh(new THREE.SphereGeometry(0.081, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin), V(sx * 0.16, 0.09, 0.39), head); lids.push(lid);
    const br = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.13, 4, 8), hairM), V(sx * 0.16, 0.22, 0.42), head); br.rotation.z = Math.PI / 2 - sx * 0.12; brows.push(br);
  });
  // mouth
  const mouth = new THREE.Group(); mouth.position.set(0, -0.2, 0.41); head.add(mouth);
  const line = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.12, 4, 8), darkM), null, mouth); line.rotation.z = Math.PI / 2;
  const cav = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), override || new THREE.MeshPhysicalMaterial({ color: 0x3b0c12, roughness: 0.6 })); mouth.add(cav);
  const tMat = override || new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 0.6 });
  const tUp = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.035, 0.05, 2, 0.012), tMat), tLo = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.03, 0.05, 2, 0.012), tMat); mouth.add(tUp, tLo);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), override || new THREE.MeshPhysicalMaterial({ color: 0xe0606f, roughness: 0.4 })); mouth.add(tongue);
  const api = {
    head, arms, torso, mouth,
    setLid(k) { lids.forEach(l => l.rotation.x = lerp(-0.75, 1.5, k)); },
    yawn(o, t = 0) {
      const open = o > 0.03; line.visible = !open; [cav, tUp, tLo, tongue].forEach(m => m.visible = open);
      const h = 0.015 + 0.2 * o; cav.scale.set(0.1 + 0.035 * o, h, 0.06); cav.position.set(0, -h * 0.4, 0.0);
      tUp.position.set(0, h * 0.55 - 0.005, 0.035); tLo.position.set(0, -h * 1.3, 0.03); tongue.scale.set(0.075, 0.03, 0.05); tongue.position.set(0, -h * 1.2, 0.0);
      jaw.position.y = -0.24 - 0.11 * o; head.rotation.x = -0.28 * o; api.setLid(lerp(0.1, 0.95, o)); brows.forEach(b => b.position.y = 0.22 + 0.05 * o);
      torso.scale.set(1.05 * (1 + 0.06 * o), 1, 0.72 * (1 + 0.08 * o));
    },
    stretch(k) { arms.forEach(a => { a.sh.rotation.set(-0.15 * k, 0, a.sx * lerp(0.14, Math.PI - 0.35, k)); a.el.rotation.set(0, 0, a.sx * lerp(0.05, 0.5, k)); }); },
  };
  p.userData = api; api.yawn(0); api.stretch(0); api.setLid(0.1);
  return p;
}
const counterTex = (lines, w = 512, h = 256, bg = '#0d1a14', fg = '#7dffb0') => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.userData.draw = (text) => { const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = 120; g.font = `bold ${fs}px monospace`; while (g.measureText(text).width > w * 0.88) { fs -= 6; g.font = `bold ${fs}px monospace`; } g.fillText(text, w / 2, h / 2 + 4); t.needsUpdate = true; };
  return t;
};
function stopwatchProp(color = 0xff5a36) {
  const sw = new THREE.Group(); const tex = counterTex();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 64), new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 1 })); body.rotation.x = Math.PI / 2;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.36), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = 0.12;
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 24), M.chrome); btn.position.y = 0.62;
  sw.add(body, scr, btn); sw.traverse(o => o.castShadow = true); sw.userData.tex = tex; return sw;
}
function o2Molecule() {
  const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color: 0xff3d4f, roughness: 0.25, clearcoat: 1 });
  [-1, 1].forEach(sx => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), m); s.position.x = sx * 0.09; g.add(s); });
  return g;
}

function makeBrain() {
  const g = new THREE.SphereGeometry(1, 128, 96); const pA = g.attributes.position;
  for (let i = 0; i < pA.count; i++) {
    const x = pA.getX(i), y = pA.getY(i), z = pA.getZ(i);
    const n = noise3(x * 3.2, y * 3.2, z * 3.2) + 0.5 * noise3(x * 6.4 + 3, y * 6.4, z * 6.4);
    const fold = Math.abs(Math.sin(n * 7.0)); const fis = Math.exp(-(x * x) / 0.004);
    const r = 1 + 0.05 * (fold - 0.5) - 0.12 * fis * (y > -0.3 ? 1 : 0);
    pA.setXYZ(i, x * r, y * r, z * r);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xff6a5a, roughness: 0.35, clearcoat: 0.6, emissive: 0x5a0a00 }));
  m.scale.set(0.95, 0.72, 1.18); m.castShadow = true; return m;
}
// =====================================================================
// SNEEZE HELPERS: a cast of characters, a sneeze action, spray clouds, germs
// =====================================================================
const XM = () => xrayMat(new THREE.Color(0.55, 0.85, 1.0), new THREE.Color(0.04, 0.16, 0.42), 2.0, 1.0);
const jolt = (t, t0) => { const a = t - t0; if (a < 0 || a > 0.6) return 0; return a < 0.08 ? a / 0.08 : Math.exp(-(a - 0.08) * 7); };

function makeChar({ shirt = 0x2bb3a3, pants = 0x2f3d5c, hair = 0x3a2416, skin = 0xe9a07c, style = 'short', beard = false, glasses = false, cap = null, coat = false, legs = true } = {}) {
  const p = makePerson({ shirt, pants, hair, skinCol: skin, legs: false });
  const u = p.userData, H = u.head;
  const skinM = H.children[0].material; const baseSkin = skinM.color.clone();
  const hairCap = H.children[2], nose = H.children[5];
  const hairM = new THREE.MeshPhysicalMaterial({ color: hair, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(hair).lerp(new THREE.Color(0xffffff), 0.3) });
  if (style === 'bald') hairCap.visible = false;
  if (style === 'long') {
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 20), hairM); back.position.set(0, -0.12, -0.12); back.scale.set(1.0, 1.35, 0.8); back.castShadow = true; H.add(back);
    const fr = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.32), hairM); fr.rotation.x = 0.35; fr.position.set(0, 0.06, 0.03); fr.scale.set(1.02, 1, 1.05); H.add(fr);
  }
  if (style === 'curly') { const r = rng(5); for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, b = r() * 1.2; const s = new THREE.Mesh(new THREE.SphereGeometry(0.13 + r() * 0.05, 14, 10), hairM); s.position.set(Math.cos(a) * Math.sin(b) * 0.47, Math.cos(b) * 0.47 + 0.08, Math.sin(a) * Math.sin(b) * 0.47 - 0.05); H.add(s); } hairCap.visible = false; }
  if (cap) { const cm = new THREE.MeshPhysicalMaterial({ color: cap, roughness: 0.5 }); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), cm); dome.position.y = 0.08; dome.rotation.x = -0.15; H.add(dome); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32, 1, false, -Math.PI / 2, Math.PI), cm); brim.position.set(0, 0.2, 0.36); brim.scale.z = 1.4; H.add(brim); hairCap.visible = false; }
  if (beard) { const bm = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 18), hairM); bm.position.set(0, -0.3, 0.12); bm.scale.set(1.0, 0.85, 0.9); H.add(bm); const mus = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 12), hairM); mus.rotation.z = Math.PI / 2; mus.position.set(0, -0.12, 0.45); H.add(mus); }
  if (glasses) { const gm = new THREE.MeshPhysicalMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.5 }); [-1, 1].forEach(sx => { const rr = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 32), gm); rr.position.set(sx * 0.16, 0.09, 0.47); H.add(rr); }); const br = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), gm); br.rotation.z = Math.PI / 2; br.position.set(0, 0.1, 0.48); H.add(br); }
  if (coat) { const cm = new THREE.MeshPhysicalMaterial({ color: 0xf7f9fb, roughness: 0.6 }); const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.47, 1.05, 12, 32), cm); c.position.set(0, 1.62, 0); c.scale.set(1.04, 1, 0.74); c.castShadow = true; p.add(c); const st = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 32, Math.PI * 1.3), new THREE.MeshPhysicalMaterial({ color: 0x2a2a2a })); st.position.set(0, 2.25, 0.32); st.rotation.set(0.3, 0, Math.PI * 1.15); p.add(st); }
  const cheeks = [-1, 1].map(sx => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), skinM); c.position.set(sx * 0.2, -0.15, 0.3); c.scale.setScalar(0.001); H.add(c); return c; });
  const pantsM = new THREE.MeshPhysicalMaterial({ color: pants, roughness: 0.8 }), shoeM = new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, roughness: 0.5 });
  const legG = [];
  if (legs) [-1, 1].forEach(sx => { const g = new THREE.Group(); g.position.set(sx * 0.2, 1.3, 0); p.add(g); const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.55, 8, 20), pantsM); th.position.y = -0.38; th.castShadow = true; g.add(th); const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.5, 8, 20), pantsM); sh.position.y = -0.9; sh.castShadow = true; g.add(sh); const so = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.16, 0.48, 4, 0.06), shoeM); so.position.set(0, -1.22, 0.1); so.castShadow = true; g.add(so); legG.push(g); });
  // mouth parts (line, cavity, upper teeth, lower teeth, tongue)
  const [line, cav, tUp, tLo, tongue] = u.mouth.children;
  Object.assign(u, {
    skinM, baseSkin, cheeks, nose, legG,
    mouthOpen(o) { const open = o > 0.03; line.visible = !open; [cav, tUp, tLo, tongue].forEach(m => m.visible = open); const h = 0.015 + 0.2 * o; cav.scale.set(0.1 + 0.035 * o, h, 0.06); cav.position.set(0, -h * 0.4, 0); tUp.position.set(0, h * 0.55 - 0.005, 0.035); tLo.position.set(0, -h * 1.3, 0.03); tongue.scale.set(0.075, 0.03, 0.05); tongue.position.set(0, -h * 1.2, 0); },
    puff(k) { cheeks.forEach(c => c.scale.setScalar(Math.max(k * (1 + 0.05 * k), 0.001))); },
    blush(k) { skinM.color.copy(u.baseSkin).lerp(new THREE.Color(0xff4a4a), k * 0.55); },
    walk(ph, amt = 1) { legG.forEach((g, i) => g.rotation.x = Math.sin(ph + i * Math.PI) * 0.45 * amt); u.arms.forEach((a, i) => a.sh.rotation.set(Math.sin(ph + (i + 1) * Math.PI) * 0.4 * amt, 0, a.sx * 0.14)); p.userData.bob = Math.abs(Math.sin(ph)) * 0.05 * amt; },
    reset() { H.rotation.set(0, 0, 0); u.mouthOpen(0); u.setLid(0.1); u.puff(0); u.blush(0); nose.scale.set(0.8, 1, 1.15); p.rotation.set(0, p.rotation.y, 0); u.arms.forEach(a => { a.sh.rotation.set(0, 0, a.sx * 0.14); a.el.rotation.set(0, 0, a.sx * 0.05); }); legG.forEach(g => g.rotation.set(0, 0, 0)); },
  });
  u.reset();
  return p;
}
// sneeze performance; returns {snap, wind}
function sneezeAct(p, t, t0, { wind = 1.1, big = 1 } = {}) {
  const u = p.userData; const w = smooth(t0 - wind, t0 - 0.05, t) * (t < t0 + 0.05 ? 1 : 0);
  const a = t - t0, snap = a < 0 ? 0 : a < 0.1 ? a / 0.1 : Math.exp(-(a - 0.1) * 4.5);
  u.head.rotation.x = -0.38 * w + 0.45 * snap * big;
  u.setLid(Math.max(0.3 + 0.55 * w, snap > 0.05 ? 1.0 : 0));
  u.mouthOpen(Math.max(0.35 * w, 0.42 * snap));
  u.nose.scale.set(0.8 * (1 + 0.15 * w * Math.abs(Math.sin(t * 22))), 1, 1.15);
  u.torso.scale.set(1.05 * (1 + 0.05 * w), 1, 0.72 * (1 + 0.07 * w));
  p.rotation.x = -0.06 * w + 0.16 * snap * big;
  u.arms.forEach(arm => { arm.sh.rotation.set(-0.35 * snap, 0, arm.sx * (0.14 + 0.25 * snap)); });
  return { snap, wind: w };
}
// deterministic spray cloud from a sneeze
function sprayCloud(sc, n = 220, color = 0xd8f6ff) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: 0.7, roughness: 0.05, clearcoat: 1 }), n); sc.add(mesh);
  const r = rng(77), P = []; for (let i = 0; i < n; i++) P.push({ sp: 3 + r() * 9, dx: (r() - 0.5) * 0.7, dy: (r() - 0.35) * 0.5, s: 0.5 + r() * 1.3, del: r() * 0.12 });
  const dummy = new THREE.Object3D();
  return (t, t0, origin, dir, reach = 1, life = 1.8) => {
    const a = t - t0;
    for (let i = 0; i < n; i++) {
      const q = P[i], ai = a - q.del;
      if (ai <= 0 || ai > life) { dummy.scale.setScalar(0.0001); }
      else {
        const k = 2.2, dist = q.sp * reach * (1 - Math.exp(-k * ai)) / k;
        const side = V(-dir.z, 0, dir.x).normalize();
        dummy.position.copy(origin).addScaledVector(dir, dist).addScaledVector(side, q.dx * dist).add(V(0, q.dy * dist - 0.25 * ai * ai, 0));
        dummy.scale.setScalar(q.s * (1 - ai / life) * (1 + 0.6 * ai));
      }
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
}
function germ(color = 0x6bd34a, seed = 1) {
  const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.8 });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), m));
  const r = rng(seed); for (let i = 0; i < 14; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), m); const d = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize(); sp.position.copy(d.clone().multiplyScalar(0.18)); sp.quaternion.setFromUnitVectors(V(0, 1, 0), d); g.add(sp); }
  [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(sx * 0.06, 0.04, 0.14); g.add(e); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), M.black); pu.position.set(sx * 0.06, 0.04, 0.18); g.add(pu); });
  const mo = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 6, 16, Math.PI), M.black); mo.rotation.z = Math.PI; mo.position.set(0, -0.04, 0.15); g.add(mo);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
function dustFluff(seed = 1) { const g = new THREE.Group(); const r = rng(seed); const m = new THREE.MeshPhysicalMaterial({ color: 0xb9b2a6, roughness: 0.9, sheen: 1 }); for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.05 + r() * 0.04, 10, 8), m); s.position.set((r() - 0.5) * 0.14, (r() - 0.5) * 0.14, (r() - 0.5) * 0.14); g.add(s); } return g; }
const mouthW = (p) => worldOf(p.userData.mouth, V(0, -0.02, 0.06));
const faceDir = (p) => { const q = new THREE.Quaternion(); p.userData.head.getWorldQuaternion(q); return V(0, -0.15, 1).applyQuaternion(q).normalize(); };
function officeSet(sc) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshPhysicalMaterial({ color: 0xc9d3dc, roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const deskM = new THREE.MeshPhysicalMaterial({ color: 0xf2f2f0, roughness: 0.4, clearcoat: 0.3 }), monM = new THREE.MeshPhysicalMaterial({ color: 0x1d2126, roughness: 0.3 });
  const desk = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const top = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.08, 0.9, 3, 0.03), deskM); top.position.y = 1.45; top.castShadow = top.receiveShadow = true; g.add(top); [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].forEach(([a, b]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.45, 8), M.chrome); l.position.set(a, 0.72, b); g.add(l); }); const mon = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.5, 0.05, 3, 0.02), monM); mon.position.set(0, 1.85, -0.25); mon.castShadow = true; g.add(mon); sc.add(g); return g; };
  desk(0, 0.9, 0); desk(-2.1, -1.0, 0.5); desk(2.1, -1.0, -0.5);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.5, 24), new THREE.MeshPhysicalMaterial({ color: 0xe86a3c, roughness: 0.5 })); pot.position.set(-3.2, 0.25, -2.2); sc.add(pot);
  for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0x3fae5a, roughness: 0.5 })); lf.scale.set(0.5, 1.4, 0.2); lf.position.set(-3.2 + Math.cos(i) * 0.15, 0.85 + (i % 3) * 0.2, -2.2 + Math.sin(i) * 0.15); lf.rotation.set(Math.sin(i) * 0.6, i, Math.cos(i) * 0.6); sc.add(lf); }
}


const CAST = {
  A: { shirt: 0x2bb3a3, hair: 0x3a2416, skin: 0xe9a07c },
  B: { shirt: 0xf2c230, hair: 0x7a3b18, skin: 0xf0b48e, style: 'long' },
  C: { shirt: 0x8a5cd6, hair: 0x1a1210, skin: 0x8d5a3b, style: 'curly', glasses: true },
  D: { shirt: 0xff6f61, hair: 0x2a1a10, skin: 0xd99a6c, cap: 0x2f6fdb },
  E: { shirt: 0x5fbf6a, hair: 0x101010, skin: 0x6e4630, style: 'bald' },
  F: { shirt: 0xf58fb4, hair: 0xe0b060, skin: 0xf3c2a2, style: 'long' },
  H: { shirt: 0xff8c2a, hair: 0x2a1a10, skin: 0xc98a5c, cap: 0xd92b3a },
  M: { shirt: 0xb83a2e, pants: 0x3a4250, hair: 0x5a3416, skin: 0xe6a07a, beard: true },
};

// =====================================================================
// LOOK + ANIMATION UPGRADE
// jointed characters (knees, ankles, fingers), gait, breathing, blinks, saccades,
// springs and overshoot easing, handheld camera with focus, procedural wood/fabric/hair textures
// =====================================================================
E.back = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
E.outQ = x => 1 - (1 - x) * (1 - x);
E.inQ = x => x * x;
// 0 -> 1 with a damped overshoot (settles like a spring)
const spring = (t, t0, f = 2.2, d = 6) => { const a = t - t0; if (a <= 0) return 0; return 1 - Math.exp(-d * a) * Math.cos(2 * Math.PI * f * a); };
// impulse wobble that dies away
const wob = (t, t0, f = 4, d = 6) => { const a = t - t0; if (a <= 0) return 0; return Math.exp(-d * a) * Math.sin(2 * Math.PI * f * a); };
const fbm = (x, y = 0, z = 0) => noise3(x, y, z) * 0.62 + noise3(x * 2.03 + 5.1, y * 2.03, z * 2.03) * 0.28 + noise3(x * 4.1 + 9.3, y * 4.1, z * 4.1) * 0.1;
// eye saccades: hold, then jump fast to the next random target
function saccade(t, seed = 1, rate = 3.2) {
  const q = t * rate + seed * 0.37, k = Math.floor(q), f = q - k;
  const m = smooth(0, 0.16, f);
  return [lerp(h3(k - 1, seed, 1) * 2 - 1, h3(k, seed, 1) * 2 - 1, m), lerp(h3(k - 1, seed, 7) * 2 - 1, h3(k, seed, 7) * 2 - 1, m)];
}
// camera with handheld drift, rack-focus distance stored for the depth-of-field pass
function shoot(cam, pos, target, { roll = 0, fov, hand = 1, t = 0, focus = null } = {}) {
  const d = pos.distanceTo(target), n = 0.01 * hand * Math.max(d, 1.5);
  const p = pos.clone().add(V(fbm(t * 0.55, 1.1), fbm(t * 0.55, 2.2), fbm(t * 0.55, 3.3)).multiplyScalar(n));
  const tg = target.clone().add(V(fbm(t * 0.45, 4.4), fbm(t * 0.45, 5.5), 0).multiplyScalar(n * 0.6));
  setCam(cam, p, tg, roll + fbm(t * 0.4, 6.6) * 0.7 * hand, fov);
  cam.userData.focus = focus ?? p.distanceTo(tg);
}

// ---------- procedural textures ----------
function canvasTex(w, h, draw, { rep = [1, 1], srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t;
}
function noiseFill(g, w, h, seed, amp, base = 128, scale = 1) {
  const im = g.getImageData(0, 0, w, h), r = rng(seed);
  for (let i = 0; i < im.data.length; i += 4) { const n = (r() - 0.5) * amp; im.data[i] = clamp(im.data[i] + n, 0, 255); im.data[i + 1] = clamp(im.data[i + 1] + n, 0, 255); im.data[i + 2] = clamp(im.data[i + 2] + n, 0, 255); }
  g.putImageData(im, 0, 0);
}
const woodTex = (base, dark, seed = 1, rep = [1, 1], planks = 0) => canvasTex(512, 512, (g, w, h) => {
  const r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
  const rows = planks || 1;
  for (let k = 0; k < rows; k++) {
    const y0 = k * h / rows, ph = h / rows;
    g.globalAlpha = 1; g.fillStyle = r() > 0.5 ? `rgba(0,0,0,${0.12 * r()})` : `rgba(255,220,180,${0.08 * r()})`; g.fillRect(0, y0, w, ph);
    for (let i = 0; i < 30; i++) {
      const yy = y0 + r() * ph; g.strokeStyle = dark; g.globalAlpha = 0.06 + r() * 0.2; g.lineWidth = 0.5 + r() * 2.4; g.beginPath();
      for (let x = 0; x <= w; x += 8) { const yv = yy + Math.sin(x * 0.011 + i * 1.3) * 2.5 + Math.sin(x * 0.047 + i * 2.7) * 0.7; x ? g.lineTo(x, yv) : g.moveTo(x, yv); }
      g.stroke();
    }
    if (r() > 0.5) { g.globalAlpha = 0.3; g.strokeStyle = dark; const kx = r() * w, ky = y0 + ph * 0.5; for (let q = 1; q < 6; q++) { g.lineWidth = 1; g.beginPath(); g.ellipse(kx, ky, q * 5, q * 2, 0, 0, 7); g.stroke(); } }
    if (planks) { g.globalAlpha = 0.7; g.fillStyle = '#24130a'; g.fillRect(0, y0, w, 2.5); g.fillRect(r() * w, y0, 2.5, ph); }
  }
  g.globalAlpha = 1;
}, { rep });
const weaveTex = (rep = [24, 24], seed = 9) => canvasTex(128, 128, (g, w, h) => {
  const im = g.createImageData(w, h), r = rng(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cell = ((x >> 2) + (y >> 2)) & 1, along = cell ? (x & 3) : (y & 3);
    const v = 128 + (cell ? 26 : -26) + 22 * Math.sin(along / 4 * Math.PI) + (r() - 0.5) * 26;
    const i = (y * w + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
}, { rep, srgb: false });
const quiltTex = (rep = [5, 7]) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#202020'; g.fillRect(0, 0, w, h);
  const gr = g.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w * 0.66); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#c8c8c8'); gr.addColorStop(1, '#3a3a3a');
  g.fillStyle = gr; g.fillRect(3, 3, w - 6, h - 6);
  g.strokeStyle = '#101010'; g.lineWidth = 2; g.setLineDash([7, 5]); g.strokeRect(3, 3, w - 6, h - 6);
  noiseFill(g, w, h, 4, 18);
}, { rep, srgb: false });
const plasterTex = (rep = [6, 4]) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 12, 60); }, { rep, srgb: false });
const HAIR_BUMP = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(4);
  for (let i = 0; i < 1400; i++) {
    const x = r() * w; g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.32)'; g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath(); g.moveTo(x, -4); g.bezierCurveTo(x + (r() - 0.5) * 22, h * 0.33, x + (r() - 0.5) * 22, h * 0.66, x + (r() - 0.5) * 34, h + 4); g.stroke();
  }
}, { rep: [3, 1], srgb: false });
const WEAVE = weaveTex([22, 22]), WEAVE_FINE = weaveTex([60, 60], 3), QUILT = quiltTex([5, 7]), PLASTER = plasterTex([8, 5]);
// dim/tinted copies of the studio environment so night scenes are not lit like a showroom
function tintedEnv(r, g, b) {
  const room = new RoomEnvironment(); const tint = new THREE.Color(r, g, b);
  room.traverse(o => { if (o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.multiply(tint); if (o.material.emissive) o.material.emissive.multiply(tint); } });
  return pmrem.fromScene(room, 0.04).texture;
}
const NENV = tintedEnv(0.16, 0.2, 0.36), MENV = tintedEnv(0.85, 0.72, 0.58), DENV = tintedEnv(0.8, 0.62, 1.0);

// ---------- jointed character ----------
// one smooth head surface (cranium blended into the jaw) so there is no crease across the face
function mergedHeadGeo() {
  const g = new THREE.SphereGeometry(1, 72, 54), p = g.attributes.position;
  const c = V(0, -0.24, 0.13), a = V(0.29, 0.232, 0.2755), k = 0.08;
  for (let i = 0; i < p.count; i++) {
    const n = V(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const rh = 1 / Math.sqrt((n.x / 0.437) ** 2 + (n.y / 0.4968) ** 2 + (n.z / 0.46) ** 2);
    const A = (n.x / a.x) ** 2 + (n.y / a.y) ** 2 + (n.z / a.z) ** 2, B = -2 * (n.x * c.x / a.x ** 2 + n.y * c.y / a.y ** 2 + n.z * c.z / a.z ** 2), Cc = (c.x / a.x) ** 2 + (c.y / a.y) ** 2 + (c.z / a.z) ** 2 - 1;
    const disc = B * B - 4 * A * Cc; const rj = disc > 0 ? (-B + Math.sqrt(disc)) / (2 * A) : 0;
    const hh = Math.max(k - Math.abs(rh - rj), 0) / k, r = Math.max(rh, rj) + hh * hh * k * 0.25;
    p.setXYZ(i, n.x * r, n.y * r, n.z * r);
  }
  g.computeVertexNormals(); return g;
}
const HEADGEO = mergedHeadGeo();
function makeChar2(opts = {}) {
  const p = makeChar(opts); const u = p.userData; const H = u.head; const skinM = u.skinM;
  const add = (m, pos, parent) => { m.castShadow = true; m.receiveShadow = true; m.position.copy(pos); parent.add(m); return m; };
  H.children[0].geometry = HEADGEO; H.children[0].scale.set(1, 1, 1); H.children[1].visible = false;
  // fabric + hair surface detail
  const shirtM = u.torso.material; shirtM.bumpMap = WEAVE; shirtM.bumpScale = 1.2; shirtM.sheen = 0.8; shirtM.sheenRoughness = 0.7; shirtM.sheenColor = shirtM.color.clone().lerp(new THREE.Color(0xffffff), 0.45);
  H.traverse(o => { if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial && o.material.sheen === 1) { o.material.bumpMap = HAIR_BUMP; o.material.bumpScale = 2.2; o.material.roughness = 0.45; } });
  skinM.sheenRoughness = 0.45;
  // lash line along the rim of each eyelid
  const lashM = new THREE.MeshStandardMaterial({ color: 0x24160f, roughness: 0.6 });
  H.children.filter(o => o.isMesh && o.geometry.parameters && o.geometry.parameters.radius === 0.081).forEach(l => { const ls = new THREE.Mesh(new THREE.TorusGeometry(0.081, 0.0065, 6, 28, Math.PI), lashM); ls.rotation.x = Math.PI / 2; l.add(ls); });
  // eyes, for gaze and pop
  const eyes = H.children.filter(o => o.isMesh && o.material && o.material.map === HEYE); eyes.forEach(e => e.userData.ry = e.rotation.y);
  // hands with fingers replace the mitts
  const hands = u.arms.map(a => {
    const el = a.el, sx = a.sx; const mitt = el.children[1]; el.remove(mitt);
    const hand = new THREE.Group(); hand.position.set(0, -0.5, 0); el.add(hand);
    add(new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.16, 0.165, 3, 0.036), skinM), V(0, -0.075, 0), hand);
    const fingers = [[-0.057, 0.072], [-0.02, 0.088], [0.018, 0.086], [0.055, 0.078]].map(([z, L]) => {
      const f1 = new THREE.Group(); f1.position.set(0, -0.145, z); hand.add(f1);
      add(new THREE.Mesh(new THREE.CapsuleGeometry(0.021, L * 0.42, 4, 10), skinM), V(0, -L * 0.3, 0), f1);
      const f2 = new THREE.Group(); f2.position.set(0, -L * 0.6, 0); f1.add(f2);
      add(new THREE.Mesh(new THREE.CapsuleGeometry(0.019, L * 0.32, 4, 10), skinM), V(0, -L * 0.24, 0), f2);
      return { f1, f2 };
    });
    const th = new THREE.Group(); th.position.set(-sx * 0.015, -0.035, 0.07); hand.add(th);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.05, 4, 10), skinM), V(0, -0.045, 0), th);
    const th2 = new THREE.Group(); th2.position.set(0, -0.085, 0); th.add(th2);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.034, 4, 10), skinM), V(0, -0.03, 0), th2);
    const api = {
      hand, curl(k, spread = 0) {
        fingers.forEach((f, j) => { f.f1.rotation.set((1.5 - j) * 0.07 * (1 - k) * (1 + spread), 0, -sx * (0.12 + 1.5 * k)); f.f2.rotation.set(0, 0, -sx * (0.12 + 1.55 * k)); });
        th.rotation.set(-0.6 + 0.4 * k, 0, -sx * (0.2 + 0.7 * k)); th2.rotation.set(0, 0, -sx * 0.7 * k);
      },
    };
    api.curl(0.3); return api;
  });
  // legs with knees and ankles
  const legs = u.legG.map(g => {
    const [thM, shM, so] = g.children; const pantsM = thM.material; g.remove(thM, shM, so);
    pantsM.bumpMap = WEAVE; pantsM.bumpScale = 1.0;
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.158, 0.42, 8, 20), pantsM), V(0, -0.3, 0), g);
    const knee = new THREE.Group(); knee.position.set(0, -0.62, 0); g.add(knee);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.148, 20, 14), pantsM), V(0, 0, 0), knee);
    add(new THREE.Mesh(new THREE.CapsuleGeometry(0.138, 0.42, 8, 20), pantsM), V(0, -0.3, 0), knee);
    const ankle = new THREE.Group(); ankle.position.set(0, -0.6, 0); knee.add(ankle);
    so.position.set(0, 0, 0.1); ankle.add(so);
    const sole = add(new THREE.Mesh(new RoundedBoxGeometry(0.275, 0.05, 0.5, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x3a3f46, roughness: 0.7 })), V(0, -0.07, 0.1), ankle);
    // bare foot (hidden unless barefoot)
    const foot = new THREE.Group(); foot.position.set(0, -0.02, 0.06); ankle.add(foot); foot.visible = false;
    const fm = add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), skinM), V(0, 0, 0.06), foot); fm.scale.set(0.105, 0.075, 0.2);
    const heel = add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), skinM), V(0, 0.0, -0.08), foot);
    [-0.06, -0.03, 0.0, 0.03, 0.06].forEach((x, k) => add(new THREE.Mesh(new THREE.SphereGeometry(k === 0 ? 0.03 : 0.022, 12, 8), skinM), V(x * 1.2, -0.01, 0.245 - Math.abs(x) * 0.5), foot));
    return { hip: g, knee, ankle, shoe: [so, sole], foot };
  });
  const reset0 = u.reset;
  Object.assign(u, {
    hands, legs, eyes, bob: 0, lean: 0,
    barefoot(on = true) { legs.forEach(L => { L.shoe.forEach(m => m.visible = !on); L.foot.visible = on; }); },
    reset() {
      reset0(); H.position.set(0, 2.92, 0); u.torso.scale.set(1.05, 1, 0.72); hands.forEach(h => h.curl(0.3));
      legs.forEach(L => { L.hip.rotation.set(0, 0, 0); L.knee.rotation.set(0, 0, 0); L.ankle.rotation.set(0, 0, 0); });
      eyes.forEach(e => { e.rotation.set(0, e.userData.ry, 0); e.scale.setScalar(1); }); u.bob = 0; u.lean = 0;
    },
    // walk (run=0) to sprint (run=1)
    gait(ph, amt = 1, run = 0) {
      const A = lerp(0.42, 0.85, run) * amt, Kb = lerp(0.8, 1.95, run) * amt;
      legs.forEach((L, i) => { const f = ph + i * Math.PI; L.hip.rotation.x = -A * Math.sin(f) - 0.1 * run * amt; L.knee.rotation.x = Kb * Math.pow(Math.max(0, Math.cos(f + 0.6)), 2) + 0.12 * amt; L.ankle.rotation.x = -0.28 * amt * Math.sin(f + 0.9); });
      u.arms.forEach((a, i) => { const f = ph + i * Math.PI; a.sh.rotation.set(lerp(0.38, 0.95, run) * amt * Math.sin(f), 0, a.sx * (0.12 + 0.1 * run)); a.el.rotation.set(-lerp(0.25, 1.45, run) * amt * (1 + 0.25 * Math.sin(f)), 0, 0); });
      hands.forEach(h => h.curl(lerp(0.35, 0.8, run)));
      const s = Math.abs(Math.sin(ph)); u.bob = amt * (lerp(0.045, 0, run) * (1 - s) + run * 0.14 * s); u.lean = 0.17 * run * amt;
    },
    breathe(t, rate = 0.25, amp = 0.035, ph = 0) { const k = Math.sin(2 * Math.PI * rate * t + ph); u.torso.scale.set(1.05 * (1 + 0.012 * k), 1 + 0.006 * k, 0.72 * (1 + amp * k)); return k; },
    blink(t, seed = 0) { const P = 2.6 + (seed % 3) * 0.7, a = (((t + seed * 1.37) % P) + P) % P; return a < 0.17 ? Math.sin(Math.PI * a / 0.17) : 0; },
    lid(base, t, seed = 0) { u.setLid(lerp(base, 1, u.blink(t, seed))); },
    // bend at the neck (chin toward chest); the head pivots about the base of the neck
    neck(al) { H.position.set(0, 2.5 + 0.42 * Math.cos(al), 0.42 * Math.sin(al)); H.rotation.x += al; },
    gaze(yaw, pitch = 0) { eyes.forEach(e => e.rotation.set(pitch, e.userData.ry + yaw, 0)); },
    eyePop(k) { eyes.forEach(e => e.scale.setScalar(k)); },
    life(t, amt = 1, seed = 0) { H.rotation.x += 0.04 * amt * fbm(t * 0.6, seed); H.rotation.y += 0.06 * amt * fbm(t * 0.5, seed + 3); H.rotation.z += 0.03 * amt * fbm(t * 0.5, seed + 6); },
  });
  u.reset();
  if (opts.barefoot) u.barefoot(true);
  return p;
}

// =====================================================================
// BRAIN FREEZE: characters, props, boardwalk
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.02, 300) }; build(s); shots.push(s); return s; }
const hdr = (r, g, b, extra = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), ...extra });
const kf = (t, keys) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b, ease = E.io] = keys[i]; const k = ease(clamp((t - t0) / (t1 - t0)));
    return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
  }
  return keys[keys.length - 1][1];
};
const hex = c => '#' + new THREE.Color(c).getHexString();

// ---------- two-bone arm IK: put the palm on a world point, elbow bends toward the pole ----------
function ik2(p, a, T, pole, L1 = 0.6, L2 = 0.58) {
  p.updateMatrixWorld(true);
  const S = a.sh.getWorldPosition(new THREE.Vector3()), s = a.sh.getWorldScale(new THREE.Vector3()).x;
  const l1 = L1 * s, l2 = L2 * s, D = T.clone().sub(S); const d = Math.min(Math.max(D.length(), Math.abs(l1 - l2) + 1e-3), (l1 + l2) * 0.999); const dir = D.normalize();
  const a1 = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const pp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const Ep = S.clone().add(dir.clone().multiplyScalar(Math.cos(a1)).add(pp.multiplyScalar(Math.sin(a1))).multiplyScalar(l1));
  const u1 = Ep.clone().sub(S).normalize(), u2 = S.clone().add(dir.multiplyScalar(d)).sub(Ep).normalize();
  const down = V(0, -1, 0);
  const q1 = new THREE.Quaternion().setFromUnitVectors(down, u1), q2 = new THREE.Quaternion().setFromUnitVectors(down, u2);
  const pq = a.sh.parent.getWorldQuaternion(new THREE.Quaternion());
  a.sh.quaternion.copy(pq.clone().invert().multiply(q1));
  a.el.quaternion.copy(q1.clone().invert().multiply(q2));
}
const worldPt = (obj, local) => { obj.updateMatrixWorld(true); return obj.localToWorld(local.clone()); };

// ---------- kids ----------
function makeKid(o = {}) {
  const p = makeChar2({ barefoot: false, ...o }); const u = p.userData; const H = u.head;
  p.scale.setScalar(o.s ?? 0.82); H.scale.setScalar(o.hs ?? 1.1);
  if (o.hairUp) { const hc = H.children[2]; hc.rotation.x = -0.32 - o.hairUp; }
  if (o.shorts) u.legs.forEach(L => L.knee.children.forEach((m, i) => { if (m.isMesh && i < 2) m.material = u.skinM; }));
  // brows and mouth for a pained wince
  const brows = H.children.filter(c => c.isMesh && c.geometry.type === 'CapsuleGeometry' && Math.abs(c.position.y - 0.22) < 0.02);
  brows.forEach(b => { b.userData.y = b.position.y; b.userData.rz = b.rotation.z; b.userData.sx = Math.sign(b.position.x); });
  const reset0 = u.reset;
  Object.assign(u, {
    brows,
    reset() { reset0(); brows.forEach(b => { b.position.y = b.userData.y; b.rotation.z = b.userData.rz; }); u.mouth.scale.set(1, 1, 1); u.cold(0); },
    wince(k) { brows.forEach(b => { b.position.y = b.userData.y - 0.035 * k; b.rotation.z = b.userData.rz - b.userData.sx * 0.42 * k; b.position.x = b.userData.sx * (0.16 - 0.02 * k); }); u.mouth.scale.set(1 + 0.45 * k, 1, 1); },
    raise(k) { brows.forEach(b => { b.position.y = b.userData.y + 0.04 * k; b.rotation.z = b.userData.rz + b.userData.sx * 0.15 * k; }); },
    cold(k) { u.skinM.color.copy(u.baseSkin).lerp(new THREE.Color(0xc4d8ff), 0.14 * k); },
  });
  u.reset();
  return p;
}
// world point on the kid's face, in head space (forehead, mouth...)
const headPt = (p, v) => worldPt(p.userData.head, v);

// ---------- frost cracks that grow across a surface (forehead) ----------
function frostTex(seed = 3) {
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); const r = rng(seed);
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(150,200,255,0.55)'); gr.addColorStop(0.55, 'rgba(160,205,255,0.25)'); gr.addColorStop(1, 'rgba(160,205,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const crack = (x, y, a, len, wd, depth) => {
      const P = [[x, y]]; let cx = x, cy = y; const n = 6 + Math.floor(r() * 4), kids = [];
      for (let i = 0; i < n; i++) { a += (r() - 0.5) * 0.7; cx += Math.cos(a) * len / n; cy += Math.sin(a) * len / n; P.push([cx, cy]); if (depth < 3 && r() < 0.35) kids.push([cx, cy, a + (r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.6)]); }
      [[wd * 2.4, 'rgba(60,120,205,0.5)'], [wd * 1.45, 'rgba(245,252,255,1)']].forEach(([lw, col]) => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); P.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); });
      kids.forEach(([kx, ky, ka]) => crack(kx, ky, ka, len * 0.55, wd * 0.65, depth + 1));
    };
    for (let i = 0; i < 9; i++) crack(w / 2, h / 2, i / 9 * Math.PI * 2 + r() * 0.4, 150 + r() * 80, 3.2, 0);
    for (let i = 0; i < 260; i++) { const a = r() * 6.283, d = Math.pow(r(), 0.7) * w * 0.42; g.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * r()})`; const s = 1 + r() * 3; g.fillRect(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, s, s); }
  }, { srgb: true });
}
const FROST = frostTex(3);
function frostMat(map = FROST) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uR: { value: 0 }, uOp: { value: 1 }, tint: { value: new THREE.Color(1.15, 1.2, 1.35) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D map; uniform float uR; uniform float uOp; uniform vec3 tint; varying vec2 vUv;
      void main(){ vec4 c=texture2D(map,vUv); float d=distance(vUv,vec2(0.5)); float m=1.0-smoothstep(uR-0.06,uR,d); float edge=smoothstep(uR-0.035,uR,d)*m*2.0;
        gl_FragColor=vec4(c.rgb*tint*(1.0+edge*1.5), c.a*m*uOp); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
// radius of the merged head surface in a direction (matches mergedHeadGeo)
function headR(n) {
  const c = V(0, -0.24, 0.13), a = V(0.29, 0.232, 0.2755), k = 0.08;
  const rh = 1 / Math.sqrt((n.x / 0.437) ** 2 + (n.y / 0.4968) ** 2 + (n.z / 0.46) ** 2);
  const A = (n.x / a.x) ** 2 + (n.y / a.y) ** 2 + (n.z / a.z) ** 2, B = -2 * (n.x * c.x / a.x ** 2 + n.y * c.y / a.y ** 2 + n.z * c.z / a.z ** 2), Cc = (c.x / a.x) ** 2 + (c.y / a.y) ** 2 + (c.z / a.z) ** 2 - 1;
  const disc = B * B - 4 * A * Cc, rj = disc > 0 ? (-B + Math.sqrt(disc)) / (2 * A) : 0, hh = Math.max(k - Math.abs(rh - rj), 0) / k;
  return Math.max(rh, rj) + hh * hh * k * 0.25;
}
function foreheadFrost(p) {
  const H = p.userData.head, dir = V(0, 0.3, 0.95).normalize(), T = V(1, 0, 0), B = new THREE.Vector3().crossVectors(dir, T).normalize();
  const g = new THREE.PlaneGeometry(0.62, 0.62, 28, 28), pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); const n = dir.clone().add(T.clone().multiplyScalar(x)).add(B.clone().multiplyScalar(-y)).normalize(); const r = headR(n) + 0.006; pa.setXYZ(i, n.x * r, n.y * r, n.z * r); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, frostMat()); m.userData.noDof = false; m.renderOrder = 5; H.add(m); return m;
}

// ---------- the slushie ----------
const SLUSH_T = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2b8fff'; g.fillRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 1800; i++) { const v = r(); g.fillStyle = v > 0.6 ? `rgba(200,235,255,${0.35 + 0.5 * r()})` : `rgba(10,60,180,${0.3 * r()})`; const s = 1 + r() * 4; g.fillRect(r() * w, r() * h, s, s); } }, { rep: [3, 2] });
const SLUSH_B = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(9); for (let i = 0; i < 2200; i++) { g.fillStyle = r() > 0.5 ? '#ffffff' : '#202020'; const s = 1 + r() * 3; g.beginPath(); g.arc(r() * w, r() * h, s, 0, 7); g.fill(); } }, { rep: [3, 2], srgb: false });
function slushMat() { return new THREE.MeshPhysicalMaterial({ map: SLUSH_T, bumpMap: SLUSH_B, bumpScale: 2.5, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, emissive: 0x0a3a90, emissiveIntensity: 0.35, sheen: 0.6, sheenColor: new THREE.Color(0xbfe4ff) }); }
function makeSlushie() {
  const g = new THREE.Group(), H = 0.62, r0 = 0.15, r1 = 0.215, R = k => lerp(r0, r1, k);
  const cupM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const prof = []; for (let i = 0; i <= 24; i++) { const k = i / 24; prof.push(new THREE.Vector2(R(k), k * H)); }
  const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), cupM); cup.renderOrder = 3; g.add(cup);
  const rimT = new THREE.Mesh(new THREE.TorusGeometry(r1 + 0.004, 0.009, 10, 72), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.6 })); rimT.rotation.x = Math.PI / 2; rimT.position.y = H; g.add(rimT);
  // printed paper band with snowflakes
  const bandT = canvasTex(1024, 160, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e8f4ff'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#1a6fe0'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14); c.strokeStyle = '#1a6fe0'; c.lineWidth = 6; c.lineCap = 'round';
    for (let k = 0; k < 6; k++) { const x = 90 + k * 170, y = h / 2; for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(an) * 42, y + Math.sin(an) * 42); c.stroke(); const bx = x + Math.cos(an) * 26, by = y + Math.sin(an) * 26; [-0.6, 0.6].forEach(d => { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(an + d) * 13, by + Math.sin(an + d) * 13); c.stroke(); }); } } });
  const bandP = []; for (let i = 0; i <= 8; i++) { const k = 0.3 + 0.32 * i / 8; bandP.push(new THREE.Vector2(R(k) + 0.0025, k * H)); }
  const band = new THREE.Mesh(new THREE.LatheGeometry(bandP, 72), new THREE.MeshPhysicalMaterial({ map: bandT, roughness: 0.45, clearcoat: 0.6, side: THREE.DoubleSide })); band.castShadow = true; g.add(band);
  // slush body + mounded top
  const fillP = []; for (let i = 0; i <= 24; i++) { const k = i / 24; fillP.push(new THREE.Vector2(R(k * 0.95) - 0.008, k * H * 0.95)); }
  const sM = slushMat();
  const fill = new THREE.Mesh(new THREE.LatheGeometry(fillP, 64), sM); fill.position.y = 0.006; g.add(fill);
  const moundG = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), mp = moundG.attributes.position;
  for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i); mp.setY(i, y * (0.35 + 0.15 * noise3(x * 4, z * 4, 1))); }
  moundG.computeVertexNormals(); const mound = new THREE.Mesh(moundG, sM); g.add(mound);
  // dome lid and straw
  const lid = new THREE.Mesh(new THREE.SphereGeometry(r1 + 0.01, 64, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), cupM); lid.scale.y = 0.55; lid.position.y = H; lid.renderOrder = 4; g.add(lid);
  const strawT = canvasTex(64, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff3b5c'; for (let i = -4; i < 24; i++) { c.beginPath(); c.moveTo(0, i * 28); c.lineTo(w, i * 28 + 26); c.lineTo(w, i * 28 + 40); c.lineTo(0, i * 28 + 14); c.fill(); } });
  const strawG = new THREE.Group(); g.add(strawG);
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1, 24, 1, true), new THREE.MeshPhysicalMaterial({ map: strawT, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false })); straw.renderOrder = 4; strawG.add(straw);
  const inStrawT = SLUSH_T.clone(); inStrawT.repeat.set(1, 6); inStrawT.needsUpdate = true;
  const inStraw = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 16), new THREE.MeshPhysicalMaterial({ map: inStrawT, roughness: 0.3, emissive: 0x0a3a90, emissiveIntensity: 0.4 })); strawG.add(inStraw);
  // condensation
  const N = 230, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false }), N);
  const r = rng(12), dm = new THREE.Object3D(), D = [];
  for (let i = 0; i < N; i++) { const k = 0.06 + r() * 0.8, a = r() * Math.PI * 2, s = 0.004 + Math.pow(r(), 3) * 0.012; D.push({ k, a, s, run: i < 5 ? 0.3 + r() * 0.5 : 0 }); }
  g.add(drops);
  const api = {
    level: 1,
    update(t, { level = 1, suck = 0, mouth = null, flow = 0 } = {}) {
      fill.scale.y = Math.max(0.02, level); mound.position.y = 0.006 + H * 0.95 * level; const rr = R(0.95 * level) - 0.01; mound.scale.set(rr, 0.12, rr);
      D.forEach((d, i) => { let k = d.k; if (d.run) k = d.k - ((t * d.run * 0.12 + i * 0.13) % 0.6); const rr2 = R(k) + d.s * 0.4; dm.position.set(Math.cos(d.a) * rr2, k * H, Math.sin(d.a) * rr2); dm.scale.set(d.s, d.s * (d.run ? 1.6 : 1.1), d.s * 0.5); dm.lookAt(0, k * H, 0); dm.updateMatrix(); drops.setMatrixAt(i, dm.matrix); });
      drops.instanceMatrix.needsUpdate = true;
      // straw from inside the cup up to the mouth (in cup space)
      const A = V(0.05, 0.06, 0.02), Bp = mouth ? mouth : V(-0.02, H + 0.45, 0.06);
      const len = A.distanceTo(Bp) + 0.02; strawG.position.copy(A.clone().add(Bp).multiplyScalar(0.5)); strawG.quaternion.setFromUnitVectors(V(0, 1, 0), Bp.clone().sub(A).normalize());
      straw.scale.y = len; const fillLen = len * clamp(suck); inStraw.scale.y = Math.max(0.001, fillLen); inStraw.position.y = -len / 2 + fillLen / 2; inStraw.visible = suck > 0.01;
      inStrawT.offset.y = -t * 2.2 * flow; SLUSH_T.offset.y = 0;
    },
  };
  g.userData = api; g.traverse(o => { if (o.isMesh && o !== cup && o !== lid) o.castShadow = true; });
  return g;
}

// ---------- boardwalk set ----------
const SUMMER_SKY = gradTex([[0, '#fff3dc'], [0.35, '#c4e8ff'], [0.72, '#63b6ef'], [1, '#2a7fd2']], 0.55, 1.12);
function waterMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0x1f8fb8, roughness: 0.12, metalness: 0.0, envMapIntensity: 1.2 });
  m.userData.uT = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = m.userData.uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uT;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 q=vWP.xz;
        float h1=sin(q.x*1.7+uT*1.3)*cos(q.y*1.3-uT*0.9), h2=sin(q.x*4.1-q.y*3.3+uT*2.2), h3=sin(q.x*9.0+q.y*7.0-uT*3.1);
        vec3 pn=normalize(vec3(h1*0.18+h2*0.08+h3*0.04, 1.0, cos(q.y*1.9+uT)*0.15+h2*0.06));
        normal=normalize((viewMatrix*vec4(pn,0.)).xyz);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 cell=floor(vWP.xz*vec2(2.2,3.5)); float hsh=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453); vec2 f=fract(vWP.xz*vec2(2.2,3.5))-0.5;
        float tw=pow(max(0.,sin(uT*(3.0+hsh*5.0)+hsh*40.0)),8.0)*step(0.82,hsh); float gl=tw*exp(-dot(f,f)*90.0)*smoothstep(-70.0,-3.0,vWP.z);
        totalEmissiveRadiance+=vec3(3.0,2.9,2.5)*gl;`);
  };
  return m;
}
function seagull() {
  const g = new THREE.Group(), w = new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.6 }), gr = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: 0.6 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), w); b.scale.set(0.7, 0.7, 1.8); g.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), w); hd.position.set(0, 0.06, 0.28); g.add(hd);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0xffb21a })); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.05, 0.4); g.add(bk);
  const wings = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 0.08, 0.04, 0); g.add(p); const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.015, 0.2), gr); m.position.x = sx * 0.31; p.add(m); const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.14), new THREE.MeshStandardMaterial({ color: 0x2a2e33 })); tip.position.x = sx * 0.66; p.add(tip); return { p, sx }; });
  g.userData.flap = (t) => wings.forEach(({ p, sx }) => p.rotation.z = sx * 0.55 * Math.sin(t * 9));
  return g;
}
function boardwalk(sc) {
  sc.background = SUMMER_SKY; sc.environment = ENV;
  const R = {};
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.9); sun.position.set(5, 9, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02; sun.userData.soft = 0.2; sc.add(sun); R.sun = sun;
  sc.add(new THREE.HemisphereLight(0xcfeaff, 0xc9a27a, 0.7));
  const rim = new THREE.DirectionalLight(0xfff4e0, 1.6); rim.position.set(-4, 5, -6); sc.add(rim);
  // deck
  const plankT = woodTex('#b98a5e', '#6a4728', 51, [1, 6], 8);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(24, 0.25, 6.4), new THREE.MeshStandardMaterial({ map: plankT, bumpMap: plankT, bumpScale: 1.2, roughness: 0.75 })); deck.position.set(0, -0.125, 1.2); deck.receiveShadow = true; sc.add(deck);
  plankT.rotation = Math.PI / 2;
  // railing behind the hero
  const paint = new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: 0.45 });
  for (let i = -12; i <= 12; i++) { const pst = new THREE.Mesh(new RoundedBoxGeometry(0.14, 1.5, 0.14, 2, 0.03), paint); pst.position.set(i * 1.0, 0.75, -1.75); pst.castShadow = pst.receiveShadow = true; sc.add(pst); }
  [0.55, 1.05, 1.5].forEach((y, k) => { const rl = new THREE.Mesh(new RoundedBoxGeometry(24, k === 2 ? 0.1 : 0.07, k === 2 ? 0.2 : 0.07, 2, 0.02), paint); rl.position.set(0, y, -1.75); rl.castShadow = true; sc.add(rl); });
  // sea, far shore, sky
  const wm = waterMat(); const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), wm); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -1.6, -100); sc.add(sea); R.water = wm;
  const hill = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshStandardMaterial({ color: 0x6aa57a, roughness: 1 })); hill.scale.set(2.2, 0.28, 1); hill.position.set(-60, -2, -150); sc.add(hill);
  const hill2 = hill.clone(); hill2.position.set(40, -3, -170); hill2.scale.set(1.8, 0.22, 1); sc.add(hill2);
  for (let i = 0; i < 6; i++) { const c = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.35 }); for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(2 + (k % 3), 16, 12), m); s.position.set(k * 2.6 - 6, Math.sin(k * 1.7) * 1.2, 0); s.scale.y = 0.6; c.add(s); } c.position.set(-60 + i * 26, 18 + (i % 3) * 5, -140); sc.add(c); }
  const sail = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff })); sail.add(hull); const sl = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 3), new THREE.MeshStandardMaterial({ color: 0xfff4e8 })); sl.position.y = 1.5; sl.scale.z = 0.08; sail.add(sl); sail.position.set(14, -1.4, -60); sc.add(sail); R.sail = sail;
  // slush cart with striped awning and two spinning tanks
  const cart = new THREE.Group(); cart.position.set(-3.4, 0, -0.6); cart.rotation.y = 0.45; sc.add(cart); R.cart = cart;
  const cartM = new THREE.MeshStandardMaterial({ color: 0x3fb6e8, roughness: 0.4 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.4, 1.3, 1.1, 3, 0.06), cartM); body.position.y = 0.95; body.castShadow = true; cart.add(body);
  const top = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.1, 1.25, 2, 0.03), paint); top.position.y = 1.65; cart.add(top);
  const stripeT = canvasTex(512, 128, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#ff4a5c'; c.fillRect(i * 32, 0, 32, h); } c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, h - 18, w, 18); });
  const aw = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.8, 32, 1, true, -Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ map: stripeT, side: THREE.DoubleSide, roughness: 0.7 })); aw.rotation.z = Math.PI / 2; aw.position.set(0, 2.9, -0.2); aw.castShadow = true; cart.add(aw);
  [-1.25, 1.25].forEach(x => { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 12), M.chrome); pl.position.set(x, 2.35, 0.45); cart.add(pl); });
  const tanks = [0x2f8fff, 0xff3a5a].map((col, i) => { const tg = new THREE.Group(); tg.position.set(-0.45 + i * 0.9, 1.7, 0.05); cart.add(tg); const glass = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.5), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.25, depthWrite: false })); glass.position.y = 0.36; tg.add(glass); const sl2 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.5, 0.46), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.35, emissive: col, emissiveIntensity: 0.25 })); sl2.position.y = 0.27; tg.add(sl2); const aug = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), M.chrome); aug.rotation.z = Math.PI / 2; aug.position.y = 0.32; tg.add(aug); const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.2), M.chrome); aug.add(blade); return blade; });
  R.tanks = tanks;
  const sign = textPlane('SLUSH', 1.6, '#ffffff', '#1a5fd0'); sign.position.set(0, 2.55, 0.62); sign.userData.dofMap = sign.material.map; cart.add(sign);
  const gull = seagull(); sc.add(gull); R.gull = gull;
  R.update = (t) => { wm.userData.uT.value = t; tanks.forEach((b, i) => b.rotation.x = t * (4 + i)); gull.userData.flap(t); sail.position.x = 14 - t * 0.15; };
  return R;
}

// =====================================================================
// ANATOMY: the roof of the mouth up close, and a cutaway head
// =====================================================================
function nerveMat(base = 0xffc23a, hot = 0xfff4c8) {
  return new THREE.ShaderMaterial({
    uniforms: { base: { value: new THREE.Color(base) }, hot: { value: new THREE.Color(hot) }, uT: { value: 0 }, on: { value: 0 }, front: { value: 0 }, speed: { value: 1.6 }, dens: { value: 4 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 base; uniform vec3 hot; uniform float uT; uniform float on; uniform float front; uniform float speed; uniform float dens; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float x=vUv.x; float lit=smoothstep(front,front-0.08,x); float ph=fract(x*dens-uT*speed); float q=(ph-0.5)/0.07; float pulse=exp(-q*q)*lit;
        float rimf=pow(max(0.,1.-abs(dot(normalize(vN),normalize(vV)))),1.3); vec3 c=base*(0.25+0.75*rimf)*(0.35+0.65*on*lit+0.25) + hot*(pulse*2.6+exp(-((x-front)/0.025)*((x-front)/0.025))*3.0)*on;
        gl_FragColor=vec4(c,1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
}
// blood vessel: radial swell, flowing cells, cold (dark, slow) and heat (bright)
function vesselMat(base = 0xb3182a, r = 0.016) {
  const m = new THREE.MeshPhysicalMaterial({ color: base, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x7a0612, emissiveIntensity: 1 });
  const U = { uSwell: { value: 0 }, uT: { value: 0 }, uFlow: { value: 1 }, uHeat: { value: 0 }, uCold: { value: 0 } };
  m.userData.U = U; m.userData.r = r;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSwell; varying vec2 vUv2;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUv2 = uv; transformed += normal * uSwell;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uFlow; uniform float uHeat; uniform float uCold; varying vec2 vUv2;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22,0.1,0.28), uCold*0.75);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float cells = pow(0.5 + 0.5*sin(vUv2.x*70.0 - uT*uFlow*10.0), 3.0);
        totalEmissiveRadiance = totalEmissiveRadiance*(1.0-uCold*0.85)*(0.75 + 0.35*cells) + vec3(1.15,0.07,0.06)*uHeat*(0.8+0.3*cells);`);
  };
  m.userData.set = (t, swell, { flow = 1, heat = 0, cold = 0 } = {}) => { U.uT.value = t; U.uSwell.value = swell * r; U.uFlow.value = flow; U.uHeat.value = heat; U.uCold.value = cold; };
  return m;
}
const MUCOSA_B = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(14); for (let i = 0; i < 1600; i++) { g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(r() * w, r() * h, 0.6 + r() * 2.2, 0, 7); g.fill(); } }, { rep: [4, 4], srgb: false });

// ---------- the roof of the mouth, seen from inside the mouth ----------
function palateSet(sc) {
  sc.background = new THREE.Color(0x140305); sc.environment = tintedEnv(0.55, 0.38, 0.38);
  const R = {};
  const wxz = z => 0.62 - 0.2 * Math.pow(Math.max(z, 0) / 1.45, 2.2);
  const Hh = (u, z) => { const arch = Math.sqrt(Math.max(0, 1 - u * u)), front = 1 - smooth(1.05, 1.5, z) * 0.85, back = smooth(-0.1, 0.25, z);
    let y = 0.4 * arch * front * (0.75 + 0.25 * back);
    const rz = (z - 0.85) / 0.5; if (rz > 0 && rz < 1) y -= 0.02 * Math.pow(Math.max(0, Math.sin((z - 0.85) * 30 + 0.9 * Math.sin(u * 3.2))), 2) * (1 - u * u) * Math.sin(Math.PI * rz);
    y -= 0.009 * Math.exp(-((u / 0.05) ** 2)) * (z < 1.25 ? 1 : 0);
    y -= 0.035 * Math.exp(-((u * 0.6) ** 2 + (z - 1.3) ** 2) / 0.003);
    return y + 0.004 * noise3(u * 9, z * 9, 2); };
  const SP = (u, z) => V(u * wxz(z) * 1.05, Hh(u, z), z);
  const NX = 110, NZ = 140, geo = new THREE.PlaneGeometry(1, 1, NX, NZ), pa = geo.attributes.position, uva = geo.attributes.uv;
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const u = -1 + 2 * i / NX, z = -0.05 + 1.55 * j / NZ, p = SP(u, z); pa.setXYZ(j * (NX + 1) + i, p.x, p.y, p.z); uva.setXY(j * (NX + 1) + i, (p.x + 0.66) / 1.32, (p.z + 0.05) / 1.55); }
  geo.computeVertexNormals();
  const mucM = new THREE.MeshPhysicalMaterial({ color: 0xe17a86, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.5, sheenColor: new THREE.Color(0xffc4cc), bumpMap: MUCOSA_B, bumpScale: 0.8, emissive: 0x2a0408, side: THREE.DoubleSide });
  const roof = new THREE.Mesh(geo, mucM); roof.receiveShadow = true; sc.add(roof); R.mucM = mucM; R.baseCol = mucM.color.clone();
  // frost layer just under the surface
  const fm = frostMat(frostTex(11)); fm.uniforms.tint.value.set(1.2, 1.4, 1.7); fm.fragmentShader = fm.fragmentShader.replace('float d=distance(vUv,vec2(0.5));', 'float d=distance(vUv,vec2(0.5,0.5))*1.15;');
  const fg = geo.clone(), fpa = fg.attributes.position; for (let i = 0; i < fpa.count; i++) fpa.setY(i, fpa.getY(i) - 0.004); const frost = new THREE.Mesh(fg, fm); frost.renderOrder = 4; sc.add(frost); R.frost = fm;
  // teeth along the arch
  const toothM = new THREE.MeshPhysicalMaterial({ color: 0xfff8ee, roughness: 0.18, clearcoat: 1, sheen: 0.3 });
  const gumM = new THREE.MeshPhysicalMaterial({ color: 0xd8667a, roughness: 0.3, clearcoat: 1 });
  for (let k = 0; k < 14; k++) {
    const a = -1 + 2 * k / 13, side = Math.sign(a) || 1, z = 1.42 - Math.pow(Math.abs(a), 1.6) * 1.25, x = side * wxz(z) * 1.1 * Math.min(1, Math.abs(a) * 1.6 + 0.25);
    const molar = Math.abs(a) > 0.55, w = molar ? 0.15 : 0.1, d = molar ? 0.15 : 0.07;
    const tooth = new THREE.Mesh(new RoundedBoxGeometry(w, 0.2, d, 3, 0.04), toothM); tooth.position.set(x, -0.1, z); tooth.lookAt(0, -0.08, 0.3); tooth.visible = false; sc.add(tooth);
  }
  { const pts = []; for (let k = 0; k <= 40; k++) { const a = -1 + 2 * k / 40, side = Math.sign(a) || 1, z = 1.42 - Math.pow(Math.abs(a), 1.6) * 1.25; pts.push(V(side * wxz(z) * 1.1 * Math.min(1, Math.abs(a) * 1.6 + 0.25), 0.0, z)); }
    const ridge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.06, 16), gumM); ridge.scale.y = 0.7; sc.add(ridge); }
  // vessels lying on the surface
  const mats = { main: vesselMat(0xb3182a, 0.017), br: vesselMat(0xa8162a, 0.009), cap: vesselMat(0x9a1430, 0.005) }; R.vmats = mats;
  const r = rng(21), tube = (pts, rad, m) => { const c = new THREE.CatmullRomCurve3(pts.map(([u, z]) => SP(u, z).add(V(0, -0.006 - rad * 0.4, 0)))); const t = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 12), rad, 10), m); t.castShadow = true; sc.add(t); };
  [-1, 1].forEach(sd => {
    const main = []; for (let k = 0; k <= 10; k++) { const z = 0.08 + k * 0.12; main.push([sd * (0.72 - 0.06 * Math.sin(k * 0.9)), z]); } tube(main, 0.017, mats.main);
    for (let k = 1; k <= 9; k++) {
      const z0 = 0.08 + k * 0.12, br = []; let u = sd * 0.7, z = z0; for (let s = 0; s < 6; s++) { br.push([u, z]); u -= sd * (0.08 + r() * 0.04); z += 0.02 + (r() - 0.3) * 0.05; }
      tube(br, 0.009, mats.br);
      for (let c2 = 0; c2 < 3; c2++) { const s0 = 1 + Math.floor(r() * 4), cp = []; let cu = br[s0][0], cz = br[s0][1]; const dir = r() < 0.5 ? 1 : -1; for (let s = 0; s < 5; s++) { cp.push([cu, cz]); cu -= sd * 0.035 * r(); cz += dir * (0.025 + r() * 0.02); } tube(cp, 0.005, mats.cap); }
    }
  });
  // icy slush pressed against the roof
  const blobG = new THREE.SphereGeometry(1, 64, 40), bp = blobG.attributes.position;
  for (let i = 0; i < bp.count; i++) { const v = V(bp.getX(i), bp.getY(i), bp.getZ(i)); const k = 1 + 0.18 * noise3(v.x * 3, v.y * 3, v.z * 3) + 0.06 * noise3(v.x * 9, v.y * 9, v.z * 9); bp.setXYZ(i, v.x * k, v.y * k, v.z * k); }
  blobG.computeVertexNormals();
  const blob = new THREE.Mesh(blobG, slushMat()); blob.scale.set(0.15, 0.09, 0.13); blob.castShadow = true; sc.add(blob); R.blob = blob;
  const crys = []; for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.006 + r() * 0.006), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, clearcoat: 1, emissive: 0x3a6aa0 })); sc.add(m); crys.push([m, r() * 6.28, r(), r()]); } R.crys = crys;
  const mist = []; for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05 + r() * 0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.0, depthWrite: false })); sc.add(m); mist.push([m, r() * 6.28, r(), r()]); } R.mist = mist;
  // lights: warm light from the lips, a soft fill, a red bounce from the tongue
  const key = new THREE.SpotLight(0xffe2d0, 40, 8, 0.9, 0.8, 2); key.position.set(0.5, -0.9, 2.6); key.target.position.set(0, 0.2, 0.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.userData.soft = 0.15; sc.add(key, key.target);
  const fill = new THREE.PointLight(0xffb0a0, 3, 6, 2); fill.position.set(-0.6, -0.8, 0.4); sc.add(fill);
  const bounce = new THREE.PointLight(0xff4050, 4, 4, 2); bounce.position.set(0, -1.0, 0.8); sc.add(bounce); R.bounce = bounce;
  R.SP = SP;
  R.update = (t, { swell = 0, flow = 1, heat = 0, cold = 0, frostR = 0, frostOp = 1, blobOn = 1, flush = 0 } = {}) => {
    Object.values(mats).forEach(m => m.userData.set(t, swell, { flow, heat, cold }));
    fm.uniforms.uR.value = frostR; fm.uniforms.uOp.value = frostOp;
    mucM.color.copy(R.baseCol).lerp(new THREE.Color(0xc8d8f0), 0.45 * cold).lerp(new THREE.Color(0xff5060), 0.35 * flush);
    mucM.emissive.setRGB(0.16 * flush + 0.02, 0.02, 0.03 + 0.08 * cold);
    const c = SP(0, 0.95); blob.position.set(c.x, c.y - 0.1 + 0.01 * Math.sin(t * 3), c.z); blob.visible = blobOn > 0.01; blob.scale.set(0.15, 0.09 * blobOn + 0.0001, 0.13);
    crys.forEach(([m, a, k, s]) => { const rr = 0.14 + k * 0.14; m.position.set(c.x + Math.cos(a + t * 0.2) * rr, c.y - 0.08 - s * 0.12 + 0.01 * Math.sin(t * 2 + a), c.z + Math.sin(a + t * 0.2) * rr * 0.8); m.rotation.set(t + a, t * 0.7, a); m.visible = blobOn > 0.5; });
    mist.forEach(([m, a, k, s]) => { const age = (t * 0.25 + k) % 1; m.position.set(c.x + Math.cos(a) * (0.2 + age * 0.4), c.y - 0.25 - age * 0.3, c.z + Math.sin(a) * (0.2 + age * 0.3)); m.scale.setScalar(0.6 + age * 1.6); m.material.opacity = 0.16 * Math.sin(Math.PI * age) * cold; });
    bounce.intensity = 3 + 5 * heat;
  };
  return R;
}

// ---------- a cutaway head (sagittal section), like an anatomy model ----------
function cr1(pts, y) {
  if (y <= pts[0][0]) return pts[0][1]; if (y >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  let i = 0; while (pts[i + 1][0] < y) i++;
  const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)], t = (y - p1[0]) / (p2[0] - p1[0]), t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
}
const gss = (y, c, w) => Math.exp(-(((y - c) / w) ** 2));
const HFACE = [[-1.6, 0.3], [-1.2, 0.31], [-1.03, 0.36], [-0.95, 0.52], [-0.86, 0.72], [-0.72, 0.78], [-0.5, 0.8], [-0.3, 0.8], [0.0, 0.8], [0.2, 0.79], [0.35, 0.8], [0.6, 0.73], [0.8, 0.58], [0.95, 0.36], [1.04, 0.1], [1.08, -0.15]];
const HBACK = [[-1.6, -0.46], [-1.0, -0.5], [-0.75, -0.56], [-0.55, -0.76], [-0.3, -0.93], [0.0, -1.02], [0.35, -1.0], [0.7, -0.86], [0.95, -0.58], [1.04, -0.35], [1.08, -0.15]];
const HW = [[-1.6, 0.4], [-1.0, 0.42], [-0.8, 0.5], [-0.5, 0.6], [-0.2, 0.66], [0.2, 0.72], [0.5, 0.7], [0.8, 0.55], [0.95, 0.38], [1.04, 0.2], [1.08, 0.02]];
const hDet = y => {
  const nb = y > -0.2 ? Math.max(0, 1 - (y + 0.2) / 0.36) ** 1.15 * (y < 0.16 ? 1 : 0) : Math.max(0, 1 - ((-0.2 - y) / 0.11) ** 2);
  return 0.27 * nb - 0.03 * gss(y, 0.17, 0.05) + 0.035 * gss(y, 0.3, 0.07) + 0.075 * gss(y, -0.42, 0.045) - 0.02 * gss(y, -0.5, 0.02) + 0.065 * gss(y, -0.585, 0.045) - 0.025 * gss(y, -0.68, 0.035) + 0.05 * gss(y, -0.84, 0.07);
};
const hFront = y => cr1(HFACE, y) + hDet(y), hBack = y => cr1(HBACK, y);
function headOutline(n = 220) {
  const pts = []; for (let i = 0; i <= n; i++) { const y = -1.6 + 2.68 * i / n; pts.push([hFront(y), y]); }
  for (let i = n - 1; i > 0; i--) { const y = -1.6 + 2.68 * i / n; pts.push([hBack(y), y]); }
  return pts;
}
function offsetPoly(P, d) {
  const n = P.length; return P.map((p, i) => { const a = P[(i - 1 + n) % n], b = P[(i + 1) % n]; const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]]; const n1 = [-e1[1], e1[0]], n2 = [-e2[1], e2[0]]; const l1 = Math.hypot(...n1) || 1, l2 = Math.hypot(...n2) || 1; let nx = n1[0] / l1 + n2[0] / l2, ny = n1[1] / l1 + n2[1] / l2; const l = Math.hypot(nx, ny) || 1; return [p[0] + nx / l * d, p[1] + ny / l * d]; });
}
const SKULL_BASE = [[-1.0, -0.44], [-0.62, -0.4], [-0.36, -0.3], [-0.12, -0.16], [0.18, -0.05], [0.45, 0.04], [0.7, 0.11], [0.9, 0.14]];
const baseAt = (x, lift = 0) => { const P = SKULL_BASE; if (x <= P[0][0]) return P[0][1] + lift; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const k = (x - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return lerp(P[i - 1][1], P[i][1], k) + lift; } return P[P.length - 1][1] + lift; };
function cranial(off, lift) {
  const P = offsetPoly(headOutline(220), off); const sel = P.filter(([x, y]) => y > baseAt(x, lift));
  const base = []; for (let k = 0; k <= 30; k++) { const x = lerp(sel[sel.length - 1][0], sel[0][0], k / 30); base.push([x, baseAt(x, lift)]); }
  return sel.concat(base);
}
function shapeOf(pts, smoothIt = false) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  if (smoothIt) s.splineThru(pts.slice(1).concat([pts[0]]).map(p => new THREE.Vector2(p[0], p[1]))); else pts.slice(1).forEach(p => s.lineTo(p[0], p[1]));
  s.closePath(); return s;
}
function ellipsePts(cx, cy, rx, ry, rot = 0, n = 40) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return o; }
const GYRI = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); const r = rng(31); g.lineCap = 'round';
  for (let i = 0; i < 140; i++) { let x = r() * w, y = r() * h, a = r() * 6.28; g.strokeStyle = 'rgba(40,40,40,0.75)'; g.lineWidth = 3 + r() * 3; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { a += (r() - 0.5) * 1.6; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke(); } }, { rep: [2.5, 2.5], srgb: false });
const FOLIA = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(30,30,30,0.8)'; g.lineWidth = 2; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(w * 0.3, h * 0.5, 30 + i * 9, 18 + i * 6, 0, -1.3, 1.3); g.stroke(); } }, { rep: [1.5, 1.5], srgb: false });
const BONE_B = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#909090'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(30,30,30,0.5)'; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 2.4, 0, 7); g.fill(); } }, { rep: [4, 4], srgb: false });
function cutawayHead(sc, { skin = 0xe2a27e } = {}) {
  const G = new THREE.Group(); sc.add(G); const R = { G };
  // exterior: the profile swept back into a rounded half head
  const NY = 140, NT = 80, geo = new THREE.PlaneGeometry(1, 1, NT, NY), pa = geo.attributes.position;
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NT; i++) {
    const y = -1.6 + 2.68 * (1 - j / NY), th = Math.PI * i / NT, xf = cr1(HFACE, y), xb = hBack(y), xc = (xf + xb) / 2, a = (xf - xb) / 2, b = cr1(HW, y);
    pa.setXYZ(j * (NT + 1) + i, xc + a * Math.cos(th) + hDet(y) * Math.exp(-((th / 0.2) ** 2)), y, -b * Math.sin(th));
  }
  geo.computeVertexNormals();
  const skinM = new THREE.MeshPhysicalMaterial({ color: skin, roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color(0xffd2c0), sheenRoughness: 0.45, clearcoat: 0.12, side: THREE.DoubleSide });
  const ext = new THREE.Mesh(geo, skinM); ext.castShadow = ext.receiveShadow = true; G.add(ext); R.skinM = skinM;
  const eyeY = 0.2, eyeX = cr1(HFACE, eyeY) - 0.1;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), skinM); eye.position.set(eyeX, eyeY, -0.3); eye.rotation.set(0, 0, -Math.PI / 2); G.add(eye);
  const lash = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.007, 6, 30, Math.PI), new THREE.MeshStandardMaterial({ color: 0x24160f })); lash.position.copy(eye.position); lash.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.3); G.add(lash);
  const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.16, 4, 10), new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.8 })); brow.position.set(eyeX + 0.02, 0.36, -0.3); brow.rotation.set(0, 0.5, Math.PI / 2 - 0.2); G.add(brow);
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), skinM); ear.scale.set(0.55, 1, 0.3); ear.position.set(-0.32, 0.02, -cr1(HW, 0.02) + 0.02); G.add(ear);
  // the cut face, built from raised layers
  const layer = (pts, color, z, opt = {}) => {
    const m = opt.mat || new THREE.MeshPhysicalMaterial({ color, roughness: opt.rough ?? 0.5, clearcoat: opt.coat ?? 0.3, clearcoatRoughness: 0.3, bumpMap: opt.bump || null, bumpScale: opt.bumpS ?? 1, sheen: opt.sheen ?? 0, emissive: opt.emissive ?? 0x000000 });
    if (!opt.noOutline) { const oc = new THREE.Color(color || (opt.mat && opt.mat.color) || 0x888888).multiplyScalar(0.55); const og = new THREE.ExtrudeGeometry(shapeOf(offsetPoly(pts, -0.007), opt.smooth), { depth: 0.008, bevelEnabled: false, curveSegments: 48 }); const om = new THREE.Mesh(og, new THREE.MeshStandardMaterial({ color: oc, roughness: 0.6 })); om.position.z = z - 0.016; G.add(om); }
    const g2 = new THREE.ExtrudeGeometry(shapeOf(pts, opt.smooth), { depth: 0.01, bevelEnabled: true, bevelThickness: 0.008, bevelSize: opt.bevel ?? 0.007, bevelSegments: 3, curveSegments: 48 });
    // planar UVs so bump textures sit right on the cut face
    const p2 = g2.attributes.position, u2 = g2.attributes.uv; for (let i = 0; i < p2.count; i++) u2.setXY(i, p2.getX(i) * 0.9, p2.getY(i) * 0.9);
    const mesh = new THREE.Mesh(g2, m); mesh.position.z = z - 0.014; mesh.castShadow = false; mesh.receiveShadow = true; G.add(mesh); return mesh;
  };
  const OUT = headOutline(220);
  layer(OUT, 0xd38a7c, 0.0, { rough: 0.55, coat: 0.25, bump: MUCOSA_B, bumpS: 0.6, noOutline: true });
  layer(cranial(0.045, -0.02), 0xefe2c6, 0.008, { bump: BONE_B, bumpS: 0.8, rough: 0.6 });
  R.brain = layer(cranial(0.13, 0.06), 0xeeb0ba, 0.016, { bump: GYRI, bumpS: 2.2, rough: 0.45, coat: 0.5, smooth: false });
  layer(ellipsePts(-0.62, -0.2, 0.25, 0.16, 0.25), 0xd88e9e, 0.02, { bump: FOLIA, bumpS: 1.6, rough: 0.45, coat: 0.5 });
  layer([[-0.36, 0.5], [0.0, 0.58], [0.34, 0.47], [0.36, 0.41], [0.0, 0.5], [-0.34, 0.43]], 0xfff1e8, 0.022, { smooth: true });
  layer(ellipsePts(0.0, 0.34, 0.26, 0.06, 0.05), 0x7a3040, 0.018);
  layer([[-0.12, 0.08], [0.02, 0.0], [-0.08, -0.25], [-0.2, -0.5], [-0.3, -0.9], [-0.36, -1.6], [-0.44, -1.6], [-0.4, -0.9], [-0.32, -0.5], [-0.26, -0.2], [-0.24, 0.05]], 0xf2d2a6, 0.022, { smooth: false, rough: 0.5 });
  for (let k = 0; k < 7; k++) { const y = -0.56 - k * 0.15; layer([[-0.06 - k * 0.012, y], [-0.26 - k * 0.012, y - 0.01], [-0.27 - k * 0.012, y - 0.12], [-0.07 - k * 0.012, y - 0.115]], 0xefe2c6, 0.014, { bump: BONE_B, bumpS: 0.8, bevel: 0.01 }); layer([[-0.07 - k * 0.012, y - 0.118], [-0.26 - k * 0.012, y - 0.125], [-0.26 - k * 0.012, y - 0.142], [-0.07 - k * 0.012, y - 0.137]], 0xbcd0e2, 0.012); }
  layer([[0.95, -0.27], [0.86, -0.06], [0.74, 0.1], [0.55, 0.13], [0.3, 0.07], [0.1, -0.04], [0.02, -0.18], [0.0, -0.3], [0.2, -0.29], [0.5, -0.285], [0.82, -0.29]], 0x3a0a12, 0.004, { rough: 0.7, coat: 0.6 });
  [[0.45, 0.04, 0.24, 0.035, -0.05], [0.42, -0.09, 0.28, 0.042, -0.04], [0.4, -0.21, 0.3, 0.036, -0.02]].forEach(([x, y, a, b, r]) => layer(ellipsePts(x, y, a, b, r), 0xe07080, 0.012, { rough: 0.3, coat: 1 }));
  layer(ellipsePts(0.62, 0.3, 0.06, 0.035, 0.6), 0x3a0a12, 0.012);
  layer([[0.0, -0.28], [0.12, -0.36], [0.14, -0.6], [0.17, -0.9], [0.22, -1.6], [0.02, -1.6], [-0.03, -0.9], [-0.06, -0.5], [-0.08, -0.32]], 0x3a0a12, 0.004, { rough: 0.7, coat: 0.6 });
  layer([[0.87, -0.37], [0.6, -0.395], [0.3, -0.385], [0.12, -0.47], [0.08, -0.6], [0.3, -0.58], [0.6, -0.52], [0.86, -0.51]], 0x3a0a12, 0.004, { rough: 0.7, coat: 0.6 });
  R.palateM = new THREE.MeshPhysicalMaterial({ color: 0xe07482, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x000000 });
  layer([[0.86, -0.3], [0.86, -0.36], [0.5, -0.378], [0.22, -0.365], [0.16, -0.335], [0.22, -0.303], [0.5, -0.297]], 0, 0.022, { mat: R.palateM });
  layer([[0.84, -0.322], [0.5, -0.338], [0.24, -0.333], [0.24, -0.318], [0.5, -0.318], [0.84, -0.31]], 0xefe2c6, 0.026, { bevel: 0.002 });
  layer([[0.2, -0.31], [0.12, -0.36], [0.06, -0.42], [0.035, -0.48], [0.055, -0.49], [0.09, -0.44], [0.16, -0.39], [0.22, -0.36]], 0, 0.022, { mat: R.palateM, smooth: true });
  layer([[0.835, -0.31], [0.875, -0.34], [0.87, -0.455], [0.85, -0.47], [0.825, -0.41]], 0xfffaf0, 0.026, { rough: 0.15, coat: 1 });
  layer([[0.82, -0.6], [0.85, -0.55], [0.86, -0.48], [0.84, -0.475], [0.81, -0.55]], 0xfffaf0, 0.026, { rough: 0.15, coat: 1 });
  layer([[0.8, -0.58], [0.85, -0.66], [0.87, -0.82], [0.8, -0.9], [0.6, -0.93], [0.5, -0.85], [0.62, -0.73], [0.74, -0.63]], 0xefe2c6, 0.012, { bump: BONE_B, bumpS: 0.8, smooth: true });
  layer([[0.87, -0.35], [0.95, -0.39], [0.97, -0.45], [0.9, -0.49], [0.86, -0.46]], 0xd0606a, 0.012, { smooth: true, rough: 0.3, coat: 0.8 });
  layer([[0.86, -0.52], [0.95, -0.55], [0.94, -0.62], [0.86, -0.62]], 0xd0606a, 0.012, { smooth: true, rough: 0.3, coat: 0.8 });
  // tongue: rebuilt every frame so it can rise and press the palate
  const tongueM = new THREE.MeshPhysicalMaterial({ color: 0xd85a6a, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, bumpMap: MUCOSA_B, bumpScale: 1.2, sheen: 0.4, sheenColor: new THREE.Color(0xffb0b8) });
  const tongue = new THREE.Mesh(new THREE.BufferGeometry(), tongueM); tongue.position.z = 0.03 - 0.014; G.add(tongue); R.tongueM = tongueM;
  R.setTongue = (press = 0) => {
    const top = (x) => lerp(-0.425 - 0.03 * Math.sin((x - 0.15) * 4), -0.386, press * smooth(0.12, 0.3, x) * (1 - smooth(0.72, 0.8, x)));
    const pts = [[0.78, -0.47], [0.7, top(0.7) - 0.01], [0.6, top(0.6)], [0.48, top(0.48)], [0.36, top(0.36)], [0.24, top(0.24) - 0.02 * (1 - press)], [0.14, -0.5], [0.09, -0.62], [0.12, -0.78], [0.3, -0.86], [0.55, -0.76], [0.72, -0.58]];
    const g2 = new THREE.ExtrudeGeometry(shapeOf(pts, true), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 40 });
    const p2 = g2.attributes.position, u2 = g2.attributes.uv; for (let i = 0; i < p2.count; i++) u2.setXY(i, p2.getX(i) * 1.2, p2.getY(i) * 1.2);
    tongue.geometry.dispose(); tongue.geometry = g2;
  };
  R.setTongue(0);
  // the slush in the mouth
  const blobG = new THREE.SphereGeometry(1, 48, 24), bp = blobG.attributes.position; for (let i = 0; i < bp.count; i++) { const v = V(bp.getX(i), bp.getY(i), bp.getZ(i)); const k = 1 + 0.15 * noise3(v.x * 3, v.y * 3, v.z * 3); bp.setXYZ(i, v.x * k, v.y * k, v.z * k); } blobG.computeVertexNormals();
  const slush = new THREE.Mesh(blobG, slushMat()); slush.scale.set(0.2, 0.045, 0.05); slush.position.set(0.56, -0.405, 0.045); G.add(slush); R.slush = slush;
  // vessels along the palate, in the section
  R.vm = vesselMat(0xb3182a, 0.008);
  [[[0.8, -0.355], [0.6, -0.362], [0.4, -0.36], [0.24, -0.35]], [[0.78, -0.365], [0.55, -0.37], [0.3, -0.365]]].forEach(pts => { const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => V(x, y, 0.04))); G.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.008, 8), R.vm)); });
  // the trigeminal path: palate -> ganglion -> trigeminal ganglion -> over the eye -> forehead
  R.nm = nerveMat(); R.nmFaint = nerveMat(0xb08a30); R.nmFaint.uniforms.dens.value = 3;
  const path = [V(0.52, -0.33, 0.055), V(0.4, -0.22, 0.055), V(0.3, -0.13, 0.055), V(0.12, -0.05, 0.055), V(0.0, 0.0, 0.055), V(0.18, 0.12, 0.055), V(0.45, 0.2, 0.055), V(0.7, 0.26, 0.055), V(0.8, 0.34, 0.055), V(0.79, 0.48, 0.055), V(0.72, 0.62, 0.055)];
  R.nerveCurve = new THREE.CatmullRomCurve3(path);
  G.add(new THREE.Mesh(new THREE.TubeGeometry(R.nerveCurve, 160, 0.014, 10), R.nm));
  [[V(0.0, 0.0, 0.05), V(0.2, -0.2, 0.05), V(0.5, -0.5, 0.05), V(0.75, -0.62, 0.05)], [V(0.0, 0.0, 0.05), V(0.3, -0.1, 0.05), V(0.62, -0.08, 0.05), V(0.85, -0.1, 0.05)]].forEach(p => G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 60, 0.008, 8), R.nmFaint)));
  const gang = [[0.4, -0.22, 0.03], [0.0, 0.0, 0.045]].map(([x, y, r]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0xffd060, emissive: 0x8a5a00, roughness: 0.3, clearcoat: 1 })); m.position.set(x, y, 0.055); m.scale.z = 0.5; G.add(m); return m; }); R.gang = gang;
  // pain at the forehead, cold at the palate
  R.pain = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 20), glow(0xff3a20, 0)); R.pain.position.set(0.68, 0.54, 0.06); R.pain.scale.z = 0.3; G.add(R.pain);
  R.coldGlow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20), glow(0x5ab8ff, 0)); R.coldGlow.position.set(0.55, -0.36, 0.06); R.coldGlow.scale.set(1.4, 0.35, 0.3); G.add(R.coldGlow);
  R.warmGlow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20), glow(0xff8a30, 0)); R.warmGlow.position.set(0.5, -0.37, 0.06); R.warmGlow.scale.set(1.5, 0.35, 0.3); G.add(R.warmGlow);
  const crk = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48), frostMat(frostTex(19))); crk.material.uniforms.tint.value.set(2.2, 0.8, 0.5); crk.position.set(0.68, 0.54, 0.064); G.add(crk); R.crack = crk.material;
  R.palCol = R.palateM.color.clone();
  R.update = (t, { cold = 0, warm = 0, swell = 0, heat = 0, nerve = 0, front = 0, pain = 0, press = 0, slushOn = 1 } = {}) => {
    R.palateM.color.copy(R.palCol).lerp(new THREE.Color(0xd8e8ff), 0.6 * cold).lerp(new THREE.Color(0xff6a4a), 0.3 * warm);
    R.palateM.emissive.setRGB(0.05 * warm + 0.08 * heat, 0.02 * warm, 0.12 * cold);
    R.coldGlow.material.opacity = 0.55 * cold * (0.85 + 0.15 * Math.sin(t * 5)); R.warmGlow.material.opacity = 0.6 * warm;
    R.vm.userData.set(t, swell, { flow: 1 + heat, heat, cold });
    [R.nm, R.nmFaint].forEach(m => { m.uniforms.uT.value = t; m.uniforms.on.value = nerve; m.uniforms.front.value = front; }); R.nmFaint.uniforms.on.value = nerve * 0.25;
    gang.forEach((g2, i) => g2.material.emissive.setRGB(0.55 + 2.5 * nerve * (front > (i ? 0.45 : 0.18) ? 1 : 0), 0.35 + 1.3 * nerve * (front > (i ? 0.45 : 0.18) ? 1 : 0), 0));
    R.pain.material.opacity = 0.85 * pain * (0.8 + 0.2 * Math.sin(t * 14)); R.pain.scale.set(0.8 + 0.4 * pain, 0.8 + 0.4 * pain, 0.3);
    R.crack.uniforms.uR.value = 0.5 * pain; R.crack.uniforms.uOp.value = Math.min(1, pain * 1.4);
    slush.visible = slushOn > 0.01; slush.scale.set(0.2, 0.045 * slushOn + 0.0001, 0.05);
  };
  return R;
}
function anatomyStudio(sc) {
  sc.background = gradTex([[0, '#2c4a5c'], [0.45, '#14242f'], [1, '#070d12']], 0.5, 0.42); sc.environment = tintedEnv(0.55, 0.6, 0.7);
  const key = new THREE.DirectionalLight(0xfff2e6, 2.6); key.position.set(2.5, 4, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 }); key.shadow.bias = -0.0003; key.userData.soft = 0.15; sc.add(key);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 2.2); rim.position.set(-4, 3, -3); sc.add(rim);
  sc.add(new THREE.HemisphereLight(0xbfdcff, 0x302020, 0.55));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshStandardMaterial({ color: 0x1b2a33, roughness: 0.35, metalness: 0.2 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.62; floor.receiveShadow = true; sc.add(floor);
  const dust = []; const r = rng(4); for (let i = 0; i < 50; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008 + r() * 0.01, 6, 4), glow(0x9fd8ff, 0.35)); m.position.set((r() - 0.5) * 6, -1.5 + r() * 4, -2 - r() * 3); sc.add(m); dust.push(m); }
}

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

// =====================================================================
// SHOTS
// =====================================================================
const HERO = KIDS[0];
// the hero on the boardwalk, with every acting control in one place
function heroSet(s) {
  const sc = s.scene; const R = boardwalk(sc); const K = makeKid(HERO); addSmile(K); sc.add(K);
  const cup = makeSlushie(); K.add(cup); const fr = foreheadFrost(K); const u = K.userData;
  const breath = []; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0, depthWrite: false })); sc.add(m); breath.push(m); }
  const shards = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 0), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, clearcoat: 1, emissive: 0x5a8ac0, transparent: true, opacity: 1 })); m.scale.set(0.5, 2.2, 0.5); sc.add(m); shards.push(m); }
  const mist = []; for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 6), new THREE.MeshBasicMaterial({ color: 0xdcefff, transparent: true, opacity: 0, depthWrite: false })); sc.add(m); mist.push(m); }
  const A = {
    // sip: 1 straw at the lips. lift: 0 cup at chest, 1 cup raised to drink. pain/relief/idea are acting levels
    pose(t, { sip = 1, suck = 1, flow = 1, level = 0.8, pain = 0, frost = 0, frostOp = 1, relief = 0, idea = 0, hand = 0, shiver = 0, ringT = -1, exhale = -1, lift = 1 } = {}) {
      u.reset(); K.position.set(0, 0, 0.2); K.rotation.y = 0.25 + 0.05 * Math.sin(t * 0.7);
      u.breathe(t, 0.32, 0.03);
      const jit = shiver * 0.012; K.position.x += jit * Math.sin(t * 71); K.position.y += jit * 0.5 * Math.sin(t * 53);
      // the cup: at the chest when sipping, lowered and pulled away when the pain hits
      const away = clamp(1 - sip); cup.position.set(lerp(0.14, 0.32, away), lerp(lerp(1.5, 1.66, lift), 1.42, away), lerp(0.62, 0.78, away)); cup.rotation.set(lerp(0.08, -0.15, away), 0, lerp(-0.06, -0.25, away));
      K.updateMatrixWorld(true);
      const mouthW = headPt(K, V(0, -0.2, 0.46)), mouthC = cup.worldToLocal(mouthW.clone()), restC = V(-0.04, 0.62 + 0.45, 0.06);
      cup.userData.update(t, { level, suck: suck * sip, mouth: lv(restC, mouthC, E.io(sip)), flow });
      ik2(K, u.arms[1], worldPt(cup, V(0.22, 0.28, 0.02)), V(1, -1, -0.6).applyQuaternion(K.quaternion)); u.hands[1].curl(0.8);
      // left hand: on the hip, then clamped to the temple
      const hipP = worldPt(K, V(-0.42, 1.42, 0.08)), temple = headPt(K, V(-0.27, 0.2, 0.3));
      ik2(K, u.arms[0], lv(hipP, temple, hand), V(-1, -0.3 + 0.6 * hand, -0.6).applyQuaternion(K.quaternion)); u.hands[0].curl(lerp(0.5, 0.25, hand), hand);
      // face
      const bliss = sip * (1 - pain) * (1 - idea);
      u.setLid(Math.max(lerp(0.12, 0.6, bliss), pain > 0.05 ? lerp(0.6, 1.08, pain) : 0) - 0.25 * idea + 0.1 * u.blink(t, 2) * (1 - pain));
      u.raise(0.5 * bliss + 0.6 * idea); u.wince(pain * (1 - relief));
      if (sip > 0.5) u.mouthOpen(0.05); else u.mouthOpen(0.18 * pain * (1 - relief));
      u.smile(relief); u.cold(Math.max(pain * 0.8, frost * 0.6) * (1 - relief * 0.8));
      u.head.rotation.x += -0.22 * pain * (1 - relief) + 0.12 * idea; u.head.rotation.z += 0.12 * pain * (1 - relief);
      u.arms.forEach(a => a.sh.position.y = 2.25 + 0.05 * pain);
      fr.material.uniforms.uR.value = frost; fr.material.uniforms.uOp.value = frostOp;
      // shockwave ring and cold mist at the forehead
      const fh = headPt(K, V(0, 0.3, 0.5)); const ra = t - ringT, hq = u.head.getWorldQuaternion(new THREE.Quaternion());
      shards.forEach((m, i) => { const on = ringT > 0 && ra > 0 && ra < 0.45; m.visible = on; if (!on) return; const a = i / 12 * Math.PI * 2 + 0.3, d = V(Math.cos(a), Math.sin(a) * 0.8 + 0.2, 0.35).normalize().applyQuaternion(hq); const sp = 0.9 + 0.5 * h3(i, 2, 5); m.position.copy(fh).addScaledVector(d, 0.05 + sp * (1 - Math.exp(-ra * 6)) * 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d); m.material.opacity = 1 - ra / 0.45; m.scale.set(0.5, 2.2 * (1 - ra), 0.5); });
      mist.forEach((m, i) => { const age = (t * 0.6 + i / 16) % 1, a2 = i * 2.4; m.position.copy(fh).add(V(Math.cos(a2) * (0.15 + age * 0.3), age * 0.35, Math.sin(a2) * 0.1 + 0.05)); m.scale.setScalar(0.6 + age * 2); m.material.opacity = 0.18 * frost * frostOp * Math.sin(Math.PI * age); });
      const ea = t - exhale; breath.forEach((m, i) => { const a3 = ea - i * 0.04; m.visible = exhale > 0 && a3 > 0 && a3 < 0.9; if (m.visible) { m.position.copy(mouthW).add(V(0.05 * Math.sin(i), a3 * 0.12, 0.15 + a3 * 0.6)); m.scale.setScalar(0.5 + a3 * 2.5); m.material.opacity = 0.3 * (1 - a3 / 0.9); } });
      R.update(t); R.gull.position.set(-6 + t * 1.6 - 3 * Math.floor((t * 1.6) / 20) * 0, 4.2 + 0.3 * Math.sin(t * 1.3), -6); R.gull.rotation.y = Math.PI / 2;
      return { mouthW, fh };
    },
  };
  return { R, K, u, cup, fr, A };
}

// 0) the hook: slurping a slushie too fast on a hot boardwalk ----------------------------
const OPEN_CAM = [V(1.55, 2.3, 5.5), V(0.05, 2.05, 0.2)];
shot(0, C.fast, (s) => {
  const H = heroSet(s); s.ap = 5; s.exposure = 0.93;
  s.update = (t) => { H.A.pose(t, { sip: 1, suck: 1, flow: 1.6, level: 0.8 - 0.03 * t }); const c = E.io(seg(t, 0, C.fast + 0.3)); shoot(s.cam, lv(OPEN_CAM[0], V(1.05, 2.2, 4.3), c), lv(OPEN_CAM[1], V(0.05, 2.2, 0.2), c), { fov: 38, t }); };
});
// 1) macro: the slush races up the straw ---------------------------------------------------
shot(C.fast, C.a, (s) => {
  const H = heroSet(s); s.ap = 9; s.exposure = 0.93; s.sub = 4;
  s.update = (t) => {
    const { mouthW } = H.A.pose(t, { sip: 1, suck: 1, flow: 3.2, level: 0.74 }); H.u.mouthOpen(0.05);
    const mid = worldPt(H.cup, V(-0.02, 0.78, 0.04)); const c = E.io(seg(t, C.fast, C.a + 0.2));
    shoot(s.cam, lv(mid.clone().add(V(0.95, -0.15, 0.62)), mid.clone().add(V(0.8, -0.05, 0.52)), c), lv(mid.clone().add(V(0, -0.05, 0)), mid.clone().lerp(mouthW, 0.3), c), { fov: 30, t, hand: 0.6 });
  };
});
// 2) the stab: eyes snap shut, hand slaps the temple -----------------------------------------
shot(C.a, C.shoots, (s) => {
  const H = heroSet(s); s.ap = 6; s.exposure = 0.93; s.sub = 4;
  s.update = (t) => {
    const hit = C.stabbing, pain = clamp(spring(t, hit, 2.6, 7)), hand = clamp(spring(t, hit + 0.06, 2.2, 6));
    const { fh } = H.A.pose(t, { sip: 1 - E.out(seg(t, hit, hit + 0.25)), suck: t < hit ? 1 : 0, flow: 2.4, level: 0.72, pain, hand, shiver: pain, frost: 0.12 * smooth(hit + 0.2, C.shoots, t), ringT: hit + 0.05 });
    const zoom = E.out(seg(t, hit, hit + 0.12)), f = headPt(H.K, V(0, 0.05, 0.3));
    shoot(s.cam, f.clone().add(lv(V(0.75, -0.05, 2.7), V(0.55, -0.02, 2.0), zoom)).add(shake(t, 0.025 * jolt(t, hit + 0.1))), f, { fov: lerp(36, 32, zoom), t });
  };
});
// 3) frost cracks spread across the forehead ---------------------------------------------------
shot(C.shoots, C.yousee, (s) => {
  const H = heroSet(s); s.ap = 10; s.exposure = 0.93;
  s.update = (t) => {
    const frost = 0.12 + 0.42 * E.out(seg(t, C.shoots, C.forehead + 0.3));
    const { fh } = H.A.pose(t, { sip: 0, suck: 0, level: 0.72, pain: 1, hand: 1, shiver: 0.7, frost, ringT: C.into });
    const c = E.io(seg(t, C.shoots, C.yousee + 0.3)); const f = headPt(H.K, V(0, 0.22, 0.42));
    shoot(s.cam, f.clone().add(lv(V(0.35, 0.05, 1.45), V(0.22, 0.08, 1.05), c)), f, { fov: 30, t, hand: 0.6 });
  };
});
// 4) inside: a cutaway of the head, the slush against the roof of the mouth ---------------------
shot(C.yousee, C.vessels, (s) => {
  anatomyStudio(s.scene); const A = cutawayHead(s.scene); s.ap = 4; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => {
    const cold = E.io(seg(t, C.yousee + 0.1, C.tiny)); A.update(t, { cold }); A.setTongue(0);
    const c = E.io(seg(t, C.yousee - 0.2, C.vessels + 0.3));
    shoot(s.cam, lv(V(3.3, 0.6, 6.0), V(1.5, -0.2, 2.4), c), lv(V(0.0, -0.2, 0), V(0.5, -0.36, 0), c), { fov: 34, t });
  };
});
// 5-7) the roof of the mouth up close: vessels clamp shut, then flood open ----------------------
function palateShot(start, end, camFn, extra = {}) {
  return shot(start, end, (s) => {
    const P = palateSet(s.scene); s.ap = extra.ap ?? 7; s.exposure = 1.0; s.bloom = 0.42; Object.assign(s, extra);
    s.update = (t) => {
      const clampK = E.in(seg(t, C.clamp - 0.12, C.clamp + 0.18)) * (1 - spring(t, C.then + 0.05, 1.8, 5));
      const open = spring(t, C.then + 0.05, 1.8, 5), throb = t > C.then ? 0.12 * Math.max(0, Math.sin((t - C.then) * Math.PI * 2 * 1.4)) ** 3 : 0;
      const swell = -0.55 * clamp(clampK) + 0.95 * open + throb * (t > C.flood ? 1 : 0);
      const cold = Math.max(0.35 * smooth(C.vessels, C.roof, t), clamp(clampK)) * (1 - 0.7 * clamp(open));
      const heat = clamp(open) * (0.85 + 0.15 * Math.sin(t * 9));
      P.update(t, { swell, cold, heat, flow: lerp(1, 0.15, clamp(clampK)) + 2.2 * clamp(open), frostR: 0.08 + 0.32 * E.out(seg(t, C.vessels, C.shut)), frostOp: 1 - 0.35 * clamp(open), flush: clamp(open) });
      camFn(s, t);
    };
  });
}
palateShot(C.vessels, C.then, (s, t) => { const c = E.io(seg(t, C.vessels - 0.2, C.then + 0.3)); shoot(s.cam, lv(V(0.45, -0.32, -0.05), V(0.38, -0.25, 0.15), c), lv(V(0.1, 0.22, 0.85), V(0.12, 0.25, 0.75), c), { fov: 52, t, hand: 0.6 }); });
palateShot(C.then, C.rush, (s, t) => { const c = E.io(seg(t, C.then - 0.2, C.rush + 0.3)); shoot(s.cam, lv(V(-0.2, -0.18, 0.45), V(-0.12, -0.12, 0.55), c).add(shake(t, 0.008 * jolt(t, C.flood))), lv(V(0.45, 0.24, 0.75), V(0.45, 0.25, 0.72), c), { fov: 46, t, hand: 0.6 }); }, { sub: 4 });
palateShot(C.rush, C.that, (s, t) => { const c = E.io(seg(t, C.rush - 0.2, C.that + 0.3)); shoot(s.cam, lv(V(0.12, 0.06, 0.1), V(0.1, 0.1, 0.32), c), lv(V(0.38, 0.3, 0.95), V(0.42, 0.32, 1.05), c), { fov: 46, t, hand: 0.5 }); }, { ap: 8 });
// 8) the swelling fires the nerve, all the way up to the forehead -------------------------------
shot(C.that, C.covers, (s) => {
  anatomyStudio(s.scene); const A = cutawayHead(s.scene); s.ap = 4; s.exposure = 1.0; s.bloom = 0.5;
  s.update = (t) => {
    const front = E.io(seg(t, C.swelling + 0.1, C.covers - 0.15)), throb = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.4);
    A.update(t, { cold: 0.35, warm: 0.6, swell: 0.8 + 0.3 * throb, heat: 0.8, nerve: smooth(C.that, C.swelling + 0.2, t), front, pain: 0.6 * smooth(C.covers - 0.35, C.covers, t), slushOn: 0.6 });
    const p = A.nerveCurve.getPointAt(clamp(front * 0.95)); const c = E.io(seg(t, C.that - 0.2, C.covers + 0.2));
    shoot(s.cam, p.clone().add(lv(V(1.4, -0.25, 2.6), V(1.1, 0.0, 2.3), c)), lv(V(0.45, -0.3, 0), p, 0.85), { fov: 34, t });
  };
});
// 9) the pain lands in the forehead ------------------------------------------------------------
shot(C.covers, C.so, (s) => {
  anatomyStudio(s.scene); const A = cutawayHead(s.scene); s.ap = 6; s.exposure = 1.0; s.bloom = 0.55; s.sub = 4;
  s.update = (t) => {
    const pain = clamp(spring(t, C.covers + 0.05, 2.0, 5));
    A.update(t, { cold: 0.3, warm: 0.5, swell: 0.9, heat: 0.8, nerve: 1, front: 1, pain, slushOn: 0.6 });
    const f = V(0.66, 0.52, 0); const c = E.io(seg(t, C.covers, C.so + 0.3));
    shoot(s.cam, f.clone().add(lv(V(0.9, 0.25, 1.9), V(0.7, 0.2, 1.55), c)).add(shake(t, 0.02 * jolt(t, C.covers + 0.08))), f.clone().add(V(-0.05, -0.05, 0)), { fov: 34, t });
  };
});
// 10) back outside, in x-ray: the cold is in the mouth, the pain is in the forehead -------------
shot(C.so, C.the, (s) => {
  const H = heroSet(s); s.ap = 5; s.exposure = 0.95; s.bloom = 0.5;
  const u = H.u; const shellM = xrayMat(new THREE.Color(1.0, 0.9, 0.8), new THREE.Color(0.08, 0.05, 0.05), 2.4, 0.9);
  const shell = new THREE.Mesh(HEADGEO, shellM); shell.scale.setScalar(1.012); u.head.add(shell);
  const fades = []; u.head.traverse(o => { if (o.isMesh && o !== shell && o.material && !o.material.isShaderMaterial) { o.material = o.material.clone(); o.material.transparent = true; o.material.depthWrite = false; fades.push(o.material); } });
  const nm = nerveMat(); const path = new THREE.CatmullRomCurve3([V(0.0, -0.2, 0.26), V(0.12, -0.14, 0.16), V(0.2, 0.0, 0.08), V(0.18, 0.18, 0.2), V(0.08, 0.3, 0.36), V(0.0, 0.32, 0.4)]);
  u.head.add(new THREE.Mesh(new THREE.TubeGeometry(path, 60, 0.012, 8), nm));
  const coldG = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), glow(0x7ac8ff, 0)); coldG.position.set(0, -0.19, 0.24); coldG.scale.set(1.5, 0.55, 1.3); coldG.renderOrder = 6; u.head.add(coldG);
  const painG = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), glow(0xff3a20, 0)); painG.position.set(0, 0.3, 0.38); painG.scale.set(1.3, 0.8, 0.6); u.head.add(painG);
  s.update = (t) => {
    const xr = E.io(seg(t, C.so + 0.1, C.so + 0.45)), blame = spring(t, C.blames, 2, 5);
    H.A.pose(t, { sip: 0, suck: 0, level: 0.7, pain: 1, hand: 1, shiver: 0.5, frost: 0.54, frostOp: 1 - xr });
    fades.forEach(m => m.opacity = lerp(1, 0.22, xr)); shellM.uniforms.fade.value = xr;
    nm.uniforms.uT.value = t; nm.uniforms.on.value = xr; nm.uniforms.front.value = 1.2;
    coldG.material.opacity = 1.0 * xr * (0.85 + 0.15 * Math.sin(t * 6)); coldG.material.color.setRGB(1.2, 2.2, 3.6); painG.material.opacity = xr * (0.55 + 0.35 * clamp(blame)) * (0.85 + 0.15 * Math.sin(t * 13)); painG.scale.set(1.3 + 0.3 * clamp(blame), 0.8 + 0.2 * clamp(blame), 0.6);
    const f = headPt(H.K, V(0, 0.0, 0.2)); const c = E.io(seg(t, C.so, C.the + 0.3));
    shoot(s.cam, f.clone().add(lv(V(0.9, 0.0, 2.6), V(0.65, 0.05, 2.0), c)), f, { fov: 32, t });
  };
});
// 11) the idea: shut the mouth and press the tongue up --------------------------------------------
shot(C.the, C.pressing, (s) => {
  const H = heroSet(s); s.ap = 6; s.exposure = 0.93;
  s.update = (t) => {
    const idea = clamp(spring(t, C.fix - 0.05, 1.8, 6)), hand = 1 - E.io(seg(t, C.fix, C.fix + 0.4));
    H.A.pose(t, { sip: 0, suck: 0, level: 0.7, pain: lerp(1, 0.55, idea), hand, shiver: 0.4 * (1 - idea), frost: 0.54, idea });
    H.u.mouthOpen(0); H.u.puff(0.35 * smooth(C.fix + 0.25, C.pressing, t));
    const f = headPt(H.K, V(0, -0.05, 0.3)); const c = E.io(seg(t, C.the, C.pressing + 0.3));
    shoot(s.cam, f.clone().add(lv(V(-0.6, 0.05, 2.6), V(-0.45, 0.02, 2.0), c)), f, { fov: 34, t });
  };
});
// 12) the tongue presses the roof of the mouth and warms it ---------------------------------------
shot(C.pressing, C.warm2, (s) => {
  anatomyStudio(s.scene); const A = cutawayHead(s.scene); s.ap = 6; s.exposure = 1.0; s.bloom = 0.45;
  s.update = (t) => {
    const press = clamp(spring(t, C.pressing + 0.15, 1.6, 6)), warm = E.io(seg(t, C.tongue, C.warm2 - 0.2));
    A.setTongue(press); A.update(t, { cold: (1 - warm) * 0.9, warm, swell: 0.3 * (1 - warm), heat: 0.2 * (1 - warm), slushOn: 1 - smooth(C.pressing, C.pressing + 0.3, t) });
    const c = E.io(seg(t, C.pressing - 0.2, C.warm2 + 0.3));
    shoot(s.cam, lv(V(1.25, -0.1, 2.0), V(0.95, -0.2, 1.55), c), V(0.5, -0.4, 0), { fov: 34, t });
  };
});
// 13) relief: the frost melts, he smiles and breathes out -------------------------------------------
shot(C.warm2, C.and, (s) => {
  const H = heroSet(s); s.ap = 6; s.exposure = 0.93;
  s.update = (t) => {
    const rel = E.io(seg(t, C.warm2, C.up + 0.1));
    H.A.pose(t, { sip: 0, suck: 0, level: 0.7, pain: 0.6 * (1 - rel), relief: rel, frost: 0.54 * (1 - 0.5 * rel), frostOp: 1 - rel, exhale: C.warm2 + 0.15 });
    H.u.head.rotation.x += -0.08 * rel;
    const f = headPt(H.K, V(0, -0.1, 0.2)); const c = E.io(seg(t, C.warm2, C.and + 0.3));
    shoot(s.cam, f.clone().add(lv(V(0.5, 0.1, 1.9), V(0.75, 0.0, 2.6), c)), f, { fov: 34, t });
  };
});
// 14-18) the study: fast eaters vs slow eaters ------------------------------------------------------
function cafeShot(start, end, camFn, extra = {}) {
  return shot(start, end, (s) => {
    const R = cafeteria(s.scene); s.ap = extra.ap ?? 5; s.exposure = 1.0; Object.assign(s, extra);
    const freezeT = [28.3, 28.55, 28.8];
    s.update = (t) => {
      R.update(t);
      R.kids.forEach((kd, i) => {
        const u = kd.u; u.reset(); R.seat(kd); u.breathe(t, 0.3, 0.02, i);
        if (kd.fast) {
          const fz = clamp(spring(t, freezeT[i], 2.4, 6)); const eatOn = 1 - smooth(freezeT[i] - 0.05, freezeT[i] + 0.1, t);
          R.eat(kd, t, { period: 0.5 + 0.06 * i, phase: i * 0.31, on: eatOn });
          if (fz > 0.01) { ik2(kd.K, u.arms[0], headPt(kd.K, V(-0.3, 0.25, 0.32)), V(-1, 0.4, -0.4).applyQuaternion(kd.K.quaternion)); u.hands[0].curl(0.2, 1); }
          else ik2(kd.K, u.arms[0], kd.cup.position.clone().add(V(0, 0.18, -kd.sd * 0.0 + 0.12)), V(-1, -0.6, 0).applyQuaternion(kd.K.quaternion));
          u.setLid(fz > 0.05 ? lerp(0.3, 1.08, fz) : 0.3 + 0.7 * u.blink(t, i)); u.wince(fz); u.cold(0.8 * fz); if (fz > 0.05) u.mouthOpen(0.16 * fz);
          u.head.rotation.x += -0.2 * fz; u.head.rotation.z += (i % 2 ? 0.12 : -0.12) * fz; kd.K.position.x += 0.01 * fz * Math.sin(t * 60 + i);
          kd.fr.material.uniforms.uR.value = 0.5 * E.out(clamp((t - freezeT[i]) / 0.7)); kd.cup.userData.eat(clamp((t - 24.5) / 4.2));
        } else {
          const up = R.eat(kd, t, { period: 2.8 + 0.3 * i, phase: 0.12 * i, linger: 0.4 });
          ik2(kd.K, u.arms[0], kd.cup.position.clone().add(V(-kd.sd * 0.05, 0.12, 0.12)), V(1, -0.6, 0).applyQuaternion(kd.K.quaternion)); u.hands[0].curl(0.6);
          u.setLid(lerp(0.25, 0.55, up) + 0.6 * u.blink(t, i + 3)); u.smile(0.4 + 0.5 * up); u.raise(0.3 * up); kd.cup.userData.eat(clamp((t - 24.5) / 30));
          kd.fr.material.uniforms.uR.value = 0;
        }
        // everyone glances at the frozen ones
        if (!kd.fast && t > 28.4) u.head.rotation.y += 0.35 * smooth(28.4, 28.8, t) * (i === 3 ? 0.3 : 1);
      });
      camFn(s, t, R);
    };
  });
}
cafeShot(C.and, C.wolfed, (s, t) => { const c = E.io(seg(t, C.and - 0.3, C.wolfed + 0.3)); shoot(s.cam, lv(V(1.0, 3.3, 5.8), V(0.7, 3.0, 4.9), c), V(0, 1.7, -0.6), { fov: 40, t }); });
cafeShot(C.wolfed, C.got, (s, t) => { const c = E.io(seg(t, C.wolfed - 0.2, C.got + 0.3)); shoot(s.cam, lv(V(1.25, 3.2, 3.7), V(1.05, 3.05, 3.2), c), V(-1.15, 2.1, -0.5), { fov: 40, t }); }, { sub: 4, ap: 5 });
cafeShot(C.got, C.twice, (s, t) => { const c = E.io(seg(t, C.got - 0.2, C.twice + 0.3)); shoot(s.cam, lv(V(0.95, 3.0, 2.6), V(0.8, 2.95, 2.25), c).add(shake(t, 0.006)), V(-1.15, 2.2, -0.5), { fov: 38, t }); }, { sub: 4, ap: 5 });
cafeShot(C.twice, C.kids2, (s, t, R) => { R.drawBoard(t, seg(t, C.twice + 0.02, C.kids2 - 0.15)); const c = E.io(seg(t, C.twice - 0.2, C.kids2 + 0.3)); shoot(s.cam, lv(V(0.75, 3.2, -0.55), V(0.65, 3.2, -0.85), c), V(0.6, 3.2, -4.44), { fov: 40, t }); }, { ap: 4 });
cafeShot(C.kids2, C.because, (s, t, R) => { R.drawBoard(t, 1); const kd = R.kids[3]; const f = headPt(kd.K, V(0, -0.05, 0.2)); const c = E.io(seg(t, C.kids2 - 0.2, C.because + 0.3)); shoot(s.cam, f.clone().add(lv(V(-2.3, 0.35, 1.0), V(-1.95, 0.3, 0.85), c)), f.clone().add(V(0, -0.15, 0)), { fov: 36, t }); }, { ap: 6 });
// 19) because... back to the boardwalk: the straw goes to his lips (loops into shot 0) -------------
shot(C.because, C.end + 0.2, (s) => {
  const H = heroSet(s); s.ap = 5; s.exposure = 0.93;
  s.update = (t) => {
    const T0 = C.end; const k = E.io(seg(t, C.because - 0.1, T0)); const tt = T0 - (T0 - t); // keep the boardwalk clock continuous into shot 0
    H.A.pose(t - T0, { sip: k, lift: k, suck: smooth(T0 - 0.25, T0, t), flow: 1.6, level: 0.8 });
    const c = E.io(seg(t, C.because - 0.2, T0)); shoot(s.cam, lv(V(1.8, 2.35, 6.0), OPEN_CAM[0], c), lv(V(0.05, 1.95, 0.2), OPEN_CAM[1], c), { fov: 38, t: t - T0 });
  };
});

// =====================================================================
// RENDER PIPELINE
// per sub-frame: jittered camera (anti-aliasing) + jittered shadow lights (soft shadows), accumulated
// over a 180-degree shutter (motion blur) -> depth of field focused on the camera target ->
// transitions -> bloom -> grade, vignette, lens fringe, tonemap, film grain
// =====================================================================
const Q = new URLSearchParams(location.search);
const SUB = Math.max(1, +(Q.get('sub') || 3)), SUBMAX = +(Q.get('submax') || 99);
const mkRT = (w, h, depth = false) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: depth, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
const rtShot = mkRT(W, H, true), rtDepth = mkRT(W / 2, H / 2, true);
const rtAccA = mkRT(W, H), rtAccB = mkRT(W, H), rtDofA = mkRT(W, H), rtDofB = mkRT(W, H), rtFrame = mkRT(W, H), rtDofH = mkRT(W / 2, H / 2);
const rtQ1 = mkRT(W / 4, H / 4), rtQ2 = mkRT(W / 4, H / 4), rtE1 = mkRT(W / 8, H / 8), rtE2 = mkRT(W / 8, H / 8);
const orth = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
function pass(fs, uniforms, extra = {}) { const m = new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false, ...extra }); const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m)); return { m, s, u: m.uniforms }; }
function run(p, target) { const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(target); renderer.render(p.s, orth); renderer.autoClear = ac; }

// --- accumulate a sub-frame
const accum = pass(`uniform sampler2D t; uniform float w; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv).rgb; bool ok=(c.r==c.r)&&(c.g==c.g)&&(c.b==c.b); c=ok?min(c,vec3(60.)):vec3(0.); gl_FragColor=vec4(c*w,1.); }`, { t: { value: null }, w: { value: 1 } }, { blending: THREE.AdditiveBlending, transparent: true });

// --- depth (stores 1/viewZ, background = 0)
const depthMat = new THREE.ShaderMaterial({
  vertexShader: `#include <common>\nvarying float vZ;\nvoid main(){\n#include <begin_vertex>\n#include <project_vertex>\nvZ=-mvPosition.z;\n}`,
  fragmentShader: `varying float vZ; void main(){ gl_FragColor=vec4(1.0/max(vZ,0.001),0.,0.,1.); }`, side: THREE.DoubleSide,
});
const depthAlphaMat = (map) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map } }, side: THREE.DoubleSide,
  vertexShader: `varying float vZ; varying vec2 vUv; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vZ=-mv.z; gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform sampler2D map; varying float vZ; varying vec2 vUv; void main(){ if(texture2D(map,vUv).a<0.4) discard; gl_FragColor=vec4(1.0/max(vZ,0.001),0.,0.,1.); }`,
});
function depthPass(sc, cam) {
  const swapped = [], hidden = [];
  sc.traverse(o => {
    if (!o.visible) return;
    if (o.isPoints || o.isLine || o.isSprite) { o.visible = false; hidden.push(o); return; }
    if (!o.isMesh) return;
    const m = o.material;
    if (o.userData.noDof) { o.visible = false; hidden.push(o); return; }
    if (o.userData.dofMap) { o.userData.dofMat = o.userData.dofMat || depthAlphaMat(o.userData.dofMap); swapped.push([o, m]); o.material = o.userData.dofMat; return; }
    if (m.transparent && (m.depthWrite === false || m.opacity < 0.5)) { o.visible = false; hidden.push(o); return; }
    swapped.push([o, m]); o.material = depthMat;
  });
  const bg = sc.background, fog = sc.fog; sc.background = null; sc.fog = null;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(rtDepth); renderer.clear(); renderer.render(sc, cam);
  renderer.shadowMap.autoUpdate = true;
  sc.background = bg; sc.fog = fog; swapped.forEach(([o, m]) => o.material = m); hidden.forEach(o => o.visible = true);
}

// --- depth of field: scatter-as-gather with occlusion-aware weights
const dof = pass(`
  uniform sampler2D tCol; uniform sampler2D tDep; uniform float F; uniform float K; uniform float maxR; uniform vec2 px; varying vec2 vUv;
  float cocAt(float iz){ return min(K*abs(1.0 - F*iz), maxR); }
  float ign(vec2 p){ return fract(52.9829189*fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  void main(){
    vec3 c0=texture2D(tCol,vUv).rgb;
    if(K<0.01){ gl_FragColor=vec4(c0,1.); return; }
    float iz0=texture2D(tDep,vUv).r; float r0=cocAt(iz0);
    vec3 acc=c0; float ws=1.0; float rot=ign(gl_FragCoord.xy)*6.2832;
    float cs=0.0;
    for(int i=0;i<44;i++){
      float fi=float(i)+0.5; float r=sqrt(fi/44.0)*maxR; float a=fi*2.39996+rot;
      vec2 uv=vUv+vec2(cos(a),sin(a))*r*px;
      float iz=texture2D(tDep,uv).r; float rc=cocAt(iz);
      float reach = iz>iz0+0.002 ? rc : min(rc,r0);
      float w=clamp(reach-r+1.0,0.0,1.0);
      acc+=texture2D(tCol,uv).rgb*w; ws+=w; cs+=rc*w;
    }
    gl_FragColor=vec4(acc/ws,(cs+r0)/ws);
  }`, { tCol: { value: null }, tDep: { value: rtDepth.texture }, F: { value: 5 }, K: { value: 0 }, maxR: { value: 18 }, px: { value: new THREE.Vector2(1 / W, 1 / H) } });

// blend the half-resolution blur over the sharp image only where things are out of focus
const dofMix = pass(`uniform sampler2D tSharp; uniform sampler2D tBlur; uniform sampler2D tDep; uniform float F; uniform float K; uniform float maxR; varying vec2 vUv;
  void main(){ vec3 s=texture2D(tSharp,vUv).rgb; vec4 b=texture2D(tBlur,vUv); float c0=min(K*abs(1.0-F*texture2D(tDep,vUv).r),maxR);
    float m=smoothstep(0.7,2.4,max(c0,b.a)); gl_FragColor=vec4(mix(s,b.rgb,m),1.); }`, { tSharp: { value: null }, tBlur: { value: rtDofH.texture }, tDep: { value: rtDepth.texture }, F: { value: 5 }, K: { value: 0 }, maxR: { value: 16 } });

// --- transitions (linear HDR in, linear HDR out)
const comp = pass(`
  uniform sampler2D tA; uniform sampler2D tB; uniform int mode; uniform float p; uniform float aspect; varying vec2 vUv;
  vec3 card(sampler2D t, vec2 uv, float th){
    vec2 q=(uv-0.5)*vec2(aspect,1.); float D=2.0; float c=cos(th), s=sin(th);
    float den=D*c - q.x*s; if(den<=0.001) return vec3(0.);
    float tt=D*c/den; vec3 P=vec3(0.,0.,D)+tt*vec3(q,-D);
    float u=P.x*c - P.z*s; float v=P.y;
    if(abs(u)>aspect*0.5||abs(v)>0.5) return vec3(0.);
    return texture2D(t, vec2(u/aspect+0.5, v+0.5)).rgb*(0.55+0.45*c);
  }
  vec3 blurX(sampler2D t, vec2 uv, float amt){ vec3 acc=vec3(0.); for(int i=0;i<32;i++){ float o=(float(i)/31.-0.5)*amt; acc+=texture2D(t, clamp(uv+vec2(o,0.),0.001,0.999)).rgb; } return acc/32.; }
  vec3 zoom(sampler2D t, vec2 uv, float z){ return texture2D(t, (uv-0.5)/z+0.5).rgb; }
  void main(){
    vec2 uv=vUv; vec3 col;
    if(mode==0){ col=texture2D(tA,uv).rgb; }
    else if(mode==1){ float th = p<0.5 ? p*3.14159 : -(1.-p)*3.14159; col = p<0.5 ? card(tA,uv,th) : card(tB,uv,th); }
    else if(mode==2){ col=mix(texture2D(tA,uv).rgb, texture2D(tB,uv).rgb, smoothstep(0.,1.,p)); }
    else if(mode==3){ vec3 fl=vec3(2.2,2.6,3.0); col = p<0.5 ? mix(zoom(tA,uv,1.+p*1.2), fl, smoothstep(0.15,0.5,p)) : mix(fl, zoom(tB,uv,1.35-0.35*(p-0.5)*2.), smoothstep(0.5,0.9,p)); }
    else { float a = p<0.5 ? p*2. : (1.-p)*2.; float amt=a*a*0.35; col = p<0.5 ? blurX(tA, uv+vec2(p*0.6,0.), amt) : blurX(tB, uv-vec2((1.-p)*0.6,0.), amt); }
    gl_FragColor=vec4(col,1.);
  }`, { tA: { value: rtDofA.texture }, tB: { value: rtDofB.texture }, mode: { value: 0 }, p: { value: 0 }, aspect: { value: ASPECT } });

// --- bloom
const bright = pass(`uniform sampler2D t; uniform vec2 px; uniform float thr; varying vec2 vUv;
  void main(){ vec3 c=vec3(0.); c+=texture2D(t,vUv+px*vec2(-1.,-1.)).rgb; c+=texture2D(t,vUv+px*vec2(1.,-1.)).rgb; c+=texture2D(t,vUv+px*vec2(-1.,1.)).rgb; c+=texture2D(t,vUv+px*vec2(1.,1.)).rgb; c*=0.25;
    float l=max(c.r,max(c.g,c.b)); float k=smoothstep(thr, thr+0.6, l); gl_FragColor=vec4(c*k,1.); }`, { t: { value: null }, px: { value: new THREE.Vector2(1 / W, 1 / H) }, thr: { value: 0.85 } });
const blur = pass(`uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
  void main(){ vec3 c=texture2D(t,vUv).rgb*0.2270270270; c+=(texture2D(t,vUv+dir*1.3846153846).rgb+texture2D(t,vUv-dir*1.3846153846).rgb)*0.3162162162; c+=(texture2D(t,vUv+dir*3.2307692308).rgb+texture2D(t,vUv-dir*3.2307692308).rgb)*0.0702702703; gl_FragColor=vec4(c,1.); }`, { t: { value: null }, dir: { value: new THREE.Vector2() } });
const down = pass(`uniform sampler2D t; uniform vec2 px; varying vec2 vUv; void main(){ vec3 c=texture2D(t,vUv+px*vec2(-1.,-1.)).rgb+texture2D(t,vUv+px*vec2(1.,-1.)).rgb+texture2D(t,vUv+px*vec2(-1.,1.)).rgb+texture2D(t,vUv+px*vec2(1.,1.)).rgb; gl_FragColor=vec4(c*0.25,1.); }`, { t: { value: null }, px: { value: new THREE.Vector2() } });

// --- final grade
const fin = pass(`
  uniform sampler2D tCol; uniform sampler2D tB1; uniform sampler2D tB2; uniform float bloom; uniform float time; uniform float fringe; uniform float exposure; varying vec2 vUv;
  float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  void main(){
    vec2 uv=vUv; vec2 d=uv-0.5; float r2=dot(d*vec2(0.5625,1.),d*vec2(0.5625,1.));
    vec2 off=d*fringe*r2*4.0;
    vec3 col=vec3(texture2D(tCol,uv-off).r, texture2D(tCol,uv).g, texture2D(tCol,uv+off).b);
    col+=bloom*(texture2D(tB1,uv).rgb*0.55+texture2D(tB2,uv).rgb*0.75); col*=exposure;
    vec2 vq=(uv-0.5)*vec2(1.,1.25); col*=mix(1.,0.76,smoothstep(0.3,0.8,length(vq)));
    float L=dot(col,vec3(0.2126,0.7152,0.0722));
    col*=mix(vec3(0.96,0.99,1.05), vec3(1.04,1.0,0.95), smoothstep(0.04,0.7,L));
    gl_FragColor=vec4(col,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float g=hash(gl_FragCoord.xy+fract(time*7.31)*917.0)-0.5;
    gl_FragColor.rgb+=g*0.026*(1.0-0.5*L);
  }`, { tCol: { value: rtFrame.texture }, tB1: { value: rtQ2.texture }, tB2: { value: rtE2.texture }, bloom: { value: 0.32 }, time: { value: 0 }, fringe: { value: 0.0022 }, exposure: { value: 1 } }, { toneMapped: true });

// transition into shot i: [start, end, mode]  mode 1 card, 2 dissolve, 3 push-flash, 4 whip
const TR = { 4: [C.yousee - 0.14, C.yousee + 0.16, 3], 10: [C.so - 0.12, C.so + 0.18, 4], 14: [C.and - 0.1, C.and + 0.22, 1] };

const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
// one sub-frame of one shot into an accumulation buffer; the middle sub-frame also writes depth
function subframe(sh, ts, i, acc, wantDepth, N) {
  sh.update(ts);
  const cam = sh.cam, jx = halton(i + 1, 2) - 0.5, jy = halton(i + 1, 3) - 0.5;
  cam.setViewOffset(W, H, jx, jy, W, H);
  const moved = [];
  sh.scene.traverse(o => { if (o.isLight && o.castShadow) { moved.push([o, o.position.clone()]); const s = o.userData.soft ?? 0.18; o.position.add(V((halton(i + 1, 5) - 0.5) * s * 2, (halton(i + 1, 7) - 0.5) * s * 2, (halton(i + 1, 3) - 0.5) * s * 2)); } });
  renderer.setRenderTarget(rtShot); renderer.render(sh.scene, cam);
  moved.forEach(([o, p]) => o.position.copy(p));
  accum.u.t.value = rtShot.texture; accum.u.w.value = 1 / N; run(accum, acc);
  if (wantDepth) depthPass(sh.scene, cam);
  cam.clearViewOffset();
}
function applyDof(sh, acc, out) {
  const K = sh.ap ?? 7, F = sh.cam.userData.focus;
  const k = (F && K > 0) ? K : 0;
  if (!k) { accum.u.t.value = acc.texture; accum.u.w.value = 1; renderer.setRenderTarget(out); renderer.setClearColor(0x000000, 1); renderer.clear(); run(accum, out); return; }
  dof.u.tCol.value = acc.texture; dof.u.K.value = k; dof.u.F.value = F; dof.u.maxR.value = sh.maxR ?? 16;
  run(dof, rtDofH);
  Object.assign(dofMix.u, {}); dofMix.u.tSharp.value = acc.texture; dofMix.u.F.value = F; dofMix.u.K.value = k; dofMix.u.maxR.value = sh.maxR ?? 16;
  run(dofMix, out);
}

window.renderAt = (t) => {
  let idx = shots.findIndex((s, i) => t < (shots[i + 1] ? shots[i + 1].start : 1e9));
  if (idx < 0) idx = shots.length - 1;
  let mode = 0, p = 0, a = shots[idx], b = null;
  const nextTr = TR[idx + 1], curTr = TR[idx];
  if (nextTr && t >= nextTr[0]) { b = shots[idx + 1]; mode = nextTr[2]; p = seg(t, nextTr[0], nextTr[1]); }
  else if (curTr && t < curTr[1]) { b = a; a = shots[idx - 1]; mode = curTr[2]; p = seg(t, curTr[0], curTr[1]); }
  // hard cuts: keep every sub-frame inside its own shot
  const lo = mode ? -1e9 : a.start, hi = mode ? 1e9 : (shots[idx + 1] ? shots[idx + 1].start - 1e-4 : 1e9);
  const N = Math.min(SUBMAX, Math.max(a.sub ?? SUB, b ? (b.sub ?? SUB) : 1)), mid = Math.floor(N / 2);
  renderer.setClearColor(0x000000, 1);
  [rtAccA, rtAccB].forEach(r => { renderer.setRenderTarget(r); renderer.clear(); });
  for (let i = 0; i < N; i++) subframe(a, clamp(t + ((i + 0.5) / N - 0.5) * (0.5 / 30), lo, hi), i, rtAccA, i === mid, N);
  applyDof(a, rtAccA, rtDofA);   // uses the depth written by a's middle sub-frame
  if (b) {
    for (let i = 0; i < N; i++) subframe(b, t + ((i + 0.5) / N - 0.5) * (0.5 / 30), i, rtAccB, i === mid, N);
    applyDof(b, rtAccB, rtDofB);
  }
  return finish(a, b, mode, p, t);
};
function finish(a, b, mode, p, t) {
  comp.u.mode.value = mode; comp.u.p.value = p; run(comp, rtFrame);
  bright.u.t.value = rtFrame.texture; run(bright, rtQ1);
  blur.u.t.value = rtQ1.texture; blur.u.dir.value.set(4 / W, 0); run(blur, rtQ2); blur.u.t.value = rtQ2.texture; blur.u.dir.value.set(0, 4 / H); run(blur, rtQ1);
  down.u.t.value = rtQ1.texture; down.u.px.value.set(4 / W, 4 / H); run(down, rtE1);
  blur.u.t.value = rtE1.texture; blur.u.dir.value.set(8 / W, 0); run(blur, rtE2); blur.u.t.value = rtE2.texture; blur.u.dir.value.set(0, 8 / H); run(blur, rtE1);
  blur.u.t.value = rtQ1.texture; blur.u.dir.value.set(4 / W, 4 / H); run(blur, rtQ2);
  blur.u.t.value = rtE1.texture; blur.u.dir.value.set(8 / W, -8 / H); run(blur, rtE2);
  fin.u.time.value = t; fin.u.bloom.value = (b && b.bloom) || a.bloom || 0.32; fin.u.exposure.value = (b && mode && p > 0.5 ? b.exposure : a.exposure) ?? 1;
  renderer.setRenderTarget(null); renderer.render(fin.s, orth);
  return `${shots.indexOf(a)}:${mode}:${p.toFixed(2)}`;
}
window.capture = (t) => { const info = renderAt(t); return { info, img: renderer.domElement.toDataURL('image/jpeg', 0.95) }; };
window.ready = true;
