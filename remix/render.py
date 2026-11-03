#!/usr/bin/env python3
"""Render a remix (a new story cut from several source films) from an edit list.

usage:
  render.py EDIT.yaml [--out FILE.mp4] [--draft] [--verify] [--no-burn] [--from N --to M]

The edit list (YAML or JSON) is a timeline of clips. Each clip is picture from one
source plus its own sync sound, optionally with a voice laid over it from any
source. Cut points can be given as times or, better, as transcript references
(`line:` / `say:`), which are padded, kept clear of neighbouring words and
snapped to the quietest moment so a cut never clips a syllable.
See remix/README.md for every field.

Outputs next to FILE.mp4: FILE.srt (captions), FILE-review.jpg (one frame per
clip, for checking eyelines and flow), FILE-edl.txt (timeline in plain text).
--verify re-transcribes the finished audio and flags clips whose words came out
wrong (clipped syllables, a neighbour word leaking in).
"""
import argparse
import difflib
import hashlib
import json
import math
import os
import re
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from remixlib import Wav, all_words, font_path, load_work, parse_time, probe, run, tc  # noqa: E402

VERSION = 3  # bump to invalidate cached segments


# ----------------------------------------------------------------------------- loading

def load_edl(path):
    with open(path) as f:
        txt = f.read()
    if path.endswith((".yaml", ".yml")):
        import yaml

        return yaml.safe_load(txt)
    return json.loads(txt)


def norm_tokens(text):
    return [t for t in re.sub(r"[^a-z0-9' ]+", " ", text.lower().replace("’", "'")).split() if t]


class Sources:
    def __init__(self, edl, base, cache):
        self.base, self.cache = base, cache
        work = edl.get("work")
        self.work = os.path.normpath(os.path.join(base, work)) if work else None
        self.an = load_work(self.work) if self.work else {}
        self.paths = {}
        for name, p in (edl.get("sources") or {}).items():
            p = p["path"] if isinstance(p, dict) else p
            self.paths[name] = os.path.normpath(os.path.join(base, p))
        for name, a in self.an.items():
            self.paths.setdefault(name, a["meta"]["path"])
        self.grades = {n: (g.get("grade") if isinstance(g, dict) else None)
                       for n, g in (edl.get("sources") or {}).items()}
        self._meta, self._wav, self._words = {}, {}, {}

    def path(self, name):
        if name not in self.paths:
            sys.exit(f"unknown source {name!r}. Known: {', '.join(sorted(self.paths))}")
        return self.paths[name]

    def meta(self, name):
        if name not in self._meta:
            self._meta[name] = self.an[name]["meta"] if name in self.an else probe(self.path(name))
            self._meta[name] = {**self._meta[name], "path": self.path(name)}
        return self._meta[name]

    def wav_path(self, name):
        if name in self.an and os.path.exists(os.path.join(self.an[name]["dir"], "audio.wav")):
            return os.path.join(self.an[name]["dir"], "audio.wav")
        p = os.path.join(self.cache, f"audio-{name}.wav")
        if not os.path.exists(p):
            run(["ffmpeg", "-y", "-v", "error", "-i", self.path(name), "-map", "0:a:0", "-ac", "2",
                 "-ar", "48000", "-c:a", "pcm_s16le", p])
        return p

    def wav(self, name):
        if name not in self._wav:
            self._wav[name] = Wav(self.wav_path(name))
        return self._wav[name]

    def words(self, name):
        if name not in self._words:
            if name not in self.an:
                sys.exit(f"source {name!r} has no transcript; run analyze.py on it to use line:/say:")
            self._words[name] = all_words(self.an[name])
        return self._words[name]


# ----------------------------------------------------------------------------- resolving cuts

