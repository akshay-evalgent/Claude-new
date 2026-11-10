# One Night: Google Flow prompt pack (60-second YouTube Short)

A woman presents to camera in a studio in **3 short clips of 5 seconds**. Between them run **3 photoreal
animation clips of 15 seconds**, each one continuous camera move. Total: exactly 60 seconds.

| Time | Clip | Length | Who speaks |
|---|---|---|---|
| 0:00 | A1 presenter, the hook | 5 s | Presenter on camera |
| 0:05 | B1 midnight, launch, light speed | 15 s | Narration |
| 0:20 | A2 presenter, the idea | 5 s | Presenter on camera |
| 0:25 | B2 twenty-three years pass | 15 s | Narration |
| 0:40 | B3 dawn landing, Mrs Claus | 15 s | Narration, then Mrs Claus on camera |
| 0:55 | A3 presenter, the ending | 5 s | Presenter on camera |

The presenter's lines are spoken inside the Veo clips, so the lip sync is generated with the picture.
The narration over the animation is added in the edit, in her voice.

---

## 1. Settings in Flow

- **Model:** the highest-quality Veo model Flow offers you. Fast models drift more in face and voice.
- **Aspect ratio:** 9:16 portrait. If a mode won't give 9:16, generate 16:9 and crop the centre in the edit.
- **Length:** 5 seconds for A1, A2, A3. 15 seconds for B1, B2, B3.
- **Outputs per prompt:** 4. Keep the take whose face, voice and timing match best.
- **Why the talking clips are short:** each holds one line of about 12 to 14 words, which a calm speaker
  says in 4 to 5 seconds. Short clips leave Veo no room to add words, so the lip sync stays tight.

---

## 2. The three things that must never change

Paste these blocks **word for word** into every prompt that uses them. Changing one word changes the person.

### PRESENTER (character block)
```
A woman in her early thirties with shoulder-length dark-brown hair, softly waved and tucked behind her
left ear, warm hazel eyes, light olive skin, natural minimal makeup, and a calm, intelligent expression.
She wears a charcoal-grey crew-neck knit sweater, small plain gold stud earrings, and a small black
lavalier microphone clipped to the sweater neckline. No glasses, no other jewellery, no logos.
```

### VOICE (voice block)
```
She speaks in a warm, clear, calm female voice with a soft neutral British accent, medium pitch,
measured confident pace, close-microphone studio sound with no echo.
```

### STUDIO (set block)
```
A dark, intimate documentary studio at night: matte charcoal walls, a warm brass desk lamp glowing
behind her left shoulder, soft key light from camera left, a faint cool blue rim light on her right side,
out-of-focus wooden shelves with old books, a vintage brass pocket watch and a small snow globe.
She sits in a dark leather chair, framed medium close-up from mid-chest up, eye-line straight into the lens.
Shot on a cinema camera with a 50mm lens at f/2, shallow depth of field, gentle film grain, photorealistic.
```

---

## 3. Make the reference images first

