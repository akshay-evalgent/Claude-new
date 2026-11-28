import { Environment } from "@react-three/drei";
import { LOOK } from "../look";
import { asset } from "./HeroModel";

type Props = {
  hdri?: string;
  /** Rotates the HDRI around Y so softboxes land where you want the highlights. */
  hdriRotation?: number;
};

/**
 * Image-based studio lighting + two practical lights:
 *  - HDRI (Poly Haven studio) for reflections and soft fill. It lights the scene
 *    but is NOT shown as background; the cyclorama is the background.
 *  - Warm-neutral key from front-left that casts the real (soft PCF) shadow.
 *  - Cool directional rim from behind-right to cut the silhouette off the dark backdrop.
 */
export const StudioLighting: React.FC<Props> = ({ hdri = LOOK.studio.hdri, hdriRotation = 0.6 }) => {
  const s = LOOK.studio;
  return (
    <>
      <Environment
        files={asset(hdri)}
        background={false}
        environmentIntensity={s.environmentIntensity}
        environmentRotation={[0, hdriRotation, 0]}
      />

      <directionalLight
        position={[-2.6, 4.2, 3.2]}
        color={s.keyColor}
        intensity={s.keyIntensity}
        castShadow
        shadow-mapSize={[LOOK.renderer.shadowMapSize, LOOK.renderer.shadowMapSize]}
        shadow-radius={5}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={0.5}
        shadow-camera-far={14}
      />

      <directionalLight position={[2.8, 3.0, -4.0]} color={s.rimColor} intensity={s.rimIntensity} />
    </>
  );
};
