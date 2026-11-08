# When a run fails

Every retry costs about 13 minutes of the user's weekly Kaggle GPU quota (~30 h), so find
the cause before running again. Decode the log first:

```bash
python3 "$SKILL_DIR/scripts/read_kaggle_log.py" <run-dir>/ace-step-song-runner.log --stages
python3 "$SKILL_DIR/scripts/read_kaggle_log.py" <run-dir>/ace-step-song-runner.log --tail 120
```

`--stages` shows how far the run got (install → models loaded → takes generated →
mastering) and the `[engine]` lines; a healthy start has `planner backend=pt` and
`song model dtype=torch.float32`.

## Known failures

| Log shows | Cause | Fix |
|---|---|---|
| `ValueError: Key backend: 'module://matplotlib_inline.backend_inline' is not a valid value for backend` right after "Loading the models" | The engine subprocess inherited Kaggle's Jupyter matplotlib backend, which ACE-Step's venv lacks | The bundled notebook sets `MPLBACKEND="Agg"` for every subprocess. Seeing this means an old copy of the notebook was used. |
| `Generating: 0%\| … 0/2 [06:00<?, …]` repeating with the timer frozen, then `TimeoutError: … took longer than 75 min` | nano-vllm's scheduler loops forever once its KV cache is full (`LM_BACKEND = "vllm"`, several takes, long song) | Keep `LM_BACKEND = "pt"` (the bundled default). |
| `Generation produced NaN or Inf latents (… dtype=torch.float16 …)` | A T4 has no bfloat16, so ACE-Step runs the song model in float16, which overflows. Happens with both XL and 2B. (The `ACESTEP_DTYPE=float32` hint in that message does nothing at the pinned commit.) | The install step patches ACE-Step to float32. Check the log for `Patched ACE-Step` and `song model dtype=torch.float32`. |
| `RuntimeError: Couldn't apply the float32 patch` | ACE-Step's code changed (only possible with `ACESTEP_VERSION = "latest"`) | Use the pinned version. |
| `CUDA out of memory` / `OutOfMemoryError` | Song too long or too many takes for 15 GB, most likely with XL in float32 | Fewer takes, a set `duration` (e.g. 150), or the 2B model. |
| `No GPU attached` or `P100 isn't supported` | Wrong accelerator, or the account can't use GPUs | The runner requests T4. The Kaggle account must be phone-verified. |
| `No internet` | Internet is off for unverified accounts | Phone-verify the Kaggle account (kaggle.com/settings). |
| `401` / `403` / `Unauthorized` from the `kaggle` CLI | Token missing, wrong or expired | Make a new token at kaggle.com/settings/api and update `KAGGLE_API_TOKEN`. |
| Push refused mentioning quota or limits | Weekly GPU quota used up | Wait for the weekly reset (shown on kaggle.com/settings). |
| `Still QUEUED/RUNNING after N min` from the runner | Kaggle was busy, or the run is just slow | The notebook keeps running on Kaggle. Check `kaggle kernels status <user>/ace-step-song-runner`, and when it says COMPLETE, download with `kaggle kernels output <user>/ace-step-song-runner -p <dir> -o --file-pattern '.*\.(mp3|json|log)$'`, then run `check_songs.py`. |
| `check_songs.py` says a take is byte-identical or mostly silent | Generation went wrong without raising an error | Look at the log around "Take 1:"; try once more with a different caption or a set duration. |

## Unknown failures

Read the traceback from the bottom up. The last lines of an ACE-Step error usually name
the cause. If you can't tell what went wrong, or the fix would mean editing ACE-Step code,
explain what you found and ask the user before spending more quota. If the user asks for a
fix you can't verify, say it's untested.

## Watching a run: avoid buffered filters

When watching the runner's log with Monitor, `tail -f file | awk …` or `| grep` without
`--line-buffered` can buffer everything and report nothing. A bash read loop emits each line
as it arrives; see the Monitor command in SKILL.md.
