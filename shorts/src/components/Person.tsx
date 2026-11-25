import React from 'react';
import {C, Look} from '../lib/theme';

export type Body = {
  thigh: number;
  shin: number;
  torso: number;
  torsoW: number;
  neck: number;
  headR: number;
  armU: number;
  armL: number;
  armW: number;
  legW: number;
};

export const BODIES: Record<string, Body> = {
  age5: {thigh: 42, shin: 40, torso: 74, torsoW: 60, neck: 6, headR: 42, armU: 38, armL: 36, armW: 19, legW: 23},
  age8: {thigh: 54, shin: 52, torso: 90, torsoW: 64, neck: 7, headR: 44, armU: 48, armL: 45, armW: 21, legW: 26},
  age12: {thigh: 68, shin: 66, torso: 108, torsoW: 68, neck: 8, headR: 45, armU: 60, armL: 56, armW: 23, legW: 28},
  age16: {thigh: 86, shin: 84, torso: 130, torsoW: 74, neck: 9, headR: 47, armU: 72, armL: 68, armW: 25, legW: 31},
  man: {thigh: 92, shin: 90, torso: 142, torsoW: 84, neck: 10, headR: 50, armU: 78, armL: 74, armW: 27, legW: 33},
  mom: {thigh: 88, shin: 86, torso: 132, torsoW: 76, neck: 10, headR: 48, armU: 74, armL: 70, armW: 25, legW: 31},
};

export type Pose = {
  x: number; // world x of character origin (between feet)
  y: number; // world y of ground under character
  facing: number; // 1 = right, -1 = left
  hipH: number; // hip height above ground
  hipX: number;
  lean: number; // torso lean, degrees, + = forward
  fB: [number, number]; // back foot target (local)
  fF: [number, number]; // front foot target (local)
  hB: [number, number]; // back hand target, relative to shoulder
  hF: [number, number]; // front hand target, relative to shoulder
  tilt: number; // head tilt, degrees, + = looking down/forward
  walk: number; // 0..1 blend of walk cycle (phase follows x)
  mouth: string; // smile | grin | flat | sad | open | o | talk
  brows: string; // none | sad | angry | up | worried
  eyes: string; // open | closed | happy | wide | down | side
  lookX: number; // -1..1 pupil shift
  squash: number; // vertical squash for jumps (1 = none)
  lift: number; // jump height above ground (px)
  spin?: number; // whole-body rotation in the screen plane, degrees (flips; 3D renderer only)
  handsIn?: number; // 0..1 brings both hands to the body's centre line (claps; 3D renderer only)
  talk: number; // 0/1 animates mouth open/close
  opacity: number;
};

export const standPose = (b: Body, x: number, y: number, facing = 1): Pose => ({
  x,
  y,
  facing,
  hipH: b.thigh + b.shin + 8,
  hipX: 0,
  lean: 0,
  fB: [-b.torsoW * 0.18, 0],
  fF: [b.torsoW * 0.18, 0],
  hB: [-6, b.armU + b.armL - 6],
  hF: [6, b.armU + b.armL - 6],
  tilt: 0,
  walk: 0,
  mouth: 'smile',
  brows: 'none',
  eyes: 'open',
  lookX: 0,
  squash: 1,
  lift: 0,
  talk: 0,
  opacity: 1,
});

type P = [number, number];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const mul = (a: P, s: number): P => [a[0] * s, a[1] * s];
const rad = (d: number) => (d * Math.PI) / 180;

/** Two-bone IK. bend = -1 bends toward +x when limb points down (knees), +1 the other way (elbows). */
const ik = (a: P, target: P, l1: number, l2: number, bend: number): [P, P] => {
  let dx = target[0] - a[0];
  let dy = target[1] - a[1];
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.5;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  d = Math.max(d, Math.abs(l1 - l2) + 0.5);
  const ang = Math.atan2(dy, dx);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const j = ang + bend * A;
  const mid: P = [a[0] + l1 * Math.cos(j), a[1] + l1 * Math.sin(j)];
  return [mid, [a[0] + dx, a[1] + dy]];
};

export type Rig = {
  hip: P;
  shoulder: P;
  neckTop: P;
  head: P;
  kneeB: P;
  footB: P;
  kneeF: P;
  footF: P;
  elbowB: P;
  handB: P;
  elbowF: P;
  handF: P;
  dir: P;
};

