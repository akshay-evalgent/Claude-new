import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CF, K, LW, OUT, clamp, out, p01, pop } from "./style";
import type { Word } from "../engine";

// ---------------------------------------------------------------- world-space (inside a Stage svg)

/** Text that pops in at frame `at` (and optionally out at `until`). */
export const PopText: React.FC<{
  x: number; y: number; at?: number; until?: number; text: string; size?: number; color?: string; stroke?: string;
  font?: "label" | "caption" | "hand"; pill?: string; rot?: number; anchor?: "middle" | "start" | "end"; weight?: number; wiggle?: boolean;
}> = ({ x, y, at = 0, until, text, size = 64, color = OUT, stroke, font = "label", pill, rot = 0, anchor = "middle", weight = 700, wiggle }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 12], [0, 1], { ...clamp, easing: pop });
  const o = until === undefined ? 1 : interpolate(f, [until, until + 8], [1, 0], clamp);
  if (t <= 0 || o <= 0) return null;
  const w = text.length * size * (font === "caption" ? 0.7 : font === "hand" ? 0.5 : 0.63) + size * 0.9;
  const ro = rot + (wiggle ? Math.sin(f / 6) * 2 : 0);
  return (
    <g transform={`translate(${x} ${y}) rotate(${ro}) scale(${t})`} opacity={o}>
      {pill && <rect x={anchor === "middle" ? -w / 2 : anchor === "start" ? -size * 0.45 : -w + size * 0.45} y={-size * 0.82} width={w} height={size * 1.32} rx={size * 0.3} fill={pill} stroke={OUT} strokeWidth={LW} />}
      <text x={0} y={0} textAnchor={anchor} fontFamily={CF[font]} fontWeight={weight} fontSize={size} fill={color}
        stroke={stroke} strokeWidth={stroke ? size * 0.14 : 0} paintOrder="stroke" strokeLinejoin="round">{text}</text>
    </g>
  );
};

/** Speech / thought bubble. (x,y) is the tail tip. */
export const Bubble: React.FC<{
  x: number; y: number; at?: number; until?: number; text: string; w?: number; size?: number; side?: "left" | "right"; think?: boolean; color?: string;
}> = ({ x, y, at = 0, until, text, w = 420, size = 40, side = "right", think, color = K.white }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 12], [0, 1], { ...clamp, easing: pop });
  const o = until === undefined ? 1 : interpolate(f, [until, until + 8], [1, 0], clamp);
  if (t <= 0 || o <= 0) return null;
  const lines = wrap(text, Math.max(8, Math.floor(w / (size * 0.52))));
  const h = lines.length * size * 1.18 + size * 0.9;
  const bx = side === "right" ? 30 : -w - 30, by = -h - 70;
  return (
    <g transform={`translate(${x} ${y}) scale(${t})`} opacity={o}>
      {think ? (<><circle cx={side === "right" ? 14 : -14} cy={-22} r={9} fill={color} stroke={OUT} strokeWidth={LW} /><circle cx={side === "right" ? 30 : -30} cy={-50} r={14} fill={color} stroke={OUT} strokeWidth={LW} /></>)
        : <path d={side === "right" ? `M 0 0 L 50 -84 L 130 -84 Z` : `M 0 0 L -50 -84 L -130 -84 Z`} fill={color} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />}
      <rect x={bx} y={by} width={w} height={h} rx={think ? h / 2.2 : 28} fill={color} stroke={OUT} strokeWidth={LW} />
      {!think && <path d={side === "right" ? `M 54 -72 L 126 -72` : `M -54 -72 L -126 -72`} stroke={color} strokeWidth={10} fill="none" />}
      {lines.map((l, i) => (
        <text key={i} x={bx + w / 2} y={by + size * 1.1 + i * size * 1.18} textAnchor="middle" fontFamily={CF.label} fontWeight={600} fontSize={size} fill={OUT}>{l}</text>
      ))}
    </g>
  );
};

