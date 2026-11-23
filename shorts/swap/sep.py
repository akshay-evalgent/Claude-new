import numpy as np, soundfile as sf, torch
from demucs.pretrained import get_model
from demucs.apply import apply_model
y, sr = sf.read("seg.wav", dtype="float32")
m = get_model("htdemucs"); m.eval()
x = torch.tensor(y.T)[None]
ref = x.mean(1, keepdim=True); mu, sd = ref.mean(), ref.std()
with torch.no_grad():
    out = apply_model(m, (x - mu) / sd, device="cpu", shifts=1, split=True, overlap=0.25)[0] * sd + mu
names = m.sources; print(names)
voc = out[names.index("vocals")].numpy().T
sf.write("vocals.wav", voc, sr); sf.write("novocals.wav", y - voc, sr)
print("ok", voc.shape)
