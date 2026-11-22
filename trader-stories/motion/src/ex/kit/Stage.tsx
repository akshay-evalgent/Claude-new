// Stage: an SVG world the size of the frame, with a ground line, a background set and a camera.
// Works in landscape (1920x1080) and portrait (1080x1920).
import React, { createContext, useContext } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CF, K, LW, OUT, kf, rnd } from "./style";
import { Building, House, Tree } from "./Props";

export type Bg = "town" | "city" | "wallst" | "office" | "bank" | "trading" | "studio" | "room" | "night" | "none" | "sky" | "court";
type StageInfo = { W: number; H: number; gy: number; portrait: boolean };
const Ctx = createContext<StageInfo>({ W: 1920, H: 1080, gy: 860, portrait: false });
export const useStage = () => useContext(Ctx);

export type CamKey = [number, { z?: number; x?: number; y?: number; r?: number }];

export const Stage: React.FC<{
  bg?: Bg; color?: string; cam?: CamKey[]; children?: React.ReactNode; groundY?: number; tint?: string; shake?: [number, number][];
  bgProps?: Record<string, unknown>;
}> = ({ bg = "studio", color, cam, children, groundY, tint, shake, bgProps }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const portrait = H > W;
  const gy = groundY ?? (portrait ? H * 0.74 : H * 0.83);
  const z = cam ? kf(f, cam.map(([t, v]) => [t, v.z ?? 1])) : 1;
  const cx = cam ? kf(f, cam.map(([t, v]) => [t, v.x ?? W / 2])) : W / 2;
  const cy = cam ? kf(f, cam.map(([t, v]) => [t, v.y ?? H / 2])) : H / 2;
  const rot = cam ? kf(f, cam.map(([t, v]) => [t, v.r ?? 0])) : 0;
  let sx = 0, sy = 0;
  for (const [a, b] of shake ?? []) if (f >= a && f <= b) { const k = 1 - (f - a) / (b - a + 1); sx += Math.sin(f * 3.1) * 14 * k; sy += Math.cos(f * 2.7) * 10 * k; }
  const tr = `translate(${W / 2 + sx} ${H / 2 + sy}) rotate(${rot}) scale(${z}) translate(${-cx} ${-cy})`;
  return (
    <Ctx.Provider value={{ W, H, gy, portrait }}>
      <AbsoluteFill>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
          <g transform={tr}>
            <Background bg={bg} W={W} H={H} gy={gy} f={f} color={color} {...(bgProps ?? {})} />
            {children}
          </g>
          {tint && <rect x={0} y={0} width={W} height={H} fill={tint} />}
        </svg>
      </AbsoluteFill>
    </Ctx.Provider>
  );
};

const Cloud: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#FFFFFF" stroke={OUT} strokeWidth={4}>
    <path d="M -90 0 C -110 0, -110 -40, -80 -42 C -76 -80, -20 -86, -6 -56 C 10 -90, 70 -80, 66 -42 C 100 -44, 106 0, 80 0 Z" />
  </g>
);

