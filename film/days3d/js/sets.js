// Animated sets for the film: a time-lapse sky, the bedroom, the rooftop, the dream stage, hands and a guitar rig.
import * as THREE from 'three';
import { toon, mesh, canvasTex, INK } from './toon.js';
import * as P from './props.js';
import { makeChar, HERO, NEIGHBOUR, WIFE } from './char.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const box = (parent, size, pos, color, th = 0.03, o) => P.box(parent, size, pos, color, th, o);
export function cam(camera, pos, at, fov) { if (fov) camera.fov = fov; camera.position.set(...pos); camera.lookAt(...at); camera.updateProjectionMatrix(); }

// ---------- sky with a time of day ----------
export const SKY = {
  night: { top: '#02041a', mid: '#0e1840', bot: '#2a2050', stars: 1.0, amb: '#4a5096', ambI: 1.35, key: '#bfd4ff', keyI: 0.7 },
  dawn:  { top: '#1c1a48', mid: '#b0607a', bot: '#ffb070', stars: 0.15, amb: '#9a7ab0', ambI: 1.5, key: '#ffc89a', keyI: 1.2 },
  day:   { top: '#3a6ac0', mid: '#8cbcec', bot: '#dcecf8', stars: 0.0, amb: '#a8b4d8', ambI: 1.75, key: '#fff4e0', keyI: 1.6 },
  dusk:  { top: '#1c1648', mid: '#c06a7a', bot: '#ffa868', stars: 0.3, amb: '#9a7ab0', ambI: 1.5, key: '#ffb488', keyI: 1.2 },
  fire:  { top: '#3a1440', mid: '#e0503a', bot: '#ffc060', stars: 0.0, amb: '#d07a7a', ambI: 1.6, key: '#ffb070', keyI: 1.8 },
};
const C = (h) => new THREE.Color(h);
export function lerpSky(a, b, u) {
  const r = {}; for (const k of ['top', 'mid', 'bot', 'amb', 'key']) r[k] = C(a[k]).lerp(C(b[k]), u);
  for (const k of ['stars', 'ambI', 'keyI']) r[k] = a[k] + (b[k] - a[k]) * u; return r;
}
// a cycle through times of day; phase 0 = night, 1 = dawn, 2 = day, 3 = dusk, 4 = night ...
export function skyAt(phase) {
  const order = [SKY.night, SKY.dawn, SKY.day, SKY.dusk];
  const i = Math.floor(phase) % 4, u = phase - Math.floor(phase);
  return lerpSky(order[i], order[(i + 1) % 4], u * u * (3 - 2 * u));
}

export function dynSky(scene, o = {}) {
  const uni = { top: { value: C('#000') }, mid: { value: C('#000') }, bot: { value: C('#000') }, sunDir: { value: V(0, 0.05, -1).normalize() }, sunCol: { value: C('#ffc890') }, sunK: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: uni, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, mid, bot, sunCol, sunDir; uniform float sunK; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bot, smoothstep(0.0, -0.25, h));
        c = h > -0.02 && h < 0.12 ? mix(c, bot, (1.0 - smoothstep(-0.02, 0.12, h)) * 0.6) : c;
        float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0); c += sunCol * (pow(s, 6.0) * 0.5 + pow(s, 400.0) * 2.0) * sunK;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const R = o.r || 700;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24), mat); dome.renderOrder = -10; scene.add(dome);
  // stars on the dome
  P.reseed(o.seed || 11);
  const pos = [], col = [], c = new THREE.Color();
  for (let i = 0; i < (o.n || 1800); i++) {
    const az = P.rnd() * Math.PI * 2, el = Math.asin(0.04 + Math.pow(P.rnd(), 0.8) * 0.96), r = R * 0.95;
    pos.push(Math.cos(el) * Math.sin(az) * r, Math.sin(el) * r, Math.cos(el) * Math.cos(az) * r);
    c.set(['#fff3d0', '#ffffff', '#cfe0ff'][i % 3]).multiplyScalar(0.5 + P.rnd() * 0.9); col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const sprite = dot();
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: o.starSize || 3.2, map: sprite, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, fog: false }));
  scene.add(stars);
  const api = {
    dome, stars, uni,
    set(s) { uni.top.value.copy(s.top instanceof THREE.Color ? s.top : C(s.top)); uni.mid.value.copy(s.mid instanceof THREE.Color ? s.mid : C(s.mid)); uni.bot.value.copy(s.bot instanceof THREE.Color ? s.bot : C(s.bot)); stars.material.opacity = s.stars; stars.visible = s.stars > 0.01; },
    sun(dir, k, col) { uni.sunDir.value.copy(dir).normalize(); uni.sunK.value = k; if (col) uni.sunCol.value.set(col); },
  };
  api.set(o.sky || SKY.night);
  return api;
}
let _dot;
export function dot() {
  if (_dot) return _dot;
  _dot = canvasTex(64, 64, (x) => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.22, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); });
  return _dot;
}

