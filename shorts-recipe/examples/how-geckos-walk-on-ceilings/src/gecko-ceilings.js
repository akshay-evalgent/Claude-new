// "How Geckos Walk on Ceilings": a photoreal 9:16 short. three.js, rendered headless frame by frame.
// A room at night by the fire (HDR), a scanned ceiling, light socket, bulb and cement bag from Poly Haven; a procedural tokay gecko, setae and atoms.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GroundProjectedSkybox } from 'three/addons/objects/GroundProjectedSkybox.js';

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
  a: 0.03, gecko: 0.16, could: 0.39, hang: 0.76, from: 1.00, your: 1.24, ceiling: 1.42, all: 1.74, day: 2.12, with: 2.46, no: 2.68, glue: 2.96,
  at: 3.20, all2: 3.38, look: 4.01, closer: 4.28, at2: 4.64, its: 4.88, toes: 5.08, theyre: 6.15, lined: 6.32, with2: 6.58, ridges: 6.84,
  covered: 7.50, in: 7.72, about: 7.98, two: 8.36, million: 8.56, tiny: 8.96, hairs: 9.38, each: 10.40, hair: 10.58, splits: 10.86, into: 11.09,
  hundreds: 11.54, of: 11.88, even: 12.12, tinier: 12.42, tips: 12.90, theyre2: 13.70, so: 13.86, small: 14.08, they: 14.60, get: 14.84, close: 15.06,
  enough: 15.30, for: 15.58, the: 15.80, molecules: 15.92, themselves: 16.40, to: 17.00, pull: 17.36, together: 17.54, a2: 18.43, patch: 18.54,
  of2: 18.78, hairs2: 18.96, the2: 19.22, size: 19.50, of3: 19.88, a3: 20.06, coin: 20.18, could2: 20.52, lift: 20.76, a4: 21.04, small2: 21.26,
  child: 21.60, to2: 22.62, let: 22.72, go: 22.88, a5: 23.62, gecko2: 23.74, simply: 23.98, peels: 24.58, its2: 25.08, toes2: 25.26, back: 25.58,
  like: 25.98, tape: 26.38, up: 26.71, to3: 27.00, fifteen: 27.30, times: 27.68, a6: 28.10, second: 28.36, so2: 29.09, if: 29.24, one: 29.36,
  ever: 29.56, lands: 29.82, on: 30.10, your2: 30.32, ceiling2: 30.46, dont: 30.90, wait: 31.38, for2: 31.52, it: 31.76, to4: 31.86, fall: 32.02,
  because: 32.32,
  end: 32.7667,
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
  g.lineWidth = 22; g.lineJoin = 'round'; g.strokeStyle = stroke; g.strokeText(text, 512, 132); g.fillStyle = color; g.fillText(text, 512, 132);
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
// REAL ASSETS (all CC0, from Poly Haven): a room lit by a fireplace at night and a small studio (HDR environments), a scanned
// ceiling texture, a pull-chain light socket and bulb, a cement bag and a potted plant. Loaded once before the first frame.
// Scenes are in centimetres (the micro scenes in micrometres), so models are scaled up from metres.
// =====================================================================
const AS = 'assets/';
const rgbeL = new RGBELoader(), gltfL = new GLTFLoader(), texL = new THREE.TextureLoader();
async function loadHDR(file) {
  const t = await rgbeL.loadAsync(AS + file); t.mapping = THREE.EquirectangularReflectionMapping;
  return { tex: t, env: pmrem.fromEquirectangular(t).texture };
}
async function loadModel(id) {
  const g = await gltfL.loadAsync(`${AS}${id}/${id}.gltf`);
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material.map) o.material.map.anisotropy = 8; } });
  return g.scene;
}
async function loadTex(path, srgb = true) {
  const t = await texL.loadAsync(AS + path); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
// a PBR set: albedo (or a grey detail map to tint), normal, roughness, ao
async function loadPBR(id, { detail = false } = {}) {
  const [map, normalMap, roughnessMap, aoMap] = await Promise.all([loadTex(`${id}/${detail ? 'Detail' : 'Diffuse'}.jpg`), loadTex(`${id}/nor_gl.jpg`, false), loadTex(`${id}/Rough.jpg`, false), loadTex(`${id}/AO.jpg`, false)]);
  return { map, normalMap, roughnessMap, aoMap };
}
// a material from a PBR set, with its own repeat (textures are cloned so repeats don't clash)
function pbrMat(set, { rep = [1, 1], color = 0xffffff, normal = 1, rough = 1, phys = false, ...extra } = {}) {
  const c = (t) => { if (!t) return null; const k = t.clone(); k.repeat.set(rep[0], rep[1]); k.needsUpdate = true; return k; };
  const M_ = phys ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  return new M_({ map: c(set.map), normalMap: c(set.normalMap), roughnessMap: c(set.roughnessMap), color, roughness: rough, normalScale: new THREE.Vector2(normal, normal), ...extra });
}
const [FIRE, STUDIO] = await Promise.all(['fireplace_2k.hdr', 'studio_small_09_1k.hdr'].map(loadHDR));
const MOD = {};
await Promise.all(['pull_chain_light_socket', 'lightbulb_01', 'cement_bag', 'potted_plant_01'].map(async id => { MOD[id] = await loadModel(id); }));
const TX = {}; TX.ceiling = await loadPBR('ceiling_interior');
const model = (id, s = 100) => { const m = MOD[id].clone(true); m.scale.setScalar(s); return m; };
const part = (root, name) => { let f = null; root.traverse(o => { if (o.name === name) f = o; }); return f; };

// ---------- shared scene helpers (shot list, label pinning, canvas textures, moving tubes, live labels) ----------
const shots = [];
function shot(start, end, build, { near = 0.02, far = 6000 } = {}) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, ASPECT, near, far) }; build(s); shots.push(s); return s; }
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const texOf = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
function heightToNormal(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const im = g.createImageData(w, h);
  const Hh = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (Hh(x + 1, y) - Hh(x - 1, y)) * strength, dy = (Hh(x, y + 1) - Hh(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4; im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function ptFrames(curve, n) {
  const P = [], T = [], N = [], B = [];
  for (let i = 0; i <= n; i++) { P.push(curve.getPointAt(i / n)); T.push(curve.getTangentAt(i / n).normalize()); }
  let up = Math.abs(T[0].y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  N.push(up.clone().sub(T[0].clone().multiplyScalar(up.dot(T[0]))).normalize()); B.push(T[0].clone().cross(N[0]));
  for (let i = 1; i <= n; i++) { const ax = T[i - 1].clone().cross(T[i]), s = ax.length(); const nn = N[i - 1].clone();
    if (s > 1e-6) nn.applyAxisAngle(ax.normalize(), Math.asin(clamp(s, -1, 1)) * (T[i - 1].dot(T[i]) < 0 ? -1 : 1));
    nn.sub(T[i].clone().multiplyScalar(nn.dot(T[i]))).normalize(); N.push(nn); B.push(T[i].clone().cross(nn)); }
  return { P, T, N, B };
}
// a tube rebuilt every frame along a moving curve: radius(u, th)
function dynTube(nu, nv, mat, uvRep = [1, 1]) {
  const cols = nv + 1, pos = new Float32Array((nu + 1) * cols * 3), uv = new Float32Array((nu + 1) * cols * 2), idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const k = i * cols + j; uv[k * 2] = i / nu * uvRep[0]; uv[k * 2 + 1] = j / nv * uvRep[1]; }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
  m.userData.update = (curve, rad, upHint = null) => { const F = ptFrames(curve, nu); m.userData.F = F;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const th = 2 * Math.PI * j / nv, r = rad(i / nu, th), k = (i * cols + j) * 3, c = Math.cos(th), s = Math.sin(th);
      pos[k] = F.P[i].x + (F.N[i].x * c + F.B[i].x * s) * r; pos[k + 1] = F.P[i].y + (F.N[i].y * c + F.B[i].y * s) * r; pos[k + 2] = F.P[i].z + (F.N[i].z * c + F.B[i].z * s) * r; }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    const nr = geo.attributes.normal.array; for (let i = 0; i <= nu; i++) { const a = i * cols * 3, b = (i * cols + nv) * 3; for (let q = 0; q < 3; q++) { const mm = (nr[a + q] + nr[b + q]) / 2; nr[a + q] = nr[b + q] = mm; } } };
  return m;
}

function liveLabel(w = 0.5, aspect = 0.28) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * aspect); const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * aspect), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  m.renderOrder = 20; m.userData.dofMap = tex; let last = null;
  m.userData.set = (lines) => { const key = JSON.stringify(lines); if (key === last) return; last = key; g.clearRect(0, 0, c.width, c.height);
    for (const [txt, size, y, col, wt, passes] of lines) { g.font = `${wt || 800} ${size}px "Nunito", "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 22; g.lineJoin = 'round'; g.lineWidth = size * 0.09; g.strokeStyle = 'rgba(0,0,0,0.42)'; g.strokeText(txt, c.width / 2, y * c.height); g.fillStyle = col || '#ffffff'; for (let i = 0; i < (passes || 1); i++) g.fillText(txt, c.width / 2, y * c.height); }
    tex.needsUpdate = true; };
  return m;
}

// pin a label in front of the camera at the focus distance (so depth of field keeps it sharp), scaled to look the same size
function pinF(cam, lab, x, y, d0, k = 1) { const d = cam.userData.focus || d0, f = d / d0; pin(cam, lab, x * f, y * f, d); lab.scale.setScalar(Math.max(1e-4, k * f)); }
// put a label in the shot's overlay (drawn after depth of field)
function OV(s, ...ms) { if (!s.overlay) s.overlay = new THREE.Scene(); ms.forEach(m => s.overlay.add(m)); return ms[0]; }

// =====================================================================
// THE MOSQUITO: a female Aedes aegypti, in centimetres (+x head, +y up). A scaled thorax with the white lyre, a
// banded abdomen that swells red as she feeds (the plates spread apart over a stretched, blood-filled membrane),
// faceted compound eyes, antennae with whorls of hairs (bushy on the male), palps, a proboscis whose sheath bows
// back while the needle goes in, six banded legs placed by IK, wings that fold at rest and blur in flight.
// Also: ball-and-stick molecules (merged into single meshes).
// =====================================================================
const V2 = (x, y) => new THREE.Vector2(x, y);
const hCanvas = (w, h, draw) => { const [c, g] = mkCanvas(w, h); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); draw(g, w, h); return c; };
const rep = (t, x, y) => { const k = t.clone(); k.repeat.set(x, y); k.wrapS = k.wrapT = THREE.RepeatWrapping; k.needsUpdate = true; return k; };
// overlapping cuticle scales
const SCALE_N = heightToNormal(hCanvas(512, 512, (g, w, h) => { const r = rng(31);
  for (let row = 0; row < 42; row++) for (let i = 0; i < 28; i++) { const x = (i + (row % 2) * 0.5) * w / 28 + (r() - 0.5) * 4, y = row * h / 42 + (r() - 0.5) * 3;
    const gr = g.createLinearGradient(x, y - 9, x, y + 9); gr.addColorStop(0, '#5a5a5a'); gr.addColorStop(0.72, '#d0d0d0'); gr.addColorStop(1, '#8a8a8a');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 10.5, 8.5, 0, 0, 7); g.fill(); } }), 2.2);
// hexagonal facets of the compound eye
const FACET_N = heightToNormal(hCanvas(256, 256, (g, w, h) => { const s = 8, hh = s * 0.866;
  for (let y = -1; y < h / hh + 1; y++) for (let x = -1; x < w / s + 1; x++) { const cx = x * s + (y % 2) * s / 2, cy = y * hh, gr = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.56);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.8, '#9a9a9a'); gr.addColorStop(1, '#303030'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, s * 0.56, 0, 7); g.fill(); } }), 3);
// fine noise for organic surfaces
const GRAIN_N = heightToNormal(hCanvas(256, 256, (g, w, h) => { const r = rng(5); for (let i = 0; i < 9000; i++) { const v = 90 + r() * 80 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }), 1.5);

// thorax: dark scales with the white lyre, painted in a top-down projection (x: back -> front, y: right -> left)
const THORAX_T = (() => { const [c, g] = mkCanvas(512, 512), r = rng(3); g.fillStyle = '#2c2119'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(92,66,44,0.4)' : 'rgba(10,7,5,0.45)'; g.fillRect(r() * 512, r() * 512, 2 + r() * 3, 1 + r() * 2); }
  g.strokeStyle = 'rgba(238,232,220,0.95)'; g.lineCap = 'round'; g.shadowColor = 'rgba(238,232,220,0.6)'; g.shadowBlur = 6;
  for (const s of [-1, 1]) { g.lineWidth = 15; g.beginPath(); g.moveTo(410, 256 + s * 70); g.bezierCurveTo(330, 256 + s * 175, 200, 256 + s * 165, 120, 256 + s * 88); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(400, 256 + s * 16); g.lineTo(110, 256 + s * 14); g.stroke(); }
  g.shadowBlur = 0; g.fillStyle = 'rgba(225,222,215,0.9)'; for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(120 + i * 70, 256 + s * (228 + r() * 12), 22, 12, 0, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(232,230,222,0.9)'; g.beginPath(); g.ellipse(70, 256, 30, 46, 0, 0, 7); g.fill();
  return texOf(c); })();
// abdomen plate: u around (dorsal at 0.75), v along (front at 1): black with a white basal band and silver side spots, paler underneath
const PLATE_T = (() => { const [c, g] = mkCanvas(256, 128), r = rng(4); g.fillStyle = '#261c15'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = 'rgba(70,60,52,0.9)'; g.fillRect(20, 0, 70, 128);
  { const gr = g.createLinearGradient(0, 0, 0, 30); gr.addColorStop(0, 'rgba(200,196,188,0.9)'); gr.addColorStop(1, 'rgba(200,196,188,0)'); g.fillStyle = gr; g.fillRect(150, 0, 84, 30); }
  for (const u of [0, 128, 256]) { const gr = g.createRadialGradient(u, 30, 2, u, 30, 40); gr.addColorStop(0, 'rgba(190,192,196,0.75)'); gr.addColorStop(1, 'rgba(190,192,196,0)'); g.fillStyle = gr; g.fillRect(u - 42, 0, 84, 80); }
  for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(120,110,100,0.18)'; g.fillRect(r() * 256, r() * 128, 2, 1); }
  return texOf(c); })();
// one leg's bands along its length (u): black, a white knee spot, white rings at the base of the tarsal segments
function legTex(f1, f2, hind) { const [c, g] = mkCanvas(1024, 4); g.fillStyle = '#16120e'; g.fillRect(0, 0, 1024, 4);
  g.fillStyle = '#4a3c30'; g.fillRect(0, 0, f1 * 1024 * 0.55, 4);
  g.fillStyle = '#ece8df'; g.fillRect((f1 - 0.012) * 1024, 0, 0.016 * 1024, 4);
  const segs = [0.38, 0.22, 0.16, 0.12, 0.12]; let u = f2; const L = 1 - f2;
  segs.forEach((s, i) => { const w = s * L; if (hind && i === 4) { g.fillRect(u * 1024, 0, w * 1024, 4); } else if (hind || i < 2) g.fillRect(u * 1024, 0, w * 0.3 * 1024, 4); u += w; });
  const t = texOf(c); t.wrapS = THREE.ClampToEdgeWrapping; return t; }
// wing: veins lined with scales, a fringe of scales on the trailing edge, a clear membrane; plus a solid mask for depth
function wingCanvas(mask) { const [c, g] = mkCanvas(1024, 256), r = rng(8); const out = (u) => 0.5 + 0.42 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.9) * (u < 0.08 ? u / 0.08 : 1);
  const lead = (u) => 0.5 + 0.3 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.1) * (u < 0.05 ? u / 0.05 : 1);
  const P = (u, k) => [u * 1000 + 12, (lead(u) + (out(u) - lead(u)) * 0 - (lead(u) - 0.5) * 0 - k) * 256];
  g.beginPath(); for (let i = 0; i <= 100; i++) { const u = i / 100; g.lineTo(u * 1000 + 12, (1 - lead(u)) * 256); } for (let i = 100; i >= 0; i--) { const u = i / 100; g.lineTo(u * 1000 + 12, out(u) * 256 + (1 - out(u)) * 0); } g.closePath();
  if (mask) { g.fillStyle = '#fff'; g.fill(); return c; }
  g.fillStyle = 'rgba(205,205,212,0.13)'; g.fill(); g.save(); g.clip();
  // veins: lines fanning out from the base, some forking
  const vein = (pts, w) => { g.strokeStyle = 'rgba(38,28,20,0.92)'; g.lineWidth = w; g.beginPath(); pts.forEach(([u, v], i) => i ? g.lineTo(u * 1000 + 12, v * 256) : g.moveTo(u * 1000 + 12, v * 256)); g.stroke();
    for (let i = 0; i < 26; i++) { const k = r(), j = Math.floor(k * (pts.length - 1)), f = k * (pts.length - 1) - j, a = pts[j], b = pts[j + 1]; const x = lerp(a[0], b[0], f) * 1000 + 12, y = lerp(a[1], b[1], f) * 256; g.fillStyle = 'rgba(30,22,16,0.85)'; g.beginPath(); g.ellipse(x, y, 4, 2, (r() - 0.5) * 0.8, 0, 7); g.fill(); } };
  const ld = (u) => 1 - lead(u), od = (u) => out(u);
  vein([[0, 0.5], [0.3, ld(0.3) + 0.01], [0.7, ld(0.7) + 0.005], [1, 0.5]], 4);
  vein([[0.02, 0.5], [0.45, ld(0.45) + 0.06], [0.6, ld(0.6) + 0.04]], 3);
  vein([[0.03, 0.52], [0.5, 0.36], [0.97, 0.45]], 3); vein([[0.5, 0.36], [0.98, 0.39]], 2.5);
  vein([[0.04, 0.53], [0.55, 0.47], [0.9, 0.5]], 3); vein([[0.55, 0.47], [0.95, 0.55]], 2.5);
  vein([[0.05, 0.55], [0.5, 0.6], [0.85, 0.66]], 3); vein([[0.5, 0.6], [0.78, 0.74]], 2.5);
  vein([[0.06, 0.58], [0.4, 0.7], [0.6, od(0.6) - 0.02]], 2.5); vein([[0.08, 0.6], [0.3, od(0.3) - 0.03]], 2.5);
  vein([[0.45, 0.36], [0.47, 0.6]], 1.5); vein([[0.58, 0.47], [0.6, 0.6]], 1.5);
  g.restore();
  // fringe of long scales along the trailing edge
  for (let i = 0; i < 260; i++) { const u = 0.08 + 0.92 * i / 260, x = u * 1000 + 12, y = out(u) * 256; g.strokeStyle = `rgba(30,24,18,${0.5 + r() * 0.4})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x - 6 - r() * 4, y + 10 + r() * 12 * Math.sin(Math.PI * u)); g.stroke(); }
  return c; }
