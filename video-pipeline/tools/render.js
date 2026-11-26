#!/usr/bin/env node
/* Render a film.js composition to an mp4.

     node render.js COMPOSITION.html --out video.mp4 [--audio track.wav]
                    [--workers 4] [--from 0] [--to 5] [--scale 1] [--crf 16]
     node render.js COMPOSITION.html --stills 0.5,4.2,9 --out DIR

   Loads the page in headless Chromium, calls film.seek(t) for every frame,
   screenshots it and pipes the frames to ffmpeg. --from/--to render a slice
   for a quick look; --scale 0.5 renders a half-size proof. --stills writes
   one full-size PNG per time into DIR (still_<t>.png) instead of a video.
*/
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

function args() {
  const a = process.argv.slice(2);
  const o = { workers: 4, scale: 1, crf: 16 };
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) o[a[i].slice(2)] = a[++i];
    else o.page = a[i];
  }
  if (!o.page || !o.out) {
    console.error('usage: node render.js COMPOSITION.html --out video.mp4 [--audio track.wav] [--workers 4] [--from s] [--to s] [--scale 1]\n       node render.js COMPOSITION.html --stills 0.5,4.2 --out DIR');
    process.exit(2);
  }
  return o;
}

(async () => {
  const o = args();
  const url = 'file://' + path.resolve(o.page);
  if (!fs.existsSync(path.resolve(o.page))) { console.error('no such file: ' + o.page); process.exit(2); }
  if (o.audio && !fs.existsSync(o.audio)) { console.error('no such audio file: ' + o.audio); process.exit(2); }
  const browser = await chromium.launch();
  const errors = [];
  const open = async () => {
    const page = await browser.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url);
    await page.waitForFunction(() => window.film && window.film._ready, null, { timeout: 15000 }).catch(() => {});
    return page;
  };
  const first = await open();
  const meta = await first.evaluate(() => window.film && window.film._ready
    ? { width: film.width, height: film.height, fps: film.fps, duration: film.duration } : null);
  if (!meta) {
    console.error('the page never called Film.ready()' + (errors.length ? '\n' + errors.join('\n') : ''));
    await browser.close(); process.exit(1);
  }
  if (o.stills) {
    fs.mkdirSync(path.resolve(o.out), { recursive: true });
    await first.setViewportSize({ width: meta.width, height: meta.height });
    await first.evaluate(() => document.fonts.ready);
    for (const t of String(o.stills).split(',').map(Number)) {
      await first.evaluate((t) => { window.film.seek(t); }, t);
      const dest = path.join(o.out, `still_${t}.png`);
      await first.screenshot({ path: dest, clip: { x: 0, y: 0, width: meta.width, height: meta.height } });
      console.log('wrote ' + dest);
    }
    await browser.close();
    if (errors.length) console.error('page errors:\n' + [...new Set(errors)].join('\n'));
    return;
  }
  const scale = Number(o.scale);
  const view = { width: meta.width, height: meta.height };
  const from = Number(o.from || 0), to = Math.min(Number(o.to || meta.duration), meta.duration);
  const f0 = Math.round(from * meta.fps), f1 = Math.round(to * meta.fps);
  const total = f1 - f0;
  const n = Math.max(1, Math.min(Number(o.workers), total));
  const pages = [first];
  while (pages.length < n) pages.push(await open());
  for (const p of pages) {
    await p.setViewportSize(view);
    await p.evaluate(() => document.fonts.ready);
  }

  const outW = Math.round(meta.width * scale / 2) * 2, outH = Math.round(meta.height * scale / 2) * 2;
  const ff = ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(meta.fps), '-i', '-'];
  if (o.audio) ff.push('-ss', String(from), '-i', o.audio);
  ff.push('-map', '0:v', '-vf', `scale=${outW}:${outH}:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(o.crf), '-r', String(meta.fps),
    '-movflags', '+faststart');
  if (o.audio) ff.push('-map', '1:a', '-c:a', 'aac', '-b:a', '192k');
  ff.push('-t', (total / meta.fps).toFixed(4), o.out);
  fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
  const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res) => enc.on('close', res));

  const t0 = Date.now();
  for (let f = f0; f < f1; f += n) {
    const batch = [];
    for (let k = 0; k < n && f + k < f1; k++) {
      const t = (f + k) / meta.fps, page = pages[k];
      batch.push(page.evaluate((t) => { window.film.seek(t); }, t)
        .then(() => page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: meta.width, height: meta.height } })));
    }
    for (const buf of await Promise.all(batch)) {
      if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    }
    const doneN = Math.min(f + n, f1) - f0;
    if (doneN % (n * 12) < n || doneN === total) {
      process.stdout.write(`\r${doneN}/${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  }
  enc.stdin.end();
  const code = await done;
  await browser.close();
  process.stdout.write('\n');
  if (errors.length) console.error('page errors:\n' + [...new Set(errors)].join('\n'));
  if (code !== 0) { console.error('ffmpeg failed'); process.exit(1); }
  console.log(`wrote ${o.out}: ${outW}x${outH}, ${meta.fps} fps, ${(total / meta.fps).toFixed(2)} s`
    + (o.audio ? ', with audio' : ', no audio'));
})().catch((e) => { console.error(e); process.exit(1); });
