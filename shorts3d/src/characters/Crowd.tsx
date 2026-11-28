import { useLayoutEffect, useMemo, useRef } from "react";
import {
  CapsuleGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  Object3D,
  SphereGeometry,
} from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { vinyl } from "./Mannequin";

/** Weights 0..1 for each crowd behaviour at a given time. Idle fills the rest. */
export type CrowdMood = { cheer?: number; laugh?: number; shrug?: number; point?: number; turn?: number };

export type CrowdMember = { pos: [number, number, number]; rotY: number; scale: number; seed: number };

type Props = {
  members: CrowdMember[];
  mood: (t: number) => CrowdMood;
  /** World point the crowd faces / points at. */
  lookAt?: [number, number, number];
  skinTones?: string[];
  shirts?: string[];
  pants?: string[];
};

const SKIN = ["#f1c9a5", "#e0ac86", "#c68c62", "#a86b45", "#7c4a2d", "#5a3420", "#ebbd99", "#d49a73"];
const SHIRTS = ["#b8322a", "#2f5fa8", "#e1b736", "#3c8a4e", "#ecebe6", "#6d3f8f", "#d9772b", "#24323f", "#8e1d3f", "#4aa3b8", "#a08a6a", "#1d1f24"];
const PANTS = ["#2b2e36", "#3d4250", "#5a4a3a", "#1c1d21", "#46506a"];

// Shared geometry, in metres, for a ~1.7 m person with feet at y = 0.
const GEO = {
  legs: new CapsuleGeometry(0.15, 0.62, 4, 12), // centre y 0.45
  body: new CapsuleGeometry(0.19, 0.38, 4, 16), // centre y 1.18
  head: new SphereGeometry(0.115, 18, 12), // centre y 1.62
  arm: new CapsuleGeometry(0.055, 0.5, 4, 10), // hangs from the shoulder
};

/**
 * Hundreds of simplified people in 5 instanced draw calls. Every instance is
 * animated from the frame number and its own seed, so crowds feel alive but
 * renders stay deterministic.
 */
