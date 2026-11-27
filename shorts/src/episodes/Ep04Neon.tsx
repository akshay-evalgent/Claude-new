/**
 * EP04 (neon cut) — "Same kid. Same front door."
 * Minimal neon line-art format: one room, one door. He comes home every day; at 18 he leaves; at 30 — does he come back?
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {BODIES, Body, Pose} from '../components/Person';
import {TOP_Y, BOT_Y, PANEL_H, BAND_H, W} from '../lib/theme';
import {Keyed, clamp, fmt, kf, prog} from '../lib/anim';
import {AgePill, CountPill, FLOOR, Glyph, NBubble, NeonPerson, NeonRoom, PanelLabel, SANS, TONES, Tone, Extra, headScreen, sx, wx} from '../neon/Neon';
import {Beat, Cue, Cues, P, Side, tr} from './shared3d';

export const EP04_BEATS: Beat[] = [
  {start: 0, end: 6.2, label: 'AGE 7'},
  {start: 6.2, end: 11.8, label: 'AGE 11'},
  {start: 11.8, end: 17.2, label: 'AGE 15'},
  {start: 17.2, end: 22.6, label: 'AGE 18'},
  {start: 22.6, end: 32, label: 'AGE 30'},
];
export const EP04_DURATION = 32;
const END_AT = 29.05;

const DOOR_W = wx(905); // world x of the doorway
const SPOT_W = wx(600); // where he stops to talk
const SOFA_W = wx(392); // mom's seat
const KIDSEAT_W = wx(452); // seat next to her
const SEAT_H = 139; // couch seat height in world px (screen y 440)
const WHITE = '#f2f2f8';
const OLD = '#bdbdcc';

type Actor2 = {id: string; b: Body; p: Pose; color: string; ex?: Extra};
type Out = {actors: Actor2[]; door: number; lamp: number; html: React.ReactNode[]};

const momSit = (b: Body, extra: Partial<Pose> = {}): Pose => P(b, SOFA_W, 1, {hipH: SEAT_H, fF: [76, 0], fB: [62, 0], hF: [40, 44], hB: [30, 52], tilt: 24, eyes: 'down', ...extra});
const enterKeys = (walk = 1.4, stop = SPOT_W, arrive = 1.3): Keyed<Pose>[] => [
  {t: 0, x: DOOR_W, opacity: 0, walk, facing: -1},
  {t: 0.3, opacity: 0, e: 'step'},
  {t: 0.35, opacity: 1, e: 'step'},
  {t: arrive, x: stop, e: 'out'},
  {t: arrive + 0.12, walk: 0},
];
const doorFor = (t: number, open: number, close: number) => kf(t, [[open, 0], [open + 0.35, 1, 'out'], [close, 1], [close + 0.4, 0, 'in']]);
const exitLeft = (t0: number, t1: number, speed = 0.8): Keyed<Pose>[] => [{t: t0, walk: speed, facing: -1}, {t: t1, x: wx(-120), e: 'linear'}];
const sitDown = (t0: number, b: Body, x = KIDSEAT_W): Keyed<Pose>[] => [
  {t: t0, walk: 1},
  {t: t0 + 0.5, x, walk: 0, e: 'inOut'},
  {t: t0 + 0.8, hipH: SEAT_H, fF: [50, 0], fB: [40, 0], hF: [30, 60], hB: [24, 64], lean: 4},
];

// ---------------------------------------------------------------- beats
const age7 = (t: number, side: Side, tone: Tone): Out => {
  const kb = BODIES.age8;
  const mb = BODIES.mom;
  const kid: Keyed<Pose>[] = [...enterKeys(1.6), {t: 1.42, hF: [40, -60], hB: [30, -56]}];
  const mom: Keyed<Pose>[] = [{t: 0}];
  const html: React.ReactNode[] = [];
  let phone = 1;
  if (side === 'scroll') {
    kid.push({t: 2.4, hF: [10, 70], hB: [-6, 74]}, {t: 3.2, hF: [50, -10]}, {t: 4.2, hF: [10, 70]}, {t: 5.0, tilt: 16}, ...exitLeft(5.1, 6.4, 0.7));
  } else {
    mom.push({t: 1.5, tilt: 0, hF: [10, 100]}, {t: 2.4, hF: [50, -30], hB: [40, -24]}, {t: 3.2, hF: [40, 44], hB: [30, 52]});
    kid.push({t: 3.25, lift: 0}, {t: 3.45, lift: 50, e: 'out'}, {t: 3.65, lift: 0, e: 'in'}, ...sitDown(4.2, kb));
    phone = t < 1.55 ? 1 : 0;
  }
  const k = tr(t, P(kb, DOOR_W, -1), kid);
  const m = tr(t, momSit(mb), mom);
  const kh = headScreen(kb, k);
  const mh = headScreen(mb, m);
  html.push(<NBubble key="k1" t={t} from={1.4} to={2.3} x={kh[0]} y={kh[1] - kh[2] - 14} text="MOM! GUESS WHAT!!" tone={tone} side="left" />);
  if (side === 'scroll') {
    html.push(<NBubble key="m1" t={t} from={2.4} to={3.1} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="mm-hm. 📱" tone={tone} dim />);
    html.push(<NBubble key="k2" t={t} from={3.2} to={4.2} x={kh[0]} y={kh[1] - kh[2] - 14} text="I got a gold star today ⭐" tone={tone} side="left" size={28} />);
    html.push(<NBubble key="m2" t={t} from={4.3} to={4.9} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="nice." tone={tone} dim />);
    html.push(<Glyph key="g" t={t} from={5.0} to={6.0} x={kh[0]} y={kh[1] - kh[2] - 40} text="…" color={tone.main} />);
  } else {
    html.push(<NBubble key="m1" t={t} from={2.4} to={3.2} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="How was your day?? 👀" tone={tone} />);
    html.push(<NBubble key="k2" t={t} from={3.3} to={4.2} x={kh[0]} y={kh[1] - kh[2] - 14} text="I GOT A GOLD STAR!! ⭐" tone={tone} side="left" />);
    html.push(<NBubble key="m2" t={t} from={4.9} to={5.9} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="Tell me EVERYTHING." tone={tone} />);
  }
  return {
    actors: [
      {id: 'mom', b: mb, p: m, color: WHITE, ex: {phone: phone ? 1 : undefined}},
      {id: 'kid', b: kb, p: k, color: tone.main, ex: {backpack: true}},
    ],
    door: doorFor(t, 0.15, 1.3),
    lamp: 1,
    html,
  };
};

const age11 = (t: number, side: Side, tone: Tone): Out => {
  const kb = BODIES.age12;
  const mb = BODIES.mom;
  const kid: Keyed<Pose>[] = [...enterKeys(1.0, wx(640), 1.4), {t: 1.5, hF: [20, 80], hB: [10, 84]}, {t: 1.55, mouth: 'talk', talk: 1}, {t: 2.3, talk: 0}];
  const mom: Keyed<Pose>[] = [{t: 0}];
  const html: React.ReactNode[] = [];
  let phone = 1;
  if (side === 'scroll') {
    mom.push({t: 2.35, hB: [60, -40], e: 'out'}, {t: 3.3, hB: [30, 52]});
    kid.push({t: 3.4, tilt: 14}, ...exitLeft(4.1, 5.6, 0.8));
  } else {
    mom.push({t: 1.6, tilt: 0, hF: [10, 100]}, {t: 3.4, hF: [40, 50], hB: [30, 56]}, {t: 5.0, hF: [70, 10], lean: 10});
    kid.push(...sitDown(3.3, kb), {t: 4.2, mouth: 'talk', talk: 1}, {t: 4.95, talk: 0});
    phone = t < 1.6 ? 1 : 0;
  }
  const k = tr(t, P(kb, DOOR_W, -1), kid);
  const m = tr(t, momSit(mb), mom);
  const kh = headScreen(kb, k);
  const mh = headScreen(mb, m);
  html.push(<NBubble key="k1" t={t} from={1.5} to={2.3} x={kh[0]} y={kh[1] - kh[2] - 14} text="Mom, today a kid at school—" tone={tone} side="left" size={28} />);
  if (side === 'scroll') {
    html.push(<NBubble key="m1" t={t} from={2.4} to={3.3} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="Not now. I'm busy. 📱" tone={tone} dim />);
    html.push(<NBubble key="k2" t={t} from={3.4} to={4.0} x={kh[0]} y={kh[1] - kh[2] - 14} text="…ok." tone={tone} side="left" size={26} dim />);
  } else {
    html.push(<NBubble key="m1" t={t} from={2.4} to={3.3} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="Uh-oh. What happened?" tone={tone} />);
    html.push(<NBubble key="k2" t={t} from={4.1} to={4.95} x={kh[0]} y={kh[1] - kh[2] - 14} text="…so I stood up for him." tone={tone} side="right" size={28} />);
    html.push(<NBubble key="m2" t={t} from={5.0} to={5.7} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="Proud of you. 🤝" tone={tone} />);
  }
  return {
    actors: [
      {id: 'mom', b: mb, p: m, color: WHITE, ex: {phone: phone ? 1 : undefined}},
      {id: 'kid', b: kb, p: k, color: tone.main, ex: {backpack: true}},
    ],
    door: doorFor(t, 0.15, 1.35),
    lamp: 1,
    html,
  };
};

const age15 = (t: number, side: Side, tone: Tone): Out => {
  const kb = BODIES.age16;
  const mb = BODIES.mom;
  const html: React.ReactNode[] = [];
  let kid: Keyed<Pose>[];
  const mom: Keyed<Pose>[] = [{t: 0}];
  let phone = 1;
  let hp = true;
  if (side === 'scroll') {
    kid = [{t: 0, x: DOOR_W, opacity: 0, walk: 0.9, facing: -1, tilt: 12}, {t: 0.3, opacity: 0, e: 'step'}, {t: 0.35, opacity: 1, e: 'step'}, {t: 4.2, x: wx(-120), e: 'linear'}];
  } else {
    kid = [...enterKeys(0.9, wx(660), 1.5), {t: 1.6, tilt: 12}, {t: 2.4, tilt: 0, hF: [6, -30]}, {t: 2.7, hF: [10, 80]}, ...sitDown(3.4, kb), {t: 4.4, mouth: 'talk', talk: 1}, {t: 5.3, talk: 0}];
    mom.push({t: 1.4, tilt: 0, hF: [10, 100]}, {t: 3.2, hB: [60, 60]}, {t: 3.5, hB: [70, 70]}, {t: 3.8, hB: [30, 52]});
    phone = t < 1.4 ? 1 : 0;
    hp = t < 2.55;
  }
  const k = tr(t, P(kb, DOOR_W, -1), kid);
  const m = tr(t, momSit(mb), mom);
  const kh = headScreen(kb, k);
  const mh = headScreen(mb, m);
  if (side === 'scroll') {
    html.push(<Glyph key="g1" t={t} from={1.8} to={3.4} x={kh[0]} y={kh[1] - kh[2] - 40} text="…" color="#8a8aa0" />);
    html.push(<Glyph key="g2" t={t} from={3.6} to={5.4} x={mh[0] + 10} y={mh[1] - mh[2] - 40} text="…" color="#8a8aa0" />);
  } else {
    html.push(<NBubble key="m1" t={t} from={1.5} to={2.3} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="Rough day?" tone={tone} />);
    html.push(<NBubble key="k1" t={t} from={2.5} to={3.2} x={kh[0]} y={kh[1] - kh[2] - 14} text="…kind of." tone={tone} side="left" size={28} />);
    html.push(<NBubble key="m2" t={t} from={3.25} to={3.9} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="Sit. 🛋️" tone={tone} />);
    html.push(<NBubble key="k2" t={t} from={4.4} to={5.3} x={kh[0]} y={kh[1] - kh[2] - 14} text="So… there's this girl." tone={tone} side="right" size={28} />);
    html.push(<Glyph key="g" t={t} from={5.0} to={5.6} x={mh[0] - 10} y={mh[1] - mh[2] - 46} text="!?" color={tone.key} />);
  }
  return {
    actors: [
      {id: 'mom', b: mb, p: m, color: WHITE, ex: {phone: phone ? 1 : undefined}},
      {id: 'kid', b: kb, p: k, color: tone.main, ex: {headphones: hp}},
    ],
    door: doorFor(t, 0.15, 1.4),
    lamp: 1,
    html,
  };
};

const age18 = (t: number, side: Side, tone: Tone): Out => {
  const kb = BODIES.man;
  const mb = BODIES.mom;
  const html: React.ReactNode[] = [];
  const kid: Keyed<Pose>[] = [{t: 0, x: wx(660), facing: 1, hB: [10, 70], hF: [10, 80]}];
  let mom: Keyed<Pose>[] = [{t: 0}];
  let momBase = momSit(mb);
  let phone = 1;
  let door = 0;
  if (side === 'scroll') {
    kid.push({t: 0.6, facing: -1}, {t: 0.75, facing: -1}, {t: 0.8, mouth: 'talk', talk: 1}, {t: 1.5, talk: 0}, {t: 3.3, facing: 1}, {t: 3.45, walk: 0.9}, {t: 4.4, x: DOOR_W + 40, e: 'linear'}, {t: 4.45, opacity: 1}, {t: 4.5, opacity: 0, e: 'step'});
    door = doorFor(t, 3.6, 4.5);
  } else {
    momBase = P(mb, wx(790), 1, {hF: [10, 110], hB: [10, 110], mouth: 'smile'});
    mom = [{t: 0}, {t: 1.6, mouth: 'talk', talk: 1}, {t: 2.7, talk: 0, hF: [70, -10], hB: [64, -6], tilt: 10}, {t: 3.6, hF: [10, 110], hB: [10, 110], tilt: 0}, {t: 5.2, hF: [40, -40]}];
    kid.push({t: 0.0, x: wx(880), facing: -1}, {t: 0.6, mouth: 'talk', talk: 1}, {t: 1.5, talk: 0}, {t: 2.6, x: wx(840), hF: [70, -10], tilt: 10}, {t: 3.6, x: wx(880), hF: [10, 80], tilt: 0}, {t: 3.7, mouth: 'talk', talk: 1}, {t: 4.3, talk: 0}, {t: 4.4, facing: 1}, {t: 4.5, walk: 0.9}, {t: 5.1, x: DOOR_W + 60, e: 'linear'}, {t: 5.15, opacity: 1}, {t: 5.2, opacity: 0, e: 'step'});
    door = doorFor(t, 4.3, 5.2);
    phone = 0;
  }
  const k = tr(t, P(kb, wx(660), -1), kid);
  const m = tr(t, momBase, mom);
  const kh = headScreen(kb, k);
  const mh = headScreen(mb, m);
  html.push(<NBubble key="k1" t={t} from={0.65} to={1.5} x={kh[0]} y={kh[1] - kh[2] - 14} text="I'm heading out, mom." tone={tone} side="left" size={28} />);
  if (side === 'scroll') {
    html.push(<NBubble key="m1" t={t} from={1.6} to={2.6} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="text me when you land. 📱" tone={tone} dim size={28} />);
    html.push(<NBubble key="k2" t={t} from={2.75} to={3.35} x={kh[0]} y={kh[1] - kh[2] - 14} text="…bye." tone={tone} side="left" size={26} dim />);
  } else {
    html.push(<NBubble key="m1" t={t} from={1.6} to={2.65} x={mh[0]} y={mh[1] - mh[2] - 10} text="Call me. About EVERYTHING. 🤍" tone={tone} side="left" size={28} />);
    html.push(<NBubble key="k2" t={t} from={3.7} to={4.35} x={kh[0]} y={kh[1] - kh[2] - 14} text="I will. Promise." tone={tone} side="right" size={28} />);
  }
  return {
    actors: [
      {id: 'mom', b: mb, p: m, color: WHITE, ex: {phone: phone ? 1 : undefined}},
      {id: 'kid', b: kb, p: k, color: tone.main, ex: {suitcase: true}},
    ],
    door,
    lamp: 1,
    html,
  };
};

const Notice: React.FC<{t: number; from: number; to: number; title: string; body: string}> = ({t, from, to, title, body}) => {
  if (t < from || t > to + 0.3) return null;
  const s = prog(t, from, from + 0.35, 'out');
  const o = t > to ? 1 - (t - to) / 0.3 : 1;
  return (
    <div style={{position: 'absolute', left: 520, top: 104 - (1 - s) * 30, width: 470, opacity: s * o, padding: '14px 18px', borderRadius: 18, background: 'rgba(235,235,242,0.95)', fontFamily: SANS, color: '#14141a', boxShadow: '0 0 30px rgba(170,200,255,0.35)'}}>
      <div style={{fontSize: 20, fontWeight: 600, color: '#6a6a78'}}>💬 MESSAGES · now</div>
      <div style={{fontSize: 26, fontWeight: 700, marginTop: 4}}>{title}</div>
      <div style={{fontSize: 26, fontWeight: 500}}>{body}</div>
    </div>
  );
};

const Callback: React.FC<{t: number; from: number; to: number; quote: string; by: string; tone: Tone; x?: number; y?: number}> = ({t, from, to, quote, by, tone, x = 60, y = 112}) => {
  if (t < from || t > to + 0.3) return null;
  const s = prog(t, from, from + 0.5, 'out');
  const o = t > to ? 1 - (t - to) / 0.3 : 1;
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: s * o, fontFamily: SANS, color: '#f4f4f8', background: 'rgba(4,4,8,0.82)', borderRadius: 16, padding: '10px 22px 12px', border: `1px solid ${tone.main}55`}}>
      <div style={{fontSize: 36, fontWeight: 400, fontStyle: 'italic', textShadow: `0 0 16px ${tone.main}`}}>“{quote}”</div>
      <div style={{fontSize: 22, fontWeight: 300, marginLeft: 30, color: '#c9c9d6', fontStyle: 'italic'}}>— {by}</div>
    </div>
  );
};

const age30 = (t: number, side: Side, tone: Tone): Out => {
  const mb = BODIES.mom;
  const html: React.ReactNode[] = [];
  const actors: Actor2[] = [];
  let door = 0;
  if (side === 'scroll') {
    const m = tr(t, momSit(mb, {tilt: 20}), [{t: 0}, {t: 1.0, hF: [44, 20], tilt: 10}, {t: 2.6, hF: [40, 44], tilt: 24}, {t: 3.4, tilt: 0, lookX: 0.6, hF: [20, 80]}, {t: 5.6}]);
    actors.push({id: 'mom', b: mb, p: m, color: OLD, ex: {phone: 1}});
    const mh = headScreen(mb, m);
    html.push(<NBubble key="r" t={t} from={1.0} to={1.9} x={mh[0] + 20} y={mh[1] - mh[2] - 10} text="📞 calling Leo…" tone={tone} dim size={28} />);
    html.push(<Notice key="n" t={t} from={2.1} to={4.6} title="Leo" body="Not now. I'm busy. 📱" />);
    html.push(<Callback key="cb" t={t} from={3.0} to={5.4} quote="Not now. I'm busy." by="her, 19 years ago" tone={tone} y={104} />);
    html.push(<Glyph key="g" t={t} from={4.7} to={6.2} x={mh[0] + 10} y={mh[1] - mh[2] - 40} text="…" color="#8a8aa0" />);
  } else {
    const m = tr(t, momSit(mb, {tilt: 6, hF: [40, 60], hB: [30, 64]}), [{t: 0}, {t: 0.8, tilt: 0, lookX: 0.6}, {t: 3.9}, {t: 4.3, hipH: mb.thigh + mb.shin + 8, fF: [14, 0], fB: [-14, 0], hF: [60, -40], hB: [50, -30], e: 'out'}]);
    const kb = BODIES.man;
    const leo = tr(t, P(kb, DOOR_W, -1), [...enterKeys(1.0, wx(700), 1.6), {t: 1.7, hF: [10, 80]}, {t: 3.0, mouth: 'talk', talk: 1}, {t: 4.0, talk: 0}]);
    const cb = BODIES.age5;
    const mia = tr(t, P(cb, DOOR_W, -1), [{t: 0, x: DOOR_W, opacity: 0, walk: 1.6, facing: -1, hF: [60, -10]}, {t: 0.7, opacity: 0, e: 'step'}, {t: 0.75, opacity: 1, e: 'step'}, {t: 1.7, x: wx(560), e: 'out'}, {t: 1.8, walk: 0}, {t: 1.9, lift: 0}, {t: 2.05, lift: 40, e: 'out'}, {t: 2.2, lift: 0, e: 'in'}]);
    actors.push({id: 'mom', b: mb, p: m, color: OLD}, {id: 'leo', b: kb, p: leo, color: tone.main}, {id: 'mia', b: cb, p: mia, color: '#ffd24a', ex: {paper: true}});
    door = kf(t, [[0.05, 0], [0.4, 1, 'out'], [2.2, 1], [2.6, 0, 'in']]);
    const mh = headScreen(mb, m);
    const lh = headScreen(kb, leo);
    const ch = headScreen(cb, mia);
    html.push(<Glyph key="kn" t={t} from={0.0} to={0.5} x={sx(DOOR_W)} y={260} text="knock knock" color="#c9c9d6" size={26} />);
    html.push(<NBubble key="c" t={t} from={1.8} to={2.8} x={ch[0]} y={ch[1] - ch[2] - 12} text="GRANDMA!! I DREW YOU! 🖍️" tone={tone} side="left" size={28} />);
    html.push(<NBubble key="l" t={t} from={3.0} to={4.1} x={lh[0]} y={lh[1] - lh[2] - 14} text="Hey mom. How was YOUR day? 💛" tone={tone} side="left" size={28} />);
    html.push(<Callback key="cb" t={t} from={3.5} to={5.6} quote="How was your day?" by="her, every day for 18 years" tone={tone} y={104} />);
    html.push(<Glyph key="g" t={t} from={4.4} to={6.2} x={mh[0] + 70} y={mh[1] - 10} text="🥹" size={52} />);
  }
  return {actors, door, lamp: 1, html};
};

const FNS = [age7, age11, age15, age18, age30];

// ---------------------------------------------------------------- counters
const rolled = (t: number, steps: {t: number; v: number}[]) => {
  let v = steps[0].v;
  for (const s of steps.slice(1)) {
    if (t < s.t) break;
    if (t < s.t + 0.7) return kf(t, [[s.t, v], [s.t + 0.7, s.v, 'out']]);
    v = s.v;
  }
  return v;
};
const counter = (side: Side, bi: number, t: number) => {
  const steps =
    bi === 4
      ? side === 'scroll'
        ? [{t: 0, v: 0}]
        : [{t: 0, v: 0}, {t: 24.2, v: 26}]
      : side === 'scroll'
        ? [{t: 0, v: 0}, {t: 3.2, v: 1}, {t: 7.7, v: 3}]
        : [{t: 0, v: 0}, {t: 3.3, v: 1}, {t: 7.7, v: 900}, {t: 13.3, v: 2300}, {t: 17.6, v: 3600}];
  const label = bi === 4 ? 'VISITS HOME / YR' : 'STORIES SHARED';
  let bump = 0;
  for (const s of steps.slice(1)) if (t >= s.t && t < s.t + 0.35) bump = 1 - (t - s.t) / 0.35;
  return {label, v: fmt(rolled(t, steps)), bump};
};

const Panel: React.FC<{t: number; side: Side; top: number}> = ({t, side, top}) => {
  let bi = EP04_BEATS.findIndex((b) => t >= b.start && t < b.end);
  if (bi < 0) bi = EP04_BEATS.length - 1;
  const b = EP04_BEATS[bi];
  const lt = t - b.start;
  const tone = TONES[side];
  const out = FNS[bi](lt, side, tone);
  const id = `${side}`;
  const cc = counter(side, bi, t);
  const push = 1 + 0.03 * clamp(lt / (b.end - b.start));
  const fadeIn = clamp(lt / 0.35);
  return (
    <div style={{position: 'absolute', left: 0, top, width: W, height: PANEL_H, overflow: 'hidden', background: '#040407'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '50% 75%', opacity: bi === 0 ? 1 : 0.25 + 0.75 * fadeIn}}>
        <NeonRoom id={id} tone={tone} st={{door: out.door, outside: 1, lamp: out.lamp, dust: 1, t}}>
          {out.actors.map((a) => (
            <NeonPerson key={a.id} id={id} b={a.b} p={a.p} color={a.color} t={t} ex={a.ex} />
          ))}
        </NeonRoom>
        <div style={{position: 'absolute', inset: 0}}>{out.html}</div>
      </div>
      <PanelLabel lead="PARENTS WHO" key_={side === 'scroll' ? 'SCROLL' : 'LOOK'} tone={tone} />
      <CountPill label={cc.label} v={cc.v} tone={tone} bump={cc.bump} />
    </div>
  );
};

const NeonEnd: React.FC<{t: number}> = ({t}) => {
  if (t < END_AT) return null;
  const a = prog(t, END_AT, END_AT + 0.6, 'out');
  const l1 = prog(t, END_AT + 0.3, END_AT + 0.9, 'out');
  const l2 = prog(t, END_AT + 1.2, END_AT + 1.8, 'out');
  const l3 = prog(t, END_AT + 2.0, END_AT + 2.6, 'out');
  const base: React.CSSProperties = {fontFamily: SANS, textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.25};
  return (
    <AbsoluteFill style={{background: `rgba(3,3,6,${0.94 * a})`, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', paddingBottom: 140}}>
      <div style={{...base, fontSize: 64, fontWeight: 300, color: '#f4f4f8', opacity: l1, letterSpacing: 1}}>Ask about their day.</div>
      <div style={{...base, fontSize: 58, fontWeight: 500, color: '#3dff9a', marginTop: 28, opacity: l2, textShadow: '0 0 22px rgba(61,255,154,0.6)'}}>{'One day, they’ll come home\nto ask about yours. 🏠'}</div>
      <div style={{...base, fontSize: 36, fontWeight: 400, color: '#a9a9bb', marginTop: 70, opacity: l3}}>Which parent did you have? 👇</div>
    </AbsoluteFill>
  );
};

const c = (beat: number, lt: number, src: string, vol?: number): Cue => ({at: EP04_BEATS[beat].start + lt, src, vol});
const CUES: Cue[] = [
  c(0, 0.15, 'door.wav', 0.5), c(0, 0.4, 'run.wav', 0.4), c(0, 1.4, 'blip.wav'), c(0, 2.4, 'blip.wav', 0.6), c(0, 3.2, 'blip.wav'), c(0, 3.25, 'tick.wav', 0.5), c(0, 4.3, 'blip.wav', 0.6), c(0, 4.9, 'blip.wav', 0.6),
  c(1, 0.15, 'door.wav', 0.5), c(1, 0.5, 'steps.wav', 0.5), c(1, 1.5, 'blip.wav'), c(1, 1.5, 'counter.wav', 0.4), c(1, 2.4, 'blip.wav', 0.6), c(1, 3.4, 'blip.wav', 0.5), c(1, 4.1, 'blip.wav'), c(1, 5.0, 'blip.wav', 0.6),
  c(2, 0.15, 'door.wav', 0.5), c(2, 0.5, 'steps.wav', 0.6), c(2, 1.5, 'blip.wav', 0.6), c(2, 1.5, 'counter.wav', 0.4), c(2, 2.5, 'blip.wav'), c(2, 3.25, 'blip.wav', 0.6), c(2, 4.4, 'blip.wav'),
  c(3, 0.4, 'counter.wav', 0.4), c(3, 0.65, 'blip.wav'), c(3, 1.6, 'blip.wav', 0.6), c(3, 2.75, 'blip.wav', 0.5), c(3, 3.6, 'door.wav', 0.5), c(3, 4.3, 'door.wav', 0.5), c(3, 4.5, 'slam.wav', 0.3),
  c(4, 0.0, 'knock.wav', 0.8), c(4, 0.05, 'door.wav', 0.5), c(4, 1.0, 'ring.wav', 0.5), c(4, 1.9, 'decline.wav', 0.6), c(4, 2.1, 'ping.wav', 0.7), c(4, 1.8, 'blip.wav'), c(4, 3.0, 'blip.wav'), c(4, 1.6, 'tick.wav', 0.5),
];

export const Ep04Neon: React.FC<{withAudio?: boolean; music?: boolean}> = ({withAudio = true, music = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  let bi = EP04_BEATS.findIndex((b) => t >= b.start && t < b.end);
  if (bi < 0) bi = EP04_BEATS.length - 1;
  return (
    <AbsoluteFill style={{background: '#030306'}}>
      <div style={{position: 'absolute', top: 52, width: W, textAlign: 'center', fontFamily: SANS, fontWeight: 300, fontSize: 44, letterSpacing: 1, color: '#e9e9f2', opacity: t > END_AT ? 0 : 1}}>Same kid. Same front door. 🚪</div>
      <Panel t={t} side="scroll" top={TOP_Y} />
      <div style={{position: 'absolute', top: TOP_Y + PANEL_H, height: BAND_H, width: W, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <AgePill text={EP04_BEATS[bi].label} t={t} at={EP04_BEATS[bi].start} />
      </div>
      <Panel t={t} side="look" top={BOT_Y} />
      <NeonEnd t={t} />
      {withAudio && <Cues cues={CUES} fps={fps} music={music ? 'ep04-music.wav' : undefined} />}
    </AbsoluteFill>
  );
};

