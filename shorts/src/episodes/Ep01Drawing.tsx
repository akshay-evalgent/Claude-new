/**
 * EP01 — "Same kid. Same drawing."
 * Top: PARENTS WHO SCROLL 📱   Bottom: PARENTS WHO LOOK 👀
 * Ages 5 → 8 → 12 → 16 → 25 years later (he is the parent now).
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BODIES, Body, Person, Pose, rig, standPose, toWorld} from '../components/Person';
import {Drawing, DrawingKind, Gift, Markers, Phone, Sketchbook} from '../components/Props';
import {Bubble, ClockChip, Counter, EmojiPop, Header} from '../components/Overlay';
import {Bedroom, Kitchen} from '../scenes/Sets';
import {C, FONT, GROUND, LOOKS, PANEL_H, TOP_Y, BOT_Y, BAND_H, W} from '../lib/theme';
import {Keyed, clamp, kf, pop, prog, track} from '../lib/anim';

type Side = 'scroll' | 'look';
type Out = {svg: React.ReactNode; html: React.ReactNode};

export const BEATS = [
  {start: 0, end: 6.2, label: 'AGE 5'},
  {start: 6.2, end: 11.8, label: 'AGE 8'},
  {start: 11.8, end: 17.2, label: 'AGE 12'},
  {start: 17.2, end: 22.6, label: 'AGE 16'},
  {start: 22.6, end: 32, label: '25 YEARS LATER'},
];
export const EP01_DURATION = 32;
const END_AT = 29.05; // moral card, lands on the final chord

// ---------- helpers ----------
const G = GROUND;
const headTop = (b: Body, p: Pose, dx = 0, dy = 16): [number, number] => {
  const r = rig(b, p);
  const [x, y] = toWorld(p, r.head);
  return [x + dx * p.facing, y - b.headR - dy];
};
/** Tip point just in front of the face, at mouth height; bubble body goes forward and up. */
const faceTip = (b: Body, p: Pose, dx = 8): [number, number, 'left' | 'right'] => {
  const r = rig(b, p);
  const [x, y] = toWorld(p, r.head);
  return [x + p.facing * (b.headR + dx), y - b.headR * 0.15, p.facing < 0 ? 'left' : 'right'];
};
const handW = (b: Body, p: Pose, which: 'F' | 'B' = 'F') => toWorld(p, rig(b, p)[which === 'F' ? 'handF' : 'handB']);
const P = (b: Body, x: number, facing: number, extra: Partial<Pose> = {}): Pose => ({...standPose(b, x, G, facing), ...extra});
const tr = (t: number, base: Pose, keys: Keyed<Pose>[]) => track(t, base as unknown as Record<string, never>, keys as never) as unknown as Pose;

const Chair: React.FC<{x: number; seat: number; facing: number; color?: string}> = ({x, seat, facing, color = '#a0704b'}) => (
  <g transform={`translate(${x} 0) scale(${facing} 1)`}>
    <rect x={-34} y={G - seat - 6} width={70} height={14} rx={4} fill={color} stroke={C.ink} strokeWidth={5} />
    <rect x={-38} y={G - seat - 110} width={14} height={110} rx={5} fill={color} stroke={C.ink} strokeWidth={5} />
    <rect x={-30} y={G - seat + 8} width={10} height={seat - 8} fill={color} stroke={C.ink} strokeWidth={4} />
    <rect x={20} y={G - seat + 8} width={10} height={seat - 8} fill={color} stroke={C.ink} strokeWidth={4} />
  </g>
);

/** Paper that slips from a hand and flutters to the floor. */
const FallingPaper: React.FC<{t: number; at: number; from: [number, number]; kind: DrawingKind; w?: number}> = ({t, at, from, kind, w = 100}) => {
  if (t < at) return null;
  const p = clamp((t - at) / 0.9);
  const x = from[0] + Math.sin(p * Math.PI * 2) * 30 + p * 40;
  const y = from[1] + (G - from[1]) * (p * p);
  const flat = p >= 1 ? 0.22 : 1 - 0.78 * p * p;
  const rot = Math.sin(p * Math.PI * 3) * 25 * (1 - p);
  return (
    <g transform={`translate(${x} ${p >= 1 ? G - 2 : y}) rotate(${rot}) scale(1 ${flat})`}>
      <Drawing kind={kind} w={w} h={w * 0.76} />
    </g>
  );
};

