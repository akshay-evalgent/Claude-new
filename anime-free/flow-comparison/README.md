# Scramble in Google Flow: the same film, for comparison

These are the exact prompts and start frames that produced [`../results/scramble-final.mp4`](../results/scramble-final.mp4)
with the free models. Run them in Google Flow to get nine clips that can be cut into the same 20-second edit.

## What this test compares

**Test A, the video model only.** Flow starts each shot from the same painted first frame our Wan 2.2 model started
from, with the same prompt. Characters, staging and the street are identical going in, so any difference in the result
is the video model's. This is the fair comparison, and the one to run first.

Two other tests are optional and described at the end.

## Settings in Flow

- **Mode:** frames to video, with the start frame only. Do not set an end frame: ours had none.
- **Aspect ratio:** 16:9, landscape.
- **Length:** 5 seconds for every shot, the shortest Flow offers. Our takes were 2.8 to 5.1 seconds.
- **Outputs per prompt:** one, taken as it comes. Our film used the first take of every shot with no retakes. If you
  generate several and pick the best, note that down, because it favours Flow.
- **Prompt rewriting:** off, if Flow offers the choice. The prompts are meant to be used word for word.
- **Sound:** ignore it for Test A. The finished comparison uses our soundtrack under both films.

Paste each prompt exactly as written, including the `Camera:` sentence at the end. That sentence is part of what the
model was sent.

## What differs from our run, and cannot be helped

- **Clip length.** The prompts time their beats for 2.5 to 5 second clips, for example "0-0.4 s", "2-3 s". In a
  5-second clip Flow may stretch the action or finish early and improvise. The edit below takes the same opening
  seconds we used, so a stretched action will be cut short. If that happens on a shot, rerun it with this one sentence
  added at the end, and record that you did:
  `The whole action is finished within the first N seconds; after that everyone holds the final pose with only small ambient motion.`
  Use the "we use" length from the table as N.
- **Negative prompt.** Wan was also given a negative prompt, a list of things to avoid such as text, extra limbs and
  scene cuts. Flow has no such field as far as I know. Every prompt already ends with its own "no text, no new objects"
  line, so nothing needs adding.
- **Resolution.** Our clips are 832x480 at 16 fps, upscaled to 1080p. Flow's will be sharper before any comparison of
  motion begins. Judge sharpness and motion separately.

## The edit

Each clip is trimmed to its opening seconds, and three are sped up, exactly as in our film.

| # | Clip | Position in the film | We use | Speed | Length in the film |
|---|---|---|---|---|---|
| 1 | `01-street` | 0.0 to 2.5 s | first 2.5 s | normal | 2.5 s |
| 2 | `02-akane` | 2.5 to 5.0 s | first 2.5 s | normal | 2.5 s |
| 3 | `03-jin` | 5.0 to 7.5 s | first 2.5 s | normal | 2.5 s |
| 4 | `04-charge` | 7.5 to 9.0 s | first 2.5 s | 1.67x | 1.5 s |
| 5 | `05-exchange` | 9.0 to 12.5 s | first 4.5 s | 1.29x | 3.5 s |
| 6 | `06-kick` | 12.5 to 14.0 s | first 2.0 s | 1.33x | 1.5 s |
| 7 | `07-slide` | 14.0 to 16.0 s | first 2.0 s | normal | 2.0 s |
| 8 | `08-smile` | 16.0 to 18.0 s | first 2.0 s | normal | 2.0 s |
| 9 | `09-tag` | 18.0 to 20.0 s | first 2.0 s | normal | 2.0 s |

The kick lands on the cut at 12.5 s, where the film flashes white for two frames.

Send the nine clips back with the names above and they can be dropped into the same edit, with the same subtitles,
place card, flash and soundtrack, so the two films differ only in the footage.

## The nine shots

### Shot 1: street

The crossing in the rain. The crowd flows around the two, who face each other.

- **Start frame:** `start-frames/01-street.jpg`
- **Length to request:** 5 seconds. Our Wan take was 3.3 s.
- **Save the clip as:** `01-street.mp4`

```text
Hand-drawn 2D anime film, cel shading, rainy neon night. The same crossing as in the image, ONE CONTINUOUS TAKE with no cuts. The crowd under umbrellas keeps walking across the zebra stripes in every direction, rain falls, neon signs flicker and their reflections shimmer on the wet asphalt. In the middle the woman in the red jacket and the man in the white hoodie stand perfectly still, facing each other, while everyone else moves around them. No new objects, no text. Camera: move: slow push-in (dolly in) from the high wide view, no rotation; from: the high wide shot in the image; to: slightly closer on the two still figures in the middle; timing: constant and slow from first frame to last; anchors: the two still figures stay in the centre of the frame
```

