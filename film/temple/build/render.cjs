// Render index.html to 240 frames at 24 fps, 1920x1080, then mux with the score.
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const { execSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const frames = path.join(root, 'build', 'frames');
mkdirSync(frames, { recursive: true });
const FPS = 24, DUR = 10, N = FPS*DUR;
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;   // optional list of times for stills

(async () => {
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => { if(m.type()==='error') console.error('page:', m.text()); });
await page.goto('file://' + path.join(root, 'index.html') + '?render=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

if(only){
  for(const t of only){
    await page.evaluate(t => window.__seek(t), t);
    await page.screenshot({ path: path.join(root, 'build', `still_${t.toFixed(2)}.png`) });
  }
} else {
  const t1 = Date.now();
  for(let i=0;i<N;i++){
    const t = (i + 0.5)/FPS;
    await page.evaluate(t => window.__seek(t), t);
    await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4,'0')}.png`) });
    if(i % 48 === 0) console.log('frame', i, ((Date.now()-t1)/1000).toFixed(1)+'s');
  }
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i "${frames}/f%04d.png" -i "${root}/build/score.wav" ` +
    `-c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 ` +
    `-c:a aac -b:a 160k -shortest -movflags +faststart "${root}/temple-10s.mp4"`, { stdio: 'inherit' });
  console.log('wrote temple-10s.mp4');
}
await browser.close();
})();
