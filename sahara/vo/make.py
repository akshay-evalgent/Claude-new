import sys, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro(sys.argv[1], sys.argv[2])
for i, line in enumerate(open('vo/lines.txt').read().strip().split('\n')):
    x, sr = k.create(line, voice='am_michael', speed=1.08, lang='en-us'); sf.write(f'vo/l{i + 1}.wav', x, sr, subtype='PCM_16'); print(i + 1, round(len(x) / sr, 2))