// glowing points that can be moved every frame (marbles in flight, stars being born)
export function glowPoints(scene, n, size = 1, o = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size, map: dot(), vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, sizeAttenuation: o.atten ?? true }));
  p.frustumCulled = false; scene.add(p);
  return {
    p, n,
    set(i, v, c, k = 1) { g.attributes.position.setXYZ(i, v.x, v.y, v.z); const cc = c instanceof THREE.Color ? c : C(c); g.attributes.color.setXYZ(i, cc.r * k, cc.g * k, cc.b * k); },
    hide(i) { g.attributes.position.setXYZ(i, 0, -9999, 0); g.attributes.color.setXYZ(i, 0, 0, 0); },
    done() { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; },
  };
}

// a river of warm stars across the sky (with a haze band)
export function starRiver(parent, n, o = {}) {
  P.reseed(o.seed || 17);
  const pos = [], col = [], c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const t = P.rnd(), x = (t - 0.5) * (o.len || 400), w = (P.rnd() + P.rnd() + P.rnd() - 1.5) * (o.width || 40);
    pos.push(x, (o.y || 80) + x * (o.slope || 0.25) + w, -(o.z || 200) + (P.rnd() - 0.5) * 60);
    c.set(['#fff3d0', '#ffd27a', '#ffb54a', '#ffffff', '#bfe0ff'][i % 5]).multiplyScalar((o.k ?? 1.6) * (0.5 + P.rnd())); col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: o.size || 2.4, map: dot(), vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, fog: false }));
  parent.add(pts);
  const haze = canvasTex(1024, 256, (g2, w, h) => { const gr = g2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,200,140,0)'); gr.addColorStop(0.5, `rgba(255,200,140,${o.haze ?? 0.35})`); gr.addColorStop(1, 'rgba(255,200,140,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, w, h); });
  const hz = new THREE.Mesh(new THREE.PlaneGeometry(o.len || 400, (o.width || 40) * 3.2), new THREE.MeshBasicMaterial({ map: haze, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, fog: false }));
  hz.position.set(0, o.y || 80, -(o.z || 200) - 30); hz.rotation.z = Math.atan(o.slope || 0.25); parent.add(hz);
  return { pts, hz, setK(k) { pts.material.opacity = k; hz.material.opacity = k; pts.material.transparent = true; hz.material.transparent = true; } };
}

