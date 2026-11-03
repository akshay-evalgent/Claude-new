// Render a monochrome SVG (simple-icons style) to a PNG at a given size and colour via Playwright.
// usage: node scripts/svg2png.js in.svg out.png [size=900] [color=#ffffff] [bg=transparent]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [inp, out, size = '900', color = '#ffffff', bg = 'transparent'] = process.argv.slice(2);
  let svg = fs.readFileSync(inp, 'utf8').replace(/<svg /, `<svg fill="${color}" width="${size}" height="${size}" `);
  const html = `<html><body style="margin:0;background:${bg}">${svg}</body></html>`;
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: +size, height: +size } });
  await page.setContent(html); await page.screenshot({ path: out, omitBackground: bg === 'transparent' }); await browser.close();
  console.log(out);
})();
