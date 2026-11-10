# Lesson 9 — Multimodal: give the Analyst eyes

What shipped: the top picks of each run now get frames. yt-dlp downloads the first minute at 480p
or less, ffmpeg finds scene changes, code picks up to six frames, and a vision model describes them.
The description joins the source material, so cards can cite what is on screen. `anim look <url>`
does the same for any video. 94 tests pass, including one that runs the real ffmpeg code on a
generated clip.

```text
card pipeline:  gather -> look -> analyst -> critic -> ...      (look only for the top picks)
```

## The three ideas in this milestone

### 1. Multimodal input is just more input (`llm.py`, `nodes/look.py`)

A LangChain message can carry content blocks instead of a string: images and text together. The
Claude adapter now collects image blocks (Anthropic-style, or LangChain's `image_url` data URLs) and
sends them through the Agent SDK's streaming-input mode, as one user message with images first and
text last. Structured output works exactly as before, so the vision step returns a typed
`VisualNotes`: a description per frame, the hook, style, visible techniques, and caveats.

The prompt asks for what is visible and only that. Stills cannot show motion, timing or sound, so
the model is told to say so in `caveats` rather than guess. In the live test it did exactly that:
"Stills can't show camera movement, edit rhythm, how long shots last, transitions or sound."

### 2. Code picks the frames; the model only looks (`tools/video.py`)

Which frames to send is a decision with a cost, so it is made in code by `choose_times()`, a pure
function with its own tests:

1. the opening frame at 0.5 s, because the hook is the first thing a viewer judges;
2. scene changes from ffmpeg's `select='gt(scene,0.3)'`, spread across the clip;
3. evenly spaced fill up to six frames, never closer than a second apart.

Frames are scaled to 512 px wide. Code also adds the facts the model must not guess: each frame's
timestamp and the aspect ratio ("vertical, 1080x1920"). `format_notes()` turns the model's notes
into a block of source material labelled as coming from a vision model, not from the creator.

### 3. Spend tokens where they pay (`FRAMES_PER_RUN`, Triage's fan-out)

Frames cost a download, ffmpeg work and an image-heavy model call, about $0.07 each in the live
test. So the fan-out after Triage flags only the highest-priority picks, `FRAMES_PER_RUN` of them
(default 3, `anim run --frames N` per run, 0 turns it off). Everything downstream stays the same.
The notes become ordinary source material, so the Analyst quotes them, and the Critic's
word-for-word check verifies those quotes too. A failed download is not an error worth stopping
for: the card is written as before, with the reason recorded.

## What the live tests showed

- **The vision model corrects metadata.** On one Vimeo staff pick it reported "Live-action
  photography, not animation: no drawn lines, toon shading or CG rendering in any frame." Nothing
  in the text alone would have said so.
- **Cards cite the screen.** An animated short, "Me, Myself and Mary", went through a real card
  pipeline with frames. Five of its six evidence quotes came from the visual notes: a mock desktop
  and Twitter interface, cut-paper collage, and "clean, with black outlines, flat fills and minimal
  cel shadows". It also caught that frame 1 is black, a weak hook for a scroll feed. The Critic
  approved it after one revision.
- **YouTube blocks downloads from cloud machines.** From this cloud session, YouTube refused ("Sign
  in to confirm you're not a bot"), while Vimeo worked. On a home connection YouTube usually works.
  If it asks anyway, set `YTDLP_COOKIES_FROM_BROWSER=chrome` (or your browser) in `.env`, and
  yt-dlp uses your browser's YouTube session. The error message now says this.

## Two fixes along the way

- **Tests reached the network.** The fan-out marks top picks for frames, so graph tests started
  trying real YouTube downloads for fake videos. They failed and were caught, but a test must never
  touch the network. `tests/conftest.py` now blocks downloads and YouTube lookups as well as model
  calls.
- **Progress events could break a node.** `get_stream_writer()` raises outside a graph run, which
  broke a test that called the look node directly. `progress.emit()` now wraps it and does nothing
  when there is no stream, and every node uses it.

## Run it yourself

```bash
cd animation-agent
uv run pytest -q
uv run anim look "https://vimeo.com/channels/staffpicks/<id>"    # works from anywhere
uv run anim look "https://www.youtube.com/watch?v=<id>"           # from a home connection
uv run anim run --frames 2                                        # frames for the top two picks
uv run anim run --frames 0                                        # metadata only, as before
```

Requirements on your machine: ffmpeg and ffprobe on PATH, and Node or Deno for yt-dlp.

To measure what frames add, build Analyst eval rows from frame-augmented sources and compare the
judge's usefulness and calibration scores with the metadata-only baseline from Lesson 8.

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| Image content blocks through a LangChain model | `llm._image_blocks`, `look.frame_message` | any multimodal step |
| Frame selection as a pure, tested function | `choose_times()` | sampling long media cheaply |
| Vision output as typed notes, merged into text sources | `VisualNotes`, `format_notes()` | keeping one evidence trail across modalities |
| Spending expensive inputs only on top candidates | `FRAMES_PER_RUN`, Triage fan-out | cost control |
| Optional enrichment that degrades gracefully | `make_look` | flaky or blocked sources |

Next: **Milestone 10** makes it run on its own: a schedule, digest delivery to email or Notion, a
health check, and the final readiness pass.
