import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';

export const FPS = 60;
export const W = 1080;
export const H = 1920;

// Layout of the split frame (px). Bottom 400px stays clear for the Shorts title/UI.
export const PANEL_H = 630;
export const TOP_Y = 168;
export const BAND_H = 92;
export const BOT_Y = TOP_Y + PANEL_H + BAND_H;
export const GROUND = 592; // floor line inside a panel

export const FONT = "'Fredoka', 'Noto Color Emoji', sans-serif";
export const MONO = "'JetBrains Mono', 'Noto Color Emoji', monospace";

export const C = {
  ink: '#241d2b',
  inkSoft: '#3a3142',
  paper: '#fffaf0',
  gold: '#f6b93b',
  goldDeep: '#d9931a',
  bad: '#ff6b6b',
  good: '#5be3a3',
  bg: '#0b0a0f',
};

export type Look = {
  skin: string;
  shirt: string;
  stripe?: string;
  pants: string;
  shoes: string;
  hair: string;
  hairStyle: 'messy' | 'bun' | 'short' | 'pigtails' | 'swoop';
  blush?: boolean;
  glasses?: boolean;
};

export const LOOKS: Record<string, Look> = {
  // The kid: mustard shirt with a red stripe, so viewers can track him across ages.
  leo: {skin: '#f2c9a0', shirt: '#f2b230', stripe: '#d9483b', pants: '#3f5a8a', shoes: '#2b2b36', hair: '#4a2d1f', hairStyle: 'messy', blush: true},
  leoTeen: {skin: '#f2c9a0', shirt: '#e9a827', stripe: '#c8402f', pants: '#2f3e5e', shoes: '#efefef', hair: '#4a2d1f', hairStyle: 'swoop'},
  leoAdult: {skin: '#f0c59b', shirt: '#e3a52a', stripe: '#c0392b', pants: '#33415f', shoes: '#3a2a22', hair: '#4a2d1f', hairStyle: 'short'},
  mom: {skin: '#e9b48c', shirt: '#2f9c8f', pants: '#2c2f45', shoes: '#5a3a2a', hair: '#2b1b14', hairStyle: 'bun'},
  mia: {skin: '#f2c9a0', shirt: '#7cc6f2', pants: '#e2678a', shoes: '#f4f4f4', hair: '#4a2d1f', hairStyle: 'pigtails', blush: true},
};
