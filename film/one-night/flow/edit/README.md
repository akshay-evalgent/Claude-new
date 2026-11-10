# One Night: the Flow edit

The 50-second Short cut from the three Google Flow clips in `src/`, with narration, score and captions.
The finished file and the upload kit are in `upload/`.

```
python vo/make_vo.py af_heart       # narration takes, checked with Whisper (audio venv: kokoro, faster-whisper)
python build/edit.py                # timeline, captions, mix and final render -> upload/one-night-short.mp4
```

If you generate the presenter clips later (A1, A2 and A3 in `../FLOW_PROMPTS.md`), they replace the narration
lines N1, N5 and N8. Put them in `src/` and add them to the timeline in `build/edit.py`.
