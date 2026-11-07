# Episode 1 shots on Kaggle's free GPU (WanGP + Wan 2.2)

`ep01-wangp-batch.ipynb` generates the episode's character shots unattended. It runs on Kaggle's free GPU, which gives about 30 hours a week.

- **Model:** Wan 2.2, licensed Apache-2.0, so the clips carry no watermark and can go in a monetised video.
- **No setup cells:** the notebook already holds the shot prompts and the batch builder.

## Run it

1. Sign in at [kaggle.com](https://www.kaggle.com) and verify your phone number. Kaggle needs this for GPU and internet access.
2. Go to **Create → New Notebook → File → Import Notebook** and upload `ep01-wangp-batch.ipynb`.
3. In the right-hand panel, set these:
   - **Accelerator:** GPU T4 x2. Don't pick the P100, because current PyTorch no longer supports it.
   - **Internet:** On.
4. Optional, for consistent characters: **Add Input → Upload** a dataset with any of these:

   | File | Effect |
   |---|---|
   | `G01.png` … `G09.png` (storyboard sheets from `../flow/GRIDS.md`) | Each shot starts from its panel, so Rohan looks the same in every clip |
   | `03A.png`, `11B.png`, … (one keyframe per shot) | Used instead of the grid panel for that shot |
   | `03A.mp4`, … (clips you already have) | That shot is skipped |

5. Choose the shots in the **Settings** cell:
   - `SHOT_SET = "hero"`: the 10 hero shots. Good for a first run, to measure the speed.
   - `"tier1"`: 28 shots. `"all"`: all 73. Or list ids, such as `"03A,11B"`.
6. Click **Save Version → Save & Run All (Commit)**. You can close the tab. The run continues on Kaggle.
7. When the run finishes, open the version, go to **Output**, and download `ep01-shots.zip`.
8. Unzip it into `../flow/shots/`. Then build the video:

```bash
python3 scripts/video/assemble_ep01.py
```

The assembler uses each clip where it exists. Elsewhere it falls back to grid panels and then the first cut.

## Or launch it from the command line

With a Kaggle API key in the environment (`KAGGLE_USERNAME` and `KAGGLE_KEY`, or `KAGGLE_API_TOKEN` and `KAGGLE_USERNAME`), one script does the whole run:
- pushes the notebook as a private kernel, with a T4 and internet on;
- waits for the run to finish;
- unzips the clips into `../flow/shots/`.

```bash
pip install kaggle
```

```bash
python3 scripts/video/run_on_kaggle.py --set hero
```

## What the notebook does

| Step | What |
|---|---|
| 1 | Checks for a T4 and reads the GPU driver version |
| 2 | Installs WanGP, pinned to the version the batch settings were checked against, plus a matching PyTorch: 2.10 with CUDA 13 on driver 580+, otherwise 2.7.1 |
| 3 | Writes the episode's shot list and scripts, all embedded in the notebook |
| 4 | Builds the batch with `scripts/video/wangp_batch.py`: image-to-video for shots with a start image, text-to-video for the rest |
| 5 | Runs `wgp.py --process` headless, 6 shots at a time. After each chunk it renames the clips to `03A.mp4` and so on and updates `ep01-shots.zip`. It stops before Kaggle's 12-hour limit. |

## Settings

| Setting | Default | Options |
|---|---|---|
| `MODEL` | `5b` | `5b` is Wan 2.2 TI2V-5B with the FastWan 3-step LoRA. It fits a T4. `14b` is Wan 2.2 I2V-14B Lightning: better motion, but only for shots with a start image (the rest use 5B), and it may run out of Kaggle's RAM. |
| `RES` | 1280×704 | `960x544` is about twice as fast. The assembler upscales to 1080p either way. |
| `ATTENTION` | `sdpa` | `sage` installs SageAttention 1 for the T4. It can be faster, and the notebook falls back to `sdpa` if the install fails. |
| `PROFILE` | 4 | 5 uses the least RAM |

**Clip length.** Clips run up to 5 s: 121 frames at 24 fps on 5B. The assembler slows a short clip to 0.75× at most, then holds its last frame with a slow push-in.

## Running more than one session

A session that stops early still keeps every finished clip in `ep01-shots.zip`. To finish the rest, add that zip's clips as an input dataset and run again. The notebook skips shots that already exist.

## First real run: 7 November 2026, the 10 hero shots

| | |
|---|---|
| Machine | Tesla T4, driver 580, so the notebook picked PyTorch 2.10 with CUDA 13. Attention: sdpa. |
| Install | 5 minutes |
| Per shot at 1280×704, 5 s | About 7 minutes. Denoising is about 2.6 min (3 steps × 52 s). The rest is model loading, decoding and saving. |
| Whole run | 77 minutes for 10 shots, with no errors |
| Estimate for all 73 | About 8.5 hours, which fits in one 12-hour run. At `960x544`, expect roughly half that. |

**How the clips look:**
- **Style:** it holds well across all shots: black-and-white manga, teal shorts, amber bricks.
- **Strongest shots:** the Muscle Crew shots (11A, 11B), 03A and 20B.
- **Weak spots:**
  - Rohan's face and build drift between text-only shots. In 12A he isn't skinny enough.
  - Tiger came out fat instead of muscular (13A).
  - The push-up form in 24B is wrong: the hips are piked.
  - 29B shows mirror panels instead of a time-lapse.

  Starting shots from the storyboard sheets or keyframes fixes the drift. Redo the exercise-form shots from a keyframe, or keep the first-cut move cards for them.

## Change the shots

Edit `scripts/flow_shots.py`, regenerate `../flow/shots.json`, then re-make the notebook:

```bash
python3 scripts/video/make_kaggle_notebook.py
```

To use WanGP on your own GPU instead, build the batch file directly:

```bash
python3 scripts/video/wangp_batch.py --set tier1 --grids episodes/ep01-skinny-to-bulky/flow/shots --out wangp-queue.json
```

Then, inside a WanGP checkout:

```bash
python wgp.py --process wangp-queue.json --output-dir out --profile 4 --attention sdpa --fp16
```
