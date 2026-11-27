// Runtime: builds the scene, evaluates the compiled episode at time t, renders and composites the frame.
import * as THREE from 'three';
import { buildRig } from './rig.js';
import { CAST, POSES } from './cast.js';
import { buildWorld, LAYOUT } from './world.js';
import { Episode, evalKF, evalStep, stepInfo, EASE } from './dsl.js';
import { rng } from './textures.js';

const qs = new URLSearchParams(location.search);
const EP = qs.get('ep') ?? 'ep01-pets';
const SCALE = parseFloat(qs.get('scale') ?? '1');

async function loadFonts() {
  const f1 = new FontFace('Montserrat', 'url(/animatic/node_modules/@fontsource/montserrat/files/montserrat-latin-900-normal.woff2)', { weight: '900' });
  const f2 = new FontFace('Press Start 2P', 'url(/animatic/node_modules/@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2)');
  document.fonts.add(await f1.load());
  document.fonts.add(await f2.load());
  await document.fonts.ready;
}

// ---------------- camera helpers given to the timeline ----------------
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
export const CAM = {
  still: (pos, look, fov = 40) => () => ({ pos, look, fov }),
  dolly: (p0, l0, p1, l1, fov0 = 40, fov1, ease = 'io') => (u) => {
    const k = EASE[ease](u);
    const L = (a, b) => a.map((x, i) => x + (b[i] - x) * k);
    return { pos: L(p0, p1), look: L(l0, l1), fov: fov0 + ((fov1 ?? fov0) - fov0) * k };
  },
  // camera placed relative to an actor's position (evaluated every frame = tracking)
  track: (who, off, lookOff = [0, 1, 0], fov = 40) => (u, ctx) => {
    const p = ctx.at(who);
    return { pos: [p[0] + off[0], p[1] + off[1], p[2] + off[2]], look: [p[0] + lookOff[0], p[1] + lookOff[1], p[2] + lookOff[2]], fov };
  },
  // look at an actor from a fixed position
  watch: (pos, who, lookOff = [0, 1, 0], fov = 40) => (u, ctx) => {
    const p = ctx.at(who);
    return { pos, look: [p[0] + lookOff[0], p[1] + lookOff[1], p[2] + lookOff[2]], fov };
  },
};

// ---------------- boot ----------------
let W, renderer, scene, camera, out, octx, E, sun, hemi, actors = {}, particles = [];
const CHAR_COLORS = {};

