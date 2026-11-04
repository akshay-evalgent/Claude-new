# The seven formats

> **Partly confirmed.** One real @wealth reel has been measured (17.6M views). Its format, the **Movie Metaphor**, has its own file: `07-LESSON-CLIP-REELS.md`. Start there. The seven formats below are still based on the genre and get checked as more real reels are added to `reference/`.

Seven formats, all built from @wealth's mix and all original enough to stay in Instagram's recommendations. Picture of each: `assets/format-sheet.png`.

| # | Format | Length | Make time with templates | What it's for |
|---|---|---|---|---|
| F1 | The Headline (news) | 7 to 20 s | 20 min | Reach. Your daily volume. |
| F2 | The Breakdown | 30 to 60 s | 45 min | Sends, follows, trust |
| F3 | The Take | 15 to 30 s | 25 min | Comments, debate |
| F4 | By the Numbers | 10 to 20 s | 30 min (or 2 min with the script) | Saves, sends |
| F5 | The Carousel | 6 to 10 slides | 40 min | Saves. Carousels can be shown to the same person again. |
| F6 | The Demo | 10 to 25 s | 20 min | Reach, sends |
| F7 | The Rule | 5 to 8 s | 10 min | Follows, story reshares |

## Specs that apply to every reel

- **Canvas** 1080 x 1920, 30 fps, exported at 1080p. In Instagram: Settings > Data usage and media quality > turn on **Upload at highest quality**.
- **Safe zones** (see `assets/templates/safe-zones.png`):
  - Top 220 px: Instagram's header sits here. Nothing important.
  - Bottom 380 px: caption, audio label and handle. Nothing important.
  - Right 140 px: like, comment, share buttons. Keep text clear.
- **Cover.** The profile grid crops covers to a 3:4 rectangle from the centre (1080 x 1440). Keep the cover's words inside that box. `assets/templates/cover-template.png` marks it.
- **No other app's watermark.** If you edit in CapCut, delete its ending clip and don't use CapCut templates that stamp a logo. Instagram's own **Edits** app is free and adds nothing.
- **Your own handle** in a small corner is fine and smart: when people screen-record or download, your name travels with the video.
- **Sound on and sound off.** Someone watching muted must get the story from the text alone. Someone listening must get it from the voice alone.

## Writing the headline (the most important skill on this page)

The top bar is the hook. Test every headline against these rules:

1. **8 to 14 words.** Two lines in the template, three at most.
2. **A number or a name in the first five words.** "Costco has sold this hot dog for $1.50 since 1985" beats "This company refuses to raise one price".
3. **One highlighted word**, in yellow. The word that makes it surprising: *on purpose*, *13 employees*, *since 1985*.
4. **Present tense, plain words.** "Costco loses money on this hot dog. On purpose."
5. **Only promise what the video delivers.** If the reel doesn't pay off the headline, people swipe away, your watch time drops, and the next reel gets shown to fewer people.
6. **No ALL CAPS shouting, no "SHOCKING", no emoji in the bar.**

Make the headline image with:
```
python3 scripts/headline.py "Costco loses money on this hot dog. On purpose." --highlight "On purpose." --out costco.png
```
That gives you a transparent 1080 x 1920 PNG. Drop it as the top layer in Edits or CapCut, put the clip underneath, done.

### Hook formulas that work for business news

| Formula | Example |
|---|---|
| [Company] [does surprising thing]. On purpose. | Costco loses money on this hot dog. On purpose. |
| [Small number] did [huge result] | 13 people built Instagram. Facebook paid $1 billion. |
| [Famous thing] is secretly a [different business] | McDonald's is a real estate company that sells burgers. |
| Why [everyday thing] costs [price] | Why Arizona Iced Tea still costs 99 cents. |
| [Company] almost [failed/sold] for [small number] | Netflix offered to sell itself to Blockbuster for $50 million. |
| [Same input], [different outcome] | Same $300 a month. One retires with $1 million. |
| Nobody owns [famous company] | Rolex has no shareholders. Here's who gets the money. |
| [Person] started [huge company] [humble detail] | Nvidia started in a Denny's. |

## F1. The Headline (news reel)

The @wealth staple: a news story told in one headline and a few seconds of video.

**Structure**
- 0 to 1 s: headline bar is already on screen, video already moving. No intro.
- 1 to 15 s: the footage that shows the story (product, place, chart, screenshot of the announcement with your arrow or highlight on it).
- Optional VO: 2 to 4 sentences. What happened, the number, why it matters.
- Last 2 s: a cut that loops back to the start cleanly, so the reel replays.

**Footage you can use** (more in `06-ORIGINALITY-AND-SOURCING.md`): company newsroom b-roll and press kits for editorial use, your own screen recording of the article or product page with your highlights drawn on, stock footage (Pexels, Pixabay, Storyblocks), a chart you make.

