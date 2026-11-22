// 3D lottery drum: numbered balls tumbling inside a glass sphere (three.js).
import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";

const COLORS = ["#E5483A", "#F7CF3D", "#3E8EDE", "#2FB36B", "#F29A38", "#7B5CC4", "#F2F2F2"];
const texCache: Record<number, THREE.CanvasTexture> = {};
const ballTex = (n: number) => {
  if (texCache[n]) return texCache[n];
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = COLORS[n % COLORS.length]; g.fillRect(0, 0, 256, 128);
  for (const cx of [64, 192]) {
    g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(cx, 64, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1B1B1B"; g.font = "bold 40px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(n), cx, 66);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache[n] = t; return t;
};
const rnd = (i: number) => { const x = Math.sin(i * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); };

const Cam: React.FC<{ z: number }> = ({ z }) => {
  const { camera } = useThree();
  camera.position.set(0, 0.6, z); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  return null;
};

export const LotteryDrum: React.FC<{ n?: number; bg?: string; speed?: number; camZ?: number; highlight?: number[] }> = ({ n = 30, bg = "#0E0F11", speed = 1, camZ = 7, highlight = [] }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const balls = useMemo(() => Array.from({ length: n }, (_, i) => ({ num: i + 1, a: rnd(i) * 6.28, b: rnd(i + 50) * 6.28, r: 0.6 + rnd(i + 99) * 1.3, w: 0.6 + rnd(i + 7) * 1.4 })), [n]);
  const t = (f / 30) * speed;
  return (
    <ThreeCanvas width={width} height={height} style={{ background: bg }} camera={{ position: [0, 0.6, camZ], fov: 40 }}>
      <Cam z={camZ} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} />
      <pointLight position={[-3, -2, 3]} intensity={30} color="#F2C66B" />
      <mesh><sphereGeometry args={[2.35, 64, 64]} /><meshPhysicalMaterial color="#DDE9F2" transparent opacity={0.13} roughness={0.05} metalness={0} clearcoat={1} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.38, 0.05, 16, 100]} /><meshStandardMaterial color="#C9A24A" metalness={0.8} roughness={0.3} /></mesh>
      {balls.map((bl, i) => {
        const ph = t * bl.w + bl.a;
        const x = Math.cos(ph) * bl.r * Math.cos(bl.b + t * 0.7);
        const y = Math.sin(ph * 1.3 + bl.b) * bl.r * 0.95 - 0.2;
        const z = Math.sin(ph) * bl.r * Math.sin(bl.b + t * 0.5) * 0.8;
        const hl = highlight.includes(bl.num);
        return (
          <mesh key={i} position={[x, y, z]} rotation={[ph * 2, ph * 1.4, 0]} scale={hl ? 1.25 : 1}>
            <sphereGeometry args={[0.32, 32, 32]} />
            <meshStandardMaterial map={ballTex(bl.num)} roughness={0.25} metalness={0.05} emissive={hl ? "#F7CF3D" : "#000000"} emissiveIntensity={hl ? 0.35 : 0} />
          </mesh>
        );
      })}
    </ThreeCanvas>
  );
};
