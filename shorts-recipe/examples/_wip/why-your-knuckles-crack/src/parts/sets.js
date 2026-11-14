// =====================================================================
// SETS: gamer room, joint cutaway studio, MRI room, doctor's office
// =====================================================================
function addSmile(p) {
  const u = p.userData; const sm = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.013, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0x3a1418, roughness: 0.5 })); sm.rotation.z = Math.PI; sm.position.set(0, 0.03, 0.01); sm.visible = false; u.mouth.add(sm);
  const line = u.mouth.children[0]; const r0 = u.reset; u.reset = () => { r0(); sm.visible = false; };
  u.smile = (k) => { sm.visible = k > 0.05; if (sm.visible) { line.visible = false; sm.scale.set(1 + 0.2 * k, 0.4 + 0.6 * k, 1); } };
}
function cloudPuffs(w = 1.6, h = 1.2, color = 0xffffff) {
  const g = new THREE.Group(); const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.65, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffffff), emissive: new THREE.Color(color), emissiveIntensity: 0.3 });
  const r = rng(Math.round(w * 100 + h * 7)); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const s = new THREE.Mesh(new THREE.SphereGeometry(0.2 + r() * 0.12, 24, 16), m); s.position.set(Math.cos(a) * w * 0.5, Math.sin(a) * h * 0.5, -0.1 + r() * 0.05); g.add(s); }
  const core = new THREE.Mesh(new THREE.CircleGeometry(1, 48), m); core.scale.set(w * 0.52, h * 0.52, 1); core.position.z = -0.12; g.add(core);
  return g;
}
// seat any kid/adult on a surface of height y (feet dangle or rest naturally)
function seatOn(p, y, s = 1) { const u = p.userData; p.position.y = y + 0.16 * s - 1.3 * s; u.legs.forEach((L, i) => { L.hip.rotation.set(-1.45, (i ? 1 : -1) * 0.08, 0); L.knee.rotation.x = 1.4; }); }
const canvasDyn = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, g: c.getContext('2d'), t }; };

