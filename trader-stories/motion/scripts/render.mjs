// Render compositions.
//   npm run render -- "xx-05"            every Xu Xiang shot in section 5
//   npm run render -- gallery            the preview reel
//   npm run render -- "xx-" --stills     one frame per shot (for contact sheets), as JPEG
//   npm run render -- "xx-" --prores     ProRes 422 HQ instead of H.264
// Overlays (xx-ov-*, xx-scoreboard) always render as ProRes 4444 with alpha.
// Set REMOTION_BROWSER to an installed Chrome / headless shell to skip the download.
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia, renderStill } from "@remotion/renderer";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const pattern = new RegExp(args.find((a) => !a.startsWith("--")) ?? ".");
const stills = args.includes("--stills");
const prores = args.includes("--prores");
const at = Number((args.find((a) => a.startsWith("--at=")) ?? "--at=0.8").slice(5)); // still position, 0-1
const outDir = path.join(root, "out");
fs.mkdirSync(outDir, { recursive: true });
const browserExecutable = process.env.REMOTION_BROWSER || null;

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const comps = (await getCompositions(serveUrl, { browserExecutable })).filter((c) => pattern.test(c.id));
console.log(`${comps.length} compositions`);
const failed = [];
for (const c of comps) {
  const t0 = Date.now();
  try {
  const alpha = c.id.startsWith("xx-ov") || c.id === "xx-scoreboard";
  if (stills) {
    const output = path.join(outDir, "stills", `${c.id}.${alpha ? "png" : "jpg"}`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await renderStill({ composition: c, serveUrl, output, frame: Math.min(c.durationInFrames - 1, Math.floor(c.durationInFrames * at)), browserExecutable, imageFormat: alpha ? "png" : "jpeg", ...(alpha ? {} : { jpegQuality: 90 }) });
  } else {
    const ext = alpha || prores ? "mov" : "mp4";
    await renderMedia({
      composition: c, serveUrl, browserExecutable, outputLocation: path.join(outDir, `${c.id}.${ext}`),
      ...(alpha
        ? { codec: "prores", proResProfile: "4444", imageFormat: "png", pixelFormat: "yuva444p10le" }
        : prores ? { codec: "prores", proResProfile: "hq" } : { codec: "h264", crf: 16 }),
    });
  }
  console.log(`${c.id}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e) {
    failed.push(c.id);
    console.error(`FAILED ${c.id}: ${String(e.message ?? e).split("\n")[0]}`);
  }
}
if (failed.length) { console.error(`${failed.length} failed: ${failed.join(", ")}`); process.exit(1); }
