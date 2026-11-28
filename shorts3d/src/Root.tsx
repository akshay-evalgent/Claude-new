import { Composition } from "remotion";
import { HeroOrbit, HeroOrbitProps, SAMPLE_CAPTIONS } from "./compositions/HeroOrbit";
import { LOOK, VIDEO } from "./look";
import { PoseLab } from "./lab/PoseLab";
import { NOBODY_FPS, NobodyShort, nobodyDuration } from "./stories/nobody/NobodyShort";

export const Root: React.FC = () => {
  return (
    <>
      {/* 5 s test shot: orbit + dolly-in + whip-zoom on /models/hero.glb */}
      <Composition
        id="HeroOrbit"
        component={HeroOrbit}
        durationInFrames={5 * VIDEO.fps}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        defaultProps={
          {
            modelUrl: LOOK.hero.url,
            captions: SAMPLE_CAPTIONS,
            whipFrame: 175,
            whipAnchor: "Camera_01_lens",
            post: true,
          } satisfies HeroOrbitProps
        }
      />
      {/* 32 s narrated story short: "They Named Me Nobody" */}
      <Composition
        id="NobodyShort"
        component={NobodyShort}
        durationInFrames={nobodyDuration}
        fps={NOBODY_FPS}
        width={VIDEO.width}
        height={VIDEO.height}
      />
      <Composition id="PoseLab" component={PoseLab} durationInFrames={120} fps={30} width={1080} height={1920} />
    </>
  );
};
