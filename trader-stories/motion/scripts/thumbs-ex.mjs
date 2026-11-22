import path from "node:path";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill } from "@remotion/renderer";
const root = "/home/user/Claude-new/trader-stories/motion";
const [outdir, ...ids] = process.argv.slice(2);
const browserExecutable = process.env.REMOTION_BROWSER;
const serveUrl = await bundle({ entryPoint: path.join(root, "src/ex/index.ts") });
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id: `thumb-${id}`, browserExecutable });
  await renderStill({ composition, serveUrl, browserExecutable, frame: 0, output: path.join(outdir, `${id}.jpg`), imageFormat: "jpeg", jpegQuality: 92 });
  console.log(id);
}
