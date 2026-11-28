import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { CameraPose } from "./moves";

type Props = {
  /** Pure function frame -> pose. See moves.ts for building blocks. */
  shot: (frame: number, fps: number) => CameraPose;
  /** Mutated every frame with pose.focus; hand the same Vector3 to <PostFX focusTarget>. */
  focus?: Vector3;
};

/**
 * Drives the R3F default camera from Remotion's frame clock. Runs in a layout
 * effect, i.e. before @remotion/three advances R3F for this frame, so the pose,
 * the DoF auto-focus and the rendered pixels always belong to the same frame.
 */
export const CameraRig: React.FC<Props> = ({ shot, focus }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;

  useLayoutEffect(() => {
    const pose = shot(frame, fps);
    camera.position.set(...pose.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(...pose.target);
    if (pose.roll) camera.rotateZ(pose.roll);
    if (camera.fov !== pose.fov) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
    focus?.set(...(pose.focus ?? pose.target));
  }, [frame, fps, camera, shot, focus]);

  return null;
};
