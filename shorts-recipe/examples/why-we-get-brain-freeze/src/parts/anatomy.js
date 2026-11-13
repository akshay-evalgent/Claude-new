// =====================================================================
// ANATOMY: the roof of the mouth up close, and a cutaway head
// =====================================================================
function nerveMat(base = 0xffc23a, hot = 0xfff4c8) {
  return new THREE.ShaderMaterial({
    uniforms: { base: { value: new THREE.Color(base) }, hot: { value: new THREE.Color(hot) }, uT: { value: 0 }, on: { value: 0 }, front: { value: 0 }, speed: { value: 1.6 }, dens: { value: 4 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 base; uniform vec3 hot; uniform float uT; uniform float on; uniform float front; uniform float speed; uniform float dens; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float x=vUv.x; float lit=smoothstep(front,front-0.08,x); float ph=fract(x*dens-uT*speed); float q=(ph-0.5)/0.07; float pulse=exp(-q*q)*lit;
        float rimf=pow(max(0.,1.-abs(dot(normalize(vN),normalize(vV)))),1.3); vec3 c=base*(0.25+0.75*rimf)*(0.35+0.65*on*lit+0.25) + hot*(pulse*2.6+exp(-((x-front)/0.025)*((x-front)/0.025))*3.0)*on;
        gl_FragColor=vec4(c,1.); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
}
// blood vessel: radial swell, flowing cells, cold (dark, slow) and heat (bright)
function vesselMat(base = 0xb3182a, r = 0.016) {
  const m = new THREE.MeshPhysicalMaterial({ color: base, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x7a0612, emissiveIntensity: 1 });
  const U = { uSwell: { value: 0 }, uT: { value: 0 }, uFlow: { value: 1 }, uHeat: { value: 0 }, uCold: { value: 0 } };
  m.userData.U = U; m.userData.r = r;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSwell; varying vec2 vUv2;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUv2 = uv; transformed += normal * uSwell;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uFlow; uniform float uHeat; uniform float uCold; varying vec2 vUv2;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22,0.1,0.28), uCold*0.75);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float cells = pow(0.5 + 0.5*sin(vUv2.x*70.0 - uT*uFlow*10.0), 3.0);
        totalEmissiveRadiance = totalEmissiveRadiance*(1.0-uCold*0.85)*(0.75 + 0.35*cells) + vec3(1.15,0.07,0.06)*uHeat*(0.8+0.3*cells);`);
  };
  m.userData.set = (t, swell, { flow = 1, heat = 0, cold = 0 } = {}) => { U.uT.value = t; U.uSwell.value = swell * r; U.uFlow.value = flow; U.uHeat.value = heat; U.uCold.value = cold; };
  return m;
}
const MUCOSA_B = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); const r = rng(14); for (let i = 0; i < 1600; i++) { g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(r() * w, r() * h, 0.6 + r() * 2.2, 0, 7); g.fill(); } }, { rep: [4, 4], srgb: false });

// ---------- the roof of the mouth, seen from inside the mouth ----------
function palateSet(sc) {
  sc.background = new THREE.Color(0x140305); sc.environment = tintedEnv(0.55, 0.38, 0.38);
  const R = {};
  const wxz = z => 0.62 - 0.2 * Math.pow(Math.max(z, 0) / 1.45, 2.2);
  const Hh = (u, z) => { const arch = Math.sqrt(Math.max(0, 1 - u * u)), front = 1 - smooth(1.05, 1.5, z) * 0.85, back = smooth(-0.1, 0.25, z);
    let y = 0.4 * arch * front * (0.75 + 0.25 * back);
    const rz = (z - 0.85) / 0.5; if (rz > 0 && rz < 1) y -= 0.02 * Math.pow(Math.max(0, Math.sin((z - 0.85) * 30 + 0.9 * Math.sin(u * 3.2))), 2) * (1 - u * u) * Math.sin(Math.PI * rz);
    y -= 0.009 * Math.exp(-((u / 0.05) ** 2)) * (z < 1.25 ? 1 : 0);
    y -= 0.035 * Math.exp(-((u * 0.6) ** 2 + (z - 1.3) ** 2) / 0.003);
    return y + 0.004 * noise3(u * 9, z * 9, 2); };
  const SP = (u, z) => V(u * wxz(z) * 1.05, Hh(u, z), z);
  const NX = 110, NZ = 140, geo = new THREE.PlaneGeometry(1, 1, NX, NZ), pa = geo.attributes.position, uva = geo.attributes.uv;
  for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const u = -1 + 2 * i / NX, z = -0.05 + 1.55 * j / NZ, p = SP(u, z); pa.setXYZ(j * (NX + 1) + i, p.x, p.y, p.z); uva.setXY(j * (NX + 1) + i, (p.x + 0.66) / 1.32, (p.z + 0.05) / 1.55); }
  geo.computeVertexNormals();
  const mucM = new THREE.MeshPhysicalMaterial({ color: 0xe17a86, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.5, sheenColor: new THREE.Color(0xffc4cc), bumpMap: MUCOSA_B, bumpScale: 0.8, emissive: 0x2a0408, side: THREE.DoubleSide });
  const roof = new THREE.Mesh(geo, mucM); roof.receiveShadow = true; sc.add(roof); R.mucM = mucM; R.baseCol = mucM.color.clone();
  // frost layer just under the surface
  const fm = frostMat(frostTex(11)); fm.uniforms.tint.value.set(1.2, 1.4, 1.7); fm.fragmentShader = fm.fragmentShader.replace('float d=distance(vUv,vec2(0.5));', 'float d=distance(vUv,vec2(0.5,0.5))*1.15;');
  const fg = geo.clone(), fpa = fg.attributes.position; for (let i = 0; i < fpa.count; i++) fpa.setY(i, fpa.getY(i) - 0.004); const frost = new THREE.Mesh(fg, fm); frost.renderOrder = 4; sc.add(frost); R.frost = fm;
  // teeth along the arch
  const toothM = new THREE.MeshPhysicalMaterial({ color: 0xfff8ee, roughness: 0.18, clearcoat: 1, sheen: 0.3 });
  const gumM = new THREE.MeshPhysicalMaterial({ color: 0xd8667a, roughness: 0.3, clearcoat: 1 });
  for (let k = 0; k < 14; k++) {
    const a = -1 + 2 * k / 13, side = Math.sign(a) || 1, z = 1.42 - Math.pow(Math.abs(a), 1.6) * 1.25, x = side * wxz(z) * 1.1 * Math.min(1, Math.abs(a) * 1.6 + 0.25);
    const molar = Math.abs(a) > 0.55, w = molar ? 0.15 : 0.1, d = molar ? 0.15 : 0.07;
    const tooth = new THREE.Mesh(new RoundedBoxGeometry(w, 0.2, d, 3, 0.04), toothM); tooth.position.set(x, -0.1, z); tooth.lookAt(0, -0.08, 0.3); tooth.visible = false; sc.add(tooth);
  }
  { const pts = []; for (let k = 0; k <= 40; k++) { const a = -1 + 2 * k / 40, side = Math.sign(a) || 1, z = 1.42 - Math.pow(Math.abs(a), 1.6) * 1.25; pts.push(V(side * wxz(z) * 1.1 * Math.min(1, Math.abs(a) * 1.6 + 0.25), 0.0, z)); }
    const ridge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.06, 16), gumM); ridge.scale.y = 0.7; sc.add(ridge); }
  // vessels lying on the surface
  const mats = { main: vesselMat(0xb3182a, 0.017), br: vesselMat(0xa8162a, 0.009), cap: vesselMat(0x9a1430, 0.005) }; R.vmats = mats;
  const r = rng(21), tube = (pts, rad, m) => { const c = new THREE.CatmullRomCurve3(pts.map(([u, z]) => SP(u, z).add(V(0, -0.006 - rad * 0.4, 0)))); const t = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 12), rad, 10), m); t.castShadow = true; sc.add(t); };
  [-1, 1].forEach(sd => {
    const main = []; for (let k = 0; k <= 10; k++) { const z = 0.08 + k * 0.12; main.push([sd * (0.72 - 0.06 * Math.sin(k * 0.9)), z]); } tube(main, 0.017, mats.main);
    for (let k = 1; k <= 9; k++) {
      const z0 = 0.08 + k * 0.12, br = []; let u = sd * 0.7, z = z0; for (let s = 0; s < 6; s++) { br.push([u, z]); u -= sd * (0.08 + r() * 0.04); z += 0.02 + (r() - 0.3) * 0.05; }
      tube(br, 0.009, mats.br);
      for (let c2 = 0; c2 < 3; c2++) { const s0 = 1 + Math.floor(r() * 4), cp = []; let cu = br[s0][0], cz = br[s0][1]; const dir = r() < 0.5 ? 1 : -1; for (let s = 0; s < 5; s++) { cp.push([cu, cz]); cu -= sd * 0.035 * r(); cz += dir * (0.025 + r() * 0.02); } tube(cp, 0.005, mats.cap); }
    }
  });
  // icy slush pressed against the roof
  const blobG = new THREE.SphereGeometry(1, 64, 40), bp = blobG.attributes.position;
  for (let i = 0; i < bp.count; i++) { const v = V(bp.getX(i), bp.getY(i), bp.getZ(i)); const k = 1 + 0.18 * noise3(v.x * 3, v.y * 3, v.z * 3) + 0.06 * noise3(v.x * 9, v.y * 9, v.z * 9); bp.setXYZ(i, v.x * k, v.y * k, v.z * k); }
  blobG.computeVertexNormals();
  const blob = new THREE.Mesh(blobG, slushMat()); blob.scale.set(0.15, 0.09, 0.13); blob.castShadow = true; sc.add(blob); R.blob = blob;
  const crys = []; for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.006 + r() * 0.006), new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, roughness: 0.05, clearcoat: 1, emissive: 0x3a6aa0 })); sc.add(m); crys.push([m, r() * 6.28, r(), r()]); } R.crys = crys;
  const mist = []; for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05 + r() * 0.06, 12, 8), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.0, depthWrite: false })); sc.add(m); mist.push([m, r() * 6.28, r(), r()]); } R.mist = mist;
  // lights: warm light from the lips, a soft fill, a red bounce from the tongue
  const key = new THREE.SpotLight(0xffe2d0, 40, 8, 0.9, 0.8, 2); key.position.set(0.5, -0.9, 2.6); key.target.position.set(0, 0.2, 0.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.userData.soft = 0.15; sc.add(key, key.target);
  const fill = new THREE.PointLight(0xffb0a0, 3, 6, 2); fill.position.set(-0.6, -0.8, 0.4); sc.add(fill);
  const bounce = new THREE.PointLight(0xff4050, 4, 4, 2); bounce.position.set(0, -1.0, 0.8); sc.add(bounce); R.bounce = bounce;
  R.SP = SP;
  R.update = (t, { swell = 0, flow = 1, heat = 0, cold = 0, frostR = 0, frostOp = 1, blobOn = 1, flush = 0 } = {}) => {
    Object.values(mats).forEach(m => m.userData.set(t, swell, { flow, heat, cold }));
    fm.uniforms.uR.value = frostR; fm.uniforms.uOp.value = frostOp;
    mucM.color.copy(R.baseCol).lerp(new THREE.Color(0xc8d8f0), 0.45 * cold).lerp(new THREE.Color(0xff5060), 0.35 * flush);
    mucM.emissive.setRGB(0.16 * flush + 0.02, 0.02, 0.03 + 0.08 * cold);
    const c = SP(0, 0.95); blob.position.set(c.x, c.y - 0.1 + 0.01 * Math.sin(t * 3), c.z); blob.visible = blobOn > 0.01; blob.scale.set(0.15, 0.09 * blobOn + 0.0001, 0.13);
    crys.forEach(([m, a, k, s]) => { const rr = 0.14 + k * 0.14; m.position.set(c.x + Math.cos(a + t * 0.2) * rr, c.y - 0.08 - s * 0.12 + 0.01 * Math.sin(t * 2 + a), c.z + Math.sin(a + t * 0.2) * rr * 0.8); m.rotation.set(t + a, t * 0.7, a); m.visible = blobOn > 0.5; });
    mist.forEach(([m, a, k, s]) => { const age = (t * 0.25 + k) % 1; m.position.set(c.x + Math.cos(a) * (0.2 + age * 0.4), c.y - 0.25 - age * 0.3, c.z + Math.sin(a) * (0.2 + age * 0.3)); m.scale.setScalar(0.6 + age * 1.6); m.material.opacity = 0.16 * Math.sin(Math.PI * age) * cold; });
    bounce.intensity = 3 + 5 * heat;
  };
  return R;
}

// ---------- a cutaway head (sagittal section), like an anatomy model ----------
function cr1(pts, y) {
  if (y <= pts[0][0]) return pts[0][1]; if (y >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  let i = 0; while (pts[i + 1][0] < y) i++;
  const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)], t = (y - p1[0]) / (p2[0] - p1[0]), t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
}
const gss = (y, c, w) => Math.exp(-(((y - c) / w) ** 2));
const HFACE = [[-1.6, 0.3], [-1.2, 0.31], [-1.03, 0.36], [-0.95, 0.52], [-0.86, 0.72], [-0.72, 0.78], [-0.5, 0.8], [-0.3, 0.8], [0.0, 0.8], [0.2, 0.79], [0.35, 0.8], [0.6, 0.73], [0.8, 0.58], [0.95, 0.36], [1.04, 0.1], [1.08, -0.15]];
const HBACK = [[-1.6, -0.46], [-1.0, -0.5], [-0.75, -0.56], [-0.55, -0.76], [-0.3, -0.93], [0.0, -1.02], [0.35, -1.0], [0.7, -0.86], [0.95, -0.58], [1.04, -0.35], [1.08, -0.15]];
const HW = [[-1.6, 0.4], [-1.0, 0.42], [-0.8, 0.5], [-0.5, 0.6], [-0.2, 0.66], [0.2, 0.72], [0.5, 0.7], [0.8, 0.55], [0.95, 0.38], [1.04, 0.2], [1.08, 0.02]];
const hDet = y => {
  const nb = y > -0.2 ? Math.max(0, 1 - (y + 0.2) / 0.36) ** 1.15 * (y < 0.16 ? 1 : 0) : Math.max(0, 1 - ((-0.2 - y) / 0.11) ** 2);
  return 0.27 * nb - 0.03 * gss(y, 0.17, 0.05) + 0.035 * gss(y, 0.3, 0.07) + 0.075 * gss(y, -0.42, 0.045) - 0.02 * gss(y, -0.5, 0.02) + 0.065 * gss(y, -0.585, 0.045) - 0.025 * gss(y, -0.68, 0.035) + 0.05 * gss(y, -0.84, 0.07);
};
const hFront = y => cr1(HFACE, y) + hDet(y), hBack = y => cr1(HBACK, y);
function headOutline(n = 220) {
  const pts = []; for (let i = 0; i <= n; i++) { const y = -1.6 + 2.68 * i / n; pts.push([hFront(y), y]); }
  for (let i = n - 1; i > 0; i--) { const y = -1.6 + 2.68 * i / n; pts.push([hBack(y), y]); }
  return pts;
}
function offsetPoly(P, d) {
  const n = P.length; return P.map((p, i) => { const a = P[(i - 1 + n) % n], b = P[(i + 1) % n]; const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]]; const n1 = [-e1[1], e1[0]], n2 = [-e2[1], e2[0]]; const l1 = Math.hypot(...n1) || 1, l2 = Math.hypot(...n2) || 1; let nx = n1[0] / l1 + n2[0] / l2, ny = n1[1] / l1 + n2[1] / l2; const l = Math.hypot(nx, ny) || 1; return [p[0] + nx / l * d, p[1] + ny / l * d]; });
}
const SKULL_BASE = [[-1.0, -0.44], [-0.62, -0.4], [-0.36, -0.3], [-0.12, -0.16], [0.18, -0.05], [0.45, 0.04], [0.7, 0.11], [0.9, 0.14]];
const baseAt = (x, lift = 0) => { const P = SKULL_BASE; if (x <= P[0][0]) return P[0][1] + lift; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const k = (x - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return lerp(P[i - 1][1], P[i][1], k) + lift; } return P[P.length - 1][1] + lift; };
function cranial(off, lift) {
  const P = offsetPoly(headOutline(220), off); const sel = P.filter(([x, y]) => y > baseAt(x, lift));
  const base = []; for (let k = 0; k <= 30; k++) { const x = lerp(sel[sel.length - 1][0], sel[0][0], k / 30); base.push([x, baseAt(x, lift)]); }
  return sel.concat(base);
}
function shapeOf(pts, smoothIt = false) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  if (smoothIt) s.splineThru(pts.slice(1).concat([pts[0]]).map(p => new THREE.Vector2(p[0], p[1]))); else pts.slice(1).forEach(p => s.lineTo(p[0], p[1]));
  s.closePath(); return s;
}
function ellipsePts(cx, cy, rx, ry, rot = 0, n = 40) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return o; }
const GYRI = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); const r = rng(31); g.lineCap = 'round';
  for (let i = 0; i < 140; i++) { let x = r() * w, y = r() * h, a = r() * 6.28; g.strokeStyle = 'rgba(40,40,40,0.75)'; g.lineWidth = 3 + r() * 3; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 14; k++) { a += (r() - 0.5) * 1.6; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke(); } }, { rep: [2.5, 2.5], srgb: false });
const FOLIA = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(30,30,30,0.8)'; g.lineWidth = 2; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(w * 0.3, h * 0.5, 30 + i * 9, 18 + i * 6, 0, -1.3, 1.3); g.stroke(); } }, { rep: [1.5, 1.5], srgb: false });
const BONE_B = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#909090'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(30,30,30,0.5)'; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 2.4, 0, 7); g.fill(); } }, { rep: [4, 4], srgb: false });
function cutawayHead(sc, { skin = 0xe2a27e } = {}) {
  const G = new THREE.Group(); sc.add(G); const R = { G };
  // exterior: the profile swept back into a rounded half head
  const NY = 140, NT = 80, geo = new THREE.PlaneGeometry(1, 1, NT, NY), pa = geo.attributes.position;
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NT; i++) {
    const y = -1.6 + 2.68 * (1 - j / NY), th = Math.PI * i / NT, xf = cr1(HFACE, y), xb = hBack(y), xc = (xf + xb) / 2, a = (xf - xb) / 2, b = cr1(HW, y);
    pa.setXYZ(j * (NT + 1) + i, xc + a * Math.cos(th) + hDet(y) * Math.exp(-((th / 0.2) ** 2)), y, -b * Math.sin(th));
  }
  geo.computeVertexNormals();
  const skinM = new THREE.MeshPhysicalMaterial({ color: skin, roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color(0xffd2c0), sheenRoughness: 0.45, clearcoat: 0.12, side: THREE.DoubleSide });
  const ext = new THREE.Mesh(geo, skinM); ext.castShadow = ext.receiveShadow = true; G.add(ext); R.skinM = skinM;
  const eyeY = 0.2, eyeX = cr1(HFACE, eyeY) - 0.1;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), skinM); eye.position.set(eyeX, eyeY, -0.3); eye.rotation.set(0, 0, -Math.PI / 2); G.add(eye);
  const lash = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.007, 6, 30, Math.PI), new THREE.MeshStandardMaterial({ color: 0x24160f })); lash.position.copy(eye.position); lash.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.3); G.add(lash);
  const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.16, 4, 10), new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.8 })); brow.position.set(eyeX + 0.02, 0.36, -0.3); brow.rotation.set(0, 0.5, Math.PI / 2 - 0.2); G.add(brow);
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), skinM); ear.scale.set(0.55, 1, 0.3); ear.position.set(-0.32, 0.02, -cr1(HW, 0.02) + 0.02); G.add(ear);
  // the cut face, built from raised layers
  const layer = (pts, color, z, opt = {}) => {
    const m = opt.mat || new THREE.MeshPhysicalMaterial({ color, roughness: opt.rough ?? 0.5, clearcoat: opt.coat ?? 0.3, clearcoatRoughness: 0.3, bumpMap: opt.bump || null, bumpScale: opt.bumpS ?? 1, sheen: opt.sheen ?? 0, emissive: opt.emissive ?? 0x000000 });
    if (!opt.noOutline) { const oc = new THREE.Color(color || (opt.mat && opt.mat.color) || 0x888888).multiplyScalar(0.55); const og = new THREE.ExtrudeGeometry(shapeOf(offsetPoly(pts, -0.007), opt.smooth), { depth: 0.008, bevelEnabled: false, curveSegments: 48 }); const om = new THREE.Mesh(og, new THREE.MeshStandardMaterial({ color: oc, roughness: 0.6 })); om.position.z = z - 0.016; G.add(om); }
    const g2 = new THREE.ExtrudeGeometry(shapeOf(pts, opt.smooth), { depth: 0.01, bevelEnabled: true, bevelThickness: 0.008, bevelSize: opt.bevel ?? 0.007, bevelSegments: 3, curveSegments: 48 });
    // planar UVs so bump textures sit right on the cut face
    const p2 = g2.attributes.position, u2 = g2.attributes.uv; for (let i = 0; i < p2.count; i++) u2.setXY(i, p2.getX(i) * 0.9, p2.getY(i) * 0.9);
    const mesh = new THREE.Mesh(g2, m); mesh.position.z = z - 0.014; mesh.castShadow = false; mesh.receiveShadow = true; G.add(mesh); return mesh;
  };
  const OUT = headOutline(220);
  layer(OUT, 0xd38a7c, 0.0, { rough: 0.55, coat: 0.25, bump: MUCOSA_B, bumpS: 0.6, noOutline: true });
  layer(cranial(0.045, -0.02), 0xefe2c6, 0.008, { bump: BONE_B, bumpS: 0.8, rough: 0.6 });
  R.brain = layer(cranial(0.13, 0.06), 0xeeb0ba, 0.016, { bump: GYRI, bumpS: 2.2, rough: 0.45, coat: 0.5, smooth: false });
  layer(ellipsePts(-0.62, -0.2, 0.25, 0.16, 0.25), 0xd88e9e, 0.02, { bump: FOLIA, bumpS: 1.6, rough: 0.45, coat: 0.5 });
  layer([[-0.36, 0.5], [0.0, 0.58], [0.34, 0.47], [0.36, 0.41], [0.0, 0.5], [-0.34, 0.43]], 0xfff1e8, 0.022, { smooth: true });
  layer(ellipsePts(0.0, 0.34, 0.26, 0.06, 0.05), 0x7a3040, 0.018);
  layer([[-0.12, 0.08], [0.02, 0.0], [-0.08, -0.25], [-0.2, -0.5], [-0.3, -0.9], [-0.36, -1.6], [-0.44, -1.6], [-0.4, -0.9], [-0.32, -0.5], [-0.26, -0.2], [-0.24, 0.05]], 0xf2d2a6, 0.022, { smooth: false, rough: 0.5 });
  for (let k = 0; k < 7; k++) { const y = -0.56 - k * 0.15; layer([[-0.06 - k * 0.012, y], [-0.26 - k * 0.012, y - 0.01], [-0.27 - k * 0.012, y - 0.12], [-0.07 - k * 0.012, y - 0.115]], 0xefe2c6, 0.014, { bump: BONE_B, bumpS: 0.8, bevel: 0.01 }); layer([[-0.07 - k * 0.012, y - 0.118], [-0.26 - k * 0.012, y - 0.125], [-0.26 - k * 0.012, y - 0.142], [-0.07 - k * 0.012, y - 0.137]], 0xbcd0e2, 0.012); }
  layer([[0.95, -0.27], [0.86, -0.06], [0.74, 0.1], [0.55, 0.13], [0.3, 0.07], [0.1, -0.04], [0.02, -0.18], [0.0, -0.3], [0.2, -0.29], [0.5, -0.285], [0.82, -0.29]], 0x3a0a12, 0.004, { rough: 0.7, coat: 0.6 });
  [[0.45, 0.04, 0.24, 0.035, -0.05], [0.42, -0.09, 0.28, 0.042, -0.04], [0.4, -0.21, 0.3, 0.036, -0.02]].forEach(([x, y, a, b, r]) => layer(ellipsePts(x, y, a, b, r), 0xe07080, 0.012, { rough: 0.3, coat: 1 }));
  layer(ellipsePts(0.62, 0.3, 0.06, 0.035, 0.6), 0x3a0a12, 0.012);
  layer([[0.0, -0.28], [0.12, -0.36], [0.14, -0.6], [0.17, -0.9], [0.22, -1.6], [0.02, -1.6], [-0.03, -0.9], [-0.06, -0.5], [-0.08, -0.32]], 0x3a0a12, 0.004, { rough: 0.7, coat: 0.6 });
  layer([[0.87, -0.37], [0.6, -0.395], [0.3, -0.385], [0.12, -0.47], [0.08, -0.6], [0.3, -0.58], [0.6, -0.52], [0.86, -0.51]], 0x3a0a12, 0.004, { rough: 0.7, coat: 0.6 });
  R.palateM = new THREE.MeshPhysicalMaterial({ color: 0xe07482, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12, emissive: 0x000000 });
  layer([[0.86, -0.3], [0.86, -0.36], [0.5, -0.378], [0.22, -0.365], [0.16, -0.335], [0.22, -0.303], [0.5, -0.297]], 0, 0.022, { mat: R.palateM });
  layer([[0.84, -0.322], [0.5, -0.338], [0.24, -0.333], [0.24, -0.318], [0.5, -0.318], [0.84, -0.31]], 0xefe2c6, 0.026, { bevel: 0.002 });
  layer([[0.2, -0.31], [0.12, -0.36], [0.06, -0.42], [0.035, -0.48], [0.055, -0.49], [0.09, -0.44], [0.16, -0.39], [0.22, -0.36]], 0, 0.022, { mat: R.palateM, smooth: true });
  layer([[0.835, -0.31], [0.875, -0.34], [0.87, -0.455], [0.85, -0.47], [0.825, -0.41]], 0xfffaf0, 0.026, { rough: 0.15, coat: 1 });
  layer([[0.82, -0.6], [0.85, -0.55], [0.86, -0.48], [0.84, -0.475], [0.81, -0.55]], 0xfffaf0, 0.026, { rough: 0.15, coat: 1 });
  layer([[0.8, -0.58], [0.85, -0.66], [0.87, -0.82], [0.8, -0.9], [0.6, -0.93], [0.5, -0.85], [0.62, -0.73], [0.74, -0.63]], 0xefe2c6, 0.012, { bump: BONE_B, bumpS: 0.8, smooth: true });
  layer([[0.87, -0.35], [0.95, -0.39], [0.97, -0.45], [0.9, -0.49], [0.86, -0.46]], 0xd0606a, 0.012, { smooth: true, rough: 0.3, coat: 0.8 });
  layer([[0.86, -0.52], [0.95, -0.55], [0.94, -0.62], [0.86, -0.62]], 0xd0606a, 0.012, { smooth: true, rough: 0.3, coat: 0.8 });
  // tongue: rebuilt every frame so it can rise and press the palate
  const tongueM = new THREE.MeshPhysicalMaterial({ color: 0xd85a6a, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, bumpMap: MUCOSA_B, bumpScale: 1.2, sheen: 0.4, sheenColor: new THREE.Color(0xffb0b8) });
  const tongue = new THREE.Mesh(new THREE.BufferGeometry(), tongueM); tongue.position.z = 0.03 - 0.014; G.add(tongue); R.tongueM = tongueM;
  R.setTongue = (press = 0) => {
    const top = (x) => lerp(-0.425 - 0.03 * Math.sin((x - 0.15) * 4), -0.386, press * smooth(0.12, 0.3, x) * (1 - smooth(0.72, 0.8, x)));
    const pts = [[0.78, -0.47], [0.7, top(0.7) - 0.01], [0.6, top(0.6)], [0.48, top(0.48)], [0.36, top(0.36)], [0.24, top(0.24) - 0.02 * (1 - press)], [0.14, -0.5], [0.09, -0.62], [0.12, -0.78], [0.3, -0.86], [0.55, -0.76], [0.72, -0.58]];
    const g2 = new THREE.ExtrudeGeometry(shapeOf(pts, true), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 40 });
    const p2 = g2.attributes.position, u2 = g2.attributes.uv; for (let i = 0; i < p2.count; i++) u2.setXY(i, p2.getX(i) * 1.2, p2.getY(i) * 1.2);
    tongue.geometry.dispose(); tongue.geometry = g2;
  };
  R.setTongue(0);
  // the slush in the mouth
  const blobG = new THREE.SphereGeometry(1, 48, 24), bp = blobG.attributes.position; for (let i = 0; i < bp.count; i++) { const v = V(bp.getX(i), bp.getY(i), bp.getZ(i)); const k = 1 + 0.15 * noise3(v.x * 3, v.y * 3, v.z * 3); bp.setXYZ(i, v.x * k, v.y * k, v.z * k); } blobG.computeVertexNormals();
  const slush = new THREE.Mesh(blobG, slushMat()); slush.scale.set(0.2, 0.045, 0.05); slush.position.set(0.56, -0.405, 0.045); G.add(slush); R.slush = slush;
  // vessels along the palate, in the section
  R.vm = vesselMat(0xb3182a, 0.008);
  [[[0.8, -0.355], [0.6, -0.362], [0.4, -0.36], [0.24, -0.35]], [[0.78, -0.365], [0.55, -0.37], [0.3, -0.365]]].forEach(pts => { const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => V(x, y, 0.04))); G.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.008, 8), R.vm)); });
  // the trigeminal path: palate -> ganglion -> trigeminal ganglion -> over the eye -> forehead
  R.nm = nerveMat(); R.nmFaint = nerveMat(0xb08a30); R.nmFaint.uniforms.dens.value = 3;
  const path = [V(0.52, -0.33, 0.055), V(0.4, -0.22, 0.055), V(0.3, -0.13, 0.055), V(0.12, -0.05, 0.055), V(0.0, 0.0, 0.055), V(0.18, 0.12, 0.055), V(0.45, 0.2, 0.055), V(0.7, 0.26, 0.055), V(0.8, 0.34, 0.055), V(0.79, 0.48, 0.055), V(0.72, 0.62, 0.055)];
  R.nerveCurve = new THREE.CatmullRomCurve3(path);
  G.add(new THREE.Mesh(new THREE.TubeGeometry(R.nerveCurve, 160, 0.014, 10), R.nm));
  [[V(0.0, 0.0, 0.05), V(0.2, -0.2, 0.05), V(0.5, -0.5, 0.05), V(0.75, -0.62, 0.05)], [V(0.0, 0.0, 0.05), V(0.3, -0.1, 0.05), V(0.62, -0.08, 0.05), V(0.85, -0.1, 0.05)]].forEach(p => G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 60, 0.008, 8), R.nmFaint)));
  const gang = [[0.4, -0.22, 0.03], [0.0, 0.0, 0.045]].map(([x, y, r]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0xffd060, emissive: 0x8a5a00, roughness: 0.3, clearcoat: 1 })); m.position.set(x, y, 0.055); m.scale.z = 0.5; G.add(m); return m; }); R.gang = gang;
  // pain at the forehead, cold at the palate
  R.pain = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 20), glow(0xff3a20, 0)); R.pain.position.set(0.68, 0.54, 0.06); R.pain.scale.z = 0.3; G.add(R.pain);
  R.coldGlow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20), glow(0x5ab8ff, 0)); R.coldGlow.position.set(0.55, -0.36, 0.06); R.coldGlow.scale.set(1.4, 0.35, 0.3); G.add(R.coldGlow);
  R.warmGlow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 20), glow(0xff8a30, 0)); R.warmGlow.position.set(0.5, -0.37, 0.06); R.warmGlow.scale.set(1.5, 0.35, 0.3); G.add(R.warmGlow);
  const crk = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48), frostMat(frostTex(19))); crk.material.uniforms.tint.value.set(2.2, 0.8, 0.5); crk.position.set(0.68, 0.54, 0.064); G.add(crk); R.crack = crk.material;
  R.palCol = R.palateM.color.clone();
  R.update = (t, { cold = 0, warm = 0, swell = 0, heat = 0, nerve = 0, front = 0, pain = 0, press = 0, slushOn = 1 } = {}) => {
    R.palateM.color.copy(R.palCol).lerp(new THREE.Color(0xd8e8ff), 0.6 * cold).lerp(new THREE.Color(0xff6a4a), 0.3 * warm);
    R.palateM.emissive.setRGB(0.05 * warm + 0.08 * heat, 0.02 * warm, 0.12 * cold);
    R.coldGlow.material.opacity = 0.55 * cold * (0.85 + 0.15 * Math.sin(t * 5)); R.warmGlow.material.opacity = 0.6 * warm;
    R.vm.userData.set(t, swell, { flow: 1 + heat, heat, cold });
    [R.nm, R.nmFaint].forEach(m => { m.uniforms.uT.value = t; m.uniforms.on.value = nerve; m.uniforms.front.value = front; }); R.nmFaint.uniforms.on.value = nerve * 0.25;
    gang.forEach((g2, i) => g2.material.emissive.setRGB(0.55 + 2.5 * nerve * (front > (i ? 0.45 : 0.18) ? 1 : 0), 0.35 + 1.3 * nerve * (front > (i ? 0.45 : 0.18) ? 1 : 0), 0));
    R.pain.material.opacity = 0.85 * pain * (0.8 + 0.2 * Math.sin(t * 14)); R.pain.scale.set(0.8 + 0.4 * pain, 0.8 + 0.4 * pain, 0.3);
    R.crack.uniforms.uR.value = 0.5 * pain; R.crack.uniforms.uOp.value = Math.min(1, pain * 1.4);
    slush.visible = slushOn > 0.01; slush.scale.set(0.2, 0.045 * slushOn + 0.0001, 0.05);
  };
  return R;
}
function anatomyStudio(sc) {
  sc.background = gradTex([[0, '#2c4a5c'], [0.45, '#14242f'], [1, '#070d12']], 0.5, 0.42); sc.environment = tintedEnv(0.55, 0.6, 0.7);
  const key = new THREE.DirectionalLight(0xfff2e6, 2.6); key.position.set(2.5, 4, 6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 }); key.shadow.bias = -0.0003; key.userData.soft = 0.15; sc.add(key);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 2.2); rim.position.set(-4, 3, -3); sc.add(rim);
  sc.add(new THREE.HemisphereLight(0xbfdcff, 0x302020, 0.55));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshStandardMaterial({ color: 0x1b2a33, roughness: 0.35, metalness: 0.2 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.62; floor.receiveShadow = true; sc.add(floor);
  const dust = []; const r = rng(4); for (let i = 0; i < 50; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.008 + r() * 0.01, 6, 4), glow(0x9fd8ff, 0.35)); m.position.set((r() - 0.5) * 6, -1.5 + r() * 4, -2 - r() * 3); sc.add(m); dust.push(m); }
}
