---
name: movie-detail-short
description: Make "Did you notice this detail in [Movie]???" YouTube Shorts, the format of our best performer (the Titanic flask man, Charles Joughin). It covers picking the detail, verifying facts, writing a fast narrated script with real film lines cut in, getting clips, rendering with shorts/movie/detail.py, QA and the upload kit. Use it whenever the user wants a movie fact / hidden detail / "did you know" / DetectivePasini-style Short, says "make one like the Titanic video", names any film and asks for a video about it, or asks to find a story or script for a movie Short, even if they never say "detail".
---

# "Did you notice this detail?" movie Shorts

A fast commentary voice tells the true story behind something visible in a famous film.
- Film shots change about every second, and two or three real lines from the film are cut in.
- One huge yellow word of caption is on screen at a time.
- The reveal lands at the end, which loops back to the opening shot.

The renderer is `shorts/movie/detail.py`. The best example is `shorts/edits_movie/titanic_baker.json`; read it before writing a new spec.

## What made the Titanic one win

We posted three of these. Titanic took off; Jurassic Park and Back to the Future did not.

| | Titanic: the calm man with the flask | Jurassic Park: the glass of water | BTTF: Twin Pines → Lone Pine |
|---|---|---|---|
| Detail | A **real person** hidden in the background | How a special effect was made | A famous easter egg |
| Already known? | Almost nobody knew | Well-known trivia | The best-known BTTF easter egg |
| Stakes | Life or death, a true survival story | Craft | None |
| Twist | Alcohol may have saved him; he rode the stern "like an elevator" | A guitar string | The sign changed |
| Proof | 1912 photos of the real man | Featurette | The film itself |
| Length | 102 s | 90 s | 55 s |

**The pattern, as a working rule (one hit and two misses so far):** the winner made the viewer think "wait, **that's real**?"
- Something the viewer saw on screen and assumed was made up turned out to be a real person, with a real life-or-death story.
- That story kept topping itself, and photos proved it.

Production trivia and easter eggs are stories *about the movie*. The Titanic video was a story about *reality* hiding inside the movie, and that's what gets shared.

Update this table whenever a new one is posted and its numbers come in. Ask the user for views, average % viewed and shares.

## True stories (not about a movie)

The same engine also makes true-story Shorts: real news footage, the real audio of key moments, the same layout. The first is `shorts/edits_movie/cecil_hotel.json`. For a story where real people died:
- tell it respectfully: no gore, no ghost or "cursed" framing presented as fact, and the official finding stated plainly;
- don't name people who were wrongly accused;
- end on something humane;
- warn the user that ads may be limited.

The title is a curiosity hook ("Guests said the hotel water tasted strange..."), not "Did you notice…".

## Step 1: Pick the detail

Before writing anything, brainstorm 3–5 candidates for the film and score each one. Look on the film's Wikipedia page ("Historical accuracy", "Production", "Inspiration") and in news coverage.

| Test | Strong (2) | Weak (0) |
|---|---|---|
| **"That's real?"** | A person, place, object or event on screen is real | Purely about filmmaking |
| **Visible** | The viewer can go back and find it in the film | Only off-screen trivia |
| **Unknown** | Most fans have never heard it | Top result for "<movie> easter eggs" |
| **Stakes** | Survival, death, danger, love or money | Curiosity only |
| **Escalation** | At least 4 "and then it gets crazier" beats | One fact |
| **Proof** | Archive photos, real footage or documents exist | Nothing to show |
| **Relatable** | Viewers feel it ("I'd want to go there", "I felt that") | Niche |

Pick the top scorer, preferably 10 or more out of 14. The user prefers being told the plan before big work, so share the pick in one or two lines along with the runner-up.

Good shapes:
- **"This extra was a real person."** The Titanic baker.
- **"This place is real, and you can visit it."**
- **"This prop or event actually happened."**
- **"The real story was even crazier than the film."**

## Step 2: Verify every claim

Each fact needs two independent sources, or one primary source such as testimony, an official site or an interview.
- **Contested claims are attributed,** never stated as fact: "he claimed", "the city says", "historians still argue". This protects the channel, and it also makes good comment bait.
- **Keep a source list** for the description and the kit's "Accuracy notes".
- **Never invent numbers.** If sources disagree, round down ("about 3,000") or attribute.

