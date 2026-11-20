// A snowy driveway seen from an upstairs window, with N workers in hi-vis shovelling
// and a snow pile on the lawn that can grow into a mountain. Deterministic: frame(t) draws
// time t from a seed, so clips render the same every time.
//
//   window.setup({ workers, pile, seed, width, height, shake, snowfall, pileWorkers })
//   window.frame(t)
import * as THREE from './vendor/three.module.min.js';

let renderer, scene, camera, workers = [], flakes, pileMesh, P, rand, clock0 = 0;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const MAT = {};
function mats() {
  const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
  MAT.snow = m(0xf4f7fb, { roughness: 0.95 });
  MAT.asphalt = m(0x2e3136, { roughness: 0.6 });
  MAT.wet = m(0x3d4147, { roughness: 0.35 });
  MAT.vest = m(0xc8ff1a, { emissive: 0x2a3a00, roughness: 0.6 });
  MAT.stripe = m(0xd9dde3, { metalness: 0.4, roughness: 0.3 });
  MAT.jacket = m(0x1f2a3a);
  MAT.pants = m(0x23262c);
  MAT.boot = m(0x14161a);
  MAT.skin = m(0xc99a7a);
  MAT.hat = m(0x2a2d33);
  MAT.wood = m(0x6b4a2b);
  MAT.blade = m(0x3a3f47, { metalness: 0.6, roughness: 0.4 });
  MAT.wall = m(0xd8cfc0);
  MAT.wall2 = m(0xb9c2cc);
  MAT.roof = m(0x4a4f57);
  MAT.window = m(0x2b3440, { roughness: 0.2, metalness: 0.3 });
  MAT.trunk = m(0x3b3029);
  MAT.curb = m(0x9aa1a9);
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  g.position.set(x, y, z); g.castShadow = g.receiveShadow = true; return g;
}
function cyl(r1, r2, h, mat, seg = 10) {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat);
  g.castShadow = g.receiveShadow = true; return g;
}

// a worker: hips at origin, facing -z; parts are kept so frame() can animate them
function makeWorker(r) {
  const w = new THREE.Group(), body = new THREE.Group();
  const legL = cyl(0.11, 0.09, 0.85, MAT.pants), legR = legL.clone();
  legL.position.set(-0.13, -0.42, 0); legR.position.set(0.13, -0.42, 0);
  const bootL = box(0.2, 0.12, 0.3, MAT.boot, -0.13, -0.86, -0.04), bootR = bootL.clone(); bootR.position.x = 0.13;
  w.add(legL, legR, bootL, bootR);
  const torso = cyl(0.27, 0.23, 0.7, MAT.vest, 12); torso.position.y = 0.38;
  const s1 = cyl(0.275, 0.275, 0.05, MAT.stripe, 12); s1.position.y = 0.3;
  const s2 = s1.clone(); s2.position.y = 0.5;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), MAT.skin); head.position.y = 0.9; head.castShadow = true;
  const hat = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.hat); hat.position.y = 0.93;
  const armL = new THREE.Group(), armR = new THREE.Group();
  const aL = cyl(0.07, 0.06, 0.6, MAT.jacket), aR = aL.clone();
  aL.position.y = -0.3; aR.position.y = -0.3; armL.add(aL); armR.add(aR);
  armL.position.set(-0.3, 0.68, 0); armR.position.set(0.3, 0.68, 0);
  // the shovel hangs from the hands
  const shovel = new THREE.Group(), stick = cyl(0.025, 0.025, 1.3, MAT.wood, 6);
  stick.rotation.x = Math.PI / 2; stick.position.z = -0.55;
  const blade = box(0.42, 0.04, 0.34, MAT.blade, 0, 0, -1.2);
  shovel.add(stick, blade); shovel.position.set(0, 0.1, -0.1);
  body.add(torso, s1, s2, head, hat, armL, armR, shovel);
  w.add(body);
  w.userData = { body, armL, armR, shovel, phase: r() * Math.PI * 2, speed: 0.85 + r() * 0.35 };
  return w;
}

