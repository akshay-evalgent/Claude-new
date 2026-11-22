// Explainer diagrams in the cartoon house style (SVG, world space inside a Stage).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CF, K, LW, OUT, clamp, out, p01, pop, rnd } from "./style";
import { Prop, PropName } from "./Props";

const card = (fill = K.paper) => ({ fill, stroke: OUT, strokeWidth: LW, strokeLinejoin: "round" as const });

/** Balance sheet: assets (left) | liabilities (right). Rows appear at their own frames. */
export type TRow = { side: "A" | "L"; text: string; amount: string; at: number; color?: string; strike?: number };
export const TAccount: React.FC<{ x: number; y: number; w?: number; h?: number; title: string; rows: TRow[]; at?: number; leftHead?: string; rightHead?: string }> =
  ({ x, y, w = 1100, h = 560, title, rows, at = 0, leftHead = "WHAT IT OWNS", rightHead = "WHAT IT OWES" }) => {
    const f = useCurrentFrame();
    const t = interpolate(f, [at, at + 14], [0, 1], { ...clamp, easing: pop });
    if (t <= 0) return null;
    const cy = y + 150;
    let iA = 0, iL = 0;
    return (
      <g transform={`translate(${x + w / 2} ${y + h / 2}) scale(${t}) translate(${-x - w / 2} ${-y - h / 2})`}>
        <rect x={x} y={y} width={w} height={h} rx={30} {...card()} />
        <text x={x + w / 2} y={y + 72} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={50} fill={OUT}>{title}</text>
        <path d={`M ${x + 50} ${y + 100} L ${x + w - 50} ${y + 100} M ${x + w / 2} ${y + 100} L ${x + w / 2} ${y + h - 40}`} stroke={OUT} strokeWidth={LW + 2} strokeLinecap="round" />
        <text x={x + w / 4} y={y + 140} textAnchor="middle" fontFamily={CF.label} fontWeight={600} fontSize={30} fill={OUT} opacity={0.55}>{leftHead}</text>
        <text x={x + (3 * w) / 4} y={y + 140} textAnchor="middle" fontFamily={CF.label} fontWeight={600} fontSize={30} fill={OUT} opacity={0.55}>{rightHead}</text>
        {rows.map((r, i) => {
          const k = r.side === "A" ? iA++ : iL++;
          const rt = interpolate(f, [r.at, r.at + 12], [0, 1], { ...clamp, easing: pop });
          if (rt <= 0) return null;
          const rx = r.side === "A" ? x + 60 : x + w / 2 + 40;
          const ry = cy + 50 + k * 92;
          const st = r.strike !== undefined ? p01(f, r.strike, 10) : 0;
          return (
            <g key={i} transform={`translate(${rx} ${ry}) scale(${rt})`} opacity={1 - st * 0.55}>
              <rect x={0} y={-48} width={w / 2 - 100} height={72} rx={16} fill={r.color ?? K.white} stroke={OUT} strokeWidth={4} />
              <text x={22} y={2} fontFamily={CF.label} fontWeight={600} fontSize={34} fill={OUT}>{r.text}</text>
              <text x={w / 2 - 122} y={2} textAnchor="end" fontFamily={CF.caption} fontWeight={900} fontSize={36} fill={OUT}>{r.amount}</text>
              {st > 0 && <path d={`M 10 -12 L ${10 + (w / 2 - 120) * st} -12`} stroke={K.loss} strokeWidth={8} strokeLinecap="round" />}
            </g>
          );
        })}
      </g>
    );
  };

/** 10x10 waffle: first `n` squares in colour A, rest in colour B, filled progressively. */
export const Waffle: React.FC<{ x: number; y: number; size?: number; n: number; a: string; b: string; at?: number; dur?: number; highlightB?: number; iconA?: PropName; }> =
  ({ x, y, size = 600, n, a, b, at = 0, dur = 40, highlightB }) => {
    const f = useCurrentFrame();
    const cell = size / 10;
    return (
      <g>
        {Array.from({ length: 100 }).map((_, i) => {
          const r = Math.floor(i / 10), c = i % 10;
          const t = interpolate(f, [at + (i / 100) * dur, at + (i / 100) * dur + 8], [0, 1], { ...clamp, easing: pop });
          if (t <= 0) return null;
          const isA = i < n;
          const hb = !isA && highlightB !== undefined ? 1 + 0.12 * Math.sin((f - highlightB) / 3) * (f > highlightB ? 1 : 0) : 1;
          return <rect key={i} x={x + c * cell + cell * 0.08} y={y + r * cell + cell * 0.08} width={cell * 0.84} height={cell * 0.84} rx={cell * 0.18}
            fill={isA ? a : b} stroke={OUT} strokeWidth={3.5} transform={`translate(${x + c * cell + cell / 2} ${y + r * cell + cell / 2}) scale(${t * hb}) translate(${-(x + c * cell + cell / 2)} ${-(y + r * cell + cell / 2)})`} />;
        })}
      </g>
    );
  };

