/* Shared building blocks for 3D split-screen episodes (EP02 onward). */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Body, Pose, standPose} from '../components/Person';
import {Counter, Header} from '../components/Overlay';
import {C, FONT, GROUND, Look, PANEL_H, TOP_Y, BAND_H, W} from '../lib/theme';
import {Keyed, clamp, kf, lerp, pop, prog, track} from '../lib/anim';
import {Cam, Stage} from '../three/Stage';
import {Actor, headWorld} from '../three/Person3D';
import {U, V3} from '../three/core';

export type Side = 'scroll' | 'look';
export type Proj = (p: V3) => [number, number];
export type Out3 = {scene: React.ReactNode; overlay: React.ReactNode; cam: Cam};
export type Beat = {start: number; end: number; label: string};
export type ZKeys = [number, number, ('in' | 'out' | 'inOut' | 'linear')?][];

export const BASE: Cam = {pos: [0, 3.25, 13.0], target: [0, 2.62, 0], fov: 30};
export const v3lerp = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];

/** Swoop in at each beat start, optional gentle push-in on a focus point. */
export const PARK_BASE: Cam = {pos: [0, 3.15, 11.2], target: [0, 2.5, 0], fov: 30};
export const camAt = (lt: number, focus?: {p: V3; amt: number; dist?: number}, base: Cam = BASE): Cam => {
  const BASE_ = base;
  const sw = 1 - prog(lt, 0, 1.2, 'out');
  let pos: V3 = [BASE_.pos[0] + 1.8 * sw, BASE_.pos[1] + 0.8 * sw, BASE_.pos[2] - 2.2 * sw];
  let target: V3 = [BASE_.target[0] + 0.5 * sw, BASE_.target[1], BASE_.target[2]];
  if (focus && focus.amt > 0) {
    const amt = Math.min(0.38, focus.amt);
    const fp: V3 = [focus.p[0], Math.max(2.35, focus.p[1]), focus.p[2]];
    const d = focus.dist ?? 0.6;
    const off: V3 = [(BASE_.pos[0] - BASE_.target[0]) * d, (BASE_.pos[1] - BASE_.target[1]) * d, (BASE_.pos[2] - BASE_.target[2]) * d];
    pos = v3lerp(pos, [fp[0] + off[0], fp[1] + off[1], fp[2] + off[2]], amt);
    target = v3lerp(target, fp, amt);
  }
  return {pos, target, fov: BASE.fov};
};

export const P = (b: Body, x: number, facing: number, extra: Partial<Pose> = {}): Pose => ({...standPose(b, x, GROUND, facing), ...extra});
export const tr = (t: number, base: Pose, keys: Keyed<Pose>[]) => track(t, base as unknown as Record<string, never>, keys as never) as unknown as Pose;
export const standH = (b: Body) => b.thigh + b.shin + 8;

/** Actor at time t with stretch in the air and a squash on landing. */
export const act = (key: string, body: Body, look: Look, base: Pose, keys: Keyed<Pose>[], t: number, z: number | ZKeys = 0, seed = 1): Actor => {
  const pose = tr(t, base, keys);
  const prev = tr(t - 1 / 30, base, keys).lift;
  const v = (pose.lift - prev) * 30;
  let sq = pose.squash;
  if (pose.lift > 1 && !pose.spin) sq *= 1 + Math.min(0.12, Math.abs(v) * 0.0005);
  else if (pose.lift <= 1) for (let k = 1; k <= 3; k++) if (tr(t - k / 30, base, keys).lift > 1) sq *= 0.92;
  const zz = typeof z === 'number' ? z : kf(t, z as never);
  return {key, body, look, pose: {...pose, squash: sq}, z: zz, seed};
};

/** Clapping keyframes between t0 and t1 (hands meet in front of the chest). */
export const clapKeys = (t0: number, t1: number, period = 0.2): Keyed<Pose>[] => {
  const out: Keyed<Pose>[] = [];
  let i = 0;
  for (let s = t0; s < t1; s += period / 2, i++) out.push({t: s, handsIn: i % 2 ? 0.35 : 1, hF: i % 2 ? [66, 10] : [60, 24], hB: i % 2 ? [58, 14] : [60, 24]});
  out.push({t: t1 + 0.1, handsIn: 0});
  return out;
};

