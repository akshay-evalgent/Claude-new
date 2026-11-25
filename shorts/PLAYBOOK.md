# Split-screen Shorts — playbook

## What works on @mevsmywife (65 Shorts, 79.3K subs, data in `research/channel-shorts.tsv`)

| Rank | Views | Title |
|---|---|---|
| 1 | 8.7M | Same fight. Same kid. 😡 vs 🤝 Kids forget what you fought about, never how 💛 |
| 2 | 6.7M | Strict parents vs chill parents 🔒🤗 |
| 3 | 4.8M | Parents who yell vs parents who talk, Part 3 |
| 4 | 4.1M | Big brothers protect you. Big sisters raise you 🤍 |
| 5 | 4.1M | Part 2 🚗 Same trip. Same kid. 😡 vs 🤝 |

Bottom of the table: *Mom driving vs Dad driving* (20K), *Parents who cut the WiFi vs leave it on* (2.4K).

**The formula, from their thumbnails and numbers:**

1. **One frame, two worlds.** Two stacked 16:9 scenes in a 9:16 frame. The same kid and the same moment, with one variable changed: how the parent reacts.
2. **Labels do the work.** A bold title on each panel ("PARENTS WHO YELL 😡"), plus a gold pill on the seam for time ("AGE 12", "24 YEARS LATER").
3. **A scoreboard.** A HUD counter in each panel ("FIGHTS HE HEARD 412" vs "SORRY HE HEARD 411"). The numbers diverge as the kid grows, so the story reads without sound.
4. **Time jumps.** 4–5 ages in about 30s, ending on an adult payoff: a callback, a cycle repeating, or a gut-punch line.
5. **Emotional stakes beat gags.** Parenting with real stakes gets millions of views. Light "mom vs dad" jokes get thousands.
6. **Series and parts.** Part 2 and Part 3 of a winning premise reach 2–5M. Once something hits, make more of it.
7. **The title carries the moral.** "Same X. Same kid. 😡 vs 🤝 + one-line moral 💛". About 28s long, 60fps, and the comment bait is "which one were you? 👇".

**From the six reference videos themselves** (top Shorts, 24–66s, 1080×1920 at 60fps):

- **No voices.** Speech detection found none in any of them. It's music and sound effects only, with every line in a text bubble, so the video works muted and in any language.
- **Dense dialogue.** A new line roughly every second, as back-and-forth exchanges, not single remarks.
- **Same staging in both panels.** The set, blocking and camera are identical; only the reaction differs.
- **An explicit callback.** In the payoff, the grown kid repeats a line, with an on-screen quote caption: *"I WORK ALL DAY!!" — his dad, 24 years ago*. The counter also resets for the new generation ("FIGHTS HIS SON HEARD 1").
- **Pop-up document cards** carry story facts: a math test with an F, a permission slip.
- **The moral lands as two lines** on a darkened frame in the last 3 seconds.

## Our angle (original, not a copy)

The format mechanics above are a genre convention. Everything we put on screen is our own:
- **Characters:** toy-like 3D figures with faces (v2). v1 used outlined 2D bean figures.
- **Look:** lit 3D sets with soft shadows and a moving camera, a warm palette and the Fredoka typeface. The reference channel is flat 2D, so 3D sets us apart at a glance.
- **Audio:** an original synthesized score and effects.
- **Scripts:** all new.

**Series identity: PARENTS WHO SCROLL 📱 vs PARENTS WHO LOOK 👀.** It's about attention and phones, which is topical, nobody owns it yet, and every parent feels guilty about it. Every episode reuses the engine, so a new one is mostly a new script plus one or two new sets.

## EP01 — "Same kid. Same drawing." (rendered: `releases/ep01/`; the 3D cut is `ep01-3d-*.mp4`)

Ages 5 → 8 → 12 → 16 → 25 years later. Top panel: the drawings stop at 2 and 214 get hidden. Bottom panel: 12,408 drawings and an art kid. Payoff: the grown kid is now the parent. The scroller's son scrolls on his own daughter. The looker's son kneels and says the same words his mom said, then pins her drawing next to his own 25-year-old one.

**Upload copy**
- **Title:** `Same kid. Same drawing. 📱 vs 👀 Kids don't stop drawing. They stop showing 🖍️`
- **Description:**
  ```
  Which parent did you have? 👇
  #parenting #parents #family #childhood #relatable #shorts
  ```
- **Pinned comment:** `Be honest… which one did you grow up with? 📱 or 👀`
- **Cover frame:** 3.3s (both reactions on screen), or upload `releases/ep01/cover.png`.

There are two files. `ep01-same-drawing.mp4` has our own score. `-sfx-only` has no music, so you can add a trending sound in the YouTube app.

## Test plan

Judge each upload at **48 hours** in YouTube Studio → Content → the Short → Analytics:

| Metric | Weak | Good | Breakout |
|---|---|---|---|
| Viewed vs swiped away | < 60% | 70–80% | > 85% |
| Average % viewed (32s) | < 70% | 80–100% | > 100% (people loop it) |
| Subs per 1K views | < 1 | 2–4 | > 5 |

- **Swipe-away is high:** the first 1.5s is the problem. Test a sharper hook line or start mid-action.
- **% viewed drops mid-video:** cut the slowest beat (usually beat 3) and go from 32s to about 26s.
- **Watch time is good but subs are low:** the payoff isn't paying off. Strengthen the last beat or the series promise ("Part 2 tomorrow").
- **Cadence:** 1 per day for 14 days before drawing conclusions. One Short is noise; ten is a signal. Never delete and re-upload a Short.
- **Cross-post** the same file to TikTok and Instagram Reels the same day.

## Next scripts (same engine)

| EP | Premise (top 📱 vs bottom 👀) | Counter | 25-years-later payoff |
|---|---|---|---|
| 02 | **Same kid. Same "watch this!" 🛝.** The playground slide: phone up vs eyes up | "tricks you saw" | He coaches kids; the other never tries out |
| 03 | **Same kid. Same bedtime story 📖.** Reading while scrolling vs doing the voices | "stories finished" | He does the voices for his own kid |
| 04 | **Same kid. Same goal ⚽.** Missed it on the phone vs screaming from the stands | "goals you saw" | "Did you see it, Dad?" Same line, next generation |
| 05 | **Same teen. Same bad day 🎒.** "mm" vs the phone going face-down: "talk to me" | "things he told you" | He calls home the night something big happens |
| 06 | **Same kid. Same "why?" ❓.** "Because I said so" vs "let's find out" | "questions asked" | Lab coat vs "I don't really ask questions" |

New sets needed: a playground (02), a stadium (04) and a car (05). 03, 05 and 06 reuse the bedroom and kitchen.

## Studying the reference videos

Video downloads are blocked from the cloud container. Run this on your own machine (`pip install yt-dlp`, and have ffmpeg installed):

```bash
yt-dlp -f "bv*+ba/b" --merge-output-format mp4 -o "%(view_count)s_%(id)s.%(ext)s" https://www.youtube.com/shorts/DITe6fPQehM https://www.youtube.com/shorts/d7grldWQU-g https://www.youtube.com/shorts/x8ouXEbL2Q8 https://www.youtube.com/shorts/YFpf0pbB8JQ https://www.youtube.com/shorts/KVoeAjY52Js https://www.youtube.com/shorts/61wEgSDFaJc
```

Then upload the six MP4s to `shorts/refs/` on the working branch, through GitHub → Add file → Upload files. That folder is in `.gitignore`, so take them out again after analysis. These are the other channel's videos: study them, don't republish them.
