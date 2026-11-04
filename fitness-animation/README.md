# Fitness explainer animation kit

A code-driven pipeline for YouTube videos in the "detailed anatomy drawing on black" style: grey
engraved/pencil figures that ink in, muscles that light up red along the line of force, hand-drawn
marker arrows and labels, stacked coloured call-out lines, clean data cards with ring timers and effort
bars, a safety badge, chapter cards, and a synced sound-design bed.

Everything is a pure function of time, so the browser preview and the rendered MP4 match frame for frame.

**Demo:** `renders/grip-strength.mp4`. A 55-second, 1920×1080, 30 fps episode ("Your grip is a lifespan
test") that uses every component. Its voice-over script, `.srt` and YouTube chapter list sit next to it.

```
fitness-animation/
├── STYLE.md                 the look: teardown of the reference, colour roles, motion rules, layout grid, episode structure
├── prompts/IMAGE-PROMPTS.md how to generate your own mascot figures in this style (consistent character, pure black)
├── engine/
│   ├── engine.js            the runtime + components (plate, arrow, stroke, hand, lines, pin, card, headline, text, counter, chapter, badge)
│   ├── theme.css            fonts, base styles
│   ├── player.html          preview player: scrub, frame-step, VO captions, coordinate picker
│   └── fonts/               Poppins + Kalam (SIL Open Font License)
├── episodes/
│   ├── grip-strength.js     the demo episode (read this first: it's the documentation by example)
│   └── _template.js         a blank episode to copy
├── assets/plates/           cut-out figures (.webp) + plates.js manifest with muscle regions and credits
├── tools/
│   ├── render.mjs           episode -> MP4 (+ SFX bed, .srt, VO script, chapters); also --stills
│   ├── sfx.mjs              synthesised whoosh / marker / tick / pop / hit sounds from the timeline cues
│   ├── mix.sh               final mix: video + your VO (+ music, auto-ducked), normalised to about -14 LUFS
│   ├── prepare_plate.py     cut a figure off a scanned book plate onto black
│   └── grid.py              pixel grid over a figure, for drawing highlight regions
└── renders/                 output
```

## Setup (once)

```bash
cd fitness-animation
npm install                     # playwright + http-server
npx playwright install chromium
# ffmpeg must be on your PATH (brew install ffmpeg / apt install ffmpeg / winget install ffmpeg)
```

## Preview

```bash
npm run preview                 # opens http://localhost:8080/engine/player.html
# another episode: .../engine/player.html?ep=my-episode   jump to a time: &t=12.5
```

Space plays, ←/→ steps one frame, Shift+←/→ steps a second, **C** shows the VO script as captions so you
can check timing, **P** turns on the picker: click anywhere on the frame and `[x, y]` is copied for
arrows, labels and pins.

## Render

```bash
node tools/render.mjs grip-strength                    # full MP4 with SFX bed -> renders/
node tools/render.mjs grip-strength --stills 3.4,24    # just PNG frames, seconds
node tools/render.mjs grip-strength --from 15 --to 25  # a slice
node tools/render.mjs grip-strength --scale 0.5        # fast 960x540 draft
node tools/render.mjs grip-strength --fps 60           # 60 fps like the reference
```

The renderer also warns when a scene's VO line won't fit its duration (`--wps` sets the words per
second, default 2.8).

## Making an episode

1. **Script in beats.** One scene = one VO sentence or two. Write the `vo:` line first. A beat that needs
   more than ~12 seconds is two beats.
2. **Record the VO** (one take per scene is easiest), then set each scene's `dur` to its take length + 0.3 s.
   Or record one long take and set durations from your editor's markers.
3. **Build each scene** from components. Every `at:` is seconds from the start of that scene, so
   re-timing one scene never breaks the others. Use the player's picker for coordinates.
4. **Render**, then mix in the voice (and music if you want it):
   ```bash
   tools/mix.sh renders/my-episode.mp4 vo.wav                 # VO + SFX
   tools/mix.sh renders/my-episode.mp4 vo.wav music.mp3       # + music ducked under the voice
   ```
5. **Upload** `renders/my-episode-final.mp4`, add `renders/my-episode.srt` as captions, and paste
   `renders/my-episode-chapters.txt` into the description (the first chapter must be 0:00 and there
   must be at least three).

## Components (cheat sheet)

| Call | What it does | Key options |
|---|---|---|
| `s.plate()` | Figure inks in, slow push, optional dim/move later, red muscle highlights | `plate, x, y, h, at, inDur, push, to: [{at, x, y, h, dim}], highlight: [{region, at, dur, sweep, out}]` |
| `s.arrow()` | Red marker arrow draws on | `from, to, bend, at, dur, width, head, color, out` |
| `s.stroke()` | Strike-through, underline or loose circle | `from, to` or `circle: [cx, cy], r: [rx, ry]`, `at, width` |
| `s.hand()` | Handwritten label writes on | `text, x, y, size, color, rotate, align, at, out` |
| `s.lines()` | Stacked lines: white question, accent answer, green dose | `x, y, items: [{text, color, dy, at}], gap, stagger, size, align` |
| `s.pin()` | Dot + leader line + label on a structure | `target, elbow, labelX, label, sub, at` |
| `s.card()` | Bordered card with kicker, title, visual, caption | `x, y, w, h, color, kicker, title, visual: {type: 'ring' | 'bars' | 'meter', ...}, caption` |
| `s.headline()` | Caps headline, word by word | `text, x, y, size, align, at` |
| `s.text()` | Any text, fades up (`html:` for mixed colours, `pop: true` for emphasis) | `text/html, x, y, size, color, weight, align, at` |
| `s.counter()` | Number that counts up | `to, from, x, y, size, suffix, prefix, decimals, sep, dur` |
| `s.chapter()` | Chapter card: outlined number, title, drawn underline | `num, title, sub, y, at` |
| `s.badge()` | Amber "BE SAFE" badge, bottom left | `title, text, at, x, y` |

Scene options: `name`, `dur`, `vo`, `chapter` (adds a YouTube chapter), `fadeIn`, `fadeOut`,
`cam: { s0, s1, x0, x1, y0, y1 }` (camera push/pan over the scene), `overlap`.

Colours are theme tokens: `ink`, `muted`, `hl` (muscle red), `accent`, `good`, `warn`. Override per
episode with `Motion.episode({ theme: { accent: '#2F8CFF' }, ... })`.

## Using your own figures

The demo figures are Paul Richer's 1890 anatomical engravings (public domain), cut onto black with
`tools/prepare_plate.py`. For a channel identity, generate a recurring mascot with
`prompts/IMAGE-PROMPTS.md`, then add it to `assets/plates/plates.js` and draw its highlight regions with
`tools/grid.py`. The engine adds the red highlights, so one grey figure covers every muscle you
talk about.

## Credits

- Figures: Paul Richer, *Anatomie artistique* (Paris, 1890), vol. 2, plates via Wikimedia Commons
  (public domain). Exact files are listed in `assets/plates/plates.js`.
- Fonts: Poppins (Indian Type Foundry / Jonny Pinhorn) and Kalam (Indian Type Foundry), SIL Open Font License.
- Demo statistics: Leong DP et al., *Prognostic value of grip strength: findings from the Prospective
  Urban Rural Epidemiology (PURE) study*, The Lancet 2015;386:266-273.
