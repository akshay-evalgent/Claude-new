// Explainer engine: a video is a list of narrated beats (recorded by tools/voice.py),
// grouped into shots. Each shot is a React component that receives its own timing,
// so any animation can be keyed to the exact word being spoken.
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";

export type RawBeat = {
  id: string; shot: string; start: number; frames: number; audio: number;
  voiceAt: number; text: string; words: [number, number, string][];
};
export type Timing = { fps: number; total: number; beats: RawBeat[] };

export type Word = { w: string; norm: string; f0: number; f1: number; beat: string };
export type ShotInfo = {
  id: string; start: number; frames: number;
  beats: { id: string; start: number; frames: number; text: string }[];
  words: Word[];
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9$%.]/g, "").replace(/\.$/, "");

export function buildShots(t: Timing): ShotInfo[] {
  const shots: ShotInfo[] = [];
  for (const b of t.beats) {
    let s = shots[shots.length - 1];
    if (!s || s.id !== b.shot) {
      s = { id: b.shot, start: b.start, frames: 0, beats: [], words: [] };
      shots.push(s);
    }
    const rel = b.start - s.start;
    s.beats.push({ id: b.id, start: rel, frames: b.frames, text: b.text });
    for (const [a, e, w] of b.words) {
      if (!/[a-z0-9$%]/i.test(w)) continue;
      s.words.push({ w, norm: norm(w), f0: rel + Math.round(a * t.fps), f1: rel + Math.round(e * t.fps), beat: b.id });
    }
    s.frames = b.start + b.frames - s.start;
  }
  return shots;
}

/** All words with absolute frames (for captions). */
export function allWords(t: Timing): Word[] {
  const out: Word[] = [];
  for (const b of t.beats)
    for (const [a, e, w] of b.words)
      out.push({ w, norm: norm(w), f0: b.start + Math.round(a * t.fps), f1: b.start + Math.round(e * t.fps), beat: b.id });
  return out;
}

const ShotCtx = createContext<ShotInfo | null>(null);
export const useShot = () => {
  const s = useContext(ShotCtx);
  if (!s) throw new Error("useShot outside a shot");
  return s;
};

/**
 * Frame (relative to the shot) at which a word is spoken.
 * cue("third")      first "third" in the shot
 * cue("money", 2)   second "money"
 * cue("b03")        start of beat b03
 * Unknown words return `fallback` (default 0), so a typo never crashes a render.
 */
export function cueIn(s: ShotInfo, key: string, nth = 1, fallback = 0): number {
  const beat = s.beats.find((b) => b.id === key);
  if (beat) return beat.start;
  const k = norm(key);
  let n = 0;
  for (const w of s.words) if (w.norm === k || (k.length > 3 && w.norm.startsWith(k))) { n++; if (n === nth) return w.f0; }
  return fallback;
}
export const useCue = () => {
  const s = useShot();
  return (key: string, nth = 1, fallback = 0) => cueIn(s, key, nth, fallback);
};
/** Intervals in which a given beat list is being spoken (for mouth movement). */
export const speakingIntervals = (s: ShotInfo, beatIds?: string[]) =>
  s.words.filter((w) => !beatIds || beatIds.includes(w.beat)).map((w) => [w.f0, w.f1] as [number, number]);

export type ShotMap = Record<string, React.FC>;

export const Explainer: React.FC<{
  timing: Timing; shots: ShotMap; fallback?: React.FC; overlay?: React.ReactNode; background?: string;
}> = ({ timing, shots, fallback, overlay, background = "#000" }) => {
  const list = buildShots(timing);
  return (
    <AbsoluteFill style={{ background }}>
      {list.map((s) => {
        const C = shots[s.id] || fallback || Missing;
        return (
          <Sequence key={s.id} from={s.start} durationInFrames={s.frames} name={s.id}>
            <ShotCtx.Provider value={s}><C /></ShotCtx.Provider>
          </Sequence>
        );
      })}
      {overlay}
    </AbsoluteFill>
  );
};

const Missing: React.FC = () => {
  const s = useShot();
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "#400", color: "white", fontSize: width / 30, padding: 60, fontFamily: "monospace" }}>
      MISSING SHOT {s.id}<br />{s.beats.map((b) => b.text).join(" ")}
    </AbsoluteFill>
  );
};

/** Local frame helper that is safe to call anywhere inside a shot. */
export const useT = () => useCurrentFrame();
