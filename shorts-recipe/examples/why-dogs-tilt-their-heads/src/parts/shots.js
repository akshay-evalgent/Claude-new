// =====================================================================
// SHOTS: "Why Dogs Tilt Their Heads"
// =====================================================================
const DS = 0.62, END = C.end;
const GOLD = {}, BLACK = { base: '#2c2522', light: '#463a34', seed: 9, iris: [0xb07a3a, 0x5a3818], snout: 1.05 };
const SIDE = 1;   // our golden's favourite side: its left (positive tilt)
// a head tilt that springs in, holds and eases out
function tiltEnv(t, t0, hold, amt = 0.5) { const a = t - t0; if (a <= 0) return 0; const up = a < 0.4 ? 1 - Math.exp(-a * 9) * Math.cos(a * 16) : 1; const down = hold > 0 ? 1 - smooth(hold, hold + 0.35, a) : 1; return amt * up * down; }
const blinkAt = (t, seed = 0) => { const P = 3.1 + seed * 0.37, a = (((t + seed * 1.13) % P) + P) % P; return a < 0.16 ? Math.sin(Math.PI * a / 0.16) : 0; };
// pose one dog for a frame. tiltFn(t) gives the tilt so the ears can trail it
function dogAct(d, t, { stand = 0, look = null, tiltFn = () => 0, perk = 0, brow = 0, lid = 0.02, wag = 0.45, wagSpeed = 2.4, mouth = 0, pant = 0, blink = 0, maxPitch = 0.9, k = 1 } = {}) {
  const u = d.userData, tl = tiltFn(t); u.pose(stand); u.solve().breathe(t, pant ? 0.035 : 0.02, pant ? 2.2 : 0.4);
  u.earsSet(perk, earSwing(tiltFn, t) * 0.9 + 0.04 * Math.sin(t * 7) * pant);
  u.wag(t, wagSpeed, wag);
  if (look) u.look(look, k, tl, 1.2, maxPitch).gaze(look); else u.head.rotation.z = -tl;
  u.lid(clamp(lid + 0.95 * blinkAt(t, blink))).brows(brow + 0.6 * Math.abs(tl), 0.6 * tl).mouth(mouth); if (pant) u.pant(pant);
  u.tagSwing(0.4 * (earSwing(tiltFn, t) - tl) + 0.05 * Math.sin(t * 9) * pant);
  return u;
}
function ownerKneel(O, t, x, z, ry, { pet = null, look = null, left = null } = {}) {
  const ou = O.userData; ou.reset(); O.rotation.set(0, ry, 0); O.position.set(x, -0.62, z);
  ou.legs.forEach((L, i) => { L.hip.rotation.set(-0.15, (i ? 1 : -1) * 0.1, 0); L.knee.rotation.x = 1.75; L.ankle.rotation.x = 0.6; });
  ou.breathe(t, 0.3, 0.025); const q = O.quaternion;
  if (pet) { ik2(O, ou.arms[1], pet, V(0.3, -1, 0.3).applyQuaternion(q)); ou.hands[1].curl(0.35); } else ik2(O, ou.arms[1], worldPt(O, V(0.45, 1.5, 0.35)), V(1, -0.6, -0.4).applyQuaternion(q));
  ik2(O, ou.arms[0], left || worldPt(O, V(-0.42, 1.45, 0.4)), V(-1, -0.6, -0.4).applyQuaternion(q)); ou.hands[0].curl(0.4);
  if (look) { const hp = ou.head.getWorldPosition(new THREE.Vector3()), d = O.worldToLocal(look.clone()).sub(O.worldToLocal(hp.clone())); ou.head.rotation.y += clamp(Math.atan2(d.x, d.z), -0.8, 0.8); ou.head.rotation.x += clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 0.5); }
  return ou;
}
function checkPlane(w = 0.4) {
  const t = canvasTex(256, 256, (g) => { g.fillStyle = '#2fbf5a'; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 30; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(74, 132); g.lineTo(112, 172); g.lineTo(184, 88); g.stroke(); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); m.userData.dofMap = t; return m;
}
// keep an overlay (bubble, ring, tick) fixed in the frame: x, y in view units, d = distance in front of the lens
function pin(cam, m, x, y, d = 1.4) { cam.updateMatrixWorld(true); m.position.copy(cam.localToWorld(V(x, y, -d))); m.quaternion.copy(cam.quaternion); }
function homeDog(s, o = GOLD) { const R = livingRoom(s.scene); const d = makeDog(o); d.scale.setScalar(DS); s.scene.add(d); return { R, d, u: d.userData }; }

// ---------------------------------------------------------------------
// 0 + 14) your POV from the sofa: the dog looks up at you; "…who wants a walk?" → the tilt.
// Both shots run on tau = seconds from the loop point, so the last and first frames match.
// ---------------------------------------------------------------------
const POVD = { pos: V(0.42, 0, 3.05), cam: V(0.36, 2.62, 4.95) };
function povShot(s, tauOf) {
  const { R, d, u } = homeDog(s); s.ap = 6; s.exposure = 1.02; s.bloom = 0.4;
  const tTilt = (tau) => SIDE * tiltEnv(tau, 0.1, 9, 0.5);
  s.update = (t) => {
    const tau = tauOf(t); R.update(t);
    const cp = POVD.cam.clone().add(V(0, -0.03, -0.06).multiplyScalar(tau + 1.8));
    d.position.copy(POVD.pos); d.rotation.set(0, 0.05, 0);
    const ask = smooth(-1.42, -1.22, tau), walk = smooth(-0.42, -0.2, tau);
    dogAct(d, tau, { look: cp, tiltFn: tTilt, perk: 0.25 + 0.35 * ask + 0.3 * walk, brow: 0.2 + 0.3 * ask + 0.3 * walk, lid: 0.04 - 0.04 * walk, wag: 0.35 + 0.35 * walk, wagSpeed: 2.2 + 1.5 * walk, blink: 2, maxPitch: 1.1 });
    shoot(s.cam, cp, u.eyeW().add(V(0, -0.35, 0)), { fov: 40, t: tau, focus: cp.distanceTo(u.eyeW()), hand: 0.7 });
  };
}
shot(0, C.and, (s) => povShot(s, t => t));

// 1) and it's not just to look cute: seen through your phone's camera; snap, flash, hearts ----------
function phoneUI(w = 0.62) {
  const cv = canvasDyn(600, 1066); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 1066 / 600), new THREE.MeshBasicMaterial({ map: cv.t, transparent: true, depthWrite: false, toneMapped: false })); m.userData.dofMap = cv.t;
  m.userData.draw = (flash, rec) => { const g = cv.g; g.clearRect(0, 0, 600, 1066);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, 600, 90); g.fillRect(0, 900, 600, 166);
    g.fillStyle = '#ffffff'; g.font = '600 30px Arial'; g.textAlign = 'center'; g.fillText('PHOTO', 300, 950); g.fillStyle = '#ffd23f'; g.fillText('●', 300, 885);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(300, 1010, 44, 0, 7); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(300, 1010, 54, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(255,214,63,0.95)'; g.lineWidth = 5; const fx = 300, fy = 470, fs = 120 - 20 * rec; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { g.beginPath(); g.moveTo(fx + a * fs, fy + b * (fs - 30)); g.lineTo(fx + a * fs, fy + b * fs); g.lineTo(fx + a * (fs - 30), fy + b * fs); g.stroke(); });
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; [200, 400].forEach(x => { g.beginPath(); g.moveTo(x, 90); g.lineTo(x, 900); g.stroke(); }); [360, 630].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(600, y); g.stroke(); });
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, 600, 1066); }
    cv.t.needsUpdate = true; };
  return m;
}
shot(C.and, C.in_, (s) => {
  const { R, d, u } = homeDog(s); const ui = phoneUI(); s.scene.add(ui); const hearts = heartBurst(s.scene, 10, 3); s.ap = 5; s.exposure = 1.02; s.bloom = 0.45;
  const snaps = [C.not + 0.02, C.look + 0.02];
  s.update = (t) => {
    R.update(t); d.position.copy(POVD.pos); d.rotation.set(0, 0.05, 0);
    const c = E.io(seg(t, C.and - 0.2, C.in_ + 0.3)), cp = lv(V(0.4, 2.05, 4.55), V(0.42, 1.95, 4.3), c);
    const tl = (tt) => SIDE * 0.5 * (1 - 0.12 * Math.sin(tt * 2.2));
    dogAct(d, t, { look: cp, tiltFn: tl, perk: 0.3, brow: 0.35, wag: 0.55, wagSpeed: 2.6, blink: 1, maxPitch: 1.1 });
    hearts(t, C.not + 0.1, u.W(V(0, 2.3, 0.4)));
    shoot(s.cam, cp, u.eyeW().add(V(0, -0.22, 0)), { fov: 42, t, focus: cp.distanceTo(u.eyeW()), hand: 1.3 });
    const fl = snaps.reduce((a, t0) => Math.max(a, t > t0 ? Math.exp(-(t - t0) * 14) : 0), 0), rec = snaps.reduce((a, t0) => Math.max(a, t > t0 - 0.2 && t < t0 + 0.25 ? 1 - Math.abs(t - t0) / 0.25 : 0), 0);
    pin(s.cam, ui, 0, 0, 0.5); ui.userData.draw(0.85 * fl, clamp(rec));
  };
});

