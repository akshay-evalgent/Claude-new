// "Why We Hiccup" — procedural 3D short, rendered frame by frame.
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
  diaphragm: 0.16, yanks: 1.3, air: 2.4, and1: 4.04, vocal: 5.14, slam: 6.16, making: 7.26, hic: 7.8, it: 9.1, eating: 11.42,
  drinking: 12.76, irritating: 13.94, nerves: 14.6, yousee: 16.7, our: 19.36, because: 20.96, tadpoles: 21.38, push: 23.18,
  another: 25.02, babies: 26.62, burp: 27.0, but: 28.22, n68: 29.84, about: 31.32, million: 32.2, and2: 33.44, stopped: 34.02,
  year: 34.96, died: 35.54, end: 36.45,
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

// =====================================================================
// HICCUP HELPERS
// =====================================================================
const XM = () => xrayMat(new THREE.Color(0.55, 0.85, 1.0), new THREE.Color(0.04, 0.16, 0.42), 2.0, 1.0);
function diaphragmMesh() {
  const g = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.base = V(0.52, 0.3, 0.36); m.scale.copy(m.userData.base); return m;
}
// a hiccup "jolt": quick snap at t0, then settle
const jolt = (t, t0) => { const a = t - t0; if (a < 0 || a > 0.45) return 0; return a < 0.06 ? a / 0.06 : Math.exp(-(a - 0.06) * 9); };
const joltsAt = (t, times) => times.reduce((m, t0) => Math.max(m, jolt(t, t0)), 0);
function makeBaby(override = null) {
  const skin = override || new THREE.MeshPhysicalMaterial({ color: 0xf2b597, roughness: 0.45, sheen: 0.4, clearcoat: 0.2 });
  const onesie = override || new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, roughness: 0.8, sheen: 1 });
  const b = new THREE.Group();
  const head = new THREE.Group(); head.position.set(0, 0.62, 0); b.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 28), skin));
  [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10), override || M.black); e.position.set(sx * 0.14, 0.05, 0.38); head.add(e); const ck = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 10), override || new THREE.MeshBasicMaterial({ color: 0xff9aa0, transparent: true, opacity: 0.45 })); ck.position.set(sx * 0.22, -0.08, 0.33); ck.scale.z = 0.3; head.add(ck); });
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10), override || new THREE.MeshPhysicalMaterial({ color: 0x8a2433 })); mouth.position.set(0, -0.15, 0.39); mouth.scale.set(1, 0.6, 0.5); head.add(mouth);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.45, 10, 28), onesie); body.position.y = 0.0; b.add(body);
  [-1, 1].forEach(sx => { const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.32, 6, 16), onesie); a.position.set(sx * 0.42, 0.12, 0.12); a.rotation.z = sx * 0.6; a.rotation.x = -0.6; b.add(a); });
  b.traverse(o => { if (o.isMesh) o.castShadow = true; });
  b.userData = { head, mouth, body }; return b;
}
function oldMan() {
  const p = makePerson({ shirt: 0x8b6b4a, pants: 0x6d7480, hair: 0xd9d9d9, skinCol: 0xe7a98c, legs: false });
  const H = p.userData.head;
  const gm = new THREE.MeshPhysicalMaterial({ color: 0x2b2b2b, roughness: 0.3, metalness: 0.4 });
  [-1, 1].forEach(sx => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 32), gm); r.position.set(sx * 0.16, 0.09, 0.47); H.add(r); });
  const br = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), gm); br.rotation.z = Math.PI / 2; br.position.set(0, 0.1, 0.48); H.add(br);
  const mus = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 4, 12), new THREE.MeshPhysicalMaterial({ color: 0xe6e6e6, roughness: 0.7 })); mus.rotation.z = Math.PI / 2; mus.position.set(0, -0.11, 0.45); H.add(mus);
  const pm = new THREE.MeshPhysicalMaterial({ color: 0x6d7480, roughness: 0.8 });
  [-1, 1].forEach(sx => { const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.55, 8, 20), pm); th.rotation.x = Math.PI / 2; th.position.set(sx * 0.2, 1.35, 0.35); p.add(th); const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.7, 8, 20), pm); sh.position.set(sx * 0.2, 0.85, 0.68); p.add(sh); const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.14, 0.42, 4, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x3b2a20, roughness: 0.5 })); shoe.position.set(sx * 0.2, 0.4, 0.82); p.add(shoe); });
  p.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return p;
}
function rockingChair() {
  const wood = new THREE.MeshPhysicalMaterial({ color: 0x9a5b2e, roughness: 0.55, clearcoat: 0.4 });
  const c = new THREE.Group();
  const seat = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.12, 1.0, 4, 0.04), wood); seat.position.set(0, 1.25, 0.15); c.add(seat);
  const back = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.5, 0.1, 4, 0.04), wood); back.position.set(0, 2.05, -0.35); back.rotation.x = -0.12; c.add(back);
  [-1, 1].forEach(sx => {
    const rock = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.05, 8, 64, 0.85), wood); rock.rotation.set(0, Math.PI / 2, Math.PI / 2 - 0.42 + Math.PI); rock.position.set(sx * 0.55, 2.3, 0.15); c.add(rock);
    [-0.25, 0.5].forEach(z => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 12), wood); leg.position.set(sx * 0.55, 0.68, z); c.add(leg); });
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.08, 1.0, 3, 0.03), wood); arm.position.set(sx * 0.6, 1.85, 0.15); c.add(arm);
  });
  c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return c;
}
function boardTex(w = 512, h = 256, bg = '#ffffff', fg = '#1b1b1b', font = 'bold 150px Arial, sans-serif') {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.userData.draw = (text, top = null) => { const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h); if (top) { g.fillStyle = '#e8374f'; g.fillRect(0, 0, w, h * 0.28); g.fillStyle = '#fff'; g.font = `bold ${Math.round(h * 0.17)}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(top, w / 2, h * 0.14); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = parseInt(font.match(/(\d+)px/)[1]); g.font = font; while (g.measureText(text).width > w * 0.9) { fs -= 6; g.font = font.replace(/\d+px/, fs + 'px'); } g.fillText(text, w / 2, top ? h * 0.62 : h / 2 + 6); t.needsUpdate = true; };
  return t;
}

// =====================================================================
// SHOTS
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.01, 200) }; build(s); shots.push(s); return s; }
function xrayTorso(sc) {
  sc.background = BG.xray;
  const p = makePerson({ override: XM(), legs: false }); sc.add(p);
  const lungs = [-1, 1].map(sx => { const l = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), glow(0xff7aa8, 0.45)); l.position.set(sx * 0.19, 2.0, 0.02); l.scale.set(0.2, 0.33, 0.24); sc.add(l); return l; });
  const dia = diaphragmMesh(); dia.position.set(0, 1.55, 0.02); sc.add(dia);
  const trachea = new THREE.CatmullRomCurve3([V(0, 2.72, 0.42), V(0, 2.55, 0.1), V(0, 2.25, 0.03)]);
  sc.add(new THREE.Mesh(new THREE.TubeGeometry(trachea, 30, 0.04, 10), glow(0x49e3ff, 0.6)));
  return { p, lungs, dia, trachea };
}

// 0) Diaphragm yanks down, air rushes in ----------------------------------------------
shot(0, C.and1, (s) => {
  const sc = s.scene; const X = xrayTorso(sc);
  const air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), glow(0xd9fbff, 0.95), 60); sc.add(air);
  const paths = [-1, 1].map(sx => new THREE.CatmullRomCurve3([V(0, 2.78, 0.75), V(0, 2.72, 0.42), V(0, 2.4, 0.05), V(sx * 0.12, 2.15, 0.03), V(sx * 0.22, 1.85, 0.03)]));
  const dummy = new THREE.Object3D();
  s.update = (t) => {
    const yank = E.expo(seg(t, C.yanks - 0.05, C.yanks + 0.12)) * (1 - 0.6 * E.io(seg(t, 3.4, 4.1)));
    X.dia.position.y = 1.55 - 0.2 * yank; X.dia.scale.set(0.52, 0.3 - 0.17 * yank, 0.36);
    X.dia.material.color.setHex(yank > 0.5 ? 0xff2a4a : 0xff4d6d);
    const fill = E.out(seg(t, C.air - 0.1, C.air + 0.8));
    X.lungs.forEach(l => l.scale.set(0.2 * (1 + 0.3 * fill), 0.33 * (1 + 0.22 * fill), 0.24 * (1 + 0.25 * fill)));
    X.p.userData.yawn(0.25 * fill); X.p.userData.setLid(0.2);
    for (let i = 0; i < 60; i++) { const u = clamp(((i / 60) * 0.7 + (t - C.air) * 1.6) % 1); dummy.position.copy(paths[i % 2].getPoint(u)); dummy.scale.setScalar(t > C.air - 0.05 && t < 4.0 ? 1 : 0.0001); dummy.updateMatrix(); air.setMatrixAt(i, dummy.matrix); }
    air.instanceMatrix.needsUpdate = true;
    if (t < C.yanks) setCam(s.cam, lv(V(2.2, 2.4, 4.2), V(1.9, 2.3, 3.6), seg(t, 0, C.yanks)), V(0, 1.95, 0), -3 + drift(t, 1.5), 38);
    else if (t < C.air) { const c = seg(t, C.yanks, C.air); setCam(s.cam, V(0, 1.5, 0).add(lv(V(1.1, 0.45, 2.4), V(0.95, 0.4, 2.1), c)).add(shake(t, 0.03 * yank * (1 - c))), V(0, 1.45, 0), 4 + drift(t, 1.5), 38); }
    else { const c = seg(t, C.air, C.and1 + 0.2); setCam(s.cam, lv(V(0.2, 2.4, 3.2), V(0.15, 2.35, 2.7), c), V(0, 2.15, 0), drift(t, 1.5), 38); }
  };
});

// 1) Vocal cords slam shut --------------------------------------------------------------
shot(C.and1, C.making, (s) => {
  const sc = s.scene; sc.background = BG.xray;
  const p = makePerson({ override: XM(), legs: false }); sc.add(p);
  const L = V(0, 2.62, 0.16);
  const larynx = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.24, 24, 1, true), glow(0x49e3ff, 0.9)); larynx.position.copy(L); sc.add(larynx);
  const folds = [-1, 1].map(sx => { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), glow(0xff6fb0, 0.85)); f.scale.set(0.03, 0.085, 0.06); f.position.copy(L); sc.add(f); return f; });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 8, 48), glow(0xffffff, 0.9)); ring.position.copy(L); sc.add(ring);
  s.update = (t) => {
    p.userData.yawn(0.2);
    const shut = E.expo(seg(t, C.slam, C.slam + 0.08)); const gap = lerp(0.055, 0.0, shut);
    folds.forEach((f, i) => { f.position.x = (i ? 1 : -1) * (0.03 + gap); });
    const rk = seg(t, C.slam, C.slam + 0.5); ring.scale.setScalar(1 + rk * 3); ring.material.opacity = 0.9 * (1 - rk) * (t > C.slam ? 1 : 0);
    const close = t >= C.vocal; p.visible = !close; larynx.material.opacity = close ? 0.35 : 0.9; folds.forEach(f => f.material.opacity = close ? 0.65 : 0.85);
    if (!close) { const c = seg(t, C.and1, C.vocal); setCam(s.cam, lv(V(1.6, 2.9, 2.6), V(1.2, 2.8, 2.0), c), V(0, 2.6, 0.1), -3 + drift(t, 1.5), 38); }
    else { const c = seg(t, C.vocal, C.making); setCam(s.cam, L.clone().add(lv(V(0.08, 0.05, 0.9), V(0.06, 0.04, 0.7), c)).add(shake(t, 0.012 * jolt(t, C.slam))), L.clone().add(V(0, 0.03, 0)), drift(t, 1.5), 36); ring.lookAt(s.cam.position); }
  };
});

// 2) "making that hic sound" ---------------------------------------------------------
shot(C.making, C.it, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(3, 6, 5) });
  const p = makePerson(); sc.add(p);
  const hic = textPlane('HIC!', 0.9, '#ff3d6e'); hic.position.set(0.55, 3.15, 0.5); sc.add(hic);
  s.update = (t) => {
    const j = joltsAt(t, [C.hic - 0.05]);
    p.position.y = 0.08 * j; p.userData.head.rotation.x = -0.12 * j; p.userData.arms.forEach(a => a.sh.rotation.set(0, 0, a.sx * (0.14 + 0.25 * j)));
    p.userData.setLid(lerp(0.1, -0.25, j)); p.userData.yawn(0.15 * j);
    const hk = E.out(seg(t, C.hic - 0.05, C.hic + 0.15)) * (1 - seg(t, 8.6, 9.0)); hic.scale.setScalar(hk + 0.0001); hic.position.y = 3.15 + 0.2 * seg(t, C.hic, 9.0);
    const c = seg(t, C.making, C.it + 0.2); setCam(s.cam, lv(V(0.9, 3.0, 3.6), V(0.8, 2.95, 3.1), c).add(shake(t, 0.03 * j)), V(0.15, 2.75, 0), drift(t, 1.5), 38); hic.lookAt(s.cam.position);
  };
});

// 3) Stomach stretches up into the diaphragm -----------------------------------------
shot(C.it, C.eating, (s) => {
  const sc = s.scene; const X = xrayTorso(sc);
  const stom = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), glow(0xffb347, 0.5)); stom.position.set(0.12, 1.25, 0.08); sc.add(stom);
  const arrows = [-0.15, 0.12, 0.35].map(x => { const a = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 16), glow(0xffe08a, 0.9)); a.position.set(x, 1.5, 0.3); sc.add(a); return a; });
  s.update = (t) => {
    const k = E.io(seg(t, C.it + 0.2, C.eating)); stom.scale.set(0.2 + 0.14 * k, 0.15 + 0.12 * k, 0.16 + 0.1 * k);
    X.dia.position.y = 1.55 + 0.06 * k; X.dia.scale.set(0.52, 0.3 + 0.05 * k, 0.36);
    arrows.forEach((a, i) => { a.position.y = 1.47 + 0.06 * k + 0.04 * Math.sin(t * 8 + i); a.material.opacity = 0.9 * k; });
    X.p.userData.yawn(0);
    const c = seg(t, C.it, C.eating); setCam(s.cam, lv(V(1.8, 2.2, 4.4), V(1.5, 2.05, 3.8), c), V(0.05, 1.7, 0), -3 + drift(t, 1.5), 38);
  };
});

// 4) Eating too fast / drinking soda ---------------------------------------------------
shot(C.eating, C.irritating, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(3, 6, 5) });
  const p = makePerson({ shirt: 0xf2b134 }); sc.add(p);
  const burger = new THREE.Group(); sc.add(burger);
  const bun = new THREE.MeshPhysicalMaterial({ color: 0xe9a24a, roughness: 0.5, clearcoat: 0.3 });
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), bun); top.position.y = 0.05; top.scale.y = 0.75;
  const pat = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.07, 32), new THREE.MeshPhysicalMaterial({ color: 0x5a2d16, roughness: 0.7 }));
  const let_ = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 32), new THREE.MeshPhysicalMaterial({ color: 0x5fc04a, roughness: 0.6 })); let_.position.y = 0.045;
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.08, 32), bun); bot.position.y = -0.07;
  burger.add(top, pat, let_, bot);
  const can = new THREE.Group(); sc.add(can);
  const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 32), new THREE.MeshPhysicalMaterial({ color: 0xd8232f, roughness: 0.25, clearcoat: 1, metalness: 0.3 })); can.add(cb);
  const ct = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.12, 0.03, 32), M.chrome); ct.position.y = 0.225; can.add(ct);
  const fizz = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), 40); sc.add(fizz);
  const dummy = new THREE.Object3D();
  s.update = (t) => {
    const eat = t < C.drinking; burger.visible = eat; can.visible = !eat;
    p.updateMatrixWorld(true); const mouthW = worldOf(p.userData.mouth, V(0, 0, 0.12));
    const R = p.userData.arms[1];
    if (eat) {
      const bite = Math.abs(Math.sin((t - C.eating) * Math.PI * 3.2)); burger.position.copy(mouthW).add(V(0.05, -0.08 - 0.25 * (1 - bite), 0.18 + 0.25 * (1 - bite))); burger.rotation.set(0.3, 0, 0.15);
      const bs = 1 - 0.35 * seg(t, C.eating, C.drinking); burger.scale.set(bs, 1, bs);
      p.userData.yawn(0.35 * (1 - bite)); R.sh.rotation.set(-1.25 - 0.35 * bite, 0, -0.5); R.el.rotation.set(-1.2, 0, -0.35);
    } else {
      can.position.copy(mouthW).add(V(0.06, 0.12, 0.2)); can.rotation.set(-1.9, 0, 0.1); p.userData.head.rotation.x = -0.35; p.userData.yawn(0.15);
      R.sh.rotation.set(-2.1, 0, -0.4); R.el.rotation.set(-0.7, 0, -0.3);
      for (let i = 0; i < 40; i++) { const a = ((t * 1.3 + i / 40) % 1); dummy.position.copy(can.position).add(V((((i * 37) % 11) / 11 - 0.5) * 0.35 * a, -0.25 + a * 0.6, 0.15 + (((i * 13) % 7) / 7 - 0.5) * 0.2)); dummy.scale.setScalar(Math.sin(Math.PI * a)); dummy.updateMatrix(); fizz.setMatrixAt(i, dummy.matrix); }
      fizz.instanceMatrix.needsUpdate = true;
    }
    fizz.visible = !eat;
    const pos = eat ? lv(V(1.2, 3.0, 2.6), V(1.0, 2.95, 2.2), seg(t, C.eating, C.drinking)) : lv(V(-1.0, 2.9, 2.5), V(-0.85, 2.85, 2.1), seg(t, C.drinking, C.irritating));
    setCam(s.cam, pos, V(0.05, 2.75, 0.2), (eat ? -3 : 3) + drift(t, 1.5), 38);
  };
});

// 5) Irritated nerves ------------------------------------------------------------------
shot(C.irritating, C.yousee, (s) => {
  const sc = s.scene; const X = xrayTorso(sc);
  const nM = pulseTubeMat(0xffd84a, 0xff3344);
  const nerves = [-1, 1].map(sx => { const c = new THREE.CatmullRomCurve3([V(sx * 0.08, 2.55, 0.05), V(sx * 0.18, 2.2, 0.12), V(sx * 0.3, 1.85, 0.12), V(sx * 0.36, 1.6, 0.05)]); sc.add(new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.025, 8), nM)); return c; });
  const sparks = []; for (let i = 0; i < 16; i++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), glow(0xff3344, 0.95)); sc.add(sp); sparks.push(sp); }
  s.update = (t) => {
    const irr = smooth(C.irritating, C.nerves, t); nM.uniforms.p.value = ((t * 1.8) % 1.2) - 0.1; nM.uniforms.k.value = 0.5 + 0.5 * irr;
    sparks.forEach((sp, i) => { const u = ((i * 0.37 + t * 2.3) % 1); sp.position.copy(nerves[i % 2].getPoint(u)).add(V(Math.sin(t * 40 + i) * 0.04, Math.cos(t * 33 + i) * 0.04, 0)); sp.visible = irr > 0.1 && Math.sin(t * 25 + i * 2) > 0; });
    const tw = joltsAt(t, [15.2, 15.9, 16.4]); X.dia.position.y = 1.55 - 0.12 * tw; X.dia.scale.set(0.52, 0.3 - 0.1 * tw, 0.36);
    X.p.userData.yawn(0.15 * tw);
    const c = seg(t, C.irritating, C.yousee + 0.2); setCam(s.cam, lv(V(-2.0, 2.5, 4.4), V(-1.7, 2.4, 3.8), c).add(shake(t, 0.02 * tw)), V(0, 2.05, 0), 3 + drift(t, 1.5), 38);
  };
});

// 6) Ancestors in the water, then the tadpole -----------------------------------------
shot(C.yousee, C.another, (s) => {
  const sc = s.scene; sc.background = gradTex([[0, '#4fd2e8'], [0.35, '#1a8fb8'], [0.75, '#0b4f7a'], [1, '#062c4a']], 0.5, 0.15); sc.environment = ENV;
  sc.fog = new THREE.Fog(0x0e6a92, 6, 22);
  sc.add(new THREE.HemisphereLight(0xbff3ff, 0x0b3550, 0.9)); const k = new THREE.DirectionalLight(0xdff9ff, 1.8); k.position.set(1, 8, 3); sc.add(k);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0xc9b07a, roughness: 0.95 })); sand.rotation.x = -Math.PI / 2; sand.position.y = -1.5; sc.add(sand);
  const weedM = new THREE.MeshPhysicalMaterial({ color: 0x2f9e5a, roughness: 0.6 }); const weeds = [];
  const wr = rng(17); for (let i = 0; i < 14; i++) { const x = (wr() - 0.5) * 9, z = -2 - wr() * 6; weeds.push({ x, z, h: 1.5 + wr() * 2.5, ph: wr() * 6 }); }
  const weedMeshes = weeds.map(w => { const m = new THREE.Mesh(new THREE.BufferGeometry(), weedM); sc.add(m); return m; });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1 }), 60); sc.add(bubbles);
  // ancient lungfish
  const fish = new THREE.Group(); sc.add(fish);
  const fm = new THREE.MeshPhysicalMaterial({ color: 0x6b7a3a, roughness: 0.5, clearcoat: 0.4, sheen: 0.5 });
  const fb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 24), fm); fb.scale.set(0.55, 0.5, 1.7); fish.add(fb);
  const ft = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 24), fm); ft.rotation.x = -Math.PI / 2; ft.position.z = -1.15; ft.scale.x = 0.3; fish.add(ft);
  [-1, 1].forEach(sx => { const fin = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.5, 6, 12), fm); fin.position.set(sx * 0.3, -0.2, 0.35); fin.rotation.set(0.6, 0, sx * 1.0); fish.add(fin); const ey = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), M.black); ey.position.set(sx * 0.18, 0.08, 0.72); fish.add(ey); });
  // tadpole
  const tad = new THREE.Group(); sc.add(tad);
  const tm = new THREE.MeshPhysicalMaterial({ color: 0x4b5a2a, roughness: 0.4, clearcoat: 0.8 });
  const th = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 28), tm); th.scale.set(0.9, 0.75, 1.0); tad.add(th);
  const throat = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0x8c9a5a, roughness: 0.4 })); throat.position.set(0, -0.22, 0.22); tad.add(throat);
  const tmouth = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 10), new THREE.MeshPhysicalMaterial({ color: 0x1a1210 })); tmouth.position.set(0, -0.08, 0.5); tad.add(tmouth);
  [-1, 1].forEach(sx => { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 10), M.black); ey.position.set(sx * 0.25, 0.12, 0.38); tad.add(ey); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); gl.position.set(sx * 0.25 - 0.02, 0.15, 0.46); tad.add(gl);
    for (let k = 0; k < 3; k++) { const gill = new THREE.Group(); gill.position.set(sx * 0.42, -0.02 - k * 0.08, -0.05); gill.rotation.set(0, 0, sx * (1.0 + k * 0.25)); tad.add(gill);
      for (let f = 0; f < 6; f++) { const fr = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.004, 0.22, 6), new THREE.MeshPhysicalMaterial({ color: 0xff7a92, roughness: 0.4, emissive: 0x401018 })); fr.position.set(0, 0.06 + f * 0.04, 0); fr.rotation.z = (f % 2 ? 1 : -1) * 0.7; gill.add(fr); } } });
  const tailSegs = []; for (let i = 0; i < 10; i++) { const sg = new THREE.Mesh(new THREE.SphereGeometry(0.22 * (1 - i / 11), 16, 10), tm); sg.scale.set(0.35, 1.3, 1); tad.add(sg); tailSegs.push(sg); }
  const water = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), glow(0xbff6ff, 0.9), 50); sc.add(water);
  const arrowM = new THREE.MeshPhysicalMaterial({ color: 0x29d3ff, emissive: 0x0a90c0 });
  const arrows = [-1, 1].map(sx => { const a = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10), arrowM); sh.position.y = 0.15; const hd = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 14), arrowM); hd.position.y = 0.33; a.add(sh, hd); sc.add(a); return a; });
  const dummy = new THREE.Object3D();
  s.update = (t) => {
    weeds.forEach((w, i) => { const pts = []; for (let k = 0; k <= 8; k++) { const a = k / 8; pts.push(V(w.x + Math.sin(t * 1.2 + w.ph + a * 2) * 0.25 * a, -1.5 + w.h * a, w.z)); } weedMeshes[i].geometry.dispose(); weedMeshes[i].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.05, 6); });
    for (let i = 0; i < 60; i++) { const a = ((t * 0.25 + i / 60) % 1); dummy.position.set(((i * 53) % 17) / 17 * 8 - 4 + Math.sin(t + i) * 0.1, -1.5 + a * 7, -1 - ((i * 7) % 5)); dummy.scale.setScalar(0.6 + ((i * 3) % 5) / 5); dummy.updateMatrix(); bubbles.setMatrixAt(i, dummy.matrix); }
    bubbles.instanceMatrix.needsUpdate = true;
    const fishT = t < C.because; fish.visible = fishT; tad.visible = !fishT;
    fish.position.set(lerp(-3.5, 3.5, seg(t, C.yousee, C.because)), 0.4 + 0.15 * Math.sin(t * 1.5), 0); fish.rotation.set(0, Math.PI / 2 + 0.15 * Math.sin(t * 5), 0); ft.rotation.y = 0.4 * Math.sin(t * 6);
    tad.position.set(0, 0.3 + 0.05 * Math.sin(t * 2), 0); tad.rotation.set(0, 0.5 + 0.1 * Math.sin(t * 1.5), 0);
    const gulp = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 1.4);
    tmouth.scale.set(1, 0.3 + 0.7 * gulp, 0.6); throat.scale.setScalar(0.9 + 0.25 * (1 - gulp));
    tailSegs.forEach((sg, i) => { const z = -0.45 - i * 0.12; sg.position.set(Math.sin(t * 9 - i * 0.6) * 0.04 * i, 0, z); });
    tad.updateMatrixWorld(true);
    const flowOn = t >= C.tadpoles; water.visible = flowOn;
    if (flowOn) { for (let i = 0; i < 50; i++) { const a = ((t * 0.9 + i / 50) % 1); const sx = i % 2 ? 1 : -1; const local = a < 0.45 ? lv(V(0, -0.08, 1.2), V(0, -0.12, 0.45), a / 0.45) : lv(V(sx * 0.25, -0.12, 0.2), V(sx * 1.0, 0.0, -0.4), (a - 0.45) / 0.55); dummy.position.copy(worldOf(tad, local)); dummy.scale.setScalar(1); dummy.updateMatrix(); water.setMatrixAt(i, dummy.matrix); } water.instanceMatrix.needsUpdate = true; }
    arrows.forEach((a, i) => { const sx = i ? 1 : -1; a.visible = t >= C.push; a.position.copy(worldOf(tad, V(sx * 0.65, -0.05, -0.15))); a.rotation.set(0, 0, -sx * 1.2); a.scale.setScalar(E.out(seg(t, C.push, C.push + 0.3)) + 0.0001); });
    if (t < C.our) { const c = seg(t, C.yousee, C.our); setCam(s.cam, lv(V(-1.0, 1.0, 6.4), V(0.4, 0.9, 6.0), c), lv(V(-2.0, 0.4, 0), V(0.6, 0.4, 0), c), drift(t, 1.5), 40); }
    else if (t < C.because) { const c = seg(t, C.our, C.because); setCam(s.cam, fish.position.clone().add(V(-1.4, 0.4, 2.4)), fish.position.clone(), 3 + drift(t, 1.5), 38); }
    else if (t < C.push) { const c = seg(t, C.because, C.push); setCam(s.cam, lv(V(1.0, 0.9, 3.4), V(0.8, 0.8, 2.8), c), V(0, 0.25, 0), drift(t, 1.5), 38); }
    else { const c = seg(t, C.push, C.another + 0.2); setCam(s.cam, lv(V(-1.8, 1.6, 2.2), V(-1.5, 1.5, 1.9), c), V(0, 0.2, -0.1), -3 + drift(t, 1.5), 38); }
  };
});

// 7) Babies burping air while nursing -----------------------------------------------
shot(C.another, C.but, (s) => {
  const sc = s.scene; studio(sc, { ground: -1.2, keyPos: V(2, 6, 5) });
  const baby = makeBaby(); baby.rotation.x = -0.5; sc.add(baby);
  const xb = makeBaby(XM()); xb.rotation.x = -0.5; sc.add(xb);
  const bottle = new THREE.Group(); sc.add(bottle);
  const bb = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1 })); bottle.add(bb);
  const milk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 32), new THREE.MeshPhysicalMaterial({ color: 0xfff8ee, roughness: 0.4 })); milk.position.y = -0.07; bottle.add(milk);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 32), new THREE.MeshPhysicalMaterial({ color: 0x7fc8ff, roughness: 0.3 })); cap.position.y = 0.25; bottle.add(cap);
  const nip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10), new THREE.MeshPhysicalMaterial({ color: 0xe8c79a, roughness: 0.4 })); nip.position.y = 0.32; nip.scale.y = 1.4; bottle.add(nip);
  const hand = makeHand({ forearm: 2.2, heroRadial: 64, curls: [[1.1, 1.2, 0.8], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9]] }); hand.scale.setScalar(0.15); sc.add(hand);
  const bub = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xbff0ff, transparent: true, opacity: 0.6, roughness: 0.02, clearcoat: 1, emissive: 0x204050 })); sc.add(bub);
  const pop = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 8, 32), glow(0xffffff, 0.9)); sc.add(pop);
  const burpLbl = textPlane('BURP!', 0.45, '#ff8a3d'); sc.add(burpLbl);
  s.update = (t) => {
    const xr = t >= C.babies; baby.visible = !xr; xb.visible = xr; sc.background = xr ? BG.xray : BG.cyan;
    const j = joltsAt(t, [25.75, 26.3, 26.95]); [baby, xb].forEach(b => { b.position.y = 0.06 * j; b.userData.head.rotation.x = -0.15 * j; });
    baby.updateMatrixWorld(true); const mouthW = worldOf(baby.userData.mouth, V(0, 0, 0.05));
    bottle.visible = !xr; const bd = V(0.45, 0.35, 0.8).normalize(); bottle.position.copy(mouthW).add(bd.clone().multiplyScalar(0.36)); bottle.quaternion.setFromUnitVectors(V(0, 1, 0), bd.clone().negate());
    hand.visible = !xr; bottle.updateMatrixWorld(true); hand.position.copy(bottle.localToWorld(V(0.05, -0.5, 0))); hand.quaternion.setFromUnitVectors(V(0, 1, 0), bd.clone().negate());
    const rise = seg(t, C.babies + 0.1, C.burp + 0.1); bub.visible = xr && rise < 1; const tum = worldOf(xb.userData.body, V(0, -0.05, 0.1)); const mw = worldOf(xb.userData.mouth, V(0, 0, 0)); bub.position.copy(lv(tum, mw, E.io(rise)));
    const pk = seg(t, C.burp + 0.1, C.burp + 0.6); pop.visible = xr && pk > 0 && pk < 1; pop.position.copy(mw).add(V(0, 0.05, 0.12)); pop.scale.setScalar(1 + pk * 3); pop.material.opacity = 0.9 * (1 - pk);
    burpLbl.visible = xr && t > C.burp + 0.1; burpLbl.position.copy(mw).add(V(0.15, 0.3 + 0.12 * pk, 0.25)); burpLbl.scale.setScalar(E.out(seg(t, C.burp + 0.1, C.burp + 0.35)) + 0.0001);
    if (!xr) { const c = seg(t, C.another, C.babies); setCam(s.cam, lv(V(-1.3, 1.5, 2.9), V(-1.1, 1.4, 2.5), c), V(0.05, 0.6, 0.1), 3 + drift(t, 1.5), 38); }
    else { const c = seg(t, C.babies, C.but + 0.2); setCam(s.cam, lv(V(0.9, 1.15, 3.2), V(0.75, 1.1, 2.8), c), V(0, 0.5, 0.1), 3 + drift(t, 1.5), 38); burpLbl.lookAt(s.cam.position); pop.lookAt(s.cam.position); }
  };
});

// 8) The 68-year hiccups ------------------------------------------------------------
shot(C.but, C.end + 0.2, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(3, 7, 5), shadow: 0.25 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshPhysicalMaterial({ color: 0xb98a5a, roughness: 0.6, clearcoat: 0.3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshStandardMaterial({ color: 0xf3e3c3, roughness: 0.9 })); wall.position.set(0, 6, -2.2); wall.receiveShadow = true; sc.add(wall);
  const rocker = new THREE.Group(); sc.add(rocker);
  const chair = rockingChair(); rocker.add(chair);
  const man = oldMan(); man.position.set(0, -0.12, 0.05); rocker.add(man);
  const calTex = boardTex(512, 512, '#ffffff', '#1b1b1b', 'bold 190px Arial, sans-serif');
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: calTex, toneMapped: false })); cal.position.set(1.65, 3.4, -2.15); sc.add(cal);
  const ringsM = new THREE.MeshPhysicalMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.3 }); [-0.3, 0, 0.3].forEach(x => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 8, 16), ringsM); r.position.set(1.65 + x, 3.96, -2.12); sc.add(r); });
  const ctrTex = boardTex(1024, 256, '#101418', '#ffd23f', 'bold 150px monospace');
  const ctr = new THREE.Group(); ctr.position.set(-1.6, 3.6, -2.1); sc.add(ctr);
  const cbody = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.62, 0.12, 4, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x23272e, roughness: 0.4 })); ctr.add(cbody);
  const cscr = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.48), new THREE.MeshBasicMaterial({ map: ctrTex, toneMapped: false })); cscr.position.z = 0.07; ctr.add(cscr);
  const hic = textPlane('HIC!', 0.55, '#ff3d6e'); sc.add(hic);
  const hicTimes = []; for (let x = 28.4; x < C.stopped; x += 0.9) hicTimes.push(x);
  let lastYear = -1, lastCount = -1;
  s.update = (t) => {
    const j = joltsAt(t, hicTimes);
    man.visible = t < C.year; man.position.y = -0.12 + 0.05 * j; man.userData.head.rotation.x = -0.1 * j; man.userData.yawn(t < C.stopped ? 0.12 * j : 0);
    man.userData.setLid(t > C.stopped ? 0.55 : 0.12); man.userData.arms.forEach(a => { a.sh.rotation.set(-0.5, 0, a.sx * 0.2); a.el.rotation.set(-0.8, 0, 0); });
    rocker.rotation.x = 0.06 * Math.sin(t * 1.6) * (t >= C.year ? 1.3 : 1);
    const yr = t < C.n68 ? 1922 : t < C.stopped ? Math.round(lerp(1922, 1990, E.io(seg(t, C.n68, C.about + 0.6)))) : (t < C.year ? 1990 : 1991);
    if (yr !== lastYear) { calTex.userData.draw(String(yr), 'YEAR'); lastYear = yr; }
    const cnt = t < C.about ? 0 : Math.round(430000000 * E.io(seg(t, C.about, C.million + 0.5)));
    if (cnt !== lastCount) { ctrTex.userData.draw(cnt.toLocaleString('en-US')); lastCount = cnt; }
    man.updateMatrixWorld(true); const mw = worldOf(man.userData.mouth, V(0, 0, 0));
    const lastHic = hicTimes.filter(x => x <= t).pop(); const hk = lastHic !== undefined && t < C.stopped ? 1 - seg(t, lastHic + 0.25, lastHic + 0.6) : 0;
    hic.visible = hk > 0.01 && t < C.n68; hic.position.copy(mw).add(V(0.45, 0.3, 0.3)); hic.scale.setScalar(Math.max(hk, 0.0001));
    if (t < C.n68) { const c = seg(t, C.but, C.n68); setCam(s.cam, lv(V(2.2, 2.9, 6.6), V(1.9, 2.8, 5.8), c), V(0.3, 2.4, 0), drift(t, 1.5), 40); }
    else if (t < C.about) { const c = seg(t, C.n68, C.about); setCam(s.cam, V(1.65, 3.4, -2.15).add(lv(V(0.3, 0.1, 2.4), V(0.2, 0.05, 2.0), c)), V(1.65, 3.4, -2.15), -2 + drift(t, 1.2), 38); }
    else if (t < C.and2) { const c = seg(t, C.about, C.and2); setCam(s.cam, V(-1.6, 3.6, -2.1).add(lv(V(-0.2, 0.0, 5.6), V(-0.1, 0.0, 5.1), c)), V(-1.6, 3.6, -2.1), 2 + drift(t, 1.2), 38); }
    else if (t < C.year) { const c = seg(t, C.and2, C.year); setCam(s.cam, lv(V(1.2, 3.2, 3.4), V(1.0, 3.1, 2.9), c), V(0.0, 2.75, 0.1), drift(t, 1.5), 38); }
    else { const c = seg(t, C.year, C.end); setCam(s.cam, lv(V(1.2, 2.75, 7.6), V(1.05, 2.7, 7.0), c), V(0.6, 2.4, -0.8), drift(t, 1.0), 40); }
    hic.lookAt(s.cam.position);
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
const TR = { 3: [C.it - 0.1, C.it + 0.22, 1], 6: [C.yousee - 0.12, C.yousee + 0.18, 4], 7: [C.another - 0.1, C.another + 0.2, 2], 8: [C.but - 0.1, C.but + 0.22, 1] };

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
