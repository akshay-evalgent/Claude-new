const { chromium } = require('playwright');
const [,, outDir, ...times] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.type(), m.text().slice(0, 300)); });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('http://127.0.0.1:8765/' + (process.env.PAGE || 'hiccup.html') + '');
  await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  for (const t of times) {
    const t0 = Date.now(); const info = await p.evaluate(x => renderAt(x), parseFloat(t));
    await p.screenshot({ path: `${outDir}/s_${t}.jpg`, type: 'jpeg', quality: 90 });
    console.log(t, info, (Date.now() - t0) + 'ms');
  }
  await b.close();
})();
