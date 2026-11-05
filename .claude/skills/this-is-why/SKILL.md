---
name: this-is-why
description: Make a "THIS IS WHY" YouTube Short - a story told in a square picture window on black that punches and swells on the music, one-line typed captions above it (white with yellow/red key words, letter pop, cursor sparkle), a stretch-and-blur glitch, and a red italic punchline on the drop. Use when the user gives a source video (a movie scene, a nature clip, any story with a twist or payoff) plus a reference Short in this style, asks for a "this is why" / karma / twist short, or another short "in the same format" as karma-wedding.
---

# THIS IS WHY short

The format is in `shorts/formats/this-is-why/FORMAT.md` (look, measured timeline, caption slots). The finished example is
`shorts/episodes/karma-wedding/` (`story.json`, `NOTES.md`, `POST.md`). Read FORMAT.md first.

Tools (run from `shorts/`): `beatcut/mirror.py` (`analyze` for the soundtrack and cuts, `window` for the window box and
`scale_keys`, `sheet` for contact sheets), `beatcut/story.py` (render), `beatcut/thumb.py` (thumbnail).
Requirements: ffmpeg, numpy, opencv-python-headless, pillow, scipy; fonts in `shorts/fonts/`.

## Steps

1. **Get the files from the user.** YouTube blocks downloads from this cloud machine; do not try to get around its bot
   check. Ask for both files as an upload or a Google Drive "anyone with the link" URL
   (`curl -L -o file "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`), each in its own
   scratch folder. A full-quality source is fine if it is under ~1 GB. The user can trim it on their computer with
   `yt-dlp -S "res,ext:mp4:m4a" --merge-output-format mp4 --download-sections "*MM:SS-MM:SS" --force-keyframes-at-cuts -o "source.%(ext)s" "<url>"`.
2. **Study the reference, do not guess.**
   - `python3 -m beatcut.mirror analyze reference.mp4 episodes/<name>` writes `clips/music.m4a` and `reference_timeline.txt`.
   - `python3 -m beatcut.mirror window reference.mp4` gives the window box and `scale_keys`. Check frames at any dip or
     jitter: dark picture content at both edges, or a glitch's stretched frames, can read as a scale change.
   - Make frame strips around each caption change, the glitch and the punchline. Note the caption times, their key-word
     colours, and the music's hits (beats near each change, the drop, any stop).
   - If the reference does something `story.py` can't do yet, add it. Don't fake it.
   - If the reference uses the same sound as `karma-wedding`, its `layout`, `transitions` and caption times can be reused.
3. **Find the story in the source.**
   - Take a transcript if there is dialogue (faster-whisper `small.en`, int8 on CPU; pass it a numpy array).
   - Make 2-second contact sheets, then denser ones around the candidate moments.
   - Pick ONE story that fits the arc: hook -> "BUT" (the hidden fact) -> 2 clues -> set-up -> punchline on the drop.
   - Read any on-screen text (letters, phones, signs). It is often the best clue.
   - List the source's internal cuts (`ffmpeg ... select='gt(scene,0.25)'`, and 0.08 for subtle ones) so no shot
     straddles one. Find the exact moments of pop-ins, such as a text bubble appearing.
4. **Measure the frame you're cropping from.**
   - Find the letterbox's active rows. `zoom_keys` must hide them: in the square window, the visible source height is
     `1080 / (zoom * 1.04)` of a 1080-row source.
   - Find the channel logo's position. Keep the crop off it with `focus`, or, in `fit` mode, a region that excludes it.
   - Cropping a logo out is fine. Don't inpaint or blur one away.
   - Burned-in subtitles: find their rows and keep the window above them (zoom ~1.72 and focus y ~0.42 for subtitles at
     rows ~780 of 1080), or use shots between lines. They are also the best translation of foreign dialogue: read
     them for the captions (machine translation of the audio drifts).
   - AV1 sources: OpenCV can't decode them; transcode to H.264 first
     (`ffmpeg -i in.mp4 -an -c:v libx264 -crf 14 -preset veryfast -pix_fmt yuv420p clips/source.mp4`).
5. **Fill `story.json`** (start from `episodes/karma-wedding/story.json`):
   - **Layout:** `"layout": {"type": "window", ...}` with the measured box and `scale_keys`.
   - **Shots** from the source (`clips/source.mp4`, a symlink is fine): `in`, `speed` (slow-mo is blended),
     `focus`/`focus_to` or `focus_keys`, and `zoom_keys`.
   - **Text in the footage:** use `"fit": [x0, y0, x1, y1]` so whole lines show over a blurred fill.
   - **Captions:** `"style": "line"`, `"anchor": "above_window"`, `"cps": 55`, `"sparkle": true`, colour codes `^y`/`^r`/`^w`.
   - **Punchline:** `"style": "punch"`, with `"beats"` set to the hits after the drop.
   - **Transitions:** one `glitch` where the music swells.
   - **Sound:** no `auto_sfx`, because the reference's soundtrack already carries its whooshes.
   - **Mood:** if the user names a theme (lust, greed, karma), grade for it per shot (`"grade": {"tint", "sat", "gamma"}`)
     and slow the glances down (0.7-0.8x). Keep it suggestive, never explicit, in the edit and the thumbnail.
6. **Check and render.**
   - `python3 -m beatcut.story episodes/<name> --stills`, tiled into one sheet. Fix framing: no black bars or logo
     inside the window, captions above it, text readable.
   - Full render, then frame strips at the typing (0-1 s), the window punch, the glitch, the punchline reveal and the
     last frame.
   - `python3 -m beatcut.mirror window out/edit.mp4` should give the reference's keys back.
   - Loudness: `ffmpeg -i out/edit.mp4 -af ebur128=peak=true+sample -f null -`, peak below 0 dBFS (the untouched
     soundtrack is limited automatically).
   - Don't make a side-by-side with the reference unless the user asks for one.
7. **Thumbnail:** `"thumbnail"` in `story.json` with `top` (the "before": everyone happy) and `bottom` (the payoff).
   Add `"punch": [["LINE 1", [255,255,255]], ["LINE 2!", [255,36,36]]]` and `"heart": false`, then run
   `python3 -m beatcut.thumb episodes/<name>`. Pick sharp frames (rank by Laplacian variance), and use zoom >= 1.4 so the
   letterbox stays out.
8. **Upload kit** in `episodes/<name>/POST.md`, the same structure as `karma-wedding/POST.md`:
   - title and alternatives
   - description (say the footage is a movie scene if it is one, credit the source)
   - tags, pinned comment
   - settings, plus the best in-video frame for the frame picker
   Also write `NOTES.md` with the story, the shot table and the QA.

## Rules

- The soundtrack comes from someone else's Short. Tell the user once: the safe route is posting `edit_no_music.mp4` and
  adding the sound in the YouTube app with **Use this sound** on the reference, started at 0:00.
- Captions only state what the footage shows or says. Don't name who received something unless the scene makes it clear.
- Scripted footage is presented as a scene, never as a real event.
- Never commit clips, music or renders (other people's media). Add the episode's `out/` to `shorts/episodes/.gitignore`.
- Do not copy the reference editor's watermark or the source channel's logo into the edit.
- Send the user `edit.mp4`, `edit_no_music.mp4`, `thumbnail.jpg` and `POST.md`. Say plainly what still needs them, such
  as the film's title for the credit line.
