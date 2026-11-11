// node thumb.mjs [name ...] -> thumbnails/<name>.png at 1280x720 (all thumbnails by default)
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'thumbnails'), TMP = path.join(HERE, 'build');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + path.join(HERE, 'thumbs.html'));
await p.evaluate(async () => { await document.fonts.load('80px Thumb'); await document.fonts.load('80px Hand'); await document.fonts.ready; });
const names = process.argv.length > 2 ? process.argv.slice(2) : await p.evaluate(() => window.THUMB_NAMES);
for (const n of names) {
  await p.evaluate(n => window.renderThumbNamed(n), n);
  const full = path.join(TMP, `thumb_${n}.png`);
  await p.screenshot({ path: full });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', full, '-vf', 'scale=1280:720:flags=lanczos', path.join(OUT, `${n}.png`)]);
  console.log('thumbnail', n);
}
await b.close();
