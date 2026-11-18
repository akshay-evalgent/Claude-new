import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, ease, easeInOut, font, fmtInt, prog, rand, sec, SAFE, tone, Tone } from "../theme";
import { Frame } from "./Frame";
import { Tag } from "./Cards";
import { Counter, Rise } from "./Text";

// ---------------------------------------------------------------- Line chart
export type Point = [string, number]; // [ISO date, value]
export type Series = { id: string; points: Point[]; tone?: Tone; width?: number; label?: string; delay?: number; drawFor?: number };
export type Annotation =
  | { kind: "marker"; date: string; label: string; tone?: Tone }               // vertical line, appears when the line reaches it
  | { kind: "bracket"; from: string; to: string; label: string; tone?: Tone }   // drop or rise between two dates
  | { kind: "level"; value: number; label: string; tone?: Tone };               // horizontal line
export type LineChartProps = {
  series: Series[];
  from: string; to: string;
  yMin?: number; yMax?: number; yTicks?: number[]; log?: boolean;
  drawFor?: number;            // seconds to draw the main line; default 70% of the shot
  title?: string; subtitle?: string;
  annotations?: Annotation[];
  illustrative?: string;       // shows an ILLUSTRATIVE tag and this note
  source?: string;
  style?: "ink" | "chalk";
  holdFrom?: string;           // start with the line already drawn up to this date
  drawTo?: string;             // stop drawing at this date (default: the end of the range)
};

const t = (d: string) => Date.parse(d + "T00:00:00Z");

