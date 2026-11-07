# Science of Fitness

A long-form, anime-style animated YouTube channel about the science of training, food, vitamins and minerals.

Start here, in order:
1. `REFERENCE-CHANNELS.md`: a breakdown of The Rep Theory and Principal Workout, covering look, titles, tone, numbers, and what we take, change and avoid.
2. `STYLE-AND-PIPELINE.md`: our host, palette, screen furniture, tone rules, episode shape, a sample cold open, how to handle "The Quantum Doctor", the free production pipeline, and the first ten episode ideas.
3. `ANIME-ANIMATION-REPOS.md`: free GitHub tools, with a section ranking them for this look.
4. `assets/style-frames/`: rendered template frames and a 7-second motion test. Regenerate them with `python3 scripts/style_frames.py`.
5. `board/`: the asset board for review before production, with its live link.
6. `assets/anatomy/`: the anatomy kit, covering skin, muscle, bone and nerves in manga ink. It has full-body layers, highlights, close-ups, microscopic views and animations. Read its README for the credit line.

```
science-of-fitness/
├── README.md
├── REFERENCE-CHANNELS.md
├── STYLE-AND-PIPELINE.md
├── ANIME-ANIMATION-REPOS.md
├── assets/style-frames/        00-palette, 01-title-card, 02-nutrient-card, 03-do-dont, 04-zoom-ladder, 05-stat-ring, 06-motion-test-stat.mp4, contact-sheet
├── assets/anatomy/             anatomy kit: body/, muscle-highlights/, bone-highlights/, closeups/, micro/, hero/, anim/, previews/
├── board/                      asset board source, concept images and status
├── scripts/style_frames.py     renders the frames above (needs Pillow and ffmpeg)
├── scripts/gen_board_images.py concept art through a free FLUX.1-schnell Space
├── scripts/anatomy/            prep_bp3d.py, manga_render.py, nerves.py, build_kit.py, micro.py
└── data/
    ├── reference-channels-2026-11-07.tsv   views, length and title for every video on both channels
    └── repos-checked-2026-11-07.tsv        stars, licence and last push for every repo checked
```

The host art is concept-only so far, and the final host needs a GPU. Section 3 of `STYLE-AND-PIPELINE.md` has the steps. The anatomy kit needs no GPU.