Generate these as images (Flow's image tool, or any image model), and save the best one of each.
**The presenter portrait is the most important asset in the whole project.**

**R1: Presenter start frame** (the first frame of all three talking clips)
```
[PRESENTER block] [STUDIO block] She looks directly into the camera with a slight, friendly, serious
expression, mouth closed, hands resting in her lap. Vertical 9:16 portrait composition, her eyes on the
upper third. Photorealistic, natural skin texture, no text.
```

**R2: Santa reference** (seen only from behind or in profile, so his look holds across clips)
```
Photorealistic Santa Claus seen from behind and three-quarter profile: broad shoulders in a deep crimson
velvet coat with thick white fur trim, black leather belt with a brass buckle, black leather gloves, full
white beard visible at the edge of his face, red hat with white fur brim. Night, warm lantern light,
falling snow. Cinematic, no text.
```

**R3: Mrs Claus reference**
```
Photorealistic elderly woman in her seventies seen from behind and in soft profile: silver-white hair in a
neat bun with two small gold pins, a cream hand-knitted shawl with a short fringe over a burgundy wool
dress, standing at a frosted wooden window, an old brass oil lamp burning on the sill. Soft dawn light.
Cinematic, no text.
```

**R4: The cabin**
```
Photorealistic log cabin at the North Pole at night: heavy snow on the roof, a stone chimney, one warm
glowing window with an oil lamp inside, a wreath on the door, a lantern by the door, deep snow, a dark
pine forest behind, green aurora overhead. Wide shot, vertical 9:16, cinematic, no text.
```

---

## 4. The six clips

**Mode key:** *Frames* = Frames to Video with R1 as the start frame. *Ingredients* = add the listed
reference images as ingredients.

### A1: Presenter, the hook (0:00 to 0:05) · 5 s · *Frames, start frame R1*
```
[PRESENTER block] [STUDIO block] She looks straight into the camera, leans forward very slightly, and says:
"Santa has one night. Physics says it could cost him twenty-three years." [VOICE block]
Natural blinks, a small hand gesture on "twenty-three years". Very slow push-in. Audio: only her voice
and faint studio room tone, no music. She says only this line, then holds eye contact.
No subtitles, no on-screen text.
```

### B1: Midnight, launch, light speed (0:05 to 0:20) · 15 s · *Ingredients: R2, R4*
```
One continuous photoreal shot, no cuts, in four beats.
0 to 4 seconds: extreme macro of an antique gold pocket watch open in Santa's black leather-gloved palm,
frost on the glass, the red second hand ticks onto midnight, snowflakes drifting out of focus.
4 to 8 seconds: the camera pulls back and rises to reveal the snowy log cabin with its glowing window,
and the carved wooden sleigh with gold trim and eight reindeer launching forward, powder snow exploding
from the runners.
8 to 12 seconds: the sleigh climbs steeply into a sky of rippling green aurora, Santa seen from behind
holding the reins, the camera tilting up from a low angle to follow, vast IMAX scale.
12 to 15 seconds: from behind the sleigh, the stars ahead stretch into long white streaks converging on
one point as it nears the speed of light, the aurora smearing into lines.
Cinematic, realistic physics, natural motion blur, film grain, not cartoon.
Audio: a crisp tick each second, a deep bell striking midnight, sleigh bells and galloping hooves, rushing
wind, then a rising deep hum. No dialogue, no music, no text.
```
**Narration, starting at 0:06:** "Midnight to six. Ninety-four million kilometres. Nearly eight hundred
kilometres a second. Now imagine he flies close to the speed of light."

### A2: Presenter, the idea (0:20 to 0:25) · 5 s · *Frames, start frame R1*
```
[PRESENTER block] [STUDIO block] She looks into the camera, raises one hand slightly as if holding a small
watch between thumb and finger, and says: "Fly that fast, and every second on his watch is nine hours at
home." [VOICE block] Calm, curious tone. Static camera, slightly closer framing than before.
Audio: only her voice and faint room tone, no music. She says only this line.
No subtitles, no on-screen text.
```

### B2: Twenty-three years pass (0:25 to 0:40) · 15 s · *Ingredients: R4*
```
One continuous photoreal shot, no cuts. A very slow push-in on the same snowy log cabin while twenty-three
years pass in timelapse.
0 to 5 seconds: night, the lit window with a woman's silhouette waiting behind frosted glass; inside the
window, a wall clock's hands spin into a blur.
5 to 10 seconds: days and nights flicker, stars wheel across the sky in trails, the aurora races, snow
piles higher against the walls, icicles grow long from the roof edge.
10 to 15 seconds: the cabin is old now, half-buried in drifts, the wreath faded, the logs weathered, but
the one window is still lit by an oil lamp and the silhouette is still there.
Cinematic, film grain, natural light changes.
Audio: a clock ticking faster and faster, wind rising and falling, then everything goes quiet at the end.
No dialogue, no voices, no music, no text.
```
**Narration, starting at 0:26:** "Einstein showed that the faster you move, the slower your clock ticks.
So while he lives through one night, the North Pole lives through twenty-three years."

### B3: Dawn landing, Mrs Claus (0:40 to 0:55) · 15 s · *Ingredients: R2, R3, R4*
```
One continuous photoreal shot, no cuts.
0 to 5 seconds: dawn at the North Pole, pink and gold sky, low sun on the horizon. The sleigh descends and
lands softly in front of the aged, snow-buried log cabin with long icicles, snow spraying from the
runners, reindeer breath steaming.
5 to 9 seconds: Santa, seen from behind, steps down and walks to the door; the camera follows him over
his shoulder through the doorway into the warm wooden cottage.
9 to 15 seconds: inside, an elderly woman with silver hair in a bun and a cream knitted shawl stands at a
frosted window, an oil lamp still burning on the sill. She slowly turns her head toward camera into soft
profile, eyes wet, and says quietly: "You were gone one night." Her voice is soft, elderly, gentle and
slightly trembling, with a British accent.
Warm golden window light, dust in the air, shallow depth of field, film grain.
Audio: sleigh bells settling, runners hissing on snow, the door creaking, a soft clock tick, then only her
voice. She says only this line. No music, no subtitles, no on-screen text.
```
**Narration, starting at 0:41:** "He lands at six in the morning. Right on time." Keep it clear of her line
at about 0:50.

### A3: Presenter, the ending (0:55 to 1:00) · 5 s · *Frames, start frame R1*
```
[PRESENTER block] [STUDIO block] She looks into the camera, quieter now, with a small sad smile, and says:
"For him, it was one night. For her, it was a lifetime." [VOICE block] Slow, gentle delivery, a short
pause after "one night". Very slow push-in. Audio: only her voice and faint room tone, no music.
She says only this line. No subtitles, no on-screen text.
```

---

## 5. Keeping her voice the same everywhere

Veo makes a new voice each time, so the three presenter clips can sound slightly different. Fix it in this order:

1. **Pick takes by ear.** Generate 4 takes of each talking clip and keep the three that sound most alike.
2. **Make the narration in her voice.** Export the audio of the three kept clips and clone it with a voice
   tool (for example ElevenLabs Instant Voice Clone). Read the three narration passages with that voice.
3. **If the three clips still differ,** run their audio through speech-to-speech (for example ElevenLabs
   Voice Changer) with the same cloned voice. It changes the sound of the voice but keeps every word's
   timing, so the lip sync stays intact.
4. Never re-time or re-record a talking clip's words. That is what breaks lip sync.
5. Keep Mrs Claus's own Veo voice. She should sound different from the presenter.

## 6. The edit (CapCut, Premiere or DaVinci Resolve)

| Time | Clip | Audio | Caption |
|---|---|---|---|
| 0:00 | A1 presenter | her own voice | Santa has one night |
| 0:05 | B1 | narration, tick, bell, bells | Midnight to six · 800 km a second · close to light speed |
| 0:20 | A2 presenter | her own voice | 1 second = 9 hours at home |
| 0:25 | B2 | narration, fast ticking | the slower your clock ticks · 23 years |
| 0:40 | B3 | narration, then Mrs Claus | Right on time · "You were gone one night." |
| 0:55 | A3 presenter | her own voice | For him, one night. For her, a lifetime. |

- If a 5-second clip runs long, trim the silence at the end rather than speeding up her words.
- Add one music bed under everything, a slow organ or string pad, at about -24 dB, and dip it to about -30 dB
  under every spoken line. Let it swell through B2 and drop to silence when the sleigh lands in B3.
- Burn in captions: white, bold, centred about two-thirds down the frame, two to four words at a time.
- Export 1080x1920, 24 or 30 fps, loudness about -14 LUFS.

## 7. The physics behind the lines

- **Route:** about 94 million km to reach roughly a billion homes with children under 15, from World Bank
  data and the model in `../physics/one_night.py`.
- **Speed:** 94 million km in a 33-hour night window across time zones is about 795 km/s, the "nearly eight
  hundred kilometres a second" line.
- **Twenty-three years:** for six hours on his watch to equal 23 years at home, his clock must run about
  33,600 times slow, so each of his seconds is about 9.3 hours at home, the "nine hours" line. That needs
  about 99.99999996% of light speed. That's the "what if"; the real delivery speed above barely slows his
  watch at all.

## 8. If a take goes wrong

- **Extra words or mumbling:** keep the quotes exact and keep "She says only this line." A 5-second clip
  can hold about 14 words at most.
- **Subtitles appear:** add "Absolutely no captions or text on screen." and regenerate.
- **The face changes:** always start from R1 as the first frame, and keep the PRESENTER block identical.
- **A 15-second shot cuts or jumps:** keep "One continuous shot, no cuts." at the start, or split it into
  two 8-second generations that share the middle frame (use the last frame of the first as the start frame
  of the second).
- **Santa's face looks odd:** keep him from behind or in profile, as the prompts do.
