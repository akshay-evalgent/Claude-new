// "Why Cats Sit On Your Laptop": a photoreal 9:16 short. three.js, rendered headless frame by frame.
// Real 3D scans of real cats and a rigged cat model (CC BY, via Sketchfab / Objaverse); rooms, furniture, textures and the
// desert sky from Poly Haven (CC0); a procedural modern laptop, thermal camera and overlays.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GroundProjectedSkybox } from 'three/addons/objects/GroundProjectedSkybox.js';

const W = 1080, H = 1920, ASPECT = W / H;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------- cue times (seconds) from the voiceover word timings ----------
const C = {
  your: 0.02, cat: 0.22, isnt: 0.46, sitting: 0.78, on: 1.06, your2: 1.28, laptop: 1.44, to: 1.9, annoy: 2.18, you: 2.48, its: 2.98, sitting2: 3.2,
  on2: 3.4, a: 3.62, heater: 3.74, a2: 4.64, laptop2: 4.74, runs: 5.18, as: 5.56, warm: 5.92, as2: 6.34, your3: 6.6, skin: 6.76, and: 7.16, cats: 7.58,
  feel: 7.86, best: 8.1, at: 8.38, temperatures: 8.62, that: 9.1, would: 9.44, make: 9.6, you2: 9.84, sweat: 10.08, their: 10.97, ancestors: 11.12,
  lived: 11.62, in_: 12.08, the: 12.32, desert: 12.44, thats: 13.22, why: 13.48, it: 13.68, steals: 13.88, your4: 14.26, warm2: 14.56, seat: 14.88,
  and2: 15.18, follows: 15.42, the2: 15.8, sunbeam: 16.06, across: 16.48, the3: 16.84, floor: 17.1, theres: 17.94, a3: 18.18, second: 18.32,
  reason: 18.54, the4: 19.46, laptop3: 19.56, is: 19.96, where: 20.26, your5: 20.46, eyes: 20.66, are: 21.04, all: 21.3, day: 21.58, to2: 22.38,
  your6: 22.48, cat2: 22.68, its2: 23.11, the5: 23.28, thing: 23.46, stealing: 23.66, your7: 24.14, attention: 24.44, so: 24.86, it2: 25.22, sits: 25.4,
  right: 25.66, on3: 25.96, it3: 26.2, and3: 26.74, the6: 26.86, keys: 26.96, smell: 27.26, like: 27.66, your8: 27.96, hands: 28.14, so2: 28.52,
  next: 29.0, time: 29.32, your9: 29.66, cat3: 29.84, lies: 30.12, on4: 30.44, your10: 30.72, keyboard: 30.9, dont: 31.6, push: 31.78, it4: 31.94,
  off: 32.12, because: 32.38, end: 32.6333,
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
const MOD = {};
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
// REAL CAT: "3d modelling my cat: Fripouille" by guillaume bolis (CC BY 4.0, via Sketchfab / Objaverse).
// The file's mesh and skeleton disagree (the mesh is stored ~100x larger and turned half a turn, from an FBX unit mix-up),
// so on load we fit the mesh onto the joints (each bone's weighted vertex centroid vs. its segment), move the vertices into
// joint space and re-bind them to a fresh skeleton built from the inverse bind matrices. After that bones pivot where they should.
// Joint space: y up, the cat faces +x, 1 unit = CAT_U cm.
// =====================================================================
const CAT_U = 7.5;
async function loadCatRig(url) {
  const g = await gltfL.loadAsync(url);
  const skinned = []; g.scene.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
  const body = skinned.reduce((a, b) => (b.geometry.attributes.position.count > a.geometry.attributes.position.count ? b : a));
  const sk = body.skeleton, nb = sk.bones.length;
  const Jw = sk.boneInverses.map(m => m.clone().invert());                      // joint world matrices at bind, joint space
  const jp = Jw.map(m => new THREE.Vector3().setFromMatrixPosition(m));
  const parentIdx = sk.bones.map(b => sk.bones.indexOf(b.parent));
  const kids = sk.bones.map((_, i) => parentIdx.map((p, k) => (p === i ? k : -1)).filter(k => k >= 0));
  // pairs: weighted vertex centroid of each bone  <->  middle of that bone's segment (to its first child)
  const P = body.geometry.attributes.position, SW = body.geometry.attributes.skinWeight, SI = body.geometry.attributes.skinIndex;
  const acc = Array.from({ length: nb }, () => ({ s: new THREE.Vector3(), w: 0 }));
  const v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(body.bindMatrix); for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); if (w > 0.6) { const j = SI.getComponent(i, k); acc[j].s.addScaledVector(v, w); acc[j].w += w; } } }
  const A = [], B = [];
  for (let j = 0; j < nb; j++) { if (acc[j].w < 3 || !kids[j].length) continue; A.push(acc[j].s.clone().divideScalar(acc[j].w)); B.push(jp[j].clone().add(jp[kids[j][0]]).multiplyScalar(0.5)); }
  const F = umeyama(A, B);                                                       // p (mesh) -> joint space
  const nF = new THREE.Matrix3().setFromMatrix4(F); const sF = Math.cbrt(Math.abs(nF.determinant())); nF.multiplyScalar(1 / sF);
  // fresh skeleton
  const bones = sk.bones.map(b => { const n = new THREE.Bone(); n.name = b.name; return n; });
  const top = new THREE.Group();
  bones.forEach((b, i) => { const pi = parentIdx[i]; (pi >= 0 ? bones[pi] : top).add(b);
    const local = pi >= 0 ? Jw[pi].clone().invert().multiply(Jw[i]) : Jw[i].clone(); local.decompose(b.position, b.quaternion, b.scale); });
  const origBind = skinned.map(m => m.bindMatrix.elements.map(x => +x.toFixed(3)).join(','));
  const meshes = skinned.map(m => {
    const geo = m.geometry.clone(); const pa = geo.attributes.position;
    const FM = F.clone().multiply(m.bindMatrix), nM = new THREE.Matrix3().getNormalMatrix(FM), tM = new THREE.Matrix3().setFromMatrix4(FM);
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(FM); pa.setXYZ(i, v.x, v.y, v.z); }
    for (const nm of ['normal', 'tangent']) { const a = geo.attributes[nm]; if (!a) continue; for (let i = 0; i < a.count; i++) { v.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix3(nm === 'normal' ? nM : tM).normalize(); a.setXYZ(i, v.x, v.y, v.z); } }
    if (FM.determinant() < 0 && geo.index) { const ix = geo.index; for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); } ix.needsUpdate = true; }
    if (FM.determinant() < 0 && geo.attributes.tangent) { const a = geo.attributes.tangent; for (let i = 0; i < a.count; i++) a.setW(i, -a.getW(i)); }
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    const mm = new THREE.SkinnedMesh(geo, m.material); mm.name = m.name; mm.frustumCulled = false; mm.castShadow = mm.receiveShadow = true;
    top.add(mm); return mm;
  });
  top.updateMatrixWorld(true);
  const skel = new THREE.Skeleton(bones, sk.boneInverses.map(x => x.clone()));
  meshes.forEach(mm => mm.bind(skel, new THREE.Matrix4()));
  const fitErr = A.map((a, i) => a.clone().applyMatrix4(F).distanceTo(B[i])); 
  return { top, bones, skel, meshes, body: meshes[skinned.indexOf(body)], F, fitErr };
}
// similarity transform (rotation, uniform scale, translation) taking points A onto B
function umeyama(A, B) {
  const n = A.length, ca = new THREE.Vector3(), cb = new THREE.Vector3();
  A.forEach(a => ca.add(a)); B.forEach(b => cb.add(b)); ca.divideScalar(n); cb.divideScalar(n);
  const H = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; let va = 0;
  for (let i = 0; i < n; i++) { const a = A[i].clone().sub(ca), b = B[i].clone().sub(cb); va += a.lengthSq(); const aa = a.toArray(), bb = b.toArray(); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) H[r][c] += bb[r] * aa[c]; }
  // rotation by iterative polar decomposition of H (no SVD in three)
  let R = H.map(r => r.slice());
  for (let it = 0; it < 60; it++) { const Ri = inv3(R); const Rt = [[Ri[0][0], Ri[1][0], Ri[2][0]], [Ri[0][1], Ri[1][1], Ri[2][1]], [Ri[0][2], Ri[1][2], Ri[2][2]]]; R = R.map((row, r) => row.map((x, c) => 0.5 * (x + Rt[r][c]))); }
  
  let tr = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) tr += R[r][c] * H[r][c];
  const s = tr / va;
  const M = new THREE.Matrix4().set(s * R[0][0], s * R[0][1], s * R[0][2], 0, s * R[1][0], s * R[1][1], s * R[1][2], 0, s * R[2][0], s * R[2][1], s * R[2][2], 0, 0, 0, 0, 1);
  const t = cb.clone().sub(ca.clone().applyMatrix4(M)); M.setPosition(t); return M;
}
function det3(m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); }
function inv3(m) { const d = det3(m), r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  r[0][0] = (m[1][1] * m[2][2] - m[1][2] * m[2][1]) / d; r[0][1] = (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / d; r[0][2] = (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / d;
  r[1][0] = (m[1][2] * m[2][0] - m[1][0] * m[2][2]) / d; r[1][1] = (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / d; r[1][2] = (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / d;
  r[2][0] = (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / d; r[2][1] = (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / d; r[2][2] = (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / d; return r; }

// ---------------------------------------------------------------------
// makeCat: one posable cat. cat.root sits on the ground under the middle of the body, facing +x (its left side is +z), in cm.
// ---------------------------------------------------------------------
const CAT_BONES = { pelvis: 'Bone_01', spine: 'Bone001_02', chest: 'Bone002_03', neck: 'Bone003_04', head: 'Bone004_05',
  tail: ['Bone005_014', 'Bone006_015', 'Bone007_016', 'Bone008_017', 'Bone009_018', 'Bone010_019'],
  legA: [['Bone015_06', 'Bone016_07', 'Bone017_08', 'Bone018_09'], ['Bone019_010', 'Bone020_011', 'Bone021_012', 'Bone022_013']],   // front: scapula, humerus, forearm, paw
  legB: [['Bone011_020', 'Bone012_021', 'Bone013_022', 'Bone014_023'], ['Bone023_024', 'Bone024_00', 'Bone025_025', 'Bone026_026']] }; // hind: femur, shin, metatarsus, toes
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const wpos = (o, t = new THREE.Vector3()) => o.getWorldPosition(t);
// rotate a bone (in world space) so that the world direction `from` turns into `to`, by fraction k
function aimBone(bone, from, to, k = 1) {
  const qd = _q1.setFromUnitVectors(from.clone().normalize(), to.clone().normalize()); if (k < 1) qd.slerp(new THREE.Quaternion(), 1 - k);
  const bw = bone.getWorldQuaternion(new THREE.Quaternion()), pw = bone.parent.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pw.invert().multiply(qd).multiply(bw)); bone.updateMatrixWorld(true);
}
// two-bone IK: rotate A and B so that C's origin reaches `target`; the middle joint bends toward `pole` (a world direction)
function catIK2(A, B, C, target, pole) {
  const pa = wpos(A), pb = wpos(B), pc = wpos(C), la = pa.distanceTo(pb), lb = pb.distanceTo(pc);
  const tv = target.clone().sub(pa); const d = THREE.MathUtils.clamp(tv.length(), Math.abs(la - lb) + 1e-3, la + lb - 1e-3); const dir = tv.normalize();
  const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  const ca = (la * la + d * d - lb * lb) / (2 * la * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  const pbN = pa.clone().addScaledVector(dir, ca * la).addScaledVector(pp, sa * la);
  aimBone(A, pb.clone().sub(pa), pbN.clone().sub(pa));
  const pb2 = wpos(B), pc2 = wpos(C); aimBone(B, pc2.clone().sub(pb2), pa.clone().addScaledVector(dir, d).sub(pb2));
}
async function makeRealCat({ url = 'assets/cats/fripouille.glb', fur = true, furOpts = {} } = {}) {
  const R = await loadCatRig(url);
  const root = new THREE.Group(), mid = new THREE.Group(); root.add(mid); mid.add(R.top); R.top.scale.setScalar(CAT_U);
  const B = {}; R.bones.forEach(b => (B[b.name] = b));
  const bn = (n) => B[n];
  const pel = bn(CAT_BONES.pelvis), che = bn(CAT_BONES.chest);
  root.updateMatrixWorld(true);
  const fwd = wpos(che).sub(wpos(pel)); fwd.y = 0; fwd.normalize();
  mid.rotation.y = Math.atan2(fwd.z, fwd.x); root.updateMatrixWorld(true);
  const box = new THREE.Box3(); { const p = R.body.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(R.top.matrixWorld)); }
  const c = wpos(pel).add(wpos(che)).multiplyScalar(0.5);
  mid.position.set(-c.x, -box.min.y, -c.z); root.updateMatrixWorld(true);
  // rest data in root space
  const toRoot = (v) => root.worldToLocal(v.clone());
  const rest = new Map(); R.bones.forEach(b => rest.set(b, b.quaternion.clone()));
  const legs = [];
  for (const [kind, chains] of [['A', CAT_BONES.legA], ['B', CAT_BONES.legB]]) for (const ch of chains) {
    const b = ch.map(bn), p = b.map(x => toRoot(wpos(x)));
    const tip = kind === 'A' ? p[3] : p[3];
    legs.push({ kind, b, side: Math.sign(p[0].z - (kind === 'A' ? toRoot(wpos(che)).z : toRoot(wpos(pel)).z)) || 1,
      foot: new THREE.Vector3(tip.x, 0, tip.z), restTip: tip.clone(), restMid: p[2].clone(), hockOff: p[2].clone().sub(p[3]) });
  }
  const cat = { root, mid, R, B: bn, bones: R.bones, rest, legs, box, size: box.getSize(new THREE.Vector3()), pel, che,
    neck: bn(CAT_BONES.neck), head: bn(CAT_BONES.head), spine: bn(CAT_BONES.spine), tail: CAT_BONES.tail.map(bn) };
  cat.restTail = cat.tail.map(b => toRoot(wpos(b)));
  tuneCatMaterials(cat);
  buildFace(cat);
  if (fur) cat.fur = addFur(cat, furOpts);
  return cat;
}
function tuneCatMaterials(cat) {
  for (const m of cat.R.meshes) {
    const mat = m.material;
    if (m !== cat.R.body) { m.visible = false; continue; }
    else { mat.roughness = 0.85; mat.envMapIntensity = 0.9; if (mat.map) mat.map.anisotropy = 8; }
  }
}
// ---------------------------------------------------------------------
// FUR: shell layers over the skinned body. Each strand leans along the coat ("comb") and stands up with `puff`.
// ---------------------------------------------------------------------
function furNoiseTex(n = 128, seed = 7) {
  const d = new Uint8Array(n * n * 4); let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n * n; i++) { const r = rnd(); d[i * 4] = Math.floor(255 * Math.pow(r, 0.7)); d[i * 4 + 1] = Math.floor(255 * rnd()); d[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(d, n, n); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
function addFur(cat, { shells = 16, len = 0.75, density = 22 } = {}) {
  const body = cat.R.body, geo = body.geometry, n = geo.attributes.position.count;
  const SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight, P = geo.attributes.position, N = geo.attributes.normal;
  const idx = (name) => cat.R.bones.indexOf(cat.B(name));
  const tailI = CAT_BONES.tail.map(idx), headI = [idx(CAT_BONES.head)], neckI = [idx(CAT_BONES.neck)];
  const pawI = [CAT_BONES.legA[0][3], CAT_BONES.legA[1][3], CAT_BONES.legB[0][3], CAT_BONES.legB[1][3], CAT_BONES.legA[0][2], CAT_BONES.legA[1][2], CAT_BONES.legB[0][2], CAT_BONES.legB[1][2]].map(idx);
  const backI = [CAT_BONES.pelvis, CAT_BONES.spine, CAT_BONES.chest].map(idx);
  // bone directions in bind (joint space): parent joint -> joint
  const Jw = cat.R.skel.boneInverses.map(m => new THREE.Vector3().setFromMatrixPosition(m.clone().invert()));
  const kid = cat.R.bones.map((b, i) => cat.R.bones.findIndex((c) => c.parent === b && !/_end/.test(c.name)));
  const dirOf = (i) => { const k = kid[i]; return k >= 0 ? Jw[k].clone().sub(Jw[i]).normalize() : new THREE.Vector3(0, -1, 0); };
  const comb = new Float32Array(n * 3), lenA = new Float32Array(n), tailA = new Float32Array(n), backA = new Float32Array(n);
  const v = new THREE.Vector3(), nn = new THREE.Vector3();
  const eyeMesh = cat.R.meshes.find(m => /eye/i.test(m.material.name || '') || m.geometry.attributes.position.count < 700 && m !== cat.R.body && !/whisk/i.test(m.material.name || ''));
  const eyeC = []; if (eyeMesh) { const ep = eyeMesh.geometry.attributes.position, c0 = new THREE.Vector3(), c1 = new THREE.Vector3(); let n0 = 0, n1 = 0; const t = new THREE.Vector3(); for (let i = 0; i < ep.count; i++) { t.fromBufferAttribute(ep, i); if (i < ep.count / 2) { c0.add(t); n0++; } else { c1.add(t); n1++; } } eyeC.push(c0.divideScalar(n0), c1.divideScalar(n1)); }
  for (let i = 0; i < n; i++) {
    let best = -1, bw = 0, tw = 0, hw = 0, pw = 0, kw = 0;
    for (let k = 0; k < 4; k++) { const j = SI.getComponent(i, k), w = SW.getComponent(i, k); if (w > bw) { bw = w; best = j; }
      if (tailI.includes(j)) tw += w; if (headI.includes(j) || neckI.includes(j) && false) hw += w; if (pawI.includes(j)) pw += w; if (backI.includes(j)) kw += w; }
    let d = dirOf(best);
    if (tailI.includes(best)) { /* along the tail toward the tip */ } else if (pawI.includes(best) || CAT_BONES.legA.flat().concat(CAT_BONES.legB.flat()).map(idx).includes(best)) { /* down the leg */ } else d = d.clone().negate(); // body/head: hair points backward
    nn.fromBufferAttribute(N, i); d = d.clone().addScaledVector(nn, -d.dot(nn)); if (d.lengthSq() < 1e-6) d.set(-1, 0, 0); d.normalize();
    comb.set([d.x, d.y, d.z], i * 3);
    v.fromBufferAttribute(P, i); let eyeK = 1; for (const c of eyeC) eyeK = Math.min(eyeK, THREE.MathUtils.smoothstep(v.distanceTo(c), 0.12, 0.3));
    lenA[i] = (1 - 0.6 * hw) * (1 - 0.55 * pw) * (1 + 0.35 * tw) * eyeK; tailA[i] = tw; backA[i] = kw * Math.max(0, nn.y);
  }
  geo.setAttribute('aComb', new THREE.BufferAttribute(comb, 3)); geo.setAttribute('aLen', new THREE.BufferAttribute(lenA, 1));
  geo.setAttribute('aTail', new THREE.BufferAttribute(tailA, 1)); geo.setAttribute('aBack', new THREE.BufferAttribute(backA, 1));
  const U = { uLen: { value: len / CAT_U }, uPuffTail: { value: 0 }, uPuffBack: { value: 0 }, uNoise: { value: furNoiseTex() }, uDensity: { value: density }, uComb: { value: 1.0 } };
  const list = [];
  for (let s = 1; s <= shells; s++) {
    const h = s / shells;
    const m = body.material.clone(); m.transparent = false; m.alphaTest = 0; m.side = THREE.BackSide;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U, { uH: { value: h } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aComb; attribute float aLen; attribute float aTail; attribute float aBack;\nuniform float uLen, uH, uPuffTail, uPuffBack, uComb;\nvarying float vFurH;')
        .replace('#include <skinning_vertex>', `#include <skinning_vertex>
          float pf = clamp(uPuffTail * aTail + uPuffBack * aBack, 0.0, 1.0);
          float L = uLen * aLen * (1.0 + 2.6 * uPuffTail * aTail + 1.6 * uPuffBack * aBack);
          vec3 cS = aComb;
          #ifdef USE_SKINNING
            cS = (skinMatrix * vec4(aComb, 0.0)).xyz;
          #endif
          transformed += normalize(objectNormal) * L * uH + normalize(cS) * L * uComb * (1.0 - 0.9 * pf) * 0.85 * uH * uH;
          vFurH = uH;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uNoise; uniform float uDensity, uH;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec2 fuv = vMapUv * uDensity; vec4 nz = texture2D(uNoise, fuv);
          float thr = 0.12 + 0.86 * uH * uH;
          if (nz.r < thr) discard;
          diffuseColor.rgb *= mix(0.62, 1.1, uH) * (0.9 + 0.2 * nz.g);`);
    };
    m.customProgramCacheKey = () => 'fur' + s;
    const sm = new THREE.SkinnedMesh(geo, m); sm.frustumCulled = false; sm.castShadow = false; sm.receiveShadow = true;
    body.parent.add(sm); sm.bind(body.skeleton, body.bindMatrix); list.push(sm);
  }
  body.material.color.multiplyScalar(0.94);   // the skin under the coat reads as the dark roots
  return { U, shells: list, set(o) { for (const k in o) if (U['u' + k[0].toUpperCase() + k.slice(1)]) U['u' + k[0].toUpperCase() + k.slice(1)].value = o[k]; } };
}
// ---------------------------------------------------------------------
// poseCat(cat, P): everything for one frame.
//  P.pos, P.yaw            root on the ground (world, cm) and heading (radians, 0 = +x)
//  P.walk = { s, at: s => ({ pos, yaw }), stride = 34, duty = 0.62, lift = 3.2, settle = 0 }   planted-foot gait by distance walked
//  P.height, P.pitch       body up/down (cm) and nose-up tilt (rad);  P.arch 0..1 (Halloween back)
//  P.look (world point), P.lookK;  P.tail = { up, curl, tip, sway, phase, side };  P.puff = { tail, back }
//  P.feet = [ ...world points or null ] overrides per leg (order: front near, front far, hind near, hind far)
// ---------------------------------------------------------------------
const LEG_PHASE = { A1: 0.25, A_1: 0.75, B1: 0.0, B_1: 0.5 };
function poseCat(cat, P = {}) {
  for (const [b, q] of cat.rest) b.quaternion.copy(q);
  let pos = P.pos || new THREE.Vector3(), yaw = P.yaw || 0, bob = 0;
  const W = P.walk;
  if (W) { const a = W.at(W.s); pos = a.pos; yaw = a.yaw; const ph = W.s / (W.stride || 34); bob = (1 - (W.settle || 0)) * 0.55 * Math.cos(4 * Math.PI * ph); }
  cat.root.position.copy(pos); cat.root.rotation.set(0, yaw, 0);
  cat.mid.position.y = cat.mid.userData.y0 ?? (cat.mid.userData.y0 = cat.mid.position.y);
  const gH = P.ground ? 0.5 * (P.ground(pos.x + 18 * Math.cos(yaw), pos.z - 18 * Math.sin(yaw)) + P.ground(pos.x - 16 * Math.cos(yaw), pos.z + 16 * Math.sin(yaw))) : 0;
  cat.mid.position.y = cat.mid.userData.y0 + ((P.height || 0) + bob + 3.2 * (P.arch || 0) + gH) / 1;
  cat.root.updateMatrixWorld(true);
  const Z = (b, a) => { if (a) b.rotateZ(a); }, X = (b, a) => { if (a) b.rotateX(a); };
  // body pitch and the arched back
  Z(cat.pel, (P.pitch || 0) + 0.32 * (P.arch || 0)); Z(cat.spine, -0.12 * (P.arch || 0)); Z(cat.che, -0.38 * (P.arch || 0) - (P.pitch || 0) * 0.3);
  if (P.chestYaw) X(cat.che, P.chestYaw);
  // tail
  const T = P.tail || {};
  cat.tail.forEach((b, i) => {
    const w = i / (cat.tail.length - 1);
    Z(b, -((T.up || 0) * (i === 0 ? 1.0 : i === 1 ? 0.45 : 0.08) + (T.curl || 0) * (0.15 + 0.25 * w) + (T.tip || 0) * Math.max(0, w - 0.55) * 2.2));
    X(b, (T.sway || 0) * Math.sin((T.phase || 0) - i * 0.7) * (0.3 + 0.7 * w) + (T.side || 0) * (0.2 + 0.3 * w));
  });
  cat.root.updateMatrixWorld(true);
  // legs
  const fw = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), up = new THREE.Vector3(0, 1, 0);
  const sc = cat.root.getWorldScale(new THREE.Vector3()).x;
  cat.legs.forEach((L, li) => {
    let foot = null;
    if (P.feet && P.feet[li]) foot = P.feet[li].clone();
    else if (W) {
      const st = W.stride || 34, du = W.duty || 0.62, lift = (W.lift ?? 3.2) * (1 - (W.settle || 0));
      const key = L.kind + (L.side > 0 ? '1' : '_1'); const u = (((W.s / st + LEG_PHASE[key]) % 1) + 1) % 1;
      const nW = (s) => { const a = W.at(s); return a.pos.clone().add(L.foot.clone().multiplyScalar(sc).applyAxisAngle(up, a.yaw)); };
      const sMid = W.s - u * st + du * st / 2;
      if (u < du) foot = nW(sMid);
      else { const w = (u - du) / (1 - du), e = w * w * (3 - 2 * w); foot = nW(sMid).lerp(nW(sMid + st), e); foot.y += lift * Math.sin(Math.PI * w); }
      if (W.settle) foot.lerp(cat.root.localToWorld(L.foot.clone()), W.settle);
    } else foot = cat.root.localToWorld(L.foot.clone());
    if (P.ground) foot.y += P.ground(foot.x, foot.z);
    const b = L.b;
    if (L.kind === 'A') {
      const tgt = foot.clone(); tgt.y += L.restTip.y * sc;
      catIK2(b[1], b[2], b[3], tgt, fw.clone().negate().addScaledVector(up, -0.2));
    } else {
      const hock = foot.clone().add(L.hockOff.clone().multiplyScalar(sc).applyAxisAngle(up, yaw)); hock.y += L.restTip.y * sc;
      catIK2(b[0], b[1], b[2], hock, fw.clone().addScaledVector(up, 0.1));
      const toe = foot.clone(); toe.y += L.restTip.y * sc;
      aimBone(b[2], wpos(b[3]).sub(wpos(b[2])), toe.sub(wpos(b[2])));
    }
  });
  // head and neck look at a point
  if (P.look) {
    const k = P.lookK ?? 1;
    for (const [bone, f] of [[cat.neck, 0.45], [cat.head, 0.75]]) {
      const yAx = new THREE.Vector3().setFromMatrixColumn(bone.matrixWorld, 1).normalize();
      const want = P.look.clone().sub(wpos(bone)).normalize();
      const ang = yAx.angleTo(want), lim = 1.1; const kk = f * k * Math.min(1, lim / Math.max(ang, 1e-4));
      aimBone(bone, yAx, want, kk);
    }
  }
  if (P.headTilt) X(cat.head, P.headTilt);
  if (cat.fur) cat.fur.set({ puffTail: P.puff?.tail || 0, puffBack: P.puff?.back || 0 });
  if (cat.eye) cat.eye.set(P.pupil ?? 0.25);
  cat.root.updateMatrixWorld(true);
}

// a cat's eye: green-gold iris with fibres and a vertical slit pupil; eye.set(pupil 0..1) widens it (0.12 = slit, 1 = round and black)
function catEyeTex(size = 512) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  let last = -1;
  const draw = (pupil) => {
    const c = size / 2, R = size * 0.49;
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, size, size);
    const gr = g.createRadialGradient(c, c, R * 0.1, c, c, R); gr.addColorStop(0, '#c9a23a'); gr.addColorStop(0.45, '#9fae3e'); gr.addColorStop(0.85, '#6f8a2e'); gr.addColorStop(1, '#2e3a12');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
    let sd = 3; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) { const a = rnd() * Math.PI * 2, r0 = R * (0.12 + 0.3 * rnd()), r1 = R * (0.6 + 0.38 * rnd()); g.strokeStyle = rnd() < 0.5 ? 'rgba(255,230,140,0.10)' : 'rgba(40,50,10,0.12)'; g.lineWidth = 1 + 1.5 * rnd(); g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a + 0.05) * r1, c + Math.sin(a + 0.05) * r1); g.stroke(); }
    const lr = g.createRadialGradient(c, c, R * 0.85, c, c, R); lr.addColorStop(0, 'rgba(0,0,0,0)'); lr.addColorStop(1, 'rgba(0,0,0,0.65)'); g.fillStyle = lr; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
    const pw = R * (0.06 + 0.88 * pupil), ph = R * (0.78 + 0.1 * pupil);
    g.fillStyle = '#050403'; g.beginPath(); g.ellipse(c, c, pw, ph, 0, 0, Math.PI * 2); g.fill();
    tex.needsUpdate = true; last = pupil;
  };
  draw(0.25);
  return { tex, set(p) { p = Math.round(p * 50) / 50; if (p !== last) draw(p); } };
}

// ---------------------------------------------------------------------
// FACE: glossy eyes placed over the painted eyes of the texture (found by sampling the texture), and whiskers on the muzzle.
// Built in the head bone's space so they follow every head turn.
// ---------------------------------------------------------------------
function buildFace(cat) {
  const body = cat.R.body, geo = body.geometry, P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const hi = cat.R.bones.indexOf(cat.head);
  const img = body.material.map.image, cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0); const px = g.getImageData(0, 0, cv.width, cv.height).data;
  const lum = (u, v) => { const x = Math.min(cv.width - 1, Math.max(0, Math.floor(u * cv.width))), y = Math.min(cv.height - 1, Math.max(0, Math.floor((body.material.map.flipY ? 1 - v : v) * cv.height))); const i = (y * cv.width + x) * 4; return (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255; };
  // root-space positions of head vertices (rest pose)
  cat.root.updateMatrixWorld(true);
  const M = cat.R.top.matrixWorld, rootInv = cat.root.matrixWorld.clone().invert();
  const v = new THREE.Vector3(), headV = [];
  for (let i = 0; i < P.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (SI.getComponent(i, k) === hi) w += SW.getComponent(i, k); if (w < 0.5) continue;
    v.fromBufferAttribute(P, i).applyMatrix4(M).applyMatrix4(rootInv); headV.push({ i, p: v.clone(), l: lum(UV.getX(i), UV.getY(i)) }); }
  const nose = headV.reduce((a, b) => (b.p.x > a.p.x ? b : a)).p;
  const dark = headV.filter(h => h.l < 0.16 && h.p.y > nose.y + 0.5 && h.p.x < nose.x - 0.8);
  const eyes = [1, -1].map(sd => { const c = dark.filter(h => Math.sign(h.p.z - nose.z) === sd); if (!c.length) return null; const m = new THREE.Vector3(); c.forEach(h => m.add(h.p)); m.divideScalar(c.length);
    const nn = new THREE.Vector3(); c.forEach(h => { const n = new THREE.Vector3().fromBufferAttribute(N, h.i).transformDirection(M).transformDirection(rootInv); nn.add(n); }); return { c: m, n: nn.normalize(), count: c.length, span: Math.sqrt(c.reduce((a, h) => a + h.p.distanceToSquared(m), 0) / c.length) }; });
  cat.faceInfo = { nose: nose.toArray().map(x => +x.toFixed(2)), eyes: eyes.map(e => e && [e.c.toArray().map(x => +x.toFixed(2)), e.n.toArray().map(x => +x.toFixed(2)), e.count, +e.span.toFixed(2)]) };
  const headBone = cat.head; const toBone = (pRoot) => headBone.worldToLocal(cat.root.localToWorld(pRoot.clone()));
  cat.eye = catEyeTex();
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: cat.eye.tex, emissiveMap: cat.eye.tex, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.55, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.06, envMapIntensity: 0.35 });
  const eg = new THREE.SphereGeometry(1, 40, 24); { const p = eg.attributes.position, uv = eg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + 0.5 * p.getX(i), 0.5 + 0.5 * p.getY(i)); eg.rotateX(0); }
  // the sphere's +z is the front of the eye (uv centre)
  for (const e of eyes) { if (!e) continue;
    const r = cat.eyeR ?? 0.92;
    const mesh = new THREE.Mesh(eg, eyeMat); mesh.castShadow = false;
    const fz = e.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.25).normalize();
    const pos = e.c.clone().addScaledVector(fz, -r * (cat.eyeSink ?? 0.5));
    const fy = new THREE.Vector3(0, 1, 0).addScaledVector(fz, -fz.y).normalize(), fx = new THREE.Vector3().crossVectors(fy, fz);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(fx, fy, fz));
    const grp = new THREE.Group(); grp.position.copy(pos); grp.quaternion.copy(q); grp.scale.set(r * 1.12, r * 0.98, r); grp.add(mesh);
    cat.root.add(grp); grp.updateMatrixWorld(true); headBone.attach(grp); }
  // whiskers: tapered strands from the whisker pads, sweeping out and back
  const wm = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.4 });
  const wg = []; let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (const side of [1, -1]) for (let k = 0; k < 11; k++) {
    const pad = nose.clone().add(new THREE.Vector3(-1.3 - 0.5 * rnd(), -0.9 - 0.55 * (k / 10) + 0.2 * rnd(), side * (1.0 + 0.35 * rnd())));
    const len = 5.5 + 3.5 * rnd(), out = new THREE.Vector3(-0.35 - 0.3 * rnd(), 0.18 - 0.42 * (k / 10), side * (0.9 + 0.2 * rnd())).normalize();
    const pts = []; for (let j = 0; j <= 8; j++) { const t = j / 8; pts.push(pad.clone().addScaledVector(out, len * t).add(new THREE.Vector3(-0.6 * t * t, -0.9 * t * t, 0))); }
    const curve = new THREE.CatmullRomCurve3(pts); const tg = new THREE.TubeGeometry(curve, 12, 0.035, 3, false);
    const tp = tg.attributes.position; for (let i = 0; i < tp.count; i++) { const seg = Math.floor(i / 4) / 12; const c = curve.getPoint(Math.min(1, seg)); v.fromBufferAttribute(tp, i).sub(c).multiplyScalar(1 - 0.85 * seg).add(c); tp.setXYZ(i, v.x, v.y, v.z); }
    wg.push(tg); }
  const wgeo = mergeGeos(wg); const wmesh = new THREE.Mesh(wgeo, wm); wmesh.castShadow = false; cat.root.add(wmesh); wmesh.updateMatrixWorld(true); headBone.attach(wmesh);
}
function mergeGeos(list) {
  let nv = 0, ni = 0; list.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni); let ov = 0, oi = 0;
  for (const g of list) { pos.set(g.attributes.position.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3); for (let i = 0; i < g.index.count; i++) idx[oi + i] = g.index.getX(i) + ov; ov += g.attributes.position.count; oi += g.index.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setIndex(new THREE.BufferAttribute(idx, 1)); return m;
}

