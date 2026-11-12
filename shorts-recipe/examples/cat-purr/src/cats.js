// "Why Do Cats Purr" — procedural 3D short, rendered frame by frame.
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
  scratch: 0.58, yourcat: 2.06, purr: 3.06, but: 3.3, mean: 4.32, happy: 4.76, yousee: 5.48, scared: 7.56, hurt: 8.14,
  giving: 8.96, sound: 10.04, voicebox: 11.18, vocal: 12.18, n150: 13.76, times: 14.42, breathes: 16.14, some: 17.66,
  low: 19.18, might: 20.24, help: 20.88, but2: 22.32, hungry: 23.24, hides: 23.94, high: 24.4, cry: 24.96, inside: 25.4,
  similar: 26.84, crying: 27.8, baby: 28.18, which: 29.14, fake: 31.26, likeababy: 32.0, just: 32.78, end: 34.45,
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
  add(sph(0.12, white), V(0, -0.3, 0.38), head);
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
    purr(t, amt = 1) { const j = 1 + 0.008 * amt * Math.sin(t * 2 * Math.PI * 9.7); cat.scale.set(cat.userData.s * j, cat.userData.s * (2 - j), cat.userData.s * j); },
  };
  cat.userData = { ...api, s: 1 };
  api.setLid(0.15); api.setEars(0);
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
// SHOTS
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.01, 200) }; build(s); shots.push(s); return s; }

// 0) Hook: ear scratch close-up, cut wide on "your cat starts to purr" ---------------
shot(0, C.but, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(3, 6, 5), shadow: 0.25 });
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.3, 3.2, 6, 0.14), new THREE.MeshPhysicalMaterial({ color: 0x3d6fd8, roughness: 0.75, sheen: 1, sheenColor: new THREE.Color(0x9fc1ff) }));
  cushion.position.set(0, 0.15, -0.3); cushion.receiveShadow = true; cushion.castShadow = true; sc.add(cushion);
  const cat = makeCat({ pose: 'loaf', seed: 3 }); cat.position.y = 0.3; sc.add(cat);
  const hand = makeHand({ forearm: 2.6, heroRadial: 96, curls: [[0.55, 0.6, 0.35], [0.6, 0.65, 0.35], [0.6, 0.65, 0.35], [0.65, 0.7, 0.4]] });
  hand.scale.setScalar(0.38); sc.add(hand);
  const rings = purrRings(sc, 3, 0xffffff);
  s.update = (t) => {
    const u = cat.userData; u.setLid(lerp(0.15, 0.92, smooth(0.5, 1.9, t))); u.head.rotation.set(0.05, 0, 0.16 * smooth(0.3, 1.6, t) + 0.03 * Math.sin(t * 3));
    u.purr(t, smooth(2.6, 3.1, t));
    const sp = Math.sin(t * 2 * Math.PI * 3.2);
    hand.rotation.set(Math.PI - 0.6, 0.35, 0.15); hand.position.set(0, 0, 0); hand.updateMatrixWorld(true);
    const ti = hand.userData.fingers[1].userData.tip; const local = worldOf(ti, V(0, ti.userData.L * 0.8, 0.12));
    const target = V(0.36 + 0.07 * sp, 1.82, 0.32 + 0.03 * Math.cos(t * 2 * Math.PI * 3.2));
    hand.position.copy(target.sub(local)); hand.updateMatrixWorld(true);
    rings(t, V(0, 0.75, 0.95), smooth(2.7, 3.1, t), 0.5);
    const hp = V(0, 1.36, 0.5);
    if (t < C.yourcat) { const c = seg(t, 0, C.yourcat); setCam(s.cam, hp.clone().add(lv(V(0.7, 0.45, 3.4), V(0.55, 0.4, 2.9), c)), hp.clone().add(V(0.12, 0.2, 0)), -3 + drift(t, 1.5), 36); }
    else { const c = seg(t, C.yourcat, C.but + 0.2); setCam(s.cam, lv(V(2.9, 2.0, 4.6), V(2.5, 1.85, 4.1), c), V(0, 0.8, 0), 2 + drift(t, 1.5), 38); }
  };
});