async function boot() {
  await loadFonts();
  const mod = await import(`/episodes/${EP}/timeline.js`);
  E = new Episode(mod.meta ?? {});
  mod.default(E, { CAM, LAYOUT });
  E.compile();
  const Wd = Math.round(E.meta.width * SCALE), Ht = Math.round(E.meta.height * SCALE);

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(Wd, Ht);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  out = document.createElement('canvas');
  out.width = Wd; out.height = Ht;
  octx = out.getContext('2d');
  document.body.appendChild(out);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#cfe6ff', 60, 230);
  camera = new THREE.PerspectiveCamera(40, Wd / Ht, 0.05, 700);

  hemi = new THREE.HemisphereLight('#dfeeff', '#6c8a4a', 1.25);
  scene.add(hemi);
  sun = new THREE.DirectionalLight('#fff4dc', 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 120 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  W = buildWorld(scene);

  // rigs for every cast member used by the episode
  for (const [name, spec] of Object.entries(CAST)) {
    if (!E.actors[name]) continue;
    const rig = buildRig(spec);
    scene.add(rig.root);
    actors[name] = { rig, obj: rig.root, spec };
    CHAR_COLORS[name] = spec.color;
  }
  for (const [name, obj] of Object.entries(W.props)) actors[name] = { obj, prop: true };

  // particles
  for (const b of E.bursts) particles.push(makeBurst(b));

  window.META = { fps: E.meta.fps, frames: E.frames, duration: E.duration, width: Wd, height: Ht };
  window.CUES = E.cues();
  window.SHOTS = E.shots.map((s) => ({ id: s.id, t0: s.t0, dur: s.dur, desc: s.desc }));
  window.ready = true;
}

// ---------------- particles ----------------
const BURST = {
  puff: { cols: ['#ffffff', '#e6e6e6', '#cfcfcf'], size: [0.12, 0.26], vel: 1.6, up: 1.2, g: -0.6, life: 0.9 },
  shatter: { cols: ['#3d2814', '#5a3d22', '#1b1f24', '#6b5032'], size: [0.18, 0.42], vel: 5, up: 4, g: -14, life: 1.8 },
  crumbs: { cols: ['#c98a3e', '#8a5a2a', '#4a2a14'], size: [0.05, 0.1], vel: 1.4, up: 1.6, g: -9, life: 0.9 },
  splash: { cols: ['#e8681c', '#f7b733', '#ff8a1f'], size: [0.1, 0.22], vel: 2.6, up: 3.5, g: -12, life: 1.1 },
  fence: { cols: ['#b8945f', '#8a6a3e'], size: [0.12, 0.3], vel: 4.5, up: 3, g: -14, life: 1.6 },
  pot: { cols: ['#9a5236', '#6e3522', '#d8332c', '#3f8f2c'], size: [0.06, 0.14], vel: 2.2, up: 2.5, g: -12, life: 1.0 },
  paper: { cols: ['#f4f1e8', '#ffffff', '#ff5a7a'], size: [0.05, 0.1], vel: 1.2, up: 1.2, g: -5, life: 1.0 },
  hearts: { cols: ['#ff5a7a', '#ff86a0'], size: [0.08, 0.14], vel: 0.6, up: 1.4, g: 0.4, life: 1.4 },
  dirt: { cols: ['#8b5a33', '#6b4426', '#6cbf45'], size: [0.07, 0.16], vel: 1.8, up: 2.2, g: -11, life: 0.9 },
};
function makeBurst(b) {
  const K = BURST[b.kind] ?? BURST.puff;
  const R = rng(b.seed * 977);
  const g = new THREE.Group();
  const items = [];
  for (let i = 0; i < b.n; i++) {
    const s = K.size[0] + R() * (K.size[1] - K.size[0]);
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshLambertMaterial({ color: K.cols[(R() * K.cols.length) | 0] }));
    const a = R() * Math.PI * 2, sp = (0.3 + R() * 0.7) * K.vel * (b.spread ?? 1);
    items.push({ m, v: [Math.cos(a) * sp, K.up * (0.5 + R() * 0.8), Math.sin(a) * sp], r: [R() * 6, R() * 6], off: [(R() - 0.5) * (b.w ?? 0.3), (R() - 0.5) * (b.h ?? 0.3), (R() - 0.5) * (b.w ?? 0.3)] });
    g.add(m);
  }
  scene.add(g);
  g.visible = false;
  return { b, K, g, items };
}
function updateParticles(t) {
  for (const P of particles) {
    const dt = t - P.b.t;
    const life = P.b.life ?? P.K.life;
    if (dt < 0 || dt > life) { P.g.visible = false; continue; }
    P.g.visible = true;
    const fade = 1 - Math.pow(dt / life, 2);
    for (const it of P.items) {
      const y = P.b.pos[1] + it.off[1] + it.v[1] * dt + 0.5 * P.K.g * dt * dt;
      it.m.position.set(P.b.pos[0] + it.off[0] + it.v[0] * dt, Math.max(0.04, y), P.b.pos[2] + it.off[2] + it.v[2] * dt);
      it.m.rotation.set(it.r[0] * dt, it.r[1] * dt, 0);
      it.m.scale.setScalar(Math.max(0.01, fade));
    }
  }
}

// ---------------- evaluation ----------------
const poseCache = new Map();
function poseOf(rig, name) {
  const key = rig.spec.id + ':' + name;
  if (!poseCache.has(key)) {
    const lib = POSES[rig.spec.type] ?? {};
    const fn = lib[name] ?? lib.stand ?? (() => ({}));
    poseCache.set(key, fn(rig.spec.dims ?? {}) ?? {});
  }
  return poseCache.get(key);
}

