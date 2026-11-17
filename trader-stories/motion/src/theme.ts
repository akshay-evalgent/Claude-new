import { Easing, interpolate } from "remotion";

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// Two-colour rule: gain and loss are used for money going up or down, nowhere else.
export const C = {
  ink: "#0E0F11",
  ink2: "#15171A",
  land: "#1C2024",
  slate: "#2B3036",
  line: "#3B424A",
  muted: "#8A9097",
  paperDim: "#B8B1A1",
  paper: "#ECE5D3",
  sheet: "#E6DEC9",
  sheetInk: "#1B1B1A",
  ochre: "#C4923F",
  gain: "#5DB176",
  loss: "#D4523F",
  board: "#1A1E1C",
  chalk: "#E8E5DA",
};

export type Tone = "paper" | "muted" | "ochre" | "gain" | "loss" | "ink";
export const tone = (t: Tone | undefined, fallback: string = C.paper) =>
  t ? ({ paper: C.paper, muted: C.muted, ochre: C.ochre, gain: C.gain, loss: C.loss, ink: C.sheetInk } as const)[t] : fallback;

export const F = {
  display: "Oswald",
  mono: "IBM Plex Mono",
  sans: "IBM Plex Sans",
  serif: "Source Serif 4",
  cjk: "Noto Serif SC",
};
// Latin text falls back to the CJK face for Chinese characters inside a line.
export const font = (f: keyof typeof F) => `"${F[f]}", "${F.cjk}", sans-serif`;

export const SAFE = { x: 140, y: 100 };

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const sec = (s: number) => Math.round(s * FPS);

/** 0 to 1 starting at `at` frames, lasting `dur` frames, eased out. */
export const prog = (frame: number, at: number, dur = 18, e = ease) =>
  interpolate(frame, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
export const fmtNum = (n: number, decimals = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Deterministic pseudo-random in [0,1) for seed i. */
export const rand = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