// ---------- BEAT 1 / AGE 5 ----------
const beat1 = (t: number, side: Side, leoAdult = false): Out => {
  // Shared by beat 5 (leoAdult = true): same staging, next generation.
  const pb = leoAdult ? BODIES.man : BODIES.mom;
  const parentLook = leoAdult ? LOOKS.leoAdult : LOOKS.mom;
  const kb = BODIES.age5;
  const kidLook = leoAdult ? LOOKS.mia : LOOKS.leo;
  const kind: DrawingKind = leoAdult ? 'portrait' : 'family';

  const kidKeys: Keyed<Pose>[] = [
    {t: 0, x: 1150, walk: 2, hF: [62, -6], hB: [52, 2], mouth: 'grin', eyes: 'happy'},
    {t: 0.95, x: 650, e: 'out'},
    {t: 1.1, walk: 0, e: 'out'},
  ];
  const parentKeys: Keyed<Pose>[] = [
    {t: 0, x: 430, hF: [40, 44], hB: [30, 52], tilt: 24, eyes: 'down', mouth: 'flat'},
  ];
  let held: 'kid' | 'parent' | 'none' = 'kid';
  let phone = true;
  let svgExtra: React.ReactNode = null;
  const html: React.ReactNode[] = [];
  let fridgeExtra: React.ReactNode = null;

  if (side === 'scroll') {
    kidKeys.push(
      {t: 2.0, mouth: 'smile', eyes: 'open'},
      {t: 2.2, hF: [62, -6], hB: [52, 2], tilt: 0},
      {t: 3.2, hF: [14, 58], hB: [-6, 66], tilt: 18, eyes: 'down', mouth: 'sad', brows: 'sad', e: 'inOut'},
      {t: 4.3, facing: -1},
      {t: 4.5, facing: 1, e: 'linear'},
      {t: 4.6, walk: 0.8},
      {t: 6.2, x: 1220, e: 'linear'},
    );
    parentKeys.push({t: 4.6, mouth: 'flat'}, {t: 4.9, mouth: 'smile'});
    held = t < 3.55 ? 'kid' : 'none';
  } else {
    kidKeys.push(
      {t: 2.4, hF: [62, -6]},
      {t: 2.6, lift: 0, eyes: 'happy', mouth: 'grin'},
      {t: 2.8, lift: 46, e: 'out'},
      {t: 3.0, lift: 0, e: 'in'},
      {t: 3.15, hF: [66, -2]},
      {t: 3.4, hF: [10, 58], hB: [-6, 66]},
      {t: 3.6, facing: 1},
      {t: 3.8, facing: -1, e: 'linear'},
      {t: 3.9, walk: 1},
      {t: 4.9, x: 470, e: 'inOut'},
      {t: 5.0, walk: 0},
      {t: 5.5, lift: 0},
      {t: 5.7, lift: 40, e: 'out'},
      {t: 5.9, lift: 0, e: 'in'},
    );
    parentKeys.push(
      {t: 1.15, tilt: 24},
      {t: 1.45, tilt: 4, lookX: 0.6, eyes: 'wide', mouth: 'o', brows: 'up', hF: [10, 116], e: 'out'},
      {t: 1.75, hipX: 0},
      {t: 2.35, x: 500, hipH: pb === BODIES.man ? 104 : 100, lean: 12, fF: [46, 0], fB: [-90, 0], tilt: 10, hF: [40, 70], hB: [30, 80], mouth: 'open', eyes: 'open'},
      {t: 3.0, hF: [88, -34], hB: [74, -26], mouth: 'grin', eyes: 'happy', brows: 'none', tilt: -4},
      {t: 3.5, hipH: pb.thigh + pb.shin + 8, lean: 0, fF: [14, 0], fB: [-14, 0], tilt: 0, eyes: 'open', hF: [60, 40], hB: [30, 90]},
      {t: 3.6, facing: 1},
      {t: 3.75, facing: -1, e: 'linear'},
      {t: 3.85, walk: 1},
      {t: 4.7, x: 290, e: 'inOut'},
      {t: 4.8, walk: 0, hF: [60, 40]},
      {t: 5.15, hF: leoAdult ? [118, -44] : [118, 40], tilt: leoAdult ? -14 : -6, e: 'out'},
      {t: 5.5, hF: leoAdult ? [118, -44] : [118, 40]},
      {t: 5.85, hF: [10, 116], tilt: 4, mouth: 'smile', e: 'inOut'},
      {t: 5.9, facing: -1},
      {t: 6.05, facing: 1, e: 'linear'},
    );
    phone = t < 1.7;
    held = t < 3.05 ? 'kid' : t < 5.2 ? 'parent' : 'none';
    // pinned on the fridge
    const pin = pop(t, 5.2, 0.4);
    if (t >= 5.2)
      fridgeExtra = (
        <g transform={`translate(172 ${leoAdult ? 238 : 344}) rotate(${-4}) scale(${0.7 + 0.3 * pin})`}>
          <Drawing kind={kind} w={92} h={70} />
          <circle cx={0} cy={-56} r={7} fill="#e2445c" stroke={C.ink} strokeWidth={3} />
        </g>
      );
  }

  const kid = tr(t, P(kb, 1150, -1), kidKeys);
  const par = tr(t, P(pb, 430, 1), parentKeys);

  if (side === 'scroll') {
    const drop = handW(kb, tr(3.55, P(kb, 1150, -1), kidKeys));
    svgExtra = <FallingPaper t={t} at={3.55} from={[drop[0], drop[1] - 40]} kind={kind} w={92} />;
  }

  const kidTop = headTop(kb, kid, 0, 6);
  const parTip = faceTip(pb, par);
  html.push(<Bubble key="k1" t={t} from={1.0} to={side === 'scroll' ? 1.95 : 2.2} x={kidTop[0] - 10} y={kidTop[1]} text="LOOK!! I MADE THIS! 🖍️" side="right" />);
  if (side === 'scroll') {
    html.push(<Bubble key="p1" t={t} from={2.05} to={3.4} x={parTip[0]} y={parTip[1]} text="mm-hm 👍" kind="mutter" side={parTip[2]} size={34} />);
    html.push(<EmojiPop key="e1" t={t} from={3.0} to={4.4} x={kidTop[0]} y={kidTop[1] - 30} e="😞" />);
  } else {
    html.push(<Bubble key="p1" t={t} from={2.3} to={3.6} x={parTip[0]} y={parTip[1] - 20} text={'WAIT… IS THIS ME?? 😍'} kind="shout" side={parTip[2]} />);
    html.push(<EmojiPop key="e1" t={t} from={3.65} to={4.8} x={kidTop[0] + 10} y={kidTop[1] - 36} e="🥰" />);
    html.push(<EmojiPop key="e2" t={t} from={5.3} to={6.4} x={232} y={leoAdult ? 160 : 270} e={leoAdult ? '🥹' : '⭐'} size={56} />);
  }

  const paper = <Drawing kind={kind} w={84} h={64} />;
  const parentPhone = phone ? <Phone glow={side === 'scroll' ? 1 : 0.6} /> : null;
  const svg = (
    <Kitchen palette={leoAdult ? 'new' : 'old'} bills={side === 'scroll'} fridgeArt={side === 'look' && leoAdult ? 3 : 0} fridgeExtra={
      <>
        {side === 'look' && leoAdult && (
          <g transform="translate(172 344) rotate(-4)">
            <Drawing kind="family" w={92} h={70} tint="#efd9a8" />
            <circle cx={0} cy={-56} r={7} fill="#e2445c" stroke={C.ink} strokeWidth={3} />
          </g>
        )}
        {fridgeExtra}
      </>
    } wallArt={leoAdult && side === 'look' ? <FramedPainting /> : null}>
      <Person body={pb} look={parentLook} pose={par} t={t} seed={2} holdF={held === 'parent' ? paper : parentPhone} holdFRot={held === 'parent' ? 0 : 0} />
      <Person body={kb} look={kidLook} pose={kid} t={t} seed={5} holdF={held === 'kid' ? paper : null} />
      {svgExtra}
    </Kitchen>
  );
  return {svg, html: <>{html}</>};
};

