/* Park playground set + EP02 props (basketball, guitar, headphones). */
import React from 'react';
import * as THREE from 'three';
import {Ball, Box, Cyl, GEO, RBox, Seg, V3, basic, mat} from './core';
import {Lights} from './Sets3D';

// ---------- procedural textures ----------
const texCache = new Map<string, THREE.Texture>();
const cTex = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  let t = texCache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  texCache.set(key, t);
  return t;
};
const rnd = (s: number) => {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const grassTex = (base: string) =>
  cTex(
    `grass-${base}`,
    512,
    512,
    (c) => {
      c.fillStyle = base;
      c.fillRect(0, 0, 512, 512);
      const col = new THREE.Color(base);
      for (let i = 0; i < 2600; i++) {
        const cc = col.clone().offsetHSL((rnd(i) - 0.5) * 0.03, 0, (rnd(i * 3) - 0.5) * 0.14);
        c.strokeStyle = `#${cc.getHexString()}`;
        c.lineWidth = 2;
        const x = rnd(i * 7) * 512;
        const y = rnd(i * 11) * 512;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + (rnd(i * 13) - 0.5) * 6, y - 6 - rnd(i * 17) * 8);
        c.stroke();
      }
    },
    [14, 9],
  );
const skyTex = (overcast: boolean) =>
  cTex(`parksky-${overcast}`, 1024, 512, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, overcast ? '#9fb4cc' : '#5fb2ec');
    g.addColorStop(0.7, overcast ? '#d9e1ea' : '#cdeafa');
    g.addColorStop(1, overcast ? '#e6ebef' : '#eef8fd');
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 512);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    [[160, 120, 1], [420, 80, 0.8], [760, 140, 1.2], [930, 70, 0.7]].forEach(([x, y, k], i) => {
      for (let j = 0; j < 5; j++) {
        c.beginPath();
        c.arc(x + (j - 2) * 34 * k, y + Math.abs(j - 2) * 8 * k, (28 + rnd(i * 9 + j) * 16) * k, 0, Math.PI * 2);
        c.fill();
      }
    });
  });
const netTex = () =>
  cTex('net', 128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 5;
    for (let i = -128; i < 256; i += 32) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + 128, 128);
      c.stroke();
      c.beginPath();
      c.moveTo(i + 128, 0);
      c.lineTo(i, 128);
      c.stroke();
    }
  });
const ballTex = () =>
  cTex('bball', 256, 128, (c) => {
    c.fillStyle = '#e8772e';
    c.fillRect(0, 0, 256, 128);
    c.strokeStyle = '#2a160c';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(0, 64);
    c.lineTo(256, 64);
    c.moveTo(64, 0);
    c.lineTo(64, 128);
    c.moveTo(192, 0);
    c.lineTo(192, 128);
    c.stroke();
    c.beginPath();
    c.ellipse(128, 64, 40, 64, 0, 0, Math.PI * 2);
    c.stroke();
  });

// ---------- set pieces ----------
const Tree: React.FC<{p: V3; s?: number; tone?: number}> = ({p, s = 1, tone = 0}) => {
  const leaf = mat(['#4f9a4f', '#5aa65a', '#468c4f'][tone % 3], {rough: 0.9});
  return (
    <group position={p} scale={s}>
      <Cyl p={[0, 1.3, 0]} r={0.22} h={2.6} m={mat('#7a5236', {rough: 0.9})} />
      <Ball p={[0, 3.3, 0]} r={1.35} m={leaf} />
      <Ball p={[-0.9, 2.8, 0.2]} r={0.95} m={leaf} />
      <Ball p={[0.95, 2.9, -0.1]} r={1.0} m={leaf} />
      <Ball p={[0.1, 4.2, -0.2]} r={0.9} m={leaf} />
    </group>
  );
};

const Fence: React.FC<{z: number; x0: number; x1: number}> = ({z, x0, x1}) => {
  const white = mat('#f7f4ee', {rough: 0.6});
  const n = Math.floor((x1 - x0) / 0.42);
  return (
    <group>
      <Box p={[(x0 + x1) / 2, 0.75, z]} s={[x1 - x0, 0.1, 0.06]} m={white} />
      <Box p={[(x0 + x1) / 2, 0.35, z]} s={[x1 - x0, 0.1, 0.06]} m={white} />
      {Array.from({length: n}).map((_, i) => (
        <group key={i} position={[x0 + 0.21 + i * 0.42, 0, z + 0.04]}>
          <Box p={[0, 0.55, 0]} s={[0.16, 1.1, 0.05]} m={white} />
          <mesh geometry={GEO.cone} material={white} position={[0, 1.18, 0]} scale={[0.115, 0.16, 0.04]} rotation={[0, Math.PI / 4, 0]} castShadow />
        </group>
      ))}
    </group>
  );
};

