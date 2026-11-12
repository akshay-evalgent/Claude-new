// "Why We Yawn" — procedural 3D short, rendered frame by frame.
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
  jaw: 0.18, lungs: 0.96, six: 2.3, stopit: 3.5, but: 4.38, oxygen: 5.74, yousee: 6.94, gave: 7.9, extra: 8.6, kept: 10.16,
  instead: 11.96, cool: 13.42, pumps: 14.24, which: 15.72, cools: 16.88, like: 18.0, thats: 19.3, hotter: 22.34,
  animals: 23.94, bigger: 24.82, longer: 25.96, strangest: 27.12, reading: 29.18, make: 30.64, so: 31.92, yawned: 32.66, end: 35.05,
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
// SHOTS
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.01, 200) }; build(s); shots.push(s); return s; }

// 0) "Your jaw drops" — face close-up
shot(0, C.lungs, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(3, 6, 5) });
  const p = makePerson(); sc.add(p);
  s.update = (t) => {
    const o = E.io(seg(t, C.jaw - 0.1, C.lungs + 0.3)); p.userData.yawn(o); p.userData.stretch(0.15 * o);
    const hp = V(0, 2.85, 0);
    setCam(s.cam, lv(V(0.45, 2.95, 2.5), V(0.38, 2.9, 2.15), seg(t, 0, C.lungs)), V(0, 2.8, 0.2), -3 + drift(t, 1.5), 36);
  };
});

// 1) "your lungs fill up" — x-ray chest
shot(C.lungs, C.six, (s) => {
  const sc = s.scene; sc.background = BG.xray;
  const xm = xrayMat(new THREE.Color(0.55, 0.85, 1.0), new THREE.Color(0.04, 0.16, 0.42), 2.0, 1.0);
  const p = makePerson({ override: xm, legs: false }); sc.add(p);
  const lungs = [-1, 1].map(sx => { const l = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), glow(0xff7aa8, 0.55)); l.position.set(sx * 0.19, 1.95, 0.02); sc.add(l); return l; });
  const trachea = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 2.72, 0.32), V(0, 2.5, 0.08), V(0, 2.25, 0.03)]), 30, 0.04, 10), glow(0x49e3ff, 0.7)); sc.add(trachea);
  const air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 8, 6), glow(0xd9fbff, 0.95), 50); sc.add(air);
  const path = new THREE.CatmullRomCurve3([V(0, 2.75, 0.6), V(0, 2.72, 0.32), V(0, 2.4, 0.06), V(-0.1, 2.05, 0.03), V(-0.2, 1.8, 0.03)]);
  const dummy = new THREE.Object3D();
  s.update = (t) => {
    const k = E.io(seg(t, C.lungs, C.six)); p.userData.yawn(1); p.userData.stretch(0.3);
    lungs.forEach(l => l.scale.set(0.2 * (1 + 0.35 * k), 0.33 * (1 + 0.25 * k), 0.24 * (1 + 0.3 * k)));
    for (let i = 0; i < 50; i++) { const u = ((i / 50) + t * 0.8) % 1; dummy.position.copy(path.getPoint(u)).add(V(i % 2 ? 0.2 * u : -0.0, 0, 0)); dummy.position.x *= (i % 2 ? -1 : 1); dummy.scale.setScalar(1); dummy.updateMatrix(); air.setMatrixAt(i, dummy.matrix); }
    air.instanceMatrix.needsUpdate = true;
    setCam(s.cam, lv(V(1.1, 2.6, 3.4), V(0.9, 2.45, 2.8), k), V(0, 2.2, 0), 4 + drift(t, 1.5), 38);
  };
});

