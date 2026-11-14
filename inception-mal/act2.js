// Chapter 2: The Offer (b1-b4) · Chapter 3: The Crew (c1-c6) · Chapter 4: The Secret (d1-d4)
import { THREE, SET, SHOT, LINE, getSet, mkScene, move, shot, cuts, put, clamp, ease, lerp, hash, rng, M, tex, box, label, setPop, makeChar, makeTop, ground, building, car } from './engine.js';

const basic = c => new THREE.MeshBasicMaterial({ color: c });
const glowM = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e });
const W3 = (g, p) => { g.updateWorldMatrix(true, false); return g.localToWorld(new THREE.Vector3(...p)).toArray(); };
const pw = (k, pts) => { let i = 1; while (i < pts.length - 1 && k > pts[i][0]) i++; const [a, va] = pts[i - 1], [b, vb] = pts[i]; return lerp(va, vb, ease((k - a) / (b - a))); };
const cyl = (r, h, c, x, y, z, parent, seg = 14) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), typeof c === 'object' ? c : M(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };

// ================= ROOFTOP HELIPAD (night) =================
SET('rooftop', () => {
  const { s, cam } = mkScene(0x0a1024, [70, 300], 0xbcd0ff, 1.2, [0x8098dc, 0x2a2c3a, 1.5], [-10, 30, 14]);
  s.userData.bloom = 0.45;
  box(36, 2, 36, 0x2b2e35, 0, -1, 0, s); for (const sx of [-1, 1]) { box(0.6, 1.2, 36, 0x3a3e46, sx * 17.7, 0.6, 0, s); box(36, 1.2, 0.6, 0x3a3e46, 0, 0.6, sx * 17.7, s); }
  const hm = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshLambertMaterial({ transparent: true, map: tex(256, 256, c => { c.strokeStyle = '#e8c53a'; c.lineWidth = 12; c.beginPath(); c.arc(128, 128, 112, 0, 7); c.stroke(); c.fillStyle = '#e8c53a'; c.font = '900 150px Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', 128, 136); }) }));
  hm.rotation.x = -Math.PI / 2; hm.position.y = 0.02; hm.receiveShadow = true; s.add(hm);
  const r = rng(21); const beacons = [];
  for (let i = 0; i < 90; i++) { const a = r() * 6.28, d = 36 + r() * 150, h = 60 + r() * 85; const b = building(8 + r() * 12, h, 8 + r() * 12, ['#1c2233', '#232a3d', '#182030'][i % 3], 0.42, i, i % 5 ? '#ffd98a' : '#bfe3ff'); b.position.set(Math.sin(a) * d, h / 2 - 95 + r() * 8, Math.cos(a) * d); b.castShadow = false; s.add(b); if (i % 4 === 0) { const bc = box(0.9, 0.9, 0.9, basic(0xff3030), b.position.x, b.position.y + h / 2 + 0.6, b.position.z, s); bc.castShadow = false; beacons.push(bc); } }
  for (const [x, z] of [[-16, -16], [16, -16], [-16, 16], [16, 16]]) { const l = box(0.5, 0.5, 0.5, basic(0x66ff99), x, 1.5, z, s); l.castShadow = false; }
  const pl = new THREE.PointLight(0xffc58a, 190, 40); pl.position.set(0, 8, 9); s.add(pl);
  const heli = new THREE.Group(); heli.position.set(-6, 0, -9); heli.rotation.y = 0.5; s.add(heli);
  box(3.6, 3.2, 6, 0x23262d, 0, 2.6, 0, heli); box(3.3, 1.6, 1.6, 0x7fb2d6, 0, 3.1, 2.6, heli); box(0.9, 0.9, 6, 0x23262d, 0, 3.2, -5.6, heli); box(0.3, 2, 1, 0x23262d, 0, 4, -8.2, heli); box(0.3, 0.3, 8, 0x555555, -1.8, 0.4, 0, heli); box(0.3, 0.3, 8, 0x555555, 1.8, 0.4, 0, heli); box(0.5, 0.8, 0.5, 0x444444, 0, 4.6, 0, heli); box(0.4, 0.4, 0.4, basic(0xff4040), 0, 4.6, -8.2, heli);
  const rotor = new THREE.Group(); rotor.position.y = 5.1; heli.add(rotor); box(15, 0.12, 0.7, 0x111111, 0, 0, 0, rotor); box(0.7, 0.12, 15, 0x111111, 0, 0, 0, rotor);
  const tail = new THREE.Group(); tail.position.set(0.3, 4.2, -8.2); heli.add(tail); box(0.1, 2.6, 0.3, 0x111111, 0, 0, 0, tail);
  const sock = new THREE.Group(); sock.position.set(13, 0, -13); s.add(sock); box(0.2, 7, 0.2, 0x888888, 0, 3.5, 0, sock); const sk = new THREE.Group(); sk.position.y = 6.8; sock.add(sk); box(3, 0.8, 0.8, 0xff7a2a, 1.6, 0, 0, sk);
  const saito = makeChar('saito', 'smirk'), cobb = makeChar('cobb', 'serious'), mal = makeChar('mal', 'smirk'); s.add(saito.g, cobb.g, mal.g);
  const phone = box(0.5, 0.9, 0.1, basic(0x3f5f80), 0, 0, 0.35, cobb.hand('R')); const pglow = new THREE.PointLight(0xbfe3ff, 0, 8); cobb.hand('R').add(pglow);
  return {
    s, cam, saito, cobb, mal, phone, pglow,
    pre(T) {
      rotor.rotation.y = T * 11; tail.rotation.x = T * 14; sk.rotation.y = Math.sin(T * 2.2) * 0.25; sk.rotation.z = Math.sin(T * 5) * 0.12 - 0.1;
      beacons.forEach((b, i) => b.visible = (T * 0.8 + i * 0.37) % 1 < 0.5);
      saito.reset(); cobb.reset(); put(saito, -2.6, 0, 0, 0.75); put(cobb, 2.6, 0, 0, -0.75); saito.idle(T); cobb.idle(T + 1); saito.look('smirk', T); cobb.look('serious', T);
      mal.g.visible = false; phone.visible = false; pglow.intensity = 0;
    },
    d4(c, k) { const S = this; S.mal.g.visible = true; S.mal.reset(); put(S.mal, -2.5, 0, -3, 0.3); S.mal.idle(c.T); S.mal.look('smirk', c.T); put(S.cobb, 4.6, 0, 8, 0.1); S.cobb.look('serious', c.T); S.saito.g.visible = false; move(c.cam, [1.5, 5, 21], [0.5, 4.4, 0], [0.8, 4.9, 18], [0, 4.6, -1], k, 32); }
  };
});
SHOT('b1:0', 'rooftop', c => { c.S.saito.g.visible = true; move(c.cam, [26, 20, 44], [0, 2, 0], [8, 7, 24], [0, 3.4, 0], c.k, 40); });
SHOT('b1:1', 'rooftop', c => { const S = c.S; S.saito.armR.rotation.x = -1.25 * ease(c.k * 2.5); S.saito.armR.rotation.z = 0.15; S.cobb.head.rotation.z = -0.08; move(c.cam, [1.5, 4.6, 17], [0, 4.2, 0], [-0.5, 4.5, 13.5], [0, 4.2, 0], c.k, 32); });
SHOT('b2:0', 'rooftop', c => { const S = c.S; S.saito.look('serious', c.T, c.talk); S.saito.armR.rotation.x = -0.9 + Math.sin(c.T * 4) * 0.2; S.saito.armR.rotation.z = 0.2; move(c.cam, [2.2, 4.9, 9.5], [-2.6, 4.75, 0], [1.6, 4.9, 8.4], [-2.6, 4.75, 0], c.k, 30); });
SHOT('b2:1', 'rooftop', c => { const S = c.S; S.cobb.look(c.k > 0.35 ? 'surprised' : 'serious', c.T); S.cobb.head.rotation.x = -0.06; move(c.cam, [-2.2, 4.9, 9.5], [2.6, 4.75, 0], [-1.7, 4.9, 8.6], [2.6, 4.75, 0], c.k, 30); });
SHOT('b2:2', 'rooftop', c => { const S = c.S; S.saito.look('smirk', c.T, c.talk); S.saito.head.rotation.z = 0.07; move(c.cam, [1.2, 4.85, 9.5], [-2.6, 4.8, 0], [-0.2, 4.8, 6.4], [-2.6, 4.8, 0], c.k, 28); });
SHOT('b4:0', 'rooftop', c => { const S = c.S; put(S.cobb, lerp(3, 1.5, ease(c.k)), 0, lerp(7, 13.5, ease(c.k)), 0.15); if (c.k < 0.92) S.cobb.walk(c.T * 5, 0.5); S.saito.g.visible = false; move(c.cam, [-4, 7.5, -3], [1, 3.2, 16], [-3, 6.8, 2], [1.5, 3.6, 18], c.k, 38); });
SHOT('b4:1', 'rooftop', c => {
  const S = c.S, cb = S.cobb; put(cb, 1.5, 0, 13.5, 0.15); S.saito.g.visible = false; S.phone.visible = true; S.pglow.intensity = 3 + Math.sin(c.T * 7) * 0.5;
  cb.armR.rotation.x = -1.15 * ease(c.k * 3); cb.armR.rotation.z = -0.25; cb.head.rotation.x = 0.22 * ease(c.k * 3) - 0.3 * ease((c.k - 0.6) / 0.3); cb.look(c.k > 0.55 ? 'sad' : 'serious', c.T);
  move(c.cam, [5, 4.6, 23.5], [1.5, 4.5, 13.5], [3.2, 4.9, 21], [1.5, 4.7, 13.5], c.k, 30);
});