// ---------- the bedroom ----------
// Floor y = 0. Back wall z = -20, window centred x = 6, y = 11 (14 x 11), sill at y = 5.3 with the jar.
// Bed against the back wall on the left (x = -10), desk on the right.
export const LATER_LABELS = ['LATER', 'GUITAR', 'CALL MOM', 'GYM', 'TRIP', 'BOOK', 'LATER', 'SLEEP', 'FRIENDS', 'LATER', 'DRAW', 'LATER', 'COOK', 'RUN', 'LATER', 'PIANO'];
export function bedroom(scene, o = {}) {
  const R = { boxes: [] };
  R.sky = dynSky(scene, { sky: o.sky || SKY.night });
  R.city = P.city(scene, { n: 70, near: 70, depth: 160, spread: 280, y: -36, maxH: 50, lit: 0.3, bright: 0.85 });
  const wall = o.wall || '#2a3460';
  P.wallWithWindow(scene, 90, 30, [6, 11, 14, 11], wall, -20);
  P.windowFrame(scene, 14, 11, [6, 11, -19.6], o.frame || '#3a4478');
  box(scene, [2, 30, 60], [-21, 15, 10], wall); box(scene, [2, 30, 60], [27, 15, 10], wall);
  box(scene, [120, 1, 120], [0, -0.5, 0], o.floor || '#1c2042');
  box(scene, [17, 0.6, 2.6], [6, 5.25, -19.2], o.frame || '#3a4478');
  R.bed = P.bed(scene, { blanket: o.blanket || '#3c4a7a' }); R.bed.scale.setScalar(1.5); R.bed.position.set(-10, 0, -11.2);
  // desk on the right
  box(scene, [6, 0.5, 11], [20, 6.0, -12], '#5a4232'); for (const z of [-17, -7]) box(scene, [5.4, 5.8, 0.5], [20, 2.9, z], '#4a3428');
  R.jar = P.jar(scene, { r: 1.45, h: 3.8, n: 220, mr: 0.2, label: o.label ?? '21,236', sub: 'DAYS LEFT', labelSize: 96, lightI: o.jarI ?? 26, lightD: 30, fill: o.fill ?? 0.8 });
  R.jar.position.set(9.5, 5.55, -19.2);
  R.jarMarbles = R.jar.children.find((c) => c.isInstancedMesh); R.jarMax = R.jarMarbles.count;
  // LATER boxes: where they land as they pile up (the last ones block the window)
  const spots = [[14, 0, -16, 3.2], [17.5, 0, -15, 2.8], [13.5, 2.6, -16.5, 2.6], [-2, 0, -17, 3.2], [1.5, 0, -17.5, 3.0], [16, 2.3, -15.5, 2.4], [-1, 2.6, -17.2, 2.8],
    [3.5, 5.6, -18.6, 3.0], [7.5, 5.6, -18.6, 3.2], [11, 5.6, -18.6, 2.8], [5.5, 8.4, -18.7, 2.9], [9, 8.4, -18.7, 3.0], [12.5, 8.0, -18.6, 2.6], [4, 11.1, -18.8, 2.7], [8, 11.3, -18.8, 3.0], [11.5, 10.8, -18.7, 2.6]];
  spots.forEach(([x, y, z, s], i) => {
    const b = P.laterBox(scene, s, { text: LATER_LABELS[i % LATER_LABELS.length] });
    b.position.set(x, y + s * 0.4, z); b.rotation.y = (i * 0.37 % 0.5) - 0.25; b.visible = false; b.userData.s = s; R.boxes.push(b);
  });
  R.amb = new THREE.AmbientLight(0x4a5096, 1.35); scene.add(R.amb);
  R.key = new THREE.DirectionalLight(0xbfd4ff, 0.7); R.key.position.set(4, 10, -30); scene.add(R.key);
  R.fill = new THREE.DirectionalLight(0xc8b8ff, 0.35); R.fill.position.set(10, 8, 20); scene.add(R.fill);
  R.setSky = (s) => { R.sky.set(s); R.amb.color.copy(s.amb instanceof THREE.Color ? s.amb : C(s.amb)); R.amb.intensity = s.ambI; R.key.color.copy(s.key instanceof THREE.Color ? s.key : C(s.key)); R.key.intensity = s.keyI; };
  R.setBoxes = (n, pop = 1) => { R.boxes.forEach((b, i) => { b.visible = i < Math.ceil(n); const sc = i === Math.ceil(n) - 1 ? Math.min(1, pop) : 1; b.scale.setScalar(Math.max(0.01, sc)); }); };
  R.setFill = (f) => { R.jarMarbles.count = Math.max(0, Math.round(R.jarMax * f)); };
  return R;
}
// seated on the bed's edge, facing the room (+x)
export const BED_EDGE = { x: -3.9, z: -9.5, h: 4.4, turn: Math.PI / 2 };

