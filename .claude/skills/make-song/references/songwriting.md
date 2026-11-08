# Writing the caption and lyrics

How to turn a request into ACE-Step inputs that sound good. Adapted from ACE-Step 1.5's own
songwriting guide (MIT License, © 2026 ACEStep), trimmed to what matters for `song.json`.

## Contents
- Caption: the most important input
- Lyrics: the timeline
- Metadata: bpm, key, duration, language
- Worked example

---

## Caption: the most important input

The caption decides genre, sound, mood and vocal. Write it like a producer briefing a session:
specific, several dimensions at once, no contradictions.

| Dimension | Examples |
|---|---|
| Genre / style | synth-pop, indie folk, trap, lo-fi hip-hop, synthwave, bossa nova, cinematic orchestral |
| Mood | bittersweet, euphoric, brooding, nostalgic, intimate, triumphant |
| Instruments | warm analog bass, fingerpicked acoustic guitar, 808s, felt piano, string section, gated snare |
| Texture / mix | warm, airy, punchy, lush, crisp, polished, wide, radio-ready, raw, bedroom |
| Era | 80s synth-pop, 90s R&B, 2010s EDM, vintage soul |
| Vocal | breathy female lead, raspy male baritone, stacked harmonies, choir, spoken word |
| Rhythm feel | four-on-the-floor, laid-back groove, driving, half-time, swung |
| Structure hints | slow-building intro, big anthemic chorus, stripped-back bridge, fade-out |

Principles:
- **Specific beats vague.** "sad piano ballad with a breathy female vocal" beats "a sad song".
- **Combine dimensions.** Genre + mood + instruments + vocal + mix anchors the result.
- **No artist or song names.** Translate "like Taylor Swift" into what it means musically
  (e.g. "polished country-pop, acoustic guitar and banjo, confessional female vocal").
  This keeps the output original and avoids imitating a real person's voice.
- **No tempo, key or duration in the caption.** Put them in `bpm`, `key`, `duration`; the
  planner follows those fields more reliably than prose. (A caption saying "118 BPM" with
  `bpm: null` came out at 115.)
- **Avoid conflicts.** "classical strings" + "hardcore metal" muddies both. To get a change
  on purpose, describe it as a journey: "starts as soft strings, turns into metal by the end".
- **Less detail = more freedom.** Keep it to two or three sentences.

## Lyrics: the timeline

The lyrics field controls how the song unfolds: words, section tags, vocal and energy cues.
Leave a blank line between sections.

**Structure tags:** `[Intro]`, `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Bridge]`, `[Outro]`,
plus `[Build]`, `[Drop]`, `[Breakdown]`, `[Guitar Solo]`, `[Piano Interlude]`, `[Fade Out]`.
An instrumental is just `[Instrumental]` (or tags with no words, e.g. `[Intro]\n\n[Drop]\n\n[Outro]`).

**Cue tags** (one or two words, sparingly): `[whispered]`, `[falsetto]`, `[raspy vocal]`,
`[powerful belting]`, `[spoken word]`, `[harmonies]`, `[building energy]`, `[explosive]`.
Combine with a dash, but keep it short: `[Chorus - anthemic]`, not five adjectives.

**Line craft:**
- 6–10 syllables per line; lines in matching positions should have similar counts (±1–2),
  because the model lines syllables up with beats.
- Parentheses = backing vocals: `We rise together (together)`.
- UPPERCASE = shouted/intense delivery; use for a word or a line, not whole sections.
- One core image or metaphor per song, explored from several angles. Avoid the "AI lyric"
  tells: stacked adjectives ("neon skies, electric hearts, endless dreams"), mixed metaphors,
  forced rhymes, lines too long to sing in one breath.
- A chorus that repeats word-for-word is normal and helps the hook.
- Keep caption and lyrics consistent: an instrument named in the caption can get a solo tag;
  a "whispered intimate" caption shouldn't have `[powerful belting]` everywhere.

**Using the user's own lyrics:** keep their words exactly. Only add section tags if they're
missing, and say that you did.

## Metadata: bpm, key, duration, language

Let the planner choose (`null` / `""` / `-1`) unless the user cares, or the style clearly
implies it.

| Field | Range / format | Guidance |
|---|---|---|
| `bpm` | 30–300 or `null` | ballad 60–80, mid-tempo pop 90–120, dance 120–130, DnB ~170 |
| `key` | `"C major"`, `"F# minor"`, or `""` | common keys (C, G, D, A minor, E minor) are most stable |
| `duration` | 10–600 s or `-1` | `-1` lets the planner size it to the lyrics |
| `language` | ACE-Step code: `en`, `es`, `fr`, `de`, `it`, `pt`, `ru`, `ja`, `ko`, `zh`, `yue`, `hi`, … | match the lyrics |

Rough durations if you set one: 2 verses + 2 choruses ≈ 120–150 s; add a bridge ≈ 180–240 s;
full song with intro/outro ≈ 210–270 s. Slow tempos need more time for the same lyrics.
Longer songs take longer to generate, about 5 planner tokens per second of audio.

## Worked example

Request: *"a nostalgic synth-pop song about missing someone on the night train home, female vocal, around 118 bpm"*

```json
{
 "caption": "Modern synth-pop with a four-on-the-floor beat, warm analog bass, shimmering arpeggiated synths and gated reverb snares. Breathy, intimate female lead vocal with stacked harmonies in the chorus. Bittersweet and nostalgic, polished, wide, radio-ready mix.",
 "lyrics": "[Intro]\n\n[Verse 1]\nCity lights are fading on the train ride home\nYour voice still in my headphones on a dying phone\n...\n\n[Chorus]\nWe were neon in the dark, we were louder than the rain\n...\n\n[Outro]",
 "language": "en",
 "bpm": 118,
 "key": "",
 "duration": -1,
 "takes": 2,
 "model": "acestep-v15-turbo",
 "mastering": "loudness"
}
```

Tempo went into `bpm`, not the caption; the key was left to the planner; the vocal and mood
in the caption match the intimate lyrics.
