import React from 'react';
import * as THREE from 'three';
import {Ball, Box, Card, Cyl, DrawingKind, GEO, RBox, Seg, V3, basic, mat, rbox, tex} from './core';

const WALL_Z = -2.4;
const KINDS: DrawingKind[] = ['sun', 'dog', 'house', 'rocket', 'family', 'dino', 'portrait'];
const TINTS = ['#fffdf6', '#fff4d6', '#e8f6ff', '#ffeef2', '#eefbea'];
const MAGNETS = ['#e2445c', '#3b82f6', '#f5a623', '#5cb85c'];
const rnd = (s: number) => {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Drawings stuck on a vertical surface (fridge door or wall), filling a rect in a stable order. */
export const ArtWall3D: React.FC<{x0: number; x1: number; y0: number; y1: number; z: number; n: number; seed?: number; size?: number; tape?: boolean}> = ({x0, x1, y0, y1, z, n, seed = 3, size = 0.58, tape}) => {
  const cols = Math.max(2, Math.round((x1 - x0) / (size * 1.08)));
  const rows = Math.max(2, Math.round((y1 - y0) / (size * 0.95)));
  const slots = cols * rows;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < Math.min(n, slots * 2); i++) {
    const layer = Math.floor(i / slots);
    const j = (i * 7 + layer * 3) % slots;
    const cx = x0 + ((j % cols) + 0.5) * ((x1 - x0) / cols) + (rnd(seed + i) - 0.5) * 0.12 + layer * 0.08;
    const cy = y1 - (Math.floor(j / cols) + 0.5) * ((y1 - y0) / rows) + (rnd(seed + i * 3) - 0.5) * 0.1 - layer * 0.07;
    const rot = (rnd(seed + i * 5) - 0.5) * 0.28;
    out.push(
      <group key={i} position={[cx, cy, z + 0.01 + layer * 0.015]} rotation={[0, 0, rot]}>
        <Card p={[0, 0, 0]} w={size} h={size * 0.76} tex={tex.drawing(KINDS[(i + seed) % KINDS.length], TINTS[i % TINTS.length])} shadow={false} />
        {tape ? (
          <mesh geometry={GEO.box} material={mat('#f3ead2', {transparent: true, opacity: 0.8})} position={[0, size * 0.38, 0.012]} scale={[size * 0.35, 0.07, 0.004]} />
        ) : (
          <Ball p={[0, size * 0.33, 0.03]} r={[0.05, 0.05, 0.03]} m={mat(MAGNETS[i % 4], {rough: 0.3})} cast={false} />
        )}
      </group>,
    );
  }
  return <>{out}</>;
};

/** Hanging curtain: a wavy plane. */
const curtainCache = new Map<string, THREE.BufferGeometry>();
const curtainGeo = (w: number, h: number) => {
  const k = `${w}|${h}`;
  let g = curtainCache.get(k);
  if (!g) {
    g = new THREE.PlaneGeometry(w, h, 24, 6);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / w) * Math.PI * 6) * 0.06);
    g.computeVertexNormals();
    curtainCache.set(k, g);
  }
  return g;
};
const Curtain: React.FC<{p: V3; w: number; h: number; color: string}> = ({p, w, h, color}) => (
  <mesh geometry={curtainGeo(w, h)} material={mat(color, {rough: 0.95, side: THREE.DoubleSide})} position={p} castShadow receiveShadow />
);