const WING_T = texOf(wingCanvas(false)), WING_MASK = texOf(wingCanvas(true), false);
// a female's short palp / the proboscis: dark, white palp tips
const PALP_T = (() => { const [c, g] = mkCanvas(256, 4); g.fillStyle = '#17130f'; g.fillRect(0, 0, 256, 4); g.fillStyle = '#ece8e0'; g.fillRect(190, 0, 66, 4); const t = texOf(c); t.wrapS = THREE.ClampToEdgeWrapping; return t; })();

// ---------- geometry helpers ----------
// a thin tapering hair along +y (base at the origin), for instancing
const HAIR_GEO = (() => { const g = new THREE.CylinderGeometry(0.25, 1, 1, 4, 1); g.translate(0, 0.5, 0); return g; })();
function instHairs(list, mat, radius = 0.0006) {   // list: [{p, dir, len}]
  const m = new THREE.InstancedMesh(HAIR_GEO, mat, Math.max(1, list.length)), q = new THREE.Quaternion(), M4 = new THREE.Matrix4();
  list.forEach((h, i) => { q.setFromUnitVectors(V(0, 1, 0), h.dir.clone().normalize()); M4.compose(h.p, q, V(radius, h.len, radius)); m.setMatrixAt(i, M4); });
  m.count = list.length; m.castShadow = true; m.frustumCulled = false; return m; }
// two-bone IK: the knee between base B and ankle A, bent toward the pole
function ik2(B, A, L1, L2, pole) { const d0 = A.clone().sub(B), d = clamp(d0.length(), 1e-4, (L1 + L2) * 0.999), dir = d0.normalize();
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(L1 * L1 - a * a, 0)); const p = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  return B.clone().add(dir.clone().multiplyScalar(a)).add(p.multiplyScalar(h)); }

// ---------- the mosquito ----------
const MQM = {
  scale: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: THORAX_T, roughness: 0.78, normalMap: rep(SCALE_N, 3, 3), normalScale: V2(0.9, 0.9), sheen: 0.3, sheenColor: new THREE.Color(0x8a7a68), sheenRoughness: 0.6, envMapIntensity: 0.7 }),
  dark: () => new THREE.MeshPhysicalMaterial({ color: 0x18130f, roughness: 0.45, normalMap: rep(SCALE_N, 4, 4), normalScale: V2(0.6, 0.6), clearcoat: 0.3, clearcoatRoughness: 0.35, sheen: 0.45, sheenColor: new THREE.Color(0x8a7a6a), sheenRoughness: 0.5 }),
  eye: () => new THREE.MeshPhysicalMaterial({ color: 0x1a120c, roughness: 0.28, normalMap: rep(FACET_N, 7, 4), normalScale: V2(0.9, 0.9), clearcoat: 0.8, clearcoatRoughness: 0.2, iridescence: 0.8, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 520], sheen: 0.3, sheenColor: new THREE.Color(0x40ffb0) }),
  wing: () => new THREE.MeshPhysicalMaterial({ map: WING_T, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.12, metalness: 0.0, iridescence: 1.0, iridescenceIOR: 1.35, iridescenceThicknessRange: [260, 640], clearcoat: 0.4, envMapIntensity: 1.4 }),
  hair: () => new THREE.MeshPhysicalMaterial({ color: 0x2a2018, roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0xb09a80) }),
  blood: () => new THREE.MeshPhysicalMaterial({ color: 0x6a5a50, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x000000, sheen: 0.7, sheenColor: new THREE.Color(0xff3020), sheenRoughness: 0.3, normalMap: rep(GRAIN_N, 3, 3), normalScale: V2(0.3, 0.3) }),
  egg: () => new THREE.MeshPhysicalMaterial({ color: 0xf4f0e4, roughness: 0.35, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), emissive: 0x2a2620, emissiveIntensity: 0.5 }),
};
// a beating wing seen at 1/60 s: a soft translucent sector, denser at the ends of the stroke where the wing slows
const FAN_T = (() => { const [c, g] = mkCanvas(256, 128); const im = g.createImageData(256, 128); for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) { const u = x / 255, v = y / 127, k = (y * 256 + x) * 4;
  const ends = 0.35 + 0.65 * (Math.pow(Math.abs(u - 0.5) * 2, 3)), radial = Math.sin(Math.PI * Math.min(1, v * 1.05)) ** 0.5 * (v > 0.08 ? 1 : v / 0.08); const vein = 0.85 + 0.15 * Math.sin(v * 60);
  im.data[k] = 150; im.data[k + 1] = 156; im.data[k + 2] = 166; im.data[k + 3] = 255 * clamp(0.42 * ends * radial * vein); } g.putImageData(im, 0, 0); return texOf(c, false); })();
