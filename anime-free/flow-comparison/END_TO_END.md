# Scramble in Google Flow from scratch: image prompts

Test C of [`README.md`](README.md). These are the exact prompts that produced our sheets and first frames. Use them with Flow's image model, 16:9.

## Step 1: the three sheets

Text to image, no references. Our results are in [`../results/sheets/`](../results/sheets/) for comparison.

### Sheet: Akane

```text
Character design sheet for an anime film. Modern shonen action anime film style: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading, clean flat neutral studio light. The character: AKANE, a 19-year-old Japanese woman, a street kickboxer, an adult with adult proportions and an athletic build. Fair skin, sharp amber eyes, a confident grin, long black hair in a high ponytail held by a red hair tie. Outfit: a red bomber jacket with white stripes on the collar and cuffs, worn open over a black crop tank top, black cargo trousers, white sneakers, black fingerless gloves. Restless, cocky, fearless presence. Layout: the whole image is one plain flat light-grey background with nothing else on it. Full-body front view, three-quarter view, side profile view and back view standing in a row on the left two thirds; on the right, a large front-view head close-up and three smaller expression heads: a cocky grin, a fierce fighting shout, a focused glare. The same woman, the same skin tone and the same outfit in every view, relaxed standing pose, whole silhouette inside the frame with margins, consistent scale. No scenery, no street, no city, no neon, no rain, no panels, no frames. No text, labels, name tags, colour swatches, numbers, logos or watermarks; no extra characters; no photoreal rendering.
```

### Sheet: Jin

```text
Character design sheet for an anime film. Modern shonen action anime film style: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading, clean flat neutral studio light. The character: JIN, a 22-year-old Japanese man, a calm and precise fighter, tall and lean with realistic adult proportions. Fair pale skin, narrow steel-grey eyes, straight eyebrows, a composed unreadable face, short messy silver-white hair. Outfit: a plain bright white zip hoodie with the hood down, worn open over a black t-shirt, dark charcoal trousers, black sneakers, white bandage tape wrapped around both hands and knuckles. Quiet, relaxed, dangerous presence. Layout: the whole image is one plain flat light-grey background with nothing else on it. Full-body front view, three-quarter view, side profile view and back view standing in a row on the left two thirds; on the right, a large front-view head close-up and three smaller expression heads: calm and unreadable with his mouth closed, a small dry smile, a sharp focused glare. The same man in every view: the same fair pale skin, the same silver-white hair and the same bright white hoodie, never grey, never tanned. Relaxed standing pose with his hands out of his pockets, whole silhouette inside the frame with margins, consistent scale. No scenery, no street, no city, no neon, no rain, no panels, no frames. No text, labels, name tags, colour swatches, numbers, logos or watermarks; no extra characters; no photoreal rendering.
```

### Sheet: the street

```text
Location painting for an anime film: a background plate with no main character. Modern anime film background art, richly painted with atmospheric depth, crisp cel-shaded crowd figures, night palette of deep blue-violet shadows, magenta and cyan neon and warm amber shop light. The location: a huge scramble crossing in central Tokyo on a rainy night, seen from eye level at the edge of the crossing looking across it. Wide white zebra stripes on black wet asphalt that mirrors the lights, tall buildings on every side covered in glowing neon signs and giant video screens that show only abstract colour shapes, overhead power lines, traffic lights, fine rain, light haze, puddles. A dense crowd of ordinary pedestrians in coats and jackets crosses in every direction under transparent and dark umbrellas. Every person is small, anonymous, fully clothed and simply walking, seen from behind or far away, with no close faces. The centre foreground of the crossing is empty wet asphalt and zebra stripes. Nobody stands out, nobody poses, nobody fights. Wide 16:9 establishing view, deep perspective down the avenue. No readable text, no lettering, no logos, no vehicles in the crossing.
```

## Step 2: the nine first frames

Each first frame is composed from the sheets as reference images, which Flow calls ingredients. The prompts refer to them by number, so add them in the order listed for each frame.

### First frame 1: street

- **References, in this order:** image 1 is the street painting, image 2 is the Akane sheet, image 3 is the Jin sheet