// recolour a cat (base coat and every fur layer)
function tintCat(cat, r, g, b) { const mats = [cat.R.body.material, ...(cat.fur ? cat.fur.shells.map(m => m.material) : [])]; mats.forEach(m => m.color.multiply(new THREE.Color(r, g, b))); }

// =====================================================================
// REAL 3D SCANS of real cats (photogrammetry, CC BY, via Sketchfab / Objaverse). Each scan comes with whatever the cat was
// lying on (a board, a mat, bedding). loadScan bakes the scan into cm, samples the photo texture at every vertex, drops the
// support by a colour rule, keeps the largest connected piece (the cat) and reports the height of the surface it lay on.
// =====================================================================
async function loadScan(url, { scale = 100, drop = null, keep = 'largest', lit = true, rough = 0.9, planeTol = 0 } = {}) {
  const g = await gltfL.loadAsync(url); g.scene.updateMatrixWorld(true);
  const group = new THREE.Group(); const info = { up: [] };
  const meshes = []; g.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    let geo = o.geometry.clone(); if (geo.index) geo = geo.toNonIndexed();
    geo.applyMatrix4(new THREE.Matrix4().makeScale(scale, scale, scale).multiply(o.matrixWorld));
    const P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv, n = P.count;
    const map = o.material.map;
    let keepTri = new Uint8Array(n / 3).fill(1);
    if (drop && map && UV) {
      const img = map.image, cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cg = cv.getContext('2d'); cg.drawImage(img, 0, 0);
      const px = cg.getImageData(0, 0, cv.width, cv.height).data, col = new THREE.Color(), hsl = {};
      const gone = new Uint8Array(n); const v = new THREE.Vector3(), nn = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        let u = UV.getX(i), w = UV.getY(i); u -= Math.floor(u); w -= Math.floor(w); if (map.flipY) w = 1 - w;
        const x = Math.min(cv.width - 1, Math.floor(u * cv.width)), y = Math.min(cv.height - 1, Math.floor(w * cv.height)), k = (y * cv.width + x) * 4;
        col.setRGB(px[k] / 255, px[k + 1] / 255, px[k + 2] / 255); col.getHSL(hsl);
        v.fromBufferAttribute(P, i); nn.fromBufferAttribute(N, i);
        if (drop(px[k] / 255, px[k + 1] / 255, px[k + 2] / 255, hsl.h, hsl.s, hsl.l, v, nn)) { gone[i] = 1; if (nn.y > 0.85) info.up.push(v.y); }
      }
      if (planeTol > 0 && info.up.length) { const ys = info.up.slice().sort((a, b) => a - b), py = ys[Math.floor(ys.length / 2)];
        for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); nn.fromBufferAttribute(N, i); if (Math.abs(v.y - py) < planeTol && nn.y > 0.45) gone[i] = 1; if (v.y < py - 0.3 && nn.y > 0.45 && Math.abs(v.y - py) < planeTol * 3) gone[i] = 1; } }
      for (let t = 0; t < n / 3; t++) keepTri[t] = (gone[3 * t] + gone[3 * t + 1] + gone[3 * t + 2]) >= 2 ? 0 : 1;
    }
    if (keep === 'largest') {
      // connected components over welded vertex positions
      const key = (i) => `${Math.round(P.getX(i) * 20)},${Math.round(P.getY(i) * 20)},${Math.round(P.getZ(i) * 20)}`;
      const id = new Map(), par = []; const find = (a) => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
      const vid = new Int32Array(n); for (let i = 0; i < n; i++) { const k = key(i); if (!id.has(k)) { id.set(k, par.length); par.push(par.length); } vid[i] = id.get(k); }
      for (let t = 0; t < n / 3; t++) if (keepTri[t]) { const a = find(vid[3 * t]), b = find(vid[3 * t + 1]), c = find(vid[3 * t + 2]); par[b] = a; par[find(c)] = a; }
      const cnt = new Map(); for (let t = 0; t < n / 3; t++) if (keepTri[t]) { const r = find(vid[3 * t]); cnt.set(r, (cnt.get(r) || 0) + 1); }
      let best = -1, bc = 0; cnt.forEach((c, r) => { if (c > bc) { bc = c; best = r; } });
      for (let t = 0; t < n / 3; t++) if (keepTri[t] && find(vid[3 * t]) !== best) keepTri[t] = 0;
    }
    // compact
    const kept = keepTri.reduce((a, b) => a + b, 0); const out = new THREE.BufferGeometry();
    for (const [nm, a] of Object.entries(geo.attributes)) { const sz = a.itemSize, arr = new Float32Array(kept * 3 * sz); let o2 = 0;
      for (let t = 0; t < n / 3; t++) if (keepTri[t]) for (let q = 0; q < 3; q++) { for (let c = 0; c < sz; c++) arr[o2 * sz + c] = a.array[(3 * t + q) * sz + c]; o2++; }
      out.setAttribute(nm, new THREE.BufferAttribute(arr, sz)); }
    out.computeBoundingBox();
    const mat = lit ? new THREE.MeshStandardMaterial({ map, roughness: rough, side: THREE.DoubleSide }) : new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide });
    if (map) { map.anisotropy = 8; map.colorSpace = THREE.SRGBColorSpace; }
    const m = new THREE.Mesh(out, mat); m.castShadow = m.receiveShadow = true; group.add(m);
  }
  let box = new THREE.Box3().setFromObject(group);
  info.up.sort((a, b) => a - b); const sy = info.up.length ? info.up[Math.floor(info.up.length / 2)] : box.min.y;
  // re-centre: origin = middle of the scan, on the surface it lay on (so rotations turn it in place)
  const c = box.getCenter(new THREE.Vector3()); group.children.forEach(m => { m.geometry.translate(-c.x, -sy, -c.z); m.geometry.computeBoundingBox(); m.geometry.computeBoundingSphere(); });
  box = new THREE.Box3().setFromObject(group); info.box = box; info.supportY = 0; info.up = [];
  group.userData.info = info; return group;
}
// put a scan so the surface it lay on sits at height y0, centred over x, z
function seatScan(sc, x = 0, y0 = 0, z = 0) { sc.position.set(x, y0, z); return sc; }

