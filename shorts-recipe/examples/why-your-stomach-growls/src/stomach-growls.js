// "Why Your Stomach Growls": a photoreal 9:16 short. three.js, rendered headless frame by frame.
// Real CC0 HDR lighting, scanned textures and models from Poly Haven; procedural anatomy.
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
  that: 0.02, growl: 0.22, isnt: 0.7, your: 0.98, stomach: 1.18, begging: 1.62, for_: 1.96, food: 2.24, its: 3.06, your2: 3.22, gut: 3.36,
  cleaning: 3.72, house: 4.1, when: 5.08, your3: 5.18, stomachs: 5.34, been: 5.87, empty: 6.12, for_2: 6.4, a: 6.66, while: 6.8, about: 7.32,
  every: 7.46, hour: 7.84, and: 8.08, a2: 8.28, half: 8.38, a3: 8.86, powerful: 9.01, wave: 9.38, of: 9.78, muscle: 9.98, squeezes: 10.34, through: 10.9,
  it: 11.22, and2: 11.46, down: 11.68, your4: 11.98, intestines: 12.24, sweeping: 13.22, out: 13.44, leftover: 13.8, scraps: 14.28, with_: 15.61,
  no: 15.7, food2: 15.9, inside: 16.18, that2: 16.82, wave2: 16.94, pushes: 17.32, only: 17.58, gas: 17.96, and3: 18.34, liquid: 18.6, so: 18.92,
  the: 19.16, bubbles: 19.32, squeeze: 19.54, through2: 19.96, the2: 20.24, tubes: 20.4, and4: 20.72, echo: 20.94, like: 21.28, water: 21.6, in_: 21.96,
  old: 22.2, pipes: 22.46, doctors: 23.3, call: 23.58, it2: 23.86, borborygmi: 24.16, it3: 25.23, happens: 25.3, after: 25.6, meals: 25.94, too: 26.18,
  but: 26.56, food3: 26.8, muffles: 27.12, the3: 27.54, sound: 27.7, and5: 28.5, hunger: 28.6, hormones: 28.86, can: 29.34, set: 29.64, the4: 29.95,
  wave3: 30.02, off: 30.2, early: 30.42, so2: 31.18, next: 31.3, time: 31.54, it4: 31.8, roars: 31.98, in_2: 32.42, a4: 32.56, silent: 32.7, room: 33.02,
  relax: 33.34, because: 33.92, end: 34.3,
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
// REAL ASSETS (all CC0, from Poly Haven): HDR environments for lighting and backgrounds,
// scanned PBR textures, and glTF models. Loaded once before the first frame.
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
const [HALL, SURG, PIPEHDR, STUDIO] = await Promise.all(['school_hall_2k.hdr', 'surgery_2k.hdr', 'industrial_pipe_and_valve_01_2k.hdr', 'studio_small_09_1k.hdr'].map(loadHDR));
const MOD = {};
await Promise.all(['SchoolDesk_01', 'SchoolChair_01', 'wall_clock', 'modular_industrial_pipes_01', 'stationery_supplies', 'office_notepads'].map(async id => { MOD[id] = await loadModel(id); }));
const TX = {};
await Promise.all([['knit', 'knitted_fleece', true], ['plaster', 'plastered_wall', true], ['floor', 'laminate_floor_02', false]].map(async ([k, id, d]) => { TX[k] = await loadPBR(id, { detail: d }); }));
const model = (id) => MOD[id].clone(true);
// a named part of a model (e.g. the clock's minute hand)
const part = (root, name) => { let f = null; root.traverse(o => { if (o.name === name) f = o; }); return f; };

// =====================================================================
// SETS: the exam hall (real desks, chairs, HDR hall), students, the glass of water
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.01, 300) }; build(s); shots.push(s); return s; }
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
const DESK_TOP = 0.882, SEAT = 0.455;

// ---------- materials ----------
const knitMat = (color, rep = 6) => pbrMat(TX.knit, { rep: [rep, rep], color, normal: 1.4, phys: true, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4) });
const skinMat = (color = 0xc89478) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.62, sheen: 0.18, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xc85a44), clearcoat: 0.04, clearcoatRoughness: 0.6, envMapIntensity: 0.7 });
const denimMat = (color = 0x3a4a66) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.85, sheen: 0.4, sheenColor: new THREE.Color(0x8aa0c8), normalMap: TX.knit.normalMap, normalScale: new THREE.Vector2(0.3, 0.3) });
const HAIR_N = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h); const r = rng(77);
  for (let i = 0; i < 900; i++) { const x = r() * w, v = r() > 0.5 ? 170 : 86; g.strokeStyle = `rgba(${v},128,235,${0.25 + r() * 0.4})`; g.lineWidth = 0.6 + r() * 1.4; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 20, h * 0.33, x + (r() - 0.5) * 20, h * 0.66, x + (r() - 0.5) * 14, h); g.stroke(); }
}, { srgb: false, rep: [3, 1] });
const hairMat = (color = 0x2a1a12) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, normalMap: HAIR_N, normalScale: new THREE.Vector2(1.2, 1.2), sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xfff0dd), 0.35), anisotropy: 0.8 });

// ---------- a seated student with realistic proportions (metres), posed every frame ----------
function lathe(profile, seg = 48) { return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg); }
function limb(r0, r1, len, mat) { // a tapered capsule hanging from its top end along -y
  const g = new THREE.CapsuleGeometry((r0 + r1) / 2, len, 8, 20); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = clamp((y + len / 2) / len); const s = lerp(r1, r0, k) / ((r0 + r1) / 2); p.setX(i, p.getX(i) * s); p.setZ(i, p.getZ(i) * s); }
  g.translate(0, -len / 2, 0); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
function makeStudent({ sweater = 0x5b6e8c, hair = 0x2a1a12, skin = 0xc89478, jeans = 0x34425e, seed = 1, long = false } = {}) {
  const g = new THREE.Group(), sw = knitMat(sweater), sk = skinMat(skin), hm = hairMat(hair), dm = denimMat(jeans), r = rng(seed);
  const hips = new THREE.Group(); hips.position.y = SEAT + 0.06; g.add(hips);
  // pelvis + thighs + shins (seated)
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 20), dm); pelvis.scale.set(1, 0.55, 0.8); hips.add(pelvis); pelvis.castShadow = true;
  const legs = [];
  for (const s of [-1, 1]) {
    const th = limb(0.085, 0.065, 0.42, dm); th.position.set(s * 0.09, 0, 0.02); th.rotation.x = -Math.PI / 2 + 0.05; hips.add(th);
    const knee = new THREE.Group(); knee.position.set(0, -0.42, 0); th.add(knee);
    const sh = limb(0.058, 0.045, 0.43, dm); sh.rotation.x = Math.PI / 2 - 0.05; knee.add(sh);
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.07, 0.26, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0x23201e, roughness: 0.6 })); shoe.position.set(0, -0.43, 0.06); sh.add(shoe); shoe.castShadow = true;
    legs.push(th);
  }
  // torso: a lathe shell, flattened front-to-back, leaning forward from the hips
  const spine = new THREE.Group(); hips.add(spine);
  const torso = new THREE.Mesh(lathe([[0.001, -0.02], [0.15, 0.0], [0.162, 0.08], [0.168, 0.17], [0.172, 0.28], [0.182, 0.38], [0.19, 0.45], [0.16, 0.52], [0.09, 0.56], [0.06, 0.575], [0.001, 0.58]]), sw);
  torso.scale.set(1, 1, 0.64); torso.castShadow = torso.receiveShadow = true; spine.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 20), sw); belly.scale.set(1, 0.85, 0.62); belly.position.set(0, 0.14, 0.035); spine.add(belly); belly.castShadow = true;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.016, 12, 32), sw); collar.rotation.x = Math.PI / 2; collar.position.y = 0.565; spine.add(collar);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.056, 0.12, 24), sk); neck.position.y = 0.6; spine.add(neck);
  const head = new THREE.Group(); head.position.y = 0.66; spine.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 48, 32), sk); skull.scale.set(0.78, 1.12, 0.98); skull.position.set(0, 0.1, 0.01); head.add(skull); skull.castShadow = true;
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 20), sk); jaw.scale.set(0.95, 0.9, 1.05); jaw.position.set(0, 0.03, 0.035); head.add(jaw);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), sk); ear.scale.set(0.4, 1, 0.75); ear.position.set(s * 0.077, 0.1, 0.0); head.add(ear); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 16), sk); nose.rotation.x = Math.PI / 2 + 0.3; nose.position.set(0, 0.08, 0.105); head.add(nose);
  // hair: a cap over the crown and back of the head, longer at the back for some
  // hair: the skull's own ellipsoid, a little larger, covering the crown and back (tilted in the geometry so it stays on the skull)
  const capG = new THREE.SphereGeometry(0.1, 64, 40, 0, Math.PI * 2, 0, long ? 2.2 : 1.85); capG.rotateX(-0.62);
  { const p = capG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = 1 + 0.035 * fbm(x * 40 + seed, y * 40, z * 40); p.setXYZ(i, x * n, y * n, z * n); } capG.computeVertexNormals(); }
  const cap = new THREE.Mesh(capG, hm); cap.scale.set(0.78 * 1.07, 1.12 * 1.05, 0.98 * 1.07); cap.position.set(0, 0.1, 0.0); head.add(cap); cap.castShadow = true;
  if (long) { const drape = new THREE.Mesh(new THREE.SphereGeometry(0.1, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.62), hm); drape.scale.set(0.95, 1.6, 0.45); drape.rotation.x = Math.PI; drape.position.set(0, 0.12, -0.055); head.add(drape); drape.castShadow = true; }
  // arms: shoulder -> elbow -> forearm resting on the desk
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.19, 0.49, 0.0); spine.add(sh);
    const up = limb(0.058, 0.048, 0.29, sw); sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.29; up.add(el);
    const fo = limb(0.046, 0.036, 0.26, sw); el.add(fo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), sk); hand.scale.set(0.8, 1.25, 0.42); hand.position.y = -0.3; fo.add(hand); hand.castShadow = true;
    arms.push({ sh, el, up, fo, hand, s });
  }
  g.userData = { hips, spine, head, arms, legs, belly, torso };
  // pose: lean over the desk and write; `turn` swivels the head toward a point (0..1)
  g.userData.pose = (t, { lean = 0.32, look = 0.42, write = 1, turn = 0, turnYaw = 0.6 } = {}) => {
    const n1 = fbm(t * 0.3 + seed * 3.1, seed), n2 = fbm(t * 0.25 + seed * 1.7, seed + 9);
    spine.rotation.x = lean + n1 * 0.04 + Math.sin(t * 1.3 + seed) * 0.006;
    head.rotation.set(look + n2 * 0.08 - turn * 0.35, turn * turnYaw + n1 * 0.05, 0);
    for (const a of arms) {
      const w = a.s > 0 ? write * (Math.sin(t * 9 + seed) * 0.03 + Math.sin(t * 3.1 + seed) * 0.05) : 0;
      a.sh.rotation.set(-0.55 - lean * 0.5 + w, 0, -a.s * 0.16); a.el.rotation.set(-1.25 + w * 0.6, 0, a.s * 0.2);
    }
  };
  g.userData.pose(0);
  return g;
}

