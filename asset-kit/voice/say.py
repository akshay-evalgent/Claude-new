"""Natural narration with Kokoro-82M (Apache 2.0) through its ONNX build: no GPU, no PyTorch.

  pip install kokoro-onnx soundfile
  # model files: https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
  python say.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin --voice am_michael --speed 1.0 "Text to say" out.wav
"""
import argparse, soundfile as sf
from kokoro_onnx import Kokoro
p = argparse.ArgumentParser(); p.add_argument('--model'); p.add_argument('--voices'); p.add_argument('--voice', default='am_michael')
p.add_argument('--speed', type=float, default=1.0); p.add_argument('text'); p.add_argument('out')
a = p.parse_args()
k = Kokoro(a.model, a.voices)
samples, sr = k.create(a.text, voice=a.voice, speed=a.speed, lang='en-us')
sf.write(a.out, samples, sr); print(f'{a.out}: {len(samples) / sr:.2f}s at {sr} Hz')
