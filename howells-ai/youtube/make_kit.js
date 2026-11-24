// Builds the upload extras next to this file:
//   captions.en.srt  - from the narration's word timings (vo/timeline.json); the voice starts at 0 s in the mix
//   cover.jpg        - 1080x1920 thumbnail: a frame of a clip (COVER, from out/clips) with the title on it
//   node youtube/make_kit.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const HERE = __dirname, ROOT = path.join(HERE, '..');
const COVER = 'out/clips/h22/f0040.jpg', TITLE = ['He threw away', '$1 billion', 'by accident'];   // the frame, and the cover's three lines

const tl = JSON.parse(fs.readFileSync(path.join(ROOT, 'vo/timeline.json')));
// Each narration line is cut into cues by a small dynamic programme. A cue should be about 24 characters and never
// more than MAX. Breaks are cheapest after a full stop, then after a comma, and costly right after a short function
// word ("the", "a", "her", ...), inside a name, or with a sentence ending in the middle of the cue.
const MAX = 40, IDEAL = 24, cues = [];
const WEAK = new Set(['a', 'an', 'the', 'of', 'to', 'her', 'his', 'was', 'in', 'into', 'on', 'and', 'out', 'she', 'he', 'that', 'over', 'with', 'for']);
const text = ws => ws.map(x => x[0]).join(' ');
for (const line of tl.lines) {
  const W = line.words, n = W.length, best = [[0, -1]];
  for (let j = 1; j <= n; j++) {
    best[j] = [Infinity, -1];
    for (let i = j - 1; i >= 0; i--) {
      const len = text(W.slice(i, j)).length;
      if (len > MAX && j - i > 1) break;
      const last = W[j - 1][0], bare = last.toLowerCase().replace(/[^a-z]/g, '');
      let brk = j === n ? 0 : /[.!?]$/.test(last) ? 0 : /,$/.test(last) ? 1.5 : WEAK.has(bare) ? 9 : 5;
      if (j < n && /^[A-Z][a-z]+$/.test(last) && /^[A-Z]/.test(W[j][0]) && i < j - 1) brk += 8;   // keep names whole
      const inner = W.slice(i, j - 1).filter(w => /[.!?]$/.test(w[0])).length;              // a sentence ending mid-cue
      const c = best[i][0] + (len - IDEAL) ** 2 / 60 + brk + (len < 10 ? 4 : 0) + inner * 6;
      if (c < best[j][0]) best[j] = [c, i];
    }
  }
  const cut = [];
  for (let j = n; j > 0; j = best[j][1]) cut.unshift([best[j][1], j]);
  for (const [i, j] of cut) cues.push(W.slice(i, j));
}
const ts = s => { const ms = Math.round(s * 1000); const p = (n, k = 2) => String(n).padStart(k, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
const srt = cues.map((c, i) => {
  const next = cues[i + 1], end = next && next[0][1] - c[c.length - 1][2] < 0.3 ? next[0][1] : c[c.length - 1][2];
  return `${i + 1}\n${ts(c[0][1])} --> ${ts(end)}\n${c.map(x => x[0]).join(' ')}\n`;
}).join('\n');
fs.writeFileSync(path.join(HERE, 'captions.en.srt'), srt);
console.log(cues.length, 'captions');
if (!fs.existsSync(path.join(ROOT, COVER))) { console.log('no clip frames yet: skipping cover.jpg'); process.exit(0); }

const b64 = f => fs.readFileSync(path.join(ROOT, f)).toString('base64');
const html = `<style>
@font-face { font-family: Anton; src: url(data:font/woff2;base64,${b64('assets/anton.woff2')}) format('woff2'); }
html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }
.bg { position: absolute; inset: 0; background: url(data:image/jpeg;base64,${b64(COVER)}) center / cover; }
.shade { position: absolute; left: 0; right: 0; top: 0; height: 1000px; background: linear-gradient(rgba(0,0,0,.82) 45%, transparent); }   /* title on top: the drive is in the lower half */
.t { position: absolute; left: 0; right: 0; top: 200px; text-align: center; font-family: Anton; color: #fff; line-height: .95;
     text-transform: uppercase; text-shadow: 0 6px 24px rgba(0,0,0,.6); }
.a { font-size: 200px; color: #ffd23f; margin: 10px 0 4px; }
.b { font-size: 120px; letter-spacing: 2px; }
</style><div class="bg"></div><div class="shade"></div><div class="t"><div class="b">${TITLE[0]}</div><div class="a">${TITLE[1]}</div><div class="b">${TITLE[2]}</div></div>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(HERE, 'cover.jpg'), type: 'jpeg', quality: 92 });
  await browser.close();
  console.log('cover.jpg');
})();
