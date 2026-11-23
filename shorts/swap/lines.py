# New lines for the brick figure, placed in Biff's original speaking slots (segment time, seconds)
import sys, json, numpy as np, soundfile as sf
sys.path.insert(0, "/home/user/Claude-new/shorts"); import render as rd
rd.SR = 44100
LINES = [(1.05, "McFly! What are you doing? Sad. Very sad."),
         (5.45, "I'm talking to you, McFly! Nobody ignores me."),
         (10.25, "Where's my homework, McFly?"),
         (16.4, "Hello?"), (17.2, "Anybody home?"),
         (18.4, "Monday? Fake news!")]
VOICE, SPEED = sys.argv[1] if len(sys.argv) > 1 else "am_onyx", 1.12
out = []
for t, txt in LINES:
    y, path = rd.tts(txt, VOICE, SPEED, "tts_cache")
    sf.write(f"line_{len(out)}.wav", y, 44100)
    out.append({"t": t, "text": txt, "dur": len(y) / 44100, "wav": f"line_{len(out)}.wav"})
    print(f"{t:5.2f} +{len(y)/44100:4.2f} -> {t+len(y)/44100:5.2f}  {txt}")
json.dump(out, open("lines.json", "w"), indent=1)
