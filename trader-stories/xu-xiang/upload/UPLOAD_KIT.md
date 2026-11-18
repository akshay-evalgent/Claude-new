# YouTube upload kit: Xu Xiang

Everything needed to publish the film. Copy each block into YouTube Studio.

| File | Use |
|---|---|
| `xu-xiang-film.mp4` | The film: 1080p, 30 fps, 14:12, stereo, mixed to −14 LUFS for YouTube. Too large for git; sent separately |
| `thumbnail-a.jpg` | Main thumbnail (face, "+357% IN A CRASH") |
| `thumbnail-b.jpg` | Second thumbnail for Test & Compare ("HE ALWAYS KNEW FIRST") |
| `xu-xiang.en.srt` | English subtitles, timed to the narration |

---

## Title

Use:

> He Made 357% While China's Market Crashed. Then They Closed the Bridge.

Alternatives for testing later:

- China's Hedge Fund King: The Trader Who Always Knew First
- The Trader Who Beat China's $5 Trillion Crash, and Why It Ended on a Bridge

## Description

Paste as is.

```
In the summer of 2015, China's stock market lost $5 trillion. One fund manager's best fund was up 357%. Then, on a Sunday morning, the police closed a 35-kilometre sea bridge in front of his car.

This is the true story of Xu Xiang: a boy who skipped university to trade with his parents' money, captain of the "Limit-Up Death Squad" in a Ningbo trading hall, "Hedge Fund Brother No. 1" in Shanghai, and finally the face of China's crackdown after the crash. How did he always know first?

CHAPTERS
0:00 Sunday, 10:33 a.m.
0:51 Hedge Fund Brother No. 1
1:37 A boy with ¥30,000
2:31 The chalk hall
3:39 The Limit-Up Death Squad
5:35 Zexi
7:43 The $5 trillion crash
9:48 The bridge
11:12 How he always knew
12:29 Criminal or scapegoat?
13:23 Knowing first
13:39 After prison

SOURCES
• Alex W. Palmer, "The Fall of China's Hedge-Fund King", The New York Times Magazine, 2016
• Caixin Global reporting, 2015–2021 (arrest, sentencing, divorce filing, release)
• Bloomberg, "China Gives 'Hedge Fund Brother No.1' 5 1/2 Years in Prison", 23 January 2017
• South China Morning Post, arrest and sentencing coverage, 2015–2017
• Associated Press, guilty plea, December 2016
• Shanghai Composite daily data: Sina Finance
Scenes marked RUMOUR, UNPROVEN or ALLEGATION were reported but never proven. The court's findings are stated as findings.

HOW THIS VIDEO WAS MADE
All people and places shown are dramatised reconstructions generated with AI (FLUX.1-schnell); they are not photographs and do not show the real people's faces. The narration is a synthetic voice (Kokoro). The music is original. Charts use real market data; lines marked ILLUSTRATIVE are not.

This video is for education and entertainment. It is not financial advice.

#China #StockMarket #TradingStory
```

## Tags

```
Xu Xiang, Zexi Investment, China stock market crash 2015, Chinese stock market, hedge fund documentary, trading documentary, trader story, Ningbo death squad, limit up, stock market manipulation, insider trading China, Shanghai Composite, Hedge Fund Brother No 1, China's Carl Icahn, finance documentary, market history, true story
```

## Studio settings

| Setting | Value |
|---|---|
| Audience | No, it's not made for kids |
| Altered or synthetic content | **Yes.** Realistic-looking people and events are generated, and the voice is synthetic. Required by YouTube policy |
| Paid promotion | No |
| Category | Education |
| Video language and caption language | English |
| Subtitles | Upload `xu-xiang.en.srt` (Subtitles, Add language, English, Upload file, With timing) |
| Licence | Standard YouTube Licence |
| Comments | On; hold potentially inappropriate comments for review |
| Thumbnail | `thumbnail-a.jpg`; add `thumbnail-b.jpg` under Test & Compare |
| End screen (last 20 s) | One "subscribe" element and one "best for viewer" video, placed over the right half; the epilogue keeps the left side clear |
| Chapters | Created automatically from the timestamps in the description |

## Pinned comment

```
Sources and how we made this are in the description. The court found Xu Xiang worked with executives at 13 listed companies to move share prices; the other claims in the film are labelled as rumour or allegation because they were never proven. Was he a criminal who finally got caught, or the face the country needed after the crash?
```

## Before you publish

1. **Watch it once at full length.** Every check here was done by measurement and still frames; nobody has listened to the whole film yet. Listen for mispronounced names: the fixes are in `pronunciations.json`, and a shot can be re-recorded on its own.
2. **Check the fact list.** `RESEARCH.md` still lists open items (birth year, the 1996 date for the 10% limit, whether the bridge closure was officially tied to the arrest). The script avoids depending on them, but the narration states "December 1996".
3. **Synthetic voice and monetisation.** YouTube can limit ads on content it judges mass-produced or repetitive. Original research, custom graphics and a consistent format all help. A human narrator would help more; the voice is a single track, so it can be replaced without re-editing (`build/audio/voice.wav` is the stem to match).
4. **Fair use.** The film contains no third-party footage, photos or music. The only third-party material is short quotes from news reporting, credited on screen and in the description.

## Rebuilding after changes

```bash
cd trader-stories/xu-xiang && python3 build_shotlist.py
```

Then re-record the voice (`record_voice.py`), copy `build/vo/timing.json` to `motion/src/films/xu-xiang/`, run `npm run data` in `motion`, re-mix (`mix_audio.py`), re-render (`node scripts/render-film.mjs`) and mux:

```bash
ffmpeg -i motion/out/xx-film-video.mp4 -i xu-xiang/build/audio/mix.wav -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 320k -shortest xu-xiang-film.mp4
```