### Shot 2: akane

Akane in the crowd, grinning. She speaks.

- **Start frame:** `start-frames/02-akane.jpg`
- **Length to request:** 5 seconds. Our Wan take was 3.3 s.
- **Save the clip as:** `02-akane.mp4`

```text
Hand-drawn 2D anime film, cel shading, rainy neon night. The same young woman as in the image, on-model, ONE CONTINUOUS TAKE with no cuts. 0-0.4 s: closed-mouth grin, rain running down her jacket. 0.4-2 s: she says a short line with clear cocky mouth movements, chin lifting, her raised fist tightening. 2-3 s: her mouth closes into a wide grin. The whole time blurred people with umbrellas walk past behind her and in front of her, rain falls, neon light flickers on her face. Same face, same outfit. No new objects, no text. Camera: move: locked-off medium close-up, a tripod camera with no movement
```

Optional line for the speech test, see Test B: `やっと見つけた、ジン！` (Found you at last, Jin!)

### Shot 3: jin

Jin looks back over his shoulder, then turns. He speaks.

- **Start frame:** `start-frames/03-jin.jpg`
- **Length to request:** 5 seconds. Our Wan take was 3.3 s.
- **Save the clip as:** `03-jin.mp4`

```text
Hand-drawn 2D anime film, cel shading, rainy neon night. The same young man as in the image, on-model, ONE CONTINUOUS TAKE with no cuts. 0-0.5 s: he looks back over his shoulder, calm, mouth closed, hands in his pockets. 0.5-2 s: he says a short dry line with small mouth movements, one eyebrow lifting slightly. 2-3 s: his mouth closes and he slowly turns his body to face the left of the frame, taking his hands out of his pockets. The whole time blurred people with umbrellas keep walking past, rain runs off his hoodie. Same face, same outfit. No new objects, no text. Camera: move: locked-off medium shot, a tripod camera with no movement
```

Optional line for the speech test, see Test B: `ここでやる気か。` (Here? Seriously?)

### Shot 4: charge

Akane sprints at him, alone in frame, camera tracking.

- **Start frame:** `start-frames/04-charge.jpg`
- **Length to request:** 5 seconds. Our Wan take was 2.8 s.
- **Save the clip as:** `04-charge.mp4`

```text
Hand-drawn 2D anime film, cel shading, rainy neon night. The same young woman as in the image, on-model, alone, ONE CONTINUOUS TAKE with no cuts. She sprints flat out from left to right with long powerful strides, her feet really pushing off the wet asphalt and throwing up water, arms pumping, ponytail and red jacket whipping back. She stays in the centre of the frame because the camera travels with her. The whole street rushes past behind her from right to left the entire time: umbrellas and people whip by as blurred streaks, neon signs smear into long lines of magenta, cyan and amber, zebra stripes flash under her feet. No new objects, no text. Camera: move: fast lateral tracking shot, the camera travels sideways to the right alongside the runner at her exact speed, never stopping; from: the side view in the image; to: the same side view of her, much further across the street; timing: full speed from the first frame to the last; anchors: she stays centred, the background never stops moving from right to left
```

### Shot 5: exchange

Punches, parries and blocks at arm's length.

- **Start frame:** `start-frames/05-exchange.jpg`
- **Length to request:** 5 seconds. Our Wan take was 5.1 s.
- **Save the clip as:** `05-exchange.mp4`

```text
Hand-drawn 2D anime film, cel shading, rainy neon night. The same woman in the red jacket and the same man in the white hoodie as in the image, on-model, ONE CONTINUOUS TAKE with no cuts, a clean hand-to-hand exchange with weight behind every blow. 0-0.8 s: the woman on the left finishes a straight right punch and the man on the right parries it with his forearm. 0.8-1.7 s: she swings a left hook and he leans back out of its way. 1.7-2.8 s: he answers with one straight punch and she blocks it with both forearms, sliding back a step with water spraying at her feet. 2.8-4.2 s: she steps back in with a fast one-two, landing on his raised forearms. 4.2-5 s: the pair push apart, breathing hard, guards up. Each keeps exactly two arms and two legs, same outfits, the woman stays on the left, the man on the right. Rain falls, puddles splash. No energy effects, no new people, no text. Camera: move: smooth partial arc around the two fighters, about 40 degrees in total, never a full rotation; from: the slightly low medium-wide two-shot in the image; to: the same distance, moved about 40 degrees around them to the right; timing: slow and constant from first frame to last; anchors: the woman stays on the left, the man stays on the right, the crowd ring stays far behind
```

### Shot 6: kick

Her kick lands on his crossed forearms and drives him back.

- **Start frame:** `start-frames/06-kick.jpg`
- **Length to request:** 5 seconds. Our Wan take was 2.8 s.
- **Save the clip as:** `06-kick.mp4`

