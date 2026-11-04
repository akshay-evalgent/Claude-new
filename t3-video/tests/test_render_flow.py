"""Control-flow test for render.py's encode and worker stages, against a fake diffsynth on CPU.

Covers prompt-embedding lookup, GPU sharding, skip-existing, per-shot failure
isolation, the fp32 VAE fallback, the pre-shot time check and the mid-shot
StepClock abort. It does not touch the real model; see test_lowmem.py for the math.
Run: python tests/test_render_flow.py
"""
import json
import os
import sys
import tempfile
import textwrap
import time

import torch

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HERE)
import render  # noqa: E402

FAKE = {
    "diffsynth/__init__.py": "def load_state_dict(path):\n    return {'loaded': path}\n",
    "diffsynth/models/__init__.py": "",
    "diffsynth/models/wan_video_dit.py": textwrap.dedent("""
        FLASH_ATTN_3_AVAILABLE = FLASH_ATTN_2_AVAILABLE = SAGE_ATTN_AVAILABLE = True
        class WanModel:
            def patchify(self, x, control_camera_latents_input=None):
                return x, None
        class DiTBlock:
            pass
        class Head:
            pass
    """),
    "diffsynth/data/__init__.py": "",
    "diffsynth/data/video.py": textwrap.dedent("""
        def save_video(frames, path, fps, quality=9):
            assert path.endswith('.mp4'), path
            with open(path, 'w') as f:
                f.write(f'{len(frames)} frames @ {fps}')
    """),
    "diffsynth/pipelines/__init__.py": "",
    "diffsynth/pipelines/wan_video_new.py": textwrap.dedent("""
        import os, time, torch
        from dataclasses import dataclass
        CALLS = []

        @dataclass
        class ModelConfig:
            path: str = None

        class Prompter:
            def encode_prompt(self, prompt, positive=True, device='cuda'):
                return torch.full((1, 4, 8), float(len(prompt)))

        class VAE:
            dtype = torch.float16
            nan_once = os.environ.get('FAKE_NAN_VAE') == '1'
            def to(self, dtype):
                CALLS.append(('vae.to', dtype)); self.dtype = dtype; return self
            def decode(self, latents, device, tiled=False, tile_size=None, tile_stride=None):
                CALLS.append(('decode', latents.dtype, tile_size, tile_stride))
                if VAE.nan_once:
                    VAE.nan_once = False
                    return torch.full((3,), float('nan'))
                return torch.zeros(3)

        class DiT:
            def load_state_dict(self, sd):
                CALLS.append(('dit.load', sd['loaded']))

        class WanVideoPipeline:
            torch_dtype = torch.float16
            def __init__(self):
                self.prompter, self.vae, self.dit = Prompter(), VAE(), DiT()
            @staticmethod
            def from_pretrained(torch_dtype, device, model_configs, tokenizer_config, redirect_common_files):
                CALLS.append(('from_pretrained', [c.path for c in model_configs], tokenizer_config.path))
                return WanVideoPipeline()
            def __call__(self, prompt, negative_prompt, seed, height, width, num_frames, tiled, tile_size,
                         tile_stride, cfg_scale, cfg_merge, num_inference_steps, progress_bar_cmd):
                if prompt.startswith('CRASH'):
                    raise RuntimeError('simulated crash')
                pos = self.prompter.encode_prompt(prompt, positive=None, device='cpu')
                neg = self.prompter.encode_prompt(negative_prompt, positive=None, device='cpu')
                assert pos.dtype == torch.float16 and float(pos[0, 0, 0]) == len(prompt)
                assert float(neg[0, 0, 0]) == len(negative_prompt)
                assert (height, width, num_frames, cfg_merge) == (2176, 3840, 81, False)
                CALLS.append(('call', prompt, seed, num_inference_steps, cfg_scale))
                for _ in progress_bar_cmd(torch.arange(num_inference_steps)):
                    time.sleep(float(os.environ.get('FAKE_STEP_S', '0')))
                self.vae.decode(torch.zeros(2), device='cpu', tiled=tiled, tile_size=tile_size, tile_stride=tile_stride)
                return ['frame'] * num_frames
    """),
}


def fake_cuda():
    torch.cuda.get_device_capability = lambda *a: (7, 5)
    torch.cuda.get_device_name = lambda *a: "Fake T4"
    torch.cuda.memory_allocated = torch.cuda.max_memory_allocated = lambda *a: 0
    torch.cuda.reset_peak_memory_stats = lambda *a: None


