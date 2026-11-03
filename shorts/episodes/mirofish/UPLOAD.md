# YouTube upload kit: MiroFish short

| File | Use |
|---|---|
| `mirofish_short.mp4` | the video, with voice-over (1080x1920, 60 fps, 48 s, H.264 + AAC, -14 LUFS) |
| `thumbnail_vertical_1080x1920.jpg` | Shorts cover (upload it as the thumbnail in the YouTube mobile app, or pick the frame at 0:03.4 if your account can't upload one) |
| `thumbnail_1280x720.jpg` | 16:9 thumbnail for channel pages, a long-form cut, or a community post |
| `captions_en.srt` | English subtitles, timed to the narration (Subtitles → Upload file → With timing) |

## Title

Use this one (52 characters, so it shows in full on most phones):

**He Hoped for 1,000 Stars. His Next Repo Got 83,686 ⭐**

Backups:
- A Student Built an AI That Rehearses the Future
- This Free AI Simulates Thousands of People to Predict Anything

## Description

```
A college senior hoped his project would get 1,000 GitHub stars. His next one, MiroFish, got 83,686, and reportedly ¥30M in backing from Shanda founder Chen Tianqiao.

MiroFish turns a document (breaking news, a policy draft, a financial report, even a novel) into a simulated world of AI agents with their own personalities and memory. They post and argue on simulated Twitter- and Reddit-style platforms. You drop in a "what if", and it writes a prediction report you can question, or you can interview any agent.

Someone even fed it Dream of the Red Chamber to predict the ending its author never finished.

🔗 Repo: https://github.com/666ghj/MiroFish
🔗 Live demo: https://666ghj.github.io/mirofish-demo/
🔗 Simulation engine: OASIS by CAMEL-AI, https://github.com/camel-ai/oasis

Star count as of Nov 2026. The ¥30M figure was reported by 36Kr and TMTPost.

Credits
• UI footage recorded from the public MiroFish demo; logo and screenshots from the MiroFish repo
• Dream of the Red Chamber, 1791 edition: National Library of China scan (public domain), via the Internet Archive
• Fish footage: Wikimedia Commons (public domain). Other B-roll: Coverr
• The swarm, "god mode", branching futures and the "will you follow" feed are illustrations, not MiroFish output
• Narration: synthetic voice (Kokoro TTS). Music and sound design: original

#shorts #ai #github #opensource #aiagents #mirofish
```

The first three hashtags (#shorts #ai #github) are the ones YouTube shows above the title.

## Tags

Paste into Tags (382 of 500 characters):

```
MiroFish, AI agents, multi-agent simulation, swarm intelligence, predict the future, AI prediction, GitHub, GitHub trending, open source AI, open source, AI simulation, LLM agents, AI tools, OASIS CAMEL-AI, Shanda, Chen Tianqiao, BettaFish, college student, AI startup, tech news, digital sandbox, social simulation, knowledge graph, GraphRAG, Dream of the Red Chamber, AI explained
```

## Settings

| Setting | Value |
|---|---|
| Audience | No, it's not made for kids |
| Category | Science & Technology |
| Video language / caption language | English |
| Altered or synthetic content | No. The narration is a synthetic voice but doesn't imitate a real person, and no real footage is altered to look like something else. The description discloses the AI voice anyway |
| License | Standard YouTube License. Every source allows it: Coverr, public domain, original music |
| Comments | On; pin the comment below |
| Shorts remixing | Allow (people can only remix your original audio and visuals) |

## Pinned comment

```
The README literally says "try simulations with fewer than 40 rounds first." What's the first thing you'd simulate? 👇
```

Reply ideas if comments ask:
- "Is it real?" → Yes: open source, AGPL-3.0, link in the description. The UI in the video is their public demo.
- "Can it actually predict the future?" → It runs rehearsals, not prophecies. Its own team calls it a sandbox for testing possible futures.
- "What does it cost?" → It needs an LLM API key. The homepage says about $5 a simulation, and the README says start under 40 rounds.

## Voice-over line by line

The narration in `mirofish_short.mp4` (voice af_heart, 1.12–1.34x), timed to the on-screen captions:

| Time | Line |
|---|---|
| 0:00 | A college senior hoped for a thousand GitHub stars. |
| 0:03 | His next one got eighty-three thousand. |
| 0:05 | And a billionaire's backing. For this. |
| 0:07 | He built MiroFish. |
| 0:09 | It simulates thousands of people, to predict the future. |
| 0:11 | Step one. Feed it anything. |
| 0:13 | It maps every person and connection. |
| 0:15 | Then turns each one into an AI agent. |
| 0:17 | Thousands of them, arguing, changing minds. |
| 0:19 | Basically, the internet. In a box. |
| 0:21 | Two fake social networks, at once. |
| 0:23 | Then you play god, and drop in a what-if. |
| 0:25 | It writes you a prediction report. |
| 0:27 | And you can interview the agents. |
| 0:29 | Then: a centuries-old novel. |
| 0:30 | The author never finished it. So the characters did. |
| 0:33 | The catch? Their homepage: five bucks a run. README: go easy. Futures from five bucks. |
| 0:37 | It can't see the future. It rehearses a thousand of them. |
| 0:41 | So we asked a swarm about this video. |
| 0:44 | Seventy-three percent say you'll follow. Prove them wrong. |

To use your own voice instead, record these lines against the music-only render
(`out/mirofish_short_music_only.mp4`, rebuilt by running the render without `mix_vo.py`).
