// "Why We Sneeze" — procedural 3D short, rendered frame by frame.
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
  nose: 0.22, tickle: 1.1, eyes: 1.6, whole: 3.26, launches: 3.96, across: 5.6, yousee: 7.0, dust: 7.9, touch: 9.22,
  brain: 11.36, blast: 13.18, spray: 14.24, n26: 15.64, but: 16.94, one: 17.44, stepping: 18.66, sunlight: 19.68, make: 20.42,
  sneeze1: 20.82, because: 21.62, eyes2: 23.92, crossed: 24.58, and: 26.9, hold: 27.64, pinched: 29.42, closed: 30.56,
  stop: 31.56, and2: 32.72, tore: 33.16, hole: 33.7, back: 34.3, end: 35.7,
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
// SHOTS
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.01, 200) }; build(s); shots.push(s); return s; }
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

// 0) Office: the tickle, the wind-up, the launch -------------------------------------
shot(0, C.yousee, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(3, 7, 5), area: 6 }); officeSet(sc);
  const A = makeChar(CAST.A); A.position.set(0, 0, 0.0); sc.add(A);
  const B = makeChar(CAST.B); B.position.set(-1.6, 0, -1.6); B.rotation.y = 0.55; sc.add(B);
  const Cc = makeChar(CAST.C); Cc.position.set(1.7, 0, -1.9); Cc.rotation.y = -0.6; sc.add(Cc);
  A.rotation.y = Math.PI - 0.15;  // A faces the coworkers (away from camera at first)
  const dust = [0, 1, 2, 3, 4].map(i => { const d = dustFluff(i + 3); d.scale.setScalar(0.28); sc.add(d); return d; });
  const spray = sprayCloud(sc);
  const papers = [0, 1, 2, 3].map(i => { const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshPhysicalMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.7 })); sc.add(pp); return pp; });
  s.update = (t) => {
    A.rotation.y = t < C.whole ? 0.25 : Math.PI - 0.25;
    const act = sneezeAct(A, t, C.launches, { wind: 1.9 });
    A.updateMatrixWorld(true);
    const nw = worldOf(A.userData.nose, V(0, 0, 0));
    dust.forEach((d, i) => { const a = clamp((t - i * 0.25) / 1.8); d.position.copy(nw).add(V((i % 2 ? 0.35 : -0.3) * (1 - a) + 0.05 * Math.sin(t * 3 + i), 0.3 * (1 - a) - 0.05, 0.25 * (1 - a) + 0.08)); d.visible = a < 1 && t < C.whole; d.rotation.set(t + i, t * 0.7, 0); });
    spray(t, C.launches, mouthW(A), faceDir(A), 0.7);
    // coworkers recoil when the cloud reaches them
    [[B, C.launches + 0.35], [Cc, C.launches + 0.45]].forEach(([P, tr], i) => { const u = P.userData; u.reset(); const k = smooth(tr, tr + 0.25, t) * (1 - smooth(6.2, 7.0, t) * 0.3); u.head.rotation.x = -0.35 * k; P.rotation.x = -0.12 * k; u.setLid(0.1 + 0.8 * k); u.arms.forEach(a => { a.sh.rotation.set(-1.9 * k, 0, a.sx * (0.14 + 0.5 * k)); a.el.rotation.set(-1.2 * k, 0, 0); }); u.mouthOpen(0.25 * k); });
    papers.forEach((pp, i) => { const a = Math.max(t - C.launches - 0.3, 0); pp.position.set(-0.6 + i * 0.4 + a * (i - 1.5) * 0.4, 1.52 + a * 1.2 - a * a * 0.6, -0.6 - a * 0.8); pp.rotation.set(-Math.PI / 2 + a * (2 + i), a * 3, a * i); pp.visible = true; });
    const nose = nw;
    if (t < C.eyes) { const c = seg(t, 0, C.eyes); setCam(s.cam, nose.clone().add(lv(V(0.75, 0.2, 1.3), V(0.6, 0.16, 1.05), c)), nose.clone().add(V(0, 0.04, 0)), -4 + drift(t, 1.5), 36); }
    else if (t < C.whole) { const c = seg(t, C.eyes, C.whole); const hp = worldOf(A.userData.head, V(0, -0.05, 0)); setCam(s.cam, hp.clone().add(lv(V(0.9, 0.15, 1.55), V(0.75, 0.1, 1.3), c)), hp, 3 + drift(t, 1.5), 36); }
    else if (t < C.across) { const c = seg(t, C.whole, C.across); setCam(s.cam, lv(V(4.4, 3.8, 2.6), V(4.0, 3.6, 2.2), c).add(shake(t, 0.04 * act.snap)), V(-0.3, 2.0, -0.9), 2 + drift(t, 1.5), 42); }
    else { const c = seg(t, C.across, C.yousee + 0.2); const bh = worldOf(B.userData.head, V(0, 0, 0)); setCam(s.cam, bh.clone().add(lv(V(0.9, 0.2, 1.7), V(0.75, 0.15, 1.45), c)), bh, -3 + drift(t, 1.5), 36); }
  };
});