def speech_span(S, name, spec, where):
    """Resolve line:/say: on a source -> (first word idx, last word idx) in the flat word list."""
    ws = S.words(name)
    if "line" in spec:
        ref = str(spec["line"])
        if ":" in ref:
            ref = ref.split(":", 1)[1]
        lid = int(ref.lstrip("Ll"))
        idx = [k for k, w in enumerate(ws) if w["line"] == lid]
        if not idx:
            sys.exit(f"{where}: {name} has no line L{lid:03d}")
        a, b = idx[0], idx[-1]
        if "words" in spec:
            wa, wb = spec["words"]
            wb = len(idx) - 1 if wb in (-1, None) else wb
            a, b = idx[0] + wa, idx[0] + wb
        return a, b
    if "say" in spec:
        target = norm_tokens(spec["say"])
        toks = [norm_tokens(w["w"]) for w in ws]
        flat = [(k, t) for k, ts in enumerate(toks) for t in ts]
        hits = []
        for j in range(len(flat) - len(target) + 1):
            if [t for _, t in flat[j:j + len(target)]] == target:
                hits.append((flat[j][0], flat[j + len(target) - 1][0]))
        if not hits:
            close = difflib.get_close_matches(spec["say"].lower(), [ln["text"].lower() for ln in S.an[name]["lines"]], 3, 0.4)
            sys.exit(f"{where}: phrase {spec['say']!r} not found in {name}. Closest lines: {close}")
        if len(hits) > 1:
            near = parse_time(spec["near"]) if "near" in spec else None
            if near is None:
                print(f"  note {where}: {spec['say']!r} occurs {len(hits)}x in {name}; using the first "
                      f"(add near: <time> to choose): " + ", ".join(tc(ws[h[0]]['s']) for h in hits))
            else:
                hits.sort(key=lambda h: abs(ws[h[0]]["s"] - near))
        return hits[0]
    return None


def speech_cut(S, name, spec, defaults, where):
    """-> dict(cin, cout, lim_in, lim_out, words=(a, b)) in source seconds, or None."""
    span = speech_span(S, name, spec, where)
    if span is None:
        return None
    ws = S.words(name)
    a, b = span
    first, last = ws[a], ws[b]
    prev = ws[a - 1] if a > 0 else None
    nxt = ws[b + 1] if b + 1 < len(ws) else None
    pad = defaults.get("pad", [0.12, 0.25])
    pre = float(spec.get("pre", pad[0]))
    post = float(spec.get("post", pad[1]))
    lim_in = (prev["e"] + first["s"]) / 2 if prev else -1e9
    lim_out = (last["e"] + nxt["s"]) / 2 if nxt else 1e9
    cin, cout = first["s"] - pre, last["e"] + post
    snap = spec.get("snap", defaults.get("snap", True))
    if snap:
        wav = S.wav(name)
        lo, hi = max(cin - 0.1, lim_in), min(cin + 0.1, first["s"] - 0.01)
        if hi > lo:
            cin = wav.quietest(cin, lo, hi)
        lo, hi = max(cout - 0.1, last["e"] + 0.02), min(cout + 0.1, lim_out)
        if hi > lo:
            cout = wav.quietest(cout, lo, hi)
    # a pad may reach into the neighbouring word for the picture, never for the sound
    if spec.get("keep_neighbors", False):
        lim_in, lim_out = -1e9, 1e9
    return {"cin": max(0.0, cin), "cout": cout, "lim_in": lim_in, "lim_out": lim_out,
            "speech": (first["s"], last["e"]), "words": (a, b)}


