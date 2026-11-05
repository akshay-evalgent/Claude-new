# Viral film study: DISCIPLINE to LANTERN

A teardown of Day One Films' [DISCIPLINE | An Animated Short Film](https://www.youtube.com/watch?v=8atK0pF4oJY)
(2:38, 5.84M views in 39 days), the math of why it spread, a scan of 20 themes for open water, and the
film we should make instead. Data pulled 5 November 2026.

The full illustrated version, with interactive charts, is `report.html` (also published as an artifact).

## What's here

| Path | What it is |
|---|---|
| `report.html` | The full study: beats, mechanics, math, market scan, LANTERN treatment, build plan |
| `viral_math.py` | Prints every number in the math section (outlier score, log-normal odds, spread model). Offline. |
| `theme_radar.py` | Reruns the theme scan (`themes`), rebuilds the table offline (`summarize data/search`), or scores any channel's uploads against its median (`channel <url>`). Needs `pip install yt-dlp` for network modes. |
| `data/channel.json` | Day One Films' 18 uploads with views, plus the studied film's metadata and chapters |
| `data/themes.txt` | The 20 theme queries |
| `data/search/*.tsv` | Top-40 search results per theme: views, duration, channel, title |
| `data/search-extra/` | Side searches (Monk Mode Films sequels, "dad works hard", underdog) |

## Findings

1. **Why it worked.** A daily fight nearly everyone has (the snooze button), the excuse drawn as a red
   shadow, an on-screen day counter, a blank wordless everyman, three acts in 158 s (fall 38%, climb 40%,
   payoff 22%), a new picture about every 2 s, and a screenshot line at the end ("Day one, or one day.").
2. **Copying it fails.** 38 other channels uploaded "DISCIPLINE | An Animated Short Film". Together they
   have 52,134 views, under 1% of the original; median 72.
3. **Spread is a threshold.** With R = new views produced per view, total views ≈ seed ÷ (1 − R) below
   R = 1; above it the film reaches a fixed share z of its audience pool, where z = 1 − e^(−R·z).
   From R 0.90 to 1.10 the same 10K seed goes from 98K to 3.6M views. The theme's audience pool sets the
   ceiling.
4. **Hits are partly luck.** A log-normal fit to the channel's 18 uploads gives about 7% per film of
   passing 1M (raw: 2 of 18). 10 films → 51% chance of at least one; 20 → 76%.
5. **Sequels decay.** LUST VS LOVE 2.40M → Part 2 318K → Part 7 73K. "Lust Is Killing You." 1.5M →
   "Lust Is Poison." 51K.
6. **Open water.** Self-improvement themes (discipline, dopamine, overthinking) are 80–95% copies with
   under 1K views. Family and time themes are 15–17% copies with tens of millions of views on their top
   results.

## Recommendation: LANTERN

Every morning at 4:30 a father lights a lantern, scratches one mark on the wall by the door and walks into
the dark so his son can sleep. Twenty years later the son, stuck in his own snooze loop in the city, comes
home and sees the wall.

- Same skeleton as DISCIPLINE (daily fight, counter, fall/climb/payoff, quotable end), bigger audience,
  fewer copies, and a person to send it to.
- Look: blue-black night; the lantern's circle is the only warm color; faces drawn only when lit. Two
  lights: lantern amber (duty, love) against phone blue (comfort, the trap).
- Counter in the world: tally marks by the door beside the boy's height marks. Reveal at 1:24: 7,300.
- End card: **LANTERN** / "He gave you 7,300 mornings." / "Give him one."
- Titles to test: "7,300 Mornings | An Animated Short Film" (lead), "He Woke Up Before You. Every Day.",
  "LANTERN | An Animated Short Film".
- Vertical cut-downs: The wall (~30 s), Two lights (~20 s), The loop (~45 s).

The timed beat sheet is in `report.html`, part five.

## What we can build

1. The LANTERN film: animatic first, then a 2:30 master, three vertical cuts, three thumbnails, animated as
   code (Motion artifact) with any heavy acting shots handed to a 2D animator.
2. A reusable film kit (light mask, tally wall, walk cycles, weather, title cards, both aspect ratios) so
   films two and three cost far less.
3. Theme radar: done (`theme_radar.py`).
4. Pre-flight checks (no black first frame, picture change every ≤2 s, end hold <1.4 s, cuts on the beat)
   and a 48-hour R read after upload.

## Limits

YouTube blocked the full video download, so beats come from storyboard frames (every 2 s) and the caption
track, with no audio analysis. Channel-list views are rounded. The theme scan is relevance-ranked search
results, so it shows direction rather than a census. The spread model's seed and pool are illustrative;
concept scores are judgment.

## Rerun

```
python3 viral_math.py
python3 theme_radar.py summarize data/search
python3 theme_radar.py themes data/themes.txt --n 40 --out data/search   # network, slow
python3 theme_radar.py channel https://www.youtube.com/@dayonefilmsofficial/videos
```
