# Instagram page kit: a business-news page in the style of @wealth

**Status: one real reel measured, the rest still a draft.** Instagram blocks the profile and reels tab, but a single reel's public embed page can be read. Reel 1 (`reference/01-DfLHlFtptGu.md`) had 17.6M views and turned out to be a **movie-scene metaphor about money mindset**. Its format is rebuilt in `content/07-MOVIE-METAPHOR-REELS.md`. Send more reel links (the top 10 by views) and each one gets the same treatment.

| File | What it is | Status |
|---|---|---|
| `content/01-WEALTH-TEARDOWN.md` | Numbers, how the page evolved, why it reaches millions, how it makes money | Numbers and history are sourced. The format section is a DRAFT. |
| `content/02-PROFILE-SETUP.md` | Setting up the account from zero: name, Creator account, bio, settings, launch grid | Ready |
| `content/03-REEL-FORMATS.md` | Seven reel formats with specs and hook formulas | Based on the genre. Being checked against real reels. |
| `content/04-FIRST-30-REELS.md` | 27 evergreen scripts and 3 news templates | DRAFT. Facts need checking before posting. |
| `content/05-GROWTH-PLAYBOOK.md` | How Instagram picks who sees reels (2026), metrics, daily routine, 90-day plan, making money | Ready |
| `content/06-ORIGINALITY-AND-SOURCING.md` | What footage you can use without being cut from recommendations | Ready |
| `content/07-MOVIE-METAPHOR-REELS.md` | @wealth's confirmed 17.6M-view format: exact layout, hook and caption formula, 12 ready reels with footage you're allowed to use | Confirmed from real data |
| `reference/` | Measurements of real @wealth reels | 1 reel so far |
| `assets/` | Logo, headline overlays, covers, highlights, start-here carousel, format sheet, grid preview | DRAFT visuals |
| `scripts/headline.py` | Makes the headline PNG for any reel. `--style metaphor` gives @wealth's layout. | Works |
| `scripts/make_pack.py` | Rebuilds every asset (change the name in `scripts/brand.py` first) | Works |

Rebuild assets:
```
python3 scripts/make_pack.py
python3 scripts/headline.py "Your headline here" --highlight "here" --out my-headline.png --preview
python3 scripts/headline.py "The Perfect Example Of What Saving Vs Investing Looks Like:" --highlight Saving --highlight Investing --style metaphor --handle --out frame.png --preview
```
