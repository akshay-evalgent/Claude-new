// Usage: node render.mjs stills 1.0 5.2 ...   -> build/stills/*.jpg + sheet
//        node render.mjs film [workers]       -> build/frames/*.jpg -> out/inception-blocks.mp4
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('/opt/node22/lib/node_modules/playwright');
import http from 'http'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const root = path.dirname(new URL(import.meta.url).pathname);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mjs': 'text/javascript' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
await new Promise(r => srv.listen(0, r)); const url = `http://localhost:${srv.address().port}/index.html`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function open() {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message)); p.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await p.goto(url); await p.waitForFunction('window.READY', null, { timeout: 60000 }); return p;
}
const [mode, ...rest] = process.argv.slice(2);
if (mode === 'stills') {
  fs.mkdirSync(path.join(root, 'build/stills'), { recursive: true });
  const p = await open();
  for (const t of rest) { await p.evaluate(t => window.renderAt(t), +t); await p.screenshot({ path: path.join(root, `build/stills/t${(+t).toFixed(2).padStart(6, '0')}.jpg`), quality: 85 }); }
} else {
  const workers = +(rest[0] || 4), dir = path.join(root, 'build/frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const p0 = await open(); const total = await p0.evaluate('window.TOTAL'), fps = await p0.evaluate('window.FPS'); const n = Math.round(total * fps); let next = 0, done = 0; const t0 = Date.now();
  const run = async (p) => { for (; ;) { const i = next++; if (i >= n) return; await p.evaluate(t => window.renderAt(t), i / fps); await p.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), quality: 93 }); if (++done % 150 === 0) console.log(`${done}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); } };
  const pages = [p0]; for (let i = 1; i < workers; i++) pages.push(await open());
  await Promise.all(pages.map(run));
  fs.mkdirSync(path.join(root, 'out'), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-i', path.join(root, 'build/audio.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(root, 'out/inception-blocks.mp4')], { stdio: 'inherit' });
  console.log('wrote out/inception-blocks.mp4');
}
await browser.close(); srv.close();
