// =====================================================================
// ASSETS (laptop short): Poly Haven rooms + desert sky (CC0), desk lamp, armchair, plant, wood/walnut/sand/plaster textures;
// three real scans of real cats and the rigged "Fripouille" cat (CC BY).
// =====================================================================
const [ROOM, FIRE, LOUNGE, SUNNY, DESERT] = await Promise.all(['lythwood_room_4k.hdr', 'fireplace_2k.hdr', 'lythwood_lounge_4k.hdr', 'kiara_interior_4k.hdr', 'goegap_4k.hdr'].map(loadHDR));
await Promise.all(['desk_lamp_arm_01', 'ArmChair_01', 'potted_plant_02'].map(async id => { MOD[id] = await loadModel(id); }));
const TX = {}; [TX.floor, TX.walnut, TX.sand, TX.wall] = await Promise.all(['wood_floor', 'walnut_veneer', 'coast_sand_01', 'beige_wall_001'].map(id => loadPBR(id)));
const boardRule = (r, g, b, h, s, l) => l > 0.62 && s < 0.2;
const SCAN = {
  hero: await loadScan('assets/cats/scan_table.glb', { drop: boardRule, planeTol: 1.3 }),           // a tabby stretched out asleep
  pillow: await loadScan('assets/cats/scan_comfy.glb', { scale: 14.4 }),                            // a grey cat curled on its pillow
  mat: await loadScan('assets/cats/scan_other.glb', { scale: 75 }),                                 // a tabby curled on its mat
};
const scanCopy = (k) => { const c = SCAN[k].clone(true); c.userData.info = SCAN[k].userData.info; return c; };
function envK(sc, k) { sc.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m && 'envMapIntensity' in m) { m.userData.envBase ??= m.envMapIntensity ?? 1; m.envMapIntensity = m.userData.envBase * k; } }); }
const shadowSun = (col, I, pos, r = 80, soft = 0.6) => { const l = new THREE.DirectionalLight(col, I); l.position.copy(pos); l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0003; l.shadow.normalBias = 0.6;
  Object.assign(l.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: pos.length() * 2 + 200 }); l.userData.soft = soft; return l; };
// ray-cast down to find the top of a surface
function surfaceY(obj, x, z, from = 300) { obj.updateMatrixWorld(true); const rc = new THREE.Raycaster(V(x, from, z), V(0, -1, 0)); const h = rc.intersectObject(obj, true); return h.length ? h[0].point.y : 0; }

