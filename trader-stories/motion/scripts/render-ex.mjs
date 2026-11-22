// Render an explainer composition (video only; audio is mixed by explainers/tools/mix.py and muxed after).
//   node scripts/render-ex.mjs <composition-id> <out.mp4> [--frames=a-b]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const [id, outArg] = process.argv.slice(2);
const fr = process.argv.find((a) => a.startsWith("--frames="));
const frameRange = fr ? fr.slice(9).split("-").map(Number) : null;
const browserExecutable = process.env.REMOTION_BROWSER || null;
const chromiumOptions = process.env.GL === "default" ? {} : { gl: process.env.GL || "swangle" };
const serveUrl = await bundle({ entryPoint: path.join(root, "src/ex/index.ts") });
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions });
const t0 = Date.now(); let last = -1;
await renderMedia({
  composition, serveUrl, browserExecutable, chromiumOptions, outputLocation: path.resolve(outArg), codec: "h264", crf: 17, muted: true,
  frameRange, concurrency: Number(process.env.CONCURRENCY || 4), timeoutInMilliseconds: 180000, imageFormat: "jpeg", jpegQuality: 93,
  onProgress: ({ progress }) => { const p = Math.floor(progress * 100); if (p !== last && p % 10 === 0) { last = p; console.log(`${p}%  ${((Date.now() - t0) / 60000).toFixed(1)} min`); } },
});
console.log("done", outArg, ((Date.now() - t0) / 60000).toFixed(1), "min");
