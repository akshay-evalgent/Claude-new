// 3D cash towers (three.js via @remotion/three). Each brick is a $1,000 bundle; towers grow layer by layer.
import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";

export type Pile = { value: number; ghost?: number; x: number; z?: number; tint?: string; per?: number; cols?: number; rows?: number };

const billTexture = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas"); c.width = 512; c.height = 220;
    const g = c.getContext("2d")!;
    g.fillStyle = "#9ED39A"; g.fillRect(0, 0, 512, 220);
    g.strokeStyle = "#5E9E5A"; g.lineWidth = 8; g.strokeRect(10, 10, 492, 200);
    g.fillStyle = "#7DBF78"; g.beginPath(); g.ellipse(256, 110, 62, 70, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3F7A3C"; g.font = "bold 90px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 256, 114);
    g.font = "bold 46px sans-serif"; g.fillText("100", 70, 52); g.fillText("100", 442, 172);
    g.fillStyle = "#F2D16B"; g.fillRect(226, 0, 60, 220); // paper band
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
})();
const edgeTexture = (() => {
  let tex: THREE.CanvasTexture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const g = c.getContext("2d")!;
    for (let i = 0; i < 64; i += 4) { g.fillStyle = i % 8 ? "#E9F2DF" : "#B9D6A8"; g.fillRect(0, i, 64, 4); }
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
})();

const BW = 1.56, BH = 0.17, BD = 0.66, GAP = 0.06;

const Tower: React.FC<{ pile: Pile }> = ({ pile }) => {
  const per = pile.per ?? 1000;
  const cols = pile.cols ?? 3, rows = pile.rows ?? 3;
  const n = Math.max(0, Math.round(pile.value / per));
  const g = Math.max(0, Math.round((pile.ghost ?? 0) / per));
  const mats = useMemo(() => {
    const top = new THREE.MeshStandardMaterial({ map: billTexture(), roughness: 0.75 });
    const side = new THREE.MeshStandardMaterial({ map: edgeTexture(), roughness: 0.9 });
    return [side, side, top, side, side, side];
  }, []);
  const ghostMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#E5483A", transparent: true, opacity: 0.38, roughness: 0.6 }), []);
  const geo = useMemo(() => new THREE.BoxGeometry(BW, BH, BD), []);
  const pos = (i: number) => {
    const layer = Math.floor(i / (cols * rows)), k = i % (cols * rows);
    const cx = (k % cols) - (cols - 1) / 2, cz = Math.floor(k / cols) - (rows - 1) / 2;
    return [pile.x + cx * (BW + GAP), BH / 2 + layer * (BH + 0.012), (pile.z ?? 0) + cz * (BD + GAP)] as const;
  };
  return (
    <group>
      {Array.from({ length: n }).map((_, i) => <mesh key={i} geometry={geo} material={mats} position={pos(i) as unknown as THREE.Vector3Tuple} castShadow receiveShadow />)}
      {Array.from({ length: g }).map((_, i) => <mesh key={`g${i}`} geometry={geo} material={ghostMat} position={pos(n + i) as unknown as THREE.Vector3Tuple} />)}
    </group>
  );
};

export const CashTowers: React.FC<{
  piles: Pile[]; cam?: { pos: [number, number, number]; look?: [number, number, number]; fov?: number }; orbit?: number; bg?: string; floor?: string;
}> = ({ piles, cam = { pos: [0, 4.2, 11] }, orbit = 0, bg = "#F4E7CF", floor }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const a = orbit * f * 0.004;
  const [px, py, pz] = cam.pos;
  const pos: [number, number, number] = [px * Math.cos(a) + pz * Math.sin(a), py, pz * Math.cos(a) - px * Math.sin(a)];
  return (
    <ThreeCanvas width={width} height={height} style={{ background: bg }} shadows
      camera={{ position: pos, fov: cam.fov ?? 38 }}
      onCreated={({ camera }) => camera.lookAt(...(cam.look ?? [0, 1.4, 0]))}>
      <CamLook pos={pos} look={cam.look ?? [0, 1.4, 0]} />
      <hemisphereLight args={["#FFF6E5", "#D9B98C", 1.25]} />
      <directionalLight position={[5, 9, 6]} intensity={2.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[80, 80]} />{floor ? <meshStandardMaterial color={floor} roughness={1} /> : <shadowMaterial opacity={0.22} />}</mesh>
      {piles.map((p, i) => <Tower key={i} pile={p} />)}
    </ThreeCanvas>
  );
};

// keeps the camera pointed at the target every frame (position changes with orbit)
import { useThree } from "@react-three/fiber";
const CamLook: React.FC<{ pos: [number, number, number]; look: [number, number, number] }> = ({ pos, look }) => {
  const { camera } = useThree();
  camera.position.set(...pos);
  camera.lookAt(...look);
  camera.updateProjectionMatrix();
  return null;
};