export const rig = (b: Body, p: Pose, breath = 0): Rig => {
  // walk 0..1 blends a walk cycle in; values above 1 lengthen the stride into a run.
  const stride = (b.thigh + b.shin) * 0.42 * Math.max(1, p.walk);
  const phi = ((p.x * Math.sign(p.facing || 1)) / stride) * Math.PI;
  const w = Math.min(1, p.walk);
  const A = stride * 0.42 * w;
  const lift = (b.thigh + b.shin) * 0.12 * w;
  const fF: P = [p.fF[0] + A * Math.sin(phi), p.fF[1] - lift * Math.max(0, Math.cos(phi))];
  const fB: P = [p.fB[0] - A * Math.sin(phi), p.fB[1] - lift * Math.max(0, -Math.cos(phi))];
  const armA = b.armU * 0.45 * w;
  const hF: P = [p.hF[0] - armA * Math.sin(phi), p.hF[1]];
  const hB: P = [p.hB[0] + armA * Math.sin(phi), p.hB[1]];
  const bob = (b.thigh + b.shin) * 0.035 * w * Math.abs(Math.sin(phi));

  const hip: P = [p.hipX, -(p.hipH - bob)];
  const L = rad(p.lean + 4 * w + 8 * Math.max(0, p.walk - 1));
  const dir: P = [Math.sin(L), -Math.cos(L)];
  const shoulder = add(hip, mul(dir, b.torso * 0.86 + breath));
  const neckTop = add(hip, mul(dir, b.torso + b.neck + breath));
  const H = rad(p.lean + p.tilt);
  const head = add(neckTop, [Math.sin(H) * b.headR * 0.9, -Math.cos(H) * b.headR * 0.9]);
  const [kneeB, footB] = ik(hip, fB.map((v, i) => (i === 1 ? v - 10 : v)) as P, b.thigh, b.shin, -1);
  const [kneeF, footF] = ik(hip, [fF[0], fF[1] - 10], b.thigh, b.shin, -1);
  const sB = add(shoulder, [-5, 0]);
  const [elbowB, handB] = ik(sB, add(sB, hB), b.armU, b.armL, 1);
  const [elbowF, handF] = ik(shoulder, add(shoulder, hF), b.armU, b.armL, 1);
  return {hip, shoulder, neckTop, head, kneeB, footB, kneeF, footF, elbowB, handB, elbowF, handF, dir};
};

/** World position of a rig point (for placing bubbles and props). */
export const toWorld = (p: Pose, pt: P): P => [p.x + pt[0] * p.facing, p.y - p.lift + pt[1] * p.squash];

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + amt))));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const bl = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
};