const FramedPainting: React.FC = () => (
  <g transform="translate(640 250)">
    <rect x={-52} y={-64} width={104} height={128} rx={4} fill="#6b4b3a" stroke={C.ink} strokeWidth={5} />
    <rect x={-40} y={-52} width={80} height={104} fill="#fdf3dc" />
    <circle cx={10} cy={-20} r={16} fill="#f6b93b" />
    <path d="M-40 30 q20 -30 40 -10 q20 -24 40 0 V52 H-40 Z" fill="#2f9c8f" />
    <path d="M-40 40 q30 -12 80 4 V52 H-40Z" fill="#4f7f7b" />
  </g>
);

// ---------- BEAT 2 / AGE 8 ----------
const beat2 = (t: number, side: Side): Out => {
  const pb = BODIES.mom;
  const kb = BODIES.age8;
  const sitBase: Partial<Pose> = {hipH: 122, fF: [-70, 0], fB: [-54, 0], lean: -2, hF: [46, 56], hB: [36, 60], tilt: 22, eyes: 'down', mouth: 'flat'};
  // mom sits right of the table, facing left (local +x = toward the kid)
  const momBase = P(pb, 762, -1, {...sitBase, fF: [70, 0], fB: [54, 0], hF: [70, 56], hB: [60, 60]});
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
  let rocket: React.ReactNode = null;
  if (side === 'scroll') {
    momKeys.push({t: 2.3}, {t: 2.5, hB: [40, -10], e: 'out'}, {t: 2.75, hB: [50, 4]}, {t: 2.95, hB: [40, -10]}, {t: 3.2, hB: [36, 60]});
    kidKeys.push(
      {t: 2.4, mouth: 'smile', eyes: 'open'},
      {t: 3.0, hF: [74, -10]},
      {t: 3.6, hF: [40, 30], hB: [30, 40], tilt: 14, eyes: 'down', mouth: 'flat', brows: 'sad'},
      {t: 3.9, hF: [-6, 86], hB: [-6, 88]},
      {t: 4.3, facing: 1},
      {t: 4.45, facing: -1, e: 'linear'},
      {t: 4.5, walk: 0.8, mouth: 'sad'},
      {t: 5.6, x: -80, e: 'linear'},
    );
    fold = kf(t, [[3.2, 1], [3.6, 0.35]]);
    held = t < 3.95;
  } else {
    momKeys.push(
      {t: 1.25},
      {t: 1.55, tilt: 0, lookX: 0.5, eyes: 'wide', mouth: 'o', brows: 'up', hF: [56, 40], e: 'out'},
      {t: 2.3, mouth: 'open', eyes: 'open'},
      {t: 3.3, mouth: 'grin'},
      {t: 3.6, hF: [30, -110], hB: [20, -104], eyes: 'happy', e: 'out'},
      {t: 4.6, hF: [30, -110]},
      {t: 5.0, hF: [46, 56], hB: [36, 60], eyes: 'open', mouth: 'smile'},
    );
    kidKeys.push(
      {t: 3.3, mouth: 'open'},
      {t: 3.55, lift: 0, eyes: 'happy', mouth: 'grin'},
      {t: 3.75, lift: 50, e: 'out', hF: [40, -70], hB: [30, -66]},
      {t: 3.95, lift: 0, e: 'in'},
      {t: 4.15, lift: 50, e: 'out'},
      {t: 4.35, lift: 0, e: 'in'},
    );
    phoneInHand = t < 1.5;
    // rocket emoji launches off the drawing
    const rp = clamp((t - 3.7) / 1.4);
    if (t > 3.7 && t < 5.2)
      html.push(
        <div key="rk" style={{position: 'absolute', left: 340 + rp * 600, top: 300 - rp * 260, fontSize: 70, fontFamily: "'Noto Color Emoji'", transform: `rotate(${-10 + rp * 5}deg)`, opacity: 1 - clamp((rp - 0.85) / 0.15)}}>
          🚀
        </div>,
      );
    rocket = null;
  }
  const mom = tr(t, momBase, momKeys);
  const kid = tr(t, P(kb, -120, 1), kidKeys);
  const kidTop = headTop(kb, kid, 0, 6);
  const momTip = faceTip(pb, mom);
  html.push(<Bubble key="k" t={t} from={1.05} to={2.3} x={kidTop[0] - 10} y={kidTop[1]} text="I DREW YOU IN A ROCKET 🚀" side="right" />);
  if (side === 'scroll') {
    html.push(<Bubble key="m" t={t} from={2.4} to={3.7} x={momTip[0]} y={momTip[1]} text="not now, buddy 📱" kind="mutter" side="left" size={34} />);
    html.push(<EmojiPop key="e" t={t} from={3.6} to={5.0} x={kidTop[0]} y={kidTop[1] - 30} e="😔" />);
  } else {
    html.push(<Bubble key="m" t={t} from={2.35} to={3.3} x={momTip[0]} y={momTip[1]} text="WHO'S FLYING IT?!" kind="shout" side="left" />);
    html.push(<Bubble key="k2" t={t} from={3.35} to={4.6} x={kidTop[0] - 10} y={kidTop[1] + 10} text="YOU ARE!! 🚀" side="right" />);
  }
  const svg = (
    <Kitchen palette="old" table window="evening" bills={side === 'scroll'} fridgeArt={side === 'look' ? 9 : 0}
      fridgeExtra={side === 'look' ? (
        <g transform="translate(160 352) rotate(-4)">
          <Drawing kind="family" w={96} h={74} />
          <circle cx={0} cy={-62} r={7} fill="#e2445c" stroke={C.ink} strokeWidth={3} />
        </g>
      ) : null}>
      <Chair x={776} seat={112} facing={-1} color="#9a6640" />
      <Person body={pb} look={LOOKS.mom} pose={mom} t={t} seed={2} holdF={phoneInHand ? <Phone glow={side === 'scroll' ? 1 : 0.5} /> : null} />
      {!phoneInHand && <rect x={600} y={440} width={46} height={10} rx={4} fill="#1e1e2a" stroke={C.ink} strokeWidth={3} />}
      <rect x={470} y={452} width={240} height={18} rx={5} fill="#b07a4f" stroke={C.ink} strokeWidth={5} />
      <Person body={kb} look={LOOKS.leo} pose={kid} t={t} seed={5} holdF={held ? <Drawing kind="rocket" w={104} h={80} fold={fold} /> : null} />
      {rocket}
    </Kitchen>
  );
  return {svg, html: <>{html}</>};
};