const Window3D: React.FC<{c: V3; w: number; h: number; sky: 'day' | 'evening' | 'night' | 'dusk'; curtain: string; shaft?: number}> = ({c, w, h, sky, curtain, shaft = 0}) => {
  const frame = mat('#fbf7ef', {rough: 0.6});
  const [x, y, z] = c;
  return (
    <group>
      <mesh geometry={GEO.plane} material={basic('#ffffff', {map: tex.sky(sky)})} position={[x, y, z + 0.01]} scale={[w, h, 1]} />
      <RBox p={[x - w / 2, y, z + 0.06]} s={[0.12, h + 0.12, 0.14]} m={frame} r={0.03} />
      <RBox p={[x + w / 2, y, z + 0.06]} s={[0.12, h + 0.12, 0.14]} m={frame} r={0.03} />
      <RBox p={[x, y + h / 2, z + 0.06]} s={[w + 0.12, 0.12, 0.14]} m={frame} r={0.03} />
      <RBox p={[x, y - h / 2, z + 0.06]} s={[w + 0.12, 0.12, 0.14]} m={frame} r={0.03} />
      <Box p={[x, y, z + 0.05]} s={[0.07, h, 0.06]} m={frame} />
      <Box p={[x, y, z + 0.05]} s={[w, 0.07, 0.06]} m={frame} />
      <RBox p={[x, y - h / 2 - 0.08, z + 0.16]} s={[w + 0.4, 0.09, 0.32]} m={frame} r={0.03} />
      <Cyl p={[x, y + h / 2 + 0.22, z + 0.2]} r={0.035} h={w + 1.2} rot={[0, 0, Math.PI / 2]} m={mat('#6b4b3a', {rough: 0.5})} />
      <Curtain p={[x - w / 2 - 0.18, y - 0.05, z + 0.24]} w={0.62} h={h + 0.5} color={curtain} />
      <Curtain p={[x + w / 2 + 0.18, y - 0.05, z + 0.24]} w={0.62} h={h + 0.5} color={curtain} />
      {shaft > 0 && (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              geometry={GEO.plane}
              material={basic('#fff3cf', {map: tex.shaft(), transparent: true, opacity: 0.09 * shaft, additive: true, side: THREE.DoubleSide})}
              position={[x + 0.6 + i * 0.25, y - 1.6, z + 1.7]}
              rotation={[-0.75, 0.25, 0.2]}
              scale={[w * 0.9, 4.2, 1]}
            />
          ))}
        </group>
      )}
    </group>
  );
};

const Floor: React.FC<{color: string}> = ({color}) => (
  <mesh geometry={GEO.plane} material={mat('#ffffff', {map: tex.wood(color), rough: 0.7})} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} scale={[26, 14, 1]} receiveShadow />
);

const Wall: React.FC<{color: string; holeX?: [number, number]; holeH?: number}> = ({color, holeX, holeH = 0}) => {
  const m = mat(color, {rough: 0.95});
  if (!holeX)
    return (
      <>
        <mesh geometry={GEO.plane} material={m} position={[0, 4.5, WALL_Z]} scale={[26, 9, 1]} receiveShadow />
        <Box p={[0, 0.1, WALL_Z + 0.04]} s={[26, 0.2, 0.08]} m={mat('#f4efe4', {rough: 0.6})} />
      </>
    );
  const [a, b] = holeX;
  return (
    <>
      <mesh geometry={GEO.plane} material={m} position={[(-13 + a) / 2, 4.5, WALL_Z]} scale={[a + 13, 9, 1]} receiveShadow />
      <mesh geometry={GEO.plane} material={m} position={[(13 + b) / 2, 4.5, WALL_Z]} scale={[13 - b, 9, 1]} receiveShadow />
      <mesh geometry={GEO.plane} material={m} position={[(a + b) / 2, (holeH + 9) / 2, WALL_Z]} scale={[b - a, 9 - holeH, 1]} receiveShadow />
      <Box p={[(-13 + a) / 2, 0.1, WALL_Z + 0.04]} s={[a + 13, 0.2, 0.08]} m={mat('#f4efe4', {rough: 0.6})} />
      <Box p={[(13 + b) / 2, 0.1, WALL_Z + 0.04]} s={[13 - b, 0.2, 0.08]} m={mat('#f4efe4', {rough: 0.6})} />
    </>
  );
};

export const Chair3D: React.FC<{x: number; seat: number; facing: number; color: string; z?: number}> = ({x, seat, facing, color, z = 0}) => {
  const m = mat(color, {rough: 0.6});
  const bx = x - facing * 0.36;
  return (
    <group>
      <RBox p={[x, seat - 0.05, z]} s={[0.78, 0.1, 0.78]} m={m} r={0.04} />
      <RBox p={[bx, seat + 0.55, z]} s={[0.1, 1.1, 0.74]} m={m} r={0.04} />
      {[[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]].map(([dx, dz], i) => (
        <Box key={i} p={[x + dx, (seat - 0.1) / 2, z + dz]} s={[0.07, seat - 0.1, 0.07]} m={m} />
      ))}
    </group>
  );
};

