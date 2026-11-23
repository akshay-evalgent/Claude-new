// =====================================================================
// REAL 3D SCANS of real cats (photogrammetry, CC BY, via Sketchfab / Objaverse). Each scan comes with whatever the cat was
// lying on (a board, a mat, bedding). loadScan bakes the scan into cm, samples the photo texture at every vertex, drops the
// support by a colour rule, keeps the largest connected piece (the cat) and reports the height of the surface it lay on.
// =====================================================================
async function loadScan(url, { scale = 100, drop = null, keep = 'largest', lit = true, rough = 0.9, planeTol = 0 } = {}) {
  const g = await gltfL.loadAsync(url); g.scene.updateMatrixWorld(true);
  const group = new THREE.Group(); const info = { up: [] };
  const meshes = []; g.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    let geo = o.geometry.clone(); if (geo.index) geo = geo.toNonIndexed();
    geo.applyMatrix4(new THREE.Matrix4().makeScale(scale, scale, scale).multiply(o.matrixWorld));
    const P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv, n = P.count;
    const map = o.material.map;
    let keepTri = new Uint8Array(n / 3).fill(1);
    if (drop && map && UV) {
      const img = map.image, cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cg = cv.getContext('2d'); cg.drawImage(img, 0, 0);
      const px = cg.getImageData(0, 0, cv.width, cv.height).data, col = new THREE.Color(), hsl = {};
      const gone = new Uint8Array(n); const v = new THREE.Vector3(), nn = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        let u = UV.getX(i), w = UV.getY(i); u -= Math.floor(u); w -= Math.floor(w); if (map.flipY) w = 1 - w;
        const x = Math.min(cv.width - 1, Math.floor(u * cv.width)), y = Math.min(cv.height - 1, Math.floor(w * cv.height)), k = (y * cv.width + x) * 4;
        col.setRGB(px[k] / 255, px[k + 1] / 255, px[k + 2] / 255); col.getHSL(hsl);
        v.fromBufferAttribute(P, i); nn.fromBufferAttribute(N, i);
        if (drop(px[k] / 255, px[k + 1] / 255, px[k + 2] / 255, hsl.h, hsl.s, hsl.l, v, nn)) { gone[i] = 1; if (nn.y > 0.85) info.up.push(v.y); }
      }
      if (planeTol > 0 && info.up.length) { const ys = info.up.slice().sort((a, b) => a - b), py = ys[Math.floor(ys.length / 2)];
        for (let i = 0; i < n; i++) { v.fromBufferAttribute(P, i); nn.fromBufferAttribute(N, i); if (Math.abs(v.y - py) < planeTol && nn.y > 0.45) gone[i] = 1; if (v.y < py - 0.3 && nn.y > 0.45 && Math.abs(v.y - py) < planeTol * 3) gone[i] = 1; } }
      for (let t = 0; t < n / 3; t++) keepTri[t] = (gone[3 * t] + gone[3 * t + 1] + gone[3 * t + 2]) >= 2 ? 0 : 1;
    }
    if (keep === 'largest') {
      // connected components over welded vertex positions
      const key = (i) => `${Math.round(P.getX(i) * 20)},${Math.round(P.getY(i) * 20)},${Math.round(P.getZ(i) * 20)}`;
      const id = new Map(), par = []; const find = (a) => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
      const vid = new Int32Array(n); for (let i = 0; i < n; i++) { const k = key(i); if (!id.has(k)) { id.set(k, par.length); par.push(par.length); } vid[i] = id.get(k); }
      for (let t = 0; t < n / 3; t++) if (keepTri[t]) { const a = find(vid[3 * t]), b = find(vid[3 * t + 1]), c = find(vid[3 * t + 2]); par[b] = a; par[find(c)] = a; }
      const cnt = new Map(); for (let t = 0; t < n / 3; t++) if (keepTri[t]) { const r = find(vid[3 * t]); cnt.set(r, (cnt.get(r) || 0) + 1); }
      let best = -1, bc = 0; cnt.forEach((c, r) => { if (c > bc) { bc = c; best = r; } });
      for (let t = 0; t < n / 3; t++) if (keepTri[t] && find(vid[3 * t]) !== best) keepTri[t] = 0;
    }
    // compact
    const kept = keepTri.reduce((a, b) => a + b, 0); const out = new THREE.BufferGeometry();
    for (const [nm, a] of Object.entries(geo.attributes)) { const sz = a.itemSize, arr = new Float32Array(kept * 3 * sz); let o2 = 0;
      for (let t = 0; t < n / 3; t++) if (keepTri[t]) for (let q = 0; q < 3; q++) { for (let c = 0; c < sz; c++) arr[o2 * sz + c] = a.array[(3 * t + q) * sz + c]; o2++; }
      out.setAttribute(nm, new THREE.BufferAttribute(arr, sz)); }
    out.computeBoundingBox();
    const mat = lit ? new THREE.MeshStandardMaterial({ map, roughness: rough, side: THREE.DoubleSide }) : new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide });
    if (map) { map.anisotropy = 8; map.colorSpace = THREE.SRGBColorSpace; }
    const m = new THREE.Mesh(out, mat); m.castShadow = m.receiveShadow = true; group.add(m);
  }
  let box = new THREE.Box3().setFromObject(group);
  info.up.sort((a, b) => a - b); const sy = info.up.length ? info.up[Math.floor(info.up.length / 2)] : box.min.y;
  // re-centre: origin = middle of the scan, on the surface it lay on (so rotations turn it in place)
  const c = box.getCenter(new THREE.Vector3()); group.children.forEach(m => { m.geometry.translate(-c.x, -sy, -c.z); m.geometry.computeBoundingBox(); m.geometry.computeBoundingSphere(); });
  box = new THREE.Box3().setFromObject(group); info.box = box; info.supportY = 0; info.up = [];
  group.userData.info = info; return group;
}
// put a scan so the surface it lay on sits at height y0, centred over x, z
function seatScan(sc, x = 0, y0 = 0, z = 0) { sc.position.set(x, y0, z); return sc; }
