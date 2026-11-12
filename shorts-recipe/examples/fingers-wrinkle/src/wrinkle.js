// "Why Your Fingers Wrinkle In Water" — procedural 3D short, rendered frame by frame.
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
  after: 1.44, but: 3.78, yousee: 6.5, nerves: 7.3, blood: 9.04, shrink: 10.66, which: 10.98, ridges: 12.82,
  thats: 13.68, damaged: 14.74, dont: 16.2, so: 17.7, bother: 18.52, scientists: 19.36, like: 20.96,
  channeling: 22.46, grip: 24.06, inone: 25.28, faster: 27.88, wrinkled: 28.56, than: 29.36, dry: 29.78,
  whichmeans: 30.78, puttingon: 32.1, rain: 32.48, end: 34.95,
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
// SHOTS
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.01, 200) }; build(s); shots.push(s); return s; }

// 1) Hook: wrinkling fingertip, pull out to the bath and the clock -------------------
shot(0, C.but, (s) => {
  const sc = s.scene; studio(sc, { ground: -1.6, keyPos: V(4, 7, 5) });
  const tub = new THREE.Mesh(new RoundedBoxGeometry(5.4, 1.6, 2.7, 8, 0.45), M.porcelain); tub.position.y = -0.8; tub.castShadow = tub.receiveShadow = true; sc.add(tub);
  const shp = new THREE.Shape(); const w = 2.45, d = 1.1, rr = 0.5;
  shp.moveTo(-w + rr, -d); shp.lineTo(w - rr, -d); shp.quadraticCurveTo(w, -d, w, -d + rr); shp.lineTo(w, d - rr); shp.quadraticCurveTo(w, d, w - rr, d); shp.lineTo(-w + rr, d); shp.quadraticCurveTo(-w, d, -w, d - rr); shp.lineTo(-w, -d + rr); shp.quadraticCurveTo(-w, -d, -w + rr, -d);
  const water = new THREE.Mesh(new THREE.ShapeGeometry(shp, 24), M.pool); water.rotation.x = -Math.PI / 2; water.position.y = 0.012; water.receiveShadow = true; sc.add(water);
  const r = rng(3);
  for (let i = 0; i < 70; i++) { // foam
    const side = i % 2 ? 1 : -1; const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + r() * 0.13, 16, 10), M.foam);
    b.position.set(side * (1.5 + r() * 0.9), 0.02 + r() * 0.05, (r() - 0.5) * 1.9); b.scale.y = 0.6; sc.add(b);
  }
  const duck = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20), M.duck); body.scale.set(1.25, 0.8, 1); body.position.y = 0.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 20), M.duck); head.position.set(-0.32, 0.68, 0);
  const beak = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 12), M.beak); beak.scale.set(1.4, 0.45, 0.9); beak.position.set(-0.6, 0.64, 0);
  const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), M.black); eye1.position.set(-0.47, 0.76, 0.16);
  const eye2 = eye1.clone(); eye2.position.z = -0.16;
  duck.add(body, head, beak, eye1, eye2); duck.traverse(o => o.castShadow = true); duck.position.set(1.15, 0, 0.55); duck.rotation.y = -0.7; sc.add(duck);
  // clock
  const clock = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 64), M.porcelain); face.rotation.x = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.07, 16, 64), new THREE.MeshPhysicalMaterial({ color: 0x0f7fa6, roughness: 0.3, clearcoat: 1 }));
  clock.add(face, ring);
  for (let i = 0; i < 12; i++) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.035, i % 3 ? 0.07 : 0.13, 0.02), M.black); const a = i / 12 * Math.PI * 2; tk.position.set(Math.sin(a) * 0.5, Math.cos(a) * 0.5, 0.07); tk.rotation.z = -a; clock.add(tk); }
  const mk = (len, wid, col) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(wid, len, 0.02), col); m.position.y = len / 2 - 0.05; g.add(m); g.position.z = 0.09; clock.add(g); return g; };
  const hourH = mk(0.3, 0.05, M.black), minH = mk(0.44, 0.035, M.black), secH = mk(0.5, 0.015, new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), M.black); pin.rotation.x = Math.PI / 2; pin.position.z = 0.11; clock.add(pin);
  clock.position.set(1.05, 3.05, -0.9); clock.rotation.y = -0.25; clock.traverse(o => o.castShadow = true); sc.add(clock);
  // hand rising from the water
  const hand = makeHand({ forearm: 3.4 }); const HS = 0.42;
  hand.scale.setScalar(HS); hand.position.set(-0.45, 1.0, 0.35); hand.rotation.set(-0.12, 0.28, 0.06); sc.add(hand);
  const ripples = [0, 1, 2].map(() => { const m = rippleRing(); sc.add(m); return m; });
  const tipsDrops = hand.userData.fingers.map(() => { const d = dropMesh(0.035); sc.add(d); return d; });
  const heroTip = hand.userData.fingers[0].userData.tip;
  s.update = (t) => {
    const w = E.io(seg(t, 0.15, 3.2)); hand.userData.setW(w);
    secH.rotation.z = -E.io(seg(t, 1.5, 3.3)) * Math.PI * 2 * 5; minH.rotation.z = -0.4 - E.io(seg(t, 1.5, 3.3)) * Math.PI / 6; hourH.rotation.z = -2.1;
    duck.position.y = Math.sin(t * 2.2) * 0.03; duck.rotation.z = Math.sin(t * 1.7) * 0.05;
    hand.updateMatrixWorld(true);
    // ripples around the forearm
    ripples.forEach((m, i) => { const a = ((t + i * 0.6) % 1.8) / 1.8; m.position.set(-0.45, 0.02, 0.35); m.scale.setScalar(0.35 + a * 1.2); m.material.opacity = 0.55 * (1 - a); });
    // drips from each fingertip
    hand.userData.fingers.forEach((f, i) => {
      const tipW = worldOf(f.userData.tip, V(0, f.userData.tip.userData.L * 0.9, f.userData.tip.userData.r * 0.4));
      const per = 1.3, ph = ((t + i * 0.37) % per) / per, d = tipsDrops[i];
      if (ph < 0.55) { d.position.copy(tipW).add(V(0, -0.02 - ph * 0.03, 0.02)); d.scale.setScalar(0.3 + ph * 1.2); }
      else { const ft = (ph - 0.55) * per; d.position.copy(tipW).add(V(0, -0.05 - 4.9 * ft * ft, 0.02)); d.scale.set(0.9, 1.3, 0.9); }
      d.visible = d.position.y > 0.02;
    });
    const pad = worldOf(heroTip, V(0, heroTip.userData.L - heroTip.userData.r * 1.05, heroTip.userData.r * 0.95));
    const macro = pad.clone().add(V(0.06, 0.04, 0.72)), macroEnd = pad.clone().add(V(0.03, 0.02, 0.5));
    const wide = V(0.35, 2.55, 7.6), wideT = V(0.2, 1.2, 0);
    const k = E.io(seg(t, C.after, 2.3));
    const camPos = lv(lv(macro, macroEnd, E.out(seg(t, 0, C.after))), wide, k);
    const camT = lv(pad, wideT, k);
    setCam(s.cam, camPos, camT, lerp(-6 + 3 * seg(t, 0, 1.4), 2, k) + drift(t, 1.2), lerp(32, 38, k));
    if (t >= 2.16 && t < 3.06) { const c = seg(t, 2.16, 3.06); setCam(s.cam, clock.position.clone().add(V(-0.35 + 0.15 * c, 0.05, 2.1 - 0.5 * c)), clock.position, -5 + drift(t, 1.5), 36); }
    else if (t >= 3.06) { const c = seg(t, 3.06, 3.98); setCam(s.cam, V(2.6 - 0.3 * c, 0.95, 4.4 - 0.4 * c), V(-0.25, 1.15, 0.2), 3 + drift(t, 1.5), 38); }
  };
});

