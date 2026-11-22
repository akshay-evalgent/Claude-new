// Renders film.html to an MP4 (or to stills) frame by frame in headless Chromium.
//
//   node render.mjs --out how-a-car-engine-works.mp4            full film, 1920x1080 @ 30 fps, with sound
//   node render.mjs --stills 3,15,30,45 --dir stills            a few JPEG stills for checking
//   node render.mjs --from 40 --to 50 --fps 24 --out part.mp4   a section
//   node render.mjs --jobs 3                                     split the film across 3 browsers, then join
//   node render.mjs --html                                       write index.html, a standalone copy of film.html
//
// Every frame is a pure function of film time, so the output is identical on every run.
// Needs: Node 18+, the `playwright` package with Chromium, and ffmpeg on PATH.
// Set THREE_DIR to an unpacked three@0.160.0 package to load it from disk instead of the CDN.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? a.concat([[v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]]) : a), []));
const fps = Number(args.fps || 30);
const out = resolve(args.out || join(here, 'how-a-car-engine-works.mp4'));
const film = readFileSync(join(here, 'film.html'), 'utf8');
const page_html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + film + '</body></html>';

if (args.html) {                                   // write a standalone page you can open straight from disk
  writeFileSync(join(here, 'index.html'), page_html); console.log('wrote', join(here, 'index.html')); process.exit(0);
}
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text()); });
page.on('pageerror', e => console.log('[page error]', e.message));
await page.route('http://film.local/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: page_html }));
if (process.env.THREE_DIR) {
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => {
    const p = join(process.env.THREE_DIR, new URL(r.request().url()).pathname.replace('/npm/three@0.160.0/', ''));
    existsSync(p) ? r.fulfill({ status: 200, contentType: 'application/javascript', body: readFileSync(p) }) : r.continue();
  });
}
await page.goto('http://film.local/film.html?render');
await page.waitForFunction(() => window.__filmReady === true, null, { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.__film.duration);

async function frameAt(t) {
  await page.evaluate(t => window.__film.seek(t), t);
  return page.screenshot({ type: 'jpeg', quality: 93 });
}

if (args.stills) {
  const dir = resolve(args.dir || join(here, 'stills')); mkdirSync(dir, { recursive: true });
  for (const t of String(args.stills).split(',').map(Number)) {
    const t0 = Date.now(); writeFileSync(join(dir, 'still-' + t.toFixed(1).padStart(5, '0') + '.jpg'), await frameAt(t));
    console.log('still', t, (Date.now() - t0) + ' ms');
  }
  await browser.close(); process.exit(0);
}

const from = Number(args.from || 0), to = Math.min(duration, Number(args.to || duration));
const run = (cmd, a) => new Promise((ok, no) => spawn(cmd, a, { stdio: 'inherit' }).on('close', c => c ? no(new Error(cmd + ' exited ' + c)) : ok()));
if (Number(args.jobs) > 1) {
  const N = Number(args.jobs), F = Math.round((to - from) * fps), parts = [];
  console.log('rendering the score…');
  const wavPath = out.replace(/\.mp4$/, '') + '.score.wav';
  writeFileSync(wavPath, Buffer.from(await page.evaluate(() => window.__film.audio()), 'base64'));
  await browser.close();
  const jobs = [];
  for (let k = 0; k < N; k++) {
    const f0 = Math.round(k * F / N), f1 = Math.round((k + 1) * F / N), part = out.replace(/\.mp4$/, '') + '.part' + k + '.mp4'; parts.push(part);
    jobs.push(run(process.execPath, [fileURLToPath(import.meta.url), '--from', String(from + f0 / fps), '--to', String(from + f1 / fps), '--fps', String(fps), '--silent', '--out', part, '--crf', String(args.crf || 18)]));
  }
  await Promise.all(jobs);
  const list = out + '.parts.txt'; writeFileSync(list, parts.map(p => "file '" + p + "'").join('\n'));
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-ss', String(from), '-t', String(to - from), '-i', wavPath, '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]);
  [...parts, list].forEach(f => unlinkSync(f));
  console.log('wrote', out); process.exit(0);
}
let wav = null;
if (!args.silent) {
  console.log('rendering the score…');
  const b64 = await page.evaluate(() => window.__film.audio());
  wav = out.replace(/\.mp4$/, '') + '.score.wav'; writeFileSync(wav, Buffer.from(b64, 'base64'));
}
const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
if (wav) ffArgs.push('-ss', String(from), '-t', String(to - from), '-i', wav);
ffArgs.push('-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 18), '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
if (wav) ffArgs.push('-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest');
ffArgs.push(out);
const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const total = Math.round((to - from) * fps), t0 = Date.now();
for (let f = 0; f < total; f++) {
  const buf = await frameAt(from + f / fps);
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % fps === 0) { const el = (Date.now() - t0) / 1000; console.log(`frame ${f}/${total}  ${(f / Math.max(el, 0.001)).toFixed(2)} fps  eta ${Math.round((total - f) / Math.max(f / el, 0.001))} s`); }
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('wrote', out);