// 2-6) the study: a play room full of toys ------------------------------------------------------
const PCEN = V(0, 0, 0.2);
function studyDog(s, o = GOLD) { const R = playRoom(s.scene); const toys = scatterToys(s.scene, PCEN, 26, 0.95, 2.35, 5); const d = makeDog(o); d.scale.setScalar(DS); s.scene.add(d); return { R, toys, d, u: d.userData }; }
shot(C.in_, C.dogs, (s) => {
  const { R, toys, d, u } = studyDog(s); s.ap = 3; s.exposure = 1.0; s.bloom = 0.35;
  s.update = (t) => {
    d.position.copy(PCEN); d.rotation.set(0, 0.6, 0);
    dogAct(d, t, { look: V(1.5, 0.6, 1.5), perk: 0.2, wag: 0.4, blink: 3 });
    const c = E.io(seg(t, C.in_ - 0.3, C.dogs + 0.3)), cp = lv(V(1.6, 6.2, 4.4), V(1.3, 5.6, 3.9), c);
    shoot(s.cam, cp, V(0.1, 0.3, 0.1), { fov: 42, t, roll: lerp(-6, -2, c) });
  };
});
// dogs that knew the names of lots of toys: the name tags pop up over the toys, each with a squeak
const TAGS = ['DUCK', 'BALL', 'ROPE', 'BONE', 'BUNNY', 'FROG', 'RING'];
const TAG_T = (i) => C.dogs + 0.12 + i * 0.29;
shot(C.dogs, C.tilted, (s) => {
  const { R, toys, d, u } = studyDog(s); s.ap = 5; s.exposure = 1.0; s.bloom = 0.35;
  const cols = ['#ffb020', '#7ac24a', '#2f7fc8', '#5fb8e8', '#f48aa8', '#4cc85a', '#ff8a2a'];
  const picks = TAGS.map(nm => toys.find(x => x.name === nm)); const tags = TAGS.map((nm, i) => { const m = textPlane(nm, 0.95, '#ffffff', cols[i]); m.userData.dofMap = m.material.map; s.scene.add(m); return m; });
  s.update = (t) => {
    d.position.copy(PCEN); d.rotation.set(0, 0.35, 0);
    const iNow = clamp(Math.floor((t - C.dogs - 0.12) / 0.29), 0, TAGS.length - 1), lk = picks[iNow].obj.position.clone().add(V(0, 0.2, 0));
    dogAct(d, t, { look: lk, perk: 0.3, brow: 0.3, wag: 0.5, blink: 4 });
    const c = E.io(seg(t, C.dogs - 0.2, C.tilted + 0.3)), cp = lv(V(-2.0, 2.9, 4.6), V(-0.8, 2.7, 4.8), c);
    tags.forEach((m, i) => { const p = picks[i].obj.position; m.position.copy(p).add(V(0, 0.62 + 0.02 * Math.sin(t * 3 + i), 0)); m.scale.setScalar(Math.max(0.0001, spring(t, TAG_T(i), 2.0, 6))); m.lookAt(cp); });
    shoot(s.cam, cp, lv(V(-0.3, 0.55, 0.3), V(0.3, 0.55, 0.3), c), { fov: 48, t, focus: cp.distanceTo(V(0, 0.5, 0.3)) });
  };
});
// tilted their heads almost half the time: the big tilt, and 43%
shot(C.tilted, C.when, (s) => {
  const { R, toys, d, u } = studyDog(s); const ring = ringChart('43%', 0xffc233, 0.2); s.scene.add(ring); s.ap = 6; s.exposure = 1.0; s.bloom = 0.45;
  const tl = (tt) => SIDE * tiltEnv(tt, C.tilted + 0.12, 9, 0.55);
  s.update = (t) => {
    d.position.copy(PCEN); d.rotation.set(0, 0.0, 0);
    const c = E.io(seg(t, C.tilted - 0.2, C.when + 0.3)), cp = lv(V(0.25, 1.45, 2.55), V(0.2, 1.4, 2.25), c);
    dogAct(d, t, { look: cp, tiltFn: tl, perk: 0.35, brow: 0.4, wag: 0.45, blink: 5 });
    const pop = Math.max(0.0001, spring(t, C.almost - 0.1, 1.8, 6)); ring.scale.setScalar(pop); ring.userData.set(0.43 * E.out(seg(t, C.almost - 0.05, C.half + 0.35)));
    shoot(s.cam, cp, u.eyeW().add(V(-0.05, 0.12, 0)), { fov: 40, t, focus: cp.distanceTo(u.eyeW()) }); pin(s.cam, ring, -0.17, 0.42, 1.6);
  };
});
// when their owner said a toy's name: over her shoulder, "Where's DUCK?" and the tilt
function kneelOwner(sc) { const O = makeKid(OWNER); addSmile(O); sc.add(O); return O; }
shot(C.when, C.ordinary, (s) => {
  const { R, toys, d, u } = studyDog(s); const O = kneelOwner(s.scene); const bub = speechBubble("Where's |DUCK?", 0.95); s.scene.add(bub); s.ap = 6; s.exposure = 1.0; s.bloom = 0.35;
  const tSay = C.owner - 0.05, tl = (tt) => SIDE * tiltEnv(tt, C.said + 0.1, 9, 0.52);
  s.update = (t) => {
    d.position.copy(PCEN); d.rotation.set(0, 0.0, 0);
    const ou = ownerKneel(O, t, 0.15, 1.75, Math.PI, { look: u.eyeW() }); ou.smile(0.6); ou.mouthOpen(0.25 * Math.max(0, Math.sin((t - tSay) * 14)) * (t > tSay && t < tSay + 0.8 ? 1 : 0));
    const hp = headPt(O, V(0, 0.05, 0.3));
    dogAct(d, t, { look: hp, tiltFn: tl, perk: 0.4, brow: 0.35, wag: 0.5, blink: 6 });
    bub.position.copy(headPt(O, V(0.55, 0.85, 0.1))); bub.scale.setScalar(Math.max(0.0001, spring(t, tSay, 2.0, 6)));
    const c = E.io(seg(t, C.when - 0.2, C.ordinary + 0.3)), cp = lv(V(1.85, 3.55, 3.7), V(1.7, 3.4, 3.45), c);
    shoot(s.cam, cp, u.eyeW().add(V(0.15, 0.25, 0.4)), { fov: 44, t, focus: cp.distanceTo(u.eyeW()) }); pin(s.cam, bub, -0.1, 0.62, 2.2);
  };
});
// ordinary dogs barely did it at all: a different dog, the same words, a blank stare, 2%
shot(C.ordinary, C.so, (s) => {
  const { R, toys, d, u } = studyDog(s, BLACK); const bub = speechBubble("Where's |DUCK?", 0.9); s.scene.add(bub); const ring = ringChart('2%', 0x9ad0ff, 0.2); s.scene.add(ring); s.ap = 6; s.exposure = 1.05; s.bloom = 0.4;
  s.update = (t) => {
    d.position.copy(PCEN); d.rotation.set(0, 0.0, 0);
    const c = E.io(seg(t, C.ordinary - 0.2, C.so + 0.3)), cp = lv(V(-0.2, 1.5, 2.65), V(-0.15, 1.45, 2.35), c);
    const lick = Math.max(0, Math.sin(Math.PI * seg(t, C.did - 0.05, C.did + 0.3)));
    dogAct(d, t, { look: cp, perk: 0.0, brow: 0.0, lid: 0.32, wag: 0.12, wagSpeed: 1.2, blink: 0, mouth: 0.18 * lick, pant: 0.7 * lick, k: 0.9 });
    u.lid(clamp(0.32 + 0.65 * Math.max(0, 1 - Math.abs(t - (C.barely + 0.15)) / 0.28)));
    bub.scale.setScalar(Math.max(0.0001, spring(t, C.ordinary + 0.05, 2.0, 6)));
    ring.scale.setScalar(Math.max(0.0001, spring(t, C.barely + 0.15, 1.8, 6))); ring.userData.set(0.02 * E.out(seg(t, C.barely + 0.2, C.all)));
    shoot(s.cam, cp, u.eyeW().add(V(0, 0.15, 0)), { fov: 44, t, focus: cp.distanceTo(u.eyeW()) }); pin(s.cam, bub, 0.05, 0.62, 2.2); pin(s.cam, ring, -0.17, 0.3, 1.6);
  };
});
// 7) so the tilt may be your dog: close on the eyes as the head turns over
shot(C.so, C.matching, (s) => {
  const { R, toys, d, u } = studyDog(s); s.ap = 5; s.exposure = 1.05; s.bloom = 0.45;
  const tl = (tt) => SIDE * 0.5 * E.io(seg(tt, C.so + 0.1, C.dog2 + 0.2));
  s.update = (t) => {
    d.position.copy(PCEN); d.rotation.set(0, 0.0, 0);
    const c = E.io(seg(t, C.so - 0.2, C.matching + 0.3)), cp = lv(V(0.15, 1.42, 1.85), V(0.12, 1.38, 1.6), c);
    dogAct(d, t, { look: cp, tiltFn: tl, perk: 0.3, brow: 0.45, wag: 0.4, blink: 7 });
    shoot(s.cam, cp, u.eyeW().add(V(0, 0.0, 0)), { fov: 34, t, focus: cp.distanceTo(u.eyeW()) });
  };
});
// 8) matching the word to the toy in its memory: cards flip in a thought bubble until DUCK
function drawCard(g, name, x, y, w, h, flip) {
  g.save(); g.translate(x + w / 2, y + h / 2); g.scale(Math.max(0.02, Math.abs(Math.cos(flip * Math.PI))), 1);
  g.fillStyle = '#ffffff'; g.strokeStyle = '#2a3a44'; g.lineWidth = 8; const r = 26;
  g.beginPath(); g.moveTo(-w / 2 + r, -h / 2); g.arcTo(w / 2, -h / 2, w / 2, h / 2, r); g.arcTo(w / 2, h / 2, -w / 2, h / 2, r); g.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r); g.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r); g.closePath(); g.fill(); g.stroke();
  const ic = { DUCK: '#ffc81a', BALL: '#c8dc3a', ROPE: '#2f7fc8', BONE: '#5fb8e8', BUNNY: '#f4b6c8', FROG: '#5cc85a', RING: '#ff8a2a' }[name];
  g.fillStyle = ic;
  if (name === 'DUCK') { g.beginPath(); g.ellipse(-10, 20, 70, 50, 0, 0, 7); g.fill(); g.beginPath(); g.arc(35, -40, 38, 0, 7); g.fill(); g.fillStyle = '#ff7a1a'; g.beginPath(); g.ellipse(80, -36, 26, 12, 0, 0, 7); g.fill(); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(45, -50, 7, 0, 7); g.fill(); }
  else if (name === 'BALL' || name === 'RING') { g.beginPath(); g.arc(0, -5, 62, 0, 7); g.fill(); if (name === 'RING') { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, -5, 30, 0, 7); g.fill(); } else { g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.beginPath(); g.arc(-60, -5, 50, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(60, -5, 50, Math.PI - 0.9, Math.PI + 0.9); g.stroke(); } }
  else if (name === 'BONE') { g.fillRect(-55, -18, 110, 36); [[-60, -22], [-60, 22], [60, -22], [60, 22]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 24, 0, 7); g.fill(); }); }
  else if (name === 'ROPE') { g.lineWidth = 22; g.strokeStyle = ic; g.beginPath(); g.moveTo(-70, 10); g.bezierCurveTo(-30, -50, 30, 60, 70, 0); g.stroke(); g.fillStyle = '#eeeeee'; g.beginPath(); g.arc(-70, 10, 22, 0, 7); g.arc(70, 0, 22, 0, 7); g.fill(); }
  else { g.beginPath(); g.ellipse(0, 10, 55, 60, 0, 0, 7); g.fill(); if (name === 'BUNNY') { g.fillRect(-35, -110, 22, 70); g.fillRect(13, -110, 22, 70); } }
  g.fillStyle = '#2a3a44'; g.font = '900 44px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 0, h / 2 - 40);
  g.restore();
}
shot(C.matching, C.another, (s) => {
  const { R, toys, d, u } = studyDog(s); const bub = cloudPuffs(1.7, 1.25); s.scene.add(bub); const ic = canvasDyn(560, 400); const icM = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshBasicMaterial({ map: ic.t, transparent: true, toneMapped: false })); icM.position.z = 0.26; bub.add(icM); icM.userData.dofMap = ic.t;
  const trail = [0.07, 0.11].map(r => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), bub.children[0].material); s.scene.add(m); return m; });
  s.ap = 6; s.exposure = 1.0; s.bloom = 0.45;
  const seq = ['ROPE', 'BALL', 'FROG', 'BONE', 'BUNNY', 'DUCK'], tStart = C.matching + 0.15, tMatch = C.toy - 0.05;
  const tl = (tt) => SIDE * 0.5;
  s.update = (t) => {
    d.position.copy(PCEN); d.rotation.set(0, -0.2, 0);
    const c = E.io(seg(t, C.matching - 0.2, C.another + 0.3)), cp = lv(V(1.9, 2.35, 4.3), V(1.7, 2.25, 3.95), c);
    const duck = toys.find(x => x.name === 'DUCK').obj.position.clone().add(V(0, 0.2, 0)), lookT = t > tMatch + 0.35 ? duck : cp;
    dogAct(d, t, { look: lookT, tiltFn: tl, perk: 0.35 + 0.3 * smooth(tMatch, tMatch + 0.2, t), brow: 0.45, wag: 0.45 + 0.35 * smooth(tMatch, tMatch + 0.3, t), wagSpeed: 2.4 + 1.2 * smooth(tMatch, tMatch + 0.3, t), blink: 8 });
    const hw = u.W(V(0.25, 2.55, 0.2)); bub.position.copy(hw).add(V(0.35, 0.75, 0)); bub.scale.setScalar(Math.max(0.0001, spring(t, C.matching + 0.0, 1.8, 6)) * 0.85); bub.lookAt(cp);
    trail.forEach((m, i) => { m.position.copy(hw).add(V(0.05 + i * 0.1, 0.05 + i * 0.22, 0)); m.scale.setScalar(Math.max(0.0001, spring(t, C.matching + i * 0.06, 2, 6))); });
    // flip through the cards, slowing down, landing on DUCK
    const g = ic.g; g.clearRect(0, 0, 560, 400); const p = clamp((t - tStart) / (tMatch - tStart)); const pos = (1 - Math.pow(1 - p, 2.2)) * (seq.length - 1);
    const i = Math.min(seq.length - 1, Math.floor(pos)), f = pos - i; drawCard(g, seq[i], 150, 40, 260, 300, i === seq.length - 1 ? 0 : f * 0.5);
    if (t > tMatch) { const k = clamp((t - tMatch) / 0.2); g.globalAlpha = k; g.fillStyle = '#2fbf5a'; g.beginPath(); g.arc(440, 80, 52, 0, 7); g.fill(); g.strokeStyle = '#ffffff'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(414, 82); g.lineTo(434, 104); g.lineTo(470, 58); g.stroke(); g.globalAlpha = 1; }
    ic.t.needsUpdate = true;
    shoot(s.cam, cp, lv(u.eyeW(), bub.position, 0.42), { fov: 46, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 9) another idea: the long snout, in profile, looking up at you ---------------------------------
function sofaOwner(s, R) { const O = makeKid(OWNER); addSmile(O); s.scene.add(O); const f = (t, talk = 0) => { const ou = O.userData; ou.reset(); O.rotation.set(0, Math.PI, 0); O.position.set(R.sofa.x, 0, R.sofa.z - 0.25); seatOn(O, R.sofa.seatY); ou.breathe(t, 0.28, 0.025); ou.head.rotation.x += 0.35; ou.lid(0.12, t, 2); ou.smile(0.7); ou.mouthOpen(talk * 0.14 * Math.max(0, Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 5.3))); ik2(O, ou.arms[0], worldPt(O, V(0.35, 1.45, 0.5)), V(1, -1, 0)); ik2(O, ou.arms[1], worldPt(O, V(-0.35, 1.45, 0.5)), V(-1, -1, 0)); ou.hands.forEach(h => h.curl(0.4)); return ou; }; f.O = O; return f; }
shot(C.another, C.a2, (s) => {
  const { R, d, u } = homeDog(s); const own = sofaOwner(s, R); s.ap = 5; s.exposure = 1.0; s.bloom = 0.4;
  s.update = (t) => {
    R.update(t); own(t, 1); d.position.copy(POVD.pos); d.rotation.set(0, 0.05, 0);
    const face = headPt(own.O, V(0, 0, 0.3));
    dogAct(d, t, { look: face, perk: 0.25, brow: 0.2, wag: 0.4, blink: 9, maxPitch: 1.1 });
    const c = E.io(seg(t, C.another - 0.2, C.a2 + 0.3)), cp = lv(V(3.25, 2.2, 3.85), V(3.0, 2.15, 3.8), c);
    shoot(s.cam, cp, lv(u.eyeW(), face, 0.35), { fov: 46, t, focus: cp.distanceTo(u.eyeW()) });
  };
});
// 10) a long snout blocks part of your face, and tilting helps them see you: the dog's own view ----
shot(C.a2, C.and3, (s) => {
  const { R, d, u } = homeDog(s); const own = sofaOwner(s, R); d.visible = false; s.ap = 1.6; s.exposure = 1.02; s.bloom = 0.4;
  // the dog's snout in front of the lens (same materials as the dog)
  const sn = new THREE.Group(); s.scene.add(sn); const lightF = d.userData.head.children.find(m => m.isMesh && m.geometry.type === 'CapsuleGeometry');
  const mz = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.44, 12, 32), lightF.material); mz.rotation.x = Math.PI / 2; mz.position.set(0, 0, -0.3); sn.add(mz); addFur(mz, 0.016, { freq: 520, comb: V(0, 0, 1) });
  const nz = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0x1b1412, roughness: 0.28, clearcoat: 1 })); nz.scale.set(0.075, 0.055, 0.06); nz.position.set(0, 0.07, -0.7); sn.add(nz);
  const tTilt = C.tilting - 0.05;
  s.update = (t) => {
    R.update(t); const ou = own(t, 0);
    const face = headPt(own.O, V(0, -0.05, 0.3));
    const roll = SIDE * 26 * E.io(seg(t, tTilt, tTilt + 0.45)) + 3 * Math.sin(t * 1.3);
    const c = E.io(seg(t, C.a2 - 0.2, C.and3 + 0.3)), side = E.io(seg(t, tTilt, tTilt + 0.45));
    const cp = lv(V(0.4, 1.35, 2.95), V(0.38, 1.37, 3.1), c).add(V(-0.12 * side * SIDE, 0.05 * side, 0));
    shoot(s.cam, cp, face.clone().add(V(0, -0.32, 0)), { fov: 54, t, roll, focus: cp.distanceTo(face), hand: 0.6 });
    s.cam.updateMatrixWorld(true);
    // the snout sits low in the view; as the head tilts, it swings away from her mouth
    sn.position.copy(s.cam.localToWorld(V(0.0 + 0.2 * side * SIDE, -0.2 - 0.06 * side, -0.26)));
    sn.quaternion.copy(s.cam.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.28 - 0.2 * side, 0.3 * side * SIDE, 0)));
    if (t > C.see) ou.smile(1.0);
  };
});

