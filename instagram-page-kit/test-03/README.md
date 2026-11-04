# Test 03: "1% Better Vs 1% Worse Every Day 📈" (animated, Money Maths #1)

The first reel built to `content/10-ANIMATION-RECIPE.md`. It's a motion graphic drawn entirely in code, so it's 100% original: no footage and no copyright. It isn't photorealistic, so it doesn't need Instagram's AI label.

## What happens on screen (12 s, loops)

| Time | What you see |
|---|---|
| 0.0 s | Already moving: Day 1, two equal squares (1.01x vs 0.99x), the progress bar starting |
| 0 to 7.5 s | Days race to 365, speeding up the way compounding does. The yellow square grows, the grey one shrinks. |
| 7.5 s | **Reveal:** 37.78x vs 0.03x lands with a punch |
| 7.5 to 10.2 s | Hold on the result |
| 10.2 to 12 s | Rewinds to Day 1, so the end flows straight into the start and the reel loops |

The maths is exact: 1.01³⁶⁵ = 37.78 and 0.99³⁶⁵ = 0.0255 (shown as 0.03). Square areas are proportional to the values.

## Pre-flight score: 10/10

| # | Check | |
|---|---|---|
| 1 | Moving on frame 1 | ✓ the counter ticks and the squares change from the first frame |
| 2 | Hook of 7 words or fewer, with a number or contrast | ✓ "1% Better Vs 1% Worse Every Day", 7 words, two contrasting numbers |
| 3 | One clear focal point | ✓ one pair of squares, side by side |
| 4 | 8 to 15 s | ✓ 12 s |
| 5 | Visible progress | ✓ day counter and progress bar |
| 6 | Payoff late, with a punch | ✓ reveal at 7.5 s with a scale punch (just before the last third, so the hold reads) |
| 7 | Something new at least every 2.5 s | ✓ continuous change, then reveal, then rewind |
| 8 | Seamless loop, no outro | ✓ the last frame matches the first |
| 9 | Clear who to send it to | ✓ "the friend who keeps waiting for the perfect time to start" |
| 10 | Series and consistent look | ✓ "MONEY MATHS #1" on screen and in the caption |

## Posting it

1. Get `test-03.mp4` onto your phone (GitHub > Download, or Google Drive. Not WhatsApp).
2. Instagram > + > Reel > pick the video.
3. **Song:** pick an upbeat or inspiring trending track (↗ arrow). In the music picker, **slide the song so its drop or beat change lands at 7.5 s**, the reveal. Volume 100% (the file is silent).
4. Paste `caption.txt` and replace `@YOURHANDLE`.
5. Cover: `test-03-cover.jpg` (the reveal frame).
6. Turn on Upload at highest quality. Post between 7 and 9 pm.
7. Write down total views at 1, 3, 6 and 12 hours, then run `python3 scripts/viral_math.py track 1:… 3:… 6:… 12:…` or send them to me.

## Make the next one

```
python3 scripts/make_anim_reel.py one_percent --out test-03/test-03.mp4
```
New ideas are new scene functions in `scripts/make_anim_reel.py`. Tell me the idea and I'll write the scene, render it and check it the same way.
