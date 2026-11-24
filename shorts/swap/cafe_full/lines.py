# New lines for the brick figure, placed in Biff's original speaking slots (segment time, seconds)
import sys, json, numpy as np, soundfile as sf
sys.path.insert(0, "/home/user/Claude-new/shorts"); import render as rd
rd.SR = 44100
LINES = [(1.15, "I need time to sign it. Big signature."),
         (3.4, "If it's in your handwriting, they'll say it's rigged!"),
         (6.85, "Total disaster!"),
         (8.65, "You don't want a disaster, do you?"),
         (13.4, "Do you?"),
         (17.1, "What are you looking at, loser?"),
         (22.55, "So when do I get my homework, McFly?"),
         (32.75, "Not too early. Golf on Sundays."),
         (34.6, "Hey McFly, your shoe's untied!"),
         (36.65, "Gotcha! Don't be so gullible, McFly."),
         (39.1, "You're fired!")]
VOICE, SPEED = sys.argv[1] if len(sys.argv) > 1 else "am_onyx", 1.12
out = []
for t, txt in LINES:
    y, path = rd.tts(txt, VOICE, SPEED, "tts_cache")
    sf.write(f"line_{len(out)}.wav", y, 44100)
    out.append({"t": t, "text": txt, "dur": len(y) / 44100, "wav": f"line_{len(out)}.wav"})
    print(f"{t:5.2f} +{len(y)/44100:4.2f} -> {t+len(y)/44100:5.2f}  {txt}")
json.dump(out, open("lines.json", "w"), indent=1)
