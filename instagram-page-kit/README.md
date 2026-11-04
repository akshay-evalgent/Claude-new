# Instagram page kit: a business-news page in the style of @wealth

**Status: partly a draft.** Instagram blocked automated viewing, so @wealth's reels have not been watched yet. The analysis comes from third-party trackers, cached profile snapshots and the genre's usual formats. Once you share screenshots or screen recordings of their top reels (put recordings in `reference/`), the files marked DRAFT below get rebuilt to match what @wealth actually does.

| File | What it is | Status |
|---|---|---|
| `content/01-WEALTH-TEARDOWN.md` | Numbers, how the page evolved, why it reaches millions, how it makes money | Numbers and history are sourced. The format section is a DRAFT. |
| `content/02-PROFILE-SETUP.md` | Setting up the account from zero: name, Creator account, bio, settings, launch grid | Ready |
| `content/03-REEL-FORMATS.md` | Seven reel formats with specs and hook formulas | DRAFT, to be checked against real @wealth reels |
| `content/04-FIRST-30-REELS.md` | 27 evergreen scripts and 3 news templates | DRAFT. Facts need checking before posting. |
| `content/05-GROWTH-PLAYBOOK.md` | How Instagram picks who sees reels (2026), metrics, daily routine, 90-day plan, making money | Ready |
| `content/06-ORIGINALITY-AND-SOURCING.md` | What footage you can use without being cut from recommendations | Ready |
| `assets/` | Logo, headline overlays, covers, highlights, start-here carousel, format sheet, grid preview | DRAFT visuals |
| `scripts/headline.py` | Makes the top-bar headline PNG for any reel | Works |
| `scripts/make_pack.py` | Rebuilds every asset (change the name in `scripts/brand.py` first) | Works |

Rebuild assets:
```
python3 scripts/make_pack.py
python3 scripts/headline.py "Your headline here" --highlight "here" --out my-headline.png --preview
```
