// node thumb.mjs -> thumbnail.png (1280x720)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + path.join(HERE, 'scenes.html'));
await p.evaluate(async () => { await document.fonts.load('80px Cap'); await document.fonts.ready; window.renderThumb(); });
await p.screenshot({ path: path.join(HERE, 'build', 'thumb_full.png') });
await b.close();
