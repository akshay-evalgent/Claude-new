// =====================================================================
// BRAIN FREEZE: characters, props, boardwalk
// =====================================================================
const shots = [];
function shot(start, end, build) { const s = { start, end, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, ASPECT, 0.02, 300) }; build(s); shots.push(s); return s; }
const hdr = (r, g, b, extra = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), ...extra });
const kf = (t, keys) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b, ease = E.io] = keys[i]; const k = ease(clamp((t - t0) / (t1 - t0)));
    return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
  }
  return keys[keys.length - 1][1];
};
const hex = c => '#' + new THREE.Color(c).getHexString();

// ---------- two-bone arm IK: put the palm on a world point, elbow bends toward the pole ----------
function ik2(p, a, T, pole, L1 = 0.6, L2 = 0.58) {
  p.updateMatrixWorld(true);
  const S = a.sh.getWorldPosition(new THREE.Vector3()), s = a.sh.getWorldScale(new THREE.Vector3()).x;
  const l1 = L1 * s, l2 = L2 * s, D = T.clone().sub(S); const d = Math.min(Math.max(D.length(), Math.abs(l1 - l2) + 1e-3), (l1 + l2) * 0.999); const dir = D.normalize();
  const a1 = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const pp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const Ep = S.clone().add(dir.clone().multiplyScalar(Math.cos(a1)).add(pp.multiplyScalar(Math.sin(a1))).multiplyScalar(l1));
  const u1 = Ep.clone().sub(S).normalize(), u2 = S.clone().add(dir.multiplyScalar(d)).sub(Ep).normalize();
  const down = V(0, -1, 0);
  const q1 = new THREE.Quaternion().setFromUnitVectors(down, u1), q2 = new THREE.Quaternion().setFromUnitVectors(down, u2);
  const pq = a.sh.parent.getWorldQuaternion(new THREE.Quaternion());
  a.sh.quaternion.copy(pq.clone().invert().multiply(q1));
  a.el.quaternion.copy(q1.clone().invert().multiply(q2));
}
const worldPt = (obj, local) => { obj.updateMatrixWorld(true); return obj.localToWorld(local.clone()); };

// ---------- kids ----------
function makeKid(o = {}) {
  const p = makeChar2({ barefoot: false, ...o }); const u = p.userData; const H = u.head;
  p.scale.setScalar(o.s ?? 0.82); H.scale.setScalar(o.hs ?? 1.1);
  if (o.hairUp) { const hc = H.children[2]; hc.rotation.x = -0.32 - o.hairUp; }
  if (o.shorts) u.legs.forEach(L => L.knee.children.forEach((m, i) => { if (m.isMesh && i < 2) m.material = u.skinM; }));
  // brows and mouth for a pained wince
  const brows = H.children.filter(c => c.isMesh && c.geometry.type === 'CapsuleGeometry' && Math.abs(c.position.y - 0.22) < 0.02);
  brows.forEach(b => { b.userData.y = b.position.y; b.userData.rz = b.rotation.z; b.userData.sx = Math.sign(b.position.x); });
  const reset0 = u.reset;
  Object.assign(u, {
    brows,
    reset() { reset0(); brows.forEach(b => { b.position.y = b.userData.y; b.rotation.z = b.userData.rz; }); u.mouth.scale.set(1, 1, 1); u.cold(0); },
    wince(k) { brows.forEach(b => { b.position.y = b.userData.y - 0.035 * k; b.rotation.z = b.userData.rz - b.userData.sx * 0.42 * k; b.position.x = b.userData.sx * (0.16 - 0.02 * k); }); u.mouth.scale.set(1 + 0.45 * k, 1, 1); },
    raise(k) { brows.forEach(b => { b.position.y = b.userData.y + 0.04 * k; b.rotation.z = b.userData.rz + b.userData.sx * 0.15 * k; }); },
    cold(k) { u.skinM.color.copy(u.baseSkin).lerp(new THREE.Color(0xc4d8ff), 0.14 * k); },
  });
  u.reset();
  return p;
}
// world point on the kid's face, in head space (forehead, mouth...)
const headPt = (p, v) => worldPt(p.userData.head, v);