**What makes it yours:** your headline, your VO or text summary, your highlights and arrows, your caption with the context. A raw clip with only a headline pasted on top is the thing Instagram demotes.

**Caption:** use the caption template in `01-WEALTH-TEARDOWN.md`. Always name your source.

## F2. The Breakdown (how X makes money)

Your best format for follows. Faceless voiceover over b-roll, 30 to 60 seconds.

**Structure (45 s version)**
- 0 to 3 s, **hook**: the surprising fact, said and shown. "Costco has sold this hot dog for a dollar fifty since 1985."
- 3 to 10 s, **the tension**: why that seems crazy. "Beef, buns and wages have all gone up since then. So Costco loses money on it."
- 10 to 35 s, **the reveal**, in 2 or 3 beats, each with a number on screen.
- 35 to 45 s, **the payoff**: one sentence people will repeat. "The hot dog isn't the product. You are, at sixty-five dollars a year."
- No "follow for more" outro. End on the payoff and let it loop.

**Visuals:** the headline bar stays up the whole time. B-roll changes every 2 to 3 seconds. Numbers pop up as big text in the video window when they're said.

**Audio:** your voice, recorded on your phone in a small room with soft things around (a closet full of clothes is a good booth). Trending sound under it at 5 to 10% volume.

**Subtitles:** auto-captions in Edits or CapCut. Heavy font, white with a black outline, 2 to 4 words at a time, key numbers in yellow, placed just above the bottom safe zone.

## F3. The Take (founder and billionaire quotes)

@wealth often runs clips of famous founders. You can't download and repost those. Do this instead:

**Structure**
- 0 to 2 s: the quote card, made with `scripts/headline.py`, with the person's name and where they said it.
- 2 to 25 s: your VO reacting. Is it right? What's the number behind it? Who disagrees?
- End: a two-sided question in the caption. "Is he right? Tell me why."

**Visuals:** stock footage that fits the topic, the quote text, maybe a public photo of the person from an official source used small (check the license). If you use a clip of the actual interview, keep it short, have permission or use a podcast that runs an official clipping program, and make your commentary most of the reel.

## F4. By the Numbers (animated data reel)

Fully original and very saveable. No footage needed.

**Structure**
- 0 to 1 s: headline with the setup. "Same $300 a month. Different start age."
- 1 to 12 s: numbers count up or bars grow, one line at a time.
- 12 to 15 s: the takeaway in one line, plus the assumption in small type ("assumes 8% a year, not guaranteed").

**Make it:** in Canva or CapCut with animated text and bars.

**Rules:** do the maths properly (keep the calculation in a spreadsheet), always show the assumption, never promise returns.

## F5. The Carousel

Six to ten slides at 1080 x 1350. Mosseri has said carousels tend to beat single photos because Instagram can show them to the same person again (it shows the next slide).

**Structure**
- Slide 1: the headline, big, and the reason to swipe ("Swipe for how each one makes money").
- Slides 2 to 9: one idea per slide, one number per slide.
- Last slide: the takeaway plus "Send this to someone who..." Asking people to send works on carousels.

Template and example: `assets/carousel-start-here/`.

Add a trending sound to carousels too. Mosseri said music helps photo posts.

## F6. The Demo (tech and AI)

A new tool, gadget or feature doing something surprising, shown in your own screen recording.

**Structure**
- 0 to 1 s: the result first. Don't show the setup. "This AI turned a napkin sketch into a working website."
- 1 to 20 s: the recording, sped up where it's slow, with a zoom on the moment it works.
- Caption: what the tool is, the price, one honest downside.

**Yours because:** you recorded it, you tried it, and you say what's bad about it. Never re-upload a company's promo video as-is.

## F7. The Rule (money rule)

The leftover from @wealth's quote-page days. Keep it to about 5% of posts. It's cheap follower growth and people reshare it to stories, but too much of it turns you back into a quote page.

**Structure:** one sentence on a dark background, 5 to 8 s, loops, trending audio. Better if the sentence contains maths: "Divide 72 by your interest rate. That's how many years it takes to double your money."

## The weekly mix (starting point)

| Day | Post 1 (morning) | Post 2 (evening, or a trial reel) |
|---|---|---|
| Mon | F2 Breakdown | F1 Headline |
| Tue | F1 Headline | F6 Demo |
| Wed | F4 By the Numbers | F1 Headline |
| Thu | F2 Breakdown | F3 Take |
| Fri | F1 Headline | F5 Carousel |
| Sat | F2 Breakdown | F7 Rule |
| Sun | F5 Carousel (week recap) | Rest, or remake the week's best reel with a new hook |

After 30 days, change the mix to match your numbers (see `05-GROWTH-PLAYBOOK.md`). The formats your audience sends most get more slots.