// ---------- the glass of water: glass shell + water volume with a rippling surface ----------
function waterGlass() {
  const g = new THREE.Group(); const R0 = 0.034, R1 = 0.04, Hh = 0.118, th = 0.0026, base = 0.011, HW = 0.082;
  const prof = [[0.0005, 0], [R0 - 0.002, 0], [R0, 0.003], [R1, Hh], [R1 - th, Hh], [R0 - th + 0.0004, base], [0.0005, base]];
  // glass: reflections only, added on top (a second transmissive layer would hide the water); a faint grey for its edges
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, specularIntensity: 1, ior: 1.5, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const edgeM = new THREE.MeshBasicMaterial({ color: 0x9fb4b0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.BackSide });
  const shell = new THREE.Mesh(lathe(prof, 96), glassM); g.add(shell); shell.castShadow = false; shell.renderOrder = 5;
  const edge = new THREE.Mesh(lathe(prof, 96), edgeM); edge.renderOrder = 4; g.add(edge);
  const rIn = (y) => lerp(R0 - th, R1 - th, clamp((y - base) / (Hh - base))) - 0.0006;
  const waterM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.03, ior: 1.33, thickness: 0.07, attenuationColor: new THREE.Color(0xcfe9ea), attenuationDistance: 0.35, side: THREE.DoubleSide });
  const side = new THREE.Mesh(lathe([[rIn(base), base], [rIn(HW), HW]], 96), waterM); g.add(side);
  // surface: polar grid so ripples are smooth rings
  const NR = 40, NA = 96, rs = rIn(HW), pos = [], idx = [];
  pos.push(0, HW, 0);
  for (let i = 1; i <= NR; i++) for (let j = 0; j < NA; j++) { const a = j / NA * Math.PI * 2, rr = rs * i / NR; pos.push(Math.cos(a) * rr, HW, Math.sin(a) * rr); }
  for (let j = 0; j < NA; j++) idx.push(0, 1 + (j + 1) % NA, 1 + j);
  for (let i = 1; i < NR; i++) for (let j = 0; j < NA; j++) { const a = 1 + (i - 1) * NA + j, b = 1 + (i - 1) * NA + (j + 1) % NA, c = 1 + i * NA + j, d = 1 + i * NA + (j + 1) % NA; idx.push(a, b, d, a, d, c); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setIndex(idx);
  const surf = new THREE.Mesh(sg, waterM); g.add(surf);
  // ripples: each event is a burst of concentric rings driven by the desk's vibration
  g.userData.ripple = (t, events) => {
    const p = sg.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), z = p.getZ(k), rr = Math.hypot(x, z) / rs; let h = 0;
      for (const [t0, amp] of events) {
        const a = t - t0; if (a <= 0 || a > 3) continue;
        const env = Math.exp(-a * 1.6) * smooth(0, 0.08, a);
        // a standing ring pattern (the whole glass shakes) plus a ring travelling inward from the wall
        h += amp * env * (Math.cos(rr * 15.0 - a * 42) * 0.55 * (0.4 + 0.6 * rr) + Math.cos((1 - rr) * 22 - a * 30) * 0.45 * smooth(0, 0.5, a * 3 - (1 - rr) * 1.5));
      }
      p.setY(k, HW + h * 0.0026 * (1 - Math.pow(rr, 8) * 0.6));
    }
    p.needsUpdate = true; sg.computeVertexNormals();
  };
  g.userData.ripple(0, []);
  return g;
}

// ---------- an exam paper (canvas print) ----------
const EXAM_TEX = canvasTex(768, 1086, (g, w, h) => {
  g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = 'bold 34px serif'; g.fillText('BIOLOGY  —  FINAL EXAMINATION', 60, 90);
  g.font = '20px serif'; g.fillStyle = '#444'; g.fillText('Time allowed: 2 hours.   Answer ALL questions.', 60, 130); g.fillRect(60, 150, w - 120, 2);
  const r = rng(5); let y = 210;
  for (let q = 1; q <= 6; q++) {
    g.fillStyle = '#222'; g.font = 'bold 22px serif'; g.fillText(`${q}.`, 60, y);
    g.font = '21px serif'; g.fillStyle = '#333'; const n = 2 + Math.floor(r() * 2);
    for (let l = 0; l < n; l++) { g.fillRect(100, y - 14 + l * 30, (w - 200) * (l === n - 1 ? 0.4 + r() * 0.4 : 0.9 + r() * 0.1), 2.5); }
    y += n * 30 + 20; g.strokeStyle = '#b9c3d4'; g.lineWidth = 1.2;
    for (let l = 0; l < 3; l++) { g.beginPath(); g.moveTo(100, y + l * 32); g.lineTo(w - 60, y + l * 32); g.stroke(); }
    // handwriting on the first answers
    if (q < 4) { g.strokeStyle = '#1d3c8c'; g.lineWidth = 2; for (let l = 0; l < (q === 3 ? 1 : 3); l++) { g.beginPath(); let x = 104; g.moveTo(x, y + l * 32 - 6); while (x < w - 120 - r() * 200) { x += 6 + r() * 6; g.lineTo(x, y + l * 32 - 6 - Math.abs(Math.sin(x * 0.7)) * (6 + r() * 6)); } g.stroke(); } }
    y += 120;
  }
}, { rep: [1, 1] });
const examPaper = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshStandardMaterial({ map: EXAM_TEX, roughness: 0.85 })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m; };

// ---------- the hall: HDR floor and walls, real desks and chairs in rows, students ----------
const HALL_YAW = Math.PI;   // the rows face the bright end of the hall, so the water reflects it
function examHall(sc, { heroCol = 1, heroRow = 1, cols = 5, rows = 6 } = {}) {
  sc.environment = HALL.env;
  const sky = new GroundProjectedSkybox(HALL.tex); sky.scale.setScalar(60); sky.height = 1.7; sky.radius = 60; sc.add(sky); sky.userData.isSky = true;
  sc.background = new THREE.Color(0x111111);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 })); shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = 0.002; shadowFloor.receiveShadow = true; sc.add(shadowFloor);
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.0); sun.position.set(-3, 9, 4); sun.target.position.set(0, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.userData.soft = 0.6; sc.add(sun, sun.target);
  const R = { desks: [], students: [], sun, sky };
  const room = new THREE.Group(); room.rotation.y = HALL_YAW; sc.add(room); R.room = room;
  const cloth = [0x5b6e8c, 0x8a3b3b, 0x3f5e4a, 0x7a7a7a, 0x2d3a55, 0xb08a5a, 0x6b4a6e, 0x3a3a3a, 0x9aa7b4, 0x4f6b73, 0xa0522d, 0x2f4f4f];
  const hairs = [0x2a1a12, 0x4a2e1a, 0x0f0c0a, 0x6b4a2a, 0x1c1410, 0x8a6a3a, 0x3a2418];
  const skins = [0xc89478, 0xe0b49a, 0x9a6a4e, 0xd8a688, 0x7a4e36, 0xeec2a6];
  for (let rI = 0; rI < rows; rI++) for (let cI = 0; cI < cols; cI++) {
    const x = (cI - (cols - 1) / 2) * 1.25, z = (rI - (rows - 1) / 2) * 1.35, k = rI * cols + cI, rr = rng(k * 13 + 7);
    const cell = new THREE.Group(); cell.position.set(x + (rr() - 0.5) * 0.06, 0, z + (rr() - 0.5) * 0.05); cell.rotation.y = (rr() - 0.5) * 0.04; room.add(cell);
    const desk = model('SchoolDesk_01'); cell.add(desk);
    const chair = model('SchoolChair_01'); chair.position.set(0, 0, 0.56); chair.rotation.y = Math.PI; cell.add(chair);
    const paper = examPaper(); paper.position.set(-0.05 + (rr() - 0.5) * 0.06, DESK_TOP + 0.0015, 0.02); paper.rotation.z = (rr() - 0.5) * 0.25; cell.add(paper);
    const hero = cI === heroCol && rI === heroRow;
    const st = makeStudent({ sweater: cloth[k % cloth.length], hair: hairs[k % hairs.length], skin: skins[(k * 5) % skins.length], seed: k + 1, long: rr() > 0.55 });
    st.position.set(0, 0, 0.6); st.rotation.y = Math.PI; cell.add(st);
    R.students.push({ st, hero, cell, k }); R.desks.push(cell);
    if (hero) R.hero = { st, cell, desk, paper };
  }
  // the hero's glass of water and pencils
  const glass = waterGlass(); glass.position.set(0.24, DESK_TOP, 0.12); R.hero.cell.add(glass); R.glass = glass;
  const pens = model('stationery_supplies'); pens.position.set(-0.22, DESK_TOP, -0.12); pens.rotation.y = 0.4; R.hero.cell.add(pens);
  return R;
}

// ---------- a live text label (canvas redrawn on demand) ----------
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

// ---------- a wall clock on a plaster wall, sunlight from a window sliding across it ----------
function clockWall(sc) {
  sc.environment = HALL.env; sc.environmentIntensity = 0.35; sc.background = new THREE.Color(0x1a1612);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), pbrMat(TX.plaster, { rep: [3, 2], color: 0xe9dcc6, normal: 1.2 })); wall.position.set(0, 2.2, -0.02); wall.receiveShadow = true; sc.add(wall);
  const clock = model('wall_clock'); clock.scale.setScalar(1.0); clock.position.set(0, 2.25, 0); sc.add(clock);
  const hm = part(clock, 'wall_clock_minute_hand'), hh = part(clock, 'wall_clock_hours_hand'), hs = part(clock, 'wall_clock_second_hand'); if (hs) hs.visible = false;
  // the window: an unseen frame between the sun and the wall, so its shadow pattern lands on the wall
  const sun = new THREE.DirectionalLight(0xffe2b8, 3.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.1, far: 12 }); sun.shadow.bias = -0.0005; sun.userData.soft = 0.05; sc.add(sun, sun.target);
  const frame = new THREE.Group(); sc.add(frame); const fm = new THREE.MeshBasicMaterial({ color: 0x000000 }); fm.colorWrite = false;
  const bar = (w, h, x, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), fm); b.position.set(x, y, 0); b.castShadow = true; frame.add(b); };
  bar(3, 0.9, 0, 1.35); bar(3, 0.9, 0, -1.35); bar(0.9, 3.6, -1.15, 0); bar(0.9, 3.6, 1.15, 0); bar(0.06, 1.8, 0, 0); bar(1.4, 0.06, 0, 0.2);
  const fill = new THREE.HemisphereLight(0xfff3e4, 0x3a3026, 0.25); sc.add(fill);
  return { clock, hm, hh, sun, frame, set(minutes, k) {
    // hands: minutes since 10:10
    const m = 10 + minutes, h = 10 + m / 60;
    hm.rotation.z = -m / 60 * Math.PI * 2; hh.rotation.z = -(h % 12) / 12 * Math.PI * 2;
    // the sun moves as time passes: the window's light patch slides across the wall
    const a = lerp(-0.75, -0.25, k), el = lerp(0.42, 0.3, k), dir = V(Math.sin(a), -Math.sin(el), -Math.cos(a)).normalize();
    sun.position.copy(V(0.3, 2.2, 0).sub(dir.clone().multiplyScalar(6))); sun.target.position.set(0.3, 2.2, 0);
    frame.position.copy(V(0.3, 2.2, 0).sub(dir.clone().multiplyScalar(2.6))); frame.lookAt(V(0.3, 2.2, 0));
  } };
}