// ---------- frost cracks that grow across a surface (forehead) ----------
function frostTex(seed = 3) {
  return canvasTex(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h); const r = rng(seed);
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(150,200,255,0.55)'); gr.addColorStop(0.55, 'rgba(160,205,255,0.25)'); gr.addColorStop(1, 'rgba(160,205,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const crack = (x, y, a, len, wd, depth) => {
      const P = [[x, y]]; let cx = x, cy = y; const n = 6 + Math.floor(r() * 4), kids = [];
      for (let i = 0; i < n; i++) { a += (r() - 0.5) * 0.7; cx += Math.cos(a) * len / n; cy += Math.sin(a) * len / n; P.push([cx, cy]); if (depth < 3 && r() < 0.35) kids.push([cx, cy, a + (r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.6)]); }
      [[wd * 2.4, 'rgba(60,120,205,0.5)'], [wd * 1.45, 'rgba(245,252,255,1)']].forEach(([lw, col]) => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); P.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); });
      kids.forEach(([kx, ky, ka]) => crack(kx, ky, ka, len * 0.55, wd * 0.65, depth + 1));
    };
    for (let i = 0; i < 9; i++) crack(w / 2, h / 2, i / 9 * Math.PI * 2 + r() * 0.4, 150 + r() * 80, 3.2, 0);
    for (let i = 0; i < 260; i++) { const a = r() * 6.283, d = Math.pow(r(), 0.7) * w * 0.42; g.fillStyle = `rgba(255,255,255,${0.3 + 0.6 * r()})`; const s = 1 + r() * 3; g.fillRect(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, s, s); }
  }, { srgb: true });
}
const FROST = frostTex(3);
function frostMat(map = FROST) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uR: { value: 0 }, uOp: { value: 1 }, tint: { value: new THREE.Color(1.15, 1.2, 1.35) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D map; uniform float uR; uniform float uOp; uniform vec3 tint; varying vec2 vUv;
      void main(){ vec4 c=texture2D(map,vUv); float d=distance(vUv,vec2(0.5)); float m=1.0-smoothstep(uR-0.06,uR,d); float edge=smoothstep(uR-0.035,uR,d)*m*2.0;
        gl_FragColor=vec4(c.rgb*tint*(1.0+edge*1.5), c.a*m*uOp); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
// radius of the merged head surface in a direction (matches mergedHeadGeo)
function headR(n) {
  const c = V(0, -0.24, 0.13), a = V(0.29, 0.232, 0.2755), k = 0.08;
  const rh = 1 / Math.sqrt((n.x / 0.437) ** 2 + (n.y / 0.4968) ** 2 + (n.z / 0.46) ** 2);
  const A = (n.x / a.x) ** 2 + (n.y / a.y) ** 2 + (n.z / a.z) ** 2, B = -2 * (n.x * c.x / a.x ** 2 + n.y * c.y / a.y ** 2 + n.z * c.z / a.z ** 2), Cc = (c.x / a.x) ** 2 + (c.y / a.y) ** 2 + (c.z / a.z) ** 2 - 1;
  const disc = B * B - 4 * A * Cc, rj = disc > 0 ? (-B + Math.sqrt(disc)) / (2 * A) : 0, hh = Math.max(k - Math.abs(rh - rj), 0) / k;
  return Math.max(rh, rj) + hh * hh * k * 0.25;
}
function foreheadFrost(p) {
  const H = p.userData.head, dir = V(0, 0.3, 0.95).normalize(), T = V(1, 0, 0), B = new THREE.Vector3().crossVectors(dir, T).normalize();
  const g = new THREE.PlaneGeometry(0.62, 0.62, 28, 28), pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); const n = dir.clone().add(T.clone().multiplyScalar(x)).add(B.clone().multiplyScalar(-y)).normalize(); const r = headR(n) + 0.006; pa.setXYZ(i, n.x * r, n.y * r, n.z * r); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, frostMat()); m.userData.noDof = false; m.renderOrder = 5; H.add(m); return m;
}

