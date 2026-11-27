/**
 * EP03 (3D) — "Same kid. Same bedtime."
 * Top: PARENTS WHO SCROLL 📱   Bottom: PARENTS WHO LOOK 👀
 * Age 3 story → 6 "one more?" → 10 "can I tell you something?" → 14 at 2 AM → 25 years later he reads to his daughter.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {BODIES, Pose} from '../components/Person';
import {Bubble, ClockChip, EmojiPop} from '../components/Overlay';
import {C, LOOKS, Look, BOT_Y} from '../lib/theme';
import {Keyed, kf} from '../lib/anim';
import {Actor, Person3D, handWorld} from '../three/Person3D';
import {Bedroom3D, Chair3D} from '../three/Sets3D';
import {Book3D, Phone3D} from '../three/Props3D';
import {Card, RBox, V3, X, mat, tex} from '../three/core';
import {Band, Beat, Callback, CounterCfg, Cue, Cues, EndCard, Flash, Hook, Out3, P, Panel3D, PopCard, Side, TOP_Y, above, act, camAt as camAtBase, tip} from './shared3d';
import type {Cam} from '../three/Stage';

const BED_BASE: Cam = {pos: [-0.8, 3.1, 11.4], target: [-0.8, 2.35, -0.4], fov: 30};
const camAt = (lt: number, f?: {p: V3; amt: number}) => camAtBase(lt, f, BED_BASE);
import {projector} from '../three/Stage';

export const EP03_BEATS: Beat[] = [
  {start: 0, end: 6.2, label: 'AGE 3'},
  {start: 6.2, end: 11.8, label: 'AGE 6'},
  {start: 11.8, end: 17.2, label: 'AGE 10'},
  {start: 17.2, end: 22.6, label: 'AGE 14'},
  {start: 22.6, end: 32, label: '25 YEARS LATER'},
];
export const EP03_DURATION = 32;
const END_AT = 29.05;

// pyjamas keep the mustard stripe so viewers still recognise Leo
const PJ: Look = {...LOOKS.leo, shirt: '#86b6e6', pants: '#6f9fd4', shoes: '#f4f4f4'};
const PJ_TEEN: Look = {...LOOKS.leoTeen, shirt: '#8a94a6', stripe: '#c8402f', pants: '#4a5568', shoes: '#f4f4f4'};
const PJ_MIA: Look = {...LOOKS.mia, shirt: '#f6a6c1', pants: '#f0b6cb', shoes: '#ffffff'};
const GRANDMA: Look = {...LOOKS.mom, hair: '#c9c9d3', shirt: '#2a8a7f'};

const KID_X = 125; // head of the bed, against the pillow
const KID_Z = -1.0;
const inBed = (extra: Partial<Pose> = {}): Partial<Pose> => ({hipH: 128, fF: [92, -118], fB: [86, -118], lean: -14, hF: [30, 40], hB: [24, 46], tilt: -4, mouth: 'smile', eyes: 'open', ...extra});
const onChair = (extra: Partial<Pose> = {}): Partial<Pose> => ({hipH: 106, fF: [64, 0], fB: [50, 0], hF: [56, 40], hB: [46, 46], tilt: 22, eyes: 'down', mouth: 'flat', ...extra});
const onEdge = (extra: Partial<Pose> = {}): Partial<Pose> => ({hipH: 128, fF: [40, 0], fB: [30, 0], hF: [62, 30], hB: [52, 36], tilt: 6, eyes: 'open', mouth: 'smile', lean: 6, ...extra});
const CHAIR_X = 470;
const EDGE_X = 300;

/** Wiggle keys for a giggling kid. */
const giggle = (t0: number, t1: number): Keyed<Pose>[] => {
  const out: Keyed<Pose>[] = [];
  let i = 0;
  for (let s = t0; s < t1; s += 0.13, i++) out.push({t: s, lean: i % 2 ? -22 : -12, tilt: i % 2 ? -10 : 2, eyes: 'happy', mouth: 'grin'});
  out.push({t: t1 + 0.15, lean: -14, tilt: -4});
  return out;
};

const Blanket: React.FC<{kid: Actor; len: number; color?: string}> = ({kid, len, color = '#6a86c0'}) => (
  <RBox p={[X(kid.pose.x) + len / 2 + 0.15, 1.47, kid.z ?? 0]} s={[len, 0.24, 1.05]} m={mat(color, {rough: 0.95})} r={0.1} />
);