// 1) "but that doesn't always mean it's happy": the heart cracks ---------------------
shot(C.but, C.yousee, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(-3, 6, 5), shadow: 0.22 });
  const cat = makeCat({ pose: 'sit', seed: 3 }); sc.add(cat);
  const pts = (side) => { const p = []; for (let i = 0; i <= 40; i++) { const tt = side > 0 ? Math.PI * i / 40 : Math.PI + Math.PI * i / 40; p.push([16 * Math.pow(Math.sin(tt), 3) / 16, (13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt)) / 16]); } return p; };
  const zig = [[0, 0.3125], [0.07, 0.12], [-0.06, -0.08], [0.06, -0.3], [-0.05, -0.55], [0.04, -0.8], [0, -1.0625]];
  const half = (side) => { const sh = new THREE.Shape(); const p = pts(side); sh.moveTo(p[0][0], p[0][1]); p.forEach(q => sh.lineTo(q[0], q[1])); (side > 0 ? zig.slice().reverse() : zig).forEach(q => sh.lineTo(q[0], q[1])); return sh; };
  const hm = new THREE.MeshPhysicalMaterial({ color: 0xff3150, roughness: 0.2, clearcoat: 1, emissive: 0x400010 });
  const halves = [1, -1].map(sd => { const g = new THREE.ExtrudeGeometry(half(sd), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 6, curveSegments: 24 }); g.translate(0, 0, -0.11); const m = new THREE.Mesh(g, hm.clone()); m.castShadow = true; m.scale.setScalar(0.42); sc.add(m); return m; });
  s.update = (t) => {
    const u = cat.userData; u.setLid(0.12 + 0.85 * (Math.abs(Math.sin((t - 3.9) * 3.0)) < 0.08 ? 1 : 0)); u.purr(t, 0.8);
    u.head.rotation.set(0, 0, -0.12 * smooth(C.mean, C.happy, t));
    const k = E.out(seg(t, C.mean, C.mean + 0.6)), bob = Math.sin(t * 2.2) * 0.04;
    halves.forEach((m, i) => { const sd = i ? -1 : 1; m.position.set(sd * 0.09 * k, 3.05 + bob - 0.08 * k, 0.1); m.rotation.set(0, 0, -sd * 0.16 * k); m.material.color.lerpColors(new THREE.Color(0xff3150), new THREE.Color(0x8a8f96), k); m.material.emissive.setHex(k > 0.5 ? 0x000000 : 0x400010); });
    const c = seg(t, C.but, C.yousee); setCam(s.cam, lv(V(0.6, 2.2, 6.4), V(0.4, 2.15, 5.6), c), V(0, 2.0, 0), drift(t, 1.5), 38);
  };
});

// 2) Scared: thunderstorm window, ears back, pupils wide ------------------------------
shot(C.yousee, C.hurt, (s) => {
  const sc = s.scene; sc.background = BG.xray; sc.environment = ENV;
  sc.add(new THREE.HemisphereLight(0x6f86c9, 0x1b2240, 0.5));
  const key = new THREE.DirectionalLight(0x9db6ff, 0.9); key.position.set(-3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); sc.add(key);
  const flashL = new THREE.PointLight(0xdfe9ff, 0, 30, 1.2); flashL.position.set(0, 3.2, -2.2); sc.add(flashL);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x2b3352, roughness: 0.8 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.MeshStandardMaterial({ color: 0x323c63, roughness: 0.9 })); wall.position.set(0, 5, -3); sc.add(wall);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6), new THREE.MeshBasicMaterial({ color: 0x1b2a55 })); pane.position.set(0.2, 3.2, -2.98); sc.add(pane);
  const frameM = new THREE.MeshPhysicalMaterial({ color: 0xe9eef7, roughness: 0.5 });
  [[0, 1.3, 2.6, 0.12], [0, -1.3, 2.6, 0.12], [1.2, 0, 0.12, 2.7], [-1.2, 0, 0.12, 2.7], [0, 0, 0.08, 2.6], [0, 0, 2.4, 0.08]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), frameM); b.position.set(0.2 + x, 3.2 + y, -2.92); sc.add(b); });
  const bolt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.5, 4.5, -2.97), V(0.2, 3.9, -2.97), V(0.45, 3.5, -2.97), V(0.05, 2.7, -2.97), V(0.3, 2.3, -2.97)]), 40, 0.03, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  sc.add(bolt);
  const cat = makeCat({ pose: 'sit', seed: 3 }); sc.add(cat); cat.userData.setPupil(true);
  const rings = purrRings(sc, 3, 0x9fd8ff);
  s.update = (t) => {
    const u = cat.userData; u.setEars(1); u.setLid(-0.15); u.purr(t, 1); cat.userData.s = 1.04;
    const fl = Math.max(Math.exp(-Math.pow((t - C.scared) / 0.05, 2)), 0.7 * Math.exp(-Math.pow((t - C.scared - 0.3) / 0.04, 2)), 0.5 * Math.exp(-Math.pow((t - 6.0) / 0.05, 2)));
    flashL.intensity = 60 * fl; pane.material.color.setRGB(0.1 + 0.9 * fl, 0.16 + 0.84 * fl, 0.33 + 0.67 * fl); bolt.material.opacity = fl; bolt.visible = fl > 0.05;
    u.head.position.copy(u.headPos).add(shake(t, 0.006 + 0.03 * fl));
    rings(t, V(0, 1.4, 0.5), 0.8, 0.5);
    const c = seg(t, C.yousee, C.hurt); setCam(s.cam, lv(V(-0.9, 2.1, 6.2), V(-0.5, 2.0, 4.6), E.io(c)).add(shake(t, 0.03 * fl)), V(0.05, 1.85, 0), -4 + drift(t, 1.4), 38);
  };
});

