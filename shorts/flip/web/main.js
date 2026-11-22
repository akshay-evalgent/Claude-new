// Flip story renderer: a printed sheet on a wooden table; pages hinged at the fold turn down one by one.
// Page k: front = top half of scene k, back = bottom half of scene k+1, so every turn shows the next whole scene.
// Every frame is a pure function of time: window.setFrame(f) draws frame f (30 fps) and render.js screenshots it.
import * as THREE from 'three';
import { drawScene, half, N } from './scenes.js';

const FPS = 30;
const HEART = '<svg viewBox="0 0 32 30"><path d="M16 28 C2 18 0 10 6 5 C10 2 14 4 16 8 C18 4 22 2 26 5 C32 10 30 18 16 28Z" fill="#e8566a" stroke="#4a3a30" stroke-width="2"/></svg>';
const CFG = {
  head: 'Mom is in none of our family photos. She was always the one taking them.',
  end: 'Take a photo of your mom today.',
  bpm: 72, flip: 1.05, tail: 5.0,                 // pages land on bar lines: one scene per bar (4 beats)
};
CFG.bar = 60 / CFG.bpm * 4; CFG.hold0 = CFG.bar - CFG.flip; CFG.hold = CFG.bar - CFG.flip;
document.getElementById('h1').innerHTML = CFG.head + HEART;
document.getElementById('h2').innerHTML = CFG.end + HEART;

// ---------- timeline ----------
const flips = []; let t = CFG.hold0;
for (let k = 0; k < N - 1; k++) { flips.push(t); t += CFG.flip + CFG.hold; }
const lastSettle = flips[N - 2] + CFG.flip;
const DUR = lastSettle + CFG.tail;
const flashes = [1.0, ...flips.map(f => f + CFG.flip + 0.28)];
const SFX = [];
flips.forEach(f => { SFX.push({ t: f, name: 'flip' }); SFX.push({ t: f + CFG.flip - 0.08, name: 'land' }); });
flashes.forEach(f => SFX.push({ t: f - 0.02, name: 'shutter' }));
window.SFX = SFX; window.BREAKS = []; window.FRAMES = Math.round(DUR * FPS);
window.TIMELINE = { flips, flashes, dur: DUR, endText: lastSettle + 1.6 };
window.META = { bar: CFG.bar, lands: flips.map(f => f + CFG.flip), endText: lastSettle + 1.6 };

// ---------- three.js scene ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(33, 1080 / 1920, 0.1, 200);

scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8a6a50, 1.5));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
sun.position.set(-7, 9, 16); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 6; sun.shadow.bias = -0.0004;
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 11, bottom: -11, near: 1, far: 50 });
scene.add(sun);

const loader = new THREE.TextureLoader();
const tex = (p, srgb) => { const t = loader.load(p); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.2, 2.2); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ map: tex('../assets/wood_Diffuse.jpg', true), normalMap: tex('../assets/wood_nor_gl.jpg'), roughnessMap: tex('../assets/wood_Rough.jpg'), roughness: 0.8, color: 0xffffff }));
table.rotation.z = Math.PI / 2; table.receiveShadow = true; scene.add(table);

