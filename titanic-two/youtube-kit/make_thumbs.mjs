// node make_thumbs.mjs  -> thumbnail-1.jpg .. thumbnail-5.jpg (1280x720)
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('/opt/node22/lib/node_modules/playwright');
import path from 'path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
for (let v = 1; v <= 5; v++) { await p.goto(`file://${dir}/thumbs.html?v=${v}`); await p.waitForFunction('window.READY'); await p.waitForTimeout(300); await p.screenshot({ path: `${dir}/thumbnail-${v}.jpg`, quality: 92 }); }
await b.close();