// 1) Germs fly in, nerve endings light up ----------------------------------------------
shot(C.yousee, C.brain, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(2, 6, 6) });
  const A = makeChar(CAST.A); sc.add(A);
  const germs = [0, 1, 2, 3, 4, 5].map(i => { const g = i % 3 === 2 ? dustFluff(i + 9) : germ([0x6bd34a, 0x9b6bff, 0xff8a3d][i % 3], i + 1); g.scale.setScalar(i % 3 === 2 ? 0.7 : 0.45); sc.add(g); return g; });
  // inside the nose: a pink tunnel with yellow nerve endings
  const inside = new THREE.Group(); inside.position.set(30, 0, 0); sc.add(inside);
  const tg = new THREE.CylinderGeometry(1.4, 1.1, 9, 48, 40, true); const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i); const n = 1 + 0.12 * noise3(x * 1.3, y * 0.8, z * 1.3); tp.setXYZ(i, x * n, y, z * n); } tg.computeVertexNormals();
  const tunnel = new THREE.Mesh(tg, new THREE.MeshPhysicalMaterial({ color: 0xf08a98, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.BackSide })); tunnel.rotation.x = Math.PI / 2; inside.add(tunnel);
  const lamp = new THREE.PointLight(0xfff0e8, 30, 12, 1.5); lamp.position.set(0, 0.5, 2.5); inside.add(lamp);
  const nerveM = pulseTubeMat(0xffd84a, 0xffffff); nerveM.uniforms.k.value = 0.6;
  const endings = []; const nr = rng(12);
  for (let i = 0; i < 9; i++) { const a = nr() * Math.PI * 2, z = -3 + nr() * 5; const base = V(Math.cos(a) * 1.25, Math.sin(a) * 1.25, z); const tip = V(Math.cos(a) * 0.9, Math.sin(a) * 0.9, z + 0.2); const c = new THREE.CatmullRomCurve3([base, base.clone().lerp(tip, 0.5).add(V(0.1, 0.1, 0)), tip]); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 20, 0.035, 8), nerveM); inside.add(m); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glow(0xffe680, 0.9)); knob.position.copy(tip); inside.add(knob); endings.push({ tip, knob }); }
  const ig = [0, 1, 2].map(i => { const g = germ([0x6bd34a, 0x9b6bff, 0xff8a3d][i], i + 20); g.scale.setScalar(0.9); inside.add(g); return g; });
  s.update = (t) => {
    A.userData.reset(); A.userData.setLid(0.3); A.userData.nose.scale.set(0.8 * (1 + 0.08 * Math.abs(Math.sin(t * 18))), 1, 1.15);
    A.updateMatrixWorld(true); const nw = worldOf(A.userData.nose, V(0, -0.03, 0.03));
    germs.forEach((g, i) => { const a = clamp((t - C.yousee - i * 0.25) / 1.6); g.position.copy(lv(nw.clone().add(V(0.7 - i * 0.28, 0.45 + (i % 2) * 0.25, 0.45)), nw, E.in(a))); g.scale.setScalar((i % 3 === 2 ? 0.7 : 0.45) * (1 - 0.8 * a)); g.rotation.set(t * 1.5 + i, t + i, 0); g.lookAt(s.cam.position); g.visible = a < 0.98; });
    ig.forEach((g, i) => { const z = 3.5 - (t - C.touch) * 1.6 - i * 1.2; g.position.set(Math.sin(t * 1.3 + i * 2) * 0.5, Math.cos(t * 1.1 + i) * 0.4, z); g.rotation.set(t + i, t * 0.6, 0); });
    endings.forEach((e, i) => { const near = ig.some(g => g.position.distanceTo(e.tip) < 0.9); e.knob.material.opacity = near ? 1 : 0.5; e.knob.scale.setScalar(near ? 1.6 + 0.3 * Math.sin(t * 30) : 1); });
    nerveM.uniforms.p.value = ((t * 1.5) % 1.2) - 0.1;
    if (t < C.touch) { const c = seg(t, C.yousee, C.touch); setCam(s.cam, nw.clone().add(lv(V(1.1, 0.35, 1.9), V(0.9, 0.3, 1.6), c)), nw.clone().add(V(0.1, 0.15, 0.1)), -3 + drift(t, 1.5), 36); }
    else { const c = seg(t, C.touch, C.brain + 0.2); setCam(s.cam, inside.position.clone().add(V(0.15, 0.1, 4.2 - c * 1.2)), inside.position.clone().add(V(0, 0, 0)), drift(t, 2), 50); }
  };
});

