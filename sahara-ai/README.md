# Lost in the Sahara (AI cut)

The same 58-second vertical short as `../sahara/`, remade with generative video instead of Blender. The aim
is the look of narrated 3D-animated shorts: one character, a moving camera in every shot and fast cuts. The story is Mauro
Prosperi in the 1994 Marathon des Sables, with the same narration, captions, maps and sound as the Blender cut.

- **Stills:** Qwen-Image (Q4_K_M GGUF + Lightning 8-step LoRA), 768×1344, two candidates per shot. Mauro
  stays recognisable because every prompt repeats one fixed description of him (white cap, bib "27", red
  backpack, black beard). `shots.json` holds the prompts: `HERO` expands to that description and `HEROFACE` to his face
  only (used for the hospital shots).
- **Motion:** Wan 2.2 I2V A14B (Q4_K_M high/low-noise + Lightning 4-step LoRAs) animates each approved still:
  49 frames at 480×832, RIFE ×2 to 32 fps, RealESRGAN ×2 to 960×1664. The motion prompts sit next to the
  image prompts in `shots.json`.
- **Where it runs:** a Kaggle notebook on 2×T4, with one ComfyUI server per GPU and a worker per server pulling from a
  shared queue (`kaggle/pipeline.py`). Each clip takes about 12 minutes on one T4.
- **Edit and sound:** `film.html` (frames, captions, labels, maps) rendered by `render.js`. The sound is the
  Kokoro narration in `vo/` plus the synthesized bed from `audio.py`.

## Build

```bash
python kaggle/build.py keyframes                 # -> kaggle/push/, then: kaggle kernels push -p kaggle/push
kaggle kernels output akkikmr/sahara-ai-keyframes -p out/kaggle_kf
python sheet_keyframes.py kaggle_kf              # contact sheets to choose from
python pick_keyframes.py picks.json              # chosen stills (+ optional crops) -> out/kf_dataset
kaggle datasets version -p out/kf_dataset -m "new picks"
python kaggle/build.py clips                     # then push; about 2 h when both GPUs stay up
./fetch_clips.sh sahara-ai-clips sahara-ai-clip-k19   # clips -> out/clips/<id>/f%04d.jpg + out/clips.json
python audio.py                                  # out/mix.wav
node render.js frames 0 58.54 out/frames
ffmpeg -framerate 24 -i out/frames/f%05d.jpg -i out/mix.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest lost-in-the-sahara-ai.mp4
```

To redo one shot, edit its prompt and run `python kaggle/build.py keyframes --only k13 --slug sahara-ai-k13`
(a separate notebook keeps the main one free). Then update `picks.json` and run the clip step for that shot.
`picks.json` records which candidate was chosen for each shot. A pick like `kaggle_kf3/1@180,0,637,800` crops that box and scales it back up.

## Notes from making it

- Under Lightning the stills run at cfg 1, so negative prompts do nothing. Describe what should be there
  ("plain unbranded", "one single sun"), not what should not. Words such as "skeletal" or "bony" draw a
  literal skeleton.
- Kaggle allows two GPU sessions at once, and a notebook can wait hours in the queue. If one is stuck, delete it
  and push the work under another slug.
- In the first full clip run, ComfyUI on GPU 0 was killed partway through its second clip with nothing in its log. Host RAM
  runs out when two servers each keep the 14B models loaded. Its job was requeued, so the other GPU rendered
  the remaining clips alone (about 4 h). The pipeline now restarts a dead server, up to twice, and records
  `free -m` at the time.

## What is true, and what is not certain

The facts and their uncertainties are the same as in `../sahara/README.md`. The bat-blood claim is Prosperi's own,
so the narration says "he says", and the maps are schematic. The pictures are AI-generated illustrations,
not footage: faces, the shrine and the hospital are imagined.

## Credits

Qwen-Image (Apache 2.0), Wan 2.2 (Apache 2.0), Lightning LoRAs (lightx2v), GGUF quantisations by QuantStack
and city96, ComfyUI (GPL-3.0) with ComfyUI-GGUF and ComfyUI-Frame-Interpolation, RIFE (MIT), Real-ESRGAN
(BSD-3), Kokoro-82M voice (Apache 2.0).