def resolve(edl, S):
    fps = float(edl["output"].get("fps", 24))
    defaults = edl.get("defaults") or {}
    clips = []
    for i, e in enumerate(edl["timeline"]):
        where = f"clip #{i + 1}"
        if isinstance(e, str):
            e = {"card": e}
        if "card" in e:
            dur = float(e.get("dur", 2.0))
            clips.append({"kind": "card", "i": i, "e": e, "text": e["card"], "n": max(1, round(dur * fps)),
                          "split": 0.0})
            continue
        src = e.get("src")
        if not src and isinstance(e.get("line"), str) and ":" in e["line"]:
            src = e["line"].split(":", 1)[0]
        if not src:
            sys.exit(f"{where}: needs src")
        sc = speech_cut(S, src, e, defaults, where)
        voice = None
        if e.get("voice"):
            v = e["voice"]
            vsrc = v.get("src") or (v["line"].split(":", 1)[0] if isinstance(v.get("line"), str) and ":" in v["line"] else None)
            if not vsrc:
                sys.exit(f"{where}: voice needs src")
            vc = speech_cut(S, vsrc, v, defaults, where + " voice")
            if vc is None:
                vc = {"cin": parse_time(v["in"]), "cout": parse_time(v["out"]), "lim_in": -1e9, "lim_out": 1e9}
            voice = {"src": vsrc, **vc, "at": float(v.get("at", 0.0)), "gain": float(v.get("gain", 0.0)),
                     "caption": v.get("caption", True), "spec": v}
        if "in" in e:
            cin = parse_time(e["in"])
        elif sc:
            cin = sc["cin"]
        else:
            sys.exit(f"{where}: needs in: (or line:/say:)")
        if "out" in e:
            cout = parse_time(e["out"])
        elif "dur" in e:
            cout = cin + float(e["dur"])
        elif sc:
            cout = sc["cout"]
        elif voice:
            cout = cin + voice["at"] + (voice["cout"] - voice["cin"]) + float(e.get("tail", 0.0))
        else:
            sys.exit(f"{where}: needs out: or dur: (or line:/say:/voice:)")
        meta = S.meta(src)
        cout = min(cout, meta["duration"] - 1.0 / fps)
        if cout <= cin:
            sys.exit(f"{where}: out ({cout:.2f}) must be after in ({cin:.2f})")
        hold = float(e.get("hold", 0.0))
        n_move = max(1, round((cout - cin) * fps))
        n_hold = round(hold * fps)
        audio = e.get("audio", "mute" if voice else "keep")
        clips.append({"kind": "clip", "i": i, "e": e, "src": src, "cin": cin, "n_move": n_move, "n": n_move + n_hold,
                      "sc": sc, "voice": voice, "audio": audio, "split": float(e.get("split", 0.0))})
    # timeline positions (frame exact)
    t = 0
    for c in clips:
        c["B"] = t / fps
        t += c["n"]
        c["D"] = c["n"] / fps
    total = t / fps
    for k, c in enumerate(clips):
        nxt_split = clips[k + 1]["split"] if k + 1 < len(clips) else 0.0
        c["AB0"] = c["B"] - c["split"]
        c["AB1"] = c["B"] + c["D"] - nxt_split
    return clips, total


# ----------------------------------------------------------------------------- picture

def geometry(edl, draft):
    out = edl["output"]
    W, H = out.get("size", [1280, 720])
    if draft:
        W, H = W // 2 // 2 * 2, H // 2 // 2 * 2
    pic = out.get("picture", "fill")
    if pic in (None, "fill"):
        BW, BH = W, H
    else:
        ar = float(pic)
        BW, BH = W, int(round(W / ar / 2)) * 2
        if BH > H:
            BW, BH = int(round(H * ar / 2)) * 2, H
    return W, H, BW, BH


def even(x):
    return max(2, int(math.ceil(x / 2.0)) * 2)


def eq_filter(g):
    if not g:
        return None
    parts = [f"{k}={float(g[k]):.4f}" for k in ("contrast", "brightness", "saturation", "gamma") if k in g]
    return "eq=" + ":".join(parts) if parts else None


def video_chain(edl, S, c, geo):
    W, H, BW, BH = geo
    e = c["e"]
    fps = float(edl["output"].get("fps", 24))
    m = S.meta(c["src"])
    sw, sh = m["width"], m["height"]
    fit = e.get("fit", edl["output"].get("fit", "crop"))
    z = float(e.get("zoom", 1.0))
    fx, fy = float(e.get("focus", 0.5)), float(e.get("focus_y", 0.5))
    pre = [f"fps={fps}", f"trim=end_frame={c['n_move']}", "setpts=PTS-STARTPTS"]
    if e.get("flip"):
        pre.append("hflip")
    grade = [g for g in (eq_filter(S.grades.get(c["src"])), eq_filter(e.get("grade")),
                         eq_filter(edl["output"].get("look"))) if g]
    post = []
    if (W, H) != (BW, BH):
        post.append(f"pad={W}:{H}:{(W - BW) // 2}:{(H - BH) // 2}:black")
    if c["n"] > c["n_move"]:
        post.append(f"tpad=stop_mode=clone:stop={c['n'] - c['n_move']}")
    dur = c["n"] / fps
    if e.get("fade_in"):
        post.append(f"fade=t=in:st=0:d={float(e['fade_in']):.3f}")
    if e.get("fade_out"):
        f = float(e["fade_out"])
        post.append(f"fade=t=out:st={max(0.0, dur - f):.3f}:d={f:.3f}")
    post += ["setsar=1", "format=yuv420p"]

    def cover(zoom):
        s = max(BW / sw, BH / sh) * zoom
        cw, ch = even(sw * s), even(sh * s)
        x, y = int(round((cw - BW) * fx)), int(round((ch - BH) * fy))
        return f"scale={cw}:{ch}:flags=lanczos,crop={BW}:{BH}:{x}:{y}"

    def contain():
        s = min(BW / sw, BH / sh) * z
        cw, ch = min(even(sw * s), BW), min(even(sh * s), BH)
        return f"scale={cw}:{ch}:flags=lanczos"

    if fit == "crop":
        g = ",".join(pre + [cover(z)] + grade + post)
        return f"[0:v]{g}[v]"
    if fit == "pad":
        g = ",".join(pre + [contain(), f"pad={BW}:{BH}:(ow-iw)/2:(oh-ih)/2:black"] + grade + post)
        return f"[0:v]{g}[v]"
    if fit == "blur":
        return (f"[0:v]{','.join(pre + grade)},split[a][b];"
                f"[a]{cover(1.0)},boxblur=24:2,eq=brightness=-0.10:saturation=0.8[bg];"
                f"[b]{contain()}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,{','.join(post)}[v]")
    sys.exit(f"clip #{c['i'] + 1}: fit must be crop, pad or blur")


