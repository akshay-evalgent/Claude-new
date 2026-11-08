// Renders index.html frame by frame (GSAP timeline seek) and pipes the frames into ffmpeg with mix.wav.
// usage: node render.js [stills]   -> "stills" writes 8 check frames to ./stills instead of the full film
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path');

const FPS = 24, W = 1080, H = 1920;
const URL = process.env.FILM_URL || 'http://localhost:8766/index.html?render=1';
const here = __dirname;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.__ready);
  const dur = await page.evaluate(() => window.__dur);

  if (process.argv[2] === 'stills') {
    fs.mkdirSync(path.join(here, 'stills'), { recursive: true });
    for (const t of [0.6, 4.2, 8.6, 16.4, 23.4, 29.0, 34.0, 39.0]) {
      await page.evaluate(t => window.__seek(t), t);
      await page.screenshot({ path: path.join(here, 'stills', `t_${t.toFixed(1)}.jpg`), type: 'jpeg', quality: 90 });
    }
    await browser.close(); return;
  }

  const frames = Math.round(dur * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', path.join(here, 'mix.wav'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(here, 'mamaearth-explainer.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.__seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log(`done: ${frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await browser.close();
})();