function blendPose(rig, a, t) {
  const { cur, prev } = stepInfo(a.pose, t);
  const P1 = poseOf(rig, cur?.v ?? 'stand');
  const P0 = poseOf(rig, prev?.v ?? 'stand');
  let w = cur ? Math.min(1, (t - cur.t) / Math.max(0.001, cur.blend)) : 1;
  w = EASE.io(w);
  const out = { rot: {}, pos: {}, scl: {}, rootY: 0, rootTilt: [0, 0] };
  const names = new Set([...Object.keys(P0.rot ?? {}), ...Object.keys(P1.rot ?? {})]);
  for (const n of names) { const x = P0.rot?.[n] ?? [0, 0, 0], y = P1.rot?.[n] ?? [0, 0, 0]; out.rot[n] = x.map((v, i) => v + (y[i] - v) * w); }
  const pn = new Set([...Object.keys(P0.pos ?? {}), ...Object.keys(P1.pos ?? {})]);
  for (const n of pn) { const x = P0.pos?.[n] ?? [0, 0, 0], y = P1.pos?.[n] ?? [0, 0, 0]; out.pos[n] = x.map((v, i) => v + (y[i] - v) * w); }
  const sn = new Set([...Object.keys(P0.scl ?? {}), ...Object.keys(P1.scl ?? {})]);
  for (const n of sn) { const x = P0.scl?.[n] ?? [1, 1, 1], y = P1.scl?.[n] ?? [1, 1, 1]; out.scl[n] = x.map((v, i) => v + (y[i] - v) * w); }
  out.rootY = (P0.rootY ?? 0) + ((P1.rootY ?? 0) - (P0.rootY ?? 0)) * w;
  const t0 = P0.rootTilt ?? [0, 0], t1 = P1.rootTilt ?? [0, 0];
  out.rootTilt = [t0[0] + (t1[0] - t0[0]) * w, t0[1] + (t1[1] - t0[1]) * w];
  out.name = cur?.v ?? 'stand';
  return out;
}

function talkEnv(a, t) {
  let env = 0;
  for (const s of a.talk) {
    if (s.t0 > t) break;
    if (t <= s.t1) { const u = (t - s.t0) / (s.t1 - s.t0); env = Math.max(env, Math.sin(Math.PI * u)); }
  }
  return env;
}

function hopY(a, t) {
  let y = 0;
  for (const h of a.hops) if (t >= h.t && t <= h.t + h.dur) y += h.h * Math.sin(Math.PI * (t - h.t) / h.dur);
  return y;
}
function spinYaw(a, t) {
  let y = 0;
  for (const s of a.spin) if (t >= s.t) y += s.turns * Math.PI * 2 * EASE.io(Math.min(1, (t - s.t) / s.dur));
  return y;
}

const posAt = (a, t) => evalKF(a.pos, t);

function applyActor(name, t) {
  const A = actors[name];
  const a = E.actors[name];
  if (!A || !a) return;
  const obj = A.obj;
  obj.visible = evalStep(a.vis, t, true);
  const att = evalStep(a.attach, t, null);
  if (att) {
    const parent = actors[att.parent];
    const node = parent.rig ? parent.rig.parts[att.part] ?? parent.obj : parent.obj;
    node.updateWorldMatrix(true, false);
    const m = new THREE.Matrix4().compose(V(att.off), new THREE.Quaternion().setFromEuler(new THREE.Euler(...att.rot)), new THREE.Vector3(1, 1, 1));
    m.premultiply(node.matrixWorld);
    m.decompose(obj.position, obj.quaternion, obj.scale);
    if (A.rig) animateRig(A, a, t, 0);
    return;
  }
  const p = posAt(a, t) ?? [0, 0, 0];
  obj.position.set(p[0], p[1] + hopY(a, t), p[2]);
  obj.rotation.set(0, (evalKF(a.yaw, t) ?? 0) + spinYaw(a, t), 0);
  obj.scale.set(1, 1, 1);
  if (A.rig) {
    const p0 = posAt(a, t - 0.05) ?? p, p1 = posAt(a, t + 0.05) ?? p;
    const speed = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) / 0.1;
    animateRig(A, a, t, speed);
  }
}

