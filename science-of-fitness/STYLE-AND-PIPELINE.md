# Science of Fitness: look, tone and how to make it for free

Built from the reference study in `REFERENCE-CHANNELS.md`. We use the same visual grammar as The Rep Theory, our own design, and one thing neither reference channel does: we go inside the body.

Rendered template frames are in `assets/style-frames/`. A 7-second motion test is in `06-motion-test-stat.mp4`. Regenerate them with:

```bash
python3 scripts/style_frames.py
```

---

## 1. The look

### The host
One character in every episode, every shot, every thumbnail. Design them once and never change them.

- **Drawn like the references.** Grayscale manga pencil and ink, realistic anatomy, lean and athletic but not huge. A beginner should see a future version of themselves.
- **Different from the references.** Pick a silhouette nobody else has. Some options:
  - short black hair with one teal streak;
  - a teal sweatband or wrist wraps;
  - teal training shorts with a thin white stripe.
  Use one teal item only. That item is the host's signature, the way orange shorts are for The Rep Theory.
- **No face covering, no white spiky hair, no orange.** Those belong to the references.
- **Give them a name** and keep it consistent in descriptions and community posts.

### The rival
A recurring "bro science" character, drawn in flat grey. He believes the myths: "more protein is always better", "sweat out toxins", "cardio kills gains". The host explains the science and he gets proven wrong. Keep it friendly, so the joke is on the myth and not on big people.

### Palette

| Role | Hex | Use it for |
|---|---|---|
| Background | `#0A0C10` | Every frame. Near-black, never pure black. |
| Ink | `#ECF0F4` | Host line art, headlines |
| Science (teal) | `#26E0C4` | Correct form, "do this", key terms, the host's one accent |
| Muscle (coral) | `#FF5454` | The worked muscle, wrong form, the myth |
| Nutrient (amber) | `#FFB830` | Vitamins, minerals, food, the safety tag |

Only these colours on screen. Food photos and anatomy renders get desaturated to grayscale, then the one thing that matters is coloured.

### Screen furniture (every frame)
- **Chapter label, top-left:** a teal bar then grey caps, like "MINERAL 3 · MAGNESIUM" or "MISTAKE 2 · THE FLARE".
- **Progress dots, top-right:** shows which of the 5 or so parts we are in.
- **Safety tag, bottom-left, on exercise shots only:** "GO SLOW. STOP IF IT HURTS."
- **Source, bottom-right, on every claim:** "SOURCE Morton et al., Br J Sports Med, 2018". The references keep sources in the description. Putting them on screen is our trust signal.
- **One key line per shot,** bold caps, with one coloured word.

### Signature moves
1. **The zoom.** Body, then muscle, then fibre, then mitochondrion, then molecule. Use it at least once per episode. It is what the channel name promises. See `04-zoom-ladder.png`.
2. **The element tile.** Every mineral appears as a periodic-table tile in amber, with the daily need and one food source. See `02-nutrient-card.png`.
3. **Do and don't split.** Teal box with a tick against a coral box with an X. See `03-do-dont.png`.
4. **The stat ring.** One number, a ring that fills as it counts up, and a source. See `05-stat-ring.png` and the motion test.
5. **Red muscle glow.** The grayscale host with the working muscle in coral.

### Motion rules
- Motion should be 2.5D, not full animation. Most shots are a still drawing with a slow push-in, arrows drawing on, and text popping in.
- A rep is 2 or 3 drawn keyframes, looped. In-between frames come from ToonCrafter or a short crossfade.
- Text comes in with a fast ease-out, about 0.3 seconds. Hold each key line at least 2 seconds.
- Cut on the beat of the narration, not on a timer.
- Use real AI video only for 3 to 6 "hero" shots per episode: the cold open, a tug-of-war with the rival, and the final payoff.

### Thumbnails
- The host, big, with the coral muscle glow, either before and after, or against the rival.
- One to three words in a handwritten font, lowercase, plus one curved arrow.
- One science object if it fits: an element tile, a cell, a bone.
- Test two versions with YouTube's built-in thumbnail A/B test.

---

## 2. The tone

### Who is talking
Talk like a friend who actually reads the studies. Speak to one person: a beginner who trains at home, is curious about why things work, and is tired of influencer myths.

### Rules for every script
- Address the viewer as "you". Use short sentences. Say one idea, then show it.
- **Give every claim a number and a source.** "1.6 grams per kilo per day. 49 trials. After that, more protein stopped helping."
- **Every exercise gets an easier version.** "Can't hold 20 seconds? Drop to your knees."
- **Name the myth before you break it.** That is the rival's job.
- **Say what we don't know.** "The studies here are small. Here's what they found."
- **Be humble.** Put a "not doctors, not medical advice, sources on screen" line in the description and say it once on screen early in the video.
- **Avoid hype words.** No "insane", "secret" or "hack" in the narration. One in a title is fine. The references use "(stupid easy)" and "(no gate keeping)", so keep that playful edge in titles and thumbnails only.

### Episode shape, 10 to 15 minutes
| Part | Time | What happens |
|---|---|---|
| Cold open | 0:00 to 0:45 | The myth or the surprising fact, a hero AI shot, and the promise of what you'll be able to do by the end |
| Part 1 · The body | about 3 min | The zoom. What is physically happening inside you. |
| Part 2 · The fuel | about 3 min | The food, vitamins and minerals involved, with element tiles and plates |
| Part 3 · The training | about 4 min | 3 to 5 exercises, each with the do-and-don't split, an easier version and sets and reps |
| Part 4 · The plan | about 2 min | A simple weekly plan on one screen to screenshot |
| Close | 30 s | The rival concedes, plus a question for the comments |

