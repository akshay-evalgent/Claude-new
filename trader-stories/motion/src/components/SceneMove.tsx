import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, easeInOut, font, prog, SAFE } from "../theme";
import { Grain, Vignette } from "./Frame";

// Camera moves on a generated still. Images are rendered larger than the frame
// so moves never show an edge.
export type Cam = { s: number; x: number; y: number };   // scale, and offset in % of frame
export type Preset = "push" | "pull" | "pan-left" | "pan-right" | "tilt-up" | "tilt-down" | "drift" | "static";
export const PRESETS: Record<Preset, [Cam, Cam]> = {
  push: [{ s: 1.04, x: 0, y: 0 }, { s: 1.16, x: 0, y: 0 }],
  pull: [{ s: 1.18, x: 0, y: 0 }, { s: 1.04, x: 0, y: 0 }],
  "pan-left": [{ s: 1.14, x: 4, y: 0 }, { s: 1.14, x: -4, y: 0 }],
  "pan-right": [{ s: 1.14, x: -4, y: 0 }, { s: 1.14, x: 4, y: 0 }],
  "tilt-up": [{ s: 1.14, x: 0, y: -4 }, { s: 1.14, x: 0, y: 4 }],
  "tilt-down": [{ s: 1.14, x: 0, y: 4 }, { s: 1.14, x: 0, y: -4 }],
  drift: [{ s: 1.08, x: -1.5, y: 0.5 }, { s: 1.11, x: 1.5, y: -0.5 }],
  static: [{ s: 1.04, x: 0, y: 0 }, { s: 1.04, x: 0, y: 0 }],
};
export type SceneMoveProps = { src: string; move?: Preset; from?: Cam; to?: Cam; caption?: string; fadeIn?: boolean; fadeOut?: boolean };

export const SceneMove: React.FC<SceneMoveProps> = ({ src, move = "push", from, to, caption, fadeIn, fadeOut }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [a, b] = [from ?? PRESETS[move][0], to ?? PRESETS[move][1]];
  const k = interpolate(frame, [0, durationInFrames], [0, 1], { easing: easeInOut });
  const s = a.s + (b.s - a.s) * k, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
  const fade = (fadeIn ? prog(frame, 0, 12) : 1) * (fadeOut ? interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" }) : 1);
  const url = /^https?:/.test(src) ? src : staticFile(src);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill style={{ opacity: fade, transform: `translate(${x}%, ${y}%) scale(${s})` }}>
        <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <Vignette strength={0.45} />
      <Grain opacity={0.08} />
      {caption ? <div style={{ position: "absolute", right: SAFE.x - 60, bottom: SAFE.y - 18, fontFamily: font("mono"), fontWeight: 600, fontSize: 34, color: C.paper, letterSpacing: 2, opacity: prog(frame, 10, 16), textShadow: "0 2px 18px rgba(0,0,0,0.8)" }}>{caption}</div> : null}
    </AbsoluteFill>
  );
};
