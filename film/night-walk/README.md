# Night Walk: a first-person galaxy film, made for free

A 15-second POV film: someone walks at night, filming an impossible spiral galaxy.
The handheld walking camera, swirling sky, shooting stars and sound were all made in a
Claude cloud session. The one shot with real AI motion came from a free Hugging Face account.

| Step | Tool | Where it runs | Cost |
|---|---|---|---|
| Stills | [Sana-Sprint 0.6B](https://huggingface.co/Efficient-Large-Model/Sana_Sprint_0.6B_1024px_diffusers) (Apache-2.0), 2 steps, 1344x768 | session CPU, ~25 s each | free |
| Depth | [Depth-Anything-V2-Small](https://huggingface.co/depth-anything/Depth-Anything-V2-Small-hf) (Apache-2.0) | session CPU, ~1 s | free |
| Camera | `pov.py`: walking push-in with depth parallax, handheld gait (step bob at 1.8 Hz, sway, heel-strike jolt, breathing, hand tremor), turning, look-up | session CPU, ~2 min a shot | free |
| Surreal sky | `pov.py`: sky-only swirl around the galaxy core (depth mask), shooting stars | session CPU | free |
| AI motion shot | [LTX-2.5 Space](https://huggingface.co/spaces/Lightricks/LTX-2.5), image-to-video from the lake still, then the same handheld walk | Hugging Face ZeroGPU, ~20 s | free account, ~5 GPU-min/day |
| Sound | `audio.py`: footsteps (grass / pebbles) on the same footfalls as the camera, crickets, wind, drone that swells at the reveal, star whooshes, an exhale when the walker stops | session CPU, ~2 s | free, nothing licensed |
| Edit | `edit.py`: 0.3 s dissolves, night grade, grain, 2.39:1 bars, loudness to -16 LUFS | ffmpeg | free |

```bash
pip install torch diffusers transformers accelerate gradio_client
python pov.py stills shots.json MODELS_DIR WORK      # Sana + depth for "source": "cpu" shots
python pov.py shots  shots.json WORK                 # one 1920x1080 mp4 per shot
python pov.py video  lake_ltx_raw.mp4 WORK/hf/s3_lake_ltx.mp4 3.04 203   # handheld on the AI clip
python edit.py shots.json WORK night_walk.mp4
```

Prompting notes from making it:
* Words like "anamorphic" or "film still" make Sana paint letterbox bars. Add bars in the edit instead.
* "Walking" in a still prompt invites a person into the frame. "Empty landscape ... deserted, nobody" keeps it first person.
* LTX text-to-video put a hiker in front of the camera. Image-to-video from a person-free still gives true POV.
* LTX-2.5 reserves about 3 GPU-minutes of quota per landscape clip (it doubles its own estimate), but charges less.
