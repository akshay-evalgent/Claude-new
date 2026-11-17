import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import faces from "./fonts.json";

let started = false;
export const loadHouseFonts = () => {
  if (started) return;
  started = true;
  for (const f of faces as { family: string; weight: string; style: string; file: string }[]) {
    loadFont({ family: f.family, url: staticFile(`fonts/${f.file}`), weight: f.weight, style: f.style, display: "block" });
  }
};
