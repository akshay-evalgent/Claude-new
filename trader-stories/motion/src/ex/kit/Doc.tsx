// Documentary kit (format 1): photographic stills with slow camera moves, in the trader-stories film look.
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, font } from "../../theme";
import { clamp, out, pop, rnd } from "./style";

export type Move = "in" | "out" | "left" | "right" | "up" | "down";

/** One still with a Ken Burns move. `from`/`to` are frames within the parent sequence. */
export const Photo: React.FC<{ src: string; move?: Move; from?: number; to?: number; strength?: number; fadeIn?: number; tint?: string }> =
  ({ src, move = "in", from = 0, to, strength = 1, fadeIn = 0, tint }) => {
    const f = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const end = to ?? durationInFrames;
    const t = interpolate(f, [from, end], [0, 1], clamp);
    const k = 0.08 * strength;
    const s = move === "out" ? 1 + k * (1 - t) + 0.04 : 1.04 + (move === "in" ? k * t : 0.04);
    const dx = move === "left" ? (0.5 - t) * 70 * strength : move === "right" ? (t - 0.5) * 70 * strength : 0;
    const dy = move === "up" ? (0.5 - t) * 50 * strength : move === "down" ? (t - 0.5) * 50 * strength : 0;
    const o = fadeIn ? interpolate(f, [from, from + fadeIn], [0, 1], clamp) : 1;
    return (
      <AbsoluteFill style={{ opacity: o, overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `translate(${dx}px, ${dy}px) scale(${s})` }} />
        {tint && <AbsoluteFill style={{ background: tint }} />}
      </AbsoluteFill>
    );
  };

/** A sequence of stills switching at given frames (short crossfades). */
export const PhotoSeq: React.FC<{ items: { at: number; src: string; move?: Move }[]; dissolve?: number }> = ({ items, dissolve = 8 }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill>
      {items.map((it, i) => {
        const next = items[i + 1]?.at ?? durationInFrames + 30;
        if (f < it.at - 1 || f > next + dissolve) return null;
        return <Photo key={i} src={it.src} move={it.move ?? (i % 2 ? "out" : "in")} from={it.at} to={next + dissolve} fadeIn={i ? dissolve : 0} />;
      })}
    </AbsoluteFill>
  );
};

/** Vignette, grain and letterbox-free grade so stills feel like film frames. */
export const FilmLook: React.FC<{ dark?: number }> = ({ dark = 0.55 }) => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${dark}) 100%)` }} />
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id={`g${seed % 4}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed % 50} /></filter>
        <rect width="100%" height="100%" filter={`url(#g${seed % 4})`} />
      </svg>
    </AbsoluteFill>
  );
};

const appear = (f: number, at: number, d = 14) => interpolate(f, [at, at + d], [0, 1], { ...clamp, easing: out });

/** Lower third: name / role. */
export const LowerThird: React.FC<{ at: number; until?: number; title: string; sub?: string; tag?: string }> = ({ at, until, title, sub, tag }) => {
  const f = useCurrentFrame();
  const t = appear(f, at);
  const o = until === undefined ? 1 : interpolate(f, [until, until + 10], [1, 0], clamp);
  if (t <= 0 || o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 140, bottom: 130, opacity: o, transform: `translateX(${(1 - t) * -40}px)` }}>
      <div style={{ height: 6, width: 120 * t, background: C.ochre, marginBottom: 18 }} />
      <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 70, color: C.paper, letterSpacing: 1, textShadow: "0 3px 18px rgba(0,0,0,0.6)" }}>{title}</div>
      {sub && <div style={{ fontFamily: font("mono"), fontSize: 30, color: C.paperDim, marginTop: 6, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>{sub}</div>}
      {tag && <div style={{ display: "inline-block", marginTop: 16, padding: "6px 14px", border: `2px solid ${C.ochre}`, color: C.ochre, fontFamily: font("mono"), fontSize: 22, letterSpacing: 3 }}>{tag}</div>}
    </div>
  );
};

