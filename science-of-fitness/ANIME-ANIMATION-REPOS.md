# Free GitHub repos for animated, anime-style videos

For the **Science of Fitness** YouTube channel: long-form animated explainers on training, muscles, food, vitamins and minerals, in an anime look.

Every repo below was checked on GitHub on 7 November 2026. Stars, last push and license come from the GitHub API. The raw list of all 106 checked repos is in `data/repos-checked-2026-11-07.tsv`.

"Free" here means the code is free to download and run. The models still need a GPU, either your own or a rented one. A few licenses block commercial use, which matters once the channel is monetised. Those are marked **check license**.

---

## The short version: a stack you can start with

A long science video is mostly diagrams, labels and motion graphics, with an anime host and a few anime "hero" shots. Do not try to generate 15 minutes of AI video. Build it in layers.

| Layer | Use this | Why |
|---|---|---|
| Science diagrams (muscle fibres, ATP, digestion, vitamin pathways) | **Manim Community** or **Motion Canvas** | Clean, exact, re-usable. Text and arrows stay sharp. |
| Anime host and key art (character sheets, poses, backgrounds) | **ComfyUI** + an anime model + **IP-Adapter** / **PuLID** for a consistent face | One character who looks the same in every episode. |
| Anime motion shots (5 to 10 s clips) | **Wan 2.2** or **Index-AniSora** inside ComfyUI, **FramePack** on a small GPU | Image-to-video from your key art. |
| Host talking | **LivePortrait** (expressions) or **MultiTalk** / **FantasyTalking** (audio-driven) | Lip sync on the anime host. |
| Narration | **Kokoro** (via Kokoro-FastAPI) or **Chatterbox** | Natural voice, free, local. |
| Subtitles | **faster-whisper** | Auto captions from the narration. |
| Smoothing and upscale | **RIFE** for in-between frames, **Anime4K** or **Real-ESRGAN** for 1080p/4K | Makes AI clips and low-fps animation look finished. |
| Edit and assemble | **Kdenlive** or **Shotcut**, or code-driven with **Remotion** / **HyperFrames** | Final timeline, music, captions. |

## Matching the reference look (The Rep Theory style)

The reference channels are mostly still manga-style drawings with motion graphics on top, not full AI video. See `REFERENCE-CHANNELS.md`. That changes which tools matter most:

| Priority | Job | Repo |
|---|---|---|
| Must have | Run everything | ComfyUI (+ ComfyUI-Manager, or StabilityMatrix to install) |
| Must have | Keep one host identical across every shot | **ostris/ai-toolkit** or **bmaltais/kohya_ss** (train a character LoRA), plus IP-Adapter for quick tests |
| Must have | Put the host in the exact exercise pose | ControlNet with **comfyui_controlnet_aux** (OpenPose from your own photos) |
| Must have | Cut the host onto a dark background | **danielgatis/rembg** or **BiRefNet** (ComfyUI-RMBG in ComfyUI) |
| Must have | Fix hands, paint the muscle glow and accent | Krita with **Acly/krita-ai-diffusion** |
| Must have | Info-graphics timed to narration | Motion Canvas, or HyperFrames or Remotion |
| High | Inside-the-body diagrams | Manim (+ manim-voiceover), Blender with Z-Anatomy |
| High | Rep loops from 2 keyframes | ToonCrafter, RIFE |
| Nice to have | A few hero motion shots per episode | Wan 2.2, Index-AniSora, FramePack |
| Skip for now | Talking-head lip sync | The references never show the host talking. Narration is voice-over. |