// 11) each dog had a favourite side: three names, three tilts, always the same way ----------------
shot(C.and3, C.like, (s) => {
  const { R, toys, d, u } = studyDog(s); const words = ['BALL', 'ROPE', 'DUCK'], times = [C.and3 + 0.05, C.each - 0.05, C.favorite - 0.05];
  const bubs = words.map(w => { const b = speechBubble(w + '?', 0.75); s.scene.add(b); return b; });
  const ticks = [0, 1, 2].map(() => { const m = checkPlane(0.42); s.scene.add(m); return m; });
  s.ap = 6; s.exposure = 1.0; s.bloom = 0.4;
  const tl = (tt) => SIDE * times.reduce((a, t0) => Math.max(a, tiltEnv(tt, t0 + 0.15, 0.55, 0.5)), 0);
  s.update = (t) => {
    d.position.copy(PCEN); d.rotation.set(0, 0, 0);
    const c = E.io(seg(t, C.and3 - 0.2, C.like + 0.3)), cp = lv(V(0.0, 1.55, 2.95), V(0.0, 1.5, 2.65), c);
    dogAct(d, t, { look: cp, tiltFn: tl, perk: 0.35, brow: 0.3, wag: 0.5, blink: 10 });
    shoot(s.cam, cp, u.eyeW().add(V(0, 0.05, 0)), { fov: 44, t, focus: cp.distanceTo(u.eyeW()) });
    bubs.forEach((b, i) => { const on = t > times[i] && (i === 2 || t < times[i + 1]); b.visible = on; pin(s.cam, b, 0.24, 0.3, 2.2); b.scale.setScalar(Math.max(0.0001, spring(t, times[i], 2.2, 7))); });
    ticks.forEach((m, i) => { pin(s.cam, m, (SIDE > 0 ? -0.2 : 0.2), 0.12 - i * 0.13, 1.3); m.scale.setScalar(Math.max(0.0001, spring(t, times[i] + 0.4, 2, 6)) * 0.55); });
  };
});