// ---------- BEAT 3 / AGE 12 ----------
const beat3 = (t: number, side: Side): Out => {
  const pb = BODIES.mom;
  const kb = BODIES.age12;
  const sit: Partial<Pose> = {hipH: 96, fF: [62, 0], fB: [46, 0], hF: [70, 22], hB: [60, 30], tilt: 22, eyes: 'down', mouth: 'smile'};
  const kidKeys: Keyed<Pose>[] = [{t: 0}];
  const momKeys: Keyed<Pose>[] = [{t: 0, opacity: 0}, {t: 0.95, opacity: 0, e: 'step'}, {t: 1.0, opacity: 1, e: 'step'}];
  // drawing scribble motion
  const scribble = (a: number, b: number) => {
    const out: Keyed<Pose>[] = [];
    for (let s = a; s < b; s += 0.18) out.push({t: s, hF: [70 + Math.sin(s * 9) * 10, 20 + Math.cos(s * 7) * 6]});
    return out;
  };
  kidKeys.push(...scribble(0.05, 1.1));
  let door = kf(t, [[0.9, 0], [1.3, 1, 'out']]);
  let book: React.ReactNode = <g transform="translate(700 432)"><Sketchbook open={1} /></g>;
  let gift: 'none' | 'box' | 'markers' = 'none';
  const html: React.ReactNode[] = [];
  if (side === 'scroll') {
    kidKeys.push(
      {t: 1.3, tilt: 0, lookX: 0.6, eyes: 'wide', mouth: 'o'},
      {t: 2.3, hF: [70, 22]},
      {t: 2.55, hF: [90, 30], mouth: 'flat', eyes: 'open', e: 'out'},
      {t: 2.95, hF: [130, 80], e: 'inOut'},
      {t: 3.3, hF: [70, 22], tilt: 18, eyes: 'down', brows: 'sad'},
    );
    momKeys.push({t: 1.0, x: 965, hF: [10, 118], hB: [10, 118], mouth: 'flat', brows: 'angry'}, {t: 3.6}, {t: 3.75, facing: 1, e: 'linear'}, {t: 3.8, opacity: 0, e: 'step'});
    door = kf(t, [[0.9, 0], [1.3, 1, 'out'], [3.8, 1], [4.2, 0, 'in']]);
    const bx = kf(t, [[2.45, 700], [3.0, 806, 'inOut']]);
    const by = kf(t, [[2.45, 432], [3.0, 486, 'inOut']]);
    book = t < 3.0 ? <g transform={`translate(${bx} ${by})`}><Sketchbook open={t < 2.4 ? 1 : 0} /></g> : (
      <g transform="translate(690 432)">
        <rect x={-50} y={-22} width={100} height={22} rx={3} fill="#3b82f6" stroke={C.ink} strokeWidth={4} />
        <text x={0} y={-5} fontSize={15} fontFamily="Fredoka" fontWeight={700} textAnchor="middle" fill="#fff">MATH</text>
      </g>
    );
  } else {
    kidKeys.push(
      {t: 1.3, tilt: 0, lookX: 0.6, eyes: 'open', mouth: 'smile'},
      {t: 2.5, mouth: 'open', eyes: 'wide', brows: 'up'},
      {t: 2.7, hipH: kb.thigh + kb.shin + 8, x: 640, fF: [14, 0], fB: [-14, 0], hF: [50, 40], hB: [40, 46], e: 'out'},
      {t: 3.1, hF: [50, -20], hB: [40, -14], mouth: 'grin', eyes: 'happy'},
      {t: 3.35, hF: [36, -96], hB: [24, -92], lift: 30, e: 'out'},
      {t: 3.55, lift: 0, e: 'in'},
    );
    momKeys.push(
      {t: 1.0, x: 965, hF: [44, 44], hB: [36, 50], mouth: 'smile'},
      {t: 1.4, x: 900, walk: 0.8},
      {t: 2.5, x: 780, e: 'inOut'},
      {t: 2.6, walk: 0},
      {t: 2.75, hF: [66, 30], hB: [58, 34]},
      {t: 3.1, hF: [10, 118], hB: [10, 118], mouth: 'grin', eyes: 'happy'},
    );
    gift = t < 2.9 ? 'box' : 'markers';
  }
  const mom = tr(t, P(pb, 965, -1), momKeys);
  const kid = tr(t, P(kb, 600, 1, sit), kidKeys);
  const kidTop = headTop(kb, kid, 0, 6);
  const momTip = faceTip(pb, mom);
  if (side === 'scroll') {
    html.push(<Bubble key="m" t={t} from={1.35} to={2.9} x={momTip[0]} y={momTip[1]} text="Shouldn't you be studying? 📚" side="left" kind="say" size={34} />);
    html.push(<EmojiPop key="e" t={t} from={3.4} to={5.4} x={kidTop[0]} y={kidTop[1] - 30} e="😶" />);
  } else {
    html.push(<Bubble key="m" t={t} from={1.35} to={2.55} x={momTip[0]} y={momTip[1]} text="Saw these. Thought of you 🎁" side="left" size={34} />);
    html.push(<Bubble key="k" t={t} from={3.15} to={4.6} x={kidTop[0] - 30} y={kidTop[1] + 4} text="NO WAY!! 🤩" side="left" kind="shout" />);
    html.push(<EmojiPop key="s1" t={t} from={3.2} to={5.4} x={kidTop[0] + 120} y={kidTop[1] + 20} e="✨" size={52} />);
  }
  const giftNode = gift === 'box' ? <Gift s={0.8} /> : gift === 'markers' ? <Markers /> : null;
  const svg = (
    <Bedroom night={false} lamp={0.5} doorOpen={door} wallArt={side === 'look' ? 12 : 0} studyPlan={side === 'scroll'}>
      <Chair x={585} seat={92} facing={1} color="#3b82f6" />
      {book}
      <Person body={kb} look={LOOKS.leo} pose={kid} t={t} seed={5} holdF={gift === 'markers' ? giftNode : null} />
      <Person body={pb} look={LOOKS.mom} pose={mom} t={t} seed={2} holdF={gift === 'box' ? giftNode : null} />
    </Bedroom>
  );
  return {svg, html: <>{html}</>};
};

