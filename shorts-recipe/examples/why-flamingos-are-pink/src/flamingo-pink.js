// "Why Flamingos Are Pink": a photoreal 9:16 short. three.js, rendered headless frame by frame.
// Real CC0 HDR lighting (a salt pan at sunrise), scanned textures and models from Poly Haven; procedural flamingos.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GroundProjectedSkybox } from 'three/addons/objects/GroundProjectedSkybox.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

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
  flamingos: 0.01, arent: 0.56, born: 0.9, pink: 1.18, their: 1.92, chicks: 2.02, hatch: 2.28, fluffy: 2.64, and: 3.0, grey: 3.4, the: 4.24, pink2: 4.32,
  comes: 4.61, from: 4.8, their2: 5.02, food: 5.18, tiny: 5.93, shrimp: 6.24, and2: 6.64, algae: 6.88, full: 7.22, of: 7.58, orangered: 7.9,
  pigments: 8.46, called: 8.96, carotenoids: 9.28, the2: 10.22, same: 10.32, kind: 10.6, that: 10.92, make: 11.14, carrots: 11.38, orange: 11.68,
  a: 12.79, flamingos2: 12.88, body: 13.52, pulls: 13.76, out: 14.06, those: 14.43, pigments2: 14.69, and3: 15.08, packs: 15.3, them: 15.6, into: 15.8,
  its: 16.0, growing: 16.2, feathers: 16.58, legs: 17.28, and4: 17.74, beak: 18.21, take: 18.64, them2: 18.82, away: 19.02, and5: 19.4, new_: 19.76,
  feathers2: 19.96, grow: 20.36, in_: 20.68, pale: 20.9, thats: 21.79, why: 22.06, zoos: 22.32, add: 22.74, pigment: 23.22, to: 23.52, their3: 23.72,
  food2: 23.86, and6: 24.7, in_2: 24.8, mating: 24.96, season: 25.2, flamingos3: 26.02, even: 26.56, wear: 26.86, makeup: 27.14, rubbing: 27.86,
  pink3: 28.16, oil: 28.7, from2: 28.96, a2: 29.24, gland: 29.46, near: 29.68, their4: 29.94, tail: 30.2, all: 30.73, over: 30.92, their5: 31.16,
  feathers3: 31.38, so: 32.3, that2: 32.44, pink4: 32.74, isnt: 32.94, really: 33.24, theirs: 33.48, at: 33.74, all2: 33.94, because: 34.26,
  end: 34.6667,
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
// REAL ASSETS (all CC0, from Poly Haven): a salt pan at sunrise and a studio as HDR environments,
// a cutting board and a wooden bucket, scanned mud and concrete. Loaded once before the first frame.
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
const [PAN, STUDIO] = await Promise.all(['aarfontein_pan_4k.hdr', 'studio_small_09_1k.hdr'].map(loadHDR));
const MOD = {};
await Promise.all(['wooden_cutting_board', 'wooden_bucket_01'].map(async id => { MOD[id] = await loadModel(id); }));
const TX = {};
await Promise.all([['mud', 'brown_mud', false], ['concrete', 'concrete_floor_02', false]].map(async ([k, id, d]) => { TX[k] = await loadPBR(id, { detail: d }); }));
const model = (id) => MOD[id].clone(true);
// a named part of a model (e.g. the clock's minute hand)
const part = (root, name) => { let f = null; root.traverse(o => { if (o.name === name) f = o; }); return f; };

// =====================================================================
// BIRDS (shared by the pigeon, flamingo and owl shorts): one lofted skin from tail to beak, so body, neck and head move as one smooth surface,
// feathered with procedural textures (overlapping contour feathers, an iridescent neck), with folded
// wings, a tail fan, eyes, cere, beak and two legs solved by IK.
// The gait: the body walks on steadily; the head holds still in space, then thrusts ahead (hold-thrust).
// =====================================================================
function heightToNormal(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const im = g.createImageData(w, h);
  const Hh = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (Hh(x + 1, y) - Hh(x - 1, y)) * strength, dy = (Hh(x, y + 1) - Hh(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const texOf = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };

// ---------- contour feathers: overlapping scallops, tips toward -x (the tail); anterior rows overlap posterior ones ----------
function featherSheet({ w = 1024, h = 1024, rows = 16, cols = 16, seed = 3, barbs = 0.5 } = {}) {
  const [hc, g] = mkCanvas(w, h), [ac, a] = mkCanvas(w, h), r = rng(seed), fw = w / rows, fh = h / cols;
  g.fillStyle = '#202020'; g.fillRect(0, 0, w, h); a.fillStyle = '#c8c8c8'; a.fillRect(0, 0, w, h);
  const feather = (cx, cy, lum, jit) => {
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      const x = cx + ox, y = cy + oy; if (x < -fw * 2 || x > w + fw * 2 || y < -fh * 2 || y > h + fh * 2) continue;
      const rx = fw * (0.95 + jit * 0.1), ry = fh * (0.64 + jit * 0.08), ex = x - fw * 0.15;
      const gr = g.createLinearGradient(x + fw * 0.7, y, ex - rx, y); gr.addColorStop(0, '#787878'); gr.addColorStop(0.8, '#a4a4a4'); gr.addColorStop(1, '#b0b0b0');
      g.fillStyle = gr; g.beginPath(); g.ellipse(ex, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
      // the rachis: a faint ridge down the middle
      g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + fw * 0.6, y); g.lineTo(ex - rx * 0.85, y + (jit - 0.5) * 2); g.stroke();
      // albedo: each feather a touch lighter or darker, its visible tip edge slightly darker
      const ag = a.createLinearGradient(x + fw * 0.7, y, ex - rx, y); const L = Math.round(200 + lum * 14);
      ag.addColorStop(0, `rgb(${L},${L},${L})`); ag.addColorStop(0.82, `rgb(${L},${L},${L})`); ag.addColorStop(1, `rgb(${L - 14},${L - 14},${L - 13})`);
      a.fillStyle = ag; a.beginPath(); a.ellipse(ex, y, rx, ry, 0, 0, Math.PI * 2); a.fill();
    }
  };
  for (let i = 0; i <= rows + 1; i++) for (let j = -1; j <= cols; j++) feather(i * fw + (r() - 0.5) * fw * 0.12, (j + (i % 2) * 0.5) * fh + (r() - 0.5) * fh * 0.15, r() - 0.5, r());
  // barbs: fine streaks running back and out from each rachis
  g.globalAlpha = 0.05 * barbs; g.strokeStyle = '#ffffff';
  for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, L = 4 + r() * 8, s = r() > 0.5 ? 1 : -1; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x - L, y + s * L * 0.55); g.stroke(); }
  g.globalAlpha = 1;
  const [bc, bg] = mkCanvas(w, h); bg.filter = 'blur(1.6px)'; bg.drawImage(hc, 0, 0);
  return { map: texOf(ac), normalMap: heightToNormal(bc, 3.0) };
}

