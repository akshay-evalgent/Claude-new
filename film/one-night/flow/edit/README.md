# One Night: the Flow edit

The 61.6-second Short cut from the six Google Flow clips in `src/`: three presenter clips (A1 to A3) and three
animation clips (B1 to B3), with narration in the presenter's cloned voice, score and captions.
The finished file and the upload kit are in `upload/`.

```
python vo/make_vo.py af_heart       # narration takes, checked with Whisper (audio venv: kokoro, faster-whisper)
python build/unwatermark.py         # src/ -> src_clean/: Flow's corner sparkle removed (needs scipy, opencv)
python vo/clone_her.py 3            # narration in her voice from vo/her/reference.wav (Chatterbox env)
python build/edit_full.py           # the six-clip edit -> upload/one-night-short.mp4 and upload/captions-en.srt
```

`build/edit.py` is the earlier 50-second cut from the animation clips alone.
