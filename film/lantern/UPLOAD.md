# LANTERN · upload kit for whatifgraphics

Everything needed to post the film and its three Shorts. The files are in `film/lantern/out/final/`.

| File | What it is | Where it goes |
|---|---|---|
| `LANTERN_master_1080p.mp4` | 2:30 film, 1920×1080, 30 fps, H.264 + AAC 320k, −14 LUFS | YouTube, long form |
| `LANTERN_short_the_wall.mp4` | 24 s, 1080×1920 | Shorts, day 1 |
| `LANTERN_short_the_loop.mp4` | 38 s, 1080×1920 | Shorts, day 3 |
| `LANTERN_short_two_lights.mp4` | 20 s, 1080×1920 | Shorts, day 5 |
| `thumbs/A_wall_7300.jpg`, `B_two_lights.jpg`, `C_every_day.jpg` | 1280×720 thumbnails | Test & Compare on the long film |
| `captions/LANTERN.{en,hi,es,pt,id,fr,de}.srt` | English SDH plus the on-screen words in six languages | Subtitles on the long film |
| `preflight.json` | Measured checks on every file | For you, not for upload |

## 1. The long film

**Title (lead):** `7,300 Mornings | An Animated Short Film`

**Title to test against it:** `He Woke Up Before You. Every Day.`
(Use Test & Compare for titles if your channel has it; otherwise run the lead for 7 days, then switch if click-through is below your channel average.)

**Thumbnails:** upload all three to Test & Compare. A (`7,300 MORNINGS`) is the lead.

**Description (paste as is):**

```
He got up at 4:30 every day of your childhood. You were asleep.

LANTERN is a wordless animated short about the parent who woke up first. Every morning a father lights a lantern, scratches one mark on the wall by the door and walks into the dark. Twenty years later his son comes home and sees the wall.

Who woke up first for you? Tell us their name in the comments. Then send this to them.

0:00 4:30 a.m.
0:52 The city
1:24 The wall
1:37 His turn
1:56 Dawn
2:14 Lantern

Made entirely in code: every frame, every sound and every note. Paper-cut lightbox style.

#shortfilm #animation #dad
```

**Pinned comment (post it yourself right after publishing):**

```
Who was the one who woke up first for you? Tell us their name.
```
If someone on your team has a true story like this, add it as one line above the question. A real story gets more replies than a question alone. Don't invent one.

**Settings**

| Setting | Value | Why |
|---|---|---|
| Audience | No, it's not made for kids | "Made for kids" turns comments off. Comments carry the share trigger. The film is general-audience, not directed at children. |
| Altered or synthetic content | No | Required only for realistic content that could pass as real. This is stylised animation. |
| Category | Film & Animation | |
| Video language | English | Only the end card has words |
| Subtitles | Upload all 7 `.srt` files | Wordless film: captions are what make it native in each market |
| Title and description translations | Hindi, Spanish, Portuguese (below) | Each translation opens a search and browse pool |
| Tags | lantern, animated short film, father, dad, short film about dad, paper cut animation, 4:30 am, emotional short film, sacrifice | Tags matter little; these cover misspellings and search |
| End screen | 2:24 to 2:30: Subscribe bottom left, "Best for viewer" video bottom right | The frame is built with the bottom corners empty |
| Cards | None | A card mid-film interrupts the story |
| Premiere | No | A premiere needs an audience waiting. Publish normally. |
| Time | A weekday, 1 to 2 hours before your audience's evening peak | Studio > Analytics > Audience > "When your viewers are on YouTube". Before you have data, use 6 pm in your largest market. |

**Translated titles and descriptions (first lines)**

- Hindi: `7,300 सुबहें | एक एनिमेटेड शॉर्ट फ़िल्म` · "तुम्हारे बचपन में वो हर रोज़ सुबह 4:30 बजे उठते थे। तुम सो रहे होते थे।"
- Spanish: `7.300 mañanas | Un cortometraje animado` · "Se levantó a las 4:30 cada día de tu infancia. Tú dormías."
- Portuguese: `7.300 manhãs | Um curta-metragem animado` · "Ele acordou às 4:30 todos os dias da sua infância. Você estava dormindo."

## 2. The Shorts

Post the long film first. Each Short is its own shot at the Shorts feed and links back to the film.

| Day | File | Title | Related video |
|---|---|---|---|
| 1 | the_wall | `He scratched one mark every morning. For 20 years.` | LANTERN |
| 3 | the_loop | `4:30 a.m., three generations` | LANTERN |
| 5 | two_lights | `Two lights. Which one are you holding?` | LANTERN |

Description for each Short:
```
The full film is LANTERN (2:30), linked above.
#shorts #animation #dad
```
The Loop ends on the shot it opens with (4:30, the match), so a replay reads as one continuous loop and counts as a rewatch. The Wall and Two Lights end on the end card, so the last thing on screen is the line and the film's name.

## 3. How the math is used

From `film/viral-study`: a film spreads only if each view earns more than one further view (R > 1). R is a product of click-through, how long people watch, whether they are satisfied, and whether they share. Above 1, the film reaches a share of everyone who cares about the theme, so the size of that audience sets the ceiling.

| Lever | What we did | What to check |
|---|---|---|
| Audience pool | Parent-and-time theme (15 to 17% copies in the scan, against 88% for "discipline"). No dialogue. Captions in 7 languages, 3 translated titles. | Traffic by geography after 7 days |
| Click-through | Three thumbnails in Test & Compare: one warm light in a dark frame, one figure, at most three words. A number in the title. | CTR against your channel's 28-day average |
| Hook | Frame one is a match flaring in the dark. First cut at 3.75 s. | Retention at 0:10 |
| Pace | A new picture or light change at least every 2 s; act split 35 / 43 / 23%, close to DISCIPLINE's 38 / 40 / 22 | Flat or rising retention through 0:52 to 1:24 |
| Payoff | The thumbnail's promise (the wall, 7,300) pays off at 1:24 to 1:37, 56 to 65% in, so people stay for it | A bump in the retention curve at 1:24 |
| Emotion | Gratitude that ends on an action, never on loss (sadness lowers sharing; awe and elevation raise it) | Likes per view |
| Share trigger | The film names a recipient (Dad) and the last line asks you to act: "Give him one." The pinned comment asks for a name. | Shares per 1,000 views; comments that mention a parent |
| Shots on goal | Three Shorts plus the film, and the same kit makes the next film (30,000 DAYS) | Run `theme_radar.py` before choosing film two |

**The R read, 24 to 48 hours after posting.** Export daily (or hourly) views from Studio and run:

```
python3 film/lantern/r_read.py --csv export.csv
```
It tells you whether views are still growing period over period (R > 1) or fading, and if fading, roughly where the total will land. If R is under 1 by day 3, change the thumbnail first; it is the cheapest lever.

## 4. Pre-flight results

All four files pass every rule: frame one lit and moving, nothing frozen longer than 1.1 s, no black longer than 0.3 s, no frozen end, −14 LUFS, true peak under −1 dBTP. Full table in section 5 of `film/lantern/README.md`.

Before posting, listen once on headphones. The sound was balanced by measurement, not by ear.

## 5. Credits and licences

- Picture, sound and music: generated in code in this repo (`film/lantern/`). No stock footage, samples or AI video.
- Style grammar: "Paper-cut Lightbox" from the Lemo-Opuscar style library (MIT). The story, shots, characters and code are original; no frames or designs were copied.
- Fonts: Playfair Display, Cormorant Garamond, Source Sans 3, Archivo (all SIL Open Font License, in `fonts/`).
