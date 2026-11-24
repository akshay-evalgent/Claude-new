"""Narration lines (vo/lines.txt, as captioned) -> vo/l<n>.wav with Kokoro.
   python vo/make.py <kokoro-v1.0.onnx> <voices-v1.0.bin>
SAY respells words the voice gets wrong; the captions keep the real spelling."""
import sys, soundfile as sf
from kokoro_onnx import Kokoro
SAY = {'2013,': 'twenty thirteen,', 'Okene': 'Oh-kenna'}
k = Kokoro(sys.argv[1], sys.argv[2])
for i, line in enumerate(open('vo/lines.txt').read().strip().split('\n')):
    spoken = ' '.join(SAY.get(w, w) for w in line.split())
    x, sr = k.create(spoken, voice='am_michael', speed=1.1, lang='en-us'); sf.write(f'vo/l{i + 1}.wav', x, sr, subtype='PCM_16'); print(i + 1, round(len(x) / sr, 2))