// ================= FISCHER MORROW BOARDROOM =================
SET('fischer', () => {
  const { s, cam } = mkScene(0xa9cdee, [90, 420], 0xfff3dc, 2.4, [0xffffff, 0x9aa6b4, 1.5], [-18, 30, -30]);
  s.userData.bloom = 0.3;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshPhongMaterial({ color: 0x1f2630, shininess: 90, specular: 0x8899aa })); fl.rotation.x = -Math.PI / 2; fl.position.z = 6; fl.receiveShadow = true; s.add(fl);
  box(60, 0.6, 40, 0xe9edf2, 0, 14.3, 6, s); box(0.6, 14, 40, 0x2b3440, -30, 7, 6, s); box(0.6, 14, 40, 0x2b3440, 30, 7, 6, s);
  for (let x = -30; x <= 30; x += 7.5) box(0.35, 14, 0.35, 0x1a2028, x, 7, -14, s); box(60, 0.35, 0.35, 0x1a2028, 0, 9.5, -14, s); box(60, 1, 0.5, 0x1a2028, 0, 0.5, -14, s);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(60, 14), new THREE.MeshPhongMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.12, shininess: 120 })); gl.position.set(0, 7, -14.1); s.add(gl);
  // outside: hills, turbines, skyline
  const r = rng(5);
  for (let i = 0; i < 16; i++) { const w = 60 + r() * 60; box(w, 16 + r() * 14, 50, [0x6fae62, 0x7dbb6c, 0x64a258][i % 3], (i - 8) * 40 + r() * 20, -14 - r() * 6, -150 - r() * 70, s).castShadow = false; }
  const turb = [];
  for (let i = 0; i < 9; i++) { const g = new THREE.Group(); g.position.set((i - 4) * 34 + r() * 10, -4, -130 - r() * 60); s.add(g); box(1.4, 46, 1.4, 0xf2f5f8, 0, 23, 0, g).castShadow = false; box(2.4, 2.4, 4, 0xf2f5f8, 0, 46, 0.6, g); const rot = new THREE.Group(); rot.position.set(0, 46, 2.8); g.add(rot); for (let b = 0; b < 3; b++) { const bl = new THREE.Group(); bl.rotation.z = b * 2.094; rot.add(bl); box(1.6, 20, 0.4, 0xffffff, 0, 10, 0, bl).castShadow = false; } turb.push([rot, 0.9 + r() * 0.8, r() * 6]); }
  for (let i = 0; i < 10; i++) { const h = 40 + r() * 70, b = building(16, h, 16, '#5d6a80', 0.25, i + 3, '#dfefff'); b.position.set(-150 + i * 34 + r() * 8, h / 2 - 30, -230 - r() * 40); b.castShadow = false; s.add(b); }
  // table, chairs, logo
  box(26, 0.5, 6, new THREE.MeshPhongMaterial({ color: 0x3a2a1e, shininess: 100 }), 0, 2.9, 6, s); for (const x of [-11, 0, 11]) box(1, 2.7, 3, 0x1a1c20, x, 1.35, 6, s);
  for (let x = -10; x <= 10; x += 5) for (const sz of [-1, 1]) { box(2.4, 0.4, 2.2, 0x20242b, x, 1.6, 6 + sz * 4.6, s); box(2.4, 3.6, 0.4, 0x20242b, x, 3.4, 6 + sz * 5.7, s); }
  const logo = label('FISCHER MORROW', { h: 1.5, color: '#7fd0ff', stroke: '#0b1530' }); logo.position.set(-17, 11, -13); s.add(logo);
  const il = new THREE.PointLight(0xfff0dc, 110, 50); il.position.set(0, 12, 10); s.add(il);
  const fis = makeChar('fischer', 'serious'); s.add(fis.g);
  // company model on pedestal
  const PX = 22, PZ = 10; box(3.4, 3, 3.4, 0x14181e, PX, 1.5, PZ, s); box(3.8, 0.25, 3.8, 0xd9b24a, PX, 3.1, PZ, s);
  const cubes = []; const cm = [glowM(0x3f7fbf, 0x0f2a4a), glowM(0x7fd0ff, 0x1a4a6a), glowM(0xd9b24a, 0x4a3a10)];
  for (let y = 0; y < 8; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) { if (y > 5 && (x || z)) continue; const m = box(0.72, 0.72, 0.72, cm[(x + z + y + 9) % 3], 0, 0, 0, s); cubes.push([m, x * 0.75, y * 0.75 + 0.4, z * 0.75]); }
  const la = label('FISCHER', { h: 0.9, color: '#7fd0ff', stroke: '#0b1530' }), lb = label('MORROW', { h: 0.9, color: '#7fd0ff', stroke: '#0b1530' }); s.add(la, lb);
  const pg = new THREE.PointLight(0x7fd0ff, 40, 16); pg.position.set(PX, 7, PZ + 2); s.add(pg);
  return {
    s, cam, fis, la, lb, PX, PZ,
    pre(T) { turb.forEach(([g, sp, o]) => g.rotation.z = T * sp + o); this.split(0, T); la.visible = lb.visible = false; fis.reset(); fis.idle(T); fis.look('serious', T); },
    split(e, T) { cubes.forEach(([m, x, y, z], i) => { const d = e * e * (1.2 + hash(i) * 2.4), sx = x || (hash(i + 3) - 0.5), sz = z || (hash(i + 7) - 0.5); m.position.set(PX + x + sx * d * 1.6, 3.25 + y + (y - 2.5) * d * 0.35 + Math.sin(T * 2 + i) * 0.05 * e, PZ + z + sz * d * 1.1); m.rotation.set(e * hash(i + 1) * 4, T * 0.5 * (1 - e) + e * hash(i + 2) * 4, e * hash(i + 5) * 3); }); la.position.set(PX - 2.2 - e * 2.2, 9.5 - e * 0.5, PZ); lb.position.set(PX + 2.4 + e * 2.2, 9.5 + e * 0.3, PZ); la.material.rotation = e * 0.25; lb.material.rotation = -e * 0.2; }
  };
});
const hud = (o) => `<div style="position:absolute;left:150px;top:210px;opacity:${o.toFixed(2)};transform:translateX(${((1 - o) * -40).toFixed(0)}px);border:3px solid #7fd0ff;border-left:12px solid #ff5a5a;background:rgba(8,16,28,.74);padding:22px 34px 26px;color:#cfeaff"><div style="font-size:26px;letter-spacing:9px;color:#ff5a5a;font-weight:900">● TARGET</div><div style="font-size:66px;font-weight:900;margin-top:4px;color:#fff">ROBERT FISCHER</div><div style="font-size:27px;font-weight:700;letter-spacing:4px;margin-top:8px;color:#7fd0ff">HEIR · FISCHER MORROW ENERGY</div></div>`;
SHOT('b3:0', 'fischer', c => {
  const f = c.S.fis; put(f, 3, 0, -8, lerp(Math.PI, 0.25, ease((c.k - 0.15) / 0.45))); f.armL.rotation.z = -0.1; f.look(c.k > 0.6 ? 'smirk' : 'serious', c.T);
  move(c.cam, [-3, 6.2, 3], [3, 4.6, -8], [0.2, 5.1, -1.2], [3, 4.7, -8], c.k, 32); c.dom(hud(Math.min(clamp((c.l - 0.3) / 0.35), clamp((c.dur - c.l) / 0.2))));
});
SHOT('b3:1', 'fischer', c => {
  const S = c.S, f = S.fis, e = ease((c.k - 0.3) / 0.5); put(f, S.PX - 6.5, 0, S.PZ - 2, 0.9); f.look(e > 0.3 ? 'surprised' : 'serious', c.T); f.head.rotation.y = 0.3;
  S.la.visible = S.lb.visible = true; S.split(e, c.T); move(c.cam, [S.PX - 5, 6.0, S.PZ + 19], [S.PX - 1.5, 6.3, S.PZ], [S.PX - 3.5, 6.2, S.PZ + 16], [S.PX - 1.5, 6.5, S.PZ], c.k, 34);
});

// ================= THE MAP (recruiting) =================
SET('map', () => {
  const { s, cam } = mkScene(0x0d0b09, [40, 120], 0xffe2b8, 0.5, [0xffe8c8, 0x2a1c10, 0.7], [8, 30, 10]);
  s.userData.bloom = 0.35;
  box(60, 1, 40, new THREE.MeshPhongMaterial({ color: 0x3a2618, shininess: 60 }), 0, -0.55, 0, s);
  const mt = tex(1024, 614, c => {
    c.fillStyle = '#d9c79a'; c.fillRect(0, 0, 1024, 614); c.strokeStyle = 'rgba(90,60,30,.18)'; c.lineWidth = 2; for (let x = 0; x < 1024; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 614); c.stroke(); } for (let y = 0; y < 614; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke(); }
    const P = (lon, lat) => [(lon + 180) / 360 * 1024, (90 - lat) / 180 * 614]; c.fillStyle = '#8a9a5a'; c.strokeStyle = '#5a4a2a'; c.lineWidth = 4;
    for (const [lon, lat, rx, ry, rot] of [[-105, 48, 38, 20, 0.2], [-88, 22, 12, 12, 0], [-60, -15, 15, 27, -0.15], [14, 52, 20, 12, 0], [20, 5, 19, 30, 0], [85, 48, 55, 22, 0], [78, 20, 10, 12, 0], [105, 15, 12, 14, 0], [134, -25, 17, 10, 0], [-40, 72, 12, 8, 0]]) { const [x, y] = P(lon, lat); c.beginPath(); c.ellipse(x, y, rx / 360 * 1024, ry / 180 * 614, rot, 0, 7); c.fill(); c.stroke(); }
    c.fillStyle = 'rgba(60,40,20,.55)'; c.font = '700 22px Inter'; c.fillText('N', 60, 60); c.strokeStyle = 'rgba(60,40,20,.55)'; c.beginPath(); c.arc(66, 52, 30, 0, 7); c.stroke();
  });
  const mp = new THREE.Mesh(new THREE.PlaneGeometry(34, 20.4), new THREE.MeshLambertMaterial({ map: mt })); mp.rotation.x = -Math.PI / 2; mp.position.y = 0.02; mp.receiveShadow = true; s.add(mp);
  const sp = new THREE.SpotLight(0xffe2b8, 1700, 70, 0.6, 0.6); sp.position.set(2, 26, 8); sp.castShadow = true; s.add(sp, sp.target);
  const P = (lon, lat) => [lon / 360 * 34, (-lat) / 180 * 20.4];
  const stops = [['cobb', -118, 34], ['ariadne', 2.3, 48.8], ['arthur', -0.1, 30], ['eames', 39.6, -4], ['yusuf', 46, -14]].map(([n, lon, lat], i) => {
    const [x, z] = P(lon, lat), g = new THREE.Group(); g.position.set(x, 0, z); s.add(g); box(0.08, 1.0, 0.08, 0xcccccc, 0, 0.5, 0, g); box(0.45, 0.45, 0.45, glowM(0xe02a2a, 0x6a0a0a), 0, 1.1, 0, g);
    const ch = makeChar(n); ch.g.scale.setScalar(0.42); ch.g.position.set(0.9, 0, 0.3); g.add(ch.g); return { g, ch, x, z };
  });
  const threads = stops.slice(1).map((p, i) => { const a = stops[i === 0 ? 0 : 1], dx = p.x - a.x, dz = p.z - a.z, len = Math.hypot(dx, dz); const t = box(1, 0.06, 0.08, basic(0xe02a2a), 0, 1.1, 0, s); t.castShadow = false; t.rotation.y = -Math.atan2(dz, dx); return { t, a, dx, dz, len }; });
  box(5, 0.05, 3.4, 0xf4efe6, -12, 0.03, 7.5, s).rotation.y = 0.2; box(1.2, 1.4, 1.2, 0xf4f4f0, 13.5, 0.7, 7, s); box(0.9, 0.2, 0.9, 0x3a2412, 13.5, 1.42, 7, s);
  return { s, cam, stops, threads };
});
SHOT('c1', 'map', c => {
  const S = c.S, t0 = 2.3;
  S.stops.forEach((p, i) => { const k = clamp((c.l - t0 - i * 0.42) / 0.3), d = i === 0 ? 1 : k; p.g.visible = d > 0; p.g.position.y = (1 - ease(d)) * 5; p.ch.g.scale.setScalar(0.42 * (i === 0 ? 1 : ease(k * 1.2))); p.ch.reset(); p.ch.idle(c.T + i); p.ch.look(i ? 'smirk' : 'serious', c.T); });
  S.threads.forEach((th, i) => { const k = ease((c.l - t0 - i * 0.42 + 0.3) / 0.4); th.t.visible = k > 0.01; th.t.scale.x = th.len * k; th.t.position.set(th.a.x + th.dx * k / 2, 1.1, th.a.z + th.dz * k / 2); });
  move(c.cam, [-14, 9, 17], [-6, 0, -1], [3, 6.5, 12.5], [2, 0.6, -1.5], c.k, 36);
});