def card_png(text, W, H, path, style):
    from PIL import Image, ImageDraw, ImageFont

    fp = font_path()
    size = int(H * float(style.get("size", 0.055)))
    f = ImageFont.truetype(fp, size) if fp else ImageFont.load_default()
    img = Image.new("RGB", (W, H), tuple(style.get("bg", [0, 0, 0])))
    d = ImageDraw.Draw(img)
    lines = str(text).split("\n")
    lh = int(size * 1.35)
    y = (H - lh * len(lines)) // 2
    for ln in lines:
        small = ln.startswith("~")
        ln = ln.lstrip("~").strip()
        ff = ImageFont.truetype(fp, int(size * 0.6)) if (small and fp) else f
        w = d.textlength(ln, font=ff)
        d.text(((W - w) / 2, y), ln, fill=tuple(style.get("color", [235, 235, 235])), font=ff)
        y += lh if not small else int(lh * 0.75)
    img.save(path)


def render_segment(edl, S, c, geo, cache, draft):
    fps = float(edl["output"].get("fps", 24))
    W, H = geo[0], geo[1]
    key = {"v": VERSION, "geo": geo, "fps": fps, "draft": draft, "look": edl["output"].get("look"),
           "fit": edl["output"].get("fit", "crop")}
    if c["kind"] == "card":
        e = c["e"]
        key.update({"card": c["text"], "n": c["n"], "style": e.get("style"), "fi": e.get("fade_in"),
                    "fo": e.get("fade_out")})
    else:
        ek = {k: v for k, v in c["e"].items() if k in ("flip", "zoom", "focus", "focus_y", "fit", "grade",
                                                         "fade_in", "fade_out", "hold")}
        m = S.meta(c["src"])
        key.update({"src": m["path"], "mtime": os.path.getmtime(m["path"]), "cin": round(c["cin"], 4),
                    "n": c["n"], "nm": c["n_move"], "e": ek, "sg": S.grades.get(c["src"])})
    h = hashlib.sha1(json.dumps(key, sort_keys=True, default=str).encode()).hexdigest()[:16]
    out = os.path.join(cache, f"seg-{h}.mp4")
    if os.path.exists(out):
        return out
    enc = ["-c:v", "libx264", "-preset", "ultrafast" if draft else "veryfast", "-crf", "20" if draft else "12",
           "-pix_fmt", "yuv420p", "-r", str(fps), "-video_track_timescale", str(int(round(fps)) * 1000)]
    tmp = out + ".part.mp4"
    if c["kind"] == "card":
        e = c["e"]
        png = os.path.join(cache, f"card-{h}.png")
        card_png(c["text"], W, H, png, e.get("style") or {})
        vf = []
        dur = c["n"] / fps
        if e.get("fade_in", 0.4):
            vf.append(f"fade=t=in:st=0:d={float(e.get('fade_in', 0.4)):.3f}")
        if e.get("fade_out", 0.4):
            f = float(e.get("fade_out", 0.4))
            vf.append(f"fade=t=out:st={max(0.0, dur - f):.3f}:d={f:.3f}")
        vf += ["format=yuv420p"]
        run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-framerate", str(fps), "-i", png,
             "-vf", ",".join(vf), "-frames:v", str(c["n"])] + enc + [tmp])
    else:
        m = S.meta(c["src"])
        fc = video_chain(edl, S, c, geo)
        # seek a little early, then let the trim inside the graph land on the exact frame
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{c['cin']:.4f}", "-i", m["path"], "-filter_complex", fc,
             "-map", "[v]", "-an", "-frames:v", str(c["n"])] + enc + [tmp])
    os.replace(tmp, out)
    return out


