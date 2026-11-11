# Shorts recipe

A teardown of 20 Zack D Films shorts (script, voice, sound, look, camera, transitions, captions)
turned into a repeatable recipe for 3D explainer shorts.

- `index.html` — the playbook (open in a browser; frames load from `frames/`)
- `frames/` — example stills and transition strips cited in the playbook
- `analysis/metrics.csv` — per-video measurements (pace, first word, end tail, pauses, loudness, shots, camera)
- `analysis/transcripts.md` — word-for-word transcripts of all 20 shorts
- `analysis/scripts/` — the scripts used to measure them
- `tools/captions.py` — make 1–3 word captions in the same style from a voiceover (outputs .ass for ffmpeg)
- `tools/check_short.py` — score your own short against the reference numbers

```bash
pip install faster-whisper opencv-python-headless numpy
python tools/captions.py voice.wav captions.ass
ffmpeg -i render.mp4 -vf "ass=captions.ass" -c:a copy final.mp4
python tools/check_short.py final.mp4
```

Needs ffmpeg on PATH. The source videos are not committed.