// 2) "for about six seconds you can't really stop it" — full stretch, stopwatch
shot(C.six, C.but, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(3, 6, 5) });
  const p = makePerson(); sc.add(p);
  const sw = stopwatchProp(); sw.position.set(1.15, 3.2, 0.2); sw.rotation.y = -0.35; sc.add(sw);
  s.update = (t) => {
    p.userData.yawn(1 - E.io(seg(t, 3.9, 4.6))); p.userData.stretch(E.io(seg(t, C.six - 0.2, C.six + 0.5)) * (1 - E.io(seg(t, 3.9, 4.6))));
    p.rotation.y = -0.2;
    const secs = clamp((t - C.six) / (C.stopit + 0.32 - C.six)) * 6; sw.userData.tex.userData.draw(`${secs.toFixed(1)} SEC`);
    sw.rotation.z = 0.05 * Math.sin(t * 6);
    const c = seg(t, C.six, C.but + 0.2); setCam(s.cam, lv(V(1.4, 2.6, 6.6), V(1.2, 2.55, 5.9), c), V(0.35, 2.3, 0), 2 + drift(t, 1.5), 38);
  };
});

// 3) "But it's not because your body needs more oxygen" — O2 molecules
shot(C.but, C.yousee, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(-3, 6, 5) });
  const p = makePerson(); sc.add(p);
  const r = rng(51), mols = [];
  for (let i = 0; i < 24; i++) { const m = o2Molecule(); m.userData = { a: r() * 6.28, rad: 0.7 + r() * 1.2, y: 2.3 + r() * 1.4, sp: 0.4 + r() * 0.6, ph: r() * 6.28 }; sc.add(m); mols.push(m); }
  const lbl = textPlane('O₂', 0.8, '#ff3d4f'); lbl.position.set(0.95, 3.75, 0.4); sc.add(lbl);
  s.update = (t) => {
    p.userData.yawn(0); p.userData.setLid(0.15); p.userData.head.rotation.set(0, 0.25 * Math.sin((t - C.oxygen) * 4) * smooth(C.oxygen - 0.2, C.oxygen + 0.2, t) * (1 - smooth(6.4, 6.8, t)), 0);
    const crowd = smooth(C.oxygen - 0.5, C.oxygen + 0.3, t);
    mols.forEach((m, i) => { const d = m.userData; const ang = d.a + t * d.sp; const rad = Math.max(0.8, d.rad * (1 - 0.3 * crowd)); const side = Math.cos(ang) >= 0 ? 1 : -1; m.position.set(side * Math.max(0.72, Math.abs(Math.cos(ang)) * rad), d.y + 0.15 * Math.sin(t * 1.3 + d.ph) - 0.3 * crowd * (d.y - 2.9), -0.45 + Math.sin(ang) * 0.35); m.rotation.set(t + i, t * 0.7, 0); m.scale.setScalar(E.out(seg(t, C.but + i * 0.03, C.but + 0.4 + i * 0.03)) + 0.0001); });
    lbl.scale.setScalar(E.out(seg(t, C.but + 0.2, C.but + 0.6)) + 0.0001);
    const c = seg(t, C.but, C.yousee); setCam(s.cam, lv(V(0.6, 3.2, 5.8), V(0.4, 3.0, 4.6), E.io(c)), V(0, 2.95, 0), drift(t, 1.5), 38); lbl.lookAt(s.cam.position);
  };
});

