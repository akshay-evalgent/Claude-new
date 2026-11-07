// Renders film shots frame by frame in headless Chromium and pipes them into ffmpeg.
// usage: node render.js [--w 1920 --h 1080 --fps 24 --out out/shots --jobs 2] shot[:from-to] ...
//        node render.js --still shot@seconds   (one PNG to out/stills)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const root = __dirname;
const args = process.argv.slice(2); const opt = { w: 1920, h: 1080, fps: 24, out: 'out/shots', jobs: 2 }; const shots = [];
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = k === 'still' ? true : args[++i]; if (k === 'still') opt.still = true; } else shots.push(args[i]); }
for (const k of ['w', 'h', 'fps', 'jobs']) opt[k] = +opt[k];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
async function one(browser, port, spec) {
  const page = await browser.newPage({ viewport: { width: opt.w, height: opt.h } });
  page.on('pageerror', (e) => console.log(`[${spec}] ERROR`, e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'log') console.log(`[${spec}]`, m.text()); });
  const [name, at] = spec.split('@');
  const [shot, range] = name.split(':');
  await page.goto(`http://127.0.0.1:${port}/film.html?shot=${shot}&w=${opt.w}&h=${opt.h}&fps=${opt.fps}`);
  await page.waitForFunction('window.READY === true', null, { timeout: 300000 });
  const dur = await page.evaluate('window.DUR');
  if (opt.still) {
    const t = parseFloat(at || '0'); const url = await page.evaluate(([i]) => window.frame(i, 'png'), [Math.round(t * opt.fps)]);
    const dir = path.join(root, 'out/stills'); fs.mkdirSync(dir, { recursive: true });
    const f = path.join(dir, `${shot}@${t}${opt.h > opt.w ? '_v' : ''}.png`); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); console.log('still', f);
    await page.close(); return;
  }
  let [a, b] = range ? range.split('-').map(Number) : [0, dur]; if (isNaN(b)) b = dur;
  const n0 = Math.round(a * opt.fps), n1 = Math.round(b * opt.fps);
  const dir = path.join(root, opt.out); fs.mkdirSync(dir, { recursive: true });
  const outf = path.join(dir, `${shot}${opt.h > opt.w ? '_v' : ''}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(opt.fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(opt.fps), outf]);
  const t0 = Date.now();
  for (let i = n0; i < n1; i++) {
    const url = await page.evaluate(([k]) => window.frame(k), [i]);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((i - n0) % 48 === 0) process.stdout.write(`${shot} ${i - n0}/${n1 - n0} ${((Date.now() - t0) / Math.max(1, i - n0)).toFixed(0)}ms/f\n`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  console.log(`done ${shot} ${n1 - n0} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${outf}`);
  await page.close();
}
(async () => {
  await new Promise((r) => server.listen(0, r)); const port = server.address().port;
  const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const queue = [...shots]; const workers = [];
  for (let j = 0; j < Math.min(opt.jobs, queue.length); j++) workers.push((async () => { const br = await launch(); while (queue.length) { await one(br, port, queue.shift()); } await br.close(); })());
  await Promise.all(workers); server.close();
})();