// 2) "but it's not just because they're soaking up water" ----------------------------
shot(C.but, C.yousee, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(-3, 5, 4) });
  const f = makeFinger({ r: 0.5, lens: [1.6, 1.3, 1.55], curls: [0, 0.05, 0.05], mat: M.skin(), tipOpts: { radial: 288, rings: 200, seed: 4 } });
  f.position.set(0, -2.4, 0); f.rotation.x = -0.25; sc.add(f); f.userData.tip.userData.setW(1);
  f.updateMatrixWorld(true);
  const tip = f.userData.tip;
  const padAt = (yy, xx) => worldOf(tip, V(xx, yy, Math.sqrt(Math.max(0.25 * 0.9 * 0.9 - xx * xx, 0.01)) * 1.0));
  const r = rng(11), drops = [];
  for (let i = 0; i < 11; i++) {
    const hit = padAt(0.55 + r() * 0.75, (r() - 0.5) * 0.55);
    const from = hit.clone().add(V((r() - 0.5) * 1.2, 2.6 + r(), 1.4 + r() * 0.8));
    const th = C.but + 0.15 + i * 0.22 + r() * 0.1, soak = (i === 3 || i === 7);
    const out = V((r() - 0.5) * 1.6, 0.9 + r() * 0.6, 1.2 + r() * 0.6);
    const m = dropMesh(0.075 + r() * 0.03); sc.add(m);
    const sp = [0, 1, 2, 3].map(() => { const q = dropMesh(0.025); sc.add(q); return q; });
    drops.push({ hit, from, th, soak, out, m, sp, seed: r() * 6 });
  }
  s.update = (t) => {
    for (const d of drops) {
      const a = t - d.th;
      if (a < -0.45) { d.m.visible = false; d.sp.forEach(q => q.visible = false); continue; }
      d.m.visible = true;
      if (a < 0) { const k = 1 + a / 0.45; d.m.position.copy(lv(d.from, d.hit, k * k)); d.m.scale.set(0.85, 1.25, 0.85); }
      else if (d.soak) { const k = clamp(a / 0.35); d.m.position.copy(d.hit).add(V(0, -k * 0.08, -k * 0.03)); d.m.scale.set(1.3 * (1 - k), 0.5 * (1 - k), 1.3 * (1 - k)); d.m.visible = k < 1; }
      else { d.m.position.copy(d.hit).add(d.out.clone().multiplyScalar(a)).add(V(0, -4.9 * a * a, 0)); const sq = Math.exp(-a * 18); d.m.scale.set(1 + 0.6 * sq, 1 - 0.5 * sq, 1 + 0.6 * sq); }
      d.sp.forEach((q, j) => { if (a < 0 || a > 0.5) { q.visible = false; return; } q.visible = true; const ang = d.seed + j * 1.57; q.position.copy(d.hit).add(V(Math.cos(ang) * a * 1.6, a * 1.4 - 4.9 * a * a, Math.sin(ang) * a * 0.8 + a * 0.6)); });
    }
    const c = padAt(1.05, 0); const B = t >= 5.16;
    const ang = B ? lerp(0.85, 0.6, seg(t, 5.16, C.yousee)) : lerp(-0.4, -0.1, E.io(seg(t, C.but, 5.16)));
    const rad = (B ? lerp(1.9, 1.6, seg(t, 5.16, 6.0)) : lerp(3.0, 2.6, seg(t, C.but, 5.16))) * lerp(1, 0.12, E.in(seg(t, 6.05, C.yousee + 0.12)));
    const pos = c.clone().add(V(Math.sin(ang) * rad, (B ? -0.1 : 0.35) * rad / 3, Math.cos(ang) * rad));
    setCam(s.cam, pos, c, drift(t, 2), 36);
  };
});