// =====================================================================
// ASSETS (laptop short): Poly Haven rooms + desert sky (CC0), desk lamp, armchair, plant, wood/walnut/sand/plaster textures;
// three real scans of real cats and the rigged "Fripouille" cat (CC BY).
// =====================================================================
const [ROOM, FIRE, LOUNGE, SUNNY, DESERT] = await Promise.all(['lythwood_room_4k.hdr', 'fireplace_2k.hdr', 'lythwood_lounge_4k.hdr', 'kiara_interior_4k.hdr', 'goegap_4k.hdr'].map(loadHDR));
await Promise.all(['desk_lamp_arm_01', 'ArmChair_01', 'potted_plant_02'].map(async id => { MOD[id] = await loadModel(id); }));
const TX = {}; [TX.floor, TX.walnut, TX.sand, TX.wall] = await Promise.all(['wood_floor', 'walnut_veneer', 'coast_sand_01', 'beige_wall_001'].map(id => loadPBR(id)));
const boardRule = (r, g, b, h, s, l) => l > 0.62 && s < 0.2;
const SCAN = {
  hero: await loadScan('assets/cats/scan_table.glb', { drop: boardRule, planeTol: 1.3 }),           // a tabby stretched out asleep
  pillow: await loadScan('assets/cats/scan_comfy.glb', { scale: 14.4 }),                            // a grey cat curled on its pillow
  mat: await loadScan('assets/cats/scan_other.glb', { scale: 75 }),                                 // a tabby curled on its mat
};
const scanCopy = (k) => { const c = SCAN[k].clone(true); c.userData.info = SCAN[k].userData.info; return c; };
function envK(sc, k) { sc.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m && 'envMapIntensity' in m) { m.userData.envBase ??= m.envMapIntensity ?? 1; m.envMapIntensity = m.userData.envBase * k; } }); }
const shadowSun = (col, I, pos, r = 80, soft = 0.6) => { const l = new THREE.DirectionalLight(col, I); l.position.copy(pos); l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0003; l.shadow.normalBias = 0.6;
  Object.assign(l.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: pos.length() * 2 + 200 }); l.userData.soft = soft; return l; };
