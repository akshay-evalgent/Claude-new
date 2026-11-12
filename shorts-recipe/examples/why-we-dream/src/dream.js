// "Why We Dream" — procedural 3D short, rendered frame by frame.
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
  your: 0.72, darting: 1.66, brain: 3.26, body: 5.8, goes: 6.42, limp: 7.2, yousee: 8.18, brainstem: 9.78, signals: 11.18,
  so: 12.28, act: 12.98, scientists: 14.76, sort: 16.44, and1: 17.2, which: 19.06, chased: 19.98, common: 21.28, but: 22.74,
  people: 24.14, punch: 24.64, kick: 25.2, asleep: 26.1, and2: 26.5, six: 28.58, then: 30.3, forget: 30.46, minutes: 31.82, end: 33.75,
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
// SETS: a real bedroom (window opening, moon/sun shaft, curtains, textured wood and fabric)
// =====================================================================
const TOP = 1.03;   // mattress top
const NIGHT_SKY = gradTex([[0, '#3a4f98'], [0.45, '#18214f'], [1, '#060a1e']], 0.62, 0.32);
const DAY_SKY = gradTex([[0, '#fffbe6'], [0.3, '#ffe2a8'], [0.7, '#a8d4f0'], [1, '#6aa8e0']], 0.35, 0.55);
const DREAMBG = gradTex([[0, '#ffe0f6'], [0.3, '#d6a8ff'], [0.7, '#7a5ae0'], [1, '#2e1f78']], 0.5, 0.35);
const PJ = { shirt: 0x8fb8ff, pants: 0x6f8fe0, hair: 0x3a2416, skin: 0xe9a07c, barefoot: true };
const hdr = (r, g, b, extra = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), ...extra });
const kf = (t, keys) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b, ease = E.io] = keys[i]; const k = ease(clamp((t - t0) / (t1 - t0)));
    return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
  }
  return keys[keys.length - 1][1];
};
const setRot = (o, r) => o.rotation.set(r[0], r[1], r[2]);

