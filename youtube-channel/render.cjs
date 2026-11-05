// Render the channel art from brand.html:  node youtube-channel/render.cjs
const { chromium } = require('playwright');
const path = require('path');

const ASSETS = [
  ['profile', 800, 800, 'profile.png', false],
  ['banner', 2560, 1440, 'banner.png', false],
  ['watermark', 300, 300, 'watermark.png', true],
  ['watermark150', 150, 150, 'watermark-150.png', true],
];

(async () => {
  const browser = await chromium.launch();
  for (const [a, w, h, file, transparent] of ASSETS) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => { console.error(a, e.message); process.exitCode = 1; });
    await page.goto('file://' + path.join(__dirname, 'brand.html') + '?a=' + a);
    await page.evaluate(() => window.ready);
    await page.screenshot({ path: path.join(__dirname, file), omitBackground: transparent });
    console.log('wrote', file);
    await page.close();
  }
  await browser.close();
})();