// ================= PARIS (the city folds) =================
SET('paris', () => {
  const { s, cam } = mkScene(0xbcd3ea, [90, 380], 0xfff1d8, 2.5, [0xffffff, 0x9a9488, 1.5], [22, 40, 24], 70);
  s.userData.bloom = 0.25;
  const ft = tex(128, 128, c => { c.fillStyle = '#e6dcc4'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#cfc4a8'; c.fillRect(0, 118, 128, 10); for (const x of [18, 78]) { c.fillStyle = '#3a4a5c'; c.fillRect(x, 26, 32, 70); c.fillStyle = '#8fb2cf'; c.fillRect(x + 4, 30, 24, 30); c.fillStyle = '#2a2f36'; c.fillRect(x - 4, 92, 40, 5); for (let i = 0; i < 6; i++) c.fillRect(x - 3 + i * 7.6, 82, 2, 12); } });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
  const facM = {}; const hauss = (w, h, d) => { const key = w + '_' + h; if (!facM[key]) { const t = ft.clone(); t.needsUpdate = true; t.repeat.set(Math.round(w / 6), Math.round(h / 5)); facM[key] = new THREE.MeshLambertMaterial({ map: t }); } const sd = facM[key], tp = M(0xd8cdb4); const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [sd, sd, tp, tp, sd, sd]); m.scale.set(w, h, d); m.position.y = h / 2; m.castShadow = m.receiveShadow = true; g.add(m); box(w - 0.8, 3.2, d - 0.8, 0x55626e, 0, h + 1.6, 0, g); box(w - 3, 1, d - 3, 0x4a5560, 0, h + 3.6, 0, g); box(w + 0.3, 3.4, d + 0.3, 0x7d6a55, 0, 1.7, 0, g); for (let i = 0; i < 3; i++) box(1, 2.4, 1, 0x8a5a44, -w / 2 + 3 + i * (w / 3), h + 4.6, 0, g); return g; };
  const slab = (len, seed, noTree) => {
    const g = new THREE.Group(), r = rng(seed); box(52, 2, len, 0x4a4d52, 0, -1, -len / 2, g); box(14, 0.1, len, 0x33363b, 0, 0.05, -len / 2, g);
    for (const sx of [-1, 1]) { box(6, 0.5, len, 0xb9b3a6, sx * 10, 0.25, -len / 2, g); for (let z = 0; z < len - 1; z += 20) { const w = Math.min(20, len - z), h = 20 + Math.floor(r() * 2) * 5, b = hauss(w, h, 13); b.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; b.position.set(sx * 19.5, 0.5, -z - w / 2); g.add(b); } for (let z = 6; z < len; z += 13) { if (noTree && sx > 0 && z < 40) continue; box(0.5, 4, 0.5, 0x5a3d26, sx * 8, 2.3, -z, g); box(3.2, 3.2, 3.2, 0x5f9a54, sx * 8, 5.6, -z, g); } }
    for (let z = 4; z < len; z += 8) box(0.4, 0.06, 3, 0xe8e0b0, 0, 0.12, -z, g);
    const cars = []; for (let i = 0; i < Math.round(len / 18); i++) { const c = car([0xb03a2e, 0x2f5f8f, 0xe8e4d8, 0x2a2a2e, 0x6a8f5a][i % 5]); c.scale.setScalar(0.85); g.add(c); cars.push([c, i % 2 ? 3.3 : -3.3, r() * len]); }
    return { g, cars, len };
  };
  const A = slab(80, 1, true), B = slab(40, 2), C = slab(90, 3); A.g.position.z = 20; s.add(A.g); B.g.position.z = -60; s.add(B.g); C.g.position.z = -40; B.g.add(C.g);
  // cafe
  box(12, 0.4, 4, 0x9a2a2a, 14.6, 8.4, 2, s).rotation.z = 0.12; const sign = label('CAFÉ', { h: 0.9, color: '#fff3d0', stroke: '#5a1a1a' }); sign.position.set(13.2, 10.4, 2); s.add(sign);
  const tables = [[9.4, 6], [9.4, -1.5], [9.4, -9]]; tables.forEach(([x, z]) => { cyl(1.3, 0.15, 0xf4efe6, x, 3.0, z, s); cyl(0.15, 2.6, 0x2a2a2a, x, 1.7, z, s, 6); for (const sx of [-1, 1]) { box(1.9, 0.3, 1.9, 0x2f5f45, x + sx * 2.5, 1.95, z, s); box(0.3, 2.6, 1.9, 0x2f5f45, x + sx * 3.45, 3.3, z, s); } });
  box(0.5, 0.6, 0.5, 0xffffff, 8.9, 3.4, 6.3, s); box(0.5, 0.6, 0.5, 0xffffff, 9.9, 3.4, 5.7, s);
  const cobb = makeChar('cobb', 'smirk'), ari = makeChar('ariadne', 'neutral'), mal = makeChar('mal', 'smirk'); s.add(cobb.g, ari.g, mal.g);
  const civs = ['civA', 'civB', 'civC', 'civD'].map(n => { const c = makeChar(n); s.add(c.g); return c; });
  return {
    s, cam, cobb, ari, mal,
    pre(T) {
      for (const sl of [A, B, C]) sl.cars.forEach(([c, x, o]) => { const z = (T * 7 + o) % sl.len; c.position.set(x, 0, x > 0 ? -z : -(sl.len - z)); c.rotation.y = x > 0 ? Math.PI : 0; });
      this.fold(0); cobb.reset(); ari.reset(); put(cobb, 6.9, 0.45, 6, Math.PI / 2 - 0.35); cobb.sit(); put(ari, 11.9, 0.45, 6, -Math.PI / 2 + 0.55); ari.sit(); cobb.look('smirk', T); ari.look('neutral', T); mal.g.visible = false;
      civs.forEach((c, i) => { const sx = i % 2 ? -1 : 1, z = 14 - ((T * 2.4 + i * 21) % 80); c.reset(); put(c, sx * (10.5 + (i > 1 ? 1.2 : 0)) - (sx > 0 ? 6.5 : 0) * 0 + (sx > 0 ? 2.6 : 0), 0.5, sx > 0 ? z : -66 - z + 14, sx > 0 ? Math.PI : 0); c.walk(T * 6 + i * 2, 0.6); c.look('neutral', T); });
    },
    fold(f) { B.g.rotation.x = ease(f * 1.5) * Math.PI / 2; C.g.rotation.x = ease(f * 1.5 - 0.5) * Math.PI / 2; },
    d4(c, k) { const S = this; S.mal.g.visible = true; S.mal.reset(); put(S.mal, -10, 0.5, 7.5, 1.0); S.mal.idle(c.T); S.mal.look('smirk', c.T); S.ari.g.visible = false; S.cobb.head.rotation.x = 0.2; move(c.cam, [14, 5.2, 13], [-2, 4, 5], [11.5, 5, 11.5], [-6, 4.5, 6.5], k, 32); }
  };
});
SHOT('c2', 'paris', c => {
  const S = c.S, [i, k] = cuts(c.k, [0.34, 0.62]); S.ari.g.visible = true; const f = clamp((c.k - 0.36) / 0.6); S.fold(f);
  if (i === 0) { S.ari.look('smirk', c.T); S.ari.armL.rotation.x = -1.1 + Math.sin(c.T * 3) * 0.15; S.cobb.armR.rotation.x = -0.9; move(c.cam, [7.4, 4.6, 19], [9.4, 4.2, 6], [8.6, 4.5, 16], [9.6, 4.3, 6], k, 32); }
  else if (i === 1) { S.ari.look('joy', c.T); S.ari.head.rotation.x = -0.35; S.ari.head.rotation.y = 0.9; S.cobb.head.rotation.y = -0.9; S.cobb.look('surprised', c.T); move(c.cam, [12.5, 5.6, 21], [3, 9, -40], [11.5, 5, 18], [2, 16, -50], k, 46); }
  else { S.ari.look('joy', c.T); S.ari.head.rotation.x = -0.5; S.ari.head.rotation.y = 0.9; S.cobb.head.rotation.y = -0.9; S.cobb.head.rotation.x = -0.4; S.cobb.look('surprised', c.T); move(c.cam, [-3, 2.2, 22], [0, 22, -40], [-2, 2.0, 18], [0, 36, -30], k, 52); }
  if (c.l < 2.6) c.lower('ARIADNE', 'The Architect', Math.min(c.l - 0.25, (2.6 - c.l) * 1.2));
});

// ================= WORKSHOP (warehouse) =================
SET('workshop', () => {
  const { s, cam } = mkScene(0x1c1e22, [50, 170], 0xfff0d8, 1.9, [0xffffff, 0x555a66, 1.2], [-6, 30, -30], 40);
  s.userData.bloom = 0.4; const hemi = s.children.find(o => o.isHemisphereLight), sun = s.userData.sun;
  ground(s, 200, '#4a4d54', '#53565e');
  const brick = tex(64, 64, c => { c.fillStyle = '#6a4a3c'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#4a342a'; for (let y = 0; y < 64; y += 16) { c.fillRect(0, y, 64, 2); for (let x = (y / 16 % 2) * 16; x < 64; x += 32) c.fillRect(x, y, 2, 16); } }); brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(16, 5);
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(90, 26), new THREE.MeshLambertMaterial({ map: brick })); bw.position.set(0, 13, -22); s.add(bw);
  const panes = [], shafts = [];
  for (let i = -3; i <= 3; i++) { const p = box(6, 12, 0.3, basic(0xdfeeff), i * 11, 13, -21.8, s); p.castShadow = false; panes.push(p); box(0.3, 12, 0.5, 0x2a2a2e, i * 11, 13, -21.6, s); box(6, 0.3, 0.5, 0x2a2a2e, i * 11, 13, -21.6, s); const sh = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 30), new THREE.MeshBasicMaterial({ color: 0xfff2d8, transparent: true, opacity: 0.03, depthWrite: false, side: THREE.DoubleSide, fog: false })); sh.position.set(i * 11, 8, -12); sh.rotation.x = -0.75; s.add(sh); shafts.push(sh); }
  for (let x = -40; x <= 40; x += 20) box(1.4, 26, 1.4, 0x2f3238, x, 13, -20, s); box(90, 1.2, 1.2, 0x2f3238, 0, 21, -14, s);
  // blueprint boards + tables
  const bpt = tex(350, 250, c => { c.fillStyle = '#1f4f9a'; c.fillRect(0, 0, 350, 250); c.strokeStyle = '#cfe4ff'; c.lineWidth = 3; for (let i = 0; i < 5; i++) c.strokeRect(20 + i * 22, 20 + i * 20, 310 - i * 44, 210 - i * 40); c.beginPath(); for (let i = 0; i < 8; i++) { c.moveTo(20 + i * 40, 20); c.lineTo(20 + i * 40, 230); } c.globalAlpha = 0.3; c.stroke(); });
  for (const [x, z, ry] of [[-2, -18, 0], [8, -18, 0]]) { box(8.6, 6.2, 0.3, 0x2a2d35, x, 6.5, z, s); const b = new THREE.Mesh(new THREE.PlaneGeometry(8, 5.6), new THREE.MeshBasicMaterial({ map: bpt })); b.position.set(x, 6.5, z + 0.2); s.add(b); box(0.3, 3.4, 0.3, 0x2a2d35, x - 3.5, 1.7, z, s); box(0.3, 3.4, 0.3, 0x2a2d35, x + 3.5, 1.7, z, s); }
  box(9, 0.4, 4, 0x7a5a3c, -1, 2.9, 8, s); for (const [x, z] of [[-5, 6.5], [3, 6.5], [-5, 9.5], [3, 9.5]]) box(0.4, 2.7, 0.4, 0x5a3f28, x, 1.35, z, s);
  const bp2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.2), new THREE.MeshBasicMaterial({ map: bpt })); bp2.rotation.x = -Math.PI / 2; bp2.position.set(-1.5, 3.12, 8); s.add(bp2); box(1.6, 0.7, 1.6, 0xf2f2ee, 2, 3.45, 8, s);
  // paradox staircase
  const ST = new THREE.Group(); ST.position.set(-17, 0, -6); s.add(ST); const n = 24, sd = 6;
  for (let i = 0; i < n; i++) { const side = Math.floor(i / 6), j = i % 6, t = -sd + j * 2 + 1; const [x, z] = [[t, sd], [sd, -t], [-t, -sd], [-sd, t]][side]; const h = 0.5 + i * 0.36; box(side % 2 ? 2.4 : 2.02, h, side % 2 ? 2.02 : 2.4, i % 2 ? 0xd9d2c0 : 0xc9c2b0, x, h / 2, z, ST); }
  box(2.4, 9.4, 2.4, 0xb9b2a0, -sd, 4.7, sd, ST);
  const mini = makeChar('arthur'); mini.g.scale.setScalar(0.5); ST.add(mini.g);
  // dream chairs + silver case
  const DR = new THREE.Group(); DR.position.set(13, 0, 2); DR.rotation.y = -0.45; s.add(DR); const recl = [];
  for (let i = 0; i < 3; i++) { const g = new THREE.Group(); g.position.set((i - 1) * 5.4, 0, 0); DR.add(g); const pl = box(2.6, 0.3, 6.6, 0xd8d2c2, 0, 1.75, -0.6, g); pl.rotation.x = 0.5; box(2.6, 0.3, 3.4, 0xd8d2c2, 0, 0.75, 3.1, g).rotation.x = -0.25; for (const sx of [-1, 1]) { box(0.2, 2.4, 0.2, 0x8a8f96, sx * 1.2, 1.2, -2, g); box(0.2, 1.2, 0.2, 0x8a8f96, sx * 1.2, 0.6, 2, g); } recl.push(g); }
  box(1.6, 1.4, 1.6, 0x5a3f28, 2.7, 0.7, 4.6, DR); const silver = new THREE.MeshPhongMaterial({ color: 0xc9d0d8, shininess: 110, specular: 0xffffff }); box(2.6, 0.8, 1.8, silver, 2.7, 1.8, 4.6, DR); const lid = box(2.6, 0.12, 1.8, silver, 2.7, 3.0, 3.75, DR); lid.rotation.x = Math.PI / 2 - 0.2; const core = box(0.6, 0.5, 0.6, basic(0xfff0b0), 2.7, 2.35, 4.6, DR);
  const tube = (x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, t = box(0.1, 0.1, Math.hypot(dx, dz), 0xf4f4e6, (x0 + x1) / 2, 2.1, (z0 + z1) / 2, DR); t.rotation.y = Math.atan2(dx, dz); t.castShadow = false; return t; }; tube(2.7, 4.6, 0.5, 1.2); tube(2.7, 4.6, 5.0, 1.6);
  const lamp = new THREE.PointLight(0xffd9a0, 0, 26); lamp.position.set(13, 7, 5); s.add(lamp); box(0.8, 0.5, 0.8, basic(0xffe6b0), 13, 9.5, 4, s); box(0.08, 12, 0.08, 0x222222, 13, 15.6, 4, s);
  const arthur = makeChar('arthur', 'serious'), cobb = makeChar('cobb', 'sleep'), ari = makeChar('ariadne', 'neutral'), mal = makeChar('mal', 'smirk'); s.add(arthur.g, ari.g, mal.g, cobb.g);
  box(0.9, 0.12, 1.2, 0xd9c7a0, 0, -2.06, 0.5, arthur.armL);
  return {
    s, cam, arthur, cobb, ari, mal, mini, recl, DR, core,
    pre(T) { this.night(0); for (const c of [arthur, cobb, ari, mal]) { c.reset(); c.g.visible = false; if (c.g.parent !== s) s.add(c.g); c.g.rotation.set(0, 0, 0); } const i = (T * 2.2) % n, st = Math.floor(i), side = Math.floor(st / 6), j = st % 6, t = -sd + j * 2 + 1, [x, z] = [[t, sd], [sd, -t], [-t, -sd], [-sd, t]][side]; mini.reset(); put(mini, x, 0.5 + st * 0.36 + Math.abs(Math.sin(i * Math.PI)) * 0.3, z, [Math.PI / 2, Math.PI, -Math.PI / 2, 0][side]); mini.walk(i * Math.PI, 0.6); core.scale.y = 1 + Math.sin(T * 3) * 0.2; },
    night(v) { hemi.intensity = lerp(1.2, 0.28, v); sun.intensity = lerp(1.9, 0.25, v); const col = new THREE.Color(0xdfeeff).lerp(new THREE.Color(0x2a3a5c), v); panes.forEach(p => p.material.color.copy(col)); shafts.forEach(sh => sh.material.opacity = 0.03 * (1 - v) + 0.012 * v); lamp.intensity = 150 * v; s.background.set(v ? 0x0c0e12 : 0x1c1e22); s.fog.color.copy(s.background); },
    sleep(ch, i) { const g = recl[i]; g.add(ch.g); ch.reset(); ch.g.position.set(0, 0.75, 2.3); ch.g.rotation.set(-1.07, 0, 0); ch.legL.rotation.x = ch.legR.rotation.x = -0.35; ch.armL.rotation.x = ch.armR.rotation.x = 0.1; ch.g.visible = true; },
    d4(c, k) { const S = this; S.cobb.g.visible = S.mal.g.visible = true; put(S.cobb, -1, 0, 11.2, Math.PI - 0.5); S.cobb.look('serious', c.T); S.cobb.head.rotation.x = 0.3; S.cobb.armR.rotation.x = -0.9; put(S.mal, 6, 0, -14, 0.1); S.mal.idle(c.T); S.mal.look('smirk', c.T); move(c.cam, [-7, 5.4, 19], [2, 4.2, 0], [-5, 5.2, 16], [4, 4.4, -8], k, 32); }
  };
});
SHOT('c3', 'workshop', c => {
  const S = c.S, a = S.arthur, [i, k] = cuts(c.k, [0.52]); a.g.visible = true;
  if (i === 0) { put(a, -6, 0, 3, 0.35); a.idle(c.T); a.look('serious', c.T); a.armL.rotation.x = -0.9; a.armR.rotation.x = -0.4 - Math.sin(c.T * 5) * 0.12; a.head.rotation.x = 0.18 * Math.sin(c.T * 1.5) + 0.1; move(c.cam, [-1.5, 4.7, 13], [-6.4, 4.5, 3], [-2.6, 4.7, 11.4], [-6.4, 4.5, 3], k, 32); }
  else { put(a, -8.5, 0, 6.5, -2.4); a.idle(c.T); a.look('smirk', c.T); a.armR.rotation.x = -1.4; a.armL.rotation.x = -0.9; move(c.cam, [2, 9, 19], [-14, 3.6, -4], [-1, 11, 16], [-15, 3.4, -5], k, 40); }
  c.lower('ARTHUR', 'The Point Man', Math.min(c.l - 0.2, (c.dur - c.l) * 1.5));
});
SHOT('d1', 'workshop', c => {
  const S = c.S, [i, k] = cuts(c.k, [0.6]); S.night(1); S.sleep(S.cobb, 1); S.cobb.look('sleep', c.T); S.cobb.body.position.y = Math.sin(c.T * 1.5) * 0.03;
  const a = S.ari; a.g.visible = true;
  if (i === 0) { put(a, lerp(-6, 6.5, k), 0, lerp(12, 7.5, k), 1.25); a.walk(c.T * 4.2, 0.32); a.body.rotation.x = 0.18; a.head.rotation.y = Math.sin(c.T * 1.8) * 0.5; a.look('serious', c.T); move(c.cam, [-4, 5.4, 26], [7, 3.2, 4], [0, 4.6, 21], [9, 3.2, 3], k, 36); }
  else { const p = W3(S.DR, [-2.7, 0, -1.6]); put(a, p[0], 0, p[2], 0.9); a.idle(c.T); a.body.rotation.x = 0.22; a.head.rotation.x = 0.3; a.look(k > 0.4 ? 'surprised' : 'serious', c.T); move(c.cam, W3(S.DR, [2.8, 6.2, 10.5]), W3(S.DR, [-1.0, 3.6, -0.6]), W3(S.DR, [2.0, 5.6, 8.8]), W3(S.DR, [-1.0, 3.7, -0.8]), k, 32); }
});