// ray-cast down to find the top of a surface
function surfaceY(obj, x, z, from = 300) { obj.updateMatrixWorld(true); const rc = new THREE.Raycaster(V(x, from, z), V(0, -1, 0)); const h = rc.intersectObject(obj, true); return h.length ? h[0].point.y : 0; }

// ---------------------------------------------------------------------
// MODERN LAPTOP (procedural): anodised aluminium unibody, black keys with backlit legends, glass trackpad, thin-bezel screen.
// 30.4 x 21.2 cm, faces +z (the user), hinge at the back. lap.screen.set({ mode, n, heat, clock }) redraws the display.
// ---------------------------------------------------------------------
const ALU = new THREE.MeshPhysicalMaterial({ color: 0x8e9196, metalness: 1, roughness: 0.32, clearcoat: 0.2, clearcoatRoughness: 0.4 });
const KEYM = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.62 });
const GLASSPAD = new THREE.MeshPhysicalMaterial({ color: 0x9a9da2, metalness: 0.6, roughness: 0.12, clearcoat: 1 });
const KEYROWS = [
  ['esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', ''],
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete'],
  ['tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'return'],
  ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'shift'],
  ['fn', 'ctrl', 'opt', 'cmd', ' ', 'cmd', 'opt', '◀', '▲▼', '▶'],
];
const KEYW = { esc: 1.5, delete: 1.5, tab: 1.5, '\\': 1.5, caps: 1.8, return: 1.8, shift: 2.35, ' ': 5.6, cmd: 1.25, '': 1 };
function makeLaptop({ lid = 112 } = {}) {
  const g = new THREE.Group(), Wd = 30.4, D = 21.2, T = 1.45;
  const base = new THREE.Mesh(new RoundedBoxGeometry(Wd, T, D, 4, 0.55), ALU); base.position.y = T / 2; base.castShadow = base.receiveShadow = true; g.add(base);
  // keyboard well
  const well = new THREE.Mesh(new RoundedBoxGeometry(27.6, 0.2, 11.6, 2, 0.3), new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.8 })); well.position.set(0, T - 0.04, -D / 2 + 2.0 + 5.8); g.add(well);
  // keys (instanced) + legend positions
  const keyGeo = new RoundedBoxGeometry(1, 0.32, 1, 2, 0.12); const pos = [];
  const unit = 1.86, gap = 0.2, top = -D / 2 + 2.25;
  KEYROWS.forEach((row, r) => { const h = r === 0 ? 0.9 : 1.62; let total = row.reduce((a, k) => a + (KEYW[k] || 1) * unit, 0) - gap; let x = -total / 2;
    const z = top + (r === 0 ? 0.45 : 0.9 + 0.3 + (r - 1) * (1.62 + gap) + 0.81) ;
    row.forEach(k => { const w = (KEYW[k] || 1) * unit - gap; pos.push({ k, x: x + w / 2, z, w, h }); x += w + gap; }); });
  const keys = new THREE.InstancedMesh(keyGeo, KEYM, pos.length); const m4 = new THREE.Matrix4();
  pos.forEach((p, i) => { m4.compose(V(p.x, T + 0.1, p.z), new THREE.Quaternion(), V(p.w, 1, p.h)); keys.setMatrixAt(i, m4); });
  keys.castShadow = true; keys.receiveShadow = true; g.add(keys); g.userData.keys = pos; g.userData.keyTop = T + 0.27;
  // backlit legends on one transparent plane over the keys
  const [lc, lg] = mkCanvas(2048, 1024), sx = 2048 / 28, sz = 1024 / 12, z0 = -D / 2 + 2.0;
  lg.clearRect(0, 0, 2048, 1024); lg.fillStyle = 'rgba(235,240,255,0.92)'; lg.textAlign = 'center'; lg.textBaseline = 'middle';
  pos.forEach(p => { if (!p.k.trim()) return; const fs = p.k.length > 2 ? 22 : (p.k.length > 1 ? 26 : 34); lg.font = `500 ${fs}px "Helvetica Neue", Arial, sans-serif`; lg.fillText(p.k, (p.x + 14) * sx, (p.z - z0) * sz); });
  const lt = texOf(lc); lt.wrapS = lt.wrapT = THREE.ClampToEdgeWrapping;
  const leg = new THREE.Mesh(new THREE.PlaneGeometry(28, 12), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, toneMapped: false, color: 0x9aa4b8, polygonOffset: true, polygonOffsetFactor: -2 }));
  leg.rotation.x = -Math.PI / 2; leg.position.set(0, T + 0.275, z0 + 6); leg.userData.noDof = true; g.add(leg);
  // trackpad
  const pad = new THREE.Mesh(new RoundedBoxGeometry(12.4, 0.06, 7.6, 2, 0.4), GLASSPAD); pad.position.set(0, T + 0.005, D / 2 - 4.9); g.add(pad);
  // lid
  const lidG = new THREE.Group(); lidG.position.set(0, T, -D / 2 + 0.35); g.add(lidG);
  const back = new THREE.Mesh(new RoundedBoxGeometry(Wd, 0.55, D - 0.4, 4, 0.27), ALU); back.position.set(0, 0.28, (D - 0.4) / 2 - 0.2); back.castShadow = true; lidG.add(back);
  const bez = new THREE.Mesh(new THREE.PlaneGeometry(Wd - 0.5, D - 0.9), new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.08, clearcoat: 1 })); bez.position.set(0, -0.03, (D - 0.4) / 2 - 0.2); bez.rotation.x = Math.PI / 2; lidG.add(bez);
  const [sc, sg] = mkCanvas(1600, 1000); const stex = texOf(sc); stex.wrapS = stex.wrapT = THREE.ClampToEdgeWrapping;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(28.6, 17.9), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: stex, emissiveIntensity: 1.05, roughness: 0.18, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  scr.position.set(0, -0.09, (D - 0.4) / 2 - 0.2 + 0.45); scr.rotation.x = Math.PI / 2; lidG.add(scr);
  lidG.rotation.x = -THREE.MathUtils.degToRad(lid);
  const screenLight = new THREE.PointLight(0xbcd2ff, 0, 60, 2); screenLight.position.set(0, 9, -2); g.add(screenLight);
  g.userData.lid = lidG; g.userData.screenMesh = scr; g.userData.screenLight = screenLight;
  let last = '';
  g.userData.screen = { set(st = {}) { const key = JSON.stringify(st); if (key === last) return; last = key; drawScreen(sg, st); stex.needsUpdate = true; } };
  g.userData.screen.set({ mode: 'doc' });
  g.userData.T = T; g.userData.D = D; g.userData.W = Wd;
  return g;
}
// the display: a desktop with a document window; 'jjj' types a run of letters; heat overlays an eye-tracking heat map
const DOC_LINES = ['Quarterly plan — draft 3', '', 'Goals for next quarter', 'Ship the new onboarding flow by the end of the month and', 'measure how many people finish it. Then interview ten', 'customers about the parts they skipped and why.', '', 'Budget', 'Keep spending flat. Move the design contract to Q2 and', 'reuse the photos from the spring campaign.', '', 'Notes', 'Book the meeting room for Thursday. Ask Sam about the', 'numbers before Friday.'];
function drawScreen(g, { mode = 'doc', n = 0, heat = 0, clock = '9:41', dim = 1 } = {}) {
  const w = 1600, h = 1000;
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#1d3557'); bg.addColorStop(0.6, '#3d5a80'); bg.addColorStop(1, '#98c1d9'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(20,22,28,0.85)'; g.fillRect(0, 0, w, 34); g.fillStyle = '#e8ecf2'; g.font = '500 22px "Helvetica Neue", Arial'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(clock, w - 24, 17);
  g.textAlign = 'left'; g.fillText('File   Edit   View   Format', 60, 17);
  // window
  const x0 = 170, y0 = 80, ww = 1260, wh = 820;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x0 + 10, y0 + 14, ww, wh);
  g.fillStyle = '#f7f7f5'; g.fillRect(x0, y0, ww, wh); g.fillStyle = '#e4e4e2'; g.fillRect(x0, y0, ww, 44);
  [['#ff5f57', 0], ['#febc2e', 1], ['#28c840', 2]].forEach(([c, i]) => { g.fillStyle = c; g.beginPath(); g.arc(x0 + 26 + i * 26, y0 + 22, 8, 0, 7); g.fill(); });
  g.fillStyle = '#222'; g.textBaseline = 'alphabetic';
  let y = y0 + 110;
  const typed = mode === 'jjj' ? Math.floor(n) : 0;
  (typed > 0 ? DOC_LINES.slice(0, 6) : DOC_LINES).forEach((ln, i) => { g.font = i === 0 ? '700 40px Georgia, serif' : (['Goals for next quarter', 'Budget', 'Notes'].includes(ln) ? '700 28px "Helvetica Neue", Arial' : '400 26px Georgia, serif'); g.fillStyle = '#1e1e1e'; g.fillText(ln, x0 + 70, y); y += i === 0 ? 60 : 40; });
  if (typed > 0) { // the cat's weight on the keys: one long run of letters, wrapping
    g.font = '400 26px Georgia, serif'; g.fillStyle = '#1e1e1e'; const run = 'j'.repeat(Math.min(typed, 2000)); const per = 78; let yy = y; for (let i = 0; i < run.length; i += per) { g.fillText(run.slice(i, i + per) + (i + per >= run.length ? '|' : ''), x0 + 70, yy); yy += 34; if (yy > y0 + wh - 20) break; } }
  else { g.fillStyle = '#1e1e1e'; g.fillRect(x0 + 70 + g.measureText('').width, y - 26, 3, 32); }
  // dock
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(520, h - 74, 560, 62); ['#4f8ef7', '#f7b84f', '#55c27a', '#e45d5d', '#9b6cf0', '#3cc6c9', '#f08fb8'].forEach((c, i) => { g.fillStyle = c; g.fillRect(540 + i * 76, h - 66, 52, 46); });
  if (heat > 0) { g.globalCompositeOperation = 'source-over';
    const blobs = [[x0 + 330, y0 + 110, 150], [x0 + 520, y0 + 270, 210], [x0 + 420, y0 + 400, 170], [x0 + 700, y0 + 520, 150], [x0 + 300, y0 + 600, 120], [w - 70, 17, 60]];
    blobs.forEach(([bx, by, r], i) => { const k = clamp(heat * blobs.length - i); if (k <= 0) return; const gr = g.createRadialGradient(bx, by, 0, bx, by, r * (0.6 + 0.4 * k));
      gr.addColorStop(0, `rgba(255,40,20,${0.62 * k})`); gr.addColorStop(0.35, `rgba(255,200,0,${0.42 * k})`); gr.addColorStop(0.7, `rgba(40,220,90,${0.25 * k})`); gr.addColorStop(1, 'rgba(0,80,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); }
  if (dim < 1) { g.fillStyle = `rgba(0,0,0,${1 - dim})`; g.fillRect(0, 0, w, h); }
}

// ---------------------------------------------------------------------
// THERMAL CAMERA: every surface gets a temperature; the ironbow palette maps 18-40 C to black-purple-orange-yellow-white.
// thermalize(scene, rule) swaps materials (rule(o) -> { t0, t1, hot, r, edge }) and sets a cool background.
// ---------------------------------------------------------------------
const IRONBOW = `vec3 ironbow(float t){ t=clamp(t,0.,1.);
  vec3 c0=vec3(0.,0.,0.03), c1=vec3(0.13,0.0,0.38), c2=vec3(0.55,0.02,0.55), c3=vec3(0.92,0.22,0.12), c4=vec3(1.0,0.58,0.0), c5=vec3(1.0,0.88,0.25), c6=vec3(1.0,1.0,0.85);
  if(t<0.16) return mix(c0,c1,t/0.16); if(t<0.36) return mix(c1,c2,(t-0.16)/0.2); if(t<0.56) return mix(c2,c3,(t-0.36)/0.2); if(t<0.74) return mix(c3,c4,(t-0.56)/0.18); if(t<0.9) return mix(c4,c5,(t-0.74)/0.16); return mix(c5,c6,(t-0.9)/0.1); }`;
function thermalMat({ t0 = 21, t1 = 21, hot = null, r = 10, edge = 0, nz = 0.35, gy = 0, hot2 = null, r2 = 10, t2 = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { t0: { value: t0 }, t1: { value: t1 }, hot: { value: hot || V(0, -1e5, 0) }, r: { value: r }, edge: { value: edge }, nz: { value: nz }, gy: { value: gy }, hot2: { value: hot2 || V(0, -1e5, 0) }, r2: { value: r2 }, t2: { value: t2 } },
    vertexShader: `#include <common>\n#include <skinning_pars_vertex>\nvarying vec3 vW; varying vec3 vN;\nvoid main(){\n#include <skinbase_vertex>\n#include <beginnormal_vertex>\n#include <skinnormal_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\n\n#ifdef USE_INSTANCING\ntransformed=(instanceMatrix*vec4(transformed,1.)).xyz;\n#endif\nvec4 wp=modelMatrix*vec4(transformed,1.); vW=wp.xyz; vN=normalize(mat3(modelMatrix)*objectNormal); gl_Position=projectionMatrix*viewMatrix*wp;\n}`,
    fragmentShader: `uniform float t0,t1,r,edge,nz,gy,r2,t2; uniform vec3 hot,hot2; varying vec3 vW; varying vec3 vN; ${IRONBOW}
      float hsh(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
      void main(){ vec3 d=vW-hot; float T=t0+(t1-t0)*exp(-dot(d,d)/(r*r)); vec3 d2=vW-hot2; T+=t2*exp(-dot(d2,d2)/(r2*r2)); T+=gy*vW.y;
        vec3 v=normalize(cameraPosition-vW); float f=1.-abs(dot(normalize(vN),v)); T-=edge*f*f; T+=nz*(hsh(floor(vW*1.7))-0.5);
        gl_FragColor=vec4(ironbow((T-18.)/22.)*1.05,1.); }`,
    side: THREE.DoubleSide, toneMapped: false });
}
function thermalize(sc, rule) {
  const list = []; sc.traverse(o => { if (o.isMesh || o.isInstancedMesh) list.push(o); });
  for (const o of list) { if (o.userData.noThermal) { o.visible = false; continue; } const r = rule(o) || { t0: 21 }; o.material = thermalMat(r); o.castShadow = false; }
  sc.background = new THREE.Color(0x0b0418); sc.environment = null;
}
// the HUD: a temperature scale and a crosshair readout (drawn crisp on the overlay)
function thermalHud(s, { cross = null } = {}) {
  const lab = liveLabel(0.9, 1.6); OV(s, lab);
  const c = lab.material.map.image, g = c.getContext('2d');
  lab.userData.draw = (t, readout = null, crossOn = 0) => {
    const key = `${readout}|${crossOn.toFixed(2)}|${Math.floor(t * 2) % 2}`; if (lab.userData.k === key) return; lab.userData.k = key;
    g.clearRect(0, 0, c.width, c.height); const W2 = c.width, H2 = c.height;
    g.font = '800 44px "Nunito", Arial'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText('THERMAL', 70, 80);
    g.fillStyle = Math.floor(t * 2) % 2 ? '#ff3b30' : 'rgba(255,59,48,0.3)'; g.beginPath(); g.arc(40, 80, 13, 0, 7); g.fill();
    const bx = W2 - 80, by0 = 120, by1 = H2 - 260; const gr = g.createLinearGradient(0, by1, 0, by0);
    [[0, '#000008'], [0.16, '#210061'], [0.36, '#8c058c'], [0.56, '#eb381f'], [0.74, '#ff9400'], [0.9, '#ffe040'], [1, '#ffffd9']].forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(bx, by0, 26, by1 - by0); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.strokeRect(bx, by0, 26, by1 - by0);
    g.font = '700 30px "Nunito", Arial'; g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText('40°', bx - 12, by0 + 4); g.fillText('29°', bx - 12, (by0 + by1) / 2); g.fillText('18°', bx - 12, by1 - 4);
    if (crossOn > 0) { const cx = W2 / 2, cy = H2 / 2 + 60; g.globalAlpha = crossOn; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 60, cy); g.lineTo(cx - 18, cy); g.moveTo(cx + 18, cy); g.lineTo(cx + 60, cy); g.moveTo(cx, cy - 60); g.lineTo(cx, cy - 18); g.moveTo(cx, cy + 18); g.lineTo(cx, cy + 60); g.stroke();
      if (readout) { g.font = '900 78px "Nunito", Arial'; g.textAlign = 'left'; g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(readout, cx + 50, cy - 80); g.fillStyle = '#fff'; g.fillText(readout, cx + 50, cy - 80); } g.globalAlpha = 1; }
    lab.material.map.needsUpdate = true; };
  return lab;
}

// ---------------------------------------------------------------------
// SETS
// ---------------------------------------------------------------------
// the desk at night: walnut desk (top at y = 0), laptop, lamp, plant; the room behind is the HDR
function deskSet(s, { hero = true, lampI = 1 } = {}) {
  const sc = s.scene; sc.background = ROOM.tex; sc.backgroundIntensity = 0.5; sc.environment = ROOM.env; sc.backgroundBlurriness = 0.0;
  const desk = new THREE.Mesh(new RoundedBoxGeometry(170, 4, 150, 3, 0.6), pbrMat(TX.walnut, { rep: [2.2, 2], rough: 0.85 })); desk.position.set(0, -2, 20); desk.receiveShadow = true; desk.castShadow = true; sc.add(desk);
  const lap = makeLaptop(); sc.add(lap); s.lap = lap;
  const lamp = model('desk_lamp_arm_01', 100); lamp.position.set(-74, 0, -40); lamp.rotation.y = 0.9; sc.add(lamp);
  const plant = model('potted_plant_02', 55); plant.position.set(52, 0, -30); sc.add(plant);
  // lamp: warm pool of light with soft shadows
  const key = new THREE.SpotLight(0xffc98a, 9000 * lampI, 260, 0.75, 0.6, 2); key.position.set(-52, 66, -22); key.target.position.set(4, 0, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.userData.soft = 2.5; sc.add(key, key.target);
  const fill = new THREE.PointLight(0x9fb8ff, 900, 200, 2); fill.position.set(40, 50, 60); sc.add(fill);
  lap.userData.screenLight.intensity = 260;
  if (hero) { const cat = scanCopy('hero'); cat.rotation.y = 0.12; seatScan(cat, -8, lap.userData.T + 0.15, 1.5); sc.add(cat); s.cat = cat; }
  envK(sc, 0.55);
  return { desk, lap, lamp, key };
}
// a thermal rule for the desk scenes
function deskThermal(s) {
  const lapPos = V(0, 0.6, 0);
  thermalize(s.scene, o => {
    let p = o; while (p) { if (p === s.cat) return { t0: 29.5, t1: 37.5, hot: V(-8, 8, 3), r: 22, edge: 7, nz: 0.8 }; if (p === s.lap) return { t0: 27, t1: 38.5, hot: lapPos, r: 16, nz: 0.3, edge: 1 }; p = p.parent; }
    if (o.userData.isLamp) return { t0: 24, t1: 33, hot: V(-30, 68, -8), r: 8 };
    return { t0: 20.5, t1: 27, hot: V(0, 0, 0), r: 20, nz: 0.5 };
  });
}
// by the fire: wood floor, a rug, the tabby stretched out in the warmth
function fireSet(s) {
  const sc = s.scene; sc.background = FIRE.tex; sc.backgroundIntensity = 0.7; sc.environment = FIRE.env;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), pbrMat(TX.floor, { rep: [6, 6], rough: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
  const rug = new THREE.Mesh(new RoundedBoxGeometry(150, 1.2, 100, 2, 0.5), new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7a2e22'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 4, 40); g.strokeStyle = '#d9b77c'; g.lineWidth = 14; g.strokeRect(30, 30, w - 60, h - 60); g.lineWidth = 4; g.strokeRect(60, 60, w - 120, h - 120); }), roughness: 1 }));
  rug.position.y = 0.6; rug.receiveShadow = true; sc.add(rug);
  const cat = scanCopy('hero'); cat.rotation.y = -0.4; seatScan(cat, 0, 1.2, 0); sc.add(cat); s.cat = cat;
  const fire = new THREE.PointLight(0xff8a3a, 52000, 700, 2); fire.position.set(-30, 48, 150); fire.castShadow = true; fire.shadow.mapSize.set(1024, 1024); fire.userData.soft = 6; sc.add(fire); s.fire = fire;
  const glow = new THREE.DirectionalLight(0xff9a50, 2.6); glow.position.set(-80, 50, 120); sc.add(glow); const rim = new THREE.DirectionalLight(0xffb070, 1.6); rim.position.set(40, 40, -160); sc.add(rim);
  envK(sc, 0.7);
}
// the armchair you just got up from
function chairSet(s) {
  const sc = s.scene; sc.background = LOUNGE.tex; sc.backgroundIntensity = 0.75; sc.environment = LOUNGE.env;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), pbrMat(TX.floor, { rep: [6, 6], rough: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
  const ch = model('ArmChair_01', 100); sc.add(ch); s.chair = ch;
  const seat = surfaceY(ch, 0, 2);
  const cat = scanCopy('pillow'); cat.rotation.y = 0.4; seatScan(cat, 0, seat + 4, 4); sc.add(cat); s.cat = cat; s.seat = seat;
  const sun = shadowSun(0xfff0dc, 2.2, V(120, 220, 160), 120, 4); sc.add(sun);
  envK(sc, 0.9);
}
// sun through a window onto the floor: the window frame is an off-screen wall that casts the pane shadows
function sunbeamSet(s) {
  const sc = s.scene; sc.background = new THREE.Color(0x2a221b); sc.environment = SUNNY.env;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), pbrMat(TX.floor, { rep: [9, 9], rough: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
  const wall = new THREE.Group(); const wm = new THREE.MeshStandardMaterial({ color: 0xffffff, colorWrite: false }); const bar = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), wm); m.position.set(x, y, 0); m.castShadow = true; wall.add(m); };
  bar(720, 200, 0, 300); bar(720, 180, 0, -10); bar(300, 120, -210, 140); bar(300, 120, 210, 140); bar(5, 120, 0, 140); bar(120, 5, 0, 140);
  wall.position.set(0, 0, -260); sc.add(wall);
  const sun = shadowSun(0xffe2b0, 7, V(0, 330, -420), 260, 0.8); sc.add(sun); s.sun = sun;
  const cat = scanCopy('hero'); seatScan(cat, 0, 0.1, 0); sc.add(cat); s.cat = cat;
  envK(sc, 0.14);
}
// the desert at golden hour: dunes of real sand texture under the real sky
function desertSet(s) {
  const sc = s.scene; sc.background = DESERT.tex; sc.backgroundIntensity = 1.0; sc.environment = DESERT.env;
  const geo = new THREE.PlaneGeometry(6000, 6000, 220, 220); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const d = Math.hypot(x, z); const amp = smooth(150, 1600, d); p.setY(i, amp * (60 * Math.sin(x * 0.0021 + z * 0.0009) + 35 * Math.sin(z * 0.004 - x * 0.0013 + 1.3)) + 6 * fbm(x * 0.004, z * 0.004) - 0.0); }
  geo.computeVertexNormals();
  const sand = new THREE.Mesh(geo, pbrMat(TX.sand, { rep: [90, 90], rough: 1, color: 0xe2b98a })); sand.receiveShadow = true; sc.add(sand);
  const sun = shadowSun(0xffd3a0, 4.2, V(-260, 160, 120), 160, 1.2); sc.add(sun);
  sc.fog = new THREE.Fog(0xe9c9a3, 900, 4200);
  envK(sc, 0.8);
}

// height of the desk surface under a point (the laptop is a 1.7 cm step)
const lapGround = (x, z) => (Math.abs(x) < 15.2 && Math.abs(z) < 10.6 ? 1.72 : 0);
// scans carry their own photographed light; a touch of self-light keeps them from going muddy under a hard sun
function liftScan(sc, k = 0.3) { sc.traverse(o => { if (o.isMesh && o.material.map) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0xffffff); o.material.emissiveMap = o.material.map; o.material.emissiveIntensity = k; } }); }

