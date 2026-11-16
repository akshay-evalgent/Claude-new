// ta_rec.js outdir -> types a note on textarea.my, captures (screenshot, url) after each chunk, then reopens the link
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 515, height: 380 }, colorScheme: 'dark', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('https://textarea.my/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);
  const steps = [];
  let k = 0;
  const snap = async (tag) => {
    const f = `${out}/s${String(k++).padStart(3, '0')}.png`;
    await page.screenshot({ path: f });
    steps.push({ img: f, url: page.url(), tag });
  };
  await snap('empty');
  await page.click('article');
  const text = "# Note to future me\n\nThis whole note lives in the link.\nNo account. No server. No app.\n\nSend the link = send the note.";
  const chunks = text.match(/[\s\S]{1,3}/g);
  for (const c of chunks) {
    await page.keyboard.type(c, { delay: 25 });
    await page.waitForTimeout(560);         // the page saves to the URL 500 ms after you stop typing
    await snap('type');
  }
  const url = page.url();
  // open the link in a brand-new browser context (no shared storage)
  const ctx2 = await browser.newContext({ viewport: { width: 515, height: 380 }, colorScheme: 'dark', deviceScaleFactor: 2 });
  const p2 = await ctx2.newPage();
  await p2.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p2.waitForTimeout(800);
  const f = `${out}/reopen.png`; await p2.screenshot({ path: f }); steps.push({ img: f, url: p2.url(), tag: 'reopen' });
  const title = await p2.title();
  fs.writeFileSync(`${out}/steps.json`, JSON.stringify({ steps, url, title, len: url.length }, null, 1));
  console.log('steps', steps.length, 'url length', url.length, 'title', title);
  await browser.close();
})();