// 3) Hurt: vet table, cone collar, bandaged paw ---------------------------------------
shot(C.hurt, C.giving, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(3, 7, 4), shadow: 0.2 });
  const table = new THREE.Mesh(new RoundedBoxGeometry(4, 0.25, 3, 6, 0.08), new THREE.MeshPhysicalMaterial({ color: 0xd3dde2, roughness: 0.3, metalness: 0.8 })); table.position.y = -0.13; table.receiveShadow = true; sc.add(table);
  const cat = makeCat({ pose: 'loaf', seed: 3 }); sc.add(cat); cat.userData.setLid(0.55);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.36, 0.62, 56, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
  cone.rotation.x = Math.PI / 2; cone.position.set(0, 1.0, 0.35); sc.add(cone);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.32, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.9 })); band.rotation.x = Math.PI / 2; band.position.set(0.2, 0.13, 0.62); sc.add(band);
  const tape = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.02, 8, 32), new THREE.MeshPhysicalMaterial({ color: 0x55c2ff, roughness: 0.6 })); tape.position.set(0.2, 0.13, 0.62); sc.add(tape);
  const rings = purrRings(sc, 3, 0xffffff);
  s.update = (t) => { cat.userData.purr(t, 1); rings(t, V(0, 0.7, 1.05), 0.9, 0.45); const c = seg(t, C.hurt, C.giving); setCam(s.cam, lv(V(1.6, 2.2, 4.6), V(1.3, 2.0, 4.0), c), V(0.05, 0.75, 0.2), 3 + drift(t, 1.4), 38); };
});

// 4) Giving birth: mother with newborn kittens ----------------------------------------
shot(C.giving, C.sound, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(-2, 6, 5), shadow: 0.22 });
  const bed = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.38, 24, 64), new THREE.MeshPhysicalMaterial({ color: 0xf2c46b, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0xfff0c8) })); bed.rotation.x = Math.PI / 2; bed.scale.z = 0.7; bed.position.set(0, 0.26, -0.35); bed.castShadow = bed.receiveShadow = true; sc.add(bed);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 48), new THREE.MeshPhysicalMaterial({ color: 0xfff2d8, roughness: 0.9 })); pad.position.set(0, 0.06, -0.35); pad.receiveShadow = true; sc.add(pad);
  const mom = makeCat({ pose: 'loaf', seed: 3 }); mom.position.set(-0.15, 0.1, -0.6); mom.rotation.y = 0.5; sc.add(mom); mom.userData.setLid(0.85);
  const kits = [['#8d949c', '#5d636a', true], ['#2d2c31', '#2d2c31', false], ['#f1e2cf', '#d9bf9c', true]].map(([b, st, sp], i) => {
    const k = makeCat({ pose: 'loaf', base: b, stripe: st, seed: 10 + i, stripes: sp }); k.userData.s = 0.34; k.scale.setScalar(0.34);
    k.position.set(0.55 + i * 0.3, 0.12, 0.25 - i * 0.28); k.rotation.y = -2.2 + i * 0.25; k.userData.setLid(1); sc.add(k); return k;
  });
  const rings = purrRings(sc, 3, 0xffffff);
  s.update = (t) => { mom.userData.purr(t, 1); kits.forEach((k, i) => { k.userData.s = 0.34; k.position.y = 0.12 + 0.01 * Math.sin(t * 5 + i); k.userData.purr(t + i, 0.6); }); rings(t, V(0.1, 0.85, 0.3), 0.9, 0.5);
    const c = seg(t, C.giving, C.sound + 0.2); setCam(s.cam, lv(V(2.2, 2.6, 4.3), V(1.8, 2.3, 3.6), c), V(0.25, 0.55, -0.2), drift(t, 1.4), 38); };
});