## Step 3: Write the script

- **Length:** 90–110 s at speed 1.32 with the voice `am_michael` (about 210 words a minute). The winner ran 102 s.

**Beats:**

1. **Hook, 0–4 s.** "If you pay attention, you'll notice [one thing in <movie>] that [is way too X / isn't made up at all]." The very first shot shows the detail.
2. **Point at it, 4–12 s.** Say where it is on screen ("right next to Jack and Rose") and why most people miss it.
3. **The turn.** "Most people think ___. But ___ was real." Show the proof: an archive photo or real footage.
4. **Escalate, 4–8 beats.** Each beat tops the last. Bridge lines like "And what he did that night is even crazier than the movie." keep people watching.
5. **One to three film lines** placed where they hit hardest. The film's characters should "answer" the narration (Titanic: "Jack describes it perfectly", then Jack's own line).
6. **Doubt.** Make one honest "he claimed / historians still argue" beat. It builds trust and drives comments.
7. **Payoff.** Close on the human ending: "He lived until 1956."
8. **Loop line.** "So next time you watch <movie>, look for [the detail]." It's cut to the opening shot so the replay feels seamless. Don't add a CTA or "subscribe".

**Writing rules:**
- Short spoken sentences.
- Numbers as words when the voice stumbles on them; use the `speak` field.
- Phonetic spellings for names, e.g. "Jockin" for Joughin.
- **Test hyphenated phonetics.** They can backfire: "Hwahng-shahn" was read as "H. Wangshan", while "Huang Shan" was read correctly, and plain "CNN" also works. Check every name by voicing it and transcribing it before the full render.
- No profanity in film lines; trim the line instead.
- **Lead into a film line** that starts mid-thought ("And like Jake says,"), and trim words like "But to do that" off its start.

## Step 4: Get the clips

YouTube blocks downloads from this machine, but search works. Find exact video IDs, then give the user download commands. They download, upload to Google Drive and share the folder link.

```bash
yt-dlp --flat-playlist -J "ytsearch8:<movie> <scene> scene" | python3 -c "import json,sys; [print(e['id'], int(e.get('duration') or 0), e.get('channel'), e.get('title')) for e in json.load(sys.stdin)['entries']]"
```

Give the user one command per clip, each in its own `bash` block:

```bash
yt-dlp -f "bv*[ext=mp4][dynamic_range=SDR][height<=1080]+ba[ext=m4a]/b[ext=mp4]/b" -o "%(id)s.%(ext)s" "https://www.youtube.com/watch?v=<ID>"
```

**What to ask for:**
- 3–6 film scene clips that show the detail and the moments the story describes.
- 1–2 clips of real footage or a documentary for the proof.
- The official trailer, for spare wide shots.

If yt-dlp fails with 403, the user should update it (`yt-dlp -U`).

**Archive photos:** download them yourself from Wikimedia Commons:
- search with `scripts/commons_search.py`;
- fetch with `python3 shorts/tvn/fetch_commons.py`, which uses standard thumbnail widths because originals return 429 errors;
- credit every photo in the description.

**Pulling the shared Drive folder:**

```python
import gdown
files = gdown.download_folder(url=URL, skip_download=True)
# then gdown.download(id=f.id, output=...) for each file
```

Put the files in a scratch work folder laid out as `src/<id>.mp4`, `photos/` and `tx/`.

## Step 5: Map the footage

Run these from the work folder. The scripts are in this skill's `scripts/` folder.

| Script | What it does |
|---|---|
| `tx.py tx src/*.mp4` | Word-timed transcripts (faster-whisper small.en). Takes minutes, so run it in the background. |
| `cuts.py src/<id>.mp4` | Shot cut times |
| `sheet.py src/<id>.mp4 out.jpg <step> <cols> [start] [end]` | Contact sheet with timestamps |
| `frames.py out.jpg . <id>:<t> ...` | Exact frames with 10% tick marks, for setting `cx` |
| `grid_frames.py out.jpg x0 y0 x1 y1 <frame>...` | Gridded close-ups in pixel coordinates (run from a folder holding `seg.mkv`) |

**Choosing film lines:** take them from the transcripts. Start and end each cut 0.05–0.15 s outside the word times so no word gets clipped.

