#!/usr/bin/env node
// Render a chatvid episode to MP4.
//
//   node chatvid/render.mjs chatvid/episodes/count-to-a-billion.json
//   node chatvid/render.mjs <episode.json> --out out.mp4 --fps 30 --scale 2   (scale 2 = 4K)
//   node chatvid/render.mjs <episode.json> --stills 3.2,7.5,12                 (PNG stills only)
//
// Needs: Playwright with Chromium, ffmpeg, python3 + numpy, and the assets from
// chatvid/tools/fetch_assets.py.
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const epPath = args.find((a) => a.endsWith('.json'));
if (!epPath) { console.error('usage: node chatvid/render.mjs <episode.json> [--out file.mp4] [--fps 30] [--scale 1] [--stills t1,t2]'); process.exit(1); }
const ep = JSON.parse(fs.readFileSync(epPath, 'utf8'));
if (opt('interface')) ep.interface = opt('interface');       // midnight | nebula | void
if (opt('ai-name')) ep.ai = { ...(ep.ai || {}), name: opt('ai-name') };
const fps = Number(opt('fps', ep.fps || 30));
const scale = Number(opt('scale', 1));
const slug = path.basename(epPath, '.json') + (opt('interface') ? '-' + opt('interface') : '');
const outDir = path.join(HERE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const out = opt('out', path.join(outDir, `${slug}.mp4`));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(pathToFileURL(path.join(HERE, 'engine', 'index.html')).href);
const plan = await page.evaluate((e) => window.boot(e), ep);
console.log(`${slug}: ${plan.duration.toFixed(2)} s, ${plan.cues.length} sound cues, ${Math.ceil(plan.duration * fps)} frames`);

if (args.includes('--plan')) {
  const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  plan.exchanges.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}  ${mmss(t)}  ${ep.exchanges[i].user}`));
  await browser.close();
  process.exit(0);
}

const stills = opt('stills');
if (stills) {
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate((x) => window.renderAt(x), t);
    const f = path.join(outDir, `${slug}_${t.toFixed(2)}.png`);
    await page.screenshot({ path: f });
    console.log('  still', f);
  }
  await browser.close();
  process.exit(0);
}

// --remix: keep the picture of an earlier render, redo only the sound
const remix = args.includes('--remix');
const video = path.join(outDir, `${slug}.video.mp4`);
if (remix) {
  if (!fs.existsSync(out)) { console.error(`--remix needs an earlier render at ${out}`); process.exit(1); }
  await browser.close();
  fs.copyFileSync(out, video);
} else {
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r) => ff.on('close', r));
  const N = Math.ceil(plan.duration * fps);
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await page.evaluate((x) => window.renderAt(x), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stdout.write(`\r  frame ${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log(`\r  ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

const cuesFile = path.join(outDir, `${slug}.cues.json`);
const wav = path.join(outDir, `${slug}.mix.wav`);
fs.writeFileSync(cuesFile, JSON.stringify({ duration: plan.duration, cues: plan.cues, music: plan.music }, null, 1));
const mix = spawnSync('python3', [path.join(HERE, 'tools', 'mix.py'), cuesFile, wav], { stdio: 'inherit' });
if (mix.status !== 0) process.exit(mix.status || 1);
// Loudness: two-pass loudnorm to -14 LUFS (YouTube's reference) with true-peak
// limiting. A gentle 15 kHz low-pass and the AAC cutoff keep the encoder from
// overshooting on sharp clicks. Very dynamic mixes land a little under -14.
const PRE = 'lowpass=f=15000:p=2,lowpass=f=15000:p=2';
const LN = 'loudnorm=I=-14:TP=-2:LRA=14';
const pass1 = spawnSync('ffmpeg', ['-hide_banner', '-i', wav, '-af', `${PRE},${LN}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
const m = JSON.parse(pass1.stderr.slice(pass1.stderr.lastIndexOf('{'), pass1.stderr.lastIndexOf('}') + 1));
const ln2 = `${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
const mux = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-i', wav, '-map', '0:v', '-map', '1:a',
  '-af', `${PRE},${ln2},aresample=48000`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-cutoff', '15000',
  '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
if (mux.status !== 0) process.exit(mux.status || 1);
fs.rmSync(video);
console.log('wrote', out);