export const LineChart: React.FC<LineChartProps> = (p) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const chalk = p.style === "chalk";
  const hasBracket = (p.annotations ?? []).some((a) => a.kind === "bracket");
  const box = { x: SAFE.x + 110, y: SAFE.y + 170, w: 1920 - 2 * SAFE.x - 170 - (hasBracket ? 230 : 0), h: 1080 - 2 * SAFE.y - 280 };
  const t0 = t(p.from), t1 = t(p.to);

  const allVals = p.series.flatMap((s) => s.points.filter(([d]) => t(d) >= t0 && t(d) <= t1).map(([, v]) => v));
  const yMin = p.yMin ?? Math.min(...allVals) * 0.95;
  const yMax = p.yMax ?? Math.max(...allVals) * 1.05;
  const fy = (v: number) => p.log
    ? box.y + box.h - ((Math.log(v) - Math.log(yMin)) / (Math.log(yMax) - Math.log(yMin))) * box.h
    : box.y + box.h - ((v - yMin) / (yMax - yMin)) * box.h;
  const fx = (ms: number) => box.x + ((ms - t0) / (t1 - t0)) * box.w;

  const drawFrames = sec(p.drawFor ?? (durationInFrames / 30) * 0.7);
  const head = (s: Series) => {
    const start = sec(s.delay ?? 0.3);
    const dur = Math.max(1, s.drawFor ? sec(s.drawFor) : drawFrames);
    const holdMs = p.holdFrom ? t(p.holdFrom) : t0;
    const endMs = p.drawTo ? t(p.drawTo) : t1;
    const pr = interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
    return holdMs + (endMs - holdMs) * pr;
  };

  const paths = useMemo(() => p.series.map((s) => s.points.filter(([d]) => t(d) >= t0 && t(d) <= t1).map(([d, v]) => [fx(t(d)), fy(v), t(d)] as const)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.series, p.from, p.to, yMin, yMax]);

  // x ticks: years for long ranges, months for short
  const spanDays = (t1 - t0) / 864e5;
  const ticks: { ms: number; label: string }[] = [];
  const d0 = new Date(t0);
  if (spanDays > 900) {
    for (let y = d0.getUTCFullYear() + 1; t(`${y}-01-01`) <= t1; y++) ticks.push({ ms: t(`${y}-01-01`), label: String(y) });
  } else if (spanDays > 420) {
    const Q = ["JAN", "APR", "JUL", "OCT"];
    for (let m = new Date(Date.UTC(d0.getUTCFullYear(), Math.floor(d0.getUTCMonth() / 3) * 3 + 3, 1)); m.getTime() <= t1; m.setUTCMonth(m.getUTCMonth() + 3))
      ticks.push({ ms: m.getTime(), label: m.getUTCMonth() === 0 ? String(m.getUTCFullYear()) : Q[m.getUTCMonth() / 3] });
  } else {
    const M = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    for (let m = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); m.getTime() <= t1; m.setUTCMonth(m.getUTCMonth() + 1))
      ticks.push({ ms: m.getTime(), label: M[m.getUTCMonth()] + (m.getUTCMonth() === 0 ? " " + m.getUTCFullYear() : "") });
  }
  const yTicks = p.yTicks ?? [];
  const ink = chalk ? C.chalk : C.paper;
  const grid = chalk ? "rgba(232,229,218,0.18)" : C.line;
  const axisOpacity = prog(frame, 0, 20);

  const valueAt = (pts: readonly (readonly [number, number, number])[], ms: number) => {
    for (let i = 1; i < pts.length; i++) if (pts[i][2] >= ms) {
      const a = pts[i - 1], b = pts[i]; const k = (ms - a[2]) / (b[2] - a[2] || 1);
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k] as const;
    }
    return [pts[pts.length - 1][0], pts[pts.length - 1][1]] as const;
  };

  return (
    <Frame ground={chalk ? "board" : "ink"}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <filter id="chalk">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="3" />
          </filter>
          <filter id="glow"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <g opacity={axisOpacity} filter={chalk ? "url(#chalk)" : undefined}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={box.x} x2={box.x + box.w} y1={fy(v)} y2={fy(v)} stroke={grid} strokeWidth={1} strokeDasharray={chalk ? "8 10" : "2 8"} />
              <text x={box.x - 22} y={fy(v) + 8} textAnchor="end" fill={chalk ? C.chalk : C.muted} fontFamily={font("mono")} fontSize={22}>{fmtInt(v)}</text>
            </g>
          ))}
          <line x1={box.x} x2={box.x + box.w} y1={box.y + box.h} y2={box.y + box.h} stroke={chalk ? C.chalk : C.line} strokeWidth={2} />
          {ticks.map((k) => (
            <g key={k.ms}>
              <line x1={fx(k.ms)} x2={fx(k.ms)} y1={box.y + box.h} y2={box.y + box.h + 10} stroke={chalk ? C.chalk : C.line} strokeWidth={2} />
              <text x={fx(k.ms)} y={box.y + box.h + 42} textAnchor="middle" fill={chalk ? C.chalk : C.muted} fontFamily={font("mono")} fontSize={22}>{k.label}</text>
            </g>
          ))}
        </g>
        {(p.annotations ?? []).filter((a) => a.kind === "level").map((a, i) => a.kind === "level" && (
          <g key={`l${i}`} opacity={prog(frame, sec(0.6), 20)}>
            <line x1={box.x} x2={box.x + box.w} y1={fy(a.value)} y2={fy(a.value)} stroke={tone(a.tone, C.ochre)} strokeWidth={3} strokeDasharray="14 10" />
            <text x={box.x + 12} y={fy(a.value) - 16} textAnchor="start" fill={tone(a.tone, C.ochre)} fontFamily={font("mono")} fontWeight={600} fontSize={24}>{a.label}</text>
          </g>
        ))}
        {p.series.map((s, si) => {
          const pts = paths[si];
          const h = head(s);
          const vis = pts.filter((q) => q[2] <= h);
          if (!vis.length) return null;
          const [hx, hy] = valueAt(pts, h);
          const d = "M" + vis.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join("L") + `L${hx.toFixed(1)},${hy.toFixed(1)}`;
          const col = chalk ? C.chalk : tone(s.tone);
          const drawing = h < (p.drawTo ? t(p.drawTo) : t1) - 1;
          return (
            <g key={s.id}>
              {!chalk ? <path d={d} fill="none" stroke={col} strokeWidth={(s.width ?? 4) * 3} opacity={0.18} filter="url(#glow)" /> : null}
              <path d={d} fill="none" stroke={col} strokeWidth={s.width ?? (chalk ? 6 : 4)} strokeLinejoin="round" strokeLinecap="round" filter={chalk ? "url(#chalk)" : undefined} />
              <circle cx={hx} cy={hy} r={drawing ? 9 : 7} fill={col} />
              {drawing && !chalk ? <circle cx={hx} cy={hy} r={18 + (frame % 20)} fill="none" stroke={col} opacity={1 - (frame % 20) / 20} /> : null}
              {s.label && !drawing ? (
                <text x={hx + 18} y={hy + 8} fill={col} fontFamily={font("mono")} fontWeight={600} fontSize={26} opacity={prog(frame, 0, 1)}>{s.label}</text>
              ) : null}
            </g>
          );
        })}
        {(p.annotations ?? []).map((a, i) => {
          const main = paths[0];
          const mi = (p.annotations ?? []).slice(0, i).filter((x) => x.kind === "marker").length;
          const h = head(p.series[0]);
          if (a.kind === "marker") {
            const ms = t(a.date);
            if (h < ms) return null;
            const reach = paths[0].find((q) => q[2] >= ms);
            const at = reach ? frame - 0 : frame;
            const [mx, my] = valueAt(main, ms);
            const o = Math.min(1, (h - ms) / ((t1 - t0) * 0.03) + 0.2);
            return (
              <g key={i} opacity={o}>
                <line x1={mx} x2={mx} y1={box.y - 10} y2={box.y + box.h} stroke={tone(a.tone, C.paper)} strokeWidth={1.5} strokeDasharray="4 6" opacity={0.7} />
                <circle cx={mx} cy={my} r={8} fill="none" stroke={tone(a.tone, C.paper)} strokeWidth={3} />
                <text x={mx + (mx > box.x + box.w * 0.75 ? -14 : 14)} y={box.y - 20 + mi * 34} textAnchor={mx > box.x + box.w * 0.75 ? "end" : "start"} fill={tone(a.tone, C.paper)} fontFamily={font("mono")} fontWeight={600} fontSize={24}>{a.label}</text>
                {void at}
              </g>
            );
          }
          if (a.kind === "bracket") {
            const ms = t(a.to);
            if (h < ms) return null;
            const [x0, y0] = valueAt(main, t(a.from));
            const [x1, y1] = valueAt(main, ms);
            const bx = Math.max(x0, x1) + 46;
            const o = Math.min(1, (h - ms) / ((t1 - t0) * 0.04) + 0.15);
            const col = tone(a.tone, y1 > y0 ? C.loss : C.gain);
            return (
              <g key={i} opacity={o}>
                <line x1={x0} x2={bx} y1={y0} y2={y0} stroke={col} strokeWidth={1.5} strokeDasharray="3 5" />
                <line x1={x1} x2={bx} y1={y1} y2={y1} stroke={col} strokeWidth={1.5} strokeDasharray="3 5" />
                <path d={`M${bx - 10},${y0}H${bx}V${y1}H${bx - 10}`} fill="none" stroke={col} strokeWidth={3} />
                <text x={bx + 18} y={(y0 + y1) / 2 + 22} fill={col} fontFamily={font("display")} fontWeight={700} fontSize={64}>{a.label}</text>
              </g>
            );
          }
          return null;
        })}
      </svg>
      {p.title ? (
        <div style={{ position: "absolute", left: box.x, top: SAFE.y - 10 }}>
          <Rise at={0} style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 52, color: ink, letterSpacing: 2 }}>{p.title}</Rise>
          {p.subtitle ? <Rise at={6} style={{ fontFamily: font("mono"), fontSize: 22, color: chalk ? C.chalk : C.muted, marginTop: 6, letterSpacing: 1 }}>{p.subtitle}</Rise> : null}
        </div>
      ) : null}
      {p.illustrative ? (
        <>
          <Tag text="ILLUSTRATIVE" corner="tr" />
          <div style={{ position: "absolute", right: SAFE.x - 60, top: SAFE.y + 32, fontFamily: font("mono"), fontSize: 20, color: C.muted, textAlign: "right", maxWidth: 520 }}>{p.illustrative}</div>
        </>
      ) : null}
      {p.source ? <div style={{ position: "absolute", left: SAFE.x, bottom: SAFE.y - 50, fontFamily: font("mono"), fontSize: 20, color: chalk ? C.chalk : C.muted, opacity: 0.8 }}>{p.source}</div> : null}
    </Frame>
  );
};