function makeBed(sc, W = 2.0) {
  const wood = woodTex('#8a5532', '#4a2a14', 31, [1, 1]);
  const fm = new THREE.MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: 0.5, roughness: 0.38 });
  const box = (w, h, d, x, y, z, r = 0.03) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), fm); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; sc.add(b); return b; };
  box(0.1, 0.32, 3.95, -W / 2 - 0.07, 0.56, 0); box(0.1, 0.32, 3.95, W / 2 + 0.07, 0.56, 0);
  box(W + 0.26, 0.62, 0.12, 0, 0.55, 2.02);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(0.15, b < 0 ? 2.35 : 0.85, 0.15, a * (W / 2 + 0.08), b < 0 ? 1.175 : 0.425, b * 2.02, 0.045));
  box(W + 0.1, 1.2, 0.07, 0, 1.6, -2.04); box(W + 0.42, 0.14, 0.22, 0, 2.36, -2.03, 0.06); box(W + 0.1, 0.1, 0.12, 0, 1.0, -2.03);
  for (let i = 1; i < 4; i++) { const v = new THREE.Mesh(new RoundedBoxGeometry(0.05, 1.1, 0.05, 2, 0.02), fm); v.position.set(-W / 2 + i * W / 4, 1.6, -1.99); sc.add(v); }
  const slat = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, 3.9), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); slat.position.set(0, 0.66, 0); sc.add(slat);
  const sheetM = new THREE.MeshStandardMaterial({ color: 0xf4f5f9, roughness: 0.9, bumpMap: WEAVE_FINE, bumpScale: 0.8 });
  const mat = new THREE.Mesh(new RoundedBoxGeometry(W, 0.34, 3.86, 6, 0.13), sheetM); mat.position.set(0, TOP - 0.17, 0); mat.castShadow = mat.receiveShadow = true; sc.add(mat);
}
function pillow(sc, x, z = -1.62, w = 1.2, d = 0.76, h = 0.3) {
  const g = new THREE.SphereGeometry(1, 72, 36), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i);
    const sx = Math.sign(X) * Math.pow(Math.abs(X), 0.3), sz = Math.sign(Z) * Math.pow(Math.abs(Z), 0.3);
    const e = Math.max(Math.abs(sx), Math.abs(sz));
    let y = Y * h * 0.5 * (1 - 0.62 * Math.pow(e, 6));
    if (Y > 0) y -= 0.07 * Math.exp(-((sx * w / 2) ** 2 + (sz * d / 2 - 0.08) ** 2) / 0.07);
    p.setXYZ(i, sx * w / 2, y + 0.01 * noise3(sx * 5, sz * 5, Y), sz * d / 2);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.85, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xdde6ff), bumpMap: WEAVE_FINE, bumpScale: 0.6 }));
  m.position.set(x, TOP + h * 0.42, z); m.castShadow = m.receiveShadow = true; sc.add(m); return m;
}
// cloth that drapes over the mattress and over whoever is underneath.
// fit() raycasts the posed bodies into a height field, then lets the cloth tent between high points.
function drape(sc, { W = 2.0, z0 = -0.72, z1 = 1.92, color = 0x5a72c8 } = {}) {
  const NX = 70, NZ = 80, geo = new THREE.PlaneGeometry(1, 1, NX, NZ);
  const hex = c => '#' + new THREE.Color(c).getHexString();
  const map = canvasTex(256, 512, (g, w, h) => { g.fillStyle = hex(color); g.fillRect(0, 0, w, h); g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, w, h * 0.075); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, h * 0.075, w, 3); noiseFill(g, w, h, 5, 10); });
  const mat = new THREE.MeshPhysicalMaterial({ map, roughness: 0.86, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55), bumpMap: QUILT, bumpScale: 2.2, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; sc.add(mesh);
  const pos = geo.attributes.position;
  const GX = 90, GZ = 130, gx0 = -W / 2 - 0.6, gx1 = W / 2 + 0.6, gz0 = -2.2, gz1 = 2.7, slots = [];
  const sample = (hf, x, z) => { const fx = clamp((x - gx0) / (gx1 - gx0)) * GX, fz = clamp((z - gz0) / (gz1 - gz0)) * GZ; const i = Math.min(Math.floor(fx), GX - 1), j = Math.min(Math.floor(fz), GZ - 1), u = fx - i, v = fz - j, I = (a, b) => hf[b * (GX + 1) + a]; return lerp(lerp(I(i, j), I(i + 1, j), u), lerp(I(i, j + 1), I(i + 1, j + 1), u), v); };
  mesh.userData.fit = (objs, slot = 0) => {
    const meshes = []; objs.forEach(o => { o.updateMatrixWorld(true); o.traverse(m => { if (m.isMesh && m.visible && !m.userData.skipCloth) meshes.push(m); }); });
    const rc = new THREE.Raycaster(); rc.ray.direction.set(0, -1, 0);
    const hf = new Float32Array((GX + 1) * (GZ + 1));
    for (let j = 0; j <= GZ; j++) for (let i = 0; i <= GX; i++) { rc.ray.origin.set(lerp(gx0, gx1, i / GX), 6, lerp(gz0, gz1, j / GZ)); const hit = rc.intersectObjects(meshes, false)[0]; hf[j * (GX + 1) + i] = hit ? Math.max(0, hit.point.y - (TOP + 0.03) + 0.05) : 0; }
    const dx = (gx1 - gx0) / GX, dz = (gz1 - gz0) / GZ, rad = 9, out = new Float32Array(hf.length);
    for (let j = 0; j <= GZ; j++) for (let i = 0; i <= GX; i++) {
      let m = hf[j * (GX + 1) + i];
      for (let b = Math.max(0, j - rad); b <= Math.min(GZ, j + rad); b++) for (let a = Math.max(0, i - rad); a <= Math.min(GX, i + rad); a++) { const v = hf[b * (GX + 1) + a]; if (v > m) m = Math.max(m, v - Math.hypot((a - i) * dx, (b - j) * dz) * 1.25); }
      out[j * (GX + 1) + i] = m;
    }
    for (let it = 0; it < 3; it++) { const c = out.slice(); for (let j = 1; j < GZ; j++) for (let i = 1; i < GX; i++) { let sm = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) sm += c[(j + b) * (GX + 1) + i + a]; out[j * (GX + 1) + i] = sm / 9; } }
    for (let k = 0; k < out.length; k++) if (hf[k] > 0) out[k] = Math.max(out[k], hf[k] + 0.025);
    slots[slot] = out;
  };
  // fit a character: ignore the head and arms (they lie on top of the cloth)
  mesh.userData.fitChar = (p, slot = 0) => { const u = p.userData; [u.head, ...u.arms.map(a => a.sh)].forEach(g => g.traverse(m => m.userData.skipCloth = true)); mesh.userData.fit([p], slot); };
  mesh.userData.set = (o = {}) => {
    const Z0 = o.z0 ?? z0, wts = o.w || [], br = o.breath ?? 0, pokes = o.pokes || [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      let x = lerp(-W / 2 - 0.55, W / 2 + 0.55, i / NX), z = lerp(Z0, z1 + 0.6, j / NZ), h = 0;
      slots.forEach((hf, k) => { if (hf) h = Math.max(h, sample(hf, x, z) * (wts[k] ?? 1)); });
      h *= 1 + 0.03 * br;
      for (const pk of pokes) { const q = 1 - ((x - pk.x) ** 2 + (z - pk.z) ** 2) / (pk.r * pk.r); if (q > 0) h = Math.max(h, pk.h * Math.pow(q, 0.6)); }
      let y = TOP + 0.03 + h;
      const ax = Math.abs(x) - W / 2;
      if (ax > 0) { const k = Math.min(ax / 0.14, 1); x = Math.sign(x) * (W / 2 + 0.08 * Math.sin(k * Math.PI / 2)); y = TOP + 0.03 - 0.08 * (1 - Math.cos(k * Math.PI / 2)) - Math.max(ax - 0.14, 0) * 1.05; }
      const az = z - z1;
      if (az > 0) { const k = Math.min(az / 0.14, 1); z = z1 + 0.08 * Math.sin(k * Math.PI / 2); y = Math.min(y, TOP + 0.03 - 0.08 * (1 - Math.cos(k * Math.PI / 2)) - Math.max(az - 0.14, 0) * 1.05); }
      y += 0.016 * noise3(x * 3.1, z * 3.1, 1.7) + 0.006 * noise3(x * 9, z * 9, 4);
      pos.setXYZ(j * (NX + 1) + i, x, y, z);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  mesh.userData.set(); return mesh;
}
function lightShaft(sc, wc, dir, w, h, L, color, op) {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => wc.clone().add(V(a * w / 2, b * h / 2, 0)));
  const far = corners.map(c => c.clone().addScaledVector(dir, L));
  const P = [], A = [];
  for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i + 1) % 4], c = far[(i + 1) % 4], d = far[i]; P.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray()); A.push(0, 0, 1, 0, 1, 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('a', new THREE.Float32BufferAttribute(A, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { col: { value: new THREE.Color(color) }, op: { value: op } },
    vertexShader: `attribute float a; varying float vA; void main(){ vA=a; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 col; uniform float op; varying float vA; void main(){ float f=pow(1.0-vA,1.5)*smoothstep(0.0,0.06,vA); gl_FragColor=vec4(col*op*f,1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m); sc.add(mesh);
  // dust drifting inside the shaft
  const n = 45, dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 6, 4), hdr(0.55, 0.55, 0.6, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), n); sc.add(dust);
  const r = rng(17), D = []; for (let i = 0; i < n; i++) D.push([r() - 0.5, r() - 0.5, 0.15 + r() * 0.7, r() * 10]);
  const dm = new THREE.Object3D();
  mesh.userData.update = (t, amt = 1) => {
    D.forEach(([a, b, c, s], i) => {
      dm.position.copy(wc).add(V(a * w * 0.9, b * h * 0.9, 0)).addScaledVector(dir, c * L * 0.75).add(V(fbm(t * 0.07 + s, 1) * 0.3, fbm(t * 0.06 + s, 2) * 0.3 - 0.02 * t, fbm(t * 0.07 + s, 3) * 0.3));
      dm.scale.setScalar(amt * (0.6 + 0.8 * h3(i, 2, 3))); dm.updateMatrix(); dust.setMatrixAt(i, dm.matrix);
    });
    dust.instanceMatrix.needsUpdate = true; m.uniforms.op.value = op * amt;
  };
  mesh.userData.update(0); return mesh;
}
function room(sc, { night = true, double = false } = {}) {
  const W = double ? 3.0 : 2.0, wx = double ? 1.6 : 1.0, wz = -3.2, oy0 = 2.6, oy1 = 4.7;
  sc.background = new THREE.Color(night ? 0x070b1c : 0xf0d8b8); sc.environment = night ? NENV : MENV;
  const R = { W, wx };
  // floor and rug
  const fw = woodTex('#a06e46', '#5a3820', 21, [2.5, 2.5], 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.7, roughness: 0.32 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const rugT = canvasTex(512, 384, (g, w, h) => { g.fillStyle = '#c86a4e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2e2c4'; g.lineWidth = 10; g.strokeRect(22, 22, w - 44, h - 44); g.lineWidth = 4; g.strokeRect(44, 44, w - 88, h - 88); g.fillStyle = '#2f4a6e'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w / 2, 90 + i * 34); g.lineTo(w / 2 + 60, 107 + i * 34); g.lineTo(w / 2, 124 + i * 34); g.lineTo(w / 2 - 60, 107 + i * 34); g.fill(); } noiseFill(g, w, h, 8, 24); });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.5), new THREE.MeshLambertMaterial({ map: rugT, bumpMap: WEAVE, bumpScale: 1.5 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(W / 2 + 0.7, 0.006, 1.1); rug.receiveShadow = true; sc.add(rug);
  // walls with a real window opening
  const wallM = new THREE.MeshLambertMaterial({ color: 0xe6d8c2, bumpMap: PLASTER, bumpScale: 0.6 });
  const wallBox = (x0, x1, y0, y1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.3), wallM); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, wz - 0.15); b.castShadow = b.receiveShadow = true; sc.add(b); };
  wallBox(-8, wx - 0.9, 0, 10); wallBox(wx + 0.9, 8, 0, 10); wallBox(wx - 0.9, wx + 0.9, 0, oy0); wallBox(wx - 0.9, wx + 0.9, oy1, 10);
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.3, 10, 14), wallM); side.position.set(-4.3, 5, 3.6); side.receiveShadow = true; sc.add(side);
  const trimM = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 0.4 });
  const bb = new THREE.Mesh(new THREE.BoxGeometry(16, 0.24, 0.06), trimM); bb.position.set(0, 0.12, wz + 0.03); bb.receiveShadow = true; sc.add(bb);
  const bb2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 14), trimM); bb2.position.set(-4.12, 0.12, 3.6); sc.add(bb2);
  const win = new THREE.Group(); win.position.set(wx, (oy0 + oy1) / 2, wz); sc.add(win);
  [[0, 1.05, 1.92, 0.12], [0, -1.05, 1.92, 0.12], [0.95, 0, 0.12, 2.22], [-0.95, 0, 0.12, 2.22], [0, 0, 0.06, 2.1], [0, 0.0, 1.8, 0.06]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16), trimM); b.position.set(x, y, 0); b.castShadow = true; win.add(b); });
  const sill = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.08, 0.4, 2, 0.02), trimM); sill.position.set(0, -1.1, 0.14); sill.castShadow = sill.receiveShadow = true; win.add(sill);
  const plant = new THREE.Group(); plant.position.set(-0.6, -1.06, 0.16); win.add(plant);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.2, 24), new THREE.MeshPhysicalMaterial({ color: 0xd86a3c, roughness: 0.55 })); pot.position.y = 0.1; pot.castShadow = true; plant.add(pot);
  for (let i = 0; i < 9; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0x3f9a52, roughness: 0.5, sheen: 0.5 })); lf.scale.set(0.45, 1.3, 0.18); lf.position.set(Math.cos(i * 2.4) * 0.07, 0.3 + (i % 3) * 0.06, Math.sin(i * 2.4) * 0.07); lf.rotation.set(Math.sin(i) * 0.7, i * 2.4, Math.cos(i) * 0.7); lf.castShadow = true; plant.add(lf); }
  // sky beyond the opening
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), new THREE.MeshBasicMaterial({ map: night ? NIGHT_SKY : DAY_SKY })); sky.position.set(wx, 4.2, -10); sc.add(sky); R.sky = sky;
  if (night) {
    const moon = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), hdr(3.2, 3.1, 2.7)); moon.position.set(wx + 0.9, 5.3, -9.9); sc.add(moon); R.moon = moon;
    const halo = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshBasicMaterial({ map: gradTex([[0, 'rgba(160,180,255,0.5)'], [1, 'rgba(0,0,0,0)']], 0.5, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.set(wx + 0.9, 5.3, -9.95); sc.add(halo);
    const r = rng(5); for (let i = 0; i < 40; i++) { const st = new THREE.Mesh(new THREE.CircleGeometry(0.02 + r() * 0.03, 6), hdr(2, 2, 2.2)); st.position.set(wx + (r() - 0.5) * 9, 3 + r() * 5, -9.9); sc.add(st); }
  } else {
    const sun = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), hdr(6, 5, 3.4)); sun.position.set(wx - 0.6, 3.6, -9.9); sc.add(sun); R.sun = sun;
  }
  // curtains on a rod
  const curtM = new THREE.MeshLambertMaterial({ color: night ? 0x5566a8 : 0x6f80c4, bumpMap: WEAVE_FINE, bumpScale: 0.7, side: THREE.DoubleSide });
  [-1, 1].forEach(sd => {
    const g = new THREE.PlaneGeometry(0.85, 3.6, 60, 10), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), f = 0.6 + 0.4 * (1.8 - y) / 3.6; p.setX(i, x * f); p.setZ(i, 0.075 * Math.sin((x + 0.43) * 24) * (0.8 + 0.2 * f)); }
    g.computeVertexNormals(); const c = new THREE.Mesh(g, curtM); c.position.set(wx + sd * 1.3, 3.25, wz + 0.25); c.castShadow = c.receiveShadow = true; sc.add(c);
  });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.4, 12), M.chrome); rod.rotation.z = Math.PI / 2; rod.position.set(wx, 5.07, wz + 0.25); sc.add(rod);
  // picture on the side wall
  const art = canvasTex(256, 320, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6c27a'); gr.addColorStop(1, '#e46a5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(170, 110, 34, 0, 7); g.fill(); g.fillStyle = '#5a3a6e'; g.beginPath(); g.moveTo(0, 250); g.lineTo(90, 150); g.lineTo(160, 230); g.lineTo(210, 180); g.lineTo(256, 230); g.lineTo(256, 320); g.lineTo(0, 320); g.fill(); });
  const pic = new THREE.Group(); pic.position.set(-4.13, 3.5, 0.2); pic.rotation.y = Math.PI / 2; sc.add(pic);
  const pf = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.24, 0.06, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x2b2420, roughness: 0.4, clearcoat: 0.6 })); pic.add(pf);
  const pc = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.06), new THREE.MeshStandardMaterial({ map: art, roughness: 0.7 })); pc.position.z = 0.032; pic.add(pc);
  // bed, nightstand, lamp, clock, books
  makeBed(sc, W);
  const nx = -W / 2 - 0.75, nz = -1.55;
  const nwood = woodTex('#7a4a2a', '#3e2412', 41);
  const nm = new THREE.MeshStandardMaterial({ map: nwood, bumpMap: nwood, bumpScale: 0.4, roughness: 0.35 });
  const ns = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.88, 0.66, 3, 0.03), nm); ns.position.set(nx, 0.47, nz); ns.castShadow = ns.receiveShadow = true; sc.add(ns);
  const nt = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.06, 0.72, 3, 0.025), nm); nt.position.set(nx, 0.94, nz); nt.castShadow = nt.receiveShadow = true; sc.add(nt);
  [0.66, 0.3].forEach(y => { const d = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.3, 0.02, 2, 0.01), nm); d.position.set(nx, y, nz + 0.335); sc.add(d); const k = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xd8b060, metalness: 1, roughness: 0.25 })); k.position.set(nx, y, nz + 0.36); sc.add(k); });
  const lampG = new THREE.Group(); lampG.position.set(nx - 0.12, 0.97, nz - 0.08); sc.add(lampG);
  const lb = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.11, 0], [0.13, 0.04], [0.15, 0.16], [0.12, 0.29], [0.05, 0.34], [0.035, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 32), new THREE.MeshPhysicalMaterial({ color: 0x8fb8b0, roughness: 0.15, clearcoat: 1 })); lb.castShadow = true; lampG.add(lb);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 0.32, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xfff1dc, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(1.0, 0.62, 0.3), emissiveIntensity: night ? 1.4 : 0 })); shade.position.y = 0.66; lampG.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), night ? hdr(6, 4, 2.2) : hdr(1, 1, 1)); bulb.position.y = 0.56; lampG.add(bulb);
  const lamp = new THREE.PointLight(0xffb070, night ? 9 : 0, 9, 2); lamp.position.set(nx - 0.12, 1.55, nz - 0.08); sc.add(lamp); R.lamp = lamp;
  const clockT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#060606'; g.fillRect(0, 0, w, h); g.fillStyle = night ? '#ff3b2e' : '#ff3b2e'; g.font = 'bold 92px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(night ? '3:12' : '7:00', w / 2, h / 2 + 4); });
  const ck = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.18, 0.14, 2, 0.03), new THREE.MeshPhysicalMaterial({ color: 0x1d1f24, roughness: 0.35, clearcoat: 1 })); ck.position.set(nx + 0.22, 1.06, nz + 0.12); ck.rotation.y = 0.35; ck.castShadow = true; sc.add(ck);
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.13), new THREE.MeshBasicMaterial({ map: clockT, color: new THREE.Color(2.2, 2.2, 2.2) })); cs.position.set(0, 0, 0.071); ck.add(cs);
  [[0x2f6f8f, 0.04], [0xc0503a, 0.035], [0xe0b040, 0.03]].reduce((y, [c, hgt], i) => { const b = new THREE.Mesh(new RoundedBoxGeometry(0.3, hgt, 0.22, 2, 0.008), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.6 })); b.position.set(nx + 0.22, y + hgt / 2, nz - 0.18); b.rotation.y = 0.2 * i - 0.2; b.castShadow = true; sc.add(b); return y + hgt; }, 0.97);
  // light through the window
  const tgt = V(0, 1.0, -0.4), wc = V(wx, (oy0 + oy1) / 2, wz);
  const key = new THREE.DirectionalLight(night ? 0xa8bcff : 0xffd29a, night ? 2.6 : 4.6);
  key.position.copy(tgt.clone().add(wc.clone().sub(tgt).multiplyScalar(2.6))); key.target.position.copy(tgt); sc.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  key.shadow.bias = -0.0003; key.shadow.normalBias = 0.03; key.userData.soft = 0.22; R.key = key;
  sc.add(new THREE.HemisphereLight(night ? 0x6a7eb8 : 0xfff0dc, night ? 0x221a24 : 0x9a7a5a, night ? 0.5 : 0.75));
  const faceL = new THREE.DirectionalLight(night ? 0xffc89a : 0xfff0e0, night ? 1.25 : 0.7); faceL.position.set(-3.5, 5, 3.5); sc.add(faceL);
  const fillL = new THREE.DirectionalLight(night ? 0x3a4a8a : 0xffe6c8, night ? 0.25 : 0.6); fillL.position.set(4, 5, 6); sc.add(fillL);
  R.shaft = lightShaft(sc, wc.clone().add(V(0, 0, 0.1)), tgt.clone().sub(wc).normalize(), 1.8, 2.1, 7, night ? 0x8fa8ff : 0xffd8a0, night ? 0.07 : 0.11);
  return R;
}
// pose a character lying on its back: head on the pillow, body inclined slightly, legs flat
function lie(p, x = 0, headZ = -1.5, d = 0.08, neckA = 0.45) {
  const u = p.userData; p.rotation.set(-Math.PI / 2 + d, 0, 0);
  const hipY = TOP + 0.31, hipZ = headZ + 1.62;
  p.position.set(x, hipY - 1.3 * Math.sin(d), hipZ + 1.3 * Math.cos(d));
  u.legs.forEach((L, i) => L.hip.rotation.set(-d + 0.1, (i ? 1 : -1) * 0.4, 0));
  u.neck(neckA);
}
const armsRest = (u, k = 1) => u.arms.forEach(a => { a.sh.rotation.set(-0.6 * k, 0, -a.sx * 0.22 * k); a.el.rotation.set(0.25 * k, 0, -a.sx * 0.3 * k); });

// =====================================================================
// SHOT HELPERS
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.05, 200) }; build(s); shots.push(s); return s; }
function bedScene(s, { x = 0, night = true } = {}) {
  const sc = s.scene; const R = room(sc, { night }); const A = makeChar2(PJ); sc.add(A);
  const bl = drape(sc); pillow(sc, x);
  const pose = (t) => { const u = A.userData; u.reset(); lie(A, x, -1.5); armsRest(u); u.setLid(1); return u.breathe(t, 0.23, 0.04); };
  pose(0); bl.userData.fitChar(A); bl.userData.set();
  return { sc, R, A, u: A.userData, bl, pose };
}
function eyeBulges(p) { const u = p.userData; return [-1, 1].map(sx => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14), u.skinM); b.scale.set(1, 0.8, 0.62); b.castShadow = true; u.head.add(b); return { b, sx }; }); }
function rem(bulges, t, seed = 3) { const [sx, sy] = saccade(t, seed, 3.6); bulges.forEach(o => o.b.position.set(o.sx * 0.16 + 0.032 * sx, 0.09 + 0.012 * sy, 0.462)); }
// point an arm's upper segment at a world target (k blends from the current pose)
function aimArm(p, a, target, k = 1, bend = 0.2) {
  p.updateMatrixWorld(true); const shW = a.sh.getWorldPosition(new THREE.Vector3());
  const dirW = target.clone().sub(shW).normalize();
  const pq = a.sh.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), dirW.applyQuaternion(pq));
  a.sh.quaternion.slerp(q, k); a.el.rotation.set(-bend * k, 0, 0);
}
function cloudPuffs(w = 1.6, h = 1.2, color = 0xffffff, opacity = 1) {
  const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.65, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffffff), emissive: new THREE.Color(color), emissiveIntensity: 0.35, transparent: opacity < 1, opacity });
  const r = rng(Math.round(w * 100 + h * 7)); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const s = new THREE.Mesh(new THREE.SphereGeometry(0.2 + r() * 0.12, 24, 16), m); s.position.set(Math.cos(a) * w * 0.5, Math.sin(a) * h * 0.5, -0.1 + r() * 0.05); s.castShadow = true; g.add(s); }
  const core = new THREE.Mesh(new THREE.CircleGeometry(1, 48), m); core.scale.set(w * 0.52, h * 0.52, 1); core.position.z = -0.12; g.add(core);
  return g;
}
function soccerBall() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const gx = c.getContext('2d'); gx.fillStyle = '#ffffff'; gx.fillRect(0, 0, 512, 256); gx.fillStyle = '#151515';
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { const x = i * 64 + (j % 2) * 32 + 16, y = j * 64 + 32; gx.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; gx.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); } gx.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 40, 24), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.35, clearcoat: 0.6 })); b.castShadow = true; return b;
}
function photoTex(kind) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 210; const g = c.getContext('2d'); g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 256, 210);
  const sky = { beach: '#7fd3ff', cake: '#ffe0f0', dog: '#cdeeb0', bus: '#bfe6ff', mtn: '#ffd9a8', school: '#d8ecff' }[kind]; g.fillStyle = sky; g.fillRect(12, 12, 232, 160);
  if (kind === 'beach') { g.fillStyle = '#f2d38a'; g.fillRect(12, 122, 232, 50); g.fillStyle = '#3aa0e0'; g.fillRect(12, 98, 232, 28); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(190, 52, 22, 0, 7); g.fill(); }
  if (kind === 'cake') { g.fillStyle = '#ff8ab8'; g.fillRect(70, 96, 116, 66); g.fillStyle = '#fff'; g.fillRect(70, 91, 116, 14); g.fillStyle = '#ffd23f'; for (let i = 0; i < 4; i++) g.fillRect(85 + i * 28, 66, 6, 26); }
  if (kind === 'dog') { g.fillStyle = '#c98a4a'; g.beginPath(); g.arc(128, 100, 52, 0, 7); g.fill(); g.fillStyle = '#7a4a22'; g.beginPath(); g.ellipse(82, 76, 17, 36, 0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(174, 76, 17, 36, -0.3, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(110, 92, 7, 0, 7); g.arc(146, 92, 7, 0, 7); g.fill(); g.beginPath(); g.arc(128, 120, 10, 0, 7); g.fill(); }
  if (kind === 'bus') { g.fillStyle = '#ffc21a'; g.fillRect(40, 66, 176, 76); g.fillStyle = '#9fd6ff'; for (let i = 0; i < 4; i++) g.fillRect(52 + i * 40, 78, 30, 24); g.fillStyle = '#222'; g.beginPath(); g.arc(80, 146, 13, 0, 7); g.arc(180, 146, 13, 0, 7); g.fill(); }
  if (kind === 'mtn') { g.fillStyle = '#6a8a6a'; g.beginPath(); g.moveTo(12, 172); g.lineTo(100, 58); g.lineTo(180, 172); g.fill(); g.fillStyle = '#4a6a5a'; g.beginPath(); g.moveTo(110, 172); g.lineTo(190, 78); g.lineTo(244, 172); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(100, 58); g.lineTo(86, 80); g.lineTo(114, 80); g.fill(); }
  if (kind === 'school') { g.fillStyle = '#c8553a'; g.fillRect(60, 80, 136, 92); g.fillStyle = '#7a2a1a'; g.beginPath(); g.moveTo(50, 82); g.lineTo(128, 40); g.lineTo(206, 82); g.fill(); g.fillStyle = '#fff4c0'; for (let i = 0; i < 3; i++) g.fillRect(76 + i * 40, 100, 24, 24); }
  g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 196, 256, 14);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const KINDS = ['beach', 'cake', 'dog', 'bus', 'mtn', 'school'];
function brainGlowMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffa6c2, roughness: 0.42, emissive: 0xff5aa0, emissiveIntensity: 1 });
  m.userData.uT = { value: 0 }; m.userData.uOn = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = m.userData.uT; sh.uniforms.uOn = m.userData.uOn;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; uniform float uT; uniform float uOn;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float w1 = sin(dot(vOP, vec3(4.0, 2.5, 3.0)) * 2.6 - uT * 6.0);
        float w2 = sin(dot(vOP, vec3(-3.0, 4.0, 1.5)) * 3.4 - uT * 4.6 + 1.7);
        float w3 = sin(length(vOP - vec3(0.3, 0.2, 0.1)) * 13.0 - uT * 8.0);
        float act = smoothstep(0.45, 1.0, 0.5 + 0.5 * (w1 * 0.5 + w2 * 0.35 + w3 * 0.4));
        totalEmissiveRadiance *= uOn * (0.35 + 3.2 * act);`);
  };
  return m;
}
function nerveMat(base = 0xffc23a, hot = 0xfff4c8) {
  return new THREE.ShaderMaterial({
    uniforms: { base: { value: new THREE.Color(base) }, hot: { value: new THREE.Color(hot) }, uT: { value: 0 }, gate: { value: -1 }, dim: { value: 0 }, speed: { value: 1.25 }, dens: { value: 3 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 base; uniform vec3 hot; uniform float uT; uniform float gate; uniform float dim; uniform float speed; uniform float dens; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float x=vUv.x; float ph=fract(x*dens - uT*speed); float pulse=exp(-pow((ph-0.5)/0.06,2.)); float blocked=step(gate,x);
        pulse*=1.0-blocked*dim; float rimf=pow(1.-abs(dot(vN,vV)),1.4); float k=(0.3+0.7*rimf)*(1.0-0.8*dim*blocked);
        gl_FragColor=vec4(base*k*1.1 + hot*pulse*3.2, 1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
}

// =====================================================================
// 0) Night. Establishing, then the eyes dart under the lids (REM)
// =====================================================================
shot(0, C.brain, (s) => {
  const { R, A, u, bl, pose } = bedScene(s); s.ap = 6; s.exposure = 0.9;
  const bulges = eyeBulges(A);
  s.update = (t) => {
    const br = pose(t); bl.userData.set({ breath: br }); R.shaft.userData.update(t); rem(bulges, t);
    u.setLid(1); u.head.rotation.z = 0.05 * fbm(t * 0.4, 2);
    if (t < C.your) { const c = E.io(seg(t, -0.3, C.your + 0.3)); shoot(s.cam, lv(V(-1.25, 3.55, 6.0), V(-1.0, 3.25, 5.3), c), V(0.3, 1.85, -1.3), { fov: 40, t }); s.ap = 5; }
    else {
      A.updateMatrixWorld(true); const eyes = worldOf(u.head, V(0, 0.07, 0.42)); const c = E.io(seg(t, C.your, C.brain + 0.3));
      shoot(s.cam, eyes.clone().add(lv(V(0.5, 2.15, 1.75), V(0.4, 1.8, 1.45), c)), eyes.clone().add(V(0, -0.02, 0.02)), { fov: 30, t, hand: 0.6 }); s.ap = 9;
    }
  };
});

// =====================================================================
// 1) The brain lights up, almost like you're awake
// =====================================================================
shot(C.brain, C.body, (s) => {
  const { R, A, u, bl, pose } = bedScene(s); s.ap = 7; s.exposure = 0.88; s.bloom = 0.42;
  u.head.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.3; o.material.depthWrite = false; } });
  const shell = new THREE.Mesh(HEADGEO, xrayMat(new THREE.Color(1.0, 0.85, 0.75), new THREE.Color(0.06, 0.03, 0.03), 2.4, 0.9)); shell.scale.setScalar(1.015); u.head.add(shell);
  const brain = makeBrain(); brain.scale.multiplyScalar(0.31); const bm = brainGlowMat(); brain.material = bm; brain.castShadow = false; s.scene.add(brain);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 20), glow(0xff8fd8, 0.0)); halo.scale.set(1, 0.8, 1.2); s.scene.add(halo);
  const sparks = []; for (let i = 0; i < 26; i++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), hdr(4, 3.2, 4.2)); s.scene.add(sp); sparks.push(sp); }
  s.update = (t) => {
    const br = pose(t); bl.userData.set({ breath: br }); R.shaft.userData.update(t);
    A.updateMatrixWorld(true);
    const bc = worldOf(u.head, V(0, 0.1, -0.03)); brain.position.copy(bc); brain.quaternion.copy(u.head.getWorldQuaternion(new THREE.Quaternion()));
    const on = spring(t, C.brain + 0.15, 1.6, 5); const hue = 0.92 - 0.3 * (0.5 - 0.5 * Math.cos((t - C.brain) * 1.4));
    bm.emissive.setHSL(hue, 0.85, 0.5); bm.userData.uT.value = t; bm.userData.uOn.value = Math.max(0.05, on);
    halo.position.copy(bc); halo.quaternion.copy(brain.quaternion); halo.material.color.setHSL(hue, 0.9, 0.55); halo.material.opacity = 0.22 * on * (0.85 + 0.15 * Math.sin(t * 9));
    sparks.forEach((sp, i) => { const a = i * 2.39 + t * (1.2 + 0.4 * (i % 4)), b = i * 1.7 + t * 0.9; const n = V(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)); sp.position.copy(bc).add(n.multiply(V(0.3, 0.24, 0.37)).applyQuaternion(brain.quaternion)); sp.visible = on > 0.3 && Math.sin(t * 17 + i * 3) > 0.2; });
    const c = E.io(seg(t, C.brain, C.body + 0.3)), ang = lerp(0.12, 0.6, c);
    shoot(s.cam, bc.clone().add(V(Math.cos(ang) * lerp(3.5, 3.0, c), lerp(1.5, 1.25, c), Math.sin(ang) * lerp(3.5, 3.0, c) + 0.25)), bc.clone().add(V(0, -0.08, 0.1)), { fov: 34, t, hand: 0.7 });
  };
});

