# chatvid

Turns a short JSON script into a finished "trolling an AI" chat video: typed
messages, streamed replies, punch-in zooms, screen shake, a patience meter, a
cold-open hook with a rewind, sound effects and music, mixed to YouTube loudness.
No screen recording and no editing software needed.

Samples: `samples/ai-is-a-toaster.mp4` (4:48), `samples/last-digit-of-pi.mp4` (4:47), `samples/emojis-only.mp4` (4:49), `samples/elon-vs-grok.mp4` (4:37, parody), `samples/1950s-mode.mp4` (4:39, real archive footage), `samples/year-3000-mode.mp4` (4:34, NASA footage) and
`samples/count-to-a-billion.mp4` (29 s test). These are compressed previews;
a fresh render in `out/` is the full-quality file to upload.

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
instead of a video, for quick checks. `--plan` prints when each exchange starts
and the total length, without rendering. `--remix` keeps the picture of the
last render and redoes only the sound (under a minute for a 5-minute episode).

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

Episode-level fields:

| Field | Meaning |
|---|---|
| `interface` | `midnight` (dark grey), `nebula` (gradient avatar), `void` (pure black). |
| `ai.name` | Shown in the header, placeholder and disclaimer. |
| `hook` | Open on the final punchline for 1.6 s, then rewind to the start. |
| `hud` | The meter. `{"patience": true}` is the AI-patience preset (100 down to 0). Or define your own: `label`, `start`, `hue` ([colour at 0%, colour at 100%] as hue angles), `alarm` (`"high"`/`"low"`: pulse at 100% or 0%), `faces` ([[above %, emoji], ...]). |
| `music` | `{"tracks": ["comical", "keep-smiling", "okay"], "gain": -22}`. Tracks play in order with 2 s crossfades and loop. |
| `endCard` | `{"kicker": "NEXT VIDEO", "text": "...", "dur": 3}`: a card after the final punchline. |
| `user` | Who is typing: `{"name": "Elon", "avatar": "<media key>", "avatarPos": "50% 30%"}` puts a round photo next to every user message. |
| `badge` | Text pinned to the top-right corner for the whole video, e.g. `"PARODY"`. |
| `intro` | Opening "VS" card after the hook: `{"image": "<media key>", "left": "ELON", "right": "GROK", "rightIcon": "🤖", "dur": 1.9}`. |
| `media` | Photos the episode uses, fetched with their licence by `tools/fetch_media.py` (see below). |
| `pacing` | Override any default timing, e.g. `{"cps": 13}` for slower typing. |
| `soundset` | Sounds the camera makes on every move: `"soft"` (default: a quiet airy swoosh and a rounded "bloop" on punch-ins, built to repeat without tiring) or `"classic"` (the original sharper Mixkit whoosh set). Override single ones with `"sounds": {"whip": "soft-swoosh", "zoom": "soft-pop", "whoosh": "soft-swoosh"}`. |

Per-exchange fields:

| Field | Meaning |
|---|---|
| `user` / `ai` | The two messages. Emoji are rendered as Fluent 3D images. |
| `meter` | New meter value (0-100) once this reply lands; `patience` also works. |
| `punch` | How many trailing words (plus their emoji) to punch in on; `0` = only the final emoji; `false` = no punch-in. |
| `sfx` | Stinger on the punch-in: `boom` (vine-boom style), `ding` (toaster bell), `rocket`, `boing`, `trombone`, `laugh`, `fail`, `dazzle`, `clown`, `punch`, `glitch`. `boom` and `ding` are synthesised. Any file you drop in `assets/sfx/<name>.wav` or `.mp3` can be used by its name. |
| `shake` | Screen shake on the punch-in. |
| `quick` | Rapid-fire: faster typing, no punch-in, and the camera holds one wider chat shot across consecutive quick exchanges. |
| `punchUser` | Punch in on the user's own message right after sending (`userSfx`, `userShake` optional). |
| `wall` | Spam-wall reply: `{"unit": "🍞", "count": 760, "end": " 😵‍💫", "dur": 2.8}`. The camera starts tight on the first line and pulls back to reveal the whole wall. `ai` becomes a prefix. |
| `think` / `hold` / `punchHold` | Per-exchange timing overrides, in seconds. |
| `final` | Last exchange: long slow push-in with a riser, then the end card (if any). |
| `cutaway` | Full-screen photo **or video clip** after the punch-in (clips play on a blurred copy of themselves, so 4:3 film fills the frame). Add `"sticker": "<noto media key>"` for an animated emoji reaction. Film clips play their **original sound** (the music dips under it): `"audio": false` mutes a clip, `"audioGain": -6` makes it quieter. Clips that are near-silent (just film hiss) stay silent automatically. Example: `{"image": "<media key>", "caption": "Elon right now 😐", "pos": "50% 12%", "zoom": [1.0, 1.12], "dur": 1.7, "sfx": "boom", "shake": true}`. The photo's credit is shown small in the corner. |

Keys starting with `_` (like `_act`) are ignored, so you can use them for notes.

The meter's `faces` can use photos too: `[70, "<media key>", "😊"]` shows the photo with the emoji as a badge.

### Photos and footage (`media`)