/** Circular cycle of labelled nodes with arrows; a highlight runs round the loop. */
export const Cycle: React.FC<{ cx: number; cy: number; r: number; nodes: { text: string; at: number; color?: string }[]; spinFrom?: number; reverse?: boolean; nodeW?: number }> =
  ({ cx, cy, r, nodes, spinFrom, reverse, nodeW = 360 }) => {
    const f = useCurrentFrame();
    const n = nodes.length;
    const pos = (i: number) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const active = spinFrom !== undefined && f >= spinFrom ? Math.floor((f - spinFrom) / 18) % n : -1;
    return (
      <g>
        {nodes.map((nd, i) => {
          const j = (i + 1) % n;
          const t = p01(f, nodes[j].at, 14);
          if (t <= 0 || p01(f, nd.at, 10) <= 0) return null;
          const a0 = -Math.PI / 2 + ((i + 0.22) / n) * Math.PI * 2, a1 = -Math.PI / 2 + ((i + 0.78) / n) * Math.PI * 2;
          const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
          const d = reverse ? `M ${p1[0]} ${p1[1]} A ${r} ${r} 0 0 0 ${p0[0]} ${p0[1]}` : `M ${p0[0]} ${p0[1]} A ${r} ${r} 0 0 1 ${p1[0]} ${p1[1]}`;
          const end = reverse ? p0 : p1;
          const ang = (reverse ? a0 - Math.PI / 2 : a1 + Math.PI / 2) * 180 / Math.PI;
          return <g key={`a${i}`} opacity={t}><path d={d} fill="none" stroke={OUT} strokeWidth={9} strokeLinecap="round" />
            <path d="M -22 -14 L 0 0 L -22 14" transform={`translate(${end[0]} ${end[1]}) rotate(${ang})`} fill="none" stroke={OUT} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" /></g>;
        })}
        {nodes.map((nd, i) => {
          const [x, y] = pos(i);
          const t = interpolate(f, [nd.at, nd.at + 12], [0, 1], { ...clamp, easing: pop });
          if (t <= 0) return null;
          const on = active === i;
          return (
            <g key={i} transform={`translate(${x} ${y}) scale(${t * (on ? 1.12 : 1)})`}>
              <rect x={-nodeW / 2} y={-50} width={nodeW} height={100} rx={50} fill={on ? K.yellow : nd.color ?? K.white} stroke={OUT} strokeWidth={LW} />
              <text x={0} y={14} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={40} fill={OUT}>{nd.text}</text>
            </g>
          );
        })}
      </g>
    );
  };

/** Cartoon computer screen that types text (e.g. a balance changing). */
export const Screen: React.FC<{ x: number; y: number; w?: number; h?: number; lines: { text: string; at: number; color?: string; size?: number; cps?: number }[]; title?: string; at?: number }> =
  ({ x, y, w = 700, h = 460, lines, title = "MY BANK", at = 0 }) => {
    const f = useCurrentFrame();
    const t = interpolate(f, [at, at + 14], [0, 1], { ...clamp, easing: pop });
    if (t <= 0) return null;
    return (
      <g transform={`translate(${x + w / 2} ${y + h / 2}) scale(${t}) translate(${-x - w / 2} ${-y - h / 2})`}>
        <rect x={x + w / 2 - 30} y={y + h} width={60} height={70} {...card("#AEB3BC")} />
        <rect x={x + w / 2 - 140} y={y + h + 60} width={280} height={26} rx={10} {...card("#AEB3BC")} />
        <rect x={x} y={y} width={w} height={h} rx={26} {...card("#2A2F38")} />
        <rect x={x + 24} y={y + 24} width={w - 48} height={h - 48} rx={14} fill="#F4F8FB" />
        <rect x={x + 24} y={y + 24} width={w - 48} height={70} rx={14} fill={K.navy} />
        <text x={x + 54} y={y + 72} fontFamily={CF.label} fontWeight={700} fontSize={36} fill={K.white}>{title}</text>
        {lines.map((l, i) => {
          if (f < l.at) return null;
          const n = Math.floor((f - l.at) * (l.cps ?? 1.4));
          const txt = l.text.slice(0, n);
          const caret = n < l.text.length && Math.floor(f / 8) % 2 === 0 ? "|" : "";
          return <text key={i} x={x + 60} y={y + 170 + i * 90} fontFamily={CF.caption} fontWeight={800} fontSize={l.size ?? 56} fill={l.color ?? OUT}>{txt}{caret}</text>;
        })}
      </g>
    );
  };