// ---------- BEAT 4 / AGE 16 ----------
const beat4 = (t: number, side: Side): Out => {
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
  let book: React.ReactNode = <g transform="translate(710 432)"><Sketchbook open={1} w={130} /></g>;
  const momKeys: Keyed<Pose>[] = [{t: 0, opacity: 0}];
  if (side === 'scroll') {
    hall = kf(t, [[1.0, 0], [1.2, 1], [4.6, 1], [4.9, 0]]);
    shadow = kf(t, [[1.2, -1.2], [2.6, 0.1, 'out']]);
    kidKeys.push(
      {t: 1.25, tilt: 0, lookX: 0.7, eyes: 'wide', mouth: 'o', brows: 'worried'},
      {t: 1.45, hF: [82, 20]},
      {t: 1.7, hF: [118, 70], e: 'out'},
      {t: 1.95, hF: [96, -10], e: 'out'},
      {t: 2.15, hF: [82, 20], mouth: 'flat'},
      {t: 3.8, tilt: 10, eyes: 'down', brows: 'sad', mouth: 'sad'},
    );
    lamp = kf(t, [[1.9, 1], [1.95, 0, 'step']]);
    const bx = kf(t, [[1.45, 710], [1.75, 806]]);
    const by = kf(t, [[1.45, 432], [1.75, 486]]);
    book = t < 1.75 ? <g transform={`translate(${bx} ${by})`}><Sketchbook open={t < 1.4 ? 1 : 0} w={130} /></g> : null;
    html.push(<Bubble key="m" t={t} from={2.2} to={3.7} x={930} y={360} text="Lights off. School tomorrow." side="left" kind="offscreen" size={34} />);
  } else {
    kidKeys.push(
      {t: 1.25, tilt: 0, lookX: 0.7, mouth: 'smile', eyes: 'open'},
      {t: 1.3, hF: [60, -20], e: 'out'},
      {t: 2.6, hF: [60, -20], brows: 'worried', mouth: 'flat'},
      {t: 2.75, mouth: 'open', eyes: 'wide', brows: 'up'},
      {t: 3.6, mouth: 'open'},
      {t: 3.85, hipH: kb.thigh + kb.shin + 8, x: 640, fF: [14, 0], fB: [-14, 0], hF: [50, 30], hB: [40, 40], e: 'out'},
      {t: 4.2, hF: [30, -110], hB: [20, -104], mouth: 'grin', eyes: 'happy', lift: 26, e: 'out'},
      {t: 4.4, lift: 0, e: 'in'},
    );
    door = kf(t, [[0.8, 0], [1.15, 1, 'out']]);
    momKeys.push({t: 0.95, opacity: 0, e: 'step'}, {t: 1.0, opacity: 1, x: 965, mouth: 'smile', hF: [10, 118], e: 'step'}, {t: 2.6, mouth: 'smile'}, {t: 2.8, hF: [40, -40], eyes: 'happy', mouth: 'grin', e: 'out'});
    book = t < 1.25 ? <g transform="translate(710 432)"><Sketchbook open={1} w={130} /></g> : null;
  }
  const mom = tr(t, P(pb, 965, -1), momKeys);
  const kid = tr(t, P(kb, 590, 1, sit), kidKeys);
  const kidTop = headTop(kb, kid, 0, 6);
  const momTip = faceTip(pb, mom);
  if (side === 'scroll') {
    html.push(<EmojiPop key="e" t={t} from={3.9} to={5.4} x={kidTop[0]} y={kidTop[1] - 30} e="😔" />);
  } else {
    html.push(<Bubble key="k" t={t} from={1.3} to={2.55} x={kidTop[0] + 20} y={kidTop[1]} text="Should I enter the contest? 🏆" side="left" size={34} />);
    html.push(<Bubble key="m" t={t} from={2.65} to={4.0} x={momTip[0]} y={momTip[1]} text="Already signed you up 😎" side="left" kind="shout" size={34} />);
    html.push(<EmojiPop key="e" t={t} from={4.1} to={5.4} x={kidTop[0] + 40} y={kidTop[1] - 60} e="🥹" />);
  }
  const svg = (
    <Bedroom night lamp={lamp} doorOpen={door} hallLight={hall} doorShadow={shadow} wallArt={side === 'look' ? 22 : 0}>
      <Chair x={572} seat={102} facing={1} color="#2f3e5e" />
      {book}
      <Person body={kb} look={LOOKS.leoTeen} pose={kid} t={t} seed={5} holdF={side === 'look' && t >= 1.25 && t < 3.85 ? <g transform="rotate(-8)"><Sketchbook open={1} w={130} /></g> : null} />
      <Person body={pb} look={LOOKS.mom} pose={mom} t={t} seed={2} />
    </Bedroom>
  );
  return {
    svg,
    html: (
      <>
        <ClockChip text="11:48 PM" />
        {html}
      </>
    ),
  };
};