// 3) X-ray hand: nerve signal, vessels shrink ------------------------------------------
let xrayHandRef = null;
shot(C.yousee, C.which, (s) => {
  const sc = s.scene; sc.background = BG.xray;
  const xm = xrayMat();
  const hand = makeHand({ mat: xm, curls: [[0, 0, 0], [0, 0.02, 0], [0, 0.02, 0], [0, 0.04, 0]], heroRadial: 96, forearm: 3.0 });
  hand.traverse(o => { if (o.isMesh && o.material === M.nail) o.material = xrayMat(new THREE.Color(0.6, 0.9, 1), new THREE.Color(0.1, 0.3, 0.6), 1.5, 0.8); });
  sc.add(hand); xrayHandRef = hand;
  const boneM = glow(0xbfe6ff, 0.35);
  const bone = (a, b, r) => { const d = b.clone().sub(a); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 16), boneM); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); sc.add(m); };
  const fx = [-0.64, -0.21, 0.22, 0.63], fl = [[0.86, 0.55, 0.64], [0.95, 0.6, 0.66], [0.88, 0.56, 0.63], [0.68, 0.43, 0.54]];
  fx.forEach((x, i) => { bone(V(x * 0.55, 0.25, 0), V(x, 1.75, 0), 0.075); let y = 1.95; fl[i].forEach((L, j) => { bone(V(x, y + 0.08, 0), V(x, y + L - (j === 2 ? 0.25 : 0.08), 0), 0.06 - j * 0.008); y += L; }); });
  bone(V(-0.25, -2.8, 0), V(-0.3, 0.1, 0), 0.09); bone(V(0.28, -2.8, 0), V(0.3, 0.1, 0), 0.08);
  bone(V(-0.8, 0.45, 0.15), V(-1.15, 1.05, 0.25), 0.07);
  // nerve to the index fingertip
  const nerveCurve = new THREE.CatmullRomCurve3([V(0.1, -2.9, 0.3), V(0.05, -0.6, 0.32), V(-0.1, 0.5, 0.36), V(-0.45, 1.4, 0.34), V(-0.64, 2.2, 0.22), V(-0.64, 3.0, 0.2), V(-0.64, 3.55, 0.19), V(-0.64, 3.9, 0.15)]);
  const nerveM = pulseTubeMat(0xffd84a, 0xfff6c0); const nerve = new THREE.Mesh(new THREE.TubeGeometry(nerveCurve, 200, 0.035, 10), nerveM); sc.add(nerve);
  [-0.21, 0.22, 0.63].forEach((x, i) => { const cc = new THREE.CatmullRomCurve3([V(-0.1, 0.5, 0.36), V(x * 0.7, 1.3, 0.33), V(x, 2.2, 0.22), V(x, 3.2 - (i === 2 ? 0.6 : 0), 0.18)]); sc.add(new THREE.Mesh(new THREE.TubeGeometry(cc, 80, 0.02, 8), pulseTubeMat(0xc9a640, 0xfff6c0))); });
  // blood vessels (rebuilt when they shrink)
  const vesselCurves = fx.map((x, i) => new THREE.CatmullRomCurve3([V(0, -2.9, 0.2), V(0.02, 0.3, 0.26), V(x * 0.6, 1.1, 0.24), V(x, 2.0, 0.14), V(x, 2.0 + fl[i][0] + fl[i][1], 0.12), V(x, 1.95 + fl[i][0] + fl[i][1] + fl[i][2] - 0.22, 0.1)]));
  const vM = pulseTubeMat(0xff2a3a, 0xffb0b0); vM.uniforms.k.value = 0.8;
  const vessels = vesselCurves.map(c => { const m = new THREE.Mesh(new THREE.TubeGeometry(c, 120, 0.06, 10), vM); sc.add(m); return m; });
  let lastR = 0.06;
  // dust specks for depth
  const r = rng(21), dustM = glow(0x9fd8ff, 0.35);
  for (let i = 0; i < 90; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.012 + r() * 0.02, 8, 6), dustM); d.position.set((r() - 0.5) * 9, -3 + r() * 9, -3 - r() * 5); sc.add(d); }
  s.update = (t) => {
    nerveM.uniforms.p.value = lerp(-0.1, 1.08, seg(t, C.nerves - 0.1, C.blood - 0.15));
    nerveM.uniforms.k.value = 0.55 + 0.6 * smooth(C.blood - 0.4, C.blood, t) * (0.5 + 0.5 * Math.sin(t * 18));
    vM.uniforms.p.value = ((t - C.blood) * 0.9) % 1.2;
    const rr = lerp(0.06, 0.028, E.io(seg(t, C.shrink - 0.05, C.which + 0.1)));
    if (Math.abs(rr - lastR) > 0.0008) { lastR = rr; vessels.forEach((m, i) => { m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(vesselCurves[i], 120, i === 0 ? rr * 1.15 : rr, 10); }); }
    // camera: from the fingertip, out to the whole hand, then toward the index finger
    const tipP = V(-0.64, 3.75, 0.25);
    const p0 = tipP.clone().add(V(0.0, 0.05, 0.55)), p1 = V(0.6, 0.9, 10.2), p2 = V(-0.2, 2.75, 4.4);
    const t0 = tipP, t1 = V(0, 1.0, 0), t2 = V(-0.5, 2.85, 0);
    const k1 = E.io(seg(t, C.yousee, C.nerves + 0.45));
    if (t < C.blood) setCam(s.cam, lv(p0, p1, k1).add(V(0, 0, -0.5 * seg(t, C.nerves + 0.45, C.blood))), lv(t0, t1, k1), drift(t, 2.2) - 3, 36);
    else { const c = E.out(seg(t, C.blood, C.which + 0.2)); setCam(s.cam, lv(V(-4.2, 3.7, 5.6), V(-3.1, 3.4, 4.3), c), V(-0.45, 2.5, 0), 6 + drift(t, 2), 36); }
  };
});

