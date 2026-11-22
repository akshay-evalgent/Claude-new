// Cartoon line chart on a paper card (SVG, world space inside a Stage).
import React from "react";
import { useCurrentFrame } from "remotion";
import { CF, K, LW, OUT, p01, smooth } from "./style";

export type Series = { pts: [number, number][]; color: string; label?: string; at: number; dur?: number; w?: number; endLabel?: string };

export const CChart: React.FC<{
  x: number; y: number; w: number; h: number; xMax: number; yMax: number; series: Series[];
  fill?: { a: number; b: number; color: string; at: number; label?: string }[]; xLabel?: (v: number) => string; xTicks?: number[];
  yTicks?: number[]; yFmt?: (v: number) => string; title?: string; at?: number; card?: boolean;
}> = ({ x, y, w, h, xMax, yMax, series, fill = [], xTicks = [], yTicks = [], yFmt = (v) => String(v), xLabel = (v) => String(v), title, at = 0, card = true }) => {
  const f = useCurrentFrame();
  const appear = p01(f, at, 12);
  if (appear <= 0) return null;
  const pad = { l: 120, r: 190, t: title ? 110 : 50, b: 80 };
  const X = (v: number) => x + pad.l + (v / xMax) * (w - pad.l - pad.r);
  const Y = (v: number) => y + h - pad.b - (v / yMax) * (h - pad.t - pad.b);
  const prog = (s: Series) => p01(f, s.at, s.dur ?? 45, smooth);
  const cut = (pts: [number, number][], t: number) => {
    const xm = pts[0][0] + (pts[pts.length - 1][0] - pts[0][0]) * t;
    const out: [number, number][] = [];
    for (let i = 0; i < pts.length; i++) {
      if (pts[i][0] <= xm) out.push(pts[i]);
      else { const p = pts[i - 1], q = pts[i]; const u = (xm - p[0]) / (q[0] - p[0]); out.push([xm, p[1] + (q[1] - p[1]) * u]); break; }
    }
    return out;
  };
  const path = (pts: [number, number][]) => pts.map((p, i) => `${i ? "L" : "M"} ${X(p[0])} ${Y(p[1])}`).join(" ");
  return (
    <g opacity={appear} transform={`translate(0 ${(1 - appear) * 30})`}>
      {card && <rect x={x} y={y} width={w} height={h} rx={28} fill={K.paper} stroke={OUT} strokeWidth={LW} />}
      {title && <text x={x + pad.l - 40} y={y + 70} fontFamily={CF.label} fontWeight={700} fontSize={42} fill={OUT}>{title}</text>}
      {yTicks.map((v) => <g key={v}><path d={`M ${X(0)} ${Y(v)} L ${X(xMax)} ${Y(v)}`} stroke={OUT} strokeOpacity={0.12} strokeWidth={3} strokeDasharray="10 10" />
        <text x={X(0) - 18} y={Y(v) + 12} textAnchor="end" fontFamily={CF.label} fontWeight={600} fontSize={30} fill={OUT} opacity={0.7}>{yFmt(v)}</text></g>)}
      {xTicks.map((v) => <text key={v} x={X(v)} y={Y(0) + 50} textAnchor="middle" fontFamily={CF.label} fontWeight={600} fontSize={30} fill={OUT} opacity={0.7}>{xLabel(v)}</text>)}
      {fill.map((fl, i) => {
        const t = p01(f, fl.at, 20);
        if (t <= 0) return null;
        const A = series[fl.a].pts, B = series[fl.b].pts;
        const d = path(A) + " " + [...B].reverse().map((p) => `L ${X(p[0])} ${Y(p[1])}`).join(" ") + " Z";
        const k = Math.floor(A.length * 0.72), ex = A[k], ey = (A[k][1] + B[k][1]) / 2;
        return <g key={i}><path d={d} fill={fl.color} opacity={0.35 * t} />
          {fl.label && <text x={X(ex[0]) - 40} y={Y(ey) - 70} textAnchor="end" fontFamily={CF.caption} fontWeight={900} fontSize={44} fill={fl.color} opacity={t}>{fl.label}</text>}</g>;
      })}
      <path d={`M ${X(0)} ${Y(yMax)} L ${X(0)} ${Y(0)} L ${X(xMax)} ${Y(0)}`} fill="none" stroke={OUT} strokeWidth={LW + 1} strokeLinecap="round" strokeLinejoin="round" />
      {series.map((s, i) => {
        const t = prog(s);
        if (t <= 0) return null;
        const pts = cut(s.pts, t);
        const last = pts[pts.length - 1];
        return (
          <g key={i}>
            <path d={path(pts)} fill="none" stroke={OUT} strokeWidth={(s.w ?? 10) + 6} strokeLinecap="round" strokeLinejoin="round" />
            <path d={path(pts)} fill="none" stroke={s.color} strokeWidth={s.w ?? 10} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={X(last[0])} cy={Y(last[1])} r={14} fill={s.color} stroke={OUT} strokeWidth={LW} />
            {s.label && t > 0.1 && <text x={X(last[0]) + 26} y={Y(last[1]) + 12} fontFamily={CF.label} fontWeight={700} fontSize={36} fill={s.color} stroke={OUT} strokeWidth={0}>{s.label}</text>}
            {s.endLabel && t >= 1 && <text x={X(last[0]) + 26} y={Y(last[1]) + 52} fontFamily={CF.label} fontWeight={600} fontSize={30} fill={OUT}>{s.endLabel}</text>}
          </g>
        );
      })}
    </g>
  );
};

/** Compound growth curve sampled yearly. */
export const growth = (P: number, r: number, years: number): [number, number][] =>
  Array.from({ length: years + 1 }, (_, t) => [t, P * Math.pow(1 + r, t)] as [number, number]);