// ---------- POV hand with a movable thumb ----------
export function povHand(parent, look = HERO) {
  const Hd = new THREE.Group(); parent.add(Hd);
  const skin = toon(look.skin, { steps: [0.7, 1.0], rim: 0x7fb0ff, rimStrength: 0.5 }), top = toon(look.top, { steps: [0.62, 0.84, 1.0], rim: 0x7fb0ff, rimStrength: 0.4 });
  const sleeve = mesh(new THREE.CylinderGeometry(0.62, 0.7, 3.0, 20), top, 0.03, Hd); sleeve.position.set(0.2, -2.1, 0.1); sleeve.rotation.z = 0.25;
  mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.35, 20), toon(look.topShade, { steps: [0.62, 1.0] }), 0.025, Hd).position.set(-0.12, -0.72, 0.1);
  const palm = mesh(new THREE.SphereGeometry(0.62, 20, 16), skin, 0.025, Hd); palm.scale.set(1.0, 1.15, 0.5); palm.position.set(0.1, -0.1, -0.45);
  for (let k = 0; k < 4; k++) { const f = mesh(new THREE.CapsuleGeometry(0.13, 0.36, 4, 10), skin, 0.02, Hd); f.position.set(0.68, 0.72 - k * 0.3, -0.05); f.rotation.set(0, 0.9, 1.4); }
  const thumbP = new THREE.Group(); thumbP.position.set(0.05, -0.32, 0.02); Hd.add(thumbP);
  const thb = mesh(new THREE.SphereGeometry(0.26, 14, 10), skin, 0.02, thumbP); thb.scale.set(1, 1.3, 0.6);
  const th = mesh(new THREE.CapsuleGeometry(0.15, 0.42, 4, 10), skin, 0.022, thumbP); th.position.set(-0.37, 0.44, 0.1); th.rotation.set(0.15, 0, -0.85);
  return { group: Hd, thumb: thumbP };
}

// ---------- guitar held by a character ----------
export function holdGuitar(c) {
  const G = P.guitar(c.chest); G.scale.setScalar(0.95);
  G.position.set(-0.1, -1.05, 1.3); G.rotation.set(0.1, -0.12, -1.15);
  c.guitar = G;
  return G;
}
// after pose(): hands onto the guitar; u in [0,1] is the strum (down and up across the sound hole)
export function strum(c, u, G = c.guitar) {
  c.ik('R', G.localToWorld(V(0.15, -0.1 + 0.55 * (u - 0.5), 0.55)), V(-1, -0.6, -0.4));
  c.ik('L', G.localToWorld(V(-0.05, 2.35, 0.35)), V(0.6, -1, -0.8));
}
// playing pose before the IK pass (arms near where they end up)
export const playPose = (u, o = {}) => ({ armR: [-0.6, -0.3, -1.2, 0.4], armL: [-1.0, 0.6, -1.4, -0.6], ...o });