## Step 6: Write the spec and render

Write `shorts/edits_movie/<name>.json`, then render from the work folder:

```bash
python3 /home/user/Claude-new/shorts/movie/detail.py /home/user/Claude-new/shorts/edits_movie/<name>.json out/<name>.mp4
```

Every shot option is listed in `references/spec.md`; read it when writing the spec.

**Layout: the user's rule.** The picture fills the middle 66% of the screen. Blurred bands of 17% sit above and below it, and the captions go in the bottom band, never over the picture.
- **How it works:** this is `"layout": "full"` with `"mid": 0.66`, the defaults. Each scene fills the band's full height, with letterbox bars removed. Its sides are trimmed around `cx`, so set `cx` on any shot whose subject is off-centre, and check it in the preview sheet.
- **How the user got here:**
  - The first Titanic-style 9:16 crop cut faces and looked zoomed in.
  - The whole-scene version that followed left too much blur.
  - The 66% middle band is the agreed balance.
- **Old Shorts:** keep `"layout": "crop"` only for re-renders of the early ones.
- **Watermarks:** use a small extra `fit` crop only to hide a watermark.
- **Thumbnail:** the same layout, a hero frame of the detail in the middle, with one short line of text in each band (e.g. top: "THESE MOUNTAINS", white; bottom: "ARE REAL", yellow). It's made with `compose_full` plus the caption font.

**Defaults that worked:**
- 2–6 shots per narration beat, each about 1–1.5 s.
- Film beats get cutaways weighted in seconds, so the line stays in sync.
- Archive photos at `"w": 1.3–1.6`.
- Alternate film and real footage on the "it's real" beats (film mountain → real pillar → film mountain), so viewers can compare them.

**Setup:** OpenCV must be version 4. Version 5 dropped the face finder. If `python3 -c "import cv2; print(cv2.__version__)"` prints 5.x, run `pip install "opencv-python-headless<5"`. The ultralytics package can pull in OpenCV 5 when it's installed.

**Before rendering, preview the framing:** `scripts/preview_detail.py <spec> sheet.jpg [k]` composes the first frame of every shot exactly as the render will, in about a minute. Fix the crops there; a full render takes about 4 minutes.

## Step 7: QA

Check all of these before delivering:
- **Speech:** transcribe the output with faster-whisper and read it. Every name and number must come out right; fix mistakes with `speak`.
- **Loudness:** `ffmpeg -i out.mp4 -af ebur128=peak=true -f null -` must show about −14 LUFS with peaks below −1 dBFS.
- **Frames:** make a frame sheet every 1–2 s with `sheet.py out.mp4 ...` and look at every shot. Check for:
  - faces and signs cropped off;
  - black bars;
  - uploader watermarks (crop them out);
  - a shot that holds longer than about 3 s.
- **Loop:** the last shot must cut cleanly into the first.
- **People shown vs what is said:** never let a real, identifiable person (an interviewee, official or bystander, especially with a name banner) appear while the narration talks about killers, crimes, suspects or blame. Viewers read it as an accusation. On true-crime and true-story videos, check every face in the QA sheet against the word under it.

## Step 8: Deliver

1. **Cover:** grab the frame where the detail is clearest: `ffmpeg -ss <t> -i out.mp4 -frames:v 1 -q:v 2 <name>_cover.jpg`.
2. **Upload kit:** add a section to `shorts/upload/UPLOAD_MOVIE_DETAILS.md`, following the existing ones:
   - **Title:** "Did you notice this detail in <Movie>???", with two alternates.
   - **Description:** a two-line story summary, then Sources, Clips and Credits.
   - **Pinned comment:** "Which <Movie> detail should we explain next? 👇" or a question about the doubt beat.
   - **Settings:** Made for kids: No. Altered or synthetic content: Yes, because the narrator is an AI voice. Category: Film & Animation.
   - **Accuracy notes.**
   - **Rights note:** expect Content ID claims on film clips.
3. **Commit and push** the spec and kit (the repo's branch and attribution rules apply), then send the mp4, cover and kit with SendUserFile.
4. **Ask for numbers:** after 48 hours, ask the user for views, average % viewed and shares, and add them to the table above.