// ---------- the gamer's room at night ----------
function gamerRoom(sc) {
  sc.background = new THREE.Color(0x05060c); sc.environment = tintedEnv(0.22, 0.2, 0.38);
  const R = {};
  const fw = woodTex('#4a3428', '#22160e', 71, [3, 3], 6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: fw, bumpMap: fw, bumpScale: 0.6, roughness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wallM = new THREE.MeshLambertMaterial({ color: 0x2a2f45, bumpMap: PLASTER, bumpScale: 0.5 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallM); back.position.set(0, 4, 3.4); back.rotation.y = Math.PI; back.receiveShadow = true; sc.add(back);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallM); side.position.set(-3.6, 4, 0); side.rotation.y = Math.PI / 2; side.receiveShadow = true; sc.add(side);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), wallM); front.position.set(0, 4, -2.6); sc.add(front);
  // LED strip along the top of the back wall, colour sweeping from purple to cyan
  const led = canvasDyn(512, 8); const strip = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.05, 0.05), new THREE.MeshBasicMaterial({ map: led.t })); strip.position.set(0, 4.6, 3.35); sc.add(strip); R.led = led;
  const ledL = new THREE.PointLight(0x9a4dff, 6, 7, 2); ledL.position.set(-2, 4.3, 3.0); sc.add(ledL); const ledR = new THREE.PointLight(0x2ad8ff, 6, 7, 2); ledR.position.set(2, 4.3, 3.0); sc.add(ledR); R.ledL = ledL; R.ledR = ledR;
  // hexagon light panels
  const hexG = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 6); R.hex = [];
  [[-1.6, 2.6], [-1.12, 2.88], [-1.12, 2.32], [-0.64, 2.6], [-0.64, 3.16], [-0.16, 2.88]].forEach(([x, y], i) => { const m = new THREE.Mesh(hexG, new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) })); m.rotation.x = Math.PI / 2; m.rotation.y = Math.PI / 6; m.position.set(x, y, 3.36); sc.add(m); R.hex.push(m); });
  // poster and doorway
  const posterT = canvasTex(256, 360, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a0a5a'); gr.addColorStop(1, '#ff3a8a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(128, 130, 60, 0, 7); g.fill(); g.fillStyle = '#12082a'; for (let i = 0; i < 6; i++) g.fillRect(20 + i * 40, 230 - (i % 3) * 30, 34, 200); g.strokeStyle = '#2ad8ff'; g.lineWidth = 4; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 250 + i * 16); g.lineTo(w, 250 + i * 16); g.stroke(); } });
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshStandardMaterial({ map: posterT, roughness: 0.6 })); poster.position.set(1.0, 2.9, 3.37); poster.rotation.y = Math.PI; sc.add(poster);
  const door = new THREE.Group(); door.position.set(2.5, 0, 3.38); sc.add(door); R.door = door;
  const dfM = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.5 });
  [[-0.62, 1.6, 0.1, 3.2], [0.62, 1.6, 0.1, 3.2], [0, 3.22, 1.34, 0.1]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), dfM); b.position.set(x, y, 0); door.add(b); });
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.15), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.7, 0.45) })); hall.position.set(0, 1.58, 0.06); door.add(hall);
  const hallL = new THREE.PointLight(0xffc080, 3.5, 5, 2); hallL.position.set(2.5, 2.4, 2.6); sc.add(hallL);
  // desk, monitor, RGB keyboard, mouse, can
  const deskM = new THREE.MeshStandardMaterial({ color: 0x16181e, roughness: 0.35 });
  const desk = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.08, 1.2, 2, 0.02), deskM); desk.position.set(0, 1.42, -1.2); desk.castShadow = desk.receiveShadow = true; sc.add(desk);
  [[-1.5, -1.7], [1.5, -1.7], [-1.5, -0.7], [1.5, -0.7]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), deskM); l.position.set(x, 0.7, z); sc.add(l); });
  const game = canvasDyn(640, 360); R.game = game;
  const mon = new THREE.Group(); mon.position.set(0, 2.15, -1.62); sc.add(mon);
  const bez = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.16, 0.06, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.3 })); mon.add(bez);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 1.08), new THREE.MeshBasicMaterial({ map: game.t, color: new THREE.Color(1.5, 1.5, 1.5) })); scr.position.z = 0.032; mon.add(scr);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), deskM); stand.position.set(0, -0.6, -0.05); mon.add(stand);
  const monL = new THREE.PointLight(0x9ac8ff, 7, 5, 2); monL.position.set(0, 2.1, -1.2); sc.add(monL); R.monL = monL;
  const kN = 60, keys = new THREE.InstancedMesh(new RoundedBoxGeometry(0.075, 0.03, 0.075, 1, 0.01), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.0 }), kN); sc.add(keys); R.keys = keys;
  const kb = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.04, 0.34, 2, 0.015), deskM); kb.position.set(-0.05, 1.48, -0.95); sc.add(kb);
  const dmk = new THREE.Object3D(); for (let i = 0; i < kN; i++) { dmk.position.set(-0.5 + 0.045 + (i % 12) * 0.083, 1.515, -1.08 + Math.floor(i / 12) * 0.068); dmk.updateMatrix(); keys.setMatrixAt(i, dmk.matrix); keys.setColorAt(i, new THREE.Color(1, 1, 1)); }
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 12), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.3, emissive: 0x2ad8ff, emissiveIntensity: 0.4 })); mouse.scale.set(0.8, 0.45, 1.2); mouse.position.set(0.75, 1.49, -0.95); sc.add(mouse);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.01, 0.75), new THREE.MeshStandardMaterial({ color: 0x101016, roughness: 0.9 })); pad.position.set(0.05, 1.465, -1.0); sc.add(pad);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 24), new THREE.MeshPhysicalMaterial({ color: 0x7aff4a, metalness: 0.8, roughness: 0.25, clearcoat: 1 })); can.position.set(-1.1, 1.59, -1.0); can.castShadow = true; sc.add(can);
  // gaming chair
  const chairM = new THREE.MeshPhysicalMaterial({ color: 0x15151a, roughness: 0.45, clearcoat: 0.4 }), trimM = new THREE.MeshPhysicalMaterial({ color: 0xff2a5a, roughness: 0.4 });
  const seat = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.16, 1.0, 3, 0.06), chairM); seat.position.set(0, 0.95, 0.35); seat.castShadow = true; sc.add(seat);
  const backr = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.9, 0.18, 3, 0.08), chairM); backr.position.set(0, 1.95, 0.88); backr.rotation.x = -0.12; backr.castShadow = true; sc.add(backr);
  [-0.42, 0.42].forEach(x => { const tr = new THREE.Mesh(new RoundedBoxGeometry(0.08, 1.7, 0.2, 2, 0.03), trimM); tr.position.set(x, 1.95, 0.87); tr.rotation.x = -0.12; sc.add(tr); });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 16), M.chrome); post.position.set(0, 0.45, 0.35); sc.add(post);
  // window with a city at night
  const city = canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1030'); gr.addColorStop(1, '#2a1a4a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 14; i++) { const x = i * 38, bh = 120 + r() * 260; g.fillStyle = '#0a0a18'; g.fillRect(x, h - bh, 34, bh); for (let k = 0; k < 40; k++) if (r() > 0.55) { g.fillStyle = r() > 0.5 ? '#ffd27a' : '#7ad8ff'; g.fillRect(x + 4 + (k % 4) * 7, h - bh + 8 + Math.floor(k / 4) * 14, 4, 6); } } });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), new THREE.MeshBasicMaterial({ map: city, color: new THREE.Color(1.2, 1.2, 1.2) })); win.position.set(-3.58, 3.0, 1.4); win.rotation.y = Math.PI / 2; sc.add(win);
  sc.add(new THREE.HemisphereLight(0x5a6ab8, 0x1a1420, 0.35));
  const key = new THREE.DirectionalLight(0xbfd0ff, 0.9); key.position.set(-3, 6, -4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 }); key.userData.soft = 0.2; sc.add(key);
  R.update = (t) => {
    const g = led.g; const gr = g.createLinearGradient(0, 0, 512, 0); const ph = (t * 0.15) % 1; gr.addColorStop(0, `hsl(${270 + 40 * Math.sin(t)},100%,60%)`); gr.addColorStop(0.5, `hsl(${(200 + 360 * ph) % 360},100%,60%)`); gr.addColorStop(1, `hsl(${190 + 30 * Math.cos(t)},100%,60%)`); g.fillStyle = gr; g.fillRect(0, 0, 512, 8); led.t.needsUpdate = true;
    R.hex.forEach((m, i) => m.material.color.setHSL((0.75 + 0.08 * Math.sin(t * 1.5 + i) + (i % 2) * 0.28) % 1, 1, 0.55).multiplyScalar(1.8));
    for (let i = 0; i < kN; i++) keys.setColorAt(i, new THREE.Color().setHSL(((i % 12) / 12 + t * 0.3) % 1, 1, 0.55)); keys.instanceColor.needsUpdate = true; keys.material.emissiveIntensity = 1.2;
    const gg = game.g; const sky = gg.createLinearGradient(0, 0, 0, 360); sky.addColorStop(0, '#3a1a7a'); sky.addColorStop(1, '#ff7a5a'); gg.fillStyle = sky; gg.fillRect(0, 0, 640, 360);
    gg.fillStyle = '#1a0a3a'; for (let i = 0; i < 9; i++) { const x = ((i * 90 - t * 60) % 720 + 720) % 720 - 60; gg.beginPath(); gg.moveTo(x, 360); gg.lineTo(x + 50, 200 + (i % 3) * 30); gg.lineTo(x + 100, 360); gg.fill(); }
    gg.fillStyle = '#ffd23f'; gg.beginPath(); gg.arc(320, 150, 34, 0, 7); gg.fill(); gg.fillStyle = 'rgba(0,0,0,0.5)'; gg.fillRect(20, 20, 160, 18); gg.fillStyle = '#5aff7a'; gg.fillRect(22, 22, 156 * (0.6 + 0.3 * Math.sin(t)), 14); game.t.needsUpdate = true;
  };
  return R;
}
function makeGamer() {
  const K = makeKid({ shirt: 0x34394a, pants: 0x1e2a3a, hair: 0x2a1a10, skin: 0xc68a5e, s: 0.95, hs: 1.05, hairUp: 0.2 }); addSmile(K);
  const u = K.userData; const hoodM = new THREE.MeshPhysicalMaterial({ color: 0x34394a, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color(0x8a90a8), bumpMap: WEAVE, bumpScale: 1 });
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.13, 12, 32, Math.PI * 1.3), hoodM); hood.position.set(0, 2.55, -0.12); hood.rotation.set(Math.PI / 2 - 0.2, 0, Math.PI * 0.85); hood.castShadow = true; K.add(hood);
  const hpM = new THREE.MeshPhysicalMaterial({ color: 0x15151a, roughness: 0.35, clearcoat: 0.6 });
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 10, 40, Math.PI), hpM); band.position.set(0, 2.5, 0.05); band.rotation.set(-Math.PI / 2 + 0.25, 0, 0); K.add(band);
  [-1, 1].forEach(sx => { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 24), hpM); cup.rotation.z = Math.PI / 2; cup.position.set(sx * 0.4, 2.48, 0.12); K.add(cup); const glowR = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 24), hdr(0.6, 2.4, 3.0)); glowR.rotation.y = Math.PI / 2; glowR.position.set(sx * 0.452, 2.48, 0.12); K.add(glowR); });
  [-0.07, 0.07].forEach(x => { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0xe8e8ee })); st.position.set(x, 2.15, 0.31); K.add(st); });
  return K;
}