// =====================================================================
// 2) Completely limp: the arm slides off and dangles, the cat lands on him
// =====================================================================
shot(C.body, C.yousee, (s) => {
  const { sc, R, A, u, bl, pose } = bedScene(s, { x: 0.3 }); s.ap = 5; s.exposure = 0.92;
  const cat = makeCat({ pose: 'loaf', seed: 3 }); cat.userData.s = 0.42; cat.scale.setScalar(0.42); sc.add(cat);
  const land = (() => { const rc = new THREE.Raycaster(V(0.32, 6, -0.3), V(0, -1, 0)); const h = rc.intersectObject(bl, false)[0]; return h ? h.point.y - 0.02 : 1.72; })();
  const tGo = C.goes, tFall = C.goes + 0.24, tHit = C.goes + 0.5, tCrouch = 6.82, tJump = 6.98, tLand = 7.38;
  s.update = (t) => {
    const br = pose(t); bl.userData.set({ breath: br }); R.shaft.userData.update(t);
    // the right arm: slides outward over the cloth, gravity takes it, it swings and settles
    const a = u.arms[1];
    const sh = kf(t, [[tGo, [-0.6, 0, -0.22]], [tFall, [-0.12, 0.05, 0.95], E.inQ], [tHit, [0.04, 1.02, 1.52], E.in]]);
    const sw = wob(t, tHit, 1.25, 2.6); setRot(a.sh, [sh[0], sh[1] + 0.2 * sw, sh[2] + 0.06 * sw]);
    setRot(a.el, kf(t, [[tGo, [0.25, 0, -0.3]], [tHit, [0.05, 0, 0.12]]])); a.el.rotation.z += 0.12 * wob(t, tHit + 0.06, 1.6, 3);
    u.hands[1].curl(0.45);
    u.head.rotation.y += -0.32 * spring(t, C.limp - 0.15, 1.2, 4); u.mouthOpen(0.12 * smooth(C.limp, C.limp + 0.4, t));
    // the cat: anticipation crouch, leap on an arc, squash on landing, settle and purr
    const crouch = smooth(tCrouch, tJump, t) * (1 - smooth(tJump, tJump + 0.06, t)), fly = seg(t, tJump, tLand), landed = t >= tLand;
    const p0 = V(2.05, 0, 0.75), p1 = V(0.32, land, -0.3);
    const pos = lv(p0, p1, E.io(fly)); pos.y = lerp(p0.y, p1.y, fly) + Math.sin(Math.PI * fly) * 0.9;
    cat.position.copy(pos); cat.position.y += landed ? br * 0.02 : 0;
    cat.rotation.set(t > tJump && !landed ? lerp(-0.45, 0.35, fly) : 0.12 * crouch, t < tJump ? -Math.PI / 2 : lerp(-Math.PI / 2, -2.6, E.out(seg(t, tJump, tLand + 0.4))), 0);
    const sq = landed ? 1 - 0.28 * wob(t, tLand, 2.2, 7) - 0.05 * Math.exp(-(t - tLand) * 4) : t > tJump ? 1 + 0.12 * Math.sin(Math.PI * fly) : 1 - 0.18 * crouch;
    cat.scale.set(0.42 / Math.sqrt(sq), 0.42 * sq, 0.42 / Math.sqrt(sq));
    cat.userData.setLid(landed ? lerp(0.2, 0.55, smooth(tLand + 0.4, tLand + 0.8, t)) : 0.12);
    cat.userData.setEars(t > tCrouch && !landed ? 0.6 : 0);
    const c = E.io(seg(t, C.body - 0.2, C.yousee + 0.3));
    shoot(s.cam, lv(V(5.0, 3.3, 1.4), V(4.4, 3.05, 0.9), c), lv(V(0.9, 1.05, -0.35), V(0.6, 1.3, -0.6), c), { fov: 40, t });
  };
});

