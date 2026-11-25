/**
 * EP01 (3D) — "Same kid. Same drawing."  Same story beats and score as the 2D cut, rebuilt in Three.js:
 * lit sets, soft shadows, animated camera, toy-like characters, squash & stretch.
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BODIES, Body, Pose, standPose} from '../components/Person';
import {Bubble, ClockChip, Counter, EmojiPop, Header} from '../components/Overlay';
import {BEATS, Band, EndCard, Flash, Hook, END_AT, SFX_GAIN} from './Ep01Drawing';
import {C, FONT, GROUND, LOOKS, Look, PANEL_H, TOP_Y, BOT_Y, W} from '../lib/theme';
import {Keyed, clamp, kf, lerp, pop, prog, track} from '../lib/anim';
import {Stage, Cam, projector} from '../three/Stage';
import {Actor, Person3D, handWorld, headWorld} from '../three/Person3D';
import {Bedroom3D, Chair3D, FramedPainting3D, Kitchen3D} from '../three/Sets3D';
import {Book3D, FallingPaper3D, Gift3D, Markers3D, Paper3D, Phone3D, Sketchbook3D} from '../three/Props3D';
import {DrawingKind, Card, U, V3, X, tex} from '../three/core';

type Side = 'scroll' | 'look';
type Proj = (p: V3) => [number, number];
type Out3 = {scene: React.ReactNode; overlay: React.ReactNode; cam: Cam};

const G = GROUND;
const BASE: Cam = {pos: [0, 3.25, 13.0], target: [0, 2.62, 0], fov: 30};
const v3lerp = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];

/** Intro swoop at the start of every beat + optional push-in on a focus point. */
const camAt = (lt: number, focus?: {p: V3; amt: number; dist?: number}): Cam => {
  const sw = 1 - prog(lt, 0, 1.2, 'out');
  let pos: V3 = [BASE.pos[0] + 1.8 * sw, BASE.pos[1] + 0.8 * sw, BASE.pos[2] - 2.2 * sw];
  let target: V3 = [BASE.target[0] + 0.5 * sw, BASE.target[1], BASE.target[2]];
  if (focus && focus.amt > 0) {
    focus = {...focus, amt: Math.min(0.38, focus.amt), p: [focus.p[0], Math.max(2.35, focus.p[1]), focus.p[2]]};
    const d = focus.dist ?? 0.6;
    const off: V3 = [(BASE.pos[0] - BASE.target[0]) * d, (BASE.pos[1] - BASE.target[1]) * d, (BASE.pos[2] - BASE.target[2]) * d];
    pos = v3lerp(pos, [focus.p[0] + off[0], focus.p[1] + off[1], focus.p[2] + off[2]], focus.amt);
    target = v3lerp(target, focus.p, focus.amt);
  }
  return {pos, target, fov: BASE.fov};
};

const P = (b: Body, x: number, facing: number, extra: Partial<Pose> = {}): Pose => ({...standPose(b, x, G, facing), ...extra});
const tr = (t: number, base: Pose, keys: Keyed<Pose>[]) => track(t, base as unknown as Record<string, never>, keys as never) as unknown as Pose;

/** Build an actor at time t, with automatic stretch in the air and a squash on landing. */
const act = (key: string, body: Body, look: Look, base: Pose, keys: Keyed<Pose>[], t: number, z: number | [number, number, ('in' | 'out' | 'inOut')?][] = 0, seed = 1): Actor => {
  const pose = tr(t, base, keys);
  const prev = tr(t - 1 / 30, base, keys).lift;
  const v = (pose.lift - prev) * 30;
  let sq = pose.squash;
  if (pose.lift > 1) sq *= 1 + Math.min(0.12, Math.abs(v) * 0.0005);
  else {
    for (let k = 1; k <= 3; k++) if (tr(t - k / 30, base, keys).lift > 1) sq *= 0.92;
  }
  const zz = typeof z === 'number' ? z : kf(t, z);
  return {key, body, look, pose: {...pose, squash: sq}, z: zz, seed};
};

// ---------- overlay helpers (project 3D heads to panel px) ----------
const headPx = (proj: Proj, a: Actor, t: number) => {
  const h = headWorld(a, t);
  const c = proj(h);
  const top = proj([h[0], h[1] + a.body.headR * U, h[2]]);
  return {c, r: Math.max(8, c[1] - top[1])};
};
const above = (proj: Proj, a: Actor, t: number, dy = 12): [number, number] => {
  const {c, r} = headPx(proj, a, t);
  return [c[0], c[1] - r - dy];
};
const tip = (proj: Proj, a: Actor, t: number): [number, number, 'left' | 'right'] => {
  const {c, r} = headPx(proj, a, t);
  const f = Math.sign(a.pose.facing || 1);
  return [c[0] + f * (r + 10), c[1] - r * 0.2, f < 0 ? 'left' : 'right'];
};

/** "quote" — speaker, N years ago */
const Callback: React.FC<{t: number; from: number; to: number; x: number; y: number; quote: string; by: string}> = ({t, from, to, x, y, quote, by}) => {
  if (t < from || t > to + 0.3) return null;
  const s = pop(t, from, 0.5);
  const o = t > to ? 1 - (t - to) / 0.3 : 1;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: '0 50%', opacity: clamp(o * 1.5), fontFamily: FONT, color: '#fff', textShadow: `0 3px 0 ${C.ink}, 0 0 14px rgba(0,0,0,0.6)`}}>
      <div style={{fontSize: 44, fontWeight: 700, fontStyle: 'italic'}}>“{quote}”</div>
      <div style={{fontSize: 27, fontWeight: 600, fontStyle: 'italic', marginLeft: 40, color: '#efe9ff'}}>— {by}</div>
    </div>
  );
};

