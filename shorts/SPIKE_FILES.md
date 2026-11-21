# The Spike Files: channel plan

**One channel, several series, all about why YouTube channels suddenly blow up, proven with data.**
Viewers are people who want to grow a channel (a huge audience), so every video ends with something they can copy.

## Brand

| | |
|---|---|
| **Name** | The Spike Files |
| **Handle** | `@thespikefiles` (no channel existed at this handle on Nov 21; claim it first). Backups: `@spikefiles`, `@graphgoesup` |
| **Tagline** | Why channels suddenly blow up. With the data. |
| **Signature visual** | A flat row of grey bars, then one green spike (the logo, and the first shot of most videos) |
| **Colours** | Near-black `#0C0C10`, spike green `#3DFF88`, white text |
| **Fonts** | Montserrat Black (numbers, logo), Open Sans ExtraBold (captions) |
| **Naming** | No episode numbers. Every video stands alone, so formats and styles can be tested freely |
| **Avatar / banner** | `spike_avatar.png` (800×800) and `spike_banner.png` (2560×1440, text inside the safe area), made by `spike_clips.py avatar/banner` |

**About text:**
```
Every viral channel has a moment where the graph goes vertical. We pull the public numbers, find that moment, and show exactly what changed, so you can steal it.
New file every day. Comment a channel you want investigated.
```

## Why this can work (and what to avoid)

Checked Nov 16–21 (median views per video, whole channel, not lucky hits):
- **One channel's breakout, explained** works: Paddy Galloway 447K, Jack Craig 559K (long-form).
- **YouTube growth tips as Shorts** don't: vidIQ 6K (2.5M subs), Think Media 6.5K.
- **Ranking lists of growing channels** don't: Youtubers Rankings 2K.

So: **one channel per video, one shocking number, one lesson to copy.** Never a top-5 list.

## The series (test them one by one)

Each series gets **at least 2 episodes** before we judge it. Keep the 2 best, drop the rest.

### 1. Spike Files: the breakout (flagship) — 3 made
One channel's flat history, the spike, what visibly changed, proof it wasn't luck, a "Steal this" card.

| Time | Beat | Visual |
|---|---|---|
| 0–5s | The contrast: "161 flops. Then 31 million." | Chart of every Short; the spike rises |
| 5–8s | Open loop: "So what changed?" | Wall of dimmed flop thumbnails, the hit pops out |
| 8–13s | The visible change | Before vs after thumbnails, with views |
| 13–17s | The measured change | "17% → 80%" stat card (titles, topics, format) |
| 17–22s | Proof it's not luck | Chart of everything since, all the green bars |
| 22–27s | **Steal this** | 3-line card people screenshot |
| 27–30s | CTA | Logo: "Who do we investigate next? Comment it" |

### 2. Tiny Channel, Giant Hit
The mismatch is the hook: "3,000 subscribers. 5.3 million views." Then: what's in that one video?
Candidates from the Nov 21 scan:
- **Nothing Like Cars** (@NothingLikeCars): 3.2K subs, 20 Shorts, "why MIATA is the most loved car" 5.3M
- **Space Unmasked** (@space-unmasked): 3K subs, 21 Shorts, "India Tried to Stamp Its Emblem on the Moon. The Moon Said No." 3.8M
- **Cigbock** (@CigbockMemes): 6.2K subs, "Pringles Activated" 15M
- **Brain Pits** (@BrainPits): 7.6K subs, "This Paper Lets You Cook a Full Meal With Zero Cleanup" 12M

### 3. Same Idea, Different Views
Two near-identical Shorts with wildly different results, so viewers play spot-the-difference.
**Episode 1 (found Nov 21):** the title "It was a hot summer night… Until the power cut" was posted **3 times by Golden Footprints** (123K → 528K → **6.3M**) and once by Shano Ghibli (193K). The hook: "Same title. Four uploads. 123K to 6.3 million." Before making it, compare the four thumbnails and check whether one channel copied the other. If so, that becomes the story.

### 4. Steal This Format
A format spreading across many small channels right now: show 4–5 channels using it, the template, and how to do your own version.
Candidates: Ghibli-style "1990s village family" stories (Shano Ghibli, Golden Footprints); "Top 10 letters / languages to…" rankings (OddVibe and copycats); 45-minute "LIVE slime unlock" streams (2–5M views each this week).

### 5. Guess the Views (interactive)
Two Shorts from the same channel: "One got 15K. One got 2.6M. Which?" Pause and reveal. People comment their guess before the answer, and that drives the algorithm.
Easy to make from the files we already have (every channel in the scan has a flop and a hit).

### 6. The Short That Changed Everything
A famous creator's first breakout Short, using the same chart. The famous name brings fans; the chart makes it our own content.
Needs: pulling their full Shorts history (big channels have thousands of Shorts, so the scan takes longer).

### 7. Race to 1M (later)
A live-style race chart between 5 rising channels. Needs daily subscriber logging (start now, publish after 3–4 weeks of real data). Never fake the in-between days.

