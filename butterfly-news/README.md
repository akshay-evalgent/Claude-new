# 帝王蝶 · Butterfly — Caption News short

A 30-second, 16:9 (1920×1080, 30 fps) news short about the western monarch butterfly, built to the attached *Caption News* style: captions-first, sound-off readable, bilingual (Chinese caption + English spoken line), hard cuts on a 120 BPM half-beat grid, a frame-4 hook, one turn, and the source document highlighted on screen before its number is believed.

**Output:** `out/butterfly-caption-news.mp4` (30.0 s, −13.8 LUFS) and `out/butterfly.srt`.

## The story (one turn)

| Time | Shot | Move |
|---|---|---|
| 0.0 | Hook | 12,260 rolls in a yellow block from frame 4: this winter's western monarch count |
| 3.0 | Proportion by darkness | a yellow line sweeps 99% of the frame to grey: 99% fewer than 1997 |
| 6.0 | Ledger chart | the 1997–2020 counts draw segment by segment; 2020 lands red at 1,901 |
| 9.5 | Freeze and question | music cuts to silence: "Was that the end?" |
| 11.5 | **Turn** — ledger split | white flash, major brass hit; 1,901 vs 247,246, stamped ×130 |
| 14.5 | Held breath | text only, no voice: 130 times as many, in one year |
| 17.0 | The document says it | Xerces press release, the "three lowest counts" line highlighted; 9,119 popped beside it |
| 20.5 | The document says it | "over 60 monarch overwintering sites have been destroyed" highlighted; 60+ |
| 22.0 | Punch-in | the eucalyptus grove; second short silence at 23.5 |
| 24.0 | Verdict | "They can come back. If they still have somewhere to spend the winter." Bells, music returns |

Every number has its source tag in the same shot; every claim and sum is in `FACTS.md`.

## Build

```bash
python3 tools/prep.py src
```

```bash
python3 audio/voice.py /path/to/kokoro-model-dir
```

```bash
python3 audio/mix.py
```

```bash
python3 -m http.server 8767 &
node tools/render.js
```

```bash
tools/mux.sh
```

- `timeline.json` — shots, captions (`|` chunks, `{keyword}`), voice lines, silences, hits. Read by the page, `audio/mix.py` and `tools/cues.py`.
- `web/index.html` + `web/main.js` — the engine. `window.render(t)` draws any frame synchronously from the timeline and resolves when its images are decoded.
- `tools/prep.py` — footage at display size. Uses the USFWS Pismo Beach video clips if they are in the source folder; otherwise crops of the USFWS Pismo Beach photo (never above 1:1) plus the USFWS monarch clip.
- `audio/voice.py` — Kokoro narration (voice af_heart, speed 1.17). `audio/mix.py` — 120 BPM score, foley on every graphic move, coastal-grove natural sound, ducking. `tools/mux.sh` — two-pass loudnorm to −14 LUFS / −1.2 dBTP, light grain, mux.
- `tools/cues.py` — `.srt` and a reading-time check (every caption ≥ 1.8 s, ≤ 14 Chinese characters, every voice line ends before its caption).

## What differs from the style's own demo

- **Footage:** Wikimedia's file server rate-limited this build machine, so the three USFWS Pismo Beach *video* clips could not be downloaded. This cut uses the USFWS public-domain Pismo Beach photo (same place, same population) and one USFWS public-domain monarch clip. Drop the three `.webm` files into `src/` and re-run the build to swap them in (see `CREDITS.md` for their pages).
- **Music:** the style asks for sampled instruments; there were no sample libraries here, so kit, bass, marimba, vibraphone, glockenspiel, brass, timpani, strings and bells are synthesised in NumPy.
- **Final check:** no speech-to-text engine was available, so the narration was checked by line length against captions, not by ASR.
