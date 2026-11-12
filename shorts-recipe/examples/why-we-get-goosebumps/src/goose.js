// "Why We Get Goosebumps" — procedural 3D short, rendered frame by frame.
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
  song: 0.58, acold: 1.26, suddenly: 2.84, stands: 4.7, yousee: 6.22, muscle: 8.06, and1: 9.56, jolt: 10.96, cold: 11.48,
  fear: 12.28, emotion: 12.88, it: 13.62, pulling: 15.44, bumps: 16.46, for: 17.26, fluffed: 19.12, trap: 20.32, make: 21.62,
  just: 22.82, but: 24.58, barely: 26.52, and2: 28.16, because: 29.9, looking: 31.3, end: 33.15,
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
      void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),power); vec3 c=mix(inner,rim,f)*intensity; gl_FragColor=vec4(c*fade, (0.15+0.85*f)*fade); }`,
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

// =====================================================================
// GOOSEBUMP HELPERS
// =====================================================================
// forearm with animatable goosebumps and hairs that rise
function makeArm({ R = 0.42, Lg = 3.4, nB = 420, skin = 0xe9a07c, seed = 3 } = {}) {
  const g = new THREE.CylinderGeometry(R, R * 0.92, Lg, 220, 260, true); g.rotateZ(Math.PI / 2); // axis along X
  const pos = g.attributes.position, n = pos.count, base = Float32Array.from(pos.array);
  g.computeVertexNormals(); const nrm = Float32Array.from(g.attributes.normal.array);
  const r = rng(seed), B = []; for (let i = 0; i < nB; i++) B.push({ x: (r() - 0.5) * Lg * 0.92, th: r() * Math.PI * 2 });
  const cell = new Map(), key = (x, th) => `${Math.floor(x / 0.12)}_${Math.floor(th / 0.3)}`;
  B.forEach((b, i) => { const k = key(b.x, b.th); if (!cell.has(k)) cell.set(k, []); cell.get(k).push(i); });
  const field = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = base[3 * i], y = base[3 * i + 1], z = base[3 * i + 2]; let th = Math.atan2(z, y); if (th < 0) th += Math.PI * 2; const rr = Math.hypot(y, z);
    let f = 0; const cx = Math.floor(x / 0.12), ct = Math.floor(th / 0.3);
    for (let dx = -1; dx <= 1; dx++) for (let dt = -1; dt <= 1; dt++) { const L = cell.get(`${cx + dx}_${((ct + dt) % 21 + 21) % 21}`); if (!L) continue; for (const j of L) { const b = B[j]; let dth = Math.abs(th - b.th); dth = Math.min(dth, Math.PI * 2 - dth); const d2 = (x - b.x) ** 2 + (dth * rr) ** 2; f += Math.exp(-d2 / 0.0011); } }
    field[i] = Math.min(f, 1.3);
  }
  const mat = new THREE.MeshPhysicalMaterial({ color: skin, roughness: 0.48, sheen: 0.5, sheenColor: new THREE.Color(0xffd2c0), clearcoat: 0.15 });
  const mesh = new THREE.Mesh(g, mat); mesh.castShadow = mesh.receiveShadow = true;
  const hairs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0025, 0.005, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.6 }), nB);
  const grp = new THREE.Group(); grp.add(mesh, hairs);
  const dummy = new THREE.Object3D(); let cur = -1;
  grp.userData = {
    mat, set(w, stand) {
      const ww = Math.round(w * 100) / 100;
      if (ww !== cur) { cur = ww; const a = pos.array, d = 0.022 * ww; for (let i = 0; i < n; i++) { const k = field[i] * d; a[3 * i] = base[3 * i] + nrm[3 * i] * k; a[3 * i + 1] = base[3 * i + 1] + nrm[3 * i + 1] * k; a[3 * i + 2] = base[3 * i + 2] + nrm[3 * i + 2] * k; } pos.needsUpdate = true; g.computeVertexNormals(); }
      B.forEach((b, i) => {
        const rr = R * (1 - 0.08 * (b.x / Lg + 0.5)) + 0.022 * w; const nrmV = V(0, Math.cos(b.th), Math.sin(b.th));
        const root = V(b.x, nrmV.y * rr, nrmV.z * rr); const along = V(1, 0, 0);
        const dir = along.clone().multiplyScalar(1 - stand).add(nrmV.clone().multiplyScalar(0.12 + stand)).normalize();
        dummy.position.copy(root).addScaledVector(dir, 0.08); dummy.quaternion.setFromUnitVectors(V(0, 1, 0), dir); dummy.scale.setScalar(1); dummy.updateMatrix(); hairs.setMatrixAt(i, dummy.matrix);
      });
      hairs.instanceMatrix.needsUpdate = true;
    },
  };
  grp.userData.set(0, 0);
  return grp;
}
// skin cross-section with hair follicles and arrector pili muscles
function skinSlab() {
  const g = new THREE.Group();
  const layer = (h, y, color, d = 2.0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(3.6, h, d), new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, clearcoat: 0.3 })); m.position.set(0, y, -d / 2); m.receiveShadow = true; g.add(m); return m; };
  layer(0.18, 1.71, 0xe9a07c); layer(0.9, 1.17, 0xf09a9a); layer(0.6, 0.42, 0xffd36e);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.0), new THREE.MeshPhysicalMaterial({ color: 0xe9a07c, roughness: 0.5 })); surf.rotation.x = -Math.PI / 2; surf.position.set(0, 1.801, -1.0); g.add(surf);
  const fol = [-1.1, 0, 1.1].map((x, i) => {
    const f = new THREE.Group(); f.position.set(x, 0.95, 0.02); g.add(f);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0x6a3b22, roughness: 0.4 })); f.add(bulb);
    const sheath = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.95, 16), new THREE.MeshPhysicalMaterial({ color: 0xc77a6a, roughness: 0.5 })); sheath.position.y = 0.45; f.add(sheath);
    const hairPivot = new THREE.Group(); hairPivot.position.y = 0.0; f.add(hairPivot);
    const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 2.0, 10), new THREE.MeshPhysicalMaterial({ color: 0x3a2416, roughness: 0.5 })); hair.position.y = 1.0; hairPivot.add(hair);
    const muscle = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.55, 8, 16), new THREE.MeshPhysicalMaterial({ color: 0xd8192b, roughness: 0.35, clearcoat: 0.6, emissive: 0x400000 })); g.add(muscle);
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xe9a07c, roughness: 0.5 })); bump.position.set(x + 0.15, 1.8, 0.0); g.add(bump);
    return { f, hairPivot, muscle, bump, x };
  });
  g.userData.set = (k, glowM = 0) => {
    fol.forEach(o => {
      o.f.rotation.z = lerp(-0.75, -0.12, k);
      const top = V(o.x + 0.42, 1.55, 0.07), bot = worldOfLocal(o.f, V(0, 0.55, 0));
      const mid = top.clone().add(bot).multiplyScalar(0.5); o.muscle.position.copy(mid); const d = top.clone().sub(bot); o.muscle.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); o.muscle.scale.set(1 + 0.35 * k, d.length() / 0.67, 1 + 0.35 * k);
      o.muscle.material.emissive.setRGB(0.25 + 0.6 * glowM, 0, 0);
      o.bump.scale.set(1, 0.02 + 0.45 * k, 1);
    });
  };
  function worldOfLocal(obj, v) { obj.updateMatrix(); return v.clone().applyMatrix4(obj.matrix); }
  g.userData.fol = fol; g.userData.set(0); return g;
}
function snow(sc, n = 200, area = 8, color = 0xffffff) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }), n); sc.add(m);
  const r = rng(91), P = []; for (let i = 0; i < n; i++) P.push({ x: (r() - 0.5) * area, z: (r() - 0.5) * area * 0.6, o: r(), s: 0.6 + r() });
  const dummy = new THREE.Object3D();
  return (t, wind = 0, cx = 0, cz = 0) => { for (let i = 0; i < n; i++) { const q = P[i], a = (t * 0.35 + q.o) % 1; dummy.position.set(cx + q.x + wind * (a * 4 - 2) + 0.1 * Math.sin(t * 2 + i), 6 - a * 6.5, cz + q.z); dummy.scale.setScalar(q.s); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); } m.instanceMatrix.needsUpdate = true; };
}
function noteProp(color = '#ffd23f') { return textPlane('♪', 0.5, color, '#7a4a00'); }
function shiver(p, t, amt = 1) { p.position.x += Math.sin(t * 70) * 0.012 * amt; const u = p.userData; u.arms.forEach(a => { a.sh.rotation.set(-0.95, 0, a.sx * -0.35); a.el.rotation.set(-1.7, 0, a.sx * -0.6); }); u.head.rotation.z = Math.sin(t * 60) * 0.02 * amt; }
function makeGoose() {
  const g = new THREE.Group();
  const bc = document.createElement('canvas'); bc.width = bc.height = 512; const bg = bc.getContext('2d'); bg.fillStyle = '#808080'; bg.fillRect(0, 0, 512, 512); const r = rng(5);
  for (let i = 0; i < 1400; i++) { const x = r() * 512, y = r() * 512; const gr = bg.createRadialGradient(x, y, 0, x, y, 7); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, 'rgba(128,128,128,0)'); bg.fillStyle = gr; bg.beginPath(); bg.arc(x, y, 7, 0, 7); bg.fill(); }
  const bt = new THREE.CanvasTexture(bc); bt.wrapS = bt.wrapT = THREE.RepeatWrapping; bt.repeat.set(3, 3);
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xf3c0ae, roughness: 0.45, bumpMap: bt, bumpScale: 3, sheen: 0.5, clearcoat: 0.2 });
  const orange = new THREE.MeshPhysicalMaterial({ color: 0xff8a1f, roughness: 0.35, clearcoat: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), skin); body.scale.set(0.85, 0.75, 1.25); body.position.set(0, 1.2, 0); g.add(body);
  const neckC = new THREE.CatmullRomCurve3([V(0, 1.45, 0.55), V(0, 1.9, 0.75), V(0, 2.35, 0.7), V(0, 2.6, 0.62)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(neckC, 40, 0.14, 16), skin));
  const head = new THREE.Group(); head.position.set(0, 2.68, 0.66); g.add(head);
  const hs = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20), skin); hs.scale.set(0.95, 1, 1.15); head.add(hs);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 20), orange); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.03, 0.36); beak.scale.set(1, 0.7, 1); head.add(beak);
  [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), M.black); e.position.set(sx * 0.15, 0.06, 0.14); head.add(e); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); gl.position.set(sx * 0.15 - 0.01, 0.075, 0.18); head.add(gl);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 10), orange); leg.position.set(sx * 0.2, 0.45, 0.05); g.add(leg); const foot = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.05, 3), orange); foot.position.set(sx * 0.2, 0.04, 0.15); foot.rotation.y = Math.PI / 6; g.add(foot);
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 12), skin); wing.scale.set(0.3, 0.6, 1.1); wing.position.set(sx * 0.5, 1.25, -0.05); g.add(wing); });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { head, body }; return g;
}
const furTufts = (p, n = 140, seed = 7) => {
  const fm = furMat('#6b4a2e', '#4a3220', seed, false); const r = rng(seed), T = [];
  const anchors = [[V(0, 1.85, 0), 0.42, 0.75], [V(0, 2.92, 0), 0.47, 0.2]];
  for (let i = 0; i < n; i++) {
    const a = anchors[i < n * 0.8 ? 0 : 1]; const th = r() * Math.PI * 2, y = (r() - 0.5) * a[2] * 1.4; const dir = V(Math.cos(th), 0.15 * (r() - 0.5), Math.sin(th)).normalize();
    if (a === anchors[1] && dir.z > 0.3) continue; // keep the face clear
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09 + r() * 0.04, 12, 8), fm); m.userData = { base: a[0].clone().add(V(0, y, 0)).addScaledVector(dir, a[1] * 0.9), dir }; m.castShadow = true; p.add(m); T.push(m);
  }
  p.userData.arms.forEach(arm => { for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), fm); m.position.set(0.04, -0.15 - k * 0.12, 0.04); arm.sh.add(m); } });
  return (puff) => T.forEach(m => { m.position.copy(m.userData.base).addScaledVector(m.userData.dir, 0.06 + 0.1 * puff); m.scale.setScalar(1 + 0.6 * puff); });
};

// =====================================================================
// SHOTS
// =====================================================================
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
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.01, 200) }; build(s); shots.push(s); return s; }
const BLUE = gradTex([[0, '#eef7ff'], [0.3, '#b9dcf5'], [0.7, '#6aa8d8'], [1, '#2f6fa8']], 0.5, 0.3);
const WARM = gradTex([[0, '#fff1d6'], [0.3, '#ffc98a'], [0.7, '#ff8a5c'], [1, '#c2456a']], 0.5, 0.3);

// 0) "You hear a song" ------------------------------------------------------------
shot(0, C.acold, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(2, 6, 5) }); sc.background = WARM;
  const A = makeChar(CAST.F); sc.add(A);
  const hp = new THREE.Group(); A.userData.head.add(hp); const hm = new THREE.MeshPhysicalMaterial({ color: 0x222833, roughness: 0.3, clearcoat: 1 });
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 10, 40, Math.PI), hm); band.position.y = 0.05; hp.add(band);
  [-1, 1].forEach(sx => { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 24), hm); cup.rotation.z = Math.PI / 2; cup.position.set(sx * 0.5, 0.0, 0); hp.add(cup); });
  const notes = [0, 1, 2, 3].map(i => { const n_ = noteProp(['#ffd23f', '#ff6fb0', '#6fd3ff', '#ffffff'][i]); sc.add(n_); return n_; });
  s.update = (t) => {
    const u = A.userData; u.reset(); u.setLid(lerp(0.2, 0.85, smooth(0.2, 0.9, t))); u.head.rotation.z = 0.08 * Math.sin(t * 4); u.mouthOpen(0.05);
    notes.forEach((n_, i) => { const a = ((t * 0.5 + i / 4) % 1); n_.position.set(-0.8 + i * 0.5 + 0.2 * Math.sin(t * 2 + i), 3.0 + a * 1.2, 0.3); n_.material.opacity = Math.sin(Math.PI * a); n_.lookAt(s.cam.position); });
    const c = seg(t, 0, C.acold); setCam(s.cam, lv(V(0.6, 3.2, 3.6), V(0.5, 3.1, 3.0), c), V(0, 3.0, 0), drift(t, 1.5), 38);
  };
});

// 1) "or a cold wind hits you" ------------------------------------------------------
shot(C.acold, C.suddenly, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(-3, 6, 5) }); sc.background = BLUE;
  const B = makeChar(CAST.D); sc.add(B);
  const sn = snow(sc, 260, 6);
  const streaks = [0, 1, 2, 3, 4, 5].map(i => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.4, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); m.rotation.z = Math.PI / 2; sc.add(m); return m; });
  s.update = (t) => {
    const u = B.userData; u.reset(); B.position.set(0, 0, 0); const hit = smooth(C.acold + 0.3, C.acold + 0.6, t);
    u.setLid(0.1 + 0.6 * hit); u.head.rotation.set(0.1 * hit, -0.25 * hit, 0); shiver(B, t, hit); u.mouthOpen(0.12 * hit);
    sn(t, 1.5, 0, 0);
    streaks.forEach((m, i) => { const a = ((t * 1.6 + i / 6) % 1); m.position.set(-3 + a * 6, 2.0 + i * 0.35, 0.6 + (i % 2) * 0.4); m.material.opacity = 0.6 * Math.sin(Math.PI * a); });
    const c = seg(t, C.acold, C.suddenly); setCam(s.cam, lv(V(1.2, 3.0, 4.2), V(1.0, 2.95, 3.6), c), V(0, 2.6, 0), -3 + drift(t, 1.5), 38);
  };
});

// 2) Arm close-up: hairs rise ------------------------------------------------------
function armShot(start, end, ranges) {
  shot(start, end, (s) => {
    const sc = s.scene; studio(sc, { ground: null, keyPos: V(-4, 2.5, 1.5), key: 3.2 }); sc.background = ranges.bg || BLUE;
    const arm = makeArm(); arm.rotation.set(0.15, 0.4, 0.1); arm.position.set(0, 2.2, 0); sc.add(arm);
    s.update = (t) => {
      const w = ranges.w(t), st = ranges.stand(t); arm.userData.set(w, st);
      ranges.cam(s, t);
    };
  });
}
armShot(C.suddenly, C.yousee, {
  w: (t) => E.io(seg(t, C.stands - 0.3, C.stands + 0.8)), stand: (t) => E.io(seg(t, C.stands - 0.2, C.stands + 0.6)),
  cam: (s, t) => { if (t < C.stands) { const c = seg(t, C.suddenly, C.stands); setCam(s.cam, lv(V(0.5, 3.3, 3.0), V(0.4, 3.1, 2.5), c), V(0, 2.2, 0), drift(t, 1.5), 38); } else { const c = seg(t, C.stands, C.yousee + 0.2); setCam(s.cam, lv(V(0.6, 2.62, 1.05), V(0.45, 2.6, 0.88), c), V(0.1, 2.5, 0.2), 4 + drift(t, 1.2), 36); } },
});

// 3) Skin cross-section: the tiny muscle --------------------------------------------
function slabShot(start, end, opts) {
  shot(start, end, (s) => {
    const sc = s.scene; studio(sc, { ground: -0.2, keyPos: V(2, 6, 6), shadow: 0.15 });
    const slab = skinSlab(); sc.add(slab);
    const arrows = slab.userData.fol.map(() => { const a = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 16), new THREE.MeshPhysicalMaterial({ color: 0x29d3ff, emissive: 0x0a90c0 })); sc.add(a); return a; });
    s.update = (t) => {
      const k = opts.k(t), gm = opts.glow(t); slab.userData.set(k, gm);
      arrows.forEach((a, i) => { const m = slab.userData.fol[i].muscle; a.position.copy(m.position).add(V(0.12, 0.05, 0.12)); a.quaternion.copy(m.quaternion); a.rotateX(Math.PI); a.visible = opts.arrows(t); a.scale.setScalar(1 + 0.15 * Math.sin(t * 10)); });
      opts.cam(s, t, slab);
    };
  });
}
slabShot(C.yousee, C.and1, {
  k: () => 0, glow: (t) => smooth(C.muscle - 0.2, C.muscle + 0.2, t) * (0.6 + 0.4 * Math.sin(t * 9)), arrows: () => false,
  cam: (s, t) => { if (t < C.muscle) { const c = seg(t, C.yousee, C.muscle); setCam(s.cam, lv(V(1.0, 2.6, 7.4), V(0.8, 2.4, 6.4), c), V(0, 1.3, 0), -3 + drift(t, 1.5), 38); } else { const c = seg(t, C.muscle, C.and1 + 0.2); setCam(s.cam, lv(V(0.6, 1.8, 3.2), V(0.5, 1.75, 2.8), c), V(0.25, 1.35, 0), 3 + drift(t, 1.5), 38); } },
});

// 4) The brain's jolt ---------------------------------------------------------------
shot(C.and1, C.cold, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(2, 6, 5) }); sc.background = BG.xray;
  const B = makeChar(CAST.D); sc.add(B);
  B.userData.head.traverse(o => { if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial && !o.material.map) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.45; o.material.depthWrite = false; } });
  const brain = makeBrain(); brain.scale.multiplyScalar(0.3); brain.material = new THREE.MeshBasicMaterial({ color: 0xff8fb8, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }); sc.add(brain);
  const bolt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.0, 3.25, 0), V(0.25, 2.8, 0.2), V(-0.1, 2.4, 0.25), V(0.2, 1.9, 0.3), V(-0.05, 1.4, 0.3)]), 40, 0.03, 8), glow(0xffe14a, 1)); sc.add(bolt);
  s.update = (t) => {
    const u = B.userData; u.reset(); B.updateMatrixWorld(true); brain.position.copy(worldOf(u.head, V(0, 0.1, -0.03)));
    const j = jolt(t, C.jolt); brain.material.opacity = 0.5 + 0.5 * j; bolt.visible = j > 0.05; bolt.material.opacity = j;
    u.setLid(lerp(0.1, -0.2, j)); u.mouthOpen(0.2 * j); B.position.y = 0.04 * j;
    const c = seg(t, C.and1, C.cold); setCam(s.cam, lv(V(0.9, 3.4, 3.2), V(0.75, 3.3, 2.7), c).add(shake(t, 0.03 * j)), V(0, 2.75, 0), -2 + drift(t, 1.5), 38);
  };
});

// 5–7) cold, fear, emotion: three quick faces ---------------------------------------
shot(C.cold, C.fear, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(-2, 6, 5) }); sc.background = BLUE;
  const P = makeChar(CAST.C); sc.add(P); const sn = snow(sc, 200, 5);
  s.update = (t) => { const u = P.userData; u.reset(); P.position.set(0, 0, 0); shiver(P, t, 1.4); u.setLid(0.55); u.mouthOpen(0.08 + 0.05 * Math.abs(Math.sin(t * 40))); sn(t, 0.4); u.blush(0); u.skinM.color.copy(u.baseSkin).lerp(new THREE.Color(0x9fc7ff), 0.25);
    setCam(s.cam, lv(V(0.4, 3.1, 2.9), V(0.3, 3.05, 2.5), seg(t, C.cold, C.fear)), V(0, 2.8, 0), 2 + drift(t, 1.5), 38); };
});
shot(C.fear, C.emotion, (s) => {
  const sc = s.scene; sc.background = BG.xray; sc.environment = ENV;
  sc.add(new THREE.HemisphereLight(0x6f86c9, 0x1b2240, 0.6)); const k = new THREE.DirectionalLight(0xb9c8ff, 1.6); k.position.set(2, 4, 5); sc.add(k);
  const P = makeChar(CAST.E); sc.add(P);
  const ghost = new THREE.Group(); sc.add(ghost);
  const gm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.7, sheen: 1, emissive: 0x303540 });
  const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.8, 1.8, 32, 1, true), gm); gb.position.y = 0.9; ghost.add(gb); const gh = new THREE.Mesh(new THREE.SphereGeometry(0.47, 32, 20), gm); gh.position.y = 1.8; ghost.add(gh);
  [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), M.black); e.scale.set(1, 1.4, 0.5); e.position.set(sx * 0.17, 1.88, 0.42); ghost.add(e); });
  const mo = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), M.black); mo.scale.set(1, 1.3, 0.4); mo.position.set(0, 1.6, 0.44); ghost.add(mo);
  s.update = (t) => { const u = P.userData; u.reset(); const pop = E.out(seg(t, C.fear - 0.05, C.fear + 0.15)); ghost.position.set(0.75, 0.6 + 1.2 * pop, -1.0); ghost.rotation.z = -0.15;
    u.setLid(-0.3); u.mouthOpen(0.45); u.arms.forEach(a => { a.sh.rotation.set(-1.4, 0, a.sx * 0.6); a.el.rotation.set(-1.5, 0, 0); }); u.head.rotation.y = 0.35;
    setCam(s.cam, V(0.25, 3.0, 3.6).add(shake(t, 0.02)), V(0.25, 2.85, -0.2), -3 + drift(t, 1.5), 40); };
});
shot(C.emotion, C.it, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(2, 6, 5) }); sc.background = WARM;
  const P = makeChar(CAST.B); sc.add(P);
  const notes = [0, 1, 2].map(i => { const n_ = noteProp(['#ffffff', '#ffd23f', '#ff6fb0'][i]); sc.add(n_); return n_; });
  const tears = [-1, 1].map(sx => { const d = dropMesh(0.035, M.water); sc.add(d); return d; });
  s.update = (t) => { const u = P.userData; u.reset(); u.setLid(0.55); u.head.rotation.x = -0.18; u.arms.forEach((a, i) => { if (i === 1) { a.sh.rotation.set(-1.2, 0, -0.9); a.el.rotation.set(-1.4, 0, -0.5); } });
    P.updateMatrixWorld(true); tears.forEach((d, i) => { const a = ((t * 1.2 + i * 0.5) % 1); d.position.copy(worldOf(u.head, V((i ? 1 : -1) * 0.17, 0.0 - a * 0.25, 0.43))); });
    notes.forEach((n_, i) => { const a = ((t * 0.6 + i / 3) % 1); n_.position.set(-0.7 + i * 0.7, 3.3 + a * 0.8, 0.2); n_.lookAt(s.cam.position); });
    setCam(s.cam, lv(V(-0.4, 3.1, 3.0), V(-0.3, 3.05, 2.6), seg(t, C.emotion, C.it)), V(0, 2.85, 0), drift(t, 1.5), 38); };
});

// 8) All the muscles squeeze at once --------------------------------------------------
slabShot(C.it, C.pulling, {
  k: (t) => E.expo(seg(t, C.it + 0.1, C.it + 0.6)), glow: (t) => smooth(C.it, C.it + 0.2, t), arrows: (t) => t > C.it + 0.1,
  cam: (s, t) => { const c = seg(t, C.it, C.pulling + 0.2); setCam(s.cam, lv(V(-0.8, 2.8, 7.2), V(-0.6, 2.6, 6.4), c), V(0, 1.45, 0), 3 + drift(t, 1.5), 38); },
});

// 9) Pulling the skin into bumps -------------------------------------------------------
armShot(C.pulling, C.for, {
  w: (t) => E.io(seg(t, C.pulling, C.bumps + 0.3)), stand: (t) => E.io(seg(t, C.pulling, C.bumps + 0.3)), bg: BLUE,
  cam: (s, t) => { const c = seg(t, C.pulling, C.for + 0.2); setCam(s.cam, lv(V(-0.7, 2.55, 0.95), V(-0.55, 2.52, 0.8), c), V(-0.1, 2.45, 0.15), -3 + drift(t, 1.2), 36); },
});

// 10) The furry ancestor ------------------------------------------------------------
shot(C.for, C.just, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(-2, 7, 5), key: 2.0 }); sc.background = BLUE;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0xf2f6fb, roughness: 0.9 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  const rockM = new THREE.MeshStandardMaterial({ color: 0x6e6a66, roughness: 0.95 });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.9, 16, 48, Math.PI), rockM); arch.position.set(0, 0, -2.5); arch.scale.y = 1.15; arch.castShadow = true; sc.add(arch);
  const ape = makeChar({ shirt: 0x6b4a2e, pants: 0x5a3c24, hair: 0x3a2416, skin: 0xb98a62, style: 'long', beard: true }); sc.add(ape);
  const puff = furTufts(ape);
  const warm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), glow(0xff9a3c, 0.85), 60); sc.add(warm);
  const sn = snow(sc, 220, 9);
  const wolf = makeCat({ pose: 'sit', base: '#8d949c', stripe: '#6d737a', seed: 31, stripes: false }); wolf.userData.s = 1.2; wolf.scale.setScalar(1.2); wolf.position.set(3.2, 0, 1.0); wolf.rotation.y = -1.2; sc.add(wolf);
  const dummy = new THREE.Object3D();
  s.update = (t) => {
    const pf = E.out(seg(t, C.fluffed - 0.1, C.fluffed + 0.6)); puff(pf); const u = ape.userData; u.reset(); shiver(ape, t, 0.6 * (1 - pf)); u.setLid(0.3);
    if (t > C.make) { u.arms.forEach(a => { a.sh.rotation.set(0, 0, a.sx * 1.2); a.el.rotation.set(0, 0, a.sx * 0.4); }); ape.scale.setScalar(1 + 0.1 * E.out(seg(t, C.make, C.make + 0.4))); u.mouthOpen(0.4); }
    sn(t, 0.5);
    const tk = smooth(C.trap - 0.2, C.trap + 0.3, t);
    for (let i = 0; i < 60; i++) { const a = (t * 0.7 + i / 60) % 1; const th = i * 2.4; dummy.position.set(Math.cos(th) * (0.62 + 0.06 * Math.sin(t * 3 + i)), 1.4 + a * 1.1, Math.sin(th) * 0.5); dummy.scale.setScalar(Math.max(tk * Math.sin(Math.PI * a), 0.0001)); dummy.updateMatrix(); warm.setMatrixAt(i, dummy.matrix); }
    warm.instanceMatrix.needsUpdate = true;
    wolf.visible = t > C.make - 0.3; wolf.userData.setEars(smooth(C.make, C.make + 0.4, t)); wolf.position.x = 3.2 + 0.6 * smooth(C.make + 0.3, C.just, t);
    if (t < C.fluffed) { const c = seg(t, C.for, C.fluffed); setCam(s.cam, lv(V(1.6, 3.6, 7.6), V(1.3, 3.3, 6.6), c), V(0, 2.2, 0), drift(t, 1.5), 40); }
    else if (t < C.trap) { const c = seg(t, C.fluffed, C.trap); setCam(s.cam, lv(V(-1.4, 3.0, 4.2), V(-1.2, 2.9, 3.7), c), V(0, 2.3, 0), -3 + drift(t, 1.5), 38); }
    else if (t < C.make) { const c = seg(t, C.trap, C.make); setCam(s.cam, lv(V(0.9, 2.5, 2.4), V(0.75, 2.45, 2.0), c), V(0, 2.1, 0.1), 3 + drift(t, 1.5), 38); }
    else { const c = seg(t, C.make, C.just + 0.2); setCam(s.cam, lv(V(2.4, 0.6, 4.8), V(2.2, 0.55, 4.4), c), V(0.4, 2.0, 0), -4 + drift(t, 1.5), 44); }
  };
});

// 11) The scared cat ------------------------------------------------------------------
shot(C.just, C.but, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(2, 6, 5) });
  const cat = makeCat({ pose: 'sit', base: '#2d2c31', stripe: '#2d2c31', seed: 41, stripes: false }); sc.add(cat);
  s.update = (t) => {
    const k = E.expo(seg(t, C.just + 0.1, C.just + 0.4)); const u = cat.userData; u.s = 1 + 0.25 * k; cat.scale.set(u.s * (1 + 0.05 * k), u.s * (1 + 0.12 * k), u.s);
    u.setEars(k); u.setPupil(k > 0.5); u.setMouth(0.7 * k); u.setLid(-0.2 * k); u.head.rotation.x = 0.15 * k; cat.position.x = Math.sin(t * 60) * 0.01 * k;
    const c = seg(t, C.just, C.but + 0.2); setCam(s.cam, lv(V(1.0, 2.2, 4.8), V(0.8, 2.1, 4.1), c), V(0, 1.6, 0), 2 + drift(t, 1.5), 40);
  };
});

// 12) Us today: barely any fur ---------------------------------------------------------
shot(C.but, C.and2, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(-2, 6, 5) }); sc.background = BLUE;
  const A = makeChar(CAST.A); sc.add(A); const sn = snow(sc, 240, 7);
  const arm = makeArm({ nB: 160 }); arm.position.set(30, 2.2, 0); arm.rotation.set(0.15, 0.4, 0.1); sc.add(arm);
  s.update = (t) => {
    const u = A.userData; u.reset(); A.position.set(0, 0, 0); shiver(A, t, 1.2); u.setLid(0.5); u.mouthOpen(0.06 + 0.05 * Math.abs(Math.sin(t * 40))); u.skinM.color.copy(u.baseSkin).lerp(new THREE.Color(0x9fc7ff), 0.2);
    sn(t, 0.6); arm.userData.set(1, 1);
    if (t < C.barely) { const c = seg(t, C.but, C.barely); setCam(s.cam, lv(V(0.5, 3.4, 5.6), V(0.4, 3.2, 4.8), c), V(0, 2.3, 0), drift(t, 1.5), 40); }
    else { const c = seg(t, C.barely, C.and2 + 0.2); setCam(s.cam, V(30, 0, 0).add(lv(V(0.5, 3.0, 2.4), V(0.4, 2.9, 2.0), c)), V(30, 2.2, 0), 3 + drift(t, 1.2), 38); }
  };
});

// 13) The plucked goose -----------------------------------------------------------------
shot(C.and2, C.end + 0.2, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(-2, 6, 5) }); sc.background = BLUE;
  const A = makeChar(CAST.A); A.position.set(-0.75, 0, 0); A.rotation.y = 0.35; sc.add(A);
  const goose = makeGoose(); sc.add(goose); const sn = snow(sc, 200, 7);
  const arm = makeArm({ nB: 260 }); arm.position.set(30, 2.2, 0); arm.rotation.set(0.15, 0.4, 0.1); sc.add(arm);
  s.update = (t) => {
    const u = A.userData; u.reset(); shiver(A, t, 1.0); u.setLid(0.45); u.skinM.color.copy(u.baseSkin).lerp(new THREE.Color(0x9fc7ff), 0.2);
    const walk = E.out(seg(t, C.and2, C.and2 + 1.2)); goose.position.set(lerp(3.2, 0.95, walk), 0.05 * Math.abs(Math.sin(t * 9)) * (1 - walk), 0.1); goose.rotation.y = lerp(-1.4, -0.45, walk) + Math.sin(t * 9) * 0.05 * (1 - walk); goose.position.x += Math.sin(t * 65) * 0.01;
    goose.userData.head.rotation.y = 0.5 * smooth(C.because, C.because + 0.3, t) * (t < C.looking ? 1 : 0.6);
    u.head.rotation.y = -0.45 * smooth(C.and2 + 0.8, C.and2 + 1.2, t); sn(t, 0.4); arm.userData.set(1, 1);
    if (t < C.because) { const c = seg(t, C.and2, C.because); setCam(s.cam, lv(V(0.4, 3.0, 6.6), V(0.3, 2.9, 5.8), c), V(0.1, 2.0, 0), drift(t, 1.5), 40); }
    else if (t < C.looking) { const c = seg(t, C.because, C.looking); setCam(s.cam, V(30, 0, 0).add(lv(V(0.6, 2.75, 1.0), V(0.48, 2.7, 0.85), c)), V(30.1, 2.45, 0.2), -3 + drift(t, 1.2), 36); }
    else { const c = seg(t, C.looking, C.end); setCam(s.cam, lv(V(1.4, 2.4, 3.4), V(1.25, 2.35, 3.0), c), V(0.6, 1.9, 0.2), 2 + drift(t, 1.2), 38); }
  };
});

// =====================================================================
// compositing and transitions
// =====================================================================
const RT = () => new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
const rtA = RT(), rtB = RT();
const comp = new THREE.ShaderMaterial({
  uniforms: { tA: { value: rtA.texture }, tB: { value: rtB.texture }, mode: { value: 0 }, p: { value: 0 }, aspect: { value: ASPECT } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `
    uniform sampler2D tA; uniform sampler2D tB; uniform int mode; uniform float p; uniform float aspect; varying vec2 vUv;
    vec3 card(sampler2D t, vec2 uv, float th){
      vec2 q=(uv-0.5)*vec2(aspect,1.); float D=2.0; float c=cos(th), s=sin(th);
      float den=D*c - q.x*s; if(den<=0.001) return vec3(0.);
      float tt=D*c/den; vec3 P=vec3(0.,0.,D)+tt*vec3(q,-D);
      float u=P.x*c - P.z*s; float v=P.y;
      if(abs(u)>aspect*0.5||abs(v)>0.5) return vec3(0.);
      return texture2D(t, vec2(u/aspect+0.5, v+0.5)).rgb*(0.55+0.45*c);
    }
    vec3 blurX(sampler2D t, vec2 uv, float amt){ vec3 acc=vec3(0.); for(int i=0;i<24;i++){ float o=(float(i)/23.-0.5)*amt; acc+=texture2D(t, clamp(uv+vec2(o,0.),0.001,0.999)).rgb; } return acc/24.; }
    vec3 zoom(sampler2D t, vec2 uv, float z){ return texture2D(t, (uv-0.5)/z+0.5).rgb; }
    void main(){
      vec2 uv=vUv; vec3 col;
      if(mode==0){ col=texture2D(tA,uv).rgb; }
      else if(mode==1){ float th = p<0.5 ? p*3.14159 : -(1.-p)*3.14159; col = p<0.5 ? card(tA,uv,th) : card(tB,uv,th); }
      else if(mode==2){ col=mix(texture2D(tA,uv).rgb, texture2D(tB,uv).rgb, smoothstep(0.,1.,p)); }
      else if(mode==3){ vec3 fl=vec3(2.2,2.6,3.0); col = p<0.5 ? mix(zoom(tA,uv,1.+p*1.2), fl, smoothstep(0.15,0.5,p)) : mix(fl, zoom(tB,uv,1.35-0.35*(p-0.5)*2.), smoothstep(0.5,0.9,p)); }
      else { float a = p<0.5 ? p*2. : (1.-p)*2.; float amt=a*a*0.35; col = p<0.5 ? blurX(tA, uv+vec2(p*0.6,0.), amt) : blurX(tB, uv-vec2((1.-p)*0.6,0.), amt); }
      vec2 vq=(uv-0.5)*vec2(1.,1.25); col*=mix(1.,0.8,smoothstep(0.32,0.78,length(vq)));
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  depthTest: false, depthWrite: false, toneMapped: true,
});
const compScene = new THREE.Scene(); compScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), comp));
const compCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// transition into shot i: [start, end, mode]  mode 1 card, 2 dissolve, 3 push-flash, 4 whip
const TR = { 3: [C.yousee - 0.14, C.yousee + 0.16, 3], 10: [C.for - 0.1, C.for + 0.22, 1], 12: [C.but - 0.12, C.but + 0.18, 4], 13: [C.and2 - 0.1, C.and2 + 0.22, 1] };

function renderShot(sh, t, target) { sh.update(t); renderer.setRenderTarget(target); renderer.render(sh.scene, sh.cam); }

window.renderAt = (t) => {
  let idx = shots.findIndex((s, i) => t < (shots[i + 1] ? shots[i + 1].start : 1e9));
  if (idx < 0) idx = shots.length - 1;
  let mode = 0, p = 0, a = shots[idx], b = null;
  const nextTr = TR[idx + 1], curTr = TR[idx];
  if (nextTr && t >= nextTr[0]) { b = shots[idx + 1]; mode = nextTr[2]; p = seg(t, nextTr[0], nextTr[1]); }
  else if (curTr && t < curTr[1]) { b = a; a = shots[idx - 1]; mode = curTr[2]; p = seg(t, curTr[0], curTr[1]); }
  renderShot(a, t, rtA);
  if (b) renderShot(b, t, rtB);
  comp.uniforms.mode.value = mode; comp.uniforms.p.value = p;
  renderer.setRenderTarget(null); renderer.render(compScene, compCam);
  return `${idx}:${mode}:${p.toFixed(2)}`;
};
window.ready = true;
