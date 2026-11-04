# Making clips in Google Flow, then turning them into reels

You generate the footage in Flow, upload it to the repo, and I edit it into the @wealth layout (hook frame, crop, timing, cover, caption).

## Why Flow footage works for this page

- **It's original.** Nobody else owns it, so there are no copyright claims, and Instagram doesn't treat it as a repost. That's the problem with @wealth's movie and viral clips for a new account.
- **You can make the exact scene the lesson needs**, instead of hunting stock sites for something close enough.
- **Label it.** When you post, turn on Instagram's **AI label** (Advanced settings > AI label, or "AI info"). Instagram's head, Adam Mosseri, said in October 2026 that AI content isn't held back for being AI but should be labelled. Flow clips also carry Google's invisible SynthID watermark, so Instagram may detect them anyway.

## Settings in Flow

| Setting | Use | Why |
|---|---|---|
| Model | The best Veo model on your plan. Use "Fast" for tries and "Quality" for the clip you'll post. | Fast saves credits while you test prompts |
| Aspect ratio | **16:9 landscape** | The reel shows the clip in a 3:2 window. 16:9 crops to it cleanly, losing only about 8% on each side. |
| Outputs per prompt | 2 to 4 | Pick the best take. Most prompts need a couple of tries. |
| Download | **1080p** (the upscaled option if offered) | Sharper after cropping |

**Check one thing on your first download:** is there a visible watermark or logo in a corner? Tell me if there is. Mosseri has said visible logos from other apps reduce distribution, so we'll decide how to handle it before posting.

## The prompt formula

```
[Shot type and angle]. [Who, described precisely]. [What they do, start to finish, in 8 seconds].
[Where, and when: time of day, weather]. [Light]. [Camera movement].
Realistic, cinematic, shot on 35mm film, natural colours, main action centred in frame.
No text, no logos, no brand names. Sound: [ambient sounds], no music, no dialogue.
```

Rules that matter for this format:
1. **Keep the action in the middle 80% of the frame.** The sides get trimmed.
2. **One clear action per 8-second clip.** Veo clips are about 8 seconds. A story is several clips joined together.
3. **No text in the scene** (signs, screens, newspapers). AI text comes out garbled.
4. **No real people, celebrities or brands.** It's against Flow's rules and misleading on Instagram.
5. **The same character in every shot:** copy the character description word for word into each prompt. Better still, use Flow's ingredients/reference-image feature, or Scenebuilder's extend, to keep the face and clothes consistent.
6. **Ask for ambient sound, no music.** Music gets added in Instagram. Clean ambient sound means we can keep it under the music if it helps.

## Uploading to me

1. Download each shot from Flow.
2. On GitHub: the repo > branch `claude/nice-ptolemy-1wa6l9` > `instagram-page-kit/clips/`.
3. **Add file > Upload files**. Put each test's shots in their own folder, named in order: `test-02/shot1.mp4`, `test-02/shot2.mp4`. (On the upload page, typing `test-02/` before the file name creates the folder.) The web upload takes files up to 25 MB each, and an 8-second 1080p clip is well under that.
4. **Commit changes**, then tell me here.

## What I do with them

```
python3 scripts/make_lesson_reel.py --clip clips/test-02/shot1.mp4 --clip clips/test-02/shot2.mp4 \
    --hook "The Perfect Example Of What Effort Vs Leverage Looks Like:" \
    --highlight Effort --highlight Leverage --hold 1 --out test-02/test-02.mp4
```
I trim each shot to its best part, join them with hard cuts, crop to the 3:2 window, add the hook frame, check every frame, write the caption, and push the finished MP4 and cover.