const FAN_GEO = (() => { const g = new THREE.BufferGeometry(), P = [], U = [], I = [], nA = 24, nR = 6, a0 = 0.35, a1 = 1.95, L = 0.3;
  for (let i = 0; i <= nA; i++) for (let j = 0; j <= nR; j++) { const a = lerp(a0, a1, i / nA), r = L * j / nR; P.push(-Math.cos(a) * r, 0.02 * Math.sin(a * 2) * r, Math.sin(a) * r); U.push(i / nA, j / nR); }
  for (let i = 0; i < nA; i++) for (let j = 0; j < nR; j++) { const A = i * (nR + 1) + j, B = A + 1, Cc = A + nR + 1, D = Cc + 1; I.push(A, Cc, B, B, Cc, D); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g; })();
const FAN_M = new THREE.MeshBasicMaterial({ map: FAN_T, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff });
const LEGS = [ // base (on the thorax), segment lengths, foot when standing, side
  { b: V(0.040, -0.046, 0.018), L: [0.24, 0.24, 0.30], foot: V(0.47, 0, 0.2), kind: 'front' },
  { b: V(0.004, -0.052, 0.024), L: [0.26, 0.27, 0.31], foot: V(-0.06, 0, 0.44), kind: 'mid' },
  { b: V(-0.032, -0.046, 0.021), L: [0.28, 0.30, 0.38], foot: null, kind: 'hind' },
];
function makeMosquito({ male = false, seed = 1 } = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); const r = rng(seed);
  // thorax: a humped ellipsoid, top-projected UVs for the lyre pattern
  const tg = new THREE.SphereGeometry(1, 56, 40), tp = tg.attributes.position, tuv = tg.attributes.uv;
  for (let i = 0; i < tp.count; i++) { let x = tp.getX(i) * 0.074, y = tp.getY(i) * 0.05, z = tp.getZ(i) * 0.044; if (y > 0) y += 0.014 * (1 - (x / 0.078) ** 2) + 0.006 * Math.max(0, x / 0.078); if (y < 0) y *= 0.9 - 0.15 * Math.max(0, -x / 0.078);
    tp.setXYZ(i, x, y, z); tuv.setXY(i, x / 0.17 + 0.5, z / 0.115 + 0.5); }
  tg.computeVertexNormals(); const thorax = new THREE.Mesh(tg, MQM.scale()); thorax.position.set(0.012, 0, 0); body.add(thorax);
  const scutel = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), MQM.dark()); scutel.scale.set(0.016, 0.012, 0.03); scutel.position.set(-0.064, 0.05, 0); body.add(scutel);
  // bristles on the thorax
  const br = []; for (let i = 0; i < 130; i++) { const a = r() * Math.PI, side = r() < 0.5 ? -1 : 1, x = 0.012 + (r() - 0.4) * 0.12; br.push({ p: V(x, 0.045 + 0.02 * Math.sin(a), side * (0.03 + 0.02 * r())), dir: V(-0.4 - r() * 0.4, 0.6 + r() * 0.4, side * (0.2 + r() * 0.5)), len: 0.016 + r() * 0.02 }); }
  body.add(instHairs(br, MQM.hair(), 0.0009));
  // head: two big faceted eyes and a scaled crown
  const head = new THREE.Group(); head.position.set(0.098, -0.026, 0); body.add(head);
  const eyeM = MQM.eye(); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.028, 40, 30), eyeM); e.position.set(0.012, 0, s * 0.011); e.scale.set(1, 1.05, 0.92); head.add(e); }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.02, 24, 18), new THREE.MeshPhysicalMaterial({ color: 0x4a4440, roughness: 0.5, normalMap: rep(SCALE_N, 2, 2), sheen: 0.8, sheenColor: new THREE.Color(0xe8e4dc) })); crown.position.set(0.0, 0.012, 0); crown.scale.set(1.2, 0.8, 0.8); head.add(crown);
  const clyp = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 12), MQM.dark()); clyp.position.set(0.037, -0.012, 0); head.add(clyp);
  // antennae: a shaft with whorls of hairs (short on the female, long and bushy on the male)
  const antG = new THREE.Group(); head.add(antG); const antHairs = [];
  for (const s of [-1, 1]) { const base = V(0.036, 0.006, s * 0.007), dir = V(0.82, 0.22, s * 0.5).normalize();
    const ped = new THREE.Mesh(new THREE.SphereGeometry(male ? 0.012 : 0.0075, 16, 12), new THREE.MeshPhysicalMaterial({ color: male ? 0x4a3a2a : 0x2a221c, roughness: 0.4, clearcoat: 0.6 })); ped.position.copy(base); antG.add(ped);
    const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(base.clone().add(dir.clone().multiplyScalar(k * (male ? 0.2 : 0.17))).add(V(0, -0.02 * k * k, 0))); }
    const cv = new THREE.CatmullRomCurve3(pts); antG.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 32, male ? 0.0018 : 0.0016, 5), MQM.dark()));
    for (let n = 1; n <= 13; n++) { const k = n / 14, p = cv.getPointAt(k), tng = cv.getTangentAt(k), q = Math.abs(tng.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0), a1 = tng.clone().cross(q).normalize(), a2 = tng.clone().cross(a1).normalize();
      const nh = male ? 22 : 7; for (let j = 0; j < nh; j++) { const th = 2 * Math.PI * (j + r() * 0.4) / nh, rad = a1.clone().multiplyScalar(Math.cos(th)).add(a2.clone().multiplyScalar(Math.sin(th)));
        antHairs.push({ p, dir: rad.add(tng.clone().multiplyScalar(male ? 0.35 : 0.9)), len: male ? 0.034 + 0.016 * Math.sin(Math.PI * k) + r() * 0.008 : 0.01 + r() * 0.004 }); } } }
  antG.add(instHairs(antHairs, MQM.hair(), male ? 0.00045 : 0.0005));
  // palps
  const palpM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: PALP_T, roughness: 0.45, normalMap: rep(SCALE_N, 6, 1), normalScale: V2(0.5, 0.5), clearcoat: 0.3 });
  const palps = []; for (const s of [-1, 1]) { const pts = male ? [V(0, 0, 0), V(0.08, -0.025, 0), V(0.16, -0.03, 0), V(0.205, -0.012, s * 0.004)] : [V(0, 0, 0), V(0.02, -0.008, 0), V(0.042, -0.014, 0)];
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, male ? 0.0034 : 0.0034, 6), palpM); m.position.set(0.04, -0.02, s * 0.006); head.add(m); palps.push(m);
    if (male) { const hs = []; for (let i = 0; i < 60; i++) { const k = 0.55 + 0.45 * r(); hs.push({ p: V(0.04 + k * 0.205, -0.02 - 0.03 * Math.sin(Math.PI * k), s * 0.006), dir: V(r() - 0.5, r() - 0.2, (r() - 0.5) * 2), len: 0.015 + r() * 0.012 }); } head.add(instHairs(hs, MQM.hair(), 0.0005)); } }
  // proboscis (rebuilt each frame in root space): the labium sheath, the fine needle, the labella at the tip
  const probM = new THREE.MeshPhysicalMaterial({ color: 0x1b1612, roughness: 0.42, normalMap: rep(SCALE_N, 10, 1), normalScale: V2(0.5, 0.5), clearcoat: 0.35, sheen: 0.4, sheenColor: new THREE.Color(0x8a7a6a) });
  const labium = dynTube(40, 8, probM); root.add(labium);
  const needle = dynTube(16, 6, new THREE.MeshPhysicalMaterial({ color: 0x3a1a12, roughness: 0.3, clearcoat: 0.8 })); root.add(needle);
  const labella = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 12, 10), probM); labella.scale.set(1.5, 1, 1); root.add(labella);
  // abdomen: segment plates (dorsal and ventral arcs) over a balloon that fills with blood; eggs for the x-ray
  const abd = new THREE.Group(); abd.position.set(-0.058, -0.004, 0); body.add(abd);
  const plateM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: PLATE_T, roughness: 0.74, normalMap: rep(SCALE_N, 3, 1), normalScale: V2(0.9, 0.9), sheen: 0.3, sheenColor: new THREE.Color(0x8a7a68), sheenRoughness: 0.6, envMapIntensity: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 1 });
  const ghostM = xrayMat(new THREE.Color(0.75, 0.9, 1.0), new THREE.Color(0.12, 0.2, 0.32), 1.6, 1.8);
  const NP = 8, plates = [];
  for (let i = 0; i < NP; i++) { const d = new THREE.Mesh(new THREE.BufferGeometry(), plateM), v = new THREE.Mesh(new THREE.BufferGeometry(), plateM); d.castShadow = v.castShadow = true; abd.add(d, v); plates.push([d, v]); }
  const bloodM = MQM.blood(), bloodG = MQM.blood(); bloodG.transparent = true; bloodG.opacity = 0.22; bloodG.depthWrite = false; const bal = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), bloodM); abd.add(bal); bal.castShadow = true;
  const eggM = MQM.egg(), eggs = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.0065, 0.034, 4, 8), eggM, 80), eggP = []; eggs.frustumCulled = false;
  for (let i = 0; i < 80; i++) { const s = i < 40 ? 1 : -1; eggP.push({ s: 0.2 + 0.55 * r(), a: r() * Math.PI * 2, rr: Math.sqrt(r()) * 0.5, side: s, rot: V(r() - 0.5, r() - 0.5, r() - 0.5), ph: r() }); } abd.add(eggs); eggs.visible = false;
  const abr = []; for (let i = 0; i < 90; i++) { const sx = r(), side = r() < 0.5 ? -1 : 1, a = (r() - 0.5) * 2.4; abr.push({ p: V(-sx * 0.29, 0.03 * (1 - 0.5 * sx) * Math.cos(a) - 0.008, side * 0.03 * (1 - 0.5 * sx) * Math.abs(Math.sin(a))), dir: V(-0.7, 0.3 + r() * 0.3, side * (0.4 + r() * 0.6)), len: 0.01 + r() * 0.014 }); }
  const abrM = instHairs(abr, MQM.hair(), 0.0006); abd.add(abrM);
  let lastFill = -1;
  const abdProfile = (s) => 0.036 * (1 - 0.58 * Math.pow(s, 1.7)) * (s < 0.06 ? 0.75 + 0.25 * s / 0.06 : 1);
  function buildAbdomen(f) {   // f = blood fill 0..1
    const Lab = 0.3 * (1 + 0.32 * f), R = (s) => abdProfile(s) * (1 + 0.85 * f * Math.sin(Math.PI * clamp(s * 1.05 + 0.05, 0, 1)) ** 0.6);
    const yc = (s) => -0.012 * s * s - 0.03 * f * s * s, xc = (s) => -s * Lab;
    for (let i = 0; i < NP; i++) { const s0 = i / NP, s1 = (i + 1) / NP, len = (s1 - s0) * Lab * (1.12 - 0.2 * f), rTop = R(s0) * 1.03, rBot = R(Math.min(s1, 0.999)) * 1.03;
      const sm0 = (s0 + s1) / 2, stretch = R(sm0) / abdProfile(sm0), dA = 3.74 / stretch, vA = 2.44 / stretch;   // the hard plates don't stretch: they cover less of a swollen abdomen
      const mk = (mid, lenA) => { const g = new THREE.CylinderGeometry(rTop, rBot, len, 36, 1, true, mid - lenA / 2, lenA); g.rotateZ(-Math.PI / 2); return g; };
      const [d, v] = plates[i]; d.geometry.dispose(); v.geometry.dispose();
      d.geometry = mk(1.5 * Math.PI, dA); v.geometry = mk(0.5 * Math.PI, vA);
      const sm = (s0 + s1) / 2; d.position.set(xc(sm), yc(sm), 0); v.position.copy(d.position); const tilt = Math.atan2(yc(s1) - yc(s0), xc(s1) - xc(s0)) + Math.PI; d.rotation.z = v.rotation.z = tilt; }
    // the balloon follows the same centre line
    const g = bal.geometry, p = g.attributes.position; if (!g.userData.orig) g.userData.orig = p.array.slice(); const o = g.userData.orig;
    for (let i = 0; i < p.count; i++) { const ox = o[i * 3], oy = o[i * 3 + 1], oz = o[i * 3 + 2], s = clamp((1 - ox) / 2 * 1.02 - 0.01, 0, 1), rr = R(s) * 0.96; p.setXYZ(i, xc(s), yc(s) + oy * rr * 0.98, oz * rr); }
    p.needsUpdate = true; g.computeVertexNormals();
    abd.userData.R = R; abd.userData.xc = xc; abd.userData.yc = yc; }
  // wings
  const wingM = MQM.wing(); const wingGeo = new THREE.PlaneGeometry(0.3, 0.075); wingGeo.translate(0.15, 0, 0);
  const wings = []; for (const s of [-1, 1]) { const hinge = new THREE.Group(); hinge.position.set(0.0, 0.05, s * 0.03); body.add(hinge);
    const w = new THREE.Mesh(wingGeo, wingM); w.userData.dofMap = WING_MASK; w.renderOrder = 2; w.castShadow = false; hinge.add(w);
    const fan = new THREE.Mesh(FAN_GEO, FAN_M); fan.scale.set(1, 1, s); fan.renderOrder = 2; fan.userData.noDof = true; fan.castShadow = false; hinge.add(fan);
    wings.push({ s, hinge, w, fan }); }
  // legs (rebuilt each frame in root space)
  const legs = []; for (const s of [-1, 1]) for (const L of LEGS) { const tot = L.L[0] + L.L[1] + L.L[2], f1 = L.L[0] / tot, f2 = (L.L[0] + L.L[1]) / tot;
    const m = dynTube(64, 6, new THREE.MeshPhysicalMaterial({ map: legTex(f1, f2, L.kind === 'hind'), roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.4, sheenColor: new THREE.Color(0x8a7a6a) })); root.add(m); legs.push({ L, s, m, f1, f2, tot }); }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const M4 = new THREE.Matrix4(), tmp = new THREE.Vector3();
  // pose: { t, fill, probe, fly, pitch, H (body height over the surface), surf(x, z) -> y in root space, ghost, eggs, flap, legPhase, hang }
  root.userData = { male, body, head, abd, wings, legs, bal, antG,
    pose(P) {
      const t = P.t ?? 0, fly = P.fly ?? 0, fill = P.fill ?? 0, probe = P.probe ?? 0, H = P.H ?? 0.13;
      const surf = P.surf || (() => -H);
      body.rotation.set(0, 0, P.pitch ?? (-0.08 - 0.12 * probe + 0.04 * fly)); body.position.set(0, 0, 0);
      head.rotation.set(0, (P.headYaw ?? 0), -0.5 - 0.55 * probe * (1 - fly) + (P.headPitch ?? 0));
      const fq = Math.round(fill * 200) / 200; if (fq !== lastFill) { buildAbdomen(fq); lastFill = fq; }
      abd.rotation.z = 0.02 + 0.06 * fill - 0.08 * fly + 0.02 * Math.sin(t * 2.1);
      const breathe = 1 + 0.01 * Math.sin(t * 5.3); abd.scale.set(1, breathe, breathe);
      // blood colour: a stretched, translucent red membrane
      const bc = new THREE.Color(0x3a302c).lerp(new THREE.Color(0x7a080a), clamp(fill * 1.6)); bloodM.color.copy(bc); bloodM.emissive.setRGB(0.14 * fill, 0.006 * fill, 0.004 * fill); bloodM.emissiveIntensity = 1;
      // x-ray: the plates turn to glass and the eggs show
      const gh = P.ghost ?? 0; plates.forEach(([d, v]) => { d.material = v.material = gh > 0.5 ? ghostM : plateM; }); plateM.opacity = 1; bal.material = gh > 0.5 ? bloodG : bloodM; bloodG.color.copy(bloodM.color); bloodG.emissive.copy(bloodM.emissive);
      eggs.visible = (P.eggs ?? 0) > 0.001; if (eggs.visible) { const R = abd.userData.R, xc = abd.userData.xc, yc = abd.userData.yc; const q = new THREE.Quaternion(), e = new THREE.Euler();
        eggP.forEach((E_, i) => { const show = clamp((P.eggs - E_.ph * 0.8) / 0.2), sc = Math.max(1e-4, show); const rr = R(E_.s) * 0.55 * E_.rr; e.set(E_.rot.x, E_.rot.y + 1.57, E_.rot.z); q.setFromEuler(e);
          M4.compose(V(xc(E_.s), yc(E_.s) + Math.sin(E_.a) * rr, E_.side * (0.006 + Math.abs(Math.cos(E_.a)) * rr)), q, V(sc, sc, sc)); eggs.setMatrixAt(i, M4); }); eggs.instanceMatrix.needsUpdate = true; }
      // wings: folded flat over the back at rest; a narrow blurred fan in flight (mosquitoes beat ~500 times a second through a small arc)
      const fl = P.flap ?? fly;
      wings.forEach(({ s, hinge, w, fan }) => {
        w.visible = fl < 0.02; fan.visible = !w.visible;
        w.rotation.set(-s * 0.04, s * (Math.PI - 0.1), -0.06 - 0.03 * fill); w.position.set(0, 0.002 * (s + 1), 0);
        fan.rotation.set(-0.6 * s, 0, 0.25 + 0.05 * Math.sin(t * 13)); fan.material.opacity = 0.9 * fl; });
      // proboscis: rest = forward-down; probing = the sheath bows back while the needle runs straight into the skin
      body.updateMatrix(); head.updateMatrix(); M4.multiplyMatrices(body.matrix, head.matrix);
      const pb = V(0.044, -0.026, 0).applyMatrix4(M4), restDir = V(0.92, -0.38, 0).transformDirection(M4), Lp = 0.215;
      let tip = pb.clone().add(restDir.clone().multiplyScalar(Lp));
      if (probe > 0 && !fly) { const sx = P.biteX ?? (pb.x + 0.05), contact = V(sx, surf(sx, 0) + 0.002, 0); tip = lv(tip, contact, E.io(clamp(probe * 2.5))); }
      const bow = probe * (1 - fly) * 0.075 * clamp((probe - 0.25) / 0.5); const mid = lv(pb, tip, 0.55).add(V(-bow * 0.9, -bow * 0.2, 0)), mid2 = lv(pb, tip, 0.8).add(V(-bow * 0.5, 0, 0));
      labium.userData.update(new THREE.CatmullRomCurve3([pb, lv(pb, tip, 0.25).add(V(-bow * 0.4, 0, 0)), mid, mid2, tip]), (u) => (0.0056 - 0.0018 * u) * (u > 0.96 ? 1.2 : 1));
      labella.position.copy(tip); labella.lookAt(tip.clone().add(tip.clone().sub(mid2)));
      const nOn = clamp((probe - 0.3) / 0.3) * (1 - fly); needle.visible = nOn > 0.01; if (needle.visible) needle.userData.update(new THREE.LineCurve3(pb, tip.clone().add(V(0, -0.05 * nOn, 0))), (u) => 0.0017 * (1 - 0.5 * u));
      // legs
      const hang = P.hang ?? 0;
      legs.forEach(({ L, s, m }, li) => {
        const sg = V(1, 1, s), B = L.b.clone().multiply(sg).applyMatrix4(body.matrix); const [L1, L2, L3] = L.L;
        // standing
        let K, A, T = [];
        const wig = 0.006 * Math.sin(t * 3 + li) * (P.fidget ?? 0);
        if (L.kind !== 'hind') { const F = L.foot.clone().multiply(sg); F.x += wig; F.y = surf(F.x, F.z); const back = F.clone().sub(V(B.x, F.y, B.z)).setY(0).normalize();
          A = F.clone().sub(back.clone().multiplyScalar(L3 * 0.72)); A.y = F.y + 0.035; K = ik2(B, A, L1, L2, V(0, 0.55, s * 1.0).add(back.clone().multiplyScalar(-0.2)));
          const a1 = lv(A, F, 0.38), a2 = lv(A, F, 0.72); a1.y = lerp(A.y, F.y, 0.62) + 0.006; a2.y = F.y + 0.004; T = [a1, a2, F]; }
        else { K = B.clone().add(V(-0.12, 0.03, s * 0.2)); A = K.clone().add(V(-0.21, 0.13, s * 0.05)); T = [A.clone().add(V(-0.08, 0.09, s * 0.01)), A.clone().add(V(-0.1, 0.2, s * 0.015)), A.clone().add(V(-0.06, 0.3, s * 0.02))]; }
        if (fly > 0 || hang > 0) { const k = Math.max(fly, hang), sw = 0.02 * Math.sin(t * 4 + li * 1.3);
          const fx = L.kind === 'front' ? 0.12 : L.kind === 'mid' ? -0.04 : -0.14;
          const Kf = B.clone().add(V(fx * 0.7, -0.07, s * 0.1)), Af = Kf.clone().add(V(fx * 0.9 - 0.1 + sw, -0.17, s * 0.03)); const Tf = [Af.clone().add(V(-0.06, -0.1, s * 0.01)), Af.clone().add(V(-0.13 + sw, -0.17, s * 0.015)), Af.clone().add(V(-0.2 + sw * 2, -0.21, s * 0.02))];
          K = lv(K, Kf, k); A = lv(A, Af, k); T = T.map((p, i) => lv(p, Tf[i], k)); }
        // re-impose segment lengths (keeps the legs from stretching while blending)
        const fix = (a, b, len) => b.clone().sub(a).setLength(len).add(a); K = fix(B, K, L1); A = fix(K, A, L2);
        const segs = [A, ...T]; for (let i = 1; i < segs.length; i++) segs[i] = fix(segs[i - 1], segs[i], L3 / 3);
        const pts = [B, lv(B, K, 0.5), lv(B, K, 0.94), K, lv(K, A, 0.06), lv(K, A, 0.5), lv(K, A, 0.95), A, ...segs.slice(1)];
        const cv = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
        m.userData.update(cv, (u) => { const f1 = L1 / (L1 + L2 + L3), f2 = (L1 + L2) / (L1 + L2 + L3); return 0.78 * (u < f1 ? lerp(0.0078, 0.0064, u / f1) * (1 + 0.15 * Math.exp(-(((u - f1) / 0.01) ** 2))) : u < f2 ? lerp(0.0058, 0.0046, (u - f1) / (f2 - f1)) : lerp(0.0042, 0.0018, (u - f2) / (1 - f2))); });
      });
    } };
  root.userData.pose({ t: 0 });
  return root;
}