export const Crowd: React.FC<Props> = ({ members, mood, lookAt = [0, 1.6, 0], skinTones = SKIN, shirts = SHIRTS, pants = PANTS }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = members.length;
  const refs = {
    legs: useRef<InstancedMesh>(null),
    body: useRef<InstancedMesh>(null),
    head: useRef<InstancedMesh>(null),
    lArm: useRef<InstancedMesh>(null),
    rArm: useRef<InstancedMesh>(null),
  };

  const mats = useMemo(
    () => ({
      cloth: vinyl("#ffffff"),
      skin: vinyl("#ffffff", "skin"),
    }),
    [],
  );

  // Per-instance colours, set once.
  useLayoutEffect(() => {
    const c = new Color();
    members.forEach((m, i) => {
      const r = rand(m.seed);
      refs.legs.current!.setColorAt(i, c.set(pants[Math.floor(r() * pants.length)]));
      const shirt = shirts[Math.floor(r() * shirts.length)];
      refs.body.current!.setColorAt(i, c.set(shirt));
      refs.lArm.current!.setColorAt(i, c.set(shirt));
      refs.rArm.current!.setColorAt(i, c.set(shirt));
      refs.head.current!.setColorAt(i, c.set(skinTones[Math.floor(r() * skinTones.length)]));
    });
    for (const r of Object.values(refs)) r.current!.instanceColor!.needsUpdate = true;
  }, [members, pants, shirts, skinTones]);

  useLayoutEffect(() => {
    const t = frame / fps;
    const md = mood(t);
    const cheer = md.cheer ?? 0;
    const laugh = md.laugh ?? 0;
    const shrug = md.shrug ?? 0;
    const point = md.point ?? 0;
    const root = new Object3D();
    const part = new Object3D();
    const mtx = new Matrix4();

    members.forEach((m, i) => {
      const r = rand(m.seed);
      const ph = r() * 10;
      const speed = 0.8 + r() * 0.5;
      // Face the look-at point, plus personal jitter.
      const face = Math.atan2(lookAt[0] - m.pos[0], lookAt[2] - m.pos[2]) + m.rotY;
      const bounce = cheer * Math.max(0, Math.sin(t * 7 * speed + ph)) * 0.09;
      const bob = laugh * Math.abs(Math.sin(t * 12 * speed + ph)) * 0.03;
      const lean = -laugh * (0.18 + 0.06 * Math.sin(t * 12 * speed + ph)) + 0.03 * Math.sin(t * 0.8 + ph);
      root.position.set(m.pos[0], m.pos[1] + bounce + bob, m.pos[2]);
      root.rotation.set(0, face + 0.15 * Math.sin(t * 0.5 * speed + ph) * (1 - cheer), 0);
      root.scale.setScalar(m.scale);
      root.updateMatrix();

      const set = (mesh: InstancedMesh, px: number, py: number, pz: number, rx = 0, rz = 0, ry = 0) => {
        part.position.set(px, py, pz);
        part.rotation.set(rx, ry, rz);
        part.updateMatrix();
        mtx.multiplyMatrices(root.matrix, part.matrix);
        mesh.setMatrixAt(i, mtx);
      };

      // Upper body pivots at the hips so laughs and leans read.
      const torso = new Object3D();
      torso.position.set(0, 0.85, 0);
      torso.rotation.set(lean, 0, 0.04 * Math.sin(t * 0.9 + ph));
      torso.updateMatrix();
      const up = new Matrix4().multiplyMatrices(root.matrix, torso.matrix);
      const setUp = (mesh: InstancedMesh, px: number, py: number, pz: number, rx = 0, rz = 0) => {
        part.position.set(px, py, pz);
        part.rotation.set(rx, 0, rz);
        part.updateMatrix();
        mtx.multiplyMatrices(up, part.matrix);
        mesh.setMatrixAt(i, mtx);
      };

      set(refs.legs.current!, 0, 0.45, 0);
      setUp(refs.body.current!, 0, 0.33, 0);
      setUp(refs.head.current!, 0, 0.77, 0.01, -laugh * 0.3 - cheer * 0.2, 0);

      // Arm angles: blend idle / cheer / laugh / shrug / point.
      const wave = Math.sin(t * 9 * speed + ph);
      const idleW = Math.max(0, 1 - cheer - laugh - shrug - point);
      const armZ = idleW * 0.1 + cheer * (2.25 + 0.18 * wave) + laugh * 0.35 + shrug * 0.75 + point * 0.1;
      const armX = idleW * 0.05 + cheer * -0.2 + laugh * -0.9 + shrug * -0.55;
      const rArmX = armX + point * -1.5;
      const shoulderY = 0.55;
      const pivot = (mesh: InstancedMesh, side: 1 | -1, rx: number, rz: number) => {
        // arm capsule hangs 0.3 below its pivot: rotate about the shoulder
        const o = new Object3D();
        o.position.set(side * 0.24, shoulderY, 0);
        o.rotation.set(rx, 0, side * rz);
        o.updateMatrix();
        part.position.set(0, -0.3, 0);
        part.rotation.set(0, 0, 0);
        part.updateMatrix();
        mtx.multiplyMatrices(up, o.matrix).multiply(part.matrix);
        mesh.setMatrixAt(i, mtx);
      };
      pivot(refs.lArm.current!, 1, armX, armZ);
      pivot(refs.rArm.current!, -1, rArmX, armZ * (1 - point));
    });
    for (const r of Object.values(refs)) r.current!.instanceMatrix.needsUpdate = true;
  }, [frame, fps, members, mood, lookAt]);

  return (
    <group>
      <instancedMesh ref={refs.legs} args={[GEO.legs, mats.cloth, n]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={refs.body} args={[GEO.body, mats.cloth, n]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={refs.head} args={[GEO.head, mats.skin, n]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={refs.lArm} args={[GEO.arm, mats.cloth, n]} castShadow receiveShadow frustumCulled={false} />
      <instancedMesh ref={refs.rArm} args={[GEO.arm, mats.cloth, n]} castShadow receiveShadow frustumCulled={false} />
    </group>
  );
};

/** Members standing in rows on stepped bleachers (and on the ground in front). */
export function bleacherCrowd(opts: {
  rows: number;
  perRow: number;
  width: number;
  z0: number;
  rowDepth: number;
  rowRise: number;
  groundRows?: number;
  seed?: number;
}): CrowdMember[] {
  const r = rand(opts.seed ?? 7);
  const out: CrowdMember[] = [];
  const total = (opts.groundRows ?? 0) + opts.rows;
  for (let row = 0; row < total; row++) {
    const onGround = row < (opts.groundRows ?? 0);
    const tier = onGround ? 0 : row - (opts.groundRows ?? 0) + 1;
    const y = onGround ? 0 : tier * opts.rowRise;
    const z = opts.z0 + row * opts.rowDepth;
    for (let k = 0; k < opts.perRow; k++) {
      const x = -opts.width / 2 + ((k + 0.5 + (row % 2) * 0.5) / opts.perRow) * opts.width + (r() - 0.5) * 0.25;
      out.push({
        pos: [x, y, z + (r() - 0.5) * 0.25],
        rotY: (r() - 0.5) * 0.5,
        scale: 0.9 + r() * 0.18,
        seed: Math.floor(r() * 1e9),
      });
    }
  }
  return out;
}

/** Small deterministic PRNG (mulberry32). */
export function rand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
