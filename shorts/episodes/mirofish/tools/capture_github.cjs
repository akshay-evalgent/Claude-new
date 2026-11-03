// Still captures of the live GitHub repo page (stars, forks) at 2x.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const out = process.argv[2];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await p.goto('https://github.com/666ghj/MiroFish', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(out, 'gh_repo.jpg'), type: 'jpeg', quality: 92 });
  const star = await p.$('#repo-stars-counter-star');
  console.log('stars label:', star ? await star.getAttribute('title') : 'n/a');
  await p.evaluate(() => window.scrollTo(0, 1100)); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(out, 'gh_readme.jpg'), type: 'jpeg', quality: 92 });
  await b.close();
})();