/** Speed dial / gauge (interest rates). value 0..1 keyed over time. */
export const Dial: React.FC<{ x: number; y: number; r?: number; value: number; label?: string; left?: string; right?: string; at?: number }> =
  ({ x, y, r = 220, value, label, left = "CHEAP", right = "DEAR", at = 0 }) => {
    const f = useCurrentFrame();
    const t = interpolate(f, [at, at + 14], [0, 1], { ...clamp, easing: pop });
    if (t <= 0) return null;
    const ang = -180 + value * 180;
    const seg = (a0: number, a1: number, c: string) => {
      const p = (a: number, rr: number) => [Math.cos((a * Math.PI) / 180) * rr, Math.sin((a * Math.PI) / 180) * rr];
      const [x0, y0] = p(a0, r), [x1, y1] = p(a1, r), [x2, y2] = p(a1, r * 0.62), [x3, y3] = p(a0, r * 0.62);
      return <path d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${r * 0.62} ${r * 0.62} 0 0 0 ${x3} ${y3} Z`} fill={c} stroke={OUT} strokeWidth={LW} />;
    };
    return (
      <g transform={`translate(${x} ${y}) scale(${t})`}>
        {seg(-180, -120, K.gain)}{seg(-120, -60, K.yellow)}{seg(-60, 0, K.loss)}
        <g transform={`rotate(${ang})`}><path d={`M 0 -14 L ${r * 0.85} 0 L 0 14 Z`} fill={OUT} /></g>
        <circle cx={0} cy={0} r={26} fill={K.paper} stroke={OUT} strokeWidth={LW} />
        <text x={-r * 0.8} y={50} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={32} fill={OUT}>{left}</text>
        <text x={r * 0.8} y={50} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={32} fill={OUT}>{right}</text>
        {label && <text x={0} y={110} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={44} fill={OUT}>{label}</text>}
      </g>
    );
  };

/** Tokens (bills/coins) travelling along a straight path from a to b, staggered. */
export const Flow: React.FC<{ a: [number, number]; b: [number, number]; at: number; count?: number; every?: number; dur?: number; item?: PropName; s?: number; until?: number; arc?: number }> =
  ({ a, b, at, count = 6, every = 6, dur = 26, item = "cash", s = 0.7, until, arc = 120 }) => {
    const f = useCurrentFrame();
    if (until !== undefined && f > until) return null;
    return (
      <g>
        {Array.from({ length: count }).map((_, i) => {
          const t = (f - at - i * every) / dur;
          if (t <= 0 || t >= 1) return null;
          const e = out(t);
          const x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e - Math.sin(e * Math.PI) * arc;
          return <g key={i} transform={`translate(${x} ${y}) scale(${s}) rotate(${(rnd(i) - 0.5) * 40})`} opacity={Math.min(1, (1 - t) * 6)}><Prop name={item} /></g>;
        })}
      </g>
    );
  };

/** Big chapter / title card in screen centre. */
export const TitleCard: React.FC<{ x: number; y: number; kicker?: string; title: string; at?: number; size?: number; color?: string; w?: number }> =
  ({ x, y, kicker, title, at = 0, size = 96, color = K.yellow, w = 1500 }) => {
    const f = useCurrentFrame();
    const t = interpolate(f, [at, at + 16], [0, 1], { ...clamp, easing: pop });
    if (t <= 0) return null;
    const lines = title.split("\n");
    const h = lines.length * size * 1.1 + (kicker ? 120 : 70);
    return (
      <g transform={`translate(${x} ${y}) scale(${t}) rotate(${-2 + Math.sin(f / 30) * 0.6})`}>
        <rect x={-w / 2 + 14} y={-h / 2 + 18} width={w} height={h} rx={34} fill={OUT} />
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={34} fill={color} stroke={OUT} strokeWidth={LW + 2} />
        {kicker && <text x={0} y={-h / 2 + 78} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={42} fill={OUT} opacity={0.75}>{kicker}</text>}
        {lines.map((l, i) => <text key={i} x={0} y={-h / 2 + (kicker ? 110 : 40) + size * 0.95 + i * size * 1.1} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={size} fill={OUT}>{l}</text>)}
      </g>
    );
  };

/** Coin/bill burst (celebration or money appearing). */
export const Burst: React.FC<{ x: number; y: number; at: number; n?: number; item?: PropName; spread?: number }> = ({ x, y, at, n = 14, item = "coin", spread = 420 }) => {
  const f = useCurrentFrame();
  const t = (f - at) / 40;
  if (t <= 0 || t >= 1) return null;
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const a = rnd(i) * Math.PI * 2, v = 0.5 + rnd(i + 7) * 0.5;
        const px = x + Math.cos(a) * spread * v * out(t), py = y + Math.sin(a) * spread * v * out(t) + 400 * t * t;
        return <g key={i} transform={`translate(${px} ${py}) scale(${0.6}) rotate(${t * 360 * (rnd(i + 3) - 0.5)})`} opacity={1 - t}><Prop name={item} /></g>;
      })}
    </g>
  );
};
