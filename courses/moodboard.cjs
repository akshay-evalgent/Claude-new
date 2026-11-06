// Render the mood board: one PNG per style at 1080x1920 and a contact sheet of all five.
//
//   node courses/moodboard.cjs courses/<course>/moodboard
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = process.argv[2];
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto('file://' + path.join(__dirname, 'moodboard.html'));
  // fonts load on first use, so ask for them before the first frame or it falls back to a serif
  await page.evaluate(() => Promise.all(['700 40px Kalam', '400 40px Kalam', '700 40px Baloo'].map((f) => document.fonts.load(f))));
  const styles = await page.evaluate(() => window.STYLES.map((s) => s.key));
  for (let i = 1; i <= styles.length; i++) {
    await page.evaluate((n) => window.renderStyle(n), i);
    const cv = await page.$('#single canvas');
    fs.writeFileSync(path.join(outDir, `style_${i}_${styles[i - 1]}.png`), await cv.screenshot({ type: 'png' }));
  }
  await page.evaluate(() => { document.getElementById('single').innerHTML = ''; window.renderSheet(); });
  const sheet = await page.$('#sheet');
  fs.writeFileSync(path.join(outDir, 'styles.png'), await sheet.screenshot({ type: 'png' }));
  await browser.close();
  console.log('wrote', outDir);
})().catch((e) => { console.error(e); process.exit(1); });
