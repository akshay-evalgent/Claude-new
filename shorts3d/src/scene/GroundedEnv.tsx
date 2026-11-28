import { Environment, useEnvironment } from "@react-three/drei";
import { useMemo } from "react";
import { GroundedSkybox } from "three/examples/jsm/objects/GroundedSkybox.js";
import { asset } from "./HeroModel";

type Props = {
  /** Equirect .hdr/.exr under public/. */
  file: string;
  /** Height (m) the HDRI was shot from; sets the scale of the projected floor. */
  height: number;
  /** Radius (m) of the dome; the floor becomes sky beyond roughly this distance. */
  radius: number;
  /** Brightness of the visible backdrop (dim it for dusk / night). */
  backgroundIntensity?: number;
  /** Brightness of the image-based lighting. */
  environmentIntensity?: number;
  rotationY?: number;
  /** Opacity of the shadow catcher that lets the projected floor receive shadows. */
  shadowOpacity?: number;
};

/**
 * HDRI as a real set: lighting + a ground-projected dome (three's GroundedSkybox),
 * so characters can stand on the photographed floor. The dome writes depth, so
 * depth of field and N8AO treat the backdrop as far away / the floor as a floor,
 * and a transparent shadow catcher gives the photo floor real contact shadows.
 *
 * (drei's <Environment ground> uses a shader three r187 no longer supports.)
 */
export const GroundedEnv: React.FC<Props> = ({
  file,
  height,
  radius,
  backgroundIntensity = 1,
  environmentIntensity = 1,
  rotationY = 0,
  shadowOpacity = 0.45,
}) => {
  const url = asset(file);
  const map = useEnvironment({ files: url });
  const dome = useMemo(() => {
    const d = new GroundedSkybox(map, height, radius, 96);
    d.position.y = height - 0.005;
    return d;
  }, [map, height, radius]);
  const mat = dome.material as import("three").MeshBasicMaterial;
  mat.color.setScalar(backgroundIntensity);
  mat.depthWrite = true;
  dome.rotation.y = rotationY;

  return (
    <>
      <Environment files={url} background={false} environmentIntensity={environmentIntensity} environmentRotation={[0, rotationY, 0]} />
      <primitive object={dome} />
      <mesh rotation-x={-Math.PI / 2} position-y={0.002} receiveShadow>
        <planeGeometry args={[radius * 1.2, radius * 1.2]} />
        <shadowMaterial transparent opacity={shadowOpacity} depthWrite={false} />
      </mesh>
    </>
  );
};
