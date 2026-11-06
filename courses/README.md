# Micro-course production system

One folder per course, one folder per episode, seven gates. Nothing moves to the next
gate until you say so. The playbook (hooks, retention, payoff, the human-made look) is at
https://claude.ai/artifact/N7z8NH5gAt4EcwwFEPTCTH and every gate below applies it.

## The seven gates

| # | Gate | What you get | What you decide |
|---|------|--------------|-----------------|
| 1 | Topic | A shortlist with demand and supply numbers | Which course to make |
| 2 | Episode plan | How many episodes, one line each: the one thing it teaches and why it is in that position | Approve, reorder, cut or add |
| 3 | Hooks | Five hooks per episode: the first frame described and the first sentence | One hook per episode |
| 4 | Mood board | A contact sheet of five visual styles, rendered as real frames with the series' own text, plus the narrator voice candidates | One style and one voice; they become the series kit |
| 5 | Script | The beat table: time, what is on screen, voice line, drawing, sound | Approve or mark changes |
| 6 | Video | A draft render; then the final after your notes | Approve |
| 7 | Package | mp4, cover, .srt, upload.txt (title, description, tags, playlist, pinned comment, upload settings) | Upload |

Gates 1 to 4 happen once per course. Gates 5 to 7 repeat for every episode.

## Folders

    courses/<course>/course.json              topic, episodes, the stage each one is at
    courses/<course>/hooks.md                 the five hooks per episode and the chosen one
    courses/<course>/moodboard/               styles.png (the contact sheet) and kit.json (the chosen style)
    courses/<course>/episodes/<n>-<slug>/     script.json, takes/, the mp4, cover, .srt and upload.txt

`voices/run courses/status.py` prints the board: every episode and its gate.

## Voice

Narration comes from a voice we design for the series with voices/make_voice.py (VoxCPM, free)
and generate line by line with voices/make_track.py, each line with its own emotion
instruction. Lines that need real feeling can instead be recorded by you and converted
with voices/convert_recording.py; the system treats both the same way.

## Video

Episodes are animated: drawn scenes, drawings on them (circle, arrow, bracket, label), chat
mock-ups, the A/B test layout, captions with one highlighted word, a series sticker, and a
sound kit (tick, pops, marker). Rendered at 1080x1920, 30 fps, -14 LUFS, like the Shorts
already made. The renderer for cut lists and drawings is built at gate 6 of the first episode.
