import React from 'react';
import {C} from '../lib/theme';

const ST = {stroke: C.ink, strokeWidth: 5, strokeLinejoin: 'round' as const};

export type DrawingKind = 'family' | 'rocket' | 'dog' | 'house' | 'sun' | 'portrait' | 'dino';

/** A kid's crayon drawing. Origin = bottom-centre (where a hand would hold it). */
export const Drawing: React.FC<{kind: DrawingKind; w?: number; h?: number; fold?: number; tint?: string}> = ({kind, w = 110, h = 84, fold = 1, tint = '#fffdf6'}) => {
  const x0 = -w / 2;
  const y0 = -h + 8;
  const cr = {fill: 'none', strokeWidth: 3.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const doodle = () => {
    const cx = x0 + w / 2;
    const cy = y0 + h / 2;
    const s = w / 110;
    switch (kind) {
      case 'family':
        return (
          <g {...cr}>
            <circle cx={x0 + w - 18 * s} cy={y0 + 16 * s} r={9 * s} stroke="#f5a623" fill="#ffd34d" />
            {/* big person */}
            <circle cx={cx - 18 * s} cy={cy - 14 * s} r={8 * s} stroke="#2f9c8f" />
            <path d={`M${cx - 18 * s} ${cy - 6 * s} v${20 * s} m0 ${-14 * s} h${-10 * s} m${10 * s} 0 h${10 * s} m${-10 * s} ${14 * s} l${-7 * s} ${12 * s} m${7 * s} ${-12 * s} l${7 * s} ${12 * s}`} stroke="#2f9c8f" />
            {/* small person */}
            <circle cx={cx + 10 * s} cy={cy - 2 * s} r={6 * s} stroke="#e8a21a" />
            <path d={`M${cx + 10 * s} ${cy + 4 * s} v${13 * s} m0 ${-9 * s} h${-7 * s} m${7 * s} 0 h${7 * s} m${-7 * s} ${9 * s} l${-5 * s} ${9 * s} m${5 * s} ${-9 * s} l${5 * s} ${9 * s}`} stroke="#e8a21a" />
            <path d={`M${cx - 4 * s} ${cy - 24 * s} q${-4 * s} ${-6 * s} 0 ${-8 * s} q${4 * s} ${2 * s} 0 ${8 * s}`} stroke="#e2445c" fill="#ff6b81" />
            <path d={`M${x0 + 6} ${y0 + h - 12 * s} q${w / 4} ${-6} ${w / 2} 0 t${w / 2 - 12} 0`} stroke="#5cb85c" />
          </g>
        );
      case 'rocket':
        return (
          <g {...cr}>
            <path d={`M${cx} ${cy - 28 * s} q${14 * s} ${14 * s} ${10 * s} ${38 * s} h${-20 * s} q${-4 * s} ${-24 * s} ${10 * s} ${-38 * s} z`} stroke="#e2445c" fill="#ffdede" />
            <circle cx={cx} cy={cy - 6 * s} r={5 * s} stroke="#3b82f6" fill="#bfe0ff" />
            <path d={`M${cx - 6 * s} ${cy + 12 * s} l${6 * s} ${14 * s} l${6 * s} ${-14 * s}`} stroke="#f5a623" fill="#ffd34d" />
            {[[-38, -22], [34, -18], [-30, 16], [40, 20]].map(([dx, dy], i) => (
              <path key={i} d={`M${cx + dx * s} ${cy + dy * s} m-4 0 h8 m-4 -4 v8`} stroke="#f5c518" />
            ))}
          </g>
        );
      case 'dog':
        return (
          <g {...cr}>
            <ellipse cx={cx} cy={cy + 4 * s} rx={22 * s} ry={12 * s} stroke="#8b5a2b" fill="#f3d2a2" />
            <circle cx={cx + 22 * s} cy={cy - 8 * s} r={10 * s} stroke="#8b5a2b" fill="#f3d2a2" />
            <path d={`M${cx - 14 * s} ${cy + 14 * s} v${10 * s} M${cx + 12 * s} ${cy + 14 * s} v${10 * s} M${cx - 22 * s} ${cy} q${-10 * s} ${-8 * s} ${-6 * s} ${-14 * s}`} stroke="#8b5a2b" />
          </g>
        );
      case 'house':
        return (
          <g {...cr}>
            <path d={`M${cx - 24 * s} ${cy + 22 * s} v${-24 * s} l${24 * s} ${-20 * s} l${24 * s} ${20 * s} v${24 * s} z`} stroke="#e2445c" fill="#ffe3c4" />
            <rect x={cx - 6 * s} y={cy + 6 * s} width={12 * s} height={16 * s} stroke="#8b5a2b" />
            <circle cx={x0 + 16 * s} cy={y0 + 16 * s} r={8 * s} stroke="#f5a623" fill="#ffd34d" />
          </g>
        );
      case 'sun':
        return (
          <g {...cr}>
            <circle cx={cx} cy={cy} r={14 * s} stroke="#f5a623" fill="#ffd34d" />
            {Array.from({length: 8}).map((_, i) => {
              const a = (i * Math.PI) / 4;
              return <path key={i} d={`M${cx + Math.cos(a) * 20 * s} ${cy + Math.sin(a) * 20 * s} L${cx + Math.cos(a) * 28 * s} ${cy + Math.sin(a) * 28 * s}`} stroke="#f5a623" />;
            })}
          </g>
        );
      case 'dino':
        return (
          <g {...cr}>
            <path d={`M${cx - 30 * s} ${cy + 14 * s} q${10 * s} ${-30 * s} ${34 * s} ${-18 * s} q${10 * s} ${-16 * s} ${22 * s} ${-8 * s} q${-6 * s} ${8 * s} ${-12 * s} ${10 * s} q${4 * s} ${18 * s} ${-6 * s} ${26 * s} z`} stroke="#3c9a4a" fill="#b9efc0" />
          </g>
        );
      case 'portrait':
      default:
        return (
          <g {...cr}>
            <circle cx={cx} cy={cy - 4 * s} r={18 * s} stroke="#d2691e" fill="#ffe0bd" />
            <circle cx={cx - 6 * s} cy={cy - 8 * s} r={2} fill="#333" stroke="#333" />
            <circle cx={cx + 6 * s} cy={cy - 8 * s} r={2} fill="#333" stroke="#333" />
            <path d={`M${cx - 7 * s} ${cy + 3 * s} q${7 * s} ${7 * s} ${14 * s} 0`} stroke="#e2445c" />
            <path d={`M${cx - 18 * s} ${cy - 10 * s} q${18 * s} ${-26 * s} ${36 * s} 0`} stroke="#2b1b14" strokeWidth={6} />
          </g>
        );
    }
  };
  return (
    <g transform={`scale(1 ${fold})`}>
      <rect x={x0} y={y0} width={w} height={h} rx={4} fill={tint} {...ST} strokeWidth={4} />
      {doodle()}
    </g>
  );
};

export const Phone: React.FC<{glow?: number; angle?: number}> = ({glow = 1, angle = 0}) => (
  <g transform={`rotate(${angle})`}>
    {glow > 0 && <ellipse cx={0} cy={-26} rx={46} ry={36} fill="#9fd8ff" opacity={0.25 * glow} />}
    <rect x={-14} y={-52} width={28} height={50} rx={6} fill="#1e1e2a" {...ST} strokeWidth={4} />
    <rect x={-9} y={-46} width={18} height={36} rx={3} fill="#7cc8ff" opacity={0.55 + 0.45 * glow} />
  </g>
);

export const Mug: React.FC = () => (
  <g>
    <path d="M-16 -36 h28 v30 q0 8 -8 8 h-12 q-8 0 -8 -8 z" fill="#f4f1ea" {...ST} strokeWidth={4} />
    <path d="M12 -30 q12 0 12 10 q0 10 -12 10" fill="none" {...ST} strokeWidth={4} />
    <path d="M-6 -44 q-4 -6 0 -12 M4 -44 q-4 -6 0 -12" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={3} fill="none" strokeLinecap="round" />
  </g>
);

export const Sketchbook: React.FC<{open?: number; w?: number}> = ({open = 0, w = 120}) => (
  <g>
    <rect x={-w / 2} y={-16} width={w} height={16} rx={3} fill="#2f3e5e" {...ST} strokeWidth={4} />
    <rect x={-w / 2 + 6} y={-12} width={w - 12} height={8} fill="#fffaf0" />
    {open > 0 && (
      <g opacity={open}>
        <rect x={-w / 2} y={-18} width={w} height={6} fill="#fffaf0" {...ST} strokeWidth={3} />
        <path d={`M${-w / 2 + 12} -14 q${w / 4} -8 ${w / 2} 0`} stroke="#e2445c" strokeWidth={3} fill="none" />
      </g>
    )}
  </g>
);

export const Gift: React.FC<{s?: number}> = ({s = 1}) => (
  <g transform={`scale(${s})`}>
    <rect x={-34} y={-58} width={68} height={52} rx={6} fill="#e2445c" {...ST} />
    <rect x={-40} y={-70} width={80} height={16} rx={4} fill="#ff6b81" {...ST} />
    <rect x={-6} y={-70} width={12} height={64} fill="#ffd34d" stroke={C.ink} strokeWidth={3} />
    <path d="M0 -70 q-24 -22 -28 -4 q8 6 28 4 q20 2 28 -4 q-4 -18 -28 4" fill="#ffd34d" {...ST} strokeWidth={4} />
  </g>
);

export const Markers: React.FC = () => (
  <g>
    <rect x={-46} y={-30} width={92} height={30} rx={4} fill="#ffffff" {...ST} strokeWidth={4} />
    {['#e2445c', '#f5a623', '#ffd34d', '#5cb85c', '#3b82f6', '#8e44ad'].map((c, i) => (
      <rect key={c} x={-40 + i * 14} y={-50} width={10} height={36} rx={3} fill={c} stroke={C.ink} strokeWidth={3} />
    ))}
  </g>
);

export const Laptop: React.FC<{screen?: React.ReactNode; flip?: boolean}> = ({screen}) => (
  <g>
    <rect x={-70} y={-92} width={140} height={88} rx={8} fill="#2b2b36" {...ST} />
    <rect x={-62} y={-84} width={124} height={72} rx={4} fill="#dbeafe" />
    {screen}
    <rect x={-84} y={-6} width={168} height={10} rx={4} fill="#9aa3b5" {...ST} strokeWidth={4} />
  </g>
);

/** A small crumpled paper ball. */
export const PaperBall: React.FC<{r?: number}> = ({r = 14}) => (
  <g>
    <circle r={r} fill="#fffaf0" {...ST} strokeWidth={4} />
    <path d={`M${-r * 0.6} ${-r * 0.1} l${r * 0.5} ${r * 0.3} l${r * 0.3} ${-r * 0.5} M${-r * 0.1} ${r * 0.5} l${r * 0.4} ${-r * 0.2}`} stroke={C.ink} strokeWidth={2.5} fill="none" />
  </g>
);
