# Batch 3: source clips

**How these were chosen:**
- Mostly from creators whose footage already cut well for us (in-person, English-speaking, a clear payoff on camera), plus three new sources.
- None of these stories appear in Momentum Motivation's 224 Shorts.
- A quick search found no big reupload Shorts of any of them.
- YouTube blocked replay-peak data this time, except #3, which came from an earlier lookup. For the others, find the payoff with the "Most replayed" graph on the YouTube progress bar.

| # | Story | Source · views | Why it fits | Rights |
|---|---|---|---|---|
| 1 | [He refused to open the door… so they did something crazy](https://youtu.be/Kq7Kff0i9Ks) | RUDAN Brothers · 11M | Mystery hook ("why won't he open the door?"), then a home transformation | Creator (third RUDAN clip) |
| 2 | [They thought they only lost a wedding ring…](https://youtu.be/glztIR8l5L8) | Man + River · 11M | Lost-and-found with a twist, plus the owners' reaction | Creator |
| 3 | [Grandpa cries seeing his Corvette cleaned after 25 years](https://youtu.be/l0Knepszy2Q) | WD Detailing · 8.7M · Jul 2026 | Proven grandpa-and-car format. Most replayed: **18:34, 19:19, 21:35** | Creator |
| 4 | [Daughter surprised with her father's dream Firebird after 30 years](https://youtu.be/67BzkY08h6w) | WD Detailing · 5.2M · 2026 | Title promises the "best reaction ever" | Creator |
| 5 | [Code enforcement shows up while they help a 97-year-old lady](https://youtu.be/hVdTiVeYnTU) | RUDAN Brothers · 3.2M | Villain-plus-community arc, and a 97-year-old hook | Creator |
| 6 | [No one would help this veteran, so he drove 2,000 miles](https://youtu.be/TDeZv-URtL8) | Murphys Diesel · 1.8M · 2026 | **New creator.** Veteran kindness road trip | Creator |
| 7 | [Adopted man discovers his biological father is Michael McDonald](https://youtu.be/jxzJk0SRY3I) | KMOV St. Louis · 1.5M · 2026 | DNA reveal with a famous-dad twist; short (3:20), so a fast edit | Local TV news: possible claim |
| 8 | [After 46 years, U.S. Navy father reunited with his Filipino son](https://youtu.be/6YQMq1yxCHY) | The Leah and Blair Slog · 1.3M | Same format as our airman edit, father and son this time | Creator |
| 9 | [She found her family after 25 years in Vietnam: "I've never seen anyone who looks like me"](https://youtu.be/c6RQywrfdNQ) | Kyle Le Dot Net · 1.3M | Strong quote for the hook. Check it's in person, not a video call | Creator |
| 10 | [Man raised in an orphanage finds his father after 57 years](https://youtu.be/UD4lp04bySQ) | KLTV 7 · 257K · 2026 | 57-year reunion in a short news piece | Local TV news: possible claim |

**Alternates:**
- [Son surprises dad with his 1957 Bel Air for his birthday after 30 years](https://youtu.be/lifRrFi4W64): WD Detailing · 3.4M
- [Nurse lost her job, and her house was falling apart](https://youtu.be/TP0qExi2yMc): RUDAN Brothers · 4.2M
- [I found her lost iPhone underwater… then I called her](https://youtu.be/mnE3Je4Ltk4): Man + River · 3.3M
- [Surprising night-shift nurses with a gourmet meal](https://youtu.be/0UciSk5hgN8): Danny Kim · 5.9M (new creator; lighter emotion)

## Download (Windows cmd)

```bash
yt-dlp -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "%(channel)s - %(title).60s [%(id)s].%(ext)s" Kq7Kff0i9Ks glztIR8l5L8 l0Knepszy2Q 67BzkY08h6w hVdTiVeYnTU TDeZv-URtL8 jxzJk0SRY3I 6YQMq1yxCHY c6RQywrfdNQ UD4lp04bySQ
```

Upload them to `Momentum motivation/Batch 3` in the Drive folder.