// ---------- folded wing sheet: coverts (scallops) -> two dark bars -> long dark primaries; s along x, across along y ----------
function wingSheet({ w = 1024, h = 512, seed = 5, base = [134, 140, 154], bar = [38, 40, 46], prim = [68, 73, 84], bars = true } = {}) {
  const [hc, g] = mkCanvas(w, h), [ac, a] = mkCanvas(w, h), r = rng(seed); const col = (c, k = 0) => `rgb(${c.map(v => Math.round(clamp(v + k, 0, 255))).join(',')})`;
  g.fillStyle = '#404040'; g.fillRect(0, 0, w, h); a.fillStyle = col(base); a.fillRect(0, 0, w, h);
  const plume = (x0, y0, len, wid, ang, c, hv = 200) => { // one feather lying along +x from its base (x0, y0), tip rounded
    const gr = g.createLinearGradient(x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len); gr.addColorStop(0, '#303030'); gr.addColorStop(0.7, `rgb(${hv},${hv},${hv})`); gr.addColorStop(1, '#e8e8e8');
    for (const [cx, cy] of [[g, gr], [a, c]]) { cx.save(); cx.translate(x0, y0); cx.rotate(ang); cx.fillStyle = cy; cx.beginPath(); cx.moveTo(0, -wid * 0.5); cx.lineTo(len - wid * 0.5, -wid * 0.5); cx.arc(len - wid * 0.5, 0, wid * 0.5, -Math.PI / 2, Math.PI / 2); cx.lineTo(0, wid * 0.5); cx.closePath(); cx.fill(); cx.restore(); }
    g.save(); g.translate(x0, y0); g.rotate(ang); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(len - wid * 0.4, 0); g.stroke(); g.restore();
  };
  // primaries (rear 40%), drawn first so the secondaries and coverts lie on top
  for (let i = 0; i < 9; i++) { const y = h * (0.12 + i * 0.1), x0 = w * (0.5 + i * 0.012); plume(x0, y, w * (0.5 - i * 0.012), h * 0.2, -0.05 - i * 0.012, col(prim, (r() - 0.5) * 10 - i * 2)); }
  // secondaries with the two dark bars across them (on a pigeon the bars lie across the secondaries and greater coverts)
  for (let i = 0; i < 12; i++) { const y = h * (-0.02 + i * 0.095), x0 = w * (0.3 + i * 0.006); const L = w * 0.33; plume(x0, y, L, h * 0.19, -0.04, col(base, (r() - 0.5) * 12)); }
  if (bars) for (let b = 0; b < 2; b++) {
    a.save(); a.fillStyle = col(bar); a.beginPath(); const x0 = w * (b ? 0.585 : 0.455), bw = w * 0.055;
    a.moveTo(x0, 0); a.lineTo(x0 + bw, 0); a.lineTo(x0 + bw + w * 0.05, h); a.lineTo(x0 + w * 0.05, h); a.closePath(); a.globalAlpha = 0.92; a.fill(); a.restore();
  }
  // coverts: rows of small scallops over the front of the wing
  for (let i = 0; i < 15; i++) for (let j = -1; j < 11; j++) { // coverts: overlapping rounded scallops
    const x = w * (0.0 + i * 0.026) + (r() - 0.5) * 6, y = h * (j + (i % 2) * 0.5) / 10, rx = w * 0.03, ry = h * 0.065, cc = col(base, (r() - 0.5) * 8 + 4 - i * 0.4);
    const gr = g.createLinearGradient(x - rx, y, x + rx, y); gr.addColorStop(0, '#6c6c6c'); gr.addColorStop(0.8, '#a0a0a0'); gr.addColorStop(1, '#a8a8a8');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); a.fillStyle = cc; a.beginPath(); a.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); a.fill();
  }
  const [bc, bg] = mkCanvas(w, h); bg.filter = 'blur(2px)'; bg.drawImage(hc, 0, 0);
  const [cc2, cg] = mkCanvas(w, h); cg.filter = 'blur(1.2px)'; cg.drawImage(ac, 0, 0);
  return { map: texOf(cc2), normalMap: heightToNormal(bc, 2.0) };
}

