"""Low-VRAM forward pass for T3-Video so native 4K fits on one 16 GB Kaggle T4.

T3-Video (zhangzjn/T3-Video, diffsynth/models/wan_video_dit.py) denoises
685,440 tokens per forward pass at 2176x3840x81. Its reference code needs about
48 GB, mostly for full-length intermediates rather than weights:

* RoPE upcasts q and k for every token to float64 (about 8 GB each);
* q/k/v plus two rearranged copies for the "remote" and "close" window passes;
* a 685,440 x 8960 feed-forward intermediate (about 12 GB).

This module keeps the same math and changes only the memory schedule:

* self-attention runs a few windows at a time; q/k/v are computed only for the
  tokens in those windows and the two passes are averaged into one buffer
  (o() is linear, so o((a + b) / 2) == (o(a) + o(b)) / 2 is unchanged);
* RoPE runs per chunk in float32 (float64 when the model itself is float64);
* the output projection, cross-attention, FFN and head run over token chunks;
* with fp16/bf16 weights the residual stream is kept in float32, which T4s
  (no bf16) need to stay clear of fp16 overflow;
* on CUDA OOM a chunk is retried at half size. Each chunk writes its result
  only as its last step, so a retried chunk is never applied twice.

Peak on a T4 (fp16 weights, fp32 residual): about 12-13 GB.

Usage, after importing T3-Video's diffsynth:
    import lowmem; lowmem.apply()
"""
import torch

CFG = {
    "attn_tokens": 65536,   # tokens per self-attention chunk (whole windows)
    "token_chunk": 32768,   # tokens per chunk for o-proj / cross-attn / FFN / head
    "fp32_residual": True,  # keep the residual stream in fp32 for fp16/bf16 models
    "restrict_sdpa": True,  # on CUDA, forbid the O(L^2)-memory math SDPA fallback
    "log": print,
}

_WINDOW_CACHE = {}
_PATCHED = False


def _res_dtype(dtype):
    if CFG["fp32_residual"] and dtype in (torch.float16, torch.bfloat16):
        return torch.float32
    return dtype


def _rows(t, sel):
    """Per-token modulation tensors are (1, N, D); broadcast ones are (1, 1, D)."""
    return t if t.shape[1] == 1 else t[:, sel]


def _modulate(x, shift, scale):
    return x * (1 + scale) + shift


def window_index(T, H, W, n_t, n_h, n_w, remote, device):
    """Flat token ids for each attention window, shape (n_t*n_h*n_w, w_t*w_h*w_w).

    Matches the reference rearranges:
      remote: 'b (w_t n_t) (w_h n_h) (w_w n_w) d -> (b n_t n_h n_w) (w_t w_h w_w) d'
      close:  'b (n_t w_t) (n_h w_h) (n_w w_w) d -> (b n_t n_h n_w) (w_t w_h w_w) d'
    """
    key = (T, H, W, n_t, n_h, n_w, remote, str(device))
    if key not in _WINDOW_CACHE:
        w_t, w_h, w_w = T // n_t, H // n_h, W // n_w
        idx = torch.arange(T * H * W, device=device).view(T, H, W)
        if remote:
            idx = idx.view(w_t, n_t, w_h, n_h, w_w, n_w).permute(1, 3, 5, 0, 2, 4)
        else:
            idx = idx.view(n_t, w_t, n_h, w_h, n_w, w_w).permute(0, 2, 4, 1, 3, 5)
        _WINDOW_CACHE[key] = idx.reshape(n_t * n_h * n_w, w_t * w_h * w_w).contiguous()
    return _WINDOW_CACHE[key]


def _rope(x, freqs, num_heads):
    """rope_apply from the reference, in float32 (float64 if x is float64)."""
    b, s, _ = x.shape
    real = torch.float64 if x.dtype == torch.float64 else torch.float32
    cplx = torch.complex128 if real == torch.float64 else torch.complex64
    xc = torch.view_as_complex(x.to(real).reshape(b, s, num_heads, -1, 2))
    out = torch.view_as_real(xc * freqs.to(cplx)).flatten(2)
    return out.to(x.dtype)


def _attn(module, q, k, v):
    if q.is_cuda and CFG["restrict_sdpa"]:
        from torch.nn.attention import SDPBackend, sdpa_kernel
        with sdpa_kernel([SDPBackend.FLASH_ATTENTION, SDPBackend.EFFICIENT_ATTENTION]):
            return module.attn(q, k, v)
    return module.attn(q, k, v)


