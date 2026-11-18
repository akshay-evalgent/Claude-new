"""Subtitles (SRT) from the narrator's phrase timings and the film timeline.

usage: python make_subtitles.py SHOTS_JSON TIMING_JSON OUT_SRT
Cues are at most two lines of 42 characters, split at sentence or clause ends,
timed by each phrase's share of characters within the recorded audio.
"""
import json, re, sys

shots = json.load(open(sys.argv[1])); timing = json.load(open(sys.argv[2]))["shots"]
MAX = 84

def split(text):
    parts, cur = [], ""
    for piece in re.split(r"(?<=[.?!])\s+", text):
        if len(piece) > MAX:
            for sub in re.split(r"(?<=[,;:])\s+", piece):
                while len(sub) > MAX:
                    cut = sub.rfind(" ", 0, MAX); parts.append(sub[:cut]); sub = sub[cut + 1:]
                parts.append(sub)
        else:
            parts.append(piece)
    out = []
    for p in parts:
        if cur and len(cur) + 1 + len(p) <= MAX: cur += " " + p
        else:
            if cur: out.append(cur)
            cur = p
    if cur: out.append(cur)
    return out

def lines(c):
    if len(c) <= 42: return c
    mid = len(c) // 2; cut = min((i for i, ch in enumerate(c) if ch == " "), key=lambda i: abs(i - mid))
    return c[:cut] + "\n" + c[cut + 1:]

def ts(t):
    h, r = divmod(t, 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)) % 1000:03d}"

cues = []
for s in shots:
    if s["id"] not in timing: continue
    base = s["start"] + 0.08
    for a, b, text in timing[s["id"]]["segments"]:
        chunks = split(text.strip())
        total = sum(len(c) for c in chunks) or 1; t = a
        for c in chunks:
            d = (b - a) * len(c) / total
            cues.append((base + t, base + t + d, c)); t += d
with open(sys.argv[3], "w", encoding="utf-8") as f:
    for i, (a, b, c) in enumerate(cues, 1):
        f.write(f"{i}\n{ts(a)} --> {ts(max(b, a + 0.8))}\n{lines(c)}\n\n")
print(len(cues), "cues")
