import {
  Bloom,
  DepthOfField,
  EffectComposer,
  N8AO,
  ToneMapping,
} from "@react-three/postprocessing";
import { useFrame } from "@react-three/fiber";
import { EffectComposer as Composer, DepthOfFieldEffect, ToneMappingMode } from "postprocessing";
import { useCallback, useRef } from "react";
import type { Vector3 } from "three";
import { LOOK } from "../look";
import { useReadyCheck } from "./readiness";

type Props = {
  /** World-space point to keep in focus. Mutate it per frame (CameraRig does) to rack focus. */
  focusTarget: Vector3;
  bokehScale?: number;
  /** World-space depth (metres) around the focus point that stays sharp. */
  focusRange?: number;
};

/**
 * Blender-style "Filmic" finishing chain, in HDR (half-float) until the very end:
 *   N8AO  -> crevice / contact occlusion
 *   Bloom -> only true HDR highlights (> 1.1) glow, so it stays subtle
 *   DoF   -> auto-focus on the hero, backdrop melts into bokeh
 *   ACES  -> filmic tone mapping as the LAST step (uses gl.toneMappingExposure = 1.1)
 *
 * Note: @react-three/postprocessing forces gl.toneMapping = NoToneMapping while the
 * composer is mounted, so ACES must run here as an effect, not on the renderer.
 */
export const PostFX: React.FC<Props> = ({ focusTarget, bokehScale = LOOK.post.dof.bokehScale, focusRange: rangeProp }) => {
  const p = LOOK.post;
  const c = LOOK.camera;
  // Classic normalised focalLength (fraction of near..far) -> world-space focus range.
  const focusRange = rangeProp ?? p.dof.focalLength * (c.far - c.near);

  // Ready once the composer exists and holds more than its RenderPass.
  const composer = useRef<Composer>(null);
  useReadyCheck(useCallback(() => (composer.current?.passes.length ?? 0) > 1, []));

  // R3F copies a Vector3 prop into the effect's own vector once, so re-sync the
  // focus point every frame (priority 0 runs before the composer at priority 1).
  const dof = useRef<DepthOfFieldEffect>(null);
  useFrame(() => {
    dof.current?.target?.copy(focusTarget);
  });

  return (
    <EffectComposer ref={composer} multisampling={p.multisampling} enableNormalPass={false}>
      <N8AO
        aoRadius={p.ao.aoRadius}
        intensity={p.ao.intensity}
        distanceFalloff={p.ao.distanceFalloff}
        quality="ultra"
        halfRes={false}
      />
      <Bloom mipmapBlur luminanceThreshold={p.bloom.luminanceThreshold} intensity={p.bloom.intensity} />
      <DepthOfField ref={dof} target={focusTarget} focusRange={focusRange} bokehScale={bokehScale} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
};