function house(x, z, w, d, h, mat, ry = 0) {
  const g = new THREE.Group();
  g.add(box(w, h, d, mat, 0, h / 2, 0));
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, w * 0.72, h * 0.55, 4, 1), MAT.roof);
  roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, d / w); roof.position.y = h + h * 0.27; roof.castShadow = true; g.add(roof);
  const snowRoof = roof.clone(); snowRoof.material = MAT.snow; snowRoof.scale.multiplyScalar(1.02); snowRoof.position.y += 0.06; g.add(snowRoof);
  for (let i = 0; i < 4; i++) g.add(box(w * 0.14, h * 0.2, 0.05, MAT.window, -w * 0.33 + i * w * 0.22, h * 0.62, d / 2 + 0.03));
  g.add(box(w * 0.16, h * 0.42, 0.05, MAT.window, w * 0.05, h * 0.21, d / 2 + 0.03));
  g.position.set(x, 0, z); g.rotation.y = ry; return g;
}

function tree(x, z, h, r) {
  const g = new THREE.Group(), t = cyl(0.12, 0.2, h, MAT.trunk, 7); t.position.y = h / 2; g.add(t);
  for (let i = 0; i < 9; i++) {
    const b = cyl(0.03, 0.07, h * 0.45, MAT.trunk, 5), a = r() * Math.PI * 2, y = h * (0.45 + r() * 0.5);
    b.position.set(Math.cos(a) * 0.4, y, Math.sin(a) * 0.4);
    b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    g.add(b);
  }
  g.position.set(x, 0, z); return g;
}

// the pile: a lumpy mound whose height grows with P.pile (0 = none, 1 = big, 3+ = a mountain)
function makePile() {
  const geo = new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), pos = geo.attributes.position, r = rng(7);
  const bumps = Array.from({ length: 24 }, () => [r() * Math.PI * 2, r() * 0.5, 0.06 + r() * 0.12]);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x);
    let k = 1;
    for (const [ba, bh, bs] of bumps) k += bs * Math.max(0, Math.cos(a - ba)) ** 6 * (1 - Math.abs(y - bh));
    pos.setXYZ(i, x * k, y * (0.9 + 0.2 * Math.sin(a * 3 + y * 5)), z * k);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, MAT.snow); m.castShadow = m.receiveShadow = true; return m;
}

window.setup = async (p) => {
  P = { workers: 2, pile: 0.4, seed: 3, width: 720, height: 1280, shake: 1, snowfall: 0.6, ...p };
  rand = rng(P.seed);
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(P.width, P.height); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  document.getElementById('wrap').appendChild(renderer.domElement);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc9d1da);
  scene.fog = new THREE.Fog(0xc9d1da, 28, 75);
  mats();
  scene.add(new THREE.HemisphereLight(0xe8eef6, 0x9aa3ad, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(-12, 22, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 70 });
  sun.shadow.radius = 4; scene.add(sun);

  // ground: snow everywhere; the street and the driveway are cleared asphalt
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), MAT.snow); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(200, 7), MAT.wet); street.rotation.x = -Math.PI / 2; street.position.set(0, 0.01, -14); street.receiveShadow = true; scene.add(street);
  const drive = new THREE.Mesh(new THREE.PlaneGeometry(6, 14), MAT.asphalt); drive.rotation.x = -Math.PI / 2; drive.position.set(0, 0.012, -3.5); drive.receiveShadow = true; scene.add(drive);
  scene.add(box(200, 0.15, 0.3, MAT.curb, 0, 0.07, -10.4));
  // snow banks along the driveway edges
  for (const sx of [-3.3, 3.3]) { const bank = cyl(0.5, 0.7, 14, MAT.snow, 8); bank.rotation.x = Math.PI / 2; bank.scale.set(1, 1, 0.45); bank.position.set(sx, 0.05, -3.5); scene.add(bank); }
  // houses and bare trees across the street
  scene.add(house(-14, -24, 10, 8, 5.5, MAT.wall, 0.05), house(2, -26, 12, 8, 6, MAT.wall2), house(18, -24, 10, 8, 5.2, MAT.wall, -0.05));
  for (let i = 0; i < 10; i++) scene.add(tree(-26 + i * 6 + rand() * 2, -18 - rand() * 3, 5 + rand() * 3, rand));
  scene.add(tree(-9, -6, 7, rand), tree(10, 2, 8, rand));

  // workers spread over the driveway (and up the mountain when there are many)
  const n = P.workers, cols = Math.max(1, Math.round(Math.sqrt(n * 0.45)));
  for (let i = 0; i < n; i++) {
    const w = makeWorker(rand);
    const row = Math.floor(i / cols), col = i % cols;
    const x = cols === 1 ? (rand() - 0.5) * 2.4 : -2.4 + (4.8 * col) / Math.max(1, cols - 1) + (rand() - 0.5) * 0.6;
    const z = 2.5 - row * (12.5 / Math.max(1, Math.ceil(n / cols))) + (rand() - 0.5) * 0.6;
    w.position.set(x, 0.92, z);
    w.rotation.y = Math.PI / 2 + (rand() - 0.5) * 0.9;      // most of them throw the snow to the left
    scene.add(w); workers.push(w);
  }
  pileMesh = makePile();
  const pr = 1.2 + 1.8 * P.pile, ph = 0.9 + (P.pile > 1 ? 3.2 * (P.pile - 1) ** 1.25 + 2.2 : 2.2 * P.pile);
  pileMesh.scale.set(pr * (P.pile > 1.5 ? 1.15 : P.pile > 1 ? 1.6 : 1), ph * (P.pile > 1.5 ? 1.75 : 1), pr * (P.pile > 1.5 ? 0.9 : 1));   // a mountain is taller than it is wide
  pileMesh.position.set(-7.2 - (P.pile > 1 ? 3 * (P.pile - 1) : 0), 0, -2.5);
  scene.add(pileMesh);
  for (let i = 0; i < (P.pileWorkers || 0); i++) {               // tiny figures on the mountain
    const w = makeWorker(rand), a = rand() * Math.PI * 0.9 + Math.PI * 0.55, rr = 0.25 + rand() * 0.55;
    const lx = Math.cos(a) * rr * pileMesh.scale.x, lz = Math.sin(a) * rr * pileMesh.scale.z;
    const ly = pileMesh.scale.y * Math.sqrt(Math.max(0, 1 - rr * rr)) * 0.97;
    w.position.set(pileMesh.position.x + lx, ly + 0.9, pileMesh.position.z + lz); w.rotation.y = rand() * Math.PI * 2;
    scene.add(w); workers.push(w);
  }
  // falling snow
  const N = Math.round(1500 * P.snowfall), fp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { fp[i * 3] = (rand() - 0.5) * 40; fp[i * 3 + 1] = rand() * 14; fp[i * 3 + 2] = -rand() * 30 + 6; }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  flakes = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.85 }));
  flakes.userData.base = fp.slice(); scene.add(flakes);

  camera = new THREE.PerspectiveCamera(P.fov || 52, P.width / P.height, 0.1, 200);
  return true;
};

