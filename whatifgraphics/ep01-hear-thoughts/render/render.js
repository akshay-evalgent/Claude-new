// Renders every frame of every shot to JPEG using headless Chromium.
// usage: node render.js --build ../build [--workers 4] [--fps 24] [--thumb] [--shot N] [--preview]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const has = k => args.includes('--' + k);
const BUILD = path.resolve(opt('build', path.join(__dirname, '..', 'build')));
const WORKERS = parseInt(opt('workers', '4'));
const FPS = parseInt(opt('fps', '24'));
const FRAMES = path.join(BUILD, 'frames');
fs.mkdirSync(FRAMES, { recursive: true });
const pageUrl = 'file://' + path.join(__dirname, 'scene.html');

async function newPage(browser, timings) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await page.goto(pageUrl);
  await page.evaluate(() => window.fontsReady());
  if (timings) await page.evaluate(t => window.setTimings(t), timings);
  const cdp = await ctx.newCDPSession(page);
  return { page, cdp, ctx };
}

(async () => {
  const browser = await chromium.launch();
  if (has('thumb')) {
    const { page, cdp } = await newPage(browser, null);
    await page.evaluate(() => window.renderThumb());
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(BUILD, 'thumbnail.png'), Buffer.from(data, 'base64'));
    console.log('thumbnail written');
    await browser.close(); return;
  }
  const timings = JSON.parse(fs.readFileSync(path.join(BUILD, 'timings.json')));
  if (has('preview')) {
    // one PNG per shot at mid-time, for a quick visual check
    const { page, cdp } = await newPage(browser, timings);
    const prevDir = path.join(BUILD, 'preview'); fs.mkdirSync(prevDir, { recursive: true });
    const only = opt('shot', null);
    for (let i = 0; i < timings.shots.length; i++) {
      if (only != null && parseInt(only) !== i) continue;
      const tt = has('late') ? timings.shots[i].dur - 0.3 : Math.min(timings.shots[i].dur * 0.6, 6);
      await page.evaluate(([i, t]) => window.renderFrame(i, t), [i, tt]);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
      fs.writeFileSync(path.join(prevDir, `shot${String(i).padStart(3, '0')}.jpg`), Buffer.from(data, 'base64'));
    }
    console.log('previews written'); await browser.close(); return;
  }
  // full render: distribute shots across workers by frame count
  const jobs = timings.shots.map((s, i) => ({ i, frames: Math.round(s.dur * FPS) }));
  const only = opt('shot', null);
  const sel = only != null ? jobs.filter(j => j.i === parseInt(only)) : jobs;
  const buckets = [...Array(WORKERS)].map(() => ({ load: 0, jobs: [] }));
  for (const j of sel.slice().sort((a, b) => b.frames - a.frames)) { const b = buckets.sort((a, c) => a.load - c.load)[0]; b.jobs.push(j); b.load += j.frames; }
  const total = sel.reduce((a, j) => a + j.frames, 0);
  let done = 0; const t0 = Date.now();
  await Promise.all(buckets.map(async (b, wi) => {
    const wb = wi === 0 ? browser : await chromium.launch();
    const { page, cdp } = await newPage(wb, timings);
    for (const j of b.jobs.sort((a, c) => a.i - c.i)) {
      for (let f = 0; f < j.frames; f++) {
        const fp = path.join(FRAMES, `s${String(j.i).padStart(3, '0')}_${String(f).padStart(5, '0')}.jpg`);
        if (!fs.existsSync(fp)) {
          await page.evaluate(([i, t]) => window.renderFrame(i, t), [j.i, f / FPS]);
          const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
          fs.writeFileSync(fp, Buffer.from(data, 'base64'));
        }
        done++;
        if (done % 500 === 0) console.log(`${done}/${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    }
    if (wb !== browser) await wb.close();
  }));
  console.log(`rendered ${done} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await browser.close();
})();
