#!/usr/bin/env python3
"""Print every edit as a readable script (Markdown): python3 make_scripts.py > SCRIPTS.md"""
import glob, json, os, re
TX = os.environ.get("TX_DIR", ".")
def fmt(t): return f"{int(t // 60)}:{t % 60:04.1f}"
print("# Scripts\n\nGenerated from `edits/*.json`. **VO** = narrator (AI voice), **CLIP** = original audio from the source video.\n")
for p in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), "edits", "*.json"))):
    e = json.load(open(p)); name = os.path.splitext(os.path.basename(p))[0]
    tx = json.load(open(os.path.join(TX, e["source"] + ".json")))
    words = [w for s in tx for w in s["words"]]
    print(f"## {name}\n\n**Title:** {e['title']}  \n**Source:** https://youtu.be/{e['source']} ({e.get('credit', '')})\n")
    for i, b in enumerate(e["beats"]):
        if b["type"] == "vo":
            print(f"- **VO:** {b['text'].replace('*', '**')}")
        elif b["type"] == "clip":
            txt = b.get("text") or " ".join(w["w"] for w in words if b["in"] - 0.05 <= w["s"] <= b["out"])
            caps = " ".join(m[2] for m in b.get("manual_caps", []))
            label = "COLD OPEN" if i == 0 else "CLIP"
            body = (txt if b.get("captions", True) else caps) or "(reaction, no dialogue)"
            if b.get("mute"): body = "(muted reaction shot)"
            print(f"- **{label}** `{fmt(b['in'])}–{fmt(b['out'])}`: \"{body.replace('*', '**')}\"")
    print()