// ---------- tail feather card (alpha): grey, a black band near the tip, a pale edge ----------
function tailFeatherTex() {
  const [c, g] = mkCanvas(128, 512);
  g.clearRect(0, 0, 128, 512); g.save(); g.beginPath(); g.moveTo(22, 512); g.lineTo(18, 60); g.quadraticCurveTo(64, -18, 110, 60); g.lineTo(106, 512); g.closePath(); g.clip();
  const gr = g.createLinearGradient(0, 512, 0, 0); gr.addColorStop(0, '#8d94a3'); gr.addColorStop(0.72, '#7f8696'); gr.addColorStop(0.76, '#24262b'); gr.addColorStop(0.95, '#2b2d33'); gr.addColorStop(1, '#5d6068');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 512);
  g.strokeStyle = 'rgba(230,232,238,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 512); g.lineTo(64, 14); g.stroke();
  g.globalAlpha = 0.08; g.strokeStyle = '#fff'; for (let y = 20; y < 512; y += 5) { g.beginPath(); g.moveTo(64, y); g.lineTo(10, y - 22); g.moveTo(64, y); g.lineTo(118, y - 22); g.stroke(); }
  g.restore(); return texOf(c);
}
function irisTex(outer = '#a8401a', inner = '#c7742a', pupil = 44) {
  const [c, g] = mkCanvas(256, 256); const r = rng(9);
  g.fillStyle = '#5a1a08'; g.fillRect(0, 0, 256, 256);
  const gr = g.createRadialGradient(128, 128, 30, 128, 128, 120); gr.addColorStop(0, inner); gr.addColorStop(0.42, inner); gr.addColorStop(0.56, outer); gr.addColorStop(0.88, outer); gr.addColorStop(1, '#5c1a08');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 900; i++) { const an = r() * Math.PI * 2, r0 = 44 + r() * 30, r1 = 70 + r() * 50; g.strokeStyle = `rgba(${r() > 0.5 ? '255,200,120' : '120,30,10'},${0.08 + r() * 0.12})`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(128 + Math.cos(an) * r0, 128 + Math.sin(an) * r0); g.lineTo(128 + Math.cos(an + 0.05) * r1, 128 + Math.sin(an + 0.05) * r1); g.stroke(); }
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '70,20,6' : '230,150,70'},${0.06 + r() * 0.1})`; const an = r() * 6.28, rr = 50 + r() * 65; g.beginPath(); g.arc(128 + Math.cos(an) * rr, 128 + Math.sin(an) * rr, 3 + r() * 7, 0, 6.28); g.fill(); }
  g.fillStyle = '#050505'; g.beginPath(); g.arc(128, 128, pupil, 0, Math.PI * 2); g.fill();
  return texOf(c);
}
const SCALE_N = (() => { // reptile-like scales on the legs and toes
  const [c, g] = mkCanvas(128, 256); g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 256); const r = rng(4);
  for (let y = 0; y < 256; y += 14) { const gr = g.createLinearGradient(0, y, 0, y + 14); gr.addColorStop(0, '#c0c0c0'); gr.addColorStop(0.8, '#6a6a6a'); gr.addColorStop(1, '#404040'); g.fillStyle = gr; g.fillRect(0, y, 128, 14); for (let x = 0; x < 128; x += 18 + r() * 10) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y, 2, 14); } }
  return heightToNormal(c, 2);
})();

// per-species textures, made once
function birdTex(spec) { if (!spec._tex) spec._tex = { feather: featherSheet(spec.featherOpts || { seed: 3 }), wing: wingSheet(spec.wingOpts || {}), tail: spec.tailTex ? spec.tailTex() : TAIL_T, iris: irisTex(...(spec.iris || [])) }; return spec._tex; }

// parallel-transport frames along a curve
function ptFrames(curve, n) {
  const P = [], T = [], N = [], B = [];
  for (let i = 0; i <= n; i++) { P.push(curve.getPointAt(i / n)); T.push(curve.getTangentAt(i / n).normalize()); }
  let up = Math.abs(T[0].y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  N.push(up.clone().sub(T[0].clone().multiplyScalar(up.dot(T[0]))).normalize()); B.push(T[0].clone().cross(N[0]));
  for (let i = 1; i <= n; i++) {
    const ax = T[i - 1].clone().cross(T[i]), s = ax.length(); const nn = N[i - 1].clone();
    if (s > 1e-6) nn.applyAxisAngle(ax.normalize(), Math.asin(clamp(s, -1, 1)) * (T[i - 1].dot(T[i]) < 0 ? -1 : 1));
    nn.sub(T[i].clone().multiplyScalar(nn.dot(T[i]))).normalize(); N.push(nn); B.push(T[i].clone().cross(nn));
  }
  return { P, T, N, B };
}
// ---------- small math: Catmull-Rom over arrays of numbers (uniform), Hermite ----------
function crArr(P, t) { // P: array of arrays; t in [0, 1]
  const n = P.length - 1, f = clamp(t) * n, i = Math.min(Math.floor(f), n - 1), u = f - i;
  const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, n)];
  return p1.map((_, k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
}
const hermite = (p0, m0, p1, m1, u) => { const u2 = u * u, u3 = u2 * u; return p0.clone().multiplyScalar(2 * u3 - 3 * u2 + 1).add(m0.clone().multiplyScalar(u3 - 2 * u2 + u)).add(p1.clone().multiplyScalar(-2 * u3 + 3 * u2)).add(m1.clone().multiplyScalar(u3 - u2)); };

// ---------- the species ----------
const PIGEON = {
  // body-local spine samples (x forward, y up): [x, y, halfWidth, upperHeight, lowerHeight]
  body: [[-0.118, 0.030, 0.004, 0.003, 0.003], [-0.100, 0.026, 0.010, 0.006, 0.008], [-0.082, 0.021, 0.017, 0.012, 0.012], [-0.056, 0.015, 0.028, 0.021, 0.022], [-0.026, 0.010, 0.039, 0.028, 0.034],
         [0.006, 0.010, 0.043, 0.031, 0.042], [0.030, 0.019, 0.038, 0.030, 0.039], [0.042, 0.033, 0.028, 0.025, 0.029]],
  // head-local (origin at the middle of the skull)
  head: [[-0.017, -0.017, 0.0168, 0.0150, 0.0190], [-0.0115, -0.0065, 0.0166, 0.0164, 0.0166], [-0.003, 0.000, 0.0158, 0.0165, 0.0140], [0.007, -0.001, 0.0135, 0.0145, 0.0118], [0.015, -0.004, 0.0092, 0.0096, 0.0080], [0.0215, -0.0055, 0.0044, 0.0042, 0.0038]],
  neckPuff: 1.05, rowLen: [0.0105, 0.0060, 0.0028],
  color(u, th, nz) { // u: 0 tail -> 1 beak; th: angle around (pi/2 = top)
    const top = Math.sin(th), body = [0.56, 0.59, 0.66], back = [0.53, 0.56, 0.63], belly = [0.62, 0.64, 0.70], breast = [0.50, 0.47, 0.53], neck = [0.25, 0.28, 0.33], head = [0.35, 0.38, 0.45];
    let c = body.map((v, k) => lerp(lerp(v, belly[k], smooth(0, -0.9, top)), back[k], smooth(0.2, 0.9, top)));
    c = c.map((v, k) => lerp(v, breast[k], smooth(0.24, 0.40, u) * smooth(0.2, -0.6, top) * 0.8));
    c = c.map((v, k) => lerp(v, [0.66, 0.68, 0.74][k], smooth(0.13, 0.02, u) * 0.6));
    c = c.map((v, k) => lerp(v, neck[k], smooth(0.36, 0.47, u)));
    c = c.map((v, k) => lerp(v, head[k], smooth(0.70, 0.78, u)));
    const n = 1 + nz * 0.07; return c.map(v => Math.pow(v * n, 2.2));
  },
  // the iridescent patch (u, around) -> [mask, thickness 0..1]
  irid(u, th) { const m = smooth(0.40, 0.50, u) * smooth(0.76, 0.66, u); const front = Math.sin(th) < 0 ? 1 : 0.4; return [m, clamp(0.35 + 0.45 * smooth(0.48, 0.70, u) * (1 - 0.6 * front) + 0.1 * Math.cos(th))]; },
  legHip: V(0.006, -0.020, 0.015), L1: 0.032, L2: 0.031, legColor: 0xa8433d, headHeight: 0.170, bodyHeight: 0.074, bodyPitch: 0.16,
};

// ---------- a lofted bird skin ----------
function birdSkin(spec, { nb = 64, nn = 44, nh = 44, nv = 56 } = {}) {
  const nu = nb + nn + nh, cols = nv + 1, N = nu * cols;
  const pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), uv1 = new Float32Array(N * 2), col = new Float32Array(N * 3), idx = [];
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, d, b, a, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  // u of each ring, and its section parameters in its own part's frame
  const uB = 0.47, uN = 0.71; const ringU = [], part = [];
  for (let i = 0; i < nb; i++) { ringU.push(uB * i / nb); part.push(0); }
  for (let i = 0; i < nn; i++) { ringU.push(uB + (uN - uB) * i / nn); part.push(1); }
  for (let i = 0; i < nh; i++) { ringU.push(uN + (1 - uN) * i / (nh - 1)); part.push(2); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < cols; j++) {
    const k = i * cols + j, th = -Math.PI / 2 + 2 * Math.PI * j / nv, nz = (h3(i * 0.37, j * 0.71, 3) - 0.5);
    uv1[k * 2] = ringU[i]; uv1[k * 2 + 1] = j / nv; uv[k * 2 + 1] = j / nv;
    const c = spec.color(ringU[i], th, nz, 1); col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
  }
  const irid = spec.irid || (() => [0, 0]);
  // iridescence mask + thickness, roughness (glossier neck) in uv1 space
  const [mc, mg] = mkCanvas(256, 64), [tc, tg] = mkCanvas(256, 64), [rc, rg] = mkCanvas(256, 64);
  const mi = mg.createImageData(256, 64), ti = tg.createImageData(256, 64), ri = rg.createImageData(256, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) {
    const u = (x + 0.5) / 256, th = -Math.PI / 2 + 2 * Math.PI * (1 - (y + 0.5) / 64), [m, t] = irid(u, th), q = (y * 256 + x) * 4, n = h3(x * 0.3, y * 0.9, 1) * 0.08;
    mi.data[q] = mi.data[q + 1] = mi.data[q + 2] = m * 255; mi.data[q + 3] = 255;
    ti.data[q] = ti.data[q + 1] = ti.data[q + 2] = clamp(t + n - 0.04) * 255; ti.data[q + 3] = 255;
    const ro = lerp(0.82, 0.5, m); ri.data[q] = ri.data[q + 1] = ri.data[q + 2] = ro * 255; ri.data[q + 3] = 255;
  }
  mg.putImageData(mi, 0, 0); tg.putImageData(ti, 0, 0); rg.putImageData(ri, 0, 0);
  const ch1 = (c) => { const t = new THREE.CanvasTexture(c); t.channel = 1; t.flipY = true; return t; };
  const TX_ = birdTex(spec), fm = TX_.feather.map.clone(), fn = TX_.feather.normalMap.clone(); [fm, fn].forEach(t => { t.needsUpdate = true; t.repeat.set(1, 1); });
  const mat = new THREE.MeshPhysicalMaterial({
    map: fm, normalMap: fn, normalScale: new THREE.Vector2(spec.featherNormal ?? 0.24, spec.featherNormal ?? 0.24), vertexColors: true, roughness: 1, roughnessMap: ch1(rc),
    sheen: spec.sheen ?? 0.45, sheenRoughness: 0.55, sheenColor: new THREE.Color(...(spec.sheenColor || [0.30, 0.32, 0.38])),
    iridescence: spec.irid ? 1 : 0, iridescenceMap: ch1(mc), iridescenceIOR: 1.6, iridescenceThicknessRange: [220, 560], iridescenceThicknessMap: ch1(tc), envMapIntensity: 1.0,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  const P = Array.from({ length: nu }, () => new THREE.Vector3()), S = Array.from({ length: nu }, () => [0, 0, 0]), UP = Array.from({ length: nu }, () => new THREE.Vector3());
  const tmp = new THREE.Vector3(), T = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3();
  // bodyM / headM: matrices (bird-root space); returns nothing, rewrites the vertices
  mesh.userData.update = (bodyM, headM, opt = {}) => {
    const bq = new THREE.Quaternion().setFromRotationMatrix(bodyM), hq = new THREE.Quaternion().setFromRotationMatrix(headM);
    const bUp = V(0, 1, 0).applyQuaternion(bq), hUp = V(0, 1, 0).applyQuaternion(hq);
    for (let i = 0; i < nb; i++) { const s = crArr(spec.body, i / (nb - 1)); P[i].set(s[0], s[1], 0).applyMatrix4(bodyM); S[i] = [s[2], s[3], s[4]]; UP[i].copy(bUp); }
    for (let i = 0; i < nh; i++) { const s = crArr(spec.head, i / (nh - 1)); P[nb + nn + i].set(s[0], s[1], 0).applyMatrix4(headM); S[nb + nn + i] = [s[2], s[3], s[4]]; UP[nb + nn + i].copy(hUp); }
    // the neck: a Hermite curve leaving the body along its spine and entering the head along its own
    const p0 = P[nb - 1], p1 = P[nb + nn], chord = p0.distanceTo(p1);
    const nd0 = opt.neckDir || spec.neckDir0, m0 = (nd0 ? nd0.clone().applyQuaternion(bq) : P[nb - 1].clone().sub(P[nb - 3])).normalize().multiplyScalar(chord * ((opt.neckTan || spec.neckTan) ? (opt.neckTan || spec.neckTan)[0] : 0.85)), m1 = P[nb + nn + 2].clone().sub(P[nb + nn]).normalize().multiplyScalar(chord * ((opt.neckTan || spec.neckTan) ? (opt.neckTan || spec.neckTan)[1] : 0.75));
    // the neck's section sizes: a cubic that continues the body's taper and arrives with the head's (no crease at either joint)
    const lb = P[nb - 1].distanceTo(P[nb - 2]) || 1e-4, lh = P[nb + nn + 1].distanceTo(P[nb + nn]) || 1e-4, nl = chord * 1.15; // slopes per metre, scaled to the neck's length
    const ns_ = spec.neckSlope ?? 1, s0 = S[nb - 1], s1 = S[nb + nn], d0 = S[nb - 1].map((v, k) => (v - S[nb - 2][k]) / lb * nl * ns_), d1 = S[nb + nn + 1].map((v, k) => (v - S[nb + nn][k]) / lh * nl * ns_);
    for (let i = 0; i < nn; i++) {
      const u = (i + 1) / (nn + 1), u2 = u * u, u3 = u2 * u; P[nb + i].copy(hermite(p0, m0, p1, m1, u)); const puff = 1 + (spec.neckPuff - 1) * Math.pow(Math.sin(Math.PI * u), 2);
      S[nb + i] = s0.map((v, k) => Math.max(Math.min(v, s1[k]) * 0.55, ((2 * u3 - 3 * u2 + 1) * v + (u3 - 2 * u2 + u) * d0[k] + (-2 * u3 + 3 * u2) * s1[k] + (u3 - u2) * d1[k])) * puff);
    }
    const bZ = V(0, 0, 1).applyQuaternion(bq), hZ = V(0, 0, 1).applyQuaternion(hq), Ts = [], Sd = [];
    for (let i = 0; i < nu; i++) Ts.push(P[Math.min(i + 1, nu - 1)].clone().sub(P[Math.max(i - 1, 0)]).normalize());
    const ortho = (z, t) => z.clone().sub(t.clone().multiplyScalar(z.dot(t))).normalize();
    for (let i = 0; i < nb; i++) Sd[i] = ortho(bZ, Ts[i]);
    for (let i = nb; i < nb + nn; i++) { const q = new THREE.Quaternion().setFromUnitVectors(Ts[i - 1], Ts[i]); Sd[i] = Sd[i - 1].clone().applyQuaternion(q); Sd[i] = ortho(Sd[i], Ts[i]); }
    for (let i = nb + nn; i < nu; i++) Sd[i] = ortho(hZ, Ts[i]);
    { // spread the twist between the transported neck end and the head's own side axis along the neck
      const iN = nb + nn, tq = new THREE.Quaternion().setFromUnitVectors(Ts[iN - 1], Ts[iN]), sEnd = ortho(Sd[iN - 1].clone().applyQuaternion(tq), Ts[iN]);
      const want = Sd[iN], ang = Math.atan2(sEnd.clone().cross(want).dot(Ts[iN]), sEnd.dot(want));
      for (let i = nb; i < iN; i++) { const u = (i - nb + 1) / (nn + 1); Sd[i].applyAxisAngle(Ts[i], ang * smooth(0, 1, u)); }
    }
    for (let i = 0; i < nu; i++) {
      T.copy(Ts[i]); side.copy(Sd[i]); up.crossVectors(side, T).normalize();
      const [a, bu, bd] = S[i];
      for (let j = 0; j < cols; j++) {
        const th = -Math.PI / 2 + 2 * Math.PI * j / nv, c = Math.cos(th), s = Math.sin(th), k = (i * cols + j) * 3;
        tmp.copy(P[i]).addScaledVector(side, a * c).addScaledVector(up, (s > 0 ? bu : bd) * s);
        pos[k] = tmp.x; pos[k + 1] = tmp.y; pos[k + 2] = tmp.z;
      }
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    const nr = geo.attributes.normal.array; // weld the seam normals (belly line)
    for (let i = 0; i < nu; i++) { const a = i * cols * 3, b = (i * cols + nv) * 3; for (let q = 0; q < 3; q++) { const m = (nr[a + q] + nr[b + q]) / 2; nr[a + q] = nr[b + q] = m; } }
  };
  // uv.x: feather rows by rest-pose arc length (fixed afterwards, so a stretching neck stretches its feathers instead of sliding them)
  mesh.userData.initUV = () => {
    let acc = 0;
    for (let i = 0; i < nu; i++) {
      if (i > 0) acc += P[i].distanceTo(P[i - 1]) / spec.rowLen[part[i]];
      for (let j = 0; j < cols; j++) uv[(i * cols + j) * 2] = acc / 16;
    }
    geo.attributes.uv.needsUpdate = true;
  };
  // re-colour (k: 0 = the species' faded / juvenile palette, 1 = full colour); extra(i, c) may tint a vertex afterwards
  mesh.userData.recolor = (k, extra = null) => {
    for (let i = 0; i < nu; i++) for (let j = 0; j < cols; j++) { const q = i * cols + j, th = -Math.PI / 2 + 2 * Math.PI * j / nv, nz = (h3(i * 0.37, j * 0.71, 3) - 0.5); let c = spec.color(ringU[i], th, nz, typeof k === 'function' ? k(ringU[i], th) : k); if (extra) c = extra(q, c); col[q * 3] = c[0]; col[q * 3 + 1] = c[1]; col[q * 3 + 2] = c[2]; }
    geo.attributes.color.needsUpdate = true;
  };
  mesh.userData.section = (x) => { // body-local cross-section at body x (for placing wings): [y, a, bu, bd]
    const B = spec.body; if (x <= B[0][0]) return [B[0][1], B[0][2], B[0][3], B[0][4]];
    for (let t = 0; t <= 1.0001; t += 0.005) { const s = crArr(B, t); if (s[0] >= x) return [s[1], s[2], s[3], s[4]]; }
    const l = B[B.length - 1]; return [l[1], l[2], l[3], l[4]];
  };
  return mesh;
}

// ---------- a folded wing lying on the body's side (body-local); side = +1 right, -1 left ----------
function foldedWing(skin, sideSign, spec) {
  const W_ = { xFront: 0.026, xTip: -0.142, tailX: -0.086, tipA: 0.004, tipLift: 0.004, thTop: [1.32, 1.47], thBot: [-0.42, 0.55], sz: 1, ns: 44, nt: 16, color: 0xffffff, ...(spec.wing || {}) };
  const { xFront, xTip, tailX, tipA, tipLift, sz, ns, nt, color } = W_;
  const cols = nt + 1, N = (ns + 1) * cols, pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), idx = [];
  for (let i = 0; i <= ns; i++) for (let j = 0; j <= nt; j++) {
    const s = i / ns, t = j / nt, x = lerp(xFront, xTip, s), k = i * cols + j;
    let [cy, a, bu, bd] = skin.userData.section(Math.max(x, tailX));
    if (x < tailX) { const q = smooth(tailX, xTip, x); a = lerp(a, tipA, q); cy += tipLift * q; bu = lerp(bu, tipA * 0.75, q); }
    const thTop = lerp(W_.thTop[0], W_.thTop[1], smooth(0, 1, s)), thBot = lerp(W_.thBot[0], W_.thBot[1], smooth(0.15, 1, s)) - 0.25 * Math.sin(Math.PI * clamp(s * 1.6)) * (1 - s);
    const th = lerp(thTop, thBot, t), c = Math.cos(th), sn = Math.sin(th), b = sn > 0 ? bu : bd;
    const off = sz * (lerp(-0.0020, 0.0010, smooth(0, 0.3, s)) - 0.0024 * (1 - smooth(0, 0.4, t)) * (1 - 0.6 * smooth(0.5, 1, s)) + 0.0028 * smooth(0.35, 1, t) * smooth(0.05, 0.4, s));
    const nz = c / Math.max(a, 1e-4), ny = sn / Math.max(b, 1e-4), nl = Math.hypot(nz, ny) || 1;
    const y = cy + b * sn + off * ny / nl + 0.0008 * sz, z = sideSign * (a * c + off * nz / nl + 0.0007 * sz);
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = s; uv[k * 2 + 1] = t;
  }
  for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; if (sideSign > 0) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const WT = birdTex(spec).wing, m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: WT.map, normalMap: WT.normalMap, normalScale: new THREE.Vector2(0.42, 0.42), color, roughness: 0.84, sheen: 0.4, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.32, 0.34, 0.4), side: THREE.DoubleSide }));
  m.castShadow = m.receiveShadow = true; return m;
}
// the tail: a closed, slightly cupped fan of stacked feathers (a lofted solid, so it reads from every angle)
const TAIL_T = (() => {
  const [c, g] = mkCanvas(512, 256), [hc, hg] = mkCanvas(512, 256);
  const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#8a91a0'); gr.addColorStop(0.70, '#7c8392'); gr.addColorStop(0.75, '#26282d'); gr.addColorStop(0.93, '#2a2c31'); gr.addColorStop(1, '#4d5058');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256); hg.fillStyle = '#808080'; hg.fillRect(0, 0, 512, 256);
  for (let i = 0; i <= 12; i++) { const y = i * 256 / 12; g.fillStyle = 'rgba(20,20,24,0.25)'; g.fillRect(0, y - 1, 512, 2); hg.fillStyle = '#404040'; hg.fillRect(0, y - 1.5, 512, 3); hg.fillStyle = '#b0b0b0'; hg.fillRect(0, y + 1.5, 512, 6); }
  const [bc, bg] = mkCanvas(512, 256); bg.filter = 'blur(1.5px)'; bg.drawImage(hc, 0, 0);
  return { map: texOf(c), normalMap: heightToNormal(bc, 2) };
})();
function tailSolid(spec) {
  const T_ = { len: 0.105, w: [0.014, 0.027], h: [0.0065, 0.0012], droop: 0.006, cup: 0.004, ns: 24, nv: 28, ...(spec.tail || {}) }; const { len, ns, nv } = T_;
  const cols = nv + 1, pos = new Float32Array((ns + 1) * cols * 3), uv = new Float32Array((ns + 1) * cols * 2), idx = [];
  for (let i = 0; i <= ns; i++) for (let j = 0; j <= nv; j++) {
    const s = i / ns, th = 2 * Math.PI * j / nv, k = i * cols + j, w = lerp(T_.w[0], T_.w[1], Math.pow(s, 0.8)), h = lerp(T_.h[0], T_.h[1], s), c = Math.cos(th), sn = Math.sin(th);
    const z = w * Math.sign(c) * Math.pow(Math.abs(c), 0.45), y = h * Math.sign(sn) * Math.pow(Math.abs(sn), 0.9) - T_.droop * s * s + T_.cup * (z / T_.w[1]) ** 2;
    pos[k * 3] = -s * len; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = s; uv[k * 2 + 1] = j / nv;
  }
  for (let i = 0; i < ns; i++) for (let j = 0; j < nv; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; idx.push(a, b, d, a, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const TT = birdTex(spec).tail, m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: TT.map, normalMap: TT.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.8, sheen: 0.4, sheenColor: new THREE.Color(0.3, 0.32, 0.38), side: THREE.DoubleSide }));
  m.castShadow = m.receiveShadow = true; return m;
}
// ---------- legs ----------
function cyl(r0, r1, mat, rs = 14) { const g = new THREE.CylinderGeometry(r1, r0, 1, rs, 1, true); g.translate(0, 0.5, 0); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m; }
const UPY = V(0, 1, 0);
function placeBetween(m, a, b) { const d = b.clone().sub(a), L = d.length(); m.position.copy(a); m.quaternion.setFromUnitVectors(UPY, d.normalize()); m.scale.set(1, Math.max(L, 1e-5), 1); }
function makeFoot(legMat, clawMat, toeSpec = [[0.026, 0, 0.0018], [0.020, 0.45, 0.0016], [0.020, -0.45, 0.0016], [0.013, Math.PI, 0.0015]]) {
  const f = new THREE.Group(); const toes = [];
  const toe = (len, yaw, r0) => {
    const g = new THREE.Group(); g.rotation.y = yaw; f.add(g);
    const segs = []; let parent = g;
    for (let s = 0; s < 3; s++) { const j = new THREE.Group(); if (s) j.position.x = len / 3; parent.add(j); const c = cyl(r0 * (1 - s * 0.18), r0 * (1 - (s + 1) * 0.18), legMat, 10); c.rotation.z = -Math.PI / 2; c.scale.y = len / 3; j.add(c);
      const k = new THREE.Mesh(new THREE.SphereGeometry(r0 * (1 - s * 0.18) * 1.15, 10, 8), legMat); j.add(k); k.castShadow = true; segs.push(j); parent = j; }
    const claw = new THREE.Mesh(new THREE.ConeGeometry(r0 * 0.55, len * 0.2, 8), clawMat); claw.rotation.z = -Math.PI / 2 - 0.5; claw.position.set(len / 3 + len * 0.06, -r0 * 0.3, 0); parent.add(claw);
    toes.push({ g, segs }); return g;
  };
  toeSpec.forEach(([l, y, r]) => toe(l, y, r));
  f.userData.curl = (k) => toes.forEach((t, i) => t.segs.forEach((s, j) => { s.rotation.z = -(i === 3 ? -0.3 : 1) * k * (0.35 + j * 0.25); }));
  return f;
}

// ---------- the whole bird ----------
function makeBird(spec = PIGEON, opts = {}) {
  const root = new THREE.Group(), skin = birdSkin(spec, opts.lod || {}); root.add(skin);
  const body = new THREE.Group(), head = new THREE.Group(); root.add(body, head); // transforms only; children follow
  const wl = foldedWing(skin, -1, spec), wr = foldedWing(skin, 1, spec); body.add(wl, wr);
  const tail = tailSolid(spec), tp = (spec.tail && spec.tail.pos) || [-0.08, 0.021, 0.07]; tail.position.set(tp[0], tp[1], 0); tail.rotation.z = tp[2]; body.add(tail);
  const TXB = birdTex(spec), EY = { pos: [0.003, 0.0035, 0.0094], R: 0.0055, EV: 0.0035, yaw: 0.3, ring: [0.0056, 0.0040], ringCol: [0.44, 0.40, 0.42], ...(spec.eye || {}) };
  // head parts (head-local)
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: TXB.iris, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x6e6468, roughness: 0.8, normalMap: SCALE_N, normalScale: new THREE.Vector2(0.4, 0.4) });
  const beakMat = new THREE.MeshPhysicalMaterial({ color: 0x2e2d31, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const cereMat = new THREE.MeshStandardMaterial({ color: 0xb4afa9, roughness: 1, normalMap: TXB.feather.normalMap, normalScale: new THREE.Vector2(0.6, 0.6) });
  const ER = EY.R, EV = EY.EV, eyeGeo = (() => { const g = new THREE.SphereGeometry(ER, 40, 30); g.rotateX(Math.PI / 2); const p = g.attributes.position, q = g.attributes.uv; // a big, mostly buried eyeball: only a flat cap shows
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (z > 0) q.setXY(i, 0.5 + x / (2 * EV), 0.5 + y / (2 * EV)); else q.setXY(i, 0.03, 0.03); } return g; })();
  for (const sd of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(EY.pos[0], EY.pos[1], sd * EY.pos[2]); eg.rotation.y = sd > 0 ? EY.yaw : Math.PI - EY.yaw; head.add(eg);
    const e = new THREE.Mesh(eyeGeo, eyeMat); eg.add(e);
    head.userData['eye' + (sd > 0 ? 'R' : 'L')] = eg;
  }
  // beak: a tapered, slightly hooked shape from x=0.0195 to 0.040 (or the species' own)
  if (spec.beak) spec.beak(head, spec); else { const prof = []; for (let i = 0; i <= 16; i++) { const k = i / 16; prof.push(new THREE.Vector2(Math.max(0.0002, 0.0050 * Math.pow(1 - k, 0.6)), k * 0.0195)); }
    const g = new THREE.LatheGeometry(prof, 20); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y / 0.0195; p.setXYZ(i, y, -p.getX(i) * 0.95 - 0.0032 * k * k, p.getZ(i) * 0.8); }
    g.computeVertexNormals(); const bk = new THREE.Mesh(g, beakMat); bk.position.set(0.0185, -0.0055, 0); bk.castShadow = true; head.add(bk);
    // flip so the curve bends down: the lathe's x became -y above
  }
  if (!spec.beak) for (const sd of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), cereMat); c.scale.set(0.0046, 0.0024, 0.0021); c.position.set(0.0222, -0.0020, sd * 0.0015); c.castShadow = true; head.add(c); }
  // legs
  const legMat = new THREE.MeshPhysicalMaterial({ color: spec.legColor, roughness: 0.5, normalMap: SCALE_N, normalScale: new THREE.Vector2(0.8, 0.8), sheen: 0.3, sheenColor: new THREE.Color(0.9, 0.5, 0.5) });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x2b2522, roughness: 0.45 });
  const thighMat = skin.material;
  const LG = { tib: [0.0080, 0.0034], tar: [0.0027, 0.0023], ank: 0.0031, bareTib: false, ...(spec.leg || {}) };
  const legs = [-1, 1].map(sd => {
    const tib = cyl(LG.tib[0], LG.tib[1], LG.bareTib ? legMat : new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(...spec.color(0.3, -1.2, 0, 1)).multiplyScalar(0.75), map: TXB.feather.map, normalMap: TXB.feather.normalMap, normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.9, sheen: 0.45, sheenColor: new THREE.Color(0.32, 0.34, 0.4) }), 16);
    const tar = cyl(LG.tar[0], LG.tar[1], legMat, 12), ank = new THREE.Mesh(new THREE.SphereGeometry(LG.ank, 12, 10), legMat), foot = makeFoot(legMat, clawMat, LG.toes);
    ank.castShadow = true; root.add(tib, tar, ank, foot); return { sd, tib, tar, ank, foot };
  });
  root.userData = { skin, body, head, legs, spec, legMat };
  poseBird(root, spec.restPose ? spec.restPose() : gait(0, {}, spec)); skin.userData.initUV();
  // paint the bare eye-ring onto the skin round each eye (rest pose, head-local)
  { const inv = head.matrix.clone().invert(), pa = skin.geometry.attributes.position, v = new THREE.Vector3(), rc = EY.ringCol.map(x => Math.pow(x, 2.2)), ringK = new Float32Array(pa.count);
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(inv); if (Math.abs(v.z) < EY.pos[2] * 0.6) continue; ringK[i] = smooth(EY.ring[0], EY.ring[1], Math.hypot(v.x - EY.pos[0], v.y - EY.pos[1])); }
    const ringFx = (q, c) => ringK[q] > 0 ? c.map((x, k) => lerp(x, rc[k], ringK[q])) : c;
    const rec0 = skin.userData.recolor; skin.userData.recolor = (k, extra = null) => rec0(k, extra ? (q, c) => extra(q, ringFx(q, c)) : ringFx);
    skin.userData.recolor(1); }
  return root;
}

// ---------- the gait. tw: the bird's own clock (s). Returns poses in bird-root space (x forward) ----------
// mode 'walk': body advances at v and the head hold-thrusts; 'tread': a treadmill, body and head stay put while the belt runs back
function gait(tw, { v = 0.2, Ts = 0.24, duty = 0.62, mode = 'walk', lead = 0.096, thrustFrac = 0.3, headY = null, look = 0, pitch = 0, peck = 0 } = {}, spec = PIGEON) {
  const k0 = Math.floor(tw / Ts), ph = tw / Ts - k0, sw = (1 - duty) * 2; // each foot swings for sw*Ts
  const bx = mode === 'tread' ? 0 : v * tw;
  const body = { x: bx + 0.002 * Math.sin(2 * Math.PI * tw / Ts), y: spec.bodyHeight + 0.0016 * Math.cos(2 * Math.PI * tw / Ts), pitch: spec.bodyPitch + 0.012 * Math.sin(2 * Math.PI * tw / Ts), roll: 0.035 * Math.sin(Math.PI * tw / Ts), yaw: 0.02 * Math.sin(Math.PI * tw / Ts + 1) };
  // feet: foot of step k (left even, right odd) swings during [k Ts, k Ts + sw Ts] and lands lead-ahead of the body
  const G_ = { footZ: 0.0135, lift: 0.013, ahead: 0.03, ...(spec.gaitDef || {}) };
  const land = (k) => v * (k * Ts + sw * Ts) + G_.ahead;
  const feet = [0, 1].map(f => {
    // the most recent step index of this foot
    let k = k0 - ((k0 - f) % 2 + 2) % 2; const t0 = k * Ts, p = (tw - t0) / (sw * Ts);
    let x, y = 0, curl = 0;
    if (p < 1) { x = lerp(land(k - 2), land(k), E.io(clamp(p))); y = G_.lift * Math.sin(Math.PI * clamp(p)); curl = Math.sin(Math.PI * clamp(p)); }
    else x = land(k);
    if (mode === 'tread') x -= v * tw;
    return { x, y, z: (f ? 1 : -1) * G_.footZ, curl };
  });
  // head: holds during each step, then thrusts in ballistic fashion
  let hx;
  if (mode === 'tread') hx = lead - v * Ts * (1 - thrustFrac) * 0.5;
  else { const tp = clamp(ph / thrustFrac), hold = (k) => v * (k * Ts + thrustFrac * Ts) + lead; hx = ph < thrustFrac ? lerp(hold(k0 - 1), hold(k0), tp * tp * tp * (tp * (tp * 6 - 15) + 10)) : hold(k0); }
  const thr = mode === 'tread' ? 0 : (ph < thrustFrac ? Math.sin(Math.PI * clamp(ph / thrustFrac)) : 0);
  const head = { x: hx, y: (headY ?? spec.headHeight) - 0.003 * thr - peck * 0.11, pitch: -0.10 + pitch - 0.06 * thr - peck * 1.1, yaw: look, z: 0 };
  if (peck) head.x += peck * 0.02;
  return { body, feet, head, thr };
}
function poseBird(bird, P) {
  const U = bird.userData, b = P.body, h = P.head;
  U.body.position.set(b.x, b.y, 0); U.body.rotation.set(b.roll, b.yaw, b.pitch, 'YXZ');
  U.head.position.set(h.x, h.y, h.z || 0); U.head.rotation.set(h.roll || 0, h.yaw, h.pitch, 'YXZ');
  U.body.updateMatrix(); U.head.updateMatrix();
  U.skin.userData.update(U.body.matrix, U.head.matrix, { neckDir: P.neckDir, neckTan: P.neckTan });
  for (const L of U.legs) {
    const F = P.feet[L.sd > 0 ? 1 : 0], hip = U.spec.legHip.clone().setZ(U.spec.legHip.z * L.sd).applyMatrix4(U.body.matrix);
    const foot = F.tuck ? U.spec.tuck.clone().setZ(U.spec.tuck.z * L.sd).applyMatrix4(U.body.matrix) : V(F.x, F.y + (U.spec.footLift ?? 0.0045), F.z), d = Math.min(foot.distanceTo(hip), (U.spec.L1 + U.spec.L2) * 0.995), e = foot.clone().sub(hip).normalize();
    const ca = (U.spec.L1 ** 2 + d * d - U.spec.L2 ** 2) / (2 * U.spec.L1 * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    const back = V(-1, 0, 0).sub(e.clone().multiplyScalar(-e.x)).normalize(), ank = hip.clone().addScaledVector(e, U.spec.L1 * ca).addScaledVector(back, U.spec.L1 * sa);
    const footP = ank.clone().add(foot.clone().sub(ank).normalize().multiplyScalar(U.spec.L2));
    placeBetween(L.tib, hip, ank); placeBetween(L.tar, ank, footP); L.ank.position.copy(ank);
    L.foot.position.set(footP.x, F.tuck ? footP.y : Math.max(footP.y - (U.spec.footLift ?? 0.0045) * 0.55, (U.spec.footLift ?? 0.0045) * 0.42), footP.z); L.foot.rotation.set(0, L.sd * -0.12, F.tuck ? -1.2 : 0); L.foot.userData.curl(F.tuck ? 1 : F.curl);
  }
}

// ---------- fluff: shells that share the skin's (animated) geometry, pushed out along the normals in the vertex shader ----------
const FLUFF_A = (() => { const [c, g] = mkCanvas(512, 512); g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); const r = rng(21);
  for (let i = 0; i < 26000; i++) { const x = r() * 512, y = r() * 512, v = 120 + r() * 135; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(x, y, 0.6 + r() * 1.3, 0, 6.29); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
function fluff(skin, { layers = 5, len = 0.004, rep = [6, 3], tint = 1, sheen = 0.6 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < layers; i++) {
    const f = (i + 1) / layers, a = FLUFF_A.clone(); a.needsUpdate = true; a.repeat.set(rep[0], rep[1]);
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, alphaMap: a, alphaTest: 0.25 + 0.55 * f, roughness: 1, side: THREE.DoubleSide, color: new THREE.Color(tint, tint, tint).multiplyScalar(lerp(0.85, 1.12, f)) });
    m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(objectNormal) * ${(len * f).toFixed(6)} + vec3(0.0, ${(-len * 0.35 * f * f).toFixed(6)}, 0.0);`); };
    const sh = new THREE.Mesh(skin.geometry, m); sh.frustumCulled = false; sh.castShadow = i < 2; sh.receiveShadow = true; g.add(sh);
  }
  return g;
}

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

