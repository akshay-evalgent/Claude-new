// Builds the upload extras next to this file:
//   captions.en.srt  - from the narration's word timings (vo/timeline.json); the voice starts at 0 s in the mix
//   cover.jpg        - 1080x1920 thumbnail: a frame of the k03 clip (out/clips) with the title on it
//   node youtube/make_kit.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HERE = __dirname, ROOT = path.join(HERE, '..');

const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'vo/timeline.json')));
// split at punctuation into phrases, then cut any phrase longer than MAX into evenly sized pieces
const MAX = 34, len = ws => ws.map(x => x[0]).join(' ').length, cues = [];
for (const line of tl.lines) {
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    const n = Math.ceil(len(cur) / MAX), target = len(cur) / n;
    let piece = [];
    for (const w of cur) {
      if (piece.length && len([...piece, w]) > target + 4 && n > 1) { cues.push(piece); piece = []; }
      piece.push(w);
    }
    cues.push(piece); cur = [];
  };
  for (const w of line.words) { cur.push(w); if (/[.,!?]$/.test(w[0]) && len(cur) >= 12) flush(); }
  flush();
}
const ts = s => { const ms = Math.round(s * 1000); const p = (n, k = 2) => String(n).padStart(k, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
const srt = cues.map((c, i) => {
  const next = cues[i + 1], end = next && next[0][1] - c[c.length - 1][2] < 0.3 ? next[0][1] : c[c.length - 1][2];
  return `${i + 1}\n${ts(c[0][1])} --> ${ts(end)}\n${c.map(x => x[0]).join(' ')}\n`;
}).join('\n');
fs.writeFileSync(path.join(HERE, 'captions.en.srt'), srt);
console.log(cues.length, 'captions');

const b64 = f => fs.readFileSync(path.join(ROOT, f)).toString('base64');
const html = `<style>
@font-face { font-family: Anton; src: url(data:font/woff2;base64,${b64('assets/anton.woff2')}) format('woff2'); }
html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }
.bg { position: absolute; inset: 0; background: url(data:image/jpeg;base64,${b64('out/clips/k03/f0010.jpg')}) center / cover; }
.shade { position: absolute; left: 0; right: 0; bottom: 0; height: 900px; background: linear-gradient(transparent, rgba(0,0,0,.82) 55%); }
.t { position: absolute; left: 0; right: 0; bottom: 230px; text-align: center; font-family: Anton; color: #fff; line-height: .95;
     text-transform: uppercase; text-shadow: 0 6px 24px rgba(0,0,0,.6); }
.a { font-size: 220px; color: #ffd23f; }
.b { font-size: 120px; letter-spacing: 2px; }
</style><div class="bg"></div><div class="shade"></div><div class="t"><div class="a">9 days lost</div><div class="b">in the Sahara</div></div>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(HERE, 'cover.jpg'), type: 'jpeg', quality: 92 });
  await browser.close();
  console.log('cover.jpg');
})();
