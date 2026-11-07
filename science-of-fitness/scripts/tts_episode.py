"""Make the voiceover for an episode from its SCRIPT.md with Kokoro TTS (Apache-2.0, CPU).

    python3 tts_episode.py <episode folder> <kokoro-v1.0.onnx> <voices-v1.0.bin>

Writes into <episode>/audio/:
  vo-full.flac / vo-full.mp3   whole narration, loudness-normalised (-16 LUFS, -1.5 dBTP), with planned holds as silence
  scenes/scene-NN.mp3          one file per scene (cut from the normalised track, 192 kbps)
  vo.srt                       subtitles, one cue per narration line, timed to the audio
  timings.json                 scene start/end and per-line timing
Then updates the scene timestamps and chapters in SCRIPT.md to the real audio.

Voices: narrator = am_michael, [SKINNY] Rohan = am_puck, [RIVAL] Tiger = am_fenrir.
"""
import json, os, re, subprocess, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

EP, MODEL, VOICES = sys.argv[1], sys.argv[2], sys.argv[3]
SCRIPT = os.path.join(EP, "SCRIPT.md")
OUT = os.path.join(EP, "audio")
VOICE = {"narrator": ("am_michael", 0.87), "host": ("am_michael", 0.87), "rival": ("am_fenrir", 0.97), "skinny": ("am_puck", 0.98)}
GAP_LINE, GAP_SPEAKER, GAP_SCENE = 0.32, 0.5, 0.75
HOLD = {"1": 1.0, "2": 1.0, "3": 1.0, "6": 2.0, "14": 3.0, "19": 5.0, "20": 2.0, "24": 12.0, "25": 2.0, "28": 7.0,
        "29": 2.0, "34": 3.0}  # extra silence (s) after scenes that need time for visuals
SAY = [  # spelling the TTS should say (verified by transcribing the result)
    (r"\b3am\b", "three a.m."), (r"\b1999\b", "nineteen ninety-nine"), (r"\b1940s\b", "nineteen-forties"),
    (r"\bpaneer\b", "puh-neer"), (r"\brotis\b", "roe-tees"), (r"\bdal\b", "daal"), (r"\bchana\b", "chunna"),
    (r"\bbiryani\b", "beer-yaani"), (r"\bghee\b", "ghee"),
]


def parse():
    scenes, cur = [], None
    for line in open(SCRIPT, encoding="utf-8").read().split("\n"):
        if line.startswith("## Video description"):
            break
        m = re.match(r"### Scene (\d+) · ([\d:]+)", line)
        if m:
            cur = {"id": m.group(1), "lines": []}; scenes.append(cur); continue
        if cur is not None and line.startswith("> "):
            t = line[2:].strip()
            spk = "narrator"
            m2 = re.match(r"\[(RIVAL|HOST|SKINNY)\]:\s*(.*)", t)
            if m2:
                spk, t = m2.group(1).lower(), m2.group(2)
            cur["lines"].append({"speaker": spk, "text": t})
    return scenes


def speakable(t):
    t = t.replace("“", "").replace("”", "").replace('"', "")
    t = re.sub(r"\b([A-Z]{2,})\b", lambda m: m.group(1).lower(), t)  # "LOT" -> "lot", not spelled out
    for a, b in SAY:
        t = re.sub(a, b, t, flags=re.I)
    return t