// ---------------- lights ----------------
const Spot: React.FC<{pos: V3; target: V3; intensity: number}> = ({pos, target, intensity}) => {
  const tgt = React.useMemo(() => new THREE.Object3D(), []);
  tgt.position.set(...target);
  tgt.updateMatrixWorld();
  return (
    <>
      <primitive object={tgt} />
      <spotLight position={pos} target={tgt} color="#ffd590" intensity={intensity} distance={9} angle={1.0} penumbra={0.8} decay={1.5} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005} />
    </>
  );
};

export const Lights: React.FC<{key0: V3; keyColor: string; keyI: number; hemi: [string, string, number]; rim?: number; fill?: number; children?: React.ReactNode}> = ({key0, keyColor, keyI, hemi, rim = 0.6, fill = 0.35, children}) => (
  <>
    <hemisphereLight args={[hemi[0], hemi[1], hemi[2]]} />
    <directionalLight
      position={key0}
      color={keyColor}
      intensity={keyI}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
      shadow-camera-left={-9}
      shadow-camera-right={9}
      shadow-camera-top={8}
      shadow-camera-bottom={-3}
      shadow-camera-near={1}
      shadow-camera-far={40}
    />
    <directionalLight position={[3, 6, -6]} color="#bcd4ff" intensity={rim} />
    <directionalLight position={[0, 3, 12]} color="#ffffff" intensity={fill} />
    {children}
  </>
);

// ---------------- kitchen ----------------
export type Kitchen3DProps = {
  palette?: 'old' | 'new';
  fridgeArt?: number;
  table?: boolean;
  sky?: 'day' | 'evening';
  bills?: boolean;
  warm?: boolean; // the "looking" side gets a warmer key light
  children?: React.ReactNode;
  wallExtra?: React.ReactNode;
};