// ---------- molecules: ball-and-stick, merged into one mesh with vertex colours ----------
const ATOM = { C: [0.36, 0x34343a], O: [0.34, 0xd42a20], H: [0.23, 0xf4f4f4], N: [0.34, 0x3456e0] };
function mergeColored(parts) {   // parts: [geometry (non-indexed ok), THREE.Color, Matrix4]
  let n = 0; parts.forEach(([g]) => { n += (g.index ? g.index.count : g.attributes.position.count); });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0; const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  parts.forEach(([g, c, M]) => { const gi = g.index ? g.toNonIndexed() : g, P = gi.attributes.position, N = gi.attributes.normal; nm.getNormalMatrix(M);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M); pos.set([v.x, v.y, v.z], (o + i) * 3); v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (o + i) * 3); col.set([c.r, c.g, c.b], (o + i) * 3); }
    o += P.count; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; }
const MOL_MAT = () => new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
function moleculeGeo(atoms, bonds) {   // atoms [el, x, y, z] in angstroms; bonds [i, j, order]
  const parts = [], sph = new THREE.SphereGeometry(1, 20, 14), cyl = new THREE.CylinderGeometry(0.11, 0.11, 1, 10, 1);
  atoms.forEach(([el, x, y, z]) => { const [rr, c] = ATOM[el]; parts.push([sph, new THREE.Color(c).convertSRGBToLinear(), new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion(), V(rr, rr, rr))]); });
  bonds.forEach(([i, j, ord]) => { const a = V(...atoms[i].slice(1)), b = V(...atoms[j].slice(1)), d = b.clone().sub(a), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    const side = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 * L ? V(0, 1, 0) : V(1, 0, 0)).setLength(0.17);
    for (let k = 0; k < ord; k++) { const off = ord === 1 ? V(0, 0, 0) : side.clone().multiplyScalar(k ? 1 : -1); parts.push([cyl, new THREE.Color(0xb8b8b8).convertSRGBToLinear(), new THREE.Matrix4().compose(lv(a, b, 0.5).add(off), q, V(1, L, 1))]); } });
  const g = mergeColored(parts); g.computeBoundingSphere(); return g; }
const CO2_GEO = moleculeGeo([['C', 0, 0, 0], ['O', -1.16, 0, 0], ['O', 1.16, 0, 0]], [[0, 1, 2], [0, 2, 2]]);
// a fatty (carboxylic) acid: a zig-zag carbon chain with its hydrogens, ending in C(=O)OH
function acidGeo(n) { const A = [], B = []; for (let i = 0; i < n; i++) { const x = i * 1.26, y = (i % 2) * 0.86; A.push(['C', x, y, 0]); if (i) B.push([i - 1, i, 1]); }
  const nc = A.length; for (let i = 0; i < n - 1; i++) { const [, x, y] = A[i], dy = (i % 2) ? 0.55 : -0.55; for (const s of [-1, 1]) { A.push(['H', x, y + dy * 0.6, s * 0.9]); B.push([i, A.length - 1, 1]); } }
  A.push(['H', -0.9, -0.3, 0]); B.push([0, A.length - 1, 1]);
  const [, xl, yl] = A[n - 1], up = (n - 1) % 2 ? 1 : -1; A.push(['O', xl + 0.6, yl + up * 1.05, 0]); B.push([n - 1, A.length - 1, 2]); A.push(['O', xl + 1.25, yl - up * 0.3, 0]); B.push([n - 1, A.length - 1, 1]); A.push(['H', xl + 2.1, yl - up * 0.05, 0]); B.push([A.length - 2, A.length - 1, 1]);
  return moleculeGeo(A, B); }
const ACID_GEOS = [acidGeo(6), acidGeo(9), acidGeo(13)];
// odour molecules made by skin bacteria (short acids and a ketone-like one)
const ODOR_GEOS = [acidGeo(3), acidGeo(4), moleculeGeo([['C', 0, 0, 0], ['C', 1.26, 0.86, 0], ['O', 1.26, 2.06, 0], ['C', 2.52, 0, 0], ['H', -0.9, -0.3, 0], ['H', 0, 0.3, 1], ['H', 3.4, -0.3, 0], ['H', 2.5, 0.3, 1]], [[0, 1, 1], [1, 2, 2], [1, 3, 1], [0, 4, 1], [0, 5, 1], [3, 6, 1], [3, 7, 1]])];
// a cloud of molecules of one or more kinds that tumble and drift: update(t, fn(i) -> {p, s, rot})
function molCloud(geos, n, mat = MOL_MAT()) { const g = new THREE.Group(), per = geos.map(gg => new THREE.InstancedMesh(gg, mat, n)); per.forEach(m => { m.castShadow = true; m.frustumCulled = false; g.add(m); });
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); const cnt = geos.map(() => 0);
  g.userData.update = (fn) => { cnt.fill(0); for (let i = 0; i < n; i++) { const d = fn(i); if (!d) continue; const k = (d.kind ?? i) % geos.length; e.set(d.rot.x, d.rot.y, d.rot.z); q.setFromEuler(e); M4.compose(d.p, q, V(d.s, d.s, d.s)); per[k].setMatrixAt(cnt[k]++, M4); }
    per.forEach((m, k) => { m.count = cnt[k]; m.instanceMatrix.needsUpdate = true; }); };
  return g; }

