# The maths of a Short's first 24 hours (condensed)

Full derivations, charts and the simulator: `shorts-virality/README.md`, `FORMATS.md`, `LEVERS.md`,
`model.py`. **YouTube does not publish its ranking.** What follows is a model whose parts match
public facts. Its constants are illustrative, but the *shapes* hold up. Say this whenever you quote
a number from it.

## Public facts the model rests on

- Since 31 Mar 2025 a Shorts view counts **every start and every replay** (no minimum watch time),
  so views ≈ impressions. The question is why the feed hands out more impressions.
- Studio shows **Viewed vs. swiped away** and **APV** (average percentage viewed; it can exceed
  100% with replays).
- YouTube's ranking research scores each impression on several predicted behaviours (watch, likes,
  dismissals…) and combines them (Covington 2016; Zhao 2019).
- **1 Oct 2026:** Shorts recommendations "further prioritize original content". Channels that
  mostly re-upload others' videos "will likely see less distribution". Minor or template edits and
  narration over someone else's clip don't count as original.
- Shorts **over 1 minute with a Content ID claim are blocked**. A claim on a shorter one sends the
  revenue to the rights holder. Templated, mass-produced content ("inauthentic") can't be monetised.

## The model in five equations

1. **Edge** of a Short against the median Short competing for the same viewers:
   `ln E = 1.0·ln(viewed/viewed*) + 0.7·ln(APV/APV*) + 0.3·ln(engagement/engagement*) − π`
   (weights illustrative; π = originality penalty). Logs mean improvements **multiply**.
2. **Ranking magnifies the edge:** a feed slot goes to the best score, so a Short's share of slots
   is about `E^κ` (softmax, κ ≈ 6). Being 10% better gets ~1.8× the impressions.
3. **Test → measure → expand:** `n_{k+1} = n_k · E^κ · e^{−κ d k}`. Each wider audience fits a
   little worse, at a rate set by **breadth** `d`.
4. **Views are quadratic in the edge:** `ln(views / first batch) ≈ κ (ln E)² / (2d)`. Twice the
   edge is about **220×** the views. That is why near-identical Shorts land at 1k and at 1M.
5. **Luck at the first gate:** the first decision uses a few hundred impressions, and κ amplifies
   the noise. The same Short simulated many times ranged from 75k (P10) to 24M (P90).

## Numbers worth remembering (model, illustrative)

| quantity | value |
|---|---|
| edge for a 50% chance of 1M in 24 h | ln E ≈ 0.24 (≈27% better than the median; 0.22 if broad, 0.29 if niche) |
| viewed rate 70% → 80% (all else median) | median 24 h views ×14 |
| smallest path to millions | viewed 70→74%, APV 70→82%, engagement 3.0→3.9%, **all together** = 45% of the effort of pushing one lever |
| hour-1 views | almost no information (R² 0.21); first-batch *rate* metrics ≈ 2 h views (R² 0.80) |
| posting time | moves the 2 h number ~5×, the 24 h number barely; don't compare early numbers across post times |
| direct sharing | R ≈ 0.008, <1% of views; shares matter as a *ranking signal*, not a channel |
| doubling the first batch | worth ≈ 1 point of viewed rate (it acts once; the edge acts on every cycle) |

## Priority ladder (cheapest path to a higher edge)

1. **Stop subtracting**: no reposted footage (π), no claimed content in a Short over 60 s, no
   footage already circulating (raises `d`). Free, and penalties are squared like everything else.
2. **Retention**: cut dead air and frozen picture, keep the image changing, end so it flows into
   the start (loops). Editing-only, and it moves APV, watch time and loops at once.
3. **Hook**: payoff or question in the first 1-2 s. Highest weight per point, and the fastest to
   read (viewed vs. swiped shows within the first hour).
4. **Engagement**: something to answer, correct or send to someone. No bait: "not interested" is
   predicted too.
5. **Breadth**: sound-off captions, universal stakes, no insider context. This lowers the edge you
   need rather than raising E.
6. **Length**: only ±0.02 between 15 and 45 s, unless retention shows a cliff.
7. **Posting time and first-batch size**: last.

Whichever metric is **weakest on the channel is usually the cheapest to fix**, because the edge
uses logs: 60→70% viewed is worth 0.154, while 80→90% is worth only 0.118.

## Formats (edited footage vs. animation)

There is no format bonus. A format changes the mean edge μ, the spread across Shorts σ, the
breadth d, the hours per Short h, and the penalty π. `hits per 100 h = (100/h) × P̄(μ−π, σ, d)`.

- **When hits are rare, quality beats volume**: +0.05 edge makes up for 10× fewer Shorts.
  **When hits are common, volume wins.**
- A **hit-or-miss** format beats a steady one below the bend of the S-curve (0.6% → 19.5% at the
  same mean). Above the bend it loses.
- Reposted footage pays twice: saturation (d 0.03 → 0.05 cuts the chance of 1M by 15×) and the
  originality penalty (π 0.05 cuts the median by 5.7×).
- Per Short, original animation has the best odds. Per hour, cheap but genuinely original or
  genuinely edited work wins.

## Tools (in `shorts-virality/model.py`)

`demo`, `formats`, `levers [--typical-views N] [--csv studio.csv]`, `compare shorts.csv`
(per-format hit rates), `fit history.csv` (early → 24 h forecast). All of these read
`shorts-virality/results.csv`.
