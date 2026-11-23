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
