# Style Bible: Minecraft Story Videos

How we make our videos: 3-minute animated stories set in a Minecraft-style block world. Every character is designed to look like the person or thing the script describes.

Everyone on the project should read this before they write, design, animate, caption or edit. If something isn't covered here, ask, and once it's decided, add it.

---

## 1. What we make

| | |
|---|---|
| **Format** | Long-form animated story, **2:50–3:20** |
| **World** | Minecraft-style: bright, daylit and blocky, built and animated in 3D (not gameplay footage) |
| **Source** | A script we write or a client gives us |
| **Promise to the viewer** | A familiar situation, person or idea, retold in blocks, with a laugh or a twist every 20–30 seconds |
| **Reference** | [Power Studios](https://www.youtube.com/@Power_Studios/shorts) (5.2M subs). We take their formula, not their assets. See §13. |

### What we take from the reference
- Concepts get bodies: an idea, product, brand or person becomes a blocky character with a name tag.
- One clear premise per video, which you can tell from the title alone.
- Bright, clean, high-contrast sets and a small cast.
- Big captions so the video works with the sound off.
- Hits turn into series: when an episode works, it gets sequels.

### What we do differently
- **We tell stories, not single jokes.** Their videos are 30–60 s shorts. Ours have a beginning, escalation and a payoff over 3 minutes (§3).
- **We have our own cast, caption style, watermark and title signature.** We never use theirs.

---

## 2. Technical specs

| Item | Spec |
|---|---|
| Master format | **16:9, 1920×1080** (4K 3840×2160 if render time allows) |
| Frame rate | **30 fps** |
| Length | 2:50–3:20. Don't pad to reach 3:00. Cut to the story. |
| Cut-downs | Keep the action inside the **centre 9:16 area** (a 608 px wide column at 1080p), so 30–60 s vertical shorts can be cropped from the master without reframing |
| Codec (delivery) | H.264 High, 16–20 Mbps at 1080p (or ProRes 422 to the editor); AAC 48 kHz stereo, 320 kbps |
| Loudness | **−14 LUFS integrated, −1 dBTP true peak** |
| Captions file | Also export a `.srt` of the dialogue for the YouTube CC track |

> **Why 16:9:** YouTube treats square and vertical uploads of **3 minutes or less** as Shorts. A vertical 3:00 video would land in the Shorts feed, not long-form. Make the master 16:9. If we ever want vertical long-form, it has to run longer than 3:00.

---

## 3. Story structure: the 3-minute beat map

Every script gets broken into this map before anything is designed. The timings are targets, not laws, but **the gap between beats should never be more than 30 s.**

| Time | Beat | What happens | Rule |
|---|---|---|---|
| 0:00–0:05 | **Cold open** | The most absurd or highest-stakes frame of the whole video, then "earlier…" or a hard cut back | The first frame should work as a thumbnail. No logo, no title card. |
| 0:05–0:20 | **Setup** | Who the characters are and what they want, in one line each. Name tags appear. | The premise is clear by 0:15 |
| 0:20–0:50 | **Beat 1** | First attempt or first round | Something goes wrong or gets funnier |
| 0:50–1:20 | **Beat 2** | Escalation: a new character, a higher stake or a bigger set | Must top Beat 1 |
| 1:20–1:35 | **Midpoint turn** | "But then…": a reversal, reveal or betrayal | The viewer's expectation flips |
| 1:35–2:20 | **Beats 3–4** | Escalation at the new stakes | The biggest set piece goes here |
| 2:20–2:40 | **Payoff** | The cold open plays out properly, and the premise resolves | It has to pay off what the title promised |
| 2:40–2:55 | **Button** | A callback joke to something from the first minute | Short. One line or one action. |
| 2:55–end | **Sequel hook + end screen** | Tease the next episode while the button plays on | Keep the top corners clear for end-screen elements |

### Turning a script into beats
1. Write the premise in **one sentence** that could be the title.
2. List every moment in the script, then sort them by how big they are. The biggest goes in the cold open and payoff, the second biggest at the midpoint.
3. If two beats in a row have the same size, cut one or merge them.
4. Cut any line that doesn't set up, escalate or pay off something.
5. **Script length:** about 330–400 words of dialogue for 3:00. That leaves room for wordless physical gags. Over 450 words means it's too talky.

### Premise formats that work
Use these as the base. Each can be stretched to 3 minutes with the beat map.

| Format | Example premise | How it stretches to 3 min |
|---|---|---|
| **X vs Y** | Rich vs Poor, Mom vs Dad | Rounds in different situations, then a final showdown |
| **Tournament / ranking** | Strongest Block, Best Wood | Elimination bracket; the underdog wins |
| **POV** | POV: you broke Mom's vase | Escalating cover-up attempts |
| **Bro became X** | Bro became a mentalist | Power gained, power abused, power backfires |
| **Then vs Now** | Kids eating then vs now | Alternating eras; the last cut lands on the present |
| **Would you…?** | AI characters face dilemmas | 3–4 dilemmas with a running score; the last answer is the twist |

---

## 4. Characters: designing from the script

Our characters are meant to **resemble the actual script**. Viewers should recognise who someone is before the name tag appears.

### 4.1 The four markers that make a character recognisable
Every character gets all four. Pick them in this order:

1. **Silhouette.** Hair, hat or headwear built from blocks, plus build (see 4.2). This is what reads in a wide shot.
2. **Colour signature.** 2–3 dominant colours, taken from the script's description or the real subject's best-known look.
3. **One signature prop.** The single object most tied to the character (white glove, phone, frying pan, crown). Only one per character.
4. **Name tag.** Floating label above the head (§7.2), shown for the character's first 3+ seconds on screen and again whenever the cast is reintroduced.

If a character can't be identified from markers 1–3 alone, redesign it before moving on.

### 4.2 Builds and proportions
| Character type | Model | Scale |
|---|---|---|
| Adult, default | Classic arms (4 px) | 1.0 |
| Slim adult | Slim arms (3 px) | 1.0 |
| Teen | Slim | 0.85 |
| Child | Slim | 0.65–0.75 |
| Big / boss / "GOAT" | Classic | 1.15–1.3 |
| Object / concept personified | Classic, textured as the material | 1.0 (or by importance) |

- Skins are **standard 64×64**. **No HD skins.** Higher-resolution textures break the look.
- Concepts and objects become humanoids **skinned in their own material**: Diamond is a figure in diamond-block texture, Oak Wood is a figure in oak texture. This is the signature move of the format. Use it whenever the script has abstract or non-human characters.
- Mobs (villagers, zombies, creepers and so on) can appear as **supporting roles**. Lead roles are our own characters.

### 4.3 Faces and expressions
The face is the 8×8 front of the head. Expressions are **face-texture swaps**, not deformation.

Each lead character needs this expression set:

| Expression | Use |
|---|---|
| Neutral | Default |
| Happy / smug | Wins, jokes landing |
| Angry | Conflict |
| Shocked | Reveals; wide eyes, open mouth |
| Sad | Losses |
| Side-eye | Reaction shots, the "💀 moment" |
| Dead-eyes / blank | Absurdity reaction, a hold for comedy |

Rules: eyes are 2×1 px, or 1×1 px on child characters. Brows are 1 px darker than the hair. Use a mouth only when the expression needs one. Blinks are a 2-frame swap every 3–6 s at random.

### 4.4 Characters based on real people or brands
Scripts often parody real people, products or companies. That's part of the formula, but:
- Build the resemblance from **signifiers** (hair shape, signature outfit, prop, colours), not a copy of their photo or face.
- Brand characters wear the **brand's colours and a simplified mark** on the chest. Never paste in the real logo file.
- No sexual content, no claims about crimes, and nothing a viewer could read as a real endorsement.
- For client scripts that feature real people or brands, get **written sign-off** from the client before animating.

### 4.5 The cast sheet
Every recurring character gets a cast sheet in `minecraft-channel/cast/` (template in Appendix A). Once a character is approved, its skin, scale and colours are locked. Change them only on purpose and in writing.

---

## 5. World and sets

### 5.1 The look
- **Daylight by default.** The sun is at roughly 10am–2pm with soft directional shadows, a bright saturated sky and a light bloom.
- **Vanilla-style textures**, unmodified. No realistic shader packs, no PBR textures, no grunge.
- **Shallow depth of field** on medium and close shots so the background softens and the characters pop.
- **Night, caves and the Nether only when the story calls for it** (horror beats, high stakes). Daylight is the default.

### 5.2 Palette (approximate)
| Element | Colour |
|---|---|
| Sky | `#8EC4FF` → `#CFE6FF` toward the horizon |
| Grass top | `#6CBF45` |
| Oak planks | `#B8945F` |
| Shadows | Cool blue tint, never pure black |
| Story accent | One saturated colour per video, tied to the premise (gold for money, red for danger) |

### 5.3 Set library
Build each set once, save it, and reuse it. New sets are expensive, so a video should need **at most one new set**.

| Set | Used for |
|---|---|
| Plains field | Default; vs and ranking formats, open-space gags |
| House interior (kitchen, living room, bedroom) | Family and POV stories |
| School (classroom, corridor, bus stop) | Kid / student stories |
| City street + road | Car, chase and "rich vs poor" stories |
| Village | Crowds, villager roles, markets |
| Arena | Tournaments, PvP, showdowns |
| Cave / dark forest | Horror beats |
| Nether | Highest-stakes beats |
| Graveyard / memorial | Sad and dramatic beats |

**Set dressing:** keep it light. 3–5 props per set, all blocky, all from the vanilla style. Clutter fights with the characters for attention.

---

## 6. Camera and animation

### 6.1 Camera
| Shot | When |
|---|---|
| **Medium two-shot, eye level** | Default dialogue shot |
| **Low angle (hero)** | Boasts, wins, "I'm the GOAT" moments, villains arriving |
| **Wide** | Setting up a new set or showing the full cast (name tags visible) |
| **Close-up** | Reaction faces and expression swaps |
| **Over-the-shoulder** | Confrontations |

- **Punch-in on punchlines:** scale 1.0 → 1.25 over 3–4 frames, hold, then cut.
- **Shake on impacts:** 6–10 frames, decaying.
- **Whip pan** (6–8 frames of motion blur) to change location or time.
- **No slow drifting dolly shots longer than 3 s.** The style is snappy.
- **Pacing:** average shot length **2–3 s**. Nothing should stay unchanged on screen for more than **5 s** without a camera move, a cut or new action.

### 6.2 Animation
- **Limbs are rigid.** Bend only at joints. No squash and stretch on bodies.
- **Anticipation and overshoot** on every big gesture: wind up for 2–3 frames, overshoot for 2 frames, settle.
- **Walk cycle:** arms swing about ±35° and legs ±30°, with a 1-block-per-cycle stride. Running roughly doubles the swing and leans the body forward 10°.
- **Head leads the body.** On a turn, the head moves 2 frames before the torso.
- **Idle:** a subtle breathing bob (about 1 px) plus occasional look-arounds. Nobody stands perfectly still.
- **Comedy timing:** after the punchline, **hold for 8–15 frames** on the reaction face before cutting.
- **Death / defeat:** game-style red flash, then topple, then a puff of particles. Keep it cartoonish. No blood, ever.

### 6.3 Tools
- **Animation:** Mine-imator (fast, made for this look) or Blender with the MCprep add-on (more control, better lighting). Choose one per production. Don't mix them within a video.
- **Skins:** Blockbench or any 64×64 skin editor.
- **Edit and captions:** whatever editor the team uses, with caption styles saved as presets matching §7.

---

## 7. On-screen text

Text is half the format: a viewer watching with the sound off should be able to follow the whole story.

### 7.1 Caption layers
| Layer | Position (16:9) | Style | When |
|---|---|---|---|
| **Main caption** | Lower third, baseline at about 85% of frame height, centred | Heavy sans in ALL CAPS, white fill, 6–8 px black stroke, soft drop shadow. **Our font: Montserrat Black** (or another font we pick and lock; never copy the reference channel's). About 64–72 px at 1080p, max 2 lines, max ~32 characters per line. | Every spoken line |
| **Name tag** | Above the character's head, following them | Pixel-style font (**Monocraft**, which is open-licence), white text in a dark box at 60% opacity | First appearance; cast reintroductions |
| **Dialogue header** (optional) | Top centre, about 8% from the top | `Name: line` with the name in the character's colour and the line in white | Rapid back-and-forth exchanges, especially in vs formats |
| **Label / score** | Top corners | Same as the name-tag style | Rounds, scores, timestamps ("3 YEARS LATER") |

**Caption rules**
- Show 1–4 words at a time, **timed word-by-word to the voice**. Highlight the key word in the video's accent colour.
- One idea per caption. Never show a whole sentence at once.
- Keep captions inside the centre 9:16 column so cut-downs don't lose them.

### 7.2 Watermark
- **Our** wordmark, bottom right, at 35% opacity, always outside the caption zone.
- On screen for the whole video except the cold open's first 2 s.

---

## 8. Sound

| Layer | Spec |
|---|---|
| **Voice** | One distinct voice per character, kept consistent across episodes (record notes in the cast sheet). Dialogue sits at about −16 to −14 LUFS short-term. |
| **SFX** | Blocky, game-like vocabulary: pop, clunk, hit, footsteps on grass / wood / stone, item pickup, door. **Every cut, hit and expression swap gets a sound.** Use a licensed library. |
| **Meme stings** | Sparingly, **at most one every 30 s**, only on a punchline. Check each one for Content ID risk before use. |
| **Music** | A royalty-free bed (YouTube Audio Library or a paid licence) at −24 to −20 LUFS under dialogue. It changes at the midpoint turn. Drop it to silence for one beat before the biggest punchline. |
| **Silence** | A tool, not a gap. Up to 1 s of silence before a reveal is allowed. |

**Cut to sound:** land cuts on audio hits, and pull a cut forward if it lands more than 2 frames after the hit.

---

## 9. Titles, thumbnails and series

### 9.1 Titles
- Use one of the §3 formats in the title so the premise is clear at a glance: "X vs Y", "POV: …", "Bro became …", "Then vs Now", "Would you …?"
- **Max ~50 characters.** Title case. One emoji at most, as our **own signature emoji** (choose one and lock it). Not 💀, which is the reference channel's signature.
- The word "Minecraft" can be used descriptively ("in Minecraft"). Never make the title read as official Minecraft content.

### 9.2 Thumbnails
- **1280×720**, built from the cold-open frame or a re-posed version of it.
- **One or two characters**, large, with clearly readable expressions (shocked, smug, angry).
- **2–4 words of text at most**, in the main-caption style. Don't repeat the title.
- Bright daylight background with one accent colour, matching the video.
- Check it at small size: shrink to 160×90 px. If you can't tell what's happening, redo it.

### 9.3 Series
- If an episode beats the channel's median views by 2×, **plan a sequel within two weeks**.
- Series titles use a consistent pattern with a number: "Bro Became the Mentalist 2".
- Recurring cast members carry over unchanged (§4.5).

---

## 10. Production pipeline

| # | Stage | Output | Owner sign-off |
|---|---|---|---|
| 1 | **Script in** | Client or internal script | Producer |
| 2 | **Beat sheet** | Premise sentence + beat map (Appendix B) | Producer |
| 3 | **Cast sheet** | One per character: four markers, build, colours, voice (Appendix A) | Producer (client too, if client work) |
| 4 | **Shot list** | One row per shot (Appendix C) | Director |
| 5 | **Animatic** | Rough blocking + scratch VO at final timing | Director (client too, if client work) |
| 6 | **Voice record** | Final VO per character | Director |
| 7 | **Animation** | Final animation, lit and rendered | Director |
| 8 | **Edit + captions** | Captions, watermark, labels | Editor |
| 9 | **Sound** | SFX, music, mix at −14 LUFS | Editor |
| 10 | **QC** | §11 checklist passed | Producer |
| 11 | **Package** | Video, `.srt`, thumbnail, title, description, 1–2 vertical cut-downs | Producer |

**Locking:** timing locks at the animatic. After that, changes cost animation time, so get approvals at stage 5.

---

## 11. QC checklist

Before delivery, every item must pass.

**Story**
- [ ] The premise is clear by 0:15
- [ ] No gap longer than 30 s between beats
- [ ] The cold-open frame works as a thumbnail
- [ ] The payoff delivers what the title promised
- [ ] The button calls back to something from the first minute

**Characters**
- [ ] Each lead is recognisable from silhouette, colours and prop before the name tag appears
- [ ] All skins are 64×64, with no HD textures
- [ ] Recurring characters match their cast sheets
- [ ] Real people and brands are shown through signifiers, not real logos or photo likeness; client sign-off is on file

**Picture**
- [ ] Average shot length is 2–3 s, and nothing is static for more than 5 s
- [ ] Every punchline is followed by an 8–15 frame reaction hold
- [ ] Action and captions sit inside the centre 9:16 column

**Text**
- [ ] Every spoken line is captioned and timed word by word
- [ ] Captions are max 2 lines, with no spelling errors
- [ ] Name tags appear on every character's first appearance
- [ ] Our watermark is on screen; nobody else's mark appears

**Sound**
- [ ] Integrated loudness is −14 LUFS (±1), with true peak at −1 dBTP or lower
- [ ] Every cut, hit and expression swap has a sound
- [ ] All music and stings are licensed or Content-ID safe

**Package**
- [ ] Length is 2:50–3:20 and the format is 16:9
- [ ] `.srt` is exported
- [ ] Thumbnail is still readable at 160×90
- [ ] Title is 50 characters or less, uses a §3 format and has at most one emoji

---

## 12. Do / don't summary

| Do | Don't |
|---|---|
| Build every character from silhouette, colour, prop and name tag | Rely on the name tag alone to say who someone is |
| Personify concepts as material-skinned figures | Use HD skins or realistic shaders |
| Escalate every 20–30 s | Stretch one joke across 3 minutes |
| Open on the peak moment | Open on a logo or title card |
| Reuse sets from the library | Build a new set for every scene |
| Caption every line, word by word | Show whole sentences at once |
| Use our font, watermark and emoji | Use the reference channel's watermark, captions, characters or 💀 signature |

---

## 13. Legal and platform notes

- **Minecraft brand:** follow Mojang/Microsoft's Minecraft Usage Guidelines. Videos made in this style can be monetised, but we must not suggest our content is official or endorsed. Don't use the Minecraft logo in our branding, and don't put "Minecraft" in the channel name. Add this line to every description: *"Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft."*
- **Reference channel:** we study Power Studios' formula (formats, pacing, text layers). We never reuse their videos, characters, skins, captions, watermark, specific episodes or thumbnail layouts.
- **Real people and brands:** parody built from signifiers, nothing defamatory, no implied endorsement, and client sign-off on client work (§4.4).
- **Audio:** only licensed or royalty-free music and SFX. Meme audio gets checked for Content ID before upload.

---

## Appendix A: Cast sheet template

Save one per character as `minecraft-channel/cast/<character-name>.md`.

```markdown
# <Character name>

- **Role in story:** lead / supporting / one-off
- **Based on (from script):** <who or what this character represents>
- **Silhouette:** <hair / headwear / build>
- **Colour signature:** <hex 1>, <hex 2>, <hex 3>
- **Signature prop:** <one object>
- **Build:** classic / slim · scale <x>
- **Name tag text:** <exact text>
- **Expressions made:** neutral, happy, angry, shocked, sad, side-eye, blank
- **Voice:** <performer / setting / pitch notes>
- **Skin file:** cast/skins/<name>.png
- **First appeared in:** <episode>
- **Approved by / date:**
```

## Appendix B: Beat sheet template

```markdown
# <Episode title>

**Premise (one sentence):**
**Format:** X vs Y / Tournament / POV / Bro became X / Then vs Now / Would you…?
**Accent colour:**
**New set needed (max 1):**

| Time | Beat | What happens | Characters | Set |
|---|---|---|---|---|
| 0:00 | Cold open | | | |
| 0:05 | Setup | | | |
| 0:20 | Beat 1 | | | |
| 0:50 | Beat 2 | | | |
| 1:20 | Midpoint turn | | | |
| 1:35 | Beats 3–4 | | | |
| 2:20 | Payoff | | | |
| 2:40 | Button | | | |
| 2:55 | Sequel hook | | | |

**Dialogue word count:** (target 330–400)
```

## Appendix C: Shot list row

| Shot # | Time in / out | Set | Shot type | Characters + expression | Action | Dialogue / caption | SFX | Notes |
|---|---|---|---|---|---|---|---|---|
| 001 | 0:00.0 / 0:02.5 | Plains | Low-angle wide | Diamond (smug), Netherite (angry) | Diamond flexes, Netherite steps in | "I'M THE GOAT" | Hit + crowd | Thumbnail frame |

## Appendix D: Reference data

Power Studios, captured 27 Nov 2026: 5.2M subscribers, 666 videos, 1K → 1M subscribers between Feb 2022 and Aug 2024, mostly from Shorts.

| Short | Views | Format |
|---|---|---|
| Bro Transformed To Michael Jackson | 13M | Bro became X (spawned 2 sequels) |
| Strongest Block in Minecraft | 5.1M | Tournament / personified materials |
| Best Type Of Wood in Minecraft | 2.3M | Ranking / personified materials |
| POV: Rich vs Poor | 2.2M | X vs Y |
| That's NOT a Dog | 1.6M | Reveal gag |
| Bedrock Skeleton Be Like | 1.4M | Game-meta comedy |
| ChatGPT vs Grok: Losing Your Dog | 914K | Would you…? series (5 episodes) |

Takeaways: personified materials and "bro became X" premises give the biggest outliers, and sequels to a hit keep pulling views. Those are the two formats to try first.
