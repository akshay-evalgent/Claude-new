import { Config } from "@remotion/cli/config";

// WebGL backend for headless Chrome.
//  - "angle"   -> uses the GPU. Pick this on any machine that has one (much faster).
//  - "swangle" -> SwiftShader software GL. Works on GPU-less CI/cloud boxes, slower.
// Override per run with: npx remotion render ... --gl=swangle
Config.setChromiumOpenGlRenderer("angle");

// Lossless-ish intermediate frames, then a high-quality H.264 for Shorts/Reels/TikTok.
Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");

// Each WebGL tab needs real memory/GPU time; don't open too many.
Config.setConcurrency(2);
// Loading a 6 MB HDRI + GLB + compiling physical/post shaders can take a while on software GL.
Config.setDelayRenderTimeoutInMilliseconds(120_000);

// Use a local Chrome/Chromium headless shell instead of Remotion's download, if you want:
//   REMOTION_BROWSER=/path/to/chrome-headless-shell npx remotion render ...
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