// =====================================================================
// SHOTS (17). The first and last shots share one camera path measured from the loop point.
// =====================================================================
const END = C.end;
const headW = (b) => { const v = new THREE.Vector3(); b.userData.head.getWorldPosition(v); return v; };
const eyeW = (b) => { const v = new THREE.Vector3(); b.userData.head.userData.eyeR.getWorldPosition(v); return v; };
const LODB = { nb: 30, nn: 30, nh: 20, nv: 24 };
const side = (b, h, d, up = 0, fwd = 0) => { const q = new THREE.Quaternion(); b.userData.head.getWorldQuaternion(q); return h.clone().add(V(fwd, up, d).applyQuaternion(q)); }; // a point beside the head, in the head's own frame
// a background flock standing, feeding and preening across the lagoon
function lagoonFlock(sc, list) { return list.map(([x, z, hd, mode, ph]) => { const b = flamingo(sc, { at: V(x, 0, z), heading: hd, lod: LODB });
  return (t) => { const tt = t + ph; if (mode === 'feed') b.userData.pose(feedPose(tt)); else if (mode === 'tuck') b.userData.pose(standPose(FLAMINGO, { tuck: 'R', t: tt, sway: 1, yaw: 0.3 * Math.sin(tt * 0.4) })); else b.userData.pose(standPose(FLAMINGO, { t: tt, sway: 1, yaw: 0.4 * Math.sin(tt * 0.5 + ph), pitch: -0.1 + 0.1 * Math.sin(tt * 0.3) })); }; }); }