### 8. The Experiment Diary (our own numbers)
"This channel is an experiment. Here are our real Studio numbers this week, and what we'll change." Weekly. Only we have this data, and the honesty builds trust.

## Launch order

1. **Fusion Bricks** ("31 million views, after 161 flops"). Biggest numbers, underdog story, LEGO appeals to everyone. This is the one with viral potential, so it goes first.
2. Shano Ghibli ("Food got 7K. Feelings got 16 million.")
3. OddVibe ("Letters as a mustache: 15K. Letters to hide a body: 2.6M.")
4. Same Idea, Different Views #1: "the hot summer night" (4 uploads, 123K to 6.3M)
5. Tiny Channel, Giant Hit #1: Nothing Like Cars
6. Guess the Views #1
7. Steal This Format #1: Ghibli-style village stories
8. Then repeat the two series that won.

**What to measure (48h after each upload):** views, stayed to watch %, average % viewed, comments asking for a channel, and subscribers per video. A series wins if **stayed to watch is above 70%** and comments request more.

## The look (v2): what makes it feel edited

Built after the first samples looked too plain. Every scene is full-screen and something changes every 1–2 seconds:

| Element | What it is |
|---|---|
| **Real frames of the Shorts** | YouTube serves four full-resolution frames of every Short (the cover and three moments). They're cut fast, like stop-motion. With downloaded files they become real moving clips (see below) |
| **The real channel page** | Screen captures of the channel's own Shorts tab, sorted Oldest and Most popular, scrolling inside a tilted 3D phone. The view counts pop out as big labels |
| **3D chart city** (three.js) | Every Short is a block, with its real view count as the height. The camera flies over the flat flops, the breakout tower shoots up, then the camera cranes over everything since |
| **Word-by-word captions** | Each word pops in as it's spoken, key words in green |
| **Counters and stamps** | Numbers race up to the real value; flops get red view-count stamps |
| **Before / after** | Whole real frames side by side, a hand-drawn ring on what changed, the real titles typed out |
| **Title wall** | The channel's real titles scrolling in two columns, cliffhangers lit up, with the measured percentages |
| **Sound design** | Impacts, risers, counter ticks, whooshes, and a beat that drops out before the reveal |

**Hook rule (first 3 seconds):** the most striking real frame of the hit, a counter racing to its view count, then a rapid cut through the flops. No intro, no logo.

**Three hook types so far** (each video uses a different one, so we can compare them):

| Hook | How it opens | Used in |
|---|---|---|
| **Big number first** | The hit's frame, a counter racing to its views, then the flops | Fusion Bricks |
| **Flip** | The flop with a red stamp, a smash cut to the hit and its counter, then both: "same channel" | Shano Ghibli |
| **Guess** | Two real frames and a question ("Which got 2.6M views?"), then the reveal | OddVibe |

**Real clips:** YouTube blocks video downloads from the render machine, so the user downloads the few Shorts an edit names (the kit lists the command) and `spike_v2/clips.py` cuts excerpts of 3 seconds or less. Each excerpt is shown with our own analysis on top and the channel credited.

## How each video is made

1. **Scan** (`tools/spike/bo_search.py`, `bo_hist.py`, `bo_rank.py`): about 75 niche searches for this week's/month's most-viewed Shorts, then every candidate channel's full Shorts history (public view counts, in upload order). The scan flags channels whose median jumped 5x+ after one hit and stayed there.
2. **Pick**: you choose from the shortlist. Skip reupload/compilation channels and kids-focused channels.
3. **Investigate** (`tools/spike/bo_show.py`): before/after medians, title patterns (measured, not guessed).
4. **Collect** (`spike_v2/fetch_assets.py`, `spike_v2/yt_ui.js`): the four real frames per Short, and captures of the channel's Shorts tab (Oldest / Popular) with the position of every view count.
5. **Script** (`edits_spike/<channel>.json`): scenes with caption chunks; each chunk is voiced on its own so captions land exactly.
6. **Render** (`spike_v2/make.py`): narration timeline → every frame drawn in a headless browser (`spike_v2/web`) → sound mix at -14 LUFS.

The first card-style versions are kept as `edits_spike/v1_*.json` (`spike_clips.py` + `breakdown.py`).

## Rules (keep the channel safe and trusted)

- **Only public numbers.** YouTube rounds view counts (e.g. "31M"), so we say "about" when it matters. No revenue guesses, ever.
- **"Why" means visible, measured changes** (titles, topics, framing), never claims about the algorithm's internals.
- **Credit every channel** on screen and in the description. Then comment on their video. Featured creators often share it.
- **Thumbnails only as evidence** next to our own charts and commentary. No reposting their videos.
- **Avoid:** reupload/compilation channels, children's faces as the focus, and anything that shames a creator.
- **Altered or synthetic content:** No (charts and real thumbnails). The narration is an AI draft voice. A recording of your own voice is better for trust and monetisation.