# ----------------------------------------------------------------------------- sound

def audio_segments(edl, S, clips, total):
    """Every piece of sound on the timeline: (src, s0, s1, at, gain_db, fade_in, fade_out, track)."""
    defaults = edl.get("defaults") or {}
    xf = float(defaults.get("xfade", 0.04))
    segs = []
    for c in clips:
        if c["kind"] != "clip":
            continue
        e = c["e"]
        if c["audio"] != "mute":
            gain = 0.0 if c["audio"] == "keep" else float(c["audio"])
            gain += float(e.get("gain", 0.0))
            s0 = c["cin"] + (c["AB0"] - c["B"])
            s1 = c["cin"] + (c["AB1"] - c["B"])
            if c["sc"]:
                s0, s1 = max(s0, c["sc"]["lim_in"]), min(s1, c["sc"]["lim_out"])
            fi = float(e.get("fade_in") or 0) or xf
            fo = float(e.get("fade_out") or 0) or xf
            if s1 - s0 > 0.02:
                segs.append({"src": c["src"], "s0": s0 - xf / 2, "s1": s1 + xf / 2,
                             "at": c["B"] + (s0 - c["cin"]) - xf / 2, "gain": gain, "fi": fi, "fo": fo,
                             "track": "sync", "clip": c})
        v = c["voice"]
        if v:
            s0, s1 = v["cin"], v["cout"]
            segs.append({"src": v["src"], "s0": s0 - xf / 2, "s1": s1 + xf / 2, "at": c["B"] + v["at"] - xf / 2,
                         "gain": v["gain"], "fi": xf, "fo": xf, "track": "voice", "clip": c})
    for o in edl.get("overlays") or []:
        at = parse_time(o["at"]) if "at" in o else clips[int(o["at_clip"]) - 1]["B"] + float(o.get("offset", 0))
        segs.append({"src": o["src"], "s0": parse_time(o["in"]), "s1": parse_time(o["out"]), "at": at,
                     "gain": float(o.get("gain", 0)), "fi": float(o.get("fade_in", xf)),
                     "fo": float(o.get("fade_out", xf)), "track": "voice", "clip": None})
    for s in segs:  # clamp to the source and the timeline
        dur = S.meta(s["src"])["duration"]
        if s["s0"] < 0:
            s["at"] -= s["s0"]
            s["s0"] = 0.0
        if s["at"] < 0:
            s["s0"] -= s["at"]
            s["at"] = 0.0
        s["s1"] = min(s["s1"], dur, s["s0"] + (total - s["at"]))
    return [s for s in segs if s["s1"] - s["s0"] > 0.02]


def mix_audio(edl, S, segs, total, workdir, draft):
    inputs, fc, labels = [], [], {"sync": [], "voice": []}
    for k, s in enumerate(segs):
        L = s["s1"] - s["s0"]
        inputs += ["-ss", f"{s['s0']:.4f}", "-t", f"{L:.4f}", "-i", S.wav_path(s["src"])]
        fi, fo = min(s["fi"], L / 2), min(s["fo"], L / 2)
        ms = int(round(s["at"] * 1000))
        fc.append(f"[{k}:a]aformat=sample_rates=48000:channel_layouts=stereo,"
                  f"afade=t=in:st=0:d={fi:.3f},afade=t=out:st={L - fo:.3f}:d={fo:.3f},"
                  f"volume={s['gain']:.2f}dB,adelay={ms}:all=1[s{k}]")
        labels[s["track"]].append(f"[s{k}]")
    n = len(segs)
    allin = labels["sync"] + labels["voice"]
    if not allin:
        fc.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{total:.3f}[dia]")
    else:
        fc.append(f"{''.join(allin)}amix=inputs={len(allin)}:normalize=0:dropout_transition=0,"
                  f"apad=whole_dur={total:.3f},atrim=0:{total:.3f}[dia]")
    music = edl.get("music")
    final = "[dia]"
    if music:
        mi = n
        inputs += ["-ss", f"{parse_time(music.get('in', 0)):.3f}", "-t", f"{total:.3f}",
                   "-i", S.wav_path(music["src"]) if music["src"] in S.paths
                   else os.path.join(S.base, music["src"])]
        g = float(music.get("gain", -18))
        mfo = float(music.get("fade_out", 2.0))
        fc.append(f"[{mi}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={g:.1f}dB,"
                  f"afade=t=in:d={float(music.get('fade_in', 1.0)):.2f},"
                  f"afade=t=out:st={max(0, total - mfo):.2f}:d={mfo:.2f},apad=whole_dur={total:.3f}[mus]")
        if music.get("duck", True):
            fc.append("[dia]asplit[d1][d2]")
            fc.append("[mus][d2]sidechaincompress=threshold=0.02:ratio=6:attack=30:release=400[mduck]")
            fc.append("[d1][mduck]amix=inputs=2:normalize=0:dropout_transition=0[mix]")
        else:
            fc.append("[dia][mus]amix=inputs=2:normalize=0:dropout_transition=0[mix]")
        final = "[mix]"
    raw = os.path.join(workdir, "mix_raw.wav")
    script = os.path.join(workdir, "mix.fc")
    with open(script, "w") as f:
        f.write(";\n".join(fc))
    run(["ffmpeg", "-y", "-v", "error"] + inputs + ["-filter_complex_script", script, "-map", final,
                                                    "-c:a", "pcm_s16le", "-ar", "48000", raw])
    target = float(edl["output"].get("loudness", -16))
    out = os.path.join(workdir, "mix.wav")
    if draft:
        shutil.copy(raw, out)
        return out
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", raw, "-af",
             f"loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"])
    js = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    if float(js["input_i"]) < -70:  # silence
        shutil.copy(raw, out)
        return out
    run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-af",
         f"loudnorm=I={target}:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
         f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:"
         f"linear=true", "-ar", "48000", "-c:a", "pcm_s16le", out])
    return out