const Background: React.FC<{ bg: Bg; W: number; H: number; gy: number; f: number; color?: string; sign?: string; screens?: number }> = ({ bg, W, H, gy, f, color, sign }) => {
  const sky = (top = "#9ED6EE", bot = "#E8F6F8") => (
    <>
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bot} /></linearGradient></defs>
      <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="url(#sky)" />
      {[0, 1, 2, 3].map((i) => <Cloud key={i} x={((rnd(i) * W * 1.4 + f * (0.4 + rnd(i + 9) * 0.5)) % (W * 1.4)) - W * 0.2} y={H * (0.08 + rnd(i + 4) * 0.22)} s={0.6 + rnd(i + 2) * 0.6} />)}
    </>
  );
  const ground = (top: string, band?: string) => (
    <>
      <rect x={-W} y={gy} width={W * 3} height={H * 2} fill={top} stroke={OUT} strokeWidth={LW} />
      {band && <rect x={-W} y={gy} width={W * 3} height={(H - gy) * 0.35} fill={band} stroke={OUT} strokeWidth={4} />}
    </>
  );
  switch (bg) {
    case "none": return null;
    case "sky": return <>{sky()}{ground(K.grass)}</>;
    case "studio": {
      const c = color ?? "#F4E7CF";
      return (
        <>
          <defs><radialGradient id="studio" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></radialGradient>
            <pattern id="dots" width="44" height="44" patternUnits="userSpaceOnUse"><circle cx="22" cy="22" r="3" fill={OUT} opacity="0.07" /></pattern></defs>
          <rect x={-W} y={-H} width={W * 3} height={H * 3} fill={c} />
          <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="url(#dots)" />
          <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="url(#studio)" />
          <ellipse cx={W / 2} cy={gy + 8} rx={W * 0.42} ry={36} fill="rgba(0,0,0,0.06)" />
        </>
      );
    }
    case "town": {
      return (
        <>
          {sky()}
          <path d={`M ${-W} ${gy - 120} C ${W * 0.2} ${gy - 260}, ${W * 0.5} ${gy - 120}, ${W * 0.8} ${gy - 220} S ${W * 1.6} ${gy - 140}, ${W * 2} ${gy - 160} L ${W * 2} ${gy} L ${-W} ${gy} Z`} fill="#A8D88C" stroke={OUT} strokeWidth={4} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = -W * 0.1 + i * (W * 0.26);
            return i % 2 ? <g key={i} transform={`translate(${x} ${gy - 30})`}><Tree s={0.9 + rnd(i) * 0.3} /></g>
              : <g key={i} transform={`translate(${x} ${gy - 30})`}><House color={[K.paper, "#FFD9C2", "#D7ECFF", "#FFF1B8"][i % 4]} roof={[K.red, K.navy, K.teal, K.orange][i % 4]} s={0.75} /></g>;
          })}
          {ground(K.grass, K.walk)}
        </>
      );
    }
    case "city":
    case "wallst":
    case "night": {
      const dark = bg !== "city";
      return (
        <>
          {bg === "night" ? <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="#1E2A4A" /> : sky(dark ? "#8FB5D6" : "#9ED6EE", dark ? "#DCE8F0" : "#E8F6F8")}
          {bg === "night" && Array.from({ length: 40 }).map((_, i) => <circle key={i} cx={rnd(i) * W} cy={rnd(i + 50) * H * 0.5} r={1.5 + rnd(i + 3) * 2} fill="#FFF7D6" opacity={0.5 + 0.5 * Math.sin(f / 10 + i)} />)}
          {Array.from({ length: 11 }).map((_, i) => {
            const w = 160 + rnd(i) * 140, h = (dark ? 420 : 300) + rnd(i + 20) * (dark ? 420 : 300);
            const x = -W * 0.15 + i * (W * 0.13);
            const col = dark ? ["#6C7A91", "#58657B", "#7D8BA0", "#4D586B"][i % 4] : ["#E8D3B0", "#C9D9E8", "#F0C6A8", "#D5E5C8"][i % 4];
            return <g key={i} transform={`translate(${x} ${gy - 4})`}><Building w={w} h={h} color={col} windows={bg === "night" ? "#FFE58A" : undefined} /></g>;
          })}
          {ground("#8C8A90", K.walk)}
          {bg === "wallst" && <g transform={`translate(${W * 0.82} ${gy})`}>
            <rect x={-6} y={-300} width={12} height={300} fill="#3F5B3F" stroke={OUT} strokeWidth={4} />
            <rect x={-110} y={-320} width={220} height={60} rx={6} fill="#2F6B3A" stroke={OUT} strokeWidth={5} />
            <text x={0} y={-278} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={38} fill="#FFFFFF">{sign ?? "WALL ST"}</text>
          </g>}
        </>
      );
    }
    case "office":
    case "room":
    case "court": {
      const wall = bg === "office" ? "#EDE3CF" : bg === "court" ? "#C9A27A" : "#F4D9C0";
      const wx = W * 0.62, ww = Math.min(W * 0.3, 560), wy = gy - (H > W ? 900 : 640), wh = H > W ? 520 : 400;
      return (
        <>
          <rect x={-W} y={-H} width={W * 3} height={H * 3} fill={wall} />
          {bg === "court" && Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-W * 0.1 + i * W * 0.15} y={0} width={18} height={gy} fill="rgba(0,0,0,0.08)" />)}
          {bg !== "court" && <g>
            <rect x={wx} y={wy} width={ww} height={wh} fill={bg === "room" ? "#26365F" : "#BFE3F2"} stroke={OUT} strokeWidth={LW} />
            {Array.from({ length: 5 }).map((_, i) => <rect key={i} x={wx + 20 + i * (ww / 5)} y={wy + wh - 80 - rnd(i) * 160} width={ww / 6} height={80 + rnd(i) * 160} fill={bg === "room" ? "#3B4C7A" : "#9FB6C9"} stroke={OUT} strokeWidth={3} />)}
            <rect x={wx} y={wy} width={ww} height={wh} fill="none" stroke={OUT} strokeWidth={LW} />
            <path d={`M ${wx + ww / 2} ${wy} L ${wx + ww / 2} ${wy + wh} M ${wx} ${wy + wh / 2} L ${wx + ww} ${wy + wh / 2}`} stroke={K.white} strokeWidth={10} />
            <rect x={wx - 10} y={wy + wh} width={ww + 20} height={16} fill={K.paper} stroke={OUT} strokeWidth={4} />
          </g>}
          {bg === "room" && <g transform={`translate(${W * 0.25} ${gy})`}>
            <rect x={-200} y={-150} width={400} height={110} rx={30} fill="#7B8FC4" stroke={OUT} strokeWidth={LW} />
            <rect x={-230} y={-80} width={460} height={80} rx={24} fill="#6A7DB2" stroke={OUT} strokeWidth={LW} />
          </g>}
          {bg === "office" && <g transform={`translate(${W * 0.08} ${gy})`}>
            <path d="M -40 0 L -30 -80 L 30 -80 L 40 0 Z" fill={K.brick} stroke={OUT} strokeWidth={4} />
            {[-1, 0, 1].map((i) => <ellipse key={i} cx={i * 30} cy={-120 - Math.abs(i) * -10} rx={22} ry={60} transform={`rotate(${i * 25} ${i * 30} -80)`} fill={K.grass2} stroke={OUT} strokeWidth={4} />)}
          </g>}
          <rect x={-W} y={gy} width={W * 3} height={H * 2} fill={bg === "court" ? "#8A5E3C" : K.floor} stroke={OUT} strokeWidth={LW} />
          {Array.from({ length: 16 }).map((_, i) => <path key={i} d={`M ${-W * 0.2 + i * 160} ${gy} L ${-W * 0.2 + i * 160 - 120} ${H * 1.5}`} stroke={OUT} strokeWidth={2} opacity={0.15} />)}
        </>
      );
    }
    case "bank": {
      return (
        <>
          {sky()}
          <g transform={`translate(${W / 2} ${gy})`}><Building w={Math.min(W * 0.62, 900)} h={H > W ? 640 : 520} color="#E8DDC8" roof="columns" label={sign ?? "BANK"} /></g>
          {ground("#B9B3A6", K.walk)}
        </>
      );
    }
    case "trading": {
      const cols = H > W ? 3 : 6, rows = 3;
      const sw = W / cols - 30, shh = (gy - 120) / rows - 30;
      return (
        <>
          <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="#16213A" />
          {Array.from({ length: rows }).map((_, r) => Array.from({ length: cols }).map((_, c) => {
            const x = 15 + c * (W / cols), y = 40 + r * (shh + 30);
            const up = rnd(r * 9 + c) > 0.45;
            const pts = Array.from({ length: 12 }).map((_, k) => `${x + 16 + k * (sw - 32) / 11},${y + shh / 2 + Math.sin(k * 1.3 + r + c + f / 18) * shh * 0.18 + (up ? -k : k) * shh * 0.025}`).join(" ");
            return (
              <g key={`${r}${c}`}>
                <rect x={x} y={y} width={sw} height={shh} rx={8} fill="#0E1626" stroke={OUT} strokeWidth={4} />
                <polyline points={pts} fill="none" stroke={up ? K.gain : K.loss} strokeWidth={5} strokeLinejoin="round" />
                <text x={x + 16} y={y + 30} fontFamily={CF.mono} fontSize={20} fill="#8FA3BF">{["GME", "AAPL", "TSLA", "SPY", "AMC", "NVDA", "GOLD", "EUR", "OIL"][(r * cols + c) % 9]}</text>
              </g>
            );
          }))}
          <rect x={-W} y={gy} width={W * 3} height={H * 2} fill="#283550" stroke={OUT} strokeWidth={LW} />
        </>
      );
    }
  }
};

/** Floor-standing objects helper: puts children at ground level, x in world units. */
export const OnGround: React.FC<{ x: number; dy?: number; s?: number; children: React.ReactNode }> = ({ x, dy = 0, s = 1, children }) => {
  const { gy } = useStage();
  return <g transform={`translate(${x} ${gy + dy}) scale(${s})`}>{children}</g>;
};
