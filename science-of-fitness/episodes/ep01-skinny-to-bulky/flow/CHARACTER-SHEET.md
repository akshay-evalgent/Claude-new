# Episode 1 · Character sheet for Google Flow

Three recurring characters carry the episode. Make their reference images once, then attach them to every shot as **Ingredients**. That, plus the identical descriptions inside every prompt in `SHOTS.md`, keeps them looking the same from shot to shot.

## The characters

| Character | Role | Look in one line |
|---|---|---|
| **Rohan** | The skinny 18-year-old the episode follows. He voices the viewer's questions. | Very thin, slouching, oversized white t-shirt, **teal shorts** |
| **Rohan, week 12** | The same guy after the plan: the payoff | Same face and clothes, fuller chest and shoulders, upright |
| **Tiger** | Big gym bro who believes the myths, then becomes Rohan's friend | Huge, bald, all grey |
| **The Muscle Crew** | Tiny workers inside the muscle who explain the science | Teal hard hats build, coral hard hats tear down, amber bricks are protein |

The narrator stays off-screen. Names are placeholders. Change them in `SCRIPT.md` and the prompts if you rename them.

## Exact descriptions (do not reword)

These sentences appear word for word in every shot prompt.

**Rohan:** Rohan, a very skinny 18-year-old South Asian guy: narrow shoulders, flat chest, visible collarbones, thin arms and very thin wrists, bony elbows and knees, long thin neck, slight forward slouch; short messy black hair with a fringe over his forehead; big expressive dark eyes; light warm-grey skin tone; oversized plain white t-shirt hanging loose on his frame, teal shorts, white sneakers

**Rohan, week 12:** Rohan twelve weeks later: the same face, hair and outfit, but broader shoulders, a fuller chest and thicker arms, the white t-shirt now fits snugly, standing upright and confident; still lean and natural, not a bodybuilder

**Tiger:** Tiger, a huge bald bodybuilder in his mid-20s: thick neck, short stubble beard, big cocky grin, massive shoulders and arms, grey tank top, grey joggers, grey sneakers, small towel over one shoulder; drawn only in flat grey tones

**The Muscle Crew:** the Muscle Crew: tiny chibi construction workers living inside the muscle; builders in teal hard hats carrying glowing amber protein bricks; a demolition team in coral hard hats with tiny hammers

**Style:** 2D anime, black-and-white seinen manga look, crisp black ink lines, grey screentone shading and hatching; only teal, coral and amber elements are in color, everything else monochrome; solid near-black background with minimal props; smooth animation; 16:9.

### What makes Rohan read as skinny

- Shoulders no wider than his hips, and a flat chest. His collarbones and wrist bones show.
- His t-shirt is a size too big and hangs off him. The sleeves flap around thin arms.
- A slight slouch, and a long neck.
- If a generation gives him abs or muscle definition, re-roll it. He should look like a beginner who has never trained.

## Make the reference images in Flow

Use Flow's image generation, or Gemini or Whisk. Generate each sheet, pick the best of the options, and download it. Order matters:

1. Make **A** first. Generate four options and keep the one that most looks like a skinny, likeable 18-year-old.
2. Make **B** and **C** with A attached as the reference image, so the face stays the same.
3. Make **D** (Tiger) and **E** (the crew). **F** is optional, to check their sizes against each other.

Flow's guidance is that references work best on a plain background. That's why the sheets use light grey, even though the shots use the dark stage.

### A. Rohan · model sheet

Save as: **Rohan sheet**

```text
Character model sheet of one character drawn four times side by side at the same size: front view, three-quarter view, side profile and back view, full body, standing relaxed with arms at his sides. Rohan, a very skinny 18-year-old South Asian guy: narrow shoulders, flat chest, visible collarbones, thin arms and very thin wrists, bony elbows and knees, long thin neck, slight forward slouch; short messy black hair with a fringe over his forehead; big expressive dark eyes; light warm-grey skin tone; oversized plain white t-shirt hanging loose on his frame, teal shorts, white sneakers. 2D anime, black-and-white seinen manga look, crisp black ink lines, grey screentone shading and hatching; only teal, coral and amber elements are in color, everything else monochrome. Only the shorts are teal. Plain light-grey background, even lighting, the whole body visible, no text, no labels, no logos.
```

### B. Rohan · expressions

Save as: **(optional) Rohan expressions**

