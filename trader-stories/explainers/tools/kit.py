"""Write UPLOAD_KIT.md for an explainer from its kit.json + build/timing.json + beats.json.

usage: python kit.py VIDEO_DIR
kit.json keys: title, alts[], hook (description opening), sources[], tags, pinned, chapters {shot_id: name},
               short (bool), format, notes[], hashtags
Chapter timestamps come from the real timing, so they always match the rendered video.
Music credits are generated from the tracks listed in beats.json (CC BY 4.0 attribution).
"""
import json, sys
from pathlib import Path

vdir = Path(sys.argv[1])
kit = json.load(open(vdir / "kit.json"))
beats = json.load(open(vdir / "beats.json"))
timing = json.load(open(vdir / "build" / "timing.json"))
fps = timing["fps"]
dur = timing["total"] / fps
name = vdir.name

def ts(sec):
    sec = int(round(sec)); return f"{sec // 60}:{sec % 60:02d}"

first = {}
for b in timing["beats"]:
    first.setdefault(b["shot"], b["start"] / fps)

chapters = []
if not kit.get("short"):
    chapters.append(("0:00", kit.get("open", "Intro")))
    for shot, title in kit.get("chapters", {}).items():
        if shot in first:
            chapters.append((ts(first[shot]), title))

tracks = []
for m in beats.get("music", []):
    if m["track"] not in tracks:
        tracks.append(m["track"])
credits = "\n".join(f'"{t}" Kevin MacLeod (incompetech.com)\nLicensed under Creative Commons: By Attribution 4.0 License\nhttp://creativecommons.org/licenses/by/4.0/' for t in tracks)

desc = kit["hook"].strip() + "\n\n"
if chapters:
    desc += "CHAPTERS\n" + "\n".join(f"{a} {b}" for a, b in chapters) + "\n\n"
if kit.get("sources"):
    desc += "SOURCES\n" + "\n".join(f"• {s}" for s in kit["sources"]) + "\n\n"
desc += ("HOW THIS VIDEO WAS MADE\n" + kit.get("made", "Animation made by us in code (Remotion). The narration is a synthetic voice (Kokoro). Sound effects are CC0 (Kenney and others) or our own.") + "\n\n")
desc += "MUSIC\n" + credits + "\n\n"
desc += "This video is for education and entertainment. It is not financial advice.\n\n" + kit.get("hashtags", "#Finance #Money #Explained")

w, h = (1080, 1920) if kit.get("short") else (1920, 1080)
lines = [f"# YouTube upload kit: {kit['title']}", "",
         f"| File | Use |", "|---|---|",
         f"| `{name}.mp4` (in `build/`, sent separately) | {'Short, vertical' if kit.get('short') else 'Long video'}: {w}×{h}, 30 fps, {ts(dur)}, mixed to −14 LUFS |",
         f"| `captions.srt` (in `build/`) | English subtitles from the narration timing |", "",
         f"Format test: **{kit.get('format', '')}**", "", "## Title", "", f"> {kit['title']}", ""]
if kit.get("alts"):
    lines += ["Alternatives for Test & Compare:", ""] + [f"- {a}" for a in kit["alts"]] + [""]
lines += ["## Description", "", "```", desc, "```", "", "## Tags", "", "```", kit.get("tags", ""), "```", ""]
lines += ["## Studio settings", "", "| Setting | Value |", "|---|---|",
          "| Audience | No, it's not made for kids |",
          "| Altered or synthetic content | " + kit.get("synthetic", "**Yes**: the voice is synthetic" ) + " |",
          "| Category | Education |", "| Captions | Upload `captions.srt` (English) |",
          "| Licence | Standard YouTube Licence |"]
if kit.get("short"):
    lines += ["| Related video | Link the matching long video (Shorts 'Related video' field) |"]
else:
    lines += ["| Chapters | From the description timestamps |", "| End screen (last 20 s) | Subscribe + the matching Short's long companion / best-for-viewer |"]
lines += ["", "## Pinned comment", "", "```", kit.get("pinned", ""), "```", ""]
if kit.get("notes"):
    lines += ["## Before you publish", ""] + [f"{i}. {n}" for i, n in enumerate(kit["notes"], 1)] + [""]
lines += ["## What to measure (format test)", "",
          ("- Viewed vs swiped away ≥ 75% · average percentage viewed ≥ 100% (loops) · shares per 1,000 views ≥ 10" if kit.get("short")
           else "- Still watching at 0:30 ≥ 75% · average percentage viewed ≥ 50% · returning viewers ≥ 20% · shares per 1,000 views ≥ 5"), ""]
(vdir / "UPLOAD_KIT.md").write_text("\n".join(lines))
print("wrote", vdir / "UPLOAD_KIT.md", ts(dur), len(chapters), "chapters")
