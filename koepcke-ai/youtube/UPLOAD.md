# YouTube upload kit: She Fell From the Sky

| | |
|---|---|
| Video | `../she-fell-from-the-sky.mp4`: 58.3 s, 1080×1920, 24 fps, H.264 + AAC |
| Cover | `cover.jpg` (1080×1920) |
| Captions | `captions.en.srt` (English, timed to the narration) |

A vertical video under 3 minutes becomes a Short automatically, so no special setting is needed.

## Title

**She Fell 3 km From the Sky and Survived**

Other options:
- The Girl Who Fell From the Sky
- 1 Survivor out of 92
- She Survived a Plane Crash and 11 Days in the Amazon

## Description

```
On Christmas Eve 1971, 17-year-old Juliane Koepcke was flying over the Peruvian Amazon with her mother on LANSA Flight 508 when the plane flew into a thunderstorm. Lightning struck, and the plane broke apart in mid-air. She fell about 3 km, still strapped to her row of seats, and woke up alone on the forest floor with a broken collarbone and a deep cut on her arm.

She remembered her father's advice: if you find water, follow it. For days she walked and waded downstream. On the tenth day she found a boat and a barrel of fuel, and poured the fuel on her infected wound. Lumberjacks working in the area found her there. Of the 92 people on board, she was the only survivor.

Today she is a biologist and runs Panguana, the research station her parents founded in the same rainforest.

An animated retelling of a true story, based mainly on Koepcke's own account. The visuals are AI-generated illustrations, not real footage, and the map is schematic.

Sources:
https://en.wikipedia.org/wiki/Juliane_Koepcke
https://en.wikipedia.org/wiki/LANSA_Flight_508

#shorts #truestory #survival #amazon #animation
```

## Tags

```
juliane koepcke, lansa flight 508, fell from the sky, plane crash survivor, sole survivor, amazon rainforest, jungle survival, survival story, true story, peru, 1971, lightning strike, wings of hope, animated story, 3d animation, survival shorts
```

## Pinned comment

```
Years later she went back to the crash site with Werner Herzog for his documentary Wings of Hope. Would you ever get on a plane again? ✈️
```

Or: `Her father's advice saved her life: find water and follow it. What's the best survival tip you know? 🌧️`

## Settings

- **Thumbnail:** upload `cover.jpg` if Studio offers a custom thumbnail for the Short (this is rolling out to channels in the
  Partner Program). If it doesn't, choose the frame at about **0:01**, where the seat row tumbles through the storm.
- **Audience:** *No, it's not made for kids.* The cartoon-like look can lead YouTube to classify it as made for kids,
  and that turns off comments and notifications. The story also has a plane crash and an infected wound.
- **Altered or synthetic content:** choose *Yes*. It shows a real person and real events in AI-generated
  pictures. For animated content the label only appears in the expanded description.
- **Subtitles:** Subtitles → Add language → English → Upload file → *With timing* → `captions.en.srt`.
  Set the video language to English.
- **Category:** Film & Animation (Education also fits).
- **Comments:** on. **Remixing:** allowed. **Paid promotion:** no.

## Rights

All the audio is original: Kokoro text-to-speech narration (Apache 2.0) over a sound bed synthesized in code,
with no licensed music. Content ID claims are therefore unlikely. The fonts (Anton, Barlow Condensed,
JetBrains Mono) are under the SIL Open Font License. The picture models are Qwen-Image and Wan 2.2, both Apache 2.0.

## Posting elsewhere

The same file works for Instagram Reels and TikTok. Drop `#shorts`, and turn on each app's AI-generated label.

To rebuild the cover or captions: `node youtube/make_kit.js` (the cover needs `out/clips/` from `fetch_clips.sh`).
