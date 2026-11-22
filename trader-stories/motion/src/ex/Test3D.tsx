import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";

export const Test3D: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} style={{ background: "#223" }} camera={{ position: [0, 1.5, 6], fov: 40 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={2} />
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[(i - 2) * 1.2, Math.sin(f / 10 + i) * 0.3, 0]} rotation={[f / 30, f / 20, 0]}>
          <sphereGeometry args={[0.5, 48, 48]} />
          <meshStandardMaterial color={["#e94", "#4ae", "#e4a", "#4e9", "#ee4"][i]} roughness={0.3} metalness={0.1} />
        </mesh>
      ))}
    </ThreeCanvas>
  );
};
