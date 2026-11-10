#!/usr/bin/env node
// Renders store images, screenshots and gameplay videos into listings/images
// and listings/video. Needs a build (node tools/build.mjs), Playwright + Chromium,
// and ffmpeg with libx264 for the videos.
//   node tools/assets.mjs            everything
//   node tools/assets.mjs images     images and screenshots only
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { serve } from "./serve.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMG = path.join(ROOT, "listings", "images");
const VID = path.join(ROOT, "listings", "video");

// [file name, width, height, show title, optional subtitle]
const COVERS = [
  ["crazygames-cover-landscape-1920x1080", 1920, 1080, true],
  ["crazygames-cover-portrait-800x1200", 800, 1200, true],
  ["crazygames-cover-square-800x800", 800, 800, true],
  ["poki-thumbnail-1024x1024-notext", 1024, 1024, false],
  ["gamedistribution-512x512", 512, 512, true],
  ["gamedistribution-512x384", 512, 384, true],
  ["gamedistribution-200x120", 200, 120, true],
  ["gamedistribution-1280x550", 1280, 550, true],
  ["gamedistribution-1280x720", 1280, 720, true],
  ["gamemonetize-512x384", 512, 384, true],
  ["y8-card-760x570", 760, 570, true],
  ["y8-promo-1920x1080", 1920, 1080, true],
  ["y8-promo-1080x1920", 1080, 1920, true],
  ["itch-cover-630x500", 630, 500, true],
  ["template-cover-1280x720", 1280, 720, true, "HTML5 GAME TEMPLATE"],
  ["template-thumbnail-600x600", 600, 600, true, "HTML5 TEMPLATE"],
  ["template-itch-cover-630x500", 630, 500, true, "HTML5 GAME TEMPLATE"]
];

async function renderCovers(browser, base) {
  const page = await browser.newPage({ viewport: { width: 640, height: 600 } });
  await page.goto(`${base}/web/index.html?cover=1`);
  await page.waitForFunction(() => window.__COVER_READY === true);
  for (const [name, w, h, title, sub] of COVERS) {
    const url = await page.evaluate(([w2, h2, t, s]) => window.__CR.coverPNG(w2, h2, t, s), [w, h, title, sub || null]);
    fs.writeFileSync(path.join(IMG, `${name}.png`), Buffer.from(url.split(",")[1], "base64"));
    console.log(`  image  ${name}.png`);
  }
  await page.close();
}

// Opens the game with a manual clock so frames can be stepped deterministically.
async function openManual(browser, base, w, h, seed) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(`${base}/web/index.html?test=1&seed=${seed}`);
  await page.waitForFunction(() => window.__CR_READY === true);
  await page.evaluate(() => {
    const G = window.__CR.Game;
    G.manualClock = true;
    window.__CR.Storage.data.tutorialDone = true;
    window.__CR.Storage.data.kidTipDone = true; // keep tip boxes out of store footage
    window.__CR.Storage.data.coins = 480;
    window.__CR.Storage.data.owned = ["classic", "frost", "evergreen"];
  });
  return page;
}

const stepFrames = (page, n, fps) =>
  page.evaluate(([n2, f]) => { for (let i = 0; i < n2; i++) window.__CR.Game.step(1 / f); }, [n, fps]);

async function grab(page, file, type = "png") {
  const url = await page.evaluate((t) => window.__CR.Game.canvas.toDataURL(t === "png" ? "image/png" : "image/jpeg", 0.92), type);
  fs.writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
}

