# Beat-locked explainer shorts

A format and a small pipeline (`beatcut/`) for turning a folder of clips into a
YouTube Short where the cuts, the camera and the captions all move with the
music, and a few words of on-screen text explain each shot.

First episode: **Artemis I: to the Moon in 25 seconds**
(`episodes/artemis-i/`). The finished renders are in `episodes/artemis-i/out/`.

## The idea

**One fact per bar, cut on the downbeat, the camera hits on every beat, a trending sound on top, and an ending that loops back into the start.**

| Piece | What it does for the Short |
|---|---|
| **Hook in the first second** ("TO THE MOON IN 25 SECONDS") | Promises a payoff and tells the viewer how long it takes. The words land within 0.3 s on the biggest shot (liftoff). |
| **One shot = one bar = one fact** | At 125 BPM a bar is 1.92 s, enough time to read 2 to 6 words. The viewer always has something new to read and see. |
| **A sentence split across the drop** ("THEN THE BOOSTERS..." / "...LET GO") | The build bar sets up the line, and the drop lands the payoff word on the most dramatic shot, with a flash and a hit. |
| **The camera reacts to the music** (table below) | It feels like the footage is being played by the track. That is the "immersive" part. |
| **A trending sound, added in the YouTube app** | Viewers find Shorts through sounds, and a trending sound is licensed there (see "The music" below). |
| **A loop ending** | The last shot (rocket on the pad, ignition sparks starting) cuts straight into the first (liftoff), so a replay feels like one continuous film. Since March 31, 2025 every start and replay counts as a Short view ([coverage](https://www.entrepreneur.com/business-news/youtube-shorts-will-see-more-view-counts-earnings/489190)); monetization still uses "engaged views". |
| **A curiosity closer** ("THE NEXT ONE CARRIED 4 HUMANS") | Invites comments and sets up part 2. |

### What reacts to what

Everything is timed in **beats**, not seconds. The renderer reads a beat grid
and a section map (intro / build / drop / break / rise) and drives:

| Musical moment | Camera | Screen / text |
|---|---|---|
| every beat | zoom punch (+3.5 to 6 %, decays in ~110 ms), exposure pump | caption block bounces with it |
| downbeat | **cut** to the next shot (punch, whip, zoom or flash entrance); small RGB split in the drop | the new caption pops in word by word on 8th notes |
| backbeat (beats 2 and 4) in the drop | 1.3° twist, alternating left/right | — |
| build / rise bars | pulses speed up (8ths, then 16ths) like a snare roll; rumble shake grows; slow wobble | the set-up half of the sentence |
| the drop | white flash, 34 px shake that settles over 0.3 s, big chromatic split, impact sound | the payoff word, extra large |
| break | almost still | a quiet line ("NO CREW. JUST A TEST.") |

Captions ride 40 % of the camera shake, so the text sits *in* the picture
rather than on a layer above it. They stay inside the area the Shorts player
leaves clear (checked by `qa`, see `out/safe.jpg`).

## The music: how to use a trending track without losing the video

A trending commercial song **cannot be baked into the file you upload**. The
same song added in an outside editor draws a normal Content ID claim: the
video can be muted or blocked, or the revenue goes to the rights holder.
Songs picked **inside the YouTube Shorts editor** come from a library that labels
have licensed for Shorts ([YouTube Help: Manage Shorts as a rights holder](https://support.google.com/youtube/answer/13053317)).
So the pipeline renders the picture to the song's **tempo**, and the song itself goes on in the app.

Every render produces two files:

- `short.mp4`: picture + an **original placeholder track** synthesized by
  `beatcut/music.py` (rights-clear, -14 LUFS) + whooshes. Use it to preview, or post it as is.
- `short_app_sound.mp4`: picture + whooshes and hits only. **Upload this one and add the trending sound.**

Steps:

1. In the YouTube app, start a Short, tap **Add sound** and pick something from what is trending there.
   There's no reliable public chart for this, so the in-app picker is the real source.
2. Find the song's tempo (search "<song> bpm", or tap along with a BPM app).
3. Re-render to that tempo: `python3 -m beatcut.render episodes/artemis-i --bpm 140`.
   The edit stays 13 bars. Only the length changes (13 bars at 140 BPM = 22.3 s).
4. In the app: **+ → Create a Short → gallery**, choose `short_app_sound.mp4`, **Add sound**, pick the song,
   and set the song's start **3 bars before its drop**, so the drop hits at the booster separation.
   That's 12 beats: at 125 BPM, start = drop time − 5.76 s; in general, start = drop − 12 × 60 / BPM.
5. Set the original sound to about 30 % so the whooshes sit under the song. Keep the Short under a minute
   (YouTube blocks Shorts over 1 minute that carry any active Content ID claim: [YouTube Help](https://support.google.com/youtube/answer/15424877)).

If you license a track yourself (YouTube Audio Library, Epidemic, Artlist and so on), put the file in the
episode folder and set `"track": "song.mp3"` in `spec.json`. The pipeline finds its beats and drop
(`beatmap.analyze`) and cuts to the real song. `start_bar` picks where in the song the edit begins.

## Run it

Requirements: ffmpeg, Python 3.10+, `pip install -r requirements.txt`, and the Inter font
(path set at the top of `beatcut/text.py`).

```bash
cd shorts
python3 -m beatcut.fetch episodes/artemis-i            # pull + trim the NASA source clips into clips/
python3 -m beatcut.render episodes/artemis-i --stills  # one still per shot: check framing in seconds
python3 -m beatcut.render episodes/artemis-i           # full render, ~2.5 min on 4 cores
python3 -m beatcut.qa episodes/artemis-i               # cut-sync report, loudness, sheet.jpg, safe.jpg
```

QA on the current render: all 12 cuts detected, 11 within one frame of the beat (the twelfth is a whip
that starts 4 frames early by design); `short.mp4` at -14.1 LUFS and -1.7 dBTP.

## Make the next one from your own clips

1. Create `episodes/<name>/clips/` and drop in your clips (MP4, any size; 4K gives the cleanest vertical crop).
2. Copy `episodes/artemis-i/spec.json` and edit it:

| Field | Meaning |
|---|---|
| `music.bpm` | tempo of the sound you'll add in the app (or of the placeholder) |
| `music.track`, `music.start_bar` | optional licensed audio file to cut to, and the bar to start from |
| `sections` | bar map: `intro`, `build`, `drop`, `break`, `rise` (`bars` each). Shots must add up to the same number of beats. |
| `style` | caption `size`, `accent` colour, default `y` (fraction of height), side `margin`, film `grain` |
| `shots[].clip`, `in` | clip name and in-point (seconds) |
| `shots[].beats` | length in beats (4 = one bar) |
| `shots[].speed` | playback speed, or `[start, end]` for a ramp |
| `shots[].focus`, `focus_to` | where the vertical crop looks, as fractions of the source frame `[x, y]`, eased across the shot |
| `shots[].focus_keys` | `[[clip_time, x, y], ...]` to follow a moving subject |
| `shots[].zoom` | `[start, end]` push-in (or pull-out) |
| `shots[].enter` | `cut`, `punch`, `whip`, `zoom` or `flash` |
| `shots[].text` | caption lines; `*word*` = accent colour, `{n}` = count-up value |
| `shots[].count` | `{"from", "to", "fmt", "beats": [start, end]}` for numbers that count up |
| `shots[].kicker` | small line above the caption (date, context) |
| `shots[].y`, `size`, `stagger`, `grade` | per-shot caption position, size, word timing and colour grade |

3. Run `--stills`, fix framing, render, run `qa`, post.

Writing the captions: 2 to 6 words, one fact, a number wherever there is one, and the word that matters in
`*accent*`. Check every figure against a primary source (see `episodes/artemis-i/POST.md`).

## Story edits on a reference's soundtrack

`beatcut/story.py` renders an edit timed in seconds instead of beats, for when the music comes from a reference
edit: copy the reference's transition times (they already sit on the song's hits) and put your own shots, typed
neon captions, light leaks, TV-off and glitch transitions, an arrow, sparkles and a heart-burst ending into the
same slots. Example: `episodes/messi-respect/` (see its `NOTES.md` and `POST.md`).

The emotional "respect" format is saved in `formats/emotional-respect/` (`FORMAT.md`, `template.json`,
`reference_timeline.txt`) and as the project skill `/emotional-short` (`.claude/skills/emotional-short/SKILL.md`).
`beatcut/mirror.py` measures any reference edit and writes a skeleton in its slots; `beatcut/thumb.py` makes the
1080x1920 thumbnail.

## Files

```
shorts/
├── beatcut/
│   ├── beatmap.py   beat grid from BPM, or tempo/beat/downbeat/drop analysis of a track
│   ├── music.py     original placeholder track + whooshes/impacts, loudness normalisation
│   ├── text.py      kinetic caption sprites and layout
│   ├── render.py    camera, transitions, grade, captions, audio mux
│   ├── fetch.py     pulls an episode's clips from the NASA Image and Video Library
│   └── qa.py        cut-sync check, loudness, contact sheet, safe-zone sheet
└── episodes/artemis-i/
    ├── spec.json    the edit
    ├── clips.json   which NASA originals, which seconds
    ├── POST.md      title, description, pinned comment, fact sources, credits
    └── out/         short.mp4, short_app_sound.mp4, sheet.jpg, safe.jpg, timeline.json
```
