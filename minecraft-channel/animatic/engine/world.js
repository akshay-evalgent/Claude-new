// Sets and props for the "plains game show" location (set library: Plains field).
import * as THREE from 'three';
import { BLOCK, texFromCanvas, canvas, rng, noisy } from './textures.js';

export const LAYOUT = {
  podiums: { rex: [-6, 0], duchess: [-3, 0], pico: [0, 0], lou: [3, 0], greg: [6, 0] },
  podiumTop: 1,
  board: [0, 0, -6.5],
  pit: { x: 20, z: 0, size: 6 },
  pillarAva: [20, 0, 0], pillarAvaH: 2.5,
  pillarCookie: [15.4, 0, -1.6], pillarCookieH: 1.4,
  fenceX: -22,
  tree: [11.5, -9],
};

function mat(c, repeat) { return new THREE.MeshLambertMaterial({ map: texFromCanvas(c, repeat) }); }

// A textured box: tex = name | {top, side, bottom}
export function block(tex, w, h, d, opts = {}) {
  const get = (n) => (typeof n === 'string' ? BLOCK[n]() : n);
  const T = typeof tex === 'string' || tex instanceof HTMLCanvasElement ? { top: tex, side: tex, bottom: tex } : tex;
  const rep = opts.repeat !== false;
  const side = (fw, fh) => mat(get(T.side), rep ? [fw, fh] : null);
  const mats = [side(d, h), side(d, h), mat(get(T.top), rep ? [w, d] : null), mat(get(T.bottom ?? T.side), rep ? [w, d] : null), side(w, h), side(w, h)];
  if (opts.front) mats[4] = opts.front;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = true;
  return m;
}

function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }

function tree(x, z, h = 4, R) {
  const g = new THREE.Group();
  g.add(at(block({ top: 'logTop', side: 'logSide' }, 1, h, 1), 0, h / 2, 0));
  g.add(at(block('leaves', 5, 2, 5), 0, h - 0.2, 0));
  g.add(at(block('leaves', 3, 2, 3), 0, h + 1.6, 0));
  g.add(at(block('leaves', 1, 1, 3), 0, h + 3.1, 0));
  g.position.set(x, 0, z);
  return g;
}