// ---------- the slushie ----------
const SLUSH_T = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2b8fff'; g.fillRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 1800; i++) { const v = r(); g.fillStyle = v > 0.6 ? `rgba(200,235,255,${0.35 + 0.5 * r()})` : `rgba(10,60,180,${0.3 * r()})`; const s = 1 + r() * 4; g.fillRect(r() * w, r() * h, s, s); } }, { rep: [3, 2] });
const SLUSH_B = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(9); for (let i = 0; i < 2200; i++) { g.fillStyle = r() > 0.5 ? '#ffffff' : '#202020'; const s = 1 + r() * 3; g.beginPath(); g.arc(r() * w, r() * h, s, 0, 7); g.fill(); } }, { rep: [3, 2], srgb: false });
function slushMat() { return new THREE.MeshPhysicalMaterial({ map: SLUSH_T, bumpMap: SLUSH_B, bumpScale: 2.5, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, emissive: 0x0a3a90, emissiveIntensity: 0.35, sheen: 0.6, sheenColor: new THREE.Color(0xbfe4ff) }); }
function makeSlushie() {
  const g = new THREE.Group(), H = 0.62, r0 = 0.15, r1 = 0.215, R = k => lerp(r0, r1, k);
  const cupM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const prof = []; for (let i = 0; i <= 24; i++) { const k = i / 24; prof.push(new THREE.Vector2(R(k), k * H)); }
  const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), cupM); cup.renderOrder = 3; g.add(cup);
  const rimT = new THREE.Mesh(new THREE.TorusGeometry(r1 + 0.004, 0.009, 10, 72), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.6 })); rimT.rotation.x = Math.PI / 2; rimT.position.y = H; g.add(rimT);
  // printed paper band with snowflakes
  const bandT = canvasTex(1024, 160, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e8f4ff'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#1a6fe0'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14); c.strokeStyle = '#1a6fe0'; c.lineWidth = 6; c.lineCap = 'round';
    for (let k = 0; k < 6; k++) { const x = 90 + k * 170, y = h / 2; for (let a = 0; a < 6; a++) { const an = a * Math.PI / 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(an) * 42, y + Math.sin(an) * 42); c.stroke(); const bx = x + Math.cos(an) * 26, by = y + Math.sin(an) * 26; [-0.6, 0.6].forEach(d => { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(an + d) * 13, by + Math.sin(an + d) * 13); c.stroke(); }); } } });
  const bandP = []; for (let i = 0; i <= 8; i++) { const k = 0.3 + 0.32 * i / 8; bandP.push(new THREE.Vector2(R(k) + 0.0025, k * H)); }
  const band = new THREE.Mesh(new THREE.LatheGeometry(bandP, 72), new THREE.MeshPhysicalMaterial({ map: bandT, roughness: 0.45, clearcoat: 0.6, side: THREE.DoubleSide })); band.castShadow = true; g.add(band);
  // slush body + mounded top
  const fillP = []; for (let i = 0; i <= 24; i++) { const k = i / 24; fillP.push(new THREE.Vector2(R(k * 0.95) - 0.008, k * H * 0.95)); }
  const sM = slushMat();
  const fill = new THREE.Mesh(new THREE.LatheGeometry(fillP, 64), sM); fill.position.y = 0.006; g.add(fill);
  const moundG = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), mp = moundG.attributes.position;
  for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i); mp.setY(i, y * (0.35 + 0.15 * noise3(x * 4, z * 4, 1))); }
  moundG.computeVertexNormals(); const mound = new THREE.Mesh(moundG, sM); g.add(mound);
  // dome lid and straw
  const lid = new THREE.Mesh(new THREE.SphereGeometry(r1 + 0.01, 64, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), cupM); lid.scale.y = 0.55; lid.position.y = H; lid.renderOrder = 4; g.add(lid);
  const strawT = canvasTex(64, 512, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff3b5c'; for (let i = -4; i < 24; i++) { c.beginPath(); c.moveTo(0, i * 28); c.lineTo(w, i * 28 + 26); c.lineTo(w, i * 28 + 40); c.lineTo(0, i * 28 + 14); c.fill(); } });
  const strawG = new THREE.Group(); g.add(strawG);
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1, 24, 1, true), new THREE.MeshPhysicalMaterial({ map: strawT, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false })); straw.renderOrder = 4; strawG.add(straw);
  const inStrawT = SLUSH_T.clone(); inStrawT.repeat.set(1, 6); inStrawT.needsUpdate = true;
  const inStraw = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 16), new THREE.MeshPhysicalMaterial({ map: inStrawT, roughness: 0.3, emissive: 0x0a3a90, emissiveIntensity: 0.4 })); strawG.add(inStraw);
  // condensation
  const N = 230, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false }), N);
  const r = rng(12), dm = new THREE.Object3D(), D = [];
  for (let i = 0; i < N; i++) { const k = 0.06 + r() * 0.8, a = r() * Math.PI * 2, s = 0.004 + Math.pow(r(), 3) * 0.012; D.push({ k, a, s, run: i < 5 ? 0.3 + r() * 0.5 : 0 }); }
  g.add(drops);
  const api = {
    level: 1,
    update(t, { level = 1, suck = 0, mouth = null, flow = 0 } = {}) {
      fill.scale.y = Math.max(0.02, level); mound.position.y = 0.006 + H * 0.95 * level; const rr = R(0.95 * level) - 0.01; mound.scale.set(rr, 0.12, rr);
      D.forEach((d, i) => { let k = d.k; if (d.run) k = d.k - ((t * d.run * 0.12 + i * 0.13) % 0.6); const rr2 = R(k) + d.s * 0.4; dm.position.set(Math.cos(d.a) * rr2, k * H, Math.sin(d.a) * rr2); dm.scale.set(d.s, d.s * (d.run ? 1.6 : 1.1), d.s * 0.5); dm.lookAt(0, k * H, 0); dm.updateMatrix(); drops.setMatrixAt(i, dm.matrix); });
      drops.instanceMatrix.needsUpdate = true;
      // straw from inside the cup up to the mouth (in cup space)
      const A = V(0.05, 0.06, 0.02), Bp = mouth ? mouth : V(-0.02, H + 0.45, 0.06);
      const len = A.distanceTo(Bp) + 0.02; strawG.position.copy(A.clone().add(Bp).multiplyScalar(0.5)); strawG.quaternion.setFromUnitVectors(V(0, 1, 0), Bp.clone().sub(A).normalize());
      straw.scale.y = len; const fillLen = len * clamp(suck); inStraw.scale.y = Math.max(0.001, fillLen); inStraw.position.y = -len / 2 + fillLen / 2; inStraw.visible = suck > 0.01;
      inStrawT.offset.y = -t * 2.2 * flow; SLUSH_T.offset.y = 0;
    },
  };
  g.userData = api; g.traverse(o => { if (o.isMesh && o !== cup && o !== lid) o.castShadow = true; });
  return g;
}

