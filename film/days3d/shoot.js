// Renders shots to PNG in headless Chromium (WebGL2 on SwiftShader).
// usage: node shoot.js shot[:WxH] ...   -> out/<shot>.png
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  fs.mkdirSync(path.join(root, 'out'), { recursive: true });
  for (const arg of process.argv.slice(2)) {
    const [shot, size] = arg.split(':');
    const [w, h] = (size || '1280x720').split('x').map(Number);
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('console', (m) => console.log(`[${shot}]`, m.text()));
    page.on('pageerror', (e) => console.log(`[${shot}] ERROR`, e.message));
    const t0 = Date.now();
    await page.goto(`http://127.0.0.1:${port}/index.html?shot=${shot}&w=${w}&h=${h}`);
    await page.waitForFunction('window.READY === true', null, { timeout: 240000 });
    await page.locator('#stage').screenshot({ path: path.join(root, 'out', `${shot}.png`) });
    console.log(`${shot} ${w}x${h} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    await page.close();
  }
  await browser.close(); server.close();
})();
