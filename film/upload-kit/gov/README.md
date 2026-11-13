# YouTube upload kit: "How Did Ancient Humans Live Without Government?"

| File | What it's for |
|---|---|
| `video_1080p.mp4` | The video (15:15, 1080p, 25 fps). Not in git; it lives in `film/gov-full/gov_full.mp4`. |
| `thumbnail.jpg` | Main thumbnail, 1280×720, in the reference channel's format ("NO GOVERNMENT?"). |
| `thumbnail_alt.jpg` | Second thumbnail for YouTube's "Test & compare" ("WHO RULED?"). |
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
8. **End screen:** the last 20 seconds are the "you vote every few years, they voted every day" ending. Add a subscribe button and "best for viewer" video there.
9. **Visibility:** publish, or schedule for when your audience is most active (Studio → Analytics → Audience, once you have data).

## Before you publish

- Watch it once with sound. Names to listen for: Frans de Waal, Yeroen, Luit, Nikkie, Boehm, Tomazo, Gaugo, Wrangham, Calusa, Nambikwara, Clastres, Lévi-Strauss, Teotihuacan, Amargi. A wrong one is a one-line fix in `film/gov-full/tts.py` plus a rebuild.
- Look at both thumbnails at phone size (about 320 px wide) next to other videos in your feed.
- Politics comments: the film stays on anthropology and archaeology. Expect some viewers to read modern politics into it; a short pinned comment about the film's scope can keep the thread on topic.
- The one violent case (a dangerous man stopped by his community) is told in a single line, with no detail.