// 4) Cross-section: skin pulled into ridges --------------------------------------------
shot(C.which, C.thats, (s) => {
  const sc = s.scene; studio(sc, { ground: -0.6, keyPos: V(2, 6, 6), shadow: 0.16 });
  const R = 0.95, L = 3.2, grooves = [1.55, 1.85, 2.15, 2.45, 2.72, 2.95];
  const rad = (y) => y < L - R ? R * (1 - 0.03 * y / L) : Math.sqrt(Math.max(R * R - Math.pow(y - (L - R), 2), 0)) * 0.97;
  const pull = (y, w) => grooves.reduce((a, g) => a + Math.exp(-Math.pow((y - g) / 0.07, 2)), 0) * 0.12 * w;
  function outline(w, inset = 0, padOnly = true) {
    const sh = new THREE.Shape(), N = 160; const pts = [];
    for (let i = 0; i <= N; i++) { const y = L * i / N; const rr = Math.max(rad(y) - inset, 0); const px = rr - pull(y, w) * (inset > 0 ? 0.8 : 1); pts.push([Math.max(px, 0.0), y]); }
    for (let i = N; i >= 0; i--) { const y = L * i / N; const rr = Math.max(rad(y) - inset, 0); pts.push([-rr, y]); }
    const valid = pts.filter(p => p[1] <= L - inset * 0.9);
    sh.moveTo(valid[0][0], valid[0][1]); valid.slice(1).forEach(p => sh.lineTo(p[0], p[1])); return sh;
  }
  const grp = new THREE.Group(); sc.add(grp); grp.position.y = -0.5;
  const skinM = M.skin(), derM = new THREE.MeshPhysicalMaterial({ color: 0xf28e8a, roughness: 0.5, clearcoat: 0.3 }), fatM = new THREE.MeshPhysicalMaterial({ color: 0xffd36e, roughness: 0.55, clearcoat: 0.2 }), boneM = new THREE.MeshPhysicalMaterial({ color: 0xf6f1e4, roughness: 0.4, clearcoat: 0.3 }), vesM = new THREE.MeshPhysicalMaterial({ color: 0xd8192b, roughness: 0.3, clearcoat: 0.8, emissive: 0x500006 });
  const slab = new THREE.Mesh(new THREE.BufferGeometry(), skinM); slab.castShadow = true; grp.add(slab);
  const der = new THREE.Mesh(new THREE.BufferGeometry(), derM), fat = new THREE.Mesh(new THREE.BufferGeometry(), fatM); grp.add(der, fat);
  const boneShape = new THREE.Shape(); boneShape.absarc(-0.12, 0.6, 0.2, Math.PI, 0, true); boneShape.lineTo(0.08, 2.35); boneShape.quadraticCurveTo(0.1, 2.65, -0.12, 2.68); boneShape.quadraticCurveTo(-0.34, 2.65, -0.32, 2.35); boneShape.lineTo(-0.32, 0.6);
  const bone = new THREE.Mesh(new THREE.ShapeGeometry(boneShape, 24), boneM); bone.position.z = 0.468; grp.add(bone);
  const nailShape = new THREE.Shape(); nailShape.moveTo(-R - 0.02, 2.25); nailShape.quadraticCurveTo(-R - 0.09, 2.7, -0.7, 3.12); nailShape.lineTo(-0.62, 3.05); nailShape.quadraticCurveTo(-R + 0.06, 2.65, -R + 0.05, 2.25);
  const nail = new THREE.Mesh(new THREE.ExtrudeGeometry(nailShape, { depth: 0.42, bevelEnabled: false }), M.nail); nail.position.z = -0.01; grp.add(nail);
  const vesY = [1.4, 1.7, 2.0, 2.3, 2.6, 2.85], vessels = vesY.map(y => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), vesM); grp.add(m); return { m, y }; });
  const arrowM = new THREE.MeshPhysicalMaterial({ color: 0x29d3ff, emissive: 0x0a90c0, roughness: 0.3, clearcoat: 1 });
  const arrows = grooves.map(y => { const a = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 16), arrowM); shaft.position.y = 0.18; const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 20), arrowM); head.position.y = -0.05; head.rotation.x = Math.PI; a.add(shaft, head); a.rotation.z = -Math.PI / 2; grp.add(a); return { a, y }; });
  let lastW = -1;
  s.update = (t) => {
    const w = E.io(seg(t, C.which + 0.25, C.ridges + 0.1));
    if (Math.abs(w - lastW) > 0.004) {
      lastW = w;
      slab.geometry.dispose(); slab.geometry = new THREE.ExtrudeGeometry(outline(w), { depth: 0.4, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 5, curveSegments: 8, steps: 1 });
      der.geometry.dispose(); der.geometry = new THREE.ShapeGeometry(outline(w, 0.09), 12); der.position.z = 0.462;
      fat.geometry.dispose(); fat.geometry = new THREE.ShapeGeometry(outline(w, 0.26), 12); fat.position.z = 0.465;
    }
    const vs = lerp(1, 0.45, w);
    vessels.forEach(v => { v.m.position.set(rad(v.y) - 0.2 - pull(v.y, w) * 0.8, v.y, 0.471); v.m.scale.setScalar(vs * (1 + 0.06 * Math.sin(t * 9 + v.y * 4))); });
    arrows.forEach((o, i) => { const k = E.out(seg(t, C.which + 0.3 + i * 0.07, C.which + 0.6 + i * 0.07)); o.a.position.set(rad(o.y) + 0.36 - pull(o.y, w) + 0.06 * Math.sin(t * 8 + i), o.y, 0.47); o.a.scale.setScalar(0.001 + k * (1 + 0.08 * Math.sin(t * 10 + i))); });
    const ang = lerp(0.3, -0.18, E.io(seg(t, C.which, C.thats + 0.2))), d = lerp(9.4, 8.2, seg(t, C.which, C.thats));
    const tg = V(0.2, 1.15, 0.3);
    setCam(s.cam, tg.clone().add(V(Math.sin(ang) * d, 0.5, Math.cos(ang) * d)), tg, drift(t, 1.5) + 2, 36);
  };
});

