const { chromium } = require('playwright');
const fs = require('fs');
const [,, outDir, ...times] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.type(), m.text().slice(0, 300)); });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('http://127.0.0.1:8765/' + (process.env.PAGE || 'dream.html?sub=3'));
  await p.waitForFunction(() => window.ready, null, { timeout: 300000 });
  for (const t of times) {
    const t0 = Date.now(); const r = await p.evaluate(x => window.capture(x), parseFloat(t));
    fs.writeFileSync(`${outDir}/s_${t}.jpg`, Buffer.from(r.img.split(',')[1], 'base64'));
    console.log(t, r.info, (Date.now() - t0) + 'ms');
  }
  await b.close();
})();