export const Kitchen3D: React.FC<Kitchen3DProps> = ({palette = 'old', fridgeArt = 0, table, sky = 'day', bills, warm, children, wallExtra}) => {
  const wall = palette === 'old' ? '#a9c2a1' : '#cdb9a5';
  const cabC = palette === 'old' ? '#4f7f7b' : '#5a6c8a';
  const cab = mat(cabC, {rough: 0.55});
  const cabIn = mat(new THREE.Color(cabC).multiplyScalar(0.9).getStyle(), {rough: 0.55});
  const knob = mat('#e9d8a6', {rough: 0.3, metal: 0.5});
  const fridge = mat('#f1f3ee', {rough: 0.32});
  const evening = sky === 'evening';
  return (
    <>
      <Lights
        key0={evening ? [-7, 5, 4] : [-6, 9, 7]}
        keyColor={evening ? '#ffc48a' : warm ? '#fff1d6' : '#f2f4ff'}
        keyI={evening ? 2.4 : 2.7}
        hemi={[warm ? '#fff3df' : '#eef3ff', '#7a6450', 0.75]}
      >
        <pointLight position={[0.8, 5.0, -0.4]} color="#ffd9a0" intensity={evening ? 9 : 4} distance={9} decay={1.6} />
      </Lights>
      <Floor color={palette === 'old' ? '#c4935f' : '#b98d64'} />
      <Wall color={wall} />
      {wallExtra}
      {/* window */}
      <Window3D c={[-0.82, 3.82, WALL_Z]} w={2.1} h={1.95} sky={sky} curtain="#f2b230" shaft={evening ? 0.6 : 1} />
      {/* upper cabinets + backsplash */}
      <RBox p={[3.7, 4.56, -2.05]} s={[4.2, 1.52, 0.7]} m={cab} r={0.05} />
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <RBox p={[2.3 + i * 1.38, 4.56, -1.69]} s={[1.22, 1.3, 0.05]} m={cabIn} r={0.03} />
          <Ball p={[2.75 + i * 1.38, 4.05, -1.64]} r={0.06} m={knob} />
        </group>
      ))}
      <mesh geometry={GEO.plane} material={mat('#ffffff', {map: tex.tiles(palette === 'old' ? '#dfe9d8' : '#efe6da'), rough: 0.35})} position={[3.7, 2.87, WALL_Z + 0.01]} scale={[4.2, 1.86, 1]} receiveShadow />
      {/* counter */}
      <RBox p={[3.9, 0.9, -1.8]} s={[3.6, 1.8, 1.2]} m={cab} r={0.04} />
      {[0, 1].map((i) => (
        <group key={i}>
          <RBox p={[2.95 + i * 1.75, 0.95, -1.19]} s={[1.55, 1.45, 0.04]} m={cabIn} r={0.03} />
          <RBox p={[2.95 + i * 1.75, 1.5, -1.14]} s={[0.5, 0.07, 0.07]} m={knob} r={0.03} />
        </group>
      ))}
      <RBox p={[3.9, 1.88, -1.75]} s={[3.8, 0.16, 1.36]} m={mat('#f2e6d0', {rough: 0.4})} r={0.04} />
      {/* kettle + plant */}
      <Cyl p={[4.6, 2.2, -1.95]} r={0.24} h={0.5} m={mat('#cfd7e2', {rough: 0.25, metal: 0.4})} />
      <Ball p={[4.6, 2.48, -1.95]} r={[0.2, 0.08, 0.2]} m={mat('#cfd7e2', {rough: 0.25, metal: 0.4})} />
      <Seg a={[4.84, 2.15, -1.95]} b={[5.05, 2.35, -1.95]} r={0.04} m={mat('#cfd7e2', {rough: 0.25, metal: 0.4})} />
      <Cyl p={[5.55, 2.15, -1.95]} r={0.22} h={0.4} m={mat('#d9764a', {rough: 0.8})} />
      {[[-0.2, 0.5, 0.6], [0.15, 0.6, -0.5], [0, 0.7, 0.1], [0.25, 0.45, -1.0], [-0.25, 0.42, 1.1]].map(([dx, h, r], i) => (
        <Ball key={i} p={[5.55 + dx, 2.35 + h / 2, -1.95]} r={[0.07, h / 2, 0.14]} rot={[0, i, r * 0.4]} m={mat('#4c9a5a', {rough: 0.7})} />
      ))}
      {/* pendant lamp */}
      <Seg a={[0.8, 7.5, -0.4]} b={[0.8, 5.6, -0.4]} r={0.015} m={mat('#2b2b36')} cast={false} />
      <mesh geometry={GEO.cone} material={mat('#f6b93b', {rough: 0.5, side: THREE.DoubleSide})} position={[0.8, 5.42, -0.4]} scale={[0.5, 0.42, 0.5]} castShadow />
      <mesh geometry={GEO.sphereLo} material={basic('#fff2c4')} position={[0.8, 5.2, -0.4]} scale={0.13} />
      {/* fridge */}
      <RBox p={[-3.85, 2.25, -1.55]} s={[2.1, 4.5, 1.6]} m={fridge} r={0.16} />
      <Box p={[-3.85, 3.02, -0.745]} s={[2.0, 0.03, 0.02]} m={mat('#b9c0c8')} cast={false} />
      <RBox p={[-3.02, 3.6, -0.66]} s={[0.1, 0.8, 0.12]} m={mat('#c9cfd8', {rough: 0.2, metal: 0.6})} r={0.04} />
      <RBox p={[-3.02, 2.2, -0.66]} s={[0.1, 1.1, 0.12]} m={mat('#c9cfd8', {rough: 0.2, metal: 0.6})} r={0.04} />
      {bills && (
        <>
          <group position={[-4.3, 3.65, -0.74]} rotation={[0, 0, -0.06]}>
            <Card p={[0, 0, 0]} w={0.6} h={0.72} tex={tex.sheet('BILLS', 5, '#9aa3b5')} shadow={false} />
            <Ball p={[0, 0.3, 0.03]} r={[0.05, 0.05, 0.03]} m={mat('#3b82f6', {rough: 0.3})} cast={false} />
          </group>
          <group position={[-3.55, 2.35, -0.74]} rotation={[0, 0, 0.08]}>
            <Card p={[0, 0, 0]} w={0.56} h={0.64} tex={tex.label('PIZZA', '#fff4d6', '#e2445c', 200, 230, 46)} shadow={false} />
            <Ball p={[0, 0.27, 0.03]} r={[0.05, 0.05, 0.03]} m={mat('#e2445c', {rough: 0.3})} cast={false} />
          </group>
        </>
      )}
      {fridgeArt > 0 && <ArtWall3D x0={-4.75} x1={-3.15} y0={0.5} y1={4.35} z={-0.75} n={fridgeArt} seed={11} />}
      {/* table */}
      {table && (
        <group>
          <RBox p={[0.5, 1.33, 0]} s={[2.5, 0.14, 1.7]} m={mat('#b07a4f', {rough: 0.55})} r={0.05} />
          {[[-0.6, -0.7], [1.6, -0.7], [-0.6, 0.7], [1.6, 0.7]].map(([dx, dz], i) => (
            <Box key={i} p={[dx, 0.63, dz]} s={[0.12, 1.26, 0.12]} m={mat('#9a6640', {rough: 0.6})} />
          ))}
        </group>
      )}
      {children}
    </>
  );
};