function animateRig(A, a, t, speed) {
  const rig = A.rig, P = rig.parts, S = rig.S, type = rig.spec.type;
  const pose = blendPose(rig, a, t);
  // reset to rest + pose
  for (const [n, g] of Object.entries(P)) {
    if (n === 'root') continue;
    const r = g.userData.rest ?? [0, 0, 0];
    const pr = pose.rot[n] ?? [0, 0, 0];
    g.rotation.set(r[0] + pr[0], r[1] + pr[1], r[2] + pr[2]);
    const pp = pose.pos[n] ?? [0, 0, 0];
    g.position.copy(g.userData.base).add(new THREE.Vector3(pp[0] * S, pp[1] * S, pp[2] * S));
    const sc = pose.scl[n] ?? [1, 1, 1];
    if (g.userData.mesh) { g.scale.set(sc[0], sc[1], sc[2]); }
  }
  const root = rig.root;
  root.position.y += pose.rootY * S;
  root.rotation.x += pose.rootTilt[0];
  root.rotation.z += pose.rootTilt[1];
  const seed = rig.spec.id.length;

  // walking / running cycle
  const walk = Math.min(1, speed / 1.2);
  if (walk > 0.02 && !/fly|fallen|flat|lie|ride/.test(pose.name)) {
    const run = speed > 3;
    const ph = t * (run ? 15 : 10);
    const amp = (run ? 0.9 : 0.6) * walk;
    if (type === 'human') {
      P.legA.rotation.x += Math.sin(ph) * amp; P.legB.rotation.x -= Math.sin(ph) * amp;
      if (!pose.rot.armA) P.armA.rotation.x -= Math.sin(ph) * amp * 0.8;
      if (!pose.rot.armB) P.armB.rotation.x += Math.sin(ph) * amp * 0.8;
      root.position.y += Math.abs(Math.sin(ph)) * 0.04 * walk;
    } else if (type === 'quad') {
      P.fl.rotation.x += Math.sin(ph) * amp; P.br.rotation.x += Math.sin(ph) * amp;
      P.fr.rotation.x -= Math.sin(ph) * amp; P.bl.rotation.x -= Math.sin(ph) * amp;
      root.position.y += Math.abs(Math.sin(ph)) * 0.03 * walk;
      if (P.tail) P.tail.rotation.y += Math.sin(ph * 0.5) * 0.3 * walk;
    } else if (type === 'bird') {
      P.legL.rotation.x += Math.sin(ph * 1.5) * 0.5 * walk; P.legR.rotation.x -= Math.sin(ph * 1.5) * 0.5 * walk;
      root.position.y += Math.abs(Math.sin(ph * 1.5)) * 0.05 * walk;
    }
  }
  // idle breathing
  if (P.body) P.body.rotation.x += Math.sin(t * 2.1 + seed) * 0.012;
  if (P.hips) P.hips.rotation.x += Math.sin(t * 2.1 + seed) * 0.01;
  if (type === 'axo') { P.neck.position.y += Math.sin(t * 1.6 + seed) * 0.012; ['gill1', 'gill2', 'gill3'].forEach((g, i) => (P[g].rotation.z += Math.sin(t * 3 + i) * 0.08)); ['gill4', 'gill5', 'gill6'].forEach((g, i) => (P[g].rotation.z -= Math.sin(t * 3 + i) * 0.08)); }

  // states
  const st = (k, d) => (a.state[k] ? evalStep(a.state[k], t, d) : d);
  if (st('wag', false) && P.tail) P.tail.rotation.y += Math.sin(t * 20) * 0.6;
  if ((st('flap', false) || pose.name === 'fly') && P.wingL) { const f = 0.3 + 1.2 * Math.abs(Math.sin(t * 17)); P.wingL.rotation.z -= f; P.wingR.rotation.z += f; }
  const hide = st('hide', null);
  for (const [n, g] of Object.entries(P)) if (n !== 'root') g.visible = !(hide && hide.includes(n));
  if (st('shiver', false)) root.position.x += Math.sin(t * 60) * 0.02;

  // look (additive head turn)
  const lk = evalKF(a.look, t);
  if (lk && P.neck) { P.neck.rotation.y += lk[0]; P.neck.rotation.x += lk[1]; }

  // talking
  const env = talkEnv(a, t);
  if (P.jawP) P.jawP.rotation.x += env * 0.6;
  if (P.neck) P.neck.rotation.x -= env * 0.07;
  const expr = evalStep(a.expr, t, 'neutral');
  rig.setFace(expr, env > 0.35);
}

