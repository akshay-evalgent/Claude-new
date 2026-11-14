"""Parse script.txt into build/script.json (spoken lines + per-shot visuals).

Format, one phrase (= one shot) per line:
    text ~pause >> scene {json options} camera
A leading "+" keeps the phrase in the same spoken breath as the previous one.
"~0.3" adds a pause after the phrase (and ends the breath there).
No ">>" reuses the previous scene and options with the "auto" camera.
"= name mood" starts a chapter.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SETTINGS = {"voice": "am_fenrir", "speed": 0.87, "lead_in": 0.3, "gap": 0.16, "tail": 3.0}


def parse(path):
    lines, visuals, chapters = [], {}, []
    prev = None
    chapter = ("intro", "open")
    group = None
    n = 0
    for raw in open(path, encoding="utf-8"):
        s = raw.rstrip("\n")
        if not s.strip() or s.lstrip().startswith("#"):
            continue
        if s.startswith("="):
            name, mood = (s[1:].split() + ["open"])[:2]
            chapter = (name, mood)
            group = None
            continue
        cont = s.startswith("+")
        s = s.lstrip("+").strip()
        text, _, vis = s.partition(">>")
        pause = 0.0
        m = re.search(r"~([\d.]+)\s*$", text.strip())
        if m:
            pause = float(m.group(1)); text = text.strip()[: m.start()]
        text = text.strip()
        n += 1
        sid = f"s{n:03d}"
        if vis.strip():
            vm = re.match(r"\s*(\w+)\s*(\{.*\})?\s*(\[.*\]|\w+)?\s*$", vis)
            if not vm:
                sys.exit(f"bad visual spec on line: {raw}")
            scene = vm.group(1)
            opts = json.loads(vm.group(2)) if vm.group(2) else {}
            cam = vm.group(3) or "push"
            cam = json.loads(cam) if cam.startswith("[") else cam
            prev = (scene, opts)
        else:
            if prev is None:
                sys.exit(f"first shot needs a scene: {raw}")
            scene, opts = prev
            cam = "auto"
        visuals[sid] = {"scene": scene, "opts": opts, "cam": cam, "chapter": chapter[0], "mood": chapter[1]}
        if not chapters or chapters[-1]["name"] != chapter[0]:
            chapters.append({"name": chapter[0], "mood": chapter[1], "first": sid})
        if cont and group is not None:
            group["phrases"].append([sid, text])
        else:
            group = {"phrases": [[sid, text]]}
            lines.append(group)
        if pause:
            group["pause"] = pause
            group = None
    return lines, visuals, chapters


if __name__ == "__main__":
    lines, visuals, chapters = parse(os.path.join(HERE, "script.txt"))
    os.makedirs(os.path.join(HERE, "build"), exist_ok=True)
    out = dict(SETTINGS, lines=lines, visuals=visuals, chapters=chapters)
    json.dump(out, open(os.path.join(HERE, "build", "script.json"), "w"), indent=1, ensure_ascii=False)
    words = sum(len(re.findall(r"[A-Za-z0-9']+", p[1])) for L in lines for p in L["phrases"])
    scenes = sorted({v["scene"] for v in visuals.values()})
    print(f"{len(visuals)} shots, {len(lines)} spoken lines, {words} words, {len(chapters)} chapters, {len(scenes)} scenes")