export function wrap(text: string, n: number): string[] {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) lines.push(cur);
  return lines;
}

/** Animated arrow drawn from a to b (quadratic curve with bend). */
export const Arrow: React.FC<{ a: [number, number]; b: [number, number]; at?: number; dur?: number; bend?: number; color?: string; w?: number; dashed?: boolean; until?: number }> =
  ({ a, b, at = 0, dur = 14, bend = 0.2, color = OUT, w = 9, dashed, until }) => {
    const f = useCurrentFrame();
    const t = p01(f, at, dur);
    const o = until === undefined ? 1 : interpolate(f, [until, until + 8], [1, 0], clamp);
    if (t <= 0 || o <= 0) return null;
    const mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * bend, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * bend;
    const d = `M ${a[0]} ${a[1]} Q ${mx} ${my} ${b[0]} ${b[1]}`;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.15;
    const ang = Math.atan2(b[1] - my, b[0] - mx) * 180 / Math.PI;
    return (
      <g opacity={o}>
        <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={dashed ? `${w * 2} ${w * 1.6}` : `${len} ${len}`} strokeDashoffset={dashed ? -f * 2 : len * (1 - t)} opacity={dashed ? t : 1} />
        {t > 0.92 && <path d="M -26 -16 L 0 0 L -26 16" transform={`translate(${b[0]} ${b[1]}) rotate(${ang})`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />}
      </g>
    );
  };

/** Rubber stamp that slams in. */
export const Stamp: React.FC<{ x: number; y: number; at?: number; text: string; color?: string; size?: number; rot?: number }> = ({ x, y, at = 0, text, color = K.loss, size = 80, rot = -10 }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 6], [2.2, 1], { ...clamp, easing: out });
  const o = interpolate(f, [at, at + 3], [0, 1], clamp);
  if (o <= 0) return null;
  const w = text.length * size * 0.62 + size * 0.8;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${t})`} opacity={o}>
      <rect x={-w / 2} y={-size * 0.85} width={w} height={size * 1.25} rx={12} fill="rgba(255,255,255,0.85)" stroke={color} strokeWidth={size * 0.1} />
      <text x={0} y={size * 0.1} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={size} fill={color}>{text}</text>
    </g>
  );
};

/** Number that counts from `from` to `to` between frames a and b. */
export const Count: React.FC<{ x: number; y: number; a: number; b: number; from?: number; to: number; prefix?: string; suffix?: string; decimals?: number; size?: number; color?: string; stroke?: string; font?: "label" | "caption" }> =
  ({ x, y, a, b, from = 0, to, prefix = "", suffix = "", decimals = 0, size = 120, color = OUT, stroke, font = "caption" }) => {
    const f = useCurrentFrame();
    if (f < a - 2) return null;
    const v = interpolate(f, [a, b], [from, to], { ...clamp, easing: out });
    const s = interpolate(f, [a, a + 10], [0.6, 1], { ...clamp, easing: pop });
    const txt = prefix + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    return (
      <text x={x} y={y} transform={`translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`} textAnchor="middle" fontFamily={CF[font]} fontWeight={900} fontSize={size} fill={color}
        stroke={stroke} strokeWidth={stroke ? size * 0.12 : 0} paintOrder="stroke" strokeLinejoin="round">{txt}</text>
    );
  };

/** Pop-in group with optional out. */
export const PopIn: React.FC<{ at?: number; until?: number; x?: number; y?: number; s?: number; children: React.ReactNode; from?: "pop" | "up" | "left" | "right" }> = ({ at = 0, until, x = 0, y = 0, s = 1, children, from = "pop" }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 14], [0, 1], { ...clamp, easing: from === "pop" ? pop : out });
  const o = until === undefined ? 1 : interpolate(f, [until, until + 8], [1, 0], clamp);
  if (t <= 0 || o <= 0) return null;
  const dx = from === "left" ? (1 - t) * -400 : from === "right" ? (1 - t) * 400 : 0;
  const dy = from === "up" ? (1 - t) * 300 : 0;
  const sc = from === "pop" ? t : 1;
  return <g transform={`translate(${x + dx} ${y + dy}) scale(${s * sc})`} opacity={from === "pop" ? o : o * Math.min(1, t * 2)}>{children}</g>;
};

// ---------------------------------------------------------------- screen-space (HTML overlays)

/** Shorts captions: 1–3 word chunks, current word highlighted and popped. */
export const Captions: React.FC<{ words: Word[]; y?: number; size?: number; maxWords?: number; color?: string; hi?: string; hide?: [number, number][] }> =
  ({ words, y = 0.62, size = 92, maxWords = 3, color = "#FFFFFF", hi = K.yellow, hide = [] }) => {
    const f = useCurrentFrame();
    const { width, height } = useVideoConfig();
    if (hide.some(([a, b]) => f >= a && f <= b)) return null;
    const real = words.filter((w) => /[a-z0-9$%]/i.test(w.w));
    // chunking
    const chunks: Word[][] = []; let cur: Word[] = [];
    words.forEach((w, i) => {
      if (/[a-z0-9$%]/i.test(w.w)) cur.push(w);
      const punct = !/[a-z0-9$%]/i.test(w.w) || /[.,?!]$/.test(w.w);
      const gap = words[i + 1] && words[i + 1].f0 - w.f1 > 8;
      if (cur.length && (cur.length >= maxWords || punct || gap)) { chunks.push(cur); cur = []; }
    });
    if (cur.length) chunks.push(cur);
    const ch = chunks.find((c) => f >= c[0].f0 - 2 && f <= (c[c.length - 1].f1 + 6));
    if (!ch || !real.length) return null;
    const enter = interpolate(f, [ch[0].f0 - 2, ch[0].f0 + 3], [0.85, 1], { ...clamp, easing: pop });
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: width * 0.06, right: width * 0.06, top: height * y, transform: `translateY(-50%) scale(${enter})`, textAlign: "center", lineHeight: 1.08 }}>
          {ch.map((w, i) => {
            const on = f >= w.f0 && f <= w.f1 + 3;
            const txt = w.w.toUpperCase();
            return (
              <span key={i} style={{
                display: "inline-block", margin: `0 ${size * 0.2}px`, fontFamily: CF.caption, fontWeight: 900, fontSize: size,
                color: on ? hi : color, WebkitTextStroke: `${size * 0.11}px ${OUT}`, paintOrder: "stroke fill",
                textShadow: `0 ${size * 0.06}px 0 ${OUT}`, transform: on ? "scale(1.08) rotate(-1deg)" : "none",
              }}>{txt}</span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  };

/** Persistent headline band for Shorts (top of frame). */
export const Headline: React.FC<{ text: string; at?: number; until?: number; size?: number; bg?: string; color?: string }> = ({ text, at = 0, until, size = 64, bg = K.white, color = OUT }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = interpolate(f, [at, at + 10], [0, 1], { ...clamp, easing: pop });
  const o = until === undefined ? 1 : interpolate(f, [until, until + 8], [1, 0], clamp);
  if (t <= 0 || o <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: height * 0.085, left: width * 0.07, right: width * 0.07, display: "flex", justifyContent: "center", opacity: o }}>
        <div style={{ background: bg, border: `${LW + 2}px solid ${OUT}`, borderRadius: 26, padding: `${size * 0.25}px ${size * 0.45}px`, transform: `scale(${t}) rotate(-1.5deg)`,
          fontFamily: CF.caption, fontWeight: 900, fontSize: size, color, textAlign: "center", lineHeight: 1.05, boxShadow: `0 10px 0 ${OUT}` }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};

/** A simple full-screen flash (cut accent). */
export const Flash: React.FC<{ at: number; color?: string; dur?: number }> = ({ at, color = "#FFFFFF", dur = 6 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 1, at + dur], [0, 0.8, 0], clamp);
  return o > 0 ? <AbsoluteFill style={{ background: color, opacity: o }} /> : null;
};