function applyGlobals(t) {
  const tod = evalKF(E.g.tod, t) ?? 0;
  const day = { top: new THREE.Color('#5ea4ff'), bottom: new THREE.Color('#cfe6ff'), fog: new THREE.Color('#cfe6ff'), sun: 2.3, hemi: 1.25, sunCol: new THREE.Color('#fff4dc') };
  const night = { top: new THREE.Color('#070d2a'), bottom: new THREE.Color('#22306a'), fog: new THREE.Color('#1c2858'), sun: 1.0, hemi: 0.95, sunCol: new THREE.Color('#a9bcff') };
  W.skyMat.uniforms.top.value.copy(day.top).lerp(night.top, tod);
  W.skyMat.uniforms.bottom.value.copy(day.bottom).lerp(night.bottom, tod);
  scene.fog.color.copy(day.fog).lerp(night.fog, tod);
  sun.intensity = day.sun + (night.sun - day.sun) * tod;
  sun.color.copy(day.sunCol).lerp(night.sunCol, tod);
  hemi.intensity = day.hemi + (night.hemi - day.hemi) * tod;
  hemi.color.set('#dfeeff').lerp(new THREE.Color('#5a6fb0'), tod);
  W.stars.material.opacity = Math.max(0, tod * 1.2 - 0.2);
  W.lava.material.forEach((m) => (m.emissiveIntensity = 0.35 + tod * 0.4));
  W.clouds.position.x = t * 0.35;
  W.clouds.children.forEach((c) => (c.material.opacity = 0.92 - tod * 0.6));
  const scores = evalStep(E.g.scores, t, null);
  const key = JSON.stringify(scores);
  if (key !== applyGlobals.lastScores) { applyGlobals.lastScores = key; W.drawBoard(scores ?? {}, E.meta.board ?? []); }
  const sign = actors.ava ? evalStep(E.actors.sign?.state?.text ?? [], t, 'one') : 'one';
  W.signSet(sign);
}

function applyCamera(t) {
  let s = E.shots[0];
  for (const x of E.shots) if (x.t0 <= t) s = x; else break;
  const u = Math.min(1, Math.max(0, (t - s.t0) / s.dur));
  const ctx = { t, lt: t - s.t0, at: (who) => { const o = actors[who].obj; const v = new THREE.Vector3(); o.getWorldPosition(v); return [v.x, v.y, v.z]; } };
  const c = (typeof s.cam === 'function' ? s.cam : CAM.still(s.cam.pos, s.cam.look, s.cam.fov))(u, ctx);
  let zoom = 1;
  for (const p of s.punch) if (t >= p.t) zoom = 1 + (p.scale - 1) * EASE.out(Math.min(1, (t - p.t) / 0.13));
  const pos = V(c.pos), look = V(c.look);
  for (const k of s.shake) {
    const dt = t - k.t;
    if (dt < 0 || dt > k.dur) continue;
    const a = k.amp * (1 - dt / k.dur);
    const o = new THREE.Vector3(Math.sin(t * 71) * a, Math.sin(t * 53 + 1) * a, Math.sin(t * 61 + 2) * a * 0.5);
    pos.add(o); look.add(o.multiplyScalar(0.6));
  }
  camera.position.copy(pos);
  camera.lookAt(look);
  const fov = c.fov ?? 40;
  camera.fov = (2 * Math.atan(Math.tan((fov * Math.PI) / 360) / zoom) * 180) / Math.PI;
  camera.updateProjectionMatrix();
  // keep the shadow frustum centred on what we are looking at
  const tod = evalKF(E.g.tod, t) ?? 0;
  const dir = new THREE.Vector3(14, 26, 12 - tod * 20).normalize();
  sun.target.position.copy(look);
  sun.position.copy(look).add(dir.multiplyScalar(50));
  const sunDir = new THREE.Vector3(-0.6, 0.45, -1).normalize();
  W.sun.position.copy(camera.position).add(sunDir.clone().multiplyScalar(260 * (1 - tod) + 2000 * tod));
  W.sun.lookAt(camera.position);
  W.moon.position.copy(camera.position).add(new THREE.Vector3(0.5, 0.55, -1).normalize().multiplyScalar(tod > 0.05 ? 260 : 3000));
  W.moon.lookAt(camera.position);
  W.sky.position.copy(camera.position);
  W.stars.position.copy(camera.position);
  return s;
}

// ---------------- 2D overlay ----------------
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function project(obj) {
  const v = new THREE.Vector3();
  obj.getWorldPosition(v);
  const d = v.distanceTo(camera.position);
  v.project(camera);
  if (v.z > 1) return null;
  return { x: (v.x * 0.5 + 0.5) * out.width, y: (-v.y * 0.5 + 0.5) * out.height, d };
}