// 4) Lab: oxygen mask and tank, still yawning, counter clicks up
shot(C.yousee, C.instead, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(3, 7, 5) });
  const p = makePerson({ shirt: 0xf3f6f8 }); sc.add(p);
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshPhysicalMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.45, roughness: 0.1, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }));
  mask.rotation.x = Math.PI / 2; mask.position.set(0, -0.15, 0.46); p.userData.head.add(mask);
  const tank = new THREE.Group(); tank.position.set(1.4, 0, -0.3); sc.add(tank);
  const tb = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.8, 12, 40), new THREE.MeshPhysicalMaterial({ color: 0x2fb35c, roughness: 0.3, clearcoat: 1 })); tb.position.y = 1.25; tb.castShadow = true; tank.add(tb);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.3, 24), M.chrome); cap.position.y = 2.6; tank.add(cap);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 24), new THREE.MeshPhysicalMaterial({ color: 0x1d2126, roughness: 0.4 })); knob.position.y = 2.78; tank.add(knob);
  const lab = textPlane('O₂', 0.62, '#ffffff', '#1f8a45'); lab.position.set(0, 1.5, 0.33); tank.add(lab);
  const gaugeTex = counterTex(['']); const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), new THREE.MeshBasicMaterial({ map: gaugeTex, toneMapped: false })); gauge.position.set(0, 2.45, 0.3); tank.add(gauge);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(1.35, 2.6, -0.1), V(1.0, 2.0, 0.5), V(0.45, 2.3, 0.65), V(0.1, 2.72, 0.62)]), 60, 0.035, 10), new THREE.MeshPhysicalMaterial({ color: 0xcfeff7, transparent: true, opacity: 0.7, roughness: 0.1 })); sc.add(tube);
  const ctr = new THREE.Group(); ctr.position.set(-1.2, 3.25, 0.3); ctr.rotation.y = 0.3; sc.add(ctr);
  const cbody = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.55, 0.25, 4, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x5c6cff, roughness: 0.3, clearcoat: 1 })); ctr.add(cbody);
  const ctex = counterTex(); const cscr = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.36), new THREE.MeshBasicMaterial({ map: ctex, toneMapped: false })); cscr.position.z = 0.13; ctr.add(cscr);
  const yawnTimes = [C.kept - 0.15, 10.95, 11.55];
  s.update = (t) => {
    const o = Math.max(...yawnTimes.map((y0, i) => yawnCurve(t, y0, i === 0 ? 1.0 : 0.75))); p.userData.yawn(o); p.userData.stretch(0.25 * o);
    const flow = smooth(C.gave, C.extra + 0.4, t); knob.rotation.y = flow * 4;
    const g = gaugeTex.image.getContext('2d'); g.fillStyle = '#fbfbf5'; g.fillRect(0, 0, 512, 256); g.lineWidth = 22; [['#2fb35c', Math.PI, Math.PI * 1.45], ['#ffc93c', Math.PI * 1.45, Math.PI * 1.7], ['#ff3d4f', Math.PI * 1.7, Math.PI * 2]].forEach(([c, a0, a1]) => { g.strokeStyle = c; g.beginPath(); g.ellipse(256, 170, 190, 130, 0, a0, a1); g.stroke(); }); g.strokeStyle = '#222'; g.lineWidth = 12; g.beginPath(); g.moveTo(256, 170); g.lineTo(256 + Math.cos(Math.PI * (1 - flow * 0.9)) * 170, 170 - Math.sin(Math.PI * (1 - flow * 0.9)) * 115); g.stroke(); g.fillStyle = '#222'; g.beginPath(); g.arc(256, 170, 16, 0, 7); g.fill(); gaugeTex.needsUpdate = true;
    const n = yawnTimes.filter(y0 => t > y0 + 0.2).length; ctex.userData.draw(`YAWNS ${n}`); ctr.visible = t > C.kept - 0.3; ctr.scale.setScalar(E.out(seg(t, C.kept - 0.3, C.kept)) + 0.0001);
    if (t < C.extra) { const c = seg(t, C.yousee, C.extra); setCam(s.cam, lv(V(1.8, 2.9, 6.6), V(1.5, 2.8, 5.8), c), V(0.3, 2.2, 0), drift(t, 1.5), 38); }
    else if (t < C.kept) { const c = seg(t, C.extra, C.kept); setCam(s.cam, V(1.4, 2.5, -0.3).add(lv(V(0.6, 0.15, 1.9), V(0.45, 0.1, 1.55), c)), V(1.4, 2.35, -0.3), -3 + drift(t, 1.5), 36); }
    else { const c = seg(t, C.kept, C.instead + 0.2); setCam(s.cam, lv(V(-0.6, 3.0, 3.6), V(-0.5, 2.95, 3.0), c), V(-0.35, 2.9, 0), 3 + drift(t, 1.5), 38); }
  };
});

