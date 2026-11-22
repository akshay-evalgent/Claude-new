// Render several stills of an explainer in one bundle: node scripts/stills-ex.mjs <id> <outdir> f1 f2 ...
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const [id, outdir, ...frames] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const browserExecutable = process.env.REMOTION_BROWSER || null;
const chromiumOptions = process.env.GL === "default" ? {} : { gl: process.env.GL || "swangle" };
const serveUrl = await bundle({ entryPoint: path.join(root, "src/ex/index.ts") });
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
for (const fr of frames) {
  const out = path.join(outdir, `${id}_${String(fr).padStart(5, "0")}.jpg`);
  await renderStill({ composition, serveUrl, browserExecutable, chromiumOptions, frame: Number(fr), output: out, imageFormat: "jpeg", jpegQuality: 85, scale: 0.5 });
  console.log(out);
}