// =====================================================================
// 3) The brainstem blocks the signals to your muscles
// =====================================================================
shot(C.yousee, C.so, (s) => {
  const sc = s.scene; sc.background = BG.xray; s.ap = 0; s.bloom = 0.5; s.exposure = 1.0;
  const P = new THREE.Group(); P.rotation.y = -0.38; sc.add(P);
  const xp = makePerson({ override: XM(), legs: true }); P.add(xp); xp.userData.head.children.forEach((c, i) => { if (i > 0) c.visible = false; });
  const brain = makeBrain(); brain.scale.multiplyScalar(0.31); brain.material = glow(0xff7fb8, 0.55); brain.position.set(0, 3.03, -0.03); P.add(brain);
  const tube = (pts, r, mat) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, r, 10), mat); P.add(m); return m; };
  const cordM = nerveMat(), cord = tube([V(0, 2.98, -0.08), V(0, 2.75, -0.1), V(0, 2.5, -0.12), V(0, 2.1, -0.16), V(0, 1.7, -0.17), V(0, 1.32, -0.15)], 0.032, cordM);
  cordM.uniforms.gate.value = 0.2;
  const branchM = nerveMat(); branchM.uniforms.dens.value = 2;
  [[V(0, 2.32, -0.13), V(0.32, 2.3, -0.05), V(0.52, 2.12, 0), V(0.56, 1.7, 0.02), V(0.6, 1.2, 0.03)], [V(0, 2.32, -0.13), V(-0.32, 2.3, -0.05), V(-0.52, 2.12, 0), V(-0.56, 1.7, 0.02), V(-0.6, 1.2, 0.03)],
   [V(0, 1.34, -0.15), V(0.18, 1.22, -0.04), V(0.2, 0.8, 0), V(0.2, 0.3, 0.02), V(0.2, 0.08, 0.12)], [V(0, 1.34, -0.15), V(-0.18, 1.22, -0.04), V(-0.2, 0.8, 0), V(-0.2, 0.3, 0.02), V(-0.2, 0.08, 0.12)],
   [V(0, 1.9, -0.17), V(0.25, 1.85, -0.1), V(0.36, 1.7, -0.05)], [V(0, 1.9, -0.17), V(-0.25, 1.85, -0.1), V(-0.36, 1.7, -0.05)]].forEach(pts => tube(pts, 0.016, branchM));
  const G = V(0, 2.62, -0.1);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 12, 56), glow(0xff3a4a, 0.9)); ring.rotation.x = Math.PI / 2; ring.position.copy(G); P.add(ring);
  const shutters = [-1, 1].map(sd => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.15, 40, sd > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI), glow(0xff2a3a, 0.9)); m.rotation.x = -Math.PI / 2; P.add(m); return { m, sd }; });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), glow(0xff6a6a, 0)); flash.position.copy(G); P.add(flash);
  const sparks = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), hdr(4, 1.6, 1.2, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); P.add(m); sparks.push(m); }
  const motes = new THREE.Group(); sc.add(motes); const r = rng(9); for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.01 + r() * 0.012, 6, 4), glow(0x6fb6ff, 0.35)); m.position.set((r() - 0.5) * 6, r() * 5, (r() - 0.5) * 4 - 1); motes.add(m); }
  s.update = (t) => {
    const close = spring(t, C.brainstem - 0.12, 1.8, 6), dim = smooth(C.brainstem, C.brainstem + 0.35, t);
    [cordM, branchM].forEach(m => { m.uniforms.uT.value = t; m.uniforms.dim.value = dim; });
    shutters.forEach(({ m, sd }) => m.position.set(G.x + sd * 0.25 * (1 - close), G.y, G.z));
    ring.material.opacity = 0.35 + 0.6 * smooth(C.brainstem - 0.3, C.brainstem, t);
    // a pulse reaches the gate every 1/speed seconds; each one flashes and throws sparks
    const sp = cordM.uniforms.speed.value, arr = (((t * sp - (0.2 * 3 - 0.5)) % 1) + 1) % 1 / sp;
    const hitK = dim * Math.exp(-arr * 11); flash.material.opacity = 0.7 * hitK; flash.scale.setScalar(1 + 0.8 * hitK);
    sparks.forEach((m, i) => { const a = i * 2.4, el = (h3(i, 3, 1) - 0.3) * 1.2; const d = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); m.position.copy(G).addScaledVector(d, 0.05 + arr * 0.9); m.scale.setScalar(dim * Math.max(0.0001, 1 - arr * 2.5)); });
    // limbs twitch while signals get through, then hang still
    const tw = (1 - dim) * 0.06; const xu = xp.userData; xu.arms.forEach((a, i) => a.sh.rotation.set(tw * Math.sin(t * 13 + i), 0, a.sx * (0.14 + tw * Math.sin(t * 9 + i * 2))));
    motes.position.y = 0.08 * Math.sin(t * 0.5);
    P.updateMatrixWorld(true); const Gw = P.localToWorld(G.clone());
    xp.children[0].material.uniforms.fade.value = lerp(1, 0.32, smooth(C.signals - 0.05, C.signals + 0.25, t));
    if (t < C.signals) { const c = E.io(seg(t, C.yousee - 0.2, C.signals + 0.2)); shoot(s.cam, lv(V(2.7, 2.9, 4.5), V(2.0, 2.75, 3.8), c), V(0, 2.05, 0), { fov: 38, t }); }
    else { const c = E.io(seg(t, C.signals, C.so + 0.3)); shoot(s.cam, Gw.clone().add(lv(V(-0.9, 0.55, -1.25), V(-0.75, 0.48, -1.02), c)), Gw.clone().add(V(0, 0.12, 0)), { fov: 34, t, hand: 0.6 }); }
  };
});