// ---------- composition ----------
const BEAT_FNS = [beat1, beat2, beat3, beat4, (t: number, s: Side) => beat1(t, s, true)];

const grade = (side: Side, beat: number): React.CSSProperties =>
  side === 'scroll'
    ? {filter: `saturate(${[0.92, 0.82, 0.72, 0.62, 0.55][beat]}) brightness(0.95)`}
    : {filter: 'saturate(1.08) brightness(1.02)'};

const Panel: React.FC<{t: number; side: Side; top: number}> = ({t, side, top}) => {
  let bi = BEATS.findIndex((b) => t >= b.start && t < b.end);
  if (bi < 0) bi = BEATS.length - 1;
  const b = BEATS[bi];
  const lt = t - b.start;
  const out = BEAT_FNS[bi](lt, side);
  const push = 1 + 0.035 * clamp(lt / (b.end - b.start));
  const counterSteps =
    side === 'scroll'
      ? [{t: 0, v: 0}, {t: 1.1, v: 1}, {t: 7.3, v: 2}]
      : [{t: 0, v: 0}, {t: 1.1, v: 1}, {t: 7.3, v: 38}, {t: 12.8, v: 412}, {t: 17.6, v: 1906}, {t: 23.2, v: 12408}];
  return (
    <div style={{position: 'absolute', left: 0, top, width: W, height: PANEL_H, overflow: 'hidden', background: '#000'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '50% 70%', ...grade(side, bi)}}>
        <svg viewBox={`0 0 ${W} ${PANEL_H}`} width={W} height={PANEL_H} style={{position: 'absolute', inset: 0}}>
          {out.svg}
        </svg>
        <div style={{position: 'absolute', inset: 0}}>{out.html}</div>
      </div>
      {/* vignette */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)'}} />
      {side === 'look' && <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,190,90,0.10), rgba(255,140,60,0.06))', mixBlendMode: 'soft-light'}} />}
      <Header t={t} text={side === 'scroll' ? 'PARENTS WHO SCROLL 📱' : 'PARENTS WHO LOOK 👀'} />
      <Counter
        t={t}
        label="drawings he showed you"
        emoji="🖍️"
        steps={counterSteps}
        tone={side === 'scroll' ? 'bad' : 'good'}
        sub={side === 'scroll' ? {label: 'drawings he hid', emoji: '🙈', from: 14.2, steps: [{t: 0, v: 0}, {t: 14.2, v: 37}, {t: 17.6, v: 214}]} : undefined}
      />
    </div>
  );
};

