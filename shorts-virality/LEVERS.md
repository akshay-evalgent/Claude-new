# How to raise E, and the smallest change that reaches millions

This builds on `README.md` (the model) and `FORMATS.md`. The numbers come from `python3 model.py levers`. As before, the constants are illustrative, but the structure holds up.

## What E is made of

```
ln E = 1.0·ln(viewed / viewed*)              hook
     + 0.7·ln(APV / APV*)                    retention and loops (APV and watch time move together at a fixed length)
     + 0.3·ln(engagement / engagement*)      comments, shares, likes, subscribes
     − π                                     originality penalty
```

Starred values belong to the median Short competing for the same viewers. Two more things change how much E you need without changing E itself: breadth `d`, and the size of the first batch.

## How much E is needed for a million

To have a 50% chance of a given 24-hour total:

| breadth d | 100k | 1M |
|---|---|---|
| 0.025 (broad appeal) | 0.166 | 0.217 |
| 0.030 (typical) | 0.183 | 0.236 |
| 0.045 (niche, or footage already circulating) | 0.227 | 0.288 |

So from a median Short you need about **0.24**: a score about 27% better than the competition's median. If your typical Short gets about 800 views in 24 hours, the model puts it at ln E −0.05, which makes the gap **0.29**.

## The smallest change: spread it across the levers

Let one unit of effort be moving a metric by one standard deviation of how much it naturally varies across your own Shorts (`s_i`, the sd of its log). Doubling a move costs four times as much, because the further you push a metric past your normal range, the harder each extra bit gets. Then:

```
minimise  Σ (x_i / s_i)²    subject to   Σ w_i·x_i = gap

x_i     = gap · w_i·s_i² / Σ_j (w_j·s_j)²
effort  = gap² / Σ_j (w_j·s_j)²
```

**Each lever's share of the gap is proportional to `(w_i·s_i)²`.** You never put everything into one lever.

With guessed spreads (viewed 0.10, APV 0.20, engagement 0.40), the leverage per sd, `w_i·s_i`, is:

| lever | ln E per +1 sd | alone, it must go | as part of the smallest plan |
|---|---|---|---|
| Retention (APV) | 0.140 | 70% → 99% (1.7 sd) | **70% → 82%** (0.75 sd) |
| Engagement | 0.120 | 3.0% → 6.6% (2.0 sd) | **3.0% → 3.9%** (0.64 sd) |
| Hook (viewed rate) | 0.100 | 70% → 89% (2.4 sd) | **70% → 74%** (0.54 sd) |

The combined plan takes **45% of the effort** of the best single lever. In total it is a move of about 1.1 sd, which is roughly "a clearly better than usual Short on all three counts" rather than "a miracle on one". From an 800-view starting point the plan becomes viewed 70 → 75%, APV 70 → 85% and engagement 3.0 → 4.1%.

The three levers are within 40% of each other per sd, so **their order depends on how much each metric varies on your channel.** Measure that with `python3 model.py levers --csv mystudio.csv` (columns `viewed`, `apv`, `engagement`). Gains also come cheaper from a low starting point, because the edge uses logs: going from 60% to 70% viewed is worth 0.154, while 80% to 90% is worth only 0.118. **Whichever metric you are weakest on is usually the cheapest to fix.**

## Priority ranking

| # | change | worth | why it ranks here |
|---|---|---|---|
| 1 | **Stop subtracting**: no reposted footage, no claimed content in Shorts over 1 minute, no clips already circulating | up to +0.05 (≈ 3.5 points of viewed rate), plus lower `d` | free; a penalty gets squared like everything else |
| 2 | **Retention**: cut dead air, keep the picture changing, end so it flows back into the start | biggest share of the smallest plan (45%) | editing-only; it moves APV, watch time and loops at once |
| 3 | **Hook**: put the payoff or the question in the first 1-2 s | highest weight per point (1.0); 23% of the plan | the fastest thing to test, since viewed vs. swiped shows up within the first hour |
| 4 | **Engagement**: give people something to answer, correct or send to someone | 33% of the plan | real but harder to engineer; bait invites "not interested", which the ranker also predicts |
| 5 | **Breadth**: sound-off captions you can read, universal stakes, no insider context | +0.019 per 0.005 off `d` | lowers the bar instead of raising E |
| 6 | **Length** | about ±0.02 between 15 s and 45 s | small, unless retention shows a cliff |
| 7 | **First-batch size, posting time** | doubling the first batch = +0.015 (≈ 1 point of viewed rate) | it acts once on the starting count, while the edge acts on every cycle |

Volume isn't E, but it buys you more draws against first-gate luck (README §4).

## Ways to raise each lever

**Hook (viewed rate).** The first frame plays the role of a thumbnail, because nobody clicks to start a Short.
- Open on the most surprising image or line: the payoff, a question, or the stakes. Don't open on set-up.
- Have motion or a change on screen from frame 0. No fade-in, logo or title card.
- Put text on screen in the first frame for viewers with the sound off, at a size that can be read on a phone.
- Have sound at frame 0.

**Retention (APV, loops).**
- Find the dips in Studio's retention graph and cut or animate exactly those seconds. Under a constant drop-off rate, trimming time is worth almost nothing; it is the *above-average* drop-off at dead spots that costs you.
- Keep the picture changing every 2-3 s, and put the next question before the current answer (an open loop).
- End on the payoff, with no hold. Make the last frame or last line lead back into the first, so a replay feels like a continuation.

**Engagement.**
- Give people a claim to agree or disagree with, a question about themselves ("could you…?"), or a detail to spot.
- Make it something worth sending to a particular person.
- Pin a comment that starts the conversation, and avoid "comment below" style bait.

**Breadth (`d`).** Captions that carry the whole story with the sound off, one line of context for outsiders, and stakes anyone feels (family, home, fear, luck).

## Applied to Map From Memory

Going by `film/NOTE.md` and the stills in `film/look/`:

1. **Hook: the payoff is at the end, and the opening is a set-up shot.** It starts on a calm walk with "The boy followed". The remarkable part is the map drawn from memory, posted online, that found his mother after 33 years, and it arrives at 22-36 s. A 1-2 s cold open fixes this: the map frame with the red dot and one line such as "He drew his village from memory. It found his mother 33 years later." Then cut back to "The boy followed". This is the single change most likely to move viewed rate.
2. **Retention:** the 2.4 s of unchanged picture at 5.83-8.21 s (train, "he was alone") lands right after the hook window. Trim it or keep it moving. Drop the 1.67 s end hold.
3. **Loops: the last shot already matches the first.** It shows a pair walking past the village under the mountains, which is nearly the opening frame. Cut the hold and the corner "33 YEARS" label, and let the last frame dissolve straight into the first. A replay will then read as the story starting again.
4. **Breadth:** the captions are one or two words at a time, at the floor of what can be read (x-height 0.035-0.04 of the frame height). Viewers with the sound off can't follow the story from them. Use bigger, fuller phrases.
5. **Engagement:** the story carries a built-in question, which you could ask in a pinned comment or a last caption: *could you draw your childhood home from memory?*

Check the retention graph before and after. If the dip is at 6-8 s, item 2 is confirmed. If most of the drop is in the first 2 s, item 1 is.

## Run it

```bash
python3 model.py levers                         # from a median Short
python3 model.py levers --typical-views 800     # from where your Shorts are now
python3 model.py levers --d 0.025 --csv mystudio.csv   # your breadth, your measured spreads
```