const FLOCK1 = [[-2.2, -4.5, 0.6, 'stand', 0.5], [1.8, -6.0, 2.6, 'feed', 1.3], [3.6, -9.0, -0.4, 'tuck', 2.1], [-4.4, -10.5, 1.2, 'feed', 3.3], [0.3, -13.0, 3.0, 'stand', 4.2], [-1.2, -7.6, -1.0, 'tuck', 5.1], [5.5, -14.0, 1.6, 'feed', 6.4]];

// the loop shot: tau = seconds from the loop point
function hookScene(s) {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.5 }), F = lagoonFlock(sc, FLOCK1); s.ap = 5; s.exposure = 1.0; s.bloom = 0.22;
  return (tau, t) => {
    L.tick(t); F.forEach(u => u(t)); f.userData.pose(standPose(FLAMINGO, { tuck: 'L', t: tau + 50, sway: 1, yaw: 0.12 * Math.sin((tau + 50) * 0.6), pitch: -0.12 }));
    L.sun.userData.aim(V(0, 0.7, 0)); const k = E.io(seg(tau, -2.3, -0.25));
    const p = lv(V(1.6, 1.3, 4.9), V(0.62, 0.42, 2.7), k), tg = lv(V(-0.1, 0.75, 0), V(-0.06, 0.76, 0), k);
    shoot(s.cam, p, tg, { fov: lerp(32, 30, k), t: tau + 100, hand: 0.25, focus: p.distanceTo(V(0, 0.9, 0)) });
  };
}
// 0) Flamingos aren't born pink.
shot(0, C.their, (s) => { const up = hookScene(s); s.update = (t) => up(t, t); });

