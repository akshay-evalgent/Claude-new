"""Voice-over for the MiroFish short, synthesised with Kokoro (open-weight TTS, Apache-2.0).

    python -m venv ttsenv && ttsenv/bin/pip install kokoro-onnx soundfile
    # model files: github.com/thewh1teagle/kokoro-onnx/releases (kokoro-v1.0.onnx, voices-v1.0.bin)
    ttsenv/bin/python vo.py /path/to/model_dir [voice]

Each line has a start time and a hard end (the next beat). A line that would overrun is
re-synthesised faster, up to MAX_SPEED. Writes out/vo.wav (48 kHz mono), out/vo_timing.json
and captions_en.srt (timed to the actual speech, for the YouTube upload).
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = sys.argv[2] if len(sys.argv) > 2 else 'af_heart'
BASE_SPEED, MAX_SPEED = 1.12, 1.34
DUR = 48.0

# (start s, must end by s, text). Spelling is for the TTS: "Meero Fish" says MEE-roh fish.
LINES = [
    (0.10, 2.85, "A college senior hoped for a thousand GitHub stars."),
    (3.08, 4.85, "His next one got eighty-three thousand."),
    (5.18, 6.40, "And a billionaire's backing."),
    (6.42, 6.98, "For this."),
    (7.15, 8.25, "He built Meero Fish."),
    (9.05, 11.45, "It simulates thousands of people, to predict the future."),
    (11.55, 12.98, "Step one. Feed it anything."),
    (13.10, 14.92, "It maps every person and connection."),
    (15.10, 16.95, "Then turns each one into an AI agent."),
    (17.05, 19.00, "Thousands of them, arguing, changing minds."),
    (19.10, 20.95, "Basically, the internet. In a box."),
    (21.12, 22.95, "Two fake social networks, at once."),
    (23.05, 24.92, "Then you play god, and drop in a what-if."),
    (25.10, 26.85, "It writes you a prediction report."),
    (27.05, 28.85, "And you can interview the agents."),
    (29.02, 30.38, "Then: a centuries-old novel."),
    (30.42, 32.95, "The author never finished it. So the characters did."),
    (33.08, 33.62, "The catch?"),
    (33.66, 35.02, "Their homepage: five bucks a run."),
    (35.05, 36.12, "Read-me: go easy."),
    (36.18, 37.15, "Futures from five bucks."),
    (37.27, 38.55, "It can't see the future."),
    (38.62, 40.65, "It rehearses a thousand of them."),
    (41.10, 42.70, "So we asked a swarm about this video."),
    (44.50, 45.95, "Seventy-three percent say you'll follow."),
    (46.02, 46.98, "Prove them wrong."),
]
# what the captions file should say (screen spelling)
CAPTION_FIX = {"Meero Fish": "MiroFish", "Read-me": "README", "eighty-three thousand": "83,000", "Seventy-three percent": "73%"}


def trim(x, sr, thr=0.008, pad=0.04):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x
    a, b = max(0, idx[0] - int(pad * sr)), min(len(x), idx[-1] + int(pad * sr * 2))
    return x[a:b]


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def main():
    mdir = sys.argv[1]
    k = Kokoro(os.path.join(mdir, 'kokoro-v1.0.onnx'), os.path.join(mdir, 'voices-v1.0.bin'))
    sr = 24000
    track = np.zeros(int((DUR + 1) * sr), dtype=np.float32)
    timing = []
    for start, end, text in LINES:
        win = end - start
        speed = BASE_SPEED
        while True:
            s, sr = k.create(text, voice=VOICE, speed=speed, lang='en-us')
            s = trim(s, sr)
            d = len(s) / sr
            if d <= win or speed >= MAX_SPEED:
                break
            speed = min(MAX_SPEED, speed * min(1.12, d / win + .02))
        flag = '' if d <= win else f'  OVERRUN {d - win:+.2f}s'
        print(f'{start:6.2f}  {d:4.2f}s / {win:4.2f}s  x{speed:.2f}  {text}{flag}')
        i = int(start * sr)
        fade = np.ones(len(s), dtype=np.float32)
        n = min(len(s) // 4, int(.01 * sr))
        fade[:n] = np.linspace(0, 1, n); fade[-n:] = np.linspace(1, 0, n)
        track[i:i + len(s)] += s * fade
        cap = text
        for a, b in CAPTION_FIX.items():
            cap = cap.replace(a, b)
        timing.append({'start': round(start, 3), 'end': round(start + d, 3), 'speed': round(speed, 3), 'text': text, 'caption': cap})
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    raw = os.path.join(HERE, 'out', 'vo_24k.wav')
    sf.write(raw, track[:int(DUR * sr)], sr)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-ar', '48000', os.path.join(HERE, 'out', 'vo.wav')], check=True)
    with open(os.path.join(HERE, 'out', 'vo_timing.json'), 'w') as f:
        json.dump({'voice': VOICE, 'lines': timing}, f, indent=1)
    with open(os.path.join(HERE, 'captions_en.srt'), 'w') as f:
        for n, l in enumerate(timing, 1):
            nxt = timing[n]['start'] - .02 if n < len(timing) else DUR
            f.write(f"{n}\n{srt_time(l['start'])} --> {srt_time(min(l['end'] + .15, nxt))}\n{l['caption']}\n\n")
    print('wrote out/vo.wav, out/vo_timing.json, captions_en.srt')


if __name__ == '__main__':
    main()