// ---------- joint cutaway in a bright studio ----------
const SPONGY = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#f2e2bc'; g.fillRect(0, 0, w, h); const r = rng(13); for (let i = 0; i < 520; i++) { g.fillStyle = r() > 0.4 ? 'rgba(200,120,90,0.55)' : 'rgba(150,80,60,0.45)'; g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 12, 3 + r() * 8, r() * 3, 0, 7); g.fill(); } }, { rep: [2, 2] });
const SPONGY_B = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c0c0c0'; g.fillRect(0, 0, w, h); const r = rng(13); for (let i = 0; i < 520; i++) { g.fillStyle = '#303030'; g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 12, 3 + r() * 8, r() * 3, 0, 7); g.fill(); } }, { rep: [2, 2], srgb: false });
function jointStudio(sc) {
  studio(sc, { bg: 'cyan', ground: -2.0, shadow: 0.18, key: 2.6, keyPos: V(3, 6, 6), area: 5 }); sc.environment = ENV;
  const R = {};
  // bone radius profiles (along x). A = upper bone ending in a rounded head, B = lower bone with a shallow cup
  const rA = x => { if (x > 0) return 0; const h = 0.6, k = Math.max(0, -x); const head = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, 0.58 - k) / 0.58, 2))); return k < 0.58 ? h * head * (0.96 + 0.04 * Math.cos(k * 9)) : lerp(h, 0.4, smooth(0.58, 1.5, k)); };
  const rB = x => { const k = x; return k < 0.12 ? lerp(0.0, 0.64, smooth(-0.02, 0.12, k)) : lerp(0.64, 0.42, smooth(0.25, 1.4, k)); };
  const lathe = (fn, x0, x1, n, off = 0, half = true) => { const P = []; for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); P.push(new THREE.Vector2(Math.max(fn(x) + off, 0.0005), x)); } const g = new THREE.LatheGeometry(P, 48, half ? Math.PI / 2 : 0, half ? Math.PI : Math.PI * 2); g.rotateZ(-Math.PI / 2); return g; };
  const boneM = new THREE.MeshPhysicalMaterial({ color: 0xf4ecda, roughness: 0.45, clearcoat: 0.3, bumpMap: BONE_B, bumpScale: 0.6 });
  const cartM = new THREE.MeshPhysicalMaterial({ color: 0xdfeefc, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.92, sheen: 0.5 });
  const A = new THREE.Group(), B = new THREE.Group(); sc.add(A, B); R.A = A; R.B = B;
  // dish shape for B's joint face: a cup that receives A's head
  const cupDepth = x => 0.09 * (1 - Math.min(1, (x / 0.6) ** 2));
  A.add(new THREE.Mesh(lathe(rA, -3.2, 0, 140), boneM)); A.add(new THREE.Mesh(lathe(x => rA(x) > 0 ? rA(x) + 0.035 : 0, -0.62, 0.0, 70), cartM));
  const bShell = new THREE.Mesh(lathe(rB, -0.02, 3.2, 120), boneM); B.add(bShell);
  // cut faces: cortical rim, spongy interior, marrow in the shaft
  const section = (fn, x0, x1, inset, mat, z, n = 90) => { const top = [], bot = []; for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); const r = Math.max(0, fn(x) - inset); top.push([x, r]); bot.push([x, -r]); } const pts = top.concat(bot.reverse()); const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath(); const g = new THREE.ShapeGeometry(s); const p2 = g.attributes.position, u2 = g.attributes.uv; for (let i = 0; i < p2.count; i++) u2.setXY(i, p2.getX(i) * 0.6, p2.getY(i) * 0.6); const m = new THREE.Mesh(g, mat); m.position.z = z; return m; };
  const cortM = new THREE.MeshStandardMaterial({ color: 0xfbf6ea, roughness: 0.5 }), spM = new THREE.MeshStandardMaterial({ map: SPONGY, bumpMap: SPONGY_B, bumpScale: 2, roughness: 0.7 }), marM = new THREE.MeshStandardMaterial({ color: 0xe8b85a, roughness: 0.6 });
  A.add(section(rA, -3.2, -0.02, 0, cortM, 0.001)); A.add(section(rA, -3.2, -0.05, 0.07, spM, 0.002)); A.add(section(x => x < -1.3 ? rA(x) - 0.17 : 0, -3.2, -1.3, 0, marM, 0.003));
  B.add(section(rB, 0.0, 3.2, 0, cortM, 0.001)); B.add(section(rB, 0.03, 3.2, 0.07, spM, 0.002)); B.add(section(x => x > 1.3 ? rB(x) - 0.17 : 0, 1.3, 3.2, 0, marM, 0.003));
  A.add(section(x => rA(x) > 0 ? rA(x) + 0.035 : 0, -0.62, -0.02, 0, new THREE.MeshPhysicalMaterial({ color: 0xcfe6fa, roughness: 0.15, clearcoat: 1 }), 0.0005));
  const cartB = new THREE.Mesh(lathe(x => x < 0.14 ? rB(x) + 0.03 : 0, -0.03, 0.14, 30), cartM); B.add(cartB);
  B.add(section(x => x < 0.14 ? rB(x) + 0.03 : 0, -0.03, 0.14, 0, new THREE.MeshPhysicalMaterial({ color: 0xcfe6fa, roughness: 0.15, clearcoat: 1 }), 0.0005));
  // joint capsule: a translucent sleeve between the bones, rebuilt as the gap opens; fluid inside
  const capM = new THREE.MeshPhysicalMaterial({ color: 0xffc8b8, roughness: 0.3, clearcoat: 1, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, sheen: 1, sheenColor: new THREE.Color(0xffffff) });
  const fluidM = new THREE.MeshPhysicalMaterial({ color: 0xffd36a, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.0, emissive: 0xffa52a, emissiveIntensity: 0.25, side: THREE.DoubleSide, depthWrite: false });
  const cap = new THREE.Mesh(new THREE.BufferGeometry(), capM), fluid = new THREE.Mesh(new THREE.BufferGeometry(), fluidM); cap.renderOrder = 5; fluid.renderOrder = 4; sc.add(cap, fluid); R.capM = capM; R.fluidM = fluidM;
  const edgeM = new THREE.MeshPhysicalMaterial({ color: 0xff9a8a, roughness: 0.3, clearcoat: 1 }); const edges = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), edgeM); sc.add(m); return m; });
  const ligM = new THREE.MeshPhysicalMaterial({ color: 0xf2e6d8, roughness: 0.5, sheen: 1 });
  const ligs = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), ligM); m.castShadow = true; sc.add(m); return m; });
  const capProfile = (g) => x => { const a = -0.95, b = 0.95 + g; const k = clamp((x - a) / (b - a)); return lerp(0.47, 0.5, k) + (0.36 - 0.12 * g) * Math.sin(Math.PI * k); };
  R.setGap = (g) => {
    B.position.x = g; const pf = capProfile(g);
    cap.geometry.dispose(); cap.geometry = lathe(pf, -0.95, 0.95 + g, 60);
    fluid.geometry.dispose(); fluid.geometry = lathe(x => pf(x) - 0.05, -0.85, 0.85 + g, 50);
    [1, -1].forEach((sg, i) => { const pts = []; for (let k = 0; k <= 40; k++) { const x = lerp(-0.95, 0.95 + g, k / 40); pts.push(V(x, sg * pf(x), 0.002)); } edges[i].geometry.dispose(); edges[i].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.022, 8); });
    ligs.forEach((m, i) => { const zz = -0.35 - i * 0.18, yy = (i - 1) * 0.25; const pts = [V(-1.25, yy * 0.8, zz), V(-0.3, yy + 0.08 * Math.sign(yy || 1), zz - 0.32), V(0.3 + g, yy + 0.08 * Math.sign(yy || 1), zz - 0.32), V(1.25 + g, yy * 0.8, zz)]; m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.05, 8); });
  };
  R.setGap(0);
  // fluid particles, the bubble, micro-bubbles, a flash
  const parts = []; const r = rng(5); for (let i = 0; i < 46; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.012 + r() * 0.014, 8, 6), hdr(2.4, 1.7, 0.6, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sc.add(m); parts.push([m, r(), r(), r(), r()]); } R.parts = parts;
  const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.0, clearcoat: 1, transparent: true, opacity: 0.38, iridescence: 1, iridescenceIOR: 1.3, envMapIntensity: 2.5, depthWrite: false })); bub.renderOrder = 6; sc.add(bub); R.bub = bub;
  const bubRim = new THREE.Mesh(new THREE.SphereGeometry(1.02, 48, 32), xrayMat(new THREE.Color(1.6, 1.8, 2.0), new THREE.Color(0, 0, 0), 3.0, 0.9)); bub.add(bubRim);
  const micro = []; for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), bub.material); sc.add(m); micro.push([m, r(), r(), r()]); } R.micro = micro;
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), glow(0xffffff, 0)); sc.add(flash); R.flash = flash;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.015, 8, 64), hdr(2, 2.2, 2.4, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sc.add(ring); R.ring = ring;
  // brass pressure gauge on a thin probe
  const gauge = new THREE.Group(); gauge.position.set(0.55, 1.45, 0.25); sc.add(gauge); R.gauge = gauge;
  const gT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fbf8f0'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 3; for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.75 + 1.5 * i / 10); g.beginPath(); g.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); g.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); g.stroke(); } g.strokeStyle = '#e8303a'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 102, Math.PI * 0.75, Math.PI * 1.05); g.stroke(); g.fillStyle = '#333'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.fillText('PRESSURE', 128, 190); });
  const gface = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48), new THREE.MeshStandardMaterial({ map: gT, roughness: 0.4 })); gface.position.z = 0.03; gface.userData.dofMap = null; gauge.add(gface);
  const gbody = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 48), new THREE.MeshPhysicalMaterial({ color: 0xc8963a, metalness: 1, roughness: 0.28 })); gbody.rotation.x = Math.PI / 2; gbody.position.z = -0.02; gbody.castShadow = true; gauge.add(gbody);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: 0.12, clearcoat: 1 })); glass.position.z = 0.05; gauge.add(glass);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.24, 0.01), new THREE.MeshStandardMaterial({ color: 0x1a1a1a })); needle.geometry.translate(0, 0.1, 0); needle.position.z = 0.045; gauge.add(needle); R.needle = needle;
  const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 10), M.chrome); probe.position.set(0, -0.82, -0.05); gauge.add(probe);
  // stopwatch for the dissolve
  const sw = stopwatchProp(0x2ab8e8); sw.position.set(-0.9, 1.5, 0.3); sw.scale.setScalar(0.62); sc.add(sw); R.sw = sw;
  R.update = (t, { gap = 0, fluid = 0, cap = 0, gauge = 1, bubble = 0, born = -1, flashT = -1, micro = 0, swOn = 0, swVal = 0 } = {}) => {
    R.setGap(gap); fluidM.opacity = 0.32 * fluid; capM.opacity = 0.18 + 0.32 * cap; edgeM.emissive = edgeM.emissive || new THREE.Color(); edgeM.emissive.setRGB(0.35 * cap, 0.1 * cap, 0.08 * cap);
    parts.forEach(([m, a, b, c, d], i) => { const x = lerp(-0.75, 0.75 + gap, a), pf = capProfile(gap)(x) - 0.12; const ang = b * Math.PI + t * (0.2 + 0.4 * d), rr = pf * (0.5 + 0.5 * c); m.position.set(x + 0.05 * Math.sin(t + i), Math.cos(ang) * rr, -Math.abs(Math.sin(ang)) * rr * 0.6 - 0.02); const inBone = Math.abs(m.position.y) < (x < 0 ? rA(x) : rB(x - gap)) + 0.02; m.visible = fluid > 0.1 && !inBone; m.scale.setScalar(fluid); });
    needle.rotation.z = -Math.PI * (0.75 + 1.5 * gauge) + Math.PI / 2; gauge.visible = true; R.gauge.scale.setScalar(Math.max(0.0001, R.gaugeOn ?? 0));
    const bc = V(gap / 2 + 0.01, 0, -0.06); bub.position.copy(bc); bub.scale.setScalar(Math.max(0.0001, bubble)); bub.visible = bubble > 0.002;
    micro.forEach(([m, a, b, c], i) => { const k = clamp(micro_k(t, born, i)); m.visible = micro > 0 && k > 0 && k < 1; m.position.copy(bc).add(V(Math.cos(a * 6.3) * (0.15 + k * 0.5), Math.sin(a * 6.3) * (0.15 + k * 0.5), -0.1 - b * 0.3)); m.scale.setScalar(0.015 + 0.03 * c * (1 - k)); });
    const fa = t - flashT; R.flash.position.copy(bc); R.flash.material.opacity = flashT > 0 && fa > 0 ? Math.exp(-fa * 14) * 0.9 : 0; R.ring.visible = flashT > 0 && fa > 0 && fa < 0.5; R.ring.position.copy(bc); R.ring.scale.setScalar(0.5 + fa * 5); R.ring.material.color.setRGB(2 * (1 - fa * 2), 2.2 * (1 - fa * 2), 2.4 * (1 - fa * 2));
    sw.visible = swOn > 0.01; sw.scale.setScalar(0.62 * Math.max(0.0001, swOn)); const mm = Math.floor(swVal), ss = Math.floor((swVal % 1) * 60); sw.userData.tex.userData.draw(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`);
  };
  const micro_k = (t, born, i) => born < 0 ? -1 : (t - born - i * 0.01) / 0.6;
  return R;
}

// ---------- MRI room with an extremity scanner ----------
function mriRoom(sc) {
  sc.background = new THREE.Color(0xdfe8ef); sc.environment = ENV;
  const R = {};
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ color: 0xc9d2da, roughness: 0.3 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const wallM = new THREE.MeshLambertMaterial({ color: 0xe9eff4 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallM); back.position.set(0, 4, -3.2); back.receiveShadow = true; sc.add(back);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.25), new THREE.MeshLambertMaterial({ color: 0x5ab8e8 })); stripe.position.set(0, 1.6, -3.19); sc.add(stripe);
  for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), hdr(2.4, 2.4, 2.3)); p.rotation.x = Math.PI / 2; p.position.set(-2 + k * 2.6, 6.5, -0.5); sc.add(p); }
  sc.add(new THREE.HemisphereLight(0xffffff, 0xb8c4cc, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(3, 7, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 }); key.userData.soft = 0.25; sc.add(key);
  // scanner on a table
  const tableM = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35 });
  const tbl = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.1, 1.2, 2, 0.03), tableM); tbl.position.set(-0.6, 1.3, -0.6); tbl.castShadow = tbl.receiveShadow = true; sc.add(tbl);
  [[-1.5, -1.1], [0.3, -1.1], [-1.5, -0.1], [0.3, -0.1]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 10), M.chrome); l.position.set(x, 0.65, z); sc.add(l); });
  const scanner = new THREE.Group(); scanner.position.set(-0.8, 2.05, -0.6); scanner.rotation.y = Math.PI / 2; sc.add(scanner); R.scanner = scanner;
  const shell = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.3, 32, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1 })); shell.scale.z = 2.4; shell.castShadow = true; scanner.add(shell);
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.4, 1.4, 3, 0.08), new THREE.MeshPhysicalMaterial({ color: 0xf2f4f6, roughness: 0.3 })); base.position.y = -0.62; scanner.add(base);
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8e2ea, side: THREE.BackSide, roughness: 0.5 })); bore.rotation.x = Math.PI / 2; scanner.add(bore);
  const lightRing = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.025, 10, 80), hdr(0.6, 2.2, 3.2)); lightRing.position.z = 0.73; scanner.add(lightRing);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.12), new THREE.MeshBasicMaterial({ color: 0x5ab8e8 })); logo.position.set(0, 0.55, 0.735); scanner.add(logo);
  // finger-pull rig: cable from the bore to a pulley and a hanging weight
  const cable = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x2a2a2a })); sc.add(cable); R.cable = cable;
  const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 10, 24), M.chrome); pulley.position.set(-2.05, 1.65, -0.6); pulley.rotation.y = Math.PI / 2; sc.add(pulley);
  const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 20), new THREE.MeshPhysicalMaterial({ color: 0x3a3a40, metalness: 0.8, roughness: 0.3 })); weight.castShadow = true; sc.add(weight); R.weight = weight;
  // scientist's desk and the MRI monitor
  const desk = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.08, 0.9, 2, 0.02), tableM); desk.position.set(2.2, 1.38, -1.3); desk.castShadow = desk.receiveShadow = true; sc.add(desk);
  const mri = canvasDyn(512, 512); R.mri = mri;
  const mon = new THREE.Group(); mon.position.set(2.2, 2.1, -1.6); mon.rotation.y = -0.25; sc.add(mon); R.mon = mon;
  const bez = new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.25, 0.06, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x15171a })); mon.add(bez);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), new THREE.MeshBasicMaterial({ map: mri.t, color: new THREE.Color(1.3, 1.3, 1.3) })); scr.position.z = 0.032; mon.add(scr); R.scr = scr;
  const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), M.black); st.position.set(0, -0.62, -0.05); mon.add(st);
  const r = rng(9), noise = [...Array(900)].map(() => [r() * 512, r() * 512, r()]);
  R.drawMRI = (t, k = 0, pull = 0) => {
    const g = mri.g; g.fillStyle = '#050505'; g.fillRect(0, 0, 512, 512);
    const gr = g.createRadialGradient(256, 256, 30, 256, 256, 260); gr.addColorStop(0, '#3a3a3a'); gr.addColorStop(1, '#141414'); g.fillStyle = gr; g.beginPath(); g.ellipse(256, 256, 120, 250, 0, 0, 7); g.fill();
    const gap = 6 + 16 * pull;
    g.fillStyle = '#9a9a9a'; g.beginPath(); g.ellipse(256, 150, 62, 95, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(256, 372 + gap, 64, 110, 0, 0, 7); g.fill();
    g.fillStyle = '#d0d0d0'; g.beginPath(); g.ellipse(256, 150, 40, 80, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(256, 372 + gap, 42, 92, 0, 0, 7); g.fill();
    g.fillStyle = '#6a6a6a'; g.beginPath(); g.ellipse(256, 262 + gap / 2, 70, 18 + gap / 2, 0, 0, 7); g.fill();
    if (k > 0) { g.fillStyle = '#000'; g.beginPath(); g.ellipse(256, 262 + gap / 2, 34 * k, 22 * k, 0, 0, 7); g.fill(); }
    noise.forEach(([x, y, a]) => { g.fillStyle = `rgba(255,255,255,${0.06 * a})`; g.fillRect(x, y, 2, 2); });
    g.fillStyle = '#7ad8ff'; g.font = '16px monospace'; g.fillText(`CINE MRI  ${String(Math.floor(t * 10) % 1000).padStart(3, '0')}`, 14, 24); g.fillText('FINGER JOINT', 14, 496);
    g.strokeStyle = 'rgba(122,216,255,0.6)'; g.strokeRect(150, 210, 212, 110); mri.t.needsUpdate = true;
  };
  R.drawMRI(0);
  return R;
}

// ---------- doctor's office with a time-lapse window ----------
function doctorOffice(sc) {
  sc.background = new THREE.Color(0x2a1e16); sc.environment = MENV;
  const R = {};
  const panel = woodTex('#7a5232', '#3e2614', 81, [4, 1], 0);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: woodTex('#6a4428', '#2e1a0c', 82, [3, 3], 6), roughness: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  const lower = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.6), new THREE.MeshStandardMaterial({ map: panel, roughness: 0.5 })); lower.position.set(0, 0.8, -2.5); sc.add(lower);
  const upper = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshLambertMaterial({ color: 0xd8c8a8, bumpMap: PLASTER, bumpScale: 0.4 })); upper.position.set(0, 4.6, -2.5); sc.add(upper);
  // window that races through days and nights
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) })); sky.position.set(-2.2, 3.4, -2.48); sc.add(sky); R.sky = sky;
  const wf = new THREE.MeshStandardMaterial({ color: 0xf2ece0 }); [[0, 0.95, 1.8, 0.1], [0, -0.95, 1.8, 0.1], [-0.85, 0, 0.1, 2.0], [0.85, 0, 0.1, 2.0], [0, 0, 0.05, 1.8]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), wf); b.position.set(-2.2 + x, 3.4 + y, -2.44); sc.add(b); });
  // calendar
  const cal = canvasDyn(256, 320); R.cal = cal; const calM = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.94), new THREE.MeshStandardMaterial({ map: cal.t, roughness: 0.8 })); calM.position.set(-0.6, 3.6, -2.47); sc.add(calM);
  const flyer = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.94), new THREE.MeshStandardMaterial({ color: 0xfaf6ee, side: THREE.DoubleSide })); sc.add(flyer); R.flyer = flyer;
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  R.drawCal = (k) => { const g = cal.g; g.fillStyle = '#faf6ee'; g.fillRect(0, 0, 256, 320); g.fillStyle = '#c8303a'; g.fillRect(0, 0, 256, 70); g.fillStyle = '#fff'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.fillText(MONTHS[k % 12], 128, 52); g.fillStyle = '#333'; g.font = '18px sans-serif'; for (let i = 0; i < 30; i++) g.fillText(String(i + 1), 30 + (i % 7) * 33, 110 + Math.floor(i / 7) * 42); cal.t.needsUpdate = true; };
  R.drawCal(0);
  // x-ray lightbox with both hands
  const xr = canvasTex(512, 320, (g, w, h) => { g.fillStyle = '#0c1418'; g.fillRect(0, 0, w, h); [[128, 'L'], [384, 'R']].forEach(([cx, lab]) => { g.strokeStyle = 'rgba(230,240,245,0.9)'; g.fillStyle = 'rgba(220,235,240,0.85)'; g.lineCap = 'round'; const fing = [[-48, 120], [-18, 140], [12, 134], [40, 112]]; fing.forEach(([dx, L], i) => { let y = 220; [0.5, 0.3, 0.2].forEach((f, k) => { g.lineWidth = 12 - k * 2; g.beginPath(); g.moveTo(cx + dx * (1 + k * 0.1), y); g.lineTo(cx + dx * (1 + (k + 1) * 0.1), y - L * f); g.stroke(); y -= L * f + 6; }); g.lineWidth = 12; g.beginPath(); g.moveTo(cx + dx * 0.5, 300); g.lineTo(cx + dx, 226); g.stroke(); }); g.lineWidth = 13; g.beginPath(); g.moveTo(cx - (lab === 'L' ? -60 : 60), 300); g.lineTo(cx - (lab === 'L' ? -84 : 84), 230); g.lineTo(cx - (lab === 'L' ? -100 : 100), 190); g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 28px sans-serif'; g.fillText(lab, cx - 100, 40); }); });
  const lb = new THREE.Group(); lb.position.set(1.4, 3.6, -2.45); sc.add(lb); R.lb = lb;
  const lbFrame = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.32, 0.1, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4 })); lb.add(lbFrame);
  const film = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 1.16), new THREE.MeshBasicMaterial({ map: xr, color: new THREE.Color(1.2, 1.25, 1.3) })); film.position.z = 0.055; lb.add(film); R.film = film;
  const ticks = [-0.47, 0.47].map(x => { const tk = textPlane('✓', 0.5, '#4ad87a', '#0a3a1a'); tk.position.set(x + 0.32, 0.32, 0.07); tk.scale.setScalar(0.0001); tk.userData.dofMap = tk.material.map; lb.add(tk); return tk; }); R.ticks = ticks;
  // desk, lamp, tally counter
  const desk = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.1, 1.2, 2, 0.03), new THREE.MeshStandardMaterial({ map: woodTex('#5a3418', '#2a160a', 83), roughness: 0.4 })); desk.position.set(0, 1.4, 0.2); desk.castShadow = desk.receiveShadow = true; sc.add(desk);
  const front = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 0.08), new THREE.MeshStandardMaterial({ map: panel, roughness: 0.5 })); front.position.set(0, 0.7, 0.78); front.castShadow = true; sc.add(front);
  const lampB = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.06, 24), new THREE.MeshPhysicalMaterial({ color: 0x2a5a3a, metalness: 0.6, roughness: 0.3 })); lampB.position.set(-0.95, 1.48, 0.0); sc.add(lampB);
  const lampS = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 0.22, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x2a6a3a, roughness: 0.3, side: THREE.DoubleSide, emissive: 0xffd080, emissiveIntensity: 0.3 })); lampS.position.set(-0.75, 2.05, 0.05); sc.add(lampS);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8), M.chrome); arm.position.set(-0.88, 1.78, 0.02); arm.rotation.z = -0.4; sc.add(arm);
  const lampL = new THREE.PointLight(0xffd8a0, 4, 5, 2); lampL.position.set(-0.75, 1.9, 0.1); sc.add(lampL);
  const tally = canvasDyn(256, 96); R.tally = tally;
  const tc = new THREE.Group(); R.tc = tc;
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 32), new THREE.MeshPhysicalMaterial({ color: 0xdadfe4, metalness: 1, roughness: 0.2 })); tb.rotation.x = Math.PI / 2; tc.add(tb);
  const tw = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.055), new THREE.MeshBasicMaterial({ map: tally.t })); tw.position.z = 0.037; tc.add(tw);
  const tbtn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 12), M.chrome); tbtn.position.y = 0.13; tc.add(tbtn);
  const tring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), M.chrome); tring.position.y = -0.13; tc.add(tring);
  R.drawTally = (n) => { const g = tally.g; g.fillStyle = '#111'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#f2f2f2'; g.font = 'bold 72px monospace'; g.textAlign = 'center'; g.fillText(String(Math.floor(n)).padStart(5, '0'), 128, 74); tally.t.needsUpdate = true; };
  R.drawTally(0);
  sc.add(new THREE.HemisphereLight(0xfff0dc, 0x5a4030, 0.7));
  const key = new THREE.DirectionalLight(0xffe8c8, 1.8); key.position.set(3, 6, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 }); key.userData.soft = 0.2; sc.add(key); R.key = key;
  return R;
}
// gnarled, arthritic hand for grandma's warning
function arthriticHand() {
  const H = makeHandRig({ side: 'R', skin: 0xe8a890 }); H.G.traverse(o => { if (o.isMesh && o.geometry.type === 'SphereGeometry' && o.parent === H.G) o.scale.multiplyScalar(1.7); });
  H.fingers.forEach((f, i) => { f.joints[1].children.forEach(c => { if (c.isMesh && c.geometry.type === 'SphereGeometry') c.scale.multiplyScalar(1.6); }); });
  H.pose({ c: [0.35, 0.4, 0.45, 0.5], thumb: 0.3 }); H.fingers.forEach((f, i) => { f.mcp.rotation.z += -H.tx * 0.35; f.joints[1].rotation.z = H.tx * 0.25 * (i % 2 ? 1 : -1); });
  H.skinM.color.set(0xe89a88); return H;
}