/** Slide: platform top at (3.2..4.0, 1.9), chute down to (0.8, 0.3), ladder on the right. */
export const SLIDE = {x0: 0.8, y0: 0.3, x1: 3.2, y1: 1.9, top: 1.9, ladderX: 4.25};
export const chuteY = (x: number) => SLIDE.y0 + ((x - SLIDE.x0) / (SLIDE.x1 - SLIDE.x0)) * (SLIDE.y1 - SLIDE.y0);

const Slide: React.FC = () => {
  const post = mat('#f6b93b', {rough: 0.45});
  const deck = mat('#3b82f6', {rough: 0.5});
  const chute = mat('#e2445c', {rough: 0.35});
  const {x0, y0, x1, y1} = SLIDE;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  return (
    <group position={[0, 0, -0.35]}>
      {[[3.2, -0.5], [4.05, -0.5], [3.2, 0.5], [4.05, 0.5]].map(([x, z], i) => (
        <Cyl key={i} p={[x, 1.6, z]} r={0.07} h={3.2} m={post} />
      ))}
      <RBox p={[3.62, 1.84, 0]} s={[0.95, 0.12, 1.1]} m={deck} r={0.03} />
      {/* roof */}
      <mesh geometry={GEO.cone} material={mat('#5bc08a', {rough: 0.5})} position={[3.62, 3.55, 0]} scale={[0.95, 0.7, 0.95]} rotation={[0, Math.PI / 4, 0]} castShadow />
      {/* rails around the deck */}
      <Box p={[3.62, 2.45, -0.5]} s={[0.9, 0.06, 0.06]} m={post} />
      <Box p={[3.62, 2.45, 0.5]} s={[0.9, 0.06, 0.06]} m={post} />
      {/* chute */}
      <group position={[(x0 + x1) / 2, (y0 + y1) / 2, 0]} rotation={[0, 0, ang]}>
        <RBox p={[0, 0, 0]} s={[len + 0.1, 0.08, 0.86]} m={chute} r={0.03} />
        <RBox p={[0, 0.16, -0.43]} s={[len + 0.1, 0.32, 0.06]} m={chute} r={0.03} />
        <RBox p={[0, 0.16, 0.43]} s={[len + 0.1, 0.32, 0.06]} m={chute} r={0.03} />
      </group>
      <RBox p={[x0 - 0.15, y0 - 0.02, 0]} s={[0.4, 0.08, 0.86]} m={chute} r={0.03} />
      {/* ladder */}
      <Seg a={[4.15, 0, -0.32]} b={[4.45, 1.85, -0.32]} r={0.05} m={post} />
      <Seg a={[4.15, 0, 0.32]} b={[4.45, 1.85, 0.32]} r={0.05} m={post} />
      {[0.3, 0.7, 1.1, 1.5].map((y) => (
        <Cyl key={y} p={[4.15 + (y / 1.85) * 0.3, y, 0]} r={0.035} h={0.64} rot={[Math.PI / 2, 0, 0]} m={deck} />
      ))}
    </group>
  );
};

export const BENCH = {x: -3.6, seat: 0.9};
const Bench: React.FC = () => {
  const wood = mat('#b07a4f', {rough: 0.6});
  const iron = mat('#2f3540', {rough: 0.4, metal: 0.5});
  return (
    <group position={[BENCH.x, 0, -0.1]}>
      {[-0.18, 0, 0.18].map((dz) => (
        <RBox key={dz} p={[0, BENCH.seat, dz]} s={[2.3, 0.06, 0.16]} m={wood} r={0.02} />
      ))}
      {[0.7, 0.95].map((y) => (
        <RBox key={y} p={[0, BENCH.seat + y - 0.35, -0.36]} s={[2.3, 0.12, 0.05]} m={wood} r={0.02} />
      ))}
      {[-1.0, 1.0].map((x) => (
        <group key={x}>
          <Box p={[x, BENCH.seat / 2, 0.15]} s={[0.07, BENCH.seat, 0.07]} m={iron} />
          <Box p={[x, (BENCH.seat + 0.7) / 2, -0.33]} s={[0.07, BENCH.seat + 0.7, 0.07]} m={iron} />
        </group>
      ))}
    </group>
  );
};