### Added for this look (checked 7 November 2026)

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [ostris/ai-toolkit](https://github.com/ostris/ai-toolkit) | 12,573 | 2026-11-04 | MIT | Trains LoRAs for SDXL, Flux, Wan and others, with a web UI. The easiest way to lock your host's design. |
| [bmaltais/kohya_ss](https://github.com/bmaltais/kohya_ss) | 12,660 | 2026-08-01 | Apache-2.0 | GUI for kohya's LoRA training scripts. The long-standing standard for anime character LoRAs. |
| [kohya-ss/sd-scripts](https://github.com/kohya-ss/sd-scripts) | 7,254 | 2026-11-03 | Apache-2.0 | The training scripts underneath kohya_ss. |
| [danielgatis/rembg](https://github.com/danielgatis/rembg) | 25,373 | 2026-11-06 | MIT | Background removal from the command line. Batch-cuts every pose. |
| [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet) | 4,381 | 2026-10-25 | MIT | Sharper cut-outs around hair and fingers. |
| [1038lab/ComfyUI-RMBG](https://github.com/1038lab/ComfyUI-RMBG) | 2,222 | 2026-10-20 | GPL-3.0 | rembg and BiRefNet as ComfyUI nodes, plus clothing and body-part masks for the muscle glow. |
| [Acly/krita-ai-diffusion](https://github.com/Acly/krita-ai-diffusion) | 10,850 | 2026-11-06 | GPL-3.0 | Generate and inpaint inside Krita. Fix hands, add props and paint the glow by hand. |
| [ManimCommunity/manim-voiceover](https://github.com/ManimCommunity/manim-voiceover) | 327 | 2026-06-15 | MIT | Times Manim animations to the narration automatically. |
| [tin2tin/Pallaidium](https://github.com/tin2tin/Pallaidium) | 1,554 | 2026-10-29 | GPL-3.0 | Generative AI inside Blender's video editor, if you prefer to assemble in Blender. |
| [CMU-Perceptual-Computing-Lab/openpose](https://github.com/CMU-Perceptual-Computing-Lab/openpose) | 34,563 | 2024-08-03 | **non-commercial** | The original pose detector. Use the ComfyUI preprocessors instead, which bundle commercially usable alternatives such as DWPose. |

---

## 1. Anime image generation and consistent characters

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [Comfy-Org/ComfyUI](https://github.com/Comfy-Org/ComfyUI) | 145,536 | 2026-11-07 | GPL-3.0 | Node-based app that runs almost every open image and video model. The hub for everything in this list. |
| [Comfy-Org/ComfyUI-Manager](https://github.com/Comfy-Org/ComfyUI-Manager) | 16,755 | 2026-11-02 | GPL-3.0 | Installs ComfyUI custom nodes and models with one click. |
| [LykosAI/StabilityMatrix](https://github.com/LykosAI/StabilityMatrix) | 8,993 | 2026-10-21 | AGPL-3.0 | One-click installer for ComfyUI, Forge and others on Windows, Mac, Linux. Easiest way to start. |
| [AUTOMATIC1111/stable-diffusion-webui](https://github.com/AUTOMATIC1111/stable-diffusion-webui) | 165,250 | 2026-03-02 | AGPL-3.0 | The classic web UI. Slower to update now than ComfyUI. |
| [lllyasviel/stable-diffusion-webui-forge](https://github.com/lllyasviel/stable-diffusion-webui-forge) | 13,115 | 2025-07-31 | AGPL-3.0 | Faster fork of the above, lower VRAM. |
| [lllyasviel/Fooocus](https://github.com/lllyasviel/Fooocus) | 53,833 | 2025-12-01 | GPL-3.0 | Simplest prompt-and-go image app. Has an anime preset. |
| [tencent-ailab/IP-Adapter](https://github.com/tencent-ailab/IP-Adapter) | 6,713 | 2024-06-28 | Apache-2.0 | Feed a reference image of your host, get new poses that keep the look. |
| [cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus) | 6,175 | 2025-04-14 | GPL-3.0 | IP-Adapter inside ComfyUI. |
| [ToTheBeginning/PuLID](https://github.com/ToTheBeginning/PuLID) | 3,551 | 2025-07-31 | Apache-2.0 | Keeps a face identity across images. ComfyUI ports exist for Flux. |
| [HVision-NKU/StoryDiffusion](https://github.com/HVision-NKU/StoryDiffusion) | 6,494 | 2024-09-26 | Apache-2.0 | Consistent characters across a sequence of panels. Good for storyboards. |
| [Tencent-Hunyuan/InstantCharacter](https://github.com/Tencent-Hunyuan/InstantCharacter) | 1,043 | 2025-05-14 | **check license** | One reference image to a consistent character. |
| [lllyasviel/ControlNet](https://github.com/lllyasviel/ControlNet) | 34,151 | 2024-02-25 | Apache-2.0 | Control pose, outline and depth. Use it to put the host in exact exercise poses. |
| [Fannovel16/comfyui_controlnet_aux](https://github.com/Fannovel16/comfyui_controlnet_aux) | 4,267 | 2026-10-11 | Apache-2.0 | Pose and line-art extractors for ControlNet in ComfyUI. |
| [Tongyi-MAI/Z-Image](https://github.com/Tongyi-MAI/Z-Image) | 12,139 | 2026-02-09 | Apache-2.0 | Recent open image model, fast. |
| [QwenLM/Qwen-Image](https://github.com/QwenLM/Qwen-Image) | 8,463 | 2026-02-10 | Apache-2.0 | Strong at rendering readable text inside images, useful for labelled diagrams. |
| [black-forest-labs/flux2](https://github.com/black-forest-labs/flux2) | 2,844 | 2026-03-12 | Apache-2.0 code | FLUX.2 inference. Model weights have their own terms, **check license**. |

The anime look itself mostly comes from the model checkpoint or LoRA you load, such as Illustrious, NoobAI, Animagine or Pony-family models. Those live on Hugging Face and Civitai, not GitHub, and each has its own license. Pick one, then keep it for the whole channel so the style stays the same.

## 2. Anime and general video generation (image to video)

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [bilibili/Index-anisora](https://github.com/bilibili/Index-anisora) | 2,538 | 2026-07-16 | Apache-2.0 | Bilibili's open model built specifically for anime video. The closest fit to the channel's look. |
| [Yuan-ManX/ComfyUI-AniSora](https://github.com/Yuan-ManX/ComfyUI-AniSora) | 57 | 2025-05-27 | MIT | Runs AniSora inside ComfyUI. Small project, may lag the main repo. |
| [Wan-Video/Wan2.2](https://github.com/Wan-Video/Wan2.2) | 18,446 | 2026-09-21 | Apache-2.0 | Best general open video model family. Handles anime well with an anime start frame. |
| [Wan-Video/Wan2.1](https://github.com/Wan-Video/Wan2.1) | 17,400 | 2026-03-05 | Apache-2.0 | Older Wan, has a small 1.3B model for modest GPUs. |
| [kijai/ComfyUI-WanVideoWrapper](https://github.com/kijai/ComfyUI-WanVideoWrapper) | 6,812 | 2026-05-24 | Apache-2.0 | The usual way to run Wan in ComfyUI. |
| [lllyasviel/FramePack](https://github.com/lllyasviel/FramePack) | 17,345 | 2025-10-16 | Apache-2.0 | Long image-to-video clips on low-VRAM laptop GPUs. |
| [Lightricks/LTX-Video](https://github.com/Lightricks/LTX-Video) | 11,336 | 2026-11-02 | Apache-2.0 code | Very fast video model. Weights have their own terms, **check license**. |
| [Lightricks/LTX-2](https://github.com/Lightricks/LTX-2) | 10,125 | 2026-11-05 | Apache-2.0 code | Video plus audio in one model. Weights terms apply, **check license**. |
| [Tencent-Hunyuan/HunyuanVideo-1.5](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5) | 4,592 | 2026-04-10 | **check license** | Lighter Hunyuan video model. Tencent's community license has region and scale limits. |
| [Tencent-Hunyuan/HunyuanVideo](https://github.com/Tencent-Hunyuan/HunyuanVideo) | 12,738 | 2026-10-08 | **check license** | Same license caveat. |
| [zai-org/CogVideo](https://github.com/zai-org/CogVideo) | 13,187 | 2025-11-04 | Apache-2.0 code | CogVideoX. Older, still works, smaller GPUs. |
| [Doubiiu/ToonCrafter](https://github.com/Doubiiu/ToonCrafter) | 6,059 | 2025-03-19 | Apache-2.0 | Give it two cartoon keyframes, it draws the motion between them. Made for anime. |
| [Doubiiu/DynamiCrafter](https://github.com/Doubiiu/DynamiCrafter) | 3,003 | 2024-09-08 | Apache-2.0 | Animates a still image. |
| [guoyww/AnimateDiff](https://github.com/guoyww/AnimateDiff) | 12,288 | 2024-07-31 | Apache-2.0 | The older anime-video standard. Superseded by Wan and AniSora but has many anime LoRAs. |
| [Kosinkadink/ComfyUI-AnimateDiff-Evolved](https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved) | 3,564 | 2026-07-28 | Apache-2.0 | AnimateDiff in ComfyUI, still maintained. |
| [HumanAIGC/AnimateAnyone](https://github.com/HumanAIGC/AnimateAnyone) | 14,782 | 2025-09-20 | Apache-2.0 | Make a character image follow a pose sequence. Useful for squats, deadlifts and push-ups with correct form. |
| [ModelTC/LightX2V](https://github.com/ModelTC/LightX2V) | 2,993 | 2026-11-06 | Apache-2.0 | Speeds up Wan and Hunyuan inference. Cuts render time and GPU cost. |

## 3. Turning real footage into anime

Film yourself doing an exercise with good form, then convert it. This gives correct biomechanics, which AI video often gets wrong.

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [TachibanaYoshino/AnimeGANv3](https://github.com/TachibanaYoshino/AnimeGANv3) | 2,050 | 2025-08-23 | **none stated** | Photo or video to anime styles. No license file, so treat as non-commercial until the author confirms. |
| [bryandlee/animegan2-pytorch](https://github.com/bryandlee/animegan2-pytorch) | 4,450 | 2023-01-06 | MIT | AnimeGANv2 in PyTorch. Old but simple and commercially usable code. |
| Wan 2.2 or AnimateDiff with ControlNet pose | see above | | | Higher quality: extract the pose from your footage, re-draw it as your anime host. |

## 4. Talking host and lip sync

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [KlingAIResearch/LivePortrait](https://github.com/KlingAIResearch/LivePortrait) | 19,422 | 2026-06-01 | **check license** | Drives a still portrait with expressions. Has an animal and stylised mode. Code is permissive, a bundled face detector is non-commercial. |
| [kijai/ComfyUI-LivePortraitKJ](https://github.com/kijai/ComfyUI-LivePortraitKJ) | 2,207 | 2024-08-05 | MIT | LivePortrait in ComfyUI. |
| [MeiGen-AI/MultiTalk](https://github.com/MeiGen-AI/MultiTalk) | 3,030 | 2026-05-22 | Apache-2.0 | Audio-driven talking video, one or two characters. Built on Wan. |
| [Fantasy-AMAP/fantasy-talking](https://github.com/Fantasy-AMAP/fantasy-talking) | 1,629 | 2026-01-26 | Apache-2.0 | Audio-driven talking portrait. |
| [bytedance/LatentSync](https://github.com/bytedance/LatentSync) | 6,255 | 2025-06-20 | Apache-2.0 | Lip sync onto an existing video. |
| [TMElyralab/MuseTalk](https://github.com/TMElyralab/MuseTalk) | 6,896 | 2025-09-26 | **check license** | Real-time lip sync. |
| [Tencent-Hunyuan/HunyuanVideo-Avatar](https://github.com/Tencent-Hunyuan/HunyuanVideo-Avatar) | 2,212 | 2025-12-16 | **check license** | Audio-driven avatar video, supports cartoon styles. Tencent license limits. |
| [OpenTalker/SadTalker](https://github.com/OpenTalker/SadTalker) | 14,188 | 2024-06-26 | **check license** | Older talking-head tool, works poorly on anime faces. |
| [Rudrabha/Wav2Lip](https://github.com/Rudrabha/Wav2Lip) | 13,270 | 2025-06-22 | **non-commercial** | Research only. Do not use on a monetised channel. |

## 5. Science diagrams and motion graphics (the backbone of each video)

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [ManimCommunity/manim](https://github.com/ManimCommunity/manim) | 42,323 | 2026-11-05 | MIT | Python animation engine, the 3Blue1Brown style. Best for pathways, graphs and step-by-step mechanisms. Use this one, not the 3b1b fork. |
| [3b1b/manim](https://github.com/3b1b/manim) | 96,228 | 2026-09-09 | MIT | Grant Sanderson's own version. Less documented. |
| [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | 19,716 | 2026-07-02 | MIT | TypeScript animation with a live editor and audio timeline. Easier to time to narration than Manim. |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 71,431 | 2026-11-07 | **check license** | Videos written as React. Free for individuals and companies of up to 3 people, paid above that. |
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 80,361 | 2026-11-07 | Apache-2.0 | Write HTML, render video. Built for AI agents to drive. |
| [airbnb/lottie-web](https://github.com/airbnb/lottie-web) | 32,374 | 2025-09-01 | MIT | Plays Lottie animations. Thousands of free fitness and food icons exist as Lottie files. |
| [mifi/editly](https://github.com/mifi/editly) | 5,590 | 2025-05-12 | MIT | Assemble clips, titles and audio from a JSON file. |

## 6. 2D and 3D animation apps (free, hand-made)

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [blender/blender](https://github.com/blender/blender) | 21,718 | 2026-11-07 | GPL | 3D plus Grease Pencil 2D. Anime cel-shading works with toon shaders. |
| [ayzitix/aniblend](https://github.com/ayzitix/aniblend) | 3 | 2026-10-04 | **check license** | Anime cel-shading and outlines for Blender 4.2+. Very new and small, test before relying on it. |
| [opentoonz/opentoonz](https://github.com/opentoonz/opentoonz) | 8,035 | 2026-11-06 | BSD-style | The 2D software Studio Ghibli used, open-sourced. Real anime production pipeline. |
| [KDE/krita](https://github.com/KDE/krita) | 10,706 | 2026-11-07 | GPL-3.0 | Painting with frame-by-frame animation. Good for backgrounds and key art fixes. |
| [synfig/synfig](https://github.com/synfig/synfig) | 2,373 | 2026-11-01 | GPL-3.0 | Vector, tween-based 2D animation with bone rigs. |
| [pencil2d/pencil](https://github.com/pencil2d/pencil) | 1,864 | 2026-11-05 | GPL-2.0 | Simplest hand-drawn animation app. |
| [pixiv/three-vrm](https://github.com/pixiv/three-vrm) | 2,258 | 2026-10-22 | MIT | Animate VRM anime avatars (VRoid Studio exports) in the browser. A cheap route to a 3D anime host. |
| [sugiany/blender_mmd_tools](https://github.com/sugiany/blender_mmd_tools) | 1,282 | 2022-06-12 | **check license** | Import MikuMikuDance anime models and motions into Blender. |

## 7. Anatomy and exercise data (for accurate fitness visuals)

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [LluisV/Z-Anatomy](https://github.com/LluisV/Z-Anatomy) | 410 | 2024-12-25 | CC BY-SA (models) | Open 3D human anatomy atlas. Muscles, bones, organs. Load into Blender, cel-shade it, and you have anime-style anatomy shots. Credit required. |
| [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) | 2,102 | 2026-09-27 | Unlicense | 800+ exercises with primary and secondary muscles, in JSON. Public domain. |
| [RepDB/exercise-dataset](https://github.com/RepDB/exercise-dataset) | 129 | 2026-10-29 | **check license** | 701 exercises with images and muscles. |

## 8. Voice, captions, music

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [hexgrad/kokoro](https://github.com/hexgrad/kokoro) | 9,951 | 2025-08-06 | Apache-2.0 | Small, natural-sounding TTS. Runs on CPU. |
| [remsky/Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) | 5,650 | 2026-11-06 | Apache-2.0 | Kokoro in Docker with an API. Easiest way to batch-narrate scripts. |
| [resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox) | 27,640 | 2026-11-04 | MIT | Expressive TTS with emotion control and voice cloning. |
| [SWivid/F5-TTS](https://github.com/SWivid/F5-TTS) | 15,530 | 2026-11-03 | MIT code | Voice cloning. Released model weights are **non-commercial**, check before use. |
| [RVC-Boss/GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) | 64,477 | 2026-10-31 | MIT | Clone a voice from a minute of audio. Popular for anime character voices. Only clone a voice you own or have permission for. |
| [QwenAudio/CosyVoice](https://github.com/QwenAudio/CosyVoice) | 24,325 | 2026-05-25 | Apache-2.0 | Multilingual TTS. Useful for Hindi or other language versions. |
| [2noise/ChatTTS](https://github.com/2noise/ChatTTS) | 39,993 | 2026-04-10 | AGPL-3.0 | Conversational TTS. Model weights are non-commercial, **check license**. |
| [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl) | 6,195 | 2026-11-02 | GPL-3.0 | Fast local TTS. The old rhasspy/piper repo is archived, this is its successor. |
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | 26,559 | 2026-11-06 | MIT | Speech to text for subtitles and chapter timestamps. |
| [openai/whisper](https://github.com/openai/whisper) | 112,160 | 2026-08-31 | MIT | The original Whisper. |

## 9. Upscaling and frame interpolation

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [bloc97/Anime4K](https://github.com/bloc97/Anime4K) | 21,608 | 2024-08-17 | MIT | Real-time upscaler tuned for anime line art. |
| [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) | 37,401 | 2024-08-06 | BSD-3-Clause | Upscaler with an anime video model. |
| [hzwer/Practical-RIFE](https://github.com/hzwer/Practical-RIFE) | 1,038 | 2026-08-27 | MIT | Frame interpolation. Turns 16 fps AI clips into smooth 24 or 30 fps. |
| [nihui/rife-ncnn-vulkan](https://github.com/nihui/rife-ncnn-vulkan) | 1,128 | 2024-01-02 | MIT | RIFE on any GPU, including AMD and Intel. |
| [AaronFeng753/Waifu2x-Extension-GUI](https://github.com/AaronFeng753/Waifu2x-Extension-GUI) | 17,195 | 2026-11-02 | **check license** | Windows GUI bundling Waifu2x, Real-ESRGAN and RIFE. Newer versions are paid, older ones free. |

## 10. Editing

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [KDE/kdenlive](https://github.com/KDE/kdenlive) | 6,063 | 2026-11-07 | GPL-3.0 | Full editor, good for 15 to 30 minute videos. |
| [mltframework/shotcut](https://github.com/mltframework/shotcut) | 15,628 | 2026-11-04 | GPL-3.0 | Simpler editor, same engine. |
| [OpenShot/openshot-qt](https://github.com/OpenShot/openshot-qt) | 6,753 | 2026-11-07 | GPL-3.0 | Beginner-friendly editor. |
| [audacity/audacity](https://github.com/audacity/audacity) | 18,982 | 2026-11-06 | GPL | Clean up narration audio. |
| [FFmpeg/FFmpeg](https://github.com/FFmpeg/FFmpeg) | 66,684 | 2026-11-07 | LGPL/GPL | Under everything. Join, convert and loudness-normalise clips. |

## 11. All-in-one AI video pipelines (topic in, video out)

These automate script, images, voice and edit. They are fast to try. Use them for drafts and Shorts, not as the whole long-form channel (see the YouTube note below).

| Repo | Stars | Last push | License | What it does |
|---|---:|---|---|---|
| [harry0703/MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | 140,524 | 2026-11-07 | MIT | Topic to short video with stock footage, voice and subtitles. |
| [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) | 78,029 | 2026-11-03 | AGPL-3.0 | Agent-driven video production with many pipelines. |
| [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app) | 20,996 | 2026-11-05 | MIT | Animated short-drama studio: script, storyboard, character assets, image and video generation. Closest all-in-one to an anime series workflow. Docs are mostly Chinese. |
| [UllrAI/CineGen-ShortDrama](https://github.com/UllrAI/CineGen-ShortDrama) | 570 | 2026-09-25 | **check license** | AI manga and anime storyboard and video system. |
| [xeronsh/KomaSlate](https://github.com/xeronsh/KomaSlate) | 413 | 2026-11-06 | **none stated** | Local-first AI storyboarding with shot retakes. |
| [ATH-MaaS/Pixelle-Video](https://github.com/ATH-MaaS/Pixelle-Video) | 29,846 | 2026-06-14 | Apache-2.0 | Automated short-video engine built on ComfyUI. |
| [Vincentwei1021/anything2explainer](https://github.com/Vincentwei1021/anything2explainer) | 3,104 | 2026-09-18 | **check license** | Claude Code skill: topic to narrated explainer video. |
| [Anil-matcha/vox-ai-motion-graphics-generator](https://github.com/Anil-matcha/vox-ai-motion-graphics-generator) | 322 | 2026-09-02 | **none stated** | Topic to Vox-style collage explainer. |
| [lcy362/agnes-video-generator](https://github.com/lcy362/agnes-video-generator) | 659 | 2026-11-06 | MIT | Self-hosted text to multi-scene video with narration. |
| [Woolverine94/biniou](https://github.com/Woolverine94/biniou) | 1,152 | 2026-11-07 | GPL-3.0 | One web UI for 30+ generative models. |

---

## Things to know before you pick

- **GPU.** Wan 2.2, AniSora and Hunyuan want a 16 to 24 GB NVIDIA card for comfortable use. FramePack, Wan 2.1 1.3B and LTX-Video run on smaller cards. Without a GPU, rent one by the hour (RunPod, Vast.ai) or use free Colab or Kaggle notebooks for tests. Manim, Motion Canvas, Kokoro and the editors run fine on a normal laptop.
- **Licenses.** Code license and model-weights license are often different. Read the model card on Hugging Face before a monetised upload. Avoid Wav2Lip and anything marked non-commercial.
- **YouTube monetisation.** YouTube does not pay for mass-produced, repetitive content, and AI pipelines that only stitch stock clips to a TTS voice get flagged under that policy. Original scripts, real diagrams and your own explanation are what keep a channel eligible. Realistic AI scenes need the "altered or synthetic content" disclosure in YouTube Studio. Clearly animated anime scenes usually do not, but a realistic-looking human doing an exercise may.
- **Accuracy beats spectacle.** AI video often gets joint angles and exercise form wrong. For any form demonstration, drive the motion from real footage or a pose sequence (ControlNet, AnimateAnyone) and have someone check it.

## Gaps on GitHub

- No open, maintained repo does full anime-style **muscle and organ** animation out of the box. The practical route is Z-Anatomy models in Blender with a toon shader, or Manim diagrams styled to match the anime palette.
- Anime checkpoints and LoRAs are on Hugging Face and Civitai, not GitHub, so they are not in the star counts above.