```json
"media": {
  "elon-smile": {"commons": "File:Elon_Musk_2015.jpg"},
  "elon-face": {"commons": "File:Elon_Musk_2015.jpg", "crop": [0.1, 0.0, 0.8, 0.545]},
  "mars":      {"nasa": "PIA01546"},
  "my-photo":  {"file": "my-photo.jpg", "credit": "Photo: someone, used with permission", "short": "Photo: someone"}
}
```

```bash
python3 chatvid/tools/fetch_media.py chatvid/episodes/elon-vs-grok.json
```

- `commons`: a Wikimedia Commons file. The licence and author are read from its page. Prefer CC BY or public domain (CC BY-SA asks for share-alike).
- `nasa`: a NASA Image Library id (public domain).
- `archive`: a public-domain film from the Internet Archive, cut to a clip with its sound: `{"archive": "DuckandC1951", "start": 31.5, "dur": 3.4}`. Only items marked public domain are accepted. The Prelinger collection (1940s-60s educational and industrial films) is a good source.
- `nasa_video`: a NASA video clip (public domain): `{"nasa_video": "<nasa_id>", "start": 50, "dur": 3}`. Picture only by default, because NASA productions often carry licensed stock music; add `"audio": true` only for raw footage.
- `noto`: a Google animated emoji (CC BY 4.0), used as a sticker: `{"noto": "💀"}`.
- `file`: your own file in `assets/media/`, for material you have a licence or permission for.
- `crop`: `[x, y, w, h]` as fractions of the image, e.g. to cut a face out for the meter or an avatar.

Credits go to `assets/media/credits.json`; `--upload` puts them in the description (put `{credits}` where they should go).

### Parodies of real people

When an episode puts words in a real person's mouth:

- Make it obviously parody: an "If…"/"(Parody)" title, the `badge`, and a disclaimer at the top of the description.
- Answer **Yes** to YouTube's "altered or synthetic content" question.
- Joke about their public, documented record; no invented crimes or scandals, no family, health or politics.
- No voice cloning or fake video. The chat format is the parody.

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
- `tools/mix.py`: places the sound cues, synthesises `boom`, `ding` and the risers, ducks the music under stingers, and limits the loudest hits.
- Final loudness: two-pass loudnorm towards -14 LUFS with true peaks held under -1 dBTP.
- `episodes/`: scripts.

## Asset licences

- Sound effects and music: [Mixkit](https://mixkit.co/license/), free for
  commercial use in videos, YouTube included. The files may not be redistributed
  on their own, which is why they are downloaded rather than committed. Mixkit
  music may not be registered with YouTube Content ID.
- `boom`, `ding` and the risers are synthesised in `tools/mix.py`, so there is no
  third-party audio in them at all. Famous meme clips (vine boom, bruh and so on)
  found on soundboard sites are usually unlicensed copies and can get monetised
  videos claimed; prefer these, or meme sounds you have a licence for.
- Emoji: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji), MIT licence.

## Documentary episodes (`"engine": "docu"`)

A second format: full-frame footage with an AI narrator, in the style of a nature
documentary. Example: `episodes/planet-human.json` ("An AI Made a Nature
Documentary About Humans").

```bash
python3 chatvid/tools/docu_prepare.py chatvid/episodes/planet-human.json
```

```bash
node chatvid/render.mjs chatvid/episodes/planet-human.json
```

`docu_prepare.py` speaks every narration line with Piper text-to-speech, times
each beat to its line, and cuts each beat's clip to exactly that length. Only
new or edited lines are re-voiced and re-cut. Then render as usual (`--plan`,
`--stills`, `--remix` and `--upload` all work).

| Episode field | Meaning |
|---|---|
| `voice` | `{"model": "en_GB-vctk-medium", "speaker": "p254", "lengthScale": 1.12}`: a Piper voice (downloaded on first use). VCTK voices are CC BY 4.0; LibriVox-trained voices (norman, john, cori) are public domain. Avoid voices whose dataset is non-commercial (e.g. ryan). |
| `log` | The recording overlay: `{"text": "AI OBSERVATION LOG", "subject": "HUMAN"}`; the film's year is added automatically. |
| `beats` | The script, in order (below). |
| `endCard` | `{"kicker", "text", "sub", "dur"}`. |

| Beat field | Meaning |
|---|---|
| `clip` | `"OfficeCo1952@212.5"` (Internet Archive id @ start second) or `"nasa:<id>@12"`. |
| `line` | Narration. Burned-in subtitles are generated from it (`noSubs` turns them off). |
| `hold` | Seconds after the line ends (default 0.55). |
| `label` | Species lower-third: `{"latin": "Homo officius", "common": "The office worker", "status": "UNDERPAID"}`. |
| `freeze` | Freeze-frame call-out: `{"at": "end", "x": 0.5, "y": 0.4, "r": 0.22, "zoom": 1.25, "text": "Threat display"}` (x/y/r as fractions of the picture; `"at": "end"` = when the line finishes). |
| `sfx`, `sfxAt`, `sfxGain` | A sound on the beat (default: when the line ends). |
| `title` / `chapter` | Title card (`kicker`, `sub`) or chapter card (`num`), optionally over a `clip`. |
| `mark` | Chapter name for the YouTube description when the beat isn't a chapter card. |
| `audio` | Play the clip's original sound under the narration. |

Thumbnails for documentaries can use a full-bleed frame: `full` (+ `shade`),
`ring`, `headline` and `botBadge` in `youtube.thumbnails`.
