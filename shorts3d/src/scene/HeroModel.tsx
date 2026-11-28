import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, Material, Mesh, Object3D, Vector3 } from "three";
import { staticFile } from "remotion";
import { LOOK } from "../look";
import type { Vec3 } from "../camera/moves";
import { upgradeToPhysical } from "./materials";

type Props = {
  url?: string;
  /** Largest dimension after normalisation, in world units. */
  size?: number;
  /** Extra transform applied after normalisation (e.g. a turntable spin). */
  rotationY?: number;
  position?: [number, number, number];
};

/** Resolve "/models/x.glb" through Remotion's staticFile() so it works in Studio and renders. */
export const asset = (p: string) => staticFile(p.replace(/^\//, ""));

/**
 * Loads a .glb, upgrades materials to MeshPhysicalMaterial, then centres it on
 * the origin with its base resting on the floor (y = 0) and scales it to `size`.
 * Any GLB from any source drops into the same framing.
 */
export const HeroModel: React.FC<Props> = ({
  url = LOOK.hero.url,
  size = LOOK.hero.size,
  rotationY = 0,
  position = [0, 0, 0],
}) => {
  const { scene } = useGLTF(asset(url));

  const { object, scale, offset } = useMemo(() => {
    const object = scene.clone(true);
    upgradeToPhysical(object, LOOK.physical);
    return { object, ...normalize(scene, size) };
  }, [scene, size]);

  return (
    <group position={position} rotation-y={rotationY}>
      <group scale={scale}>
        <primitive object={object} position={offset} />
      </group>
    </group>
  );
};

/** Scale + offset that put the model's base on the floor, centred, largest side = size. */
function normalize(scene: Object3D, size: number) {
  const box = new Box3().setFromObject(scene);
  const dims = box.getSize(new Vector3());
  const scale = size / Math.max(dims.x, dims.y, dims.z);
  const center = box.getCenter(new Vector3());
  const offset = new Vector3(-center.x, -box.min.y, -center.z);
  return { scale, offset, dims: dims.multiplyScalar(scale) };
}

/**
 * Where the normalised hero sits in the world, plus `anchor(name)`: the world
 * centre of any part whose node or material name matches. Use it to aim camera
 * pushes and focus at a detail ("Camera_01_lens", "Head", "Wheel_FL"...).
 */
export function useHeroBounds(url: string = LOOK.hero.url, size: number = LOOK.hero.size) {
  const { scene } = useGLTF(asset(url));
  return useMemo(() => {
    const { scale, offset, dims } = normalize(scene, size);
    const toWorld = (p: Vector3): Vec3 => {
      const w = p.clone().add(offset).multiplyScalar(scale);
      return [w.x, w.y, w.z];
    };
    const center = toWorld(new Box3().setFromObject(scene).getCenter(new Vector3()));

    const anchor = (name: string): Vec3 => {
      const matches = (exact: boolean) => {
        const box = new Box3();
        scene.traverse((o) => {
          const mesh = o as Mesh;
          const mats = mesh.isMesh ? ([] as Material[]).concat(mesh.material) : [];
          const names = [o.name, ...mats.map((m) => m.name)];
          if (names.some((n) => (exact ? n === name : n.includes(name)))) box.expandByObject(o);
        });
        return box;
      };
      let box = matches(true);
      if (box.isEmpty()) box = matches(false);
      if (box.isEmpty()) {
        console.warn(`useHeroBounds: no node/material named "${name}", using model centre`);
        return center;
      }
      return toWorld(box.getCenter(new Vector3()));
    };

    return { width: dims.x, height: dims.y, depth: dims.z, center, anchor };
  }, [scene, size]);
}
