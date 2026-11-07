# AI music on free Google Colab

Make full songs with vocals from your own lyrics and a style description, on Colab's free T4 GPU.

**Notebook:** [`ACE_Step_Free_Colab.ipynb`](ACE_Step_Free_Colab.ipynb)

[Open in Colab](https://colab.research.google.com/github/akshay-evalgent/Claude-new/blob/main/ai-music/ACE_Step_Free_Colab.ipynb). This link works once this folder is on `main`. If the repo is private, tick **Include private repos** in Colab's GitHub tab. Or download the `.ipynb` and use **File → Upload notebook**.

## What it does

1. Installs [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) (MIT code and weights) and downloads the models.
2. Launches ACE-Step's own studio web app and gives you a link that works on desktop or phone.
3. Masters your finished songs: either matches the loudness and tone of a professional reference track ([Matchering](https://github.com/sergree/matchering)), or normalizes to −14 LUFS. Saves WAV and 320 kbps MP3 to Google Drive.

The settings in step 1 already suit a T4: the turbo song model, the 1.7B planner, and ACE-Step's automatic FP16 fallback (the T4 has no BF16 support).

## How close to Suno is this?

The most recent public comparison is WildSongBench (Sept 2026), run by the YuE2 team. Higher SongBench is better; lower PER means clearer lyrics.

| System | SongBench avg ↑ | Lyric error (PER) ↓ | Runs on free Colab T4? |
|---|---:|---:|---|
| YuE2 (best of 8) | 6.96 | 9.8% | ❌ needs 24 GB BF16 GPU |
| Suno v5 | 6.87 | 8.1% | (paid service) |
| Suno v4.5 | 6.70 | 5.8% | (paid service) |
| LeVo 2 | 6.32 | 26.1% | ⚠️ needs 10–24 GB; license unclear |
| HeartMuLa 3B | 6.25 | 10.7% | ⚠️ recommended 16–24 GB GPU |
| **ACE-Step 1.5** | **6.01** | **7.5%** | ✅ officially supports 12–16 GB GPUs |

What this means in practice:

- ACE-Step 1.5 sings lyrics as clearly as Suno v5, but its overall musicality is a step behind.
- On a free T4 it's the best option that runs reliably.
- Generating several takes and keeping the best, then mastering, narrows the gap. That best-of-N approach is how YuE2 overtook Suno v5 in this benchmark.

All of these scores come from developers' own benchmarks, not independent blind tests.

**If you outgrow free Colab:** YuE2 ([repo](https://github.com/multimodal-art-projection/YuE)) is the open model these benchmarks put closest to Suno. It needs a 24 GB BF16 GPU, such as a paid Colab L4 or A100 runtime. Its weights are free for individual creators, who may sell what they make; companies need a license.

## Tips for better songs

- **Caption:** describe the track like a producer would: genre, tempo feel, instruments, vocal type, mood, mix ("polished, wide, radio-ready"). Don't use artist names.
- **Lyrics:** structure them with `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Bridge]`, `[Outro]`. Instrument cues work too, e.g. `[Instrumental Break - Synth Solo]`.
- **Batch size 2–4**, a few rounds, keep the best take. Use **Repaint** to fix a single weak section.
- **Master** with a reference track in a similar genre (step 4).
