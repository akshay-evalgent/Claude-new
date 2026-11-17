import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, font, prog, rand, sec, tone, Tone, SAFE } from "../theme";
import { Frame } from "./Frame";
import { Counter, Rise, TypeOn } from "./Text";

// ---------------------------------------------------------------- Title card
export type TitleProps = { title: string; kicker?: string };
export const TitleCard: React.FC<TitleProps> = ({ title, kicker }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const words = title.split(" ");
  const rule = prog(frame, 6, 30);
  const out = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <Frame>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
        {kicker ? (
          <Rise at={0} style={{ fontFamily: font("mono"), fontSize: 24, letterSpacing: 8, color: C.muted, marginBottom: 28 }}>{kicker}</Rise>
        ) : null}
        <div style={{ display: "flex", gap: 26, flexWrap: "wrap", justifyContent: "center", maxWidth: 1500 }}>
          {words.map((w, i) => (
            <Rise key={i} at={4 + i * 4} dur={26} style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 132, letterSpacing: 4, color: C.paper, lineHeight: 1.05 }}>
              {w}
            </Rise>
          ))}
        </div>
        <div style={{ marginTop: 40, height: 3, width: 520 * rule, background: C.ochre }} />
      </AbsoluteFill>
    </Frame>
  );
};

// ---------------------------------------------------------------- Number card
// Lines land one at a time. A line can count, type on, or stamp.
export type CardLine = {
  text?: string;
  cjk?: string;              // Chinese line shown above the English, e.g. 私募一哥
  cjkSize?: number;
  count?: { from?: number; to: number; prefix?: string; suffix?: string; decimals?: number };
  mode?: "land" | "type" | "stamp";
  size?: number;
  tone?: Tone;
  at?: number;               // seconds; default staggers lines
};
export type NumberCardProps = { lines: CardLine[]; caption?: string; align?: "center" | "left"; stagger?: number; ground?: "ink" | "board" };

export const NumberCard: React.FC<NumberCardProps> = ({ lines, caption, align = "center", stagger = 0.55, ground = "ink" }) => {
  const frame = useCurrentFrame();
  return (
    <Frame ground={ground}>
      <AbsoluteFill style={{ alignItems: align === "center" ? "center" : "flex-start", justifyContent: "center", padding: `0 ${SAFE.x}px`, gap: 18 }}>
        {lines.map((l, i) => {
          const at = sec(l.at ?? 0.15 + i * stagger);
          const size = l.size ?? (l.count ? 150 : 104);
          const color = tone(l.tone);
          const base: React.CSSProperties = { fontFamily: font("display"), fontWeight: 700, fontSize: size, color, letterSpacing: 2, lineHeight: 1.04, textAlign: align };
          let body: React.ReactNode = l.text;
          if (l.count) body = <Counter {...l.count} at={at} dur={sec(1.4)} />;
          if (l.mode === "type" && l.text) return <TypeOn key={i} text={l.text} at={at} style={{ ...base, fontFamily: font("mono"), fontWeight: 600, letterSpacing: 0 }} />;
          if (l.mode === "stamp") {
            const p = prog(frame, at, 9);
            const shake = frame >= at && frame < at + 8 ? (rand(frame) - 0.5) * 10 : 0;
            return (
              <div key={i} style={{ ...base, opacity: p > 0 ? 1 : 0, transform: `translate(${shake}px,0) rotate(${(rand(i) - 0.5) * 6}deg) scale(${1.5 - 0.5 * p})`, border: `6px solid ${color}`, padding: "4px 28px", fontSize: size * 0.8 }}>
                {l.text}
              </div>
            );
          }
          return (
            <Rise key={i} at={at} dur={22} style={{ textAlign: align }}>
              {l.cjk ? <div style={{ fontFamily: font("cjk"), fontWeight: 700, fontSize: l.cjkSize ?? size * 0.62, color: C.ochre, letterSpacing: 10, marginBottom: 6 }}>{l.cjk}</div> : null}
              <div style={base}>{body}</div>
            </Rise>
          );
        })}
        {caption ? <Rise at={sec(0.15 + lines.length * stagger)} style={{ fontFamily: font("mono"), fontSize: 26, color: C.muted, marginTop: 18, letterSpacing: 2 }}>{caption}</Rise> : null}
      </AbsoluteFill>
    </Frame>
  );
};

// ---------------------------------------------------------------- Quote card
export type QuoteProps = { quote?: string; attribution: string };
export const QuoteCard: React.FC<QuoteProps> = ({ quote, attribution }) => {
  const frame = useCurrentFrame();
  const words = quote ? quote.split(" ") : [];
  const wordsDone = sec(0.3) + words.length * 3;
  return (
    <Frame>
      <AbsoluteFill style={{ justifyContent: "center", padding: `0 ${SAFE.x + 80}px` }}>
        {quote ? (
          <>
            <div style={{ fontFamily: font("serif"), fontSize: 220, color: C.ochre, lineHeight: 0.6, height: 90, opacity: prog(frame, 0, 15) }}>“</div>
            <div style={{ fontFamily: font("serif"), fontStyle: "italic", fontSize: 68, lineHeight: 1.28, color: C.paper, maxWidth: 1450 }}>
              {words.map((w, i) => (
                <span key={i} style={{ opacity: prog(frame, sec(0.3) + i * 3, 10) }}>{w} </span>
              ))}
            </div>
          </>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: quote ? 54 : 0, opacity: prog(frame, quote ? wordsDone : 0, 18) }}>
          <div style={{ width: 60, height: 2, background: C.ochre }} />
          <div style={{ fontFamily: font("mono"), fontSize: quote ? 26 : 40, color: quote ? C.muted : C.paper, letterSpacing: 1 }}>{attribution}</div>
        </div>
      </AbsoluteFill>
    </Frame>
  );
};

// ---------------------------------------------------------------- Tag (overlay)
// RUMOUR / UNPROVEN / ALLEGATION / ILLUSTRATIVE. Render with alpha, or place inside other templates.
export type TagProps = { text: string; at?: number; corner?: "tl" | "tr" };
export const Tag: React.FC<TagProps> = ({ text, at = 0.2, corner = "tl" }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, sec(at), 10);
  const flick = frame < sec(at) + 10 ? (Math.floor(frame / 2) % 2 ? 0.4 : 1) : 1;
  return (
    <div style={{
      position: "absolute", top: SAFE.y - 30, [corner === "tl" ? "left" : "right"]: SAFE.x - 60,
      opacity: p * flick, display: "flex", alignItems: "center", gap: 12,
      border: `2px solid ${C.ochre}`, padding: "8px 16px", background: "rgba(14,15,17,0.72)",
      fontFamily: font("mono"), fontWeight: 600, fontSize: 24, letterSpacing: 5, color: C.ochre,
    }}>
      <div style={{ width: 10, height: 10, background: C.ochre }} />
      {text}
    </div>
  );
};
export const TagOverlay: React.FC<TagProps> = (p) => <AbsoluteFill><Tag {...p} /></AbsoluteFill>;