def main():
    os.makedirs(os.path.join(OUT, "scenes"), exist_ok=True)
    k = Kokoro(MODEL, VOICES)
    sr = 24000
    track, timings, cues, pos = [], [], [], 0.0
    scenes = parse()
    for si, sc in enumerate(scenes):
        sc_start = pos; prev = None; sc_audio = []
        for ln in sc["lines"]:
            gap = 0 if prev is None else (GAP_SPEAKER if prev != ln["speaker"] else GAP_LINE)
            if gap:
                sc_audio.append(np.zeros(int(gap * sr), np.float32)); pos += gap
            voice, speed = VOICE[ln["speaker"]]
            a, r = k.create(speakable(ln["text"]), voice=voice, speed=speed, lang="en-us")
            assert r == sr
            a = a.astype(np.float32)
            nz = np.flatnonzero(np.abs(a) > 0.01)  # trim the model's own leading/trailing silence
            if len(nz):
                a = a[max(0, nz[0] - int(0.03 * sr)): nz[-1] + int(0.08 * sr)]
            cues.append({"start": pos, "end": pos + len(a) / sr, "speaker": ln["speaker"], "text": ln["text"]})
            sc_audio.append(a); pos += len(a) / sr; prev = ln["speaker"]
        hold = HOLD.get(sc["id"], 0.0) + (GAP_SCENE if si < len(scenes) - 1 else 0.6)
        sc_audio.append(np.zeros(int(hold * sr), np.float32)); pos += hold
        sc_wav = np.concatenate(sc_audio)
        track.append(sc_wav)
        timings.append({"scene": int(sc["id"]), "start": round(sc_start, 3), "end": round(pos, 3), "lines": len(sc["lines"])})
        sf.write(os.path.join(OUT, "scenes", f"_raw-{int(sc['id']):02d}.wav"), sc_wav, sr)
        print(f"scene {sc['id']:>2}  {sc_start:7.1f}s  {len(sc['lines'])} lines", flush=True)
    full = np.concatenate(track)
    raw = os.path.join(OUT, "_raw-full.wav")
    sf.write(raw, full, sr)
    norm = ["-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000"]
    run = lambda *a: subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], check=True)
    run("-i", raw, *norm, os.path.join(OUT, "vo-full.flac"))
    run("-i", os.path.join(OUT, "vo-full.flac"), "-c:a", "libmp3lame", "-b:a", "160k", os.path.join(OUT, "vo-full.mp3"))
    for t in timings:  # cut scene files from the normalised track so they match it exactly
        run("-i", os.path.join(OUT, "vo-full.flac"), "-ss", f"{t['start']:.3f}", "-to", f"{t['end']:.3f}",
            "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, "scenes", f"scene-{t['scene']:02d}.mp3"))
        os.remove(os.path.join(OUT, "scenes", f"_raw-{t['scene']:02d}.wav"))
    os.remove(raw)

    def ts(x):
        h, r = divmod(x, 3600); m, s = divmod(r, 60)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}"
    with open(os.path.join(OUT, "vo.srt"), "w", encoding="utf-8") as f:
        for i, c in enumerate(cues, 1):
            who = {"rival": "[TIGER] ", "host": "[HOST] ", "skinny": "[ROHAN] "}.get(c["speaker"], "")
            f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{who}{c['text']}\n\n")
    json.dump({"duration": round(pos, 2), "scenes": timings, "lines": cues}, open(os.path.join(OUT, "timings.json"), "w"), indent=1)
    update_script(timings, pos)
    print(f"total {pos/60:.2f} min", flush=True)


def update_script(timings, total):
    s = open(SCRIPT, encoding="utf-8").read()
    start = {str(t["scene"]): t["start"] for t in timings}
    fmt = lambda x: f"{int(x // 60)}:{int(round(x % 60)) % 60:02d}" if round(x % 60) < 60 else f"{int(x // 60) + 1}:00"
    s = re.sub(r"### Scene (\d+) · [\d:]+", lambda m: f"### Scene {m.group(1)} · {fmt(start[m.group(1)])}", s)
    # chapters: keep the titles, retime each to the scene it already pointed at
    for block in re.findall(r"\*\*Chapters\*\*\n```\n(.*?)\n```", s, flags=re.S):
        new = []
        for ln in block.split("\n"):
            m = re.match(r"([\d:]+) (.*)", ln)
            new.append(ln if not m else f"{fmt(_scene_for(m.group(2), s, start))} {m.group(2)}")
        s = s.replace(block, "\n".join(new))
        desc = re.search(r"CHAPTERS\n(.*?)\n\nSOURCES", s, flags=re.S).group(1)
        s = s.replace(desc, "\n".join(new))
    s = re.sub(r"\*\*Target length:\*\* .*", f"**Target length:** {fmt(total)} with the recorded voiceover (`audio/vo-full.flac`), including holds for demos and the plan card.", s)
    open(SCRIPT, "w", encoding="utf-8").write(s)


CHAPTER_SCENE = {"1,000 extra calories a day": "1", "Reason 1": "5", "Reason 2": "8", "Reason 3": "10", "ectomorph": "13",
                 "The food": "15", "The workout": "22", "The plan": "28", "Quick questions": "30", "Start here": "33"}


def _scene_for(title, s, start):
    for key, sid in CHAPTER_SCENE.items():
        if key in title:
            return start[sid]
    raise KeyError(title)


if __name__ == "__main__":
    main()
