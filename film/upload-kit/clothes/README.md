# YouTube upload kit: "Why Did Humans Start Wearing Clothes?"

| File | What it's for |
|---|---|
| `video_1080p.mp4` | The video (10:46, 1080p, 25 fps). Not in git; it lives in `film/clothes-full/clothes_full.mp4`. |
| `thumbnail.jpg` | Main thumbnail, 1280×720, v2 contrast split ("NO CLOTHES?"). |
| `thumbnail_alt.jpg` | Second thumbnail for YouTube's "Test & compare" ("170,000 YEARS"). |
| `title.txt` | Curiosity title, plus two test titles. |
| `description.txt` | Paste-ready description with chapters, sources and hashtags. |
| `tags.txt` | Paste into the Tags box. |
| `pinned_comment.txt` | Question to post and pin as the first comment. |
| `captions_en.srt` | English captions timed to the narration, word by word. |
| `make_srt.py` | Rebuilds the captions if the narration changes. |

## Packaging (built on the first analytics review)

- `thumbnail.jpg` / `thumbnail_alt.jpg` use the v2 "contrast split" design: a glowing modern object on a dark panel against a bright ancient story, with a red circle on the hook and short text.
- `title.txt` leads with a curiosity title (no listicles); put all three titles into YouTube's Test & compare.
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
8. **End screen:** the last 20 seconds are the "You'll get dressed in about two minutes. It took humanity hundreds of thousands of years to learn how." ending. Add a subscribe button and "best for viewer" video there.
9. **Visibility:** publish, or schedule for when your audience is most active (Studio → Analytics → Audience, once you have data).

## Before you publish

- Watch it once with sound. Names to listen for: Stoneking, Ian Gilligan, Dzudzuana, Sungir, Venus of Willendorf, Ötzi, Neanderthals. A wrong one is a one-line fix in `film/clothes-full/tts.py` plus a rebuild.
- Look at both thumbnails at phone size (about 320 px wide) next to other videos in your feed. The louse in the main thumbnail is the curiosity hook; if CTR is low, try the "170,000 YEARS" version.
- In-video comment prompts: at about 4:23 the narrator asks "Could you survive one winter night with no clothes at all?". At about 10:12, a "COMMENTS" card asks which clue surprised viewers most. The pinned comment asks the same question.
- Family-friendly: people without clothes are drawn as simple stick figures with a leaf; the lice are cartoons. Nothing else to flag.
- Built for sharing without asking: the story is a three-clue mystery, with repeatable facts (chimp-level hair follicles, lice dating clothes, toes that remember shoes, pink fibres, the dress found in a bag of laundry, trousers for horse riding), a "next time someone says lice are useless…" line, and a short "this channel asks how humans lived without…" moment that shows all nine episodes instead of asking people to subscribe.
