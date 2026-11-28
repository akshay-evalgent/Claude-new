import { useState } from "react";
import { Vector3 } from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig } from "../camera/CameraRig";
import { Look, Mannequin } from "../characters/Mannequin";
import * as P from "../characters/poses";
import { Cyclorama } from "../scene/Cyclorama";
import { PostFX } from "../scene/PostFX";
import { StudioCanvas } from "../scene/StudioCanvas";
import { StudioLighting } from "../scene/StudioLighting";

/** Dev composition: every pose side by side, for checking the rig. */
const LOOKS: Look[] = [
  { skin: "#c99a78", shirt: "#1d1f24", pants: "#2a2d33", hood: true, child: true },
  { skin: "#e0b59a", shirt: "#2f6fd6", pants: "#3b3f48", hair: "#3a2416" },
  { skin: "#8d5a3b", shirt: "#2e9a55", pants: "#5a4632", hair: "#141010", hairStyle: "bun", child: true },
  { skin: "#e8c2a6", shirt: "#b3141f", pants: "#1c1c22", hat: "top", chain: true, build: 1.25 },
  { skin: "#b07a55", shirt: "#4a4f5a", pants: "#2a2d33", hat: "helmet" },
  { skin: "#d9a882", shirt: "#e5b933", pants: "#3d4250", hair: "#6b3d1f" },
];

export const PoseLab: React.FC = () => (
  <AbsoluteFill style={{ background: "#111" }}>
    <StudioCanvas>
      <Lab />
    </StudioCanvas>
  </AbsoluteFill>
);

const Lab: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [focus] = useState(() => new Vector3(0, 1, 0));
  const poses = [P.walk(t), P.cheer(t), P.tapHead(t), P.laughCry(t), P.guardStand(t), P.yell(t), P.shrug(t), P.sitSad(t), P.carrySack(t, 0)];
  return (
    <>
      <CameraRig shot={() => ({ position: [0, 1.5, 9.5], target: [0, 0.95, 0], fov: 32 })} focus={focus} />
      <StudioLighting />
      <Cyclorama />
      {poses.map((p, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return (
          <Mannequin
            key={i}
            look={LOOKS[i % LOOKS.length]}
            pose={{ ...p, pos: [(col - 1) * 1.1, 0, -row * 1.6 + 0.8], rotY: 0.35 }}
          />
        );
      })}
      <PostFX focusTarget={focus} />
    </>
  );
};
