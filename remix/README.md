# remix — cut a new story out of other videos

Give it two or more videos. It finds every spoken line and every shot in them,
you (or Claude) write a new story by picking lines and reaction shots across
the sources, and it renders a finished video in which characters from
different videos seem to talk to each other. The cut points are taken from
word-level timings, so lines start and stop cleanly and the dialogue plays in
sync.

This is the crossover / fan-edit format: same footage, a different story.

```
sources/*.mp4 ──► analyze.py ──► work/bank.txt + contact sheets ──► (write the story)
                                                                         │
                                         out/remix.mp4  ◄── render.py ◄──┘ edit.yaml
```

## What you get from each step

| Step | Command | Output |
|---|---|---|
| 1. Analyse | `analyze.py work a=clip1.mp4 b=clip2.mp4` | `work/bank.txt`: every line with times, plus every silent shot (reaction/cutaway candidates); `work/<src>/lines-NN.jpg`: the frame under every line with the line printed under it; `work/<src>/shots-NN.jpg`: every shot with its time and what is said in it |
| 2. Write | edit `projects/<name>/edit.yaml` | the timeline: which line, which shot, in what order |
| 3. Check the plan | `render.py edit.yaml --plan` | the resolved timeline as text, no rendering |
| 4. Draft | `render.py edit.yaml --draft` | fast half-size render to judge the flow |
| 5. Final | `render.py edit.yaml --verify` | `out/edit.mp4`, `.srt` captions, `-review.jpg` (one frame per clip), `-edl.txt`; `--verify` re-transcribes the result and flags any line that came out clipped or has a word leaking in from the line next to it |

## Setup

```bash
pip install -r remix/requirements.txt     # faster-whisper, pillow, numpy, pyyaml
# plus ffmpeg on PATH (with libass for burned captions)
```

The first run downloads the Whisper model (`medium.en`, about 1.5 GB; `--model small.en` is 3x faster and less accurate; use `large-v3` with `--language hi` etc. for other languages).

## Using your own clips

```bash
cd remix
mkdir -p sources && cp ~/Downloads/clipA.mp4 ~/Downloads/clipB.mp4 sources/
python3 analyze.py work a=sources/clipA.mp4 b=sources/clipB.mp4 --names "Character names, places"
```

Then either write `edit.yaml` yourself with `bank.txt` open, or ask Claude:

> Read remix/work/bank.txt and the sheets in remix/work/*/. Pitch me three new
> stories that can be cut from these lines, then write the edit list for the one I pick
> and render it.

`--names` helps the transcript spell names right. Sources can be any length,
aspect ratio, frame rate or resolution: everything is conformed to the output format.

## Finding material

```bash
python3 bank.py work find "sorry|forgive"        # every line matching a regex, all sources
python3 bank.py work words tos 41                # word timings of one line (to cut part of it)
python3 bank.py work quiet sintel --min 1.5      # shots with no dialogue: reactions, looks, cutaways
python3 bank.py work shot sintel 34              # one shot and what is said in it
python3 bank.py work strip sintel 2:14 2:22      # a strip of frames across a range (jpg)
```

## The edit list

```yaml
title: The Gatekeeper
work: ../../work                  # analysis dir, relative to this file
output:
  size: [1280, 720]               # [1080, 1920] for vertical
  fps: 24
  picture: 2.39                   # letterbox every source to one shape; or "fill"
  fit: crop                       # crop (fill the frame) | pad | blur (blurred background, for vertical)
  look: {saturation: 0.94, contrast: 1.03}   # one grade over everything so the sources match
  loudness: -16                   # LUFS, final mix
sources:                          # optional: per-source grade to match the others
  ed: {path: ../../sources/elephants_dream.mp4, grade: {brightness: 0.02}}
captions:
  burn: true                      # captions in the picture (letterbox bar when there is room); .srt always written
  fix: {Tom: Thom}                # spelling fixes
defaults:
  pad: [0.12, 0.25]               # seconds kept before the first word / after the last
  xfade: 0.04                     # tiny sound crossfade at every audio edit (no clicks)
timeline:
  - card: "THE GATEKEEPER"        # a title card on black; "~smaller line" for a subtitle line
    dur: 2.5

  - src: sintel                   # a line, cut from its own picture and sound
    line: 5                       # sintel:L005 in bank.txt
    note: shaman asks why she came

  - src: tos
    say: "we have to follow our passions"   # or find the words by phrase
    near: 5:18                    # when the phrase occurs more than once
    pre: 0.4                      # extra picture before the first word
    post: 0.6                     # and after the last
    split: 0.3                    # J-cut: this clip's sound starts 0.3 s before its picture (negative = L-cut)

  - src: sintel                   # a reaction shot from one film with a line from another laid over it
    in: 2:14.2                    # picture start; its length follows the voice
    voice: {src: tos, line: 44, at: 0.2}
    flip: true                    # mirror the shot so the eyeline matches the previous one
    zoom: 1.15                    # punch in (with focus: 0..1 to choose where)
    focus: 0.3

  - src: tos
    line: 41
    words: [0, 4]                 # only words 0-4 of the line (see bank.py words)
    hold: 0.5                     # freeze the last frame for 0.5 s
    fade_out: 0.8                 # to black, picture and sound

overlays:                         # extra sound anywhere on the timeline
  - {src: ed, in: 1:02.0, out: 1:06.0, at: 12.5, gain: -8}
music:                            # optional bed, ducked under dialogue
  src: ../../sources/score.wav
  gain: -20
```

### Clip fields

| Field | Meaning |
|---|---|
| `src` | source name (as given to `analyze.py`) |
| `line` / `say` | take the cut from the transcript: a line id, or a phrase (`near:` picks between repeats) |
| `words: [a, b]` | only part of a line, by word index (`-1` = last) |
| `in`, `out`, `dur` | explicit times (seconds or `m:ss.s`); with `line`/`say` they override the line's start or end |
| `pre`, `post` | handles around the spoken words. The picture may reach into neighbouring words; the sound never does unless `keep_neighbors: true` |
| `voice: {src, line/say/in+out, at, gain, caption}` | sound from any source over this picture. The picture's own sound is muted unless `audio:` says otherwise. Without `out`, the clip lasts as long as the voice |
| `audio` | `keep` (default), `mute`, or a gain in dB (e.g. `-12`) for the clip's own sound |
| `split` | J-cut (positive) or L-cut (negative), seconds |
| `flip`, `zoom`, `focus`, `focus_y`, `fit`, `grade` | picture adjustments for matching eyelines and framing |
| `hold`, `fade_in`, `fade_out` | freeze and fades |
| `gain` | dB on the clip's own sound |
| `caption` | `false` to hide, or a string to replace the words shown |
| `note` | free text; shows in the plan and the review sheet |

Cut points from `line`/`say` are snapped to the quietest moment near the
transcript boundary, so a cut lands between words, not inside a syllable.

## Making it feel like one scene

The tool does the mechanics; what sells the illusion is the editing:

- **Eyelines.** If A looks right, B should look left. Use `flip: true` on a shot when it doesn't.
- **Reaction shots are the glue.** A silent close-up from film B after a line from film A makes B "hear" A. `bank.py quiet` lists them.
- **J- and L-cuts.** Let the next line start under the end of the current shot (`split: 0.3`). Hard cuts on every line feel like a slideshow.
- **Answer the question.** Pick lines that answer the previous line literally ("What brings you here?" → "I'm searching for someone.") and the audience fills in the rest.
- **One look.** `output.look` and per-source `grade` pull different films toward the same colour; `picture: 2.39` puts them all in the same frame shape.
- **Sound bed.** Each source's room tone changes at every cut. A quiet music bed (`music:`) covers the seams.

## Rights

Only remix footage you have the right to use. The demo in `projects/` uses the
Blender Foundation open movies (CC BY), credited at the end of the video.
