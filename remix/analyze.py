#!/usr/bin/env python3
"""Analyse source clips so a new story can be cut from them.

For every source it writes WORK/<name>/:
  analysis.json   probe info, shots (scene cuts), lines (sentences with word timings)
  audio.wav       48 kHz stereo audio used by the renderer
  stills/         one frame per shot and one per spoken line
  shots-NN.jpg    contact sheets: every shot with its time and what is said in it
  lines-NN.jpg    dialogue sheets: the frame under every line, with the line
and WORK/bank.txt, a plain-text index of every line and every silent shot across
all sources. bank.txt plus the sheets are what you read to write a new story.

usage:
  analyze.py WORK name=path [name=path ...] [--model medium.en] [--names 'A, B'] [--force]
example:
  analyze.py work sintel=sources/sintel.mkv tos=sources/tears_of_steel.mov
"""
import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from remixlib import font_path, probe, run, tc  # noqa: E402

from PIL import Image, ImageDraw, ImageFont  # noqa: E402


def extract_audio(src, out, sr=48000, ch=2):
    run(["ffmpeg", "-y", "-v", "error", "-i", src, "-map", "0:a:0", "-ac", str(ch), "-ar", str(sr),
         "-c:a", "pcm_s16le", out])


def detect_shots(src, duration, sensitivity):
    """Hard cuts from frame-difference spikes measured against the local motion level.

    A fixed threshold misses cuts in dark or low-contrast scenes; comparing each
    frame difference with the median of its neighbours catches them while
    ignoring steady camera moves.
    """
    import subprocess

    import numpy as np

    w, h = 96, 54
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-map", "0:v:0", "-vf",
                          f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    diffs, times, prev, fps_n = [], [], None, 0
    meta_fps = probe(src)["fps"]
    while True:
        buf = p.stdout.read(w * h)
        if len(buf) < w * h:
            break
        f = np.frombuffer(buf, dtype=np.uint8).astype(np.int16)
        if prev is not None:
            diffs.append(float(np.mean(np.abs(f - prev))))
            times.append(fps_n / meta_fps)
        prev = f
        fps_n += 1
    p.wait()
    d = np.array(diffs)
    cuts = []
    k = 12
    for i in range(len(d)):
        lo, hi = max(0, i - k), min(len(d), i + k + 1)
        around = np.concatenate([d[lo:i], d[i + 1:hi]])
        med = float(np.median(around)) if len(around) else 0.0
        if (d[i] > sensitivity * (med + 0.6) and d[i] > 5.0) or d[i] > 40:
            # keep only the local peak
            if d[i] >= d[max(0, i - 3):i + 4].max():
                cuts.append(times[i])
    edges = [0.0]
    for c in cuts:
        if c - edges[-1] >= 0.3 and duration - c >= 0.3:
            edges.append(c)
    edges.append(duration)
    return [{"id": i + 1, "s": round(a, 3), "e": round(b, 3), "dur": round(b - a, 3)}
            for i, (a, b) in enumerate(zip(edges[:-1], edges[1:]))]