// =====================================================================
// 4) Dream-you kicks a ball; real-you stays still under the covers
// =====================================================================
shot(C.so, C.scientists, (s) => {
  const { sc, R, A, u, bl, pose } = bedScene(s); s.ap = 4; s.exposure = 0.92;
  const bulges = eyeBulges(A);
  const bub = cloudPuffs(1.55, 1.9); sc.add(bub);
  const trail = [0.1, 0.15, 0.21].map(r => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.65, sheen: 1 })); m.castShadow = true; sc.add(m); return m; });
  const rt = new THREE.WebGLRenderTarget(560, 680, { samples: 4, type: THREE.HalfFloatType });
  const screen = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ map: rt.texture })); screen.scale.set(0.78, 0.95, 1); screen.position.z = 0.3; bub.add(screen);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 10, 72), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, sheen: 1 })); rim.scale.set(0.78, 0.95, 1); rim.position.z = 0.3; bub.add(rim);
  // the dream
  const ds = new THREE.Scene(); ds.background = DREAMBG; ds.environment = DENV; ds.fog = new THREE.Fog(0xc9a6ff, 10, 26);
  ds.add(new THREE.HemisphereLight(0xfff0ff, 0x7a5ad8, 0.8)); const dk = new THREE.DirectionalLight(0xfff2e0, 2.6); dk.position.set(3, 7, 5); dk.castShadow = true; dk.shadow.mapSize.set(1024, 1024); Object.assign(dk.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); ds.add(dk);
  const dc = new THREE.PerspectiveCamera(42, 0.78 / 0.95, 0.1, 100);
  const grassT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6fcf6a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 8; i += 2) g.fillRect(i * 32, 0, 32, h); noiseFill(g, w, h, 6, 30); }, { rep: [3, 3] });
  const isl = new THREE.Mesh(new THREE.CylinderGeometry(4, 2.6, 0.7, 64), [new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: grassT, roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: 0x8a5a3a })]); isl.position.y = -0.35; isl.receiveShadow = true; ds.add(isl);
  for (let i = 0; i < 5; i++) { const c = cloudPuffs(1.2 + i * 0.2, 0.5, 0xffffff); c.position.set(-6 + i * 3, 3.5 + (i % 2), -8); ds.add(c); }
  const goal = new THREE.Group(); goal.position.set(-2.4, 0, -0.9); goal.rotation.y = 0.55; ds.add(goal);
  const postM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  [[-0.9, 0.6, 0, 0.05, 1.2], [0.9, 0.6, 0, 0.05, 1.2]].forEach(([x, y, z, r, h]) => { const pp = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), postM); pp.position.set(x, y, z); pp.castShadow = true; goal.add(pp); });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.85, 12), postM); bar.rotation.z = Math.PI / 2; bar.position.y = 1.2; goal.add(bar);
  const netT = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, { rep: [6, 4] });
  const netG = new THREE.PlaneGeometry(1.8, 1.2, 12, 8); const net = new THREE.Mesh(netG, new THREE.MeshBasicMaterial({ map: netT, transparent: true, side: THREE.DoubleSide, depthWrite: false })); net.position.set(0, 0.6, -0.45); goal.add(net);
  const netBase = Float32Array.from(netG.attributes.position.array);
  const dA = makeChar2(PJ); ds.add(dA); const ball = soccerBall(); ds.add(ball);
  const kick = 13.24, tGoal = 13.72;
  s.update = (t) => {
    const br = pose(t); rem(bulges, t, 5); R.shaft.userData.update(t);
    // the real leg barely twitches: the block holds
    bl.userData.set({ breath: br, pokes: [{ x: 0.21, z: -1.5 + 2.86, h: 0.62 + 0.04 * wob(t, kick, 5, 9), r: 0.2 }] });
    A.updateMatrixWorld(true); const hw = worldOf(u.head, V(0, 0.46, 0.1));
    const grow = spring(t, C.so + 0.12, 1.5, 6);
    bub.position.copy(hw).add(V(0.05, 2.25, 0.35)); bub.scale.setScalar(Math.max(0.0001, grow));
    trail.forEach((m, i) => { m.position.copy(hw).add(V(0.02 * i, 0.32 + i * 0.5, 0.18 + 0.05 * i)); m.scale.setScalar(Math.max(0.0001, spring(t, C.so + i * 0.07, 2, 6))); });
    // dream: run-up, plant, wind back, strike, follow through, celebrate
    const du = dA.userData; du.reset(); dA.rotation.y = -Math.PI / 2 + 0.25;
    const runEnd = kick - 0.2, run = seg(t, C.so, runEnd);
    dA.position.set(lerp(2.3, 0.62, E.outQ(run)), 0, lerp(0.55, 0.3, run));
    const ph = (t - C.so) * 10; const runAmt = 1 - smooth(runEnd - 0.12, runEnd + 0.05, t);
    du.gait(ph, runAmt * 0.9, 0.75); dA.position.y += du.bob; dA.rotation.x = du.lean;
    const L = du.legs[1], O = du.legs[0];
    if (t > runEnd - 0.05) {
      const k = kf(t, [[runEnd - 0.05, [0, 0.1]], [kick - 0.06, [0.85, 1.5], E.out], [kick, [-0.55, 0.45], E.in], [kick + 0.12, [-1.45, 0.05], E.out], [kick + 0.5, [-0.5, 0.2]], [kick + 0.8, [0, 0.1]]]);
      L.hip.rotation.x = k[0]; L.knee.rotation.x = k[1]; O.knee.rotation.x = 0.25; O.hip.rotation.x = 0.15;
      du.arms[0].sh.rotation.set(-0.4 * smooth(runEnd, kick, t), 0, -1.0 * smooth(runEnd, kick, t)); du.arms[1].sh.rotation.set(0.5, 0, 0.6 * smooth(runEnd, kick, t));
      dA.rotation.x = -0.12 * smooth(kick - 0.1, kick + 0.1, t);
    }
    const cel = spring(t, tGoal + 0.1, 1.4, 4); if (t > tGoal) { du.arms.forEach(a => a.sh.rotation.set(0, 0, a.sx * 2.6 * cel)); dA.position.y += 0.25 * Math.max(0, Math.sin(Math.PI * clamp((t - tGoal - 0.1) / 0.35))); du.mouthOpen(0.35 * cel); du.hands.forEach(h => h.curl(0.9)); }
    du.lid(0.12, t, 2); du.gaze(0.25, 0.2);
    // ball: squashes on contact, flies with spin, bulges the net
    const contact = kick + 0.0, fl = clamp((t - contact) / (tGoal - contact));
    const b0 = V(0.25, 0.22, 0.32), b1 = goal.localToWorld(V(0, 0.7, -0.35));
    if (t < contact) { ball.position.copy(b0); ball.scale.setScalar(1); }
    else if (t < tGoal) { ball.position.copy(lv(b0, b1, fl)); ball.position.y += Math.sin(Math.PI * fl) * 0.55; ball.rotation.set(fl * 14, fl * 6, 0); const sq = 1 - 0.3 * Math.exp(-(t - contact) * 30); ball.scale.set(sq, 1 / Math.sqrt(sq), 1 / Math.sqrt(sq)); }
    else { const a = t - tGoal; ball.position.copy(b1).add(V(0, -Math.min(a * a * 4.9, 0.48), 0)); ball.scale.setScalar(1); }
    const bulge = t > tGoal ? 0.32 * Math.exp(-(t - tGoal) * 3) * Math.cos((t - tGoal) * 14) : 0; const np = netG.attributes.position;
    for (let i = 0; i < np.count; i++) { const x = netBase[i * 3], y = netBase[i * 3 + 1]; np.setZ(i, -bulge * Math.max(0, 1 - (x * x / 0.5 + (y - 0.1) * (y - 0.1) / 0.3))); } np.needsUpdate = true;
    dc.position.set(0.9, 2.3, 7.0); dc.lookAt(-0.7, 1.15, 0); renderer.setRenderTarget(rt); renderer.render(ds, dc);
    if (t < C.act) { const c = E.io(seg(t, C.so - 0.3, C.act + 0.3)); shoot(s.cam, lv(V(2.2, 4.9, 6.3), V(1.9, 4.6, 5.7), c), V(0, 3.15, -0.9), { fov: 40, t }); s.ap = 3; }
    else { const c = E.io(seg(t, C.act, C.scientists + 0.3)), cp = bub.position.clone().add(lv(V(0.55, -0.35, 4.1), V(0.4, -0.3, 3.55), c)); shoot(s.cam, cp, bub.position.clone().add(V(0, -0.55, 0)), { fov: 40, t, focus: cp.distanceTo(bub.position) }); s.ap = 4; }
    bub.lookAt(s.cam.position.clone().setY(bub.position.y));
  };
});

// =====================================================================
// 5) Dreams may help sort your memories
// =====================================================================
function dreamSpace(sc, fogC = 0xd2b0ff) {
  sc.background = DREAMBG; sc.environment = DENV; sc.fog = new THREE.Fog(fogC, 9, 24);
  sc.add(new THREE.HemisphereLight(0xfff0ff, 0x8a6ae0, 0.75));
  const k = new THREE.DirectionalLight(0xfff4ea, 2.5); k.position.set(3, 7, 5); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); k.shadow.bias = -0.0003; k.shadow.normalBias = 0.02; k.userData.soft = 0.3; sc.add(k);
  const rim = new THREE.DirectionalLight(0xffb8f0, 1.4); rim.position.set(-5, 4, -6); sc.add(rim);
  return k;
}
shot(C.scientists, C.and1, (s) => {
  const sc = s.scene; dreamSpace(sc); s.ap = 5; s.exposure = 1.0; s.bloom = 0.38;
  const cloudM = new THREE.MeshPhysicalMaterial({ color: 0xfff2fb, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xffffff) });
  const r = rng(4); for (let i = 0; i < 26; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.7 + r() * 0.6, 32, 20), cloudM); const a = r() * Math.PI * 2, d = r() * 2.8; c.position.set(Math.cos(a) * d, -0.55 + r() * 0.2, Math.sin(a) * d - 0.4); c.scale.y = 0.55; c.receiveShadow = true; sc.add(c); }
  const cab = new THREE.Group(); cab.position.set(-1.0, 0, -0.8); cab.rotation.y = 0.38; sc.add(cab);
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x9fb0c4, roughness: 0.32, metalness: 0.7, clearcoat: 0.4 });
  const box = new THREE.Mesh(new RoundedBoxGeometry(1.45, 3.05, 1.25, 4, 0.06), metal); box.position.y = 1.52; box.castShadow = box.receiveShadow = true; cab.add(box);
  const mem = textPlane('MEMORIES', 1.5, '#ffffff', '#3a2a7a'); mem.position.set(0, 3.42, 0.66); mem.userData.dofMap = mem.material.map; cab.add(mem);
  const labels = ['SUMMER', 'FRIENDS', 'SCHOOL'];
  const drawers = [0, 1, 2].map(i => {
    const d = new THREE.Group(); d.position.set(0, 0.55 + i * 0.97, 0.62); cab.add(d);
    const f = new THREE.Mesh(new RoundedBoxGeometry(1.28, 0.86, 0.08, 3, 0.04), new THREE.MeshPhysicalMaterial({ color: 0xc2ccd8, roughness: 0.28, metalness: 0.55 })); f.castShadow = true; d.add(f);
    const hnd = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.07, 0.07, 2, 0.03), M.chrome); hnd.position.set(0, -0.1, 0.07); d.add(hnd);
    const card = textPlane(labels[i], 0.5, '#2a2a40', '#ffffff'); card.position.set(0, 0.17, 0.05); card.userData.dofMap = card.material.map; d.add(card);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.72, 0.95), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.5 })); tray.position.z = -0.48; tray.castShadow = true; d.add(tray);
    return d;
  });
  const N = 8, photos = []; for (let i = 0; i < N; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.41), new THREE.MeshStandardMaterial({ map: photoTex(KINDS[i % KINDS.length]), side: THREE.DoubleSide, roughness: 0.6 })); p.castShadow = true; sc.add(p); photos.push(p); }
  const sparkle = []; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), hdr(3, 2.6, 3.4)); m.position.set((r() - 0.5) * 7, r() * 5, (r() - 0.5) * 5 - 1); sc.add(m); sparkle.push(m); }
  const dA = makeChar2(PJ); dA.position.set(0.75, 0, 0.35); sc.add(dA);
  const T0 = C.scientists + 0.12, dt = 0.2, fly = 0.62;
  const target = i => i < 4 ? 0 : 1;
  s.update = (t) => {
    const openK = [spring(t, T0 - 0.05, 1.6, 5) * (1 - spring(t, T0 + 3 * dt + fly + 0.05, 1.8, 7)), spring(t, T0 + 3 * dt + 0.1, 1.6, 5) * (1 - spring(t, T0 + 7 * dt + fly + 0.05, 1.8, 7)), 0];
    drawers.forEach((d, i) => d.position.z = 0.62 + 0.62 * openK[i]);
    cab.updateMatrixWorld(true);
    let look = null;
    photos.forEach((p, i) => {
      const t0 = T0 + i * dt, a = clamp((t - t0) / fly), e = E.io(a);
      const start = V(2.6 - (i % 3) * 0.5, 4.6 + (i % 2) * 0.4, 1.6), dz = worldOf(drawers[target(i)], V(0, 0.25, -0.3)), mid = start.clone().lerp(dz, 0.5).add(V(0.6, 0.9, 0.9));
      p.position.copy(lv(lv(start, mid, e), lv(mid, dz, e), e));
      p.rotation.set(-0.5 + e * 1.3 + 0.25 * Math.sin(t * 7 + i), e * 2.6 + i, 0.3 * Math.sin(t * 5 + i * 2));
      p.scale.setScalar(a >= 1 ? 0.0001 : lerp(1, 0.7, e)); p.visible = t > t0 - 0.02;
      if (a > 0 && a < 1 && !look) look = p.position.clone();
    });
    sparkle.forEach((m, i) => { m.scale.setScalar(0.5 + 0.5 * Math.sin(t * 6 + i * 1.7)); m.position.y += 0; });
    // dream-you directs the stream: head tracks the current photo, arms lead with the shoulder and drag the hand
    const du = dA.userData; du.reset(); dA.rotation.y = -0.65; du.lid(0.15, t, 4);
    dA.updateMatrixWorld(true);
    if (look) { const hp = du.head.getWorldPosition(new THREE.Vector3()); const d = look.clone().sub(hp); du.head.rotation.y = clamp(Math.atan2(d.x, d.z) + 0.65, -0.9, 0.9) * 0.7; du.head.rotation.x = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 0.4) * 0.7; }
    du.arms.forEach((a, i) => { const ph = t * 5.2 + i * 1.6; a.sh.rotation.set(-1.15 + 0.32 * Math.sin(ph), 0, a.sx * (0.35 + 0.15 * Math.sin(ph - 0.6))); a.el.rotation.set(-0.55 - 0.35 * Math.sin(ph - 0.9), 0, 0); });
    du.hands.forEach((h, i) => h.curl(0.15 + 0.15 * Math.sin(t * 5 + i), 1)); du.mouthOpen(0.12 + 0.08 * Math.sin(t * 3)); dA.position.y = 0.02 * Math.sin(t * 5.2 * 2);
    dA.rotation.z = 0.03 * Math.sin(t * 2.6);
    const c = E.io(seg(t, C.scientists - 0.3, C.and1 + 0.3));
    shoot(s.cam, lv(V(3.6, 3.2, 7.4), V(2.9, 2.95, 6.6), c), V(0.05, 1.95, 0), { fov: 40, t, focus: lv(V(3.6, 3.2, 7.4), V(2.9, 2.95, 6.6), c).distanceTo(V(0.4, 2.2, 0.2)) });
  };
});