def make_job(tmp, shots, deadline_s=10 ** 6, num_gpus=1):
    for rel, src in FAKE.items():
        path = os.path.join(tmp, "src", rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(src)
    w = {k: f"/w/{k}" for k in ("t5", "dit", "vae", "t3", "tok")}
    return dict(shots=shots, steps=3, negative="no blur", weights=w, t3_src=os.path.join(tmp, "src"),
                work=tmp, out=os.path.join(tmp, "out"), num_gpus=num_gpus,
                ctx_path=os.path.join(tmp, "ctx.pt"), deadline=time.time() + deadline_s)


def save_ctx(job, prompts):
    torch.save({p: torch.full((1, 4, 8), float(len(p))) for p in set(prompts) | {job["negative"]}}, job["ctx_path"])


def fresh_fake_modules():
    for k in [k for k in sys.modules if k == "diffsynth" or k.startswith("diffsynth.")]:
        del sys.modules[k]


def main():
    fake_cuda()
    logs = []
    render.log = lambda *a: logs.append(" ".join(map(str, a)))
    shots = [{"id": "a", "prompt": "valley at dawn", "seed": 1},
             {"id": "b", "prompt": "CRASH storm", "seed": 2},
             {"id": "c", "prompt": "city at night", "seed": 3, "steps": 2, "cfg_scale": 4.0},
             {"id": "d", "prompt": "desert dunes", "seed": 4}]
    with tempfile.TemporaryDirectory() as tmp:
        job = make_job(tmp, shots)
        render.encode(job)
        ctx = torch.load(job["ctx_path"])
        assert set(ctx) == {s["prompt"] for s in shots} | {"no blur"}, set(ctx)
        from diffsynth.models import wan_video_dit as m
        assert not (m.FLASH_ATTN_2_AVAILABLE or m.FLASH_ATTN_3_AVAILABLE or m.SAGE_ATTN_AVAILABLE)
        import lowmem
        assert m.DiTBlock.forward is lowmem.block_forward
        print("encode: every prompt and the negative cached; flash/sage disabled on sm75; lowmem applied")

        os.makedirs(os.path.join(job["out"], "renders"))
        open(os.path.join(job["out"], "renders", "d.mp4"), "w").close()   # already rendered
        render.worker(job, 0)
        from diffsynth.pipelines.wan_video_new import CALLS
        r = os.path.join(job["out"], "renders")
        assert sorted(os.listdir(r)) == ["a.json", "a.mp4", "c.json", "c.mp4", "d.mp4"], os.listdir(r)
        assert any("b FAILED" in x and "simulated crash" in x for x in logs)
        calls = [c for c in CALLS if c[0] == "call"]
        assert [c[1] for c in calls] == ["valley at dawn", "city at night"], calls
        assert calls[1][3:] == (2, 4.0), calls[1]
        assert ("dit.load", "/w/t3") in CALLS
        assert all(c[2:] == ((68, 120), (34, 60)) for c in CALLS if c[0] == "decode")
        meta = json.load(open(os.path.join(r, "a.json")))
        assert meta["steps"] == 3 and meta["size"] == "3840x2176" and meta["frames"] == 81
        assert os.path.exists(os.path.join(job["out"], "latents", "a.pt"))
        assert not [f for f in os.listdir(r) if "part" in f]
        print("worker: renders a and c, isolates b's crash, skips existing d, sidecar + latents written")

    for gpu, want in ((0, ["valley at dawn", "city at night"]), (1, ["CRASH storm", "desert dunes"])):
        with tempfile.TemporaryDirectory() as tmp:
            fresh_fake_modules()
            job = make_job(tmp, shots, num_gpus=2)
            save_ctx(job, [s["prompt"] for s in shots])
            logs.clear()
            render.worker(job, gpu)
            assert f"shots {[s['id'] for s in shots[gpu::2]]}" in " ".join(logs), logs[:2]
            from diffsynth.pipelines.wan_video_new import CALLS
            assert [c[1] for c in CALLS if c[0] == "call"] == [p for p in want if not p.startswith("CRASH")]
    print("sharding: gpu0 gets shots 0,2; gpu1 gets 1,3")

    with tempfile.TemporaryDirectory() as tmp:
        fresh_fake_modules()
        os.environ["FAKE_NAN_VAE"] = "1"
        job = make_job(tmp, shots[:1])
        save_ctx(job, ["valley at dawn"])
        logs.clear()
        render.worker(job, 0)
        os.environ.pop("FAKE_NAN_VAE")
        from diffsynth.pipelines.wan_video_new import CALLS
        assert [c for c in CALLS if c[0] == "vae.to"] == [("vae.to", torch.float32), ("vae.to", torch.float16)]
        assert len([c for c in CALLS if c[0] == "decode"]) == 2
        assert any("decoding again in fp32" in x for x in logs)
        assert os.path.exists(os.path.join(job["out"], "renders", "a.mp4"))
    print("fp16 VAE NaN -> fp32 re-decode -> back to fp16")

    with tempfile.TemporaryDirectory() as tmp:
        fresh_fake_modules()
        job = make_job(tmp, shots[:1], deadline_s=60)   # default estimate needs hours
        save_ctx(job, ["valley at dawn"])
        logs.clear()
        render.worker(job, 0)
        assert any("stopping before a" in x for x in logs) and not os.path.exists(
            os.path.join(job["out"], "renders", "a.mp4"))
    print("pre-shot check: refuses a shot that cannot finish before the deadline")

    with tempfile.TemporaryDirectory() as tmp:
        fresh_fake_modules()
        render.DEFAULT_STEP_SECONDS, render.DEFAULT_DECODE_SECONDS = 0.01, 0
        os.environ["FAKE_STEP_S"] = "0.2"
        job = make_job(tmp, [dict(shots[0], steps=4)], deadline_s=300.3)
        save_ctx(job, ["valley at dawn"])
        logs.clear()
        render.worker(job, 0)
        os.environ.pop("FAKE_STEP_S")
        assert any("a abandoned" in x for x in logs), logs
        assert any("step 1/4" in x for x in logs) and not any("step 4/4" in x for x in logs)
    print("StepClock: abandons a shot mid-denoise once the measured pace cannot make the deadline")
    print("ALL PASS")


if __name__ == "__main__":
    main()
