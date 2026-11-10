// Render index.html to 240 frames at 24 fps, 1920x1080, then mux with the score.
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const { execSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const frames = path.join(root, 'build', 'frames');
mkdirSync(frames, { recursive: true });
const FPS = 24, DUR = 45, N = FPS*DUR;
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;   // optional list of times for stills
const H = parseInt(process.env.H || '960'), W = Math.round(H*9/16);   // vertical 9:16
const Q = process.env.Q || '1';
const DBG = process.env.DBG || '0';
const FROM = parseInt(process.env.FROM || '0'), TO = parseInt(process.env.TO || '1080');   // frame range
const MUX = process.env.MUX !== '0';                                                     // shader quality 0..1

(async () => {
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', m => { if(m.type()==='error') console.error('page:', m.text()); });
await page.goto('file://' + path.join(root, 'index.html') + `?render=1`);
await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 120000 });
const err = await page.evaluate(() => window.__error); if(err){ console.error(err); process.exit(1); }

if(only){
  for(const t of only){
    await page.evaluate(t => window.__seek(t), t);
    const t1 = Date.now();
    await page.screenshot({ timeout: 0, path: path.join(root, 'build', `still_${t.toFixed(2)}.png`) });
    console.log('still', t, ((Date.now()-t1)/1000).toFixed(1)+'s');
  }
} else {
  const t1 = Date.now();
  for(let i=FROM;i<Math.min(N,TO);i++){
    const t = (i + 0.5)/FPS;
    await page.evaluate(t => window.__seek(t), t);
    await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4,'0')}.png`), timeout: 0 });
    if(i % 48 === 0) console.log('frame', i, ((Date.now()-t1)/1000).toFixed(1)+'s');
  }
  if(MUX) execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i "${frames}/f%04d.png" -i "${root}/build/score.wav" ` +
    `-vf "scale=1080:1920:flags=lanczos" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 ` +
    `-c:a aac -b:a 160k -shortest -movflags +faststart "${root}/one-night-45s.mp4"`, { stdio: 'inherit' });
  if(MUX) console.log('wrote one-night-45s.mp4'); else console.log('frames', FROM, 'to', TO, 'done');
}
await browser.close();
})();
