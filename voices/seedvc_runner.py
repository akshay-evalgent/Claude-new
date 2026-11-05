#!/usr/bin/env python3
"""Run Seed-VC's own inference.py on this machine, with two small compatibility fixes.

Called by convert_recording.py (engine "local"); takes the same arguments as Seed-VC's
inference.py. Seed-VC's code is left untouched:
  - torchaudio 2.9+ moved audio saving to the separate torchcodec package, so saving goes
    through soundfile instead
  - on a machine without a GPU, its Whisper encoder loads in float32 rather than float16,
    which is faster and more accurate on a CPU
  - its bundled BigVGAN vocoder gets the two loading arguments newer huggingface_hub no
    longer passes
"""
import os
import runpy
import sys
from pathlib import Path

SEEDVC = Path(os.environ.get('VOICES_VENDOR', Path.home() / '.voices-vendor')) / 'seed-vc'


def main():
    if not (SEEDVC / 'inference.py').exists():
        raise SystemExit(f'Seed-VC not found at {SEEDVC}: run  bash voices/setup.sh')
    import soundfile as sf
    import torch
    import torchaudio
    import transformers

    def save(path, wave, sr, **_):
        sf.write(str(path), wave.detach().cpu().numpy().T, sr)
    torchaudio.save = save

    if not torch.cuda.is_available():
        original = transformers.WhisperModel.from_pretrained.__func__
        transformers.WhisperModel.from_pretrained = classmethod(
            lambda cls, *a, **k: original(cls, *a, **{**k, 'torch_dtype': torch.float32}))

    os.chdir(SEEDVC)  # its code expects to run from its own folder (configs/, checkpoints/)
    sys.path.insert(0, str(SEEDVC))

    # huggingface_hub 1.x stopped passing these two arguments to _from_pretrained, which
    # Seed-VC's bundled BigVGAN still requires; supply the old defaults
    from modules.bigvgan import bigvgan
    original_fp = bigvgan.BigVGAN._from_pretrained.__func__
    bigvgan.BigVGAN._from_pretrained = classmethod(
        lambda cls, *a, proxies=None, resume_download=False, **k:
            original_fp(cls, *a, proxies=proxies, resume_download=resume_download, **k))
    sys.argv = ['inference.py', *sys.argv[1:]]
    runpy.run_path('inference.py', run_name='__main__')


if __name__ == '__main__':
    main()
