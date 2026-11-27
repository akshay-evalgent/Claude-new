// Headless renderer: serves minecraft-channel/, drives engine/index.html in Chromium,
// and pipes JPEG frames into ffmpeg. Usage:
//   node render.cjs <episode> [--from F] [--to F] [--frames a,b,c] [--scale 0.5] [--workers 3] [--out out/dir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const ep = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const scale = parseFloat(opt('scale', '1'));
const workers = parseInt(opt('workers', '3'));
const outDir = path.resolve(opt('out', path.join(__dirname, 'out', ep)));
fs.mkdirSync(outDir, { recursive: true });
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.json': 'application/json' };

const server = http.createServer((q, s) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT)) { s.writeHead(403); return s.end(); }
  fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] ?? 'application/octet-stream' }); s.end(d); });
});

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto(`http://localhost:${port}/animatic/engine/index.html?ep=${ep}&scale=${scale}`);
  await page.waitForFunction('window.ready || window.bootError', null, { timeout: 120000 });
  const err = await page.evaluate('window.bootError');
  if (err) throw new Error(err);
  return page;
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
  const first = await openPage(browser, port);
  const meta = await first.evaluate('window.META');
  fs.writeFileSync(path.join(outDir, 'cues.json'), JSON.stringify(await first.evaluate('window.CUES'), null, 1));
  console.log('meta', JSON.stringify(meta));

  const thumb = opt('thumb', null);
  if (thumb) {
    // --thumb <frame> --text "ONLY|ONE?!"
    const lines = opt('text', 'ONLY|ONE?!').split('|');
    const d = await first.evaluate(([f, l]) => window.renderThumb(f, l), [parseInt(thumb), lines]);
    fs.writeFileSync(path.join(outDir, 'thumbnail_full.jpg'), Buffer.from(d.split(',')[1], 'base64'));
    await browser.close(); server.close(); return;
  }
  const list = opt('frames', null);
  if (list) {
    // stills only
    for (const f of list.split(',').map(Number)) {
      const d = await first.evaluate((f) => window.renderFrame(f, 0.9), f);
      fs.writeFileSync(path.join(outDir, `still_${String(f).padStart(5, '0')}.jpg`), Buffer.from(d.split(',')[1], 'base64'));
    }
    await browser.close(); server.close(); return;
  }

  const from = parseInt(opt('from', '0')), to = parseInt(opt('to', String(meta.frames)));
  const n = to - from, per = Math.ceil(n / workers);
  const t0 = Date.now();
  let done = 0;
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const a = from + w * per, b = Math.min(to, a + per);
    if (a >= b) break;
    jobs.push((async () => {
      const page = w === 0 ? first : await openPage(browser, port);
      const seg = path.join(outDir, `seg_${String(w).padStart(2, '0')}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(meta.fps), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = a; f < b; f++) {
        const d = await page.evaluate((f) => window.renderFrame(f), f);
        const buf = Buffer.from(d.split(',')[1], 'base64');
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        done++;
        if (done % 150 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${n} frames, ${(el / done).toFixed(3)}s/frame, eta ${((n - done) * el / done / 60).toFixed(1)} min`); }
      }
      ff.stdin.end();
      await new Promise((r) => ff.on('close', r));
      return seg;
    })());
  }
  const segs = await Promise.all(jobs);
  fs.writeFileSync(path.join(outDir, 'segments.txt'), segs.map((s) => `file '${s}'`).join('\n'));
  console.log('rendered', n, 'frames in', ((Date.now() - t0) / 60000).toFixed(1), 'min');
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
