"""Generate the narration with Kokoro and build timeline.json.

Each script line (one or more phrases) is spoken in a single pass so the
intonation flows across cuts; the line is then split into shots at the word
boundaries between phrases, using Kokoro's word timestamps.

Usage: python3 tts.py [voice]
Writes build/voice.wav (24 kHz mono) and build/timeline.json.
"""
import json, os, re, sys
import numpy as np
import soundfile as sf
from kokoro import KPipeline

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 24000
# Words missing from Kokoro 0.7.4's dictionary, given an inline pronunciation.
SAY = {"Hadza": "[Hadza](/hˈɑdzə/)", "favour": "[favour](/fˈAvəɹ/)", "smartest": "[smartest](/smˈɑɹtəst/)",
       "flavour": "[flavour](/flˈAvəɹ/)", "Tel Aviv": "[Tel Aviv](/tˈɛl əvˈiv/)", "Dhra'": "[Dhra'](/dɹˈɑ/)",
       "Kalahari": "[Kalahari](/kˌæləhˈɑɹi/)", "Kharaneh": "[Kharaneh](/kəɹˈɑnɛ/)", "Norje": "[Norje](/nˈɔɹjə/)",
       "Qesem": "[Qesem](/kˈɛsəm/)", "Sunnansund": "[Sunnansund](/sˈʊnənsˌʊnd/)", "Woodburn": "[Woodburn](/wˈʊdbɜɹn/)",
       "freshwater": "[freshwater](/fɹˈɛʃwˌɔtəɹ/)", "hxaro": "[hxaro](/hˈɑɹO/)", "kilometres": "[kilometres](/kəlˈɑmətəɹz/)",
       "kiviak": "[kiviak](/kˈiviˌæk/)", "yakhchāls": "[yakhchāls](/jˈɑkʧˌɑlz/)",
       "Benjamina": "[Benjamina](/bˌɛnʤəmˈinə/)", "Chausiku": "[Chausiku](/ʧWsˈiku/)", "Dmanisi": "[Dmanisi](/dmənˈisi/)",
       "Krapina": "[Krapina](/kɹɑpˈinə/)", "Kristen": "[Kristen](/kɹˈɪstən/)", "Liang": "[Liang](/liˈɑŋ/)", "Tebo": "[Tebo](/tˈɛbO/)",
       "Lorna": "[Lorna](/lˈɔɹnə/)", "Mahale": "[Mahale](/mɑhˈɑlA/)", "Mehrgarh": "[Mehrgarh](/mˈAɹɡɑɹ/)", "Shanidar": "[Shanidar](/ʃˈænədɑɹ/)",
       "Sidrón": "[Sidrón](/sidɹˈOn/)", "Tongwe": "[Tongwe](/tˈɔŋɡwA/)", "Vernonia": "[Vernonia](/vəɹnˈOniə/)", "Villabruna": "[Villabruna](/vˌɪləbɹˈunə/)",
       "fibres": "[fibres](/fˈIbəɹz/)", "grandchildren": "[grandchildren](/ɡɹˈænʧˌɪldɹən/)", "mould": "[mould](/mˈOld/)",
       "salicylic": "[salicylic](/sˌæləsˈɪlɪk/)", "Ötzi": "[Ötzi](/ˈʌtsi/)", "Vasilyevka": "[Vasilyevka](/vəsˈɪljəfkə/)",
       "kaolin": "[kaolin](/kˈAəlɪn/)", "Sumatra": "[Sumatra](/sumˈɑtɹə/)", "Solecki": "[Solecki](/səlˈɛtski/)", "Huesos": "[Huesos](/wˈAsOs/)",
       "chuño": "[chuño](/ʧˈunjO/)", "Gilgal": "[Gilgal](/ɡˈɪlɡˌæl/)", "stockfish": "[stockfish](/stˈɑkfˌɪʃ/)"}

script = json.load(open(os.path.join(HERE, "build", "script.json")))
voice = sys.argv[1] if len(sys.argv) > 1 else script["voice"]
out = os.path.join(HERE, "build")
os.makedirs(out, exist_ok=True)
pipe = KPipeline(lang_code=voice[0])
letters = lambda s: re.sub(r"[^a-z]", "", s.lower())


