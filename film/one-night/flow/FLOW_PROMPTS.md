# One Night: Google Flow prompt pack (60-second YouTube Short)

A presenter talks to camera in a studio in **3 clips**. The other **6 clips** are photoreal animation.
The presenter's lines are spoken inside the Veo clips, so the lip sync is generated with the picture.
The narration over the animation is added in the edit, in the same voice.

---

## 1. Settings in Flow

- **Model:** the highest-quality Veo model Flow offers you (Veo 3.1 Quality if listed). Fast models drift more in face and voice.
- **Aspect ratio:** 9:16 portrait. If a mode won't give 9:16, generate 16:9 and crop the centre in the edit. The studio shots are framed so a centre crop still works.
- **Outputs per prompt:** 4. Keep the take whose face, voice and timing match best.
- **Clip length:** 8 seconds. Every line below is written to fit inside that.

---

## 2. The three things that must never change

Paste these blocks **word for word** into every prompt that uses them. Changing one word changes the person.

### PRESENTER (character block)
```
A man in his mid-thirties with short dark-brown hair neatly combed back, a short well-groomed dark beard,
warm brown eyes, light olive skin, and a calm, intelligent expression. He wears a charcoal-grey crew-neck
wool sweater over a white T-shirt collar, with a small black lavalier microphone clipped to the sweater
neckline. No glasses, no jewellery, no logos.
```

### VOICE (voice block)
```
He speaks in a warm, clear, calm male voice with a soft neutral British accent, medium-low pitch,
measured unhurried pace, close-microphone studio sound with no echo.
```

### STUDIO (set block)
```
A dark, intimate documentary studio at night: matte charcoal walls, a warm brass desk lamp glowing
behind his left shoulder, soft key light from camera left, a faint cool blue rim light on his right side,
out-of-focus wooden shelves with old books, a vintage brass pocket watch and a small snow globe.
He sits in a dark leather chair, framed medium close-up from mid-chest up, eye-line straight into the lens.
Shot on a cinema camera with a 50mm lens at f/2, shallow depth of field, gentle film grain, photorealistic.
```

---

## 3. Make the reference images first

