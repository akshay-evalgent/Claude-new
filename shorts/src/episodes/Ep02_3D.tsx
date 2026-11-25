/**
 * EP02 (3D) — "Same kid. Same “watch this!”"
 * Top: PARENTS WHO SCROLL 📱   Bottom: PARENTS WHO LOOK 👀
 * Age 4 slide → 7 flip → 11 game-winner → 15 first song → 25 years later (his daughter on the same slide).
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {BODIES, Pose} from '../components/Person';
import {Bubble, EmojiPop} from '../components/Overlay';
import {C, LOOKS, Look, BOT_Y} from '../lib/theme';
import {Keyed, clamp, kf, prog} from '../lib/anim';
import {Actor, Person3D, handWorld, headWorld, toWorld3, yawOf} from '../three/Person3D';
import {Bedroom3D} from '../three/Sets3D';
import {Phone3D} from '../three/Props3D';
import {Basketball3D, Guitar3D, Headphones3D, HOOP, Playground3D} from '../three/Playground3D';
import {U, V3, X} from '../three/core';
import {Band, Beat, Callback, CounterCfg, Cue, Cues, EndCard, Flash, Hook, Out3, P, PARK_BASE, Panel3D, PopCard, Side, Stamp, TOP_Y, above, act, camAt, clapKeys, standH, tip, v3lerp} from './shared3d';
import {projector} from '../three/Stage';

export const EP02_BEATS: Beat[] = [
  {start: 0, end: 6.2, label: 'AGE 4'},
  {start: 6.2, end: 11.8, label: 'AGE 7'},
  {start: 11.8, end: 17.2, label: 'AGE 11'},
  {start: 17.2, end: 22.6, label: 'AGE 15'},
  {start: 22.6, end: 32, label: '25 YEARS LATER'},
];
export const EP02_DURATION = 32;
const END_AT = 29.05;
const GRANDMA: Look = {...LOOKS.mom, hair: '#c9c9d3', shirt: '#2a8a7f'};
const BENCH_X = 220;
const SIT_H = 96;
const sitPose = (extra: Partial<Pose> = {}): Partial<Pose> => ({hipH: SIT_H, fF: [64, 0], fB: [50, 0], hF: [40, 44], hB: [30, 52], tilt: 24, eyes: 'down', mouth: 'flat', ...extra});

// =====================================================================
// AGE 4 slide (also 25 YEARS LATER with gen2 = true)
// =====================================================================
const slideBeat = (t: number, side: Side, gen2 = false): Out3 => {
  const kb = BODIES.age5;
  const pb = gen2 ? BODIES.man : BODIES.mom;
  const kLook = gen2 ? LOOKS.mia : LOOKS.leo;
  const pLook = gen2 ? LOOKS.leoAdult : LOOKS.mom;
  const ks = standH(kb);
  const kidKeys: Keyed<Pose>[] = [
    {t: 0, x: 905, lift: 190, facing: -1, hF: [20, -70], hB: [10, -66], mouth: 'grin', eyes: 'happy'},
    {t: 0.3, hF: [36, -58]},
    {t: 0.55, hF: [14, -74]},
    {t: 0.8, hF: [36, -58]},
    {t: 1.05, hF: [20, -70]},
    {t: 1.2},
    {t: 1.5, hipH: 14, fF: [52, 10], fB: [46, 10], lean: -12, x: 878},
    {t: 1.62},
    {t: 2.45, x: 640, lift: 43, e: 'in'},
    {t: 2.7, x: 572, lift: 0, e: 'out'},
    {t: 2.95, hipH: ks, fF: [10, 0], fB: [-10, 0], lean: 0, hF: [10, 58], hB: [-6, 66]},
  ];
  let kidZ: [number, number, ('in' | 'out' | 'inOut')?][] = [[0, -0.2], [2.6, -0.3], [3.0, 0.5, 'out']];
  const parKeys: Keyed<Pose>[] = [{t: 0}];
  const gmaKeys: Keyed<Pose>[] = [{t: 0}];
  let phone = true;
  let focus: {p: V3; amt: number} | undefined;
  if (side === 'scroll') {
    kidKeys.push(
      {t: 3.0, mouth: 'open', eyes: 'wide', hF: [30, -40], hB: [20, -36]},
      {t: 3.9, mouth: 'flat', eyes: 'open', hF: [10, 58], hB: [-6, 66]},
      {t: 4.8, mouth: 'sad', brows: 'sad', tilt: 14, eyes: 'down'},
      {t: 5.2, facing: -1},
      {t: 5.35, facing: 1, e: 'linear'},
      {t: 5.4, walk: 0.7},
      {t: 6.2, x: 760, e: 'linear'},
    );
    parKeys.push({t: 1.2, mouth: 'talk', talk: 1}, {t: 2.0, talk: 0, mouth: 'flat'}, {t: 3.9, mouth: 'talk', talk: 1}, {t: 4.8, talk: 0, mouth: 'smile'});
    focus = {p: [X(600), 1.6, 0.5], amt: kf(t, [[4.4, 0], [5.6, 0.38]])};
  } else {
    kidKeys.push(
      {t: 3.0, mouth: 'grin', eyes: 'happy'},
      {t: 3.35, hipH: ks - 12},
      {t: 3.55, hipH: ks, lift: 40, e: 'out', hF: [20, -80], hB: [10, -76]},
      {t: 3.75, lift: 0, e: 'in'},
      {t: 4.3, facing: -1},
      {t: 4.45, facing: 1, e: 'linear'},
      {t: 4.5, walk: 2, hF: [10, 58], hB: [-6, 66]},
      {t: 5.4, x: 985, e: 'inOut'},
      {t: 5.5, walk: 0, hF: [24, -80], hB: [14, -70]},
      {t: 6.2, lift: 100, x: 955, hF: [30, -66], hB: [20, -80]},
    );
    kidZ = [[0, -0.35], [2.6, -0.35], [3.0, 0.5, 'out'], [5.1, 0.5], [5.5, -0.35, 'inOut']];
    parKeys.push(
      {t: 0.55, tilt: 0, lookX: 0.6, eyes: 'wide', mouth: 'o', brows: 'up', e: 'out'},
      {t: 0.9, hF: [10, 96]},
      {t: 1.25, hF: [50, 70], hB: [40, 74], lean: 12, mouth: 'smile', eyes: 'open', brows: 'none'},
      {t: 2.5},
      {t: 2.75, hipH: standH(pb), fF: [14, 0], fB: [-14, 0], lean: 0, mouth: 'open', eyes: 'happy', e: 'out'},
      ...clapKeys(2.8, 3.5),
      {t: 3.6, hF: [10, 110], hB: [10, 110], mouth: 'grin'},
      {t: gen2 ? 5.0 : 4.3, hF: [30, -110], hB: [20, -100], mouth: 'open', e: 'out'},
      {t: gen2 ? 5.8 : 5.2, hF: [10, 110], hB: [10, 110], mouth: 'smile'},
    );
    gmaKeys.push({t: 0.6, tilt: 0, lookX: 0.6, eyes: 'open', mouth: 'smile', hF: [44, 70], hB: [36, 74]}, {t: 2.7, eyes: 'happy', mouth: 'grin'}, ...clapKeys(2.8, 3.4), {t: 3.6, hF: [44, 70], hB: [36, 74]});
    phone = t < 1.05;
    focus = {p: [X(300), 2.6, 0.2], amt: kf(t, [[2.4, 0], [3.0, 0.3], [4.8, 0.3], [5.8, 0]])};
  }
  const kid = act(gen2 ? 'mia' : 'leo5', kb, kLook, P(kb, 905, -1), kidKeys, t, kidZ, 5);
  const camFor = (lt: number, f?: {p: V3; amt: number}) => camAt(lt, f, PARK_BASE);
  const par = act(gen2 ? 'leoAdult' : 'mom', pb, pLook, P(pb, BENCH_X, 1, sitPose()), parKeys, t, 0.05, 2);
  const gma = gen2 ? act('grandma', BODIES.mom, GRANDMA, P(BODIES.mom, 118, 1, sitPose()), gmaKeys, t, 0.0, 7) : null;
  const cam = camFor(t, focus);
  const proj = projector(cam);
  const kTip = tip(proj, kid, t);
  const kTop = above(proj, kid, t, 6);
  const pTip = tip(proj, par, t);
  const html: React.ReactNode[] = [];
  const who = 'his mom, 25 years ago';
  html.push(<Bubble key="k1" t={t} from={0.25} to={1.15} x={kTip[0]} y={kTip[1] + 84} text={gen2 ? 'DAD! WATCH THIS!! 🛝' : 'MOM! WATCH THIS!! 🛝'} side={kTip[2]} kind="shout" />);
  if (side === 'scroll') {
    html.push(<Bubble key="p1" t={t} from={1.2} to={2.0} x={pTip[0]} y={pTip[1] + 52} text="mm-hm 👍" kind="mutter" side={pTip[2]} size={34} />);
    html.push(<Bubble key="k2" t={t} from={2.95} to={3.8} x={kTop[0]} y={kTop[1]} text="DID YOU SEE?!" side="right" />);
    html.push(<Bubble key="p2" t={t} from={3.9} to={4.8} x={pTip[0]} y={pTip[1] + 52} text="so good, buddy 👍" kind="mutter" side={pTip[2]} size={32} />);
    html.push(<EmojiPop key="e1" t={t} from={4.8} to={6.1} x={kTop[0]} y={kTop[1] - 30} e="😕" />);
    if (gen2) html.push(<Callback key="cb" t={t} from={2.05} to={3.75} x={28} y={104} quote="mm-hm 👍" by={who} />);
  } else {
    html.push(<Bubble key="p1" t={t} from={2.65} to={3.4} x={pTip[0]} y={pTip[1] + 52} text="WHOAAA!! 👏" kind="shout" side={pTip[2]} />);
    html.push(<Bubble key="k2" t={t} from={3.5} to={4.2} x={kTop[0]} y={kTop[1]} text="AGAIN?!" side="right" />);
    html.push(<Bubble key="p2" t={t} from={gen2 ? 5.0 : 4.3} to={gen2 ? 5.8 : 5.2} x={pTip[0]} y={pTip[1] + 52} text="AGAIN!! 🔁" kind="shout" side={pTip[2]} />);
    if (gen2) {
      html.push(<Callback key="cb" t={t} from={3.45} to={4.95} x={28} y={104} quote="WHOAAA!! 👏" by={who} />);
      const g = above(proj, gma!, t, 10);
      html.push(<EmojiPop key="g" t={t} from={4.3} to={6.4} x={g[0]} y={g[1] - 20} e="🥹" size={58} />);
    }
  }
  const ph = handWorld(par, t);
  const scene = (
    <Playground3D t={t} overcast={side === 'scroll'} warm={side === 'look'}>
      <Person3D a={par} t={t} />
      {phone && <Phone3D p={ph} rot={[-0.2, -0.5, 0]} glow={side === 'scroll' ? 1 : 0.6} />}
      {gma && <Person3D a={gma} t={t} />}
      {gma && side === 'scroll' && <Phone3D p={handWorld(gma, t)} rot={[-0.2, -0.5, 0]} />}
      <Person3D a={kid} t={t} />
    </Playground3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

// =====================================================================
// AGE 7 — front flip
// =====================================================================
const flipBeat = (t: number, side: Side): Out3 => {
  const kb = BODIES.age8;
  const pb = BODIES.mom;
  const ks = standH(kb);
  const kidKeys: Keyed<Pose>[] = [
    {t: 0, x: 1150, walk: 1.2, hF: [10, 80], hB: [-6, 84], mouth: 'grin', eyes: 'happy', spin: 0},
    {t: 0.9, x: 640, e: 'out'},
    {t: 1.0, walk: 0, hF: [40, -60], hB: [30, -56]},
    {t: 1.8, hF: [40, -60]},
    {t: 1.95, hipH: ks - 28, lean: 20, hF: [-34, 50], hB: [-40, 54]},
    {t: 2.15, spin: 0},
    {t: 2.4, hipH: ks, lean: 0, lift: 118, hF: [20, -110], hB: [10, -106], e: 'out'},
    {t: 2.55, hipH: 66, fF: [34, -34], fB: [26, -30], hF: [50, 20], hB: [44, 24], lift: 126},
    {t: 2.72, hipH: ks - 10, fF: [10, 0], fB: [-10, 0], e: 'out'},
    {t: 2.8, spin: 360, e: 'inOut'},
    {t: 2.88, lift: 0, e: 'in'},
    {t: 3.0, hipH: ks, hF: [50, -70], hB: [-30, -70], mouth: 'grin', eyes: 'happy'},
  ];
  const momKeys: Keyed<Pose>[] = [{t: 0}];
  let focus: {p: V3; amt: number} | undefined = {p: [X(640), 2.5, 0.6], amt: kf(t, [[1.6, 0], [2.4, 0.3], [3.4, 0.3], [4.2, 0]])};
  if (side === 'scroll') {
    kidKeys.push(
      {t: 3.1, mouth: 'open', hF: [30, -40], hB: [20, -36]},
      {t: 3.9, mouth: 'flat', hF: [10, 80], hB: [-6, 84]},
      {t: 4.9, mouth: 'sad', brows: 'sad', tilt: 14, eyes: 'down'},
    );
    momKeys.push({t: 4.0, mouth: 'talk', talk: 1}, {t: 4.8, talk: 0, mouth: 'flat'});
    focus = {p: [X(640), 2.5, 0.6], amt: kf(t, [[1.6, 0], [2.4, 0.3], [3.4, 0.3], [4.2, 0], [5.0, 0], [5.6, 0.35]])};
  } else {
    kidKeys.push(
      {t: 3.1, mouth: 'grin'},
      {t: 3.9, mouth: 'open', hF: [40, -60], hB: [30, -56]},
      {t: 4.8, mouth: 'grin', hF: [10, 80], hB: [-6, 84]},
      {t: 5.35, hipH: ks - 24, lean: 18, hF: [-34, 50], hB: [-40, 54]},
    );
    momKeys.push(
      {t: 0.2, tilt: 0, lookX: 0.6, hF: [50, 70], hB: [40, 74], lean: 10, mouth: 'smile', eyes: 'open'},
      {t: 2.2, mouth: 'o', eyes: 'wide', brows: 'up'},
      {t: 2.85},
      {t: 3.05, hipH: standH(pb), fF: [14, 0], fB: [-14, 0], lean: 0, hF: [30, -110], hB: [20, -104], mouth: 'grin', eyes: 'happy', brows: 'none', e: 'out'},
      {t: 3.9, hF: [10, 110], hB: [10, 110]},
      {t: 4.8, hF: [92, -8], mouth: 'talk', talk: 1},
      {t: 5.6, talk: 0, mouth: 'smile'},
    );
  }
  const kid = act('leo8', kb, LOOKS.leo, P(kb, 1150, -1), kidKeys, t, 0.6, 5);
  const mom = act('mom', pb, LOOKS.mom, P(pb, BENCH_X, 1, sitPose()), momKeys, t, 0.05, 2);
  const cam = camAt(t, focus, PARK_BASE);
  const proj = projector(cam);
  const kTop = above(proj, kid, t, 6);
  const mTip = tip(proj, mom, t);
  const html: React.ReactNode[] = [];
  html.push(<Bubble key="k1" t={t} from={0.95} to={1.9} x={kTop[0]} y={kTop[1]} text="Mom! Watch my FLIP!! 🤸" side="right" />);
  if (side === 'scroll') {
    html.push(<Bubble key="k2" t={t} from={3.1} to={3.9} x={kTop[0]} y={kTop[1]} text="DID YOU SEE IT?!" side="right" />);
    html.push(<Bubble key="m" t={t} from={4.0} to={4.8} x={mTip[0]} y={mTip[1] + 52} text="in a sec, sweetie 📱" kind="mutter" side="right" size={32} />);
    html.push(<Bubble key="k3" t={t} from={4.9} to={5.6} x={kTop[0]} y={kTop[1]} text="…never mind." kind="mutter" side="right" size={30} />);
    html.push(<EmojiPop key="e" t={t} from={5.25} to={5.8} x={kTop[0] - 70} y={kTop[1] + 40} e="😔" />);
  } else {
    html.push(<Bubble key="m" t={t} from={3.05} to={3.85} x={mTip[0]} y={mTip[1] + 52} text="10 OUT OF 10!! 🙌" kind="shout" side="right" />);
    html.push(<Bubble key="k2" t={t} from={3.9} to={4.75} x={kTop[0]} y={kTop[1]} text="I CAN DO TWO!!" side="right" />);
    html.push(<Bubble key="m2" t={t} from={4.8} to={5.6} x={mTip[0]} y={mTip[1] + 52} text="SHOW ME! 👀" kind="shout" side="right" />);
  }
  const scene = (
    <Playground3D t={t + 6.2} overcast={side === 'scroll'} warm={side === 'look'}>
      <Person3D a={mom} t={t} />
      {side === 'scroll' && <Phone3D p={handWorld(mom, t)} rot={[-0.2, -0.5, 0]} />}
      <Person3D a={kid} t={t} />
    </Playground3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

// =====================================================================
// AGE 11 — game-winning shot
// =====================================================================
const RIM: V3 = [HOOP.x + 0.35, HOOP.rimY + 0.05, HOOP.rimZ];
const hoopBeat = (t: number, side: Side): Out3 => {
  const kb = BODIES.age12;
  const pb = BODIES.mom;
  const ks = standH(kb);
  const kidKeys: Keyed<Pose>[] = [{t: 0, x: 760, hF: [44, 70], hB: [10, 92], mouth: 'smile', eyes: 'open'}];
  for (let s = 0.05; s < 1.8; s += 0.225) kidKeys.push({t: s, hF: [44, 66 + (Math.round(s / 0.225) % 2) * 16]});
  kidKeys.push(
    {t: 0.6, tilt: 0, mouth: 'talk', talk: 1},
    {t: 1.6, talk: 0, mouth: 'smile'},
    {t: 1.8, hF: [40, 30], hB: [34, 34]},
    {t: 1.95, hipH: ks - 22, lean: 10},
    {t: 2.15, hipH: ks, lean: 0, lift: 44, hF: [24, -120], hB: [14, -114], e: 'out'},
    {t: 2.4, lift: 0, e: 'in'},
    {t: 2.6, hF: [24, -110]},
  );
  const momKeys: Keyed<Pose>[] = [{t: 0}];
  let kidX: [number, number, ('in' | 'out' | 'inOut')?][] = [[0, 0.4]];
  let focus: {p: V3; amt: number} | undefined = {p: [3.2, 3.0, -0.2], amt: kf(t, [[1.8, 0], [2.5, 0.22], [3.2, 0.22], [3.8, 0]])};
  let mz: [number, number, ('in' | 'out' | 'inOut')?][] = [[0, 0.05]];
  if (side === 'scroll') {
    kidKeys.push(
      {t: 2.95, facing: 1},
      {t: 3.1, facing: -1, e: 'linear', mouth: 'open', eyes: 'happy', hF: [30, -60], hB: [20, -56]},
      {t: 3.95, hF: [10, 100], hB: [-6, 104], mouth: 'smile', eyes: 'open'},
      {t: 4.9, mouth: 'flat', tilt: 8, eyes: 'down', brows: 'worried'},
    );
    momKeys.push({t: 4.0, mouth: 'talk', talk: 1}, {t: 4.9, talk: 0, mouth: 'smile'});
  } else {
    kidKeys.push(
      {t: 2.95, facing: 1},
      {t: 3.1, facing: -1, e: 'linear', mouth: 'grin', eyes: 'happy'},
      {t: 3.55, walk: 2, hF: [10, 100], hB: [-6, 104]},
      {t: 4.4, x: 360, e: 'inOut'},
      {t: 4.5, walk: 0},
      {t: 4.62, hF: [56, -70], e: 'out'},
      {t: 5.0, hF: [10, 100]},
    );
    momKeys.push(
      {t: 0.2, tilt: 0, lookX: 0.6, hF: [50, 70], hB: [40, 74], lean: 10, mouth: 'smile', eyes: 'open'},
      {t: 2.3, mouth: 'o', eyes: 'wide', brows: 'up'},
      {t: 2.85},
      {t: 3.05, hipH: standH(pb), fF: [14, 0], fB: [-14, 0], lean: 0, hF: [30, -110], hB: [20, -104], mouth: 'grin', eyes: 'happy', brows: 'none', e: 'out'},
      {t: 3.8, hF: [10, 110], hB: [10, 110]},
      {t: 3.9, walk: 0.8},
      {t: 4.35, x: 270, e: 'inOut'},
      {t: 4.45, walk: 0},
      {t: 4.62, hF: [64, -52], e: 'out'},
      {t: 4.85, mouth: 'talk', talk: 1, hF: [10, 110]},
      {t: 5.6, talk: 0, mouth: 'grin'},
    );
    kidX = [[0, 0.4], [3.55, 0.4], [4.4, 0.25, 'inOut']];
    mz = [[0, 0.05], [3.9, 0.05], [4.35, 0.25, 'inOut']];
  }
  const kid = act('leo12', kb, LOOKS.leo, P(kb, 760, 1), kidKeys, t, kidX, 5);
  const mom = act('mom', pb, LOOKS.mom, P(pb, BENCH_X, 1, sitPose()), momKeys, t, mz, 2);
  const cam = camAt(t, focus, PARK_BASE);
  const proj = projector(cam);
  // ball
  let ball: V3;
  const hand = handWorld(kid, t);
  if (t < 1.8) {
    const ph = (t % 0.45) / 0.45;
    const top = hand[1] - 0.2;
    ball = [hand[0] + 0.08, 0.24 + (top - 0.24) * Math.abs(2 * ph - 1), hand[2]];
  } else if (t < 2.15) {
    ball = [hand[0], hand[1] + 0.22, hand[2]];
  } else if (t < 2.85) {
    const rel = handWorld(act('k', kb, LOOKS.leo, P(kb, 760, 1), kidKeys, 2.15, kidX), 2.15);
    const s0: V3 = [rel[0], rel[1] + 0.22, rel[2]];
    const p = prog(t, 2.15, 2.85, 'linear');
    const ctrl: V3 = [(s0[0] + RIM[0]) / 2, 6.6, (s0[2] + RIM[2]) / 2];
    const a = v3lerp(s0, ctrl, p);
    const b = v3lerp(ctrl, RIM, p);
    ball = v3lerp(a, b, p);
  } else if (t < 3.05) {
    ball = [RIM[0], RIM[1] - prog(t, 2.85, 3.05, 'in') * 0.55, RIM[2]];
  } else if (t < 3.35) {
    ball = [RIM[0] - 0.1 * prog(t, 3.05, 3.35), RIM[1] - 0.55 - (RIM[1] - 0.55 - 0.24) * prog(t, 3.05, 3.35, 'in'), RIM[2]];
  } else {
    const p = clamp((t - 3.35) / 0.7);
    const hop = Math.abs(Math.sin(p * Math.PI * 2)) * (1 - p) * 0.9;
    ball = [RIM[0] - 0.1 - p * 1.2, 0.24 + hop, RIM[2] + p * 0.6];
  }
  const kTop = above(proj, kid, t, 6);
  const kTip = tip(proj, kid, t);
  const mTip = tip(proj, mom, t);
  const html: React.ReactNode[] = [];
  html.push(<Bubble key="k1" t={t} from={0.6} to={1.6} x={kTip[0] - 40} y={kTop[1] + 10} text="Mom, watch! Game winner! 🏀" side="left" size={32} />);
  if (side === 'scroll') {
    html.push(<Bubble key="k2" t={t} from={3.1} to={3.95} x={kTop[0]} y={kTop[1]} text="SWISH!!! Did you see?!" side="right" />);
    html.push(<Bubble key="m" t={t} from={4.0} to={4.9} x={mTip[0]} y={mTip[1] + 52} text="of course I saw! 👍" kind="mutter" side="right" size={32} />);
    html.push(<EmojiPop key="e" t={t} from={4.9} to={5.4} x={kTop[0]} y={kTop[1] - 30} e="😐" />);
  } else {
    html.push(<Bubble key="m" t={t} from={3.05} to={3.8} x={mTip[0]} y={mTip[1] + 52} text="SWIIISH!!! 🔥" kind="shout" side="right" />);
    html.push(<Bubble key="m2" t={t} from={4.85} to={5.6} x={mTip[0]} y={mTip[1] + 52} text="Who TAUGHT you that?!" side="right" size={32} />);
    const hf = proj(handWorld(kid, 4.62 > t ? t : 4.62));
    html.push(<EmojiPop key="hi5" t={t} from={4.6} to={5.3} x={hf[0] - 20} y={hf[1] - 30} e="✋" size={60} />);
  }
  const scene = (
    <Playground3D t={t + 11.8} hoop overcast={side === 'scroll'} warm={side === 'look'}>
      <Person3D a={mom} t={t} />
      {side === 'scroll' && <Phone3D p={handWorld(mom, t)} rot={[-0.2, -0.5, 0]} />}
      <Person3D a={kid} t={t} />
      <Basketball3D p={ball} spin={t * 6} />
    </Playground3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

// =====================================================================
// AGE 15 — first song (bedroom)
// =====================================================================
const songBeat = (t: number, side: Side): Out3 => {
  const kb = BODIES.age16;
  const pb = BODIES.mom;
  const sit: Partial<Pose> = {hipH: 126, fF: [74, 0], fB: [58, 0], hF: [34, 80], hB: [93, 60], handsIn: 0.5, tilt: 12, eyes: 'down', mouth: 'smile', lean: 4};
  const strum = (a: number, b: number): Keyed<Pose>[] => {
    const out: Keyed<Pose>[] = [];
    for (let s = a; s < b; s += 0.12) out.push({t: s, hF: [34, 72 + ((Math.round((s - a) / 0.12) % 2) * 16)]});
    return out;
  };
  const kidKeys: Keyed<Pose>[] = [{t: 0}, ...strum(0.05, 1.2)];
  const momKeys: Keyed<Pose>[] = [{t: 0, opacity: 0}, {t: 0.95, opacity: 0, e: 'step'}, {t: 1.0, opacity: 1, e: 'step', hF: [40, 44], hB: [30, 52], tilt: 24, eyes: 'down', mouth: 'flat'}];
  let door = kf(t, [[0.85, 0], [1.25, 1, 'out']]);
  let headphones = false;
  let mz: [number, number, ('in' | 'out' | 'inOut')?][] = [[0, -1.9]];
  let recording = false;
  const html: React.ReactNode[] = [];
  let focus: {p: V3; amt: number} | undefined;
  kidKeys.push({t: 1.3, tilt: 0, lookX: 0.7, eyes: 'open', mouth: 'talk', talk: 1, hF: [34, 80]}, {t: 2.35, talk: 0, mouth: 'smile'});
  if (side === 'scroll') {
    momKeys.push({t: 2.45, mouth: 'talk', talk: 1}, {t: 3.2, talk: 0, mouth: 'flat'}, {t: 3.7, opacity: 1}, {t: 3.75, opacity: 0, e: 'step'});
    door = kf(t, [[0.85, 0], [1.25, 1, 'out'], [3.3, 1], [3.75, 0, 'in']]);
    kidKeys.push(
      {t: 2.6, mouth: 'flat', brows: 'worried'},
      {t: 3.6, handsIn: 0, hF: [30, 96], hB: [40, 90], tilt: 10, eyes: 'down', brows: 'sad'},
      {t: 3.95, hF: [6, -24], hB: [4, -20], handsIn: 0.2},
      {t: 4.2, hF: [30, 96], hB: [40, 90], handsIn: 0, tilt: 16, eyes: 'closed', mouth: 'flat'},
    );
    headphones = t > 4.05;
    focus = {p: [X(330), 2.4, -0.2], amt: kf(t, [[3.8, 0], [5.4, 0.38]])};
  } else {
    momKeys.push(
      {t: 1.2, tilt: 0, lookX: 0.6, eyes: 'open', mouth: 'smile'},
      {t: 2.45, mouth: 'talk', talk: 1, eyes: 'wide', brows: 'up'},
      {t: 2.75, hF: [70, -10], hB: [60, -4]},
      {t: 3.35, talk: 0, mouth: 'grin', eyes: 'happy', brows: 'none'},
    );
    mz = [[0, -1.9], [2.5, -1.9], [3.1, -0.8, 'inOut']];
    kidKeys.push({t: 3.25, mouth: 'grin', eyes: 'happy'}, ...strum(3.3, 5.4));
    recording = t > 2.75;
    focus = {p: [0.2, 2.6, -0.4], amt: kf(t, [[3.0, 0], [3.8, 0.22], [5.4, 0.22]])};
  }
  const kid = act('leo16', kb, LOOKS.leoTeen, P(kb, 330, 1, sit), kidKeys, t, -0.2, 5);
  const mom = act('mom', pb, LOOKS.mom, P(pb, 965, -1), momKeys, t, mz, 2);
  const cam = camAt(t, focus);
  const proj = projector(cam);
  const kTop = above(proj, kid, t, 6);
  const mTip = tip(proj, mom, t);
  html.push(<Bubble key="k1" t={t} from={1.35} to={2.35} x={kTop[0]} y={kTop[1]} text="Mom! Wanna hear my song? 🎸" side="right" size={32} />);
  if (side === 'scroll') {
    html.push(<Bubble key="m" t={t} from={2.45} to={3.2} x={mTip[0]} y={mTip[1]} text="Not now. 📱" kind="mutter" side="left" size={34} />);
    html.push(<EmojiPop key="e" t={t} from={4.3} to={5.4} x={kTop[0] + 70} y={kTop[1] - 10} e="😶" />);
    html.push(<Stamp key="st" t={t} at={4.35} x={360} y={470} text="STOPPED ASKING" />);
  } else {
    html.push(<Bubble key="m" t={t} from={2.45} to={3.35} x={mTip[0]} y={mTip[1]} text="WAIT — let me record this! 🎥" kind="shout" side="left" size={32} />);
    html.push(
      <PopCard key="card" t={t} from={3.45} to={5.3} x={40} y={110} w={360} stamp="SENT ✓">
        <div style={{fontSize: 28, fontWeight: 700, color: '#e2445c'}}>● REC 0:42</div>
        <div style={{fontSize: 24, fontWeight: 600, marginTop: 6}}>Leo's first song 🎸</div>
        <div style={{fontSize: 21, fontWeight: 500, color: '#5a5266', marginTop: 4}}>to: Grandma ❤️</div>
      </PopCard>,
    );
    const g = proj(toWorld3(kid, [0.5, 1.6, 0.1]));
    html.push(<EmojiPop key="n1" t={t} from={3.6} to={4.6} x={g[0] + 40} y={g[1] - 60 - (t - 3.6) * 40} e="🎶" size={52} />);
    html.push(<EmojiPop key="n2" t={t} from={4.3} to={5.4} x={g[0] + 90} y={g[1] - 40 - (t - 4.3) * 40} e="🎵" size={46} />);
    const mt = above(proj, mom, t, 8);
    html.push(<EmojiPop key="mo" t={t} from={4.6} to={5.4} x={mt[0] - 50} y={mt[1] + 30} e="🥹" size={52} />);
  }
  // guitar rides on the teen's lap
  const th = yawOf(kid.pose.facing);
  const lap = toWorld3(kid, [0.36, kid.pose.hipH * U + 0.28, 0.06]);
  const restDrop = side === 'scroll' ? prog(t, 3.4, 3.8) : 0;
  const gp: V3 = [lap[0], lap[1] - restDrop * 0.25, lap[2]];
  const hd = headWorld(kid, t);
  const mh = handWorld(mom, t);
  const scene = (
    <Bedroom3D night={false} lamp={0.55} doorOpen={door} wallArt={side === 'look' ? 16 : 0} studyPlan={side === 'scroll'} warm={side === 'look'}>
      <Person3D a={kid} t={t} />
      <Guitar3D p={gp} rot={[0, th, 0.4 - restDrop * 0.35]} />
      {headphones && <Headphones3D p={hd} r={kb.headR * U} yaw={th - 0.85 * kid.pose.facing} />}
      <Person3D a={mom} t={t} />
      {mom.pose.opacity > 0.5 && <Phone3D p={mh} rot={recording ? [0, -0.9, Math.PI / 2] : [-0.2, 0.5, 0]} glow={recording ? 0.4 : 1} />}
    </Bedroom3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

const FNS = [slideBeat, flipBeat, hoopBeat, songBeat, (t: number, s: Side) => slideBeat(t, s, true)];

const counter = (side: Side, bi: number): CounterCfg => {
  if (bi === 4)
    return side === 'scroll'
      ? {label: 'times you watched her', emoji: '👀', steps: [{t: 0, v: 0}], sub: {label: 'times she asked', emoji: '🙋', from: 22.9, steps: [{t: 0, v: 0}, {t: 22.9, v: 1}]}}
      : {label: 'times you watched her', emoji: '👀', steps: [{t: 0, v: 0}, {t: 25.25, v: 1}]};
  return side === 'scroll'
    ? {label: 'times you watched', emoji: '👀', steps: [{t: 0, v: 0}], sub: {label: 'times he asked', emoji: '🙋', from: 0.3, steps: [{t: 0, v: 0}, {t: 0.3, v: 1}, {t: 7.3, v: 46}, {t: 12.9, v: 61}]}}
    : {label: 'times you watched', emoji: '👀', steps: [{t: 0, v: 0}, {t: 2.65, v: 1}, {t: 7.3, v: 46}, {t: 12.9, v: 312}, {t: 17.6, v: 1180}]};
};

const c = (beat: number, lt: number, src: string, vol?: number): Cue => ({at: EP02_BEATS[beat].start + lt, src, vol});
const CUES: Cue[] = [
  // age 4
  c(0, 0.25, 'pop.wav'), c(0, 0.3, 'tick.wav', 0.6), c(0, 1.2, 'pop-low.wav', 0.8), c(0, 1.6, 'slide.wav', 0.8), c(0, 2.65, 'pop.wav'), c(0, 2.65, 'counter.wav', 0.4), c(0, 2.8, 'clap.wav', 0.8),
  c(0, 2.95, 'pop.wav', 0.6), c(0, 3.5, 'pop.wav', 0.6), c(0, 3.9, 'pop-low.wav', 0.7), c(0, 4.3, 'pop.wav'),
  // age 7
  c(1, 0, 'whoosh.wav', 0.8), c(1, 0.95, 'pop.wav'), c(1, 1.1, 'counter.wav', 0.55), c(1, 2.15, 'boing.wav', 0.5), c(1, 2.3, 'whoosh.wav', 0.6), c(1, 2.88, 'bounce.wav', 0.8),
  c(1, 3.05, 'pop.wav'), c(1, 3.1, 'clap.wav', 0.6), c(1, 3.9, 'pop.wav', 0.6), c(1, 4.0, 'pop-low.wav', 0.7), c(1, 4.8, 'pop.wav'), c(1, 4.9, 'pop-low.wav', 0.6),
  // age 11
  c(2, 0, 'whoosh.wav', 0.8), c(2, 0.225, 'bounce.wav', 0.5), c(2, 0.675, 'bounce.wav', 0.5), c(2, 1.125, 'bounce.wav', 0.5), c(2, 1.575, 'bounce.wav', 0.5), c(2, 0.6, 'pop.wav'), c(2, 1.1, 'counter.wav', 0.55),
  c(2, 2.9, 'swish.wav', 1.0), c(2, 3.05, 'pop.wav'), c(2, 3.35, 'bounce.wav', 0.6), c(2, 3.65, 'bounce.wav', 0.4), c(2, 4.0, 'pop-low.wav', 0.7), c(2, 4.62, 'clap.wav', 0.5), c(2, 4.85, 'pop.wav', 0.6),
  // age 15
  c(3, 0, 'whoosh.wav', 0.8), c(3, 0.15, 'strum.wav', 0.7), c(3, 0.4, 'counter.wav', 0.55), c(3, 0.85, 'strum.wav', 0.5), c(3, 0.9, 'door.wav', 0.7), c(3, 1.35, 'pop.wav'), c(3, 2.45, 'pop-low.wav', 0.7),
  c(3, 2.45, 'pop.wav', 0.6), c(3, 3.3, 'door.wav', 0.5), c(3, 3.45, 'rec.wav', 0.6), c(3, 3.5, 'strum.wav', 0.6), c(3, 4.35, 'slam.wav', 0.5), c(3, 4.4, 'strum.wav', 0.5),
  // 25 years later
  c(4, 0, 'whoosh.wav', 0.9), c(4, 0.25, 'pop.wav'), c(4, 0.3, 'tick.wav', 0.6), c(4, 1.2, 'pop-low.wav', 0.8), c(4, 1.6, 'slide.wav', 0.8), c(4, 2.65, 'pop.wav'), c(4, 2.65, 'tick.wav', 0.6), c(4, 2.8, 'clap.wav', 0.8),
  c(4, 2.95, 'pop.wav', 0.6), c(4, 3.5, 'pop.wav', 0.6), c(4, 3.9, 'pop-low.wav', 0.7), c(4, 5.0, 'pop.wav'),
  {at: END_AT, src: 'impact.wav', vol: 0.8},
];

export const Ep02_3D: React.FC<{withAudio?: boolean; music?: boolean}> = ({withAudio = true, music = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const headers = {scroll: 'PARENTS WHO SCROLL 📱', look: 'PARENTS WHO LOOK 👀'};
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Hook t={t} text="Same kid. Same “watch this!” 🛝" endAt={END_AT} />
      <Panel3D t={t} side="scroll" top={TOP_Y} beats={EP02_BEATS} fns={FNS} headers={headers} counter={counter} />
      <Band t={t} beats={EP02_BEATS} />
      <Panel3D t={t} side="look" top={BOT_Y} beats={EP02_BEATS} fns={FNS} headers={headers} counter={counter} />
      <Flash t={t} beats={EP02_BEATS} />
      <EndCard t={t} at={END_AT} l1={'One day they stop\nsaying “watch this.”'} l2={"Make sure it's not\nbecause nobody looked. 👀"} cta="Which parent did you have? 👇" s1={70} s2={66} />
      {withAudio && (
        <Cues
          cues={CUES}
          fps={fps}
          music={music ? 'ep02-music.wav' : undefined}
          beds={[
            {src: 'birds.wav', from: 0, to: 17.2, vol: 0.22},
            {src: 'birds.wav', from: 22.6, to: 29.6, vol: 0.22},
          ]}
        />
      )}
    </AbsoluteFill>
  );
};

