// =====================================================================
// REAL CAT: "3d modelling my cat: Fripouille" by guillaume bolis (CC BY 4.0, via Sketchfab / Objaverse).
// The file's mesh and skeleton disagree (the mesh is stored ~100x larger and turned half a turn, from an FBX unit mix-up),
// so on load we fit the mesh onto the joints (each bone's weighted vertex centroid vs. its segment), move the vertices into
// joint space and re-bind them to a fresh skeleton built from the inverse bind matrices. After that bones pivot where they should.
// Joint space: y up, the cat faces +x, 1 unit = CAT_U cm.
// =====================================================================
const CAT_U = 7.5;
async function loadCatRig(url) {
  const g = await gltfL.loadAsync(url);
  const skinned = []; g.scene.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
  const body = skinned.reduce((a, b) => (b.geometry.attributes.position.count > a.geometry.attributes.position.count ? b : a));
  const sk = body.skeleton, nb = sk.bones.length;
  const Jw = sk.boneInverses.map(m => m.clone().invert());                      // joint world matrices at bind, joint space
  const jp = Jw.map(m => new THREE.Vector3().setFromMatrixPosition(m));
  const parentIdx = sk.bones.map(b => sk.bones.indexOf(b.parent));
  const kids = sk.bones.map((_, i) => parentIdx.map((p, k) => (p === i ? k : -1)).filter(k => k >= 0));
  // pairs: weighted vertex centroid of each bone  <->  middle of that bone's segment (to its first child)
  const P = body.geometry.attributes.position, SW = body.geometry.attributes.skinWeight, SI = body.geometry.attributes.skinIndex;
  const acc = Array.from({ length: nb }, () => ({ s: new THREE.Vector3(), w: 0 }));
  const v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(body.bindMatrix); for (let k = 0; k < 4; k++) { const w = SW.getComponent(i, k); if (w > 0.6) { const j = SI.getComponent(i, k); acc[j].s.addScaledVector(v, w); acc[j].w += w; } } }
  const A = [], B = [];
  for (let j = 0; j < nb; j++) { if (acc[j].w < 3 || !kids[j].length) continue; A.push(acc[j].s.clone().divideScalar(acc[j].w)); B.push(jp[j].clone().add(jp[kids[j][0]]).multiplyScalar(0.5)); }
  const F = umeyama(A, B);                                                       // p (mesh) -> joint space
  const nF = new THREE.Matrix3().setFromMatrix4(F); const sF = Math.cbrt(Math.abs(nF.determinant())); nF.multiplyScalar(1 / sF);
  // fresh skeleton
  const bones = sk.bones.map(b => { const n = new THREE.Bone(); n.name = b.name; return n; });
  const top = new THREE.Group();
  bones.forEach((b, i) => { const pi = parentIdx[i]; (pi >= 0 ? bones[pi] : top).add(b);
    const local = pi >= 0 ? Jw[pi].clone().invert().multiply(Jw[i]) : Jw[i].clone(); local.decompose(b.position, b.quaternion, b.scale); });
  const origBind = skinned.map(m => m.bindMatrix.elements.map(x => +x.toFixed(3)).join(','));
  const meshes = skinned.map(m => {
    const geo = m.geometry.clone(); const pa = geo.attributes.position;
    const FM = F.clone().multiply(m.bindMatrix), nM = new THREE.Matrix3().getNormalMatrix(FM), tM = new THREE.Matrix3().setFromMatrix4(FM);
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(FM); pa.setXYZ(i, v.x, v.y, v.z); }
    for (const nm of ['normal', 'tangent']) { const a = geo.attributes[nm]; if (!a) continue; for (let i = 0; i < a.count; i++) { v.set(a.getX(i), a.getY(i), a.getZ(i)).applyMatrix3(nm === 'normal' ? nM : tM).normalize(); a.setXYZ(i, v.x, v.y, v.z); } }
    if (FM.determinant() < 0 && geo.index) { const ix = geo.index; for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); } ix.needsUpdate = true; }
    if (FM.determinant() < 0 && geo.attributes.tangent) { const a = geo.attributes.tangent; for (let i = 0; i < a.count; i++) a.setW(i, -a.getW(i)); }
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    const mm = new THREE.SkinnedMesh(geo, m.material); mm.name = m.name; mm.frustumCulled = false; mm.castShadow = mm.receiveShadow = true;
    top.add(mm); return mm;
  });
  top.updateMatrixWorld(true);
  const skel = new THREE.Skeleton(bones, sk.boneInverses.map(x => x.clone()));
  meshes.forEach(mm => mm.bind(skel, new THREE.Matrix4()));
  const fitErr = A.map((a, i) => a.clone().applyMatrix4(F).distanceTo(B[i])); 
  return { top, bones, skel, meshes, body: meshes[skinned.indexOf(body)], F, fitErr };
}
// similarity transform (rotation, uniform scale, translation) taking points A onto B
function umeyama(A, B) {
  const n = A.length, ca = new THREE.Vector3(), cb = new THREE.Vector3();
  A.forEach(a => ca.add(a)); B.forEach(b => cb.add(b)); ca.divideScalar(n); cb.divideScalar(n);
  const H = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; let va = 0;
  for (let i = 0; i < n; i++) { const a = A[i].clone().sub(ca), b = B[i].clone().sub(cb); va += a.lengthSq(); const aa = a.toArray(), bb = b.toArray(); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) H[r][c] += bb[r] * aa[c]; }
  // rotation by iterative polar decomposition of H (no SVD in three)
  let R = H.map(r => r.slice());
  for (let it = 0; it < 60; it++) { const Ri = inv3(R); const Rt = [[Ri[0][0], Ri[1][0], Ri[2][0]], [Ri[0][1], Ri[1][1], Ri[2][1]], [Ri[0][2], Ri[1][2], Ri[2][2]]]; R = R.map((row, r) => row.map((x, c) => 0.5 * (x + Rt[r][c]))); }
  
  let tr = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) tr += R[r][c] * H[r][c];
  const s = tr / va;
  const M = new THREE.Matrix4().set(s * R[0][0], s * R[0][1], s * R[0][2], 0, s * R[1][0], s * R[1][1], s * R[1][2], 0, s * R[2][0], s * R[2][1], s * R[2][2], 0, 0, 0, 0, 1);
  const t = cb.clone().sub(ca.clone().applyMatrix4(M)); M.setPosition(t); return M;
}
function det3(m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); }
function inv3(m) { const d = det3(m), r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  r[0][0] = (m[1][1] * m[2][2] - m[1][2] * m[2][1]) / d; r[0][1] = (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / d; r[0][2] = (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / d;
  r[1][0] = (m[1][2] * m[2][0] - m[1][0] * m[2][2]) / d; r[1][1] = (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / d; r[1][2] = (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / d;
  r[2][0] = (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / d; r[2][1] = (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / d; r[2][2] = (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / d; return r; }

// ---------------------------------------------------------------------
// makeCat: one posable cat. cat.root sits on the ground under the middle of the body, facing +x (its left side is +z), in cm.
// ---------------------------------------------------------------------
const CAT_BONES = { pelvis: 'Bone_01', spine: 'Bone001_02', chest: 'Bone002_03', neck: 'Bone003_04', head: 'Bone004_05',
  tail: ['Bone005_014', 'Bone006_015', 'Bone007_016', 'Bone008_017', 'Bone009_018', 'Bone010_019'],
  legA: [['Bone015_06', 'Bone016_07', 'Bone017_08', 'Bone018_09'], ['Bone019_010', 'Bone020_011', 'Bone021_012', 'Bone022_013']],   // front: scapula, humerus, forearm, paw
  legB: [['Bone011_020', 'Bone012_021', 'Bone013_022', 'Bone014_023'], ['Bone023_024', 'Bone024_00', 'Bone025_025', 'Bone026_026']] }; // hind: femur, shin, metatarsus, toes
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const wpos = (o, t = new THREE.Vector3()) => o.getWorldPosition(t);
// rotate a bone (in world space) so that the world direction `from` turns into `to`, by fraction k
function aimBone(bone, from, to, k = 1) {
  const qd = _q1.setFromUnitVectors(from.clone().normalize(), to.clone().normalize()); if (k < 1) qd.slerp(new THREE.Quaternion(), 1 - k);
  const bw = bone.getWorldQuaternion(new THREE.Quaternion()), pw = bone.parent.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pw.invert().multiply(qd).multiply(bw)); bone.updateMatrixWorld(true);
}
// two-bone IK: rotate A and B so that C's origin reaches `target`; the middle joint bends toward `pole` (a world direction)
function catIK2(A, B, C, target, pole) {
  const pa = wpos(A), pb = wpos(B), pc = wpos(C), la = pa.distanceTo(pb), lb = pb.distanceTo(pc);
  const tv = target.clone().sub(pa); const d = THREE.MathUtils.clamp(tv.length(), Math.abs(la - lb) + 1e-3, la + lb - 1e-3); const dir = tv.normalize();
  const pp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  const ca = (la * la + d * d - lb * lb) / (2 * la * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  const pbN = pa.clone().addScaledVector(dir, ca * la).addScaledVector(pp, sa * la);
  aimBone(A, pb.clone().sub(pa), pbN.clone().sub(pa));
  const pb2 = wpos(B), pc2 = wpos(C); aimBone(B, pc2.clone().sub(pb2), pa.clone().addScaledVector(dir, d).sub(pb2));
}
async function makeRealCat({ url = 'assets/cats/fripouille.glb', fur = true, furOpts = {} } = {}) {
  const R = await loadCatRig(url);
  const root = new THREE.Group(), mid = new THREE.Group(); root.add(mid); mid.add(R.top); R.top.scale.setScalar(CAT_U);
  const B = {}; R.bones.forEach(b => (B[b.name] = b));
  const bn = (n) => B[n];
  const pel = bn(CAT_BONES.pelvis), che = bn(CAT_BONES.chest);
  root.updateMatrixWorld(true);
  const fwd = wpos(che).sub(wpos(pel)); fwd.y = 0; fwd.normalize();
  mid.rotation.y = Math.atan2(fwd.z, fwd.x); root.updateMatrixWorld(true);
  const box = new THREE.Box3(); { const p = R.body.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(R.top.matrixWorld)); }
  const c = wpos(pel).add(wpos(che)).multiplyScalar(0.5);
  mid.position.set(-c.x, -box.min.y, -c.z); root.updateMatrixWorld(true);
  // rest data in root space
  const toRoot = (v) => root.worldToLocal(v.clone());
  const rest = new Map(); R.bones.forEach(b => rest.set(b, b.quaternion.clone()));
  const legs = [];
  for (const [kind, chains] of [['A', CAT_BONES.legA], ['B', CAT_BONES.legB]]) for (const ch of chains) {
    const b = ch.map(bn), p = b.map(x => toRoot(wpos(x)));
    const tip = kind === 'A' ? p[3] : p[3];
    legs.push({ kind, b, side: Math.sign(p[0].z - (kind === 'A' ? toRoot(wpos(che)).z : toRoot(wpos(pel)).z)) || 1,
      foot: new THREE.Vector3(tip.x, 0, tip.z), restTip: tip.clone(), restMid: p[2].clone(), hockOff: p[2].clone().sub(p[3]) });
  }
  const cat = { root, mid, R, B: bn, bones: R.bones, rest, legs, box, size: box.getSize(new THREE.Vector3()), pel, che,
    neck: bn(CAT_BONES.neck), head: bn(CAT_BONES.head), spine: bn(CAT_BONES.spine), tail: CAT_BONES.tail.map(bn) };
  cat.restTail = cat.tail.map(b => toRoot(wpos(b)));
  tuneCatMaterials(cat);
  buildFace(cat);
  if (fur) cat.fur = addFur(cat, furOpts);
  return cat;
}
function tuneCatMaterials(cat) {
  for (const m of cat.R.meshes) {
    const mat = m.material;
    if (m !== cat.R.body) { m.visible = false; continue; }
    else { mat.roughness = 0.85; mat.envMapIntensity = 0.9; if (mat.map) mat.map.anisotropy = 8; }
  }
}
// ---------------------------------------------------------------------
// FUR: shell layers over the skinned body. Each strand leans along the coat ("comb") and stands up with `puff`.
// ---------------------------------------------------------------------
function furNoiseTex(n = 128, seed = 7) {
  const d = new Uint8Array(n * n * 4); let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n * n; i++) { const r = rnd(); d[i * 4] = Math.floor(255 * Math.pow(r, 0.7)); d[i * 4 + 1] = Math.floor(255 * rnd()); d[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(d, n, n); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
function addFur(cat, { shells = 16, len = 0.75, density = 22 } = {}) {
  const body = cat.R.body, geo = body.geometry, n = geo.attributes.position.count;
  const SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight, P = geo.attributes.position, N = geo.attributes.normal;
  const idx = (name) => cat.R.bones.indexOf(cat.B(name));
  const tailI = CAT_BONES.tail.map(idx), headI = [idx(CAT_BONES.head)], neckI = [idx(CAT_BONES.neck)];
  const pawI = [CAT_BONES.legA[0][3], CAT_BONES.legA[1][3], CAT_BONES.legB[0][3], CAT_BONES.legB[1][3], CAT_BONES.legA[0][2], CAT_BONES.legA[1][2], CAT_BONES.legB[0][2], CAT_BONES.legB[1][2]].map(idx);
  const backI = [CAT_BONES.pelvis, CAT_BONES.spine, CAT_BONES.chest].map(idx);
  // bone directions in bind (joint space): parent joint -> joint
  const Jw = cat.R.skel.boneInverses.map(m => new THREE.Vector3().setFromMatrixPosition(m.clone().invert()));
  const kid = cat.R.bones.map((b, i) => cat.R.bones.findIndex((c) => c.parent === b && !/_end/.test(c.name)));
  const dirOf = (i) => { const k = kid[i]; return k >= 0 ? Jw[k].clone().sub(Jw[i]).normalize() : new THREE.Vector3(0, -1, 0); };
  const comb = new Float32Array(n * 3), lenA = new Float32Array(n), tailA = new Float32Array(n), backA = new Float32Array(n);
  const v = new THREE.Vector3(), nn = new THREE.Vector3();
  const eyeMesh = cat.R.meshes.find(m => /eye/i.test(m.material.name || '') || m.geometry.attributes.position.count < 700 && m !== cat.R.body && !/whisk/i.test(m.material.name || ''));
  const eyeC = []; if (eyeMesh) { const ep = eyeMesh.geometry.attributes.position, c0 = new THREE.Vector3(), c1 = new THREE.Vector3(); let n0 = 0, n1 = 0; const t = new THREE.Vector3(); for (let i = 0; i < ep.count; i++) { t.fromBufferAttribute(ep, i); if (i < ep.count / 2) { c0.add(t); n0++; } else { c1.add(t); n1++; } } eyeC.push(c0.divideScalar(n0), c1.divideScalar(n1)); }
  for (let i = 0; i < n; i++) {
    let best = -1, bw = 0, tw = 0, hw = 0, pw = 0, kw = 0;
    for (let k = 0; k < 4; k++) { const j = SI.getComponent(i, k), w = SW.getComponent(i, k); if (w > bw) { bw = w; best = j; }
      if (tailI.includes(j)) tw += w; if (headI.includes(j) || neckI.includes(j) && false) hw += w; if (pawI.includes(j)) pw += w; if (backI.includes(j)) kw += w; }
    let d = dirOf(best);
    if (tailI.includes(best)) { /* along the tail toward the tip */ } else if (pawI.includes(best) || CAT_BONES.legA.flat().concat(CAT_BONES.legB.flat()).map(idx).includes(best)) { /* down the leg */ } else d = d.clone().negate(); // body/head: hair points backward
    nn.fromBufferAttribute(N, i); d = d.clone().addScaledVector(nn, -d.dot(nn)); if (d.lengthSq() < 1e-6) d.set(-1, 0, 0); d.normalize();
    comb.set([d.x, d.y, d.z], i * 3);
    v.fromBufferAttribute(P, i); let eyeK = 1; for (const c of eyeC) eyeK = Math.min(eyeK, THREE.MathUtils.smoothstep(v.distanceTo(c), 0.12, 0.3));
    lenA[i] = (1 - 0.6 * hw) * (1 - 0.55 * pw) * (1 + 0.35 * tw) * eyeK; tailA[i] = tw; backA[i] = kw * Math.max(0, nn.y);
  }
  geo.setAttribute('aComb', new THREE.BufferAttribute(comb, 3)); geo.setAttribute('aLen', new THREE.BufferAttribute(lenA, 1));
  geo.setAttribute('aTail', new THREE.BufferAttribute(tailA, 1)); geo.setAttribute('aBack', new THREE.BufferAttribute(backA, 1));
  const U = { uLen: { value: len / CAT_U }, uPuffTail: { value: 0 }, uPuffBack: { value: 0 }, uNoise: { value: furNoiseTex() }, uDensity: { value: density }, uComb: { value: 1.0 } };
  const list = [];
  for (let s = 1; s <= shells; s++) {
    const h = s / shells;
    const m = body.material.clone(); m.transparent = false; m.alphaTest = 0; m.side = THREE.BackSide;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U, { uH: { value: h } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aComb; attribute float aLen; attribute float aTail; attribute float aBack;\nuniform float uLen, uH, uPuffTail, uPuffBack, uComb;\nvarying float vFurH;')
        .replace('#include <skinning_vertex>', `#include <skinning_vertex>
          float pf = clamp(uPuffTail * aTail + uPuffBack * aBack, 0.0, 1.0);
          float L = uLen * aLen * (1.0 + 4.0 * uPuffTail * aTail + 2.0 * uPuffBack * aBack);
          vec3 cS = aComb;
          #ifdef USE_SKINNING
            cS = (skinMatrix * vec4(aComb, 0.0)).xyz;
          #endif
          transformed += normalize(objectNormal) * L * uH + normalize(cS) * L * uComb * (1.0 - 0.9 * pf) * 0.85 * uH * uH;
          vFurH = uH;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uNoise; uniform float uDensity, uH;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec2 fuv = vMapUv * uDensity; vec4 nz = texture2D(uNoise, fuv);
          float thr = 0.12 + 0.86 * uH * uH;
          if (nz.r < thr) discard;
          diffuseColor.rgb *= mix(0.62, 1.1, uH) * (0.9 + 0.2 * nz.g);`);
    };
    m.customProgramCacheKey = () => 'fur' + s;
    const sm = new THREE.SkinnedMesh(geo, m); sm.frustumCulled = false; sm.castShadow = false; sm.receiveShadow = true;
    body.parent.add(sm); sm.bind(body.skeleton, body.bindMatrix); list.push(sm);
  }
  body.material.color.multiplyScalar(0.94);   // the skin under the coat reads as the dark roots
  return { U, shells: list, set(o) { for (const k in o) if (U['u' + k[0].toUpperCase() + k.slice(1)]) U['u' + k[0].toUpperCase() + k.slice(1)].value = o[k]; } };
}
// ---------------------------------------------------------------------
// poseCat(cat, P): everything for one frame.
//  P.pos, P.yaw            root on the ground (world, cm) and heading (radians, 0 = +x)
//  P.walk = { s, at: s => ({ pos, yaw }), stride = 34, duty = 0.62, lift = 3.2, settle = 0 }   planted-foot gait by distance walked
//  P.height, P.pitch       body up/down (cm) and nose-up tilt (rad);  P.arch 0..1 (Halloween back)
//  P.look (world point), P.lookK;  P.tail = { up, curl, tip, sway, phase, side };  P.puff = { tail, back }
//  P.feet = [ ...world points or null ] overrides per leg (order: front near, front far, hind near, hind far)
// ---------------------------------------------------------------------
const LEG_PHASE = { A1: 0.25, A_1: 0.75, B1: 0.0, B_1: 0.5 };
function poseCat(cat, P = {}) {
  for (const [b, q] of cat.rest) b.quaternion.copy(q);
  let pos = P.pos || new THREE.Vector3(), yaw = P.yaw || 0, bob = 0;
  const W = P.walk;
  if (W) { const a = W.at(W.s); pos = a.pos; yaw = a.yaw; const ph = W.s / (W.stride || 34); bob = (1 - (W.settle || 0)) * 0.55 * Math.cos(4 * Math.PI * ph); }
  cat.root.position.copy(pos); cat.root.rotation.set(0, yaw, 0);
  cat.mid.position.y = cat.mid.userData.y0 ?? (cat.mid.userData.y0 = cat.mid.position.y);
  const gH = P.ground ? 0.5 * (P.ground(pos.x + 18 * Math.cos(yaw), pos.z - 18 * Math.sin(yaw)) + P.ground(pos.x - 16 * Math.cos(yaw), pos.z + 16 * Math.sin(yaw))) : 0;
  cat.mid.position.y = cat.mid.userData.y0 + ((P.height || 0) + bob + 3.2 * (P.arch || 0) + gH) / 1;
  cat.root.updateMatrixWorld(true);
  const Z = (b, a) => { if (a) b.rotateZ(a); }, X = (b, a) => { if (a) b.rotateX(a); };
  // body pitch and the arched back
  Z(cat.pel, (P.pitch || 0) + 0.32 * (P.arch || 0)); Z(cat.spine, -0.12 * (P.arch || 0)); Z(cat.che, -0.38 * (P.arch || 0) - (P.pitch || 0) * 0.3);
  if (P.chestYaw) X(cat.che, P.chestYaw);
  // tail
  const T = P.tail || {};
  cat.tail.forEach((b, i) => {
    const w = i / (cat.tail.length - 1);
    Z(b, -((T.up || 0) * (i === 0 ? 1.0 : i === 1 ? 0.45 : 0.08) + (T.curl || 0) * (0.15 + 0.25 * w) + (T.tip || 0) * Math.max(0, w - 0.55) * 2.2));
    X(b, (T.sway || 0) * Math.sin((T.phase || 0) - i * 0.7) * (0.3 + 0.7 * w) + (T.side || 0) * (0.2 + 0.3 * w));
  });
  cat.root.updateMatrixWorld(true);
  // legs
  const fw = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), up = new THREE.Vector3(0, 1, 0);
  const sc = cat.root.getWorldScale(new THREE.Vector3()).x;
  cat.legs.forEach((L, li) => {
    let foot = null;
    if (P.feet && P.feet[li]) foot = P.feet[li].clone();
    else if (W) {
      const st = W.stride || 34, du = W.duty || 0.62, lift = (W.lift ?? 3.2) * (1 - (W.settle || 0));
      const key = L.kind + (L.side > 0 ? '1' : '_1'); const u = (((W.s / st + LEG_PHASE[key]) % 1) + 1) % 1;
      const nW = (s) => { const a = W.at(s); return a.pos.clone().add(L.foot.clone().multiplyScalar(sc).applyAxisAngle(up, a.yaw)); };
      const sMid = W.s - u * st + du * st / 2;
      if (u < du) foot = nW(sMid);
      else { const w = (u - du) / (1 - du), e = w * w * (3 - 2 * w); foot = nW(sMid).lerp(nW(sMid + st), e); foot.y += lift * Math.sin(Math.PI * w); }
      if (W.settle) foot.lerp(cat.root.localToWorld(L.foot.clone()), W.settle);
    } else foot = cat.root.localToWorld(L.foot.clone());
    if (P.ground) foot.y += P.ground(foot.x, foot.z);
    const b = L.b;
    if (L.kind === 'A') {
      const tgt = foot.clone(); tgt.y += L.restTip.y * sc;
      catIK2(b[1], b[2], b[3], tgt, fw.clone().negate().addScaledVector(up, -0.2));
    } else {
      const hock = foot.clone().add(L.hockOff.clone().multiplyScalar(sc).applyAxisAngle(up, yaw)); hock.y += L.restTip.y * sc;
      catIK2(b[0], b[1], b[2], hock, fw.clone().addScaledVector(up, 0.1));
      const toe = foot.clone(); toe.y += L.restTip.y * sc;
      aimBone(b[2], wpos(b[3]).sub(wpos(b[2])), toe.sub(wpos(b[2])));
    }
  });
  // head and neck look at a point
  if (P.look) {
    const k = P.lookK ?? 1;
    for (const [bone, f] of [[cat.neck, 0.45], [cat.head, 0.75]]) {
      const yAx = new THREE.Vector3().setFromMatrixColumn(bone.matrixWorld, 1).normalize();
      const want = P.look.clone().sub(wpos(bone)).normalize();
      const ang = yAx.angleTo(want), lim = 1.1; const kk = f * k * Math.min(1, lim / Math.max(ang, 1e-4));
      aimBone(bone, yAx, want, kk);
    }
  }
  if (P.headTilt) X(cat.head, P.headTilt);
  if (cat.fur) cat.fur.set({ puffTail: P.puff?.tail || 0, puffBack: P.puff?.back || 0 });
  if (cat.eye) cat.eye.set(P.pupil ?? 0.25);
  cat.root.updateMatrixWorld(true);
}

// a cat's eye: green-gold iris with fibres and a vertical slit pupil; eye.set(pupil 0..1) widens it (0.12 = slit, 1 = round and black)
function catEyeTex(size = 512) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  let last = -1;
  const draw = (pupil) => {
    const c = size / 2, R = size * 0.49;
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, size, size);
    const gr = g.createRadialGradient(c, c, R * 0.1, c, c, R); gr.addColorStop(0, '#c9a23a'); gr.addColorStop(0.45, '#9fae3e'); gr.addColorStop(0.85, '#6f8a2e'); gr.addColorStop(1, '#2e3a12');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
    let sd = 3; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) { const a = rnd() * Math.PI * 2, r0 = R * (0.12 + 0.3 * rnd()), r1 = R * (0.6 + 0.38 * rnd()); g.strokeStyle = rnd() < 0.5 ? 'rgba(255,230,140,0.10)' : 'rgba(40,50,10,0.12)'; g.lineWidth = 1 + 1.5 * rnd(); g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a + 0.05) * r1, c + Math.sin(a + 0.05) * r1); g.stroke(); }
    const lr = g.createRadialGradient(c, c, R * 0.85, c, c, R); lr.addColorStop(0, 'rgba(0,0,0,0)'); lr.addColorStop(1, 'rgba(0,0,0,0.65)'); g.fillStyle = lr; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
    const pw = R * (0.06 + 0.88 * pupil), ph = R * (0.78 + 0.1 * pupil);
    g.fillStyle = '#050403'; g.beginPath(); g.ellipse(c, c, pw, ph, 0, 0, Math.PI * 2); g.fill();
    tex.needsUpdate = true; last = pupil;
  };
  draw(0.25);
  return { tex, set(p) { p = Math.round(p * 50) / 50; if (p !== last) draw(p); } };
}

// ---------------------------------------------------------------------
// FACE: glossy eyes placed over the painted eyes of the texture (found by sampling the texture), and whiskers on the muzzle.
// Built in the head bone's space so they follow every head turn.
// ---------------------------------------------------------------------
function buildFace(cat) {
  const body = cat.R.body, geo = body.geometry, P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const hi = cat.R.bones.indexOf(cat.head);
  const img = body.material.map.image, cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0); const px = g.getImageData(0, 0, cv.width, cv.height).data;
  const lum = (u, v) => { const x = Math.min(cv.width - 1, Math.max(0, Math.floor(u * cv.width))), y = Math.min(cv.height - 1, Math.max(0, Math.floor((body.material.map.flipY ? 1 - v : v) * cv.height))); const i = (y * cv.width + x) * 4; return (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255; };
  // root-space positions of head vertices (rest pose)
  cat.root.updateMatrixWorld(true);
  const M = cat.R.top.matrixWorld, rootInv = cat.root.matrixWorld.clone().invert();
  const v = new THREE.Vector3(), headV = [];
  for (let i = 0; i < P.count; i++) { let w = 0; for (let k = 0; k < 4; k++) if (SI.getComponent(i, k) === hi) w += SW.getComponent(i, k); if (w < 0.5) continue;
    v.fromBufferAttribute(P, i).applyMatrix4(M).applyMatrix4(rootInv); headV.push({ i, p: v.clone(), l: lum(UV.getX(i), UV.getY(i)) }); }
  const nose = headV.reduce((a, b) => (b.p.x > a.p.x ? b : a)).p;
  const dark = headV.filter(h => h.l < 0.16 && h.p.y > nose.y + 0.5 && h.p.x < nose.x - 0.8);
  const eyes = [1, -1].map(sd => { const c = dark.filter(h => Math.sign(h.p.z - nose.z) === sd); if (!c.length) return null; const m = new THREE.Vector3(); c.forEach(h => m.add(h.p)); m.divideScalar(c.length);
    const nn = new THREE.Vector3(); c.forEach(h => { const n = new THREE.Vector3().fromBufferAttribute(N, h.i).transformDirection(M).transformDirection(rootInv); nn.add(n); }); return { c: m, n: nn.normalize(), count: c.length, span: Math.sqrt(c.reduce((a, h) => a + h.p.distanceToSquared(m), 0) / c.length) }; });
  cat.faceInfo = { nose: nose.toArray().map(x => +x.toFixed(2)), eyes: eyes.map(e => e && [e.c.toArray().map(x => +x.toFixed(2)), e.n.toArray().map(x => +x.toFixed(2)), e.count, +e.span.toFixed(2)]) };
  const headBone = cat.head; const toBone = (pRoot) => headBone.worldToLocal(cat.root.localToWorld(pRoot.clone()));
  cat.eye = catEyeTex();
  const eyeMat = new THREE.MeshPhysicalMaterial({ map: cat.eye.tex, emissiveMap: cat.eye.tex, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.55, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.06, envMapIntensity: 0.35 });
  const eg = new THREE.SphereGeometry(1, 40, 24); { const p = eg.attributes.position, uv = eg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + 0.5 * p.getX(i), 0.5 + 0.5 * p.getY(i)); eg.rotateX(0); }
  // the sphere's +z is the front of the eye (uv centre)
  for (const e of eyes) { if (!e) continue;
    const r = cat.eyeR ?? 0.92;
    const mesh = new THREE.Mesh(eg, eyeMat); mesh.castShadow = false;
    const fz = e.n.clone().lerp(new THREE.Vector3(1, 0, 0), 0.25).normalize();
    const pos = e.c.clone().addScaledVector(fz, -r * (cat.eyeSink ?? 0.5));
    const fy = new THREE.Vector3(0, 1, 0).addScaledVector(fz, -fz.y).normalize(), fx = new THREE.Vector3().crossVectors(fy, fz);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(fx, fy, fz));
    const grp = new THREE.Group(); grp.position.copy(pos); grp.quaternion.copy(q); grp.scale.set(r * 1.12, r * 0.98, r); grp.add(mesh);
    cat.root.add(grp); grp.updateMatrixWorld(true); headBone.attach(grp); }
  // whiskers: tapered strands from the whisker pads, sweeping out and back
  const wm = new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.4 });
  const wg = []; let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (const side of [1, -1]) for (let k = 0; k < 11; k++) {
    const pad = nose.clone().add(new THREE.Vector3(-1.3 - 0.5 * rnd(), -0.9 - 0.55 * (k / 10) + 0.2 * rnd(), side * (1.0 + 0.35 * rnd())));
    const len = 5.5 + 3.5 * rnd(), out = new THREE.Vector3(-0.35 - 0.3 * rnd(), 0.18 - 0.42 * (k / 10), side * (0.9 + 0.2 * rnd())).normalize();
    const pts = []; for (let j = 0; j <= 8; j++) { const t = j / 8; pts.push(pad.clone().addScaledVector(out, len * t).add(new THREE.Vector3(-0.6 * t * t, -0.9 * t * t, 0))); }
    const curve = new THREE.CatmullRomCurve3(pts); const tg = new THREE.TubeGeometry(curve, 12, 0.035, 3, false);
    const tp = tg.attributes.position; for (let i = 0; i < tp.count; i++) { const seg = Math.floor(i / 4) / 12; const c = curve.getPoint(Math.min(1, seg)); v.fromBufferAttribute(tp, i).sub(c).multiplyScalar(1 - 0.85 * seg).add(c); tp.setXYZ(i, v.x, v.y, v.z); }
    wg.push(tg); }
  const wgeo = mergeGeos(wg); const wmesh = new THREE.Mesh(wgeo, wm); wmesh.castShadow = false; cat.root.add(wmesh); wmesh.updateMatrixWorld(true); headBone.attach(wmesh);
}
function mergeGeos(list) {
  let nv = 0, ni = 0; list.forEach(g => { nv += g.attributes.position.count; ni += g.index.count; });
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni); let ov = 0, oi = 0;
  for (const g of list) { pos.set(g.attributes.position.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3); for (let i = 0; i < g.index.count; i++) idx[oi + i] = g.index.getX(i) + ov; ov += g.attributes.position.count; oi += g.index.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setIndex(new THREE.BufferAttribute(idx, 1)); return m;
}

