import { forwardRef, useMemo } from "react";
import {
  BufferGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Group,
  LatheGeometry,
  MeshPhysicalMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import type { Vec3 } from "../camera/moves";

/**
 * A procedural, fully articulated "designer toy" human: smooth vinyl body,
 * ball joints, clothing as colour zones, optional hair/hood/hat/props.
 * No external rig or licence needed, and every joint is driven by a Pose,
 * which is a pure function of the frame. See poses.ts.
 *
 * Conventions: the character faces +Z, its left side is +X.
 *  - spine/neck/head:  +x bends forward
 *  - shoulders/hips:   -x swings the limb forward, +z/-z raises left/right arm sideways
 *  - elbows: -x bends the forearm forward; knees: +x bends the shin back
 */
export type Joint = Vec3;
export type Pose = {
  pos?: Vec3;
  rotY?: number;
  /** Extra vertical offset (jumps, bobbing). */
  lift?: number;
  hips?: Joint;
  spine?: Joint;
  neck?: Joint;
  head?: Joint;
  lShoulder?: Joint;
  lElbow?: Joint;
  lWrist?: Joint;
  rShoulder?: Joint;
  rElbow?: Joint;
  rWrist?: Joint;
  lHip?: Joint;
  lKnee?: Joint;
  rHip?: Joint;
  rKnee?: Joint;
};

export type Look = {
  skin: string;
  shirt: string;
  pants: string;
  shoes?: string;
  hair?: string | null;
  /** Long hair / bun silhouette for variety. */
  hairStyle?: "short" | "bun" | "long";
  hood?: boolean;
  hat?: "top" | "helmet" | null;
  chain?: boolean;
  /** Overall height multiplier (1 = 1.75 m adult). */
  scale?: number;
  /** Child proportions: bigger head, shorter limbs. */
  child?: boolean;
  /** Width multiplier for torso/limbs. */
  build?: number;
};

// --- shared geometry (built once) ---------------------------------------------
const G = (() => {
  const lathe = (pts: [number, number][], seg = 28) =>
    new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg);
  return {
    torso: lathe([
      [0.001, 0],
      [0.118, 0.01],
      [0.128, 0.08],
      [0.12, 0.17],
      [0.142, 0.3],
      [0.158, 0.4],
      [0.148, 0.47],
      [0.1, 0.52],
      [0.001, 0.535],
    ]),
    pelvis: lathe([
      [0.001, -0.11],
      [0.09, -0.105],
      [0.142, -0.04],
      [0.135, 0.04],
      [0.118, 0.085],
      [0.001, 0.09],
    ]),
    ball: new SphereGeometry(1, 20, 14),
    neck: new CylinderGeometry(0.055, 0.064, 0.12, 14),
    hemi: new SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    cyl: new CylinderGeometry(1, 1, 1, 24),
    chain: new TorusGeometry(0.13, 0.012, 8, 40),
    disc: new CylinderGeometry(0.045, 0.045, 0.012, 20),
  } satisfies Record<string, BufferGeometry>;
})();

const mats = new Map<string, MeshPhysicalMaterial>();
/** Cached tactile vinyl / fabric / metal materials. */
export function vinyl(color: string, kind: "skin" | "cloth" | "metal" | "gold" = "cloth") {
  const key = `${color}-${kind}`;
  let m = mats.get(key);
  if (!m) {
    const base = {
      skin: { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.25, sheen: 0 },
      cloth: { roughness: 0.78, clearcoat: 0.05, clearcoatRoughness: 0.6, sheen: 0.6 },
      metal: { roughness: 0.3, metalness: 1, clearcoat: 0, clearcoatRoughness: 0, sheen: 0 },
      gold: { roughness: 0.22, metalness: 1, clearcoat: 0.3, clearcoatRoughness: 0.1, sheen: 0 },
    }[kind];
    m = new MeshPhysicalMaterial({ color: new Color(color), envMapIntensity: 1.2, ...base });
    if (kind === "cloth") m.sheenColor = new Color(color).lerp(new Color("#ffffff"), 0.4);
    mats.set(key, m);
  }
  return m;
}

type Props = {
  look: Look;
  pose: Pose;
  children?: React.ReactNode;
  castShadow?: boolean;
  /** Props held in the hands (spear, sack, lantern...). Origin = palm, -Y = along the fingers. */
  rightHand?: React.ReactNode;
  leftHand?: React.ReactNode;
};