const Swings: React.FC<{t: number}> = ({t}) => {
  const frame = mat('#3b82f6', {rough: 0.45});
  const a = Math.sin(t * 1.6) * 0.18;
  return (
    <group position={[-1.2, 0, -3.4]}>
      <Seg a={[-1.6, 0, -0.5]} b={[-1.6, 3.0, 0]} r={0.06} m={frame} />
      <Seg a={[-1.6, 0, 0.5]} b={[-1.6, 3.0, 0]} r={0.06} m={frame} />
      <Seg a={[1.6, 0, -0.5]} b={[1.6, 3.0, 0]} r={0.06} m={frame} />
      <Seg a={[1.6, 0, 0.5]} b={[1.6, 3.0, 0]} r={0.06} m={frame} />
      <Cyl p={[0, 3.0, 0]} r={0.06} h={3.3} rot={[0, 0, Math.PI / 2]} m={frame} />
      {[-0.7, 0.7].map((x, i) => (
        <group key={x} position={[x, 3.0, 0]} rotation={[i ? -a : a, 0, 0]}>
          <Seg a={[-0.22, 0, 0]} b={[-0.22, -2.3, 0]} r={0.015} m={mat('#555')} cast={false} />
          <Seg a={[0.22, 0, 0]} b={[0.22, -2.3, 0]} r={0.015} m={mat('#555')} cast={false} />
          <RBox p={[0, -2.32, 0]} s={[0.56, 0.06, 0.22]} m={mat('#e2445c', {rough: 0.5})} r={0.02} />
        </group>
      ))}
    </group>
  );
};

export const HOOP = {x: 4.3, rimY: 3.5, rimZ: -0.55, r: 0.3};
const RIM_GEO = new THREE.TorusGeometry(HOOP.r, 0.025, 8, 28);
const NET_GEO = new THREE.CylinderGeometry(HOOP.r, HOOP.r * 0.6, 0.45, 16, 1, true);
const bandCache = new Map<number, THREE.TorusGeometry>();
const bandGeo = (r: number) => {
  let g = bandCache.get(r);
  if (!g) {
    g = new THREE.TorusGeometry(r * 1.12, r * 0.09, 8, 24, Math.PI);
    bandCache.set(r, g);
  }
  return g;
};
const Hoop: React.FC = () => {
  const pole = mat('#3a3f4a', {rough: 0.4, metal: 0.5});
  return (
    <group>
      <Cyl p={[4.95, 1.9, -1.3]} r={0.08} h={3.8} m={pole} />
      <Seg a={[4.95, 3.75, -1.3]} b={[4.95, 3.8, -0.95]} r={0.06} m={pole} />
      <RBox p={[4.95, 3.95, -0.92]} s={[1.5, 1.0, 0.06]} m={mat('#ffffff', {rough: 0.4})} r={0.03} />
      <Box p={[4.95, 3.8, -0.885]} s={[0.55, 0.42, 0.01]} m={mat('#e2445c', {rough: 0.5})} cast={false} />
      <Box p={[4.95, 3.8, -0.88]} s={[0.47, 0.34, 0.012]} m={mat('#ffffff', {rough: 0.5})} cast={false} />
      <mesh geometry={RIM_GEO} material={mat('#ff6a2b', {rough: 0.4})} position={[HOOP.x + 0.35, HOOP.rimY, HOOP.rimZ]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={NET_GEO} material={basic('#ffffff', {map: netTex(), transparent: true, side: THREE.DoubleSide})} position={[HOOP.x + 0.35, HOOP.rimY - 0.23, HOOP.rimZ]} />
    </group>
  );
};

export type ParkProps = {overcast?: boolean; hoop?: boolean; t: number; warm?: boolean; children?: React.ReactNode};

export const Playground3D: React.FC<ParkProps> = ({overcast, hoop, t, warm, children}) => (
  <>
    <Lights key0={[-7, 10, 6]} keyColor={overcast ? '#e8eef8' : warm ? '#fff0d2' : '#fff6e6'} keyI={overcast ? 1.9 : 2.9} hemi={[overcast ? '#c9d6e6' : '#bfe3ff', '#5d7a3c', overcast ? 0.9 : 0.85]} rim={0.7} fill={0.3} />
    <mesh geometry={GEO.plane} material={basic('#ffffff', {map: skyTex(!!overcast)})} position={[0, 7, -16]} scale={[64, 26, 1]} />
    {/* distant hills */}
    <Ball p={[-9, -1.2, -13]} r={[9, 4.2, 3]} m={mat('#7fb36a', {rough: 1})} cast={false} />
    <Ball p={[8, -1.6, -12]} r={[10, 4.4, 3]} m={mat('#74a862', {rough: 1})} cast={false} />
    <Ball p={[0, -2.2, -14]} r={[12, 4.6, 3]} m={mat('#8cbf75', {rough: 1})} cast={false} />
    {/* ground */}
    <mesh geometry={GEO.plane} material={mat('#ffffff', {map: grassTex(overcast ? '#76a05a' : '#7cb65c'), rough: 0.95})} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} scale={[60, 36, 1]} receiveShadow />
    <mesh geometry={GEO.circle} material={mat('#d9a66b', {rough: 1})} rotation={[-Math.PI / 2, 0, 0]} position={[2.6, 0.01, -0.2]} scale={[3.2, 1.8, 1]} receiveShadow />
    <Tree p={[-6.8, 0, -5.5]} s={1.1} />
    <Tree p={[6.9, 0, -6.2]} s={1.25} tone={1} />
    <Tree p={[2.2, 0, -9]} s={1.0} tone={2} />
    <Tree p={[-3.6, 0, -9.5]} s={0.9} tone={1} />
    <Fence z={-5} x0={-12} x1={12} />
    <Swings t={t} />
    <Slide />
    {hoop && <Hoop />}
    <Bench />
    {/* little flowers */}
    {Array.from({length: 14}).map((_, i) => (
      <Ball key={i} p={[-6 + rnd(i) * 12, 0.06, -4.6 + rnd(i * 3) * 1.4]} r={0.07} m={mat(['#ff8fab', '#ffd34d', '#ffffff'][i % 3], {rough: 0.8})} cast={false} />
    ))}
    {children}
  </>
);

