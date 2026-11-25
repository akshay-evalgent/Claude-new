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
// "contact": "mom" picks a recurring character from cast/cast.json; a photo in cast/photos/<id>.jpg
// is used as the avatar (copied next to the other media), otherwise the character's emoji
if (typeof ep.contact === 'string') {
  const cast = JSON.parse(fs.readFileSync(path.join(HERE, 'cast', 'cast.json'), 'utf8'));
  const c = cast[ep.contact];
  if (!c) { console.error(`unknown cast member "${ep.contact}" (see chatvid/cast/cast.json)`); process.exit(1); }
  const photo = path.join(HERE, 'cast', 'photos', `${ep.contact}.jpg`);
  let avatar = { emoji: c.emoji, bg: c.bg };
  if (fs.existsSync(photo)) {
    const dest = path.join(HERE, 'assets', 'media', `cast-${ep.contact}.jpg`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(photo, dest);
    avatar = { media: `cast-${ep.contact}` };
  }
  ep.contact = { name: c.contact, avatar };
}
// "next": {"contact": "landlord", "text": "..."} is the next episode's character texting in at the end
if (ep.next && ep.next.contact) {
  const cast = JSON.parse(fs.readFileSync(path.join(HERE, 'cast', 'cast.json'), 'utf8'));
  const c = cast[ep.next.contact];
  if (!c) { console.error(`unknown cast member "${ep.next.contact}" in "next"`); process.exit(1); }
  const photo = path.join(HERE, 'cast', 'photos', `${ep.next.contact}.jpg`);
  if (fs.existsSync(photo)) fs.copyFileSync(photo, path.join(HERE, 'assets', 'media', `cast-${ep.next.contact}.jpg`));
  ep.next = { ...ep.next, name: c.contact, avatar: fs.existsSync(photo) ? `cast-${ep.next.contact}` : null };
}
if (opt('interface')) ep.interface = opt('interface');
// documentary episodes: clips and narration timings come from tools/docu_prepare.py
const baseSlug = path.basename(epPath, '.json');
ep.__slug = baseSlug;
const voiceDir = path.join(HERE, 'assets', 'voice', baseSlug);
const PREP = { docu: 'docu_prepare.py', stage: 'stage_prepare.py' }[ep.engine];
if (PREP) {
  const planFile = path.join(voiceDir, 'plan.json');
  if (!fs.existsSync(planFile)) { console.error(`run: python3 chatvid/tools/${PREP} ${epPath}`); process.exit(1); }
  ep.__plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const mediaFile = path.join(voiceDir, 'media.json');
  if (fs.existsSync(mediaFile)) ep.media = { ...(ep.media || {}), ...JSON.parse(fs.readFileSync(mediaFile, 'utf8')) };
}
// --short <name>: a vertical cut-down defined in the episode's "shorts" (panel shows). It reuses the
// episode's beats and voices: {"slug", "title", "hook", "beats": [[first, last], ...] (numbers as
// printed by --plan), "start": {state it opens in}, "patch": {"<beat number>": {fields to change}}}
const shortName = opt('short');
if (shortName) {
  const sh = (ep.shorts || []).find((x) => x.slug === shortName);
  if (!sh) { console.error(`no short "${shortName}" in this episode; it has: ${(ep.shorts || []).map((x) => x.slug).join(', ') || 'none'}`); process.exit(1); }
  const picks = sh.beats.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, k) => a + k));
  ep.__plan = { ...ep.__plan, beats: picks.map((n) => ep.__plan.beats[n - 1]) };
  ep.beats = picks.map((n) => ({ ...ep.beats[n - 1], mark: undefined, ...((sh.patch || {})[n] || {}) }));
  const base = ep.youtube || {};
  Object.assign(ep, { format: 'vertical', initial: sh.start || {}, hook: sh.hook, hookSub: sh.hookSub ?? (ep.show ? `${ep.show.name} · ${ep.show.episode}` : ''),
    endCard: sh.endCard || null, tail: sh.tail ?? 0.8,
    youtube: { title: `${sh.title} #shorts`, tags: base.tags || [],
      description: [sh.caption || '', '', `From ${ep.title}. Full episode on the channel.`, '', sh.hashtags || '#shorts #ai #comedy'] } });
}
const creditsPath = path.join(HERE, 'assets', 'media', 'credits.json');
const allCredits = fs.existsSync(creditsPath) ? JSON.parse(fs.readFileSync(creditsPath, 'utf8')) : {};
ep.__credits = Object.fromEntries(Object.keys(ep.media || {}).filter((k) => allCredits[k]).map((k) => [k, allCredits[k]]));
ep.__mediaMeta = Object.fromEntries(Object.keys(ep.media || {}).map((k) => [k, path.join(HERE, 'assets', 'media', k, 'meta.json')])
  .filter(([, f]) => fs.existsSync(f))
  .map(([k, f]) => {
    const m = JSON.parse(fs.readFileSync(f, 'utf8'));
    // clips quieter than -36 dB on average are just film hiss: keep them silent
    return [k, { ...m, audio: fs.existsSync(path.join(path.dirname(f), 'audio.wav')) && (m.audio_db ?? 0) > -36 }];
  }));       // midnight | nebula | void