// ================= MOMBASA =================
SET('mombasa', () => {
  const { s, cam } = mkScene(0xf2d9a6, [70, 260], 0xfff0c8, 2.8, [0xfff4dc, 0xb08a5a, 1.4], [-14, 34, 16], 50);
  s.userData.bloom = 0.3;
  ground(s, 300, '#d9b77a', '#e2c288');
  const r = rng(9); const wt = tex(64, 64, c => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#3a2a20'; c.fillRect(20, 14, 24, 34); c.fillStyle = '#2f6f7a'; c.fillRect(16, 14, 4, 34); c.fillRect(44, 14, 4, 34); }); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
  for (const sx of [-1, 1]) for (let i = 0; i < 9; i++) { const w = 10 + r() * 6, h = 9 + Math.floor(r() * 3) * 4.5, col = [0xe8c58a, 0xf2e2c2, 0xcf8a5a, 0xe2a86a, 0xd9d0b8][Math.floor(r() * 5)], t = wt.clone(); t.needsUpdate = true; t.repeat.set(Math.round(w / 4), Math.round(h / 4.5)); const sd = new THREE.MeshLambertMaterial({ map: t, color: col }), tp = M(col); const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [sd, sd, tp, tp, sd, sd]); m.scale.set(12, h, w); m.position.set(sx * (17 + r() * 2), h / 2, 22 - i * 15); m.castShadow = m.receiveShadow = true; s.add(m); box(12.6, 0.6, w + 0.6, 0x9a6a44, m.position.x, h + 0.3, m.position.z, s); }
  const stripe = (a, b) => { const t = tex(64, 16, c => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? a : b; c.fillRect(i * 8, 0, 8, 16); } }); return new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }); };
  const awn = [stripe('#c0392b', '#f4efe6'), stripe('#2f6f7a', '#f4efe6'), stripe('#d9a02a', '#f4efe6'), stripe('#3f7f4a', '#f4efe6')];
  for (let i = 0; i < 10; i++) { const sx = i % 2 ? 1 : -1, z = 14 - Math.floor(i / 2) * 11 - (sx > 0 ? 5 : 0); if (sx > 0 && Math.abs(z + 2) < 6) continue; const a = new THREE.Mesh(new THREE.PlaneGeometry(6, 7), awn[i % 4]); a.rotation.set(-Math.PI / 2, sx * 0.3, Math.PI / 2); a.position.set(sx * 8.4, 5.6, z); a.castShadow = true; s.add(a); box(0.25, 4.6, 0.25, 0x5a3f28, sx * 5.8, 2.3, z - 3, s); box(0.25, 4.6, 0.25, 0x5a3f28, sx * 5.8, 2.3, z + 3, s); box(3.4, 1.6, 6, 0x8a6a44, sx * 8.6, 0.8, z, s); for (let k = 0; k < 8; k++) box(0.9, 0.7, 0.9, [0xe67e22, 0xc0392b, 0xf1c40f, 0x6ab04c][(k + i) % 4], sx * (7.6 + (k % 2) * 1.4), 1.95, z - 2.2 + Math.floor(k / 2) * 1.5, s); }
  for (let i = 0; i < 5; i++) { const g = new THREE.Group(); g.position.set((i % 2 ? 1 : -1) * (5.6 + r()), 0, i === 0 ? -34 : 8 - i * 15); s.add(g); for (let k = 0; k < 5; k++) box(0.7, 2.2, 0.7, 0x8a6a44, Math.sin(k * 0.3) * 0.5, 1.1 + k * 2.1, 0, g); for (let k = 0; k < 6; k++) { const l = box(4.6, 0.25, 1.2, 0x3f8f4a, 0, 11.3, 0, g); l.rotation.y = k * 1.047; l.rotation.z = -0.35; l.position.set(Math.cos(k * 1.047) * 1.9, 11.0, -Math.sin(k * 1.047) * 1.9); } }
  for (let i = 0; i < 26; i++) { const b = box(0.35, 0.45, 0.35, basic([0xffd27a, 0xff8a5a, 0x7ad0ff][i % 3]), -6 + i * 0.5, 7.6 - Math.sin(i / 25 * Math.PI) * 1.2, -1.5, s); b.castShadow = false; }
  // gambling table (under a big canopy)
  const TZ = -4; box(11, 0.3, 9, awn[0], 0, 7.9, TZ, s); for (const [x, z] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) box(0.3, 7.8, 0.3, 0x5a3f28, x, 3.9, TZ + z, s);
  box(6.4, 0.4, 3.8, 0x2f7a4a, 0, 2.9, TZ, s); box(6.8, 0.3, 4.2, 0x5a3f28, 0, 2.6, TZ, s); for (const [x, z] of [[-2.8, -1.5], [2.8, -1.5], [-2.8, 1.5], [2.8, 1.5]]) box(0.35, 2.5, 0.35, 0x4a3220, x, 1.25, TZ + z, s);
  const chips = []; for (let i = 0; i < 14; i++) { const n = 2 + Math.floor(hash(i) * 6), c = cyl(0.28, 0.1 * n, [0xc0392b, 0x2f5f8f, 0xf4efe6, 0x1a1a1a, 0xd9a02a][i % 5], -2.4 + hash(i + 3) * 4.8, 3.12 + 0.05 * n, TZ - 1.2 + hash(i + 5) * 2.2, s, 10); chips.push(c); }
  for (let i = 0; i < 5; i++) box(0.5, 0.03, 0.72, 0xfdfdf8, -0.9 + i * 0.45, 3.13, TZ + 1.25, s).rotation.y = (i - 2) * 0.12;
  for (const [x, z, ry] of [[0, -3.3, 0], [-4.6, 0, Math.PI / 2], [4.6, 0, -Math.PI / 2]]) { box(2.2, 0.35, 2.2, 0x6a4a30, x, 1.55, TZ + z, s); }
  const eames = put(makeChar('eames', 'smirk'), 0, 0, TZ - 3.2, 0), fake = put(makeChar('civD', 'smirk'), 0, 0, TZ - 3.2, 0), g1 = put(makeChar('civA', 'serious'), -4.5, 0, TZ, Math.PI / 2), g2 = put(makeChar('civC', 'serious'), 4.5, 0, TZ, -Math.PI / 2); s.add(eames.g, fake.g, g1.g, g2.g);
  const chip = cyl(0.28, 0.1, 0xd9a02a, 0, 0, 0.3, eames.hand('R'), 10);
  const walkers = ['civB', 'civC'].map(n => { const c = makeChar(n); s.add(c.g); return c; });
  return {
    s, cam, eames, fake, g1, g2, TZ,
    pre(T) { for (const c of [eames, fake, g1, g2]) { c.reset(); c.sit(); c.idle(T); } g1.look('serious', T); g2.look('surprised', T); g1.head.rotation.y = -0.5; g2.head.rotation.y = 0.5; fake.g.visible = false; eames.g.visible = true; eames.g.scale.setScalar(1); fake.g.scale.setScalar(1); walkers.forEach((c, i) => { c.reset(); put(c, i ? 3.2 : -3.4, 0, i ? 30 - ((T * 3 + 10) % 50) : -30 + ((T * 3) % 50), i ? Math.PI : 0); c.walk(T * 6 + i, 0.6); c.look('neutral', T); }); }
  };
});
SHOT('c4', 'mombasa', c => {
  const S = c.S, e = S.eames, f = S.fake, [i, k] = cuts(c.k, [0.42]); const TZ = S.TZ;
  for (const ch of [e, f]) { ch.armR.rotation.x = -1.25; ch.armR.rotation.z = -0.25 + Math.sin(c.T * 6) * 0.12; ch.armL.rotation.x = -1.0; ch.armL.rotation.z = 0.3; ch.head.rotation.z = 0.07; }
  if (i === 0) { e.look('smirk', c.T); move(c.cam, [0, 13, 27], [0, 4.5, TZ], [-0.6, 5.6, 11], [0, 4.4, TZ - 2], k, 38); }
  else { const fl = k > 0.38 && k < 0.74, edge = Math.abs(k - 0.38) < 0.05 || Math.abs(k - 0.74) < 0.05; f.g.visible = fl; e.g.visible = !fl; e.g.scale.setScalar(edge ? 1.08 : 1); f.g.scale.setScalar(edge ? 1.08 : 1); f.look('smirk', c.T); e.look(k > 0.8 ? 'joy' : 'smirk', c.T); if (edge) c.flash(0.35); move(c.cam, [1.8, 5.0, TZ + 8], [0, 4.5, TZ - 3.2], [1.0, 4.9, TZ + 6], [0, 4.55, TZ - 3.2], k, 30); }
  c.lower('EAMES', 'The Forger', Math.min(c.l - 0.2, (c.dur - c.l) * 1.5));
});

