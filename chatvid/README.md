# chatvid

Turns a short JSON script into a finished "trolling an AI" chat video: typed
messages, streamed replies, punch-in zooms, screen shake, a patience meter, a
cold-open hook with a rewind, sound effects and music, mixed to YouTube loudness.
No screen recording and no editing software needed.

Sample output: `samples/count-to-a-billion.mp4` (29 s, 1080p).

## Quick start

```bash
python3 chatvid/tools/fetch_assets.py
```

```bash
node chatvid/render.mjs chatvid/episodes/count-to-a-billion.json
```

The video lands in `chatvid/out/<episode>.mp4`. A 30-second episode renders in
about a minute.

Other options:

```bash
node chatvid/render.mjs chatvid/episodes/count-to-a-billion.json --interface nebula --ai-name Gemini
```

```bash
node chatvid/render.mjs chatvid/episodes/count-to-a-billion.json --scale 2
```

```bash
node chatvid/render.mjs chatvid/episodes/count-to-a-billion.json --stills 3.5,8,12.25
```

`--scale 2` renders 4K. `--stills` writes PNG frames at those times (seconds)
instead of a video, for quick checks.

Needs Node with Playwright and Chromium, ffmpeg, and Python 3 with numpy.

## Writing an episode

```json
{
  "title": "I Asked AI to Count to 1 Billion",
  "interface": "midnight",
  "ai": { "name": "ChatGPT" },
  "hook": true,
  "hud": { "patience": true },
  "music": { "track": "comical", "gain": -21 },
  "exchanges": [
    { "user": "You skipped one.", "ai": "No I didn't 🤨", "punch": 2, "sfx": "boing", "patience": 60 }
  ]
}
```

| Field | Meaning |
|---|---|
| `interface` | `midnight` (dark grey), `nebula` (gradient avatar), `void` (pure black). |
| `ai.name` | Shown in the header, placeholder and disclaimer. |
| `hook` | Open on the final punchline for 1.6 s, then rewind to the start. |
| `hud.patience` | Show the patience meter; each exchange's `patience` (0-100) drains it. |
| `music` | Track from `assets/music` (`comical`, `keep-smiling`, `okay`) and its level in dB. |
| `punch` | How many trailing words (plus their emoji) to punch in on. `false` = no punch-in. |
| `sfx` | Stinger on the punch-in: `boom` (vine-boom style, synthesised), `boing`, `trombone`, `laugh`, `fail`, `dazzle`, `clown`, `punch`, `glitch`. Any file you drop in `assets/sfx/<name>.wav` or `.mp3` can be used by its name. |
| `shake` | Screen shake on the punch-in. |
| `think` / `hold` / `punchHold` | Per-exchange timing overrides, in seconds. |
| `final` | Last exchange: long slow push-in with a riser, then the video ends. |

Global timing (typing speed, zoom lengths and so on) can be overridden with a
`"pacing"` object; the defaults are at the top of `engine/engine.js`.

Any emoji can be used. The fetch script downloads every emoji found in
`episodes/*.json`, so run it again after adding new ones.

## How each exchange is shot

1. **Typing:** close-up on the input box (about 2.25x), one key sound per
   character at about 14 characters per second, speeding up on long messages.
2. **Send:** 0.2 s glide to the reply shot (full column width), send pop.
3. **Thinking:** pulsing dot, then the reply streams in word by word.
4. **Punch-in:** 0.13 s zoom with overshoot onto the last words and emoji (up
   to 6.5x), zoom thud, optional stinger and shake, slow drift while it holds.
5. **Whip:** 0.3 s eased zoom back to the input box with a swoosh.

Text stays sharp at every zoom because each frame is rendered by the browser at
its zoomed size, not upscaled from a recording.

## Layout

- `engine/`: the chat page, with three themes in `themes.css` and the timeline and camera in `engine.js`.
- `render.mjs`: drives Chromium frame by frame, then mixes and muxes the audio.
- `tools/fetch_assets.py`: downloads sounds, music and emoji into `assets/` (not committed).
- `tools/mix.py`: places the sound cues, synthesises the riser and ducks the music under stingers.
- `episodes/`: scripts.

## Asset licences

- Sound effects and music: [Mixkit](https://mixkit.co/license/), free for
  commercial use in videos, YouTube included. The files may not be redistributed
  on their own, which is why they are downloaded rather than committed. Mixkit
  music may not be registered with YouTube Content ID.
- `boom` and the final riser are synthesised in `tools/mix.py`, so there is no
  third-party audio in them at all. Famous meme clips (vine boom, bruh and so on)
  found on soundboard sites are usually unlicensed copies and can get monetised
  videos claimed; prefer these, or meme sounds you have a licence for.
- Emoji: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji), MIT licence.