// 5) X-ray head: cool air in, fresh blood up
shot(C.instead, C.which, (s) => {
  const sc = s.scene; sc.background = BG.xray;
  const xm = xrayMat(new THREE.Color(0.55, 0.85, 1.0), new THREE.Color(0.04, 0.16, 0.42), 2.0, 1.0);
  const p = makePerson({ override: xm, legs: false }); sc.add(p);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 20), glow(0xbfe6ff, 0.22)); skull.position.set(0, 2.98, -0.02); skull.scale.set(0.95, 1.05, 1.05); sc.add(skull);
  const brain = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 28), glow(0xff8fb8, 0.6)); brain.position.set(0, 3.05, -0.04); brain.scale.set(0.92, 0.75, 1.1); sc.add(brain);
  const airway = new THREE.CatmullRomCurve3([V(0, 2.72, 0.56), V(0, 2.72, 0.42), V(0, 2.6, 0.12), V(0, 2.35, 0.05), V(0, 2.0, 0.03)]);
  sc.add(new THREE.Mesh(new THREE.TubeGeometry(airway, 60, 0.05, 10), glow(0x49e3ff, 0.35)));
  const air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), glow(0x9fe8ff, 0.95), 60); sc.add(air);
  const arteries = [-1, 1].map(sx => new THREE.CatmullRomCurve3([V(sx * 0.08, 1.9, 0.05), V(sx * 0.11, 2.4, 0.06), V(sx * 0.14, 2.75, 0.02), V(sx * 0.12, 3.0, -0.05), V(sx * 0.05, 3.2, -0.05)]));
  const artM = pulseTubeMat(0xff2a3a, 0xffb0b0); artM.uniforms.k.value = 0.8; arteries.forEach(c => sc.add(new THREE.Mesh(new THREE.TubeGeometry(c, 80, 0.035, 10), artM)));
  const dummy = new THREE.Object3D();
  s.update = (t) => {
    p.userData.yawn(1); p.userData.stretch(0.2);
    const on = smooth(C.cool - 0.3, C.cool + 0.2, t);
    for (let i = 0; i < 60; i++) { const u = ((i / 60) + t * 0.7) % 1; dummy.position.copy(airway.getPoint(u)); dummy.scale.setScalar(on > 0.01 ? on : 0.0001); dummy.updateMatrix(); air.setMatrixAt(i, dummy.matrix); }
    air.instanceMatrix.needsUpdate = true;
    artM.uniforms.p.value = t >= C.pumps ? ((t - C.pumps) * 1.4) % 1.2 : -1; artM.uniforms.k.value = 0.35 + 0.6 * smooth(C.pumps - 0.2, C.pumps + 0.2, t);
    brain.material.opacity = 0.45 + 0.3 * smooth(C.pumps, 15.4, t);
    if (t < C.pumps) { const c = seg(t, C.instead, C.pumps); setCam(s.cam, lv(V(2.4, 3.0, 2.4), V(1.9, 2.9, 1.9), E.io(c)), V(0, 2.75, 0.2), -3 + drift(t, 1.5), 38); }
    else { const c = seg(t, C.pumps, C.which + 0.2); setCam(s.cam, lv(V(-1.6, 2.6, 2.4), V(-1.3, 2.75, 2.0), c), V(0, 2.7, 0), 3 + drift(t, 1.5), 38); }
  };
});

