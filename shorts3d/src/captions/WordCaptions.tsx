import { Caption, createTikTokStyleCaptions } from "@remotion/captions";
import { loadFont } from "@remotion/fonts";
import { useMemo } from "react";
import { AbsoluteFill, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// Bundled locally (public/fonts, SIL OFL) so renders never depend on network access.
const fontFamily = "Montserrat Black";
loadFont({ family: fontFamily, url: staticFile("fonts/Montserrat-Black.woff2"), weight: "900" });
const storyFont = "Montserrat ExtraBold";
loadFont({ family: storyFont, url: staticFile("fonts/Montserrat-ExtraBold.woff2"), weight: "800" });

type Props = {
  /** Word-level captions (same shape @remotion/captions / Whisper produces). */
  captions: Caption[];
  /** Words closer together than this share one on-screen "page". Lower = fewer words at once. */
  combineWithinMs?: number;
  highlightColor?: string;
  /** Vertical position of the caption block's centre, 0 = top, 1 = bottom. */
  y?: number;
  /**
   * "punch": big uppercase, words pop in one by one, active word highlighted.
   * "story": narrated-story look, small lowercase 1-3 word chunks that cut in with
   *          the voice, thin outline, no highlight.
   */
  variant?: "punch" | "story";
};

/**
 * Bold, centred, word-by-word captions in the short-form style:
 * heavy uppercase sans, thick black outline, each word pops in on its timestamp,
 * the word being spoken is highlighted.
 */
export const WordCaptions: React.FC<Props> = ({
  captions,
  combineWithinMs = 700,
  highlightColor = "#FFE14D",
  y = 0.72,
  variant = "punch",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;

  const pages = useMemo(
    () => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: combineWithinMs }).pages,
    [captions, combineWithinMs],
  );

  const page = pages.find((p, i) => ms >= p.startMs && ms < (pages[i + 1]?.startMs ?? p.startMs + p.durationMs));
  if (!page) return null;

  if (variant === "story") {
    const startFrame = (page.startMs / 1000) * fps;
    const pop = spring({ frame: frame - startFrame, fps, config: { damping: 18, stiffness: 400, mass: 0.4 } });
    const text = page.tokens
      .map((t) => t.text.trim())
      .join(" ")
      .replace(/[.,!?;:]+/g, "")
      .toLowerCase();
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            top: `${y * 100}%`,
            transform: `translateY(-50%) scale(${0.92 + 0.08 * pop})`,
            textAlign: "center",
            fontFamily: storyFont,
            fontWeight: 800,
            fontSize: 74,
            lineHeight: 1.1,
            color: "#FFFFFF",
            WebkitTextStroke: "9px #000",
            paintOrder: "stroke fill",
            textShadow: "0 4px 14px rgba(0,0,0,0.45)",
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: `${y * 100}%`,
          transform: "translateY(-50%)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          columnGap: 26,
          rowGap: 6,
          textAlign: "center",
        }}
      >
        {page.tokens.map((t) => {
          if (ms < t.fromMs) return null; // not spoken yet: word-by-word reveal
          const startFrame = (t.fromMs / 1000) * fps;
          const pop = spring({ frame: frame - startFrame, fps, config: { damping: 11, stiffness: 260, mass: 0.5 } });
          const active = ms >= t.fromMs && ms < t.toMs;
          return (
            <span
              key={`${t.fromMs}-${t.text}`}
              style={{
                fontFamily,
                fontWeight: 900,
                fontSize: 104,
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
                color: active ? highlightColor : "#FFFFFF",
                WebkitTextStroke: "14px #000",
                paintOrder: "stroke fill",
                textShadow: "0 8px 0 rgba(0,0,0,0.85), 0 14px 28px rgba(0,0,0,0.55)",
                display: "inline-block",
                transform: `scale(${0.55 + 0.45 * pop}) translateY(${(1 - pop) * 24}px)`,
                opacity: Math.min(1, pop * 1.6),
              }}
            >
              {t.text.trim()}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Quick helper for tests/storyboards: evenly time a sentence word by word.
 * A "|" forces a new caption page at that point.
 */
export function timeWords(sentence: string, startMs: number, msPerWord: number, gapMs = 0): Caption[] {
  const out: Caption[] = [];
  for (const w of sentence.split(/\s+/).filter(Boolean)) {
    if (w === "|") {
      if (out.length) out[out.length - 1].pageBreakAfter = true;
      continue;
    }
    const s = startMs + out.length * (msPerWord + gapMs);
    out.push({ text: (out.length ? " " : "") + w, startMs: s, endMs: s + msPerWord, timestampMs: s, confidence: 1 });
  }
  return out;
}
