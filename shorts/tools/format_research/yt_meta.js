// yt_meta.js id1 id2 ... -> public page text of each Short (title, likes, comments, sound attribution). Plain page loads.
const { chromium, devices } = require('playwright');
(async () => {
  const ids = process.argv.slice(2);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' });
  for (const id of ids) {
    const page = await ctx.newPage();
    try {
      await page.goto('https://m.youtube.com/shorts/' + id, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(5000);
      const txt = (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 420);
      const html = await page.content();
      const snd = (html.match(/"(?:soundMetadata|pivotButton|reelSoundMetadata)[^}]{0,400}/) || [''])[0].slice(0, 300);
      const m = html.match(/"musicTrack[^}]{0,200}|"primaryText":\{"runs":\[\{"text":"([^"]{2,80})"/);
      console.log(id, '::', txt, '\n   SOUND?', snd.replace(/\s+/g, ' '), m ? m[0].slice(0, 160) : '');
    } catch (e) { console.log(id, 'ERR', String(e).slice(0, 100)); }
    await page.close();
  }
  await browser.close();
})();