function drawOverlay(t, clean = false) {
  const g = octx, Wd = out.width, Ht = out.height, k = Wd / 1920;
  g.drawImage(renderer.domElement, 0, 0);
  if (clean) return;

  // name tags + zzz
  for (const [name, A] of Object.entries(actors)) {
    if (!A.rig) continue;
    const a = E.actors[name];
    if (!A.obj.visible) continue;
    const tagPart = A.rig.parts.tag ?? A.rig.parts.neck;
    const on = evalStep(a.tag, t, false);
    const since = (() => { let s = null; for (const x of a.tag) if (x.t <= t) s = x; return s; })();
    const alpha = since ? Math.min(1, (t - since.t) / 0.2) : 0;
    const zz = a.state.zzz ? evalStep(a.state.zzz, t, false) : false;
    if (!on && !zz) continue;
    const p = project(tagPart);
    if (!p) continue;
    const size = Math.max(20, Math.min(40, 120 / p.d)) * k;
    if (on) {
      const label = (a.state.label ? evalStep(a.state.label, t, null) : null) ?? A.spec.id.toUpperCase();
      g.font = `${size}px "Press Start 2P"`;
      const tw = g.measureText(label).width;
      g.globalAlpha = alpha;
      g.fillStyle = 'rgba(0,0,0,0.6)';
      g.fillRect(p.x - tw / 2 - size * 0.45, p.y - size * 1.45, tw + size * 0.9, size * 1.5);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText(label, p.x, p.y - size * 0.35);
      g.globalAlpha = 1;
    }
    if (zz) {
      g.font = `${size * 1.1}px "Press Start 2P"`; g.textAlign = 'left';
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 0.7 + i / 3) % 1);
        g.globalAlpha = Math.sin(Math.PI * ph);
        g.fillStyle = '#ffffff'; g.strokeStyle = '#2a2a6a'; g.lineWidth = 4 * k;
        const x = p.x + size * (1 + ph * 2.2), y = p.y - size * (0.5 + ph * 3.2);
        g.strokeText('Z', x, y); g.fillText('Z', x, y);
      }
      g.globalAlpha = 1;
    }
  }

  // round label (top-left)
  const label = evalStep(E.g.label, t, null);
  if (label) {
    const s = 26 * k;
    g.font = `${s}px "Press Start 2P"`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const tw = g.measureText(label).width;
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(48 * k, 44 * k, tw + 40 * k, s + 34 * k);
    g.fillStyle = E.meta.accent; g.fillRect(48 * k, 44 * k, 8 * k, s + 34 * k);
    g.fillStyle = '#ffffff'; g.fillText(label, 70 * k, 44 * k + s + 16 * k);
  }

  // score HUD (top-right)
  if (evalStep(E.g.hud, t, false)) {
    const sc = evalStep(E.g.scores, t, {}) ?? {};
    const s = 20 * k, rows = E.meta.board ?? [];
    const bw = 330 * k, bh = (rows.length * 34 + 30) * k;
    const x0 = Wd - bw - 48 * k, y0 = 44 * k;
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x0, y0, bw, bh);
    g.font = `${s}px "Press Start 2P"`; g.textBaseline = 'alphabetic';
    rows.forEach(([key, lab, col], i) => {
      const y = y0 + (40 + i * 34) * k;
      g.textAlign = 'left'; g.fillStyle = col; g.fillText(lab, x0 + 20 * k, y);
      g.textAlign = 'right'; g.fillStyle = '#ffffff'; g.fillText(String(sc[key] ?? 0), x0 + bw - 20 * k, y);
    });
  }

  // captions (lower third, word-chunked, key word in accent)
  for (const c of E.captions) {
    if (t < c.t0 || t >= c.t1) continue;
    drawCaption(g, c, t, Wd, Ht, k);
  }

  // centre card (sequel hook)
  const card = evalStep(E.g.card, t, null);
  if (card) {
    const s = 60 * k;
    g.font = `900 ${s}px Montserrat`; g.textAlign = 'center'; g.textBaseline = 'middle';
    card.split('\n').forEach((ln, i, arr) => {
      const y = Ht * 0.42 + (i - (arr.length - 1) / 2) * s * 1.15;
      g.lineJoin = 'round'; g.lineWidth = 14 * k; g.strokeStyle = '#000'; g.strokeText(ln, Wd / 2, y);
      g.fillStyle = i === 0 ? E.meta.accent : '#ffffff'; g.fillText(ln, Wd / 2, y);
    });
  }

  // fade
  const fade = evalKF(E.g.fade, t) ?? 0;
  if (fade > 0) { g.fillStyle = `rgba(0,0,0,${fade})`; g.fillRect(0, 0, Wd, Ht); }

  // watermark (bottom-right, 35%)
  g.globalAlpha = 0.35; g.font = `900 ${28 * k}px Montserrat`; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffffff'; g.lineWidth = 5 * k; g.strokeStyle = '#000'; g.strokeText(E.meta.watermark, Wd - 44 * k, Ht - 40 * k); g.fillText(E.meta.watermark, Wd - 44 * k, Ht - 40 * k);
  g.globalAlpha = 1;
}

