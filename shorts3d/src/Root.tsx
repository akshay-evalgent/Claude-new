import { Composition } from "remotion";
import { HeroOrbit, HeroOrbitProps, SAMPLE_CAPTIONS } from "./compositions/HeroOrbit";
import { LOOK, VIDEO } from "./look";

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
    </>
  );
};