async function screenshots(browser, base) {
  const shots = [
    { w: 1280, h: 720, prefix: "screenshot", dir: IMG },
    { w: 1920, h: 1080, prefix: "screenshot-1080p", dir: IMG, only: [1] }
  ];
  for (const s of shots) {
    const page = await openManual(browser, base, s.w, s.h, 21);
    const want = (i) => !s.only || s.only.includes(i);
    await stepFrames(page, 20, 30);
    if (want(0)) { await grab(page, path.join(s.dir, `${s.prefix}-0-title.png`)); console.log(`  image  ${s.prefix}-0-title.png`); }
    await page.evaluate(() => { const G = window.__CR.Game; G.startRun(); G.autoplay = true; });
    await stepFrames(page, 30 * 6, 30);
    if (want(1)) { await grab(page, path.join(s.dir, `${s.prefix}-1-gameplay.png`)); console.log(`  image  ${s.prefix}-1-gameplay.png`); }
    await stepFrames(page, 30 * 14, 30);
    if (want(2)) { await grab(page, path.join(s.dir, `${s.prefix}-2-wind.png`)); console.log(`  image  ${s.prefix}-2-wind.png`); }
    await page.evaluate(() => { window.__CR.Game.autoplay = false; });
    await page.evaluate(() => { const G = window.__CR.Game; G.grace = 0; G.lives = 1; G.fail("missed", 300, 300); });
    await stepFrames(page, 30 * 3, 30);
    if (want(3)) { await grab(page, path.join(s.dir, `${s.prefix}-3-gameover.png`)); console.log(`  image  ${s.prefix}-3-gameover.png`); }
    await page.evaluate(() => { window.__CR.Game.state = "shop"; });
    await stepFrames(page, 5, 30);
    if (want(4)) { await grab(page, path.join(s.dir, `${s.prefix}-4-shop.png`)); console.log(`  image  ${s.prefix}-4-shop.png`); }
    await page.close();
  }
  // Y8 wants a 760x570 gameplay "thumbnail screenshot"
  const page = await openManual(browser, base, 760, 570, 33);
  await page.evaluate(() => { const G = window.__CR.Game; G.startRun(); G.autoplay = true; });
  await stepFrames(page, 30 * 9, 30);
  await grab(page, path.join(IMG, "y8-thumbnail-screenshot-760x570.png"));
  console.log("  image  y8-thumbnail-screenshot-760x570.png");
  await page.close();
}

// coverFrame: open on the static cover for half a second (CrazyGames asks for this).
async function video(browser, base, { name, w, h, seconds, fps, seed, startDeliveries, coverFrame }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cr-frames-"));
  const page = await openManual(browser, base, w, h, seed);
  const coverSecs = coverFrame ? 0.5 : 0;
  if (coverFrame) {
    const url = await page.evaluate(([w2, h2]) => window.__CR.coverPNG(w2, h2, true), [w, h]);
    fs.writeFileSync(path.join(tmp, "cover.png"), Buffer.from(url.split(",")[1], "base64"));
  }
  await page.evaluate((d) => {
    const G = window.__CR.Game;
    G.startRun();
    G.deliveries = d;
    G.autoplay = true;
  }, startDeliveries);
  await stepFrames(page, fps, fps); // settle for one second before recording
  const total = Math.round((seconds - coverSecs) * fps);
  for (let i = 0; i < total; i++) {
    await stepFrames(page, 1, fps);
    await grab(page, path.join(tmp, `${String(i).padStart(5, "0")}.jpg`), "jpg");
  }
  await page.close();
  const out = path.join(VID, `${name}.mp4`);
  const enc = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", "-an", "-movflags", "+faststart", out];
  if (coverFrame) {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error",
      "-loop", "1", "-framerate", String(fps), "-t", String(coverSecs), "-i", path.join(tmp, "cover.png"),
      "-framerate", String(fps), "-i", path.join(tmp, "%05d.jpg"),
      "-filter_complex", `[0:v]scale=${w}:${h},setsar=1,format=yuv420p[c];[1:v]scale=${w}:${h},setsar=1,format=yuv420p[g];[c][g]concat=n=2:v=1:a=0[v]`,
      "-map", "[v]", ...enc]);
  } else {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(tmp, "%05d.jpg"), ...enc]);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`  video  ${name}.mp4  (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
}

async function main() {
  if (!fs.existsSync(path.join(ROOT, "dist", "web", "index.html"))) {
    console.error("Build first: node tools/build.mjs");
    process.exit(1);
  }
  fs.mkdirSync(IMG, { recursive: true });
  fs.mkdirSync(VID, { recursive: true });
  const { server, port } = await serve(path.join(ROOT, "dist"));
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  await renderCovers(browser, base);
  await screenshots(browser, base);
  if (process.argv[2] !== "images") {
    // CrazyGames: 16:9 and 2:3, 15-20 s, no sound. Y8: 16:9, at least 1280x720 and 15 s.
    await video(browser, base, { name: "gameplay-1920x1080-16x9-20s", w: 1920, h: 1080, seconds: 20, fps: 30, seed: 41, startDeliveries: 9, coverFrame: true });
    await video(browser, base, { name: "gameplay-1080x1620-2x3-20s", w: 1080, h: 1620, seconds: 20, fps: 30, seed: 42, startDeliveries: 9, coverFrame: true });
    // Poki animated thumbnail: square, 50 fps, 4-6 s, muted (needed only at Poki soft release).
    await video(browser, base, { name: "poki-animated-thumbnail-1080x1080-5s-50fps", w: 1080, h: 1080, seconds: 5, fps: 50, seed: 43, startDeliveries: 12 });
  }
  await browser.close();
  server.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