// 6) The brain cools down like a radiator
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
shot(C.which, C.thats, (s) => {
  const sc = s.scene; studio(sc, { ground: -0.95, keyPos: V(3, 6, 5), shadow: 0.2 });
  const brain = makeBrain(); sc.add(brain);
  const heat = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), glow(0xff8a3a, 0.8), 40); sc.add(heat);
  const rad = new THREE.Group(); rad.position.set(-2.5, 0, 0); rad.rotation.y = 0.5; sc.add(rad);
  const frameM = new THREE.MeshPhysicalMaterial({ color: 0x2b3038, roughness: 0.4, metalness: 0.6 });
  [[0, 0.95, 1.7, 0.12], [0, -0.95, 1.7, 0.12], [0.85, 0, 0.12, 2.0], [-0.85, 0, 0.12, 2.0]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), frameM); b.position.set(x, y, 0); rad.add(b); });
  for (let i = 0; i < 18; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.8, 0.22), M.chrome); f.position.set(-0.78 + i * 0.092, 0, 0); rad.add(f); }
  const fan = new THREE.Group(); fan.position.set(0, 0, -0.25); rad.add(fan);
  for (let i = 0; i < 5; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.02), frameM); bl.position.y = 0.35; const hold = new THREE.Group(); hold.rotation.z = i / 5 * Math.PI * 2; hold.add(bl); bl.rotation.y = 0.4; fan.add(hold); }
  const cool = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), glow(0x6fe0ff, 0.9), 70); sc.add(cool);
  const dummy = new THREE.Object3D(), hr = rng(8), H = []; for (let i = 0; i < 40; i++) H.push({ x: (hr() - 0.5) * 1.6, z: (hr() - 0.5) * 1.6, o: hr() });
  s.update = (t) => {
    const k = E.io(seg(t, C.cools - 0.2, C.like + 0.9));
    brain.material.color.lerpColors(new THREE.Color(0xff5a3a), new THREE.Color(0x5ab8ff), k); brain.material.emissive.lerpColors(new THREE.Color(0x6a1200), new THREE.Color(0x00264a), k);
    brain.rotation.y = 0.4 * Math.sin(t * 0.5); brain.position.y = 0.05 * Math.sin(t * 1.4);
    for (let i = 0; i < 40; i++) { const q = H[i], a = ((t * 0.6 + q.o) % 1); dummy.position.set(q.x, 0.6 + a * 1.4, q.z); dummy.scale.setScalar(Math.max((1 - k) * Math.sin(Math.PI * a), 0.0001)); dummy.updateMatrix(); heat.setMatrixAt(i, dummy.matrix); }
    heat.instanceMatrix.needsUpdate = true;
    fan.rotation.z = -t * 9; const flow = smooth(C.like - 0.3, C.like + 0.2, t);
    for (let i = 0; i < 70; i++) { const a = ((t * 0.8 + i / 70) % 1); const yy = ((i * 37) % 13) / 13 - 0.5; dummy.position.set(lerp(-2.3, -0.4, a), yy * 1.2 * (1 - a * 0.5), lerp(0.1, 0.4, a) + Math.sin(a * 6 + i) * 0.05); dummy.scale.setScalar(Math.max(flow * Math.sin(Math.PI * a), 0.0001)); dummy.updateMatrix(); cool.setMatrixAt(i, dummy.matrix); }
    cool.instanceMatrix.needsUpdate = true;
    if (t < C.like) { const c = seg(t, C.which, C.like); setCam(s.cam, lv(V(1.2, 0.9, 3.6), V(0.9, 0.75, 3.0), c), V(0, 0.05, 0), -3 + drift(t, 1.5), 38); }
    else { const c = seg(t, C.like, C.thats + 0.2); setCam(s.cam, lv(V(-0.4, 1.3, 6.4), V(-0.5, 1.2, 5.8), c), V(-1.1, 0.1, 0), 2 + drift(t, 1.5), 38); }
  };
});

