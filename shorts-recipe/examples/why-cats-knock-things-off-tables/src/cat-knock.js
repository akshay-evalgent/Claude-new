// "Why Cats Knock Things Off Tables" — procedural 3D short, rendered frame by frame.
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
  cat: 0.22, looks: 0.48, dead: 0.94, eye: 1.5, and0: 1.8, slowly: 2.08, pushes: 2.44, your: 2.96, glass: 3.22, off: 3.56, table: 4.0, yousee: 4.76,
  cats: 5.38, hunters: 5.84, and1: 6.2, test: 6.76, things: 7.04, paws: 7.86, tapping: 8.48, them: 8.76, see: 9.22, run: 9.74, so: 10.58, when: 10.76,
  glass2: 11.06, falls: 11.38, that: 12.0, sudden: 12.12, movement: 12.48, fires: 12.94, same: 13.72, instinct: 13.96, chasing: 14.82, prey: 15.28,
  but: 16.1, another: 16.54, reason: 16.76, the: 17.76, first: 17.88, crashed: 18.54, you: 19.14, gasped: 19.3, came: 19.96, running: 20.2, and2: 20.54,
  learned: 21.34, fastest: 22.02, way: 22.42, get: 23.02, attention: 23.32, in1: 24.32, study: 24.72, half: 25.32, cats2: 25.78, picked: 26.06,
  time: 26.32, human: 27.1, over: 27.38, food: 27.68, toys: 28.3, so2: 29.04, more: 29.52, react: 29.88, the2: 30.66, often: 30.98, end: 31.6,
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
      hand, fingers, th, th2, sx,
      finger(j, k) { const f = fingers[j]; f.f1.rotation.set(0, 0, -sx * (0.12 + 1.5 * k)); f.f2.rotation.set(0, 0, -sx * (0.12 + 1.55 * k)); },
      curl(k, spread = 0) {
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
// THE CAT: four IK legs, three body poses that blend (sit / crouch / stand),
// a head that can hold eye contact, pupils that open from slits to circles
// =====================================================================
function solve2(S, T, pole, l1, l2) {
  const D = T.clone().sub(S); const d = clamp(D.length(), Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.999); const dir = D.normalize();
  const a1 = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const pp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))); if (pp.lengthSq() < 1e-8) pp.set(0, 0, 1); pp.normalize();
  const El = S.clone().add(dir.clone().multiplyScalar(Math.cos(a1)).add(pp.multiplyScalar(Math.sin(a1))).multiplyScalar(l1));
  const u1 = El.clone().sub(S).normalize(), u2 = S.clone().add(dir.multiplyScalar(d)).sub(El).normalize(), down = V(0, -1, 0);
  return { q1: new THREE.Quaternion().setFromUnitVectors(down, u1), q2: new THREE.Quaternion().setFromUnitVectors(down, u2) };
}
function catEyeMat(irisA = 0xf4ff8c, irisB = 0x6aa828) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
  const U = { uP: { value: 0.15 }, uGlow: { value: 0.0 }, uA: { value: new THREE.Color(irisA) }, uB: { value: new THREE.Color(irisB) } };
  m.userData.U = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = normalize(position);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; uniform float uP; uniform float uGlow; uniform vec3 uA; uniform vec3 uB;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 en = normalize(vOP); vec2 eq = en.xy / 0.8; float er = length(eq); float eang = atan(eq.y, eq.x);
        float streak = 0.5 + 0.5 * sin(eang * 36.0 + sin(eang * 7.0) * 2.0);
        vec3 iris = mix(uA, uB, smoothstep(0.1, 0.95, er)) * (0.82 + 0.3 * streak * smoothstep(0.2, 0.9, er));
        iris = mix(iris, vec3(0.03, 0.05, 0.01), smoothstep(0.84, 1.0, er));
        vec2 pq = eq / vec2(mix(0.085, 0.74, uP), mix(0.78, 0.76, uP)); float pm = 1.0 - smoothstep(0.9, 1.08, length(pq));
        vec3 ec = mix(iris, vec3(0.004), pm);
        ec = mix(ec, vec3(0.05, 0.045, 0.03), smoothstep(1.0, 1.05, er));
        ec = mix(vec3(0.05, 0.045, 0.03), ec, step(0.0, en.z));
        diffuseColor.rgb = ec; float irisMask = (1.0 - pm) * (1.0 - smoothstep(0.84, 1.0, er)) * step(0.0, en.z);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += iris * irisMask * (0.1 + uGlow);');
  };
  return m;
}
// shell fur: thin layers of fine strands pushed out along the normal and combed over,
// each layer sparser than the last. Lambert shading keeps the layers cheap.
function furShellMat(src, h, len, freq, comb, short) {
  const m = new THREE.MeshLambertMaterial({ map: src.map, color: src.color, transparent: true, depthWrite: false });
  const U = { uH: { value: h }, uLen: { value: len }, uFreq: { value: freq }, uComb: { value: comb }, uShort: { value: short } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uH; uniform float uLen; uniform vec3 uComb; uniform vec4 uShort; varying vec3 vBP;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vBP = position; vec3 fnn = normalize(normal);
        float lenK = uShort.w > 0.0 ? mix(0.16, 1.0, smoothstep(uShort.w * 0.55, uShort.w, distance(position, uShort.xyz))) : 1.0;
        vec3 cmb = uComb - fnn * dot(uComb, fnn);
        transformed += (fnn * uH + cmb * 1.15 * uH * uH) * uLen * lenK;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uH; uniform float uFreq; varying vec3 vBP;
      float fh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float fvn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(fh(i), fh(i + vec3(1,0,0)), f.x), mix(fh(i + vec3(0,1,0)), fh(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(fh(i + vec3(0,0,1)), fh(i + vec3(1,0,1)), f.x), mix(fh(i + vec3(0,1,1)), fh(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <map_fragment>', `vec3 fp = vBP * uFreq; fp = vec3(fp.x * 0.8 + fp.z * 0.6, fp.y, fp.z * 0.8 - fp.x * 0.6);
        float strand = fvn(fp) * 0.62 + fvn(fp * 2.3 + 7.0) * 0.38;
        float fa = smoothstep(0.3 + 0.36 * uH, 0.5 + 0.36 * uH, strand) * (1.0 - 0.3 * uH);
        if (fa < 0.03) discard;
        #include <map_fragment>
        diffuseColor.rgb *= mix(0.93, 1.07, uH) * (0.96 + 0.08 * strand); diffuseColor.a *= fa;`);
  };
  return m;
}
const FUR_LAYERS = +(new URLSearchParams(location.search).get('fur') ?? 6);
function addFur(mesh, lenW = 0.07, { freq = 150, comb = V(0, -1, 0), short = new THREE.Vector4(0, 0, 0, 0) } = {}) {
  const s = (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3 || 1; const shells = [];
  for (let i = 0; i < FUR_LAYERS; i++) { const sh = new THREE.Mesh(mesh.geometry, furShellMat(mesh.material, (i + 1) / FUR_LAYERS, lenW / s, freq * s, comb, short)); sh.castShadow = false; sh.receiveShadow = true; mesh.add(sh); shells.push(sh); }
  mesh.userData.shells = shells; return mesh;
}
const CATCFG = {
  //        x  y     z     sx    sy    sz    rx
  sit:    { hips: [0, 0.5, -0.28, 0.6, 0.52, 0.72, 0], torso: [0, 1.0, -0.06, 0.5, 0.82, 0.56, 0.22], bib: [0, 1.05, 0.24, 0.36, 0.47, 0.29, 0], neck: [0, 1.5, 0.08, 0.36, 0.34, 0.36, 0], head: [0, 1.84, 0.12], sh: [0.2, 1.08, 0.26], hj: [0.3, 0.5, -0.3], th: [0.38, 0.44, -0.12, 0.37, 0.44, 0.52, 0], tail: [0, 0.3, -0.92], fp: [0.17, 0.03, 0.4], hp: [0.41, 0.03, 0.14] },
  crouch: { hips: [0, 0.52, -0.55, 0.56, 0.46, 0.6, 0], torso: [0, 0.52, 0.0, 0.5, 0.74, 0.48, 1.45], bib: [0, 0.42, 0.44, 0.34, 0.3, 0.3, 0], neck: [0, 0.62, 0.52, 0.34, 0.3, 0.36, 0], head: [0, 0.8, 0.8], sh: [0.22, 0.62, 0.42], hj: [0.3, 0.52, -0.55], th: [0.36, 0.42, -0.5, 0.32, 0.38, 0.44, 0], tail: [0, 0.5, -1.12], fp: [0.2, 0.03, 0.92], hp: [0.36, 0.03, -0.3] },
  stand:  { hips: [0, 1.0, -0.5, 0.5, 0.44, 0.55, 0], torso: [0, 1.0, -0.02, 0.46, 0.74, 0.46, 1.5], bib: [0, 0.9, 0.44, 0.33, 0.34, 0.3, 0], neck: [0, 1.15, 0.52, 0.32, 0.3, 0.34, 0], head: [0, 1.46, 0.74], sh: [0.2, 0.98, 0.38], hj: [0.24, 0.98, -0.52], th: [0.25, 0.82, -0.5, 0.24, 0.36, 0.3, 0], tail: [0, 1.12, -1.02], fp: [0.2, 0.03, 0.4], hp: [0.24, 0.03, -0.52] },
};
function makeCat2({ base = '#e58a3a', stripe = '#a24e18', seed = 1, xray = false } = {}) {
  const X = xray ? XM() : null;
  const fur = X || furMat(base, stripe, seed, true), white = X || WHITE_FUR(), pink = X || PINK, dark = X || DARK;
  const furLeg = X || furMat(base, stripe, seed + 3, false);
  if (!X) { fur.sheenRoughness = 0.35; fur.bumpScale = 1.6; white.sheenRoughness = 0.35; furLeg.sheenRoughness = 0.35; }
  const F = (m, len, o) => X ? m : addFur(m, len, o);
  const cat = new THREE.Group();
  const add = (m, p, parent = cat) => { if (!X) { m.castShadow = true; m.receiveShadow = true; } if (p) m.position.copy(p); parent.add(m); return m; };
  const sph = (r, mat, seg = 40) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.66)), mat);
  const hips = add(sph(1, fur, 48)), torso = add(sph(1, fur, 56)), bib = add(sph(1, white, 40)), neck = add(sph(1, fur, 32));
  const thighs = [-1, 1].map(() => add(sph(1, fur, 36)));
  if (!X) { [hips, torso, neck, ...thighs].forEach(m => { m.scale.setScalar(0.55); addFur(m, 0.075, { comb: V(0, -1, -0.25).normalize() }); }); bib.scale.setScalar(0.38); addFur(bib, 0.09, { comb: V(0, -1, 0.15).normalize() }); }
  // ---- legs: 0 front-left (-x), 1 front-right (+x), 2 hind-left, 3 hind-right
  const mkLeg = (front, sx) => {
    const l1 = front ? 0.56 : 0.52, l2 = front ? 0.52 : 0.5;
    const up = new THREE.Group(); cat.add(up);
    F(add(new THREE.Mesh(new THREE.CapsuleGeometry(front ? 0.15 : 0.165, l1 - 0.1, 8, 24), furLeg), V(0, -l1 / 2, 0), up), 0.05);
    const lo = new THREE.Group(); lo.position.set(0, -l1, 0); up.add(lo);
    F(add(new THREE.Mesh(new THREE.CapsuleGeometry(front ? 0.128 : 0.115, l2 - 0.06, 8, 24), furLeg), V(0, -l2 / 2, 0), lo), 0.04);
    const paw = new THREE.Group(); paw.position.set(0, -l2, 0); lo.add(paw);
    const pmesh = add(sph(1, white, 28), V(0, 0.055, 0.045), paw); pmesh.scale.set(0.15, 0.1, 0.19); F(pmesh, 0.022, { freq: 200, comb: V(0, -0.3, 1).normalize() });
    [-1.5, -0.5, 0.5, 1.5].forEach(k => add(sph(0.052, white, 16), V(k * 0.058, 0.03, 0.2 - Math.abs(k) * 0.022), paw).scale.set(1, 0.85, 1.25));
    add(sph(1, pink, 20), V(0, -0.028, 0.03), paw).scale.set(0.078, 0.022, 0.066);
    [-1.5, -0.5, 0.5, 1.5].forEach(k => add(sph(1, pink, 12), V(k * 0.056, -0.012, 0.185 - Math.abs(k) * 0.022), paw).scale.set(0.03, 0.02, 0.038));
    return { up, lo, paw, l1, l2, front, sx, T: V(0, 0, 0), pitch: 0 };
  };
  const legs = [mkLeg(true, -1), mkLeg(true, 1), mkLeg(false, -1), mkLeg(false, 1)];
  // ---- head
  const head = new THREE.Group(); head.rotation.order = 'YXZ'; cat.add(head);
  F(add(sph(0.55, fur, 56), null, head), 0.065, { comb: V(0, -0.45, -0.9).normalize(), short: new THREE.Vector4(0, 0.0, 0.52, 0.5) }).scale.set(1.15, 0.95, 1.0);
  [-1, 1].forEach(sx => F(add(sph(0.22, fur, 32), V(sx * 0.35, -0.2, 0.16), head), 0.075, { comb: V(sx * 0.7, -0.7, -0.2).normalize() }).scale.set(1, 0.7, 0.9));
  [-1, 1].forEach(sx => F(add(sph(0.2, white), V(sx * 0.13, -0.16, 0.42), head), 0.016, { freq: 220, comb: V(sx * 0.8, -0.6, 0).normalize() }).scale.set(1, 0.85, 0.9));
  F(add(sph(0.12, white), V(0, -0.3, 0.38), head), 0.02, { freq: 220 });
  add(sph(1, pink, 24), V(0, -0.05, 0.57), head).scale.set(0.075, 0.05, 0.05);
  [-1, 1].forEach(sx => { const m = add(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 8, 20, Math.PI), dark), V(sx * 0.055, -0.13, 0.602), head); m.rotation.z = Math.PI; });
  const eyeM = X || catEyeMat(); const eyes = [], lids = [], lows = [], ears = [], wh = [], glints = [];
  [-1, 1].forEach(sx => {
    const EP = V(sx * 0.22, 0.08, 0.42);
    const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 48, 32), eyeM), EP, head); e.rotation.order = 'YXZ'; e.rotation.y = sx * 0.18; e.userData.ry = sx * 0.18; e.castShadow = false; eyes.push(e);
    const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.0105, 8, 36), dark), EP.clone().add(V(sx * 0.018, 0, 0.098)), head); rim.rotation.y = sx * 0.18; rim.castShadow = false;
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); gl.position.set(sx * 0.22 - 0.04, 0.135, 0.553); head.add(gl); glints.push(gl); gl.visible = !X;
    const lid = add(new THREE.Mesh(new THREE.SphereGeometry(0.149, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), furLeg), EP, head); lid.rotation.y = sx * 0.18; lid.rotation.order = 'YXZ'; lids.push(lid); F(lid, 0.018, { freq: 230, comb: V(0, -1, 0.3).normalize() });
    const lash = new THREE.Mesh(new THREE.TorusGeometry(0.151, 0.009, 6, 30, Math.PI), dark); lash.rotation.x = Math.PI / 2; lid.add(lash);
    const low = add(new THREE.Mesh(new THREE.SphereGeometry(0.147, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), furLeg), EP, head); low.rotation.order = 'YXZ'; low.rotation.y = sx * 0.18; lows.push(low); F(low, 0.015, { freq: 230 });
    const ear = new THREE.Group(); ear.position.set(sx * 0.34, 0.38, -0.06); head.add(ear);
    F(add(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 32), fur), V(0, 0.2, 0), ear), 0.025, { freq: 200, comb: V(0, 1, 0) }).scale.z = 0.5;
    add(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.31, 32), pink), V(0, 0.15, 0.047), ear).scale.z = 0.35;
    [-1, 1].forEach(k => { const tf = add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 8), white), V(k * 0.05, 0.1, 0.07), ear); tf.rotation.z = -k * 0.3; tf.castShadow = false; });
    ears.push(ear);
    const wg = new THREE.Group(); wg.position.set(sx * 0.2, -0.17, 0.47); head.add(wg); wh.push(wg);
    for (let k = 0; k < 4; k++) { const g = new THREE.CylinderGeometry(0.0025, 0.007, 0.6 - k * 0.04, 6); g.translate(0, (0.6 - k * 0.04) / 2, 0); const w = new THREE.Mesh(g, X || new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6) })); w.rotation.z = -sx * (Math.PI / 2 + (k - 1.3) * 0.17); w.rotation.y = -sx * 0.12 * (k - 1.5); wg.add(w); }
    for (let k = 0; k < 2; k++) { const g = new THREE.CylinderGeometry(0.002, 0.005, 0.26, 6); g.translate(0, 0.13, 0); const w = new THREE.Mesh(g, X || new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.4) })); w.position.set(sx * (0.2 + k * 0.05), 0.24, 0.44); w.rotation.set(-0.5, 0, -sx * (0.25 + k * 0.3)); head.add(w); }
  });
  // ---- tail (rebuilt each frame)
  const tailM = new THREE.Mesh(new THREE.BufferGeometry(), fur); if (!X) { tailM.castShadow = true; addFur(tailM, 0.065, { comb: V(0, 0, 0) }); } cat.add(tailM);
  const tailTip = add(sph(0.056, fur, 16));
  const mix = (a, b, c, w) => a.map((v, i) => v * w.sit + b[i] * w.crouch + c[i] * w.stand);
  let cfg = null;
  const place = (m, a) => { m.position.set(a[0], a[1], a[2]); m.scale.set(a[3], a[4], a[5]); m.rotation.set(a[6] || 0, 0, 0); };
  const api = {
    head, eyes, lids, ears, legs, hips, torso, eyeM, fur,
    // body pose: weights for sit / crouch / stand (they should sum to 1)
    pose(w = { sit: 1, crouch: 0, stand: 0 }) {
      const W_ = { sit: w.sit || 0, crouch: w.crouch || 0, stand: w.stand || 0 }; cfg = {}; Object.keys(CATCFG.sit).forEach(k => cfg[k] = mix(CATCFG.sit[k], CATCFG.crouch[k], CATCFG.stand[k], W_));
      place(hips, cfg.hips); place(torso, cfg.torso); place(bib, cfg.bib); place(neck, cfg.neck);
      thighs.forEach((m, i) => { const sx = i ? 1 : -1; m.position.set(sx * cfg.th[0], cfg.th[1], cfg.th[2]); m.scale.set(cfg.th[3], cfg.th[4], cfg.th[5]); });
      head.position.set(cfg.head[0], cfg.head[1], cfg.head[2]); head.rotation.set(0, 0, 0);
      legs.forEach((L, i) => { const j = L.front ? cfg.sh : cfg.hj, p = L.front ? cfg.fp : cfg.hp; L.up.position.set(L.sx * j[0], j[1], j[2]); L.T.set(L.sx * p[0], p[1], p[2]); L.pitch = 0; });
      api.cfg = cfg; return api;
    },
    // override a paw target (cat-local); pitch tilts the paw (positive = toes down)
    paw(i, p, pitch = 0) { legs[i].T.copy(p); legs[i].pitch = pitch; return api; },
    solve() {
      legs.forEach(L => {
        const { q1, q2 } = solve2(L.up.position, L.T, L.front ? V(L.sx * 0.12, 0, -1) : V(L.sx * 0.35, 0, 1), L.l1, L.l2);
        L.up.quaternion.copy(q1); L.lo.quaternion.copy(q1.clone().invert().multiply(q2));
        L.paw.quaternion.copy(q2.clone().invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(L.pitch, 0, 0))));
      });
      return api;
    },
    // turn the head toward a world point (k blends, limits keep it natural); tilt rolls it
    look(target, k = 1, tilt = 0, maxYaw = 1.2, maxPitch = 0.7) {
      cat.updateMatrixWorld(true); const d = cat.worldToLocal(target.clone()).sub(head.position);
      const yaw = clamp(Math.atan2(d.x, d.z), -maxYaw, maxYaw), pitch = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -maxPitch, maxPitch);
      head.rotation.set(pitch * k, yaw * k, tilt); return api;
    },
    gaze(target) {
      cat.updateMatrixWorld(true);
      eyes.forEach(e => { const d = head.worldToLocal(target.clone()).sub(e.position); e.rotation.set(clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.35, 0.35), clamp(Math.atan2(d.x, d.z), e.userData.ry - 0.45, e.userData.ry + 0.45), 0); });
      return api;
    },
    gazeRest() { eyes.forEach(e => e.rotation.set(0, e.userData.ry, 0)); return api; },
    lid(k, low = 0) { lids.forEach(l => l.rotation.x = lerp(-0.8, 1.45, k)); lows.forEach(l => l.rotation.x = lerp(0.75, -0.55, low)); glints.forEach(g => g.visible = !X && k < 0.62); return api; },
    pupil(k) { if (!X) eyeM.userData.U.uP.value = k; return api; },
    glow(k) { if (!X) eyeM.userData.U.uGlow.value = k; return api; },
    ears(back = 0, swL = 0, swR = 0) { ears.forEach((e, i) => { const sx = i ? 1 : -1; e.rotation.set(-0.7 * back, (i ? swR : swL), -sx * (0.38 + 1.0 * back)); }); return api; },
    whisk(k) { wh.forEach((g, i) => g.rotation.y = -(i ? 1 : -1) * 0.55 * k); return api; },
    tail(pts) {
      const curve = new THREE.CatmullRomCurve3(pts); const TS = 48, RS = 12, geo = new THREE.TubeGeometry(curve, TS, 0.105, RS, false), p = geo.attributes.position;
      for (let j = 0; j <= TS; j++) { const c = curve.getPointAt(j / TS), f = 1 - 0.5 * j / TS; for (let k = 0; k <= RS; k++) { const idx = j * (RS + 1) + k; p.setXYZ(idx, c.x + (p.getX(idx) - c.x) * f, c.y + (p.getY(idx) - c.y) * f, c.z + (p.getZ(idx) - c.z) * f); } }
      geo.computeVertexNormals(); tailM.geometry.dispose(); tailM.geometry = geo; (tailM.userData.shells || []).forEach(sh => sh.geometry = geo); tailTip.position.copy(pts[pts.length - 1]); return api;
    },
    // a relaxed tail for the current pose; sw swishes the last third
    tailRest(t = 0, sw = 0.25, side = 1) {
      const b = V(cfg.tail[0], cfg.tail[1], cfg.tail[2]), s = Math.sin(t * 2.2) * sw, s2 = Math.sin(t * 2.2 - 1.0) * sw, up = cfg.tail[1] > 0.8 ? 1 : 0;
      if (up) return api.tail([b, b.clone().add(V(0.02, 0.25, -0.3)), b.clone().add(V(s * 0.2, 0.75, -0.42)), b.clone().add(V(s2 * 0.35, 1.2, -0.3)), b.clone().add(V(s2 * 0.5, 1.5, -0.05))]);
      return api.tail([b, b.clone().add(V(side * 0.3, -0.16, -0.16)), b.clone().add(V(side * 0.72, -0.2, 0.25 + s * 0.2)), b.clone().add(V(side * (0.86 + s * 0.25), -0.2, 0.85)), b.clone().add(V(side * (0.62 + s2 * 0.55), -0.18, 1.32))]);
    },
    breathe(t, amp = 0.02) { const k = Math.sin(t * 2 * Math.PI * 0.45); torso.scale.x *= 1 + amp * k; torso.scale.z *= 1 + amp * k; bib.scale.z *= 1 + amp * 1.5 * k; return api; },
    W(v) { cat.updateMatrixWorld(true); return cat.localToWorld(v.clone()); },
    eyeW() { cat.updateMatrixWorld(true); return head.localToWorld(V(0, 0.08, 0.5)); },
    pawW(i) { cat.updateMatrixWorld(true); return legs[i].paw.getWorldPosition(new THREE.Vector3()); },
  };
  cat.userData = api; api.pose().solve().lid(0.12).ears(0).whisk(0).tailRest(0);
  return cat;
}

// ---------- a small grey mouse ----------
function makeMouse() {
  const g = new THREE.Group(), fur = new THREE.MeshPhysicalMaterial({ color: 0xa59d95, roughness: 0.8, sheen: 1, sheenColor: new THREE.Color(0xe2dcd6), sheenRoughness: 0.4, bumpMap: FUR_BUMP, bumpScale: 1 });
  const pk = new THREE.MeshPhysicalMaterial({ color: 0xf2a6b0, roughness: 0.45, clearcoat: 0.3 });
  const add = (m, p, parent = g) => { m.castShadow = true; m.receiveShadow = true; if (p) m.position.copy(p); parent.add(m); return m; };
  const body = add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), fur), V(0, 0.15, 0)); body.scale.set(0.16, 0.15, 0.25);
  const hd = new THREE.Group(); hd.position.set(0, 0.16, 0.24); g.add(hd);
  add(new THREE.Mesh(new THREE.SphereGeometry(0.115, 28, 20), fur), null, hd).scale.set(1, 0.92, 1.1);
  const sn = add(new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 20), fur), V(0, -0.015, 0.14), hd); sn.rotation.x = Math.PI / 2;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), pk), V(0, -0.012, 0.225), hd);
  [-1, 1].forEach(sx => {
    const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 14), fur), V(sx * 0.1, 0.11, -0.03), hd); e.scale.set(1, 1, 0.22); e.rotation.y = sx * 0.4;
    const ei = add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), pk), V(sx * 0.1, 0.11, -0.012), hd); ei.scale.set(1, 1, 0.2); ei.rotation.y = sx * 0.4;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.05, clearcoat: 1 })), V(sx * 0.062, 0.035, 0.085), hd);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3) })); gl.position.set(sx * 0.066, 0.045, 0.104); hd.add(gl);
    for (let k = 0; k < 3; k++) { const c = new THREE.CylinderGeometry(0.001, 0.003, 0.14, 4); c.translate(0, 0.07, 0); const w = new THREE.Mesh(c, new THREE.MeshBasicMaterial({ color: 0xffffff })); w.position.set(sx * 0.03, -0.01, 0.2); w.rotation.z = -sx * (Math.PI / 2 + (k - 1) * 0.25); hd.add(w); }
    [0.14, -0.1].forEach(z => add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), pk), V(sx * 0.11, 0.025, z)).scale.set(1, 0.6, 1.5));
  });
  const tail = new THREE.Mesh(new THREE.BufferGeometry(), pk); tail.castShadow = true; g.add(tail);
  g.userData = {
    hd, body,
    update(t, run = 0, fear = 0) {
      const w = Math.sin(t * 30) * 0.12 * run + Math.sin(t * 2.3) * 0.06;
      const pts = [V(0, 0.1, -0.22), V(w * 0.3, 0.05, -0.42), V(w, 0.035 + 0.05 * run, -0.62), V(w * 1.6, 0.04 + 0.1 * run, -0.82)];
      tail.geometry.dispose(); tail.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.013, 6);
      body.scale.set(0.16 * (1 - 0.1 * run), 0.15 * (1 + 0.06 * Math.sin(t * 30) * run), 0.25 * (1 + 0.2 * run)); body.position.y = 0.15 + 0.012 * Math.abs(Math.sin(t * 30)) * run;
      hd.rotation.set(-0.1 * fear + 0.05 * Math.sin(t * 40) * fear, 0.1 * Math.sin(t * 3), 0); hd.position.y = 0.16 - 0.02 * fear;
    },
  };
  g.userData.update(0); return g;
}

// ---------- a tumbler of ice water that can slide, fall and shatter ----------
function makeGlass(sc, { h = 0.36, r = 0.115 } = {}) {
  const g = new THREE.Group(); sc.add(g);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.18, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false });
  const R = y => lerp(r * 0.86, r, y / h);
  const prof = []; for (let i = 0; i <= 16; i++) { const y = h * i / 16; prof.push(new THREE.Vector2(R(y), y)); }
  const wall = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), glassM); wall.renderOrder = 6; g.add(wall);
  const baseM = new THREE.MeshPhysicalMaterial({ color: 0xdff0fa, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.32, envMapIntensity: 1.2 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R(0.035), R(0), 0.035, 48), baseM); base.position.y = 0.0175; base.castShadow = true; g.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.55 })); rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  const waterM = new THREE.MeshPhysicalMaterial({ color: 0x8fd4f0, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.36, envMapIntensity: 1.0, depthWrite: false });
  const wg = new THREE.Group(); wg.position.y = 0.04; g.add(wg);
  const wh0 = h * 0.72, water = new THREE.Mesh(new THREE.CylinderGeometry(R(wh0) - 0.008, R(0.04) - 0.008, wh0 - 0.04, 48), waterM); water.position.y = (wh0 - 0.04) / 2; water.renderOrder = 4; wg.add(water);
  const surf = new THREE.Mesh(new THREE.CircleGeometry(R(wh0) - 0.008, 48), new THREE.MeshPhysicalMaterial({ color: 0xc8ecfa, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.32, envMapIntensity: 1.0, side: THREE.DoubleSide })); surf.rotation.x = -Math.PI / 2; surf.position.y = wh0 - 0.04; surf.renderOrder = 5; wg.add(surf);
  const iceM = new THREE.MeshPhysicalMaterial({ color: 0xf2faff, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.4, envMapIntensity: 1.2 });
  const ice = [0, 1, 2].map(i => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.075, 0.075, 3, 0.018), iceM); m.position.set(Math.cos(i * 2.1) * 0.035, wh0 - 0.07 - i * 0.012, Math.sin(i * 2.1) * 0.035); m.rotation.set(i, i * 2, i * 0.7); m.renderOrder = 5; wg.add(m); return m; });
  // shards, droplets, puddle
  const r0 = rng(31), shardM = new THREE.MeshPhysicalMaterial({ color: 0xf2faff, roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.55, envMapIntensity: 2.4, side: THREE.DoubleSide });
  const shards = []; for (let i = 0; i < 46; i++) {
    const s = 0.03 + r0() * 0.07, sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(s, s * (0.2 + r0() * 0.5)); sh.lineTo(s * (0.2 + r0() * 0.4), s * (0.9 + r0() * 0.6)); sh.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false }), shardM); m.castShadow = true; m.visible = false; sc.add(m);
    const a = r0() * Math.PI * 2, sp = 0.5 + r0() * 2.2; shards.push({ m, v: V(Math.cos(a) * sp, 0.6 + r0() * 2.0, Math.sin(a) * sp), w: V(r0() * 14 - 7, r0() * 14 - 7, r0() * 14 - 7), rest: r0() * 6.28 });
  }
  const ND = 90, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.7, envMapIntensity: 2 }), ND); drops.frustumCulled = false; sc.add(drops);
  const DD = []; for (let i = 0; i < ND; i++) { const a = r0() * Math.PI * 2, sp = 0.3 + r0() * 2.6; DD.push({ v: V(Math.cos(a) * sp, 0.8 + r0() * 2.6, Math.sin(a) * sp), s: 0.008 + r0() * 0.022, del: r0() * 0.05 }); }
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshPhysicalMaterial({ color: 0xcfeeff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.38, envMapIntensity: 2.2, depthWrite: false })); puddle.rotation.x = -Math.PI / 2; puddle.visible = false; sc.add(puddle);
  const iceLoose = [0, 1, 2].map(() => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.075, 0.075, 3, 0.018), iceM); m.castShadow = true; m.visible = false; sc.add(m); return m; });
  const dm = new THREE.Object3D(), GR = 9.8 * 1.15;
  const ballistic = (p0, v, a, floorY) => { // parabolic flight, then slide to a stop on the floor
    const A = 0.5 * GR, B = -v.y, Cc = floorY - p0.y, tf = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * Cc))) / (2 * A);
    if (a < tf) return { p: V(p0.x + v.x * a, p0.y + v.y * a - 0.5 * GR * a * a, p0.z + v.z * a), air: true, tf };
    const k = 5, b = a - tf, sl = (1 - Math.exp(-k * b)) / k * 0.45; return { p: V(p0.x + v.x * (tf + sl), floorY, p0.z + v.z * (tf + sl)), air: false, tf };
  };
  const api = {
    g, h, r, wg, hit: null,
    // whole glass: position on the table, tilt (a quaternion), water staying level, ice bobbing
    place(p, q = null, t = 0, slosh = 0) {
      g.visible = true; g.position.copy(p); if (q) g.quaternion.copy(q); else g.quaternion.identity();
      const inv = g.quaternion.clone().invert(); wg.quaternion.copy(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), inv, 0.85));
      surf.rotation.set(-Math.PI / 2 + slosh * 0.22 * Math.sin(t * 11), slosh * 0.18 * Math.cos(t * 9), 0);
      ice.forEach((m, i) => { m.position.y = wh0 - 0.07 - i * 0.012 + 0.006 * Math.sin(t * 3 + i * 2) + slosh * 0.012 * Math.sin(t * 12 + i); m.rotation.y = i * 2 + t * 0.3 + slosh * 0.5 * Math.sin(t * 8 + i); });
    },
    // after impact at point P (on the floor) at age a seconds
    shatter(P, a, floorY = 0) {
      const on = a >= 0; g.visible = !on; shards.forEach(o => o.m.visible = on); puddle.visible = on; iceLoose.forEach(m => m.visible = on);
      if (!on) { for (let i = 0; i < ND; i++) { dm.scale.setScalar(0.0001); dm.position.set(0, -50, 0); dm.updateMatrix(); drops.setMatrixAt(i, dm.matrix); } drops.instanceMatrix.needsUpdate = true; return; }
      shards.forEach((o, i) => { const b = ballistic(V(P.x, P.y + 0.06, P.z), o.v, a, floorY + 0.006); o.m.position.copy(b.p); if (b.air) o.m.rotation.set(o.w.x * a, o.w.y * a, o.w.z * a); else o.m.rotation.set(-Math.PI / 2, 0, o.rest); });
      for (let i = 0; i < ND; i++) { const d = DD[i], b = ballistic(V(P.x, P.y + 0.05, P.z), d.v, Math.max(0, a - d.del), floorY + 0.004); dm.position.copy(b.p); const s = d.s * (b.air ? 1 : Math.max(0.35, 1 - (a - b.tf) * 0.6)); dm.scale.set(s * (b.air ? 1 : 1.8), s * (b.air ? 1.3 : 0.35), s * (b.air ? 1 : 1.8)); dm.rotation.set(0, 0, 0); dm.updateMatrix(); drops.setMatrixAt(i, dm.matrix); }
      drops.instanceMatrix.needsUpdate = true;
      const ps = 0.75 * (1 - Math.exp(-a * 3.2)); puddle.position.set(P.x, floorY + 0.004, P.z); puddle.scale.set(ps * 1.15, ps, 1);
      iceLoose.forEach((m, i) => { const b = ballistic(V(P.x, P.y + 0.08, P.z), V(Math.cos(i * 2.2 + 1) * 1.3, 1.4 + i * 0.3, Math.sin(i * 2.2 + 1) * 1.3), a, floorY + 0.037); m.position.copy(b.p); m.rotation.set(b.air ? a * 7 : 0, i + (b.air ? a * 5 : 0), b.air ? a * 4 : 0); });
    },
  };
  api.place(V(0, 0, 0)); api.shatter(V(0, 0, 0), -1);
  return api;
}

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

// =====================================================================
// SHOTS
// =====================================================================
const CATP = V(-0.15, TBL.y, 0.05), CS = 0.55, G0 = V(0.026, TBL.y, 0.435), GH = 0.36, GRAV = 9.8 * 1.15;
const QX = (a) => new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), a);
// the glass tipping over the front edge of the table, falling and hitting the floor. tau = seconds since it started to tip
function glassFall(tau) {
  const piv = V(G0.x, TBL.y, TBL.zf), tA = 0.24, th1 = 0.95;
  if (tau <= 0) return { p: V(G0.x, TBL.y, TBL.zf + 0.02), q: QX(0), a: -1, th: 0 };
  if (tau < tA) { const th = th1 * (tau / tA) ** 2, q = QX(th); return { p: piv.clone().add(V(0, 0, 0.02).applyQuaternion(q)), q, a: -1, th }; }
  const b = tau - tA, q1 = QX(th1), p1 = piv.clone().add(V(0, 0, 0.02).applyQuaternion(q1)), v = V(0, -0.55, 1.05), om = 2 * th1 / tA * 0.62;
  const A = 0.5 * GRAV, B = -v.y, Cc = 0.16 - p1.y, bHit = (-B + Math.sqrt(B * B - 4 * A * Cc)) / (2 * A);
  if (b < bHit) return { p: V(p1.x, p1.y + v.y * b - A * b * b, p1.z + v.z * b), q: QX(th1 + om * b), a: -1, th: th1 + om * b };
  return { p: null, q: null, a: b - bHit, P: V(p1.x, 0, p1.z + v.z * bHit), th: 9 };
}
// living room with the cat on the table and the glass; act() poses the cat for one frame
function heroSet(s, { owner = false } = {}) {
  const sc = s.scene; const R = livingRoom(sc); const cat = makeCat2(); cat.scale.setScalar(CS); cat.position.copy(CATP); sc.add(cat); const u = cat.userData;
  const glass = makeGlass(sc, { h: GH });
  const spill = []; for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008 + 0.012 * h3(i, 1, 1), 10, 8), new THREE.MeshPhysicalMaterial({ color: 0x9fdcf6, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.5, envMapIntensity: 1.2 })); m.visible = false; sc.add(m); spill.push(m); }
  let O = null, lap = null;
  if (owner) { O = makeKid(OWNER); addSmile(O); sc.add(O); lap = makeLaptop(); sc.add(lap); }
  const H = {
    sc, R, cat, u, glass, O, lap,
    // cat sitting on the table. o.paw: world point for the right front paw (null = resting)
    act(t, o = {}) {
      cat.position.copy(CATP).add(o.off || V(0, 0, 0)); cat.rotation.set(0, o.ry || 0, 0); cat.scale.setScalar(CS);
      u.pose({ sit: 1 });
      if (o.lean) { u.torso.rotation.x += 0.25 * o.lean; u.head.position.z += 0.22 * o.lean; u.head.position.y -= 0.1 * o.lean; }
      if (o.paw) u.paw(1, cat.worldToLocal(o.paw.clone()), o.pawPitch ?? 0.55);
      u.solve().breathe(t).lid(o.lid ?? 0.3, o.low ?? 0.12).pupil(o.pupil ?? 0.2).ears(o.ears ?? 0, o.swL ?? 0, o.swR ?? 0).whisk(o.whisk ?? 0).glow(0);
      const sw = (o.tailSw ?? 0.3) * Math.sin(t * 2.2), sw2 = (o.tailSw ?? 0.3) * Math.sin(t * 2.2 - 1.1);
      u.tail([V(0, 0.3, -0.92), V(0.08, 0.24, -1.22), V(0.14 + sw * 0.25, -0.2, -1.5), V(0.14 + sw * 0.8, -0.78, -1.52), V(0.14 + sw2 * 1.3, -1.28, -1.44)]);
      if (o.look) u.look(o.look, o.lookK ?? 1, o.tilt ?? 0); else u.head.rotation.z = o.tilt ?? 0;
      if (o.gaze) u.gaze(o.gaze); else u.gazeRest();
      R.update(t);
    },
    // the paw resting on the back of the rim, for a glass standing at p
    rimPaw(p) { return p.clone().add(V(0, GH + 0.03, -0.075)); },
    pushPaw(p) { return p.clone().add(V(0, GH * 0.8, -0.14)); },
    // glass state for a time since tipping; draws falling water and the shatter
    fall(tau, t) {
      const f = glassFall(tau);
      if (f.a < 0) { glass.shatter(V(0, 0, 0), -1); glass.place(f.p, f.q, t, tau > 0 ? 1 : 0); glass.wg.visible = f.th < 0.7; }
      else glass.shatter(f.P, f.a);
      spill.forEach((m, i) => { const e = 0.14 + i * 0.012, age = tau - e; const fe = glassFall(e); m.visible = age > 0 && fe.a < 0 && f.a < 0.25; if (!m.visible) return;
        const mouth = fe.p.clone().add(V(0, GH * 0.9, 0).applyQuaternion(fe.q)), vv = V((h3(i, 2, 2) - 0.5) * 1.1, 0.9 * h3(i, 3, 3) - 0.2, 0.5 + 1.1 * h3(i, 4, 4));
        m.position.set(mouth.x + vv.x * age, Math.max(0.02, mouth.y + vv.y * age - 0.5 * GRAV * age * age), mouth.z + vv.z * age); m.scale.set(1, 1 + 2.5 * Math.min(age, 0.3), 1); });
      return f;
    },
    stand(p = G0, t = 0, slosh = 0) { glass.shatter(V(0, 0, 0), -1); glass.place(p, null, t, slosh); glass.wg.visible = true; spill.forEach(m => m.visible = false); },
    // the owner on the sofa with a laptop
    ownerSofa(t, { gasp = 0 } = {}) {
      const ou = O.userData; ou.reset(); O.rotation.set(0, Math.PI, 0); O.position.set(R.sofa.x, 0, R.sofa.z - 0.25); seatOn(O, R.sofa.seatY); ou.breathe(t, 0.28, 0.025);
      lap.position.set(R.sofa.x, R.sofa.seatY + 0.42, R.sofa.z - 0.78); lap.rotation.set(0, Math.PI, 0);
      const q = O.quaternion, ty = Math.sin(t * 17) * 0.012;
      if (gasp < 0.02) { ik2(O, ou.arms[0], lap.position.clone().add(V(0.2, 0.05 + ty, 0.02)), V(1, -1, 0)); ik2(O, ou.arms[1], lap.position.clone().add(V(-0.2, 0.05 - ty, 0.02)), V(-1, -1, 0)); ou.hands.forEach(h => h.curl(0.35)); ou.head.rotation.x += 0.32; ou.lid(0.3, t, 2); }
      else { const hp = headPt(O, V(0, -0.05, 0.3)); ik2(O, ou.arms[0], lv(lap.position, hp.clone().add(V(0.42, 0.1, -0.2)), gasp), V(1, -0.3, 0)); ik2(O, ou.arms[1], lv(lap.position, hp.clone().add(V(-0.42, 0.1, -0.2)), gasp), V(-1, -0.3, 0)); ou.hands.forEach(h => h.curl(0.05, 1)); ou.head.rotation.x += lerp(0.32, -0.12, gasp); ou.setLid(-0.3 * gasp); ou.eyePop(1 + 0.25 * gasp); ou.raise(gasp); ou.mouthOpen(0.55 * gasp); }
    },
  };
  return H;
}
const OPEN = [V(0.3, 2.12, 4.25), V(0.0, 1.78, 0.2)];
const pushZ = (t) => kf(t, [[C.slowly - 0.05, G0.z], [2.5, 0.5], [2.74, 0.5], [3.14, 0.59], [3.28, 0.59], [C.off, TBL.zf + 0.02, E.in]]);
const TIP = C.off, IMPACT = TIP + 0.24 + 0.404;

// 0) the stare: paw on the rim, eyes locked on you ---------------------------------------------------
shot(0, C.slowly, (s) => {
  const H = heroSet(s); s.ap = 6; s.exposure = 0.98; s.bloom = 0.4;
  s.update = (t) => {
    const c = E.io(seg(t, -0.3, C.slowly + 0.3)), cp = lv(OPEN[0], V(0.22, 2.08, 3.55), c);
    H.stand(G0, t, 0);
    H.act(t, { paw: H.rimPaw(G0), look: cp, gaze: cp, tilt: 0.1, lid: 0.3, pupil: 0.2, swR: 0.35 * Math.max(0, Math.sin((t - 0.9) * 9)) * (t > 0.9 && t < 1.25 ? 1 : 0) });
    shoot(s.cam, cp, lv(OPEN[1], V(0, 1.84, 0.2), c), { fov: 34, t, focus: cp.distanceTo(H.u.eyeW()) });
  };
});
// 1) side macro: the paw shoves the glass toward the edge in little pushes -----------------------------
shot(C.slowly, C.off, (s) => {
  const H = heroSet(s); s.ap = 9; s.exposure = 0.95; s.bloom = 0.5;
  s.update = (t) => {
    const gz = pushZ(t), gp = V(G0.x, TBL.y, gz), moving = Math.abs(pushZ(t + 0.03) - pushZ(t - 0.03)) * 16;
    H.stand(gp, t, clamp(moving * 3));
    H.act(t, { paw: H.pushPaw(gp), pawPitch: 0.25, look: OPEN[0], gaze: OPEN[0], tilt: 0.1, lid: 0.3, lean: seg(t, C.slowly, C.off) * 0.5 });
    const c = E.io(seg(t, C.slowly - 0.2, C.off + 0.3));
    shoot(s.cam, lv(V(1.75, 1.6, 0.42), V(1.45, 1.56, 0.62), c), V(G0.x, 1.5, lerp(0.5, 0.62, c)), { fov: 30, t, hand: 0.6 });
  };
});
// 2) it tips, falls and smashes; the cat peers over the edge ------------------------------------------
shot(C.off, C.yousee, (s) => {
  const H = heroSet(s); s.ap = 5; s.exposure = 0.95; s.bloom = 0.45; s.sub = 4;
  s.update = (t) => {
    const f = H.fall(t - TIP, t), peek = E.io(seg(t, TIP + 0.15, TIP + 0.6)), floorP = V(G0.x, 0, 1.1);
    H.act(t, { paw: lv(H.pushPaw(V(G0.x, TBL.y, TBL.zf)), H.pushPaw(V(G0.x, TBL.y, 0.35)).add(V(0, -0.1, 0)), E.io(seg(t, TIP + 0.25, TIP + 0.7))), pawPitch: 0.25, look: floorP, lookK: peek, gaze: floorP, lean: 0.5 + 0.5 * peek, lid: lerp(0.3, 0.05, peek), pupil: lerp(0.2, 0.75, peek), ears: 0, whisk: peek, off: V(0, 0, 0.1 * peek) });
    const c = E.io(seg(t, C.off - 0.2, C.yousee + 0.3)), hit = t - IMPACT;
    shoot(s.cam, lv(V(0.85, 0.2, 2.45), V(0.7, 0.24, 2.2), c).add(shake(t, 0.035 * jolt(t, IMPACT))), lv(V(0, 1.05, 0.72), V(0, 0.7, 0.8), c), { fov: 40, t });
  };
});
// 3) cats are hunters: stalking through the grass at dusk ----------------------------------------------
const MOUSE0 = V(0.2, 0, 1.0), GC = 0.6;
function gardenSet(s) {
  const sc = s.scene; const R = garden(sc); const cat = makeCat2(); cat.scale.setScalar(GC); sc.add(cat); const u = cat.userData; const mouse = makeMouse(); mouse.scale.setScalar(0.85); sc.add(mouse);
  const tBolt = C.run - 0.05, tPounce = C.run + 0.32;
  const H = {
    R, cat, u, mouse, tBolt, tPounce,
    act(t, { creep = 0, taps = [] } = {}) {
      R.update(t);
      // the mouse: frozen, squashed by each tap, then it bolts in a zigzag
      const run = Math.max(0, t - tBolt), bolt = run > 0 ? 1 : 0, dist = 3.6 * run * run + 1.2 * run;
      mouse.position.set(MOUSE0.x - 0.5 * Math.sin(dist * 1.6), 0, MOUSE0.z + dist); mouse.rotation.y = bolt ? -0.8 * Math.cos(dist * 1.6) : Math.PI / 2;
      const tapK = taps.reduce((a, t0) => Math.max(a, jolt(t, t0 + 0.02)), 0);
      mouse.userData.update(t, bolt, 1 - bolt); mouse.scale.set(0.85 * (1 + 0.12 * tapK), 0.85 * (1 - 0.25 * tapK), 0.85 * (1 + 0.12 * tapK));
      // the cat: low crouch, shoulder wiggle, a paw that reaches out to pat; then the leap
      const leap = clamp((t - tPounce) / 0.42), air = Math.sin(Math.PI * leap), z0 = -0.55 + 0.75 * creep;
      cat.position.set(0.02 * Math.sin(t * 15) * (t > tBolt && t < tPounce ? 1 : 0), 0.75 * air, z0 + 2.6 * E.inQ(leap) + 1.2 * leap); cat.rotation.set(-0.35 * Math.cos(Math.PI * leap) * (leap > 0 ? 1 : 0), 0, 0);
      u.pose({ crouch: 1 - 0.6 * air, stand: 0.6 * air });
      const wig = t > tBolt - 0.9 && t < tPounce ? Math.sin(t * 16) * 0.05 : 0; u.hips.position.x += wig; u.hips.position.y -= 0.04 * (t > tBolt && t < tPounce ? 1 : 0);
      if (leap > 0) { [0, 1].forEach(i => u.paw(i, V(u.legs[i].sx * 0.2, 0.45 - 0.3 * leap, 1.35), -0.6)); [2, 3].forEach(i => u.paw(i, V(u.legs[i].sx * 0.3, 0.2 + 0.25 * air, -1.25), 0.8)); }
      else {
        const walk = creep * 14; [0, 1].forEach(i => { const ph = walk + i * Math.PI; u.legs[i].T.z += 0.1 * Math.cos(ph) * (creep < 1 ? 1 : 0); u.legs[i].T.y += 0.05 * Math.max(0, Math.sin(ph)) * (creep < 1 ? 1 : 0); });
        let reach = 0, lift = 0; taps.forEach(t0 => { const a = t - t0; if (a > -0.34 && a < 0.36) { reach = Math.max(reach, a < 0 ? E.io((a + 0.34) / 0.34) : 1 - E.io(a / 0.36)); lift = Math.max(lift, a < 0 ? Math.sin(Math.PI * (a + 0.34) / 0.34) : 0); } });
        if (reach > 0) { const tgt = cat.worldToLocal(mouse.position.clone().add(V(0, 0.27, -0.03))); u.paw(1, lv(u.legs[1].T.clone(), tgt, reach).add(V(0, 0.22 * lift, 0)), 0.5 * reach); }
      }
      u.solve().breathe(t, 0.012).lid(0.04, 0.0).pupil(t > tBolt - 0.1 ? 1 : 0.55).ears(0, 0.1 * Math.sin(t * 3), -0.1 * Math.sin(t * 3)).whisk(0.8).glow(0.55);
      const tw = Math.sin(t * 9) * 0.12; u.tail([V(0, 0.5, -1.12), V(0, 0.42, -1.5), V(tw * 0.5, 0.36, -1.95), V(tw * 1.6, 0.42 + 0.2 * air, -2.35), V(tw * 3, 0.56 + 0.4 * air, -2.6)]);
      const mw = mouse.position.clone().add(V(0, 0.15, 0)); u.look(mw, 1, 0, 0.9, 0.6).gaze(mw);
    },
  };
  return H;
}
shot(C.yousee, C.and1, (s) => {
  const G = gardenSet(s); s.ap = 8; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => { G.act(t, { creep: E.io(seg(t, C.yousee - 0.2, C.and1 + 0.2)) * 0.7 }); G.mouse.visible = false; const c = E.io(seg(t, C.yousee - 0.2, C.and1 + 0.3)); shoot(s.cam, lv(V(0.95, 0.3, 3.3), V(0.7, 0.34, 2.7), c), G.u.eyeW().add(V(0, -0.05, 0)), { fov: 34, t }); };
});
const TAPS = [C.test + 0.05, C.paws + 0.05, C.tapping + 0.12];
shot(C.and1, C.tapping, (s) => {
  const G = gardenSet(s); s.ap = 9; s.exposure = 1.05; s.bloom = 0.5;
  s.update = (t) => { G.act(t, { creep: 1, taps: TAPS }); const c = E.io(seg(t, C.and1 - 0.2, C.tapping + 0.3)); shoot(s.cam, lv(V(1.7, 0.42, 2.25), V(1.45, 0.38, 1.95), c), MOUSE0.clone().add(V(-0.05, 0.27, -0.22)), { fov: 34, t, hand: 0.6, focus: lv(V(1.7, 0.42, 2.25), V(1.45, 0.38, 1.95), c).distanceTo(MOUSE0) }); };
});
shot(C.tapping, C.so, (s) => {
  const G = gardenSet(s); s.ap = 6; s.exposure = 1.05; s.bloom = 0.5; s.sub = 4;
  s.update = (t) => { G.act(t, { creep: 1, taps: TAPS }); const fol = E.io(seg(t, G.tBolt, C.so)); shoot(s.cam, lv(V(3.0, 0.55, 1.5), V(3.3, 0.7, 2.6), fol).add(shake(t, 0.012 * jolt(t, G.tPounce))), lv(V(0.1, 0.35, 0.55), V(0.0, 0.5, 2.2), fol), { fov: 36, t, hand: 1.2 }); };
});
// 6) so when the glass falls (slow motion) ------------------------------------------------------------
shot(C.so, C.that, (s) => {
  const H = heroSet(s); s.ap = 6; s.exposure = 0.95; s.bloom = 0.45; s.sub = 4;
  s.update = (t) => {
    const tau = 0.14 + (t - C.so) * 0.3, f = H.fall(tau, t), gp = f.p || V(G0.x, 0.2, 1.1);
    H.act(t, { look: gp, gaze: gp, lean: 1, lid: 0.05, pupil: lerp(0.3, 0.6, seg(t, C.so, C.that)), whisk: 0.6, off: V(0, 0, 0.1), tailSw: 0.1 });
    const c = E.io(seg(t, C.so - 0.2, C.that + 0.3)); shoot(s.cam, lv(V(-1.45, 0.95, 3.5), V(-1.25, 0.9, 3.2), c), lv(V(-0.05, 1.5, 0.75), V(-0.05, 1.42, 0.78), c), { fov: 40, t, focus: lv(V(-1.45, 0.95, 3.5), V(-1.25, 0.9, 3.2), c).distanceTo(gp) });
  };
});
// 7) that sudden movement: the pupils blow wide open -------------------------------------------------
shot(C.that, C.instinct, (s) => {
  const H = heroSet(s); s.ap = 10; s.exposure = 0.98; s.bloom = 0.45;
  const fl = new THREE.PointLight(0xffe2c8, 5, 7, 2); s.scene.add(fl);
  const refl = [-1, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.6, 2.8), transparent: true, opacity: 0.8, depthWrite: false })); H.u.head.add(m); return m; });
  s.update = (t) => {
    const floorP = V(G0.x, 0.1, 1.15), dil = clamp(spring(t, C.sudden - 0.02, 2.2, 6));
    H.stand(V(0, -5, 0)); H.act(t, { look: floorP, gaze: floorP, lean: 1, lid: lerp(0.08, 0.0, dil), low: 0, pupil: lerp(0.24, 1.0, dil), ears: 0, swL: -0.25 * dil, swR: 0.25 * dil, whisk: dil, off: V(0, 0, 0.1), tailSw: 0.05 });
    const eye = H.u.eyeW(), dir = floorP.clone().sub(eye).normalize(), c = E.io(seg(t, C.that - 0.2, C.instinct + 0.3)), cp = eye.clone().addScaledVector(dir, lerp(2.15, 1.7, c)).add(V(0.08, 0.1, 0)); fl.position.copy(cp).add(V(-0.4, 0.5, 0.2));
    const fy = lerp(0.1, -0.09, seg(t, C.that, C.instinct)); refl.forEach((m, i) => { m.position.set((i ? 1 : -1) * 0.22 + 0.02, 0.08 + fy, 0.563); m.rotation.z = (t - C.that) * 2.5; m.material.opacity = 0.75 * Math.sin(Math.PI * seg(t, C.that, C.instinct)); });
    shoot(s.cam, cp, eye.clone().add(V(0, -0.1, 0)), { fov: 30, t, hand: 0.5 });
  };
});
// 8) the same instinct as chasing prey: x-ray of the cat, the hunting signal fires down to the paws ---
shot(C.instinct, C.but, (s) => {
  const sc = s.scene; sc.background = BG.xray; s.ap = 0; s.exposure = 1.0; s.bloom = 0.55;
  const cat = makeCat2({ xray: true }); sc.add(cat); const u = cat.userData; cat.rotation.y = -0.5; u.fur.uniforms.fade.value = 0.5;
  const brain = makeBrain(); brain.scale.multiplyScalar(0.26); brain.material = glow(0xff8a3a, 0.7); u.head.add(brain); brain.position.set(0, 0.1, -0.05);
  const nm = (dens) => new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, on: { value: 0 }, dens: { value: dens } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uT; uniform float on; uniform float dens; varying vec2 vUv; void main(){ float ph=fract(vUv.x*dens-uT*1.8); float q=(ph-0.5)/0.08; float pulse=exp(-q*q); gl_FragColor=vec4(vec3(1.0,0.62,0.2)*(0.25+0.3*on)+vec3(1.0,0.95,0.7)*pulse*2.8*on,1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const spineM = nm(4), legM = nm(3); const spine = new THREE.Mesh(new THREE.BufferGeometry(), spineM); cat.add(spine); const nerves = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), legM); cat.add(m); return m; });
  const ghost = makeMouse(); const gm = xrayMat(new THREE.Color(1.0, 0.75, 0.4), new THREE.Color(0.25, 0.1, 0.02), 2.0, 1.1); ghost.traverse(o => { if (o.isMesh) { o.material = gm; o.castShadow = false; } }); ghost.scale.setScalar(1.5); sc.add(ghost);
  const r = rng(2); for (let i = 0; i < 50; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008 + r() * 0.012, 6, 4), glow(0x6fb6ff, 0.35)); m.position.set((r() - 0.5) * 7, r() * 4, (r() - 0.5) * 4 - 1.5); sc.add(m); }
  s.update = (t) => {
    const on = clamp(spring(t, C.instinct + 0.05, 2, 6)), swipe = jolt(t, C.chasing + 0.1) + jolt(t, C.chasing + 0.5);
    const gx = lerp(-2.6, 2.8, seg(t, C.chasing - 0.25, C.but)), gp = V(gx, 0, 1.55);
    ghost.position.copy(gp); ghost.rotation.y = Math.PI / 2; ghost.userData.update(t, 1, 0); ghost.visible = t > C.chasing - 0.25;
    u.pose({ sit: 1 }); u.paw(1, lv(u.legs[1].T.clone(), V(0.3, 0.6, 1.05), swipe), 0.4 * swipe);
    u.solve().lid(0.02).ears(0, -0.2, 0.2).whisk(1);
    const sw = Math.sin(t * 7) * 0.5 * on; u.tail([V(0, 0.3, -0.92), V(0.3, 0.14, -1.08), V(0.74, 0.1, -0.7 + sw * 0.2), V(0.9 + sw * 0.25, 0.1, -0.1), V(0.7 + sw * 0.6, 0.12, 0.4)]);
    if (ghost.visible) u.look(gp.clone().add(V(0, 0.2, 0)), 1, 0, 1.0, 0.6);
    brain.material.opacity = 0.35 + 0.6 * on * (0.75 + 0.25 * Math.sin(t * 16));
    const hp = u.head.position, sp = [hp.clone().add(V(0, 0, -0.1)), V(0, 1.45, -0.25), V(0, 1.05, -0.48), V(0, 0.6, -0.75)]; spine.geometry.dispose(); spine.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 40, 0.045, 8);
    nerves.forEach((m, i) => { const L = u.legs[i]; cat.updateMatrixWorld(true); const el = cat.worldToLocal(L.lo.getWorldPosition(new THREE.Vector3())), pw = cat.worldToLocal(L.paw.getWorldPosition(new THREE.Vector3())); m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 1.4, -0.2), L.up.position.clone(), el, pw.add(V(0, 0.05, 0.05))]), 40, 0.03, 8); });
    [spineM, legM].forEach(m => { m.uniforms.uT.value = t; m.uniforms.on.value = on; });
    const c = E.io(seg(t, C.instinct - 0.2, C.but + 0.3)); shoot(s.cam, lv(V(2.6, 1.7, 5.2), V(1.9, 1.5, 4.4), c), V(0.1, 1.05, 0.2), { fov: 36, t });
  };
});
// 9) but there's another reason: the cat, and beyond it the owner who isn't paying attention ---------
shot(C.but, C.the, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 9; s.exposure = 0.98; s.bloom = 0.42;
  s.update = (t) => {
    const cp = lv(V(-1.25, 2.45, -1.75), V(-1.05, 2.4, -1.45), E.io(seg(t, C.but - 0.2, C.the + 0.3))), side = E.io(seg(t, C.another, C.reason + 0.3));
    H.stand(G0, t, 0); H.ownerSofa(t);
    H.act(t, { look: lv(V(0.3, 2.2, 4.6), cp, side), lookK: 1, gaze: cp, tilt: -0.1 * side, lid: lerp(0.25, 0.5, side), pupil: 0.25, tailSw: 0.55 });
    const rack = E.io(seg(t, C.but + 0.25, C.another + 0.1)) * (1 - E.io(seg(t, C.reason, C.reason + 0.4)));
    shoot(s.cam, cp, V(0.1, 2.0, 2.4), { fov: 36, t, focus: lerp(cp.distanceTo(H.u.eyeW()), cp.distanceTo(V(0.3, 2.6, 4.75)), rack) });
  };
});
// 10) the first time it crashed (seen from above) ---------------------------------------------------
shot(C.the, C.you, (s) => {
  const H = heroSet(s); s.ap = 4; s.exposure = 0.98; s.bloom = 0.45; s.sub = 4;
  const hitT = C.crashed + 0.06;
  s.update = (t) => {
    const tau = t < hitT ? 0.644 - (hitT - t) * 0.45 : 0.644 + (t - hitT); H.fall(tau, t);
    H.act(t, { look: V(G0.x, 0, 1.1), gaze: V(G0.x, 0, 1.1), lean: 1, lid: 0.05, pupil: 0.8, whisk: 1, off: V(0, 0, 0.1) });
    const c = E.io(seg(t, C.the - 0.2, C.you + 0.3)); shoot(s.cam, lv(V(0.5, 3.5, 2.5), V(0.35, 3.1, 2.2), c).add(shake(t, 0.03 * jolt(t, hitT))), V(G0.x, 0.1, 1.05), { fov: 38, t });
  };
});
// 11) you gasped and came running ----------------------------------------------------------------------
shot(C.you, C.and2, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 5; s.exposure = 0.98; s.bloom = 0.42; s.sub = 4;
  s.update = (t) => {
    const gasp = clamp(spring(t, C.gasped - 0.05, 2.2, 6)), up = E.io(seg(t, C.gasped + 0.3, C.came + 0.05)), run = seg(t, C.came, C.and2 + 0.3);
    H.fall(2, t); H.act(t, { look: V(0.3, 2.3, 3.5), gaze: V(0.3, 2.3, 3.5), lid: 0.15, pupil: 0.45, tailSw: 0.5 });
    H.ownerSofa(t, { gasp });
    if (up > 0) {
      const ou = H.O.userData; ou.reset(); H.O.rotation.set(0, Math.PI, 0); const z = lerp(R_SOFA_Z, 2.9, E.inQ(run)); H.O.position.set(0.3, 0, z);
      if (run > 0) { ou.gait((t - C.came) * 11, 1, 1); H.O.position.y = ou.bob; H.O.rotation.x = -ou.lean; } else { seatOn(H.O, lerp(1.03, 1.44, up)); ou.legs.forEach(L => { L.hip.rotation.x = lerp(-1.45, 0, up); L.knee.rotation.x = lerp(1.4, 0, up); }); }
      ou.setLid(-0.3); ou.eyePop(1.25); ou.raise(1); ou.mouthOpen(0.5); if (run <= 0) { const hp = headPt(H.O, V(0, -0.05, 0.3)); ik2(H.O, ou.arms[0], hp.clone().add(V(0.42, 0.1, -0.2)), V(1, -0.3, 0)); ik2(H.O, ou.arms[1], hp.clone().add(V(-0.42, 0.1, -0.2)), V(-1, -0.3, 0)); ou.hands.forEach(h => h.curl(0.05, 1)); }
    }
    const c = E.io(seg(t, C.you - 0.2, C.and2 + 0.3)); shoot(s.cam, lv(V(1.35, 1.95, 0.2), V(1.3, 1.9, 0.0), c), lv(V(0.3, 2.35, 4.6), V(0.3, 2.05, 3.2), run), { fov: 40, t });
  };
});
const R_SOFA_Z = 4.75;
// 12) and your cat learned: a thought bubble connects the crash with the human appearing ---------------
function ownerKneel(O, t, x, z, ry, { armsUp = 0, pet = null, look = null } = {}) {
  const ou = O.userData; ou.reset(); O.rotation.set(0, ry, 0); O.position.set(x, -0.62, z);
  ou.legs.forEach((L, i) => { L.hip.rotation.set(-0.15, (i ? 1 : -1) * 0.1, 0); L.knee.rotation.x = 1.75; L.ankle.rotation.x = 0.6; });
  ou.breathe(t, 0.3, 0.025); const q = O.quaternion;
  if (pet) { ik2(O, ou.arms[1], pet, V(0, -1, 0.3)); ou.hands[1].curl(0.25); } else ik2(O, ou.arms[1], worldPt(O, V(0.45 + 0.25 * armsUp, 1.5 + 1.35 * armsUp, 0.35)), V(1, -0.6, -0.4).applyQuaternion(q));
  ik2(O, ou.arms[0], worldPt(O, V(-0.45 - 0.25 * armsUp, 1.5 + 1.35 * armsUp, 0.35)), V(-1, -0.6, -0.4).applyQuaternion(q)); if (!pet) ou.hands.forEach(h => h.curl(0.1, 1)); else ou.hands[0].curl(0.4);
  if (look) { const hp = ou.head.getWorldPosition(new THREE.Vector3()), d = O.worldToLocal(look.clone()).sub(O.worldToLocal(hp.clone())); ou.head.rotation.y += clamp(Math.atan2(d.x, d.z), -0.8, 0.8); ou.head.rotation.x += clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 0.5); }
  return ou;
}
shot(C.and2, C.fastest, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 6; s.exposure = 0.98; s.bloom = 0.42; H.lap.visible = false;
  const bub = cloudPuffs(1.5, 1.0); s.scene.add(bub); const ic = canvasDyn(512, 300); const icM = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.73), new THREE.MeshBasicMaterial({ map: ic.t, transparent: true })); icM.position.z = 0.26; bub.add(icM);
  const trail = [0.07, 0.11].map(r => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), bub.children[0].material); s.scene.add(m); return m; });
  const draw = (k) => { const g = ic.g; g.clearRect(0, 0, 512, 300); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#2a3a44'; g.fillStyle = '#2a3a44'; g.lineWidth = 9;
    const a = clamp(k / 0.3); g.globalAlpha = a; g.save(); g.translate(92, 150); g.rotate(0.6); g.beginPath(); g.moveTo(-34, -52); g.lineTo(34, -52); g.lineTo(26, 52); g.lineTo(-26, 52); g.closePath(); g.stroke(); g.fillStyle = '#7ad0f0'; g.fillRect(-27, -8, 54, 56); g.restore(); g.strokeStyle = '#7ad0f0'; [[150, 190], [164, 222], [136, 232]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); });
    const b = clamp((k - 0.3) / 0.3); g.globalAlpha = b; g.strokeStyle = '#2a3a44'; g.beginPath(); g.moveTo(205, 150); g.lineTo(205 + 80 * b, 150); g.stroke(); if (b > 0.9) { g.beginPath(); g.moveTo(262, 126); g.lineTo(290, 150); g.lineTo(262, 174); g.stroke(); }
    const c = clamp((k - 0.6) / 0.3); g.globalAlpha = c; g.fillStyle = '#d9a441'; g.beginPath(); g.arc(400, 196, 70, Math.PI, 0); g.fill(); g.fillStyle = '#f0b48e'; g.beginPath(); g.arc(400, 118, 44, 0, 7); g.fill(); g.fillStyle = '#7a3b18'; g.beginPath(); g.arc(400, 104, 46, Math.PI, 0); g.fill(); g.fillStyle = '#ff5a3a'; g.font = 'bold 80px sans-serif'; g.textAlign = 'center'; g.fillText('!', 474, 96); g.globalAlpha = 1; ic.t.needsUpdate = true; };
  s.update = (t) => {
    const ou = ownerKneel(H.O, t, -0.7, 1.7, Math.PI - 0.3, { armsUp: 0.75 + 0.1 * Math.sin(t * 9), look: H.u.eyeW() }); ou.raise(0.8); ou.mouthOpen(0.3 + 0.15 * Math.sin(t * 8)); ou.setLid(0.05);
    H.fall(3, t); const smug = E.io(seg(t, C.learned, C.fastest));
    H.act(t, { look: headPt(H.O, V(0, 0, 0.3)), gaze: headPt(H.O, V(0, 0, 0.3)), lid: lerp(0.1, 0.45, smug), pupil: lerp(0.6, 0.25, smug), tilt: 0.12 * smug, tailSw: 0.6 });
    const c = E.io(seg(t, C.and2 - 0.2, C.fastest + 0.3)), cp = lv(V(1.7, 2.5, 4.4), V(1.5, 2.55, 4.0), c);
    const hw = H.u.W(V(0.3, 2.5, 0.1)), pop = Math.max(0.0001, spring(t, C.and2 + 0.2, 1.8, 6)); bub.position.copy(hw).add(V(0.2, 0.62, 0)); bub.scale.setScalar(pop * 0.7); bub.lookAt(cp);
    trail.forEach((m, i) => { m.position.copy(hw).add(V(0.02 + i * 0.07, 0.06 + i * 0.17, 0)); m.scale.setScalar(Math.max(0.0001, spring(t, C.and2 + 0.05 + i * 0.07, 2, 6))); });
    draw(seg(t, C.and2 + 0.35, C.learned + 0.5));
    shoot(s.cam, cp, V(0.02, 2.82, 0.3), { fov: 38, t, focus: cp.distanceTo(H.u.eyeW()) });
  };
});
// 13) the fastest way to get your attention: chin scratches, and one smug eye for the camera ----------
shot(C.fastest, C.in1, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 7; s.exposure = 0.98; s.bloom = 0.42; H.lap.visible = false; H.glass.g.visible = false;
  s.update = (t) => {
    H.fall(4, t); const cp = lv(V(0.7, 2.35, 3.7), V(0.55, 2.32, 3.3), E.io(seg(t, C.fastest - 0.2, C.in1 + 0.3)));
    const bliss = E.io(seg(t, C.fastest, C.way + 0.2)), wink = E.io(seg(t, C.attention - 0.05, C.attention + 0.3)), purr = 0.006 * Math.sin(t * 60);
    H.act(t, { look: cp, lookK: 0.5 + 0.5 * wink, gaze: cp, tilt: -0.22 * bliss, lid: lerp(0.3, 0.95, bliss), low: 0.5 * bliss, pupil: 0.3, tailSw: 0.7, off: V(purr, 0, 0) });
    H.u.lids[1].rotation.x = lerp(-0.8, 1.45, lerp(0.95, 0.42, wink) * bliss + 0.3 * (1 - bliss));
    const top = H.u.W(V(-0.25, 2.42 + 0.03 * Math.sin(t * 7), 0.05)); const ou = ownerKneel(H.O, t, -1.02, 0.8, 2.25, { pet: top, look: H.u.eyeW() }); ou.smile(0.9); ou.lid(0.25, t, 1); ou.head.rotation.z += -0.12;
    shoot(s.cam, cp, H.u.eyeW().add(V(-0.3, -0.12, 0)), { fov: 36, t, focus: cp.distanceTo(H.u.eyeW()) });
  };
});
// 14-16) the study: food, toy, scent or a human -----------------------------------------------------
function labSet(s) {
  const sc = s.scene; const R = lab(sc); const cat = makeCat2(); cat.scale.setScalar(0.62); sc.add(cat); const u = cat.userData;
  const sci = makeKid({ shirt: 0xf5f5f5, pants: 0x3a4a5a, hair: 0x1a1210, skin: 0x8d5a3b, style: 'curly', glasses: true, coat: true, s: 1.0, hs: 1.0 }); addSmile(sci); sc.add(sci);
  const tGo = C.half - 0.25, tArr = C.human - 0.1, Z0 = 1.15, Z1 = -1.2;
  const H = {
    R, cat, u, sci, tGo, tArr,
    act(t, cam) {
      const su = sci.userData; su.reset(); sci.position.set(R.P.human.x, -1.3 + 0.2, R.P.human.z - 0.25); sci.rotation.set(0, 0, 0);
      su.legs.forEach((L, i) => { const sx = i ? 1 : -1; L.hip.rotation.set(-1.5, sx * 0.75, 0); L.knee.rotation.x = 2.2; });
      su.breathe(t, 0.3, 0.02); su.smile(0.6 + 0.4 * smooth(tArr, tArr + 0.4, t)); su.lid(0.15, t, 3);
      const go = E.io(seg(t, tGo, tArr)), z = lerp(Z0, Z1, go), arrived = smooth(tArr - 0.1, tArr + 0.3, t), walking = go > 0 && go < 1 ? 1 : 0;
      cat.position.set(0.1 * Math.sin(go * 6) * walking, 0, z); cat.rotation.set(0, Math.PI + 0.15 * arrived, 0);
      u.pose({ sit: 1 - smooth(tGo - 0.15, tGo + 0.1, t) + smooth(tArr + 0.5, tArr + 0.9, t) * 0, stand: smooth(tGo - 0.15, tGo + 0.1, t) });
      const speed = (Z0 - Z1) / (tArr - tGo), ph = (t - tGo) * Math.PI * speed / (2 * 0.26 * 0.62);
      if (walking) u.legs.forEach((L, i) => { const f = ((ph + ((i === 0 || i === 3) ? 0 : Math.PI)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); L.T.z += 0.26 * (f < Math.PI ? -Math.cos(f) : Math.cos(f - Math.PI)); L.T.y += f < Math.PI ? 0.14 * Math.sin(f) : 0; });
      u.solve().breathe(t).lid(lerp(0.15, 0.8, arrived), 0.3 * arrived).pupil(0.35).ears(0).whisk(0.3);
      u.tailRest(t, 0.35); if (walking) cat.position.y = 0.02 * Math.abs(Math.sin(ph));
      // before it starts: looks at the food, then the toy; then walks straight to the human and rubs a cheek on the hand
      const hand = worldPt(sci, V(0.2, 1.05, 0.95));
      const lk = t < tGo ? (t < tGo - 0.45 ? R.P.food.clone().add(V(0, 0.3, 0)) : R.P.toy.clone().add(V(0, 0.3, 0))) : hand;
      u.look(lk, 1, 0.3 * arrived * Math.sin(t * 5), 1.0, 0.6).gaze(lk);
      ik2(sci, su.arms[1], lv(worldPt(sci, V(0.45, 1.3, 0.7)), u.eyeW().add(V(0.05, 0.12, 0.0)), arrived), V(1, -1, 0)); su.hands[1].curl(0.3, 0.5);
      ik2(sci, su.arms[0], worldPt(sci, V(-0.5, 1.25, 0.55)), V(-1, -1, 0)); su.hands[0].curl(0.5);
      const hl = u.eyeW(); const hp = su.head.getWorldPosition(new THREE.Vector3()), d = hl.clone().sub(hp); su.head.rotation.y += clamp(Math.atan2(d.x, d.z), -0.6, 0.6); su.head.rotation.x += clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.3, 0.6);
      // result numbers pop up over each station
      const pops = { human: C.over + 0.04, food: C.food + 0.05, toy: C.toys - 0.08, scent: C.toys + 0.17 }, hgt = { human: 2.95, food: 0.95, toy: 0.9, scent: 0.75 };
      Object.keys(R.num).forEach(k => { const m = R.num[k]; m.position.copy(R.P[k]).add(V(0, hgt[k], 0)); m.scale.setScalar(Math.max(0.0001, spring(t, pops[k], 1.8, 6))); m.lookAt(cam.position); });
    },
  };
  return H;
}
shot(C.in1, C.half, (s) => { const L = labSet(s); s.ap = 3; s.exposure = 1.0; s.update = (t) => { const c = E.io(seg(t, C.in1 - 0.2, C.half + 0.3)); shoot(s.cam, lv(V(0.3, 9.0, 5.6), V(0.25, 8.0, 5.0), c), V(0, 0.3, 0.15), { fov: 40, t }); L.act(t, s.cam); }; });
shot(C.half, C.over, (s) => { const L = labSet(s); s.ap = 5; s.exposure = 1.0; s.update = (t) => { const c = E.io(seg(t, C.half - 0.2, C.over + 0.3)); const cz = L.cat.position.z; shoot(s.cam, lv(V(2.6, 3.0, 4.0), V(2.0, 2.4, 1.9), c), lv(V(0, 0.8, 0.6), V(0, 1.45, -1.7), c), { fov: 40, t }); L.act(t, s.cam); }; });
shot(C.over, C.so2, (s) => { const L = labSet(s); s.ap = 8; s.exposure = 1.0; s.update = (t) => { const c = E.io(seg(t, C.over - 0.2, C.so2 + 0.3)); shoot(s.cam, lv(V(2.6, 5.4, 8.4), V(2.3, 5.0, 7.7), c), V(0, 1.75, -0.2), { fov: 40, t, focus: lv(V(2.6, 5.4, 8.2), V(2.3, 5.0, 7.5), c).distanceTo(V(0, 0.9, -1.4)) }); L.act(t, s.cam); }; });
// 17) so the more you react -------------------------------------------------------------------------
shot(C.so2, C.react + 0.42, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 5; s.exposure = 0.98; s.bloom = 0.42; H.lap.visible = false;
  s.update = (t) => {
    H.fall(5, t); const up = clamp(spring(t, C.more - 0.1, 2, 5));
    const ou = ownerKneel(H.O, t, 0.2, 1.9, Math.PI, { armsUp: up, look: H.u.eyeW() }); ou.wince(0.7 * up); ou.mouthOpen(0.4 * up); ou.setLid(0.2); ou.head.rotation.z += 0.1 * Math.sin(t * 9) * up;
    const oh = headPt(H.O, V(0, 0, 0.3)); H.act(t, { look: oh, gaze: oh, lean: 0.5, lid: 0.45, pupil: 0.25, tilt: 0.1, tailSw: 0.7 });
    const c = E.io(seg(t, C.so2 - 0.2, C.react + 0.6)); shoot(s.cam, lv(V(-2.0, 3.3, -1.5), V(-1.8, 3.2, -1.3), c), V(-0.15, 1.7, 1.0), { fov: 40, t, focus: lv(V(-2.0, 3.3, -1.5), V(-1.8, 3.2, -1.3), c).distanceTo(oh) });
  };
});
// 18) the more often... a fresh glass, and the paw is already on it (matches frame one) --------------
shot(C.react + 0.42, C.end + 0.3, (s) => {
  const H = heroSet(s, { owner: true }); s.ap = 6; s.exposure = 0.98; s.bloom = 0.4; H.lap.visible = false;
  const T0 = C.react + 0.42, T1 = C.end;
  s.update = (t) => {
    const tt = t - T1; H.stand(G0, tt, 0.6 * Math.exp(-(t - T0) * 5));
    const away = E.io(seg(t, T0 + 0.05, T0 + 0.5)), pawUp = E.io(seg(t, T0 + 0.3, T1 - 0.2)), rest = H.u.W(V(0.17, 0.03, 0.4));
    const ou = ownerKneel(H.O, t, lerp(1.05, 1.9, away), 1.35, Math.PI + 0.35); const grip = lv(G0.clone().add(V(0.14, GH * 0.6, 0.06)), V(1.7, 1.2, 1.6), away);
    ik2(H.O, ou.arms[1], grip, V(0.3, -1, 0.3)); ou.hands[1].curl(lerp(0.6, 0.3, away));
    const c = E.io(seg(t, T0 - 0.1, T1)), cp = lv(V(0.4, 2.2, 4.6), OPEN[0], c);
    const pawT = lv(rest, H.rimPaw(G0), pawUp).add(V(0, 0.14 * Math.sin(Math.PI * pawUp), 0));
    H.act(tt, { paw: pawT, pawPitch: 0.55 * pawUp, look: lv(G0.clone().add(V(0, 0.4, 0)), cp, E.io(seg(t, T0 + 0.45, T1 - 0.15))), gaze: cp, tilt: 0.1 * pawUp, lid: 0.3, pupil: 0.2 });
    shoot(s.cam, cp, lv(V(0.05, 1.8, 0.25), OPEN[1], c), { fov: 34, t: tt, focus: cp.distanceTo(H.u.eyeW()) });
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
const TR = { 3: [C.yousee - 0.14, C.yousee + 0.16, 3], 9: [C.but - 0.1, C.but + 0.22, 1], 14: [C.in1 - 0.12, C.in1 + 0.18, 4], 17: [C.so2 - 0.1, C.so2 + 0.22, 1] };

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