const OpenBook: React.FC<{p: V3; yaw?: number}> = ({p, yaw = 0}) => (
  <group position={p} rotation={[-0.25, yaw, 0]}>
    <group rotation={[0, 0.38, 0]}>
      <Card p={[-0.22, 0.3, 0]} w={0.44} h={0.56} tex={tex.drawing('house', '#fff8e6')} back="#c0392b" />
    </group>
    <group rotation={[0, -0.38, 0]}>
      <Card p={[0.22, 0.3, 0]} w={0.44} h={0.56} tex={tex.drawing('dog', '#fff8e6')} back="#c0392b" />
    </group>
  </group>
);

const ReadLight: React.FC<{on: number}> = ({on}) => (on > 0 ? <pointLight position={[-2.4, 3.4, 1.2]} color="#ffcf87" intensity={11 * on} distance={9} decay={1.4} /> : null);

// =====================================================================
// AGE 3 story (also 25 YEARS LATER with gen2)
// =====================================================================
const storyBeat = (t: number, side: Side, gen2 = false): Out3 => {
  const kb = BODIES.age5;
  const pb = gen2 ? BODIES.man : BODIES.mom;
  const kLook = gen2 ? PJ_MIA : PJ;
  const pLook = gen2 ? LOOKS.leoAdult : LOOKS.mom;
  const kidKeys: Keyed<Pose>[] = [{t: 0, mouth: 'grin', eyes: 'happy'}, {t: 0.3, hipH: 132}, {t: 0.5, hipH: 128}, {t: 0.7, hipH: 132}, {t: 0.9, hipH: 128}];
  const parKeys: Keyed<Pose>[] = [{t: 0}];
  const html: React.ReactNode[] = [];
  let focus: {p: V3; amt: number} | undefined;
  let bookOpen = true;
  const who = 'his mom, 25 years ago';
  if (side === 'scroll') {
    kidKeys.push(
      {t: 1.3, mouth: 'smile', eyes: 'open'},
      {t: 3.3, mouth: 'open', hF: [50, -10], hB: [40, -6]},
      {t: 4.2, mouth: 'flat', hF: [30, 40], hB: [24, 46]},
      {t: 5.2, mouth: 'sad', brows: 'sad', eyes: 'down', tilt: 10},
    );
    parKeys.push({t: 1.3, mouth: 'talk', talk: 1}, {t: 3.2, talk: 0, mouth: 'flat'}, {t: 4.3, mouth: 'talk', talk: 1}, {t: 5.3, talk: 0, mouth: 'flat'});
    bookOpen = t < 5.0;
    focus = {p: [X(KID_X) + 0.4, 2.4, KID_Z], amt: kf(t, [[4.6, 0], [6.0, 0.38]])};
  } else {
    kidKeys.push({t: 1.3, mouth: 'smile', eyes: 'open', lookX: 0.6}, ...giggle(3.0, 4.3), {t: 4.4, mouth: 'open', eyes: 'wide'}, ...giggle(5.1, 6.0));
    parKeys.push(
      {t: 1.3, mouth: 'talk', talk: 1},
      {t: 2.2, talk: 0},
      {t: 2.3, hF: [40, -60], hB: [30, -56], lean: 16, eyes: 'wide', brows: 'angry', mouth: 'open', e: 'out'},
      {t: 3.3, hF: [62, 30], hB: [52, 36], lean: 6, brows: 'none', eyes: 'happy', mouth: 'grin'},
      {t: 4.4, hF: [60, -80], hB: [-40, -80], lean: 10, eyes: 'wide', mouth: 'open', e: 'out'},
      {t: 5.4, hF: [62, 30], hB: [52, 36], lean: 6, eyes: 'happy', mouth: 'grin'},
    );
    focus = {p: [X(200), 2.3, -0.5], amt: kf(t, [[1.4, 0], [2.4, 0.32], [5.6, 0.32]])};
  }
  const kid = act(gen2 ? 'miapj' : 'leo5pj', kb, kLook, P(kb, KID_X, 1, inBed()), kidKeys, t, KID_Z, 5);
  const par =
    side === 'scroll'
      ? act(gen2 ? 'leoAdult' : 'mom', pb, pLook, P(pb, CHAIR_X, -1, onChair()), parKeys, t, -0.3, 2)
      : act(gen2 ? 'leoAdult' : 'mom', pb, pLook, P(pb, EDGE_X, -1, onEdge()), parKeys, t, -0.05, 2);
  const gma = gen2 && side === 'look' ? act('grandma', BODIES.mom, GRANDMA, P(BODIES.mom, 965, -1, {mouth: 'smile', hF: [10, 116], hB: [10, 116]}), [{t: 0}, {t: 4.4, eyes: 'happy', mouth: 'grin'}], t, -1.9, 7) : null;
  const cam = camAt(t, focus);
  const proj = projector(cam);
  const kTop = above(proj, kid, t, 8);
  const pTip = tip(proj, par, t);
  html.push(<ClockChip key="clk" text="8:02 PM" />);
  html.push(<Bubble key="k1" t={t} from={0.25} to={1.2} x={kTop[0]} y={kTop[1]} text="STORY! STORY! 📖" side="right" />);
  if (side === 'scroll') {
    html.push(<Bubble key="p1" t={t} from={1.3} to={2.25} x={pTip[0]} y={pTip[1] + 40} text="once upon a time… *scroll*" kind="mutter" side="left" size={30} />);
    html.push(<Bubble key="p2" t={t} from={2.3} to={3.2} x={pTip[0]} y={pTip[1] + 40} text="…three pigs… *scroll*" kind="mutter" side="left" size={30} />);
    html.push(<Bubble key="k2" t={t} from={3.3} to={4.2} x={kTop[0]} y={kTop[1]} text="do the WOLF voice! 🐺" side="right" size={32} />);
    html.push(<Bubble key="p3" t={t} from={4.3} to={5.25} x={pTip[0]} y={pTip[1] + 40} text="…the end. Lights off. 📱" kind="mutter" side="left" size={30} />);
    html.push(<EmojiPop key="e" t={t} from={5.2} to={6.2} x={kTop[0] + 70} y={kTop[1] + 10} e="😶" />);
    if (gen2) html.push(<Callback key="cb" t={t} from={5.3} to={6.4} x={590} y={118} quote="…the end. Lights off." by={who} />);
  } else {
    html.push(<Bubble key="p1" t={t} from={1.3} to={2.2} x={pTip[0]} y={pTip[1] + 40} text="Once upon a time… 📖" side="left" size={32} />);
    html.push(<Bubble key="p2" t={t} from={2.3} to={3.25} x={pTip[0]} y={pTip[1] + 40} text="I'LL HUFF… AND I'LL PUFF!! 🐺" kind="shout" side="left" size={32} />);
    html.push(<Bubble key="k2" t={t} from={3.4} to={4.3} x={kTop[0]} y={kTop[1]} text="AGAIN! AGAIN! 😆" side="right" size={32} />);
    html.push(<Bubble key="p3" t={t} from={4.4} to={5.35} x={pTip[0]} y={pTip[1] + 40} text="…AND BLOW YOUR HOUSE DOWN!! 💨" kind="shout" side="left" size={30} />);
    html.push(<EmojiPop key="e" t={t} from={3.3} to={4.3} x={kTop[0] + 80} y={kTop[1] + 20} e="😂" size={56} />);
    html.push(<EmojiPop key="w" t={t} from={2.4} to={3.3} x={pTip[0] - 150} y={pTip[1] + 110} e="🐺" size={70} />);
    if (gen2) {
      html.push(<Callback key="cb" t={t} from={3.35} to={4.35} x={590} y={118} quote="I'LL HUFF… AND I'LL PUFF!!" by={who} />);
      const g = above(proj, gma!, t, 10);
      html.push(<EmojiPop key="g" t={t} from={4.5} to={6.4} x={g[0] - 40} y={g[1] + 40} e="🥹" size={58} />);
    }
  }
  const ph = handWorld(par, t);
  const pb2 = handWorld(par, t, 'B');
  const scene = (
    <Bedroom3D night lamp={side === 'scroll' ? 0.35 : 0.7} doorOpen={gma ? kf(t, [[3.6, 0], [4.1, 0.85, 'out']]) : 0} wallArt={side === 'look' ? 12 : 0} warm={side === 'look'}>
      <ReadLight on={side === 'scroll' ? 0.45 : 1} />
      {side === 'scroll' && <Chair3D x={X(CHAIR_X)} seat={1.0} facing={-1} color="#6b4b3a" z={-0.3} />}
      <Person3D a={kid} t={t} />
      <Blanket kid={kid} len={1.35} color={gen2 ? '#d98fb0' : '#6a86c0'} />
      <Person3D a={par} t={t} />
      {gma && t > 3.7 && <Person3D a={gma} t={t} />}
      {bookOpen && side === 'scroll' && <Book3D p={ph} rot={[0.6, 0.3, 0]} color="#c0392b" label="3 PIGS" />}
      {side === 'scroll' && <Phone3D p={pb2} rot={[-0.2, 0.5, 0]} />}
      {side === 'look' && <OpenBook p={[ph[0] - 0.05, ph[1] - 0.05, ph[2] + 0.1]} yaw={-0.45} />}
    </Bedroom3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

// =====================================================================
// AGE 6 — "one more story?"
// =====================================================================
const oneMoreBeat = (t: number, side: Side): Out3 => {
  const kb = BODIES.age8;
  const pb = BODIES.mom;
  const kidKeys: Keyed<Pose>[] = [{t: 0}, {t: 0.9, hF: [40, 0], hB: [34, 4], mouth: 'open', brows: 'worried', eyes: 'wide'}, {t: 2.0, mouth: 'smile', brows: 'none', eyes: 'open'}];
  const momKeys: Keyed<Pose>[] = [{t: 0}];
  const html: React.ReactNode[] = [];
  let lamp = 0.7;
  let door = 0;
  let hall = 0;
  let mom: Actor;
  let focus: {p: V3; amt: number} | undefined;
  if (side === 'scroll') {
    momKeys.push({t: 2.1, mouth: 'talk', talk: 1}, {t: 3.0, talk: 0, mouth: 'flat'}, {t: 3.75, opacity: 1}, {t: 3.8, opacity: 0, e: 'step'});
    lamp = kf(t, [[3.05, 0.7], [3.1, 0, 'step']]);
    door = kf(t, [[0, 1], [3.3, 1], [3.8, 0, 'in']]);
    hall = kf(t, [[3.8, 1], [5.0, 1], [5.2, 0]]);
    kidKeys.push({t: 3.2, mouth: 'flat', eyes: 'down', tilt: 8}, {t: 4.2, mouth: 'talk', talk: 1}, {t: 5.0, talk: 0, mouth: 'sad', brows: 'sad'});
    mom = act('mom', pb, LOOKS.mom, P(pb, 965, -1, {hF: [40, 44], hB: [76, -10], tilt: 24, eyes: 'down', mouth: 'flat'}), momKeys, t, -1.9, 2);
    focus = {p: [X(KID_X) + 0.4, 2.5, KID_Z], amt: kf(t, [[3.4, 0], [5.4, 0.38]])};
  } else {
    momKeys.push(
      {t: 2.1, hF: [50, -50], hB: [44, -40], mouth: 'talk', talk: 1, eyes: 'happy'},
      {t: 3.1, talk: 0, mouth: 'grin'},
      {t: 4.2, hF: [40, -70], hB: [30, -66], lean: 16, mouth: 'open', eyes: 'wide', brows: 'angry', e: 'out'},
      {t: 5.1, hF: [62, 30], hB: [52, 36], lean: 6, mouth: 'grin', eyes: 'happy', brows: 'none'},
    );
    kidKeys.push({t: 3.2, hF: [80, -20], mouth: 'open', eyes: 'happy'}, {t: 4.1, hF: [30, 40]}, ...giggle(4.3, 5.4));
    mom = act('mom', pb, LOOKS.mom, P(pb, EDGE_X, -1, onEdge()), momKeys, t, -0.05, 2);
    focus = {p: [X(200), 2.4, -0.5], amt: kf(t, [[1.6, 0], [2.6, 0.3], [5.6, 0.3]])};
  }
  const kid = act('leo8pj', kb, PJ, P(kb, KID_X, 1, inBed()), kidKeys, t, KID_Z, 5);
  const cam = camAt(t, focus);
  const proj = projector(cam);
  const kTop = above(proj, kid, t, 8);
  const mTip = tip(proj, mom, t);
  html.push(<ClockChip key="clk" text="8:15 PM" />);
  html.push(<Bubble key="k1" t={t} from={0.9} to={2.0} x={kTop[0]} y={kTop[1]} text="One more story? Pleeease 🥺" side="right" size={32} />);
  if (side === 'scroll') {
    html.push(<Bubble key="m" t={t} from={2.1} to={3.0} x={mTip[0]} y={mTip[1] + 30} text="No. Lights off. 📱" kind="mutter" side="left" size={32} />);
    html.push(<Bubble key="k2" t={t} from={4.2} to={5.0} x={kTop[0]} y={kTop[1]} text="…night, mom." kind="mutter" side="right" size={28} />);
    html.push(<EmojiPop key="e" t={t} from={5.0} to={5.6} x={kTop[0] + 80} y={kTop[1] + 10} e="😔" />);
  } else {
    html.push(<Bubble key="m" t={t} from={2.1} to={3.1} x={mTip[0]} y={mTip[1] + 40} text="ONE more. YOU pick. 📚" side="left" size={32} />);
    html.push(<Bubble key="k2" t={t} from={3.2} to={4.1} x={kTop[0]} y={kTop[1]} text="THE DRAGON ONE! 🐉" side="right" kind="shout" />);
    html.push(<Bubble key="m2" t={t} from={4.2} to={5.1} x={mTip[0]} y={mTip[1] + 40} text="RAAAWR!! 🔥" side="left" kind="shout" />);
    html.push(<EmojiPop key="e" t={t} from={4.4} to={5.5} x={kTop[0] + 80} y={kTop[1] + 20} e="😆" size={56} />);
  }
  const mh = handWorld(mom, t);
  const mb = handWorld(mom, t, 'B');
  const scene = (
    <Bedroom3D night lamp={lamp} doorOpen={door} hallLight={hall} wallArt={side === 'look' ? 16 : 0} warm={side === 'look'}>
      <ReadLight on={side === 'scroll' ? lamp * 0.5 : 1} />
      <Person3D a={kid} t={t} />
      <Blanket kid={kid} len={1.6} />
      <Person3D a={mom} t={t} />
      {side === 'scroll' && mom.pose.opacity > 0.5 && <Phone3D p={mh} rot={[-0.2, 0.5, 0]} />}
      {side === 'look' && t > 2.0 && t < 4.15 && (
        <>
          <Book3D p={mh} rot={[1.2, 0.3, 0]} color="#2f9c8f" label="DRAGON" />
          <Book3D p={mb} rot={[1.2, 0.3, 0]} color="#8e44ad" label="SPACE" />
        </>
      )}
      {side === 'look' && t >= 4.15 && <OpenBook p={[mh[0], mh[1] - 0.05, mh[2] + 0.1]} yaw={-0.45} />}
    </Bedroom3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

// =====================================================================
// AGE 10 — "can I tell you something?"
// =====================================================================
const tellBeat = (t: number, side: Side): Out3 => {
  const kb = BODIES.age12;
  const pb = BODIES.mom;
  const kidKeys: Keyed<Pose>[] = [{t: 0, mouth: 'flat', brows: 'worried', eyes: 'down', tilt: 8}, {t: 0.9, mouth: 'talk', talk: 1, eyes: 'open', tilt: 0, lookX: 0.6}, {t: 2.1, talk: 0, mouth: 'flat'}];
  const momKeys: Keyed<Pose>[] = [{t: 0}];
  const html: React.ReactNode[] = [];
  let door = 0;
  let mom: Actor;
  let focus: {p: V3; amt: number} | undefined;
  if (side === 'scroll') {
    door = kf(t, [[0.55, 0], [0.95, 1, 'out'], [3.2, 1], [3.7, 0, 'in']]);
    momKeys.push({t: 0, opacity: 0}, {t: 0.6, opacity: 0, e: 'step'}, {t: 0.65, opacity: 1, e: 'step', hF: [40, 44], hB: [30, 52], tilt: 24, eyes: 'down', mouth: 'flat'}, {t: 2.2, mouth: 'talk', talk: 1}, {t: 3.1, talk: 0}, {t: 3.65, opacity: 1}, {t: 3.7, opacity: 0, e: 'step'});
    kidKeys.push({t: 3.3, eyes: 'down', tilt: 12, brows: 'sad'}, {t: 3.9, mouth: 'talk', talk: 1}, {t: 5.0, talk: 0, mouth: 'sad'});
    mom = act('mom', pb, LOOKS.mom, P(pb, 965, -1), momKeys, t, -1.9, 2);
    focus = {p: [X(KID_X) + 0.4, 2.6, KID_Z], amt: kf(t, [[3.3, 0], [5.4, 0.38]])};
  } else {
    momKeys.push(
      {t: 0.9, lookX: 0.6, eyes: 'open', brows: 'worried'},
      {t: 2.2, mouth: 'talk', talk: 1},
      {t: 3.0, talk: 0, mouth: 'smile', brows: 'none'},
      {t: 4.1, hF: [100, 30], hB: [92, 36], handsIn: 0.4, lean: 22, tilt: 6, eyes: 'closed', mouth: 'smile'},
    );
    kidKeys.push({t: 3.1, mouth: 'talk', talk: 1, brows: 'sad'}, {t: 4.1, talk: 0, mouth: 'smile', eyes: 'closed', lean: -6}, {t: 5.2, eyes: 'open'});
    mom = act('mom', pb, LOOKS.mom, P(pb, EDGE_X, -1, onEdge({hF: [40, 70], hB: [30, 74]})), momKeys, t, -0.05, 2);
    focus = {p: [X(200), 2.5, -0.5], amt: kf(t, [[2.0, 0], [3.2, 0.34], [5.4, 0.36]])};
  }
  const kid = act('leo12pj', kb, PJ, P(kb, KID_X, 1, inBed({hipH: 130})), kidKeys, t, KID_Z, 5);
  const cam = camAt(t, focus);
  const proj = projector(cam);
  const kTop = above(proj, kid, t, 8);
  const mTip = tip(proj, mom, t);
  html.push(<ClockChip key="clk" text="9:30 PM" />);
  html.push(<Bubble key="k1" t={t} from={0.9} to={2.1} x={kTop[0]} y={kTop[1]} text="Mom… can I tell you something? 😟" side="right" size={30} />);
  if (side === 'scroll') {
    html.push(<Bubble key="m" t={t} from={2.2} to={3.1} x={mTip[0]} y={mTip[1] + 30} text="Tell me tomorrow, ok? 📱" kind="mutter" side="left" size={30} />);
    html.push(<Bubble key="k2" t={t} from={3.9} to={5.0} x={kTop[0]} y={kTop[1]} text="someone was mean to me today…" kind="mutter" side="right" size={26} />);
    html.push(<EmojiPop key="e" t={t} from={5.0} to={5.6} x={kTop[0] + 90} y={kTop[1] + 10} e="😢" />);
  } else {
    html.push(<Bubble key="m" t={t} from={2.2} to={3.0} x={mTip[0]} y={mTip[1] + 40} text="Tell me now. ❤️" side="left" size={34} />);
    html.push(<Bubble key="k2" t={t} from={3.1} to={4.1} x={kTop[0]} y={kTop[1]} text="someone was mean to me today…" side="right" size={28} />);
    html.push(<Bubble key="m2" t={t} from={4.2} to={5.3} x={mTip[0]} y={mTip[1] + 40} text="I'm right here. 🫂" side="left" size={32} />);
  }
  const mh = handWorld(mom, t);
  const scene = (
    <Bedroom3D night lamp={0.6} doorOpen={door} wallArt={side === 'look' ? 20 : 0} studyPlan={side === 'scroll'} warm={side === 'look'}>
      <ReadLight on={side === 'scroll' ? 0.4 : 0.9} />
      <Person3D a={kid} t={t} />
      <Blanket kid={kid} len={1.9} />
      <Person3D a={mom} t={t} />
      {side === 'scroll' && mom.pose.opacity > 0.5 && <Phone3D p={mh} rot={[-0.2, 0.5, 0]} />}
    </Bedroom3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

// =====================================================================
// AGE 14 — 2 AM (top) vs a goodnight knock (bottom)
// =====================================================================
const lateBeat = (t: number, side: Side): Out3 => {
  const kb = BODIES.age16;
  const pb = BODIES.mom;
  const kidKeys: Keyed<Pose>[] = [{t: 0}];
  const momKeys: Keyed<Pose>[] = [{t: 0, opacity: 0}];
  const html: React.ReactNode[] = [];
  let door = 0;
  let lamp = 0;
  let focus: {p: V3; amt: number} | undefined;
  if (side === 'scroll') {
    kidKeys.push({t: 0, hF: [60, -14], hB: [54, -8], tilt: 18, eyes: 'down', mouth: 'flat'});
    for (let s = 0.4; s < 5.4; s += 0.7) kidKeys.push({t: s, hF: [60, -14 + ((Math.round(s / 0.7) % 2) * 6)]});
    kidKeys.push({t: 4.5, eyes: 'down', mouth: 'flat', brows: 'sad'});
    focus = {p: [X(KID_X) + 0.4, 2.7, KID_Z], amt: kf(t, [[0.8, 0], [5.4, 0.38]])};
    html.push(<ClockChip key="clk" text="2:14 AM" />);
    html.push(
      <PopCard key="card" t={t} from={1.6} to={4.4} x={600} y={120} w={380} rot={3}>
        <div style={{fontSize: 26, fontWeight: 700}}>📱 Screen Time</div>
        <div style={{fontSize: 22, fontWeight: 500, color: '#5a5266', marginTop: 6}}>Today: <b style={{color: C.ink}}>6h 41m</b></div>
        <div style={{fontSize: 22, fontWeight: 500, color: '#5a5266'}}>Goodnights: <b style={{color: '#e2445c'}}>0</b></div>
      </PopCard>,
    );
  } else {
    lamp = 0.6;
    door = kf(t, [[0.95, 0], [1.3, 0.8, 'out'], [4.1, 0.8], [4.6, 0, 'in']]);
    kidKeys.push({t: 0, hF: [60, -14], hB: [54, -8], tilt: 18, eyes: 'down', mouth: 'flat'}, {t: 0.85, tilt: 0, lookX: 0.7, eyes: 'open'}, {t: 2.5, mouth: 'talk', talk: 1, eyes: 'closed'}, {t: 3.2, talk: 0, mouth: 'flat', eyes: 'open'}, {t: 4.6, mouth: 'smile', eyes: 'happy', hF: [30, 40], hB: [24, 46]});
    momKeys.push({t: 1.0, opacity: 0, e: 'step'}, {t: 1.05, opacity: 1, e: 'step', mouth: 'smile', hF: [70, -70], hB: [10, 116]}, {t: 1.3, mouth: 'talk', talk: 1, hF: [10, 116]}, {t: 2.4, talk: 0, mouth: 'smile'}, {t: 3.3, mouth: 'talk', talk: 1}, {t: 4.0, talk: 0, mouth: 'smile', eyes: 'happy'}, {t: 4.55, opacity: 1}, {t: 4.6, opacity: 0, e: 'step'});
    focus = {p: [X(KID_X) + 0.4, 2.7, KID_Z], amt: kf(t, [[4.0, 0], [5.4, 0.36]])};
    html.push(<ClockChip key="clk" text="10:45 PM" />);
  }
  const kid = act('leo16pj', kb, PJ_TEEN, P(kb, KID_X, 1, inBed({hipH: 132})), kidKeys, t, KID_Z, 5);
  const mom = act('mom', pb, LOOKS.mom, P(pb, 965, -1), momKeys, t, -1.9, 2);
  const cam = camAt(t, focus);
  const proj = projector(cam);
  const kTop = above(proj, kid, t, 8);
  const mTip = tip(proj, mom, t);
  if (side === 'scroll') {
    html.push(<EmojiPop key="e" t={t} from={4.5} to={5.5} x={kTop[0] + 90} y={kTop[1] + 10} e="😶" />);
  } else {
    html.push(<Bubble key="m" t={t} from={1.3} to={2.4} x={mTip[0]} y={mTip[1] + 30} text="Night, kiddo. Proud of you. 🌙" side="left" size={30} />);
    html.push(<Bubble key="k" t={t} from={2.5} to={3.2} x={kTop[0]} y={kTop[1]} text="MOM… 🙄" side="right" />);
    html.push(<Bubble key="m2" t={t} from={3.3} to={4.0} x={mTip[0]} y={mTip[1] + 30} text="Love you." side="left" size={32} />);
    html.push(<Bubble key="k2" t={t} from={4.7} to={5.4} x={kTop[0]} y={kTop[1]} text="…love you too." kind="mutter" side="right" size={28} />);
    html.push(<EmojiPop key="e" t={t} from={4.6} to={5.5} x={kTop[0] + 110} y={kTop[1] + 30} e="☺️" size={54} />);
  }
  const kh = handWorld(kid, t);
  const scene = (
    <Bedroom3D night lamp={lamp} doorOpen={door} wallArt={side === 'look' ? 24 : 0} warm={side === 'look'}>
      <Person3D a={kid} t={t} />
      <Blanket kid={kid} len={2.1} color={side === 'scroll' ? '#3f4f78' : '#6a86c0'} />
      <Person3D a={mom} t={t} />
      {side === 'scroll' && (
        <>
          <Phone3D p={kh} rot={[-0.1, -0.6, 0]} glow={1.4} />
          <pointLight position={[kh[0] + 0.3, kh[1] + 0.4, kh[2] + 0.5]} color="#7fb8ff" intensity={4} distance={3.5} decay={1.4} />
        </>
      )}
    </Bedroom3D>
  );
  return {scene, overlay: <>{html}</>, cam};
};

const FNS = [storyBeat, oneMoreBeat, tellBeat, lateBeat, (t: number, s: Side) => storyBeat(t, s, true)];

const counter = (side: Side, bi: number): CounterCfg => {
  if (bi === 4) return {label: 'bedtime talks with her', emoji: '🌙', steps: [{t: 0, v: 0}, {t: 23.9, v: 1}]};
  return side === 'scroll'
    ? {label: 'bedtime talks', emoji: '🌙', steps: [{t: 0, v: 0}, {t: 1.3, v: 1}, {t: 7.3, v: 12}], sub: {label: 'nights alone', emoji: '🌑', from: 15.6, steps: [{t: 0, v: 0}, {t: 15.6, v: 380}, {t: 17.6, v: 2100}]}}
    : {label: 'bedtime talks', emoji: '🌙', steps: [{t: 0, v: 0}, {t: 1.3, v: 1}, {t: 7.3, v: 1100}, {t: 12.9, v: 2400}, {t: 17.6, v: 3650}]};
};

const c = (beat: number, lt: number, src: string, vol?: number): Cue => ({at: EP03_BEATS[beat].start + lt, src, vol});
const CUES: Cue[] = [
  c(0, 0.25, 'pop.wav'), c(0, 1.25, 'pageflip.wav', 0.8), c(0, 1.3, 'pop-low.wav', 0.6), c(0, 1.3, 'tick.wav', 0.5), c(0, 2.3, 'huff.wav', 0.9), c(0, 2.3, 'pop.wav', 0.6), c(0, 3.3, 'pop.wav', 0.6), c(0, 4.4, 'huff.wav', 0.9), c(0, 4.4, 'pop.wav', 0.6), c(0, 5.0, 'pageflip.wav', 0.5),
  c(1, 0, 'whoosh.wav', 0.8), c(1, 0.9, 'pop.wav'), c(1, 1.1, 'counter.wav', 0.55), c(1, 2.1, 'pop-low.wav', 0.7), c(1, 2.1, 'pop.wav', 0.6), c(1, 3.1, 'click.wav', 0.9), c(1, 3.2, 'pop.wav'), c(1, 3.3, 'door.wav', 0.5), c(1, 4.2, 'pop.wav'), c(1, 4.2, 'huff.wav', 0.6), c(1, 4.2, 'pop-low.wav', 0.5),
  c(2, 0, 'whoosh.wav', 0.8), c(2, 0.55, 'door.wav', 0.6), c(2, 0.9, 'pop.wav'), c(2, 1.1, 'counter.wav', 0.55), c(2, 2.2, 'pop-low.wav', 0.7), c(2, 2.2, 'pop.wav', 0.6), c(2, 3.1, 'pop.wav', 0.6), c(2, 3.2, 'door.wav', 0.5), c(2, 3.9, 'pop-low.wav', 0.6), c(2, 4.2, 'pop.wav', 0.6),
  c(3, 0, 'whoosh.wav', 0.8), c(3, 0.4, 'counter.wav', 0.55), c(3, 0.8, 'knock.wav', 0.9), c(3, 1.6, 'rec.wav', 0.4), c(3, 1.3, 'pop.wav', 0.6), c(3, 2.5, 'pop.wav'), c(3, 3.3, 'pop.wav', 0.6), c(3, 4.1, 'door.wav', 0.4), c(3, 4.7, 'pop-low.wav', 0.5),
  c(4, 0, 'whoosh.wav', 0.9), c(4, 0.25, 'pop.wav'), c(4, 1.25, 'pageflip.wav', 0.8), c(4, 1.3, 'pop-low.wav', 0.6), c(4, 1.3, 'tick.wav', 0.5), c(4, 2.3, 'huff.wav', 0.9), c(4, 2.3, 'pop.wav', 0.6), c(4, 3.4, 'pop.wav', 0.6), c(4, 3.6, 'door.wav', 0.4), c(4, 4.4, 'huff.wav', 0.9), c(4, 4.4, 'pop.wav', 0.6),
  {at: END_AT, src: 'impact.wav', vol: 0.8},
];

export const Ep03_3D: React.FC<{withAudio?: boolean; music?: boolean}> = ({withAudio = true, music = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const headers = {scroll: 'PARENTS WHO SCROLL 📱', look: 'PARENTS WHO LOOK 👀'};
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Hook t={t} text="Same kid. Same bedtime. 🌙" endAt={END_AT} />
      <Panel3D t={t} side="scroll" top={TOP_Y} beats={EP03_BEATS} fns={FNS} headers={headers} counter={counter} />
      <Band t={t} beats={EP03_BEATS} />
      <Panel3D t={t} side="look" top={BOT_Y} beats={EP03_BEATS} fns={FNS} headers={headers} counter={counter} />
      <Flash t={t} beats={EP03_BEATS} />
      <EndCard t={t} at={END_AT} l1={'The last voice they hear\nevery night…'} l2={"…make it yours,\nnot a screen's. 🌙"} cta="Which parent did you have? 👇" s1={70} s2={68} />
      {withAudio && <Cues cues={CUES} fps={fps} music={music ? 'ep03-music.wav' : undefined} beds={[{src: 'crickets.wav', from: 0, to: 29.6, vol: 0.18}]} />}
    </AbsoluteFill>
  );
};

