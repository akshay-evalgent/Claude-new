# T3-Video on free Kaggle GPUs, driven from Claude

Native 4K text-to-video with [T3-Video](https://huggingface.co/APRIL-AIGC/T3-Video)
([paper](https://arxiv.org/abs/2512.13492), [code](https://github.com/zhangzjn/T3-Video)).
Shots render on Kaggle's free **GPU T4 x2**. Claude's cloud session submits the job,
checks on it and pulls the videos back; the cut happens here on CPU.
Your laptop does nothing and can be off: the Kaggle job runs on Kaggle's machines.

```
shots.json ──submit.py push──▶ Kaggle (T4 x2, ~12 h max) ──submit.py fetch──▶ renders/*.mp4 ──stitch.py──▶ film_2160p / 1080p / vertical
```

## What you get, and the limits

| | |
|---|---|
| Output per shot | 3840x2176, 81 frames, 30 fps = **2.7 s**. The released weights support only this shape. |
| Aspect | Landscape only. `stitch.py` cuts a 9:16 version from the 4K frame (1224x2176 crop, still above 1080x1920). |
| Model | Wan2.1-T2V-**1.3B** fine-tuned for 4K. Strong on landscapes, weather, cities, light. Weak on faces, hands, readable text and complex action. |
| Speed on T4 | **Not measured yet.** My estimate is 1.5-3 h per shot per T4 at 15 steps, from FLOP counts: about 4,000 TFLOP per forward pass, two passes per step for CFG, plus a 4K VAE decode. Two T4s render two shots at once. The first run logs the real seconds per step. |
| Throughput | Kaggle caps a session at 12 h and gives about 30 GPU-hours a week (the number floats; `submit.py check` shows yours). At my estimate that is 6-8 shots per session and 15-20 a week. |

The reference code needs about 48 GB of GPU memory, mostly for full-length intermediates
(RoPE in float64 over 685k tokens, a 12 GB FFN activation). A T4 has 16 GB.
[`lowmem.py`](lowmem.py) runs the same math in chunks instead, with windowed attention a few windows
at a time, chunked FFN and head, and an fp32 residual stream, because T4s have no bf16.
Estimated peak is 12-13 GB. [`tests/test_lowmem.py`](tests/test_lowmem.py) checks it against
a transcription of the original block on CPU. In float64 the error is 0 for all five T3 window patterns.

**Not yet run on a real T4.** The patch math and the job's control flow are tested on CPU.
Real fp16 numerics, memory headroom and speed are only known after the first Kaggle run.
The job logs peak VRAM and seconds per step for every step, so start with two shots.

## One-time setup (about 5 minutes)

1. Make a Kaggle account and **verify your phone number** (Settings > Phone verification).
   Kaggle needs this before a notebook gets a GPU or internet access.
2. Kaggle > Settings > API > **Create New Token**, and copy it.
   Kaggle tokens act with your whole account. A separate Kaggle account just for rendering is reasonable.
3. In this Claude Code environment's settings (environment menu in the session title bar > Edit), add:
   - `KAGGLE_USERNAME`: your Kaggle handle, as an environment variable
   - `KAGGLE_API_TOKEN`: the token, under Network secrets if that section is offered, otherwise as an environment variable

   Don't paste the token into chat. Start a new session after adding them.
4. Claude (or you) runs `pip install kaggle && python t3-video/submit.py check`.

## Rendering

From a Claude session, asking "render s01 and s06" is enough. The commands are:

```bash
cd t3-video
pip install kaggle
python submit.py check                                   # auth + weekly quota
python submit.py push --only s01_ridge_dawn,s06_city_blue_hour   # first run: two shots, one per T4
python submit.py logs --follow                           # live log: seconds/step, peak VRAM
python submit.py wait                                    # polls every 15 min, then fetches
python stitch.py --music track.mp3                       # renders/film_2160p.mp4, _1080p, _vertical
```

* `push` sends only shots that have no `renders/<id>.mp4` yet, so re-running it continues the film.
  It refuses while a run is active and fetches the previous run's outputs before replacing them.
* `--steps 10` makes quicker drafts. The demo uses 15 and the paper 50.
* Before each shot, and after every denoising step, the job checks whether the shot can still finish
  before Kaggle's 12-hour stop. If it can't, it stops instead of wasting the GPU time.
* `push --dry-run` builds `build/kernel/` without credentials, so you can inspect exactly what will run.

## Writing shots

`shots.json` holds an ordered list. Each shot needs `id`, `seed` and `prompt`, and can set `steps`,
`cfg_scale` (default 5.0) and `vertical_x` (where the 9:16 crop sits, 0-1).
Prompts work best in the authors' style, about 50 words in this order:
light > shot type > camera move > subject > texture. For example: *"Golden hour aerial tracking shot
banking slowly across towering sand dunes, ..."*.
The included shots are an eight-shot dawn-to-night sequence, *First Light*, about 22 s.

## Where files live

* Kaggle keeps each run's outputs (`renders/`, `latents/`, `run.log`, `summary.json`) until the next push.
* `fetch` copies them into `t3-video/renders/`, which git ignores: 4K shots are 30-80 MB each,
  and this cloud container is deleted when the session ends. Keep finals by committing the small
  1080p or vertical cuts on purpose (`git add -f`), or by downloading from the Kaggle notebook page.
* `latents/<id>.pt` is the final latent of each shot (88 MB), so a bad VAE decode can be redone
  without denoising again.

## If the T4 path is too slow or doesn't fit

* **Modal** gives $30 a month of free credit. On an A100 80GB or H100 the official code runs
  unmodified in roughly 10-20 minutes per shot, which is about 15-30 shots a month.
  It needs a Modal account and token, the same way as Kaggle.
* The **Hugging Face demo Space** (`hugging-apps/t3-video-4k`) needs a PRO account, because one
  run uses more than the free ZeroGPU quota.

## Files

| File | Runs on | Purpose |
|---|---|---|
| `submit.py` | here | build the Kaggle job, push it, poll, fetch |
| `render.py` | Kaggle | setup, prompt encoding, one worker per T4, time budget, fp32 VAE fallback |
| `lowmem.py` | Kaggle | the 16 GB memory schedule for T3-Video's DiT |
| `stitch.py` | here | cut shots into 4K / 1080p / vertical with optional music |
| `shots.json` | both | the shot list |
| `tests/` | here | `python tests/test_lowmem.py && python tests/test_render_flow.py` (needs torch + einops) |

T3-Video code and weights are Apache-2.0, and the Wan2.1 license also applies to the Wan components.
The Kaggle job pins T3-Video at commit `09454d4`.
