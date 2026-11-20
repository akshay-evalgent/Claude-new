#!/usr/bin/env node
// Render the prank channel's art from kit.html into brand/prank/export/.
//   node chatvid/brand/prank/render.mjs ["channel name"]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'export');
fs.mkdirSync(OUT, { recursive: true });
const name = process.argv[2] || 'sorry dad';
const browser = await chromium.launch();
async function shot(mode, w, h, extra, file) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const qs = new URLSearchParams({ mode, name, ...extra });
  await page.goto(pathToFileURL(path.join(HERE, 'kit.html')).href + '?' + qs);
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#' + mode).screenshot({ path: file });
  await page.close();
  console.log('wrote', path.relative(process.cwd(), file));
}
await shot('avatar', 800, 800, {}, path.join(OUT, 'profile-picture-800.png'));
await shot('banner', 2560, 1440, {}, path.join(OUT, 'banner-2560x1440.png'));
await shot('banner', 2560, 1440, { guides: '1' }, path.join(OUT, 'banner-safe-area-check.png'));
await browser.close();