// ---------- overlay helpers ----------
export const headPx = (proj: Proj, a: Actor, t: number) => {
  const h = headWorld(a, t);
  const c = proj(h);
  const top = proj([h[0], h[1] + a.body.headR * U, h[2]]);
  return {c, r: Math.max(8, c[1] - top[1])};
};
export const above = (proj: Proj, a: Actor, t: number, dy = 12): [number, number] => {
  const {c, r} = headPx(proj, a, t);
  return [c[0], c[1] - r - dy];
};
export const tip = (proj: Proj, a: Actor, t: number): [number, number, 'left' | 'right'] => {
  const {c, r} = headPx(proj, a, t);
  const f = Math.sign(a.pose.facing || 1);
  return [c[0] + f * (r + 10), c[1] - r * 0.2, f < 0 ? 'left' : 'right'];
};

export const Callback: React.FC<{t: number; from: number; to: number; x: number; y: number; quote: string; by: string}> = ({t, from, to, x, y, quote, by}) => {
  if (t < from || t > to + 0.3) return null;
  const s = pop(t, from, 0.5);
  const o = t > to ? 1 - (t - to) / 0.3 : 1;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: '0 50%', opacity: clamp(o * 1.5), fontFamily: FONT, color: '#fff', textShadow: `0 3px 0 ${C.ink}, 0 0 14px rgba(0,0,0,0.6)`}}>
      <div style={{fontSize: 42, fontWeight: 700, fontStyle: 'italic'}}>“{quote}”</div>
      <div style={{fontSize: 27, fontWeight: 600, fontStyle: 'italic', marginLeft: 40, color: '#efe9ff'}}>— {by}</div>
    </div>
  );
};

export const PopCard: React.FC<{t: number; from: number; to: number; x?: number; y?: number; w?: number; rot?: number; stamp?: string; children: React.ReactNode}> = ({t, from, to, x = 36, y = 96, w = 380, rot = -4, stamp, children}) => {
  if (t < from || t > to + 0.25) return null;
  const s = pop(t, from, 0.5);
  const o = t > to ? 1 - (t - to) / 0.25 : 1;
  const st = pop(t, from + 0.55, 0.4);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, transform: `rotate(${rot}deg) scale(${s * o})`, transformOrigin: '20% 20%', background: '#fffdf6', border: `4px solid ${C.ink}`, borderRadius: 14, padding: '16px 20px', boxShadow: `0 8px 0 ${C.ink}`, fontFamily: FONT, color: C.ink}}>
      {children}
      {stamp && <div style={{position: 'absolute', right: 16, bottom: 10, fontSize: 28, fontWeight: 700, color: '#2fa36b', border: '4px solid #2fa36b', borderRadius: 10, padding: '0 10px', transform: `rotate(-12deg) scale(${st})`}}>{stamp}</div>}
    </div>
  );
};

/** Rubber-stamp label that slams onto the panel. */
export const Stamp: React.FC<{t: number; at: number; x: number; y: number; text: string; color?: string}> = ({t, at, x, y, text, color = C.bad}) => {
  if (t < at) return null;
  const k = prog(t, at, at + 0.18, 'out');
  const s = 1.8 - 0.8 * k;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `rotate(-10deg) scale(${s})`, opacity: k, fontFamily: FONT, fontWeight: 700, fontSize: 34, letterSpacing: 2, color, border: `5px solid ${color}`, borderRadius: 10, padding: '2px 14px', background: 'rgba(14,12,20,0.55)'}}>
      {text}
    </div>
  );
};