/** Big headline number over a still. */
export const BigFigure: React.FC<{ at: number; until?: number; value: string; label?: string; tone?: "gain" | "loss" | "paper" | "ochre"; y?: number; count?: { from: number; to: number; prefix?: string; suffix?: string; dur?: number } }> =
  ({ at, until, value, label, tone = "paper", y = 0.42, count }) => {
    const f = useCurrentFrame();
    const t = interpolate(f, [at, at + 12], [0, 1], { ...clamp, easing: pop });
    const o = until === undefined ? 1 : interpolate(f, [until, until + 10], [1, 0], clamp);
    if (t <= 0 || o <= 0) return null;
    const col = { gain: C.gain, loss: C.loss, paper: C.paper, ochre: C.ochre }[tone];
    let txt = value;
    if (count) {
      const v = interpolate(f, [at, at + (count.dur ?? 30)], [count.from, count.to], { ...clamp, easing: out });
      txt = (count.prefix ?? "") + Math.round(v).toLocaleString("en-US") + (count.suffix ?? "");
    }
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
        <div style={{ position: "absolute", top: `${y * 100}%`, transform: `translateY(-50%) scale(${t})`, textAlign: "center" }}>
          <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 170, color: col, lineHeight: 1, textShadow: "0 6px 40px rgba(0,0,0,0.7)" }}>{txt}</div>
          {label && <div style={{ fontFamily: font("mono"), fontSize: 34, color: C.paper, marginTop: 18, letterSpacing: 2, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{label}</div>}
        </div>
      </AbsoluteFill>
    );
  };

/** Small tag in a corner: DRAMATISED / REPORTED etc. */
export const CornerTag: React.FC<{ text?: string }> = ({ text = "DRAMATISED" }) => (
  <div style={{ position: "absolute", left: 60, top: 50, padding: "6px 12px", border: `2px solid ${C.ochre}`, color: C.ochre, fontFamily: font("mono"), fontSize: 20, letterSpacing: 3, background: "rgba(0,0,0,0.35)" }}>■ {text}</div>
);

/** Date / place card. */
export const DateLine: React.FC<{ at: number; until?: number; text: string }> = ({ at, until, text }) => {
  const f = useCurrentFrame();
  const n = Math.floor(Math.max(0, f - at) * 1.2);
  const o = until === undefined ? 1 : interpolate(f, [until, until + 10], [1, 0], clamp);
  if (f < at || o <= 0) return null;
  return <div style={{ position: "absolute", right: 140, top: 110, opacity: o, fontFamily: font("mono"), fontSize: 34, color: C.paper, letterSpacing: 4, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{text.slice(0, n)}<span style={{ opacity: n < text.length && f % 16 < 8 ? 1 : 0 }}>▍</span></div>;
};

/** Stamp in the film style. */
export const DocStamp: React.FC<{ at: number; text: string; tone?: "loss" | "gain" | "ochre"; y?: number; rot?: number }> = ({ at, text, tone = "loss", y = 0.5, rot = -6 }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [at, at + 6], [2, 1], { ...clamp, easing: out });
  const o = interpolate(f, [at, at + 3], [0, 1], clamp);
  if (o <= 0) return null;
  const col = { loss: C.loss, gain: C.gain, ochre: C.ochre }[tone];
  return (
    <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: `${y * 100}%`, transform: `translateY(-50%) rotate(${rot}deg) scale(${s})`, opacity: o, border: `8px solid ${col}`, color: col, padding: "10px 34px",
        fontFamily: font("display"), fontWeight: 700, fontSize: 96, letterSpacing: 4, background: "rgba(14,15,17,0.55)" }}>{text}</div>
    </AbsoluteFill>
  );
};

/** Chapter card in the film style. */
export const DocChapter: React.FC<{ n: number; title: string }> = ({ n, title }) => {
  const f = useCurrentFrame();
  const t = appear(f, 2, 16);
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", opacity: t, transform: `translateY(${(1 - t) * 20}px)` }}>
        <div style={{ fontFamily: font("mono"), fontSize: 30, letterSpacing: 8, color: C.ochre }}>CHAPTER {n}</div>
        <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 110, color: C.paper, marginTop: 10 }}>{title}</div>
        <div style={{ height: 4, width: 220 * t, background: C.ochre, margin: "26px auto 0" }} />
      </div>
    </AbsoluteFill>
  );
};

export const grainSeed = rnd;
