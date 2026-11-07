# Asset board v1

Live board, with comments: https://claude.ai/artifact/E55GnnmNSyJTEfJQbyhu8U. It's private until it's shared from its Share menu.

Ten artboards to review before any video is built:

| # | Board | Status |
|---|---|---|
| 1 | Mood board: palette, type, feels-like and never lists | Ready |
| 2 | Host: three design options, A recommended | Ready, needs your pick |
| 3 | Host character sheet: turnaround, expressions, spec | Expressions ready. Turnaround front view failed, reroll pending. |
| 4 | Pose library, 8 poses | 2 drafts with wrong form, kept on purpose. 6 pending. |
| 5 | The rival | Spec ready, image pending |
| 6 | Inside-the-body assets | Zoom ladder ready, 4 drawings pending |
| 7 | Food, vitamins, minerals | Tiles, capsules and bars ready. 2 food drawings pending. |
| 8 | Screen templates | Ready |
| 9 | Thumbnail mock-ups | 3 mock-ups ready |
| 10 | Anatomy kit: skin, muscle, bone, nerves | Ready. Files in `assets/anatomy/`. |

Pending images are waiting on free GPU time. The free Hugging Face quota ran out after 7 images. Regenerate them with:

```bash
python3 scripts/gen_board_images.py
```

Already-made images are skipped. Name a single item to redo it, for example `pose_pushup`.

- `gen/`: concept images from FLUX.1-schnell, with prompts and seeds in `scripts/gen_board_images.py`.
- `canvas/project/`: the board's source files, as published.