export function buildWorld(scene) {
  const R = rng(42);
  const W = { props: {} };

  // ground
  const gtex = texFromCanvas(BLOCK.grassTop(), [400, 400]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ map: gtex }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // sky dome
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#5ea4ff') }, bottom: { value: new THREE.Color('#cfe6ff') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.1,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 24, 12), skyMat);
  scene.add(sky);
  W.sky = sky; W.skyMat = skyMat;

  // stars
  const sg = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 700; i++) {
    const th = R() * Math.PI * 2, ph = Math.acos(R() * 0.9 + 0.08);
    sp.push(300 * Math.sin(ph) * Math.cos(th), 300 * Math.cos(ph), 300 * Math.sin(ph) * Math.sin(th));
  }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  W.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
  scene.add(W.stars);

  // sun & moon (square, vanilla style)
  W.sun = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: '#fff6c8', fog: false }));
  W.moon = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ map: texFromCanvas(canvas(8, 8, (g) => { noisy(g, 0, 0, 8, 8, '#e8ecf5', 0.06, rng(5)); g.fillStyle = '#b9c0cf'; g.fillRect(2, 2, 2, 2); g.fillRect(5, 5, 1, 1); g.fillRect(5, 1, 1, 1); })), fog: false, transparent: true }));
  scene.add(W.sun, W.moon);

  // clouds
  W.clouds = new THREE.Group();
  const cm = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#bbbbbb', transparent: true, opacity: 0.92 });
  for (let i = 0; i < 26; i++) {
    const w = 8 + R() * 14, d = 5 + R() * 10;
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), cm);
    c.position.set(-160 + R() * 320, 38 + R() * 4, -150 + R() * 170);
    W.clouds.add(c);
  }
  scene.add(W.clouds);

  // distant hills
  for (let i = 0; i < 14; i++) {
    const w = 10 + ((R() * 14) | 0), h = 2 + ((R() * 6) | 0), d = 8 + ((R() * 8) | 0);
    const hill = block({ top: 'grassTop', side: 'grassSide', bottom: 'dirt' }, w, h, d);
    hill.position.set(-90 + i * 13 + R() * 6, h / 2, -55 - R() * 20);
    scene.add(hill);
  }
  for (let i = 0; i < 8; i++) {
    const w = 8 + ((R() * 10) | 0), h = 2 + ((R() * 4) | 0), d = 8 + ((R() * 8) | 0);
    const hill = block({ top: 'grassTop', side: 'grassSide', bottom: 'dirt' }, w, h, d);
    hill.position.set(-70 + i * 20 + R() * 6, h / 2, 45 + R() * 20);
    scene.add(hill);
  }

  // trees
  const trees = [[-12, -10], [11.5, -9], [16, -11], [27, -8], [-30, -12], [-8, -17], [4, -18], [23, -17], [-38, 6], [-36, -5], [34, 2], [-17, 12], [14, 14], [30, 12], [-4, 18], [8, 24]];
  trees.forEach(([x, z]) => scene.add(tree(x, z, 4 + ((R() * 2) | 0), R)));

  // flowers & grass tufts
  const fm = { red: new THREE.MeshLambertMaterial({ color: '#d8332c' }), yellow: new THREE.MeshLambertMaterial({ color: '#f2d43a' }), stem: new THREE.MeshLambertMaterial({ color: '#3f8f2c' }), tuft: new THREE.MeshLambertMaterial({ color: '#5aa83a' }) };
  const tuftG = new THREE.BoxGeometry(0.08, 0.35, 0.08), stemG = new THREE.BoxGeometry(0.06, 0.3, 0.06), headG = new THREE.BoxGeometry(0.16, 0.14, 0.16);
  for (let i = 0; i < 520; i++) {
    const x = -45 + R() * 80, z = -14 + R() * 30;
    if (Math.abs(z) < 3 && x > -9 && x < 9) continue;        // stage
    if (x > 15 && x < 25 && Math.abs(z) < 5) continue;       // pit
    if (x < -8 && x > -32 && Math.abs(z) < 2.5) continue;    // fetch track
    if (Math.abs(x) < 3 && z > 2 && z < 7) continue;         // Ava's mark
    if (R() < 0.12) {
      const f = new THREE.Group();
      f.add(at(new THREE.Mesh(stemG, fm.stem), 0, 0.15, 0));
      f.add(at(new THREE.Mesh(headG, R() < 0.5 ? fm.red : fm.yellow), 0, 0.33, 0));
      f.position.set(x, 0, z); scene.add(f);
    } else {
      for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(tuftG, fm.tuft); t.position.set(x + (R() - 0.5) * 0.3, 0.17, z + (R() - 0.5) * 0.3); t.rotation.y = R() * 3; scene.add(t); }
    }
  }

  // ---- game-show stage ----
  const colors = { rex: '#e74c3c', duchess: '#f4c430', pico: '#2f6fe0', lou: '#f48fb8', greg: '#bfbfbf' };
  for (const [name, [x, z]] of Object.entries(LAYOUT.podiums)) {
    const front = new THREE.MeshLambertMaterial({ map: texFromCanvas(canvas(16, 16, (g) => {
      noisy(g, 0, 0, 16, 16, '#b8945f', 0.06, rng(3));
      noisy(g, 0, 5, 16, 6, colors[name], 0.06, rng(4));
      g.fillStyle = '#ffffff'; g.fillRect(7, 6, 2, 4); g.fillRect(6, 7, 4, 2);
    }), [1, 1]) });
    const p = block({ top: 'planks', side: 'planks' }, 1.7, 1, 1.7, { front, repeat: false });
    p.position.set(x, 0.5, z);
    scene.add(p);
  }
  // stage floor
  const floor = block({ top: 'stoneBricks', side: 'stoneBricks' }, 17, 0.1, 4);
  floor.position.set(0, 0.05, -0.6); floor.castShadow = false;
  scene.add(floor);
  // posts + glowstone
  [-6.0, 6.0].forEach((x) => {
    scene.add(at(block({ top: 'logTop', side: 'logSide' }, 0.8, 8.6, 0.8), x, 4.3, LAYOUT.board[2]));
    scene.add(at(block('glow', 1, 1, 1), x, 9.1, LAYOUT.board[2]));
  });

  // scoreboard (prop: can shatter)
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 480; boardCanvas.height = 220;
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  const boardFront = new THREE.MeshLambertMaterial({ map: boardTex, emissive: '#ffffff', emissiveMap: boardTex, emissiveIntensity: 0.25 });
  const board = block({ top: 'darkPlanks', side: 'darkPlanks' }, 11, 5, 0.5, { front: boardFront, repeat: false });
  const boardG = new THREE.Group();
  board.position.set(0, 6.0, 0);
  boardG.add(board);
  boardG.position.set(...LAYOUT.board);
  scene.add(boardG);
  W.props.scoreboard = boardG;
  W.drawBoard = (scores, names) => {
    const g = boardCanvas.getContext('2d');
    g.fillStyle = '#1b1f24'; g.fillRect(0, 0, 480, 220);
    g.strokeStyle = '#3d2814'; g.lineWidth = 10; g.strokeRect(0, 0, 480, 220);
    g.font = '22px "Press Start 2P"'; g.textBaseline = 'top';
    g.fillStyle = '#ff5a7a'; g.textAlign = 'center'; g.fillText('SCORES', 240, 16);
    g.textAlign = 'left';
    names.forEach(([key, label, col], i) => {
      const y = 56 + i * 31;
      g.fillStyle = col; g.fillText(label, 40, y);
      g.fillStyle = '#ffffff'; g.textAlign = 'right'; g.fillText(String(scores?.[key] ?? 0), 440, y); g.textAlign = 'left';
    });
    boardTex.needsUpdate = true;
  };

  // ---- round 2: the "lava" pit ----
  const { x: px, z: pz, size } = LAYOUT.pit;
  const lava = block('lavaWool', size, 0.08, size);
  lava.position.set(px, 0.04, pz); lava.castShadow = false;
  lava.material.forEach((m) => { m.emissive = new THREE.Color('#ff6a00'); m.emissiveIntensity = 0.35; });
  scene.add(lava);
  W.lava = lava;
  const rim = [[px, -size / 2 - 0.25, size + 1, 0.5], [px, size / 2 + 0.25, size + 1, 0.5]];
  rim.forEach(([x, z, w, d]) => scene.add(at(block('stoneBricks', w, 0.4, d), x, 0.2, pz + z)));
  [[-1], [1]].forEach(([s]) => scene.add(at(block('stoneBricks', 0.5, 0.4, size), px + s * (size / 2 + 0.25), 0.2, pz)));
  const pa = new THREE.Group();
  pa.add(at(block('stoneBricks', 1, LAYOUT.pillarAvaH, 1), 0, LAYOUT.pillarAvaH / 2, 0));
  pa.position.set(...LAYOUT.pillarAva);
  scene.add(pa);
  W.props.pillarAva = pa;
  scene.add(at(block({ top: 'planks', side: 'planks' }, 1, LAYOUT.pillarCookieH, 1), LAYOUT.pillarCookie[0], LAYOUT.pillarCookieH / 2, LAYOUT.pillarCookie[2]));
  // warning sign
  const warn = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.08), [0, 0, 0, 0, 0, 0].map((_, i) => new THREE.MeshLambertMaterial(i === 4 ? { map: texFromCanvas(canvas(64, 32, (g) => { g.fillStyle = '#b8945f'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#2b1d0e'; g.font = '9px "Press Start 2P"'; g.textAlign = 'center'; g.fillText('LAVA', 32, 14); g.font = '6px "Press Start 2P"'; g.fillText('(REAL)', 32, 25); })) } : { color: '#8a6a3e' })));
  warn.position.set(px - 3.6, 1.3, pz + 3.6); warn.rotation.y = 0.5; warn.castShadow = true;
  scene.add(warn);
  scene.add(at(block({ top: 'logTop', side: 'logSide' }, 0.15, 1.0, 0.15), px - 3.6, 0.5, pz + 3.55));

  // ---- fetch field fence ----
  const fx = LAYOUT.fenceX;
  const post = () => block('planks', 0.25, 1.5, 0.25);
  const rail = (len) => block('planks', 0.12, 0.18, len);
  const fenceSide = new THREE.Group(), fenceMid = new THREE.Group();
  for (let z = -8; z <= 8; z += 2) {
    const mid = Math.abs(z) <= 2;
    (mid ? fenceMid : fenceSide).add(at(post(), fx, 0.75, z));
  }
  for (let z = -8; z < 8; z += 2) {
    const mid = z >= -2 && z < 2;
    [0.6, 1.15].forEach((y) => (mid ? fenceMid : fenceSide).add(at(rail(2), fx, y, z + 1)));
  }
  scene.add(fenceSide, fenceMid);
  W.props.fenceMid = fenceMid;

  // ---- small props ----
  const bowl = () => {
    const g = new THREE.Group();
    g.add(at(block('darkPlanks', 0.42, 0.14, 0.42, { repeat: false }), 0, 0.07, 0));
    const food = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.32), new THREE.MeshLambertMaterial({ map: texFromCanvas(BLOCK.cookie()) }));
    food.position.y = 0.15; g.add(food);
    return g;
  };
  for (const k of Object.keys(LAYOUT.podiums)) { const b = bowl(); scene.add(b); W.props['bowl_' + k] = b; }

  const pot = new THREE.Group();
  pot.add(at(block('pot', 0.34, 0.3, 0.34, { repeat: false }), 0, 0.15, 0));
  pot.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), fm.stem), 0, 0.42, 0));
  pot.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.16), fm.red), 0, 0.58, 0));
  scene.add(pot); W.props.pot = pot;

  const cookie = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.45), new THREE.MeshLambertMaterial({ map: texFromCanvas(BLOCK.cookie()) }));
  cookie.castShadow = true;
  const cookieG = new THREE.Group(); cookie.position.y = 0.05; cookieG.add(cookie);
  scene.add(cookieG); W.props.cookie = cookieG;

  const card = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.03), new THREE.MeshLambertMaterial({ map: texFromCanvas(canvas(16, 20, (g) => { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, 16, 20); g.fillStyle = '#ff5a7a'; g.fillRect(2, 3, 12, 2); g.fillStyle = '#9a9a9a'; [8, 11, 14].forEach((y) => g.fillRect(2, y, 10, 1)); })) }));
  card.castShadow = true;
  const cardG = new THREE.Group(); cardG.add(card); scene.add(cardG); W.props.card = cardG;

  const stick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), new THREE.MeshLambertMaterial({ map: texFromCanvas(BLOCK.logSide()) }));
  stick.castShadow = true;
  const stickG = new THREE.Group(); stickG.add(stick); scene.add(stickG); W.props.stick = stickG;

  // adoption sign (held overhead by Ava): two faces of text we can swap
  const signTex = {};
  const mkSign = (lines, strike) => texFromCanvas(canvas(96, 48, (g) => {
    g.fillStyle = '#d9b77a'; g.fillRect(0, 0, 96, 48);
    g.fillStyle = '#b8945f'; g.fillRect(0, 0, 96, 3); g.fillRect(0, 45, 96, 3);
    g.fillStyle = '#2b1d0e'; g.textAlign = 'center'; g.font = '12px "Press Start 2P"';
    g.fillText(lines[0], 48, 22); g.font = '16px "Press Start 2P"'; g.fillText(lines[1], 48, 42);
    if (strike) { g.strokeStyle = '#d8332c'; g.lineWidth = 3; g.beginPath(); g.moveTo(30, 40); g.lineTo(46, 26); g.stroke(); g.fillStyle = '#d8332c'; g.font = '12px "Press Start 2P"'; g.fillText(strike, 70, 36); }
  }));
  const signFront = new THREE.MeshLambertMaterial();
  const sign = new THREE.Group();
  const board2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.06), [0, 0, 0, 0, 0, 0].map((_, i) => (i === 4 || i === 5 ? signFront : new THREE.MeshLambertMaterial({ color: '#b8945f' }))));
  board2.castShadow = true;
  board2.position.y = 0.5; sign.add(board2);
  sign.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.7, 0.07), new THREE.MeshLambertMaterial({ color: '#6b5032' })), 0, 0, 0));
  scene.add(sign); W.props.sign = sign;
  W.signSet = (which) => {
    if (!signTex.one) { signTex.one = mkSign(['ADOPT', '1']); signTex.five = mkSign(['ADOPT', '1'], '5'); }
    signFront.map = which === 'five' ? signTex.five : signTex.one; signFront.needsUpdate = true;
  };
  W.signSet('one');

  return W;
}