// ---------- cast iron with rust (procedural) for the old pipe ----------
const IRON = (() => {
  const S = 512, c = document.createElement('canvas'), hc = document.createElement('canvas'); c.width = c.height = hc.width = hc.height = S; const g = c.getContext('2d'), hg = hc.getContext('2d'), r = rng(31);
  g.fillStyle = '#3a3532'; g.fillRect(0, 0, S, S); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  for (let i = 0; i < 400; i++) { const x = r() * S, y = r() * S, rad = 4 + r() * 40, col = r() > 0.4 ? `rgba(${120 + r() * 60},${55 + r() * 30},${25 + r() * 15},${0.15 + r() * 0.35})` : `rgba(20,18,16,${0.2 + r() * 0.3})`; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const hr = hg.createRadialGradient(x, y, 0, x, y, rad); hr.addColorStop(0, `rgba(255,255,255,${0.1 + r() * 0.2})`); hr.addColorStop(1, 'rgba(255,255,255,0)'); hg.fillStyle = hr; hg.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  const im = hg.getImageData(0, 0, S, S); for (let i = 0; i < im.data.length; i += 4) { const v = (Math.random() - 0.5) * 40; im.data[i] = im.data[i + 1] = im.data[i + 2] = clamp(im.data[i] + v, 0, 255); } hg.putImageData(im, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return { map, normalMap: heightToNormal(hc, 3) };
})();
const ironMat = (rep = [6, 2], col = 0xffffff, rough = 0.62) => { const c = (x) => { const k = x.clone(); k.repeat.set(rep[0], rep[1]); k.needsUpdate = true; return k; }; return new THREE.MeshPhysicalMaterial({ map: c(IRON.map), normalMap: c(IRON.normalMap), color: col, roughness: rough, metalness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.4, side: THREE.DoubleSide }); };

// ---------- the stethoscope: chest piece, tubing, a gloved hand, a belly ----------
const NITRILE = new THREE.MeshPhysicalMaterial({ color: 0x4f86d6, roughness: 0.42, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xa8ccff), clearcoat: 0.25, clearcoatRoughness: 0.35 });
const PORES = (() => { const S = 512, hc = document.createElement('canvas'); hc.width = hc.height = S; const g = hc.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, S, S); const r = rng(13);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.25})`; g.beginPath(); g.arc(r() * S, r() * S, 0.6 + r() * 1.2, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.beginPath(); const x = r() * S, y = r() * S; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 20); g.stroke(); }
  const t = heightToNormal(hc, 2.5); t.repeat.set(5, 5); return t; })();
function chestPiece() {
  const g = new THREE.Group(), chrome = new THREE.MeshPhysicalMaterial({ color: 0xd8dde2, metalness: 1, roughness: 0.14, clearcoat: 0.3 }), black = new THREE.MeshPhysicalMaterial({ color: 0x15171a, roughness: 0.35, clearcoat: 0.6 });
  const body = new THREE.Mesh(lathe([[0.001, 0], [0.023, 0], [0.0235, 0.004], [0.022, 0.009], [0.016, 0.013], [0.007, 0.016], [0.001, 0.0165]], 64), chrome); g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0232, 0.0022, 16, 64), black); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0015; g.add(ring);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.03, 20), chrome); stem.rotation.z = Math.PI / 2 - 0.25; stem.position.set(0.02, 0.016, 0); g.add(stem);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.034, 0.02, 0), V(0.06, 0.03, -0.01), V(0.1, 0.07, -0.05), V(0.13, 0.16, -0.1), V(0.12, 0.3, -0.12)]), 60, 0.0048, 16), new THREE.MeshPhysicalMaterial({ color: 0x1b1d21, roughness: 0.55, clearcoat: 0.3 })); g.add(tube);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function glovedHand() {
  // a relaxed right hand pressing two fingers on top of the chest piece
  const g = new THREE.Group(); const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 32, 20), NITRILE); palm.scale.set(1.0, 0.42, 1.15); g.add(palm); palm.castShadow = true;
  const wrist = limb(0.032, 0.03, 0.12, NITRILE); wrist.rotation.x = -Math.PI / 2 - 0.25; wrist.position.set(0, 0.008, -0.04); wrist.scale.set(1.2, 1, 0.75); g.add(wrist);
  const fingers = [[-0.03, 0.9, [0.044, 0.026, 0.02]], [-0.01, 0.5, [0.048, 0.028, 0.022]], [0.012, 0.45, [0.046, 0.027, 0.021]], [0.032, 1.0, [0.038, 0.022, 0.018]]];
  fingers.forEach(([x, curl, lens], i) => { let par = new THREE.Group(); par.position.set(x, -0.004, 0.045); par.rotation.x = 0.25; g.add(par);
    lens.forEach((L, k) => { const seg = limb(0.0095 - k * 0.0012, 0.0085 - k * 0.0012, L, NITRILE); seg.rotation.x = -Math.PI / 2 + (k ? curl * 0.6 : curl * 0.35); par.add(seg); const nx = new THREE.Group(); nx.position.y = -L; seg.add(nx); par = nx; }); });
  const th = limb(0.011, 0.009, 0.04, NITRILE); th.position.set(-0.045, -0.004, 0.0); th.rotation.set(-Math.PI / 2 + 0.4, 0, 0.9); g.add(th);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const SKIN_MAP = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#b97a5c'; g.fillRect(0, 0, w, h); const r = rng(17);
  for (let i = 0; i < 500; i++) { const x = r() * w, y = r() * h, rad = 6 + r() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, rad); const c = r() > 0.5 ? '210,120,100' : '220,170,130'; gr.addColorStop(0, `rgba(${c},0.12)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,70,50,${0.15 + r() * 0.2})`; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 1.6, 0, 7); g.fill(); } }, { rep: [2, 2] });
function bellyScene(sc) {
  sc.background = SURG.tex; sc.backgroundBlurriness = 0.35; sc.backgroundIntensity = 0.6; sc.environment = SURG.env;
  const pg = new THREE.PlaneGeometry(0.8, 0.8, 220, 220); pg.rotateX(-Math.PI / 2); const base = pg.attributes.position.array.slice();
  const skin = new THREE.MeshPhysicalMaterial({ map: SKIN_MAP, color: 0xffffff, roughness: 0.5, normalMap: PORES, normalScale: new THREE.Vector2(0.5, 0.5), sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xd86a50), clearcoat: 0.12, clearcoatRoughness: 0.45 });
  const belly = new THREE.Mesh(pg, skin); belly.receiveShadow = true; sc.add(belly);
  // the shirt pulled up: a knit band across the top
  const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 64, 1, true, -0.55, 1.1), knitMat(0xd8dfe8, 10)); shirt.rotation.z = Math.PI / 2; shirt.position.set(0, -0.36, -0.32); shirt.castShadow = shirt.receiveShadow = true; sc.add(shirt);
  const cp = chestPiece(); sc.add(cp); const hand = new THREE.Group();
  const key = new THREE.SpotLight(0xffffff, 8, 3, 0.6, 0.6, 1.6); key.position.set(-0.35, 0.8, 0.45); key.target.position.set(0, 0, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.userData.soft = 0.05; sc.add(key, key.target);
  const NAV = V(-0.035, 0, 0.07), CP = V(0.04, 0, 0.0);
  const surf = (x, z, t, press) => { const dome = 0.13 * Math.exp(-(x * x * 7 + (z + 0.02) * (z + 0.02) * 5)) * (1 + 0.02 * Math.sin(t * 1.6)); const dn = Math.hypot(x - NAV.x, z - NAV.z); const navel = -0.012 * Math.exp(-dn * dn / 0.00012) + 0.0025 * Math.exp(-Math.pow((dn - 0.014) / 0.006, 2)); const dc = Math.hypot(x - CP.x, z - CP.z); const pr = -press * 0.006 * Math.exp(-dc * dc / 0.0011); return dome + navel + pr; };
  return { belly, cp, hand, update(t, { press = 1, gurgle = 0 } = {}) {
    const p = pg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; const rip = gurgle ? 0.0012 * gurgle * Math.sin(Math.hypot(x - 0.02, z + 0.05) * 120 - t * 30) * Math.exp(-Math.hypot(x - 0.02, z + 0.05) * 14) : 0; p.setY(i, surf(x, z, t, press) + rip); }
    p.needsUpdate = true; pg.computeVertexNormals();
    const y = surf(CP.x, CP.z, t, press) - 0.001; cp.position.set(CP.x, y, CP.z); cp.rotation.set(0.05, -0.5, 0);
    hand.position.set(CP.x - 0.005, y + 0.036, CP.z - 0.035); hand.rotation.set(0.15, -0.35, 0.05);
  } };
}

// ---------- old cast-iron plumbing on a basement wall: flanges, bolts, an elbow, a valve; it drips ----------
function pipeRun(sc) {
  sc.background = PIPEHDR.tex; sc.backgroundBlurriness = 0.6; sc.backgroundIntensity = 0.45; sc.environment = PIPEHDR.env;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), pbrMat(TX.plaster, { rep: [3, 2], color: 0x8a8e84, normal: 1.6 })); wall.position.set(0, 1.4, -0.02); wall.receiveShadow = true; sc.add(wall);
  const iron = ironMat([1.3, 7], 0xd8d0c8, 0.72), ironV = iron, g = new THREE.Group(); sc.add(g); iron.metalness = 0.35;
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x6a625a, metalness: 0.8, roughness: 0.45 });
  const pipe = (a, b, r = 0.055) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 48, 1), Math.abs(d.y) > Math.abs(d.x) ? ironV : iron); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const flange = (p, dir) => { const f = new THREE.Group(); f.position.copy(p); f.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()); g.add(f);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.034, 48), iron); d.castShadow = true; f.add(d);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.06, 6), steel); b.position.set(Math.cos(a) * 0.074, 0, Math.sin(a) * 0.074); b.castShadow = true; f.add(b); } return f; };
  const Y = 1.15, Z = 0.16;
  pipe(V(-1.6, Y, Z), V(0.25, Y, Z)); flange(V(-0.45, Y, Z), V(1, 0, 0)); flange(V(0.25, Y, Z), V(1, 0, 0));
  const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.055, 32, 48, Math.PI / 2), iron); elbow.position.set(0.25, Y + 0.16, Z); elbow.rotation.z = -Math.PI / 2; elbow.castShadow = true; g.add(elbow);
  pipe(V(0.41, Y + 0.16, Z), V(0.41, Y + 1.6, Z)); flange(V(0.41, Y + 0.6, Z), V(0, 1, 0));
  // a valve on a short branch
  pipe(V(-0.12, Y, Z), V(-0.12, Y - 0.3, Z), 0.04); const vb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 20), iron); vb.scale.set(1, 1.1, 1.3); vb.position.set(-0.12, Y - 0.32, Z); g.add(vb);
  pipe(V(-1.6, Y + 0.42, Z - 0.04), V(1.0, Y + 0.42, Z - 0.04), 0.032); flange(V(-0.25, Y + 0.42, Z - 0.04), V(1, 0, 0)).scale.setScalar(0.6);
  const wheel = new THREE.Group(); wheel.position.set(-0.12, Y - 0.32, Z + 0.15); g.add(wheel); const red = new THREE.MeshPhysicalMaterial({ color: 0x8a1e14, roughness: 0.55, clearcoat: 0.3 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.011, 16, 48), red); wheel.add(rim); for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.17, 8), red); sp.rotation.z = i * Math.PI / 4 * 2 / 2 + i * Math.PI / 4; wheel.add(sp); }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.15, 12), steel); stem.rotation.x = Math.PI / 2; stem.position.set(-0.12, Y - 0.32, Z + 0.075); g.add(stem);
  // wall brackets
  for (const x of [-1.2, -0.1]) { const br = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 10, 40, Math.PI), steel); br.position.set(x, Y, Z); br.rotation.y = Math.PI / 2; br.rotation.z = Math.PI / 2; g.add(br); const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, Z), steel); st.position.set(x, Y + 0.065, Z / 2); g.add(st); }
  // a wet streak under the flange and drops falling from it
  const water = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transmission: 1, thickness: 0.01, ior: 1.33 });
  const drops = [0, 1, 2].map(() => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.009, 20, 14), water); sc.add(d); return d; });
  const key = new THREE.SpotLight(0xffe2c0, 30, 8, 0.6, 0.7, 1.5); key.position.set(-1.6, 2.6, 2.2); key.target.position.set(-0.3, 1.1, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.userData.soft = 0.06; sc.add(key, key.target);
  const fill = new THREE.PointLight(0x9fb8d8, 2, 5, 1.5); fill.position.set(1.2, 1.0, 1.5); sc.add(fill);
  return { g, update(t, gurgle) {
    // the whole run trembles a little with the gurgle
    g.position.set(Math.sin(t * 61) * 0.0008 * gurgle, Math.sin(t * 47 + 1) * 0.0008 * gurgle, 0);
    drops.forEach((d, i) => { const per = 0.9, ph = (t / per + i / 3) % 1; const fall = Math.max(0, ph - 0.55) / 0.45; d.position.set(-0.45 + (i - 1) * 0.004, Y - 0.092 - 0.012 * smooth(0, 0.55, ph) - 4.9 * Math.pow(fall * per * 0.45, 2), Z + 0.02); d.scale.set(1, 1 + 0.4 * smooth(0.3, 0.55, ph) - 0.3 * fall, 1); });
  } };
}

// =====================================================================
// ANATOMY: wet tissue materials, deformable organ tubes (stomach, small intestine, colon),
// the squeezing wave, interior views, cut-aways, gas bubbles, liquid and food.
// =====================================================================

// ---------- procedural tissue textures (colour + normal from a height field) ----------
function heightToNormal(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const im = g.createImageData(w, h);
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    im.data[i] = (-dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
// branching vessels drawn as tapered random walks
function drawVessels(g, w, h, r, n, col, maxW, len = 160) {
  const branch = (x, y, a, wd, L, d) => {
    g.strokeStyle = col; g.lineCap = 'round';
    for (let i = 0; i < L; i++) {
      const nx = x + Math.cos(a) * 3, ny = y + Math.sin(a) * 3; g.lineWidth = wd * (1 - i / L * 0.7); g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      // draw wrapped copies near the edges so the texture tiles
      for (const [ox, oy] of [[w, 0], [-w, 0], [0, h], [0, -h]]) if ((ox && (x < 20 || x > w - 20)) || (oy && (y < 20 || y > h - 20))) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(nx + ox, ny + oy); g.stroke(); }
      x = (nx + w) % w; y = (ny + h) % h; a += (r() - 0.5) * 0.35;
      if (d < 4 && r() < 0.03) branch(x, y, a + (r() > 0.5 ? 1 : -1) * (0.5 + r() * 0.6), wd * 0.65, L * 0.6, d + 1);
    }
  };
  for (let i = 0; i < n; i++) branch(r() * w, r() * h, r() * Math.PI * 2, maxW * (0.5 + r() * 0.5), len * (0.5 + r()), 0);
}
function tissueSet(kind, seed = 1) {
  const S = 1024, r = rng(seed);
  const col = document.createElement('canvas'), hgt = document.createElement('canvas'); col.width = hgt.width = S; col.height = hgt.height = S;
  const g = col.getContext('2d'), hg = hgt.getContext('2d');
  const P = {
    serosa: { base: '#b8625a', blot: ['#cf857a', '#9c4a48', '#c4706a', '#d99a8a'], ves: ['rgba(110,15,40,0.6)', 'rgba(140,35,70,0.4)'], fat: true },
    colon: { base: '#c79a86', blot: ['#dcb6a0', '#b88472', '#e2c2ac'], ves: ['rgba(120,30,50,0.4)', 'rgba(150,60,80,0.3)'], fat: true },
    mucosa: { base: '#b9474a', blot: ['#d0645e', '#9a3138', '#c95a57', '#e07b70'], ves: ['rgba(90,10,30,0.35)', 'rgba(220,120,110,0.25)'], fat: false },
    villi: { base: '#c45a55', blot: ['#d9786c', '#a84047', '#e0897a'], ves: ['rgba(110,20,40,0.25)'], fat: false },
  }[kind];
  g.fillStyle = P.base; g.fillRect(0, 0, S, S); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  // soft mottling
  for (let i = 0; i < 260; i++) { const x = r() * S, y = r() * S, rad = 20 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, P.blot[i % P.blot.length] + '55'); gr.addColorStop(1, P.blot[i % P.blot.length] + '00'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  if (P.fat) for (let i = 0; i < 9; i++) { const x = r() * S, y = r() * S, rw = 40 + r() * 110; g.fillStyle = `rgba(226,${190 + r() * 30},${130 + r() * 40},0.16)`; g.beginPath(); g.ellipse(x, y, rw, rw * (0.3 + r() * 0.4), r() * 3, 0, Math.PI * 2); g.fill(); }
  // vessels in colour, raised in the height map
  for (const c of P.ves) drawVessels(g, S, S, r, kind === 'villi' ? 6 : 14, c, kind === 'serosa' ? 4.5 : 3.2);
  const r2 = rng(seed); drawVessels(hg, S, S, r2, kind === 'villi' ? 6 : 14, 'rgba(255,255,255,0.35)', kind === 'serosa' ? 4.5 : 3.2);
  // fine grain: muscle fibres (serosa), pits (mucosa), velvet (villi)
  const im = hg.getImageData(0, 0, S, S), d = im.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4; let v = 0;
    if (kind === 'serosa' || kind === 'colon') v = Math.sin(y * 0.9 + noise3(x * 0.02, y * 0.02, seed) * 6) * 10 + noise3(x * 0.15, y * 0.15, seed) * 14;
    else if (kind === 'mucosa') v = (noise3(x * 0.12, y * 0.12, seed) > 0.35 ? -26 : 0) + noise3(x * 0.04, y * 0.04, seed + 3) * 22 + noise3(x * 0.4, y * 0.4, seed) * 10;
    else v = (h3(Math.floor(x / 3), Math.floor(y / 3), seed) - 0.5) * 70 + noise3(x * 0.05, y * 0.05, seed) * 20;
    d[i] = d[i + 1] = d[i + 2] = clamp(d[i] + v, 0, 255);
  }
  hg.putImageData(im, 0, 0);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  return { map, normalMap: heightToNormal(hgt, kind === 'villi' ? 3.5 : 2.2) };
}
const TS = { serosa: tissueSet('serosa', 3), colon: tissueSet('colon', 8), mucosa: tissueSet('mucosa', 5), villi: tissueSet('villi', 11) };
function tissueMat(kind, { rep = [8, 2], wet = 1, ...extra } = {}) {
  const t = TS[kind], c = (x) => { const k = x.clone(); k.repeat.set(rep[0], rep[1]); k.needsUpdate = true; return k; };
  const inner = kind === 'mucosa' || kind === 'villi';
  return new THREE.MeshPhysicalMaterial({
    map: c(t.map), normalMap: c(t.normalMap), normalScale: new THREE.Vector2(inner ? 1.1 : 0.8, inner ? 1.1 : 0.8),
    roughness: inner ? 0.4 : 0.5, clearcoat: wet, clearcoatRoughness: inner ? 0.07 : 0.14, sheen: inner ? 0.35 : 0.2, sheenRoughness: 0.5,
    sheenColor: new THREE.Color(inner ? 0xff6a5a : 0xffa090), vertexColors: true, ...extra,
  });
}

// ---------- tubes along curves with parallel-transport frames ----------
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
// a deformable tube: shape(u, th, t) -> radius; `cut` keeps only th in [a0, a1]; `inside` flips faces for interior views
function organTube(curve, { nu = 300, nv = 48, shape, mat, cut = null, inside = false, uvRep = [1, 1], len = null } = {}) {
  const F = ptFrames(curve, nu), L = len ?? curve.getLength();
  const a0 = cut ? cut[0] : 0, a1 = cut ? cut[1] : Math.PI * 2, wrap = !cut, cols = wrap ? nv : nv + 1;
  const pos = new Float32Array((nu + 1) * cols * 3), uv = new Float32Array((nu + 1) * cols * 2), colr = new Float32Array((nu + 1) * cols * 3).fill(1), idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j < cols; j++) { const k = i * cols + j; uv[k * 2] = (i / nu) * uvRep[0]; uv[k * 2 + 1] = (j / nv) * uvRep[1]; }
  for (let i = 0; i < nu; i++) for (let j = 0; j < (wrap ? nv : nv); j++) {
    const a = i * cols + j, b = i * cols + (wrap ? (j + 1) % nv : j + 1), c = (i + 1) * cols + j, d = (i + 1) * cols + (wrap ? (j + 1) % nv : j + 1);
    if (inside) idx.push(a, d, b, a, c, d); else idx.push(a, b, d, a, d, c);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3)); geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  const th = (j) => a0 + (a1 - a0) * j / (wrap ? nv : nv);
  // world point on the surface (for attaching things)
  mesh.userData = { F, nu, nv, L, curve,
    at(u, ang, rr) { const i = Math.round(clamp(u) * nu); return F.P[i].clone().add(F.N[i].clone().multiplyScalar(Math.cos(ang) * rr)).add(F.B[i].clone().multiplyScalar(Math.sin(ang) * rr)); },
    update(t, { shape: sf = shape, tint = null } = {}) {
      for (let i = 0; i <= nu; i++) {
        const u = i / nu, P = F.P[i], N = F.N[i], B = F.B[i];
        for (let j = 0; j < cols; j++) {
          const a = th(j), r = sf(u, a, t), k = (i * cols + j) * 3, ca = Math.cos(a), sa = Math.sin(a);
          pos[k] = P.x + (N.x * ca + B.x * sa) * r; pos[k + 1] = P.y + (N.y * ca + B.y * sa) * r; pos[k + 2] = P.z + (N.z * ca + B.z * sa) * r;
          if (tint) { const c = tint(u, a, t); colr[k] = c[0]; colr[k + 1] = c[1]; colr[k + 2] = c[2]; }
        }
      }
      geo.attributes.position.needsUpdate = true; if (tint) geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
    },
  };
  return mesh;
}
// smooth piecewise profile: [[u, value], ...]
function profile(pts) { return (u) => { if (u <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) { const [ua, va] = pts[i - 1], [ub, vb] = pts[i]; const k = (u - ua) / (ub - ua); return lerp(va, vb, k * k * (3 - 2 * k)); } return pts[pts.length - 1][1]; }; }
// the squeezing wave: a tight ring at c, the pushed contents bulging just ahead of it
const waveAt = (u, c, w, A = 0.6) => { const d = (u - c) / w; return 1 - A * Math.exp(-d * d * 2.2) + A * 0.32 * Math.exp(-Math.pow(d - 1.6, 2) * 1.2); };
const waveDark = (u, c, w) => { const d = (u - c) / w; return Math.exp(-d * d * 2.2); };

// ---------- the whole gut: stomach + duodenum, coiled small intestine, colon framing it ----------
function gutCurves() {
  const st = new THREE.CatmullRomCurve3([
    V(-0.035, 0.30, -0.03), V(-0.03, 0.22, -0.01), V(-0.045, 0.15, 0.0), V(-0.075, 0.08, 0.01), V(-0.08, 0.0, 0.02), V(-0.06, -0.075, 0.03), V(-0.01, -0.125, 0.035),
    V(0.055, -0.115, 0.03), V(0.105, -0.075, 0.02), V(0.135, -0.035, 0.0), V(0.155, -0.02, -0.02), V(0.175, -0.06, -0.035), V(0.172, -0.12, -0.03), V(0.14, -0.165, -0.02), V(0.09, -0.18, -0.01),
  ], false, 'catmullrom', 0.5);
  // the small intestine: rows of loops in two layers (back layer down, front layer up), every row with its own
  // length, wiggle and depth so it reads as packed loops; turns are wide enough never to pinch the tube
  const pts = [V(0.125, -0.168, -0.018), V(0.09, -0.18, -0.01), V(0.04, -0.205, -0.01)], R = rng(21), sp = 0.046, rows = 7;
  // a list of rows (y, z, direction); each row ends where the next begins, joined by a round turn
  const seq = [];
  for (let r = 0; r < rows; r++) seq.push({ y: -0.235 - r * sp, z: -0.005 + (R() - 0.5) * 0.012 });
  for (let r = rows - 1; r >= 0; r--) seq.push({ y: -0.235 - r * sp - sp * 0.5, z: 0.045 + (R() - 0.5) * 0.014 });
  let x = 0.03;
  seq.forEach((q, i) => {
    const dir = i % 2 ? 1 : -1, L = 0.12 + R() * 0.035, xe = dir * L + (R() - 0.5) * 0.02, ph = R() * 6, ph2 = R() * 6, kk = 22 + R() * 18;
    const bul = R() > 0.5 ? (R() - 0.3) * 0.05 : 0, bx = (R() - 0.5) * 0.12, xs = x;
    const sl = (R() - 0.5) * 0.22; for (let k = 1; k <= 18; k++) { const f = k / 18, xx = lerp(xs, xe, f), w = Math.sin(f * Math.PI); pts.push(V(xx, q.y + (Math.sin(xx * kk + ph) * 0.015 + sl * (f - 0.5) * 0.25) * w, q.z + Math.sin(xx * 15 + ph2) * 0.016 * w + bul * Math.exp(-Math.pow((xx - bx) / 0.045, 2)))); }
    x = xe; const nx = seq[i + 1]; if (!nx) return;
    const dy = q.y - nx.y, dz = nx.z - q.z, rr = Math.max(Math.abs(dy) / 2, 0.012) * 1.1;
    for (let k = 1; k < 7; k++) { const a = k / 7 * Math.PI; pts.push(V(xe + dir * Math.sin(a) * rr, q.y - dy * (1 - Math.cos(a)) / 2, q.z + dz * k / 7)); }
  });
  pts.push(V(0.16, -0.27, 0.0), V(0.17, -0.4, -0.025), V(0.155, -0.5, 0.0), V(0.175, -0.49, 0.02));
  const si = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const co = new THREE.CatmullRomCurve3([V(0.14, -0.56, 0.02), V(0.19, -0.48, 0.01), V(0.205, -0.34, 0.0), V(0.2, -0.22, 0.03), V(0.15, -0.195, 0.085), V(0.0, -0.21, 0.1), V(-0.15, -0.195, 0.085), V(-0.205, -0.23, 0.03), V(-0.21, -0.36, 0.0), V(-0.2, -0.5, 0.01), V(-0.14, -0.57, 0.03), V(-0.06, -0.6, 0.04)], false, 'catmullrom', 0.5);
  return { st, si, co };
}
const ST_R = profile([[0, 0.011], [0.08, 0.013], [0.16, 0.042], [0.24, 0.068], [0.36, 0.074], [0.5, 0.066], [0.6, 0.05], [0.68, 0.032], [0.72, 0.013], [0.76, 0.016], [1, 0.0155]]);
const ST_AMP = 0.3;   // a stomach contraction is a deep ring-shaped dent, not a full pinch
function makeGut(sc, { cutStomach = null, siSeg = 2400 } = {}) {
  const C3 = gutCurves(), g = new THREE.Group(); sc.add(g);
  const LST = C3.st.getLength(), LSI = C3.si.getLength();
  const st = organTube(C3.st, { nu: 360, nv: 80, cut: cutStomach, mat: tissueMat('serosa', { rep: [6, 3], side: cutStomach ? THREE.DoubleSide : THREE.FrontSide }), shape: () => 0.05 });
  const si = organTube(C3.si, { nu: siSeg, nv: 28, mat: tissueMat('serosa', { rep: [90, 1] }), shape: () => 0.016 });
  const co = organTube(C3.co, { nu: 420, nv: 40, mat: tissueMat('colon', { rep: [18, 2] }), shape: () => 0.026 });
  g.add(st, si, co);
  const stIn = cutStomach ? organTube(C3.st, { nu: 360, nv: 80, cut: cutStomach, inside: true, mat: tissueMat('mucosa', { rep: [5, 3] }), shape: () => 0.045 }) : null;
  if (stIn) g.add(stIn);
  // colon haustra: pouches every few centimetres
  const coShape = (u, a, t) => 0.026 * (0.86 + 0.18 * Math.pow(Math.abs(Math.sin(u * Math.PI * 34)), 0.6)) * (u < 0.04 ? 1.2 : 1) * (1 + 0.008 * Math.sin(t * 0.9 + u * 6));
  const G = { g, st, si, co, stIn, LST, LSI, C3 };
  // `wave` = how far the squeeze has travelled along the gut, in metres (stomach first, then intestine)
  G.shapes = (t, { wave = -1, amp = 0.55, width = 0.03, breathe = 1 } = {}) => {
    const cs = wave / LST, ci = (wave - LST) / LSI, on = wave >= 0;
    const stS = (u, a, tt) => { const d = on ? waveDark(u, cs, width * 1.6 / LST) : 0; return ST_R(u) * (on ? waveAt(u, cs, width * 1.6 / LST, amp * ST_AMP / 0.55) : 1) * (1 + 0.012 * Math.sin(tt * 1.1 + u * 8) * breathe) * (1 + 0.06 * d * Math.sin(a * 9)); };
    const siS = (u, a, tt) => { const d = on ? waveDark(u, ci, width * 0.7 / LSI) : 0; return 0.0158 * (on ? waveAt(u, ci, width * 0.7 / LSI, amp * 0.9) : 1) * (1 + 0.01 * Math.sin(tt * 1.3 + u * 40) * breathe) * (1 + 0.08 * d * Math.sin(a * 6)); };
    const tint = (cc, w) => (u) => { const d = on ? waveDark(u, cc, w) : 0; return [1 - 0.18 * d, 1 - 0.36 * d, 1 - 0.32 * d]; };
    return { stS, siS, stT: tint(cs, width * 1.6 / LST), siT: tint(ci, width * 0.7 / LSI) };
  };
  G.update = (t, o = {}) => {
    const Z = G.shapes(t, o);
    st.userData.update(t, { shape: Z.stS, tint: Z.stT });
    if (stIn) stIn.userData.update(t, { shape: (u, a, tt) => Z.stS(u, a, tt) * 0.9 });
    si.userData.update(t, { shape: Z.siS, tint: Z.siT });
    co.userData.update(t, { shape: coShape });
  };
  return G;
}

// ---------- dark studio for the medical renders ----------
function anatomyStudio(sc, { bg = [[0, '#20262f'], [0.55, '#0d1016'], [1, '#050608']], env = 0.5 } = {}) {
  sc.background = gradTex(bg, 0.5, 0.42); sc.environment = STUDIO.env; sc.environmentIntensity = env;
  const key = new THREE.SpotLight(0xfff1e6, 15, 4, 0.6, 0.6, 1.6); key.position.set(-0.6, 0.9, 1.0); key.target.position.set(0, -0.1, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.userData.soft = 0.08; sc.add(key, key.target);
  const rim = new THREE.SpotLight(0x9ec8ff, 9, 4, 0.7, 0.7, 1.6); rim.position.set(0.8, 0.5, -0.9); rim.target.position.set(0, -0.1, 0); sc.add(rim, rim.target);
  const fill = new THREE.PointLight(0xffd2c0, 1.2, 3, 2); fill.position.set(0.4, -0.2, 0.9); sc.add(fill);
  return { key, rim, fill };
}

// ---------- glossy see-through things: gas bubbles (reflections only, added on top) and gut fluid ----------
const bubbleMat = () => new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.02, specularIntensity: 1, envMapIntensity: 2.4, clearcoat: 1, clearcoatRoughness: 0.0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const bubbleRim = () => new THREE.MeshBasicMaterial({ color: 0x2a0808, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.BackSide });
function bubble(r = 0.05) {
  const g = new THREE.Group(); const a = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), bubbleMat()); a.renderOrder = 6; const b = new THREE.Mesh(new THREE.SphereGeometry(r * 1.01, 40, 28), bubbleRim()); b.renderOrder = 5; g.add(b, a); g.userData.r = r; return g;
}
const fluidMat = (color = 0xc9a44a) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.04, transmission: 0.82, thickness: 0.25, ior: 1.34, attenuationColor: new THREE.Color(color), attenuationDistance: 0.4, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide });

// ---------- inside the empty stomach: big wet folds (rugae), a puddle of gastric juice, mucus strands ----------
function stomachInside(sc) {
  sc.background = new THREE.Color(0x000000); sc.environment = STUDIO.env; sc.environmentIntensity = 0.25;
  const curve = new THREE.CatmullRomCurve3([V(0, 0.2, 3.2), V(0.1, 0, 1.5), V(-0.2, -0.1, 0), V(0.25, 0.05, -1.6), V(0.0, 0.4, -3.2), V(-0.4, 0.9, -4.4)]);
  const Rr = profile([[0, 1.0], [0.25, 1.15], [0.55, 1.35], [0.8, 1.1], [1, 0.7]]);
  const folds = Array.from({ length: 9 }, (_, k) => ({ a: k / 9 * Math.PI * 2 + 0.3, ph: k * 1.7, w: 0.08 + (k % 3) * 0.025 }));
  const shape = (u, a, t) => {
    let f = 0; for (const q of folds) { let d = a - (q.a + 0.35 * Math.sin(u * 6 + q.ph) + 0.12 * Math.sin(u * 17 + q.ph)); d = Math.atan2(Math.sin(d), Math.cos(d)); f += Math.exp(-(d * d) / (q.w * q.w)); }
    return Rr(u) * (1 - 0.15 * f + 0.025 * fbm(u * 9, a * 2, 1) + 0.004 * Math.sin(t * 1.2 + u * 5));
  };
  const wall = organTube(curve, { nu: 260, nv: 140, inside: true, mat: tissueMat('mucosa', { rep: [14, 9] }), shape, uvRep: [1, 1] }); sc.add(wall);
  // the puddle: a rippling surface low in the cavity
  const pg = new THREE.PlaneGeometry(5, 7, 90, 120); pg.rotateX(-Math.PI / 2); const pool = new THREE.Mesh(pg, new THREE.MeshPhysicalMaterial({ color: 0x3a2a10, roughness: 0.02, metalness: 0.0, transmission: 0.25, thickness: 0.4, ior: 1.33, attenuationColor: new THREE.Color(0x6a4a18), attenuationDistance: 0.2, clearcoat: 1, clearcoatRoughness: 0.0, specularIntensity: 1 }));
  pool.position.set(0, -0.86, -0.4); pool.visible = false; sc.fog = new THREE.Fog(0x000000, 1.2, 4.2);
  // mucus strands between folds
  const muc = new THREE.MeshPhysicalMaterial({ color: 0xf0d8c8, roughness: 0.05, transmission: 0.7, thickness: 0.02, ior: 1.36, clearcoat: 1, transparent: true, opacity: 0.85 });
  const strands = [[V(-0.7, 0.45, 0.4), V(-0.35, 0.2, 0.1), V(-0.1, 0.65, -0.2)], [V(0.6, -0.3, -0.6), V(0.3, -0.45, -0.9), V(0.7, 0.1, -1.3)], [V(-0.5, -0.4, -1.4), V(-0.2, -0.65, -1.6), V(0.2, -0.4, -1.9)]];
  const sm = strands.map(pp => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pp), 40, 0.012, 8), muc); sc.add(m); return m; });
  const lamp = new THREE.PointLight(0xfff4ea, 2.2, 0, 1.7); sc.add(lamp);
  const spot = new THREE.SpotLight(0xffffff, 8, 0, 0.75, 0.6, 1.6); sc.add(spot, spot.target);
  return { wall, pool, lamp, spot, curve, update(t, cam) {
    wall.userData.update(t);
    const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.003 * Math.sin(x * 9 + t * 2.3) * Math.sin(z * 7 - t * 1.7) + 0.0015 * Math.sin((x + z) * 15 - t * 3)); } p.needsUpdate = true; pg.computeVertexNormals();
    lamp.position.copy(cam.position); spot.position.copy(cam.position); spot.target.position.copy(cam.localToWorld(V(0, 0, -3)));
  } };
}

// ---------- inside the small intestine: ring folds, velvety villi, a squeeze that sweeps scraps along ----------
function intestineInside(sc) {
  sc.background = new THREE.Color(0x000000); sc.environment = STUDIO.env; sc.fog = new THREE.Fog(0x000000, 1.5, 5.5);
  const curve = new THREE.CatmullRomCurve3([V(0, 0, 4), V(0.15, 0.05, 2), V(-0.2, -0.05, 0), V(0.3, 0.1, -2.2), V(-0.1, 0.2, -4.5), V(0.4, 0.0, -7), V(0.0, -0.3, -9)]);
  const L = curve.getLength();
  const ring = (u, a) => { const z = u * L / 0.5 + 0.25 * Math.sin(a * 2 + u * 9); const c = Math.cos(z * Math.PI * 2); return Math.pow(Math.max(0, c), 3) * (0.6 + 0.4 * Math.sin(a * 1.0 + Math.floor(z + 0.5) * 2.1)); };
  const mat = tissueMat('villi', { rep: [36, 6] }); mat.sheen = 0.9; mat.sheenRoughness = 0.7; mat.roughness = 0.5;
  const wall = organTube(curve, { nu: 1300, nv: 110, inside: true, mat, shape: () => 1 }); sc.add(wall);
  const scrapsM = [new THREE.MeshPhysicalMaterial({ color: 0xc9a25a, roughness: 0.55, clearcoat: 0.6 }), new THREE.MeshPhysicalMaterial({ color: 0x6f8a3a, roughness: 0.5, clearcoat: 0.7 }), new THREE.MeshPhysicalMaterial({ color: 0xa8704a, roughness: 0.6, clearcoat: 0.5 })];
  const R = rng(4), scraps = [];
  for (let i = 0; i < 26; i++) {
    const g = new THREE.IcosahedronGeometry(0.05 + R() * 0.07, 1); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const n = 1 + 0.35 * (h3(k, i, 3) - 0.5); p.setXYZ(k, p.getX(k) * n, p.getY(k) * n * 0.7, p.getZ(k) * n); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, scrapsM[i % 3]); m.castShadow = true; sc.add(m); scraps.push({ m, u0: 0.15 + R() * 0.25, a: -Math.PI / 2 + (R() - 0.5) * 1.8, rr: 0.76 + R() * 0.12, sp: R() * 6 });
  }
  const lamp = new THREE.PointLight(0xfff0e6, 1.2, 0, 1.8); sc.add(lamp);
  const spot = new THREE.SpotLight(0xffffff, 7, 0, 0.8, 0.6, 1.6); sc.add(spot, spot.target);
  return { wall, curve, L, update(t, cam, { c = -1, amp = 0.72, w = 0.05 } = {}) {
    const shape = (u, a, tt) => 1.0 * (1 - 0.24 * ring(u, a)) * (c >= 0 ? waveAt(u, c, w, amp) : 1) * (1 + 0.01 * Math.sin(tt * 1.4 + u * 20));
    wall.userData.update(t, { shape, tint: (u) => { const d = c >= 0 ? waveDark(u, c, w) : 0; return [1 - 0.1 * d, 1 - 0.3 * d, 1 - 0.3 * d]; } });
    for (const q of scraps) {
      const u = c >= 0 ? Math.max(q.u0, c + w * 1.4 + (q.u0 - 0.12) * 0.08) : q.u0, pushed = u > q.u0 + 1e-4;
      const rr = q.rr * (1 - 0.24 * ring(u, q.a)) * (c >= 0 ? waveAt(u, c, w, amp) : 1) * 0.95;
      q.m.position.copy(wall.userData.at(clamp(u, 0, 0.98), q.a + (pushed ? Math.sin(t * 3 + q.sp) * 0.25 : 0), rr));
      q.m.rotation.set(q.sp + (pushed ? t * 3 : 0), q.sp * 2 + (pushed ? t * 2 : 0), 0);
    }
    lamp.position.copy(cam.position); spot.position.copy(cam.position); spot.target.position.copy(cam.localToWorld(V(0, 0, -3)));
  } };
}

// ---------- a cut-away length of intestine: the front of the wall removed so gas and fluid show inside ----------
function gutCutaway(sc, { R0 = 0.3, len = 3.6, outMat = null, inMat = null, edgeMat = null, fluid = null, thick = null } = {}) {
  const curve = new THREE.CatmullRomCurve3([V(-len / 2, 0, 0), V(-len / 6, 0.03, -0.02), V(len / 6, -0.02, 0.02), V(len / 2, 0.02, 0)]);
  const cut = [Math.PI / 2 + 0.9, Math.PI / 2 + Math.PI * 2 - 0.9], wallT = thick ?? 0.06 * R0 / 0.3;
  const out = organTube(curve, { nu: 300, nv: 64, cut, mat: outMat || tissueMat('serosa', { rep: [10, 2] }), shape: () => R0 });
  const inn = organTube(curve, { nu: 300, nv: 64, cut, inside: true, mat: inMat || tissueMat('villi', { rep: [24, 5] }), shape: () => R0 - wallT });
  const edgeM = edgeMat || new THREE.MeshPhysicalMaterial({ color: 0x8e2f3a, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.3 });
  // the two cut faces of the wall (muscle layers), rebuilt each frame from the same radius
  const mkEdge = () => { const nu = 300, pos = new Float32Array((nu + 1) * 2 * 3), idx = []; for (let i = 0; i < nu; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); const m = new THREE.Mesh(g, edgeM); m.material.side = THREE.DoubleSide; m.frustumCulled = false; return m; };
  const e1 = mkEdge(), e2 = mkEdge(); sc.add(out, inn, e1, e2);
  const F = out.userData.F, nu = 300;
  // fluid along the bottom: its top surface and its cut face
  const fl = fluid || fluidMat(); const NFU = 200, NS = 16;
  const mkStrip = () => { const pos = new Float32Array((NFU + 1) * (NS + 1) * 3), idx = []; for (let i = 0; i < NFU; i++) for (let j = 0; j < NS; j++) { const a = i * (NS + 1) + j, b = a + 1, c = a + NS + 1, d = c + 1; idx.push(a, c, b, b, c, d); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); const m = new THREE.Mesh(g, fl); m.frustumCulled = false; return m; };
  const top = mkStrip(), face = mkStrip(); sc.add(top, face);
  const zc = Math.cos(0.9);   // the cut plane sits at this fraction of the radius, towards the camera
  const C = { out, inn, curve, R0, F, top, face,
    radius: () => R0, rIn: () => R0 - wallT,
    update(t, { shape = () => 1, level = () => -0.45 } = {}) {
      out.userData.update(t, { shape: (u, a, tt) => R0 * shape(u, a, tt) });
      inn.userData.update(t, { shape: (u, a, tt) => (R0 - wallT) * shape(u, a, tt) });
      for (const [e, a] of [[e1, cut[0]], [e2, cut[1]]]) { const p = e.geometry.attributes.position; for (let i = 0; i <= nu; i++) { const u = i / nu, s = shape(u, a, t); const A = out.userData.at(u, a, R0 * s), B = out.userData.at(u, a, (R0 - wallT) * s); p.setXYZ(i * 2, A.x, A.y, A.z); p.setXYZ(i * 2 + 1, B.x, B.y, B.z); } p.needsUpdate = true; e.geometry.computeVertexNormals(); }
      // fluid: level(u) is the surface height as a fraction of the local inner radius (-1 bottom .. 1 top)
      const tp = top.geometry.attributes.position, fp = face.geometry.attributes.position;
      for (let i = 0; i <= NFU; i++) {
        const u = i / NFU, k = Math.round(u * nu), P = F.P[k], N = F.N[k], B = F.B[k], ri = (R0 - wallT) * shape(u, -Math.PI / 2, t) * 0.985, h = clamp(level(u), -0.98, 0.95) * ri;
        const zw = Math.sqrt(Math.max(ri * ri - h * h, 0)), z0 = -zw, z1 = Math.min(zw, zc * ri);
        for (let j = 0; j <= NS; j++) {
          const f = j / NS, z = lerp(z0, z1, f), k3 = (i * (NS + 1) + j) * 3, y = h + 0.004 * Math.sin(u * 60 + t * 5 + j) * ri;
          tp.array[k3] = P.x + N.x * y + B.x * z; tp.array[k3 + 1] = P.y + N.y * y + B.y * z; tp.array[k3 + 2] = P.z + N.z * y + B.z * z;
          const yb = -Math.sqrt(Math.max(ri * ri - (zc * ri) ** 2, 0)), yy = lerp(yb, Math.max(h, yb), f), zz = zc * ri;
          fp.array[k3] = P.x + N.x * yy + B.x * zz; fp.array[k3 + 1] = P.y + N.y * yy + B.y * zz; fp.array[k3 + 2] = P.z + N.z * yy + B.z * zz;
        }
      }
      tp.needsUpdate = fp.needsUpdate = true; top.geometry.computeVertexNormals(); face.geometry.computeVertexNormals();
    },
  };
  return C;
}

// ---------- chyme: what a full stomach holds (bits of food in liquid) ----------
function chyme(n = 700, seed = 9) {
  const R = rng(seed), geo = new THREE.IcosahedronGeometry(1, 2); { const p = geo.attributes.position; for (let k = 0; k < p.count; k++) { const s = 1 + 0.18 * (h3(k, 3, seed) - 0.5); p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.75, p.getZ(k) * s); } geo.computeVertexNormals(); }
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1 });
  const im = new THREE.InstancedMesh(geo, mat, n); im.castShadow = im.receiveShadow = true;
  const cols = [0x8a6238, 0x6a4a28, 0x86703e, 0x56602a, 0x9a7a4c, 0x7a4426, 0xa08260].map(c => new THREE.Color(c));
  for (let i = 0; i < n; i++) im.setColorAt(i, cols[i % cols.length].clone().multiplyScalar(0.8 + R() * 0.3));
  im.userData.R = R; return im;
}

// =====================================================================
// SHOTS: "Why Your Stomach Growls"
// =====================================================================
const END = C.end;
const ease = E.io;

// ---------- the exam hall, shared by the first and last shots; `tau` is time from the loop point ----------
// growls that shake the glass, in tau: "roars" at the end, "growl" and "food" at the start
const GROWLS = [[C.roars - END + 0.08, 1.3], [C.growl + 0.05, 1.4], [C.food + 0.12, 0.7]];
function hallScene(s) {
  const R = examHall(s.scene, { heroCol: 2, heroRow: 3 }); s.ap = 3.2; s.exposure = 0.98; s.bloom = 0.18;
  const gp = () => { R.hero.cell.updateMatrixWorld(true); return R.glass.getWorldPosition(V(0, 0, 0)).add(V(0, 0.082, 0)); };
  const G0 = gp();
  // camera keys: wide from the back of the hall, over the hero's shoulder, down to the glass
  const macro = G0.clone().add(V(-0.13, 0.3, -0.6));
  const path = new THREE.CatmullRomCurve3([V(-1.15, 1.95, -4.6), V(-0.8, 1.6, -2.7), V(-0.42, 1.36, -1.5), macro]);
  const look = new THREE.CatmullRomCurve3([V(-0.1, 0.95, 0.6), V(-0.15, 0.95, 0.1), V(-0.2, 0.96, -0.35), G0.clone().add(V(0, -0.004, 0))]);
  return (tau) => {
    // neighbours glance over at the growl, then go back to their papers
    const turn = smooth(-2.25, -1.7, tau) * (1 - smooth(1.6, 2.6, tau));
    R.students.forEach(({ st, hero, k }) => {
      const near = Math.abs(st.parent.position.x - R.hero.cell.position.x) < 1.4 && Math.abs(st.parent.position.z - R.hero.cell.position.z) < 1.5 && !hero;
      const side = Math.sign(R.hero.cell.position.x - st.parent.position.x) || 1;
      st.userData.pose(tau + 40, hero ? { lean: 0.32 + 0.12 * smooth(-2.2, -1.5, tau) * (1 - smooth(2.0, 3.0, tau)), write: 1 - turn, look: 0.42 } : { turn: near ? turn * (0.7 + 0.3 * h3(k, 1, 2)) : 0, turnYaw: -0.7 * side, write: near ? 1 - turn : 1 });
    });
    R.glass.userData.ripple(tau, GROWLS);
    // tau in [-3.13, 0]: the push-in; tau > 0: hold close on the glass with a slow drift
    const k = ease(seg(tau, C.so2 - END, 0)), q = tau > 0 ? 1 : k;
    const p = path.getPoint(q).add(tau > 0 ? V(0.02 * tau, 0.006 * tau, 0.012 * tau) : V(0, 0, 0)), tg = look.getPoint(q);
    shoot(s.cam, p, tg, { fov: lerp(42, 26, k), t: tau + 50, hand: 0.6, focus: p.distanceTo(G0) });
    s.ap = lerp(1.2, 3.2, k);
  };
}
// 0) That growl isn't your stomach begging for food: the glass trembles in the silent exam hall (loop)
shot(0, C.its, (s) => { const up = hallScene(s); s.update = (t) => up(t); });

// 1) It's your gut cleaning house: the whole gut, a squeeze starting at the top of the stomach
shot(C.its, C.when, (s) => {
  const sc = s.scene; anatomyStudio(sc); const G = makeGut(sc); s.ap = 1.2; s.exposure = 0.9; s.bloom = 0.12;
  s.update = (t) => {
    const k = seg(t, C.its, C.when);
    G.update(t, { wave: lerp(0.12, 0.32, k) * G.LST, amp: 0.6 });
    const a = lerp(-0.32, 0.06, ease(k)), d = lerp(1.32, 1.2, k), tg = V(0.0, -0.13, 0);
    shoot(s.cam, tg.clone().add(V(Math.sin(a) * d, 0.04, Math.cos(a) * d)), tg, { fov: 38, t, hand: 0.4, focus: d });
  };
});

// 2) When your stomach's been empty for a while: inside the empty stomach, wet folds, a puddle
shot(C.when, C.about, (s) => {
  const sc = s.scene; const I = stomachInside(sc); s.ap = 2.2; s.exposure = 1.1; s.bloom = 0.22;
  s.update = (t) => {
    const k = seg(t, C.when, C.about), u = lerp(0.1, 0.19, k);
    const p = I.curve.getPointAt(u).add(V(0.1, 0.2, 0)), tg = I.curve.getPointAt(u + 0.16).add(V(-0.1, -0.15, 0));
    shoot(s.cam, p, tg, { fov: 62, t, hand: 0.8, focus: 1.6 });
    I.update(t, s.cam);
  };
});

// 3) about every hour and a half: a wall clock, ninety minutes passing, the sunlight sliding across the wall
shot(C.about, C.a3, (s) => {
  const sc = s.scene; const K = clockWall(sc); const lab = liveLabel(0.11, 0.3); sc.add(lab); s.ap = 2.4; s.exposure = 1.0; s.bloom = 0.2;
  s.update = (t) => {
    const k = seg(t, C.about, C.a3), m = 90 * ease(seg(t, C.about + 0.05, C.a3 - 0.15));
    K.set(m, k);
    const p = V(lerp(0.32, 0.2, k), lerp(2.18, 2.22, k), lerp(1.25, 0.98, k)), tg = V(0, 2.25, 0);
    shoot(s.cam, p, tg, { fov: 34, t, hand: 0.4, focus: p.distanceTo(tg) });
    const mm = Math.round(m), hh = Math.floor(mm / 60);
    lab.userData.set([[`+${hh} h ${String(mm % 60).padStart(2, '0')} min`, 130, 0.5, '#2e2924', 800]]); pin(s.cam, lab, 0, 0.112, 0.6);
  };
});

// 4) a powerful wave of muscle squeezes through it: close on the stomach, the ring of muscle travelling down
shot(C.a3, C.and2, (s) => {
  const sc = s.scene; anatomyStudio(sc); const G = makeGut(sc); s.ap = 2.6; s.exposure = 0.9; s.bloom = 0.12;
  s.update = (t) => {
    const k = seg(t, C.a3, C.and2), w = lerp(0.2, 0.76, ease(k)) * G.LST;
    G.update(t, { wave: w, amp: 0.62, width: 0.034 });
    const ring = G.st.userData.at(w / G.LST, 0, 0), tg = lv(V(-0.02, 0.03, 0.02), ring, 0.55), p = tg.clone().add(V(0.22, 0.04, 0.55));
    shoot(s.cam, p, tg, { fov: 34, t, hand: 0.5, focus: p.distanceTo(tg) });
  };
});

// 5) and down your intestines: the squeeze runs on into the coils, the camera riding along
shot(C.and2, C.sweeping, (s) => {
  const sc = s.scene; anatomyStudio(sc); const G = makeGut(sc); s.ap = 2.8; s.exposure = 0.9; s.bloom = 0.12;
  s.update = (t) => {
    const k = seg(t, C.and2, C.sweeping), w = G.LST * 0.86 + lerp(0.0, 0.62, k);
    G.update(t, { wave: w, amp: 0.6, width: 0.03 });
    const u = clamp((w - G.LST) / G.LSI, 0, 1), tg = G.si.userData.at(u, 0, 0), p = tg.clone().add(V(0.12, 0.08, 0.36));
    shoot(s.cam, p, tg, { fov: 36, t, hand: 0.5, focus: p.distanceTo(tg) });
  };
});

// 6) sweeping out leftover scraps: inside the intestine, the squeeze closes in and pushes crumbs away
shot(C.sweeping, C.with_, (s) => {
  const sc = s.scene; const I = intestineInside(sc); s.ap = 2.0; s.exposure = 1.1; s.bloom = 0.2;
  s.update = (t) => {
    const k = seg(t, C.sweeping, C.with_);
    const p = I.curve.getPointAt(0.13).add(V(0.12, 0.22, 0)), tg = I.curve.getPointAt(0.24).add(V(-0.05, -0.2, 0));
    shoot(s.cam, p, tg, { fov: 64, t, hand: 0.7, focus: 1.8 });
    I.update(t, s.cam, { c: lerp(0.09, 0.5, E.inQ(k) * 0.4 + k * 0.6), amp: 0.72, w: 0.035 });
  };
});

// a tilted cut-away intestine with gas and fluid; `c` is where the squeeze is (0..1)
function cutawayScene(s, { pipe = false } = {}) {
  const sc = s.scene;
  if (pipe) { sc.background = PIPEHDR.tex; sc.backgroundBlurriness = 0.5; sc.backgroundIntensity = 0.55; sc.environment = PIPEHDR.env; }
  else anatomyStudio(sc, { env: 0.8 });
  const holder = new THREE.Group(); holder.rotation.z = pipe ? 0.0 : 0.38; sc.add(holder);
  const CA = gutCutaway(holder, pipe ? { R0: 0.24, len: 3.2, outMat: ironMat([8, 3]), inMat: ironMat([8, 3], 0xb8a898, 0.75), edgeMat: new THREE.MeshPhysicalMaterial({ color: 0x8a8580, metalness: 0.9, roughness: 0.3 }), fluid: fluidMat(0x9ab8c0), thick: 0.025 } : {});
  const bubbles = [0.9, 0.7, 0.55, 0.4].map((r) => { const b = bubble(1); holder.add(b); return b; });
  if (!pipe) { const key = new THREE.SpotLight(0xfff1e6, 30, 6, 0.7, 0.6, 1.6); key.position.set(-0.8, 1.6, 2.2); key.target.position.set(0, 0, 0); sc.add(key, key.target); }
  else { const key = new THREE.SpotLight(0xffe8cc, 60, 7, 0.7, 0.6, 1.5); key.position.set(-0.6, 1.8, 2.4); key.castShadow = true; sc.add(key); const fl = new THREE.PointLight(0xcfe0ff, 3, 4, 1.5); fl.position.set(0.8, 0.2, 1.2); sc.add(fl); }
  return { CA, holder, bubbles };
}
// gas pockets ride just ahead of the squeeze; each is squashed to fit the local tube radius
function placeBubbles(Z, t, c, w, shape, list) {
  const ri = Z.CA.rIn();
  list.forEach(([u0, rf, lane], i) => {
    const b = Z.bubbles[i]; if (!b) return;
    const u = c >= 0 ? Math.max(u0, c + w * (1.15 + i * 0.35)) : u0, sc = shape(u, Math.PI / 2, t), rLoc = ri * sc;
    let rad = rf * ri, sx = 1, sy = 1; if (rad > rLoc * 0.92) { const f = rLoc * 0.92 / rad; sy = f; sx = 1 / (f * f) * 0.9; }
    b.position.copy(Z.CA.out.userData.at(clamp(u, 0.02, 0.98), 0, rLoc - rad * sy * 1.02 + lane * 0.0));
    b.scale.set(rad * sx, rad * sy, rad * sy); b.lookAt(b.position.clone().add(Z.CA.out.userData.F.T[Math.round(clamp(u) * 300)]));
    b.rotateY(Math.PI / 2);
  });
}
// 7) With no food inside, that wave pushes only gas and liquid
shot(C.with_, C.so, (s) => {
  const Z = cutawayScene(s); s.ap = 1.6; s.exposure = 1.0; s.bloom = 0.15;
  const lg = liveLabel(0.2, 0.25), ll = liveLabel(0.2, 0.25); s.scene.add(lg, ll); lg.userData.set([['GAS', 140, 0.5]]); ll.userData.set([['LIQUID', 140, 0.5]]);
  s.update = (t) => {
    const k = seg(t, C.with_, C.so), c = lerp(0.12, 0.48, ease(k)), w = 0.06;
    const shape = (u, a, tt) => waveAt(u, c, w, 0.7) * (1 + 0.012 * Math.sin(tt * 1.5 + u * 9));
    Z.CA.update(t, { shape, level: (u) => -0.5 + 0.55 * Math.exp(-Math.pow((u - c - w * 1.3) / (w * 1.3), 2)) - 0.4 * smooth(0.2, 1.4, (c - u) / w) });
    placeBubbles(Z, t, c, w, shape, [[0.5, 0.42, 0], [0.62, 0.34, 0], [0.74, 0.28, 0], [0.84, 0.22, 0]]);
    const tg = Z.CA.out.userData.at(c + 0.12, 0, 0).applyMatrix4(Z.holder.matrixWorld), p = tg.clone().add(V(0.05, 0.12, 1.45));
    shoot(s.cam, p, tg, { fov: 38, t, hand: 0.5, focus: p.distanceTo(tg) });
    pin(s.cam, lg, 0.0, 0.2, 1.2); lg.scale.setScalar(Math.max(1e-4, spring(t, C.gas, 2, 6)));
    pin(s.cam, ll, 0.0, -0.19, 1.2); ll.scale.setScalar(Math.max(1e-4, spring(t, C.liquid, 2, 6)));
  };
});

// 8) so the bubbles squeeze through the tubes and echo: close on a narrow ring, a bubble forcing through, the wall ringing
shot(C.so, C.like, (s) => {
  const Z = cutawayScene(s); s.ap = 2.2; s.exposure = 1.0; s.bloom = 0.15;
  s.update = (t) => {
    const k = seg(t, C.so, C.like), c = 0.5, w = 0.05, tb = lerp(0.43, 0.57, ease(seg(t, C.so, C.like - 0.1)));
    // the squeeze holds; a ripple runs out along the wall each time the bubble pops through ("echo")
    const pop = C.echo - 0.1;
    const shape = (u, a, tt) => waveAt(u, c, w, 0.62) * (1 + 0.02 * Math.sin((Math.abs(u - c) * 90) - (tt - pop) * 40) * Math.exp(-Math.abs(u - c) * 9) * smooth(pop, pop + 0.05, tt) * Math.exp(-Math.max(0, tt - pop) * 2.2));
    Z.CA.update(t, { shape, level: (u) => -0.62 + 0.25 * Math.exp(-Math.pow((u - c) / 0.06, 2)) });
    placeBubbles(Z, t, -1, w, shape, [[tb, 0.5, 0], [0.585, 0.26, 0], [0.415, 0.22, 0], [0.6, 0.16, 0]]);
    const tg = Z.CA.out.userData.at(0.5, 0, 0.08).applyMatrix4(Z.holder.matrixWorld), p = tg.clone().add(V(0.1, 0.1, 1.0));
    shoot(s.cam, p, tg, { fov: 36, t, hand: 0.5, focus: p.distanceTo(tg) });
  };
});

// 9) like water in old pipes: old cast-iron plumbing on a basement wall, trembling and dripping as it gurgles
shot(C.like, C.doctors, (s) => {
  const P = pipeRun(s.scene); s.ap = 2.6; s.exposure = 1.0; s.bloom = 0.15;
  s.update = (t) => {
    const k = seg(t, C.like, C.doctors);
    P.update(t, 0.5 + 0.5 * Math.sin(t * 7) * Math.sin(t * 2.3));
    const tg = V(lerp(-0.16, -0.06, k), 1.12, 0.16), p = tg.clone().add(V(lerp(0.75, 0.62, k), lerp(0.22, 0.18, k), lerp(1.45, 1.3, k)));
    shoot(s.cam, p, tg, { fov: 40, t, hand: 0.6, focus: p.distanceTo(V(-0.45, 1.12, 0.16)) });
  };
});

// 10) Doctors call it borborygmi: a stethoscope on a belly, the name
shot(C.doctors, C.it3, (s) => {
  const B = bellyScene(s.scene); const lab = liveLabel(0.22, 0.4); s.scene.add(lab); lab.userData.set([['BORBORYGMI', 150, 0.4, '#ffffff', 900], ['bor · bo · RIG · mee', 74, 0.78, '#e8eef5', 700]]);
  s.ap = 3.0; s.exposure = 0.78; s.bloom = 0.12;
  s.update = (t) => {
    const k = seg(t, C.doctors, C.it3);
    B.update(t, { press: smooth(C.doctors, C.doctors + 0.4, t), gurgle: smooth(C.borborygmi - 0.1, C.borborygmi + 0.2, t) * (1 - smooth(C.it3 - 0.4, C.it3, t)) });
    const tg = V(0.02, 0.11, 0.02), p = V(lerp(-0.2, -0.17, k), lerp(0.24, 0.22, k), lerp(0.3, 0.27, k));
    shoot(s.cam, p, tg, { fov: 34, t, hand: 0.5, focus: p.distanceTo(tg) });
    pin(s.cam, lab, 0, 0.17, 0.75); lab.scale.setScalar(Math.max(1e-4, spring(t, C.borborygmi - 0.05, 2, 6)));
  };
});

// 11) It happens after meals too, but food muffles the sound: a cut-away full stomach, a bubble barely rising through the food
shot(C.it3, C.and5, (s) => {
  const sc = s.scene; anatomyStudio(sc); const cut = [Math.PI / 2 + 0.95, Math.PI / 2 + Math.PI * 2 - 0.95]; const G = makeGut(sc, { cutStomach: cut }); s.ap = 2.4; s.exposure = 1.0; s.bloom = 0.12;
  const food = chyme(900, 9); G.g.add(food); G.update(0, {});
  { const R = rng(5), st = G.st.userData, o = new THREE.Object3D(); let n = 0;
    for (let tries = 0; tries < 40000 && n < food.count; tries++) { const u = 0.26 + R() * 0.46, a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 0.8 * ST_R(u); const P = st.at(u, a, rr);
      if (P.y < -0.02 + 0.03 * (u - 0.5) && Math.sin(a) * rr < 0.45 * ST_R(u)) { o.position.copy(P); o.rotation.set(R() * 6, R() * 6, R() * 6); o.scale.setScalar(0.0045 + R() * 0.006); o.updateMatrix(); food.setMatrixAt(n++, o.matrix); } }
    food.count = n; food.instanceMatrix.needsUpdate = true; }
  const bub = bubble(0.012); G.g.add(bub);
  s.update = (t) => {
    const k = seg(t, C.it3, C.and5);
    G.update(t, { wave: -1, breathe: 1 });
    // the bubble works its way up slowly, muffled by the food around it
    const bk = seg(t, C.but - 0.1, C.sound + 0.3), bp = V(0.01, lerp(-0.1, -0.035, E.outQ(bk)), 0.0); bub.position.copy(bp); bub.scale.setScalar(lerp(0.6, 1.0, bk));
    const tg = V(0.01, -0.05, 0.0), p = V(lerp(0.1, 0.05, k), lerp(0.03, 0.01, k), lerp(0.66, 0.58, k));
    shoot(s.cam, p, tg, { fov: 36, t, hand: 0.5, focus: p.distanceTo(tg) });
  };
});

// 12) And hunger hormones can set the wave off early: glowing hormone particles stream to the stomach; a squeeze starts
shot(C.and5, C.so2, (s) => {
  const sc = s.scene; anatomyStudio(sc); const G = makeGut(sc); s.ap = 1.6; s.exposure = 0.95; s.bloom = 0.3;
  const lab = liveLabel(0.24, 0.25); sc.add(lab); lab.userData.set([['HUNGER HORMONES', 80, 0.5, '#d9ffb0', 900, 3]]);
  const N = 46, R = rng(12), parts = [];
  const pm = new THREE.MeshBasicMaterial({ color: 0xc8ff7a, toneMapped: false }), hm = new THREE.MeshBasicMaterial({ color: 0x9aff5a, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (let i = 0; i < N; i++) { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0045, 1), pm), h = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), hm); h.userData.noDof = true; c.userData.noDof = true; g.add(c, h); sc.add(g); parts.push({ g, off: R(), lane: V((R() - 0.5) * 0.05, (R() - 0.5) * 0.05, (R() - 0.5) * 0.05), sp: 0.5 + R() * 0.3 }); }
  const stream = new THREE.CatmullRomCurve3([V(-0.17, -0.3, 0.12), V(-0.13, -0.16, 0.12), V(-0.1, -0.05, 0.1), V(-0.082, 0.02, 0.065)]);
  s.update = (t) => {
    const k = seg(t, C.and5, C.so2), early = C.early - 0.15;
    G.update(t, { wave: t > early ? lerp(0.16, 0.42, ease(seg(t, early, C.so2 + 0.3))) * G.LST : -1, amp: 0.6, width: 0.034 });
    parts.forEach((q) => { const f = ((t - C.and5) * q.sp * 0.55 + q.off) % 1.0; const P = stream.getPointAt(f).add(q.lane.clone().multiplyScalar(1 - f)); q.g.position.copy(P); q.g.scale.setScalar(Math.max(1e-4, smooth(0, 0.08, f) * (1 - smooth(0.85, 1, f)))); });
    const tg = V(-0.05, -0.08, 0), p = tg.clone().add(V(lerp(0.08, 0.14, k), 0.06, lerp(0.85, 0.75, k)));
    shoot(s.cam, p, tg, { fov: 36, t, hand: 0.5, focus: p.distanceTo(V(-0.07, 0.0, 0.05)) });
    pin(s.cam, lab, 0, 0.2065, 0.75); lab.scale.setScalar(Math.max(1e-4, spring(t, C.hunger - 0.05, 2, 6)));
  };
});

// 13) So next time it roars in a silent room, relax, because… back in the hall, pushing in to the glass (loop)
shot(C.so2, END, (s) => { const up = hallScene(s); s.update = (t) => up(t - END); });

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
const TR = { 1: [C.its - 0.12, C.its + 0.22, 2], 4: [C.a3 - 0.1, C.a3 + 0.18, 4], 9: [C.like - 0.15, C.like + 0.25, 2], 13: [C.so2 - 0.1, C.so2 + 0.18, 4] };

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
