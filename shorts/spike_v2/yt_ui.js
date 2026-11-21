// yt_ui.js handle outdir -> real YouTube mobile UI captures of a channel's Shorts tab (Oldest / Popular), as scroll frame sequences.
// Plain page loads only (what any visitor sees); nothing is downloaded from the player.
const { chromium, devices } = require('playwright');
const fs = require('fs');
(async () => {
  const [handle, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' });
  const page = await ctx.newPage();
  await page.goto(`https://m.youtube.com/@${handle}/shorts`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4500);
  const info = { handle, header: (await page.evaluate(() => document.body.innerText)).slice(0, 400) };
  let cur = 'Latest';
  for (const sort of ['Oldest', 'Popular']) {
    try {
      await page.getByText(cur, { exact: true }).first().click({ timeout: 8000 });
      await page.waitForTimeout(900);
      await page.getByText(sort, { exact: true }).last().click({ timeout: 8000 });
      cur = sort;
    } catch (e) { console.log('sort click failed', sort, String(e).slice(0, 120)); continue; }
    await page.waitForTimeout(3500);
    for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(350); }   // lazy-load
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(1500);
    const dir = `${out}/${sort.toLowerCase()}`; fs.mkdirSync(dir, { recursive: true });
    const N = 80, dy = 30; const boxes = [];
    for (let k = 0; k < N; k++) {
      await page.screenshot({ path: `${dir}/f${String(k).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 92 });
      boxes.push(await page.evaluate(() => [...document.querySelectorAll('span,div,p')].filter(e => e.children.length === 0 && /^[\d.,]+[KMB]? views$/.test((e.textContent || '').trim()))
        .map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, text: e.textContent.trim() }; }).filter(b => b.w > 0 && b.y > -50 && b.y < innerHeight + 50)));
      await page.evaluate(d => window.scrollBy(0, d), dy); await page.waitForTimeout(60);
    }
    fs.writeFileSync(`${dir}/boxes.json`, JSON.stringify({ n: N, dsf: 2.625, boxes }));
    info[sort] = (await page.evaluate(() => document.body.innerText)).match(/[\d.,]+[KMB]? views/g).slice(0, 24);
    console.log(sort, 'captured', N, 'frames; first counts:', info[sort].slice(0, 12).join(', '));
  }
  fs.writeFileSync(`${out}/ui.json`, JSON.stringify(info, null, 1));
  await browser.close();
})();