// =====================================================================
// 6) Being chased is one of the most common dreams
// =====================================================================
function monster2() {
  const g = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({ color: 0x6a34e0, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 1, sheenColor: new THREE.Color(0xc89cff), emissive: 0x16053a });
  const bg = new THREE.SphereGeometry(1.2, 72, 54), bp = bg.attributes.position;
  for (let i = 0; i < bp.count; i++) { const v = V(bp.getX(i), bp.getY(i), bp.getZ(i)); const n = v.clone().normalize(); const k = 1 + 0.07 * noise3(n.x * 2.4, n.y * 2.4, n.z * 2.4) + 0.03 * noise3(n.x * 6, n.y * 6, n.z * 6); bp.setXYZ(i, v.x * k, v.y * k * 1.1, v.z * k * 0.92); }
  bg.computeVertexNormals();
  const bodyG = new THREE.Group(); bodyG.position.y = 1.45; g.add(bodyG);
  const body = new THREE.Mesh(bg, skin); body.castShadow = true; bodyG.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.8, 40, 28), new THREE.MeshPhysicalMaterial({ color: 0x9a76f2, roughness: 0.5, sheen: 1 })); belly.scale.set(1, 1.05, 0.5); belly.position.set(0, -0.3, 0.72); bodyG.add(belly);
  const spotsM = new THREE.MeshPhysicalMaterial({ color: 0x4a1fb0, roughness: 0.5 }); const r = rng(3);
  for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, el = (r() - 0.2) * 1.2; const n = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); if (n.z > 0.5) continue; const sp = new THREE.Mesh(new THREE.SphereGeometry(0.12 + r() * 0.08, 16, 10), spotsM); sp.position.copy(n.multiply(V(1.18, 1.3, 1.08))); sp.scale.z = 0.3; sp.lookAt(0, 0, 0); bodyG.add(sp); }
  const eyes = [-1, 1].map(sx => { const e = new THREE.Group(); e.position.set(sx * 0.42, 0.52, 0.95); bodyG.add(e); const w = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xfffbf2, roughness: 0.15, clearcoat: 1 })); e.add(w); const iris = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xffc21a, roughness: 0.2, emissive: 0x6a3a00 })); iris.position.z = 0.17; iris.scale.z = 0.5; e.add(iris); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 10), M.black); pu.position.z = 0.235; pu.scale.set(0.6, 1.2, 0.4); e.add(pu); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), hdr(3, 3, 3)); gl.position.set(0.06, 0.08, 0.26); e.add(gl); const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 6, 12), spotsM); brow.position.set(-sx * 0.02, 0.3, 0.14); brow.rotation.z = Math.PI / 2 + sx * 0.45; e.add(brow); return e; });
  const horns = [-1, 1].map(sx => { const h = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 20), new THREE.MeshPhysicalMaterial({ color: 0xffe2b0, roughness: 0.35 })); h.position.set(sx * 0.55, 1.15, 0.1); h.rotation.z = -sx * 0.4; h.castShadow = true; bodyG.add(h); return h; });
  const mouth = new THREE.Group(); mouth.position.set(0, -0.12, 0.98); bodyG.add(mouth);
  const cav = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0x2a0818, roughness: 0.6 })); cav.scale.set(1.1, 0.45, 0.35); mouth.add(cav);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0xe04a70, roughness: 0.4 })); tongue.scale.set(1.3, 0.4, 1); tongue.position.set(0, -0.12, 0.05); mouth.add(tongue);
  const toothM = new THREE.MeshPhysicalMaterial({ color: 0xfffaf0, roughness: 0.2, clearcoat: 1 });
  const upper = new THREE.Group(), lower = new THREE.Group(); mouth.add(upper, lower);
  for (let i = 0; i < 8; i++) { const x = -0.44 + i * 0.125; const tu = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.17, 10), toothM); tu.position.set(x, 0.12, 0.12 - Math.abs(x) * 0.25); tu.rotation.x = Math.PI; upper.add(tu); if (i % 2) { const tl = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.13, 10), toothM); tl.position.set(x, -0.12, 0.12 - Math.abs(x) * 0.25); lower.add(tl); } }
  const tentM = skin; const tents = [[-1, 0.0, 0.5], [1, 0.0, 0.5], [-1, -0.5, -0.1], [1, -0.5, -0.1]].map(([sx, y, z]) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), tentM); m.castShadow = true; bodyG.add(m); return { m, sx, y, z }; });
  const api = {
    body: bodyG, eyes, mouth, upper, lower, cav,
    tentacles(t, reach = 0, tgtLocal = null) {
      tents.forEach(({ m, sx, y, z }, i) => {
        const base = V(sx * 1.0, y, z), w = (k) => V(Math.sin(t * 3.1 + i + k * 2.2) * 0.25, Math.cos(t * 2.7 + i * 1.3 + k * 1.9) * 0.25, Math.sin(t * 2.3 + i * 0.7 + k) * 0.2);
        let mid = base.clone().add(V(sx * 0.7, -0.15, 0.4)).add(w(1)), tip = base.clone().add(V(sx * 1.2, -0.55, 0.6)).add(w(2).multiplyScalar(1.6));
        if (i < 2 && reach > 0 && tgtLocal) { tip.lerp(tgtLocal.clone().add(V(sx * 0.35, 0, 0)), reach); mid.lerp(base.clone().lerp(tgtLocal, 0.5).add(V(sx * 0.4, 0.3, 0)), reach); }
        const curve = new THREE.CatmullRomCurve3([base, base.clone().lerp(mid, 0.5).add(V(0, 0.1, 0)), mid, tip]);
        const TS = 40, RS = 12, geo = new THREE.TubeGeometry(curve, TS, 0.16, RS, false), p = geo.attributes.position;
        for (let j = 0; j <= TS; j++) { const c = curve.getPointAt(j / TS), f = 1 - 0.75 * j / TS; for (let k = 0; k <= RS; k++) { const idx = j * (RS + 1) + k; p.setXYZ(idx, c.x + (p.getX(idx) - c.x) * f, c.y + (p.getY(idx) - c.y) * f, c.z + (p.getZ(idx) - c.z) * f); } }
        geo.computeVertexNormals(); m.geometry.dispose(); m.geometry = geo;
      });
    },
    look(dirLocal) { eyes.forEach(e => { e.lookAt(e.getWorldPosition(new THREE.Vector3()).add(dirLocal)); }); },
    jaw(o) { lower.position.y = -0.22 * o; cav.scale.set(1.1, 0.45 + 0.6 * o, 0.35); tongue.position.y = -0.12 - 0.15 * o; },
  };
  api.jaw(0.2); api.tentacles(0);
  g.userData = api; return g;
}
shot(C.and1, C.but, (s) => {
  const sc = s.scene; dreamSpace(sc, 0x9a6ae6); s.ap = 6; s.exposure = 0.95; s.sub = 4; s.bloom = 0.4;
  sc.fog = new THREE.Fog(0x9a6ae6, 7, 26);
  const cc = canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#f2e8ff' : '#5a3ab8'; g.fillRect(i * 32, j * 32, 32, 32); } }, { rep: [2, 16] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 60), new THREE.MeshStandardMaterial({ map: cc, roughness: 0.22, metalness: 0.0 })); floor.rotation.x = -Math.PI / 2; floor.position.z = -20; floor.receiveShadow = true; sc.add(floor);
  const props = [];
  const pilM = new THREE.MeshStandardMaterial({ color: 0xffc8f0, roughness: 0.35 }), doorM = new THREE.MeshStandardMaterial({ color: 0x8a5ad8, roughness: 0.5 }), frameM = new THREE.MeshStandardMaterial({ color: 0xffe6f8, roughness: 0.4 });
  for (let k = 0; k < 14; k++) [-1, 1].forEach(sd => {
    const g = new THREE.Group(); g.userData.k = k; sc.add(g); props.push(g);
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 6, 20), pilM); pl.position.set(sd * 2.7, 3, 0); pl.castShadow = true; g.add(pl);
    if ((k + (sd > 0 ? 1 : 0)) % 2) { const d = new THREE.Group(); d.position.set(sd * 2.9, 0, -2); d.rotation.y = -sd * Math.PI / 2; g.add(d); const fr = new THREE.Mesh(new RoundedBoxGeometry(1.1, 2.3, 0.12, 2, 0.03), frameM); fr.position.y = 1.15; d.add(fr); const dd = new THREE.Mesh(new RoundedBoxGeometry(0.9, 2.1, 0.1, 2, 0.02), doorM); dd.position.set(0, 1.08, 0.04); d.add(dd); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffd060, metalness: 1, roughness: 0.25 })); kn.position.set(0.32, 1.05, 0.12); d.add(kn); }
  });
  const A = makeChar2(PJ); sc.add(A);
  const mon = monster2(); sc.add(mon);
  const puffs = []; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf0e6ff, transparent: true, opacity: 0.5, depthWrite: false })); sc.add(m); puffs.push(m); }
  const tTurn = C.and1 + 0.55, tRise = C.and1 + 0.8, cad = 9.6;
  s.update = (t) => {
    const runOn = smooth(C.which - 0.1, C.which + 0.25, t), speed = lerp(1.4, 7.5, runOn);
    const dist = (t - C.and1) * 1.4 + Math.max(0, t - C.which) * 6.1;
    cc.offset.y = -dist / 60 * 16;
    props.forEach(g => { g.position.z = -g.userData.k * 4 + 4 - (dist % 4); });
    const u = A.userData; u.reset();
    // before the chase: walking, curious; hears it, turns around (anticipation), recoils
    const walkAmt = (1 - smooth(tTurn - 0.25, tTurn, t)) * (1 - runOn);
    const turn = t < C.which ? E.back(clamp((t - tTurn) / 0.38)) * (t > tTurn ? 1 : 0) : 0;
    A.rotation.y = t < C.which ? Math.PI * turn : 0;
    if (t < C.which) {
      u.gait((t - C.and1) * 6, walkAmt * 0.8, 0); u.head.rotation.y = 0.45 * Math.sin((t - C.and1) * 2.3) * walkAmt;
      const fear = spring(t, tRise + 0.15, 1.6, 5);
      u.eyePop(1 + 0.25 * fear); u.setLid(lerp(0.12, -0.28, clamp(fear))); u.mouthOpen(0.55 * clamp(fear)); A.rotation.x = -0.12 * clamp(fear);
      u.arms.forEach(a => { a.sh.rotation.set(-1.2 * clamp(fear), 0, a.sx * (0.14 + 0.5 * clamp(fear))); a.el.rotation.set(-1.4 * clamp(fear), 0, 0); }); u.hands.forEach(h => h.curl(0.05, 1));
      u.head.rotation.x = -0.1 * clamp(fear);
    } else {
      u.gait((t - C.which) * cad, runOn * 1.05, 1); A.rotation.x = u.lean;
      const glance = smooth(21.65, 21.85, t) * (1 - smooth(22.15, 22.35, t));
      u.head.rotation.y = 1.25 * glance; u.head.rotation.x = -0.05; u.eyePop(1.18); u.setLid(-0.2); u.mouthOpen(0.32 + 0.12 * Math.sin(t * 19)); u.gaze(0.5 * glance, 0);
    }
    A.position.set(0, u.bob * 1.4, 0);
    // monster: rises with a spring, then bounds after him with squash and stretch
    const rise = spring(t, tRise, 1.3, 4.5); const mh = (t - C.which) * 5.2;
    const hop = t > C.which ? Math.abs(Math.sin(mh)) : 0, land = t > C.which ? Math.pow(1 - Math.abs(Math.sin(mh)), 6) : 0;
    const mz = t < C.which ? -4.3 : lerp(-4.3, -3.4, smooth(C.which, C.but, t));
    mon.position.set(0.25 * Math.sin(t * 1.7), lerp(-3.4, 0, clamp(rise)) + hop * 0.55 * runOn, mz);
    mon.scale.set(1 + 0.14 * land - 0.05 * hop, (1 - 0.18 * land + 0.08 * hop) * Math.max(0.001, clamp(rise * 1.1)), 1 + 0.14 * land);
    mon.rotation.x = 0.12 * hop * runOn; const mu = mon.userData;
    mu.jaw(t < C.which ? 0.25 + 0.75 * spring(t, tRise + 0.25, 1.4, 5) * (1 - smooth(tRise + 0.9, tRise + 1.3, t)) : 0.45 + 0.3 * Math.sin(t * 6));
    mon.updateMatrixWorld(true); const hp = A.userData.head.getWorldPosition(new THREE.Vector3());
    mu.tentacles(t, smooth(22.2, 22.7, t) * 0.8, mu.body.worldToLocal(hp.clone()));
    mu.eyes.forEach(e => e.lookAt(hp));
    puffs.forEach((m, i) => { const k = Math.floor((t - C.which) * cad / Math.PI) - i; const tk = C.which + (k + 0.5) * Math.PI / cad, a = t - tk; const on = t > C.which && k >= 0 && a > 0 && a < 0.6; m.visible = on; if (on) { m.position.set((k % 2 ? 0.2 : -0.2) + 0.1 * Math.sin(i), 0.06 + a * 0.3, -a * 6.1 + 0.05); m.scale.setScalar(0.4 + a * 2.2); m.material.opacity = 0.45 * (1 - a / 0.6); } });
    if (t < C.which) { const c = E.io(seg(t, C.and1 - 0.3, C.which + 0.2)); shoot(s.cam, lv(V(1.3, 2.8, 5.0), V(1.0, 2.6, 4.2), c), V(0, 2.1, -1.6), { fov: 40, t, focus: lv(V(1.3, 2.8, 5.0), V(1.0, 2.6, 4.2), c).distanceTo(V(0, 2.4, 0)) }); s.ap = 6; }
    else if (t < C.chased) { const sh = shake(t, 0.025); shoot(s.cam, V(0.5, 2.7, 4.8).add(sh), V(0, 2.05, -1.8), { fov: 42, t, hand: 1.6, focus: 4.8 }); s.ap = 7; }
    else if (t < C.common) { const c = E.io(seg(t, C.chased - 0.2, C.common + 0.2)); shoot(s.cam, lv(V(2.1, 0.8, 5.4), V(1.8, 0.75, 4.8), c).add(shake(t, 0.02)), V(-0.1, 2.1, -1.5), { fov: 44, t, hand: 1.5, roll: -5, focus: 5.0 }); s.ap = 6; }
    else { const c = E.io(seg(t, C.common - 0.2, C.but + 0.2)); shoot(s.cam, lv(V(0.6, 3.25, 4.1), V(0.5, 3.15, 3.5), c).add(shake(t * 0.35, 0.012)), V(0, 2.85, 0.45), { fov: 36, t, hand: 1.0 }); s.ap = 9; }
  };
});