// 7) Hot outside: no yawn, thermometer passes body temperature
shot(C.thats, C.animals, (s) => {
  const sc = s.scene; studio(sc, { bg: 'storm', ground: null, keyPos: V(2, 8, 4), key: 3.4 });
  sc.background = gradTex([[0, '#fff6c8'], [0.25, '#ffd27a'], [0.6, '#ff9a3c'], [1, '#e2622a']], 0.5, 0.25);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0xf0c27a, roughness: 0.95 })); sand.rotation.x = -Math.PI / 2; sand.receiveShadow = true; sc.add(sand);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.2, 40, 28), new THREE.MeshBasicMaterial({ color: 0xfff0a0 })); sun.position.set(-1.6, 7.2, -8); sc.add(sun);
  const p = makePerson({ shirt: 0xff6f61 }); sc.add(p);
  const sweat = [0, 1, 2].map(() => { const d = dropMesh(0.04, M.water); sc.add(d); return d; });
  const th = new THREE.Group(); th.position.set(1.35, 0, 0.3); sc.add(th);
  const glass = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 2.6, 12, 30), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1, depthWrite: false })); glass.position.y = 1.9; th.add(glass);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xff2a2a, emissive: 0x700000, roughness: 0.2, clearcoat: 1 })); bulb.position.y = 0.45; th.add(bulb);
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 20), bulb.material); th.add(liquid);
  for (let i = 0; i < 12; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(i % 3 ? 0.08 : 0.16, 0.02, 0.02), M.black); tk.position.set(0.2, 0.9 + i * 0.2, 0.08); th.add(tk); }
  const bodyLine = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.035, 0.04), new THREE.MeshBasicMaterial({ color: 0x1a7cff })); bodyLine.position.set(0, 2.1, 0.1); th.add(bodyLine);
  const bodyLbl = textPlane('BODY 98.6°F', 0.56, '#1a7cff'); bodyLbl.position.set(0.48, 2.1, 0.15); th.add(bodyLbl);
  const hotLbl = textPlane('104°F', 0.5, '#ff2a2a'); th.add(hotLbl);
  s.update = (t) => {
    p.userData.yawn(0.22 * yawnCurve(t, 20.0, 0.9)); p.userData.setLid(0.35); p.rotation.y = 0.15;
    const level = lerp(1.2, 2.55, E.io(seg(t, C.thats + 0.3, C.hotter + 0.5))); liquid.scale.y = level - 0.5; liquid.position.y = 0.5 + (level - 0.5) / 2;
    hotLbl.position.set(-0.48, level + 0.05, 0.15); hotLbl.scale.setScalar(E.out(seg(t, C.hotter + 0.2, C.hotter + 0.6)) + 0.0001);
    p.updateMatrixWorld(true); sweat.forEach((d, i) => { const a = ((t * 0.9 + i / 3) % 1); d.position.copy(worldOf(p.userData.head, V((i - 1) * 0.18, 0.25 - a * 0.6, 0.42))); d.scale.set(0.8, 1.2, 0.8); });
    if (t < C.hotter) { const c = seg(t, C.thats, C.hotter); setCam(s.cam, lv(V(0.6, 2.4, 7.4), V(0.5, 2.4, 6.6), c), V(0.45, 2.1, 0), drift(t, 1.5), 38); }
    else { const c = seg(t, C.hotter, C.animals + 0.2); setCam(s.cam, V(1.35, 2.35, 0.3).add(lv(V(0.3, 0.25, 4.6), V(0.22, 0.2, 4.0), c)), V(1.35, 2.35, 0.3), -3 + drift(t, 1.5), 38); }
    bodyLbl.lookAt(s.cam.position); hotLbl.lookAt(s.cam.position);
  };
});