```text
Modern shonen action anime film look for a grounded street-fight story at night: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading with hard coloured rim light, rich painted city backgrounds with atmospheric depth. Night palette: deep blue-violet shadows, magenta and cyan neon, warm amber shop light, wet asphalt that mirrors the lights, fine rain. Shop signs and screens show only abstract glowing shapes and colour blocks. Weighty, believable martial-arts poses, no superpowers, no energy blasts, no flames, no glowing auras, no blood. Composed like a film still. Not moe, not chibi, not 3D, not photoreal, no text, no lettering, no captions, no logos, no watermarks. A single film still, one painted image, not a character sheet. High wide shot looking down across the rainy scramble crossing from image 1 at night: zebra stripes on wet black asphalt mirroring magenta and cyan neon, a dense crowd under umbrellas crossing in every direction. In the middle of the crossing two small figures stand completely still, six metres apart, facing each other, while the crowd flows around them: on the left the young woman from image 2 in her red bomber jacket with her black ponytail, on the right the young man from image 3 in his white hoodie with silver-white hair. Both are small in the frame, seen full-body. Fine rain, haze, puddles. No readable text, no lettering.
```

### First frame 2: akane

- **References, in this order:** image 1 is the Akane sheet, image 2 is the street painting

```text
Modern shonen action anime film look for a grounded street-fight story at night: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading with hard coloured rim light, rich painted city backgrounds with atmospheric depth. Night palette: deep blue-violet shadows, magenta and cyan neon, warm amber shop light, wet asphalt that mirrors the lights, fine rain. Shop signs and screens show only abstract glowing shapes and colour blocks. Weighty, believable martial-arts poses, no superpowers, no energy blasts, no flames, no glowing auras, no blood. Composed like a film still. Not moe, not chibi, not 3D, not photoreal, no text, no lettering, no captions, no logos, no watermarks. A single film still, one painted image, not a character sheet. Medium close-up, slightly low angle, of the 19-year-old woman from image 1 standing on the rainy scramble crossing from image 2 at night: the same face, sharp amber eyes, long black hair in a high ponytail with a red tie, red bomber jacket with white collar stripes open over a black crop top, black fingerless gloves. She is in the left half of the frame, framed from the waist up, in three-quarter view facing the RIGHT of the frame, eyes locked on someone off-screen to the right, a cocky grin with her mouth closed, one gloved fist raised to chest height. Magenta neon rim light on the left side of her face and hair, cyan light on the right, raindrops on her jacket, wet hair strands. Behind her, out of focus, pedestrians with umbrellas walk past and neon signs glow as soft bokeh. An out-of-focus umbrella edge crosses the near foreground at the right. No other faces in focus, no text.
```

### First frame 3: jin

- **References, in this order:** image 1 is the Jin sheet, image 2 is the street painting

```text
Modern shonen action anime film look for a grounded street-fight story at night: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading with hard coloured rim light, rich painted city backgrounds with atmospheric depth. Night palette: deep blue-violet shadows, magenta and cyan neon, warm amber shop light, wet asphalt that mirrors the lights, fine rain. Shop signs and screens show only abstract glowing shapes and colour blocks. Weighty, believable martial-arts poses, no superpowers, no energy blasts, no flames, no glowing auras, no blood. Composed like a film still. Not moe, not chibi, not 3D, not photoreal, no text, no lettering, no captions, no logos, no watermarks. A single film still, one painted image, not a character sheet. Medium shot of the 22-year-old man from image 1 standing on the rainy scramble crossing from image 2 at night: the same face, narrow steel-grey eyes, short messy silver-white hair, white zip hoodie with the hood down open over a black t-shirt, white tape on his hands. He is in the right half of the frame, framed from the hips up, body turned away with his back three-quarters to the camera, looking back over his left shoulder toward the LEFT of the frame with a calm, unreadable face and his mouth closed, both hands in his hoodie pockets. Cyan neon rim light on his hair and shoulder, warm amber shop light on his cheek, rain running off the hoodie. Around him, out of focus, pedestrians with umbrellas keep walking. Wet asphalt and zebra stripes mirror the lights below. No other faces in focus, no text.
```

### First frame 4: charge

- **References, in this order:** image 1 is the Akane sheet, image 2 is the street painting