def transcribe(wav16, model_name, language, vad, hotwords):
    import wave

    import numpy as np
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    # no voice-activity filter by default: it drops soft lines under music
    kw = dict(word_timestamps=True, beam_size=5, condition_on_previous_text=False,
              hallucination_silence_threshold=2.0)
    if vad:
        kw["vad_filter"] = True
        kw["vad_parameters"] = {"threshold": vad, "min_silence_duration_ms": 300, "speech_pad_ms": 300}
    if language:
        kw["language"] = language
    if hotwords:
        kw["hotwords"] = hotwords
    # decode the 16 kHz mono wav ourselves: avoids faster-whisper's PyAV dependency quirks
    with wave.open(wav16, "rb") as wf:
        audio = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    segs, info = model.transcribe(audio, **kw)
    out, last_e = [], -1.0
    for seg in segs:
        # drop what whisper itself thinks is not speech (typical hallucination over music)
        if seg.no_speech_prob > 0.6 and seg.avg_logprob < -0.8:
            continue
        ws = []
        for w in seg.words or []:
            txt = w.word.strip()
            if not txt or w.start < last_e - 0.1:  # skip words repeated across window seams
                continue
            ws.append({"w": txt, "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)})
            last_e = w.end
        if ws and sum(x["p"] for x in ws) / len(ws) >= 0.3:
            out.append(ws)
    return out, info.language


def split_lines(segments, gap=0.7):
    """Lines = sentences inside whisper segments: break after . ? ! and at pauses >= gap s."""
    groups = []
    for ws in segments:
        cur = []
        for w in ws:
            if cur and w["s"] - cur[-1]["e"] >= gap:
                groups.append(cur)
                cur = []
            cur.append(w)
            if re.search(r"[.?!…]['\"]?$", w["w"]):
                groups.append(cur)
                cur = []
        if cur:
            groups.append(cur)
    out = []
    for i, ws in enumerate(groups):
        text = " ".join(w["w"] for w in ws)
        conf = sum(w["p"] for w in ws) / len(ws)
        out.append({"id": i + 1, "s": ws[0]["s"], "e": ws[-1]["e"], "text": text,
                    "conf": round(conf, 2), "words": ws})
    return out


def attach_shots(lines, shots):
    for ln in lines:
        ln["shots"] = [sh["id"] for sh in shots if sh["s"] < ln["e"] and sh["e"] > ln["s"]]
    for sh in shots:
        spoken = [ln for ln in lines if ln["s"] < sh["e"] and ln["e"] > sh["s"]]
        sh["lines"] = [ln["id"] for ln in spoken]
        talk = sum(max(0.0, min(ln["e"], sh["e"]) - max(ln["s"], sh["s"])) for ln in spoken)
        sh["talk"] = round(talk / sh["dur"], 2) if sh["dur"] else 0.0


def grab(src, t, out, width=320):
    if os.path.exists(out):
        return
    run(["ffmpeg", "-y", "-v", "error", "-ss", f"{max(0.0, t):.3f}", "-i", src, "-frames:v", "1",
         "-vf", f"scale={width}:-2", "-q:v", "4", out])


def wrap(draw, text, font, width, max_lines):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
        if len(lines) == max_lines:
            break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    if len(lines) == max_lines and " ".join(lines) != " ".join(words):
        lines[-1] = lines[-1].rstrip(".,") + "…"
    return lines


def sheet(cells, out_prefix, title, cols=5, rows=7, cell_w=300, text_lines=3):
    """cells: [(image_path, header, body)] -> out_prefix-01.jpg ..."""
    fp = font_path()
    f_head = ImageFont.truetype(fp, 15) if fp else ImageFont.load_default()
    f_body = ImageFont.truetype(fp, 14) if fp else ImageFont.load_default()
    f_title = ImageFont.truetype(fp, 20) if fp else ImageFont.load_default()
    if not cells:
        return []
    with Image.open(cells[0][0]) as im0:
        th = int(cell_w * im0.height / im0.width)
    pad, line_h = 10, 18
    cell_h = th + 22 + text_lines * line_h + 8
    per = cols * rows
    paths = []
    for page in range(0, len(cells), per):
        chunk = cells[page:page + per]
        nrows = (len(chunk) + cols - 1) // cols
        W = cols * (cell_w + pad) + pad
        H = 40 + nrows * (cell_h + pad) + pad
        img = Image.new("RGB", (W, H), (18, 18, 20))
        d = ImageDraw.Draw(img)
        d.text((pad, 10), f"{title}   ({page // per + 1}/{(len(cells) + per - 1) // per})",
               fill=(235, 235, 235), font=f_title)
        for k, (ip, head, body) in enumerate(chunk):
            x = pad + (k % cols) * (cell_w + pad)
            y = 40 + (k // cols) * (cell_h + pad)
            try:
                with Image.open(ip) as im:
                    img.paste(im.convert("RGB").resize((cell_w, th)), (x, y))
            except OSError:
                d.rectangle([x, y, x + cell_w, y + th], fill=(60, 0, 0))
            d.text((x, y + th + 3), head, fill=(255, 200, 90), font=f_head)
            for j, ln in enumerate(wrap(d, body, f_body, cell_w, text_lines)):
                d.text((x, y + th + 22 + j * line_h), ln, fill=(220, 220, 220), font=f_body)
        p = f"{out_prefix}-{page // per + 1:02d}.jpg"
        img.save(p, quality=85)
        paths.append(p)
    return paths


def write_bank(work):
    from remixlib import load_work

    srcs = load_work(work)
    out = ["# LINE BANK — every spoken line and every silent shot, all sources",
           "# line ref = source:L<id>   shot ref = source:S<id>   times are source seconds",
           "# '?' marks a line whisper was unsure of (avg word prob < 0.6)", ""]
    for name, a in srcs.items():
        m = a["meta"]
        out.append(f"## {name}  —  {tc(m['duration'])}  {m['width']}x{m['height']} @{m['fps']}  "
                   f"{len(a['lines'])} lines, {len(a['shots'])} shots")
        for ln in a["lines"]:
            flag = "?" if ln["conf"] < 0.6 else " "
            shots = ",".join(f"S{s}" for s in ln["shots"][:3])
            out.append(f"{name}:L{ln['id']:03d}{flag} {tc(ln['s'])}–{tc(ln['e'])}  [{shots}]  {ln['text']}")
        out.append("")
        out.append(f"### {name} silent shots >= 1.0 s (reaction / cutaway / establishing candidates)")
        for sh in a["shots"]:
            if sh["talk"] < 0.15 and sh["dur"] >= 1.0:
                out.append(f"{name}:S{sh['id']:03d}  {tc(sh['s'])}–{tc(sh['e'])}  {sh['dur']:.1f}s")
        out.append("")
    with open(os.path.join(work, "bank.txt"), "w") as f:
        f.write("\n".join(out) + "\n")


def analyse(name, path, work, args):
    d = os.path.join(work, name)
    os.makedirs(os.path.join(d, "stills"), exist_ok=True)
    jp = os.path.join(d, "analysis.json")
    if os.path.exists(jp) and not args.force:
        print(f"[{name}] already analysed (use --force to redo)")
        return
    t0 = time.time()
    meta = probe(path)
    print(f"[{name}] {meta['width']}x{meta['height']} @{meta['fps']} {tc(meta['duration'])}")

    wav = os.path.join(d, "audio.wav")
    words, lang = [], None
    if meta["has_audio"]:
        extract_audio(path, wav)
        wav16 = os.path.join(d, "audio16.wav")
        extract_audio(path, wav16, sr=16000, ch=1)
        print(f"[{name}] transcribing with {args.model} ...")
        words, lang = transcribe(wav16, args.model, args.language, args.vad, args.names)
        os.remove(wav16)
    lines = split_lines(words)
    print(f"[{name}] {sum(len(x) for x in words)} words, {len(lines)} lines")

    shots = detect_shots(path, meta["duration"], args.cut)
    attach_shots(lines, shots)
    print(f"[{name}] {len(shots)} shots")

    jobs = []
    for sh in shots:
        sh["still"] = f"stills/S{sh['id']:03d}.jpg"
        jobs.append((sh["s"] + sh["dur"] / 2, os.path.join(d, sh["still"])))
    for ln in lines:
        ln["still"] = f"stills/L{ln['id']:03d}.jpg"
        jobs.append(((ln["s"] + ln["e"]) / 2, os.path.join(d, ln["still"])))
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(lambda j: grab(path, j[0], j[1]), jobs))

    with open(jp, "w") as f:
        json.dump({"name": name, "meta": meta, "language": lang, "shots": shots, "lines": lines}, f, indent=1)

    by_id = {ln["id"]: ln for ln in lines}
    cells = []
    for sh in shots:
        said = " / ".join(by_id[i]["text"] for i in sh["lines"]) or "— no dialogue —"
        cells.append((os.path.join(d, sh["still"]), f"S{sh['id']:03d}  {tc(sh['s'])}  {sh['dur']:.1f}s", said))
    sheet(cells, os.path.join(d, "shots"), f"{name} — shots")
    cells = [(os.path.join(d, ln["still"]), f"L{ln['id']:03d}  {tc(ln['s'])}–{tc(ln['e'])}", ln["text"])
             for ln in lines]
    sheet(cells, os.path.join(d, "lines"), f"{name} — dialogue")
    print(f"[{name}] done in {time.time() - t0:.0f}s -> {d}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("work")
    ap.add_argument("sources", nargs="+", help="name=path")
    ap.add_argument("--model", default="medium.en", help="faster-whisper model (small.en, medium.en, large-v3 ...)")
    ap.add_argument("--language", default=None, help="force language code, e.g. en, hi")
    ap.add_argument("--cut", type=float, default=3.0,
                    help="cut sensitivity: a frame change this many times the local level is a cut (lower = more cuts)")
    ap.add_argument("--vad", type=float, default=0,
                    help="voice-detector threshold 0..1; off by default because it drops soft lines "
                         "under music. Try 0.3 for long videos that are mostly silence")
    ap.add_argument("--names", default=None,
                    help="character names / unusual words to help the transcript, e.g. 'Sintel, Scales, Thom'")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    if args.model.endswith(".en") and not args.language:
        args.language = "en"
    os.makedirs(args.work, exist_ok=True)
    for spec in args.sources:
        if "=" not in spec:
            ap.error(f"expected name=path, got {spec!r}")
        name, path = spec.split("=", 1)
        if not re.fullmatch(r"[A-Za-z0-9_-]+", name):
            ap.error(f"source name {name!r}: use letters, digits, _ or -")
        analyse(name, path, args.work, args)
    write_bank(args.work)
    print(f"bank -> {os.path.join(args.work, 'bank.txt')}")


if __name__ == "__main__":
    main()
