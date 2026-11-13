const { chromium } = require('playwright');
const fs = require('fs');
const [,, outDir, a, b, step] = process.argv;
(async () => {
  const br = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('http://127.0.0.1:8765/' + (process.env.PAGE || 'brain-freeze.html?sub=3'));
  await p.waitForFunction(() => window.ready, null, { timeout: 300000 });
  const t0 = Date.now(); let n = 0;
  for (let i = +a; i < +b; i += +(step || 1)) {
    const f = `${outDir}/f_${String(i).padStart(5, '0')}.jpg`;
    if (fs.existsSync(f)) continue;
    const r = await p.evaluate(x => window.capture(x), i / 30);
    fs.writeFileSync(f + '.tmp', Buffer.from(r.img.split(',')[1], 'base64')); fs.renameSync(f + '.tmp', f);
    if (++n % 25 === 0) console.log(`frame ${i} done, ${((Date.now() - t0) / n / 1000).toFixed(2)} s/frame`);
  }
  console.log('worker finished', a, b, step);
  await br.close();
})();
