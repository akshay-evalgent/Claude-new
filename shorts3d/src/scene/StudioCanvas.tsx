import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { Suspense, useContext, useLayoutEffect, useState } from "react";
import { ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace } from "three";
import { useDelayRender, useVideoConfig } from "remotion";
import { LOOK } from "../look";
import { ReadyCheck, ReadyContext } from "./readiness";

type Props = {
  /** Scene content, including <PostFX /> if you want the effect stack. */
  children: React.ReactNode;
  /** Camera clip planes; raise `far` for big outdoor sets / ground-projected HDRIs. */
  near?: number;
  far?: number;
};

/**
 * The renderer, set up like a Blender Filmic render:
 *  - ACES Filmic tone mapping, exposure 1.1, sRGB output
 *  - soft PCF shadows (three r180+ folded PCFSoft into PCF + shadow.radius)
 *  - physically-correct lighting (three default since r155)
 *  - waits for every async asset (HDRI, GLB, textures) and the post stack before
 *    Remotion captures a frame
 */
export const StudioCanvas: React.FC<Props> = ({ children, near = LOOK.camera.near, far = LOOK.camera.far }) => {
  const { width, height } = useVideoConfig();
  const c = LOOK.camera;
  const [readyChecks] = useState(() => new Set<ReadyCheck>());

  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={1}
      camera={{ fov: c.fov, near, far, position: [0, 1, 5] }}
      shadows={{ enabled: true, type: PCFShadowMap }}
      gl={{
        antialias: false, // MSAA happens in the EffectComposer (multisampling=4)
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = LOOK.renderer.exposure;
        gl.outputColorSpace = SRGBColorSpace;
      }}
      style={{ backgroundColor: LOOK.backdrop.floorColor }}
    >
      <ReadyContext.Provider value={readyChecks}>
        <Suspense fallback={<HoldRender label="Loading HDRI / GLB / textures" />}>
          {children}
          <RenderWhenReady />
        </Suspense>
      </ReadyContext.Provider>
    </ThreeCanvas>
  );
};

/** Blocks Remotion's screenshot while assets inside the canvas are suspended. */
const HoldRender: React.FC<{ label: string }> = ({ label }) => {
  const { delayRender, continueRender } = useDelayRender();
  useLayoutEffect(() => {
    const h = delayRender(label);
    return () => continueRender(h);
  }, [delayRender, continueRender, label]);
  return null;
};

/**
 * When the suspended tree first resolves, R3F (frameloop="never" while rendering)
 * hasn't drawn it yet, and the post-processing composer may still be assembling.
 * Poll until every registered part is ready, draw once,
 * then release Remotion.
 */
const RenderWhenReady: React.FC = () => {
  const { delayRender, continueRender } = useDelayRender();
  const advance = useThree((s) => s.advance);
  const checks = useContext(ReadyContext);
  // Taken in a layout effect, never during render: a render pass that suspends
  // is thrown away by React, and a handle created there would never be released.
  useLayoutEffect(() => {
    const handle = delayRender("First R3F frame after assets + post-processing are ready");
    // setTimeout, not requestAnimationFrame: rAF is paused in background tabs,
    // and Remotion renders with several tabs in parallel.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      advance(performance.now());
      continueRender(handle);
    };
    const tick = () => {
      const ready = !checks || [...checks].every((c) => c());
      if (ready || tries++ > 500) return finish();
      timer = setTimeout(tick, 16);
    };
    // Defer the first check so composer effects from this same commit have run.
    timer = setTimeout(tick, 0);
    return () => {
      clearTimeout(timer);
      if (!done) continueRender(handle);
    };
  }, [advance, checks, continueRender, delayRender]);
  return null;
};