// 5) Damaged nerve: no wrinkles --------------------------------------------------------
shot(C.thats, C.so, (s) => {
  const sc = s.scene; studio(sc, { ground: -1.0, keyPos: V(3, 6, 5), shadow: 0.2 });
  const mk = (x, seed) => { const f = makeFinger({ r: 0.42, lens: [1.4, 1.1, 1.3], curls: [0, 0.04, 0.04], mat: M.skin(), tipOpts: { radial: 224, rings: 170, seed } }); f.position.set(x, -1.0, 0); sc.add(f); return f; };
  const left = mk(-0.78, 2), right = mk(0.78, 5);
  left.userData.tip.userData.setW(1); right.userData.tip.userData.setW(0);
  const rightMats = []; right.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; rightMats.push(o.material); } });
  const nM = pulseTubeMat(0xffd84a, 0xfff6c0);
  const n1 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.78, -1.0, 0.1), V(0.78, 0.4, 0.12), V(0.78, 1.25, 0.12)]), 60, 0.045, 10), nM);
  const n2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.8, 1.55, 0.12), V(0.79, 2.4, 0.14), V(0.78, 3.3, 0.16)]), 60, 0.045, 10), pulseTubeMat(0x6b5a2a, 0x6b5a2a));
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), glow(0xff3344, 0.9)); spark.position.set(0.79, 1.4, 0.12);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 48), glow(0xff3344, 0.8)); ring.position.copy(spark.position);
  sc.add(n1, n2, spark, ring);
  const dl = dropMesh(0.05), dr = dropMesh(0.05); sc.add(dl, dr);
  s.update = (t) => {
    const k = E.io(seg(t, C.damaged - 0.15, C.damaged + 0.45));
    rightMats.forEach(m => { m.opacity = lerp(1, 0.38, k); m.depthWrite = k < 0.5; });
    [n1, n2, spark, ring].forEach(m => m.visible = k > 0.02);
    nM.uniforms.fade.value = k; n2.material.uniforms.fade.value = k * 0.5; nM.uniforms.p.value = ((t * 0.9) % 1.3) - 0.1;
    spark.material.opacity = k * (0.5 + 0.5 * Math.abs(Math.sin(t * 11))); spark.scale.setScalar(0.7 + 0.3 * Math.sin(t * 13));
    const rk = ((t * 1.4) % 1); ring.scale.setScalar(0.6 + rk * 1.4); ring.material.opacity = k * (1 - rk);
    [[dl, -0.78, 0], [dr, 0.78, 0.5]].forEach(([d, x, o]) => { const ph = ((t + o) % 1.1) / 1.1; d.position.set(x, 3.35 - (ph < 0.4 ? 0 : 9 * Math.pow(ph - 0.4, 2)), 0.1); d.position.y -= 0.0; d.visible = ph > 0.05 && d.position.y > -1; d.position.set(x + 0.05, 3.32 - (ph < 0.4 ? ph * 0.1 : 0.04 + 9 * Math.pow(ph - 0.4, 2)), 0.32); });
    const slide = E.io(seg(t, C.thats, C.thats + 1.1));
    if (t < 15.56) { const pos = lv(V(-1.9, 2.3, 4.6), V(0.25, 2.4, 7.9), slide), tg = lv(V(-0.7, 1.5, 0), V(0.05, 1.3, 0), slide); setCam(s.cam, pos, tg, drift(t, 1.8), 38); }
    else { const c = seg(t, 15.56, C.so); setCam(s.cam, lv(V(2.3, 2.3, 3.3), V(1.75, 2.0, 2.4), c), V(0.75, 1.75, 0.1), -4 + drift(t, 1.8), 38); }
  };
});

// 6) Crash zoom onto the ridges, "why would your body bother?" ------------------------
shot(C.so, C.like + 0.4, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(4, 4, 3), key: 2.8 });
  const f = makeFinger({ r: 0.5, lens: [1.6, 1.3, 1.55], curls: [0, 0.03, 0.02], mat: M.skin(), tipOpts: { radial: 320, rings: 220, seed: 4 } });
  f.position.set(0, -2.3, 0); sc.add(f); f.userData.tip.userData.setW(1);
  const tip = f.userData.tip;
  s.update = (t) => {
    const wob = Math.sin(seg(t, C.bother - 0.2, C.bother + 0.6) * Math.PI * 3) * 0.12 * (1 - seg(t, C.bother - 0.2, C.bother + 0.6));
    f.rotation.set(-0.1, 0, wob); f.updateMatrixWorld(true);
    const pad = worldOf(tip, V(0, tip.userData.L - 0.55, 0.48));
    const crash = E.expo(seg(t, C.so, C.so + 0.4));
    if (t < C.scientists) { const d = lerp(6.5, 1.7, crash) - 0.3 * seg(t, C.so + 0.4, C.scientists); setCam(s.cam, pad.clone().add(V(0.08 * d, 0.06 * d, d)), pad, drift(t, 1.5) + lerp(-8, 0, crash), 36); }
    else { const c = E.io(seg(t, C.scientists, C.like + 0.3)); const a = lerp(1.0, 0.08, c), d = lerp(1.5, 0.75, c); setCam(s.cam, pad.clone().add(V(Math.sin(a) * d, 0.05 * d, Math.cos(a) * d)), pad, drift(t, 1.5), 36); }
  };
});

