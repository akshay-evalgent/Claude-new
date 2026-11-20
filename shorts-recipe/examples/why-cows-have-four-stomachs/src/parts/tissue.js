// wet-tissue textures (shared with the stomach-growl short): mottling, fat, branching vessels, fibres, pits and villi
function drawVessels(g, w, h, r, n, col, maxW, len = 160) {
  const branch = (x, y, a, wd, L, d) => {
    g.strokeStyle = col; g.lineCap = 'round';
    for (let i = 0; i < L; i++) {
      const nx = x + Math.cos(a) * 3, ny = y + Math.sin(a) * 3; g.lineWidth = wd * (1 - i / L * 0.7); g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      // draw wrapped copies near the edges so the texture tiles
      for (const [ox, oy] of [[w, 0], [-w, 0], [0, h], [0, -h]]) if ((ox && (x < 20 || x > w - 20)) || (oy && (y < 20 || y > h - 20))) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(nx + ox, ny + oy); g.stroke(); }
      x = (nx + w) % w; y = (ny + h) % h; a += (r() - 0.5) * 0.35;
      if (d < 4 && r() < 0.03) branch(x, y, a + (r() > 0.5 ? 1 : -1) * (0.5 + r() * 0.6), wd * 0.65, L * 0.6, d + 1);
    }
  };
  for (let i = 0; i < n; i++) branch(r() * w, r() * h, r() * Math.PI * 2, maxW * (0.5 + r() * 0.5), len * (0.5 + r()), 0);
}
const TISSUE_CACHE = {};
function tissueSet(kind, seed = 1) { const key = kind + seed; if (TISSUE_CACHE[key]) return TISSUE_CACHE[key]; return (TISSUE_CACHE[key] = tissueSet0(kind, seed)); }
function tissueSet0(kind, seed = 1) {
  const S = 1024, r = rng(seed);
  const col = document.createElement('canvas'), hgt = document.createElement('canvas'); col.width = hgt.width = S; col.height = hgt.height = S;
  const g = col.getContext('2d'), hg = hgt.getContext('2d');
  const P = {
    serosa: { base: '#b8625a', blot: ['#cf857a', '#9c4a48', '#c4706a', '#d99a8a'], ves: ['rgba(110,15,40,0.6)', 'rgba(140,35,70,0.4)'], fat: true },
    colon: { base: '#c79a86', blot: ['#dcb6a0', '#b88472', '#e2c2ac'], ves: ['rgba(120,30,50,0.4)', 'rgba(150,60,80,0.3)'], fat: true },
    mucosa: { base: '#b9474a', blot: ['#d0645e', '#9a3138', '#c95a57', '#e07b70'], ves: ['rgba(90,10,30,0.35)', 'rgba(220,120,110,0.25)'], fat: false },
    villi: { base: '#c45a55', blot: ['#d9786c', '#a84047', '#e0897a'], ves: ['rgba(110,20,40,0.25)'], fat: false },
  }[kind];
  g.fillStyle = P.base; g.fillRect(0, 0, S, S); hg.fillStyle = '#808080'; hg.fillRect(0, 0, S, S);
  // soft mottling
  for (let i = 0; i < 260; i++) { const x = r() * S, y = r() * S, rad = 20 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, P.blot[i % P.blot.length] + '55'); gr.addColorStop(1, P.blot[i % P.blot.length] + '00'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  if (P.fat) for (let i = 0; i < 9; i++) { const x = r() * S, y = r() * S, rw = 40 + r() * 110; g.fillStyle = `rgba(226,${190 + r() * 30},${130 + r() * 40},0.16)`; g.beginPath(); g.ellipse(x, y, rw, rw * (0.3 + r() * 0.4), r() * 3, 0, Math.PI * 2); g.fill(); }
  // vessels in colour, raised in the height map
  for (const c of P.ves) drawVessels(g, S, S, r, kind === 'villi' ? 6 : 14, c, kind === 'serosa' ? 4.5 : 3.2);
  const r2 = rng(seed); drawVessels(hg, S, S, r2, kind === 'villi' ? 6 : 14, 'rgba(255,255,255,0.35)', kind === 'serosa' ? 4.5 : 3.2);
  // fine grain: muscle fibres (serosa), pits (mucosa), velvet (villi)
  const im = hg.getImageData(0, 0, S, S), d = im.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4; let v = 0;
    if (kind === 'serosa' || kind === 'colon') v = Math.sin(y * 0.9 + noise3(x * 0.02, y * 0.02, seed) * 6) * 10 + noise3(x * 0.15, y * 0.15, seed) * 14;
    else if (kind === 'mucosa') v = (noise3(x * 0.12, y * 0.12, seed) > 0.35 ? -26 : 0) + noise3(x * 0.04, y * 0.04, seed + 3) * 22 + noise3(x * 0.4, y * 0.4, seed) * 10;
    else v = (h3(Math.floor(x / 3), Math.floor(y / 3), seed) - 0.5) * 70 + noise3(x * 0.05, y * 0.05, seed) * 20;
    d[i] = d[i + 1] = d[i + 2] = clamp(d[i] + v, 0, 255);
  }
  hg.putImageData(im, 0, 0);
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  return { map, normalMap: heightToNormal(hgt, kind === 'villi' ? 3.5 : 2.2) };
}
const TS = { serosa: tissueSet('serosa', 3), colon: tissueSet('colon', 8), mucosa: tissueSet('mucosa', 5), villi: tissueSet('villi', 11) };
function tissueMat(kind, { rep = [8, 2], wet = 1, ...extra } = {}) {
  const t = TS[kind], c = (x) => { const k = x.clone(); k.repeat.set(rep[0], rep[1]); k.needsUpdate = true; return k; };
  const inner = kind === 'mucosa' || kind === 'villi';
  return new THREE.MeshPhysicalMaterial({
    map: c(t.map), normalMap: c(t.normalMap), normalScale: new THREE.Vector2(inner ? 1.1 : 0.8, inner ? 1.1 : 0.8),
    roughness: inner ? 0.4 : 0.5, clearcoat: wet, clearcoatRoughness: inner ? 0.07 : 0.14, sheen: inner ? 0.35 : 0.2, sheenRoughness: 0.5,
    sheenColor: new THREE.Color(inner ? 0xff6a5a : 0xffa090), vertexColors: true, ...extra,
  });
}

// ---------- tubes along curves with parallel-transport frames ----------