// =====================================================================
// THE GECKO: a tokay (Gekko gecko), in centimetres, built in a "surface frame" (the surface is y = 0, the gecko on +y),
// which is then turned upside down onto the ceiling (or stood up as a window pane). A lofted body that follows its own
// path like a snake follows its head, with granular blue-grey skin and orange spots; big slit-pupil eyes; sprawling legs
// by IK; five splayed toes per foot with ridged pads that can peel back from the tip like tape. A procedural trot gait.
// Also: the room at night, a glass pane, the microscope sets (setae, a branching seta, atoms) and the coin-sized patch.
// =====================================================================
// skin colour, painted along the body (x: snout -> tail tip) and around it (y: belly -> back -> belly)
const GK_T = (() => { const [c, g] = mkCanvas(2048, 512), r = rng(61); const W = 2048, H = 512;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#e2dccd'); gr.addColorStop(0.2, '#c4c6c8'); gr.addColorStop(0.3, '#93a4c0'); gr.addColorStop(0.5, '#8698b6'); gr.addColorStop(0.7, '#93a4c0'); gr.addColorStop(0.8, '#c4c6c8'); gr.addColorStop(1, '#e2dccd'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3000; i++) { const x = r() * W, y = H * (0.25 + r() * 0.5); g.fillStyle = r() < 0.5 ? 'rgba(150,170,200,0.25)' : 'rgba(60,70,90,0.22)'; g.fillRect(x, y, 3 + r() * 6, 2 + r() * 4); }
  // tail bands
  for (let k = 0; k < 9; k++) { const x = W * (0.55 + k * 0.05); g.fillStyle = 'rgba(200,210,225,0.35)'; g.fillRect(x, H * 0.22, W * 0.018, H * 0.56); }
  // orange spots, in loose rows along the back and flanks
  for (let i = 0; i < 260; i++) { const x = W * (0.04 + r() * 0.62), y = H * (0.27 + r() * 0.46), rr = 6 + r() * 10 * (x < W * 0.15 ? 0.6 : 1);
    const sp = g.createRadialGradient(x, y, 0, x, y, rr); sp.addColorStop(0, 'rgba(246,140,70,0.95)'); sp.addColorStop(0.7, 'rgba(238,124,62,0.85)'); sp.addColorStop(1, 'rgba(238,124,62,0)'); g.fillStyle = sp; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  // pale tubercles
  for (let i = 0; i < 700; i++) { const x = W * (0.05 + r() * 0.6), y = H * (0.28 + r() * 0.44); g.fillStyle = 'rgba(225,230,236,0.6)'; g.beginPath(); g.arc(x, y, 1.5 + r() * 2, 0, 7); g.fill(); }
  // a dark lip line along the jaw, darker head top
  g.fillStyle = 'rgba(40,45,60,0.5)'; g.fillRect(0, H * 0.24, W * 0.13, 4); g.fillRect(0, H * 0.76, W * 0.13, 4);
  return texOf(c); })();
// legs: blue-grey with orange spots
const LIMB_T = (() => { const [c, g] = mkCanvas(512, 256), r = rng(64); g.fillStyle = '#8a9cb8'; g.fillRect(0, 0, 512, 256); g.fillStyle = 'rgba(214,208,194,0.85)'; g.fillRect(0, 100, 512, 56);
  for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() < 0.5 ? r() * 90 : 166 + r() * 90, rr = 5 + r() * 8; const sp = g.createRadialGradient(x, y, 0, x, y, rr); sp.addColorStop(0, 'rgba(246,140,70,0.95)'); sp.addColorStop(1, 'rgba(238,124,62,0)'); g.fillStyle = sp; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  return texOf(c); })();
// granular scales: small packed bumps
const GRAN_N = heightToNormal(hCanvas(512, 512, (g, w, h) => { const r = rng(62); for (let i = 0; i < 5200; i++) { const x = r() * w, y = r() * h, rr = 3 + r() * 3; const gg = g.createRadialGradient(x, y, 0, x, y, rr); gg.addColorStop(0, '#e8e8e8'); gg.addColorStop(1, 'rgba(90,90,90,0)'); g.fillStyle = gg; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); } }), 2.6);
// the toe pad underside: ridges (lamellae) across the toe, pale; the top of the toe like the skin
const TOE_T = (() => { const [c, g] = mkCanvas(512, 128); g.fillStyle = '#8698b6'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#d6d0c2'; g.fillRect(0, 36, 512, 56);
  for (let i = 0; i < 18; i++) { const x = 40 + i * 25; g.strokeStyle = 'rgba(140,128,114,0.95)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 36); g.quadraticCurveTo(x + 9, 64, x, 92); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(236,108,58,0.8)'; g.beginPath(); g.arc(80 + Math.random() * 380, Math.random() < 0.5 ? 6 + Math.random() * 22 : 104 + Math.random() * 20, 3 + Math.random() * 4, 0, 7); g.fill(); }
  const t = texOf(c); t.wrapS = THREE.ClampToEdgeWrapping; return t; })();
const LAMELLA_N = heightToNormal(hCanvas(512, 128, (g) => { for (let i = 0; i < 18; i++) { const x = 40 + i * 25; for (const [y0, y1] of [[36, 92]]) { const gr = g.createLinearGradient(x - 10, 0, x + 12, 0); gr.addColorStop(0, '#808080'); gr.addColorStop(0.6, '#e0e0e0'); gr.addColorStop(1, '#505050'); g.fillStyle = gr; g.fillRect(x - 10, y0, 22, y1 - y0); } } }), 3);
// the eye: gold with dark veins and a vertical slit pupil with wavy edges
const GK_EYE = (() => { const [c, g] = mkCanvas(512, 512), r = rng(63); const gr = g.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, '#d8b860'); gr.addColorStop(0.6, '#b89048'); gr.addColorStop(0.9, '#6a5a3a'); gr.addColorStop(1, '#3a3428'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) { const a = r() * 6.28; g.strokeStyle = `rgba(${60 + r() * 40},${50 + r() * 30},30,0.5)`; g.lineWidth = 1 + r() * 2; g.beginPath(); let x = 256 + Math.cos(a) * 40, y = 256 + Math.sin(a) * 40; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += Math.cos(a + (r() - 0.5)) * 25; y += Math.sin(a + (r() - 0.5)) * 25; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = '#060504'; g.beginPath(); for (let y = 60; y <= 452; y += 4) { const w = 10 + 7 * Math.sin(y * 0.09) + 18 * Math.sin(Math.PI * (y - 60) / 392) ** 0.5; g.lineTo(256 + w, y); } for (let y = 452; y >= 60; y -= 4) { const w = 10 + 7 * Math.sin(y * 0.09 + 1) + 18 * Math.sin(Math.PI * (y - 60) / 392) ** 0.5; g.lineTo(256 - w, y); } g.fill();
  return texOf(c); })();
// body half-width and half-height along the body (s = cm from the snout)
const GK_PROF = [[0, 0.22, 0.16], [0.6, 0.72, 0.42], [1.5, 1.12, 0.62], [2.6, 1.42, 0.8], [3.6, 1.58, 0.86], [4.4, 1.22, 0.74], [5.4, 1.32, 0.78], [7.0, 1.72, 0.92], [9.5, 1.98, 1.0], [12.0, 1.84, 0.92], [13.6, 1.42, 0.8], [14.6, 1.12, 0.7], [16.5, 0.94, 0.6], [20, 0.64, 0.42], [24, 0.38, 0.28], [27.4, 0.13, 0.1], [28, 0.02, 0.02]];
const GK_L = 28;
function gkProf(s) { const P = GK_PROF; let i = 0; while (i < P.length - 2 && s > P[i + 1][0]) i++; const [s0, w0, h0] = P[i], [s1, w1, h1] = P[i + 1]; const k = smooth(0, 1, clamp((s - s0) / (s1 - s0))); return [lerp(w0, w1, k), lerp(h0, h1, k)]; }
const GK_LEGS = [ // where each leg joins the body (s), segment lengths, the rest foot (along/side, in body terms), toe fan heading
  { s: 6.4, L: [1.9, 1.8], rest: [2.4, 3.6], fan: 0.55, side: 1, front: true }, { s: 6.4, L: [1.9, 1.8], rest: [2.4, 3.6], fan: 0.55, side: -1, front: true },
  { s: 13.4, L: [2.5, 2.3], rest: [-1.4, 4.0], fan: -0.35, side: 1, front: false }, { s: 13.4, L: [2.5, 2.3], rest: [-1.4, 4.0], fan: -0.35, side: -1, front: false }];