// 2) The brain fires the reflex; germs get blasted out -------------------------------
shot(C.brain, C.spray, (s) => {
  const sc = s.scene; sc.background = BG.xray; sc.environment = ENV;
  sc.add(new THREE.HemisphereLight(0xbfe6ff, 0x0b1630, 0.6)); const k = new THREE.DirectionalLight(0xffffff, 1.2); k.position.set(2, 5, 4); sc.add(k);
  const A = makeChar(CAST.A); sc.add(A);
  const xa = makePerson({ override: XM(), legs: false }); sc.add(xa);
  const brain = makeBrain(); brain.scale.multiplyScalar(0.3); brain.material = new THREE.MeshBasicMaterial({ color: 0xff8fb8, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }); sc.add(brain);
  const sigM = pulseTubeMat(0xffd84a, 0xffffff); const sig = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 3.05, -0.05), V(0, 2.75, 0.2), V(0.05, 2.85, 0.4), V(0, 2.92, 0.47)]), 60, 0.025, 8), sigM); sc.add(sig);
  const sig2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 2.95, -0.05), V(0, 2.5, 0), V(0.1, 2.0, 0.1), V(0.2, 1.55, 0.05)]), 60, 0.025, 8), sigM); sc.add(sig2);
  const germs = [0, 1, 2, 3].map(i => { const g = germ([0x6bd34a, 0x9b6bff, 0xff8a3d, 0x6bd34a][i], i + 30); g.scale.setScalar(0.55); sc.add(g); return g; });
  const spray = sprayCloud(sc, 160);
  s.update = (t) => {
    const xr = t < C.blast; A.visible = !xr; xa.visible = xr; brain.visible = xr; sig.visible = xr; sig2.visible = xr; sc.background = xr ? BG.xray : BG.cyan;
    brain.position.set(0, 3.05, -0.05); brain.material.opacity = 0.5 + 0.4 * Math.abs(Math.sin(t * 10)) * smooth(C.brain + 0.3, 11.8, t);
    sigM.uniforms.p.value = ((t - 11.7) * 1.4) % 1.2;
    const act = sneezeAct(A, t, C.blast + 0.08, { wind: 0.25 });
    A.updateMatrixWorld(true); const mw = mouthW(A), fd = faceDir(A);
    spray(t, C.blast + 0.08, mw, fd, 0.5);
    germs.forEach((g, i) => { const a = Math.max(t - C.blast - 0.08, 0); g.visible = !xr; g.position.copy(mw).addScaledVector(fd, 0.2 + a * (2.2 + i * 0.5)).add(V((i - 1.5) * 0.25 * a, 0.3 * a - 0.6 * a * a, 0)); g.rotation.set(a * 6 + i, a * 4, 0); });
    if (xr) { const c = seg(t, C.brain, C.blast); setCam(s.cam, lv(V(1.6, 3.2, 2.6), V(1.3, 3.1, 2.1), c), V(0, 2.75, 0), -3 + drift(t, 1.5), 38); }
    else { const c = seg(t, C.blast, C.spray + 0.2); setCam(s.cam, lv(V(3.4, 3.2, 3.0), V(3.1, 3.1, 2.7), c).add(shake(t, 0.04 * act.snap)), V(0.8, 2.6, 1.2), 3 + drift(t, 1.5), 42); }
  };
});

