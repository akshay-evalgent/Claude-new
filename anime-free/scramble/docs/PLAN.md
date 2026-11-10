# Anime production plan: Scramble

## Brief and approval scope

A 20-second (480 frames, 24 fps, 16:9, 1080p) shonen fight between two original anime characters on a busy Tokyo
street at night. Requested by the user as a test of the make-an-anime pipeline with free tools in place of the paid
Fal models. Japanese voices, English subtitles. No reference photos: both characters are designed from text.

Scope approved: produce the whole 20-second scene, with every generation on free open models. Heavy models run on the
user's Kaggle free GPU quota (T4), speech recognition runs locally. No Fal call and no paid service is used.

## Creative direction

Style bible (`config/style.md`): modern shonen action film look at night, realistic adult proportions, ink lines,
two-tone cel shading with hard neon rim light, painted city backgrounds, wet asphalt mirroring magenta, cyan and amber
light, fine rain. Grounded hand-to-hand contact, no superpowers, no blood, no readable lettering anywhere.

Tone: a quiet standoff in a crowd, one fast burst of contact, a cocky ending. Hold on faces, then cut on the blows.

## Research

A Tokyo scramble crossing at night: wide zebra stripes, crowds crossing in every direction under umbrellas, buildings
covered in screens and neon. Real brands and readable signage are excluded, so signs show abstract colour shapes.

## Cast bible

| Character | Design | Voice (free: Qwen3 TTS VoiceDesign) | Sheet |
|---|---|---|---|
| Akane, 19 | Street kickboxer. High black ponytail with a red tie, amber eyes, red bomber jacket over a black crop top, black cargo trousers, white sneakers, fingerless gloves. Cocky, restless. | Bright, slightly husky young woman, fast and grinning. Japanese. | `char-akane-v1` |
| Jin, 22 | Calm, precise fighter. Short silver-white hair, grey eyes, white zip hoodie over a black t-shirt, charcoal trousers, taped hands. Unreadable. | Low, calm, dry young man, slow and quiet. Japanese. | `char-jin-v1` |

Location sheet `loc-street-v1`: the scramble crossing in rain, crowd under umbrellas, neon and screens with no text.

## Scene breakdown

One scene, `scramble-s01`, 480 frames. Every shot is one continuous painted take with the characters and the street
drawn together. No green screen.

| # | Shot | Frames | Time | What happens | Camera |
|---|---|---|---|---|---|
| 1 | street | 60 | 0.0-2.5 | The crossing in the rain. The crowd flows around two figures who stand still, facing each other. | Slow push-in from a high wide view |
| 2 | akane | 60 | 2.5-5.0 | Akane in the crowd, grinning. "Found you at last, Jin!" | Locked-off medium close-up |
| 3 | jin | 60 | 5.0-7.5 | Jin looks back over his shoulder, hands in his pockets. "Here? Seriously?" | Locked-off medium shot |
| 4 | charge | 36 | 7.5-9.0 | Akane sprints at him through the rain, alone in frame. | Fast lateral tracking shot, retimed |
| 5 | exchange | 84 | 9.0-12.5 | Punches, parries and a duck at arm's length while the crowd backs into a ring. | Partial arc around the pair, retimed |
| 6 | kick | 36 | 12.5-14.0 | Her spinning kick lands on his crossed forearms. White flash on the impact. | Sharp push-in, low angle |
| 7 | slide | 48 | 14.0-16.0 | Jin slides back through the rainwater, one hand on the asphalt. | Short pan following him |
| 8 | smile | 48 | 16.0-18.0 | He lowers his guard. "...Not bad." | Very slow push-in |
| 9 | tag | 48 | 18.0-20.0 | She grins and raises her fists. "I'm just getting started!" Cut to black. | Locked-off medium shot |

Keyframes: one painted first frame per shot (`prompts/scramble-s01/02_keyframes.yml`), composed from the two character
sheets and the location sheet as reference images. Shot prompts with timed acting beats and a separate camera direction
are in `prompts/scramble-s01/04_shots.yml`.

Overlay (`05_overlay.js`, drawn locally in p5): English subtitles, a white flash on the kick impact, fade in and out.

## Dialogue and score

Five lines in `prompts/scramble-s01/03_dialogue.yml`: Akane at 2.9 s, Jin at 5.5 s, Akane's off-screen shout on the
kick at 13.05 s, Jin at 16.45 s, Akane at 18.2 s.

Score in `prompts/scramble-s01/03_score.json`, three instrumental cues joined with short crossfades: tense standoff
0-7.5 s, fight 7.5-16 s, cocky ending sting 16-20 s. The mix ducks the score under the voices.

Sound effects in `prompts/scramble-s01-sfx/sfx.yml`: rain and crowd bed, running splashes, crowd gasp, whooshes, blocks,
one heavy impact, a wet skid.

## Free model mapping and cost

| Stage | Paid model in the pipeline | Free model used here | Where it runs |
|---|---|---|---|
| Character and location sheets | GPT Image 2.6 | Z-Image Turbo | Kaggle T4 via WanGP |
| Keyframes from reference sheets | GPT Image 2.6 edit | FLUX.2 Klein 4B with reference images | Kaggle T4 via WanGP |
| Shots | MiniMax H3 Max | Wan 2.2 image-to-video 14B Lightning, 4 steps, 832x480 (fallback: Wan 2.2 5B FastWan) | Kaggle T4 via WanGP |
| Voices | ElevenLabs Eleven v4 | Qwen3 TTS VoiceDesign | Kaggle T4 via WanGP |
| Score | ElevenLabs Music v2.5 | ACE-Step 1.5 | Kaggle T4 via WanGP |
| Sound effects | ElevenLabs SFX v3 | Stable Audio 3 Small SFX | Kaggle T4 via WanGP |
| Dialogue check | Whisper on Fal | faster-whisper | Local CPU |
| Titles, subtitles, mix | local in the pipeline | unchanged | Local CPU |
| Finishing VFX | Swift Core Image, macOS only | skipped on Linux | not run |

Calls: 3 sheets, 9 keyframes, 9 shots, 5 voice lines, 3 music cues, 7 sound effects. Retry allowance: up to 2 retakes
per keyframe and per shot. Money cost: zero. Kaggle GPU time: three batches, estimated 2 to 3 hours of the free weekly
quota, most of it video.

Known limits accepted for this test: Wan does not take the voice track as target audio, so mouths move from the prompt
and are not lip-synced. Clips are 832x480 at 16 fps, conformed to 24 fps and upscaled to 1080p.

## Production waves

1. Sheets, voices, score, sound effects (one Kaggle batch). Review sheets and line timings.
2. Keyframes (one Kaggle batch). Review faces, outfits, staging.
3. Shots (one Kaggle batch). Review every take, retake within the allowance.
4. Overlay, sound-effect mix, final review, delivery. Short pilot, produced serially.

## Review and delivery

Deliver the 20-second film with sound effects, a clean version without them, the sheets, the keyframe board, this
plan, and a report of what worked, what was retaken and what remains imperfect.