/** Paper-style pop-up card (e.g. contest entry). */
const PopCard: React.FC<{t: number; from: number; to: number}> = ({t, from, to}) => {
  if (t < from || t > to + 0.25) return null;
  const s = pop(t, from, 0.5);
  const o = t > to ? 1 - (t - to) / 0.25 : 1;
  const stamp = pop(t, from + 0.55, 0.4);
  return (
    <div style={{position: 'absolute', left: 36, top: 96, width: 380, transform: `rotate(-4deg) scale(${s * o})`, transformOrigin: '20% 20%', background: '#fffdf6', border: `4px solid ${C.ink}`, borderRadius: 14, padding: '16px 20px', boxShadow: `0 8px 0 ${C.ink}`, fontFamily: FONT, color: C.ink}}>
      <div style={{fontSize: 30, fontWeight: 700}}>CITY ART CONTEST 🏆</div>
      <div style={{fontSize: 22, fontWeight: 500, marginTop: 8, color: '#5a5266'}}>Entrant: Leo, 16</div>
      <div style={{fontSize: 22, fontWeight: 500, color: '#5a5266'}}>Signed up by: <b style={{color: C.ink}}>Mom</b></div>
      <div style={{position: 'absolute', right: 16, bottom: 10, fontSize: 30, fontWeight: 700, color: '#2fa36b', border: '4px solid #2fa36b', borderRadius: 10, padding: '0 10px', transform: `rotate(-12deg) scale(${stamp})`}}>ENTERED ✓</div>
    </div>
  );
};

/** Pinned drawing that flies the last bit from the hand onto the fridge door. */
const Pin: React.FC<{t: number; at: number; from: V3; to: V3; kind: DrawingKind}> = ({t, at, from, to, kind}) => {
  const p = prog(t, at - 0.25, at, 'inOut');
  const pos = v3lerp(from, to, p);
  const s = t > at ? 1 + 0.08 * (1 - pop(t, at, 0.35)) : 1;
  return (
    <group position={pos} rotation={[0, 0, -0.06 * p]} scale={s}>
      <Paper3D p={[0, 0, 0]} kind={kind} w={0.8} />
    </group>
  );
};

