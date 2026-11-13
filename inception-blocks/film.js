import * as THREE from 'three';
import { clamp, ease, lerp, rng, hash, M, tex, box, label, setPop, makeChar, makeTop, ground, building, van, car, CAST } from './chars.js';

const W = 1080, H = 1920;
const TL = await (await fetch('build/timeline.json')).json();
await document.fonts.load('900 100px Inter');
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const V = (a) => new THREE.Vector3(...a);
function shot(cam, p, l, fov = 35, roll = 0) { cam.position.set(...p); cam.fov = fov; cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(...l); cam.updateProjectionMatrix(); }
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
function move(cam, p0, l0, p1, l1, k, fov = 35, roll = 0) { k = ease(k); shot(cam, mix3(p0, p1, k), mix3(l0, l1, k), fov, roll); }

function mkScene(bg, fog, sunCol = 0xffffff, sunI = 2.2, hemi = [0xffffff, 0x8a8f9a, 1.5], sunPos = [14, 26, 18]) {
  const s = new THREE.Scene(); s.background = new THREE.Color(bg);
  if (fog) s.fog = new THREE.Fog(bg, fog[0], fog[1]);
  s.add(new THREE.HemisphereLight(...hemi));
  const d = new THREE.DirectionalLight(sunCol, sunI); d.position.set(...sunPos); d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048); const c = d.shadow.camera; c.left = c.bottom = -32; c.right = c.top = 32; c.far = 120; d.shadow.bias = -0.0015;
  s.add(d); s.add(d.target); s.userData.sun = d;
  const cam = new THREE.PerspectiveCamera(35, W / H, 0.1, 600);
  return { s, cam };
}
const SC = {};
const put = (ch, x, y, z, ry = 0) => { ch.g.position.set(x, y, z); ch.g.rotation.set(0, ry, 0); return ch; };

// ============ TITLE / LIMBO ============
{
  const { s, cam } = mkScene(0xc9d2dc, [30, 150]);
  ground(s, 400, '#a7adb5', '#b4bac2');
  const r = rng(5);
  for (let i = 0; i < 22; i++) { const a = r() * 6.28, d = 55 + r() * 80, h = 14 + r() * 40; const b = box(6 + r() * 8, h, 6 + r() * 8, 0x9aa1ab, Math.sin(a) * d, h / 2 - 2, Math.cos(a) * d - 30, s); b.rotation.z = (r() - 0.5) * 0.3; b.rotation.x = (r() - 0.5) * 0.2; }
  const cobb = put(makeChar('cobb', 'serious'), 0, 0, 0); s.add(cobb.g);
  const top = makeTop(0.75); top.position.set(1.9, 0, 1.6); s.add(top);
  const tag = label(['PLAYTIME', '87,600 HRS'], { h: 0.62, bg: '#14161c', color: '#ffd24a', border: '#ffd24a' }); tag.position.set(0, 6.9, 0); s.add(tag);
  SC.title = { s, cam, update(lt, dur) { cobb.g.visible = false; tag.visible = false; top.position.set(0, 0, 0); top.scale.setScalar(1.6); top.userData.set(lt, 0.03); move(cam, [0, 2.6, 10], [0, 1.6, 0], [0, 2.0, 7.2], [0, 1.3, 0], lt / dur, 35); } };
  SC.limbo = {
    s, cam, update(lt, dur, T, si, sk) {
      cobb.g.visible = true; top.position.set(1.9, 0, 1.6); top.scale.setScalar(0.75); top.userData.set(T, 0.04); cobb.reset(); cobb.idle(T);
      setPop(tag, 0);
      if (si === 0) move(cam, [0, 10, 30], [0, 3, 0], [2.5, 4.2, 16.5], [0, 2.9, 0], sk);
      else if (si === 1) move(cam, [1.4, 4.9, 6.2], [0, 4.65, 0], [1.0, 4.85, 5.0], [0, 4.65, 0], sk);
      else { move(cam, [5.2, 1.3, 8.2], [0.5, 3.9, 0], [4.4, 1.5, 7.6], [0.5, 4.0, 0], sk, 40); setPop(tag, (lt - SC.limbo.b[2]) / 0.35); cobb.head.rotation.x = 0.12; }
    }
  };
}

// ============ OFFER (rooftop, night) ============
{
  const { s, cam } = mkScene(0x0b1126, [60, 260], 0xbcd0ff, 1.3, [0x6f86c9, 0x1a1c2a, 1.1], [-10, 30, 14]);
  box(34, 2, 34, 0x2b2e35, 0, -1, 0, s);
  const hm = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshLambertMaterial({ transparent: true, map: tex(256, 256, c => { c.strokeStyle = '#e8c53a'; c.lineWidth = 12; c.beginPath(); c.arc(128, 128, 112, 0, 7); c.stroke(); c.fillStyle = '#e8c53a'; c.font = '900 150px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', 128, 136); }) }));
  hm.rotation.x = -Math.PI / 2; hm.position.y = 0.02; hm.receiveShadow = true; s.add(hm);
  const r = rng(21);
  for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = 34 + r() * 120, h = 60 + r() * 75; const b = building(8 + r() * 10, h, 8 + r() * 10, ['#1c2233', '#232a3d', '#182030'][i % 3], 0.4, i); b.position.set(Math.sin(a) * d, h / 2 - 95 + r() * 8, Math.cos(a) * d); b.castShadow = false; s.add(b); }
  const pl = new THREE.PointLight(0xffc58a, 60, 30); pl.position.set(0, 7, 6); s.add(pl);
  // helicopter
  const heli = new THREE.Group(); heli.position.set(-5, 0, -9); heli.rotation.y = 0.5; s.add(heli);
  box(3.6, 3.2, 6, 0x23262d, 0, 2.6, 0, heli); box(3.3, 1.6, 1.6, 0x7fb2d6, 0, 3.1, 2.6, heli); box(0.9, 0.9, 6, 0x23262d, 0, 3.2, -5.6, heli); box(0.3, 2, 1, 0x23262d, 0, 4, -8.2, heli); box(0.3, 0.3, 8, 0x555, -1.8, 0.4, 0, heli); box(0.3, 0.3, 8, 0x555, 1.8, 0.4, 0, heli); box(0.5, 0.8, 0.5, 0x444, 0, 4.6, 0, heli);
  const rotor = new THREE.Group(); rotor.position.y = 5.1; heli.add(rotor); box(15, 0.12, 0.7, 0x111, 0, 0, 0, rotor); box(0.7, 0.12, 15, 0x111, 0, 0, 0, rotor);
  const saito = put(makeChar('saito', 'smirk'), -2.3, 0, 0, 0.75), cobb = put(makeChar('cobb', 'serious'), 2.3, 0, 0, -0.75); s.add(saito.g, cobb.g);
  const b1 = label(['ONE LAST', 'JOB.'], { h: 0.5, bg: '#fff', color: '#14161c' }); b1.position.set(-2.0, 6.7, 0.5); s.add(b1);
  const b2 = label(['PLANT', 'AN IDEA'], { h: 0.5, bg: '#ffd24a', color: '#14161c' }); b2.position.set(1.9, 6.7, 0.5); s.add(b2);
  SC.offer = {
    s, cam, update(lt, dur, T, si, sk) {
      rotor.rotation.y = T * 9; saito.reset(); cobb.reset(); saito.idle(T); cobb.idle(T + 1);
      
      setPop(b1, 0); setPop(b2, 0); cobb.face('serious');
      if (si === 0) { move(cam, [0, 6.5, 26], [0, 3.6, 0], [0, 4.2, 19], [0, 3.3, 0], sk); }
      else if (si === 1) { move(cam, [0.6, 4.9, 11.5], [-2.0, 5.2, 0], [0.2, 4.9, 10.2], [-2.0, 5.2, 0], sk); saito.armR.rotation.x = -1.2 - Math.sin(T * 6) * 0.08; saito.armR.rotation.z = 0.2; setPop(b1, (lt - SC.offer.b[1]) / 0.3); }
      else { move(cam, [-0.4, 4.9, 11.5], [2.0, 5.2, 0], [0, 4.9, 10.2], [2.0, 5.2, 0], sk); cobb.face('surprised'); setPop(b2, (lt - SC.offer.b[2] - 0.5) / 0.3); }
    }
  };
}