const TOE_LEN = [1.0, 1.35, 1.5, 1.45, 1.15];
// a path on the surface: P(d) -> {p (x, z), h (heading angle)}. Default: a straight line along +x.
const straightPath = (d) => ({ p: V(d, 0, 0), h: 0 });
function makeGecko({ seed = 1 } = {}) {
  const root = new THREE.Group(); const r = rng(seed);
  const skin = new THREE.MeshPhysicalMaterial({ map: GK_T, normalMap: rep(GRAN_N, 14, 3), normalScale: V2(0.7, 0.7), roughness: 0.58, sheen: 0.45, sheenColor: new THREE.Color(0xb8c8e0), sheenRoughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const NS = 150, NR = 32, cols = NR + 1; const pos = new Float32Array((NS + 1) * cols * 3), uv = new Float32Array((NS + 1) * cols * 2), idx = [];
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= NR; j++) { const k = i * cols + j; uv[k * 2] = i / NS; uv[k * 2 + 1] = j / NR; }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * cols + j, b = a + 1, c2 = a + cols, d = c2 + 1; idx.push(a, d, b, a, c2, d); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); bg.setIndex(idx);
  const body = new THREE.Mesh(bg, skin); body.castShadow = body.receiveShadow = true; body.frustumCulled = false; root.add(body);
  // eyes
  const eyeM = new THREE.MeshPhysicalMaterial({ map: GK_EYE, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 }); const eyes = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 24), eyeM); e.castShadow = true; root.add(e); const lid = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 10, 32), skin); root.add(lid); eyes.push({ s, e, lid }); }
  // legs and toes
  const limbM = new THREE.MeshPhysicalMaterial({ map: LIMB_T, normalMap: rep(GRAN_N, 4, 1), normalScale: V2(0.6, 0.6), roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color(0xb8c8e0), clearcoat: 0.1 });
  const toeM = new THREE.MeshPhysicalMaterial({ map: TOE_T, normalMap: LAMELLA_N, normalScale: V2(0.8, 0.8), roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0xdde4f0), clearcoat: 0.1 });
  const legs = GK_LEGS.map(L => { const m = dynTube(30, 10, limbM); root.add(m); const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), limbM); palm.scale.set(0.42, 0.18, 0.4); palm.castShadow = true; root.add(palm); const toes = TOE_LEN.map(len => { const t = dynTube(22, 12, toeM); root.add(t); return { t, len }; }); return { L, m, toes, palm }; });
  const M4 = new THREE.Matrix4();
  // pose: { t, path(d), d, speed (0..1 running), breath, headYaw, peel: [per-leg 0..1] or number, stride, lift }
  root.userData = { body, eyes, legs, pose(P) {
    const t = P.t ?? 0, path = P.path || straightPath, d = P.d ?? 0, run = P.speed ?? 0, stride = P.stride ?? 4.2;
    // spine: the body trails back along the path from the snout, with a sideways wave while running
    const spine = (s) => { const q = path(d - s), side = V(-Math.sin(q.h), 0, -Math.cos(q.h)); const wave = run * 0.55 * Math.sin((d / stride) * 2 * Math.PI - s * 0.42) * clamp(s / 6) + (1 - run) * 0.12 * Math.sin(t * 0.7 + s * 0.3) * clamp((s - 14) / 6);
      return { p: q.p.clone().addScaledVector(side, wave), h: q.h, side }; };
    const yaw = P.headYaw ?? 0, breathe = 1 + 0.025 * Math.sin(t * 2.4) * (1 - run);
    const ring = [];
    for (let i = 0; i <= NS; i++) { const s = (i / NS) * GK_L, sp = spine(s), sn = spine(Math.min(GK_L, s + 0.3)), fwd = sp.p.clone().sub(sn.p).normalize(); const side = V(fwd.z, 0, -fwd.x); let [w, h] = gkProf(s);
      if (s > 6 && s < 14) { w *= breathe; h *= breathe; }
      const lift = 0.32 + 0.25 * smooth(4.6, 0, s) + (P.lift ?? 0) * smooth(4.6, 0, s);
      const c = sp.p.clone().add(V(0, h * 0.62 + lift, 0)); if (s < 4.5 && yaw) { const k = smooth(4.5, 0, s); const piv = spine(4.5).p; const off = c.clone().sub(piv); off.applyAxisAngle(V(0, 1, 0), yaw * k); c.copy(piv).add(off); fwd.applyAxisAngle(V(0, 1, 0), yaw * k); side.set(fwd.z, 0, -fwd.x); }
      ring.push({ c, side, w, h, fwd, s });
      for (let j = 0; j <= NR; j++) { const th = (j / NR) * 2 * Math.PI, cs = Math.cos(th), sn2 = Math.sin(th); // th = 0 at the belly
        const ex = Math.sign(sn2) * Math.pow(Math.abs(sn2), 0.75) * w, ey = -Math.sign(cs) * Math.pow(Math.abs(cs), 0.85) * h * (cs > 0 ? 0.62 : 1.0);
        const k3 = (i * cols + j) * 3; pos[k3] = c.x + side.x * ex; pos[k3 + 1] = c.y + ey; pos[k3 + 2] = c.z + side.z * ex; } }
    bg.attributes.position.needsUpdate = true; bg.computeVertexNormals();
    // eyes on the sides of the head, near the top
    const ri = ring[Math.round(2.5 / GK_L * NS)];
    eyes.forEach(({ s, e, lid }) => { e.position.copy(ri.c).addScaledVector(ri.side, s * ri.w * 0.78).add(V(0, ri.h * 0.42, 0)); const out = ri.side.clone().multiplyScalar(s).add(V(0, 0.45, 0)).addScaledVector(ri.fwd, 0.25).normalize(); e.lookAt(e.position.clone().add(out)); e.rotateY(Math.PI / 2 * 0); lid.position.copy(e.position).addScaledVector(out, 0.12); lid.lookAt(lid.position.clone().add(out)); });
    // legs: a trot (diagonal pairs), planted feet stay put while the body moves; at rest the feet sit at their rest spots
    const peel = P.peel ?? 0;
    legs.forEach(({ L, m, toes, palm }, li) => { const rg = ring[Math.round(L.s / GK_L * NS)], hip = rg.c.clone().addScaledVector(rg.side, L.side * rg.w * 0.82).add(V(0, -rg.h * 0.15, 0));
      const restAt = (dd) => { const q = spine(L.s + (d - dd)); return q.p.clone().addScaledVector(V(Math.cos(q.h), 0, -Math.sin(q.h)), L.rest[0]).addScaledVector(q.side, -L.side * L.rest[1]); };
      let foot = restAt(d), lift = 0;
      if (run > 0) { const ph = (li === 0 || li === 3) ? 0 : 0.5, u = d / stride + ph, cyc = Math.floor(u), q = u - cyc, duty = 0.62;
        const plant = (cc) => restAt((cc + 0.31 - ph) * stride + stride * 0.0);
        let g = q < duty ? plant(cyc) : lv(plant(cyc), plant(cyc + 1), smooth(duty, 1, q)); if (q >= duty) lift = Math.sin(Math.PI * (q - duty) / (1 - duty)) * 0.9;
        foot = lv(foot, g, run); lift *= run; }
      const wrist = foot.clone().add(V(0, 0.3 + lift, 0)); const out = rg.side.clone().multiplyScalar(L.side); legs[li].wrist = wrist.clone();
      const elbow = ik2(hip, wrist, L.L[0], L.L[1], V(0, 1, 0).addScaledVector(out, 0.6));
      m.userData.update(new THREE.CatmullRomCurve3([hip, lv(hip, elbow, 0.5), elbow, lv(elbow, wrist, 0.5), wrist], false, 'centripetal'), (u) => lerp(0.5, 0.24, u) * (1 + 0.18 * Math.exp(-(((u - 0.5) / 0.08) ** 2))) * (u < 0.12 ? 1 + (0.12 - u) * 4 : 1));
      palm.position.copy(wrist).add(V(0, -0.14, 0)); palm.rotation.set(0, Math.atan2(-out.z, out.x), 0);
      // five toes fanned out from the wrist; peeling curls each toe up from its tip
      const q0 = spine(L.s), fwd = V(Math.cos(q0.h), 0, -Math.sin(q0.h)); const base = fwd.clone().applyAxisAngle(V(0, 1, 0), L.side * (L.front ? -L.fan : -L.fan) + (L.front ? 0 : 0)); const outDir = lv(base, out, 0.55).normalize();
      const pl = Array.isArray(peel) ? peel[li] : peel;
      toes.forEach(({ t: tm, len }, k) => { const a = (k - 2) * 0.42 * L.side, dir = outDir.clone().applyAxisAngle(V(0, 1, 0), a); const pts = []; let p = wrist.clone().add(V(0, -0.22 - lift * 0.0, 0)).addScaledVector(dir, 0.25); p.y = 0.08 + lift; pts.push(p.clone());
        const n = 8; let ang = 0; for (let i = 1; i <= n; i++) { const qq = i / n; ang = pl * 1.9 * smooth(0.999 - pl * 0.95, 1, qq) + (lift > 0 ? 0.5 * qq : 0); const st = dir.clone().multiplyScalar(Math.cos(ang) * len / n).add(V(0, Math.sin(ang) * len / n, 0)); p = p.clone().add(st); pts.push(p.clone()); }
        tm.userData.update(new THREE.CatmullRomCurve3(pts), (u, th) => { const wd = (u < 0.15 ? lerp(0.16, 0.24, u / 0.15) : u > 0.82 ? lerp(0.26, 0.06, (u - 0.82) / 0.18) : 0.26), tk = 0.085; const c = Math.cos(th), s2 = Math.sin(th); return 1 / Math.sqrt((c / tk) ** 2 + (s2 / wd) ** 2); }); }); });
  } };
  root.userData.pose({ t: 0 });
  return root;
}
// ---------- the room at night: the ceiling (the gecko's floor), a bare bulb on a pull-chain socket, the fire-lit room below ----------
const CEIL = 250;
function room(sc, { env = 0.8, bulb = 1, drop = 30 } = {}) { sc.environment = FIRE.env; sc.environmentIntensity = env; sc.background = FIRE.tex; sc.backgroundIntensity = 0.6;
  const cm = new THREE.MeshPhysicalMaterial({ color: 0xece8e2, roughness: 0.92, normalMap: rep(TX.ceiling.normalMap, 24, 24), normalScale: V2(0.5, 0.5), aoMap: null });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), cm); ceil.rotation.x = Math.PI / 2; ceil.position.y = CEIL; ceil.receiveShadow = true; sc.add(ceil);
  // a bare bulb on a short pendant cord
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, drop, 10), new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: 0.45, clearcoat: 0.4 })); cord.position.set(0, CEIL - drop / 2, 0); sc.add(cord);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.8, 1.6, 40), new THREE.MeshPhysicalMaterial({ color: 0xf2f0ec, roughness: 0.4 })); rose.position.set(0, CEIL - 0.8, 0); sc.add(rose);
  const sock = model('pull_chain_light_socket'); sock.position.set(0, CEIL - drop, 0); sc.add(sock); const bulbM = model('lightbulb_01'); bulbM.rotation.x = Math.PI; bulbM.position.set(0, CEIL - drop - 4.6, 0); sc.add(bulbM);
  bulbM.traverse(o => { if (o.isMesh && /glass/.test(o.material.name)) { o.material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffc070, emissiveIntensity: 7, roughness: 0.2, transparent: true, opacity: 0.94 }); o.castShadow = false; } });
  const L = new THREE.PointLight(0xffc27a, 4200 * bulb, 0, 2); L.position.set(0, CEIL - drop - 8.5, 0); L.castShadow = true; L.shadow.mapSize.set(2048, 2048); L.shadow.bias = -0.0005; L.shadow.camera.near = 1; L.shadow.camera.far = 500; L.userData.soft = 1.0; sc.add(L);
  const fill = new THREE.HemisphereLight(0xffe4c8, 0xff9a50, 0.35); sc.add(fill);
  const plant = model('potted_plant_01'); plant.position.set(-120, 0, -160); sc.add(plant);
  return { ceil, L, bulb: bulbM, sock, fill };
}
// the surface frame on the ceiling: local y = down from the ceiling; place a gecko group inside it
function ceilingFrame(sc, at = V(0, 0, 0), yaw = 0) { const f = new THREE.Group(); f.position.set(at.x, CEIL - 0.05, at.z); f.rotation.set(Math.PI, yaw, 0); sc.add(f); return f; }

// =====================================================================
// THE GECKO'S OTHER SETS: a glass skylight to see the toe pads from above; under the electron microscope (µm), a
// lamella's carpet of setae and one seta branching into hundreds of spatulae; the atoms (nm) of a spatula tip meeting
// the ceiling; a coin-sized patch on the ceiling holding up a cement bag.
// =====================================================================
// a camera with a chosen "up" (for looking up at a ceiling), with the same handheld drift as shoot()
function shootC(cam, pos, target, up, { fov, t = 0, hand = 1, focus = null } = {}) { const d = pos.distanceTo(target), n = 0.01 * hand * Math.max(d, 1.5);
  const p = pos.clone().add(V(fbm(t * 0.55, 1.1), fbm(t * 0.55, 2.2), fbm(t * 0.55, 3.3)).multiplyScalar(n)), tg = target.clone().add(V(fbm(t * 0.45, 4.4), fbm(t * 0.45, 5.5), fbm(t * 0.45, 6.6)).multiplyScalar(n * 0.6));
  if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } cam.position.copy(p); cam.up.copy(up).normalize(); cam.lookAt(tg); cam.userData.focus = focus ?? p.distanceTo(tg); }
// ---------- the glass skylight: the gecko hangs under a pane of glass; we look down through it at the toe pads ----------
function skylight(sc) { sc.environment = FIRE.env; sc.environmentIntensity = 0.9; sc.background = new THREE.Color(0x1a0f08);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.07, clearcoat: 1, depthWrite: false, envMapIntensity: 0.6 })); glass.rotation.x = -Math.PI / 2; glass.position.y = 0.01; glass.userData.noDof = true; sc.add(glass);
  // a few specks of dust on the glass sell the surface
  const dust = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: 0x8a7a6a }), 300), r = rng(71), M4 = new THREE.Matrix4(); for (let i = 0; i < 300; i++) { M4.makeTranslation((r() - 0.5) * 40, 0.03, (r() - 0.5) * 40); dust.setMatrixAt(i, M4); } sc.add(dust);
  const below = new THREE.PointLight(0xffb070, 1800, 0, 2); below.position.set(-14, -40, 10); sc.add(below); const fill = new THREE.HemisphereLight(0xffe0c0, 0xff9050, 0.5); sc.add(fill);
  const room = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.MeshBasicMaterial({ map: FIRE.tex, side: THREE.BackSide, color: 0x9a8070 })); room.position.y = -60; sc.add(room);
  const F = new THREE.Group(); F.rotation.set(Math.PI, 0, 0); sc.add(F); return { F, glass }; }
// ---------- under the electron microscope (µm): grey, edge-lit, dark ----------
function semLight(sc, { bg = 0x050607 } = {}) { sc.background = new THREE.Color(bg); sc.environment = STUDIO.env; sc.environmentIntensity = 0.35; sc.fog = new THREE.FogExp2(bg, 0.0022);
  const k = new THREE.DirectionalLight(0xf4f6ff, 2.2); k.position.set(-200, 300, 250); k.castShadow = true; k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, near: 10, far: 1500 }); k.shadow.bias = -0.0004; k.userData.soft = 6; sc.add(k);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 2.6); rim.position.set(150, 120, -300); sc.add(rim); return { k, rim }; }
const SEM_M = () => new THREE.MeshPhysicalMaterial({ color: 0xa4a8b0, roughness: 0.55, sheen: 1.0, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.35, clearcoat: 0.2 });
// one seta for the carpet: a curved, tapering shaft (length 1) with a brush of branches at its tip
const SETA_GEO = (() => { const parts = [], c = new THREE.Color(1, 1, 1); const pts = []; for (let i = 0; i <= 12; i++) { const s = i / 12; pts.push(V(0.28 * s * s, s, 0)); }
  const cv = new THREE.CatmullRomCurve3(pts), tube = new THREE.TubeGeometry(cv, 12, 1, 5); const p = tube.attributes.position; for (let i = 0; i <= 12; i++) { const u = i / 12, cp = cv.getPointAt(u), k = 0.022 * (1 - 0.45 * u); for (let j = 0; j <= 5; j++) { const idx = i * 6 + j, v = V(p.getX(idx), p.getY(idx), p.getZ(idx)).sub(cp).multiplyScalar(k).add(cp); p.setXYZ(idx, v.x, v.y, v.z); } } tube.computeVertexNormals();
  parts.push([tube, c, new THREE.Matrix4()]); const tip = cv.getPointAt(1), r = rng(3), br = new THREE.CylinderGeometry(0.0035, 0.007, 1, 4, 1); br.translate(0, 0.5, 0);
  for (let i = 0; i < 7; i++) { const d = V((r() - 0.3) * 0.9, 0.8 + r() * 0.4, (r() - 0.5) * 0.9).normalize(); parts.push([br, c, new THREE.Matrix4().compose(tip.clone().addScaledVector(V(0, -1, 0), r() * 0.06), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d), V(1, 0.06 + r() * 0.05, 1))]); }
  return mergeColored(parts); })();
