/* 3D character built on the 2D pose rig: same poses/IK, rendered as soft toy-like geometry. */
import React from 'react';
import * as THREE from 'three';
import {Body, Pose, rig} from '../components/Person';
import {Look} from '../lib/theme';
import {Ball, GEO, Seg, U, V3, X, arc, basic, mat, tex} from './core';

export type Actor = {body: Body; look: Look; pose: Pose; z?: number; seed?: number; key: string};

const DEG = Math.PI / 180;
/** Body yaw: profile toward ±x, cheated 10° toward camera; turns pass through facing the camera. */
export const yawOf = (facing: number) => (-10 - ((1 - facing) / 2) * 160) * DEG;
const side = (facing: number) => Math.sign(facing || 1) * Math.max(0.35, Math.abs(facing));

const L = (pt: [number, number], z = 0): V3 => [pt[0] * U, -pt[1] * U, z];

export type Joints = ReturnType<typeof joints3>;

export const joints3 = (a: Actor, t: number) => {
  const {body: b, pose: p} = a;
  const s = side(p.facing);
  const zTravel = (a.z ?? 0) * 100;
  const r = rig(b, {...p, x: p.x + Math.sign(p.facing || 1) * zTravel}, Math.sin(t * 2.3 + (a.seed ?? 1) * 1.9) * b.torso * 0.012);
  const hipZ = b.torsoW * 0.22 * U * s;
  const shZ = b.torsoW * 0.46 * U * s;
  const lean = Math.atan2(r.dir[0], -r.dir[1]);
  return {
    s,
    lean,
    hip: L(r.hip),
    neckTop: L(r.neckTop),
    head: L(r.head),
    shF: L(r.shoulder, shZ),
    elF: L(r.elbowF, shZ),
    haF: L(r.handF, shZ),
    shB: L([r.shoulder[0] - 5, r.shoulder[1]], -shZ),
    elB: L(r.elbowB, -shZ),
    haB: L(r.handB, -shZ),
    hipF: L(r.hip, hipZ),
    knF: L(r.kneeF, hipZ),
    ftF: L(r.footF, hipZ),
    hipB: L(r.hip, -hipZ),
    knB: L(r.kneeB, -hipZ),
    ftB: L(r.footB, -hipZ),
  };
};

/** Local (character space) → world. */
export const toWorld3 = (a: Actor, v: V3): V3 => {
  const p = a.pose;
  const th = yawOf(p.facing);
  const y = v[1] * p.squash;
  const c = Math.cos(th);
  const sn = Math.sin(th);
  return [X(p.x) + v[0] * c + v[2] * sn, p.lift * U + y, (a.z ?? 0) - v[0] * sn + v[2] * c];
};
export const handWorld = (a: Actor, t: number, which: 'F' | 'B' = 'F') => {
  const j = joints3(a, t);
  return toWorld3(a, which === 'F' ? j.haF : j.haB);
};
export const headWorld = (a: Actor, t: number) => toWorld3(a, joints3(a, t).head);

// ---------- torso lathe with baked clothing colours ----------
const torsoCache = new Map<string, THREE.BufferGeometry>();
const torsoGeo = (b: Body, look: Look, key: string) => {
  const k = `${key}`;
  let g = torsoCache.get(k);
  if (g) return g;
  const R = (b.torsoW / 2) * U;
  const H = (b.torso + b.neck * 0.2) * U;
  const y0 = -0.42 * R;
  const pants = 0.28 * R;
  const st0 = H * 0.55;
  const st1 = H * 0.66;
  const ys: number[] = [];
  const N = 46;
  for (let i = 0; i <= N; i++) ys.push(y0 + ((H - y0) * i) / N);
  const cuts = [pants, ...(look.stripe ? [st0, st1] : [])];
  for (const c of cuts) ys.push(c - 0.0015, c + 0.0015);
  ys.sort((a, b2) => a - b2);
  const rad = (y: number) => {
    const bot = 0.5 * R;
    const top = H - 0.62 * R;
    if (y <= bot) {
      const q = (bot - y) / (bot - y0);
      return R * Math.sqrt(Math.max(0, 1 - q * q));
    }
    const mid = R * (1 - 0.08 * ((y - bot) / (top - bot)));
    if (y <= top) return mid;
    const q = (y - top) / (H - top);
    return R * 0.92 * Math.sqrt(Math.max(0, 1 - q * q));
  };
  const pts = ys.map((y) => new THREE.Vector2(Math.max(0.0005, rad(y)), y));
  g = new THREE.LatheGeometry(pts, 40);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const cShirt = new THREE.Color(look.shirt);
  const cPants = new THREE.Color(look.pants);
  const cStripe = new THREE.Color(look.stripe ?? look.shirt);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const c = y < pants ? cPants : look.stripe && y > st0 && y < st1 ? cStripe : cShirt;
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  torsoCache.set(k, g);
  return g;
};