// 8) Mouse vs lion: bigger brain, longer yawn
shot(C.animals, C.strangest, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(3, 7, 5) });
  const lion = makeCat({ pose: 'sit', base: '#d9a04c', stripe: '#c08a3c', seed: 21, stripes: false }); lion.userData.s = 1.35; lion.scale.setScalar(1.35); lion.position.set(-0.75, 0, 0); sc.add(lion);
  const maneM = furMat('#8b4a1c', '#6d3612', 22, false); const mane = new THREE.Group(); lion.userData.head.add(mane);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), maneM); b.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.58 - 0.05, -0.12); b.castShadow = true; mane.add(b); }
  const mouse = new THREE.Group(); mouse.position.set(1.35, 0, 0.7); mouse.rotation.y = -0.3; mouse.scale.setScalar(1.9); sc.add(mouse);
  const mfur = furMat('#a7adb6', '#8d939b', 23, false), mpink = PINK;
  const mb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 20), mfur); mb.scale.set(0.9, 0.8, 1.25); mb.position.set(0, 0.25, -0.1); mouse.add(mb);
  const mh = new THREE.Group(); mh.position.set(0, 0.38, 0.22); mouse.add(mh);
  const mhs = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 20), mfur); mhs.scale.set(1, 0.95, 1.2); mh.add(mhs);
  [-1, 1].forEach(sx => { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 28), mfur); e.rotation.x = Math.PI / 2; e.position.set(sx * 0.15, 0.16, -0.04); mh.add(e); const ei = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.032, 28), mpink); ei.rotation.x = Math.PI / 2; ei.position.set(sx * 0.15, 0.16, -0.025); mh.add(ei); const ey = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), M.black); ey.position.set(sx * 0.08, 0.05, 0.17); mh.add(ey); });
  const mn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), mpink); mn.position.set(0, -0.0, 0.24); mh.add(mn);
  const mcav = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshPhysicalMaterial({ color: 0x4a0f18 })); mcav.position.set(0, -0.08, 0.17); mh.add(mcav);
  const mtail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.15, -0.45), V(0.25, 0.05, -0.7), V(0.5, 0.03, -0.55)]), 30, 0.02, 8), mpink); mouse.add(mtail);
  mouse.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const bar = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); sc.add(g); const bg = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.16, 0.06, 3, 0.05), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4 })); g.add(bg); const fill = new THREE.Mesh(new RoundedBoxGeometry(1.44, 0.11, 0.07, 3, 0.04), new THREE.MeshBasicMaterial({ color: 0xff4fa3, toneMapped: false })); fill.position.z = 0.01; g.add(fill); g.userData.set = (k) => { fill.scale.x = Math.max(k, 0.001); fill.position.x = -0.72 * (1 - k); }; return g; };
  const lb = bar(-0.75, 3.75, 0.2), mbar = bar(1.35, 1.75, 0.7); mbar.scale.setScalar(0.6);
  const LY = [24.2, 27.4], MY = [24.15, 24.75];
  s.update = (t) => {
    const lo = yawnCurve(t, LY[0], LY[1] - LY[0]), mo = yawnCurve(t, MY[0], MY[1] - MY[0]);
    lion.userData.setMouth(lo); lion.userData.setLid(lerp(0.15, 0.85, lo)); lion.userData.head.rotation.x = -0.3 * lo;
    mcav.scale.set(0.06, 0.005 + 0.06 * mo, 0.03); mcav.visible = mo > 0.02; mh.rotation.x = -0.3 * mo;
    lb.userData.set(clamp((t - LY[0]) / (LY[1] - LY[0]))); mbar.userData.set(clamp((t - MY[0]) / (LY[1] - LY[0])) * (t < MY[1] ? 1 : 0) + (t >= MY[1] ? (MY[1] - MY[0]) / (LY[1] - LY[0]) : 0));
    if (t < C.longer) { const c = seg(t, C.animals, C.longer); setCam(s.cam, lv(V(0.5, 2.7, 9.6), V(0.45, 2.6, 8.8), c), V(0.3, 2.05, 0), drift(t, 1.5), 40); }
    else { const c = seg(t, C.longer, C.strangest + 0.2); setCam(s.cam, lv(V(0.2, 3.1, 4.4), V(0.0, 3.05, 3.8), c), V(-0.75, 2.75, 0.2), -3 + drift(t, 1.5), 38); }
    [lb, mbar].forEach(b => b.lookAt(s.cam.position));
  };
});