// 7) Tyre tread on a wet road --------------------------------------------------------
shot(C.like, C.inone, (s) => {
  const sc = s.scene; const key = studio(sc, { ground: null, keyPos: V(5, 7, 4), area: 6 });
  // road
  const rc = document.createElement('canvas'); rc.width = 512; rc.height = 2048; const g = rc.getContext('2d');
  g.fillStyle = '#2a2f35'; g.fillRect(0, 0, 512, 2048); const r = rng(5);
  for (let i = 0; i < 26000; i++) { const v = 30 + r() * 40; g.fillStyle = `rgb(${v},${v + 3},${v + 7})`; g.fillRect(r() * 512, r() * 2048, 2, 2); }
  g.fillStyle = '#e8e6dc'; for (let y = 0; y < 2048; y += 512) g.fillRect(420, y, 26, 300);
  const roadTex = new THREE.CanvasTexture(rc); roadTex.colorSpace = THREE.SRGBColorSpace; roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(1, 3);
  roadTex.repeat.set(12, 30);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9, metalness: 0, envMapIntensity: 0.08 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -20); sc.fog = new THREE.Fog(0x2bb9e6, 14, 48); road.receiveShadow = true; sc.add(road);
  const puddles = [];
  for (let i = 0; i < 8; i++) { const p = new THREE.Mesh(new THREE.CircleGeometry(0.5 + r() * 0.7, 40), M.pool); p.rotation.x = -Math.PI / 2; p.scale.y = 1.6; p.userData = { x: (r() - 0.5) * 2.4, z0: -i * 3.4 }; p.position.y = 0.005; sc.add(p); puddles.push(p); }
  // tyre (lathe around Y, then turned so the axle is X)
  const pts = []; const push = (x, y) => pts.push(new THREE.Vector2(x, y));
  push(0.62, -0.34); push(0.8, -0.37); for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i / 8 * Math.PI / 2; push(0.93 + 0.07 * Math.cos(a), -0.3 + 0.07 * Math.sin(a)); }
  for (let i = 1; i < 70; i++) push(1.0, -0.3 + 0.6 * i / 70);
  for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; push(0.93 + 0.07 * Math.cos(a), 0.3 + 0.07 * Math.sin(a)); } push(0.8, 0.37); push(0.62, 0.34);
  const tg = new THREE.LatheGeometry(pts, 420); tg.computeVertexNormals();
  { const p = tg.attributes.position, n = tg.attributes.normal;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rr = Math.hypot(x, z); if (rr < 0.995 || Math.abs(y) > 0.3) continue;
      const ph = Math.atan2(x, z), u = ph * 46 / (2 * Math.PI); const chev = ((u + 2.6 * Math.abs(y)) % 1 + 1) % 1;
      const gC = Math.exp(-Math.pow(Math.min(chev, 1 - chev) / 0.09, 2)) * (Math.abs(y) > 0.05 ? 1 : 0.2), gM = Math.max(Math.exp(-Math.pow((Math.abs(y) - 0.15) / 0.022, 2)), 0);
      const d = -0.05 * Math.max(gC, gM); p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d); }
    tg.computeVertexNormals(); }
  const tyre = new THREE.Group(); const tm = new THREE.Mesh(tg, M.rubber); tm.castShadow = true; tyre.add(tm);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.63, 0.6, 64, 1, true), M.chrome); tyre.add(rim);
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 64), new THREE.MeshPhysicalMaterial({ color: 0xb8c3ca, roughness: 0.25, metalness: 1 })); tyre.add(disk);
  for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.9), M.chrome); sp.position.y = 0.27; sp.rotation.y = i / 5 * Math.PI * 2; sp.position.x = Math.sin(i / 5 * Math.PI * 2) * 0.3; sp.position.z = Math.cos(i / 5 * Math.PI * 2) * 0.3; tyre.add(sp); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.64, 32), M.chrome); tyre.add(hub);
  const axle = new THREE.Group(); axle.add(tyre); axle.rotation.z = Math.PI / 2; axle.position.set(0, 1.0, 0); sc.add(axle);
  // spray
  const N = 260, spray = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 10, 8), M.water, N); sc.add(spray);
  const sr = rng(9), P = []; for (let i = 0; i < N; i++) P.push({ b: i / N, side: sr() < 0.5 ? -1 : 1, vx: 1.2 + sr() * 2.2, vy: 1.4 + sr() * 2.4, vz: 0.4 + sr() * 1.6, s: 0.5 + sr() });
  const dummy = new THREE.Object3D();
  const speed = 5.2;
  s.update = (t) => {
    const lt = t - C.like, dist = speed * Math.max(lt, 0);
    tyre.rotation.y = -dist / 1.0;
    roadTex.offset.y = dist / 120 * 30; // road texture scrolls toward camera
    puddles.forEach(p => { const z = ((p.userData.z0 + dist) % 27) - 20 + 6; p.position.set(p.userData.x, 0.005, z); });
    const on = smooth(C.like + 0.5, C.channeling, t);
    for (let i = 0; i < N; i++) {
      const q = P[i], age = ((lt * 1.0 + q.b) % 1.0) * 0.9;
      dummy.position.set(q.side * (0.32 + q.vx * age), 0.03 + q.vy * age - 4.9 * age * age, -0.85 - q.vz * age * 2.2);
      const sc_ = on * q.s * (1 - age / 0.9); dummy.scale.setScalar(Math.max(sc_, 0.0001)); dummy.updateMatrix(); spray.setMatrixAt(i, dummy.matrix);
    }
    spray.instanceMatrix.needsUpdate = true;
    const k = E.io(seg(t, C.like + 0.15, C.channeling + 0.2));
    const p0 = V(0.0, 1.12, 1.62), t0 = V(0, 1.0, 0.9);
    const p1 = V(2.9, 0.75, 3.6), t1 = V(-0.1, 0.65, -0.6);
    const p2 = V(2.2, 0.55, 2.7), t2 = V(0, 0.45, -0.9);
    if (t < 23.48) setCam(s.cam, lv(p0, p1, k), lv(t0, t1, k), lerp(90, 0, E.io(seg(t, C.like, C.like + 1.1))) + drift(t, 2), 38);
    else { const c = seg(t, 23.48, C.inone + 0.2); setCam(s.cam, lv(V(-1.6, 0.28, 2.2), V(-1.3, 0.3, 1.8), c), V(0.1, 0.35, -0.5), -3 + drift(t, 2), 38); }
  };
});