```text
Hand-drawn 2D anime film, cel shading, rainy neon night. The same woman in the red jacket and the same man in the white hoodie as in the image, on-model, ONE CONTINUOUS TAKE with no cuts. 0-0.4 s: the woman whips her high roundhouse kick through with her whole body. 0.4 s: her shin slams into the man's crossed forearms, a ring of rainwater bursts outward from the contact. 0.4-2 s: he is driven backwards to the right, feet skidding and spraying water, forearms still crossed, while she follows through and lands. Same faces, same outfits, each keeps two arms and two legs. No energy effects, no new people, no text. Camera: move: small sharp push-in, then a slight shake on the contact; from: the low medium shot in the image; to: slightly closer on the contact; timing: fast at first, then almost still
```

### Shot 7: slide

Jin skids back through the rainwater and looks up.

- **Start frame:** `start-frames/07-slide.jpg`
- **Length to request:** 5 seconds. Our Wan take was 2.8 s.
- **Save the clip as:** `07-slide.mp4`

```text
Hand-drawn 2D anime film, cel shading, rainy neon night. The same man in the white hoodie and the same woman in the red jacket as in the image, on-model, ONE CONTINUOUS TAKE with no cuts. 0-1.2 s: the man skids backwards to the right in a low crouch, his feet cutting two long sprays of water out of the wet asphalt, one hand dragging on the ground, slowing down. 1.2-2.5 s: he comes to a stop and lifts his head, eyes sharp, water settling around him. Far on the left the woman stays small in her fighting stance. The crowd ring stays far behind, rain falls. No new people, no text. Camera: move: quick slight pan right with the skidding man, about 10 degrees, then settling; from: the wide low shot in the image; to: the same wide shot framed on the man as he stops; timing: fast, then settling; anchors: the zebra stripes and the crowd ring stay in the background
```

### Shot 8: smile

He lowers his guard and speaks.

- **Start frame:** `start-frames/08-smile.jpg`
- **Length to request:** 5 seconds. Our Wan take was 2.8 s.
- **Save the clip as:** `08-smile.mp4`

```text
Hand-drawn 2D anime film, cel shading, rainy neon night. The same young man as in the image, on-model, ONE CONTINUOUS TAKE with no cuts. 0-0.5 s: he lowers his taped forearms, mouth closed, rain dripping from his silver hair. 0.5-1.5 s: he says two quiet words with small mouth movements and the corner of his mouth lifts into a small smile. 1.5-2.5 s: his mouth closes, the small smile stays, steam drifts off his forearms. Blurred neon and the crowd stay soft behind him. Same face, same outfit. No new objects, no text. Camera: move: very slow push-in; from: the medium close-up in the image; to: slightly closer on his face; timing: constant
```

Optional line for the speech test, see Test B: `…悪くない。` (...Not bad.)

### Shot 9: tag

She raises her fists, grinning, and speaks.

- **Start frame:** `start-frames/09-tag.jpg`
- **Length to request:** 5 seconds. Our Wan take was 2.8 s.
- **Save the clip as:** `09-tag.mp4`

```text
Hand-drawn 2D anime film, cel shading, rainy neon night. The same young woman as in the image, on-model, ONE CONTINUOUS TAKE with no cuts. 0-0.3 s: fists up, bouncing lightly on her toes, grinning with her mouth closed. 0.3-1.8 s: she says a short excited line with clear mouth movements, laughing, and beckons once with her front hand. 1.8-2.5 s: her mouth closes in a big grin and she settles back into her guard. Rain falls, her ponytail sways, blurred neon and the crowd stay soft behind her. Same face, same outfit. No new objects, no text. Camera: move: locked-off medium shot, a tripod camera with no movement
```

Optional line for the speech test, see Test B: `まだまだ、これから！` (I'm just getting started!)

## Test B, optional: Flow's own speech and lip-sync

Our pipeline could not lip-sync: Wan does not take the voice track, so mouths move without matching the words. Flow
generates speech with the picture. To see what that adds, rerun the four talking shots (2, 3, 8 and 9) with the line
given under each shot appended to the prompt in this form:

```text
She says in Japanese: "やっと見つけた、ジン！"
```

Use "He says" for Jin's two lines. Keep Flow's sound for these four clips. This is not a like-for-like test, since our
prompt never contained the words. It measures a capability our free route does not have.

## Test C, optional: Flow from scratch

To compare the whole pipeline, not only the video model, build the sheets and first frames in Flow as well. The image
prompts are in [`END_TO_END.md`](END_TO_END.md). Expect the characters to look different from ours, which makes the
motion harder to compare shot by shot. Run Test A first.