// 12) like being left- or right-handed: the dog offers its left paw for a shake -------------------
shot(C.like, C.so2, (s) => {
  const { R, d, u } = homeDog(s); const O = kneelOwner(s.scene); s.ap = 5; s.exposure = 1.0; s.bloom = 0.4;
  const tUp = C.left - 0.15;
  s.update = (t) => {
    R.update(t); d.position.copy(POVD.pos); d.rotation.set(0, 0.05, 0);
    const hand = V(POVD.pos.x + 0.2, 0.92, POVD.pos.z + 0.72);
    const ou = ownerKneel(O, t, POVD.pos.x + 0.05, POVD.pos.z + 1.55, Math.PI, { pet: hand, look: u.eyeW() }); ou.smile(0.9);
    const lift = E.io(seg(t, tUp, tUp + 0.3)), shake = Math.sin(seg(t, tUp + 0.35, tUp + 1.2) * Math.PI * 4) * 0.03;
    const um = dogAct(d, t, { look: headPt(O, V(0, 0, 0.3)), tiltFn: () => SIDE * 0.22, perk: 0.3, brow: 0.3, wag: 0.55, blink: 11 });
    const L = u.legs[1]; const tgt = d.worldToLocal(hand.clone().add(V(0, 0.05 + shake, -0.05)));
    u.paw(1, lv(L.T.clone(), tgt, lift), -0.4 * lift); u.torso.rotation.z -= 0.05 * lift; u.solve();
    const c = E.io(seg(t, C.like - 0.2, C.so2 + 0.3)), cp = lv(V(2.75, 1.45, 4.15), V(2.5, 1.4, 4.0), c);
    shoot(s.cam, cp, lv(hand, u.eyeW(), 0.5), { fov: 44, t, focus: cp.distanceTo(hand) });
  };
});