// ============ TARGET (Fischer) ============
{
  const { s, cam } = mkScene(0x9fc4ea, [80, 320], 0xfff3dc, 2.4);
  ground(s, 300, '#7d8794', '#8a94a1');
  box(13, 1, 8, 0x2b3140, 0, 0.5, 0, s); box(2.6, 2.6, 1.4, 0x161a24, 0, 2.3, 2.6, s);
  const scr = (lines, bg, fg, coin) => tex(512, 384, c => { c.fillStyle = bg; c.fillRect(0, 0, 512, 384); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; lines.forEach((l, i) => { c.font = `900 ${l[1]}px Inter`; c.fillText(l[0], 256, l[2]); }); if (coin) { for (const x of [70, 442]) { c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(x, 310, 44, 0, 7); c.fill(); c.fillStyle = '#b8860b'; c.font = '900 56px Inter'; c.fillText('$', x, 314); } } });
  const tA = scr([['FISCHER', 96, 150], ['GAMES', 96, 250]], '#12203a', '#7fd0ff'), tB = scr([['PAY', 120, 90], ['2 WIN', 120, 200], ['$9.99 PER JUMP', 44, 312]], '#3a0d12', '#ffd24a', true);
  box(11, 8.2, 0.6, 0x111418, 0, 9.3, -3.4, s);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(10.2, 7.5), new THREE.MeshBasicMaterial({ map: tA })); screen.position.set(0, 9.3, -3.05); s.add(screen);
  const fis = put(makeChar('fischer', 'smirk'), 0, 1, 0.4); s.add(fis.g);
  // tower
  const tw = building(22, 150, 22, '#3a4660', 0.6, 4, '#bfe3ff'); tw.position.set(60, 75, -90); s.add(tw);
  for (let i = 0; i < 8; i++) { const h = 30 + hash(i) * 50; const b = building(14, h, 14, '#5d6a80', 0.3, i + 9, '#dfefff'); b.position.set(60 + (i - 3.5) * 19, h / 2, -110 - hash(i + 3) * 30); s.add(b); }
  const sign = label(['FISCHER', 'GAMES'], { h: 7, color: '#7fd0ff', stroke: '#0b1530' }); sign.position.set(60, 120, -78); s.add(sign);
  const N = 90, coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 10), new THREE.MeshPhongMaterial({ color: 0xffcf3a, shininess: 80 }), N); s.add(coins); const dm = new THREE.Object3D();
  SC.target = {
    s, cam, update(lt, dur, T, si, sk) {
      fis.reset(); fis.idle(T); screen.material.map = si === 2 ? tB : tA; coins.visible = si === 2; fis.face(si === 2 ? 'menace' : 'smirk');
      if (si === 0) { move(cam, [0, 5.6, 17], [0, 5.6, 0], [0, 5.4, 12.5], [0, 5.5, 0], sk); fis.armR.rotation.x = -2.6; fis.armR.rotation.z = 0.3 + Math.sin(T * 7) * 0.25; }
      else if (si === 1) { move(cam, [60, 3, -30], [60, 40, -90], [60, 3, -38], [60, 112, -90], sk, 50); }
      else {
        move(cam, [-2.5, 3.2, 16], [0, 7.0, 0], [-1.5, 3.6, 14], [0, 6.8, 0], sk, 40); fis.armL.rotation.z = -2.5; fis.armR.rotation.z = 2.5;
        const l2 = lt - SC.target.b[2];
        for (let i = 0; i < N; i++) { const y = 20 - ((l2 * (7 + hash(i) * 5) + hash(i + 50) * 22) % 22); dm.position.set((hash(i + 9) - 0.5) * 13, y, (hash(i + 20) - 0.5) * 8 + 2); dm.rotation.set(T * 4 + i, i, T * 3); dm.updateMatrix(); coins.setMatrixAt(i, dm.matrix); }
        coins.instanceMatrix.needsUpdate = true;
      }
    }
  };
}

