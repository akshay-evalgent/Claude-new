// node render.mjs stills <name> t1 t2 ...   -> build/sheet_<name>.jpg (contact sheet)
// node render.mjs film [workers] [t0 t1]    -> build/frames (resumable) -> out/inception-what-if-mal-was-right.mp4
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('/opt/node22/lib/node_modules/playwright');
import http from 'http'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const root = path.dirname(new URL(import.meta.url).pathname);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
await new Promise(r => srv.listen(0, r)); const url = `http://localhost:${srv.address().port}/index.html` + (process.env.ACTS ? `?acts=${process.env.ACTS}` : '');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function open() {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message, (e.stack || '').split('\n').slice(1, 3).join(' | '))); p.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await p.goto(url); await p.waitForFunction('window.READY', null, { timeout: 120000 }); return p;
}
const [mode, ...rest] = process.argv.slice(2);
if (mode === 'stills') {
  const [name, ...ts] = rest; const dir = path.join(root, 'build/stills_' + name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const p = await open(); let i = 0;
  for (const t of ts) { await p.evaluate(t => window.renderAt(t), +t); await p.screenshot({ path: path.join(dir, `s${String(i++).padStart(3, '0')}.jpg`), quality: 85 }); }
  const cols = Math.min(4, ts.length), rows = Math.ceil(ts.length / cols);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(dir, 's%03d.jpg'), '-vf', `scale=640:360,tile=${cols}x${rows}`, '-frames:v', '1', path.join(root, `build/sheet_${name}.jpg`)]);
} else {
  const workers = +(rest[0] || 4), dir = path.join(root, 'build/frames'); fs.mkdirSync(dir, { recursive: true });
  const p0 = await open(); const total = await p0.evaluate('window.TOTAL'), fps = await p0.evaluate('window.FPS');
  const f0 = Math.round((+rest[1] || 0) * fps), n = Math.round((+rest[2] || total) * fps); let next = f0, done = 0; const t0 = Date.now();
  const run = async (p) => { for (; ;) { const i = next++; if (i >= n) return; const f = path.join(dir, `f${String(i).padStart(5, '0')}.jpg`); if (fs.existsSync(f)) continue; await p.evaluate(t => window.renderAt(t), i / fps); await p.screenshot({ path: f + '.tmp.jpg', quality: 93 }); fs.renameSync(f + '.tmp.jpg', f); if (++done % 200 === 0) console.log(`${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); } };
  const pages = [p0]; for (let i = 1; i < workers; i++) pages.push(await open());
  await Promise.all(pages.map(run));
  if (!rest[1]) { fs.mkdirSync(path.join(root, 'out'), { recursive: true });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-i', path.join(root, 'build/audio.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(root, 'out/inception-what-if-mal-was-right.mp4')], { stdio: 'inherit' });
    console.log('wrote out/inception-what-if-mal-was-right.mp4'); }
}
await browser.close(); srv.close();