```text
Modern shonen action anime film look for a grounded street-fight story at night: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading with hard coloured rim light, rich painted city backgrounds with atmospheric depth. Night palette: deep blue-violet shadows, magenta and cyan neon, warm amber shop light, wet asphalt that mirrors the lights, fine rain. Shop signs and screens show only abstract glowing shapes and colour blocks. Weighty, believable martial-arts poses, no superpowers, no energy blasts, no flames, no glowing auras, no blood. Composed like a film still. Not moe, not chibi, not 3D, not photoreal, no text, no lettering, no captions, no logos, no watermarks. A single film still from a fast tracking shot, one painted image, not a character sheet. The rainy scramble crossing from image 2 at night. The 19-year-old woman from image 1 alone, the same face, black ponytail with a red tie, red bomber jacket over a black crop top, black cargo trousers, white sneakers, sprinting flat out from left to right in pure side view in the centre of the frame, seen full-body from knee height. Mid-stride, leaning hard forward, rear leg driving off the wet asphalt and throwing up a fan of water, fists pumping, jaw set, ponytail and jacket streaming behind her. The camera travels beside her at her speed, so the crowd, umbrellas and neon signs behind her are smeared into long horizontal motion-blur streaks of magenta, cyan and amber, while she stays sharp. Zebra stripes streak past under her feet. No other sharp figures, no text.
```

### First frame 5: exchange

- **References, in this order:** image 1 is the Akane sheet, image 2 is the Jin sheet, image 3 is the street painting

```text
Modern shonen action anime film look for a grounded street-fight story at night: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading with hard coloured rim light, rich painted city backgrounds with atmospheric depth. Night palette: deep blue-violet shadows, magenta and cyan neon, warm amber shop light, wet asphalt that mirrors the lights, fine rain. Shop signs and screens show only abstract glowing shapes and colour blocks. Weighty, believable martial-arts poses, no superpowers, no energy blasts, no flames, no glowing auras, no blood. Composed like a film still. Not moe, not chibi, not 3D, not photoreal, no text, no lettering, no captions, no logos, no watermarks. A single film still, one painted image, not a character sheet. Slightly low medium-wide two-shot on the wet asphalt of the scramble crossing from image 3 at night. On the LEFT the woman from image 1 in her red bomber jacket and black cargo trousers, on the RIGHT the man from image 2 in his white hoodie and charcoal trousers, the same faces and hair, both in fighting guards one arm's length apart, full bodies in frame down to the knees. She has just started a straight right punch, his left forearm rises to parry it. Fierce focused faces with closed mouths. Far behind them the crowd has backed away into a wide ring, small and out of focus under umbrellas, with neon signs glowing above. Magenta and cyan rim light on both fighters, rain, their reflections in the puddles. Exactly two people in focus, no text.
```

### First frame 6: kick

- **References, in this order:** image 1 is the Akane sheet, image 2 is the Jin sheet, image 3 is the street painting

```text
Modern shonen action anime film look for a grounded street-fight story at night: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading with hard coloured rim light, rich painted city backgrounds with atmospheric depth. Night palette: deep blue-violet shadows, magenta and cyan neon, warm amber shop light, wet asphalt that mirrors the lights, fine rain. Shop signs and screens show only abstract glowing shapes and colour blocks. Weighty, believable martial-arts poses, no superpowers, no energy blasts, no flames, no glowing auras, no blood. Composed like a film still. Not moe, not chibi, not 3D, not photoreal, no text, no lettering, no captions, no logos, no watermarks. A single film still, one painted image, not a character sheet. Dramatic low-angle medium shot in profile on the rainy scramble crossing from image 3 at night. On the LEFT the woman from image 1 in her red bomber jacket spins on her left foot and drives a high roundhouse kick with her right leg, hips turned, ponytail whipping, fierce shout. On the RIGHT the man from image 2 in his white hoodie has both taped forearms crossed in front of his head to block, feet braced, eyes sharp, her shin a hand's width from his forearms and not yet touching. The same faces and hair. Water drops hang in the air around her foot, neon signs blur behind them, the crowd is a soft ring far away. Exactly two people in focus, no text.
```

### First frame 7: slide

