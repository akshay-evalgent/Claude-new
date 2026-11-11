#!/usr/bin/env node
// Export the channel brand assets and an episode's thumbnails as PNGs.
//
//   node chatvid/brand/render_brand.mjs                      # avatar, banner, watermark
//   node chatvid/brand/render_brand.mjs chatvid/episodes/ai-is-a-toaster.json   # + its thumbnails
//
// Output: chatvid/brand/export/
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'export');
fs.mkdirSync(OUT, { recursive: true });
const channel = JSON.parse(fs.readFileSync(path.join(HERE, 'channel.json'), 'utf8'));

const browser = await chromium.launch();
async function shot(kind, w, h, spec, file, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(pathToFileURL(path.join(HERE, 'brand.html')).href);
  await page.evaluate(([k, ww, hh, s]) => window.draw(k, ww, hh, s), [kind, w, h, spec]);
  await page.locator('#root').screenshot({ path: file, omitBackground: transparent });
  await page.close();
  console.log('  ', path.relative(process.cwd(), file));
}

await shot('avatar', 800, 800, {}, path.join(OUT, 'profile-picture-800.png'));
await shot('banner', 2560, 1440, channel.banner, path.join(OUT, 'banner-2560x1440.png'));
await shot('banner', 2560, 1440, { ...channel.banner, guides: true }, path.join(OUT, 'banner-safe-area-check.png'));
await shot('watermark', 150, 150, {}, path.join(OUT, 'watermark-150.png'), { transparent: true });

const epPath = process.argv[2];
if (epPath) {
  const ep = JSON.parse(fs.readFileSync(epPath, 'utf8'));
  const slug = path.basename(epPath, '.json');
  for (const [i, t] of (ep.youtube?.thumbnails || []).entries()) {
    await shot('thumb', 1280, 720, t, path.join(OUT, `${slug}-thumb-${String.fromCharCode(97 + i)}.png`));
  }
}
await browser.close();