function drawCaption(g, c, t, Wd, Ht, k) {
  const size = 70 * k;
  const pop = Math.min(1, (t - c.t0) / 0.09);
  const sc = 0.86 + 0.14 * EASE.back(pop);
  g.save();
  g.font = `900 ${size}px Montserrat`;
  g.textBaseline = 'alphabetic';
  const words = c.words.map((w) => ({ ...w, text: w.text.toUpperCase() }));
  const space = g.measureText(' ').width;
  const maxW = 600 * k;
  const lines = [[]];
  let lw = 0;
  for (const w of words) {
    const ww = g.measureText(w.text).width;
    if (lines[lines.length - 1].length && lw + space + ww > maxW) { lines.push([]); lw = 0; }
    lines[lines.length - 1].push({ ...w, ww });
    lw += (lw ? space : 0) + ww;
  }
  const base = Ht * 0.85;
  g.translate(Wd / 2, base);
  g.scale(sc, sc);
  lines.forEach((ln, li) => {
    const total = ln.reduce((s, w) => s + w.ww, 0) + space * (ln.length - 1);
    let x = -total / 2;
    const y = (li - (lines.length - 1)) * size * 1.08;
    for (const w of ln) {
      g.lineJoin = 'round'; g.miterLimit = 2;
      g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 10 * k; g.shadowOffsetY = 5 * k;
      g.lineWidth = 15 * k; g.strokeStyle = '#000000'; g.textAlign = 'left';
      g.strokeText(w.text, x, y);
      g.shadowColor = 'transparent';
      g.fillStyle = w.key ? E.meta.accent : '#ffffff';
      g.fillText(w.text, x, y);
      x += w.ww + space;
    }
  });
  g.restore();
}

// ---------------- public API ----------------
window.renderFrame = (f, quality = 0.92) => {
  const t = f / E.meta.fps;
  applyGlobals(t);
  // un-attached first, then attached (so parents are posed)
  const names = Object.keys(E.actors);
  const attached = names.filter((n) => E.actors[n].attach.length);
  for (const n of names) if (!attached.includes(n)) applyActor(n, t);
  scene.updateMatrixWorld(true);
  for (const n of attached) applyActor(n, t);
  updateParticles(t);
  applyCamera(t);
  renderer.render(scene, camera);
  drawOverlay(t);
  return out.toDataURL('image/jpeg', quality);
};

// Thumbnail: clean frame (no captions/HUD) with 2–4 words of big text, style bible §9.2.
window.renderThumb = (f, lines, opts = {}) => {
  const t = f / E.meta.fps;
  window.renderFrame(f);
  drawOverlay(t, true);
  const g = octx, Wd = out.width, Ht = out.height, k = Wd / 1920;
  const size = (opts.size ?? 190) * k;
  g.font = `900 ${size}px Montserrat`; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  lines.forEach((ln, i) => {
    const x = (opts.x ?? 70) * k, y = (opts.y ?? 230) * k + i * size * 1.0;
    g.save(); g.translate(x, y); g.rotate(-0.05);
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 24 * k; g.shadowOffsetY = 10 * k;
    g.lineWidth = 34 * k; g.strokeStyle = '#000'; g.strokeText(ln, 0, 0);
    g.shadowColor = 'transparent';
    g.fillStyle = i === lines.length - 1 ? E.meta.accent : '#ffffff'; g.fillText(ln, 0, 0);
    g.restore();
  });
  return out.toDataURL('image/jpeg', 0.92);
};

boot().catch((e) => { window.bootError = String(e && e.stack || e); console.error(e); });