// ============ CREW ============
{
  const { s, cam } = mkScene(0x15171c, [40, 160], 0xfff0d8, 2.0, [0xffffff, 0x555a66, 1.3], [8, 24, 20]);
  ground(s, 400, '#3a3d44', '#43464e');
  const X = i => i * 40;
  // cobb + blueprint
  const cobb = put(makeChar('cobb', 'smirk'), -1.2, 0, 0, 0.35); s.add(cobb.g);
  box(16, 16, 0.6, 0x2a2d35, 0, 8, -4, s);
  const bp = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshBasicMaterial({ map: tex(350, 250, c => { c.fillStyle = '#1f4f9a'; c.fillRect(0, 0, 350, 250); c.strokeStyle = '#cfe4ff'; c.lineWidth = 4; for (let i = 0; i < 5; i++) c.strokeRect(20 + i * 22, 20 + i * 20, 310 - i * 44, 210 - i * 40); c.font = '900 26px Inter'; c.fillStyle = '#cfe4ff'; c.fillText('THE PLAN', 112, 134); }) }));
  bp.position.set(1.6, 6.4, -3.65); s.add(bp);
  const defs = [['arthur', 'serious', 0x3b4a5a, 'ARTHUR', 'THE PLANNER'], ['ariadne', 'neutral', 0xd39a35, 'ARIADNE', 'THE BUILDER'], ['eames', 'smirk', 0x2f7a72, 'EAMES', 'MASTER OF DISGUISE'], ['yusuf', 'joy', 0x6a4a94, 'YUSUF', 'POTION GUY']];
  const crew = defs.map(([n, e, col, nm, role], i) => {
    const x = X(i + 1); box(18, 22, 0.6, col, x, 11, -4.5, s);
    const ch = put(makeChar(n, e), x, 0, 0); s.add(ch.g);
    const a = label(nm, { h: 1.25, color: '#fff' }), b = label(role, { h: 0.6, bg: '#ffd24a', color: '#14161c' }); a.position.set(x, 8.0, 1); b.position.set(x, 6.75, 1); s.add(a, b);
    return { ch, a, b, x };
  });
  // arthur clipboard
  const clip = box(0.85, 0.12, 1.2, 0xd9c7a0, 0, -2.06, 0.5, crew[0].ch.armL);
  // ariadne blocks
  const blocks = []; const r = rng(3);
  for (let i = 0; i < 14; i++) { const side = i % 2 ? 1 : -1; blocks.push(box(1.3, 1.3, 1.3, [0xe24b3b, 0x3b82e2, 0xf2c230, 0x4caf50][i % 4], X(2) + side * (2.6 + (i % 4 > 1 ? 1.4 : 0)), 0.65 + Math.floor(i / 4) * 1.3, -1.5 - (i % 3) * 0.8, s)); }
  // eames disguise
  const fake = put(makeChar('saito', 'smirk'), X(3), 0, 0); s.add(fake.g);
  // yusuf potion
  const fl = new THREE.Group(); crew[3].ch.armR.add(fl); fl.position.set(0, -2.2, 0.3); box(0.7, 0.8, 0.7, new THREE.MeshLambertMaterial({ color: 0x4dff88, emissive: 0x1f9a48 }), 0, 0, 0, fl); box(0.3, 0.5, 0.3, 0xdfe8ee, 0, 0.6, 0, fl);
  const bub = [0, 1, 2, 3, 4].map(i => box(0.22, 0.22, 0.22, new THREE.MeshLambertMaterial({ color: 0x9dffc0, emissive: 0x2fae5e }), 0, 0, 0, s));
  SC.crew = {
    s, cam, update(lt, dur, T, si, sk) {
      const l = lt - SC.crew.b[si];
      if (si === 0) { cobb.reset(); cobb.idle(T); cobb.armR.rotation.z = 1.9 + Math.sin(T * 5) * 0.1; move(cam, [0, 5, 20], [0.5, 4.6, 0], [0.4, 4.9, 14], [0.5, 4.7, 0], sk); return; }
      const c = crew[si - 1], ch = c.ch; ch.reset(); ch.idle(T);
      const drop = clamp(l / 0.28); ch.g.position.y = (1 - drop) * (1 - drop) * 9; ch.body.scale.y = 1 - Math.sin(clamp((l - 0.28) / 0.25) * Math.PI) * 0.12;
      setPop(c.a, (l - 0.2) / 0.3); setPop(c.b, (l - 0.45) / 0.3);
      move(cam, [c.x + 0.6, 4.4, 17.5], [c.x, 4.3, 0], [c.x - 0.3, 4.4, 15.5], [c.x, 4.3, 0], sk);
      fake.g.visible = false; ch.g.visible = true; bub.forEach(b => b.visible = false);
      if (si === 1) { ch.armL.rotation.x = -0.9; ch.armR.rotation.z = 0.5 + Math.sin(clamp(l - 0.8) * Math.PI) * 1.6; }
      if (si === 2) { blocks.forEach((b, i) => { const k = clamp((l - 0.3 - i * 0.07) / 0.3); b.scale.setScalar(1.3 * ease(k) + 0.001); b.rotation.y = (1 - ease(k)) * 2; }); ch.armL.rotation.z = -2.2; ch.armR.rotation.z = 2.2; }
      if (si === 3) { const fl2 = l > 0.9 && l < 1.9, gl = Math.abs(l - 0.9) < 0.1 || Math.abs(l - 1.9) < 0.1; fake.g.visible = fl2; ch.g.visible = !fl2; const sc = gl ? 1.15 : 1; ch.g.scale.setScalar(sc); fake.g.scale.setScalar(sc); fake.reset(); fake.idle(T); fake.armR.rotation.x = -2.6; fake.armR.rotation.z = 0.3 + Math.sin(T * 8) * 0.2; ch.armL.rotation.z = -0.55; ch.armR.rotation.z = 0.55; ch.head.rotation.z = 0.12; }
      if (si === 4) { ch.armR.rotation.x = -1.5; ch.armR.rotation.z = -0.2; bub.forEach((b, i) => { const k = (l * 0.9 + i * 0.2) % 1; b.visible = l > 0.3; b.position.set(c.x + 1.3 + Math.sin(i * 3 + k * 5) * 0.25, 4.6 + k * 2.2, 2.4); b.scale.setScalar(0.22 * (1 - k) + 0.05); }); }
    }
  };
}

// ============ LEVEL 1 (rainy city) ============
{
  const { s, cam } = mkScene(0x56626f, [25, 150], 0xcfe0f0, 1.5, [0xb8c8d8, 0x3a4048, 1.5], [-12, 30, 10]);
  ground(s, 400, '#2c3138', '#333941');
  for (let z = -150; z < 30; z += 8) box(0.5, 0.05, 3.6, 0xe8e0b0, 0, 0.03, z, s);
  for (const sx of [-1, 1]) { box(7, 0.5, 220, 0x6b7078, sx * 12.5, 0.25, -70, s); for (let i = 0; i < 12; i++) { const h = 30 + hash(i * sx + 40) * 45; const b = building(18, h, 17, ['#3d4753', '#4a4f5a', '#39424d'][i % 3], 0.3, i + (sx > 0 ? 30 : 0)); b.position.set(sx * 25, h / 2, 14 - i * 18); s.add(b); } }
  // train
  const train = new THREE.Group(); s.add(train);
  box(7, 7, 16, 0x8a2b22, 0, 4.2, 0, train); box(7.2, 2.2, 5, 0x2a2a2a, 0, 6.5, 5.6, train); box(6, 1.4, 0.2, 0xcfe6ff, 0, 6.4, 8.15, train); box(8, 1.4, 2.5, 0x444, 0, 1.0, 8.6, train); box(1.2, 1.2, 0.3, 0xfff6b0, 0, 3.6, 8.1, train);
  for (let i = 1; i < 5; i++) box(6.6, 6.4, 15, [0x5f6b3a, 0x3a5f6b, 0x6b4a3a][i % 3], 0, 3.9, -i * 16.5, train);
  const cars = [car(0xe2c12f), car(0x3a6fd0), car(0xd04a3a), car(0xeeeeee)]; cars.forEach((c, i) => { c.position.set(i % 2 ? 3.5 : -3.5, 0, -8 - i * 13); s.add(c); });
  const RN = 1400, rpos = new Float32Array(RN * 6), rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xcfe2f5, transparent: true, opacity: 0.55 })); rain.geometry.setAttribute('position', new THREE.BufferAttribute(rpos, 3)); rain.frustumCulled = false; s.add(rain);
  const guards = [0, 1, 2, 3, 4, 5].map(i => { const g = put(makeChar('guard', 'serious'), 9.5 + (i % 2) * 2.2, 0.5, 2 - i * 4.2, -1.1); box(0.35, 0.5, 1.5, 0x111, 0, -1.9, 0.6, g.armR); s.add(g.g); return g; });
  const taxi = car(0xf0c020); taxi.position.set(3, 0, 2); taxi.rotation.y = 1.3; s.add(taxi);
  const cobb = put(makeChar('cobb', 'serious'), 1.2, 0, 5.6, 2.3), arthur = put(makeChar('arthur', 'serious'), 4.8, 0, 6.2, 2.5); s.add(cobb.g, arthur.g);
  SC.level1 = {
    s, cam, rainUpdate(T, cx, cz) { for (let i = 0; i < RN; i++) { const x = cx + (hash(i) - 0.5) * 60, z = cz + (hash(i + 0.5) - 0.5) * 70 - 10, y = 34 - ((T * 42 + hash(i + 0.25) * 34) % 34); rpos.set([x, y, z, x + 0.25, y - 1.5, z], i * 6); } rain.geometry.attributes.position.needsUpdate = true; },
    update(lt, dur, T, si, sk) {
      const first = si === 0; train.visible = first; cars.forEach(c => c.visible = first); taxi.visible = !first; cobb.g.visible = arthur.g.visible = !first; guards.forEach(g => g.g.visible = !first);
      if (first) {
        const tz = lerp(-150, 4, Math.pow(sk, 0.85)); train.position.set(Math.sin(T * 30) * 0.06, 0, tz);
        cars.forEach((c, i) => { const z0 = -8 - i * 13, hit = tz + 9 - z0; if (hit > 0) { const sx = i % 2 ? 1 : -1; c.position.set(sx * (3.5 + hit * 0.45), Math.sin(clamp(hit / 22) * Math.PI) * 3.5, z0 + hit * 0.75); c.rotation.set(hit * 0.12, hit * 0.07 * sx, hit * 0.1 * sx); } else { c.position.set(i % 2 ? 3.5 : -3.5, 0, z0); c.rotation.set(0, 0, 0); } });
        const sh = sk > 0.55 ? (hash(Math.floor(T * 30)) - 0.5) * 0.25 : 0;
        move(cam, [4.5, 2.4, 30], [0, 7, -30], [5.5, 2.0, 27], [0, 5.5 + sh, -30], sk, 42); SC.level1.rainUpdate(T, 0, 10);
      } else {
        const l = lt - SC.level1.b[1];
        guards.forEach((g, i) => { const k = clamp((l - 0.25 - i * 0.22) / 0.22); g.g.scale.setScalar(k <= 0 ? 0.001 : 1 + Math.sin(k * Math.PI) * 0.25); g.reset(); g.armR.rotation.x = -1.5; g.armR.rotation.z = -0.1; g.body.position.y = Math.sin(clamp(k) * Math.PI) * 0.8; });
        for (const c of [cobb, arthur]) { c.reset(); c.body.rotation.x = 0.3; c.legL.rotation.x = -0.9; c.legR.rotation.x = -0.9; c.body.position.y = -0.55; }
        cobb.head.rotation.y = 1.6 + Math.sin(T * 3) * 0.3; arthur.head.rotation.y = -1.4;
        move(cam, [-5, 11, 33], [6.5, 2.2, -3], [-4, 9.5, 29], [7, 2.4, -3], sk, 44); SC.level1.rainUpdate(T, 0, 0);
      }
    }
  };
}