// recolour a cat (base coat and every fur layer)
function tintCat(cat, r, g, b) { const mats = [cat.R.body.material, ...(cat.fur ? cat.fur.shells.map(m => m.material) : [])]; mats.forEach(m => m.color.multiply(new THREE.Color(r, g, b))); }
// repaint a cat's coat: fn(r, g, b) -> [r, g, b] on every texel (base coat and fur layers share the new map)
function recolorCat(cat, fn) {
  const src = cat.R.body.material.map, img = src.image, cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, cv.width, cv.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) { const o = fn(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255); px[i] = Math.max(0, Math.min(255, o[0] * 255)); px[i + 1] = Math.max(0, Math.min(255, o[1] * 255)); px[i + 2] = Math.max(0, Math.min(255, o[2] * 255)); }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(cv); t.colorSpace = src.colorSpace; t.flipY = src.flipY; t.wrapS = src.wrapS; t.wrapT = src.wrapT; t.anisotropy = 8;
  [cat.R.body.material, ...(cat.fur ? cat.fur.shells.map(m => m.material) : [])].forEach(m => { m.map = t; m.needsUpdate = true; });
}
// a silver tabby: orange becomes grey with darker stripes, white stays white
const silverTabby = (r, g, b) => { const l = 0.3 * r + 0.59 * g + 0.11 * b, sat = Math.max(r, g, b) - Math.min(r, g, b); const k = Math.min(1, sat * 2.6); const v = l * (1 - 0.35 * k) + 0.02; return [v * 0.97, v, v * 1.04]; };
// a kitten: same rig, smaller, with a bigger head (bone scale reaches the eyes and whiskers too)
function kittenize(cat, s = 0.5) { cat.root.scale.setScalar(s); cat.head.scale.multiplyScalar(1.32); cat.neck.scale.multiplyScalar(1.05); }
