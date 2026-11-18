// Render one frame from the middle of chosen shots of the full film: node scripts/film-stills.mjs 02.01 04.09 ...
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const shots = JSON.parse(fs.readFileSync(path.join(root, "src/films/xu-xiang/shots.json"), "utf8"));
const browserExecutable = process.env.REMOTION_BROWSER || null;
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "xx-film", browserExecutable });
fs.mkdirSync(path.join(root, "out/film-stills"), { recursive: true });
let f = 0; const starts = {};
for (const s of shots) { starts[s.id] = [f, Math.round(s.seconds * 30)]; f += Math.max(1, Math.round(s.seconds * 30)); }
for (const id of process.argv.slice(2)) {
  const [a, n] = starts[id];
  await renderStill({ composition, serveUrl, browserExecutable, frame: a + Math.floor(n * 0.6), output: path.join(root, `out/film-stills/${id}.jpg`), imageFormat: "jpeg", jpegQuality: 85 });
  console.log(id, "frame", a + Math.floor(n * 0.6));
}