// ---------- hair ----------
const capCache = new Map<number, THREE.SphereGeometry>();
const capGeo = (len: number) => {
  let g = capCache.get(len);
  if (!g) {
    g = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, len);
    capCache.set(len, g);
  }
  return g;
};
const Y_UP = new THREE.Vector3(0, 1, 0);
const surf = (r: number, a: number, e: number, k = 1): V3 => [Math.cos(e) * Math.cos(a) * r * k, Math.sin(e) * r * k, Math.cos(e) * Math.sin(a) * r * k];

const Hair: React.FC<{look: Look; r: number}> = ({look, r}) => {
  const m = mat(look.hair, {rough: 0.55, side: THREE.DoubleSide});
  const cap = (len: number, tilt: number, k = 1.07) => (
    <mesh geometry={capGeo(len)} material={m} scale={[r * k, r * k, r * k]} rotation={[0, 0, tilt]} castShadow />
  );
  const spike = (a: number, e: number, h: number, w: number) => {
    const n = new THREE.Vector3(...surf(1, a, e));
    const q = new THREE.Quaternion().setFromUnitVectors(Y_UP, n);
    return <mesh key={`${a}${e}`} geometry={GEO.cone} material={m} position={surf(r, a, e, 1.02)} quaternion={q} scale={[w * r, h * r, w * r]} castShadow />;
  };
  switch (look.hairStyle) {
    case 'messy':
      return (
        <group>
          {cap(Math.PI * 0.5, 0.6)}
          {spike(0.2, 1.15, 0.42, 0.16)}
          {spike(-0.5, 1.05, 0.38, 0.15)}
          {spike(0.9, 0.95, 0.34, 0.14)}
          {spike(0.0, 0.85, 0.3, 0.14)}
          {spike(2.6, 0.9, 0.32, 0.15)}
        </group>
      );
    case 'swoop':
      return (
        <group>
          {cap(Math.PI * 0.5, 0.62)}
          <Ball p={[r * 0.3, r * 0.9, r * 0.05]} r={[r * 0.42, r * 0.24, r * 0.78]} rot={[0.2, 0, -0.55]} m={m} />
        </group>
      );
    case 'short':
      return cap(Math.PI * 0.47, 0.72, 1.05);
    case 'bun':
      return (
        <group>
          {cap(Math.PI * 0.5, 0.58)}
          <Ball p={[-r * 0.6, r * 0.9, 0]} r={r * 0.46} m={m} />
        </group>
      );
    case 'pigtails':
      return (
        <group>
          {cap(Math.PI * 0.5, 0.58)}
          <Ball p={[-r * 0.45, r * 0.05, r * 0.95]} r={r * 0.32} m={m} />
          <Ball p={[-r * 0.45, r * 0.05, -r * 0.95]} r={r * 0.32} m={m} />
          <Ball p={[-r * 0.3, r * 0.3, r * 0.85]} r={r * 0.1} m={mat('#e2445c')} />
          <Ball p={[-r * 0.3, r * 0.3, -r * 0.85]} r={r * 0.1} m={mat('#e2445c')} />
        </group>
      );
  }
};