// ================= YUSUF'S BASEMENT =================
SET('lab', () => {
  const { s, cam } = mkScene(0x0a0c0b, [30, 110], 0xffd9a0, 0.35, [0x8fa89a, 0x1a140e, 0.8], [6, 30, 10]);
  s.userData.bloom = 0.4; s.userData.sun.castShadow = false;
  ground(s, 200, '#2a2824', '#322f2a');
  const stone = tex(64, 64, c => { c.fillStyle = '#3a3630'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#2a2622'; for (let y = 0; y < 64; y += 21) { c.fillRect(0, y, 64, 3); for (let x = (y / 21 % 2) * 16; x < 64; x += 32) c.fillRect(x, y, 3, 21); } }); stone.wrapS = stone.wrapT = THREE.RepeatWrapping; stone.repeat.set(20, 4);
  const wm = new THREE.MeshLambertMaterial({ map: stone }); const wall = (w, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 14), wm); m.position.set(x, y, z); m.rotation.y = ry; s.add(m); }; wall(140, 30, 7, -9, 0);
  // shelves of bottles
  const cols = [0x4dff88, 0x5ab0ff, 0xffb84d, 0xff6a8a, 0xc98aff, 0xfff27a];
  for (let sh = 0; sh < 4; sh++) { box(22, 0.3, 1.6, 0x4a3220, 0, 2.2 + sh * 2.3, -8, s); for (let i = 0; i < 20; i++) { if (hash(sh * 31 + i) < 0.2) continue; const h = 0.7 + hash(sh * 7 + i) * 0.9, c = cols[Math.floor(hash(sh * 13 + i) * 6)]; box(0.55, h, 0.55, new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.35 }), -10 + i * 1.05, 2.35 + sh * 2.3 + h / 2, -8, s).castShadow = false; } }
  for (const x of [-11, 0, 11]) box(0.4, 10.5, 1.6, 0x3a2618, x, 5.25, -8, s);
  box(12, 0.4, 3.4, 0x5a3f28, 0, 2.9, -1.5, s); for (const x of [-5.4, 5.4]) box(0.4, 2.7, 3, 0x4a3220, x, 1.35, -1.5, s);
  for (let i = 0; i < 7; i++) { const c = cols[i % 6]; box(0.7, 0.9 + (i % 3) * 0.3, 0.7, new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 }), -4.6 + i * 1.5, 3.6 + (i % 3) * 0.15, -2.2, s).castShadow = false; }
  const burn = box(0.3, 0.5, 0.3, basic(0x7ab8ff), 3.2, 3.4, -1.0, s);
  const wl = new THREE.PointLight(0xffc98a, 90, 26); wl.position.set(-2, 8.5, 3); s.add(wl); box(0.7, 0.5, 0.7, basic(0xffe2a8), -2, 9.2, 3, s);
  const yus = put(makeChar('yusuf', 'smirk'), 0.5, 0, 1.8, 0); s.add(yus.g);
  const vial = box(0.5, 0.9, 0.5, basic(0x38a866), 0, 0, 0.35, yus.hand('R')); const vl = new THREE.PointLight(0x4dff88, 8, 12); yus.hand('R').add(vl);
  // sleepers room
  const SX = 60; const tubes = []; const hub = box(1.2, 2.2, 1.2, 0x8a9199, SX, 1.1, -2, s); const hc = box(0.7, 0.7, 0.7, basic(0x7dffb0), SX, 2.6, -2, s);
  for (let i = 0; i < 12; i++) { const row = i % 2, k = Math.floor(i / 2), x = SX - 15 + k * 6, z = row ? 3.5 : -7.5; const g = new THREE.Group(); g.position.set(x, 0, z); s.add(g); box(2.6, 0.3, 6.4, 0x5a4a38, 0, 1.3, 0, g); for (const [a, b] of [[-1.1, -2.9], [1.1, -2.9], [-1.1, 2.9], [1.1, 2.9]]) box(0.2, 1.3, 0.2, 0x3a2e22, a, 0.65, b, g); box(2.4, 0.7, 4.2, [0x6a4a5a, 0x4a5a6a, 0x5a6a4a, 0x6a5a3a][i % 4], 0, 1.8, 0.9, g); box(1.2, 1.1, 1.2, [0xe6b78c, 0xa9744f, 0xf0cdb0, 0xc98f66][i % 4], 0, 2.0, -2.1, g); box(1.3, 0.4, 1.3, [0x2a1c14, 0x8a8a86, 0x5a3d26][i % 3], 0, 2.45, -2.4, g); const dx = SX - x, dz = -2 - (z - 1), t = box(0.09, 0.09, Math.hypot(dx, dz), new THREE.MeshBasicMaterial({ color: 0x7dffb0 }), x + dx / 2, 2.5, z - 1 + dz / 2, s); t.rotation.y = Math.atan2(dx, dz); t.castShadow = false; tubes.push(t); }
  for (const x of [SX - 12, SX, SX + 12]) { const p = new THREE.PointLight(0xffb866, 170, 30); p.position.set(x, 8, -2); s.add(p); box(0.6, 0.5, 0.6, basic(0xffd9a0), x, 9, -2, s); box(0.06, 5, 0.06, 0x111111, x, 11.7, -2, s); }
  const keeper = put(makeChar('civC', 'neutral'), SX + 19, 0, -3, -1.2); s.add(keeper.g);
  return { s, cam, yus, SX, keeper, pre(T) { yus.reset(); yus.idle(T); burn.scale.y = 1 + Math.sin(T * 17) * 0.3; hc.scale.setScalar(1 + Math.sin(T * 2.2) * 0.15); tubes.forEach((t, i) => t.material.color.setScalar(0.35 + 0.65 * Math.max(0, Math.sin(T * 2.2 - i * 0.5)))); tubes.forEach(t => { t.material.color.r *= 0.5; t.material.color.b *= 0.7; }); vl.intensity = 8 + Math.sin(T * 6) * 2; keeper.reset(); keeper.idle(T); keeper.look('neutral', T); } };
});
SHOT('c5', 'lab', c => {
  const S = c.S, y = S.yus, [i, k] = cuts(c.k, [0.48]);
  if (i === 0) { y.look(k > 0.5 ? 'joy' : 'smirk', c.T); y.armR.rotation.x = -1.75 - Math.sin(c.T * 3) * 0.08; y.armR.rotation.z = -0.25; y.head.rotation.y = 0.25; y.head.rotation.z = -0.06; move(c.cam, [-3.6, 5.2, 12], [0.8, 4.7, 1.8], [-2.4, 5.0, 9.6], [0.8, 4.8, 1.8], k, 32); }
  else move(c.cam, [S.SX - 20, 7.5, 13], [S.SX - 6, 2, -3], [S.SX - 6, 5.2, 12], [S.SX + 6, 2, -3], k, 44);
  c.lower('YUSUF', 'The Chemist', Math.min(c.l - 0.2, (c.dur - c.l) * 1.5));
});