// 13) so watch which way yours goes: the leash comes off the hook; the dog springs up --------------
shot(C.so2, C.when2, (s) => {
  const sc = s.scene; const R = hallway(sc); R.open(0); const d = makeDog(GOLD); d.scale.setScalar(DS); sc.add(d); const u = d.userData; const O = makeKid(OWNER); addSmile(O); sc.add(O);
  const leash = makeLeash(); sc.add(leash); const hookP = V(-1.3, 2.3, 0.1); const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20, Math.PI * 1.3), M.chrome); hook.position.copy(hookP).add(V(0, 0.03, -0.06)); hook.rotation.z = Math.PI * 0.85; sc.add(hook);
  s.ap = 6; s.exposure = 1.12; s.bloom = 0.5;
  // the far end of the hallway: a wall, a framed print, a warm lamp
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), new THREE.MeshLambertMaterial({ color: 0x9a8f86, bumpMap: PLASTER, bumpScale: 0.5 })); bw.position.set(0, 3.5, 5.6); bw.rotation.y = Math.PI; sc.add(bw);
  const art = canvasTex(256, 320, (g, w, h) => { g.fillStyle = '#efe4d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#e0a83a'; g.beginPath(); g.arc(w / 2, h * 0.4, 55, 0, 7); g.fill(); g.fillStyle = '#2f6f6a'; g.fillRect(0, h * 0.7, w, h * 0.3); });
  box(sc, 1.0, 1.25, 0.05, -0.6, 2.4, 5.55, new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.5 }), 0.01, false); const ap = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.1), new THREE.MeshLambertMaterial({ map: art })); ap.position.set(-0.6, 2.4, 5.52); ap.rotation.y = Math.PI; sc.add(ap);
  box(sc, 1.6, 0.9, 0.5, 1.2, 0.45, 5.3, new THREE.MeshStandardMaterial({ map: woodTex('#a57a52', '#6a4a30', 12, [1, 1]), roughness: 0.5 }), 0.03);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.35, 24, 1, true), hdr(2.4, 1.6, 0.9, { side: THREE.DoubleSide })); shade.position.set(1.45, 1.35, 5.3); sc.add(shade); lamp(sc, 0xffb070, 18, 7, 1.45, 1.3, 5.0);
  const tGrab = C.watch + 0.05;
  s.update = (t) => {
    const grab = E.io(seg(t, tGrab, tGrab + 0.35)), lift = E.io(seg(t, tGrab + 0.35, tGrab + 0.9));
    const handP = lv(V(-2.0, 1.85, 1.1), hookP.clone().add(V(0.0, 0.03, 0.04)), grab).add(V(0.35 * lift, 0.05 * lift, 1.05 * lift));
    const ou = O.userData; ou.reset(); O.position.set(-2.05, 0, 0.95); O.rotation.set(0, 1.6, 0); ou.breathe(t, 0.25, 0.02); ou.smile(0.7); ik2(O, ou.arms[0], handP, V(-0.3, -1, 0.6)); ou.hands[0].curl(0.4 + 0.4 * grab);
    const realHand = ou.hands[0].hand.getWorldPosition(new THREE.Vector3()); const loopP = grab < 0.95 ? hookP.clone() : realHand.add(V(0, -0.12, 0)); leash.userData.set(loopP, loopP.clone().add(V(0.05, -0.9 + 0.2 * lift, 0.05)), 0.12);
    d.position.set(-0.4, 0, 2.35); d.rotation.set(0, -2.75, 0);
    const up = smooth(tGrab + 0.15, tGrab + 0.6, t);
    dogAct(d, t, { stand: up, look: loopP, perk: 0.3 + 0.5 * up, brow: 0.5, wag: 0.5 + 0.4 * up, wagSpeed: 2.6 + 2.2 * up, mouth: 0.28 * up, pant: 0.55 * up, blink: 12, maxPitch: 1.0 });
    d.position.y = 0.04 * Math.abs(Math.sin(t * 9)) * up;
    const c = E.io(seg(t, C.so2 - 0.2, C.when2 + 0.3)), cp = lv(V(-1.0, 1.75, 0.28), V(-1.0, 1.72, 0.5), c);
    shoot(s.cam, cp, u.eyeW().add(V(-0.12, 0.18, 0)), { fov: 50, t, focus: cp.distanceTo(u.eyeW()) });
  };
});

// 14) when you ask, who wants a walk? Back to your POV (loop)
shot(C.when2, END, (s) => povShot(s, t => t - END));

// debug: ?cam=x,y,z,tx,ty,tz,fov overrides every camera
{ const DBG = new URLSearchParams(location.search).get('cam'); if (DBG) { const v = DBG.split(',').map(Number); shots.forEach(s => { const u0 = s.update; s.update = (t) => { u0(t); setCam(s.cam, V(v[0], v[1], v[2]), V(v[3], v[4], v[5]), 0, v[6] || 40); s.cam.userData.focus = 6; s.ap = 0.01; }; }); } }