// 3) 26 feet: a hallway of people flinching as the cloud passes ----------------------
shot(C.spray, C.but, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(3, 8, 4), area: 10 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 40), new THREE.MeshPhysicalMaterial({ color: 0xd9e0e6, roughness: 0.4, clearcoat: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.position.z = -8; floor.receiveShadow = true; sc.add(floor);
  [-3, 3].forEach(x => { const w = new THREE.Mesh(new THREE.PlaneGeometry(40, 6), new THREE.MeshStandardMaterial({ color: 0xbfe8f2, roughness: 0.9 })); w.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; w.position.set(x, 3, -8); w.receiveShadow = true; sc.add(w); });
  const tc = document.createElement('canvas'); tc.width = 128; tc.height = 2048; const g = tc.getContext('2d'); g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 128, 2048); g.fillStyle = '#222';
  for (let i = 0; i <= 26; i++) { const y = 2048 - i * (2048 / 26); g.fillRect(0, y - 3, i % 5 ? 40 : 80, 6); if (i % 5 === 0) { g.font = 'bold 34px Arial'; g.fillText(String(i), 86, y + 12); } }
  const tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace;
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 26 * 0.6), new THREE.MeshBasicMaterial({ map: tt })); tape.rotation.x = -Math.PI / 2; tape.position.set(-0.9, 0.01, -26 * 0.3 + 0.4); sc.add(tape);
  const FT = 0.6; // scene units per foot
  const A = makeChar(CAST.A); A.position.set(0, 0, 0.4); A.rotation.y = Math.PI; sc.add(A);
  const line = [['D', 8], ['E', 14], ['F', 20], ['H', 25.5]].map(([k, ft], i) => { const P = makeChar(CAST[k]); P.position.set(0.5 * (i % 2 ? 1 : -1), 0, 0.4 - ft * FT); P.rotation.y = 0.2 * (i % 2 ? -1 : 1); sc.add(P); return { P, ft }; });
  const sign = textPlane('26 FT', 1.2, '#ff3d6e'); sign.position.set(-0.9, 1.0, 0.4 - 26 * FT); sc.add(sign);
  const spray = sprayCloud(sc, 320);
  s.update = (t) => {
    const t0 = C.spray + 0.2; const act = sneezeAct(A, t, t0, { wind: 0.35 });
    A.updateMatrixWorld(true); const fd = V(0, -0.05, -1).normalize();
    spray(t, t0, mouthW(A), fd, 26 * FT / 4.2, 2.6);
    const front = (26 * FT) * (1 - Math.exp(-1.9 * Math.max(t - t0, 0)));
    line.forEach(({ P, ft }) => { const u = P.userData; u.reset(); const k = smooth(ft * FT - 0.4, ft * FT + 0.2, front); u.head.rotation.x = -0.3 * k; P.rotation.x = -0.1 * k; u.setLid(0.1 + 0.8 * k); u.arms.forEach(a => { a.sh.rotation.set(-1.8 * k, 0, a.sx * (0.14 + 0.5 * k)); a.el.rotation.set(-1.3 * k, 0, 0); }); });
    sign.scale.setScalar(E.out(seg(t, C.n26 - 0.2, C.n26 + 0.2)) + 0.0001);
    if (t < C.n26) { const c = seg(t, C.spray, C.n26); setCam(s.cam, lv(V(1.6, 3.4, 3.8), V(1.3, 3.0, 0.5 - front * 0.4), c), V(0, 1.6, -6), 2 + drift(t, 1.5), 42); }
    else { const c = seg(t, C.n26, C.but + 0.2); const e = V(0, 1.2, 0.4 - 26 * FT); setCam(s.cam, e.clone().add(lv(V(2.2, 1.4, 3.4), V(1.9, 1.3, 3.0), c)), e.clone().add(V(-0.3, 0.6, 0)), -3 + drift(t, 1.5), 40); }
    sign.lookAt(s.cam.position);
  };
});

// 4) Four friends step into the sun; one sneezes --------------------------------------
shot(C.but, C.because, (s) => {
  const sc = s.scene; sc.environment = ENV;
  sc.background = gradTex([[0, '#fffbe6'], [0.2, '#ffe9a8'], [0.55, '#8fd3f0'], [1, '#2f9fd0']], 0.7, 0.12);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8fbfd0, 0.7));
  const sunL = new THREE.DirectionalLight(0xfff1d0, 3.4); sunL.position.set(4, 9, -6); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048); Object.assign(sunL.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); sc.add(sunL);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.9 })); street.rotation.x = -Math.PI / 2; street.receiveShadow = true; sc.add(street);
  const wallM = new THREE.MeshStandardMaterial({ color: 0x9a6a52, roughness: 0.9, side: THREE.DoubleSide }), darkM = new THREE.MeshStandardMaterial({ color: 0x2a201c, roughness: 0.9, side: THREE.DoubleSide });
  [[-3.3, 1.8, 4.0, 3.6], [3.3, 1.8, 4.0, 3.6], [0, 4.8, 10.6, 2.4]].forEach(([x, y, w, h]) => { const wp = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), wallM); wp.position.set(x, y, 2.2); wp.castShadow = true; sc.add(wp); });
  const rf = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 6), darkM); rf.rotation.x = Math.PI / 2; rf.position.set(0, 6, 5.2); sc.add(rf); const rb = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 6), darkM); rb.position.set(0, 3, 8.2); sc.add(rb);
  [-5.3, 5.3].forEach(x => { const sw = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), darkM); sw.rotation.y = Math.PI / 2; sw.position.set(x, 3, 5.2); sc.add(sw); });
  const inFloor = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 6), new THREE.MeshStandardMaterial({ color: 0x3a2e28, roughness: 0.8 })); inFloor.rotation.x = -Math.PI / 2; inFloor.position.set(0, 0.01, 5.2); sc.add(inFloor);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 20), new THREE.MeshBasicMaterial({ color: 0xfffbe0, toneMapped: false })); sun.position.set(6, 12, -14); sc.add(sun);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 20), glow(0xfff0b0, 0.35)); halo.position.copy(sun.position); sc.add(halo);
  const friends = ['B', 'C', 'H', 'D'].map((k, i) => { const P = makeChar(CAST[k]); sc.add(P); return P; });
  const label = textPlane('1 IN 4', 1.3, '#ff3d6e'); sc.add(label);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 20), new THREE.MeshPhysicalMaterial({ color: 0xff3d6e, emissive: 0x501020 })); arrow.rotation.x = Math.PI; sc.add(arrow);
  const spray = sprayCloud(sc, 160);
  s.update = (t) => {
    const walk = seg(t, C.but, C.sunlight + 0.4); const stopK = 1 - smooth(C.sunlight + 0.1, C.sunlight + 0.5, t);
    friends.forEach((P, i) => { const u = P.userData; u.reset(); P.position.set(-1.35 + i * 0.9, 0, 4.4 - walk * 5.2); P.rotation.y = Math.PI + 0.1 * (i - 1.5); u.walk((t - C.but) * 7 + i, stopK); P.position.y = (u.bob || 0); const squint = smooth(C.sunlight - 0.3, C.sunlight + 0.2, t); u.setLid(0.1 + 0.6 * squint); u.head.rotation.x = -0.12 * squint; });
    const H = friends[2]; const act = sneezeAct(H, t, C.sneeze1, { wind: 1.0 });
    H.updateMatrixWorld(true); spray(t, C.sneeze1, mouthW(H), faceDir(H), 0.5);
    [friends[0], friends[1], friends[3]].forEach((P, i) => { P.userData.head.rotation.y = (i === 2 ? 0.6 : -0.6) * smooth(C.sneeze1 + 0.1, C.sneeze1 + 0.4, t); });
    const hp = worldOf(H.userData.head, V(0, 0.62, 0)); label.position.copy(hp).add(V(0, 0.42, 0)); arrow.position.copy(hp);
    const lk = E.out(seg(t, C.one - 0.1, C.one + 0.3)) * (1 - smooth(C.stepping - 0.2, C.stepping, t)); label.scale.setScalar(lk + 0.0001); arrow.scale.setScalar(lk + 0.0001); arrow.position.y += 0.06 * Math.sin(t * 6);
    if (t < C.stepping) { const c = seg(t, C.but, C.stepping); setCam(s.cam, lv(V(0.3, 3.5, 7.9), V(0.2, 3.4, 7.4), c), V(0, 2.7, 0), drift(t, 1.5), 46); }
    else if (t < C.make) { const c = seg(t, C.stepping, C.make); setCam(s.cam, lv(V(-0.9, 2.8, -7.4), V(-0.7, 2.7, -6.6), c), V(0.0, 2.0, 0.2), -2 + drift(t, 1.5), 44); }
    else { const c = seg(t, C.make, C.because + 0.2); const h = worldOf(H.userData.head, V(0, 0, 0)); setCam(s.cam, h.clone().add(lv(V(-1.0, 0.15, -1.9), V(-0.85, 0.12, -1.6), c)).add(shake(t, 0.03 * act.snap)), h, 3 + drift(t, 1.5), 38); }
    label.lookAt(s.cam.position);
  };
});