### Sample cold open
*Topic: why you gas out after 10 seconds of all-out effort.*

> Sprint as hard as you can. Around ten seconds in, something changes. You didn't decide to slow down. Your body did.
>
> *(zoom: body, then thigh, then fibre)*
>
> Every contraction runs on one molecule. ATP. And your muscles only keep a few seconds of it in stock.
>
> *(rival, flexing)* "Just push harder, bro."
>
> He can't. Nobody can. After that first stretch, your fibres switch to a backup fuel, then a slower one, then a slower one still. Each switch costs you speed.
>
> In the next twelve minutes: the three energy systems, which foods refill each one, and a fifteen-minute workout that trains all three. No equipment.

Check every physiology line against a textbook or review before recording. The timings for the energy systems are approximate, and the script should say so.

### About "The Quantum Doctor"
Amit Goswami's book argues for a consciousness-based, integrative view of health. Its quantum and "vital energy" ideas are not accepted science. Presenting them as science on a channel called Science of Fitness would hurt credibility. Health claims that contradict medical consensus can also break YouTube's medical misinformation policy.

Two ways to use it safely:
1. **A clearly labelled segment or series, such as "Ideas worth arguing about".** Present the book's claims as the author's view, and show what the evidence says beside them. Summarise in your own words, and credit the book for any short quotes.
2. **Use the evidence-backed mind-body topics the book points at:** sleep and recovery, stress and cortisol, the placebo effect, breathing and heart-rate variability, mindfulness and pain. These fit the channel and carry no credibility risk.

---

## 3. Free production pipeline for this look

Each step names the tool from `ANIME-ANIMATION-REPOS.md` that does the job.

| Step | What you do | Tools |
|---|---|---|
| 1. Design the host | Generate 50 to 100 candidates with an anime model, using a prompt like "monochrome manga ink, pencil hatching, white background, full body". Pick one. Make a front, side and back sheet. | ComfyUI, an Illustrious- or NoobAI-family anime checkpoint |
| 2. Lock the host | Train a character LoRA on 20 to 40 clean images of the chosen design. This is what keeps the host identical across hundreds of shots. | ostris/ai-toolkit or kohya_ss |
| 3. Pose for real | Photograph or film yourself doing each exercise. Extract the skeleton. Generate the host in that exact pose. Make 2 or 3 keyframes per rep. | comfyui_controlnet_aux (OpenPose), ControlNet |
| 4. Cut out | Remove the background and place the host on `#0A0C10`. | rembg or BiRefNet (ComfyUI-RMBG inside ComfyUI) |
| 5. Accent and muscle glow | Keep the host grayscale. Colour only the teal item, then paint the worked muscle in coral on its own layer. | Krita with krita-ai-diffusion for fixes and inpainting |
| 6. Anatomy and inside-the-body shots | **Built.** `assets/anatomy/` holds skin, muscle, bone and nerve layers rendered from the BodyParts3D atlas in manga ink, plus close-ups, microscopic views and animations. Make new highlights or angles with `scripts/anatomy/build_kit.py`. Mitochondria and molecule shots are still to do. | `scripts/anatomy/`, BodyParts3D, Manim |
| 7. Info-graphics | Chapter labels, tiles, rings, do-and-don't cards and plans, timed to the narration. | Motion Canvas, or HyperFrames or Remotion. `scripts/style_frames.py` is the visual spec. |
| 8. Rep loops | Make in-betweens from 2 keyframes. | ToonCrafter, RIFE |
| 9. Hero shots | 3 to 6 short clips per episode, made from your keyframes. | Wan 2.2 or Index-AniSora, through ComfyUI |
| 10. Voice | Recording your own voice is best for trust and for YouTube's rules on reused or mass-produced content. For a synthetic voice, pick one and keep it. | Your mic plus Audacity, or Kokoro or Chatterbox |
| 11. Captions | Generate subtitles and chapter timestamps. | faster-whisper |
| 12. Edit and master | Assemble the episode. Normalise loudness to about -14 LUFS. Export at 1080p or 4K. | Kdenlive, FFmpeg, Anime4K or Real-ESRGAN for upscaling |

**What needs a GPU:** steps 1, 2, 3, 8 and 9. A 12 GB card handles image work. Video wants 16 to 24 GB, or a GPU rented by the hour. Everything else runs on a normal laptop.

**Reuse is the speed trick.** After 3 or 4 episodes you will have a library: host poses, rival poses, element tiles, organ renders and the template scenes. The references post every one to two days because most shots are reused, not redrawn.

---

## 4. First ten episode ideas

Each idea uses one of the proven angles from the reference study, plus our science and nutrition layer.

1. Why skinny guys can out-pull big guys: tendons, collagen and vitamin C
2. Why you gas out after 10 seconds: ATP and the three energy systems
3. Magnesium and cramps: what the evidence actually says
4. Your muscles can't tell a dumbbell from your bodyweight: mechanical tension
5. Protein: how much actually matters, and when more stops helping
6. Why your muscles burn, and why it isn't lactic acid poisoning you
7. Vitamin D and strength: who is low, and does it matter
8. Iron, fatigue and training: why tired isn't always lazy
9. Sweat, salt and water: electrolytes for people who train at home
10. Creatine from zero: what it is, what it does, and who it is for

Every nutrition episode needs a qualified reviewer, or at least checks against primary sources. Keep the "not medical advice" line on all of them.