// 5) X-ray: voice box, vocal folds, breathing ----------------------------------------
shot(C.sound, C.some, (s) => {
  const sc = s.scene; sc.background = BG.xray;
  const xm = xrayMat(new THREE.Color(0.55, 0.85, 1.0), new THREE.Color(0.04, 0.16, 0.42), 2.0, 1.0);
  const cat = makeCat({ pose: 'sit', override: xm }); sc.add(cat);
  const boneM = glow(0xbfe6ff, 0.28), cyan = glow(0x49e3ff, 0.9), pinkG = glow(0xff6fb0, 0.85);
  const shells = [cat]; const skull = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 20), boneM); shells.push(skull); skull.position.set(0, 1.86, 0.05); skull.scale.set(1.1, 0.85, 1.05); sc.add(skull);
  for (let i = 0; i < 14; i++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), boneM); const k = i / 13; v.position.set(0, lerp(1.55, 0.35, k), lerp(-0.12, -0.62, Math.sin(k * 1.4))); sc.add(v); shells.push(v); }
  const larynx = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.24, 24, 1, true), cyan); larynx.position.set(0, 1.43, 0.3); sc.add(larynx);
  const tracheaC = new THREE.CatmullRomCurve3([V(0, 1.3, 0.3), V(0, 1.1, 0.24), V(0, 0.95, 0.12)]);
  sc.add(new THREE.Mesh(new THREE.TubeGeometry(tracheaC, 30, 0.045, 10), glow(0x49e3ff, 0.55)));
  const lungs = [-1, 1].map(sx => { const l = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), glow(0xff7aa8, 0.38)); l.position.set(sx * 0.17, 0.8, -0.05); sc.add(l); return l; });
  const folds = [-1, 1].map(sx => { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), pinkG); f.scale.set(0.03, 0.085, 0.06); f.position.set(sx * 0.04, 1.43, 0.3); sc.add(f); return f; });
  const air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.016, 8, 6), glow(0xd9fbff, 0.9), 40); sc.add(air);
  const airPath = new THREE.CatmullRomCurve3([V(0, 1.72, 0.7), V(0, 1.6, 0.5), V(0, 1.43, 0.3), V(0, 1.15, 0.25), V(0, 0.9, 0.1), V(0.0, 0.8, -0.05)]);
  const label = textPlane('150× A SECOND', 0.2); label.position.set(0.0, 1.575, 0.47); label.renderOrder = 5; sc.add(label);
  const rings = purrRings(sc, 3, 0x49e3ff);
  const dummy = new THREE.Object3D();
  s.update = (t) => {
    const glowUp = smooth(C.voicebox - 0.2, C.voicebox + 0.2, t); larynx.material.opacity = 0.5 + 0.5 * glowUp;
    const gap = 0.012 + 0.03 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 7.5)); folds.forEach((f, i) => f.position.x = (i ? 1 : -1) * gap);
    const br = (t % 1.6) / 1.6, inhale = br < 0.5; lungs.forEach(l => l.scale.set(0.18 * (1 + 0.15 * Math.sin(br * 2 * Math.PI - Math.PI / 2)), 0.3, 0.26));
    for (let i = 0; i < 40; i++) { let u = ((i / 40) + (t * 0.9) % 1) % 1; if (!inhale) u = 1 - u; dummy.position.copy(airPath.getPoint(u)); dummy.scale.setScalar(t >= C.breathes ? 1 : 0.0001); dummy.updateMatrix(); air.setMatrixAt(i, dummy.matrix); }
    air.instanceMatrix.needsUpdate = true;
    rings(t, V(0, 1.43, 0.3), smooth(C.vocal - 0.3, C.vocal, t), 0.35, s.cam.position);
    const lk = E.out(seg(t, C.n150 - 0.05, C.n150 + 0.35)); label.scale.setScalar(Math.max(lk * (1 + 0.06 * Math.sin(t * 9)), 0.0001)); label.lookAt(s.cam.position);
    const L = V(0, 1.43, 0.3); const close = t >= C.vocal && t < C.breathes; shells.forEach(m => m.visible = !close); label.visible = t < C.breathes; larynx.material.opacity = close ? 0.35 : larynx.material.opacity; folds.forEach(f => f.material.opacity = close ? 0.6 : 0.85);
    if (t < C.vocal) { const c = E.io(seg(t, C.sound, C.vocal)); setCam(s.cam, lv(V(2.6, 2.1, 3.6), V(1.5, 1.7, 2.0), c), lv(V(0, 1.4, 0), L, c), -3 + drift(t, 1.6), 36); }
    else if (t < C.times) { const c = seg(t, C.vocal, C.times); setCam(s.cam, L.clone().add(lv(V(0.1, 0.07, 1.0), V(0.07, 0.05, 0.78), c)), L.clone().add(V(0, 0.06, 0)), drift(t, 2), 36); }
    else if (t < C.breathes) { const c = E.io(seg(t, C.times, C.breathes)); setCam(s.cam, L.clone().add(lv(V(0.07, 0.05, 0.78), V(0.45, 0.25, 1.9), c)), L.clone().add(V(0, 0.06 + 0.12 * c, 0)), drift(t, 2), 36); }
    else { const c = seg(t, C.breathes, C.some + 0.2); setCam(s.cam, lv(V(3.4, 1.7, 2.6), V(3.0, 1.6, 2.3), c), V(0, 1.15, 0.1), 4 + drift(t, 1.6), 38); }
    label.lookAt(s.cam.position); rings(t, V(0, 1.43, 0.3), smooth(C.vocal - 0.3, C.vocal, t), 0.35, s.cam.position);
  };
});

