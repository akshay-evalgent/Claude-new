// =====================================================================
// SETS: "Why You Can't Tickle Yourself" — an x-ray head with a brain, a ghost "prediction" arm,
// a TICKLE knob, a robot arm with a foam tip, a delay box, a finger-press rig and force bars
// =====================================================================
// turn a person's head into an x-ray with a glowing brain inside; returns set(glow)
function xrayHead(P) {
  const H = P.userData.head, X = XM(); H.traverse(o => { if (o.isMesh) { o.material = X; o.castShadow = false; } });
  const brain = makeBrain(); brain.scale.multiplyScalar(0.2); brain.position.set(0, 0.12, -0.02); H.add(brain);
  const bm = brain.material; bm.emissive = new THREE.Color(0xff3a20); bm.emissiveIntensity = 0.2;
  return (g) => { bm.emissiveIntensity = 0.2 + 1.6 * g; };
}
// a second copy of a person in x-ray, showing only the right arm: the brain's prediction of the move
function ghostArm(sc, o) {
  const G = makeKid(o); sc.add(G); const X = XM(); G.traverse(m => { if (m.isMesh) { m.material = X; m.castShadow = false; m.visible = false; } });
  const u = G.userData; u.arms[1].sh.traverse(m => { if (m.isMesh) m.visible = true; });
  return G;
}
// a big rotary knob with a dial from 0 to 10, labelled TICKLE; set(k) points it (0..1)
function tickleKnob() {
  const g = new THREE.Group();
  const panel = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.5, 0.12, 4, 0.06), new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.5, metalness: 0.3 })); g.add(panel);
  const dial = canvasTex(512, 512, (c) => { c.fillStyle = '#24282e'; c.fillRect(0, 0, 512, 512); c.strokeStyle = '#e8e4da'; c.fillStyle = '#e8e4da'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + i / 10 * Math.PI * 1.5; c.lineWidth = 6; c.beginPath(); c.moveTo(256 + Math.cos(a) * 196, 256 + Math.sin(a) * 196); c.lineTo(256 + Math.cos(a) * 222, 256 + Math.sin(a) * 222); c.stroke(); c.font = 'bold 34px Arial'; c.fillText(String(i), 256 + Math.cos(a) * 160, 256 + Math.sin(a) * 160); }
    c.font = '900 52px "Arial Black", Arial'; c.fillStyle = '#ff6a4a'; c.fillText('TICKLE', 256, 430); });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshStandardMaterial({ map: dial, roughness: 0.6 })); face.position.z = 0.062; g.add(face);
  const knob = new THREE.Group(); knob.position.z = 0.07; g.add(knob);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.24, 48), new THREE.MeshPhysicalMaterial({ color: 0xc8cdd2, metalness: 1, roughness: 0.25 })); body.rotation.x = Math.PI / 2; body.position.z = 0.12; knob.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.03, 48), new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.4 })); cap.rotation.x = Math.PI / 2; cap.position.z = 0.25; knob.add(cap);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.2, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.7, 0.4) })); mark.position.set(0, 0.17, 0.27); knob.add(mark);
  // knob angle: dial position k (0..1); the canvas runs clockwise from 135°
  g.userData.set = (k) => { knob.rotation.z = -(Math.PI * 0.75 + k * Math.PI * 1.5) - Math.PI / 2; };
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.set(1); return g;
}
// a two-link robot arm on a base with a soft foam tip; reach(p) points the tip at a world point
function robotArm({ L1 = 0.8, L2 = 0.7, color = 0xf2f2ee } = {}) {
  const g = new THREE.Group(), body = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.5 }), joint = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.4, metalness: 0.4 }), accent = new THREE.MeshStandardMaterial({ color: 0xff7a3a, roughness: 0.45 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 40), joint); base.position.y = 0.06; g.add(base);
  const yaw = new THREE.Group(); yaw.position.y = 0.12; g.add(yaw);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 32), body); turret.position.y = 0.1; yaw.add(turret);
  const sh = new THREE.Group(); sh.position.y = 0.22; yaw.add(sh);
  const sj = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.24, 28), joint); sj.rotation.x = Math.PI / 2; sh.add(sj);
  const up = new THREE.Mesh(new RoundedBoxGeometry(0.15, L1, 0.15, 3, 0.05), body); up.position.y = L1 / 2; sh.add(up);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.08, 0.155), accent); stripe.position.y = L1 * 0.62; sh.add(stripe);
  const el = new THREE.Group(); el.position.y = L1; sh.add(el);
  const ej = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 28), joint); ej.rotation.x = Math.PI / 2; el.add(ej);
  const lo = new THREE.Mesh(new RoundedBoxGeometry(0.12, L2, 0.12, 3, 0.04), body); lo.position.y = L2 / 2; el.add(lo);
  const tipG = new THREE.Group(); tipG.position.y = L2; el.add(tipG);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 20), joint); wrist.position.y = 0.04; tipG.add(wrist);
  const foamT = canvasTex(128, 128, (c) => { c.fillStyle = '#f6d24a'; c.fillRect(0, 0, 128, 128); for (let i = 0; i < 260; i++) { c.fillStyle = 'rgba(160,110,10,0.35)'; c.beginPath(); c.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2.5, 0, 7); c.fill(); } });
  const foam = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.08, 8, 20), new THREE.MeshStandardMaterial({ map: foamT, bumpMap: foamT, bumpScale: 2, roughness: 1 })); foam.position.y = 0.16; tipG.add(foam);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // aim the tip at a world point (simple planar IK in the arm's yaw plane)
  g.userData.reach = (P) => {
    g.updateMatrixWorld(true); const lp = g.worldToLocal(P.clone()); const dx = lp.x, dz = lp.z, h = Math.hypot(dx, dz);
    yaw.rotation.y = Math.atan2(dx, dz);
    const y = lp.y - 0.34, tipL = L2 + 0.22, d = Math.min(Math.hypot(h, y), L1 + tipL - 1e-3);
    const a = Math.atan2(h, y), b = Math.acos(clamp((L1 * L1 + d * d - tipL * tipL) / (2 * L1 * d), -1, 1)), c = Math.acos(clamp((L1 * L1 + tipL * tipL - d * d) / (2 * L1 * tipL), -1, 1));
    sh.rotation.x = a - b; el.rotation.x = Math.PI - c;
  };
  g.userData.tipW = () => { g.updateMatrixWorld(true); return foam.getWorldPosition(new THREE.Vector3()); };
  return g;
}
// a lever handle the volunteer moves (left hand), on a little base
function leverHandle() {
  const g = new THREE.Group(), dark = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.4, metalness: 0.4 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.1, 0.42, 3, 0.03), dark); base.position.y = 0.05; g.add(base);
  const piv = new THREE.Group(); piv.position.y = 0.1; g.add(piv);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.42, 16), new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 1, roughness: 0.3 })); stick.position.y = 0.21; piv.add(stick);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.065, 24, 16), new THREE.MeshStandardMaterial({ color: 0xff7a3a, roughness: 0.4 })); knob.position.y = 0.44; piv.add(knob);
  g.userData.set = (ax, az) => { piv.rotation.set(ax, 0, az); };
  g.userData.knobW = () => { g.updateMatrixWorld(true); return knob.getWorldPosition(new THREE.Vector3()); };
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
// a control box with an LCD that reads DELAY and a knob
function delayBox() {
  const g = new THREE.Group(); const cv = canvasDyn(512, 200);
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.5, 0.5, 4, 0.05), new THREE.MeshStandardMaterial({ color: 0xd8dcdf, roughness: 0.45 })); box.position.y = 0.25; g.add(box);
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.234), new THREE.MeshBasicMaterial({ map: cv.t, toneMapped: false })); lcd.position.set(-0.08, 0.3, 0.252); g.add(lcd); lcd.userData.dofMap = cv.t;
  const k = new THREE.Group(); k.position.set(0.33, 0.27, 0.25); g.add(k);
  const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.08, 32), new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.4 })); kb.rotation.x = Math.PI / 2; kb.position.z = 0.04; k.add(kb);
  const km = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff })); km.position.set(0, 0.03, 0.085); k.add(km);
  g.userData.set = (sec, flash = 0) => {
    const c = cv.g; c.fillStyle = '#0f2a1c'; c.fillRect(0, 0, 512, 200); c.fillStyle = `rgba(125,255,176,${0.95})`; c.font = 'bold 44px "Courier New", monospace'; c.textAlign = 'left'; c.fillText('DELAY', 30, 70);
    c.font = 'bold 96px "Courier New", monospace'; c.fillText(sec.toFixed(1) + ' s', 30, 170); if (flash > 0) { c.fillStyle = `rgba(125,255,176,${0.25 * flash})`; c.fillRect(0, 0, 512, 200); } cv.t.needsUpdate = true;
    k.rotation.z = -sec * 6;
  };
  g.userData.set(0); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