// ================= DREAM LEVELS (explainer) =================
SET('levels', () => {
  const { s, cam } = mkScene(0x070912, null, 0xffffff, 1.6, [0xbfd0ff, 0x1a1c2a, 1.1], [20, 60, 40], 50);
  s.userData.bloom = 0.5; s.userData.sun.castShadow = false;
  const SN = 700, sp = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) sp.set([(hash(i) - 0.5) * 500, (hash(i + 0.3) - 0.5) * 300 + 20, -120 - hash(i + 0.6) * 200], i * 3); const stars = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xcfd8ff, size: 0.9 })); stars.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3)); s.add(stars);
  const Y = [42, 28, 14, 0], PW = 26, PD = 16;
  // plane
  const pln = new THREE.Group(); pln.position.set(0, Y[0] + 2, 0); s.add(pln); box(16, 2.6, 2.6, 0xf2f5f8, 0, 0, 0, pln); box(2.4, 2.2, 2.4, 0x9fd0f2, 8.4, 0.1, 0, pln); box(5, 0.4, 22, 0xdfe5ec, -0.5, -0.3, 0, pln); box(1.2, 3.6, 0.4, 0xc0392b, -7.6, 2.4, 0, pln); box(3, 0.3, 7, 0xdfe5ec, -7.4, 0.6, 0, pln); for (let i = 0; i < 8; i++) box(0.7, 0.7, 2.7, 0x35507a, -5 + i * 1.5, 0.4, 0, pln);
  const clouds = [0, 1, 2, 3, 4, 5].map(i => { const c = box(7 + hash(i) * 6, 1.6, 4, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }), 0, Y[0] - 2 + hash(i + 2) * 7, -6 + hash(i + 4) * 10, s); return c; });
  const plat = (y, col, edge) => { const g = new THREE.Group(); g.position.y = y; s.add(g); box(PW, 1, PD, col, 0, -0.5, 0, g); box(PW + 0.6, 0.3, PD + 0.6, edge, 0, -1.1, 0, g); return g; };
  // L1 rainy city
  const L1 = plat(Y[1], 0x2c3138, 0x7fd0ff); for (let i = 0; i < 12; i++) { const h = 3 + hash(i + 40) * 6, b = building(3.4, h, 3.4, ['#3d4753', '#4a4f5a'][i % 2], 0.4, i + 60); b.position.set(-11 + (i % 6) * 4.4, h / 2, i < 6 ? -5.5 : 5.5); L1.add(b); }
  const train = new THREE.Group(); L1.add(train); box(1.6, 1.8, 4, 0x8a2b22, 0, 1.1, 0, train); box(1.5, 1.6, 4, 0x5f6b3a, 0, 1.0, -4.3, train); box(1.5, 1.6, 4, 0x3a5f6b, 0, 1.0, -8.6, train); train.rotation.y = Math.PI / 2;
  const taxi = car(0xf0c020); taxi.scale.setScalar(0.32); L1.add(taxi);
  const RN = 160, rp = new Float32Array(RN * 6), rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xcfe2f5, transparent: true, opacity: 0.6 })); rain.geometry.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rain.frustumCulled = false; L1.add(rain);
  // L2 hotel
  const L2 = plat(Y[2], 0x7a1f24, 0xffc76a); const cor = new THREE.Group(); cor.position.set(0, 4.4, 0); L2.add(cor); const wd = new THREE.MeshLambertMaterial({ color: 0xd9c7a0, side: THREE.DoubleSide });
  for (const [w, h, d, x, y, z] of [[20, 0.3, 6, 0, -3, 0], [20, 0.3, 6, 0, 3, 0], [20, 6, 0.3, 0, 0, -3]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wd); m.position.set(x, y, z); cor.add(m); } for (let i = 0; i < 5; i++) { box(1.6, 3.6, 0.2, 0x4a2f1b, -8 + i * 4, -1.1, -2.8, cor); box(0.8, 0.3, 0.8, basic(0xffe9b8), -6 + i * 4, 2.75, 0, cor); }
  const fighter = makeChar('arthur'); fighter.g.scale.setScalar(0.5); cor.add(fighter.g); const fg2 = makeChar('guard'); fg2.g.scale.setScalar(0.5); cor.add(fg2.g);
  const l2l = new THREE.PointLight(0xffc98a, 60, 26); l2l.position.set(0, 5, 8); L2.add(l2l);
  // L3 snow fortress
  const L3 = plat(Y[3], 0xeef3f8, 0xbfe3ff); box(9, 4, 5, 0x8d949c, 2, 2, -3, L3); box(3, 6.5, 3, 0x7b828a, -2.6, 3.25, -3, L3); box(3, 6.5, 3, 0x7b828a, 6.6, 3.25, -3, L3); box(9.6, 0.4, 5.6, 0xffffff, 2, 4.2, -3, L3); const vd = cyl(1.3, 0.4, 0x4b5158, 2, 2, -0.4, L3, 16); vd.rotation.x = Math.PI / 2;
  for (let i = 0; i < 9; i++) { const x = -11.5 + hash(i + 80) * 23, z = 1 + hash(i + 90) * 6; if (Math.abs(x - 2) < 3.5 && z < 3) continue; box(0.3, 0.9, 0.3, 0x5a3d26, x, 0.45, z, L3); box(1.5, 1.1, 1.5, 0x2f6b45, x, 1.3, z, L3); box(1.0, 0.9, 1.0, 0x2f6b45, x, 2.2, z, L3); box(1.1, 0.2, 1.1, 0xffffff, x, 2.75, z, L3); }
  const SNn = 220, snp = new Float32Array(SNn * 3), snow = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xffffff, size: 0.28 })); snow.geometry.setAttribute('position', new THREE.BufferAttribute(snp, 3)); snow.frustumCulled = false; L3.add(snow);
  // connecting tether + clocks + labels
  const beam = box(0.3, Y[0], 0.3, new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.55 }), 0, Y[0] / 2, 0, s); beam.castShadow = false;
  const pulses = [0, 1, 2, 3].map(() => { const p = box(0.9, 0.9, 0.9, basic(0xfff2c0), 0, 0, 0, s); p.castShadow = false; return p; });
  const clocks = Y.map((y, i) => { const g = new THREE.Group(); g.position.set(-PW / 2 - 9, y + 3.4, 2); g.userData.sc = 1.6; s.add(g); const f = cyl(2.6, 0.3, 0xf4efe6, 0, 0, 0, g, 24); f.rotation.x = Math.PI / 2; const rim = cyl(2.9, 0.25, 0xd9b24a, 0, 0, -0.1, g, 24); rim.rotation.x = Math.PI / 2; for (let k = 0; k < 12; k++) box(0.14, 0.45, 0.1, 0x222222, Math.sin(k * 0.5236) * 2.15, Math.cos(k * 0.5236) * 2.15, 0.2, g).rotation.z = -k * 0.5236; const h1 = new THREE.Group(), h2 = new THREE.Group(); h1.position.z = h2.position.z = 0.25; g.add(h1, h2); box(0.2, 2.0, 0.1, 0x1a1a1a, 0, 1.0, 0, h1); box(0.26, 1.3, 0.1, 0xc0392b, 0, 0.65, 0, h2); return { g, h1, h2, sp: [0.5, 3, 12, 50][i] }; });
  const tags = ['10 HOURS', '1 WEEK', '6 MONTHS', '10 YEARS'].map((t, i) => { const l = label(t, { h: 4.6, bg: i === 3 ? '#ffd24a' : '#14161c', color: i === 3 ? '#14161c' : '#ffd24a', border: '#ffd24a' }); l.position.set(PW / 2 + 15, Y[i] + (i === 3 ? 6.4 : 3.2), 2); s.add(l); return l; });
  const names = ['REALITY · THE PLANE', 'LEVEL 1 · THE CITY', 'LEVEL 2 · THE HOTEL', 'LEVEL 3 · THE FORTRESS'].map((t, i) => { const l = label(t, { h: 1.9, color: '#cfe4ff' }); l.position.set(0, Y[i] + 10.2, 2); s.add(l); return l; });
  return {
    s, cam, Y, tags, names, clocks,
    pre(T) {
      pln.position.y = Y[0] + 2 + Math.sin(T * 1.2) * 0.3; pln.rotation.z = Math.sin(T * 0.8) * 0.03; clouds.forEach((c, i) => c.position.x = 40 - ((T * (4 + i) + i * 17) % 80));
      train.position.set(-16 + ((T * 9) % 36), 0, 0); taxi.position.set(10 - ((T * 4) % 22), 0, 2.2); taxi.rotation.y = -Math.PI / 2;
      for (let i = 0; i < RN; i++) { const x = (hash(i) - 0.5) * PW, z = (hash(i + 0.5) - 0.5) * PD, y = 12 - ((T * 16 + hash(i + 0.2) * 12) % 12); rp.set([x, y, z, x + 0.08, y - 0.6, z], i * 6); } rain.geometry.attributes.position.needsUpdate = true;
      cor.rotation.x = T * 0.9; fighter.reset(); fg2.reset(); put(fighter, -1.6, -2.8, 0, Math.PI / 2); put(fg2, 1.6, -2.8, 0, -Math.PI / 2); const p = Math.sin(T * 7); fighter.armR.rotation.x = -1.2 - p * 0.5; fg2.armL.rotation.x = -1.2 + p * 0.5; fighter.walk(T * 8, 0.4); fg2.body.rotation.x = -0.2 - p * 0.15;
      vd.rotation.z = T; for (let i = 0; i < SNn; i++) snp.set([(hash(i) - 0.5) * PW + Math.sin(T + i) * 0.4, 10 - ((T * 2.2 + hash(i + 0.3) * 10) % 10), (hash(i + 0.6) - 0.5) * PD], i * 3); snow.geometry.attributes.position.needsUpdate = true;
      pulses.forEach((pp, i) => { const k = (T * 0.45 + i * 0.25) % 1; pp.position.set(0, Y[0] * (1 - k), 0); pp.scale.setScalar(0.5 + Math.sin(k * Math.PI) * 0.7); });
      clocks.forEach(c => { c.h1.rotation.z = -T * c.sp; c.h2.rotation.z = -T * c.sp / 12; c.g.visible = false; }); tags.forEach(t => setPop(t, 0)); names.forEach(t => t.visible = false);
    }
  };
});
SHOT('c6:0', 'levels', c => {
  const S = c.S, Y = S.Y, k = c.k; const y = pw(k, [[0, Y[0] + 1], [0.1, Y[0] + 1], [0.3, Y[1] + 2], [0.4, Y[1] + 2], [0.6, Y[2] + 3], [0.7, Y[2] + 3], [0.9, Y[3] + 2.5], [1, Y[3] + 2.5]]);
  const idx = k < 0.2 ? 0 : k < 0.5 ? 1 : k < 0.8 ? 2 : 3; S.names[idx].visible = true;
  shot(c.cam, [10 - k * 6, y + 5.5, 40 - k * 3], [0, y + 2.2, 0], 36);
});
SHOT('c6:1', 'levels', c => { const S = c.S; S.clocks.forEach((cl, i) => { cl.g.visible = true; cl.g.scale.setScalar(1.6 * ease((c.k - i * 0.12) * 4) + 0.001); }); move(c.cam, [14, 14, 52], [0, 6, 0], [16, 31, 104], [3, 26.5, 0], c.k, 38); });
SHOT('c6:2', 'levels', c => {
  const S = c.S; S.clocks.forEach(cl => { cl.g.visible = true; cl.g.scale.setScalar(1.6); }); const at = [0.02, 0.36, 0.56, 0.76];
  S.tags.forEach((t, i) => setPop(t, (c.k - at[i]) * c.dur / 0.3));
  move(c.cam, [16, 31, 104], [3, 26.5, 0], [8, 29, 100], [3, 26.5, 0], c.k, 38);
});