// 6) Bone healing with purr vibrations ------------------------------------------------
shot(C.some, C.but2, (s) => {
  const sc = s.scene; sc.background = BG.xray;
  const xm = xrayMat(new THREE.Color(0.55, 0.85, 1.0), new THREE.Color(0.04, 0.16, 0.42), 2.0, 1.0);
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 2.6, 12, 40), xm); leg.position.set(0, 1.6, 0); sc.add(leg);
  const paw = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20), xm); paw.scale.set(1, 0.6, 1.3); paw.position.set(0, 0.2, 0.15); sc.add(paw);
  const chest = new THREE.Mesh(new THREE.SphereGeometry(1.3, 40, 28), xm); chest.position.set(0.3, 3.6, -0.6); sc.add(chest);
  const boneM = new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 1.15, 8, 20), boneM); upper.position.set(0, 2.2, 0); sc.add(upper);
  const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 1.0, 8, 20), boneM); sc.add(lower);
  const crack = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), glow(0xff3344, 0.95)); crack.scale.set(1, 0.45, 1); sc.add(crack);
  const rings = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 60), glow(0x49e3ff, 0.8)); m.rotation.x = Math.PI / 2; sc.add(m); return m; });
  s.update = (t) => {
    const heal = E.io(seg(t, C.help, C.help + 0.9)), gapY = lerp(0.14, 0.0, heal);
    lower.position.set(0, 2.2 - 0.575 - gapY - 0.5 - 0.09, 0);
    crack.position.set(0, 2.2 - 0.575 - gapY / 2 - 0.09, 0);
    crack.material.color.lerpColors(new THREE.Color(0xff3344), new THREE.Color(0x49e3ff), heal); crack.material.opacity = 0.95 * (1 - smooth(0.8, 1, heal) * 0.85) * (0.7 + 0.3 * Math.sin(t * 12));
    rings.forEach((m, i) => { const a = ((t - C.low) * 0.9 + i / 4) % 1; m.visible = t > C.low; m.position.set(0, 3.0 - a * 2.7, 0); m.material.opacity = 0.8 * Math.sin(Math.PI * a); m.scale.setScalar(1 + 0.08 * Math.sin(t * 20)); });
    const ck = crack.position;
    if (t < C.might) { const c = seg(t, C.some, C.might); setCam(s.cam, lv(V(2.2, 2.6, 5.6), V(1.8, 2.3, 4.8), c), V(0, 1.75, 0), -4 + drift(t, 1.6), 38); }
    else { const c = seg(t, C.might, C.but2); setCam(s.cam, ck.clone().add(lv(V(0.7, 0.25, 1.7), V(0.5, 0.2, 1.3), c)), ck, 3 + drift(t, 1.6), 38); }
  };
});

