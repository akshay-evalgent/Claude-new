# YouTube upload kit: "How Did Ancient Humans Get Married?"

| File | What it's for |
|---|---|
| `video_1080p.mp4` | The video (15:02, 1080p, 25 fps). Not in git; it lives in `film/wed-full/wed_full.mp4`. |
| `thumbnail.jpg` | Main thumbnail, 1280×720, v2 contrast split ("NO WEDDING?"). |
| `thumbnail_alt.jpg` | Second thumbnail for YouTube's "Test & compare" ("MARRIED HOW?"). |
| `title.txt` | Curiosity title, plus two test titles. |
| `description.txt` | Paste-ready description with chapters, sources and hashtags. |
| `tags.txt` | Paste into the Tags box. |
| `pinned_comment.txt` | Question to post and pin as the first comment. |
| `captions_en.srt` | English captions timed to the narration, word by word. |
| `make_srt.py` | Rebuilds the captions if the narration changes. |

## Packaging update (after the first analytics review)

- `thumbnail.jpg` / `thumbnail_alt.jpg` now use the v2 "contrast split" design: a glowing modern object on a dark panel against a bright ancient story, with a red circle on the hook and short text. The old designs are still in `film/pilot-fridge/thumbnails/` if you want to compare.
- `title.txt` now leads with a curiosity title (no listicles); put all three titles into YouTube's Test & compare.
- `pinned_comment.txt` holds an either/or question. Post it as the first comment as soon as the video is live, pin it, and reply to early comments.
- If CTR is still under 3% after 48–72 hours, swap the title and thumbnail for the alternates.

## Upload steps (YouTube Studio)

1. **Upload** `video_1080p.mp4`.
2. **Title:** first line of `title.txt`.
3. **Description:** paste `description.txt` as is. The timestamps become chapters automatically.
4. **Thumbnail:** upload `thumbnail.jpg`. If "Test & compare" is offered, add `thumbnail_alt.jpg` as the second option.
5. **Audience:** "No, it's not made for kids". The video is family-friendly but aimed at a general audience; marking it as made for kids switches off comments and other features.
6. **Show more:**
   - **Tags:** paste `tags.txt`.
   - **Language:** English. **Caption certification:** none.
   - **Category:** Education.
   - **Altered or synthetic content:** this is about realistic content that could be mistaken for real people or events. The video is clearly animated and the narrator doesn't imitate a real person, so "No" should apply, but check YouTube's current wording before answering. The description already says the voice is computer-generated.
7. **Subtitles:** Add language → English → Upload file → With timing → `captions_en.srt`. The video already has burned-in captions, so viewers who also turn on CC will see both; the file still makes the video searchable and lets YouTube auto-translate it.
8. **End screen:** the last 20 seconds are the "You marry one person. They married into a whole world." ending. Add a subscribe button and "best for viewer" video there.
9. **Visibility:** publish, or schedule for when your audience is most active (Studio → Analytics → Audience, once you have data).

## Before you publish

- Watch it once with sound. Names to listen for: Hadza, Ju/'hoansi, Nisa, Dyirbal, Sunghir, Chagyrskaya, Denny, Gurgy, Hazleton North, Lech, Nyinba, Mosuo, Kültepe, Hammurabi, Aulus Gellius, Valdaro, Modena, Coontz, Chapais. A wrong one is a one-line fix in `film/wed-full/tts.py` plus a rebuild.
- Look at both thumbnails at phone size (about 320 px wide) next to other videos in your feed.
- In-video comment prompts: the narrator asks viewers to comment twice. At about 6:35 the question is whether a mother-in-law language would make family dinners easier or harder. At about 14:34, just before the ending, a "COMMENTS" card asks which custom surprised them most. The pinned comment asks the same question, so answers collect in one thread.
- Marriage customs are described neutrally, as anthropologists recorded them, with no ranking. The Modena pair (two men buried hand in hand) is described only as what the evidence shows: their relationship is unknown.
- No nudity. The Valdaro and Modena burials are drawn as simple skeletons.