// =====================================================================
// 7) When the block fails: punching and kicking in your sleep
// =====================================================================
shot(C.but, C.and2, (s) => {
  const sc = s.scene; const R = room(sc, { double: true }); s.ap = 5; s.exposure = 0.92;
  const Bk = makeChar2({ ...CAST.M, barefoot: true }); sc.add(Bk); const Cc = makeChar2({ ...CAST.B, barefoot: true }); sc.add(Cc);
  pillow(sc, -0.75, -1.62, 1.15); pillow(sc, 0.75, -1.62, 1.15);
  const bl = drape(sc, { W: 3.0, color: 0x6a52c8, z0: -0.6 });
  const poseB = (t) => { const u = Bk.userData; u.reset(); lie(Bk, -0.75, -1.5); armsRest(u); u.setLid(1); return u.breathe(t, 0.25, 0.04); };
  const poseC = (t) => { const u = Cc.userData; u.reset(); lie(Cc, 0.75, -1.5, 0.08, 0.4); armsRest(u); u.setLid(1); return u.breathe(t, 0.21, 0.035, 1.3); };
  poseB(0); poseC(0); bl.userData.fitChar(Bk, 0); bl.userData.fitChar(Cc, 1); bl.userData.set();
  const p1 = C.punch, p2 = C.punch + 0.33, kk = C.kick, roll0 = C.kick + 0.06, edge = C.kick + 0.36, floorHit = C.kick + 0.62, wake = floorHit + 0.12;
  s.update = (t) => {
    const brB = poseB(t), brC = poseC(t); const ub = Bk.userData, uc = Cc.userData;
    // he starts to twitch, fists clench, then the strikes: wind-up, snap, overshoot, recoil
    const tw = smooth(C.people, C.people + 0.3, t);
    ub.head.rotation.y += 0.16 * tw * fbm(t * 6, 1); ub.head.rotation.z += 0.1 * tw * fbm(t * 5, 2); ub.hands.forEach(h => h.curl(0.3 + 0.7 * tw));
    ub.mouthOpen(0.1 * tw + 0.12 * (jolt(t, p1) + jolt(t, p2)));
    const a = ub.arms[1], o = ub.arms[0];
    const pk = (t0) => kf(t, [[t0 - 0.2, [-0.6, 0, -0.22]], [t0 - 0.05, [-0.25, 0.0, -0.55], E.out], [t0 + 0.03, [-1.75, 0.0, 0.55], E.in], [t0 + 0.12, [-1.65, 0, 0.45], E.out], [t0 + 0.28, [-0.7, 0, -0.1]]]);
    if (t > p1 - 0.2 && t < p2 + 0.3) { setRot(a.sh, t < p2 - 0.2 ? pk(p1) : pk(p2)); a.el.rotation.set(t < p2 - 0.2 ? kf(t, [[p1 - 0.05, -1.4], [p1 + 0.03, -0.05, E.in], [p1 + 0.25, -0.6]]) : kf(t, [[p2 - 0.05, -1.4], [p2 + 0.03, -0.05, E.in], [p2 + 0.25, -0.6]]), 0, 0); }
    setRot(o.sh, kf(t, [[p1 - 0.2, [-0.6, 0, 0.22]], [p1, [-1.1, 0, 0.1]], [p2, [-0.9, 0, 0.3]], [kk + 0.3, [-0.6, 0, 0.22]]]));
    const L = ub.legs[1]; const kL = kf(t, [[kk - 0.22, [0.02, 0.0]], [kk - 0.04, [-1.15, 1.75], E.out], [kk + 0.05, [-0.85, 0.08], E.in], [kk + 0.3, [-0.45, 0.25]], [kk + 0.7, [0.02, 0.05]]]);
    L.hip.rotation.x = kL[0]; L.knee.rotation.x = kL[1]; L.hip.rotation.z = 0.75 * smooth(kk - 0.05, kk + 0.05, t) * (1 - smooth(kk + 0.3, kk + 0.7, t));
    Bk.updateMatrixWorld(true); const foot = L.ankle.getWorldPosition(new THREE.Vector3()), knee = L.knee.getWorldPosition(new THREE.Vector3());
    // she is shoved, rolls off the edge, falls with gravity, hits the floor, wakes up furious
    const shove = E.out(seg(t, roll0, edge)), fall = clamp((t - edge) / (floorHit - edge)), onFloor = t >= floorHit;
    const roll = lerp(0, 1.25, shove) + 0.3 * E.in(fall);
    if (t > roll0) {
      Cc.rotation.y = roll; const x0 = 0.75 + 0.75 * shove, y0 = Cc.position.y;
      Cc.position.x = lerp(x0, 2.35, E.inQ(fall)); Cc.position.y = lerp(y0, 0.44, fall * fall) - (onFloor ? 0.04 * wob(t, floorHit, 4, 9) : 0);
    }
    const w = spring(t, wake, 1.5, 6);
    uc.setLid(t > wake ? lerp(1, -0.3, clamp(w)) : 1); uc.eyePop(1 + 0.22 * clamp(w)); uc.mouthOpen(0.45 * clamp(w)); if (t > wake) { uc.neck(-0.45 + 0.3 * clamp(w)); uc.head.rotation.y = -0.4 * clamp(w); uc.gaze(-0.3, -0.1); }
    bl.userData.set({ w: [1, 1 - smooth(roll0, edge, t)], breath: brB, pokes: t > kk - 0.25 && t < kk + 0.8 ? [{ x: knee.x, z: knee.z, h: knee.y - TOP + 0.1, r: 0.32 }, { x: foot.x, z: foot.z, h: foot.y - TOP + 0.14, r: 0.3 }] : [] });
    R.shaft.userData.update(t);
    const impact = onFloor ? 0.06 * Math.exp(-(t - floorHit) * 9) : 0;
    if (t < C.punch) { const c = E.io(seg(t, C.but - 0.3, C.punch + 0.3)); shoot(s.cam, lv(V(0.5, 6.4, 2.9), V(0.4, 6.0, 2.5), c), V(0, 1.25, -0.55), { fov: 42, t }); s.ap = 3; }
    else { const f2 = E.io(seg(t, edge - 0.15, floorHit + 0.3)); shoot(s.cam, lv(V(4.3, 4.2, 2.1), V(5.6, 2.45, 0.7), f2).add(shake(t, 0.02 * (jolt(t, p1) + jolt(t, p2) + jolt(t, kk)) + impact)), lv(V(0.1, 1.3, -0.65), V(2.3, 0.75, -1.25), f2), { fov: 42, t }); s.ap = 5; }
  };
});