// ---------------------------------------------------------------------
// MODERN LAPTOP (procedural): anodised aluminium unibody, black keys with backlit legends, glass trackpad, thin-bezel screen.
// 30.4 x 21.2 cm, faces +z (the user), hinge at the back. lap.screen.set({ mode, n, heat, clock }) redraws the display.
// ---------------------------------------------------------------------
const ALU = new THREE.MeshPhysicalMaterial({ color: 0x8e9196, metalness: 1, roughness: 0.32, clearcoat: 0.2, clearcoatRoughness: 0.4 });
const KEYM = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.62 });
const GLASSPAD = new THREE.MeshPhysicalMaterial({ color: 0x9a9da2, metalness: 0.6, roughness: 0.12, clearcoat: 1 });
const KEYROWS = [
  ['esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', ''],
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete'],
  ['tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'return'],
  ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'shift'],
  ['fn', 'ctrl', 'opt', 'cmd', ' ', 'cmd', 'opt', '◀', '▲▼', '▶'],
];
const KEYW = { esc: 1.5, delete: 1.5, tab: 1.5, '\\': 1.5, caps: 1.8, return: 1.8, shift: 2.35, ' ': 5.6, cmd: 1.25, '': 1 };
function makeLaptop({ lid = 112 } = {}) {
  const g = new THREE.Group(), Wd = 30.4, D = 21.2, T = 1.45;
  const base = new THREE.Mesh(new RoundedBoxGeometry(Wd, T, D, 4, 0.55), ALU); base.position.y = T / 2; base.castShadow = base.receiveShadow = true; g.add(base);
  // keyboard well
  const well = new THREE.Mesh(new RoundedBoxGeometry(27.6, 0.2, 11.6, 2, 0.3), new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.8 })); well.position.set(0, T - 0.04, -D / 2 + 2.0 + 5.8); g.add(well);
  // keys (instanced) + legend positions
  const keyGeo = new RoundedBoxGeometry(1, 0.32, 1, 2, 0.12); const pos = [];
  const unit = 1.86, gap = 0.2, top = -D / 2 + 2.25;
  KEYROWS.forEach((row, r) => { const h = r === 0 ? 0.9 : 1.62; let total = row.reduce((a, k) => a + (KEYW[k] || 1) * unit, 0) - gap; let x = -total / 2;
    const z = top + (r === 0 ? 0.45 : 0.9 + 0.3 + (r - 1) * (1.62 + gap) + 0.81) ;
    row.forEach(k => { const w = (KEYW[k] || 1) * unit - gap; pos.push({ k, x: x + w / 2, z, w, h }); x += w + gap; }); });
  const keys = new THREE.InstancedMesh(keyGeo, KEYM, pos.length); const m4 = new THREE.Matrix4();
  pos.forEach((p, i) => { m4.compose(V(p.x, T + 0.1, p.z), new THREE.Quaternion(), V(p.w, 1, p.h)); keys.setMatrixAt(i, m4); });
  keys.castShadow = true; keys.receiveShadow = true; g.add(keys); g.userData.keys = pos; g.userData.keyTop = T + 0.27;
  // backlit legends on one transparent plane over the keys
  const [lc, lg] = mkCanvas(2048, 1024), sx = 2048 / 28, sz = 1024 / 12, z0 = -D / 2 + 2.0;
  lg.clearRect(0, 0, 2048, 1024); lg.fillStyle = 'rgba(235,240,255,0.92)'; lg.textAlign = 'center'; lg.textBaseline = 'middle';
  pos.forEach(p => { if (!p.k.trim()) return; const fs = p.k.length > 2 ? 22 : (p.k.length > 1 ? 26 : 34); lg.font = `500 ${fs}px "Helvetica Neue", Arial, sans-serif`; lg.fillText(p.k, (p.x + 14) * sx, (p.z - z0) * sz); });
  const lt = texOf(lc); lt.wrapS = lt.wrapT = THREE.ClampToEdgeWrapping;
  const leg = new THREE.Mesh(new THREE.PlaneGeometry(28, 12), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, toneMapped: false, color: 0x9aa4b8, polygonOffset: true, polygonOffsetFactor: -2 }));
  leg.rotation.x = -Math.PI / 2; leg.position.set(0, T + 0.275, z0 + 6); leg.userData.noDof = true; g.add(leg);
  // trackpad
  const pad = new THREE.Mesh(new RoundedBoxGeometry(12.4, 0.06, 7.6, 2, 0.4), GLASSPAD); pad.position.set(0, T + 0.005, D / 2 - 4.9); g.add(pad);
  // lid
  const lidG = new THREE.Group(); lidG.position.set(0, T, -D / 2 + 0.35); g.add(lidG);
  const back = new THREE.Mesh(new RoundedBoxGeometry(Wd, 0.55, D - 0.4, 4, 0.27), ALU); back.position.set(0, 0.28, (D - 0.4) / 2 - 0.2); back.castShadow = true; lidG.add(back);
  const bez = new THREE.Mesh(new THREE.PlaneGeometry(Wd - 0.5, D - 0.9), new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.08, clearcoat: 1 })); bez.position.set(0, -0.03, (D - 0.4) / 2 - 0.2); bez.rotation.x = Math.PI / 2; lidG.add(bez);
  const [sc, sg] = mkCanvas(1600, 1000); const stex = texOf(sc); stex.wrapS = stex.wrapT = THREE.ClampToEdgeWrapping;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(28.6, 17.9), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: stex, emissiveIntensity: 1.05, roughness: 0.18, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  scr.position.set(0, -0.09, (D - 0.4) / 2 - 0.2 + 0.45); scr.rotation.x = Math.PI / 2; lidG.add(scr);
  lidG.rotation.x = -THREE.MathUtils.degToRad(lid);
  const screenLight = new THREE.PointLight(0xbcd2ff, 0, 60, 2); screenLight.position.set(0, 9, -2); g.add(screenLight);
  g.userData.lid = lidG; g.userData.screenMesh = scr; g.userData.screenLight = screenLight;
  let last = '';
  g.userData.screen = { set(st = {}) { const key = JSON.stringify(st); if (key === last) return; last = key; drawScreen(sg, st); stex.needsUpdate = true; } };
  g.userData.screen.set({ mode: 'doc' });
  g.userData.T = T; g.userData.D = D; g.userData.W = Wd;
  return g;
}
// the display: a desktop with a document window; 'jjj' types a run of letters; heat overlays an eye-tracking heat map
const DOC_LINES = ['Quarterly plan — draft 3', '', 'Goals for next quarter', 'Ship the new onboarding flow by the end of the month and', 'measure how many people finish it. Then interview ten', 'customers about the parts they skipped and why.', '', 'Budget', 'Keep spending flat. Move the design contract to Q2 and', 'reuse the photos from the spring campaign.', '', 'Notes', 'Book the meeting room for Thursday. Ask Sam about the', 'numbers before Friday.'];
function drawScreen(g, { mode = 'doc', n = 0, heat = 0, clock = '9:41', dim = 1 } = {}) {
  const w = 1600, h = 1000;
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#1d3557'); bg.addColorStop(0.6, '#3d5a80'); bg.addColorStop(1, '#98c1d9'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(20,22,28,0.85)'; g.fillRect(0, 0, w, 34); g.fillStyle = '#e8ecf2'; g.font = '500 22px "Helvetica Neue", Arial'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(clock, w - 24, 17);
  g.textAlign = 'left'; g.fillText('File   Edit   View   Format', 60, 17);
  // window
  const x0 = 170, y0 = 80, ww = 1260, wh = 820;
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x0 + 10, y0 + 14, ww, wh);
  g.fillStyle = '#f7f7f5'; g.fillRect(x0, y0, ww, wh); g.fillStyle = '#e4e4e2'; g.fillRect(x0, y0, ww, 44);
  [['#ff5f57', 0], ['#febc2e', 1], ['#28c840', 2]].forEach(([c, i]) => { g.fillStyle = c; g.beginPath(); g.arc(x0 + 26 + i * 26, y0 + 22, 8, 0, 7); g.fill(); });
  g.fillStyle = '#222'; g.textBaseline = 'alphabetic';
  let y = y0 + 110;
  const typed = mode === 'jjj' ? Math.floor(n) : 0;
  (typed > 0 ? DOC_LINES.slice(0, 6) : DOC_LINES).forEach((ln, i) => { g.font = i === 0 ? '700 40px Georgia, serif' : (['Goals for next quarter', 'Budget', 'Notes'].includes(ln) ? '700 28px "Helvetica Neue", Arial' : '400 26px Georgia, serif'); g.fillStyle = '#1e1e1e'; g.fillText(ln, x0 + 70, y); y += i === 0 ? 60 : 40; });
  if (typed > 0) { // the cat's weight on the keys: one long run of letters, wrapping
    g.font = '400 26px Georgia, serif'; g.fillStyle = '#1e1e1e'; const run = 'j'.repeat(Math.min(typed, 2000)); const per = 78; let yy = y; for (let i = 0; i < run.length; i += per) { g.fillText(run.slice(i, i + per) + (i + per >= run.length ? '|' : ''), x0 + 70, yy); yy += 34; if (yy > y0 + wh - 20) break; } }
  else { g.fillStyle = '#1e1e1e'; g.fillRect(x0 + 70 + g.measureText('').width, y - 26, 3, 32); }
  // dock
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(520, h - 74, 560, 62); ['#4f8ef7', '#f7b84f', '#55c27a', '#e45d5d', '#9b6cf0', '#3cc6c9', '#f08fb8'].forEach((c, i) => { g.fillStyle = c; g.fillRect(540 + i * 76, h - 66, 52, 46); });
  if (heat > 0) { g.globalCompositeOperation = 'source-over';
    const blobs = [[x0 + 330, y0 + 110, 150], [x0 + 520, y0 + 270, 210], [x0 + 420, y0 + 400, 170], [x0 + 700, y0 + 520, 150], [x0 + 300, y0 + 600, 120], [w - 70, 17, 60]];
    blobs.forEach(([bx, by, r], i) => { const k = clamp(heat * blobs.length - i); if (k <= 0) return; const gr = g.createRadialGradient(bx, by, 0, bx, by, r * (0.6 + 0.4 * k));
      gr.addColorStop(0, `rgba(255,40,20,${0.62 * k})`); gr.addColorStop(0.35, `rgba(255,200,0,${0.42 * k})`); gr.addColorStop(0.7, `rgba(40,220,90,${0.25 * k})`); gr.addColorStop(1, 'rgba(0,80,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); }
  if (dim < 1) { g.fillStyle = `rgba(0,0,0,${1 - dim})`; g.fillRect(0, 0, w, h); }
}

// ---------------------------------------------------------------------
// THERMAL CAMERA: every surface gets a temperature; the ironbow palette maps 18-40 C to black-purple-orange-yellow-white.
// thermalize(scene, rule) swaps materials (rule(o) -> { t0, t1, hot, r, edge }) and sets a cool background.
// ---------------------------------------------------------------------
const IRONBOW = `vec3 ironbow(float t){ t=clamp(t,0.,1.);
  vec3 c0=vec3(0.,0.,0.03), c1=vec3(0.13,0.0,0.38), c2=vec3(0.55,0.02,0.55), c3=vec3(0.92,0.22,0.12), c4=vec3(1.0,0.58,0.0), c5=vec3(1.0,0.88,0.25), c6=vec3(1.0,1.0,0.85);
  if(t<0.16) return mix(c0,c1,t/0.16); if(t<0.36) return mix(c1,c2,(t-0.16)/0.2); if(t<0.56) return mix(c2,c3,(t-0.36)/0.2); if(t<0.74) return mix(c3,c4,(t-0.56)/0.18); if(t<0.9) return mix(c4,c5,(t-0.74)/0.16); return mix(c5,c6,(t-0.9)/0.1); }`;
function thermalMat({ t0 = 21, t1 = 21, hot = null, r = 10, edge = 0, nz = 0.35, gy = 0, hot2 = null, r2 = 10, t2 = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { t0: { value: t0 }, t1: { value: t1 }, hot: { value: hot || V(0, -1e5, 0) }, r: { value: r }, edge: { value: edge }, nz: { value: nz }, gy: { value: gy }, hot2: { value: hot2 || V(0, -1e5, 0) }, r2: { value: r2 }, t2: { value: t2 } },
    vertexShader: `#include <common>\n#include <skinning_pars_vertex>\nvarying vec3 vW; varying vec3 vN;\nvoid main(){\n#include <skinbase_vertex>\n#include <beginnormal_vertex>\n#include <skinnormal_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\n\n#ifdef USE_INSTANCING\ntransformed=(instanceMatrix*vec4(transformed,1.)).xyz;\n#endif\nvec4 wp=modelMatrix*vec4(transformed,1.); vW=wp.xyz; vN=normalize(mat3(modelMatrix)*objectNormal); gl_Position=projectionMatrix*viewMatrix*wp;\n}`,
    fragmentShader: `uniform float t0,t1,r,edge,nz,gy,r2,t2; uniform vec3 hot,hot2; varying vec3 vW; varying vec3 vN; ${IRONBOW}
      float hsh(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
      void main(){ vec3 d=vW-hot; float T=t0+(t1-t0)*exp(-dot(d,d)/(r*r)); vec3 d2=vW-hot2; T+=t2*exp(-dot(d2,d2)/(r2*r2)); T+=gy*vW.y;
        vec3 v=normalize(cameraPosition-vW); float f=1.-abs(dot(normalize(vN),v)); T-=edge*f*f; T+=nz*(hsh(floor(vW*1.7))-0.5);
        gl_FragColor=vec4(ironbow((T-18.)/22.)*1.05,1.); }`,
    side: THREE.DoubleSide, toneMapped: false });
}
function thermalize(sc, rule) {
  const list = []; sc.traverse(o => { if (o.isMesh || o.isInstancedMesh) list.push(o); });
  for (const o of list) { if (o.userData.noThermal) { o.visible = false; continue; } const r = rule(o) || { t0: 21 }; o.material = thermalMat(r); o.castShadow = false; }
  sc.background = new THREE.Color(0x0b0418); sc.environment = null;
}
// the HUD: a temperature scale and a crosshair readout (drawn crisp on the overlay)
function thermalHud(s, { cross = null } = {}) {
  const lab = liveLabel(0.9, 1.6); OV(s, lab);
  const c = lab.material.map.image, g = c.getContext('2d');
  lab.userData.draw = (t, readout = null, crossOn = 0) => {
    const key = `${readout}|${crossOn.toFixed(2)}|${Math.floor(t * 2) % 2}`; if (lab.userData.k === key) return; lab.userData.k = key;
    g.clearRect(0, 0, c.width, c.height); const W2 = c.width, H2 = c.height;
    g.font = '800 44px "Nunito", Arial'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillText('THERMAL', 70, 80);
    g.fillStyle = Math.floor(t * 2) % 2 ? '#ff3b30' : 'rgba(255,59,48,0.3)'; g.beginPath(); g.arc(40, 80, 13, 0, 7); g.fill();
    const bx = W2 - 80, by0 = 120, by1 = H2 - 260; const gr = g.createLinearGradient(0, by1, 0, by0);
    [[0, '#000008'], [0.16, '#210061'], [0.36, '#8c058c'], [0.56, '#eb381f'], [0.74, '#ff9400'], [0.9, '#ffe040'], [1, '#ffffd9']].forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(bx, by0, 26, by1 - by0); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.strokeRect(bx, by0, 26, by1 - by0);
    g.font = '700 30px "Nunito", Arial'; g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText('40°', bx - 12, by0 + 4); g.fillText('29°', bx - 12, (by0 + by1) / 2); g.fillText('18°', bx - 12, by1 - 4);
    if (crossOn > 0) { const cx = W2 / 2, cy = H2 / 2 + 60; g.globalAlpha = crossOn; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 60, cy); g.lineTo(cx - 18, cy); g.moveTo(cx + 18, cy); g.lineTo(cx + 60, cy); g.moveTo(cx, cy - 60); g.lineTo(cx, cy - 18); g.moveTo(cx, cy + 18); g.lineTo(cx, cy + 60); g.stroke();
      if (readout) { g.font = '900 78px "Nunito", Arial'; g.textAlign = 'left'; g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(readout, cx + 50, cy - 80); g.fillStyle = '#fff'; g.fillText(readout, cx + 50, cy - 80); } g.globalAlpha = 1; }
    lab.material.map.needsUpdate = true; };
  return lab;
}

// ---------------------------------------------------------------------
// SETS
// ---------------------------------------------------------------------
// the desk at night: walnut desk (top at y = 0), laptop, lamp, plant; the room behind is the HDR
function deskSet(s, { hero = true, lampI = 1 } = {}) {
  const sc = s.scene; sc.background = ROOM.tex; sc.backgroundIntensity = 0.5; sc.environment = ROOM.env; sc.backgroundBlurriness = 0.0;
  const desk = new THREE.Mesh(new RoundedBoxGeometry(170, 4, 150, 3, 0.6), pbrMat(TX.walnut, { rep: [2.2, 2], rough: 0.85 })); desk.position.set(0, -2, 20); desk.receiveShadow = true; desk.castShadow = true; sc.add(desk);
  const lap = makeLaptop(); sc.add(lap); s.lap = lap;
  const lamp = model('desk_lamp_arm_01', 100); lamp.position.set(-74, 0, -40); lamp.rotation.y = 0.9; sc.add(lamp);
  const plant = model('potted_plant_02', 55); plant.position.set(52, 0, -30); sc.add(plant);
  // lamp: warm pool of light with soft shadows
  const key = new THREE.SpotLight(0xffc98a, 9000 * lampI, 260, 0.75, 0.6, 2); key.position.set(-52, 66, -22); key.target.position.set(4, 0, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.userData.soft = 2.5; sc.add(key, key.target);
  const fill = new THREE.PointLight(0x9fb8ff, 900, 200, 2); fill.position.set(40, 50, 60); sc.add(fill);
  lap.userData.screenLight.intensity = 260;
  if (hero) { const cat = scanCopy('hero'); cat.rotation.y = 0.12; seatScan(cat, -8, lap.userData.T + 0.15, 1.5); sc.add(cat); s.cat = cat; }
  envK(sc, 0.55);
  return { desk, lap, lamp, key };
}
// a thermal rule for the desk scenes
function deskThermal(s) {
  const lapPos = V(0, 0.6, 0);
  thermalize(s.scene, o => {
    let p = o; while (p) { if (p === s.cat) return { t0: 29.5, t1: 37.5, hot: V(-8, 8, 3), r: 22, edge: 7, nz: 0.8 }; if (p === s.lap) return { t0: 27, t1: 38.5, hot: lapPos, r: 16, nz: 0.3, edge: 1 }; p = p.parent; }
    if (o.userData.isLamp) return { t0: 24, t1: 33, hot: V(-30, 68, -8), r: 8 };
    return { t0: 20.5, t1: 27, hot: V(0, 0, 0), r: 20, nz: 0.5 };
  });
}
// by the fire: wood floor, a rug, the tabby stretched out in the warmth
function fireSet(s) {
  const sc = s.scene; sc.background = FIRE.tex; sc.backgroundIntensity = 0.7; sc.environment = FIRE.env;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), pbrMat(TX.floor, { rep: [6, 6], rough: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
  const rug = new THREE.Mesh(new RoundedBoxGeometry(150, 1.2, 100, 2, 0.5), new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7a2e22'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 4, 40); g.strokeStyle = '#d9b77c'; g.lineWidth = 14; g.strokeRect(30, 30, w - 60, h - 60); g.lineWidth = 4; g.strokeRect(60, 60, w - 120, h - 120); }), roughness: 1 }));
  rug.position.y = 0.6; rug.receiveShadow = true; sc.add(rug);
  const cat = scanCopy('hero'); cat.rotation.y = -0.4; seatScan(cat, 0, 1.2, 0); sc.add(cat); s.cat = cat;
  const fire = new THREE.PointLight(0xff8a3a, 52000, 700, 2); fire.position.set(-30, 48, 150); fire.castShadow = true; fire.shadow.mapSize.set(1024, 1024); fire.userData.soft = 6; sc.add(fire); s.fire = fire;
  const glow = new THREE.DirectionalLight(0xff9a50, 2.6); glow.position.set(-80, 50, 120); sc.add(glow); const rim = new THREE.DirectionalLight(0xffb070, 1.6); rim.position.set(40, 40, -160); sc.add(rim);
  envK(sc, 0.7);
}
// the armchair you just got up from
function chairSet(s) {
  const sc = s.scene; sc.background = LOUNGE.tex; sc.backgroundIntensity = 0.75; sc.environment = LOUNGE.env;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), pbrMat(TX.floor, { rep: [6, 6], rough: 0.8 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
  const ch = model('ArmChair_01', 100); sc.add(ch); s.chair = ch;
  const seat = surfaceY(ch, 0, 2);
  const cat = scanCopy('pillow'); cat.rotation.y = 0.4; seatScan(cat, 0, seat + 4, 4); sc.add(cat); s.cat = cat; s.seat = seat;
  const sun = shadowSun(0xfff0dc, 2.2, V(120, 220, 160), 120, 4); sc.add(sun);
  envK(sc, 0.9);
}
// sun through a window onto the floor: the window frame is an off-screen wall that casts the pane shadows
function sunbeamSet(s) {
  const sc = s.scene; sc.background = new THREE.Color(0x2a221b); sc.environment = SUNNY.env;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), pbrMat(TX.floor, { rep: [9, 9], rough: 0.7 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
  const wall = new THREE.Group(); const wm = new THREE.MeshStandardMaterial({ color: 0xffffff, colorWrite: false }); const bar = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), wm); m.position.set(x, y, 0); m.castShadow = true; wall.add(m); };
  bar(720, 200, 0, 300); bar(720, 180, 0, -10); bar(300, 120, -210, 140); bar(300, 120, 210, 140); bar(5, 120, 0, 140); bar(120, 5, 0, 140);
  wall.position.set(0, 0, -260); sc.add(wall);
  const sun = shadowSun(0xffe2b0, 7, V(0, 330, -420), 260, 0.8); sc.add(sun); s.sun = sun;
  const cat = scanCopy('hero'); seatScan(cat, 0, 0.1, 0); sc.add(cat); s.cat = cat;
  envK(sc, 0.14);
}
// the desert at golden hour: dunes of real sand texture under the real sky
function desertSet(s) {
  const sc = s.scene; sc.background = DESERT.tex; sc.backgroundIntensity = 1.0; sc.environment = DESERT.env;
  const geo = new THREE.PlaneGeometry(6000, 6000, 220, 220); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const d = Math.hypot(x, z); const amp = smooth(150, 1600, d); p.setY(i, amp * (60 * Math.sin(x * 0.0021 + z * 0.0009) + 35 * Math.sin(z * 0.004 - x * 0.0013 + 1.3)) + 6 * fbm(x * 0.004, z * 0.004) - 0.0); }
  geo.computeVertexNormals();
  const sand = new THREE.Mesh(geo, pbrMat(TX.sand, { rep: [90, 90], rough: 1, color: 0xe2b98a })); sand.receiveShadow = true; sc.add(sand);
  const sun = shadowSun(0xffd3a0, 4.2, V(-260, 160, 120), 160, 1.2); sc.add(sun);
  sc.fog = new THREE.Fog(0xe9c9a3, 900, 4200);
  envK(sc, 0.8);
}

// height of the desk surface under a point (the laptop is a 1.7 cm step)
const lapGround = (x, z) => (Math.abs(x) < 15.2 && Math.abs(z) < 10.6 ? 1.72 : 0);
// scans carry their own photographed light; a touch of self-light keeps them from going muddy under a hard sun
function liftScan(sc, k = 0.3) { sc.traverse(o => { if (o.isMesh && o.material.map) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0xffffff); o.material.emissiveMap = o.material.map; o.material.emissiveIntensity = k; } }); }