// 9) Bedtime: reading about yawning on a phone
function phoneTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 1024; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.userData.draw = (scroll) => {
    const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 1024);
    g.save(); g.translate(0, -scroll);
    g.fillStyle = '#111'; g.font = 'bold 64px Arial, sans-serif'; g.fillText('Why Do', 36, 140); g.fillText('We Yawn?', 36, 214);
    const words = 'A yawn is a long deep breath with your mouth wide open. Seeing someone yawn, hearing a yawn, or even reading the word yawn can make you yawn too. Yawn. Yawn. Yawn.'.split(' ');
    g.font = '34px Arial, sans-serif'; let x = 36, y = 300;
    for (const w of words) { const ww = g.measureText(w + ' ').width; if (x + ww > 480) { x = 36; y += 50; } g.fillStyle = /yawn/i.test(w) ? '#ff2d7a' : '#333'; g.fillText(w, x, y); x += ww; }
    g.restore(); t.needsUpdate = true;
  };
  return t;
}
shot(C.strangest, C.so, (s) => {
  const sc = s.scene; sc.background = BG.xray; sc.environment = ENV;
  sc.add(new THREE.HemisphereLight(0x6f86c9, 0x1b2240, 0.6));
  const moon = new THREE.DirectionalLight(0x9db6ff, 0.6); moon.position.set(-3, 5, 2); sc.add(moon);
  const phoneL = new THREE.PointLight(0xcfe6ff, 6, 4, 1.5); sc.add(phoneL);
  const bed = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.5, 4.6, 6, 0.2), new THREE.MeshPhysicalMaterial({ color: 0xe8eefc, roughness: 0.8 })); bed.position.set(0, 0.9, -0.6); sc.add(bed);
  const pillow = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.35, 0.8, 6, 0.16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.8, sheen: 1 })); pillow.position.set(0, 1.35, -2.25); pillow.rotation.x = 0.6; sc.add(pillow);
  const p = makePerson({ shirt: 0x6a5acd, legs: false }); p.position.set(0, -0.55, -1.75); p.rotation.x = -0.35; sc.add(p);
  const blanket = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.45, 2.8, 6, 0.2), new THREE.MeshPhysicalMaterial({ color: 0x4c6ef5, roughness: 0.85, sheen: 1 })); blanket.position.set(0, 1.2, 0.25); sc.add(blanket);
  const phone = new THREE.Group(); phone.position.set(0, 2.25, -0.55); phone.rotation.x = -0.25; sc.add(phone);
  phone.add(new THREE.Mesh(new RoundedBoxGeometry(0.62, 1.2, 0.07, 4, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x15171c, roughness: 0.3, clearcoat: 1 })));
  const ptex = phoneTex(); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 1.12), new THREE.MeshBasicMaterial({ map: ptex, toneMapped: false })); scr.position.z = -0.037; scr.rotation.y = Math.PI; phone.add(scr);
  const scrFront = scr.clone(); scrFront.position.z = 0.037; scrFront.rotation.y = 0; phone.add(scrFront);
  p.updateMatrixWorld(true); const headW = worldOf(p.userData.head, V(0, 0, 0)); phone.position.copy(headW).add(V(0.05, -0.05, 1.6)); phone.lookAt(headW); phone.rotateY(Math.PI);
  s.update = (t) => {
    ptex.userData.draw(Math.max(0, (t - C.reading) * 60));
    phoneL.position.copy(phone.position).add(V(0, 0, -0.4));
    const o = yawnCurve(t, C.make - 0.05, 2.0); p.userData.yawn(o); p.userData.setLid(o > 0.03 ? lerp(0.1, 0.95, o) : 0.3);
    p.userData.arms.forEach(a => { a.sh.rotation.set(-1.35, 0, a.sx * 0.35); a.el.rotation.set(-0.9, 0, a.sx * 0.3); });
    if (t < C.reading) { const c = seg(t, C.strangest, C.reading); setCam(s.cam, headW.clone().add(lv(V(2.6, 0.9, 1.5), V(2.2, 0.8, 1.3), c)), headW.clone().add(V(0, -0.1, 0.5)), 3 + drift(t, 1.5), 40); }
    else if (t < C.make) { const c = seg(t, C.reading, C.make); const eyeP = headW.clone().lerp(phone.position, 0.36).add(V(0.02, 0.06, 0)); setCam(s.cam, lv(eyeP, eyeP.clone().lerp(phone.position, 0.12), c), phone.position.clone().add(V(0, 0.1, 0)), drift(t, 1.2), 40); }
    else { const c = seg(t, C.make, C.so + 0.2); setCam(s.cam, headW.clone().add(lv(V(2.1, 0.45, 1.4), V(1.85, 0.4, 1.2), c)), headW.clone().add(V(0, -0.2, 0.25)), -2 + drift(t, 1.5), 38); }
  };
});

// 10) Payoff: the character yawns straight into the lens
shot(C.so, C.end + 0.2, (s) => {
  const sc = s.scene; studio(sc, { ground: 0, keyPos: V(2, 6, 6) });
  const p = makePerson(); sc.add(p);
  s.update = (t) => {
    const o = E.io(seg(t, C.so + 0.1, C.yawned + 0.5)); p.userData.yawn(o); p.userData.stretch(0.85 * E.io(seg(t, C.so + 0.4, 33.6))); p.userData.head.rotation.x = -0.12 * o;
    const c = seg(t, C.so, C.end); setCam(s.cam, lv(V(0.0, 2.7, 3.0), V(0.0, 2.72, 1.55), E.io(c)), V(0, 2.75, 0), drift(t, 1.2), 38);
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
const TR = { 3: [C.but - 0.1, C.but + 0.22, 1], 4: [C.yousee - 0.12, C.yousee + 0.18, 4], 5: [C.instead - 0.14, C.instead + 0.16, 3], 7: [C.thats - 0.1, C.thats + 0.2, 2], 8: [C.animals - 0.1, C.animals + 0.22, 1], 9: [C.strangest - 0.12, C.strangest + 0.18, 4] };

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
