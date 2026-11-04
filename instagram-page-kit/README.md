# Instagram page kit: a business-news page in the style of @wealth

**Status: three real reels measured.** Instagram blocks the profile and reels tab, but each reel's public embed page can be read. All three measured reels (6.3M, 17.6M and 29.1M views) are **mindset lesson clips**, not business news, and they all use the same template (`reference/PATTERNS.md`). That format is rebuilt with footage you can safely use in `content/07-LESSON-CLIP-REELS.md`. The business-news parts of the kit are the genre's usual formats, not @wealth's.

| File | What it is | Status |
|---|---|---|
| `content/01-WEALTH-TEARDOWN.md` | Numbers, how the page evolved, why it reaches millions, how it makes money | Numbers and history are sourced. The format section is a DRAFT. |
| `content/02-PROFILE-SETUP.md` | Setting up the account from zero: name, Creator account, bio, settings, launch grid | Ready |
| `content/03-REEL-FORMATS.md` | Seven reel formats with specs and hook formulas | Based on the genre. Being checked against real reels. |
| `content/04-FIRST-30-REELS.md` | 27 evergreen scripts and 3 news templates | DRAFT. Facts need checking before posting. |
| `content/05-GROWTH-PLAYBOOK.md` | How Instagram picks who sees reels (2026), metrics, daily routine, 90-day plan, making money | Ready |
| `content/06-ORIGINALITY-AND-SOURCING.md` | What footage you can use without being cut from recommendations | Ready |
| `content/07-LESSON-CLIP-REELS.md` | @wealth's confirmed format: exact layout, the 3 hook types, caption template, 16 ready reels with footage you're allowed to use | Confirmed from real data |
| `content/08-GOOGLE-FLOW-WORKFLOW.md` | Making original clips in Google Flow: settings, prompt formula, how to upload them for editing | Ready |
| `test-01/` | First test reel, rendered and ready to post | Ready |
| `test-02/PROMPTS.md` | Flow prompts for the next test (2-shot metaphor) and a 4-shot story | Waiting for clips |
| `clips/` | Upload folder for Flow clips | Empty |
| `reference/` | Measurements of real @wealth reels, plus `PATTERNS.md` (what they all share) | 3 reels |
| `assets/` | Logo, headline overlays, covers, highlights, start-here carousel, format sheet, grid preview | DRAFT visuals |
| `scripts/headline.py` | Makes the headline PNG for any reel. `--style metaphor` gives @wealth's layout. | Works |
| `scripts/make_lesson_reel.py` | Turns one or more clips into a finished reel in the @wealth layout | Works |
| `scripts/make_pack.py` | Rebuilds every asset (change the name in `scripts/brand.py` first) | Works |

Rebuild assets:
```
python3 scripts/make_pack.py
python3 scripts/headline.py "Your headline here" --highlight "here" --out my-headline.png --preview
python3 scripts/headline.py "The Perfect Example Of What Saving Vs Investing Looks Like:" --highlight Saving --highlight Investing --style metaphor --handle --out frame.png --preview
```
