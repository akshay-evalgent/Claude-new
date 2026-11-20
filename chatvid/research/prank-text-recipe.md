# AI prank-text Short: recipe

Studied from the Short at youtube.com/shorts/AgV7DewK5do (75 s, 1080x1920, 60 fps), frame by frame and from its audio.

## What the original does

**Structure (75 s)**
1. **0-3 s, hook:** the "footage" full screen (an AI video of workers shovelling a driveway) with a caption in the middle: *Pranking my dad the snow guy brought a "few helpers" 😂*.
2. **3-6 s:** the creator shows the AI app generating the scene. This is a sponsor or app plug and is optional.
3. **6-75 s:** a screen recording of the text conversation with Dad. It is light mode, the red time pill shows it is a recording, and the keyboard is up the whole time.

**The conversation**
- **Setup:** a few old messages above "Today", so the thread looks real.
- **Message 1:** a believable premise ("dad the snow removal guy is here").
- **Dad's first reaction:** annoyed, but calm and in normal case ("You're a lazy bastard").
- **Escalation:** the prank grows in three clip drops: 2 workers → 10 workers → a snow mountain. Each drop is set up by an innocent line ("he said he needs help", "the pile is getting pretty big tho").
- **Dad's spiral:** from normal case to ALL CAPS after the second clip. He swears, makes typos ("MOUNT EVERAST", "MOTHERFUKERS"), and stacks two or three messages in a row.
- **The sender stays deadpan:** short lowercase replies that make it worse ("they said they'll come back tomorrow if it snows again").
- **Ending:** Dad at peak rage ("LET ME TALK TO THESE…"). There is no reveal and no resolution.

**On screen**
- Every message is typed live: letter by letter with key pop-ups, at about 12-18 characters a second.
- Dad's replies land after a "…" typing indicator.
- Clips are sent from the Photos sheet and play inline.
- About 26 messages in 70 s.

**Sound**
- No voices and no music.
- Key clicks, the send whoosh and the receive sound.
- The clips' own outdoor sound.

## Our version

The engine is `chatvid/imsg/` and the episode is `episodes/prank-snow.json`. Instead of AI video, the "footage" is rendered in **Three.js** (`chatvid/three/snow.js`): a snowy driveway seen from an upstairs window, with N hi-vis workers shovelling and a pile that grows into a mountain.

```bash
node chatvid/tools/three_clip.mjs snow snow-b '{"workers": 10, "pile": 1.0, "seed": 5}' --dur 4
```

```bash
node chatvid/render.mjs chatvid/episodes/prank-snow.json
```

A 90 s Short renders in about 2.5 minutes; each 4 s clip takes about 50 s.

### With real AI clips (Google Flow)
The episode now uses three Flow clips instead of the 3D renders. Put the videos in `chatvid/assets/media/` and list them as `file` media; `fetch_media.py` turns them into frames plus their own sound:

```json
"flow-snow-b": {"file": "flow-snow-b.mp4", "credit": "AI video generated with Google Flow for this channel", "level": -28}
```

The `tool` block plays the original's beat 2, between the hook and the texts: the prompt is typed into an AI video app, "Generating… %" runs, and the clip appears.

```json
"tool": {"prompt": "snow guy in hi-vis vest shoveling my dad's driveway, filmed from upstairs window", "media": "flow-snow-a", "typeSpeed": 46, "generate": 1.1, "show": 1.3}
```

The app screen is our own unbranded mock-up. Playing a real screen recording of Flow in its place is not built yet.

**Flow tips:**
- Make clip A first, then make B and C with Frames to Video from a frame of A, so the house and angle match.
- Ask for "no music, no speech"; the clips' wind and shovel sounds play in the bubbles.
- Quiet clips can be lowered per drop with `"audioGain"` on the media beat.

### Writing checklist
- **Hook caption:** `texted my <relative> that <absurd thing> 😭`, with the key words in quotes.
- **Old history:** 3-4 old messages that set up their relationship (the trash is "resting").
- **Clips:** three drops, each set up by an innocent line; every drop multiplies the problem.
- **The relative:** calm, then caps after drop 2, then two caps messages in a row, then threats.
- **The sender:** lowercase only and never apologises; every reply makes it worse.
- **Ending:** on the relative's loudest line, or a two-word sender reply ("which one").
- **Length:** 60-90 s and about 30 messages.

### Next pranks that reuse the same idea
- **Same snow scene:**
  - "the snow guy brought his band" (add instruments)
  - a snowman that gets bigger every clip
- **New 3D scenes:**
  - "the pool guy brought friends" (more and more inflatables)
  - "I let the dog walker take Max" (one dog becomes 40 dogs)
  - "the pizza guy is still here" (a pizza tower)
