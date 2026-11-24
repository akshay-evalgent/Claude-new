// Renders film.html frame by frame in headless Chromium.
//   node render.js stills 3.5 12 21        -> PNG stills in out/stills
//   node render.js frames <from> <to> <dir> -> JPEG frames [from, to) at 24 fps
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = __dirname, FPS = 24;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };

(async () => {
  const server = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text()); });
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/film.html?capture${process.env.Q || ''}`);
  await page.evaluate(() => window.ready);

  const [mode, ...rest] = process.argv.slice(2);
  if (mode === 'stills') {
    fs.mkdirSync(path.join(ROOT, 'out/stills'), { recursive: true });
    for (const t of rest.map(Number)) {
      await page.evaluate(t => window.renderFrame(t), t);
      await page.screenshot({ path: path.join(ROOT, 'out/stills', `t${t.toFixed(2).padStart(5, '0')}.png`) });
    }
  } else {
    const from = Number(rest[0]), to = Number(rest[1]), dir = rest[2];
    fs.mkdirSync(dir, { recursive: true });
    const t0 = Date.now();
    for (let f = Math.round(from * FPS); f < Math.round(to * FPS); f++) {
      const out = path.join(dir, `f${String(f).padStart(5, '0')}.jpg`);
      if (fs.existsSync(out) && fs.statSync(out).size > 0) continue; // resume: keep frames already rendered
      await page.evaluate(t => window.renderFrame(t), f / FPS);
      await page.screenshot({ path: out, type: 'jpeg', quality: 96 });
    }
    console.log(`frames ${from}-${to}s done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close(); server.close();
})();