// a lamella: a gently curved plate thick with setae, leaning toward the base of the toe
function setaeCarpet(sc, { n = 1800, w = 420, l = 420, seed = 5 } = {}) { const m = SEM_M(); m.vertexColors = true;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(w * 1.6, 20, l * 1.6, 60, 1, 60), SEM_M()); { const p = plate.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (p.getY(i) > 0) p.setY(i, 10 + 6 * Math.sin(x * 0.012) + 4 * Math.sin(z * 0.02)); } plate.geometry.computeVertexNormals(); } plate.position.y = -10; plate.receiveShadow = true; sc.add(plate);
  const im = new THREE.InstancedMesh(SETA_GEO, m, n), r = rng(seed), M4 = new THREE.Matrix4(), sp = Math.sqrt(w * l / n);
  let k = 0; for (let a = -w / 2; a < w / 2; a += sp) for (let b = -l / 2; b < l / 2; b += sp) { if (k >= n) break; const x = a + (r() - 0.5) * sp * 0.8, z = b + (r() - 0.5) * sp * 0.8, y = 6 * Math.sin(x * 0.012) + 4 * Math.sin(z * 0.02); const L = 95 + r() * 30;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.2, -0.3 + (r() - 0.5) * 0.4, -0.5 + (r() - 0.5) * 0.2)); M4.compose(V(x, y, z), q, V(L, L, L)); im.setMatrixAt(k, M4); im.setColorAt(k, new THREE.Color().setScalar(0.85 + r() * 0.15)); k++; }
  im.count = k; im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; sc.add(im); return { plate, im }; }
// one seta up close: a shaft that splits into branches, each ending in a fan of flat spatulae
function oneSeta(sc, { L = 110, seed = 8 } = {}) { const g = new THREE.Group(), m = SEM_M(), r = rng(seed); const shaftPts = []; for (let i = 0; i <= 16; i++) { const s = i / 16; shaftPts.push(V(30 * s * s, L * 0.75 * s, 0)); }
  const shaft = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(shaftPts), 64, 2.2, 16), m); shaft.castShadow = true; g.add(shaft);
  const top = shaftPts[16], dirTop = top.clone().sub(shaftPts[14]).normalize(); const brG = new THREE.CylinderGeometry(0.35, 0.6, 1, 8, 1); brG.translate(0, 0.5, 0); const subG = new THREE.CylinderGeometry(0.1, 0.2, 1, 5, 1); subG.translate(0, 0.5, 0);
  const spG = new THREE.BufferGeometry(); spG.setAttribute('position', new THREE.Float32BufferAttribute([-0.55, 0, 0, 0.55, 0, 0, 0, 0.9, 0.05, 0.55, 0, 0, -0.55, 0, 0, 0, 0.9, 0.05], 3)); spG.computeVertexNormals();
  const NB = 14, NSB = 18, br = new THREE.InstancedMesh(brG, m, NB), sb = new THREE.InstancedMesh(subG, m, NB * NSB), spat = new THREE.InstancedMesh(spG, new THREE.MeshPhysicalMaterial({ color: 0xd8dade, roughness: 0.4, side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color(0xffffff) }), NB * NSB);
  const M4 = new THREE.Matrix4(), ends = []; let k = 0;
  for (let i = 0; i < NB; i++) { const d = dirTop.clone().add(V((r() - 0.5) * 1.1, (r() - 0.2) * 0.4, (r() - 0.5) * 1.1)).normalize(), len = 14 + r() * 8, base = top.clone().addScaledVector(dirTop, -r() * 4);
    M4.compose(base, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d), V(1, len, 1)); br.setMatrixAt(i, M4); const tip = base.clone().addScaledVector(d, len);
    for (let j = 0; j < NSB; j++) { const d2 = d.clone().add(V((r() - 0.5) * 1.6, (r() - 0.3) * 0.6, (r() - 0.5) * 1.6)).normalize(), l2 = 3 + r() * 3, b2 = tip.clone().addScaledVector(d, -r() * 3);
      M4.compose(b2, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d2), V(1, l2, 1)); sb.setMatrixAt(k, M4); const e = b2.clone().addScaledVector(d2, l2);
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d2).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), 1.2)); M4.compose(e, q, V(1, 1, 1)); spat.setMatrixAt(k, M4); ends.push(e); k++; } }
  [br, sb, spat].forEach(x => { x.castShadow = true; x.frustumCulled = false; g.add(x); }); g.userData = { top, ends, shaftPts }; sc.add(g); return g; }
// ---------- atoms (nm): a spatula tip coming down onto the ceiling ----------
function atomLayer(nx, nz, a, colors, rr, seed, jitter = 0.05) { const r = rng(seed), list = []; for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const x = (i - nx / 2) * a + (k % 2) * a / 2 + (r() - 0.5) * jitter, z = (k - nz / 2) * a * 0.866 + (r() - 0.5) * jitter; list.push([x, (r() - 0.5) * jitter, z, colors[Math.floor(r() * colors.length)], rr * (0.9 + r() * 0.2)]); } return list; }
function atomsMesh(list) { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.15 }), list.length), M4 = new THREE.Matrix4();
  list.forEach(([x, y, z, c, rr], i) => { M4.compose(V(x, y, z), new THREE.Quaternion(), V(rr, rr, rr)); m.setMatrixAt(i, M4); m.setColorAt(i, new THREE.Color(c)); }); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; return m; }
// electron clouds: soft, slightly shifting halos around the atoms that face each other (fluctuating dipoles)
const CLOUD_T = (() => { const [c, g] = mkCanvas(128, 128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(140,200,255,0.5)'); gr.addColorStop(0.5, 'rgba(110,170,255,0.2)'); gr.addColorStop(1, 'rgba(90,150,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return texOf(c, false); })();
// ---------- a coin-sized patch of gecko-style hairs on the ceiling, holding a cement bag on a rope ----------
const PATCH_T = (() => { const [c, g] = mkCanvas(256, 256), r = rng(81); g.fillStyle = '#2a2c30'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); for (let i = 0; i < 5000; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 122; g.fillStyle = `rgba(${150 + r() * 60},${150 + r() * 60},${160 + r() * 60},0.35)`; g.fillRect(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 1.5, 1.5); } return texOf(c); })();
function patchAndBag(sc, at) { const g = new THREE.Group(); g.position.copy(at); sc.add(g);
  const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 48), new THREE.MeshPhysicalMaterial({ map: PATCH_T, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0x9aa4b4) })); patch.position.y = -0.06; g.add(patch);
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 10, 24), new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 0.9, roughness: 0.3 })); eye.position.y = -0.62; g.add(eye);
  const ropeM = new THREE.MeshPhysicalMaterial({ color: 0xc8b48a, roughness: 0.8, normalMap: rep(GRAIN_N, 1, 30), normalScale: V2(0.8, 0.8) });
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1, 10), ropeM); g.add(rope);
  const bag = model('cement_bag'); bag.rotation.set(Math.PI / 2, 0, 0); const bagG = new THREE.Group(); bagG.add(bag); bag.position.set(0, -35, -9); g.add(bagG);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(10, 0.3, 8, 40), ropeM); loop.rotation.set(0, 0, 0); loop.scale.set(1.25, 1, 0.55); bagG.add(loop); loop.position.set(0, -4, 0);
  g.userData = { patch, rope, bagG, update(t, k = 1) { const sw = 0.03 * Math.sin(t * 1.3), drop = 62; bagG.position.set(Math.sin(sw) * drop, -drop * Math.cos(sw), 0); bagG.rotation.z = sw; bagG.rotation.y = 0.15 * Math.sin(t * 0.7);
    const top = V(0, -0.7, 0), bot = bagG.position.clone().add(V(0, 5, 0)); rope.position.copy(lv(top, bot, 0.5)); rope.scale.set(1, top.distanceTo(bot), 1); rope.quaternion.setFromUnitVectors(V(0, 1, 0), top.clone().sub(bot).normalize()); } };
  return g; }

// =====================================================================
// SHOTS (11). The first and last shots share the loop frame: the gecko resting upside down on the ceiling by the bulb.
// The last shot has it dash in and stop exactly there.
// =====================================================================
const END = C.end, DD = 40;
// the resting spot (surface-frame coordinates): ~17 cm from the bulb's cord, heading toward the light
const P_REST = V(-14, 0, 9), DIR = V(14, 0, -9).normalize(), HEAD = Math.atan2(-DIR.z, DIR.x);
const restPath = (d) => ({ p: P_REST.clone().addScaledVector(DIR, d - DD), h: HEAD });
function ceilSet(s, opts = {}) { const sc = s.scene, R = room(sc, opts); const F = ceilingFrame(sc, V(0, 0, 0), 0); const gk = makeGecko(); F.add(gk); F.updateMatrixWorld(true);
  const W = (v) => F.localToWorld(v.clone()), fwdW = W(DIR.clone()).sub(W(V(0, 0, 0))).normalize(), sideW = fwdW.clone().cross(V(0, -1, 0)).normalize();
  return { sc, R, F, gk, W, fwdW, sideW }; }
// the hook camera: below the gecko's middle, looking up, its head at the top of the frame
const hookAt = (h) => { const mid = h.W(restPath(DD - 10).p); return { p: mid.clone().add(V(0, -54, 0)).addScaledVector(h.sideW, 9).addScaledVector(h.fwdW, -6), t: mid, up: h.fwdW }; };
const restPose = (t) => ({ t: t + 30, d: DD, path: restPath, headYaw: 0.16 * Math.sin(t * 0.8) + 0.05 * Math.sin(t * 2.1) });
// the final dash: full speed until 1.1 s before the loop point, braking to a stop 0.55 s before it
const dashSpeed = (tau) => smooth(-0.55, -1.1, tau);
const DV = 24; // walk-in speed for the loop shot: slow enough that it's on screen from the cut
function dashD(tau, v = DV) { if (tau >= -0.55) return DD; let d = 0; const n = 60, a = tau, b = -0.55; for (let i = 0; i < n; i++) { const x = a + (b - a) * (i + 0.5) / n; d += dashSpeed(x) * v * (b - a) / n; } return DD - d; }

// 0) A gecko could hang from your ceiling all day, with no glue at all. — upside down on the ceiling by the bulb
shot(0, C.look, (s) => { const h = ceilSet(s); s.ap = 9; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => { h.gk.userData.pose(restPose(t)); const H0 = hookAt(h), k = 0.06 * seg(t, 0, C.look); shootC(s.cam, lv(H0.p, H0.t, k), H0.t, H0.up, { fov: 30, t: t + 100, hand: 0.05, focus: H0.p.distanceTo(H0.t) * (1 - k) }); }; });

// 1) Look closer at its toes. — pushing in toward a front foot
shot(C.look, C.theyre, (s) => { const h = ceilSet(s); s.ap = 12; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => { h.gk.userData.pose(restPose(t)); const H0 = hookAt(h), k = E.io(seg(t, C.look, C.theyre)); const foot = h.W(restPath(DD - 6.4).p.clone().add(V(0, 0, 0))).addScaledVector(h.sideW, -3.6).addScaledVector(h.fwdW, 2.4);
    const p = lv(H0.p, foot.clone().add(V(0, -11, 0)).addScaledVector(h.sideW, -3).addScaledVector(h.fwdW, -4), k), tg = lv(H0.t, foot, k); shootC(s.cam, p, tg, h.fwdW, { fov: 30, t: t + 100, hand: 0.05 }); }; });

// 2) They're lined with ridges, — looking down through glass at the toe pads pressed flat: rows of ridges
shot(C.theyre, C.covered, (s) => { const sc = s.scene, K = skylight(sc), gk = makeGecko(); K.F.add(gk); K.F.updateMatrixWorld(true); s.ap = 14; s.maxR = 16; s.exposure = 1.05; s.bloom = 0.35;
  const path = (d) => ({ p: V(d - DD, 0, 0), h: 0 });
  s.update = (t) => { gk.userData.pose({ t, d: DD, path, headYaw: 0.1 * Math.sin(t) }); const foot = K.F.localToWorld(V(-6.4 + 2.4, 0, 3.6)); const k = seg(t, C.theyre, C.covered);
    shoot(s.cam, foot.clone().add(V(-0.5 - 0.6 * k, 7.5 - 1.6 * k, 2.2 - 0.4 * k)), foot.clone().add(V(0, -0.1, 0)), { fov: 30, t, hand: 0.03 }); }; }, { near: 0.05, far: 2000 });