// ================= THE ELEVATOR OF MEMORIES =================
SET('elevator', () => {
  const { s, cam } = mkScene(0x050506, [40, 130], 0xffffff, 0.15, [0x8090b0, 0x1a1410, 0.55], [6, 30, 10]);
  s.userData.bloom = 0.5; s.userData.sun.castShadow = false;
  const FY = [36, 18, 0], RW = 22, RH = 13, RD = 22, RZ = -3;
  for (const sx of [-1, 1]) box(1, 110, 14, 0x3a2e26, sx * 11.5, 25, 4, s); box(24, 110, 1, 0x100d0a, 0, 25, 11.5, s).visible = false;
  const room = (y, floorC, wallC, light, li) => { const g = new THREE.Group(); g.position.set(0, y, RZ); s.add(g); box(RW, 0.5, RD, floorC, 0, -0.25, -RD / 2, g); box(RW, RH, 0.5, wallC, 0, RH / 2, -RD, g); box(0.5, RH, RD, wallC, -RW / 2, RH / 2, -RD / 2, g); box(0.5, RH, RD, wallC, RW / 2, RH / 2, -RD / 2, g); box(RW, 0.5, RD, wallC, 0, RH, -RD / 2, g); box(RW + 2, 18 - RH - 0.5, 1, 0x100d0a, 0, RH + (18 - RH) / 2, 0.2, g); const p = new THREE.PointLight(light, li, 40); p.position.set(0, RH - 2, -RD / 2 + 3); g.add(p); return g; };
  // floor 1: the beach
  const R1 = room(FY[0], 0xdcc79a, 0x9fd0f2, 0xfff0c8, 260); box(RW, 0.3, 9, 0x3c7f9f, 0, 0.05, -RD + 4.5, R1); cyl(2.2, 0.3, basic(0xfff2c0), 5, 9.5, -RD + 0.4, R1, 20).rotation.x = Math.PI / 2; box(2.4, 1.3, 2.4, 0xcdb98c, -2, 0.65, -11.5, R1); box(1.3, 1.2, 1.3, 0xcdb98c, -2, 1.9, -11.5, R1);
  const kids = [put(makeChar('boy'), -4.4, 0, -10, Math.PI + 0.4), put(makeChar('girl'), 0.6, 0, -9.6, Math.PI - 0.4)]; kids.forEach(k => { k.g.scale.setScalar(0.62); R1.add(k.g); });
  // floor 2: the house
  const R2 = room(FY[1], 0xb98a58, 0xf2e6d2, 0xffe2b8, 240); box(7, 6, 0.3, basic(0xdff0ff), -3, 6.5, -RD + 0.4, R2); box(0.3, 6, 0.4, 0x8a6238, -3, 6.5, -RD + 0.5, R2); box(7, 0.3, 0.4, 0x8a6238, -3, 6.5, -RD + 0.5, R2); box(6, 0.35, 3.4, 0x8a5a34, 3, 2.9, -10, R2); for (const [x, z] of [[-2.7, -1.4], [2.7, -1.4], [-2.7, 1.4], [2.7, 1.4]]) box(0.3, 2.75, 0.3, 0x74492a, 3 + x, 1.4, -10 + z, R2); box(2.2, 3.6, 0.3, 0x74492a, 3, 3.6, -12.6, R2); const htop = makeTop(0.5); htop.position.set(3.6, 3.1, -9.6); R2.add(htop); box(3, 4, 0.2, 0xd9b24a, 7, 7, -RD + 0.4, R2); box(2.4, 3.4, 0.25, 0x6a8fb0, 7, 7, -RD + 0.5, R2);
  // floor 3: the wrecked anniversary suite
  const R3 = room(FY[2], 0x5a1c22, 0xd9cdb4, 0xffd0a0, 190);
  const cw = tex(256, 128, c => { c.fillStyle = '#0a1024'; c.fillRect(0, 0, 256, 128); for (let i = 0; i < 16; i++) { const x = i * 16, h = 30 + hash(i + 11) * 80; c.fillStyle = '#161d33'; c.fillRect(x, 128 - h, 14, h); c.fillStyle = '#ffd98a'; for (let y = 128 - h + 4; y < 124; y += 8) for (let xx = x + 2; xx < x + 12; xx += 5) if (hash(xx * 3.1 + y) < 0.4) c.fillRect(xx, y, 3, 4); } });
  const cwin = new THREE.Mesh(new THREE.PlaneGeometry(13, 8.5), new THREE.MeshBasicMaterial({ map: cw })); cwin.position.set(0, 6.2, -RD + 0.35); R3.add(cwin); box(13.6, 0.4, 0.5, 0x3a2618, 0, 10.6, -RD + 0.4, R3); box(13.6, 0.4, 0.5, 0x3a2618, 0, 1.8, -RD + 0.4, R3); box(0.4, 8.6, 0.5, 0x3a2618, 0, 6.2, -RD + 0.4, R3);
  const curt = [-1, 1].map(sx => { const g = new THREE.Group(); g.position.set(sx * 6.2, 10.8, -RD + 1.2); R3.add(g); box(3, 9.4, 0.25, 0xf2ead8, 0, -4.7, 0, g); return g; });
  box(8, 1.4, 9, 0xe9e2d2, -6, 1.0, -15, R3); box(8, 3.6, 0.6, 0x4a2f1b, -6, 2.4, -19.6, R3); box(3, 0.5, 2, 0xf4f4f0, -6, 1.95, -18, R3);
  const junk = [[4, 1.1, -8, 0.4, 1.2], [7.5, 0.6, -13, 1.3, 0.3], [2, 0.5, -15.5, 0.2, 1.5]]; junk.forEach(([x, y, z, rz, ry], i) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0, ry, rz + Math.PI / 2); R3.add(g); box(2.2, 0.3, 2.2, 0x4a2f1b, 0, 0, 0, g); box(2.2, 2.6, 0.3, 0x4a2f1b, 0, 1.3, -1.0, g); });
  const tb = box(5, 0.4, 3, 0x3a2618, 6, 1.7, -17.5, R3); tb.rotation.z = 1.1; for (let i = 0; i < 40; i++) box(0.25 + hash(i) * 0.3, 0.06, 0.25 + hash(i + 2) * 0.3, i % 3 ? 0xcfe6f5 : 0xf4f4f0, (hash(i + 5) - 0.5) * 16, 0.06, -4 - hash(i + 9) * 15, R3).rotation.y = hash(i) * 3;
  box(0.6, 1.6, 0.6, 0x2f5f45, 1.2, 0.3, -6, R3).rotation.z = 1.4; box(1.6, 0.1, 1.2, 0xf4efe6, -1.5, 0.08, -7, R3);
  // cage
  const E = new THREE.Group(); s.add(E); const iron = M(0x2a2622);
  box(8, 0.4, 7, 0x3a322a, 0, -0.2, 4, E); box(8, 0.4, 7, 0x2a2622, 0, 9.4, 4, E);
  for (const x of [-3.9, 3.9]) for (const z of [0.6, 7.4]) box(0.3, 9.6, 0.3, iron, x, 4.6, z, E);
  for (const x of [-3.9, 3.9]) for (let z = 1.5; z < 7.4; z += 0.9) box(0.1, 9.4, 0.1, iron, x, 4.6, z, E);
  for (let x = -3.4; x < 3.9; x += 0.85) box(0.1, 9.4, 0.1, iron, x, 4.6, 7.4, E);
  for (const y of [3.2, 6.4]) { box(0.12, 0.12, 6.8, iron, -3.9, y, 4, E); box(0.12, 0.12, 6.8, iron, 3.9, y, 4, E); }
  const gate = [-1, 1].map(sx => { const g = new THREE.Group(); g.position.set(sx * 3.9, 0, 0.6); E.add(g); for (let i = 0; i < 5; i++) box(0.1, 9.2, 0.1, iron, -sx * (0.4 + i * 0.8), 4.6, 0, g); return g; });
  box(0.9, 0.6, 0.9, basic(0xffdca0), 0, 9.0, 4, E); const el = new THREE.PointLight(0xffc98a, 45, 22); el.position.set(0, 8, 4); E.add(el); const fill = new THREE.PointLight(0x8fa0d0, 260, 60); fill.position.set(8, 9, 24); E.add(fill);
  box(0.25, 80, 0.25, 0x111111, 0, 49.6, 4, E);
  const cobb = makeChar('cobb', 'sad'), mal = makeChar('mal', 'sad'); E.add(cobb.g); s.add(mal.g);
  return {
    s, cam, E, cobb, mal, FY, RZ, gate,
    pre(T) { this.ey(60); this.open(0); cobb.reset(); if (cobb.g.parent !== E) E.add(cobb.g); put(cobb, -1.6, 0, 4.6, Math.PI); cobb.idle(T); cobb.look('sad', T); mal.reset(); mal.idle(T + 1); mal.look('sad', T); mal.g.visible = true; kids.forEach((k, i) => { k.reset(); k.body.rotation.x = 0.45; k.armR.rotation.x = -0.8 - Math.sin(T * 4 + i) * 0.3; }); curt.forEach((g, i) => { g.rotation.x = 0.25 + Math.sin(T * 1.6 + i) * 0.18; g.rotation.z = Math.sin(T * 1.1 + i * 2) * 0.06; }); htop.userData.set(T, 0.05); el.intensity = 90 + (hash(Math.floor(T * 12)) > 0.86 ? -50 : 0); },
    ey(y) { E.position.y = y; }, open(k) { gate.forEach(g => g.scale.x = 1 - 0.82 * ease(k)); },
    malAt(f, x, z, ry) { put(mal, x, FY[f], RZ + z, ry); }
  };
});
SHOT('d2:0', 'elevator', c => { const S = c.S, y = lerp(62, 45, c.k); S.ey(y); S.malAt(0, 5, -12, Math.PI); move(c.cam, [7, 54, 30], [0, y + 4, 4], [5, 50, 25], [0, y + 4.5, 4], c.k, 36); });
SHOT('d2:1', 'elevator', c => {
  const S = c.S, y = pw(c.k, [[0, 41], [0.1, 37], [0.46, 35.4], [0.6, 19], [0.94, 17.4], [1, 15.5]]); S.ey(y);
  if (y > 27) { S.malAt(0, 5.2, -10.5, 0.2); S.mal.look('joy', c.T); S.mal.armR.rotation.z = 2.4 + Math.sin(c.T * 5) * 0.25; } else { S.malAt(1, -1.5, -8.5, 0.15); S.mal.look('smirk', c.T); S.mal.head.rotation.z = 0.1; }
  S.cobb.head.rotation.x = -0.05; shot(c.cam, [3.2, y + 5.2, 10.6], [0.6, y + 3.6, -10], 44);
});
SHOT('d2:2', 'elevator', c => {
  const S = c.S, y = lerp(9, 0, ease(clamp(c.k / 0.45))); S.ey(y); S.open((c.k - 0.45) / 0.25); S.malAt(2, 2, -15.5, Math.PI); S.mal.head.rotation.y = 0.9 * ease((c.k - 0.6) / 0.3); S.mal.look('sad', c.T);
  const w = ease((c.k - 0.62) / 0.38); put(S.cobb, -1.6 + w * 1.2, 0, 4.6 - w * 6.5, Math.PI); if (w > 0 && w < 1) S.cobb.walk(c.T * 6, 0.5);
  move(c.cam, [3.4, y + 5.4, 11], [0.8, y + 3.8, -10], [2.6, y + 5.2, 9.2], [1.2, y + 4.0, -12], c.k, 42);
});
SHOT('d3', 'elevator', c => {
  const S = c.S, m = S.mal; S.ey(0); S.open(1); S.malAt(2, 2, -13, 0); S.s.remove(S.cobb.g); S.E.remove(S.cobb.g);
  const hard = c.k > 0.55; m.look(hard ? 'serious' : 'sad', c.T, c.talk); m.head.rotation.z = hard ? 0 : 0.12; m.head.rotation.x += hard ? -0.04 : 0.1; m.armR.rotation.x = -0.7 * ease((c.k - 0.5) * 4);
  move(c.cam, [0.2, 4.9, S.RZ - 3.6], [2, 4.75, S.RZ - 13], [1.0, 4.85, S.RZ - 6.2], [2, 4.8, S.RZ - 13], c.k, 30);
});

// ================= d4: she follows him everywhere (cuts across three sets) =================
SET('d4multi', () => {
  const names = ['workshop', 'paris', 'rooftop']; let cur = null;
  return { get s() { return cur.s; }, get cam() { return cur.cam; }, pre(T) { const [a, b] = LINE.d4.slot; this.k = clamp((T - a) / (b - a)); [this.i, this.sub] = cuts(this.k, [0.36, 0.68]); cur = getSet(names[this.i]); cur.pre && cur.pre(T); this.cur = cur; } };
});
SHOT('d4', 'd4multi', c => { const S = c.S.cur; c.cam = S.cam; S.d4(c, c.S.sub); });
