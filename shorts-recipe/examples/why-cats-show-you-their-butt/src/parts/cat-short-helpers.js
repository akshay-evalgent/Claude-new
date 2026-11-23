// ---------- helpers shared by the cat shorts ----------
function envK(sc, k) { sc.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m && 'envMapIntensity' in m) { m.userData.envBase ??= m.envMapIntensity ?? 1; m.envMapIntensity = m.userData.envBase * k; } }); }
const shadowSun = (col, I, pos, r = 80, soft = 0.6) => { const l = new THREE.DirectionalLight(col, I); l.position.copy(pos); l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0003; l.shadow.normalBias = 0.6;
  Object.assign(l.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: pos.length() * 2 + 200 }); l.userData.soft = soft; return l; };
function surfaceY(obj, x, z, from = 300) { obj.updateMatrixWorld(true); const rc = new THREE.Raycaster(V(x, from, z), V(0, -1, 0)); const h = rc.intersectObject(obj, true); return h.length ? h[0].point.y : 0; }
// a soft glow sprite texture
const GLOW = (() => { const [c, g] = mkCanvas(128, 128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return texOf(c); })();
// drifting glowing particles along a path: pts.userData.update(t, k, from(), to(u, i)) is driven by the shot
function glowMotes(n = 160, color = 0x9fffd0, size = 1.2) {
  const g = new THREE.BufferGeometry(), pa = new Float32Array(n * 3); g.setAttribute('position', new THREE.BufferAttribute(pa, 3));
  const m = new THREE.PointsMaterial({ color, size, map: GLOW, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.userData.n = n; p.userData.pa = pa; p.userData.seeds = Array.from({ length: n }, (_, i) => [h3(i, 1, 2), h3(i, 3, 4), h3(i, 5, 6)]); return p;
}