// 5) Crossed signals: eye and nose nerves -------------------------------------------
shot(C.because, C.and, (s) => {
  const sc = s.scene; sc.environment = ENV;
  sc.background = gradTex([[0, '#fffbe6'], [0.25, '#ffe9a8'], [0.6, '#8fd3f0'], [1, '#2f9fd0']], 0.8, 0.1);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8fbfd0, 0.7)); const sunL = new THREE.DirectionalLight(0xfff1d0, 3.0); sunL.position.set(3, 6, 6); sc.add(sunL);
  const H = makeChar({ ...CAST.H, cap: null, style: 'short' }); sc.add(H); H.rotation.y = 0.25;
  H.updateMatrixWorld(true);
  H.userData.head.traverse(o => { if (o.isMesh && o.material && o.material.isMeshPhysicalMaterial && o.material !== H.userData.skinM && !o.material.map) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; o.material.depthWrite = false; } }); H.userData.skinM.transparent = true; H.userData.skinM.opacity = 0.55; H.userData.skinM.depthWrite = false;
  const head = H.userData.head;
  const eyeL = V(0.16, 0.09, 0.45), noseL = V(0, -0.03, 0.52), backL = V(0.05, 0.12, -0.25);
  const eyePath = new THREE.CatmullRomCurve3([eyeL, V(0.32, 0.2, 0.2), V(0.18, 0.2, -0.05), backL].map(v => v.clone()));
  const nosePath = new THREE.CatmullRomCurve3([noseL, V(-0.05, 0.05, 0.25), V(0.3, 0.15, 0.05), backL.clone().add(V(0, -0.02, 0))].map(v => v.clone()));
  const yM = pulseTubeMat(0xffd84a, 0xffffff), cM = pulseTubeMat(0x49e3ff, 0xffffff);
  const eyeN = new THREE.Mesh(new THREE.TubeGeometry(eyePath, 60, 0.026, 8), yM), noseN = new THREE.Mesh(new THREE.TubeGeometry(nosePath, 60, 0.026, 8), cM);
  head.add(eyeN, noseN);
  const cross = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), glow(0xffffff, 0.95)); cross.position.set(0.24, 0.17, 0.1); head.add(cross);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.22, 3.0, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); sc.add(beam);
  s.update = (t) => {
    const u = H.userData; u.reset(); H.rotation.y = 0.25; u.setLid(0.45 + 0.1 * Math.sin(t * 3)); u.nose.scale.set(0.8 * (1 + 0.1 * Math.abs(Math.sin(t * 20))), 1, 1.15);
    H.updateMatrixWorld(true);
    const on = smooth(C.because + 0.3, C.because + 0.8, t); yM.uniforms.fade.value = on; cM.uniforms.fade.value = on * smooth(C.crossed - 0.6, C.crossed, t);
    yM.uniforms.p.value = ((t * 1.3) % 1.2) - 0.1; cM.uniforms.p.value = ((t * 1.3 + 0.5) % 1.2) - 0.1;
    const ck = smooth(C.crossed, C.crossed + 0.2, t); cross.scale.setScalar(Math.max(ck * (1.2 + 0.5 * Math.sin(t * 25)), 0.0001));
    const ew = worldOf(head, eyeL); const sunDir = V(-0.85, 0.6, 0.45).normalize(); beam.position.copy(ew).addScaledVector(sunDir, 1.5); beam.quaternion.setFromUnitVectors(V(0, 1, 0), sunDir); beam.visible = false;
    const hp = worldOf(head, V(0.05, 0.05, 0.1));
    if (t < C.eyes2) { const c = seg(t, C.because, C.eyes2); setCam(s.cam, hp.clone().add(lv(V(1.0, -0.1, 2.4), V(0.85, -0.1, 2.1), c)), hp, -3 + drift(t, 1.5), 36); }
    else if (t < C.crossed) { setCam(s.cam, ew.clone().add(V(0.45, -0.18, 1.1)), ew.clone().add(V(-0.05, 0, 0)), 2 + drift(t, 1.5), 36); }
    else { const c = seg(t, C.crossed, C.and + 0.2); setCam(s.cam, hp.clone().add(lv(V(1.6, -0.05, 1.3), V(1.4, -0.05, 1.15), c)), hp.clone().add(V(0.1, 0.05, 0)), 3 + drift(t, 1.5), 36); }
  };
});