// ============ LEVEL 2 (hotel) ============
{
  const { s, cam } = mkScene(0x1a120c, [30, 90], 0xffe2b0, 0.9, [0xffe8c8, 0x7a5a40, 1.7], [0, 10, 20]);
  s.userData.sun.castShadow = false;
  const cor = new THREE.Group(); s.add(cor); const Hh = 4.2, L = 80;
  const carpet = tex(64, 64, c => { c.fillStyle = '#7a1f24'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#b8862f'; c.fillRect(0, 0, 64, 5); c.fillRect(28, 28, 8, 8); c.fillRect(0, 59, 64, 5); }); carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(4, 40);
  const pl = (w, h, m, x, y, z, rx, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); p.receiveShadow = true; cor.add(p); return p; };
  pl(Hh * 2, L, new THREE.MeshLambertMaterial({ map: carpet }), 0, -Hh, -L / 2 + 20, -Math.PI / 2, 0);
  pl(Hh * 2, L, M(0xe9dcc0), 0, Hh, -L / 2 + 20, Math.PI / 2, 0);
  const wall = tex(64, 64, c => { c.fillStyle = '#d9c7a0'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#6b4a2e'; c.fillRect(0, 44, 64, 20); c.fillStyle = '#8a6238'; c.fillRect(0, 42, 64, 4); }); wall.wrapS = THREE.RepeatWrapping; wall.repeat.set(20, 1);
  pl(L, Hh * 2, new THREE.MeshLambertMaterial({ map: wall }), -Hh, 0, -L / 2 + 20, 0, Math.PI / 2); pl(L, Hh * 2, new THREE.MeshLambertMaterial({ map: wall }), Hh, 0, -L / 2 + 20, 0, -Math.PI / 2);
  for (let z = 14; z > -60; z -= 9) { for (const sx of [-1, 1]) { box(0.16, 5.6, 3, 0x4a2f1b, sx * (Hh - 0.08), -Hh + 2.8, z, cor); box(0.2, 0.3, 0.3, 0xd9b24a, sx * (Hh - 0.2), -Hh + 2.7, z + 1.1, cor); } box(1.6, 0.25, 1.6, new THREE.MeshBasicMaterial({ color: 0xfff1c9 }), 0, Hh - 0.13, z - 4, cor); const p = new THREE.PointLight(0xffd9a0, 14, 16); p.position.set(0, Hh - 1.2, z - 4); if (z > -30) cor.add(p); }
  box(Hh * 2, Hh * 2, 0.4, 0x3a2416, 0, 0, -60, cor);
  const arthur = makeChar('arthur', 'serious'), guard = makeChar('guard', 'surprised'); s.add(arthur.g, guard.g);
  SC.level2 = {
    s, cam, update(lt, dur, T, si, sk) {
      arthur.reset(); guard.reset();
      if (si === 0) {
        cor.rotation.z = lt * 1.5;
        put(arthur, Math.sin(lt * 1.5) * -1.2, -Hh, 4, 0.0); arthur.walk(T * 13, 1.0); arthur.body.rotation.x = 0.2; arthur.g.rotation.z = -0.25;
        put(guard, 1.4 + Math.sin(T * 2) * 0.6, -0.6 + Math.sin(T * 1.3), -4); guard.g.rotation.set(T * 2.4, T * 1.1, T * 1.7); guard.armL.rotation.z = -2 + Math.sin(T * 9) * 0.5; guard.armR.rotation.z = 2 + Math.cos(T * 9) * 0.5; guard.legL.rotation.x = Math.sin(T * 8) * 0.8; guard.legR.rotation.x = -Math.sin(T * 8) * 0.8;
        move(cam, [0, -0.8, 21], [0, -1.2, 0], [0, -1.2, 17], [0, -1.6, 0], sk, 40, Math.sin(lt * 1.2) * 0.12);
      } else {
        const l = lt - SC.level2.b[1]; cor.rotation.z = Math.sin(T * 1.4) * 0.07;
        put(arthur, -1.5, Hh, 2, 0.9); arthur.g.rotation.z = Math.PI; put(guard, 1.5, Hh, 2, -0.9); guard.g.rotation.z = Math.PI;
        // world-upside-down: flip so they stand on the ceiling facing each other
        arthur.g.rotation.set(0, -0.9, Math.PI); guard.g.rotation.set(0, 0.9, Math.PI);
        const p = (l * 2.6) % 1, punch = Math.sin(clamp(p * 2.2) * Math.PI);
        arthur.armL.rotation.x = -1.1 - punch * 0.6; arthur.armR.rotation.x = -0.9; arthur.body.rotation.x = punch * 0.2; arthur.g.position.x = -1.5 - punch * 0.5 + 0.3;
        guard.body.rotation.x = -punch * 0.35; guard.head.rotation.x = -punch * 0.5; guard.armL.rotation.z = -1 - punch; guard.armR.rotation.z = 1 + punch; guard.g.position.x = 1.5 - punch * 0.4;
        move(cam, [0.6, -2.6, 27], [0, 0.6, 2], [0, -2.2, 23], [0, 0.9, 2], sk, 40, 0.08);
      }
    }
  };
}

// ============ LEVEL 3 (snow fortress) ============
{
  const { s, cam } = mkScene(0xdfe9f2, [40, 220], 0xffffff, 2.3, [0xffffff, 0xb8c4d2, 1.6]);
  ground(s, 500, '#eef3f8', '#f8fbfd');
  const r = rng(8);
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(40 + r() * 30, 70 + r() * 50, 4), M(i % 2 ? 0xc6d2de : 0xb4c2d0)); m.position.set((i - 4) * 45 + r() * 20, 30, -150 - r() * 40); m.rotation.y = r() * 3; s.add(m); const c = new THREE.Mesh(new THREE.ConeGeometry(16, 28, 4), M(0xffffff)); c.position.set(m.position.x, m.position.y + m.geometry.parameters.height / 2 - 13, m.position.z); c.rotation.y = m.rotation.y; s.add(c); }
  for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 120, z = 10 - r() * 80; if (Math.abs(x) < 9) continue; const g = new THREE.Group(); g.position.set(x, 0, z); s.add(g); box(0.8, 2, 0.8, 0x5a3d26, 0, 1, 0, g); for (let k = 0; k < 3; k++) { box(4 - k * 1.1, 1.6, 4 - k * 1.1, 0x2f6b45, 0, 2.6 + k * 1.6, 0, g); box(4.1 - k * 1.1, 0.35, 4.1 - k * 1.1, 0xffffff, 0, 3.5 + k * 1.6, 0, g); } }
  // fortress
  const F = new THREE.Group(); F.position.set(0, 0, -62); s.add(F);
  box(60, 6, 30, 0xe6edf3, 0, 3, -6, F); box(34, 16, 16, 0x8d949c, 0, 14, -8, F); box(12, 24, 12, 0x7b828a, -18, 18, -8, F); box(12, 24, 12, 0x7b828a, 18, 18, -8, F); box(36, 1, 18, 0xffffff, 0, 22.5, -8, F); box(13, 1, 13, 0xffffff, -18, 30.5, -8, F); box(13, 1, 13, 0xffffff, 18, 30.5, -8, F);
  for (let i = -3; i <= 3; i++) if (i) box(2, 1.2, 0.3, 0x22262b, i * 4.2, 19, 0.1, F);
  const door = new THREE.Group(); door.position.set(0, 12.5, 0.4); F.add(door);
  const steel = new THREE.MeshPhongMaterial({ color: 0xaab3bd, shininess: 60, flatShading: true });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 1, 20), M(0x4b5158)); ring.rotation.x = Math.PI / 2; door.add(ring);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 1.4, 20), steel); disc.rotation.x = Math.PI / 2; door.add(disc);
  const wheel = new THREE.Group(); wheel.position.z = 0.9; door.add(wheel); for (let i = 0; i < 4; i++) { const b = box(6.4, 0.5, 0.4, 0x2d3238, 0, 0, 0, wheel); b.rotation.z = i * Math.PI / 4; } box(1.4, 1.4, 0.6, 0x2d3238, 0, 0, 0.1, wheel);
  const tagv = label('IDEA INSIDE', { h: 1.6, bg: '#ffd24a', color: '#14161c' }); tagv.position.set(0, 20.6, -58); s.add(tagv);
  const SN = 900, sp = new Float32Array(SN * 3), snow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, fog: false })); snow.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3)); snow.frustumCulled = false; s.add(snow);
  const sk1 = makeChar('cobb', 'serious'), sk2 = makeChar('eames', 'joy'); s.add(sk1.g, sk2.g);
  for (const c of [sk1, sk2]) { box(0.5, 0.12, 5, 0xd03a2e, 0, -2.05, 0.6, c.legL); box(0.5, 0.12, 5, 0xd03a2e, 0, -2.05, 0.6, c.legR); box(0.12, 3.2, 0.12, 0x222, 0, -2.4, 0.5, c.armL); box(0.12, 3.2, 0.12, 0x222, 0, -2.4, 0.5, c.armR); }
  SC.level3 = {
    s, cam, update(lt, dur, T, si, sk) {
      const cz = si === 0 ? 10 : -30;
      for (let i = 0; i < SN; i++) sp.set([(hash(i) - 0.5) * 70 + Math.sin(T + i) * 0.8, 30 - ((T * 5 + hash(i + 0.3) * 30) % 30), cz + (hash(i + 0.6) - 0.5) * 70], i * 3); snow.geometry.attributes.position.needsUpdate = true;
      wheel.rotation.z = T * 0.8; setPop(tagv, 0);
      [sk1, sk2].forEach((c, i) => { c.reset(); const ph = lt * 2.4 + i * 1.7; put(c, (i ? 3.2 : -3.2) + Math.sin(ph) * 2.6, 0.12, lerp(-38, 9, lt / SC.level3.b[1]) - i * 7, Math.cos(ph) * 0.45); c.g.rotation.z = -Math.cos(ph) * 0.22; c.body.rotation.x = 0.3; c.legL.rotation.x = c.legR.rotation.x = -0.3; c.armL.rotation.x = c.armR.rotation.x = -0.7; c.armL.rotation.z = -0.35; c.armR.rotation.z = 0.35; c.g.visible = si === 0; });
      if (si === 0) move(cam, [0, 4.6, 26], [0, 9, -30], [1.5, 4.0, 22], [0, 7.5, -30], sk, 42);
      else { move(cam, [0, 9, -16], [0, 13.5, -62], [0, 11.5, -36], [0, 13.2, -62], sk, 42); setPop(tagv, (lt - SC.level3.b[1] - 0.5) / 0.3); }
    }
  };
}