// 7) Hungry: empty bowl, the hidden cry in the purr ----------------------------------
function waveTube(fn, r, mat, x0 = -1.6, x1 = 1.6) {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  m.userData.update = (t, extra = {}) => { const p = []; for (let i = 0; i <= 160; i++) { const x = lerp(x0, x1, i / 160); p.push(V(x, fn(x, t), 0)); } m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 320, r, 8); };
  return m;
}
const purrWave = (x, t) => 0.2 * Math.sin(2.0 * x - 5 * t);
const cryWave = (amt) => (x, t) => purrWave(x, t) + 0.075 * amt * Math.sin(17 * x - 32 * t);
function tileFloor(sc) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#efe6d6'; g.fillRect(0, 0, 512, 512); g.strokeStyle = '#cdbfa8'; g.lineWidth = 6;
  for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.35, clearcoat: 0.4 })); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; sc.add(f);
}
const bowlGeo = new THREE.LatheGeometry([[0, 0], [0.42, 0], [0.5, 0.05], [0.56, 0.2], [0.6, 0.24], [0.55, 0.24], [0.48, 0.1], [0.38, 0.06], [0, 0.06]].map(p => new THREE.Vector2(p[0], p[1])), 64);
const steel = new THREE.MeshPhysicalMaterial({ color: 0xd9e2e7, metalness: 1, roughness: 0.22 });
function ownerLegs(sc, x, z) {
  const jeans = new THREE.MeshPhysicalMaterial({ color: 0x3b5a8c, roughness: 0.8, sheen: 0.5 }), shoe = new THREE.MeshPhysicalMaterial({ color: 0xf5f5f5, roughness: 0.5 });
  [-0.32, 0.32].forEach(dx => { const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 3.4, 8, 24), jeans); l.position.set(x + dx, 2.0, z); l.castShadow = true; sc.add(l); const sh = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.25, 0.85, 4, 0.1), shoe); sh.position.set(x + dx, 0.12, z + 0.22); sh.castShadow = true; sc.add(sh); });
}
shot(C.but2, C.similar, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(3, 7, 5), shadow: 0.25 }); tileFloor(sc);
  const cat = makeCat({ pose: 'sit', seed: 3 }); cat.rotation.y = 0.25; sc.add(cat);
  const bowl = new THREE.Mesh(bowlGeo, steel); bowl.position.set(1.05, 0, 1.15); bowl.castShadow = bowl.receiveShadow = true; sc.add(bowl);
  ownerLegs(sc, 1.9, -1.4);
  const wave = new THREE.Group(); wave.position.set(0, 3.15, 0.2); sc.add(wave);
  const pw = waveTube(purrWave, 0.035, glow(0xffe2b8, 0.95)); const cw = waveTube(cryWave(1), 0.022, glow(0xff4fa3, 0.95)); wave.add(pw, cw);
  const rings = purrRings(sc, 3, 0xffffff);
  s.update = (t) => {
    const u = cat.userData; u.head.rotation.set(-0.32, 0.38, 0.08 * Math.sin(t * 1.3)); u.setLid(0.1); u.purr(t, 1); u.setPupil(true);
    const amt = E.out(seg(t, C.high, C.cry + 0.1)), on = E.out(seg(t, C.hides - 0.1, C.hides + 0.4));
    wave.scale.set(on + 0.0001, on + 0.0001, 1);
    pw.userData.update(t); cw.visible = amt > 0.01; if (cw.visible) { cw.geometry.dispose(); const p = []; for (let i = 0; i <= 160; i++) { const x = lerp(-1.6, 1.6, i / 160); p.push(V(x, cryWave(amt)(x, t), 0.02)); } cw.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 320, 0.022, 8); }
    rings(t, V(0.05, 1.45, 0.45), 0.8, 0.45);
    if (t < C.hides) { const c = seg(t, C.but2, C.hides); setCam(s.cam, lv(V(2.2, 1.3, 5.0), V(1.9, 1.25, 4.4), c), V(0.4, 1.3, 0), 3 + drift(t, 1.5), 38); }
    else if (t < C.inside) { const c = E.io(seg(t, C.hides, C.inside)); setCam(s.cam, lv(V(0.4, 2.3, 7.6), V(0.3, 2.5, 7.0), c), V(0.1, 2.2, 0), drift(t, 1.5), 38); }
    else { const c = seg(t, C.inside, C.similar + 0.2); setCam(s.cam, lv(V(0.3, 3.0, 3.3), V(0.2, 3.05, 2.8), c), V(0, 2.9, 0), -2 + drift(t, 1.5), 38); }
  };
});

