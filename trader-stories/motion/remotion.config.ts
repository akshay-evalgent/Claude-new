import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
// Set REMOTION_BROWSER to use an installed Chrome instead of downloading one.
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);

// three.js scenes need WebGL; SwiftShader-ANGLE works headless without a GPU.
Config.setChromiumOpenGlRenderer("swangle");