def _chunked(fn, n, size, what):
    """Call fn(i, j) over [0, n) in chunks of `size`, halving on CUDA OOM."""
    i = 0
    while i < n:
        j = min(i + size, n)
        failed = False
        try:
            fn(i, j)
        except torch.cuda.OutOfMemoryError:
            if size == 1:
                raise
            failed = True
        if failed:
            torch.cuda.empty_cache()
            size = max(1, size // 2)
            CFG["log"](f"[lowmem] CUDA OOM in {what}; retrying with chunk {size}")
        else:
            i = j
    return size


def _weight_dtype(module):
    return next(module.parameters()).dtype


def block_forward(self, x, context, t_mod, freqs):
    """Drop-in for DiTBlock.forward. Updates x in place and returns it."""
    has_seq = len(t_mod.shape) == 4
    mods = (self.modulation.to(dtype=t_mod.dtype, device=t_mod.device) + t_mod).chunk(6, dim=2 if has_seq else 1)
    if has_seq:
        mods = [m.squeeze(2) for m in mods]
    shift_msa, scale_msa, gate_msa, shift_mlp, scale_mlp, gate_mlp = mods

    cdt = _weight_dtype(self)
    rdt = _res_dtype(cdt)
    if x.dtype != rdt:
        x = x.to(rdt)
    sa = self.self_attn
    N, D = x.shape[1], x.shape[2]
    T, H, W = sa.T, sa.H, sa.W
    if N != T * H * W:
        raise ValueError(f"T3-Video window layout expects {T}x{H}x{W}={T * H * W} tokens, got {N}. "
                         "The released weights only support 2176x3840, 81 frames.")

    # 1) windowed self-attention, accumulated into acc (pre o-projection)
    acc = torch.zeros((x.shape[0], N, D), dtype=cdt, device=x.device)
    branches = [r for r, on in ((True, sa.use_remote), (False, sa.use_close)) if on]
    for remote in branches:
        win = window_index(T, H, W, sa.n_t, sa.n_h, sa.n_w, remote, x.device)
        nwin, L = win.shape

        def run(i, j, win=win, L=L):
            flat = win[i:j].reshape(-1)
            xs = _modulate(self.norm1(x[:, flat]), _rows(shift_msa, flat), _rows(scale_msa, flat)).to(cdt)
            fr = freqs[flat]
            q = _rope(sa.norm_q(sa.q(xs)), fr, sa.num_heads)
            k = _rope(sa.norm_k(sa.k(xs)), fr, sa.num_heads)
            v = sa.v(xs)
            del xs
            kk = (j - i) * x.shape[0]
            o = _attn(sa, q.reshape(kk, L, D), k.reshape(kk, L, D), v.reshape(kk, L, D))
            acc.index_add_(1, flat, o.reshape(x.shape[0], -1, D), alpha=1.0 / len(branches))

        per0 = max(1, CFG["attn_tokens"] // L)
        per = _chunked(run, nwin, per0, f"self-attn (window {L} tokens)")
        if per < per0:
            CFG["attn_tokens"] = per * L

    # 2) per-token: o-proj + gate, cross-attention, FFN + gate
    def tok(s, e):
        xc = x[:, s:e]
        a = sa.o(acc[:, s:e])
        xc = xc + _rows(gate_msa, slice(s, e)).to(rdt) * a.to(rdt)
        xc = xc + self.cross_attn(self.norm3(xc.to(cdt)), context).to(rdt)
        h = _modulate(self.norm2(xc), _rows(shift_mlp, slice(s, e)), _rows(scale_mlp, slice(s, e))).to(cdt)
        xc = xc + _rows(gate_mlp, slice(s, e)).to(rdt) * self.ffn(h).to(rdt)
        x[:, s:e].copy_(xc)

    CFG["token_chunk"] = _chunked(tok, N, CFG["token_chunk"], "ffn/cross-attn")
    del acc
    return x


def head_forward(self, x, t_mod):
    """Drop-in for Head.forward, chunked over tokens."""
    if len(t_mod.shape) == 3:
        shift, scale = (self.modulation.unsqueeze(0).to(dtype=t_mod.dtype, device=t_mod.device)
                        + t_mod.unsqueeze(2)).chunk(2, dim=2)
        shift, scale = shift.squeeze(2), scale.squeeze(2)
    else:
        shift, scale = (self.modulation.to(dtype=t_mod.dtype, device=t_mod.device) + t_mod).chunk(2, dim=1)
    cdt = _weight_dtype(self.head)
    outs = []
    step = CFG["token_chunk"]
    for s in range(0, x.shape[1], step):
        sl = slice(s, s + step)
        xc = self.norm(x[:, sl])
        outs.append(self.head((xc * (1 + _rows(scale, sl)) + _rows(shift, sl)).to(cdt)))
    return torch.cat(outs, dim=1)


def apply():
    """Monkeypatch T3-Video's diffsynth DiT in place. Call after importing diffsynth."""
    global _PATCHED
    if _PATCHED:
        return
    from diffsynth.models import wan_video_dit as m

    orig_patchify = m.WanModel.patchify

    def patchify(self, x, control_camera_latents_input=None):
        if control_camera_latents_input is not None or self.control_adapter is not None:
            return orig_patchify(self, x, control_camera_latents_input)
        x = self.patch_embedding(x)
        grid = x.shape[2:]
        rdt = _res_dtype(x.dtype)
        x = x.flatten(2).transpose(1, 2).to(dtype=rdt, memory_format=torch.contiguous_format)
        return x, grid

    m.DiTBlock.forward = block_forward
    m.Head.forward = head_forward
    m.WanModel.patchify = patchify
    _PATCHED = True