// 1) Their chicks hatch fluffy and grey. — a grey chick on its mud nest, a parent's legs behind
shot(C.their, C.the, (s) => {
  const sc = s.scene, L = lagoon(sc, { shadowBox: 0.6 }); nestMound(sc); const c = chick(sc, { at: V(0, 0.086, 0), heading: 1.3 }); const p = flamingo(sc, { at: V(-0.32, 0, -0.32), heading: 0.6 }); const F = lagoonFlock(sc, FLOCK1.slice(0, 4)); s.ap = 9; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); F.forEach(u => u(t)); c.userData.pose(standPose(CHICK, { t, sway: 2, yaw: 0.35 * Math.sin(t * 1.3), pitch: -0.05 + 0.1 * Math.sin(t * 2.1) })); p.userData.pose(standPose(FLAMINGO, { t, sway: 1, pitch: -0.4 }));
    L.sun.userData.aim(V(0, 0.2, 0), 4); const k = seg(t, C.their, C.the); shoot(s.cam, V(0.55 - 0.08 * k, 0.24, 0.8 - 0.1 * k), V(-0.03, 0.22, 0), { fov: 32, t, hand: 0.15, focus: 0.95 - 0.12 * k }); };
});
// 2) The pink comes from their food: — feeding, head upside down in the water
shot(C.the, C.tiny, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: -0.35 }), F = lagoonFlock(sc, FLOCK1); s.ap = 6; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); F.forEach(u => u(t)); f.userData.pose(feedPose(t)); L.sun.userData.aim(V(0.2, 0.4, 0)); const k = seg(t, C.the, C.tiny);
    shoot(s.cam, V(1.25 - 0.15 * k, 0.32, 1.05 - 0.1 * k), V(0.2, 0.36, 0), { fov: 32, t, hand: 0.2 }); };
});
// 3) tiny shrimp and algae — under the surface: brine shrimp swimming among algae
shot(C.tiny, C.orangered, (s) => {
  const sc = s.scene; underwater(sc); const A = algae(sc, 420, [0.08, 0.05, 0.06], V(0, 0, -0.01)); const SH = []; s.ap = 14; s.exposure = 1.05; s.bloom = 0.25; s.maxR = 18;
  for (let i = 0; i < 7; i++) { const b = brineShrimp(i + 1); b.position.set(-0.03 + i * 0.011, (i % 3 - 1) * 0.007, -0.012 * (i % 4)); b.rotation.set(0.3 * (i % 2), 0.4 * i, 0.2); sc.add(b); SH.push(b); }
  s.update = (t) => { A.userData.tick(t); SH.forEach((b, i) => { b.userData.swim(t + i); b.position.x += 0; b.position.y = (i % 3 - 1) * 0.007 + 0.002 * Math.sin(t * 1.3 + i); }); const k = seg(t, C.tiny, C.orangered);
    shoot(s.cam, V(0.002 + 0.006 * k, 0.003, 0.034 - 0.006 * k), V(0.0, 0.0, -0.006), { fov: 34, t, hand: 0.05, focus: 0.036 - 0.006 * k }); };
});
// 4) full of orange-red pigments called carotenoids, — one shrimp close; its pigment granules light up
shot(C.orangered, C.the2, (s) => {
  const sc = s.scene; underwater(sc); const A = algae(sc, 260, [0.05, 0.03, 0.04], V(0, 0, -0.012), 9); const b = brineShrimp(3); b.rotation.set(0.1, 0.35, 0.05); sc.add(b); s.ap = 12; s.exposure = 1.05; s.bloom = 0.45; s.maxR = 18;
  const lab = liveLabel(0.0048, 0.25); sc.add(lab); lab.userData.set([['CAROTENOIDS', 120, 0.5, '#ffb36b', 900, 3]]);
  s.update = (t) => { A.userData.tick(t); b.userData.swim(t); b.userData.glow(smooth(C.pigments - 0.1, C.pigments + 0.5, t)); const k = seg(t, C.orangered, C.the2);
    shoot(s.cam, V(-0.005 + 0.003 * k, 0.004, 0.03 - 0.005 * k), V(-0.0052, -0.0004, 0.0), { fov: 30, t, hand: 0.04, focus: 0.031 - 0.005 * k });
    pin(s.cam, lab, 0, 0.0021, 0.02); lab.scale.setScalar(Math.max(1e-4, spring(t, C.carotenoids - 0.05, 2, 6))); };
});
// 5) the same kind that make carrots orange. — carrots on a cutting board, a pink feather beside them
shot(C.the2, C.a, (s) => {
  const sc = s.scene, K = kitchen(sc); s.ap = 7; s.exposure = 1.0; s.bloom = 0.15;
  const cs = [[0.0, 0.03, 0.02, 0.15, 1], [-0.02, 0.031, -0.03, 0.4, 2], [0.03, 0.033, 0.06, -0.2, 3]].map(([x, y, z, ry, sd]) => { const c = carrot(0.16 + sd * 0.01, 0.016, sd); c.position.set(x, y + 0.0, z); c.rotation.y = ry; sc.add(c); return c; });
  const fe = pinkFeather(); fe.rotation.set(-Math.PI / 2 + 0.05, 0, 0.6); fe.position.set(0.02, 0.03, -0.09); sc.add(fe);
  s.update = (t) => { const k = seg(t, C.the2, C.a); shoot(s.cam, V(0.22 - 0.05 * k, 0.34 - 0.04 * k, 0.32 - 0.05 * k), V(0.0, 0.03, -0.02), { fov: 34, t, hand: 0.12 }); };
});
// 6) A flamingo's body pulls out those pigments — a young grey flamingo blushes pink over time
shot(C.a, C.and3, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.9, pink: 0 }), F = lagoonFlock(sc, FLOCK1.slice(1)); s.ap = 5; s.exposure = 1.0; s.bloom = 0.22;
  s.update = (t) => { L.tick(t); F.forEach(u => u(t)); const k = smooth(C.a + 0.3, C.and3 - 0.1, t); f.userData.setPink(k); f.userData.pose(standPose(FLAMINGO, { t, sway: 1, yaw: 0.2 * Math.sin(t * 0.7) }));
    L.sun.userData.aim(V(0, 0.7, 0)); shoot(s.cam, V(1.2, 0.75, 2.0), V(0.0, 0.8, 0), { fov: 34, t, hand: 0.2 }); };
});
// 7-9) and packs them into its growing feathers, legs and beak — the pink spreads through new feathers, then the legs, then the beak
shot(C.and3, C.legs - 0.08, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.2, pink: 0.25 }); s.ap = 9; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); const w = lerp(0.15, 0.85, smooth(C.and3, C.legs - 0.2, t)); f.userData.setPink((u) => 0.25 + 0.75 * smooth(w - 0.12, w, 1 - u), 0.25, 0.25); f.userData.pose(standPose(FLAMINGO, { t, sway: 1 }));
    L.sun.userData.aim(V(0, 0.8, 0)); const k = seg(t, C.and3, C.legs); shoot(s.cam, V(0.55 - 0.08 * k, 0.86, 0.5), V(0.05, 0.82 + 0.03 * k, 0.04), { fov: 30, t, hand: 0.1 }); };
});
shot(C.legs - 0.08, C.beak - 0.08, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.2, pink: 1 }); s.ap = 8; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); const k = smooth(C.legs - 0.05, C.beak - 0.2, t); f.userData.setPink(1, 0.25 + 0.75 * k, 0.25); f.userData.pose(standPose(FLAMINGO, { t, sway: 1 }));
    L.sun.userData.aim(V(0, 0.4, 0)); shoot(s.cam, V(0.42, 0.3, 0.55), V(0.03, 0.34, 0.0), { fov: 30, t, hand: 0.1 }); };
});
shot(C.beak - 0.08, C.take, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.2, pink: 1 }); s.ap = 10; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); const k = smooth(C.beak - 0.1, C.take - 0.02, t); f.userData.setPink(1, 1, 0.25 + 0.75 * k); f.userData.pose(standPose(FLAMINGO, { t, sway: 0.5 }));
    L.sun.userData.aim(V(0, 1.2, 0)); const h = headW(f), tg = side(f, h, 0, -0.04, 0.05); shoot(s.cam, side(f, h, 0.42, -0.02, 0.06), tg, { fov: 26, t, hand: 0.08 }); };
});
// 10) Take them away, and new feathers grow in pale. — the same bird washes out to a pale, almost white pink
shot(C.take, C.thats, (s) => {
  const sc = s.scene, L = lagoon(sc, { sun: 1.6 }), f = flamingo(sc, { heading: -0.5 }), F = lagoonFlock(sc, FLOCK1.slice(2)); s.ap = 5; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); F.forEach(u => u(t)); f.userData.setPink(1 + smooth(C.away, C.pale + 0.4, t)); f.userData.pose(standPose(FLAMINGO, { t, sway: 1, pitch: -0.25 }));
    L.sun.userData.aim(V(0, 0.7, 0)); const k = seg(t, C.take, C.thats); shoot(s.cam, V(-1.0 + 0.2 * k, 0.7, 2.0), V(0.0, 0.78, 0), { fov: 32, t, hand: 0.2 }); };
});
// 11) That's why zoos add pigment to their food. — a scoop of pink pellets poured into a zoo pond
shot(C.thats, C.and6, (s) => {
  const sc = s.scene, L = lagoon(sc, { shadowBox: 1.0 }); const rim = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 0.4), pbrMat(TX.concrete, { rep: [6, 1], color: 0xbab3a8 })); rim.position.set(0, 0.1, 0.55); rim.receiveShadow = rim.castShadow = true; sc.add(rim);
  const bucket = model('wooden_bucket_01'); bucket.scale.setScalar(0.45); sc.add(bucket); const pe = pellets(sc, 180, V(0.0, 0.40, 0.40));
  const fa = flamingo(sc, { at: V(-0.25, 0, -0.35), heading: -1.2 }), fb = flamingo(sc, { at: V(0.45, 0, -0.55), heading: 2.2 }); s.ap = 7; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); const a = t - (C.zoos + 0.1); bucket.position.set(0.0, 0.30, 0.58); bucket.rotation.set(-lerp(0.2, 1.7, smooth(-0.4, 0.3, a)), 0, 0); pe.userData.tick(a);
    fa.userData.pose(standPose(FLAMINGO, { t, sway: 1, pitch: -0.5 - 0.3 * smooth(0.5, 1.5, a) })); fb.userData.pose(a > 0.8 ? feedPose(t) : standPose(FLAMINGO, { t, sway: 1, pitch: -0.4 }));
    L.sun.userData.aim(V(0, 0.4, 0)); shoot(s.cam, V(0.62, 0.36, 0.95), V(-0.02, 0.2, 0.4), { fov: 36, t, hand: 0.2, focus: 0.75 }); };
});
// 12) And in mating season, — a group display: a tight flock marching, heads up, flagging side to side
shot(C.and6, C.flamingos3, (s) => {
  const sc = s.scene, L = lagoon(sc, { shadowBox: 2.2 }); const G = []; for (let i = 0; i < 7; i++) { const b = flamingo(sc, { at: V(-0.9 + (i % 4) * 0.42 + (i > 3 ? 0.2 : 0), 0, (i > 3 ? -0.5 : 0) + (i % 2) * 0.1), heading: 0.05, lod: i ? LODB : null }); G.push(b); }
  s.ap = 4; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => { L.tick(t); G.forEach((b, i) => { const P = gait(t * 0.9 + i * 0.13, { v: 0.32, Ts: 0.42, duty: 0.6, lead: 0.2, thrustFrac: 1, headY: 1.36, look: 0.7 * Math.sin(t * 5 + i * 1.7), pitch: 0.15 }, FLAMINGO); P.body.y = FLAMINGO.bodyHeight + 0.01 * Math.sin(t * 7 + i); P.neckDir = V(0.1, 1, 0); b.userData.pose(P); });
    L.sun.userData.aim(V(0.3, 0.8, 0), 9); const cx = 0.32 * 0.9 * t; shoot(s.cam, V(cx + 0.6, 0.6, 3.6), V(cx + 0.2, 0.95, -0.2), { fov: 32, t, hand: 0.25 }); };
});
// 13) flamingos even wear makeup, — close on a face
shot(C.flamingos3, C.rubbing, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.4 }); s.ap = 10; s.exposure = 1.0; s.bloom = 0.25;
  s.update = (t) => { L.tick(t); f.userData.pose(standPose(FLAMINGO, { t, sway: 0.5, yaw: 0.25 * Math.sin(t * 0.8) - 0.2, pitch: -0.05 })); L.sun.userData.aim(V(0, 1.2, 0));
    const h = headW(f), k = seg(t, C.flamingos3, C.rubbing), tg = side(f, h, 0, -0.06, 0.03); shoot(s.cam, side(f, h, 0.40 - 0.06 * k, -0.03, 0.18), tg, { fov: 28, t, hand: 0.08 }); };
});
// 14) rubbing pink oil from a gland near their tail — the head swings back to the base of the tail and rubs
shot(C.rubbing, C.all, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.0 }); s.ap = 8; s.exposure = 1.0; s.bloom = 0.25;
  s.update = (t) => { L.tick(t); const ph = lerp(0.0, 0.5, smooth(C.rubbing - 0.2, C.gland, t)), P = smooth(C.rubbing - 0.3, C.rubbing + 0.5, t);
    const st = standPose(FLAMINGO, { t, sway: 0.5 }), pr = preenPose(t, ph); for (const key of ['x', 'y', 'z', 'pitch', 'yaw', 'roll']) pr.head[key] = lerp(st.head[key], pr.head[key], P); f.userData.pose(pr);
    L.sun.userData.aim(V(-0.1, 0.9, 0)); const k = seg(t, C.rubbing, C.all); shoot(s.cam, V(-0.1 - 0.05 * k, 1.05, 0.95), V(-0.12, 0.92, 0.0), { fov: 30, t, hand: 0.1 }); };
});
// 15) all over their feathers. — rubbing the oil into the neck and breast, which glisten
shot(C.all, C.so, (s) => {
  const sc = s.scene, L = lagoon(sc), f = flamingo(sc, { heading: 0.0 }); s.ap = 8; s.exposure = 1.0; s.bloom = 0.25;
  s.update = (t) => { L.tick(t); f.userData.pose(preenPose(t, lerp(0.5, 1.0, smooth(C.all - 0.1, C.feathers3 + 0.3, t)))); const m = f.userData.skin.material; m.clearcoat = 0.5 * smooth(C.all, C.so, t); m.clearcoatRoughness = 0.35;
    L.sun.userData.aim(V(0.1, 0.9, 0)); const k = seg(t, C.all, C.so); shoot(s.cam, V(0.75, 0.95, 0.85), V(0.12, 0.88, 0.02), { fov: 30, t, hand: 0.1 }); };
});
// 16) So that pink isn't really theirs at all, because… — back to the lagoon (loop)
shot(C.so, END, (s) => { const up = hookScene(s); s.update = (t) => up(t - END, t); });

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }

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
const TR = { 3: [C.tiny - 0.15, C.tiny + 0.2, 2], 5: [C.the2 - 0.12, C.the2 + 0.2, 2], 16: [C.so - 0.1, C.so + 0.18, 4] };

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