// =====================================================================
// 8) Over a lifetime: about six years of dreaming
// =====================================================================
shot(C.and2, C.then, (s) => {
  const { sc, R, A, u, bl, pose } = bedScene(s); s.ap = 3.5; s.exposure = 0.95; s.bloom = 0.4;
  const bulges = eyeBulges(A);
  const cols = [0xff8ad8, 0x8ad8ff, 0xffe28a, 0xa8ff8a, 0xc29aff];
  const bubs = []; for (let i = 0; i < 14; i++) {
    const b = new THREE.Group(); const sp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 40, 28), new THREE.MeshPhysicalMaterial({ color: cols[i % 5], roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false, iridescence: 0.6 })); b.add(sp);
    const pic = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), new THREE.MeshBasicMaterial({ map: photoTex(KINDS[i % KINDS.length]), color: new THREE.Color(1.1, 1.1, 1.1) })); b.add(pic); b.userData.pic = pic;
    sc.add(b); bubs.push(b);
  }
  const lbl = textPlane('6 YEARS', 2.4, '#ffd23f', '#2a1a00'); lbl.userData.dofMap = lbl.material.map; lbl.renderOrder = 10; sc.add(lbl);
  const nightSky = R.sky.material.color.clone();
  s.update = (t) => {
    const br = pose(t); bl.userData.set({ breath: br }); rem(bulges, t, 8); R.shaft.userData.update(t);
    // the window races through days and nights
    const cyc = (t - C.and2) * 1.6, day = Math.pow(0.5 - 0.5 * Math.cos(cyc * Math.PI * 2), 2);
    R.sky.material.color.copy(nightSky).lerp(new THREE.Color(3.2, 3.0, 2.6), day); R.moon.visible = day < 0.4; R.moon.position.x = R.wx + 1.6 - 3.2 * ((cyc + 0.5) % 1);
    R.key.color.setHex(0xa8bcff).lerp(new THREE.Color(0xffd8a0), day); R.key.intensity = 2.6 + 3.0 * day;
    A.updateMatrixWorld(true); const hw = worldOf(u.head, V(0, 0.46, 0.1));
    bubs.forEach((b, i) => { const t0 = C.and2 + i * 0.24 - 0.5, a = t - t0; b.visible = a > 0; if (a <= 0) return; b.position.copy(hw).add(V(Math.sin(i * 2.1 + a * 0.8) * (0.25 + a * 0.32), 0.45 + a * 1.05, Math.cos(i * 1.7) * 0.35)); b.scale.setScalar(Math.max(0.0001, spring(t, t0, 1.8, 5)) * 0.85); b.lookAt(s.cam.position); });
    const c = E.io(seg(t, C.and2 - 0.3, C.then + 0.3));
    shoot(s.cam, lv(V(1.9, 3.7, 4.6), V(2.5, 5.2, 7.0), c), lv(V(0, 2.9, -0.8), V(0, 3.9, -0.8), c), { fov: 44, t });
    lbl.position.copy(lv(lv(V(0, 2.9, -0.8), V(0, 3.9, -0.8), c), s.cam.position, 0.42)); lbl.scale.setScalar(Math.max(0.0001, spring(t, C.six, 1.6, 6))); lbl.lookAt(s.cam.position);
  };
});

// =====================================================================
// 9) Morning: wake up, the dreams pop one by one, then they're gone
// =====================================================================
shot(C.then, C.end + 0.3, (s) => {
  const sc = s.scene; const R = room(sc, { night: false }); s.ap = 6; s.exposure = 1.0;
  const A = makeChar2(PJ); sc.add(A); pillow(sc, 0); const bl = drape(sc);
  const u = A.userData;
  const tA = C.then, tUp = C.then + 0.12, tSat = C.then + 0.75;
  const sit = (t) => {
    u.reset(); const dip = 0.06 * Math.sin(Math.PI * clamp((t - tA) / 0.14)) * (t < tUp ? 1 : 0);
    const up = t < tUp ? 0 : E.back(clamp((t - tUp) / (tSat - tUp)) * 0.94 + 0.06 * 0) ;
    const th = lerp(-Math.PI / 2 + 0.08, -0.12, clamp(up)) - dip, hy = lerp(1.34, 1.28, clamp(up));
    A.rotation.set(th, 0, 0); A.position.set(0, hy - 1.3 * Math.cos(th), 0.12 - 1.3 * Math.sin(th));
    u.legs.forEach((L, i) => L.hip.rotation.set(-Math.PI / 2 - th + 0.1, (i ? 1 : -1) * 0.25, 0));
    u.neck(lerp(0.45, 0.0, clamp(up)) + 0.25 * (1 - smooth(tA, tSat, t)) * (t < tUp ? 1 : 0));
    return up;
  };
  // fit the covers once lying (whole body) and once with only the legs under them
  sit(0); armsRest(u); bl.userData.fitChar(A, 0);
  [u.torso].forEach(m => m.userData.skipCloth = true); A.children.forEach(c => { if (c.isMesh && c.geometry.type === 'CylinderGeometry') c.userData.skipCloth = true; });
  bl.userData.fit([A], 1); u.torso.userData.skipCloth = false;
  const cols = [0xff8ad8, 0x8ad8ff, 0xffe28a, 0xa8ff8a, 0xc29aff, 0xff9a7a, 0x8affd8];
  const bubs = cols.map((c, i) => { const b = new THREE.Group(); const sp = new THREE.Mesh(new THREE.SphereGeometry(0.21, 36, 24), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.06, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false, iridescence: 0.7 })); b.add(sp); const pic = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28), new THREE.MeshBasicMaterial({ map: photoTex(KINDS[i % KINDS.length]), color: new THREE.Color(1.1, 1.1, 1.1) })); b.add(pic); sc.add(b); return b; });
  const rings = cols.map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 40), hdr(2.2, 2.2, 2.4, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sc.add(m); return m; });
  const drops = cols.map(() => Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), hdr(2, 2, 2.3, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sc.add(m); return m; }));
  const popT = [31.05, 31.3, 31.55, 31.8, 32.05, 32.3, 32.78];
  const tReach = 32.32, tScratch = 32.98;
  s.update = (t) => {
    const up = sit(t); R.shaft.userData.update(t);
    bl.userData.set({ w: [1 - clamp(up), 1], z0: lerp(-0.72, -0.05, clamp(up)) });
    // waking face: eyes open slowly, a big stretch and yawn, then groggy
    const open = smooth(tA + 0.25, tA + 0.6, t);
    u.setLid(lerp(1, 0.32, open) + 0.6 * u.blink(t, 3) * open);
    const str = smooth(tSat - 0.1, tSat + 0.35, t) * (1 - smooth(31.75, 32.15, t));
    u.stretch(0.9 * str); u.yawn(0.85 * str * (1 - smooth(31.6, 31.95, t))); u.mouthOpen(0.85 * str * (1 - smooth(31.6, 31.95, t)));
    if (str > 0.01) u.hands.forEach(h => h.curl(0.85 * str, 0.5));
    A.updateMatrixWorld(true); const hw = worldOf(u.head, V(0, 0.55, 0.05));
    let reachTgt = null;
    bubs.forEach((b, i) => {
      const a = (i - 3) / 3, home = hw.clone().add(V(0.86 * a, 0.42 + 0.3 * (1 - a * a) + (i % 2) * 0.28, 0.15)).add(V(0.03 * Math.sin(t * 2 + i), 0.04 * Math.sin(t * 1.7 + i * 2), 0));
      const tp = popT[i]; if (i === 6) home.add(V(0.12, 0.05, 0.25));
      b.position.copy(home); b.lookAt(s.cam.position);
      const wobS = 1 + 0.06 * Math.sin(t * 9 + i * 2) * (t < tp ? 1 : 0); const pre = t > tp - 0.06 && t < tp ? 1 + 0.25 * seg(t, tp - 0.06, tp) : 1;
      b.scale.setScalar(t < tp ? 0.8 * wobS * pre * Math.max(0.0001, smooth(tA - 0.2, tA + 0.3, t)) : 0.0001);
      const pk = seg(t, tp, tp + 0.32); rings[i].visible = pk > 0 && pk < 1; rings[i].position.copy(home); rings[i].scale.setScalar(0.6 + pk * 1.1); rings[i].material.color.setScalar(2.4 * (1 - pk)); rings[i].lookAt(s.cam.position);
      drops[i].forEach((d, j) => { const ang = j / 8 * Math.PI * 2 + i; d.visible = pk > 0 && pk < 1; d.position.copy(home).add(V(Math.cos(ang) * pk * 0.45, Math.sin(ang) * pk * 0.45 - pk * pk * 0.25, 0.05)); d.scale.setScalar(1 - pk); });
      if (i === 6) reachTgt = home;
    });
    // he notices the last one, reaches for it... it pops just before his fingers close
    const reach = smooth(tReach, popT[6] - 0.04, t) * (1 - smooth(popT[6] + 0.1, popT[6] + 0.45, t));
    if (reach > 0.001 && reachTgt) { aimArm(A, u.arms[1], reachTgt, reach * 0.95, 0.25); u.hands[1].curl(lerp(0.0, 0.2, reach) + 0.7 * smooth(popT[6] - 0.02, popT[6] + 0.1, t), 1); u.head.rotation.x += -0.35 * reach; u.head.rotation.y += -0.25 * reach; u.gaze(-0.2 * reach, -0.45 * reach); }
    // freeze, then scratch the head, puzzled
    const sc2 = smooth(tScratch, tScratch + 0.3, t);
    if (sc2 > 0) { aimArm(A, u.arms[1], hw.clone().add(V(0.55, 0.15, 0.1)), sc2, 1.9); u.arms[1].el.rotation.x = -1.9 * sc2 - 0.18 * Math.sin(t * 22) * sc2; u.hands[1].curl(0.5); u.head.rotation.z += -0.18 * sc2; u.head.rotation.y += 0.15 * sc2; u.gaze(0.25 * sc2, -0.2 * sc2); u.mouthOpen(0.1 * sc2); u.setLid(0.38); }
    u.life(t, 0.6, 2);
    const c = E.io(seg(t, C.then - 0.3, C.end + 0.3));
    shoot(s.cam, lv(V(1.7, 3.55, 4.6), V(1.45, 3.45, 4.0), c), V(0.05, 3.15, -0.5), { fov: 42, t });
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
const accum = pass(`uniform sampler2D t; uniform float w; varying vec2 vUv; void main(){ gl_FragColor=vec4(texture2D(t,vUv).rgb*w,1.); }`, { t: { value: null }, w: { value: 1 } }, { blending: THREE.AdditiveBlending, transparent: true });

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
const TR = { 3: [C.yousee - 0.14, C.yousee + 0.16, 3], 5: [C.scientists - 0.1, C.scientists + 0.22, 1], 7: [C.but - 0.12, C.but + 0.18, 4], 8: [C.and2 - 0.1, C.and2 + 0.22, 1] };

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
