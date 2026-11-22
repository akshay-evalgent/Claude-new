// Step 2 of a Spike Files v2 render: draw every frame in headless Chromium and encode.
//   node render.js <url> <out.mp4> [from] [to] [sfx.json]      frames [from, to)
//   node render.js <url> <out.png> <frame>                      one frame, for checking
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const [url, out, a, b, sfxOut] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('PAGE ERR', m.text()); });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(url);
  await page.waitForFunction('window.READY === true', null, { timeout: 180000 });
  const info = await page.evaluate(() => ({ frames: window.FRAMES, sfx: window.SFX, breaks: window.BREAKS, meta: window.META || null }));
  if (sfxOut) fs.writeFileSync(sfxOut, JSON.stringify({ sfx: info.sfx, breaks: info.breaks, frames: info.frames, ...(info.meta || {}) }));
  if (out.endsWith('.png') || out.endsWith('.jpg')) {
    await page.evaluate(f => window.setFrame(f), +a);
    await page.screenshot({ path: out, type: out.endsWith('.png') ? 'png' : 'jpeg' });
  } else {
    const A = +a || 0, B = Math.min(+b || info.frames, info.frames);
    const ff = spawn('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '30', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = A; f < B; f++) {
      await page.evaluate(f => window.setFrame(f), f);
      const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log(out, A, B);
  }
  await browser.close();
})();