// ============ MAL ============
{
  const { s, cam } = mkScene(0x16040a, [18, 70], 0xff6a6a, 0.6, [0xff8a8a, 0x200508, 0.55]);
  ground(s, 200, '#14070a', '#1d0a0e');
  const sp = new THREE.SpotLight(0xfff0e6, 420, 40, 0.42, 0.5); sp.position.set(0, 18, 5); sp.target.position.set(0, 2, 0); sp.castShadow = true; s.add(sp, sp.target);
  const rim = new THREE.PointLight(0xff3040, 80, 30); rim.position.set(-4, 6, -6); s.add(rim);
  const mal = put(makeChar('mal', 'smirk'), 0, 0, 0), cobb = put(makeChar('cobb', 'serious'), -2.6, 0, 10.5, Math.PI + 0.25); s.add(mal.g, cobb.g);
  const GN = 90, gl = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), GN); s.add(gl); const dm = new THREE.Object3D(), col = new THREE.Color();
  const errs = [['SERVER CRASHED', -2.4, 9.2, -3], ['CONNECTION LOST', 2.2, 7.4, -4], ['ERROR 404: EXIT', -1.2, 1.2, 3]].map(([t, x, y, z]) => { const l = label(t, { h: 0.62, bg: '#b3121c', color: '#fff' }); l.position.set(x, y, z); s.add(l); return l; });
  const stay = label('STAY.', { h: 0.55, bg: '#fff', color: '#b3121c' }); stay.position.set(0, 6.6, 0.5); s.add(stay);
  SC.mal = {
    s, cam, update(lt, dur, T, si, sk) {
      const q = Math.floor(T * 10); mal.reset(); mal.idle(T); mal.head.rotation.z = 0.14; cobb.reset(); cobb.idle(T);
      for (let i = 0; i < GN; i++) { const h = n => hash(i * 7.3 + n + (hash(i) < 0.4 ? q : Math.floor(q / 4))); dm.position.set((h(1) - 0.5) * 26, h(2) * 16, -4 - h(3) * 18 + (i % 9 === 0 ? 10 : 0)); dm.scale.set(0.3 + h(4) * 2.4, 0.15 + h(5) * 0.7, 0.3); dm.updateMatrix(); gl.setMatrixAt(i, dm.matrix); gl.setColorAt(i, col.set(h(6) < 0.6 ? 0xb3121c : h(6) < 0.85 ? 0x3a0508 : 0xff5a66)); }
      gl.instanceMatrix.needsUpdate = true; gl.instanceColor.needsUpdate = true;
      errs.forEach((e, i) => e.visible = si === 0 && lt > 0.5 + i * 0.5 && hash(q + i * 3) > 0.25);
      mal.g.position.x = hash(q) > 0.86 ? 0.25 : 0; setPop(stay, 0);
      if (si === 0) { cobb.g.visible = true; move(cam, [1.2, 5.6, 21], [-0.4, 4.4, 0], [0.6, 5.2, 17], [-0.4, 4.4, 0], sk, 38); }
      else { cobb.g.visible = false; mal.face('menace'); mal.armR.rotation.x = -1.45 * ease((lt - SC.mal.b[1]) / 0.6); move(cam, [1.0, 4.9, 8.6], [0, 5.0, 0], [0.5, 4.9, 7.2], [0, 5.0, 0], sk, 38, Math.sin(T * 0.9) * 0.04); setPop(stay, (lt - SC.mal.b[1] - 0.7) / 0.3); }
    }
  };
}