Generate these as images (Flow's image tool, or any image model). Save the best one of each; you will reuse
them in every clip. **The presenter portrait is the most important asset in the whole project.**

**R1 — Presenter start frame** (use as the first frame of all three talking clips)
```
[PRESENTER block] [STUDIO block] He looks directly into the camera with a slight, friendly, serious
expression, mouth closed, hands resting in his lap. Vertical 9:16 portrait composition, his eyes on the
upper third. Photorealistic, natural skin texture, no text.
```

**R2 — Santa reference** (seen only from behind or in profile, so his look holds across clips)
```
Photorealistic Santa Claus seen from behind and three-quarter profile: broad shoulders in a deep crimson
velvet coat with thick white fur trim, black leather belt with a brass buckle, black leather gloves, full
white beard visible at the edge of his face, red hat with white fur brim. Night, warm lantern light,
falling snow. Cinematic, no text.
```

**R3 — Mrs Claus reference**
```
Photorealistic elderly woman in her seventies seen from behind and in soft profile: silver-white hair in a
neat bun with two small gold pins, a cream hand-knitted shawl with a short fringe over a burgundy wool
dress, standing at a frosted wooden window, an old brass oil lamp burning on the sill. Soft dawn light.
Cinematic, no text.
```

**R4 — The cabin**
```
Photorealistic log cabin at the North Pole at night: heavy snow on the roof, a stone chimney, one warm
glowing window with an oil lamp inside, a wreath on the door, a lantern by the door, deep snow, a dark
pine forest behind, green aurora overhead. Wide shot, vertical 9:16, cinematic, no text.
```

---

## 4. The nine clips

**Mode key:** *Frames* = Frames to Video with R1 as the start frame. *Ingredients* = add the listed
reference images as ingredients. *Text* = text to video.

Every talking clip ends its prompt with the "only this line" instruction. That stops Veo from adding words,
which is the main cause of drifting lip sync.

### A1 — Presenter, hook (0:00 to 0:07) · *Frames, start frame R1*
```
[PRESENTER block] [STUDIO block] He looks straight into the camera, leans forward very slightly, and says:
"Santa has one night to reach every child on Earth. Physics says it could cost him twenty-three years."
[VOICE block] Natural blinks and small hand gesture on "twenty-three years". The camera pushes in very
slowly. Audio: only his voice and faint studio room tone, no music. He says only this line, then holds
eye contact. No subtitles, no on-screen text.
```

### B1 — The watch at midnight (0:07 to 0:13) · *Ingredients: R2*
```
Extreme macro close-up of an antique gold pocket watch lying open in Santa's black leather-gloved palm,
red velvet sleeve and white fur cuff at the edge of frame. Frost crystals creep across the watch glass.
The red second hand ticks toward midnight and reaches twelve. Snowflakes drift out of focus, warm lantern
bokeh behind. Very slow push-in, 100mm macro lens, shallow depth of field, photorealistic, film grain.
Audio: one crisp mechanical tick each second, soft wind, a deep church bell strikes once at midnight.
No dialogue, no music, no text.
```
**Narration:** "Midnight to six. Ninety-four million kilometres. Nearly eight hundred kilometres every second."

### B2 — Launch (0:13 to 0:20) · *Ingredients: R2, R4*
```
Low-angle wide shot in deep snow in front of the glowing log cabin at night. A carved wooden sleigh with
gold trim, pulled by eight reindeer, launches forward, powder snow exploding from the runners, then climbs
steeply into a sky of rippling green aurora. Santa is seen from behind holding the reins. The camera stays
low and tilts up to follow the climb, vast IMAX scale, practical light from the cabin window and lantern.
Photorealistic, natural motion blur, film grain. Audio: sleigh bells, galloping hooves on snow, a rush
of wind as they lift off. No dialogue, no music, no text.
```
**Narration:** "Now imagine he flies faster still, close to the speed of light."

### B3 — Light speed (0:20 to 0:26) · *Ingredients: R2*
```
Shot from directly behind the sleigh and reindeer high above the clouds at night. As they accelerate,
the stars ahead stretch into long white streaks converging on a single point, the aurora smears into
lines of green light, the Earth's curve glows below. Realistic, physically grounded look, not cartoon,
not science-fiction spaceship. Locked camera following behind. Audio: a rising deep hum and wind that
thins to near silence, one slow distorted tick. No dialogue, no music, no text.
```
**Narration:** "Einstein showed that the faster you move, the slower your clock ticks."

### A2 — Presenter, the idea (0:26 to 0:34) · *Frames, start frame R1*
```
[PRESENTER block] [STUDIO block] He looks into the camera, raises one hand slightly as if holding a small
watch between thumb and finger, and says: "So his watch runs slow. Every second on Santa's clock could be
nine hours back home." [VOICE block] Calm, curious tone, a brief pause after "runs slow". Static camera,
slightly closer framing than before. Audio: only his voice and faint room tone, no music. He says only
this line. No subtitles, no on-screen text.
```

### B4 — Twenty-three years pass (0:34 to 0:41) · *Ingredients: R4*
```
Locked-off timelapse of the same snowy log cabin across twenty-three years. Snow piles higher against the
walls, icicles grow long from the roof edge, days and nights flicker, the aurora races, stars wheel across
the sky in trails, the wreath on the door fades. Through it all, the one window stays lit by an oil lamp
and a woman's silhouette waits behind the frosted glass. Photorealistic, cinematic, film grain.
Audio: a fast clock ticking, wind rising and falling, no voices. No dialogue, no music, no text.
```
**Narration:** "While he lives through one night, the North Pole lives through twenty-three years."

### B5 — Dawn landing (0:41 to 0:47) · *Ingredients: R2, R4*
```
Dawn at the North Pole, pink and gold sky, low sun on the horizon. The sleigh descends and lands softly
in front of the aged log cabin, now half-buried in snow with long icicles. Snow sprays from the runners,
the reindeer slow to a stop, breath steaming. Santa, seen from behind, steps down and looks at the cabin.
Slow push-in from a low angle, photorealistic, warm low sunlight, long shadows, film grain.
Audio: sleigh bells settling, runners hissing on snow, soft wind. No dialogue, no music, no text.
```
**Narration:** "He lands at six in the morning. Right on time."

### B6 — Mrs Claus speaks (0:47 to 0:54) · *Ingredients: R3*
```
Inside a warm wooden cottage at dawn. An elderly woman with silver hair in a bun and a cream knitted
shawl stands at a frosted window, an oil lamp still burning on the sill, a wall of messages and a
child's crayon drawing pinned nearby. Slow push-in from behind. She hears the door, slowly turns her head
toward the camera into soft profile, eyes wet, and says quietly: "You were gone one night." Her voice is
soft, elderly, gentle and slightly trembling, British accent. Photorealistic, golden window light,
dust in the air, shallow depth of field. Audio: only her voice, a soft clock tick, faint wind outside.
She says only this line. No music, no subtitles, no on-screen text.
```

### A3 — Presenter, the ending (0:54 to 1:00) · *Frames, start frame R1*
```
[PRESENTER block] [STUDIO block] He looks into the camera, quieter now, with a small sad smile, and says:
"For him, it was one night. For her, it was a lifetime." [VOICE block] Slow and gentle delivery, a pause
after "one night". He glances down at the pocket watch on the shelf behind him for a moment at the end.
Very slow push-in. Audio: only his voice and faint room tone, no music. He says only this line.
No subtitles, no on-screen text.
```

---

## 5. Keeping the voice the same everywhere

Veo writes a new voice each time, so the three presenter clips can sound slightly different. Fix it in this order:

1. **Pick takes by ear.** Generate 4 takes of each talking clip and keep the three that sound most alike.
2. **Make the narration in his voice.** Export the audio of the three kept clips and clone it with a
   voice tool (for example ElevenLabs Instant Voice Clone). Read the six narration lines with that voice.
3. **If the three clips still differ,** run their audio through speech-to-speech (for example ElevenLabs
   Voice Changer) with the same cloned voice. It changes the sound of the voice but keeps every word's
   timing, so the lip sync stays intact.
4. Never re-time or re-record a talking clip's words. That is what breaks lip sync.

## 6. The edit (CapCut, Premiere or DaVinci Resolve)

| Time | Clip | Audio | Caption |
|---|---|---|---|
| 0:00 | A1 presenter | his own voice | Santa has one night... |
| 0:07 | B1 watch | narration + tick + bell | Midnight to six |
| 0:13 | B2 launch | narration + bells | ...close to the speed of light |
| 0:20 | B3 light speed | narration + hum | the faster you move, the slower your clock ticks |
| 0:26 | A2 presenter | his own voice | Every second = 9 hours at home |
| 0:34 | B4 timelapse | narration + fast ticking | 23 years |
| 0:41 | B5 dawn landing | narration + bells | Right on time |
| 0:47 | B6 Mrs Claus | her own voice | You were gone one night. |
| 0:54 | A3 presenter | his own voice | For him, one night. For her, a lifetime. |

- Trim each clip to the times above; most clips lose the first and last half second.
- Add one music bed under everything, a slow organ or string pad, at about -24 dB, and dip it to about -30 dB
  under every spoken line. Let it swell only on B4 and cut it to silence on B5's landing.
- Burn in captions: white, bold, centred about two-thirds down the frame, two to four words at a time.
- Export 1080x1920, 24 or 30 fps, loudness about -14 LUFS.

## 7. The physics behind the lines

- **Route:** about 94 million km to reach roughly a billion homes with children under 15, from World Bank
  data and the model in `../physics/one_night.py`.
- **Speed:** 94 million km in a 33-hour night window across time zones is about 795 km/s, which the script
  rounds to "nearly eight hundred kilometres every second".
- **Twenty-three years:** for six hours on his watch to equal 23 years at home, his clock must run about
  33,600 times slow. That is 9.3 hours of home time for every second of his, the "nine hours" line.
  It needs a speed of about 99.99999996% of light. That is the "what if"; the real delivery speed above
  barely slows his watch at all.

## 8. If a take goes wrong

- **Extra words or mumbling:** shorten the line, keep the quotes exact, keep "He says only this line."
- **Subtitles appear:** add "Absolutely no captions or text on screen." and regenerate.
- **The face changes:** always start from R1 as the first frame, and keep the PRESENTER block identical.
- **Hands look wrong:** keep gestures small, or crop to a closer framing.
- **Santa's face looks odd:** keep him from behind or in profile, as the prompts do.
