// Render the full film (video only; audio is mixed separately and muxed after).
//   node scripts/render-film.mjs [out/xx-film-video.mp4]
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = process.argv[2] || path.join(root, process.env.FILM_OUT || "out/xx-film-video.mp4");
const browserExecutable = process.env.REMOTION_BROWSER || null;
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: process.env.FILM_ID || "xx-film", browserExecutable });
const t0 = Date.now(); let last = -1;
await renderMedia({
  composition, serveUrl, browserExecutable, outputLocation: out, codec: "h264", crf: 18, muted: true,
  concurrency: Number(process.env.CONCURRENCY || 4), timeoutInMilliseconds: 120000,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 100);
    if (p !== last && p % 5 === 0) { last = p; console.log(`${p}%  ${((Date.now() - t0) / 60000).toFixed(1)} min`); }
  },
});
console.log("done", out, ((Date.now() - t0) / 60000).toFixed(1), "min");