// 6) Library: holding a sneeze in ----------------------------------------------------
shot(C.and, C.and2, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(2, 7, 5) });
  sc.background = gradTex([[0, '#fff4dc'], [0.4, '#e8c99a'], [1, '#8a5a36']], 0.5, 0.35);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshPhysicalMaterial({ color: 0x8a5a36, roughness: 0.5, clearcoat: 0.3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const br = rng(44), bookCols = [0xd94a3a, 0x3a7bd9, 0x3fae5a, 0xf2c230, 0x8a5cd6, 0xf2f2f2, 0x2a2a2a];
  for (let sh = 0; sh < 3; sh++) { const shelf = new THREE.Group(); shelf.position.set(-3.2 + sh * 3.2, 0, -3.2); sc.add(shelf); const fr = new THREE.Mesh(new THREE.BoxGeometry(2.8, 4.4, 0.6), new THREE.MeshPhysicalMaterial({ color: 0x6a4024, roughness: 0.6 })); fr.position.y = 2.2; shelf.add(fr);
    for (let row = 0; row < 4; row++) { let x = -1.25; while (x < 1.2) { const w = 0.08 + br() * 0.08, h = 0.55 + br() * 0.25; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.45), new THREE.MeshPhysicalMaterial({ color: bookCols[Math.floor(br() * bookCols.length)], roughness: 0.6 })); b.position.set(x + w / 2, 0.4 + row * 1.0 + h / 2, 0.12); shelf.add(b); x += w + 0.01; } } }
  const table = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.12, 1.6, 4, 0.04), new THREE.MeshPhysicalMaterial({ color: 0x9a6a3e, roughness: 0.45, clearcoat: 0.5 })); table.position.set(0, 1.45, 0); table.castShadow = table.receiveShadow = true; sc.add(table);
  [[-2.1, -0.7], [2.1, -0.7], [-2.1, 0.7], [2.1, 0.7]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.45, 0.1), table.material); l.position.set(x, 0.72, z); sc.add(l); });
  const lampM = new THREE.MeshPhysicalMaterial({ color: 0x2f8a4a, roughness: 0.3, clearcoat: 1 });
  [-1.2, 1.2].forEach(x => { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lampM); sh.position.set(x, 1.95, -0.3); sc.add(sh); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), M.chrome); pole.position.set(x, 1.72, -0.3); sc.add(pole); const pl = new THREE.PointLight(0xffe2a8, 4, 3, 1.5); pl.position.set(x, 1.85, -0.3); sc.add(pl); });
  const readers = [['B', -1.7, -0.95, 0], ['C', 1.3, -0.95, 0], ['E', 1.0, 0.95, Math.PI]].map(([k, x, z, ry]) => { const P = makeChar({ ...CAST[k], legs: false }); P.position.set(x, -0.35, z); P.rotation.y = ry; sc.add(P); return P; });
  const Mm = makeChar({ ...CAST.M, legs: false }); Mm.position.set(-0.25, -0.35, -0.95); Mm.rotation.y = 0; sc.add(Mm);
  const shh = textPlane('SHHH!', 0.8, '#3a7bd9'); sc.add(shh);
  s.update = (t) => {
    readers.forEach((P, i) => { const u = P.userData; u.reset(); u.setLid(0.35); u.arms.forEach(a => { a.sh.rotation.set(-0.9, 0, a.sx * 0.25); a.el.rotation.set(-1.0, 0, 0); }); const glare = smooth(C.hold - 0.2, C.hold + 0.3, t); u.head.rotation.y = (P.position.x < Mm.position.x ? 1 : -1) * 0.6 * glare * (P.rotation.y ? -1 : 1); });
    const u = Mm.userData; u.reset();
    const pinch = smooth(C.pinched - 0.15, C.pinched + 0.2, t), puff = smooth(C.closed - 0.1, C.stop + 0.1, t), boom = jolt(t, C.stop + 0.15);
    u.arms.forEach((a, i) => { if (i === 1) { a.sh.rotation.set(-1.35 * pinch - 0.6 * (1 - pinch), 0, -0.55 * pinch); a.el.rotation.set(-1.9 * pinch, 0, -0.4 * pinch); } else { a.sh.rotation.set(-0.6, 0, a.sx * 0.2); a.el.rotation.set(-0.9, 0, 0); } });
    const w = smooth(C.hold - 0.3, C.pinched, t); u.head.rotation.x = -0.25 * w * (1 - pinch) + 0.25 * boom; u.setLid(Math.max(0.3 + 0.5 * w, puff > 0.5 ? 1 : 0)); u.mouthOpen(0.3 * w * (1 - smooth(C.closed - 0.2, C.closed, t)));
    u.puff(0.55 * puff + 0.35 * boom); u.blush(0.9 * puff); Mm.position.y = -0.35 + 0.05 * boom;
    const sk = E.out(seg(t, C.hold, C.hold + 0.3)) * (1 - smooth(28.9, 29.3, t)); shh.scale.setScalar(sk + 0.0001); shh.position.set(1.3, 3.5, -0.9);
    const mh = worldOf(u.head, V(0, 0, 0));
    if (t < C.pinched) { const c = seg(t, C.and, C.pinched); setCam(s.cam, lv(V(0.6, 4.2, 6.4), V(0.4, 3.9, 5.6), c), V(-0.1, 2.0, 0), drift(t, 1.5), 42); }
    else if (t < C.closed) { const c = seg(t, C.pinched, C.closed); setCam(s.cam, mh.clone().add(lv(V(0.9, 0.2, 2.6), V(0.75, 0.15, 2.3), c)), mh.clone().add(V(0, -0.15, 0)), -3 + drift(t, 1.5), 36); }
    else if (t < C.stop) { const c = seg(t, C.closed, C.stop); setCam(s.cam, mh.clone().add(lv(V(-0.4, 0.1, 2.0), V(-0.3, 0.08, 1.7), c)), mh.clone().add(V(0, -0.05, 0)), 2 + drift(t, 1.5), 36); }
    else { const c = seg(t, C.stop, C.and2 + 0.2); setCam(s.cam, mh.clone().add(lv(V(0.5, 0.2, 1.9), V(0.4, 0.15, 1.6), c)).add(shake(t, 0.04 * boom)), mh, drift(t, 1.5), 36); }
    shh.lookAt(s.cam.position);
  };
});

