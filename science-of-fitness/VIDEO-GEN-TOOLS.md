# Free ways to make the episode's character video (November 2026)

Researched 7 November 2026. Free tiers change every few weeks and sources often disagree, so check each site's pricing page before you plan around a number. Treat all figures below as approximate.

## Bottom line

You don't need 73 separate video generations. The fastest free route copies how The Rep Theory works: mostly still illustrations with subtle motion, plus a few real motion clips.

| Step | What | How many | Where |
|---|---|---|---|
| 1 | Character reference sheets | 4–5 images | Gemini (Nano Banana), Flow images, Dreamina or Vidu |
| 2 | **Storyboard grids:** nine story panels per image, same characters | **9 images** for all 73 shots | Same tools, with the reference sheets attached |
| 3 | **Hero clips:** the moments that need real motion | **about 10 videos** | Free daily credits: Kling, Dreamina (Seedance), Flow, PixVerse, Vidu |
| 4 | Slice, upscale, animate, sync to the voiceover | automatic | `scripts/video/assemble_ep01.py` |

That's about 20 generations instead of 73. The prompts are ready in `episodes/ep01-skinny-to-bulky/flow/GRIDS.md` and `SHOTS.md`.

## Video generators with free credits

| Tool | Free allowance (reported) | Why it fits us | Watch out |
|---|---|---|---|
| **Kling 3.0** | ~66 credits a day | **Multi-shot:** up to 6 cuts in one clip of up to 15 s, keeping the character across cuts. Strong motion. | Free clips are watermarked and lower resolution. A multi-shot clip uses many credits. Sources disagree on the daily amount. |
| **Dreamina (Seedance 2.0)** | ~120–225 credits a day, shared across tools | The biggest daily allowance. Seedance is a top model for cinematic and anime motion. | Watermark on free output. Check today's credits in your account. |
| **Vidu** | ~80 credits; off-peak generation reported as free | **Reference-to-video with up to 7 references**, plus a saved "My References" library. Rated well for anime. | Free output is 720p and watermarked. Multi-scene runs eat credits. |
| **Google Flow** | ~50 credits a day (~5 Veo 3.1 Lite clips) | Ingredients take up to 3 character references. You already use it. | Few clips a day. |
| **PixVerse** | 60 at sign-up + 30 a day | Good anime styles. | Daily credits expire at 00:00 UTC. |
| **Hailuo (MiniMax)** | Unclear: trial credits, or daily credits by some accounts | Good motion. | Inconsistent free terms. |
| **Meta Vibes** | Free during rollout, limits unpublished | 15 s clips. | Availability varies by region, and terms are still changing. |

### Not free

- **Higgsfield:** recent guides say the free plan has zero credits and watermarks. Plans start at $19 a month.
- **Grok Imagine video:** paid since March 2026, with only intermittent free access.
- **Sora:** OpenAI shut down the consumer app in April 2026.

## Script-to-video and storyboard studios

| Tool | Free tier | Fit |
|---|---|---|
| **LTX Studio** | Roughly 8,000 compute-seconds. Personal-use licence only. | Turns a script into a storyboard and shots, with reusable "Elements" for consistent characters. Good for planning. The free licence doesn't allow a monetised upload. |
| **OpenArt** | About 10 images | Storyboard generator with character consistency. Too small a free tier for a whole episode. |
| **Media.io, Toonkit, Elser AI, Crreo** | Free to start (vendor claims) | Anime storyboard-to-video tools. Worth a quick test, but the claims are unverified. |

## Fully free and automated: open models on free GPUs

For no watermarks, no daily caps and commercial rights, run open models on a free cloud GPU.

