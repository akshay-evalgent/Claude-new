# Why Your Voice Sounds Weird On Recordings 🎙️

A 35-second vertical short (12 shots) built to the recipe in `../../index.html`, back with the human-body series. It follows the playbook's engagement section:

- **Hook.** Frame one is a full-body cringe: you on the sofa, holding your phone at arm's length, watching a video of yourself.
- **Seamless loop.** The script ends on a word that the first line completes: "…don't cringe, because → that voice on the recording really is you." The last shot (you press play and cringe) runs straight into the first (the cringe lets go), on the same frame. The music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to someone who hates their voice on video". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: do you skip your own voice notes?" (see `upload/UPLOAD.md`).
- **The narration demonstrates it.** On "deeper and fuller" the narrator's voice gets a bass boost; on "thinner and higher" the bass is cut away.

**Every sound effect is a real recording** (CC0): a sigh and a snort for the cringe, a phone tap, a record beep and a tap on the microphone, clicks for the star ratings, a counter bell and whooshes. Only the music is synthesized.

## Files

- `output/why-your-voice-sounds-weird-on-recordings.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-your-voice-sounds-weird-on-recordings-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (111 words, 190 wpm, 35.0 s of voice)

> That voice on the recording really is you. When you talk, you hear yourself two ways. Sound leaves your mouth and travels through the air into your ears, the same way everyone else hears it. But it also travels straight through the bones of your skull, and that path makes your voice sound deeper and fuller. A recording only catches the sound in the air, so it sounds thinner and higher than the voice in your head. The good news? In one study, people rated their own recorded voice as more attractive, as long as they didn't recognize it. So next time you hear yourself on a video, don't cringe, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | That voice on the recording really is you. | You on the sofa, cringing at a video of yourself, then making peace with it | A sigh (BSB 1405), birds outside (1859) |
| 2.76 | When you talk, you hear yourself two ways. | X-ray profile: as you talk, a blue path through the air and an orange one inside your head; "2 WAYS" | A whoosh (1796) |
| 5.54 | Sound leaves your mouth and travels through the air into your ears, | Profile: sound rings leave your mouth; the blue path curls round to your ear | |
| 8.96 | the same way everyone else hears it. | Your friend on the sofa gets the same blue path | |
| 11.30 | But it also travels straight through the bones of your skull, | X-ray: orange pulses climb from your throat and jaw to the glowing inner ear | A whoosh (1795) |
| 14.36 | and that path makes your voice sound deeper and fuller. | IN YOUR HEAD: the bass bars grow (the narration gets fuller too) | |
| 18.09 | A recording only catches the sound in the air, | You record a memo: the blue path goes into the phone; the orange stays inside | A record beep (1616), a tap on the mic (2019) |
| 20.76 | so it sounds thinner and higher than the voice in your head. | ON A RECORDING: the bass bars drop away (the narration goes thin); you wince | A tap on play (1735) |
| 24.48 | The good news? | You look up, brows raised, a little smile | |
| 25.44 | In one study, people rated their own recorded voice | A listener in headphones rates voices A and B with stars | A click per star (0321) |
| 28.52 | as more attractive, as long as they didn't recognize it. | Voice C gets five stars… then the label flips to YOU! | Clicks, a counter bell (2531), a whoosh |
| 31.87 | So next time you hear yourself on a video, don't cringe, because | You press play on a video of yourself and cringe (loop) | A tap on play, a snort (1404) |

## Sources to check before publishing

- **Two paths, and why the recording sounds thinner.** When you speak you hear yourself through the air and also through bone conduction, which carries the lower frequencies well, so the voice in your head sounds deeper and fuller than the airborne version a microphone records. The classic paper on the "voice confrontation" effect is Holzman & Rousey (1966), "The voice as a percept", *Journal of Personality and Social Psychology*; for the acoustics see, for example, Reinfeldt, Östli, Håkansson & Stenfelt (2010), "Hearing one's own voice during phoneme vocalization—Transmission by air and bone conduction", *Journal of the Acoustical Society of America* 128(2).
- **The study.** Hughes & Harrison (2013), "I like my voice better: self-enhancement bias in perceptions of voice attractiveness", *Perception* 42(9). Participants rated recordings of several voices, including their own, which most didn't recognize; they rated their own voice as more attractive than other listeners did.
- **The spectrum bars and stars on screen** are illustrations, not measured data.

## How it was made

All the code is in `src/voice-recording.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `voice-sets.js`:
  - **The phone.** A phone with a live screen: a voice memo playing, a recording, or a video of you.
  - **The two paths.** A glowing path with a pulse running along it (blue for air, orange for bone), sound rings and a glowing inner ear for the x-ray head.
  - **Cards and props.** The spectrum card, headphones and the ratings card.
- `shots.js`: the 12 shots. Shots 0 and 11 run on time measured from the loop point, so the last frame and the first frame are the same frame.
- The other parts are shared with the earlier shorts: the people, the living room, the x-ray head and the lab from the tickle short, and the render pipeline.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "That" (see `build.sh`). The "deeper and fuller" and "thinner and higher" demos are filters applied in `audio/mix_voice.py`.
- **Sound effects:** real recordings from BigSoundBank by Joseph Sardin, released under CC0 (public domain, free for commercial use, no credit required). The table above gives each recording's number; `build.sh` downloads them from `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`.
- **Music:** synthesized in `audio/mix_voice.py` (16 bars): playful pizzicato on the sofa, a curious marimba for the science, a warm celesta for the good news.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings, regenerates the voice, renders 1052 frames (a couple of hours on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