// ---------------------------------------------------------------- Compare bars
export type Bar = { label: string; value: number; tone?: Tone; prefix?: string; suffix?: string; decimals?: number };
export type CompareBarsProps = { bars: Bar[]; fit: number; title?: string; subtitle?: string; source?: string };

/** Horizontal bars scaled so that `fit` fills the width. Bigger values run off the frame. */
export const CompareBars: React.FC<CompareBarsProps> = ({ bars, fit, title, subtitle, source }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const x0 = SAFE.x + 20;
  const full = 1920 - x0 - SAFE.x - 260;
  const offAt = (v: number) => v / fit > (1920 - x0 + 40) / full;
  const grow = Math.min(sec(4), Math.max(sec(1.5), durationInFrames - sec(1.6)));  // land early, then hold the real numbers
  return (
    <Frame>
      {title ? (
        <div style={{ position: "absolute", left: x0, top: SAFE.y }}>
          <Rise style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 52, color: C.paper, letterSpacing: 2 }}>{title}</Rise>
          {subtitle ? <Rise at={6} style={{ fontFamily: font("mono"), fontSize: 22, color: C.muted, marginTop: 6 }}>{subtitle}</Rise> : null}
        </div>
      ) : null}
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: x0, gap: 70 }}>
        {bars.map((b, i) => {
          const at = sec(0.5) + i * 6;
          const pr = interpolate(frame, [at, at + grow], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
          const w = (b.value / fit) * full * pr;
          const off = offAt(b.value) && w > full;
          const col = tone(b.tone);
          return (
            <div key={i} style={{ position: "relative", height: 150 }}>
              <div style={{ fontFamily: font("mono"), fontSize: 28, color: C.muted, letterSpacing: 2, marginBottom: 14, opacity: prog(frame, at - 6, 12) }}>{b.label}</div>
              <div style={{ position: "absolute", top: 54, left: 0, height: 60, width: Math.max(4, w), background: col, opacity: 0.92 }} />
              <div style={{ position: "absolute", top: off ? -52 : 44, ...(off ? { right: SAFE.x } : { left: w + 24 }), fontFamily: font("display"), fontWeight: 700, fontSize: 72, color: col, whiteSpace: "nowrap" }}>
                <Counter from={0} to={b.value} at={at} dur={grow} prefix={b.prefix} suffix={b.suffix} decimals={b.decimals} />
                {off ? <span style={{ fontSize: 44, marginLeft: 12 }}>→</span> : null}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      {source ? <div style={{ position: "absolute", left: SAFE.x, bottom: SAFE.y - 50, fontFamily: font("mono"), fontSize: 20, color: C.muted }}>{source}</div> : null}
    </Frame>
  );
};

// ---------------------------------------------------------------- Rank list
export type RankListProps = {
  mode: "scrollTo" | "climb";   // scroll down a list to rank N, or our row climbs from the bottom to rank N
  total: number;
  rank: number;
  label: string;                // our row's name
  value?: string;               // our row's value, e.g. "$2.2B" or "+357%"
  title?: string;
  source?: string;
  tone?: Tone;
  showTotal?: boolean;          // show "rank / total" (off when the total is not known)
};

export const RankList: React.FC<RankListProps> = ({ mode, total, rank, label, value, title, source, tone: tn, showTotal = true }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const rowH = 78;
  const startRank = mode === "climb" ? total : 1;
  const travel = interpolate(frame, [sec(0.4), durationInFrames - sec(1.2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const cur = mode === "climb" ? startRank + (rank - startRank) * travel : Math.max(5, startRank + (rank - startRank) * travel);
  const centreY = 560;
  const visible: number[] = [];
  for (let r = Math.floor(cur) - 7; r <= Math.ceil(cur) + 7; r++) if (r >= 1 && r <= total) visible.push(r);
  const col = tone(tn, C.ochre);
  const arrived = travel >= 1;
  return (
    <Frame>
      <div style={{ position: "absolute", left: 360, right: 360, top: 0, bottom: 0, overflow: "hidden", maskImage: "linear-gradient(transparent 6%, black 30%, black 72%, transparent 94%)" }}>
        {visible.map((r) => {
          const ours = mode === "scrollTo" && r === rank;
          const y = centreY + (r - cur) * rowH;
          return (
            <div key={r} style={{ position: "absolute", left: 0, right: 0, top: y - rowH / 2, height: rowH - 14, display: "flex", alignItems: "center", gap: 30, padding: "0 28px",
              border: ours ? `3px solid ${col}` : `1px solid ${C.line}`, background: ours ? "rgba(196,146,63,0.08)" : "transparent" }}>
              <div style={{ fontFamily: font("mono"), fontSize: 28, color: ours ? col : C.muted, width: 110 }}>#{fmtInt(r)}</div>
              {ours ? <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 40, color: C.paper }}>{label}</div>
                : <div style={{ height: 16, width: `${30 + rand(r) * 40}%`, background: C.slate, borderRadius: 3 }} />}
              {ours && value ? <div style={{ marginLeft: "auto", fontFamily: font("mono"), fontWeight: 600, fontSize: 34, color: col }}>{value}</div> : null}
            </div>
          );
        })}
        {mode === "climb" ? (
          <div style={{ position: "absolute", left: 0, right: 0, top: centreY - rowH / 2, height: rowH - 14, display: "flex", alignItems: "center", gap: 30, padding: "0 28px",
            border: `3px solid ${col}`, background: C.ink2, boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
            <div style={{ fontFamily: font("mono"), fontSize: 28, color: col, width: 110 }}>#{fmtInt(Math.round(cur))}</div>
            <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 40, color: C.paper }}>{label}</div>
            {value ? <div style={{ marginLeft: "auto", fontFamily: font("mono"), fontWeight: 600, fontSize: 34, color: col }}>{value}</div> : null}
          </div>
        ) : null}
      </div>
      {title ? <Rise style={{ position: "absolute", left: 360, top: SAFE.y - 20, fontFamily: font("display"), fontWeight: 700, fontSize: 48, color: C.paper, letterSpacing: 2 }}>{title}</Rise> : null}
      <div style={{ position: "absolute", right: 360, top: SAFE.y - 6, fontFamily: font("mono"), fontSize: 26, color: arrived ? col : C.muted }}>
        {showTotal ? `${fmtInt(Math.round(cur))} / ${fmtInt(total)}` : `#${fmtInt(Math.round(cur))}`}
      </div>
      {source ? <div style={{ position: "absolute", left: SAFE.x, bottom: SAFE.y - 50, fontFamily: font("mono"), fontSize: 20, color: C.muted }}>{source}</div> : null}
    </Frame>
  );
};
