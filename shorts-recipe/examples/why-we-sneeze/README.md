# Why We Sneeze 🤧

A 36-second vertical short (21 shots) built to the recipe in `../../index.html`. It's character-driven: ten different characters appear across eight scenes (office coworkers, a hallway of strangers, four friends, library readers, a patient and his doctor), plus cartoon germs with faces. It follows the mechanism format: a cold-open sneeze, a "You see" explanation at 20% of the runtime, a "But for about one in four people…" twist, and a true-story payoff with the same ironic sting as the hiccup short.

## Files

- `output/why-we-sneeze.mp4`: upload this one (1080×1920, 30 fps, captions burned in)
- `output/why-we-sneeze-no-captions.mp4`: the same video without captions
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions and settings

## Script (115 words, 197 wpm, 35.3 s of voice)

> Your nose starts to tickle, your eyes squeeze shut, and your whole body launches whatever was in there across the room. You see, when dust or germs touch the nerves inside your nose, your brain fires a reflex to blast them out, and the spray can travel up to 26 feet. But for about one in four people, just stepping into bright sunlight can make them sneeze, because scientists think the signals from their eyes get crossed with the nerves in their nose. And you should never hold one in. One man pinched his nose and closed his mouth to stop a sneeze, and the pressure tore a hole in the back of his throat.

## Cast

| Character | Look | Scenes |
|---|---|---|
| The sneezer | Teal shirt, brown hair | Office, germs, reflex, hallway |
| Coworker | Yellow shirt, long auburn hair | Office (gets sprayed), sunlight, library |
| Coworker | Purple shirt, curly hair, glasses | Office, sunlight, library |
| Hallway line | Red shirt and blue cap; green shirt, bald; pink shirt, long blonde hair | Hallway flinch line |
| The sun sneezer | Orange shirt, red cap | Hallway, sunlight, crossed signals |
| The bearded man | Red flannel, beard | Library, throat, hospital |
| Doctor | White coat, glasses, stethoscope | Hospital |
| Germs | Green, purple and orange spiky germs with faces | Nose, tunnel, blast |

## Shots

| Time | Line | Picture | Transition in |
|---|---|---|---|
| 0.00 | Your nose starts to tickle | Close-up: dust drifts at the sneezer's nose, which twitches | Cold open |
| 1.60 | your eyes squeeze shut | Face close-up: head tips back, eyes squeeze, the "ah… ah…" wind-up | Hard cut |
| 3.26 | and your whole body launches… across the room | Wide office: the sneeze cloud blasts across the desks; two coworkers recoil and papers fly | Hard cut |
| 5.60 | across the room | Close-up of the sprayed coworker | Hard cut |
| 7.00 | You see, when dust or germs | Cartoon germs and dust fly into the nostril | Whip pan |
| 9.22 | touch the nerves inside your nose | Inside the nose: a pink tunnel with yellow nerve endings that light up as germs pass | Hard cut |
| 11.36 | your brain fires a reflex | X-ray head: the brain flashes and signals shoot down to the face and chest | Push-through flash |
| 13.18 | to blast them out | The sneeze fires and the germs tumble out in the spray | Hard cut |
| 14.24 | and the spray can travel up to 26 feet | Hallway: a line of people flinch one after another as the cloud passes along a tape measure | Hard cut |
| 15.64 | 26 feet | Close-up of the "26 FT" marker as the last person flinches | Hard cut |
| 16.94 | But for about one in four people | Four friends walk toward a bright doorway; a "1 IN 4" label points at one | Card swing |
| 18.66 | just stepping into bright sunlight | Outside: the four step into the sun and squint | Hard cut |
| 20.42 | can make them sneeze | Close-up: the friend in the red cap sneezes and the others turn | Hard cut |
| 21.62 | because scientists think the signals from their eyes | Translucent head with glowing nerve paths from the eye and the nose | Dissolve |
| 23.92 | get crossed | Close-up on the eye | Hard cut |
| 24.58 | with the nerves in their nose | The two paths cross with a flash | Hard cut |
| 26.90 | And you should never hold one in | Quiet library: readers glare, "SHHH!" | Card swing |
| 29.42 | One man pinched his nose | The bearded man pinches his nose | Hard cut |
| 30.56 | and closed his mouth | Cheeks puff up and his face turns red | Hard cut |
| 31.56 | to stop a sneeze | A muffled jolt as the sneeze is held in | Hard cut |
| 32.72 | and the pressure tore a hole | X-ray throat: pressure builds and a tear flashes | Push-through flash |
| 33.70 | in the back | Close-up of the tear | Hard cut |
| 34.30 | of his throat | Hospital bed: neck brace, IV, and a deadpan doctor with a clipboard; hard stop | Hard cut |

## Sources to check before publishing

- **The reflex:** irritants stimulate trigeminal nerve endings in the nose, and the brainstem triggers the sneeze. Standard physiology.
- **26 feet:** Bourouiba et al. (2014, *Journal of Fluid Mechanics*) and later MIT work found the sneeze cloud can carry droplets up to about 8 m (26 ft).
- **One in four:** the photic sneeze reflex is reported in roughly 18–35% of people. The crossed-wires explanation is a hypothesis, so the script says "scientists think".
- **Holding it in:** Yang et al. (2018, *BMJ Case Reports*) describe a man who ruptured the back of his throat (pharynx) by pinching his nose and closing his mouth during a sneeze. He recovered. A 2023 *BMJ Case Reports* case describes a tracheal tear from a held-in sneeze.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.91. It's the same voice as the other shorts.
- **Music and sound effects:** synthesized in `audio/mix_sneeze.py`, including the "ah… ah… CHOO" (breathy vowels plus a noise burst), the muffled held-in sneeze, germ boings, birds, footsteps, the library clock, the rip and monitor beeps.
- **Visuals:** procedural three.js in `src/sneeze.js`. `makeChar()` extends the base character with hair styles (short, long, curly, bald, cap), skin tones, a beard, glasses, a doctor's coat, walking legs, puffable cheeks, blushing and a full sneeze action. Germs, the spray cloud, the office, hallway, street, library and hospital are all built in code.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` regenerates the voice, renders 1,071 frames (about 30 minutes on 4 CPU cores with software WebGL), mixes and masters the audio, and encodes both versions.
