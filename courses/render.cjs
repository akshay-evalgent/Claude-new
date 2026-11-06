// Render episode.html frame by frame into an H.264 video, or one frame into a PNG.
//
//   node courses/render.cjs config.json out.mp4
//   node courses/render.cjs config.json cover.png --frame 31.5
//
// Called by voices/make_episode.py, which writes config.json.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

(async () => {
  const [cfgPath, out, ...rest] = process.argv.slice(2);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const fi = rest.indexOf('--frame');
  const single = fi >= 0 ? parseFloat(rest[fi + 1]) : null;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('scene error:', e.message); process.exitCode = 1; });
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto('file://' + path.join(__dirname, 'episode.html'));
  // fonts load on first use, so ask for them before the first frame or it falls back to a serif
  await page.evaluate(() => Promise.all(['700 40px Kalam', '400 40px Kalam', '700 40px Baloo'].map((f) => document.fonts.load(f))));
  await page.evaluate((c) => window.setup(c), cfg);

  if (single !== null) {
    await page.evaluate((t) => window.renderAt(t), single);
    fs.writeFileSync(out, await page.screenshot({ type: 'png' }));
    await browser.close();
    return;
  }

  const frames = Math.round(cfg.duration * cfg.fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(cfg.fps),
    '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c ? rej(new Error('ffmpeg exited ' + c)) : res())));
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.renderAt(t), i / cfg.fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (cfg.fps * 5) === 0) console.log(`  frame ${i}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log(`  rendered ${frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
})().catch((e) => { console.error(e); process.exit(1); });