// 7) The tear, then the hospital ----------------------------------------------------
shot(C.and2, C.end + 0.2, (s) => {
  const sc = s.scene; sc.environment = ENV;
  const xa = makePerson({ override: XM(), legs: false }); sc.add(xa);
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.6, 24, 1, true), glow(0xff7aa8, 0.6)); throat.position.set(0, 2.55, 0.0); sc.add(throat);
  const press = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), glow(0xff3344, 0.5)); press.position.set(0, 2.72, 0.05); sc.add(press);
  const tear = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.05, 2.7, -0.07), V(0.0, 2.62, -0.08), V(-0.03, 2.55, -0.07), V(0.04, 2.47, -0.08)]), 30, 0.012, 6), glow(0xffffff, 1)); sc.add(tear);
  // hospital
  const ward = new THREE.Group(); ward.position.set(40, 0, 0); sc.add(ward);
  const wfloor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshPhysicalMaterial({ color: 0xdfe8ee, roughness: 0.4, clearcoat: 0.4 })); wfloor.rotation.x = -Math.PI / 2; wfloor.receiveShadow = true; ward.add(wfloor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.MeshStandardMaterial({ color: 0xbfe4ea, roughness: 0.9 })); wall.position.set(0, 5, -2.2); ward.add(wall);
  const bed = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.4, 3.6, 4, 0.12), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.7 })); bed.position.set(0, 1.0, 0); bed.castShadow = bed.receiveShadow = true; ward.add(bed);
  const frame = new THREE.Mesh(new RoundedBoxGeometry(1.9, 0.9, 0.12, 4, 0.05), M.chrome); frame.position.set(0, 1.3, -1.85); ward.add(frame);
  const pillow = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.3, 0.7, 4, 0.14), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.8 })); pillow.position.set(0, 1.4, -1.3); pillow.rotation.x = 0.5; ward.add(pillow);
  const Mm = makeChar({ ...CAST.M, shirt: 0x9fc9e8, legs: false }); Mm.position.set(0, 1.1, 1.6); Mm.rotation.x = -1.35; ward.add(Mm);
  const blanket = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.35, 2.4, 4, 0.15), new THREE.MeshPhysicalMaterial({ color: 0x7fbfe0, roughness: 0.85, sheen: 1 })); blanket.position.set(0, 1.35, 0.55); ward.add(blanket);
  const brace = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.08, 12, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.8 })); brace.rotation.x = Math.PI / 2; brace.position.set(0, 2.47, 0); Mm.add(brace);
  const doc = makeChar({ shirt: 0x5fa8d3, pants: 0x5fa8d3, hair: 0x1a1210, skin: 0xb07a52, style: 'short', glasses: true, coat: true }); doc.position.set(1.6, 0, 0.2); doc.rotation.y = -0.9; ward.add(doc);
  const clip = new THREE.Mesh(new RoundedBoxGeometry(0.35, 0.48, 0.03, 2, 0.01), new THREE.MeshPhysicalMaterial({ color: 0xc58a4a })); clip.position.set(1.35, 1.95, 0.55); clip.rotation.set(-0.5, -0.9, 0); ward.add(clip);
  const ivp = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 3.2, 8), M.chrome); ivp.position.set(-1.3, 1.6, -0.9); ward.add(ivp);
  const ivb = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.42, 0.1, 3, 0.04), new THREE.MeshPhysicalMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.7, clearcoat: 1 })); ivb.position.set(-1.3, 3.0, -0.9); ward.add(ivb);
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(43, 7, 5); key.target.position.set(40, 1, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); sc.add(key, key.target);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x9fc9e0, 0.7));
  s.update = (t) => {
    const xr = t < C.back; sc.background = xr ? BG.xray : BG.cyan; xa.visible = throat.visible = press.visible = xr;
    const pr = smooth(C.and2, C.tore, t); press.scale.setScalar(0.3 + 0.45 * pr + 0.05 * Math.sin(t * 30) * pr); press.material.opacity = 0.3 + 0.35 * pr;
    tear.visible = xr && t > C.tore; tear.scale.setScalar(E.out(seg(t, C.tore, C.tore + 0.2)) + 0.0001); tear.material.color.setHex(Math.sin(t * 20) > 0 ? 0xffffff : 0xff5566);
    const u = Mm.userData; u.reset(); u.setLid(0.45); Mm.rotation.x = -1.35; u.head.rotation.x = 0.75; u.mouthOpen(0); u.arms.forEach(a => { a.sh.rotation.set(-0.3, 0, a.sx * 0.15); });
    const du = doc.userData; du.reset(); du.setLid(0.2); du.arms.forEach((a, i) => { if (i === 0) { a.sh.rotation.set(-0.9, 0, -0.1); a.el.rotation.set(-1.1, 0, 0); } }); du.head.rotation.set(0.2, 0, 0);
    if (t < C.hole) { const c = seg(t, C.and2, C.hole); setCam(s.cam, lv(V(2.0, 3.1, 3.0), V(1.7, 3.0, 2.6), c).add(shake(t, 0.03 * jolt(t, C.tore))), V(0, 2.65, 0), -3 + drift(t, 1.5), 38); }
    else if (t < C.back) { const c = seg(t, C.hole, C.back); setCam(s.cam, V(0, 2.6, -0.08).add(lv(V(1.1, 0.15, -1.3), V(0.9, 0.12, -1.1), c)), V(0, 2.6, -0.08), 3 + drift(t, 1.5), 36); }
    else { const c = seg(t, C.back, C.end); setCam(s.cam, V(40, 0, 0).add(lv(V(2.6, 3.4, 4.6), V(2.3, 3.2, 4.0), c)), V(40.3, 1.6, -0.1), drift(t, 1.2), 40); }
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
const TR = { 1: [C.yousee - 0.12, C.yousee + 0.18, 4], 2: [C.brain - 0.14, C.brain + 0.16, 3], 4: [C.but - 0.1, C.but + 0.22, 1], 5: [C.because - 0.1, C.because + 0.2, 2], 6: [C.and - 0.1, C.and + 0.22, 1], 7: [C.and2 - 0.14, C.and2 + 0.16, 3] };

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
