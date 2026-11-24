// node figrender.js <poses.json> <outdir> : render each pose to <outdir>/NNNN.png (transparent) + <outdir>/meta.json
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const [pj, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const poses = JSON.parse(fs.readFileSync(pj));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 760, height: 1100 } })).newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction('window.READY === true', null, { timeout: 120000 });
  const meta = [];
  for (let i = 0; i < poses.length; i++) {
    const m = poses[i].target ? await page.evaluate(([p, t]) => window.solveArm(p, t[0], t[1], t[2] || 0), [poses[i], poses[i].target]) : await page.evaluate(p => window.setPose(p), poses[i]);
    const b64 = await page.evaluate(() => window.png());
    fs.writeFileSync(`${out}/${String(i).padStart(4, '0')}.png`, Buffer.from(b64.split(',')[1], 'base64'));
    meta.push(m);
  }
  fs.writeFileSync(`${out}/meta.json`, JSON.stringify(meta));
  await browser.close(); console.log('rendered', poses.length);
})();