window.frame = (t) => {
  // a phone held at an upstairs window: high, looking down at the driveway, a little handheld wobble
  const sh = P.shake;
  const wob = (f, a) => Math.sin(t * f + P.seed) * a * sh;
  const big = P.pile > 1.5;   // a mountain needs a wider view
  camera.position.set((big ? 7 : 1.8) + wob(0.9, 0.06), (big ? 15 : 9.5) + wob(1.3, 0.05), (big ? 17 : 9.8) + wob(0.7, 0.04));
  const look = big ? new THREE.Vector3(-6, 3.5, -5) : new THREE.Vector3(-1.2, 0, -4.5);
  camera.lookAt(look.x + wob(1.7, 0.08), look.y + wob(1.1, 0.06), look.z);
  // shovelling: scoop (bend), lift, throw to the side
  for (const w of workers) {
    const { body, armL, armR, shovel, phase, speed } = w.userData;
    const c = (t * speed * 1.4 + phase) % (Math.PI * 2), s = Math.sin(c);
    // facing -z: a negative pitch bends forward; arms reach forward; the blade stays near the snow
    body.rotation.x = -(0.25 + 0.35 * Math.max(0, s));
    body.rotation.y = 0.6 * Math.max(0, -s);
    armL.rotation.x = 0.75 + 0.35 * s; armR.rotation.x = 0.95 + 0.35 * s;
    shovel.rotation.x = -(0.55 + 0.2 * s) + 0.45 * Math.max(0, -s); shovel.rotation.z = 0.5 * Math.max(0, -s);
  }
  const fp = flakes.geometry.attributes.position, base = flakes.userData.base;
  for (let i = 0; i < fp.count; i++) {
    let y = base[i * 3 + 1] - t * 1.1; y = ((y % 14) + 14) % 14;
    fp.setXYZ(i, base[i * 3] + Math.sin(t * 0.8 + i) * 0.3, y, base[i * 3 + 2]);
  }
  fp.needsUpdate = true;
  renderer.render(scene, camera);
};
document.body.dataset.ready = '1';
