import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, font, prog, SAFE } from "../theme";
import { Tag } from "./Cards";

// Lower-right caption (the scoreboard owns lower-left) for a scene shot (a place, a time, a figure). Render with alpha.
export type CaptionOverlayProps = { text: string; at?: number };
export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({ text, at = 0.4 }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, Math.round(at * 30), 16);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", right: SAFE.x - 60, bottom: SAFE.y - 18, display: "flex", alignItems: "center", gap: 18, opacity: p, transform: `translateX(${(1 - p) * 20}px)` }}>
        <div style={{ fontFamily: font("mono"), fontWeight: 600, fontSize: 34, color: C.paper, letterSpacing: 2, textShadow: "0 2px 18px rgba(0,0,0,0.85)" }}>{text}</div>
        <div style={{ width: 4, height: 44, background: C.ochre }} />
      </div>
    </AbsoluteFill>
  );
};

// Everything that sits on an illustrated shot: a tag (DRAMATISED, RUMOUR...) and/or a caption.
export type SceneOverlayProps = { tag?: string; caption?: string };
export const SceneOverlay: React.FC<SceneOverlayProps> = ({ tag, caption }) => (
  <AbsoluteFill>
    {tag ? <Tag text={tag} /> : null}
    {caption ? <CaptionOverlay text={caption} /> : null}
  </AbsoluteFill>
);