// ---------- frame chrome ----------
export const Band: React.FC<{t: number; beats: Beat[]}> = ({t, beats}) => {
  let bi = beats.findIndex((b) => t >= b.start && t < b.end);
  if (bi < 0) bi = beats.length - 1;
  const b = beats[bi];
  const s = pop(t, b.start, 0.45);
  return (
    <div style={{position: 'absolute', top: TOP_Y + PANEL_H, left: 0, width: W, height: BAND_H, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{background: C.gold, color: C.ink, fontFamily: FONT, fontWeight: 700, fontSize: 44, letterSpacing: 3, padding: '4px 34px', borderRadius: 40, border: `4px solid ${C.ink}`, boxShadow: `0 5px 0 ${C.goldDeep}, 0 0 30px rgba(246,185,59,0.35)`, transform: `scale(${0.7 + 0.3 * s}) rotate(${(1 - s) * -6}deg)`}}>{b.label}</div>
    </div>
  );
};

export const Hook: React.FC<{t: number; text: string; endAt: number}> = ({t, text, endAt}) => (
  <div style={{position: 'absolute', top: 44, left: 0, width: W, textAlign: 'center', fontFamily: FONT, fontWeight: 600, fontSize: 54, color: '#f4efe6', opacity: t > endAt ? 0 : 1}}>{text}</div>
);

export const Flash: React.FC<{t: number; beats: Beat[]}> = ({t, beats}) => {
  let a = 0;
  for (const b of beats.slice(1)) if (t >= b.start && t < b.start + 0.16) a = 1 - (t - b.start) / 0.16;
  return a > 0 ? <AbsoluteFill style={{background: '#fff', opacity: a * 0.55}} /> : null;
};

export const EndCard: React.FC<{t: number; at: number; l1: string; l2: string; cta: string; s1?: number; s2?: number}> = ({t, at, l1, l2, cta, s1 = 70, s2 = 70}) => {
  if (t < at) return null;
  const a = prog(t, at, at + 0.5, 'out');
  const p1 = pop(t, at + 0.25, 0.5);
  const p2 = pop(t, at + 1.05, 0.5);
  const p3 = pop(t, at + 1.9, 0.5);
  const line: React.CSSProperties = {fontFamily: FONT, fontWeight: 700, color: '#fff', textAlign: 'center', textShadow: `0 5px 0 ${C.ink}`, maxWidth: 1000, lineHeight: 1.15, whiteSpace: 'pre-line'};
  return (
    <AbsoluteFill style={{background: `rgba(8,7,12,${0.93 * a})`, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', paddingBottom: 140}}>
      <div style={{...line, fontSize: s1, transform: `scale(${p1})`, opacity: clamp(p1 * 2)}}>{l1}</div>
      <div style={{...line, fontSize: s2, color: C.gold, marginTop: 22, transform: `scale(${p2})`, opacity: clamp(p2 * 2)}}>{l2}</div>
      <div style={{...line, fontSize: 44, fontWeight: 600, color: '#d9d4e6', marginTop: 64, transform: `scale(${p3})`, opacity: clamp(p3 * 2)}}>{cta}</div>
    </AbsoluteFill>
  );
};

type Steps = {t: number; v: number}[];
export type CounterCfg = {label: string; emoji: string; steps: Steps; sub?: {label: string; emoji: string; from: number; steps: Steps}};

const grade = (side: Side, beat: number): React.CSSProperties =>
  side === 'scroll' ? {filter: `saturate(${[0.9, 0.8, 0.7, 0.62, 0.55][beat] ?? 0.6}) brightness(0.96) contrast(1.02)`} : {filter: 'saturate(1.08) brightness(1.03)'};

export const Panel3D: React.FC<{
  t: number;
  side: Side;
  top: number;
  beats: Beat[];
  fns: ((lt: number, side: Side) => Out3)[];
  headers: Record<Side, string>;
  counter: (side: Side, beatIndex: number) => CounterCfg;
}> = ({t, side, top, beats, fns, headers, counter}) => {
  let bi = beats.findIndex((b) => t >= b.start && t < b.end);
  if (bi < 0) bi = beats.length - 1;
  const b = beats[bi];
  const out = fns[bi](t - b.start, side);
  const cc = counter(side, bi);
  return (
    <div style={{position: 'absolute', left: 0, top, width: W, height: PANEL_H, overflow: 'hidden', background: '#000'}}>
      <div style={{position: 'absolute', inset: 0, ...grade(side, bi)}}>
        <Stage cam={out.cam}>{out.scene}</Stage>
      </div>
      <div style={{position: 'absolute', inset: 0}}>{out.overlay}</div>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 100%)'}} />
      {side === 'look' && <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,190,90,0.10), rgba(255,140,60,0.05))', mixBlendMode: 'soft-light'}} />}
      <Header t={t} text={headers[side]} />
      <Counter t={t} label={cc.label} emoji={cc.emoji} steps={cc.steps} tone={side === 'scroll' ? 'bad' : 'good'} sub={cc.sub} />
    </div>
  );
};

export type Cue = {at: number; src: string; vol?: number; dur?: number};
export const SFX_GAIN = 0.45;
export const Cues: React.FC<{cues: Cue[]; fps: number; music?: string; beds?: {src: string; from: number; to: number; vol: number}[]}> = ({cues, fps, music, beds = []}) => (
  <>
    {music && <Audio src={staticFile(`audio/${music}`)} volume={1} />}
    {beds.map((b, i) => (
      <Sequence key={`bed${i}`} from={Math.round(b.from * fps)} durationInFrames={Math.round((b.to - b.from) * fps)} layout="none">
        <Audio src={staticFile(`audio/${b.src}`)} volume={(f) => b.vol * Math.min(1, f / (0.4 * fps), (Math.round((b.to - b.from) * fps) - f) / (0.4 * fps))} />
      </Sequence>
    ))}
    {cues.map((c, i) => (
      <Sequence key={i} from={Math.round(c.at * fps)} layout="none">
        <Audio src={staticFile(`audio/${c.src}`)} volume={SFX_GAIN * (c.vol ?? 0.7)} />
      </Sequence>
    ))}
  </>
);

export {TOP_Y};