| Piece | Details |
|---|---|
| **Free GPU** | Kaggle gives about 30 GPU hours a week, with sessions up to about 9 hours. Colab's free tier offers shorter sessions. |
| **App** | **WanGP**: runs Wan 2.1/2.2, LTX-2/2.3, Hunyuan and Qwen Image on low-VRAM GPUs. It has a **generation queue that can be saved and run unattended ("headless")**, so a whole shot list can run overnight. |
| **Ready notebooks** | [WanGP-Kaggle](https://github.com/kayas881/WanGP-Kaggle) (tuned for the free T4), [free-ai-notebooks](https://github.com/cafermutluozkan/free-ai-notebooks) (LTX-2.3 and Wan, Kaggle versions), [Isi-dev Colab notebooks](https://github.com/Isi-dev/Google-Colab_Notebooks) (Wan 2.2 image-to-video, first-and-last-frame, LTX-2) |
| **Licences** | **Wan 2.2: Apache-2.0.** Commercial use is fine, and no rights are claimed over outputs. **LTX-2/2.3: Lightricks community licence.** Free below $10M annual revenue, with a no-competing-products clause. |
| **Trade-off** | Quality and speed are below Kling or Seedance, and setup takes an evening. Character consistency comes from starting each clip from a keyframe, such as a storyboard panel. |

**Ready to run:** `episodes/ep01-skinny-to-bulky/kaggle/ep01-wangp-batch.ipynb`. It batch-generates Episode 1's shots with Wan 2.2 on Kaggle, unattended, and hands back a zip for the assembler. See that folder's README.

**Toonflow**, an open-source studio for AI anime short dramas from our repo list, handles script, storyboard, character assets and generation in one app. It needs model API keys or local models, so it's free only with open models.

## Licences matter for a monetised channel

Free tiers usually add watermarks, and many limit commercial use. Read each tool's terms before monetising. The two safe routes are:
- the open-source route (Wan 2.2);
- a single month of a paid plan when you produce the final episode. Dreamina, Kling or Vidu entry plans run about $10–20.

## Sources

- Free-tier roundups: [Toolchase](https://toolchase.com/blog/best-free-ai-video-generators-2026/), [Wireflow](https://www.wireflow.ai/blog/best-free-ai-video-generator-onlines-in-2026), [Flowjam](https://www.flowjam.com/blog/best-free-ai-video-generators-2026), [Stork](https://www.stork.ai/blog/best-free-ai-video-generators-2026), [Pexo](https://pexo.ai/blog/best-ai-video-creator-free-7637), [HeyGen](https://www.heygen.com/blog/free-ai-tools-credits)
- Kling 3.0: [Atlas Cloud review](https://www.atlascloud.ai/blog/kling-3.0-review-features-pricing-ai-alternatives), [Apiframe guide](https://apiframe.ai/guides/kling-3-0-guide)
- Dreamina and Seedance: [Dreamina free-credits guide](https://dreamina.capcut.com/ai-video/free-ai-video-generator-usable-clips-guide-2026), [Seedance 2.0 pricing](https://dreamina.capcut.com/seedance/seedance-2-0-pricing)
- Vidu: [multi-reference tutorial](https://vidu.com/blog/create-ai-animation-3-characters-1-scene-vidu-multi-reference), [Dupple review](https://dupple.com/reviews/vidu-ai), [aivideogens review](https://aivideogens-cfpage.pages.dev/en/reviews/vidu)
- Higgsfield: [Krea](https://www.krea.ai/blog/what-is-higgsfield-ai-pricing-free-plan-and-alternatives-in-2026), [Voyager](https://voyager.so/blog/higgsfield-pricing)
- Grok and Sora: [Sloane guide](https://www.sloane.world/guides/grok-imagine-video-generation-limits-2026), [Projedefteri](https://projedefteri.com/en/blog/free-ai-video-generators-after-sora/)
- Meta Vibes: [Magic Hour](https://magichour.ai/blog/meta-ais-vibes-feed)
- Storyboard studios: [LTX Studio review](https://vidmuse.ai/blog/ltx-studio-review), [OpenArt storyboard](https://openart.ai/features/ai-storyboard-generator/), [anime generator roundup](https://pixverse.ai/en/blog/best-ai-anime-video-generators-2026)
- Google Flow: [Flow help](https://support.google.com/flow/answer/16353334), [Flow FAQ](https://labs.google/fx/en-gb/tools/flow/faq)
- Open models and free GPUs: [WanGP](https://github.com/deepbeepmeep/WanGP), [LTX-2.3 vs Wan 2.2 licences](https://magichour.ai/blog/ltx-2-3-vs-wan-2-2), [LTX-2 licence](https://huggingface.co/Lightricks/LTX-2.3/blob/main/LICENSE)