const Band: React.FC<{t: number}> = ({t}) => {
  const bi = Math.max(0, BEATS.findIndex((b) => t >= b.start && t < b.end));
  const b = BEATS[bi === -1 ? BEATS.length - 1 : bi];
  const s = pop(t, b.start, 0.45);
  return (
    <div style={{position: 'absolute', top: TOP_Y + PANEL_H, left: 0, width: W, height: BAND_H, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          background: C.gold,
          color: C.ink,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 44,
          letterSpacing: 3,
          padding: '4px 34px',
          borderRadius: 40,
          border: `4px solid ${C.ink}`,
          boxShadow: `0 5px 0 ${C.goldDeep}, 0 0 30px rgba(246,185,59,0.35)`,
          transform: `scale(${0.7 + 0.3 * s}) rotate(${(1 - s) * -6}deg)`,
        }}
      >
        {b.label}
      </div>
    </div>
  );
};

const Hook: React.FC<{t: number}> = ({t}) => (
  <div
    style={{
      position: 'absolute',
      top: 44,
      left: 0,
      width: W,
      textAlign: 'center',
      fontFamily: FONT,
      fontWeight: 600,
      fontSize: 54,
      color: '#f4efe6',
      opacity: t > END_AT ? 0 : 1,
    }}
  >
    Same kid. Same drawing. 🖍️
  </div>
);