// ============ GOODBYE (limbo shore) ============
{
  const { s, cam } = mkScene(0xf3a25a, [40, 240], 0xffc98a, 2.6, [0xffd9b0, 0x8a5a4a, 1.3], [-6, 10, -24]);
  ground(s, 400, '#d9c095', '#e2caa0');
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), M(0x3f7396)); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.05, -170); s.add(sea);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(26, 32), new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false })); sun.position.set(-8, 30, -280); s.add(sun);
  const r = rng(13); const tw = [];
  for (let i = 0; i < 16; i++) { const h = 20 + r() * 45, b = box(8 + r() * 8, h, 8 + r() * 8, 0xa98a78, (r() - 0.5) * 260, h / 2 - 3, -110 - r() * 120, s); b.rotation.z = (r() - 0.5) * 0.35; b.castShadow = false; tw.push(b); }
  const cobb = put(makeChar('cobb', 'sad'), -1.7, 0, 0, 1.0), mal = put(makeChar('mal', 'sad'), 1.7, 0, 0, -1.0); s.add(cobb.g, mal.g);
  const PN = 320, pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), PN); s.add(pm); const dm = new THREE.Object3D(), col = new THREE.Color();
  const parts = []; const pr = rng(4);
  for (let i = 0; i < PN; i++) { const y = pr() * 5.3; const c = y > 4.9 ? 0x2b1b14 : y > 4.0 ? (pr() < 0.5 ? 0x2b1b14 : 0xf0cdb0) : y > 0.9 ? (Math.abs(pr() - 0.5) > 0.33 ? 0xf0cdb0 : 0x101014) : 0xf0cdb0; const w = y > 4 ? 0.65 : y > 2 ? 1.9 : 1.0; parts.push({ x: (pr() - 0.5) * 2 * w, y, z: (pr() - 0.5) * 1.0, d: pr(), s: pr() }); pm.setColorAt(i, col.set(c)); }
  SC.goodbye = {
    s, cam, update(lt, dur, T, si, sk) {
      cobb.reset(); mal.reset(); cobb.idle(T); mal.idle(T + 2);
      const l = si === 1 ? (lt - SC.goodbye.b[1]) : -1, dk = clamp(l / 1.9);
      mal.g.visible = dk < 0.12; pm.visible = dk > 0.06;
      for (let i = 0; i < PN; i++) { const p = parts[i], k = clamp((dk - p.d * 0.45 - (5.3 - p.y) * 0.03) / 0.55), e = k * k; dm.position.set(1.7 + p.x * 0.6 + e * (1.5 + p.s * 3.5), p.y + e * (2.5 + p.s * 5), p.z + e * (p.s - 0.5) * 4); dm.rotation.set(e * 6 * p.s, e * 5, 0); dm.scale.setScalar(0.36 * (1 - k * k * k)); dm.updateMatrix(); pm.setMatrixAt(i, dm.matrix); }
      pm.instanceMatrix.needsUpdate = true;
      if (si === 0) { cobb.armR.rotation.x = -1.0 * ease(sk); mal.armL.rotation.x = -1.0 * ease(sk); move(cam, [0, 3.2, 28], [0, 4.2, 0], [0, 3.6, 23], [0, 4.0, 0], sk, 36); }
      else { cobb.armR.rotation.x = -1.0 * (1 - ease(dk * 1.4)); cobb.head.rotation.x = 0.4 * ease(dk); move(cam, [0, 3.6, 23], [0, 4.0, 0], [0.6, 4.4, 21], [0.8, 4.8, 0], sk, 36); }
    }
  };
}

// ============ VAULT ============
{
  const { s, cam } = mkScene(0xf4f6f9, [30, 110], 0xffffff, 1.8, [0xffffff, 0xd8dde6, 1.7], [-8, 24, -10]);
  ground(s, 120, '#e6eaef', '#f2f5f8');
  for (let i = -3; i <= 3; i++) { box(0.4, 30, 0.4, 0xd5dbe3, i * 6, 15, 22, s); }
  box(60, 30, 1, 0xeef1f5, 0, 15, 23, s);
  box(2.4, 2.6, 2.4, 0xcfd6de, 0, 1.3, 0, s);
  const dio = new THREE.Group(); dio.position.set(0, 2.6, 0); s.add(dio);
  box(2.0, 0.25, 2.0, 0x4caf50, 0, 0.13, 0, dio); box(0.5, 0.4, 0.5, 0xe24b3b, -0.5, 0.45, 0.4, dio); box(0.5, 0.75, 0.5, 0x3b82e2, 0.05, 0.62, 0.05, dio); box(0.5, 1.1, 0.5, 0xf2c230, 0.6, 0.8, -0.3, dio); box(0.06, 0.8, 0.06, 0x333, 0.6, 1.7, -0.3, dio); box(0.45, 0.28, 0.04, 0xe24b3b, 0.84, 1.95, -0.3, dio);
  const glow = new THREE.PointLight(0xffe08a, 30, 14); glow.position.set(0, 4.2, 0); s.add(glow);
  const plq = label(['MY FIRST GAME', 'by Robert + Dad'], { h: 0.26, bg: '#fff8e0', color: '#5a4520', border: '#d9b24a' }); plq.position.set(0, 1.5, -1.6); s.add(plq);
  const fis = makeChar('fischer', 'surprised'); s.add(fis.g);
  const bulb = new THREE.Group(); s.add(bulb); box(0.9, 0.9, 0.9, new THREE.MeshBasicMaterial({ color: 0xffe14a }), 0, 0.45, 0, bulb); box(0.5, 0.4, 0.5, 0x8a8f96, 0, -0.2, 0, bulb); for (let i = 0; i < 8; i++) { const b = box(0.12, 0.5, 0.12, new THREE.MeshBasicMaterial({ color: 0xffe14a }), Math.sin(i * 0.785) * 1.1, 0.45 + Math.cos(i * 0.785) * 1.1, 0, bulb); b.rotation.z = -i * 0.785; }
  const CN = 160, conf = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }), CN); s.add(conf); const dm = new THREE.Object3D(), col = new THREE.Color(); const cc = [0xe24b3b, 0x3b82e2, 0xf2c230, 0x4caf50, 0xd98aa0]; for (let i = 0; i < CN; i++) conf.setColorAt(i, col.set(cc[i % 5]));
  SC.vault = {
    s, cam, update(lt, dur, T, si, sk) {
      fis.reset(); dio.rotation.y = T * 0.5; bulb.visible = false; conf.visible = false; glow.intensity = 30 + Math.sin(T * 5) * 6;
      if (si === 0) { const k = clamp(sk * 1.25); put(fis, 0, 0, lerp(17, 3.4, ease(k)), Math.PI); if (k < 1) fis.walk(T * 7, 0.6); else { fis.idle(T); fis.head.rotation.x = 0.25; } fis.face('surprised'); move(cam, [3.2, 5.2, -11], [0, 3.6, 2], [1.6, 4.4, -6.5], [0, 3.6, 1.5], sk, 38); }
      else if (si === 1) { put(fis, 0, 0, 3.4, Math.PI); fis.idle(T); fis.face('surprised'); const l = lt - SC.vault.b[1]; bulb.visible = true; bulb.position.set(0, 6.3, 3.4); bulb.scale.setScalar(Math.max(0.001, 0.9 * (clamp(l / 0.2) + Math.sin(clamp(l / 0.4) * Math.PI) * 0.4))); bulb.rotation.z = Math.sin(T * 6) * 0.1; move(cam, [1.4, 5.6, -5.0], [0, 5.9, 3.4], [1.0, 5.6, -4.2], [0, 5.9, 3.4], sk, 38); }
      else {
        const l = lt - SC.vault.b[2]; put(fis, 0, Math.abs(Math.sin(l * 7)) * 0.7, 3.4, Math.PI); fis.face('joy'); fis.armL.rotation.z = -2.6 + Math.sin(T * 12) * 0.2; fis.armR.rotation.z = 2.6 - Math.sin(T * 12) * 0.2;
        conf.visible = true; for (let i = 0; i < CN; i++) { dm.position.set((hash(i) - 0.5) * 12, 14 - ((l * (4 + hash(i + 9) * 4) + hash(i + 3) * 14) % 14), (hash(i + 5) - 0.5) * 10 + 2); dm.rotation.set(T * 5 + i, T * 3 + i, i); dm.updateMatrix(); conf.setMatrixAt(i, dm.matrix); } conf.instanceMatrix.needsUpdate = true;
        move(cam, [1.8, 3.6, -13.5], [0, 4.6, 2.5], [1.2, 3.8, -12], [0, 4.7, 2.5], sk, 40);
      }
    }
  };
}

