// Renders index.html frame by frame with the pre-installed Chromium.
// usage: node capture.mjs --out frames            (all frames)
//        node capture.mjs --out preview --times 0.5,1.7,2.2,3.3,4.6 ...
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const outDir = path.resolve(opt('--out', 'frames'));
const times = opt('--times', null);
const root = path.dirname(new URL(import.meta.url).pathname);
fs.mkdirSync(outDir, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const { FPS, DUR } = await page.evaluate(() => window.FILM);

let list;
if (times) list = times.split(',').map(s => ({ t: parseFloat(s), name: `t_${parseFloat(s).toFixed(2)}.png` }));
else { const n = Math.round(DUR * FPS); list = Array.from({ length: n }, (_, i) => ({ t: i / FPS, name: `f_${String(i).padStart(4, '0')}.png` })); }

const t0 = Date.now();
for (let i = 0; i < list.length; i++) {
  const { t, name } = list[i];
  await page.evaluate(t => window.renderFrame(t), t);
  await page.screenshot({ path: path.join(outDir, name), type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  if (i % 24 === 0 || i === list.length - 1) console.log(`${i + 1}/${list.length}  t=${t.toFixed(2)}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await browser.close();
server.close();
