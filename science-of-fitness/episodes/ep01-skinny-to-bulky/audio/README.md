# Episode 1 voiceover

AI-generated voiceover, made with Kokoro (open-source text-to-speech, Apache-2.0) on a CPU from `../SCRIPT.md`.

| File | What | Use it for |
|---|---|---|
| `vo-full.flac` | The whole narration, 11:28, 48 kHz, lossless | The edit's voice track |
| `vo-full.mp3` | The same at 160 kbps | Listening on a phone, sharing |
| `scenes/scene-01.mp3` … `scene-34.mp3` | One clip per scene, cut from the full track | Swapping or re-timing single scenes |
| `vo.srt` | Subtitles, one cue per line, timed to the audio | Upload to YouTube as captions, or burn in |
| `timings.json` | Start and end of every scene and line, in seconds | Placing visuals in the editor |

The scene timestamps and chapters in `SCRIPT.md` were updated to match this audio, so the script, the subtitles and the track all line up.

## Voices and settings

| Character | Kokoro voice | Speed |
|---|---|---|
| Narrator | `am_michael` | 0.87 |
| Rohan, the skinny guy | `am_puck` (younger, lighter) | 0.98 |
| Tiger, the rival | `am_fenrir` (deeper) | 0.97 |

| Setting | Value |
|---|---|
| Pace | about 160 words a minute while talking |
| Pauses | 0.32 s between lines, 0.5 s on a speaker change, 0.75 s between scenes |
| Holds | Extra silent holds where the script needs time for visuals, such as the six moves and the plan card |
| Loudness | normalised to about -17 LUFS, peaks at -1.5 dBTP, so YouTube's -14 LUFS target leaves room for music under it |

## Checked

The full track was transcribed back with Whisper (`small.en`) and compared word by word with the script. Every difference was formatting, such as numbers written as digits or "leveling" for "levelling". The tricky words come out right: paneer, rotis, dal, chana, 3 a.m., and the years.

## Re-make it after a script change

```bash
python3 scripts/tts_episode.py episodes/ep01-skinny-to-bulky kokoro-v1.0.onnx voices-v1.0.bin
```

The two model files are free downloads from the [kokoro-onnx releases](https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0). Pronunciation fixes live in the `SAY` list in `tts_episode.py`, and pause lengths and holds are at the top of the same file.

## Should the final upload use this voice?

It works for drafts, animatics and timing the edit. For the published video, a real voice is the stronger choice. The style guide recommends it for trust, and for YouTube's rules on low-effort, mass-produced content. The easiest swap is to record yourself reading `../VO.txt` scene by scene, then line it up with the same timings. If you keep the AI voice, YouTube asks you to disclose synthetic content only when it's realistic and could mislead. A clearly narrated explainer like this usually doesn't need it, but check the current rules in YouTube Studio when you upload.