export const FramedPainting3D: React.FC<{p: V3}> = ({p}) => (
  <group position={p}>
    <RBox p={[0, 0, 0]} s={[1.05, 1.3, 0.08]} m={mat('#6b4b3a', {rough: 0.5})} r={0.03} />
    <mesh geometry={GEO.plane} material={mat('#ffffff', {map: tex.sky('dusk'), rough: 0.8})} position={[0, 0, 0.045]} scale={[0.85, 1.1, 1]} />
  </group>
);

// ---------------- bedroom ----------------
export type Bedroom3DProps = {
  night?: boolean;
  doorOpen?: number;
  hallLight?: number;
  doorShadow?: number;
  wallArt?: number;
  lamp?: number;
  studyPlan?: boolean;
  warm?: boolean;
  children?: React.ReactNode;
};

const DOOR: [number, number] = [3.52, 5.02];
const DOOR_H = 3.78;

export const Bedroom3D: React.FC<Bedroom3DProps> = ({night, doorOpen = 0, hallLight = 0, doorShadow, wallArt = 0, lamp = 0, studyPlan, warm, children}) => {
  const wall = night ? '#55618c' : '#7a8db5';
  const wood = mat('#a0704b', {rough: 0.55});
  const woodD = mat('#8a5a3c', {rough: 0.6});
  const lampOn = lamp > 0.01;
  const hall = Math.max(doorOpen, hallLight);
  return (
    <>
      <Lights
        key0={night ? [-5, 7, 3] : [-7, 6, 5]}
        keyColor={night ? '#7d93d6' : warm ? '#ffbe8a' : '#ffcfa8'}
        keyI={night ? 0.9 : 2.2}
        hemi={[night ? '#7484c0' : warm ? '#ffe7cf' : '#e6e9ff', night ? '#2a2638' : '#5a4636', night ? 0.6 : 0.7]}
        rim={night ? 0.35 : 0.6}
        fill={night ? 0.25 : 0.3}
      >
        {lampOn && (
          <Spot pos={[2.85, 2.62, -0.55]} target={[2.0, 1.6, -0.1]} intensity={28 * lamp} />
        )}
        {lampOn && <pointLight position={[2.6, 2.2, 0.4]} color="#ffcf87" intensity={5 * lamp} distance={7} decay={1.6} />}
        {hall > 0 && <pointLight position={[4.3, 2.6, -3.0]} color="#ffd98a" intensity={10 * hall} distance={9} decay={1.4} />}
      </Lights>
      <Floor color={night ? '#8a6a52' : '#9a7356'} />
      <Wall color={wall} holeX={DOOR} holeH={DOOR_H} />
      {/* hallway */}
      <mesh geometry={GEO.plane} material={basic(hall > 0 ? '#ffdf9e' : '#3a3346')} position={[4.27, 3, -3.8]} scale={[4, 6, 1]} />
      <Box p={[3.4, 3, -3.1]} s={[0.05, 6, 1.4]} m={mat(wall)} />
      <Box p={[5.15, 3, -3.1]} s={[0.05, 6, 1.4]} m={mat(wall)} />
      {/* door frame + leaf (hinged on the right) */}
      {[
        [DOOR[0] - 0.07, DOOR_H / 2, 0.14, DOOR_H + 0.14],
        [DOOR[1] + 0.07, DOOR_H / 2, 0.14, DOOR_H + 0.14],
      ].map(([x, y, w, h], i) => (
        <RBox key={i} p={[x, y, WALL_Z + 0.04]} s={[w, h, 0.2]} m={mat('#efe8da', {rough: 0.6})} r={0.03} />
      ))}
      <RBox p={[(DOOR[0] + DOOR[1]) / 2, DOOR_H + 0.07, WALL_Z + 0.04]} s={[DOOR[1] - DOOR[0] + 0.28, 0.14, 0.2]} m={mat('#efe8da', {rough: 0.6})} r={0.03} />
      <group position={[DOOR[1], 0, WALL_Z - 0.05]} rotation={[0, doorOpen * 1.55, 0]}>
        <RBox p={[-(DOOR[1] - DOOR[0]) / 2, DOOR_H / 2, 0]} s={[DOOR[1] - DOOR[0] - 0.02, DOOR_H - 0.02, 0.08]} m={mat('#b07a4f', {rough: 0.5})} r={0.02} />
        <RBox p={[-(DOOR[1] - DOOR[0]) / 2, DOOR_H * 0.72, 0.045]} s={[1.0, 1.2, 0.02]} m={mat('#a46e44', {rough: 0.5})} r={0.02} />
        <RBox p={[-(DOOR[1] - DOOR[0]) / 2, DOOR_H * 0.28, 0.045]} s={[1.0, 1.2, 0.02]} m={mat('#a46e44', {rough: 0.5})} r={0.02} />
        <Ball p={[-(DOOR[1] - DOOR[0]) + 0.16, 1.9, 0.08]} r={0.07} m={mat('#f2d16b', {rough: 0.25, metal: 0.6})} />
      </group>
      {hallLight > 0 && doorOpen < 0.02 && (
        <group>
          <mesh geometry={GEO.plane} material={basic('#ffe29a', {transparent: true, opacity: hallLight})} position={[(DOOR[0] + DOOR[1]) / 2, 0.04, WALL_Z + 0.002]} scale={[1.4, 0.06, 1]} />
          <mesh geometry={GEO.plane} material={basic('#ffe29a', {map: tex.glow(), transparent: true, opacity: 0.45 * hallLight, additive: true})} position={[(DOOR[0] + DOOR[1]) / 2, 0.015, WALL_Z + 0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.2, 1.2, 1]} />
          {doorShadow !== undefined && !Number.isNaN(doorShadow) && (
            <>
              <mesh geometry={GEO.plane} material={basic('#1b1424')} position={[(DOOR[0] + DOOR[1]) / 2 + doorShadow * 0.6 - 0.2, 0.04, WALL_Z + 0.004]} scale={[0.18, 0.06, 1]} />
              <mesh geometry={GEO.plane} material={basic('#1b1424')} position={[(DOOR[0] + DOOR[1]) / 2 + doorShadow * 0.6 + 0.15, 0.04, WALL_Z + 0.004]} scale={[0.18, 0.06, 1]} />
            </>
          )}
        </group>
      )}
      {/* window */}
      <Window3D c={[-3.58, 3.86, WALL_Z]} w={1.9} h={1.9} sky={night ? 'night' : 'dusk'} curtain={night ? '#5b77b0' : '#e8b04a'} shaft={night ? 0 : 0.7} />
      {/* shelf + books */}
      <RBox p={[2.2, 3.55, -2.22]} s={[2.4, 0.1, 0.36]} m={woodD} r={0.02} />
      {['#e2445c', '#3b82f6', '#f5a623', '#5cb85c', '#8e44ad'].map((c, i) => (
        <RBox key={c} p={[1.3 + i * 0.24, 3.6 + 0.3 - (i % 2) * 0.05, -2.22]} s={[0.2, 0.6 - (i % 2) * 0.1, 0.3]} m={mat(c, {rough: 0.6})} r={0.02} />
      ))}
      <Ball p={[2.9, 3.85, -2.22]} r={0.26} m={mat('#9ad0a8', {rough: 0.7})} />
      {wallArt > 0 && <ArtWall3D x0={-2.25} x1={0.25} y0={2.2} y1={5.0} z={WALL_Z} n={wallArt} seed={4} size={0.6} tape />}
      {studyPlan && (
        <group position={[-1.2, 3.75, WALL_Z + 0.02]} rotation={[0, 0, -0.03]}>
          <Card p={[0, 0, 0]} w={1.3} h={1.6} tex={tex.sheet('STUDY PLAN', 6)} shadow={false} />
        </group>
      )}
      {/* bed */}
      <RBox p={[-3.25, 0.42, -1.3]} s={[3.8, 0.84, 2.2]} m={woodD} r={0.05} />
      <RBox p={[-5.12, 1.2, -1.3]} s={[0.16, 2.4, 2.3]} m={woodD} r={0.05} />
      <RBox p={[-3.25, 1.02, -1.3]} s={[3.7, 0.4, 2.1]} m={mat('#f4f1ea', {rough: 0.9})} r={0.12} />
      <RBox p={[-2.7, 1.28, -1.25]} s={[2.7, 0.2, 2.2]} m={mat(night ? '#5b77b0' : '#e8b04a', {rough: 0.95})} r={0.1} />
      <RBox p={[-4.45, 1.38, -1.3]} s={[0.85, 0.32, 1.4]} m={mat('#ffffff', {rough: 0.9})} r={0.14} />
      {/* rug */}
      <mesh geometry={GEO.circle} material={mat('#8f7aa8', {rough: 1})} position={[-0.6, 0.012, 1.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.0, 1.1, 1]} receiveShadow />
      {/* desk */}
      <RBox p={[2.3, 1.6, -0.3]} s={[2.75, 0.12, 1.6]} m={wood} r={0.04} />
      <Box p={[1.05, 0.77, -0.95]} s={[0.1, 1.54, 0.1]} m={woodD} />
      <Box p={[1.05, 0.77, 0.4]} s={[0.1, 1.54, 0.1]} m={woodD} />
      <RBox p={[3.25, 0.77, -0.3]} s={[0.8, 1.54, 1.5]} m={woodD} r={0.04} />
      <RBox p={[3.25, 1.12, 0.46]} s={[0.66, 0.42, 0.03]} m={wood} r={0.02} />
      <Ball p={[3.25, 1.12, 0.5]} r={0.05} m={mat('#f2d16b', {rough: 0.25, metal: 0.6})} />
      {/* lamp */}
      <Cyl p={[3.35, 1.69, -0.75]} r={0.2} h={0.06} m={mat('#2b2b36', {rough: 0.4})} />
      <Seg a={[3.35, 1.7, -0.75]} b={[3.25, 2.45, -0.7]} r={0.03} m={mat('#2b2b36', {rough: 0.4})} />
      <Seg a={[3.25, 2.45, -0.7]} b={[2.95, 2.75, -0.6]} r={0.03} m={mat('#2b2b36', {rough: 0.4})} />
      <mesh geometry={GEO.cone} material={mat('#2f9c8f', {rough: 0.5, side: THREE.DoubleSide})} position={[2.85, 2.68, -0.55]} rotation={[0, 0, 0.7]} scale={[0.26, 0.34, 0.26]} castShadow />
      {lampOn && <mesh geometry={GEO.sphereLo} material={basic('#fff2c4')} position={[2.78, 2.6, -0.55]} scale={0.08} />}
      {lampOn && <mesh geometry={GEO.plane} material={basic('#ffcf87', {map: tex.glow(), transparent: true, opacity: 0.55 * lamp, additive: true})} position={[2.75, 2.55, -0.4]} scale={[1.6, 1.6, 1]} />}
      {children}
    </>
  );
};
