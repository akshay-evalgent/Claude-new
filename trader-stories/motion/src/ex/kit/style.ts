import { Easing, interpolate } from "remotion";

// Cartoon house style: thick warm-black outlines, flat fills, soft pastel worlds.
export const OUT = "#211B17";
export const LW = 5; // base outline width (character units)

export const K = {
  out: OUT,
  paper: "#FFF8EC",
  cream: "#F6EBD5",
  sky: "#BFE3F2",
  sky2: "#E6F4F7",
  grass: "#8BCB6B",
  grass2: "#6DB257",
  road: "#7D7A80",
  walk: "#D9D2C5",
  wall: "#F1E3C8",
  floor: "#C9A57A",
  wood: "#B07A4E",
  brick: "#D27A5C",
  navy: "#2F3E66",
  teal: "#2FA39A",
  red: "#E24B3B",
  orange: "#F29A38",
  yellow: "#F7CF3D",
  lemon: "#FBE35A",
  green: "#3FAE5A",
  gain: "#2FB36B",
  loss: "#E5483A",
  pink: "#F2A0A8",
  purple: "#7B5CC4",
  blue: "#3E8EDE",
  grey: "#9AA0A8",
  dark: "#2B2D33",
  white: "#FFFFFF",
  gold: "#E9B543",
};

export const SKIN = ["#F9D7B5", "#EFC19A", "#D9A076", "#B97B52", "#8E5A3B", "#6A412A"];

export const CF = {
  caption: `"Montserrat", sans-serif`,
  label: `"Fredoka", "Montserrat", sans-serif`,
  hand: `"Patrick Hand", "Fredoka", sans-serif`,
  mono: `"IBM Plex Mono", monospace`,
};

export const pop = Easing.bezier(0.34, 1.56, 0.64, 1); // overshoot
export const smooth = Easing.bezier(0.45, 0, 0.25, 1);
export const out = Easing.bezier(0.16, 1, 0.3, 1);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** 0..1 from frame a over d frames */
export const p01 = (f: number, a: number, d = 12, e = out) => interpolate(f, [a, a + d], [0, 1], { ...clamp, easing: e });
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Keyframed value: [[frame, value], ...] with smooth easing between keys. */
export function kf(f: number, keys: [number, number][], e = smooth): number {
  if (!keys.length) return 0;
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1] = keys[i];
    const [f0, v0] = keys[i - 1];
    if (f <= f1) return f1 === f0 ? v1 : lerp(v0, v1, e((f - f0) / (f1 - f0)));
  }
  return keys[keys.length - 1][1];
}

export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