```text
Expression sheet of the same character as the reference image: six head-and-shoulders portraits in a 3 by 2 grid showing neutral, big grin, surprised, sleepy, determined and embarrassed. Rohan, a very skinny 18-year-old South Asian guy: narrow shoulders, flat chest, visible collarbones, thin arms and very thin wrists, bony elbows and knees, long thin neck, slight forward slouch; short messy black hair with a fringe over his forehead; big expressive dark eyes; light warm-grey skin tone; oversized plain white t-shirt hanging loose on his frame, teal shorts, white sneakers. 2D anime, black-and-white seinen manga look, crisp black ink lines, grey screentone shading and hatching; only teal, coral and amber elements are in color, everything else monochrome. Plain light-grey background, even lighting, the whole body visible, no text, no labels, no logos.
```

### C. Rohan · twelve weeks later

Save as: **Rohan week-12 sheet**

```text
Character model sheet of the same character as the reference image, twelve weeks later, drawn four times side by side at the same size: front, three-quarter, side and back views, full body. Rohan twelve weeks later: the same face, hair and outfit, but broader shoulders, a fuller chest and thicker arms, the white t-shirt now fits snugly, standing upright and confident; still lean and natural, not a bodybuilder. Keep the same face, hair, t-shirt, teal shorts and sneakers as the reference. 2D anime, black-and-white seinen manga look, crisp black ink lines, grey screentone shading and hatching; only teal, coral and amber elements are in color, everything else monochrome. Plain light-grey background, even lighting, the whole body visible, no text, no labels, no logos.
```

### D. Tiger · model sheet

Save as: **Tiger sheet**

```text
Character model sheet of one character drawn four times side by side at the same size: front view, three-quarter view, side profile and back view, full body, arms crossed in the front view. Tiger, a huge bald bodybuilder in his mid-20s: thick neck, short stubble beard, big cocky grin, massive shoulders and arms, grey tank top, grey joggers, grey sneakers, small towel over one shoulder; drawn only in flat grey tones. 2D anime, black-and-white seinen manga look, crisp black ink lines, grey screentone shading and hatching; only teal, coral and amber elements are in color, everything else monochrome. He has no color at all. Plain light-grey background, even lighting, the whole body visible, no text, no labels, no logos.
```

### E. The Muscle Crew

Save as: **Muscle Crew sheet**

```text
Character sheet of tiny chibi construction workers: three builders in teal hard hats, one carrying a glowing amber brick, one pushing a wheelbarrow of amber bricks, one waving; and two demolition workers in coral hard hats holding tiny hammers. 2D anime, black-and-white seinen manga look, crisp black ink lines, grey screentone shading and hatching; only teal, coral and amber elements are in color, everything else monochrome. Plain light-grey background, even lighting, the whole body visible, no text, no labels, no logos.
```

### F. Rohan and Tiger together (scale check)

Save as: **(optional) scale reference**

```text
Rohan and Tiger standing side by side, front view, full body, to show their size difference: Tiger is a head taller and about three times as wide. Rohan, a very skinny 18-year-old South Asian guy: narrow shoulders, flat chest, visible collarbones, thin arms and very thin wrists, bony elbows and knees, long thin neck, slight forward slouch; short messy black hair with a fringe over his forehead; big expressive dark eyes; light warm-grey skin tone; oversized plain white t-shirt hanging loose on his frame, teal shorts, white sneakers. Tiger, a huge bald bodybuilder in his mid-20s: thick neck, short stubble beard, big cocky grin, massive shoulders and arms, grey tank top, grey joggers, grey sneakers, small towel over one shoulder; drawn only in flat grey tones. 2D anime, black-and-white seinen manga look, crisp black ink lines, grey screentone shading and hatching; only teal, coral and amber elements are in color, everything else monochrome. Plain light-grey background, even lighting, the whole body visible, no text, no labels, no logos.
```

## Using them in shots

1. **Ingredients to Video:** choose Video, then Ingredients, and add up to three references listed in the shot, for example the Rohan sheet plus the Tiger sheet. Paste the shot prompt.
2. **The transformation (shot 29B):** if Ingredients can't morph Rohan convincingly, use **Frames to Video**. First, generate two stills in the same mirror pose: one with sheet A attached, one with sheet C. Use them as the first and last frame.
3. **Iterate cheaply:** use Veo 3.1 Fast to test a prompt. Switch to the Quality model for the take you keep.
4. **Check:** the face and outfit match the sheet, Rohan still looks skinny (except week 12), Tiger stays grey, and exercise form matches the prompt. AI video often bends joints wrongly, so re-roll anything that would teach bad form.
5. **Audio:** Flow adds sound. It's ignored. Only the voiceover is used.

## Send the shots back

Name each file by its shot ID (`01A.mp4`, `24B.mp4`, …) and put it in `episodes/ep01-skinny-to-bulky/flow/shots/`, or share them with me. I'll fit each clip to its window on the voiceover, add the few number overlays, and fill any missing shots from the anatomy kit. Even a partial set works. Start with the tier 1 shots.
