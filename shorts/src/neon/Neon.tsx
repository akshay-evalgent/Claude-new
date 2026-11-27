/* Neon line-art renderer: glowing stick figures, outline furniture, light cones, synthwave floor. */
import React from 'react';
import {Body, Pose, rig, toWorld} from '../components/Person';
import {clamp, pop, rand} from '../lib/anim';

export const S = 0.6; // characters are drawn in "world" px and scaled into the panel
export const FLOOR = 520;
export const sx = (wx: number) => 540 + (wx - 540) * S; // world → screen
export const wx = (s: number) => 540 + (s - 540) / S; // screen → world
export const sy = (wy: number) => FLOOR + (wy - FLOOR) * S;
export const SANS = "'Inter', 'Noto Color Emoji', sans-serif";

export type Tone = {main: string; dim: string; key: string; num: string};
export const TONES: Record<'scroll' | 'look', Tone> = {
  scroll: {main: '#ff3b5c', dim: '#5a1022', key: '#ff3b5c', num: '#ffffff'},
  look: {main: '#2fe6ff', dim: '#0b4a55', key: '#3dff9a', num: '#ffd24a'},
};

const line = (pts: [number, number][]) => pts.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');

export const GlowDefs: React.FC<{id: string}> = ({id}) => (
  <defs>
    <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="b1" />
      <feGaussianBlur stdDeviation="14" result="b2" />
      <feMerge>
        <feMergeNode in="b2" />
        <feMergeNode in="b1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="b1" />
      <feMerge>
        <feMergeNode in="b1" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <linearGradient id={`${id}-cone`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
      <stop offset="1" stopColor="#ffffff" stopOpacity="0.04" />
    </linearGradient>
    <linearGradient id={`${id}-out`} x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stopColor="#ffcf87" stopOpacity="0.95" />
      <stop offset="1" stopColor="#ffcf87" stopOpacity="0.35" />
    </linearGradient>
    <radialGradient id={`${id}-phone`} cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#a9d8ff" stopOpacity="0.55" />
      <stop offset="1" stopColor="#a9d8ff" stopOpacity="0" />
    </radialGradient>
  </defs>
);

export type Extra = {backpack?: boolean; phone?: number; headphones?: boolean; suitcase?: boolean; paper?: boolean; flowers?: boolean};

/** Glowing stick figure from the shared 2D rig (world coordinates). */
export const NeonPerson: React.FC<{id: string; b: Body; p: Pose; color: string; t: number; ex?: Extra}> = ({id, b, p, color, ex = {}}) => {
  if (p.opacity <= 0.01) return null;
  const r = rig(b, p);
  const lw = b.legW * 0.7;
  const aw = b.armW * 0.7;
  const tw = b.torsoW * 0.42;
  const hr = b.headR * 0.82;
  const back = {stroke: color, strokeOpacity: 0.55, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  const front = {stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
  const head = r.head;
  return (
    <g opacity={p.opacity} filter={`url(#${id}-soft)`}>
      <g transform={`translate(${p.x} ${p.y - p.lift}) scale(${p.facing} ${p.squash})`}>
        {ex.backpack && <rect x={-tw * 1.9} y={-(p.hipH + b.torso * 0.85)} width={tw * 1.2} height={b.torso * 0.6} rx={10} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={5} />}
        <path d={line([r.shoulder, r.elbowB, r.handB])} strokeWidth={aw} {...back} />
        <path d={line([r.hip, r.kneeB, r.footB])} strokeWidth={lw} {...back} />
        <path d={line([r.hip, r.kneeF, r.footF])} strokeWidth={lw} {...front} />
        <path d={line([r.hip, r.neckTop])} strokeWidth={tw} {...front} />
        <circle cx={head[0]} cy={head[1]} r={hr} fill={color} />
        {ex.headphones && (
          <g fill="none" stroke="#ffffff" strokeWidth={6} strokeLinecap="round">
            <path d={`M${head[0] - hr * 0.95} ${head[1] - hr * 0.2} A${hr * 1.05} ${hr * 1.05} 0 0 1 ${head[0] + hr * 0.6} ${head[1] - hr * 0.85}`} />
            <rect x={head[0] - hr * 1.1} y={head[1] - hr * 0.35} width={hr * 0.45} height={hr * 0.7} rx={6} fill="#ffffff" />
          </g>
        )}
        <path d={line([r.shoulder, r.elbowF, r.handF])} strokeWidth={aw} {...front} />
        {ex.phone !== undefined && (
          <g transform={`translate(${r.handF[0]} ${r.handF[1]})`}>
            <circle cx={-6} cy={-50} r={90} fill={`url(#${id}-phone)`} opacity={ex.phone} />
            <rect x={-9} y={-40} width={18} height={32} rx={4} fill="#dff1ff" opacity={0.35 + 0.65 * ex.phone} stroke="#ffffff" strokeWidth={2} />
          </g>
        )}
        {ex.suitcase && (
          <g transform={`translate(${r.handB[0]} ${r.handB[1]})`}>
            <path d="M-14 0 V-14 H14 V0" stroke="#ffffff" strokeWidth={5} fill="none" />
            <rect x={-40} y={0} width={80} height={110} rx={10} fill={color} fillOpacity={0.15} stroke="#ffffff" strokeWidth={5} />
            <circle cx={-24} cy={118} r={7} fill="#ffffff" />
            <circle cx={24} cy={118} r={7} fill="#ffffff" />
          </g>
        )}
        {ex.paper && (
          <g transform={`translate(${r.handF[0]} ${r.handF[1]})`}>
            <rect x={-6} y={-64} width={70} height={56} rx={4} fill="#0d0d14" stroke="#ffffff" strokeWidth={4} />
            <circle cx={22} cy={-42} r={9} fill="none" stroke="#ffd24a" strokeWidth={4} />
            <path d="M8 -18 q12 -14 26 0 t26 0" stroke={color} strokeWidth={4} fill="none" />
          </g>
        )}
        {ex.flowers && (
          <g transform={`translate(${r.handF[0]} ${r.handF[1]})`}>
            <path d="M0 0 L-8 -60 M0 0 L6 -66 M0 0 L16 -56" stroke="#3dff9a" strokeWidth={4} />
            {[[-8, -64], [6, -72], [17, -60]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={9} fill="#ffd24a" />
            ))}
          </g>
        )}
      </g>
    </g>
  );
};

export const headScreen = (b: Body, p: Pose): [number, number, number] => {
  const h = toWorld(p, rig(b, p).head);
  return [sx(h[0]), sy(h[1]), b.headR * 0.82 * S];
};

// ---------------- the room ----------------
export type RoomState = {door: number; outside: number; lamp: number; dust: number; t: number};

export const NeonRoom: React.FC<{id: string; tone: Tone; st: RoomState; children?: React.ReactNode; front?: React.ReactNode}> = ({id, tone, st, children, front}) => {
  const c = tone.main;
  const g = `url(#${id}-glow)`;
  const doorX0 = 850;
  const doorX1 = 960;
  const doorTop = 215;
  const leafW = (doorX1 - doorX0) * (1 - st.door * 0.82);
  return (
    <svg viewBox="0 0 1080 630" width={1080} height={630} style={{position: 'absolute', inset: 0}}>
      <GlowDefs id={id} />
      <rect width={1080} height={630} fill="#040407" />
      {/* faint wall stripes */}
      {Array.from({length: 16}).map((_, i) => (
        <rect key={i} x={20 + i * 70} y={0} width={22} height={FLOOR} fill={c} opacity={0.07} />
      ))}
      <rect x={0} y={0} width={1080} height={FLOOR} fill="url(#none)" />
      {/* window with curtains */}
      <g filter={g}>
        <path d="M70 128 H262" stroke="#ffffff" strokeWidth={4} opacity={0.8} />
        <rect x={78} y={148} width={58} height={190} fill={c} opacity={0.35} />
        <rect x={198} y={148} width={58} height={190} fill={c} opacity={0.35} />
        <rect x={92} y={140} width={150} height={180} rx={10} fill="#07070d" stroke="#ffffff" strokeWidth={5} />
        <path d="M167 140 V320 M92 230 H242" stroke="#ffffff" strokeWidth={5} />
      </g>
      {/* picture frame */}
      <g filter={g}>
        <rect x={600} y={160} width={104} height={78} rx={4} fill="#07070d" stroke="#ffe680" strokeWidth={4} transform="rotate(-3 652 199)" />
        <path d="M612 228 L640 196 L656 214 L672 190 L694 228 Z" fill={c} opacity={0.9} transform="rotate(-3 652 199)" />
      </g>
      {/* pendant lamp + cone */}
      <path d="M380 0 V118" stroke="#9a9aa8" strokeWidth={3} />
      <path d="M352 150 L364 120 H396 L408 150 Z" fill="#1a1a22" stroke="#d9d9e3" strokeWidth={3} />
      {st.lamp > 0 && (
        <g opacity={st.lamp}>
          <path d={`M356 150 L404 150 L560 ${FLOOR} L200 ${FLOOR} Z`} fill={`url(#${id}-cone)`} opacity={0.42} />
          <circle cx={380} cy={150} r={10} fill="#ffffff" filter={g} />
          <ellipse cx={380} cy={FLOOR + 4} rx={190} ry={14} fill="#ffffff" opacity={0.08} />
          {Array.from({length: 18}).map((_, i) => {
            const yy = FLOOR - ((st.t * (8 + rand(i) * 10) + rand(i * 7) * 380) % 370);
            const span = ((yy - 150) / (FLOOR - 150)) * 170;
            const xx = 380 + (rand(i * 3) - 0.5) * 2 * span + Math.sin(st.t * 0.7 + i) * 6;
            return <circle key={i} cx={xx} cy={yy} r={1.6 + rand(i * 5) * 1.6} fill="#ffffff" opacity={0.5 * st.dust} />;
          })}
        </g>
      )}
      {/* door */}
      <g filter={g}>
        <rect x={doorX0 - 8} y={doorTop - 8} width={doorX1 - doorX0 + 16} height={FLOOR - doorTop + 8} fill="none" stroke="#ffffff" strokeWidth={4} />
        {st.door > 0.01 && <rect x={doorX0} y={doorTop} width={doorX1 - doorX0} height={FLOOR - doorTop} fill={`url(#${id}-out)`} opacity={st.outside} />}
        <path d={`M${doorX1} ${doorTop} L${doorX1 - leafW} ${doorTop + st.door * 22} L${doorX1 - leafW} ${FLOOR - st.door * 10} L${doorX1} ${FLOOR} Z`} fill="#0b0b12" stroke={c} strokeWidth={4} />
        {st.door < 0.5 && <circle cx={doorX1 - leafW + 14} cy={372} r={5} fill="#ffe680" />}
      </g>
      {st.door > 0.01 && <path d={`M${doorX0} ${FLOOR} L${doorX1} ${FLOOR} L${doorX1 - 40} ${FLOOR + 90} L${doorX0 - 160} ${FLOOR + 90} Z`} fill="#ffcf87" opacity={0.16 * st.outside * st.door} />}
      {/* couch (side view, back on the left) */}
      <g filter={g}>
        <path d="M296 470 V372 Q296 356 312 356 H326 V440 H462 Q478 440 478 424 V418 H492 V470 Z" fill={c} fillOpacity={0.12} stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" />
        <path d="M304 470 V500 M484 470 V500" stroke="#ffffff" strokeWidth={4} />
      </g>
      {/* floor line + grid */}
      <g>
        {Array.from({length: 9}).map((_, i) => {
          const y = FLOOR + Math.pow(i / 8, 1.6) * 110;
          return <path key={`h${i}`} d={`M0 ${y} H1080`} stroke={c} strokeWidth={1.5} opacity={0.18} />;
        })}
        {Array.from({length: 19}).map((_, i) => {
          const x0 = 540 + (i - 9) * 70;
          const x1 = 540 + (i - 9) * 260;
          return <path key={`v${i}`} d={`M${x0} ${FLOOR} L${x1} 630`} stroke={c} strokeWidth={1.5} opacity={0.16} />;
        })}
        <path d={`M0 ${FLOOR} H1080`} stroke={c} strokeWidth={4} filter={g} />
      </g>
      <g transform={`translate(540 ${FLOOR}) scale(${S}) translate(-540 ${-FLOOR})`}>{children}</g>
      {front}
    </svg>
  );
};

// ---------------- overlays ----------------
export const PanelLabel: React.FC<{lead: string; key_: string; tone: Tone}> = ({lead, key_, tone}) => (
  <div style={{position: 'absolute', left: 58, top: 36, fontFamily: SANS, fontWeight: 300, fontSize: 46, letterSpacing: 2, color: '#f4f4f8', textShadow: '0 0 14px rgba(255,255,255,0.35)'}}>
    {lead} <span style={{fontWeight: 500, color: tone.key, textShadow: `0 0 18px ${tone.key}`}}>{key_}</span>
  </div>
);

export const CountPill: React.FC<{label: string; v: string; tone: Tone; bump: number}> = ({label, v, tone, bump}) => (
  <div style={{position: 'absolute', right: 48, top: 36, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px 8px 18px', borderRadius: 14, background: 'rgba(14,14,20,0.9)', border: '2px solid #3a3a46', fontFamily: SANS, fontWeight: 600, fontSize: 24, color: '#e6e6ee', letterSpacing: 1}}>
    {label}
    <span style={{minWidth: 40, textAlign: 'center', padding: '2px 10px', borderRadius: 10, border: `2px solid ${tone.num}`, color: tone.num, fontSize: 30, fontWeight: 500, transform: `scale(${1 + bump * 0.25})`, boxShadow: `0 0 ${8 + bump * 20}px ${tone.num}66`}}>{v}</span>
  </div>
);

export const AgePill: React.FC<{text: string; t: number; at: number}> = ({text, t, at}) => {
  const [a, b] = text.split(' ');
  const s = pop(t, at, 0.45);
  return (
    <div style={{display: 'flex', gap: 16, alignItems: 'baseline', padding: '8px 22px', borderRadius: 16, background: 'rgba(16,16,22,0.95)', border: '2px solid #3a3a46', fontFamily: SANS, transform: `scale(${0.85 + 0.15 * s})`}}>
      <span style={{fontWeight: 600, fontSize: 30, color: '#f4f4f8', letterSpacing: 1}}>{a}</span>
      <span style={{fontWeight: 500, fontSize: 46, color: '#ffd24a', textShadow: '0 0 16px rgba(255,210,74,0.6)'}}>{b}</span>
    </div>
  );
};

/** Minimal dark bubble with a neon border; tip at (x, y). */
export const NBubble: React.FC<{t: number; from: number; to: number; x: number; y: number; text: string; tone: Tone; side?: 'left' | 'right'; size?: number; dim?: boolean}> = ({t, from, to, x, y, text, tone, side = 'right', size = 30, dim}) => {
  if (t < from || t > to + 0.25) return null;
  const estW = [...text].length * size * 0.55 + 44;
  if (side === 'right' && x - 0.12 * estW + estW > 1060) side = 'left';
  else if (side === 'left' && x - 0.88 * estW < 20) side = 'right';
  const s = pop(t, from, 0.35);
  const o = t > to ? 1 - (t - to) / 0.25 : clamp((t - from) / 0.12);
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(${side === 'right' ? '-12%' : '-88%'}, -100%) scale(${0.9 + 0.1 * s})`, transformOrigin: side === 'right' ? '12% 100%' : '88% 100%', opacity: o}}>
      <div style={{position: 'relative', marginBottom: 18, padding: '10px 20px', borderRadius: 18, background: 'rgba(12,12,18,0.92)', border: `2px solid ${dim ? '#55556a' : tone.main}`, boxShadow: dim ? 'none' : `0 0 16px ${tone.main}55`, fontFamily: SANS, fontWeight: 500, fontSize: size, color: dim ? '#a9a9bb' : '#f6f6fa', fontStyle: dim ? 'italic' : 'normal', whiteSpace: 'nowrap'}}>
        {text}
        <div style={{position: 'absolute', bottom: -11, [side === 'right' ? 'left' : 'right']: 20, width: 18, height: 18, background: 'rgba(12,12,18,0.92)', borderRight: `2px solid ${dim ? '#55556a' : tone.main}`, borderBottom: `2px solid ${dim ? '#55556a' : tone.main}`, transform: 'rotate(45deg)'} as React.CSSProperties} />
      </div>
    </div>
  );
};

export const Glyph: React.FC<{t: number; from: number; to: number; x: number; y: number; text: string; color?: string; size?: number}> = ({t, from, to, x, y, text, color = '#ffffff', size = 46}) => {
  if (t < from || t > to + 0.25) return null;
  const s = pop(t, from, 0.4);
  const o = t > to ? 1 - (t - to) / 0.25 : 1;
  return <div style={{position: 'absolute', left: x, top: y + Math.sin((t - from) * 3) * 4, transform: `translate(-50%, -50%) scale(${s})`, opacity: o, fontFamily: SANS, fontWeight: 600, fontSize: size, color, textShadow: `0 0 14px ${color}`}}>{text}</div>;
};
