// Seeks web/index.html frame by frame and pipes JPEGs into ffmpeg (video only; mux.sh adds sound and grain).
// usage: node tools/render.js [stills t1,t2,...]
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..'); const FPS = 30, DUR = 30.0;
const URL = process.env.FILM_URL || 'http://localhost:8767/web/index.html';
(async () => {
  const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--disable-gpu'] }); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.error('PAGEERROR', e.message)); p.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await p.goto(URL, { waitUntil: 'networkidle' }); await p.evaluate(() => window.__ready);
  const stage = await p.$('#stage');
  if (process.argv[2] === 'stills') {
    fs.mkdirSync(path.join(ROOT, 'out', 'stills'), { recursive: true });
    for (const t of process.argv[3].split(',').map(Number)) { await p.evaluate(t => window.render(t), t); await stage.screenshot({ path: path.join(ROOT, 'out', 'stills', `t${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 88 }); }
    await b.close(); return;
  }
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', path.join(ROOT, 'out', 'video_only.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(DUR * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => window.render(t), i / FPS);
    const buf = await stage.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); console.log(`rendered ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`); await b.close();
})();