// 8) Wet marbles race: two lanes side by side, near bowl -> far bowl -----------------
shot(C.inone, C.whichmeans, (s) => {
  const sc = s.scene; studio(sc, { ground: null, keyPos: V(3, 9, 4), area: 5 });
  const table = new THREE.Mesh(new RoundedBoxGeometry(4.8, 0.4, 7.2, 6, 0.15), new THREE.MeshPhysicalMaterial({ color: 0xf2dcbc, roughness: 0.5, clearcoat: 0.4 })); table.position.set(0, -0.2, -0.3); table.receiveShadow = true; sc.add(table);
  const bowlPts = [[0.0, 0.0], [0.38, 0.0], [0.58, 0.08], [0.72, 0.24], [0.78, 0.44], [0.74, 0.46], [0.68, 0.27], [0.55, 0.13], [0.36, 0.06], [0.0, 0.06]].map(p => new THREE.Vector2(p[0], p[1]));
  const bowlG = new THREE.LatheGeometry(bowlPts, 64); const bowlM = M.porcelain.clone(); bowlM.side = THREE.DoubleSide;
  const marbleCols = [0xff4d6d, 0x3ec1ff, 0x7bd96b, 0xffc93c, 0xb36bff, 0xff8a3c, 0x2ee6c6, 0xff6bd6, 0x5c7cff, 0xffe066];
  const NEAR = 1.35, FAR = -1.35;
  const lanes = [{ x: -0.9, every: 0.62, wr: 1, slip: -1 }, { x: 0.9, every: 1.15, wr: 0, slip: 2 }];
  const stopTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, t }; })();
  const sw = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 64), new THREE.MeshPhysicalMaterial({ color: 0xff5a36, roughness: 0.3, clearcoat: 1 })); body.rotation.x = Math.PI / 2;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.36), new THREE.MeshBasicMaterial({ map: stopTex.t, toneMapped: false })); scr.position.z = 0.12;
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 24), M.chrome); btn.position.y = 0.62;
  sw.add(body, scr, btn); sw.position.set(0, 0.7, -3.0); sw.rotation.x = -0.25; sw.traverse(o => o.castShadow = true); sc.add(sw);
  lanes.forEach((ln, li) => {
    [NEAR, FAR].forEach(z => { const b = new THREE.Mesh(bowlG, bowlM); b.position.set(ln.x, 0, z); b.castShadow = b.receiveShadow = true; sc.add(b); });
    const wat = new THREE.Mesh(new THREE.CircleGeometry(0.7, 48), M.pool); wat.rotation.x = -Math.PI / 2; wat.position.set(ln.x, 0.33, NEAR); sc.add(wat);
    const r = rng(40 + li);
    ln.marbles = marbleCols.map((c, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 18), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 })); m.castShadow = true; sc.add(m);
      const a = r() * 6.28, rr = Math.sqrt(r()) * 0.4; m.userData.home = V(ln.x + Math.cos(a) * rr, 0.15 + (i % 3) * 0.05, NEAR + Math.sin(a) * rr);
      const a2 = r() * 6.28, r2 = Math.sqrt(r()) * 0.38; m.userData.dest = V(ln.x + Math.cos(a2) * r2, 0.15 + (i % 3) * 0.05, FAR + Math.sin(a2) * r2); return m; });
    const hand = makeHand({ forearm: 2.4, heroRadial: 160, curls: [[0.45, 0.45, 0.2], [1.3, 1.4, 1.0], [1.35, 1.45, 1.0], [1.4, 1.5, 1.0]],
      thumb: { pos: V(-0.8, 0.6, 0.3), rot: new THREE.Euler(0.9, -0.2, 0.35), curls: [0.25, 0.25, 0.15] } });
    hand.userData.setW(ln.wr); hand.scale.setScalar(0.27); sc.add(hand); ln.hand = hand;
    ln.drop = dropMesh(0.03); sc.add(ln.drop);
  });
  const bezier = (a, b, h, k) => { const m = lv(a, b, 0.5).add(V(0, h, 0)); return lv(lv(a, m, k), lv(m, b, k), k); };
  s.update = (t) => {
    const lt = Math.max(t - C.inone - 0.25, 0);
    lanes.forEach((ln) => {
      const n = Math.floor(lt / ln.every), ph = (lt % ln.every) / ln.every;
      ln.marbles.forEach((m, i) => { m.position.copy(i < n && i !== ln.slip ? m.userData.dest : m.userData.home); });
      const mi = Math.min(n, 9), m = ln.marbles[mi], nxt = ln.marbles[Math.min(mi + 1, 9)];
      const grab = m.userData.home.clone().add(V(0, 0.14, 0)), drop = m.userData.dest.clone().add(V(0, 0.45, 0));
      let tipPos;
      if (ph < 0.25) tipPos = lv(grab.clone().add(V(0, 0.8, 0)), grab, E.io(ph / 0.25));
      else if (ph < 0.7) tipPos = bezier(grab, drop, 0.9, E.io((ph - 0.25) / 0.45));
      else tipPos = lv(drop, nxt.userData.home.clone().add(V(0, 0.94, 0)), E.io((ph - 0.7) / 0.3));
      const slipping = (mi === ln.slip);
      if (ph >= 0.25 && ph < 0.7) {
        if (slipping && ph > 0.42) { const k = (ph - 0.42) * ln.every; const sp = bezier(grab, drop, 0.9, E.io(0.17 / 0.45)); m.position.copy(sp).add(V(0, -0.11 - 4.9 * k * k, 0)); if (m.position.y < 0.16) m.position.copy(m.userData.home); }
        else m.position.copy(tipPos).add(V(0, -0.11, 0));
      } else if (ph >= 0.7 && !slipping) { const k = (ph - 0.7) * ln.every; m.position.copy(m.userData.dest).add(V(0, Math.max(0.33 - 4.9 * k * k, 0) + Math.abs(Math.sin(k * 14)) * 0.05 * Math.exp(-k * 6), 0)); }
      const h = ln.hand; h.rotation.set(Math.PI - 0.55, 0, 0); h.position.set(0, 0, 0); h.updateMatrixWorld(true);
      const ti = h.userData.fingers[0].userData.tip; const local = worldOf(ti, V(0, ti.userData.L * 0.9, 0.1));
      h.position.copy(tipPos.clone().sub(local)); h.updateMatrixWorld(true);
      const dp = ((t * 1.3 + ln.x) % 1); ln.drop.position.copy(tipPos).add(V(0.03, -0.12 - 2.5 * dp * dp, 0.03)); ln.drop.visible = ln.drop.position.y > 0.05;
    });
    const el = Math.max(t - C.inone, 0), g = stopTex.c.getContext('2d');
    g.fillStyle = '#0d1a14'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#7dffb0'; g.font = 'bold 74px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(`${String(Math.floor(el)).padStart(2, '0')}.${String(Math.floor((el % 1) * 100)).padStart(2, '0')}`, 128, 68); stopTex.t.needsUpdate = true;
    const k1 = t >= C.faster ? 1 : 0, k2 = t >= C.than ? 1 : 0, pz = V(0, -0.35 * (t >= C.than ? seg(t, C.than, C.whichmeans) : t >= C.faster ? seg(t, C.faster, C.than) : seg(t, C.inone, C.faster)), -0.3 * (t >= C.faster ? 1 : 0));
    const pW = V(0, 7.0, 5.9), tW = V(0, 0.15, 0.25);
    const pA = V(-0.9, 5.0, 4.4), tA = V(-0.9, 0.3, 0.15);
    const pB = V(0.9, 5.0, 4.4), tB = V(0.9, 0.3, 0.15);
    setCam(s.cam, lv(lv(pW, pA, k1), pB, k2).add(pz), lv(lv(tW, tA, k1), tB, k2), drift(t, 1.6), 38);
  };
});