// 8) Crying baby, matching pitch -----------------------------------------------------
shot(C.similar, C.which, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(2, 7, 5), shadow: 0.22 });
  const mat = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.35, 1.9, 6, 0.15), new THREE.MeshPhysicalMaterial({ color: 0xdff3ff, roughness: 0.8, sheen: 1 })); mat.position.y = 0.7; mat.receiveShadow = true; mat.castShadow = true; sc.add(mat);
  const wood = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, clearcoat: 0.5 });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.3, 16), wood); rail.rotation.z = Math.PI / 2; rail.position.set(0, 1.9, -0.95); sc.add(rail);
  for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 12), wood); b.position.set(-1.6 + i * 0.29, 1.3, -0.95); b.castShadow = true; sc.add(b); }
  [-1.65, 1.65].forEach(x => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 16), wood); p.position.set(x, 1.1, -0.95); sc.add(p); });
  const skin = new THREE.MeshPhysicalMaterial({ color: 0xf2b597, roughness: 0.45, sheen: 0.4, clearcoat: 0.2 }), onesie = new THREE.MeshPhysicalMaterial({ color: 0xffd6e8, roughness: 0.8, sheen: 1 });
  const baby = new THREE.Group(); baby.position.set(-0.2, 1.05, 0); sc.add(baby);
  const headB = new THREE.Mesh(new THREE.SphereGeometry(0.42, 40, 28), skin); headB.position.set(-0.7, 0.12, 0); headB.castShadow = true; baby.add(headB);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12), new THREE.MeshPhysicalMaterial({ color: 0x8a2433, roughness: 0.5 })); mouth.scale.set(1, 0.4, 1.2); mouth.position.set(-0.7, 0.43, 0.2); baby.add(mouth);
  [-0.12, 0.12].forEach(dz => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.09, 4, 8), DARK); e.rotation.x = Math.PI / 2; e.position.set(-0.86, 0.47, 0.12 + dz * 1.6); e.rotation.z = 0.3; baby.add(e); });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.7, 10, 28), onesie); body.rotation.z = Math.PI / 2; body.position.set(0.15, 0.05, 0); body.castShadow = true; baby.add(body);
  const limbs = [[-0.15, 0.34], [-0.15, -0.34], [0.75, 0.22], [0.75, -0.22]].map(([x, z], i) => { const g = new THREE.Group(); g.position.set(x, 0.12, z); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.35, 6, 16), i < 2 ? onesie : onesie); m.position.y = 0.22; g.add(m); const h = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), skin); h.position.y = 0.45; g.add(h); baby.add(g); return g; });
  const tears = [0, 1, 2, 3].map(() => { const d = dropMesh(0.04, glow(0x8fd8ff, 0.9)); baby.add(d); return d; });
  const babyWave = new THREE.Group(); babyWave.position.set(0, 2.75, 0.6); sc.add(babyWave);
  const bw = waveTube((x, t) => 0.075 * Math.sin(17 * x - 32 * t), 0.028, glow(0xff4fa3, 0.95), -0.85, 0.85); babyWave.add(bw);
  const catWave = new THREE.Group(); sc.add(catWave);
  const cwv = waveTube((x, t) => 0.075 * Math.sin(17 * x - 32 * t), 0.028, glow(0xffb3dc, 0.9), -0.85, 0.85); catWave.add(cwv);
  const catIcon = textPlane('CAT', 0.75, '#ff9bd0'), babyIcon = textPlane('BABY', 0.75, '#ff4fa3'); sc.add(catIcon, babyIcon);
  s.update = (t) => {
    limbs.forEach((g, i) => { g.rotation.set(0.9 * Math.sin(t * 9 + i * 1.7), 0, (i % 2 ? 1 : -1) * 0.4 + 0.5 * Math.sin(t * 7 + i)); });
    headB.position.y = 0.12 + 0.02 * Math.sin(t * 14); mouth.scale.y = 0.4 + 0.2 * Math.abs(Math.sin(t * 7));
    tears.forEach((d, i) => { const a = ((t * 1.2 + i / 4) % 1); d.position.set(-0.86 + a * 0.2, 0.45 - a * 0.25, (i % 2 ? 1 : -1) * (0.3 + a * 0.5)); });
    bw.userData.update(t); cwv.userData.update(t);
    const slide = E.io(seg(t, C.crying - 0.1, C.baby + 0.25));
    catWave.position.set(0, lerp(3.55, 2.77, slide), 0.62);
    catIcon.position.set(0, catWave.position.y + 0.3, 0.65); catIcon.lookAt(s.cam.position);
    babyIcon.position.set(0, 2.42, 0.65); babyIcon.lookAt(s.cam.position); babyIcon.material.opacity = 1;
    const c = seg(t, C.similar, C.which + 0.2); setCam(s.cam, lv(V(0.3, 4.9, 4.2), V(0.25, 4.6, 3.6), c), V(-0.2, 1.75, 0.2), drift(t, 1.5), 40);
    catIcon.lookAt(s.cam.position); babyIcon.lookAt(s.cam.position);
  };
});

