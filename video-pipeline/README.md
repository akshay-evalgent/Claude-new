# Video pipeline

Ten agents that take a video from a brief and a reference to a finished, checked
mp4. Each agent does one job and hands files to the next. The last five are
judges: they compare the result with the reference and send it back with fixes.

## Run it

In Claude Code, from this repository:

```
/make-video a short about <subject>, in the style of film/input/draft.mp4
```

Give it at least one reference video (a file path or a link) and a subject.
Optional: your own voice recording, artwork, music. The command creates
`video-pipeline/runs/<slug>/`, runs the stages in order and reports the result.

Any agent can also be used on its own, by name: "use the hook-critic on this
script", "use the reference-analyst on this video".

## The agents

| # | Agent | Job | Writes |
|---|---|---|---|
| 1 | `video-scout` | Gathers reference videos and assets, records where each came from | `01-sources/` |
| 2 | `reference-analyst` | Takes each reference apart (script, hook, pacing, look, sound) and merges the findings into a playbook | `02-analysis/` |
| 3 | `scriptwriter` | Writes the script beat by beat from the playbook | `03-script/` |
| 4 | `moodboard-artist` | Fixes the look and draws key frames beside the reference's | `04-moodboard/` |
| 5 | `video-producer` | Voice, timing, every shot, captions, sound, render, self-check | `05-video/` |
| 6 | `quality-checker` | Is it the same standard and style as the reference? | `06-review/` |
| 7 | `hook-critic` | Would the first three seconds stop the scroll? | `06-review/` |
| 8 | `retention-critic` | Would viewers stay to the end? | `06-review/` |
| 9 | `share-critic` | Would a viewer send it to someone? | `06-review/` |
| 10 | `comment-critic` | Does it give viewers something to say? | `06-review/` |

The four critics run twice: on the script before anything is rendered (cheap to
fix), and on the finished video with the quality check. A failed check goes back
to the stage that caused it, for up to three rounds.

Agent definitions are in `.claude/agents/`. The orchestrating command is
`.claude/skills/make-video/SKILL.md`.

## What the scores mean

The judges compare the video with the references you gave. A pass means "this
does what the references do". It is not a forecast of views, shares or comments.
The comparison gets stronger with more references, with public numbers for them
(the scout records these when a reference comes from a link), and with their
comments, which the comment critic reads.

## A run folder

```
runs/<slug>/
  brief.md                what the video is for, and what the user supplied
  01-sources/
    sources.json          every reference and asset, with origin and licence
    refs/<ref-id>/        video.mp4, info.json, comments.json   (not committed)
    assets/               fonts, music, artwork for our own video
  02-analysis/
    <ref-id>/             measure.json, palette.json, sheets, transcript, breakdown.md
    patterns.md           the playbook: how these videos work
    benchmarks.json       the numbers the judges hold our video to
  03-script/
    script.json           beats: voice-over, picture, motion, transition
    script.md             the same, readable
  04-moodboard/
    style.json            palette, type, drawing and motion rules
    frames.html, frames/  key frames
    moodboard.html        the look on one page, beside the reference
  05-video/
    audio/                vo.wav, timing.json, timing.js, track.wav
    composition.html      the film, as a page
    video.mp4             the result
    check/                the result measured and compared with the references
    NOTES.md
  06-review/
    script-round-N/       four verdicts on the script
    round-N/              five verdicts on the video
    review.md             the summary
```

## Tools

All in `tools/`. The agents run them; you can too. Each prints its usage with `--help`.

| Tool | Does |
|---|---|
| `setup.sh` | One-time install of the speech packages and a narration voice |
| `measure.py VIDEO --out DIR` | Shots, cuts, frozen stretches, motion, loudness, sound events, cut-to-sound sync |
| `sheet.py VIDEO --out DIR --measure DIR/measure.json` | Contact sheets: the first 3 seconds, one frame per shot, the whole run, the ending |
| `palette.py VIDEO_OR_IMAGES --out DIR` | Main colours and the accent colour |
| `transcribe.py VIDEO --out DIR` | Speech to text with word times and pace |
| `voice.py SCRIPT.json --out DIR` | Speaks the script, times every beat, makes captions |
| `sound.py --out track.wav --duration S --vo vo.wav --hits ...` | Mixes voice, bed, hits and optional music to a target loudness |
| `render.js PAGE.html --out video.mp4 --audio track.wav` | Renders a composition to mp4. `--stills 1,5 --out DIR` for single frames |
| `compare.py --ref REF/measure.json --out OUT/measure.json --write compare.json` | Our numbers against the references', row by row |

To re-measure a finished video by hand:

```bash
C=video-pipeline/runs/<slug>/05-video/check
python3 video-pipeline/tools/measure.py video-pipeline/runs/<slug>/05-video/video.mp4 --out $C
```

```bash
python3 video-pipeline/tools/sheet.py video-pipeline/runs/<slug>/05-video/video.mp4 --out $C --measure $C/measure.json
```

## How the video is made

The film is drawn in code. `runtime/film.js` is a small timeline: a composition
is one HTML page with a `<section class="shot">` per shot, and the renderer asks
it for every frame in turn. The header of `film.js` is its manual.

A style kit under `styles/` holds one look: colours, fonts, textures and the
classes to draw with. `styles/ink-wash/` is the first, built to match the "Map
From Memory" short in `film/`. Its `STYLE.md` lists the parts and `example.html`
is a short worked example:

```bash
node video-pipeline/tools/render.js video-pipeline/styles/ink-wash/example.html --out example.mp4
```

A new look gets a new kit; the mood board artist creates one when the references
call for it.

A film can also be drawn in 3D. `tools/setup.sh` installs three.js (MIT licence)
into `vendor/`; a composition loads `vendor/node_modules/three/build/three.min.js`
with a script tag and renders its scene inside a shot's `update` function, so
every frame still depends only on the time asked for. Create the renderer with
`preserveDrawingBuffer: true`. The headless browser draws 3D in software: a
simple 1080x1920 scene renders at about ten frames a second.

## Bringing your own material

The built-in voice is a free synthetic one and the built-in pictures are drawn
in code. Both can be replaced without changing anything else:

- **Voice.** Put a recording or a generated voice at `runs/<slug>/05-video/audio/vo.wav` before the producer runs.
- **Pictures.** Put one image or clip per beat at `runs/<slug>/05-video/assets/shots/<beat id>.png` (or `.jpg`, `.svg`, `.mp4`). The producer uses it for that shot. This is where output from an image or video generator goes.
- **Music.** Put it in `runs/<slug>/01-sources/assets/` and tell the scout its licence.

## Limits

- Cut detection is tuned on hard cuts and dissolves. Wipes and other unusual transitions can be missed, counted twice or timed a few frames late; the analyst is told to check the sheets against the numbers.
- "Cuts landing on a sound" counts any sound near a cut, including a word of the voice-over. It does not show that a cut has a sound of its own.
- The agents cannot hear. They judge sound from measurements and the transcript, so nobody in the line can tell you whether a voice sounds natural: listen yourself.
- Caption times inside a sentence are estimated from letter counts, to within about a tenth of a second.
- Downloading a reference from a link depends on the platform allowing it. When it does not, supply the file.
