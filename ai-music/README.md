# AI music for free (Colab + Kaggle)

Make full songs with vocals from your own lyrics and a style description, using [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) on free cloud GPUs. ACE-Step's code and weights are MIT-licensed.

| | [`ACE_Step_Free_Colab.ipynb`](ACE_Step_Free_Colab.ipynb) | [`ACE_Step_XL_Free_Kaggle.ipynb`](ACE_Step_XL_Free_Kaggle.ipynb) |
|---|---|---|
| Platform | Google Colab, free T4 | Kaggle, free T4 x2 |
| Song model | 2B turbo | **XL 4B turbo** (better quality) |
| Why that model | Colab's ~12.7 GB RAM can't load XL | Kaggle's ~29 GB RAM can |
| How you use it | ACE-Step's web studio, through a link | Cells in the notebook: write → listen to takes → fix → master |
| Free GPU time | Varies; Colab may refuse when busy | ~30 h per week |
| Saves to | Google Drive | `/kaggle/working`, plus a zip download |

Both notebooks master the finished songs. You can match the loudness and tone of a professional reference track ([Matchering](https://github.com/sergree/matchering)) or normalize to −14 LUFS.

## Getting started

**Colab:** [Open in Colab](https://colab.research.google.com/github/akshay-evalgent/Claude-new/blob/main/ai-music/ACE_Step_Free_Colab.ipynb). This link works once this folder is on `main`; for a private repo, tick *Include private repos*. Then set Runtime → T4 GPU and run the cells in order.

**Kaggle:**
1. Download the `.ipynb`. On Kaggle, go to **Create → New Notebook → File → Import Notebook**.
2. In Settings, set **Accelerator: GPU T4 x2** (not P100) and **Internet: On**. Internet needs a phone-verified account.
3. Run the cells in order.

The Kaggle version runs everything inside the notebook, with no public links or tunnels. That keeps it within Kaggle's rules for personal use.

## How close to Suno is this?

The most recent public comparison is WildSongBench (Sept 2026), run by the YuE2 team. Higher SongBench is better; lower PER means clearer lyrics.

| System | SongBench avg ↑ | Lyric error (PER) ↓ | Runs free? |
|---|---:|---:|---|
| YuE2 (best of 8) | 6.96 | 9.8% | ❌ needs a 24 GB GPU with BF16 |
| Suno v5 | 6.87 | 8.1% | (paid service) |
| Suno v4.5 | 6.70 | 5.8% | (paid service) |
| LeVo 2 | 6.32 | 26.1% | ⚠️ needs 10–24 GB; license unclear |
| HeartMuLa 3B | 6.25 | 10.7% | ⚠️ recommended 16–24 GB GPU |
| **ACE-Step 1.5** | **6.01** | **7.5%** | ✅ Colab (2B) and Kaggle (XL) |

What this means in practice:

- ACE-Step 1.5 sings lyrics as clearly as Suno v5, but its overall musicality is a step behind.
- Generating several takes and keeping the best, then mastering, narrows the gap. That best-of-N approach is how YuE2 overtook Suno v5 in this benchmark.
- The benchmark doesn't say which ACE-Step variant it tested.

All of these scores come from developers' own benchmarks, not independent blind tests.

**Why not YuE2 on Kaggle?** Kaggle's free T4s have 16 GB each and no BF16 hardware. YuE2 can't split its model across the two GPUs, and nobody has reported it working on a T4. On a paid 24 GB BF16 GPU (an L4 or A100) it's the open model these benchmarks put closest to Suno. Its weights are free for individual creators, who may sell what they make; companies need a license.

## Tips for better songs

- **Caption:** describe the track like a producer would: genre, tempo feel, instruments, vocal type, mood, mix ("polished, wide, radio-ready"). Don't use artist names.
- **Lyrics:** structure them with `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Bridge]`, `[Outro]`. Instrument cues work too, e.g. `[Instrumental Break - Synth Solo]`. For an instrumental, use `[Instrumental]`.
- **Takes:** make 2–4 per round, a few rounds, and keep the best. Fix a single weak section with **Repaint**.
- **Master** with a reference track in a similar genre.
