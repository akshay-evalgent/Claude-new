// Render a motion scene to video frames (or one PNG) and write its sound cues.
//
//   node courses/motion/render.cjs levels out.mp4 [--samples 6] [--fps 30]
//   node courses/motion/render.cjs levels frame.png --frame 3.2
//
// Writes out.cues.json next to the video: [{t, s, g}] for voices/make_motion.py to mix.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

(async () => {
  const [scene, out, ...rest] = process.argv.slice(2);
  const arg = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? parseFloat(rest[i + 1]) : d; };
  const samples = arg('--samples', 6), fps = arg('--fps', 30), frame = arg('--frame', null);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('scene error:', e.message); process.exitCode = 1; });
  await page.goto('file://' + path.join(__dirname, 'stage.html') + '?scene=' + scene);
  await page.evaluate(() => window.fontsReady());
  const info = await page.evaluate(() => window.sceneInfo());
  if (frame !== null) {
    await page.evaluate(([t, s, f]) => window.renderAt(t, s, f), [frame, samples, fps]);
    fs.writeFileSync(out, await page.screenshot({ type: 'png' }));
    await browser.close();
    return;
  }
  fs.writeFileSync(out.replace(/\.[^.]+$/, '.cues.json'), JSON.stringify(info));
  const n = Math.round(info.duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '14', '-preset', 'slow', '-tune', 'animation', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c ? rej(new Error('ffmpeg exited ' + c)) : res())));
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate(([t, s, f]) => window.renderAt(t, s, f), [i / fps, samples, fps]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await done; await browser.close();
  console.log(`  ${scene}: ${n} frames, ${samples} sub-frames each, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
})().catch((e) => { console.error(e); process.exit(1); });