# ----------------------------------------------------------------------------- captions

def caption_events(edl, S, clips, segs):
    cap = edl.get("captions") or {}
    fixes = cap.get("fix") or {}
    maxc = int(cap.get("max_chars", 38))
    groups = []
    for s in segs:
        c = s["clip"]
        if c is None or s["src"] not in S.an:
            continue
        flag = c["e"].get("caption", True) if s["track"] == "sync" else c["voice"]["caption"]
        if flag is False:
            continue
        origin = (c["B"] - c["cin"]) if s["track"] == "sync" else (c["B"] + c["voice"]["at"] - c["voice"]["cin"])
        lo, hi = s["s0"] + 0.03, s["s1"] - 0.03
        ws = [w for w in S.words(s["src"]) if lo <= (w["s"] + w["e"]) / 2 <= hi]
        if isinstance(flag, str):
            if ws:
                groups.append([{"w": flag, "t0": ws[0]["s"] + origin, "t1": ws[-1]["e"] + origin}])
            continue
        groups.append([{"w": w["w"], "t0": w["s"] + origin, "t1": w["e"] + origin} for w in ws])
    events = []
    for g in groups:
        cur = []
        for w in g:
            txt = " ".join(x["w"] for x in cur + [w])
            if cur and (w["t0"] - cur[-1]["t1"] > 0.6 or len(txt) > maxc):
                events.append(cur)
                cur = []
            cur.append(w)
            if re.search(r"[.?!…]$", w["w"]) and len(" ".join(x["w"] for x in cur)) > 12:
                events.append(cur)
                cur = []
        if cur:
            events.append(cur)
    out = []
    for ev in events:
        text = " ".join(w["w"] for w in ev)
        for a, b in fixes.items():
            text = re.sub(rf"\b{re.escape(a)}\b", b, text)
        if cap.get("upper"):
            text = text.upper()
        out.append([ev[0]["t0"], max(ev[-1]["t1"] + 0.25, ev[0]["t0"] + 0.7), text])
    out.sort()
    for k in range(len(out) - 1):
        out[k][1] = min(out[k][1], out[k + 1][0] - 0.02)
    return [e for e in out if e[1] - e[0] > 0.1]


def srt_time(t):
    t = max(0.0, t)
    return f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round((t % 1) * 1000)) % 1000:03d}"