// 9) Payoff: thumbs up in the rain, the thumb grows tyre treads -----------------------
shot(C.whichmeans, C.end + 0.2, (s) => {
  const sc = s.scene; studio(sc, { bg: 'storm', ground: -2.2, keyPos: V(3, 7, 6), shadow: 0.22 });
  const hand = makeHand({ forearm: 3.2, heroRadial: 128, curls: [[1.45, 1.55, 1.1], [1.5, 1.6, 1.1], [1.5, 1.6, 1.1], [1.45, 1.55, 1.1]],
    thumb: { pos: V(-0.85, 0.7, 0.3), rot: new THREE.Euler(0.0, -0.15, 1.5), curls: [0.0, 0.0, 0.0], tipOpts: { pattern: 'tread', radial: 320, rings: 230, amp: 0.13 } } });
  hand.rotation.set(0, -0.35, -Math.PI / 2); hand.position.set(-0.75, 0.2, 0); sc.add(hand);
  const thumbTip = hand.userData.thumb.userData.tip;
  // cloud
  const cloud = new THREE.Group(); const cm = new THREE.MeshPhysicalMaterial({ color: 0xf4f8fa, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color(0xffffff) }); const r = rng(77);
  for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.45 + r() * 0.4, 28, 18), cm); b.position.set((r() - 0.5) * 2.6, (r() - 0.5) * 0.4, (r() - 0.5) * 1.0); cloud.add(b); }
  cloud.position.set(0.0, 5.2, -0.4); sc.add(cloud);
  const N = 220, rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), new THREE.MeshPhysicalMaterial({ color: 0xd8f4ff, roughness: 0.05, transparent: true, opacity: 0.75 }), N); sc.add(rain);
  const R = []; for (let i = 0; i < N; i++) R.push({ x: (r() - 0.5) * 3.2, z: (r() - 0.5) * 1.6, o: r() });
  const splash = [0, 1, 2, 3, 4, 5].map(() => { const d = dropMesh(0.035); sc.add(d); return d; });
  const dummy = new THREE.Object3D();
  s.update = (t) => {
    thumbTip.userData.setW(E.io(seg(t, C.puttingon - 0.4, C.rain + 0.5)));
    hand.rotation.z = -Math.PI / 2 + Math.sin(seg(t, C.whichmeans, C.whichmeans + 0.6) * Math.PI) * 0.12;
    hand.updateMatrixWorld(true);
    for (let i = 0; i < N; i++) { const q = R[i], y = 4.8 - (((t * 1.6 + q.o) % 1) * 7.5); dummy.position.set(cloud.position.x + q.x, y, cloud.position.z + q.z); dummy.scale.setScalar(y > -2.2 ? 1 : 0.0001); dummy.updateMatrix(); rain.setMatrixAt(i, dummy.matrix); }
    rain.instanceMatrix.needsUpdate = true;
    const pad = worldOf(thumbTip, V(0, thumbTip.userData.L - 0.3, 0.25));
    splash.forEach((d, i) => { const a = ((t * 2.2 + i / 6) % 1) * 0.5; const ang = i * 1.05; d.position.copy(pad).add(V(0, 0.25, 0)).add(V(Math.cos(ang) * a * 1.4, a * 1.6 - 4.9 * a * a, Math.sin(ang) * a * 0.9)); d.visible = a > 0.02; });
    cloud.position.x = Math.sin(t * 0.8) * 0.15;
    const k = E.io(seg(t, C.whichmeans, C.end));
    if (t < C.rain) { const k0 = E.io(seg(t, C.whichmeans, C.rain)); setCam(s.cam, lv(V(0.8, 2.2, 8.6), V(0.5, 2.1, 6.4), k0), V(-0.2, 1.7, 0), drift(t, 1.8) - 2, 38); }
    else { const c = seg(t, C.rain, C.end); setCam(s.cam, pad.clone().add(lv(V(0.9, 0.45, 1.9), V(0.5, 0.3, 1.25), c)), pad, drift(t, 1.8) + 3, 38); }
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
const TR = { 1: [C.but - 0.12, C.but + 0.2, 1], 2: [C.yousee - 0.14, C.yousee + 0.16, 3], 3: [C.which - 0.08, C.which + 0.2, 2], 6: [C.like - 0.05, C.like + 0.4, 2], 7: [C.inone - 0.13, C.inone + 0.17, 4] };

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