// =====================================================================
// SHOTS: "Your cat isn't sitting on your laptop to annoy you ... don't push it off, because" (loops back to the start)
// =====================================================================
const END = C.end;
// the hero framing: one continuous move that the last shot ends on and the first shot starts from (u = 0 at the loop point)
function heroCam(s, u, opts = {}) {
  const a = 0.5 + 0.025 * u, R = 122 - 2.2 * u, y = 40 - 0.5 * u;
  const pos = V(Math.sin(a) * R - 6, y, Math.cos(a) * R), tg = V(-6, 10, 2);
  shoot(s.cam, pos, tg, { fov: 34, t: u + 100, hand: 0.35, focus: pos.distanceTo(V(-7, 8, 8)), ...opts });
}
const RIVAL_CAT = await makeRealCat({});
const DESERT_CAT = await makeRealCat({});
tintCat(DESERT_CAT, 0.72, 0.64, 0.5);

// 1) Your cat isn't sitting on your laptop to annoy you. — the tabby asleep across the keyboard at night
shot(0, C.its, (s) => { deskSet(s); s.ap = 6; s.maxR = 14; s.exposure = 1.05; s.bloom = 0.34;
  s.update = (t) => { heroCam(s, t); }; });
// 2) It's sitting on a heater. — a scan line wipes the same view into thermal
shot(C.its, C.a2, (s) => { deskSet(s); deskThermal(s); s.ap = 6; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.25; const hud = thermalHud(s);
  s.update = (t) => { heroCam(s, t); pinF(s.cam, hud, 0, 0, 3); hud.userData.draw(t); }; });