// ---------- face ----------
const INK = '#1d1724';
const Face: React.FC<{p: Pose; r: number; look: Look; t: number; seed: number}> = ({p, r, look, t, seed}) => {
  const cyc = (t + seed * 1.7) % 3.4;
  const blink = cyc < 0.11 ? 0.12 : 1;
  const ink = mat(INK, {rough: 0.18});
  const ea = 0.34;
  const ee = p.eyes === 'down' ? 0.02 : 0.1;
  const eye = (a: number) => {
    const pos = surf(r, a, ee, 0.94);
    if (p.eyes === 'happy' || p.eyes === 'closed') {
      return (
        <group key={a} position={surf(r, a, ee, 0.99)} rotation={[0, Math.PI / 2 - a, 0]}>
          <mesh geometry={arc(r * 0.11, r * 0.03, Math.PI)} material={ink} rotation={[0, 0, p.eyes === 'happy' ? 0 : Math.PI]} />
        </group>
      );
    }
    const k = p.eyes === 'wide' ? 1.25 : 1;
    const sy = p.eyes === 'down' ? 0.55 : 1;
    return (
      <group key={a} position={pos} rotation={[0, -a, 0]}>
        <mesh geometry={GEO.sphere} material={ink} scale={[r * 0.09, r * 0.18 * blink * sy * k, r * 0.125 * k]} />
        {blink === 1 && <mesh geometry={GEO.sphereLo} material={basic('#ffffff')} position={[r * 0.07, r * 0.07 * sy * k, r * 0.045]} scale={r * 0.045 * k} />}
      </group>
    );
  };
  const brow = (a: number) => {
    const inner = Math.sign(a);
    const ang = p.brows === 'sad' || p.brows === 'worried' ? 0.45 * inner : p.brows === 'angry' ? -0.5 * inner : 0;
    const lift = p.brows === 'up' ? 0.06 : 0;
    if (p.brows === 'none') return null;
    return (
      <group key={`b${a}`} position={surf(r, a, 0.42 + lift, 1.0)} rotation={[0, Math.PI / 2 - a, 0]}>
        <mesh geometry={GEO.box} material={ink} rotation={[0, 0, ang]} scale={[r * 0.24, r * 0.06, r * 0.05]} />
      </group>
    );
  };
  const talkOpen = p.talk > 0 ? Math.abs(Math.sin(t * 22)) : 0;
  const mPos = surf(r, 0.05, -0.34, 0.99);
  const mouthM = mat('#6e2230', {rough: 0.5});
  let mouth: React.ReactNode;
  const m = p.talk > 0 && talkOpen > 0.35 ? 'talk' : p.mouth;
  switch (m) {
    case 'grin':
      mouth = (
        <group>
          <mesh geometry={GEO.sphere} material={mouthM} scale={[r * 0.06, r * 0.1, r * 0.2]} position={[0, -r * 0.02, 0]} />
          <mesh geometry={GEO.box} material={mat('#ffffff', {rough: 0.4})} scale={[r * 0.04, r * 0.04, r * 0.22]} position={[r * 0.03, r * 0.06, 0]} />
        </group>
      );
      break;
    case 'open':
    case 'talk':
      mouth = <mesh geometry={GEO.sphere} material={mouthM} scale={[r * 0.06, r * (m === 'talk' ? 0.05 + 0.06 * talkOpen : 0.12), r * 0.11]} />;
      break;
    case 'o':
      mouth = <mesh geometry={GEO.sphere} material={mouthM} scale={[r * 0.05, r * 0.08, r * 0.07]} />;
      break;
    case 'sad':
      mouth = <mesh geometry={arc(r * 0.13, r * 0.026, Math.PI * 0.7)} material={ink} rotation={[0, Math.PI / 2, Math.PI / 2 - Math.PI * 0.35]} position={[0, -r * 0.1, 0]} />;
      break;
    case 'flat':
      mouth = <mesh geometry={GEO.box} material={ink} scale={[r * 0.04, r * 0.04, r * 0.2]} />;
      break;
    case 'smile':
    default:
      mouth = <mesh geometry={arc(r * 0.14, r * 0.028, Math.PI * 0.75)} material={ink} rotation={[0, Math.PI / 2, -Math.PI / 2 - Math.PI * 0.375]} position={[0, r * 0.06, 0]} />;
  }
  const skin = mat(look.skin, {rough: 0.55});
  return (
    <group>
      {eye(ea)}
      {eye(-ea)}
      {brow(ea)}
      {brow(-ea)}
      <group position={mPos} rotation={[0, 0, 0]}>
        {mouth}
      </group>
      <Ball p={surf(r, 0.05, -0.1, 1.0)} r={r * 0.11} m={skin} cast={false} />
      <Ball p={surf(r, Math.PI / 2, 0.02, 0.98)} r={[r * 0.12, r * 0.18, r * 0.1]} m={skin} cast={false} />
      <Ball p={surf(r, -Math.PI / 2, 0.02, 0.98)} r={[r * 0.12, r * 0.18, r * 0.1]} m={skin} cast={false} />
      {look.blush && (
        <>
          <mesh geometry={GEO.sphereLo} material={mat('#ff7a8a', {transparent: true, opacity: 0.45, rough: 0.9})} position={surf(r, 0.62, -0.22, 0.97)} scale={[r * 0.05, r * 0.08, r * 0.13]} rotation={[0, -0.62, 0]} />
          <mesh geometry={GEO.sphereLo} material={mat('#ff7a8a', {transparent: true, opacity: 0.45, rough: 0.9})} position={surf(r, -0.62, -0.22, 0.97)} scale={[r * 0.05, r * 0.08, r * 0.13]} rotation={[0, 0.62, 0]} />
        </>
      )}
    </group>
  );
};