def speak(text):
    say = text
    for k, v in SAY.items():
        say = re.sub(rf"(?<![\w\[]){re.escape(k)}(?![\w\]])", v, say)
    audio, toks, off = [], [], 0.0
    for r in pipe(say, voice=voice, speed=script["speed"]):
        a = np.asarray(r.audio, dtype=np.float32)
        for t in (r.tokens or []):
            if not t.text.strip():
                continue
            st = t.start_ts if t.start_ts is not None else (toks[-1]["e"] - off if toks else 0.0)
            en = t.end_ts if t.end_ts is not None else st
            toks.append({"w": t.text, "s": off + st, "e": off + en})
        audio.append(a)
        off += len(a) / SR
    a = np.concatenate(audio)
    idx = np.where(np.abs(a) > 0.004)[0]
    s0 = max(0, idx[0] - int(0.02 * SR)); s1 = min(len(a), idx[-1] + int(0.06 * SR))
    cut = s0 / SR
    for t in toks:
        t["s"] = round(max(0.0, t["s"] - cut), 3); t["e"] = round(max(0.0, t["e"] - cut), 3)
    return a[s0:s1], toks


t = script["lead_in"]
shots, chunks = [], []
for line in script["lines"]:
    text = " ".join(p[1] for p in line["phrases"])
    a, toks = speak(text)
    dur = len(a) / SR
    # Assign tokens to phrases by counting letters; trailing punctuation stays with its phrase.
    k = 0
    for pid, ptxt in line["phrases"]:
        need, got, words = len(letters(ptxt)), 0, []
        while k < len(toks):
            tl = letters(toks[k]["w"])
            if got >= need and tl:
                break
            got += len(tl); words.append(toks[k]); k += 1
        shots.append({"id": pid, "text": ptxt, "words": words, "line_t": t})
    for w in toks[k:]:
        shots[-1]["words"].append(w)
    chunks.append((t, a))
    t += dur + script["gap"] + line.get("pause", 0.0)

for s in shots:
    s["vs"] = round(s["line_t"] + s["words"][0]["s"], 3)
    s["ve"] = round(s["line_t"] + max(w["e"] for w in s["words"] if letters(w["w"])), 3)
    s["words"] = [{"w": w["w"], "s": round(s["line_t"] + w["s"] - s["vs"], 3), "e": round(s["line_t"] + w["e"] - s["vs"], 3)} for w in s["words"]]
    del s["line_t"]
end = shots[-1]["ve"] + script["tail"]
# Cut in the pause between phrases when there is one, otherwise just before the next word.
for i, s in enumerate(shots):
    if i == 0:
        s["start"] = 0.0
        continue
    prev = shots[i - 1]["ve"]
    s["start"] = round(max(prev + 0.02, s["vs"] - 0.08) if s["vs"] - prev > 0.1 else s["vs"] - 0.02, 3)
for i, s in enumerate(shots):
    s["end"] = shots[i + 1]["start"] if i + 1 < len(shots) else round(end, 3)

mix = np.zeros(int(np.ceil(end * SR)), np.float32)
for st, a in chunks:
    i = int(st * SR); mix[i:i + len(a)] += a
sf.write(os.path.join(out, "voice.wav"), mix, SR)
for i, s in enumerate(shots):
    s.update(script["visuals"][s["id"]]); s["idx"] = i
json.dump({"voice": voice, "duration": round(end, 3), "shots": shots, "chapters": script["chapters"]}, open(os.path.join(out, "timeline.json"), "w"), indent=1)
L = [s["end"] - s["start"] for s in shots]
print(f"voice={voice} duration={end:.2f}s shots={len(shots)} shot median={np.median(L):.2f}s")
for s in shots[:0]:
    print(f'{s["id"]} {s["start"]:6.2f}-{s["end"]:6.2f} ({s["end"]-s["start"]:.2f}s) {" ".join(w["w"] for w in s["words"])}')