// 3) A laptop runs as warm as your skin — thermal close-up on the laptop under the cat; the crosshair reads 35 C
shot(C.a2, C.and, (s) => { deskSet(s, { hero: false }); deskThermal(s); s.ap = 7; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.25; const hud = thermalHud(s);
  s.update = (t) => { const k = E.io(seg(t, C.a2, C.and)); const pos = lv(V(42, 30, 66), V(33, 24, 52), k), tg = V(0, 3, 0);
    shoot(s.cam, pos, tg, { fov: 30, t, hand: 0.3 }); pinF(s.cam, hud, 0, 0, 3);
    hud.userData.draw(t, t < C.skin ? '35°C' : '35°C ≈ SKIN', smooth(C.warm - 0.3, C.warm, t)); }; });
// 4) and cats feel best at temperatures that would make you sweat. — by the fire; two comfort zones on a thermometer
shot(C.and, C.their, (s) => { fireSet(s); s.ap = 7; s.maxR = 15; s.exposure = 1.0; s.bloom = 0.36;
  const th = comfortHud(s);
  s.update = (t) => { const k = seg(t, C.and, C.their); const a = 0.9 + 0.35 * k; const pos = V(Math.sin(a) * 135, 46 - 6 * k, Math.cos(a) * 135), tg = V(0, 8, 0);
    shoot(s.cam, pos, tg, { fov: 32, t, hand: 0.4 }); s.fire.intensity = 90000 * (0.88 + 0.12 * fbm(t * 3.2, 7)); pinF(s.cam, th, 0, 0, 3);
    th.userData.draw(smooth(C.cats - 0.1, C.cats + 0.5, t), smooth(C.make - 0.1, C.make + 0.5, t)); }; });