// paper
const PW = 8, PH = 10, HH = PH / 2;
const paperTex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function paperNormal() {                    // faint fibre bumps so the light catches the sheet
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, 512, 512);
  let s = 11; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${118 + r() * 20},${118 + r() * 20},255,0.5)`; g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}
const pn = paperNormal();
const mat = (map, side) => new THREE.MeshStandardMaterial({ map, side, roughness: 0.93, metalness: 0, normalMap: pn, normalScale: new THREE.Vector2(0.15, 0.15) });

await document.fonts.load('700 100px Caveat'); await document.fonts.load('600 58px Caveat');
const scenes = [...Array(N)].map((_, i) => drawScene(i));
const tops = scenes.map(c => paperTex(half(c, 'top')));
const bots = scenes.map(c => paperTex(half(c, 'bot')));

const SEG = 40, EPS = 0.012;
const base = new THREE.Mesh(new THREE.PlaneGeometry(PW, HH), mat(bots[0], THREE.FrontSide));
base.position.set(0, -HH / 2, 0.01); base.receiveShadow = true; base.castShadow = true; scene.add(base);
// a thin under-sheet so the stack has an edge
const under = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.02, PH + 0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.95 }));
under.position.z = -0.002; under.receiveShadow = true; under.castShadow = true; scene.add(under);

const pages = [];
for (let k = 0; k < N; k++) {
  const geo = new THREE.PlaneGeometry(PW, HH, 1, SEG); geo.translate(0, HH / 2, 0);    // hinge on y = 0
  const front = new THREE.Mesh(geo, mat(tops[k], THREE.FrontSide));
  const bt = k + 1 < N ? bots[k + 1].clone() : bots[k].clone(); bt.needsUpdate = true;
  bt.repeat.set(1, -1); bt.offset.set(0, 1); bt.wrapT = THREE.RepeatWrapping;           // reads upright once turned over
  const back = new THREE.Mesh(geo, mat(bt, THREE.BackSide));
  for (const m of [front, back]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  pages.push({ geo, front, back, rest: geo.attributes.position.array.slice() });
}

const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function bendPage(p, theta, zLift, zBase) {
  // walk along the page from the hinge; the free edge lags behind, so the sheet curls while it turns
  const pos = p.geo.attributes.position, a = pos.array, rows = SEG + 1, ds = HH / SEG;
  let y = 0, z = 0;
  for (let i = 0; i < rows; i++) {
    const u = i / SEG;
    const phi = theta - 0.85 * Math.sin(theta) * Math.pow(u, 1.3);
    if (i > 0) { y += Math.cos(phi) * ds; z += Math.sin(phi) * ds; }
    const row = SEG - i;                               // PlaneGeometry builds rows from the far edge; the hinge is the last row
    for (const col of [0, 1]) { const j = (row * 2 + col) * 3; a[j + 1] = y; a[j + 2] = zBase + z + zLift * Math.sin(theta); }
  }
  pos.needsUpdate = true; p.geo.computeVertexNormals();
}

function pageState(k, tt) {
  // returns flip angle 0..PI for page k at time tt
  if (k >= N - 1) return 0;
  const s = flips[k]; if (tt <= s) return 0; if (tt >= s + CFG.flip) return Math.PI;
  return ease((tt - s) / CFG.flip) * Math.PI;
}

function noise1(x) { return Math.sin(x * 1.3) * 0.5 + Math.sin(x * 2.9 + 1.7) * 0.3 + Math.sin(x * 5.3 + 0.4) * 0.2; }

const flashEl = document.getElementById('flash'), h1 = document.getElementById('h1'), h2 = document.getElementById('h2');
window.setFrame = f => {
  const tt = f / FPS;
  for (let k = 0; k < N; k++) {
    const th = pageState(k, tt);
    // unturned pages stack with the next one on top; turned pages stack on the lower half in turning order
    const zRest = 0.03 + (N - k) * EPS, zDone = 0.03 + (k + 1) * EPS + N * EPS;
    const zb = zRest + (zDone - zRest) * (th / Math.PI);
    bendPage(pages[k], th, 0.25, zb);
  }
  // handheld phone: slow drift and a gentle push-in
  const push = 1 - 0.035 * Math.min(1, tt / DUR);
  cam.position.set(0.06 * noise1(tt * 0.6), -2.6 + 0.05 * noise1(tt * 0.5 + 3), 27.5 * push);
  cam.up.set(0.004 * noise1(tt * 0.4 + 7), 1, 0);
  cam.lookAt(0.03 * noise1(tt * 0.7 + 5), 1.25, 0);
  renderer.render(scene, cam);
  // camera flash after each page lands ("click" - she took the photo)
  let fl = 0; for (const x of flashes) { const d = tt - x; if (d >= 0 && d < 0.45) fl = Math.max(fl, 0.75 * Math.exp(-d * 9)); }
  flashEl.style.opacity = fl.toFixed(3);
  const e = Math.min(1, Math.max(0, (tt - window.TIMELINE.endText) / 0.5));
  h1.style.opacity = (1 - e).toFixed(3); h2.style.opacity = e.toFixed(3);
};

(async () => {
  await document.fonts.load('700 100px Caveat'); await document.fonts.load('800 56px OpenSansXB');
  await new Promise(r => { const chk = () => (table.material.map.image && table.material.map.image.complete ? r() : setTimeout(chk, 50)); chk(); });
  await new Promise(r => setTimeout(r, 400));
  window.setFrame(0);
  window.READY = true;
})();
