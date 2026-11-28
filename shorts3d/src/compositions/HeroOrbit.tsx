import type { Caption } from "@remotion/captions";
import { useCallback, useState } from "react";
import { Vector3 } from "three";
import { AbsoluteFill } from "remotion";
import { CameraRig } from "../camera/CameraRig";
import { add, CameraPose, DOLLY, ease, handheld, lerp3, mix, orbit, springAt, WHIP } from "../camera/moves";
import { WordCaptions } from "../captions/WordCaptions";
import { LOOK } from "../look";
import { Cyclorama } from "../scene/Cyclorama";
import { HeroModel, useHeroBounds } from "../scene/HeroModel";
import { PostFX } from "../scene/PostFX";
import { StudioCanvas } from "../scene/StudioCanvas";
import { StudioLighting } from "../scene/StudioLighting";

export type HeroOrbitProps = {
  modelUrl: string;
  captions: Caption[];
  /** Frame where the whip-zoom fires. */
  whipFrame: number;
  /** Node or material name the whip pushes into (empty = model centre). */
  whipAnchor: string;
  post: boolean;
};

// Word timings (ms). In production these come from Whisper via @remotion/install-whisper-cpp.
export const SAMPLE_CAPTIONS: Caption[] = [
  w("THIS", 150, 420),
  w(" CAMERA", 420, 1100, true),
  w(" HIDES", 1250, 1650),
  w(" A", 1650, 1850),
  w(" SECRET", 1850, 2700, true),
  w(" INSIDE", 2920, 4600),
];

export const HeroOrbit: React.FC<HeroOrbitProps> = ({ modelUrl, captions, whipFrame, whipAnchor, post }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: LOOK.backdrop.floorColor }}>
      <StudioCanvas>
        <Scene modelUrl={modelUrl} whipFrame={whipFrame} whipAnchor={whipAnchor} post={post} />
      </StudioCanvas>
      <Vignette />
      <WordCaptions captions={captions} />
    </AbsoluteFill>
  );
};

const Scene: React.FC<Omit<HeroOrbitProps, "captions">> = ({ modelUrl, whipFrame, whipAnchor, post }) => {
  const hero = useHeroBounds(modelUrl);
  const [focus] = useState(() => new Vector3());
  const center = hero.center;
  const detail = whipAnchor ? hero.anchor(whipAnchor) : center;

  const shot = useCallback(
    (frame: number, fps: number): CameraPose => {
      // Long, even orbit across the whole shot (~85 degrees).
      const orbitT = ease(frame, 0, 300);
      // Critically damped dolly-in from the wide.
      const dolly = springAt(frame, fps, 0, DOLLY);
      // Underdamped whip: punches in, overshoots a touch, settles.
      const whip = springAt(frame, fps, whipFrame, WHIP);

      // The pivot slides from the whole object to the detail as the whip lands.
      const pivot = lerp3(center, detail, Math.min(1, whip));
      const angle = mix(-1.0, 0.42, orbitT) + 0.22 * whip;
      const radius = mix(6.6, 3.6, dolly) - 1.6 * whip;
      const height = pivot[1] + mix(1.55, 0.7, dolly) - 0.35 * whip;
      const fov = LOOK.camera.fov - 5 * whip;
      const roll = mix(-0.045, 0, dolly) + 0.02 * Math.sin(Math.min(1, whip) * Math.PI);

      const position = add(orbit(pivot, angle, radius, height), handheld(frame, fps));
      return { position, target: pivot, focus: pivot, fov, roll };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center.join(), detail.join(), whipFrame],
  );

  return (
    <>
      <CameraRig shot={shot} focus={focus} />
      <StudioLighting />
      <Cyclorama />
      <HeroModel url={modelUrl} />
      {post ? <PostFX focusTarget={focus} /> : null}
    </>
  );
};

/** Gentle lens vignette, composited in 2D so it never fights the tone mapper. */
const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse 85% 70% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
      pointerEvents: "none",
    }}
  />
);

function w(text: string, startMs: number, endMs: number, pageBreakAfter = false): Caption {
  return { text, startMs, endMs, timestampMs: startMs, confidence: 1, pageBreakAfter };
}
