const { chromium } = require('playwright');
const fs = require('fs');
const [,, outDir, a, b, step] = process.argv;
(async () => {
  const br = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('http://127.0.0.1:8765/' + (process.env.PAGE || 'sneeze.html') + '');
  await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  const t0 = Date.now(); let n = 0;
  for (let i = +a; i < +b; i += +(step || 1)) {
    const f = `${outDir}/f_${String(i).padStart(5, '0')}.jpg`;
    if (fs.existsSync(f)) continue;
    await p.evaluate(x => renderAt(x), i / 30);
    await p.screenshot({ path: f, type: 'jpeg', quality: 94 });
    if (++n % 50 === 0) console.log(`frame ${i} done, ${((Date.now() - t0) / n / 1000).toFixed(2)} s/frame`);
  }
  console.log('worker finished', a, b, step);
  await br.close();
})();