// ---------- the rooftop ----------
export function rooftop(scene, o = {}) {
  const R = {};
  R.sky = dynSky(scene, { sky: { top: '#070618', mid: '#2a1c56', bot: '#c87a6a', stars: 1, amb: '#6a6ab0', ambI: 1.45, key: '#ffc89a', keyI: 1.2 }, n: 1800 });
  R.river = starRiver(scene, 2600, { y: 70, slope: 0.18, width: 26, len: 520, z: 260, size: 2.2 });
  R.city = P.city(scene, { n: 90, near: 70, depth: 200, spread: 340, y: -60, maxH: 55, lit: 0.4, bright: 0.85 });
  R.amb = new THREE.AmbientLight(0x6a6ab0, 1.45); scene.add(R.amb);
  R.key = new THREE.DirectionalLight(0xffc89a, 1.2); R.key.position.set(10, 6, 6); scene.add(R.key);
  box(scene, [80, 1, 50], [0, -0.5, -8], '#3a3450'); box(scene, [160, 0.9, 140], [0, -0.6, 10], '#342e48', null);
  box(scene, [80, 2.4, 1.2], [0, 1.2, -30], '#4a4460');
  box(scene, [1.2, 2.4, 50], [-34, 1.2, -8], '#4a4460');
  // stairwell hut with a door that opens outward (hinge on its left)
  const hut = new THREE.Group(); scene.add(hut); hut.position.set(-20, 0, -14); R.hut = hut;
  const hutMat = '#5a5070';
  box(hut, [10, 16, 0.6], [0, 8, -3.7], hutMat); box(hut, [0.6, 16, 8], [-4.7, 8, 0], hutMat); box(hut, [0.6, 16, 8], [4.7, 8, 0], hutMat); box(hut, [10, 0.6, 8], [0, 15.7, 0], hutMat);
  box(hut, [2.6, 16, 0.6], [-3.4, 8, 3.7], hutMat); box(hut, [3.4, 16, 0.6], [3.3, 8, 3.7], hutMat); box(hut, [3.7, 6.0, 0.6], [-0.25, 13.0, 3.7], hutMat);
  R.inner = new THREE.PointLight(0xffc880, 14, 16, 1.4); R.inner.position.set(0, 7, 0); hut.add(R.inner);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 15), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(1.05), toneMapped: false })); back.position.set(0, 7.5, -3.35); hut.add(back);
  const hinge = new THREE.Group(); hinge.position.set(-2.1, 0, 3.75); hut.add(hinge); R.door = hinge;
  box(hinge, [3.7, 9.9, 0.3], [1.85, 4.95, 0], '#3a3048'); box(hinge, [0.3, 0.3, 0.5], [3.3, 4.9, 0.25], '#c8b080');
  stringLightsDyn(scene, R, [V(-30, 13, -28), V(18, 12, -26)], 3, 30); stringLightsDyn(scene, R, [V(18, 12, -26), V(30, 10, 2)], 2.5, 20);
  // the couple
  R.n = makeChar(NEIGHBOUR, { expr: 'laugh', hat: true, cardigan: true }); scene.add(R.n.root);
  R.w = makeChar(WIFE, { expr: 'happy', cardigan: true }); scene.add(R.w.root);
  R.n.setRim(0xffd7a0, 0.5); R.w.setRim(0xffd7a0, 0.5);
  R.gramo = gramophone(scene); R.gramo.position.set(17, 0, -20); R.gramo.rotation.y = -0.6;
  return R;
}
function stringLightsDyn(parent, R, [a, b], sag, n) {
  R.bulbs = R.bulbs || [];
  const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t), a.z + (b.z - a.z) * t)); }
  parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1a1220 })));
  const geo = new THREE.SphereGeometry(0.22, 10, 8);
  pts.forEach((p, i) => { if (i % 2) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd8a0').multiplyScalar(2.2), toneMapped: false })); m.position.copy(p).y -= 0.3; parent.add(m); R.bulbs.push(m); } });
}
export function gramophone(parent) {
  const G = new THREE.Group(); parent.add(G);
  box(G, [3, 1.6, 3], [0, 0.8, 0], '#6a3a22');
  const horn = mesh(new THREE.ConeGeometry(1.6, 3.2, 24, 1, true), toon('#c8a050', { steps: [0.55, 0.8, 1.0], side: THREE.DoubleSide }), 0.03, G); horn.position.set(0.4, 3.4, 0.5); horn.rotation.set(-0.9, 0, -0.3);
  const arm = mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.0, 8), toon('#c8a050', { steps: [0.55, 1.0] }), 0.02, G); arm.position.set(0.2, 2.4, 0); arm.rotation.z = -0.3;
  return G;
}

// ---------- waltz: two dancers turning around a shared centre ----------
export function waltz(R, t, centre, o = {}) {
  const rate = o.rate ?? 0.33, a = t * rate * Math.PI * 2, r = 1.25;
  const nx = centre.x + Math.cos(a) * r, nz = centre.z + Math.sin(a) * r, wx = centre.x - Math.cos(a) * r, wz = centre.z - Math.sin(a) * r;
  R.n.root.position.set(nx, 0, nz); R.w.root.position.set(wx, 0, wz);
  const face = (from, tx, tz) => Math.atan2(tx - from.x, tz - from.z);
  const bob = Math.sin(t * rate * Math.PI * 6) * 0.12;   // one-two-three
  const nt = face(R.n.root.position, wx, wz), wt = face(R.w.root.position, nx, nz);
  R.n.pose({ turn: nt, hipY: 5.5 + bob, lean: -0.04, headX: -0.12, headY: 0.3, armL: [-1.4, 0.55, -0.7, 0.3], armR: [-0.9, -0.5, -1.0, -0.5], legL: [-0.25 + bob, 0.35], legR: [0.2 - bob, 0.2] });
  R.w.pose({ turn: wt, hipY: 5.45 + bob, lean: -0.06, headX: -0.15, headY: -0.3, headZ: 0.1, armL: [-1.35, 0.5, -0.7, 0.3], armR: [-1.2, -0.6, -0.9, -0.4], legL: [0.2 - bob, 0.25], legR: [-0.25 + bob, 0.35] });
}
