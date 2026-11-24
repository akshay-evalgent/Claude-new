# YouTube upload kit: Trapped Under the Sea

| | |
|---|---|
| Video | `../trapped-under-the-sea.mp4`: 58.3 s, 1080×1920, 24 fps, H.264 + AAC |
| Cover | `cover.jpg` (1080×1920) |
| Captions | `captions.en.srt` (English, timed to the narration) |

A vertical video under 3 minutes becomes a Short automatically, so no special setting is needed.

## Title

**He Was Trapped 60 Hours at the Bottom of the Sea**

Other options:
- He Survived 3 Days Inside a Sunken Ship
- The Hand That Grabbed the Diver Back
- 1 Survivor out of 12, 30 m Underwater

## Description

```
In May 2013, Harrison Okene was the cook on a tugboat off the coast of Nigeria. Before dawn, in rough seas, the boat flipped over and sank upside down to the seabed, about 30 meters down. He was in the toilet, in his underwear, when the water rushed in.

In total darkness he felt his way through the flooded hull and found a small pocket of air. He had one bottle of Coke and two flashlights, which died within a day. For about 60 hours he waited and prayed, while the air slowly got worse.

Divers came to recover the bodies of the crew. One of them reached for what he thought was a dead man's hand, and the hand grabbed him back. Of the 12 men on board, Okene was the only survivor. He spent another two and a half days in a decompression chamber, and later trained as a commercial diver himself.

An animated retelling of a true story, based on Okene's own account and the dive team's. The visuals are AI-generated illustrations, not real footage, and the map is schematic.

Sources:
https://en.wikipedia.org/wiki/Aquanaut
https://abcnews.com/blogs/headlines/2013/12/cook-survives-3-days-in-air-pocket-of-sunken-ship-off-nigerian-coast

#shorts #truestory #survival #ocean #animation
```

## Tags

```
harrison okene, jascon 4, trapped underwater, air pocket, sunken ship, tugboat, survival story, true story, nigeria, 2013, divers rescue, saturation diving, decompression, ocean, 3d animation, survival shorts
```

## Pinned comment

```
The divers' helmet cameras filmed the real moment they found him. How long do you think you could last in the dark down there? 🌊
```

Or: `He went back under the sea, as a diver. Would you? 🤿`

## Settings

- **Thumbnail:** upload `cover.jpg` if Studio offers a custom thumbnail for the Short (this is rolling out to channels in the
  Partner Program). If it doesn't, choose the frame at about **0:01**, the same picture as the cover: his face in the
  air pocket, lit by a flashlight.
- **Audience:** *No, it's not made for kids.* The cartoon-like look can lead YouTube to classify it as made for kids,
  and that turns off comments and notifications. The story also has a shipwreck and the deaths of eleven crew.
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
The narration names Coke as the drink he had; the picture shows an unlabelled bottle.

## Posting elsewhere

The same file works for Instagram Reels and TikTok. Drop `#shorts`, and turn on each app's AI-generated label.

To rebuild the cover or captions: `node youtube/make_kit.js` (the cover needs `out/clips/` from `fetch_clips.sh`).
