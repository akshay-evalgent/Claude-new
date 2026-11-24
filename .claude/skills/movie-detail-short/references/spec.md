# detail.py spec reference

```json
{
 "title": "Did you notice this man in Titanic???",
 "note": "what the detail is + sources (kept for the record)",
 "base": ".",
 "voice": "am_michael", "speed": 1.32, "gap": 0.05,
 "beats": [ ... ],
 "credits": ["Titanic (1997)", "Photos: public domain"]
}
```

`base` is the work folder, which holds `src/<clip-id>.mp4`, `photos/` and `tx/<clip-id>.json`.

**Layout keys:**
- `"layout": "full"` (the default) shows each film shot uncropped across the full width at 40% of the screen height, over a blurred fill, with captions at `cap_y` (default 0.635).
- `"layout": "crop"` is the old full-screen 9:16 crop. It cuts the scene, and the user rejected it.
- A single shot can still use `fit` (a slight crop to hide a watermark) or `"crop": true`.

## Beats

**Narration beat:**
```json
{"say": "His name was Charles Joughin.", "speak": "His name was Charles Jockin.",
 "shots": [["<clip-id>", 172.6, {"cx": 0.78}], ["photo:joughin_1912.jpg", 0, {"w": 1.4}]]}
```
- `say` is used for the captions; `speak` (optional) is what the voice reads. Use `speak` for phonetic names and for numbers written out as words.
- The shots share the beat's length in proportion to their weights `w` (default 1), plus the short gap after the beat.

**Film-line beat:** the clip's own picture and sound.
```json
{"film": ["<clip-id>", 120.25, 124.10],
 "shots": [["<clip-id>", 120.25, {"cx": 0.3, "w": 0.65}], ["<clip-id>", 120.9, {"cx": 0.52, "w": 3.2}]]}
```
- If `shots` is left out, the line plays as one shot starting at `start`.
- **Cutaways:** use other clips or times inside a film beat, with weights equal to seconds so the line stays in sync.
- Captions come from `tx/<clip-id>.json`. If the transcript missed or misheard the line, add `"words": [[start, end, "word"], ...]` in source time.

## Shot options

Each shot is `[clip-id or "photo:<file>", source start seconds, {options}]`.

| Option | Meaning |
|---|---|
| `cx` | Horizontal centre of the vertical crop, from 0 (left) to 1 (right). Set it by eye with `frames.py`. The face finder that sets it automatically fails on dark frames. |
| `cx1` | Crop centre at the end of the shot (a pan). |
| `cx: [[k, v], ...]` | Crop-centre keyframes across the shot, with k from 0 to 1. Use these to follow a sign through a camera pan. |
| `cy` | Vertical position of the crop (default 0.4). |
| `zoom` | Extra zoom (1.0–1.3). Every shot also gets a slow 5% push-in. |
| `w` | Weight of the shot's share of the beat. |
| `d` | Fixed length in seconds; the other shots share what's left. |
| `bright` | Extra brightness multiplier. Night shots are already lifted automatically. |
| `rows` | `[top, bottom]` as fractions of the height, overriding letterbox detection. Dark night skies fool the detection. |
| `fit` | A framed wide shot. The window is zoomed by `fit` with aspect `ar` (default: the picture's own), placed at height `fy` (default 0.30) over a blurred fill. Use it for signs, wide action or anything a 9:16 crop would cut. |
| `ar` | Aspect ratio of the `fit` window (1.0 = square). |
| `fy` | Vertical position of the `fit` window on screen. |

**Photos (`photo:<file>`):** shown framed over a blurred copy of themselves, with a slow push-in.

## Known pitfalls, all hit before

- **Gaps:** shots must cover the beat plus its gap; detail.py handles this. Don't hand-time shots past a beat's end.
- **Mispronunciation:** check the QA transcript and fix it with `speak`, e.g. Joughin → "Jockin" and Lantieri → "Lanteeri".
- **Static shots:** a single shot held for more than about 3 s feels dead, especially a 12 s interview. Add cutaways.
- **Clipped words:** keep film-line cuts 0.05–0.15 s outside the word times.
- **Watermarks:** uploaders' logos sit in a corner; frame `cx` and `cy` to keep them out.
- **Profanity:** trim it out of film lines; keeping it risks ads.
- **Black bars and dark frames:** use `rows` when the top of the picture gets cropped as if it were letterbox.
