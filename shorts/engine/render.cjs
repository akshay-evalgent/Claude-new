#!/usr/bin/env node
/* Renders an episode to MP4 (or stills) with headless Chromium.
 *
 *   node shorts/engine/render.cjs shorts/episodes/mocha --fps 60 --workers 3
 *   node shorts/engine/render.cjs shorts/episodes/mocha --stills 0.5,3.2,10
 *   node shorts/engine/render.cjs shorts/episodes/mocha --from 20 --to 26 --fps 30
 *
 * Each worker is its own browser rendering a contiguous slice of frames and
 * piping JPEGs into its own ffmpeg. Slices are joined losslessly, then the
 * episode's audio (out/audio.wav, if present) is muxed in.
 */
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const epDir = path.resolve(args[0] || '.');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes('--' + k);
const fps = parseFloat(opt('fps', '60'));
const workers = parseInt(opt('workers', '3'), 10);
const outDir = path.join(epDir, 'out');
fs.mkdirSync(outDir, { recursive: true });
const html = 'file://' + path.join(epDir, 'index.html') + (opt('query') ? '?' + opt('query') : '');
const LAUNCH = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--allow-file-access-from-files'] };

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(html);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}

async function stills(list) {
  const browser = await chromium.launch(LAUNCH);
  const page = await openPage(browser);
  const dir = path.join(outDir, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t of list) {
    const data = await page.evaluate(t => SHORT.framePNG(t), t);
    const f = path.join(dir, `t_${t.toFixed(2).padStart(6, '0')}.png`);
    fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
    console.log(f);
  }
  await browser.close();
}

async function renderSlice(w, f0, f1, file) {
  const browser = await chromium.launch(LAUNCH);
  const page = await openPage(browser);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', opt('preset', 'slow'), '-crf', opt('crf', '20'), '-maxrate', opt('maxrate', '14M'), '-bufsize', '28M',
    '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-threads', '2', '-r', String(fps), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const data = await page.evaluate(t => SHORT.frameJPEG(t, 0.94), f / fps);
    const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 60 === 0) {
      const done = f - f0, el = (Date.now() - t0) / 1000;
      console.log(`[w${w}] ${done}/${f1 - f0} frames  ${(el / Math.max(done, 1) * 1000).toFixed(0)} ms/f`);
    }
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
  await browser.close();
}

(async () => {
  if (opt('stills')) return stills(opt('stills').split(',').map(Number));
  const probe = await chromium.launch(LAUNCH);
  const p = await openPage(probe);
  const duration = await p.evaluate(() => SHORT.duration);
  await probe.close();
  const from = parseFloat(opt('from', '0')), to = parseFloat(opt('to', String(duration)));
  const F0 = Math.round(from * fps), F1 = Math.round(to * fps);
  const n = F1 - F0, per = Math.ceil(n / workers);
  console.log(`rendering ${n} frames @ ${fps}fps (${from}s → ${to}s) with ${workers} workers`);
  const t0 = Date.now();
  const parts = [];
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const a = F0 + w * per, b = Math.min(F1, a + per);
    if (a >= b) continue;
    const file = path.join(outDir, `part_${w}.mp4`); parts.push(file);
    jobs.push(renderSlice(w, a, b, file));
  }
  await Promise.all(jobs);
  const list = path.join(outDir, 'parts.txt');
  fs.writeFileSync(list, parts.map(f => `file '${f}'`).join('\n'));
  const silent = path.join(outDir, 'video_silent.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
  parts.forEach(f => fs.unlinkSync(f)); fs.unlinkSync(list);
  const audio = path.join(outDir, 'audio.wav');
  const final = path.join(outDir, opt('out', 'final.mp4'));
  if (fs.existsSync(audio) && !flag('no-audio')) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-ss', String(from), '-t', String(to - from), '-i', audio,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', final]);
  } else fs.copyFileSync(silent, final);
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${final}`);
})().catch(e => { console.error(e); process.exit(1); });