// ============ KICK ============
{
  const { s, cam } = mkScene(0x6f7d8a, [40, 200], 0xdfeaf5, 1.8, [0xcfd9e4, 0x4a5560, 1.5]);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), M(0x2f5f7a)); sea.rotation.x = -Math.PI / 2; sea.position.y = -34; s.add(sea);
  box(16, 2.5, 200, 0x7d848c, -4, -1.25, 0, s); for (let z = -90; z < 90; z += 16) { box(4, 34, 4, 0x6b7279, -4, -19, z, s); } box(0.6, 2, 200, 0x555b62, 3.8, 1, -60 - 100, s);
  const v = van(); s.add(v);
  const spl = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M(0xdff1ff), 60); s.add(spl); const dm = new THREE.Object3D();
  // plane cabin
  const cab = new THREE.Group(); cab.position.set(300, 0, 0); s.add(cab);
  box(14, 0.5, 30, 0x39424f, 0, -0.25, -6, cab); box(0.5, 14, 30, 0xe9edf2, -6.5, 7, -6, cab); box(0.5, 14, 30, 0xe9edf2, 6.5, 7, -6, cab); box(14, 0.5, 30, 0xf4f6f9, 0, 11, -6, cab);
  for (let z = 2; z > -20; z -= 5) for (const sx of [-1, 1]) box(0.1, 2.2, 1.5, new THREE.MeshBasicMaterial({ color: 0xbfe4ff }), sx * 6.2, 5.6, z, cab);
  const cl = new THREE.PointLight(0xfff2dc, 70, 40); cl.position.set(0, 9, 6); cab.add(cl);
  const seats = [['cobb', 0.2, 0], ['arthur', -2.6, -5.5], ['ariadne', 2.8, -5.5], ['fischer', -0.2, -11]].map(([n, x, z], i) => { box(3.2, 1.0, 3, 0x7b5a3c, x, 1.5, z - 0.2, cab); box(3.2, 5.2, 0.8, 0x7b5a3c, x, 4.0, z - 1.5, cab); const c = put(makeChar(n, 'sleep'), x, 0.2, z + 0.4); c.g.position.y = 0.05; cab.add(c.g); return c; });
  SC.kick = {
    s, cam, update(lt, dur, T, si, sk) {
      if (si === 0) {
        const y = lerp(4, -30, Math.pow(sk, 1.6)); v.position.set(6 + sk * 3, y, 0); v.rotation.set(0.35 + sk * 0.8, 0.15, 0.1 + sk * 0.25);
        spl.visible = false; move(cam, [44, -2, 8], [7, y + 1, 0], [40, -14, 6], [8, y + 1, 0], sk, 40, 0.1);
      } else {
        const l = lt - SC.kick.b[1];
        seats.forEach((c, i) => { c.reset(); c.sit(); const aw = l > 0.25 + i * 0.22; c.face(aw ? 'surprised' : 'sleep'); c.head.rotation.x = aw ? -0.05 : 0.3; c.body.position.y = aw ? Math.sin(clamp((l - 0.25 - i * 0.22) / 0.25) * Math.PI) * 0.4 : 0; c.g.position.y = 2.0; });
        move(cam, [300.2, 9.5, 13], [300, 4.6, -4], [300.2, 8.6, 11], [300, 4.8, -4], sk, 40);
      }
    }
  };
}