// the finger-press rig: a bar on a pivot between two people; one end pressed, the other presses a fingertip
function pressRig() {
  const g = new THREE.Group(), dark = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.4, metalness: 0.4 }), steel = new THREE.MeshPhysicalMaterial({ color: 0xc8cdd2, metalness: 1, roughness: 0.25 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.12, 0.42, 3, 0.04), dark); base.position.y = 0.06; g.add(base);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.12), dark); post.position.y = 0.28; g.add(post);
  const piv = new THREE.Group(); piv.position.y = 0.44; g.add(piv);
  const bar = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.06, 0.12, 2, 0.02), steel); piv.add(bar);
  [-1, 1].forEach(s => { const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 24), new THREE.MeshStandardMaterial({ color: 0xff7a3a, roughness: 0.5 })); pad.position.set(s * 0.68, -0.045, 0); piv.add(pad); const rest = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.1, 0.22, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.6 })); rest.position.set(s * 0.68, 0.17, 0); g.add(rest); });
  g.userData.set = (tilt) => { piv.rotation.z = tilt; };
  g.userData.endW = (s) => { g.updateMatrixWorld(true); return piv.localToWorld(V(s * 0.68, 0.05, 0)); };
  g.userData.restW = (s) => { g.updateMatrixWorld(true); return g.localToWorld(V(s * 0.68, 0.24, 0)); };
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g;
}
// labelled 3D bars that grow (overlay); set(values 0..1 each, visible count)
function barChart(labels, colors, { w = 0.13, gap = 0.05, H = 0.5 } = {}) {
  const g = new THREE.Group(), bars = [];
  labels.forEach((lab, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(colors[i % colors.length]), toneMapped: false })); m.position.x = (i - (labels.length - 1) / 2) * (w + gap); g.add(m);
    const t = textPlane(lab, w * 2.2, '#ffffff', '#1a2a3a'); t.position.set(m.position.x, -0.05, 0.01); g.add(t); bars.push(m);
  });
  const base = new THREE.Mesh(new THREE.PlaneGeometry(labels.length * (w + gap) + 0.06, 0.008), new THREE.MeshBasicMaterial({ color: 0xffffff })); base.position.y = -0.002; g.add(base);
  g.userData.set = (vals) => { bars.forEach((m, i) => { const v = Math.max(0.0005, vals[i] || 0); m.scale.y = v * H; m.position.y = v * H / 2; m.visible = (vals[i] || 0) > 0.002; }); };
  g.traverse(o => { if (o.material) { o.material.depthTest = false; o.renderOrder = 20; o.userData.noDof = true; } }); return g;
}
// a lab room for the experiments: pale walls, a long table, soft daylight
function tickleLab(sc) {
  sc.background = new THREE.Color(0xdfe6ea); sc.environment = MENV; const R = {};
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ color: 0xb8c4c8, roughness: 0.5 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wm = new THREE.MeshLambertMaterial({ color: 0xe6ecee, bumpMap: PLASTER, bumpScale: 0.3 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wm); back.position.set(0, 4, -3); back.receiveShadow = true; sc.add(back);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wm); side.position.set(-5, 4, 2); side.rotation.y = Math.PI / 2; sc.add(side);
  box(sc, 16, 0.12, 0.06, 0, 1.6, -2.97, new THREE.MeshStandardMaterial({ color: 0x2f9a8f, roughness: 0.5 }), 0.02, false);
  const tm = new THREE.MeshStandardMaterial({ color: 0xf4f6f6, roughness: 0.35 }), legM = new THREE.MeshStandardMaterial({ color: 0x8a949c, metalness: 0.8, roughness: 0.35 });
  box(sc, 3.6, 0.1, 1.5, 0, 1.25, 0, tm, 0.03); [[-1.7, -0.65], [1.7, -0.65], [-1.7, 0.65], [1.7, 0.65]].forEach(([x, z]) => box(sc, 0.07, 1.2, 0.07, x, 0.6, z, legM, 0.02));
  R.tableY = 1.3;
  // shelves and a poster on the back wall
  box(sc, 2.4, 0.06, 0.4, -2.2, 3.2, -2.8, tm, 0.02); [0x2f6f8f, 0xe0b040, 0xc8503a, 0x4a8a5a].forEach((c, i) => box(sc, 0.12, 0.5 + 0.1 * (i % 2), 0.32, -3.1 + i * 0.16, 3.48, -2.8, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }), 0.01));
  const poster = canvasTex(256, 360, (c) => { c.fillStyle = '#f6f2e8'; c.fillRect(0, 0, 256, 360); c.fillStyle = '#ff7a3a'; c.beginPath(); c.arc(128, 130, 70, 0, 7); c.fill(); c.fillStyle = '#2f6f8f'; c.font = 'bold 30px Arial'; c.textAlign = 'center'; c.fillText('TOUCH', 128, 260); c.fillText('LAB', 128, 300); });
  const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.26), new THREE.MeshLambertMaterial({ map: poster })); pp.position.set(1.9, 3.4, -2.96); sc.add(pp);
  sc.add(new THREE.HemisphereLight(0xf4f8ff, 0x8a8478, 1.0));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4); key.position.set(3, 7, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); key.shadow.bias = -0.0004; key.userData.soft = 0.25; sc.add(key);
  const fill = new THREE.DirectionalLight(0xd8e4ff, 0.7); fill.position.set(-4, 3, 4); sc.add(fill);
  R.update = () => {};
  return R;
}
// seat a person on an invisible stool at height y, facing ry, at (x, z)
function seatAt(P, t, x, z, ry, y = 1.0) { const u = P.userData; u.reset(); P.rotation.set(0, ry, 0); P.position.set(x, 0, z); seatOn(P, y); u.breathe(t, 0.25, 0.02); return u; }
// turn a hand palm-up (about the forearm), after ik2
function palmUp(hand, a) { hand.hand.rotation.y = a; }