const line = (pts: P[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');

const OUT = 9; // outline thickness added to strokes

const Limb: React.FC<{pts: P[]; w: number; color: string; outline?: boolean}> = ({pts, w, color, outline = true}) => (
  <>
    {outline && <path d={line(pts)} stroke={C.ink} strokeWidth={w + OUT} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    <path d={line(pts)} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </>
);

const Hair: React.FC<{look: Look; r: number}> = ({look, r}) => {
  const R = r * 1.07;
  const pt = (deg: number, rr = R): P => [Math.cos(rad(deg)) * rr, Math.sin(rad(deg)) * rr];
  const cap = (a1: number, a2: number, ctrl: P) => {
    const p1 = pt(a1);
    const p2 = pt(a2);
    return `M${p1[0]} ${p1[1]} A${R} ${R} 0 1 0 ${p2[0]} ${p2[1]} Q${ctrl[0]} ${ctrl[1]} ${p1[0]} ${p1[1]} Z`;
  };
  const s = {fill: look.hair, stroke: C.ink, strokeWidth: 5, strokeLinejoin: 'round' as const};
  switch (look.hairStyle) {
    case 'messy':
      return (
        <g>
          <path d={cap(-38, 150, [-r * 0.15, -r * 0.62])} {...s} />
          <path d={`M${r * 0.55} ${-r * 0.78} l${r * 0.32} ${-r * 0.1} l${-r * 0.16} ${r * 0.26}`} {...s} />
          <path d={`M${r * 0.05} ${-r * 1.02} l${r * 0.1} ${-r * 0.3} l${r * 0.16} ${r * 0.3}`} {...s} />
          <path d={`M${-r * 0.5} ${-r * 0.92} l${-r * 0.05} ${-r * 0.3} l${r * 0.25} ${r * 0.18}`} {...s} />
        </g>
      );
    case 'swoop':
      return (
        <g>
          <path d={cap(-30, 155, [-r * 0.1, -r * 0.6])} {...s} />
          <path d={`M${r * 0.2} ${-r * 0.95} Q${r * 1.15} ${-r * 0.95} ${r * 1.02} ${-r * 0.25} Q${r * 0.7} ${-r * 0.6} ${r * 0.1} ${-r * 0.55} Z`} {...s} />
        </g>
      );
    case 'short':
      return <path d={cap(-42, 160, [-r * 0.15, -r * 0.7])} {...s} />;
    case 'bun':
      return (
        <g>
          <circle cx={-r * 0.66} cy={-r * 0.86} r={r * 0.48} {...s} />
          <path d={`M${-r * 0.9} ${-r * 0.95} q${r * 0.25} ${r * 0.12} ${r * 0.5} ${-r * 0.02}`} stroke={C.ink} strokeOpacity={0.4} strokeWidth={3} fill="none" />
          <path d={cap(-32, 165, [-r * 0.1, -r * 0.55])} {...s} />
        </g>
      );
    case 'pigtails':
      return (
        <g>
          <circle cx={-r * 0.95} cy={-r * 0.1} r={r * 0.3} {...s} />
          <circle cx={-r * 0.45} cy={-r * 1.0} r={r * 0.27} {...s} />
          <path d={cap(-34, 160, [-r * 0.1, -r * 0.6])} {...s} />
        </g>
      );
  }
};

const Face: React.FC<{p: Pose; r: number; look: Look; t: number; seed: number}> = ({p, r, look, t, seed}) => {
  // blink every ~3.3s, offset per character
  const cyc = (t + seed * 1.7) % 3.3;
  const blink = cyc < 0.12 ? 0.12 : 1;
  const ex1 = r * 0.2 + p.lookX * r * 0.08;
  const ex2 = r * 0.6 + p.lookX * r * 0.08;
  const ey = p.eyes === 'down' ? r * 0.08 : -r * 0.04;
  const rx = r * 0.085;
  const ry = r * 0.13;
  let eyes: React.ReactNode;
  if (p.eyes === 'closed') {
    eyes = (
      <g stroke={C.ink} strokeWidth={4} strokeLinecap="round" fill="none">
        <path d={`M${ex1 - rx} ${ey} q${rx} ${ry * 0.6} ${rx * 2} 0`} />
        <path d={`M${ex2 - rx} ${ey} q${rx} ${ry * 0.6} ${rx * 2} 0`} />
      </g>
    );
  } else if (p.eyes === 'happy') {
    eyes = (
      <g stroke={C.ink} strokeWidth={4.5} strokeLinecap="round" fill="none">
        <path d={`M${ex1 - rx} ${ey + 2} q${rx} ${-ry} ${rx * 2} 0`} />
        <path d={`M${ex2 - rx} ${ey + 2} q${rx} ${-ry} ${rx * 2} 0`} />
      </g>
    );
  } else {
    const k = p.eyes === 'wide' ? 1.3 : 1;
    eyes = (
      <g fill={C.ink}>
        <ellipse cx={ex1} cy={ey} rx={rx * 0.85 * k} ry={ry * blink * k} />
        <ellipse cx={ex2} cy={ey} rx={rx * k} ry={ry * blink * k} />
        {blink === 1 && (
          <>
            <circle cx={ex1 + rx * 0.3} cy={ey - ry * 0.4} r={rx * 0.32} fill="#fff" />
            <circle cx={ex2 + rx * 0.3} cy={ey - ry * 0.4} r={rx * 0.32} fill="#fff" />
          </>
        )}
      </g>
    );
  }
  const by = ey - ry - r * 0.12;
  // inner = +1 when the brow's inner end (toward the other eye) is on its right
  const brow = (cx: number, kind: string, inner: number) => {
    const w = r * 0.2;
    const a = cx - (w / 2) * inner; // outer end
    const b = cx + (w / 2) * inner; // inner end
    switch (kind) {
      case 'sad':
      case 'worried':
        return <path d={`M${a} ${by + 3} L${b} ${by - 7}`} />;
      case 'angry':
        return <path d={`M${a} ${by - 6} L${b} ${by + 5}`} />;
      case 'up':
        return <path d={`M${cx - w / 2} ${by - 6} q${w / 2} ${-6} ${w} 0`} />;
      default:
        return null;
    }
  };
  const mx = r * 0.42;
  const my = r * 0.4;
  const talkOpen = p.talk > 0 ? Math.abs(Math.sin(t * 22)) : 0;
  let mouth: React.ReactNode;
  const m = p.talk > 0 && talkOpen > 0.35 ? 'talkO' : p.mouth;
  switch (m) {
    case 'grin':
      mouth = <path d={`M${mx - r * 0.2} ${my - 4} Q${mx} ${my + r * 0.3} ${mx + r * 0.2} ${my - 4} Z`} fill="#7a2a2a" stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />;
      break;
    case 'open':
    case 'talkO':
      mouth = <ellipse cx={mx} cy={my + 2} rx={r * 0.11} ry={r * (m === 'talkO' ? 0.08 + 0.06 * talkOpen : 0.14)} fill="#7a2a2a" stroke={C.ink} strokeWidth={4} />;
      break;
    case 'o':
      mouth = <circle cx={mx} cy={my + 2} r={r * 0.08} fill="#7a2a2a" stroke={C.ink} strokeWidth={4} />;
      break;
    case 'sad':
      mouth = <path d={`M${mx - r * 0.13} ${my + 6} Q${mx} ${my - 6} ${mx + r * 0.13} ${my + 6}`} stroke={C.ink} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
      break;
    case 'flat':
      mouth = <path d={`M${mx - r * 0.11} ${my + 2} L${mx + r * 0.11} ${my + 2}`} stroke={C.ink} strokeWidth={4.5} strokeLinecap="round" />;
      break;
    case 'smile':
    default:
      mouth = <path d={`M${mx - r * 0.14} ${my - 2} Q${mx} ${my + r * 0.16} ${mx + r * 0.14} ${my - 2}`} stroke={C.ink} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
  }
  return (
    <g>
      {look.blush && <ellipse cx={r * 0.05} cy={r * 0.3} rx={r * 0.14} ry={r * 0.08} fill="#ff8a8a" opacity={0.45} />}
      {eyes}
      <g stroke={C.ink} strokeWidth={4.5} strokeLinecap="round" fill="none">
        {brow(ex1, p.brows, 1)}
        {brow(ex2, p.brows, -1)}
      </g>
      {mouth}
      {look.glasses && (
        <g stroke={C.ink} strokeWidth={3.5} fill="none">
          <circle cx={ex1} cy={ey} r={r * 0.17} />
          <circle cx={ex2} cy={ey} r={r * 0.17} />
        </g>
      )}
    </g>
  );
};

type Props = {
  body: Body;
  look: Look;
  pose: Pose;
  t: number;
  seed?: number;
  holdF?: React.ReactNode; // drawn at front hand (local, unflipped content flips with character)
  holdB?: React.ReactNode;
  holdFRot?: number;
  holdBRot?: number;
  shadow?: boolean;
};

export const Person: React.FC<Props> = ({body: b, look, pose: p, t, seed = 1, holdF, holdB, holdFRot = 0, holdBRot = 0, shadow = true}) => {
  const r = rig(b, p, Math.sin(t * 2.3 + seed * 1.9) * b.torso * 0.012);
  const back = shade(look.shirt, -0.18);
  const pantsB = shade(look.pants, -0.2);
  const sleeveF = look.shirt;
  const shoe = (f: P, k: P, color: string) => {
    const dirx = 1; // shoes always point forward
    return (
      <g>
        <ellipse cx={f[0] + dirx * b.legW * 0.35} cy={f[1] + 4} rx={b.legW * 0.78} ry={b.legW * 0.42} fill={color} stroke={C.ink} strokeWidth={5} />
      </g>
    );
  };
  const pelvisTop = add(r.hip, mul(r.dir, b.torsoW * 0.32));
  const torsoBot = add(r.hip, mul(r.dir, b.torsoW * 0.42));
  const torsoTop = add(r.hip, mul(r.dir, b.torso - b.torsoW * 0.36));
  const stripeC = add(r.hip, mul(r.dir, b.torso * 0.62));
  const perp: P = [-r.dir[1], r.dir[0]];
  return (
    <g opacity={p.opacity}>
      {shadow && (
        <ellipse cx={p.x + p.hipX * p.facing} cy={p.y + 6} rx={b.torsoW * 0.95 * (1 - Math.min(0.5, p.lift / 300))} ry={11} fill="#000" opacity={0.18} />
      )}
      <g transform={`translate(${p.x} ${p.y - p.lift}) scale(${p.facing} ${p.squash})`}>
        {/* back arm */}
        <g>
          <Limb pts={[add(r.shoulder, [-5, 0]), r.elbowB, r.handB]} w={b.armW} color={back} />
          <circle cx={r.handB[0]} cy={r.handB[1]} r={b.armW * 0.58} fill={shade(look.skin, -0.1)} stroke={C.ink} strokeWidth={5} />
          {holdB && <g transform={`translate(${r.handB[0]} ${r.handB[1]}) rotate(${holdBRot})`}>{holdB}</g>}
        </g>
        {/* outlines for silhouette */}
        <path d={line([r.hip, r.kneeB, r.footB])} stroke={C.ink} strokeWidth={b.legW + OUT} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={line([r.hip, r.kneeF, r.footF])} stroke={C.ink} strokeWidth={b.legW + OUT} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={line([r.hip, pelvisTop])} stroke={C.ink} strokeWidth={b.torsoW * 0.86 + OUT} strokeLinecap="round" />
        <path d={line([torsoBot, torsoTop])} stroke={C.ink} strokeWidth={b.torsoW + OUT} strokeLinecap="round" />
        <path d={line([torsoTop, r.neckTop])} stroke={C.ink} strokeWidth={b.headR * 0.42 + OUT} strokeLinecap="round" />
        {/* legs */}
        <path d={line([r.hip, r.kneeB, r.footB])} stroke={pantsB} strokeWidth={b.legW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {shoe(r.footB, r.kneeB, shade(look.shoes, -0.15))}
        <path d={line([r.hip, r.kneeF, r.footF])} stroke={look.pants} strokeWidth={b.legW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {shoe(r.footF, r.kneeF, look.shoes)}
        <path d={line([r.hip, pelvisTop])} stroke={look.pants} strokeWidth={b.torsoW * 0.86} strokeLinecap="round" />
        {/* neck + torso */}
        <path d={line([torsoTop, r.neckTop])} stroke={shade(look.skin, -0.12)} strokeWidth={b.headR * 0.42} strokeLinecap="round" />
        <path d={line([torsoBot, torsoTop])} stroke={look.shirt} strokeWidth={b.torsoW} strokeLinecap="round" />
        {look.stripe && (
          <path
            d={line([add(stripeC, mul(perp, b.torsoW * 0.49)), add(stripeC, mul(perp, -b.torsoW * 0.49))])}
            stroke={look.stripe}
            strokeWidth={b.torsoW * 0.16}
          />
        )}
        {/* soft highlight on torso */}
        <path d={line([add(torsoBot, mul(perp, -b.torsoW * 0.22)), add(torsoTop, mul(perp, -b.torsoW * 0.22))])} stroke="#fff" strokeOpacity={0.14} strokeWidth={b.torsoW * 0.18} strokeLinecap="round" />
        {/* head */}
        <g transform={`translate(${r.head[0]} ${r.head[1]}) rotate(${p.lean * 0.5 + p.tilt})`}>
          <circle r={b.headR} fill={look.skin} stroke={C.ink} strokeWidth={5.5} />
          <ellipse cx={-b.headR * 0.32} cy={b.headR * 0.08} rx={b.headR * 0.13} ry={b.headR * 0.17} fill={shade(look.skin, -0.12)} stroke={C.ink} strokeWidth={4} />
          <Hair look={look} r={b.headR} />
          <Face p={p} r={b.headR} look={look} t={t} seed={seed} />
        </g>
        {/* front arm */}
        <g>
          <Limb pts={[r.shoulder, r.elbowF, r.handF]} w={b.armW} color={sleeveF} />
          <circle cx={r.handF[0]} cy={r.handF[1]} r={b.armW * 0.6} fill={look.skin} stroke={C.ink} strokeWidth={5} />
          {holdF && <g transform={`translate(${r.handF[0]} ${r.handF[1]}) rotate(${holdFRot})`}>{holdF}</g>}
        </g>
      </g>
    </g>
  );
};
