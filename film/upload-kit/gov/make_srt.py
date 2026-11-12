"""Build captions_en.srt from the narration's word timings (film/fridge-full/build/timeline.json)."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(os.path.join(HERE, "../../gov-full/build/timeline.json")))
words = []
for s in tl["shots"]:
    for w in s["words"]:
        t0, t1 = s["vs"] + w["s"], s["vs"] + w["e"]
        txt = w["w"]
        if re.fullmatch(r"[^\w']+", txt) and words:
            words[-1][0] += txt; words[-1][2] = max(words[-1][2], t1); continue
        words.append([txt, t0, t1, s["chapter"]])
cues, cur = [], []
def flush():
    if cur: cues.append(list(cur)); cur.clear()
for i, w in enumerate(words):
    if cur:
        text = " ".join(x[0] for x in cur)
        gap = w[1] - cur[-1][2]
        if len(text) + len(w[0]) > 80 or w[2] - cur[0][1] > 6.0 or gap > 0.7 or w[3] != cur[-1][3] or (re.search(r"[.?!]$", cur[-1][0]) and (len(text) >= 18 or gap > 0.3)):
            flush()
    cur.append(w)
flush()
def ts(t):
    t = max(0, t); h, r = divmod(t, 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)) % 1000:03d}"
out = []
for i, c in enumerate(cues):
    text = " ".join(x[0] for x in c)
    if len(text) > 42:
        mid = len(text) // 2; cut = min((abs(m.start() - mid), m.start()) for m in re.finditer(" ", text))[1]
        text = text[:cut] + "\n" + text[cut + 1:]
    start, end = c[0][1], c[-1][2] + 0.25
    nxt = cues[i + 1][0][1] if i + 1 < len(cues) else end + 1
    end = min(max(end, start + 0.9), nxt - 0.02)
    out.append(f"{i + 1}\n{ts(start)} --> {ts(end)}\n{text}\n")
open(os.path.join(HERE, "captions_en.srt"), "w", encoding="utf-8").write("\n".join(out))
lens = [len(" ".join(x[0] for x in c)) for c in cues]
print(f"{len(cues)} cues, {len(words)} words, longest cue {max(lens)} chars, ends {ts(cues[-1][-1][2])}")