export const Person3D: React.FC<{a: Actor; t: number}> = ({a, t}) => {
  const {body: b, look, pose: p} = a;
  if (p.opacity <= 0.01) return null;
  const j = joints3(a, t);
  const shirt = mat(look.shirt, {rough: 0.82});
  const shirtB = mat(new THREE.Color(look.shirt).multiplyScalar(0.82).getStyle(), {rough: 0.85});
  const pants = mat(look.pants, {rough: 0.85});
  const skin = mat(look.skin, {rough: 0.55});
  const shoe = mat(look.shoes, {rough: 0.45});
  const armR = (b.armW / 2) * U;
  const legR = (b.legW / 2) * U;
  const r = b.headR * U;
  const headYaw = -0.85 * p.facing * (1 - 0.4 * Math.max(0, p.lookX));
  const nod = -(j.lean * 0.5 + p.tilt * DEG);
  const th = yawOf(p.facing);
  const world = toWorld3(a, [0, 0, 0]);
  const limb = (pts: V3[], rad: number, m: THREE.Material) => (
    <>
      <Seg a={pts[0]} b={pts[1]} r={rad} m={m} />
      <Seg a={pts[1]} b={pts[2]} r={rad * 0.94} m={m} />
      <Ball p={pts[1]} r={rad * 0.98} m={m} />
    </>
  );
  const foot = (f: V3, m: THREE.Material) => <Ball p={[f[0] + legR * 0.55, f[1] - legR * 0.35, f[2]]} r={[legR * 1.5, legR * 0.78, legR * 1.05]} m={m} />;
  return (
    <group>
      {/* soft contact shadow */}
      <mesh
        geometry={GEO.plane}
        material={basic('#000000', {map: tex.blob(), transparent: true, opacity: 0.4 * (1 - Math.min(0.6, p.lift / 200))})}
        position={[world[0] + Math.cos(th) * j.hip[0], 0.012, (a.z ?? 0) - Math.sin(th) * j.hip[0]]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[b.torsoW * U * 2.4, b.torsoW * U * 1.5, 1]}
      />
      <group position={[X(p.x), p.lift * U, a.z ?? 0]} rotation={[0, th, 0]} scale={[1, p.squash, 1]}>
        {/* legs */}
        {limb([j.hipB, j.knB, j.ftB], legR, pants)}
        {foot(j.ftB, shoe)}
        {limb([j.hipF, j.knF, j.ftF], legR, pants)}
        {foot(j.ftF, shoe)}
        {/* torso */}
        <group position={j.hip} rotation={[0, 0, -j.lean]}>
          <mesh geometry={torsoGeo(b, look, a.key)} material={mat('#ffffff', {vertexColors: true, rough: 0.82})} castShadow />
        </group>
        {/* neck */}
        <Seg a={[j.neckTop[0] - Math.sin(j.lean) * 0.12, j.neckTop[1] - 0.12, 0]} b={j.head} r={r * 0.24} m={skin} />
        {/* arms */}
        {limb([j.shB, j.elB, j.haB], armR, shirtB)}
        <Ball p={j.haB} r={armR * 1.28} m={skin} />
        {limb([j.shF, j.elF, j.haF], armR, shirt)}
        <Ball p={j.shF} r={armR * 1.05} m={shirt} />
        <Ball p={j.haF} r={armR * 1.3} m={skin} />
        {/* head */}
        <group position={j.head} rotation={new THREE.Euler(0, headYaw, nod, 'YZX')}>
          <Ball p={[0, 0, 0]} r={r} m={skin} />
          <Hair look={look} r={r} />
          <Face p={p} r={r} look={look} t={t} seed={a.seed ?? 1} />
        </group>
      </group>
    </group>
  );
};
