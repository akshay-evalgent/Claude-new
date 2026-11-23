// =====================================================================
// ASSETS (butt short): a Poly Haven living room (HDR), sofa and wood floor (CC0); the rigged "Fripouille" cat (CC BY) in two coats.
// =====================================================================
const [LOUNGE] = await Promise.all(['lythwood_lounge_4k.hdr'].map(loadHDR));
await Promise.all(['Sofa_01', 'potted_plant_02'].map(async id => { MOD[id] = await loadModel(id); }));
const TX = {}; [TX.floor] = await Promise.all(['wood_floor'].map(id => loadPBR(id)));
// the cats: one ginger, one silver tabby, and a kitten of each
const GINGER = await makeRealCat({}), SILVER = await makeRealCat({}), KIT1 = await makeRealCat({}), KIT2 = await makeRealCat({});
recolorCat(SILVER, silverTabby); recolorCat(KIT2, silverTabby); kittenize(KIT1, 0.5); kittenize(KIT2, 0.47);
const RUGTEX = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#c9b79a'; g.fillRect(0, 0, w, h); noiseFill(g, w, h, 9, 26);
  g.strokeStyle = '#7d5a3c'; g.lineWidth = 26; g.strokeRect(50, 50, w - 100, h - 100); g.strokeStyle = '#a8805a'; g.lineWidth = 8; g.strokeRect(100, 100, w - 200, h - 200);
  for (let i = 0; i < 9; i++) { g.strokeStyle = `rgba(110,80,55,${0.25 + 0.05 * (i % 3)})`; g.lineWidth = 6; g.beginPath(); g.moveTo(140, 160 + i * 85); for (let x = 140; x <= w - 140; x += 40) g.lineTo(x, 160 + i * 85 + 14 * Math.sin(x * 0.05 + i)); g.stroke(); } });

// the living room: wood floor, a rug, the sofa (seat top found by ray), warm window light
function loungeSet(s, { sofa = true, rug = true } = {}) {
  const sc = s.scene; sc.background = LOUNGE.tex; sc.backgroundIntensity = 0.75; sc.environment = LOUNGE.env;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), pbrMat(TX.floor, { rep: [9, 9], rough: 0.75 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; sc.add(fl);
  if (rug) { const r = new THREE.Mesh(new RoundedBoxGeometry(240, 1.0, 170, 2, 0.45), new THREE.MeshStandardMaterial({ map: RUGTEX, roughness: 1 })); r.position.set(0, 0.5, 60); r.receiveShadow = true; sc.add(r); s.rugY = 1.0; }
  if (sofa) { const so = model('Sofa_01', 100); so.position.set(0, 0, -40); sc.add(so); s.sofa = so; s.seat = surfaceY(so, 0, -30); }
  const plant = model('potted_plant_02', 100); plant.position.set(-150, 0, -80); sc.add(plant);
  const sun = shadowSun(0xfff0dc, 2.4, V(180, 260, 160), 200, 3); sc.add(sun);
  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.5); fill.position.set(-150, 120, 120); sc.add(fill);
  envK(sc, 0.85);
}
// a holographic "scent ID" card: name, a scent signature (a waveform unique to the cat) and a fingerprint-like whorl
function idCard(name, seed, color = '#7dffd0') {
  const [c, g] = mkCanvas(1024, 640); const tex = texOf(c); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  g.clearRect(0, 0, 1024, 640);
  g.fillStyle = 'rgba(30,255,190,0.10)'; g.strokeStyle = color; g.lineWidth = 10; g.beginPath(); g.roundRect(14, 14, 996, 612, 48); g.fill(); g.stroke();
  g.fillStyle = color; g.font = '900 64px "Nunito", Arial'; g.textBaseline = 'top'; g.fillText('SCENT ID', 60, 50);
  g.font = '800 48px "Nunito", Arial'; g.fillStyle = 'rgba(220,255,240,0.95)'; g.fillText(name, 60, 140);
  g.font = '700 30px "Nunito", Arial'; g.fillStyle = 'rgba(180,255,225,0.8)'; g.fillText('SPECIES  Felis catus', 60, 212); g.fillText('STATUS   friendly', 60, 254);
  // whorl
  g.strokeStyle = color; g.lineWidth = 4; for (let i = 1; i < 14; i++) { g.beginPath(); g.ellipse(810, 200, i * 11 + 6 * h3(seed, i, 1), i * 13 + 8 * h3(seed, i, 2), 0.3 * h3(seed, 0, 3), 0.3 + 0.2 * h3(seed, i, 4), Math.PI * 2 - 0.4); g.stroke(); }
  // scent signature: a waveform with peaks of different heights
  g.beginPath(); g.lineWidth = 6; const y0 = 480; g.moveTo(60, y0);
  for (let x = 0; x <= 900; x += 6) { let y = 0; for (let k = 0; k < 7; k++) { const cx = 80 + 120 * k + 60 * h3(seed, k, 5), hh = 40 + 110 * h3(seed, k, 6), wd = 10 + 20 * h3(seed, k, 7); y += hh * Math.exp(-((x - cx) ** 2) / (2 * wd * wd)); } g.lineTo(60 + x, y0 - y); }
  g.stroke(); g.fillStyle = 'rgba(180,255,225,0.7)'; g.font = '700 26px "Nunito", Arial'; g.fillText('SCENT SIGNATURE', 60, 520);
  tex.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 12.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
  m.renderOrder = 10; return m;
}
const catNose = (cat) => cat.root.localToWorld(V(28, 24, 0));
const tailBase = (cat) => wpos(cat.tail[0]);