// ---------- boardwalk set ----------
const SUMMER_SKY = gradTex([[0, '#fff3dc'], [0.35, '#c4e8ff'], [0.72, '#63b6ef'], [1, '#2a7fd2']], 0.55, 1.12);
function waterMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0x1f8fb8, roughness: 0.12, metalness: 0.0, envMapIntensity: 1.2 });
  m.userData.uT = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = m.userData.uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; uniform float uT;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 q=vWP.xz;
        float h1=sin(q.x*1.7+uT*1.3)*cos(q.y*1.3-uT*0.9), h2=sin(q.x*4.1-q.y*3.3+uT*2.2), h3=sin(q.x*9.0+q.y*7.0-uT*3.1);
        vec3 pn=normalize(vec3(h1*0.18+h2*0.08+h3*0.04, 1.0, cos(q.y*1.9+uT)*0.15+h2*0.06));
        normal=normalize((viewMatrix*vec4(pn,0.)).xyz);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 cell=floor(vWP.xz*vec2(2.2,3.5)); float hsh=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453); vec2 f=fract(vWP.xz*vec2(2.2,3.5))-0.5;
        float tw=pow(max(0.,sin(uT*(3.0+hsh*5.0)+hsh*40.0)),8.0)*step(0.82,hsh); float gl=tw*exp(-dot(f,f)*90.0)*smoothstep(-70.0,-3.0,vWP.z);
        totalEmissiveRadiance+=vec3(3.0,2.9,2.5)*gl;`);
  };
  return m;
}
function seagull() {
  const g = new THREE.Group(), w = new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.6 }), gr = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: 0.6 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), w); b.scale.set(0.7, 0.7, 1.8); g.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), w); hd.position.set(0, 0.06, 0.28); g.add(hd);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0xffb21a })); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.05, 0.4); g.add(bk);
  const wings = [-1, 1].map(sx => { const p = new THREE.Group(); p.position.set(sx * 0.08, 0.04, 0); g.add(p); const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.015, 0.2), gr); m.position.x = sx * 0.31; p.add(m); const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.14), new THREE.MeshStandardMaterial({ color: 0x2a2e33 })); tip.position.x = sx * 0.66; p.add(tip); return { p, sx }; });
  g.userData.flap = (t) => wings.forEach(({ p, sx }) => p.rotation.z = sx * 0.55 * Math.sin(t * 9));
  return g;
}
function boardwalk(sc) {
  sc.background = SUMMER_SKY; sc.environment = ENV;
  const R = {};
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.9); sun.position.set(5, 9, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02; sun.userData.soft = 0.2; sc.add(sun); R.sun = sun;
  sc.add(new THREE.HemisphereLight(0xcfeaff, 0xc9a27a, 0.7));
  const rim = new THREE.DirectionalLight(0xfff4e0, 1.6); rim.position.set(-4, 5, -6); sc.add(rim);
  // deck
  const plankT = woodTex('#b98a5e', '#6a4728', 51, [1, 6], 8);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(24, 0.25, 6.4), new THREE.MeshStandardMaterial({ map: plankT, bumpMap: plankT, bumpScale: 1.2, roughness: 0.75 })); deck.position.set(0, -0.125, 1.2); deck.receiveShadow = true; sc.add(deck);
  plankT.rotation = Math.PI / 2;
  // railing behind the hero
  const paint = new THREE.MeshStandardMaterial({ color: 0xf7f3ea, roughness: 0.45 });
  for (let i = -12; i <= 12; i++) { const pst = new THREE.Mesh(new RoundedBoxGeometry(0.14, 1.5, 0.14, 2, 0.03), paint); pst.position.set(i * 1.0, 0.75, -1.75); pst.castShadow = pst.receiveShadow = true; sc.add(pst); }
  [0.55, 1.05, 1.5].forEach((y, k) => { const rl = new THREE.Mesh(new RoundedBoxGeometry(24, k === 2 ? 0.1 : 0.07, k === 2 ? 0.2 : 0.07, 2, 0.02), paint); rl.position.set(0, y, -1.75); rl.castShadow = true; sc.add(rl); });
  // sea, far shore, sky
  const wm = waterMat(); const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 200), wm); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -1.6, -100); sc.add(sea); R.water = wm;
  const hill = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshStandardMaterial({ color: 0x6aa57a, roughness: 1 })); hill.scale.set(2.2, 0.28, 1); hill.position.set(-60, -2, -150); sc.add(hill);
  const hill2 = hill.clone(); hill2.position.set(40, -3, -170); hill2.scale.set(1.8, 0.22, 1); sc.add(hill2);
  for (let i = 0; i < 6; i++) { const c = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.35 }); for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(2 + (k % 3), 16, 12), m); s.position.set(k * 2.6 - 6, Math.sin(k * 1.7) * 1.2, 0); s.scale.y = 0.6; c.add(s); } c.position.set(-60 + i * 26, 18 + (i % 3) * 5, -140); sc.add(c); }
  const sail = new THREE.Group(); const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff })); sail.add(hull); const sl = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 3), new THREE.MeshStandardMaterial({ color: 0xfff4e8 })); sl.position.y = 1.5; sl.scale.z = 0.08; sail.add(sl); sail.position.set(14, -1.4, -60); sc.add(sail); R.sail = sail;
  // slush cart with striped awning and two spinning tanks
  const cart = new THREE.Group(); cart.position.set(-3.4, 0, -0.6); cart.rotation.y = 0.45; sc.add(cart); R.cart = cart;
  const cartM = new THREE.MeshStandardMaterial({ color: 0x3fb6e8, roughness: 0.4 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.4, 1.3, 1.1, 3, 0.06), cartM); body.position.y = 0.95; body.castShadow = true; cart.add(body);
  const top = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.1, 1.25, 2, 0.03), paint); top.position.y = 1.65; cart.add(top);
  const stripeT = canvasTex(512, 128, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#ff4a5c'; c.fillRect(i * 32, 0, 32, h); } c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, h - 18, w, 18); });
  const aw = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.8, 32, 1, true, -Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ map: stripeT, side: THREE.DoubleSide, roughness: 0.7 })); aw.rotation.z = Math.PI / 2; aw.position.set(0, 2.9, -0.2); aw.castShadow = true; cart.add(aw);
  [-1.25, 1.25].forEach(x => { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 12), M.chrome); pl.position.set(x, 2.35, 0.45); cart.add(pl); });
  const tanks = [0x2f8fff, 0xff3a5a].map((col, i) => { const tg = new THREE.Group(); tg.position.set(-0.45 + i * 0.9, 1.7, 0.05); cart.add(tg); const glass = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.5), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.25, depthWrite: false })); glass.position.y = 0.36; tg.add(glass); const sl2 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.5, 0.46), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.35, emissive: col, emissiveIntensity: 0.25 })); sl2.position.y = 0.27; tg.add(sl2); const aug = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), M.chrome); aug.rotation.z = Math.PI / 2; aug.position.y = 0.32; tg.add(aug); const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.2), M.chrome); aug.add(blade); return blade; });
  R.tanks = tanks;
  const sign = textPlane('SLUSH', 1.6, '#ffffff', '#1a5fd0'); sign.position.set(0, 2.55, 0.62); sign.userData.dofMap = sign.material.map; cart.add(sign);
  const gull = seagull(); sc.add(gull); R.gull = gull;
  R.update = (t) => { wm.userData.uT.value = t; tanks.forEach((b, i) => b.rotation.x = t * (4 + i)); gull.userData.flap(t); sail.position.x = 14 - t * 0.15; };
  return R;
}
