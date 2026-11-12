# Batch 2: source clips

Found with YouTube search filtered to this year and sorted by views. None of these stories appear in Momentum Motivation's 224 Shorts, and no big reupload Short turned up for any of them in a quick search. "Peaks" are the video's most-replayed moments, which is where the payoff usually is.

Post them in priority order. The first five come from creators you can ask for permission. The rest are network clips, which are likely to get Content ID claims (revenue goes to them, or the Short is blocked in some countries).

| # | Story | Source · views · uploaded | Peaks | Why it fits | Rights |
|---|---|---|---|---|---|
| 1 | [Camera lost in a river for 15 years, returned to its owner](https://youtu.be/6saQ5PpgO24) | Man + River · 2.9M · Apr 2026 | **27:12, 28:07** | Mystery hook, plus the owner's reaction to old memories | Creator: ask |
| 2 | [Restoring a late grandpa's abandoned "Bumblebee" Camaro for his grandson](https://youtu.be/vZKU19CbowI) | WD Detailing · 4.1M · 2026 | (blocked; check "Most replayed") | Same family as our Jetta/Ferrari hits | Creator: ask (third WD clip, so build the relationship) |
| 3 | [Strangers' broken house transformed for free](https://youtu.be/pxunUuSogHw) | RUDAN Brothers · 13.2M · 2026 | (blocked) | Biggest video in this list; same format as our grandpa-home edit | Creator: ask |
| 4 | [Two brothers find their birth mom in Vietnam after 27 years… then their father](https://youtu.be/jJ9BdRKIFS8) | Kyle Le Dot Net · 386K · Sep 2026 | **20:51, 22:35** | Double reveal (mom, then dad) | Creator: ask (we already used Kyle's video) |
| 5 | [Groom cries as his paralyzed bride walks down the aisle](https://youtu.be/YeBHwGq1Zmc) | Happily · 2.1M · May 2026 | **1:09, 1:41** | Short source, so a fast edit; huge payoff moment | Curator channel: ask Happily, or find the couple's original |
| 6 | [Doctor adopts a boy who came to surgery alone, then finds homes for his 5 siblings](https://youtu.be/nGxqelnBOIQ) | CBS Evening News · 5.5M · Mar 2026 | **0:59, 1:31, 2:10** | Strongest story here, with a second twist | Network: likely claim |
| 7 | [Widow living at her husband's grave, until an "angel" helped](https://youtu.be/adxRtmamWnQ) | CBS Evening News · 2.8M · Jan 2026 | **0:40, 2:14** | Heartbreak opener, rescue payoff | Network: likely claim |
| 8 | [People mocked his mangled truck, until one man stepped up](https://youtu.be/Zw0c2fmv1RM) | CBS Evening News · 3.4M · Jan 2026 | **0:52, 1:59, 2:30** | Underdog story, stranger's kindness | Network: likely claim |
| 9 | [After decades alone, two Michigan singles find love in cardiac rehab](https://youtu.be/9BVggIvfXnE) | CBS Evening News · 1.6M · Nov 2026 (days old) | none yet | A fresh love story; being first to cover it matters | Network: likely claim |
| 10 | [Woman abandoned as a baby meets the hero who saved her](https://youtu.be/1sk670GyxtQ) | Good Morning Britain · 2.0M · 2026 | (blocked) | Reunion with a stranger-hero | Network (ITV): likely claim |

**Alternates:**
- [Grandpa's Corvette cleaned after 25 years](https://youtu.be/l0Knepszy2Q): WD Detailing · 8.7M · Jul 2026 · peaks 18:34, 19:19, 21:35
- [Homeless man's first haircut in years](https://youtu.be/uPV4To80xLk): ASMR Transformation · 11.5M · Oct 2026 (a transformation reveal; a slightly different lane)
- [Stranger gifts a boy with autism a piano: "He's Mozart"](https://youtu.be/LMJDdSUPNS4): CBS Evening News · 1.4M

**Skipped:** a deaf fifth-grader hearing clearly for the first time (Humankind, 913K). That topic already has five or more big Shorts from hospitals and news outlets.

## Download (Windows cmd)

```bash
yt-dlp -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "%(channel)s - %(title).60s [%(id)s].%(ext)s" 6saQ5PpgO24 vZKU19CbowI pxunUuSogHw jJ9BdRKIFS8 YeBHwGq1Zmc nGxqelnBOIQ adxRtmamWnQ Zw0c2fmv1RM 9BVggIvfXnE 1sk670GyxtQ
```