// 9) Payoff: bonnet, pacifier, breakfast served --------------------------------------
shot(C.which, C.end + 0.2, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(3, 7, 5), shadow: 0.25 }); tileFloor(sc);
  const cat = makeCat({ pose: 'sit', seed: 3 }); sc.add(cat);
  const H = cat.userData.head;
  const bonnetM = new THREE.MeshPhysicalMaterial({ color: 0xffb6d5, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide });
  const bon = new THREE.Group(); bon.rotation.x = -0.75; H.add(bon);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.66, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.56), bonnetM); cap.scale.set(1.12, 1, 1.02); cap.castShadow = true; bon.add(cap);
  const fr = new THREE.Mesh(new THREE.TorusGeometry(0.66 * Math.sin(Math.PI * 0.56), 0.065, 12, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.7, sheen: 1 })); fr.rotation.x = Math.PI / 2; fr.position.y = 0.66 * Math.cos(Math.PI * 0.56); fr.scale.set(1.12, 1.02, 1); bon.add(fr);
  [-1, 1].forEach(sx => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), bonnetM); b.position.set(sx * 0.09, -0.46, 0.3); b.scale.set(1.3, 0.8, 0.8); H.add(b); });
  const paciM = new THREE.MeshPhysicalMaterial({ color: 0x7fd3ff, roughness: 0.25, clearcoat: 1 });
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.045, 32), paciM); shield.rotation.x = Math.PI / 2; shield.position.set(0, -0.17, 0.62); shield.scale.set(1.25, 1, 0.85); H.add(shield);
  const pring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.02, 10, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1 })); pring.position.set(0, -0.2, 0.68); H.add(pring);
  const bowl = new THREE.Mesh(bowlGeo, steel); bowl.position.set(0.85, 0, 0.9); bowl.castShadow = bowl.receiveShadow = true; sc.add(bowl);
  ownerLegs(sc, 2.2, -1.5);
  const bag = new THREE.Group(); sc.add(bag);
  const bagBody = new THREE.Mesh(new RoundedBoxGeometry(0.75, 1.05, 0.38, 4, 0.08), new THREE.MeshPhysicalMaterial({ color: 0xff6a3d, roughness: 0.45, clearcoat: 0.6 })); bag.add(bagBody);
  const lbl = textPlane('CAT FOOD', 0.66, '#ffffff', '#ff6a3d'); lbl.position.set(0, 0.05, 0.2); bag.add(lbl);
  const hand = makeHand({ forearm: 2.2, heroRadial: 80, curls: [[1.1, 1.2, 0.8], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9], [1.2, 1.3, 0.9]] }); hand.scale.setScalar(0.3); sc.add(hand);
  const NK = 70, kib = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0x8a4b22, roughness: 0.6 }), NK); kib.castShadow = true; sc.add(kib);
  const kr = rng(31), K = []; for (let i = 0; i < NK; i++) { const a = kr() * 6.28, r = Math.sqrt(kr()) * 0.38; K.push({ t0: 31.5 + i * 0.022, x: 0.85 + Math.cos(a) * r, z: 0.9 + Math.sin(a) * r, y: 0.1 + kr() * 0.12 * (1 - r / 0.4) + Math.floor(i / 25) * 0.04 }); }
  const rings = purrRings(sc, 3, 0xffffff);
  const dummy = new THREE.Object3D();
  s.update = (t) => {
    const u = cat.userData; u.purr(t, 1); u.setLid(lerp(0.15, 0.62, smooth(C.fake - 0.2, C.fake + 0.4, t))); u.head.rotation.set(-0.18, 0.28, 0.1 * Math.sin(t * 1.4));
    const enter = E.out(seg(t, C.which + 0.3, 31.2)), tilt = E.io(seg(t, 30.9, 31.45));
    const spout = V(0.95, 1.6, 0.75);
    bag.position.set(lerp(2.6, 1.3, enter), lerp(3.4, 2.05, enter), 0.55); bag.rotation.set(0, 0, lerp(0, 1.9, tilt));
    hand.rotation.set(0, 0, -Math.PI / 2 + lerp(0, 1.9, tilt)); hand.position.copy(bag.position).add(V(0.55, 0.25, -0.1));
    for (let i = 0; i < NK; i++) { const q = K[i], a = t - q.t0; if (a < 0) { dummy.scale.setScalar(0.0001); } else { const fall = clamp(a / 0.35); dummy.position.set(lerp(spout.x, q.x, fall), lerp(spout.y, q.y, fall) + (fall < 1 ? -0.0 : 0), lerp(spout.z, q.z, fall)); dummy.position.y = fall < 1 ? spout.y - (spout.y - q.y) * fall * fall : q.y; dummy.scale.setScalar(1); dummy.rotation.set(i, i * 2, 0); } dummy.updateMatrix(); kib.setMatrixAt(i, dummy.matrix); }
    kib.instanceMatrix.needsUpdate = true;
    rings(t, V(0.1, 1.45, 0.5), 0.8, 0.45);
    if (t < C.fake) { const c = seg(t, C.which, C.fake); setCam(s.cam, lv(V(1.9, 1.9, 5.8), V(1.6, 1.85, 5.0), c), V(0.45, 1.45, 0.2), 2 + drift(t, 1.5), 38); }
    else { const c = seg(t, C.fake, C.end); setCam(s.cam, lv(V(0.6, 2.1, 4.3), V(0.45, 2.0, 3.7), c), V(0.35, 1.55, 0.4), -2 + drift(t, 1.5), 38); }
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
const TR = { 1: [C.but - 0.1, C.but + 0.22, 1], 2: [C.yousee - 0.12, C.yousee + 0.18, 4], 5: [C.sound - 0.14, C.sound + 0.16, 3], 6: [C.some - 0.1, C.some + 0.2, 2], 7: [C.but2 - 0.1, C.but2 + 0.22, 1], 8: [C.similar - 0.12, C.similar + 0.18, 4] };

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