def ass_time(t):
    t = max(0.0, t)
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def write_captions(edl, events, geo, srt_path, ass_path):
    W, H, BW, BH = geo
    cap = edl.get("captions") or {}
    with open(srt_path, "w") as f:
        for k, (a, b, t) in enumerate(events, 1):
            f.write(f"{k}\n{srt_time(a)} --> {srt_time(b)}\n{t}\n\n")
    size = int(round(H * float(cap.get("size", 0.05))))
    bar = (H - BH) // 2
    if bar >= size * 1.5 and cap.get("position", "auto") in ("auto", "bar"):
        margin = max(4, (bar - size) // 2 - 2)
        outline = 0
    else:
        margin = int(H * float(cap.get("margin", 0.07)))
        outline = 2
    font = cap.get("font", "Inter SemiBold")
    with open(ass_path, "w") as f:
        f.write("[Script Info]\nScriptType: v4.00+\n"
                f"PlayResX: {W}\nPlayResY: {H}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n"
                "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, "
                "BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, "
                "Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
                f"Style: Default,{font},{size},&H00F2F2F2,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0.3,0,1,"
                f"{outline},{1 if outline else 0},2,{int(W * 0.08)},{int(W * 0.08)},{margin},1\n\n"
                "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        for a, b, t in events:
            f.write(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Default,,0,0,0,,{t}\n")


# ----------------------------------------------------------------------------- reports

def edl_report(clips, total, path):
    rows = [f"{'#':>3}  {'timeline':>17}  {'dur':>5}  {'source':<10} {'src in':>9}  {'split':>5}  what"]
    for c in clips:
        tl = f"{tc(c['B'], 2)}–{tc(c['B'] + c['D'], 2)}"
        if c["kind"] == "card":
            rows.append(f"{c['i'] + 1:>3}  {tl:>17}  {c['D']:5.2f}  {'[card]':<10} {'':>9}  {'':>5}  "
                        f"{str(c['text']).splitlines()[0]}")
            continue
        what = c["e"].get("note", "")
        if c["voice"]:
            what = (what + f"  + voice from {c['voice']['src']} @{tc(c['voice']['cin'], 2)}").strip()
        rows.append(f"{c['i'] + 1:>3}  {tl:>17}  {c['D']:5.2f}  {c['src']:<10} {tc(c['cin'], 2):>9}  "
                    f"{c['split']:5.2f}  {what}")
    rows.append(f"total {tc(total, 2)}")
    with open(path, "w") as f:
        f.write("\n".join(rows) + "\n")
    return "\n".join(rows)


def review_sheet(video, clips, events, path):
    from PIL import Image, ImageDraw, ImageFont

    fp = font_path()
    fh = ImageFont.truetype(fp, 15) if fp else ImageFont.load_default()
    fb = ImageFont.truetype(fp, 14) if fp else ImageFont.load_default()
    tmp = tempfile.mkdtemp()
    cells = []
    for c in clips:
        t = c["B"] + c["D"] / 2
        p = os.path.join(tmp, f"{c['i']:03d}.jpg")
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1",
             "-vf", "scale=320:-2", p])
        said = " ".join(ev[2] for ev in events if c["B"] - 0.05 <= ev[0] < c["B"] + c["D"] - 0.05)
        head = f"#{c['i'] + 1} {tc(c['B'], 1)} {c['D']:.1f}s " + ("card" if c["kind"] == "card" else c["src"])
        cells.append((p, head, said or c["e"].get("note", "") or "—"))
    cols, cw = 5, 320
    with Image.open(cells[0][0]) as im0:
        th = int(cw * im0.height / im0.width)
    ch = th + 22 + 3 * 17 + 8
    rows = (len(cells) + cols - 1) // cols
    img = Image.new("RGB", (cols * (cw + 8) + 8, rows * (ch + 8) + 8), (16, 16, 18))
    d = ImageDraw.Draw(img)
    from analyze import wrap  # same wrapping helper as the source sheets

    for k, (p, head, body) in enumerate(cells):
        x, y = 8 + (k % cols) * (cw + 8), 8 + (k // cols) * (ch + 8)
        with Image.open(p) as im:
            img.paste(im.convert("RGB").resize((cw, th)), (x, y))
        d.text((x, y + th + 3), head, fill=(255, 200, 90), font=fh)
        for j, ln in enumerate(wrap(d, body, fb, cw, 3)):
            d.text((x, y + th + 22 + j * 17), ln, fill=(225, 225, 225), font=fb)
    img.save(path, quality=86)
    shutil.rmtree(tmp)


def verify(mix_wav, events, model_name, hotwords=None):
    """Transcribe the finished sound and compare with the caption track."""
    import wave

    import numpy as np
    from faster_whisper import WhisperModel

    w16 = mix_wav[:-4] + "-16k.wav"
    run(["ffmpeg", "-y", "-v", "error", "-i", mix_wav, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", w16])
    with wave.open(w16, "rb") as wf:
        x16 = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(x16, word_timestamps=True, language="en", hotwords=hotwords,
                               condition_on_previous_text=False, beam_size=5)
    heard = [(w.start, w.end, w.word.strip()) for s in segs for w in (s.words or [])]
    bad = 0
    print("\nverify: expected (captions) vs heard (re-transcribed output)")
    used = set()
    for a, b, text in events:
        hw = [(k, h) for k, h in enumerate(heard) if a - 0.25 <= (h[0] + h[1]) / 2 <= b + 0.25]
        used.update(k for k, _ in hw)
        got = " ".join(h[2] for _, h in hw)
        ratio = difflib.SequenceMatcher(None, norm_tokens(text), norm_tokens(got)).ratio()
        ok = ratio >= 0.75
        bad += not ok
        print(f"  {'ok   ' if ok else 'CHECK'} {tc(a, 2)}  want: {text!r}\n{'':17}heard: {got!r}" if not ok
              else f"  ok    {tc(a, 2)}  {text!r}")
    stray = [h for k, h in enumerate(heard) if k not in used]
    if stray:
        print("  words heard where no caption expects speech (leaks from neighbouring lines?):")
        for h in stray:
            print(f"    {tc(h[0], 2)}  {h[2]}")
    print(f"verify: {len(events) - bad}/{len(events)} caption events match; {len(stray)} stray words")


# ----------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("edl")
    ap.add_argument("--out", default=None)
    ap.add_argument("--draft", action="store_true", help="half size, fast encode, no loudness pass")
    ap.add_argument("--no-burn", action="store_true", help="do not burn captions into the picture")
    ap.add_argument("--verify", action="store_true", help="re-transcribe the result and compare")
    ap.add_argument("--model", default="medium.en", help="whisper model for --verify")
    ap.add_argument("--plan", action="store_true", help="print the resolved timeline and stop")
    args = ap.parse_args()

    edl = load_edl(args.edl)
    edl.setdefault("output", {})
    base = os.path.dirname(os.path.abspath(args.edl))
    out = args.out or os.path.join(base, "out", os.path.splitext(os.path.basename(args.edl))[0] + ".mp4")
    out = os.path.abspath(out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    stem = os.path.splitext(out)[0]
    cache = os.path.join(os.path.dirname(out), ".cache")
    os.makedirs(cache, exist_ok=True)
    S = Sources(edl, base, cache)

    clips, total = resolve(edl, S)
    print(edl_report(clips, total, stem + "-edl.txt"))
    if args.plan:
        return
    geo = geometry(edl, args.draft)
    print(f"\nrendering {len(clips)} clips, {tc(total, 2)} at {geo[0]}x{geo[1]} ...")
    seg_files = []
    for c in clips:
        seg_files.append(render_segment(edl, S, c, geo, cache, args.draft))
        print(f"  clip {c['i'] + 1}/{len(clips)}", end="\r", flush=True)
    print()
    tmpdir = tempfile.mkdtemp(dir=cache)
    listing = os.path.join(tmpdir, "list.txt")
    with open(listing, "w") as f:
        for p in seg_files:
            f.write(f"file '{p}'\n")
    video = os.path.join(tmpdir, "video.mp4")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listing, "-c", "copy", video])

    segs = audio_segments(edl, S, clips, total)
    mix = mix_audio(edl, S, segs, total, tmpdir, args.draft)
    events = caption_events(edl, S, clips, segs)
    ass = os.path.join(tmpdir, "captions.ass")
    write_captions(edl, events, geo, stem + ".srt", ass)

    burn = (edl.get("captions") or {}).get("burn", True) and not args.no_burn and events
    vf = ["-vf", f"ass={ass}"] if burn else []
    crf = str(edl["output"].get("crf", 19 if not args.draft else 26))
    run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", mix] + vf +
        ["-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "veryfast" if args.draft else "slow",
         "-crf", crf, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}",
         "-movflags", "+faststart", out])
    review_sheet(out, clips, events, stem + "-review.jpg")
    print(f"wrote {out}\n      {stem}.srt\n      {stem}-review.jpg\n      {stem}-edl.txt")
    if args.verify:
        names = ", ".join(sorted(set((edl.get("captions") or {}).get("fix", {}).values()))) or None
        verify(mix, events, args.model, names)
    shutil.rmtree(tmpdir)


if __name__ == "__main__":
    main()