// ============ HOME ============
{
  const { s, cam } = mkScene(0xbfe3ff, [60, 200], 0xfff0d0, 2.6, [0xfff4e0, 0x9a7a5a, 1.5], [6, 20, -30]);
  const wood = tex(64, 64, c => { c.fillStyle = '#b98a58'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#a97a4a'; c.fillRect(0, 0, 64, 3); c.fillRect(30, 0, 3, 64); }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(10, 10);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ map: wood })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, 8); fl.receiveShadow = true; s.add(fl);
  const g = ground(s, 200, '#63b356', '#6fc061', -0.05); g.position.z = -110;
  // back wall with big doorway
  const wc = 0xf2e6d2; box(14, 16, 0.8, wc, -13, 8, -12, s); box(14, 16, 0.8, wc, 12, 8, -12, s); box(12, 4.5, 0.8, wc, -0.5, 13.75, -12, s); box(0.8, 16, 40, wc, -20, 8, 8, s); box(0.8, 16, 40, wc, 19, 8, 8, s); box(40, 0.8, 40, 0xfaf3e6, 0, 16, 8, s);
  box(0.5, 11.5, 0.9, 0x8a6238, -6.4, 5.75, -12, s); box(0.5, 11.5, 0.9, 0x8a6238, 5.4, 5.75, -12, s); box(12.3, 0.5, 0.9, 0x8a6238, -0.5, 11.5, -12, s);
  const il = new THREE.PointLight(0xffd9a8, 90, 40); il.position.set(0, 11, 6); s.add(il);
  for (let i = 0; i < 7; i++) { const x = (hash(i + 70) - 0.5) * 70, z = -45 - hash(i + 71) * 40; box(1.2, 5, 1.2, 0x6a4a2e, x, 2.5, z, s); box(6, 6, 6, 0x3f9a4a, x, 7.5, z, s); }
  // table + top
  const TX = 3.2, TZ = 7; box(6.4, 0.35, 3.6, 0x8a5a34, TX, 2.9, TZ, s); for (const [x, z] of [[-2.9, -1.5], [2.9, -1.5], [-2.9, 1.5], [2.9, 1.5]]) box(0.35, 2.75, 0.35, 0x74492a, TX + x, 1.38, TZ + z, s);
  const top = makeTop(0.62); top.position.set(TX - 0.4, 3.08, TZ + 0.3); s.add(top);
  const cobb = makeChar('cobb', 'neutral'), boy = makeChar('boy', 'joy'), girl = makeChar('girl', 'joy'); boy.g.scale.setScalar(0.6); girl.g.scale.setScalar(0.66); s.add(cobb.g, boy.g, girl.g);
  const hud = label('LEAVING GAME…', { h: 0.42, bg: '#14161c', color: '#7dffb0', border: '#7dffb0' }); s.add(hud);
  SC.home = {
    s, cam, update(lt, dur, T, si, sk) {
      const b = SC.home.b, meet = clamp(lt / (b[1] - 0.2));
      cobb.reset(); boy.reset(); girl.reset(); setPop(hud, 0);
      const wk = ease(clamp(meet * 1.15)); put(cobb, lerp(-5, -0.8, wk), 0, lerp(6, -13.5, wk), Math.PI); if (wk < 1) cobb.walk(T * 7, 0.6); else cobb.idle(T);
      cobb.face(meet > 0.35 ? 'joy' : 'neutral');
      const turn = ease(clamp((meet - 0.3) / 0.2)), run = ease(clamp((meet - 0.5) / 0.45));
      [[boy, -3.5, -26, -2.6], [girl, 2.5, -24, 1.0]].forEach(([k, x0, z0, x1], i) => { put(k, lerp(x0, x1, run), 0, lerp(z0, -16.3, run), Math.PI * (1 - turn)); if (run > 0 && run < 1) k.walk(T * 13 + i, 0.9); else if (run >= 1) { k.g.position.y = Math.abs(Math.sin(T * 6 + i * 1.3)) * 0.7; k.armL.rotation.z = -2.5; k.armR.rotation.z = 2.5; } else { k.body.rotation.x = 0.5 * (1 - turn); } k.face(turn > 0.5 ? 'joy' : 'neutral'); });
      if (run >= 1) { cobb.armL.rotation.z = -0.9; cobb.armR.rotation.z = 0.9; cobb.armL.rotation.x = cobb.armR.rotation.x = -0.6; cobb.head.rotation.x = 0.25; }
      const wob = lt < b[1] ? 0.03 : 0.03 + clamp((lt - b[1]) / (dur + 1.6 - b[1])) * 0.2; top.userData.set(T, wob);
      const tp = [TX - 0.4, 3.6, TZ + 0.3];
      if (lt >= dur) move(cam, [TX + 1.8, 4.3, TZ + 4.4], tp, [TX + 0.9, 4.0, TZ + 3.0], tp, (lt - dur) / 1.6, 32);
      else if (si === 0) move(cam, [-1.5, 6.5, 22], [-0.6, 3.6, -10], [-0.8, 5.2, 12], [-0.6, 3.4, -12], sk, 38);
      else if (si === 1) move(cam, [TX + 2.6, 4.5, TZ + 5.6], tp, [TX + 1.9, 4.3, TZ + 4.6], tp, sk, 32);
      else if (si === 2) move(cam, [TX + 2.4, 3.9, TZ + 5.2], [-0.4, 3.2, -10], [TX + 1.6, 3.9, TZ + 5.6], [-0.6, 3.2, -12], sk, 30);
      else { move(cam, [3.6, 5.6, -24.5], [-0.8, 4.4, -13.5], [3.0, 5.4, -23], [-0.8, 4.5, -13.5], sk, 36); hud.position.set(-0.8, 6.9, -13.5); setPop(hud, (lt - b[3] - 0.45) / 0.3); cobb.head.rotation.x = 0; }
    }
  };
}
const black = (() => { const { s, cam } = mkScene(0x000000); return { s, cam, update() { } }; })();

// ---------- timeline driver ----------
for (const sc of TL.scenes) { SC[sc.id].b = sc.sents.map((x, i) => i ? x.start - 0.12 - sc.start : 0); SC[sc.id].tl = sc; }
const cap = document.getElementById('cap'), title = document.getElementById('title'), slam = document.getElementById('slam'), flash = document.getElementById('flash'), endc = document.getElementById('end');
const chunks = [];
for (const sc of TL.scenes) for (const st of sc.sents) {
  const words = st.text.split(' '), groups = []; let cur = [];
  for (const w of words) { if (cur.length && (cur.join(' ') + ' ' + w).length > 14) { groups.push(cur.join(' ')); cur = []; } cur.push(w); if (cur.length >= 3 || /[.,?:!]$/.test(w)) { groups.push(cur.join(' ')); cur = []; } }
  if (cur.length) groups.push(cur.join(' '));
  const tot = groups.reduce((a, g) => a + g.length + 2, 0); let t = st.start;
  for (const g of groups) { const d = (st.end - st.start) * (g.length + 2) / tot; chunks.push({ text: g.replace(/[.,:]$/, '').replace(/-/g, '\u2011'), a: t, b: t + d }); t += d; }
}
const SLAMS = { level1: 'LEVEL 1', level2: 'LEVEL 2', level3: 'LEVEL 3', kick: 'THE KICK' };
const last = TL.scenes[TL.scenes.length - 1], endCut = last.end + 1.6;

window.TOTAL = TL.total; window.FPS = TL.fps;
window.renderAt = (T) => {
  let S, lt = T, dur = TL.lead, si = 0, sk = 0, id = 'title';
  if (T < TL.lead) S = SC.title;
  else if (T >= endCut) { S = black; id = 'end'; }
  else {
    const sc = TL.scenes.find(s => T < s.end) || last; id = sc.id; S = SC[id]; lt = T - sc.start; dur = sc.end - sc.start;
    const b = S.b; si = b.length - 1; while (si > 0 && lt < b[si]) si--;
    const e = si + 1 < b.length ? b[si + 1] : dur; sk = clamp((lt - b[si]) / (e - b[si]));
  }
  S.update(lt, dur, T, si, sk);
  renderer.render(S.s, S.cam);
  // overlays
  const c = chunks.find(c => T >= c.a - 0.02 && T < c.b - 0.02) ;
  if (c) { cap.style.display = 'block'; cap.textContent = c.text; const k = clamp((T - c.a + 0.02) / 0.1); cap.style.transform = `translate(-50%,-50%) scale(${0.86 + 0.14 * ease(k)})`; } else cap.style.display = 'none';
  title.style.display = id === 'title' ? 'block' : 'none'; if (id === 'title') { const k = clamp((T - 0.15) / 0.35); title.style.opacity = Math.min(k, clamp((TL.lead - T) / 0.2)); title.style.transform = `translate(-50%,0) scale(${1.25 - 0.25 * ease(k)})`; }
  const sl = SLAMS[id]; if (sl && lt < 1.05) { slam.style.display = 'block'; slam.textContent = sl; const k = clamp(lt / 0.16); slam.style.transform = `translate(-50%,-50%) scale(${2.2 - 1.2 * ease(k)}) rotate(-4deg)`; slam.style.opacity = Math.min(1, clamp((1.05 - lt) / 0.15)); } else slam.style.display = 'none';
  let f = 0; if (id !== 'title' && id !== 'end') f = Math.max(f, 1 - lt / 0.12) * 0.55; if (id === 'kick' && si === 1) f = Math.max(f, 1 - (lt - SC.kick.b[1]) / 0.35);
  flash.style.opacity = clamp(f);
  endc.style.display = id === 'end' ? 'block' : 'none'; if (id === 'end') endc.style.opacity = clamp((T - endCut - 0.7) / 0.5);
};
window.READY = true;