// =====================================================================
// BEAT 1 — AGE 5 (also reused for 25 YEARS LATER with leoAdult = true)
// =====================================================================
const beat1 = (t: number, side: Side, leoAdult = false): Out3 => {
  const pb = leoAdult ? BODIES.man : BODIES.mom;
  const parentLook = leoAdult ? LOOKS.leoAdult : LOOKS.mom;
  const kb = BODIES.age5;
  const kidLook = leoAdult ? LOOKS.mia : LOOKS.leo;
  const kind: DrawingKind = leoAdult ? 'portrait' : 'family';
  const stand = pb.thigh + pb.shin + 8;
  const kidKeys: Keyed<Pose>[] = [
    {t: 0, x: 1150, walk: 2, hF: [62, -6], hB: [52, 2], mouth: 'grin', eyes: 'happy'},
    {t: 0.95, x: 650, e: 'out'},
    {t: 1.1, walk: 0, e: 'out'},
  ];
  const parKeys: Keyed<Pose>[] = [{t: 0, x: 430, hF: [40, 44], hB: [30, 52], tilt: 24, eyes: 'down', mouth: 'flat'}];
  let parZ: [number, number, ('in' | 'out' | 'inOut')?][] = [[0, 0]];
  let held: 'kid' | 'parent' | 'none' = 'kid';
  let phone = true;
  let focus: {p: V3; amt: number} | undefined;
  const items: React.ReactNode[] = [];
  const html: React.ReactNode[] = [];
  const pinTo: V3 = leoAdult ? [-4.0, 3.45, -0.72] : [-3.78, 2.45, -0.72];

  if (side === 'scroll') {
    kidKeys.push(
      {t: 2.0, mouth: 'smile', eyes: 'open'},
      {t: 2.3, hF: [62, -6], hB: [52, 2]},
      {t: 3.0, hF: [56, 10], hB: [46, 16], tilt: 6, mouth: 'flat', brows: 'worried'},
      {t: 3.9, hF: [14, 58], hB: [-6, 66], tilt: 18, eyes: 'down', mouth: 'sad', brows: 'sad'},
      {t: 4.4, facing: -1},
      {t: 4.6, facing: 1, e: 'linear'},
      {t: 4.7, walk: 0.8},
      {t: 6.2, x: 1230, e: 'linear'},
    );
    parKeys.push({t: 4.8, mouth: 'flat'}, {t: 5.0, mouth: 'grin', eyes: 'happy'});
    held = t < 4.0 ? 'kid' : 'none';
    focus = {p: [X(650), 1.6, 0.3], amt: kf(t, [[2.9, 0], [4.3, 0.5], [5.3, 0.5], [6.2, 0.2]])};
  } else {
    kidKeys.push(
      {t: 2.4, hF: [62, -6], hipH: kb.thigh + kb.shin + 8},
      {t: 2.55, hipH: kb.thigh + kb.shin - 6, lift: 0, eyes: 'happy', mouth: 'grin'},
      {t: 2.78, hipH: kb.thigh + kb.shin + 8, lift: 50, e: 'out'},
      {t: 3.0, lift: 0, e: 'in'},
      {t: 3.15, hF: [66, -2]},
      {t: 3.4, hF: [10, 58], hB: [-6, 66], mouth: 'open'},
      {t: 3.75, facing: 1, mouth: 'grin'},
      {t: 3.95, facing: -1, e: 'linear'},
      {t: 4.0, walk: 1},
      {t: 4.95, x: 470, e: 'inOut'},
      {t: 5.05, walk: 0},
      {t: 5.35, hipH: kb.thigh + kb.shin - 6},
      {t: 5.55, hipH: kb.thigh + kb.shin + 8, lift: 44, e: 'out'},
      {t: 5.75, lift: 0, e: 'in'},
    );
    parKeys.push(
      {t: 1.15, tilt: 24},
      {t: 1.45, tilt: 4, lookX: 0.6, eyes: 'wide', mouth: 'o', brows: 'up', hF: [10, 116], e: 'out'},
      {t: 1.75},
      {t: 2.35, x: 500, hipH: leoAdult ? 104 : 100, lean: 12, fF: [46, 0], fB: [-90, 0], tilt: 10, hF: [40, 70], hB: [30, 80], mouth: 'open', eyes: 'open'},
      {t: 3.0, hF: [88, -34], hB: [74, -26], mouth: 'grin', eyes: 'happy', brows: 'none', tilt: -4},
      {t: 3.55, hipH: stand, lean: 0, fF: [14, 0], fB: [-14, 0], tilt: 0, eyes: 'open', hF: [60, 40], hB: [30, 90]},
      {t: 3.65, facing: 1},
      {t: 3.82, facing: -1, e: 'linear'},
      {t: 3.9, walk: 1, mouth: 'talk', talk: 1},
      {t: 4.75, x: 305, e: 'inOut'},
      {t: 4.85, walk: 0, talk: 0, mouth: 'smile', hF: [60, 40]},
      {t: 5.15, hF: leoAdult ? [120, -40] : [126, 44], tilt: leoAdult ? -14 : -4, e: 'out'},
      {t: 5.45, hF: leoAdult ? [120, -40] : [126, 44]},
      {t: 5.85, hF: [10, 116], tilt: 4, mouth: 'smile'},
      {t: 5.9, facing: -1},
      {t: 6.05, facing: 1, e: 'linear'},
    );
    parZ = [[0, 0], [3.9, 0], [4.75, -0.45, 'inOut']];
    phone = t < 1.7;
    held = t < 3.05 ? 'kid' : t < 4.95 ? 'parent' : 'none';
    focus = {p: [X(560), 2.0, 0.1], amt: kf(t, [[1.6, 0], [2.6, 0.38], [3.6, 0.38], [4.6, 0]])};
    if (leoAdult) focus = {p: [-3.6, 2.8, -0.6], amt: kf(t, [[1.6, 0], [2.6, 0.35], [3.6, 0.3], [4.6, 0], [5.4, 0.45]])};
  }
  const kid = act(leoAdult ? 'mia' : 'leo5', kb, kidLook, P(kb, 1150, -1), kidKeys, t, 0.25, 5);
  const par = act(leoAdult ? 'leoAdult' : 'mom', pb, parentLook, P(pb, 430, 1), parKeys, t, parZ, 2);
  const cam = camAt(t, focus);
  const proj = projector(cam);

  // props
  const kh = handWorld(kid, t);
  const ph = handWorld(par, t);
  if (held === 'kid') items.push(<Paper3D key="kp" p={kh} kind={kind} w={0.8} rot={[0, -0.35, 0.05]} />);
  if (held === 'parent') items.push(<Paper3D key="pp" p={ph} kind={kind} w={0.8} rot={[0, side === 'look' && t > 3.6 ? 0.2 : 0.35, 0]} />);
  if (phone) items.push(<Phone3D key="ph" p={ph} rot={[-0.2, -0.5, 0]} glow={side === 'scroll' ? 1 : 0.6} />);
  if (side === 'scroll') {
    const drop = handWorld(act('k', kb, kidLook, P(kb, 1150, -1), kidKeys, 4.0, 0.25), 4.0);
    items.push(<FallingPaper3D key="fall" t={t} at={4.0} from={drop} kind={kind} w={0.8} />);
  } else if (t >= 4.7) {
    const from = handWorld(act('p', pb, parentLook, P(pb, 430, 1), parKeys, 4.95, parZ), 4.95);
    items.push(<Pin key="pin" t={t} at={5.15} from={from} to={pinTo} kind={kind} />);
  }
  if (side === 'look' && leoAdult) {
    items.push(<Paper3D key="old" p={[-3.78, 2.45, -0.73]} kind="family" w={0.8} tint="#efd9a8" />);
    items.push(<Paper3D key="m1" p={[-4.45, 0.75, -0.73]} kind="sun" w={0.62} rot={[0, 0, 0.08]} />);
    items.push(<Paper3D key="m2" p={[-3.45, 0.85, -0.73]} kind="dog" w={0.6} rot={[0, 0, -0.06]} />);
  }

  // dialogue
  const kTop = above(proj, kid, t, 6);
  const pTip = tip(proj, par, t);
  const who = leoAdult ? 'his mom, 25 years ago' : '';
  html.push(<Bubble key="k1" t={t} from={1.0} to={side === 'scroll' ? 1.95 : 2.2} x={kTop[0] - 10} y={kTop[1]} text="LOOK!! I MADE THIS! 🖍️" side="right" />);
  if (side === 'scroll') {
    html.push(<Bubble key="p1" t={t} from={2.05} to={3.2} x={pTip[0]} y={pTip[1]} text="mm-hm 👍" kind="mutter" side={pTip[2]} size={34} />);
    html.push(<Bubble key="k2" t={t} from={3.0} to={3.9} x={kTop[0] - 10} y={kTop[1]} text={leoAdult ? "it's you and me…" : "it's you and me…"} side="right" size={30} kind="mutter" />);
    html.push(<EmojiPop key="e1" t={t} from={4.1} to={5.6} x={kTop[0]} y={kTop[1] - 30} e="😞" />);
    html.push(<EmojiPop key="e2" t={t} from={5.0} to={6.1} x={pTip[0] + 34} y={pTip[1] - 30} e="😂" size={56} />);
    if (leoAdult) html.push(<Callback key="cb" t={t} from={2.6} to={5.2} x={28} y={104} quote="mm-hm 👍" by={who} />);
  } else {
    html.push(<Bubble key="p1" t={t} from={2.3} to={3.3} x={pTip[0]} y={pTip[1] - 16} text={'WAIT… IS THIS ME?? 😍'} kind="shout" side={pTip[2]} />);
    html.push(<Bubble key="k2" t={t} from={3.35} to={4.2} x={kTop[0] - 10} y={kTop[1]} text={leoAdult ? "AND THAT'S ME! 👧" : "AND THAT'S ME! 👦"} side="right" size={32} />);
    html.push(<Bubble key="p2" t={t} from={4.25} to={5.2} x={pTip[0]} y={pTip[1]} text={leoAdult ? 'Next to MINE. 🖍️' : 'This goes on the FRIDGE.'} side={pTip[2]} size={32} />);
    html.push(<EmojiPop key="e1" t={t} from={5.3} to={6.3} x={kTop[0] + 10} y={kTop[1] - 36} e="🥰" />);
    const star = proj([pinTo[0], pinTo[1] + 0.75, pinTo[2]]);
    html.push(<EmojiPop key="e2" t={t} from={5.2} to={6.3} x={star[0] + 50} y={star[1]} e={leoAdult ? '🥹' : '⭐'} size={56} />);
    if (leoAdult) html.push(<Callback key="cb" t={t} from={2.75} to={4.15} x={28} y={104} quote="WAIT… IS THIS ME??" by={who} />);
  }

  const scene = (
    <Kitchen3D palette={leoAdult ? 'new' : 'old'} bills={side === 'scroll'} warm={side === 'look'} fridgeArt={0} wallExtra={leoAdult && side === 'look' ? <FramedPainting3D p={[1.1, 2.9, -2.33]} /> : null}>
      <Person3D a={par} t={t} />
      <Person3D a={kid} t={t} />
      {items}
    </Kitchen3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

// =====================================================================
// BEAT 2 — AGE 8 (kitchen table, evening)
// =====================================================================
const beat2 = (t: number, side: Side): Out3 => {
  const pb = BODIES.mom;
  const kb = BODIES.age8;
  const momBase = P(pb, 762, -1, {hipH: 122, fF: [70, 0], fB: [54, 0], lean: -2, hF: [70, 56], hB: [60, 60], tilt: 22, eyes: 'down', mouth: 'flat'});
  const momKeys: Keyed<Pose>[] = [{t: 0}];
  const kidKeys: Keyed<Pose>[] = [
    {t: 0, x: -120, walk: 1.3, hF: [74, -10], hB: [64, -2], mouth: 'grin', eyes: 'happy'},
    {t: 1.0, x: 330, e: 'out'},
    {t: 1.15, walk: 0, e: 'out'},
  ];
  const html: React.ReactNode[] = [];
  let held = true;
  let fold = 1;
  let phoneInHand = true;
  let focus: {p: V3; amt: number} | undefined;
  if (side === 'scroll') {
    momKeys.push({t: 2.3}, {t: 2.5, hB: [40, -10], e: 'out'}, {t: 2.75, hB: [50, 4]}, {t: 2.95, hB: [40, -10]}, {t: 3.2, hB: [60, 60]});
    kidKeys.push(
      {t: 2.4, mouth: 'smile', eyes: 'open'},
      {t: 3.0, hF: [74, -10]},
      {t: 3.6, hF: [40, 30], hB: [30, 40], tilt: 14, eyes: 'down', mouth: 'flat', brows: 'sad'},
      {t: 4.0, hF: [-6, 86], hB: [-6, 88]},
      {t: 4.35, facing: 1},
      {t: 4.5, facing: -1, e: 'linear'},
      {t: 4.55, walk: 0.8, mouth: 'sad'},
      {t: 5.6, x: -80, e: 'linear'},
    );
    fold = kf(t, [[3.45, 1], [3.9, 0.35]]);
    held = t < 4.0;
    focus = {p: [X(330), 1.9, 0.3], amt: kf(t, [[3.0, 0], [4.2, 0.4], [5.6, 0.3]])};
  } else {
    momKeys.push(
      {t: 1.25},
      {t: 1.55, tilt: 0, lookX: 0.5, eyes: 'wide', mouth: 'o', brows: 'up', hF: [56, 40], e: 'out'},
      {t: 2.3, mouth: 'open', eyes: 'open'},
      {t: 3.3, mouth: 'grin'},
      {t: 3.6, hF: [30, -110], hB: [20, -104], eyes: 'happy', e: 'out'},
      {t: 4.4, hF: [30, -110], mouth: 'talk', talk: 1},
      {t: 5.0, hF: [70, 56], hB: [60, 60], eyes: 'open', mouth: 'smile', talk: 0},
    );
    kidKeys.push(
      {t: 3.3, mouth: 'open'},
      {t: 3.45, hipH: kb.thigh + kb.shin - 8, eyes: 'happy', mouth: 'grin'},
      {t: 3.68, hipH: kb.thigh + kb.shin + 8, lift: 54, e: 'out', hF: [40, -70], hB: [30, -66]},
      {t: 3.9, lift: 0, e: 'in'},
      {t: 4.1, lift: 54, e: 'out'},
      {t: 4.32, lift: 0, e: 'in'},
    );
    phoneInHand = t < 1.5;
    const rp = clamp((t - 3.7) / 1.4);
    if (t > 3.7 && t < 5.2)
      html.push(
        <div key="rk" style={{position: 'absolute', left: 300 + rp * 640, top: 300 - rp * 270, fontSize: 74, fontFamily: "'Noto Color Emoji'", transform: `rotate(${-10 + rp * 5}deg)`, opacity: 1 - clamp((rp - 0.85) / 0.15)}}>
          🚀
        </div>,
      );
    focus = {p: [0.2, 2.2, 0], amt: kf(t, [[2.0, 0], [2.8, 0.25], [4.6, 0.25], [5.6, 0]])};
  }
  const mom = act('mom', pb, LOOKS.mom, momBase, momKeys, t, 0, 2);
  const kid = act('leo8', kb, LOOKS.leo, P(kb, -120, 1), kidKeys, t, 0.3, 5);
  const cam = camAt(t, focus);
  const proj = projector(cam);
  const kTop = above(proj, kid, t, 6);
  const mTip = tip(proj, mom, t);
  html.push(<Bubble key="k" t={t} from={1.05} to={2.2} x={kTop[0] - 10} y={kTop[1]} text="I DREW YOU IN A ROCKET 🚀" side="right" />);
  if (side === 'scroll') {
    html.push(<Bubble key="m" t={t} from={2.3} to={3.3} x={mTip[0]} y={mTip[1]} text="not now, buddy 📱" kind="mutter" side="left" size={34} />);
    html.push(<Bubble key="k2" t={t} from={3.35} to={4.15} x={kTop[0] - 10} y={kTop[1]} text="but you're the pilot…" kind="mutter" side="right" size={30} />);
    html.push(<EmojiPop key="e" t={t} from={4.1} to={5.4} x={kTop[0]} y={kTop[1] - 30} e="😔" />);
  } else {
    html.push(<Bubble key="m" t={t} from={2.3} to={3.2} x={mTip[0]} y={mTip[1]} text="WHO'S FLYING IT?!" kind="shout" side="left" />);
    html.push(<Bubble key="k2" t={t} from={3.3} to={4.3} x={kTop[0] - 10} y={kTop[1] + 10} text="YOU ARE!! 🚀" side="right" />);
    html.push(<Bubble key="m2" t={t} from={4.4} to={5.4} x={mTip[0]} y={mTip[1]} text="Strap in, Captain! 🫡" side="left" size={32} />);
  }
  const kh = handWorld(kid, t);
  const mh = handWorld(mom, t);
  const scene = (
    <Kitchen3D palette="old" table sky="evening" bills={side === 'scroll'} warm={side === 'look'} fridgeArt={side === 'look' ? 9 : 0}>
      {side === 'look' && <Paper3D p={[-3.78, 2.45, -0.73]} kind="family" w={0.8} />}
      <Chair3D x={2.36} seat={1.12} facing={-1} color="#9a6640" />
      <Person3D a={mom} t={t} />
      {phoneInHand ? <Phone3D p={mh} rot={[-0.3, 0.5, 0]} glow={side === 'scroll' ? 1 : 0.5} /> : (
        <group position={[1.15, 1.41, 0.25]} rotation={[-Math.PI / 2, 0, 0.3]}>
          <mesh scale={[0.28, 0.52, 0.04]}>
            <boxGeometry />
            <meshStandardMaterial color="#1c1c26" roughness={0.3} />
          </mesh>
        </group>
      )}
      <Person3D a={kid} t={t} />
      {held && <Paper3D p={kh} kind="rocket" w={0.9} fold={fold} rot={[0, 0.35, 0]} />}
    </Kitchen3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

// =====================================================================
// BEAT 3 — AGE 12 (bedroom, dusk)
// =====================================================================
const beat3 = (t: number, side: Side): Out3 => {
  const pb = BODIES.mom;
  const kb = BODIES.age12;
  const sit: Partial<Pose> = {hipH: 96, fF: [62, 0], fB: [46, 0], hF: [70, 22], hB: [60, 30], tilt: 22, eyes: 'down', mouth: 'smile'};
  const kidKeys: Keyed<Pose>[] = [{t: 0}];
  for (let s = 0.05; s < 1.2; s += 0.18) kidKeys.push({t: s, hF: [70 + Math.sin(s * 9) * 10, 20 + Math.cos(s * 7) * 6]});
  const momKeys: Keyed<Pose>[] = [{t: 0, facing: 0, walk: 0, hF: [10, 118], hB: [10, 118]}];
  let momZ: [number, number, ('in' | 'out' | 'inOut')?][] = [[0, -3.0], [1.0, -3.0], [1.6, -1.55, 'out']];
  let door = kf(t, [[0.85, 0], [1.25, 1, 'out']]);
  const html: React.ReactNode[] = [];
  let book: React.ReactNode = <Sketchbook3D p={[1.75, 1.66, 0.05]} rot={[0, 0.1, 0]} open={1} />;
  let gift: 'none' | 'box' | 'markers' = 'none';
  let kidZ: number | [number, number, ('in' | 'out' | 'inOut')?][] = 0;
  let focus: {p: V3; amt: number} | undefined;
  if (side === 'scroll') {
    kidKeys.push(
      {t: 1.3, tilt: 0, lookX: 0.6, eyes: 'wide', mouth: 'o'},
      {t: 2.85, mouth: 'talk', talk: 1, eyes: 'open', brows: 'worried'},
      {t: 3.6, mouth: 'flat', talk: 0},
      {t: 3.75, hF: [70, 22]},
      {t: 3.95, hF: [100, 30], e: 'out'},
      {t: 4.3, hF: [130, 70], e: 'inOut'},
      {t: 4.6, hF: [70, 22], tilt: 18, eyes: 'down', brows: 'sad'},
    );
    momKeys.push({t: 1.0, walk: 0.8}, {t: 1.6, walk: 0}, {t: 1.75, facing: -1, mouth: 'talk', talk: 1, brows: 'angry'}, {t: 2.8, talk: 0, mouth: 'flat'}, {t: 3.65, talk: 1, mouth: 'talk'}, {t: 4.6, talk: 0, mouth: 'flat'});
    door = kf(t, [[0.85, 0], [1.25, 1, 'out'], [4.7, 1], [5.15, 0, 'in']]);
    momZ = [[0, -3.0], [1.0, -3.0], [1.6, -1.55, 'out'], [4.6, -1.55], [4.95, -2.9, 'inOut']];
    if (t > 5.1) momKeys.push({t: 5.1, opacity: 0, e: 'step'});
    const p = prog(t, 3.8, 4.35, 'inOut');
    const bp = v3lerp([1.75, 1.66, 0.05], [3.25, 1.1, 0.55], p);
    book =
      t < 4.35 ? <Sketchbook3D p={bp} rot={[0, 0.1, 0]} open={t < 3.75 ? 1 : 0} /> : <Book3D p={[1.75, 1.66, 0.05]} rot={[0, 0.15, 0]} />;
    focus = {p: [X(600), 2.0, 0], amt: kf(t, [[4.4, 0], [5.4, 0.4]])};
  } else {
    kidKeys.push(
      {t: 1.3, tilt: 0, lookX: 0.6, eyes: 'open', mouth: 'smile'},
      {t: 2.45, mouth: 'open', eyes: 'wide', brows: 'up'},
      {t: 2.75, hipH: kb.thigh + kb.shin + 8, x: 560, fF: [14, 0], fB: [-14, 0], hF: [50, 40], hB: [40, 46], e: 'out'},
      {t: 3.15, hF: [50, -20], hB: [40, -14], mouth: 'grin', eyes: 'happy'},
      {t: 3.3, hipH: kb.thigh + kb.shin - 8},
      {t: 3.5, hipH: kb.thigh + kb.shin + 8, hF: [36, -96], hB: [24, -92], lift: 34, e: 'out'},
      {t: 3.7, lift: 0, e: 'in'},
    );
    kidZ = [[0, 0], [2.45, 0], [2.75, 0.55, 'out']];
    momKeys.push(
      {t: 1.0, walk: 0.85, hF: [44, 44], hB: [36, 50], mouth: 'smile'},
      {t: 2.05},
      {t: 2.15, walk: 0, facing: 0},
      {t: 2.3, facing: -1, walk: 0.9, e: 'linear'},
      {t: 2.9, x: 770, e: 'inOut'},
      {t: 3.0, walk: 0, hF: [66, 30], hB: [58, 34]},
      {t: 3.2, hF: [10, 118], hB: [10, 118], mouth: 'grin', eyes: 'happy'},
      {t: 4.35, mouth: 'talk', talk: 1},
      {t: 5.2, mouth: 'smile', talk: 0},
    );
    momZ = [[0, -3.0], [1.0, -3.0], [2.15, 1.0, 'inOut']];
    gift = t < 3.1 ? 'box' : 'markers';
    focus = {p: [1.2, 2.2, 0.6], amt: kf(t, [[2.6, 0], [3.4, 0.3], [5.4, 0.3]])};
  }
  const mom = act('mom', pb, LOOKS.mom, P(pb, 965, 0), momKeys, t, momZ, 2);
  const kid = act('leo12', kb, LOOKS.leo, P(kb, 600, 1, sit), kidKeys, t, kidZ, 5);
  const cam = camAt(t, focus);
  const proj = projector(cam);
  const kTop = above(proj, kid, t, 6);
  const mTip = tip(proj, mom, t);
  if (side === 'scroll') {
    html.push(<Bubble key="m" t={t} from={1.65} to={2.8} x={mTip[0]} y={mTip[1]} text="Shouldn't you be studying? 📚" side="left" size={32} />);
    html.push(<Bubble key="k" t={t} from={2.85} to={3.6} x={kTop[0] + 10} y={kTop[1]} text="it's just a drawing…" side="right" kind="mutter" size={30} />);
    html.push(<Bubble key="m2" t={t} from={3.65} to={4.6} x={mTip[0]} y={mTip[1]} text="Drawing won't pay the bills." side="left" size={30} />);
    html.push(<EmojiPop key="e" t={t} from={4.6} to={5.4} x={kTop[0]} y={kTop[1] - 30} e="😶" />);
  } else {
    html.push(<Bubble key="m" t={t} from={1.4} to={2.4} x={mTip[0]} y={mTip[1]} text="Saw these. Thought of you 🎁" side="left" size={30} />);
    html.push(<Bubble key="k" t={t} from={2.55} to={3.2} x={kTop[0] + 10} y={kTop[1]} text="FOR ME?!" side="right" size={34} />);
    html.push(<Bubble key="k2" t={t} from={3.3} to={4.3} x={kTop[0] + 10} y={kTop[1] - 10} text="NO WAY!! 🤩" side="right" kind="shout" />);
    html.push(<Bubble key="m2" t={t} from={4.35} to={5.3} x={mTip[0]} y={mTip[1]} text="Now make me something. 🖍️" side="left" size={30} />);
    html.push(<EmojiPop key="s1" t={t} from={3.3} to={5.4} x={kTop[0] + 110} y={kTop[1] + 40} e="✨" size={52} />);
  }
  const mh = handWorld(mom, t);
  const kh = handWorld(kid, t);
  const scene = (
    <Bedroom3D night={false} lamp={0.6} doorOpen={door} wallArt={side === 'look' ? 12 : 0} studyPlan={side === 'scroll'} warm={side === 'look'}>
      <Chair3D x={0.42} seat={0.92} facing={1} color="#3b82f6" />
      {book}
      <Person3D a={kid} t={t} />
      <Person3D a={mom} t={t} />
      {gift === 'box' && <Gift3D p={[mh[0], mh[1] - 0.1, mh[2]]} s={0.8} />}
      {gift === 'markers' && <Markers3D p={kh} rot={[0, 0.2, 0]} />}
    </Bedroom3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

// =====================================================================
// BEAT 4 — AGE 16 (bedroom, night)
// =====================================================================
const beat4 = (t: number, side: Side): Out3 => {
  const pb = BODIES.mom;
  const kb = BODIES.age16;
  const sit: Partial<Pose> = {hipH: 106, fF: [74, 0], fB: [58, 0], hF: [82, 20], hB: [72, 28], tilt: 24, eyes: 'down', mouth: 'smile', lean: 6};
  const kidKeys: Keyed<Pose>[] = [{t: 0}];
  for (let s = 0.05; s < 1.2; s += 0.16) kidKeys.push({t: s, hF: [82 + Math.sin(s * 9) * 10, 20 + Math.cos(s * 7) * 6]});
  const html: React.ReactNode[] = [];
  let lamp = 1;
  let hall = 0;
  let shadow = NaN;
  let door = 0;
  let book: React.ReactNode = <Sketchbook3D p={[1.85, 1.66, 0.05]} rot={[0, 0.1, 0]} open={1} w={1.1} />;
  const momKeys: Keyed<Pose>[] = [{t: 0, opacity: 0}];
  let kidZ: number | [number, number, ('in' | 'out' | 'inOut')?][] = 0;
  let focus: {p: V3; amt: number} | undefined;
  if (side === 'scroll') {
    hall = kf(t, [[1.0, 0], [1.2, 1], [4.6, 1], [4.9, 0]]);
    shadow = kf(t, [[1.2, -1.2], [2.6, 0.1, 'out']]);
    kidKeys.push(
      {t: 1.25, tilt: 0, lookX: 0.7, eyes: 'wide', mouth: 'o', brows: 'worried'},
      {t: 1.45, hF: [82, 20]},
      {t: 1.7, hF: [118, 70], e: 'out'},
      {t: 1.95, hF: [96, -10], e: 'out'},
      {t: 2.15, hF: [82, 20], mouth: 'flat'},
      {t: 3.9, tilt: 12, eyes: 'down', brows: 'sad', mouth: 'sad'},
    );
    lamp = kf(t, [[1.9, 1], [1.95, 0, 'step']]);
    const p = prog(t, 1.45, 1.75, 'inOut');
    book = t < 1.75 ? <Sketchbook3D p={v3lerp([1.85, 1.66, 0.05], [3.25, 1.1, 0.55], p)} rot={[0, 0.1, 0]} open={t < 1.4 ? 1 : 0} w={1.1} /> : null;
    html.push(<Bubble key="m" t={t} from={2.2} to={3.4} x={930} y={360} text="Lights off. School tomorrow." side="left" kind="offscreen" size={32} />);
    html.push(<Bubble key="m2" t={t} from={3.45} to={4.4} x={930} y={360} text="And no more doodling." side="left" kind="offscreen" size={30} />);
    focus = {p: [X(590), 2.1, 0], amt: kf(t, [[2.2, 0], [5.4, 0.5]])};
  } else {
    kidKeys.push(
      {t: 1.25, tilt: 0, lookX: 0.7, mouth: 'smile', eyes: 'open'},
      {t: 1.3, hF: [60, -20], e: 'out'},
      {t: 2.6, hF: [60, -20], brows: 'worried', mouth: 'flat'},
      {t: 2.75, mouth: 'open', eyes: 'wide', brows: 'up'},
      {t: 3.6, mouth: 'open'},
      {t: 3.85, hipH: kb.thigh + kb.shin + 8, x: 560, fF: [14, 0], fB: [-14, 0], hF: [50, 30], hB: [40, 40], e: 'out'},
      {t: 4.0, hipH: kb.thigh + kb.shin - 10},
      {t: 4.2, hipH: kb.thigh + kb.shin + 8, hF: [30, -110], hB: [20, -104], mouth: 'grin', eyes: 'happy', lift: 30, e: 'out'},
      {t: 4.42, lift: 0, e: 'in'},
    );
    kidZ = [[0, 0], [3.6, 0], [3.85, 0.55, 'out']];
    door = kf(t, [[0.8, 0], [1.15, 1, 'out']]);
    momKeys.push({t: 0.95, opacity: 0, e: 'step'}, {t: 1.0, opacity: 1, facing: -1, mouth: 'smile', hF: [10, 118], e: 'step'}, {t: 2.6, mouth: 'smile'}, {t: 2.8, hF: [40, -40], eyes: 'happy', mouth: 'grin', e: 'out'});
    book = t < 1.25 ? <Sketchbook3D p={[1.85, 1.66, 0.05]} rot={[0, 0.1, 0]} open={1} w={1.1} /> : null;
    focus = {p: [2.0, 2.4, -0.4], amt: kf(t, [[2.4, 0], [3.4, 0.25], [5.4, 0.25]])};
  }
  const mom = act('mom', pb, LOOKS.mom, P(pb, 965, -1), momKeys, t, -1.9, 2);
  const kid = act('leo16', kb, LOOKS.leoTeen, P(kb, 590, 1, sit), kidKeys, t, kidZ, 5);
  const cam = camAt(t, focus);
  const proj = projector(cam);
  const kTop = above(proj, kid, t, 6);
  const mTip = tip(proj, mom, t);
  if (side === 'scroll') {
    html.push(<EmojiPop key="e" t={t} from={4.3} to={5.4} x={kTop[0]} y={kTop[1] - 30} e="😔" />);
  } else {
    html.push(<Bubble key="k" t={t} from={1.3} to={2.55} x={kTop[0] + 20} y={kTop[1]} text="Should I enter the contest? 🏆" side="left" size={32} />);
    html.push(<Bubble key="m" t={t} from={2.65} to={3.8} x={mTip[0]} y={mTip[1]} text="Already signed you up 😎" side="left" kind="shout" size={34} />);
    html.push(<PopCard key="card" t={t} from={2.95} to={4.7} />);
    html.push(<EmojiPop key="e" t={t} from={4.4} to={5.4} x={kTop[0] + 40} y={kTop[1] - 60} e="🥹" />);
  }
  const kh = handWorld(kid, t);
  const scene = (
    <Bedroom3D night lamp={lamp} doorOpen={door} hallLight={hall} doorShadow={shadow} wallArt={side === 'look' ? 22 : 0} warm={side === 'look'}>
      <Chair3D x={0.32} seat={1.02} facing={1} color="#2f3e5e" />
      {book}
      <Person3D a={kid} t={t} />
      <Person3D a={mom} t={t} />
      {side === 'look' && t >= 1.25 && t < 3.85 && <Paper3D p={kh} kind="dino" w={1.0} rot={[0, 0.35, 0]} />}
    </Bedroom3D>
  );
  return {
    scene,
    overlay: (
      <>
        <ClockChip text="11:48 PM" />
        {html}
      </>
    ),
    cam,
  };
};

const BEAT_FNS = [beat1, beat2, beat3, beat4, (t: number, s: Side) => beat1(t, s, true)];

const grade = (side: Side, beat: number): React.CSSProperties =>
  side === 'scroll' ? {filter: `saturate(${[0.9, 0.8, 0.7, 0.62, 0.55][beat]}) brightness(0.96) contrast(1.02)`} : {filter: 'saturate(1.08) brightness(1.03)'};

const Panel3D: React.FC<{t: number; side: Side; top: number}> = ({t, side, top}) => {
  let bi = BEATS.findIndex((b) => t >= b.start && t < b.end);
  if (bi < 0) bi = BEATS.length - 1;
  const b = BEATS[bi];
  const lt = t - b.start;
  const out = BEAT_FNS[bi](lt, side);
  const gen2 = bi === 4;
  const counterSteps = gen2
    ? [{t: 0, v: 0}, {t: 23.65, v: 1}]
    : side === 'scroll'
      ? [{t: 0, v: 0}, {t: 1.1, v: 1}, {t: 7.3, v: 2}]
      : [{t: 0, v: 0}, {t: 1.1, v: 1}, {t: 7.3, v: 38}, {t: 12.8, v: 412}, {t: 17.6, v: 1906}];
  return (
    <div style={{position: 'absolute', left: 0, top, width: W, height: PANEL_H, overflow: 'hidden', background: '#000'}}>
      <div style={{position: 'absolute', inset: 0, ...grade(side, bi)}}>
        <Stage cam={out.cam}>{out.scene}</Stage>
      </div>
      <div style={{position: 'absolute', inset: 0}}>{out.overlay}</div>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 100%)'}} />
      {side === 'look' && <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,190,90,0.10), rgba(255,140,60,0.05))', mixBlendMode: 'soft-light'}} />}
      <Header t={t} text={side === 'scroll' ? 'PARENTS WHO SCROLL 📱' : 'PARENTS WHO LOOK 👀'} />
      <Counter
        key={gen2 ? 'g2' : 'g1'}
        t={t}
        label={gen2 ? 'drawings she showed him' : 'drawings he showed you'}
        emoji="🖍️"
        steps={counterSteps}
        tone={side === 'scroll' ? 'bad' : 'good'}
        sub={side === 'scroll' && !gen2 ? {label: 'drawings he hid', emoji: '🙈', from: 15.7, steps: [{t: 0, v: 0}, {t: 15.7, v: 37}, {t: 17.6, v: 214}]} : undefined}
      />
    </div>
  );
};

type Cue = {at: number; src: string; vol?: number};
const CUES3: Cue[] = [
  {at: 0.0, src: 'run.wav', vol: 0.5},
  {at: 1.0, src: 'pop.wav'},
  {at: 1.1, src: 'tick.wav', vol: 0.6},
  {at: 2.05, src: 'pop-low.wav', vol: 0.8},
  {at: 2.3, src: 'pop.wav'},
  {at: 2.78, src: 'boing.wav', vol: 0.5},
  {at: 3.0, src: 'pop-low.wav', vol: 0.6},
  {at: 3.35, src: 'pop.wav', vol: 0.6},
  {at: 4.0, src: 'flutter.wav', vol: 0.8},
  {at: 4.25, src: 'pop.wav', vol: 0.6},
  {at: 5.15, src: 'ding.wav', vol: 0.7},
  {at: 6.2, src: 'whoosh.wav', vol: 0.8},
  {at: 7.25, src: 'pop.wav'},
  {at: 7.3, src: 'counter.wav', vol: 0.55},
  {at: 7.7, src: 'click.wav', vol: 0.7},
  {at: 8.5, src: 'pop.wav'},
  {at: 9.5, src: 'pop.wav'},
  {at: 9.88, src: 'boing.wav', vol: 0.5},
  {at: 9.9, src: 'rocket.wav', vol: 0.6},
  {at: 10.6, src: 'pop.wav', vol: 0.6},
  {at: 11.8, src: 'whoosh.wav', vol: 0.8},
  {at: 12.65, src: 'door.wav', vol: 0.8},
  {at: 12.8, src: 'counter.wav', vol: 0.55},
  {at: 13.2, src: 'pop.wav'},
  {at: 14.35, src: 'pop.wav', vol: 0.6},
  {at: 14.9, src: 'sparkle.wav', vol: 0.7},
  {at: 15.1, src: 'pop.wav'},
  {at: 15.45, src: 'pop-low.wav', vol: 0.7},
  {at: 16.1, src: 'slam.wav', vol: 0.6},
  {at: 16.15, src: 'pop.wav', vol: 0.6},
  {at: 16.5, src: 'door.wav', vol: 0.5},
  {at: 17.2, src: 'whoosh.wav', vol: 0.8},
  {at: 17.6, src: 'counter.wav', vol: 0.55},
  {at: 18.0, src: 'door.wav', vol: 0.5},
  {at: 18.25, src: 'steps.wav', vol: 0.9},
  {at: 18.5, src: 'pop.wav'},
  {at: 19.1, src: 'click.wav', vol: 0.9},
  {at: 19.4, src: 'pop-low.wav', vol: 0.8},
  {at: 19.85, src: 'pop.wav'},
  {at: 20.15, src: 'sparkle.wav', vol: 0.6},
  {at: 20.65, src: 'pop-low.wav', vol: 0.6},
  {at: 21.4, src: 'boing.wav', vol: 0.4},
  {at: 22.6, src: 'whoosh.wav', vol: 0.9},
  {at: 22.6, src: 'run.wav', vol: 0.5},
  {at: 23.6, src: 'pop.wav'},
  {at: 23.7, src: 'tick.wav', vol: 0.6},
  {at: 24.65, src: 'pop-low.wav', vol: 0.8},
  {at: 24.9, src: 'pop.wav'},
  {at: 25.6, src: 'pop-low.wav', vol: 0.6},
  {at: 25.95, src: 'pop.wav', vol: 0.6},
  {at: 26.6, src: 'flutter.wav', vol: 0.8},
  {at: 26.85, src: 'pop.wav', vol: 0.6},
  {at: 27.75, src: 'ding.wav', vol: 0.7},
  {at: END_AT, src: 'impact.wav', vol: 0.8},
];

export const Ep01_3D: React.FC<{withAudio?: boolean; music?: boolean}> = ({withAudio = true, music = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Hook t={t} />
      <Panel3D t={t} side="scroll" top={TOP_Y} />
      <Band t={t} />
      <Panel3D t={t} side="look" top={BOT_Y} />
      <Flash t={t} />
      <EndCard t={t} />
      {withAudio && (
        <>
          {music && <Audio src={staticFile('audio/ep01-music.wav')} volume={1} />}
          {CUES3.map((c, i) => (
            <Sequence key={i} from={Math.round(c.at * fps)} layout="none">
              <Audio src={staticFile(`audio/${c.src}`)} volume={SFX_GAIN * (c.vol ?? 0.7)} />
            </Sequence>
          ))}
        </>
      )}
    </AbsoluteFill>
  );
};