const EndCard: React.FC<{t: number}> = ({t}) => {
  if (t < END_AT) return null;
  const a = prog(t, END_AT, END_AT + 0.5, 'out');
  const l1 = pop(t, END_AT + 0.25, 0.5);
  const l2 = pop(t, END_AT + 1.05, 0.5);
  const l3 = pop(t, END_AT + 1.9, 0.5);
  const line: React.CSSProperties = {fontFamily: FONT, fontWeight: 700, color: '#fff', textAlign: 'center', textShadow: `0 5px 0 ${C.ink}`};
  return (
    <AbsoluteFill style={{background: `rgba(8,7,12,${0.93 * a})`, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', paddingBottom: 140}}>
      <div style={{...line, fontSize: 78, transform: `scale(${l1})`, opacity: clamp(l1 * 2)}}>Kids don’t stop drawing.</div>
      <div style={{...line, fontSize: 92, color: C.gold, marginTop: 18, transform: `scale(${l2})`, opacity: clamp(l2 * 2)}}>They stop showing. 🖍️</div>
      <div style={{...line, fontSize: 44, fontWeight: 600, color: '#d9d4e6', marginTop: 70, transform: `scale(${l3})`, opacity: clamp(l3 * 2)}}>Which parent did you have? 👇</div>
    </AbsoluteFill>
  );
};

const Flash: React.FC<{t: number}> = ({t}) => {
  let a = 0;
  for (const b of BEATS.slice(1)) if (t >= b.start && t < b.start + 0.16) a = 1 - (t - b.start) / 0.16;
  return a > 0 ? <AbsoluteFill style={{background: '#fff', opacity: a * 0.55}} /> : null;
};

// ---------- sound ----------
type Cue = {at: number; src: string; vol?: number};
const SFX_GAIN = 0.45;
const CUES: Cue[] = [
  // beat 1
  {at: 0.0, src: 'run.wav', vol: 0.5},
  {at: 1.0, src: 'pop.wav'},
  {at: 1.1, src: 'tick.wav', vol: 0.6},
  {at: 2.05, src: 'pop-low.wav', vol: 0.8},
  {at: 2.3, src: 'pop.wav'},
  {at: 2.8, src: 'boing.wav', vol: 0.5},
  {at: 3.55, src: 'flutter.wav', vol: 0.8},
  {at: 5.2, src: 'ding.wav', vol: 0.7},
  // beat 2
  {at: 6.2, src: 'whoosh.wav', vol: 0.8},
  {at: 7.25, src: 'pop.wav'},
  {at: 7.3, src: 'counter.wav', vol: 0.55},
  {at: 8.55, src: 'pop.wav'},
  {at: 9.55, src: 'pop.wav'},
  {at: 9.9, src: 'rocket.wav', vol: 0.6},
  // beat 3
  {at: 11.8, src: 'whoosh.wav', vol: 0.8},
  {at: 12.7, src: 'door.wav', vol: 0.8},
  {at: 12.8, src: 'counter.wav', vol: 0.55},
  {at: 13.15, src: 'pop.wav'},
  {at: 14.25, src: 'slam.wav', vol: 0.7},
  {at: 14.7, src: 'sparkle.wav', vol: 0.7},
  {at: 14.95, src: 'pop.wav'},
  // beat 4
  {at: 17.2, src: 'whoosh.wav', vol: 0.8},
  {at: 17.6, src: 'counter.wav', vol: 0.55},
  {at: 18.25, src: 'steps.wav', vol: 0.9},
  {at: 18.5, src: 'pop.wav'},
  {at: 19.1, src: 'click.wav', vol: 0.9},
  {at: 19.4, src: 'pop-low.wav', vol: 0.8},
  {at: 19.85, src: 'pop.wav'},
  // beat 5
  {at: 22.6, src: 'whoosh.wav', vol: 0.9},
  {at: 22.6, src: 'run.wav', vol: 0.5},
  {at: 23.2, src: 'counter.wav', vol: 0.55},
  {at: 23.6, src: 'pop.wav'},
  {at: 24.65, src: 'pop-low.wav', vol: 0.8},
  {at: 24.9, src: 'pop.wav'},
  {at: 26.15, src: 'flutter.wav', vol: 0.8},
  {at: 27.8, src: 'ding.wav', vol: 0.7},
  {at: END_AT, src: 'impact.wav', vol: 0.8},
];

export const Ep01Drawing: React.FC<{withAudio?: boolean; music?: boolean}> = ({withAudio = true, music = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Hook t={t} />
      <Panel t={t} side="scroll" top={TOP_Y} />
      <Band t={t} />
      <Panel t={t} side="look" top={BOT_Y} />
      <Flash t={t} />
      <EndCard t={t} />
      {withAudio && (
        <>
          {music && <Audio src={staticFile('audio/ep01-music.wav')} volume={1} />}
          {CUES.map((c, i) => (
            <Sequence key={i} from={Math.round(c.at * fps)} layout="none">
              <Audio src={staticFile(`audio/${c.src}`)} volume={SFX_GAIN * (c.vol ?? 0.7)} />
            </Sequence>
          ))}
        </>
      )}
    </AbsoluteFill>
  );
};