// 5) Their ancestors lived in the desert. — a wildcat crossing the dunes at golden hour
shot(C.their, C.thats, (s) => { desertSet(s); s.scene.add(DESERT_CAT.root); s.ap = 5; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.4;
  const lab = liveLabel(0.9, 0.2); OV(s, lab); lab.userData.set([['AFRICAN WILDCAT', 96, 0.5, '#ffffff', 900, 3]]);
  const path = (sd) => ({ pos: V(60 - sd, 0, 0), yaw: Math.PI });
  s.update = (t) => { const sd = 38 * (t - C.their); poseCat(DESERT_CAT, { walk: { s: sd, at: path, stride: 36 }, tail: { up: -0.1, curl: 0.2, sway: 0.2, phase: t * 3 }, look: V(-200, 22, 60), lookK: 0.35 });
    const cx = 60 - sd; const pos = V(cx - 75, 13, 215), tg = V(cx - 14, 16, 0);
    shoot(s.cam, pos, tg, { fov: 34, t, hand: 0.5, focus: pos.distanceTo(V(cx, 15, 0)) }); pinF(s.cam, lab, 0, 0.36, 3, spring(t, C.ancestors, 2, 6) * 0.85); }; });
// 6) That's why it steals your warm seat, — the armchair you just left (then a wipe to thermal)
const chairCam = (s, t) => { const k = E.io(seg(t, C.thats, C.and2 + 0.4)); const pos = lv(V(115, 108, 235), V(82, 92, 172), k), tg = V(0, 50, 2); shoot(s.cam, pos, tg, { fov: 30, t, hand: 0.4 }); };
shot(C.thats, C.warm2, (s) => { chairSet(s); s.ap = 6; s.maxR = 14; s.exposure = 1.05; s.bloom = 0.3; s.update = (t) => chairCam(s, t); });
shot(C.warm2, C.and2, (s) => { chairSet(s); s.ap = 6; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.25; const hud = thermalHud(s);
  thermalize(s.scene, o => { let p = o; while (p) { if (p === s.cat) return { t0: 30, t1: 36.5, hot: V(0, s.seat + 10, 4), r: 16, edge: 7, nz: 0.8 }; if (p === s.chair) return { t0: 21, t1: 31.5, hot: V(0, s.seat + 2, -6), r: 30, hot2: V(0, s.seat + 25, -30), r2: 22, t2: 6, nz: 0.4 }; p = p.parent; } return { t0: 20, nz: 0.5 }; });
  s.update = (t) => { chairCam(s, t); pinF(s.cam, hud, 0, 0, 3); hud.userData.draw(t); }; });
// 7) and follows the sunbeam across the floor. — time-lapse: the patch of sun slides; the cat jumps to keep up
shot(C.and2, C.theres, (s) => { sunbeamSet(s); s.ap = 3; s.maxR = 10; s.exposure = 1.0; s.bloom = 0.42;
  const lab = liveLabel(0.9, 0.2); OV(s, lab);
  s.update = (t) => { const k = seg(t, C.and2, C.theres); const ang = lerp(-0.28, 0.32, k);
    const sp = V(Math.sin(ang) * 420, 330 + 40 * Math.cos(ang * 1.3), -260 - Math.cos(ang) * 160); s.sun.position.copy(sp); s.sun.target.position.set(0, 0, 0); s.sun.target.updateMatrixWorld();
    const dir = V(0, 0, 0).sub(sp).normalize(), w0 = V(0, 140, -260); const hit = w0.clone().addScaledVector(dir, -w0.y / dir.y);
    const step = Math.floor((t - C.and2) / 0.42), kk = clamp((step * 0.42) / (C.theres - C.and2)); const angS = lerp(-0.28, 0.32, kk);
    const spS = V(Math.sin(angS) * 420, 330 + 40 * Math.cos(angS * 1.3), -260 - Math.cos(angS) * 160), dS = V(0, 0, 0).sub(spS).normalize(), hS = w0.clone().addScaledVector(dS, -w0.y / dS.y);
    s.cat.position.x = hS.x; s.cat.position.z = hS.z;
    const hk = w0.clone().addScaledVector(dir, -w0.y / dir.y); const pos = V(hk.x * 0.6 - 30, 175, hk.z + 130), tg = V(hk.x * 0.6, 0, hk.z); shoot(s.cam, pos, tg, { fov: 36, t, hand: 0.15 });
    const hrs = 9 + Math.floor(k * 8), mins = Math.floor((k * 8 % 1) * 60); lab.userData.set([[`${hrs}:${String(mins).padStart(2, '0')}`, 90, 0.5, '#ffffff', 900, 3]]); pinF(s.cam, lab, 0, 0.38, 3, 0.8); };
  });
// 8) There's a second reason. — the empty desk, the laptop glowing; push in
shot(C.theres, C.the4, (s) => { deskSet(s, { hero: false }); s.ap = 6; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.34;
  s.update = (t) => { const k = E.io(seg(t, C.theres, C.the4)); const pos = lv(V(-38, 34, 70), V(-22, 22, 46), k), tg = V(0, 11, -6); shoot(s.cam, pos, tg, { fov: 30, t, hand: 0.35 }); }; });
