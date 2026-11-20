#!/usr/bin/env node
// Render a Three.js scene (chatvid/three/<scene>.html) into a clip: numbered JPG frames plus
// meta.json in chatvid/assets/media/<key>/, the same format as archive clips, so every engine
// can play it. The scene page must define setup(params) and frame(t).
//
//   node chatvid/tools/three_clip.mjs snow <key> '{"workers": 10, "pile": 1}' --dur 4 --fps 30
//   node chatvid/tools/three_clip.mjs snow <key> '{...}' --still 2.0      (one PNG to look at)
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [sceneName, key, paramsJson] = args;
if (!sceneName || !key) { console.error('usage: three_clip.mjs <scene> <key> [params-json] [--dur 4] [--fps 30] [--still t]'); process.exit(1); }
const params = JSON.parse(paramsJson && !paramsJson.startsWith('--') ? paramsJson : '{}');
const fps = Number(opt('fps', 30)), dur = Number(opt('dur', 4)), still = opt('still');

// ES modules do not load from file:// pages, so serve chatvid/ on a local port for the browser
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const w = params.width || 720, h = params.height || 1280;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`http://127.0.0.1:${port}/three/${sceneName}.html`);
await page.waitForFunction(() => document.body.dataset.ready === '1');
await page.evaluate((p) => window.setup(p), { ...params, width: w, height: h });

const wrap = page.locator('#wrap');
if (still != null) {
  await page.evaluate((t) => window.frame(t), Number(still));
  const f = path.join(ROOT, 'out', `${key}_${Number(still).toFixed(2)}.png`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  await wrap.screenshot({ path: f });
  console.log('still', f);
} else {
  const dir = path.join(ROOT, 'assets', 'media', key);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(dur * fps), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => window.frame(t), i / fps);
    await wrap.screenshot({ path: path.join(dir, `f${String(i + 1).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
    if (i % 30 === 0) process.stdout.write(`\r  ${key}: frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ fps, count: n, ext: 'jpg', src: { three: sceneName, ...params, dur } }));
  // record it as our own footage so credits and --upload know where it came from
  const cpath = path.join(ROOT, 'assets', 'media', 'credits.json');
  const credits = fs.existsSync(cpath) ? JSON.parse(fs.readFileSync(cpath, 'utf8')) : {};
  credits[key] = { credit: 'Original 3D render (Three.js)', licence: 'own', short: '' };
  fs.writeFileSync(cpath, JSON.stringify(credits, null, 1));
  console.log(`\r  ${key}: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
await browser.close();
server.close();