const capsules = new Map<string, CapsuleGeometry>();
/** Capsule of radius r and total length len (cached; scaling one would squash the caps). */
function capsuleGeo(r: number, len: number) {
  const key = `${r.toFixed(4)}-${len.toFixed(4)}`;
  let g = capsules.get(key);
  if (!g) {
    g = new CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, 16);
    capsules.set(key, g);
  }
  return g;
}

export const Mannequin = forwardRef<Group, Props>(({ look, pose, children, castShadow = true, rightHand, leftHand }, ref) => {
  const k = look.child ? 0.94 : 1;
  const headK = look.child ? 1.25 : 1.06;
  const b = look.build ?? 1;
  const s = (look.scale ?? 1) * (look.child ? 0.74 : 1);

  const m = useMemo(
    () => ({
      skin: vinyl(look.skin, "skin"),
      shirt: vinyl(look.shirt),
      pants: vinyl(look.pants),
      shoes: vinyl(look.shoes ?? "#1c1c1f", "skin"),
      hair: look.hair ? vinyl(look.hair, "skin") : null,
      metal: vinyl("#9aa3ad", "metal"),
      gold: vinyl("#e2b450", "gold"),
      hat: vinyl("#18181b", "skin"),
    }),
    [look.skin, look.shirt, look.pants, look.shoes, look.hair],
  );

  const j = (v?: Joint): Joint => v ?? [0, 0, 0];
  const p = pose;
  const upperArm = 0.29 * k;
  const foreArm = 0.26 * k;
  const thigh = 0.44 * k;
  const shin = 0.43 * k;
  const hipY = thigh + shin + 0.06;
  const torsoLen = 0.5 * k;

  // capsule helper with correct proportions: radius r, total length len
  const cap = (r: number, len: number, mat: MeshPhysicalMaterial) => (
    <mesh geometry={capsuleGeo(r, len)} material={mat} position={[0, -len / 2, 0]} castShadow={castShadow} receiveShadow />
  );
  const ball = (r: number, mat: MeshPhysicalMaterial, pos: Vec3 = [0, 0, 0], sc: Vec3 = [1, 1, 1]) => (
    <mesh geometry={G.ball} material={mat} position={pos} scale={[r * sc[0], r * sc[1], r * sc[2]]} castShadow={castShadow} receiveShadow />
  );

  const arm = (side: 1 | -1) => {
    const sh = side === 1 ? p.lShoulder : p.rShoulder;
    const el = side === 1 ? p.lElbow : p.rElbow;
    const wr = side === 1 ? p.lWrist : p.rWrist;
    return (
      <group position={[side * 0.205 * b, torsoLen * 0.86, 0]} rotation={j(sh)}>
        {ball(0.07 * b, m.shirt)}
        {cap(0.06 * b, upperArm, m.shirt)}
        <group position={[0, -upperArm, 0]} rotation={j(el)}>
          {ball(0.055 * b, m.shirt)}
          {cap(0.05 * b, foreArm * 0.8, m.shirt)}
          {cap(0.042 * b, foreArm, m.skin)}
          <group position={[0, -foreArm, 0]} rotation={j(wr)}>
            {ball(1, m.skin, [0, -0.07, 0.005], [0.042, 0.08, 0.026])}
            {/* thumb */}
            {ball(1, m.skin, [side * -0.028, -0.035, 0.02], [0.014, 0.032, 0.014])}
            <group position={[0, -0.075, 0.01]}>{side === -1 ? rightHand : leftHand}</group>
          </group>
        </group>
      </group>
    );
  };

  const leg = (side: 1 | -1) => {
    const hp = side === 1 ? p.lHip : p.rHip;
    const kn = side === 1 ? p.lKnee : p.rKnee;
    return (
      <group position={[side * 0.092 * b, -0.04, 0]} rotation={j(hp)}>
        {ball(0.088 * b, m.pants)}
        {cap(0.084 * b, thigh, m.pants)}
        <group position={[0, -thigh, 0]} rotation={j(kn)}>
          {ball(0.068 * b, m.pants)}
          {cap(0.062 * b, shin, m.pants)}
          <group position={[0, -shin - 0.02, 0]}>
            {ball(1, m.shoes, [0, -0.012, 0.045], [0.058, 0.048, 0.13])}
          </group>
        </group>
      </group>
    );
  };

  const hairCap = () => {
    if (!m.hair) return null;
    return (
      <group>
        <mesh geometry={G.hemi} material={m.hair} position={[0, 0.02, -0.008]} rotation={[-0.25, 0, 0]} scale={[0.104, 0.12, 0.112]} castShadow={castShadow} />
        {look.hairStyle === "bun" ? ball(0.05, m.hair, [0, 0.1, -0.09]) : null}
        {look.hairStyle === "long" ? (
          <mesh geometry={capsuleGeo(1, 3)} material={m.hair} position={[0, -0.08, -0.07]} scale={[0.085, 0.06, 0.05]} castShadow={castShadow} />
        ) : null}
      </group>
    );
  };

  return (
    <group ref={ref} position={p.pos ?? [0, 0, 0]} rotation-y={p.rotY ?? 0} scale={s}>
      <group position={[0, hipY * 1 + (p.lift ?? 0), 0]} rotation={j(p.hips)}>
        {/* pelvis */}
        <mesh geometry={G.pelvis} material={m.pants} scale={[1.18 * b, 1, 0.85 * b]} castShadow={castShadow} receiveShadow />
        {leg(1)}
        {leg(-1)}
        {/* torso */}
        <group position={[0, 0.07, 0]} rotation={j(p.spine)}>
          <mesh geometry={G.torso} material={m.shirt} scale={[1.28 * b, k, 0.82 * b]} castShadow={castShadow} receiveShadow />
          {look.hood ? (
            // folded hood around the collar
            <mesh geometry={G.ball} material={m.shirt} position={[0, torsoLen * 0.97, -0.07]} scale={[0.15 * b, 0.08, 0.1]} castShadow={castShadow} />
          ) : null}
          {look.chain ? (
            <group position={[0, torsoLen * 0.93, 0.02]} rotation={[1.2, 0, 0]}>
              <mesh geometry={G.chain} material={m.gold} scale={[1.05 * b, 1.2, 1]} castShadow={castShadow} />
              <mesh geometry={G.disc} material={m.gold} position={[0, 0.15, 0.02]} rotation={[0.3, 0, 0]} castShadow={castShadow} />
            </group>
          ) : null}
          {arm(1)}
          {arm(-1)}
          {/* neck + head */}
          <group position={[0, torsoLen * 1.0, 0]} rotation={j(p.neck)}>
            <mesh geometry={G.neck} material={m.skin} position={[0, 0.04, 0]} scale={[k, 1, k]} castShadow={castShadow} />
            <group position={[0, 0.1, 0.005]} rotation={j(p.head)} scale={headK}>
              {ball(1, m.skin, [0, 0.11, 0], [0.098, 0.122, 0.108])}
              {/* nose + ears: just enough to read which way the head faces */}
              {ball(1, m.skin, [0, 0.1, 0.105], [0.016, 0.026, 0.02])}
              {ball(1, m.skin, [0.098, 0.1, -0.005], [0.014, 0.026, 0.018])}
              {ball(1, m.skin, [-0.098, 0.1, -0.005], [0.014, 0.026, 0.018])}
              <group position={[0, 0.11, 0]}>{hairCap()}</group>
              {look.hood ? (
                <mesh geometry={G.ball} material={m.shirt} position={[0, 0.12, -0.035]} scale={[0.122, 0.145, 0.125]} castShadow={castShadow} />
              ) : null}
              {look.hat === "top" ? (
                <group position={[0, 0.215, 0]} rotation={[-0.08, 0, 0]}>
                  <mesh geometry={G.cyl} material={m.hat} position={[0, 0.09, 0]} scale={[0.085, 0.18, 0.085]} castShadow={castShadow} />
                  <mesh geometry={G.cyl} material={m.hat} scale={[0.15, 0.012, 0.15]} castShadow={castShadow} />
                  <mesh geometry={G.cyl} material={vinyl("#7a1020")} position={[0, 0.02, 0]} scale={[0.087, 0.03, 0.087]} />
                </group>
              ) : null}
              {look.hat === "helmet" ? (
                <group position={[0, 0.13, -0.005]}>
                  <mesh geometry={G.hemi} material={m.metal} scale={[0.118, 0.13, 0.125]} castShadow={castShadow} />
                  <mesh geometry={G.cyl} material={m.metal} scale={[0.15, 0.01, 0.155]} castShadow={castShadow} />
                </group>
              ) : null}
            </group>
          </group>
        </group>
      </group>
      {children}
    </group>
  );
});
Mannequin.displayName = "Mannequin";