// ---------- props ----------
export const Basketball3D: React.FC<{p: V3; spin?: number}> = ({p, spin = 0}) => (
  <mesh geometry={GEO.sphere} material={mat('#ffffff', {map: ballTex(), rough: 0.7})} position={p} rotation={[spin, spin * 0.6, 0]} scale={0.24} castShadow />
);

/** Acoustic guitar. Origin at the body centre, neck along +x. */
export const Guitar3D: React.FC<{p: V3; rot?: V3}> = ({p, rot = [0, 0, 0]}) => {
  const wood = mat('#d9a05b', {rough: 0.45});
  const dark = mat('#5a3a22', {rough: 0.5});
  return (
    <group position={p} rotation={rot}>
      <mesh geometry={GEO.sphere} material={wood} position={[-0.18, 0, 0]} scale={[0.3, 0.27, 0.1]} castShadow />
      <mesh geometry={GEO.sphere} material={wood} position={[0.12, 0, 0]} scale={[0.22, 0.2, 0.1]} castShadow />
      <mesh geometry={GEO.circle} material={mat('#2a1a10')} position={[0.0, 0, 0.101]} scale={0.075} />
      <Box p={[0.62, 0, 0]} s={[0.78, 0.08, 0.05]} m={dark} />
      <RBox p={[1.08, 0, 0]} s={[0.18, 0.12, 0.05]} m={dark} r={0.02} />
    </group>
  );
};

export const Headphones3D: React.FC<{p: V3; r: number; yaw: number}> = ({p, r, yaw}) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <mesh geometry={bandGeo(r)} material={mat('#2b2b36', {rough: 0.4})} rotation={[0, Math.PI / 2, 0]} />
    <Ball p={[0, 0, r * 1.05]} r={[r * 0.3, r * 0.4, r * 0.16]} m={mat('#e2445c', {rough: 0.4})} />
    <Ball p={[0, 0, -r * 1.05]} r={[r * 0.3, r * 0.4, r * 0.16]} m={mat('#e2445c', {rough: 0.4})} />
  </group>
);