if (opt('ai-name')) ep.ai = { ...(ep.ai || {}), name: opt('ai-name') };
const fps = Number(opt('fps', ep.fps || 30));
const scale = Number(opt('scale', 1));
const slug = path.basename(epPath, '.json') + (opt('interface') ? '-' + opt('interface') : '') + (shortName ? `.short-${shortName}` : '');
const outDir = path.join(HERE, 'out');
fs.mkdirSync(outDir, { recursive: true });
const out = opt('out', path.join(outDir, `${slug}.mp4`));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: ep.format === 'vertical' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }, deviceScaleFactor: scale });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(pathToFileURL(path.join(HERE, PREP || ['dm', 'imsg', 'feed'].includes(ep.engine) ? ep.engine : 'engine', 'index.html')).href);
const plan = await page.evaluate((e) => window.boot(e), ep);
console.log(`${slug}: ${plan.duration.toFixed(2)} s, ${plan.cues.length} sound cues, ${Math.ceil(plan.duration * fps)} frames`);

if (args.includes('--upload')) {
  // title, description (with chapters from the exchanges marked "chapter") and tags
  const yt = ep.youtube || {};
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const items = ep.exchanges || ep.beats;
  const chapters = items.map((x, i) => ({ t: plan.exchanges[i], name: x.mark || x.chapter })).filter((c) => c.name);
  if (chapters.length) chapters[0].t = 0;                 // YouTube needs the first chapter at 0:00
  const chapterText = chapters.map((c) => `${mmss(c.t)} ${c.name}`).join('\n');
  const LIC = { 'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/', 'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/', 'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/' };
  const credits = [...new Set(Object.values(ep.__credits).map((c) => c.credit))];
  const lics = [...new Set(Object.values(ep.__credits).map((c) => c.licence).filter((l) => LIC[l]))];
  const creditText = credits.map((c) => `- ${c}`).join('\n') +
    (lics.length ? `\n(Media is cropped and edited. ${lics.map((l) => `${l}: ${LIC[l]}`).join(' · ')})` : '');
  const desc = [].concat(yt.description || []).join('\n').replace('{chapters}', chapterText).replace('{credits}', creditText);
  const tags = (yt.tags || []).join(', ');
  const text = `TITLE\n${yt.title || ep.title}\n\nDESCRIPTION\n${desc}\n\nTAGS (${tags.length}/500 characters)\n${tags}\n`;
  fs.writeFileSync(path.join(outDir, `${slug}.youtube.txt`), text);
  console.log(text);
  await browser.close();
  process.exit(0);
}

if (args.includes('--plan')) {
  const mmss = (t) => { const d = Math.round(t * 10); return `${Math.floor(d / 600)}:${String(Math.floor((d % 600) / 10)).padStart(2, '0')}.${d % 10}`; };
  const items = ep.exchanges || ep.beats;
  plan.exchanges.forEach((t, i) => {
    const x = items[i];
    console.log(`  ${String(i + 1).padStart(2)}  ${mmss(t)}  ${x.user || x.line || x.say || (x.lines ? `${x.who}: ` + x.lines.map((l) => (typeof l === 'string' ? l : l.t || '[img]')).join(' / ') : '') || (x.cut ? `[${x.cut}]` : '') || (x.title ? 'TITLE: ' + x.title : '') || (x.chapter ? 'CHAPTER: ' + x.chapter : '') || (x.card ? `[${x.card.type}] ` + String(x.card.text || '').replace(/\n/g, ' / ') : '')}`);
  });
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
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(opt('crf', ep.crf ?? 16)), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video],
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
