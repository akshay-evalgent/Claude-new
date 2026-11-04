#!/usr/bin/env node
// Render an episode to MP4, frame by frame, with a synthesised SFX bed.
//
//   node tools/render.mjs grip-strength                 -> renders/grip-strength.mp4 (+ .srt, script, chapters)
//   node tools/render.mjs grip-strength --stills 1,4.5,9 -> PNG stills only (fast look)
//   node tools/render.mjs grip-strength --from 7 --to 16 -> render a slice
//   options: --fps 60  --scale 0.5 (quick draft)  --crf 16  --no-audio  --out path.mp4
//
// Needs: Node 18+, ffmpeg on PATH, and Playwright (npm i, or a global install).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderSfx } from './sfx.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const ep = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'grip-strength';
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes('--' + k);
const scale = +opt('scale', 1);
const outDir = path.join(ROOT, 'renders');
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------- static server
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// ---------------------------------------------------------------- browser
const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
page.on('pageerror', e => console.error('page error:', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
await page.goto(`${base}/engine/player.html?ep=${encodeURIComponent(ep)}&render`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
const err = await page.evaluate(() => window.__error);
if (err) { console.error(err); process.exit(1); }
const meta = await page.evaluate(() => ({ duration: __motion.duration, fps: __motion.fps, cues: __motion.cues, vo: __motion.vo, chapters: __motion.chapters, title: __motion.title }));
const fps = +opt('fps', meta.fps);
const cdp = await page.context().newCDPSession(page);
async function frameAt(t) {
  await page.evaluate(tt => __motion.seek(tt), t);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false });
  return Buffer.from(data, 'base64');
}
await frameAt(0); await frameAt(0); // warm up decoders and filters

// ---------------------------------------------------------------- stills mode
if (opt('stills')) {
  const dir = path.join(outDir, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t of opt('stills').split(',').map(Number)) {
    const f = path.join(dir, `${ep}-${t.toFixed(2)}.png`);
    fs.writeFileSync(f, await frameAt(t)); console.log(f);
  }
  await browser.close(); server.close(); process.exit(0);
}

// ---------------------------------------------------------------- pace check: will the VO fit its scene?
const WPS = +opt('wps', 2.8); // words per second; ~170 wpm is a brisk YouTube read
for (const v of meta.vo.filter(v => v.text)) {
  const need = v.text.split(/\s+/).length / WPS, have = v.end - v.start;
  if (need > have - 0.3) console.warn(`pace: "${v.name}" needs ~${need.toFixed(1)} s of VO at ${WPS} words/s but the scene is ${have.toFixed(1)} s`);
}

// ---------------------------------------------------------------- side files: srt, script, chapters
const ts = (s, sep = ',') => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`; };
const vo = meta.vo.filter(v => v.text);
fs.writeFileSync(path.join(outDir, `${ep}.srt`), vo.map((v, i) => `${i + 1}\n${ts(v.start + 0.1)} --> ${ts(v.end - 0.15)}\n${v.text}\n`).join('\n'));
fs.writeFileSync(path.join(outDir, `${ep}-vo-script.txt`), `${meta.title}\n\n` + vo.map(v => `[${ts(v.start, '.').slice(3, 8)}] (${(v.end - v.start).toFixed(1)} s) ${v.text}`).join('\n\n') + '\n');
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
fs.writeFileSync(path.join(outDir, `${ep}-chapters.txt`), meta.chapters.map(c => `${mmss(c.t)} ${c.title}`).join('\n') + '\n');

// ---------------------------------------------------------------- frames -> ffmpeg
const from = +opt('from', 0), to = Math.min(+opt('to', meta.duration), meta.duration);
const nFrames = Math.round((to - from) * fps);
const out = opt('out', path.join(outDir, `${ep}${from || to < meta.duration ? `-${from}-${to}` : ''}.mp4`));
const silent = out.replace(/\.mp4$/, '.video.mp4');
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-preset', opt('preset', 'slow'), '-crf', opt('crf', '16'), '-pix_fmt', 'yuv420p',
  '-tune', 'film', '-x264-params', 'deblock=-1,-1', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let i = 0; i < nFrames; i++) {
  const buf = await frameAt(from + i / fps);
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % fps === 0) process.stdout.write(`\rframe ${i}/${nFrames}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
await browser.close(); server.close();
console.log(`\rrendered ${nFrames} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// ---------------------------------------------------------------- audio
if (flag('no-audio')) { fs.renameSync(silent, out); }
else {
  const wav = path.join(outDir, `${ep}-sfx.wav`);
  const cues = meta.cues.map(c => ({ ...c, t: c.t - from })).filter(c => c.t >= -0.05 && c.t < to - from);
  fs.writeFileSync(wav, renderSfx(cues, to - from));
  await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', out], { stdio: 'inherit' }).on('close', c => (c === 0 ? res() : rej(new Error('mux failed')))));
  fs.unlinkSync(silent);
  console.log('sfx bed:', wav);
}
console.log('video:', out);
