// Render the pilot with headless Chromium.
//   node render.mjs stills [t1 t2 ...]   -> build/stills/*.png (default: middle of every shot)
//   node render.mjs video [workers]       -> build/video.mp4 (silent, 30 fps)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILD = path.join(HERE, 'build');
const FPS = 30;
const TL = JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline.json'), 'utf8'));
const mode = process.argv[2] || 'stills';

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(HERE, 'scenes.html'));
  await page.evaluate(async tl => { await document.fonts.load('80px Hand'); await document.fonts.load('60px Cap'); await document.fonts.ready; window.setTimeline(tl); }, TL);
  return page;
}

const browser = await chromium.launch();
if (mode === 'stills') {
  const dir = path.join(BUILD, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  const page = await openPage(browser);
  const times = process.argv.length > 3 ? process.argv.slice(3).map(Number) : TL.shots.map(s => s.start + (s.end - s.start) * 0.75);
  for (const t of times) {
    const id = await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(dir, `${t.toFixed(2).padStart(6, '0')}_${id}.png`) });
  }
  console.log('stills', times.length);
} else {
  const workers = Number(process.argv[3] || 4);
  const total = Math.ceil(TL.duration * FPS);
  const per = Math.ceil(total / workers);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = w * per, b = Math.min(total, a + per);
    const page = await openPage(browser);
    const out = path.join(BUILD, `seg${w}.mp4`);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) {
      await page.evaluate(t => window.renderAt(t), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - a) % 150 === 0) console.log(`worker ${w}: frame ${f - a}/${b - a} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }));
  fs.writeFileSync(path.join(BUILD, 'segs.txt'), Array.from({ length: workers }, (_, w) => `file 'seg${w}.mp4'`).join('\n') + '\n');
  await new Promise(r => spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(BUILD, 'segs.txt'), '-c', 'copy', path.join(BUILD, 'video.mp4')], { stdio: 'inherit' }).on('close', r));
  console.log(`video: ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