// 9) The laptop is where your eyes are all day. — your view of the screen; a heat map of where you look builds up as the clock races
shot(C.the4, C.to2, (s) => { deskSet(s, { hero: false }); s.ap = 4; s.maxR = 10; s.exposure = 1.0; s.bloom = 0.36;
  s.update = (t) => { const k = seg(t, C.the4, C.to2); const hm = 9 * 60 + 41 + Math.floor(E.io(k) * 13.5 * 60); const clock = `${Math.floor(hm / 60) % 24}:${String(hm % 60).padStart(2, '0')}`;
    s.lap.userData.screen.set({ mode: 'doc', heat: Math.round(smooth(C.eyes - 0.2, C.day + 0.4, t) * 30) / 30, clock });
    s.scene.backgroundIntensity = lerp(0.55, 0.22, k);
    const pos = lv(V(2, 48, 76), V(1, 43, 63), E.io(k)), tg = V(0, 13, -9); shoot(s.cam, pos, tg, { fov: 34, t, hand: 0.3 }); }; });
// 10) To your cat, it's the thing stealing your attention, — behind the cat's ears, the laptop is a rival
shot(C.to2, C.so, (s) => { deskSet(s, { hero: false }); s.scene.add(RIVAL_CAT.root); s.ap = 7; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.34;
  const lab = liveLabel(0.9, 0.2); OV(s, lab); lab.userData.set([['RIVAL', 150, 0.5, '#ff4a3d', 900, 3]]);
  s.update = (t) => { poseCat(RIVAL_CAT, { pos: V(6, 0, 56), yaw: Math.PI / 2 + 0.12, look: V(0, 12, -8), lookK: 0.8, tail: { up: -0.6, tip: 0.5, sway: 0.35, phase: t * 2.6 } });
    const k = E.io(seg(t, C.to2, C.so)); const pos = lv(V(15, 41, 106), V(13, 37, 97), k), tg = V(0, 12, -6);
    shoot(s.cam, pos, tg, { fov: 30, t, hand: 0.35, focus: pos.distanceTo(V(0, 12, -6)) }); pinF(s.cam, lab, 0, 0.33, 3, spring(t, C.stealing, 2, 6) * 0.8); }; });
// 11) so it sits right on it. — the cat walks onto the keyboard; the letters pour onto the screen under its paws
const ONKEYS = await makeRealCat({}), SNIFF = await makeRealCat({});
const keysPath = (sd) => ({ pos: V(52 - sd, 0, 3), yaw: Math.PI });
const keysWalk = (t) => { const d = 40 * clamp(t - C.so + 0.25, 0, 1.0) + 40 * 0.5 * clamp(t - C.so - 0.75, 0, 0.5) * (2 - clamp(t - C.so - 0.75, 0, 0.5) / 0.5) * 0.5; return Math.min(40, d); };
shot(C.so, C.and3, (s) => { deskSet(s, { hero: false }); s.scene.add(ONKEYS.root); s.ap = 6; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.36;
  s.update = (t) => { const sd = keysWalk(t), st = smooth(C.so + 1.1, C.so + 1.45, t);
    poseCat(ONKEYS, { walk: { s: sd, at: keysPath, stride: 34, settle: st }, ground: lapGround, tail: { up: -0.7, tip: 0.6, sway: 0.25, phase: t * 3 }, look: V(-40, 14, 30), lookK: 0.4 });
    s.lap.userData.screen.set({ mode: 'jjj', n: Math.max(0, Math.floor((t - C.sits + 0.05) * 170)) });
    const k = E.io(seg(t, C.so, C.and3)); const pos = lv(V(-36, 50, 70), V(-30, 44, 60), k), tg = V(0, 14, -6); shoot(s.cam, pos, tg, { fov: 32, t, hand: 0.3 }); }; });
// 12) And the keys smell like your hands. — head down, it sniffs the keys; your scent glows where your fingers go
shot(C.and3, C.so2, (s) => { deskSet(s, { hero: false }); s.scene.add(SNIFF.root); s.ap = 9; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.5; s.lap.userData.screen.set({ mode: 'jjj', n: 1400 });
  const prints = scentPrints(s.lap); s.scene.add(prints);
  s.update = (t) => { const dn = smooth(C.and3, C.smell, t);
    poseCat(SNIFF, { pos: V(12, 0, 3), yaw: Math.PI, ground: lapGround, pitch: -0.3 * dn, height: -3 * dn, look: V(-22, 1.8 + 12 * (1 - dn), 3 + 1.5 * Math.sin(t * 2.2)), lookK: 1, tail: { up: -0.7, tip: 0.6, sway: 0.2, phase: t * 3 } });
    prints.userData.update(t, smooth(C.keys - 0.2, C.smell + 0.3, t));
    const k = E.io(seg(t, C.and3, C.so2)); const pos = lv(V(-34, 15, 50), V(-27, 13, 43), k), tg = V(-11, 7, 2); shoot(s.cam, pos, tg, { fov: 30, t, hand: 0.25 }); }; });
// 13) So next time your cat lies on your keyboard, don't push it off, because — back to the opening frame (the loop)
shot(C.so2, END + 1, (s) => { deskSet(s); s.ap = 6; s.maxR = 14; s.exposure = 1.05; s.bloom = 0.34;
  s.update = (t) => { heroCam(s, t - END); }; });

// ---------- overlays used above ----------
// two comfort zones on one thermometer: you 20-25 C, cats 30-38 C (86-100 F)
function comfortHud(s) {
  const lab = liveLabel(0.9, 1.6); OV(s, lab); const c = lab.material.map.image, g = c.getContext('2d');
  lab.userData.draw = (kc, ky) => { const key = `${kc.toFixed(2)}|${ky.toFixed(2)}`; if (lab.userData.k === key) return; lab.userData.k = key; g.clearRect(0, 0, c.width, c.height);
    const x = 150, y0 = 260, y1 = c.height - 330, Tm = (T) => y1 - (T - 15) / (42 - 15) * (y1 - y0);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 5; g.beginPath(); g.roundRect(x - 28, y0 - 30, 56, y1 - y0 + 60, 28); g.fill(); g.stroke();
    g.beginPath(); g.arc(x, y1 + 50, 52, 0, 7); g.fillStyle = '#e8432f'; g.fill(); g.stroke();
    const lvl = Tm(15 + 23 * Math.max(kc, ky * 0.5)); g.fillStyle = '#e8432f'; g.fillRect(x - 16, lvl, 32, y1 + 20 - lvl);
    g.font = '800 34px "Nunito", Arial'; g.fillStyle = '#fff'; g.textAlign = 'right'; g.textBaseline = 'middle'; for (const T of [20, 25, 30, 35, 40]) { g.fillText(`${T}°`, x - 44, Tm(T)); g.fillRect(x - 36, Tm(T) - 2, 10, 4); }
    const zone = (a, b, col, txt, sub, k) => { if (k <= 0) return; g.globalAlpha = k; g.fillStyle = col; g.fillRect(x + 40, Tm(b), 22, Tm(a) - Tm(b));
      g.textAlign = 'left'; g.font = '900 72px "Nunito", Arial'; g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,0.5)'; g.strokeText(txt, x + 84, (Tm(a) + Tm(b)) / 2 - 22); g.fillStyle = col; g.fillText(txt, x + 84, (Tm(a) + Tm(b)) / 2 - 22);
      g.font = '800 44px "Nunito", Arial'; g.strokeText(sub, x + 86, (Tm(a) + Tm(b)) / 2 + 42); g.fillStyle = '#fff'; g.fillText(sub, x + 86, (Tm(a) + Tm(b)) / 2 + 42); g.globalAlpha = 1; };
    zone(30, 38, '#ff9a3c', 'CAT', '30–38 °C · 86–100 °F', kc); zone(20, 25, '#7fc8ff', 'YOU', '20–25 °C · 68–77 °F', ky);
    lab.material.map.needsUpdate = true; };
  return lab;
}
// scent prints: soft glowing fingertip whorls on the keys you use most, with wisps rising
function scentPrints(lap) {
  const g = new THREE.Group(); const [cv, cg] = mkCanvas(256, 256);
  cg.clearRect(0, 0, 256, 256); cg.strokeStyle = 'rgba(255,255,255,0.9)'; cg.lineWidth = 5;
  for (let i = 1; i < 11; i++) { cg.beginPath(); cg.ellipse(128, 132, i * 10.5, i * 12.5, 0.15, 0.2 + i * 0.07, Math.PI * 2 - 0.3); cg.stroke(); }
  const tex = texOf(cv); const mats = [];
  const keysWanted = ['A', 'S', 'D', 'F', 'Q', 'W', 'E', 'R', 'Z', 'X', 'C', 'tab', 'caps', '1', '2', '3'];
  for (const p of lap.userData.keys.filter(p => keysWanted.includes(p.k))) {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x9fffc8, toneMapped: false });
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), m); sp.rotation.x = -Math.PI / 2; sp.rotation.z = (h3(p.x, p.z, 1) - 0.5) * 0.8; sp.position.set(p.x, lap.userData.keyTop + 0.02, p.z); sp.userData.noDof = true; g.add(sp); mats.push(m);
  }
  // wisps: drifting points that rise from the keys toward the cat
  const N = 220, pg = new THREE.BufferGeometry(), pa = new Float32Array(N * 3); pg.setAttribute('position', new THREE.BufferAttribute(pa, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x9fffc8, size: 0.22, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); g.add(pts);
  const seeds = Array.from({ length: N }, (_, i) => [h3(i, 1, 2), h3(i, 3, 4), h3(i, 5, 6)]);
  g.userData.update = (t, k) => { mats.forEach((m, i) => m.opacity = k * (0.55 + 0.25 * Math.sin(t * 3 + i))); pts.material.opacity = 0.7 * k;
    seeds.forEach(([a, b, c], i) => { const u = (t * 0.35 + a) % 1; pa[i * 3] = -8 + (b - 0.5) * 10 + Math.sin(t * 2 + i) * 0.6 * u - 2 * u; pa[i * 3 + 1] = lap.userData.keyTop + u * 6; pa[i * 3 + 2] = -1 + (c - 0.5) * 8 + u * 2; });
    pg.attributes.position.needsUpdate = true; };
  return g;
}

// transitions: the thermal wipes, a push into the desert, a whip to the sunbeam
const TR = { 1: [C.its - 0.12, C.its + 0.42, 5], 4: [C.their - 0.15, C.their + 0.15, 3], 6: [C.warm2 - 0.12, C.warm2 + 0.4, 5], 7: [C.and2 - 0.12, C.and2 + 0.12, 4] };

// =====================================================================
// RENDER PIPELINE (cat shorts: the depth pass understands skinned meshes)
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
  vertexShader: `#include <common>\n#include <skinning_pars_vertex>\nvarying float vZ;\nvoid main(){\n#include <skinbase_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\n#include <project_vertex>\nvZ=-mvPosition.z;\n}`,
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
    else if(mode==5){ float ly=1.0-p*1.08+0.04; vec3 a2=texture2D(tA,uv).rgb, b2=texture2D(tB,uv).rgb; col = uv.y>ly ? b2 : a2; float gl=exp(-abs(uv.y-ly)*160.0); col += vec3(1.0,0.62,0.25)*gl*1.6 + vec3(1.0,0.85,0.6)*exp(-abs(uv.y-ly)*900.0)*2.0; }
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