// 3) covered in about two million tiny hairs. — under the electron microscope: a lamella's carpet of setae
shot(C.covered, C.each, (s) => { const sc = s.scene; semLight(sc); setaeCarpet(sc); s.ap = 10; s.maxR = 16; s.exposure = 1.05; s.bloom = 0.3;
  const lab = liveLabel(0.95, 0.26); OV(s, lab); lab.userData.set([['≈ 2,000,000 HAIRS', 92, 0.5, '#ffffff', 900, 3]]);
  s.update = (t) => { const k = seg(t, C.covered, C.each); const cp = V(-260 + 90 * k, 210 - 50 * k, 260 - 70 * k), ct = V(-20 + 20 * k, 60, 0); shoot(s.cam, cp, ct, { fov: 30, t, hand: 0.3, focus: cp.distanceTo(V(-20, 60, 0)) });
    pinF(s.cam, lab, 0, 0.36, 3, spring(t, C.two - 0.05, 2, 6)); }; }, { near: 0.5, far: 8000 });

// 4) Each hair splits into hundreds of even tinier tips. — one seta: up the shaft to the branching tip
shot(C.each, C.theyre2, (s) => { const sc = s.scene; semLight(sc, { bg: 0x040506 }); sc.fog = new THREE.FogExp2(0x040506, 0.006); const car = setaeCarpet(sc, { n: 900, seed: 9 }); car.im.position.set(0, -20, -160); car.plate.position.set(0, -30, -160); const S = oneSeta(sc); S.position.set(0, 0, 0); s.ap = 10; s.maxR = 16; s.exposure = 0.8; s.bloom = 0.25;
  const lab = liveLabel(0.8, 0.26); OV(s, lab); lab.userData.set([['SPATULAE', 120, 0.5, '#ffffff', 900, 3]]);
  s.update = (t) => { const k = E.io(seg(t, C.each, C.theyre2)), tip = S.userData.top.clone().add(V(4, 8, 0)); const tg = lv(V(14, 52, 0), tip, k), cp = lv(V(-40, 70, 150), tip.clone().add(V(-14, 6, 34)), k);
    shoot(s.cam, cp, tg, { fov: 30, t, hand: 0.2, focus: cp.distanceTo(tg) }); pinF(s.cam, lab, 0, -0.34, 3, spring(t, C.tinier, 2, 6)); }; }, { near: 0.2, far: 8000 });

// 5-6) They're so small, they get close enough for the molecules themselves to pull together. — atoms of a spatula tip and the ceiling
function atomSet(s) { const sc = s.scene; sc.background = new THREE.Color(0x05070c); sc.environment = STUDIO.env; sc.environmentIntensity = 0.5; sc.fog = new THREE.FogExp2(0x05070c, 0.12);
  const k = new THREE.DirectionalLight(0xffffff, 1.8); k.position.set(-3, 6, 5); sc.add(k); const rim = new THREE.DirectionalLight(0x9ac8ff, 1.6); rim.position.set(4, 2, -6); sc.add(rim);
  const bot = atomsMesh([...atomLayer(26, 18, 0.32, [0xd8c89a, 0xd8c89a, 0xc8302a], 0.13, 3, 0.02), ...atomLayer(26, 18, 0.32, [0xd8c89a, 0xc8302a], 0.13, 4, 0.02).map(([x, y, z, c, r]) => [x + 0.16, y - 0.27, z + 0.09, c, r])]); sc.add(bot);
  const top = new THREE.Group(); top.add(atomsMesh([...atomLayer(22, 16, 0.36, [0x3a3a40, 0x3a3a40, 0x3a3a40, 0xd42a20, 0x3456e0, 0xf0f0f0], 0.15, 7, 0.12), ...atomLayer(22, 16, 0.36, [0x3a3a40, 0xf0f0f0, 0xd42a20], 0.15, 8, 0.12).map(([x, y, z, c, r]) => [x + 0.18, y + 0.3, z + 0.1, c, r])])); sc.add(top);
  const clouds = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: CLOUD_T, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 300); clouds.frustumCulled = false; sc.add(clouds); clouds.userData.noDof = true;
  const r = rng(12), CL = []; for (let i = 0; i < 300; i++) CL.push({ x: (r() - 0.5) * 7, z: (r() - 0.5) * 5, top: r() < 0.5, ph: r() * 6.28 });
  return { top, bot, clouds, CL }; }
function atomUpdate(s, A, t, gap, glow) { A.top.position.y = gap; const q = new THREE.Quaternion(); s.cam.getWorldQuaternion(q); const M4 = new THREE.Matrix4();
  A.CL.forEach((c, i) => { const y = c.top ? gap - 0.05 : 0.08, off = 0.05 * Math.sin(t * 9 + c.ph); const sz = 0.55 * glow * (0.7 + 0.3 * Math.sin(t * 6 + c.ph)); M4.compose(V(c.x + off, y, c.z), q, V(sz + 1e-4, sz + 1e-4, 1)); A.clouds.setMatrixAt(i, M4); }); A.clouds.instanceMatrix.needsUpdate = true; }
shot(C.theyre2, C.for, (s) => { const A = atomSet(s); s.ap = 8; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.45;
  s.update = (t) => { const k = E.io(seg(t, C.theyre2, C.for + 0.2)); atomUpdate(s, A, t, lerp(3.2, 0.62, k), 0.3 * k); shoot(s.cam, V(-0.6 + 0.5 * k, 0.4 + 0.5 * (1 - k), 4.6 - 0.8 * k), V(0, 0.35 + 0.6 * (1 - k), 0), { fov: 30, t, hand: 0.05, focus: 4.4 }); }; }, { near: 0.01, far: 200 });
shot(C.for, C.a2, (s) => { const A = atomSet(s); s.ap = 8; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.55;
  const lab = liveLabel(0.95, 0.26); OV(s, lab); lab.userData.set([['VAN DER WAALS FORCE', 70, 0.5, '#9fd4ff', 900, 3]]);
  s.update = (t) => { const pull = smooth(C.pull - 0.1, C.pull + 0.25, t); atomUpdate(s, A, t, 0.62 - 0.1 * pull + 0.015 * Math.sin(t * 8) * (1 - pull), 0.5 + 0.8 * pull); const k = seg(t, C.for, C.a2);
    shoot(s.cam, V(-0.1 + 0.6 * k, 0.32, 3.8 - 0.5 * k), V(0, 0.3, 0), { fov: 30, t, hand: 0.05, focus: 3.6 }); pinF(s.cam, lab, 0, 0.42, 3, spring(t, C.molecules, 2, 6)); }; }, { near: 0.01, far: 200 });

// 7) A patch of hairs the size of a coin could lift a small child. — a coin-sized patch on the ceiling holding up a cement bag
shot(C.a2, C.to2, (s) => { const sc = s.scene; room(sc); const at = V(38, CEIL, 26), PB = patchAndBag(sc, at); s.ap = 7; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.35;
  const l1 = liveLabel(0.8, 0.26), l2 = liveLabel(0.8, 0.26); OV(s, l1, l2); l1.userData.set([['COIN-SIZED PATCH', 104, 0.5, '#ffffff', 900, 3]]); l2.userData.set([['≈ 20 KG · 45 LB', 116, 0.5, '#ffd27a', 900, 3]]);
  s.update = (t) => { PB.userData.update(t); const k = E.io(seg(t, C.coin - 0.1, C.child)); const tg = lv(at.clone().add(V(0, -1.5, 0)), at.clone().add(V(0, -88, 0)), k);
    const cp = lv(at.clone().add(V(-16, -16, 22)), at.clone().add(V(-120, -70, 170)), k); shoot(s.cam, cp, tg, { fov: 30, t, hand: 0.15, focus: cp.distanceTo(tg) });
    pinF(s.cam, l1, 0, 0.3, 3, spring(t, C.patch, 2, 6) * (1 - smooth(C.lift - 0.3, C.lift, t))); pinF(s.cam, l2, 0, -0.32, 3, spring(t, C.lift, 2, 6)); }; });

// 8) To let go, a gecko simply peels its toes back, like tape, — at ceiling level: the toes curl up from the tips
shot(C.to2, C.up, (s) => { const h = ceilSet(s); s.ap = 14; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => { const pk = (o) => smooth(C.peels - 0.25 + o, C.peels + 0.55 + o, t) * (1 - smooth(C.like + 0.25, C.tape + 0.2, t));
    h.gk.userData.pose({ ...restPose(t), peel: [pk(0), 0, 0, 0] }); const foot = h.gk.localToWorld(h.gk.userData.legs[0].wrist.clone()); const out = foot.clone().sub(h.W(restPath(DD - 6.4).p)).setY(0).normalize(); const k = seg(t, C.to2, C.up);
    const toe = h.gk.userData.legs[0].toes[2].t.userData.F, tp = h.gk.localToWorld(toe.P[6].clone()), base = h.gk.localToWorld(toe.P[0].clone()), td = tp.clone().sub(base).setY(0).normalize(), sd = V(td.z, 0, -td.x);
    const aim = h.gk.localToWorld(toe.P[3].clone()); shoot(s.cam, aim.clone().add(V(0, -1.0, 0)).addScaledVector(sd, 6.5 - 1.0 * k).addScaledVector(td, 1.5), aim.clone().add(V(0, 0.4, 0)), { fov: 30, t, hand: 0.04 }); }; });

// 9) up to fifteen times a second. — the gecko dashes across the ceiling
shot(C.up, C.so2, (s) => { const h = ceilSet(s); s.ap = 7; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.4; const lab = liveLabel(0.9, 0.26); OV(s, lab); lab.userData.set([['15× A SECOND', 130, 0.5, '#ffffff', 900, 3]]);
  const path = (d) => ({ p: V(-90 + d, 0, 40 - 0.25 * d), h: 0.245 });
  s.update = (t) => { const u = t - C.up, d = 30 + u * 62; h.gk.userData.pose({ t, d, path, speed: 1 }); const c = h.W(path(d - 10).p);
    shootC(s.cam, c.clone().add(V(0, -60, 0)).addScaledVector(h.sideW, 8), c, V(0, 0, -1), { fov: 32, t, hand: 0.15 }); pinF(s.cam, lab, 0, 0.36, 3, 0.8 * spring(t, C.fifteen, 2, 6)); }; });

// 10) So if one ever lands on your ceiling, don't wait for it to fall, because — it dashes in and stops by the bulb (the loop)
shot(C.so2, END + 1, (s) => { const h = ceilSet(s); s.ap = 9; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => { const tau = t - END; const sp = dashSpeed(tau); if (sp > 0.001 || tau < -0.55) h.gk.userData.pose({ ...restPose(tau), d: dashD(tau), speed: sp, headYaw: (1 - sp) * restPose(tau).headYaw }); else h.gk.userData.pose(restPose(tau));
    const H0 = hookAt(h), k = E.io(seg(t, C.so2, END - 0.35)), wide = H0.p.clone().add(V(0, -75, 0)).addScaledVector(h.fwdW, -38);
    const p = lv(wide, H0.p, k), tg = lv(h.W(restPath(DD - 34).p), H0.t, k); shootC(s.cam, p, tg, H0.up, { fov: 30, t: k > 0.999 ? tau + 100 : lerp(t, tau + 100, k), hand: 0.05, focus: k > 0.999 ? H0.p.distanceTo(H0.t) : p.distanceTo(tg) }); }; });

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
const TR = { 2: [C.theyre - 0.08, C.theyre + 0.14, 4], 3: [C.covered - 0.12, C.covered + 0.18, 3], 4: [C.each - 0.1, C.each + 0.15, 2], 5: [C.theyre2 - 0.12, C.theyre2 + 0.18, 3], 6: [C.for - 0.1, C.for + 0.15, 2], 7: [C.a2 - 0.08, C.a2 + 0.14, 4], 8: [C.to2 - 0.1, C.to2 + 0.15, 2], 9: [C.up - 0.08, C.up + 0.14, 4], 10: [C.so2 - 0.08, C.so2 + 0.14, 4] };

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
  // labels and callouts (a shot's .overlay scene) go on after depth of field and motion blur, so they stay crisp
  const ov = (mode && p > 0.5) ? b : a; if (ov && ov.overlay) { const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(rtFrame); renderer.render(ov.overlay, ov.cam); renderer.autoClear = ac; }
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
