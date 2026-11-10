// Render frames: node build/render.cjs [t1,t2,...]   (stills)   or   FROM=0 TO=1574 node build/render.cjs   (frames)
// Env: K sub-frames (4), SCALE internal render scale (1), H output height (1920)
const { chromium } = require('playwright');
const { mkdirSync, readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
(async () => {
const root = path.resolve(__dirname, '..');
const frames = path.join(root, 'build', 'frames'); mkdirSync(frames, { recursive: true });
const TL = JSON.parse(readFileSync(path.join(root, 'src', 'timeline.json')));
const FPS = 24, N = Math.round(TL.anchors.end*FPS);
const H = parseInt(process.env.H || '1920'), W = Math.round(H*9/16);
const K = process.env.K || '0', SCALE = process.env.SCALE || '0.67';
const FROM = parseInt(process.env.FROM || '0'), TO = Math.min(N, parseInt(process.env.TO || String(N)));
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', m => { if(m.type() === 'error') console.error('page:', m.text()); });
await page.goto('file://' + path.join(root, 'index.html') + `?render=1&k=${K}&scale=${SCALE}`);
await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 300000 });
const err = await page.evaluate(() => window.__error); if(err){ console.error(err); process.exit(1); }
if(only){
  for(const t of only){
    const t1 = Date.now();
    await page.evaluate(t => window.__seek(t), t);
    await page.screenshot({ path: path.join(root, 'build', `still_${t.toFixed(2)}.png`), timeout: 0 });
    console.log('still', t, ((Date.now() - t1)/1000).toFixed(1) + 's');
  }
} else {
  const t1 = Date.now();
  for(let i = FROM; i < TO; i++){
    const out = path.join(frames, `f${String(i).padStart(4, '0')}.png`);
    if(existsSync(out)) continue;                       // resume: skip frames already rendered
    await page.evaluate(t => window.__seek(t), (i + 0.5)/FPS);
    await page.screenshot({ path: out + '.tmp.png', timeout: 0 });
    require('node:fs').renameSync(out + '.tmp.png', out);
    if(i % 24 === 0) console.log('frame', i, ((Date.now() - t1)/1000).toFixed(1) + 's');
  }
  console.log('frames', FROM, 'to', TO, 'done');
}
await browser.close();
})();
