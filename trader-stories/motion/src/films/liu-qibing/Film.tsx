import React from "react";
import { AbsoluteFill, interpolate, Sequence, Series, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FPS } from "../../theme";
import { component, ShotSpec } from "../../registry";
import { SceneMove, Preset } from "../../components/SceneMove";
import { Scoreboard } from "../../components/Scoreboard";
import { GRAPHICS, OVERLAYS, SCOREBOARD, SHOTS } from "./film";
import type { ShotInfo } from "../xu-xiang/film";

// The whole film, shot by shot, timed to the recorded narration (shots.json).
// Audio is mixed separately (xu-xiang/mix_audio.py) and muxed after rendering.

export const frames = (s: ShotInfo) => Math.max(1, Math.round(s.seconds * FPS));
export const FILM_FRAMES = SHOTS.reduce((a, s) => a + frames(s), 0);

/** Picks a camera move from the shot list's motion note. */
export const presetFor = (s: ShotInfo, i: number): Preset => {
  const m = (s.motion || "").toLowerCase();
  if (m.includes("pull")) return "pull";
  if (m.includes("tilt down") || m.includes("fast tilt")) return "tilt-down";
  if (m.includes("tilt")) return "tilt-up";
  if (m.includes("pan") || m.includes("track")) return i % 2 ? "pan-left" : "pan-right";
  if (m.includes("drift") || m.includes("rack focus") || m.includes("lateral")) return "drift";
  if (m.includes("static")) return "static";
  return "push";
};

const Spec: React.FC<{ spec: ShotSpec }> = ({ spec }) => {
  const Comp = component(spec.t);
  return <Comp {...spec.props} />;
};

const Fade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(frame, [0, 20, durationInFrames - 45, durationInFrames - 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const Film: React.FC = () => {
  let start = 0;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Fade>
        <Series>
          {SHOTS.map((s, i) => {
            const at = start;
            start += frames(s);
            const scene = s.family === "SCENE";
            const spec = scene ? null : GRAPHICS[s.id];
            return (
              <Series.Sequence key={s.id} durationInFrames={frames(s)} name={s.id}>
                {scene ? (
                  <>
                    <SceneMove src={`frames/liu-qibing/${s.image}.jpg`} move={presetFor(s, i)} />
                    {OVERLAYS[s.id] ? <Spec spec={OVERLAYS[s.id]} /> : null}
                    {/* the scoreboard rides on illustrated shots; graphics have the frame to themselves */}
                    <Sequence from={-at} layout="none"><Scoreboard entries={SCOREBOARD} /></Sequence>
                  </>
                ) : spec ? <Spec spec={spec} /> : <AbsoluteFill style={{ background: C.ink }} />}
              </Series.Sequence>
            );
          })}
        </Series>
      </Fade>
    </AbsoluteFill>
  );
};
