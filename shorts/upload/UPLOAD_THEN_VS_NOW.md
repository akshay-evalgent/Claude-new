# Upload kit: Then vs Now

Format measured from five reference Shorts (6M–35M views). Details in `CREATOR_FORMAT_RESEARCH.md`.
No episode numbers anywhere.

---

## OG YouTubers (Then and Now)

**Files**
- `og_youtubers_silent.mp4` (16.3 s): **use this one.** You add the trending song in the YouTube app, the way the reference channels do.
- `og_youtubers.mp4` (16.3 s): the same video with our own original music, for uploading from a computer.
- `og_youtubers_cover.jpg`: Rhett & Link 2025, if you want to pick a cover frame.

**What's in it:** four pairs, one photo per sung line (2.04 s), hard cuts, slow zoom, year in white then green.

| Order | Then | Now |
|---|---|---|
| 1 | Rhett & Link, 2008 | 2025 (VidCon) |
| 2 | Tyler Oakley, 2010 | 2025 (VidCon) |
| 3 | Grace Helbig, 2013 | 2025 (VidCon) |
| 4 | Smosh (Ian & Anthony), 2008 | 2025 (VidCon) |

Every photo is real and dated. None is AI-made.

### Adding the song (phone, recommended)

Three of the five reference Shorts use the same trending song. Its lyrics start "I know what you want…".

1. Put `og_youtubers_silent.mp4` on your phone.
2. In the YouTube app, open the reference Short **youtube.com/shorts/hHEnpN918ZY** (Love Nostalgia, 18M views) or **youtube.com/shorts/EHdVsl9mOpQ** (BRANDOMEMES, 35M).
3. Tap the sound / spinning record at the bottom right, then **Use this sound**. The Shorts camera opens with the song loaded.
4. Tap the gallery button and choose `og_youtubers_silent.mp4`.
5. Check that the song starts on its **first line**. Our cuts are timed to it: one photo per line, 117.5 BPM.
6. Keep the video at 16.3 s. The song's clean part is exactly 8 lines, and line 9 is explicit. That's why the reference channels stop at about 16.5 s too.

Button names move between app versions. If "Use this sound" isn't there, tap **Remix → Sound**.

**Good to know:** Shorts can use songs from YouTube's sound library for up to 60 seconds. When a Short uses library music, part of its ad revenue goes to the music rights holders.

### Uploading from a computer

Use `og_youtubers.mp4`. The music is original, so there is nothing to clear.

### Details

**Title:**
```
OG YouTubers Then and Now (2008–2025)
```
Alternates: `Popular YouTubers (Then and Now)` · `YouTubers in 2008 vs Now`

**Description:**
```
The YouTubers who started it all, then and now.

Photos (Wikimedia Commons, cropped):
Rhett & Link 2008: Reed Kavner, CC BY 2.0
Rhett & Link 2025: Vlogbrothers, CC BY 3.0
Tyler Oakley 2010: Genevieve, CC BY 2.0
Tyler Oakley 2025: Vlogbrothers, CC BY 3.0
Grace Helbig 2013: Michael Dunn, CC BY 2.0
Grace Helbig 2025: Vlogbrothers, CC BY 3.0
Smosh 2008: reedkavner, CC BY 2.0
Smosh 2025: Vlogbrothers, CC BY 3.0
Links and licences: commons.wikimedia.org (file names in the pinned comment)

#shorts #thenandnow #nostalgia #youtubers
```

**Pinned comment** (the file links complete the credits):
```
Who should we do next? 👇

Photo sources:
commons.wikimedia.org/wiki/File:Rhett_and_Link.jpg
commons.wikimedia.org/wiki/File:Rhett_%26_Link_at_VidCon_2025_(cropped).jpg
commons.wikimedia.org/wiki/File:Tyler_Oakley_in_2010.jpg
commons.wikimedia.org/wiki/File:Tyler_Oakley_at_VidCon_2025_(cropped).jpg
commons.wikimedia.org/wiki/File:Nofilter_Portland_20131222-09.jpg
commons.wikimedia.org/wiki/File:Grace_Helbig_at_VidCon_2025.jpg
commons.wikimedia.org/wiki/File:Smosh_YouTube_Live.jpg
commons.wikimedia.org/wiki/File:Ian_Hecox_and_Anthony_Padilla_at_VidCon_2025_(combined_frames).jpg
```

**Settings**
- Made for kids: **No**
- Altered or synthetic content: **No** (real photos, cropped and zoomed)
- Category: Entertainment

### What to check after 48 hours (Studio → this Short)

| Number | What it tells us |
|---|---|
| Shown in feed | Whether YouTube distributed it at all. Near zero means a channel problem, not a format problem |
| Viewed vs swiped away | Whether the first photo stops the scroll |
| Average % viewed | Above 100% means people watch it more than once (the loop is working) |
| Views | A typical new channel in this format: about 27K per Short over its first ten |

---

## Next in this format (Commons has photos from these years, not yet checked one by one)

| Video | Pairs | Why |
|---|---|---|
| Stars YouTube Made Famous (Then vs Now) | Justin Bieber 2009 → 2025, Troye Sivan 2014 → 2024, Rebecca Black 2011 → 2023, Conan Gray 2018 → 2026 | Singers were the third-strongest subject in the research (492K typical), and they keep the YouTube angle |
| OG YouTubers, part two | Joey Graceffa 2014 → 2025, Casey Neistat 2016 → 2025, plus two more from VidCon 2014 | The same mechanic, to see whether the first one was luck |

The renderer is `tvn/tvn.py`. Photos are fetched with `tvn/fetch_commons.py`, which also writes their credits. Specs live in `edits_tvn/`.
