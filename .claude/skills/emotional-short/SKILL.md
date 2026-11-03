---
name: emotional-short
description: Make an emotional "respect" YouTube Short (rescue, kindness, sportsmanship, a dream coming true) in the saved format - typed neon captions, light-leak / TV-off / glitch transitions cut to a reference Short's soundtrack, ending on a mending-heart burst and "RESPECT". Use when the user gives a source video (or clips) plus a reference Short whose music and style to follow, or asks for another short "in the same format".
---

# Emotional respect short

The format is written up in `shorts/formats/emotional-respect/FORMAT.md` (story arc, 13 slots, caption rules, look). The finished
example is `shorts/episodes/messi-respect/` (`story.json`, `NOTES.md`, `POST.md`). Read FORMAT.md first.

Tools (run from `shorts/`): `beatcut/mirror.py` (analyze a reference, contact sheets, side-by-side), `beatcut/story.py` (render),
`beatcut/beatmap.py` (beats). Requirements: ffmpeg, numpy, opencv-python-headless, pillow, scipy.

## Steps

1. **Get the files from the user.** YouTube blocks downloads from this cloud machine; do not try to get around its bot check.
   Ask the user to download on their own computer (Windows cmd):
   - reference Short, whole: `yt-dlp -S "res,ext:mp4:m4a" --merge-output-format mp4 -o "reference_short.%(ext)s" "<short url>"`
   - source video as a small preview: `yt-dlp -S "res:360,ext:mp4:m4a" --merge-output-format mp4 -o "source_preview.%(ext)s" "<video url>"`,
     then if over 100 MB: `ffmpeg -i source_preview.mp4 -vf "scale=-2:240,fps=15" -c:v libx264 -crf 32 -preset veryfast -c:a aac -b:a 48k -ac 1 source_small.mp4`
   - share both via upload here or a Google Drive "anyone with the link" URL
     (download: `curl -L -o file "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`).
   Put downloads in their own scratch folder.
2. **Study the reference, do not guess.** `python3 -m beatcut.mirror analyze reference_short.mp4 episodes/<name>` writes the
   soundtrack to `clips/music.m4a`, a skeleton `story.json` and `reference_timeline.txt` (transition times and types, drop, stops,
   flicker). Then look at it: `python3 -m beatcut.mirror sheet reference_short.mp4 ref.jpg --step 0.1667` and frame-by-frame strips
   around anything special (the ending). If the reference does something the renderer cannot do yet, add it to `story.py`.
   If the reference is the same soundtrack as before, `formats/emotional-respect/template.json` already has the slots.
3. **Find the story in the source.** `python3 -m beatcut.mirror sheet source_small.mp4 src.jpg --step 10`, then 1-second and
   0.25-second sheets of candidates. Pick ONE story with 10-15 usable shots that fits the arc (trouble -> helper -> act on the drop ->
   "FINALLY" -> safe -> salute -> RESPECT). Note internal cuts (`ffmpeg ... select='gt(scene,0.2)'`) so no slot straddles one.
4. **Check the facts** with a web search before writing captions. Only claims you can source go on screen.
5. **Fill `story.json`**: cut the used range into `clips/<clip>.mp4` (`ffmpeg -ss <start> -i source_small.mp4 -t <dur> -an ...`),
   set each slot's `in`, `speed` (slow-mo is blended), `focus`, `zoom_keys`; captions with colour codes; arrow `tail`/`tip`.
   Crop away logos and other channels' watermarks (use a framing grid on source frames to place `focus`).
6. **Check, render, compare.** `python3 -m beatcut.story episodes/<name> --stills` (fix framing), full render, then
   `python3 -m beatcut.mirror compare reference_short.mp4 episodes/<name>/out/edit.mp4 episodes/<name>/out/compare.mp4` and frame strips
   at the transitions and the ending. Transition times should match the reference within one frame.
7. **Full quality.** Give the user one command for exactly the range used:
   `yt-dlp -S "res,ext:mp4:m4a" --merge-output-format mp4 --download-sections "*MM:SS-MM:SS" --force-keyframes-at-cuts -o "<name>_full.%(ext)s" "<video url>"`.
   Replace `clips/<clip>.mp4` with it (check it lines up with the preview: same first frame) and re-render.
8. **Upload kit** in `episodes/<name>/POST.md`: title, description, tags, hashtags, pinned comment, and a 1080x1920 thumbnail
   (`out/thumbnail.jpg`) plus the best in-video frame time for the in-app frame picker. Same structure as `messi-respect/POST.md`.

## Rules

- The soundtrack comes from someone else's Short. Tell the user once: baked-in commercial music can draw a Content ID claim; the safe
  route is uploading `edit_no_music.mp4` and adding the sound in the YouTube app with "Use this sound" on the reference Short.
- Never commit clips, music or renders (other people's media); `episodes/.gitignore` covers `clips/` and the episode's `out/`.
- Do not copy the reference editor's watermark. Offer to add the user's handle instead.
- Send the user the draft and the side-by-side, and say plainly what is draft quality (240p preview) and what still needs their file.
