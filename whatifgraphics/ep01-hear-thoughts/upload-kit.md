# YouTube upload kit — Episode 1

Everything below mirrors the packaging of the reference channel (@JeremyBearimyTheory): their
"What IF You…" title pattern, their description skeleton, their hashtag order, and their chapter style.
Copy-paste the blocks as they are. Swap in real links where marked `[ ]`.

---

## 1. Title

**Use this one:**

```
What IF You Could Hear What Everyone REALLY Thinks of You?
```

Why: identical shape to their top performers ("What IF You Could See Who Has a Crush on You?" 606K,
"What IF You Could See Everyone's Biggest Secret?" 373K). Capital **IF** is their signature; one word in
caps (REALLY) matches "ONLY GUY", "FAMOUS", "ACTUALLY". 58 characters, so it does not truncate on mobile.

A/B alternatives (YouTube's Test & Compare, in order of expected CTR):

1. `What IF You Could Hear Everyone's Thoughts About You?`
2. `What IF You Knew What Your Crush REALLY Thinks of You?`
3. `What IF You Could Hear What People Think of You? (It's Mostly About Your Hair)`

---

## 2. Description

```
What if you could hear what everyone really thinks of you? 🧠 One morning you wake up, and there's a voice in your head that isn't yours. It's your mum, in the kitchen, and she's thinking about selling your bed. Then you get on the bus, and forty strangers start rating your hoodie, your hair, and whether you're going to sit next to them. What happens when the thoughts you were never meant to hear just… don't stop?

In this animated what-if scenario, we imagine everyday life with the power to hear every thought that's about you: finding out what your crush really thinks when you do "the walk", catching your maths teacher being honest, acing a job interview by listening instead of talking, and settling arguments by telling both sides exactly what the other one is thinking. Every room becomes a comment section, and you can't close the tab.

Would you keep it secret, or turn it into a channel and go viral? Hearing what people think might make you the most liked person in your year, but it would also mean hearing your best friend think "I miss when he was normal", and discovering who never thinks about you at all. And when someone you love can't speak anymore, this power might be the only thing in the room doing any good.

This mind-reading adventure explores what happens when you can hear every opinion about you, and whether you'd still like people afterwards, or whether they'd still like you.

If you enjoyed this adventure, watch our other videos:
⏸️ What If You Could Pause Time? [link]
💸 What If You Had Infinite Money? [link]
👁️ What If You Could See Who Has a Crush on You? [link]
🔁 What If You Could Save and Load Your Day? [link]

If you could hear what everyone really thinks of you, would you keep it, or give it back? Tell us in the comments, and subscribe for more animated what-if scenarios, strange superpowers, and imaginary challenges!

Chapters:
0:00 The voice in your head
1:16 The rules: only thoughts about you
1:50 Your crush, Mia
2:40 The weekend job interview
3:11 Fishing for thoughts
3:38 Starting a channel
4:24 The video goes viral
4:41 The lab test
5:08 When everyone knows
5:52 The people who never think about you
6:16 What Leo really thinks
6:57 The hospital
7:46 The stranger on the bus
8:43 What you chose

#WhatIf #HearThoughts #MindReading #Superpowers #Animation #AnimatedStories #WhatIfYouCouldHearThoughts
```

Notes on why it is shaped this way:

- Paragraph 1 restates the title as the first sentence (their SEO habit), then drops the viewer into the scenario and ends on a question.
- Paragraph 2 always starts with "In this animated what-if scenario, we imagine…" and lists three or four concrete situations from the video.
- Paragraph 3 is the "Would you X or Y?" dilemma plus a consequence.
- Paragraph 4 is the "This [adjective] adventure explores…" theme line.
- Then the "other videos" list with emojis, the comment prompt + subscribe line, and hashtags with #WhatIf first and the premise-specific tags second.
- Chapters are an addition they used on their early videos and dropped; keep them, they help search and retention.

---

## 3. Thumbnail

File: `thumbnail.png` (1920×1080, under 2 MB, upload as is).

What it copies from the reference channel:

- Single mascot as the focal point, open-mouthed "shocked" expression, placed left of centre.
- Two to three reacting side characters with visible thought bubbles ("kind of cute…", "weird hair"), the same device as their "friend / CRUSH / friend" and girls'-school thumbnails.
- Two words of text, top-left, heavy comic font, yellow fill with thick dark outline: **HEAR THOUGHTS**.
- A red "YOU" badge with an arrow pointing at the mascot, their exact device from the girls'-school thumbnail.
- No logo, no clutter, high saturation, full illustrated background (classroom).

Alternate thumbnail text to test if CTR is under 5% after 48 hours:

- `MIND READER` with the mascot smug and the crush's bubble reading "he's cute"
- `EVERY THOUGHT` with the mascot covering his ears and a swarm of dark bubbles
- `CAN'T TURN IT OFF` with the mascot in bed, bubbles coming through the wall

To regenerate the thumbnail with new text, change `thumbText` in `render/shots.js` and run
`node render/render.js --build build --thumb`.

---

## 4. Tags

Paste into the Tags box (comma separated, 480 characters total, under YouTube's 500 limit):

```
what if, what if you could hear thoughts, hear what people think of you, mind reading, read minds, what if you could read minds, superpowers, what if you had superpowers, animated what if, animated story, animation, what if scenario, hypothetical, thought experiment, secret thoughts, crush, what your crush thinks of you, superpower story, what would you do, whatifgraphics, jeremy bearimy, what if series, mind reader, telepathy, hear everyone's thoughts, life with superpowers, cartoon story, animated scenarios
```

Why these: the reference channel's own hashtags are #WhatIf, the premise, a premise synonym, #Animation and
#AnimatedStories. The tag list above covers the same five buckets (format, premise, synonyms, superpower
genre, channel name), plus "jeremy bearimy" so you show up in their Suggested column, which is where a new
channel in this niche gets most of its first views.

---

## 5. Upload settings (match the reference channel)

| Setting | Value |
|---|---|
| Category | Entertainment |
| Audience | Not made for kids |
| Language | English |
| Subtitles | Upload `output/whatifgraphics-ep01-hear-thoughts.srt` |
| Playlist | "What IF You…" (create it now; every episode goes in it) |
| End screen | Last 20 s: Subscribe element + "Next video" element over the SUBSCRIBE button and NEXT EPISODE card already drawn into the end card |
| Cards | 2:15 ("KIND OF CUTE" moment) → link to the crush episode once it exists; 5:08 → link to Infinite Money |
| Comments | Pin this within the first hour: **"Keep it 🧠 or give it back 🚫? Reply with one emoji."** |
| Publish time | Their uploads cluster in the afternoon/evening UK time. Start with 17:00 UK and shift after two weeks of data. |

---

## 6. Shorts to cut from this video (three, 9:16, post over the following three days)

| Short | Source timestamps | Hook text on screen |
|---|---|---|
| "Kind of cute" | 1:50 → 2:25 | "You walk past your crush's locker and hear THIS" |
| The bus | 0:40 → 1:16 | "40 people. 40 opinions. About your hoodie." |
| Leo | 6:16 → 6:48 | "What your best friend really thinks" |

Each Short's caption: the long-form title + "Full story on the channel 🧠" + #WhatIf #Shorts.
