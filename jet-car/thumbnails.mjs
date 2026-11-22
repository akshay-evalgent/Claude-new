// Renders YouTube thumbnails (1280x720 JPEG) from the film's own 3D scene, with type set on top.
//
//   node thumbnails.mjs                 writes youtube/thumbnail-a.jpg, -b.jpg, -c.jpg
//   node thumbnails.mjs --probe         also writes clean frames for trying camera angles
//
// Needs the same setup as render.mjs: Node 18+, playwright with Chromium, and ffmpeg.
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), outDir = join(here, 'youtube');
const film = readFileSync(join(here, 'film.html'), 'utf8');
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + film + '</body></html>';

// Each thumbnail: a film time, a camera (target, azimuth, elevation, distance, lens, horizontal shift) and the words on top.
export const THUMBS = [
  { id: 'a', T: 86.3, cam: { tg: [0.5, 0.9, 0], az: 160, el: -1.2, R: 8.6, fov: 38, sh: 0.24 },
    words: [['550 km/h', 'big hot'], ['then it flies', 'mid']] },
  { id: 'b', T: 70.6, cam: { tg: [0.0, 0.95, 0], az: 122, el: 2.4, R: 7.6, fov: 36, sh: 0.2 },
    words: [['0–100', 'big hot'], ['in 3 seconds', 'mid']] },
  { id: 'c', T: 56.4, cam: { tg: [-0.2, 1.35, 0], az: -78, el: 1.2, R: 7.4, fov: 40, sh: 0.22 },
    words: [['Jet engine', 'mid'], ['in a car?', 'big hot']] },
];
const CSS = `#hud,#labels,#leaders,#scrims,#poster,#controls{display:none!important}
  #gl{filter:saturate(1.22) contrast(1.08) brightness(1.06)}
  #thumb{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(6,7,12,.78) 0,rgba(6,7,12,.45) 38%,rgba(6,7,12,0) 62%)}
  #thumb .t{position:absolute;left:88px;top:50%;transform:translateY(-52%);display:flex;flex-direction:column;gap:6px}
  #thumb p{margin:0;font-family:"Barlow Condensed","Arial Narrow",sans-serif;font-weight:700;text-transform:uppercase;line-height:.86;letter-spacing:-.01em;color:#F7F4F0;text-shadow:0 6px 0 rgba(0,0,0,.35),0 10px 40px rgba(0,0,0,.6)}
  #thumb p.big{font-size:250px} #thumb p.mid{font-size:150px} #thumb p.hot{color:#FF8A3D}
  #thumb .tag{position:absolute;left:92px;top:70px;padding:12px 20px 10px;border-radius:12px;background:#F7F4F0;color:#0B0E14;font:600 30px/1 "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase}`;

const probe = process.argv.includes('--probe');
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('[page error]', e.message));
await page.route('http://film.local/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: html }));
if (process.env.THREE_DIR) await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**', r => {
  const p = join(process.env.THREE_DIR, new URL(r.request().url()).pathname.replace('/npm/three@0.160.0/', ''));
  existsSync(p) ? r.fulfill({ status: 200, contentType: 'application/javascript', body: readFileSync(p) }) : r.continue();
});
await page.goto('http://film.local/film.html?render');
await page.waitForFunction(() => window.__filmReady === true, null, { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: CSS });
for (const t of THUMBS) {
  await page.evaluate(({ T, cam }) => window.__film.still(T, cam, true), t);
  await page.evaluate(words => {
    document.getElementById('thumb')?.remove();
    const d = document.createElement('div'); d.id = 'thumb';
    d.innerHTML = '<div class="tag">3D simulation</div><div class="t">' + words.map(([w, c]) => '<p class="' + c + '">' + w + '</p>').join('') + '</div>';
    document.getElementById('stage').appendChild(d);
  }, probe ? [] : t.words);
  const big = join(outDir, 'tmp-' + t.id + '.png');
  await page.screenshot({ path: big });
  const out = join(outDir, (probe ? 'probe-' : 'thumbnail-') + t.id + '.jpg');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', big, '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '2', out], { stdio: 'inherit' });
  unlinkSync(big); console.log('wrote', out);
}
await browser.close();