- **References, in this order:** image 1 is the Jin sheet, image 2 is the Akane sheet, image 3 is the street painting

```text
Modern shonen action anime film look for a grounded street-fight story at night: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading with hard coloured rim light, rich painted city backgrounds with atmospheric depth. Night palette: deep blue-violet shadows, magenta and cyan neon, warm amber shop light, wet asphalt that mirrors the lights, fine rain. Shop signs and screens show only abstract glowing shapes and colour blocks. Weighty, believable martial-arts poses, no superpowers, no energy blasts, no flames, no glowing auras, no blood. Composed like a film still. Not moe, not chibi, not 3D, not photoreal, no text, no lettering, no captions, no logos, no watermarks. A single film still, one painted image, not a character sheet. Wide low shot on the rainy scramble crossing from image 3 at night. In the RIGHT half of the frame the man from image 1 in his white hoodie, the same face and silver-white hair, is pushed backwards in a low crouch, both feet skidding on the wet asphalt and throwing long sprays of water forward, one taped hand touching the ground, the other forearm still raised, eyes up and sharp. Far on the LEFT of the frame, small, the woman from image 2 in her red bomber jacket lands from her kick in a fighting stance. Zebra stripes and neon reflections stretch between them, the crowd stands in a wide ring far behind under umbrellas. Exactly two people in focus, no text.
```

### First frame 8: smile

- **References, in this order:** image 1 is the Jin sheet, image 2 is the street painting

```text
Modern shonen action anime film look for a grounded street-fight story at night: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading with hard coloured rim light, rich painted city backgrounds with atmospheric depth. Night palette: deep blue-violet shadows, magenta and cyan neon, warm amber shop light, wet asphalt that mirrors the lights, fine rain. Shop signs and screens show only abstract glowing shapes and colour blocks. Weighty, believable martial-arts poses, no superpowers, no energy blasts, no flames, no glowing auras, no blood. Composed like a film still. Not moe, not chibi, not 3D, not photoreal, no text, no lettering, no captions, no logos, no watermarks. A single film still, one painted image, not a character sheet. Medium close-up of the 22-year-old man from image 1 on the rainy scramble crossing from image 2 at night, the same face, steel-grey eyes, short messy silver-white hair wet from the rain, white hoodie. He is centred, framed from the chest up, facing the camera turned slightly to the LEFT of the frame, lowering his taped forearms from in front of his face, looking past the camera to the left with a calm face and his mouth closed. Cyan rim light on his hair, magenta light on his shoulder, light steam rising from his forearms, rain. Behind him the neon signs and the crowd are soft bokeh. No other faces in focus, no text.
```

### First frame 9: tag

- **References, in this order:** image 1 is the Akane sheet, image 2 is the street painting

```text
Modern shonen action anime film look for a grounded street-fight story at night: realistic adult anatomy and proportions, confident hand-drawn ink lines with varied weight, crisp two-tone cel shading with hard coloured rim light, rich painted city backgrounds with atmospheric depth. Night palette: deep blue-violet shadows, magenta and cyan neon, warm amber shop light, wet asphalt that mirrors the lights, fine rain. Shop signs and screens show only abstract glowing shapes and colour blocks. Weighty, believable martial-arts poses, no superpowers, no energy blasts, no flames, no glowing auras, no blood. Composed like a film still. Not moe, not chibi, not 3D, not photoreal, no text, no lettering, no captions, no logos, no watermarks. A single film still, one painted image, not a character sheet. Medium shot of the 19-year-old woman from image 1 on the rainy scramble crossing from image 2 at night, the same face, amber eyes, black ponytail with a red tie, red bomber jacket over a black crop top, black fingerless gloves. She is centred, framed from the hips up, facing the RIGHT of the frame in three-quarter view, both fists raised in a kickboxing guard, bouncing on her toes, a big cocky grin with her mouth closed, breathing hard, wet hair strands on her forehead. Magenta rim light from the left, cyan from the right, rain. Behind her the crowd ring and the neon signs are soft bokeh. No other faces in focus, no text.
```

## Step 3: the nine shots

Use each first frame from step 2 as the start frame with the shot prompts in [`README.md`](README.md).
