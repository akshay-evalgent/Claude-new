import React from 'react';
import {C, FONT, MONO} from '../lib/theme';
import {clamp, fmt, kf, pop, prog} from '../lib/anim';

/** Panel title, e.g. "PARENTS WHO SCROLL 📱" */
export const Header: React.FC<{text: string; t: number}> = ({text, t}) => {
  const s = pop(t, 0.05, 0.5);
  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 62,
        letterSpacing: 1,
        color: '#ffffff',
        textShadow: `0 4px 0 ${C.ink}, 0 0 18px rgba(0,0,0,0.55), 3px 0 0 ${C.ink}, -3px 0 0 ${C.ink}, 0 -3px 0 ${C.ink}`,
        transform: `scale(${0.6 + 0.4 * s})`,
        opacity: clamp(s * 2),
      }}
    >
      {text}
    </div>
  );
};

type Roll = {t: number; v: number}[];

/** Value at time t from a list of [time, value] steps, rolling smoothly over `dur`. */
const rolled = (t: number, steps: Roll, dur = 0.7) => {
  let v = steps[0].v;
  for (let i = 1; i < steps.length; i++) {
    const s = steps[i];
    if (t < s.t) break;
    if (t < s.t + dur) return kf(t, [[s.t, v], [s.t + dur, s.v, 'out']]);
    v = s.v;
  }
  return v;
};

/** HUD counter card bottom-left of a panel. */
export const Counter: React.FC<{
  t: number;
  label: string;
  emoji: string;
  steps: Roll;
  tone: 'bad' | 'good';
  sub?: {label: string; emoji: string; steps: Roll; from: number};
}> = ({t, label, emoji, steps, tone, sub}) => {
  const v = rolled(t, steps);
  const col = tone === 'bad' ? C.bad : C.good;
  // bump on each change
  let bump = 0;
  for (const s of steps.slice(1)) if (t >= s.t && t < s.t + 0.35) bump = 1 - (t - s.t) / 0.35;
  const last = [...steps].reverse().find((s) => t >= s.t);
  const prev = last ? steps[steps.indexOf(last) - 1] : undefined;
  const delta = last && prev ? last.v - prev.v : 0;
  const deltaAge = last ? t - last.t : 99;
  const subV = sub ? rolled(t, sub.steps) : 0;
  const subShow = sub ? prog(t, sub.from, sub.from + 0.4, 'out') : 0;
  return (
    <div style={{position: 'absolute', left: 26, bottom: 24}}>
      <div
        style={{
          background: 'rgba(14,12,20,0.82)',
          border: `3px solid ${col}`,
          borderRadius: 18,
          padding: '10px 18px 8px',
          boxShadow: `0 0 ${12 + bump * 24}px ${col}55`,
          minWidth: 250,
        }}
      >
        <div style={{fontFamily: MONO, fontWeight: 800, fontSize: 24, letterSpacing: 2, color: col, textTransform: 'uppercase'}}>{label}</div>
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 54, color: '#fff', lineHeight: 1.05, transform: `scale(${1 + bump * 0.18})`, transformOrigin: 'left center'}}>
          {emoji} {fmt(v)}
        </div>
        {sub && subShow > 0 && (
          <div style={{opacity: subShow, borderTop: '2px solid rgba(255,255,255,0.15)', marginTop: 6, paddingTop: 6}}>
            <div style={{fontFamily: MONO, fontWeight: 800, fontSize: 21, letterSpacing: 2, color: '#c9c4d7', textTransform: 'uppercase'}}>{sub.label}</div>
            <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 40, color: '#fff'}}>
              {sub.emoji} {fmt(subV)}
            </div>
          </div>
        )}
      </div>
      {delta > 0 && deltaAge < 0.9 && (
        <div
          style={{
            position: 'absolute',
            right: -130,
            width: 120,
            top: 30 - deltaAge * 60,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 38,
            color: col,
            opacity: 1 - deltaAge / 0.9,
            textShadow: `0 3px 0 ${C.ink}`,
          }}
        >
          +{fmt(delta)}
        </div>
      )}
    </div>
  );
};

/** Speech bubble anchored at (x, y) = tip of the tail, in panel px. */
export const Bubble: React.FC<{
  t: number;
  from: number;
  to: number;
  x: number;
  y: number;
  text: string;
  side?: 'left' | 'right'; // which side of the tip the bubble body sits
  kind?: 'say' | 'shout' | 'mutter' | 'offscreen';
  size?: number;
}> = ({t, from, to, x, y, text, side = 'right', kind = 'say', size = 36}) => {
  if (t < from || t > to + 0.2) return null;
  // keep the bubble inside the 1080px panel: flip to the other side of the tail if it would overflow
  const estW = [...text].length * size * 0.56 + 56;
  if (side === 'right' && x - 0.14 * estW + estW > 1066) side = 'left';
  else if (side === 'left' && x - 0.86 * estW < 14) side = 'right';
  const s = pop(t, from, 0.4);
  const out = t > to ? 1 - (t - to) / 0.2 : 1;
  const bg = kind === 'shout' ? C.gold : kind === 'mutter' ? '#d9d6e0' : kind === 'offscreen' ? '#ffe3e3' : '#ffffff';
  const typed = text; // full text; pop is the reveal
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${side === 'right' ? '-14%' : '-86%'}, -100%) scale(${s * out})`,
        transformOrigin: side === 'right' ? '14% 100%' : '86% 100%',
        opacity: clamp(out * 2),
      }}
    >
      <div
        style={{
          position: 'relative',
          background: bg,
          border: `5px solid ${C.ink}`,
          borderRadius: 26,
          padding: '12px 24px',
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: size,
          color: C.ink,
          whiteSpace: 'nowrap',
          boxShadow: `0 6px 0 ${C.ink}`,
          marginBottom: 26,
          fontStyle: kind === 'mutter' ? 'italic' : 'normal',
        }}
      >
        {typed}
        <svg width={40} height={34} style={{position: 'absolute', bottom: -33, [side === 'right' ? 'left' : 'right']: 22} as React.CSSProperties} viewBox="0 0 40 34">
          <path d={side === 'right' ? 'M2 0 L6 30 L30 0' : 'M38 0 L34 30 L10 0'} fill={bg} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
          <rect x={side === 'right' ? 6 : 12} y={0} width={22} height={5} fill={bg} />
        </svg>
      </div>
    </div>
  );
};

/** Emoji reaction that pops above a head and floats. */
export const EmojiPop: React.FC<{t: number; from: number; to: number; x: number; y: number; e: string; size?: number}> = ({t, from, to, x, y, e, size = 64}) => {
  if (t < from || t > to + 0.25) return null;
  const s = pop(t, from, 0.45);
  const out = t > to ? 1 - (t - to) / 0.25 : 1;
  const float = Math.sin((t - from) * 3) * 6;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + float,
        transform: `translate(-50%, -50%) scale(${s * out})`,
        fontFamily: "'Noto Color Emoji'",
        fontSize: size,
        filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.35))',
      }}
    >
      {e}
    </div>
  );
};

/** Little clock chip, top-left of a panel. */
export const ClockChip: React.FC<{text: string; opacity?: number}> = ({text, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: 24,
      top: 96,
      opacity,
      background: 'rgba(14,12,20,0.75)',
      borderRadius: 14,
      padding: '6px 14px',
      fontFamily: MONO,
      fontWeight: 700,
      fontSize: 22,
      color: '#e9e6f2',
      letterSpacing: 1.5,
    }}
  >
    🕰️ {text}
  </div>
);
