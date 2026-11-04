"""CPU check that lowmem.py computes what T3-Video's reference DiT block computes.

The reference below is a transcription of the math in zhangzjn/T3-Video
diffsynth/models/wan_video_dit.py (rope_apply in float64, RMSNorm, the
remote/close window attention, CrossAttention, DiTBlock.forward, Head.forward),
on a small grid so it runs in seconds. Run: python tests/test_lowmem.py
"""
import math
import os
import sys
import types

import torch
import torch.nn as nn
import torch.nn.functional as F
from einops import rearrange

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import lowmem  # noqa: E402

torch.manual_seed(0)


# ---------------- reference (original math) ----------------
def flash_attention(q, k, v, num_heads):
    q = rearrange(q, "b s (n d) -> b n s d", n=num_heads)
    k = rearrange(k, "b s (n d) -> b n s d", n=num_heads)
    v = rearrange(v, "b s (n d) -> b n s d", n=num_heads)
    x = F.scaled_dot_product_attention(q, k, v)
    return rearrange(x, "b n s d -> b s (n d)", n=num_heads)


def modulate(x, shift, scale):
    return x * (1 + scale) + shift


def precompute_freqs_cis(dim, end=1024, theta=10000.0):
    freqs = 1.0 / (theta ** (torch.arange(0, dim, 2)[: (dim // 2)].double() / dim))
    freqs = torch.outer(torch.arange(end, device=freqs.device), freqs)
    return torch.polar(torch.ones_like(freqs), freqs)


def precompute_freqs_cis_3d(dim, end=1024, theta=10000.0):
    return (precompute_freqs_cis(dim - 2 * (dim // 3), end, theta),
            precompute_freqs_cis(dim // 3, end, theta),
            precompute_freqs_cis(dim // 3, end, theta))


def rope_apply(x, freqs, num_heads):
    x = rearrange(x, "b s (n d) -> b s n d", n=num_heads)
    x_out = torch.view_as_complex(x.to(torch.float64).reshape(x.shape[0], x.shape[1], x.shape[2], -1, 2))
    x_out = torch.view_as_real(x_out * freqs).flatten(2)
    return x_out.to(x.dtype)


class RMSNorm(nn.Module):
    def __init__(self, dim, eps=1e-5):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim) + 0.1 * torch.randn(dim))

    def forward(self, x):
        dtype = x.dtype
        x32 = x.float()
        return (x32 * torch.rsqrt(x32.pow(2).mean(dim=-1, keepdim=True) + self.eps)).to(dtype) * self.weight


class AttentionModule(nn.Module):
    def __init__(self, num_heads):
        super().__init__()
        self.num_heads = num_heads

    def forward(self, q, k, v):
        return flash_attention(q, k, v, self.num_heads)


class SelfAttention(nn.Module):
    def __init__(self, dim, num_heads, grid, windows, remote=True, close=True):
        super().__init__()
        self.dim, self.num_heads = dim, num_heads
        self.q, self.k, self.v, self.o = (nn.Linear(dim, dim) for _ in range(4))
        self.norm_q, self.norm_k = RMSNorm(dim, eps=1e-6), RMSNorm(dim, eps=1e-6)
        self.attn = AttentionModule(num_heads)
        self.T, self.H, self.W = grid
        self.n_t, self.n_h, self.n_w = windows
        self.use_remote, self.use_close = remote, close

    def forward(self, x, freqs):
        q = rope_apply(self.norm_q(self.q(x)), freqs, self.num_heads)
        k = rope_apply(self.norm_k(self.k(x)), freqs, self.num_heads)
        v = self.v(x)
        T, H, W = self.T, self.H, self.W
        n_t, n_h, n_w = self.n_t, self.n_h, self.n_w
        w_t, w_h, w_w = T // n_t, H // n_h, W // n_w
        q, k, v = (rearrange(a, "b (t h w) d -> b t h w d", t=T, h=H, w=W) for a in (q, k, v))
        outs = []
        if self.use_remote:
            pat = "b (w_t n_t) (w_h n_h) (w_w n_w) d -> (b n_t n_h n_w) (w_t w_h w_w) d"
            r = [rearrange(a, pat, w_t=w_t, w_h=w_h, w_w=w_w) for a in (q, k, v)]
            outs.append(rearrange(self.attn(*r), "(b n_t n_h n_w) (w_t w_h w_w) d -> b (w_t n_t) (w_h n_h) (w_w n_w) d",
                                  n_t=n_t, n_h=n_h, n_w=n_w, w_t=w_t, w_h=w_h, w_w=w_w))
        if self.use_close:
            pat = "b (n_t w_t) (n_h w_h) (n_w w_w) d -> (b n_t n_h n_w) (w_t w_h w_w) d"
            c = [rearrange(a, pat, w_t=w_t, w_h=w_h, w_w=w_w) for a in (q, k, v)]
            outs.append(rearrange(self.attn(*c), "(b n_t n_h n_w) (w_t w_h w_w) d -> b (n_t w_t) (n_h w_h) (n_w w_w) d",
                                  n_t=n_t, n_h=n_h, n_w=n_w, w_t=w_t, w_h=w_h, w_w=w_w))
        x = (outs[0] + outs[1]) / 2 if len(outs) == 2 else outs[0]
        return self.o(rearrange(x, "b t h w d -> b (t h w) d"))


class CrossAttention(nn.Module):
    def __init__(self, dim, num_heads):
        super().__init__()
        self.num_heads = num_heads
        self.q, self.k, self.v, self.o = (nn.Linear(dim, dim) for _ in range(4))
        self.norm_q, self.norm_k = RMSNorm(dim, eps=1e-6), RMSNorm(dim, eps=1e-6)
        self.attn = AttentionModule(num_heads)

    def forward(self, x, y):
        q = self.norm_q(self.q(x))
        k = self.norm_k(self.k(y))
        return self.o(self.attn(q, k, self.v(y)))


class DiTBlock(nn.Module):
    def __init__(self, dim, num_heads, ffn_dim, grid, windows, remote=True, close=True):
        super().__init__()
        self.self_attn = SelfAttention(dim, num_heads, grid, windows, remote, close)
        self.cross_attn = CrossAttention(dim, num_heads)
        self.norm1 = nn.LayerNorm(dim, eps=1e-6, elementwise_affine=False)
        self.norm2 = nn.LayerNorm(dim, eps=1e-6, elementwise_affine=False)
        self.norm3 = nn.LayerNorm(dim, eps=1e-6)
        with torch.no_grad():
            self.norm3.weight.add_(0.1 * torch.randn(dim))
            self.norm3.bias.add_(0.1 * torch.randn(dim))
        self.ffn = nn.Sequential(nn.Linear(dim, ffn_dim), nn.GELU(approximate="tanh"), nn.Linear(ffn_dim, dim))
        self.modulation = nn.Parameter(torch.randn(1, 6, dim) / dim ** 0.5)

    def forward(self, x, context, t_mod, freqs):
        has_seq = len(t_mod.shape) == 4
        mods = (self.modulation.to(dtype=t_mod.dtype, device=t_mod.device) + t_mod).chunk(6, dim=2 if has_seq else 1)
        if has_seq:
            mods = [m.squeeze(2) for m in mods]
        shift_msa, scale_msa, gate_msa, shift_mlp, scale_mlp, gate_mlp = mods
        x = x + gate_msa * self.self_attn(modulate(self.norm1(x), shift_msa, scale_msa), freqs)
        x = x + self.cross_attn(self.norm3(x), context)
        x = x + gate_mlp * self.ffn(modulate(self.norm2(x), shift_mlp, scale_mlp))
        return x


class Head(nn.Module):
    def __init__(self, dim, out_dim):
        super().__init__()
        self.norm = nn.LayerNorm(dim, eps=1e-6, elementwise_affine=False)
        self.head = nn.Linear(dim, out_dim)
        self.modulation = nn.Parameter(torch.randn(1, 2, dim) / dim ** 0.5)

    def forward(self, x, t_mod):
        if len(t_mod.shape) == 3:
            shift, scale = (self.modulation.unsqueeze(0) + t_mod.unsqueeze(2)).chunk(2, dim=2)
            return self.head(self.norm(x) * (1 + scale.squeeze(2)) + shift.squeeze(2))
        shift, scale = (self.modulation + t_mod).chunk(2, dim=1)
        return self.head(self.norm(x) * (1 + scale) + shift)


# ---------------- harness ----------------
DIM, HEADS, FFN, CTX = 96, 4, 192, 7          # head_dim 24 keeps the 3-D RoPE split even
GRID = (6, 8, 12)                             # (T, H, W) latent-token grid, N = 576
N = math.prod(GRID)
# the five T3 layer patterns, scaled to this grid, plus full attention
WINDOWS = [(6, 1, 1), (1, 4, 6), (1, 2, 4), (3, 4, 2), (2, 2, 3), (1, 1, 1)]


def make_freqs():
    f, h, w = GRID
    fr = precompute_freqs_cis_3d(DIM // HEADS)
    return torch.cat([fr[0][:f].view(f, 1, 1, -1).expand(f, h, w, -1),
                      fr[1][:h].view(1, h, 1, -1).expand(f, h, w, -1),
                      fr[2][:w].view(1, 1, w, -1).expand(f, h, w, -1)], dim=-1).reshape(N, 1, -1)


def inputs(dtype, has_seq):
    x = torch.randn(1, N, DIM, dtype=dtype)
    ctx = torch.randn(1, CTX, DIM, dtype=dtype)
    t_mod = 0.3 * torch.randn((1, N, 6, DIM) if has_seq else (1, 6, DIM), dtype=dtype)
    return x, ctx, t_mod


def rel_err(a, b):
    return ((a.double() - b.double()).norm() / b.double().norm()).item()


def check_block(windows, remote=True, close=True, has_seq=False, attn_tokens=50, token_chunk=37):
    blk = DiTBlock(DIM, HEADS, FFN, GRID, windows, remote, close).double()
    x, ctx, t_mod = inputs(torch.float64, has_seq)
    freqs = make_freqs()
    lowmem.CFG.update(attn_tokens=attn_tokens, token_chunk=token_chunk)
    with torch.no_grad():
        ref = blk(x, ctx, t_mod, freqs)
        out = lowmem.block_forward(blk, x.clone(), ctx, t_mod, freqs)
    err = rel_err(out, ref)
    assert err < 1e-10, (windows, remote, close, has_seq, err)
    return err


def check_head(has_seq):
    hd = Head(DIM, 64).double()
    x = torch.randn(1, N, DIM, dtype=torch.float64)
    t = torch.randn((1, N, DIM) if has_seq else (1, DIM), dtype=torch.float64)
    lowmem.CFG.update(token_chunk=37)
    with torch.no_grad():
        err = rel_err(lowmem.head_forward(hd, x, t), hd(x, t))
    assert err < 1e-12, err
    return err


def check_low_precision(dtype):
    blk = DiTBlock(DIM, HEADS, FFN, GRID, (1, 4, 6)).double()
    x, ctx, t_mod = inputs(torch.float64, False)
    freqs = make_freqs()
    with torch.no_grad():
        ref = blk(x, ctx, t_mod, freqs)
        blk_lp = blk.to(dtype)
        out = lowmem.block_forward(blk_lp, x.to(dtype), ctx.to(dtype), t_mod.to(dtype), freqs)
    assert out.dtype == torch.float32, out.dtype   # residual stream promoted to fp32
    err = rel_err(out, ref)
    assert err < 3e-2, (dtype, err)
    return err


def check_oom_retry():
    blk = DiTBlock(DIM, HEADS, FFN, GRID, (1, 2, 4)).double()
    x, ctx, t_mod = inputs(torch.float64, False)
    freqs = make_freqs()
    logs, orig_attn, orig_cross = [], lowmem._attn, blk.cross_attn.forward
    state = {"attn": 0, "cross": 0}

    def flaky_attn(*a):
        state["attn"] += 1
        if state["attn"] == 2:
            raise torch.cuda.OutOfMemoryError("simulated")
        return orig_attn(*a)

    def flaky_cross(*a):
        state["cross"] += 1
        if state["cross"] == 3:
            raise torch.cuda.OutOfMemoryError("simulated")
        return orig_cross(*a)

    lowmem.CFG.update(attn_tokens=4 * 144, token_chunk=64, log=logs.append)
    lowmem._attn, blk.cross_attn.forward = flaky_attn, flaky_cross
    try:
        with torch.no_grad():
            ref = blk(x, ctx, t_mod, freqs)
            out = lowmem.block_forward(blk, x.clone(), ctx, t_mod, freqs)
    finally:
        lowmem._attn = orig_attn
        lowmem.CFG["log"] = print
    assert len(logs) == 2 and "self-attn" in logs[0] and "ffn" in logs[1], logs
    assert lowmem.CFG["token_chunk"] == 32 and lowmem.CFG["attn_tokens"] == 2 * 144, lowmem.CFG
    err = rel_err(out, ref)
    assert err < 1e-10, err
    return err


def check_window_index():
    T, H, W = GRID
    ids = torch.arange(N).view(1, T, H, W, 1)
    for nt, nh, nw in WINDOWS:
        for remote in (True, False):
            pat = ("b (w_t n_t) (w_h n_h) (w_w n_w) d -> (b n_t n_h n_w) (w_t w_h w_w) d" if remote else
                   "b (n_t w_t) (n_h w_h) (n_w w_w) d -> (b n_t n_h n_w) (w_t w_h w_w) d")
            want = rearrange(ids, pat, n_t=nt, n_h=nh, n_w=nw)[..., 0]
            got = lowmem.window_index(T, H, W, nt, nh, nw, remote, "cpu")
            assert torch.equal(got, want), (nt, nh, nw, remote)


def check_apply_patchify():
    """apply() swaps DiTBlock/Head/patchify on the diffsynth module; patchify must match the original."""
    class WanModel(nn.Module):
        def __init__(self):
            super().__init__()
            self.patch_embedding = nn.Conv3d(16, DIM, kernel_size=(1, 2, 2), stride=(1, 2, 2))
            self.control_adapter = None

        def patchify(self, x, control_camera_latents_input=None):
            x = self.patch_embedding(x)
            grid_size = x.shape[2:]
            return rearrange(x, "b c f h w -> b (f h w) c").contiguous(), grid_size

    fake = types.ModuleType("diffsynth.models.wan_video_dit")
    fake.WanModel, fake.DiTBlock, fake.Head = WanModel, DiTBlock, Head
    pkg, sub = types.ModuleType("diffsynth"), types.ModuleType("diffsynth.models")
    pkg.models, sub.wan_video_dit = sub, fake
    sys.modules.update({"diffsynth": pkg, "diffsynth.models": sub, "diffsynth.models.wan_video_dit": fake})
    model = WanModel().to(torch.bfloat16)
    lat = torch.randn(1, 16, 6, 16, 24, dtype=torch.bfloat16)
    with torch.no_grad():
        ref, g_ref = model.patchify(lat)
        lowmem.apply()
        out, g = model.patchify(lat)
    assert DiTBlock.forward is lowmem.block_forward and Head.forward is lowmem.head_forward
    assert tuple(g) == tuple(g_ref) and out.dtype == torch.float32 and out.is_contiguous()
    assert torch.equal(out, ref.float())


if __name__ == "__main__":
    check_window_index()
    print("window index matches reference rearranges")
    for w in WINDOWS:
        print(f"block {w}: rel err {check_block(w):.2e}")
    print(f"remote only: {check_block((1, 4, 6), close=False):.2e}  close only: {check_block((1, 4, 6), remote=False):.2e}")
    print(f"per-token modulation: {check_block((3, 4, 2), has_seq=True):.2e}")
    print(f"one chunk for everything: {check_block((1, 2, 4), attn_tokens=10**9, token_chunk=10**9):.2e}")
    print(f"head: {check_head(False):.2e}  head per-token: {check_head(True):.2e}")
    print(f"OOM retry path: {check_oom_retry():.2e}")
    for dt in (torch.bfloat16, torch.float16):
        print(f"{dt} weights, fp32 residual vs fp64 reference: rel err {check_low_precision(dt):.2e}")
    check_apply_patchify()
    print("apply() + patchify OK")
    print("ALL PASS")
